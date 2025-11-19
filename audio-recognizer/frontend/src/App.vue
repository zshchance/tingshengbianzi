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
            <p class="version">版本 1.0.0</p>
            <p class="description">
              一款基于 Whisper 引擎的智能音频识别工具，支持多种音频格式的语音转文字功能，
              并提供精确的时间戳和AI优化选项。
            </p>

            <div class="contact-info">
              <h5>联系方式</h5>
              <div class="contact-item">
                <span class="icon">🌐</span>
                <span>网站：<a href="#" @click="openWebsite('administrator.wiki')">administrator.wiki</a></span>
              </div>
              <div class="contact-item">
                <span class="icon">📧</span>
                <span>邮箱：<a href="mailto:zshchance@qq.com">zshchance@qq.com</a></span>
              </div>
              <div class="contact-item">
                <span class="icon">👤</span>
                <span>开发者：这家伙很懒</span>
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
                <li>🔧 后端：Go + Wails v2</li>
                <li>🎨 前端：Vue.js 3 + Vite</li>
                <li>🤖 识别引擎：Whisper.cpp</li>
                <li>🎵 音频处理：FFmpeg</li>
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
import { generateFineGrainedTimestampedText, formatTimestamp } from './utils/timeFormatter'
import { generateFineGrainedTimestampedText as generateEnhancedTimestamps, optimizeSpeedAnalysis, intelligentDeduplication } from './utils/fineGrainedTimestamps'
import { generateAIOptimizationPrompt, preprocessText, generateTextQualityReport } from './utils/aiOptimizer'
// 日志功能已移除 - 使用浏览器控制台进行调试
import { EventsOn } from '../wailsjs/runtime/runtime.js'
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


// 浏览器级别拖拽支持 - 作为备用方案
const setupBrowserDragDrop = () => {
  console.log('🎯 设置浏览器级别拖拽支持')

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
      const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/m4a']
      const fileName = file.name.toLowerCase()
      const isAudio = audioTypes.some(type => file.type.includes(type.split('/')[1])) ||
                    fileName.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)

      if (isAudio) {
        console.log('✅ 确认为音频文件，开始处理拖拽文件')

        // 创建一个模拟的文件对象来处理拖拽的文件
        const dragFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          // 对于拖拽文件，我们将使用文件内容而不是路径
          isDragged: true,
          file: file // 保存原始File对象
        }

        try {
          // 处理拖拽的文件（不依赖于文件路径）
          console.log('📁 处理拖拽的音频文件:', dragFile.name)

          // 使用 useAudioFile composable 的 selectFile 方法来处理拖拽文件
          await selectFile(file)

          toastStore.showSuccess('文件拖拽成功', `已加载音频文件: ${dragFile.name}`)

        } catch (error) {
          console.error('❌ 处理拖拽文件时出错:', error)
          toastStore.showError('文件处理失败', `处理文件 ${dragFile.name} 时出错: ${error.message}`)
        }
      } else {
        console.log('❌ 不是音频文件')
        toastStore.addToast({
          type: 'error',
          title: '文件格式错误',
          message: '请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 格式的音频文件'
        })
      }
    } else {
      console.log('❌ 没有检测到文件')
    }
  })

  console.log('✅ 浏览器拖拽事件监听器已设置')
}

// 处理拖拽文件（基于老版本EventHandler.js的processAudioFile）
const processDroppedFile = async (file) => {
  console.log('🔄 开始处理拖拽文件:', file.name)

  try {
    // 创建文件信息对象（参考老版本的AudioFileProcessor.processAudioFile）
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      path: file.path || file.webkitRelativePath || file.name, // 关键：使用完整路径
      lastModified: file.lastModified,
      duration: 0,
      hasPath: !!file.path
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    fileInfo.formattedSize = formatFileSize(file.size)

    // 获取文件类型描述
    const extension = file.name.split('.').pop()?.toLowerCase()
    const typeMap = {
      'mp3': 'MP3音频',
      'wav': 'WAV音频',
      'm4a': 'M4A音频',
      'aac': 'AAC音频',
      'ogg': 'OGG音频',
      'flac': 'FLAC音频'
    }
    fileInfo.formattedType = typeMap[extension] || '音频文件'

    // 尝试获取音频时长
    try {
      const duration = await getAudioDuration(file)
      fileInfo.duration = duration
      fileInfo.formattedDuration = formatDuration(duration)
    } catch (error) {
      console.warn('获取音频时长失败:', error)
      // 使用文件大小估算时长（参考老版本的逻辑）
      const estimatedDuration = estimateDurationFromSize(file.size, file.name)
      fileInfo.duration = estimatedDuration
      fileInfo.formattedDuration = formatDuration(estimatedDuration)
    }

    console.log('✅ 拖拽文件处理完成:', fileInfo)

    // 更新应用状态
    audioFile.file = fileInfo
    audioFile.fileName = fileInfo.name
    audioFile.filePath = fileInfo.path
    audioFile.fileType = fileInfo.type
    audioFile.fileSize = fileInfo.size
    audioFile.duration = fileInfo.duration
    audioFile.fileSizeFormatted = fileInfo.formattedSize

    console.log('🎯 音频文件状态已更新:', {
      fileName: audioFile.fileName,
      filePath: audioFile.filePath,
      duration: audioFile.duration,
      hasPath: fileInfo.hasPath
    })

    toastStore.addToast({
      type: 'success',
      title: '文件已加载',
      message: `已加载文件: ${file.name}`
    })

  } catch (error) {
    console.error('❌ 拖拽文件处理失败:', error)
    toastStore.addToast({
      type: 'error',
      title: '文件处理失败',
      message: error.message
    })
  }
}

