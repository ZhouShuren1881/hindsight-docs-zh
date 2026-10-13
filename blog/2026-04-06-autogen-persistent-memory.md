---
title: "AutoGen智能体与Hindsight的持久记忆"
authors: [DK09876]
date: 2026-04-06
tags: [autogen, integrations, agents, memory, python, microsoft, tutorial]
description: "AutoGen智能体将丢失所有状态。后视-autogen添加了三种工具——记忆存储、记忆召回、反思——让你的智能体在整个会话中保持持久的记忆。"
image: /img/blog/autogen-persistent-memory.webp
hide_table_of_contents: true
---

![AutoGen智能体与Hindsight的持久记忆](/img/blog/autogen-persistent-memory.webp)

​​AutoGen是微软用于构建多智能体系统的开源框架：可对话的智能体、群聊、工具使用、代码执行。但当会话结束时，对话中的每个智能体都会忘记一切。 `hindsight-autogen` 通过三个可调用工具为 AutoGen 提供智能体持久记忆来解决这个问题。

<!-- truncate -->

## 概览 {#tldr}

- AutoGen智能体没有内置的跨会话记忆；每次运行都会重置状态
- `hindsight-autogen` 为`AssistantAgent`提供了三个`FunctionTool`实例：`hindsight_retain`、`hindsight_recall`、`hindsight_reflect`
- 一个pip安装，将`tools=[...]`传递给你的智能体，完成
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)配合使用或自托管

## 问题 {#the-problem}

AutoGen 为您提供 `AssistantAgent` 会话内的聊天记录。那是一个消息列表；它不会提取事实，不会随着时间的推移积累知识，并且会在进程退出时消失。

对于服务重复用户或跨多个会话运行的智能体，您需要更多：

- 一个编码助手，可以记住你的堆栈、偏好和过去的决定
- 一个多智能体团队，协调员保留以前群聊中的知识
- 支持智能体，可以通过数十个对话了解您的帐户历史记录

这些都不适用于会话中的聊天历史记录。您需要一个能够从对话中提取事实、随着时间的推移构建知识并在语义上检索相关上下文的系统。

这就是Hindsight的作用。并且`hindsight-autogen`将其连接到AutoGen的工具系统中。

## 建筑 {#architecture}

```
AutoGen AssistantAgent(tools=[...])
  └─ Hindsight FunctionTools (via create_hindsight_tools)
       ├─ hindsight_retain    → Hindsight retain
       │                        (fact extraction, entity resolution, knowledge graph)
       ├─ hindsight_recall    → Hindsight recall
       │                        (semantic + BM25 + graph + temporal retrieval)
       └─ hindsight_reflect   → Hindsight reflect
                                (synthesize a reasoned answer from all memories)
```

这些工具是来自`autogen_core.tools`的`FunctionTool`实例，直接传递到`AssistantAgent(tools=[...])`。没有子类化，没有自定义智能体类型，只有标准的AutoGen工具使用。

在底层，Hindsight提取结构化事实，识别实体，构建知识图，并通过跨编码器重排序运行四种并行检索策略。

## 第一步：开始Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

在`http://localhost:8888`本地运行，并嵌入Postgres、嵌入和重排序。

