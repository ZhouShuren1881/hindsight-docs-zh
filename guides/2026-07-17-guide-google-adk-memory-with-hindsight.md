---
title: "指南：使用 Hindsight 为 Google ADK 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, google-adk, agents, memory]
description: "使用 hindsight-google-adk 包为 Google ADK 添加记忆。它通过 ADK 自带的记忆服务自动存入会话内容，并在智能体检索时召回相关记忆。"
image: /img/guides/guide-google-adk-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Google ADK 添加记忆](/img/guides/guide-google-adk-memory-with-hindsight.svg)

如果要为 **Google ADK 接入 Hindsight 记忆**，最直接的方式是使用 `hindsight-google-adk` 包。它实现了 ADK 的 `BaseMemoryService`，因此只需将它传给 `Runner(memory_service=...)`，会话结束时就会自动存入会话内容；调用 `search_memory` 的智能体则会从 Hindsight 获取匹配结果。这样一来，ADK 智能体就能跨会话使用长期记忆，不必每次都从头开始。

这种集成方式适合 ADK，因为 ADK 已经内置了记忆服务接口。集成会直接把 Hindsight 接入该接口，无需从外部另行拼接记忆功能。默认情况下，记忆按 `(app_name, user_id)` 隔离，因此每个应用和用户都有自己的记忆库。

如果希望智能体在一轮对话中自行决定何时存入或召回记忆，而不是依赖会话结束时自动存入，包中还提供了显式的 `FunctionTool` 封装。本指南会介绍这两种模式，并说明如何快速验证。操作时可以同时参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-google-adk`。
> 2. 使用 `HindsightMemoryService.from_url(hindsight_api_url=..., api_key="hsk_...")` 创建服务。
> 3. 将服务传给 `Runner(memory_service=memory)`，会话结束时便会自动存入内容。
> 4. 调用 `search_memory` 的智能体会从同一个记忆库召回内容，记忆库由 `(app_name, user_id)` 确定。
> 5. 验证后续会话能否召回早先存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- Python 3.10+
- 已安装 `google-adk>=2.0`，并有一个可用的 ADK 智能体
- 可以访问 Hindsight 后端，可以使用 [Hindsight Cloud](https://hindsight.vectorize.io)，也可以使用自托管服务器

## 步骤 1：安装软件包 {#step-1-install-the-package}

```bash
pip install hindsight-google-adk
```

该包会安装 `hindsight-client>=0.4.0`，集成通过它与 Hindsight 后端通信。

## 步骤 2：接入记忆服务 {#step-2-wire-up-the-memory-service}

该集成实现了 ADK 的 `BaseMemoryService`。通过 `from_url` 创建服务，然后传给 `Runner`：

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from hindsight_google_adk import HindsightMemoryService

memory = HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = LlmAgent(name="assistant", model="gemini-2.0-flash")

runner = Runner(
    app_name="my-app",
    agent=agent,
    session_service=InMemorySessionService(),
    memory_service=memory,
)

# ...像往常一样使用 runner.run_async(...)。记忆会自动处理。
```

如果使用自托管的 Hindsight 服务器，请填入自己的 URL，并省略 API 密钥：

```python
HindsightMemoryService.from_url(hindsight_api_url="http://localhost:8888")
```

对于未启用身份验证的本地服务器，无需提供 `api_key`。

## 记忆服务如何使用记忆 {#how-the-memory-service-uses-memory}

该集成接入了 ADK 记忆服务接口提供的两个调用点：

- **存入（会话结束时）：** 会话结束时，`Runner` 会调用 `add_session_to_memory`，将会话中的所有事件存入由 `(app_name, user_id)` 确定的 Hindsight 记忆库。
- **召回（搜索时）：** 智能体或其他调用方调用 `search_memory(app_name, user_id, query)` 时，集成会在同一个记忆库中执行 Hindsight 召回，并将结果作为 ADK 的 `MemoryEntry` 对象返回。

这套机制能应对故障：`add_*` 方法和 `search_memory` 方法中的 Hindsight 错误只会写入日志，不会向上传递给 `Runner`，因此记忆功能出现问题不会导致智能体崩溃。

