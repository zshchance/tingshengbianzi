# Whisper语音识别模型下载指南

## 概述

本文档提供了如何下载各种版本的Whisper语音识别模型到当前语音识别项目的详细指南。Whisper是OpenAI开发的开源语音识别模型，支持多种语言和多种模型大小。

## 支持的Whisper模型版本

### 模型大小列表

| 模型名称 | 大小 | 参数量 | 相对速度 | 准确率 | 推荐用途 |
|---------|------|--------|----------|--------|----------|
| tiny | 39MB | 39M | ~32x | ★★☆☆☆ | 快速测试，低精度需求 |
| base | 74MB | 74M | ~16x | ★★★☆☆ | 一般用途，平衡速度与精度 |
| small | 244MB | 244M | ~6x | ★★★★☆ | 较高精度要求 |
| medium | 769MB | 769M | ~2x | ★★★★☆ | 高精度要求 |
| large | 1550MB | 1550M | 1x | ★★★★★ | 最高精度要求 |
| large-v2 | 1550MB | 1550M | 1x | ★★★★★ | 最高精度，改进版 |
| large-v3 | 1550MB | 1550M | 1x | ★★★★★ | 最新最高精度版本 |

### 支持的语言

Whisper模型支持以下语言（部分）：
- 中文 (zh)
- 英文 (en)
- 日文 (ja)
- 韩文 (ko)
- 法文 (fr)
- 德文 (de)
- 西班牙文 (es)
- 俄文 (ru)
- 阿拉伯文 (ar)
- 印地文 (hi)
- 以及更多...

## 下载方法

### 方法1：使用项目内置脚本下载

项目提供了自动下载脚本，可以方便地下载所需的Whisper模型：

```bash
# 进入项目目录
cd /Users/zsh/Documents/2025个人工程onair/站长工具/字符特效/语言识别/audio-recognizer

# 运行下载脚本
./scripts/download-models.sh
```

该脚本会：
1. 检查是否已安装必要的依赖
2. 创建模型存储目录
3. 下载默认的中文和英文模型
4. 验证下载的模型完整性

### 方法2：手动下载GGML格式模型

本项目使用GGML格式的Whisper模型，可以通过以下方式下载：

#### 使用wget下载GGML模型

```bash
# 创建模型目录
mkdir -p ./models/whisper

# 下载tiny模型 (39MB)
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.bin -O ./models/whisper/ggml-tiny.bin

# 下载base模型 (74MB) - 默认推荐
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -O ./models/whisper/ggml-base.bin

# 下载small模型 (244MB)
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.bin -O ./models/whisper/ggml-small.bin

# 下载medium模型 (769MB)
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-medium.bin -O ./models/whisper/ggml-medium.bin

# 下载large模型 (1550MB)
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-large.bin -O ./models/whisper/ggml-large.bin

# 下载large-v3模型 (1550MB)
wget https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-large-v3.bin -O ./models/whisper/ggml-large-v3.bin

# 备选下载地址（如果上述地址无法访问）
# 使用Hugging Face镜像站点
wget https://hf-mirror.com/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -O ./models/whisper/ggml-base.bin

# 使用阿里云ModelScope镜像
wget https://modelscope.cn/models/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -O ./models/whisper/ggml-base.bin
```

#### 使用curl下载GGML模型

```bash
# 创建模型目录
mkdir -p ./models/whisper

# 下载base模型 (74MB) - 默认推荐
curl -L https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -o ./models/whisper/ggml-base.bin

# 下载其他模型...

# 备选下载地址（如果上述地址无法访问）
# 使用Hugging Face镜像站点
curl -L https://hf-mirror.com/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -o ./models/whisper/ggml-base.bin

# 使用阿里云ModelScope镜像
curl -L https://modelscope.cn/models/ggml-org/whisper.cpp/resolve/main/ggml-base.bin -o ./models/whisper/ggml-base.bin
```

### 方法3：使用Python脚本下载GGML模型

创建一个Python脚本来自动下载GGML格式的Whisper模型：

