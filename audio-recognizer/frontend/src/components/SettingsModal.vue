<template>
  <teleport to="body">
    <transition name="modal" appear>
      <div v-if="visible" class="modal-overlay" @click="closeOnOverlay && handleClose()">
        <div class="modal" @click.stop>
          <!-- 模态框头部 -->
          <div class="modal-header">
            <h3>⚙️ 应用设置</h3>
            <button class="modal-close" @click="handleClose" title="关闭">
              ✕
            </button>
          </div>

          <!-- 模态框内容 -->
          <div class="modal-body">
            <!-- 界面设置 -->
            <div class="setting-group">
              <h4>🎨 界面设置</h4>
              <div class="setting-row">
                <label for="themeSelect">主题:</label>
                <select
                  id="themeSelect"
                  :value="settings.theme"
                  @change="updateSetting('theme', $event.target.value)"
                  class="select-input"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="auto">跟随系统</option>
                </select>
              </div>
              <div class="setting-row">
                <label for="languageUISelect">界面语言:</label>
                <select
                  id="languageUISelect"
                  :value="settings.language"
                  @change="updateSetting('language', $event.target.value)"
                  class="select-input"
                >
                  <option
                    v-for="lang in availableLanguages"
                    :key="lang.value"
                    :value="lang.value"
                  >
                    {{ lang.flag }} {{ lang.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 识别设置 -->
            <div class="setting-group">
              <h4>🎤 识别设置</h4>
              <div class="setting-row">
                <label for="recognitionLanguageSelect">识别语言:</label>
                <select
                  id="recognitionLanguageSelect"
                  :value="settings.recognitionLanguage"
                  @change="updateSetting('recognitionLanguage', $event.target.value)"
                  class="select-input"
                >
                  <option
                    v-for="lang in availableLanguages"
                    :key="lang.value"
                    :value="lang.value"
                  >
                    {{ lang.flag }} {{ lang.label }}
                  </option>
                </select>
              </div>
              <div class="setting-row">
                <label for="modelSelect">识别模型:</label>
                <select
                  id="modelSelect"
                  :value="settings.modelType"
                  @change="updateSetting('modelType', $event.target.value)"
                  class="select-input"
                >
                  <option
                    v-for="model in availableModels"
                    :key="model.value"
                    :value="model.value"
                    :title="model.description"
                  >
                    {{ model.label }} - {{ model.description }}
                  </option>
                </select>
              </div>
              <div class="setting-row">
                <label>
                  <input
                    type="checkbox"
                    :checked="settings.enableWordTimestamp"
                    @change="updateSetting('enableWordTimestamp', $event.target.checked)"
                  >
                  启用词汇级时间戳
                </label>
              </div>
              <div class="setting-row">
                <label for="confidenceThreshold">置信度阈值:</label>
                <div class="range-container">
                  <input
                    type="range"
                    id="confidenceThreshold"
                    :value="settings.confidenceThreshold"
                    @input="updateSetting('confidenceThreshold', parseFloat($event.target.value))"
                    min="0"
                    max="1"
                    step="0.1"
                    class="range-input"
                  >
                  <span class="range-value">{{ settings.confidenceThreshold }}</span>
                </div>
              </div>
            </div>

            <!-- 音频处理 -->
            <div class="setting-group">
              <h4>🔊 音频处理</h4>
              <div class="setting-row">
                <label>
                  <input
                    type="checkbox"
                    :checked="settings.enableNormalization"
                    @change="updateSetting('enableNormalization', $event.target.checked)"
                  >
                  启用音频标准化
                </label>
              </div>
              <div class="setting-row">
                <label>
                  <input
                    type="checkbox"
                    :checked="settings.enableNoiseReduction"
                    @change="updateSetting('enableNoiseReduction', $event.target.checked)"
                  >
                  启用降噪处理
                </label>
              </div>
              <div class="setting-row">
                <label for="sampleRateSelect">采样率:</label>
                <select
                  id="sampleRateSelect"
                  :value="settings.sampleRate"
                  @change="updateSetting('sampleRate', parseInt($event.target.value))"
                  class="select-input"
                >
                  <option value="16000">16000 Hz</option>
                  <option value="22050">22050 Hz</option>
                  <option value="44100">44100 Hz</option>
                  <option value="48000">48000 Hz</option>
                </select>
              </div>
            </div>

            <!-- 高级设置切换 -->
            <div class="advanced-toggle">
              <button
                @click="showAdvanced = !showAdvanced"
                class="btn btn-secondary btn-small"
              >
                {{ showAdvanced ? '隐藏' : '显示' }}高级设置
                <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
              </button>
            </div>

            <!-- 高级设置 -->
            <transition name="slide-down">
              <div v-if="showAdvanced" class="advanced-settings">
                <!-- 导出设置 -->
                <div class="setting-group">
                  <h4>💾 导出设置</h4>
                  <div class="setting-row">
                    <label for="defaultFormatSelect">默认格式:</label>
                    <select
                      id="defaultFormatSelect"
                      :value="settings.defaultExportFormat"
                      @change="updateSetting('defaultExportFormat', $event.target.value)"
                      class="select-input"
                    >
                      <option
                        v-for="format in exportFormats"
                        :key="format.value"
                        :value="format.value"
                      >
                        {{ format.label }} {{ format.extension }}
                      </option>
                    </select>
                  </div>
                  <div class="setting-row">
                    <label>
                      <input
                        type="checkbox"
                        :checked="settings.autoSaveResults"
                        @change="updateSetting('autoSaveResults', $event.target.checked)"
                      >
                      自动保存识别结果
                    </label>
                  </div>
                </div>

                <!-- AI优化 -->
                <div class="setting-group">
                  <h4>✨ AI优化</h4>
                  <div class="setting-row">
                    <label>
                      <input
                        type="checkbox"
                        :checked="settings.enableAIOptimization"
                        @change="updateSetting('enableAIOptimization', $event.target.checked)"
                      >
                      启用AI文本优化
                    </label>
                  </div>
                  <div class="setting-row">
                    <label for="aiTemplateSelect">优化模板:</label>
                    <select
                      id="aiTemplateSelect"
                      :value="settings.aiTemplate"
                      @change="updateSetting('aiTemplate', $event.target.value)"
                      class="select-input"
                    >
                      <option
                        v-for="template in aiTemplates"
                        :key="template.value"
                        :value="template.value"
                        :title="template.description"
                      >
                        {{ template.label }} - {{ template.description }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- 模型设置 -->
                <div class="setting-group">
                  <h4>🤖 模型设置</h4>
                  <div class="setting-row">
                    <label for="modelPath">模型目录:</label>
                    <div class="input-group">
                      <input
                        type="text"
                        id="modelPath"
                        :value="settings.modelPath"
                        @input="updateSetting('modelPath', $event.target.value)"
                        class="text-input"
                        placeholder="模型文件路径"
                      >
                      <button @click="browseModelPath" class="btn btn-small btn-secondary">
                        浏览
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- 模态框底部 -->
          <div class="modal-footer">
            <div class="footer-left">
              <button @click="handleReset" class="btn btn-small btn-secondary">
                🔄 重置默认
              </button>
              <button @click="handleExport" class="btn btn-small btn-secondary">
                📤 导出设置
              </button>
              <label class="btn btn-small btn-secondary">
                📥 导入设置
                <input
                  type="file"
                  accept=".json"
                  @change="handleImport"
                  style="display: none;"
                >
              </label>
            </div>
            <div class="footer-right">
              <button @click="handleClose" class="btn btn-secondary">
                取消
              </button>
              <button
                @click="handleSave"
                :disabled="!isDirty || isLoading"
                class="btn btn-primary"
              >
                {{ isLoading ? '保存中...' : '保存设置' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useToastStore } from '../stores/toast'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'save'])

const toastStore = useToastStore()

// 使用设置composable
const {
  settings,
  isLoading,
  showAdvanced,
  isDirty,
  availableLanguages,
  availableModels,
  exportFormats,
  aiTemplates,
  saveSettings,
  resetSettings,
  updateSetting,
  exportSettings,
  importSettings
} = useSettings()

// 事件处理
const handleClose = () => {
  if (isDirty.value) {
    if (confirm('您有未保存的更改，确定要关闭吗？')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}

const handleSave = async () => {
  const success = await saveSettings()
  if (success) {
    emit('save')
    emit('close')
  }
}

const handleReset = () => {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    resetSettings()
  }
}

const handleExport = () => {
  exportSettings()
}

const handleImport = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      await importSettings(file)
    } catch (error) {
      console.error('导入设置失败:', error)
    }
    // 清空input以允许重复选择同一文件
    event.target.value = ''
  }
}

