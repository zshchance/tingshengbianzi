package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"audio-recognizer/backend/models"
)

// 特殊标记类型常量
const (
	MarkTypeEmphasis = "emphasis" // 强调
	MarkTypePause    = "pause"    // 停顿
	MarkTypeUnclear  = "unclear"  // 不清晰
	MarkTypeMusic    = "music"    // 音乐
	MarkTypeSpeaker  = "speaker"  // 说话人
	MarkTypeLanguage = "language" // 语言
)

// AIPromptTemplate AI提示词模板结构体
type AIPromptTemplate struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Template    string `json:"template"`
}

// TemplatesConfig 模板配置文件结构体
type TemplatesConfig struct {
	AIPrompts        map[string]AIPromptTemplate `json:"ai_prompts"`
	DefaultTemplate  string                     `json:"defaultTemplate"`
	Version          string                     `json:"version"`
	LastUpdated      string                     `json:"last_updated"`
	Description      string                     `json:"description"`

	// 兼容旧格式
	AIOptimizationTemplates map[string]AIPromptTemplate `json:"aiOptimizationTemplates,omitempty"`
}

// 模板管理器
var (
	templateManager = &TemplateManager{
		templates: make(map[string]AIPromptTemplate),
		mutex:     sync.RWMutex{},
	}
)

// TemplateManager 模板管理器
type TemplateManager struct {
	templates       map[string]AIPromptTemplate
	defaultTemplate string
	mutex           sync.RWMutex
	loaded          bool
}

// 停顿时长类型
const (
	PauseShort  = "short" // 短停顿 (< 1秒)
	PauseMedium = "medium" // 中停顿 (1-2秒)
	PauseLong   = "long"   // 长停顿 (> 2秒)
)

// SpecialMarkFormatter 特殊标记格式化器
type SpecialMarkFormatter struct {
	marks []models.SpecialMark
}

// NewSpecialMarkFormatter 创建新的特殊标记格式化器
func NewSpecialMarkFormatter() *SpecialMarkFormatter {
	return &SpecialMarkFormatter{
		marks: make([]models.SpecialMark, 0),
	}
}

// AddMark 添加特殊标记
func (f *SpecialMarkFormatter) AddMark(mark models.SpecialMark) {
	f.marks = append(f.marks, mark)
}

// AddEmphasisMark 添加强调标记
func (f *SpecialMarkFormatter) AddEmphasisMark(start, end float64, content string) {
	mark := models.SpecialMark{
		Type:      MarkTypeEmphasis,
		StartTime: start,
		EndTime:   end,
		Content:   content,
		Metadata:  make(map[string]interface{}),
	}
	f.AddMark(mark)
}

// AddPauseMark 添加停顿标记
func (f *SpecialMarkFormatter) AddPauseMark(start, end float64) {
	duration := end - start
	var pauseType string
	switch {
	case duration < 1.0:
		pauseType = PauseShort
	case duration < 2.0:
		pauseType = PauseMedium
	default:
		pauseType = PauseLong
	}

	mark := models.SpecialMark{
		Type:      MarkTypePause,
		StartTime: start,
		EndTime:   end,
		Content:   pauseType,
		Metadata: map[string]interface{}{
			"duration": duration,
		},
	}
	f.AddMark(mark)
}

// AddUnclearMark 添加不清晰标记
func (f *SpecialMarkFormatter) AddUnclearMark(start, end float64, unclearText string) {
	mark := models.SpecialMark{
		Type:      MarkTypeUnclear,
		StartTime: start,
		EndTime:   end,
		Content:   unclearText,
		Metadata:  make(map[string]interface{}),
	}
	f.AddMark(mark)
}

// AddMusicMark 添加音乐标记
func (f *SpecialMarkFormatter) AddMusicMark(start, end float64, description string) {
	mark := models.SpecialMark{
		Type:      MarkTypeMusic,
		StartTime: start,
		EndTime:   end,
		Content:   description,
		Metadata:  make(map[string]interface{}),
	}
	f.AddMark(mark)
}

