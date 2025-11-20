package services

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"tingshengbianzi/backend/utils"
)

// AudioService 音频文件处理服务
type AudioService struct {
	ctx      context.Context
	fileHandler *utils.AudioFileHandler
}

// NewAudioService 创建音频文件处理服务
func NewAudioService(ctx context.Context) (*AudioService, error) {
	fileHandler, err := utils.NewAudioFileHandler()
	if err != nil {
		return nil, fmt.Errorf("创建音频文件处理器失败: %v", err)
	}

	return &AudioService{
		ctx:        ctx,
		fileHandler: fileHandler,
	}, nil
}

// Cleanup 清理资源
func (s *AudioService) Cleanup() {
	if s.fileHandler != nil {
		s.fileHandler.Cleanup()
	}
}

// SelectAudioFile 选择音频文件
func (s *AudioService) SelectAudioFile() map[string]interface{} {
	// 使用工具函数获取对话框选项
	dialogOptions := utils.GetAudioFileDialogOptions()

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
			"error":   err.Error(),
		}
	}

	if selectedFile == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "未选择文件",
		}
	}

	// 使用音频文件处理器获取文件信息
	audioInfo, err := s.fileHandler.GetAudioFileInfo(selectedFile)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}
	}

	return map[string]interface{}{
		"success": true,
		"file": map[string]interface{}{
			"name":         audioInfo.Name,
			"path":         audioInfo.Path,
			"size":         audioInfo.Size,
			"type":         audioInfo.Type,
			"duration":     audioInfo.Duration,
			"lastModified": audioInfo.LastModified,
		},
	}
}

// GetAudioDuration 获取音频文件的真实时长
func (s *AudioService) GetAudioDuration(filePath string) map[string]interface{} {
	if filePath == "" {
		return map[string]interface{}{
			"success": false,
			"error":   "文件路径不能为空",
		}
	}

	duration, err := s.fileHandler.GetAudioDuration(filePath)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		}
	}

	return map[string]interface{}{
		"success":  true,
		"duration": duration,
		"filePath": filePath,
	}
}

// OnFileDrop 处理Wails原生文件拖放事件
func (s *AudioService) OnFileDrop(files []string) {
	fmt.Printf("🎯 OnFileDrop: 收到 %d 个文件\n", len(files))

	if len(files) == 0 {
		fmt.Println("❌ OnFileDrop: 没有文件")
		return
	}

	// 只处理第一个文件
	filePath := files[0]
	fmt.Printf("📁 OnFileDrop: 处理文件: %s\n", filePath)

	// 使用工具函数验证文件
	validationResult := utils.ValidateAudioFile(filePath)

	if !validationResult.IsValid {
		s.sendFileDropError(filePath, validationResult.ErrorMsg)
		return
	}

	fmt.Printf("✅ OnFileDrop: 文件验证通过，发送前端处理事件\n")

	// 发送文件拖放成功事件到前端
	fileData := map[string]interface{}{
		"success": true,
		"file": map[string]interface{}{
			"name":         validationResult.FileInfo.Name(),
			"path":         filePath,
			"size":         validationResult.FileInfo.Size(),
			"sizeFormatted": validationResult.SizeStr,
			"extension":    validationResult.Extension,
			"hasPath":      true,
		},
	}

	runtime.EventsEmit(s.ctx, "file-dropped", fileData)
	fmt.Printf("📤 OnFileDrop: 已发送文件拖放事件到前端\n")
}

// CreateTempFileFromBase64 从Base64数据创建临时文件
func (s *AudioService) CreateTempFileFromBase64(base64Data string) (string, error) {
	// 解码Base64数据
	fileData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("Base64解码失败: %v", err)
	}

	// 创建临时文件
	tempFile, err := os.CreateTemp("", "audio-*.wav")
	if err != nil {
		return "", fmt.Errorf("创建临时文件失败: %v", err)
	}
	defer tempFile.Close()

	// 写入数据到临时文件
	if _, err := tempFile.Write(fileData); err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("写入临时文件失败: %v", err)
	}

	fmt.Printf("✅ 临时文件创建成功: %s，大小: %d bytes\n", tempFile.Name(), len(fileData))
	return tempFile.Name(), nil
}

// 内部方法

// sendFileDropError 发送文件拖放错误事件
func (s *AudioService) sendFileDropError(filePath, errorMsg string) {
	fmt.Printf("❌ OnFileDrop: 文件验证失败: %s\n", errorMsg)
	runtime.EventsEmit(s.ctx, "file-drop-error", map[string]interface{}{
		"error":   "文件验证失败",
		"message": errorMsg,
		"file":    filePath,
	})
}