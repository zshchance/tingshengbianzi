import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入样式
import './style.css'
import './app.css'

// 创建Vue应用
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 挂载应用
app.mount('#app')

// 关于弹窗事件处理
document.addEventListener('DOMContentLoaded', () => {
    const aboutBtn = document.getElementById('aboutBtn')
    const aboutModal = document.getElementById('aboutModal')
    const closeAboutModalBtn = document.getElementById('closeAboutModalBtn')
    const closeAboutBtn = document.getElementById('closeAboutBtn')

    // 打开关于弹窗
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            if (aboutModal) {
                aboutModal.style.display = 'flex'
            }
        })
    }

    // 关闭关于弹窗 (点击X按钮)
    if (closeAboutModalBtn) {
        closeAboutModalBtn.addEventListener('click', () => {
            if (aboutModal) {
                aboutModal.style.display = 'none'
            }
        })
    }

    // 关闭关于弹窗 (点击确定按钮)
    if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', () => {
            if (aboutModal) {
                aboutModal.style.display = 'none'
            }
        })
    }

    // 点击弹窗外部关闭
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.style.display = 'none'
            }
        })
    }

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal && aboutModal.style.display === 'flex') {
            aboutModal.style.display = 'none'
        }
    })
})