// AddSpeakerMark 添加说话人标记
func (f *SpecialMarkFormatter) AddSpeakerMark(start, end float64, speakerName string) {
	mark := models.SpecialMark{
		Type:      MarkTypeSpeaker,
		StartTime: start,
		EndTime:   end,
		Content:   speakerName,
		Metadata:  make(map[string]interface{}),
	}
	f.AddMark(mark)
}

// AddLanguageMark 添加语言标记
func (f *SpecialMarkFormatter) AddLanguageMark(start, end float64, language string) {
	mark := models.SpecialMark{
		Type:      MarkTypeLanguage,
		StartTime: start,
		EndTime:   end,
		Content:   language,
		Metadata:  make(map[string]interface{}),
	}
	f.AddMark(mark)
}

// FormatWithMarks 格式化文本并插入特殊标记
func (f *SpecialMarkFormatter) FormatWithMarks(text string, words []models.Word) string {
	if len(f.marks) == 0 {
		return text
	}

	// 对标记按时间排序
	sortedMarks := make([]models.SpecialMark, len(f.marks))
	copy(sortedMarks, f.marks)

	// 简单的按开始时间排序
	for i := 0; i < len(sortedMarks)-1; i++ {
		for j := i + 1; j < len(sortedMarks); j++ {
			if sortedMarks[i].StartTime > sortedMarks[j].StartTime {
				sortedMarks[i], sortedMarks[j] = sortedMarks[j], sortedMarks[i]
			}
		}
	}

	result := text

	// 按时间倒序处理，避免插入位置偏移
	for i := len(sortedMarks) - 1; i >= 0; i-- {
		mark := sortedMarks[i]
		_ = f.formatMark(mark) // 标记格式化，但当前简化实现不直接使用

		// 在文本中插入标记
		if mark.StartTime >= 0 && mark.EndTime <= float64(len(words)) {
			startPos := f.findWordPosition(words, mark.StartTime)
			endPos := f.findWordPosition(words, mark.EndTime)

			if startPos >= 0 && endPos > startPos {
				// 在对应位置插入标记
				result = f.insertMarkAtPosition(result, mark, startPos, endPos)
			}
		}
	}

	return result
}

// formatMark 格式化单个标记
func (f *SpecialMarkFormatter) formatMark(mark models.SpecialMark) string {
	var markText string
	switch mark.Type {
	case MarkTypeEmphasis:
		markText = fmt.Sprintf("【强调】%s【/强调】", mark.Content)
	case MarkTypePause:
		duration := mark.EndTime - mark.StartTime
		if duration < 1.0 {
			markText = "【停顿·短】"
		} else if duration < 2.0 {
			markText = "【停顿·中】"
		} else {
			markText = "【停顿·长】"
		}
	case MarkTypeUnclear:
		markText = fmt.Sprintf("【不清:%s】", mark.Content)
	case MarkTypeMusic:
		markText = "【音乐】" + mark.Content + "【/音乐】"
	case MarkTypeSpeaker:
		markText = fmt.Sprintf("【说话人:%s】", mark.Content)
	case MarkTypeLanguage:
		markText = fmt.Sprintf("【语言:%s】", mark.Content)
	default:
		markText = fmt.Sprintf("【%s】", mark.Content)
	}
	return markText
}

// findWordPosition 根据时间找到词汇位置
func (f *SpecialMarkFormatter) findWordPosition(words []models.Word, targetTime float64) int {
	for i, word := range words {
		if word.Start >= targetTime {
			return i
		}
	}
	return len(words) - 1
}

// insertMarkAtPosition 在指定位置插入标记
func (f *SpecialMarkFormatter) insertMarkAtPosition(text string, mark models.SpecialMark, startPos, endPos int) string {
	// 这是一个简化的实现，实际应该基于词汇边界处理
	// 对于复杂情况，建议在构建结果时就处理标记
	return text
}

// GetMarks 获取所有标记
func (f *SpecialMarkFormatter) GetMarks() []models.SpecialMark {
	return f.marks
}

