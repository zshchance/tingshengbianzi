package path

import "embed"

// EnvironmentType 运行环境类型
type EnvironmentType int

const (
	EnvironmentDevelopment EnvironmentType = iota // 开发环境
	EnvironmentPortable                           // 便携版
	EnvironmentInstalled                          // 安装版
)

// ProjectMarkers 项目根目录标识文件
var ProjectMarkers = []string{"wails.json", "go.mod", "main.go"}

// DependencyFile 依赖文件定义
type DependencyFile struct {
	EmbedPath string   // 嵌入路径
	FileName  string   // 文件名
	Targets   []string // 目标路径列表（按优先级排序）
}

// DependencyManagerConfig 依赖管理器配置
type DependencyManagerConfig struct {
	FS           embed.FS     // 嵌入文件系统
	TargetFinder TargetFinder // 目标路径查找器
}

// TargetFinder 目标路径查找器接口
type TargetFinder interface {
	FindThirdPartyTargetDirectory() (string, error)
	FindTemplateTargetDirectory() (string, error)
}

// PathManagerConfig 路径管理器配置
type PathManagerConfig struct {
	FS embed.FS // 嵌入文件系统
}

// ExtractionResult 文件提取结果
type ExtractionResult struct {
	Success    bool
	ExtractedCount int
	FailedFiles []string
	TargetDir   string
}