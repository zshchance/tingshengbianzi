/**
 * 事件管理模块
 * 负责统一管理所有UI事件和Wails后端事件
 */
import {EventsOn} from '../../wailsjs/runtime/runtime.js';

export class EventHandler {
    constructor(audioFileProcessor, recognitionManager, settingsManager, uiController) {
        this.audioFileProcessor = audioFileProcessor;
        this.recognitionManager = recognitionManager;
        this.settingsManager = settingsManager;
        this.uiController = uiController;

        this.initEventListeners();
        this.setupWailsEvents();
    }

    /**
     * 初始化所有UI事件监听器
     */
    initEventListeners() {
        // 文件相关事件
        this.initFileEvents();

        // 控制按钮事件
        this.initControlEvents();

        // 设置相关事件
        this.initSettingsEvents();

        // 结果操作事件
        this.initResultEvents();

        // 拖拽事件
        this.initDragDropEvents();

        console.log('UI事件监听器初始化完成');
    }

    /**
     * 初始化文件相关事件
     */
    initFileEvents() {
        // 文件选择按钮
        this.addEventListener('selectFileBtn', 'click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });

        // 文件输入变化
        this.addEventListener('fileInput', 'change', (e) => {
            this.handleFileSelect(e);
        });

        // 清除文件按钮
        this.addEventListener('clearFileBtn', 'click', () => {
            this.clearFile();
        });
    }

    /**
     * 初始化控制按钮事件
     */
    initControlEvents() {
        // 开始识别按钮
        this.addEventListener('startBtn', 'click', () => {
            this.handleStartRecognition();
        });

        // 停止识别按钮
        this.addEventListener('stopBtn', 'click', () => {
            this.handleStopRecognition();
        });

        // 重置应用按钮
        this.addEventListener('resetBtn', 'click', () => {
            this.handleResetApplication();
        });
    }

    /**
     * 初始化设置相关事件
     */
    initSettingsEvents() {
        // 打开设置
        this.addEventListener('settingsBtn', 'click', () => {
            this.uiController.openSettings();
        });

        // 关闭设置
        this.addEventListener('closeModalBtn', 'click', () => {
            this.uiController.closeSettings();
        });

        // 取消设置
        this.addEventListener('cancelSettingsBtn', 'click', () => {
            this.uiController.closeSettings();
        });

        // 保存设置
        this.addEventListener('saveSettingsBtn', 'click', () => {
            this.handleSaveSettings();
        });

        // 切换高级设置
        this.addEventListener('toggleAdvancedBtn', 'click', () => {
            this.uiController.toggleAdvancedSettings();
        });

        // 浏览模型路径
        this.addEventListener('browseModelBtn', 'click', () => {
            this.handleBrowseModelPath();
        });

        // 语言选择变化
        this.addEventListener('languageSelect', 'change', (e) => {
            this.settingsManager.setSetting('language', e.target.value, true);
        });

        // 置信度滑块变化
        const confidenceSlider = document.getElementById('confidenceThreshold');
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceSlider && confidenceValue) {
            confidenceSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                confidenceValue.textContent = value;
                this.settingsManager.setSetting('confidenceThreshold', parseFloat(value), true);
            });
        }

        // 设置变更监听器
        this.settingsManager.addChangeListener((change) => {
            this.handleSettingChange(change);
        });
    }

    /**
     * 初始化结果操作事件
     */
    initResultEvents() {
        // 标签页切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                if (tabName) {
                    this.uiController.switchTab(tabName);
                }
            });
        });

        // 复制原始结果
        this.addEventListener('copyOriginalBtn', 'click', async () => {
            await this.handleCopyResult('original');
        });

        // 复制AI结果
        this.addEventListener('copyAIBtn', 'click', async () => {
            await this.handleCopyResult('ai');
        });

        // 导出结果
        this.addEventListener('exportBtn', 'click', () => {
            this.handleExportResult();
        });
    }

    /**
     * 初始化拖拽事件
     */
    initDragDropEvents() {
        const dropZone = document.getElementById('fileDropZone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                this.handleDragOver(e);
            });

            dropZone.addEventListener('drop', (e) => {
                this.handleDrop(e);
            });

            dropZone.addEventListener('dragleave', (e) => {
                this.handleDragLeave(e);
            });

            dropZone.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
    }

    /**
     * 设置Wails后端事件监听
     */
    setupWailsEvents() {
        // 识别进度事件
        EventsOn('recognition_progress', (progress) => {
            this.handleRecognitionProgress(progress);
        });

        // 识别结果事件
        EventsOn('recognition_result', (result) => {
            this.handleRecognitionResult(result);
        });

        // 识别错误事件
        EventsOn('recognition_error', (error) => {
            this.handleRecognitionError(error);
        });

        // 识别完成事件
        EventsOn('recognition_complete', (result) => {
            this.handleRecognitionComplete(result);
        });

        console.log('Wails事件监听器设置完成');
    }

    /**
     * 便捷的事件监听器添加方法
     * @param {string} id - 元素ID
     * @param {string} event - 事件类型
     * @param {Function} handler - 事件处理函数
     */
    addEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    }

    /**
     * 处理文件选择
     * @param {Event} event - 文件选择事件
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processAudioFile(file);
        }
    }

    /**
     * 处理拖拽悬停
     * @param {Event} event - 拖拽事件
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.uiController.setDropZoneState(true);
    }

    /**
     * 处理拖拽离开
     * @param {Event} event - 拖拽事件
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.uiController.setDropZoneState(false);
    }

    /**
     * 处理文件拖拽
     * @param {Event} event - 拖拽事件
     */
    async handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.uiController.setDropZoneState(false);

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            await this.processAudioFile(files[0]);
        }
    }

    /**
     * 处理音频文件
     * @param {File} file - 音频文件
     */
    async processAudioFile(file) {
        try {
            // 验证并处理文件
            const fileInfo = await this.audioFileProcessor.processAudioFile(file);

            // 存储到应用状态
            window.audioApp.currentFile = fileInfo;

            // 更新UI显示
            const displayInfo = this.audioFileProcessor.createDisplayFileInfo(fileInfo);
            this.uiController.displayFileInfo(displayInfo);

            // 启用开始按钮
            this.uiController.enableStartButton();

            // 显示成功提示
            this.uiController.showToast(`已选择文件: ${file.name}`, 'success');

        } catch (error) {
            console.error('文件处理失败:', error);
            this.uiController.showToast(`文件处理失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理开始识别
     */
    async handleStartRecognition() {
        const currentFile = window.audioApp?.currentFile;
        if (!currentFile) {
            this.uiController.showToast('请先选择音频文件', 'warning');
            return;
        }

        if (this.recognitionManager.isInProgress()) {
            this.uiController.showToast('语音识别正在进行中', 'info');
            return;
        }

        try {
            // 获取识别选项
            const options = this.settingsManager.getAllSettings();

            // 显示进度UI
            this.uiController.showProgress();
            this.uiController.disableControls();
            this.uiController.updateStatus('正在识别...', 'processing');

            // 开始识别
            await this.recognitionManager.startRecognition(currentFile, options);

            this.uiController.showToast('语音识别已开始', 'success');

        } catch (error) {
            console.error('开始识别失败:', error);
            this.uiController.hideProgress();
            this.uiController.enableControls();
            this.uiController.updateStatus('识别失败', 'error');
            this.uiController.showToast(`识别失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理停止识别
     */
    async handleStopRecognition() {
        try {
            this.uiController.updateStatus('正在停止...', 'processing');
            await this.recognitionManager.stopRecognition();
            this.uiController.showToast('识别已停止', 'info');

        } catch (error) {
            console.error('停止识别失败:', error);
            this.uiController.showToast(`停止失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理重置应用
     */
    handleResetApplication() {
        // 重置应用状态
        window.audioApp.currentFile = null;
        window.audioApp.recognitionResult = null;

        // 重置识别管理器
        this.recognitionManager.reset();

        // 重置UI
        this.uiController.hideFileInfo();
        this.uiController.hideProgress();
        this.uiController.hideResults();
        this.uiController.resetProgress();
        this.uiController.enableControls();
        this.uiController.updateStatus('就绪', 'ready');

        this.uiController.showToast('应用已重置', 'info');
    }

    /**
     * 处理设置保存
     */
    async handleSaveSettings() {
        try {
            // 从UI获取设置
            const uiSettings = this.uiController.getSettingsFromUI();

            // 验证设置
            for (const [key, value] of Object.entries(uiSettings)) {
                if (!this.settingsManager.validateSetting(key, value)) {
                    throw new Error(`无效的设置值: ${key} = ${value}`);
                }
            }

            // 保存设置
            await this.settingsManager.setSettings(uiSettings, true);

            // 更新UI显示
            this.settingsManager.initialize(); // 重新加载设置
            this.uiController.updateSettingsUI(this.settingsManager.getAllSettings());

            this.uiController.showToast('设置已保存', 'success');
            this.uiController.closeSettings();

        } catch (error) {
            console.error('保存设置失败:', error);
            this.uiController.showToast(`保存设置失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理浏览模型路径
     */
    handleBrowseModelPath() {
        // 这里将来可以调用后端API打开文件夹选择对话框
        this.uiController.showToast('文件夹选择功能开发中...', 'info');
    }

    /**
     * 处理设置变更
     * @param {Object} change - 设置变更信息
     */
    handleSettingChange(change) {
        console.log('设置变更:', change);

        // 根据变更的设置项执行相应操作
        switch (change.key) {
            case 'language':
                // 可以在这里触发语言模型重新加载
                break;
            case 'theme':
                // 切换主题
                this.applyTheme(change.newValue);
                break;
            case 'enableAnimations':
                // 启用/禁用动画
                this.toggleAnimations(change.newValue);
                break;
        }
    }

    /**
     * 处理复制结果
     * @param {string} type - 复制类型
     */
    async handleCopyResult(type) {
        try {
            await this.recognitionManager.copyResultToClipboard(type);
            const typeNames = {
                'original': '原始结果',
                'ai': 'AI优化提示',
                'subtitle': '字幕格式'
            };
            this.uiController.showToast(`${typeNames[type]}已复制到剪贴板`, 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.uiController.showToast('复制失败', 'error');
        }
    }

    /**
     * 处理导出结果
     */
    async handleExportResult() {
        try {
            // 获取默认导出格式
            const defaultFormat = this.settingsManager.getSetting('defaultExportFormat', 'txt');

            // 导出结果
            const result = await this.recognitionManager.exportResult(defaultFormat);

            this.uiController.showToast(`结果已导出到: ${result.path}`, 'success');
        } catch (error) {
            console.error('导出失败:', error);
            this.uiController.showToast(`导出失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理识别进度
     * @param {Object} progress - 进度信息
     */
    handleRecognitionProgress(progress) {
        this.recognitionManager.handleProgressUpdate(progress);
        this.uiController.updateProgress(progress);
    }

    /**
     * 处理识别结果
     * @param {Object} result - 识别结果
     */
    handleRecognitionResult(result) {
        this.recognitionManager.handleRecognitionResult(result);
        window.audioApp.recognitionResult = result;
    }

    /**
     * 处理识别错误
     * @param {Object} error - 错误信息
     */
    handleRecognitionError(error) {
        this.recognitionManager.handleRecognitionError(error);
        this.uiController.hideProgress();
        this.uiController.enableControls();
        this.uiController.updateStatus('识别出错', 'error');
        this.uiController.showToast(`识别失败: ${error.message || error}`, 'error');
    }

    /**
     * 处理识别完成
     * @param {Object} result - 完成结果
     */
    handleRecognitionComplete(result) {
        this.recognitionManager.handleRecognitionComplete(result);
        this.uiController.hideProgress();
        this.uiController.enableControls();
        this.uiController.updateStatus('识别完成', 'ready');

        // 显示结果
        if (result && result.success) {
            const recognitionResult = result.result || this.recognitionManager.getCurrentResult();
            if (recognitionResult) {
                window.audioApp.recognitionResult = recognitionResult;
                this.uiController.displayResults(recognitionResult, 'original');
                this.uiController.showToast('识别完成！', 'success');
            }
        } else {
            this.uiController.showToast('识别完成，但未获取到结果', 'warning');
        }
    }

    /**
     * 清除文件
     */
    clearFile() {
        window.audioApp.currentFile = null;
        this.uiController.hideFileInfo();
        this.uiController.disableStartButton();
        this.uiController.showToast('文件已清除', 'info');
    }

    /**
     * 应用主题
     * @param {string} theme - 主题名称
     */
    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        console.log('主题已切换为:', theme);
    }

    /**
     * 切换动画
     * @param {boolean} enabled - 是否启用动画
     */
    toggleAnimations(enabled) {
        if (enabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
        console.log('动画已', enabled ? '启用' : '禁用');
    }

    /**
     * 移除所有事件监听器（用于清理）
     */
    destroy() {
        // 这里可以移除所有事件监听器，避免内存泄漏
        console.log('事件处理器已销毁');
    }
}