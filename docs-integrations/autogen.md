---
sidebar_position: 12
title: "使用 Hindsight 为 AutoGen 提供持久记忆 | 集成指南"
description: "为 AutoGen 智能体添加长期记忆。提供存储、召回和反思的 FunctionTool 实例，可直接接入 AssistantAgent。"
---

# AutoGen

通过 Hindsight 为 [AutoGen](https://microsoft.github.io/autogen/) 智能体提供持久长期记忆，提供可直接接入 `AssistantAgent` 的 `FunctionTool` 实例。

[查看更新日志 →](/changelog/integrations/autogen)

## 功能 {#features}

- **记忆工具**：将 retain、recall 和 reflect 包装为 AutoGen `FunctionTool`，兼容 `AssistantAgent(tools=[...])`。
- **原生异步**：直接使用 `aretain`、`arecall`、`areflect`，无缝接入 AutoGen 异步运行时。
- **按需选择工具**：通过 `include_retain/recall/reflect` 开关只包含需要的工具。
- **按标签划分范围**：按主题、会话或用户对记忆分区。
- **全局配置**：调用一次 `configure()`，即可在任意位置创建工具。

## 安装 {#installation}

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

`hindsight-autogen` 会安装 `autogen-core` 和 `hindsight-client`。使用 `AssistantAgent` 还需 `autogen-agentchat`，使用 OpenAI 模型客户端还需 `autogen-ext[openai]`。

## 快速开始 {#quick-start}

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from hindsight_client import Hindsight
from hindsight_autogen import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id="user-123")

    model_client = OpenAIChatCompletionClient(model="gpt-4o")
    tools = create_hindsight_tools(client=client, bank_id="user-123")

    agent = AssistantAgent(
        name="assistant",
        model_client=model_client,
        tools=tools,
    )

    # 存储记忆
    result = await agent.run(task="记住，我偏好深色模式")
    print(result.messages[-1].content)

    # Hindsight 异步处理存储内容，包括事实提取、
    # 实体解析和嵌入。短暂等待确保下一次
    # 召回可搜索到记忆。生产环境只有同一脚本内
    # 存储后紧接召回时需要此等待。
    await asyncio.sleep(3)

    # 随后召回
    result = await agent.run(task="我的界面偏好是什么？")
    print(result.messages[-1].content)

    # 清理
    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

:::tip Jupyter Notebook
Jupyter Notebook 已有运行中的事件循环，无需 `asyncio.run()`，可直接在单元格中使用 `await`。
:::

智能体可调用三个工具：

- **`hindsight_retain`**：将信息存入长期记忆。
- **`hindsight_recall`**：搜索长期记忆中的相关事实。
- **`hindsight_reflect`**：根据记忆综合生成经过推理的答案。

## 选择工具 {#selecting-tools}

只包含需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不提供反思
)
```

## 全局配置 {#global-configuration}

配置一次即可，无需每次调用都传入客户端：

```python
from hindsight_autogen import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY
    budget="mid",                  # 召回预算：low/mid/high
    max_tokens=4096,               # 召回最大 token 数
    tags=["env:prod"],             # 存储标签
    recall_tags=["scope:global"],  # 召回筛选标签
    recall_tags_match="any",       # 标签匹配模式
)

# 不传客户端，使用全局配置创建工具
tools = create_hindsight_tools(bank_id="user-123")
```

## 使用标签划分记忆范围 {#memory-scoping-with-tags}

通过标签按主题、会话或用户划分记忆：

```python
# 按来源附加存储标签
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

## 生产环境模式 {#production-patterns}

### 错误处理 {#error-handling}

工具失败时抛出 `HindsightError`，AutoGen 将其呈现为工具错误。可以包装智能体调用，实现优雅降级：

```python
from hindsight_autogen.errors import HindsightError

try:
    result = await agent.run(task="你记得我的哪些信息？")
except HindsightError as e:
    print(f"记忆操作失败：{e}")
```

### 记忆库生命周期 {#bank-lifecycle}

首次使用前创建记忆库，完成后清理：

```python
async def main():
    client = Hindsight(base_url="http://localhost:8888")

    # 幂等创建记忆库
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")
    # ……使用工具……

    # 可选：不再需要时删除记忆库
    await client.adelete_bank(bank_id="user-123")
```

### 多智能体团队 {#multi-agent-teams}

每个智能体可使用独立记忆库，也可在团队内共享：

```python
# 各智能体独立记忆
researcher_tools = create_hindsight_tools(client=client, bank_id="researcher-memory")
writer_tools = create_hindsight_tools(client=client, bank_id="writer-memory")

# 团队共享记忆
shared_tools = create_hindsight_tools(
    client=client,
    bank_id="team-shared",
    tags=["team:content"],
)
```

## API 参考 {#api-reference}

### `create_hindsight_tools()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `bank_id` | *必填* | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API 地址，未提供客户端时使用 |
| `api_key` | `None` | API 密钥，未提供客户端时使用 |
| `budget` | `"mid"` | 召回／反思预算级别（low/mid/high） |
| `max_tokens` | `4096` | 召回结果的最大 token 数 |
| `tags` | `None` | 存储记忆时附加的标签 |
| `recall_tags` | `None` | 搜索时筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式（any/all/any\_strict/all\_strict） |
| `retain_metadata` | `None` | 存储操作的默认元数据字典 |
| `retain_document_id` | `None` | 默认 document\_id，用于分组和更新记忆 |
| `recall_types` | `None` | 要筛选的事实类型（world、experience、observation） |
| `recall_include_entities` | `False` | 在召回结果中包含实体信息 |
| `reflect_context` | `None` | 反思操作的额外上下文 |
| `reflect_max_tokens` | `None` | 反思结果最大 token 数，默认使用 `max_tokens` |
| `reflect_response_schema` | `None` | 限定反思输出格式的 JSON schema |
| `reflect_tags` | `None` | 筛选反思使用的记忆，默认使用 `recall_tags` |
| `reflect_tags_match` | `None` | 反思标签匹配模式，默认使用 `recall_tags_match` |
| `include_retain` | `True` | 包含存储工具 |
| `include_recall` | `True` | 包含召回工具 |
| `include_reflect` | `True` | 包含反思工具 |

### `configure()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | 生产 API | Hindsight API 地址 |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于认证的 API 密钥 |
| `budget` | `"mid"` | 默认召回预算级别 |
| `max_tokens` | `4096` | 默认召回最大 token 数 |
| `tags` | `None` | 存储操作的默认标签 |
| `recall_tags` | `None` | 默认召回筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |

## 环境要求 {#requirements}

- Python >= 3.10
- autogen-core >= 0.4.0
- hindsight-client >= 0.4.0
