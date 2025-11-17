package utils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"audio-recognizer/backend/models"
)

// EmbeddedFFmpegManager 嵌入式FFmpeg管理器
type EmbeddedFFmpegManager struct {
	ffmpegPath  string
	ffprobePath string
}

// NewEmbeddedFFmpegManager 创建新的嵌入式FFmpeg管理器
func NewEmbeddedFFmpegManager() (*EmbeddedFFmpegManager, error) {
	manager := &EmbeddedFFmpegManager{}

	// 查找FFmpeg路径
	ffmpegPath, ffprobePath, err := manager.findFFmpegPaths()
	if err != nil {
		return nil, err
	}

	manager.ffmpegPath = ffmpegPath
	manager.ffprobePath = ffprobePath

	fmt.Printf("使用FFmpeg: %s\n", ffmpegPath)
	fmt.Printf("使用FFprobe: %s\n", ffprobePath)

	return manager, nil
}

// findFFmpegPaths 查找FFmpeg路径
func (m *EmbeddedFFmpegManager) findFFmpegPaths() (string, string, error) {
	// 1. 首先尝试嵌入的二进制文件
	if ffmpegPath, ffprobePath := m.tryEmbeddedFFmpeg(); ffmpegPath != "" {
		return ffmpegPath, ffprobePath, nil
	}

	// 2. 尝试系统PATH
	if ffmpegPath, ffprobePath := m.trySystemFFmpeg(); ffmpegPath != "" {
		return ffmpegPath, ffprobePath, nil
	}

	// 3. 尝试常见安装位置
	if ffmpegPath, ffprobePath := m.tryCommonLocations(); ffmpegPath != "" {
		return ffmpegPath, ffprobePath, nil
	}

	return "", "", models.NewRecognitionError(
		models.ErrorCodeFFmpegNotFound,
		"FFmpeg未找到",
		"无法找到FFmpeg，请确保已安装或嵌入到应用中",
	)
}

// tryEmbeddedFFmpeg 尝试嵌入的FFmpeg
func (m *EmbeddedFFmpegManager) tryEmbeddedFFmpeg() (string, string) {
	// 获取可执行文件目录
	exePath, err := os.Executable()
	if err != nil {
		return "", ""
	}
	exeDir := filepath.Dir(exePath)

	fmt.Printf("查找嵌入FFmpeg，可执行文件目录: %s\n", exeDir)

	// 尝试不同位置的嵌入FFmpeg
	searchPaths := []struct {
		name string
		path string
	}{
		{"同目录", filepath.Join(exeDir, "ffmpeg-binaries")},
		{"Resources目录", filepath.Join(exeDir, "Resources", "ffmpeg-binaries")},
		{"resources目录", filepath.Join(exeDir, "resources", "ffmpeg-binaries")},
		{"上一级目录", filepath.Join(filepath.Dir(exeDir), "ffmpeg-binaries")},
	}

	for _, search := range searchPaths {
		ffmpegPath := filepath.Join(search.path, "ffmpeg")
		ffprobePath := filepath.Join(search.path, "ffprobe")

		fmt.Printf("尝试位置 %s: %s\n", search.name, search.path)

		if m.isExecutable(ffmpegPath) && m.isExecutable(ffprobePath) {
			fmt.Printf("✅ 在 %s 找到嵌入FFmpeg\n", search.name)
			return ffmpegPath, ffprobePath
		}
	}

	fmt.Printf("❌ 未找到嵌入的FFmpeg\n")
	return "", ""
}

// trySystemFFmpeg 尝试系统FFmpeg
func (m *EmbeddedFFmpegManager) trySystemFFmpeg() (string, string) {
	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return "", ""
	}

	ffprobePath, err := exec.LookPath("ffprobe")
	if err != nil {
		return "", ""
	}

	return ffmpegPath, ffprobePath
}

// tryCommonLocations 尝试常见安装位置
func (m *EmbeddedFFmpegManager) tryCommonLocations() (string, string) {
	var locations []string

	switch runtime.GOOS {
	case "darwin":
		locations = []string{
			"/opt/homebrew/bin",
			"/usr/local/bin",
			"/opt/local/bin", // MacPorts
		}
	case "linux":
		locations = []string{
			"/usr/bin",
			"/usr/local/bin",
			"/snap/bin", // Snap packages
		}
	case "windows":
		locations = []string{
			"C:\\Program Files\\ffmpeg\\bin",
			"C:\\ffmpeg\\bin",
		}
	}

	for _, dir := range locations {
		ffmpegPath := filepath.Join(dir, "ffmpeg")
		ffprobePath := filepath.Join(dir, "ffprobe")

		if m.isExecutable(ffmpegPath) && m.isExecutable(ffprobePath) {
			return ffmpegPath, ffprobePath
		}
	}

	return "", ""
}

// isExecutable 检查文件是否可执行
func (m *EmbeddedFFmpegManager) isExecutable(path string) bool {
	if info, err := os.Stat(path); err != nil {
		return false
	} else {
		return !info.IsDir() && info.Mode().Perm()&0111 != 0
	}
}

// GetFFmpegPath 获取FFmpeg路径
func (m *EmbeddedFFmpegManager) GetFFmpegPath() string {
	return m.ffmpegPath
}

// GetFFprobePath 获取FFprobe路径
func (m *EmbeddedFFmpegManager) GetFFprobePath() string {
	return m.ffprobePath
}

// ValidateFFmpeg 验证FFmpeg是否正常工作
func (m *EmbeddedFFmpegManager) ValidateFFmpeg() error {
	// 测试ffmpeg版本
	cmd := exec.Command(m.ffmpegPath, "-version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("FFmpeg测试失败: %w", err)
	}

	// 测试ffprobe版本
	cmd = exec.Command(m.ffprobePath, "-version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("FFprobe测试失败: %w", err)
	}

	fmt.Println("✅ FFmpeg验证通过")
	return nil
}

// GetFFmpegInfo 获取FFmpeg信息
func (m *EmbeddedFFmpegManager) GetFFmpegInfo() map[string]interface{} {
	return map[string]interface{}{
		"ffmpegPath":  m.ffmpegPath,
		"ffprobePath": m.ffprobePath,
		"source":      m.getSourceType(),
	}
}

// getSourceType 获取FFmpeg来源类型
func (m *EmbeddedFFmpegManager) getSourceType() string {
	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)

	if m.ffmpegPath == filepath.Join(exeDir, "ffmpeg-binaries", "ffmpeg") ||
		m.ffmpegPath == filepath.Join(exeDir, "resources", "ffmpeg") {
		return "embedded"
	}

	// 检查是否在系统PATH中
	if _, err := exec.LookPath("ffmpeg"); err == nil && m.ffmpegPath == "ffmpeg" {
		return "system_path"
	}

	return "system_installed"
}