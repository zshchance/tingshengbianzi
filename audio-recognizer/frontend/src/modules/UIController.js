/**
 * UI控制模块
 * 负责用户界面的控制、状态显示、动画效果等
 */
export class UIController {
    constructor() {
        this.toastContainer = null;
        this.currentToast = null;
        this.initToastContainer();
        this.setupAnimations();
    }

    /**
     * 初始化Toast容器
     */
    initToastContainer() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * 设置动画效果
     */
    setupAnimations() {
        // 添加自定义CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

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

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }

            .toast {
                animation: slideIn 0.3s ease forwards;
            }

            .toast.removing {
                animation: slideOut 0.3s ease forwards;
            }

            .fade-in {
                animation: fadeIn 0.3s ease forwards;
            }

            .pulse {
                animation: pulse 2s ease infinite;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     * @param {string} type - 提示类型 (info, success, warning, error)
     * @param {number} duration - 显示时长（毫秒），0表示不自动消失
     * @returns {Object} Toast元素对象
     */
    showToast(message, type = 'info', duration = 3000) {
        // 如果已有Toast，先移除
        if (this.currentToast && duration > 0) {
            this.removeToast(this.currentToast);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // 添加图标
        const icon = this.getToastIcon(type);
        if (icon) {
            toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
        }

        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.removeToast(toast);
        toast.appendChild(closeBtn);

        this.toastContainer.appendChild(toast);
        this.currentToast = toast;

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * 获取Toast图标
     * @param {string} type - 提示类型
     * @returns {string} 图标HTML
     */
    getToastIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * 移除Toast
     * @param {Object} toast - Toast元素
     */
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            if (this.currentToast === toast) {
                this.currentToast = null;
            }
        }, 300);
    }

    /**
     * 更新应用状态
     * @param {string} status - 状态文本
     * @param {string} type - 状态类型 (ready, processing, error)
     */
    updateStatus(status, type = 'ready') {
        const statusElement = document.getElementById('appStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `status status-${type}`;
        }
    }

    /**
     * 更新模型状态
     * @param {Object} modelStatus - 模型状态信息
     */
    updateModelStatus(modelStatus) {
        const statusElement = document.getElementById('modelStatus');
        if (statusElement) {
            let statusText = '模型: 未知';

            if (modelStatus) {
                const serviceReady = modelStatus.serviceReady || false;
                const isRecognizing = modelStatus.isRecognizing || false;
                const supportedLanguages = modelStatus.supportedLanguages || [];

                if (serviceReady) {
                    statusText = isRecognizing ? '模型: 已加载 (识别中)' : '模型: 已加载';
                } else {
                    statusText = '模型: 未加载';
                }

                if (supportedLanguages.length > 0) {
                    statusText += ` (${supportedLanguages.length}种语言)`;
                }
            }

            statusElement.textContent = statusText;
        }
    }

    /**
     * 显示文件信息
     * @param {Object} fileInfo - 文件信息对象
     */
    displayFileInfo(fileInfo) {
        const fileInfoElement = document.getElementById('fileInfo');
        const fileNameElement = document.getElementById('fileName');
        const fileDurationElement = document.getElementById('fileDuration');
        const fileSizeElement = document.getElementById('fileSize');
        const fileFormatElement = document.getElementById('fileFormat');
        const fileDropZone = document.getElementById('fileDropZone');

        if (fileInfoElement) {
            // 隐藏文件上传框
            if (fileDropZone) {
                fileDropZone.style.display = 'none';
            }

            // 显示文件信息区域
            fileInfoElement.style.display = 'block';
            fileInfoElement.classList.add('fade-in');

            if (fileNameElement) {
                fileNameElement.textContent = fileInfo.name || '未知文件';
            }

            if (fileSizeElement) {
                fileSizeElement.textContent = `大小: ${fileInfo.formattedSize || '未知'}`;
            }

            if (fileFormatElement) {
                fileFormatElement.textContent = `格式: ${fileInfo.formattedType || '未知'}`;
            }

            if (fileDurationElement) {
                fileDurationElement.textContent = `时长: ${fileInfo.formattedDuration || '计算中...'}`;
            }
        }
    }

