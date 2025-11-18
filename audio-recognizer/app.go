package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"tingshengbianzi/backend/models"
	"tingshengbianzi/backend/recognition"
	"tingshengbianzi/backend/audio"
	"tingshengbianzi/backend/utils"
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

	// 初始化AI提示词模板系统
	if err := a.initializeTemplates(); err != nil {
		fmt.Printf("初始化AI模板系统失败: %v\n", err)
	}

	// 初始化语音识别服务
	if err := a.initializeVoskService(); err != nil {
		fmt.Printf("初始化Vosk服务失败: %v\n", err)
	}
}

// initializeTemplates 初始化AI提示词模板系统
func (a *App) initializeTemplates() error {
	// 获取用户配置目录和相对路径
	userConfigDir, configSubDir := getUserConfigDirectory()

	// 设置模板配置文件路径
	var templatePath string
	if configSubDir == "" {
		// 用户主目录中的模板
		templatePath = filepath.Join(userConfigDir, "templates.json")

		// 如果用户目录中没有模板文件，复制内置模板
		if _, err := os.Stat(templatePath); os.IsNotExist(err) {
			// 尝试从应用资源目录复制模板文件
			appRoot := getAppRootDirectory()
			builtinTemplatePath := filepath.Join(appRoot, "config", "templates.json")
			if builtinData, err := os.ReadFile(builtinTemplatePath); err == nil {
				// 复制到用户目录
				if err := os.WriteFile(templatePath, builtinData, 0644); err == nil {
					fmt.Printf("✅ 已复制内置模板到用户目录: %s\n", templatePath)
				}
			}
		}
	} else {
		// 项目目录中的模板
		templatePath = filepath.Join(userConfigDir, configSubDir, "templates.json")
	}

	// 初始化模板系统
	if err := utils.InitializeTemplates(templatePath); err != nil {
		fmt.Printf("加载AI模板配置失败: %v，将使用硬编码模板\n", err)
		// 不返回错误，允许应用继续运行
		return nil
	}

	fmt.Printf("✅ AI模板系统初始化成功\n")
	return nil
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

// getAppRootDirectory 获取应用根目录
func getAppRootDirectory() string {
	// 首先尝试获取可执行文件所在目录
	exePath, err := os.Executable()
	if err != nil {
		exePath = "."
	}
	exeDir := filepath.Dir(exePath)

	// 检查是否在 Wails 开发环境的 .app 包中
	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		// 在 .app 包中，需要向上找到项目根目录
		searchDir := exeDir
		for i := 0; i < 10; i++ { // 最多向上查找10级
			// 检查是否有项目标志文件
			projectFiles := []string{"wails.json", "go.mod", "main.go"}
			for _, marker := range projectFiles {
				if _, err := os.Stat(filepath.Join(searchDir, marker)); err == nil {
					fmt.Printf("🎯 检测到项目根目录: %s\n", searchDir)
					return searchDir
				}
			}

			// 如果到了 build 目录，再向上找一级
			if filepath.Base(searchDir) == "build" {
				searchDir = filepath.Dir(searchDir)
				continue
			}

			searchDir = filepath.Dir(searchDir)
		}
	}

	// 检查是否在临时构建目录中
	if filepath.Base(exeDir) == "build" || filepath.Base(exeDir) == "tmp" {
		// 尝试查找项目根目录的标志文件
		projectFiles := []string{"wails.json", "go.mod", "main.go"}

		// 从当前目录向上查找
		searchDir := exeDir
		for i := 0; i < 5; i++ { // 最多向上查找5级
			for _, marker := range projectFiles {
				if _, err := os.Stat(filepath.Join(searchDir, marker)); err == nil {
					fmt.Printf("🎯 检测到项目根目录: %s\n", searchDir)
					return searchDir
				}
			}
			searchDir = filepath.Dir(searchDir)
		}
	}

	// 如果都没找到，检查当前目录是否已经是项目根目录
	projectFiles := []string{"wails.json", "go.mod", "main.go"}
	for _, marker := range projectFiles {
		if _, err := os.Stat(filepath.Join(exeDir, marker)); err == nil {
			fmt.Printf("🎯 当前目录就是项目根目录: %s\n", exeDir)
			return exeDir
		}
	}

	fmt.Printf("📁 使用可执行文件目录: %s\n", exeDir)
	return exeDir
}

