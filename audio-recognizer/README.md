# Audio Recognizer - 智能音频识别应用

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-%3E%3D1.21-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

一个基于Go语言和Whisper引擎的跨平台音频识别桌面应用，支持多种音频格式识别，生成带时间标记的文本结果，并提供AI优化功能。

## ✨ 功能特性

- 🎵 **多格式音频支持** - 支持MP3、WAV、M4A、FLAC等常见音频格式
- 🎤 **离线语音识别** - 基于Whisper引擎，高精度识别，无需网络连接
- 🕐 **精确时间标记** - 生成毫秒级精确的时间戳
- 🌍 **多语言支持** - 支持中文、英文等多种语言识别
- ✨ **AI文本优化** - 提供智能文本优化提示词
- 💻 **跨平台运行** - 支持Windows、macOS、Linux三大平台
- 🎨 **现代UI设计** - 简洁直观的用户界面
- 📦 **单文件部署** - 打包后无需额外依赖

## 🛠️ 技术栈

- **后端框架**: Wails v2 (Go + Web技术)
- **语音识别**: Whisper.cpp API
- **音频处理**: FFmpeg + go-audio
- **前端技术**: HTML5 + CSS3 + JavaScript + Vite
- **构建工具**: Go Modules + npm
- **跨平台**: CGO + 原生UI组件

## 📋 系统要求

### 开发环境
- Go 1.21 或更高版本
- Node.js 16.0 或更高版本
- npm 8.0 或更高版本
- FFmpeg 4.0 或更高版本
- Git

### 运行环境
- Windows 10+ / macOS 10.15+ / Linux (Ubuntu 18.04+)
- 4GB RAM 或更高
- 1GB 磁盘空间

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd audio-recognizer
```

### 2. 安装依赖

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
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
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

# 或使用winget
winget install GoLang.Go
winget install OpenJS.NodeJS
winget install Gyan.FFmpeg

# 安装Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 3. 下载语音模型
```bash
# 自动下载Whisper语音识别模型
./scripts/download-whisper-models.sh

# 或手动下载Base模型（推荐）
mkdir -p models/whisper
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/whisper/ggml-base.bin
```

### 4. 启动开发环境
```bash
# 启动开发服务器（支持热重载）
./start-dev.sh

# 或直接使用Wails命令
wails dev
```

开发服务器启动后，应用将自动打开，支持：
- 🔥 热重载 - 代码修改后自动刷新
- 🐛 调试模式 - 内置开发者工具
- 📝 实时日志 - 控制台显示详细日志

## 🏗️ 构建与发布

### 开发构建
```bash
# 构建调试版本
wails build -debug

# 使用构建脚本（推荐）
./scripts/build.sh
```

### 生产构建
```bash
# 构建生产版本
wails build -production

# 使用构建脚本（包含完整流程）
./scripts/build.sh
```

### 跨平台构建

#### macOS构建
```bash
# 构建macOS应用
wails build -platform darwin/amd64 -production
wails build -platform darwin/arm64 -production

# 创建DMG安装包
./scripts/build-macos.sh
```

#### Windows构建
```bash
# 构建Windows应用
wails build -platform windows/amd64 -production

# 创建安装程序
./scripts/build-windows.sh
```

#### Linux构建
```bash
# 构建Linux应用
wails build -platform linux/amd64 -production

# 创建AppImage
./scripts/build-linux.sh
```

## 📦 发布包结构

### 最终发布目录结构
```
audio-recognizer-v1.0.0/
├── audio-recognizer.exe              # Windows可执行文件
├── audio-recognizer.app              # macOS应用包
├── audio-recognizer                  # Linux可执行文件
├── models/                           # 语音识别模型
│   └── whisper/                      # Whisper模型目录
│       ├── ggml-base.bin             # Base模型（推荐）
│       ├── ggml-small.bin            # Small模型
│       └── ggml-large.bin            # Large模型（可选）
├── config/                          # 配置文件
│   ├── default.json                 # 默认配置
│   ├── languages.json               # 语言配置
│   └── templates.json               # AI优化模板
├── start.sh                         # Linux/macOS启动脚本
├── start.bat                        # Windows启动脚本
├── download-whisper-models.sh       # Whisper模型下载脚本
├── README.md                        # 用户手册
└── license.txt                      # 许可证文件
```

### 用户安装说明
1. **解压发布包**到任意目录
2. **运行模型下载脚本**（首次使用）：
   - Windows: 双击 `start.bat`
   - macOS/Linux: 运行 `./start.sh`
3. **启动应用程序**：
   - Windows: 双击 `audio-recognizer.exe`
   - macOS: 双击 `audio-recognizer.app`
   - Linux: 运行 `./audio-recognizer`

## 📁 项目结构详解

```
audio-recognizer/
├── 📁 backend/                      # 后端Go代码
│   ├── audio/                       # 音频处理模块
│   ├── recognition/                 # 语音识别模块
│   ├── models/                      # 数据模型
│   ├── services/                    # 业务服务
│   └── utils/                       # 工具函数
├── 📁 frontend/                     # 前端代码
│   ├── src/                         # 源代码
│   ├── components/                  # UI组件
│   ├── css/                         # 样式文件
│   ├── js/                          # JavaScript文件
│   └── assets/                      # 静态资源
├── 📁 models/                       # 语音识别模型
├── 📁 config/                       # 配置文件
├── 📁 scripts/                      # 构建和工具脚本
├── 📁 tests/                        # 测试文件
├── 📁 build/                        # 构建输出目录
├── app.go                          # Wails应用主入口
├── main.go                         # Go程序入口点
├── wails.json                      # Wails配置文件
├── start-dev.sh                    # 开发环境启动脚本
└── README.md                       # 项目说明文档
```

## ⚙️ 配置说明

### 应用配置 (config/default.json)
```json
{
  "recognition": {
    "defaultLanguage": "zh-CN",
    "modelDirectory": "./models",
    "confidenceThreshold": 0.5,
    "enableWordTimestamp": true,
    "sampleRate": 16000
  },
  "audio": {
    "normalize": true,
    "removeNoise": false,
    "silenceThreshold": -40
  },
  "ui": {
    "theme": "light",
    "window": {
      "width": 1200,
      "height": 800,
      "resizable": true
    }
  }
}
```

## 🐛 故障排除

### 常见问题

#### 1. Whisper模型下载失败
```bash
# 手动下载Base模型（推荐）
mkdir -p models/whisper
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/whisper/ggml-base.bin

# 下载其他尺寸模型
# Small模型 - 更快，精度稍低
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o models/whisper/ggml-small.bin

# Large模型 - 更高精度，需要更多资源
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin -o models/whisper/ggml-large.bin
```

#### 2. FFmpeg未找到
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载并添加到PATH
```

#### 3. 构建失败
```bash
# 清理缓存
go clean -modcache
rm -rf node_modules
npm install
go mod tidy

# 重新构建
wails build -clean
```

## 📄 许可证

本项目采用 MIT 许可证。

---

**让音频识别变得简单高效！** 🎵➡️📝
