# 语音识别应用后端接口文档

## 概述

本文档描述了语音识别应用的前后端交互接口。该应用基于Wails框架构建，使用Go语言作为后端，前端通过JavaScript调用后端API。

**语音识别引擎**: 本应用使用OpenAI的Whisper语音识别模型，支持多种语言的音频转文本功能。Whisper模型具有高准确率和强大的多语言支持能力，能够自动识别音频中的语言并进行转换。

**模型支持**: 应用支持多种Whisper模型大小（tiny、base、small、medium、large、large-v2、large-v3），默认使用base模型。模型文件存储在`models/whisper/`目录下。

## 接口实现位置

所有后端接口均在 `app.go` 文件中实现，具体位置如下：

| 接口名称 | 实现位置 |
|---------|---------|
| SelectAudioFile | app.go:259-340 |
| StartRecognition | app.go:98-140 |
| StopRecognition | app.go:176-195 |
| GetRecognitionStatus | app.go:197-209 |
| GetConfig | app.go:235-240 |
| UpdateConfig | app.go:211-233 |
| LoadModel | app.go:242-257 |
| ExportResult | app.go:342-397 |

## 接口列表

### 1. 选择音频文件

**接口名称**: `SelectAudioFile`

**实现位置**: app.go:259-340

**功能描述**: 打开文件选择对话框，让用户选择音频文件。该方法内部已配置了支持的音频文件类型过滤器。

**请求参数**: 无

**内部配置**: 
- 支持的音频格式: mp3, wav, m4a, ogg, flac
- 文件过滤器: "音频文件 (*.mp3, *.wav, *.m4a, *.ogg, *.flac)"

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

**实现说明**: 该接口使用系统原生文件选择对话框，自动过滤支持的音频文件类型。获取文件后，会自动尝试获取音频时长，如果无法获取则根据文件大小和格式进行估算。

---

### 2. 开始语音识别

**接口名称**: `StartRecognition`

**实现位置**: app.go:98-140

**功能描述**: 开始对选定的音频文件进行语音识别，使用Whisper引擎进行音频转文本处理

**请求参数**:
```json
{
  "filePath": string,                 // 音频文件路径
  "language": string,                 // 识别语言(可选，默认使用配置中的语言)
  "options": {                        // 识别选项(可选)
    "confidenceThreshold": number,     // 置信度阈值
    "enableWordTimestamp": boolean     // 是否启用词汇时间戳
  }
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

**Whisper特性**:
- 自动语言检测：当language参数设置为"auto"时，Whisper会自动检测音频中的语言
- 多语言支持：支持中文(zh-CN)、英文(en-US)、日语(ja)、韩语(ko)、西班牙语(es)、法语(fr)、德语(de)、意大利语(it)、葡萄牙语(pt)、俄语(ru)、阿拉伯语(ar)、印地语(hi)等
- 时间戳精度：提供词汇级精确时间戳，便于字幕生成

---

### 3. 停止语音识别

**接口名称**: `StopRecognition`

**实现位置**: app.go:176-195

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

### 4. 获取识别状态

**接口名称**: `GetRecognitionStatus`

**实现位置**: app.go:197-209

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

### 5. 获取应用配置

**接口名称**: `GetConfig`

**实现位置**: app.go:235-240

**功能描述**: 获取当前应用配置

**请求参数**: 无

**响应数据**: JSON字符串格式的配置对象
```json
{
  "language": string,              // 识别语言
  "modelPath": string,             // 模型路径(默认: ./models)
  "sampleRate": number,             // 采样率
  "bufferSize": number,             // 缓冲区大小
  "confidenceThreshold": number,    // 置信度阈值
  "maxAlternatives": number,        // 最大候选数
  "enableWordTimestamp": boolean    // 启用词汇时间戳
}
```

---

### 6. 更新应用配置

**接口名称**: `UpdateConfig`

**实现位置**: app.go:211-233

**功能描述**: 更新应用配置

**请求参数**: JSON字符串格式的配置对象
```json
{
  "language": string,              // 识别语言
  "modelPath": string,             // 模型路径(默认: ./models)
  "sampleRate": number,             // 采样率
  "bufferSize": number,             // 缓冲区大小
  "confidenceThreshold": number,    // 置信度阈值
  "maxAlternatives": number,        // 最大候选数
  "enableWordTimestamp": boolean    // 启用词汇时间戳
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

### 7. 加载语音模型

**接口名称**: `LoadModel`

**实现位置**: app.go:242-257

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

**Whisper模型说明**:
- Whisper使用单一多语言模型，不需要为每种语言单独加载模型
- 默认模型文件路径: `./models/whisper/ggml-base.bin`
- 支持的模型大小: tiny, base, small, medium, large, large-v2, large-v3

---

### 8. 导出识别结果

**接口名称**: `ExportResult`

**实现位置**: app.go:342-397

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
- `INVALID_EXPORT_FORMAT`: 不支持的导出格式
- `EXPORT_FAILED`: 导出失败
- `PERMISSION_DENIED`: 文件写入权限被拒绝

**支持的导出格式**:
- `txt`: 纯文本格式
- `srt`: SRT字幕格式
- `vtt`: WebVTT字幕格式
- `json`: JSON格式

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
  "percentage": number,      // 完成百分比
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

---

## 前端调用示例

```javascript
// 导入Wails生成的API
import { StartRecognition, StopRecognition, GetRecognitionStatus } from '../wailsjs/go/main/App';

// 开始识别
const startRecognition = async (filePath, language) => {
  const request = {
    filePath: filePath,
    language: language || 'zh-CN', // Whisper支持多种语言
    options: {
      confidenceThreshold: 0.5,
      enableWordTimestamp: true
    }
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

// 获取识别状态
const checkStatus = async () => {
  try {
    const status = await GetRecognitionStatus();
    console.log('识别状态:', status);
    console.log('支持的语言:', status.supportedLanguages);
  } catch (error) {
    console.error('获取状态失败:', error);
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
```

---

## 注意事项

1. **异步操作**: 所有API调用都是异步的，返回Promise对象
2. **错误处理**: 每个API调用都应包含适当的错误处理逻辑
3. **并发控制**: 同时只能进行一个语音识别任务
4. **资源管理**: 长时间运行的应用应注意资源释放
5. **文件路径**: 在处理文件路径时，注意跨平台路径分隔符差异
6. **事件监听**: 前端应在组件挂载时注册事件监听器，在组件卸载时取消监听
7. **Whisper特性**: 
   - Whisper使用单一多语言模型，不需要为每种语言单独加载模型
   - 模型文件应存储在`models/whisper/`目录下
   - 支持自动语言检测，可将language参数设置为"auto"
   - 首次使用前需要下载Whisper模型文件，可通过`./scripts/download-models.sh`脚本下载

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-17 | 初始版本，包含所有基本接口 |
| 2.0.0 | 2025-01-17 | 更新为Whisper语音识别引擎，支持多语言自动检测，更新模型路径和错误代码 |