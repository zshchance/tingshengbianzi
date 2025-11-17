<template>
  <section class="file-section">
    <!-- 文件选择区域 -->
    <div
      v-if="!props.hasFile"
      class="file-drop-zone"
      :class="{
        'loading': props.isLoading
      }"
    >
      <div class="drop-content">
        <div class="drop-icon">
          {{ props.isLoading ? '⏳' : '📁' }}
        </div>
        <h3>{{ props.isLoading ? '正在处理文件...' : '选择音频文件' }}</h3>
        <p class="drop-description">
          {{ props.isLoading ? '请稍候' : '点击下方按钮选择音频文件，或将文件拖拽到应用窗口' }}
        </p>
        <p class="drop-hint">
          💡 提示：支持 MP3、WAV、M4A、AAC、OGG、FLAC 等音频格式
        </p>
        <button
          class="btn btn-primary"
          :disabled="props.isLoading"
          @click="handleButtonClick"
        >
          📂 选择文件
        </button>
      </div>
    </div>

    <!-- 当前文件信息 -->
    <div v-if="props.hasFile" class="file-info">
      <div class="info-header">
        <h4>📄 当前文件</h4>
        <button
          @click="clearFile"
          class="btn btn-small btn-secondary"
          title="清除文件"
        >
          ✕
        </button>
      </div>

      <div class="info-content">
        <div class="file-name" :title="props.fileInfo?.name || ''">
          {{ props.fileInfo?.name || '未知文件' }}
        </div>

        <div class="file-details">
          <span class="detail-item">
            ⏱️ 时长: {{ currentFileDuration }}
          </span>
          <span class="detail-item">
            💾 大小: {{ props.fileInfo?.sizeFormatted || '未知' }}
          </span>
          <span class="detail-item">
            🎵 格式: {{ props.fileInfo?.extension || '未知' }}
          </span>
        </div>

        <!-- 文件状态指示器 -->
        <div class="file-status">
          <div class="status-indicator success"></div>
          <span class="status-text">文件已准备就绪</span>
        </div>
      </div>
    </div>

    <!-- 支持格式提示 -->
    <div class="supported-formats">
      <h5>支持的格式:</h5>
      <div class="format-list">
        <span v-for="format in supportedFormatsList" :key="format" class="format-tag">
          {{ format }}
        </span>
      </div>
      <p class="size-limit">最大文件大小: {{ maxFileSizeMB }}MB</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

// 从父组件接收状态，避免创建多个实例
const props = defineProps({
  hasFile: Boolean,
  isLoading: Boolean,
  fileInfo: Object,
  duration: [String, Number]
})

const emit = defineEmits(['select-file', 'clear-file', 'open-file-dialog', 'file-error'])

