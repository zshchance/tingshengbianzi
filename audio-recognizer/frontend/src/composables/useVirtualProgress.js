/**
 * 虚拟进度管理 composable
 * 当后端不支持实时进度更新时，提供平滑的虚拟进度动画
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 虚拟进度管理的composable
 * @returns {Object} 虚拟进度管理对象
 */
export function useVirtualProgress() {
  // 虚拟进度状态
  const virtualProgress = ref(0)
  const isVirtualProgressActive = ref(false)
  const progressStage = ref('initializing') // initializing, processing, finalizing
  let progressInterval = null
  let startTime = null

  // 虚拟进度配置
  const VIRTUAL_PROGRESS_CONFIG = {
    // 初始阶段：0-30%，模拟引擎初始化
    initializing: {
      start: 0,
      end: 30,
      duration: 3000, // 3秒
      step: 2
    },
    // 处理阶段：30-85%，模拟音频处理
    processing: {
      start: 30,
      end: 85,
      duration: 8000, // 8秒
      step: 1.5
    },
    // 完成阶段：85-95%，模拟结果整理
    finalizing: {
      start: 85,
      end: 95,
      duration: 2000, // 2秒
      step: 1
    }
  }

  // 状态文本映射
  const statusTexts = computed(() => {
    switch (progressStage.value) {
      case 'initializing':
        return '请稍等，Whisper正在进行识别...'
      case 'processing':
        return '正在分析音频内容...'
      case 'finalizing':
        return '正在整理识别结果...'
      default:
        return '请稍等，Whisper正在进行识别...'
    }
  })

  /**
   * 启动虚拟进度
   */
  const startVirtualProgress = () => {
    console.log('🎯 启动虚拟进度动画')
    virtualProgress.value = 0
    progressStage.value = 'initializing'
    isVirtualProgressActive.value = true
    startTime = Date.now()

    runProgressStage('initializing')
  }

  /**
   * 运行特定进度阶段
   * @param {string} stage - 进度阶段
   */
  const runProgressStage = (stage) => {
    if (!isVirtualProgressActive.value) return

    const config = VIRTUAL_PROGRESS_CONFIG[stage]
    if (!config) return

    progressStage.value = stage
    console.log(`🎯 虚拟进度阶段: ${stage}, 目标: ${config.end}%`)

    const stepInterval = config.duration / ((config.end - config.start) / config.step)

    progressInterval = setInterval(() => {
      if (!isVirtualProgressActive.value) {
        clearInterval(progressInterval)
        return
      }

      virtualProgress.value += config.step

      // 检查是否需要进入下一阶段
      if (virtualProgress.value >= config.end) {
        virtualProgress.value = config.end
        clearInterval(progressInterval)

        // 进入下一个阶段
        if (stage === 'initializing') {
          setTimeout(() => runProgressStage('processing'), 500)
        } else if (stage === 'processing') {
          setTimeout(() => runProgressStage('finalizing'), 1000)
        } else if (stage === 'finalizing') {
          // 保持95%等待真实完成
          console.log('🎯 虚拟进度到达95%，等待真实完成')
        }
      }
    }, stepInterval)
  }

  /**
   * 完成虚拟进度（当真实完成时调用）
   */
  const completeVirtualProgress = () => {
    console.log('🎯 真实识别完成，完成虚拟进度')
    isVirtualProgressActive.value = false

    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }

    // 快速动画到100%
    const completeAnimation = setInterval(() => {
      if (virtualProgress.value >= 100) {
        virtualProgress.value = 100
        clearInterval(completeAnimation)
      } else {
        virtualProgress.value += 5
      }
    }, 100)
  }

  /**
   * 停止虚拟进度
   */
  const stopVirtualProgress = () => {
    console.log('🎯 停止虚拟进度')
    isVirtualProgressActive.value = false

    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }

    virtualProgress.value = 0
    progressStage.value = 'initializing'
  }

  /**
   * 重置虚拟进度
   */
  const resetVirtualProgress = () => {
    stopVirtualProgress()
    virtualProgress.value = 0
    progressStage.value = 'initializing'
  }

  /**
   * 获取当前状态文本
   */
  const getCurrentStatusText = () => {
    return statusTexts.value
  }

  /**
   * 获取当前进度值
   */
  const getCurrentProgress = () => {
    return Math.round(virtualProgress.value)
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stopVirtualProgress()
  })

  return {
    // 状态
    virtualProgress,
    isVirtualProgressActive,
    progressStage,
    statusTexts,

    // 方法
    startVirtualProgress,
    completeVirtualProgress,
    stopVirtualProgress,
    resetVirtualProgress,
    getCurrentStatusText,
    getCurrentProgress
  }
}