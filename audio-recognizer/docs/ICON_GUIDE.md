# 听声辨字 - 应用程序图标指南

## 概述

本程序使用"听声辩字logo.png"作为主图标，并自动生成各种尺寸的图标文件以支持不同平台和用途。

## 图标文件结构

```
frontend/assets/icons/
├── 听生辩字logo.png              # 原始logo文件 (224KB)
├── app-icon.png                  # 应用主图标 (256x256)
├── icon.iconset/                 # macOS图标集
│   ├── icon_16x16.png
│   ├── icon_16x16@2x.png
│   ├── icon_32x32.png
│   ├── icon_32x32@2x.png
│   ├── icon_128x128.png
│   ├── icon_128x128@2x.png
│   ├── icon_256x256.png
│   ├── icon_256x256@2x.png
│   ├── icon_512x512.png
│   ├── icon_512x512@2x.png
│   └── icon_1024x1024.png
├── ../favicon/                   # 网页图标
│   ├── favicon-32x32.png
│   └── apple-touch-icon.png
└── icon.ico                      # Windows图标 (256x256)
```

## 配置文件

### Wails配置 (`wails.json`)

```json
{
  "icon": "frontend/assets/icons/app-icon.png"
}
```

### HTML图标配置 (`frontend/index.html`)

```html
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon/favicon-32x32.png"/>
<link rel="apple-touch-icon" href="/assets/icons/favicon/apple-touch-icon.png"/>
```

## 图标生成脚本

### 自动生成脚本

```bash
# 生成所有尺寸的图标
./scripts/generate-icons.sh

# 带图标的完整构建流程
./scripts/build-with-icons.sh
```

### 手动生成图标

如果需要手动生成图标，可以使用macOS的`sips`命令：

```bash
# 生成256x256应用图标
sips -z 256 256 frontend/assets/icons/听生辩字logo.png --out frontend/assets/icons/app-icon.png

# 生成favicon
sips -z 32 32 frontend/assets/icons/听生辩字logo.png --out frontend/assets/icons/favicon/favicon-32x32.png
sips -z 180 180 frontend/assets/icons/听生辩字logo.png --out frontend/assets/icons/favicon/apple-touch-icon.png
```

## 构建流程

### 标准构建

```bash
# 确保PATH包含go bin
export PATH=$PATH:~/go/bin

# 构建应用程序
wails build -debug          # 开发版本
wails build                 # 生产版本 (默认)
wails build -clean          # 清理构建目录的生产版本
```

### 使用构建脚本

```bash
# 运行带图标生成的完整构建
./scripts/build-with-icons.sh
```

## 图标使用场景

1. **应用程序图标**: 在Dock、任务栏、桌面等显示
2. **网页图标**: 在浏览器标签页显示
3. **Apple Touch图标**: iOS设备上的Web应用图标
4. **打包图标**: Windows/macOS安装包使用的图标

## 更换图标

如果要更换应用程序图标：

1. 将新的logo文件命名为"听声辩字logo.png"放到`frontend/assets/icons/`目录
2. 运行图标生成脚本：
   ```bash
   ./scripts/generate-icons.sh
   ```
3. 重新构建应用程序：
   ```bash
   ./scripts/build-with-icons.sh
   ```

## 故障排除

### 图标未显示

1. 检查图标文件是否存在：
   ```bash
   ls -la frontend/assets/icons/app-icon.png
   ```

2. 检查wails.json配置：
   ```bash
   grep '"icon"' wails.json
   ```

3. 重新生成图标：
   ```bash
   rm -rf frontend/assets/icons/icon.iconset
   ./scripts/generate-icons.sh
   ```

4. 清理并重新构建：
   ```bash
   rm -rf build/bin/
   wails build -debug
   ```

### macOS图标问题

如果macOS应用图标未正确显示：

1. 检查生成的icns文件：
   ```bash
   ls -la build/bin/tingshengbianzi.app/Contents/Resources/iconfile.icns
   ```

2. 重新生成iconset：
   ```bash
   ./scripts/generate-icons.sh
   cd frontend/assets/icons/
   iconutil -c icns icon.iconset -o icon.icns
   ```

## 技术规格

- **原始尺寸**: 原始logo文件为PNG格式
- **标准应用图标**: 256x256 PNG格式
- **macOS图标集**: 支持1x和2x分辨率，从16x16到512x512
- **Windows图标**: 256x256 PNG格式（可转换为ICO）
- **网页图标**: 32x32 PNG格式
- **Apple Touch图标**: 180x180 PNG格式

## 自动化

图标生成已集成到构建流程中，使用`build-with-icons.sh`脚本可以：

1. 自动生成所有必需的图标尺寸
2. 验证图标文件存在
3. 清理旧的构建文件
4. 执行Wails构建
5. 验证构建结果
6. 可选地启动应用程序进行测试

这样可以确保每次构建时图标都是最新版本。