---
sidebar_position: 13
title: "OpenAI Agents SDK 使用 Hindsight 实现持久记忆 | 集成"
description: "通过 Hindsight 为 OpenAI Agents SDK 智能体添加长期记忆。提供 Retain（存入）、Recall（召回）和 Reflect（反思）的 FunctionTool 实例，可直接接入 Agents SDK 的异步运行时。"
---

# OpenAI Agents SDK {#openai-agents-sdk}

借助 Hindsight，为 [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) 智能体提供持久的长期记忆。Hindsight 提供 `FunctionTool` 实例，可直接接入 OpenAI Agents SDK 的 `Agent`。

[查看更新日志 →](/changelog/integrations/openai-agents)

## 功能 {#features}

- **记忆工具** — 将存入、召回和反思功能封装为 OpenAI Agents SDK 的 `FunctionTool` 实例，与 `Agent(tools=[...])` 兼容
- **原生异步** — 直接使用 `aretain`、`arecall` 和 `areflect`，可在 Agents SDK 的异步运行时中顺畅工作
- **自动注入记忆** — 使用 `memory_instructions()`，在每轮对话中自动将相关记忆注入智能体的系统提示
- **按需选择工具** — 通过 `include_retain/recall/reflect` 标志，仅加入所需工具
- **按标签限定范围** — 使用标签按主题、会话或用户划分记忆
- **全局配置** — 使用 `configure()` 配置一次，即可在任意位置创建工具

## 安装 {#installation}

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents` 会一并安装 `openai-agents` 和 `hindsight-client`。

## 快速开始 {#quick-start}

```python
import asyncio
from agents import Agent, Runner
from hindsight_client import Hindsight
from hindsight_openai_agents import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")

    agent = Agent(
        name="assistant",
        instructions="You are a helpful assistant with long-term memory. Use hindsight_retain to store important facts. Use hindsight_recall to search memory before answering.",
        tools=tools,
    )

    # 存入一条记忆
    result = await Runner.run(agent, "Remember that I prefer dark mode")
    print(result.final_output)

    # Hindsight 会异步处理存入的内容（提取事实、
    # 实体消解、生成嵌入向量）。稍作等待可确保在
    # 下次召回前记忆已可搜索。在生产环境中，仅当
    # 存入和召回在同一脚本中连续发生时才需要这段延迟。
    await asyncio.sleep(3)

    # 稍后召回这条记忆
    result = await Runner.run(agent, "What are my UI preferences?")
    print(result.final_output)

    # 清理
    await client.aclose()

asyncio.run(main())
```

:::tip Jupyter 笔记本
如果你在 Jupyter 笔记本中运行，无需调用 `asyncio.run()`；可以直接在单元格中使用 `await`，因为笔记本已经有一个正在运行的事件循环。
:::

智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 综合记忆并给出有依据的答案

## 使用 `memory_instructions()` 自动注入记忆 {#auto-inject-memories-with-memory_instructions}

你可以在每轮对话中自动将相关记忆注入系统提示，而不必依赖智能体显式调用 `hindsight_recall`：

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="You are a helpful assistant with long-term memory.",
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  # 由 memory_instructions 处理召回
    ),
)
```

`memory_instructions()` 会返回一个与 `Agent(instructions=...)` 兼容的异步可调用对象。每轮对话中，它都会召回相关记忆，并将其附加到基础指令后。如果召回失败或没有返回内容，它会平稳地回退到仅使用 `base_instructions`。

## 选择工具 {#selecting-tools}

只加入你需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不加入 Reflect 工具
)
```

## 全局配置 {#global-configuration}

你可以只配置一次，而不必在每次调用时都传入客户端：

```python
from hindsight_openai_agents import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # 召回结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # 用于筛选召回结果的标签
    recall_tags_match="any",       # 标签匹配模式
)

# 现在无需传入客户端即可创建工具，使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## 使用标签限定记忆范围 {#memory-scoping-with-tags}

使用标签按主题、会话或用户划分记忆：

```python
# 为记忆添加来源标签
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

## 生产环境实践 {#production-patterns}

### 错误处理 {#error-handling}

工具会将错误作为工具错误结果返回给智能体。OpenAI Agents SDK 会自动捕获工具抛出的异常，并将其作为错误字符串返回，使智能体能够妥善处理故障：

```python
from hindsight_openai_agents.errors import HindsightError

# 智能体会看到错误消息，并可据此决定如何继续
result = await Runner.run(agent, "What do you remember about me?")
print(result.final_output)
```

### 记忆库生命周期 {#bank-lifecycle}

首次使用前创建记忆库，使用完毕后进行清理：

```python
async def main():
    client = Hindsight(base_url="http://localhost:8888")

    # 创建记忆库（幂等）
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")
    # ... 使用工具 ...

    # 可选：不再需要时删除记忆库
    await client.adelete_bank(bank_id="user-123")
```

### 多智能体工作流 {#multi-agent-workflows}

可以为每个智能体分配独立的记忆库，也可以让多个智能体共享一个记忆库：

```python
# 每个智能体使用独立记忆
researcher_tools = create_hindsight_tools(client=client, bank_id="researcher-memory")
writer_tools = create_hindsight_tools(client=client, bank_id="writer-memory")

# 共享记忆
shared_tools = create_hindsight_tools(
    client=client,
    bank_id="team-shared",
    tags=["team:content"],
)
```

## API 参考 {#api-reference}

### `create_hindsight_tools()` {#create_hindsight_tools}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `"mid"` | Recall/Reflect 的预算级别（low/mid/high） |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `tags` | `None` | 存入记忆时应用的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式（any/all/any\_strict/all\_strict） |
| `retain_metadata` | `None` | Retain 操作使用的默认元数据字典 |
| `retain_document_id` | `None` | Retain 操作使用的默认 `document_id`（用于分组/插入或更新记忆） |
| `recall_types` | `None` | 要筛选的事实类型（world、experience、observation） |
| `recall_include_entities` | `False` | 是否在召回结果中包含实体信息 |
| `reflect_context` | `None` | Reflect 操作的附加上下文 |
| `reflect_max_tokens` | `None` | Reflect 结果的最大 token 数（默认为 `max_tokens`） |
| `reflect_response_schema` | `None` | 用于约束 Reflect 输出格式的 JSON 模式 |
| `reflect_tags` | `None` | 用于筛选 Reflect 所用记忆的标签（默认为 `recall_tags`） |
| `reflect_tags_match` | `None` | Reflect 的标签匹配模式（默认为 `recall_tags_match`） |
| `include_retain` | `True` | 是否包含 Retain（存入）工具 |
| `include_recall` | `True` | 是否包含 Recall（召回）工具 |
| `include_reflect` | `True` | 是否包含 Reflect（反思）工具 |

### `memory_instructions()` {#memory_instructions}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | 用于 Recall 记忆的 Hindsight 记忆库 |
| `base_instructions` | `""` | 添加到记忆之前的静态指令 |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `query` | `"relevant context about the user"` | 用于查找相关记忆的召回查询 |
| `budget` | `"mid"` | Recall 预算级别（low/mid/high） |
| `max_results` | `5` | 要包含的最大记忆数 |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `prefix` | `"\n\nRelevant memories:\n"` | 添加到记忆列表前的文本 |
| `tags` | `None` | 搜索时用于筛选的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | 生产环境 API | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` env | 用于身份验证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | 默认用于筛选 Recall 结果的标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |

## 要求 {#requirements}

- Python >= 3.10
- openai-agents >= 0.7.0
- hindsight-client >= 0.4.0
