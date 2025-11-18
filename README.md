# 听声辨字 - 智能音频识别工具

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-%3E%3D1.23-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)

一个基于Go语言、Wails v2和Whisper引擎的跨平台桌面音频识别应用，支持多种音频格式识别，生成精确时间戳的文本结果，并提供强大的AI文本优化功能。

## ✨ 核心特性

### 🎵 音频处理
- **多格式支持** - 支持 MP3、WAV、M4A、AAC、OGG、FLAC 等主流音频格式
- **拖拽操作** - 原生文件拖拽支持，点击文件框任意区域选择文件
- **智能验证** - 自动音频格式验证和文件大小限制（最大100MB）
- **实时时长计算** - 精确计算音频时长，支持多种估算方法

### 🎤 语音识别
- **Whisper引擎** - 基于OpenAI Whisper.cpp，高精度离线语音识别
- **多模型支持** - 支持Tiny、Base、Small、Large、Large-v3-turbo等多种Whisper模型
- **多语言识别** - 支持中文、英文等多种语言，可切换识别语言
- **时间戳精度** - 提供词汇级精确时间戳，支持细颗粒度时间标记
- **智能去重** - 自动去除重复识别内容，优化长音频识别结果

### 🤖 AI文本优化
- **模板系统** - 内置多种AI优化模板，支持自定义提示词
- **智能处理** - 自动文本预处理和质量报告生成
- **实时优化** - 提供可复制的AI优化提示词，支持外部AI工具集成
- **多模板切换** - 基础优化、字幕制作、会议记录等专业模板

### 💻 用户界面
- **现代Vue.js架构** - 基于Vue.js 3 + Vite + Pinia的现代前端架构
- **响应式设计** - 适配不同屏幕尺寸，支持深色/浅色主题
- **实时进度** - 详细的识别进度显示，包含时间和状态信息
- **拖拽交互** - 友好的文件拖拽界面，支持点击任意区域选择文件

## 🛠️ 技术架构

### 后端技术栈
- **核心框架**: Wails v2.11.0 (Go + Web技术)
- **语音识别**: Whisper.cpp API
- **音频处理**: FFmpeg + 原生音频处理
- **模型管理**: 动态模型加载和配置管理
- **配置系统**: JSON配置文件 + 实时同步

### 前端技术栈
- **框架**: Vue.js 3.3.0 + Composition API
- **构建工具**: Vite 5.0
- **状态管理**: Pinia 2.1.0
- **组件化**: 模块化Vue组件设计
- **样式系统**: CSS变量 + 响应式设计

### 关键组件
- **FileDropZone** - 文件拖拽和选择组件
- **ProgressBar** - 实时进度显示组件
- **ResultDisplay** - 结果展示和导出组件
- **SettingsModal** - 配置管理组件

## 📋 系统要求

### 开发环境
- **Go**: 1.23 或更高版本
- **Node.js**: 16.0 或更高版本
- **npm**: 8.0 或更高版本
- **FFmpeg**: 4.0 或更高版本（支持音频格式转换）

### 运行环境
- **操作系统**: Windows 10+ / macOS 10.15+ / Linux (Ubuntu 18.04+)
- **内存**: 4GB RAM 或更高（推荐8GB+）
- **存储**: 1GB 磁盘空间（包含Whisper模型）

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd audio-recognizer
```

### 2. 环境安装

#### macOS系统
```bash
# 安装Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装依赖
brew install go node ffmpeg

# 安装Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH=$PATH:~/go/bin
```

#### Ubuntu/Debian系统
```bash
# 安装Go
wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装FFmpeg
sudo apt-get update
sudo apt-get install ffmpeg

# 安装Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
export PATH=$PATH:~/go/bin
```

#### Windows系统
```powershell
# 使用Chocolatey安装依赖
choco install golang nodejs ffmpeg

# 安装Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 3. 下载Whisper模型
```bash
# 推荐使用自动下载脚本
./scripts/download-models.sh

# 或手动下载Base模型（推荐）
mkdir -p models/whisper
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/whisper/ggml-base.bin

# Large-v3-turbo模型（最新推荐）
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin -o models/whisper/ggml-large-v3-turbo.bin
```

### 4. 启动开发环境
```bash
# 启动开发服务器（支持热重载）
export PATH=$PATH:~/go/bin
wails dev

# 或使用便捷脚本
./start-dev.sh
```

开发服务器特性：
- 🔥 **热重载** - 代码修改后自动刷新
- 🐛 **调试模式** - 内置开发者工具
- 📝 **实时日志** - 浏览器控制台显示详细日志
- 🎨 **实时预览** - UI更改即时生效

## 🏗️ 构建与部署

### 开发构建
```bash
# 构建调试版本
wails build -debug

# 使用图标优化的构建脚本
./scripts/build-with-icons.sh
```

### 生产构建
```bash
# 构建生产版本
wails build -production

# 跨平台构建
wails build -platform darwin/amd64 -production    # macOS Intel
wails build -platform darwin/arm64 -production    # macOS Apple Silicon
wails build -platform windows/amd64 -production   # Windows
wails build -platform linux/amd64 -production     # Linux
```

