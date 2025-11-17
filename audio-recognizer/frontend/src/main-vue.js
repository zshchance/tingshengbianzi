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