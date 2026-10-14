---
title: "指南：为 Vapi 添加 Hindsight 记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, vapi, voice, memory]
description: "使用 hindsight-vapi Webhook 处理程序为 Vapi 添加 Hindsight 记忆，让语音 AI 在通话开始时召回呼叫者的上下文，并在通话结束时存入文字记录。"
image: /img/guides/guide-vapi-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：为 Vapi 添加 Hindsight 记忆](/img/guides/guide-vapi-memory-with-hindsight.svg)

如果你想为 Vapi 接入 Hindsight 记忆，最简洁的做法是使用 `hindsight-vapi` Webhook 处理程序。它会在通话开始时召回相关记忆，并通过 `assistantOverrides` 注入；通话结束时再存入完整文字记录。这样，Vapi 语音助手就能跨通话保留长期记忆，无需每次都从头开始。

对于 Vapi，这种方式很合适，因为 Vapi 没有逐轮钩子，但会在每次通话前后触发服务器 Webhook。处理程序会利用这两个事件：收到 `assistant-request` Webhook 时召回记忆，并在通话开始前将其合并到助手配置中；收到 `end-of-call-report` Webhook 时，则在通话结束后存入文字记录。记忆按记忆库划分范围，因此你可以决定每位呼叫者的历史记录是单独隔离，还是由多人共享。

