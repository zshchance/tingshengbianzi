import './style.css';
import './app.css';

// 导入Wails运行时
import {EventsOn} from '../wailsjs/runtime/runtime';

// 应用状态管理
class AudioRecognizerApp {
    constructor() {
        this.currentFile = null;
        this.isRecognizing = false;
        this.recognitionProgress = 0;
        this.recognitionResult = null;
        this.appSettings = {
            language: 'zh-CN',
            modelPath: './models',
            enableAdvancedSettings: false
        };

        this.initializeEventListeners();
        this.loadDefaultSettings();
        this.updateUI();
    }

    // 初始化事件监听器
    initializeEventListeners() {
        // 文件相关事件
        this.addEventListener('selectFileBtn', 'click', () => this.selectFile());
        this.addEventListener('fileInput', 'change', (e) => this.handleFileSelect(e));
        this.addEventListener('clearFileBtn', 'click', () => this.clearFile());

        // 文件拖拽事件
        const dropZone = document.getElementById('fileDropZone');
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        dropZone.addEventListener('click', () => this.selectFile());

        // 控制按钮事件
        this.addEventListener('startBtn', 'click', () => this.startRecognition());
        this.addEventListener('stopBtn', 'click', () => this.stopRecognition());
        this.addEventListener('resetBtn', 'click', () => this.resetApplication());

        // 设置相关事件
        this.addEventListener('settingsBtn', 'click', () => this.openSettings());
        this.addEventListener('toggleAdvancedBtn', 'click', () => this.toggleAdvancedSettings());
        this.addEventListener('closeModalBtn', 'click', () => this.closeSettings());
        this.addEventListener('cancelSettingsBtn', 'click', () => this.closeSettings());
        this.addEventListener('saveSettingsBtn', 'click', () => this.saveSettings());

        // 识别设置事件
        this.addEventListener('languageSelect', 'change', (e) => {
            this.appSettings.language = e.target.value;
        });

        // 置信度滑块事件
        const confidenceSlider = document.getElementById('confidenceThreshold');
        const confidenceValue = document.getElementById('confidenceValue');
        confidenceSlider.addEventListener('input', (e) => {
            confidenceValue.textContent = e.target.value;
        });

        // 结果标签页事件
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // 结果操作事件
        this.addEventListener('copyOriginalBtn', 'click', () => this.copyOriginalResult());
        this.addEventListener('copyAIBtn', 'click', () => this.copyAIResult());
        this.addEventListener('exportBtn', 'click', () => this.exportResult());

        // 模型浏览事件
        this.addEventListener('browseModelBtn', 'click', () => this.browseModelPath());

        // 监听Wails事件
        this.setupWailsEvents();
    }

    // 便捷的事件监听器添加方法
    addEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    // 设置Wails事件监听
    setupWailsEvents() {
        // 监听后端事件
        EventsOn('recognition_progress', (progress) => {
            this.updateProgress(progress);
        });

        EventsOn('recognition_result', (result) => {
            this.handleRecognitionResult(result);
        });

        EventsOn('recognition_error', (error) => {
            this.handleRecognitionError(error);
        });

        EventsOn('recognition_complete', () => {
            this.handleRecognitionComplete();
        });
    }

    // 加载默认设置
    async loadDefaultSettings() {
        try {
            // 这里将来可以调用后端API加载保存的设置
            this.updateModelStatus();
            this.showToast('应用初始化完成', 'success');
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // 文件选择
    async selectFile() {
        const fileInput = document.getElementById('fileInput');
        fileInput.click();
    }

    // 处理文件选择
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processAudioFile(file);
        }
    }

