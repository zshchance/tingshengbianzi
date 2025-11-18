import { ref, reactive, computed, watch } from 'vue'
import { useToastStore } from '../stores/toast'
import { UpdateConfig, GetConfig } from '../../wailsjs/go/main/App.js'

// 真正的单例模式 - 全局状态只在模块级别创建一次
let singletonInstance = null

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
  specificModelFile: '', // 具体的模型文件路径

  // 高级设置
  maxRecordingDuration: 3600, // 秒
  enableRealTimeRecognition: false,
  logLevel: 'info' // 'debug', 'info', 'warning', 'error'
}

// 全局响应式设置状态 - 只在模块级别创建一次
const globalSettings = reactive({ ...defaultSettings })

// UI状态 - 也是单例
const isLoading = ref(false)
const showAdvanced = ref(false)
const isDirty = ref(false)

export function useSettings() {
  // 如果已经存在实例，直接返回
  if (singletonInstance) {
    console.log('🔄 返回已存在的settings单例实例')
    console.log('🔍 已存在实例的settings引用地址:', singletonInstance.settings)
    console.log('🔍 已存在实例的modelPath:', singletonInstance.settings.modelPath)
    return singletonInstance
  }

  console.log('🆕 创建新的settings单例实例')
  const toastStore = useToastStore()

  // 计算属性
  const isDarkMode = computed(() => {
    if (globalSettings.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return globalSettings.theme === 'dark'
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

  // 从后端加载设置
  const loadSettingsFromBackend = async () => {
    try {
      console.log('🔄 从后端加载配置...')
      const configJSON = await GetConfig()
      if (configJSON) {
        const backendConfig = JSON.parse(configJSON)
        console.log('✅ 从后端加载配置成功:', backendConfig)

        // 只同步后端相关的设置字段 - 逐个属性更新确保响应性
        const backendUpdates = {
          language: backendConfig.language || 'zh-CN',
          modelPath: backendConfig.modelPath || './models',
          specificModelFile: backendConfig.specificModelFile || '',
          sampleRate: backendConfig.sampleRate || 16000,
          bufferSize: backendConfig.bufferSize || 4000,
          confidenceThreshold: backendConfig.confidenceThreshold || 0.5,
          maxAlternatives: backendConfig.maxAlternatives || 1,
          enableWordTimestamp: backendConfig.enableWordTimestamp !== false,
          enableNormalization: backendConfig.enableNormalization !== false,
          enableNoiseReduction: backendConfig.enableNoiseReduction || false
        }

        // 逐个更新属性以确保响应性
        Object.keys(backendUpdates).forEach(key => {
          globalSettings[key] = backendUpdates[key]
        })

        console.log('✅ 后端配置已同步到前端')
        console.log('🔍 同步后的 globalSettings.modelPath:', globalSettings.modelPath)
      }
    } catch (error) {
      console.error('❌ 从后端加载配置失败:', error)
      toastStore.showWarning('后端配置加载失败', '使用本地设置')
    }
  }

  // 从localStorage加载设置
  const loadSettings = async () => {
    try {
      // 先从后端加载核心配置
      await loadSettingsFromBackend()

      // 然后从localStorage加载UI相关设置
      const savedSettings = localStorage.getItem('audio-recognizer-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        console.log('📦 从localStorage加载设置:', parsed)
        // 只合并UI相关的设置，不要覆盖后端的核心配置
        Object.assign(globalSettings, {
          theme: parsed.theme || globalSettings.theme,
          customModelPath: parsed.customModelPath || globalSettings.customModelPath,
          maxRecordingDuration: parsed.maxRecordingDuration || globalSettings.maxRecordingDuration,
          enableRealTimeRecognition: parsed.enableRealTimeRecognition || globalSettings.enableRealTimeRecognition,
          logLevel: parsed.logLevel || globalSettings.logLevel
        })
        console.log('📦 localStorage合并后的 globalSettings.modelPath:', globalSettings.modelPath)
      } else {
        console.log('📦 localStorage中没有找到设置')
      }

      console.log('✅ 设置加载完成:', globalSettings)

      // 设置加载完成后重置 isDirty 状态
      console.log('🔄 设置加载完成，重置 isDirty 状态')
      isDirty.value = false
    } catch (error) {
      console.error('加载设置失败:', error)
      toastStore.showWarning('设置加载失败', '使用默认设置')
    }
  }

  // 保存设置到localStorage
  const saveSettings = async () => {
    try {
      isLoading.value = true

      localStorage.setItem('audio-recognizer-settings', JSON.stringify(globalSettings))
      console.log('💾 设置已保存，重置 isDirty 状态')
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
    if (globalSettings.hasOwnProperty(key)) {
      globalSettings[key] = value
      isDirty.value = true
    }
  }

  // 批量更新设置
  const updateSettings = (newSettings) => {
    Object.keys(newSettings).forEach(key => {
      if (globalSettings.hasOwnProperty(key)) {
        globalSettings[key] = newSettings[key]
      }
    })
    isDirty.value = true
  }

  // 验证设置
  const validateSettings = () => {
    const errors = []

    // 验证置信度阈值
    if (globalSettings.confidenceThreshold < 0 || globalSettings.confidenceThreshold > 1) {
      errors.push('置信度阈值必须在0-1之间')
    }

    // 验证采样率
    const validSampleRates = [16000, 22050, 44100, 48000]
    if (!validSampleRates.includes(globalSettings.sampleRate)) {
      errors.push('采样率必须是支持的值')
    }

    // 验证最大录音时长
    if (globalSettings.maxRecordingDuration <= 0) {
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
  watch(() => globalSettings.theme, (newTheme) => {
    applyTheme(newTheme)
  }, { immediate: true })

  // 监听设置变化
  watch(globalSettings, () => {
    isDirty.value = true
  }, { deep: true })

  // 自动保存重要设置
  watch(globalSettings, (newSettings, oldSettings) => {
    // 只在重要设置改变时自动保存
    const importantKeys = ['modelPath', 'specificModelFile', 'recognitionLanguage', 'enableWordTimestamp', 'confidenceThreshold', 'customModelPath']

    // 调试：显示所有变化的字段
    const changedKeys = []
    importantKeys.forEach(key => {
      if (newSettings[key] !== oldSettings[key]) {
        changedKeys.push(`${key}: "${oldSettings[key]}" -> "${newSettings[key]}"`)
      }
    })

    if (changedKeys.length > 0) {
      console.log('🔧 检测到重要设置变化:', changedKeys.join(', '))
      console.log('🔧 重要设置已更改，自动保存到后端')
      // 延迟保存，避免频繁保存
      setTimeout(async () => {
        try {
          // 构建后端配置对象
          const backendConfig = {
            language: newSettings.recognitionLanguage || 'zh-CN',
            modelPath: newSettings.modelPath || './models',
            specificModelFile: newSettings.specificModelFile || '',
            sampleRate: newSettings.sampleRate || 16000,
            bufferSize: newSettings.bufferSize || 4000,
            confidenceThreshold: newSettings.confidenceThreshold || 0.5,
            maxAlternatives: newSettings.maxAlternatives || 1,
            enableWordTimestamp: newSettings.enableWordTimestamp !== false,
            enableNormalization: newSettings.enableNormalization !== false,
            enableNoiseReduction: newSettings.enableNoiseReduction || false
          }

          const result = await UpdateConfig(JSON.stringify(backendConfig))
          if (result.success) {
            console.log('✅ 配置已保存到后端')
          } else {
            console.error('❌ 后端配置保存失败:', result.error?.message)
          }
        } catch (error) {
          console.error('❌ 调用后端配置保存失败:', error)
        }

        // 同时保存到localStorage
        await saveSettings()
      }, 500)
    }
  }, { deep: true })

  // 导出设置
  const exportSettings = () => {
    const dataStr = JSON.stringify(globalSettings, null, 2)
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

  // 创建单例实例
  singletonInstance = {
    // 状态 - 使用全局设置实例
    settings: globalSettings,
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

  console.log('✅ Settings单例实例已创建并缓存')
  console.log('🔍 单例实例settings引用地址:', singletonInstance.settings)
  return singletonInstance
}