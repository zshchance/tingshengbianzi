package models

import (
	"errors"
	"fmt"
)

// 定义应用错误类型
var (
	// 语音识别相关错误
	ErrModelNotFound      = errors.New("语音模型未找到")
	ErrModelLoadFailed    = errors.New("语音模型加载失败")
	ErrInvalidAudioFormat = errors.New("不支持的音频格式")
	ErrAudioFileNotFound  = errors.New("音频文件未找到")
	ErrAudioProcessFailed = errors.New("音频处理失败")
	ErrRecognitionFailed  = errors.New("语音识别失败")

	// 配置相关错误
	ErrInvalidConfig      = errors.New("无效的配置")
	ErrConfigNotFound     = errors.New("配置文件未找到")

	// 系统相关错误
	ErrFFmpegNotFound     = errors.New("FFmpeg未安装或未找到")
	ErrPermissionDenied   = errors.New("权限被拒绝")
	ErrDiskSpaceFull      = errors.New("磁盘空间不足")
)

// RecognitionError 语音识别错误
type RecognitionError struct {
	Code    string `json:"code"`    // 错误代码
	Message string `json:"message"` // 错误消息
	Details string `json:"details"` // 错误详情
}

func (e *RecognitionError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("[%s] %s: %s", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// NewRecognitionError 创建新的语音识别错误
func NewRecognitionError(code, message, details string) *RecognitionError {
	return &RecognitionError{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// 错误代码常量
const (
	ErrorCodeModelNotFound      = "MODEL_NOT_FOUND"
	ErrorCodeModelLoadFailed    = "MODEL_LOAD_FAILED"
	ErrorCodeInvalidAudioFormat = "INVALID_AUDIO_FORMAT"
	ErrorCodeAudioFileNotFound  = "AUDIO_FILE_NOT_FOUND"
	ErrorCodeAudioProcessFailed = "AUDIO_PROCESS_FAILED"
	ErrorCodeRecognitionFailed  = "RECOGNITION_FAILED"
	ErrorCodeInvalidConfig      = "INVALID_CONFIG"
	ErrorCodeFFmpegNotFound     = "FFMPEG_NOT_FOUND"
	ErrorCodePermissionDenied   = "PERMISSION_DENIED"
	ErrorCodeDiskSpaceFull      = "DISK_SPACE_FULL"
	ErrorCodeFileValidationFailed = "FILE_VALIDATION_FAILED"
)