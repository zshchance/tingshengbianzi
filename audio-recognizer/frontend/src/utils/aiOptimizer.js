/**
 * AI优化文本处理工具模块
 * 基于设计文档中的AI优化提示词模板实现
 */

/**
 * AI优化提示词模板
 * 基于设计文档第440-472行的规范
 */
const AI_OPTIMIZATION_PROMPT_TEMPLATE = `请优化以下音频识别结果，要求：

1. 基础优化
   - 修正明显的错别字和语法错误
   - 优化断句和标点符号
   - 保持语义完整性和连贯性

2. 标记处理
   - 保留所有时间标记 [HH:MM:SS.mmm] 不变
   - 处理特殊标记：
     * 【强调】...【/强调】→ 保留并优化强调内容
     * 【不清:xxx】→ 根据上下文推测或标记为[听不清]
     * 【音乐】...【/音乐】→ 保留音乐片段标记
     * 【停顿·短/中/长】→ 转换为合适的标点符号

3. 内容优化
   - 修正专业术语和专有名词
   - 优化口语化表达
   - 保持原文语气和风格
   - 识别并标记重要信息

4. 输出格式
   - 保持原有时间标记格式
   - 使用规范的标点符号
   - 段落清晰，便于阅读

原始识别结果：
【RECOGNITION_TEXT】

优化后的文本：`

/**
 * 特殊标记映射规则
 * 基于设计文档第402-437行的规范
 */
const SPECIAL_MARKERS = {
  // 停顿标记映射到标点符号
  pause: {
    '【停顿·短】': '，', // 短停顿映射为逗号
    '【停顿·中】': '。', // 中等停顿映射为句号
    '【停顿·长】': '。\n\n' // 长停顿映射为句号加换行
  },

  // 不清晰词汇处理
  unclear: {
    pattern: /【不清:([^】]+)】/g,
    replacement: '[听不清]'
  },

  // 强调标记保留但优化内容
  emphasis: {
    start: '【强调】',
    end: '【/强调】'
  },

  // 音乐标记保留
  music: {
    start: '【音乐】',
    end: '【/音乐】'
  },

  // 说话人标记保留
  speaker: {
    pattern: /【说话人:([^】]+)】/g
  },

  // 语言切换标记保留
  language: {
    pattern: /【语言:([^】]+)】/g
  }
}

/**
 * 文本清洗规则
 */
const TEXT_CLEANING_RULES = {
  // 修正常见错别字
  commonTypos: {
    '的得地': '的地得',
    '在再': '在再',
    '那哪': '那哪'
  },

  // 优化重复词语
  repeatedWords: {
    pattern: /(\w+)\s+\1+/g,
    minRepeats: 2
  },

  // 修复断句
  sentenceBreaks: {
    pattern: /([。！？])\s*([a-z])/g,
    replacement: '$1\n\n$2'
  }
}

/**
 * 生成AI优化提示词
 * @param {string} timestampedText - 带时间戳的文本
 * @param {Object} options - 优化选项
 * @returns {string} AI优化提示词
 */
export function generateAIOptimizationPrompt(timestampedText, options = {}) {
  const config = {
    includeBasicOptimization: true,
    includeMarkerProcessing: true,
    includeContentOptimization: true,
    preserveTimestamps: true,
    customRequirements: '',
    ...options
  }

  let prompt = AI_OPTIMIZATION_PROMPT_TEMPLATE

  // 替换占位符
  prompt = prompt.replace('【RECOGNITION_TEXT】', timestampedText || '')

  // 添加自定义要求
  if (config.customRequirements) {
    prompt = prompt.replace(
      '4. 输出格式',
      `4. 额外要求\n   ${config.customRequirements}\n\n5. 输出格式`
    )
  }

  return prompt
}

/**
 * 预处理文本，应用基础的文本清洗规则
 * @param {string} text - 原始文本
 * @returns {string} 预处理后的文本
 */
export function preprocessText(text) {
  if (!text || typeof text !== 'string') return text

  let processedText = text

  // 1. 处理停顿标记
  processedText = processPauseMarkers(processedText)

  // 2. 处理不清晰词汇
  processedText = processUnclearMarkers(processedText)

  // 3. 修复常见错别字（简单示例）
  processedText = fixCommonTypos(processedText)

  // 4. 优化断句
  processedText = optimizeSentenceBreaks(processedText)

  return processedText
}

