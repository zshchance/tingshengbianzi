<template>
  <section v-if="visible" class="result-section">
    <div class="result-header">
      <div class="result-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
      <div class="result-actions">
        <button
          @click="copyToClipboard"
          :disabled="!currentContent"
          class="btn btn-small btn-secondary"
          title="复制当前内容"
        >
          📋 复制
        </button>
        <button
          v-if="activeTab === 'ai'"
          @click="copyAIPrompt"
          :disabled="!aiPrompt"
          class="btn btn-small btn-secondary"
          title="复制AI提示"
        >
          ✨ 复制提示
        </button>
        <button
          @click="exportResult"
          :disabled="!recognitionResult"
          class="btn btn-small btn-primary"
          title="导出文件"
        >
          💾 导出
        </button>
      </div>
    </div>

    <div class="result-content">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="result-loading">
        <div class="loading-spinner"></div>
        <p>{{ loadingText }}</p>
      </div>

      <!-- 结果显示 -->
      <div v-else-if="currentContent || hasAIOptimizationData" class="result-display">
        <!-- 原始结果 -->
        <div v-if="activeTab === 'original'" class="content-display">
          <div class="result-meta">
            <div class="meta-item">
              <span class="meta-label">识别语言:</span>
              <span class="meta-value">{{ languageLabel }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">字符数:</span>
              <span class="meta-value">{{ characterCount }}</span>
            </div>
          </div>
          <div class="content-text" v-html="formattedOriginalContent"></div>
        </div>

        <!-- AI优化结果 -->
        <div v-else-if="activeTab === 'ai'" class="content-display ai-optimization-display">
          <div v-if="aiOptimizationPrompt" class="ai-prompt-only">
            <h4 class="section-title">
              <span class="icon">✨</span>
              AI优化提示词
            </h4>
            <div class="ai-prompt-container">
              <div class="prompt-actions">
                <button @click="copyAIOptimizationPrompt" class="copy-button" title="复制提示词">
                  <span class="icon">📋</span>
                  复制提示词
                </button>
              </div>
              <div class="ai-prompt-content">
                {{ aiOptimizationPrompt }}
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="ai-empty-state">
            <div class="empty-icon">🤖</div>
            <p>AI优化功能需要细颗粒度时间戳数据</p>
            <p class="empty-hint">请先生成细颗粒度时间戳，然后切换到此标签页查看AI优化提示词</p>
          </div>
        </div>

        <!-- 细颗粒度时间戳 -->
        <div v-else-if="activeTab === 'fineGrained'" class="content-display">
          <div class="fine-grained-content-display">
            <div class="content-text" v-html="formattedFineGrainedContent"></div>
          </div>
        </div>

        <!-- 字幕模式 -->
        <div v-else-if="activeTab === 'subtitle'" class="content-display">
          <div class="subtitle-content-display">
            <div class="content-text" v-html="formattedSubtitleContent"></div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="result-placeholder">
        <div class="placeholder-icon">📝</div>
        <p>等待识别结果...</p>
        <p class="placeholder-hint">选择音频文件并开始识别后，结果将显示在这里</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useToastStore } from '../stores/toast'
import {
  formatTimestamp,
  formatSRTTime,
  formatWebVTTTime,
  formatDuration,
  highlightTimestamps,
  timeStringToSeconds
} from '../utils/timeFormatter'
// 日志功能已移除 - 使用浏览器控制台进行调试

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  recognitionResult: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '正在处理识别结果...'
  }
})

const emit = defineEmits(['export', 'optimize'])

const toastStore = useToastStore()

// 状态
const activeTab = ref('original')
const showTimestamps = ref(true)  // 保留，用于控制时间戳显示
const subtitleFormat = ref('srt')  // 保留，用于选择字幕格式
const isOptimizing = ref(false)
const aiOptimizedContent = ref('')

// 标签配置
const tabs = [
  { id: 'original', label: '原始结果', icon: '📄' },
  { id: 'ai', label: 'AI优化', icon: '✨' },
  { id: 'fineGrained', label: '细颗粒度', icon: '⏱️' },
  { id: 'subtitle', label: '字幕模式', icon: '🎵' }
]

