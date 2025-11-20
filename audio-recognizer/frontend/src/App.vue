<template>
  <div id="app" class="vue-app">
    <!-- Toast容器 -->
    <ToastContainer />

    <!-- 原有的HTML结构，逐步Vue化 -->
    <div class="app-container">
      <!-- 顶部标题栏 -->
      <header class="app-header">
        <div class="header-content">
          <div class="app-title">
            <h1>🎵 听声辨字</h1>
            <p class="subtitle">智能音频识别工具</p>
          </div>
          <div class="header-actions">
            <button @click="showAboutModal = true" class="btn btn-secondary" title="关于">
              ℹ️ 关于
            </button>
            <button @click="showSettings = true" class="btn btn-secondary" title="设置">
              ⚙️ 设置
            </button>
          </div>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="app-main">
        <!-- Vue进度条组件测试 -->
        <ProgressBar
          :visible="progressData.visible"
          :progress="progressData.progress"
          :status="progressData.status"
          :current-time="progressData.currentTime"
          :total-time="progressData.totalTime"
          :show-details="progressData.showDetails"
        />

  
        <!-- Vue文件选择组件 -->
        <FileDropZone
          :has-file="hasFile"
          :is-loading="audioFile.isLoading.value"
          :file-info="audioFile.fileInfo.value"
          :duration="currentFile?.durationFormatted || currentFile?.duration || null"
          @open-file-dialog="handleOpenFileDialog()"
          @clear-file="clearFile()"
          @select-file="handleFileSelect"
          @file-error="handleFileError"
        />

        <!-- 识别控制区域 -->
        <section class="control-section">
          <div class="control-buttons">
            <button
              @click="startRecognition"
              :disabled="!hasFile || isProcessing"
              class="btn btn-primary btn-large"
            >
              🎤 开始识别
            </button>
            <button
              @click="stopRecognition"
              :disabled="!isProcessing"
              class="btn btn-danger btn-large"
            >
              ⏹️ 停止识别
            </button>
            <button @click="resetApplication" class="btn btn-secondary btn-large">
              🔄 重置
            </button>
              </div>
        </section>

        <!-- 识别结果显示 -->
        <ResultDisplay
          v-if="showResults && recognitionResult"
          :recognition-result="recognitionResult"
          :is-loading="isProcessing"
          :loading-text="progressData.status"
          @export="handleExport"
          @optimize="handleAIOptimize"
        />
      </main>

      <!-- 底部状态栏 -->
      <footer class="app-footer">
        <div class="status-left">
          <span id="appStatus">{{ appStatus || '加载中...' }}</span>
        </div>
        <div class="status-right">
          <span id="modelStatus">{{ modelStatusText || '检查中...' }}</span>
          <span id="versionInfo">{{ versionInfo || 'v?.?.?' }}</span>
        </div>
      </footer>
    </div>

    <!-- 设置模态框 -->
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
      @save="handleSettingsSave"
    />

    <!-- 关于模态框 -->
    <AboutModal :visible="showAboutModal" @close="showAboutModal = false" />

    <!-- 模型提醒模态框 -->
    <ModelNotificationModal
      :visible="showModelNotification"
      :model-status="modelStatusData || {}"
      @close="showModelNotification = false"
      @open-settings="handleOpenSettingsFromNotification"
      @show-help="handleShowHelpFromNotification"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useToastStore } from './stores/toast'
import { useAudioFile } from './composables/useAudioFile'
import { useWails } from './composables/useWails'
import { useSettings } from './composables/useSettings'
import { useRecognitionEvents } from './composables/useRecognitionEvents'
import { useFileProcessing } from './composables/useFileProcessing'
import { formatTimestamp } from './utils/timeFormatter'
import {
  fileToBase64
} from './utils/audioFileUtils'
// 日志功能已移除 - 使用浏览器控制台进行调试
import ToastContainer from './components/ToastContainer.vue'
import ProgressBar from './components/ProgressBar.vue'
import FileDropZone from './components/FileDropZone.vue'
import SettingsModal from './components/SettingsModal.vue'
import ResultDisplay from './components/ResultDisplay.vue'
import AboutModal from './components/AboutModal.vue'
import ModelNotificationModal from './components/ModelNotificationModal.vue'