    /**
     * 隐藏文件信息
     */
    hideFileInfo() {
        const fileInfoElement = document.getElementById('fileInfo');
        const fileDropZone = document.getElementById('fileDropZone');

        // 隐藏文件信息区域
        if (fileInfoElement) {
            fileInfoElement.style.display = 'none';
        }

        // 重新显示文件上传框
        if (fileDropZone) {
            fileDropZone.style.display = 'block';
        }

        // 清空文件输入
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // 禁用开始按钮
        this.disableStartButton();

        // 清理当前文件状态
        if (window.audioApp) {
            window.audioApp.currentFile = null;
        }
    }

    /**
     * 启用开始按钮
     */
    enableStartButton() {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('disabled');
        }
    }

    /**
     * 禁用开始按钮
     */
    disableStartButton() {
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.classList.add('disabled');
        }
    }

    /**
     * 禁用控件（识别进行时）
     */
    disableControls() {
        // 禁用开始按钮
        this.disableStartButton();

        // 启用停止按钮
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.disabled = false;
            stopBtn.classList.remove('disabled');
        }

        // 禁用文件选择
        this.disableFileSelection();
    }

    /**
     * 启用控件（识别完成时）
     */
    enableControls() {
        // 根据是否有文件启用开始按钮
        const currentFile = this.getCurrentFile();
        if (currentFile) {
            this.enableStartButton();
        } else {
            this.disableStartButton();
        }

        // 禁用停止按钮
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.classList.add('disabled');
        }

        // 启用文件选择
        this.enableFileSelection();
    }

    /**
     * 禁用文件选择
     */
    disableFileSelection() {
        const selectBtn = document.getElementById('selectFileBtn');
        const dropZone = document.getElementById('fileDropZone');

        if (selectBtn) {
            selectBtn.disabled = true;
            selectBtn.classList.add('disabled');
        }

        if (dropZone) {
            dropZone.style.pointerEvents = 'none';
            dropZone.style.opacity = '0.5';
        }
    }

    /**
     * 启用文件选择
     */
    enableFileSelection() {
        const selectBtn = document.getElementById('selectFileBtn');
        const dropZone = document.getElementById('fileDropZone');

        if (selectBtn) {
            selectBtn.disabled = false;
            selectBtn.classList.remove('disabled');
        }

        if (dropZone) {
            dropZone.style.pointerEvents = 'auto';
            dropZone.style.opacity = '1';
        }
    }

    /**
     * 显示进度区域
     */
    showProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'block';
            progressSection.classList.add('fade-in');
        }
    }

    /**
     * 隐藏进度区域
     */
    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    /**
     * 更新进度
     * @param {Object} progress - 进度信息
     */
    updateProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressStatus = document.getElementById('progressStatus');
        const processedTime = document.getElementById('processedTime');
        const remainingTime = document.getElementById('remainingTime');

        if (progressFill) {
            progressFill.style.width = `${progress.percent || 0}%`;
        }

        if (progressPercent) {
            progressPercent.textContent = `${progress.percent || 0}%`;
        }

        if (progressStatus) {
            progressStatus.textContent = progress.status || '处理中...';
        }

        if (processedTime && progress.currentTime) {
            const seconds = Math.floor(progress.currentTime / 1000);
            processedTime.textContent = `已处理: ${this.formatTime(seconds)}`;
        }

        if (remainingTime && progress.totalTime && progress.currentTime) {
            const remaining = Math.floor((progress.totalTime - progress.currentTime) / 1000);
            remainingTime.textContent = `剩余: ${this.formatTime(remaining)}`;
        }
    }

    /**
     * 重置进度
     */
    resetProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressStatus = document.getElementById('progressStatus');
        const processedTime = document.getElementById('processedTime');
        const remainingTime = document.getElementById('remainingTime');

        if (progressFill) {
            progressFill.style.width = '0%';
        }

        if (progressPercent) {
            progressPercent.textContent = '0%';
        }

        if (progressStatus) {
            progressStatus.textContent = '准备就绪';
        }

        if (processedTime) {
            processedTime.textContent = '已处理: 00:00';
        }

        if (remainingTime) {
            remainingTime.textContent = '剩余: --:--';
        }
    }

    /**
     * 显示结果区域
     */
    showResults() {
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'block';
            resultSection.classList.add('fade-in');
        }
    }

    /**
     * 隐藏结果区域
     */
    hideResults() {
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
    }

    /**
     * 显示识别结果
     * @param {Object} result - 识别结果
     * @param {string} tab - 当前标签页
     */
    displayResults(result, tab = 'original') {
        this.showResults();
        this.updateResultDisplay(result, tab);
        this.switchTab(tab);
    }

    /**
     * 更新结果显示
     * @param {Object} result - 识别结果
     * @param {string} tab - 标签页
     */
    updateResultDisplay(result, tab) {
        const resultDisplay = document.getElementById('resultDisplay');
        if (!resultDisplay) return;

        let content = '';

        switch (tab) {
            case 'original':
                content = this.generateOriginalTextWithTimestamps(result);
                break;
            case 'ai':
                content = this.generateAIOptimizedText(result);
                break;
            case 'subtitle':
                content = this.generateSubtitleFormat(result);
                break;
            default:
                content = this.generateOriginalTextWithTimestamps(result);
        }

              // 检查是否为纯文本格式（包含时间戳的文本）
        if (tab === 'original' && content.includes('[') && content.includes(']') && this.containsTimestamps(content)) {
            // 纯文本显示，保持原始格式
            resultDisplay.style.whiteSpace = 'pre-wrap';
            resultDisplay.style.fontFamily = 'monospace';
            resultDisplay.style.fontSize = '14px';
            resultDisplay.style.lineHeight = '1.6';
            resultDisplay.textContent = content;
        } else {
            // HTML内容显示
            resultDisplay.style.whiteSpace = 'normal';
            resultDisplay.style.fontFamily = '';
            resultDisplay.style.fontSize = '';
            resultDisplay.style.lineHeight = '';
            resultDisplay.innerHTML = this.escapeHtml(content);
        }
    }

    /**
     * 生成带时间戳的原始文本
     * @param {Object} result - 识别结果
     * @returns {string} 带时间戳的文本
     */
    generateOriginalTextWithTimestamps(result) {
        if (!result) return '';

        // 生成精简的带时间戳的文本，不包含HTML标签
        let resultText = '';

        // 如果结果文本已经包含时间戳，处理格式并移除纯标点行
        if (result.text && this.containsTimestamps(result.text)) {
            resultText = this.formatOriginalTimestamps(result.text);
        }
        // 如果有words数组但没有时间戳，生成带时间戳的文本
        else if (result.words && Array.isArray(result.words) && result.words.length > 0) {
            // 每个时间标记独立一行
            resultText = this.generateTimestampedText(result.words);
        }
        // 如果没有时间戳信息，返回普通文本
        else {
            resultText = result.text || '';
        }

        return resultText;
    }

    /**
     * 生成时间戳标记文本
     * @param {Array} words - 词汇数组
     * @returns {string} 带时间戳的文本
     */
    generateTimestampedText(words) {
        const textLines = [];

        words.forEach((word) => {
            const wordText = word.text || word.word;
            if (wordText) {
                const startTime = word.start !== undefined ? word.start : word.startTime;
                if (startTime !== undefined) {
                    const timestamp = this.formatTimestamp(startTime);
                    // 按标点符号分割文本，每个部分独立一行
                    const segments = this.splitTextByPunctuation(wordText);
                    segments.forEach((segment, index) => {
                        if (segment.trim() && !this.isOnlyPunctuation(segment.trim())) {
                            // 为后续片段添加微小的偏移量
                            const segmentTime = startTime + (index * 0.1);
                            const segmentTimestamp = this.formatTimestamp(segmentTime);
                            textLines.push(`[${segmentTimestamp}] ${segment.trim()}`);
                        }
                    });
                } else {
                    // 没有时间戳的文本，如果不是纯标点符号则保留
                    if (!this.isOnlyPunctuation(wordText.trim())) {
                        textLines.push(wordText);
                    }
                }
            }
        });

        return textLines.join('\n');
    }

    /**
     * 按标点符号分割文本
     * @param {string} text - 要分割的文本
     * @returns {Array} 分割后的文本片段
     */
    splitTextByPunctuation(text) {
        const segments = [];
        let currentSegment = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const isPunctuation = '，。！？；：、…,.!?:;\'"'.includes(char);

            if (isPunctuation) {
                // 如果有当前内容，先保存
                if (currentSegment.trim()) {
                    segments.push(currentSegment.trim());
                }
                // 标点符号作为独立片段
                segments.push(char);
                currentSegment = '';
            } else {
                currentSegment += char;
            }
        }

        // 添加最后一段
        if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
        }

        // 合并过短的片段
        return this.mergeVeryShortSegments(segments);
    }

    /**
     * 合并过短的片段
     * @param {Array} segments - 文本片段数组
     * @returns {Array} 合并后的片段数组
     */
    mergeVeryShortSegments(segments) {
        if (segments.length <= 1) return segments;

        const merged = [];
        let i = 0;

        while (i < segments.length) {
            const current = segments[i];

            // 如果片段太短且不是标点符号，尝试与下一个片段合并
            if (current.length < 2 && !'，。！？；：、…,.!?:;\'"'.includes(current) && i + 1 < segments.length) {
                const next = segments[i + 1];
                if (!'，。！？；：、…,.!?:;\'"'.includes(next)) {
                    merged.push(current + next);
                    i += 2;
                    continue;
                }
            }

            merged.push(current);
            i++;
        }

        return merged;
    }

    /**
     * 格式化原始时间戳文本，转换为[]格式并移除纯标点行
     * @param {string} text - 包含时间戳的文本
     * @returns {string} 格式化后的文本
     */
    formatOriginalTimestamps(text) {
        // 按行分割文本
        const lines = text.split('\n');
        const formattedLines = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // 如果是空行，跳过
            if (!trimmedLine) {
                return;
            }

            // 检查是否包含时间戳
            const timestampMatch = trimmedLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*(.*)/);

            if (timestampMatch) {
                const [, timestamp, content] = timestampMatch;

                // 如果有内容且不只是标点符号，则添加格式化行
                if (content && content.trim() && !this.isOnlyPunctuation(content.trim())) {
                    formattedLines.push(`[${timestamp}] ${content.trim()}`);
                }
            } else {
                // 不包含时间戳的行，如果不是纯标点符号，则保留
                if (!this.isOnlyPunctuation(trimmedLine)) {
                    formattedLines.push(trimmedLine);
                }
            }
        });

        return formattedLines.join('\n');
    }

    /**
     * 检查文本是否只包含标点符号
     * @param {string} text - 要检查的文本
     * @returns {boolean} 是否只包含标点符号
     */
    isOnlyPunctuation(text) {
        const punctuationRegex = /^[，。！？；：、…,.!?:;'"()\[\]{}\/\\—–\s]*$/;
        return punctuationRegex.test(text);
    }

    /**
     * 格式化时间戳为 [HH:MM:SS.mmm] 格式
     * @param {number} seconds - 秒数
     * @returns {string} 格式化的时间戳
     */
    formatTimestamp(seconds) {
        if (seconds < 0) seconds = 0;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    /**
     * 检查文本是否包含时间戳
     * @param {string} text - 文本
     * @returns {boolean} 是否包含时间戳
     */
    containsTimestamps(text) {
        const timestampPattern = /\[\d{2}:\d{2}:\d{2}\.\d{3}\]/;
        return timestampPattern.test(text);
    }

    /**
     * 格式化包含时间戳的文本
     * @param {string} text - 包含时间戳的文本
     * @returns {string} 格式化后的HTML
     */
    formatTextWithTimestamps(text) {
        // 将时间戳高亮显示
        const timestampPattern = /\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/g;

        return text.replace(timestampPattern, (match, timestamp) => {
            return `<span class="timestamp-highlight" style="color: #007bff; font-weight: bold; font-family: monospace; background: #e7f3ff; padding: 2px 4px; border-radius: 3px;">[${timestamp}]</span>`;
        });
    }

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称
     */
    switchTab(tabName) {
        // 更新标签页按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // 更新结果显示内容
        const result = this.getCurrentRecognitionResult();
        if (result) {
            this.updateResultDisplay(result, tabName);
        }
    }

    /**
     * 打开设置模态框
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
        }
    }

    /**
     * 关闭设置模态框
     */
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 切换高级设置
     */
    toggleAdvancedSettings() {
        const advancedSettings = document.getElementById('advancedSettings');
        const toggleText = document.getElementById('advancedToggleText');
        const toggleIcon = document.getElementById('advancedToggleIcon');

        if (advancedSettings && toggleText && toggleIcon) {
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
    }

    /**
     * 设置拖拽区域状态
     * @param {boolean} isDragOver - 是否拖拽悬停
     */
    setDropZoneState(isDragOver) {
        const dropZone = document.getElementById('fileDropZone');
        if (dropZone) {
            if (isDragOver) {
                dropZone.classList.add('drag-over');
            } else {
                dropZone.classList.remove('drag-over');
            }
        }
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化时间
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) {
            return '00:00';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 生成AI优化文本
     * @param {Object} result - 识别结果
     * @returns {string} AI优化提示文本
     */
    generateAIOptimizedText(result) {
        if (!result || !result.text) {
            return '没有识别结果可用于优化';
        }

        return `请优化以下音频识别结果，要求：

1. 基础优化
   - 修正明显的错别字和语法错误
   - 优化断句和标点符号
   - 保持语义完整性和连贯性

2. 标记处理
   - 保留所有时间标记 [HH:MM:SS.mmm] 不变
   - 处理特殊标记：
     * 【强调】...【/强调】→ 保留并优化强调内容
     * 【不清:xxx】→ 根据上下文推测或标记为[听不清]
     * 【音乐】...【/音乐】→ 保留音乐片段标记
     * 【停顿·短/中/长】→ 转换为合适的标点符号

3. 内容优化
   - 修正专业术语和专有名词
   - 优化口语化表达
   - 保持原文语气和风格
   - 识别并标记重要信息

4. 输出格式
   - 保持原有时间标记格式
   - 使用规范的标点符号
   - 段落清晰，便于阅读

原始识别结果：
${result.text}

优化后的文本：`;
    }

    /**
     * 生成字幕格式
     * @param {Object} result - 识别结果
     * @returns {string} 字幕格式文本
     */
    generateSubtitleFormat(result) {
        if (!result || !result.words || !Array.isArray(result.words)) {
            return result.text || '';
        }

        // 生成SRT格式字幕
        let srtContent = '';
        result.words.forEach((word, index) => {
            const wordText = word.text || word.word;
            if (wordText && ((word.start !== undefined && word.end !== undefined) ||
                           (word.startTime !== undefined && word.endTime !== undefined))) {

                const startTime = word.start !== undefined ? word.start : word.startTime;
                const endTime = word.end !== undefined ? word.end : word.endTime;

                const srtStartTime = this.formatSRTTime(startTime);
                const srtEndTime = this.formatSRTTime(endTime);

                srtContent += `${index + 1}\n`;
                srtContent += `${srtStartTime} --> ${srtEndTime}\n`;
                srtContent += `${wordText}\n\n`;
            }
        });

        // 如果没有SRT内容，返回带时间戳的文本
        if (!srtContent && result.text) {
            // 如果文本包含时间戳，直接返回
            if (this.containsTimestamps(result.text)) {
                return result.text;
            }

            // 否则生成简单的字幕格式
            const words = result.text.split(' ');
            words.forEach((word, index) => {
                srtContent += `${index + 1}\n`;
                srtContent += `00:00:00,000 --> 00:00:02,000\n`;
                srtContent += `${word}\n\n`;
            });
        }

        return srtContent.trim() || result.text || '';
    }

    /**
     * 格式化SRT时间
     * @param {number} seconds - 秒数
     * @returns {string} SRT时间格式
     */
    formatSRTTime(seconds) {
        if (seconds < 0) seconds = 0;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * 获取当前文件信息（需要外部实现）
     * @returns {Object|null} 当前文件信息
     */
    getCurrentFile() {
        // 这个方法需要从外部获取当前文件信息
        return window.audioApp?.currentFile || null;
    }

    /**
     * 获取当前识别结果（需要外部实现）
     * @returns {Object|null} 当前识别结果
     */
    getCurrentRecognitionResult() {
        // 这个方法需要从外部获取当前识别结果
        return window.audioApp?.recognitionResult || null;
    }

    /**
     * 更新设置界面
     * @param {Object} settings - 设置对象
     */
    updateSettingsUI(settings) {
        // 更新语言选择
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && settings.language) {
            languageSelect.value = settings.language;
        }

        // 更新置信度滑块
        const confidenceSlider = document.getElementById('confidenceThreshold');
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceSlider && confidenceValue && settings.confidenceThreshold !== undefined) {
            confidenceSlider.value = settings.confidenceThreshold;
            confidenceValue.textContent = settings.confidenceThreshold;
        }

        // 更新其他设置项...
        // 这里可以根据需要添加更多设置项的UI更新
    }

    /**
     * 从设置界面获取设置
     * @returns {Object} 设置对象
     */
    getSettingsFromUI() {
        return {
            language: document.getElementById('languageSelect')?.value || 'zh-CN',
            confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold')?.value || 0.5),
            sampleRate: parseInt(document.getElementById('sampleRateSelect')?.value || 16000),
            enableNormalization: document.getElementById('enableNormalization')?.checked || false,
            enableNoiseReduction: document.getElementById('enableNoiseReduction')?.checked || false,
            enableWordTimestamp: document.getElementById('enableWordTimestamp')?.checked !== false,
            modelPath: document.getElementById('modelPath')?.value || './models'
        };
    }
}