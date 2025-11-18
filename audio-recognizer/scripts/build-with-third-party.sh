#!/bin/bash

# 使用第三方依赖的完整构建脚本
# 自动打包所有第三方依赖到应用程序中

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🏗️ 听声辨字 - 第三方依赖构建脚本${NC}"
echo "========================================"

# 检查第三方依赖目录
echo ""
echo "🔍 步骤1: 检查第三方依赖目录..."
THIRD_PARTY_DIR="$PROJECT_ROOT/third-party/bin"

if [ ! -d "$THIRD_PARTY_DIR" ]; then
    echo -e "${RED}❌ 第三方依赖目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 第三方依赖目录存在${NC}"

# 列出依赖文件
echo ""
echo "📋 第三方依赖文件:"
ls -la "$THIRD_PARTY_DIR"

# 验证必要文件存在
REQUIRED_FILES=("whisper-cli" "ffmpeg" "ffprobe")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$THIRD_PARTY_DIR/$file" ]; then
        echo -e "${RED}❌ 缺少必要文件: $file${NC}"
        exit 1
    fi
    if [ ! -x "$THIRD_PARTY_DIR/$file" ]; then
        echo -e "${YELLOW}⚠️ 文件缺少可执行权限: $file${NC}"
        chmod +x "$THIRD_PARTY_DIR/$file"
    fi
done

echo -e "${GREEN}✅ 所有必要文件存在且有可执行权限${NC}"

# 构建应用
echo ""
echo "🔧 步骤2: 构建Wails应用..."
cd "$PROJECT_ROOT"
export PATH=$PATH:~/go/bin

echo "清理旧的构建文件..."
rm -rf "$PROJECT_ROOT/build/bin"

echo "开始Wails构建..."
if wails build -clean; then
    echo -e "${GREEN}✅ Wails构建成功${NC}"
else
    echo -e "${RED}❌ Wails构建失败${NC}"
    exit 1
fi

# 复制第三方依赖到应用Resources目录
echo ""
echo "📦 步骤3: 打包第三方依赖..."
TARGET_RESOURCES="$PROJECT_ROOT/build/bin/tingshengbianzi.app/Contents/Resources"
TARGET_THIRD_PARTY="$TARGET_RESOURCES/third-party/bin"

mkdir -p "$TARGET_THIRD_PARTY"
cp -R "$THIRD_PARTY_DIR"/* "$TARGET_THIRD_PARTY/"

echo -e "${GREEN}✅ 第三方依赖复制完成${NC}"

# 验证复制结果
echo ""
echo "🔍 步骤4: 验证打包结果..."
echo "第三方依赖位置: $TARGET_THIRD_PARTY"
ls -la "$TARGET_THIRD_PARTY"

# 创建依赖说明文件
echo ""
echo "📝 创建依赖说明文件..."
cat > "$TARGET_RESOURCES/third-party-dependencies.txt" << EOF
Third-Party Dependencies
=====================

打包时间: $(date)
应用版本: $(cat "$PROJECT_ROOT/wails.json" | grep '"productVersion"' | cut -d'"' -f4)

包含的第三方依赖:
- whisper-cli: $(stat -f%z "$TARGET_THIRD_PARTY/whisper-cli" 2>/dev/null || echo "unknown") bytes
- ffmpeg: $(stat -f%z "$TARGET_THIRD_PARTY/ffmpeg" 2>/dev/null || echo "unknown") bytes
- ffprobe: $(stat -f%z "$TARGET_THIRD_PARTY/ffprobe" 2>/dev/null || echo "unknown") bytes

用途:
- whisper-cli: 语音识别核心引擎
- ffmpeg: 音频格式转换和处理
- ffprobe: 媒体文件分析工具

查找优先级:
1. 应用内部依赖 (Resources/third-party/bin/)
2. 开发环境依赖 (项目/third-party/bin/)
3. 系统PATH
EOF

echo -e "${GREEN}✅ 依赖说明文件创建完成${NC}"

# 清理图标缓存
echo ""
echo "🧹 步骤5: 清理图标缓存..."
if [ -f "$PROJECT_ROOT/scripts/fix-icons-simple.sh" ]; then
    "$PROJECT_ROOT/scripts/fix-icons-simple.sh"
    echo -e "${GREEN}✅ 图标优化完成${NC}"
fi

# 验证最终构建结果
echo ""
echo "🔧 步骤6: 验证最终构建..."

# 检查应用大小
APP_SIZE=$(du -sh "$PROJECT_ROOT/build/bin/tingshengbianzi.app" | cut -f1)
echo -e "${GREEN}✅ 应用大小: $APP_SIZE${NC}"

# 检查依赖完整性
WHISPER_SIZE=$(stat -f%z "$TARGET_THIRD_PARTY/whisper-cli" 2>/dev/null || echo "unknown")
FFMPEG_SIZE=$(stat -f%z "$TARGET_THIRD_PARTY/ffmpeg" 2>/dev/null || echo "unknown")
FFPROBE_SIZE=$(stat -f%z "$TARGET_THIRD_PARTY/ffprobe" 2>/dev/null || echo "unknown")

echo -e "${GREEN}✅ 依赖完整性检查:${NC}"
echo "  whisper-cli: $WHISPER_SIZE bytes"
echo "  ffmpeg: $FFMPEG_SIZE bytes"
echo "  ffprobe: $FFPROBE_SIZE bytes"

# 测试依赖可执行性
echo ""
echo "🧪 步骤7: 测试依赖可执行性..."

if "$TARGET_THIRD_PARTY/whisper-cli" --help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ whisper-cli 可执行${NC}"
else
    echo -e "${YELLOW}⚠️ whisper-cli 执行失败${NC}"
fi

if "$TARGET_THIRD_PARTY/ffmpeg" -version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ffmpeg 可执行${NC}"
else
    echo -e "${YELLOW}⚠️ ffmpeg 执行失败${NC}"
fi

if "$TARGET_THIRD_PARTY/ffprobe" -version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ffprobe 可执行${NC}"
else
    echo -e "${YELLOW}⚠️ ffprobe 执行失败${NC}"
fi

# 启动应用进行最终测试
echo ""
echo "🚀 步骤8: 启动应用测试..."
if open "$PROJECT_ROOT/build/bin/tingshengbianzi.app"; then
    echo -e "${GREEN}✅ 应用启动成功${NC}"
    echo ""
    echo -e "${BLUE}📋 请测试以下功能:${NC}"
    echo "1. 检查应用图标是否清晰"
    echo "2. 在设置中配置模型目录"
    echo "3. 上传音频文件进行语音识别"
    echo "4. 查看日志确认依赖加载:"
    echo "   ./scripts/show-logs.sh"
else
    echo -e "${RED}❌ 应用启动失败${NC}"
fi

echo ""
echo -e "${GREEN}🎉 第三方依赖构建完成！${NC}"
echo ""
echo -e "${BLUE}📁 构建结果:${NC}"
echo "应用位置: $PROJECT_ROOT/build/bin/tingshengbianzi.app"
echo "第三方依赖: $TARGET_THIRD_PARTY"
echo "应用大小: $APP_SIZE"
echo ""

echo -e "${BLUE}💡 优势:${NC}"
echo "- ✅ 完全自包含的应用包"
echo "- ✅ 自动打包所有第三方依赖"
echo "- ✅ 优先使用内部依赖"
echo "- ✅ 无需系统级依赖安装"
echo "- ✅ 支持离线运行"