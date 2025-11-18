/**
 * 设置管理模块
 * 负责应用配置的加载、保存、验证等功能
 */
import {UpdateConfig, GetConfig, LoadModel} from '../../wailsjs/go/main/App.js';

export class SettingsManager {
    constructor() {
        // 默认设置
        this.defaultSettings = {
            // 基本设置
            language: 'zh-CN',
            modelPath: './models',
            enableAdvancedSettings: false,

            // 识别设置
            sampleRate: 16000,
            confidenceThreshold: 0.5,
            maxAlternatives: 1,
            bufferSize: 4000,

            // 音频处理设置
            enableNormalization: true,
            enableNoiseReduction: false,
            enableWordTimestamp: true,

            // UI设置
            theme: 'auto', // auto, light, dark
            autoSaveResults: true,
            showTimestamps: true,
            enableAnimations: true,

            // 导出设置
            defaultExportFormat: 'txt',
            includeMetadata: true,
            outputFolder: './exports',

            // 高级设置
            debugMode: false,
            logLevel: 'info', // debug, info, warn, error
            maxFileSize: 2147483648, // 2GB
            timeoutMs: 300000, // 5分钟
            retryAttempts: 3
        };

        // 当前设置
        this.currentSettings = { ...this.defaultSettings };

        // 设置变更监听器
        this.changeListeners = [];
    }

    /**
     * 初始化设置
     */
    async initialize() {
        try {
            await this.loadSettings();
            await this.loadBackendConfig();
            console.log('设置管理器初始化完成');
        } catch (error) {
            console.error('设置初始化失败:', error);
            // 使用默认设置
            this.currentSettings = { ...this.defaultSettings };
        }
    }

    /**
     * 加载本地设置
     */
    loadSettings() {
        console.log('⚠️ 本地设置已禁用，配置由后端统一管理');
        // 不再从localStorage加载，完全依赖后端配置
    }

    /**
     * 保存本地设置（已禁用，配置由后端统一管理）
     */
    saveSettings() {
        console.log('⚠️ 本地设置保存已禁用，配置由后端统一管理');
        // 不再保存到localStorage，配置由后端统一管理
    }

    /**
     * 加载后端配置
     */
    async loadBackendConfig() {
        try {
            const backendConfig = await GetConfig();
            if (backendConfig) {
                const parsed = JSON.parse(backendConfig);
                // 后端配置覆盖前端设置
                this.currentSettings = {
                    ...this.currentSettings,
                    language: parsed.language || this.currentSettings.language,
                    modelPath: parsed.modelPath || this.currentSettings.modelPath,
                    sampleRate: parsed.sampleRate || this.currentSettings.sampleRate,
                    confidenceThreshold: parsed.confidenceThreshold || this.currentSettings.confidenceThreshold,
                    enableWordTimestamp: parsed.enableWordTimestamp !== false
                };
                console.log('已加载后端配置');
            }
        } catch (error) {
            console.error('加载后端配置失败:', error);
        }
    }