/**
 * 处理停顿标记，转换为标点符号
 * @param {string} text - 包含停顿标记的文本
 * @returns {string} 处理后的文本
 */
function processPauseMarkers(text) {
  let processed = text

  // 按长度排序，先处理长的停顿，避免冲突
  const pauseMarkers = Object.keys(SPECIAL_MARKERS.pause).sort((a, b) => b.length - a.length)

  pauseMarkers.forEach(marker => {
    processed = processed.replaceAll(marker, SPECIAL_MARKERS.pause[marker])
  })

  return processed
}

/**
 * 处理不清晰词汇标记
 * @param {string} text - 包含不清晰标记的文本
 * @returns {string} 处理后的文本
 */
function processUnclearMarkers(text) {
  return text.replace(SPECIAL_MARKERS.unclear.pattern, SPECIAL_MARKERS.unclear.replacement)
}

/**
 * 修复常见错别字
 * @param {string} text - 原始文本
 * @returns {string} 修复后的文本
 */
function fixCommonTypos(text) {
  // 这里是一个简化的实现，实际应用中可以扩展更复杂的规则
  const commonMistakes = [
    { from: /的的/g, to: '的' },
    { from: /了了/g, to: '了' },
    { from: /和和/g, to: '和' },
    { from: /是是/g, to: '是' },
    { from: /在在/g, to: '在' }
  ]

  let fixed = text
  commonMistakes.forEach(mistake => {
    fixed = fixed.replace(mistake.from, mistake.to)
  })

  return fixed
}

/**
 * 优化断句
 * @param {string} text - 原始文本
 * @returns {string} 优化断句后的文本
 */
function optimizeSentenceBreaks(text) {
  // 确保句末标点后有适当的空格
  let optimized = text.replace(/([。！？])([^\s\n])/g, '$1 $2')

  // 移除多余的空行
  optimized = optimized.replace(/\n{3,}/g, '\n\n')

  return optimized.trim()
}

/**
 * 提取文本中的特殊标记统计信息
 * @param {string} text - 文本内容
 * @returns {Object} 特殊标记统计
 */
export function analyzeSpecialMarkers(text) {
  if (!text || typeof text !== 'string') {
    return {
      pauseCount: 0,
      unclearCount: 0,
      emphasisCount: 0,
      musicCount: 0,
      speakerCount: 0,
      languageCount: 0,
      timestampCount: 0
    }
  }

  const analysis = {
    pauseCount: 0,
    unclearCount: 0,
    emphasisCount: 0,
    musicCount: 0,
    speakerCount: 0,
    languageCount: 0,
    timestampCount: 0
  }

  // 统计停顿标记
  Object.keys(SPECIAL_MARKERS.pause).forEach(marker => {
    const matches = text.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    analysis.pauseCount += matches ? matches.length : 0
  })

  // 统计不清晰标记
  const unclearMatches = text.match(SPECIAL_MARKERS.unclear.pattern)
  analysis.unclearCount = unclearMatches ? unclearMatches.length : 0

  // 统计强调标记
  const emphasisStartMatches = text.split(SPECIAL_MARKERS.emphasis.start).length - 1
  const emphasisEndMatches = text.split(SPECIAL_MARKERS.emphasis.end).length - 1
  analysis.emphasisCount = Math.min(emphasisStartMatches, emphasisEndMatches)

  // 统计音乐标记
  const musicStartMatches = text.split(SPECIAL_MARKERS.music.start).length - 1
  const musicEndMatches = text.split(SPECIAL_MARKERS.music.end).length - 1
  analysis.musicCount = Math.min(musicStartMatches, musicEndMatches)

  // 统计说话人标记
  const speakerMatches = text.match(SPECIAL_MARKERS.speaker.pattern)
  analysis.speakerCount = speakerMatches ? speakerMatches.length : 0

  // 统计语言切换标记
  const languageMatches = text.match(SPECIAL_MARKERS.language.pattern)
  analysis.languageCount = languageMatches ? languageMatches.length : 0

  // 统计时间戳
  const timestampMatches = text.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g)
  analysis.timestampCount = timestampMatches ? timestampMatches.length : 0

  return analysis
}

