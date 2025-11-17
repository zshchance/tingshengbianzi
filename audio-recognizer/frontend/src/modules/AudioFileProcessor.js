/**
 * 音频文件处理模块
 * 负责音频文件的验证、信息提取、格式化等功能
 */
export class AudioFileProcessor {
    constructor() {
        this.supportedFormats = [
            'audio/mpeg',         // MP3
            'audio/wav',          // WAV
            'audio/x-wav',        // WAV variants
            'audio/ogg',          // OGG
            'audio/mp4',          // M4A, MP4
            'audio/flac',         // FLAC
            'audio/x-flac',       // FLAC variants
            'audio/aac',          // AAC
            'audio/x-ms-wma',     // WMA
            'audio/3gpp',         // 3GP
            'audio/webm',         // WebM
            'audio/x-caf',        // CAF (Core Audio Format)
        ];
    }

    /**
     * 验证音频文件类型
     * @param {File} file - 文件对象
     * @returns {boolean} 是否为支持的音频格式
     */
    validateAudioFile(file) {
        if (!file) {
            return false;
        }

        // 检查MIME类型，如果为空或不正确，尝试从文件扩展名推断
        let mimeType = file.type;
        if (!mimeType || !this.supportedFormats.includes(mimeType)) {
            mimeType = this.getMimeTypeFromExtension(file.name);
        }

        if (!mimeType || !this.supportedFormats.includes(mimeType)) {
            return false;
        }

        // 检查文件大小（限制为2GB）
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
        if (file.size > maxSize) {
            return false;
        }

        return true;
    }

    /**
     * 处理音频文件并提取信息
     * @param {File} file - 音频文件
     * @returns {Promise<Object>} 文件信息对象
     */
    async processAudioFile(file) {
        console.log('处理音频文件:', file);

        try {
            // 验证文件类型
            if (!this.validateAudioFile(file)) {
                throw new Error(`不支持的文件格式: ${file.type}`);
            }

            console.log('文件类型验证通过:', file.type);

            // 检测文件类型（处理不正确的MIME类型）
            const detectedType = file.type || this.getMimeTypeFromExtension(file.name) || 'unknown';

            // 提取文件信息
            const fileInfo = {
                name: file.name,
                size: file.size,
                type: detectedType,
                lastModified: file.lastModified,
                path: file.path || file.webkitRelativePath || file.name, // Wails文件路径或回退到文件名
                formattedSize: this.formatFileSize(file.size),
                formattedType: this.getFormattedFileType(detectedType)
            };

            // 获取音频时长
            try {
                fileInfo.duration = await this.getAudioDuration(file);
                console.log('前端音频时长获取结果:', fileInfo.duration, '秒');
                if (fileInfo.duration && fileInfo.duration > 0) {
                    fileInfo.formattedDuration = this.formatTime(fileInfo.duration);
                    console.log('音频时长获取成功:', fileInfo.duration, '秒，格式化后:', fileInfo.formattedDuration);
                } else {
                    throw new Error('获取到的时长为0或无效');
                }
            } catch (durationError) {
                console.warn('获取音频时长失败:', durationError.message);
                console.log('文件大小:', file.size, '字节');
                console.log('文件名:', file.name);

                // 如果前端获取失败，尝试从文件名或扩展名估算
                fileInfo.duration = this.estimateDurationFromSize(file.size, file.name);
                console.log('估算的音频时长:', fileInfo.duration, '秒');

                if (fileInfo.duration && fileInfo.duration > 0) {
                    fileInfo.formattedDuration = this.formatTime(fileInfo.duration);
                    console.log('使用估算时长:', fileInfo.duration, '秒，格式化后:', fileInfo.formattedDuration);
                } else {
                    console.error('估算时长也失败了，设置为未知');
                    fileInfo.formattedDuration = '未知';
                }
            }

            console.log('文件信息已提取:', fileInfo);
            return fileInfo;

        } catch (error) {
            console.error('处理文件失败:', error);
            throw new Error(`文件处理失败: ${error.message}`);
        }
    }

