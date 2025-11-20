package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	sysruntime "runtime"
	"strings"

	"tingshengbianzi/backend/models"
)

// ApplicationType 定义应用程序运行类型
type ApplicationType int

const (
	DevelopmentApp ApplicationType = iota // 开发环境
	PortableApp                           // 便携版（未安装的.app包）
	InstalledApp                          // 安装版（已安装应用）
)

// ConfigManager 配置管理器
type ConfigManager struct {
	thirdPartyFS interface{} // embed.FS
}

// NewConfigManager 创建配置管理器
func NewConfigManager(thirdPartyFS interface{}) *ConfigManager {
	return &ConfigManager{
		thirdPartyFS: thirdPartyFS,
	}
}

// LoadDefaultConfig 加载默认配置
func (cm *ConfigManager) LoadDefaultConfig() *models.RecognitionConfig {
	// 获取用户配置目录和相对路径
	userConfigDir, configSubDir := GetUserConfigDirectory()

	// 根据环境类型确定默认模型路径
	appType := getApplicationType()
	defaultModelPath := getDefaultModelPath(appType)

	defaultConfig := &models.RecognitionConfig{
		Language:              "zh-CN",
		ModelPath:             defaultModelPath,
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
	appRoot := getAppRootDirectory()
	fmt.Printf("🎯 应用根目录: %s\n", appRoot)
	fmt.Printf("📍 默认模型路径: %s\n", defaultConfig.ModelPath)

	if configData, err := os.ReadFile(configFile); err == nil {
		fmt.Printf("📖 找到配置文件，开始解析: %s\n", configFile)
		var userConfig models.RecognitionConfig
		if json.Unmarshal(configData, &userConfig) == nil {
			fmt.Printf("✅ 配置文件解析成功\n")
			fmt.Printf("📝 用户配置模型路径: %s\n", userConfig.ModelPath)
			fmt.Printf("📝 用户配置模型文件: %s\n", userConfig.SpecificModelFile)

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

			fmt.Printf("✅ 已加载用户配置: 模型路径=%s, 模型文件=%s\n",
				defaultConfig.ModelPath, defaultConfig.SpecificModelFile)
		} else {
			fmt.Printf("⚠️ 配置文件格式错误，使用默认配置: %s\n", configFile)
		}
	} else {
		fmt.Printf("ℹ️ 未找到用户配置文件，使用默认配置 (错误: %v)\n", err)
	}

	// 验证并修复模型路径
	validateAndFixModelPath(defaultConfig)

	fmt.Printf("🎯 最终配置模型路径: %s\n", defaultConfig.ModelPath)
	return defaultConfig
}

// SaveConfigToFile 保存配置到文件
func (cm *ConfigManager) SaveConfigToFile(config *models.RecognitionConfig) error {
	// 获取用户配置目录和相对路径
	userConfigDir, configSubDir := GetUserConfigDirectory()

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

// ValidateAndFixModelPath 验证并修复模型路径
func (cm *ConfigManager) ValidateAndFixModelPath(config *models.RecognitionConfig) {
	validateAndFixModelPath(config)
}

// GetUserConfigDirectory 获取用户配置目录（根据运行环境智能选择）
func GetUserConfigDirectory() (string, string) {
	appType := getApplicationType()

	switch appType {
	case DevelopmentApp:
		return getDevelopmentConfigDirectory()
	case PortableApp:
		return getPortableConfigDirectory()
	case InstalledApp:
		return getInstalledConfigDirectory()
	default:
		// 兜底策略：使用便携版方案
		return getPortableConfigDirectory()
	}
}

// getApplicationType 检测应用程序运行类型
func getApplicationType() ApplicationType {
	exePath, err := os.Executable()
	if err != nil {
		fmt.Printf("⚠️ 无法获取可执行文件路径，默认为开发环境: %v\n", err)
		return DevelopmentApp
	}

	exeDir := filepath.Dir(exePath)

	// 优先检测是否在开发环境（放在最前面，避免误判）
	if isDevelopmentEnvironment(exeDir) {
		fmt.Printf("🔧 检测到开发环境\n")
		return DevelopmentApp
	}

	// 检测是否在.app包中（无论是便携版还是安装版）
	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		if isInstalledApplication(exeDir) {
			fmt.Printf("🏠 检测到已安装应用\n")
			return InstalledApp
		} else {
			fmt.Printf("📱 检测到便携版应用（.app包）\n")
			return PortableApp
		}
	}

	// 默认作为便携版处理
	fmt.Printf("❓ 未知环境，默认作为便携版处理\n")
	return PortableApp
}

// isDevelopmentEnvironment 检测是否为开发环境
func isDevelopmentEnvironment(exeDir string) bool {
	// 1. 优先检查是否在临时构建目录中（wails dev的特征）
	if strings.Contains(exeDir, "build") || strings.Contains(exeDir, "bin") {
		// 对于Wails dev的.app结构，需要向上查找更多层级
		// 从 .../build/bin/tingshengbianzi.app/Contents/MacOS 向上查找
		currentDir := exeDir
		for i := 0; i < 8; i++ { // 增加查找层级以处理.app结构
			if strings.Contains(currentDir, "build") {
				parentDir := filepath.Dir(currentDir)
				if isProjectDirectory(parentDir) {
					fmt.Printf("🎯 在构建目录中检测到项目根目录: %s\n", parentDir)
					return true
				}
			}
			currentDir = filepath.Dir(currentDir)
			if currentDir == "/" || currentDir == "." {
				break
			}
		}
	}

	// 2. 检查当前目录或父目录是否有项目标志文件
	return isProjectDirectory(exeDir)
}

// isProjectDirectory 检查是否为项目目录（包含项目标志文件）
func isProjectDirectory(dir string) bool {
	searchDir := dir
	for i := 0; i < 6; i++ { // 最多向上查找6级目录
		projectMarkers := []string{"wails.json", "go.mod", "main.go", "app.go"}
		for _, marker := range projectMarkers {
			if _, err := os.Stat(filepath.Join(searchDir, marker)); err == nil {
				// 找到项目标志文件，还需要验证这个不是在Applications目录中
				if !strings.Contains(searchDir, "/Applications/") {
					return true
				}
			}
		}
		searchDir = filepath.Dir(searchDir)
	}
	return false
}

// isInstalledApplication 检测是否为已安装应用
func isInstalledApplication(exeDir string) bool {
	// 检查是否在标准应用程序目录中
	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		return strings.Contains(exeDir, "/Applications/")
	}
	return false
}