    /**
     * 保存后端配置
     */
    async saveBackendConfig() {
        try {
            const backendConfig = {
                language: this.currentSettings.language,
                modelPath: this.currentSettings.modelPath,
                sampleRate: this.currentSettings.sampleRate,
                confidenceThreshold: this.currentSettings.confidenceThreshold,
                maxAlternatives: this.currentSettings.maxAlternatives,
                bufferSize: this.currentSettings.bufferSize,
                enableWordTimestamp: this.currentSettings.enableWordTimestamp
            };

            const configJSON = JSON.stringify(backendConfig, null, 2);
            const result = await UpdateConfig(configJSON);

            if (result.success) {
                console.log('后端配置已更新');
                return true;
            } else {
                throw new Error(result.error?.message || '更新后端配置失败');
            }
        } catch (error) {
            console.error('保存后端配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取设置值
     * @param {string} key - 设置键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 设置值
     */
    getSetting(key, defaultValue = null) {
        const value = this.currentSettings[key];
        return value !== undefined ? value : defaultValue;
    }

    /**
     * 设置值
     * @param {string} key - 设置键名
     * @param {*} value - 设置值
     * @param {boolean} saveToBackend - 是否保存到后端
     */
    setSetting(key, value, saveToBackend = false) {
        if (key in this.defaultSettings) {
            const oldValue = this.currentSettings[key];
            this.currentSettings[key] = value;

            // 通知监听器
            this.notifyChange(key, value, oldValue);

            // 自动保存到本地存储
            this.saveSettings();

            // 如果需要，保存到后端
            if (saveToBackend) {
                this.saveBackendConfig().catch(console.error);
            }

            console.log(`设置已更新: ${key} = ${value}`);
        } else {
            console.warn(`未知的设置项: ${key}`);
        }
    }

    /**
     * 批量设置值
     * @param {Object} settings - 设置对象
     * @param {boolean} saveToBackend - 是否保存到后端
     */
    setSettings(settings, saveToBackend = false) {
        const changes = {};

        for (const [key, value] of Object.entries(settings)) {
            if (key in this.defaultSettings) {
                const oldValue = this.currentSettings[key];
                this.currentSettings[key] = value;
                changes[key] = { newValue: value, oldValue };
            }
        }

        // 通知监听器
        for (const [key, change] of Object.entries(changes)) {
            this.notifyChange(key, change.newValue, change.oldValue);
        }

        // 自动保存到本地存储
        this.saveSettings();

        // 如果需要，保存到后端
        if (saveToBackend) {
            this.saveBackendConfig().catch(console.error);
        }

        console.log('批量设置已更新:', changes);
    }

    /**
     * 重置为默认设置
     * @param {boolean} saveToBackend - 是否保存到后端
     */
    resetToDefaults(saveToBackend = false) {
        const oldSettings = { ...this.currentSettings };
        this.currentSettings = { ...this.defaultSettings };

        // 通知所有设置变更
        for (const key of Object.keys(this.defaultSettings)) {
            if (oldSettings[key] !== this.currentSettings[key]) {
                this.notifyChange(key, this.currentSettings[key], oldSettings[key]);
            }
        }

        // 自动保存到本地存储
        this.saveSettings();

        // 如果需要，保存到后端
        if (saveToBackend) {
            this.saveBackendConfig().catch(console.error);
        }

        console.log('设置已重置为默认值');
    }

    /**
     * 获取所有设置
     * @returns {Object} 当前设置
     */
    getAllSettings() {
        return { ...this.currentSettings };
    }

    /**
     * 验证设置值
     * @param {string} key - 设置键名
     * @param {*} value - 设置值
     * @returns {boolean} 是否有效
     */
    validateSetting(key, value) {
        switch (key) {
            case 'language':
                return ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'it-IT'].includes(value);

            case 'sampleRate':
                return [8000, 16000, 22050, 44100, 48000].includes(value);

            case 'confidenceThreshold':
                return typeof value === 'number' && value >= 0 && value <= 1;

            case 'maxAlternatives':
                return typeof value === 'number' && value >= 1 && value <= 10;

            case 'bufferSize':
                return typeof value === 'number' && value >= 1024 && value <= 16384;

            case 'theme':
                return ['auto', 'light', 'dark'].includes(value);

            case 'logLevel':
                return ['debug', 'info', 'warn', 'error'].includes(value);

            case 'defaultExportFormat':
                return ['txt', 'srt', 'vtt', 'json'].includes(value);

            case 'modelPath':
            case 'outputFolder':
                return typeof value === 'string' && value.trim().length > 0;

            case 'maxFileSize':
                return typeof value === 'number' && value > 0;

            case 'timeoutMs':
                return typeof value === 'number' && value > 1000;

            case 'retryAttempts':
                return typeof value === 'number' && value >= 0 && value <= 10;

            default:
                return true; // 对于布尔值等其他类型，不做严格验证
        }
    }

    /**
     * 加载模型
     * @param {string} language - 语言代码
     * @param {string} modelPath - 模型路径（可选）
     * @returns {Promise<Object>} 加载结果
     */
    async loadModel(language, modelPath = null) {
        try {
            const path = modelPath || this.currentSettings.modelPath;
            console.log('加载模型:', { language, path });

            const result = await LoadModel(language, path);

            if (result.success) {
                console.log('模型加载成功');
                return { success: true, message: '模型加载成功' };
            } else {
                throw new Error(result.error?.message || '模型加载失败');
            }
        } catch (error) {
            console.error('模型加载失败:', error);
            throw new Error(`模型加载失败: ${error.message}`);
        }
    }

    /**
     * 导出设置为JSON
     * @returns {string} JSON格式的设置
     */
    exportSettings() {
        return JSON.stringify(this.currentSettings, null, 2);
    }

    /**
     * 从JSON导入设置
     * @param {string} settingsJSON - JSON格式的设置
     * @param {boolean} saveToBackend - 是否保存到后端
     */
    importSettings(settingsJSON, saveToBackend = false) {
        try {
            const settings = JSON.parse(settingsJSON);

            // 验证所有设置值
            for (const [key, value] of Object.entries(settings)) {
                if (key in this.defaultSettings && !this.validateSetting(key, value)) {
                    throw new Error(`无效的设置值: ${key} = ${value}`);
                }
            }

            this.setSettings(settings, saveToBackend);
            console.log('设置导入成功');
        } catch (error) {
            console.error('设置导入失败:', error);
            throw new Error(`设置导入失败: ${error.message}`);
        }
    }

    /**
     * 添加设置变更监听器
     * @param {Function} listener - 监听器函数
     */
    addChangeListener(listener) {
        this.changeListeners.push(listener);
    }

    /**
     * 移除设置变更监听器
     * @param {Function} listener - 监听器函数
     */
    removeChangeListener(listener) {
        const index = this.changeListeners.indexOf(listener);
        if (index > -1) {
            this.changeListeners.splice(index, 1);
        }
    }

    /**
     * 通知设置变更
     * @param {string} key - 设置键名
     * @param {*} newValue - 新值
     * @param {*} oldValue - 旧值
     */
    notifyChange(key, newValue, oldValue) {
        for (const listener of this.changeListeners) {
            try {
                listener({ key, newValue, oldValue, settings: this.currentSettings });
            } catch (error) {
                console.error('设置变更监听器执行失败:', error);
            }
        }
    }

    /**
     * 获取语言选项
     * @returns {Array} 语言选项列表
     */
    getLanguageOptions() {
        return [
            { value: 'zh-CN', label: '中文（简体）' },
            { value: 'en-US', label: 'English (US)' },
            { value: 'ja-JP', label: '日本語' },
            { value: 'ko-KR', label: '한국어' },
            { value: 'fr-FR', label: 'Français' },
            { value: 'de-DE', label: 'Deutsch' },
            { value: 'es-ES', label: 'Español' },
            { value: 'it-IT', label: 'Italiano' }
        ];
    }

    /**
     * 获取导出格式选项
     * @returns {Array} 导出格式选项列表
     */
    getExportFormatOptions() {
        return [
            { value: 'txt', label: '纯文本 (.txt)', description: '纯文本格式，包含时间戳' },
            { value: 'srt', label: 'SRT字幕 (.srt)', description: '标准字幕格式，支持视频播放器' },
            { value: 'vtt', label: 'WebVTT (.vtt)', description: 'Web视频字幕格式' },
            { value: 'json', label: 'JSON (.json)', description: '结构化数据，包含详细信息' }
        ];
    }

    /**
     * 获取采样率选项
     * @returns {Array} 采样率选项列表
     */
    getSampleRateOptions() {
        return [
            { value: 8000, label: '8 kHz' },
            { value: 16000, label: '16 kHz (推荐)' },
            { value: 22050, label: '22.05 kHz' },
            { value: 44100, label: '44.1 kHz' },
            { value: 48000, label: '48 kHz' }
        ];
    }
}