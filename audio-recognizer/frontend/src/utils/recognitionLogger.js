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

/**
 * 记录日志到文件
 * @param {string} logType - 日志类型 (recognition|fineGrained|subtitle|ai)
 * @param {string} action - 动作描述
 * @param {any} data - 要记录的数据
 */
export async function logToFile(logType, action, data) {
  try {
    // 只在开发环境中记录日志
    if (process.env.NODE_ENV === 'production') {
      return
    }

    const timestamp = formatTimestamp()
    const logEntry = {
      timestamp,
      logType,
      action,
      data: sanitizeData(data)
    }

    // 生成日志文件名（按日期）
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
    const logFileName = `recognition-log-${dateStr}.jsonl`

    // 构建日志内容
    const logLine = JSON.stringify(logEntry) + '\n'

    // 使用Wails API写入文件（如果可用）或者使用浏览器下载
    if (window.go && window.go.main && window.go.main.App && window.go.main.App.WriteLogToFile) {
      try {
        await window.go.main.App.WriteLogToFile(logFileName, logLine)
      } catch (wailsError) {
        console.warn('无法使用Wails写入日志文件，尝试使用浏览器下载:', wailsError)
        fallbackToBrowserDownload(logFileName, logLine)
      }
    } else {
      // 回退到浏览器控制台和下载
      console.log(`[${logType.toUpperCase()}] ${action}:`, logEntry.data)
      fallbackToBrowserDownload(logFileName, logLine)
    }

  } catch (error) {
    console.error('日志记录失败:', error)
  }
}

/**
 * 回退到浏览器下载方式
 * @param {string} fileName - 文件名
 * @param {string} content - 文件内容
 */
function fallbackToBrowserDownload(fileName, content) {
  try {
    // 创建一个临时的日志存储
    if (!window.recognitionLogs) {
      window.recognitionLogs = {}
    }

    if (!window.recognitionLogs[fileName]) {
      window.recognitionLogs[fileName] = []
    }

    window.recognitionLogs[fileName].push(content)

    // 限制内存中的日志条数，避免内存泄漏
    if (window.recognitionLogs[fileName].length > 1000) {
      window.recognitionLogs[fileName] = window.recognitionLogs[fileName].slice(-500)
    }

    console.log(`日志已暂存到内存: ${fileName} (当前${window.recognitionLogs[fileName].length}条记录)`)

  } catch (error) {
    console.error('浏览器日志回退失败:', error)
  }
}

/**
 * 下载累积的日志文件
 * @param {string} fileName - 文件名
 */
export function downloadLogFile(fileName) {
  if (!window.recognitionLogs || !window.recognitionLogs[fileName]) {
    console.warn('没有找到日志文件:', fileName)
    console.log('💡 可用的日志文件:', Object.keys(window.recognitionLogs || {}))
    console.log('🔍 使用 listAvailableLogs() 查看所有可用日志文件')
    return
  }

  try {
    const content = window.recognitionLogs[fileName].join('')
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`✅ 日志文件已下载: ${fileName}`)
    console.log(`📊 文件包含 ${window.recognitionLogs[fileName].length} 条日志记录`)
  } catch (error) {
    console.error('❌ 下载日志文件失败:', error)
  }
}

/**
 * 列出所有可用的日志文件
 */
export function listAvailableLogs() {
  if (!window.recognitionLogs) {
    console.log('📝 暂无日志文件')
    return
  }

  const logFiles = Object.keys(window.recognitionLogs)
  if (logFiles.length === 0) {
    console.log('📝 暂无日志文件')
    return
  }

  console.log('📁 可用的日志文件:')
  logFiles.forEach(fileName => {
    const recordCount = window.recognitionLogs[fileName].length
    const fileSize = new Blob([window.recognitionLogs[fileName].join('')]).size
    console.log(`  📄 ${fileName} (${recordCount} 条记录, ${(fileSize / 1024).toFixed(1)} KB)`)
  })

  console.log('💡 下载命令: RecognitionLogger.downloadLogFile("文件名")')
}

/**
 * 下载今日日志文件
 */
export function downloadTodayLog() {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
  const todayFileName = `recognition-log-${dateStr}.jsonl`
  downloadLogFile(todayFileName)
}

/**
 * 清理旧的日志文件以释放内存
 * @param {number} keepRecent - 保留最近几个文件的日志
 */
export function cleanupOldLogs(keepRecent = 5) {
  if (!window.recognitionLogs) return

  const logFiles = Object.keys(window.recognitionLogs)
  if (logFiles.length <= keepRecent) return

  // 按文件名排序（日期格式），删除最旧的文件
  logFiles.sort()
  const filesToDelete = logFiles.slice(0, logFiles.length - keepRecent)

  filesToDelete.forEach(fileName => {
    delete window.recognitionLogs[fileName]
    console.log(`🗑️ 已清理旧日志文件: ${fileName}`)
  })

  console.log(`✅ 日志清理完成，保留了最近的 ${keepRecent} 个文件`)
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

// 将日志记录器暴露到全局 window 对象，使其在浏览器控制台中可访问
if (typeof window !== 'undefined') {
  window.RecognitionLogger = RecognitionLogger
  console.log('🔍 RecognitionLogger 已暴露到全局，可以通过 window.RecognitionLogger 或 RecognitionLogger 直接访问')
  console.log('📋 可用方法:')
  console.log('  • RecognitionLogger.listAvailableLogs() - 列出所有日志文件')
  console.log('  • RecognitionLogger.downloadTodayLog() - 下载今日日志')
  console.log('  • RecognitionLogger.downloadLogFile("文件名") - 下载指定日志文件')
  console.log('  • RecognitionLogger.cleanupOldLogs() - 清理旧日志文件')
  console.log('  • RecognitionLogger.logRecognitionStart(data) - 记录识别开始')
  console.log('  • RecognitionLogger.logFineGrainedProcessing(segments, options, result) - 记录细颗粒度处理')
}