// getDevelopmentConfigDirectory 获取开发环境配置目录
func getDevelopmentConfigDirectory() (string, string) {
	appRoot := getAppRootDirectory()

	// 优先使用项目根目录的config目录
	projectConfigDir := filepath.Join(appRoot, "config")
	if _, err := os.Stat(projectConfigDir); err == nil {
		fmt.Printf("🎯 使用开发环境配置目录: %s\n", projectConfigDir)
		return appRoot, "config"
	}

	// 创建config目录
	if err := os.MkdirAll(projectConfigDir, 0755); err != nil {
		fmt.Printf("⚠️ 创建开发配置目录失败，回退到应用目录: %v\n", err)
		return appRoot, ""
	}

	fmt.Printf("✅ 创建开发环境配置目录: %s\n", projectConfigDir)
	return appRoot, "config"
}

// getPortableConfigDirectory 获取便携版配置目录
func getPortableConfigDirectory() (string, string) {
	// 使用系统临时目录
	tempDir := os.TempDir()
	appName := "audio-recognizer"
	configBaseDir := filepath.Join(tempDir, appName)
	configDir := filepath.Join(configBaseDir, "config")

	// 创建配置目录
	if err := os.MkdirAll(configDir, 0755); err != nil {
		fmt.Printf("❌ 创建便携版配置目录失败: %v\n", err)
		// 兜底：使用当前用户目录
		homeDir, _ := os.UserHomeDir()
		fallbackDir := filepath.Join(homeDir, "."+appName)
		return fallbackDir, ""
	}

	fmt.Printf("📱 使用便携版配置目录: %s\n", configDir)
	return configBaseDir, "config"
}

