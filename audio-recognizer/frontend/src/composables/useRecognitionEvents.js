/**
 * 语音识别事件监听逻辑
 * 从 App.vue 中提取出来的事件处理逻辑，用于减少主文件的复杂度
 */
import { ref } from 'vue'
import { EventsOn } from '../../wailsjs/runtime/runtime.js'
import {
  generateFineGrainedTimestampedText as generateEnhancedTimestamps,
  optimizeSpeedAnalysis,
  intelligentDeduplication
} from '../utils/fineGrainedTimestamps'
import {
  generateAIOptimizationPrompt as generateAIPrompt
} from '../utils/aiOptimizer'
import { formatTimestamp } from '../utils/timeFormatter'
import { DEDUPLICATION_CONFIG, FINE_GRAINED_TIMESTAMP_CONFIG } from '../constants/recognitionConstants'

/**
 * 语音识别事件管理的composable
 * @param {Object} options - 配置选项
 * @param {Ref<boolean>} options.isProcessing - 处理状态
 * @param {Ref<Object>} options.progressData - 进度数据
 * @param {Ref<Object>} options.recognitionResult - 识别结果
 * @param {Ref<boolean>} options.showResults - 是否显示结果
 * @param {Object} options.settings - 应用设置
 * @param {Function} options.toastStore - Toast存储
 * @returns {Object} 事件管理对象
 */
