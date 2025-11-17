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

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"audio-recognizer/backend/models"
	"audio-recognizer/backend/recognition"
	"audio-recognizer/backend/audio"
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
	a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
		Status:     "正在准备音频文件...",
		Percentage: 0,
	})

	// 执行识别
	result, err := a.recognitionService.RecognizeFile(
		request.FilePath,
		language,
		func(progress *models.RecognitionProgress) {
			a.sendProgressEvent("recognition_progress", progress)
		},
	)

	if err != nil {
		a.sendProgressEvent("recognition_error", models.NewRecognitionError(models.ErrorCodeRecognitionFailed, "语音识别失败", err.Error()))
		a.sendProgressEvent("recognition_complete", RecognitionResponse{
			Success: false,
			Error:   models.NewRecognitionError(models.ErrorCodeRecognitionFailed, "语音识别失败", err.Error()),
		})
		return
	}

	// 发送完成事件
	a.sendProgressEvent("recognition_result", result)
	a.sendProgressEvent("recognition_complete", RecognitionResponse{
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

// SelectModelDirectory 选择模型文件夹
func (a *App) SelectModelDirectory() map[string]interface{} {
	dialogOptions := runtime.OpenDialogOptions{
		Title:            "选择模型文件夹",
		DefaultDirectory: "",
		DefaultFilename:  "",
		Filters:          []runtime.FileFilter{}, // 不使用文件过滤器，显示所有文件夹
	}

	selectedDirectory, err := runtime.OpenDirectoryDialog(a.ctx, dialogOptions)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}
	}

	if selectedDirectory == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件夹",
		}
	}

	// 检查目录是否存在
	fileInfo, err := os.Stat(selectedDirectory)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("无法访问文件夹: %v", err),
		}
	}

	if !fileInfo.IsDir() {
		return map[string]interface{}{
			"success": false,
			"error":   "选择的路径不是文件夹",
		}
	}

	// 扫描目录中的模型文件
	models := a.scanModelFiles(selectedDirectory)

	return map[string]interface{}{
		"success": true,
		"path":    selectedDirectory,
		"models":  models,
	}
}

// scanModelFiles 扫描模型文件夹
func (a *App) scanModelFiles(directory string) []map[string]interface{} {
	var models []map[string]interface{}

	// 检查Whisper模型文件
	whisperModels := []string{
		"ggml-base.bin",
		"ggml-small.bin",
		"ggml-medium.bin",
		"ggml-large.bin",
		"ggml-large-v1.bin",
		"ggml-large-v2.bin",
		"ggml-large-v3.bin",
		"ggml-tiny.bin",
	}

	for _, modelFile := range whisperModels {
		modelPath := filepath.Join(directory, modelFile)
		if fileInfo, err := os.Stat(modelPath); err == nil {
			size := fileInfo.Size()
			sizeStr := a.formatFileSize(size)
			models = append(models, map[string]interface{}{
				"name":    modelFile,
				"path":    modelPath,
				"type":    "whisper",
				"size":    size,
				"sizeStr": sizeStr,
			})
		}
	}

	// 检查whisper子目录
	whisperDir := filepath.Join(directory, "whisper")
	if dirInfo, err := os.Stat(whisperDir); err == nil && dirInfo.IsDir() {
		for _, modelFile := range whisperModels {
			modelPath := filepath.Join(whisperDir, modelFile)
			if fileInfo, err := os.Stat(modelPath); err == nil {
				size := fileInfo.Size()
				sizeStr := a.formatFileSize(size)
				models = append(models, map[string]interface{}{
					"name":    filepath.Join("whisper", modelFile),
					"path":    modelPath,
					"type":    "whisper",
					"size":    size,
					"sizeStr": sizeStr,
				})
			}
		}
	}

	return models
}

// formatFileSize 格式化文件大小
func (a *App) formatFileSize(bytes int64) string {
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

// GetModelInfo 获取模型信息
func (a *App) GetModelInfo(directory string) map[string]interface{} {
	if directory == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "目录路径为空",
		}
	}

	// 检查目录是否存在
	if _, err := os.Stat(directory); os.IsNotExist(err) {
		return map[string]interface{}{
			"success": false,
			"error":   "目录不存在",
		}
	}

	// 扫描模型文件
	models := a.scanModelFiles(directory)

	return map[string]interface{}{
		"success":      true,
		"directory":    directory,
		"models":       models,
		"modelCount":   len(models),
		"hasWhisper":   a.hasWhisperModel(models),
		"recommendations": a.getRecommendations(models),
	}
}

// hasWhisperModel 检查是否有Whisper模型
func (a *App) hasWhisperModel(models []map[string]interface{}) bool {
	for _, model := range models {
		if model["type"] == "whisper" {
			return true
		}
	}
	return false
}

// getRecommendations 获取模型推荐
func (a *App) getRecommendations(models []map[string]interface{}) []string {
	var recommendations []string
	hasWhisper := a.hasWhisperModel(models)

	if !hasWhisper {
		recommendations = append(recommendations, "建议下载Whisper Base模型以开始使用语音识别功能")
	}

	if len(models) == 0 {
		recommendations = append(recommendations, "当前目录中没有检测到任何模型文件")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "模型配置正常，可以开始使用语音识别功能")
	}

	return recommendations
}