const toastStore = useToastStore()

// 使用composables - 保持响应式引用
const audioFile = useAudioFile()
const { selectFile, clearFile, currentFile, hasFile, fileInfo } = audioFile

// 调试：监听App组件中接收到的hasFile状态
watch(hasFile, (newVal) => {
  console.log('🎯 App组件 hasFile 状态:', {
    value: newVal,
    type: typeof newVal,
    timestamp: new Date().toISOString()
  })
}, { immediate: true })

watch(currentFile, (newVal) => {
  console.log('🎯 App组件 currentFile 状态:', {
    hasFile: !!newVal,
    fileName: newVal?.file?.name,
    timestamp: new Date().toISOString()
  })
}, { immediate: true })

watch(() => audioFile.fileInfo.value, (newVal) => {
  console.log('🎯 App组件 fileInfo 状态:', JSON.stringify({
    fileInfo: newVal,
    timestamp: new Date().toISOString()
  }))
}, { immediate: true })

const {
  startRecognition: wailsStartRecognition,
  stopRecognition: wailsStopRecognition,
  selectAudioFile: wailsSelectAudioFile,
  getRecognitionStatus,
  getApplicationStatus,
  getAudioDuration,
  formatAIText,
  generateAIPrompt,
  initialize: initializeWails,
  isLoading: wailsLoading
} = useWails()
const { settings, initialize: initializeSettings } = useSettings()

// 应用状态
const isProcessing = ref(false)
const showSettings = ref(false)
const showAboutModal = ref(false)
const recognitionResult = ref(null)
const showResults = ref(false)
const showModelNotification = ref(false)
const modelStatusData = ref(null)

// 动态状态信息
const appStatus = ref('加载中...')
const modelStatusText = ref('检查中...')
const versionInfo = ref('v?.?.?')

// 进度条数据
const progressData = reactive({
  visible: false,
  progress: 0,
  status: '准备中...',
  currentTime: 0,
  totalTime: 0,
  showDetails: true
})

// 使用新的业务逻辑模块
const {
  setupGlobalWailsEvents
} = useRecognitionEvents({
  isProcessing,
  progressData,
  recognitionResult,
  showResults,
  settings,
  toastStore
})

// 响应式更新应用状态
watch(isProcessing, (newVal) => {
  console.log('🔄 处理状态变化:', newVal)
  appStatus.value = newVal ? '识别中' : '就绪'
  // 当识别状态改变时，也更新一次应用状态以获取最新的模型状态
  updateApplicationStatus()
})

const {
  setupBrowserDragDrop,
  processFileSelect,
  handleOpenFileDialog: openFileDlg,
  handleFileError
} = useFileProcessing({
  selectFile,
  currentFile,
  getAudioDuration,
  wailsSelectAudioFile,
  toastStore
})

// 桥接函数，用于模板中的事件处理
const handleFileSelect = async (file) => {
  const clearResults = () => {
    showResults.value = false
    recognitionResult.value = null
  }
  return await processFileSelect(file, audioFile, clearResults)
}

const handleOpenFileDialog = async () => {
  const clearResults = () => {
    showResults.value = false
    recognitionResult.value = null
  }
  return await openFileDlg(audioFile, clearResults)
}

// 定时器
let progressTimer = null
let progressStartTime = null