// getUserConfigDirectory 获取用户配置目录（用于发布版本）
func getUserConfigDirectory() (string, string) {
	// 检查是否在发布版本中运行
	exePath, err := os.Executable()
	if err != nil {
		return getAppRootDirectory(), "config"
	}

	exeDir := filepath.Dir(exePath)

	// 如果在.app包中，且检测到项目环境，则使用项目目录（开发模式）
	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		appRoot := getAppRootDirectory()
		// 检查是否真的在项目开发环境中（有项目文件）
		goModExists := true
		wailsJsonExists := true

		if _, err := os.Stat(filepath.Join(appRoot, "go.mod")); err != nil {
			goModExists = false
		}
		if _, err := os.Stat(filepath.Join(appRoot, "wails.json")); err != nil {
			wailsJsonExists = false
		}

		if goModExists && wailsJsonExists {
			// 开发环境：使用项目目录
			return appRoot, "config"
		}
	}

	// 生产环境：使用用户主目录
	homeDir, err := os.UserHomeDir()
	if err != nil {
		// 回退到应用目录
		return exeDir, "config"
	}

	// 创建用户配置目录：~/Library/Application Support/听声辨字/
	configDir := filepath.Join(homeDir, "Library", "Application Support", "听声辨字")

	// 确保目录存在
	if err := os.MkdirAll(configDir, 0755); err != nil {
		// 如果创建失败，回退到应用目录
		return exeDir, "config"
	}

	return configDir, ""
}

// loadDefaultConfig 加载默认配置
func loadDefaultConfig() *models.RecognitionConfig {
	// 获取用户配置目录和相对路径
	userConfigDir, configSubDir := getUserConfigDirectory()

	// 创建默认配置
	defaultConfig := &models.RecognitionConfig{
		Language:              "zh-CN",
		ModelPath:             filepath.Join(userConfigDir, "models"),
		SpecificModelFile:     "", // 用户指定的具体模型文件
		SampleRate:            16000,
		BufferSize:            4000,
		ConfidenceThreshold:   0.5,
		MaxAlternatives:       1,
		EnableWordTimestamp:   true,
		EnableNormalization:   true,
		EnableNoiseReduction:  false,
	}

	// 构建配置文件路径
	var configFile string
	if configSubDir == "" {
		// 用户主目录中的配置
		configFile = filepath.Join(userConfigDir, "user-config.json")
	} else {
		// 项目目录中的配置
		configFile = filepath.Join(userConfigDir, configSubDir, "user-config.json")
	}

	fmt.Printf("📂 配置文件路径: %s\n", configFile)

	if configData, err := os.ReadFile(configFile); err == nil {
		var userConfig models.RecognitionConfig
		if json.Unmarshal(configData, &userConfig) == nil {
			// 合并用户配置（保留默认值，用户配置覆盖相应字段）
			defaultConfig.Language = userConfig.Language
			defaultConfig.ModelPath = userConfig.ModelPath
			defaultConfig.SpecificModelFile = userConfig.SpecificModelFile
			defaultConfig.SampleRate = userConfig.SampleRate
			defaultConfig.BufferSize = userConfig.BufferSize
			defaultConfig.ConfidenceThreshold = userConfig.ConfidenceThreshold
			defaultConfig.MaxAlternatives = userConfig.MaxAlternatives
			defaultConfig.EnableWordTimestamp = userConfig.EnableWordTimestamp
			defaultConfig.EnableNormalization = userConfig.EnableNormalization
			defaultConfig.EnableNoiseReduction = userConfig.EnableNoiseReduction

			fmt.Printf("✅ 已加载用户配置文件: %s\n", configFile)
		} else {
			fmt.Printf("⚠️ 配置文件格式错误，使用默认配置: %s\n", configFile)
		}
	} else {
		fmt.Printf("ℹ️ 未找到用户配置文件，使用默认配置\n")
	}

	return defaultConfig
}

