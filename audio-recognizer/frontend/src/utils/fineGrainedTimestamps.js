/**
 * 细颗粒度时间标记生成工具
 * 基于语速分析和标点停顿时间插值算法
 */

import { timeStringToSeconds } from './timeFormatter.js'
/**
 * 标点符号停顿时间配置（秒）
 */
const PUNCTUATION_PAUSES = {
  // 句末标点 - 长停顿
  '。': 1.2,
  '！': 1.0,
  '？': 1.0,
  '；': 0.8,

  // 句中标点 - 中等停顿
  '，': 0.6,
  '：': 0.7,
  '"': 0.3,
  '"': 0.3,
  "'": 0.3,
  "'": 0.3,

  // 短停顿
  '、': 0.4,
  '·': 0.2,

  // 英文标点
  '.': 1.2,
  '!': 1.0,
  '?': 1.0,
  ';': 0.8,
  ',': 0.6,
  ':': 0.7,
  '"': 0.3,
  "'": 0.3
}

/**
 * 语气词和连接词额外延迟（秒）
 */
const WORD_PAUSES = {
  '啊': 0.3,
  '呢': 0.3,
  '吧': 0.2,
  '吗': 0.2,
  '啦': 0.3,
  '哦': 0.2,
  '嗯': 0.2,
  '哎': 0.3,
  '额': 0.2,
  '那么': 0.4,
  '然后': 0.3,
  '而且': 0.3,
  '但是': 0.4,
  '不过': 0.3,
  '所以': 0.3,
  '因此': 0.3,
  '另外': 0.3,
  '此外': 0.3
}

/**
 * 计算文本的基本统计信息
 * @param {string} text - 文本内容
 * @returns {Object} 统计信息
 */
export function calculateTextStats(text) {
  if (!text || typeof text !== 'string') {
    return {
      charCount: 0,
      punctuationCount: 0,
      wordCount: 0,
      estimatedDuration: 0
    }
  }

  const chars = text.trim()
  const charCount = chars.length

  // 统计标点符号数量 - 使用安全的正则表达式
  const punctuationCount = (chars.match(/[。，！？；：""''、·.,!?:;'"']/g) || []).length

  // 统计词汇数量（按空格和中文分词估算）
  const chineseWords = (chars.match(/[\u4e00-\u9fa5]+/g) || []).length
  const englishWords = (chars.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseWords + englishWords

  return {
    charCount,
    punctuationCount,
    wordCount,
    estimatedDuration: 0 // 将在后续计算
  }
}

/**
 * 计算平均语速（字符/秒）
 * @param {string} text - 文本内容
 * @param {number} duration - 时长（秒）
 * @returns {number} 平均语速
 */
export function calculateAverageSpeed(text, duration) {
  if (!text || !duration || duration <= 0) return 4.0 // 默认语速

  // 如果duration是字符串格式，尝试转换
  const durationInSeconds = typeof duration === 'string' ? timeStringToSeconds(duration) : duration

  if (durationInSeconds <= 0) return 4.0

  const stats = calculateTextStats(text)
  const effectiveChars = stats.charCount - stats.punctuationCount // 排除标点符号

  return effectiveChars / durationInSeconds || 4.0
}

/**
 * 分析文本中的停顿点
 * @param {string} text - 文本内容
 * @returns {Array} 停顿点数组
 */
function analyzePausePoints(text) {
  const pauses = []
  const chars = text.trim()

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]

    // 检查标点符号停顿
    if (PUNCTUATION_PAUSES[char]) {
      pauses.push({
        position: i,
        character: char,
        pauseTime: PUNCTUATION_PAUSES[char],
        type: 'punctuation'
      })
    }

    // 检查语气词停顿（向前看2个字符）
    if (i < chars.length - 1) {
      const twoChar = chars.substring(i, i + 2)
      if (WORD_PAUSES[twoChar]) {
        pauses.push({
          position: i + 1,
          character: twoChar,
          pauseTime: WORD_PAUSES[twoChar],
          type: 'word'
        })
        i++ // 跳过下一个字符
      } else if (WORD_PAUSES[char]) {
        pauses.push({
          position: i,
          character: char,
          pauseTime: WORD_PAUSES[char],
          type: 'word'
        })
      }
    } else if (WORD_PAUSES[char]) {
      pauses.push({
        position: i,
        character: char,
        pauseTime: WORD_PAUSES[char],
        type: 'word'
      })
    }
  }

  return pauses.sort((a, b) => a.position - b.position)
}

