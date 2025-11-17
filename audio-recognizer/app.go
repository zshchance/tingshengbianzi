package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"audio-recognizer/backend/models"
	"audio-recognizer/backend/recognition"
)

// App struct
type App struct {
	ctx         context.Context
	recognitionService recognition.RecognitionService
	config      *models.RecognitionConfig
	isRecognizing bool
	mu          sync.RWMutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	// 加载默认配置
	config := loadDefaultConfig()

	return &App{
		config: config,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 初始化Vosk服务
	if err := a.initializeVoskService(); err != nil {
		fmt.Printf("初始化Vosk服务失败: %v\n", err)
	}
}

// initializeVoskService 初始化语音识别服务
func (a *App) initializeVoskService() error {
	// 尝试使用Whisper服务
	service, err := recognition.NewWhisperService(a.config)
	if err != nil {
		fmt.Printf("Whisper服务初始化失败，回退到模拟服务: %v\n", err)

		// 回退到模拟服务
		mockService, mockErr := recognition.NewMockService(a.config)
		if mockErr != nil {
			return fmt.Errorf("语音识别服务初始化完全失败: %w", mockErr)
		}
		a.recognitionService = mockService
		return nil
	}

	a.recognitionService = service
	return nil
}

// loadDefaultConfig 加载默认配置
func loadDefaultConfig() *models.RecognitionConfig {
	// 获取可执行文件所在目录
	exePath, err := os.Executable()
	if err != nil {
		exePath = "."
	}
	exeDir := filepath.Dir(exePath)

	return &models.RecognitionConfig{
		Language:            "zh-CN",
		ModelPath:           filepath.Join(exeDir, "models"),
		SampleRate:          16000,
		BufferSize:          4000,
		ConfidenceThreshold: 0.5,
		MaxAlternatives:     1,
			EnableWordTimestamp: true,
	}
}

// RecognitionRequest 识别请求
type RecognitionRequest struct {
	FilePath string                 `json:"filePath"`
	Language string                 `json:"language"`
	Options  map[string]interface{} `json:"options"`
}

// RecognitionResponse 识别响应
type RecognitionResponse struct {
	Success bool                    `json:"success"`
	Result  *models.RecognitionResult `json:"result,omitempty"`
	Error   *models.RecognitionError `json:"error,omitempty"`
}

// ProgressResponse 进度响应
type ProgressResponse struct {
	Type     string                    `json:"type"`
	Progress *models.RecognitionProgress `json:"progress,omitempty"`
	Error    *models.RecognitionError   `json:"error,omitempty"`
}

// StartRecognition 开始语音识别
func (a *App) StartRecognition(request RecognitionRequest) RecognitionResponse {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.isRecognizing {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				"RECOGNITION_IN_PROGRESS",
				"语音识别正在进行中",
				"",
			),
		}
	}

	if a.recognitionService == nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeRecognitionFailed,
				"语音识别服务未初始化",
				"",
			),
		}
	}

	// 检查文件是否存在
	if _, err := os.Stat(request.FilePath); os.IsNotExist(err) {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeAudioFileNotFound,
				"音频文件未找到",
				request.FilePath,
			),
		}
	}

	// 设置识别语言
	language := request.Language
	if language == "" {
		language = a.config.Language
	}

	// 确保模型已加载
	if !a.recognitionService.IsModelLoaded(language) {
		if err := a.recognitionService.LoadModel(language, a.config.ModelPath); err != nil {
			return RecognitionResponse{
				Success: false,
				Error: models.NewRecognitionError(
					models.ErrorCodeModelLoadFailed,
					"语音模型加载失败",
					err.Error(),
				),
			}
		}
	}

	a.isRecognizing = true

	// 启动异步识别
	go a.performRecognition(request, language)

	return RecognitionResponse{
		Success: true,
	}
}

// performRecognition 执行语音识别
func (a *App) performRecognition(request RecognitionRequest, language string) {
	defer func() {
		a.mu.Lock()
		a.isRecognizing = false
		a.mu.Unlock()
	}()

	// 发送进度事件
	a.sendProgressEvent("progress", &models.RecognitionProgress{
		Status:     "正在准备音频文件...",
		Percentage: 0,
	})

	// 执行识别
	result, err := a.recognitionService.RecognizeFile(
		request.FilePath,
		language,
		func(progress *models.RecognitionProgress) {
			a.sendProgressEvent("progress", progress)
		},
	)

	if err != nil {
		a.sendProgressEvent("error", nil)
		a.sendProgressEvent("complete", RecognitionResponse{
			Success: false,
			Error:   models.NewRecognitionError(models.ErrorCodeRecognitionFailed, "语音识别失败", err.Error()),
		})
		return
	}

	// 发送完成事件
	a.sendProgressEvent("complete", RecognitionResponse{
		Success: true,
		Result:  result,
	})
}