// RecognitionRequest 识别请求
type RecognitionRequest struct {
	FilePath          string                 `json:"filePath"`
	FileData          string                 `json:"fileData,omitempty"`          // Base64编码的文件数据（拖拽功能使用）
	Language          string                 `json:"language"`
	Options           map[string]interface{} `json:"options"`
	SpecificModelFile string                 `json:"specificModelFile,omitempty"` // 用户指定的具体模型文件
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

	// 检查文件是否存在（对于拖拽文件，FileData存在时跳过路径检查）
	if request.FileData == "" {
		// 只有在没有Base64数据时才检查文件路径
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
	}

	// 设置识别语言
	language := request.Language
	if language == "" {
		language = a.config.Language
	}

	// 确保模型已加载
	if !a.recognitionService.IsModelLoaded(language) {
		// 确定模型路径：优先使用用户指定的模型文件所在目录
		modelPath := a.config.ModelPath
		if request.SpecificModelFile != "" {
			// 从用户指定的模型文件路径中提取目录
			modelDir := filepath.Dir(request.SpecificModelFile)
			modelPath = modelDir
			fmt.Printf("使用用户指定模型的目录: %s\n", modelPath)
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
	var result *models.RecognitionResult
	var err error

	// 处理拖拽文件（Base64数据）
	if request.FileData != "" {
		a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
			Status:     "正在处理拖拽文件...",
			Percentage: 5,
		})

		// 创建临时文件处理Base64数据
		tempFile, tempErr := a.createTempFileFromBase64(request.FileData)
		if tempErr != nil {
			a.sendProgressEvent("recognition_error", models.NewRecognitionError(
				models.ErrorCodeFileValidationFailed,
				"拖拽文件处理失败",
				tempErr.Error(),
			))
			a.sendProgressEvent("recognition_complete", RecognitionResponse{
				Success: false,
				Error:   models.NewRecognitionError(models.ErrorCodeFileValidationFailed, "拖拽文件处理失败", tempErr.Error()),
			})
			return
		}
		defer os.Remove(tempFile) // 清理临时文件

		a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
			Status:     "临时文件创建完成，开始识别...",
			Percentage: 10,
		})

		// 使用临时文件路径进行识别
		if request.SpecificModelFile != "" {
			result, err = a.recognitionService.RecognizeFileWithModel(
				tempFile,
				language,
				request.SpecificModelFile,
				func(progress *models.RecognitionProgress) {
					a.sendProgressEvent("recognition_progress", progress)
				},
			)
		} else {
			result, err = a.recognitionService.RecognizeFile(
				tempFile,
				language,
				func(progress *models.RecognitionProgress) {
					a.sendProgressEvent("recognition_progress", progress)
				},
			)
		}
	} else {
		// 处理普通文件路径
		if request.SpecificModelFile != "" {
			// 使用用户指定的模型文件
			result, err = a.recognitionService.RecognizeFileWithModel(
				request.FilePath,
				language,
				request.SpecificModelFile,
				func(progress *models.RecognitionProgress) {
					a.sendProgressEvent("recognition_progress", progress)
				},
			)
		} else {
			// 使用默认识别方法
			result, err = a.recognitionService.RecognizeFile(
				request.FilePath,
				language,
				func(progress *models.RecognitionProgress) {
					a.sendProgressEvent("recognition_progress", progress)
				},
			)
		}
	}

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
	fmt.Printf("🔧 收到配置更新请求，JSON长度: %d\n", len(configJSON))
	fmt.Printf("📄 配置内容: %s\n", configJSON)

	var config models.RecognitionConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		fmt.Printf("❌ 配置解析失败: %v\n", err)
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				models.ErrorCodeInvalidConfig,
				"配置格式无效",
				err.Error(),
			),
		}
	}

	fmt.Printf("✅ 配置解析成功: 语言=%s, 模型路径=%s, 特定模型=%s\n",
		config.Language, config.ModelPath, config.SpecificModelFile)

	// 保存配置到文件
	if err := a.saveConfigToFile(&config); err != nil {
		fmt.Printf("⚠️ 配置保存失败: %v\n", err)
		// 不阻止配置更新，但记录警告
	} else {
		fmt.Printf("✅ 配置已成功保存到文件\n")
	}

	// 更新内存中的配置
	a.mu.Lock()
	a.config = &config
	a.mu.Unlock()

	// 更新识别服务配置
	if a.recognitionService != nil {
		a.recognitionService.UpdateConfig(&config)
	}

	fmt.Printf("✅ 配置已更新并保存\n")

	return RecognitionResponse{
		Success: true,
	}
}

