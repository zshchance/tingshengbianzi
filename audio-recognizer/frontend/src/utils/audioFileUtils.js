/**
 * 音频文件处理工具函数
 * 从 App.vue 中提取出来的工具函数，用于减少主文件的复杂度
 */

/**
 * 将文件转换为Base64编码
 * @param {File} file - 要转换的文件对象
 * @returns {Promise<string>} Base64编码的文件数据
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      // 移除数据URL前缀，只保留Base64数据
      const base64Data = result.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化时间为 HH:MM:SS 格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (seconds) => {
  console.log('formatTime 输入的秒数:', seconds, typeof seconds)

  if (!seconds || isNaN(seconds)) {
    console.log('formatTime: 秒数为空或无效，返回00:00')
    return '00:00'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  console.log('formatTime 计算后 - 小时:', hours, '分钟:', minutes, '秒:', secs)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

/**
 * 格式化时长为 MM:SS 格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * 根据文件大小估算音频时长
 * @param {number} fileSize - 文件大小（字节）
 * @param {string} fileName - 文件名（用于判断格式）
 * @returns {number} 估算的时长（秒）
 */
export const estimateDurationFromSize = (fileSize, fileName) => {
  // 获取文件扩展名
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  // 根据文件格式设置不同的比特率估算
  let bitrate = 128000 // 默认128kbps

  switch (extension) {
    case 'mp3':
      bitrate = 128000 // MP3通常128kbps
      break
    case 'wav':
      bitrate = 1411000 // WAV通常无损，约1.4Mbps
      break
    case 'm4a':
    case 'aac':
      bitrate = 128000 // AAC通常128kbps
      break
    case 'ogg':
      bitrate = 160000 // OGG Vorbis通常160kbps
      break
    case 'flac':
      bitrate = 1000000 // FLAC无损约1Mbps
      break
    default:
      bitrate = 128000 // 默认估算
  }

  // 计算时长（秒）
  const estimatedDuration = (fileSize * 8) / bitrate

  console.log(`时长估算: 文件大小=${fileSize}字节, 比特率=${bitrate}bps, 估算时长=${estimatedDuration}秒`)

  // 设置合理的范围：最小1秒，最大10小时
  const minDuration = 1
  const maxDuration = 36000 // 10小时

  return Math.max(minDuration, Math.min(maxDuration, Math.round(estimatedDuration)))
}

/**
 * 获取音频时长（浏览器方式）
 * @param {File} file - 音频文件对象
 * @returns {Promise<number>} 音频时长（秒）
 */
export const getBrowserAudioDuration = (file) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    let timeoutId = null

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        cleanup()
        resolve(audio.duration)
      } else {
        cleanup()
        reject(new Error('无法获取音频时长'))
      }
    }

    const handleError = (error) => {
      cleanup()
      reject(new Error('音频加载失败'))
    }

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
      URL.revokeObjectURL(audio.src)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError)

    // 设置超时
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('音频时长获取超时'))
    }, 15000)

    audio.src = URL.createObjectURL(file)
  })
}

/**
 * 检查文件是否为支持的音频格式
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为支持的音频格式
 */
export const isSupportedAudioFile = (file) => {
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/m4a']
  const fileName = file.name.toLowerCase()
  const isAudio = audioTypes.some(type => file.type.includes(type.split('/')[1])) ||
                fileName.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)
  return isAudio
}

/**
 * 获取文件类型的描述
 * @param {string} extension - 文件扩展名
 * @returns {string} 文件类型描述
 */
export const getFileTypeDescription = (extension) => {
  const typeMap = {
    'mp3': 'MP3音频',
    'wav': 'WAV音频',
    'm4a': 'M4A音频',
    'aac': 'AAC音频',
    'ogg': 'OGG音频',
    'flac': 'FLAC音频'
  }
  return typeMap[extension.toLowerCase()] || '音频文件'
}

/**
 * 创建文件信息对象
 * @param {File} file - 文件对象
 * @param {number} [duration] - 音频时长（可选）
 * @returns {Object} 文件信息对象
 */
export const createFileInfo = (file, duration = null) => {
  const extension = file.name.split('.').pop()

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    path: file.path || file.webkitRelativePath || file.name,
    lastModified: file.lastModified,
    duration: duration || 0,
    hasPath: !!file.path,
    formattedSize: formatFileSize(file.size),
    formattedType: getFileTypeDescription(extension),
    formattedDuration: duration ? formatDuration(duration) : '计算中...',
    extension: extension?.toUpperCase()
  }
}