#!/bin/bash

# 构建带有高质量图标的Wails应用
# 使用Wails自动化构建，然后替换高质量图标

set -e

echo "🎨 开始构建带有高质量图标的Wails应用..."

# 检查高质量图标文件
HIGH_QUALITY_ICON="build/darwin/icon.icns"
if [ ! -f "$HIGH_QUALITY_ICON" ]; then
    echo "❌ 错误: 高质量图标文件不存在 $HIGH_QUALITY_ICON"
    echo "💡 请先将高质量图标复制到 build/darwin/icon.icns"
    exit 1
fi

echo "✅ 找到高质量图标文件: $HIGH_QUALITY_ICON"
echo "📊 图标文件大小: $(ls -lh "$HIGH_QUALITY_ICON" | awk '{print $5}')"

# 清理之前的构建
echo "🧹 清理之前的构建文件..."
if [ -d "build/bin" ]; then
    rm -rf build/bin
fi

# 确保图标权限正确
chmod 644 "$HIGH_QUALITY_ICON"

# 使用Wails构建应用
echo "🔨 使用Wails构建应用..."
wails build -clean

# 检查构建结果
APP_FILE="build/bin/tingshengbianzi.app"
if [ -d "$APP_FILE" ]; then
    echo "✅ Wails构建成功！"

    # 替换为高质量图标
    echo "🎨 替换应用图标为高质量版本..."
    cp "$HIGH_QUALITY_ICON" "$APP_FILE/Contents/Resources/iconfile.icns"

    # 验证图标替换
    FINAL_ICON="$APP_FILE/Contents/Resources/iconfile.icns"
    if [ -f "$FINAL_ICON" ]; then
        echo "✅ 高质量图标已成功嵌入应用"
        echo "📊 嵌入图标大小: $(ls -lh "$FINAL_ICON" | awk '{print $5}')"
    else
        echo "⚠️ 警告: 图标替换失败"
    fi

    # 显示应用包信息
    echo "📦 应用包信息:"
    echo "   位置: $APP_FILE"
    echo "   大小: $(du -sh "$APP_FILE" | awk '{print $1}')"

    # 测试启动
    echo "🚀 启动应用进行测试..."
    open "$APP_FILE"

else
    echo "❌ Wails构建失败：应用未生成"
    exit 1
fi

echo "🎉 高质量图标应用构建完成！"
echo "💡 说明: 图标已从 build/darwin/icon.icns 复制到应用包中"