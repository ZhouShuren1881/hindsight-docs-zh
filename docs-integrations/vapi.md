---
sidebar_position: 21
title: "借助 Hindsight 为 Vapi 添加持久记忆 | 集成"
description: "通过 Hindsight Webhook 为 Vapi 语音 AI 通话添加持久的长期记忆。在通话开始时自动召回呼叫者的上下文，并在通话结束时存入完整转录文本。"
---

# Vapi {#vapi}

借助 [Hindsight](https://vectorize.io/hindsight)，为 [Vapi](https://vapi.ai) 语音 AI 通话提供持久的长期记忆。一个 Webhook 处理程序会在通话开始时召回相关记忆（通过 `assistantOverrides` 注入），并在通话结束时存入完整转录文本。

[查看更新日志 →](/changelog/integrations/vapi)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 立即获取 API key，无需运行任何基础设施。
:::

```bash
pip install hindsight-vapi
```

将它接入任意 HTTP 服务器。以下是使用 Hindsight Cloud 的 FastAPI 示例：

```python
from fastapi import FastAPI, Request
from hindsight_vapi import HindsightVapiWebhook

app = FastAPI()
memory = HindsightVapiWebhook(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_your_token_here",
)

@app.post("/webhook")
async def vapi_webhook(request: Request):
    event = await request.json()
    response = await memory.handle(event)
    return response or {}
```

将 Vapi 的 **Server URL** 指向你的 Webhook 端点，即可启用记忆功能。

**自托管方式：**[在本地安装 Hindsight](/developer/installation)，并设置 `hindsight_api_url="http://localhost:8888"`（省略 `api_key`）。

## 工作原理 {#how-it-works}

与 Pipecat 集成（按轮次使用 `FrameProcessor`）不同，Vapi 不提供按轮次触发的钩子，因此记忆只会在每次通话开始时注入一次：

```
来电
  └─ Vapi 触发 "assistant-request" webhook
       └─ 召回记忆（query = 呼叫者的电话号码）
            └─ 将结果作为 assistantOverrides 返回，并附带 <hindsight_memories> 系统消息
                 └─ Vapi 在通话开始前将其合并到助手配置中

通话结束
  └─ Vapi 触发 "end-of-call-report" webhook
       └─ 存入完整转录文本（异步提交后不等待结果 — webhook 立即响应）
```

记忆会在多次通话之间不断累积。同一呼叫者第二次或第三次来电时，Hindsight 会自动呈现相关历史信息，例如先前的决定、账户详情和明确表达的偏好。

## 设置 Vapi Server URL {#vapi-server-url-setup}

在 Vapi 控制台中：

1. 前往 **Settings → Server URL**。
2. 将它指向你的 Webhook 端点（例如 `https://your-domain.com/webhook`）。
3. 启用 `assistant-request` 和 `end-of-call-report` 事件类型。

详情请参阅 [Vapi 的服务器事件文档](https://docs.vapi.ai/server-url)。

## 外拨电话 {#outbound-calls}

外拨电话不会触发 `assistant-request` webhook。请在创建通话时使用 `build_assistant_overrides()`：

```python
overrides = await memory.build_assistant_overrides("Ben from Vectorize")
vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

## 配置 {#configuration}

```python
HindsightVapiWebhook(
    bank_id="user-123",              # 必填：要使用的记忆库
    hindsight_api_url="...",         # Hindsight API URL
    api_key="hsk_...",               # API key（Hindsight Cloud）
    recall_budget="mid",             # "low", "mid", or "high"
    recall_max_tokens=4096,          # 召回结果的最大 token 数
    enable_recall=True,              # 在通话开始时注入记忆
    enable_retain=True,              # 在通话结束时存储转录文本
    memory_prefix="Relevant memories from past conversations:\n",
)
```

### 全局配置 {#global-configuration}

```python
from hindsight_vapi import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="hsk_...",
    recall_budget="mid",
)

# 此后创建 Webhook 时无需重复填写连接信息
memory = HindsightVapiWebhook(bank_id="user-123")
```

## 记忆库范围 {#bank-scoping}

`bank_id` 的常见设置方式：

- **每位用户使用一个记忆库** — 按电话号码（`user-+15551234567`）或你自己的账户 ID 划分范围。
- **共享记忆库** — 所有呼叫者共用一个记忆库（适合小型团队或共享记忆的场景）。
- **每个助手使用一个记忆库** — 适用于拥有多个 Vapi 助手，且各自性格或范围不同的情况。

## 前置条件 {#prerequisites}

需要有一个正在运行的 Hindsight 实例：

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # 启动服务，监听 http://localhost:8888
```

**Hindsight Cloud：**[注册](https://ui.hindsight.vectorize.io) — 无需自托管。
