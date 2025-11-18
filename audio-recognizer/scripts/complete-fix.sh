#!/bin/bash

# 完整修复脚本
# 解决打包后日志查看和图标模糊问题

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}🔧 听声辨字 - 完整问题修复工具${NC}"
echo "========================================"
echo "解决以下问题:"
echo "1. 打包后应用日志查看"
echo "2. 图标模糊问题"
echo ""

# 步骤1: 修复图标质量
echo "🔧 步骤1: 修复图标质量..."
if [ -f "$PROJECT_ROOT/scripts/fix-icons-simple.sh" ]; then
    "$PROJECT_ROOT/scripts/fix-icons-simple.sh"
    echo -e "${GREEN}✅ 图标优化完成${NC}"
else
    echo -e "${YELLOW}⚠️ 图标优化脚本不存在${NC}"
fi

# 步骤2: 重新构建应用
echo ""
echo "🔧 步骤2: 重新构建应用..."
cd "$PROJECT_ROOT"
export PATH=$PATH:~/go/bin

if wails build -clean; then
    echo -e "${GREEN}✅ 应用构建成功${NC}"
else
    echo -e "${RED}❌ 应用构建失败${NC}"
    exit 1
fi

# 步骤3: 修复构建后的图标
echo ""
echo "🔧 步骤3: 修复构建后的图标..."
if [ -f "$PROJECT_ROOT/scripts/fix-build-icons.sh" ]; then
    "$PROJECT_ROOT/scripts/fix-build-icons.sh"
    echo -e "${GREEN}✅ 构建后图标修复完成${NC}"
else
    echo -e "${YELLOW}⚠️ 构建后图标修复脚本不存在${NC}"
fi

# 步骤4: 修复Whisper CLI
echo ""
echo "🔧 步骤4: 修复Whisper CLI..."
if [ -f "$PROJECT_ROOT/scripts/fix-whisper-cli.sh" ]; then
    "$PROJECT_ROOT/scripts/fix-whisper-cli.sh"
    echo -e "${GREEN}✅ Whisper CLI修复完成${NC}"
else
    echo -e "${YELLOW}⚠️ Whisper CLI修复脚本不存在${NC}"
fi

# 步骤5: 修复FFmpeg依赖
echo ""
echo "🔧 步骤5: 修复FFmpeg依赖..."
if [ -f "$PROJECT_ROOT/scripts/bundle-ffmpeg.sh" ]; then
    "$PROJECT_ROOT/scripts/bundle-ffmpeg.sh"
    echo -e "${GREEN}✅ FFmpeg依赖打包完成${NC}"

    # 将FFmpeg复制到应用Resources目录
    echo "📦 复制FFmpeg到应用Resources目录..."
    TARGET_RESOURCES="$PROJECT_ROOT/build/bin/tingshengbianzi.app/Contents/Resources"
    SOURCE_FFMPEG="$PROJECT_ROOT/ffmpeg-binaries"

    if [ -d "$SOURCE_FFMPEG" ]; then
        mkdir -p "$TARGET_RESOURCES/ffmpeg-binaries"
        cp "$SOURCE_FFMPEG"/* "$TARGET_RESOURCES/ffmpeg-binaries/"
        chmod +x "$TARGET_RESOURCES/ffmpeg-binaries/ffmpeg"
        chmod +x "$TARGET_RESOURCES/ffmpeg-binaries/ffprobe"
        echo -e "${GREEN}✅ FFmpeg复制到应用Resources目录完成${NC}"
    else
        echo -e "${YELLOW}⚠️ FFmpeg源目录不存在，跳过复制${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ FFmpeg打包脚本不存在${NC}"
fi

# 步骤6: 验证修复结果
echo ""
echo "🔧 步骤6: 验证修复结果..."

# 检查图标大小
TARGET_ICON="$PROJECT_ROOT/build/bin/tingshengbianzi.app/Contents/Resources/iconfile.icns"
if [ -f "$TARGET_ICON" ]; then
    ICON_SIZE=$(stat -f%z "$TARGET_ICON" 2>/dev/null || echo "unknown")
    if [ "$ICON_SIZE" -gt 100000 ]; then
        echo -e "${GREEN}✅ 图标大小正常: $ICON_SIZE bytes${NC}"
    else
        echo -e "${YELLOW}⚠️ 图标可能仍然有问题: $ICON_SIZE bytes${NC}"
    fi
else
    echo -e "${RED}❌ 图标文件不存在${NC}"
fi

# 检查FFmpeg文件
TARGET_FFMPEG="$PROJECT_ROOT/build/bin/tingshengbianzi.app/Contents/Resources/ffmpeg-binaries"
if [ -f "$TARGET_FFMPEG/ffmpeg" ] && [ -f "$TARGET_FFMPEG/ffprobe" ]; then
    FFMPEG_SIZE=$(stat -f%z "$TARGET_FFMPEG/ffmpeg" 2>/dev/null || echo "unknown")
    FFPROBE_SIZE=$(stat -f%z "$TARGET_FFMPEG/ffprobe" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ FFmpeg依赖正常: ffmpeg($FFMPEG_SIZE bytes), ffprobe($FFPROBE_SIZE bytes)${NC}"
else
    echo -e "${RED}❌ FFmpeg依赖文件不完整${NC}"
fi

# 测试应用启动（简单验证）
echo ""
echo "🔧 步骤7: 测试应用启动..."
echo "启动应用进行基本验证..."
if open "$PROJECT_ROOT/build/bin/tingshengbianzi.app"; then
    echo -e "${GREEN}✅ 应用启动成功${NC}"
    echo -e "${BLUE}ℹ️ 请检查应用图标是否清晰${NC}"
    sleep 2
else
    echo -e "${RED}❌ 应用启动失败${NC}"
fi

echo ""
echo -e "${GREEN}🎉 完整修复流程完成！${NC}"
echo ""

echo -e "${BLUE}📋 日志查看方法:${NC}"
echo "1. 使用日志查看工具: ./scripts/show-logs.sh"
echo "2. 直接查看日志文件:"
echo "   - macOS: ~/Library/Logs/听声辨字/"
echo "   - 备用位置: /tmp/听声辨字/"
echo ""
echo "3. 实时监控日志: tail -f ~/Library/Logs/听声辨字/latest.log"
echo ""

echo -e "${BLUE}🔍 问题排查建议:${NC}"
echo "1. 如果仍然没有识别结果:"
echo "   - 查看日志中的ERROR和WARN信息"
echo "   - 检查模型文件路径是否正确"
echo "   - 验证Whisper CLI是否正常工作"
echo ""
echo "2. 如果图标仍然模糊:"
echo "   - 重启Mac系统"
echo "   - 清理系统图标缓存"
echo "   - 手动验证原始logo质量"
echo ""

echo -e "${BLUE}📁 重要文件位置:${NC}"
echo "- 应用程序: build/bin/tingshengbianzi.app"
echo "- 配置文件: ~/Library/Application Support/听声辨字/"
echo "- 日志文件: ~/Library/Logs/听声辨字/"
echo "- 模型目录: 用户需要在设置中指定"