#!/bin/bash

# 音频识别程序构建脚本 - 嵌入FFmpeg版本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查依赖
check_dependencies() {
    log_step "检查构建依赖..."

    # 检查Go
    if ! command -v go &> /dev/null; then
        log_error "未找到Go，请先安装Go"
        exit 1
    fi

    # 检查FFmpeg（用于打包）
    if ! command -v ffmpeg &> /dev/null; then
        log_warn "未找到系统FFmpeg，将跳过依赖打包"
        return 0
    fi

    log_info "所有依赖检查通过"
}

# 清理构建目录
clean_build() {
    log_step "清理构建目录..."

    rm -rf "$PROJECT_ROOT/release"
    mkdir -p "$PROJECT_ROOT/release"

    log_info "构建目录已清理"
}

# 打包FFmpeg依赖
bundle_ffmpeg() {
    log_step "打包FFmpeg依赖..."

    if command -v ffmpeg &> /dev/null; then
        "$SCRIPT_DIR/bundle-ffmpeg.sh"
    else
        log_warn "系统未安装FFmpeg，跳过依赖打包"
        log_warn "程序将在运行时尝试查找系统FFmpeg"
    fi
}

# 安装Go依赖
install_go_deps() {
    log_step "安装Go依赖..."

    cd "$PROJECT_ROOT"
    go mod tidy

    log_info "Go依赖安装完成"
}

# 构建应用
build_app() {
    log_step "构建应用程序..."

    cd "$PROJECT_ROOT"

    # 获取操作系统信息
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    # 映射架构名称
    case "$ARCH" in
        "x86_64")
            GOARCH="amd64"
            ;;
        "arm64")
            GOARCH="arm64"
            ;;
        *)
            log_error "不支持的架构: $ARCH"
            exit 1
            ;;
    esac

    log_info "构建目标: $OS/$GOARCH"

    # 设置环境变量
    export GOOS="$OS"
    export GOARCH="$GOARCH"
    export CGO_ENABLED=1

    # 根据操作系统设置输出名称
    OUTPUT_NAME="audio-recognizer"
    if [[ "$OS" == "windows" ]]; then
        OUTPUT_NAME="audio-recognizer.exe"
    fi

    # 构建应用
    go build -ldflags="-s -w" -o "$OUTPUT_NAME" .

    if [[ $? -eq 0 ]]; then
        log_info "应用构建成功: $PROJECT_ROOT/$OUTPUT_NAME"
    else
        log_error "应用构建失败"
        exit 1
    fi
}

# 准备发布文件
prepare_release() {
    log_step "准备发布文件..."

    RELEASE_DIR="$PROJECT_ROOT/release"
    OUTPUT_NAME="audio-recognizer"
    if [[ $(uname -s) == "Windows" ]]; then
        OUTPUT_NAME="audio-recognizer.exe"
    fi

    # 复制可执行文件
    cp "$PROJECT_ROOT/$OUTPUT_NAME" "$RELEASE_DIR/"

    # 复制第三方依赖（如果存在）
    if [[ -d "$PROJECT_ROOT/third-party" ]]; then
        cp -r "$PROJECT_ROOT/third-party" "$RELEASE_DIR/"
        log_info "已复制第三方依赖"
    fi

    # 复制模型文件（如果存在）
    if [[ -d "$PROJECT_ROOT/models" ]]; then
        cp -r "$PROJECT_ROOT/models" "$RELEASE_DIR/"
        log_info "已复制语音模型"
    fi

    # 创建启动脚本（macOS/Linux）
    if [[ $(uname -s) != "Windows" ]]; then
        cat > "$RELEASE_DIR/run.sh" << 'EOF'
#!/bin/bash
# 音频识别程序启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🎵 启动音频识别程序..."
./audio-recognizer
EOF
        chmod +x "$RELEASE_DIR/run.sh"
        log_info "已创建启动脚本"
    fi

    # 创建说明文件
    cat > "$RELEASE_DIR/README.md" << EOF
# 音频识别程序

## 使用说明

1. **macOS/Linux**:
   - 方法一: 双击运行 \`./run.sh\`
   - 方法二: 终端运行 \`./audio-recognizer\`

2. **Windows**: 双击 \`audio-recognizer.exe\`

## 功能特点

- 🎵 支持多种音频格式 (MP3, WAV, M4A, OGG, FLAC)
- 🕐 精确的时间戳标记
- 🤖 AI 文本优化功能
- 📝 多种导出格式 (TXT, SRT, VTT, JSON)
- 🔄 离线运行，无需网络连接

## 依赖说明

本程序已内嵌 FFmpeg，无需额外安装依赖。如果系统已安装 FFmpeg，程序会优先使用系统版本。

## 故障排除

如果遇到 FFmpeg 相关错误，请检查：
1. 确认程序有执行权限
2. 检查 third-party 目录是否存在且包含必要的文件
3. 查看控制台输出的详细错误信息

EOF

    log_info "发布文件准备完成"
}

# 创建macOS应用包（可选）
create_macos_app() {
    if [[ $(uname -s) != "Darwin" ]]; then
        return 0
    fi

    read -p "是否创建macOS应用包? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi

    log_step "创建macOS应用包..."

    RELEASE_DIR="$PROJECT_ROOT/release"
    APP_DIR="$RELEASE_DIR/AudioRecognizer.app"

    # 创建应用包结构
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"

    # 复制可执行文件
    cp "$RELEASE_DIR/audio-recognizer" "$APP_DIR/Contents/MacOS/"

    # 复制依赖
    if [[ -d "$RELEASE_DIR/third-party" ]]; then
        cp -r "$RELEASE_DIR/third-party" "$APP_DIR/Contents/Resources/"
    fi

    # 复制模型
    if [[ -d "$RELEASE_DIR/models" ]]; then
        cp -r "$RELEASE_DIR/models" "$APP_DIR/Contents/Resources/"
    fi

    # 创建Info.plist
    cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>audio-recognizer</string>
    <key>CFBundleIdentifier</key>
    <string>com.audiorecognizer.app</string>
    <key>CFBundleName</key>
    <string>AudioRecognizer</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

    log_info "macOS应用包创建完成: $APP_DIR"
}

# 显示构建结果
show_result() {
    log_step "构建完成！"

    RELEASE_DIR="$PROJECT_ROOT/release"
    echo ""
    echo "📁 发布目录: $RELEASE_DIR"
    echo ""
    echo "📊 发布文件列表:"
    ls -la "$RELEASE_DIR/"
    echo ""
    echo "🎯 使用说明:"
    echo "1. 将整个 release 目录复制到目标机器"
    echo "2. 根据操作系统运行相应的可执行文件"
    echo "3. 程序已内嵌FFmpeg，无需额外安装依赖"
    echo ""
}

# 主函数
main() {
    log_info "开始音频识别程序构建流程..."

    # 解析参数
    local bundle_only=false

    for arg in "$@"; do
        case $arg in
            --bundle-only)
                bundle_only=true
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --bundle-only  仅打包FFmpeg依赖，不构建应用"
                echo "  --help         显示此帮助信息"
                exit 0
                ;;
        esac
    done

    # 执行构建步骤
    if [[ "$bundle_only" = false ]]; then
        check_dependencies
        clean_build
        bundle_ffmpeg
        install_go_deps
        build_app
        prepare_release
        create_macos_app
    else
        bundle_ffmpeg
    fi

    show_result
    log_info "🎉 所有构建任务完成！"
}

# 运行主函数
main "$@"