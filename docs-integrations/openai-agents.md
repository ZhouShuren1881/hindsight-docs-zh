---
sidebar_position: 13
title: "OpenAI智能体SDK持久记忆与Hindsight|整合"
description: "用Hindsight为OpenAI智能体SDK智能体添加长期记忆。提供用于记忆存储、记忆感知和反思的 FunctionTool 实例，可直接插入智能体 SDK 异步运行时。"
---

# OpenAI智能体SDK {#openai-agents-sdk}

持久的长期记忆[OpenAI Agents SDK](https://github.com/openai/openai-agents-python)智能体，通过 Hindsight 提供记忆。提供 `FunctionTool` 直接插入的实例OpenAI智能体SDK`Agent`。

[查看更新日志 →](/changelog/integrations/openai-agents)

## 功能 {#features}

- **记忆工具** — 记忆存储、记忆召回和反思OpenAI智能体SDK`FunctionTool` 与 兼容的实例 `Agent(tools=[...])`
- **原生异步** — 使用 直接 `aretain`，`arecall`，`areflect` — 在智能体中无缝工作SDK异步运行时
- **自动注入记忆** — 使用 `memory_instructions()` 每回合自动将相关记忆注入智能体的系统提示
- **选择性工具** — 仅包含您需要的工具 `include_retain/recall/reflect` 旗帜
- **按标签限定作用域** — 按主题、会话或带标签的用户对记忆进行分区
- **全局配置** — 使用 配置一次 `configure()`，随时随地创建工具

## 安装 {#installation}

```bash
pip install hindsight-openai-agents openai-agents
```

`hindsight-openai-agents`拉入`openai-agents` 和 `hindsight-client`。

## 快速入门 {#quick-start}

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
        instructions="你是一个有长期记忆力的得力助手。使用hindsight_retain来存储重要的事实。回答前使用hindsight_recall搜索记忆。",
        tools=tools,
    )

    #存储记忆
    result = await Runner.run(agent, "记住我更喜欢深色模式")
    print(result.final_output)

    #Hindsight 异步处理保留内容（事实提取、
    #实体解析、嵌入）。短暂的停顿确保回忆
    #在下一个记忆召回之前可搜索。在生产中，这种延迟只是
当记忆存储和记忆召回在同一个脚本中连续发生时需要
    #。
    await asyncio.sleep(3)

    #稍后再回忆
    result = await Runner.run(agent, "我的 UI 偏好是什么？")
    print(result.final_output)

    #清理
    await client.aclose()

asyncio.run(main())
```

:::tip Jupyter 笔记本
如果您在 Jupyter 笔记本中运行，则不需要 `asyncio.run()` — 只需使用 `await` 直接在单元格中，因为笔记本已经有一个活动的事件循环。
:::

智能体拥有三个可以调用的工具：

- **`hindsight_retain`** — 将信息存储到长期记忆中
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆合成一个合理的答案

## 使用自动注入记忆 `memory_instructions()` {#auto-inject-memories-with-memoryinstructions}

而不是依靠智能体来调用`hindsight_recall`明确地说，你可以在每次回合中自动将相关记忆注入到系统提示中：

```python
from hindsight_openai_agents import create_hindsight_tools, memory_instructions

agent = Agent(
    name="assistant",
    instructions=memory_instructions(
        client=client,
        bank_id="user-123",
        base_instructions="你是一个有长期记忆的得力助手。",
    ),
    tools=create_hindsight_tools(
        client=client,
        bank_id="user-123",
        include_recall=False,  #memory_instructions 处理的记忆召回
    ),
)
```

`memory_instructions()` 返回与 兼容的异步可调用对象 `Agent(instructions=...)`。每回合它都会调用相关记忆并将其附加到您的基本指令中。如果记忆失败或没有返回任何内容，它会优雅地回落到 `base_instructions` 独自一人。

## 选择工具 {#selecting-tools}

仅包含您需要的工具：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  #省略反思工具
)
```

## 全局配置 {#global-configuration}

不要将客户端传递给每个调用，而是配置一次：

```python
from hindsight_openai_agents import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 记忆召回预算：low/mid/high
    max_tokens=4096,               #记忆识别结果的最大 token 数
    tags=["env:prod"],             #存储记忆的标签
    recall_tags=["scope:global"],  #要过滤的标签 记忆召回
    recall_tags_match="any",       #标签匹配模式
)

#现在无需传递客户端即可创建工具 - 使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## 记忆用标签界定范围 {#memory-scoping-with-tags}

使用标签按主题、会话或用户对记忆进行分区：

```python
#存储按来源标记的记忆
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