const browseModelPath = async () => {
  try {
    // 这里可以调用Wails的目录选择对话框
    toastStore.showInfo('功能开发中', '目录选择功能将在后续版本中实现')
  } catch (error) {
    toastStore.showError('浏览失败', error.message)
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color, #e5e7eb);
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

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  font-size: 18px;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.setting-group {
  margin-bottom: 32px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary, #1f2937);
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  min-height: 40px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-row label {
  min-width: 120px;
  color: var(--text-secondary, #6b7280);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-row input[type="checkbox"] {
  margin: 0;
}

.range-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.range-input {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  outline: none;
  background: var(--bg-range, #e5e7eb);
}

.range-value {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.input-group {
  display: flex;
  gap: 8px;
  flex: 1;
}

.text-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg, #ffffff);
  color: var(--text-primary, #1f2937);
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.advanced-toggle {
  text-align: center;
  margin: 24px 0;
}

.toggle-icon {
  margin-left: 6px;
  transition: transform 0.2s;
}

.advanced-settings {
  border-top: 1px solid var(--border-color, #e5e7eb);
  padding-top: 24px;
  margin-top: 24px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
  gap: 16px;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  position: relative;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
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

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal {
    max-width: 100%;
    max-height: 100vh;
  }

  .setting-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .setting-row label {
    min-width: auto;
  }

  .modal-footer {
    flex-direction: column;
    gap: 12px;
  }

  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: center;
  }

  .footer-left {
    order: 2;
  }

  .footer-right {
    order: 1;
  }
}
</style>