// 计算文件时长显示
const currentFileDuration = computed(() => {
  if (props.duration) {
    // 如果是数字，格式化为时间
    if (typeof props.duration === 'number') {
      const minutes = Math.floor(props.duration / 60)
      const seconds = Math.floor(props.duration % 60)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    // 如果是字符串，直接返回
    return props.duration
  }
  // 如果没有时长信息，显示"计算中..."
  return '计算中...'
})

const openFileDialog = () => {
  emit('open-file-dialog')
}

const clearFile = () => {
  emit('clear-file')
}

// 按钮点击处理函数（添加调试）
const handleButtonClick = () => {
  console.log('🖱️ 按钮被点击了!', {
    isLoading: props.isLoading,
    dragOver: props.dragOver,
    hasFile: props.hasFile,
    timestamp: new Date().toISOString()
  })

  try {
    console.log('🚀 准备调用 openFileDialog...')
    emit('open-file-dialog')
    console.log('✅ openFileDialog 调用完成')
  } catch (error) {
    console.error('❌ openFileDialog 调用失败:', error)
  }
}

// 文件拖拽现在由Wails原生处理，不需要浏览器事件处理

// 计算属性
const supportedFormatsList = computed(() => {
  const formatMap = {
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'audio/mp3': 'MP3',
    'audio/mp4': 'MP4',
    'audio/aac': 'AAC',
    'audio/ogg': 'OGG',
    'audio/flac': 'FLAC',
    'audio/m4a': 'M4A'
  }

  const supportedFormats = [
    'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4',
    'audio/aac', 'audio/ogg', 'audio/flac', 'audio/m4a'
  ]

  return [...new Set(supportedFormats.map(format => formatMap[format] || format))]
})

const maxFileSizeMB = computed(() => {
  const maxFileSize = 100 * 1024 * 1024
  return Math.round(maxFileSize / (1024 * 1024))
})
</script>

<style scoped>
.file-section {
  margin: 20px 0;
}

.file-drop-zone {
  background: var(--card-bg, #ffffff);
  border: 2px dashed var(--border-color, #d1d5db);
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.file-drop-zone:hover {
  border-color: var(--primary-color, #3b82f6);
  background: var(--bg-hover, #f0f9ff);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
}

.file-drop-zone.drag-over {
  border-color: var(--primary-color, #3b82f6);
  background: var(--bg-active, #dbeafe);
  transform: scale(1.02);
  box-shadow: 0 12px 35px rgba(59, 130, 246, 0.25);
}


.drop-content {
  /* 移除 pointer-events: none 以允许点击事件 */
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.drop-content h3 {
  margin: 0 0 8px 0;
  color: var(--text-primary, #1f2937);
  font-size: 20px;
  font-weight: 600;
}

.drop-description {
  color: var(--text-secondary, #6b7280);
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
}

.drop-hint {
  color: var(--text-muted, #9ca3af);
  margin: 0 0 24px 0;
  font-size: 12px;
  line-height: 1.4;
  font-style: italic;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.file-info {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  margin-top: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.info-header h4 {
  margin: 0;
  color: var(--text-primary, #1f2937);
  font-size: 16px;
  font-weight: 600;
}

.info-content {
  padding: 20px;
}

.file-name {
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 12px;
  word-break: break-all;
  font-size: 16px;
}

.file-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-item {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--success-bg, #f0fdf4);
  border-radius: 6px;
  border: 1px solid var(--success-border, #bbf7d0);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color, #22c55e);
  animation: pulse 2s infinite;
}

.status-indicator.success {
  background: var(--success-color, #22c55e);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  color: var(--success-text, #166534);
  font-size: 13px;
  font-weight: 500;
}

.supported-formats {
  margin-top: 16px;
  text-align: center;
}

.supported-formats h5 {
  margin: 0 0 8px 0;
  color: var(--text-secondary, #6b7280);
  font-size: 13px;
  font-weight: 500;
}

.format-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-bottom: 6px;
}

.format-tag {
  background: var(--bg-tag, #f3f4f6);
  color: var(--text-tag, #374151);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border-tag, #e5e7eb);
}

.size-limit {
  margin: 0;
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-drop-zone {
    padding: 32px 16px;
  }

  .drop-icon {
    font-size: 40px;
  }

  .drop-content h3 {
    font-size: 18px;
  }

  .file-details {
    flex-direction: column;
    gap: 8px;
  }

  .format-list {
    gap: 4px;
  }
}

/* 深色主题支持 */
@media (prefers-color-scheme: dark) {
  .file-drop-zone {
    background: var(--card-bg-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .file-drop-zone:hover {
    background: var(--bg-hover-dark, #1e3a8a);
    border-color: var(--primary-color, #3b82f6);
  }

  .file-drop-zone.drag-over {
    background: var(--bg-active-dark, #1e3a8a);
    border-color: var(--primary-color, #3b82f6);
  }

  .loading-overlay {
    background: rgba(31, 41, 55, 0.9);
  }

  .file-info {
    background: var(--card-bg-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .info-header {
    background: var(--bg-secondary-dark, #374151);
    border-color: var(--border-color-dark, #374151);
  }

  .format-tag {
    background: var(--bg-tag-dark, #374151);
    color: var(--text-tag-dark, #d1d5db);
    border-color: var(--border-tag-dark, #4b5563);
  }
}
</style>