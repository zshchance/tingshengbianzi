# 版本管理说明

本项目现在使用统一的版本号配置，确保打包版本和运行时版本保持一致。

## 版本号配置

### 1. 主配置文件
版本号统一在 `wails.json` 文件中配置：

```json
{
  "info": {
    "productName": "听声辨字",
    "productVersion": "2.1.0",
    "copyright": "© 2025 administrator.wiki",
    "comments": "智能音频识别工具"
  }
}
```

### 2. 自动读取机制
- **前端运行时**: 通过 `AppStatusService` 自动从 `wails.json` 读取版本号
- **后端服务**: `VersionService` 和 `ConfigService` 自动从配置文件读取
- **打包构建**: 使用 `wails.json` 中的版本号进行打包

## 更新版本号

只需要更新 `wails.json` 文件中的 `productVersion` 字段：

```bash
# 手动编辑 wails.json 文件
# 或使用命令行工具更新
jq '.info.productVersion = "2.2.0"' wails.json > tmp.json && mv tmp.json wails.json
```

## 构建命令

### 普通构建
```bash
wails build
```

### 使用构建脚本（推荐）
```bash
./build-with-version.sh
```

构建脚本会：
1. 自动从 `wails.json` 读取版本号
2. 显示构建信息
3. 执行构建过程
4. 验证版本号一致性

### 开发模式构建
```bash
wails dev
```

## 版本号格式

推荐使用语义化版本号格式：`MAJOR.MINOR.PATCH`

- **MAJOR**: 主版本号，不兼容的API修改
- **MINOR**: 次版本号，向下兼容的功能性新增
- **PATCH**: 修订号，向下兼容的问题修正

示例：
- `2.1.0` - 新增功能版本
- `2.1.1` - Bug修复版本
- `3.0.0` - 重大更新版本

## 验证版本号一致性

### 运行时检查
应用启动后，底部状态栏会显示从 `wails.json` 读取的版本号：
```
听声辨字 v2.1.0
```

### 开发者控制台
浏览器控制台会显示版本获取日志：
```javascript
console.log('✅ 应用状态更新成功:', {
  versionInfo: "听声辨字 v2.1.0"
});
```

### 打包后检查
```bash
# macOS
ls -la build/bin/

# 查看应用信息（macOS）
mdls -name kMDItemVersion build/bin/darwin/tingshengbianzi.app
```

## 注意事项

1. **不要手动修改代码中的硬编码版本号**
   - 所有版本号都应该从 `wails.json` 读取
   - 硬编码版本号只作为后备方案

2. **更新版本号后的步骤**
   - 更新 `wails.json` 中的版本号
   - 重新构建应用
   - 测试版本号显示是否正确

3. **Git提交建议**
   - 将 `wails.json` 的修改纳入版本控制
   - 提交信息应该包含版本号变更

## 故障排除

### 如果版本号显示错误
1. 检查 `wails.json` 文件是否存在
2. 验证 JSON 格式是否正确
3. 检查 `productVersion` 字段是否存在

### 如果构建失败
1. 确保 `jq` 工具已安装（macOS: `brew install jq`）
2. 检查文件权限
3. 使用普通 `wails build` 命令作为备选方案

### 开发环境问题
如果开发环境中版本号不更新：
1. 重启开发服务器
2. 清除浏览器缓存
3. 检查前端是否热重载