---
sidebar_position: 8
title: "通过 Hindsight 实现 LlamaIndex 持久记忆 | 集成"
description: "通过 Hindsight 为 LlamaIndex 智能体添加长期记忆。支持智能体主动调用工具（HindsightToolSpec），也支持通过 BaseMemory 接口自动管理记忆。"
---

# LlamaIndex {#llamaindex}

借助 Hindsight，为 [LlamaIndex](https://docs.llamaindex.ai/) 智能体提供持久的长期记忆。`hindsight-llamaindex` 包提供两种互补的接入方式：

- **`HindsightToolSpec`** — 由智能体主动调用记忆工具（retain/recall/reflect）
- **`HindsightMemory`** — 通过 LlamaIndex 的 `BaseMemory` 接口自动管理记忆

[查看更新日志 →](/changelog/integrations/llamaindex)

## 安装 {#installation}

```bash
pip install hindsight-llamaindex
```

---

## 自动管理记忆（BaseMemory） {#automatic-memory-basememory}

这是为 LlamaIndex 智能体接入 Hindsight 记忆最简单的方式。每轮对话结束时，消息都会自动存入；系统还会召回相关记忆并将其作为上下文注入。

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightMemory
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    memory = HindsightMemory.from_client(
        client=client,
        bank_id="user-123",
        mission="Track user preferences and project context",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("Remember that I prefer dark mode", memory=memory)
    print(response)

asyncio.run(main())
```

### 工作原理 {#how-it-works}

| 事件 | 处理方式 |
|-------|-------------|
| 智能体收到输入 | `aget(input)` 从 Hindsight 召回相关记忆，并将其作为系统消息置于前面 |
| 智能体生成输出 | `aput(message)` 将消息存入 Hindsight，供以后召回 |
| 开始新的会话 | 之前的记忆仍可通过召回获取；本地聊天记录缓冲区则从空状态开始 |

### `HindsightMemory.from_client()` {#hindsightmemoryfrom_client}

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `client` | `Hindsight` | *必填* | Hindsight 客户端实例 |
| `bank_id` | `str` | *必填* | 记忆库 ID |
| `mission` | `str` | `None` | 记忆库的任务说明；首次使用时自动创建记忆库 |
| `context` | `str` | `"llamaindex"` | Retain 操作的来源标签 |
| `budget` | `str` | `"mid"` | Recall 的预算级别 |
| `max_tokens` | `int` | `4096` | Recall 返回结果的最大 token 数 |
| `tags` | `list[str]` | `None` | Retain 操作使用的标签 |
| `recall_tags` | `list[str]` | `None` | 用于筛选 Recall 结果的标签 |
| `recall_tags_match` | `str` | `"any"` | 标签匹配模式 |
| `system_prompt` | `str` | *（内置）* | 记忆系统消息的模板。必须包含 `{memories}` |
| `chat_history_limit` | `int` | `100` | 本地缓冲区中保留的最大消息数 |

还可以使用 `HindsightMemory.from_url(hindsight_api_url, bank_id, ...)`，无需预先创建客户端即可构造实例。

---

## 智能体主动调用工具（BaseToolSpec） {#agent-driven-tools-basetoolspec}

如果需要显式控制，可以将 retain/recall/reflect 作为工具提供给智能体，由智能体选择何时调用。

### 快速入门：工具规范 {#quick-start-tool-spec}

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightToolSpec
from llama_index.llms.openai import OpenAI
from llama_index.core.agent import ReActAgent

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    spec = HindsightToolSpec(
        client=client,
        bank_id="user-123",
        mission="Track user preferences",
    )
    tools = spec.to_tool_list()

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
    response = await agent.run("Remember that I prefer dark mode")
    print(response)

asyncio.run(main())
```

### 快速入门：工厂函数 {#quick-start-factory-function}

```python
from hindsight_llamaindex import create_hindsight_tools

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
)
```

### 选择工具 {#selecting-tools}

```python
# 使用 to_tool_list()
tools = spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])

# 使用工厂函数的标志参数
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,
)
```

### 配置 {#configuration}

通过 `configure()` 设置默认值，并可在每次调用时覆盖：

```python
from hindsight_llamaindex import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",  # 也可以设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    tags=["source:llamaindex"],
    context="my-app",
    mission="Track user preferences",
)

# 现在创建工具时无需传入 client 或 URL
tools = create_hindsight_tools(bank_id="user-123")
```

### `HindsightToolSpec()` {#hindsighttoolspec}

| 参数 | 类型 | 默认值 | 说明 |
|-----------|------|---------|-------------|
| `bank_id` | `str` | *必填* | 要操作的 Hindsight 记忆库 |
| `client` | `Hindsight` | `None` | 预先配置好的 Hindsight 客户端 |
| `hindsight_api_url` | `str` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `str` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `str` | `None` → `"mid"` | Recall/Reflect 的预算：`low`、`mid`、`high` |
| `max_tokens` | `int` | `None` → `4096` | Recall 结果的最大 token 数 |
| `tags` | `list[str]` | `None` | 存入记忆时使用的标签 |
| `recall_tags` | `list[str]` | `None` | 用于筛选 Recall 结果的标签 |
| `recall_tags_match` | `str` | `None` → `"any"` | 标签匹配模式：`any`、`all`、`any_strict`、`all_strict` |
| `retain_metadata` | `dict[str, str]` | `None` | Retain 操作的默认元数据 |
| `retain_document_id` | `str` | `None` | Retain 操作使用的文档 ID。未设置时自动生成 `{session}-{timestamp}` |
| `retain_context` | `str` | `"llamaindex"` | Retain 操作的来源标签 |
| `recall_types` | `list[str]` | `None` | 事实类型：`world`、`experience`、`observation` |
| `recall_include_entities` | `bool` | `False` | 是否在 Recall 结果中包含实体信息 |
| `reflect_context` | `str` | `None` | Reflect 使用的附加上下文 |
| `reflect_max_tokens` | `int` | `None` | Reflect 的最大 token 数（默认使用 `max_tokens`） |
| `reflect_response_schema` | `dict` | `None` | 用于约束 Reflect 输出的 JSON Schema |
| `reflect_tags` | `list[str]` | `None` | Reflect 使用的标签（默认使用 `recall_tags`） |
| `reflect_tags_match` | `str` | `None` | Reflect 的标签匹配模式（默认使用 `recall_tags_match`） |
| `mission` | `str` | `None` | 记忆库的任务说明；首次使用时自动创建记忆库 |

---

## 生产环境中的用法 {#production-patterns}

### 记忆库任务说明 {#bank-mission}

设置任务说明，为记忆引擎的事实提取提供上下文：

```python
# 工具
spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    mission="Track user coding preferences, project context, and technical decisions",
)

# 记忆
memory = HindsightMemory.from_client(
    client=client,
    bank_id="user-123",
    mission="Track user coding preferences, project context, and technical decisions",
)
```

首次使用时会自动创建记忆库。如果记忆库已存在，系统会静默跳过创建。

### 使用标签限定记忆范围 {#memory-scoping-with-tags}

```python
spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],        # 应用于所有 Retain 操作
    recall_tags=["source:chat"],                 # 仅从聊天记忆中筛选 Recall 结果
    recall_tags_match="any",
)
```

### 错误处理 {#error-handling}

这两种模式都会妥善处理错误：记录操作，并返回易于理解的消息，而不是抛出异常。即使记忆不可用，智能体也能继续运行。

### 组合使用工具与记忆 {#combining-tools--memory}

同时使用两种模式可以获得更大的灵活性：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

# 自动管理记忆，以丰富上下文
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

# 提供智能体主动调用的 Reflect 工具
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,   # Retain 由 memory 自动处理
    include_recall=False,   # Recall 由 memory 自动处理
    include_reflect=True,   # 智能体仍可显式调用 Reflect
)

agent = ReActAgent(tools=tools, llm=llm)

# 将 memory 传给 run()
response = await agent.run("What should I prioritize?", memory=memory)
```

## 环境要求 {#requirements}

- Python 3.10+
- `llama-index-core >= 0.11.0`
- `hindsight-client >= 0.4.0`

---
