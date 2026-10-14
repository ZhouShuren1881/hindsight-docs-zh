---
title: "OpenAI 智能体每次运行后都会忘记一切。解决方法来了。"
authors: [DK09876]
date: 2026-04-17
tags: [openai, integrations, agents, memory, python, tutorial]
description: "OpenAI Agents SDK 智能体会在一次运行结束后丢失所有状态。hindsight-openai-agents 提供三个工具和自动注入的记忆指令，让智能体在多个会话间保留持久记忆。"
image: /img/blog/openai-agents-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 实现 OpenAI 智能体的持久记忆](/img/blog/openai-agents-persistent-memory.webp)

OpenAI Agents SDK 为构建可调用工具的智能体提供了简洁的抽象：定义一个 `Agent`，为它提供工具，再通过 `Runner.run()` 运行。但一次运行结束后，智能体就会忘记一切。`hindsight-openai-agents` 通过三个可调用工具和自动注入的记忆指令，为 OpenAI 智能体提供持久记忆，解决了这个问题。

<!-- truncate -->

## 概览 {#tldr}

- OpenAI Agents SDK 提供用于对话历史的 Sessions，但没有跨会话的语义记忆，因此状态不会延续到下一次运行
- `hindsight-openai-agents` 为 `Agent` 提供三个 `FunctionTool` 实例：`hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`
- 也可以使用 `memory_instructions()`，在每次运行时自动将相关记忆注入系统提示，无需显式调用记忆召回工具
- 只需通过 pip 安装一次，再将 `tools=[...]` 传给智能体即可
- 可与 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管版本配合使用

---

## 问题所在 {#the-problem}

OpenAI Agents SDK 提供用于工具调用的 `Agent` 和用于执行的 `Runner.run()`。它还提供用于持久保存对话历史的 `Session` 协议（包括 `SQLiteSession`），但这只是一份消息日志：它不会提取事实、不会随时间积累知识，也不会通过语义检索获取相关上下文。

对于面向重复用户提供服务或跨多个会话运行的智能体，你还需要更多能力：

- 能记住你的技术栈、偏好和过往决策的编程助手
- 能在数十次对话中了解用户账户历史的客服智能体
- 能在数周、数月内积累关于你的知识的个人 AI

仅靠对话历史无法实现这些能力。你需要一个系统，能够从对话中提取事实、逐步积累知识，并通过语义检索获取相关上下文。

这正是 Hindsight 的作用。`hindsight-openai-agents` 会将它接入 Agents SDK 的工具系统。

---

## 架构 {#architecture}

```
OpenAI Agent(tools=[...])
  └─ Hindsight FunctionTools（通过 create_hindsight_tools 提供）
       ├─ hindsight_retain    → Hindsight Retain（存入）
       │                        （事实提取、实体消解、知识图谱）
       ├─ hindsight_recall    → Hindsight Recall（召回）
       │                        （语义、BM25、图和时间检索）
       └─ hindsight_reflect   → Hindsight Reflect（反思）
                                （基于所有记忆综合生成经过推理的答案）
```

这些工具是兼容 Agents SDK 的 `FunctionTool` 实例，可直接传给 `Agent(tools=[...])`。无需子类化，也无需自定义智能体类型，只需使用标准工具。

在底层，Hindsight 会提取结构化事实、识别实体、构建知识图谱，并通过交叉编码器重排序运行四种并行检索策略。

---

## 第 1 步：启动 Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

服务会在本机 `http://localhost:8888` 运行，并内置 Postgres、嵌入和重排序功能。完整设置说明请参阅[自托管快速入门](/developer/api/quickstart)。

