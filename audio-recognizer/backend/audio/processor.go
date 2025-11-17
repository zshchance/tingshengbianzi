package audio

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"audio-recognizer/backend/models"
	"audio-recognizer/backend/utils"
)

// Processor 音频处理器
type Processor struct {
	tempDir             string
	ffmpegPath          string
	ffprobePath         string
	ffmpegManager       *utils.EmbeddedFFmpegManager
	sampleRate          int
	channels            int
}

// NewProcessor 创建新的音频处理器
func NewProcessor() (*Processor, error) {
	// 创建嵌入式FFmpeg管理器
	ffmpegManager, err := utils.NewEmbeddedFFmpegManager()
	if err != nil {
		return nil, fmt.Errorf("创建FFmpeg管理器失败: %w", err)
	}

	// 验证FFmpeg是否正常工作
	if err := ffmpegManager.ValidateFFmpeg(); err != nil {
		return nil, fmt.Errorf("FFmpeg验证失败: %w", err)
	}

	// 创建临时目录
	tempDir := filepath.Join(os.TempDir(), "audio-recognizer")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("创建临时目录失败: %w", err)
	}

	// 获取FFmpeg信息
	ffmpegInfo := ffmpegManager.GetFFmpegInfo()
	fmt.Printf("FFmpeg来源: %v\n", ffmpegInfo["source"])

	return &Processor{
		tempDir:       tempDir,
		ffmpegPath:    ffmpegManager.GetFFmpegPath(),
		ffprobePath:   ffmpegManager.GetFFprobePath(),
		ffmpegManager: ffmpegManager,
		sampleRate:    16000, // 默认采样率
		channels:      1,     // 默认单声道
	}, nil
}

// ConvertToWAV 将音频文件转换为WAV格式
func (p *Processor) ConvertToWAV(inputPath string) (string, *models.AudioFile, error) {
	// 检查输入文件是否存在
	if _, err := os.Stat(inputPath); os.IsNotExist(err) {
		return "", nil, models.NewRecognitionError(
			models.ErrorCodeAudioFileNotFound,
			"音频文件未找到",
			inputPath,
		)
	}

	// 获取文件信息
	fileInfo, err := os.Stat(inputPath)
	if err != nil {
		return "", nil, fmt.Errorf("获取文件信息失败: %w", err)
	}

	// 生成临时输出文件名
	ext := filepath.Ext(inputPath)
	baseName := strings.TrimSuffix(filepath.Base(inputPath), ext)
	outputPath := filepath.Join(p.tempDir, fmt.Sprintf("%s_converted_%d.wav", baseName, time.Now().Unix()))

	// 使用FFmpeg转换音频格式
	fmt.Printf("开始转换音频文件: %s\n", inputPath)
	fmt.Printf("FFmpeg路径: %s\n", p.ffmpegPath)
	fmt.Printf("输出路径: %s\n", outputPath)

	// 检查输入文件是否存在
	if _, err := os.Stat(inputPath); err != nil {
		fmt.Printf("❌ 输入文件不存在或无法访问: %v\n", err)
		return "", nil, models.NewRecognitionError(
			models.ErrorCodeAudioFileNotFound,
			"音频文件不存在",
			fmt.Sprintf("文件路径: %s, 错误: %v", inputPath, err),
		)
	}

	// 检查输入文件权限
	if info, err := os.Stat(inputPath); err == nil {
		fmt.Printf("输入文件信息: 大小=%d bytes, 权限=%v\n", info.Size(), info.Mode().Perm())
	}

	// 检查输出目录权限
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		fmt.Printf("❌ 无法创建输出目录: %v\n", err)
		return "", nil, models.NewRecognitionError(
			models.ErrorCodeAudioProcessFailed,
			"无法创建输出目录",
			err.Error(),
		)
	}

	fmt.Printf("即将执行FFmpeg命令...\n")

	cmd := exec.Command(p.ffmpegPath,
		"-i", inputPath,           // 输入文件
		"-ar", fmt.Sprintf("%d", p.sampleRate), // 设置采样率
		"-ac", fmt.Sprintf("%d", p.channels),   // 设置声道数
		"-f", "wav",               // 输出格式
		"-acodec", "pcm_s16le",    // 音频编码
		"-y",                      // 覆盖输出文件
		outputPath,
	)

	// 打印完整命令用于调试
	fmt.Printf("FFmpeg命令: %s\n", cmd.String())

	// 设置环境变量和工作目录
	cmd.Dir = os.TempDir()

	// 在沙盒环境中可能需要设置环境变量
	cmd.Env = append(os.Environ(),
		"TMPDIR="+os.TempDir(),
		"HOME="+os.TempDir(),
	)

	fmt.Printf("FFmpeg工作目录: %s\n", cmd.Dir)

	// 执行转换命令
	output, err := cmd.CombinedOutput()
	if err != nil {
		// 清理临时文件
		os.Remove(outputPath)

		// 输出详细的错误信息
		errorMsg := fmt.Sprintf("FFmpeg转换失败: %v\n命令输出: %s", err, string(output))
		fmt.Printf("音频转换错误详情:\n%s\n", errorMsg)

		return "", nil, models.NewRecognitionError(
			models.ErrorCodeAudioProcessFailed,
			"音频格式转换失败",
			errorMsg,
		)
	}

	// 获取转换后的音频信息
	audioInfo, err := p.getAudioInfo(outputPath)
	if err != nil {
		os.Remove(outputPath) // 清理临时文件
		return "", nil, fmt.Errorf("获取音频信息失败: %w", err)
	}

	audioInfo.Name = filepath.Base(inputPath)
	audioInfo.Path = inputPath
	audioInfo.Size = fileInfo.Size()

	return outputPath, audioInfo, nil
}

