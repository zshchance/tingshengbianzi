package recognition

import (
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"audio-recognizer/backend/models"
	"audio-recognizer/backend/audio"
	"audio-recognizer/backend/utils"
)

// formatFileSize 格式化文件大小
func formatFileSize(bytes int64) string {
	if bytes == 0 {
		return "0 B"
	}

	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}

	units := []string{"KB", "MB", "GB", "TB"}
	return fmt.Sprintf("%.1f %s", float64(bytes)/float64(div), units[exp])
}

// WhisperService Whisper语音识别服务
type WhisperService struct {
	processor     *audio.Processor
	config        *models.RecognitionConfig
	models        map[string]bool
	modelsLock    sync.RWMutex
	hasRealModel  bool
	whisperPath   string
}

// NewWhisperService 创建新的Whisper语音识别服务
func NewWhisperService(config *models.RecognitionConfig) (*WhisperService, error) {
	// 创建音频处理器
	processor, err := audio.NewProcessor()
	if err != nil {
		return nil, err
	}

	// 获取可执行文件所在目录
	exePath, err := os.Executable()
	if err != nil {
		exePath = "."
	}
	exeDir := filepath.Dir(exePath)

	// 获取whisper-cli路径（尝试多个可能的路径）
	possiblePaths := []string{
		filepath.Join(exeDir, "backend", "recognition", "whisper-cli"),
		filepath.Join(".", "backend", "recognition", "whisper-cli"),
		"backend/recognition/whisper-cli",
		"whisper-cli", // 假设在PATH中
	}

	var whisperPath string
	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			// 转换为绝对路径
			absPath, err := filepath.Abs(path)
			if err == nil {
				whisperPath = absPath
				fmt.Printf("找到Whisper CLI: %s\n", absPath)
				break
			} else {
				whisperPath = path
				fmt.Printf("找到Whisper CLI: %s\n", path)
				break
			}
		}
	}

	if whisperPath == "" {
		return nil, fmt.Errorf("未找到whisper-cli可执行文件，请确保文件存在于backend/recognition/目录中")
	}

	service := &WhisperService{
		processor:    processor,
		config:       config,
		models:       make(map[string]bool),
		hasRealModel: false,
		whisperPath:  whisperPath,
	}

	// 检查是否有真实模型文件
	if service.checkWhisperModel() {
		fmt.Println("检测到Whisper模型文件，将尝试真实语音识别")
		service.hasRealModel = true
		service.models["default"] = true
	} else {
		fmt.Println("未检测到Whisper模型文件，将使用模拟识别服务")
	}

	return service, nil
}

// checkWhisperModel 检查Whisper模型文件是否存在
func (s *WhisperService) checkWhisperModel() bool {
	// 首先检查是否指定了具体的模型文件
	if s.config.SpecificModelFile != "" {
		if _, err := os.Stat(s.config.SpecificModelFile); err == nil {
			fmt.Printf("找到指定模型文件: %s\n", s.config.SpecificModelFile)
			return true
		}
	}

	// 扫描模型目录中的所有可用模型
	if entries, err := os.ReadDir(s.config.ModelPath); err == nil {
		modelCount := 0
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".bin") && s.isValidWhisperModel(entry.Name()) {
				modelCount++
			}
		}
		if modelCount > 0 {
			fmt.Printf("找到 %d 个模型文件在目录: %s\n", modelCount, s.config.ModelPath)
			return true
		}
	}

	return false
}

// isValidWhisperModel 验证文件是否为有效的Whisper模型
func (s *WhisperService) isValidWhisperModel(fileName string) bool {
	// 支持的模式匹配
	validPatterns := []string{
		// 标准模型
		"ggml-tiny.bin",
		"ggml-base.bin",
		"ggml-small.bin",
		"ggml-medium.bin",
		"ggml-large.bin",

		// 版本化模型
		"ggml-large-v1.bin",
		"ggml-large-v2.bin",
		"ggml-large-v3.bin",

		// Turbo变体模型
		"ggml-tiny*.bin",
		"ggml-base*.bin",
		"ggml-small*.bin",
		"ggml-medium*.bin",
		"ggml-large*.bin",

		// 英文专用模型
		"ggml-tiny.en.bin",
		"ggml-base.en.bin",
		"ggml-small.en.bin",
		"ggml-medium.en.bin",
		"ggml-large.en.bin",

		// 量化模型 (q4, q5, q8等)
		"ggml-*.q*.bin",

		// 特殊变体模型
		"ggml-*v*.bin",
		"ggml-*turbo*.bin",
		"ggml-*-en.bin",
		"ggml-*multilingual*.bin",
	}

	for _, pattern := range validPatterns {
		matched, _ := filepath.Match(pattern, fileName)
		if matched {
			// 额外验证：确保文件名包含模型相关的关键词
			if s.isValidWhisperModelName(fileName) {
				return true
			}
		}
	}

	return false
}

