package utils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// AudioFileInfo 音频文件信息
type AudioFileInfo struct {
	Name         string  `json:"name"`
	Path         string  `json:"path"`
	Size         int64   `json:"size"`
	Type         string  `json:"type"`
	Duration     float64 `json:"duration"`
	LastModified int64   `json:"lastModified"`
}

// AudioFileHandler 音频文件处理器
type AudioFileHandler struct {
}

// NewAudioFileHandler 创建音频文件处理器
func NewAudioFileHandler() (*AudioFileHandler, error) {
	return &AudioFileHandler{}, nil
}

// Cleanup 清理资源
func (h *AudioFileHandler) Cleanup() {
	// 暂时不做任何清理
}

// GetAudioFileInfo 获取音频文件信息
func (h *AudioFileHandler) GetAudioFileInfo(filePath string) (*AudioFileInfo, error) {
	// 验证文件
	validationResult := ValidateAudioFile(filePath)
	if !validationResult.IsValid {
		return nil, fmt.Errorf(validationResult.ErrorMsg)
	}

	// 获取文件信息
	fileInfo := validationResult.FileInfo
	ext := validationResult.Extension

	// 使用文件大小估算音频时长
	duration := EstimateDurationFromSize(fileInfo.Size(), ext)
	fmt.Printf("使用估算时长: %.2f 秒\n", duration)

	return &AudioFileInfo{
		Name:         filepath.Base(filePath),
		Path:         filePath,
		Size:         fileInfo.Size(),
		Type:         GetMimeTypeFromExtension(ext),
		Duration:     duration,
		LastModified: fileInfo.ModTime().UnixMilli(),
	}, nil
}

// GetAudioDuration 仅获取音频时长（增强版）
func (h *AudioFileHandler) GetAudioDuration(filePath string) (float64, error) {
	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return 0, fmt.Errorf("文件不存在")
	}

	// 使用增强的时长获取方法（FFprobe优先，估算备用）
	return GetAudioDurationEnhanced(filePath)
}

// EstimateDurationFromSize 根据文件大小估算音频时长
func EstimateDurationFromSize(fileSize int64, ext string) float64 {
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

// SelectAudioFile 选择音频文件的通用对话框选项
func GetAudioFileDialogOptions() map[string]interface{} {
	return map[string]interface{}{
		"title":             "选择音频文件",
		"defaultDirectory":  "",
		"defaultFilename":   "",
		"filters": []map[string]interface{}{
			{
				"displayName": "音频文件 (*.mp3, *.wav, *.m4a, *.ogg, *.flac)",
				"pattern":     "*.mp3;*.wav;*.m4a;*.ogg;*.flac",
			},
		},
	}
}

// GetAudioDurationWithFFmpeg 使用FFprobe获取精确音频时长
func GetAudioDurationWithFFmpeg(filePath string) (float64, error) {
	// 尝试多种可能的FFprobe路径
	ffprobePaths := []string{
		"ffprobe", // 系统PATH中查找
		"/opt/homebrew/bin/ffprobe",
		"/usr/local/bin/ffprobe",
		"/usr/bin/ffprobe",
	}

	// 如果有FFmpegManager，尝试使用其管理的FFprobe
	if ffmpegManager, err := NewFFmpegManager(); err == nil {
		if err := ffmpegManager.EnsureFFmpegAvailable(); err == nil {
			ffprobePaths = append([]string{ffmpegManager.GetFFprobePath()}, ffprobePaths...)
		}
	}

	var lastError error
	for _, ffprobePath := range ffprobePaths {
		duration, err := getDurationWithFFprobePath(ffprobePath, filePath)
		if err == nil {
			fmt.Printf("✅ 使用FFprobe获取精确时长: %.2f秒 (FFmpeg路径: %s)\n", duration, ffprobePath)
			return duration, nil
		}
		lastError = err
		fmt.Printf("⚠️ FFprobe路径 %s 不可用: %v\n", ffprobePath, err)
	}

	// 如果FFprobe完全不可用，返回错误
	return 0, fmt.Errorf("所有FFprobe路径都不可用，最后错误: %v", lastError)
}

// getDurationWithFFprobePath 使用指定路径的FFprobe获取时长
func getDurationWithFFprobePath(ffprobePath, filePath string) (float64, error) {
	// 检查FFprobe是否存在
	if _, err := exec.LookPath(ffprobePath); err != nil {
		return 0, fmt.Errorf("FFprobe不存在: %v", err)
	}

	// 使用FFprobe获取音频信息
	cmd := exec.Command(ffprobePath,
		"-v", "quiet",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("执行FFprobe失败: %v", err)
	}

	// 解析输出
	durationStr := strings.TrimSpace(string(output))
	if durationStr == "" {
		return 0, fmt.Errorf("FFprobe返回空结果")
	}

	// 转换为浮点数
	duration, err := strconv.ParseFloat(durationStr, 64)
	if err != nil {
		return 0, fmt.Errorf("解析时长失败: %v, 原始数据: %s", err, durationStr)
	}

	// 验证时长的合理性
	if duration <= 0 {
		return 0, fmt.Errorf("获取的时长无效: %f", duration)
	}

	if duration > 24*3600 { // 超过24小时认为异常
		return 0, fmt.Errorf("获取的时长异常过大: %f", duration)
	}

	return duration, nil
}

// GetAudioDurationEnhanced 增强的音频时长获取方法
func GetAudioDurationEnhanced(filePath string) (float64, error) {
	// 首先尝试使用FFprobe获取精确时长
	duration, err := GetAudioDurationWithFFmpeg(filePath)
	if err == nil {
		return duration, nil
	}

	fmt.Printf("⚠️ FFprobe获取时长失败: %v，使用估算方法\n", err)

	// 如果FFprobe失败，回退到估算方法
	validationResult := ValidateAudioFile(filePath)
	if !validationResult.IsValid {
		return 0, fmt.Errorf("文件验证失败: %s", validationResult.ErrorMsg)
	}

	estimatedDuration := EstimateDurationFromSize(validationResult.FileInfo.Size(), validationResult.Extension)
	fmt.Printf("⚠️ 使用估算时长: %.2f秒\n", estimatedDuration)

	return estimatedDuration, nil
}