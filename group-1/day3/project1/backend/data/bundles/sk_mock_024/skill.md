# Stable Diffusion 创作指南

## 概述

AI 图像生成从入门到商业应用。涵盖 Stable Diffusion 原理、ControlNet 精准控制、LoRA 模型训练、ComfyUI 工作流搭建、商业级出图流程。

## 快速开始

```bash
# ComfyUI 安装
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# 下载基础模型
wget -P models/checkpoints/ https://huggingface.co/stabilityai/sdxl/resolve/main/sd_xl_base_1.0.safetensors

# 启动
python main.py --listen 0.0.0.0
```

## Prompt 写作公式

```
[主体描述], [风格修饰], [画质增强], [光影氛围]

示例:
a young woman reading a book in a cozy cafe,
watercolor painting style, soft pastel colors,
masterpiece, best quality, highly detailed,
warm afternoon sunlight, bokeh background
```

## ControlNet 精准控制

| 模型 | 用途 | 适用场景 |
|------|------|----------|
| Canny | 边缘检测 | 线稿上色 |
| OpenPose | 姿势控制 | 人物动作 |
| Depth | 深度图 | 空间布局 |
| Tile | 超分辨率 | 图片放大 |
| IP-Adapter | 风格迁移 | 参考图生图 |

## LoRA 训练流程

```bash
# 1. 准备数据集 (20-50 张高质量图片)
# 2. 标注 (BLIP/WD Tagger 自动打标)
# 3. 训练

accelerate launch train_lora.py \
  --pretrained_model="stabilityai/sdxl" \
  --train_data_dir="./dataset" \
  --output_dir="./lora_output" \
  --resolution=1024 \
  --train_batch_size=1 \
  --learning_rate=1e-4 \
  --max_train_steps=1500
```

## ComfyUI 工作流

```
[Load Checkpoint] → [CLIP Text Encode (Positive)]
                  → [CLIP Text Encode (Negative)]
                  → [KSampler]
                     ├── steps: 30
                     ├── cfg: 7.5
                     └── sampler: euler_ancestral
                  → [VAE Decode]
                  → [Save Image]
```

## 商业应用场景

1. **电商产品图**: 白底图、场景图自动生成
2. **社交媒体**: 品牌视觉内容批量制作
3. **游戏美术**: 概念图、角色设计快速迭代
4. **广告创意**: A/B 测试素材快速产出
