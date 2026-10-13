---
sidebar_position: 13
title: "Strands 智能体 Hindsight 持久记忆 |整合"
description: "添加长期记忆Strands AgentsSDK智能体Hindsight。 使用记忆存储、记忆召回和反思工具Strands'本地@tool 跨会话持久记忆的模式。"
---

# Strands Agents {#strands-agents}

持久记忆工具[Strands Agents SDK](https://github.com/strands-agents/sdk-python)智能体，通过 Hindsight 提供记忆。通过记忆存储、记忆召回和反思来给予你的智能体长期记忆——使用Strands 原生 `@tool` 模式。

[查看更新日志 →](/changelog/integrations/strands)

## 功能 {#features}

- **原生 `@tool` 函数** - 工具很简单Python功能，兼容`Agent(tools=[...])`
- **记忆指令** - 预记忆召回注入智能体系统提示
- **三种记忆工具** - 记忆存储（存储）、记忆召回（搜索）、反思（综合）——包括任意组合
- **简单配置** - 全局配置一次，或者直接传一个客户端

## 安装 {#installation}

```bash
pip install hindsight-strands
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
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
agent("记住我更喜欢深色模式")
agent("我的偏好是什么？")
```

智能体现在可以调用三个工具：

- **`hindsight_retain`** — 将信息存储到长期记忆中
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆合成一个合理的答案

### 自托管（本地开发） {#self-hosting-local-development}

如果你通过以下命令在本地运行 Hindsight：`./scripts/dev/start-api.sh`，替换服务地址：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)
```

参见[安装指南](/developer/installation) 用于自托管设置。

## 带记忆指令 {#with-memory-instructions}

预记忆召回相关记忆并注入到系统提示中：

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
    system_prompt=f"你是一位乐于助人的助手。\n\n{memories}",
)
```

## FastAPI 生命周期（推荐） {#fastapi-lifecycle-recommended}

更喜欢创建一个共享Hindsight应用程序生命周期中的客户端和传递 `client=...`。
这通过提供了明确的所有权和干净的关闭 `await client.aclose()`。

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

如果你通过了`hindsight_api_url`/`api_key`直接`create_hindsight_tools()`,
`hindsight-strands` 在内部创建客户端。在这种情况下请致电 关机期间
`await tools.aclose()`（或`tools.close()`) 关机期间。

## 选择工具 {#selecting-tools}

仅包含您需要的工具：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  #省略反思工具
)
```

## 全局配置 {#global-configuration}

不要将连接详细信息传递给每个调用，而是配置一次：

```python
from hindsight_strands import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 记忆召回预算：low/mid/high
    max_tokens=4096,               #记忆结果的最大 token 数数
    tags=["env:prod"],             #存储记忆的标签
    recall_tags=["scope:global"],  #要过滤的标签 记忆召回
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

#现在创建工具而无需传递连接详细信息
tools = create_hindsight_tools(bank_id="user-123")
```

## 配置参考 {#configuration-reference}

### `create_hindsight_tools()` {#createhindsighttools}

|参数|默认|说明|
|---|---|---|
|`bank_id`|*必填*|Hindsight记忆库ID|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`budget`|`"mid"`|记忆召回与反思的预算级别 (low/mid/high)|
|`max_tokens`|`4096`|记忆结果的最大 token 数|
|`tags`|`None`|存储记忆时应用的标签|
|`recall_tags`|`None`|搜索时要过滤的标签|
|`recall_tags_match`|`"any"`|标签匹配模式|
|`enable_retain`|`True`|包括记忆存储（存储）工具|
|`enable_recall`|`True`|包括记忆召回（搜索）工具|
|`enable_reflect`|`True`|包括 反思（综合）工具|

### `memory_instructions()` {#memoryinstructions}

|参数|默认|说明|
|---|---|---|
|`bank_id`|*必填*|Hindsight记忆库ID|
|`client`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`None`|API 密钥（如果没有提供客户端则使用）|
|`query`|`"relevant context about the user"`|记忆注入的记忆召回查询|
|`budget`|`"low"`|记忆召回预算水平|
|`max_results`|`5`|注入的最大记忆|
|`max_tokens`|`4096`|记忆结果的最大 token 数|
|`prefix`|`"Relevant memories:\n"`|记忆列表之前的文本|
|`tags`|`None`|用于过滤记忆召回结果的标签|
|`tags_match`|`"any"`|标签匹配模式|

### `configure()` {#configure}

|参数|默认|说明|
|---|---|---|
|`hindsight_api_url`|Hindsight Cloud (`https://api.hindsight.vectorize.io`)|Hindsight API 网址|
|`api_key`|`HINDSIGHT_API_KEY`环境|API 用于身份验证的密钥|
|`budget`|`"mid"`|默认记忆召回预算水平|
|`max_tokens`|`4096`|记忆召回的默认最大 token 数|
|`tags`|`None`|记忆存储操作的默认标签|
|`recall_tags`|`None`|要过滤的默认标签 记忆召回|
|`recall_tags_match`|`"any"`|默认标签匹配模式|
|`verbose`|`False`|启用详细日志记录|

## 环境要求 {#requirements}

- Python >= 3.10
- strands-agents
- hindsight-client >= 0.4.0
- 正在运行 Hindsight API 服务器
