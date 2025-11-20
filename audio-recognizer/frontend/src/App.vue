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
          <span id="appStatus">{{ isProcessing ? '识别中' : '就绪' }}</span>
        </div>
        <div class="status-right">
          <span id="modelStatus">模型: 已加载</span>
          <span id="versionInfo">v2.0.0</span>
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
    <div v-if="showAboutModal" class="modal-overlay" @click.self="showAboutModal = false">
      <div class="modal-content about-modal">
        <div class="modal-header">
          <h3>🎵 关于听声辨字</h3>
          <button @click="showAboutModal = false" class="close-btn" title="关闭">
            ✕
          </button>
        </div>
        <div class="modal-body">
          <div class="about-content">
            <div class="app-icon">🎵</div>
            <h4>听声辨字</h4>
            <p class="version">版本 {{ APP_INFO.VERSION }}</p>
            <p class="description">
              {{ APP_INFO.DESCRIPTION }}
            </p>

            <div class="contact-info">
              <h5>联系方式</h5>
              <div class="contact-item">
                <span class="icon">🌐</span>
                <span>网站：<a href="#" @click="openWebsite(APP_INFO.WEBSITE)">{{ APP_INFO.WEBSITE }}</a></span>
              </div>
              <div class="contact-item">
                <span class="icon">📧</span>
                <span>邮箱：<a :href="`mailto:${APP_INFO.EMAIL}`">{{ APP_INFO.EMAIL }}</a></span>
              </div>
              <div class="contact-item">
                <span class="icon">👤</span>
                <span>开发者：{{ APP_INFO.AUTHOR }}</span>
              </div>
            </div>

            <div class="legal-notice">
              <h5>免费声明</h5>
              <p class="notice-text">
                <strong>本软件完全免费使用，严禁任何商家或个人进行贩卖获利！</strong><br>
                本软件使用 Whisper 开源引擎进行语音识别，遵循开源协议。
                用户可以免费使用、修改和分发，但不得用于商业目的。
              </p>
            </div>

            <div class="tech-stack">
              <h5>技术栈</h5>
              <ul>
                <li v-for="tech in TECH_STACK" :key="tech.name">
                  {{ tech.icon }} {{ tech.name }}：{{ tech.tech }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAboutModal = false" class="btn btn-primary">
            确定
          </button>
        </div>
      </div>
    </div>
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
import {
  APP_INFO,
  TECH_STACK
} from './constants/recognitionConstants'
// 日志功能已移除 - 使用浏览器控制台进行调试
import ToastContainer from './components/ToastContainer.vue'
import ProgressBar from './components/ProgressBar.vue'
import FileDropZone from './components/FileDropZone.vue'
import SettingsModal from './components/SettingsModal.vue'
import ResultDisplay from './components/ResultDisplay.vue'

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


// 设置保存处理
const handleSettingsSave = () => {
  toastStore.showSuccess('设置已保存', '应用设置已更新')
}

// 打开网站链接
const openWebsite = (url) => {
  window.open(`https://${url}`, '_blank')
}

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

    // 初始化Wails连接
    await initializeWails()
    console.log('✅ Wails连接初始化完成')

    // 设置全局事件监听器（重要：在应用启动时就设置）
    setupGlobalWailsEvents()
    console.log('✅ 全局事件监听器设置完成')

    // 设置浏览器拖拽支持
    setupBrowserDragDrop()
    console.log('✅ 浏览器拖拽支持已设置')

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

/* 关于模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color, #e5e7eb);
}

.about-modal {
  max-width: 600px;
  width: 90%;
}

.about-content {
  text-align: center;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary, #1f2937);
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary, #6b7280);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
  display: flex;
  justify-content: flex-end;
}

.app-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.about-content h4 {
  color: var(--text-primary, #1f2937);
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.version {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.description {
  color: var(--text-primary, #1f2937);
  line-height: 1.6;
  margin: 0 0 24px 0;
  text-align: left;
}

.contact-info {
  margin: 24px 0;
  text-align: left;
}

.contact-info h5 {
  color: var(--text-primary, #1f2937);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  padding-bottom: 6px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
}

.contact-item .icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.contact-item a {
  color: var(--primary-color, #3b82f6);
  text-decoration: none;
  transition: color 0.2s ease;
}

.contact-item a:hover {
  color: var(--primary-hover, #2563eb);
  text-decoration: underline;
}

.legal-notice {
  margin: 24px 0;
  padding: 16px;
  background: var(--warning-bg, #fef3c7);
  border: 1px solid var(--warning-border, #f59e0b);
  border-radius: 8px;
  text-align: left;
}

.legal-notice h5 {
  color: var(--warning-text, #92400e);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.notice-text {
  color: var(--warning-text, #92400e);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}

.notice-text strong {
  color: var(--danger-color, #dc2626);
  font-weight: 700;
}

.tech-stack {
  margin: 24px 0;
  text-align: left;
}

.tech-stack h5 {
  color: var(--text-primary, #1f2937);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  padding-bottom: 6px;
}

.tech-stack ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tech-stack li {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .modal-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .modal-content {
    background: var(--card-bg-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .about-modal {
    background: var(--card-bg-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .modal-header {
    background: var(--bg-secondary-dark, #374151);
    border-color: var(--border-color-dark, #374151);
  }

  .modal-header h3 {
    color: var(--text-primary-dark, #f9fafb);
  }

  .close-btn {
    color: var(--text-muted-dark, #9ca3af);
  }

  .close-btn:hover {
    background: var(--bg-hover-dark, #4b5563);
    color: var(--text-primary-dark, #f9fafb);
  }

  .modal-footer {
    background: var(--bg-secondary-dark, #374151);
    border-color: var(--border-color-dark, #374151);
  }

  .about-content h4 {
    color: var(--text-primary-dark, #f9fafb);
  }

  .description {
    color: var(--text-secondary-dark, #d1d5db);
  }

  .contact-info h5,
  .tech-stack h5 {
    color: var(--text-primary-dark, #f9fafb);
    border-color: var(--border-color-dark, #374151);
  }

  .contact-item {
    color: var(--text-muted-dark, #9ca3af);
  }

  .contact-item a {
    color: var(--primary-color, #3b82f6);
  }

  .legal-notice {
    background: var(--warning-bg-dark, #451a03);
    border-color: var(--warning-border-dark, #f59e0b);
  }

  .legal-notice h5 {
    color: var(--warning-text-dark, #fbbf24);
  }

  .notice-text {
    color: var(--warning-text-dark, #fbbf24);
  }

  .tech-stack li {
    color: var(--text-muted-dark, #9ca3af);
  }
}
</style>