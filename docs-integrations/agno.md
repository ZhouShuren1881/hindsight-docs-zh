---
sidebar_position: 9
title: "使用 Hindsight 为 Agno 智能体提供持久记忆 | 集成指南"
description: "使用 Hindsight 的 retain、recall 和 reflect 工具，为 Agno 智能体提供跨会话的持久记忆。接入 Agno 原生 Toolkit 模式，实现长期记忆。"
---

# Agno {#agno}

通过 Hindsight 为 [Agno](https://github.com/agno-agi/agno) 智能体提供持久记忆工具。使用 Agno 原生 Toolkit 模式，通过 Retain（存入）、Recall（召回）和 Reflect（反思）让智能体拥有长期记忆。

[查看更新日志 →](/changelog/integrations/agno)

## 功能 {#features}

- **原生 Toolkit**：继承 Agno 的 `Toolkit` 基类，与 `Mem0Tools` 类似。
- **记忆指令**：预先召回记忆，并注入 `Agent(instructions=[...])`。
- **三种记忆工具**：Retain（存入）、Recall（召回）、Reflect（综合生成），可任意组合。
- **灵活解析记忆库**：使用静态记忆库 ID、`RunContext.user_id` 或自定义解析器。
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
        api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    )],
)

agent.print_response("Remember that I prefer dark mode")
agent.print_response("What are my preferences?")
```

### 自行托管（本地开发） {#self-hosting-local-development}

如果你在本地使用 `./scripts/dev/start-api.sh` 运行 Hindsight，请将 URL 改为 `http://localhost:8888`。设置方法请参阅[安装指南](/developer/installation)。

现在，智能体可以调用以下三个工具：

- **`retain_memory`**：将信息存入长期记忆。
- **`recall_memory`**：搜索相关事实，召回长期记忆。
- **`reflect_on_memory`**：根据记忆综合生成经过推理的答案。

## 使用记忆指令 {#with-memory-instructions}

预先召回相关记忆，并将其注入系统提示词：

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

只包含你需要的工具：

```python
tools = [HindsightTools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含 reflect
)]
```

## 解析记忆库 {#bank-resolution}

记忆库 ID 按以下顺序解析：

1. **`bank_resolver`**：自定义可调用对象 `(RunContext) -> str`。
2. **`bank_id`**：传给构造函数的静态记忆库 ID。
3. **`run_context.user_id`**：自动按用户使用独立记忆库。

```python
# 根据 RunContext 为每位用户创建记忆库
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="https://api.hindsight.vectorize.io")],
    user_id="user-123",  # 用作 bank_id
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

你可以集中配置连接信息，无需在每个 Toolkit 中重复传入：

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # 召回结果的最大 token 数
    tags=["env:prod"],             # 为存储的记忆添加标签
    recall_tags=["scope:global"],  # 用于筛选召回结果的标签
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

# 创建工具集时无需再传入连接信息
tools = [HindsightTools(bank_id="user-123")]
```

## 配置参考 {#configuration-reference}

### `HindsightTools()` {#hindsighttools}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | `None` | Hindsight 记忆库的静态 ID |
| `bank_resolver` | `None` | 接收 `(RunContext) -> str` 并返回动态记忆库 ID 的可调用对象 |
| `client` | `None` | 预先配置好的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | 未提供客户端时使用的 API URL |
| `api_key` | `None` | 未提供客户端时使用的 API 密钥 |
| `budget` | `"mid"` | Recall/Reflect 的预算级别（low/mid/high） |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `tags` | `None` | 存储记忆时附加的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `enable_retain` | `True` | 是否包含 retain（存入）工具 |
| `enable_recall` | `True` | 是否包含 recall（召回）工具 |
| `enable_reflect` | `True` | 是否包含 reflect（反思）工具 |

### `memory_instructions()` {#memory_instructions}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置好的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | 未提供客户端时使用的 API URL |
| `api_key` | `None` | 未提供客户端时使用的 API 密钥 |
| `query` | `"relevant context about the user"` | 用于注入记忆的 Recall 查询；默认查询为“与用户相关的上下文” |
| `budget` | `"low"` | Recall 预算级别 |
| `max_results` | `5` | 最多注入的记忆条数 |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `prefix` | `"Relevant memories:\n"` | 添加在记忆列表前的文字；默认文字为“相关记忆：” |
| `tags` | `None` | 用于筛选召回结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | Hindsight Cloud（`https://api.hindsight.vectorize.io`） | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份验证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | 默认召回结果最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | 默认的召回筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 是否启用详细日志 |

## 环境要求 {#requirements}

- Python >= 3.10
- agno
- hindsight-client >= 0.4.0
- 正在运行的 Hindsight API 服务器
