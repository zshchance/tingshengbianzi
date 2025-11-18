/**
 * 事件处理器模块
 * 负责处理用户交互事件和应用逻辑
 */

export class EventHandler {
    /**
     * 构造函数
     * @param {Object} recognitionManager - 识别管理器实例
     * @param {Object} settingsManager - 设置管理器实例
     * @param {Object} audioFileProcessor - 音频文件处理器实例
     */
    constructor(recognitionManager, settingsManager, audioFileProcessor) {
        this.recognitionManager = recognitionManager;
        this.settingsManager = settingsManager;
        this.audioFileProcessor = audioFileProcessor;
    }

    /**
     * 初始化所有事件监听器
     */
    init() {
        this.initFileEvents();
        this.initRecognitionEvents();
        this.initResultEvents();
        this.initSettingsEvents();
        console.log('事件处理器已初始化');
    }

    /**
     * 初始化文件相关事件
     */
    initFileEvents() {
        // 文件选择事件
        const fileInput = document.getElementById('audio-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // 拖放区域事件
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            dropZone.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        // 清除文件按钮
        const clearFileBtn = document.getElementById('clear-file-btn');
        if (clearFileBtn) {
            clearFileBtn.addEventListener('click', () => this.clearFile());
        }
    }

    /**
     * 初始化识别相关事件
     */
    initRecognitionEvents() {
        // 开始识别按钮
        const startBtn = document.getElementById('start-recognition-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.handleStartRecognition());
        }

        // 停止识别按钮
        const stopBtn = document.getElementById('stop-recognition-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.handleStopRecognition());
        }

        // 重置应用按钮
        const resetBtn = document.getElementById('reset-app-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetApplication());
        }
    }

    /**
     * 初始化结果相关事件
     */
    initResultEvents() {
        // 复制结果按钮
        const copyOriginalBtn = document.getElementById('copy-original-btn');
        if (copyOriginalBtn) {
            copyOriginalBtn.addEventListener('click', () => this.handleCopyResult('original'));
        }

        const copyAiBtn = document.getElementById('copy-ai-btn');
        if (copyAiBtn) {
            copyAiBtn.addEventListener('click', () => this.handleCopyResult('ai'));
        }

        const copySubtitleBtn = document.getElementById('copy-subtitle-btn');
        if (copySubtitleBtn) {
            copySubtitleBtn.addEventListener('click', () => this.handleCopyResult('subtitle'));
        }

        // 导出结果按钮
        const exportBtn = document.getElementById('export-result-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportResult());
        }

        // 结果标签切换
        const resultTabs = document.querySelectorAll('.result-tab');
        resultTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有活动状态
                resultTabs.forEach(t => t.classList.remove('active'));
                // 添加当前活动状态
                tab.classList.add('active');
                // 这里可以添加显示对应结果的逻辑
            });
        });
    }

    /**
     * 初始化设置相关事件
     */
    initSettingsEvents() {
        // 设置按钮
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.handleOpenSettings());
        }

        // 关闭设置按钮
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.handleCloseSettings());
        }

        // 高级设置切换
        const advancedToggle = document.getElementById('advanced-settings-toggle');
        if (advancedToggle) {
            advancedToggle.addEventListener('change', (e) => this.handleToggleAdvancedSettings(e.target.checked));
        }

        // 保存设置按钮
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.handleSaveSettings());
        }

        // 浏览模型路径按钮
        const browseModelBtn = document.getElementById('browse-model-btn');
        if (browseModelBtn) {
            browseModelBtn.addEventListener('click', () => this.handleBrowseModelPath());
        }

        // 设置项变更监听
        this.initSettingChangeListeners();
    }

    /**
     * 初始化设置项变更监听器
     */
    initSettingChangeListeners() {
        // 语言设置
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => this.handleSettingChange({
                key: 'language',
                newValue: e.target.value
            }));
        }

        // 主题设置
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => this.handleSettingChange({
                key: 'theme',
                newValue: e.target.value
            }));
        }

        // 动画设置
        const animationsToggle = document.getElementById('enable-animations-toggle');
        if (animationsToggle) {
            animationsToggle.addEventListener('change', (e) => this.handleSettingChange({
                key: 'enableAnimations',
                newValue: e.target.checked
            }));
        }

        // 其他设置项...
    }

    /**
     * 处理文件拖动悬停
     * @param {DragEvent} e - 拖动事件
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        // 这里可以添加拖动悬停的UI反馈
    }

    /**
     * 处理文件拖动离开
     * @param {DragEvent} e - 拖动事件
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        // 这里可以添加拖动离开的UI反馈
    }

    /**
     * 处理文件拖放
     * @param {DragEvent} e - 拖动事件
     */
    async handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await this.handleFileSelect({ target: { files } });
        }
    }

    /**
     * 处理文件选择
     * @param {Event} e - 文件选择事件
     */
    async handleFileSelect(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        const file = files[0];

        try {
            // 验证并处理文件
            console.log('调用audioFileProcessor.processAudioFile');
            const fileInfo = await this.audioFileProcessor.processAudioFile(file);
            console.log('文件处理完成，fileInfo:', fileInfo);

            // 存储到应用状态
            window.audioApp.currentFile = fileInfo;
            console.log('文件信息已存储到window.audioApp.currentFile');

            // 更新UI显示 - 这些功能已移至Vue组件处理
            // const displayInfo = this.audioFileProcessor.createDisplayFileInfo(fileInfo);
            // this.uiController.displayFileInfo(displayInfo);
            // this.uiController.enableStartButton();
            // this.uiController.showToast(`已选择文件: ${file.name}`, 'success');

        } catch (error) {
            console.error('文件处理失败:', error);
            // this.uiController.showToast(`文件处理失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理开始识别
     */
    async handleStartRecognition() {
        const currentFile = window.audioApp?.currentFile;
        if (!currentFile) {
            // this.uiController.showToast('请先选择音频文件', 'warning');
            console.warn('请先选择音频文件');
            return;
        }

        if (this.recognitionManager.isInProgress()) {
            // this.uiController.showToast('语音识别正在进行中', 'info');
            console.warn('语音识别正在进行中');
            return;
        }

        try {
            // 获取识别选项
            const options = this.settingsManager.getAllSettings();

            // 显示进度UI - 这些功能已移至Vue组件处理
            // this.uiController.showProgress();
            // this.uiController.disableControls();
            // this.uiController.updateStatus('正在识别...', 'processing');

            // 开始识别
            await this.recognitionManager.startRecognition(currentFile, options);

            // this.uiController.showToast('语音识别已开始', 'success');
            console.log('语音识别已开始');

        } catch (error) {
            console.error('开始识别失败:', error);
            // this.uiController.hideProgress();
            // this.uiController.enableControls();
            // this.uiController.updateStatus('识别失败', 'error');
            // this.uiController.showToast(`识别失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理停止识别
     */
    async handleStopRecognition() {
        try {
            // this.uiController.updateStatus('正在停止...', 'processing');
            console.log('正在停止识别...');
            await this.recognitionManager.stopRecognition();
            // this.uiController.showToast('识别已停止', 'info');
            console.log('识别已停止');

        } catch (error) {
            console.error('停止识别失败:', error);
            // this.uiController.showToast(`停止失败: ${error.message}`, 'error');
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

        // 重置UI - 这些功能已移至Vue组件处理
        // this.uiController.hideFileInfo();
        // this.uiController.hideProgress();
        // this.uiController.hideResults();
        // this.uiController.resetProgress();
        // this.uiController.enableControls();
        // this.uiController.updateStatus('就绪', 'ready');
        // this.uiController.showToast('应用已重置', 'info');
        
        console.log('应用已重置');
    }

    /**
     * 处理打开设置
     */
    handleOpenSettings() {
        // this.uiController.openSettings();
        console.log('打开设置');
    }

    /**
     * 处理关闭设置
     */
    handleCloseSettings() {
        // this.uiController.closeSettings();
        console.log('关闭设置');
    }

    /**
     * 处理切换高级设置
     * @param {boolean} show - 是否显示高级设置
     */
    handleToggleAdvancedSettings(show) {
        // this.uiController.toggleAdvancedSettings(show);
        console.log('切换高级设置:', show);
    }

    /**
     * 处理设置保存
     */
    async handleSaveSettings() {
        try {
            // 从UI获取设置 - 这些功能已移至Vue组件处理
            // const uiSettings = this.uiController.getSettingsFromUI();

            // 验证设置
            // for (const [key, value] of Object.entries(uiSettings)) {
            //     if (!this.settingsManager.validateSetting(key, value)) {
            //         throw new Error(`无效的设置值: ${key} = ${value}`);
            //     }
            // }

            // 保存设置
            // await this.settingsManager.setSettings(uiSettings, true);

            // 更新UI显示
            // this.settingsManager.initialize(); // 重新加载设置
            // this.uiController.updateSettingsUI(this.settingsManager.getAllSettings());

            // this.uiController.showToast('设置已保存', 'success');
            // this.uiController.closeSettings();
            
            console.log('设置已保存');

        } catch (error) {
            console.error('保存设置失败:', error);
            // this.uiController.showToast(`保存设置失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理浏览模型路径
     */
    handleBrowseModelPath() {
        // 这里将来可以调用后端API打开文件夹选择对话框
        // this.uiController.showToast('文件夹选择功能开发中...', 'info');
        console.log('文件夹选择功能开发中...');
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
            // this.uiController.showToast(`${typeNames[type]}已复制到剪贴板`, 'success');
            console.log(`${typeNames[type]}已复制到剪贴板`);
        } catch (error) {
            console.error('复制失败:', error);
            // this.uiController.showToast('复制失败', 'error');
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

            // this.uiController.showToast(`结果已导出到: ${result.path}`, 'success');
            console.log(`结果已导出到: ${result.path}`);
        } catch (error) {
            console.error('导出失败:', error);
            // this.uiController.showToast(`导出失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理识别进度
     * @param {Object} progress - 进度信息
     */
    handleRecognitionProgress(progress) {
        this.recognitionManager.handleProgressUpdate(progress);
        // this.uiController.updateProgress(progress);
        console.log('识别进度:', progress);
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
        // this.uiController.hideProgress();
        // this.uiController.enableControls();
        // this.uiController.updateStatus('识别出错', 'error');
        // this.uiController.showToast(`识别失败: ${error.message || error}`, 'error');
        console.error('识别错误:', error);
    }

    /**
     * 处理识别完成
     * @param {Object} result - 完成结果
     */
    handleRecognitionComplete(result) {
        this.recognitionManager.handleRecognitionComplete(result);
        // this.uiController.hideProgress();
        // this.uiController.enableControls();
        // this.uiController.updateStatus('识别完成', 'ready');

        // 显示结果
        if (result && result.success) {
            const recognitionResult = result.result || this.recognitionManager.getCurrentResult();
            if (recognitionResult) {
                window.audioApp.recognitionResult = recognitionResult;
                // this.uiController.displayResults(recognitionResult, 'original');
                // this.uiController.showToast('识别完成！', 'success');
                console.log('识别完成！');
            }
        } else {
            // this.uiController.showToast('识别完成，但未获取到结果', 'warning');
            console.warn('识别完成，但未获取到结果');
        }
    }

    /**
     * 清除文件
     */
    clearFile() {
        window.audioApp.currentFile = null;
        // this.uiController.hideFileInfo();
        // this.uiController.disableStartButton();
        // this.uiController.showToast('文件已清除', 'info');
        console.log('文件已清除');
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