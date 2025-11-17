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
            <h1>🎵 Audio Recognizer</h1>
            <p class="subtitle">智能音频识别工具</p>
          </div>
          <div class="header-actions">
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
            <!-- 调试按钮 -->
            <button @click="debugStates" class="btn btn-small btn-info" title="调试状态">
              🔍 调试
            </button>
          </div>
        </section>

        <!-- 识别结果显示 -->
        <ResultDisplay
          :visible="showResults"
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useToastStore } from './stores/toast'
import { useAudioFile } from './composables/useAudioFile'
import { useWails } from './composables/useWails'
import { useSettings } from './composables/useSettings'
import { generateFineGrainedTimestampedText } from './utils/timeFormatter'
import { generateFineGrainedTimestampedText as generateEnhancedTimestamps, optimizeSpeedAnalysis } from './utils/fineGrainedTimestamps'
import { EventsOn } from '../wailsjs/runtime/runtime.js'
import ToastContainer from './components/ToastContainer.vue'
import ProgressBar from './components/ProgressBar.vue'
import FileDropZone from './components/FileDropZone.vue'
import SettingsModal from './components/SettingsModal.vue'
import ResultDisplay from './components/ResultDisplay.vue'

const toastStore = useToastStore()

// 使用composables - 保持响应式引用
const audioFile = useAudioFile()
const hasFile = audioFile.hasFile
const currentFile = audioFile.currentFile
const clearFile = audioFile.clearFile

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

// 调试：验证 audioFile 对象
console.log('🔧 audioFile 对象:', audioFile)

// 添加一个计算属性来双重检查
const hasFileDebug = computed(() => {
  const result = hasFile
  console.log('🔍 App组件 computed hasFile:', {
    result,
    timestamp: new Date().toISOString()
  })
  return result
})
const {
  startRecognition: wailsStartRecognition,
  stopRecognition: wailsStopRecognition,
  selectAudioFile: wailsSelectAudioFile,
  getRecognitionStatus,
  initialize: initializeWails,
  isLoading: wailsLoading
} = useWails()
const { settings, initialize: initializeSettings } = useSettings()

// 应用状态
const isProcessing = ref(false)
const showSettings = ref(false)
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

  // 获取文件路径（使用与原始AudioFileProcessor.js相同的逻辑）
  let filePath = null

  console.log('🔍 开始获取文件路径，检查文件对象:', {
    file: currentFile.value.file,
    hasPath: !!currentFile.value.file.path,
    hasName: !!currentFile.value.file.name,
    fileName: currentFile.value.file.name
  })

  // 使用与原始AudioFileProcessor.js相同的路径解析逻辑
  // path: file.path || file.webkitRelativePath || file.name

  // 先尝试获取完整路径
  let pathFound = false

  if (currentFile.value.file.path) {
    filePath = currentFile.value.file.path
    pathFound = true
    console.log('📁 使用直接文件路径:', filePath)
  } else if (currentFile.value.file.webkitRelativePath) {
    filePath = currentFile.value.file.webkitRelativePath
    pathFound = true
    console.log('📁 使用相对路径:', filePath)
  }

  // 如果没有路径，但有文件名，需要使用Wails文件对话框获取完整路径
  if (!pathFound && currentFile.value.file.name) {
    console.log('⚠️ 拖拽文件缺少完整路径，使用文件对话框重新选择')

    // 显示提示并提示用户使用文件对话框
    toastStore.showWarning('需要重新选择文件', '拖拽的文件缺少完整路径，请使用"选择文件"按钮重新选择音频文件')

    // 清除当前文件，强制用户重新选择
    currentFile.value = null
    audioFile.clearFile()
    return
  } else if (!pathFound) {
    console.log('❌ 无法获取任何文件标识')
    toastStore.showError('文件路径错误', '无法获取文件标识，请重新选择文件')
    return
  }

  console.log('✅ 最终使用的文件路径/标识:', filePath)

  try {
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
      language: settings.recognitionLanguage || 'zh-CN', // 从设置中获取，默认中文
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

// 调试状态
const debugStates = () => {
  console.log('🔍 调试状态:', {
    hasFile,
    hasFileDebug,
    currentFile: currentFile.value,
    fileInfo: audioFile.fileInfo.value,
    isProcessing: isProcessing.value,
    buttonEnabled: !(!hasFileDebug || isProcessing.value),
    hasFileType: typeof hasFile,
    hasFileDebugType: typeof hasFileDebug,
    hasFileEqualsDebug: hasFile === hasFileDebug,
    timestamp: new Date().toISOString()
  })
}

// 添加浏览器拖拽支持（作为Wails原生拖拽的补充）
const setupBrowserDragDrop = () => {
  const dropZone = document.querySelector('.file-drop-zone')
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.add('drag-over')
    })

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.remove('drag-over')
    })

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropZone.classList.remove('drag-over')

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
          // 使用老版本的文件处理方式
          await processDroppedFile(file)
        } else {
          toastStore.addToast({
            type: 'error',
            title: '文件格式错误',
            message: '请选择 MP3、WAV、M4A、AAC、OGG 或 FLAC 格式的音频文件'
          })
        }
      }
    })
  }
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
    toastStore.showInfo('处理文件', `正在处理文件 "${file.name}"...`)

    // 创建文件信息对象
    currentFile.value = {
      hasFile: true,
      fileName: file.name,
      file: file,
      duration: null,
      durationFormatted: '计算中...',
      selectedAt: new Date(),
      size: file.size,
      type: file.type
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
  EventsOn('recognition_complete', (response) => {
    console.log('🎯 全局完成事件:', response)
    isProcessing.value = false

    if (response.success && response.result) {
      // 修复：从segments生成text字段
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

        // 使用细颗粒度时间标记组件生成更精确的时间戳
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

        console.log('✅ 细颗粒度时间戳生成完成:', {
          timestampedTextLength: response.result.timestampedText?.length || 0,
          hasTimestampedText: !!response.result.timestampedText,
          preview: response.result.timestampedText?.substring(0, 100) || '无内容'
        })
      } else {
        console.warn('⚠️ 没有segments数据，无法生成细颗粒度时间戳')
      }

      recognitionResult.value = response.result
      showResults.value = true
      progressData.progress = 100
      progressData.status = '识别完成！'
      toastStore.showSuccess('识别完成', '音频识别已成功完成')

      // 2秒后隐藏进度条
      setTimeout(() => {
        progressData.visible = false
      }, 2000)
    } else {
      toastStore.showError('识别失败', response.error?.message || '语音识别失败')
      progressData.visible = false
    }
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

    // 设置浏览器拖拽支持（作为Wails原生拖拽的补充）
    setupBrowserDragDrop()
    console.log('✅ 浏览器拖拽支持已设置')

    toastStore.showSuccess('欢迎', 'Vue组件已完整迁移！v2.0.0', {
      duration: 2000
    })
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