```python
# download_whisper_models.py
import os
import requests

def download_ggml_model(model_name, output_dir):
    """下载指定的GGML格式Whisper模型"""
    # 主要下载地址 - 使用ggml-org组织
    base_url = "https://huggingface.co/ggml-org/whisper.cpp/resolve/main"
    # 备选下载地址1 - 使用镜像站点
    fallback_url1 = "https://hf-mirror.com/ggml-org/whisper.cpp/resolve/main"
    # 备选下载地址2 - 使用阿里镜像
    fallback_url2 = "https://modelscope.cn/models/ggml-org/whisper.cpp/resolve/main"
    
    filename = f"ggml-{model_name}.bin"
    url = f"{base_url}/{filename}"
    fallback_url1_full = f"{fallback_url1}/{filename}"
    fallback_url2_full = f"{fallback_url2}/{filename}"
    output_path = os.path.join(output_dir, filename)
    
    print(f"正在下载 {model_name} 模型...")
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 尝试从主要地址下载
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        download_from_response(response, output_path, model_name)
    except Exception as e:
        print(f"从主要地址下载失败: {e}")
        print(f"尝试从备选地址1下载...")
        
        # 尝试从备选地址1下载
        try:
            response = requests.get(fallback_url1_full, stream=True)
            response.raise_for_status()
            download_from_response(response, output_path, model_name)
        except Exception as e1:
            print(f"从备选地址1下载失败: {e1}")
            print(f"尝试从备选地址2下载...")
            
            # 尝试从备选地址2下载
            try:
                response = requests.get(fallback_url2_full, stream=True)
                response.raise_for_status()
                download_from_response(response, output_path, model_name)
            except Exception as e2:
                print(f"从备选地址2下载也失败: {e2}")
                raise Exception(f"无法下载模型 {model_name}，所有下载地址均失败")

def download_from_response(response, output_path, model_name):
    """从响应对象下载文件"""
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"\r下载进度: {percent:.1f}%", end='')
    
    print(f"\n{model_name} 模型下载完成，保存在 {output_path}")

if __name__ == "__main__":
    models = ["tiny", "base", "small", "medium", "large", "large-v3"]
    output_dir = "./models/whisper"
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 下载所有模型
    for model in models:
        try:
            download_ggml_model(model, output_dir)
        except Exception as e:
            print(f"下载 {model} 模型时出错: {e}")
            print("继续下载下一个模型...")
```

运行脚本：
```bash
python download_whisper_models.py
```

## 模型下载地址说明

### 主要下载地址

Whisper模型文件可以从以下地址下载：

1. **Hugging Face官方仓库**：
   - 组织：ggml-org
   - 地址：`https://huggingface.co/ggml-org/whisper.cpp/tree/main`
   - 直接下载链接：`https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-{模型名称}.bin`

2. **备选下载地址**：
   - **Hugging Face镜像站点**：
     - 地址：`https://hf-mirror.com/ggml-org/whisper.cpp/resolve/main/ggml-{模型名称}.bin`
   - **阿里云ModelScope镜像**：
     - 地址：`https://modelscope.cn/models/ggml-org/whisper.cpp/resolve/main/ggml-{模型名称}.bin`

### 注意事项

1. 如果Hugging Face地址无法访问，可以使用备选地址下载模型
2. 本文档中的下载脚本已自动集成所有下载地址，会自动尝试备选地址
3. 所有地址提供的模型文件是相同的，只是托管在不同的服务器上

## 模型存储目录结构

下载的模型应按照以下目录结构存储：

```
models/
├── whisper/
│   ├── ggml-base.bin             # Base模型（默认使用）
│   ├── ggml-tiny.bin             # Tiny模型
│   ├── ggml-small.bin            # Small模型
│   ├── ggml-medium.bin           # Medium模型
│   ├── ggml-large.bin            # Large模型
│   └── ggml-large-v3.bin         # Large-v3模型
└── vosk/
    └── ...
```

**重要说明**：
- 本项目使用的是**GGML格式**的Whisper模型，而不是Hugging Face的PyTorch格式
- 默认模型文件名为 `ggml-base.bin`，位于 `models/whisper/` 目录下
- 程序会自动在以下位置查找模型文件：
  - `{ModelPath}/whisper/ggml-base.bin`
  - `{ModelPath}/ggml-base.bin`
  - `./models/whisper/ggml-base.bin`
  - `./models/ggml-base.bin`

## 配置应用使用下载的模型

### 1. 更新应用配置

在应用中配置模型路径，可以通过以下方式：

```javascript
// 前端配置示例
const config = {
  language: "zh-CN",
  modelPath: "./models",  // 设置为模型存储路径（相对于可执行文件）
  sampleRate: 16000,
  bufferSize: 4000,
  confidenceThreshold: 0.5,
  maxAlternatives: 1,
  enableWordTimestamp: true
};

// 更新配置
await UpdateConfig(JSON.stringify(config));
```

### 2. 选择特定模型

应用会自动查找并使用 `ggml-base.bin` 作为默认模型。如果需要使用其他模型，可以通过以下方式：

1. **替换默认模型文件**：
   ```bash
   # 备份原始模型
   mv ./models/whisper/ggml-base.bin ./models/whisper/ggml-base.bin.bak
   
   # 使用small模型作为默认模型
   cp ./models/whisper/ggml-small.bin ./models/whisper/ggml-base.bin
   ```