// isValidWhisperModelName 验证文件名是否包含有效的Whisper模型关键词
func (s *WhisperService) isValidWhisperModelName(fileName string) bool {
	// 转换为小写进行匹配
	lowerFileName := strings.ToLower(fileName)

	// 必须包含的关键词
	requiredKeywords := []string{"ggml"}

	// 可选的模型大小关键词
	modelSizes := []string{"tiny", "base", "small", "medium", "large"}

	// 检查是否包含必需关键词
	for _, keyword := range requiredKeywords {
		if !strings.Contains(lowerFileName, keyword) {
			return false
		}
	}

	// 检查是否包含至少一个模型大小关键词
	for _, size := range modelSizes {
		if strings.Contains(lowerFileName, size) {
			return true
		}
	}

	// 特殊处理其他可能的模型命名
	specialCases := []string{
		"whisper", "model", "speech", "recognition",
	}
	for _, special := range specialCases {
		if strings.Contains(lowerFileName, special) {
			return true
		}
	}

	return false
}

// LoadModel 加载语音模型（Whisper使用统一模型）
func (s *WhisperService) LoadModel(language, modelPath string) error {
	// 更新配置中的模型路径
	s.config.ModelPath = modelPath

	// 检查是否有可用的模型文件
	if !s.checkWhisperModel() {
		return models.NewRecognitionError(
			models.ErrorCodeModelNotFound,
			"Whisper模型文件未找到",
			"请确保在指定的模型目录中有有效的Whisper模型文件(.bin)",
		)
	}

	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()

	s.models[language] = true
	s.hasRealModel = true
	return nil
}

// RecognizeFile 识别音频文件
func (s *WhisperService) RecognizeFile(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
	if !s.hasRealModel {
		// 如果没有真实模型，回退到模拟识别
		return s.fallbackRecognition(audioPath, language, progressCallback)
	}

	// 使用真实的Whisper CLI进行识别
	return s.realWhisperRecognition(audioPath, language, progressCallback)
}

