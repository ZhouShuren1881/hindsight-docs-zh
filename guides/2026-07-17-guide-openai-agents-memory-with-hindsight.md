---
title: "指南：添加OpenAI智能体SDK记忆与Hindsight"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, openai-agents, agents, memory]
description: "使用后视-openai-智能体包添加OpenAI智能体SDK记忆与Hindsight，这样您的智能体就可以将记忆存储、记忆召回和长期记忆作为本机FunctionTool实例。"
image: /img/guides/guide-openai-agents-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OpenAI Agents SDK 添加记忆](/img/guides/guide-openai-agents-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 OpenAI Agents SDK 添加记忆**，使用 `hindsight-openai-agents` 包。它提供存储、召回和反思的 `FunctionTool` 实例，直接接入 `Agent(tools=[...])`，让智能体跨对话拥有长期记忆，而非每次运行从空白开始。

这非常适合OpenAI智能体SDK因为SDK是异步原生且工具驱动的。该包使用了异步Hindsight直接客户端 (`aretain`，`arecall`，`areflect`)，因此它可以在智能体内无缝运行SDK运行时。你可以让智能体自己调用记忆工具，或者每次使用自动将相关记忆注入到系统提示中 `memory_instructions()`。

本指南将逐步安装该软件包，并将其指向您的Hindsight后端，将工具连接到智能体中，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-openai-agents openai-agents`。
> 2.创建一个`Hindsight`客户端指向你的后端并创建一个记忆库。
> 3.使用 构建工具 `create_hindsight_tools(client=client, bank_id="...")`。
> 4.将它们传递给`Agent(tools=tools)`——智能体获得记忆存储、记忆召回和反思。
> 5.验证稍后的运行是否能回忆起先前运行的存储内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Python 3.10 或更高版本
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- TheOpenAI智能体SDK已安装（`openai-agents`)

## 第 1 步：安装软件包 {#step-1-install-the-package}

与智能体SDK本身一起安装集成。

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents`拉入`openai-agents` 和 `hindsight-client`，这样你就可以获得记忆工具和Hindsight一次安装客户端。

## 第2步：创建客户端和记忆库 {#step-2-create-a-client-and-a-bank}

点a`Hindsight` 后端客户端，然后创建智能体将使用的记忆库。 `acreate_bank` 是幂等的，因此每次启动时调用都是安全的。

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
await client.acreate_bank(bank_id="user-123")
```

对于Hindsight Cloud，配置你的API键与 `HINDSIGHT_API_KEY`环境变量，或者通过显式传递 `configure()`（参见步骤 4）。

## 第 3 步：构建工具并将其附加到智能体上 {#step-3-build-the-tools-and-attach-them-to-an-agent}

使用创建记忆工具 `create_hindsight_tools()`并将它们传递给您的`Agent`：

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
            "你是一个有长期记忆的得力助手。"
            "使用hindsight_retain存储重要事实。"
            "回答前使用hindsight_recall搜索记忆。"
        ),
        tools=tools,
    )

    result = await Runner.run(agent, "记住我更喜欢深色模式")
    print(result.final_output)

    #Hindsight 异步处理保留内容（事实提取、
    #实体解析、嵌入）。短暂的停顿确保回忆
    #在下一个记忆召回之前可搜索。在生产中，这种延迟只是
当记忆存储和记忆召回在同一个脚本中连续发生时需要
    #。
    await asyncio.sleep(3)

    result = await Runner.run(agent, "我的 UI 偏好是什么？")
    print(result.final_output)

    await client.aclose()

asyncio.run(main())
```

智能体拥有三个可以调用的工具：

- **`hindsight_retain`** — 将信息存储到长期记忆中
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 从记忆中综合出一个合理的答案

## 工具如何使用记忆 {#how-the-tools-use-memory}

这些工具直接映射到Hindsight的核心操作，OpenAI智能体SDK根据您的指令决定何时调用它们：

- **存储：**当智能体调用时 `hindsight_retain`，内容存储到记忆库中。Hindsight提取事实、解析实体并异步生成嵌入。
- **召回：**当智能体调用时 `hindsight_recall`，它在回答之前在记忆库中搜索相关事实。
- **反思：**当智能体调用时 `hindsight_reflect`,Hindsight从存储的记忆中综合出一个合理的答案。

如果您不想依赖智能体显式调用记忆召回，请使用`memory_instructions()` 每回合自动将相关记忆注入系统提示中。它返回一个与 兼容的异步可调用对象 `Agent(instructions=...)`；每回合它都会调用相关记忆并将其附加到您的基本指令中，然后回退到 如果记忆失败或不返回任何内容，则单独 `base_instructions`：

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="你是一个有长期记忆力的得力助手。",
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  #memory_instructions 处理的记忆召回
    ),
)
```

对于较低级别的行为，请阅读[Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 选择工具和范围界定记忆 {#selecting-tools-and-scoping-memory}

您可以仅在中包含您需要的工具 `include_retain`，`include_recall`，和`include_reflect` 标志：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  #省略反思
)
```

