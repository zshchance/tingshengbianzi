package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// WailsConfig Wails配置文件结构
type WailsConfig struct {
	Schema           string            `json:"$schema"`
	Name             string            `json:"name"`
	OutputFilename   string            `json:"outputfilename"`
	Author           AuthorInfo        `json:"author"`
	Info             ProductInfo       `json:"info"`
	Icon             string            `json:"icon"`
	Frontend         map[string]string `json:"frontend,omitempty"`
}

// AuthorInfo 作者信息
type AuthorInfo struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// ProductInfo 产品信息
type ProductInfo struct {
	CompanyName   string `json:"companyName"`
	ProductName   string `json:"productName"`
	ProductVersion string `json:"productVersion"`
	Copyright     string `json:"copyright"`
	Comments      string `json:"comments"`
}

// ConfigService 配置服务
type ConfigService struct {
	projectRoot string
	config      *WailsConfig
}

// NewConfigService 创建配置服务
func NewConfigService() *ConfigService {
	return &ConfigService{
		projectRoot: ".", // 默认当前目录
		config:      nil,
	}
}

// NewConfigServiceWithPath 创建带路径的配置服务
func NewConfigServiceWithPath(projectRoot string) *ConfigService {
	return &ConfigService{
		projectRoot: projectRoot,
		config:      nil,
	}
}

// LoadConfig 加载Wails配置文件
func (s *ConfigService) LoadConfig() error {
	configPath := filepath.Join(s.projectRoot, "wails.json")

	// 检查文件是否存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return fmt.Errorf("wails.json 文件不存在: %s", configPath)
	}

	// 读取文件
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("读取wails.json失败: %v", err)
	}

	// 解析JSON
	var config WailsConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("解析wails.json失败: %v", err)
	}

	s.config = &config
	return nil
}

// GetVersion 获取版本号
func (s *ConfigService) GetVersion() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	if s.config.Info.ProductVersion == "" {
		return "0.0.0"
	}

	return s.config.Info.ProductVersion
}

// GetAppName 获取应用名称
func (s *ConfigService) GetAppName() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Info.ProductName
}

// GetFullName 获取完整应用名称（包含版本号）
func (s *ConfigService) GetFullName() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	appName := s.config.Info.ProductName
	version := s.config.Info.ProductVersion

	if version == "" {
		return appName
	}

	return fmt.Sprintf("%s v%s", appName, version)
}

// GetCompanyName 获取公司名称
func (s *ConfigService) GetCompanyName() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Info.CompanyName
}

// GetCopyright 获取版权信息
func (s *ConfigService) GetCopyright() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Info.Copyright
}

// GetComments 获取备注信息
func (s *ConfigService) GetComments() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Info.Comments
}

// GetAuthorName 获取作者名称
func (s *ConfigService) GetAuthorName() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Author.Name
}

// GetAuthorEmail 获取作者邮箱
func (s *ConfigService) GetAuthorEmail() string {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return "unknown"
		}
	}

	return s.config.Author.Email
}

// IsConfigLoaded 检查配置是否已加载
func (s *ConfigService) IsConfigLoaded() bool {
	return s.config != nil
}

// ReloadConfig 重新加载配置
func (s *ConfigService) ReloadConfig() error {
	s.config = nil
	return s.LoadConfig()
}

// SetProjectRoot 设置项目根目录
func (s *ConfigService) SetProjectRoot(projectRoot string) {
	s.projectRoot = projectRoot
	s.config = nil // 清除缓存配置
}

// GetVersionInfo 获取版本信息（兼容VersionService接口）
func (s *ConfigService) GetVersionInfo() map[string]interface{} {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return map[string]interface{}{
				"version":  "unknown",
				"appName":  "unknown",
				"fullName": "unknown",
			}
		}
	}

	version := s.config.Info.ProductVersion
	if version == "" {
		version = "0.0.0"
	}

	appName := s.config.Info.ProductName
	fullName := appName
	if version != "" && version != "0.0.0" {
		fullName = fmt.Sprintf("%s v%s", appName, version)
	}

	return map[string]interface{}{
		"version":     version,
		"appName":     appName,
		"fullName":    fullName,
		"buildDate":   "", // 配置文件中没有构建日期，由其他服务提供
		"buildInfo":   "", // 配置文件中没有构建信息，由其他服务提供
		"companyName": s.config.Info.CompanyName,
		"copyright":   s.config.Info.Copyright,
		"comments":    s.config.Info.Comments,
	}
}

// GetConfigPath 获取配置文件路径
func (s *ConfigService) GetConfigPath() string {
	return filepath.Join(s.projectRoot, "wails.json")
}

// ValidateConfig 验证配置文件
func (s *ConfigService) ValidateConfig() error {
	if s.config == nil {
		if err := s.LoadConfig(); err != nil {
			return err
		}
	}

	// 验证必需字段
	if s.config.Info.ProductName == "" {
		return fmt.Errorf("productName 不能为空")
	}

	if s.config.Info.ProductVersion == "" {
		return fmt.Errorf("productVersion 不能为空")
	}

	// 验证版本号格式
	if !strings.Contains(s.config.Info.ProductVersion, ".") {
		return fmt.Errorf("productVersion 格式无效，应为 x.y.z 格式")
	}

	return nil
}