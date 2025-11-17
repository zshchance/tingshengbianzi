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
 * 计算两个字符串之间的编辑距离（Levenshtein距离）
 * @param {string} str1 - 第一个字符串
 * @param {string} str2 - 第二个字符串
 * @returns {number} 编辑距离
 */
function editDistance(str1, str2) {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null))

  for (let i = 0; i <= len1; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= len2; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,        // deletion
        matrix[j - 1][i] + 1,        // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[len2][len1]
}

/**
 * 安全的时间字符串转换函数
 * @param {string|number} timeValue - 时间值（可能是数字、时间字符串等）
 * @returns {number} 转换后的秒数
 */
function safeTimeStringToSeconds(timeValue) {
  // 如果已经是数字，直接返回
  if (typeof timeValue === 'number') {
    return timeValue
  }

  // 如果是数字字符串，转换为数字
  if (typeof timeValue === 'string' && !isNaN(timeValue) && timeValue.trim() !== '') {
    return parseFloat(timeValue)
  }

  // 如果包含T，可能是旧版本的ISO格式，使用timeStringToSeconds处理
  if (typeof timeValue === 'string' && timeValue.includes('T')) {
    return timeStringToSeconds(timeValue)
  }

  // 其他情况，尝试转换为数字
  const parsed = parseFloat(timeValue)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * 计算两个字符串的相似度（基于编辑距离）
 * @param {string} text1 - 第一个文本
 * @param {string} text2 - 第二个文本
 * @returns {number} 相似度（0-1之间）
 */
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0
  if (text1 === text2) return 1

  const longer = text1.length > text2.length ? text1 : text2
  const shorter = text1.length > text2.length ? text2 : text1

  if (longer.length === 0) return 1

  // 计算编辑距离
  const distance = editDistance(longer, shorter)

  // 计算相似度（1 - 编辑距离/较长字符串长度）
  return (longer.length - distance) / longer.length
}

/**
 * 智能去重处理 - 针对长音频重复识别问题优化
 * @param {Array} segments - Whisper识别片段数组
 * @param {Object} options - 配置选项
 * @returns {Array} 去重后的片段数组
 */
export function intelligentDeduplication(segments, options = {}) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return []
  }

  const config = {
    similarityThreshold: 0.85, // 相似度阈值
    timeOverlapThreshold: 0.3,  // 时间重叠阈值（30%重叠视为重复）
    minLength: 3,               // 最小有效长度
    enableTimeAnalysis: true,   // 启用时间分析
    enableSemanticAnalysis: false, // 启用语义分析（可选）
    ...options
  }

  console.log('🧠 开始智能去重处理:', {
    原始片段数: segments.length,
    配置: config
  })

  const deduped = []
  const timeRanges = []
  let duplicates = 0

  segments.forEach((segment, index) => {
    const segmentText = segment.text?.trim() || ''
    const startTime = parseFloat(segment.start) || 0
    const endTime = parseFloat(segment.end) || startTime

    // 过滤太短或无效的片段
    if (segmentText.length < config.minLength) {
      console.log(`🚫 过滤过短片段 [${index}]: "${segmentText}"`)
      return
    }

    let isDuplicate = false

    // 1. 时间重叠检查
    if (config.enableTimeAnalysis) {
      const hasTimeOverlap = timeRanges.some(range => {
        const overlap = Math.min(endTime, range.end) - Math.max(startTime, range.start)
        const segmentDuration = endTime - startTime
        const rangeDuration = range.end - range.start
        const maxDuration = Math.max(segmentDuration, rangeDuration)

        // 如果重叠比例超过阈值，视为时间重叠
        return overlap > 0 && (overlap / maxDuration) > config.timeOverlapThreshold
      })

      if (hasTimeOverlap) {
        console.log(`⏰ 时间重叠跳过 [${index}]: "${segmentText.substring(0, 20)}..." (${startTime}-${endTime})`)
        duplicates++
        return
      }
    }

    // 2. 文本相似度检查
    for (const existingSegment of deduped) {
      const similarity = calculateSimilarity(segmentText, existingSegment.text)

      if (similarity >= config.similarityThreshold) {
        console.log(`📝 相似文本跳过 [${index}]: "${segmentText.substring(0, 20)}..." (相似度: ${(similarity * 100).toFixed(1)}%)`)
        duplicates++
        isDuplicate = true
        break
      }
    }

    // 如果不是重复，添加到结果中
    if (!isDuplicate) {
      deduped.push({
        text: segmentText,
        start: segment.start,  // 保持原始格式，不要转换
        end: segment.end,      // 保持原始格式，不要转换
        originalIndex: index,
        confidence: segment.confidence
      })

      if (config.enableTimeAnalysis) {
        timeRanges.push({ start: startTime, end: endTime })
      }
    }
  })

  const deduplicationRate = (duplicates / segments.length) * 100
  console.log('✅ 智能去重完成:', {
    原始数量: segments.length,
    保留数量: deduped.length,
    去除重复: duplicates,
    去重率: `${deduplicationRate.toFixed(2)}%`
  })

  return deduped
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
    similarityThreshold: 0.85, // 提高相似度阈值至85%
    enableEnhancedDeduplication: true, // 启用增强去重
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

  // 日志功能已移除 - 直接输出到浏览器控制台
  console.log('🎯 Whisper原始数据:', whisperRawData)

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
      // 安全的时间转换，处理多种格式
      const startTime = safeTimeStringToSeconds(segment.start)
      const endTime = safeTimeStringToSeconds(segment.end)

      console.log(`⏰ 时间转换 [${index}]:`, {
        originalStart: segment.start,
        originalEnd: segment.end,
        convertedStart: startTime,
        convertedEnd: endTime,
        startType: typeof segment.start,
        endType: typeof segment.end
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