2. **修改配置中的模型路径**：
   ```javascript
   // 如果想使用特定模型，可以修改配置
   const config = {
     language: "zh-CN",
     modelPath: "./models",  // 基础路径
     // 注意：当前版本不支持直接指定模型文件名
     // 程序会自动在模型路径下查找 ggml-base.bin
   };
   ```

### 3. 验证模型是否加载成功

启动应用后，可以通过以下方式验证模型是否加载成功：

1. 查看控制台输出，应该看到类似信息：
   ```
   找到Whisper模型: /path/to/models/whisper/ggml-base.bin
   Whisper模型已准备好: /path/to/models/whisper/ggml-base.bin
   ```

2. 尝试使用语音识别功能，如果模型加载成功，识别结果应该准确。

## 模型选择建议

### 根据使用场景选择模型

1. **实时语音识别**：
   - 推荐模型：tiny 或 base
   - 原因：识别速度快，适合实时处理

2. **音频文件转录**：
   - 推荐模型：small 或 medium
   - 原因：平衡了速度和精度，适合离线处理

3. **高精度转录需求**：
   - 推荐模型：large-v2 或 large-v3
   - 原因：最高精度，适合对准确性要求极高的场景

4. **资源受限环境**：
   - 推荐模型：tiny
   - 原因：模型最小，内存占用最少

### 根据语言选择模型

1. **中文识别**：
   - 推荐模型：small 或 medium
   - 原因：中文识别需要较大模型才能获得较好效果

2. **英文识别**：
   - 推荐模型：base 或 small
   - 原因：英文是Whisper的主要训练语言，较小模型也能获得不错效果

3. **多语言混合**：
   - 推荐模型：medium 或 large
   - 原因：需要更大的模型来处理多语言混合情况

## 性能优化建议

1. **模型量化**：
   - 可以使用量化技术减小模型大小，提高推理速度
   - 示例：使用8位量化可以将模型大小减少约50%

2. **模型缓存**：
   - 首次加载模型后，将其保留在内存中，避免重复加载

3. **硬件加速**：
   - 使用GPU加速可以显著提高识别速度
   - 确保安装了适当的CUDA或ROCm支持

4. **批处理**：
   - 对于长音频，可以分段处理，然后合并结果

## 常见问题与解决方案

### 1. 下载速度慢

**问题**：从Hugging Face下载模型速度很慢

**解决方案**：
- 使用镜像站点：设置HF_ENDPOINT环境变量
- 使用代理：配置网络代理
- 分段下载：使用支持断点续传的下载工具

```bash
# 使用国内镜像
export HF_ENDPOINT=https://hf-mirror.com

# 然后使用huggingface-cli下载
huggingface-cli download openai/whisper-base --local-dir ./models/whisper/base
```

### 2. 模型加载失败

**问题**：应用无法加载下载的模型

**解决方案**：
- 检查模型文件完整性
- 确认模型路径配置正确
- 检查文件权限

```bash
# 检查模型文件
ls -la ./models/whisper/base/
# 应该包含 config.json 和 pytorch_model.bin 等文件
```

### 3. 内存不足

**问题**：加载大模型时内存不足

**解决方案**：
- 使用较小的模型
- 启用模型量化
- 增加系统虚拟内存

### 4. 识别精度低

**问题**：识别结果不准确

**解决方案**：
- 使用更大的模型
- 调整置信度阈值
- 确保音频质量良好
- 尝试不同的音频预处理参数

## 验证模型安装

安装完成后，可以通过以下方式验证模型是否正确安装：

1. **检查文件结构**：
   ```bash
   ls -la ./models/whisper/
   ```

2. **使用应用测试**：
   - 启动应用
   - 选择音频文件
   - 尝试使用下载的模型进行识别

3. **查看日志**：
   - 检查应用日志，确认模型加载成功

## 更新模型

当新版本的Whisper模型发布时，可以按照以下步骤更新：

1. 备份现有模型
2. 下载新版本模型
3. 更新应用配置（如果需要）
4. 测试新模型功能

```bash
# 备份现有模型
cp -r ./models/whisper ./models/whisper_backup

# 下载新模型
huggingface-cli download openai/whisper-large-v3 --local-dir ./models/whisper/large-v3
```

## 总结

本指南提供了下载和配置Whisper语音识别模型的详细步骤。根据应用需求选择合适的模型大小，并按照正确的目录结构存储模型文件。正确配置模型路径后，应用就可以使用下载的模型进行语音识别了。

如果遇到问题，请参考常见问题与解决方案部分，或者查看项目的日志文件获取更多详细信息。