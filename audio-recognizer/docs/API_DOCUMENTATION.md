# 语音识别应用后端接口文档

## 概述

本文档描述了语音识别应用的前后端交互接口。该应用基于Wails框架构建，使用Go语言作为后端，前端通过JavaScript调用后端API。

**语音识别引擎**: 本应用使用OpenAI的Whisper语音识别模型，支持多种语言的音频转文本功能。Whisper模型具有高准确率和强大的多语言支持能力，能够自动识别音频中的语言并进行转换。

**模型支持**: 应用支持多种Whisper模型大小（tiny、base、small、medium、large、large-v2、large-v3），默认使用base模型。模型文件存储在`models/whisper/`目录下。

**架构特点**:
- 模块化设计，分离业务逻辑和路径管理
- 完整的错误处理和事件通知机制
- 支持文件拖拽和多种音频格式
- 内置路径管理，适应不同部署环境

## 接口实现位置

所有后端接口均在 `app.go` 文件中实现：

| 接口类别 | 接口名称 | 实现位置 |
|---------|---------|---------|
| **音频处理** | SelectAudioFile | app.go:694-701 |
| **音频处理** | GetAudioDuration | app.go:704-712 |
| **音频处理** | OnFileDrop | app.go:798-808 |
| **语音识别** | StartRecognition | app.go:328-406 |
| **语音识别** | StopRecognition | app.go:528-551 |
| **语音识别** | GetRecognitionStatus | app.go:554-568 |
| **配置管理** | GetConfig | app.go:621-627 |
| **配置管理** | UpdateConfig | app.go:571-617 |
| **配置管理** | LoadModel | app.go:630-656 |
| **模型管理** | SelectModelDirectory | app.go:659-667 |
| **模型管理** | SelectModelFile | app.go:670-678 |
| **模型管理** | GetModelInfo | app.go:682-690 |
| **导出功能** | ExportResult | app.go:715-738 |
| **AI模板** | GetAITemplates | app.go:744-773 |
| **AI模板** | GetTemplateManagerInfo | app.go:779-788 |
| **路径管理** | GetAppRootDirectory | app.go:130-133 |

## 接口列表

### 1. 选择音频文件

**接口名称**: `SelectAudioFile`

**功能描述**: 打开文件选择对话框，让用户选择音频文件。该方法内部已配置了支持的音频文件类型过滤器。

**请求参数**: 无

**内部配置**:
- 支持的音频格式: mp3, wav, m4a, ogg, flac, wma, aac
- 文件过滤器: "音频文件 (*.mp3, *.wav, *.m4a, *.ogg, *.flac, *.wma, *.aac)"

**响应数据**:
```json
{
  "success": boolean,
  "error": string, // 仅当success为false时存在
  "file": { // 仅当success为true时存在
    "name": string,        // 文件名
    "path": string,        // 文件完整路径
    "size": number,        // 文件大小(字节)
    "type": string,        // MIME类型
    "duration": number,    // 音频时长(秒)
    "lastModified": number // 最后修改时间戳
  }
}
```

**错误响应示例**:
```json
{
  "success": false,
  "error": "未选择文件"
}
```

---

### 2. 获取音频文件时长

**接口名称**: `GetAudioDuration`

**功能描述**: 获取指定音频文件的真实时长（使用FFmpeg分析）

**请求参数**:
- `filePath`: string - 音频文件路径

**响应数据**:
```json
{
  "success": boolean,
  "duration": number, // 音频时长(秒)，仅当success为true时存在
  "filePath": string, // 文件路径，仅当success为true时存在
  "error": string     // 错误信息，仅当success为false时存在
}
```

**错误处理**:
- 服务未初始化时返回错误
- 文件不存在或格式不支持时返回错误
- FFmpeg不可用时返回错误

---

### 3. 开始语音识别

**接口名称**: `StartRecognition`

**功能描述**: 开始对选定的音频文件进行语音识别，支持文件路径和Base64数据两种输入方式

**请求参数**:
```json
{
  "filePath": string,                 // 音频文件路径(可选，与fileData二选一)
  "fileData": string,                 // Base64编码的文件数据(可选，拖拽功能使用)
  "language": string,                 // 识别语言(可选，默认使用配置中的语言)
  "options": {                        // 识别选项(可选)
    "confidenceThreshold": number,     // 置信度阈值
    "enableWordTimestamp": boolean     // 是否启用词汇时间戳
  },
  "specificModelFile": string         // 用户指定的具体模型文件路径(可选)
}
```

