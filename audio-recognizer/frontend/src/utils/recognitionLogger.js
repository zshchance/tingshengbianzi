/**
 * 识别响应日志记录工具
 * 用于记录识别过程中的详细信息，帮助排查问题
 */

/**
 * 格式化时间戳
 * @returns {string} 格式化的时间戳
 */
function formatTimestamp() {
  const now = new Date()
  return now.toISOString().replace('T', ' ').substring(0, 19) + '.' + now.getMilliseconds().toString().padStart(3, '0')
}

/**
 * 清理和格式化数据，避免日志文件过大
 * @param {any} data - 要格式化的数据
 * @param {number} maxStringLength - 字符串最大长度
 * @returns {any} 格式化后的数据
 */
function sanitizeData(data, maxStringLength = 200) {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    if (data.length > maxStringLength) {
      return data.substring(0, maxStringLength) + `... [截断，总长度: ${data.length}]`
    }
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        // 对数组中的对象进行限制
        const sanitized = {}
        Object.keys(item).forEach(key => {
          if (typeof item[key] === 'string' && item[key].length > maxStringLength) {
            sanitized[key] = item[key].substring(0, maxStringLength) + `... [截断]`
          } else {
            sanitized[key] = item[key]
          }
        })
        return sanitized
      }
      return item
    })
  }

  if (typeof data === 'object') {
    const sanitized = {}
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' && data[key].length > maxStringLength) {
        sanitized[key] = data[key].substring(0, maxStringLength) + `... [截断]`
      } else {
        sanitized[key] = data[key]
      }
    })
    return sanitized
  }

  return data
}

// 日志功能已移除 - 使用浏览器控制台进行调试
export async function logToFile(logType, action, data) {
  // 直接使用浏览器控制台输出，不记录到文件
  console.log(`[${logType.toUpperCase()}] ${action}:`, data)
}

/**
 * 下载日志文件（已禁用）
 * @param {string} fileName - 文件名
 */
export function downloadLogFile(fileName) {
  console.log('📝 日志下载功能已禁用，请使用浏览器控制台查看调试信息')
}

/**
 * 列出可用日志文件（已禁用）
 */
export function listAvailableLogs() {
  console.log('📝 日志功能已禁用，请使用浏览器控制台查看调试信息')
}

/**
 * 下载今日日志（已禁用）
 */
export function downloadTodayLog() {
  console.log('📝 日志下载功能已禁用，请使用浏览器控制台查看调试信息')
}

/**
 * 清理旧日志文件（已禁用）
 * @param {number} keepRecent - 保留最近几个文件的日志
 */
export function cleanupOldLogs(keepRecent = 5) {
  console.log('📝 日志清理功能已禁用，无需清理内存')
}

/**
 * 记录识别开始
 * @param {Object} request - 识别请求
 */
export async function logRecognitionStart(request) {
  await logToFile('recognition', 'start', {
    request: {
      filePath: request.filePath,
      language: request.language,
      model: request.model,
      enableWordTimestamps: request.enableWordTimestamps,
      enableTimestamps: request.enableTimestamps,
      timestampGranularity: request.timestampGranularity
    }
  })
}

/**
 * 记录原始识别响应
 * @param {Object} response - 原始响应
 */
export async function logRawRecognitionResponse(response) {
  await logToFile('recognition', 'raw_response', {
    success: response.success,
    error: response.error,
    hasResult: !!response.result,
    resultSummary: response.result ? {
      text: response.result.text ? response.result.text.substring(0, 100) + '...' : null,
      textLength: response.result.text ? response.result.text.length : 0,
      segmentCount: response.result.segments ? response.result.segments.length : 0,
      wordCount: response.result.words ? response.result.words.length : 0,
      duration: response.result.duration,
      language: response.result.language
    } : null
  })
}

/**
 * 记录详细的segments信息
 * @param {Array} segments - 识别片段
 */
export async function logDetailedSegments(segments) {
  if (!segments || !Array.isArray(segments)) {
    return
  }

  const detailedSegments = segments.map((segment, index) => ({
    index,
    text: segment.text,
    textLength: segment.text ? segment.text.length : 0,
    start: segment.start,
    end: segment.end,
    duration: segment.end && segment.start ? segment.end - segment.start : null,
    hasWords: !!(segment.words && segment.words.length > 0),
    wordCount: segment.words ? segment.words.length : 0,
    confidence: segment.confidence
  }))

  await logToFile('recognition', 'detailed_segments', {
    segmentCount: segments.length,
    segments: detailedSegments
  })
}

