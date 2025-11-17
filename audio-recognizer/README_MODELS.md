# 🤖 模型管理系统

本项目的语音识别模型管理系统提供了一套完整的模型下载、配置和验证功能，让用户能够轻松地设置和管理 Whisper 语音识别模型。

## ✨ 功能特性

### 🔧 模型文件夹选择功能
- **图形化选择**: 通过应用设置界面直接选择模型文件夹
- **自动检测**: 应用自动扫描和识别可用模型文件
- **实时状态**: 显示模型配置状态和建议
- **路径验证**: 自动验证选择的路径和模型文件

### 🔍 模型检测和验证功能
- **模型扫描**: 自动识别 Whisper 模型文件 (.bin)
- **完整性检查**: 验证模型文件大小和完整性
- **状态显示**: 清晰显示已配置/需要配置状态
- **详细信息**: 显示模型类型、大小和推荐信息

### 📊 UI 显示模型状态和信息
- **状态徽章**: 直观的配置状态指示器
- **模型列表**: 显示所有检测到的模型文件
- **建议系统**: 根据检测情况提供配置建议
- **操作按钮**: 检查模型、查看文档等快捷操作

## 🚀 快速开始

### 方式一：应用内配置（推荐）

1. **启动应用**
   ```bash
   wails dev  # 开发模式
   # 或
   wails build  # 生产模式
   ```

2. **打开设置**
   - 点击应用右上角的"设置"按钮
   - 点击"显示高级设置"

3. **配置模型**
   - 在"🤖 模型设置"部分点击"浏览"按钮
   - 选择包含模型文件的文件夹
   - 应用会自动检测模型并显示状态

4. **验证配置**
   - 点击"检查模型"按钮验证配置
   - 查看模型状态和详细信息

### 方式二：脚本下载

1. **下载基础模型**
   ```bash
   ./scripts/download-models.sh base
   ```

2. **下载推荐组合**
   ```bash
   ./scripts/download-models.sh -r
   ```

3. **下载所有模型**
   ```bash
   ./scripts/download-models.sh -a
   ```

### 方式三：手动下载

1. **创建模型目录**
   ```bash
   mkdir -p models/whisper
   ```

2. **下载模型文件**
   ```bash
   curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/whisper/ggml-base.bin
   ```

3. **配置应用路径**
   - 在设置中输入模型路径：`./models` 或 `./models/whisper`

## 📁 支持的模型

| 模型名称 | 文件大小 | 推荐用途 | 下载链接 |
|----------|----------|----------|----------|
| ggml-tiny.bin | 39MB | 实时转录、低资源设备 | [下载](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin) |
| ggml-base.bin | 74MB | 日常使用、平衡性能 | [下载](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin) |
| ggml-small.bin | 244MB | 专业应用、中等精度 | [下载](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin) |
| ggml-medium.bin | 769MB | 高质量转录 | [下载](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin) |
| ggml-large-v3.bin | 1550MB | 最高精度要求 | [下载](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin) |

## 🎯 推荐配置

### 初学者推荐
```bash
# 下载 Base 模型（最佳平衡）
./scripts/download-models.sh base
```
- 文件大小：74MB
- 内存需求：~400MB
- 速度：16x 实时
- 精度：良好

### 专业用户推荐
```bash
# 下载推荐组合
./scripts/download-models.sh -r
```
包含：Base + Large-v3 模型
- 适合不同场景需求
- 提供备选方案

### 完整部署
```bash
# 下载所有模型
./scripts/download-models.sh -a
```
- 总大小约 4.2GB
- 覆盖所有使用场景

## 🔧 技术实现

### 后端 API

#### 1. 选择模型文件夹
```go
func (a *App) SelectModelDirectory() map[string]interface{}
```
- 打开系统文件夹选择对话框
- 返回选择的路径和扫描的模型信息

#### 2. 获取模型信息
```go
func (a *App) GetModelInfo(directory string) map[string]interface{}
```
- 扫描指定目录的模型文件
- 返回模型状态、数量和推荐信息

#### 3. 模型文件扫描
```go
func (a *App) scanModelFiles(directory string) []map[string]interface{}
```
- 支持 Whisper 模型文件检测
- 返回文件大小、类型等详细信息