    /**
     * 获取音频时长
     * @param {File} file - 音频文件
     * @returns {Promise<number>} 时长（秒）
     */
    getAudioDuration(file) {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio();

                const handleLoadedMetadata = () => {
                    const duration = audio.duration;
                    if (isNaN(duration) || duration === 0) {
                        reject(new Error('无法获取音频时长'));
                    } else {
                        resolve(duration);
                    }
                    cleanup();
                };

                const handleError = () => {
                    reject(new Error('音频文件损坏或格式不支持'));
                    cleanup();
                };

                const cleanup = () => {
                    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    audio.removeEventListener('error', handleError);
                    URL.revokeObjectURL(audio.src);
                };

                audio.addEventListener('loadedmetadata', handleLoadedMetadata);
                audio.addEventListener('error', handleError);

                audio.src = URL.createObjectURL(file);

                // 设置超时
                setTimeout(() => {
                    cleanup();
                    reject(new Error('获取音频时长超时'));
                }, 15000); // 增加到15秒超时

            } catch (error) {
                reject(new Error(`创建音频元素失败: ${error.message}`));
            }
        });
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间 (HH:MM:SS 或 MM:SS)
     */
    formatTime(seconds) {
        console.log('formatTime 输入的秒数:', seconds, typeof seconds);

        if (!seconds || isNaN(seconds)) {
            console.log('formatTime: 秒数为空或无效，返回00:00');
            return '00:00';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        console.log('formatTime 计算后 - 小时:', hours, '分钟:', minutes, '秒:', secs);

        if (hours > 0) {
            const result = `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            console.log('formatTime 返回结果:', result);
            return result;
        }

        const result = `${minutes}:${secs.toString().padStart(2, '0')}`;
        console.log('formatTime 返回结果:', result);
        return result;
    }

    /**
     * 获取格式化的文件类型描述
     * @param {string} mimeType - MIME类型
     * @returns {string} 格式化的文件类型描述
     */
    getFormattedFileType(mimeType) {
        const typeMap = {
            'audio/mpeg': 'MP3音频',
            'audio/wav': 'WAV音频',
            'audio/x-wav': 'WAV音频',
            'audio/ogg': 'OGG音频',
            'audio/mp4': 'M4A/MP4音频',
            'audio/flac': 'FLAC音频',
            'audio/x-flac': 'FLAC音频',
            'audio/aac': 'AAC音频',
            'audio/x-ms-wma': 'WMA音频',
            'audio/3gpp': '3GP音频',
            'audio/webm': 'WebM音频',
            'audio/x-caf': 'CAF音频',
        };

        return typeMap[mimeType] || mimeType;
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 文件扩展名
     */
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    /**
     * 根据文件扩展名获取MIME类型
     * @param {string} filename - 文件名
     * @returns {string|null} MIME类型
     */
    getMimeTypeFromExtension(filename) {
        const extension = this.getFileExtension(filename);
        const extensionMap = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'wma': 'audio/x-ms-wma',
            'aac': 'audio/aac',
            '3gp': 'audio/3gpp',
            'webm': 'audio/webm',
            'mp4': 'audio/mp4',
            'caf': 'audio/x-caf',
        };

        return extensionMap[extension] || null;
    }

    /**
     * 根据文件大小和名称估算音频时长
     * @param {number} fileSize - 文件大小（字节）
     * @param {string} fileName - 文件名
     * @returns {number} 估算的时长（秒）
     */
    estimateDurationFromSize(fileSize, fileName) {
        console.log('开始估算音频时长 - 文件大小:', fileSize, '文件名:', fileName);

        // 检查文件大小
        if (!fileSize || fileSize <= 0) {
            console.error('文件大小无效:', fileSize);
            return 0;
        }

        // 获取文件扩展名
        const extension = this.getFileExtension(fileName);
        console.log('文件扩展名:', extension);

        // 根据不同格式设置平均比特率（kbps）
        let bitRate = 128; // 默认128kbps
        switch (extension) {
            case 'mp3':
                bitRate = 128;
                break;
            case 'wav':
                bitRate = 1411; // CD质量
                break;
            case 'm4a':
            case 'aac':
                bitRate = 128;
                break;
            case 'flac':
                bitRate = 1000; // 无损压缩
                break;
            case 'ogg':
                bitRate = 160;
                break;
            default:
                bitRate = 128;
                console.log('使用默认比特率:', bitRate);
        }

        // 计算时长（秒）
        const bytesPerSecond = (bitRate * 1000) / 8; // 转换为字节/秒
        console.log('每秒字节数:', bytesPerSecond);

        let estimatedDuration = fileSize / bytesPerSecond;
        console.log('初步估算时长:', estimatedDuration, '秒');

        // 设置合理的范围限制
        if (estimatedDuration < 1) {
            estimatedDuration = 1; // 最少1秒
            console.log('时长过短，设置为最小值1秒');
        } else if (estimatedDuration > 7200) {
            estimatedDuration = 7200; // 最多2小时
            console.log('时长过长，设置为最大值2小时');
        }

        const result = Math.round(estimatedDuration);
        console.log('最终估算时长:', result, '秒');
        return result;
    }

    /**
     * 创建文件信息对象用于显示
     * @param {Object} fileInfo - 文件信息对象
     * @returns {Object} 用于UI显示的文件信息
     */
    createDisplayFileInfo(fileInfo) {
        return {
            name: fileInfo.name,
            formattedSize: fileInfo.formattedSize || '未知',
            formattedType: fileInfo.formattedType || '未知',
            formattedDuration: fileInfo.formattedDuration || '计算中...',
            path: fileInfo.path
        };
    }
}