---
sidebar_position: 7
title: "使用 Hindsight 为 LangGraph 和 LangChain 提供持久记忆"
description: "通过 Hindsight 为 LangGraph 和 LangChain 智能体添加长期记忆。介绍工具、节点和 BaseStore 适配器三种集成模式，让记忆在多次智能体运行之间持久保存。"
---

# LangGraph / LangChain {#langgraph--langchain}

通过 Hindsight 为 [LangGraph](https://langchain-ai.github.io/langgraph/) 和 [LangChain](https://python.langchain.com/) 智能体提供持久的长期记忆。这里介绍三种抽象层级不同的集成模式：工具模式同时适用于 LangChain 和 LangGraph，节点和 BaseStore 适配器则专用于 LangGraph。

[查看更新日志 →](/changelog/integrations/langgraph)

## 功能 {#features}

- **记忆工具** — 将 Retain（存入）、Recall（召回）和 Reflect（反思）封装为 LangChain `@tool` 函数，可与 `bind_tools()` 和 `ToolNode` 配合使用。**LangChain 和 LangGraph 均支持**，此模式无需依赖 LangGraph。
- **图节点**（LangGraph）— 预构建节点，可在调用 LLM 前自动注入记忆，并在收到响应后自动存入记忆。
- **BaseStore 适配器**（LangGraph）— 由 Hindsight 提供后端支持、可直接替换使用的 `BaseStore` 实现，适用于 LangGraph 的原生记忆模式。
- **动态记忆库** — 从 `RunnableConfig` 中按请求解析记忆库 ID，为每位用户使用各自的记忆。
- **原生异步** — 直接使用 `aretain`、`arecall`、`areflect`，无需通过线程池绕行。

## 安装 {#installation}

```bash
pip install hindsight-langgraph
```

## 快速入门：工具（LangChain 和 LangGraph） {#quick-start-tools-langchain--langgraph}

工具模式会创建标准的 LangChain `@tool` 函数，可通过 `bind_tools()` 与任何兼容 LangChain 的模型配合使用。你可以在 LangGraph 智能体中使用这些工具，也可以只使用 LangChain，无需安装 LangGraph。

**使用 LangGraph（推荐）：**

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_hindsight_tools
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

client = Hindsight(base_url="http://localhost:8888")
tools = create_hindsight_tools(client=client, bank_id="user-123")

agent = create_react_agent(ChatOpenAI(model="gpt-4o"), tools=tools)

result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "Remember that I prefer dark mode"}]}
)
```

**只使用 LangChain：**

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_hindsight_tools
from langchain_openai import ChatOpenAI

client = Hindsight(base_url="http://localhost:8888")
tools = create_hindsight_tools(client=client, bank_id="user-123")

model = ChatOpenAI(model="gpt-4o").bind_tools(tools)
response = await model.ainvoke("Remember that I prefer dark mode")
```

只使用 LangChain 时，你需要自行处理工具执行循环：调用模型、检查 `tool_calls`、执行工具，再把结果反馈给模型。LangGraph 会自动完成这个循环。

智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆。
- **`hindsight_recall`** — 在长期记忆中检索相关事实。
- **`hindsight_reflect`** — 综合记忆并推理，生成合理的答案。

## 快速入门：记忆节点（LangGraph） {#quick-start-memory-nodes-langgraph}

将 Recall 和 Retain 节点添加到图中，即可自动注入和存储记忆。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_recall_node, create_retain_node
from langgraph.graph import StateGraph, MessagesState, START, END

client = Hindsight(base_url="http://localhost:8888")

recall = create_recall_node(client=client, bank_id="user-123")
retain = create_retain_node(client=client, bank_id="user-123")

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)  # 你的 LLM 节点
builder.add_node("retain", retain)

builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)

graph = builder.compile()
```

Recall 节点会提取最新的用户消息，在 Hindsight 中检索，并将匹配的记忆作为 `SystemMessage` 注入。响应返回后，Retain 节点会存入人类消息（也可选择同时存入 AI 消息）。

## 快速入门：BaseStore（LangGraph） {#quick-start-basestore-langgraph}

将 Hindsight 用作 LangGraph `BaseStore`，即可通过语义检索实现跨线程持久记忆。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import HindsightStore

client = Hindsight(base_url="http://localhost:8888")
store = HindsightStore(client=client)

graph = builder.compile(checkpointer=checkpointer, store=store)

# 通过 store API 存储和检索
await store.aput(("user", "123", "prefs"), "theme", {"value": "dark mode"})
results = await store.asearch(("user", "123", "prefs"), query="theme preference")
```

命名空间元组会以 `.` 为分隔符映射为 Hindsight 记忆库 ID（例如，`("user", "123")` 会映射为记忆库 `user.123`）。首次访问时会自动创建记忆库。

## 动态记忆库 ID {#dynamic-bank-ids}

节点和存储器都支持从 `RunnableConfig` 中按用户解析记忆库：

```python
recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

# 在运行时从 config 解析记忆库 ID
result = await graph.ainvoke(
    {"messages": [{"role": "user", "content": "hello"}]},
    config={"configurable": {"user_id": "user-456"}},
)
```

## 选择工具 {#selecting-tools}

只启用你需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 省略 Reflect 工具
)
```

## 全局配置 {#global-configuration}

你可以配置一次，而不必在每次调用时都传入客户端：

```python
from hindsight_langgraph import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # Recall 时用于筛选的标签
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

# 现在可以不传入客户端来创建工具；此时会使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## Retain 节点选项 {#retain-node-options}

```python
retain = create_retain_node(
    client=client,
    bank_id="user-123",
    retain_human=True,    # 存入人类消息（默认值：True）
    retain_ai=False,      # 存入 AI 响应（默认值：False）
    tags=["source:chat"], # 应用于所存记忆的标签
)
```