**响应数据**:
```json
{
  "success": boolean,
  "result": { // 仅当success为true时存在
    "id": string,                      // 识别结果ID
    "language": string,                // 识别语言
    "text": string,                    // 识别文本
    "timestampedText": string,         // 带时间戳的识别文本
    "segments": [                      // 识别结果段落
      {
        "start": number,               // 开始时间(秒)
        "end": number,                 // 结束时间(秒)
        "text": string,                // 文本内容
        "confidence": number,          // 置信度
        "words": [Word],               // 词汇信息
        "metadata": {}                 // 元数据
      }
    ],
    "words": [                         // 词汇级结果
      {
        "text": string,                // 词汇内容
        "start": number,               // 开始时间(秒)
        "end": number,                 // 结束时间(秒)
        "confidence": number,          // 置信度
        "speaker": string              // 说话人(可选)
      }
    ],
    "duration": number,                // 音频时长(秒)
    "confidence": number,              // 整体置信度
    "processedAt": string,             // 处理时间(ISO格式)
    "metadata": {}                     // 元数据
  },
  "error": { // 仅当success为false时存在
    "code": string,                    // 错误代码
    "message": string,                 // 错误消息
    "details": string                  // 错误详情
  }
}
```

**错误代码**:
- `RECOGNITION_IN_PROGRESS`: 语音识别正在进行中
- `MODEL_NOT_FOUND`: Whisper模型文件未找到
- `MODEL_LOAD_FAILED`: Whisper模型加载失败
- `AUDIO_FILE_NOT_FOUND`: 音频文件未找到
- `INVALID_AUDIO_FORMAT`: 不支持的音频格式
- `AUDIO_PROCESS_FAILED`: 音频处理失败
- `RECOGNITION_FAILED`: Whisper语音识别失败
- `FILE_VALIDATION_FAILED`: 文件验证失败

**特性**:
- 支持文件路径和Base64数据两种输入方式
- 支持拖拽文件功能
- 支持指定具体模型文件
- 异步处理，通过事件机制返回进度和结果

---

### 4. 停止语音识别

**接口名称**: `StopRecognition`

**功能描述**: 停止当前正在进行的语音识别

**请求参数**: 无

**响应数据**:
```json
{
  "success": boolean,
  "result": {}, // 仅当success为true时存在，空对象
  "error": { // 仅当success为false时存在
    "code": string,    // 错误代码
    "message": string, // 错误消息
    "details": string  // 错误详情
  }
}
```

**错误代码**:
- `NO_RECOGNITION_IN_PROGRESS`: 没有正在进行的语音识别

---

### 5. 获取识别状态

**接口名称**: `GetRecognitionStatus`

**功能描述**: 获取当前语音识别状态和服务信息

**请求参数**: 无

**响应数据**:
```json
{
  "isRecognizing": boolean,        // 是否正在识别
  "serviceReady": boolean,         // 识别服务是否就绪
  "supportedLanguages": [string]   // 支持的语言列表
}
```

**支持的语言列表**:
- `zh-CN`: 中文(简体)
- `en-US`: 英语(美国)
- `ja`: 日语
- `ko`: 韩语
- `es`: 西班牙语
- `fr`: 法语
- `de`: 德语
- `it`: 意大利语
- `pt`: 葡萄牙语
- `ru`: 俄语
- `ar`: 阿拉伯语
- `hi`: 印地语

---

### 6. 获取应用配置

**接口名称**: `GetConfig`

**功能描述**: 获取当前应用配置

**请求参数**: 无

**响应数据**: JSON字符串格式的配置对象
```json
{
  "language": string,                    // 识别语言
  "modelPath": string,                   // 模型路径
  "specificModelFile": string,           // 具体指定的模型文件
  "sampleRate": number,                   // 采样率
  "bufferSize": number,                   // 缓冲区大小
  "confidenceThreshold": number,          // 置信度阈值
  "maxAlternatives": number,              // 最大候选数
  "enableWordTimestamp": boolean,         // 启用词汇时间戳
  "enableNormalization": boolean,         // 启用音频归一化
  "enableNoiseReduction": boolean         // 启用噪声抑制
}
```

---

### 7. 更新应用配置

**接口名称**: `UpdateConfig`

**功能描述**: 更新应用配置并保存到文件

