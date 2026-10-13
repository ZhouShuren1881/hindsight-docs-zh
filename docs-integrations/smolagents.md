---
sidebar_position: 12
title: "SmolAgents 持久记忆与 Hindsight |整合"
description: "使用Hindsight记忆存储、记忆召回和反思工具向 HuggingFace SmolAgents 添加长期记忆 - 您的智能体可以直接调用的嵌入式工具子类。"
---

# SmolAgents {#smolagents}

持久记忆工具[SmolAgents](https://github.com/huggingface/smolagents) 智能体，通过 Hindsight 提供记忆。使用 SmolAgents 的原生工具模式，通过记忆存储、记忆召回和反思，为您的智能体提供长期记忆。

[查看更新日志 →](/changelog/integrations/smolagents)

## 功能 {#features}

- **原生工具子类** - 每个工具都扩展了 SmolAgents `Tool`基类
- **记忆指令** - 预记忆召回注入智能体系统提示
- **三种记忆工具** - 记忆存储（存储）、记忆召回（搜索）、反思（综合）——包括任意组合
- **工厂函数** - 通过共享配置在一次调用中创建所有工具
- **简单配置** - 全局配置一次，或者直接传一个客户端

## 安装 {#installation}

```bash
pip install hindsight-smolagents
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
:::

```python
from smolagents import CodeAgent, HfApiModel
from hindsight_smolagents import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)

agent = CodeAgent(
    tools=tools,
    model=HfApiModel(),
)

agent.run("记住我更喜欢深色模式")
agent.run("我的偏好是什么？")
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
    hindsight_api_url="https://api.hindsight.vectorize.io",
)
```

参见[安装指南](/developer/installation) 用于自托管设置。

## 带记忆指令 {#with-memory-instructions}

预记忆召回相关记忆并注入到系统提示中：

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
    system_prompt=f"你是一位乐于助人的助手。\n\n{memories}",
)
```

## 个人工具 {#individual-tools}

您也可以直接使用工具类：

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

仅包含您需要的工厂工具：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  #省略反思工具
)
```

## 全局配置 {#global-configuration}

不要将连接详细信息传递给每个工具，而是配置一次：

```python
from hindsight_smolagents import configure, create_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
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
|`max_tokens`|`4096`|记忆识别结果的最大 token 数|
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

## 环境要求 {#requirements}

- Python >= 3.10
- smolagents
- hindsight-client >= 0.4.0
- A 正在运行 Hindsight API 服务器