也可以完全跳过自托管：[Hindsight Cloud](https://ui.hindsight.vectorize.io) 几秒钟即可就绪，无需管理基础设施。

## 第 2 步：安装集成 {#step-2-install-the-integration}

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents` 会安装 `openai-agents` 和 `hindsight-client`。`openai-agents` 包提供 `Agent`、`Runner` 和 `FunctionTool`。

## 第 3 步：创建记忆库和智能体 {#step-3-create-the-bank-and-agent}

使用前必须先创建记忆库。Agents SDK 以异步为先，因此要用 `asyncio.run()` 包装所有操作：

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
            "You are a helpful assistant with long-term memory. "
            "Use hindsight_retain to store important facts the user shares. "
            "Use hindsight_recall to search memory before answering questions."
        ),
    )

    # 会话 1：存入偏好
    result = await Runner.run(agent, input="I'm a data scientist. I use Python, SQL, and VS Code with dark mode.")

    # 等待 Hindsight 完成处理。调用 hindsight_retain 之后，
    # Hindsight 会异步处理内容：提取事实、消解实体，
    # 生成嵌入向量并更新知识图谱。
    # 根据内容长度和服务端负载，这通常需要 1-3 秒。
    await asyncio.sleep(3)

    # 会话 2：从记忆中召回（使用同一记忆库，记忆会持久保存）
    result = await Runner.run(agent, input="What IDE do I use?")
    print(result.final_output)
    # → "You use VS Code with dark mode."

    # 清理
    await client.aclose()

asyncio.run(main())
```

三个工具，一个记忆库。记忆保存在 Hindsight 中，而不是智能体里，因此会在多次运行之间持续存在。与 AutoGen 的 `AssistantAgent` 不同，OpenAI Agents 在工具调用后始终会生成文本响应，因此无需设置 `reflect_on_tool_use` 标志。

---

## 使用 `memory_instructions()` 自动注入记忆 {#automatic-memory-with-memoryinstructions}

上面介绍的工具方式让智能体完全控制何时召回记忆。但大多数场景都希望自动注入相关记忆，无需调用工具。这正是 `memory_instructions()` 的用途。

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    model="gpt-4o-mini",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions=(
            "You are a helpful assistant with long-term memory. "
            "Use hindsight_retain to store important facts the user shares."
        ),
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  # recall handled by memory_instructions
    ),
)
```

`memory_instructions()` 接收静态的 `base_instructions`，并返回一个异步可调用对象。每次运行时，它都会把基础指令与召回的记忆组合起来。Agents SDK 的 `Agent(instructions=...)` 接受 `str | Callable | None`，因此可以直接传入这个可调用对象。智能体仍会使用 `hindsight_retain` 存储新信息，但记忆召回会自动进行：在智能体开始推理前，相关记忆就已预先载入系统提示。

这是大多数场景的推荐方式。它能降低延迟（省去记忆召回工具的往返调用），简化智能体的决策过程（无需由它判断何时召回记忆），并确保上下文始终可用。

---

## 按用户划分记忆库 {#per-user-memory-banks}

将 `bank_id` 参数化，即可按用户隔离记忆：

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

每个记忆库都完全隔离，不会发生跨用户数据泄露。更多模式请参阅[按用户划分记忆的食谱](/cookbook/recipes/per-user-memory)。

---

## 共享记忆的交接 {#handoffs-with-shared-memory}

交接是 Agents SDK 的一项核心功能：一个智能体可以在对话中将处理工作转交给另一个智能体。记忆能让交接更有效。当两个智能体共用一个 `bank_id` 时，它们也共享记忆。分流智能体可以查看用户的历史记录，专家智能体则可以存储和检索发现。智能体之间无需复制数据。

```python
from agents import Agent, Handoff

triage = Agent(
    name="triage",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="Route the user to the right specialist.",
    ),
    handoffs=[Handoff(agent=specialist)],
)