**请求参数**: JSON字符串格式的配置对象
```json
{
  "language": string,                    // 识别语言
  "modelPath": string,                   // 模型路径
  "specificModelFile": string,           // 具体指定的模型文件
  "sampleRate": number,                   // 采样率
  "bufferSize": number,                   // 缓冲区大小
  "confidenceThreshold": number,          // 置信度阈值
  "maxAlternatives": number,              // 最大候选数
  "enableWordTimestamp": boolean,         // 启用词汇时间戳
  "enableNormalization": boolean,         // 启用音频归一化
  "enableNoiseReduction": boolean         // 启用噪声抑制
}
```

**响应数据**:
```json
{
  "success": boolean,
  "result": {}, // 仅当success为true时存在，空对象
  "error": { // 仅当success为false时存在
    "code": string,    // 错误代码
    "message": string, // 错误消息
    "details": string  // 错误详情
  }
}
```

**错误代码**:
- `INVALID_CONFIG`: 配置格式无效

---

### 8. 加载语音模型

**接口名称**: `LoadModel`

**功能描述**: 加载指定语言的Whisper语音模型

**请求参数**:
1. `language`: string - 语言代码
2. `modelPath`: string - 模型路径

**响应数据**:
```json
{
  "success": boolean,
  "result": {}, // 仅当success为true时存在，空对象
  "error": { // 仅当success为false时存在
    "code": string,    // 错误代码
    "message": string, // 错误消息
    "details": string  // 错误详情
  }
}
```

**错误代码**:
- `MODEL_NOT_FOUND`: Whisper模型文件未找到
- `MODEL_LOAD_FAILED`: Whisper模型加载失败
- `RECOGNITION_FAILED`: 语音识别服务未初始化

---

### 9. 选择模型文件夹

**接口名称**: `SelectModelDirectory`

**功能描述**: 打开文件夹选择对话框，让用户选择包含Whisper模型的文件夹

**请求参数**: 无

**响应数据**:
```json
{
  "success": boolean,
  "path": string,          // 选择的路径，仅当success为true时存在
  "models": [              // 模型列表，仅当success为true时存在
    {
      "name": string,      // 模型名称
      "path": string,      // 模型文件路径
      "size": number,      // 文件大小
      "sizeFormatted": string, // 格式化文件大小
      "language": string,  // 支持的语言
      "description": string // 模型描述
    }
  ],
  "error": string          // 错误信息，仅当success为false时存在
}
```

---

### 10. 选择模型文件

**接口名称**: `SelectModelFile`

**功能描述**: 打开文件选择对话框，让用户选择Whisper模型文件

**请求参数**: 无

**响应数据**:
```json
{
  "success": boolean,
  "filePath": string,     // 文件路径，仅当success为true时存在
  "fileName": string,     // 文件名，仅当success为true时存在
  "modelPath": string,    // 模型目录，仅当success为true时存在
  "fileSize": number,     // 文件大小，仅当success为true时存在
  "fileSizeStr": string,  // 格式化文件大小，仅当success为true时存在
  "error": string         // 错误信息，仅当success为false时存在
}
```

---

### 11. 获取模型信息

**接口名称**: `GetModelInfo`

**功能描述**: 获取指定目录下模型的详细信息

**请求参数**:
- `directory`: string - 模型目录路径

**响应数据**:
```json
{
  "success": boolean,
  "models": [              // 模型信息列表，仅当success为true时存在
    {
      "name": string,      // 模型名称
      "path": string,      // 模型路径
      "size": number,      // 文件大小
      "sizeFormatted": string, // 格式化大小
      "type": string,      // 模型类型
      "language": string,  // 支持语言
      "description": string, // 描述
      "isValid": boolean   // 是否为有效模型
    }
  ],
  "totalModels": number,   // 模型总数，仅当success为true时存在
  "validModels": number,   // 有效模型数，仅当success为true时存在
  "recommendations": [     // 推荐模型列表，仅当success为true时存在
    {
      "name": string,      // 推荐模型名称
      "path": string,      // 推荐模型路径
      "reason": string     // 推荐理由
    }
  ],
  "error": string          // 错误信息，仅当success为false时存在
}
```

---

### 12. 导出识别结果

**接口名称**: `ExportResult`

**功能描述**: 将识别结果导出为指定格式

**请求参数**:
1. `resultJSON`: string - JSON格式的识别结果
2. `format`: string - 导出格式(txt/srt/vtt/json)
3. `outputPath`: string - 输出文件路径

**响应数据**:
```json
{
  "success": boolean,
  "result": {}, // 仅当success为true时存在，空对象
  "error": { // 仅当success为false时存在
    "code": string,    // 错误代码
    "message": string, // 错误消息
    "details": string  // 错误详情
  }
}
```

