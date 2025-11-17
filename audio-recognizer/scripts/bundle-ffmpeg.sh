#!/bin/bash

# FFmpeg 打包脚本
# 用于将 FFmpeg 二进制文件打包到应用程序中

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FFMPEG_DIR="$PROJECT_ROOT/ffmpeg-binaries"

echo "🔧 开始打包 FFmpeg 依赖..."

# 创建 ffmpeg 二进制文件目录
mkdir -p "$FFMPEG_DIR"

# 检测操作系统
OS=$(uname -s)
ARCH=$(uname -m)

echo "📋 检测到系统: $OS $ARCH"

# 根据系统下载对应的 FFmpeg
case "$OS" in
    "Darwin")
        if command -v brew >/dev/null 2>&1; then
            echo "🍺 使用 Homebrew 获取 FFmpeg..."

            # 获取 FFmpeg 安装路径
            FFMPEG_PATH=$(brew --prefix ffmpeg)/bin/ffmpeg
            FFPROBE_PATH=$(brew --prefix ffmpeg)/bin/ffprobe

            if [[ -f "$FFMPEG_PATH" ]]; then
                echo "✅ 找到 FFmpeg: $FFMPEG_PATH"
                cp "$FFMPEG_PATH" "$FFMPEG_DIR/"
                echo "✅ 复制 FFmpeg 成功"
            else
                echo "❌ 未找到 FFmpeg，请先运行: brew install ffmpeg"
                exit 1
            fi

            if [[ -f "$FFPROBE_PATH" ]]; then
                echo "✅ 找到 FFprobe: $FFPROBE_PATH"
                cp "$FFPROBE_PATH" "$FFMPEG_DIR/"
                echo "✅ 复制 FFprobe 成功"
            else
                echo "❌ 未找到 FFprobe"
                exit 1
            fi
        else
            echo "❌ 未找到 Homebrew，请先安装 Homebrew"
            exit 1
        fi
        ;;
    "Linux")
        if command -v ffmpeg >/dev/null 2>&1; then
            FFMPEG_PATH=$(which ffmpeg)
            FFPROBE_PATH=$(which ffprobe)

            echo "✅ 找到 FFmpeg: $FFMPEG_PATH"
            cp "$FFMPEG_PATH" "$FFMPEG_DIR/"
            echo "✅ 复制 FFmpeg 成功"

            echo "✅ 找到 FFprobe: $FFPROBE_PATH"
            cp "$FFPROBE_PATH" "$FFMPEG_DIR/"
            echo "✅ 复制 FFprobe 成功"
        else
            echo "❌ 未找到 FFmpeg，请先安装"
            echo "Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg"
            echo "CentOS/RHEL: sudo yum install ffmpeg"
            exit 1
        fi
        ;;
    *)
        echo "❌ 不支持的操作系统: $OS"
        exit 1
        ;;
esac

# 设置可执行权限
chmod +x "$FFMPEG_DIR/ffmpeg"
chmod +x "$FFMPEG_DIR/ffprobe"

echo "✅ FFmpeg 打包完成！"
echo "📁 打包位置: $FFMPEG_DIR"

# 显示文件信息
echo ""
echo "📊 打包文件信息:"
ls -la "$FFMPEG_DIR/"

echo ""
echo "🎯 接下来可以运行: go build -o audio-recognizer ."