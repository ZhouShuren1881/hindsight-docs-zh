---
title: "指南：使用 Hindsight 为 Haystack 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, haystack, agents, memory]
description: "通过 hindsight-haystack 让智能体跨轮次召回相关记忆、保存新事实。"
image: /img/guides/guide-haystack-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Haystack 添加记忆](/img/guides/guide-haystack-memory-with-hindsight.svg)

包为任意 Agent 提供存储、召回和反思长期记忆，跨轮次会话。

两模式：工具列表由模型直接调用；HindsightMemoryWrapper Toolset 同工具加可选每轮前自动召回、之后存储消息。

本指南介绍安装、连接、接入和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-haystack`.
> 2. 创建后端客户端，base_url 或 Cloud 环境密钥。
> 3. create_hindsight_tools 创建。
> 4. 传 Agent 或包装器自动。
> 5. 验证后续。

## 前提条件 {#prerequisites}

开始前确认：

- Python 3.10+。
- haystack-ai >= 2.12.0。
- 依赖安装的 hindsight-client >= 0.4.0。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：安装包 {#step-1-install-the-package}

安装：

```bash
pip install hindsight-haystack
```

自动安装客户端。

## 步骤 2：连接 {#step-2-point-it-at-hindsight}

自托管客户端传 base_url：

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

Cloud 默认 URL、环境密钥回退，也可 configure 一次省参数：

```python
from hindsight_haystack import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    tags=["source:haystack"],
    context="my-app",
    mission="跟踪用户偏好",
)
```

之后只需 ID。

## 步骤 3：添加工具 {#step-3-add-memory-tools-to-your-agent}

创建传 Agent：

```python
from hindsight_haystack import create_hindsight_tools
from haystack.components.agents import Agent
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="跟踪用户偏好",
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=tools,
    system_prompt=(
        "你是一位有长期记忆、乐于助人的助手。"
        "用 retain_memory 存储重要事实。"
        "回答前用 recall_memory 搜索记忆。"
    ),
)

result = agent.run(messages=[ChatMessage.from_user("记住，我喜欢深色模式")])
print(result["messages"][-1].text)
```

仅存储召回，移除反思：

```python
# 仅存储和召回 {#only-retain--recall-no-reflect}
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

## 记忆如何工作 {#how-memory-works}

工具由模型决定存事实、搜上下文、反思，ID 隔离。

不依赖模型可包装器自动：

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="跟踪用户偏好",
    auto_recall=True,   # 每轮前注入
    auto_retain=True,   # 每轮后存用户和助手消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="你是一位有长期记忆、乐于助人的助手。",
)

# 用 toolset.run() 自动执行 {#use-toolsetrun-for-automatic-memory-behavior}
result = toolset.run(agent, messages=[ChatMessage.from_user("我喜欢深色模式")])
```

自动需 toolset.run 而非直接 agent.run。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 告知“记住，我喜欢深色模式”。
2. 工具或自动存储。
3. 新轮次询问。
4. 确认。

例如：

- 首轮存深色偏好。
- 第二问界面偏好。

呈现即有效。

## 常见错误 {#common-mistakes}

### agent.run 期待自动 {#expecting-auto-behavior-from-agentrun}

包装器直接调用仅工具，自动需 toolset.run。

### 所有用户同库 {#reusing-one-bank-for-every-user}

会混合，按用户或智能体独立。

### 假定模型总调用 {#assuming-the-model-always-calls-the-tools}

工具模式需提示指导，否则可能跳过，或包装器自动。

### 后端错误 {#forgetting-to-point-at-the-right-backend}

默认 Cloud，自托管需 base_url 或 configure。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管 URL。

### 工具和包装器区别？ {#what-is-the-difference-between-the-tools-and-the-wrapper}

工具自主，包装器同工具加自动。

### 如何限定？ {#how-is-memory-scoped}

ID 每用户智能体独立。

### 可只存储召回？ {#can-i-use-only-retain-and-recall}

include_reflect=False 即可。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Haystack 集成文档](/sdks/integrations/haystack)。
