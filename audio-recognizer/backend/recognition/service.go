package recognition

import "tingshengbianzi/backend/models"

// RecognitionService 语音识别服务接口
type RecognitionService interface {
	// LoadModel 加载语音模型
	LoadModel(language, modelPath string) error

	// RecognizeFile 识别音频文件
	RecognizeFile(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error)

	// RecognizeFileWithModel 使用指定模型文件识别音频文件
	RecognizeFileWithModel(audioPath string, language string, specificModelFile string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error)

	// GetSupportedLanguages 获取支持的语言列表
	GetSupportedLanguages() []string

	// IsModelLoaded 检查模型是否已加载
	IsModelLoaded(language string) bool

	// UnloadModel 卸载语音模型
	UnloadModel(language string) error

	// UpdateConfig 更新配置
	UpdateConfig(config *models.RecognitionConfig)

	// Close 关闭服务
	Close() error
}