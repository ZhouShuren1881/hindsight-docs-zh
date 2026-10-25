---
title: "借助 Hindsight 为 AutoGen 智能体提供持久记忆"
authors: [DK09876]
date: 2026-04-06
tags: [autogen, integrations, agents, memory, python, microsoft, tutorial]
description: "AutoGen 智能体会在会话结束时丢失所有状态。hindsight-autogen 添加了三种工具——存入、召回、反思——让智能体在多个会话中拥有持久记忆。"
image: /img/blog/autogen-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 AutoGen 智能体提供持久记忆](/img/blog/autogen-persistent-memory.webp)

AutoGen 是微软用于构建多智能体系统的开源框架，支持可对话智能体、群聊、工具调用和代码执行。但会话结束后，参与对话的每个智能体都会忘记所有内容。`hindsight-autogen` 通过三个可调用工具为 AutoGen 智能体提供持久记忆，解决了这个问题。

<!-- truncate -->

## 概要 {#tldr}

- AutoGen 智能体没有内置的跨会话记忆；每次运行都会重置状态。
- `hindsight-autogen` 为 `AssistantAgent` 提供三个 `FunctionTool` 实例：`hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。
- 安装一个 pip 包，把 `tools=[...]` 传给智能体即可。
- 可搭配 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 使用，也可自行托管。

## 问题 {#the-problem}

AutoGen 为 `AssistantAgent` 提供会话内聊天记录。这只是一个消息列表：它不会提取事实，不会随着时间积累知识，并且会在进程退出时消失。

如果智能体要服务于回访用户，或需要跨多个会话运行，就需要更多能力：

- 能记住技术栈、偏好和过往决策的编码助手
- 由协调者保留以往群聊知识的多智能体团队
- 能通过几十次对话了解用户账户历史的支持智能体

会话内聊天记录无法满足这些需求。你需要一个能从对话中提取事实、随时间积累知识，并通过语义检索找出相关上下文的系统。

这正是 Hindsight 的作用。`hindsight-autogen` 会将它接入 AutoGen 的工具系统。

## 架构 {#architecture}

```
AutoGen AssistantAgent(tools=[...])
  └─ Hindsight FunctionTools（通过 create_hindsight_tools 创建）
       ├─ hindsight_retain    → Hindsight 存入
       │                        （事实提取、实体解析、知识图谱）
       ├─ hindsight_recall    → Hindsight 召回
       │                        （语义检索 + BM25 + 图检索 + 时间检索）
       └─ hindsight_reflect   → Hindsight 反思
                                （基于所有记忆综合生成有推理依据的答案）
```

这些工具是来自 `autogen_core.tools` 的 `FunctionTool` 实例，可直接传给 `AssistantAgent(tools=[...])`。无需继承子类，也无需自定义智能体类型，使用 AutoGen 的标准工具即可。

在底层，Hindsight 会提取结构化事实、识别实体、构建知识图谱，并通过交叉编码器重排序运行四种并行检索策略。

## 第 1 步：启动 Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

服务会在本地 `http://localhost:8888` 运行，并内置 Postgres、嵌入向量和重排序功能。

也可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，免去自行托管。

## 第 2 步：安装集成 {#step-2-install-the-integration}

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

`hindsight-autogen` 会安装 `autogen-core` 和 `hindsight-client`。此外，你还需要 `autogen-agentchat` 来使用 `AssistantAgent`，以及 `autogen-ext[openai]` 来使用模型客户端。

## 第 3 步：创建记忆库和智能体 {#step-3-create-the-bank-and-agent}

必须先创建记忆库，才能使用它。AutoGen 智能体是异步的，因此需要用 `asyncio.run()` 包装全部逻辑：

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
            "You are a helpful assistant with long-term memory. "
            "Use hindsight_retain to store important facts the user shares. "
            "Use hindsight_recall to search memory before answering questions."
        ),
    )

    # 会话 1：存入偏好
    result = await agent.run(
        task="I'm a data scientist. I use Python, SQL, and VS Code with dark mode.",
    )

    # 等待 Hindsight 完成处理（事实提取为异步操作）
    await asyncio.sleep(3)

    # 会话 2：从记忆中召回（使用同一记忆库，记忆会持续保存）
    result = await agent.run(
        task="What IDE do I use?",
    )
    print(result.messages[-1].content)
    # → "You use VS Code with dark mode."

    # 清理
    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

三个工具，一个记忆库。记忆保存在 Hindsight 中，而不是智能体中，因此会在多次对话之间持续存在。

## 按用户隔离的记忆库 {#per-user-memory-banks}

通过参数化 `bank_id`，为每位用户隔离记忆：

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

每个记忆库都完全隔离，不会发生跨用户数据泄露。

