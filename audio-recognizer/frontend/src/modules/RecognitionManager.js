/**
 * 语音识别管理模块
 * 负责语音识别的状态管理、结果处理、导出功能等
 */
import {StartRecognition, StopRecognition, GetRecognitionStatus, ExportResult} from '../../wailsjs/go/main/App.js';

export class RecognitionManager {
    constructor() {
        this.isRecognizing = false;
        this.currentResult = null;
        this.progressCallback = null;
        this.resultCallback = null;
        this.errorCallback = null;
        this.completeCallback = null;

        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 这里会由EventHandler模块统一处理Wails事件
    }

    /**
     * 设置识别进度回调
     * @param {Function} callback - 进度回调函数
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * 设置识别结果回调
     * @param {Function} callback - 结果回调函数
     */
    setResultCallback(callback) {
        this.resultCallback = callback;
    }

    /**
     * 设置识别错误回调
     * @param {Function} callback - 错误回调函数
     */
    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    /**
     * 设置识别完成回调
     * @param {Function} callback - 完成回调函数
     */
    setCompleteCallback(callback) {
        this.completeCallback = callback;
    }

    /**
     * 开始语音识别
     * @param {Object} fileInfo - 文件信息
     * @param {Object} options - 识别选项
     * @returns {Promise<Object>} 识别启动结果
     */
    async startRecognition(fileInfo, options = {}) {
        if (this.isRecognizing) {
            throw new Error('语音识别正在进行中');
        }

        if (!fileInfo) {
            throw new Error('请先选择音频文件');
        }

        try {
            this.isRecognizing = true;

            // 构建识别请求
            const recognitionRequest = {
                filePath: fileInfo.path || fileInfo.name,
                language: options.language || 'zh-CN',
                options: this.buildRecognitionOptions(options)
            };

            console.log('启动语音识别:', recognitionRequest);

            // 调用后端识别API
            const result = await StartRecognition(recognitionRequest);

            if (result.success) {
                console.log('语音识别已启动');
                return { success: true, message: '语音识别已开始' };
            } else {
                throw new Error(result.error?.message || '启动语音识别失败');
            }

        } catch (error) {
            this.isRecognizing = false;
            console.error('开始识别失败:', error);
            throw new Error(`识别失败: ${error.message}`);
        }
    }

    /**
     * 停止语音识别
     * @returns {Promise<Object>} 停止结果
     */
    async stopRecognition() {
        if (!this.isRecognizing) {
            return { success: true, message: '没有正在进行的识别' };
        }

        try {
            console.log('停止语音识别...');

            const result = await StopRecognition();

            if (result.success) {
                console.log('语音识别已停止');
                this.isRecognizing = false;
                return { success: true, message: '识别已停止' };
            } else {
                throw new Error(result.error?.message || '停止识别失败');
            }

        } catch (error) {
            console.error('停止识别失败:', error);
            throw new Error(`停止失败: ${error.message}`);
        } finally {
            this.isRecognizing = false;
        }
    }

    /**
     * 获取识别状态
     * @returns {Promise<Object>} 识别状态
     */
    async getRecognitionStatus() {
        try {
            const status = await GetRecognitionStatus();
            return {
                isRecognizing: status.isRecognizing || false,
                serviceReady: status.serviceReady || false,
                supportedLanguages: status.supportedLanguages || []
            };
        } catch (error) {
            console.error('获取识别状态失败:', error);
            return {
                isRecognizing: false,
                serviceReady: false,
                supportedLanguages: []
            };
        }
    }

    /**
     * 构建识别选项
     * @param {Object} options - 用户提供的选项
     * @returns {Object} 完整的识别选项
     */
    buildRecognitionOptions(options = {}) {
        return {
            language: options.language || 'zh-CN',
            sampleRate: options.sampleRate || 16000,
            enableNormalization: options.enableNormalization !== false,
            enableNoiseReduction: options.enableNoiseReduction || false,
            enableWordTimestamp: options.enableWordTimestamp !== false,
            confidenceThreshold: options.confidenceThreshold || 0.5,
            modelPath: options.modelPath || './models',
            maxAlternatives: options.maxAlternatives || 1,
            bufferSize: options.bufferSize || 4000
        };
    }

    /**
     * 处理识别进度更新
     * @param {Object} progress - 进度信息
     */
    handleProgressUpdate(progress) {
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }

    /**
     * 处理识别结果
     * @param {Object} result - 识别结果
     */
    handleRecognitionResult(result) {
        this.currentResult = result;
        console.log('收到识别结果:', result);

        if (this.resultCallback) {
            this.resultCallback(result);
        }
    }

    /**
     * 处理识别错误
     * @param {Object} error - 错误信息
     */
    handleRecognitionError(error) {
        console.error('识别过程出错:', error);
        this.isRecognizing = false;

        if (this.errorCallback) {
            this.errorCallback(error);
        }
    }

    /**
     * 处理识别完成
     * @param {Object} result - 完成结果
     */
    handleRecognitionComplete(result) {
        console.log('识别完成:', result);
        this.isRecognizing = false;

        // 如果有结果数据，处理结果
        if (result && result.success && result.result) {
            this.currentResult = result.result;
            if (this.resultCallback) {
                this.resultCallback(result.result);
            }
        }

        if (this.completeCallback) {
            this.completeCallback(result);
        }
    }

