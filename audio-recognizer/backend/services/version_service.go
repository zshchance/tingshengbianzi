package services

import (
	"fmt"
	"runtime"
	"time"
)

// VersionService 版本信息服务
type VersionService struct {
	version     string
	buildDate   string
	buildInfo   string
	appName     string
	gitCommit   string
	gitBranch   string
	goVersion   string
	buildOS     string
	buildArch   string
}

// VersionInfo 版本信息结构
type VersionInfo struct {
	Version     string `json:"version"`
	BuildDate   string `json:"buildDate"`
	BuildInfo   string `json:"buildInfo"`
	AppName     string `json:"appName"`
	FullName    string `json:"fullName"`
	GitCommit   string `json:"gitCommit,omitempty"`
	GitBranch   string `json:"gitBranch,omitempty"`
	GoVersion   string `json:"goVersion"`
	BuildOS     string `json:"buildOS"`
	BuildArch   string `json:"buildArch"`
	UpTime      string `json:"upTime,omitempty"`
	StartTime   string `json:"startTime,omitempty"`
}

// NewVersionService 创建版本信息服务
func NewVersionService() *VersionService {
	return &VersionService{
		version:   "2.1.0",
		buildDate: time.Now().Format("2006-01-02"),
		buildInfo: "Wails v2",
		appName:   "听声辨字",
		goVersion: runtime.Version(),
		buildOS:   runtime.GOOS,
		buildArch: runtime.GOARCH,
		gitCommit: getGitCommit(),
		gitBranch: getGitBranch(),
	}
}

// NewVersionServiceWithDefaults 使用默认值创建版本信息服务
func NewVersionServiceWithDefaults(version, buildDate, buildInfo string) *VersionService {
	return &VersionService{
		version:   version,
		buildDate: buildDate,
		buildInfo: buildInfo,
		appName:   "听声辨字",
		goVersion: runtime.Version(),
		buildOS:   runtime.GOOS,
		buildArch: runtime.GOARCH,
		gitCommit: getGitCommit(),
		gitBranch: getGitBranch(),
	}
}

// GetVersionInfo 获取版本信息
func (s *VersionService) GetVersionInfo() map[string]interface{} {
	info := VersionInfo{
		Version:     s.version,
		BuildDate:   s.buildDate,
		BuildInfo:   s.buildInfo,
		AppName:     s.appName,
		FullName:    fmt.Sprintf("%s v%s", s.appName, s.version),
		GoVersion:   s.goVersion,
		BuildOS:     s.buildOS,
		BuildArch:   s.buildArch,
	}

	// 添加可选字段
	if s.gitCommit != "" {
		info.GitCommit = s.gitCommit
	}
	if s.gitBranch != "" {
		info.GitBranch = s.gitBranch
	}

	// 转换为map返回
	result := map[string]interface{}{
		"version":     info.Version,
		"buildDate":   info.BuildDate,
		"buildInfo":   info.BuildInfo,
		"appName":     info.AppName,
		"fullName":    info.FullName,
		"goVersion":   info.GoVersion,
		"buildOS":     info.BuildOS,
		"buildArch":   info.BuildArch,
	}

	// 添加可选字段
	if info.GitCommit != "" {
		result["gitCommit"] = info.GitCommit
	}
	if info.GitBranch != "" {
		result["gitBranch"] = info.GitBranch
	}

	return result
}

// GetVersionInfoWithUptime 获取包含运行时间的版本信息
func (s *VersionService) GetVersionInfoWithUptime(startTime time.Time) map[string]interface{} {
	info := s.GetVersionInfo()

	uptime := time.Since(startTime)
	info["upTime"] = formatUptime(uptime)
	info["startTime"] = startTime.Format("2006-01-02 15:04:05")

	return info
}

// SetVersion 设置版本信息
func (s *VersionService) SetVersion(version, buildDate, buildInfo string) {
	s.version = version
	s.buildDate = buildDate
	s.buildInfo = buildInfo
}

// SetAppName 设置应用名称
func (s *VersionService) SetAppName(appName string) {
	s.appName = appName
}

// SetGitInfo 设置Git信息
func (s *VersionService) SetGitInfo(commit, branch string) {
	s.gitCommit = commit
	s.gitBranch = branch
}

// GetVersion 获取版本号
func (s *VersionService) GetVersion() string {
	return s.version
}

// GetBuildDate 获取构建日期
func (s *VersionService) GetBuildDate() string {
	return s.buildDate
}

// GetBuildInfo 获取构建信息
func (s *VersionService) GetBuildInfo() string {
	return s.buildInfo
}

// GetAppName 获取应用名称
func (s *VersionService) GetAppName() string {
	return s.appName
}

// GetFullName 获取完整应用名称（包含版本号）
func (s *VersionService) GetFullName() string {
	return fmt.Sprintf("%s v%s", s.appName, s.version)
}

// GetSystemInfo 获取系统信息
func (s *VersionService) GetSystemInfo() map[string]interface{} {
	return map[string]interface{}{
		"goVersion": runtime.Version(),
		"goOS":      runtime.GOOS,
		"goArch":    runtime.GOARCH,
		"numCPU":    runtime.NumCPU(),
		"numGoroutine": runtime.NumGoroutine(),
	}
}

// IsDevelopmentVersion 检查是否为开发版本
func (s *VersionService) IsDevelopmentVersion() bool {
	return s.version == "dev" || s.version == "development" ||
		s.buildDate == "development" || s.buildInfo == "development"
}

// GetVersionComparison 比较版本号
func (s *VersionService) GetVersionComparison(otherVersion string) int {
	return compareVersions(s.version, otherVersion)
}

// 内部辅助函数

// getGitCommit 获取Git提交哈希
func getGitCommit() string {
	// 在实际项目中，可以通过构建时注入或运行时读取
	// 这里返回空字符串，可以在构建时通过 -ldflags 注入
	return ""
}

// getGitBranch 获取Git分支
func getGitBranch() string {
	// 在实际项目中，可以通过构建时注入或运行时读取
	// 这里返回空字符串，可以在构建时通过 -ldflags 注入
	return ""
}

// formatUptime 格式化运行时间
func formatUptime(duration time.Duration) string {
	days := int(duration.Hours()) / 24
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60
	seconds := int(duration.Seconds()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm %ds", days, hours, minutes, seconds)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	} else {
		return fmt.Sprintf("%ds", seconds)
	}
}

// compareVersions 简单的版本号比较函数
func compareVersions(v1, v2 string) int {
	// 简单实现，实际项目中可以使用更复杂的版本比较逻辑
	if v1 == v2 {
		return 0
	}
	if v1 > v2 {
		return 1
	}
	return -1
}