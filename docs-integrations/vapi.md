---
sidebar_position: 21
title: "Vapi 持久记忆Hindsight |整合"
description: "通过Hindsight webhooks 将持久的长期记忆添加到Vapi 语音AI 呼叫。在通话开始时自动调用呼叫者上下文，并在通话结束时保留通话记录。"
---

# Vapi {#vapi}

持久的长期记忆[Vapi](https://vapi.ai) 语音AI通过 拨打电话 [Hindsight](https://vectorize.io/hindsight)。单个 Webhook 处理程序在调用开始时调用相关记忆（注入为 `assistantOverrides`）并在通话结束时保留完整的文字记录。

[查看更新日志 →](/changelog/integrations/vapi)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 得到一个API即时密钥，无需运行基础设施。
:::

```bash
pip install hindsight-vapi
```

将其连接到任何 HTTP 服务器。 Hindsight Cloud 的 FastAPI 示例：

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

点Vapi的**服务器 URL（Server URL）** 在您的 webhook 端点并且记忆处于活动状态。

**自托管替代方案：**[在本地安装 Hindsight](/developer/installation)并使用`hindsight_api_url="http://localhost:8888"`（省略`api_key`）。

## 工作原理 {#how-it-works}

不同于Pipecat积分（每回合`FrameProcessor`),Vapi不暴露每回合钩子，因此注入了记忆 通话开始时 **每次通话仅一次**：

```
来电
  └─ Vapi 触发 "assistant-request" webhook
       └─ 召回记忆（query = 来电者电话号码）
            └─ 通过 assistantOverrides 返回，附带 <hindsight_memories> 系统消息
                 └─ Vapi 在通话开始前合并到助手配置中

通话结束
  └─ Vapi 触发 "end-of-call-report" webhook
       └─ 存储完整转录文本（异步提交后无需等待，webhook 立即响应）
```

记忆会在通话中累积。当同一呼叫者第二次或第三次通话时，Hindsight会自动显示相关历史记录——之前的决定、帐户详细信息、规定的偏好。

## Vapi 服务器 URL 设置 {#vapi-server-url-setup}

在Vapi仪表板中：

1. 前往**设置 → 服务器 URL（Settings → Server URL）**
2. 将其指向您的 webhook 端点（例如，`https://your-domain.com/webhook`)
3. 启用`assistant-request` 和 `end-of-call-report` 事件类型

参见[Vapi 服务器事件文档](https://docs.vapi.ai/server-url)了解详情。

## 外拨电话 {#outbound-calls}

没有`assistant-request` 用于出站呼叫的 Webhook。使用`build_assistant_overrides()` 在呼叫创建时：

```python
overrides = await memory.build_assistant_overrides("Vectorize 的 Ben")
vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

## 配置 {#configuration}

```python
HindsightVapiWebhook(
    bank_id="user-123",              #必填：记忆库使用
    hindsight_api_url="...",         #Hindsight API 网址
    api_key="hsk_...",               #API密钥（Hindsight Cloud）
    recall_budget="mid",             # "low", "mid", or "high"
    recall_max_tokens=4096,          #记忆结果的最大 token 数数
    enable_recall=True,              #在通话开始时注入记忆
    enable_retain=True,              #在通话结束时存储文字记录
    memory_prefix="以往对话中的相关记忆:\n",
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

#现在创建 Webhook，无需重复连接详细信息
memory = HindsightVapiWebhook(bank_id="user-123")
```

## 限定记忆库作用域 {#bank-scoping}

的典型模式 `bank_id`：

- **每位用户一个记忆库** — 按电话号码划分的范围 (`user-+15551234567`) 或您自己的帐户 ID
- **共享记忆库** — 为所有调用者提供一个记忆库（对于小团队或共享记忆有用）
- **每位助手一个记忆库** — 如果您有多个Vapi不同性格或范围的助手

## 前置条件 {#prerequisites}

正在运行的Hindsight实例：

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # starts on http://localhost:8888
```

**Hindsight Cloud：**[注册](https://ui.hindsight.vectorize.io) — 无需自托管。
