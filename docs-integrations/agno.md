---
sidebar_position: 9
title: "使用 Hindsight 为 Agno 智能体提供持久记忆 | 集成指南"
description: "使用 Hindsight 的存储、召回和反思工具，为 Agno 智能体提供跨会话的持久记忆，可接入原生 Toolkit 模式。"
---

# Agno

通过 Hindsight 为 [Agno](https://github.com/agno-agi/agno) 智能体提供持久记忆工具，使用 Agno 原生 Toolkit 模式，通过 retain、recall 和 reflect 获得长期记忆。

[查看更新日志 →](/changelog/integrations/agno)

## 功能 {#features}

- **原生 Toolkit**：与 `Mem0Tools` 一样，继承 Agno 的 `Toolkit` 基类。
- **记忆指令**：预先召回记忆，注入 `Agent(instructions=[...])`。
- **三种记忆工具**：Retain（存储）、Recall（搜索）、Reflect（综合），可任意组合。
- **灵活的记忆库解析**：支持静态 ID、`RunContext.user_id` 或自定义解析器。
- **简单配置**：全局配置一次，或直接传入客户端。

## 安装 {#installation}

```bash
pip install hindsight-agno
```

## 快速开始 {#quick-start}

:::tip 推荐使用 Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
        api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY
    )],
)

agent.print_response("记住，我偏好深色模式")
agent.print_response("我的偏好是什么？")
```

### 自行托管（本地开发） {#self-hosting-local-development}

若使用 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，将地址改为 `http://localhost:8888`。配置方法见[安装指南](/developer/installation)。

智能体现可调用三个工具：

- **`retain_memory`**：将信息存入长期记忆。
- **`recall_memory`**：搜索长期记忆中的相关事实。
- **`reflect_on_memory`**：根据记忆综合生成经过推理的答案。

## 使用记忆指令 {#with-memory-instructions}

预先召回相关记忆，并注入系统提示词：

```python
from hindsight_agno import HindsightTools, memory_instructions

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
    instructions=[memory_instructions(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
)
```

## 选择工具 {#selecting-tools}

仅包含需要的工具：

```python
tools = [HindsightTools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不提供反思
)]
```

## 记忆库解析 {#bank-resolution}

记忆库 ID 按以下优先级解析：

1. **`bank_resolver`**：自定义可调用对象 `(RunContext) -> str`。
2. **`bank_id`**：传给构造函数的静态记忆库 ID。
3. **`run_context.user_id`**：自动按用户划分记忆库。

```python
# 从 RunContext 按用户建立记忆库
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="https://api.hindsight.vectorize.io")],
    user_id="user-123",  # 作为 bank_id
)

# 自定义解析器
def resolve_bank(ctx):
    return f"team-{ctx.user_id}"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_resolver=resolve_bank,
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
)
```

## 全局配置 {#global-configuration}

配置一次即可，无需为每个 Toolkit 分别传入连接信息：

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY
    budget="mid",                  # 召回预算：low/mid/high
    max_tokens=4096,               # 召回最大 token 数
    tags=["env:prod"],             # 存储标签
    recall_tags=["scope:global"],  # 召回筛选标签
    recall_tags_match="any",       # 标签模式：any/all/any_strict/all_strict
)

# 使用全局连接配置创建工具集
tools = [HindsightTools(bank_id="user-123")]
```

## 配置参考 {#configuration-reference}

### `HindsightTools()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | `None` | 静态 Hindsight 记忆库 ID |
| `bank_resolver` | `None` | 返回动态记忆库 ID 的可调用对象 `(RunContext) -> str` |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API 地址，未提供客户端时使用 |
| `api_key` | `None` | API 密钥，未提供客户端时使用 |
| `budget` | `"mid"` | 召回／反思预算级别（low/mid/high） |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `tags` | `None` | 存储记忆时附加的标签 |
| `recall_tags` | `None` | 搜索时筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `enable_retain` | `True` | 包含存储工具 |
| `enable_recall` | `True` | 包含召回工具 |
| `enable_reflect` | `True` | 包含反思工具 |

### `memory_instructions()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API 地址，未提供客户端时使用 |
| `api_key` | `None` | API 密钥，未提供客户端时使用 |
| `query` | `"relevant context about the user"` | 注入记忆时的召回查询；默认值意为“与用户有关的上下文” |
| `budget` | `"low"` | 召回预算级别 |
| `max_results` | `5` | 最多注入的记忆条数 |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `prefix` | `"Relevant memories:\n"` | 记忆列表前的文字；默认值意为“相关记忆” |
| `tags` | `None` | 筛选召回结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | Hindsight Cloud（`https://api.hindsight.vectorize.io`） | Hindsight API 地址 |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于认证的 API 密钥 |
| `budget` | `"mid"` | 默认召回预算级别 |
| `max_tokens` | `4096` | 默认召回最大 token 数 |
| `tags` | `None` | 存储操作的默认标签 |
| `recall_tags` | `None` | 默认召回筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 启用详细日志 |

## 环境要求 {#requirements}

- Python >= 3.10
- agno
- hindsight-client >= 0.4.0
- 正在运行的 Hindsight API 服务器
