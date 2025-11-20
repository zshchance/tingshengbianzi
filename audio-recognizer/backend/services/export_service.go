package services

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"tingshengbianzi/backend/models"
)

// ExportService 导出服务
type ExportService struct{}

// NewExportService 创建导出服务
func NewExportService() *ExportService {
	return &ExportService{}
}

// ExportResult 导出识别结果
func (s *ExportService) ExportResult(resultJSON, format, outputPath string) *models.RecognitionError {
	var result models.RecognitionResult
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		return models.NewRecognitionError(
			models.ErrorCodeInvalidConfig,
			"识别结果格式无效",
			err.Error(),
		)
	}

	// 根据格式导出结果
	var content string
	var err error

	switch format {
	case "txt":
		content = s.exportToTXT(result)
	case "srt":
		content = s.exportToSRT(result)
	case "vtt":
		content = s.exportToVTT(result)
	case "json":
		contentBytes, err := json.MarshalIndent(result, "", "  ")
		content = string(contentBytes)
		if err != nil {
			err = fmt.Errorf("JSON序列化失败: %w", err)
		}
	default:
		return models.NewRecognitionError(
			"INVALID_EXPORT_FORMAT",
			"不支持的导出格式",
			format,
		)
	}

	if err != nil {
		return models.NewRecognitionError(
			"EXPORT_FAILED",
			"导出失败",
			err.Error(),
		)
	}

	// 写入文件
	if err := s.writeToFile(outputPath, content); err != nil {
		return models.NewRecognitionError(
			models.ErrorCodePermissionDenied,
			"文件写入失败",
			err.Error(),
		)
	}

	return nil // 成功返回nil表示没有错误
}

// ExportToTXT 导出为纯文本格式
func (s *ExportService) ExportToTXT(result models.RecognitionResult) string {
	return s.exportToTXT(result)
}

// ExportToSRT 导出为SRT字幕格式
func (s *ExportService) ExportToSRT(result models.RecognitionResult) string {
	return s.exportToSRT(result)
}

// ExportToVTT 导出为WebVTT格式
func (s *ExportService) ExportToVTT(result models.RecognitionResult) string {
	return s.exportToVTT(result)
}

// GetSupportedFormats 获取支持的导出格式
func (s *ExportService) GetSupportedFormats() []string {
	return []string{"txt", "srt", "vtt", "json"}
}

// 内部方法

// exportToTXT 导出为纯文本格式
func (s *ExportService) exportToTXT(result models.RecognitionResult) string {
	return result.Text
}

// exportToSRT 导出为SRT字幕格式
func (s *ExportService) exportToSRT(result models.RecognitionResult) string {
	var srt strings.Builder

	for i, word := range result.Words {
		startSec := int64(word.Start)
		startMS := int64((word.Start - float64(startSec)) * 1000)
		endSec := int64(word.End)
		endMS := int64((word.End - float64(endSec)) * 1000)

		startTime := time.Unix(startSec, startMS*int64(time.Millisecond))
		endTime := time.Unix(endSec, endMS*int64(time.Millisecond))

		srt.WriteString(fmt.Sprintf("%d\n", i+1))
		srt.WriteString(fmt.Sprintf("%s --> %s\n",
			startTime.Format("15:04:05,000"),
			endTime.Format("15:04:05,000")))
		srt.WriteString(fmt.Sprintf("%s\n\n", word.Text))
	}

	return srt.String()
}

// exportToVTT 导出为WebVTT格式
func (s *ExportService) exportToVTT(result models.RecognitionResult) string {
	var vtt strings.Builder
	vtt.WriteString("WEBVTT\n\n")

	for _, word := range result.Words {
		vtt.WriteString(fmt.Sprintf("%.2f --> %.2f\n", word.Start, word.End))
		vtt.WriteString(fmt.Sprintf("%s\n\n", word.Text))
	}

	return vtt.String()
}

// writeToFile 写入文件
func (s *ExportService) writeToFile(filePath, content string) error {
	return os.WriteFile(filePath, []byte(content), 0644)
}