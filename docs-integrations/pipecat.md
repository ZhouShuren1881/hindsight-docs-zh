---
sidebar_position: 22
title: "Pipecat 与 Hindsight 持久记忆 | 集成"
description: "通过 Hindsight 为 Pipecat 语音 AI 管道添加持久的长期记忆。只需在用户聚合器和 LLM 服务之间插入一个 FrameProcessor，即可在每轮开始前召回上下文，并在之后存入对话内容。"
---

# Pipecat {#pipecat}

借助 [Hindsight](https://vectorize.io/hindsight)，为 [Pipecat](https://github.com/pipecat-ai/pipecat) 语音 AI 管道添加持久的长期记忆。只需在用户上下文聚合器和 LLM 服务之间插入一个 `FrameProcessor`，就能在每轮开始前召回相关记忆，并在之后存入对话内容。

[查看更新日志 →](/changelog/integrations/pipecat)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取 API 密钥，无需自行托管。
:::

```bash
pip install hindsight-pipecat
```

```python
from pipecat.pipeline.pipeline import Pipeline
from hindsight_pipecat import HindsightMemoryService

memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)

pipeline = Pipeline([
    transport.input(),
    stt_service,
    user_aggregator,
    memory,           # ← 在 user_aggregator 和 LLM 之间添加
    llm_service,
    assistant_aggregator,
    tts_service,
    transport.output(),
])
```

### 自托管（本地开发） {#self-hosting-local-development}

如果你希望自行托管：

```bash
# 1. 启动 Hindsight
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

```python
# 2. 将 Pipecat 指向本地服务器
memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

## 工作原理 {#how-it-works}

```
新一轮开始
  └─ 收到 OpenAILLMContextFrame
       ├─ 存入上一轮完整对话（用户 + 助手），发出后无需等待
       └─ 为当前用户查询召回相关记忆
            └─ 将记忆注入 <hindsight_memories> 系统消息
                 └─ 将补充了记忆的上下文转发给 LLM
```

每当收到 `OpenAILLMContextFrame` 时：

1. **Retain（存入）** — 将新增的完整用户与助手对话轮次异步发送到 Hindsight，不会阻塞后续处理。
2. **Recall（召回）** — 使用最新的用户消息作为搜索查询；在 LLM 看到上下文之前，将结果作为系统消息注入其中。
3. **转发** — 将补充了记忆的上下文帧推送到下游。

记忆会在多次调用间累积。到了第三或第四轮，召回结果通常就会包含有用的上下文，管道无需再从头建立这些信息。

## 配置 {#configuration}

```python
HindsightMemoryService(
    bank_id="user-123",              # 必填：要使用的记忆库
    hindsight_api_url="...",         # Hindsight API URL
    api_key="hsk_...",               # API 密钥（Hindsight Cloud）
    recall_budget="mid",             # "low"、"mid" 或 "high"
    recall_max_tokens=4096,           # 召回结果的最大 token 数
    enable_recall=True,               # 在 LLM 调用前注入记忆
    enable_retain=True,               # 每次交互后存入对话轮次
    memory_prefix="Relevant memories from past conversations:\n",
)
```

### 全局配置 {#global-configuration}

```python
from hindsight_pipecat import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  # Hindsight Cloud（默认）
    api_key="hsk_...",
    recall_budget="mid",
)

# 之后创建服务时，无需重复指定连接信息
memory = HindsightMemoryService(bank_id="user-123")
```

## 兼容性 {#compatibility}

已在 Pipecat `v0.0.108` 上测试。为保持向前兼容，此处理器同时支持新的 `LLMContextFrame` 和已弃用的 `OpenAILLMContextFrame`。

## 手动测试 {#manual-testing}

`examples/` 目录中包含一个交互式文本聊天模拟器，可用于测试记忆召回和存入，无需 Daily、Deepgram 或 Cartesia 的 API 密钥：

```bash
python examples/interactive_chat.py --bank demo-user
```

`examples/basic_pipeline.py` 展示了包含 Daily、Deepgram、OpenAI 和 Cartesia 的完整语音管道。

## 前置条件 {#prerequisites}

需要有一个正在运行的 Hindsight 实例：

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # 在 http://localhost:8888 上启动
```

**Hindsight Cloud：**[注册](https://ui.hindsight.vectorize.io)，无需自行托管。
