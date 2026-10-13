---
sidebar_position: 7
title: "LangGraph & LangChain 持久记忆Hindsight"
description: "为LangGraph和浪链智能体添加Hindsight长期记忆。三种集成模式——工具、节点和 BaseStore 适配器——用于跨智能体运行持久记忆。"
---

# LangGraph / 浪链 {#langgraph--langchain}

持久的长期记忆[LangGraph](https://langchain-ai.github.io/langgraph/) 和 [LangChain](https://python.langchain.com/)智能体，通过 Hindsight 提供记忆。不同抽象级别的三种集成模式——工具模式适用于 LangChain 和LangGraph，而节点和 BaseStore 适配器是LangGraph特定。

[查看更新日志 →](/changelog/integrations/langgraph)

## 功能 {#features}

- **记忆工具** — 记忆存储、记忆召回和反思作为 LangChain `@tool` 兼容功能 `bind_tools()` 和 `ToolNode`。与 一起使用 **LangChain 与 LangGraph 均支持** — 没有  此模式所需的LangGraph依赖关系。
- **图节点***(LangGraph)*— 预先构建的节点，可在之前自动注入记忆LLM呼叫并响应后自动存储
- **BaseStore 适配器***(LangGraph)*— 插入 `BaseStore` 实施支持Hindsight，对于LangGraph的原生记忆模式
- **动态记忆库** — 解析来自 的每个请求的记忆库 ID `RunnableConfig` 每个用户记忆
- **原生异步** — 使用 直接 `aretain`，`arecall`，`areflect` — 无线程池解决方法

## 安装 {#installation}

```bash
pip install hindsight-langgraph
```

## 快速入门：工具（LangChain & LangGraph） {#quick-start-tools-langchain--langgraph}

工具模式创建标准LangChain `@tool` 可通过 与任何 LangChain 兼容模型配合使用的功能 `bind_tools()`。您可以将它们与LangGraph智能体或普通 LangChain — 否  需要LangGraph。

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
    {"messages": [{"role": "user", "content": "记住我更喜欢深色模式"}]}
)
```

**仅使用 LangChain：**

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_hindsight_tools
from langchain_openai import ChatOpenAI

client = Hindsight(base_url="http://localhost:8888")
tools = create_hindsight_tools(client=client, bank_id="user-123")

model = ChatOpenAI(model="gpt-4o").bind_tools(tools)
response = await model.ainvoke("记住我更喜欢深色模式")
```

使用普通 LangChain 时，您自己处理工具执行循环 - 调用模型，检查 `tool_calls`，执行它们，并反馈结果。LangGraph为您自动执行此循环。

智能体拥有三个可以调用的工具：

- **`hindsight_retain`** — 将信息存储到长期记忆中
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆合成一个合理的答案

## 快速入门：记忆节点 (LangGraph) {#quick-start-memory-nodes-langgraph}

将记忆召回和记忆存储节点添加到您的图表中，以实现自动记忆注入和存储。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_recall_node, create_retain_node
from langgraph.graph import StateGraph, MessagesState, START, END

client = Hindsight(base_url="http://localhost:8888")

recall = create_recall_node(client=client, bank_id="user-123")
retain = create_retain_node(client=client, bank_id="user-123")

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)  #你的LLM节点
builder.add_node("retain", retain)

builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)

graph = builder.compile()
```

记忆召回节点提取最新的用户消息，搜索Hindsight，并注入匹配的记忆作为`SystemMessage`。记忆存储节点存储人类消息（可选  回复后也有AI消息）。

## 快速入门：BaseStore (LangGraph) {#quick-start-basestore-langgraph}

使用Hindsight作为LangGraph`BaseStore` 用于带有语义搜索的跨线程持久记忆。

```python
from hindsight_client import Hindsight
from hindsight_langgraph import HindsightStore

client = Hindsight(base_url="http://localhost:8888")
store = HindsightStore(client=client)

graph = builder.compile(checkpointer=checkpointer, store=store)

