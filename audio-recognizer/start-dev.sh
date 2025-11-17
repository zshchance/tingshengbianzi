#!/bin/bash

# 开发环境启动脚本
set -e

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

# 检查环境
check_environment() {
    log_step "Checking development environment..."

    # 设置PATH
    export PATH=$PATH:~/go/bin

    # 检查必要工具
    if ! command -v wails &> /dev/null; then
        log_error "Wails CLI not found. Please install it first."
        exit 1
    fi

    if [ ! -d "models" ] || [ -z "$(ls -A models 2>/dev/null)" ]; then
        log_warn "Speech models not found. Downloading..."
        ./scripts/download-models.sh
    fi

    log_info "Environment check passed"
}

# 启动开发服务器
start_dev_server() {
    log_step "Starting Wails development server..."

    log_info "The development server will start with:"
    echo "  - Auto-reload on file changes"
    echo "  - Debug mode enabled"
    echo "  - Developer tools opened"
    echo "  - Hot module replacement for frontend"
    echo ""

    log_info "Press Ctrl+C to stop the development server"

    # 启动Wails开发模式
    wails dev
}

# 主函数
main() {
    log_info "Starting Audio Recognizer Development Environment..."
    echo ""

    check_environment
    start_dev_server
}

# 显示帮助信息
show_help() {
    echo "Audio Recognizer Development Scripts"
    echo ""
    echo "Usage:"
    echo "  ./start-dev.sh          Start development server"
    echo "  ./scripts/build.sh      Build production version"
    echo ""
    echo "Development Requirements:"
    echo "  - Go 1.21+"
    echo "  - Node.js 16+"
    echo "  - Wails CLI"
    echo "  - FFmpeg"
    echo ""
    echo "For more information, see README.md"
}

# 处理命令行参数
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for available options"
        exit 1
        ;;
esac