// realWhisperRecognition 使用真实的Whisper CLI进行语音识别
func (s *WhisperService) realWhisperRecognition(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
	// 获取音频文件信息
	wavPath, audioInfo, err := s.processor.ConvertToWAV(audioPath)
	if err != nil {
		return nil, err
	}
	defer os.Remove(wavPath) // 清理临时文件

	// 查找Whisper模型文件
	modelPath := ""

	// 首先检查是否指定了具体的模型文件
	if s.config.SpecificModelFile != "" {
		if _, err := os.Stat(s.config.SpecificModelFile); err == nil {
			modelPath = s.config.SpecificModelFile
			fmt.Printf("✅ 使用指定的模型文件: %s\n", modelPath)
		} else {
			fmt.Printf("⚠️ 指定的模型文件不存在: %s，将使用默认查找逻辑\n", s.config.SpecificModelFile)
		}
	}

	// 如果指定的模型文件不存在，则使用智能查找逻辑
	if modelPath == "" {
		// 首先尝试在指定目录中查找所有可用的模型文件
		modelDir := s.config.ModelPath
		if s.config.SpecificModelFile != "" {
			// 如果用户指定了具体文件但不存在，只在该目录下查找
			modelDir = filepath.Dir(s.config.SpecificModelFile)
		}

		// 获取模型目录下的所有.bin文件
		var availableModels []string
		if files, err := os.ReadDir(modelDir); err == nil {
			for _, file := range files {
				if strings.HasSuffix(file.Name(), ".bin") {
					fullPath := filepath.Join(modelDir, file.Name())
					if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
						availableModels = append(availableModels, fullPath)
						fmt.Printf("🔍 发现可用模型: %s (%s)\n", file.Name(), formatFileSize(info.Size()))
					}
				}
			}
		}

		// 优先级选择模型（按质量和大小排序）
		preferredOrder := []string{
			"ggml-large-v3.bin", "ggml-large-v2.bin", "ggml-large-v1.bin", "ggml-large.bin",
			"ggml-medium.bin",
			"ggml-small.bin",
			"ggml-base.bin",
			"ggml-tiny.bin",
		}

		// 按优先级查找模型
		for _, preferred := range preferredOrder {
			for _, available := range availableModels {
				if strings.HasSuffix(available, preferred) {
					modelPath = available
					fmt.Printf("✅ 选择模型文件: %s\n", modelPath)
					break
				}
			}
			if modelPath != "" {
				break
			}
		}

		// 如果没有找到优先模型，使用第一个可用的模型
		if modelPath == "" && len(availableModels) > 0 {
			modelPath = availableModels[0]
			fmt.Printf("✅ 使用第一个可用模型: %s\n", modelPath)
		}
	}

	if modelPath == "" {
		return nil, models.NewRecognitionError(
			models.ErrorCodeModelNotFound,
			"Whisper模型文件未找到",
			"请确保ggml-base.bin模型文件在models/whisper/目录中",
		)
	}

	// 映射语言代码
	whisperLang := s.mapLanguageToWhisper(language)

	// 发送初始进度
	if progressCallback != nil {
		progressCallback(&models.RecognitionProgress{
			Status:     "正在初始化Whisper引擎...",
			Percentage: 0,
		})
	}

	// 准备Whisper CLI命令
	outputBase := strings.TrimSuffix(wavPath, filepath.Ext(wavPath))

	// 输出调试信息
	fmt.Printf("🎯 开始Whisper识别:\n")
	fmt.Printf("   模型文件: %s\n", modelPath)
	fmt.Printf("   音频文件: %s\n", wavPath)
	fmt.Printf("   识别语言: %s\n", whisperLang)
	fmt.Printf("   Whisper CLI: %s\n", s.whisperPath)

	cmd := exec.Command(s.whisperPath,
		"-m", modelPath,
		"-f", wavPath,
		"-l", whisperLang,
		"-osrt", // 输出为SRT格式（包含时间戳）
		"-of", outputBase,
	)

	// 不设置工作目录，使用绝对路径来避免路径问题

	// 执行Whisper识别
	output, err := cmd.CombinedOutput()
	if err != nil {
		errorMsg := fmt.Sprintf("Whisper CLI执行失败: %v\n输出: %s", err, string(output))
		fmt.Printf("Whisper CLI错误: %s\n", errorMsg)
		// 返回具体的错误信息而不是回退到模拟数据
		return nil, models.NewRecognitionError(
			models.ErrorCodeRecognitionFailed,
			"Whisper语音识别失败",
			errorMsg,
		)
	}

	// 解析生成的SRT文件以获取时间戳信息
	srtFile := strings.TrimSuffix(wavPath, filepath.Ext(wavPath)) + ".srt"
	defer os.Remove(srtFile) // 清理临时文件

	// 检查SRT文件是否存在
	if _, err := os.Stat(srtFile); os.IsNotExist(err) {
		errorMsg := fmt.Sprintf("Whisper CLI未生成SRT文件: %s\n命令输出: %s", srtFile, string(output))
		fmt.Printf("SRT文件错误: %s\n", errorMsg)
		return nil, models.NewRecognitionError(
			models.ErrorCodeRecognitionFailed,
			"Whisper未生成识别结果",
			errorMsg,
		)
	}

	result, err := s.parseWhisperOutput(srtFile, audioInfo, language)
	if err != nil {
		errorMsg := fmt.Sprintf("解析Whisper输出失败: %v\nSRT文件: %s", err, srtFile)
		fmt.Printf("解析错误: %s\n", errorMsg)
		return nil, models.NewRecognitionError(
			models.ErrorCodeRecognitionFailed,
			"解析识别结果失败",
			errorMsg,
		)
	}

	// 发送完成进度
	if progressCallback != nil {
		progressCallback(&models.RecognitionProgress{
			Status:     "语音识别完成",
			Percentage: 100,
		})
	}

	return result, nil
}

