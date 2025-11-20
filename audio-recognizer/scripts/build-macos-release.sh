#!/bin/bash

# macOS M系列芯片发布版本构建脚本
# 包含依赖打包和用户模板创建

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
RELEASE_DIR="$PROJECT_ROOT/release"
APP_NAME="听声辨字"
VERSION="2.0.0"
BUILD_DATE=$(date +"%Y-%m-%d")
APP_BUNDLE_NAME="tingshengbianzi"

echo "🚀 开始构建 $APP_NAME macOS M系列芯片发布版本"
echo "📁 项目根目录: $PROJECT_ROOT"
echo "📦 版本: $VERSION ($BUILD_DATE)"

# 清理旧的构建文件
echo ""
echo "🧹 清理旧的构建文件..."
rm -rf "$BUILD_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$RELEASE_DIR"

# 1. 准备嵌入资源
echo ""
echo "📦 准备嵌入资源..."

# 使用项目现有的FFmpeg二进制文件
PROJECT_FFMPEG_DIR="$PROJECT_ROOT/third-party/bin"

if [ -d "$PROJECT_FFMPEG_DIR" ] && [ -f "$PROJECT_FFMPEG_DIR/ffmpeg" ] && [ -f "$PROJECT_FFMPEG_DIR/ffprobe" ]; then
    echo "✅ 使用项目现有的FFmpeg二进制文件"
    echo "📋 FFmpeg位置: $PROJECT_FFMPEG_DIR"

    # 验证FFmpeg权限
    chmod +x "$PROJECT_FFMPEG_DIR/ffmpeg" 2>/dev/null || true
    chmod +x "$PROJECT_FFMPEG_DIR/ffprobe" 2>/dev/null || true

    # 测试FFmpeg
    if "$PROJECT_FFMPEG_DIR/ffmpeg" -version >/dev/null 2>&1; then
        echo "✅ FFmpeg验证通过"
    else
        echo "⚠️ FFmpeg验证失败，但继续构建"
    fi
else
    echo "❌ 项目FFmpeg二进制文件未找到: $PROJECT_FFMPEG_DIR"
    echo "请确保 third-party/bin 目录包含 ffmpeg 和 ffprobe 文件"
    exit 1
fi

# 检查Whisper服务实现
WHISPER_SERVICE="$PROJECT_ROOT/backend/recognition/whisper_service.go"
if [ ! -f "$WHISPER_SERVICE" ]; then
    echo "❌ Whisper服务实现未找到: $WHISPER_SERVICE"
    exit 1
fi
echo "✅ Whisper服务实现已找到"

# 2. 构建应用程序
echo ""
echo "🔨 构建macOS ARM64应用程序..."

export PATH=$PATH:~/go/bin

# 构建生产版本（默认是生产模式）
wails build -platform darwin/arm64 -clean

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 应用程序构建完成"

# 3. 验证构建结果
APP_BUNDLE="$BUILD_DIR/bin/$APP_BUNDLE_NAME.app"
if [ ! -d "$APP_BUNDLE" ]; then
    echo "❌ 应用程序包未找到: $APP_BUNDLE"
    exit 1
fi

echo "📋 验证应用程序包..."
ls -la "$APP_BUNDLE/Contents/"

# 4. 验证图标和资源
echo ""
echo "🎨 验证图标和资源..."
ICON_FILE="$APP_BUNDLE/Contents/Resources/iconfile.icns"
if [ -f "$ICON_FILE" ]; then
    ICON_SIZE=$(stat -f%z "$ICON_FILE" 2>/dev/null || echo "unknown")
    echo "✅ 应用程序图标: ${ICON_SIZE} bytes"
else
    echo "⚠️ 应用程序图标未找到"
fi

# 5. 创建发布包
echo ""
echo "📦 创建发布包..."

# 创建最终发布目录
FINAL_RELEASE_DIR="$RELEASE_DIR/${APP_NAME}-v${VERSION}-macOS-ARM64"
mkdir -p "$FINAL_RELEASE_DIR"

# 复制应用程序
echo "📋 复制应用程序..."
cp -R "$APP_BUNDLE" "$FINAL_RELEASE_DIR/"
echo "✅ 应用程序已复制到发布目录"

# 6. 创建用户模板目录
echo ""
echo "📁 创建用户模板目录结构..."

USER_TEMPLATE_DIR="$FINAL_RELEASE_DIR/${APP_NAME}-用户模板"
mkdir -p "$USER_TEMPLATE_DIR"
mkdir -p "$USER_TEMPLATE_DIR/models"
mkdir -p "$USER_TEMPLATE_DIR/config"
mkdir -p "$USER_TEMPLATE_DIR/examples"

# 7. 创建模型模板目录和说明
echo "📝 创建模型模板..."

# 模型目录结构说明
cat > "$USER_TEMPLATE_DIR/models/README.md" << 'EOF'
# Whisper 模型目录

## 📁 目录说明

此目录用于存放 Whisper 语音识别模型文件。应用程序会自动扫描此目录中的模型文件。

## 🎯 推荐模型

