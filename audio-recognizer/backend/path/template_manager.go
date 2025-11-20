package path

import (
	"fmt"
	"os"
	"path/filepath"

	"tingshengbianzi/backend/config"
)

// TemplateManager 模板管理器
type TemplateManager struct {
	appLocator   *AppLocator
	targetFinder TargetFinder
}

// NewTemplateManager 创建模板管理器
func NewTemplateManager() *TemplateManager {
	return &TemplateManager{
		appLocator:   NewAppLocator(),
		targetFinder: NewDefaultTargetFinder(),
	}
}

// ResolveTemplatePath 解析模板文件路径
func (tm *TemplateManager) ResolveTemplatePath() string {
	userConfigDir, configSubDir := config.GetUserConfigDirectory()

	if configSubDir == "" {
		// 用户主目录中的模板
		return filepath.Join(userConfigDir, "templates.json")
	}

	// 项目目录中的模板
	return filepath.Join(userConfigDir, configSubDir, "templates.json")
}

// EnsureTemplateFileExists 确保模板文件存在
func (tm *TemplateManager) EnsureTemplateFileExists(templatePath string) error {
	// 如果文件已存在，直接返回
	if _, err := os.Stat(templatePath); err == nil {
		return nil
	}

	// 尝试复制内置模板
	builtinTemplatePath := filepath.Join(tm.appLocator.GetAppRootDirectory(), "config", "templates.json")
	return tm.copyBuiltinTemplate(builtinTemplatePath, templatePath)
}

// copyBuiltinTemplate 复制内置模板
func (tm *TemplateManager) copyBuiltinTemplate(builtinPath, targetPath string) error {
	builtinData, err := os.ReadFile(builtinPath)
	if err != nil {
		return fmt.Errorf("读取内置模板失败: %v", err)
	}

	// 确保目标目录存在
	targetDir := filepath.Dir(targetPath)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("创建目标目录失败: %v", err)
	}

	if err := os.WriteFile(targetPath, builtinData, 0644); err != nil {
		return fmt.Errorf("复制模板文件失败: %v", err)
	}

	fmt.Printf("✅ 已复制内置模板到用户目录: %s\n", targetPath)
	return nil
}

// GetTemplateDirectory 获取模板目录路径
func (tm *TemplateManager) GetTemplateDirectory() (string, error) {
	if tm.targetFinder != nil {
		return tm.targetFinder.FindTemplateTargetDirectory()
	}

	// 默认逻辑
	appRoot := tm.appLocator.GetAppRootDirectory()
	return filepath.Join(appRoot, "config"), nil
}

// InitializeTemplates 初始化模板系统
func (tm *TemplateManager) InitializeTemplates() error {
	templatePath := tm.ResolveTemplatePath()

	if err := tm.EnsureTemplateFileExists(templatePath); err != nil {
		return fmt.Errorf("确保模板文件存在失败: %v", err)
	}

	fmt.Printf("✅ AI模板系统初始化成功\n")
	return nil
}