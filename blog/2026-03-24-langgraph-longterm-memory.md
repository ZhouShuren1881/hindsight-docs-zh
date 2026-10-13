---
title: "为LangGraph和LangChain智能体添加长期记忆"
description: "学习如何使用三种集成模式（工具、节点和BaseStore）将长期记忆添加到LangGraph和LangChain智能体中，以及每用户记忆、记忆库和语义记忆召回。"
authors: [DK09876]
date: 2026-03-24T12:00
tags: [langgraph, langchain, integrations, agents, memory, tutorial]
image: /img/blog/langgraph-longterm-memory.webp
hide_table_of_contents: true
---

![为LangGraph和LangChain智能体添加长期记忆](/img/blog/langgraph-longterm-memory.webp)

LangGraph 智能体在设计上是有状态的——检查点在步骤之间保存图形状态，而 Store API 跨线程保存数据。但这两者都不能给智能体带来真正的长期记忆：从对话中提取意义、随着时间的推移积累知识以及在相关时在语义上记忆的能力。

这就是Hindsight添加的内容。 Hindsight 是LLM 应用程序的记忆层，可自动从对话中提取事实、构建实体图并使用四种并行记忆召回策略检索相关上下文。 `hindsight-langgraph` 包将其带到了 LangGraph — 并且由于记忆工具是标准 LangChain `@tool` 功能，因此它们也可以与普通 LangChain 一起使用。

<!-- truncate -->

## 问题 {#the-problem}

LangGraph的内置持久性是为图状态设计的——检查点、中间值、跨线程键值存储。它擅长“这张图上次做了什么？”但不是“这个智能体对这个用户了解什么？”

考虑一个支持智能体，它可以在数十个会话中与同一客户交谈。仅使用检查指针，每个新线程都会冷启动。使用 `InMemoryStore` 或 `PostgresStore`，您可以手动存储和检索事实，但您负责：

- 决定存储什么（事实提取）
- 决定相关内容（语义检索）
- 处理矛盾和更新
- 从原始对话构建知识图

Hindsight 自动完成所有这些。你记忆存储对话，它提取事实，构建实体图，并使用四种并行策略检索相关记忆：**语义**（嵌入相似性）、**BM25**（关键词重叠）、**图遍历**（实体关系）和**时间检索**（新近度加权）。每种策略捕捉不同的事物——语义记忆识别找到概念上相似的记忆，图遍历找到通过共享实体链接的记忆，时间加权在旧事实之前显示最近的上下文。它们一起大大优于单一策略检索。

## 三种集成模式 {#three-integration-patterns}

我们构建了三种方法，在不同的抽象级别将Hindsight记忆添加到LangGraph。

### 1。工具——智能体决定（LangChain & LangGraph） {#1-tools--the-agent-decides-langchain--langgraph}

给予智能体记忆存储/记忆召回/反思工具，让它决定何时使用记忆。这些是标准 LangChain `@tool` 函数，因此它们可以与 LangGraph（通过 `create_react_agent`）和普通 LangChain（通过 `bind_tools()`）配合使用。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_hindsight_tools
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

client = Hindsight(base_url="http://localhost:8888")
tools = create_hindsight_tools(client=client, bank_id="user-123")

#与 LangGraph
agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools=tools)

#或使用普通 LangChain
model = ChatOpenAI(model="gpt-4o").bind_tools(tools)
```

智能体拥有三个工具：

- **`hindsight_retain`** — 存储对话并从中提取事实
- **`hindsight_recall`** — 在记忆库中搜索相关上下文
- **`hindsight_reflect`** — 综合多个记忆以生成摘要或回答有关智能体知道什么的问题（对于诸如“该用户告诉我有关他们的堆栈的什么？”之类的问题很有用）

智能体根据对话上下文调用这些内容——当用户分享重要内容时存储事实，当被问及过去的上下文时回忆，并在需要综合积累的知识时进行反思。

**最适合**：ReAct 智能体，需要推理记忆何时相关。与 LangGraph 一起使用以实现自动工具执行循环，或者如果您自己管理循环，则与普通 LangChain 一起使用。

### 2。节点——记忆为图形步骤 {#2-nodes--memory-as-graph-steps}

将记忆召回和记忆存储添加为图中的自动节点。无需调用工具——记忆每回合都会运行。

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

记忆召回节点在LLM之前运行，在Hindsight中搜索与用户消息相关的记忆，并将它们作为`SystemMessage`注入。记忆存储节点随后运行，存储对话。两者都在运行时解析来自 `RunnableConfig` 的每个用户记忆库 ID。

**最适合**：您始终希望自动注入记忆上下文的智能体，而不依赖于LLM来决定何时使用记忆工具。

### ​​3。 BaseStore — 嵌入式后端 {#3-basestore--drop-in-backend}

将LangGraph的`InMemoryStore`替换为Hindsight作为存储后端。如果您的团队已经使用LangGraph的存储模式，这是摩擦力最低的路径。

```python
from hindsight_langgraph import HindsightStore