// 更新应用状态信息
const updateApplicationStatus = async (checkModelNotification = false) => {
  try {
    console.log('🔄 更新应用状态信息...')
    const statusResult = await getApplicationStatus()

    if (statusResult && statusResult.success && statusResult.status) {
      const statusData = statusResult.status

      // 更新应用状态
      if (statusData.appStatus) {
        appStatus.value = statusData.appStatus
      }

      // 更新模型状态
      if (statusData.modelStatus && statusData.modelStatus.statusText) {
        // 保存模型状态数据用于通知模态框
        modelStatusData.value = statusData.modelStatus

        let statusText = ""

        // 检查模型状态并生成相应的显示文本
        if (!statusData.modelStatus.isLoaded) {
          // 模型未加载的情况
          if (!statusData.modelStatus.modelPath || statusData.modelStatus.modelPath === '') {
            statusText = "模型: 未配置模型路径"
          } else if (!statusData.modelStatus.availableModels || statusData.modelStatus.availableModels.length === 0) {
            statusText = `模型: 目录为空 (${statusData.modelStatus.modelPath})`
          } else {
            statusText = "模型: 模型加载失败"
          }
        } else if (statusData.modelStatus.isLoaded && statusData.modelStatus.availableModels && statusData.modelStatus.availableModels.length > 0) {
          // 模型已加载的情况
          statusText = "模型: 多语言模型已加载"

          // 添加支持的语言数量信息
          if (statusData.modelStatus.supportedLanguages && statusData.modelStatus.supportedLanguages.length > 0) {
            const supportedCount = statusData.modelStatus.supportedLanguages.length
            statusText += ` (支持 ${supportedCount} 种语言)`
          }

          // 添加可用模型数量信息
          if (statusData.modelStatus.availableModels && statusData.modelStatus.totalAvailable) {
            const availableCount = statusData.modelStatus.totalAvailable
            statusText += ` (${availableCount}个可用模型)`
          }

          // 添加当前模型名称
          let currentModelName = ""

          // 优先使用specificModel字段
          if (statusData.modelStatus.specificModel) {
            // 从路径中提取文件名
            const pathParts = statusData.modelStatus.specificModel.split('/')
            currentModelName = pathParts[pathParts.length - 1]
          }
          // 如果没有specificModel，则使用availableModels的第一个
          else if (statusData.modelStatus.availableModels && statusData.modelStatus.availableModels.length > 0) {
            currentModelName = statusData.modelStatus.availableModels[0].name || statusData.modelStatus.availableModels[0]
          }

          if (currentModelName) {
            statusText += ` (${currentModelName})`
          }
        } else {
          // 默认状态，使用原来的状态文本
          statusText = `模型: ${statusData.modelStatus.statusText}`
        }

        modelStatusText.value = statusText
      }

      // 更新版本信息
      if (statusData.versionInfo && statusData.versionInfo.fullName) {
        versionInfo.value = statusData.versionInfo.fullName
      } else if (statusData.versionInfo && statusData.versionInfo.version) {
        versionInfo.value = `v${statusData.versionInfo.version}`
      }

      // 检查是否需要显示模型提醒（仅当传入checkModelNotification=true时）
      if (checkModelNotification && statusData.modelStatus) {
        console.log('🔍 检查模型状态:', {
          isLoaded: statusData.modelStatus.isLoaded,
          modelPath: statusData.modelStatus.modelPath,
          availableModelsCount: statusData.modelStatus.availableModels?.length || 0,
          status: statusData.modelStatus.status,
          statusText: statusData.modelStatus.statusText
        })

        checkAndShowModelNotification(statusData.modelStatus)
      }

      console.log('✅ 应用状态更新成功:', {
        appStatus: appStatus.value,
        modelStatusText: modelStatusText.value,
        versionInfo: versionInfo.value
      })
    }
  } catch (error) {
    console.error('❌ 更新应用状态失败:', error)
    // 设置默认值
    appStatus.value = '获取失败'
    modelStatusText.value = '模型: 状态未知'
    versionInfo.value = 'v?.?.?'
  }
}

