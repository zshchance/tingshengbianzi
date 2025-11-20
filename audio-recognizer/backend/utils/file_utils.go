package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const MaxFileSize = 100 * 1024 * 1024 // 100MB

// AudioFileValidationResult 音频文件验证结果
type AudioFileValidationResult struct {
	IsValid     bool
	FilePath    string
	FileInfo    os.FileInfo
	ErrorMsg    string
	SizeStr     string
	Extension   string
}

// ValidateAudioFile 验证音频文件
func ValidateAudioFile(filePath string) *AudioFileValidationResult {
	result := &AudioFileValidationResult{
		FilePath: filePath,
		IsValid:  false,
	}

	// 检查文件是否存在
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			result.ErrorMsg = "文件不存在"
		} else {
			result.ErrorMsg = fmt.Sprintf("无法访问文件: %v", err)
		}
		return result
	}
	result.FileInfo = fileInfo

	// 检查文件大小
	if fileInfo.Size() > MaxFileSize {
		result.ErrorMsg = fmt.Sprintf("文件过大，最大支持 %s", FormatFileSize(MaxFileSize))
		return result
	}

	// 检查文件格式
	ext := strings.ToLower(filepath.Ext(filePath))
	audioFormats := map[string]bool{
		".mp3":  true,
		".wav":  true,
		".m4a":  true,
		".aac":  true,
		".ogg":  true,
		".flac": true,
	}

	if !audioFormats[ext] {
		result.ErrorMsg = "不支持的音频格式，请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 格式"
		return result
	}

	result.IsValid = true
	result.SizeStr = FormatFileSize(fileInfo.Size())
	result.Extension = ext
	return result
}

// GetMimeTypeFromExtension 根据扩展名获取MIME类型
func GetMimeTypeFromExtension(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".mp3":
		return "audio/mpeg"
	case ".wav":
		return "audio/wav"
	case ".m4a":
		return "audio/mp4"
	case ".ogg":
		return "audio/ogg"
	case ".flac":
		return "audio/flac"
	default:
		return "audio/" + ext[1:]
	}
}

// FormatFileSize 格式化文件大小
func FormatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}