store = HindsightStore(client=client)
graph = builder.compile(checkpointer=checkpointer, store=store)
```

命名空间元组映射到Hindsight记忆库ID（`("user", "123")`→记忆库`user.123`），记忆库是自动创建的，`search()`使用Hindsight的完整语义记忆召回而不是基本向量相似性。

**最适合**：已经使用LangGraph的`store`模式的团队希望在不重构图表的情况下获得更好的检索效果。

---

### 哪种模式适合您的用例？ {#which-pattern-fits-your-use-case}

||工具|节点|基地存储|
|---|---|---|---|
|适用于普通 LangChain|是的|否|否|
|记忆自动运行|否（LLM决定）|是的|是的|
|使用现有的存储界面|否|否|是的|
|LLM 控制何时记住|是的|否|否|
|最低迁移成本|—|低|最低|

---

## 完整的工作示例 {#complete-working-example}

这是一个完全支持的智能体，它使用节点模式记住跨会话的每个用户。这是可复制粘贴的，并且可在自托管 Hindsight 或 Hindsight Cloud上运行。

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_langgraph import create_recall_node, create_retain_node
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import MemorySaver

# --- Setup ---

client = Hindsight(base_url="http://localhost:8888")
#对于Hindsight Cloud：
# client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="...")

llm = ChatOpenAI(model="gpt-4o")
checkpointer = MemorySaver()

#--- 记忆节点 ---
#bank_id_from_config 在运行时从 RunnableConfig 中获取用户 ID，
#因此，一个图定义可以为所有用户提供独立的记忆库。

recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

#--- 智能体节点 ---

async def agent_node(state: MessagesState):
    system = SystemMessage(content=(
        "你是一个有帮助的支持智能体。"
        "上面已经注入了关于该用户的相关记忆。"
        "使用它们来个性化您的回答。"
    ))
    response = await llm.ainvoke([system] + state["messages"])
    return {"messages": [response]}

# --- Graph ---

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)
builder.add_node("retain", retain)
builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)

graph = builder.compile(checkpointer=checkpointer)

# --- Run ---

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
    #会话 1：用户共享上下文
    print("Session 1")
    print(await chat("user-42", "thread-1", "嗨！我的 Postgres 连接池遇到问题。我们使用的是 SQLAlchemy 2.0。"))
    print(await chat("user-42", "thread-1", "我们正在使用 asyncpg 的异步会话。泳池在负载下不断耗尽。"))

    #第 2 节：新线程，同一用户 — 智能体记得
    print("\nSession 2 (new thread)")
    print(await chat("user-42", "thread-2", "嘿，又回来了。仍在解决连接池问题。"))
    #智能体回顾 SQLAlchemy 2.0、asyncpg 和池耗尽上下文
    #，用户不必重复自己的话。


asyncio.run(main())
```

Hindsight从会话1中提取并存储在`user-42`记忆库中的内容：

```
- Uses SQLAlchemy 2.0 with async sessions
- Uses asyncpg driver
- Experiencing connection pool exhaustion under load
- Running Postgres
```

当会话 2 在新线程上启动时，记忆召回节点会在记忆库中搜索与“仍在与连接池问题作斗争”相关的上下文，并在 LLM 响应之前将这些事实作为 `SystemMessage` 注入。智能体准确地拾取上次会话结束的位置。

---

## 每用户一行记忆 {#per-user-memory-in-one-line}

所有三种模式都支持动态记忆库ID。不要对记忆库进行硬编码，而是在运行时从图形的配置中解析它：

```python
recall = create_recall_node(client=client, bank_id_from_config="user_id")

#每次调用都有自己独立的记忆库
await graph.ainvoke(
    {"messages": [...]},
    config={"configurable": {"user_id": "user-456"}},
)
```

一个图定义服务于所有用户。 记忆库是自动创建的，并保持完全隔离。

## 开始使用 {#getting-started}

```bash
pip install hindsight-langgraph
```

可与自托管的Hindsight和[Hindsight Cloud](https://ui.hindsight.vectorize.io)配合使用。对于云，在创建客户端时传递您的 API 密钥：

```python
client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="your-key")
# or
from hindsight_client import configure
configure(api_key="your-key")  #默认为云端 URL
```

## 用这个构建什么 {#what-to-build-with-this}

长期记忆解锁了不同类别的智能体行为。我们发现一些行之有效的模式：

- **支持智能体** 记住每个客户的历史记录、偏好和跨会话的过去问题
- **销售助理** 通过多个接触点积累有关潜在客户的背景信息
- **个人生产力智能体** 建立用户工作方式、优先级和决策的模型

在所有这三种情况下，智能体运行的时间越长，性能就会变得越好——不仅仅是因为上下文窗口更长，还因为Hindsight将对话提炼成结构化知识，它可以在相关时精确检索。

完整文档：[LangGraph集成](/sdks/integrations/langgraph) | [GitHub](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/langgraph)
