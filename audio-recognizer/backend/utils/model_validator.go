package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// WhisperModelValidator Whisper模型验证器
type WhisperModelValidator struct{}

// NewWhisperModelValidator 创建Whisper模型验证器
func NewWhisperModelValidator() *WhisperModelValidator {
	return &WhisperModelValidator{}
}

// IsValidWhisperModel 验证是否为有效的Whisper模型文件
func (v *WhisperModelValidator) IsValidWhisperModel(fileName string) bool {
	// 精确匹配常见模型
	exactModels := []string{
		"ggml-tiny.bin",
		"ggml-base.bin",
		"ggml-small.bin",
		"ggml-medium.bin",
		"ggml-large.bin",
		"ggml-large-v1.bin",
		"ggml-large-v2.bin",
		"ggml-large-v3.bin",
		"ggml-large-v3-turbo.bin",
		"ggml-tiny.en.bin",
		"ggml-base.en.bin",
		"ggml-small.en.bin",
		"ggml-medium.en.bin",
		"ggml-large.en.bin",
	}

	for _, exactModel := range exactModels {
		if fileName == exactModel {
			return true
		}
	}

	// 模式匹配
	validPatterns := []string{
		// 标准模型
		"ggml-tiny.bin",
		"ggml-base.bin",
		"ggml-small.bin",
		"ggml-medium.bin",
		"ggml-large.bin",

		// 版本化模型
		"ggml-large-v1.bin",
		"ggml-large-v2.bin",
		"ggml-large-v3.bin",

		// Turbo变体模型
		"ggml-tiny*.bin",
		"ggml-base*.bin",
		"ggml-small*.bin",
		"ggml-medium*.bin",
		"ggml-large*.bin",

		// 英文专用模型
		"ggml-tiny.en.bin",
		"ggml-base.en.bin",
		"ggml-small.en.bin",
		"ggml-medium.en.bin",
		"ggml-large.en.bin",

		// 量化模型 (q4, q5, q8等)
		"ggml-*.q*.bin",
		"ggml-*.q4_0.bin",
		"ggml-*.q4_1.bin",
		"ggml-*.q5_0.bin",
		"ggml-*.q5_1.bin",
		"ggml-*.q8_0.bin",

		// 特殊后缀模型
		"*.bin", // 最后的兜底模式：任何.bin文件都可能是模型
	}

	for _, pattern := range validPatterns {
		matched, _ := filepath.Match(pattern, fileName)
		if matched {
			// 额外验证：确保文件名包含模型相关的关键词
			if v.isValidWhisperModelName(fileName) {
				return true
			}
		}
	}

	return false
}

// isValidWhisperModelName 验证文件名是否包含有效的Whisper模型关键词
func (v *WhisperModelValidator) isValidWhisperModelName(fileName string) bool {
	// 转换为小写进行匹配
	lowerFileName := strings.ToLower(fileName)

	// 必须包含的关键词
	requiredKeywords := []string{"ggml"}

	// 检查是否包含必需关键词
	for _, keyword := range requiredKeywords {
		if !strings.Contains(lowerFileName, keyword) {
			return false
		}
	}

	// 可选的模型大小关键词
	modelSizes := []string{"tiny", "base", "small", "medium", "large"}

	// 检查是否包含至少一个模型大小关键词
	for _, size := range modelSizes {
		if strings.Contains(lowerFileName, size) {
			return true
		}
	}

	// 特殊处理其他可能的模型命名
	specialCases := []string{
		"whisper", "model", "speech", "recognition",
	}
	for _, special := range specialCases {
		if strings.Contains(lowerFileName, special) {
			return true
		}
	}

	return false
}

// GetModelFileDialogOptions 获取模型文件选择对话框选项
func GetModelFileDialogOptions() map[string]interface{} {
	return map[string]interface{}{
		"title":             "选择Whisper模型文件",
		"defaultDirectory":  "",
		"defaultFilename":   "",
		"filters": []map[string]interface{}{
			{
				"displayName": "Whisper模型文件",
				"pattern":     "*.bin",
			},
		},
	}
}

// GetModelDirectoryDialogOptions 获取模型目录选择对话框选项
func GetModelDirectoryDialogOptions() map[string]interface{} {
	return map[string]interface{}{
		"title":             "选择模型文件夹",
		"defaultDirectory":  "",
		"defaultFilename":   "",
		"filters":           []map[string]interface{}{}, // 不使用文件过滤器，显示所有文件夹
	}
}

// ScanModelFiles 扫描模型文件夹
func (v *WhisperModelValidator) ScanModelFiles(directory string) []map[string]interface{} {
	var models []map[string]interface{}

	// 扫描目录中的所有文件
	if entries, err := os.ReadDir(directory); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".bin") {
				fileName := entry.Name()
				if v.IsValidWhisperModel(fileName) {
					modelPath := filepath.Join(directory, fileName)
					if fileInfo, err := entry.Info(); err == nil {
						size := fileInfo.Size()
						sizeStr := FormatFileSize(size)
						models = append(models, map[string]interface{}{
							"name":    fileName,
							"path":    modelPath,
							"type":    "whisper",
							"size":    size,
							"sizeStr": sizeStr,
						})
					}
				}
			}
		}
	}

	// 检查whisper子目录
	whisperDir := filepath.Join(directory, "whisper")
	if dirInfo, err := os.Stat(whisperDir); err == nil && dirInfo.IsDir() {
		if entries, err := os.ReadDir(whisperDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".bin") {
					fileName := entry.Name()
					if v.IsValidWhisperModel(fileName) {
						modelPath := filepath.Join(whisperDir, fileName)
						if fileInfo, err := entry.Info(); err == nil {
							size := fileInfo.Size()
							sizeStr := FormatFileSize(size)
							models = append(models, map[string]interface{}{
								"name":    filepath.Join("whisper", fileName),
								"path":    modelPath,
								"type":    "whisper",
								"size":    size,
								"sizeStr": sizeStr,
							})
						}
					}
				}
			}
		}
	}

	return models
}