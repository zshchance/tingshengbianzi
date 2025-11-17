/**
 * 时间格式化工具模块
 * 参考老版本UIController.js中的时间处理逻辑，提供独立、可复用的时间处理功能
 */

/**
 * 将时间字符串转换为秒数
 * @param {string} timeString - 时间字符串，如 "1970-01-01T08:00:00+08:00"
 * @returns {number} 秒数
 */
export function timeStringToSeconds(timeString) {
  if (!timeString) return 0

  try {
    // 如果是数字类型，直接返回
    if (typeof timeString === 'number') return timeString

    // 处理ISO时间格式 "1970-01-01T08:00:00+08:00"
    if (typeof timeString === 'string' && timeString.includes('T')) {
      // 特殊处理：如果是1970-01-01格式，提取时间部分作为当天的秒数
      if (timeString.includes('1970-01-01')) {
        // 提取时间部分 "08:00:00"
        const timeMatch = timeString.match(/T(\d{2}):(\d{2}):(\d{2})/)
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10)
          const minutes = parseInt(timeMatch[2], 10)
          const seconds = parseInt(timeMatch[3], 10)
          return hours * 3600 + minutes * 60 + seconds
        }
      }

      // 其他ISO时间格式，计算当天的秒数
      const date = new Date(timeString)
      if (isNaN(date.getTime())) {
        console.warn('无效的时间字符串:', timeString)
        return 0
      }
      // 计算从当天0点开始的秒数
      return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000
    }

    // 处理纯数字字符串
    if (typeof timeString === 'string' && !isNaN(timeString)) {
      return parseFloat(timeString)
    }

    console.warn('无法识别的时间格式:', timeString)
    return 0
  } catch (error) {
    console.error('时间转换错误:', error)
    return 0
  }
}

/**
 * 格式化时间戳为 [HH:MM:SS.mmm] 格式
 * 参考老版本formatTimestamp方法
 * @param {number|string} time - 时间（秒数或时间字符串）
 * @returns {string} 格式化的时间戳
 */
export function formatTimestamp(time) {
  const seconds = timeStringToSeconds(time)

  if (seconds < 0) return '[00:00:00.000]'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `[${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}]`
}

/**
 * 格式化时间戳为 SRT 时间格式
 * @param {number|string} time - 时间（秒数或时间字符串）
 * @returns {string} SRT时间格式
 */
export function formatSRTTime(time) {
  const seconds = timeStringToSeconds(time)

  if (seconds < 0) return '00:00:00,000'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}

/**
 * 格式化时间戳为 WebVTT 时间格式
 * @param {number|string} time - 时间（秒数或时间字符串）
 * @returns {string} WebVTT时间格式
 */
export function formatWebVTTTime(time) {
  const seconds = timeStringToSeconds(time)

  if (seconds < 0) return '00:00:00.000'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

/**
 * 格式化时间戳为简单格式 [MM:SS.mmm]
 * @param {number|string} time - 时间（秒数或时间字符串）
 * @returns {string} 简单时间格式
 */
export function formatSimpleTime(time) {
  const seconds = timeStringToSeconds(time)

  if (seconds < 0) return '[00:00.000]'

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `[${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}]`
}

/**
 * 格式化持续时间为 MM:SS 格式
 * @param {number} seconds - 持续时间（秒数）
 * @returns {string} 格式化的持续时间
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 生成带时间戳的文本
 * 参考老版本generateTimestampedText方法
 * @param {Array} segments - 识别结果片段数组
 * @returns {string} 带时间戳的文本
 */
export function generateTimestampedText(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return ''
  }

  const textLines = []

  // 按segment生成带时间戳的文本
  segments.forEach((segment, index) => {
    if (segment.text && segment.text.trim()) {
      const startTime = formatTimestamp(segment.start || 0)
      const trimmedText = segment.text.trim()
      textLines.push(`${startTime} ${trimmedText}`)
    }
  })

  return textLines.join('\n')
}

/**
 * 生成更细颗粒度时间戳的文本
 * 参考老版本generateFineGrainedTimestampedText方法
 * @param {Array} segments - 识别结果片段数组
 * @param {Array} words - 词汇级别时间信息数组
 * @returns {string} 带细颗粒度时间戳的文本
 */
export function generateFineGrainedTimestampedText(segments, words) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return ''
  }

  // 如果有words级别的详细信息，使用更细颗粒度的时间戳
  if (words && Array.isArray(words) && words.length > 0) {
    return generateWordLevelTimestampedText(words)
  }

  // 否则使用segment级别的时间戳
  return generateTimestampedText(segments)
}

/**
 * 生成词汇级别的时间戳文本
 * @param {Array} words - 词汇数组
 * @returns {string} 带时间戳的词汇文本
 */
export function generateWordLevelTimestampedText(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return ''
  }

  const textLines = []

  // 按时间分组词汇，每2-3个词一组
  let currentGroup = []
  let groupStartTime = null
  let groupEndTime = null

  words.forEach((word, index) => {
    const wordTime = timeStringToSeconds(word.start || word.time || 0)

    // 如果是第一组，初始化时间
    if (currentGroup.length === 0) {
      groupStartTime = wordTime
      groupEndTime = timeStringToSeconds(word.end || word.start || word.time || 0) + 0.5
      currentGroup.push(word)
    } else if (wordTime - groupStartTime <= 3) { // 3秒内加入当前组
      currentGroup.push(word)
      groupEndTime = Math.max(groupEndTime, timeStringToSeconds(word.end || word.start || word.time || 0))
    } else { // 超过3秒，开始新组
      // 输出当前组
      if (currentGroup.length > 0) {
        const groupText = currentGroup.map(w => w.text || w.word).join(' ')
        const timestamp = formatTimestamp(groupStartTime)
        textLines.push(`${timestamp} ${groupText}`)
      }

      // 开始新组
      currentGroup = [word]
      groupStartTime = wordTime
      groupEndTime = timeStringToSeconds(word.end || word.start || word.time || 0)
    }
  })

  // 输出最后一组
  if (currentGroup.length > 0) {
    const groupText = currentGroup.map(w => w.text || w.word).join(' ')
    const timestamp = formatTimestamp(groupStartTime)
    textLines.push(`${timestamp} ${groupText}`)
  }

  return textLines.join('\n')
}

/**
 * 检查文本是否包含时间戳
 * @param {string} text - 文本
 * @returns {boolean} 是否包含时间戳
 */
export function hasTimestamp(text) {
  if (!text || typeof text !== 'string') return false
  const timestampPattern = /\[\d{2}:\d{2}:\d{2}\.\d{3}\]/
  return timestampPattern.test(text)
}

/**
 * 高亮显示时间戳
 * @param {string} text - 包含时间戳的文本
 * @returns {string} 带高亮的HTML
 */
export function highlightTimestamps(text) {
  if (!text || typeof text !== 'string') return text

  const timestampPattern = /\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/g
  return text.replace(timestampPattern, (match, timestamp) => {
    return `<span class="timestamp-highlight" style="color: #007bff; font-weight: bold; font-family: monospace; background: #e7f3ff; padding: 2px 4px; border-radius: 3px;">[${timestamp}]</span>`
  })
}

// 默认导出所有功能
export default {
  timeStringToSeconds,
  formatTimestamp,
  formatSRTTime,
  formatWebVTTTime,
  formatSimpleTime,
  formatDuration,
  generateTimestampedText,
  generateFineGrainedTimestampedText,
  generateWordLevelTimestampedText,
  hasTimestamp,
  highlightTimestamps
}