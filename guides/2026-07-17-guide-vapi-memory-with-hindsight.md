---
title: "指南：用Hindsight添加Vapi记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, vapi, voice, memory]
description: "使用后视 vapi webhook 处理程序将 Vapi 记忆与 Hindsight 添加，因此语音 AI 在通话开始时调用记忆召回呼叫者上下文，并在通话结束时调用记忆存储文字记录。"
image: /img/guides/guide-vapi-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Vapi 添加记忆](/img/guides/guide-vapi-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Vapi 添加记忆**，使用 `hindsight-vapi` Webhook 处理器。通话开始时召回相关记忆并通过 `assistantOverrides` 注入，结束后保存完整记录，让语音助手跨通话拥有长期记忆。

这非常适合Vapi因为Vapi不会公开每回合钩子，但它会在每次调用时触发服务器 Webhooks。处理程序使用这两个事件：它调用 上的记忆 `assistant-request` webhook 并在通话开始前将其合并到助手配置中，然后将记录保留在 通话结束后 `end-of-call-report` webhook。 记忆的范围是每个记忆库的，因此您可以控制调用者的历史记录是按用户隔离还是共享。

本指南逐步介绍安装包、将其连接到HTTP服务器，将其指向您的Hindsight后端，了解记忆库范围选项，以及快速验证流程，以便您可以确认记忆实际上正在使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-vapi`。
> ​​2。创建一个`HindsightVapiWebhook` 带有 `bank_id`, `hindsight_api_url`，和`api_key`（云）或本地 URL（自托管）。
> 3.服务`memory.handle(event)`来自`/webhook` 路线HTTP服务器。
> 4.点Vapi的**服务器 URL（Server URL）** 在该端点并启用 `assistant-request` 和 `end-of-call-report`事件。
> 5.验证后面的调用是否记住前面的调用存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- AVapi带有助手的帐户并可访问仪表板 **服务器 URL（Server URL）**设置
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 您可以将Vapi指向的HTTP服务器（下面的示例使用FastAPI）

## 第 1 步：安装软件包 {#step-1-install-the-package}

安装`hindsight-vapi` 进入运行 webhook 服务器的环境。

```bash
pip install hindsight-vapi
```

包装提供了`HindsightVapiWebhook` 连接到任何HTTP服务器。它不运行自己的服务器——您可以通过您已经控制的路线为其提供服务。

## 第 2 步：将处理程序连接到服务器 {#step-2-wire-the-handler-into-your-server}

创建一个 Webhook 处理程序并通过 POST 路由提供服务。使用 Hindsight Cloud 的 FastAPI 示例：

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

对于自托管Hindsight服务器，点`hindsight_api_url` 在本地实例并省略 `api_key`：

```python
memory = HindsightVapiWebhook(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

如果您运行许多 webhooks，您可以使用 设置一次连接详细信息 `configure()`而不是重复它们：

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

## 第 3 步：将 Vapi 指向您的 Webhook {#step-3-point-vapi-at-your-webhook}

在Vapi仪表板中：

1. 前往**设置 → 服务器 URL（Settings → Server URL）**
2. 将其指向您的 webhook 端点（例如，`https://your-domain.com/webhook`)
3. 启用`assistant-request` 和 `end-of-call-report` 事件类型

参见[Vapi 服务端事件文档](https://docs.vapi.ai/server-url)了解详情。设置服务器 URL 后，记忆功能将对入站呼叫激活。

## 指导员如何使用记忆 {#how-the-handler-uses-memory}

Vapi不暴露每回合钩子，因此注入了记忆 **每次通话一次** 通话开始时：

- **召回（之前）：**当Vapi发射 `assistant-request` webhook，处理程序调用记忆（查询 = 呼叫者的电话号码）并将其返回为 `assistantOverrides` 带有 `<hindsight_memories>`系统消息。Vapi​​ 在呼叫开始之前将其合并到助理配置中。
- **存储（之后）：**当Vapi发射 `end-of-call-report` webhook，处理程序保留完整的记录。 记忆存储是即发即忘的，因此 webhook 会立即响应。

记忆会在通话中累积。当同一呼叫者第二次或第三次通话时，Hindsight会自动显示相关历史记录——之前的决定、帐户详细信息、规定的偏好。

对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 外拨电话 {#outbound-calls}

没有`assistant-request` 用于出站呼叫的 webhook，因此记忆召回无法自动发生。在调用创建时构建覆盖，而不是使用 `build_assistant_overrides()`：

```python
overrides = await memory.build_assistant_overrides("Vectorize 的 Ben")
vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

## 记忆库范围界定 {#bank-scoping}

您可以通过选择记忆的范围 `bank_id`。常见模式：

- **每个用户一个记忆库** — 按电话号码划分的范围 (`user-+15551234567`) 或您自己的帐户 ID
- **共享记忆库** — 适合所有调用者的一个记忆库，对于小团队或共享记忆有用
- **按助手** — 如果您有多个，则单独的记忆库Vapi不同性格或范围的助手

选择与您希望历史记录在呼叫者和助理之间流动的方式相匹配的模式。

## 验证记忆是否有效 {#verify-that-memory-is-working}

该软件包附带了一个交互式 Webhook 模拟器，因此您无需真实的 Vapi 帐户即可进行测试：

```bash
python examples/interactive_webhook.py --bank demo-user
```

支持等命令 `:script`（引导演示），`:end <transcript>`, `:call <number>`, `:memories`，和`:quit`。

带有真正助手的良好端到端测试序列是：

1. 拨打电话并让助理记录决定或偏好
2. 结束通话，保留通话记录
3. 用同一号码拨打第二个电话
4. 询问之前的决定

如果第二次调用显示第一个调用存储的内容，则设置正在运行。

## 常见错误 {#common-mistakes}

### 忘记启用这两个事件 {#forgetting-to-enable-both-events}

记忆召回运行于`assistant-request` 和记忆存储运行于 `end-of-call-report`。如果只启用一个，则一半循环会丢失。

### 期待通话中记忆召回 {#expecting-mid-call-recall}

每次通话开始时都会注入一次记忆。 Vapi没有每回合钩子，因此记忆召回在调用过程中不会刷新。

### 期望外拨电话自动记忆 {#expecting-automatic-recall-on-outbound-calls}

打出电话没有`assistant-request` webhook。使用`build_assistant_overrides()` 在呼叫创建时。

### 测试记忆存储太早了 {#testing-retain-too-early}

成绩单保留在`end-of-call-report` webhook。如果您在通话结束前检查，则可能尚未存储。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 设置 `hindsight_api_url` 到您的本地实例（例如 `http://localhost:8888`) 并省略 `api_key`。

### 该软件包是否运行自己的服务器？ {#does-the-package-run-its-own-server}

没有。 默认情况下 `HindsightVapiWebhook` 是你自己服务的处理程序HTTP路线。你打电话给`memory.handle(event)`并返回响应。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

由`bank_id`由你设定。您可以为每个用户使用一个记忆库（例如按电话号码限定范围）、为所有呼叫者使用一个共享记忆库或为每个助理使用一个记忆库。

### 没有真实的Vapi账户如何测试？ {#how-do-i-test-without-a-real-vapi-account}

使用包中的交互式 webhook 模拟器 `examples/`目录：`python examples/interactive_webhook.py --bank demo-user`。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Vapi 集成文档](/sdks/integrations/vapi)
