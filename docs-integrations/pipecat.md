---
sidebar_position: 22
title: "Pipecat 持久记忆Hindsight |整合"
description: "通过Hindsight将持久的长期记忆添加到Pipecat语音AI管道。用户聚合器和 LLM 之间的单个帧处理器插槽用于每轮之前的记忆召回上下文和之后的记忆存储对话内容。"
---

# Pipecat {#pipecat}

持久的长期记忆[Pipecat](https://github.com/pipecat-ai/pipecat) 语音AI管道通过 [Hindsight](https://vectorize.io/hindsight)。单个`FrameProcessor` 用户上下文聚合器和LLM服务——每轮之前回忆相关记忆，之后保留对话内容。

[查看更新日志 →](/changelog/integrations/pipecat)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
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
    memory,           #← 在 user_aggregator 和 LLM 之间添加
    llm_service,
    assistant_aggregator,
    tts_service,
    transport.output(),
])
```

### 自托管（本地开发） {#self-hosting-local-development}

如果您更愿意自行托管：

```bash
#1.开始Hindsight
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

```python
#2. 将pipecat指向本地服务器
memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

## 工作原理 {#how-it-works}

```
新轮次开始
  └─ 收到 OpenAILLMContextFrame
       ├─ 存储上一完整轮次（用户 + 助手），异步提交后无需等待
       └─ 为当前用户查询召回相关记忆
            └─ 以 <hindsight_memories> 系统消息注入
                 └─ 将增强后的上下文传给 LLM
```

每个`OpenAILLMContextFrame`：

1. **记忆存储** — 任何新的完整用户+助理轮对都会发送至Hindsight异步（非阻塞）
2. **记忆召回** — 使用最新的用户消息作为搜索查询；结果在之前作为系统消息注入LLM看上下文
3. **转发** — 丰富的上下文框架被推送到下游

记忆会在通话中累积。到了第三或第四回合，记忆开始浮现出管道不必重新建立的有用上下文。

## 配置 {#configuration}

```python
HindsightMemoryService(
    bank_id="user-123",              #必填：记忆库使用
    hindsight_api_url="...",         #Hindsight API 网址
    api_key="hsk_...",               #API 密钥（Hindsight Cloud）
    recall_budget="mid",             # "low", "mid", or "high"
    recall_max_tokens=4096,          #记忆结果的最大 token 数数
    enable_recall=True,              #在LLM之前注入记忆
    enable_retain=True,              #每次交换后存储轮换
    memory_prefix="以往对话中的相关记忆:\n",
)
```

### 全局配置 {#global-configuration}

```python
from hindsight_pipecat import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  #Hindsight Cloud（默认）
    api_key="hsk_...",
    recall_budget="mid",
)

#现在创建服务而无需重复连接详细信息
memory = HindsightMemoryService(bank_id="user-123")
```

## 兼容性 {#compatibility}

经过测试Pipecat`v0.0.108`。处理器处理新的 `LLMContextFrame` 和已弃用的 `OpenAILLMContextFrame` 用于向前兼容。

## 手动测试 {#manual-testing}

`examples/` 目录包括用于测试记忆的交互式基于文本的聊天模拟器recall/retain无需Daily/Deepgram/CartesiaAPI 密钥：

```bash
python examples/interactive_chat.py --bank demo-user
```

`examples/basic_pipeline.py` 使用 Daily + Deepgram + 显示完整的语音管道OpenAI+ 笛卡尔。

## 前置条件 {#prerequisites}

正在运行的Hindsight实例：

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # starts on http://localhost:8888
```

**Hindsight Cloud：**[注册](https://ui.hindsight.vectorize.io) — 无需自托管。
