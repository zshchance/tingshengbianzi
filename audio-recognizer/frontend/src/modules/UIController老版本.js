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
        if ((tab === 'original' && content.includes('[') && content.includes(']') && this.containsTimestamps(content)) ||
            (tab === 'subtitle' && content.includes('-->'))) {
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

        // 优先使用words数组的准确时间信息进行细颗粒度估算
        if (result.words && Array.isArray(result.words) && result.words.length > 0) {
            // 检查words数组是否包含准确的时间信息
            const hasValidTimeInfo = result.words.some(word => {
                const startTime = word.start !== undefined ? word.start : word.startTime;
                const endTime = word.end !== undefined ? word.end : word.endTime;
                return startTime !== undefined && endTime !== undefined;
            });

            if (hasValidTimeInfo) {
                // 使用准确的words时间信息生成细颗粒度时间戳
                return this.generateTimestampedText(result.words);
            }
        }

        // 如果没有准确的words时间信息，但文本包含时间戳，处理格式
        if (result.text && this.containsTimestamps(result.text)) {
            return this.formatOriginalTimestamps(result.text);
        }

        // 如果没有时间戳信息，返回普通文本
        return result.text || '';
    }

    /**
     * 生成时间戳标记文本
     * @param {Array} words - 词汇数组
     * @returns {string} 带时间戳的文本
     */
    generateTimestampedText(words) {
        if (!words || words.length === 0) return '';

        // 收集所有有完整时间信息的词汇
        const wordsWithTime = words.filter(word => {
            const startTime = word.start !== undefined ? word.start : word.startTime;
            const endTime = word.end !== undefined ? word.end : word.endTime;
            return startTime !== undefined && endTime !== undefined;
        });

        if (wordsWithTime.length === 0) {
            // 如果没有时间信息，直接返回文本
            return words.map(w => w.text || w.word).join(' ');
        }

        // 计算总时间和总字符数
        const totalStartTime = Math.min(...wordsWithTime.map(w => w.start !== undefined ? w.start : w.startTime));
        const totalEndTime = Math.max(...wordsWithTime.map(w => w.end !== undefined ? w.end : w.endTime));
        const totalDuration = totalEndTime - totalStartTime;

        // 计算总字符数（包括标点符号）
        const totalText = words.map(w => w.text || w.word).join('');
        const totalChars = this.countTextCharacters(totalText);

        // 计算平均语速（字符/秒）
        const avgCharsPerSecond = totalChars / totalDuration;

        // 使用新的时间估算算法
        return this.generateTextWithDynamicTiming(words, totalStartTime, avgCharsPerSecond);
    }

    /**
     * 使用动态语速生成带时间戳的文本（基于whisper准确时间范围）
     * @param {Array} words - 词汇数组
     * @param {number} baseStartTime - 基准开始时间
     * @param {number} charsPerSecond - 每秒字符数（语速）
     * @returns {string} 带时间戳的文本
     */
    generateTextWithDynamicTiming(words, baseStartTime, charsPerSecond) {
        const textLines = [];

        // 按照whisper的时间段进行分组
        const timeGroups = this.groupWordsByTimeRanges(words);

        timeGroups.forEach((group) => {
            if (group.words.length === 0) return;

            // 获取该组的准确时间范围
            const groupStartTime = group.startTime;
            const groupEndTime = group.endTime;
            const groupDuration = groupEndTime - groupStartTime;

            // 组合该组的文本
            const groupText = group.words.map(w => w.text || w.word).join('');

            // 按标点符号分割文本
            const segments = this.splitTextForTiming(groupText);

            // 在准确时间范围内分配细颗粒度时间
            const segmentTimestamps = this.distributeTimeWithinRange(
                segments, groupStartTime, groupEndTime
            );

            segments.forEach((segment, index) => {
                const trimmedSegment = segment.trim();

                // 跳过空段和纯标点符号段
                if (!trimmedSegment || this.isOnlyPunctuation(trimmedSegment)) {
                    return;
                }

                // 使用分配的时间戳
                const timestamp = this.formatTimestamp(segmentTimestamps[index]);
                textLines.push(`[${timestamp}] ${trimmedSegment}`);
            });
        });

        return textLines.join('\n');
    }

    /**
     * 按时间范围将词汇分组
     * @param {Array} words - 词汇数组
     * @returns {Array} 时间分组
     */
    groupWordsByTimeRanges(words) {
        const groups = [];
        let currentGroup = [];

        words.forEach((word) => {
            const wordText = word.text || word.word;
            const startTime = word.start !== undefined ? word.start : word.startTime;
            const endTime = word.end !== undefined ? word.end : word.endTime;

            if (startTime !== undefined && endTime !== undefined) {
                // 如果是连续的时间段，添加到当前组
                if (currentGroup.length === 0 ||
                    startTime - currentGroup[currentGroup.length - 1].endTime <= 1.0) {
                    currentGroup.push({
                        text: wordText,
                        startTime: startTime,
                        endTime: endTime
                    });
                } else {
                    // 时间间隔太大，开始新组
                    if (currentGroup.length > 0) {
                        const groupStartTime = Math.min(...currentGroup.map(w => w.startTime));
                        const groupEndTime = Math.max(...currentGroup.map(w => w.endTime));
                        groups.push({
                            words: currentGroup,
                            startTime: groupStartTime,
                            endTime: groupEndTime
                        });
                    }
                    currentGroup = [{
                        text: wordText,
                        startTime: startTime,
                        endTime: endTime
                    }];
                }
            } else {
                // 没有时间信息的词，添加到当前组
                currentGroup.push({
                    text: wordText,
                    startTime: null,
                    endTime: null
                });
            }
        });

        // 处理最后一组
        if (currentGroup.length > 0) {
            const validWords = currentGroup.filter(w => w.startTime !== null && w.endTime !== null);
            if (validWords.length > 0) {
                const groupStartTime = Math.min(...validWords.map(w => w.startTime));
                const groupEndTime = Math.max(...validWords.map(w => w.endTime));
                groups.push({
                    words: currentGroup,
                    startTime: groupStartTime,
                    endTime: groupEndTime
                });
            }
        }

        return groups;
    }

    /**
     * 在时间范围内分配细颗粒度时间戳
     * @param {Array} segments - 文本片段数组
     * @param {number} startTime - 开始时间
     * @param {number} endTime - 结束时间
     * @returns {Array} 分配的时间戳数组
     */
    distributeTimeWithinRange(segments, startTime, endTime) {
        const totalDuration = endTime - startTime;
        const timestamps = [];
        let currentTime = startTime;

        // 计算每个文本片段的字符权重
        const charWeights = segments.map(segment => {
            return this.countTextCharacters(segment.trim());
        });

        const totalChars = charWeights.reduce((sum, weight) => sum + weight, 0);

        // 如果没有字符，平均分配时间
        if (totalChars === 0) {
            const avgDuration = totalDuration / segments.length;
            for (let i = 0; i < segments.length; i++) {
                timestamps.push(startTime + (i * avgDuration));
            }
            return timestamps;
        }

        // 按字符权重分配时间
        segments.forEach((segment, index) => {
            const trimmedSegment = segment.trim();

            // 跳过空段和纯标点符号段
            if (!trimmedSegment || this.isOnlyPunctuation(trimmedSegment)) {
                timestamps.push(currentTime);
                return;
            }

            // 计算该片段的时间
            const segmentChars = charWeights[index];
            const segmentDuration = (segmentChars / totalChars) * totalDuration;

            timestamps.push(currentTime);
            currentTime += segmentDuration;

            // 为标点符号添加额外停顿时间（但要确保不超出总时间范围）
            const lastChar = trimmedSegment[trimmedSegment.length - 1];
            if ('，。！？；：、'.includes(lastChar) && currentTime < endTime - 0.1) {
                if ('。！？'.includes(lastChar)) {
                    currentTime += Math.min(0.5, endTime - currentTime - 0.1);
                } else if ('；：'.includes(lastChar)) {
                    currentTime += Math.min(0.3, endTime - currentTime - 0.1);
                } else {
                    currentTime += Math.min(0.2, endTime - currentTime - 0.1);
                }
            }
        });

        // 确保最后一个时间戳不超过结束时间
        if (timestamps[timestamps.length - 1] > endTime) {
            timestamps[timestamps.length - 1] = endTime;
        }

        return timestamps;
    }

    /**
     * 计算文本的字符数（中文算1个字符，英文单词算1个字符）
     * @param {string} text - 要计算的文本
     * @returns {number} 字符数
     */
    countTextCharacters(text) {
        let count = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 中文字符、标点符号、数字都算1个字符
            if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
                count += 1;
            }
            // 英文字母按单词计算
            else if (/[a-zA-Z]/.test(char)) {
                // 检查是否是一个新单词的开始
                if (i === 0 || !/[a-zA-Z]/.test(text[i-1])) {
                    // 找到完整单词
                    let wordEnd = i;
                    while (wordEnd < text.length && /[a-zA-Z]/.test(text[wordEnd])) {
                        wordEnd++;
                    }
                    count += 1; // 整个单词算1个字符单位
                    i = wordEnd - 1; // 跳过已经计算的字符
                }
            }
            // 其他字符（数字、空格等）适当计算
            else if (!/\s/.test(char)) {
                count += 0.5;
            }
        }

        return count;
    }

    /**
     * 为时间估算分割文本
     * @param {string} text - 要分割的文本
     * @returns {Array} 分割后的文本片段
     */
    splitTextForTiming(text) {
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

        // 合并过短的片段，但保持时间估算的精度
        return this.mergeVeryShortSegments(segments);
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
        if (!result) return '';

        // 优先使用words数组的准确时间信息
        if (result.words && Array.isArray(result.words) && result.words.length > 0) {
            // 检查words数组是否包含准确的时间信息
            const hasValidTimeInfo = result.words.some(word => {
                const startTime = word.start !== undefined ? word.start : word.startTime;
                const endTime = word.end !== undefined ? word.end : word.endTime;
                return startTime !== undefined && endTime !== undefined;
            });

            if (hasValidTimeInfo) {
                // 使用准确的words时间信息生成字幕格式
                return this.generateWordsSubtitleFormat(result.words);
            }
        }

        // 如果没有准确的words时间信息，但文本包含时间戳，转换为字幕格式
        if (result.text && this.containsTimestamps(result.text)) {
            return this.formatTimestampsToSubtitle(result.text);
        }

        // 否则返回普通文本
        return result.text || '';
    }

    /**
     * 将带时间戳的文本转换为字幕格式
     * @param {string} text - 包含时间戳的文本
     * @returns {string} 字幕格式文本
     */
    formatTimestampsToSubtitle(text) {
        // 首先将现有的时间戳格式统一处理
        const lines = text.split('\n');
        const segments = [];

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // 匹配时间戳格式
            const timestampMatch = trimmedLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*(.*)/);
            if (timestampMatch) {
                const [, timestamp, content] = timestampMatch;
                if (content && content.trim()) {
                    segments.push({
                        time: parseFloat(timestamp),
                        text: content.trim()
                    });
                }
            }
        });

        // 如果没有时间戳，按行分割
        if (segments.length === 0) {
            return text;
        }

        // 将segments按时间分组（每3-5秒一组）
        const subtitleSegments = this.groupSegmentsByTime(segments, 4.0);
        const subtitleLines = [];

        subtitleSegments.forEach((segment, index) => {
            if (segment.length === 0) return;

            const startTime = this.formatSRTTime(segment[0].time);
            const endTime = this.formatSRTTime(segment[segment.length - 1].time);
            const segmentText = segment.map(s => s.text).join(' ');

            subtitleLines.push(`${startTime} --> ${endTime}`);
            subtitleLines.push(segmentText);
            if (index < subtitleSegments.length - 1) {
                subtitleLines.push(''); // 最后一个不加空行
            }
        });

        return subtitleLines.join('\n').trim();
    }

    /**
     * 按时间将文本段落分组
     * @param {Array} segments - 文本段落数组
     * @param {number} duration - 每组时长（秒）
     * @returns {Array} 分组后的段落数组
     */
    groupSegmentsByTime(segments, duration = 4.0) {
        if (!segments || segments.length === 0) return [];

        const groups = [];
        let currentGroup = [];
        let groupStartTime = null;

        segments.forEach(segment => {
            if (groupStartTime === null) {
                groupStartTime = segment.time;
            }

            // 如果当前段落与组开始时间超过指定时长，开始新组
            if (segment.time - groupStartTime >= duration) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                groupStartTime = segment.time;
            }

            currentGroup.push(segment);
        });

        // 添加最后一个组
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    /**
     * 从words数组生成字幕格式
     * @param {Array} words - 词汇数组
     * @returns {string} 字幕格式文本
     */
    generateWordsSubtitleFormat(words) {
        const subtitleLines = [];

        // 将词汇按时间分组，每2-3秒一组作为一个字幕段落
        const segments = this.groupWordsByTime(words, 3.0); // 每3秒一组

        segments.forEach(segment => {
            if (segment.length > 0) {
                const startTime = segment[0].start !== undefined ? segment[0].start : segment[0].startTime;
                const endTime = segment[segment.length - 1].end !== undefined ? segment[segment.length - 1].end : segment[segment.length - 1].endTime;

                const srtStartTime = this.formatSRTTime(startTime);
                const srtEndTime = this.formatSRTTime(endTime);

                // 组合该段落的所有文本
                const segmentText = segment.map(word => word.text || word.word).join(' ');

                if (segmentText.trim()) {
                    subtitleLines.push(`${srtStartTime} --> ${srtEndTime}`);
                    subtitleLines.push(segmentText.trim());
                    subtitleLines.push(''); // 空行分隔
                }
            }
        });

        return subtitleLines.join('\n').trim();
    }

    /**
     * 按时间将词汇分组
     * @param {Array} words - 词汇数组
     * @param {number} duration - 每组时长（秒）
     * @returns {Array} 分组后的词汇数组
     */
    groupWordsByTime(words, duration = 3.0) {
        if (!words || words.length === 0) return [];

        const segments = [];
        let currentSegment = [];
        let segmentStartTime = null;

        words.forEach(word => {
            const startTime = word.start !== undefined ? word.start : word.startTime;

            if (segmentStartTime === null) {
                segmentStartTime = startTime;
            }

            // 如果当前词汇与段落开始时间超过指定时长，开始新段落
            if (startTime - segmentStartTime >= duration) {
                if (currentSegment.length > 0) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
                segmentStartTime = startTime;
            }

            currentSegment.push(word);
        });

        // 添加最后一个段落
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        return segments;
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
