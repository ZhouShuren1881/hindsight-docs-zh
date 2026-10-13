---
title: "OpenAI 智能体忘记跑步之间的一切。这是修复方法。"
authors: [DK09876]
date: 2026-04-17
tags: [openai, integrations, agents, memory, python, tutorial]
description: "OpenAI智能体SDK智能体在跑步结束时丢失所有状态。后见之明-openai-智能体添加了三个工具和自动注入的记忆指令，使您的智能体在各个会话中都能保持持久的记忆。"
image: /img/blog/openai-agents-persistent-memory.webp
hide_table_of_contents: true
---

![OpenAI 智能体持久记忆与Hindsight](/img/blog/openai-agents-persistent-memory.webp)

OpenAI 的智能体 SDK 为您提供了构建使用工具的智能体的清晰抽象 — 定义一个 `Agent`，为其提供工具，并使用 `Runner.run()` 运行它。但当跑步结束时，智能体就会忘记一切。 `hindsight-openai-agents` 通过三个可调用工具和自动注入记忆指令为 OpenAI 提供智能体持久记忆来解决这个问题。

<!-- truncate -->

## 概览 {#tldr}

- OpenAI智能体SDK具有会话历史记录的会话，但没有跨会话语义记忆——状态不会在运行之间延续
- `hindsight-openai-agents` 为`Agent`提供了三个`FunctionTool`实例：`hindsight_retain`、`hindsight_recall`、`hindsight_reflect`
- 或者使用`memory_instructions()`在每次运行时自动将相关记忆注入到系统提示符中——不需要显式的记忆召回工具调用
- 一个pip安装，将`tools=[...]`传递给你的智能体，完成
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)配合使用或自托管

---

## 问题 {#the-problem}

OpenAI智能体SDK为您提供`Agent`用于工具调用和`Runner.run()`用于执行。它有一个用于保存对话历史记录的`Session`协议（包括`SQLiteSession`）——但那是一个消息日志。它不会提取事实，不会随着时间的推移构建知识，也不会在语义上检索相关上下文。

对于服务重复用户或跨多个会话运行的智能体，您需要更多：

- 一个编码助手，可以记住你的堆栈、偏好和过去的决定
- 客户支持智能体，通过数十个对话了解您的帐户历史记录
- 个人AI，在数周和数月内积累有关您的知识

仅靠对话历史记录这些都不起作用。您需要一个能够从对话中提取事实、随着时间的推移构建知识并在语义上检索相关上下文的系统。

这就是Hindsight的作用。并且`hindsight-openai-agents`将其连接到智能体SDK的工具系统中。

---

## 建筑 {#architecture}

```
OpenAI Agent(tools=[...])
  └─ Hindsight FunctionTools (via create_hindsight_tools)
       ├─ hindsight_retain    → Hindsight retain
       │                        (fact extraction, entity resolution, knowledge graph)
       ├─ hindsight_recall    → Hindsight recall
       │                        (semantic + BM25 + graph + temporal retrieval)
       └─ hindsight_reflect   → Hindsight reflect
                                (synthesize a reasoned answer from all memories)
```

这些工具是与智能体SDK兼容的`FunctionTool`实例，直接传递到`Agent(tools=[...])`。没有子类化，没有自定义智能体类型——只有标准工具的使用。
与智能体兼容的

在底层，Hindsight提取结构化事实，识别实体，构建知识图，并通过跨编码器重排序运行四种并行检索策略。

---

## 第一步：开始Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

在`http://localhost:8888`本地运行，并嵌入Postgres、嵌入和重排序。有关完整设置说明，请参阅[自托管快速入门](/developer/api/quickstart)。

