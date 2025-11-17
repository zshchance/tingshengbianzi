#!/bin/bash

set -e

# 模型下载配置
MODEL_DIR="./models/whisper"
BASE_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main"
FALLBACK_URL1="https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main"
FALLBACK_URL2="https://modelscope.cn/models/ggerganov/whisper.cpp/resolve/main"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认下载的模型
DEFAULT_MODELS=("base")

# 可用模型列表
ALL_MODELS=("tiny" "base" "small" "medium" "large" "large-v2" "large-v3")

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

# 显示帮助信息
show_help() {
    echo "Whisper模型下载脚本"
    echo ""
    echo "用法: $0 [选项] [模型名称...]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -l, --list     列出所有可用模型"
    echo "  -a, --all      下载所有可用模型"
    echo ""
    echo "可用模型:"
    for model in "${ALL_MODELS[@]}"; do
        echo "  - $model"
    done
    echo ""
    echo "示例:"
    echo "  $0                    # 下载默认模型(base)"
    echo "  $0 tiny small         # 下载tiny和small模型"
    echo "  $0 --all              # 下载所有模型"
}

# 列出所有可用模型
list_models() {
    log_info "可用的Whisper模型:"
    echo ""
    printf "%-12s %-10s %-10s %-10s %s\n" "模型名称" "大小" "参数量" "相对速度" "推荐用途"
    printf "%-12s %-10s %-10s %-10s %s\n" "tiny" "39MB" "39M" "~32x" "快速测试，低精度需求"
    printf "%-12s %-10s %-10s %-10s %s\n" "base" "74MB" "74M" "~16x" "一般用途，平衡速度与精度"
    printf "%-12s %-10s %-10s %-10s %s\n" "small" "244MB" "244M" "~6x" "较高精度要求"
    printf "%-12s %-10s %-10s %-10s %s\n" "medium" "769MB" "769M" "~2x" "高精度要求"
    printf "%-12s %-10s %-10s %-10s %s\n" "large" "1550MB" "1550M" "1x" "最高精度要求"
    printf "%-12s %-10s %-10s %-10s %s\n" "large-v2" "1550MB" "1550M" "1x" "最高精度，改进版"
    printf "%-12s %-10s %-10s %-10s %s\n" "large-v3" "1550MB" "1550M" "1x" "最新最高精度版本"
    echo ""
    log_info "推荐模型: base (平衡速度与精度)"
}

# 创建模型目录
create_model_dir() {
    log_info "Creating model directory: $MODEL_DIR"
    mkdir -p "$MODEL_DIR"
}

# 下载模型
download_model() {
    local model_name="$1"
    local filename="ggml-${model_name}.bin"
    local target_file="$MODEL_DIR/$filename"

    if [ -f "$target_file" ]; then
        log_warn "Model $model_name already exists, skipping download"
        return 0
    fi

    log_info "Downloading $model_name model..."
    
    # 尝试从主要URL下载
    local urls=("$BASE_URL/$filename" "$FALLBACK_URL1/$filename" "$FALLBACK_URL2/$filename")
    local download_success=false
    
    for url in "${urls[@]}"; do
        log_info "Trying to download from: $url"
        if curl -L --connect-timeout 10 --max-time 3600 "$url" -o "$target_file"; then
            log_info "Successfully downloaded $model_name model"
            download_success=true
            break
        else
            log_warn "Failed to download from $url"
            rm -f "$target_file"  # 删除可能的部分下载文件
        fi
    done
    
    if [ "$download_success" = false ]; then
        log_error "Failed to download $model_name model from all sources"
        return 1
    fi
    
    # 验证下载的文件
    if [ ! -s "$target_file" ]; then
        log_error "Downloaded file is empty or corrupted"
        rm -f "$target_file"
        return 1
    fi
    
    log_info "Model $model_name installed successfully"
}

# 验证模型文件
validate_model() {
    local model_file="$1"
    
    log_info "Validating model: $model_file"
    
    # 检查文件是否存在且非空
    if [ ! -f "$model_file" ]; then
        log_error "Model file not found: $model_file"
        return 1
    fi
    
    if [ ! -s "$model_file" ]; then
        log_error "Model file is empty: $model_file"
        return 1
    fi
    
    # 检查文件大小（基本验证）
    local file_size=$(stat -f%z "$model_file" 2>/dev/null || stat -c%s "$model_file" 2>/dev/null)
    if [ "$file_size" -lt 1000000 ]; then  # 小于1MB可能有问题
        log_warn "Model file seems too small: $file_size bytes"
    fi
    
    log_info "Model validation passed"
    return 0
}

