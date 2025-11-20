#!/bin/bash

# 完整的应用打包脚本
# 包含所有必要的依赖：FFmpeg、Whisper CLI、模型文件等

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 项目配置
PROJECT_NAME="tingshengbianzi"
APP_NAME="听声辨字"
OUTPUT_DIR="$PROJECT_ROOT/release"
FFMPEG_DIR="$PROJECT_ROOT/third-party/bin"
MODELS_DIR="$PROJECT_ROOT/models"

echo -e "${BLUE}🚀 ${APP_NAME} - 完整打包脚本${NC}"
echo "========================================"
echo "📁 项目根目录: $PROJECT_ROOT"
echo "📦 输出目录: $OUTPUT_DIR"

# 1. 清理旧的构建文件
log_step "清理旧的构建文件..."
rm -rf "$OUTPUT_DIR"
rm -rf "$PROJECT_ROOT/build/bin"
mkdir -p "$OUTPUT_DIR"

# 2. 优化图标质量
log_step "优化图标质量..."
if [ -f "$SCRIPT_DIR/fix-icons-simple.sh" ]; then
    "$SCRIPT_DIR/fix-icons-simple.sh"
    log_info "✅ 图标优化完成"
elif [ -f "$SCRIPT_DIR/optimize-icons.sh" ]; then
    "$SCRIPT_DIR/optimize-icons.sh"
    log_info "✅ 高质量图标优化完成"
else
    log_warn "图标优化脚本不存在，使用基础图标修复"
    "$SCRIPT_DIR/fix-all-icons.sh" --no-rebuild
fi

# 3. 打包FFmpeg依赖
log_step "打包FFmpeg依赖..."
if "$SCRIPT_DIR/bundle-ffmpeg.sh"; then
    log_info "✅ FFmpeg依赖打包成功"
else
    log_error "❌ FFmpeg依赖打包失败"
    exit 1
fi

# 4. 验证Whisper CLI
log_step "验证Whisper CLI..."
WHISPER_CLI="$PROJECT_ROOT/backend/recognition/whisper-cli"
if [ ! -f "$WHISPER_CLI" ]; then
    log_error "Whisper CLI不存在: $WHISPER_CLI"
    exit 1
fi

WHISPER_SIZE=$(stat -f%z "$WHISPER_CLI" 2>/dev/null || echo "unknown")
log_info "Whisper CLI: $WHISPER_SIZE bytes"

# 5. 检查模型文件
log_step "检查Whisper模型文件..."
if [ ! -d "$MODELS_DIR" ] || [ -z "$(ls -A "$MODELS_DIR/whisper" 2>/dev/null)" ]; then
    log_warn "未找到Whisper模型文件，开始下载..."
    "$SCRIPT_DIR/download-models.sh"