// ClearMarks 清除所有标记
func (f *SpecialMarkFormatter) ClearMarks() {
	f.marks = make([]models.SpecialMark, 0)
}

// DetectPauses 自动检测停顿
func DetectPauses(words []models.Word, threshold float64) []models.SpecialMark {
	var pauses []models.SpecialMark

	if len(words) < 2 {
		return pauses
	}

	for i := 1; i < len(words); i++ {
		gap := words[i].Start - words[i-1].End
		if gap >= threshold {
			pause := models.SpecialMark{
				Type:      MarkTypePause,
				StartTime: words[i-1].End,
				EndTime:   words[i].Start,
				Content:   "",
				Metadata: map[string]interface{}{
					"duration": gap,
					"detect_method": "auto",
				},
			}
			pauses = append(pauses, pause)
		}
	}

	return pauses
}

// DetectUnclearWords 检测可能不清晰的词汇（基于置信度）
func DetectUnclearWords(words []models.Word, confidenceThreshold float64) []models.SpecialMark {
	var unclearMarks []models.SpecialMark

	for _, word := range words {
		if word.Confidence < confidenceThreshold {
			mark := models.SpecialMark{
				Type:      MarkTypeUnclear,
				StartTime: word.Start,
				EndTime:   word.End,
				Content:   word.Text,
				Metadata: map[string]interface{}{
					"confidence": word.Confidence,
					"detect_method": "confidence",
				},
			}
			unclearMarks = append(unclearMarks, mark)
		}
	}

	return unclearMarks
}

// ParseTextWithMarks 解析包含特殊标记的文本
func ParseTextWithMarks(text string) (string, []models.SpecialMark) {
	var marks []models.SpecialMark

	// 解析强调标记
	emphasisPattern := `\【强调】(.*?)\【/强调】`
	emphasisRe := regexp.MustCompile(emphasisPattern)
	matches := emphasisRe.FindAllStringSubmatch(text, -1)
	for _, match := range matches {
		if len(match) > 1 {
			// 这里应该提取时间信息，但由于标记中不包含时间，暂时跳过
			// 实际实现可能需要更复杂的解析逻辑
		}
	}

	// 解析其他标记类型...
	// 类似地解析停顿、不清晰、音乐等标记

	// 移除标记，返回纯文本
	cleanText := text
	cleanText = regexp.MustCompile(`\【[^】]*\】`).ReplaceAllString(cleanText, "")
	cleanText = strings.TrimSpace(cleanText)

	return cleanText, marks
}

// LoadTemplates 加载模板配置文件
func (tm *TemplateManager) LoadTemplates(configPath string) error {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	// 如果配置文件路径为空，使用默认路径
	if configPath == "" {
		configPath = "config/templates.json"
	}

	// 尝试解析路径，如果是相对路径则基于当前工作目录
	if !filepath.IsAbs(configPath) {
		wd, err := os.Getwd()
		if err != nil {
			return fmt.Errorf("获取当前工作目录失败: %v", err)
		}
		configPath = filepath.Join(wd, configPath)
	}

	// 检查文件是否存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return fmt.Errorf("模板配置文件不存在: %s", configPath)
	}

	// 读取配置文件
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("读取模板配置文件失败: %v", err)
	}

	// 解析JSON
	var config TemplatesConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("解析模板配置文件失败: %v", err)
	}

	// 加载新的模板格式
	if len(config.AIPrompts) > 0 {
		tm.templates = config.AIPrompts
		tm.defaultTemplate = config.DefaultTemplate
	} else if len(config.AIOptimizationTemplates) > 0 {
		// 兼容旧格式
		tm.templates = config.AIOptimizationTemplates
		tm.defaultTemplate = config.DefaultTemplate
	} else {
		return fmt.Errorf("配置文件中没有找到有效的模板数据")
	}

	// 如果没有默认模板，使用第一个模板
	if tm.defaultTemplate == "" && len(tm.templates) > 0 {
		for key := range tm.templates {
			tm.defaultTemplate = key
			break
		}
	}

	tm.loaded = true
	fmt.Printf("成功加载 %d 个AI提示词模板，默认模板: %s\n", len(tm.templates), tm.defaultTemplate)
	return nil
}

