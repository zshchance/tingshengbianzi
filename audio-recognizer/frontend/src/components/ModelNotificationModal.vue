<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content model-notification-modal">
      <div class="modal-header">
        <div class="header-content">
          <div class="icon-wrapper">
            <span class="warning-icon">⚠️</span>
          </div>
          <div class="title-section">
            <h3>语言识别模型未就绪</h3>
            <p class="subtitle">程序启动时检测到模型配置问题，无法进行语音识别</p>
          </div>
        </div>
        <button @click="$emit('close')" class="close-btn" title="关闭">
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="message-content">
          <div class="alert-box">
            <h4>🔍 当前状态检测</h4>
            <ul class="status-list">
              <li v-if="!modelStatus.isLoaded" class="status-item error">
                <span class="status-icon">❌</span>
                <span>未加载任何语言识别模型</span>
              </li>
              <li v-if="!hasAvailableModels" class="status-item error">
                <span class="status-icon">❌</span>
                <span>模型目录中未找到可用模型文件</span>
              </li>
              <li v-if="modelStatus.modelPath === ''" class="status-item warning">
                <span class="status-icon">⚠️</span>
                <span>尚未配置模型文件保存目录</span>
              </li>
              <li v-else class="status-item info">
                <span class="status-icon">ℹ️</span>
                <span>当前模型目录：{{ modelStatus.modelPath || '未设置' }}</span>
              </li>
            </ul>
          </div>

          <div class="solution-box">
            <h4>📋 解决方案</h4>
            <div class="step-by-step">
              <div class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h5>下载模型文件</h5>
                  <p>访问 Hugging Face 平台下载 Whisper 模型：</p>
                  <div class="download-link">
                    <div class="link-container">
                      <div class="link-item">
                        <div class="link-content">
                          <span class="link-icon">🔗</span>
                          <span class="link-text">https://huggingface.co/ggerganov/whisper.cpp/tree/main</span>
                        </div>
                        <button
                          @click="copyLink"
                          class="copy-btn"
                          :class="{ 'copied': copySuccess }"
                          :title="copySuccess ? '已复制' : '复制链接'"
                        >
                          <span class="copy-icon">{{ copySuccess ? '✅' : '📋' }}</span>
                          <span class="copy-text">{{ copySuccess ? '已复制' : '复制' }}</span>
                        </button>
                      </div>
                      <div class="link-description">
                        <span class="desc-icon">💡</span>
                        <span class="desc-text">点击复制链接，然后在浏览器中打开下载模型</span>
                      </div>
                    </div>
                  </div>

                  <div class="model-recommendations">
                    <h6>推荐下载的模型：</h6>
                    <div class="model-cards">
                      <div class="model-card recommended">
                        <div class="model-header">
                          <span class="model-name">ggml-large-v3-turbo</span>
                          <span class="model-tag recommended-tag">推荐</span>
                        </div>
                        <div class="model-details">
                          <span class="model-size">~1.5GB</span>
                          <span class="model-performance">高精度 + 快速</span>
                        </div>
                      </div>
                      <div class="model-card">
                        <div class="model-header">
                          <span class="model-name">ggml-medium</span>
                          <span class="model-tag">平衡</span>
                        </div>
                        <div class="model-details">
                          <span class="model-size">~800MB</span>
                          <span class="model-performance">平衡精度与速度</span>
                        </div>
                      </div>
                      <div class="model-card">
                        <div class="model-header">
                          <span class="model-name">ggml-base</span>
                          <span class="model-tag">轻量</span>
                        </div>
                        <div class="model-details">
                          <span class="model-size">~150MB</span>
                          <span class="model-performance">快速但精度较低</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h5>保存模型文件</h5>
                  <p>将下载的模型文件保存到本地文件夹中，建议：</p>
                  <ul class="tips-list">
                    <li>创建专门的模型文件夹，如 <code>/Users/你的用户名/whisper-models</code></li>
                    <li>确保文件夹路径不包含中文字符或特殊符号</li>
                    <li>将模型文件直接放在文件夹内，不需要创建子文件夹</li>
                  </ul>
                </div>
              </div>

              <div class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h5>在设置中配置模型目录</h5>
                  <p>在程序中打开设置页面，选择模型保存目录：</p>
                  <div class="action-buttons">
                    <button @click="openSettings" class="btn btn-primary action-btn">
                      <span class="btn-icon">⚙️</span>
                      <span class="btn-text">打开设置</span>
                    </button>
                    <button @click="closeNotification" class="btn btn-secondary action-btn">
                      <span class="btn-icon">🚫</span>
                      <span class="btn-text">稍后配置</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-content">
          <div class="tips">
            <span class="tip-icon">💡</span>
            <span class="tip-text">程序每次启动时会检查模型状态，如果模型未配置或无法加载将显示此提醒</span>
          </div>
          <div class="footer-actions">
            <button @click="showDetails" class="btn btn-link help-btn">
              <span class="btn-icon">❓</span>
              <span>了解 Whisper</span>
            </button>
            <button @click="closeNotification" class="btn btn-secondary">
              <span class="btn-icon">✓</span>
              <span>知道了</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  modelStatus: {
    type: Object,
    default: () => ({
      isLoaded: false,
      modelPath: '',
      availableModels: []
    })
  }
})

