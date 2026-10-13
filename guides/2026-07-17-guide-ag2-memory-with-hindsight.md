---
title: "指南：使用 Hindsight 为 AG2 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, ag2, agents, memory]
description: "通过 hindsight-ag2 在 AG2 智能体注册存储、召回和反思工具，让记忆跨对话延续。"
image: /img/guides/guide-ag2-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AG2 添加记忆](/img/guides/guide-ag2-memory-with-hindsight.svg)

如需 **AG2 与 Hindsight 记忆**，使用 `hindsight-ag2`，一次调用直接注册三个工具：记忆存储、召回和反思，跨对话长期保存。

AG2 是社区 AutoGen 分支，内置工具调用模式。工具是带 `Annotated` 类型提示的 Python 函数，AG2 自动生成 LLM 模式，智能体决定何时存储、搜索或推理。

本指南介绍安装、注册、GroupChat 共享和验证。可参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-ag2`.
> 2. 用 `hindsight_api_url` 指向自托管，或 API 密钥连接 Cloud。
> 3. 调用 `register_hindsight_tools(assistant, user_proxy, bank_id="my-bank")`。
> 4. 现在有 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。
> 5. 验证后续对话召回此前存储。

## 前提条件 {#prerequisites}

开始前确认：

- Python 3.10 或更高。
- AG2（`ag2 >= 0.9.0`）。
- 运行中的 [Hindsight Cloud](https://hindsight.vectorize.io)或自托管后端。

## 步骤 1：安装包 {#step-1-install-the-package}

安装集成包。

```bash
pip install hindsight-ag2
```

它提供 `register_hindsight_tools` 和 `create_hindsight_tools`，将存储、召回和反思接入工具系统。

## 步骤 2：为智能体注册工具 {#step-2-register-the-tools-on-your-agents}

一次为助手和执行智能体注册：

```python
from autogen import AssistantAgent, UserProxyAgent, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    assistant = AssistantAgent(
        name="assistant",
        system_message="你是一位具有长期记忆、乐于助人的助手。",
    )
    user_proxy = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
    )

# 为两个智能体注册 Hindsight 记忆工具 {#register-hindsight-memory-tools-on-both-agents}
register_hindsight_tools(
    assistant, user_proxy,
    bank_id="my-bank",
    hindsight_api_url="http://localhost:8888",
)

result = user_proxy.initiate_chat(
    assistant,
    message="记住，我比起 JavaScript 更喜欢 Python。",
)
```

助手现在可使用 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。

## 步骤 3：配置连接 {#step-3-configure-the-connection}

可以全局配置一次，而非每次传入：

```python
from hindsight_ag2 import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",              # low / mid / high
    max_tokens=4096,
    tags=["source:ag2"],       # 存储默认标签
)
```

构造参数覆盖全局，必要时每组工具调整 `budget`、`max_tokens` 或 `tags`。

## 工具如何使用记忆 {#how-the-tools-use-memory}

集成提供三个兼容 AG2、由 API 支持的函数：

- **`hindsight_retain(content)`** 存储内容，从原文提取事实、实体和关系。
- **`hindsight_recall(query)`** 执行语义搜索、BM25、图遍历和重排序，返回编号列表。
- **`hindsight_reflect(query)`** 根据相关记忆和记忆库倾向综合推理回答。

带 `Annotated` 的普通函数让 AG2 自动生成模式，智能体选择调用时机。

底层行为见[记忆召回 API](/developer/api/recall)和[记忆存储 API](/developer/api/retain)。

## GroupChat 中的共享记忆 {#shared-memory-in-a-groupchat}

相同 `bank_id` 注册即可多智能体共享：

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    researcher = AssistantAgent(name="researcher", system_message="你负责研究主题。")
    writer = AssistantAgent(name="writer", system_message="你负责撰写内容。")
    executor = UserProxyAgent(name="executor", human_input_mode="NEVER")

# 所有智能体共享相同记忆库 {#all-agents-share-the-same-memory-bank}
for agent in [researcher, writer]:
    register_hindsight_tools(agent, executor, bank_id="team-memory")

group_chat = GroupChat(agents=[researcher, writer, executor], messages=[])
manager = GroupChatManager(groupchat=group_chat)
```

注册 `bank_id="team-memory"` 的智能体读写同库，彼此可使用学到的事实。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 注册工具并聊天。
2. 告知应记住内容，让它调用 `hindsight_retain`。
3. 结束对话。
4. 同一 `bank_id` 新对话。
5. 询问此前内容。

例如：

- 第一段：“记住，我比起 JavaScript 更喜欢 Python。”
- 第二段：“我喜欢什么语言？”

召回此前偏好就有效。

## 常见错误 {#common-mistakes}

### 运行间改用不同记忆库 {#using-a-different-bank-between-runs}

范围由 `bank_id` 决定，更改后第二次不会召回第一次。

### 忘记为执行者注册 {#forgetting-to-register-on-the-executor-too}

函数接收 LLM 侧和执行智能体，前者提出调用、后者执行，所以都需注册。

### 未指向运行后端 {#not-pointing-at-a-running-backend}

工具调用实际 API，运行前确保 URL 或 Cloud 凭据指向可达服务。

### 不提示却期待召回 {#expecting-recall-without-asking}

智能体决定何时调用，从不召回时提示查询已有知识，或用 `reflect` 推理。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，设置 `hindsight_api_url` 为自托管地址，如 `http://localhost:8888`。

### 多智能体可共享吗？ {#can-multiple-agents-share-memory}

可以，同一 `bank_id` 注册，就是 GroupChat 模式。

### 可仅安装部分工具吗？ {#can-i-install-only-some-of-the-tools}

可以，`create_hindsight_tools` 接受 `include_retain`、`include_recall`、`include_reflect`。

### 如何控制深度？ {#how-do-i-control-recall-depth}

设 `budget`（low / mid / high）和 `max_tokens`，可全局或每组配置。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [AG2 集成文档](/sdks/integrations/ag2)。
