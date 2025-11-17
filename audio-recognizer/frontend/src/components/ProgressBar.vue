<template>
  <div v-if="visible" class="progress-section">
    <div class="progress-header">
      <h4>📊 识别进度</h4>
      <span class="progress-status">{{ status }}</span>
    </div>

    <div class="progress-bar-container">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${percentage}%` }"
        >
          <div class="progress-shine"></div>
        </div>
      </div>

      <div class="progress-text">
        <span class="progress-percent">{{ percentageText }}</span>
        <span class="progress-time">{{ formattedTime }}</span>
      </div>
    </div>

    <div v-if="showDetails" class="progress-details">
      <span class="processed-time">已处理: {{ formattedProcessedTime }}</span>
      <span class="remaining-time">剩余: {{ formattedRemainingTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 进度百分比 (0-100)
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100
  },
  // 是否显示进度条
  visible: {
    type: Boolean,
    default: false
  },
  // 状态文本
  status: {
    type: String,
    default: '准备中...'
  },
  // 当前时间（秒）
  currentTime: {
    type: Number,
    default: 0
  },
  // 总时长（秒）
  totalTime: {
    type: Number,
    default: 0
  },
  // 是否显示详细信息
  showDetails: {
    type: Boolean,
    default: true
  },
  // 是否显示动画效果
  animated: {
    type: Boolean,
    default: true
  }
})

// 计算属性
const percentage = computed(() => {
  return Math.round(props.progress)
})

const percentageText = computed(() => {
  return `${percentage.value}%`
})

const formattedTime = computed(() => {
  return formatTime(props.currentTime)
})

const formattedProcessedTime = computed(() => {
  return formatTime(props.currentTime)
})

const formattedRemainingTime = computed(() => {
  const remaining = Math.max(0, props.totalTime - props.currentTime)
  return formatTime(remaining)
})

// 时间格式化函数
const formatTime = (seconds) => {
  if (!seconds || seconds < 0) return '00:00'

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.progress-section {
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-color, #e5e7eb);
  margin: 20px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-header h4 {
  margin: 0;
  color: var(--text-primary, #1f2937);
  font-size: 16px;
  font-weight: 600;
}

.progress-status {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  font-weight: 500;
}

.progress-bar-container {
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  position: relative;
  transition: width 0.3s ease;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.progress-percent {
  font-weight: 600;
  color: var(--primary-color, #3b82f6);
  font-size: 14px;
}

.progress-time {
  color: var(--text-secondary, #6b7280);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.processed-time,
.remaining-time {
  font-variant-numeric: tabular-nums;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .progress-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

/* 动画效果 */
.progress-section {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .progress-section {
    background: var(--card-bg-dark, #1f2937);
    border-color: var(--border-color-dark, #374151);
  }

  .progress-header h4 {
    color: var(--text-primary-dark, #f9fafb);
  }

  .progress-status {
    color: var(--text-secondary-dark, #d1d5db);
  }

  .progress-bar {
    background: var(--bg-secondary-dark, #374151);
  }

  .progress-time {
    color: var(--text-secondary-dark, #d1d5db);
  }

  .progress-details {
    color: var(--text-muted-dark, #9ca3af);
    border-color: var(--border-color-dark, #374151);
  }
}
</style>