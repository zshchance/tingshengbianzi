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
                  <button
                    @click="browseModelPath"
                    class="btn btn-small btn-secondary"
                    :disabled="modelLoading"
                  >
                    {{ modelLoading ? '选择中...' : '浏览' }}
                  </button>
                </div>
              </div>

              <!-- 模型信息显示 -->
              <div v-if="modelInfo" class="model-info">
                <div class="setting-row">
                  <label>模型状态:</label>
                  <div class="model-status">
                    <span
                      :class="[
                        'status-badge',
                        modelInfo.hasWhisper ? 'status-success' : 'status-warning'
                      ]"
                    >
                      {{ modelInfo.hasWhisper ? '✅ 已配置' : '⚠️ 需要配置' }}
                    </span>
                    <span class="model-count">
                      ({{ modelInfo.modelCount }} 个模型)
                    </span>
                  </div>
                </div>

                <!-- 模型列表 -->
                <div v-if="modelInfo.models && modelInfo.models.length > 0" class="model-list">
                  <div class="setting-row">
                    <label>可用模型 (点击选择):</label>
                  </div>
                  <div
                    v-for="model in modelInfo.models"
                    :key="model.name"
                    class="model-item"
                    :class="{ 'model-selected': isModelSelected(model) }"
                    @click="selectModel(model)"
                  >
                    <div class="model-content">
                      <div class="model-name">
                        {{ model.name }}
                        <span v-if="isModelSelected(model)" class="selected-indicator">✓</span>
                      </div>
                      <div class="model-details">
                        <span class="model-type">{{ model.type }}</span>
                        <span class="model-size">{{ model.sizeStr }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="model-selection-info">
                    当前选择: {{ getCurrentSelectedModel() || '未选择，将使用默认模型' }}
                  </div>
                </div>

                <!-- 推荐信息 -->
                <div v-if="modelInfo.recommendations" class="recommendations">
                  <div class="setting-row">
                    <label>建议:</label>
                  </div>
                  <ul class="recommendation-list">
                    <li v-for="(rec, index) in modelInfo.recommendations" :key="index">
                      {{ rec }}
                    </li>
                  </ul>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="setting-row">
                <label></label>
                <div class="model-actions">
                  <button
                    @click="checkCurrentModelPath"
                    class="btn btn-small btn-secondary"
                    :disabled="modelLoading || !settings.modelPath"
                  >
                    {{ modelLoading ? '检查中...' : '检查模型' }}
                  </button>
                  <button
                    @click="openModelDocs"
                    class="btn btn-small btn-secondary"
                  >
                    📖 模型说明
                  </button>
                </div>
              </div>
            </div>

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
                :disabled="isLoading"
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
import { ref, onMounted, watch } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useToastStore } from '../stores/toast'
import { UpdateConfig } from '../../wailsjs/go/main/App.js'

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

