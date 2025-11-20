package path

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// AppLocator 应用路径定位器
type AppLocator struct{}

// NewAppLocator 创建应用路径定位器
func NewAppLocator() *AppLocator {
	return &AppLocator{}
}

// GetAppRootDirectory 获取应用根目录
func (al *AppLocator) GetAppRootDirectory() string {
	exePath, err := os.Executable()
	if err != nil {
		exePath = "."
	}
	exeDir := filepath.Dir(exePath)

	// 检查是否在 Wails 开发环境的 .app 包中
	if strings.Contains(exeDir, ".app/Contents/MacOS") {
		return al.findProjectRootFromAppBundle(exeDir)
	}

	// 检查是否在临时构建目录中
	if al.isBuildDirectory(exeDir) {
		return al.findProjectRootFromBuildDir(exeDir)
	}

	// 检查当前目录是否已经是项目根目录
	if al.isProjectRootDirectory(exeDir) {
		fmt.Printf("🎯 当前目录就是项目根目录: %s\n", exeDir)
		return exeDir
	}

	fmt.Printf("📁 使用可执行文件目录: %s\n", exeDir)
	return exeDir
}

// isBuildDirectory 检查是否为构建目录
func (al *AppLocator) isBuildDirectory(dir string) bool {
	base := filepath.Base(dir)
	return base == "build" || base == "tmp"
}

// isProjectRootDirectory 检查是否为项目根目录
func (al *AppLocator) isProjectRootDirectory(dir string) bool {
	for _, marker := range ProjectMarkers {
		if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
			return true
		}
	}
	return false
}

// findProjectRootFromAppBundle 从.app包中查找项目根目录
func (al *AppLocator) findProjectRootFromAppBundle(exeDir string) string {
	searchDir := exeDir
	maxDepth := 10

	for i := 0; i < maxDepth; i++ {
		if al.isProjectRootDirectory(searchDir) {
			fmt.Printf("🎯 检测到项目根目录: %s\n", searchDir)
			return searchDir
		}

		// 如果到了 build 目录，再向上找一级
		if filepath.Base(searchDir) == "build" {
			searchDir = filepath.Dir(searchDir)
			continue
		}

		searchDir = filepath.Dir(searchDir)
	}

	return exeDir
}

// findProjectRootFromBuildDir 从构建目录查找项目根目录
func (al *AppLocator) findProjectRootFromBuildDir(exeDir string) string {
	searchDir := exeDir
	maxDepth := 5

	for i := 0; i < maxDepth; i++ {
		if al.isProjectRootDirectory(searchDir) {
			fmt.Printf("🎯 检测到项目根目录: %s\n", searchDir)
			return searchDir
		}
		searchDir = filepath.Dir(searchDir)
	}

	return exeDir
}

// GetExecutableDirectory 获取可执行文件所在目录
func (al *AppLocator) GetExecutableDirectory() (string, error) {
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("获取可执行文件路径失败: %v", err)
	}
	return filepath.Dir(exePath), nil
}

// IsAppBundleEnvironment 检查是否在.app包环境中运行
func (al *AppLocator) IsAppBundleEnvironment(exeDir string) bool {
	return strings.Contains(exeDir, ".app/Contents/MacOS")
}

// IsPortableEnvironment 检查是否为便携版环境
func (al *AppLocator) IsPortableEnvironment(exeDir string) bool {
	// 检查是否有便携版标识文件
	return al.isPortableApp(exeDir)
}

// isPortableApp 检查是否为便携版应用
func (al *AppLocator) isPortableApp(exeDir string) bool {
	// 检查便携版标识文件
	portableMarkers := []string{"portable.txt", ".portable"}
	for _, marker := range portableMarkers {
		if _, err := os.Stat(filepath.Join(exeDir, marker)); err == nil {
			return true
		}
	}
	return false
}