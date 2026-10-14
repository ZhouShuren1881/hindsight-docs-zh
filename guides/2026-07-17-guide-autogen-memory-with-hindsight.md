---
title: "指南：使用 Hindsight 为 AutoGen 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, autogen, agents, memory]
description: "使用 hindsight-autogen 工具，让 AssistantAgent 能够跨对话存入、召回并反思长期记忆。"
image: /img/guides/guide-autogen-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AutoGen 添加记忆](/img/guides/guide-autogen-memory-with-hindsight.svg)

如果想为 **AutoGen 接入 Hindsight 记忆**，最简洁的做法是使用 `hindsight-autogen` 包。它会提供分别用于 Retain（存入）、Recall（召回）和 Reflect（反思）的 `FunctionTool` 实例，可直接接入 AutoGen 的 `AssistantAgent(tools=[...])`。这样，智能体就能保存学到的信息、稍后检索这些信息，并基于记忆进行推理；这些记忆会跨对话保留，而不会在一次运行结束时全部丢失。

AutoGen 很适合这种接入方式，因为该框架以工具为核心。记忆不是插件或外部钩子，而是由智能体自行决定是否调用的三个工具：`hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。该包原生支持异步，直接使用 Hindsight 的异步客户端方法，因此能与 AutoGen 的异步运行时顺畅配合。

本指南将介绍如何安装这个包、创建记忆库、将工具接入 `AssistantAgent`，以及如何快速验证记忆确实正在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"`。
> 2. 将 `Hindsight` 客户端指向后端，并使用 `acreate_bank` 创建记忆库。
> 3. 使用 `create_hindsight_tools(client=client, bank_id="user-123")` 创建工具。
> 4. 将这些工具传给 `AssistantAgent(tools=tools)`。
> 5. 验证后续运行能否召回较早运行时存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保具备以下条件：

- Python 3.10 或更高版本。
- 已安装 AutoGen（使用 OpenAI 模型客户端时需要 `autogen-agentchat` 和 `autogen-ext[openai]`）。
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器。

## 步骤 1：安装包 {#step-1-install-the-package}

将该集成包与 AutoGen 一起安装。

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

`hindsight-autogen` 会安装 `autogen-core` 和 `hindsight-client` 作为依赖。你还需要安装 `autogen-agentchat`，以使用 `AssistantAgent`；使用 OpenAI 模型客户端时，也需要 `autogen-ext[openai]`。

## 步骤 2：创建工具并接入智能体 {#step-2-create-the-tools-and-wire-them-into-your-agent}

创建 Hindsight 客户端和记忆库，构造工具，再将工具传给智能体：

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from hindsight_client import Hindsight
from hindsight_autogen import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id="user-123")

    model_client = OpenAIChatCompletionClient(model="gpt-4o")
    tools = create_hindsight_tools(client=client, bank_id="user-123")

    agent = AssistantAgent(
        name="assistant",
        model_client=model_client,
        tools=tools,
    )

    # 存入一条记忆
    result = await agent.run(task="Remember that I prefer dark mode")
    print(result.messages[-1].content)

    # Hindsight 会异步处理存入的内容（提取事实、
    # 实体消解和生成嵌入向量）。稍作等待，确保下次
    # 召回时这些记忆已可供检索。
    await asyncio.sleep(3)

    # 稍后召回
    result = await agent.run(task="What are my UI preferences?")
    print(result.messages[-1].content)

    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

如果在 Jupyter notebook 中运行，则无需调用 `asyncio.run()`；由于 notebook 已有活动事件循环，可以直接在单元格中使用 `await`。

## 智能体会获得什么 {#what-the-agent-gets}

接入这些工具后，智能体可以自行调用以下三种记忆操作：

- **`hindsight_retain`** — 将信息存入长期记忆。
- **`hindsight_recall`** — 从长期记忆中检索相关事实。
- **`hindsight_reflect`** — 根据记忆综合生成有依据的回答。

这些工具都是普通的 AutoGen `FunctionTool` 实例，模型会像决定是否调用其他工具一样，自行决定何时调用它们。有关这些工具底层行为的说明，请参阅 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

如果只需要其中一部分工具，只需加入所需工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不包含反思工具
)
```

## 步骤 3：一次配置，或使用标签限定范围 {#step-3-configure-once-or-scope-with-tags}

你可以一次性设置全局默认值，此后便可在任何位置创建工具，无需每次都传入客户端：

```python
from hindsight_autogen import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # 用于筛选 Recall 结果的标签
    recall_tags_match="any",
)

tools = create_hindsight_tools(bank_id="user-123")
```

标签可用于按主题、会话或用户划分记忆。存入时使用 `tags`，召回时使用 `recall_tags` 筛选，并通过 `recall_tags_match` 控制匹配方式：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

对于多智能体团队，可以为每个智能体分配独立记忆库，也可以让团队共享一个记忆库。完整的模式列表请参阅[集成文档](/sdks/integrations/autogen)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 运行一轮智能体对话并存入一些内容，例如 `agent.run(task="Remember that I prefer dark mode")`。
2. 稍等片刻，让 Hindsight 完成对存入内容的处理。
3. 后续再运行一轮，询问相关内容，例如 `agent.run(task="What are my UI preferences?")`。
4. 确认回答体现了之前存入的事实。

如果第二次运行能给出第一次存入的偏好，就说明记忆已经正确接入。

## 常见错误 {#common-mistakes}

### 忘记创建记忆库 {#forgetting-to-create-the-bank}

首次使用前，请通过 `acreate_bank(bank_id=...)` 创建记忆库。该操作具有幂等性，因此每次运行时调用也安全。

### 存入后立即召回 {#recalling-immediately-after-retain}

Hindsight 会异步处理存入的内容。如果在同一脚本中连续执行存入和召回，请稍作等待，确保记忆可供检索后再查询。

### 未处理记忆错误 {#not-handling-memory-errors}

操作失败时，工具会抛出 `HindsightError`，AutoGen 会将其作为工具错误呈现给智能体。如果希望优雅降级而不是直接失败，请对智能体调用进行封装。

### 标签不匹配 {#mismatched-tags}

如果存入记忆时使用的 `tags` 与用于筛选召回结果的 `recall_tags` 没有重合，召回结果可能为空。请保持存入和召回时使用的标签约定一致。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用；将 `Hindsight` 客户端指向服务器的 `base_url`，或通过 `configure()` 设置 `hindsight_api_url` 即可。

### 这适用于 AutoGen 的异步运行时吗？ {#does-this-work-in-autogens-async-runtime}

适用。这些工具原生支持异步，并直接使用 Hindsight 的异步客户端方法（`aretain`、`arecall`、`areflect`）。

### 可以只使用 Recall，不使用 Reflect 吗？ {#can-i-use-only-recall-without-reflect}

可以。在 `create_hindsight_tools` 中通过 `include_retain`、`include_recall` 和 `include_reflect` 标志，只加入所需的工具。

### 如何让一组智能体共享记忆？ {#how-do-i-share-memory-across-a-team-of-agents}

让多个智能体指向同一个 `bank_id`，或者为每个智能体分配独立记忆库。还可以使用标签进一步限定每个智能体存入和召回的内容范围。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)开始操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [AutoGen 集成文档](/sdks/integrations/autogen)。