工具将错误作为工具错误结果呈现给智能体。 OpenAI智能体SDK自动捕获工具中的异常并将其作为错误字符串返回，从而使智能体能够优雅地处理故障：

```python
from hindsight_openai_agents.errors import HindsightError

#智能体将看到错误消息并可以决定如何继续
result = await Runner.run(agent, "你还记得我什么？")
print(result.final_output)
```

### 记忆库生命周期 {#bank-lifecycle}

首次使用前创建记忆库并在完成后清理：

```python
async def main():
    client = Hindsight(base_url="http://localhost:8888")

    #创建记忆库（幂等）
    await client.acreate_bank(bank_id="user-123")

    tools = create_hindsight_tools(client=client, bank_id="user-123")
    #...使用工具...

    #可选：不再需要时删除记忆库
    await client.adelete_bank(bank_id="user-123")
```

### 多元智能体工作流程 {#multi-agent-workflows}

给每个智能体自己的记忆库，或者跨智能体共享一个记忆库：

```python
#每个智能体记忆
researcher_tools = create_hindsight_tools(client=client, bank_id="researcher-memory")
writer_tools = create_hindsight_tools(client=client, bank_id="writer-memory")

#共享记忆
shared_tools = create_hindsight_tools(
    client=client,
    bank_id="team-shared",
    tags=["team:content"],
)
```

## API参考 {#api-reference}

### `create_hindsight_tools()` {#createhindsighttools}

|参数|默认|说明|
|---|---|---|
|`bank_id`|*必填*|Hindsight记忆库ID|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`budget`|`"mid"`|记忆召回与反思的预算级别 (low/mid/high)|
|`max_tokens`|`4096`|记忆召回结果的最大 token 数|
|`tags`|`None`|存储记忆时应用的标签|
|`recall_tags`|`None`|搜索时要过滤的标签|
|`recall_tags_match`|`"any"`|标签匹配模式 (any/all/any\_strict/all\_strict)|
|`retain_metadata`|`None`|记忆存储操作的默认元数据字典|
|`retain_document_id`|`None`|记忆存储的默认文档\_id (groups/upserts 记忆)|
|`recall_types`|`None`|要过滤的事实类型（世界、经验、观察）|
|`recall_include_entities`|`False`|在记忆结果中包含实体信息|
|`reflect_context`|`None`|指导操作的附加上下文|
|`reflect_max_tokens`|`None`|回忆结果的最大 token 数（默认为 `max_tokens`)|
|`reflect_response_schema`|`None`|JSON 约束输出格式的模式|
|`reflect_tags`|`None`|过滤回忆中使用的标签（默认为`recall_tags`)|
|`reflect_tags_match`|`None`|标签匹配 ⟪ （默认为 `recall_tags_match`)|
|`include_retain`|`True`|包括记忆存储（存储）工具|
|`include_recall`|`True`|包括记忆召回（搜索）工具|
|`include_reflect`|`True`|包括“合成”工具|

### `memory_instructions()` {#memoryinstructions}

|参数|默认|说明|
|---|---|---|
|`bank_id`|*必填*|Hindsight 记忆 记忆库 到 记忆召回 从|
|`base_instructions`|`""`|记忆之前的静态指令|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`query`|`"relevant context about the user"`|记忆召回查询以查找相关记忆|
|`budget`|`"mid"`|记忆召回预算水平 (low/mid/high)|
|`max_results`|`5`|包含的最大记忆数|
|`max_tokens`|`4096`|记忆召回结果的最大 token 数|
|`prefix`|`"\n\nRelevant memories:\n"`|记忆列表之前的文本|
|`tags`|`None`|搜索时要过滤的标签|
|`tags_match`|`"any"`|标签匹配模式|

### `configure()` {#configure}

|参数|默认|说明|
|---|---|---|
|`hindsight_api_url`|生产API|Hindsight API 网址|
|`api_key`|`HINDSIGHT_API_KEY`环境|API 用于身份验证的密钥|
|`budget`|`"mid"`|默认记忆召回预算水平|
|`max_tokens`|`4096`|记忆召回的默认最大 token 数|
|`tags`|`None`|记忆存储操作的默认标签|
|`recall_tags`|`None`|要过滤的默认标签 记忆召回|
|`recall_tags_match`|`"any"`|默认标签匹配模式|

## 环境要求 {#requirements}

- Python >= 3.10
- openai-智能体>= 0.7.0
- hindsight-client >= 0.4.0
