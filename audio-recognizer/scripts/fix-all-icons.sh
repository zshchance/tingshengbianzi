#!/bin/bash

# 听声辨字 - 完整图标修复脚本
# 确保所有图标文件都使用自定义logo，解决打包后图标变成默认图标的问题

set -e

# 解析参数
NO_REBUILD=false
for arg in "$@"; do
    case $arg in
        --no-rebuild)
            NO_REBUILD=true
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --no-rebuild   不执行构建步骤"
            echo "  --help         显示此帮助信息"
            exit 0
            ;;
    esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目配置
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$PROJECT_ROOT/frontend/assets/icons"
ORIGINAL_LOGO="$ICON_DIR/听生辩字logo.png"
MAIN_ICON="$ICON_DIR/icon.icns"
CUSTOM_ICON="$ICON_DIR/icon-custom.icns"
WAILS_CONFIG="$PROJECT_ROOT/wails.json"
BUILD_ICON="$PROJECT_ROOT/build/appicon.png"

echo -e "${BLUE}🎨 听声辨字 - 完整图标修复工具${NC}"
echo "========================================"
echo "📁 项目根目录: $PROJECT_ROOT"
echo "📂 图标目录: $ICON_DIR"
echo "🖼️ 原始logo: $ORIGINAL_LOGO"

# 1. 检查原始logo文件
echo ""
echo "🔍 步骤1: 检查原始logo文件..."
if [ ! -f "$ORIGINAL_LOGO" ]; then
    echo -e "${RED}❌ 原始logo文件不存在: $ORIGINAL_LOGO${NC}"
    exit 1
fi

LOGO_SIZE=$(stat -f%z "$ORIGINAL_LOGO" 2>/dev/null || echo "unknown")
LOGO_DIM=$(sips -g all "$ORIGINAL_LOGO" 2>/dev/null | grep "pixelWidth" | awk '{print $2}' || echo "unknown")
LOGO_DIM_HEIGHT=$(sips -g all "$ORIGINAL_LOGO" 2>/dev/null | grep "pixelHeight" | awk '{print $2}' || echo "unknown")
echo -e "${GREEN}✅ 原始logo: ${LOGO_SIZE} bytes, ${LOGO_DIM}x${LOGO_DIM_HEIGHT}px${NC}"

# 检查原始logo尺寸是否足够
if [ "$LOGO_DIM" -lt 1024 ] || [ "$LOGO_DIM_HEIGHT" -lt 1024 ]; then
    echo -e "${YELLOW}⚠️ 原始logo尺寸小于1024x1024，可能影响图标清晰度${NC}"
    echo -e "${YELLOW}⚠️ 建议使用至少1024x1024像素的高质量logo文件${NC}"
else
    echo -e "${GREEN}✅ 原始logo尺寸符合要求${NC}"
fi

# 2. 清理旧的iconset并重新生成
echo ""
echo "🔧 步骤2: 重新生成完整的iconset..."
rm -rf "$ICON_DIR/icon.iconset" 2>/dev/null || true
mkdir -p "$ICON_DIR/icon.iconset"

echo "📋 生成所有必需尺寸的图标（高质量模式）..."

# 生成所有尺寸，使用高质量重采样（macOS默认）
sips -z 16 16 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_16x16.png" 2>/dev/null || true
sips -z 32 32 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_16x16@2x.png" 2>/dev/null || true
sips -z 32 32 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_32x32.png" 2>/dev/null || true
sips -z 64 64 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_32x32@2x.png" 2>/dev/null || true
sips -z 128 128 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_128x128.png" 2>/dev/null || true
sips -z 256 256 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_128x128@2x.png" 2>/dev/null || true
sips -z 256 256 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_256x256.png" 2>/dev/null || true
sips -z 512 512 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_256x256@2x.png" 2>/dev/null || true
sips -z 512 512 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_512x512.png" 2>/dev/null || true
sips -z 1024 1024 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_512x512@2x.png" 2>/dev/null || true

echo -e "${GREEN}✅ iconset 生成完成${NC}"