### 前端组件

#### 1. 设置界面组件
- **SettingsModal.vue**: 高级设置界面
- **模型信息显示**: 状态、列表、建议
- **交互按钮**: 浏览、检查、文档

#### 2. Wails 集成
- **useWails.js**: API 调用封装
- **动态导入**: 避免循环依赖
- **错误处理**: 完整的错误处理和用户反馈

#### 3. 状态管理
- **响应式数据**: Vue 3 Composition API
- **实时更新**: 模型状态实时显示
- **用户反馈**: Toast 通知系统

## 📱 用户界面

### 模型设置界面

```
🤖 模型设置
├── 模型目录: [输入框] [浏览按钮]
├── 模型状态: ✅ 已配置 (3 个模型)
├── 可用模型:
│   ├── ggml-base.bin [WHISPER] 74MB
│   ├── ggml-tiny.bin [WHISPER] 39MB
│   └── ggml-large-v3.bin [WHISPER] 1550MB
├── 建议:
│   ├── ✅ 模型配置正常，可以开始使用语音识别功能
└── [检查模型] [📖 模型说明]
```

### 状态指示器

- **✅ 已配置**: 检测到有效模型文件
- **⚠️ 需要配置**: 未检测到模型或文件无效
- **模型数量**: 显示检测到的模型文件总数

## 🔧 脚本工具

### download-models.sh

功能完整的模型下载脚本：

```bash
# 显示帮助
./scripts/download-models.sh --help

# 列出所有模型
./scripts/download-models.sh --list

# 下载指定模型
./scripts/download-models.sh ggml-base.bin ggml-small.bin

# 下载推荐组合
./scripts/download-models.sh --recommends

# 下载所有模型
./scripts/download-models.sh --all
```

### 特性
- **多源下载**: 支持备用下载源
- **进度显示**: 实时下载进度
- **文件验证**: 下载后自动验证
- **断点续传**: 支持下载中断恢复
- **彩色输出**: 清晰的状态显示

## 📚 相关文档

- [详细模型指南](./MODEL_GUIDE.md) - 完整的模型配置和使用指南
- [Whisper.cpp 官方文档](https://github.com/ggerganov/whisper.cpp)
- [OpenAI Whisper 文档](https://github.com/openai/whisper)
- [Hugging Face 模型库](https://huggingface.co/models)

## 🐛 故障排除

### 常见问题

**Q: 模型下载失败**
```bash
# 检查网络连接
curl -I https://huggingface.co

# 使用代理
export https_proxy=http://your-proxy:port
./scripts/download-models.sh base
```

**Q: 模型未被检测到**
- 确认文件名格式：`ggml-{size}.bin`
- 检查文件权限：`chmod 644 models/whisper/*.bin`
- 验证文件完整性：`ls -la models/whisper/`

**Q: 应用无法识别模型**
1. 检查模型路径设置
2. 确认模型文件格式正确
3. 重启应用重新扫描
4. 查看控制台错误信息

**Q: 内存不足错误**
- 使用较小的模型：Tiny 或 Base
- 关闭其他应用释放内存
- 重启应用清理内存

### 调试信息

应用提供详细的调试信息：

```javascript
// 浏览器控制台输出
console.log('📁 模型文件夹选择结果:', result)
console.log('📊 模型信息结果:', modelInfo)
```

```go
// 后端日志输出
fmt.Printf("找到Whisper模型: %s\n", modelPath)
fmt.Printf("扫描完成，找到 %d 个模型文件\n", len(models))
```

## 🚀 未来功能

- [ ] **模型版本管理**: 支持模型版本更新和回滚
- [ ] **自动更新**: 检查并下载最新模型版本
- [ ] **模型优化**: 模型量化和压缩功能
- [ ] **云模型支持**: 支持云端模型服务
- [ ] **自定义模型**: 支持用户训练的模型

## 📄 许可证

本模型管理系统遵循项目主许可证。Whisper 模型遵循 MIT 许可证。

---

💡 **提示**: 如果您在使用过程中遇到问题，请查看详细的 [MODEL_GUIDE.md](./MODEL_GUIDE.md) 文档或联系技术支持。