// 获取音频时长（参考老版本AudioFileProcessor的实现）
const getAudioDuration = (file) => {
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


// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 处理文件选择（包括拖拽和按钮选择）
const handleFileSelect = async (file) => {
  console.log('📁 处理选择的文件:', file.name, file instanceof File ? '(文件对象)' : '(Wails文件对象)')
  console.log('📁 文件路径信息:', {
    path: file.path,
    webkitRelativePath: file.webkitRelativePath,
    name: file.name
  })

  try {
    // 清空之前的识别结果和显示状态
    console.log('🧹 清空之前的识别结果')
    showResults.value = false
    recognitionResult.value = null

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

    // 尝试获取音频时长
    try {
      console.log('🎵 开始获取音频时长...')
      const duration = await getAudioDuration(file)
      console.log('🎵 音频时长获取成功:', duration, '秒')

      if (duration && duration > 0) {
        currentFile.value.duration = duration
        currentFile.value.durationFormatted = formatTime(duration)
        console.log('🎵 时长格式化完成:', currentFile.value.durationFormatted)
      } else {
        throw new Error('获取到的时长为0或无效')
      }
    } catch (durationError) {
      console.warn('⚠️ 前端获取音频时长失败:', durationError.message)

      // 如果前端获取失败，尝试从文件大小估算
      const estimatedDuration = estimateDurationFromSize(file.size, file.name)
      console.log('📊 使用估算时长:', estimatedDuration, '秒')

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

  } catch (error) {
    console.error('❌ 处理文件失败:', error)
    toastStore.showError('文件处理失败', `无法处理文件: ${error.message}`)
  }
}

// 处理文件错误
const handleFileError = (errorMessage) => {
  console.error('❌ 文件错误:', errorMessage)
  toastStore.showError('文件错误', errorMessage)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 将文件转换为Base64编码
const fileToBase64 = (file) => {
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


// 格式化时间
const formatTime = (seconds) => {
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

// 从文件大小估算音频时长
const estimateDurationFromSize = (fileSize, fileName) => {
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

// 处理文件选择对话框
const handleOpenFileDialog = async () => {
  console.log('🗂️ 处理文件选择对话框')
  try {
    const result = await wailsSelectAudioFile()
    console.log('🗂️ 文件选择结果:', result)

    if (result && result.success && result.file) {
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

      // 尝试获取音频时长
      if (result.file.size && result.file.name) {
        try {
          console.log('🎵 开始获取Wails选择文件的音频时长...')

          // 对于Wails文件，先尝试通过后端获取
          // 如果失败，使用前端估算
          const fileSize = result.file.size
          const fileName = result.file.name
          const estimatedDuration = estimateDurationFromSize(fileSize, fileName)

          currentFile.value.duration = estimatedDuration
          currentFile.value.durationFormatted = formatTime(estimatedDuration)

          console.log('🎵 Wails文件时长处理完成:', currentFile.value.durationFormatted)
        } catch (durationError) {
          console.warn('⚠️ 处理Wails文件时长失败:', durationError.message)
          currentFile.value.duration = 0
          currentFile.value.durationFormatted = '未知'
        }
      } else {
        // 如果没有文件大小信息，设为默认值
        currentFile.value.duration = 0
        currentFile.value.durationFormatted = '未知'
      }

      toastStore.showSuccess('文件选择成功', `"${result.file.name}" 已准备就绪`)
    } else {
      console.log('🚫 用户取消文件选择')
    }
  } catch (error) {
    console.error('❌ 文件选择失败:', error)
    toastStore.showError('文件选择失败', error.message)
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

// 设置全局Wails事件监听器（参照原始EventHandler.js）
const setupGlobalWailsEvents = () => {
  console.log('🎯 设置全局Wails事件监听器')

  // 识别进度事件
  EventsOn('recognition_progress', (progress) => {
    console.log('🎯 全局进度事件:', progress)
    if (isProcessing.value) {
      progressData.progress = progress.percentage || 0
      progressData.status = progress.status || '正在处理中...'
      if (progress.currentTime) {
        progressData.currentTime = progress.currentTime
      }
    }
  })

  // 识别结果事件
  EventsOn('recognition_result', (result) => {
    console.log('🎯 全局结果事件:', result)
    // 可以在这里处理实时识别结果
  })

  // 识别错误事件
  EventsOn('recognition_error', (error) => {
    console.log('🎯 全局错误事件:', error)
    isProcessing.value = false
    toastStore.showError('识别错误', error.message || '语音识别过程中发生错误')
  })

  // 识别完成事件
  EventsOn('recognition_complete', async (response) => {
    console.log('🎯 全局完成事件:', response)
    isProcessing.value = false

    // 记录完整的Whisper原始响应数据
    const completeWhisperResponse = {
      success: response.success,
      error: response.error,
      result: response.result ? {
        text: response.result.text,
        textLength: response.result.text ? response.result.text.length : 0,
        segments: response.result.segments,
        segmentCount: response.result.segments ? response.result.segments.length : 0,
        words: response.result.words,
        wordCount: response.result.words ? response.result.words.length : 0,
        duration: response.result.duration,
        language: response.result.language,
        // 记录所有可能的Whisper返回字段
        info: response.result.info,
        model: response.result.model,
        timestampedText: response.result.timestampedText,
        timestampedTextLength: response.result.timestampedText ? response.result.timestampedText.length : 0
      } : null,
      processingTime: response.processingTime,
      timestamp: new Date().toISOString()
    }

    // 记录完整的Whisper响应到控制台
    console.log('📊 Whisper完整响应:', completeWhisperResponse)

    // 记录原始识别响应（保持兼容性）
    console.log('📋 原始识别响应:', response)

    if (response.result && response.success) {
      // 🔧 智能去重处理 - 针对长音频重复识别问题
      if (response.result.segments && response.result.segments.length > 0) {
        const originalSegmentsCount = response.result.segments.length

        // 应用智能去重算法
        const deduplicatedSegments = intelligentDeduplication(response.result.segments, {
          similarityThreshold: 0.85,    // 85% 相似度阈值
          timeOverlapThreshold: 0.3,   // 30% 时间重叠阈值
          minLength: 3,                // 最小有效长度
          enableTimeAnalysis: true,    // 启用时间重叠分析
          enableSemanticAnalysis: false // 暂不启用语义分析
        })

        // 替换原始segments为去重后的结果
        response.result.segments = deduplicatedSegments

        console.log(`🧠 智能去重完成: ${originalSegmentsCount} → ${deduplicatedSegments.length} (去除 ${originalSegmentsCount - deduplicatedSegments.length} 个重复片段)`)
      }

      // 修复：从去重后的segments生成text字段
      if (!response.result.text && response.result.segments && response.result.segments.length > 0) {
        response.result.text = response.result.segments
          .map(segment => segment.text)
          .filter(text => text && text.trim())
          .join(' ')
      }

      // 生成带细颗粒度时间戳的文本（使用新的时间插值算法）
      if (response.result.segments) {
        console.log('🎯 开始生成细颗粒度时间戳，segments:', response.result.segments.length, '个')

        // 优化语速分析
        const totalDuration = response.result.duration ||
          (response.result.segments[response.result.segments.length - 1]?.end || 0)
        const language = response.result.language || 'zh-CN'

        console.log('🔊 语速分析参数:', {
          totalDuration,
          language,
          segmentsCount: response.result.segments.length
        })

        // 后端返回的数据分析：
        // - result.text: 可能不完整的时间戳文本
        // - result.segments: 完整的segments数组（与字幕模式相同）
        // - result.timestampedText: 通常与result.text相同
        console.log('🔧 后端segments数量:', response.result.segments?.length || 0)
        console.log('🔧 后端result.text长度:', response.result.text?.length || 0)
        console.log('🔧 后端result.timestampedText长度:', response.result.timestampedText?.length || 0)
        console.log('🔧 segments预览:', JSON.stringify(response.result.segments?.slice(0, 2) || []))

        // 基于segments重建完整的时间戳文本（确保覆盖所有内容）
        let completeTimestampedText = ''
        if (response.result.segments && response.result.segments.length > 0) {
          const lines = response.result.segments.map((segment, index) => {
            const startTime = formatTimestamp(segment.start)
            const text = segment.text || ''
            return `${startTime} ${text}`
          })
          completeTimestampedText = lines.join('\n')
        }

        console.log('🔧 基于segments重建的完整时间戳文本长度:', completeTimestampedText.length)
        console.log('🔧 重建的文本预览:', completeTimestampedText.substring(0, 300))

        // 保存完整的时间戳文本供原始结果标签页使用
        response.result.originalTimestampedText = completeTimestampedText

        // 使用细颗粒度时间标记组件生成更精确的时间戳（这是前端细化处理）
        response.result.timestampedText = generateEnhancedTimestamps(
          response.result.segments,
          {
            minSegmentLength: 6,  // 最小片段长度
            maxSegmentLength: 15, // 最大片段长度
            averageSpeed: optimizeSpeedAnalysis(
              response.result.segments.map(s => s.text).join(' '),
              totalDuration,
              language
            )
          }
        )

        console.log('🔧 前端细颗粒度时间戳文本长度:', response.result.timestampedText.length)
        console.log('🔧 细颗粒度时间戳文本预览:', response.result.timestampedText.substring(0, 300))

        console.log('✅ 细颗粒度时间戳生成完成:', {
          timestampedTextLength: response.result.timestampedText?.length || 0,
          hasTimestampedText: !!response.result.timestampedText,
          preview: response.result.timestampedText?.substring(0, 100) || '无内容'
        })

        // 记录细颗粒度处理过程到控制台
        console.log('⏱️ 细颗粒度处理完成:', {
          segmentCount: response.result.segments.length,
          totalDuration,
          language,
          preview: response.result.timestampedText?.substring(0, 100)
        })
      } else {
        console.warn('⚠️ 没有segments数据，无法生成细颗粒度时间戳')
      }

      // 生成AI优化结果（前端模板系统）
      if (response.result.timestampedText) {
        console.log('🤖 开始生成AI优化结果（前端模板系统）')

        try {
          const templateKey = settings.aiTemplate || 'basic'
          console.log('🔧 使用AI模板类型:', templateKey)

          // 使用前端生成AI优化提示词
          const aiResult = await generateAIPrompt(templateKey, response.result)
          console.log('🔧 AI优化提示词生成完成，长度:', aiResult.prompt.length)

          if (aiResult.success) {
            response.result.aiOptimizationPrompt = aiResult.prompt
            console.log('✅ AI优化提示词生成完成')
          } else {
            throw new Error('AI优化提示词生成失败')
          }
        } catch (error) {
          console.error('❌ AI优化处理失败:', error)
          response.result.aiOptimizationPrompt = 'AI优化提示词生成失败: ' + error.message
        }
      } else {
        console.warn('⚠️ 没有时间戳文本，无法生成AI优化结果')
        response.result.aiOptimizationPrompt = '请先生成时间戳文本，然后才能进行AI优化。'
      }

      recognitionResult.value = response.result
      showResults.value = true
      progressData.progress = 100
      progressData.status = '识别完成！'

      console.log('✅ 识别结果设置完成 - ResultDisplay 组件将显示:', {
        hasRecognitionResult: !!recognitionResult.value,
        showResults: showResults.value,
        textLength: response.result.text?.length || 0,
        segmentCount: response.result.segments?.length || 0,
        conditionMet: showResults.value && !!recognitionResult.value
      })

      toastStore.showSuccess('识别完成', '音频识别已成功完成')

      // 记录识别完成到控制台
      console.log('🎉 识别完成:', {
        textLength: response.result.text?.length || 0,
        segmentCount: response.result.segments?.length || 0,
        duration: response.result.duration,
        language: response.result.language
      })

      // 2秒后隐藏进度条
      setTimeout(() => {
        progressData.visible = false
      }, 2000)
    } else {
      toastStore.showError('识别失败', response.error?.message || '语音识别失败')
      progressData.visible = false
    }
  })

  
  // Wails原生文件拖放事件监听
  EventsOn('file-dropped', (data) => {
    console.log('🎯 Wails原生文件拖放事件:', data)

    if (data.success && data.file) {
      const fileData = data.file
      console.log('✅ 收到Wails原生拖放文件:', fileData)

      // 创建模拟的File对象用于处理
      const mockFile = {
        name: fileData.name,
        path: fileData.path,
        size: fileData.size,
        type: `audio/${fileData.extension.replace('.', '')}`,
        hasPath: fileData.hasPath,
        webkitRelativePath: '',
        lastModified: Date.now()
      }

      console.log('🎯 准备处理Wails原生拖放文件:', mockFile)

      // 直接处理文件，因为已经有完整路径
      handleFileSelect(mockFile)
    } else {
      console.error('❌ Wails原生文件拖放数据无效:', data)
      toastStore.showError('文件拖放失败', '拖放的文件数据无效')
    }
  })

  // Wails原生文件拖放错误事件监听
  EventsOn('file-drop-error', (errorData) => {
    console.log('❌ Wails原生文件拖放错误:', errorData)
    toastStore.showError('文件拖放错误', errorData.message || errorData.error)
  })

  console.log('✅ 全局Wails事件监听器设置完成')
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