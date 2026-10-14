---
sidebar_position: 12
title: "使用 Hindsight 为 SmolAgents 构建持久记忆 | 集成"
description: "使用 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）工具，为 HuggingFace SmolAgents 添加长期记忆。这些 Tool 子类可直接供智能体调用。"
---

# SmolAgents {#smolagents}

通过 Hindsight 为 [SmolAgents](https://github.com/huggingface/smolagents) 智能体提供持久记忆工具。借助 SmolAgents 原生的 `Tool` 模式，使用 Retain（存入）、Recall（召回）和 Reflect（反思）为智能体添加长期记忆。

[查看更新日志 →](/changelog/integrations/smolagents)

## 功能 {#features}

- **原生 Tool 子类** - 每个工具都继承 SmolAgents 的 `Tool` 基类
- **记忆指令** - 预先召回记忆，将其注入智能体的系统提示
- **三种记忆工具** - Retain（存入）、Recall（召回）、Reflect（反思）——可任选组合
- **工厂函数** - 一次调用即可使用共享配置创建所有工具
- **简单配置** - 可一次性进行全局配置，也可以直接传入客户端

## 安装 {#installation}

```bash
pip install hindsight-smolagents
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
from smolagents import CodeAgent, HfApiModel
from hindsight_smolagents import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 也可以设置 HINDSIGHT_API_KEY 环境变量
)

agent = CodeAgent(
    tools=tools,
    model=HfApiModel(),
)

agent.run("Remember that I prefer dark mode")
agent.run("What are my preferences?")
```

现在，智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 从长期记忆中检索相关事实
- **`hindsight_reflect`** — 基于记忆综合生成经过推理的答案

### 自托管（本地开发） {#self-hosting-local-development}

如果通过 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，请替换 URL：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
)
```

有关自托管设置，请参阅[安装指南](/developer/installation)。

## 使用记忆指令 {#with-memory-instructions}

预先召回相关记忆，并将其注入系统提示：

```python
from hindsight_smolagents import create_hindsight_tools, memory_instructions

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
)

memories = memory_instructions(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
)

agent = CodeAgent(
    tools=tools,
    model=HfApiModel(),
    system_prompt=f"You are a helpful assistant.\n\n{memories}",
)
```

## 单独使用工具 {#individual-tools}

也可以直接使用工具类：

```python
from hindsight_smolagents import HindsightRetainTool, HindsightRecallTool

agent = CodeAgent(
    tools=[
        HindsightRetainTool(
            bank_id="user-123",
            hindsight_api_url="https://api.hindsight.vectorize.io",
        ),
        HindsightRecallTool(
            bank_id="user-123",
            hindsight_api_url="https://api.hindsight.vectorize.io",
        ),
    ],
    model=HfApiModel(),
)
```

## 选择工具 {#selecting-tools}

通过工厂函数，只启用所需工具：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 省略 Reflect 工具
)
```

## 全局配置 {#global-configuration}

可以先进行一次全局配置，而不必为每个工具分别传入连接信息：

```python
from hindsight_smolagents import configure, create_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 也可以设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
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
| `client` | `None` | 预先配置好的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用）|
| `api_key` | `None` | API 密钥（未提供客户端时使用）|
| `budget` | `"mid"` | Recall/Reflect 预算级别（low/mid/high）|
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存入记忆时应用的标签 |
| `recall_tags` | `None` | 检索记忆时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `enable_retain` | `True` | 是否包含 Retain（存入）工具 |
| `enable_recall` | `True` | 是否包含 Recall（召回）工具 |
| `enable_reflect` | `True` | 是否包含 Reflect（反思）工具 |

### `memory_instructions()` {#memory_instructions}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置好的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用）|
| `api_key` | `None` | API 密钥（未提供客户端时使用）|
| `query` | `"relevant context about the user"` | 用于注入记忆的 Recall 查询 |
| `budget` | `"low"` | Recall 预算级别 |
| `max_results` | `5` | 最多注入的记忆条数 |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `prefix` | `"Relevant memories:\n"` | 添加在记忆列表前的文本 |
| `tags` | `None` | 用于筛选 Recall 结果的标签 |
| `tags_match` | `"any"` | 标签匹配模式 |

### `configure()` {#configure}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | Hindsight Cloud (`https://api.hindsight.vectorize.io`) | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份验证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作默认使用的标签 |
| `recall_tags` | `None` | Recall 默认使用的筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |
| `verbose` | `False` | 是否启用详细日志 |

## 环境要求 {#requirements}

- Python >= 3.10
- smolagents
- hindsight-client >= 0.4.0
- 正在运行的 Hindsight API 服务器