    // 处理拖拽
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('drag-over');
    }

    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            await this.processAudioFile(files[0]);
        }
    }

    // 处理音频文件
    async processAudioFile(file) {
        try {
            // 验证文件类型
            if (!file.type.startsWith('audio/')) {
                this.showToast('请选择有效的音频文件', 'error');
                return;
            }

            this.currentFile = file;
            this.displayFileInfo(file);
            this.enableStartButton();
            this.showToast(`已选择文件: ${file.name}`, 'success');

        } catch (error) {
            console.error('处理文件失败:', error);
            this.showToast('文件处理失败', 'error');
        }
    }

    // 显示文件信息
    displayFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileDuration = document.getElementById('fileDuration');
        const fileSize = document.getElementById('fileSize');
        const fileFormat = document.getElementById('fileFormat');

        fileName.textContent = file.name;
        fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
        fileFormat.textContent = `格式: ${file.type}`;
        fileDuration.textContent = '时长: 计算中...';

        fileInfo.style.display = 'block';

        // 尝试获取音频时长
        this.getAudioDuration(file);
    }

    // 获取音频时长
    getAudioDuration(file) {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            const fileDuration = document.getElementById('fileDuration');
            fileDuration.textContent = `时长: ${this.formatTime(duration)}`;
        });
        audio.src = URL.createObjectURL(file);
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 格式化时间
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // 清除文件
    clearFile() {
        this.currentFile = null;
        const fileInfo = document.getElementById('fileInfo');
        const fileInput = document.getElementById('fileInput');

        fileInfo.style.display = 'none';
        fileInput.value = '';
        this.disableStartButton();
        this.showToast('文件已清除', 'info');
    }

    // 启用开始按钮
    enableStartButton() {
        const startBtn = document.getElementById('startBtn');
        startBtn.disabled = false;
    }

    // 禁用开始按钮
    disableStartButton() {
        const startBtn = document.getElementById('startBtn');
        startBtn.disabled = true;
    }

    // 开始识别
    async startRecognition() {
        if (!this.currentFile || this.isRecognizing) {
            return;
        }

        try {
            this.isRecognizing = true;
            this.showProgress();
            this.disableControls();
            this.updateStatus('正在识别...');

            // 这里将来调用后端识别API
            // await this.backend.startRecognition(this.currentFile, this.getRecognitionOptions());

            // 模拟识别过程
            this.simulateRecognition();

        } catch (error) {
            console.error('开始识别失败:', error);
            this.handleRecognitionError(error);
        }
    }

    // 停止识别
    async stopRecognition() {
        if (!this.isRecognizing) {
            return;
        }

        try {
            this.isRecognizing = false;
            this.updateStatus('正在停止...');
            this.hideProgress();
            this.enableControls();

            // 这里将来调用后端停止API
            // await this.backend.stopRecognition();

            this.showToast('识别已停止', 'info');
            this.updateStatus('就绪');

        } catch (error) {
            console.error('停止识别失败:', error);
            this.showToast('停止识别失败', 'error');
        }
    }

    // 重置应用
    resetApplication() {
        this.currentFile = null;
        this.isRecognizing = false;
        this.recognitionProgress = 0;
        this.recognitionResult = null;

        // 清除UI状态
        this.clearFile();
        this.hideProgress();
        this.hideResults();
        this.enableControls();
        this.updateStatus('就绪');

        // 重置进度条
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = '0%';

        this.showToast('应用已重置', 'info');
    }

    // 模拟识别过程（临时，实际会调用后端）
    simulateRecognition() {
        let progress = 0;
        const interval = setInterval(() => {
            if (!this.isRecognizing || progress >= 100) {
                clearInterval(interval);
                if (progress >= 100) {
                    this.handleRecognitionComplete();
                }
                return;
            }

            progress += Math.random() * 10;
            progress = Math.min(progress, 100);
            this.updateProgress({
                percent: Math.round(progress),
                currentTime: progress * this.currentFile.size / 100,
                totalTime: this.currentFile.size,
                status: '正在识别中...'
            });
        }, 500);
    }

    // 更新进度
    updateProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressStatus = document.getElementById('progressStatus');
        const processedTime = document.getElementById('processedTime');
        const remainingTime = document.getElementById('remainingTime');

        progressFill.style.width = `${progress.percent}%`;
        progressPercent.textContent = `${progress.percent}%`;
        progressStatus.textContent = progress.status;

        if (progress.currentTime) {
            processedTime.textContent = `已处理: ${this.formatTime(progress.currentTime / 1000)}`;
        }

        if (progress.totalTime && progress.currentTime) {
            const remaining = (progress.totalTime - progress.currentTime) / 1000;
            remainingTime.textContent = `剩余: ${this.formatTime(remaining)}`;
        }
    }

    // 显示进度区域
    showProgress() {
        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'block';
    }

    // 隐藏进度区域
    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'none';
    }

    // 处理识别完成
    handleRecognitionComplete() {
        this.isRecognizing = false;
        this.hideProgress();
        this.enableControls();
        this.updateStatus('识别完成');

        // 模拟识别结果
        const mockResult = {
            text: `[00:00:01.230] 大家好，欢迎使用音频识别工具\n[00:00:03.456] 这是一个跨平台的语音转文字应用\n[00:00:06.789] 支持多种音频格式识别\n[00:00:09.012] 【音乐】背景音乐播放中【/音乐】\n[00:00:12.345] 感谢您的使用`,
            duration: 12.345,
            confidence: 0.95,
            language: this.appSettings.language
        };

        this.recognitionResult = mockResult;
        this.displayResults(mockResult);
        this.showToast('识别完成！', 'success');
    }

    // 显示结果
    displayResults(result) {
        const resultSection = document.getElementById('resultSection');
        const resultDisplay = document.getElementById('resultDisplay');

        resultSection.style.display = 'block';
        resultDisplay.innerHTML = this.escapeHtml(result.text);
    }

    // 隐藏结果
    hideResults() {
        const resultSection = document.getElementById('resultSection');
        resultSection.style.display = 'none';
    }

    // 处理识别错误
    handleRecognitionError(error) {
        this.isRecognizing = false;
        this.hideProgress();
        this.enableControls();
        this.updateStatus('识别出错');
        this.showToast(`识别失败: ${error.message || error}`, 'error');
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签页按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新结果显示内容
        this.updateResultDisplay(tabName);
    }

    // 更新结果显示
    updateResultDisplay(tabName) {
        if (!this.recognitionResult) {
            return;
        }

        const resultDisplay = document.getElementById('resultDisplay');
        let content = '';

        switch (tabName) {
            case 'original':
                content = this.recognitionResult.text;
                break;
            case 'ai':
                content = this.generateAIOptimizedText(this.recognitionResult);
                break;
            case 'subtitle':
                content = this.generateSubtitleFormat(this.recognitionResult);
                break;
        }

        resultDisplay.innerHTML = this.escapeHtml(content);
    }

    // 生成AI优化文本
    generateAIOptimizedText(result) {
        return `请优化以下音频识别结果：

要求：
1. 修正明显的错别字和语法错误
2. 优化断句和标点符号
3. 保留所有时间标记 [HH:MM:SS.mmm] 不变
4. 处理特殊标记：
   - 【不清:xxx】→ 根据上下文推测或标记为[听不清]
   - 【音乐】...【/音乐】→ 保留音乐片段标记

原始识别结果：
${result.text}

优化后的文本：`;
    }

    // 生成字幕格式
    generateSubtitleFormat(result) {
        return result.text
            .replace(/\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/g, '$1:$2:$3,$4')
            .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) (.+)/g, '$1:$2:$3,$4\n$5\n');
    }

    // 复制原始结果
    async copyOriginalResult() {
        if (!this.recognitionResult) {
            this.showToast('没有可复制的结果', 'warning');
            return;
        }

        try {
            await this.copyToClipboard(this.recognitionResult.text);
            this.showToast('原始结果已复制到剪贴板', 'success');
        } catch (error) {
            this.showToast('复制失败', 'error');
        }
    }

    // 复制AI结果
    async copyAIResult() {
        if (!this.recognitionResult) {
            this.showToast('没有可复制的结果', 'warning');
            return;
        }

        try {
            const aiText = this.generateAIOptimizedText(this.recognitionResult);
            await this.copyToClipboard(aiText);
            this.showToast('AI优化提示已复制到剪贴板', 'success');
        } catch (error) {
            this.showToast('复制失败', 'error');
        }
    }

    // 导出结果
    async exportResult() {
        if (!this.recognitionResult) {
            this.showToast('没有可导出的结果', 'warning');
            return;
        }

        try {
            // 这里将来调用后端导出API
            // await this.backend.exportResult(this.recognitionResult, format);
            this.showToast('导出功能开发中...', 'info');
        } catch (error) {
            this.showToast('导出失败', 'error');
        }
    }

    // 复制到剪贴板
    async copyToClipboard(text) {
        await navigator.clipboard.writeText(text);
    }

    // 打开设置
    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'flex';
    }

    // 关闭设置
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'none';
    }

    // 切换高级设置
    toggleAdvancedSettings() {
        const advancedSettings = document.getElementById('advancedSettings');
        const toggleText = document.getElementById('advancedToggleText');
        const toggleIcon = document.getElementById('advancedToggleIcon');

        if (advancedSettings.style.display === 'none') {
            advancedSettings.style.display = 'block';
            toggleText.textContent = '隐藏高级设置';
            toggleIcon.textContent = '▲';
        } else {
            advancedSettings.style.display = 'none';
            toggleText.textContent = '显示高级设置';
            toggleIcon.textContent = '▼';
        }
    }

    // 保存设置
    saveSettings() {
        // 这里将来调用后端API保存设置
        this.showToast('设置已保存', 'success');
        this.closeSettings();
    }

    // 浏览模型路径
    async browseModelPath() {
        // 这里将来调用后端API打开文件夹选择对话框
        this.showToast('文件夹选择功能开发中...', 'info');
    }

    // 禁用控件
    disableControls() {
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        this.disableFileSelection();
    }

    // 启用控件
    enableControls() {
        document.getElementById('startBtn').disabled = !this.currentFile;
        document.getElementById('stopBtn').disabled = true;
        this.enableFileSelection();
    }

    // 禁用文件选择
    disableFileSelection() {
        document.getElementById('selectFileBtn').disabled = true;
        document.getElementById('fileDropZone').style.pointerEvents = 'none';
        document.getElementById('fileDropZone').style.opacity = '0.5';
    }

    // 启用文件选择
    enableFileSelection() {
        document.getElementById('selectFileBtn').disabled = false;
        document.getElementById('fileDropZone').style.pointerEvents = 'auto';
        document.getElementById('fileDropZone').style.opacity = '1';
    }

    // 更新状态
    updateStatus(status) {
        document.getElementById('appStatus').textContent = status;
    }

    // 更新模型状态
    updateModelStatus() {
        const modelStatus = document.getElementById('modelStatus');
        modelStatus.textContent = `模型: ${this.appSettings.language}`;
    }

    // 更新UI
    updateUI() {
        this.updateStatus('就绪');
        this.updateModelStatus();
    }

    // 显示Toast提示
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // 自动移除Toast
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取识别选项
    getRecognitionOptions() {
        return {
            language: document.getElementById('languageSelect').value,
            sampleRate: parseInt(document.getElementById('sampleRateSelect').value),
            enableNormalization: document.getElementById('enableNormalization').checked,
            enableNoiseReduction: document.getElementById('enableNoiseReduction').checked,
            enableWordTimestamp: document.getElementById('enableWordTimestamp').checked,
            confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value),
            modelPath: document.getElementById('modelPath').value
        };
    }
}

// 添加Toast离开动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.audioApp = new AudioRecognizerApp();
    console.log('Audio Recognizer 应用已启动');
});
