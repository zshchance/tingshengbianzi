package utils

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// FormatTimestamp 格式化时间戳为 [HH:MM:SS.mmm] 格式
func FormatTimestamp(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}

	// 计算时、分、秒、毫秒
	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	milliseconds := int((seconds - math.Floor(seconds)) * 1000)

	return fmt.Sprintf("[%02d:%02d:%02d.%03d]", hours, minutes, secs, milliseconds)
}

// FormatTimestampNoBrackets 格式化时间戳但不包含方括号
func FormatTimestampNoBrackets(seconds float64) string {
	timestamp := FormatTimestamp(seconds)
	return strings.Trim(timestamp, "[]")
}

// ParseTimestamp 解析 [HH:MM:SS.mmm] 格式的时间戳
func ParseTimestamp(timestamp string) (float64, error) {
	// 移除方括号
	timestamp = strings.TrimSpace(timestamp)
	timestamp = strings.Trim(timestamp, "[]")

	// 解析时间格式
	parts := strings.Split(timestamp, ":")
	if len(parts) != 3 {
		return 0, fmt.Errorf("invalid timestamp format: %s", timestamp)
	}

	// 解析小时
	hours, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid hours: %s", parts[0])
	}

	// 解析分钟和秒（包含毫秒）
	minSecParts := strings.Split(parts[2], ".")
	if len(minSecParts) != 2 {
		return 0, fmt.Errorf("invalid seconds format: %s", parts[2])
	}

	minutes, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid minutes: %s", parts[1])
	}

	seconds, err := strconv.Atoi(minSecParts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid seconds: %s", minSecParts[0])
	}

	milliseconds, err := strconv.Atoi(minSecParts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid milliseconds: %s", minSecParts[1])
	}

	totalSeconds := float64(hours*3600+minutes*60+seconds) + float64(milliseconds)/1000.0
	return totalSeconds, nil
}

// FormatDuration 格式化持续时间为 HH:MM:SS 格式
func FormatDuration(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}

	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60

	if hours > 0 {
		return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
	}
	return fmt.Sprintf("%02d:%02d", minutes, secs)
}

// ParseSRTTime 解析SRT时间格式 (HH:MM:SS,mmm)
func ParseSRTTime(timeStr string) (float64, error) {
	// 移除空格
	timeStr = strings.TrimSpace(timeStr)

	// 分割小时、分钟、秒和毫秒
	parts := strings.Split(timeStr, ":")
	if len(parts) != 3 {
		return 0, fmt.Errorf("invalid SRT time format: %s", timeStr)
	}

	hours, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid hours: %s", parts[0])
	}

	minutes, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid minutes: %s", parts[1])
	}

	// 处理秒和毫秒
	secMsParts := strings.Split(parts[2], ",")
	if len(secMsParts) != 2 {
		return 0, fmt.Errorf("invalid seconds/milliseconds format: %s", parts[2])
	}

	seconds, err := strconv.Atoi(secMsParts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid seconds: %s", secMsParts[0])
	}

	milliseconds, err := strconv.Atoi(secMsParts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid milliseconds: %s", secMsParts[1])
	}

	totalSeconds := float64(hours*3600+minutes*60+seconds) + float64(milliseconds)/1000.0
	return totalSeconds, nil
}

// FormatSRTTime 格式化为SRT时间格式 (HH:MM:SS,mmm)
func FormatSRTTime(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}

	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	milliseconds := int((seconds - math.Floor(seconds)) * 1000)

	return fmt.Sprintf("%02d:%02d:%02d,%03d", hours, minutes, secs, milliseconds)
}

// FormatWebVTTTime 格式化为WebVTT时间格式 (HH:MM:SS.mmm)
func FormatWebVTTTime(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}

	hours := int(seconds) / 3600
	minutes := (int(seconds) % 3600) / 60
	secs := int(seconds) % 60
	milliseconds := int((seconds - math.Floor(seconds)) * 1000)

	return fmt.Sprintf("%02d:%02d:%02d.%03d", hours, minutes, secs, milliseconds)
}

// ContainsTimestamp 检查文本是否包含时间戳
func ContainsTimestamp(text string) bool {
	timestampPattern := `\[\d{2}:\d{2}:\d{2}\.\d{3}\]`
	matched, _ := regexp.MatchString(timestampPattern, text)
	return matched
}

// ExtractTimestamps 提取文本中的所有时间戳
func ExtractTimestamps(text string) []string {
	timestampPattern := `\[\d{2}:\d{2}:\d{2}\.\d{3}\]`
	re := regexp.MustCompile(timestampPattern)
	return re.FindAllString(text, -1)
}

// GetTimeFromTimestamp 从时间戳字符串中提取秒数
func GetTimeFromTimestamp(timestamp string) (float64, error) {
	return ParseTimestamp(timestamp)
}

// AddTimeToText 在文本开头添加时间戳
func AddTimeToText(text string, seconds float64) string {
	timestamp := FormatTimestamp(seconds)
	return fmt.Sprintf("%s %s", timestamp, text)
}

// RemoveTimestampsFromText 从文本中移除所有时间戳
func RemoveTimestampsFromText(text string) string {
	timestampPattern := `\s*\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s*`
	re := regexp.MustCompile(timestampPattern)
	return strings.TrimSpace(re.ReplaceAllString(text, " "))
}

// GetDurationForWord 根据词数估算持续时间（秒）
func GetDurationForWord(wordCount int) float64 {
	// 平均语速：每分钟150-180个词
	wordsPerSecond := 2.5 // 平均值
	return float64(wordCount) / wordsPerSecond
}

// ValidateTimestamp 验证时间戳格式是否正确
func ValidateTimestamp(timestamp string) bool {
	timestampPattern := `^\[\d{2}:\d{2}:\d{2}\.\d{3}\]$`
	matched, _ := regexp.MatchString(timestampPattern, timestamp)
	return matched
}

// GetCurrentTimestamp 获取当前时间戳
func GetCurrentTimestamp() string {
	return FormatTimestamp(float64(time.Now().UnixNano()) / 1000000000.0)
}