# 构建脚本使用指南

本目录包含了用于构建和优化听声辨字应用程序的各种脚本。

## 脚本概览

### 🔧 主要构建脚本

| 脚本 | 用途 | 推荐使用场景 |
|------|------|-------------|
| `build-complete.sh` | 完整打包（包含所有依赖） | **分发使用**，推荐用于最终用户安装包 |
| `build.sh` | 基础构建 | 开发测试 |
| `fix-icons-simple.sh` | 简化版图标修复 | **推荐使用**，修复图标显示问题 |
| `fix-all-icons.sh` | 修复应用图标 | 图标显示问题（备用方案） |
| `optimize-icons.sh` | 高质量图标优化 | 高级用户使用 |

### 🛠️ 辅助脚本

| 脚本 | 用途 |
|------|------|
| `download-models.sh` | 下载Whisper模型文件 |
| `bundle-ffmpeg.sh` | 打包FFmpeg依赖 |
| `generate-icons.sh` | 生成基础图标文件 |
| `build-macos-release.sh` | macOS专用发布构建 |

## 使用建议

### 🎯 问题1：打包后语音识别无结果

**解决方案：** 使用 `build-complete.sh` 进行完整打包

```bash
./scripts/build-complete.sh
```

该脚本包含：
- ✅ 完整的依赖打包（FFmpeg、Whisper CLI）
- ✅ 详细的日志系统
- ✅ 模型文件配置说明
- ✅ 权限修复

### 📁 问题2：模型文件不应打包到应用内部

**已解决：** `build-complete.sh` 现在不打包模型文件

- 📝 创建模型配置说明文件
- 📝 用户指南文档
- 📝 模型下载说明

用户需要在设置中指定模型目录，或将模型文件放置在：
- `~/Library/Application Support/听声辨字/models/`
- 应用同目录的 `models/` 文件夹

### 🎨 问题3：打包后应用图标模糊

**解决方案：** 使用图标优化脚本

```bash
# 方法1：使用完整打包（包含图标优化）
./scripts/build-complete.sh

# 方法2：单独优化图标（推荐）
./scripts/fix-icons-simple.sh

# 方法3：基础图标修复（备用）
./scripts/fix-all-icons.sh
```

**图标优化特点：**
- 🎯 使用Lanczos重采样（最高质量）
- 🎯 无压缩设置（最大文件大小）
- 🎯 自动分析原始logo质量
- 🎯 生成优化报告

## 完整构建流程

### 推荐的分发构建流程

1. **准备环境**
   ```bash
   export PATH=$PATH:~/go/bin
   ```

2. **完整打包**
   ```bash
   ./scripts/build-complete.sh
   ```

3. **验证结果**
   - 检查 `release/` 目录
   - 验证依赖文件完整性
   - 测试应用功能

### 开发构建流程

1. **快速构建**
   ```bash
   wails build -clean
   ```

2. **图标修复**
   ```bash
   ./scripts/fix-all-icons.sh
   ```

## 故障排除

### 常见问题

1. **FFmpeg权限错误**
   ```bash
   ./scripts/bundle-ffmpeg.sh
   ```

2. **Whisper CLI未找到**
   - 确保文件存在于 `backend/recognition/whisper-cli`
   - 检查文件权限：`chmod +x backend/recognition/whisper-cli`

3. **图标仍然模糊**
   ```bash
   ./scripts/optimize-icons.sh
   # 然后检查原始logo文件质量
   ```

4. **模型文件问题**
   ```bash
   ./scripts/download-models.sh
   ```

### 日志文件位置

应用程序会在以下位置生成日志文件：

- **macOS**: `~/Library/Logs/听声辨字/`
- **其他系统**: 应用目录下的 `logs/` 文件夹

日志文件命名格式：`audio-recognizer_YYYY-MM-DD_HH-mm-ss.log`

### 配置文件位置

- **开发环境**: `config/user-config.json`
- **生产环境**: `~/Library/Application Support/听声辨字/user-config.json`

## 构建输出

### build-complete.sh 输出结构

```
release/
├── tingshengbianzi.app          # macOS应用包
├── tingshengbianzi-portable/    # 便携版
│   ├── tingshengbianzi         # 主程序
│   ├── Resources/              # 资源文件
│   │   ├── third-party/bin/    # 第三方依赖 (FFmpeg, Whisper CLI)
│   │   ├── whisper-cli         # Whisper CLI
│   │   ├── config/             # 配置文件
│   │   └── models-info.txt     # 模型说明
│   └── start.sh               # 启动脚本
└── README.md                  # 用户说明文档
```

## 最佳实践

1. **分发前测试**
   - 使用完整打包脚本测试
   - 验证所有依赖正常工作
   - 检查图标质量

2. **版本管理**
   - 清理旧构建文件
   - 使用一致的版本号
   - 保留构建日志

3. **用户支持**
   - 提供模型下载说明
   - 包含故障排除指南
   - 标注系统要求