// 使用设置composable（现在会使用全局实例）
const {
  settings,
  isLoading,
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
  console.log('🔧 handleClose 被调用')
  console.log('✅ 直接关闭设置面板（不再检查未保存的更改）')
  emit('close')
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

// 模型相关状态
const modelInfo = ref(null)
const modelLoading = ref(false)

const browseModelPath = async () => {
  try {
    modelLoading.value = true
    console.log('🗂️ 开始选择模型文件夹...')

    // 动态导入 useWails 以避免循环依赖
    const { useWails } = await import('../composables/useWails')
    const { selectModelDirectory, getModelInfo } = useWails()

    // 选择模型文件夹
    const selectionResult = await selectModelDirectory()
    if (selectionResult?.success) {
      const selectedPath = selectionResult.path

      // 更新设置中的模型路径
      updateSetting('modelPath', selectedPath)

      // 立即保存设置以确保持久化
      try {
        await saveSettings()
        console.log('✅ 模型路径已保存到配置文件')
      } catch (saveError) {
        console.warn('保存模型路径失败:', saveError)
        toastStore.showWarning('部分保存成功', '模型路径已更新，但配置文件保存失败')
      }

      // 获取模型信息
      try {
        modelInfo.value = await getModelInfo(selectedPath)
        console.log('📊 模型信息:', modelInfo.value)

        if (modelInfo.value?.success) {
          const modelCount = modelInfo.value.modelCount || 0
          toastStore.showSuccess(
            '模型文件夹选择成功',
            `已选择文件夹，检测到 ${modelCount} 个模型文件`
          )
        }
      } catch (infoError) {
        console.warn('获取模型信息失败:', infoError)
        toastStore.showWarning(
          '模型文件夹选择成功',
          '已选择文件夹，但无法获取详细模型信息'
        )
      }
    }
  } catch (error) {
    console.error('选择模型文件夹失败:', error)
    toastStore.showError('浏览失败', error.message)
  } finally {
    modelLoading.value = false
  }
}

// 检查当前模型路径
const checkCurrentModelPath = async () => {
  console.log('🔍 checkCurrentModelPath 调用时的 settings.modelPath:', settings.modelPath)
  if (!settings.modelPath) {
    console.warn('⚠️ settings.modelPath 为空，跳过检查')
    return
  }

  try {
    modelLoading.value = true
    console.log('🔍 检查当前模型路径:', settings.modelPath)

    const { useWails } = await import('../composables/useWails')
    const { getModelInfo } = useWails()

    modelInfo.value = await getModelInfo(settings.modelPath)
    console.log('📊 当前模型信息:', modelInfo.value)
  } catch (error) {
    console.warn('检查模型路径失败:', error)
    modelInfo.value = null
  } finally {
    modelLoading.value = false
  }
}


// 打开模型文档
const openModelDocs = () => {
  // 在实际应用中，这里可以打开一个本地文档文件或者网页
  const docsUrl = 'https://github.com/ggerganov/whisper.cpp#model-comparison'
  window.open(docsUrl, '_blank')
}

// 在组件挂载时检查当前模型路径
onMounted(async () => {
  console.log('🚀 SettingsModal 组件挂载，props.visible:', props.visible)
  console.log('🚀 组件挂载时的 settings.modelPath:', settings.modelPath)
  console.log('🚀 组件挂载时的完整 settings:', settings)

  if (props.visible && settings.modelPath) {
    console.log('🔍 组件挂载，检查当前模型路径:', settings.modelPath)
    await checkCurrentModelPath()
  }
})

// 模型选择相关方法
const isModelSelected = (model) => {
  if (!settings.specificModelFile) return false
  const selectedFileName = settings.specificModelFile.split('/').pop().split('\\').pop()
  return selectedFileName === model.name
}

const getCurrentSelectedModel = () => {
  if (!settings.specificModelFile) return null
  return settings.specificModelFile.split('/').pop().split('\\').pop()
}

const selectModel = async (model) => {
  try {
    console.log('🎯 选择模型:', model.name)

    // 构建完整的模型文件路径
    const modelFilePath = settings.modelPath + (settings.modelPath.endsWith('/') || settings.modelPath.endsWith('\\') ? '' : '/') + model.name

    // 更新设置中的具体模型文件
    updateSetting('specificModelFile', modelFilePath)

    // 立即保存设置
    try {
      await saveSettings()
      console.log('✅ 模型选择已保存:', model.name)

      // 确保后端配置也更新
      try {
        const backendConfig = {
          language: settings.recognitionLanguage || 'zh-CN',
          modelPath: settings.modelPath,
          specificModelFile: settings.specificModelFile,
          sampleRate: settings.sampleRate || 16000,
          bufferSize: settings.bufferSize || 4000,
          confidenceThreshold: settings.confidenceThreshold || 0.5,
          maxAlternatives: settings.maxAlternatives || 1,
          enableWordTimestamp: settings.enableWordTimestamp !== false,
          enableNormalization: settings.enableNormalization !== false,
          enableNoiseReduction: settings.enableNoiseReduction || false
        }

        const result = await UpdateConfig(JSON.stringify(backendConfig))
        if (result.success) {
          console.log('✅ 模型配置已同步到后端')
        } else {
          console.error('❌ 后端模型配置更新失败:', result.error?.message)
        }
      } catch (backendError) {
        console.error('❌ 调用后端模型配置更新失败:', backendError)
      }

      toastStore.showSuccess(
        '模型选择成功',
        `已选择模型: ${model.name} (${model.sizeStr})`
      )
    } catch (saveError) {
      console.warn('保存模型选择失败:', saveError)
      toastStore.showWarning('选择成功', '模型已选择，但配置保存失败')
    }
  } catch (error) {
    console.error('选择模型失败:', error)
    toastStore.showError('选择失败', error.message)
  }
}

// 监听设置模态框的显示状态
watch(() => props.visible, async (newVisible) => {
  console.log('🔍 设置模态框显示状态变化:', newVisible, '当前 modelPath:', settings.modelPath)
  if (newVisible && settings.modelPath && !modelInfo.value) {
    console.log('🔍 设置模态框打开，检查模型路径:', settings.modelPath)
    await checkCurrentModelPath()
  }
})

// 监听模型路径变化
watch(() => settings.modelPath, async (newPath, oldPath) => {
  console.log('🔄 模型路径变化监听器触发:', { oldPath, newPath })
  if (newPath && props.visible) {
    console.log('🔄 模型路径已更改，重新检查:', newPath)
    await checkCurrentModelPath()
  } else {
    // 路径被清空时清除模型信息
    modelInfo.value = null
  }
}, { immediate: true }) // 添加 immediate: true 来立即触发一次
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

/* 暗色模式下的样式优化 */
html[data-theme="dark"] .modal {
  background: #1f2937 !important;
  border-color: #374151 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] .modal-header {
  background: #111827 !important;
  border-color: #374151 !important;
}

html[data-theme="dark"] .modal-header h3 {
  color: #f9fafb !important;
}

html[data-theme="dark"] .modal-close {
  color: #9ca3af !important;
}

html[data-theme="dark"] .modal-close:hover {
  background: #374151 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] .modal-footer {
  background: #111827 !important;
  border-color: #374151 !important;
}

html[data-theme="dark"] .setting-group h4 {
  color: #f9fafb !important;
  border-color: #374151 !important;
}

html[data-theme="dark"] .setting-row label {
  color: #d1d5db !important;
}

html[data-theme="dark"] .text-input {
  background: #374151 !important;
  border-color: #4b5563 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] .text-input:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
}

html[data-theme="dark"] .range-input {
  background: #4b5563 !important;
}

html[data-theme="dark"] .range-value {
  color: #f9fafb !important;
}

html[data-theme="dark"] .model-info {
  background: #374151 !important;
  border-color: #4b5563 !important;
}

html[data-theme="dark"] .model-item {
  background: #374151 !important;
  border-color: #4b5563 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] .model-item:hover {
  background: #4b5563 !important;
  border-color: #3b82f6 !important;
}

html[data-theme="dark"] .model-item.model-selected {
  background: #1e3a8a !important;
  border-color: #3b82f6 !important;
}

html[data-theme="dark"] .model-name {
  color: #f9fafb !important;
}

html[data-theme="dark"] .model-selection-info {
  background: #374151 !important;
  color: #d1d5db !important;
  border-color: #3b82f6 !important;
}

html[data-theme="dark"] .recommendation-list {
  color: #d1d5db !important;
}

html[data-theme="dark"] .status-success {
  background: #065f46 !important;
  color: #34d399 !important;
}

html[data-theme="dark"] .status-warning {
  background: #92400e !important;
  color: #fbbf24 !important;
}

html[data-theme="dark"] .model-count {
  color: #9ca3af !important;
}

html[data-theme="dark"] .select-input {
  background: #374151 !important;
  border-color: #4b5563 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] .select-input:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
}

html[data-theme="dark"] .select-input option {
  background: #374151 !important;
  color: #f9fafb !important;
}

html[data-theme="dark"] input[type="checkbox"] {
  accent-color: #3b82f6 !important;
}

/* 也支持系统级暗色模式作为备选 */
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) .modal {
    background: #1f2937 !important;
    border-color: #374151 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .modal-header {
    background: #111827 !important;
    border-color: #374151 !important;
  }

  html:not([data-theme="light"]) .modal-header h3 {
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .modal-close {
    color: #9ca3af !important;
  }

  html:not([data-theme="light"]) .modal-close:hover {
    background: #374151 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .modal-footer {
    background: #111827 !important;
    border-color: #374151 !important;
  }

  html:not([data-theme="light"]) .setting-group h4 {
    color: #f9fafb !important;
    border-color: #374151 !important;
  }

  html:not([data-theme="light"]) .setting-row label {
    color: #d1d5db !important;
  }

  html:not([data-theme="light"]) .text-input {
    background: #374151 !important;
    border-color: #4b5563 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .text-input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  }

  html:not([data-theme="light"]) .range-input {
    background: #4b5563 !important;
  }

  html:not([data-theme="light"]) .range-value {
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .model-info {
    background: #374151 !important;
    border-color: #4b5563 !important;
  }

  html:not([data-theme="light"]) .model-item {
    background: #374151 !important;
    border-color: #4b5563 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .model-item:hover {
    background: #4b5563 !important;
    border-color: #3b82f6 !important;
  }

  html:not([data-theme="light"]) .model-item.model-selected {
    background: #1e3a8a !important;
    border-color: #3b82f6 !important;
  }

  html:not([data-theme="light"]) .model-name {
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .model-selection-info {
    background: #374151 !important;
    color: #d1d5db !important;
    border-color: #3b82f6 !important;
  }

  html:not([data-theme="light"]) .recommendation-list {
    color: #d1d5db !important;
  }

  html:not([data-theme="light"]) .status-success {
    background: #065f46 !important;
    color: #34d399 !important;
  }

  html:not([data-theme="light"]) .status-warning {
    background: #92400e !important;
    color: #fbbf24 !important;
  }

  html:not([data-theme="light"]) .model-count {
    color: #9ca3af !important;
  }

  html:not([data-theme="light"]) .select-input {
    background: #374151 !important;
    border-color: #4b5563 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) .select-input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  }

  html:not([data-theme="light"]) .select-input option {
    background: #374151 !important;
    color: #f9fafb !important;
  }

  html:not([data-theme="light"]) input[type="checkbox"] {
    accent-color: #3b82f6 !important;
  }
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

.select-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg, #ffffff);
  color: var(--text-primary, #1f2937);
  cursor: pointer;
}

.select-input:focus {
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

/* 模型信息样式 */
.model-info {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-tertiary, #f3f4f6);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.model-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-success {
  background: var(--success-bg, #dcfce7);
  color: var(--success-color, #166534);
}

.status-warning {
  background: var(--warning-bg, #fef3c7);
  color: var(--warning-color, #92400e);
}

.model-count {
  color: var(--text-secondary, #6b7280);
  font-size: 12px;
}

.model-list {
  margin-top: 12px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 6px;
  background: var(--card-bg, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e5e7eb);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.model-item:hover {
  background: var(--bg-secondary, #f9fafb);
  border-color: var(--primary-color, #3b82f6);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.model-item.model-selected {
  background: var(--primary-bg, #dbeafe);
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.model-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.model-name {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  display: flex;
  align-items: center;
  gap: 8px;
}

.selected-indicator {
  color: var(--primary-color, #3b82f6);
  font-weight: bold;
  font-size: 14px;
}

.model-selection-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary, #f3f4f6);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  border-left: 3px solid var(--primary-color, #3b82f6);
}

.setting-description {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.4;
}

.model-name {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  font-size: 13px;
}

.model-details {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.model-type {
  background: var(--primary-color, #3b82f6);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.model-size {
  color: var(--text-secondary, #6b7280);
}

.recommendations {
  margin-top: 12px;
}

.recommendation-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: var(--text-secondary, #6b7280);
  font-size: 12px;
  line-height: 1.5;
}

.recommendation-list li {
  margin-bottom: 4px;
}

.model-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

  .model-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .model-details {
    align-self: stretch;
    justify-content: space-between;
  }

  .model-actions {
    flex-direction: column;
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