**错误代码**:
- `SERVICE_NOT_INITIALIZED`: 导出服务未初始化
- `INVALID_EXPORT_FORMAT`: 不支持的导出格式
- `EXPORT_FAILED`: 导出失败
- `PERMISSION_DENIED`: 文件写入权限被拒绝

**支持的导出格式**:
- `txt`: 纯文本格式
- `srt`: SRT字幕格式
- `vtt`: WebVTT字幕格式
- `json`: JSON格式

---

### 13. 获取AI提示词模板

**接口名称**: `GetAITemplates`

**功能描述**: 获取所有可用的AI提示词模板

**请求参数**: 无

**响应数据**:
```json
{
  "success": boolean,
  "templates": {           // 模板集合，仅当success为true时存在
    "templateKey": {
      "name": string,      // 模板名称
      "description": string, // 模板描述
      "template": string   // 模板内容
    }
  },
  "default": string         // 默认模板键，仅当success为true时存在
}
```

---

### 14. 获取模板管理器信息

**接口名称**: `GetTemplateManagerInfo`

**功能描述**: 获取模板管理器的状态信息

**请求参数**: 无

**响应数据**:
```json
{
  "success": boolean,
  "availableKeys": [string], // 可用模板键列表，仅当success为true时存在
  "isLoaded": boolean        // 是否已加载，仅当success为true时存在
}
```

---

### 15. 获取应用根目录

**接口名称**: `GetAppRootDirectory`

**功能描述**: 获取应用程序的根目录路径

**请求参数**: 无

**响应数据**: `string` - 应用根目录路径

**说明**:
- 自动检测运行环境（开发环境、便携版、安装版）
- 支持在.app包内正确识别项目根目录
- 用于相对路径计算和资源定位

---

### 16. 处理文件拖放

**接口名称**: `OnFileDrop`

**功能描述**: 处理Wails原生文件拖放事件

**请求参数**:
- `files`: string[] - 拖放的文件路径列表

**响应**: 无直接返回，通过事件机制发送结果

---

## 事件通知

应用通过事件机制向前端发送识别进度和结果通知：

### 1. 识别进度事件

**事件名称**: `recognition_progress`

**事件数据**:
```json
{
  "currentTime": number,    // 当前处理时间(秒)
  "totalTime": number,      // 总时间(秒)
  "percentage": number,     // 完成百分比
  "status": string,         // 状态描述
  "wordsPerSec": number     // 识别速度(词/秒)
}
```

### 2. 识别结果事件

**事件名称**: `recognition_result`

**事件数据**: 识别结果对象，格式与`StartRecognition`接口返回的result字段相同

### 3. 识别完成事件

**事件名称**: `recognition_complete`

**事件数据**: 识别响应对象，格式与`StartRecognition`接口返回相同

### 4. 识别错误事件

**事件名称**: `recognition_error`

**事件数据**: 错误对象，格式与`StartRecognition`接口返回的error字段相同

### 5. 识别停止事件

**事件名称**: `stopped`

**事件数据**: null

### 6. 文件拖放成功事件

**事件名称**: `file-dropped`

**事件数据**:
```json
{
  "success": boolean,
  "file": {
    "name": string,         // 文件名
    "path": string,         // 文件路径
    "size": number,         // 文件大小
    "sizeFormatted": string, // 格式化文件大小
    "extension": string,    // 文件扩展名
    "hasPath": boolean      // 是否有有效路径
  }
}
```

### 7. 文件拖放错误事件

**事件名称**: `file-drop-error`

**事件数据**:
```json
{
  "error": string,      // 错误类型
  "message": string,    // 错误消息
  "file": string        // 相关文件路径
}
```

---

## 错误代码参考

### 模型相关错误
- `MODEL_NOT_FOUND`: 模型文件未找到
- `MODEL_LOAD_FAILED`: 模型加载失败

### 音频处理错误
- `AUDIO_FILE_NOT_FOUND`: 音频文件未找到
- `INVALID_AUDIO_FORMAT`: 不支持的音频格式
- `AUDIO_PROCESS_FAILED`: 音频处理失败
- `FILE_VALIDATION_FAILED`: 文件验证失败

### 识别相关错误
- `RECOGNITION_FAILED`: 语音识别失败
- `RECOGNITION_IN_PROGRESS`: 识别正在进行中
- `NO_RECOGNITION_IN_PROGRESS`: 没有正在进行的识别

### 系统相关错误
- `FFMPEG_NOT_FOUND`: FFmpeg未找到
- `PERMISSION_DENIED`: 权限被拒绝
- `DISK_SPACE_FULL`: 磁盘空间不足

