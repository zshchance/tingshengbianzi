#!/bin/bash

set -e

# 模型下载配置
MODEL_DIR="./models"
BASE_URL="https://alphacephei.com/vosk/models"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 创建模型目录
create_model_dir() {
    log_info "Creating model directory: $MODEL_DIR"
    mkdir -p "$MODEL_DIR"
}

# 下载模型
download_model() {
    local lang_code="$1"
    local model_name="$2"
    local model_url="$3"
    local target_dir="$MODEL_DIR/$lang_code"

    if [ -d "$target_dir" ]; then
        log_warn "Model $lang_code already exists, skipping download"
        return 0
    fi

    log_info "Downloading $model_name model for $lang_code..."

    # 下载压缩包
    local temp_zip="/tmp/${lang_code}-model.zip"

    if ! curl -L "$model_url" -o "$temp_zip"; then
        log_error "Failed to download $lang_code model"
        return 1
    fi

    # 解压模型
    log_info "Extracting $lang_code model..."
    if ! unzip -q "$temp_zip" -d "$MODEL_DIR"; then
        log_error "Failed to extract $lang_code model"
        rm -f "$temp_zip"
        return 1
    fi

    # 重命名目录
    if [ -d "$MODEL_DIR/$model_name" ]; then
        mv "$MODEL_DIR/$model_name" "$target_dir"
        log_info "Model $lang_code installed successfully"
    else
        log_error "Model directory not found after extraction"
        return 1
    fi

    # 清理临时文件
    rm -f "$temp_zip"
}

# 验证模型文件
validate_model() {
    local model_dir="$1"
    local required_files=("am/final.mdl")

    log_info "Validating model: $model_dir"

    # 检查核心文件
    for file in "${required_files[@]}"; do
        if [ ! -f "$model_dir/$file" ]; then
            log_error "Required model file missing: $file"
            return 1
        fi
    done

    # 检查可选文件
    local optional_files=("conf/mfcc.conf" "graph/HCLG.fst" "graph/HCLr.fst")
    local found_optional=false

    for file in "${optional_files[@]}"; do
        if [ -f "$model_dir/$file" ]; then
            log_info "Found optional file: $file"
            found_optional=true
        fi
    done

    if [ "$found_optional" = false ]; then
        log_warn "No optional configuration files found"
    fi

    log_info "Model validation passed"
    return 0
}

# 创建README文件
create_readme() {
    cat > "$MODEL_DIR/README.md" << EOF
# 语音识别模型

本目录包含音频识别应用使用的语音识别模型文件。

## 支持的语言

### 中文 (zh-CN)
- 模型: vosk-model-small-cn-0.22
- 大小: ~42MB
- 描述: 小型中文语音识别模型，适合日常使用

### 英文 (en-US)
- 模型: vosk-model-small-en-us-0.15
- 大小: ~40MB
- 描述: 小型英文语音识别模型，适合日常使用

## 模型文件说明

每个模型目录包含以下关键文件：
- \`am/final.mdl\` - 声学模型
- \`conf/mfcc.conf\` - MFCC特征配置
- \`graph/HCLG.fst\` - 发音词典和语法
- \`conf/words.txt\` - 词汇表

## 添加新模型

1. 从 https://alphacephei.com/vosk/models/ 下载模型
2. 将模型文件解压到对应的语言目录
3. 确保包含所有必需文件
4. 更新应用配置

## 注意事项

- 模型文件较大，首次使用需要下载
- 建议使用稳定的网络连接下载
- 模型文件不可修改，否则可能影响识别效果
EOF
}

# 主函数
main() {
    log_info "Starting speech model download..."

    # 创建目录
    create_model_dir

    # 下载中文模型
    download_model "zh-CN" "vosk-model-small-cn-0.22" "${BASE_URL}/vosk-model-small-cn-0.22.zip"
    if [ $? -eq 0 ]; then
        validate_model "$MODEL_DIR/zh-CN"
    fi

    # 下载英文模型
    download_model "en-US" "vosk-model-small-en-us-0.15" "${BASE_URL}/vosk-model-small-en-us-0.15.zip"
    if [ $? -eq 0 ]; then
        validate_model "$MODEL_DIR/en-US"
    fi

    # 创建README文件
    create_readme

    log_info "Model download completed!"
    log_info "Models installed in: $MODEL_DIR"
}

# 检查依赖
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v unzip &> /dev/null; then
    log_error "unzip is required but not installed"
    exit 1
fi

# 运行主函数
main "$@"