import { ref, reactive, computed, watch } from 'vue'
import { useToastStore } from '../stores/toast'

export function useSettings() {
  const toastStore = useToastStore()

  // 默认设置
  const defaultSettings = {
    // 界面设置
    theme: 'auto', // 'light', 'dark', 'auto'
    language: 'zh-CN', // 'zh-CN', 'en-US'

    // 识别设置
    recognitionLanguage: 'zh-CN',
    modelType: 'default',
    enableWordTimestamp: true,
    confidenceThreshold: 0.5,

    // 音频处理
    sampleRate: 16000,
    enableNormalization: true,
    enableNoiseReduction: false,

    // 导出设置
    defaultExportFormat: 'txt', // 'txt', 'srt', 'vtt', 'json'
    autoSaveResults: true,
    exportPath: '',

    // AI优化
    enableAIOptimization: true,
    aiTemplate: 'basic', // 'basic', 'detailed', 'subtitle'

    // 模型设置
    modelPath: './models',
    customModelPath: '',

    // 高级设置
    maxRecordingDuration: 3600, // 秒
    enableRealTimeRecognition: false,
    logLevel: 'info' // 'debug', 'info', 'warning', 'error'
  }

  // 响应式设置状态
  const settings = reactive({ ...defaultSettings })

  // UI状态
  const isLoading = ref(false)
  const showAdvanced = ref(false)
  const isDirty = ref(false)

  // 计算属性
  const isDarkMode = computed(() => {
    if (settings.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return settings.theme === 'dark'
  })

  const availableLanguages = computed(() => [
    { value: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' }
  ])

  const availableModels = computed(() => [
    { value: 'default', label: '默认模型', description: '适用于一般场景' },
    { value: 'small', label: '小型模型', description: '速度快，精度较低' },
    { value: 'medium', label: '中型模型', description: '平衡速度和精度' },
    { value: 'large', label: '大型模型', description: '精度高，速度较慢' }
  ])

  const exportFormats = computed(() => [
    { value: 'txt', label: '纯文本', extension: '.txt' },
    { value: 'srt', label: 'SRT字幕', extension: '.srt' },
    { value: 'vtt', label: 'WebVTT', extension: '.vtt' },
    { value: 'json', label: 'JSON数据', extension: '.json' }
  ])

  const aiTemplates = computed(() => [
    {
      value: 'basic',
      label: '基础优化',
      description: '基本的文本清理和标点修正'
    },
    {
      value: 'detailed',
      label: '详细优化',
      description: '深度文本优化和结构化处理'
    },
    {
      value: 'subtitle',
      label: '字幕优化',
      description: '专门针对字幕格式的优化'
    }
  ])

  // 从localStorage加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('audio-recognizer-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        Object.assign(settings, { ...defaultSettings, ...parsed })
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      toastStore.showWarning('设置加载失败', '使用默认设置')
    }
  }

  // 保存设置到localStorage
  const saveSettings = async () => {
    try {
      isLoading.value = true

      localStorage.setItem('audio-recognizer-settings', JSON.stringify(settings))
      isDirty.value = false

      toastStore.showSuccess('设置已保存', '应用设置已更新')

      return true
    } catch (error) {
      console.error('保存设置失败:', error)
      toastStore.showError('设置保存失败', error.message)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 重置设置为默认值
  const resetSettings = () => {
    Object.assign(settings, { ...defaultSettings })
    isDirty.value = true
    toastStore.showInfo('设置已重置', '已恢复为默认设置')
  }

  // 更新单个设置项
  const updateSetting = (key, value) => {
    if (settings.hasOwnProperty(key)) {
      settings[key] = value
      isDirty.value = true
    }
  }

  // 批量更新设置
  const updateSettings = (newSettings) => {
    Object.keys(newSettings).forEach(key => {
      if (settings.hasOwnProperty(key)) {
        settings[key] = newSettings[key]
      }
    })
    isDirty.value = true
  }

  // 验证设置
  const validateSettings = () => {
    const errors = []

    // 验证置信度阈值
    if (settings.confidenceThreshold < 0 || settings.confidenceThreshold > 1) {
      errors.push('置信度阈值必须在0-1之间')
    }

    // 验证采样率
    const validSampleRates = [16000, 22050, 44100, 48000]
    if (!validSampleRates.includes(settings.sampleRate)) {
      errors.push('采样率必须是支持的值')
    }

    // 验证最大录音时长
    if (settings.maxRecordingDuration <= 0) {
      errors.push('最大录音时长必须大于0')
    }

    return errors
  }

  // 应用主题
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme)

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const applySystemTheme = (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }

      applySystemTheme(mediaQuery)
      mediaQuery.addEventListener('change', applySystemTheme)
    }
  }

  // 监听主题变化
  watch(() => settings.theme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: true })

  // 监听设置变化
  watch(settings, () => {
    isDirty.value = true
  }, { deep: true })

  // 自动保存重要设置
  watch(settings, (newSettings, oldSettings) => {
    // 只在重要设置改变时自动保存
    const importantKeys = ['modelPath', 'recognitionLanguage', 'enableWordTimestamp', 'confidenceThreshold']
    const hasImportantChange = importantKeys.some(key => newSettings[key] !== oldSettings[key])

    if (hasImportantChange) {
      console.log('🔧 重要设置已更改，自动保存')
      // 延迟保存，避免频繁保存
      setTimeout(() => {
        saveSettings()
      }, 500)
    }
  }, { deep: true })

  // 导出设置
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `audio-recognizer-settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()

    URL.revokeObjectURL(url)
    toastStore.showSuccess('设置已导出', '设置文件已下载')
  }

  // 导入设置
  const importSettings = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result)
          updateSettings(importedSettings)
          toastStore.showSuccess('设置已导入', '成功导入设置文件')
          resolve(true)
        } catch (error) {
          toastStore.showError('导入失败', '设置文件格式错误')
          reject(error)
        }
      }

      reader.onerror = () => {
        toastStore.showError('导入失败', '无法读取设置文件')
        reject(new Error('文件读取失败'))
      }

      reader.readAsText(file)
    })
  }

  // 初始化
  const initialize = () => {
    loadSettings()
  }

  return {
    // 状态
    settings,
    isLoading,
    showAdvanced,
    isDirty,
    isDarkMode,

    // 计算属性
    availableLanguages,
    availableModels,
    exportFormats,
    aiTemplates,

    // 方法
    loadSettings,
    saveSettings,
    resetSettings,
    updateSetting,
    updateSettings,
    validateSettings,
    exportSettings,
    importSettings,
    initialize
  }
}