// 检查并显示模型提醒
const checkAndShowModelNotification = (modelStatus) => {
  // 检查模型加载状态
  const isModelNotLoaded = !modelStatus.isLoaded
  const hasNoAvailableModels = !modelStatus.availableModels || modelStatus.availableModels.length === 0
  const hasNoModelPath = !modelStatus.modelPath || modelStatus.modelPath === ''
  const isStatusNotConfigured = modelStatus.status === '未配置' || modelStatus.status === '未初始化'

  const needsNotification = isModelNotLoaded || hasNoAvailableModels || hasNoModelPath || isStatusNotConfigured

  if (needsNotification) {
    console.log('📢 检测到模型问题，显示提醒对话框:', {
      isModelNotLoaded,
      hasNoAvailableModels,
      hasNoModelPath,
      isStatusNotConfigured,
      currentStatus: modelStatus.status
    })

    // 延迟显示提醒，确保界面完全加载后再弹出
    setTimeout(() => {
      showModelNotification.value = true
    }, 500)
  } else {
    console.log('✅ 模型状态正常，已成功加载模型')
  }
}


// 设置保存处理
const handleSettingsSave = async () => {
  toastStore.showSuccess('设置已保存', '应用设置已更新')

  // 设置保存后更新状态并检查模型状态
  await updateApplicationStatus(true) // 传入true来重新检查模型状态

  // 检查设置后的模型状态，如果仍有问题，给出友好提示
  if (modelStatusData.value) {
    const isModelNotLoaded = !modelStatusData.value.isLoaded
    const hasNoAvailableModels = !modelStatusData.value.availableModels || modelStatusData.value.availableModels.length === 0
    const hasNoModelPath = !modelStatusData.value.modelPath || modelStatusData.value.modelPath === ''

    if (isModelNotLoaded || hasNoAvailableModels || hasNoModelPath) {
      setTimeout(() => {
        toastStore.showWarning(
          '模型仍然未就绪',
          '请检查模型路径是否正确，或确认模型文件是否存在于指定目录'
        )
      }, 1000)
    } else {
      setTimeout(() => {
        toastStore.showSuccess('配置成功', '语音识别模型已就绪，可以开始使用')
      }, 1000)
    }
  }
}

// 处理从模型通知模态框打开设置
const handleOpenSettingsFromNotification = () => {
  showSettings.value = true
}

// 处理从模型通知模态框显示帮助
const handleShowHelpFromNotification = () => {
  // 打开Whisper文档链接
  const helpUrl = 'https://github.com/ggerganov/whisper.cpp'
  window.open(helpUrl, '_blank', 'noopener,noreferrer')
}

// 打开网站链接