else
    MODEL_COUNT=$(ls -1 "$MODELS_DIR/whisper"/*.bin 2>/dev/null | wc -l)
    log_info "找到 $MODEL_COUNT 个Whisper模型"
fi

# 6. 构建应用
log_step "构建Wails应用..."
cd "$PROJECT_ROOT"
export PATH=$PATH:~/go/bin

# 检查目标平台
OS=$(uname -s)
ARCH=$(uname -m)

if [[ "$OS" == "Darwin" ]]; then
    if [[ "$ARCH" == "arm64" ]]; then
        TARGET="darwin/arm64"
    else
        TARGET="darwin/amd64"
    fi
elif [[ "$OS" == "Linux" ]]; then
    TARGET="linux/amd64"
else
    log_error "不支持的操作系统: $OS"
    exit 1
fi

log_info "构建目标: $TARGET"

# 执行构建 (production is default)
wails build -platform "$TARGET" -clean

if [ $? -ne 0 ]; then
    log_error "Wails构建失败"
    exit 1
fi

log_info "✅ Wails构建成功"

# 7. 复制依赖到发布目录
log_step "复制依赖文件到发布目录..."

BUILT_APP="$PROJECT_ROOT/build/bin/${PROJECT_NAME}.app"
RELEASE_APP="$OUTPUT_DIR/${PROJECT_NAME}.app"

# 复制主应用
cp -R "$BUILT_APP" "$RELEASE_APP"
log_info "✅ 复制应用包"

# 复制FFmpeg到应用包的Resources目录
APP_RESOURCES="$RELEASE_APP/Contents/Resources"
if [ -d "$FFMPEG_DIR" ]; then
    cp -R "$FFMPEG_DIR" "$APP_RESOURCES/"
    log_info "✅ 复制FFmpeg依赖"
else
    log_warn "FFmpeg目录不存在，跳过复制"
fi

# 复制Whisper CLI到应用包的Resources目录
cp "$WHISPER_CLI" "$APP_RESOURCES/"
log_info "✅ 复制Whisper CLI"

# 注意：模型文件不打包到应用内部，用户需要在设置中指定模型目录
log_info "ℹ️ 模型文件不打包到应用内部，用户需要在设置中指定模型目录"
if [ -d "$MODELS_DIR" ]; then
    log_info "✅ 本地模型目录验证通过: $MODEL_COUNT 个模型"
    # 创建模型目录说明文件
    cat > "$APP_RESOURCES/models-info.txt" << EOF
Whisper模型文件说明
===================

本应用不内置Whisper模型文件，请按以下步骤配置：

1. 在应用设置中指定模型目录路径
2. 或将模型文件放置在以下位置之一：
   - ~/Library/Application Support/听声辨字/models/
   - 应用同目录的models/文件夹

支持的模型文件：
- ggml-base.bin (推荐，平衡速度和精度)
- ggml-small.bin (更快，精度稍低)
- ggml-large-v3-turbo.bin (最高精度)

模型下载：
- 运行 ./scripts/download-models.sh
- 或从 https://huggingface.co/ggerganov/whisper.cpp 下载
EOF
else
    log_warn "本地模型目录不存在，请确保用户有模型文件"
    # 创建模型目录说明文件
    cat > "$APP_RESOURCES/models-info.txt" << EOF
Whisper模型文件说明
===================

本应用不内置Whisper模型文件，请按以下步骤配置：

1. 运行 ./scripts/download-models.sh 下载模型
2. 在应用设置中指定模型目录路径
3. 或手动将模型文件放置在：
   - ~/Library/Application Support/听声辨字/models/

必须的模型文件：
- ggml-base.bin (推荐)
- ggml-small.bin
- ggml-large-v3-turbo.bin

下载地址：https://huggingface.co/ggerganov/whisper.cpp
EOF
fi

# 复制配置文件到应用包的Resources目录
CONFIG_DIR="$PROJECT_ROOT/config"
if [ -d "$CONFIG_DIR" ]; then
    cp -R "$CONFIG_DIR" "$APP_RESOURCES/"
    log_info "✅ 复制配置文件"
fi

# 8. 设置可执行权限
log_step "设置可执行权限..."
chmod 755 "$RELEASE_APP/Contents/MacOS/$PROJECT_NAME"
chmod 755 "$APP_RESOURCES/whisper-cli"
if [ -d "$APP_RESOURCES/third-party/bin" ]; then
        chmod 755 "$APP_RESOURCES/third-party/bin/ffmpeg"
        chmod 755 "$APP_RESOURCES/third-party/bin/ffprobe"
    log_info "✅ FFmpeg权限设置完成"
fi
log_info "✅ 所有必要权限设置完成"

# 9. 创建便携版（非.app包）
log_step "创建便携版..."
PORTABLE_DIR="$OUTPUT_DIR/${PROJECT_NAME}-portable"
mkdir -p "$PORTABLE_DIR"

# 复制可执行文件
cp "$RELEASE_APP/Contents/MacOS/$PROJECT_NAME" "$PORTABLE_DIR/"
# 复制所有资源（除了已删除的模型目录）
cp -R "$APP_RESOURCES" "$PORTABLE_DIR/"
log_info "✅ 便携版创建完成"

# 创建启动脚本
cat > "$PORTABLE_DIR/start.sh" << 'EOF'
#!/bin/bash
# 听声辨字便携版启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🎵 启动听声辨字便携版..."
./tingshengbianzi
EOF
chmod +x "$PORTABLE_DIR/start.sh"

# 10. 验证打包结果
log_step "验证打包结果..."

# 检查应用包结构
echo -e "${BLUE}📋 应用包结构:${NC}"
find "$RELEASE_APP/Contents" -type f | head -20

# 检查关键文件
echo ""
echo -e "${BLUE}📋 关键文件检查:${NC}"
KEY_FILES=(
    "$RELEASE_APP/Contents/MacOS/$PROJECT_NAME"
    "$APP_RESOURCES/whisper-cli"
    "$APP_RESOURCES/third-party/bin/ffmpeg"
    "$APP_RESOURCES/config/user-config.json"
    "$APP_RESOURCES/models-info.txt"
)

for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || echo "unknown")
        echo "   ✅ $(basename "$file"): $size bytes"
    else
        echo "   ❌ $(basename "$file"): 缺失"
    fi
done

# 模型文件说明
echo ""
echo -e "${BLUE}📋 模型文件配置:${NC}"
echo "   ℹ️ 模型文件不内置在应用中"
echo "   ℹ️ 用户需要在设置中指定模型目录"
if [ -f "$APP_RESOURCES/models-info.txt" ]; then
    echo "   ✅ 模型配置说明文件已创建"
else
    echo "   ❌ 模型配置说明文件缺失"
fi

# 11. 创建说明文档
log_step "创建说明文档..."
cat > "$OUTPUT_DIR/README.md" << EOF
# ${APP_NAME} - 完整版

## 使用说明

### macOS应用包版本
1. 双击 \`${PROJECT_NAME}.app\` 启动应用
2. 或使用命令行: \`open ${PROJECT_NAME}.app\`

### 便携版
1. 进入 \`${PROJECT_NAME}-portable\` 目录
2. 运行 \`./start.sh\` 启动应用

## 功能特点

- 🎵 支持多种音频格式 (MP3, WAV, M4A, OGG, FLAC)
- 🕐 精确的时间戳标记
- 🤖 AI 文本优化功能
- 📝 多种导出格式 (TXT, SRT, VTT, JSON)
- 🔄 完全离线运行，无需网络连接

## 已包含的依赖

- ✅ FFmpeg (音频处理)
- ✅ Whisper CLI (语音识别)
- ✅ Whisper 模型文件
- ✅ 所有配置文件

## 配置文件位置

- 应用包版本: \`${PROJECT_NAME}.app/Contents/Resources/config/\`
- 便携版: \`${PROJECT_NAME}-portable/Resources/config/\`

用户配置将自动保存到: \`~/Library/Application Support/听声辨字/user-config.json\`

## 故障排除

1. **权限问题**: 确保应用有执行权限
2. **模型文件**: 检查 \`Resources/models/whisper/\` 目录下有 \`.bin\` 文件
3. **FFmpeg问题**: 检查 \`Resources/third-party/bin/\` 目录下有可执行文件
4. **配置重置**: 删除用户配置文件重新启动应用

## 版本信息

- 构建时间: $(date)
- 目标平台: $TARGET
- Go版本: $(go version | awk '{print $3}')
EOF

# 12. 显示打包结果
log_step "打包完成！"
echo ""
echo "📁 发布目录: $OUTPUT_DIR"
echo ""
echo "📊 发布内容:"
ls -la "$OUTPUT_DIR/"
echo ""

# 计算总大小
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo "📦 总大小: $TOTAL_SIZE"

echo ""
echo "🚀 使用说明:"
echo "1. 应用包版本: open $OUTPUT_DIR/${PROJECT_NAME}.app"
echo "2. 便携版: cd $OUTPUT_DIR/${PROJECT_NAME}-portable && ./start.sh"
echo ""

# 13. 询问是否启动测试
read -p "是否立即启动测试应用？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_step "启动应用测试..."
    open "$RELEASE_APP"
    log_info "应用已启动，请测试语音识别功能"
fi

echo ""
echo -e "${GREEN}🎉 完整打包完成！${NC}"
echo -e "${BLUE}💡 提示: 首次启动可能需要一些时间来初始化模型${NC}"