### 配置相关错误
- `INVALID_CONFIG`: 配置格式无效

---

## 前端调用示例

```javascript
// 导入Wails生成的API
import {
  StartRecognition,
  StopRecognition,
  GetRecognitionStatus,
  SelectModelDirectory,
  SelectModelFile,
  GetAudioDuration,
  GetAITemplates
} from '../wailsjs/go/main/App';

// 开始识别（支持拖拽文件）
const startRecognition = async (filePath = null, fileData = null, language) => {
  const request = {
    filePath: filePath,
    fileData: fileData,           // Base64数据（拖拽时使用）
    language: language || 'zh-CN',
    options: {
      confidenceThreshold: 0.5,
      enableWordTimestamp: true
    },
    specificModelFile: null       // 可选：指定具体模型文件
  };

  try {
    const response = await StartRecognition(request);
    if (response.success) {
      console.log('识别已启动');
    } else {
      console.error('启动失败:', response.error.message);
    }
  } catch (error) {
    console.error('调用失败:', error);
  }
};

// 选择模型文件夹
const selectModelDirectory = async () => {
  try {
    const result = await SelectModelDirectory();
    if (result.success) {
      console.log('选择的路径:', result.path);
      console.log('找到的模型:', result.models);
    } else {
      console.error('选择失败:', result.error);
    }
  } catch (error) {
    console.error('调用失败:', error);
  }
};

// 获取音频时长
const getAudioDuration = async (filePath) => {
  try {
    const result = await GetAudioDuration(filePath);
    if (result.success) {
      console.log(`音频时长: ${result.duration}秒`);
    } else {
      console.error('获取时长失败:', result.error);
    }
  } catch (error) {
    console.error('调用失败:', error);
  }
};

// 获取AI模板
const getAITemplates = async () => {
  try {
    const result = await GetAITemplates();
    if (result.success) {
      console.log('可用模板:', Object.keys(result.templates));
      console.log('默认模板:', result.default);
    }
  } catch (error) {
    console.error('调用失败:', error);
  }
};

// 监听识别进度事件
window.runtime.EventsOn("recognition_progress", (progress) => {
  console.log(`识别进度: ${progress.percentage}% - ${progress.status}`);
});

// 监听识别结果事件
window.runtime.EventsOn("recognition_result", (result) => {
  console.log('识别结果:', result);
  console.log('识别文本:', result.text);
});

// 监听文件拖放事件
window.runtime.EventsOn("file-dropped", (data) => {
  if (data.success) {
    console.log('拖放文件:', data.file);
    // 可以直接使用拖放的文件数据进行识别
    startRecognition(null, data.file.base64Data);
  }
});

window.runtime.EventsOn("file-drop-error", (data) => {
  console.error('拖放错误:', data.message);
});
```

---

## 注意事项

### 1. 异步操作和并发控制
- 所有API调用都是异步的，返回Promise对象
- 同时只能进行一个语音识别任务
- 前端应实现适当的并发控制逻辑

### 2. 错误处理
- 每个API调用都应包含适当的错误处理逻辑
- 参考错误代码表进行分类处理
- 建议向用户显示友好的错误消息

### 3. 文件处理
- 支持文件路径和Base64数据两种输入方式
- 注意跨平台路径分隔符差异
- 处理大文件时考虑内存使用

### 4. 事件监听管理
- 前端应在组件挂载时注册事件监听器
- 在组件卸载时取消监听，避免内存泄漏
- 建议使用防抖处理高频事件

### 5. 模型管理
- 模型文件应存储在`models/whisper/`目录下
- 支持多种Whisper模型大小
- 可以为不同任务指定不同的模型文件

### 6. 路径管理
- 应用自动适应不同运行环境
- 使用相对路径时注意工作目录
- 路径管理器处理跨平台兼容性

### 7. 性能优化
- 长音频建议分段处理
- 合理设置置信度阈值
- 及时清理临时文件

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-17 | 初始版本，包含基本接口 |
| 2.0.0 | 2025-01-17 | 更新为Whisper引擎，支持多语言 |
| 2.1.0 | 2025-01-20 | 添加模型管理接口 |
| 2.2.0 | 2025-01-20 | 添加AI模板接口 |
| 2.3.0 | 2025-01-20 | 添加文件拖拽支持 |
| 2.4.0 | 2025-01-20 | 重构路径管理，模块化架构 |
| 2.5.0 | 2025-01-20 | 添加音频时长获取接口 |