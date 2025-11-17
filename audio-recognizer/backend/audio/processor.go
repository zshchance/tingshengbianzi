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
)

// Processor 音频处理器
type Processor struct {
	tempDir     string
	ffmpegPath  string
	ffprobePath string
	sampleRate  int
	channels    int
}

// NewProcessor 创建新的音频处理器
func NewProcessor() (*Processor, error) {
	// 查找FFmpeg路径
	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, models.NewRecognitionError(
			models.ErrorCodeFFmpegNotFound,
			"FFmpeg未安装或未找到",
			"请确保FFmpeg已安装并添加到系统PATH中",
		)
	}

	// 查找FFprobe路径
	ffprobePath, err := exec.LookPath("ffprobe")
	if err != nil {
		return nil, models.NewRecognitionError(
			models.ErrorCodeFFmpegNotFound,
			"FFprobe未安装或未找到",
			"请确保FFmpeg已安装并添加到系统PATH中",
		)
	}

	// 创建临时目录
	tempDir := filepath.Join(os.TempDir(), "audio-recognizer")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("创建临时目录失败: %w", err)
	}

	return &Processor{
		tempDir:     tempDir,
		ffmpegPath:  ffmpegPath,
		ffprobePath: ffprobePath,
		sampleRate:  16000, // 默认采样率
		channels:    1,     // 默认单声道
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
	cmd := exec.Command(p.ffmpegPath,
		"-i", inputPath,           // 输入文件
		"-ar", fmt.Sprintf("%d", p.sampleRate), // 设置采样率
		"-ac", fmt.Sprintf("%d", p.channels),   // 设置声道数
		"-f", "wav",               // 输出格式
		"-acodec", "pcm_s16le",    // 音频编码
		"-y",                      // 覆盖输出文件
		outputPath,
	)

	// 执行转换命令
	output, err := cmd.CombinedOutput()
	_ = output // 暂时忽略输出
	if err != nil {
		os.Remove(outputPath) // 清理临时文件
		return "", nil, models.NewRecognitionError(
			models.ErrorCodeAudioProcessFailed,
			"音频格式转换失败",
			err.Error(),
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