specialist = Agent(
    name="specialist",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="You are a domain expert.",
    ),
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
)
```

相同的 `bank_id` 表示共享记忆。分流智能体会在决定将用户转交给谁之前，通过 `memory_instructions()` 注入用户的完整上下文。专家智能体会接续使用同一上下文，也可以通过 `hindsight_retain` 存储新的发现。所有内容都留在同一个记忆库中，无需复制、同步或编写协调代码。

---

## 适用场景 {#when-to-use-this}

- **重复服务同一用户的智能体** — 客服机器人、编程助手、个人 AI 等需要跨会话记住用户偏好和历史记录的智能体
- **共享记忆的多智能体交接** — 交接链中的智能体保存发现，让下游智能体一开始就拥有上下文
- **长时间运行的工作流** — 处理数天或数周数据、需要逐步积累知识的智能体
- **个性化** — 任何能通过随时间“记住用户”来提高质量的智能体

## 不适用场景 {#when-not-to-use-this}

- **仅需单次会话内的上下文** — 如果智能体只需记住单次 `Runner.run()` 调用中的内容，内置的对话处理方式更简单，而且不会增加延迟开销
- **重放对话历史** — 如果只需跨会话保存并重放消息日志，请使用 SDK 的 `Session` 协议（例如 `SQLiteSession`）。Hindsight 提供的是语义记忆，不是聊天日志
- **文档检索（RAG）** — Hindsight 是用于记录随时间学到的事实的记忆系统，不是文档存储库
- **短暂运行的智能体** — 如果每次调用都按设计保持无状态（例如批处理或一次性任务），持久记忆只会增加复杂性，没有实际收益
- **对延迟敏感的关键路径** — 每次记忆操作都会增加一次网络往返

---

## 注意事项和边缘情况 {#pitfalls-and-edge-cases}

**必须先创建记忆库。** 启动智能体前调用 `await client.acreate_bank(bank_id, name=...)`。如果记忆库不存在，retain 和 recall 操作都会失败。

**异步处理延迟。** 调用 `hindsight_retain` 后，Hindsight 会异步处理内容，包括提取事实、实体和嵌入。如果存入后立即召回，新记忆可能还无法检索。实际等待时间通常为 1-3 秒。

**调整预算。** 默认的 `budget="mid"` 在速度和全面性之间取得平衡。对延迟敏感的智能体可使用 `"low"`，需要深入分析时可使用 `"high"`。

**Reflect 与 Recall。** 对于原始事实（“我使用什么 IDE？”），使用 `hindsight_recall`；对于综合推理（“根据你掌握的所有信息，我应该优先处理什么？”），使用 `hindsight_reflect`。Reflect 速度较慢，但会基于完整知识图谱给出经过推理的答案。

---

## 与其他方案的比较 {#how-this-compares}

**与 Sessions / SQLiteSession 比较：** Agents SDK 的 `Session` 协议会在多次运行之间保存对话消息。这只是消息日志，不会提取事实，也不会归纳出一般规律，而且会随着每次对话线性增长。Hindsight 会提取结构化事实、去重，并且只检索相关内容。

**与原始向量存储（Pinecone、Weaviate、Chroma）比较：** 向量存储提供嵌入相似度检索。Hindsight 除了实体消解和知识图谱，还会通过交叉编码器重排序运行四种并行检索策略（语义、BM25、图遍历和时间检索）。它是记忆引擎，而不是数据库。请参阅[基准测试结果](/blog/2026/04/02/beam-sota)。

**与其他框架集成比较：** 如果你使用的是 AutoGen、LlamaIndex、LangGraph、CrewAI 或 Pydantic AI，而不是 OpenAI Agents SDK，Hindsight 也为它们提供了专用集成。请参阅 [AutoGen](/sdks/integrations/autogen)、[LlamaIndex](/sdks/integrations/llamaindex) 和[其他集成](/sdks/integrations/crewai)。

---

## 小结 {#recap}

- `hindsight-openai-agents` 通过传给 `Agent(tools=[...])` 的 `FunctionTool` 实例，为 OpenAI 智能体提供持久记忆
- 三种工具：`hindsight_retain`（存入）、`hindsight_recall`（检索）和 `hindsight_reflect`（综合生成）
- `memory_instructions()` 会在每次运行时自动将相关记忆注入系统提示；这是大多数场景的推荐方式
- 可与 OpenAI Agents SDK 支持的任何模型配合使用
- 可为每位用户建立独立记忆库以实现隔离，使用标签限定范围，并通过预算权衡速度与检索深度
- 交接的智能体共用 `bank_id` 后，即可共享持久记忆，无需编写协调代码

---

## 后续步骤 {#next-steps}

- **本地试用：** 运行 `pip install hindsight-all hindsight-openai-agents openai-agents`，然后执行上面的示例
- **使用 Hindsight Cloud：** 注册[免费账户](https://ui.hindsight.vectorize.io)，跳过自托管
- **快速入门：** 按照[开发者快速入门](/developer/api/quickstart)，几分钟内启动 Hindsight 服务器
- **探索食谱：** 查看[不同智能体框架的记忆模式](/cookbook)
- **其他集成：** [AutoGen](/sdks/integrations/autogen)、[LlamaIndex](/sdks/integrations/llamaindex)、[LangGraph](/sdks/integrations/langgraph)、[Pydantic AI](/sdks/integrations/pydantic-ai) 和 [CrewAI](/sdks/integrations/crewai)
