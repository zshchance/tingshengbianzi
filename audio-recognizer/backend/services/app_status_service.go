package services

import (
	"fmt"
	"strings"
	"sync"

	"tingshengbianzi/backend/models"
	"tingshengbianzi/backend/recognition"
)

// AppStatusService 应用状态服务
type AppStatusService struct {
	modelService      *ModelService
	recognitionService recognition.RecognitionService
	config           *models.RecognitionConfig
	modelsLock        sync.RWMutex
}

// NewAppStatusService 创建应用状态服务
func NewAppStatusService(modelService *ModelService, recognitionService recognition.RecognitionService) *AppStatusService {
	return &AppStatusService{
		modelService:      modelService,
		recognitionService: recognitionService,
	}
}

// NewAppStatusServiceWithConfig 创建带配置的应用状态服务
func NewAppStatusServiceWithConfig(modelService *ModelService, recognitionService recognition.RecognitionService, config *models.RecognitionConfig) *AppStatusService {
	return &AppStatusService{
		modelService:      modelService,
		recognitionService: recognitionService,
		config:           config,
	}
}

// UpdateConfig 更新配置
func (s *AppStatusService) UpdateConfig(config *models.RecognitionConfig) {
	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()
	s.config = config
}

// ApplicationStatus 应用状态信息
type ApplicationStatus struct {
	AppStatus   string                 `json:"appStatus"`
	ModelStatus map[string]interface{} `json:"modelStatus"`
	VersionInfo map[string]interface{} `json:"versionInfo"`
	ServiceReady bool                  `json:"serviceReady"`
	IsRecognizing  bool                 `json:"isRecognizing"`
}

// GetApplicationStatus 获取完整的应用状态
func (s *AppStatusService) GetApplicationStatus(isRecognizing bool) map[string]interface{} {
	return map[string]interface{}{
		"success": true,
		"status": ApplicationStatus{
			AppStatus:     s.getApplicationStatus(isRecognizing),
			ModelStatus:   s.getModelStatus(),
			VersionInfo:   s.getVersionInfo(),
			ServiceReady:  s.recognitionService != nil,
			IsRecognizing: isRecognizing,
		},
	}
}

// getApplicationStatus 获取应用运行状态
func (s *AppStatusService) getApplicationStatus(isRecognizing bool) string {
	if isRecognizing {
		return "识别中"
	}
	if s.recognitionService == nil {
		return "未初始化"
	}
	return "就绪"
}

// getModelStatus 获取模型状态
func (s *AppStatusService) getModelStatus() map[string]interface{} {
	if s.recognitionService == nil {
		return map[string]interface{}{
			"status":     "未初始化",
			"statusText": "语音识别服务未初始化",
			"isLoaded":   false,
			"supportedLanguages": []string{},
		}
	}

	// 获取模型目录信息和可用模型
	modelPath := s.getModelPath()
	specificModel := s.getSpecificModel()
	availableModels := s.getAvailableModels(modelPath)

	// 从可用模型提取支持的语言
	supportedLanguages := s.getSupportedLanguagesFromModels(availableModels)

	// 获取当前已加载的语言模型（现在是supportedLanguages）
	currentLoadedLanguages := s.getLoadedModels()

	// 确定状态 - 主要基于可用模型而不是实际已加载的模型
	status := "未配置"
	statusText := "未配置模型路径"

	if len(availableModels) > 0 {
		if len(supportedLanguages) > 0 {
			if supportedLanguages[0] == "multilingual" {
				status = "可配置"
				statusText = fmt.Sprintf("检测到多语言模型: %s", availableModels[0]["name"])
			} else {
				status = "可配置"
				statusText = fmt.Sprintf("检测到支持 %d 种语言的模型: %v", len(supportedLanguages), supportedLanguages)
			}
		} else {
			status = "可配置"
			statusText = fmt.Sprintf("检测到 %d 个模型文件", len(availableModels))
		}
	} else if specificModel != "" {
		status = "可配置"
		statusText = fmt.Sprintf("已指定模型: %s，需要加载", specificModel)
	} else if modelPath != "" {
		status = "路径已配置"
		statusText = "模型路径已配置，但未检测到可用模型"
	}

	// 如果有加载的语言模型，更新状态并使用supportedLanguages
	if len(currentLoadedLanguages) > 0 {
		status = "已加载"
		supportedLanguages = currentLoadedLanguages // 使用实际加载的语言作为支持的语言
		if len(supportedLanguages) > 1 || supportedLanguages[0] == "multilingual" {
			statusText = fmt.Sprintf("多语言模型已加载 (支持 %d 种语言)", len(supportedLanguages))
		} else {
			statusText = fmt.Sprintf("已加载 %d 个语言模型: %v", len(supportedLanguages), supportedLanguages)
		}
	}

	return map[string]interface{}{
		"status":     status,
		"statusText": statusText,
		"isLoaded":   len(supportedLanguages) > 0,
		"supportedLanguages": supportedLanguages, // 重命名为supportedLanguages
		"modelPath":  modelPath,
		"specificModel": specificModel,
		"availableModels": availableModels,
		"totalAvailable": len(availableModels),
	}
}

