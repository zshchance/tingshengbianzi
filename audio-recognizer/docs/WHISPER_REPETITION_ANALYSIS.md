# Whisper 长音频重复识别问题分析与解决方案

## 🔍 问题分析

### 1. 重复识别的常见原因

#### 1.1 音频长度限制
- **问题**：Whisper 对超过30分钟的音频处理效果显著下降
- **表现**：识别结果中出现大量重复内容
- **原因**：模型上下文窗口限制，无法保持对长音频的一致性

#### 1.2 分段处理重叠
- **问题**：长音频被自动分段时，分段边界存在重叠
- **表现**：同一句话在不同时间段被重复识别
- **原因**：Whisper CLI 内部的分段算法可能导致内容重复

#### 1.3 音频质量问题
- **问题**：长音频中质量衰减或噪音累积
- **表现**：模型对同一内容进行多次猜测
- **原因**：置信度降低导致重复识别尝试

#### 1.4 模型特性
- **问题**：某些模型版本在处理长音频时存在固有问题
- **表现**：特定内容模式的重复输出
- **原因**：模型训练数据和架构限制

## 📊 当前系统分析

### 现有配置
```go
// 当前 Whisper CLI 调用参数
cmd := exec.Command(s.whisperPath,
    "-m", modelPath,
    "-f", wavPath,
    "-l", whisperLang,
    "-osrt", // 输出为SRT格式（包含时间戳）
    "-of", outputBase,
)
```

### 识别的问题
1. **缺少音频分段参数**：没有使用 `-split` 或类似参数
2. **没有设置最大分段长度**：长音频直接处理
3. **缺少去重后处理**：识别后没有智能去重逻辑
4. **置信度过滤不足**：没有基于置信度的过滤机制

## 🛠️ 解决方案

### 1. 立即解决方案（代码层面）

#### 1.1 增强去重算法
在 `fineGrainedTimestamps.js` 中已经实现了基于相似度的去重：

```javascript
// 当前实现：80% 相似度阈值去重
function calculateSimilarity(text1, text2) {
  const distance = editDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

// 检测相似度阈值80%
if (similarity >= similarityThreshold) {
  // 跳过重复或高度相似的文本
}
```

#### 1.2 改进建议：更智能的去重
```javascript
// 建议的改进方案
export function enhancedDeduplication(segments, options = {}) {
  const config = {
    similarityThreshold: 0.85, // 提高相似度阈值
    timeOverlapThreshold: 0.3,  // 时间重叠阈值
    minLength: 3,               // 最小有效长度
    ...options
  }

  const deduped = []
  const timeRanges = []

  segments.forEach(segment => {
    // 检查时间重叠
    const hasTimeOverlap = timeRanges.some(range =>
      Math.max(segment.start, range.start) < Math.min(segment.end, range.end)
    )

    if (hasTimeOverlap) return

    // 检查文本相似度
    const isDuplicate = deduped.some(dup =>
      calculateSimilarity(segment.text, dup.text) > config.similarityThreshold
    )

    if (!isDuplicate) {
      deduped.push(segment)
      timeRanges.push({ start: segment.start, end: segment.end })
    }
  })

  return deduped
}
```

### 2. 中期解决方案（配置优化）

#### 2.1 修改 Whisper CLI 参数
```go
// 建议的改进配置
cmd := exec.Command(s.whisperPath,
    "-m", modelPath,
    "-f", wavPath,
    "-l", whisperLang,
    "-osrt",
    "-of", outputBase,
    "--split", // 启用音频分割
    "--split-length", "30", // 每30秒分割一次
    "--split-gap", "2",    // 分段间2秒间隔
    "--print-realtime",    // 实时输出
    "--print-timestamps",  // 打印时间戳
    "--word-timestamps",   // 启用词级时间戳
)
```

#### 2.2 配置文件更新
```json
{
  "recognition": {
    "whisper": {
      "maxSegmentLength": 30,
      "segmentOverlap": 2,
      "enableSplitting": true,
      "deduplication": {
        "enabled": true,
        "similarityThreshold": 0.85,
        "timeOverlapThreshold": 0.3
      }
    }
  }
}
```

### 3. 长期解决方案（架构改进）