/**
 * 生成细颗粒度时间标记
 * @param {string} text - 文本内容
 * @param {number} startTime - 开始时间（秒）
 * @param {number} endTime - 结束时间（秒）
 * @param {Object} options - 配置选项
 * @returns {Array} 细颗粒度时间标记数组
 */
export function generateFineGrainedTimestamps(text, startTime, endTime, options = {}) {
  if (!text || startTime >= endTime) {
    return []
  }

  const config = {
    minSegmentLength: 8, // 最小片段长度（字符数）
    maxSegmentLength: 20, // 最大片段长度（字符数）
    averageSpeed: 4.0, // 默认语速（字符/秒）
    ...options
  }

  const duration = endTime - startTime
  const averageSpeed = calculateAverageSpeed(text, duration) || config.averageSpeed

  // 分析停顿点
  const pausePoints = analyzePausePoints(text)

  // 生成时间片段
  const segments = []
  let currentIndex = 0
  let currentTime = startTime

  while (currentIndex < text.length) {
    let segmentEnd = currentIndex + config.maxSegmentLength

    // 寻找最近的停顿点
    const nextPause = pausePoints.find(p =>
      p.position > currentIndex && p.position <= segmentEnd
    )

    if (nextPause) {
      segmentEnd = nextPause.position + 1
    } else if (segmentEnd >= text.length) {
      segmentEnd = text.length
    } else {
      // 如果没有找到合适的停顿点，寻找句末或逗号 - 使用安全的正则表达式
      for (let i = segmentEnd; i > currentIndex + config.minSegmentLength; i--) {
        if (/[。，！？；，]/.test(text[i])) {
          segmentEnd = i + 1
          break
        }
      }
    }

    // 确保至少有最小长度
    if (segmentEnd - currentIndex < config.minSegmentLength && segmentEnd < text.length) {
      segmentEnd = Math.min(currentIndex + config.minSegmentLength, text.length)
    }

    const segmentText = text.substring(currentIndex, segmentEnd).trim()
    if (segmentText) {
      // 计算这个片段的预估时间
      const segmentDuration = Math.max(
        segmentText.length / averageSpeed,
        0.5 // 最小片段时长
      )

      segments.push({
        text: segmentText,
        start: currentTime,
        end: Math.min(currentTime + segmentDuration, endTime)
      })

      currentTime += segmentDuration
    }

    currentIndex = segmentEnd

    // 如果接近结束时间，直接结束
    if (currentTime >= endTime - 0.1) {
      break
    }
  }

  // 调整时间确保总和等于原始时长
  if (segments.length > 0) {
    const totalCalculatedTime = segments[segments.length - 1].end - segments[0].start
    const adjustmentFactor = duration / totalCalculatedTime

    segments.forEach((segment, index) => {
      const segmentStart = startTime + (segment.start - segments[0].start) * adjustmentFactor
      const segmentDuration = (segment.end - segment.start) * adjustmentFactor
      segment.start = segmentStart
      segment.end = segmentStart + segmentDuration
    })
  }

  return segments
}

/**
 * 生成带细颗粒度时间戳的文本
 * @param {Array} segments - Whisper识别片段数组
 * @param {Object} options - 配置选项
 * @returns {string} 带细颗粒度时间戳的文本
 */
