---
title: "指南：使用 Hindsight 为 OpenAI Agents SDK 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, openai-agents, agents, memory]
description: "使用 hindsight-openai-agents 包为 OpenAI Agents SDK 添加记忆，让智能体可以通过原生 FunctionTool 实例存入、召回和反思长期记忆。"
image: /img/guides/guide-openai-agents-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OpenAI Agents SDK 添加记忆](/img/guides/guide-openai-agents-memory-with-hindsight.svg)

如果想为 **OpenAI Agents SDK 添加 Hindsight 记忆**，最简单的方式是使用 `hindsight-openai-agents` 包。它提供 Retain（存入）、Recall（召回）和 Reflect（反思）对应的 `FunctionTool` 实例，可直接接入 `Agent(tools=[...])`。这样，智能体就能在不同对话之间保留长期记忆，而不必每次运行都从空白状态开始。

OpenAI Agents SDK 很适合这种集成，因为它原生支持异步运行，并以工具驱动。该包直接使用异步 Hindsight 客户端（`aretain`、`arecall`、`areflect`），因此可以在 Agents SDK 运行时中无缝运行。你可以让智能体自行调用记忆工具，也可以通过 `memory_instructions()` 在每轮对话中自动将相关记忆注入系统提示。

本指南将介绍如何安装该包、将它指向 Hindsight 后端、把工具接入智能体，并通过一个快速验证流程确认记忆确实在发挥作用。操作时可随时查阅[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-openai-agents openai-agents`。
> 2. 创建一个指向后端的 `Hindsight` 客户端，并创建一个记忆库。
> 3. 使用 `create_hindsight_tools(client=client, bank_id="...")` 构建工具。
> 4. 将工具传给 `Agent(tools=tools)`，智能体便可使用 Retain、Recall 和 Reflect。
> 5. 验证后续运行能否召回先前运行存入的内容。

## 先决条件 {#prerequisites}

开始之前，请确保已准备好：

- Python 3.10 或更高版本
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 已安装 OpenAI Agents SDK（`openai-agents`）

## 第 1 步：安装软件包 {#step-1-install-the-package}

将集成包与 Agents SDK 一起安装。

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents` 会一并安装 `openai-agents` 和 `hindsight-client`，因此只需安装一次，就能获得记忆工具和 Hindsight 客户端。

## 第 2 步：创建客户端和记忆库 {#step-2-create-a-client-and-a-bank}

将 `Hindsight` 客户端指向后端，然后创建智能体将要使用的记忆库。`acreate_bank` 具有幂等性，因此每次启动时调用都是安全的。

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
await client.acreate_bank(bank_id="user-123")
```

使用 Hindsight Cloud 时，可通过 `HINDSIGHT_API_KEY` 环境变量配置 API 密钥，也可以通过 `configure()` 显式传入（参见第 4 步）。

## 第 3 步：构建工具并将其连接到智能体 {#step-3-build-the-tools-and-attach-them-to-an-agent}

使用 `create_hindsight_tools()` 创建记忆工具，并将它们传给 `Agent`：

```python
import asyncio
from agents import Agent, Runner
from hindsight_client import Hindsight
from hindsight_openai_agents import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")

    agent = Agent(
        name="assistant",
        instructions=(
            "You are a helpful assistant with long-term memory. "
            "Use hindsight_retain to store important facts. "
            "Use hindsight_recall to search memory before answering."
        ),
        tools=tools,
    )

    result = await Runner.run(agent, "Remember that I prefer dark mode")
    print(result.final_output)

    # Hindsight 异步处理存入的内容（事实提取、
    # 实体消解和嵌入向量生成）。短暂等待可确保在下次召回前，
    # 记忆已可供检索。在生产环境中，仅当存入和召回在同一脚本中
    # 紧接着发生时才需要这段延迟。
    await asyncio.sleep(3)

    result = await Runner.run(agent, "What are my UI preferences?")
    print(result.final_output)

    await client.aclose()

asyncio.run(main())
```

智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 在长期记忆中检索相关事实
- **`hindsight_reflect`** — 基于记忆综合生成有理有据的答案

## 工具如何使用记忆 {#how-the-tools-use-memory}

这些工具直接对应 Hindsight 的核心操作；OpenAI Agents SDK 会根据你的指令决定何时调用它们：

- **Retain（存入）：**智能体调用 `hindsight_retain` 时，内容会存入记忆库。Hindsight 会异步提取事实、消解实体并生成嵌入向量。
- **Recall（召回）：**智能体调用 `hindsight_recall` 时，它会在回答前检索记忆库中的相关事实。
- **Reflect（反思）：**智能体调用 `hindsight_reflect` 时，Hindsight 会基于已存储的记忆综合生成有理有据的答案。

如果不想依赖智能体显式调用 Recall，可以使用 `memory_instructions()` 在每轮对话中自动将相关记忆注入系统提示。它会返回一个与 `Agent(instructions=...)` 兼容的异步可调用对象；每轮调用时，该对象都会召回相关记忆并将其追加到基础指令中。如果 Recall 失败或没有返回任何内容，则只使用 `base_instructions`：

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="You are a helpful assistant with long-term memory.",
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  # Recall 由 memory_instructions 处理
    ),
)
```

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 选择工具并限定记忆范围 {#selecting-tools-and-scoping-memory}

你可以通过 `include_retain`、`include_recall` 和 `include_reflect` 标志，只包含所需的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不包含 Reflect
)
```

使用标签按主题、会话或用户划分记忆范围：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

你也可以先调用一次 `configure()`，之后在任何地方创建工具时都无需传入客户端。完整的参数说明请参阅 [OpenAI Agents SDK 集成文档](/sdks/integrations/openai-agents)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 构建工具并将其连接到智能体。
2. 让智能体处理一条值得记住的事实。
3. 等待几秒，让存入的内容变得可检索。
4. 再次运行智能体，并询问与该事实有关的问题。
5. 确认答案反映了先前存入的内容。

例如：

- 第一次运行："Remember that I prefer dark mode"
- 第二次运行："What are my UI preferences?"

如果第二次运行能根据先前存入的偏好作答，说明配置正常。

## 常见错误 {#common-mistakes}

### 忘记创建记忆库 {#forgetting-to-create-the-bank}

首次使用前，先通过 `acreate_bank` 创建记忆库。该操作具有幂等性，因此每次启动时调用都是安全的。

### 过早测试 Recall {#testing-recall-too-early}

存入的内容会经过异步处理。如果在同一脚本中紧接着存入和召回，请短暂等待，让记忆变得可检索后再进行召回。

### 没有指示智能体就期待它召回记忆 {#expecting-recall-without-instructing-the-agent}

如果使用这些工具，智能体只会在自己决定时才进行召回。请指示它在回答前先召回记忆，或使用 `memory_instructions()` 在每轮对话中自动注入记忆。

### 在一个记忆库中混放无关记忆 {#mixing-unrelated-memory-in-one-bank}

每个记忆库都是彼此隔离的存储空间。为每个智能体或用户分配自己的 `bank_id`，或者使用标签在共享记忆库中划分记忆范围。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。也可以使用自托管的 Hindsight 服务器，只需将 `Hindsight` 客户端指向服务器的 `base_url`。

### 每次调用都必须传入客户端吗？ {#do-i-have-to-pass-a-client-to-every-call}

不需要。调用一次 `configure()`，传入 API URL 和密钥，然后创建工具时无需传入客户端；这些工具会使用全局配置。

### 这能与异步 Agents SDK 运行时配合使用吗？ {#does-this-work-with-the-async-agents-sdk-runtime}

可以。这些工具直接使用异步 Hindsight 客户端（`aretain`、`arecall`、`areflect`），因此可以在 Agents SDK 异步运行时中无缝运行。

### 多个智能体如何划分记忆范围？ {#how-is-memory-scoped-across-multiple-agents}

为每个智能体分配自己的 `bank_id`，即可使用私有记忆；也可以让多个智能体共用一个 `bank_id`，共享记忆。还可以通过标签在一个记忆库中进一步划分记忆范围。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [OpenAI Agents SDK 集成文档](/sdks/integrations/openai-agents)。
