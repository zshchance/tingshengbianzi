package recognition

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"audio-recognizer/backend/models"
	"audio-recognizer/backend/audio"
)

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
	possiblePaths := []string{
		filepath.Join(s.config.ModelPath, "whisper", "ggml-base.bin"),
		filepath.Join(s.config.ModelPath, "ggml-base.bin"),
		"./models/whisper/ggml-base.bin",
		"./models/ggml-base.bin",
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			fmt.Printf("找到Whisper模型: %s\n", path)
			return true
		}
	}
	return false
}

// LoadModel 加载语音模型（Whisper使用统一模型）
func (s *WhisperService) LoadModel(language, modelPath string) error {
	// 检查模型文件是否存在
	whisperModelPath := filepath.Join(modelPath, "whisper", "ggml-base.bin")
	if _, err := os.Stat(whisperModelPath); os.IsNotExist(err) {
		// 尝试其他路径
		possiblePaths := []string{
			filepath.Join(modelPath, "ggml-base.bin"),
			"./models/whisper/ggml-base.bin",
			"./models/ggml-base.bin",
		}

		found := false
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				whisperModelPath = path
				found = true
				break
			}
		}

		if !found {
			return models.NewRecognitionError(
				models.ErrorCodeModelNotFound,
				"Whisper模型未找到",
				fmt.Sprintf("模型路径: %s", modelPath),
			)
		}
	}

	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()

	s.models[language] = true
	s.hasRealModel = true

	fmt.Printf("Whisper模型已准备好: %s\n", whisperModelPath)
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
	possiblePaths := []string{
		filepath.Join(s.config.ModelPath, "whisper", "ggml-base.bin"),
		filepath.Join(s.config.ModelPath, "ggml-base.bin"),
		"./models/whisper/ggml-base.bin",
		"./models/ggml-base.bin",
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			modelPath = path
			break
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

	result := &models.RecognitionResult{
		Language:    language,
		Duration:    audioInfo.Duration,
		ProcessedAt: s.getCurrentTime(),
		Metadata:    make(map[string]interface{}),
		Words:       []models.WordResult{},
	}

	// 解析SRT格式
	srtContent := string(content)
	lines := strings.Split(srtContent, "\n")

	var fullText strings.Builder
	var wordSegments []models.WordResult

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

					// 添加到结果
					wordSegments = append(wordSegments, models.WordResult{
						Word:       simplifiedText,
						StartTime:  startTime,
						EndTime:    endTime,
						Confidence: 0.8, // Whisper CLI不提供置信度，使用默认值
					})

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

	result.Text = fullText.String()
	result.Words = wordSegments

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
	result.Metadata["recognition_type"] = "whisper_cli"

	return result, nil
}

// parseSRTPair 解析SRT时间戳对
func (s *WhisperService) parseSRTPair(timestampLine string) (float64, float64) {
	// SRT格式: 00:00:00,000 --> 00:00:02,000
	parts := strings.Split(timestampLine, " --> ")
	if len(parts) != 2 {
		return 0, 0
	}

	startTime := s.parseSRTTime(parts[0])
	endTime := s.parseSRTTime(parts[1])

	return startTime, endTime
}

// parseSRTTime 解析SRT时间格式
func (s *WhisperService) parseSRTTime(timeStr string) float64 {
	// 格式: 00:00:00,000
	parts := strings.Split(strings.TrimSpace(timeStr), ":")
	if len(parts) != 3 {
		return 0
	}

	hours, _ := strconv.Atoi(parts[0])
	minutes, _ := strconv.Atoi(parts[1])
	secondsAndMs := strings.Split(parts[2], ",")
	if len(secondsAndMs) != 2 {
		return 0
	}

	seconds, _ := strconv.Atoi(secondsAndMs[0])
	milliseconds, _ := strconv.Atoi(secondsAndMs[1])

	return float64(hours*3600 + minutes*60 + seconds) + float64(milliseconds)/1000.0
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
		{"錄", "录"}, {"音", "音"}, {"頻", "频"}, {"識", "识"}, {"別", "别"},
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