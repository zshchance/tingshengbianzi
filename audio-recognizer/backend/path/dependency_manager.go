package path

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
)

// DependencyManager 第三方依赖管理器
type DependencyManager struct {
	fs           embed.FS
	appLocator   *AppLocator
	targetFinder TargetFinder
}

// NewDependencyManager 创建依赖管理器
func NewDependencyManager(config DependencyManagerConfig) *DependencyManager {
	return &DependencyManager{
		fs:           config.FS,
		appLocator:   NewAppLocator(),
		targetFinder: config.TargetFinder,
	}
}

// GetThirdPartyTargetDirectory 获取第三方依赖目标目录
func (dm *DependencyManager) GetThirdPartyTargetDirectory() (string, error) {
	if dm.targetFinder != nil {
		return dm.targetFinder.FindThirdPartyTargetDirectory()
	}

	// 默认目标查找逻辑
	exeDir, err := dm.appLocator.GetExecutableDirectory()
	if err != nil {
		return "", fmt.Errorf("获取可执行文件目录失败: %v", err)
	}

	if dm.appLocator.IsAppBundleEnvironment(exeDir) {
		// 在.app包中：提取到 Resources/third-party/bin
		return filepath.Join(filepath.Dir(exeDir), "Resources", "third-party", "bin"), nil
	}

	// 开发环境：提取到项目根目录的 third-party/bin
	appRoot := dm.appLocator.GetAppRootDirectory()
	return filepath.Join(appRoot, "third-party", "bin"), nil
}

// EnsureTargetDirectory 确保目标目录存在
func (dm *DependencyManager) EnsureTargetDirectory(targetDir string) error {
	return os.MkdirAll(targetDir, 0755)
}

// GetRequiredDependencyFiles 获取需要提取的依赖文件列表
func (dm *DependencyManager) GetRequiredDependencyFiles() []string {
	return []string{
		"third-party/bin/whisper-cli",
		"third-party/bin/ffmpeg",
		"third-party/bin/ffprobe",
	}
}

// ExtractThirdPartyFile 提取单个第三方依赖文件
func (dm *DependencyManager) ExtractThirdPartyFile(embedPath, targetDir string) error {
	fmt.Printf("📦 提取文件: %s\n", embedPath)

	// 从嵌入的文件系统中读取文件
	data, err := dm.fs.ReadFile(embedPath)
	if err != nil {
		return fmt.Errorf("读取嵌入文件失败: %v", err)
	}

	// 获取文件名
	fileName := filepath.Base(embedPath)
	targetPath := filepath.Join(targetDir, fileName)

	// 检查目标文件是否已存在且内容相同
	if dm.isFileUpToDate(targetPath, data) {
		return nil
	}

	// 写入文件
	if err := os.WriteFile(targetPath, data, 0755); err != nil {
		return fmt.Errorf("写入文件失败: %v", err)
	}

	// 验证文件是否可执行
	if err := os.Chmod(targetPath, 0755); err != nil {
		fmt.Printf("⚠️ 设置可执行权限失败: %v\n", err)
	}

	fmt.Printf("✅ 文件提取成功: %s (%d bytes)\n", targetPath, len(data))
	return nil
}

// isFileUpToDate 检查文件是否需要更新
func (dm *DependencyManager) isFileUpToDate(targetPath string, newData []byte) bool {
	existingData, err := os.ReadFile(targetPath)
	if err != nil {
		return false // 文件不存在，需要创建
	}

	if len(existingData) == len(newData) {
		fmt.Printf("⏭️ 文件已存在且内容相同: %s\n", targetPath)
		return true
	}

	return false
}

// ExtractThirdPartyFiles 批量提取第三方文件
func (dm *DependencyManager) ExtractThirdPartyFiles(files []string, targetDir string) error {
	for _, filePath := range files {
		if err := dm.ExtractThirdPartyFile(filePath, targetDir); err != nil {
			return fmt.Errorf("提取文件 %s 失败: %v", filePath, err)
		}
	}
	return nil
}

// ExtractAllDependencies 提取所有依赖
func (dm *DependencyManager) ExtractAllDependencies() *ExtractionResult {
	result := &ExtractionResult{}

	targetDir, err := dm.GetThirdPartyTargetDirectory()
	if err != nil {
		result.Success = false
		return result
	}

	fmt.Printf("🎯 第三方依赖目标目录: %s\n", targetDir)

	if err := dm.EnsureTargetDirectory(targetDir); err != nil {
		result.Success = false
		return result
	}

	requiredFiles := dm.GetRequiredDependencyFiles()
	result.TargetDir = targetDir

	for _, filePath := range requiredFiles {
		if err := dm.ExtractThirdPartyFile(filePath, targetDir); err != nil {
			result.FailedFiles = append(result.FailedFiles, filePath)
		} else {
			result.ExtractedCount++
		}
	}

	result.Success = len(result.FailedFiles) == 0

	if result.Success {
		fmt.Printf("✅ 第三方依赖提取完成，共提取 %d 个文件\n", result.ExtractedCount)
	} else {
		fmt.Printf("⚠️ 部分依赖提取失败，成功: %d，失败: %d\n",
			result.ExtractedCount, len(result.FailedFiles))
	}

	return result
}

// DefaultTargetFinder 默认目标路径查找器
type DefaultTargetFinder struct {
	appLocator *AppLocator
}

// NewDefaultTargetFinder 创建默认目标路径查找器
func NewDefaultTargetFinder() *DefaultTargetFinder {
	return &DefaultTargetFinder{
		appLocator: NewAppLocator(),
	}
}

// FindThirdPartyTargetDirectory 查找第三方依赖目标目录
func (dtf *DefaultTargetFinder) FindThirdPartyTargetDirectory() (string, error) {
	exeDir, err := dtf.appLocator.GetExecutableDirectory()
	if err != nil {
		return "", fmt.Errorf("获取可执行文件目录失败: %v", err)
	}

	if dtf.appLocator.IsAppBundleEnvironment(exeDir) {
		return filepath.Join(filepath.Dir(exeDir), "Resources", "third-party", "bin"), nil
	}

	appRoot := dtf.appLocator.GetAppRootDirectory()
	return filepath.Join(appRoot, "third-party", "bin"), nil
}

// FindTemplateTargetDirectory 查找模板目标目录
func (dtf *DefaultTargetFinder) FindTemplateTargetDirectory() (string, error) {
	exeDir, err := dtf.appLocator.GetExecutableDirectory()
	if err != nil {
		return "", fmt.Errorf("获取可执行文件目录失败: %v", err)
	}

	if dtf.appLocator.IsAppBundleEnvironment(exeDir) {
		return filepath.Join(filepath.Dir(exeDir), "Resources"), nil
	}

	appRoot := dtf.appLocator.GetAppRootDirectory()
	return filepath.Join(appRoot, "config"), nil
}