或者完全跳过自托管 - [Hindsight Cloud](https://ui.hindsight.vectorize.io) 几秒钟内即可准备就绪，无需管理基础设施。

## 第 2 步：安装集成 {#step-2-install-the-integration}

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents` 拉入 `openai-agents` 和 `hindsight-client`。 `openai-agents` 软件包提供`Agent`、`Runner` 和`FunctionTool`。

## 第3步：创建记忆库和智能体 {#step-3-create-the-bank-and-agent}

记忆库必须存在才能使用。智能体SDK是异步优先的，因此将所有内容包装在`asyncio.run()`中：

```python
import asyncio
from agents import Agent, Runner
from hindsight_client import Hindsight
from hindsight_openai_agents import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank("user-123", name="User 123 Memory")

    tools = create_hindsight_tools(
        client=client,
        bank_id="user-123",
        tags=["source:chat"],
        budget="mid",
    )

    agent = Agent(
        name="assistant",
        model="gpt-4o-mini",
        tools=tools,
        instructions=(
            "你是一个有长期记忆的得力助手。"
            "使用后视保留来存储用户分享的重要事实。"
            "在回答问题之前使用后视_回忆来搜索记忆。"
        ),
    )

    #会话 1：存储偏好
    result = await Runner.run(agent, input="我是一位数据科学家。我使用Python、SQL 和承载模型的 VS Code。")

    #等待Hindsight 处理完成。调用后视保留后，
    #Hindsight 异步处理内容 — 提取事实、解决问题
    #实体，生成嵌入，并更新知识图。这个
    #通常需要 1-3 秒，具体取决于内容长度和服务器负载。
    await asyncio.sleep(3)

    #第二节：记忆中的记忆（相同的记忆库，记忆仍然存在）
    result = await Runner.run(agent, input="我使用什么 IDE？")
    print(result.final_output)
    #→“您使用带模型构建的 VS Code。”

    #清理
    await client.aclose()

asyncio.run(main())
```

三种工具，一个记忆库。 记忆在运行中持续存在，因为它存储在 Hindsight 中，而不是智能体中。与 AutoGen 的 `AssistantAgent` 不同，OpenAI 智能体始终在工具调用后生成文本响应 — 不需要 `reflect_on_tool_use` 标志。

---

## 自动记忆`memory_instructions()` {#automatic-memory-with-memoryinstructions}

上述工具方法使智能体能够完全控制何时进行记忆再现。但对于大多数用例，您希望自动注入相关记忆——无需调用工具。这就是 `memory_instructions()` 的作用。

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    model="gpt-4o-mini",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions=(
            "你是一个有长期记忆的得力助手。"
            "使用后视保留来存储用户分享的重要事实。"
        ),
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  #由记忆指令处理的记忆召回
    ),
)
```

`memory_instructions()` 获取静态 `base_instructions` 并返回一个异步可调用对象，该可调用对象在每次运行时将它们与调用的记忆组合起来。智能体SDK的`Agent(instructions=...)`接受`str | Callable | None`，因此可直接调用插槽。智能体仍然使用`hindsight_retain`来存储新信息，但记忆召回会自动发生——在智能体开始推理之前，相关记忆就被预先加载到系统提示中。

这是大多数用例的推荐方法。它减少了延迟（没有记忆召回工具往返），简化了智能体的决策（它不必决定*当*到记忆召回），并确保上下文始终存在。

---

## 每用户记忆库 {#per-user-memory-banks}

参数化`bank_id`以实现每用户隔离：

```python
def create_agent_for_user(user_id: str) -> Agent:
    tools = create_hindsight_tools(
        client=client,
        bank_id=f"user-{user_id}",
    )
    return Agent(
        name="assistant",
        model="gpt-4o-mini",
        tools=tools,
    )
```

每个记忆库完全隔离——无跨用户数据泄露。更多模式请参见[每用户记忆食谱](/cookbook/recipes/per-user-memory)。

---

## 共享记忆的交接 {#handoffs-with-shared-memory}

交接是智能体SDK的杀手级功能——一个智能体在对话中路由到另一个智能体。 记忆让他们变得更好。当两个智能体共享一个`bank_id`时，他们共享记忆。分类智能体可以查看用户的历史记录；专家可以存储和检索结果。智能体之间没有数据复制。

```python
from agents import Agent, Handoff

triage = Agent(
    name="triage",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="将用户引导至正确的专家。",
    ),
    handoffs=[Handoff(agent=specialist)],
)

specialist = Agent(
    name="specialist",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="您是领域专家。",
    ),
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
)
```

​​相同`bank_id`表示共享记忆。在决定路由到哪里之前，分类智能体会通过 `memory_instructions()` 获取用户的完整上下文注入。专家拾取相同的上下文，并可以使用 `hindsight_retain` 存储新的发现。所有内容都保留在一个记忆库中——无需复制、无需同步、无需协调代码。

---

## 什么时候使用这个 {#when-to-use-this}

- **重复用户智能体** — 支持机器人、编码助理、个人AI，应记住跨会话的偏好和历史记录
- **具有共享记忆的多智能体切换** - 切换链中的智能体记忆存储发现，因此下游智能体从上下文开始
- **长时间运行的工作流程** - 处理数天/数周数据并需要增量积累知识的智能体
- **个性化** — 任何“记住用户”随着时间的推移提高质量的智能体

## 何时不使用此功能 {#when-not-to-use-this}

- **仅限会话中的上下文** — 如果您的智能体仅需要记住单个 `Runner.run()` 调用中的内容，则内置对话处理更简单并且零延迟开销
- **对话历史回放** — 如果您只需要跨会话保留和重放消息日志，请使用 SDK 的 `Session` 协议（例如 `SQLiteSession`）。 Hindsight 用于语义记忆，而不是聊天记录
- **文献检索(RAG)** — Hindsight 是一个记忆系统，用于记录随着时间的推移学到的事实，而不是文档存储
- **短暂智能体** — 如果每个智能体调用在设计上都是无状态的（批处理、一次性任务），那么持久记忆会增加复杂性，但没有任何好处
- **延迟关键型热路径** — 每个记忆操作都会增加一次网络往返

---

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

**记忆库必须首先存在。** 在智能体启动前调用`await client.acreate_bank(bank_id, name=...)`。如果记忆库不存在，记忆存储/记忆召回就会失败。

**异步处理延迟。** 在`hindsight_retain`之后，Hindsight异步处理内容——提取事实、实体、嵌入。如果你记忆存储并立即记忆召回，新的记忆可能还无法搜索。实际上，1-3秒。

**预算调整。** 默认`budget="mid"` 平衡速度和彻底性。使用`"low"`进行延迟敏感的智能体，使用`"high"`进行深度分析。

**惊奇与记忆召回。** 使用 `hindsight_recall` 获取原始事实（“我使用什么 IDE？”）。使用 `hindsight_reflect` 进行综合（“根据你所知道的一切，我应该优先考虑什么？”）。 推测速度较慢，但​​会产生基于完整知识图的合理答案。

---

## 比较如何 {#how-this-compares}

**vs。会话/SQLiteSession：** 智能体 SDK 的 `Session` 协议在运行期间保留对话消息。这是一个消息日志——它不会提取事实，不会概括，并且会随着每次对话而线性增长。 Hindsight 提取结构化事实、删除重复数据并仅检索相关内容。

**vs。原始矢量存储（Pinecone、Weaviate、Chroma）：** 向量存储为您提供嵌入相似性搜索。 Hindsight 使用跨编码器重排序运行四种并行检索策略（语义、BM25、图遍历、时间），以及实体解析和知识图。它是一个记忆引擎，而不是数据库。参见[基准结果](/blog/2026/04/02/beam-sota)。

**vs。其他框架集成：** 如果您使用 AutoGen、LlamaIndex、LangGraph、CrewAI 或 Pydantic AI 而不是 OpenAI 智能体 SDK、Hindsight 都有专门的集成 — 请参阅[AutoGen](/sdks/integrations/autogen)、[LlamaIndex](/sdks/integrations/llamaindex)、[其他](/sdks/integrations/crewai)。

---

## 回顾 {#recap}

- `hindsight-openai-agents` 通过传递给`Agent(tools=[...])`的`FunctionTool`实例提供OpenAI智能体持久记忆
- 三个工具：`hindsight_retain`（存储）、`hindsight_recall`（搜索）、`hindsight_reflect`（合成）
- `memory_instructions()` 在每次运行时自动将相关记忆注入到系统提示符中——这是大多数用例的推荐方法
- 适用于OpenAI智能体SDK支持的任何模型
- 用于记忆隔离的每用户记忆库、用于范围界定的标签、用于速度/深度权衡的预算
- 共享`bank_id`跨切换智能体为您提供零协调代码的持久、共享记忆

---

## 后续步骤 {#next-steps}

- **本地尝试：** `pip install hindsight-all hindsight-openai-agents openai-agents` 并运行上面的示例
- **使用Hindsight Cloud：** 使用 [免费帐户](https://ui.hindsight.vectorize.io) 跳过自托管
- **快速入门：** 使用 [开发者快速入门](/developer/api/quickstart) 在几分钟内运行 Hindsight 服务器
- **探索食谱：**[跨智能体框架的记忆模式](/cookbook)
- **其他集成：** [AutoGen](/sdks/integrations/autogen)、[LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、[Pydantic AI](/sdks/integrations/pydantic-ai)、[CrewAI](/sdks/integrations/crewai)
