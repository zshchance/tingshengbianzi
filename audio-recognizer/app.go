package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"tingshengbianzi/backend/config"
	"tingshengbianzi/backend/models"
	"tingshengbianzi/backend/path"
	"tingshengbianzi/backend/recognition"
	"tingshengbianzi/backend/services"
	"tingshengbianzi/backend/utils"
)

// App struct
type App struct {
	ctx         context.Context
	recognitionService recognition.RecognitionService
	config      *models.RecognitionConfig
	isRecognizing bool
	mu          sync.RWMutex
	thirdPartyFS embed.FS
	configManager *config.ConfigManager
	modelService  *services.ModelService
	audioService  *services.AudioService
	exportService *services.ExportService
	pathManager   *path.PathManager // 新增路径管理器
	appStatusService *services.AppStatusService // 新增应用状态服务
	versionService  *services.VersionService    // 新增版本信息服务
}

// NewApp creates a new App application struct
func NewApp(thirdParty embed.FS) *App {
	// 创建配置管理器
	configManager := config.NewConfigManager(thirdParty)

	// 加载默认配置
	config := configManager.LoadDefaultConfig()

	// 创建路径管理器
	pathManager := path.NewPathManager(path.PathManagerConfig{
		FS: thirdParty,
	})

	// 创建导出服务
	exportService := services.NewExportService()

	return &App{
		config:       config,
		thirdPartyFS: thirdParty,
		configManager: configManager,
		pathManager:  pathManager,
		exportService: exportService,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 初始化日志系统
	utils.InitLogger()
	utils.LogInfo("=== 听声辨字应用程序启动 ===")
	utils.LogInfo("应用上下文初始化完成")

	// 初始化模型服务
	a.modelService = services.NewModelService(ctx)
	utils.LogInfo("模型服务初始化完成")

	// 初始化音频服务
	audioService, err := services.NewAudioService(ctx)
	if err != nil {
		fmt.Printf("初始化音频服务失败: %v\n", err)
		utils.LogError("初始化音频服务失败: %v", err)
	} else {
		a.audioService = audioService
		utils.LogInfo("音频服务初始化成功")
	}

	// 初始化版本信息服务
	a.versionService = services.NewVersionService()
	utils.LogInfo("版本信息服务初始化完成")

	// 延迟初始化应用状态服务，等识别服务初始化后再创建
	// 应用状态服务将在识别服务初始化后创建

	// 提取第三方依赖到本地文件系统
	result := a.pathManager.ExtractThirdPartyDependencies()
	if !result.Success {
		fmt.Printf("提取第三方依赖失败，成功: %d，失败: %d\n",
			result.ExtractedCount, len(result.FailedFiles))
		utils.LogError("部分第三方依赖提取失败")
	} else {
		utils.LogInfo("第三方依赖提取成功")
	}

	// 初始化AI提示词模板系统
	if err := a.pathManager.InitializeTemplates(); err != nil {
		fmt.Printf("初始化AI模板系统失败: %v\n", err)
		utils.LogError("初始化AI模板系统失败: %v", err)
	} else {
		utils.LogInfo("AI模板系统初始化成功")
	}

	// 初始化语音识别服务
	if err := a.initializeVoskService(); err != nil {
		fmt.Printf("初始化Vosk服务失败: %v\n", err)
		utils.LogError("初始化语音识别服务失败: %v", err)
	} else {
		utils.LogInfo("语音识别服务初始化成功")
	}

	utils.LogInfo("应用程序启动完成")
}



// initializeVoskService 初始化语音识别服务
func (a *App) initializeVoskService() error {
	// 尝试使用Whisper服务
	service, err := recognition.NewWhisperService(a.config)
	if err != nil {
		fmt.Printf("Whisper服务初始化失败: %v\n", err)

		return nil
	}

	a.recognitionService = service

	// 现在初始化应用状态服务
	a.appStatusService = services.NewAppStatusServiceWithConfig(a.modelService, a.recognitionService, a.config)
	utils.LogInfo("应用状态服务初始化完成")

	return nil
}

// GetAppRootDirectory 获取应用根目录（委托给路径管理器）
func (a *App) GetAppRootDirectory() string {
	return a.pathManager.GetAppRootDirectory()
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

	// 🔧 重新加载最新配置（确保每次识别都使用最新设置）
	fmt.Printf("🔄 重新加载配置文件以获取最新设置...\n")
	latestConfig := a.configManager.LoadDefaultConfig()

	// 更新内存中的配置
	a.config = latestConfig
	// 更新识别服务的配置
	a.recognitionService.UpdateConfig(latestConfig)
	fmt.Printf("✅ 已重新加载配置: 语言=%s, 模型路径=%s, 特定模型=%s\n",
		latestConfig.Language, latestConfig.ModelPath, latestConfig.SpecificModelFile)

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

		if request.SpecificModelFile != "" {
			// 从用户指定的模型文件路径中提取目录，这会覆盖其他路径设置
			modelDir := filepath.Dir(request.SpecificModelFile)
			modelPath = modelDir
			fmt.Printf("使用用户指定模型的目录: %s\n", modelPath)
		}

		fmt.Printf("🔄 最终使用的模型路径: %s\n", modelPath)
		fmt.Printf("🔄 识别语言: %s\n", language)

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

	a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
		Status:     "正在准备音频文件...",
		Percentage: 0,
	})

	result, err := a.executeRecognition(request, language)

	if err != nil {
		a.handleRecognitionError(err)
		return
	}

	a.handleRecognitionSuccess(result)
}