export function generateFineGrainedTimestampedText(segments, options = {}) {
  console.log('🔍 细颗粒度时间戳生成开始:', { segments, options })

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    console.warn('⚠️ 细颗粒度时间戳生成: segments为空或无效')
    return ''
  }

  // 记录详细的Whisper原始数据用于日志分析
  const whisperRawData = {
    segmentCount: segments.length,
    segments: segments.map((segment, index) => ({
      index,
      text: segment.text,
      start: segment.start,
      end: segment.end,
      confidence: segment.confidence,
      words: segment.words,
      no_speech_prob: segment.no_speech_prob,
      temperature: segment.temperature,
      avg_logprob: segment.avg_logprob,
      compression_ratio: segment.compression_ratio,
      hasWordTimestamps: !!(segment.words && segment.words.length > 0)
    })),
    processingOptions: options
  }

  // 记录Whisper原始数据到日志
  if (window.RecognitionLogger) {
    window.RecognitionLogger.logToFile('whisper', 'raw_segments_data', whisperRawData)
  }

  const textLines = []
  console.log('📝 开始处理segments数量:', segments.length)

  segments.forEach((segment, index) => {
    console.log(`🎯 处理segment ${index}:`, {
      text: segment.text,
      start: segment.start,
      end: segment.end,
      hasText: !!segment.text,
      hasStart: segment.start !== undefined,
      hasEnd: segment.end !== undefined
    })

    if (segment.text && segment.start !== undefined && segment.end !== undefined) {
      const startTime = timeStringToSeconds(segment.start)
      const endTime = timeStringToSeconds(segment.end)

      console.log(`⏰ 时间转换 [${index}]:`, {
        originalStart: segment.start,
        originalEnd: segment.end,
        convertedStart: startTime,
        convertedEnd: endTime
      })

      if (startTime < endTime) {
        console.log(`⏰ 生成细颗粒度时间戳 [${index}]:`, {
          startTime,
          endTime,
          duration: endTime - startTime,
          text: segment.text.trim()
        })

        // 生成细颗粒度时间标记
        const fineSegments = generateFineGrainedTimestamps(
          segment.text.trim(),
          startTime,
          endTime,
          options
        )

        console.log(`✨ 生成细颗粒度片段 [${index}]:`, fineSegments.length, '个片段')

        // 添加细颗粒度时间戳行
        fineSegments.forEach((fineSegment, fineIndex) => {
          const timestamp = formatTimestamp(fineSegment.start)
          const line = `${timestamp} ${fineSegment.text}`
          textLines.push(line)
          console.log(`📝 细颗粒度行 [${index}-${fineIndex}]:`, line)
        })
      } else {
        console.warn(`⚠️ Segment ${index} 时间无效:`, { startTime, endTime })
      }
    } else {
      console.warn(`⚠️ Segment ${index} 数据不完整:`, segment)
    }
  })

  const result = textLines.join('\n')
  console.log('🎉 细颗粒度时间戳生成完成:', {
    总行数: textLines.length,
    结果长度: result.length,
    前100字符: result.substring(0, 100)
  })

  return result
}

/**
 * 格式化时间戳为 [HH:MM:SS.mmm] 格式
 * @param {number} time - 时间（秒）
 * @returns {string} 格式化的时间戳
 */
function formatTimestamp(time) {
  if (time < 0) return '[00:00:00.000]'

  const hours = Math.floor(time / 3600)
  const minutes = Math.floor((time % 3600) / 60)
  const seconds = Math.floor(time % 60)
  const milliseconds = Math.floor((time % 1) * 1000)

  return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}]`
}

/**
 * 优化语速分析（基于语言类型和内容特征）
 * @param {string} text - 文本内容
 * @param {number} duration - 时长（秒）
 * @param {string} language - 语言类型
 * @returns {number} 优化后的语速
 */
export function optimizeSpeedAnalysis(text, duration, language = 'zh-CN') {
  // 如果duration是字符串格式，尝试转换
  const durationInSeconds = typeof duration === 'string' ? timeStringToSeconds(duration) : duration

  if (!durationInSeconds || durationInSeconds <= 0) {
    return 4.0 // 默认语速
  }

  const baseSpeed = calculateAverageSpeed(text, durationInSeconds)
  let adjustmentFactor = 1.0

  // 根据语言类型调整
  if (language === 'zh-CN') {
    // 中文通常比英文快
    adjustmentFactor *= 1.1
  } else if (language === 'en-US') {
    adjustmentFactor *= 0.9
  }

  // 根据内容特征调整
  const stats = calculateTextStats(text)
  if (stats.charCount === 0) return 4.0

  const punctuationRatio = stats.punctuationCount / stats.charCount

  // 标点符号多表示语速可能较慢，有更多停顿
  if (punctuationRatio > 0.15) {
    adjustmentFactor *= 0.9
  } else if (punctuationRatio < 0.05) {
    adjustmentFactor *= 1.1
  }

  return baseSpeed * adjustmentFactor
}

// 默认导出所有功能
export default {
  calculateTextStats,
  calculateAverageSpeed,
  generateFineGrainedTimestamps,
  generateFineGrainedTimestampedText,
  optimizeSpeedAnalysis,
  PUNCTUATION_PAUSES,
  WORD_PAUSES
}