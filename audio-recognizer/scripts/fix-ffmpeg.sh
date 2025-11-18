#!/bin/bash

# FFmpeg依赖修复脚本
# 将FFmpeg二进制文件打包到应用中

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_FFMPEG_DIR="$PROJECT_ROOT/ffmpeg-binaries"
TARGET_APP="$PROJECT_ROOT/build/bin/tingshengbianzi.app"
TARGET_RESOURCES="$TARGET_APP/Contents/Resources"
TARGET_FFMPEG_DIR="$TARGET_RESOURCES/ffmpeg-binaries"

echo -e "${BLUE}🎬 听声辨字 - FFmpeg依赖修复工具${NC}"
echo "========================================"

# 检查源FFmpeg目录
echo ""
echo "🔍 步骤1: 检查源FFmpeg目录..."
if [ ! -d "$SOURCE_FFMPEG_DIR" ]; then
    echo -e "${RED}❌ 源FFmpeg目录不存在: $SOURCE_FFMPEG_DIR${NC}"
    echo "正在运行FFmpeg打包脚本..."
    "$PROJECT_ROOT/scripts/bundle-ffmpeg.sh"

    if [ ! -d "$SOURCE_FFMPEG_DIR" ]; then
        echo -e "${RED}❌ FFmpeg打包失败，请检查FFmpeg安装${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ 源FFmpeg目录存在${NC}"

# 显示源文件信息
echo ""
echo "📋 源FFmpeg文件信息:"
ls -la "$SOURCE_FFMPEG_DIR/"

# 检查目标应用
echo ""
echo "🔍 步骤2: 检查目标应用..."
if [ ! -d "$TARGET_APP" ]; then
    echo -e "${RED}❌ 目标应用不存在: $TARGET_APP${NC}"
    echo "请先构建应用: wails build -clean"
    exit 1
fi
echo -e "${GREEN}✅ 目标应用存在${NC}"

# 创建目标目录
echo ""
echo "🔧 步骤3: 创建目标目录..."
mkdir -p "$TARGET_FFMPEG_DIR"
echo -e "${GREEN}✅ 目标目录创建完成: $TARGET_FFMPEG_DIR${NC}"

# 复制FFmpeg文件
echo ""
echo "🔧 步骤4: 复制FFmpeg二进制文件..."
cp "$SOURCE_FFMPEG_DIR"/* "$TARGET_FFMPEG_DIR/"
echo -e "${GREEN}✅ 文件复制完成${NC}"

# 设置可执行权限
echo ""
echo "🔧 步骤5: 设置可执行权限..."
chmod +x "$TARGET_FFMPEG_DIR/ffmpeg"
chmod +x "$TARGET_FFMPEG_DIR/ffprobe"
echo -e "${GREEN}✅ 可执行权限设置完成${NC}"

# 验证复制结果
echo ""
echo "🔍 步骤6: 验证复制结果..."
FFMPEG_SIZE=$(stat -f%z "$TARGET_FFMPEG_DIR/ffmpeg" 2>/dev/null || echo "unknown")
FFPROBE_SIZE=$(stat -f%z "$TARGET_FFMPEG_DIR/ffprobe" 2>/dev/null || echo "unknown")

echo -e "${GREEN}✅ ffmpeg: $FFMPEG_SIZE bytes${NC}"
echo -e "${GREEN}✅ ffprobe: $FFPROBE_SIZE bytes${NC}"

# 测试FFmpeg可执行性
echo ""
echo "🔧 步骤7: 测试FFmpeg可执行性..."
if "$TARGET_FFMPEG_DIR/ffmpeg" -version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ffmpeg可以正常执行${NC}"
else
    echo -e "${YELLOW}⚠️ ffmpeg测试失败，但文件已复制${NC}"
fi

if "$TARGET_FFMPEG_DIR/ffprobe" -version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ffprobe可以正常执行${NC}"
else
    echo -e "${YELLOW}⚠️ ffprobe测试失败，但文件已复制${NC}"
fi

# 创建FFmpeg说明文件
echo ""
echo "📝 创建FFmpeg说明文件..."
cat > "$TARGET_RESOURCES/ffmpeg-info.txt" << EOF
FFmpeg 依赖信息
===============

文件位置: $TARGET_FFMPEG_DIR
包含文件: ffmpeg, ffprobe

ffmpeg: $FFMPEG_SIZE bytes
ffprobe: $FFPROBE_SIZE bytes

说明:
- 这是用于音频处理的FFmpeg工具集
- 由应用程序自动调用进行音频格式转换
- 不要删除或移动这些文件

安装信息:
复制时间: $(date)
系统信息: $(uname -a)
EOF

echo -e "${GREEN}✅ 说明文件创建完成${NC}"

# 显示最终状态
echo ""
echo -e "${BLUE}📊 修复完成状态:${NC}"
echo "源目录: $SOURCE_FFMPEG_DIR"
echo "目标目录: $TARGET_FFMPEG_DIR"
echo "应用目录: $TARGET_APP"

echo ""
echo -e "${GREEN}🎉 FFmpeg依赖修复完成！${NC}"
echo ""
echo "🚀 下一步操作:"
echo "1. 重新启动应用程序"
echo "2. 查看日志确认FFmpeg正常加载:"
echo "   ./scripts/show-logs.sh"
echo "3. 测试音频文件上传和处理功能"