// getSupportedLanguagesFromModels 从可用模型列表中提取支持的语言
func (s *AppStatusService) getSupportedLanguagesFromModels(availableModels []map[string]interface{}) []string {
	supportedLanguages := []string{}

	for _, model := range availableModels {
		if modelName, ok := model["name"].(string); ok {
			lang := s.extractLanguageFromModelName(modelName)
			if lang != "" {
				// 避免重复添加
				found := false
				for _, existing := range supportedLanguages {
					if existing == lang {
						found = true
						break
					}
				}
				if !found {
					supportedLanguages = append(supportedLanguages, lang)
				}
			}
		}
	}

	return supportedLanguages
}

// extractLanguageFromModelName 从模型文件名中提取支持的语言
func (s *AppStatusService) extractLanguageFromModelName(modelName string) string {
	// 标准化模型名称为小写
	name := strings.ToLower(modelName)

	// 根据模型文件名推断支持的语言
	switch {
	case strings.Contains(name, "large") || strings.Contains(name, "medium") || strings.Contains(name, "small"):
		// Whisper的large、medium、small模型都是多语言的
		return "multilingual"
	case strings.Contains(name, "turbo"):
		// turbo模型也是多语言的
		return "multilingual"
	case strings.Contains(name, "chinese") || strings.Contains(name, "zh") || strings.Contains(name, "cn"):
		return "zh-CN"
	case strings.Contains(name, "english") || strings.Contains(name, "en") || strings.Contains(name, "base"):
		return "en-US"
	case strings.Contains(name, "japanese") || strings.Contains(name, "ja") || strings.Contains(name, "jp"):
		return "ja"
	case strings.Contains(name, "korean") || strings.Contains(name, "ko") || strings.Contains(name, "kr"):
		return "ko"
	case strings.Contains(name, "french") || strings.Contains(name, "fr"):
		return "fr-FR"
	case strings.Contains(name, "german") || strings.Contains(name, "de"):
		return "de-DE"
	case strings.Contains(name, "spanish") || strings.Contains(name, "es"):
		return "es-ES"
	case strings.Contains(name, "italian") || strings.Contains(name, "it"):
		return "it-IT"
	case strings.Contains(name, "portuguese") || strings.Contains(name, "pt"):
		return "pt-BR"
	case strings.Contains(name, "russian") || strings.Contains(name, "ru"):
		return "ru-RU"
	case strings.Contains(name, "arabic") || strings.Contains(name, "ar"):
		return "ar-SA"
	case strings.Contains(name, "hindi") || strings.Contains(name, "hi"):
		return "hi-IN"
	case strings.Contains(name, "multilingual") || strings.Contains(name, "multi"):
		// 多语言模型，返回主要语言列表
		return "multilingual"
	default:
		// 如果无法确定，返回空字符串
		return ""
	}
}

