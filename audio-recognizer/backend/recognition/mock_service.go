package recognition

import (
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"audio-recognizer/backend/models"
	"audio-recognizer/backend/audio"
)

// MockService 模拟语音识别服务（用于测试）
type MockService struct {
	processor  *audio.Processor
	config     *models.RecognitionConfig
	models     map[string]bool
}

// NewMockService 创建新的模拟语音识别服务
func NewMockService(config *models.RecognitionConfig) (*MockService, error) {
	// 创建音频处理器
	processor, err := audio.NewProcessor()
	if err != nil {
		return nil, err
	}

	service := &MockService{
		processor: processor,
		config:    config,
		models:    make(map[string]bool),
	}

	// 预加载默认语言模型
	service.models[config.Language] = true

	return service, nil
}

// LoadModel 模拟加载语音模型
func (s *MockService) LoadModel(language, modelPath string) error {
	// 检查模型目录是否存在
	fullModelPath := filepath.Join(modelPath, language)
	if _, err := os.Stat(fullModelPath); os.IsNotExist(err) {
		return models.NewRecognitionError(
			models.ErrorCodeModelNotFound,
			"语音模型未找到",
			fmt.Sprintf("模型路径: %s", fullModelPath),
		)
	}

	// 模拟加载时间
	time.Sleep(1 * time.Second)

	s.models[language] = true
	return nil
}

// RecognizeFile 模拟识别音频文件
func (s *MockService) RecognizeFile(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
	// 检查模型是否已加载
	if !s.IsModelLoaded(language) {
		return nil, models.NewRecognitionError(
			models.ErrorCodeModelNotFound,
			"语音模型未加载",
			fmt.Sprintf("语言: %s", language),
		)
	}

	// 获取音频文件信息
	wavPath, audioInfo, err := s.processor.ConvertToWAV(audioPath)
	if err != nil {
		return nil, err
	}
	defer os.Remove(wavPath) // 清理临时文件

	// 模拟识别过程
	result := &models.RecognitionResult{
		Language:    language,
		Duration:    audioInfo.Duration,
		ProcessedAt: time.Now(),
		Metadata:    make(map[string]interface{}),
	}

	// 生成模拟的识别文本
	var mockText strings.Builder
	var mockWords []models.Word

	// 根据语言生成不同的模拟文本
	texts := s.getMockTexts(language)
	totalDuration := audioInfo.Duration
	wordsPerSecond := 2.5
	totalWords := int(totalDuration * wordsPerSecond)

	if totalWords == 0 {
		totalWords = 50 // 默认50个词
	}

	// 生成更精细的语音片段
	currentTime := 0.0
	segmentCount := 0

	// 生成多个短句片段，每个片段2-5秒
	for currentTime < totalDuration && segmentCount < totalWords {
		// 随机生成短句长度（2-6个词）
		segmentWordCount := 2 + rand.Intn(5) // 2-6个词
		var segmentWords []string

		for j := 0; j < segmentWordCount && segmentCount < totalWords; j++ {
			// 随机选择一个词
			word := texts[rand.Intn(len(texts))]
			segmentWords = append(segmentWords, word)
			segmentCount++
		}

		// 计算片段时长（1-3秒之间）
		segmentDuration := 1.0 + rand.Float64()*2.0
		startTime := currentTime
		endTime := currentTime + segmentDuration

		// 避免超过总时长
		if endTime > totalDuration {
			endTime = totalDuration
		}

		// 组合成短句，添加标点符号
		segmentText := strings.Join(segmentWords, "")
		if rand.Float32() < 0.6 { // 60%概率添加标点符号
			punctuations := []string{"，", "。", "！", "？"}
			segmentText += punctuations[rand.Intn(len(punctuations))]
		}

		// 生成随机置信度
		confidence := 0.7 + rand.Float64()*0.3 // 0.7-1.0之间

		// 添加到结果
		mockWords = append(mockWords, models.Word{
			Text:       segmentText,
			Start:      startTime,
			End:        endTime,
			Confidence: confidence,
		})

		// 构建文本
		if segmentCount > len(segmentWords) { // 不是第一个片段
			mockText.WriteString(" ")
		}
		mockText.WriteString(segmentText)

		// 模拟进度更新
		progress := segmentCount * 100 / totalWords
		if progressCallback != nil {
			progressCallback(&models.RecognitionProgress{
				CurrentTime: endTime,
				TotalTime:   totalDuration,
				Percentage:  progress,
				Status:      fmt.Sprintf("正在识别... %d%%", progress),
				WordsPerSec: wordsPerSecond,
			})
		}

		// 添加停顿时间（0.2-0.8秒）
		currentTime = endTime + 0.2 + rand.Float64()*0.6

		// 模拟处理时间
		time.Sleep(30 * time.Millisecond)
	}

	// 设置结果
	result.Text = mockText.String()
	result.Words = mockWords

	// 计算整体置信度
	if len(mockWords) > 0 {
		var totalConfidence float64
		for _, word := range mockWords {
			totalConfidence += word.Confidence
		}
		result.Confidence = totalConfidence / float64(len(mockWords))
	}

	// 添加元数据
	result.Metadata["audio_file"] = filepath.Base(audioPath)
	result.Metadata["audio_format"] = audioInfo.Format
	result.Metadata["sample_rate"] = audioInfo.SampleRate
	result.Metadata["channels"] = audioInfo.Channels
	result.Metadata["total_words"] = len(mockWords)
	result.Metadata["recognition_type"] = "mock"

	return result, nil
}