// getInstalledConfigDirectory 获取安装版配置目录
func getInstalledConfigDirectory() (string, string) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Printf("❌ 无法获取用户主目录: %v\n", err)
		// 回退到便携版方案
		return getPortableConfigDirectory()
	}

	var configBaseDir string

	// 根据操作系统确定配置目录
	switch sysruntime.GOOS {
	case "darwin":
		// macOS 使用 ~/Library/Application Support
		configBaseDir = filepath.Join(homeDir, "Library", "Application Support", "audio-recognizer")
	case "windows":
		// Windows 使用 %APPDATA%
		appData := os.Getenv("APPDATA")
		if appData == "" {
			// 回退到用户主目录
			configBaseDir = filepath.Join(homeDir, "AppData", "Roaming", "audio-recognizer")
		} else {
			configBaseDir = filepath.Join(appData, "audio-recognizer")
		}
	case "linux":
		// Linux 使用 ~/.config
		configBaseDir = filepath.Join(homeDir, ".config", "audio-recognizer")
	default:
		// 未知系统，使用用户主目录
		configBaseDir = filepath.Join(homeDir, ".audio-recognizer")
	}

	configDir := filepath.Join(configBaseDir, "config")

	// 创建配置目录
	if err := os.MkdirAll(configDir, 0755); err != nil {
		fmt.Printf("❌ 创建安装版配置目录失败: %v\n", err)
		// 回退到便携版方案
		return getPortableConfigDirectory()
	}

	fmt.Printf("🏠 使用安装版配置目录: %s\n", configDir)
	return configBaseDir, "config"
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

// getDefaultModelPath 根据应用类型获取默认模型路径
func getDefaultModelPath(appType ApplicationType) string {
	switch appType {
	case DevelopmentApp:
		// 开发环境：使用项目根目录下的models目录
		appRoot := getAppRootDirectory()
		return filepath.Join(appRoot, "models")
	case PortableApp:
		// 便携版：使用临时目录下的models目录
		tempDir := os.TempDir()
		return filepath.Join(tempDir, "audio-recognizer", "models")
	case InstalledApp:
		// 安装版：使用用户数据目录下的models目录（与配置目录保持一致）
		homeDir, err := os.UserHomeDir()
		if err != nil {
			// 回退方案
			tempDir := os.TempDir()
			return filepath.Join(tempDir, "audio-recognizer", "models")
		}

		var modelPath string
		switch sysruntime.GOOS {
		case "darwin":
			// macOS 使用 ~/Library/Application Support
			modelPath = filepath.Join(homeDir, "Library", "Application Support", "audio-recognizer", "models")
		case "windows":
			// Windows 使用 %APPDATA%
			appData := os.Getenv("APPDATA")
			if appData == "" {
				modelPath = filepath.Join(homeDir, "AppData", "Roaming", "audio-recognizer", "models")
			} else {
				modelPath = filepath.Join(appData, "audio-recognizer", "models")
			}
		case "linux":
			// Linux 使用 ~/.config
			modelPath = filepath.Join(homeDir, ".config", "audio-recognizer", "models")
		default:
			// 未知系统，使用用户主目录
			modelPath = filepath.Join(homeDir, ".audio-recognizer", "models")
		}
		return modelPath
	default:
		// 默认方案
		appRoot := getAppRootDirectory()
		return filepath.Join(appRoot, "models")
	}
}

// validateAndFixModelPath 验证并修复模型路径
func validateAndFixModelPath(config *models.RecognitionConfig) {
	appType := getApplicationType()

	// 如果模型路径为空或不存在，使用默认路径
	if config.ModelPath == "" {
		config.ModelPath = getDefaultModelPath(appType)
		fmt.Printf("⚠️ 模型路径为空，使用默认路径: %s\n", config.ModelPath)
		return
	}

	// 检查模型路径是否存在
	if _, err := os.Stat(config.ModelPath); err != nil {
		fmt.Printf("⚠️ 模型路径不存在: %s\n", config.ModelPath)
		// 尝试使用默认路径
		defaultPath := getDefaultModelPath(appType)
		if _, err2 := os.Stat(defaultPath); err2 == nil {
			config.ModelPath = defaultPath
			fmt.Printf("✅ 已切换到默认模型路径: %s\n", config.ModelPath)
		} else {
			fmt.Printf("❌ 默认模型路径也不存在: %s\n", defaultPath)
		}
	} else {
		fmt.Printf("✅ 模型路径有效: %s\n", config.ModelPath)
	}
}