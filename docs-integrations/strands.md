---
sidebar_position: 13
title: "使用 Hindsight 为 Strands Agents 提供持久记忆 | 集成"
description: "借助 Hindsight 为 Strands Agents SDK 智能体添加长期记忆。使用 Strands 原生的 @tool 模式提供存入、召回和反思工具，让记忆跨会话持久保存。"
---

# Strands Agents {#strands-agents}

通过 Hindsight 为 [Strands Agents SDK](https://github.com/strands-agents/sdk-python) 智能体提供持久记忆工具。借助 Retain（存入）、Recall（召回）和 Reflect（反思），让智能体拥有长期记忆；这些工具使用 Strands 原生的 `@tool` 模式。

[查看更新日志 →](/changelog/integrations/strands)

## 功能 {#features}

- **原生 `@tool` 函数** - 工具是普通的 Python 函数，可与 `Agent(tools=[...])` 配合使用
- **记忆指令** - 预先召回记忆，并将其注入智能体的系统提示词
- **三种记忆工具** - Retain（存入）、Recall（搜索）、Reflect（综合推理）；可按需组合使用
- **简单配置** - 可进行一次全局配置，也可直接传入客户端

## 安装 {#installation}

```bash
pip install hindsight-strands
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)

agent = Agent(tools=tools)
agent("Remember that I prefer dark mode")
agent("What are my preferences?")
```

现在，智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 从长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆综合生成经过推理的答案

### 自行托管（本地开发） {#self-hosting-local-development}

如果你通过 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，请替换 URL：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

自托管设置请参阅[安装指南](/developer/installation)。

## 使用记忆指令 {#with-memory-instructions}

预先召回相关记忆，并将其注入系统提示词：

```python
from hindsight_strands import create_hindsight_tools, memory_instructions

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

memories = memory_instructions(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = Agent(
    tools=tools,
    system_prompt=f"You are a helpful assistant.\n\n{memories}",
)
```

## FastAPI 生命周期（推荐） {#fastapi-lifecycle-recommended}

建议在应用的 lifespan 中创建一个共享的 Hindsight 客户端，并通过 `client=...` 传入。这样可以明确客户端的所有权，并通过 `await client.aclose()` 正常关闭客户端。

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from hindsight_client import Hindsight
from hindsight_strands import create_hindsight_tools, memory_instructions


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")
    app.state.hindsight_client = client
    try:
        yield
    finally:
        await client.aclose()


app = FastAPI(lifespan=lifespan)


@app.post("/chat")
async def chat():
    client = app.state.hindsight_client
    tools = create_hindsight_tools(bank_id="user-123", client=client)
    memories = memory_instructions(bank_id="user-123", client=client)
    ...
```

如果将 `hindsight_api_url`/`api_key` 直接传给 `create_hindsight_tools()`，`hindsight-strands` 会在内部创建客户端。这种情况下，请在关闭应用时调用 `await tools.aclose()`（或 `tools.close()`）。

## 选择工具 {#selecting-tools}

只启用所需的工具：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 省略 Reflect
)
```

## 全局配置 {#global-configuration}

可以只配置一次，而不必在每次调用时都传入连接信息：

```python
from hindsight_strands import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 为存入的记忆添加标签
    recall_tags=["scope:global"],  # 用于筛选 Recall 结果的标签
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

# 现在创建工具时无需传入连接信息
tools = create_hindsight_tools(bank_id="user-123")
```

## 配置参考 {#configuration-reference}

### `create_hindsight_tools()` {#create_hindsight_tools}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `"mid"` | Recall 使用检索预算，Reflect 使用推理探索预算（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存入记忆时应用的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `enable_retain` | `True` | 是否包含 Retain（存入）工具 |
| `enable_recall` | `True` | 是否包含 Recall（搜索）工具 |
| `enable_reflect` | `True` | 是否包含 Reflect（综合推理）工具 |

### `memory_instructions()` {#memory_instructions}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `query` | `"relevant context about the user"` | 用于注入记忆的 Recall 查询 |
| `budget` | `"low"` | Recall 预算级别 |
| `max_results` | `5` | 最多注入的记忆数 |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `prefix` | `"Relevant memories:\n"` | 添加在记忆列表前的文本 |
| `tags` | `None` | 用于筛选 Recall 结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | Hindsight Cloud（`https://api.hindsight.vectorize.io`） | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份验证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 检索预算 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作使用的默认标签 |
| `recall_tags` | `None` | 用于筛选 Recall 结果的默认标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 是否启用详细日志记录 |

## 环境要求 {#requirements}

- Python >= 3.10
- strands-agents
- hindsight-client >= 0.4.0
- 正在运行的 Hindsight API 服务器