// saveConfigToFile 保存配置到文件
func (a *App) saveConfigToFile(config *models.RecognitionConfig) error {
	// 获取用户配置目录和相对路径
	userConfigDir, configSubDir := getUserConfigDirectory()

	// 确保配置目录存在
	var configFile string
	if configSubDir == "" {
		// 用户主目录中的配置
		configFile = filepath.Join(userConfigDir, "user-config.json")
	} else {
		// 项目目录中的配置
		configDir := filepath.Join(userConfigDir, configSubDir)
		if err := os.MkdirAll(configDir, 0755); err != nil {
			return fmt.Errorf("创建配置目录失败: %v", err)
		}
		configFile = filepath.Join(configDir, "user-config.json")
	}
	configData, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化配置失败: %v", err)
	}

	if err := os.WriteFile(configFile, configData, 0644); err != nil {
		return fmt.Errorf("写入配置文件失败: %v", err)
	}

	fmt.Printf("✅ 配置已保存到: %s\n", configFile)
	return nil
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

// SelectModelFile 选择模型文件
func (a *App) SelectModelFile() map[string]interface{} {
	dialogOptions := runtime.OpenDialogOptions{
		Title:            "选择Whisper模型文件",
		DefaultDirectory: "",
		DefaultFilename:  "",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Whisper模型文件",
				Pattern:     "*.bin",
			},
		},
	}

	selectedFile, err := runtime.OpenFileDialog(a.ctx, dialogOptions)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("文件选择失败: %v", err),
		}
	}

	if selectedFile == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件",
		}
	}

	// 检查文件是否存在
	fileInfo, err := os.Stat(selectedFile)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("无法访问文件: %v", err),
		}
	}

	if fileInfo.IsDir() {
		return map[string]interface{}{
			"success": false,
			"error":   "选择的路径是文件夹，请选择模型文件",
		}
	}

	// 验证是否为有效的Whisper模型文件
	fileName := filepath.Base(selectedFile)
	if !a.isValidWhisperModel(fileName) {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("文件 '%s' 不是有效的Whisper模型文件", fileName),
		}
	}

	// 获取文件目录
	modelDir := filepath.Dir(selectedFile)

	return map[string]interface{}{
		"success":    true,
		"filePath":   selectedFile,
		"fileName":   fileName,
		"modelPath":  modelDir,
		"fileSize":   fileInfo.Size(),
		"fileSizeStr": a.formatFileSize(fileInfo.Size()),
	}
}

// isValidWhisperModel 验证是否为有效的Whisper模型文件
func (a *App) isValidWhisperModel(fileName string) bool {
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
		"ggml-*.q4_0.bin",
		"ggml-*.q4_1.bin",
		"ggml-*.q5_0.bin",
		"ggml-*.q5_1.bin",
		"ggml-*.q8_0.bin",

		// 特殊后缀模型
		"*.bin", // 最后的兜底模式：任何.bin文件都可能是模型
	}

	// 精确匹配常见模型
	exactModels := []string{
		"ggml-tiny.bin",
		"ggml-base.bin",
		"ggml-small.bin",
		"ggml-medium.bin",
		"ggml-large.bin",
		"ggml-large-v1.bin",
		"ggml-large-v2.bin",
		"ggml-large-v3.bin",
		"ggml-large-v3-turbo.bin",
		"ggml-tiny.en.bin",
		"ggml-base.en.bin",
		"ggml-small.en.bin",
		"ggml-medium.en.bin",
		"ggml-large.en.bin",
	}

	for _, exactModel := range exactModels {
		if fileName == exactModel {
			return true
		}
	}

	// 模式匹配
	for _, pattern := range validPatterns {
		matched, _ := filepath.Match(pattern, fileName)
		if matched {
			// 额外验证：确保文件名包含模型相关的关键词
			if a.isValidWhisperModelName(fileName) {
				return true
			}
		}
	}

	return false
}