// RecognizeFileWithModel 使用指定模型文件识别音频文件
func (s *WhisperService) RecognizeFileWithModel(audioPath string, language string, specificModelFile string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
	if specificModelFile != "" {
		// 临时更新配置使用指定的模型文件
		originalModelFile := s.config.SpecificModelFile
		s.config.SpecificModelFile = specificModelFile
		defer func() {
			// 恢复原始配置
			s.config.SpecificModelFile = originalModelFile
		}()

		fmt.Printf("🎯 使用用户指定的模型文件: %s\n", specificModelFile)
	}

	// 调用原有的识别方法
	return s.RecognizeFile(audioPath, language, progressCallback)
}

// mapLanguageToWhisper 将语言代码映射到Whisper支持的语言代码
func (s *WhisperService) mapLanguageToWhisper(language string) string {
	// 使用自动语言检测，让Whisper自己识别语言
	// 这样可以避免语言代码不兼容的问题
	return "auto"
}

// parseWhisperOutput 解析Whisper CLI的输出文件
func (s *WhisperService) parseWhisperOutput(srtFile string, audioInfo *models.AudioFile, language string) (*models.RecognitionResult, error) {
	content, err := os.ReadFile(srtFile)
	if err != nil {
		return nil, fmt.Errorf("读取SRT文件失败: %w", err)
	}

	// 生成唯一ID
	resultID := fmt.Sprintf("whisper_%d_%d", time.Now().Unix(), time.Now().UnixNano()%1000)

	result := &models.RecognitionResult{
		ID:          resultID,
		Language:    language,
		Duration:    audioInfo.Duration,
		ProcessedAt: s.getCurrentTime(),
		Metadata:    make(map[string]interface{}),
		Words:       []models.Word{},
		Segments:    []models.RecognitionResultSegment{},
	}

	// 解析SRT格式
	srtContent := string(content)
	lines := strings.Split(srtContent, "\n")

	var fullText strings.Builder
	var wordSegments []models.Word
	var segments []models.RecognitionResultSegment

	i := 0
	for i < len(lines) {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			i++
			continue
		}

		// 检查是否是序号行
		if _, err := strconv.Atoi(line); err == nil && i+2 < len(lines) {
			// 解析时间戳行
			timestampLine := strings.TrimSpace(lines[i+1])
			if strings.Contains(timestampLine, "-->") {
				// 解析文本行
				textLine := strings.TrimSpace(lines[i+2])
				if textLine != "" {
					// 转换为简体中文
					simplifiedText := s.convertToSimplified(textLine)

					// 解析时间戳
					startTime, endTime := s.parseSRTPair(timestampLine)

					// 添加到词汇结果（使用新的Word结构）
					wordSegments = append(wordSegments, models.Word{
						Text:       simplifiedText,
						Start:      startTime,
						End:        endTime,
						Confidence: 0.8, // Whisper CLI不提供置信度，使用默认值
					})

					// 添加到段落结果
					segment := models.RecognitionResultSegment{
						Start:      startTime, // 直接使用秒数
						End:        endTime,
						Text:       simplifiedText,
						Confidence: 0.8,
						Words:      []models.Word{{
							Text:       simplifiedText,
							Start:      startTime,
							End:        endTime,
							Confidence: 0.8,
						}},
						Metadata: make(map[string]interface{}),
					}
					segments = append(segments, segment)

					if fullText.Len() > 0 {
						fullText.WriteString(" ")
					}
					fullText.WriteString(simplifiedText)
				}
				i += 3
			} else {
				i++
			}
		} else {
			i++
		}
	}

	result.Text = s.addTimestampsToText(fullText.String(), wordSegments, audioInfo.Duration)
	result.Words = wordSegments
	result.Segments = segments

	// 计算整体置信度
	if len(wordSegments) > 0 {
		result.Confidence = 0.8 // Whisper CLI不提供置信度，使用默认值
	}

	// 添加元数据
	result.Metadata["audio_file"] = audioInfo.Name
	result.Metadata["audio_format"] = audioInfo.Format
	result.Metadata["sample_rate"] = audioInfo.SampleRate
	result.Metadata["channels"] = audioInfo.Channels
	result.Metadata["total_words"] = len(wordSegments)
	result.Metadata["total_segments"] = len(segments)
	result.Metadata["recognition_type"] = "whisper_cli"
	result.Metadata["has_timestamps"] = true

	return result, nil
}

