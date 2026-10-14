---
title: "指南：使用 Hindsight 为 Haystack 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, haystack, agents, memory]
description: "使用 hindsight-haystack 为 Haystack 智能体添加 Hindsight 记忆，使其能够跨轮次召回相关记忆并存入新事实。"
image: /img/guides/guide-haystack-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Haystack 添加记忆](/img/guides/guide-haystack-memory-with-hindsight.svg)

如果要为 Haystack 添加 **Hindsight 记忆**，最直接的方式是使用 `hindsight-haystack` 包。它为任意 Haystack `Agent` 提供由 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）API 支持的持久长期记忆。这样，智能体就能跨轮次和会话记住事实，而不必每次都从头开始。

这个包提供两种互补的用法。`create_hindsight_tools(...)` 会返回一组 Haystack `Tool`：`retain_memory`、`recall_memory` 和 `reflect_on_memory`，模型可在一轮对话中直接调用它们。`HindsightMemoryWrapper` 是一个 Haystack `Toolset`，它包含相同的工具，并额外提供可选的自动召回（在每轮对话开始前将相关记忆注入系统提示）和自动存入（在每轮对话结束后保存用户和助手消息）。

本指南将介绍如何安装这个包、将其连接到 Hindsight 后端、把工具接入 `Agent`，以及如何快速验证记忆确实在发挥作用。操作时可以同时查看[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-haystack`。
> 2. 创建一个指向后端的 `Hindsight` 客户端（使用 `base_url`；连接 Cloud 时，API 密钥会回退到 `HINDSIGHT_API_KEY` 环境变量）。
> 3. 使用 `create_hindsight_tools(client=client, bank_id="user-123")` 创建工具。
> 4. 将工具传给 Haystack `Agent`，或使用 `HindsightMemoryWrapper` 自动执行召回和存入。
> 5. 验证后续轮次能否召回先前存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- Python 3.10 或更高版本
- 使用 `haystack-ai >= 2.12.0` 的 Haystack 项目
- `hindsight-client >= 0.4.0`（作为 `hindsight-haystack` 的依赖安装）
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器

## 步骤 1：安装包 {#step-1-install-the-package}

安装集成包：

```bash
pip install hindsight-haystack
```

安装时也会一并安装 Hindsight 客户端，以便你为 Haystack `Agent` 创建记忆工具。

## 步骤 2：连接到 Hindsight {#step-2-point-it-at-hindsight}

为后端创建一个 `Hindsight` 客户端。连接自托管服务器时，传入 `base_url`：

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

使用 Hindsight Cloud 时，API URL 默认为 `https://api.hindsight.vectorize.io`，API 密钥的后备值取自 `HINDSIGHT_API_KEY` 环境变量。你也可以通过 `configure()` 一次性设置连接默认值，这样每次调用时就可以省略 `client=` 和 `hindsight_api_url=`：

```python
from hindsight_haystack import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    tags=["source:haystack"],
    context="my-app",
    mission="Track user preferences",
)
```

调用 `configure()` 后，创建工具时只需提供 `bank_id`。

## 步骤 3：为 Agent 添加记忆工具 {#step-3-add-memory-tools-to-your-agent}

创建 Hindsight 工具并传给 Haystack `Agent`：

```python
from hindsight_haystack import create_hindsight_tools
from haystack.components.agents import Agent
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=tools,
    system_prompt=(
        "You are a helpful assistant with long-term memory. "
        "Use retain_memory to store important facts. "
        "Use recall_memory to search memory before answering."
    ),
)

result = agent.run(messages=[ChatMessage.from_user("Remember that I prefer dark mode")])
print(result["messages"][-1].text)
```

如果只需要存入和召回功能，可以移除 Reflect 工具：

```python
# 仅启用 retain 和 recall（不启用 reflect）
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

## 记忆的工作方式 {#how-memory-works}

使用 `create_hindsight_tools(...)` 时，由模型决定何时调用记忆工具。它可以调用 `retain_memory` 存入重要事实、调用 `recall_memory` 在回答前检索记忆，也可以调用 `reflect_on_memory` 基于已存储的内容进行推理。`bank_id` 用于限定这些记忆的范围，因此可以为每个用户或智能体使用独立的记忆库，避免数据混在一起。

如果你不希望依赖模型来调用工具，可以使用 `HindsightMemoryWrapper`。这个 `Toolset` 包含相同的工具，并额外提供自动行为：

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
    auto_recall=True,   # 在每轮对话前将记忆注入系统提示
    auto_retain=True,   # 在每轮对话后保存用户和助手消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="You are a helpful assistant with long-term memory.",
)

# 使用 toolset.run() 启用自动记忆行为
result = toolset.run(agent, messages=[ChatMessage.from_user("I prefer dark mode")])
```

设置 `auto_recall=True` 后，系统会在每轮对话开始前将相关记忆注入系统提示。设置 `auto_retain=True` 后，系统会在每轮对话结束后保存用户和助手消息。要启用这些自动行为，请调用 `toolset.run(agent, ...)`，而不是 `agent.run(...)`。

如需了解更底层的行为，请阅读 [Hindsight Recall API](/developer/api/recall)和 [Hindsight Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序进行测试：

1. 运行智能体，告诉它一件要记住的事（例如，“Remember that I prefer dark mode”）。
2. 让智能体存入这条事实，可通过调用 `retain_memory` 工具或启用 `auto_retain` 完成。
3. 开始新一轮对话（或重新运行智能体），询问先前提到的事实。
4. 确认智能体能否召回这条事实。

例如：

- 第一轮存入用户偏好深色模式这一事实。
- 第二轮询问用户的界面偏好。

如果智能体能说出先前的偏好，说明配置已生效。

## 常见错误 {#common-mistakes}

### 以为 `agent.run()` 会自动执行记忆操作 {#expecting-auto-behavior-from-agentrun}

自动召回和自动存入是通过 `HindsightMemoryWrapper.run()` 执行的。如果你直接对 Agent 调用 `agent.run(...)`，虽然能使用这些工具，但不会自动召回或存入；要启用自动行为，请使用 `toolset.run(agent, ...)`。

### 所有用户共用一个记忆库 {#reusing-one-bank-for-every-user}

记忆由 `bank_id` 限定范围。如果所有用户共用一个记忆库，他们的记忆就会混在一起。请为每个用户或智能体使用不同的 `bank_id`。

### 以为模型总会调用工具 {#assuming-the-model-always-calls-the-tools}

单独使用 `create_hindsight_tools(...)` 时，是否使用记忆由模型决定。如果系统提示没有要求模型存入和检索记忆，模型可能会跳过工具调用。请在提示中明确引导模型，或者改用 `HindsightMemoryWrapper` 自动执行这些操作。

### 忘记指定正确的后端 {#forgetting-to-point-at-the-right-backend}

API URL 默认为 Hindsight Cloud（`https://api.hindsight.vectorize.io`）。连接自托管服务器时，请在客户端传入 `base_url`，或在 `configure()` 中设置 `hindsight_api_url`；否则请求会发送到 Cloud。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以使用自托管的 Hindsight 服务器，只需在 `Hindsight` 客户端中传入服务器的 `base_url`（或在 `configure()` 中设置 `hindsight_api_url`）。

### 工具和包装器有什么区别？ {#what-is-the-difference-between-the-tools-and-the-wrapper}

`create_hindsight_tools(...)` 会提供一组由模型自行调用的记忆工具。`HindsightMemoryWrapper` 包含相同的工具，并额外提供可选的自动召回和自动存入，因此无需模型主动调用工具也能处理记忆。

### 记忆如何限定范围？ {#how-is-memory-scoped}

记忆范围由 `bank_id` 决定。每个记忆库都是相互隔离的存储空间，因此应为每个用户或智能体使用不同的记忆库。

### 可以只使用存入和召回吗？ {#can-i-use-only-retain-and-recall}

可以。在 `create_hindsight_tools(...)` 中传入 `include_reflect=False`，即可只启用 `retain_memory` 和 `recall_memory`。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)开始使用。
- 查看 [Hindsight Recall API](/developer/api/recall)。
- 查看 [Hindsight Retain API](/developer/api/retain)。
- 阅读 [Haystack 集成文档](/sdks/integrations/haystack)。