// isValidWhisperModelName 验证文件名是否包含有效的Whisper模型关键词
func (a *App) isValidWhisperModelName(fileName string) bool {
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

// scanModelFiles 扫描模型文件夹
func (a *App) scanModelFiles(directory string) []map[string]interface{} {
	var models []map[string]interface{}

	// 扫描目录中的所有文件
	if entries, err := os.ReadDir(directory); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".bin") {
				fileName := entry.Name()
				if a.isValidWhisperModel(fileName) {
					modelPath := filepath.Join(directory, fileName)
					if fileInfo, err := entry.Info(); err == nil {
						size := fileInfo.Size()
						sizeStr := a.formatFileSize(size)
						models = append(models, map[string]interface{}{
							"name":    fileName,
							"path":    modelPath,
							"type":    "whisper",
							"size":    size,
							"sizeStr": sizeStr,
						})
					}
				}
			}
		}
	}

	// 检查whisper子目录
	whisperDir := filepath.Join(directory, "whisper")
	if dirInfo, err := os.Stat(whisperDir); err == nil && dirInfo.IsDir() {
		if entries, err := os.ReadDir(whisperDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".bin") {
					fileName := entry.Name()
					if a.isValidWhisperModel(fileName) {
						modelPath := filepath.Join(whisperDir, fileName)
						if fileInfo, err := entry.Info(); err == nil {
							size := fileInfo.Size()
							sizeStr := a.formatFileSize(size)
							models = append(models, map[string]interface{}{
								"name":    filepath.Join("whisper", fileName),
								"path":    modelPath,
								"type":    "whisper",
								"size":    size,
								"sizeStr": sizeStr,
							})
						}
					}
				}
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


// GetAITemplates 获取所有可用的AI提示词模板
func (a *App) GetAITemplates() map[string]interface{} {
	templateManager := utils.GetTemplateManager()
	templates := templateManager.GetAllTemplates()

	// 转换为前端友好的格式
	result := make(map[string]interface{})
	for key, template := range templates {
		result[key] = map[string]interface{}{
			"name":        template.Name,
			"description": template.Description,
			"template":    template.Template,
		}
	}

	return map[string]interface{}{
		"success":  true,
		"templates": result,
		"default":  func() string {
			if defaultTemplate, exists := templateManager.GetDefaultTemplate(); exists {
				// 找到默认模板的键
				for key, tmpl := range templates {
					if tmpl.Name == defaultTemplate.Name && tmpl.Description == defaultTemplate.Description {
						return key
					}
				}
			}
			return "basic"
		}(),
	}
}

// FormatAIText 使用指定模板格式化AI文本
func (a *App) FormatAIText(recognitionResultJSON, templateKey string) map[string]interface{} {
	fmt.Printf("🚀 App.FormatAIText: 开始处理AI文本格式化请求\n")
	fmt.Printf("📝 请求的模板类型: '%s'\n", templateKey)
	fmt.Printf("📄 接收到的JSON数据长度: %d 字符\n", len(recognitionResultJSON))

	// 解析识别结果
	var result models.RecognitionResult
	if err := json.Unmarshal([]byte(recognitionResultJSON), &result); err != nil {
		fmt.Printf("❌ App.FormatAIText: JSON解析失败: %v\n", err)
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("识别结果解析失败: %v", err),
		}
	}

	fmt.Printf("✅ App.FormatAIText: JSON解析成功\n")
	fmt.Printf("📊 解析后的识别结果:\n")
	fmt.Printf("   - 文本长度: %d 字符\n", len(result.Text))
	fmt.Printf("   - 段落数量: %d\n", len(result.Segments))
	fmt.Printf("   - 词汇数量: %d\n", len(result.Words))

	// 如果文本不为空，显示前100个字符作为预览
	if len(result.Text) > 0 {
		preview := result.Text
		if len(preview) > 100 {
			preview = preview[:100]
		}
		fmt.Printf("   - 文本预览: %s...\n", preview)
	}

	// 使用模板格式化提示词
	fmt.Printf("🔧 App.FormatAIText: 调用utils.FormatAIPrompt\n")
	formattedPrompt := utils.FormatAIPrompt(&result, templateKey)

	fmt.Printf("✅ App.FormatAIText: 格式化完成，返回提示词长度: %d 字符\n", len(formattedPrompt))

	resultMap := map[string]interface{}{
		"success": true,
		"prompt":  formattedPrompt,
	}

	// 输出返回结果的键和长度信息
	fmt.Printf("📤 App.FormatAIText: 返回结果包含键: %v\n", getMapKeys(resultMap))
	fmt.Printf("🎯 App.FormatAIText: 处理完成\n")

	return resultMap
}