// parseSRTPair 解析SRT时间戳对
func (s *WhisperService) parseSRTPair(timestampLine string) (float64, float64) {
	// SRT格式: 00:00:00,000 --> 00:00:02,000
	parts := strings.Split(timestampLine, " --> ")
	if len(parts) != 2 {
		return 0, 0
	}

	startTime, _ := utils.ParseSRTTime(parts[0])
	endTime, _ := utils.ParseSRTTime(parts[1])

	return startTime, endTime
}

// addTimestampsToText 在文本中添加时间戳标记
func (s *WhisperService) addTimestampsToText(text string, words []models.Word, audioDuration float64) string {
	if len(words) == 0 {
		return text
	}

	var result strings.Builder

	// 使用更精细的时间标记分割逻辑，传入音频时长作为限制
	timeMarks := s.generateFineTimeMarks(words, audioDuration)

	for i, mark := range timeMarks {
		if i > 0 {
			result.WriteString("\n") // 每个时间标记独立一行
		}
		timestamp := utils.FormatTimestamp(mark.StartTime)
		result.WriteString(timestamp)
		result.WriteString(" ")
		result.WriteString(mark.Text)
	}

	return result.String()
}

// generateFineTimeMarks 生成更精细的时间标记
func (s *WhisperService) generateFineTimeMarks(words []models.Word, maxDuration float64) []TimeMark {
	var timeMarks []TimeMark
	currentTime := 0.0

	for _, word := range words {
		// 跳过空白词
		if strings.TrimSpace(word.Text) == "" {
			continue
		}

		// 按标点符号和自然停顿分割文本
		subSegments := s.splitTextByNaturalPauses(word.Text)

		// 为每个子片段分配时间
		for _, segment := range subSegments {
			if strings.TrimSpace(segment.Text) == "" {
				continue
			}

			// 计算片段时长：基于文本长度，但限制在合理范围内
			textLen := len([]rune(segment.Text))
			baseDuration := float64(textLen) * 0.3 // 每个字符约0.3秒
			maxSegmentDuration := 8.0 // 单个片段最长8秒
			minSegmentDuration := 0.5 // 单个片段最短0.5秒

			segmentDuration := baseDuration
			if segmentDuration > maxSegmentDuration {
				segmentDuration = maxSegmentDuration
			}
			if segmentDuration < minSegmentDuration && textLen > 1 {
				segmentDuration = minSegmentDuration
			}

			segmentStartTime := currentTime
			segmentEndTime := currentTime + segmentDuration

			// 确保不超过最大时长
			if segmentStartTime >= maxDuration {
				break // 如果已经开始超过最大时长，停止添加
			}
			if segmentEndTime > maxDuration {
				segmentEndTime = maxDuration
			}

			timeMark := TimeMark{
				StartTime: segmentStartTime,
				EndTime:   segmentEndTime,
				Text:      strings.TrimSpace(segment.Text),
			}
			timeMarks = append(timeMarks, timeMark)

			currentTime = segmentEndTime
			if currentTime >= maxDuration {
				break
			}
		}

		// 添加词语间的停顿时间
		pauseTime := 0.2 + rand.Float64()*0.3 // 0.2-0.5秒的停顿
		currentTime += pauseTime

		if currentTime >= maxDuration {
			break
		}
	}

	return timeMarks
}

// TimeMark 时间标记结构
type TimeMark struct {
	StartTime float64
	EndTime   float64
	Text      string
}

// splitTextByNaturalPauses 按自然停顿分割文本（但不让标点符号独立成行）
func (s *WhisperService) splitTextByNaturalPauses(text string) []TextSegment {
	var segments []TextSegment
	var current strings.Builder
	charCount := 0

	for i, char := range text {
		current.WriteRune(char)
		charCount++

		// 检测是否为强停顿符号（分割点）
		if s.isStrongPauseChar(char) {
			// 保存当前片段（包含这个停顿符号）
			if current.Len() > 0 {
				segments = append(segments, TextSegment{
					Text:      strings.TrimSpace(current.String()),
					CharCount: charCount,
				})
				current.Reset()
				charCount = 0
			}
		} else if s.isPhraseBoundary(text, i) && current.Len() > 5 {
			// 在短语边界分割，但不分割太短的片段
			if current.Len() > 0 {
				segments = append(segments, TextSegment{
					Text:      strings.TrimSpace(current.String()),
					CharCount: charCount,
				})
				current.Reset()
				charCount = 0
			}
		}
	}

	// 添加最后一段
	if current.Len() > 0 {
		segments = append(segments, TextSegment{
			Text:      strings.TrimSpace(current.String()),
			CharCount: charCount,
		})
	}

	return s.mergeVeryShortSegments(segments)
}