### 图标管理
```bash
# 生成多平台图标
./scripts/generate-icons.sh

# 修复开发模式图标
./scripts/fix-dev-icon.sh
```

## 📁 项目架构

```
audio-recognizer/
├── 📁 backend/                      # 后端Go代码
│   ├── audio/                       # 音频处理模块
│   │   └── processor.go             # FFmpeg音频处理器
│   ├── recognition/                 # 语音识别模块
│   │   ├── service.go               # 识别服务接口
│   │   ├── whisper_service.go       # Whisper实现
│   │   └── mock_service.go          # 模拟服务
│   ├── models/                      # 数据模型
│   │   ├── recognition.go           # 识别结果模型
│   │   └── errors.go                # 错误定义
│   └── utils/                       # 工具函数
│       ├── ffmpeg_manager.go        # FFmpeg管理
│       ├── time_utils.go            # 时间工具
│       └── text_utils.go            # 文本工具
├── 📁 frontend/                     # 前端Vue.js代码
│   ├── src/                         # 源代码
│   │   ├── components/              # Vue组件
│   │   │   ├── FileDropZone.vue     # 文件拖拽组件
│   │   │   ├── ProgressBar.vue      # 进度条组件
│   │   │   ├── ResultDisplay.vue    # 结果展示组件
│   │   │   ├── SettingsModal.vue    # 设置模态框
│   │   │   ├── ToastContainer.vue   # 通知容器
│   │   │   └── ToastMessage.vue     # 消息提示
│   │   ├── composables/             # Vue组合式函数
│   │   │   ├── useAudioFile.js      # 音频文件处理
│   │   │   ├── useWails.js          # Wails API集成
│   │   │   ├── useSettings.js       # 设置管理
│   │   │   └── useToast.js          # 通知管理
│   │   ├── stores/                  # Pinia状态管理
│   │   │   └── toast.js             # 通知存储
│   │   ├── utils/                   # 前端工具
│   │   │   ├── timeFormatter.js     # 时间格式化
│   │   │   ├── fineGrainedTimestamps.js # 细粒度时间戳
│   │   │   └── aiOptimizer.js       # AI优化工具
│   │   ├── assets/                  # 静态资源
│   │   │   └── icons/               # 应用图标
│   │   ├── App.vue                  # 主应用组件
│   │   └── main-vue.js              # 前端入口
│   ├── index.html                   # HTML模板
│   └── package.json                 # 前端依赖
├── 📁 models/                       # Whisper模型文件
├── 📁 config/                       # 配置文件（开发环境）
│   ├── user-config.json            # 用户配置文件
│   └── templates.json               # AI优化模板配置
├── 📁 scripts/                      # 工具脚本
│   ├── download-models.sh           # 模型下载脚本
│   ├── generate-icons.sh            # 图标生成脚本
│   ├── build-with-icons.sh          # 带图标的构建脚本
│   └── fix-dev-icon.sh              # 开发模式图标修复
├── 📁 tests/                        # 测试文件
├── app.go                           # Wails应用主入口
├── main.go                          # Go程序入口
├── wails.json                       # Wails配置文件
└── README.md                        # 项目文档
```

## ⚙️ 配置系统

### 🔧 配置文件保存规则

听声辨字应用采用智能环境检测机制，根据运行环境自动选择配置保存位置：

#### 📂 开发环境配置位置
当应用检测到项目开发环境（存在 `go.mod` 和 `wails.json` 文件）时：
```
📁 项目根目录/config/
├── 📄 user-config.json     # 主配置文件
└── 📄 templates.json       # AI优化模板
```

#### 📂 生产环境配置位置
当应用独立部署（如安装在 Applications 目录）时：
```
📁 ~/Library/Application Support/听声辨字/
├── 📄 user-config.json     # 主配置文件
├── 📄 templates.json       # AI优化模板（自动复制）
└── 📁 models/              # Whisper模型目录
    └── 📁 whisper/
        └── 📄 ggml-base.bin # 用户下载的模型文件
```

#### 🔄 自动配置机制
- **智能检测**：应用启动时自动检测运行环境
- **模板复制**：生产环境首次运行时自动复制内置AI模板
- **配置同步**：前端设置变化实时同步到配置文件
- **路径适配**：模型路径自动适配不同的配置位置

### 📋 配置文件详解

#### 主配置文件 (user-config.json)
```json
{
  "language": "zh-CN",                    // 识别语言 (zh-CN, en, ja, ko等)
  "modelPath": "./models",                 // 模型文件路径（相对或绝对路径）
  "specificModelFile": "",                  // 指定特定模型文件（留空则自动选择）
  "sampleRate": 16000,                       // 音频采样率 (Hz)
  "bufferSize": 4000,                        // 音频处理缓冲区大小
  "confidenceThreshold": 0.5,                // 置信度阈值 (0.0-1.0)
  "maxAlternatives": 1,                       // 最大识别候选数量
  "enableWordTimestamp": true,               // 启用词级时间戳
  "enableNormalization": true,                // 启用音频标准化处理
  "enableNoiseReduction": false,             // 启用噪声抑制
  "aiTemplate": "timestamp_accurate"         // 默认AI优化模板类型
}
```

