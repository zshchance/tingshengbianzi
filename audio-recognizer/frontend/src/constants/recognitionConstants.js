/**
 * 语音识别相关的常量配置
 * 从 App.vue 中提取出来的常量，用于减少主文件的复杂度
 */

/**
 * 支持的音频类型
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/m4a'
]

/**
 * 支持的音频文件扩展名
 */
export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']

/**
 * 音频格式比特率配置（用于时长估算）
 */
export const AUDIO_BITRATE_CONFIG = {
  mp3: 128000,    // MP3通常128kbps
  wav: 1411000,   // WAV通常无损，约1.4Mbps
  m4a: 128000,    // M4A/AAC通常128kbps
  aac: 128000,    // AAC通常128kbps
  ogg: 160000,    // OGG Vorbis通常160kbps
  flac: 1000000   // FLAC无损约1Mbps
}

/**
 * 默认比特率（用于未知格式）
 */
export const DEFAULT_BITRATE = 128000

/**
 * 时长估算的范围限制
 */
export const DURATION_LIMITS = {
  MIN_DURATION: 1,        // 最小时长：1秒
  MAX_DURATION: 36000     // 最大时长：10小时
}

/**
 * 识别状态常量
 */
export const RECOGNITION_STATUS = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  STOPPED: 'stopped'
}

/**
 * 进度条状态文本
 */
export const PROGRESS_STATUS_TEXT = {
  PREPARING: '请稍等，Whisper正在进行识别...',
  PROCESSING: '正在分析音频内容...',
  FINALIZING: '正在整理识别结果...',
  COMPLETED: '识别完成！',
  ERROR: '识别失败',
  STOPPED: '识别已停止'
}

/**
 * 默认识别配置
 */
export const DEFAULT_RECOGNITION_CONFIG = {
  language: 'zh-CN',
  modelPath: './models',
  enableWordTimestamp: true,
  confidenceThreshold: 0.5,
  sampleRate: 16000,
  enableNormalization: true,
  enableNoiseReduction: false
}

/**
 * AI模板类型
 */
export const AI_TEMPLATE_TYPES = {
  BASIC: 'basic',
  DETAILED: 'detailed',
  SUMMARY: 'summary',
  TIMESTAMPS: 'timestamps',
  CLEANUP: 'cleanup'
}

/**
 * 去重配置参数
 */
export const DEDUPLICATION_CONFIG = {
  similarityThreshold: 0.85,    // 85% 相似度阈值
  timeOverlapThreshold: 0.3,   // 30% 时间重叠阈值
  minLength: 3,                // 最小有效长度
  enableTimeAnalysis: true,    // 启用时间重叠分析
  enableSemanticAnalysis: false // 暂不启用语义分析
}

/**
 * 细颗粒度时间戳配置
 */
export const FINE_GRAINED_TIMESTAMP_CONFIG = {
  minSegmentLength: 6,   // 最小片段长度
  maxSegmentLength: 15,  // 最大片段长度
  defaultAverageSpeed: 150 // 默认平均语速（字符/分钟）
}

/**
 * 文件处理超时配置
 */
export const FILE_PROCESSING_TIMEOUT = {
  AUDIO_DURATION: 15000, // 音频时长获取超时：15秒
  FILE_READING: 30000    // 文件读取超时：30秒
}

/**
 * Toast消息类型
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

/**
 * 应用信息常量
 */
export const APP_INFO = {
  NAME: '听声辨字',
  VERSION: '1.0.0',
  DESCRIPTION: '一款基于 Whisper 引擎的智能音频识别工具，支持多种音频格式的语音转文字功能，并提供精确的时间戳和AI优化选项。',
  AUTHOR: '这家伙很懒',
  EMAIL: 'zshchance@qq.com',
  WEBSITE: 'administrator.wiki'
}

/**
 * 技术栈信息
 */
export const TECH_STACK = [
  { icon: '🔧', name: '后端', tech: 'Go + Wails v2' },
  { icon: '🎨', name: '前端', tech: 'Vue.js 3 + Vite' },
  { icon: '🤖', name: '识别引擎', tech: 'Whisper.cpp' },
  { icon: '🎵', name: '音频处理', tech: 'FFmpeg' }
]

/**
 * 免费声明文本
 */
export const FREE_LICENSE_NOTICE = {
  title: '免费声明',
  content: [
    '本软件完全免费使用，严禁任何商家或个人进行贩卖获利！',
    '本软件使用 Whisper 开源引擎进行语音识别，遵循开源协议。',
    '用户可以免费使用、修改和分发，但不得用于商业目的。'
  ]
}

/**
 * 获取比特率配置
 * @param {string} extension - 文件扩展名
 * @returns {number} 比特率值
 */
export const getBitrateByExtension = (extension) => {
  return AUDIO_BITRATE_CONFIG[extension?.toLowerCase()] || DEFAULT_BITRATE
}

/**
 * 检查是否为支持的音频文件
 * @param {File} file - 文件对象
 * @returns {boolean} 是否支持
 */
export const isSupportedAudioFormat = (file) => {
  if (!file) return false

  // 检查MIME类型
  const isAudioType = SUPPORTED_AUDIO_TYPES.some(type =>
    file.type.includes(type.split('/')[1])
  )

  // 检查文件扩展名
  const fileName = file.name.toLowerCase()
  const hasValidExtension = SUPPORTED_AUDIO_EXTENSIONS.some(ext =>
    fileName.endsWith(`.${ext}`)
  )

  return isAudioType || hasValidExtension
}