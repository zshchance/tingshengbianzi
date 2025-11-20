package path

import (
	"embed"
)

// PathManager 统一路径管理器
type PathManager struct {
	fs                embed.FS
	appLocator        *AppLocator
	dependencyManager *DependencyManager
	templateManager   *TemplateManager
}

// NewPathManager 创建路径管理器
func NewPathManager(config PathManagerConfig) *PathManager {
	appLocator := NewAppLocator()

	// 创建依赖管理器配置
	depConfig := DependencyManagerConfig{
		FS:           config.FS,
		TargetFinder: NewDefaultTargetFinder(),
	}

	return &PathManager{
		fs:                config.FS,
		appLocator:        appLocator,
		dependencyManager: NewDependencyManager(depConfig),
		templateManager:   NewTemplateManager(),
	}
}

// GetAppRootDirectory 获取应用根目录
func (pm *PathManager) GetAppRootDirectory() string {
	return pm.appLocator.GetAppRootDirectory()
}

// GetExecutableDirectory 获取可执行文件目录
func (pm *PathManager) GetExecutableDirectory() (string, error) {
	return pm.appLocator.GetExecutableDirectory()
}

// ExtractThirdPartyDependencies 提取第三方依赖
func (pm *PathManager) ExtractThirdPartyDependencies() *ExtractionResult {
	return pm.dependencyManager.ExtractAllDependencies()
}

// InitializeTemplates 初始化模板系统
func (pm *PathManager) InitializeTemplates() error {
	return pm.templateManager.InitializeTemplates()
}

// GetDependencyManager 获取依赖管理器
func (pm *PathManager) GetDependencyManager() *DependencyManager {
	return pm.dependencyManager
}

// GetTemplateManager 获取模板管理器
func (pm *PathManager) GetTemplateManager() *TemplateManager {
	return pm.templateManager
}

// GetAppLocator 获取应用定位器
func (pm *PathManager) GetAppLocator() *AppLocator {
	return pm.appLocator
}

// IsAppBundleEnvironment 检查是否在.app包环境中
func (pm *PathManager) IsAppBundleEnvironment() (bool, error) {
	exeDir, err := pm.appLocator.GetExecutableDirectory()
	if err != nil {
		return false, err
	}
	return pm.appLocator.IsAppBundleEnvironment(exeDir), nil
}

// GetThirdPartyTargetDirectory 获取第三方依赖目标目录
func (pm *PathManager) GetThirdPartyTargetDirectory() (string, error) {
	return pm.dependencyManager.GetThirdPartyTargetDirectory()
}

// GetTemplatePath 获取模板文件路径
func (pm *PathManager) GetTemplatePath() string {
	return pm.templateManager.ResolveTemplatePath()
}