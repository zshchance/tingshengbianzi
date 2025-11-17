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
      <div v-else-if="currentContent" class="result-display">
        <!-- 原始结果 -->
        <div v-if="activeTab === 'original'" class="content-display">
          <div class="result-meta">
            <div class="meta-item">
              <span class="meta-label">识别时长:</span>
              <span class="meta-value">{{ formatDuration(resultDuration) }}</span>
            </div>
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
        <div v-else-if="activeTab === 'ai'" class="content-display">
          <div v-if="isOptimizing" class="ai-optimizing">
            <div class="ai-animation">
              <div class="ai-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <p>AI正在优化识别结果...</p>
          </div>
          <div v-else class="content-text" v-html="formattedAIContent"></div>
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
    return aiOptimizedContent.value
  } else if (activeTab.value === 'fineGrained') {
    // 细颗粒度显示带高精度时间戳的文本
    return props.recognitionResult?.timestampedText || ''
  } else if (activeTab.value === 'subtitle') {
    return props.recognitionResult?.segments || []
  }
  return ''
})

const resultDuration = computed(() => {
  return props.recognitionResult?.duration || 0
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

    if (showTimestamps.value) {
      if (subtitleFormat.value === 'srt') {
        return `<div class="subtitle-entry">
          <span class="subtitle-timestamp srt-timestamp">${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}</span>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      } else if (subtitleFormat.value === 'vtt') {
        return `<div class="subtitle-entry">
          <span class="subtitle-timestamp vtt-timestamp">${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)}</span>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      } else {
        // 简单格式
        return `<div class="subtitle-entry">
          <span class="subtitle-timestamp simple-timestamp">${formatTimestamp(segment.start).replace(/[\[\]]/g, '')}</span>
          <span class="subtitle-text">${segmentText}</span>
        </div>`
      }
    } else {
      // 隐藏时间戳，只显示文本
      return `<div class="subtitle-entry">
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
      // 从格式化字幕内容生成纯文本用于复制
      const segments = props.recognitionResult?.segments || []
      const validSegments = segments.filter(segment => segment.text && segment.text.trim())

      if (validSegments.length === 0) {
        textToCopy = ''
      } else {
        const copyLines = validSegments.map((segment) => {
          const segmentText = segment.text.trim()

          if (showTimestamps.value) {
            if (subtitleFormat.value === 'srt') {
              return `${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)} ${segmentText}`
            } else if (subtitleFormat.value === 'vtt') {
              return `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)} ${segmentText}`
            } else {
              // 简单格式
              return `${formatTimestamp(segment.start).replace(/[\[\]]/g, '')} ${segmentText}`
            }
          } else {
            // 隐藏时间戳，只显示文本
            return segmentText
          }
        })

        textToCopy = copyLines.join('\n')
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

const exportResult = () => {
  if (!props.recognitionResult) {
    toastStore.showWarning('无结果', '没有可导出的识别结果')
    return
  }

  let exportContent = ''
  let exportFormat = 'txt'

  if (activeTab.value === 'subtitle') {
    // 生成导出内容，格式与复制功能相同，避免多余空行
    const segments = props.recognitionResult?.segments || []
    const validSegments = segments.filter(segment => segment.text && segment.text.trim())

    if (validSegments.length === 0) {
      exportContent = ''
    } else {
      const exportLines = validSegments.map((segment) => {
        const segmentText = segment.text.trim()

        if (showTimestamps.value) {
          if (subtitleFormat.value === 'srt') {
            return `${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)} ${segmentText}`
          } else if (subtitleFormat.value === 'vtt') {
            return `${formatWebVTTTime(segment.start)} --> ${formatWebVTTTime(segment.end)} ${segmentText}`
          } else {
            // 简单格式
            return `${formatTimestamp(segment.start).replace(/[\[\]]/g, '')} ${segmentText}`
          }
        } else {
          // 隐藏时间戳，只显示文本
          return segmentText
        }
      })

      exportContent = exportLines.join('\n')
    }

    exportFormat = subtitleFormat.value
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