// TextSegment 文本片段结构
type TextSegment struct {
	Text      string
	CharCount int
}

// isStrongPauseChar 判断是否为强停顿字符（应该在此处分割）
func (s *WhisperService) isStrongPauseChar(char rune) bool {
	// 强停顿符号：句号、问号、感叹号、分号、冒号等
	return char == '。' || char == '！' || char == '？' || char == '；' || char == '：' ||
		   char == '.' || char == '!' || char == '?' || char == ';' || char == ':' ||
		   char == '…'
}

// isWeakPauseChar 判断是否为弱停顿字符（逗号等，但不独立分割）
func (s *WhisperService) isWeakPauseChar(char rune) bool {
	return char == '，' || char == '、' || char == ',' || char == '-'
}

// isPunctuation 判断是否为标点符号
func (s *WhisperService) isPunctuation(char rune) bool {
	punctuations := "，。！？；：、…,.!?:;'-\"'"
	return strings.ContainsRune(punctuations, char)
}

// isPhraseBoundary 检测短语边界
func (s *WhisperService) isPhraseBoundary(text string, pos int) bool {
	if pos < 2 || pos >= len(text) {
		return false
	}

	// 提取当前位置前后的文本
	before := text[max(0, pos-2):pos]
	after := text[pos:min(len(text), pos+2)]

	// 连接词边界
	connectors := []string{"然后", "但是", "不过", "而且", "另外", "所以", "因为",
		"虽然", "尽管", "如果", "那么", "这样", "那么", "and", "but", "so",
		"then", "however", "therefore", "although", "because", "if"}

	for _, connector := range connectors {
		if strings.Contains(before, connector) || strings.Contains(after, connector) {
			return true
		}
	}

	return false
}

// mergeVeryShortSegments 合并过短的片段
func (s *WhisperService) mergeVeryShortSegments(segments []TextSegment) []TextSegment {
	if len(segments) <= 1 {
		return segments
	}

	var merged []TextSegment
	i := 0

	for i < len(segments) {
		current := segments[i]

		// 如果片段太短（少于2个字符），尝试与下一个片段合并
		if len([]rune(current.Text)) < 2 && i+1 < len(segments) {
			if !s.isPunctuation(rune(current.Text[0])) {
				// 与下一个非标点符号片段合并
				next := segments[i+1]
				if !s.isPunctuation(rune(next.Text[0])) {
					merged = append(merged, TextSegment{
						Text:      current.Text + next.Text,
						CharCount: current.CharCount + next.CharCount,
					})
					i += 2
					continue
				}
			}
		}

		merged = append(merged, current)
		i++
	}

	return merged
}

// countTotalChars 计算总字符数
func (s *WhisperService) countTotalChars(segments []TextSegment) int {
	total := 0
	for _, segment := range segments {
		total += segment.CharCount
	}
	return total
}

// min 辅助函数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// max 辅助函数
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}


// getCurrentTime 获取当前时间
func (s *WhisperService) getCurrentTime() time.Time {
	return time.Now()
}

