---
sidebar_position: 13
title: "使用 Hindsight 为 Composio 添加持久记忆 | 集成指南"
description: "为 Composio 智能体添加长期记忆。将 Hindsight 的记忆存储、记忆召回和反思注册为 Composio 自定义工具，自动按会话用户隔离记忆。"
---

# Composio

通过 Hindsight 为 [Composio](https://composio.dev) 智能体提供持久记忆。将 Hindsight 的**记忆存储**、**记忆召回**和**反思**操作暴露为 Composio 进程内自定义工具，供智能体直接调用。

每次调用的 Hindsight 记忆库对应 Composio 会话的 `user_id`，因此只需注册一套工具，即可自动按用户隔离记忆。

[查看更新日志 →](/changelog/integrations/composio)

## 功能 {#features}

- **Composio 自定义工具** — 通过 `composio.experimental.tool()` 注册并绑定到会话
- **用户独立记忆** — 会话 `user_id` 映射到 Hindsight `bank_id`（可配置后备记忆库）
- **三种记忆工具** — 记忆存储（存储）、记忆召回（搜索）、反思（综合），可任意组合
- **简单配置** — 直接传入客户端/URL，或全局调用一次 `configure()`

## 安装 {#installation}

```bash
pip install hindsight-composio
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自托管。
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

会话现在提供三种智能体可以调用的工具：

- **`HINDSIGHT_RETAIN`** — 将信息存储到长期记忆
- **`HINDSIGHT_RECALL`** — 在长期记忆中搜索相关事实
- **`HINDSIGHT_REFLECT`** — 基于记忆综合生成经过推理的回答

## 记忆库选择 {#bank-selection}

每次调用独立解析记忆库：

1. 会话的 `user_id`（推荐：一套工具，按用户隔离）。
2. 调用没有 `user_id` 时，使用传给 `register_hindsight_tools` 或 `configure` 的 `default_bank`。

两者都不可用时，工具会抛出错误。

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

自托管设置参见[安装指南](/developer/installation)。

## 选择工具 {#selecting-tools}

只包含需要的工具：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含反思工具
)
```

## 全局配置 {#global-configuration}

无需每次传入连接详情，配置一次即可：

```python
from hindsight_composio import configure, register_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    default_bank="shared",         # 没有 user_id 时的后备记忆库
    budget="mid",                  # 记忆召回/反思预算：low/mid/high
    max_tokens=4096,               # 召回结果的最大 token 数
    tags=["env:prod"],             # 已存储记忆的标签
    recall_tags=["scope:global"],  # 用于过滤召回结果的标签
    recall_tags_match="any",       # any/all/any_strict/all_strict
)

tools = register_hindsight_tools(composio)
```

## 配置参考 {#configuration-reference}

### `register_hindsight_tools()`

| 参数                | 默认值     | 说明                                             |
| ------------------- | ---------- | ------------------------------------------------ |
| `composio`          | _必需_ | `Composio` 实例（提供装饰器） |
| `client`            | `None`     | 预先配置的 Hindsight 客户端                  |
| `hindsight_api_url` | `None`     | API URL（未提供客户端时使用）             |
| `api_key`           | `None`     | API 密钥（未提供客户端时使用）             |
| `default_bank`      | `None`     | 调用没有 Composio `user_id` 时使用的记忆库  |
| `budget`            | `"mid"`    | 记忆召回/反思预算级别（low/mid/high）       |
| `max_tokens`        | `4096`     | 召回结果的最大 token 数                |
| `tags`              | `None`     | 存储记忆时应用的标签               |
| `recall_tags`       | `None`     | 搜索时用于过滤的标签                    |
| `recall_tags_match` | `"any"`    | 标签匹配模式                                |
| `enable_retain`     | `True`     | 包含记忆存储工具                  |
| `enable_recall`     | `True`     | 包含记忆召回工具                 |
| `enable_reflect`    | `True`     | 包含反思（综合）工具            |

### `configure()`

| 参数                | 默认值                                                 | 说明                                          |
| ------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `hindsight_api_url` | Hindsight Cloud (`https://api.hindsight.vectorize.io`) | Hindsight API 地址                             |
| `api_key`           | `HINDSIGHT_API_KEY` 环境变量                                | 用于身份验证的 API 密钥                    |
| `default_bank`      | `None`                                                 | 会话没有 `user_id` 时的后备记忆库 |
| `budget`            | `"mid"`                                                | 默认记忆召回/反思预算级别           |
| `max_tokens`        | `4096`                                                 | 默认召回最大 token 数                 |
| `tags`              | `None`                                                 | 记忆存储操作的默认标签            |
| `recall_tags`       | `None`                                                 | 默认召回过滤标签                 |
| `recall_tags_match` | `"any"`                                                | 默认标签匹配模式                     |

## 环境要求 {#requirements}

- Python >= 3.10
- composio >= 0.13.1, < 1
- hindsight-client >= 0.4.0
- 运行中的 Hindsight API 服务器（或 Hindsight Cloud）

:::note
Composio 的自定义工具 API 目前处于实验阶段。此集成面向 Composio 0.13.x SDK（`from composio import Composio`），并有意排除正在开发的 `1.0.0` 重写版本，因为其 API 不同。
:::