    /**
     * 导出识别结果
     * @param {string} format - 导出格式 (txt, srt, vtt, json)
     * @param {string} outputPath - 输出路径
     * @returns {Promise<Object>} 导出结果
     */
    async exportResult(format = 'txt', outputPath = '') {
        if (!this.currentResult) {
            throw new Error('没有可导出的识别结果');
        }

        try {
            // 如果没有指定输出路径，使用默认路径
            if (!outputPath) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const extension = format;
                outputPath = `recognition_result_${timestamp}.${extension}`;
            }

            // 将结果对象序列化为JSON字符串
            const resultJSON = JSON.stringify(this.currentResult);

            console.log('导出识别结果:', { format, outputPath });

            const result = await ExportResult(resultJSON, format, outputPath);

            if (result.success) {
                console.log('导出成功:', outputPath);
                return { success: true, path: outputPath };
            } else {
                throw new Error(result.error?.message || '导出失败');
            }

        } catch (error) {
            console.error('导出失败:', error);
            throw new Error(`导出失败: ${error.message}`);
        }
    }

    /**
     * 生成AI优化提示文本
     * @param {Object} result - 识别结果
     * @returns {string} AI优化提示
     */
    generateAIOptimizedPrompt(result) {
        if (!result || !result.text) {
            return '没有识别结果可用于优化';
        }

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

    /**
     * 生成字幕格式文本
     * @param {Object} result - 识别结果
     * @param {string} format - 字幕格式 (srt, vtt)
     * @returns {string} 字幕格式文本
     */
    generateSubtitleText(result, format = 'srt') {
        if (!result || !result.text) {
            return '';
        }

        const text = result.text;

        switch (format.toLowerCase()) {
            case 'srt':
                return this.generateSRTFormat(text);
            case 'vtt':
                return this.generateVTTFormat(text);
            default:
                return text;
        }
    }

    /**
     * 生成SRT格式字幕
     * @param {string} text - 识别文本
     * @returns {string} SRT格式字幕
     */
    generateSRTFormat(text) {
        // 将时间戳格式转换为SRT格式
        return text
            .replace(/\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/g, (match, h, m, s, ms) => {
                return `${h}:${m}:${s},${ms}`;
            })
            .split('\n')
            .filter(line => line.trim())
            .map((line, index, arr) => {
                // 查找时间戳行
                if (line.includes(':') && line.includes(',')) {
                    const timestamp = line;
                    const nextLine = arr[index + 1];
                    if (nextLine && !nextLine.includes(':')) {
                        return `${Math.ceil((index + 1) / 2)}\n${timestamp}\n${nextLine}\n`;
                    }
                }
                return '';
            })
            .filter(line => line.trim())
            .join('\n');
    }

    /**
     * 生成VTT格式字幕
     * @param {string} text - 识别文本
     * @returns {string} VTT格式字幕
     */
    generateVTTFormat(text) {
        let vttContent = 'WEBVTT\n\n';

        // 将时间戳格式转换为VTT格式
        const lines = text.split('\n').filter(line => line.trim());
        let index = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 检查是否为时间戳行
            const timeMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/);
            if (timeMatch) {
                const [, h, m, s, ms] = timeMatch;
                const startTime = `${h}:${m}:${s}.${ms}`;

                // 查找下一个时间戳作为结束时间
                let endTime = startTime;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextMatch = lines[j].match(/\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]/);
                    if (nextMatch) {
                        const [, nh, nm, ns, nms] = nextMatch;
                        endTime = `${nh}:${nm}:${ns}.${nms}`;
                        break;
                    }
                }

                // 获取文本内容
                let textContent = '';
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)) {
                        break;
                    }
                    textContent += lines[j] + ' ';
                }

                if (textContent.trim()) {
                    vttContent += `${index}\n${startTime} --> ${endTime}\n${textContent.trim()}\n\n`;
                    index++;
                }
            }
        }

        return vttContent;
    }

    /**
     * 复制结果到剪贴板
     * @param {string} type - 复制类型 (original, ai, subtitle)
     * @returns {Promise<boolean>} 是否成功复制
     */
    async copyResultToClipboard(type = 'original') {
        if (!this.currentResult) {
            throw new Error('没有可复制的结果');
        }

        try {
            let content = '';

            switch (type) {
                case 'original':
                    content = this.currentResult.text || '';
                    break;
                case 'ai':
                    content = this.generateAIOptimizedPrompt(this.currentResult);
                    break;
                case 'subtitle':
                    content = this.generateSubtitleText(this.currentResult, 'srt');
                    break;
                default:
                    throw new Error(`不支持的复制类型: ${type}`);
            }

            await navigator.clipboard.writeText(content);
            console.log(`已复制${type}内容到剪贴板`);
            return true;

        } catch (error) {
            console.error('复制失败:', error);
            throw new Error(`复制失败: ${error.message}`);
        }
    }

    /**
     * 重置识别状态
     */
    reset() {
        this.isRecognizing = false;
        this.currentResult = null;
        console.log('识别管理器已重置');
    }

    /**
     * 获取当前识别结果
     * @returns {Object|null} 当前识别结果
     */
    getCurrentResult() {
        return this.currentResult;
    }

    /**
     * 检查是否正在识别
     * @returns {boolean} 是否正在识别
     */
    isInProgress() {
        return this.isRecognizing;
    }
}