// SelectAudioFile 选择音频文件
func (a *App) SelectAudioFile() map[string]interface{} {
	dialogOptions := runtime.OpenDialogOptions{
		Title:           "选择音频文件",
		DefaultDirectory: "",
		DefaultFilename:  "",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "音频文件 (*.mp3, *.wav, *.m4a, *.ogg, *.flac)",
				Pattern:     "*.mp3;*.wav;*.m4a;*.ogg;*.flac",
			},
		},
	}

	selectedFile, err := runtime.OpenFileDialog(a.ctx, dialogOptions)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}
	}

	if selectedFile == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件",
		}
	}

	// 获取文件信息
	fileInfo, err := os.Stat(selectedFile)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("无法读取文件信息: %v", err),
		}
	}

	// 获取文件扩展名来确定类型
	ext := strings.ToLower(filepath.Ext(selectedFile))
	var mimeType string
	switch ext {
	case ".mp3":
		mimeType = "audio/mpeg"
	case ".wav":
		mimeType = "audio/wav"
	case ".m4a":
		mimeType = "audio/mp4"
	case ".ogg":
		mimeType = "audio/ogg"
	case ".flac":
		mimeType = "audio/flac"
	default:
		mimeType = "audio/" + ext[1:]
	}

	// 尝试获取音频时长
	var duration float64
	processor, err := audio.NewProcessor()
	if err != nil {
		fmt.Printf("创建音频处理器失败: %v\n", err)
		// 如果无法创建处理器，使用文件大小估算时长
		duration = a.estimateDurationFromSize(fileInfo.Size(), ext)
		fmt.Printf("使用估算时长: %.2f 秒\n", duration)
	} else {
		defer processor.Cleanup()

		// 使用音频处理器获取时长
		audioDuration, err := processor.GetAudioDuration(selectedFile)
		if err != nil {
			fmt.Printf("获取音频时长失败: %v\n", err)
			// 回退到估算
			duration = a.estimateDurationFromSize(fileInfo.Size(), ext)
			fmt.Printf("回退使用估算时长: %.2f 秒\n", duration)
		} else {
			duration = audioDuration
			fmt.Printf("成功获取音频时长: %.2f 秒\n", duration)
		}
	}

	return map[string]interface{}{
		"success": true,
		"file": map[string]interface{}{
			"name":         filepath.Base(selectedFile),
			"path":         selectedFile,
			"size":         fileInfo.Size(),
			"type":         mimeType,
			"duration":     duration,
			"lastModified": fileInfo.ModTime().UnixMilli(),
		},
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
		startSec := int64(word.Start)
		startMS := int64((word.Start - float64(startSec)) * 1000)
		endSec := int64(word.End)
		endMS := int64((word.End - float64(endSec)) * 1000)

		startTime := time.Unix(startSec, startMS*int64(time.Millisecond))
		endTime := time.Unix(endSec, endMS*int64(time.Millisecond))

		srt.WriteString(fmt.Sprintf("%d\n", i+1))
		srt.WriteString(fmt.Sprintf("%s --> %s\n",
			startTime.Format("15:04:05,000"),
			endTime.Format("15:04:05,000")))
		srt.WriteString(fmt.Sprintf("%s\n\n", word.Text))
	}

	return srt.String()
}

// exportToVTT 导出为WebVTT格式
func (a *App) exportToVTT(result models.RecognitionResult) string {
	var vtt strings.Builder
	vtt.WriteString("WEBVTT\n\n")

	for _, word := range result.Words {
		vtt.WriteString(fmt.Sprintf("%.2f --> %.2f\n", word.Start, word.End))
		vtt.WriteString(fmt.Sprintf("%s\n\n", word.Text))
	}

	return vtt.String()
}

// estimateDurationFromSize 根据文件大小估算音频时长
func (a *App) estimateDurationFromSize(fileSize int64, ext string) float64 {
	// 根据不同格式设置平均比特率（kbps）
	var bitRate int
	switch ext {
	case ".mp3":
		bitRate = 128
	case ".wav":
		bitRate = 1411 // CD质量
	case ".m4a", ".aac":
		bitRate = 128
	case ".flac":
		bitRate = 1000 // 无损压缩
	case ".ogg":
		bitRate = 160
	default:
		bitRate = 128 // 默认
	}

	// 计算时长（秒）
	bytesPerSecond := float64(bitRate*1000) / 8 // 转换为字节/秒
	estimatedDuration := float64(fileSize) / bytesPerSecond

	// 设置合理的范围限制
	if estimatedDuration < 1 {
		estimatedDuration = 1 // 最少1秒
	} else if estimatedDuration > 7200 {
		estimatedDuration = 7200 // 最多2小时
	}

	return estimatedDuration
}


// sendProgressEvent 发送进度事件
func (a *App) sendProgressEvent(eventType string, data interface{}) {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, eventType, data)
	}
}