# 3. 生成ICNS文件
echo ""
echo "🏗️ 步骤3: 生成ICNS文件..."
if iconutil -c icns "$ICON_DIR/icon.iconset" -o "$MAIN_ICON"; then
    MAIN_SIZE=$(stat -f%z "$MAIN_ICON" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 主ICNS文件生成成功: ${MAIN_SIZE} bytes${NC}"
else
    echo -e "${RED}❌ 主ICNS文件生成失败${NC}"
    exit 1
fi

# 4. 复制到自定义图标位置
cp "$MAIN_ICON" "$CUSTOM_ICON"
echo -e "${GREEN}✅ 已复制到自定义图标位置${NC}"

# 5. 生成其他格式的图标
echo ""
echo "📦 步骤4: 生成其他格式的图标..."

# 生成ICO文件（Windows）
sips -s format png -z 256 256 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.ico" 2>/dev/null || true

# 更新PNG文件
cp "$MAIN_ICON" "$ICON_DIR/icon.png" 2>/dev/null || cp "$ORIGINAL_LOGO" "$ICON_DIR/icon.png"

echo -e "${GREEN}✅ 其他格式图标生成完成${NC}"

# 6. 更新Wails配置
echo ""
echo "⚙️ 步骤5: 更新Wails配置文件..."
if [ -f "$WAILS_CONFIG" ]; then
    # 检查是否已经指向正确的图标文件
    if grep -q '"icon":' "$WAILS_CONFIG"; then
        # 替换图标路径
        sed -i '' 's|"icon":.*|"icon": "frontend/assets/icons/icon-custom.icns"|' "$WAILS_CONFIG"
        echo -e "${GREEN}✅ Wails配置已更新，指向自定义图标${NC}"
    else
        echo -e "${YELLOW}⚠️ Wails配置中没有找到icon配置，添加中...${NC}"
        # 添加icon配置到JSON文件中
        awk '/}$/ { print "  \"icon\": \"frontend/assets/icons/icon-custom.icns\"," }1' "$WAILS_CONFIG" > "$WAILS_CONFIG.tmp" && mv "$WAILS_CONFIG.tmp" "$WAILS_CONFIG"
        echo -e "${GREEN}✅ 已添加图标配置到Wails配置${NC}"
    fi
else
    echo -e "${RED}❌ Wails配置文件不存在: $WAILS_CONFIG${NC}"
    exit 1
fi

# 7. 更新构建目录图标
echo ""
echo "🔨 步骤6: 更新构建目录图标..."
mkdir -p "$(dirname "$BUILD_ICON")" 2>/dev/null || true
if [ -f "$MAIN_ICON" ]; then
    cp "$MAIN_ICON" "$BUILD_ICON"
    BUILD_SIZE=$(stat -f%z "$BUILD_ICON" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 构建目录图标已更新: ${BUILD_SIZE} bytes${NC}"
else
    echo -e "${YELLOW}⚠️ 主ICNS文件不存在，跳过构建目录更新${NC}"
fi

# 8. 清理和验证
echo ""
echo "🧹 步骤7: 清理和验证..."

# 验证所有图标文件
echo -e "${BLUE}📋 生成的图标文件:${NC}"
find "$ICON_DIR" -name "*.icns" -o -name "*.png" -o -name "*.ico" | while read file; do
    size=$(stat -f%z "$file" 2>/dev/null || echo "unknown")
    echo "   $(basename "$file"): $size bytes"
done

# 验证配置文件
echo -e "${BLUE}📋 Wails配置:${NC}"
if [ -f "$WAILS_CONFIG" ]; then
    grep '"icon"' "$WAILS_CONFIG" | sed 's/^[[:space:]]*/   /'
fi

echo ""
echo -e "${GREEN}🎉 图标修复完成！${NC}"
echo ""
echo "🚀 下一步："
echo "1. 重新构建应用：export PATH=\$PATH:~/go/bin && wails build -platform darwin/arm64 -clean"
echo "2. 清理图标缓存：killall Dock"
echo "3. 启动应用验证图标：open build/bin/tingshengbianzi.app"

# 9. 询问构建选项
if [ "$NO_REBUILD" = false ]; then
    echo ""
    echo -e "${BLUE}🔨 构建选项:${NC}"
    echo "1. 仅重新构建应用 (wails build)"
    echo "2. 完整打包 (包含所有依赖)"
    echo "3. 跳过构建"
    echo ""
    read -p "请选择 (1/2/3): " -n 1 -r
    echo

    case $REPLY in
        "1")
            echo -e "${BLUE}🔨 开始重新构建应用...${NC}"
            cd "$PROJECT_ROOT"
            export PATH=$PATH:~/go/bin

            if wails build -platform darwin/arm64 -clean; then
                echo -e "${GREEN}✅ 应用重新构建成功！${NC}"

                # 检查生成的应用图标
                APP_ICON="$PROJECT_ROOT/build/bin/tingshengbianzi.app/Contents/Resources/iconfile.icns"
                if [ -f "$APP_ICON" ]; then
                    APP_SIZE=$(stat -f%z "$APP_ICON" 2>/dev/null || echo "unknown")
                    echo -e "${GREEN}✅ 应用图标已更新: ${APP_SIZE} bytes${NC}"
                else
                    echo -e "${RED}❌ 应用图标文件未找到${NC}"
                fi

                echo ""
                echo -e "${BLUE}🚀 启动应用测试图标：${NC}"
                echo "open \"$PROJECT_ROOT/build/bin/tingshengbianzi.app\""
            else
                echo -e "${RED}❌ 应用重新构建失败${NC}"
            fi
            ;;
        "2")
            echo -e "${BLUE}📦 开始完整打包...${NC}"
            if [ -f "$SCRIPT_DIR/build-complete.sh" ]; then
                "$SCRIPT_DIR/build-complete.sh"
            else
                echo -e "${RED}❌ 完整打包脚本不存在: $SCRIPT_DIR/build-complete.sh${NC}"
                echo -e "${YELLOW}⚠️ 回退到标准构建...${NC}"
                cd "$PROJECT_ROOT"
                export PATH=$PATH:~/go/bin
                wails build -platform darwin/arm64 -clean
            fi
            ;;
        "3"|"")
            echo -e "${YELLOW}⏭️ 跳过构建${NC}"
            ;;
        *)
            echo -e "${YELLOW}⏭️ 无效选择，跳过构建${NC}"
            ;;
    esac
else
    echo ""
    echo -e "${YELLOW}⏭️ 跳过构建 (no-rebuild模式)${NC}"
fi

echo ""
echo -e "${BLUE}💡 图标缓存清理建议：${NC}"
echo "- 重启Finder: Option + Command + Esc → 选择Finder → 重新打开"
echo "- 重启Dock: killall Dock"
echo "- 重启系统: 清除所有系统缓存"

echo ""
echo -e "${GREEN}✅ 脚本执行完成！${NC}"