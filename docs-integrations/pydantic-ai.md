---
sidebar_position: 6
title: "使用 Hindsight 为 Pydantic AI 添加持久记忆 | 集成"
description: "通过 Hindsight 为 Pydantic AI 智能体添加长期记忆。原生异步的 Retain、Recall 和 Reflect 工具可在智能体的每次运行中保留持久记忆，无需线程池变通方案。"
---

# Pydantic AI {#pydantic-ai}

通过 Hindsight 为 [Pydantic AI](https://ai.pydantic.dev/) 智能体提供持久记忆工具。借助 Retain（存入）、Recall（召回）和 Reflect（反思），为智能体添加长期记忆；这些工具都原生支持异步，无需线程池变通方案。

[查看更新日志 →](/changelog/integrations/pydantic-ai)

## 功能 {#features}

- **原生异步工具** — 直接使用 Pydantic AI 的异步工具接口（`aretain`、`arecall`、`areflect`）
- **记忆指令** — 通过 `instructions=[...]` 自动将相关记忆注入智能体的每次运行
- **三种记忆工具** — Retain（存入）、Recall（召回）、Reflect（反思）；可任选组合
- **简单配置** — 一次性进行全局配置，也可以直接传入客户端
- **轻量** — 依赖 `pydantic-ai-slim`，避免引入所有模型供应商

## 安装 {#installation}

```bash
pip install hindsight-pydantic-ai
```

## 快速开始 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
from hindsight_client import Hindsight
from hindsight_pydantic_ai import create_hindsight_tools, memory_instructions
from pydantic_ai import Agent

client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")

agent = Agent(
    "openai:gpt-4o",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
    instructions=[memory_instructions(client=client, bank_id="user-123")],
)

result = await agent.run("What do you remember about my preferences?")
print(result.output)
```

现在，智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆综合生成有理有据的答案

`memory_instructions` 可调用对象会在每次运行时自动召回相关记忆，并将其注入系统提示词。

### 自行托管（本地开发） {#self-hosting-local-development}

如果你使用 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，请替换 URL：

```python
client = Hindsight(base_url="http://localhost:8888")
```

自托管设置请参阅[安装指南](/developer/installation)。

## 仅使用工具（不自动注入） {#tools-only-no-auto-injection}

如果你希望由智能体自行决定何时使用记忆，而不是每次都注入上下文：

```python
agent = Agent(
    "openai:gpt-4o",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
)
```

## 仅使用指令（不使用工具） {#instructions-only-no-tools}

如果你只想自动注入记忆，而不向智能体提供显式的记忆工具：

```python
agent = Agent(
    "openai:gpt-4o",
    instructions=[memory_instructions(client=client, bank_id="user-123")],
)
```

## 选择工具 {#selecting-tools}

只包含你需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不包含 reflect
)
```

## 全局配置 {#global-configuration}

你可以一次性配置，而不必在每次调用时都传入客户端：

```python
from hindsight_pydantic_ai import configure, create_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  # Hindsight Cloud（默认值）
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 应用于存入记忆的标签
    recall_tags=["scope:global"],  # 用于筛选 Recall 结果的标签
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

# 现在可以不传入客户端来创建工具，它们会使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## 单个工具的覆盖配置 {#per-tool-overrides}

构造函数参数会覆盖全局配置：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    budget="high",             # 覆盖全局预算
    max_tokens=8192,           # 覆盖全局 max_tokens
    tags=["session:abc"],      # 覆盖全局标签
)
```

## 记忆指令选项 {#memory-instructions-options}

自定义要注入哪些记忆，以及注入方式：

```python
instructions_fn = memory_instructions(
    client=client,
    bank_id="user-123",
    query="relevant context about the user",  # 要搜索的内容
    budget="low",                              # 加快检索
    max_results=5,                             # 限制注入的记忆数量
    max_tokens=4096,                           # Recall 结果的最大 token 数
    prefix="Relevant memories:\n",             # 添加在记忆列表前的文本
    tags=["scope:global"],                     # 按标签筛选
    tags_match="any",                          # 标签匹配模式
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
| `budget` | `"mid"` | Recall/Reflect 预算级别（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存入记忆时应用的标签 |
| `recall_tags` | `None` | 搜索记忆时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `include_retain` | `True` | 包含 Retain（存入）工具 |
| `include_recall` | `True` | 包含 Recall（召回）工具 |
| `include_reflect` | `True` | 包含 Reflect（反思）工具 |

### `memory_instructions()` {#memory_instructions}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `query` | `"relevant context about the user"` | 用于注入记忆的 Recall 查询 |
| `budget` | `"low"` | Recall 预算级别 |
| `max_results` | `5` | 注入记忆的最大数量 |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `prefix` | `"Relevant memories:\n"` | 添加在记忆列表前的文本 |
| `tags` | `None` | 用于筛选 Recall 结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | Hindsight Cloud（`https://api.hindsight.vectorize.io`） | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份验证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | 用于筛选 Recall 结果的默认标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 启用详细日志记录 |