使用标签按主题、会话或用户对记忆进行分区：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

您也可以使用配置一次 `configure()` 然后在任何地方创建工具而无需通过客户端 - 请参阅 [OpenAI Agents SDK 集成文档](/sdks/integrations/openai-agents) 获取完整参数参考。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 构建工具并将其附加到智能体上
2. 用一个值得记住的事实来运行智能体
3. 等待几秒钟，以便保留的内容变得可搜索
4. 带着关于这一事实的问题再次运行智能体
5. 确认答案反映了您存储的内容

例如：

- 运行一个：“记住我更喜欢深色模式”
- 运行两个：“我的 UI 偏好是什么？”

如果第二次运行的答案与之前的偏好一致，则设置正常。

## 常见错误 {#common-mistakes}

### 忘记创建记忆库 {#forgetting-to-create-the-bank}

用创建记忆库 `acreate_bank` 首次使用前。它是幂等的，因此每次启动时调用它都是安全的。

### 太早测试记忆能力 {#testing-recall-too-early}

保留的内容是异步处理的。如果记忆存储和记忆召回在同一个脚本中连续发生，请添加一个短暂的停顿，以便在记忆召回之前可以搜索记忆。

### 在不指示智能体的情况下期待记忆召回 {#expecting-recall-without-instructing-the-agent}

如果你依赖工具，智能体只会在它决定的时候回忆。在回答之前告诉记忆召回，或者使用 `memory_instructions()` 每回合自动注入记忆。

### 将不相关的记忆混合在一个记忆库中 {#mixing-unrelated-memory-in-one-bank}

每个记忆库都是一个独立的记忆库。为每个智能体或用户提​​供自己的 `bank_id`，或使用标签对共享记忆库中的记忆进行分区。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 指向 `Hindsight` 服务器上的客户端 `base_url`。

### 每次通话我都必须传递一个客户端吗？ {#do-i-have-to-pass-a-client-to-every-call}

没有。致电`configure()` 和你的一次APIURL 和密钥，然后创建工具而无需传递客户端 - 它们使用全局配置。

### 这可以与异步智能体SDK运行时一起使用吗？ {#does-this-work-with-the-async-agents-sdk-runtime}

是的。这些工具使用异步Hindsight客户端 (`aretain`，`arecall`，`areflect`) 直接，因此它们在智能体内无缝运行SDK异步运行时。

### 记忆如何跨越多个智能体？ {#how-is-memory-scoped-across-multiple-agents}

赋予每个智能体自己的`bank_id`用于私人记忆，或分享`bank_id` 跨智能体共享记忆。标签在记忆库中进一步划分记忆。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[OpenAI Agents SDK 集成文档](/sdks/integrations/openai-agents)