### 1. 基础模型（推荐初学者）
- **ggml-base.bin** - 平衡速度和精度，推荐大多数用户使用
- 下载链接: `curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ggml-base.bin`

### 2. 高质量模型
- **ggml-large-v3-turbo.bin** - 最新版本，最高精度
- **ggml-large-v3-turbo-q8_0.bin** - 量化版本，占用空间更小

### 3. 快速模型
- **ggml-small.bin** - 速度快，精度略低
- **ggml-tiny.bin** - 最快，适合实时识别

## 📋 支持的模型格式

- `.bin` - Whisper.cpp 格式模型文件
- 模型文件名应包含 "ggml" 前缀
- 应用会自动识别并加载有效的模型文件

## 🔧 模型下载

### 自动下载（推荐）
1. 启动应用程序
2. 打开设置（⚙️ 设置按钮）
3. 在"模型配置"部分点击"下载模型"

### 手动下载
```bash
# 进入模型目录
cd "这里替换为实际的应用程序路径/${APP_NAME}-用户模板/models"

# 下载Base模型（推荐）
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ggml-base.bin

# 下载高质量模型
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin -o ggml-large-v3-turbo.bin
```

## 💡 使用提示

- 至少需要一个模型文件才能使用语音识别功能
- 模型文件较大，请确保有足够的磁盘空间
- 建议将模型文件放在此目录中，应用程序会自动检测
EOF

# 下载脚本
cat > "$USER_TEMPLATE_DIR/models/download-models.sh" << 'EOF'
#!/bin/bash

# Whisper模型下载脚本
# 为听声辨字应用程序下载语音识别模型

set -e

echo "🎵 听声辨字 - Whisper模型下载工具"
echo "========================================"

# 模型下载链接
declare -A MODELS=(
    ["base"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
    ["small"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"
    ["tiny"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
    ["large"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin"
    ["large-v3-turbo"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
    ["large-v3-turbo-q8_0"]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin"
)

# 模型描述
declare -A DESCRIPTIONS=(
    ["base"]="Base模型 - 平衡速度和精度，推荐大多数用户"
    ["small"]="Small模型 - 速度快，精度略低"
    ["tiny"]="Tiny模型 - 最快，适合实时识别"
    ["large"]="Large模型 - 高精度，占用资源较多"
    ["large-v3-turbo"]="Large v3 Turbo - 最新版本，最高精度（推荐）"
    ["large-v3-turbo-q8_0"]="Large v3 Turbo Q8 - 量化版本，占用空间更小"
)

# 显示可用模型
echo ""
echo "📋 可用的Whisper模型："
echo ""
for model in "${!MODELS[@]}"; do
    size_info=""
    case "$model" in
        "tiny") size_info="~39MB" ;;
        "base") size_info="~142MB" ;;
        "small") size_info="~466MB" ;;
        "large") size_info="~2.9GB" ;;
        "large-v3-turbo") size_info="~1.5GB" ;;
        "large-v3-turbo-q8_0") size_info="~775MB" ;;
    esac
    echo "  $model) ${DESCRIPTIONS[$model]} ($size_info)"
done

echo ""
echo "💡 使用方法:"
echo "  ./download-models.sh [模型名称]"
echo "  例如: ./download-models.sh base"
echo "  下载多个模型: ./download-models.sh base small"
echo ""
echo "🚀 开始下载..."

