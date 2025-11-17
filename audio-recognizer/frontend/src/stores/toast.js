import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let toastId = 0

  const addToast = (options) => {
    const id = ++toastId
    const toast = {
      id,
      title: options.title || '通知',
      message: options.message || '',
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 3000,
      closable: options.closable !== undefined ? options.closable : true,
      timestamp: Date.now()
    }

    toasts.value.push(toast)

    // 如果不是手动关闭的，自动移除
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  const removeToast = (id) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    toasts.value = []
  }

  // 便捷方法
  const showSuccess = (title, message = '', options = {}) => {
    return addToast({ title, message, type: 'success', ...options })
  }

  const showError = (title, message = '', options = {}) => {
    return addToast({ title, message, type: 'error', duration: 5000, ...options })
  }

  const showWarning = (title, message = '', options = {}) => {
    return addToast({ title, message, type: 'warning', ...options })
  }

  const showInfo = (title, message = '', options = {}) => {
    return addToast({ title, message, type: 'info', ...options })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
})