/**
 * 记录细颗粒度处理过程
 * @param {Array} segments - 原始segments
 * @param {Object} options - 处理选项
 * @param {string} result - 处理结果
 */
export async function logFineGrainedProcessing(segments, options, result) {
  // 检测重复文本
  const textAnalysis = analyzeTextRepetition(segments)

  await logToFile('fineGrained', 'processing', {
    inputSegmentCount: segments.length,
    options,
    textAnalysis,
    resultLength: result ? result.length : 0,
    resultPreview: result ? result.substring(0, 200) + (result.length > 200 ? '...' : '') : null
  })
}

/**
 * 分析文本重复情况
 * @param {Array} segments - 识别片段
 * @returns {Object} 重复分析结果
 */
function analyzeTextRepetition(segments) {
  if (!segments || !Array.isArray(segments)) {
    return { analysis: 'no_segments' }
  }

  const textCounts = {}
  const consecutiveRepeats = []
  let currentRepeat = { text: '', count: 0, indices: [] }

  segments.forEach((segment, index) => {
    const text = segment.text ? segment.text.trim() : ''

    if (!text) {
      return
    }

    // 统计文本出现次数
    textCounts[text] = (textCounts[text] || 0) + 1

    // 检测连续重复
    if (text === currentRepeat.text) {
      currentRepeat.count++
      currentRepeat.indices.push(index)
    } else {
      if (currentRepeat.count > 1) {
        consecutiveRepeats.push({ ...currentRepeat })
      }
      currentRepeat = { text, count: 1, indices: [index] }
    }
  })

  // 处理最后一个重复组
  if (currentRepeat.count > 1) {
    consecutiveRepeats.push(currentRepeat)
  }

  return {
    totalSegments: segments.length,
    uniqueTexts: Object.keys(textCounts).length,
    textCounts,
    consecutiveRepeats: consecutiveRepeats.map(r => ({
      text: r.text,
      count: r.count,
      indices: r.indices
    })),
    hasRepetition: consecutiveRepeats.length > 0
  }
}

/**
 * 记录字幕生成过程
 * @param {Array} segments - 识别片段
 * @param {string} format - 字幕格式
 * @param {string} result - 生成结果
 */
export async function logSubtitleGeneration(segments, format, result) {
  await logToFile('subtitle', 'generation', {
    segmentCount: segments.length,
    format,
    resultLength: result ? result.length : 0,
    resultPreview: result ? result.substring(0, 200) + (result.length > 200 ? '...' : '') : null
  })
}

/**
 * 记录AI优化过程
 * @param {string} originalText - 原始文本
 * @param {string} aiPrompt - AI提示词
 * @param {Object} options - 选项
 */
export async function logAIOptimization(originalText, aiPrompt, options) {
  await logToFile('ai', 'optimization', {
    originalTextLength: originalText ? originalText.length : 0,
    originalTextPreview: originalText ? originalText.substring(0, 200) + (originalText.length > 200 ? '...' : '') : null,
    aiPromptLength: aiPrompt ? aiPrompt.length : 0,
    options
  })
}

/**
 * 记录识别完成
 * @param {Object} finalResult - 最终结果
 */
export async function logRecognitionComplete(finalResult) {
  await logToFile('recognition', 'complete', {
    hasText: !!finalResult.text,
    textLength: finalResult.text ? finalResult.text.length : 0,
    hasSegments: !!(finalResult.segments && finalResult.segments.length > 0),
    segmentCount: finalResult.segments ? finalResult.segments.length : 0,
    hasTimestampedText: !!finalResult.timestampedText,
    timestampedTextLength: finalResult.timestampedText ? finalResult.timestampedText.length : 0,
    hasAIOptimizationPrompt: !!finalResult.aiOptimizationPrompt,
    duration: finalResult.duration,
    language: finalResult.language
  })
}

// 提供一个全局的日志管理对象
export const RecognitionLogger = {
  logToFile,
  downloadLogFile,
  listAvailableLogs,
  downloadTodayLog,
  cleanupOldLogs,
  logRecognitionStart,
  logRawRecognitionResponse,
  logDetailedSegments,
  logFineGrainedProcessing,
  logSubtitleGeneration,
  logAIOptimization,
  logRecognitionComplete
}

export default RecognitionLogger

// 日志记录器 - 仅使用浏览器控制台，不暴露到全局
console.log('🔍 RecognitionLogger 已加载，使用浏览器控制台查看识别过程信息')