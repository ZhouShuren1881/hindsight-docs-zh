---
title: "为 LangGraph 和 LangChain 智能体添加长期记忆"
description: 了解如何通过工具、节点和 BaseStore 三种集成模式，为 LangGraph 和 LangChain 智能体添加长期记忆，并实现按用户划分的记忆库和语义召回。
authors: [DK09876]
date: 2026-03-24T12:00
tags: [langgraph, langchain, integrations, agents, memory, tutorial]
image: /img/blog/langgraph-longterm-memory.webp
hide_table_of_contents: true
---

![为 LangGraph 和 LangChain 智能体添加长期记忆](/img/blog/langgraph-longterm-memory.webp)

LangGraph 智能体天生是有状态的：检查点保存器会在步骤之间保存图状态，Store API 则会跨线程持久化数据。但这两者都无法为智能体提供真正的长期记忆，也就是从对话中提取含义、随时间积累知识，并在相关时进行语义召回的能力。

Hindsight 正是为此而来。Hindsight 是面向 LLM 应用的记忆层，可以自动从对话中提取事实、构建实体图，并通过四种并行召回策略检索相关上下文。`hindsight-langgraph` 包将这套能力带入 LangGraph。由于记忆工具采用标准的 LangChain `@tool` 函数，它们也能用于普通 LangChain。

<!-- truncate -->

## 问题 {#the-problem}

LangGraph 内置的持久化机制面向图状态设计，包括检查点、中间值以及跨线程键值存储。它擅长回答“这张图上次做了什么？”，却无法回答“这个智能体了解这个用户的哪些信息？”。

设想一个支持智能体，它会在数十次会话中与同一位客户交流。仅使用检查点保存器时，每个新线程都要从零开始。使用 `InMemoryStore` 或 `PostgresStore` 时，你可以手动存储和检索事实，但以下工作都得由你负责：

- 决定存储哪些内容（事实提取）
- 判断哪些内容相关（语义检索）
- 处理矛盾和更新
- 从原始对话中构建知识图谱

Hindsight 会自动完成这些工作。你存入对话后，它会提取事实、构建实体图，并通过四种并行策略检索相关记忆：**语义检索**（嵌入向量相似度）、**BM25**（关键词重合度）、**图遍历**（实体关系）和**时间检索**（近期性加权）。每种策略各有所长：语义检索能找到概念相近的记忆，图遍历能找到通过共享实体关联的记忆，时间加权则会优先呈现近期上下文，再呈现较早的事实。它们结合起来，效果显著优于单一策略的检索。

## 三种集成模式 {#three-integration-patterns}

我们提供了三种抽象层级不同的方式，可将 Hindsight 记忆集成到 LangGraph 中。

### 1. 工具：由智能体决定（LangChain 和 LangGraph） {#1-tools--the-agent-decides-langchain--langgraph}

向智能体提供存入、召回和反思工具，让它自行决定何时使用记忆。这些工具采用标准的 LangChain `@tool` 函数，因此既适用于 LangGraph（通过 `create_react_agent`），也适用于普通 LangChain（通过 `bind_tools()`）。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_hindsight_tools
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

client = Hindsight(base_url="http://localhost:8888")
tools = create_hindsight_tools(client=client, bank_id="user-123")

# 使用 LangGraph
agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools=tools)

# 或使用普通 LangChain
model = ChatOpenAI(model="gpt-4o").bind_tools(tools)
```

智能体会获得三个工具：

- **`hindsight_retain`** — 存储对话，并从中提取事实
- **`hindsight_recall`** — 在记忆库中搜索相关上下文
- **`hindsight_reflect`** — 综合多条记忆，生成摘要或回答有关智能体所知内容的问题（例如“这个用户告诉过我哪些关于其技术栈的信息？”）

智能体会根据对话上下文调用这些工具：用户分享重要信息时存储事实，被问及过去的上下文时召回记忆，需要综合累积的知识时进行反思。

**适用场景**：适合需要判断何时使用记忆的 ReAct 智能体。若使用 LangGraph，可自动执行工具调用循环；若使用普通 LangChain，则由你自行管理循环。

### 2. 节点：将记忆作为图步骤 {#2-nodes--memory-as-graph-steps}

将召回和存入操作设为图中的自动节点。无需调用工具，记忆处理会在每一轮运行。

```python
from hindsight_langgraph import create_recall_node, create_retain_node
from langgraph.graph import StateGraph, MessagesState, START, END

recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)
builder.add_node("retain", retain)
builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)
```

召回节点会在 LLM 运行前执行，在 Hindsight 中搜索与用户消息相关的记忆，并将其作为 `SystemMessage` 注入。随后，存入节点会存储这段对话。运行时，两者都会从 `RunnableConfig` 中解析每位用户对应的记忆库 ID。

**适用场景**：适合希望始终自动注入记忆上下文，而不依赖 LLM 决定何时使用记忆工具的智能体。

### 3. BaseStore：即插即用的后端 {#3-basestore--drop-in-backend}

以 Hindsight 作为存储后端，替换 LangGraph 的 `InMemoryStore`。如果团队已经采用 LangGraph 的 store 模式，这是迁移成本最低的方式。

```python
from hindsight_langgraph import HindsightStore

