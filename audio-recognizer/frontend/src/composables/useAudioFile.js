import { ref, computed, watch } from 'vue'
import { useToastStore } from '../stores/toast'

export function useAudioFile() {
  const toastStore = useToastStore()

  // 响应式状态
  const currentFile = ref(null)
  const isLoading = ref(false)
  const dragOver = ref(false)

  // 计算属性
  const hasFile = computed(() => {
    const result = currentFile.value !== null && currentFile.value.file !== null
    console.log('📊 hasFile 计算:', {
      currentFile: currentFile.value,
      hasCurrentFile: currentFile.value !== null,
      hasFileObject: currentFile.value?.file !== null,
      result: result,
      timestamp: new Date().toISOString()
    })
    return result
  })

  const fileInfo = computed(() => {
    if (!currentFile.value || !currentFile.value.file) return null

    const file = currentFile.value.file
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
    const extension = file.name.split('.').pop()?.toUpperCase() || 'Unknown'

    return {
      name: file.name,
      size: file.size,
      sizeFormatted: `${sizeInMB} MB`,
      type: file.type,
      extension,
      lastModified: new Date(file.lastModified)
    }
  })

  // 调试：监听状态变化
  watch(currentFile, (newVal, oldVal) => {
    console.log('🔄 currentFile 状态变化:', {
      oldVal: oldVal ? { hasFile: true, fileName: oldVal.file?.name } : null,
      newVal: newVal ? { hasFile: true, fileName: newVal.file?.name } : null,
      timestamp: new Date().toISOString()
    })
  })

  watch(isLoading, (newVal) => {
    console.log('🔄 isLoading 状态变化:', { value: newVal, timestamp: new Date().toISOString() })
  })

  watch(hasFile, (newVal) => {
    console.log('🔄 hasFile 状态变化:', { value: newVal, timestamp: new Date().toISOString() })
  })

  // 支持的音频格式
  const supportedFormats = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/m4a'
  ]

  // 文件大小限制（100MB）
  const maxFileSize = 100 * 1024 * 1024

  
  // 验证文件
  const validateFile = (file) => {
    // 检查文件类型
    if (!supportedFormats.includes(file.type) && !file.name.match(/\.(mp3|wav|mp4|m4a|aac|ogg|flac)$/i)) {
      throw new Error('不支持的文件格式。请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 文件。')
    }

    // 检查文件大小
    if (file.size > maxFileSize) {
      throw new Error(`文件过大。最大支持 ${maxFileSize / (1024 * 1024)}MB 的文件。`)
    }

    return true
  }

  // 格式化时长
  const formatDuration = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '未知'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // 获取音频文件时长（使用HTML5 Audio API）
  const getAudioDuration = (file) => {
    console.log('🎵 开始获取音频时长:', { fileName: file.name, fileSize: file.size })
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio()
        const url = URL.createObjectURL(file)
        console.log('🔗 创建音频对象URL:', url)

        const timeoutId = setTimeout(() => {
          console.error('⏰ 音频时长获取超时')
          URL.revokeObjectURL(url)
          reject(new Error('音频时长获取超时'))
        }, 10000) // 10秒超时

        audio.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId)
          console.log('✅ 音频元数据加载成功:', { duration: audio.duration })
          URL.revokeObjectURL(url)
          resolve(audio.duration)
        })

        audio.addEventListener('error', (error) => {
          clearTimeout(timeoutId)
          console.error('❌ 音频加载错误:', error)
          URL.revokeObjectURL(url)
          reject(new Error('无法读取音频文件元数据'))
        })

        audio.src = url
        console.log('🎯 设置音频源，开始加载...')
      } catch (error) {
        console.error('❌ 音频处理异常:', error)
        reject(new Error('音频处理失败'))
      }
    })
  }

  // 处理文件选择
  const selectFile = async (file) => {
    console.log('🚀 开始选择文件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    })

    try {
      isLoading.value = true
      console.log('⏳ 设置 isLoading = true')

      // 验证文件
      console.log('📋 开始验证文件...')
      validateFile(file)
      console.log('✅ 文件验证通过')

      // 获取音频时长
      console.log('⏱️ 开始获取音频时长...')
      const duration = await getAudioDuration(file)
      console.log('✅ 音频时长获取成功:', { duration, formatted: formatDuration(duration) })

      // 保存文件信息，保留拖拽标记
      const fileInfo = {
        file,
        duration,
        durationFormatted: formatDuration(duration),
        selectedAt: new Date(),
        isDragged: file.isDragged || (!file.path && file instanceof File)
      }

      console.log('💾 准备保存文件信息:', fileInfo)
      currentFile.value = fileInfo
      console.log('✅ 文件信息已保存到 currentFile')

      toastStore.showSuccess('文件选择成功', `"${file.name}" 已准备就绪`)

      return currentFile.value

    } catch (error) {
      console.error('❌ 文件选择失败:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
      toastStore.showError('文件选择失败', error.message)
      currentFile.value = null
      console.log('🗑️ 已清空 currentFile')
      throw error
    } finally {
      isLoading.value = false
      console.log('⏹️ 设置 isLoading = false')
    }
  }

  // 处理文件拖拽
  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragOver.value = true
    console.log('🎯 拖拽悬停事件触发')
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragOver.value = false
    console.log('🎯 拖拽离开事件触发')
  }

  const handleDrop = async (event) => {
    console.log('🎯 拖拽释放事件触发')
    event.preventDefault()
    event.stopPropagation()
    dragOver.value = false

    const files = event.dataTransfer.files
    console.log('📁 拖拽文件数量:', files.length)

    if (files.length === 0) {
      console.log('⚠️ 没有文件被拖拽')
      return
    }

    const file = files[0]
    console.log('📄 选择拖拽文件:', file.name)
    await selectFile(file)
  }

  // 处理文件选择对话框
  const openFileDialog = () => {
    console.log('🗂️ 打开文件选择对话框')

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = supportedFormats.join(',')
    input.multiple = false

    const cleanup = () => {
      // 清理DOM元素
      if (input && input.parentNode) {
        input.parentNode.removeChild(input)
      }
    }

    input.onchange = async (event) => {
      console.log('📂 文件选择对话框状态变化')
      const file = event.target.files[0]
      if (file) {
        console.log('📄 用户选择文件:', file.name)
        await selectFile(file)
      } else {
        console.log('⚠️ 用户未选择文件')
      }
      cleanup()
    }

    input.oncancel = () => {
      console.log('❌ 用户取消了文件选择')
      cleanup()
    }

    // 添加错误处理
    input.onerror = (error) => {
      console.error('❌ 文件对话框错误:', error)
      cleanup()
    }

    input.click()
  }

  // 清除当前文件
  const clearFile = () => {
    currentFile.value = null
    dragOver.value = false
    toastStore.showInfo('文件已清除', '可以重新选择音频文件')
  }

  return {
    // 响应式状态
    currentFile,
    isLoading,
    dragOver,
    hasFile,
    fileInfo,

    // 方法
    selectFile,
    clearFile,
    openFileDialog,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getAudioDuration,
    formatDuration,

    // 配置
    supportedFormats,
    maxFileSize
  }
}