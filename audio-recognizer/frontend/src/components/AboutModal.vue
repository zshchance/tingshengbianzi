<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content about-modal">
      <div class="modal-header">
        <h3>🎵 关于听声辨字</h3>
        <button @click="$emit('close')" class="close-btn" title="关闭">
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
        <button @click="$emit('close')" class="btn btn-primary">
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { APP_INFO, TECH_STACK } from '../constants/recognitionConstants'

// 组件属性
defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// 组件事件
defineEmits(['close'])

// 打开网站链接
const openWebsite = (url) => {
  window.open(`https://${url}`, '_blank')
}
</script>

<style scoped>
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

/* 按钮样式继承 */
.btn {
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

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
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