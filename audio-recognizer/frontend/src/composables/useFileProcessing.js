/**
 * 文件处理逻辑
 * 从 App.vue 中提取出来的文件处理功能，用于减少主文件的复杂度
 */
import { ref } from 'vue'
import {
  formatFileSize,
  formatTime,
  estimateDurationFromSize,
  getBrowserAudioDuration,
  isSupportedAudioFile,
  createFileInfo
} from '../utils/audioFileUtils'

/**
 * 文件处理管理的composable
 * @param {Object} options - 配置选项
 * @param {Function} options.selectFile - 文件选择函数
 * @param {Ref<Object>} options.currentFile - 当前文件
 * @param {Function} options.getAudioDuration - 获取音频时长函数
 * @param {Function} options.wailsSelectAudioFile - Wails文件选择函数
 * @param {Function} options.toastStore - Toast存储
 * @returns {Object} 文件处理对象
 */
export function useFileProcessing({
  selectFile,
  currentFile,
  getAudioDuration,
  wailsSelectAudioFile,
  toastStore
}) {
  // 文件处理状态
  const fileProcessingState = ref({
    isProcessing: false,
    error: null
  })

  /**
   * 设置浏览器级别拖拽支持
   * @returns {Promise<Object>} 拖拽文件数据（如果有）
   */
  const setupBrowserDragDrop = () => {
    console.log('🎯 设置浏览器级别拖拽支持')

    return new Promise((resolve) => {
      let hasResolved = false

      // 添加全局拖拽事件监听器
      document.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('🔄 检测到拖拽悬停事件')
      })

      document.addEventListener('drop', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('🔄 检测到文件拖放事件')

        if (hasResolved) return // 避免重复解析

        const files = e.dataTransfer.files
        if (files.length > 0) {
          const file = files[0]
          console.log('📁 浏览器拖拽文件:', {
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.path || file.webkitRelativePath || file.name,
            hasPath: !!file.path
          })

          // 检查是否为音频文件
          const isAudio = isSupportedAudioFile(file)

          if (isAudio) {
            console.log('✅ 确认为音频文件，开始处理拖拽文件')

            try {
              // 使用 useAudioFile composable 的 selectFile 方法来处理拖拽文件
              await selectFile(file)
              toastStore.showSuccess('文件拖拽成功', `已加载音频文件: ${file.name}`)

              hasResolved = true
              resolve({ success: true, file })
            } catch (error) {
              console.error('❌ 处理拖拽文件时出错:', error)
              toastStore.showError('文件处理失败', `处理文件 ${file.name} 时出错: ${error.message}`)

              hasResolved = true
              resolve({ success: false, error })
            }
          } else {
            console.log('❌ 不是音频文件')
            toastStore.addToast({
              type: 'error',
              title: '文件格式错误',
              message: '请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 格式的音频文件'
            })

            hasResolved = true
            resolve({ success: false, error: '不支持的文件格式' })
          }
        } else {
          console.log('❌ 没有检测到文件')
          hasResolved = true
          resolve({ success: false, error: '没有检测到文件' })
        }
      })

      console.log('✅ 浏览器拖拽事件监听器已设置')
    })
  }

  /**
   * 处理拖拽文件
   * @param {File} file - 拖拽的文件对象
   * @returns {Promise<Object>} 处理结果
   */
  const processDroppedFile = async (file) => {
    console.log('🔄 开始处理拖拽文件:', file.name)

    try {
      fileProcessingState.value.isProcessing = true
      fileProcessingState.value.error = null

      // 创建文件信息对象
      const fileInfo = createFileInfo(file)

      // 尝试获取音频时长
      try {
        const duration = await getBrowserAudioDuration(file)
        fileInfo.duration = duration
        fileInfo.formattedDuration = formatTime(duration)
      } catch (error) {
        console.warn('获取音频时长失败:', error)
        // 使用文件大小估算时长
        const estimatedDuration = estimateDurationFromSize(file.size, file.name)
        fileInfo.duration = estimatedDuration
        fileInfo.formattedDuration = formatTime(estimatedDuration)
      }

      console.log('✅ 拖拽文件处理完成:', fileInfo)

      toastStore.addToast({
        type: 'success',
        title: '文件已加载',
        message: `已加载文件: ${file.name}`
      })

      fileProcessingState.value.isProcessing = false
      return { success: true, fileInfo }

    } catch (error) {
      console.error('❌ 拖拽文件处理失败:', error)
      fileProcessingState.value.isProcessing = false
      fileProcessingState.value.error = error

      toastStore.addToast({
        type: 'error',
        title: '文件处理失败',
        message: error.message
      })

      return { success: false, error }
    }
  }

  /**
   * 处理文件选择（包括拖拽和按钮选择）
   * @param {File} file - 选择的文件对象
   * @param {Object} audioFile - 音频文件对象
   * @param {Function} clearResults - 清空结果函数
   * @returns {Promise<Object>} 处理结果
   */
  const handleFileSelect = async (file, audioFile, clearResults) => {
    console.log('📁 处理选择的文件:', file.name, file instanceof File ? '(文件对象)' : '(Wails文件对象)')
    console.log('📁 文件路径信息:', {
      path: file.path,
      webkitRelativePath: file.webkitRelativePath,
      name: file.name
    })

    try {
      // 清空之前的识别结果和显示状态
      console.log('🧹 清空之前的识别结果')
      if (clearResults) {
        clearResults()
      }

      toastStore.showInfo('处理文件', `正在处理文件 "${file.name}"...`)

      // 创建文件信息对象，标记是否为拖拽文件
      currentFile.value = {
        hasFile: true,
        fileName: file.name,
        file: file,
        duration: null,
        durationFormatted: '计算中...',
        selectedAt: new Date(),
        size: file.size,
        type: file.type,
        isDragged: !file.path && file instanceof File // 如果没有path属性且是File对象，则为拖拽文件
      }

      // 获取文件路径（在Wails中，拖拽文件有file.path属性）
      const filePath = file.path || file.webkitRelativePath || file.name
      console.log('📁 最终使用的文件路径:', filePath)

      // 格式化文件大小
      const sizeFormatted = formatFileSize(file.size)

      // 立即从后端获取准确的音频时长
      try {
        console.log('🎵 开始从后端获取音频文件时长:', filePath)
        const durationResult = await getAudioDuration(filePath)

        if (durationResult && durationResult.success && durationResult.duration > 0) {
          const accurateDuration = durationResult.duration
          console.log('🎵 后端音频时长获取成功:', accurateDuration, '秒')

          currentFile.value.duration = accurateDuration
          currentFile.value.durationFormatted = formatTime(accurateDuration)
          console.log('🎵 文件时长已更新:', currentFile.value.durationFormatted)
        } else {
          console.warn('⚠️ 后端获取时长失败，使用估算:', durationResult?.error)
          // 备选方案：使用估算时长
          const estimatedDuration = estimateDurationFromSize(file.size, file.name)
          currentFile.value.duration = estimatedDuration
          currentFile.value.durationFormatted = formatTime(estimatedDuration)
        }
      } catch (durationError) {
        console.warn('⚠️ 获取音频时长异常，使用估算:', durationError.message)
        // 备选方案：使用估算时长
        const estimatedDuration = estimateDurationFromSize(file.size, file.name)
        currentFile.value.duration = estimatedDuration
        currentFile.value.durationFormatted = formatTime(estimatedDuration)
      }

      // 更新文件信息
      audioFile.fileInfo.value = {
        name: file.name,
        size: file.size,
        sizeFormatted: sizeFormatted,
        extension: file.name.split('.').pop().toUpperCase(),
        type: file.type,
        path: filePath // 添加路径信息
      }

      toastStore.showSuccess('文件选择成功', `"${file.name}" 已准备就绪`)
      return { success: true }

    } catch (error) {
      console.error('❌ 处理文件失败:', error)
      toastStore.showError('文件处理失败', `无法处理文件: ${error.message}`)
      return { success: false, error }
    }
  }

  /**
   * 处理文件选择对话框
   * @param {Object} audioFile - 音频文件对象
   * @param {Function} clearResults - 清空结果函数
   * @returns {Promise<Object>} 处理结果
   */
  const handleOpenFileDialog = async (audioFile, clearResults) => {
    console.log('🗂️ 处理文件选择对话框')

    try {
      const result = await wailsSelectAudioFile()
      console.log('🗂️ 文件选择结果:', result)

      if (result && result.success && result.file) {
        // 清空之前的识别结果和显示状态
        console.log('🧹 清空之前的识别结果')
        if (clearResults) {
          clearResults()
        }

        // 使用Wails选择的文件信息
        currentFile.value = {
          hasFile: true,
          fileName: result.file.name,
          file: result.file,  // 保持完整的文件对象，包含path属性
          duration: null,
          durationFormatted: '计算中...',
          selectedAt: new Date()
        }

        console.log('✅ 文件选择成功:', currentFile.value)
        console.log('📁 Wails文件路径检查:', {
          name: result.file.name,
          path: result.file.path,
          hasPath: !!result.file.path
        })

        // 立即从后端获取准确的音频时长
        try {
          console.log('🎵 开始从后端获取音频文件时长:', result.file.path)
          const durationResult = await getAudioDuration(result.file.path)

          if (durationResult && durationResult.success && durationResult.duration > 0) {
            const accurateDuration = durationResult.duration
            console.log('🎵 后端音频时长获取成功:', accurateDuration, '秒')

            currentFile.value.duration = accurateDuration
            currentFile.value.durationFormatted = formatTime(accurateDuration)
            console.log('🎵 文件时长已更新:', currentFile.value.durationFormatted)
          } else {
            console.warn('⚠️ 后端获取时长失败，使用估算:', durationResult?.error)
            // 备选方案：使用估算时长
            const estimatedDuration = estimateDurationFromSize(result.file.size, result.file.name)
            currentFile.value.duration = estimatedDuration
            currentFile.value.durationFormatted = formatTime(estimatedDuration)
          }
        } catch (durationError) {
          console.warn('⚠️ 获取音频时长异常，使用估算:', durationError.message)
          // 备选方案：使用估算时长
          const estimatedDuration = estimateDurationFromSize(result.file.size, result.file.name)
          currentFile.value.duration = estimatedDuration
          currentFile.value.durationFormatted = formatTime(estimatedDuration)
        }

        toastStore.showSuccess('文件选择成功', `"${result.file.name}" 已准备就绪`)
        return { success: true, file: result.file }
      } else {
        console.log('🚫 用户取消文件选择')
        return { success: false, cancelled: true }
      }
    } catch (error) {
      console.error('❌ 文件选择失败:', error)
      toastStore.showError('文件选择失败', error.message)
      return { success: false, error }
    }
  }

  /**
   * 处理文件错误
   * @param {string} errorMessage - 错误消息
   */
  const handleFileError = (errorMessage) => {
    console.error('❌ 文件错误:', errorMessage)
    toastStore.showError('文件错误', errorMessage)
    fileProcessingState.value.error = new Error(errorMessage)
  }

  /**
   * 清空文件处理状态
   */
  const clearFileProcessingState = () => {
    fileProcessingState.value = {
      isProcessing: false,
      error: null
    }
  }

  return {
    // 状态
    fileProcessingState,

    // 方法
    setupBrowserDragDrop,
    processDroppedFile,
    handleFileSelect,
    handleOpenFileDialog,
    handleFileError,
    clearFileProcessingState
  }
}