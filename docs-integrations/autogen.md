---
sidebar_position: 12
title: "使用 Hindsight 为 AutoGen 提供持久记忆 | 集成指南"
description: "为 AutoGen 智能体添加长期记忆。提供可直接接入 AutoGen AssistantAgent 的 FunctionTool 实例，用于存入、召回和反思。"
---

# AutoGen {#autogen}

通过 Hindsight 为 [AutoGen](https://microsoft.github.io/autogen/) 智能体提供持久的长期记忆。Hindsight 提供可直接接入 AutoGen `AssistantAgent` 的 `FunctionTool` 实例。

[查看更新日志 →](/changelog/integrations/autogen)

## 功能 {#features}

- **记忆工具** — 将存入、召回和反思封装为 AutoGen `FunctionTool` 实例，兼容 `AssistantAgent(tools=[...])`
- **原生异步** — 直接使用 `aretain`、`arecall`、`areflect`，无缝接入 AutoGen 的异步运行时
- **按需选择工具** — 通过 `include_retain/recall/reflect` 标记，只包含所需工具
- **按标签划分范围** — 使用标签按主题、会话或用户划分记忆
- **全局配置** — 调用一次 `configure()`，即可在任意位置创建工具

## 安装 {#installation}

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

`hindsight-autogen` 会安装 `autogen-core` 和 `hindsight-client`。此外，使用 `AssistantAgent` 还需要 `autogen-agentchat`，使用 OpenAI 模型客户端还需要 `autogen-ext[openai]`。

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

    # 存入一条记忆
    result = await agent.run(task="Remember that I prefer dark mode")
    print(result.messages[-1].content)

    # Hindsight 会异步处理已存入的内容（提取事实、进行实体消解、生成嵌入向量）。
    # 短暂等待可确保记忆在下一次召回前已可供搜索。在生产环境中，只有
    # 同一脚本内紧接着执行存入和召回时才需要这段延迟。
    await asyncio.sleep(3)

    # 稍后召回
    result = await agent.run(task="What are my UI preferences?")
    print(result.messages[-1].content)

    # 清理资源
    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

:::tip Jupyter Notebook
在 Jupyter Notebook 中，已有正在运行的事件循环，因此无需调用 `asyncio.run()`；可直接在单元格中使用 `await`。
:::

智能体可以调用以下三个工具：

- **`hindsight_retain`** — 将信息存入长期记忆
- **`hindsight_recall`** — 搜索长期记忆，查找相关事实
- **`hindsight_reflect`** — 基于记忆综合生成经过推理的答案

## 选择工具 {#selecting-tools}

只包含所需的工具：

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

可以先配置一次，这样每次调用时就不必传入客户端：

```python
from hindsight_autogen import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # Recall 结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # 用于筛选 Recall 结果的标签
    recall_tags_match="any",       # 标签匹配模式
)

# 现在无需传入客户端，即可使用全局配置创建工具
tools = create_hindsight_tools(bank_id="user-123")
```

## 使用标签划分记忆范围 {#memory-scoping-with-tags}

使用标签按主题、会话或用户划分记忆：

```python
# 为存入的记忆添加来源标签
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

工具失败时会抛出 `HindsightError`，AutoGen 会将其作为工具错误呈现给智能体。可以包装智能体调用，以便在出错时平稳降级：

```python
from hindsight_autogen.errors import HindsightError

try:
    result = await agent.run(task="What do you remember about me?")
except HindsightError as e:
    print(f"Memory operation failed: {e}")
```

### 记忆库生命周期 {#bank-lifecycle}

首次使用前创建记忆库，使用完毕后进行清理：

```python
async def main():
    client = Hindsight(base_url="http://localhost:8888")

    # 创建记忆库（幂等操作）
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")
    # ... 使用工具 ...

    # 可选：不再需要时删除记忆库
    await client.adelete_bank(bank_id="user-123")
```

### 多智能体团队 {#multi-agent-teams}

可以为每个智能体分配独立的记忆库，也可以让团队共享一个记忆库：

```python
# 每个智能体使用自己的记忆库
researcher_tools = create_hindsight_tools(client=client, bank_id="researcher-memory")
writer_tools = create_hindsight_tools(client=client, bank_id="writer-memory")

# 团队共享记忆库
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
| `client` | `None` | 已配置的 Hindsight 客户端 |
| `hindsight_api_url` | `None` | API URL（未提供客户端时使用） |
| `api_key` | `None` | API 密钥（未提供客户端时使用） |
| `budget` | `"mid"` | Recall/Reflect 预算级别（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存入记忆时附加的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式（any/all/any\_strict/all\_strict） |
| `retain_metadata` | `None` | Retain 操作的默认元数据字典 |
| `retain_document_id` | `None` | Retain 操作的默认 `document_id`（用于对记忆分组或执行 upsert） |
| `recall_types` | `None` | 用于筛选的事实类型（world、experience、observation） |
| `recall_include_entities` | `False` | 在 Recall 结果中包含实体信息 |
| `reflect_context` | `None` | Reflect 操作的附加上下文 |
| `reflect_max_tokens` | `None` | Reflect 结果的最大 token 数（默认使用 `max_tokens`） |
| `reflect_response_schema` | `None` | 用于约束 Reflect 输出格式的 JSON Schema |
| `reflect_tags` | `None` | 用于筛选 Reflect 所用记忆的标签（默认使用 `recall_tags`） |
| `reflect_tags_match` | `None` | Reflect 的标签匹配模式（默认使用 `recall_tags_match`） |
| `include_retain` | `True` | 是否包含 Retain（存入）工具 |
| `include_recall` | `True` | 是否包含 Recall（检索）工具 |
| `include_reflect` | `True` | 是否包含 Reflect（综合推理）工具 |

### `configure()`

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | 生产环境 API | Hindsight API URL |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于身份认证的 API 密钥 |
| `budget` | `"mid"` | 默认 Recall 预算级别 |
| `max_tokens` | `4096` | Recall 的默认最大 token 数 |
| `tags` | `None` | Retain 操作的默认标签 |
| `recall_tags` | `None` | 默认的 Recall 筛选标签 |
| `recall_tags_match` | `"any"` | 默认标签匹配模式 |

## 环境要求 {#requirements}

- Python >= 3.10
- autogen-core >= 0.4.0
- hindsight-client >= 0.4.0