// Emits
const emit = defineEmits(['close', 'open-settings', 'show-help'])

// Computed
const hasAvailableModels = computed(() => {
  return props.modelStatus.availableModels && props.modelStatus.availableModels.length > 0
})

// 数据
const downloadUrl = 'https://huggingface.co/ggerganov/whisper.cpp/tree/main'
const copySuccess = ref(false)

// Methods
const openSettings = () => {
  emit('open-settings')
  emit('close')
}

const closeNotification = () => {
  emit('close')
}

const showDetails = () => {
  emit('show-help')
}

const copyLink = async () => {
  try {
    // 尝试使用现代的 clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(downloadUrl)
    } else {
      // 降级到传统方法
      const textArea = document.createElement('textarea')
      textArea.value = downloadUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('复制失败:', err)
        throw err
      } finally {
        document.body.removeChild(textArea)
      }
    }

    // 显示复制成功状态
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)

    console.log('✅ 链接已复制到剪贴板')

  } catch (error) {
    console.error('❌ 复制链接失败:', error)

    // 如果复制失败，显示错误提示
    alert('复制失败，请手动复制链接：' + downloadUrl)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.modal-content {
  background-color: var(--background);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  max-width: 800px;
  width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--background) 100%);
  border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: var(--warning-color);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
}

.warning-icon {
  font-size: 2rem;
}

.title-section h3 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: var(--font-size-lg);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-md);
  transition: background-color 0.2s ease;
  color: var(--text-secondary);
}

.close-btn:hover {
  background-color: var(--surface);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--spacing-xl);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.alert-box, .solution-box {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.alert-box {
  border-left: 4px solid var(--warning-color);
}

.solution-box {
  border-left: 4px solid var(--primary-color);
}

.alert-box h4, .solution-box h4 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-list, .tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--border);
}

.status-item:last-child {
  border-bottom: none;
}

.status-item.error {
  color: var(--error-color);
}

.status-item.warning {
  color: var(--warning-color);
}

.status-item.info {
  color: var(--primary-color);
}

.status-icon {
  font-size: var(--font-size-base);
  width: 20px;
  text-align: center;
}

.step-by-step {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.step {
  display: flex;
  gap: var(--spacing-lg);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h5 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.step-content p {
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  line-height: var(--line-height-relaxed);
}

.download-link {
  margin: var(--spacing-md) 0;
}

.link-container {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  transition: all 0.2s ease;
}

.link-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.link-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  padding: var(--spacing-sm);
  background-color: var(--surface);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  min-width: 0;
}

.link-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  flex-shrink: 0;
}

.copy-btn:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.copy-btn:active {
  transform: translateY(0);
}

.copy-btn.copied {
  background-color: var(--success-color);
}

.copy-btn.copied:hover {
  background-color: #449d44;
}

.link-description {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  padding: var(--spacing-xs) 0;
}

.model-recommendations {
  margin-top: var(--spacing-lg);
}

.model-recommendations h6 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.model-card {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  transition: all 0.2s ease;
}

.model-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.model-card.recommended {
  border-color: var(--success-color);
  background-color: rgba(92, 184, 92, 0.05);
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.model-name {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.model-tag {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  background-color: var(--surface);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.recommended-tag {
  background-color: var(--success-color);
  color: white;
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.tips-list {
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
}

.tips-list li {
  padding: var(--spacing-xs) 0;
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
}

.tips-list li:last-child {
  padding-bottom: 0;
}

.tips-list code {
  background-color: var(--surface);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: var(--font-size-xs);
  color: var(--primary-color);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  flex-wrap: wrap;
}

.action-btn {
  min-width: 140px;
}

.modal-footer {
  padding: var(--spacing-lg) var(--spacing-xl);
  border-top: 1px solid var(--border);
  background-color: var(--surface-light);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.tips {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  flex: 1;
}

.tip-icon {
  flex-shrink: 0;
}

.footer-actions {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.help-btn {
  color: var(--primary-color);
  font-weight: var(--font-weight-medium);
}

.help-btn:hover {
  background-color: var(--primary-light);
  color: var(--primary-hover);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    max-width: 95vw;
    margin: var(--spacing-md);
  }

  .modal-header {
    padding: var(--spacing-lg);
  }

  .header-content {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }

  .step {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .step-number {
    align-self: flex-start;
  }

  .model-cards {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .footer-content {
    flex-direction: column;
    text-align: center;
  }

  .footer-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>