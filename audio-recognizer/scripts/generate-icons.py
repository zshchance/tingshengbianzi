#!/usr/bin/env python3
"""
图标生成脚本
从原始logo生成不同尺寸的图标文件，支持跨平台应用
"""

import os
import sys
from PIL import Image, ImageOps

def create_resized_icons(source_path, output_dir):
    """创建不同尺寸的图标文件"""

    try:
        # 打开源图片
        with Image.open(source_path) as img:
            # 转换为RGB模式（处理可能的RGBA模式）
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # 确保图片是正方形的
            width, height = img.size
            if width != height:
                # 居中裁剪成正方形
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))

            # 定义需要的图标尺寸
            icon_sizes = [16, 32, 64, 128, 256, 512, 1024]

            # 创建.iconset目录结构（macOS）
            iconset_dir = os.path.join(output_dir, "icon.iconset")
            os.makedirs(iconset_dir, exist_ok=True)

            # 生成不同尺寸的图标
            for size in icon_sizes:
                # 调整大小
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)

                # 保存标准尺寸图标
                resized_img.save(os.path.join(iconset_dir, f"icon_{size}x{size}.png"), "PNG")

                # macOS需要的高分辨率版本
                if size * 2 <= 1024:
                    hd_size = size * 2
                    hd_img = img.resize((hd_size, hd_size), Image.Resampling.LANCZOS)
                    hd_img.save(os.path.join(iconset_dir, f"icon_{size}x{size}@2x.png"), "PNG")

            # 创建标准应用图标（256x256）
            app_icon_dir = output_dir
            app_icon = img.resize((256, 256), Image.Resampling.LANCZOS)
            app_icon.save(os.path.join(app_icon_dir, "app-icon.png"), "PNG")

            # 创建favicon目录（用于网页）
            favicon_dir = os.path.join(output_dir, "..", "favicon")
            os.makedirs(favicon_dir, exist_ok=True)

            # 生成favicon（32x32）
            favicon_img = img.resize((32, 32), Image.Resampling.LANCZOS)
            favicon_img.save(os.path.join(favicon_dir, "favicon-32x32.png"), "PNG")

            # 生成Apple touch icon
            apple_touch_img = img.resize((180, 180), Image.Resampling.LANCZOS)
            apple_touch_img.save(os.path.join(favicon_dir, "apple-touch-icon.png"), "PNG")

            print(f"✅ 图标生成完成！")
            print(f"📁 输出目录: {output_dir}")
            print(f"🎨 生成的尺寸: {icon_sizes}")

    except Exception as e:
        print(f"❌ 图标生成失败: {e}")
        sys.exit(1)

def main():
    # 获取项目根目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    # 源图标路径
    source_icon = os.path.join(project_root, "frontend", "assets", "icons", "听生辩字logo.png")

    # 输出目录
    output_dir = os.path.join(project_root, "frontend", "assets", "icons")

    # 检查源文件是否存在
    if not os.path.exists(source_icon):
        print(f"❌ 源图标文件不存在: {source_icon}")
        sys.exit(1)

    print(f"🎯 源图标: {source_icon}")
    print(f"📁 输出目录: {output_dir}")

    # 生成图标
    create_resized_icons(source_icon, output_dir)

    # 生成macOS icns文件（如果系统支持）
    try:
        iconset_path = os.path.join(output_dir, "icon.iconset")
        icns_output = os.path.join(output_dir, "icon.icns")

        # 尝试使用iconutil命令（macOS）
        if os.system(f"which iconutil > /dev/null 2>&1") == 0:
            print("🍎 正在生成macOS icns文件...")
            os.system(f"iconutil -c icns {iconset_path} -o {icns_output}")
            if os.path.exists(icns_output):
                print(f"✅ macOS icns文件生成完成: {icns_output}")
        else:
            print("ℹ️ 未找到iconutil命令，跳过icns文件生成")
    except:
        print("ℹ️ 无法生成icns文件，将在构建时处理")

if __name__ == "__main__":
    main()