#### AI优化模板 (templates.json)
```json
{
  "basic": {
    "name": "基础优化",
    "description": "基本的文本清理和标点修正",
    "template": "请优化以下音频识别结果..."
  },
  "timestamp_accurate": {
    "name": "时间精确优化",
    "description": "以发音接近原则修正，严格保持时间标记准确性",
    "template": "请对以下带时间标记的语音识别结果进行精确优化..."
  },
  "subtitle": {
    "name": "字幕优化",
    "description": "专门针对字幕格式的优化",
    "template": "请将以下音频识别结果优化为适合字幕显示的格式..."
  }
}
```

### 💾 配置管理功能

#### 配置保存和加载
- **自动保存**：用户在界面修改设置后自动保存
- **实时同步**：前端设置变化立即同步到后端配置文件
- **安全备份**：重要配置建议定期备份

#### 配置重置
```bash
# 删除用户配置目录，恢复默认设置
rm -rf ~/Library/Application\ Support/听声辨字/
```

#### 配置迁移
```bash
# 从开发环境迁移配置到生产环境
cp audio-recognizer/config/user-config.json ~/Library/Application\ Support/听声辨字/
```

### 🔍 配置验证
应用启动时会显示配置文件路径：
```
📂 配置文件路径: /Users/用户名/Library/Application Support/听声辨字/user-config.json
✅ 已加载用户配置文件
```

## 🎯 使用流程

### 1. 音频文件选择
- **拖拽方式**: 直接将音频文件拖拽到应用窗口
- **点击选择**: 点击文件选择区域任意位置选择文件
- **按钮选择**: 点击"选择文件"按钮通过对话框选择

### 2. 语音识别
- 自动检测音频格式和时长
- 支持多种Whisper模型
- 实时显示识别进度
- 生成精确的时间戳

### 3. 结果处理
- **文本显示**: 显示识别文本和分段信息
- **时间戳**: 词汇级精确时间戳
- **导出功能**: 支持TXT、SRT、VTT、JSON格式导出
- **AI优化**: 提供AI文本优化建议

## 🔧 高级功能

### 细粒度时间戳
- 基于词汇级时间戳生成更精确的时间标记
- 支持自定义分段长度和时间插值
- 适用于字幕制作和精确时间定位

### AI文本优化
- 多种专业模板支持
- 自动文本预处理和质量分析
- 可复制优化提示词到外部AI工具
- 支持批量文本优化

### 配置管理
- 实时配置同步
- 用户配置持久化
- 支持运行时配置更新
- 模型路径和参数自定义

## 🐛 故障排除

### 常见问题

#### 1. 拖拽文件不工作
```bash
# 检查文件格式是否支持
# 确保文件在100MB以内
# 尝试点击文件选择区域
```

#### 2. Whisper模型未加载
```bash
# 检查模型文件是否存在
ls -la models/whisper/

# 重新下载模型
./scripts/download-models.sh
```

#### 3. 开发模式图标不显示
```bash
# 修复开发模式图标
./scripts/fix-dev-icon.sh

# 重新生成图标
./scripts/generate-icons.sh
```

#### 4. FFmpeg未找到
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载
```

#### 5. 配置文件问题

##### 配置保存位置错误
**问题**：配置文件保存到了错误的位置
**解决方案**：
```bash
# 检查应用启动日志中的配置路径
# 开发环境应显示：{项目根目录}/config/user-config.json
# 生产环境应显示：~/Library/Application Support/听声辨字/user-config.json

# 手动创建用户配置目录（生产环境）
mkdir -p ~/Library/Application\ Support/听声辨字/
```

##### 配置文件损坏或丢失
```bash
# 恢复默认配置
rm -rf ~/Library/Application\ Support/听声辨字/
# 重启应用将自动创建默认配置
```

##### 模型路径配置错误
```bash
# 检查配置文件中的modelPath设置
# 开发环境示例："modelPath": "./models"
# 生产环境示例："modelPath": "~/models" 或 "/path/to/models"

# 验证模型文件是否存在
ls -la ~/Library/Application\ Support/听声辨字/models/whisper/
```

#### 6. AI优化模板丢失
```bash
# 检查AI模板文件
ls -la ~/Library/Application\ Support/听声辨字/templates.json

# 如果不存在，重启应用会自动复制内置模板
# 或手动从项目目录复制：
cp audio-recognizer/config/templates.json ~/Library/Application\ Support/听声辨字/
```

## 📄 许可证

本项目采用 MIT 许可证。软件完全免费，严禁任何商家或个人进行贩卖获利！

---

**让音频识别变得简单高效！** 🎵➡️📝

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

### 开发规范
- 遵循Go代码规范
- Vue.js组件使用Composition API
- 提交前运行测试
- 更新相关文档

---

**网站**: [administrator.wiki](https://administrator.wiki)
**邮箱**: [zshchance@qq.com](mailto:zshchance@qq.com)