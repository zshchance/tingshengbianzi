package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

// Logger 应用程序日志记录器
type Logger struct {
	logFile *os.File
	info    bool
	debug   bool
}

// NewLogger 创建新的日志记录器
func NewLogger() (*Logger, error) {
	logger := &Logger{
		info:  true,
		debug: true,
	}

	// 创建日志文件
	if err := logger.initLogFile(); err != nil {
		fmt.Printf("初始化日志文件失败: %v\n", err)
		// 即使日志文件创建失败，也返回logger，只是不写入文件
		return logger, nil
	}

	return logger, nil
}

// initLogFile 初始化日志文件
func (l *Logger) initLogFile() error {
	// 获取可执行文件路径
	exePath, err := os.Executable()
	if err != nil {
		fmt.Printf("警告：无法获取可执行文件路径: %v\n", err)
		exePath = "unknown"
	}

	// 确定日志目录（按优先级尝试多个位置）
	var logDirs []string
	if runtime.GOOS == "darwin" {
		homeDir, _ := os.UserHomeDir()
		if homeDir != "" {
			logDirs = append(logDirs, filepath.Join(homeDir, "Library", "Logs", "听声辨字"))
			logDirs = append(logDirs, filepath.Join(homeDir, "Library", "Application Support", "听声辨字", "logs"))
		}
		logDirs = append(logDirs, "/tmp/听声辨字")
		logDirs = append(logDirs, filepath.Join(os.TempDir(), "听声辨字"))
	} else {
		logDirs = append(logDirs, filepath.Join(os.TempDir(), "audio-recognizer"))
		if homeDir, _ := os.UserHomeDir(); homeDir != "" {
			logDirs = append(logDirs, filepath.Join(homeDir, ".local", "share", "audio-recognizer", "logs"))
		}
	}

	// 添加可执行文件目录作为备选
	if exeDir := filepath.Dir(exePath); exeDir != "." && exeDir != "" {
		logDirs = append(logDirs, filepath.Join(exeDir, "logs"))
		logDirs = append(logDirs, exeDir)
	}

	// 尝试创建并使用第一个可用的日志目录
	var logDir string
	var logPath string
	var logFile *os.File

	for _, candidateDir := range logDirs {
		// 创建目录
		if err := os.MkdirAll(candidateDir, 0755); err != nil {
			continue
		}

		// 创建日志文件名（包含日期）
		timestamp := time.Now().Format("2006-01-02_15-04-05")
		logFileName := fmt.Sprintf("audio-recognizer_%s.log", timestamp)
		candidateLogPath := filepath.Join(candidateDir, logFileName)

		// 尝试打开文件
		if file, err := os.OpenFile(candidateLogPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); err == nil {
			logDir = candidateDir
			logPath = candidateLogPath
			logFile = file
			break
		}
	}

	if logFile == nil {
		// 最后的备选方案：输出到标准错误
		fmt.Printf("警告：无法创建日志文件，将输出到控制台\n")
		return nil
	}

	l.logFile = logFile

	// 写入日志开始标记
	l.writeLog("INFO", "=== 听声辨字应用程序启动 ===")
	l.writeLog("INFO", fmt.Sprintf("日志文件: %s", logPath))
	l.writeLog("INFO", fmt.Sprintf("可执行文件: %s", exePath))
	l.writeLog("INFO", fmt.Sprintf("操作系统: %s %s", runtime.GOOS, runtime.GOARCH))
	l.writeLog("INFO", fmt.Sprintf("进程ID: %d", os.Getpid()))
	l.writeLog("INFO", fmt.Sprintf("工作目录: %s", func() string { if wd, err := os.Getwd(); err == nil { return wd }; return "unknown" }()))

	// 创建最新的日志链接（方便查找）
	latestLogPath := filepath.Join(logDir, "latest.log")
	os.Remove(latestLogPath) // 删除旧的链接
	os.Symlink(logPath, latestLogPath)

	return nil
}

// writeLog 写入日志到文件
func (l *Logger) writeLog(level, message string) {
	if l.logFile == nil {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	logLine := fmt.Sprintf("[%s] %s: %s\n", timestamp, level, message)
	l.logFile.WriteString(logLine)
	l.logFile.Sync() // 立即写入磁盘
}

// Info 记录信息日志
func (l *Logger) Info(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)

	// 输出到控制台
	fmt.Printf("[INFO] %s\n", message)

	// 写入日志文件
	if l.info && l.logFile != nil {
		l.writeLog("INFO", message)
	}
}

// Debug 记录调试日志
func (l *Logger) Debug(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)

	// 输出到控制台
	fmt.Printf("[DEBUG] %s\n", message)

	// 写入日志文件
	if l.debug && l.logFile != nil {
		l.writeLog("DEBUG", message)
	}
}

// Error 记录错误日志
func (l *Logger) Error(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)

	// 输出到控制台
	fmt.Printf("[ERROR] %s\n", message)

	// 写入日志文件
	if l.logFile != nil {
		l.writeLog("ERROR", message)
	}
}

// Warn 记录警告日志
func (l *Logger) Warn(format string, args ...interface{}) {
	message := fmt.Sprintf(format, args...)

	// 输出到控制台
	fmt.Printf("[WARN] %s\n", message)

	// 写入日志文件
	if l.logFile != nil {
		l.writeLog("WARN", message)
	}
}

// Close 关闭日志文件
func (l *Logger) Close() {
	if l.logFile != nil {
		l.writeLog("INFO", "=== 听声辨字应用程序关闭 ===")
		l.logFile.Close()
		l.logFile = nil
	}
}

// GetLogPath 获取当前日志文件路径
func (l *Logger) GetLogPath() string {
	if l.logFile == nil {
		return ""
	}
	return l.logFile.Name()
}

// 全局日志实例
var GlobalLogger *Logger

// InitLogger 初始化全局日志实例
func InitLogger() {
	var err error
	GlobalLogger, err = NewLogger()
	if err != nil {
		fmt.Printf("初始化全局日志失败: %v\n", err)
	}
}

// LogInfo 记录信息日志（使用全局实例）
func LogInfo(format string, args ...interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Info(format, args...)
	}
}

// LogDebug 记录调试日志（使用全局实例）
func LogDebug(format string, args ...interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Debug(format, args...)
	}
}

// LogError 记录错误日志（使用全局实例）
func LogError(format string, args ...interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Error(format, args...)
	}
}

// LogWarn 记录警告日志（使用全局实例）
func LogWarn(format string, args ...interface{}) {
	if GlobalLogger != nil {
		GlobalLogger.Warn(format, args...)
	}
}