// getAudioInfo 获取音频文件信息
func (p *Processor) getAudioInfo(filePath string) (*models.AudioFile, error) {
	// 使用FFprobe获取音频信息
	cmd := exec.Command(p.ffprobePath,
		"-i", filePath,
		"-show_format",
		"-show_streams",
		"-v", "quiet",
		"-print_format", "json",
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("获取音频信息失败: %w", err)
	}

	// 解析音频信息（这里简化处理，实际应该解析JSON）
	audioInfo := &models.AudioFile{
		Format:     "wav",
		SampleRate: p.sampleRate,
		Channels:   p.channels,
		Duration:   0, // 需要从FFmpeg输出中解析
		BitRate:    0, // 需要从FFmpeg输出中解析
	}

	// 获取音频时长（简化版本）
	if duration, err := p.getAudioDuration(filePath); err == nil {
		audioInfo.Duration = duration
	}

	// 记录FFprobe输出用于调试
	fmt.Printf("FFprobe输出: %s\n", string(output))

	return audioInfo, nil
}

// getAudioDuration 获取音频时长
func (p *Processor) getAudioDuration(filePath string) (float64, error) {
	// 使用FFprobe获取音频时长
	cmd := exec.Command(p.ffprobePath,
		"-i", filePath,
		"-show_format",
		"-v", "quiet",
		"-select_streams", "a:0",
		"-show_entries", "format=duration",
		"-of", "csv=p=0",
	)

	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}

	// 解析时长（秒）
	durationStr := strings.TrimSpace(string(output))
	if durationStr == "" {
		return 0, fmt.Errorf("无法获取音频时长")
	}

	duration, err := strconv.ParseFloat(durationStr, 64)
	if err != nil {
		return 0, fmt.Errorf("解析时长失败: %w", err)
	}

	return duration, nil
}

// GetAudioDuration 公开的音频时长获取方法
func (p *Processor) GetAudioDuration(filePath string) (float64, error) {
	return p.getAudioDuration(filePath)
}

// ReadWAVData 读取WAV文件音频数据
func (p *Processor) ReadWAVData(filePath string) ([]int16, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("打开WAV文件失败: %w", err)
	}
	defer file.Close()

	// 跳过WAV文件头（44字节）
	header := make([]byte, 44)
	if _, err := io.ReadFull(file, header); err != nil {
		return nil, fmt.Errorf("读取WAV文件头失败: %w", err)
	}

	// 验证WAV文件格式
	if string(header[0:4]) != "RIFF" || string(header[8:12]) != "WAVE" {
		return nil, models.NewRecognitionError(
			models.ErrorCodeInvalidAudioFormat,
			"无效的WAV文件格式",
			"",
		)
	}

	// 读取音频数据
	var samples []int16
	buffer := make([]byte, 2) // 16位音频，每个样本2字节

	for {
		_, err := io.ReadFull(file, buffer)
		if err != nil {
			if err == io.EOF {
				break
			}
			continue
		}

		// 将字节数据转换为16位整数（小端序）
		sample := int16(binary.LittleEndian.Uint16(buffer))
		samples = append(samples, sample)
	}

	return samples, nil
}

// NormalizeAudio 音频标准化
func (p *Processor) NormalizeAudio(samples []int16) []int16 {
	if len(samples) == 0 {
		return samples
	}

	// 找到最大值
	var maxValue int16
	for _, sample := range samples {
		if abs(sample) > maxValue {
			maxValue = abs(sample)
		}
	}

	if maxValue == 0 {
		return samples
	}

	// 计算缩放因子
	scale := float64(32767) / float64(maxValue)

	// 标准化音频
	normalized := make([]int16, len(samples))
	for i, sample := range samples {
		normalized[i] = int16(float64(sample) * scale)
	}

	return normalized
}

// abs 计算绝对值
func abs(x int16) int16 {
	if x < 0 {
		return -x
	}
	return x
}

// Cleanup 清理临时文件
func (p *Processor) Cleanup() error {
	if p.tempDir != "" {
		return os.RemoveAll(p.tempDir)
	}
	return nil
}

// SetSampleRate 设置采样率
func (p *Processor) SetSampleRate(sampleRate int) {
	p.sampleRate = sampleRate
}

// SetChannels 设置声道数
func (p *Processor) SetChannels(channels int) {
	p.channels = channels
}