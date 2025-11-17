#!/bin/bash

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

# 检查依赖
check_dependencies() {
    log_step "Checking dependencies..."

    # 检查Go
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed"
        exit 1
    fi

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # 检查Wails
    if ! command -v wails &> /dev/null; then
        log_error "Wails CLI is not installed"
        exit 1
    fi

    # 检查FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        log_error "FFmpeg is not installed"
        exit 1
    fi

    log_info "All dependencies found"
}

# 清理构建目录
clean_build() {
    log_step "Cleaning build directory..."

    if [ -d "build" ]; then
        rm -rf build/*
        log_info "Build directory cleaned"
    else
        mkdir -p build
    fi
}

# 安装Go依赖
install_go_deps() {
    log_step "Installing Go dependencies..."

    go mod tidy
    go mod download

    log_info "Go dependencies installed"
}

# 安装Node.js依赖
install_node_deps() {
    log_step "Installing Node.js dependencies..."

    cd frontend
    npm install
    cd ..

    log_info "Node.js dependencies installed"
}

# 下载语音模型
download_models() {
    log_step "Downloading speech models..."

    if [ ! -d "models" ] || [ -z "$(ls -A models 2>/dev/null)" ]; then
        ./scripts/download-models.sh
    else
        log_info "Models already exist, skipping download"
    fi
}

# 构建前端
build_frontend() {
    log_step "Building frontend..."

    cd frontend
    npm run build
    cd ..

    log_info "Frontend built successfully"
}

# 构建应用
build_app() {
    log_step "Building application..."

    export PATH=$PATH:~/go/bin
    wails build -clean -production

    log_info "Application built successfully"
}

# 验证构建
verify_build() {
    log_step "Verifying build..."

    # 检查构建产物
    local build_dir="build/bin"
    if [ ! -d "$build_dir" ]; then
        log_error "Build output directory not found: $build_dir"
        exit 1
    fi

    # 查找可执行文件
    local executable=$(find "$build_dir" -type f -executable | head -1)
    if [ -z "$executable" ]; then
        log_error "No executable found in build directory"
        exit 1
    fi

    log_info "Build verified: $executable"
}

# 创建发布包
create_package() {
    log_step "Creating release package..."

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local package_name="audio-recognizer-${timestamp}"
    local package_dir="build/$package_name"

    mkdir -p "$package_dir"

    # 复制可执行文件
    cp -r build/bin/* "$package_dir/"

    # 复制必要资源
    cp -r models "$package_dir/"
    cp -r config "$package_dir/"
    cp README.md "$package_dir/"
    cp scripts/download-models.sh "$package_dir/"

    # 创建启动脚本
    cat > "$package_dir/start.sh" << 'EOF'
#!/bin/bash

# 检查模型文件
if [ ! -d "models" ]; then
    echo "Downloading speech models..."
    ./download-models.sh
fi

# 启动应用
./audio-recognizer
EOF
    chmod +x "$package_dir/start.sh"

    # 创建zip包
    cd build
    zip -r "${package_name}.zip" "$package_name"
    cd ..

    log_info "Release package created: build/${package_name}.zip"
}

# 主函数
main() {
    log_info "Starting Audio Recognizer build process..."

    # 解析参数
    local clean_only=false
    local package_only=false

    for arg in "$@"; do
        case $arg in
            --clean)
                clean_only=true
                ;;
            --package)
                package_only=true
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --clean    Clean build directory only"
                echo "  --package  Create release package only (requires previous build)"
                echo "  --help     Show this help message"
                exit 0
                ;;
        esac
    done

    # 执行构建步骤
    if [ "$package_only" = false ]; then
        check_dependencies

        if [ "$clean_only" = false ]; then
            clean_build
            install_go_deps
            install_node_deps
            download_models
            build_frontend
            build_app
            verify_build
        fi
    fi

    if [ "$clean_only" = false ]; then
        create_package
    fi

    log_info "Build process completed successfully!"
}

# 运行主函数
main "$@"