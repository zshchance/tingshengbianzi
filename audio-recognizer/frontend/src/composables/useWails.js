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
   * 获取应用状态（包括模型状态和版本信息）
   */
  const getApplicationStatus = async () => {
    try {
      console.log('🔍 获取应用状态...')
      const status = await App.GetApplicationStatus()
      console.log('✅ 应用状态获取成功:', status)
      return status
    } catch (error) {
      console.error('❌ 获取应用状态失败:', error)
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
   * 选择模型文件
   */
  const selectModelFile = async () => {
    try {
      isLoading.value = true
      toastStore.showInfo('选择模型文件', '正在打开文件选择对话框...')

      const result = await App.SelectModelFile()
      console.log('📁 Wails模型文件选择结果:', result)

      if (result && result.success) {
        toastStore.showSuccess('文件选择成功', `已选择模型文件: ${result.fileName}`)
        return result
      } else {
        console.error('📁 模型文件选择返回值异常:', result)
        const errorMsg = result?.error || '模型文件选择失败'
        throw new Error(errorMsg)
      }

    } catch (error) {
      console.error('模型文件选择失败:', error)
      toastStore.showError('文件选择失败', error.message)
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
   * 获取音频文件的真实时长
   */
  const getAudioDuration = async (filePath) => {
    try {
      console.log('🎵 开始获取音频文件真实时长:', filePath)
      const result = await App.GetAudioDuration(filePath)

      if (result && result.success) {
        console.log('✅ 获取音频时长成功:', {
          duration: result.duration,
          filePath: result.filePath
        })
        return result
      } else {
        console.error('❌ 获取音频时长失败:', result?.error)
        throw new Error(result?.error || '获取音频时长失败')
      }

    } catch (error) {
      console.error('获取音频时长失败:', error)
      throw error
    }
  }

  /**
   * 获取所有AI提示词模板
   */
  const getAITemplates = async () => {
    try {
      const result = await App.GetAITemplates()
      console.log('🔧 获取AI模板列表:', result.success ? Object.keys(result.templates) : '失败')
      return result
    } catch (error) {
      console.error('获取AI模板列表失败:', error)
      toastStore.showError('获取模板失败', error.message)
      throw error
    }
  }

  /**
   * 前端填充模板生成AI优化提示词
   */
  const generateAIPrompt = async (templateKey, textData) => {
    try {
      // 获取所有模板
      const templatesResult = await getAITemplates()

      if (!templatesResult.success || !templatesResult.templates[templateKey]) {
        throw new Error(`模板不存在: ${templateKey}`)
      }

      const template = templatesResult.templates[templateKey].template
      console.log('📝 使用模板:', templateKey, '模板内容长度:', template.length)

      // 预处理文本数据
      const preprocessedText = preprocessText(textData.text || '')

      // 对于细颗粒度时间戳文本，使用保持换行结构的处理方式
      const fineGrainedText = processFineGrainedText(textData.timestampedText || textData.text || '')

      // 填充模板变量
      const filledPrompt = fillTemplate(template, {
        text: preprocessedText,
        originalText: textData.text || '',
        timestampedText: fineGrainedText,
        language: textData.language || 'zh-CN',
        segmentCount: (textData.segments || []).length,
        wordCount: (textData.words || []).length,
        duration: textData.duration || 0,
        // 可以根据需要添加更多变量
        timestamp: new Date().toISOString(),
        model: 'whisper',
        confidence: textData.confidence || 0.8
      })

      console.log('✅ 模板填充完成，提示词长度:', filledPrompt.length)

      return {
        success: true,
        prompt: filledPrompt,
        templateKey: templateKey
      }

    } catch (error) {
      console.error('生成AI提示词失败:', error)
      throw error
    }
  }

  /**
   * 文本预处理函数
   */
  const preprocessText = (text) => {
    if (!text) return ''

    let processed = text

    // 移除SRT/VTT时间戳格式 (保留中文时间戳)
    processed = processed.replace(/\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{3}/g, '')

    // 移除序号行（包括后面的换行符）
    processed = processed.replace(/^\d+\s*\n?/gm, '')

    // 移除VTT标记行（包括后面的换行符）
    processed = processed.replace(/^NOTE.*\n?/gm, '')
    processed = processed.replace(/^WEBVTT.*\n?/gm, '')

    // 移除多余的空行，但保留正常的段落分隔
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n')

    // 修索单行末尾的空白字符
    processed = processed.replace(/[ \t]+$/gm, '')

    return processed.trim()
  }

  /**
   * 细颗粒度文本处理函数 - 完全保持原始换行结构和格式
   */
  const processFineGrainedText = (text) => {
    if (!text) return ''

    // 对于细颗粒度文本，完全保持原始格式，不做任何处理
    // 细颗粒度文本已经是 [HH:MM:SS.mmm] 文本 的格式，不需要清理

    console.log('🔍 processFineGrainedText 输入文本（前200字符）:', text.substring(0, 200))
    console.log('🔍 文本长度:', text.length)
    console.log('🔍 包含换行符数量:', (text.match(/\n/g) || []).length)
    console.log('🔍 包含时间戳格式数量:', (text.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g) || []).length)

    // 直接返回原始文本，确保换行结构完全保持
    const result = text

    console.log('🔍 processFineGrainedText 输出文本长度:', result.length)
    console.log('🔍 输出包含换行符数量:', (result.match(/\n/g) || []).length)
    console.log('🔍 输出包含时间戳格式数量:', (result.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g) || []).length)

    return result
  }

  /**
   * 模板填充函数
   */
  const fillTemplate = (template, variables) => {
    let result = template

    // 支持 {{variable}} 格式的变量
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value)
    })

    // 支持 ${variable} 格式的变量
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      result = result.replace(regex, value)
    })

    // 支持 【VARIABLE】 格式的变量（中文方括号）
    Object.entries(variables).forEach(([key, value]) => {
      // 创建特殊的变量映射
      const specialMappings = {
        'text': 'ORIGINAL_TEXT',           // 原始纯文本
        'timestampedText': 'RECOGNITION_TEXT',  // 细颗粒度时间戳文本（优先级高）
        'originalText': 'ORIGINAL_TEXT',
        'language': 'LANGUAGE',
        'duration': 'DURATION',
        'segmentCount': 'SEGMENT_COUNT',
        'wordCount': 'WORD_COUNT'
      }

      const upperKey = specialMappings[key] || key.toUpperCase()
      const regex = new RegExp(`【${upperKey}】`, 'g')

      if (upperKey === 'RECOGNITION_TEXT') {
        console.log('🔧 AI模板填充 【RECOGNITION_TEXT】:')
        console.log('   - key:', key)
        console.log('   - value长度:', value.length)
        console.log('   - 包含换行符数量:', (value.match(/\n/g) || []).length)
        console.log('   - 包含时间戳数量:', (value.match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g) || []).length)
        console.log('   - 内容预览（前200字符）:', value.substring(0, 200))
      }

      result = result.replace(regex, value)
    })

    return result
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
      // toastStore.showSuccess('连接成功', 'Wails后端连接已建立') // 禁用启动提示

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
    selectModelFile,
    getModelInfo,
    startRecognition,
    stopRecognition,
    loadModel,
    getRecognitionStatus,
    getApplicationStatus,
    getConfig,
    updateConfig,
    exportResult,
    getAudioDuration,
    getAITemplates,
    generateAIPrompt,
    initialize,
    isWailsAvailable,
    cleanupEventListeners
  }
}