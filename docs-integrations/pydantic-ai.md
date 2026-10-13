---
sidebar_position: 6
title: "Pydantic AI 持久记忆Hindsight |整合"
description: "通过Hindsight为Pydantic AI智能体添加长期记忆。异步原生记忆存储、记忆召回和反思工具——在所有智能体运行中持久记忆，无需线程池黑客攻击。"
---

# Pydantic AI {#pydantic-ai}

持久记忆工具[Pydantic AI](https://ai.pydantic.dev/) 智能体，通过 Hindsight 提供记忆。通过记忆存储、记忆召回和反思，为您的智能体提供长期记忆——所有这些都是异步原生的，没有线程池黑客。

[查看更新日志 →](/changelog/integrations/pydantic-ai)

## 功能 {#features}

- **原生异步工具** — 使用Pydantic AI的异步工具接口直接（`aretain`，`arecall`，`areflect`)
- **记忆指令** — 自动将相关记忆注入到通过 运行的每个智能体中 `instructions=[...]`
- **三种记忆工具** — 记忆存储（存储）、记忆召回（搜索）、反思（综合） — 包括任意组合
- **简单配置** — 全局配置一次，或者直接传客户端
- **轻量** — 取决于 `pydantic-ai-slim` 避免拉入所有模型提供商

## 安装 {#installation}

```bash
pip install hindsight-pydantic-ai
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
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

result = await agent.run("关于我的喜好，你还记得什么？")
print(result.output)
```

智能体现在可以调用三个工具：

- **`hindsight_retain`** — 将信息存储到长期记忆中
- **`hindsight_recall`** — 在长期记忆中搜索相关事实
- **`hindsight_reflect`** — 根据记忆合成一个合理的答案

`memory_instructions` callable 会在每次运行时自动调用相关记忆并将其注入系统提示符中。

### 自托管（本地开发） {#self-hosting-local-development}

如果你通过以下命令在本地运行 Hindsight：`./scripts/dev/start-api.sh`，替换服务地址：

```python
client = Hindsight(base_url="http://localhost:8888")
```

参见[安装指南](/developer/installation) 用于自托管设置。

## 仅工具（无自动注射） {#tools-only-no-auto-injection}

如果你希望智能体决定何时使用记忆而不是总是注入上下文：

```python
agent = Agent(
    "openai:gpt-4o",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
)
```

## 仅说明（无工具） {#instructions-only-no-tools}

如果您只想自动注入记忆而不提供智能体显式记忆工具：

```python
agent = Agent(
    "openai:gpt-4o",
    instructions=[memory_instructions(client=client, bank_id="user-123")],
)
```

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
from hindsight_pydantic_ai import configure, create_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  #Hindsight Cloud（默认）
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 记忆召回预算：low/mid/high
    max_tokens=4096,               #记忆结果的最大 token 数数
    tags=["env:prod"],             #存储记忆的标签
    recall_tags=["scope:global"],  #要过滤的标签 记忆召回
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

#现在无需传递客户端即可创建工具 - 使用全局配置
tools = create_hindsight_tools(bank_id="user-123")
```

## 每个工具覆盖 {#per-tool-overrides}

构造函数参数覆盖全局配置：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    budget="high",             #覆盖全局预算
    max_tokens=8192,           #覆盖全局max_tokens
    tags=["session:abc"],      #覆盖全局标签
)
```

## 记忆指令选项 {#memory-instructions-options}

自定义注入哪些记忆以及如何注入：

```python
instructions_fn = memory_instructions(
    client=client,
    bank_id="user-123",
    query="有关用户的相关上下文",  #搜索什么
    budget="low",                              #保持快点
    max_results=5,                             #限制注入记忆
    max_tokens=4096,                           #最大记忆召回令牌
    prefix="Relevant memories:\n",             #记忆列表之前的文字
    tags=["scope:global"],                     #按标签过滤
    tags_match="any",                          #标签匹配模式
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
|`max_tokens`|`4096`|记忆识别结果的最大 token 数|
|`tags`|`None`|存储记忆时应用的标签|
|`recall_tags`|`None`|搜索时要过滤的标签|
|`recall_tags_match`|`"any"`|标签匹配模式|
|`include_retain`|`True`|包括记忆存储（存储）工具|
|`include_recall`|`True`|包括记忆召回（搜索）工具|
|`include_reflect`|`True`|包括 反思（综合）工具|

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
|`max_tokens`|`4096`|记忆识别结果的最大 token 数|
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