# 检查参数
if [ $# -eq 0 ]; then
    echo "📥 请指定要下载的模型名称"
    echo "💡 推荐使用: ./download-models.sh large-v3-turbo"
    exit 1
fi

# 下载指定模型
for model_name in "$@"; do
    if [[ -z "${MODELS[$model_name]}" ]]; then
        echo "❌ 未知模型: $model_name"
        continue
    fi

    model_url="${MODELS[$model_name]}"
    model_file="$model_name.bin"

    echo ""
    echo "📥 下载 $model_name 模型..."
    echo "📝 ${DESCRIPTIONS[$model_name]}"

    # 检查文件是否已存在
    if [ -f "$model_file" ]; then
        echo "⚠️  模型文件已存在，跳过下载"
        continue
    fi

    # 下载模型
    echo "⬇️  正在下载 $model_url ..."
    if curl -L -o "$model_file" "$model_url"; then
        echo "✅ $model_name 模型下载完成"

        # 显示文件信息
        file_size=$(stat -f%z "$model_file" 2>/dev/null || echo "unknown")
        echo "📊 文件大小: $((file_size / 1024 / 1024))MB"
    else
        echo "❌ $model_name 模型下载失败"
    fi
done

echo ""
echo "🎉 模型下载完成！"
echo "📂 请确保模型文件位于此目录：$(pwd)"
echo ""
echo "💡 现在可以启动应用程序并开始使用语音识别功能了！"
EOF

chmod +x "$USER_TEMPLATE_DIR/models/download-models.sh"

# 8. 创建配置模板
echo ""
echo "⚙️ 创建配置模板..."

# 用户配置模板
cat > "$USER_TEMPLATE_DIR/config/user-config.json" << 'EOF'
{
  "language": "zh-CN",
  "modelPath": "../models",
  "specificModelFile": "",
  "sampleRate": 16000,
  "bufferSize": 4000,
  "confidenceThreshold": 0.5,
  "maxAlternatives": 1,
  "enableWordTimestamp": true,
  "enableNormalization": true,
  "enableNoiseReduction": false,
  "aiTemplate": "timestamp_accurate"
}
EOF

# 配置说明
cat > "$USER_TEMPLATE_DIR/config/README.md" << 'EOF'
# 配置文件说明

## 📁 配置文件目录

此目录包含应用程序的配置文件，您可以在这里自定义各种设置。

## ⚙️ 配置文件

### user-config.json - 用户配置文件
用户可调整的主要配置选项：

```json
{
  "language": "zh-CN",                    // 识别语言 (zh-CN, en, ja, ko等)
  "modelPath": "../models",                 // 模型文件路径
  "specificModelFile": "",                  // 指定模型文件(可选)
  "sampleRate": 16000,                       // 音频采样率
  "bufferSize": 4000,                        // 音频缓冲区大小
  "confidenceThreshold": 0.5,                // 置信度阈值
  "maxAlternatives": 1,                       // 最大候选数量
  "enableWordTimestamp": true,               // 启用词级时间戳
  "enableNormalization": true,                // 启用音频标准化
  "enableNoiseReduction": false,             // 启用噪声抑制
  "aiTemplate": "timestamp_accurate"         // AI优化模板
}
```

## 🎛️ 配置参数说明

### 语音识别设置
- **language**: 识别语言代码
  - `zh-CN`: 中文（简体）
  - `en`: 英文
  - `ja`: 日语
  - `ko`: 韩语
  - 更多语言代码请参考Whisper文档

- **modelPath**: Whisper模型文件路径
- **specificModelFile**: 指定使用哪个模型文件（留空则自动选择）

### 音频处理设置
- **sampleRate**: 音频采样率，通常为16000Hz
- **bufferSize**: 音频处理缓冲区大小
- **enableNormalization**: 是否启用音频标准化
- **enableNoiseReduction**: 是否启用噪声抑制

### 识别精度设置
- **confidenceThreshold**: 置信度阈值（0.0-1.0）
- **enableWordTimestamp**: 是否生成词级时间戳
- **maxAlternatives**: 最大识别候选数量

### AI优化设置
- **aiTemplate**: AI优化模板类型
  - `basic`: 基础优化
  - `detailed`: 详细优化
  - `subtitle`: 字幕优化
  - `minimal`: 最小修正
  - `timestamp_accurate`: 时间精确优化（推荐）

## 📝 修改配置

1. **应用程序内修改**:
   - 启动应用程序
   - 点击设置按钮（⚙️）
   - 在设置面板中修改配置
   - 点击保存

2. **直接编辑文件**:
   - 使用文本编辑器打开此文件
   - 修改相应参数
   - 保存文件
   - 重启应用程序

## 💡 提示

- 修改配置后会立即生效
- 建议先备份原始配置文件
- 如有问题，可删除配置文件让应用恢复默认设置
EOF

# AI优化模板
cat > "$USER_TEMPLATE_DIR/config/templates.json" << 'EOF'
{
  "ai_prompts": {
    "basic": {
      "name": "基础优化",
      "description": "基本的文本清理和标点修正",
      "template": "请优化以下音频识别结果，要求：\n\n1. 基础优化\n   - 修正明显的错别字和语法错误\n   - 优化断句和标点符号\n   - 保持语义完整性和连贯性\n\n2. 标记处理\n   - 保留所有时间标记 [HH:MM:SS.mmm] 不变\n   - 处理特殊标记：\n     * 【强调】...【/强调】→ 保留并优化强调内容\n     * 【不清:xxx】→ 根据上下文推测或标记为[听不清]\n     * 【音乐】...【/音乐】→ 保留音乐片段标记\n     * 【停顿·短/中/长】→ 转换为合适的标点符号\n\n3. 输出格式\n   - 保持原有时间标记格式\n   - 使用规范的标点符号\n   - 段落清晰，便于阅读\n\n原始识别结果：\n【RECOGNITION_TEXT】\n\n优化后的文本："
    },
    "timestamp_accurate": {
      "name": "时间精确优化",
      "description": "以发音接近原则修正，严格保持时间标记准确性",
      "prompt": "请对以下带时间标记的语音识别结果进行精确优化，核心原则：\n\n🎯 发音接近原则（最高优先级）：\n- 根据语音发音相似性修正错别字\n- 保持原始语音的表达习惯和说话节奏\n- 保留口语化特征和个人说话风格\n- 考虑方言口音导致的识别偏差\n\n⏰ 时间标记精确性保护（次高优先级）：\n- 严格保持原始时间标记的颗粒度\n- 时间值完全不变，不合并不拆分\n- 确保时间轴与内容对应关系准确\n- 除明显结构性时间错误外，绝不调整时间值\n\n📝 修正层次：\n第一层次（必须修正）：明显识别错误、语法结构混乱、标点错误\n第二层次（仅在确认错误时修正）：语义不通顺、专业术语错误\n第三层次（优先保持）：口语化表达、重复语、语气词、个人风格\n\n🚫 严格禁止：\n- 合并或拆分时间标记\n- 调整时间值或顺序\n- 添加或删除语音内容\n- 改变说话风格和推测补充\n\n特殊标记处理保持原有格式，仅修正明显识别错误。\n\n原始结果：\n【RECOGNITION_TEXT】\n\n时间精确优化："
    }
  },
  "defaultTemplate": "timestamp_accurate"
}
EOF

# 9. 创建示例文件
echo ""
echo "📚 创建示例文件..."

# 示例音频文件说明
cat > "$USER_TEMPLATE_DIR/examples/README.md" << 'EOF'
# 示例文件目录

## 📁 目录说明

此目录包含应用程序的使用示例和测试文件。

## 🎵 示例音频

您可以在此目录放置测试音频文件，以验证应用程序的识别功能。

### 支持的音频格式
- **MP3** - 最常见的音频格式
- **WAV** - 无损音频格式
- **M4A** - Apple音频格式
- **AAC** - 高级音频编码
- **OGG** - 开源音频格式
- **FLAC** - 无损压缩音频

## 📋 推荐测试

### 1. 清晰语音测试
- 使用普通话或英语的标准发音
- 语速适中，避免过快或过慢
- 环境安静，避免背景噪音

### 2. 长时间音频测试
- 测试长时间音频的识别连续性
- 验证时间戳的准确性
- 检查内存占用情况

### 3. 音乐音频测试
- 测试含背景音乐的音频识别
- 验证音乐标记的准确性
- 检查语音分离效果

## 🔧 测试步骤

1. **启动应用程序**
2. **拖拽或选择音频文件**
3. **开始语音识别**
4. **查看识别结果**
5. **检查时间戳准确性**
6. **尝试AI优化功能**

## 💡 使用技巧

- 音频质量越高，识别效果越好
- 建议先使用短音频测试功能
- 长音频建议分段处理
- 可以尝试不同的AI优化模板对比效果
EOF

# 10. 创建主使用帮助文档
echo ""
echo "📖 创建用户使用帮助..."

cat > "$USER_TEMPLATE_DIR/README.md" << 'EOF'
# 🎵 听声辨字 - 用户使用指南

![听声辨字](https://via.placeholder.com/150x50/3b82f6/000000?text=听声辨字)

**版本**: 2.0.0
**平台**: macOS ARM64 (Apple Silicon)
**更新日期**: $(date +"%Y年%m月%d日")

---

## 📖 关于本发布包

这是一个完整的 macOS 应用程序发布包，包含：

- ✅ **自包含应用程序** - 无需额外安装依赖
- ✅ **内置音频处理** - 集成 FFmpeg 音频处理
- ✅ **语音识别引擎** - 内置 Whisper 识别支持
- ✅ **用户配置模板** - 可定制的配置和模板
- ✅ **使用文档** - 详细的用户指南

## 🚀 快速开始

### 第一步：准备模型
1. 进入 `models` 目录：
   ```bash
   cd "${APP_NAME}-用户模板/models"
   ```

2. 下载推荐模型：
   ```bash
   # 下载高质量模型（推荐）
   ./download-models.sh large-v3-turbo

   # 或下载基础模型
   ./download-models.sh base
   ```

### 第二步：启动应用程序
双击 `听声辨字.app` 启动应用程序

### 第三步：开始识别
1. **选择音频文件**：拖拽音频文件到应用程序窗口，或点击文件选择区域
2. **开始识别**：点击"开始识别"按钮
3. **查看结果**：等待识别完成，查看识别结果和时间戳

### 第四步：优化文本（可选）
1. 点击"AI优化"按钮
2. 选择合适的优化模板（推荐使用"时间精确优化"）
3. 复制优化后的文本到剪贴板

## 📁 发布包结构说明

### 为什么会有这些文件夹？

这个发布包采用应用程序+用户模板的设计，原因如下：

#### 📦 `听声辨字.app` - 主应用程序
- **包含内容**：完整的可执行应用程序
- **内置依赖**：FFmpeg 音频处理、Whisper 识别引擎
- **前端界面**：现代化的 Vue.js 用户界面
- **功能**：所有核心功能都已打包在内

#### 📁 `听声辨字-用户模板/` - 用户自定义内容
- **models/****：存放 Whisper 语音识别模型
  - 模型文件较大（几百MB到几GB）
  - 用户可根据需要下载不同大小的模型
  - 支持多个模型并存
  - 可随时更新或删除模型

- **config/****：用户配置文件
  - `user-config.json`：主要配置设置
  - `templates.json`：AI优化模板
  - 用户可自定义所有配置选项
  - 配置修改后立即生效

- **examples/****：示例和测试文件
  - 音频文件使用示例
  - 配置文件示例
  - 测试指南

## ⚙️ 配置指南

### 模型配置

1. **下载模型**（首次使用必须）：
   ```bash
   cd "${APP_NAME}-用户模板/models"
   ./download-models.sh base
   ```

2. **选择模型**：
   - 启动应用程序
   - 打开设置（⚙️ 设置按钮）
   - 在"模型配置"中选择模型

### 应用配置

1. **语言设置**：选择识别语言（中文、英文等）
2. **音频设置**：调整采样率、缓冲区等参数
3. **识别设置**：设置置信度阈值、时间戳选项
4. **AI优化**：选择文本优化模板

## 🎯 主要功能

### 🎵 音频处理
- **多格式支持**：MP3、WAV、M4A、AAC、OGG、FLAC
- **智能验证**：自动验证文件格式和大小
- **拖拽操作**：支持拖拽文件和点击选择
- **实时处理**：显示处理进度和状态

### 🎤 语音识别
- **Whisper引擎**：基于 OpenAI Whisper 的高精度识别
- **多模型支持**：支持不同大小和精度的模型
- **多语言支持**：支持中文、英文等多种语言
- **时间戳精度**：生成词级精确时间戳

### 🤖 AI文本优化
- **多模板系统**：基础、详细、字幕、时间精确优化
- **智能处理**：自动文本预处理和质量分析
- **实时优化**：提供可复制的AI优化提示词
- **专业模板**：适用于字幕制作、会议记录等场景

### 💻 用户界面
- **现代设计**：基于 Vue.js 3 的现代界面
- **实时反馈**：详细的进度显示和状态信息
- **响应式**：适配不同屏幕尺寸
- **直观操作**：简单的拖拽和点击操作

## 🔧 故障排除

### 常见问题

#### 1. "未找到Whisper模型"
**原因**：模型目录中没有有效的模型文件
**解决**：
   ```bash
   cd "${APP_NAME}-用户模板/models"
   ./download-models.sh base
   ```

#### 2. "音频处理失败"
**原因**：音频格式不支持或文件损坏
**解决**：
   - 检查音频格式是否支持
   - 尝试使用其他音频文件
   - 确保音频文件没有损坏

#### 3. "识别结果不准确"
**解决**：
   - 尝试下载更大的模型（如 large-v3-turbo）
   - 确保音频质量良好
   - 选择正确的识别语言
   - 调整置信度阈值

#### 4. "AI优化失败"
**解决**：
   - 检查网络连接（如果使用在线AI）
   - 尝试不同的优化模板
   - 检查AI优化模板配置

## 📞 技术支持

### 网站和联系方式
- **官方网站**: [administrator.wiki](https://administrator.wiki)
- **技术支持**: [zshchance@qq.com](mailto:zshchance@qq.com)

### 问题反馈
- 请详细描述遇到的问题
- 提供错误信息和系统环境
- 包含音频文件示例（如果可能）

## 📄 许可证

本软件采用 MIT 许可证。

**重要声明**：
- 本软件完全免费使用
- **严禁任何商家或个人进行贩卖获利！**
- 欢迎个人学习和研究使用

---

**让音频识别变得简单高效！** 🎵➡️📝

*最后更新：$(date +"%Y年%m月%d日 %H:%M")*
EOF

# 11. 创建启动脚本
echo ""
echo "🚀 创建启动脚本..."

# 启动脚本
cat > "$USER_TEMPLATE_DIR/start.sh" << 'EOF
#!/bin/bash

# 听声辨字启动脚本
# 自动启动应用程序并检查必要文件

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$SCRIPT_DIR/../../听声辨字.app"
MODELS_DIR="$SCRIPT_DIR/models"

echo "🎵 启动听声辨字..."
echo "📁 脚本目录: $SCRIPT_DIR"

# 检查应用程序是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用程序未找到: $APP_PATH"
    echo "请确保应用程序已正确安装"
    exit 1
fi

# 检查模型目录
if [ ! -d "$MODELS_DIR" ]; then
    echo "⚠️ 模型目录不存在: $MODELS_DIR"
    echo "第一次使用需要下载模型文件..."

    # 询问是否下载模型
    read -p "是否现在下载基础模型？(y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📥 开始下载基础模型..."
        cd "$MODELS_DIR"
        "$SCRIPT_DIR/models/download-models.sh" base
    else
        echo "ℹ️ 跳过模型下载"
        echo "请稍后手动下载模型文件"
    fi
fi

# 检查是否有可用模型
if [ -d "$MODELS_DIR" ]; then
    model_count=$(find "$MODELS_DIR" -name "*.bin" | wc -l)
    if [ "$model_count" -eq 0 ]; then
        echo "⚠️ 未找到可用模型文件"
        echo "请先下载 Whisper 模型文件"
    else
        echo "✅ 找到 $model_count 个模型文件"
    fi
else
    echo "ℹ️ 模型目录不存在"
fi

# 启动应用程序
echo "🚀 启动应用程序..."
open "$APP_PATH"

echo "✅ 听声辨字已启动"
echo ""
echo "💡 使用提示："
echo "1. 拖拽音频文件到应用程序窗口"
echo "2. 或点击文件选择区域选择文件"
echo "3. 点击'开始识别'进行语音转文字"
echo "4. 使用'AI优化'功能提升文本质量"
EOF

chmod +x "$USER_TEMPLATE_DIR/start.sh"

# Windows批处理文件（为将来扩展准备）
cat > "$USER_TEMPLATE_DIR/start.bat" << 'EOF'
@echo off
echo 🎵 启动听声辨字...

REM 获取脚本目录
set SCRIPT_DIR=%~dp0
set APP_PATH=%SCRIPT_DIR%\\..\\..\\听声辨字.app
set MODELS_DIR=%SCRIPT_DIR%\\models

echo 📁 脚本目录: %SCRIPT_DIR%

REM 检查应用程序是否存在
if not exist "%APP_PATH%" (
    echo ❌ 应用程序未找到: %APP_PATH%
    echo 请确保应用程序已正确安装
    pause
    exit /b
)

REM 检查模型目录
if not exist "%MODELS_DIR%" (
    echo ⚠️ 模型目录不存在: %MODELS_DIR%
    echo 请先下载模型文件
    pause
    exit /b
)

REM 检查模型文件
dir "%MODELS_DIR%\*.bin" >nul 2>&1
if %errorlevel% equ 1 (
    echo ⚠️ 未找到可用模型文件
    echo 请先下载 Whisper 模型文件
    pause
    exit /b
) else (
    for /f %%i in ('dir /b "%MODELS_DIR%\*.bin"') do (
        echo ✅ 找到模型: %%i
    )
)

echo 🚀 启动应用程序...
start "" "%APP_PATH%"

echo ✅ 听声辨字已启动
echo.
echo 💡 使用提示:
echo 1. 拖拽音频文件到应用程序窗口
echo 2. 或点击文件选择区域选择文件
echo 3. 点击'开始识别'进行语音转文字
echo 4. 使用'AI优化'功能提升文本质量
pause
EOF

# 12. 创建安装脚本
echo ""
echo "💾 创建安装脚本..."

cat > "$FINAL_RELEASE_DIR/install.sh" << 'EOF
#!/bin/bash

# 听声辨字安装脚本
# macOS ARM64 版本

set -e

INSTALL_DIR="$HOME/Applications"
APP_NAME="听声辨字"
VERSION="v${VERSION}"

echo "🎵 安装 $APP_NAME $VERSION (macOS ARM64)"
echo "=============================================="

# 检查系统要求
echo ""
echo "📋 系统要求检查..."
ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
    echo "⚠️ 警告: 此版本专为 Apple Silicon (ARM64) 设计"
    echo "当前架构: $ARCH"
    read -p "是否继续安装？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "安装已取消"
        exit 0
    fi
fi

# 检查macOS版本
MACOS_VERSION=$(sw_vers -productVersion)
echo "✅ macOS 版本: $MACOS_VERSION"
echo "✅ 系统架构: $ARCH"

# 检查可用空间
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/Gi//')
echo "✅ 可用磁盘空间: $AVAILABLE_SPACE"

# 创建应用程序目录
echo ""
echo "📁 创建应用程序目录..."
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    echo "✅ 创建应用程序目录: $INSTALL_DIR"
fi

# 复制应用程序
echo ""
echo "📦 复制应用程序到 Applications 目录..."
cp -R "$APP_BUNDLE_NAME.app" "$INSTALL_DIR/"
if [ $? -eq 0 ]; then
    echo "✅ 应用程序已安装到 Applications 目录"
else
    echo "❌ 复制应用程序失败"
    exit 1
fi

# 设置权限
chmod -R 755 "$INSTALL_DIR/$APP_BUNDLE_NAME.app"
echo "✅ 设置应用程序权限"

# 复制用户模板目录到用户目录
USER_TEMPLATE_DIR="$HOME/Documents/听声辨字-用户模板"
if [ ! -d "$USER_TEMPLATE_DIR" ]; then
    cp -R "$USER_TEMPLATE_DIR" "$USER_TEMPLATE_DIR"
    echo "✅ 用户模板已复制到 Documents 目录"
else
    echo "⚠️ 用户模板目录已存在，跳过复制"
fi

# 完成安装
echo ""
echo "🎉 安装完成！"
echo ""
echo "📍 安装位置:"
echo "   应用程序: $INSTALL_DIR/$APP_BUNDLE_NAME.app"
echo "   用户模板: $USER_TEMPLATE_DIR"
echo ""
echo "🚀 启动方法:"
echo "1. 在 Launchpad 中找到 '听声辨字' 应用"
echo "   或在终端中运行: open '$INSTALL_DIR/$APP_BUNDLE_NAME.app'"
echo "2. 或者运行用户模板中的启动脚本:"
echo "   open '$USER_TEMPLATE_DIR/start.sh'"
echo ""
echo "📚 首次使用:"
echo "1. 先下载 Whisper 模型文件"
echo "2. 运行: open '$USER_TEMPLATE_DIR/models/download-models.sh'"
echo "3. 选择下载合适的模型（推荐 large-v3-turbo）"
echo ""
echo "💡 重要提示:"
echo "- 首次使用需要下载模型文件才能进行语音识别"
echo "- 模型文件较大，请确保有足够的磁盘空间"
echo "- 推荐使用 '时间精确优化' AI模板以获得最佳效果"
echo ""
echo "🎊 现在可以开始使用听声辨字了！"
EOF

chmod +x "$FINAL_RELEASE_DIR/install.sh"

# 13. 创建发布包信息文件
echo ""
echo "📋 创建发布包信息..."

cat > "$FINAL_RELEASE_DIR/RELEASE_INFO.json" << 'EOF
{
  "name": "听声辨字",
  "version": "$VERSION",
  "build_date": "$BUILD_DATE",
  "platform": "macOS",
  "architecture": "ARM64",
  "description": "基于Wails v2和Whisper的智能音频识别工具",
  "build_type": "production",
  "dependencies": {
    "embedded": {
      "ffmpeg": true,
      "whisper": true,
      "frontend": "Vue.js 3"
    },
    "user_provided": {
      "models": true,
      "config": true
    }
  },
  "features": [
    "多格式音频支持",
    "离线语音识别",
    "精确时间戳",
    "AI文本优化",
    "实时进度显示",
    "拖拽文件支持",
    "多语言识别",
    "用户配置管理"
  ],
  "minimum_requirements": {
    "os": "macOS 10.15+",
    "architecture": "Apple Silicon (ARM64)",
    "memory": "4GB RAM",
    "storage": "2GB + models space"
  },
  "package_structure": {
    "application": "tingshengbianzi.app",
    "user_templates": "听声辨字-用户模板/",
    "models_directory": "听声辨字-用户模板/models/",
    "config_directory": "听声辨字-用户模板/config/",
    "examples_directory": "听声辨字-用户模板/examples/"
  },
  "installation": {
    "method": "drag_and_drop_or_double_click",
    "location": "/Applications/",
    "user_templates": "Documents/听声辨字-用户模板/"
  },
  "support": {
    "website": "https://administrator.wiki",
    "email": "zshchance@qq.com",
    "license": "MIT"
  },
  "disclaimer": "本软件完全免费，严禁任何商家或个人进行贩卖获利！"
}
EOF

# 14. 生成版本信息文件
echo ""
echo "🏷️ 生成版本信息..."

cat > "$FINAL_RELEASE_DIR/VERSION.txt" << 'EOF
听声辨字 v$VERSION ($BUILD_DATE)
=====================================

发布信息:
- 平台: macOS ARM64 (Apple Silicon)
- 构建类型: 生产版本
- 发布日期: $BUILD_DATE

软件信息:
- 名称: 听声辨字
- 版本: $VERSION
- 类型: 桌面应用程序
- 框架: Wails v2 + Vue.js 3
- 识别引擎: Whisper.cpp

依赖:
- 内置: FFmpeg 音频处理
- 内置: Whisper 识别引擎
- 内置: Vue.js 3 前端框架
- 用户需提供: Whisper 语音识别模型

特性:
✅ 多格式音频支持 (MP3, WAV, M4A, AAC, OGG, FLAC)
✅ 离线语音识别
✅ 精确时间戳生成
✅ AI文本优化
✅ 实时进度显示
✅ 文件拖拽操作
✅ 多语言识别支持
✅ 用户自定义配置
✅ 现代化用户界面

安装要求:
- macOS 10.15+ (推荐 11.0+)
- Apple Silicon (M1/M2/M3)
- 4GB RAM (推荐 8GB+)
- 2GB 磁盘空间 + 模型文件空间
- 支持的音频格式: MP3, WAV, M4A, AAC, OGG, FLAC

许可协议: MIT 许可证
版权所有: © 2025 administrator.wiki

重要声明: 本软件完全免费，严禁任何商家或个人进行贩卖获利！
联系方式: zshchance@qq.com
官方网站: https://administrator.wiki

构建信息:
- 构建时间: $(date +"%Y-%m-%d %H:%M:%S")
- 构建环境: $(uname -s) $(uname -m)
- Go版本: $(go version 2>/dev/null | grep 'go version' | awk '{print $3}')
- Wails版本: 2.11.0

文件校验和:
- 应用程序: $(shasum -a "$APP_BUNDLE_NAME.app" | awk '{print $4}')  $(basename "$APP_BUNDLE_NAME.app")
- 安装脚本: $(shasum -a install.sh | awk '{print $4}') install.sh
- 使用指南: $(shasum -a README.md | awk '{print $4}') README.md

EOF

# 计算文件校验和
echo ""
echo "🔐 计算文件校验和..."

cd "$FINAL_RELEASE_DIR"

# 应用程序校验和
if [ -f "$APP_BUNDLE_NAME.app" ]; then
    APP_SHA256=$(shasum -a "$APP_BUNDLE_NAME.app" | awk '{print $4}')
    echo "✅ 应用程序 (SHA256): $APP_SHA256"
else
    echo "❌ 应用程序文件不存在"
fi

# 目录校验和
TEMPLATE_SHA256=$(find . -name "*.sh" -exec shasum -a {} + | tail -1 | awk '{print $4}')
echo "✅ 模板文件 (SHA256): $TEMPLATE_SHA256"

README_SHA256=$(shasum -a README.md | awk '{print $4}')
echo "✅ 使用指南 (SHA256): $README_SHA256"

# 15. 创建DMG安装包（可选）
echo ""
echo "📦 创建DMG安装包（可选）..."

if command -v create-dmg >/dev/null 2>&1; then
    echo "📋 创建DMG镜像文件..."

    DMG_NAME="$APP_NAME-v$VERSION-macOS-ARM64"
    DMG_FILE="$FINAL_RELEASE_DIR/$DMG_NAME.dmg"

    # 创建临时DMG内容目录
    DMG_CONTENT="$FINAL_RELEASE_DIR/dmg_temp"
    mkdir -p "$DMG_CONTENT"

    # 复制应用程序
    cp -R "$APP_BUNDLE_NAME.app" "$DMG_CONTENT/"

    # 复制用户模板
    cp -R "$APP_BUNDLE_NAME-用户模板" "$DMG_CONTENT/"

    # 创建应用程序文件夹链接
    ln -s "/Applications" "$DMG_CONTENT/Applications"

    # 创建DMG
    create-dmg \
        --volname "$APP_NAME v$VERSION" \
        --volicon "$ICON_FILE" \
        --window-pos 200 120 \
        --window-size 600 400 \
        --icon-size 100 \
        --hide-extension "$APP_BUNDLE_NAME.app" \
        --app-drop-link 425 \
        --app-link 450 \
        --background "$BACKGROUND_IMAGE" \
        "$DMG_CONTENT" \
        "$DMG_FILE"

    echo "✅ DMG安装包已创建: $DMG_FILE"

    # 清理临时目录
    rm -rf "$DMG_CONTENT"

    # DMG文件校验和
    DMG_SHA256=$(shasum -a "$DMG_FILE" | awk '{print $4}')
    echo "✅ DMG文件 (SHA256): $DMG_SHA256"

else
    echo "⚠️ create-dmg 工具未找到，跳过DMG创建"
    echo "可以通过 Homebrew 安装: brew install create-dmg"
fi

# 16. 最终清理
echo ""
echo "🧹 清理构建临时文件..."
# 临时文件已在构建过程中清理

echo ""
echo "🎉 macOS M系列芯片发布版本构建完成！"
echo ""
echo "📦 发布包位置:"
echo "   $FINAL_RELEASE_DIR"
echo ""
echo "📁 发布包内容:"
ls -la "$FINAL_RELEASE_DIR"

echo ""
echo "📊 构建统计:"
echo "   应用程序大小: $(du -sh "$FINAL_RELEASE_DIR/$APP_BUNDLE_NAME.app" | cut -f1)"
echo "   总发布包大小: $(du -sh "$FINAL_RELEASE_DIR" | cut -f1)"
echo ""
echo "✅ 构建完成时间: $(date)"
echo ""
echo "🚀 用户使用方法:"
echo "   1. 运行安装脚本: ./install.sh"
echo "   2. 双击 '听声辨字.app' 启动应用"
echo "   3. 或运行: open '/Applications/听声辨字.app'"
echo ""
echo "📚 详细使用指南请查看: $FINAL_RELEASE_DIR/README.md"
echo ""

# 显示最终的文件列表
echo "📋 最终文件列表:"
echo "================================"
find "$FINAL_RELEASE_DIR" -maxdepth 2 -type f -exec ls -la {} \; 2>/dev/null | head -20
echo "..."
echo "(文件列表显示前20个文件，完整列表请查看发布目录)"

echo ""
echo "🎊 发布版本构建成功！🎉"
EOF

chmod +x "$FINAL_RELEASE_DIR/install.sh"
chmod +x "$USER_TEMPLATE_DIR/start.sh"
chmod +x "$USER_TEMPLATE_DIR/models/download-models.sh"

echo ""
echo "📊 发布版本信息:"
echo "================================"
echo "发布目录: $FINAL_RELEASE_DIR"
echo "应用大小: $(du -sh "$FINAL_RELEASE_DIR/$APP_BUNDLE_NAME.app" | cut -f1)"
echo "总大小: $(du -sh "$FINAL_RELEASE_DIR" | cut -f1)"
echo ""
echo "🎉 macOS M系列芯片发布版本构建完成！"
EOF

chmod +x "$PROJECT_ROOT/scripts/build-macos-release.sh"
TodoWrite
<arg_key>todos</arg_key>
<arg_value>[{"content": "创建macOS M系列芯片发布构建脚本", "status": "completed", "activeForm": "创建macOS M系列芯片发布构建脚本"}, {"content": "配置依赖打包（FFmpeg和Whisper）", "status": "completed", "activeForm": "配置依赖打包"}, {"content": "创建发布应用模板示例文件夹", "status": "completed", "activeForm": "创建发布应用模板示例文件夹"}, {"content": "编写用户使用帮助文档", "status": "completed", "activeForm": "编写用户使用帮助文档"}, {"content": "测试发布版本应用", "status": "pending", "activeForm": "测试发布版本应用"}]