## Recall 节点选项 {#recall-node-options}

```python
recall = create_recall_node(
    client=client,
    bank_id="user-123",
    budget="low",          # Recall 预算：low/mid/high
    max_results=10,        # 注入记忆的最大数量
    max_tokens=4096,       # Recall 的最大 token 数
    tags=["scope:user"],   # 按标签筛选
    tags_match="all",      # 标签匹配模式
)
```

### 使用 `output_key` 控制提示词 {#using-output_key-for-prompt-control}

默认情况下，Recall 节点会将 `SystemMessage` 追加到 `messages`。使用 `output_key` 可将记忆文本写入自定义状态字段，从而完全控制提示词中的内容顺序：

```python
from typing import Optional
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    memory_context: Optional[str] = None

recall = create_recall_node(
    client=client,
    bank_id="user-123",
    output_key="memory_context",
)

# 在智能体节点中读取 state["memory_context"]，并将其前置
# 到系统提示词中，再调用模型。
```

## 限制和注意事项 {#limitations-and-notes}

### HindsightStore {#hindsightstore}

- **仅支持异步。** 所有同步方法（`batch`、`get`、`put`、`delete`、`search`、`list_namespaces`）都会抛出 `NotImplementedError`。请改用异步版本（`abatch`、`aget`、`aput`、`adelete`、`asearch`、`alist_namespaces`）。
- **`get()` 依赖 Recall。** 不支持直接按键查找：键会被用作 Recall 查询，且只返回 `document_id` 完全匹配的项目。未排入 Recall 结果前列的项目可能看起来像是缺失了。
- **`list_namespaces` 仅限当前会话。** 它只跟踪当前进程中通过 `aput()` 写入过的命名空间。进程重启后，即使 Hindsight 中仍有数据，`list_namespaces` 也会返回空结果。
- **`delete` 不执行任何操作。** 调用 `adelete()` 只会记录一条调试消息，不会从 Hindsight 删除数据。Hindsight 的记忆模型以追加为主；新事实会在 Retain 过程中自动取代旧事实。

### 记忆节点 {#memory-nodes}

- **SystemMessage 的顺序。** Recall 节点会添加一条包含召回记忆的 `SystemMessage`。由于 `MessagesState` 使用会追加消息的 `add_messages`，这条消息会出现在现有消息之后，而不是位于索引 0。该消息使用稳定 ID（`hindsight_memory_context`），因此每次调用都会更新它，而不会重复添加。如果你的 LLM 服务提供方要求系统消息位于最前面，请在智能体节点中先对消息排序或筛选，再传给模型。

### 错误处理 {#error-handling}

- **工具**在失败时会抛出 `HindsightError`，智能体会将其作为工具错误接收。
- **节点**会静默记录错误并返回空消息，因此 Hindsight 服务中断不会导致图崩溃。

## API 参考 {#api-reference}

### `create_hindsight_tools()` {#create_hindsight_tools}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `"mid"` | Recall/Reflect 的预算级别（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存储记忆时应用的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式（any/all/any\_strict/all\_strict） |
| `retain_metadata` | `None` | Retain 操作的默认元数据字典 |
| `retain_document_id` | `None` | Retain 操作的默认 document\_id（用于对记忆分组或执行插入/更新） |
| `recall_types` | `None` | 要筛选的事实类型（world、experience、observation） |
| `recall_include_entities` | `False` | 是否在 Recall 结果中包含实体信息 |
| `reflect_context` | `None` | Reflect 操作的附加上下文 |
| `reflect_max_tokens` | `None` | Reflect 结果的最大 token 数（默认使用 `max_tokens`） |
| `reflect_response_schema` | `None` | 用于约束 Reflect 输出格式的 JSON 模式 |
| `reflect_tags` | `None` | 筛选 Reflect 所用记忆的标签（默认使用 `recall_tags`） |
| `reflect_tags_match` | `None` | Reflect 的标签匹配模式（默认使用 `recall_tags_match`） |
| `include_retain` | `True` | 是否包含 Retain（存入）工具 |
| `include_recall` | `True` | 是否包含 Recall（检索）工具 |
| `include_reflect` | `True` | 是否包含 Reflect（综合生成）工具 |

### `create_recall_node()` {#create_recall_node}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | `None` | 静态记忆库 ID（或使用 `bank_id_from_config`） |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `"mid"` | Recall 预算级别 |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `max_results` | `10` | 最多注入的记忆数 |
| `tags` | `None` | 用于筛选 Recall 结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |
| `bank_id_from_config` | `"user_id"` | 运行时用于解析记忆库 ID 的配置键 |
| `output_key` | `None` | 设置后，将记忆文本写入此状态键，而不将 `SystemMessage` 追加到 `messages` |

### `create_retain_node()` {#create_retain_node}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | `None` | 静态记忆库 ID（或使用 `bank_id_from_config`） |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `tags` | `None` | 应用于所存记忆的标签 |
| `bank_id_from_config` | `"user_id"` | 运行时用于解析记忆库 ID 的配置键 |
| `retain_human` | `True` | 是否存入人类消息 |
| `retain_ai` | `False` | 是否存入 AI 响应 |

### `HindsightStore()` {#hindsightstore-1}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `tags` | `None` | 应用于所有 Retain 操作的标签 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | 生产环境 API | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份认证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | Recall 时用于筛选的默认标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 是否启用详细日志 |

## 环境要求 {#requirements}

- Python >= 3.10
- langchain-core >= 0.3.0
- hindsight-client >= 0.4.0
- langgraph >= 0.3.0（仅节点和存储模式需要；请使用 `pip install hindsight-langgraph[langgraph]` 安装）