// convertToSimplified 将繁体中文转换为简体中文
func (s *WhisperService) convertToSimplified(text string) string {
	// 扩展的繁简字映射表
	replacements := []struct {
		trad, simp string
	}{
		{"體", "体"}, {"術", "术"}, {"語", "语"}, {"們", "们"}, {"個", "个"},
		{"時", "时"}, {"間", "间"}, {"會", "会"}, {"話", "话"}, {"來", "来"},
		{"這", "这"}, {"裡", "里"}, {"電", "电"}, {"腦", "脑"}, {"開", "开"},
		{"關", "关"}, {"係", "系"}, {"選", "选"}, {"擇", "择"}, {"學", "学"},
		{"習", "习"}, {"認", "认"}, {"識", "识"}, {"實", "实"}, {"際", "际"},
		{"檢", "检"}, {"測", "测"}, {"試", "试"}, {"數", "数"}, {"據", "据"},
		{"資", "资"}, {"訊", "讯"}, {"網", "网"}, {"絡", "络"}, {"連", "连"},
		{"點", "点"}, {"線", "线"}, {"機", "机"}, {"議", "议"}, {"討", "讨"},
		{"論", "论"}, {"發", "发"}, {"現", "现"}, {"問", "问"}, {"題", "题"},
		{"決", "决"}, {"辦", "办"}, {"樣", "样"}, {"類", "类"}, {"狀", "状"},
		{"況", "况"}, {"變", "变"}, {"進", "进"}, {"處", "处"}, {"應", "应"},
		{"當", "当"}, {"須", "须"}, {"將", "将"}, {"軟", "软"}, {"遊", "游"},
		{"戲", "戏"}, {"買", "买"}, {"賣", "卖"}, {"東", "东"}, {"裝", "装"},
		{"備", "备"}, {"設", "设"}, {"計", "计"}, {"劃", "划"}, {"產", "产"},
		{"研", "究"}, {"創", "创"}, {"技", "术"}, {"科", "学"}, {"醫", "医"},
		{"療", "疗"}, {"教", "育"}, {"藝", "艺"}, {"運", "运"}, {"動", "动"},
		{"環", "环"}, {"境", "境"}, {"經", "经"}, {"濟", "济"}, {"貿", "贸"},
		{"農", "农"}, {"服", "务"}, {"廣", "告"}, {"傳", "传"}, {"媒", "体"},
		{"聞", "闻"}, {"版", "版"}, {"團", "团"}, {"組", "组"}, {"織", "织"},
		{"構", "构"}, {"歷", "历"}, {"觀", "观"}, {"長", "长"}, {"鄉", "乡"},
		{"鎮", "镇"}, {"縣", "县"}, {"國", "国"}, {"際", "际"}, {"內", "内"},
		{"夥", "伙"}, {"銀", "银"}, {"保", "险"}, {"股", "票"}, {"場", "场"},
		{"鋪", "铺"}, {"貨", "货"}, {"幣", "币"}, {"匯", "汇"}, {"價", "价"},
		{"質", "量"}, {"規", "规"}, {"標", "标"}, {"準", "准"}, {"節", "节"},
		{"週", "周"}, {"過", "过"}, {"剛", "刚"}, {"纔", "才"}, {"於", "于"},
		{"無", "无"}, {"沒", "没"}, {"與", "与"}, {"種", "种"}, {"幾", "几"},
		{"萬", "万"}, {"億", "亿"}, {"頻", "频"}, {"廊", "廊"}, {"獨", "独"},
		{"錄", "录"}, {"音", "音"}, {"識", "识"}, {"別", "别"},
	}

	result := text
	for _, repl := range replacements {
		result = strings.ReplaceAll(result, repl.trad, repl.simp)
	}

	return result
}

// fallbackRecognition 回退到模拟识别
func (s *WhisperService) fallbackRecognition(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
	// 使用MockService的模拟识别逻辑
	mockService, err := NewMockService(s.config)
	if err != nil {
		return nil, err
	}
	defer mockService.Close()

	return mockService.RecognizeFile(audioPath, language, progressCallback)
}

// GetSupportedLanguages 获取支持的语言列表
func (s *WhisperService) GetSupportedLanguages() []string {
	// Whisper支持多种语言
	return []string{"zh-CN", "en-US", "ja", "ko", "es", "fr", "de", "it", "pt", "ru", "ar", "hi"}
}

// IsModelLoaded 检查模型是否已加载
func (s *WhisperService) IsModelLoaded(language string) bool {
	s.modelsLock.RLock()
	defer s.modelsLock.RUnlock()

	// Whisper使用统一模型，检查是否有真实模型
	return s.hasRealModel
}

// UnloadModel 卸载语音模型
func (s *WhisperService) UnloadModel(language string) error {
	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()

	delete(s.models, language)
	if len(s.models) == 0 {
		s.hasRealModel = false
	}
	return nil
}

// UpdateConfig 更新配置
func (s *WhisperService) UpdateConfig(config *models.RecognitionConfig) {
	s.config = config
	if s.processor != nil {
		s.processor.SetSampleRate(config.SampleRate)
		s.processor.SetChannels(1)
	}
}

// Close 关闭服务
func (s *WhisperService) Close() error {
	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()

	// 清理模型标记
	s.models = make(map[string]bool)
	s.hasRealModel = false

	// 清理音频处理器
	if s.processor != nil {
		return s.processor.Cleanup()
	}

	return nil
}