## 适用场景 {#when-to-use-this}

- **服务回访用户的智能体** — 支持机器人、编码助手和个人 AI 等需要跨会话记住偏好与历史的智能体
- **共享记忆的多智能体团队** — 协调者智能体保留群聊中的发现，让后续会话一开始就有相关上下文
- **长期运行的工作流** — 需要在数天或数周内处理数据并逐步积累知识的智能体
- **个性化** — 任何能通过“记住用户”而随时间提升质量的智能体

## 不适用的场景 {#when-not-to-use-this}

请明确评估：持久记忆并非总是合适的工具。

- **只需会话内上下文** — 如果智能体只需记住单次对话中的内容，AutoGen 内置的聊天记录更简单，也不会带来延迟开销。不要只因为能用 Hindsight 就添加它。
- **文档搜索（RAG）** — 如果需要对文档语料库进行向量搜索，请使用专用向量存储。Hindsight 是用于记录随时间学到的事实的记忆系统，不是文档存储。
- **短暂运行的智能体** — 如果每次调用都按设计保持无状态（例如批处理或一次性任务），持久记忆会增加复杂性，却没有收益。
- **对延迟敏感的关键路径** — 每次记忆操作都会增加一次网络往返。如果相比个性化，你更看重低于 100 毫秒的响应时间，就不要使用持久记忆。

## 陷阱与边缘情况 {#pitfalls-and-edge-cases}

**必须先创建记忆库。** 在启动智能体之前，调用 `await client.acreate_bank(bank_id, name=...)`。如果记忆库不存在，存入和召回操作都会失败。

**异步处理延迟。** 调用 `hindsight_retain` 后，Hindsight 会异步处理内容，提取事实和实体并生成嵌入向量。如果存入后立即召回，新记忆可能还无法检索到。实际等待时间通常为 1–3 秒。

**调整预算。** 默认的 `budget="mid"` 在速度和全面性之间取得平衡。对延迟敏感的智能体可使用 `"low"`，进行深度分析时可使用 `"high"`。预算控制运行的检索策略数量以及重排序的程度。

**反思与召回。** 对于原始事实类问题（“我用什么 IDE？”），使用 `hindsight_recall`。需要综合推理时（“根据你掌握的所有信息，我应该优先处理什么？”），使用 `hindsight_reflect`。Reflect 速度较慢，但能依据完整的知识图谱生成经过推理的答案。

## 对比 {#how-this-compares}

**与 AutoGen 聊天记录相比：** 聊天记录会在会话内保存原始消息。它不会提取事实或归纳知识，并会在对话结束时消失。Hindsight 会提取结构化事实、去重，并只检索相关内容；它压缩知识，而不是不断累积 token。

**与原始向量存储（Pinecone、Weaviate、Chroma）相比：** 向量存储提供基于嵌入相似度的搜索。Hindsight 会通过交叉编码器重排序运行四种并行检索策略（语义检索、BM25、图遍历和时间检索），还会提取实体、解析共指并构建知识图谱。它是一套记忆引擎，而非数据库。关于该架构在大规模场景中的表现，可参阅 [Hindsight 在 BEAM 上的表现](/blog/2026/04/02/beam-sota)所提供的独立基准测试结果。

**与其他框架集成相比：** 如果你使用的是 LlamaIndex、LangGraph、CrewAI 或 Pydantic AI，而不是 AutoGen，Hindsight 也为这些框架提供了专用集成：[LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、[CrewAI](/sdks/integrations/crewai)、[Pydantic AI](/sdks/integrations/pydantic-ai)。

## 回顾 {#recap}

- `hindsight-autogen` 通过传给 `AssistantAgent(tools=[...])` 的 `FunctionTool` 实例，为 AutoGen 智能体提供持久记忆。
- 三种工具：`hindsight_retain`（存入）、`hindsight_recall`（检索）、`hindsight_reflect`（综合生成）。
- 适用于任意 `AssistantAgent`，包括单智能体和多智能体团队。
- 使用按用户隔离的记忆库隔离记忆，用标签限定范围，并用预算权衡速度与深度。

## 后续步骤 {#next-steps}

- **本地试用：** 安装 `pip install hindsight-all hindsight-autogen autogen-agentchat "autogen-ext[openai]"`，然后运行上面的示例。
- **使用 Hindsight Cloud：** 通过[免费账户](https://ui.hindsight.vectorize.io)免去自行托管。
- **查看基准测试结果：** [为什么 Hindsight 在 10M token 规模的 BEAM 测试中领先](/blog/2026/04/02/beam-sota)
- **探索其他集成：** [LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、[Pydantic AI](/sdks/integrations/pydantic-ai)、[CrewAI](/sdks/integrations/crewai)
