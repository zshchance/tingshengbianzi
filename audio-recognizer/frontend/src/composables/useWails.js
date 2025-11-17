import { ref, onUnmounted } from 'vue'
import { useToastStore } from '../stores/toast'

// 导入Wails生成的API
import * as App from '../../wailsjs/go/main/App'

// 导入Wails运行时事件
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'

export function useWails() {
  const toastStore = useToastStore()

  // 响应式状态
  const isLoading = ref(false)
  const recognitionStatus = ref('未初始化')
  const config = ref(null)

  // 事件监听器清理函数
  const cleanupFunctions = []

  /**
   * 选择音频文件（使用系统文件对话框）
   */
  const selectAudioFile = async () => {
    try {
      isLoading.value = true
      toastStore.showInfo('选择文件', '正在打开文件选择对话框...')

      const result = await App.SelectAudioFile()
      console.log('🗂️ Wails文件选择结果:', result)

      if (result && result.success && result.file) {
        toastStore.showSuccess('文件选择成功', result.file.path)
        return result
      } else if (result && result.path) {
        // 处理可能的直接路径格式
        toastStore.showSuccess('文件选择成功', result.path)
        return {
          success: true,
          file: {
            name: result.file?.name || result.path.split('/').pop(),
            path: result.path
          }
        }
      } else {
        console.error('🗂️ 文件选择返回值异常:', result)
        throw new Error('未选择文件')
      }

    } catch (error) {
      console.error('文件选择失败:', error)
      toastStore.showError('文件选择失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 开始语音识别
   */
  const startRecognition = async (recognitionRequest) => {
    console.log('🚀 Wails startRecognition 被调用')
    console.log('🚀 识别请求:', recognitionRequest)

    try {
      isLoading.value = true
      console.log('🚀 设置 isLoading = true')
      toastStore.showInfo('开始识别', '正在启动语音识别...')

      console.log('🚀 调用 App.StartRecognition')
      const result = await App.StartRecognition(recognitionRequest)
      console.log('🚀 App.StartRecognition 返回结果:', result)

      toastStore.showSuccess('识别已启动', '语音识别正在进行中')
      return result

    } catch (error) {
      console.error('❌ 识别启动失败:', error)
      toastStore.showError('识别失败', error.message)
      throw error
    } finally {
      isLoading.value = false
      console.log('🚀 设置 isLoading = false')
    }
  }

  /**
   * 设置识别事件监听器
   */
  const setupRecognitionEventListeners = (options) => {
    // 监听识别进度事件
    if (options.onProgress) {
      EventsOn('recognition_progress', (progress) => {
        console.log('🎯 识别进度:', progress)
        options.onProgress(progress)
      })
      cleanupFunctions.push('recognition_progress')
    }

    // 监听识别结果事件
    if (options.onResult) {
      EventsOn('recognition_result', (result) => {
        console.log('🎯 识别结果:', result)
        options.onResult(result)
      })
      cleanupFunctions.push('recognition_result')
    }

    // 监听识别完成事件
    if (options.onComplete) {
      EventsOn('recognition_complete', (response) => {
        console.log('🎯 识别完成:', response)
        options.onComplete(response)
        // 识别完成后清理事件监听器
        cleanupEventListeners()
      })
      cleanupFunctions.push('recognition_complete')
    }

    // 监听识别错误事件
    if (options.onError) {
      EventsOn('recognition_error', (error) => {
        console.log('🎯 识别错误:', error)
        options.onError(error)
        cleanupEventListeners()
      })
      cleanupFunctions.push('recognition_error')
    }

    // 监听识别停止事件
    EventsOn('stopped', () => {
      console.log('🎯 识别已停止')
      if (options.onStop) {
        options.onStop()
      }
      cleanupEventListeners()
    })
    cleanupFunctions.push('stopped')
  }

  /**
   * 清理事件监听器
   */
  const cleanupEventListeners = () => {
    if (cleanupFunctions.length > 0) {
      console.log('🧹 清理事件监听器:', cleanupFunctions)
      // 使用 EventsOffAll 清理所有事件监听器
      try {
        EventsOffAll()
        console.log('✅ 所有事件监听器已清理')
      } catch (error) {
        console.warn('清理事件监听器失败:', error)
      }
      cleanupFunctions.length = 0
    }
  }

  /**
   * 停止语音识别
   */
  const stopRecognition = async () => {
    try {
      isLoading.value = true
      toastStore.showInfo('停止识别', '正在停止语音识别...')

      const result = await App.StopRecognition()

      toastStore.showSuccess('识别已停止', '语音识别已停止')
      return result

    } catch (error) {
      console.error('停止识别失败:', error)
      toastStore.showError('停止失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 加载语音识别模型
   */
  const loadModel = async (language, modelPath) => {
    try {
      isLoading.value = true
      toastStore.showInfo('加载模型', `正在加载 ${language} 语音模型...`)

      const result = await App.LoadModel(language, modelPath)

      toastStore.showSuccess('模型加载成功', `${language} 语音模型已就绪`)
      return result

    } catch (error) {
      console.error('模型加载失败:', error)
      toastStore.showError('模型加载失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取识别状态
   */
  const getRecognitionStatus = async () => {
    try {
      const status = await App.GetRecognitionStatus()
      recognitionStatus.value = status
      return status
    } catch (error) {
      console.error('获取状态失败:', error)
      recognitionStatus.value = '获取失败'
      throw error
    }
  }

  /**
   * 获取应用配置
   */
  const getConfig = async () => {
    try {
      const appConfig = await App.GetConfig()
      config.value = appConfig
      return appConfig
    } catch (error) {
      console.error('获取配置失败:', error)
      toastStore.showError('配置获取失败', error.message)
      throw error
    }
  }

  /**
   * 更新应用配置
   */
  const updateConfig = async (newConfig) => {
    try {
      isLoading.value = true
      const result = await App.UpdateConfig(newConfig)

      config.value = newConfig
      toastStore.showSuccess('配置已更新', '应用配置已成功保存')

      return result
    } catch (error) {
      console.error('配置更新失败:', error)
      toastStore.showError('配置更新失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 选择模型文件夹
   */
  const selectModelDirectory = async () => {
    try {
      isLoading.value = true
      toastStore.showInfo('选择模型文件夹', '正在打开文件夹选择对话框...')

      const result = await App.SelectModelDirectory()
      console.log('📁 Wails模型文件夹选择结果:', result)

      if (result && result.success) {
        toastStore.showSuccess('文件夹选择成功', result.path)
        return result
      } else {
        console.error('📁 模型文件夹选择返回值异常:', result)
        const errorMsg = result?.error || '文件夹选择失败'
        throw new Error(errorMsg)
      }

    } catch (error) {
      console.error('模型文件夹选择失败:', error)
      toastStore.showError('文件夹选择失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取模型信息
   */
  const getModelInfo = async (directory) => {
    try {
      isLoading.value = true
      console.log('🔍 获取模型信息:', directory)

      const result = await App.GetModelInfo(directory)
      console.log('📊 模型信息结果:', result)

      if (result && result.success) {
        return result
      } else {
        console.error('📊 获取模型信息失败:', result)
        const errorMsg = result?.error || '获取模型信息失败'
        throw new Error(errorMsg)
      }

    } catch (error) {
      console.error('获取模型信息失败:', error)
      toastStore.showError('获取模型信息失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 导出识别结果
   */
  const exportResult = async (result, format, outputPath) => {
    try {
      isLoading.value = true
      toastStore.showInfo('导出结果', `正在导出为 ${format} 格式...`)

      const exportResult = await App.ExportResult(result, format, outputPath)

      toastStore.showSuccess('导出成功', `结果已保存到 ${outputPath}`)
      return exportResult

    } catch (error) {
      console.error('导出失败:', error)
      toastStore.showError('导出失败', error.message)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 初始化Wails连接
   */
  const initialize = async () => {
    try {
      console.log('正在初始化Wails连接...')

      // 获取初始配置和状态
      await Promise.all([
        getConfig(),
        getRecognitionStatus()
      ])

      console.log('Wails连接初始化成功')
      toastStore.showSuccess('连接成功', 'Wails后端连接已建立')

    } catch (error) {
      console.error('Wails初始化失败:', error)
      toastStore.showError('连接失败', '无法连接到Wails后端')
      throw error
    }
  }

  // 在组件卸载时清理事件监听器
  onUnmounted(() => {
    cleanupEventListeners()
  })

  // 检查Wails运行时是否可用
  const isWailsAvailable = () => {
    return window.go && window.go.main && window.go.main.App
  }

  return {
    // 状态
    isLoading,
    recognitionStatus,
    config,

    // 方法
    selectAudioFile,
    selectModelDirectory,
    getModelInfo,
    startRecognition,
    stopRecognition,
    loadModel,
    getRecognitionStatus,
    getConfig,
    updateConfig,
    exportResult,
    initialize,
    isWailsAvailable,
    cleanupEventListeners
  }
}