// getMapKeys 获取map的所有键（用于调试）
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// GetTemplateManagerInfo 获取模板管理器信息
func (a *App) GetTemplateManagerInfo() map[string]interface{} {
	templateManager := utils.GetTemplateManager()
	availableKeys := templateManager.GetAvailableTemplateKeys()

	return map[string]interface{}{
		"success":       true,
		"availableKeys": availableKeys,
		"isLoaded":      templateManager != nil,
	}
}

// sendProgressEvent 发送进度事件
func (a *App) sendProgressEvent(eventType string, data interface{}) {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, eventType, data)
	}
}

// OnFileDrop 处理Wails原生文件拖放事件
func (a *App) OnFileDrop(files []string) {
	fmt.Printf("🎯 OnFileDrop: 收到 %d 个文件\n", len(files))

	if len(files) == 0 {
		fmt.Println("❌ OnFileDrop: 没有文件")
		return
	}

	// 只处理第一个文件
	filePath := files[0]
	fmt.Printf("📁 OnFileDrop: 处理文件: %s\n", filePath)

	// 检查文件是否为音频格式
	ext := strings.ToLower(filepath.Ext(filePath))
	audioFormats := map[string]bool{
		".mp3":  true,
		".wav":  true,
		".m4a":  true,
		".aac":  true,
		".ogg":  true,
		".flac": true,
	}

	if !audioFormats[ext] {
		fmt.Printf("❌ OnFileDrop: 不支持的音频格式: %s\n", ext)
		runtime.EventsEmit(a.ctx, "file-drop-error", map[string]interface{}{
			"error":   "不支持的音频格式",
			"message": "请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 格式的音频文件",
			"file":    filePath,
		})
		return
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		fmt.Printf("❌ OnFileDrop: 文件不存在: %s\n", filePath)
		runtime.EventsEmit(a.ctx, "file-drop-error", map[string]interface{}{
			"error":   "文件不存在",
			"message": "拖拽的文件不存在或无法访问",
			"file":    filePath,
		})
		return
	}

	// 获取文件信息
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		fmt.Printf("❌ OnFileDrop: 无法获取文件信息: %v\n", err)
		runtime.EventsEmit(a.ctx, "file-drop-error", map[string]interface{}{
			"error":   "无法获取文件信息",
			"message": err.Error(),
			"file":    filePath,
		})
		return
	}

	// 限制文件大小 (100MB)
	const maxFileSize = 100 * 1024 * 1024
	if fileInfo.Size() > maxFileSize {
		fmt.Printf("❌ OnFileDrop: 文件过大: %d bytes\n", fileInfo.Size())
		runtime.EventsEmit(a.ctx, "file-drop-error", map[string]interface{}{
			"error":   "文件过大",
			"message": "文件大小不能超过 100MB",
			"file":    filePath,
		})
		return
	}

	fmt.Printf("✅ OnFileDrop: 文件验证通过，发送前端处理事件\n")

	// 发送文件拖放成功事件到前端
	fileData := map[string]interface{}{
		"success": true,
		"file": map[string]interface{}{
			"name":         filepath.Base(filePath),
			"path":         filePath,
			"size":         fileInfo.Size(),
			"sizeFormatted": formatFileSize(fileInfo.Size()),
			"extension":    ext,
			"hasPath":      true,
		},
	}

	runtime.EventsEmit(a.ctx, "file-dropped", fileData)
	fmt.Printf("📤 OnFileDrop: 已发送文件拖放事件到前端\n")
}

// formatFileSize 格式化文件大小
func formatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

// createTempFileFromBase64 从Base64数据创建临时文件
func (a *App) createTempFileFromBase64(base64Data string) (string, error) {
	// 解码Base64数据
	fileData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("Base64解码失败: %v", err)
	}

	// 创建临时文件
	tempFile, err := os.CreateTemp("", "audio-*.wav")
	if err != nil {
		return "", fmt.Errorf("创建临时文件失败: %v", err)
	}
	defer tempFile.Close()

	// 写入数据到临时文件
	if _, err := tempFile.Write(fileData); err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("写入临时文件失败: %v", err)
	}

	fmt.Printf("✅ 临时文件创建成功: %s，大小: %d bytes\n", tempFile.Name(), len(fileData))
	return tempFile.Name(), nil
}