export function useRecognitionEvents({
  isProcessing,
  progressData,
  recognitionResult,
  showResults,
  settings,
  toastStore
}) {
  // 设置全局Wails事件监听器
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
    EventsOn('recognition_complete', async (response) => {
      console.log('🎯 全局完成事件:', response)
      isProcessing.value = false

      try {
        await handleRecognitionComplete(response)
      } catch (error) {
        console.error('❌ 处理识别完成事件时出错:', error)
        toastStore.showError('处理结果失败', error.message)
      }
    })

    // Wails原生文件拖放事件监听
    EventsOn('file-dropped', (data) => {
      console.log('🎯 Wails原生文件拖放事件:', data)
      // 返回事件数据供外部处理
      return data
    })

    // Wails原生文件拖放错误事件监听
    EventsOn('file-drop-error', (errorData) => {
      console.log('❌ Wails原生文件拖放错误:', errorData)
      toastStore.showError('文件拖放错误', errorData.message || errorData.error)
    })

    console.log('✅ 全局Wails事件监听器设置完成')
  }

  /**
   * 处理识别完成事件
   * @param {Object} response - 识别响应数据
   */
  const handleRecognitionComplete = async (response) => {
    // 记录完整的Whisper原始响应数据
    const completeWhisperResponse = {
      success: response.success,
      error: response.error,
      result: response.result ? {
        text: response.result.text,
        textLength: response.result.text ? response.result.text.length : 0,
        segments: response.result.segments,
        segmentCount: response.result.segments ? response.result.segments.length : 0,
        words: response.result.words,
        wordCount: response.result.words ? response.result.words.length : 0,
        duration: response.result.duration,
        language: response.result.language,
        // 记录所有可能的Whisper返回字段
        info: response.result.info,
        model: response.result.model,
        timestampedText: response.result.timestampedText,
        timestampedTextLength: response.result.timestampedText ? response.result.timestampedText.length : 0
      } : null,
      processingTime: response.processingTime,
      timestamp: new Date().toISOString()
    }

    // 记录完整的Whisper响应到控制台
    console.log('📊 Whisper完整响应:', completeWhisperResponse)
    console.log('📋 原始识别响应:', response)

    if (response.result && response.success) {
      await processRecognitionResult(response)

      // 更新UI状态
      recognitionResult.value = response.result
      showResults.value = true
      progressData.progress = 100
      progressData.status = '识别完成！'

      console.log('✅ 识别结果设置完成 - ResultDisplay 组件将显示:', {
        hasRecognitionResult: !!recognitionResult.value,
        showResults: showResults.value,
        textLength: response.result.text?.length || 0,
        segmentCount: response.result.segments?.length || 0,
        conditionMet: showResults.value && !!recognitionResult.value
      })

      toastStore.showSuccess('识别完成', '音频识别已成功完成')

      // 记录识别完成到控制台
      console.log('🎉 识别完成:', {
        textLength: response.result.text?.length || 0,
        segmentCount: response.result.segments?.length || 0,
        duration: response.result.duration,
        language: response.result.language
      })

      // 2秒后隐藏进度条
      setTimeout(() => {
        progressData.visible = false
      }, 2000)
    } else {
      toastStore.showError('识别失败', response.error?.message || '语音识别失败')
      progressData.visible = false
    }
  }

  /**
   * 处理识别结果数据
   * @param {Object} response - 识别响应
   */
  const processRecognitionResult = async (response) => {
    // 🔧 智能去重处理 - 针对长音频重复识别问题
    if (response.result.segments && response.result.segments.length > 0) {
      const originalSegmentsCount = response.result.segments.length

      // 应用智能去重算法
      const deduplicatedSegments = intelligentDeduplication(response.result.segments, DEDUPLICATION_CONFIG)

      // 替换原始segments为去重后的结果
      response.result.segments = deduplicatedSegments

      console.log(`🧠 智能去重完成: ${originalSegmentsCount} → ${deduplicatedSegments.length} (去除 ${originalSegmentsCount - deduplicatedSegments.length} 个重复片段)`)
    }

    // 修复：从去重后的segments生成text字段
    if (!response.result.text && response.result.segments && response.result.segments.length > 0) {
      response.result.text = response.result.segments
        .map(segment => segment.text)
        .filter(text => text && text.trim())
        .join(' ')
    }

    // 生成带细颗粒度时间戳的文本
    if (response.result.segments) {
      await generateTimestampedText(response.result)
    } else {
      console.warn('⚠️ 没有segments数据，无法生成细颗粒度时间戳')
    }

    // 生成AI优化结果（前端模板系统）
    if (response.result.timestampedText) {
      await generateAIOptimizationResult(response.result)
    } else {
      console.warn('⚠️ 没有时间戳文本，无法生成AI优化结果')
      response.result.aiOptimizationPrompt = '请先生成时间戳文本，然后才能进行AI优化。'
    }
  }

  /**
   * 生成细颗粒度时间戳文本
   * @param {Object} result - 识别结果
   */
  const generateTimestampedText = async (result) => {
    console.log('🎯 开始生成细颗粒度时间戳，segments:', result.segments.length, '个')

    // 优化语速分析
    const totalDuration = result.duration ||
      (result.segments[result.segments.length - 1]?.end || 0)
    const language = result.language || 'zh-CN'

    console.log('🔊 语速分析参数:', {
      totalDuration,
      language,
      segmentsCount: result.segments.length
    })

    // 后端返回的数据分析
    console.log('🔧 后端segments数量:', result.segments?.length || 0)
    console.log('🔧 后端result.text长度:', result.text?.length || 0)
    console.log('🔧 后端result.timestampedText长度:', result.timestampedText?.length || 0)
    console.log('🔧 segments预览:', JSON.stringify(result.segments?.slice(0, 2) || []))

    // 基于segments重建完整的时间戳文本
    let completeTimestampedText = ''
    if (result.segments && result.segments.length > 0) {
      const lines = result.segments.map((segment, index) => {
        const startTime = formatTimestamp(segment.start)
        const text = segment.text || ''
        return `${startTime} ${text}`
      })
      completeTimestampedText = lines.join('\n')
    }

    console.log('🔧 基于segments重建的完整时间戳文本长度:', completeTimestampedText.length)
    console.log('🔧 重建的文本预览:', completeTimestampedText.substring(0, 300))

    // 保存完整的时间戳文本供原始结果标签页使用
    result.originalTimestampedText = completeTimestampedText

    // 使用细颗粒度时间标记组件生成更精确的时间戳
    result.timestampedText = generateEnhancedTimestamps(
      result.segments,
      {
        ...FINE_GRAINED_TIMESTAMP_CONFIG,
        averageSpeed: optimizeSpeedAnalysis(
          result.segments.map(s => s.text).join(' '),
          totalDuration,
          language
        )
      }
    )

    console.log('🔧 前端细颗粒度时间戳文本长度:', result.timestampedText.length)
    console.log('🔧 细颗粒度时间戳文本预览:', result.timestampedText.substring(0, 300))

    console.log('✅ 细颗粒度时间戳生成完成:', {
      timestampedTextLength: result.timestampedText?.length || 0,
      hasTimestampedText: !!result.timestampedText,
      preview: result.timestampedText?.substring(0, 100) || '无内容'
    })

    console.log('⏱️ 细颗粒度处理完成:', {
      segmentCount: result.segments.length,
      totalDuration,
      language,
      preview: result.timestampedText?.substring(0, 100)
    })
  }

  /**
   * 生成AI优化结果
   * @param {Object} result - 识别结果
   */
  const generateAIOptimizationResult = async (result) => {
    console.log('🤖 开始生成AI优化结果（前端模板系统）')

    try {
      const templateKey = settings.value.aiTemplate || 'basic'
      console.log('🔧 使用AI模板类型:', templateKey)

      // 使用前端生成AI优化提示词
      const aiResult = await generateAIPrompt(templateKey, result)
      console.log('🔧 AI优化提示词生成完成，长度:', aiResult.prompt.length)

      if (aiResult.success) {
        result.aiOptimizationPrompt = aiResult.prompt
        console.log('✅ AI优化提示词生成完成')
      } else {
        throw new Error('AI优化提示词生成失败')
      }
    } catch (error) {
      console.error('❌ AI优化处理失败:', error)
      result.aiOptimizationPrompt = 'AI优化提示词生成失败: ' + error.message
    }
  }

  return {
    setupGlobalWailsEvents,
    handleRecognitionComplete,
    processRecognitionResult
  }
}