// 导出处理
const handleExport = ({ format, content, filename }) => {
  try {
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/plain'
    })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.${format}`
    link.click()

    URL.revokeObjectURL(url)
    toastStore.showSuccess('导出成功', `文件已保存为 ${format} 格式`)
  } catch (error) {
    toastStore.showError('导出失败', error.message)
  }
}

// AI优化处理
const handleAIOptimize = async (text) => {
  try {
    // 这里可以集成真实的AI优化API
    const optimizedText = await simulateAIOptimization(text)

    // 更新识别结果
    if (recognitionResult.value) {
      recognitionResult.value.aiOptimizedText = optimizedText
    }

    toastStore.showSuccess('AI优化完成', '文本已通过AI优化')
  } catch (error) {
    toastStore.showError('AI优化失败', error.message)
  }
}

// 模拟AI优化（实际应该调用真实的AI服务）
const simulateAIOptimization = async (text) => {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 简单的文本优化模拟
  return text
    .replace(/\s+/g, ' ') // 合并多余空格
    .replace(/([。！？])\s*/g, '$1\n') // 在句号后换行
    .trim()
}


// 开始语音识别
const startRecognition = async () => {
  console.log('🎤 开始识别按钮被点击')
  console.log('🎤 检查状态:', {
    hasFile: hasFile,
    hasFileType: typeof hasFile,
    currentFile: currentFile.value,
    isProcessing: isProcessing.value
  })

  if (!hasFile || !currentFile.value) {
    console.log('❌ 识别条件不满足: 没有文件')
    toastStore.showError('无法开始识别', '请先选择音频文件')
    return
  }

  // 检查文件路径
  if (!currentFile.value.file) {
    console.log('❌ 没有选择文件')
    toastStore.showError('未选择文件', '请先选择音频文件')
    return
  }

  console.log('🔍 开始处理文件，检查是否为拖拽文件:', {
    file: currentFile.value.file,
    isDragged: currentFile.value.isDragged,
    hasPath: !!currentFile.value.file.path,
    hasName: !!currentFile.value.file.name,
    fileName: currentFile.value.file.name
  })

  let filePath = null
  let fileData = null

  // 检查是否为拖拽文件
  if (currentFile.value.isDragged || (currentFile.value.file && !currentFile.value.file.path && currentFile.value.file.name)) {
    console.log('📁 处理拖拽文件，转换为Base64')

    try {
      // 将拖拽的文件转换为Base64
      fileData = await fileToBase64(currentFile.value.file)
      console.log('✅ 文件已转换为Base64，大小:', fileData.length)
      toastStore.showInfo('处理拖拽文件', `正在处理音频文件: ${currentFile.value.file.name}`)
    } catch (error) {
      console.error('❌ 文件转换失败:', error)
      toastStore.showError('文件处理失败', `无法处理拖拽的文件: ${error.message}`)
      return
    }
  } else {
    // 处理常规选择的文件，尝试获取完整路径
    if (currentFile.value.file.path) {
      filePath = currentFile.value.file.path
      console.log('📁 使用直接文件路径:', filePath)
    } else if (currentFile.value.file.webkitRelativePath) {
      filePath = currentFile.value.file.webkitRelativePath
      console.log('📁 使用相对路径:', filePath)
    }

    // 如果仍然没有路径，使用文件对话框重新选择
    if (!filePath) {
      console.log('⚠️ 文件缺少完整路径，请使用文件对话框重新选择')
      toastStore.showWarning('需要重新选择文件', '文件缺少完整路径，请使用"选择文件"按钮重新选择')
      return
    }
  }

  console.log('✅ 文件处理完成:', {
    filePath: filePath,
    hasFileData: !!fileData,
    fileName: currentFile.value.file.name
  })

  try {
    // 清空之前的识别结果
    console.log('🧹 开始新识别，清空之前的识别结果')
    showResults.value = false
    recognitionResult.value = null

    isProcessing.value = true
    console.log('🎯 设置 isProcessing = true')

    // 显示进度条
    progressData.visible = true
    progressData.progress = 0
    progressData.status = '正在启动识别...'
    progressData.currentTime = 0
    progressData.totalTime = currentFile.value.duration || 0
    console.log('🎯 进度条已显示')

    // 调用Wails API开始识别，使用真实的事件监听
    console.log('🎯 文件路径详情:', {
      file: currentFile.value.file,
      path: filePath,
      name: currentFile.value.file?.name
    })

    const recognitionRequest = {
      filePath: filePath,
      fileData: fileData, // 添加Base64文件数据支持拖拽功能
      language: settings.recognitionLanguage || 'zh-CN', // 从设置中获取，默认中文
      specificModelFile: settings.specificModelFile || '', // 添加用户指定的模型文件
      options: {
        ModelPath: settings.modelPath || './models',
        EnableWordTimestamp: settings.enableWordTimestamp !== false,
        ConfidenceThreshold: settings.confidenceThreshold || 0.5,
        SampleRate: settings.sampleRate || 16000,
        EnableNormalization: settings.enableNormalization !== false,
        EnableNoiseReduction: settings.enableNoiseReduction || false
      }
    }
    console.log('🎯 准备发送识别请求:', recognitionRequest)
    console.log('🔍 当前前端设置:', {
      modelPath: settings.modelPath,
      specificModelFile: settings.specificModelFile,
      recognitionLanguage: settings.recognitionLanguage
    })
    console.log('🔍 请求中的模型路径:', recognitionRequest.options.ModelPath)
    console.log('🔍 请求中的特定模型:', recognitionRequest.specificModelFile)

    // 调用Wails API开始识别（全局事件监听器已设置，会自动处理进度更新）
    console.log('🎯 调用wailsStartRecognition，请求:', recognitionRequest)

    // 记录识别开始日志
    console.log('🎤 开始语音识别:', recognitionRequest)

    console.log('🎯 开始调用Wails API...')
    try {
      const result = await wailsStartRecognition(recognitionRequest)
      console.log('🎯 Wails API调用成功，结果:', result)
    } catch (apiError) {
      console.error('❌ Wails API调用失败:', apiError)
      throw apiError
    }

  } catch (error) {
    console.error('识别失败:', error)
    toastStore.showError('识别失败', error.message)
    isProcessing.value = false
    progressData.visible = false
  } finally {
    // 不在这里清理状态，因为现在是事件驱动的
    // 状态将在 onComplete 或 onError 中处理
  }
}

// 停止语音识别
const stopRecognition = async () => {
  try {
    await wailsStopRecognition()
    isProcessing.value = false

    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }

    progressData.visible = false
    toastStore.showInfo('识别已停止', '语音识别已被用户停止')

  } catch (error) {
    console.error('停止识别失败:', error)
    toastStore.showError('停止失败', error.message)
  }
}

// 重置应用
const resetApplication = () => {
  clearFile()
  isProcessing.value = false
  progressData.visible = false
  showResults.value = false
  recognitionResult.value = null

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }

  toastStore.showInfo('应用已重置', '可以重新开始')
}


// 组件挂载
onMounted(async () => {
  console.log('🚀 Vue应用已挂载')

  try {
    // 初始化设置
    initializeSettings()
    console.log('✅ 设置初始化完成')

    // 在开发环境下暴露调试函数
    if (process.env.NODE_ENV === 'development') {
      window.showModelNotification = () => {
        showModelNotification.value = true
      }
      console.log('🐛 开发环境：暴露模型提醒显示函数 window.showModelNotification()')
    }

    // 初始化Wails连接
    await initializeWails()
    console.log('✅ Wails连接初始化完成')

    // 设置全局事件监听器（重要：在应用启动时就设置）
    setupGlobalWailsEvents()
    console.log('✅ 全局事件监听器设置完成')

    // 设置浏览器拖拽支持
    setupBrowserDragDrop()
    console.log('✅ 浏览器拖拽支持已设置')

    // 获取并应用真实的应用状态，并检查模型提醒
    await updateApplicationStatus(true) // 传入true来检查模型提醒
    console.log('✅ 应用状态更新完成')

    // 设置定时更新状态（每30秒更新一次）
    setInterval(() => updateApplicationStatus(false), 30000) // 定时更新不需要检查模型提醒

    // toastStore.showSuccess('欢迎', 'Vue组件已完整迁移！v2.0.0', {
    //   duration: 2000
    // }) // 禁用启动欢迎提示
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    toastStore.showError('初始化失败', error.message)
  }
})
</script>

<style scoped>
.vue-app {
  min-height: 100vh;
}


/* 继承原有样式 */
:deep(.btn) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

:deep(.btn-primary) {
  background: #3b82f6;
  color: white;
}

:deep(.btn-primary:hover) {
  background: #2563eb;
  transform: translateY(-1px);
}

:deep(.btn-secondary) {
  background: #6b7280;
  color: white;
}

:deep(.btn-secondary:hover) {
  background: #4b5563;
  transform: translateY(-1px);
}

:deep(.btn-danger) {
  background: #ef4444;
  color: white;
}

:deep(.btn-danger:hover) {
  background: #dc2626;
  transform: translateY(-1px);
}

:deep(.btn-info) {
  background: #06b6d4;
  color: white;
}

:deep(.btn-info:hover) {
  background: #0891b2;
  transform: translateY(-1px);
}

:deep(.btn-large) {
  padding: 12px 24px;
  font-size: 16px;
}

:deep(.btn:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

:deep(.btn:disabled:hover) {
  transform: none !important;
}
</style>