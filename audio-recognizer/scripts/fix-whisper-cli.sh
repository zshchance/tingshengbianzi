#!/bin/bash

# 修复打包后应用中的whisper-cli问题
# 将whisper-cli复制到正确的位置

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_WHISPER="$PROJECT_ROOT/backend/recognition/whisper-cli"
TARGET_APP="$PROJECT_ROOT/build/bin/tingshengbianzi.app"
TARGET_RESOURCES="$TARGET_APP/Contents/Resources"
TARGET_WHISPER="$TARGET_RESOURCES/whisper-cli"

echo -e "${BLUE}🔧 听声辨字 - Whisper CLI修复工具${NC}"
echo "========================================"

# 检查源whisper-cli
echo ""
echo "🔍 检查源whisper-cli文件..."
if [ ! -f "$SOURCE_WHISPER" ]; then
    echo -e "${RED}❌ 源whisper-cli文件不存在: $SOURCE_WHISPER${NC}"
    exit 1
fi

SOURCE_SIZE=$(stat -f%z "$SOURCE_WHISPER" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ 源whisper-cli: $SOURCE_SIZE bytes${NC}"

# 检查目标应用
echo ""
echo "🔍 检查目标应用..."
if [ ! -d "$TARGET_APP" ]; then
    echo -e "${RED}❌ 目标应用不存在: $TARGET_APP${NC}"
    echo "请先构建应用: wails build -clean"
    exit 1
fi

# 确保Resources目录存在
mkdir -p "$TARGET_RESOURCES"
echo -e "${GREEN}✅ Resources目录已准备${NC}"

# 复制whisper-cli
echo ""
echo "🔧 复制whisper-cli到Resources目录..."
cp "$SOURCE_WHISPER" "$TARGET_WHISPER"
echo -e "${GREEN}✅ whisper-cli复制完成${NC}"

# 设置可执行权限
chmod +x "$TARGET_WHISPER"
echo -e "${GREEN}✅ 设置可执行权限完成${NC}"

# 验证复制结果
echo ""
echo "🔍 验证复制结果..."
if [ -f "$TARGET_WHISPER" ]; then
    TARGET_SIZE=$(stat -f%z "$TARGET_WHISPER" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 目标whisper-cli: $TARGET_SIZE bytes${NC}"

    # 验证可执行性
    if [ -x "$TARGET_WHISPER" ]; then
        echo -e "${GREEN}✅ whisper-cli具有可执行权限${NC}"
    else
        echo -e "${YELLOW}⚠️ whisper-cli缺少可执行权限${NC}"
        chmod +x "$TARGET_WHISPER"
    fi
else
    echo -e "${RED}❌ 复制失败，目标文件不存在${NC}"
    exit 1
fi

# 测试whisper-cli
echo ""
echo "🔧 测试whisper-cli..."
if "$TARGET_WHISPER" --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ whisper-cli可以正常执行${NC}"
else
    echo -e "${YELLOW}⚠️ whisper-cli测试失败，但文件已复制${NC}"
fi

# 创建说明文件
echo ""
echo "📝 创建whisper-cli说明文件..."
cat > "$TARGET_RESOURCES/whisper-info.txt" << EOF
Whisper CLI 信息
==============

文件: whisper-cli
大小: $TARGET_SIZE bytes
路径: $TARGET_WHISPER

说明:
- 这是用于语音识别的Whisper命令行工具
- 由应用程序自动调用
- 不要删除或移动此文件

版本信息:
$(uname -a)
复制时间: $(date)
EOF

echo -e "${GREEN}✅ 说明文件创建完成${NC}"

# 显示最终状态
echo ""
echo -e "${BLUE}📊 修复完成状态:${NC}"
echo "源文件: $SOURCE_WHISPER ($SOURCE_SIZE bytes)"
echo "目标文件: $TARGET_WHISPER ($TARGET_SIZE bytes)"
echo "应用目录: $TARGET_APP"

echo ""
echo -e "${GREEN}🎉 Whisper CLI修复完成！${NC}"
echo ""
echo "🚀 下一步操作:"
echo "1. 重新启动应用程序测试语音识别功能"
echo "2. 查看日志确认whisper-cli正常加载:"
echo "   ./scripts/show-logs.sh"
echo "3. 如果仍有问题，检查模型文件配置"