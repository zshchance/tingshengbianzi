#!/bin/bash

# 测试修复效果
# 快速验证语音识别功能是否正常

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_APP="$PROJECT_ROOT/build/bin/tingshengbianzi.app"

echo -e "${BLUE}🧪 听声辨字 - 修复效果测试${NC}"
echo "========================================"

# 1. 检查应用是否存在
echo ""
echo "🔍 步骤1: 检查应用文件..."
if [ ! -d "$TARGET_APP" ]; then
    echo -e "${RED}❌ 应用不存在，请先构建${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 应用存在${NC}"

# 2. 检查Whisper CLI
echo ""
echo "🔍 步骤2: 检查Whisper CLI..."
WHISPER_PATH="$TARGET_APP/Contents/Resources/whisper-cli"
if [ -f "$WHISPER_PATH" ]; then
    SIZE=$(stat -f%z "$WHISPER_PATH" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Whisper CLI存在: $SIZE bytes${NC}"

    if [ -x "$WHISPER_PATH" ]; then
        echo -e "${GREEN}✅ Whisper CLI可执行${NC}"
    else
        echo -e "${RED}❌ Whisper CLI不可执行${NC}"
    fi
else
    echo -e "${RED}❌ Whisper CLI不存在${NC}"
    echo "请运行: ./scripts/fix-whisper-cli.sh"
fi

# 3. 检查图标
echo ""
echo "🔍 步骤3: 检查应用图标..."
ICON_PATH="$TARGET_APP/Contents/Resources/iconfile.icns"
if [ -f "$ICON_PATH" ]; then
    SIZE=$(stat -f%z "$ICON_PATH" 2>/dev/null || echo "unknown")
    if [ "$SIZE" -gt 100000 ]; then
        echo -e "${GREEN}✅ 应用图标正常: $SIZE bytes${NC}"
    else
        echo -e "${YELLOW}⚠️ 应用图标可能较小: $SIZE bytes${NC}"
    fi
else
    echo -e "${RED}❌ 应用图标不存在${NC}"
fi

# 4. 检查FFmpeg
echo ""
echo "🔍 步骤4: 检查FFmpeg依赖..."
FFMPEG_PATH="$TARGET_APP/Contents/Resources/third-party/bin/ffmpeg"
FFPROBE_PATH="$TARGET_APP/Contents/Resources/third-party/bin/ffprobe"

if [ -f "$FFMPEG_PATH" ] && [ -f "$FFPROBE_PATH" ]; then
    FFMPEG_SIZE=$(stat -f%z "$FFMPEG_PATH" 2>/dev/null || echo "unknown")
    FFPROBE_SIZE=$(stat -f%z "$FFPROBE_PATH" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ FFmpeg依赖完整${NC}"
    echo "   ffmpeg: $FFMPEG_SIZE bytes"
    echo "   ffprobe: $FFPROBE_SIZE bytes"

    if [ -x "$FFMPEG_PATH" ] && [ -x "$FFPROBE_PATH" ]; then
        echo -e "${GREEN}✅ FFmpeg二进制文件可执行${NC}"
    else
        echo -e "${YELLOW}⚠️ FFmpeg文件缺少可执行权限${NC}"
    fi
else
    echo -e "${RED}❌ FFmpeg依赖文件不完整${NC}"
    echo "请运行: ./scripts/fix-ffmpeg.sh"
fi

# 5. 检查模型配置文件
echo ""
echo "🔍 步骤5: 检查模型配置..."
MODEL_INFO="$TARGET_APP/Contents/Resources/models-info.txt"
if [ -f "$MODEL_INFO" ]; then
    echo -e "${GREEN}✅ 模型配置说明文件存在${NC}"
else
    echo -e "${YELLOW}⚠️ 模型配置说明文件不存在${NC}"
fi

# 6. 启动应用测试
echo ""
echo "🚀 步骤6: 启动应用进行测试..."
echo "正在启动应用程序..."

# 启动应用
open "$TARGET_APP"

echo -e "${GREEN}✅ 应用已启动${NC}"
echo ""
echo -e "${BLUE}📋 请测试以下功能:${NC}"
echo "1. 查看应用图标是否清晰"
echo "2. 在设置中配置模型目录"
echo "3. 上传音频文件进行语音识别"
echo ""

# 6. 提供日志查看命令
echo -e "${BLUE}📋 查看日志的方法:${NC}"
echo "./scripts/show-logs.sh"
echo ""
echo -e "${BLUE}🔍 实时监控日志:${NC}"
echo "tail -f ~/Library/Logs/听声辨字/latest.log"
echo ""

# 7. 预期的日志内容
echo -e "${BLUE}📋 修复后应该看到的日志内容:${NC}"
echo "- [INFO] 找到Whisper CLI: .../Contents/Resources/whisper-cli"
echo "- [INFO] 检测到Whisper模型文件，将使用真实语音识别"
echo "- [INFO] 语音识别服务初始化成功"
echo "- 找到嵌入FFmpeg在 Resources目录"
echo "- ffmpeg: .../Contents/Resources/third-party/bin/ffmpeg"
echo "- ffprobe: .../Contents/Resources/third-party/bin/ffprobe"
echo ""

echo -e "${GREEN}🎉 测试准备完成！${NC}"
echo -e "${YELLOW}⚠️ 如果仍然有问题，请查看日志获取详细信息${NC}"