如需了解底层行为，请阅读[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 按用户划分记忆库 {#per-user-memory-banks}

默认情况下，每组 `(app_name, user_id)` 都有独立的记忆库，ID 模板为 `"{app_name}::{user_id}"`。这可以隔离不同用户的记忆。你可以通过 `bank_id_template` 覆盖该规则：

```python
# 每个用户一个记忆库，在不同应用间共享
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)

# 静态记忆库，供所有用户共享
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

每个存入的事件还会带有 `app:<app_name>` 和 `user:<user_id>` 标签；召回查询也会自动包含 `user:<user_id>`，因此用户不会看到彼此的记忆。

## 可选：显式的存入、召回和反思工具 {#optional-explicit-retain--recall--reflect-tools}

如果希望模型在一轮对话中自行决定何时存入或召回记忆，可以添加这些显式工具，替代记忆服务或与它并用：

```python
from google.adk.agents import LlmAgent
from hindsight_google_adk import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = LlmAgent(name="assistant", model="gemini-2.0-flash", tools=tools)
```

智能体会获得三个工具（可通过 `include_retain`、`include_recall` 和 `include_reflect` 控制是否启用）：

- **`hindsight_retain(content)`** — 将信息存入长期记忆
- **`hindsight_recall(query)`** — 搜索记忆并返回匹配结果
- **`hindsight_reflect(query)`** — 综合记忆，生成连贯的回答

两种模式可以同时使用：记忆服务在会话结束时自动存入内容，工具则让智能体在一轮对话中主动召回。只要记忆库 ID 一致，它们就会共用同一个记忆库。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 在接入了 `HindsightMemoryService` 的 `Runner` 中运行一轮智能体对话。
2. 让智能体记录一项决定、事实或偏好。
3. 结束会话，使其中的事件存入记忆库。
4. 使用相同的 `app_name` 和 `user_id` 开始新会话。
5. 询问先前记录的细节，促使智能体调用 `search_memory`。

如果召回结果中出现了先前记录的细节，说明设置已经生效。

## 常见错误 {#common-mistakes}

### 在不同会话间更改 `app_name` 或 `user_id` {#changing-app_name-or-user_id-between-sessions}

默认情况下，记忆库由 `(app_name, user_id)` 确定。如果其中任一值发生变化，新会话就会访问另一个记忆库，因而看不到早先的记忆。

### 过早测试存入功能 {#testing-retain-too-early}

会话事件要等会话结束后才会存入。如果会话尚未完成就进行检查，内容可能还没有存入。

### 误以为记忆是全局共享的 {#assuming-memory-is-global}

默认情况下，每组 `(app_name, user_id)` 都有独立的记忆库。这通常符合预期；如果没有设置共享的 `bank_id_template`，就不要指望一个用户能召回另一个用户的上下文。

### 给本地服务器传入 API 密钥 {#passing-an-api-key-to-a-local-server}

Hindsight Cloud 需要 `api_key`。未启用身份验证的自托管服务器不需要密钥，只需将 `hindsight_api_url` 设为本地 URL。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：将它的 URL 传给 `hindsight_api_url`，并省略 `api_key`。

### 必须使用显式工具吗？ {#do-i-have-to-use-the-explicit-tools}

不必。`HindsightMemoryService` 会自动处理会话结束时的存入，以及调用 `search_memory` 时的召回。`FunctionTool` 封装是可选的，适用于希望智能体在一轮对话中自行控制记忆操作的情况。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

默认按 `(app_name, user_id)` 划分，并使用模板 `"{app_name}::{user_id}"`。可以通过 `bank_id_template` 覆盖。

### 可以一次性设置应用级默认值吗？ {#can-i-set-app-wide-defaults-once}

可以。在应用启动时调用 `configure(...)`，之后调用 `HindsightMemoryService.from_url()` 或 `create_hindsight_tools()` 时，都会将其配置作为回退值。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看[召回 API](/developer/api/recall)。
- 查看[存入 API](/developer/api/retain)。
- 阅读 [Google ADK 集成文档](/sdks/integrations/google-adk)。