#通过存储存储和搜索API
await store.aput(("user", "123", "prefs"), "theme", {"value": "深色模式"})
results = await store.asearch(("user", "123", "prefs"), query="主题偏好")
```

命名空间元组映射到Hindsight记忆库 ID 带有 `.` 作为分隔符（例如，`("user", "123")` 成为记忆库`user.123`）。 记忆库是在第一次访问时自动创建的。

## 动态记忆库ID {#dynamic-bank-ids}

节点和存储都支持的每用户记忆库分辨率 `RunnableConfig`：

```python
recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

#记忆库 ID 在运行时从配置解析
result = await graph.ainvoke(
    {"messages": [{"role": "user", "content": "hello"}]},
    config={"configurable": {"user_id": "user-456"}},
)
```

## 选择工具 {#selecting-tools}

仅包含您需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  #省略反思工具
)
```

## 全局配置 {#global-configuration}

不要将客户端传递给每个调用，而是配置一次：

```python
from hindsight_langgraph import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 记忆召回预算：low/mid/high
    max_tokens=4096,               #记忆结果的最大 token 数数
    tags=["env:prod"],             #存储记忆的标签
    recall_tags=["scope:global"],  #要过滤的标签 记忆召回
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

#现在无需传递客户端即可创建工具 - 使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## 记忆存储节点选项 {#retain-node-options}

```python
retain = create_retain_node(
    client=client,
    bank_id="user-123",
    retain_human=True,    #存储人类消息（默认值：True）
    retain_ai=False,      #存储 AI 响应（默认值：False）
    tags=["source:chat"], #应用于存储记忆的标签
)
```

## 记忆召回节点选项 {#recall-node-options}

```python
recall = create_recall_node(
    client=client,
    bank_id="user-123",
    budget="low",          # 记忆召回预算：low/mid/high
    max_results=10,        #注入最大记忆量
    max_tokens=4096,       #记忆召回的最大 token 数
    tags=["scope:user"],   #按标签过滤
    tags_match="all",      #标签匹配模式
)
```

### 使用`output_key` 用于即时控制 {#using-outputkey-for-prompt-control}

默认情况下，记忆召回节点附加一个`SystemMessage`至`messages`。使用 `output_key` 将记忆文本写入自定义状态字段，让您完全控制提示排序：

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

#在您的智能体节点中，读取 state["memory_context"] 并将其添加到前面
#调用模型前的系统提示。
```

## 限制和注意事项 {#limitations-and-notes}

### HindsightStore {#hindsightstore}

- **仅支持异步。** 所有同步方法 (`batch`，`get`，`put`，`delete`，`search`，`list_namespaces`) 提高`NotImplementedError`。使用异步变体 (`abatch`，`aget`，`aput`，`adelete`，`asearch`，`alist_namespaces`）。
- **`get()` 依赖记忆召回。** 没有直接的键查找——键被用作记忆召回查询并且只有精确的 `document_id` 返回匹配项。未在记忆召回结果中排名靠前的项目可能会出现缺失。
- **`list_namespaces` 限定在会话作用域内。** 它仅跟踪已通过 写入的命名空间 当前过程中 `aput()`。重启后`list_namespaces` 返回空，即使数据仍然存在于Hindsight。
- **`delete` 不执行任何操作。** 打电话`adelete()` 记录调试消息，但不删除其中的数据Hindsight。Hindsight的记忆模型是面向追加的；事实取代是在记忆存储过程中自动处理的。

### 记忆节点 {#memory-nodes}

- **SystemMessage 的排列顺序。** 记忆召回节点增加了一个`SystemMessage` 回忆起来。因为`MessagesState` 使用 `add_messages`（追加），该消息出现在现有消息之后而不是位置 0。该消息有一个稳定的 ID（`hindsight_memory_context`)，因此它会被更新，而不是在调用之间重复。如果你的LLM提供程序首先需要系统消息，在将消息传递给模型之前对智能体节点中的消息进行排序或过滤。

### 错误处理 {#error-handling}