# 创建README文件
create_readme() {
    cat > "$MODEL_DIR/../README.md" << EOF
# Whisper语音识别模型

本目录包含音频识别应用使用的Whisper语音识别模型文件。

## 支持的模型

### tiny
- 文件: ggml-tiny.bin
- 大小: ~39MB
- 参数量: 39M
- 相对速度: ~32x
- 准确率: ★★☆☆☆
- 推荐用途: 快速测试，低精度需求

### base
- 文件: ggml-base.bin
- 大小: ~74MB
- 参数量: 74M
- 相对速度: ~16x
- 准确率: ★★★☆☆
- 推荐用途: 一般用途，平衡速度与精度（默认推荐）

### small
- 文件: ggml-small.bin
- 大小: ~244MB
- 参数量: 244M
- 相对速度: ~6x
- 准确率: ★★★★☆
- 推荐用途: 较高精度要求

### medium
- 文件: ggml-medium.bin
- 大小: ~769MB
- 参数量: 769M
- 相对速度: ~2x
- 准确率: ★★★★☆
- 推荐用途: 高精度要求

### large
- 文件: ggml-large.bin
- 大小: ~1550MB
- 参数量: 1550M
- 相对速度: 1x
- 准确率: ★★★★★
- 推荐用途: 最高精度要求

### large-v2
- 文件: ggml-large-v2.bin
- 大小: ~1550MB
- 参数量: 1550M
- 相对速度: 1x
- 准确率: ★★★★★
- 推荐用途: 最高精度，改进版

### large-v3
- 文件: ggml-large-v3.bin
- 大小: ~1550MB
- 参数量: 1550M
- 相对速度: 1x
- 准确率: ★★★★★
- 推荐用途: 最新最高精度版本

## 支持的语言

Whisper模型支持多种语言，包括但不限于：
- 中文 (zh)
- 英文 (en)
- 日文 (ja)
- 韩文 (ko)
- 法文 (fr)
- 德文 (de)
- 西班牙文 (es)
- 俄文 (ru)
- 阿拉伯文 (ar)
- 印地文 (hi)
- 以及更多...

## 模型选择建议

### 根据使用场景选择模型

1. **实时语音识别**：
   - 推荐模型：tiny 或 base
   - 原因：识别速度快，适合实时处理

2. **音频文件转录**：
   - 推荐模型：small 或 medium
   - 原因：平衡了速度和精度，适合离线处理

3. **高精度转录需求**：
   - 推荐模型：large-v2 或 large-v3
   - 原因：最高精度，适合对准确性要求极高的场景

4. **资源受限环境**：
   - 推荐模型：tiny
   - 原因：模型最小，内存占用最少

### 根据语言选择模型

1. **中文识别**：
   - 推荐模型：small 或 medium
   - 原因：中文识别需要较大模型才能获得较好效果

2. **英文识别**：
   - 推荐模型：base 或 small
   - 原因：英文是Whisper的主要训练语言，较小模型也能获得不错效果

3. **多语言混合**：
   - 推荐模型：medium 或 large
   - 原因：需要更大的模型来处理多语言混合情况

## 添加新模型

1. 从 https://huggingface.co/ggerganov/whisper.cpp/ 下载模型
2. 将模型文件放入 ./models/whisper/ 目录
3. 确保文件名格式为 ggml-{model_name}.bin
4. 更新应用配置

## 注意事项

- 模型文件较大，首次使用需要下载
- 建议使用稳定的网络连接下载
- 模型文件不可修改，否则可能影响识别效果
- 不同大小的模型对系统资源要求不同，请根据设备性能选择合适的模型
EOF
}

# 主函数
main() {
    local models_to_download=()
    local download_all=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--list)
                list_models
                exit 0
                ;;
            -a|--all)
                download_all=true
                shift
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                models_to_download+=("$1")
                shift
                ;;
        esac
    done
    
    # 确定要下载的模型
    if [ "$download_all" = true ]; then
        models_to_download=("${ALL_MODELS[@]}")
    elif [ ${#models_to_download[@]} -eq 0 ]; then
        models_to_download=("${DEFAULT_MODELS[@]}")
    fi
    
    # 验证模型名称
    for model in "${models_to_download[@]}"; do
        local valid_model=false
        for valid in "${ALL_MODELS[@]}"; do
            if [ "$model" = "$valid" ]; then
                valid_model=true
                break
            fi
        done
        
        if [ "$valid_model" = false ]; then
            log_error "无效的模型名称: $model"
            log_info "有效模型名称: ${ALL_MODELS[*]}"
            exit 1
        fi
    done
    
    log_info "Starting Whisper model download..."
    
    # 创建目录
    create_model_dir
    
    # 下载模型
    local failed_models=()
    for model in "${models_to_download[@]}"; do
        if ! download_model "$model"; then
            failed_models+=("$model")
        else
            validate_model "$MODEL_DIR/ggml-${model}.bin"
        fi
    done
    
    # 创建README文件
    create_readme
    
    # 报告结果
    if [ ${#failed_models[@]} -eq 0 ]; then
        log_info "All models downloaded successfully!"
        log_info "Models installed in: $MODEL_DIR"
    else
        log_error "Failed to download models: ${failed_models[*]}"
        exit 1
    fi
}

# 检查依赖
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

# 运行主函数
main "$@"