// executeRecognition 执行识别的核心逻辑
func (a *App) executeRecognition(request RecognitionRequest, language string) (*models.RecognitionResult, error) {
	var filePath string
	var cleanup func()

	// 处理拖拽文件（Base64数据）
	if request.FileData != "" {
		tempFile, err := a.handleDragDropFile(request.FileData)
		if err != nil {
			return nil, err
		}
		filePath = tempFile
		cleanup = func() { os.Remove(tempFile) }
	} else {
		filePath = request.FilePath
	}

	if cleanup != nil {
		defer cleanup()
	}

	// 执行识别
	if request.SpecificModelFile != "" {
		return a.recognitionService.RecognizeFileWithModel(
			filePath,
			language,
			request.SpecificModelFile,
			a.sendProgressEventWithCallback(),
		)
	}

	return a.recognitionService.RecognizeFile(
		filePath,
		language,
		a.sendProgressEventWithCallback(),
	)
}

// handleDragDropFile 处理拖拽文件
func (a *App) handleDragDropFile(base64Data string) (string, error) {
	a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
		Status:     "正在处理拖拽文件...",
		Percentage: 5,
	})

	tempFile, err := a.createTempFileFromBase64(base64Data)
	if err != nil {
		return "", fmt.Errorf("拖拽文件处理失败: %v", err)
	}

	a.sendProgressEvent("recognition_progress", &models.RecognitionProgress{
		Status:     "临时文件创建完成，开始识别...",
		Percentage: 10,
	})

	return tempFile, nil
}

// handleRecognitionError 处理识别错误
func (a *App) handleRecognitionError(err error) {
	errorMsg := models.NewRecognitionError(models.ErrorCodeRecognitionFailed, "语音识别失败", err.Error())
	a.sendProgressEvent("recognition_error", errorMsg)
	a.sendProgressEvent("recognition_complete", RecognitionResponse{
		Success: false,
		Error:   errorMsg,
	})
}

// handleRecognitionSuccess 处理识别成功
func (a *App) handleRecognitionSuccess(result *models.RecognitionResult) {
	// 发送结果事件
	a.sendProgressEvent("recognition_result", result)

	// 调试：检查即将发送到前端的识别结果
	a.debugRecognitionResult(result)

	a.sendProgressEvent("recognition_complete", RecognitionResponse{
		Success: true,
		Result:  result,
	})
}