// GetTemplate 获取指定模板
func (tm *TemplateManager) GetTemplate(templateKey string) (AIPromptTemplate, bool) {
	fmt.Printf("🔍 GetTemplate: 请求获取模板 '%s'\n", templateKey)

	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	fmt.Printf("📊 GetTemplate: 模板管理器状态 - 已加载: %t, 模板总数: %d\n", tm.loaded, len(tm.templates))

	if !tm.loaded {
		fmt.Printf("🔄 GetTemplate: 模板未加载，尝试自动加载\n")
		// 尝试自动加载
		if err := tm.LoadTemplates(""); err != nil {
			fmt.Printf("❌ GetTemplate: 自动加载模板失败: %v\n", err)
		} else {
			fmt.Printf("✅ GetTemplate: 自动加载成功，模板总数: %d\n", len(tm.templates))
		}
	}

	// 列出所有可用的模板键
	if len(tm.templates) > 0 {
		keys := make([]string, 0, len(tm.templates))
		for k := range tm.templates {
			keys = append(keys, k)
		}
		fmt.Printf("📋 GetTemplate: 当前可用模板键: %v\n", keys)
	}

	template, exists := tm.templates[templateKey]
	fmt.Printf("🎯 GetTemplate: 模板 '%s' 查找结果: %t\n", templateKey, exists)

	if exists {
		fmt.Printf("✅ GetTemplate: 找到模板 - 名称: %s, 描述: %s, 长度: %d\n",
			template.Name, template.Description, len(template.Template))
	}

	return template, exists
}

// GetDefaultTemplate 获取默认模板
func (tm *TemplateManager) GetDefaultTemplate() (AIPromptTemplate, bool) {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	if !tm.loaded {
		// 尝试自动加载
		if err := tm.LoadTemplates(""); err != nil {
			fmt.Printf("自动加载模板失败: %v\n", err)
		}
	}

	if tm.defaultTemplate == "" {
		return AIPromptTemplate{}, false
	}

	template, exists := tm.templates[tm.defaultTemplate]
	return template, exists
}

// GetAllTemplates 获取所有模板
func (tm *TemplateManager) GetAllTemplates() map[string]AIPromptTemplate {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	if !tm.loaded {
		// 尝试自动加载
		if err := tm.LoadTemplates(""); err != nil {
			fmt.Printf("自动加载模板失败: %v\n", err)
		}
	}

	// 返回副本避免外部修改
	result := make(map[string]AIPromptTemplate)
	for key, template := range tm.templates {
		result[key] = template
	}
	return result
}

// GetAvailableTemplateKeys 获取可用的模板键列表
func (tm *TemplateManager) GetAvailableTemplateKeys() []string {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	if !tm.loaded {
		// 尝试自动加载
		if err := tm.LoadTemplates(""); err != nil {
			fmt.Printf("自动加载模板失败: %v\n", err)
		}
	}

	keys := make([]string, 0, len(tm.templates))
	for key := range tm.templates {
		keys = append(keys, key)
	}
	return keys
}