- **工具**提高`HindsightError` 失败，这在智能体上表现为工具错误。
- **节点** 默默地记录错误并返回空消息，因此Hindsight中断不会使您的图表崩溃。

## API参考 {#api-reference}

### `create_hindsight_tools()` {#createhindsighttools}

|参数|默认|说明|
|---|---|---|
|`bank_id`|*必填*|Hindsight记忆库ID|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`budget`|`"mid"`|记忆召回与反思的预算级别 (low/mid/high)|
|`max_tokens`|`4096`|记忆召回结果的最大 token 数|
|`tags`|`None`|存储记忆时应用的标签|
|`recall_tags`|`None`|搜索时要过滤的标签|
|`recall_tags_match`|`"any"`|标签匹配模式 (any/all/any\_strict/all\_strict)|
|`retain_metadata`|`None`|记忆存储操作的默认元数据字典|
|`retain_document_id`|`None`|记忆存储的默认文档\_id (groups/upserts 记忆)|
|`recall_types`|`None`|要过滤的事实类型（世界、经验、观察）|
|`recall_include_entities`|`False`|在记忆结果中包含实体信息|
|`reflect_context`|`None`|指导操作的附加上下文|
|`reflect_max_tokens`|`None`|回忆结果的最大 token 数（默认为 `max_tokens`)|
|`reflect_response_schema`|`None`|JSON 约束输出格式的模式|
|`reflect_tags`|`None`|过滤回忆中使用的标签（默认为`recall_tags`)|
|`reflect_tags_match`|`None`|标签匹配 ⟪ （默认为 `recall_tags_match`)|
|`include_retain`|`True`|包括记忆存储（存储）工具|
|`include_recall`|`True`|包括记忆召回（搜索）工具|
|`include_reflect`|`True`|包括“合成”工具|

### `create_recall_node()` {#createrecallnode}

|参数|默认|说明|
|---|---|---|
|`bank_id`|`None`|静态记忆库ID（或使用`bank_id_from_config`)|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`budget`|`"mid"`|记忆召回预算水平|
|`max_tokens`|`4096`|记忆结果的最大 token 数数|
|`max_results`|`10`|注入最大记忆数|
|`tags`|`None`|过滤记忆结果的标签|
|`tags_match`|`"any"`|标签匹配模式|
|`bank_id_from_config`|`"user_id"`|运行时解析记忆库ID的配置密钥|
|`output_key`|`None`|如果设置，则将记忆文本写入此状态键，而不是将 SystemMessage 附加到 `messages`|

### `create_retain_node()` {#createretainnode}

|参数|默认|说明|
|---|---|---|
|`bank_id`|`None`|静态记忆库ID（或使用`bank_id_from_config`)|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`tags`|`None`|应用于存储记忆的标签|
|`bank_id_from_config`|`"user_id"`|运行时解析记忆库ID的配置密钥|
|`retain_human`|`True`|存储人类消息|
|`retain_ai`|`False`|存储 AI 回复|

### `HindsightStore()` {#hindsightstore}

|参数|默认|说明|
|---|---|---|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`tags`|`None`|应用于所有记忆存储操作的标签|

### `configure()` {#configure}

|参数|默认|说明|
|---|---|---|
|`hindsight_api_url`|生产API|Hindsight API 网址|
|`api_key`|`HINDSIGHT_API_KEY`环境|API 用于身份验证的密钥|
|`budget`|`"mid"`|默认记忆召回预算水平|
|`max_tokens`|`4096`|记忆召回的默认最大 token 数|
|`tags`|`None`|记忆存储操作的默认标签|
|`recall_tags`|`None`|要过滤的默认标签 记忆召回|
|`recall_tags_match`|`"any"`|默认标签匹配模式|
|`verbose`|`False`|启用详细日志记录|

## 环境要求 {#requirements}

- Python >= 3.10
- langchain-核心 >= 0.3.0
- hindsight-client >= 0.4.0
- langgraph >= 0.3.0*（仅适用于节点和存储模式 — 使用`pip install hindsight-langgraph[langgraph]`安装）*