store = HindsightStore(client=client)
graph = builder.compile(checkpointer=checkpointer, store=store)
```

命名空间元组会映射到 Hindsight 记忆库 ID（`("user", "123")` → 记忆库 `user.123`），记忆库会自动创建；`search()` 使用 Hindsight 完整的语义召回能力，而非基础的向量相似度搜索。

**适用场景**：适合已经使用 LangGraph `store` 模式、希望提升检索效果且不想重构图的团队。

---

### 哪种模式适合你的用例？ {#which-pattern-fits-your-use-case}

| | 工具 | 节点 | BaseStore |
|---|---|---|---|
| 适用于普通 LangChain | 是 | 否 | 否 |
| 自动运行记忆处理 | 否（由 LLM 决定） | 是 | 是 |
| 使用现有的存储接口 | 否 | 否 | 是 |
| LLM 决定何时存入记忆 | 是 | 否 | 否 |
| 最低迁移成本 | — | 低 | 最低 |

---

## 完整可运行示例 {#complete-working-example}

下面是一个完整的支持智能体示例，采用节点模式，在多个会话之间记住每位用户的信息。你可以直接复制并运行，适用于自托管 Hindsight 或 Hindsight Cloud。

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_langgraph import create_recall_node, create_retain_node
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import MemorySaver

# --- 初始化 ---

client = Hindsight(base_url="http://localhost:8888")
# 使用 Hindsight Cloud 时：
# client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="...")

llm = ChatOpenAI(model="gpt-4o")
checkpointer = MemorySaver()

# --- 记忆节点 ---
# bank_id_from_config 会在运行时从 RunnableConfig 获取用户 ID，
# 因此，一个图定义就能为所有用户提供相互隔离的记忆库。

recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

# --- 智能体节点 ---

async def agent_node(state: MessagesState):
    system = SystemMessage(content=(
        "You are a helpful support agent. "
        "Relevant memories about this user have been injected above. "
        "Use them to personalize your response."
    ))
    response = await llm.ainvoke([system] + state["messages"])
    return {"messages": [response]}

# --- 图 ---

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)
builder.add_node("retain", retain)
builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)

graph = builder.compile(checkpointer=checkpointer)

# --- 运行 ---

async def chat(user_id: str, thread_id: str, message: str):
    config = {
        "configurable": {
            "user_id": user_id,
            "thread_id": thread_id,
        }
    }
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=message)]},
        config=config,
    )
    return result["messages"][-1].content


async def main():
    # 会话 1：用户分享上下文
    print("Session 1")
    print(await chat("user-42", "thread-1", "Hi! I'm running into issues with our Postgres connection pool. We're on SQLAlchemy 2.0."))
    print(await chat("user-42", "thread-1", "We're using async sessions with asyncpg. The pool keeps exhausting under load."))

    # 会话 2：新线程，同一用户，智能体能记住之前的信息
    print("\nSession 2 (new thread)")
    print(await chat("user-42", "thread-2", "Hey, back again. Still fighting the connection pool issue."))
    # 智能体会回想起 SQLAlchemy 2.0、asyncpg 以及连接池耗尽的情况，
    # 用户无需重新说明这些信息。


asyncio.run(main())
```

Hindsight 从会话 1 中提取并存入 `user-42` 记忆库的内容：

```
- Uses SQLAlchemy 2.0 with async sessions
- Uses asyncpg driver
- Experiencing connection pool exhaustion under load
- Running Postgres
```

会话 2 在新线程中开始时，召回节点会在记忆库中搜索与“Still fighting the connection pool issue”相关的上下文，并在 LLM 回复前将这些事实作为 `SystemMessage` 注入。智能体就能从上次会话结束的地方接着交流。

---

## 一行代码实现按用户划分记忆 {#per-user-memory-in-one-line}

三种模式都支持动态记忆库 ID。无需将记忆库 ID 写死，只需在运行时从图的配置中解析：

```python
recall = create_recall_node(client=client, bank_id_from_config="user_id")

# 每次调用都会使用各自隔离的记忆库
await graph.ainvoke(
    {"messages": [...]},
    config={"configurable": {"user_id": "user-456"}},
)
```

一个图定义即可服务所有用户。记忆库会自动创建，并保持彼此完全隔离。

## 开始使用 {#getting-started}

```bash
pip install hindsight-langgraph
```

自托管 Hindsight 和 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 均可使用此集成。使用云服务时，在创建客户端时传入 API 密钥：

```python
client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="your-key")
# 或
from hindsight_client import configure
configure(api_key="your-key")  # 默认使用云端 URL
```

## 可以用它构建什么？ {#what-to-build-with-this}

长期记忆让智能体能够实现另一类行为。以下是一些实践效果不错的模式：

- **支持智能体**：跨会话记住每位客户的历史、偏好和以往问题
- **销售助理**：通过多次互动逐步积累潜在客户的上下文
- **个人效率智能体**：逐步建立对用户工作方式、优先事项和决策的认知模型

在这三种场景中，智能体运行得越久，表现就会越好。这不仅是因为上下文窗口更长，还因为 Hindsight 会将对话提炼为结构化知识，并在相关时准确检索。

完整文档：[LangGraph 集成](/sdks/integrations/langgraph) | [GitHub](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/langgraph)