// getMockTexts 获取模拟文本词汇
func (s *MockService) getMockTexts(language string) []string {
	switch language {
	case "zh-CN":
		return []string{
			"你好", "世界", "语音", "识别", "技术", "正在", "不断", "发展",
			"人工智能", "机器", "学习", "深度", "学习", "算法", "模型",
			"数据", "训练", "优化", "准确", "率", "提升", "应用", "场景",
			"智能", "音箱", "语音", "助手", "自动", "驾驶", "医疗", "诊断",
			"客服", "系统", "翻译", "软件", "内容", "创作", "教育", "培训",
		}
	case "en-US":
		return []string{
			"hello", "world", "speech", "recognition", "technology", "artificial", "intelligence",
			"machine", "learning", "deep", "learning", "algorithm", "model", "data", "training",
			"optimization", "accuracy", "improvement", "application", "scenarios", "smart",
			"speaker", "assistant", "autonomous", "driving", "medical", "diagnosis", "customer",
			"service", "system", "translation", "software", "content", "creation", "education",
			"training", "innovation", "research", "development", "future", "technology",
		}
	default:
		return []string{"hello", "world", "speech", "recognition", "test", "demo"}
	}
}

// GetSupportedLanguages 获取支持的语言列表
func (s *MockService) GetSupportedLanguages() []string {
	languages := make([]string, 0, len(s.models))
	for language := range s.models {
		languages = append(languages, language)
	}
	return languages
}

// IsModelLoaded 检查模型是否已加载
func (s *MockService) IsModelLoaded(language string) bool {
	_, exists := s.models[language]
	return exists
}

// UnloadModel 卸载语音模型
func (s *MockService) UnloadModel(language string) error {
	if _, exists := s.models[language]; exists {
		delete(s.models, language)
		return nil
	}
	return fmt.Errorf("模型未加载: %s", language)
}

// UpdateConfig 更新配置
func (s *MockService) UpdateConfig(config *models.RecognitionConfig) {
	s.config = config
	if s.processor != nil {
		s.processor.SetSampleRate(config.SampleRate)
		s.processor.SetChannels(1)
	}
}

// Close 关闭服务
func (s *MockService) Close() error {
	s.models = make(map[string]bool)
	if s.processor != nil {
		return s.processor.Cleanup()
	}
	return nil
}