// 计算属性
const currentContent = computed(() => {
  if (activeTab.value === 'original') {
    // 原始结果只显示纯文本，不带时间戳
    return props.recognitionResult?.text || ''
  } else if (activeTab.value === 'ai') {
    // AI标签页不使用currentContent，有自己独立的显示逻辑
    return 'ai-optimized'
  } else if (activeTab.value === 'fineGrained') {
    // 细颗粒度显示带高精度时间戳的文本
    return props.recognitionResult?.timestampedText || ''
  } else if (activeTab.value === 'subtitle') {
    return props.recognitionResult?.segments || []
  }
  return ''
})

const languageLabel = computed(() => {
  const languageMap = {
    'zh-CN': '中文',
    'en-US': 'English'
  }
  return languageMap[props.recognitionResult?.language] || '未知'
})

const characterCount = computed(() => {
  return (props.recognitionResult?.text || '').length
})

const subtitleSegments = computed(() => {
  const segments = props.recognitionResult?.segments || []

  if (subtitleFormat.value === 'srt') {
    return segments.map((segment, index) => ({
      ...segment,
      text: `${index + 1}\n${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n${segment.text || ''}`
    }))
  } else if (subtitleFormat.value === 'vtt') {
    return segments.map(segment => ({
      ...segment,
      text: `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}\n${segment.text || ''}`
    }))
  }

  return segments
})

const formattedOriginalContent = computed(() => {
  // 原始结果只显示纯文本，不处理时间戳
  let text = props.recognitionResult?.text || ''
  if (!text) return ''

  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${line.trim()}</p>`)
    .join('')
})

const formattedAIContent = computed(() => {
  const text = aiOptimizedContent.value
  if (!text) return ''

  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${line.trim()}</p>`)
    .join('')
})

const formattedFineGrainedContent = computed(() => {
  const text = props.recognitionResult?.timestampedText || ''
  if (!text) return ''

  // 高亮时间戳并格式化为段落
  const highlightedText = text.replace(
    /\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/g,
    '<span class="fine-grained-timestamp">[$1]</span>'
  )

  return highlightedText
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p class="fine-grained-line">${line.trim()}</p>`)
    .join('')
})

// AI优化相关计算属性
const hasAIOptimizationData = computed(() => {
  const hasPrompt = !!props.recognitionResult?.aiOptimizationPrompt
  const hasReport = !!props.recognitionResult?.qualityReport
  const hasPreprocessed = !!props.recognitionResult?.preprocessedText

  console.log('🔍 AI数据检查:', {
    hasPrompt,
    hasReport,
    hasPreprocessed,
    recognitionResult: props.recognitionResult,
    aiOptimizationPrompt: props.recognitionResult?.aiOptimizationPrompt?.substring(0, 50),
    qualityReport: props.recognitionResult?.qualityReport,
    preprocessedTextLength: props.recognitionResult?.preprocessedText?.length
  })

  return hasPrompt || hasReport || hasPreprocessed
})

const qualityReport = computed(() => {
  return props.recognitionResult?.qualityReport || null
})

const aiOptimizationPrompt = computed(() => {
  return props.recognitionResult?.aiOptimizationPrompt || ''
})

const preprocessedText = computed(() => {
  return props.recognitionResult?.preprocessedText || ''
})

const formattedPreprocessedText = computed(() => {
  const text = preprocessedText.value
  if (!text) return ''

  // 高亮时间戳
  const highlightedText = text.replace(
    /\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/g,
    '<span class="timestamp-highlight">[$1]</span>'
  )

  return highlightedText
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p class="preprocessed-line">${line.trim()}</p>`)
    .join('')
})

// 质量评分样式类
const getQualityScoreClass = (score) => {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-fair'
  return 'score-poor'
}

const aiPrompt = computed(() => {
  const originalText = props.recognitionResult?.text || ''
  if (!originalText) return ''

  return `请优化以下语音识别文本，要求：
1. 修正明显的识别错误
2. 添加适当的标点符号
3. 优化语句结构，使其更通顺
4. 保持原意不变

原始文本：
${originalText}`
})

