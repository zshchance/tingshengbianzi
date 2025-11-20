package utils

import (
	"fmt"
	"os"
	"path/filepath"
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

// GetAudioDuration 仅获取音频时长
func (h *AudioFileHandler) GetAudioDuration(filePath string) (float64, error) {
	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return 0, fmt.Errorf("文件不存在")
	}

	// 检查文件格式
	validationResult := ValidateAudioFile(filePath)
	if !validationResult.IsValid {
		return 0, fmt.Errorf(validationResult.ErrorMsg)
	}

	// 使用文件大小估算时长
	return EstimateDurationFromSize(validationResult.FileInfo.Size(), validationResult.Extension), nil
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