或者使用[Hindsight Cloud](https://ui.hindsight.vectorize.io)并跳过自托管。

## 第 2 步：安装集成 {#step-2-install-the-integration}

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

`hindsight-autogen` 拉入 `autogen-core` 和 `hindsight-client`。对于模型客户端，您还需要 `AssistantAgent` 和 `autogen-ext[openai]` `autogen-agentchat`。

## 第3步：创建记忆库和智能体 {#step-3-create-the-bank-and-agent}

记忆库必须存在才能使用。 AutoGen 智能体是异步的，因此将所有内容包装在 `asyncio.run()` 中：

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from hindsight_client import Hindsight
from hindsight_autogen import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank("user-123", name="User 123 Memory")

    model_client = OpenAIChatCompletionClient(model="gpt-4o-mini")
    tools = create_hindsight_tools(
        client=client,
        bank_id="user-123",
        tags=["source:chat"],
        budget="mid",
    )

    agent = AssistantAgent(
        name="assistant",
        model_client=model_client,
        tools=tools,
        reflect_on_tool_use=True,
        system_message=(
            "你是一个有长期记忆的得力助手。"
            "使用后视保留来存储用户分享的重要事实。"
            "在回答问题之前使用后视_回忆来搜索记忆。"
        ),
    )

    #会话 1：存储偏好
    result = await agent.run(
        task="我是一位数据科学家。我使用Python、SQL 和承载模型的 VS Code。",
    )

    #等待Hindsight完成处理（事实提取是异步的）
    await asyncio.sleep(3)

    #第二节：记忆中的记忆（相同的记忆库，记忆仍然存在）
    result = await agent.run(
        task="我使用什么 IDE？",
    )
    print(result.messages[-1].content)
    #→“您使用带模型构建的 VS Code。”

    #清理
    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

三种工具，一个记忆库。 记忆在对话中持续存在，因为它存储在 Hindsight 中，而不是智能体中。

## 每用户记忆库 {#per-user-memory-banks}

参数化`bank_id`以实现每用户隔离：

```python
def create_agent_for_user(user_id: str) -> AssistantAgent:
    tools = create_hindsight_tools(
        client=client,
        bank_id=f"user-{user_id}",
    )
    return AssistantAgent(
        name="assistant",
        model_client=OpenAIChatCompletionClient(model="gpt-4o-mini"),
        tools=tools,
    )
```

每个记忆库完全隔离；无跨用户数据泄露。

## 什么时候使用这个 {#when-to-use-this}

- **重复用户智能体** — 支持机器人、编码助理、个人AI，应记住跨会话的偏好和历史记录
- **具有共享记忆的多智能体团队** — 协调员智能体保留群聊的结果，以便未来的会议从上下文开始
- **长时间运行的工作流程** - 处理数天/数周数据并需要增量积累知识的智能体
- **个性化** — 任何“记住用户”随着时间的推移提高质量的智能体

## 何时不使用此功能 {#when-not-to-use-this}

明确：持久记忆并不总是正确的工具。

- **仅限会话中的上下文** — 如果您的智能体只需要记住单个对话中的内容，AutoGen 的内置聊天历史记录更简单且零延迟开销。不要仅仅因为可以就添加 Hindsight。
- **文献检索(RAG)** — 如果您需要对文档语料库进行向量搜索，请使用专用向量存储。 Hindsight 是一个记忆系统，用于记录随着时间​​的推移学到的事实，而不是文档存储。
- **短暂智能体** — 如果每个智能体调用在设计上都是无状态的（批处理、一次性任务），那么持久记忆会增加复杂性，但没有任何好处。
- **延迟关键型热路径** — 每个记忆操作都会增加一次网络往返。如果 100 毫秒以下的响应时间比个性化更重要，请跳过它。

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

**记忆库必须首先存在。** 在智能体启动前调用`await client.acreate_bank(bank_id, name=...)`。如果记忆库不存在，记忆存储/记忆召回就会失败。

**异步处理延迟。** 在`hindsight_retain`之后，Hindsight异步处理内容，提取事实、实体、嵌入。如果你记忆存储并立即记忆召回，新的记忆可能还无法搜索。实际上，1-3秒。

**预算调整。** 默认`budget="mid"` 平衡速度和彻底性。使用`"low"`进行延迟敏感的智能体，使用`"high"`进行深度分析。预算控制运行多少检索策略以及发生多少重排序。

**惊奇与记忆召回。** 使用 `hindsight_recall` 获取原始事实（“我使用什么 IDE？”）。使用 `hindsight_reflect` 进行综合（“根据你所知道的一切，我应该优先考虑什么？”）。 推测速度较慢，但​​会产生基于完整知识图的合理答案。

## 比较如何 {#how-this-compares}

**vs。 AutoGen聊天记录：** 聊天历史记录存储会话中的原始消息。它不会提取事实，不会概括，并且会在对话结束时消失。 Hindsight 提取结构化事实、删除重复数据并仅检索相关内容 — 它压缩知识而不是积累标记。

**vs。原始矢量存储（Pinecone、Weaviate、Chroma）：** 向量存储为您提供嵌入相似性搜索。 Hindsight 使用跨编码器重排序运行四种并行检索策略（语义、BM25、图遍历、时间），此外还提取实体、解析共指并构建知识图。它是一个记忆引擎，而不是数据库。有关该架构大规模实现的独立基准测试结果，请参阅[Hindsight 于 BEAM](https://hindsight.vectorize.io/blog/2026/04/02/beam-sota)。

**vs。其他框架集成：** 如果您使用 LlamaIndex、LangGraph、CrewAI 或 Pydantic AI 而不是 AutoGen，则Hindsight 具有针对以下各项的专用集成：[LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、 [CrewAI](/sdks/integrations/crewai)，[Pydantic AI](/sdks/integrations/pydantic-ai)。

## 回顾 {#recap}

- `hindsight-autogen` 通过传递给`AssistantAgent(tools=[...])`的`FunctionTool`实例提供AutoGen智能体持久记忆
- 三个工具：`hindsight_retain`（存储）、`hindsight_recall`（搜索）、`hindsight_reflect`（合成）
- 可与任何AutoGen`AssistantAgent`、单个智能体或多智能体团队合作
- 用于记忆隔离的每用户记忆库、用于范围界定的标签、用于速度/深度权衡的预算

## 后续步骤 {#next-steps}

- **本地尝试：** `pip install hindsight-all hindsight-autogen autogen-agentchat "autogen-ext[openai]"` 并运行上面的示例
- **使用Hindsight Cloud：** 使用 [免费帐户](https://ui.hindsight.vectorize.io) 跳过自托管
- **基准结果：**[为什么 Hindsight 在 10M token上领先于 BEAM](https://hindsight.vectorize.io/blog/2026/04/02/beam-sota)
- **探索其他集成：**[LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、[Pydantic AI](/sdks/integrations/pydantic-ai)、[CrewAI](/sdks/integrations/crewai)
