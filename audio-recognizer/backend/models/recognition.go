package models

import "time"

// RecognitionResult 语音识别结果
type RecognitionResult struct {
	ID          string                `json:"id"`          // 识别结果ID
	Language    string                `json:"language"`    // 识别语言
	Text        string                `json:"text"`        // 识别文本
	Segments    []RecognitionResultSegment `json:"segments"`    // 识别结果段落
	Words       []Word                `json:"words"`       // 词汇级结果
	Duration    float64               `json:"duration"`    // 音频时长(秒)
	Confidence  float64               `json:"confidence"`  // 整体置信度
	ProcessedAt time.Time             `json:"processedAt"` // 处理时间
	Metadata    map[string]interface{} `json:"metadata"`   // 元数据
}

// RecognitionResultSegment 识别结果段落
type RecognitionResultSegment struct {
	Start      float64                `json:"start"`      // 开始时间(秒)
	End        float64                `json:"end"`        // 结束时间(秒)
	Text       string                 `json:"text"`       // 文本内容
	Confidence float64                `json:"confidence"` // 置信度
	Words      []Word                 `json:"words"`      // 词汇信息
	Metadata   map[string]interface{} `json:"metadata"`   // 元数据
}

// Word 词汇信息（符合设计文档规范）
type Word struct {
	Text       string  `json:"text"`       // 词汇内容
	Start      float64 `json:"start"`      // 开始时间(秒)
	End        float64 `json:"end"`        // 结束时间(秒)
	Confidence float64 `json:"confidence"` // 置信度
	Speaker    string  `json:"speaker,omitempty"` // 说话人
}

// SpecialMark 特殊标记类型
type SpecialMark struct {
	Type      string  `json:"type"`      // 标记类型：emphasis, pause, unclear, music, speaker, language
	StartTime float64 `json:"startTime"` // 开始时间(秒)
	EndTime   float64 `json:"endTime"`   // 结束时间(秒)
	Content   string  `json:"content"`   // 标记内容
	Metadata  map[string]interface{} `json:"metadata"` // 额外元数据
}

// WordResult 词汇级识别结果（向后兼容）
type WordResult struct {
	Word       string  `json:"word"`       // 词汇
	StartTime  float64 `json:"startTime"`  // 开始时间(秒)
	EndTime    float64 `json:"endTime"`    // 结束时间(秒)
	Confidence float64 `json:"confidence"` // 置信度
}

// RecognitionProgress 识别进度
type RecognitionProgress struct {
	CurrentTime   float64 `json:"currentTime"`   // 当前处理时间(秒)
	TotalTime     float64 `json:"totalTime"`     // 总时间(秒)
	Percentage    int     `json:"percentage"`    // 完成百分比
	Status        string  `json:"status"`        // 状态描述
	WordsPerSec   float64 `json:"wordsPerSec"`   // 识别速度(词/秒)
}

// AudioFile 音频文件信息
type AudioFile struct {
	Path     string  `json:"path"`     // 文件路径
	Name     string  `json:"name"`     // 文件名
	Size     int64   `json:"size"`     // 文件大小(字节)
	Duration float64 `json:"duration"` // 音频时长(秒)
	Format   string  `json:"format"`   // 音频格式
	SampleRate int  `json:"sampleRate"` // 采样率
	Channels int    `json:"channels"`   // 声道数
	BitRate  int    `json:"bitRate"`    // 比特率
}

// RecognitionConfig 识别配置
type RecognitionConfig struct {
	Language           string  `json:"language"`            // 识别语言
	ModelPath          string  `json:"modelPath"`           // 模型路径
	SpecificModelFile  string  `json:"specificModelFile"`  // 具体指定的模型文件
	SampleRate         int     `json:"sampleRate"`          // 采样率
	BufferSize         int     `json:"bufferSize"`          // 缓冲区大小
	ConfidenceThreshold float64 `json:"confidenceThreshold"` // 置信度阈值
	MaxAlternatives    int     `json:"maxAlternatives"`     // 最大候选数
	EnableWordTimestamp bool   `json:"enableWordTimestamp"` // 启用词汇时间戳
}

// ExportFormat 导出格式
type ExportFormat string

const (
	ExportFormatTXT  ExportFormat = "txt"  // 纯文本
	ExportFormatSRT  ExportFormat = "srt"  // SRT字幕
	ExportFormatVTT  ExportFormat = "vtt"  // WebVTT
	ExportFormatJSON ExportFormat = "json" // JSON
)

// ExportOptions 导出选项
type ExportOptions struct {
	Format           ExportFormat `json:"format"`            // 导出格式
	IncludeTimestamp bool         `json:"includeTimestamp"`  // 包含时间戳
	IncludeConfidence bool        `json:"includeConfidence"` // 包含置信度
	OutputEncoding   string       `json:"outputEncoding"`    // 输出编码
	SplitText        bool         `json:"splitText"`         // 分段文本
	MaxLineLength    int          `json:"maxLineLength"`     // 最大行长度
}