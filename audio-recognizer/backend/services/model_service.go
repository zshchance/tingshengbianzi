package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"tingshengbianzi/backend/utils"
)

// ModelService 模型管理服务
type ModelService struct {
	ctx        context.Context
	validator  *utils.WhisperModelValidator
}

// NewModelService 创建模型管理服务
func NewModelService(ctx context.Context) *ModelService {
	return &ModelService{
		ctx:       ctx,
		validator: utils.NewWhisperModelValidator(),
	}
}

// SelectModelFile 选择模型文件
func (s *ModelService) SelectModelFile() map[string]interface{} {
	// 使用工具函数获取对话框选项
	dialogOptions := utils.GetModelFileDialogOptions()

	// 转换为runtime类型
	filters := make([]runtime.FileFilter, 0)
	for _, filter := range dialogOptions["filters"].([]map[string]interface{}) {
		filters = append(filters, runtime.FileFilter{
			DisplayName: filter["displayName"].(string),
			Pattern:     filter["pattern"].(string),
		})
	}

	options := runtime.OpenDialogOptions{
		Title:            dialogOptions["title"].(string),
		DefaultDirectory: dialogOptions["defaultDirectory"].(string),
		DefaultFilename:  dialogOptions["defaultFilename"].(string),
		Filters:          filters,
	}

	selectedFile, err := runtime.OpenFileDialog(s.ctx, options)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("文件选择失败: %v", err),
		}
	}

	if selectedFile == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件",
		}
	}

	// 检查文件是否存在
	fileInfo, err := os.Stat(selectedFile)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("无法访问文件: %v", err),
		}
	}

	if fileInfo.IsDir() {
		return map[string]interface{}{
			"success": false,
			"error":   "选择的路径是文件夹，请选择模型文件",
		}
	}

	// 使用模型验证器验证文件
	fileName := fileInfo.Name()
	if !s.validator.IsValidWhisperModel(fileName) {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("文件 '%s' 不是有效的Whisper模型文件", fileName),
		}
	}

	// 获取文件目录
	modelDir := filepath.Dir(selectedFile)

	return map[string]interface{}{
		"success":    true,
		"filePath":   selectedFile,
		"fileName":   fileName,
		"modelPath":  modelDir,
		"fileSize":   fileInfo.Size(),
		"fileSizeStr": utils.FormatFileSize(fileInfo.Size()),
	}
}

// SelectModelDirectory 选择模型文件夹
func (s *ModelService) SelectModelDirectory() map[string]interface{} {
	// 使用工具函数获取对话框选项
	dialogOptions := utils.GetModelDirectoryDialogOptions()

	options := runtime.OpenDialogOptions{
		Title:            dialogOptions["title"].(string),
		DefaultDirectory: dialogOptions["defaultDirectory"].(string),
		DefaultFilename:  dialogOptions["defaultFilename"].(string),
		Filters:          []runtime.FileFilter{}, // 不使用文件过滤器，显示所有文件夹
	}

	selectedDirectory, err := runtime.OpenDirectoryDialog(s.ctx, options)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}
	}

	if selectedDirectory == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件夹",
		}
	}

	// 检查目录是否存在
	fileInfo, err := os.Stat(selectedDirectory)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("无法访问文件夹: %v", err),
		}
	}

	if !fileInfo.IsDir() {
		return map[string]interface{}{
			"success": false,
			"error":   "选择的路径不是文件夹",
		}
	}

	// 使用模型验证器扫描目录中的模型文件
	models := s.validator.ScanModelFiles(selectedDirectory)

	return map[string]interface{}{
		"success": true,
		"path":    selectedDirectory,
		"models":  models,
	}
}

// GetModelInfo 获取模型信息
func (s *ModelService) GetModelInfo(directory string) map[string]interface{} {
	if directory == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "目录路径为空",
		}
	}

	// 检查目录是否存在
	if _, err := os.Stat(directory); os.IsNotExist(err) {
		return map[string]interface{}{
			"success": false,
			"error":   "目录不存在",
		}
	}

	// 使用模型验证器扫描模型文件
	models := s.validator.ScanModelFiles(directory)

	return map[string]interface{}{
		"success":      true,
		"directory":    directory,
		"models":       models,
		"modelCount":   len(models),
		"hasWhisper":   s.hasWhisperModel(models),
		"recommendations": s.getRecommendations(models),
	}
}

// HasWhisperModel 检查是否有Whisper模型
func (s *ModelService) HasWhisperModel(models []map[string]interface{}) bool {
	return s.hasWhisperModel(models)
}

// GetRecommendations 获取模型推荐
func (s *ModelService) GetRecommendations(models []map[string]interface{}) []string {
	return s.getRecommendations(models)
}

// 内部方法

// hasWhisperModel 检查是否有Whisper模型
func (s *ModelService) hasWhisperModel(models []map[string]interface{}) bool {
	for _, model := range models {
		if model["type"] == "whisper" {
			return true
		}
	}
	return false
}

// getRecommendations 获取模型推荐
func (s *ModelService) getRecommendations(models []map[string]interface{}) []string {
	var recommendations []string
	hasWhisper := s.hasWhisperModel(models)

	if !hasWhisper {
		recommendations = append(recommendations, "建议下载Whisper Base模型以开始使用语音识别功能")
	}

	if len(models) == 0 {
		recommendations = append(recommendations, "当前目录中没有检测到任何模型文件")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "模型配置正常，可以开始使用语音识别功能")
	}

	return recommendations
}