本指南将逐步介绍如何安装程序包、将处理程序接入 HTTP 服务器、将它指向 Hindsight 后端、了解记忆库范围选项，并通过快速验证流程确认记忆确实在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-vapi`。
> 2. 创建 `HindsightVapiWebhook`，并设置 `bank_id`、`hindsight_api_url`，以及 `api_key`（Hindsight Cloud）或本地 URL（自托管）。
> 3. 在 HTTP 服务器的 `/webhook` 路由中调用 `memory.handle(event)`。
> 4. 将 Vapi 的 **Server URL** 指向该端点，并启用 `assistant-request` 和 `end-of-call-report` 事件。
> 5. 验证后续通话能否记起先前通话存入的内容。

## 前提条件 {#prerequisites}

开始之前，请确认你具备以下条件：

- 一个 Vapi 帐户，已创建助手，并且可以访问控制面板中的 **Server URL** 设置
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 一个可供 Vapi 访问的 HTTP 服务器（以下示例使用 FastAPI）

## 第 1 步：安装程序包 {#step-1-install-the-package}

在运行 Webhook 服务器的环境中安装 `hindsight-vapi`。

```bash
pip install hindsight-vapi
```

该程序包提供 `HindsightVapiWebhook` 处理程序，可接入任意 HTTP 服务器。它不会自行启动服务器；你需要通过自己控制的路由为它提供服务。

## 第 2 步：将处理程序接入服务器 {#step-2-wire-the-handler-into-your-server}

创建 Webhook 处理程序，并通过 POST 路由提供服务。下面是使用 Hindsight Cloud 的 FastAPI 示例：

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

如果使用自托管的 Hindsight 服务器，请将 `hindsight_api_url` 指向本地实例，并省略 `api_key`：

```python
memory = HindsightVapiWebhook(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

如果要运行许多 Webhook，可以通过 `configure()` 一次性设置连接信息，无需重复填写：

```python
from hindsight_vapi import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="hsk_...",
    recall_budget="mid",
)

# 现在创建 Webhook 时无需重复填写连接信息
memory = HindsightVapiWebhook(bank_id="user-123")
```

## 第 3 步：让 Vapi 调用你的 Webhook {#step-3-point-vapi-at-your-webhook}

在 Vapi 控制面板中：

1. 前往 **Settings → Server URL**。
2. 将其指向你的 Webhook 端点（例如 `https://your-domain.com/webhook`）。
3. 启用 `assistant-request` 和 `end-of-call-report` 事件类型。

详情请参阅 [Vapi 的服务器事件文档](https://docs.vapi.ai/server-url)。设置 Server URL 后，入站通话即可使用记忆功能。

## 处理程序如何使用记忆 {#how-the-handler-uses-memory}

Vapi 没有逐轮钩子，因此记忆只会在每次通话开始时注入一次：

- **通话前召回：**Vapi 触发 `assistant-request` Webhook 时，处理程序会召回记忆（查询内容为呼叫者的电话号码），并将结果作为 `assistantOverrides` 返回，其中包含一条 `<hindsight_memories>` 系统消息。Vapi 会在通话开始前将其合并到助手配置中。
- **通话后存入：**Vapi 触发 `end-of-call-report` Webhook 时，处理程序会存入完整文字记录。存入操作采用即发即忘方式，因此 Webhook 会立即响应。

记忆会在多次通话之间累积。同一位呼叫者第二次或第三次通话时，Hindsight 会自动呈现相关历史记录，例如先前的决定、帐户详情和明确表达的偏好。

有关更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 外拨电话 {#outbound-calls}

外拨电话不会触发 `assistant-request` Webhook，因此无法自动召回记忆。你可以改为在创建通话时使用 `build_assistant_overrides()` 构建覆盖配置：

```python
overrides = await memory.build_assistant_overrides("Ben from Vectorize")
vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

## 记忆库范围 {#bank-scoping}

你可以通过 `bank_id` 选择记忆的范围。常见模式包括：

- **每位用户一个记忆库**：使用电话号码（例如 `user-+15551234567`）或你自己的帐户 ID 作为范围标识
- **共享记忆库**：所有呼叫者共用一个记忆库，适合小型团队或需要共享记忆的场景
- **每个助手一个记忆库**：如果有多个 Vapi 助手，且它们的性格或适用范围不同，可以分别设置记忆库

请选择符合你对呼叫者与助手之间历史记录流转方式预期的模式。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

该程序包附带交互式 Webhook 模拟器，无需真实的 Vapi 帐户也能测试：

```bash
python examples/interactive_webhook.py --bank demo-user
```

模拟器支持 `:script`（引导演示）、`:end <transcript>`、`:call <number>`、`:memories` 和 `:quit` 等命令。

使用真实助手进行端到端测试时，可以按以下步骤操作：

1. 拨打一通电话，让助手记录一个决定或偏好。
2. 结束通话，让系统存入文字记录。
3. 使用同一个号码拨打第二通电话。
4. 询问先前提到的决定。

如果第二通电话中能呈现第一通电话存入的信息，说明配置正常。

## 常见错误 {#common-mistakes}

### 忘记启用两个事件 {#forgetting-to-enable-both-events}

记忆召回在 `assistant-request` 事件中运行，记忆存入在 `end-of-call-report` 事件中运行。如果只启用其中一个，整个流程就会缺少一半。

### 期待通话中途召回记忆 {#expecting-mid-call-recall}

每次通话开始时只注入一次记忆。Vapi 没有逐轮钩子，因此通话期间不会刷新召回结果。

### 期待外拨电话自动召回记忆 {#expecting-automatic-recall-on-outbound-calls}

外拨电话没有 `assistant-request` Webhook。请改为在创建通话时使用 `build_assistant_overrides()`。

### 过早检查存入结果 {#testing-retain-too-early}

文字记录会在 `end-of-call-report` Webhook 中存入。如果在通话结束前检查，记录可能尚未存入。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器同样可用：将 `hindsight_api_url` 设为本地实例（例如 `http://localhost:8888`），并省略 `api_key`。

### 该程序包会自行启动服务器吗？ {#does-the-package-run-its-own-server}

不会。`HindsightVapiWebhook` 是一个处理程序，需要通过你自己的 HTTP 路由提供服务。你需要调用 `memory.handle(event)` 并返回响应。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

范围由你设置的 `bank_id` 决定。你可以为每位用户设置一个记忆库（例如使用电话号码作为范围标识），也可以让所有呼叫者共用一个记忆库，或为每个助手设置一个记忆库。

### 没有真实的 Vapi 帐户时，如何进行测试？ {#how-do-i-test-without-a-real-vapi-account}

使用程序包 `examples/` 目录中的交互式 Webhook 模拟器：`python examples/interactive_webhook.py --bank demo-user`。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 [Hindsight 的 Recall API](/developer/api/recall)。
- 查看 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [Vapi 集成文档](/sdks/integrations/vapi)。