// StopRecognition 停止语音识别
func (a *App) StopRecognition() RecognitionResponse {
	a.mu.Lock()
	defer a.mu.Unlock()

	if !a.isRecognizing {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				"NO_RECOGNITION_IN_PROGRESS",
				"没有正在进行的语音识别",
				"",
			),
		}
	}

	// 注意：Vosk API没有直接停止识别的方法，这里只是标记状态
	a.isRecognizing = false

	a.sendProgressEvent("stopped", nil)

	return RecognitionResponse{
		Success: true,
	}
}

// GetRecognitionStatus 获取识别状态
func (a *App) GetRecognitionStatus() map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return map[string]interface{}{
		"isRecognizing": a.isRecognizing,
		"serviceReady":  a.recognitionService != nil,
		"supportedLanguages": func() []string {
			if a.recognitionService != nil {
				return a.recognitionService.GetSupportedLanguages()
			}
			return []string{}
		}(),
	}
}

// UpdateConfig 更新识别配置
func (a *App) UpdateConfig(configJSON string) RecognitionResponse {
	var config models.RecognitionConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeInvalidConfig,
				"配置格式无效",
				err.Error(),
			),
		}
	}

	// 更新配置
	a.mu.Lock()
	a.config = &config
	a.mu.Unlock()

	// 更新Vosk服务配置
	if a.recognitionService != nil {
		a.recognitionService.UpdateConfig(&config)
	}

	return RecognitionResponse{
		Success: true,
	}
}

// GetConfig 获取当前配置
func (a *App) GetConfig() string {
	a.mu.RLock()
	defer a.mu.RUnlock()

	configJSON, _ := json.MarshalIndent(a.config, "", "  ")
	return string(configJSON)
}

// LoadModel 加载语音模型
func (a *App) LoadModel(language, modelPath string) RecognitionResponse {
	if a.recognitionService == nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeRecognitionFailed,
				"语音识别服务未初始化",
				"",
			),
		}
	}

	if err := a.recognitionService.LoadModel(language, modelPath); err != nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeModelLoadFailed,
				"语音模型加载失败",
				err.Error(),
			),
		}
	}

	return RecognitionResponse{
		Success: true,
	}
}

// ExportResult 导出识别结果
func (a *App) ExportResult(resultJSON, format, outputPath string) RecognitionResponse {
	var result models.RecognitionResult
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeInvalidConfig,
				"识别结果格式无效",
				err.Error(),
			),
		}
	}

	// 根据格式导出结果
	var content string
	var err error

	switch format {
	case "txt":
		content = a.exportToTXT(result)
	case "srt":
		content = a.exportToSRT(result)
	case "vtt":
		content = a.exportToVTT(result)
	case "json":
		contentBytes, err := json.MarshalIndent(result, "", "  ")
		content = string(contentBytes)
		if err != nil {
			err = fmt.Errorf("JSON序列化失败: %w", err)
		}
	default:
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				"INVALID_EXPORT_FORMAT",
				"不支持的导出格式",
				format,
			),
		}
	}

	if err != nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				"EXPORT_FAILED",
				"导出失败",
				err.Error(),
			),
		}
	}

	// 写入文件
	if err := os.WriteFile(outputPath, []byte(content), 0644); err != nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodePermissionDenied,
				"文件写入失败",
				err.Error(),
			),
		}
	}

	return RecognitionResponse{
		Success: true,
	}
}

// exportToTXT 导出为纯文本格式
func (a *App) exportToTXT(result models.RecognitionResult) string {
	return result.Text
}

// exportToSRT 导出为SRT字幕格式
func (a *App) exportToSRT(result models.RecognitionResult) string {
	var srt strings.Builder

	for i, word := range result.Words {
		startSec := int64(word.StartTime)
		startMS := int64((word.StartTime - float64(startSec)) * 1000)
		endSec := int64(word.EndTime)
		endMS := int64((word.EndTime - float64(endSec)) * 1000)

		startTime := time.Unix(startSec, startMS*int64(time.Millisecond))
		endTime := time.Unix(endSec, endMS*int64(time.Millisecond))

		srt.WriteString(fmt.Sprintf("%d\n", i+1))
		srt.WriteString(fmt.Sprintf("%s --> %s\n",
			startTime.Format("15:04:05,000"),
			endTime.Format("15:04:05,000")))
		srt.WriteString(fmt.Sprintf("%s\n\n", word.Word))
	}

	return srt.String()
}

// exportToVTT 导出为WebVTT格式
func (a *App) exportToVTT(result models.RecognitionResult) string {
	var vtt strings.Builder
	vtt.WriteString("WEBVTT\n\n")

	for _, word := range result.Words {
		vtt.WriteString(fmt.Sprintf("%.2f --> %.2f\n", word.StartTime, word.EndTime))
		vtt.WriteString(fmt.Sprintf("%s\n\n", word.Word))
	}

	return vtt.String()
}

// sendProgressEvent 发送进度事件（需要Wails运行时支持）
func (a *App) sendProgressEvent(eventType string, data interface{}) {
	// 这里需要使用Wails的EventsEmit功能
	// 暂时简化实现
	fmt.Printf("Progress Event: %s, Data: %v\n", eventType, data)
}
