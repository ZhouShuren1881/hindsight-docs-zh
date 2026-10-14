---
sidebar_position: 13
title: "使用 Hindsight 为 Composio 添加持久记忆 | 集成指南"
description: "为 Composio 智能体添加长期记忆。将 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）注册为 Composio 自定义工具，并自动按会话用户隔离记忆。"
---

# Composio

通过 Hindsight 为 [Composio](https://composio.dev) 智能体提供持久记忆。Hindsight 的 **Retain**、**Recall** 和 **Reflect** 操作会注册为 Composio 进程内自定义工具，供智能体直接调用。

每次调用使用的 Hindsight 记忆库由 Composio 会话的 `user_id` 确定，因此只需注册一套工具，就能自动为每位用户隔离记忆。

[查看更新日志 →](/changelog/integrations/composio)

## 功能 {#features}

- **Composio 自定义工具** — 通过 `composio.experimental.tool()` 注册，并绑定到会话
- **按用户隔离记忆** — 会话的 `user_id` 映射为 Hindsight 的 `bank_id`（可配置后备记忆库）
- **三种记忆工具** — Retain（存入）、Recall（召回）和 Reflect（反思），可以按需组合
- **配置简单** — 直接传入客户端或 URL，也可以全局调用一次 `configure()`

## 安装 {#installation}

```bash
pip install hindsight-composio
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
from composio import Composio
from hindsight_composio import register_hindsight_tools

composio = Composio()  # 使用 COMPOSIO_API_KEY

tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)

session = composio.create(
    user_id="user-123",  # 成为 Hindsight bank_id
    experimental={"custom_tools": tools},
)

# 像往常一样将 session.tools() 传给智能体/LLM。
```

现在，会话中有三个可供智能体调用的工具：

- **`HINDSIGHT_RETAIN`** — 将信息存入长期记忆
- **`HINDSIGHT_RECALL`** — 从长期记忆中检索相关事实
- **`HINDSIGHT_REFLECT`** — 根据记忆综合生成有推理依据的回答

## 记忆库选择 {#bank-selection}

每次调用都会按以下顺序确定记忆库：

1. 会话的 `user_id`（推荐：一套工具即可按用户隔离记忆）。
2. 如果调用没有 `user_id`，则使用传给 `register_hindsight_tools` 或 `configure` 的 `default_bank`。

如果两者都不可用，工具会抛出错误。

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    default_bank="shared",  # 仅在会话没有 user_id 时使用
)
```

### 自托管（本地开发） {#self-hosting-local-development}

如果使用 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，请替换 URL：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="http://localhost:8888",
)
```

自托管设置请参阅[安装指南](/developer/installation)。

## 选择工具 {#selecting-tools}

只启用所需的工具：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含 reflect
)
```

## 全局配置 {#global-configuration}

也可以先配置一次，之后无需每次传入连接信息：

```python
from hindsight_composio import configure, register_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    default_bank="shared",         # 没有 user_id 时使用的后备记忆库
    budget="mid",                  # Recall/Reflect 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # 用于筛选 Recall 结果的标签
    recall_tags_match="any",       # any/all/any_strict/all_strict
)

tools = register_hindsight_tools(composio)
```

## 配置参考 {#configuration-reference}

### `register_hindsight_tools()`

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `composio` | _必需_ | `Composio` 实例（提供装饰器） |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `default_bank` | `None` | 调用没有 Composio `user_id` 时使用的记忆库 |
| `budget` | `"mid"` | Recall/Reflect 预算级别（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存入记忆时应用的标签 |
| `recall_tags` | `None` | 检索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `enable_retain` | `True` | 是否包含 Retain（存入）工具 |
| `enable_recall` | `True` | 是否包含 Recall（召回）工具 |
| `enable_reflect` | `True` | 是否包含 Reflect（反思）工具 |

### `configure()`

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `hindsight_api_url` | Hindsight Cloud (`https://api.hindsight.vectorize.io`) | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份验证的 API 密钥 |
| `default_bank` | `None` | 会话没有 `user_id` 时使用的后备记忆库 |
| `budget` | `"mid"` | 默认 Recall/Reflect 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | Recall 的默认筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |

## 环境要求 {#requirements}

- Python >= 3.10
- composio >= 0.13.1, < 1
- hindsight-client >= 0.4.0
- 正在运行的 Hindsight API 服务器（或 Hindsight Cloud）

:::note
Composio 的自定义工具 API 目前仍处于实验阶段。此集成面向 Composio 0.13.x SDK（`from composio import Composio`），有意不支持正在开发的 `1.0.0` 重写版本，因为该版本的 API 不同。
:::
