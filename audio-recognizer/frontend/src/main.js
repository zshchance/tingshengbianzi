import './style.css';
import './app.css';

// 导入模块
import { AudioFileProcessor } from './modules/AudioFileProcessor.js';
import { RecognitionManager } from './modules/RecognitionManager.js';
import { SettingsManager } from './modules/SettingsManager.js';
import { EventHandler } from './modules/EventHandler.js';

/**
 * 音频识别应用主类
 * 负责协调各个模块的工作，提供统一的应用接口
 */
class AudioRecognizerApp {
    constructor() {
        this.currentFile = null;
        this.recognitionResult = null;

        this.initializeModules();
    }

    /**
     * 初始化各个模块
     */
    async initializeModules() {
        try {
            // 创建模块实例
            this.audioFileProcessor = new AudioFileProcessor();
            this.recognitionManager = new RecognitionManager();
            this.settingsManager = new SettingsManager();

            // 初始化设置
            await this.settingsManager.initialize();

            // 创建事件处理器
            this.eventHandler = new EventHandler(
                this.audioFileProcessor,
                this.recognitionManager,
                this.settingsManager
            );

            // 设置识别管理器的回调
            this.setupRecognitionCallbacks();

            // 初始化UI状态
            this.initializeUI();

            console.log('音频识别应用初始化完成');

        } catch (error) {
            console.error('应用初始化失败:', error);
        }
    }

    /**
     * 设置识别管理器的回调函数
     */
    setupRecognitionCallbacks() {
        this.recognitionManager.setProgressCallback((progress) => {
            // 进度回调已移至Vue组件处理
        });

        this.recognitionManager.setResultCallback((result) => {
            this.recognitionResult = result;
            // 结果显示已移至Vue组件处理
        });

        this.recognitionManager.setErrorCallback((error) => {
            console.error('识别失败:', error);
            // 错误显示已移至Vue组件处理
        });

        this.recognitionManager.setCompleteCallback(() => {
            console.log('识别完成');
            // 完成提示已移至Vue组件处理
        });
    }

    /**
     * 初始化UI状态
     */
    async initializeUI() {
        try {
            // 获取识别状态
            const status = await this.recognitionManager.getRecognitionStatus();
            console.log('模型状态:', status);

            // 更新设置
            const settings = this.settingsManager.getAllSettings();
            console.log('设置已加载:', settings);

            console.log('UI初始化完成');

        } catch (error) {
            console.error('UI初始化失败:', error);
        }
    }

    /**
     * 获取当前文件信息
     */
    getCurrentFile() {
        return this.currentFile;
    }

    /**
     * 获取当前识别结果
     */
    getCurrentRecognitionResult() {
        return this.recognitionResult;
    }

    /**
     * 销毁应用（清理资源）
     */
    destroy() {
        if (this.eventHandler) {
            this.eventHandler.destroy();
        }

        // 清理模块引用
        this.audioFileProcessor = null;
        this.recognitionManager = null;
        this.settingsManager = null;
        this.eventHandler = null;

        console.log('音频识别应用已销毁');
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.audioApp = new AudioRecognizerApp();
    console.log('Audio Recognizer 应用已启动');
});