// getLoadedModels 获取实际已加载的模型列表
func (s *AppStatusService) getLoadedModels() []string {
	if s.recognitionService == nil {
		return []string{}
	}

	// 检查常用语言的模型是否已加载
	commonLanguages := []string{"zh-CN", "en-US", "ja", "ko"}
	loadedModels := []string{}

	for _, lang := range commonLanguages {
		if s.recognitionService.IsModelLoaded(lang) {
			loadedModels = append(loadedModels, lang)
		}
	}

	// 也可以检查更多语言
	allLanguages := s.recognitionService.GetSupportedLanguages()
	for _, lang := range allLanguages {
		if s.recognitionService.IsModelLoaded(lang) {
			// 避免重复添加
			found := false
			for _, loaded := range loadedModels {
				if loaded == lang {
					found = true
					break
				}
			}
			if !found {
				loadedModels = append(loadedModels, lang)
			}
		}
	}

	return loadedModels
}

// getModelPath 获取当前模型路径
func (s *AppStatusService) getModelPath() string {
	s.modelsLock.RLock()
	defer s.modelsLock.RUnlock()

	if s.config != nil {
		return s.config.ModelPath
	}
	return ""
}

// getSpecificModel 获取当前指定的具体模型
func (s *AppStatusService) getSpecificModel() string {
	s.modelsLock.RLock()
	defer s.modelsLock.RUnlock()

	if s.config != nil {
		return s.config.SpecificModelFile
	}
	return ""
}

// getAvailableModels 获取可用的模型列表
func (s *AppStatusService) getAvailableModels(modelPath string) []map[string]interface{} {
	if s.modelService == nil || modelPath == "" {
		return []map[string]interface{}{}
	}

	// 使用模型服务获取模型信息
	modelInfoResult := s.modelService.GetModelInfo(modelPath)

	if modelInfoResult != nil {
		if success, ok := modelInfoResult["success"].(bool); ok && success {
			if models, ok := modelInfoResult["models"].([]map[string]interface{}); ok {
				return models
			}
		}
	}

	return []map[string]interface{}{}
}


// getVersionInfo 获取版本信息
func (s *AppStatusService) getVersionInfo() map[string]interface{} {
	// 使用配置服务获取版本信息
	configService := NewConfigService()

	var version, appName, fullName string
	var buildDate, buildInfo string

	if configService != nil && (configService.IsConfigLoaded() || configService.LoadConfig() == nil) {
		version = configService.GetVersion()
		appName = configService.GetAppName()
		fullName = configService.GetFullName()
	} else {
		// 如果配置加载失败，使用默认值
		version = "2.1.0"
		appName = "听声辨字"
		fullName = fmt.Sprintf("%s v%s", appName, version)
	}

	// 构建信息仍然使用硬编码（这些信息通常在构建时确定）
	buildDate = "2024-11-20"
	buildInfo = "Wails v2"

	return map[string]interface{}{
		"version":     version,
		"buildDate":   buildDate,
		"buildInfo":   buildInfo,
		"appName":     appName,
		"fullName":    fullName,
	}
}

// UpdateRecognitionService 更新识别服务引用
func (s *AppStatusService) UpdateRecognitionService(service recognition.RecognitionService) {
	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()
	s.recognitionService = service
}

// UpdateModelService 更新模型服务引用
func (s *AppStatusService) UpdateModelService(service *ModelService) {
	s.modelsLock.Lock()
	defer s.modelsLock.Unlock()
	s.modelService = service
}

// GetModelStatusSummary 获取模型状态摘要
func (s *AppStatusService) GetModelStatusSummary() map[string]interface{} {
	supportedLanguages := s.getLoadedModels()
	availableModels := s.getAvailableModels(s.getModelPath())

	return map[string]interface{}{
		"supportedCount": len(supportedLanguages), // 重命名
		"availableCount": len(availableModels),
		"hasLoaded":      len(supportedLanguages) > 0,
		"hasAvailable":   len(availableModels) > 0,
		"supportedLanguages": supportedLanguages, // 重命名
	}
}