// debugRecognitionResult 调试识别结果
func (a *App) debugRecognitionResult(result *models.RecognitionResult) {
	fmt.Printf("🔍 即将发送到前端的识别结果:\n")
	fmt.Printf("   result.Text长度: %d\n", len(result.Text))
	fmt.Printf("   result.Segments数量: %d\n", len(result.Segments))

	if len(result.Text) > 0 {
		previewLen := 100
		if len(result.Text) < previewLen {
			previewLen = len(result.Text)
		}
		fmt.Printf("   result.Text预览: %s\n", result.Text[:previewLen])
	}
}

// sendProgressEventWithCallback 返回进度回调函数
func (a *App) sendProgressEventWithCallback() func(*models.RecognitionProgress) {
	return func(progress *models.RecognitionProgress) {
		a.sendProgressEvent("recognition_progress", progress)
	}
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

// GetApplicationStatus 获取应用状态（包括模型状态和版本信息）
func (a *App) GetApplicationStatus() map[string]interface{} {
	a.mu.RLock()
	defer a.mu.RUnlock()

	// 使用应用状态服务获取完整状态
	if a.appStatusService != nil {
		// 更新配置到状态服务
		a.appStatusService.UpdateConfig(a.config)

		return a.appStatusService.GetApplicationStatus(a.isRecognizing)
	}

	// 如果应用状态服务未初始化，返回基本状态
	return map[string]interface{}{
		"success": false,
		"error":   "应用状态服务未初始化",
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

	// 验证并修复模型路径
	a.configManager.ValidateAndFixModelPath(&config)

	// 保存配置到文件
	if err := a.configManager.SaveConfigToFile(&config); err != nil {
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
	if a.modelService == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "模型服务未初始化",
		}
	}
	return a.modelService.SelectModelDirectory()
}

// SelectModelFile 选择模型文件
func (a *App) SelectModelFile() map[string]interface{} {
	if a.modelService == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "模型服务未初始化",
		}
	}
	return a.modelService.SelectModelFile()
}


// GetModelInfo 获取模型信息
func (a *App) GetModelInfo(directory string) map[string]interface{} {
	if a.modelService == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "模型服务未初始化",
		}
	}
	return a.modelService.GetModelInfo(directory)
}

// SelectAudioFile 选择音频文件
func (a *App) SelectAudioFile() map[string]interface{} {
	if a.audioService == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "音频服务未初始化",
		}
	}
	return a.audioService.SelectAudioFile()
}

// GetAudioDuration 获取音频文件的真实时长
func (a *App) GetAudioDuration(filePath string) map[string]interface{} {
	if a.audioService == nil {
		return map[string]interface{}{
			"success": false,
			"error":   "音频服务未初始化",
		}
	}
	return a.audioService.GetAudioDuration(filePath)
}

// ExportResult 导出识别结果
func (a *App) ExportResult(resultJSON, format, outputPath string) RecognitionResponse {
	if a.exportService == nil {
		return RecognitionResponse{
			Success: false,
			Error: models.NewRecognitionError(
				"SERVICE_NOT_INITIALIZED",
				"导出服务未初始化",
				"",
			),
		}
	}

	err := a.exportService.ExportResult(resultJSON, format, outputPath)
	if err != nil {
		return RecognitionResponse{
			Success: false,
			Error:   err,
		}
	}

	return RecognitionResponse{
		Success: true,
	}
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


// FormatAIText 接口已移除 - AI优化功能暂时不可用

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
	if a.audioService == nil {
		runtime.EventsEmit(a.ctx, "file-drop-error", map[string]interface{}{
			"error":   "音频服务未初始化",
			"message": "音频服务未初始化，无法处理文件拖放",
			"file":    "",
		})
		return
	}
	a.audioService.OnFileDrop(files)
}



// createTempFileFromBase64 从Base64数据创建临时文件
func (a *App) createTempFileFromBase64(base64Data string) (string, error) {
	if a.audioService == nil {
		return "", fmt.Errorf("音频服务未初始化")
	}
	return a.audioService.CreateTempFileFromBase64(base64Data)
}