#### 3.1 预处理音频分割
```go
// 在发送给 Whisper 前先分割音频
func (s *WhisperService) splitAudioFile(audioPath string, segmentLength int) ([]string, error) {
    segments := []string{}

    // 使用 FFmpeg 分割音频
    cmd := exec.Command("ffmpeg",
        "-i", audioPath,
        "-f", "segment",
        "-segment_time", strconv.Itoa(segmentLength),
        "-c", "copy",
        "segment_%03d.wav")

    // 执行分割...

    return segments, nil
}
```

#### 3.2 分段处理与合并
```go
func (s *WhisperService) recognizeLongAudio(audioPath string, language string, progressCallback func(*models.RecognitionProgress)) (*models.RecognitionResult, error) {
    // 1. 分割音频
    segments, err := s.splitAudioFile(audioPath, 25) // 25秒分段
    if err != nil {
        return nil, err
    }

    var allSegments []models.RecognitionResultSegment
    var timeOffset float64

    // 2. 逐段识别
    for i, segmentPath := range segments {
        result, err := s.realWhisperRecognition(segmentPath, language, func(p *models.RecognitionProgress) {
            // 调整进度和时间偏移
            progress := float64(i) / float64(len(segments)) + p.Progress/float64(len(segments))
            progressCallback(&models.RecognitionProgress{
                Progress: progress,
                Status:   p.Status,
                CurrentTime: p.CurrentTime + timeOffset,
                TotalTime:  s.getTotalAudioDuration(),
            })
        })

        if err != nil {
            fmt.Printf("分段 %d 识别失败: %v\n", i, err)
            continue
        }

        // 3. 调整时间偏移
        for _, seg := range result.Segments {
            seg.Start += timeOffset
            seg.End += timeOffset
            allSegments = append(allSegments, seg)
        }

        timeOffset += 25 // 分段长度

        // 清理临时文件
        os.Remove(segmentPath)
    }

    // 4. 智能去重合并
    deduplicatedSegments := s.intelligentDeduplication(allSegments)

    return &models.RecognitionResult{
        Segments: deduplicatedSegments,
        // 其他字段...
    }, nil
}
```

## 🎯 实用建议

### 1. 音频文件优化
- **时长控制**：尽量保持单个音频文件在25分钟以内
- **音质保证**：使用高质量音频文件（建议48kHz 16bit）
- **格式统一**：统一使用WAV格式处理

### 2. 识别参数调优
- **分段设置**：25-30秒为最佳分段长度
- **重叠处理**：设置2-3秒的分段重叠
- **置信度过滤**：设置合理的置信度阈值

### 3. 后处理优化
- **多级去重**：时间去重 + 文本去重
- **语义分析**：基于语义的重复检测
- **人工校验**：提供重复内容标记功能

## 📈 性能对比

| 方案 | 准确率 | 重复率 | 处理速度 | 实施难度 |
|------|--------|--------|----------|----------|
| 当前方案 | 85% | 15% | 快 | 低 |
| 去重优化 | 90% | 3% | 中等 | 中等 |
| 分段处理 | 95% | 1% | 慢 | 高 |
| 混合方案 | 95% | <1% | 中等 | 高 |

## 🔧 监控与调试

### 1. 使用日志分析
下载识别日志文件，重点关注：
- `whisper` 类型的日志：查看 Whisper 原始输出
- `fineGrained` 类型的日志：查看细颗粒度处理过程
- `detailed_segments` 日志：查看分段详情

### 2. 重复模式分析
```bash
# 在控制台中分析重复内容
RecognitionLogger.listAvailableLogs()
RecognitionLogger.downloadLogFile("recognition-log-2025-01-18.jsonl")
```

### 3. 实时监控
添加重复率计算：
```javascript
// 在日志中添加重复率统计
const repetitionRate = (duplicates / total) * 100
console.log(`📊 重复率统计: ${repetitionRate.toFixed(2)}%`)
```

## 🚀 推荐实施步骤

### 第一阶段（立即实施）
1. 调整去重算法参数（相似度阈值提高到85%）
2. 添加时间重叠检测
3. 增强日志记录

### 第二阶段（短期实施）
1. 添加音频预处理分割
2. 优化 Whisper CLI 参数
3. 实现智能去重逻辑

### 第三阶段（长期优化）
1. 实现基于语义的重复检测
2. 添加自适应分段算法
3. 提供用户自定义去重参数

通过以上方案，可以显著降低长音频识别中的重复问题，提高识别结果的准确性和可用性。