/**
 * 生成文本质量报告
 * @param {string} text - 文本内容
 * @returns {Object} 质量报告
 */
export function generateTextQualityReport(text) {
  if (!text || typeof text !== 'string') {
    return {
      totalLength: 0,
      wordCount: 0,
      sentenceCount: 0,
      averageWordsPerSentence: 0,
      specialMarkerAnalysis: analyzeSpecialMarkers(text),
      qualityScore: 0,
      suggestions: ['文本为空，无法分析质量']
    }
  }

  const markerAnalysis = analyzeSpecialMarkers(text)

  // 基础统计
  const totalLength = text.length
  const words = text.split(/\s+/).filter(word => word.length > 0)
  const wordCount = words.length
  const sentences = text.split(/[。！？]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length
  const averageWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount * 10) / 10 : 0

  // 质量评分 (0-100)
  let qualityScore = 100

  // 根据不清晰标记扣分
  qualityScore -= markerAnalysis.unclearCount * 5

  // 根据断句合理性扣分
  if (averageWordsPerSentence > 50) qualityScore -= 10 // 句子过长
  if (averageWordsPerSentence < 3) qualityScore -= 10 // 句子过短

  // 根据重复词语扣分
  const repeatedWords = text.match(/(\w+)\s+\1+/g)
  if (repeatedWords) qualityScore -= repeatedWords.length * 3

  qualityScore = Math.max(0, Math.min(100, qualityScore))

  // 生成建议
  const suggestions = []

  if (markerAnalysis.unclearCount > 0) {
    suggestions.push(`发现 ${markerAnalysis.unclearCount} 处不清晰词汇，建议人工核对`)
  }

  if (averageWordsPerSentence > 50) {
    suggestions.push('部分句子过长，建议适当增加断句')
  }

  if (averageWordsPerSentence < 3) {
    suggestions.push('句子过短，可能影响阅读流畅性')
  }

  if (repeatedWords && repeatedWords.length > 0) {
    suggestions.push(`发现 ${repeatedWords.length} 处重复词语，建议优化`)
  }

  if (markerAnalysis.pauseCount > wordCount * 0.2) {
    suggestions.push('停顿标记较多，可能影响阅读流畅性')
  }

  return {
    totalLength,
    wordCount,
    sentenceCount,
    averageWordsPerSentence,
    specialMarkerAnalysis: markerAnalysis,
    qualityScore: Math.round(qualityScore),
    suggestions: suggestions.length > 0 ? suggestions : ['文本质量良好，无明显问题']
  }
}

/**
 * 应用AI优化结果（手动应用AI返回的优化文本）
 * @param {string} originalText - 原始文本
 * @param {string} optimizedText - AI优化后的文本
 * @returns {Object} 优化结果
 */
export function applyAIOptimization(originalText, optimizedText) {
  if (!originalText || !optimizedText) {
    return {
      success: false,
      error: '原始文本或优化文本为空',
      result: null
    }
  }

  try {
    // 验证时间戳是否被保留
    const originalTimestamps = originalText.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g) || []
    const optimizedTimestamps = optimizedText.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g) || []

    const timestampsPreserved = originalTimestamps.length === optimizedTimestamps.length

    return {
      success: true,
      result: {
        originalText,
        optimizedText,
        timestampsPreserved,
        originalTimestampCount: originalTimestamps.length,
        optimizedTimestampCount: optimizedTimestamps.length,
        qualityImprovement: generateTextQualityReport(optimizedText).qualityScore - generateTextQualityReport(originalText).qualityScore
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `处理优化结果时出错: ${error.message}`,
      result: null
    }
  }
}

// 默认导出所有功能
export default {
  generateAIOptimizationPrompt,
  preprocessText,
  analyzeSpecialMarkers,
  generateTextQualityReport,
  applyAIOptimization,
  SPECIAL_MARKERS,
  AI_OPTIMIZATION_PROMPT_TEMPLATE
}