// FormatAIPrompt 根据模板类型格式化AI优化提示词
func FormatAIPrompt(result *models.RecognitionResult, templateKey string) string {
	if result == nil {
		fmt.Printf("🚨 FormatAIPrompt: 识别结果为nil\n")
		return ""
	}

	fmt.Printf("🔧 FormatAIPrompt: 开始处理模板请求\n")
	fmt.Printf("📝 请求的模板类型: %s\n", templateKey)
	fmt.Printf("📄 识别文本长度: %d 字符\n", len(result.Text))
	fmt.Printf("📊 识别结果段落数: %d\n", len(result.Segments))

	// 如果没有指定模板，使用默认模板
	if templateKey == "" {
		templateKey = "basic" // 默认使用基础模板
		fmt.Printf("🔄 模板类型为空，使用默认模板: %s\n", templateKey)
	}

	// 获取模板管理器状态
	templateManager := GetTemplateManager()
	availableKeys := templateManager.GetAvailableTemplateKeys()
	fmt.Printf("📚 可用模板列表: %v\n", availableKeys)
	fmt.Printf("🎯 当前默认模板: %s\n", templateManager.defaultTemplate)
	fmt.Printf("✅ 模板管理器已加载: %t\n", templateManager.loaded)

	// 获取模板
	template, exists := templateManager.GetTemplate(templateKey)
	fmt.Printf("🔍 模板查找结果 - 存在: %t\n", exists)

	if !exists {
		fmt.Printf("⚠️  指定模板 '%s' 不存在，尝试获取默认模板\n", templateKey)
		// 如果指定模板不存在，尝试获取默认模板
		defaultTemplate, hasDefault := templateManager.GetDefaultTemplate()
		fmt.Printf("🔍 默认模板查找结果 - 存在: %t\n", hasDefault)

		if !hasDefault {
			fmt.Printf("❌ 默认模板也不存在，使用硬编码备用模板\n")
			// 如果默认模板也不存在，使用硬编码的备用模板
			return getFallbackPrompt(result.Text)
		}
		template = defaultTemplate
		fmt.Printf("✅ 使用默认模板: %s\n", template.Name)
	} else {
		fmt.Printf("✅ 成功获取指定模板: %s (%s)\n", template.Name, template.Description)
	}

	// 输出模板信息
	fmt.Printf("📋 模板名称: %s\n", template.Name)
	fmt.Printf("📝 模板描述: %s\n", template.Description)
	fmt.Printf("📏 模板长度: %d 字符\n", len(template.Template))

	// 检查模板是否包含占位符
	if strings.Contains(template.Template, "【RECOGNITION_TEXT】") {
		fmt.Printf("✅ 模板包含正确的占位符: 【RECOGNITION_TEXT】\n")
	} else {
		fmt.Printf("⚠️  模板不包含占位符: 【RECOGNITION_TEXT】\n")
	}

	// 替换占位符
	formattedText := strings.ReplaceAll(template.Template, "【RECOGNITION_TEXT】", result.Text)
	fmt.Printf("🔄 占位符替换完成，最终提示词长度: %d 字符\n", len(formattedText))

	// 输出最终提示词的前200个字符用于调试
	if len(formattedText) > 200 {
		fmt.Printf("📄 最终提示词预览: %s...\n", formattedText[:200])
	} else {
		fmt.Printf("📄 最终提示词: %s\n", formattedText)
	}

	return formattedText
}

// getFallbackPrompt 获取备用硬编码提示词（向后兼容）
func getFallbackPrompt(text string) string {
	basePrompt := `请优化以下音频识别结果，要求：

1. 基础优化
   - 修正明显的错别字和语法错误
   - 优化断句和标点符号
   - 保持语义完整性和连贯性

2. 标记处理
   - 保留所有时间标记 [HH:MM:SS.mmm] 不变
   - 处理特殊标记：
     * 【强调】...【/强调】→ 保留并优化强调内容
     * 【不清:xxx】→ 根据上下文推测或标记为[听不清]
     * 【音乐】...【/音乐】→ 保留音乐片段标记
     * 【停顿·短/中/长】→ 转换为合适的标点符号

3. 内容优化
   - 修正专业术语和专有名词
   - 优化口语化表达
   - 保持原文语气和风格
   - 识别并标记重要信息

4. 输出格式
   - 保持原有时间标记格式
   - 使用规范的标点符号
   - 段落清晰，便于阅读

原始识别结果：
【RECOGNITION_TEXT】

优化后的文本：`

	return strings.ReplaceAll(basePrompt, "【RECOGNITION_TEXT】", text)
}

// GetTemplateManager 获取全局模板管理器实例
func GetTemplateManager() *TemplateManager {
	return templateManager
}

// InitializeTemplates 初始化模板系统
func InitializeTemplates(configPath string) error {
	return templateManager.LoadTemplates(configPath)
}