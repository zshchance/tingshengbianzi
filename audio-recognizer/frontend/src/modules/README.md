# 前端模块化架构说明

本目录包含了音频识别应用的前端模块化代码，旨在提高代码的可维护性、可扩展性和可测试性。

## 模块架构

### 1. AudioFileProcessor.js - 音频文件处理模块
**职责**：负责音频文件的验证、信息提取、格式化等功能

**主要功能**：
- 音频文件类型验证
- 文件信息提取（名称、大小、时长等）
- 音频时长计算
- 文件大小和时间格式化
- 支持的音频格式管理

**主要方法**：
- `validateAudioFile(file)` - 验证音频文件
- `processAudioFile(file)` - 处理音频文件
- `getAudioDuration(file)` - 获取音频时长
- `formatFileSize(bytes)` - 格式化文件大小
- `formatTime(seconds)` - 格式化时间

---

### 2. RecognitionManager.js - 语音识别管理模块
**职责**：负责语音识别的状态管理、结果处理、导出功能等

**主要功能**：
- 语音识别启动/停止控制
- 识别进度监控
- 识别结果处理和存储
- 结果导出（支持多种格式）
- AI优化提示生成
- 字幕格式转换

**主要方法**：
- `startRecognition(fileInfo, options)` - 开始识别
- `stopRecognition()` - 停止识别
- `exportResult(format, outputPath)` - 导出结果
- `generateAIOptimizedPrompt(result)` - 生成AI优化提示
- `copyResultToClipboard(type)` - 复制结果到剪贴板

---

### 3. SettingsManager.js - 设置管理模块
**职责**：负责应用配置的加载、保存、验证等功能

**主要功能**：
- 应用设置的管理（加载、保存、重置）
- 后端配置同步
- 设置验证
- 本地存储管理
- 设置变更监听

**主要方法**：
- `initialize()` - 初始化设置
- `getSetting(key, defaultValue)` - 获取设置值
- `setSetting(key, value, saveToBackend)` - 设置值
- `validateSetting(key, value)` - 验证设置值
- `loadModel(language, modelPath)` - 加载模型

**配置选项**：
- 基本设置：语言、模型路径
- 识别设置：采样率、置信度阈值
- 音频处理：归一化、降噪
- UI设置：主题、动画
- 导出设置：默认格式、输出目录

---

### 4. UIController.js - UI控制模块
**职责**：负责用户界面的控制、状态显示、动画效果等

**主要功能**：
- Toast提示系统
- 进度显示控制
- 文件信息显示
- 按钮状态管理
- 设置界面控制
- 结果展示控制

**主要方法**：
- `showToast(message, type, duration)` - 显示Toast提示
- `updateProgress(progress)` - 更新进度显示
- `displayFileInfo(fileInfo)` - 显示文件信息
- `enableStartButton()` / `disableStartButton()` - 按钮状态控制
- `openSettings()` / `closeSettings()` - 设置界面控制

---

### 5. EventHandler.js - 事件管理模块
**职责**：负责统一管理所有UI事件和Wails后端事件

**主要功能**：
- UI事件监听器管理
- Wails后端事件处理
- 事件处理器协调
- 模块间通信桥接

**主要方法**：
- `initEventListeners()` - 初始化事件监听器
- `handleFileSelect(event)` - 处理文件选择
- `handleStartRecognition()` - 处理开始识别
- `handleSaveSettings()` - 处理设置保存
- `setupWailsEvents()` - 设置Wails事件监听

**事件类型**：
- 文件操作事件
- 识别控制事件
- 设置管理事件
- 结果操作事件
- 拖拽操作事件

---

## 主入口文件

### main.js
**职责**：应用的主入口，负责协调各个模块的工作

**主要功能**：
- 模块实例化
- 模块依赖注入
- 应用生命周期管理
- 全局状态维护

**应用流程**：
1. 创建各个模块实例
2. 初始化设置
3. 创建事件处理器
4. 设置模块间回调
5. 初始化UI状态

---

## 模块间通信

### 回调机制
- RecognitionManager 通过回调函数通知进度、结果、错误和完成事件
- SettingsManager 通过监听器通知设置变更
- EventHandler 作为事件中心，协调各模块间的通信

### 状态共享
- 通过主应用实例 (window.audioApp) 共享文件和结果状态
- UIController 通过主应用实例获取当前状态信息

---

## 代码优势

### 1. **模块化设计**
- 每个模块职责单一，功能明确
- 降低代码耦合度，提高可维护性

### 2. **可测试性**
- 模块独立，便于单元测试
- 依赖注入，便于Mock测试

### 3. **可扩展性**
- 新功能可以独立模块形式添加
- 现有模块可以轻松扩展功能

### 4. **代码复用**
- 模块可以在其他项目中复用
- 减少重复代码编写

### 5. **错误处理**
- 集中的错误处理机制
- 更好的错误追踪和调试

---

## 开发指南

### 添加新功能
1. 确定功能归属的模块
2. 在对应模块中添加方法
3. 在EventHandler中添加事件处理
4. 更新主应用逻辑（如需要）

### 修改现有功能
1. 定位相关模块
2. 修改模块内部实现
3. 更新相关的事件处理
4. 测试功能完整性

### 调试技巧
1. 使用浏览器开发者工具查看控制台日志
2. 各模块都有详细的日志输出
3. 可以单独测试模块功能

---

## 注意事项

1. **模块依赖**：确保模块间的依赖关系正确
2. **事件监听**：及时移除不需要的事件监听器
3. **内存管理**：在应用销毁时清理资源
4. **错误处理**：所有异步操作都应有错误处理
5. **状态一致性**：确保UI状态与业务状态同步