// 生成格式化的字幕内容
const formattedSubtitleContent = computed(() => {
  const segments = props.recognitionResult?.segments || []
  if (segments.length === 0) return ''

  const validSegments = segments.filter(segment => segment.text && segment.text.trim())

  if (validSegments.length === 0) return ''

  const entries = validSegments.map((segment, index) => {
    const segmentText = segment.text.trim()
    const srtIndex = index + 1  // SRT序号从1开始

    if (showTimestamps.value) {
      if (subtitleFormat.value === 'srt') {
        // 标准SRT格式：序号 + 时间戳 + 文本，每行换行
        return `<div class="subtitle-entry">
          <span class="subtitle-index">${srtIndex}</span><br>
          <span class="subtitle-timestamp srt-timestamp">${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}</span><br>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      } else if (subtitleFormat.value === 'vtt') {
        // WebVTT格式（不需要序号）
        return `<div class="subtitle-entry">
          <span class="subtitle-timestamp vtt-timestamp">${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}</span><br>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      } else {
        // 简单格式
        return `<div class="subtitle-entry">
          <span class="subtitle-index">${srtIndex}</span>
          <span class="subtitle-timestamp simple-timestamp">${formatTimestamp(segment.start).replace(/[\[\]]/g, '')}</span>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      }
    } else {
      // 隐藏时间戳，只显示文本和序号
      return `<div class="subtitle-entry">
        <span class="subtitle-index">${srtIndex}</span>
        <span class="subtitle-text">${segmentText}</span>
      </div>`
    }
  })

  return entries.join('')
})



const copyToClipboard = async () => {
  try {
    let textToCopy = ''

    if (activeTab.value === 'original') {
      textToCopy = props.recognitionResult?.text || ''
    } else if (activeTab.value === 'ai') {
      textToCopy = aiOptimizedContent.value
    } else if (activeTab.value === 'fineGrained') {
      textToCopy = props.recognitionResult?.timestampedText || ''
    } else if (activeTab.value === 'subtitle') {
      // 从格式化字幕内容生成纯文本用于复制，包含SRT序号
      const segments = props.recognitionResult?.segments || []
      const validSegments = segments.filter(segment => segment.text && segment.text.trim())

      if (validSegments.length === 0) {
        textToCopy = ''
      } else {
        const copyLines = validSegments.map((segment, index) => {
          const segmentText = segment.text.trim()
          const srtIndex = index + 1  // SRT序号从1开始

          if (showTimestamps.value) {
            if (subtitleFormat.value === 'srt') {
              // 标准SRT格式：序号\n时间戳\n文本
              return `${srtIndex}\n${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n${segmentText}`
            } else if (subtitleFormat.value === 'vtt') {
              // WebVTT格式（不需要序号）
              return `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}\n${segmentText}`
            } else {
              // 简单格式：序号 时间戳 文本
              return `${srtIndex} ${formatTimestamp(segment.start).replace(/[\[\]]/g, '')} ${segmentText}`
            }
          } else {
            // 隐藏时间戳，只显示序号和文本
            return `${srtIndex} ${segmentText}`
          }
        })

        textToCopy = copyLines.join('\n\n')  // SRT格式使用空行分隔
      }
    }

    if (!textToCopy) {
      toastStore.showWarning('无内容', '当前标签页没有可复制的内容')
      return
    }

    await navigator.clipboard.writeText(textToCopy)
    toastStore.showSuccess('复制成功', '内容已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toastStore.showError('复制失败', error.message)
  }
}

const copyAIPrompt = async () => {
  try {
    await navigator.clipboard.writeText(aiPrompt.value)
    toastStore.showSuccess('提示已复制', 'AI优化提示已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toastStore.showError('复制失败', error.message)
  }
}

// 复制新的AI优化提示词
const copyAIOptimizationPrompt = async () => {
  try {
    await navigator.clipboard.writeText(aiOptimizationPrompt.value)
    toastStore.showSuccess('提示已复制', 'AI优化提示词已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toastStore.showError('复制失败', error.message)
  }
}

// 复制预处理文本
const copyPreprocessedText = async () => {
  try {
    await navigator.clipboard.writeText(preprocessedText.value)
    toastStore.showSuccess('文本已复制', '预处理文本已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    toastStore.showError('复制失败', error.message)
  }
}

const exportResult = () => {
  if (!props.recognitionResult) {
    toastStore.showWarning('无结果', '没有可导出的识别结果')
    return
  }

  let exportContent = ''
  let exportFormat = 'txt'

  if (activeTab.value === 'subtitle') {
    // 生成导出内容，包含SRT序号，与复制功能保持一致
    const segments = props.recognitionResult?.segments || []
    const validSegments = segments.filter(segment => segment.text && segment.text.trim())

    if (validSegments.length === 0) {
      exportContent = ''
    } else {
      const exportLines = validSegments.map((segment, index) => {
        const segmentText = segment.text.trim()
        const srtIndex = index + 1  // SRT序号从1开始

        if (showTimestamps.value) {
          if (subtitleFormat.value === 'srt') {
            // 标准SRT格式：序号\n时间戳\n文本
            return `${srtIndex}\n${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n${segmentText}`
          } else if (subtitleFormat.value === 'vtt') {
            // WebVTT格式（不需要序号）
            return `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}\n${segmentText}`
          } else {
            // 简单格式：序号 时间戳 文本
            return `${srtIndex} ${formatTimestamp(segment.start).replace(/[\[\]]/g, '')} ${segmentText}`
          }
        } else {
          // 隐藏时间戳，只显示序号和文本
          return `${srtIndex} ${segmentText}`
        }
      })

      exportContent = exportLines.join('\n\n')  // SRT格式使用空行分隔
      exportFormat = subtitleFormat.value === 'srt' ? 'srt' : subtitleFormat.value === 'vtt' ? 'vtt' : 'txt'
    }
  } else {
    exportContent = currentContent.value
    exportFormat = 'txt'
  }

  emit('export', {
    format: exportFormat,
    content: exportContent,
    filename: generateFilename()
  })
}

const generateFilename = () => {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0]
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-')
  const suffix = activeTab.value === 'original' ? 'original' :
                 activeTab.value === 'ai' ? 'ai-optimized' : 'subtitle'
  return `audio-recognizer-${suffix}-${dateStr}-${timeStr}`
}


const startAIOptimization = async () => {
  if (!props.recognitionResult?.text) {
    toastStore.showWarning('无内容', '没有可优化的识别结果')
    return
  }

  try {
    isOptimizing.value = true
    emit('optimize', props.recognitionResult.text)
  } catch (error) {
    console.error('AI优化失败:', error)
    toastStore.showError('AI优化失败', error.message)
  } finally {
    isOptimizing.value = false
  }
}

// 监听标签切换
watch(activeTab, (newTab) => {
  if (newTab === 'ai' && !aiOptimizedContent.value && props.recognitionResult?.text) {
    startAIOptimization()
  }
})

// 监听识别结果变化
watch(() => props.recognitionResult, (newResult) => {
  if (newResult && activeTab.value === 'ai') {
    startAIOptimization()
  }
})

// 暴露方法给父组件
defineExpose({
  startAIOptimization,
  setAIOptimizedContent: (content) => {
    aiOptimizedContent.value = content
  }
})

// 监控字幕生成并记录日志
watch(
  [() => props.recognitionResult?.segments, () => subtitleFormat.value, () => showTimestamps.value, () => activeTab.value],
  async ([segments, format, showTs, activeTab]) => {
    if (segments && segments.length > 0 && activeTab === 'subtitle') {
      // 生成字幕内容用于日志记录
      const validSegments = segments.filter(segment => segment.text && segment.text.trim())
      if (validSegments.length > 0) {
        const copyLines = validSegments.map((segment, index) => {
          const segmentText = segment.text.trim()
          const srtIndex = index + 1

          if (showTs) {
            if (format === 'srt') {
              return `${srtIndex}\n${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n${segmentText}`
            } else if (format === 'vtt') {
              return `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}\n${segmentText}`
            } else {
              return `${srtIndex} ${formatTimestamp(segment.start).replace(/[\[\]]/g, '')} ${segmentText}`
            }
          } else {
            return `${srtIndex} ${segmentText}`
          }
        })

        const subtitleContent = copyLines.join('\n\n')

        // 记录字幕生成到控制台
        console.log('📝 字幕生成完成:', {
          format,
          segmentCount: validSegments.length,
          contentLength: subtitleContent.length,
          preview: subtitleContent.substring(0, 100) + '...'
        })
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.result-section {
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  margin: 20px 0;
  box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-color, #e5e7eb);
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  flex-wrap: wrap;
  gap: 12px;
}

.result-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.tab-btn.active {
  background: var(--primary-color, #3b82f6);
  color: white;
}

.result-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-content {
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary, #6b7280);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #e5e7eb);
  border-top: 3px solid var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.content-display {
  padding: 20px;
}

.result-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--bg-meta, #f8fafc);
  border-radius: 8px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.meta-label {
  color: var(--text-muted, #6b7280);
  font-weight: 500;
}

.meta-value {
  color: var(--text-primary, #1f2937);
  font-weight: 600;
}

.content-text {
  line-height: 1.6;
  color: var(--text-primary, #1f2937);
  font-size: 15px;
}

.content-text :deep(p) {
  margin: 0 0 12px 0;
}

.content-text :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-optimizing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary, #6b7280);
}

.ai-animation {
  margin-bottom: 16px;
}

.ai-dots {
  display: flex;
  gap: 4px;
}

.ai-dots span {
  width: 8px;
  height: 8px;
  background: var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: ai-bounce 1.4s ease-in-out infinite both;
}

.ai-dots span:nth-child(1) { animation-delay: -0.32s; }
.ai-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes ai-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}


.subtitle-content-display {
  padding: 16px;
}

.fine-grained-content-display {
  padding: 20px;
}

.fine-grained-timestamp {
  color: #0066cc;
  font-weight: bold;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f0f8ff;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
}

.fine-grained-line {
  margin: 0 0 4px 0;
  line-height: 1.5;
  font-size: 15px;
  color: var(--text-primary, #1f2937);
}

.subtitle-entry {
  margin-bottom: 6px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.subtitle-entry:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.subtitle-timestamp {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
  margin: 0;
}

.srt-timestamp {
  background-color: var(--success-bg, #f0fdf4);
  color: var(--success-text, #166534);
  border: 1px solid var(--success-border, #bbf7d0);
}

.vtt-timestamp {
  background-color: var(--primary-bg, #eff6ff);
  color: var(--primary-text, #1e40af);
  border: 1px solid var(--primary-border, #bfdbfe);
}

.simple-timestamp {
  background-color: var(--warning-bg, #fffbeb);
  color: var(--warning-text, #92400e);
  border: 1px solid var(--warning-border, #fed7aa);
}

.subtitle-text {
  line-height: 1.4;
  color: var(--text-primary, #1f2937);
  font-size: 15px;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 0;
}

.subtitle-index {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-text, #1e40af);
  background-color: var(--primary-bg, #eff6ff);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--primary-border, #bfdbfe);
  min-width: 32px;
  text-align: center;
  margin-right: 8px;
  line-height: 1.2;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .srt-timestamp {
    background-color: var(--success-bg-dark, #064e3b);
    color: var(--success-text-dark, #6ee7b7);
    border: 1px solid var(--success-border-dark, #10b981);
  }

  .vtt-timestamp {
    background-color: var(--primary-bg-dark, #1e3a8a);
    color: var(--primary-text-dark, #60a5fa);
    border: 1px solid var(--primary-border-dark, #3b82f6);
  }

  .simple-timestamp {
    background-color: var(--warning-bg-dark, #451a03);
    color: var(--warning-text-dark, #fbbf24);
    border: 1px solid var(--warning-border-dark, #f59e0b);
  }

  .subtitle-text {
    color: var(--text-primary-dark, #f3f4f6);
  }

  .fine-grained-timestamp {
    color: #60a5fa;
    background-color: #1e3a8a;
  }

  .fine-grained-line {
    color: var(--text-primary-dark, #f3f4f6);
  }
}

/* AI优化相关样式 */
.ai-optimization-display {
  padding: 20px;
}

.ai-prompt-only {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 4px solid var(--primary-color, #0284c7);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.section-title .icon {
  font-size: 20px;
}

/* 质量报告样式 */
.quality-report-section {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  background: var(--surface, #f9fafb);
}

.quality-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quality-score {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.score-label {
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
}

.score-value {
  font-weight: 700;
  font-size: 20px;
  padding: 4px 12px;
  border-radius: 20px;
  background: white;
  border: 2px solid;
}

.score-excellent {
  color: #059669;
  border-color: #059669;
  background: #ecfdf5;
}

.score-good {
  color: #0284c7;
  border-color: #0284c7;
  background: #f0f9ff;
}

.score-fair {
  color: #d97706;
  border-color: #d97706;
  background: #fffbeb;
}

.score-poor {
  color: #dc2626;
  border-color: #dc2626;
  background: #fef2f2;
}

.quality-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.quality-suggestions {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.quality-suggestions h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.quality-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.quality-suggestions li {
  margin-bottom: 6px;
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  line-height: 1.5;
}

.special-markers-analysis {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.special-markers-analysis h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.marker-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.marker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface, #f9fafb);
  border-radius: 4px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.marker-label {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.marker-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

/* AI提示词样式 */
.ai-prompt-section {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 4px solid var(--primary-color, #0284c7);
}

.ai-prompt-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-actions {
  display: flex;
  justify-content: flex-end;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  color: var(--text-primary, #1f2937);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background: var(--primary-color, #0284c7);
  color: white;
  border-color: var(--primary-color, #0284c7);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
}

.copy-button .icon {
  font-size: 16px;
}

.ai-prompt-content {
  background: white;
  border-radius: 6px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #1f2937);
  white-space: pre-wrap;
  border: 1px solid var(--border-color, #e5e7eb);
  max-height: 300px;
  overflow-y: auto;
}

/* 预处理文本样式 */
.preprocessed-section {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
}

.preprocessed-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-actions {
  display: flex;
  justify-content: flex-end;
}

.preprocessed-line {
  margin: 0 0 4px 0;
  line-height: 1.5;
  font-size: 15px;
  color: var(--text-primary, #1f2937);
}

.timestamp-highlight {
  color: #0284c7;
  font-weight: bold;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #e0f2fe;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
}

/* AI空状态样式 */
.ai-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.ai-empty-state p {
  margin: 0 0 8px 0;
  color: var(--text-secondary, #6b7280);
  font-size: 16px;
}

.empty-hint {
  font-size: 14px !important;
  opacity: 0.7;
  line-height: 1.5;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .ai-prompt-only {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    border-color: var(--border-color-dark, #374151);
  }

  .section-title {
    color: var(--text-primary-dark, #f3f4f6);
  }

  .score-value {
    background: var(--surface-dark, #1f2937);
  }

  .stat-item,
  .quality-suggestions,
  .special-markers-analysis {
    background: var(--surface-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .copy-button {
    background: var(--surface-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
    color: var(--text-primary-dark, #f3f4f6);
  }

  .copy-button:hover {
    background: var(--primary-color, #3b82f6);
    border-color: var(--primary-color, #3b82f6);
  }

  .ai-prompt-content {
    background: var(--surface-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
    color: var(--text-primary-dark, #f3f4f6);
  }

  .timestamp-highlight {
    color: #60a5fa;
    background-color: #1e3a8a;
  }

  .preprocessed-line,
  .fine-grained-line {
    color: var(--text-primary-dark, #f3f4f6);
  }
}

.result-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted, #9ca3af);
  text-align: center;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.placeholder-hint {
  font-size: 14px;
  margin-top: 8px;
  max-width: 400px;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-primary {
  background: var(--primary-color, #3b82f6);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #2563eb);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--secondary-color, #6b7280);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-hover, #4b5563);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.select-input {
  padding: 4px 8px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 4px;
  font-size: 12px;
  background: var(--input-bg, #ffffff);
  color: var(--text-primary, #1f2937);
}

/* 响应式 */
@media (max-width: 768px) {
  .result-header {
    flex-direction: column;
    align-items: stretch;
  }

  .result-tabs {
    justify-content: center;
  }

  .result-actions {
    justify-content: center;
  }

  .result-meta {
    flex-direction: column;
    gap: 12px;
  }

  .subtitle-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .subtitle-segment {
    flex-direction: column;
    gap: 4px;
  }

  .subtitle-timestamp {
    min-width: auto;
  }
}
</style>