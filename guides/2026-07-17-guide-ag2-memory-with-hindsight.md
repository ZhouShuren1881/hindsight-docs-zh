---
title: "指南：使用 Hindsight 为 AG2 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, ag2, agents, memory]
description: "使用 hindsight-ag2 包在 AG2 智能体上注册 Retain、Recall 和 Reflect 工具，让记忆跨对话延续。"
image: /img/guides/guide-ag2-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AG2 添加记忆](/img/guides/guide-ag2-memory-with-hindsight.svg)

如果想为 **AG2 接入 Hindsight 记忆**，最简便的方式是使用 `hindsight-ag2` 包。只需调用一次，它就会直接为 AG2 智能体注册三个由 Hindsight 支持的工具：Retain（存入）、Recall（召回）和 Reflect（反思）。这样，智能体就能在不同对话之间保留长期记忆，而不会在聊天结束时忘掉所有内容。

这很适合 AG2（社区维护的 AutoGen 分支），因为 AG2 已内置工具调用模式。这些工具是带有 `Annotated` 类型提示的普通 Python 函数，AG2 会根据这些提示生成供 LLM 使用的工具参数模式。智能体会决定何时存储事实、搜索以往记忆，或基于已有信息进行推理。

本指南将介绍如何安装包、注册工具、让 GroupChat 中的多个智能体共享一个记忆库，以及如何快速验证记忆确实在发挥作用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-ag2`。
> 2. 使用 `hindsight_api_url` 连接 Hindsight（自托管），或使用 API 密钥连接 Cloud。
> 3. 调用 `register_hindsight_tools(assistant, user_proxy, bank_id="my-bank")`。
> 4. 智能体现在可以使用 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。
> 5. 验证后续对话能否召回早先对话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认已准备好：

- Python 3.10 或更高版本
- 已安装 AG2（`ag2 >= 0.9.0`）
- 正在运行的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 步骤 1：安装软件包 {#step-1-install-the-package}

安装集成包：

```bash
pip install hindsight-ag2
```

该包提供 `register_hindsight_tools` 和 `create_hindsight_tools`，可将 Hindsight 的存入、召回和反思操作接入 AG2 的工具系统。

## 步骤 2：为智能体注册工具 {#step-2-register-the-tools-on-your-agents}

通过一次调用，将 Hindsight 工具同时注册到助手和执行智能体上：

```python
from autogen import AssistantAgent, UserProxyAgent, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    assistant = AssistantAgent(
        name="assistant",
        system_message="You are a helpful assistant with long-term memory.",
    )
    user_proxy = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
    )

# 在两个智能体上注册 Hindsight 记忆工具
register_hindsight_tools(
    assistant, user_proxy,
    bank_id="my-bank",
    hindsight_api_url="http://localhost:8888",
)

result = user_proxy.initiate_chat(
    assistant,
    message="Remember that I prefer Python over JavaScript.",
)
```

现在，助手可以使用 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。

## 步骤 3：配置连接 {#step-3-configure-the-connection}

你可以一次性进行全局配置，无需在每次调用时传入连接信息：

```python
from hindsight_ag2 import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",              # low / mid / high
    max_tokens=4096,
    tags=["source:ag2"],       # 存入操作的默认标签
)
```

构造函数参数会覆盖全局配置，因此你可以先设置默认值，再按需为每组工具调整 `budget`、`max_tokens` 或 `tags`。

## 工具如何使用记忆 {#how-the-tools-use-memory}

该集成提供三个兼容 AG2、由 Hindsight API 支持的工具函数：

- **`hindsight_retain(content)`** 会存储内容，并从原始文本中提取事实、实体和关系。
- **`hindsight_recall(query)`** 会执行语义检索、BM25、图遍历和重排序，然后返回编号排列的匹配记忆列表。
- **`hindsight_reflect(query)`** 会利用记忆库的性格倾向，根据所有相关记忆综合生成有推理依据的回答。

这些工具是带有 `Annotated` 类型提示的普通 Python 函数，因此 AG2 会自动生成供 LLM 使用的工具参数模式。智能体会自行决定何时调用每个工具。

如需了解更底层的行为，请参阅 Hindsight 的[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 在 GroupChat 中共享记忆 {#shared-memory-in-a-groupchat}

为多个智能体注册工具时使用同一个 `bank_id`，即可让它们共享一个记忆库：

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    researcher = AssistantAgent(name="researcher", system_message="You research topics.")
    writer = AssistantAgent(name="writer", system_message="You write content.")
    executor = UserProxyAgent(name="executor", human_input_mode="NEVER")

# 所有智能体共享同一个记忆库
for agent in [researcher, writer]:
    register_hindsight_tools(agent, executor, bank_id="team-memory")

group_chat = GroupChat(agents=[researcher, writer, executor], messages=[])
manager = GroupChatManager(groupchat=group_chat)
```

每个注册了 `bank_id="team-memory"` 的智能体都会读写同一个共享记忆库，因此一个智能体学到的事实也能供其他智能体使用。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 注册工具并开始聊天。
2. 告诉智能体一件需要记住的事，让它调用 `hindsight_retain`。
3. 结束这次对话。
4. 使用相同的 `bank_id` 开始一段新对话。
5. 询问智能体之前告诉过它的内容。

例如：

- 第一段对话说：“Remember that I prefer Python over JavaScript.”
- 第二段对话问：“What language do I prefer?”

如果智能体能召回先前存入的偏好，说明配置正常。

## 常见错误 {#common-mistakes}

### 不同运行使用了不同记忆库 {#using-a-different-bank-between-runs}

记忆的范围由 `bank_id` 决定。如果你在不同对话中更改了记忆库，第二次运行就无法召回第一次存入的内容。

### 忘记也在执行智能体上注册工具 {#forgetting-to-register-on-the-executor-too}

`register_hindsight_tools` 同时接收 LLM 侧的智能体和执行智能体。LLM 侧的智能体提出工具调用，执行智能体负责运行工具，因此两者都需要注册这些工具。

### 没有连接到正在运行的后端 {#not-pointing-at-a-running-backend}

这些工具会调用正在运行的 Hindsight API。运行前，请确认 `hindsight_api_url`（或你的 Cloud 凭据）指向可访问的服务器。

### 没有询问，却期待智能体主动召回 {#expecting-recall-without-asking}

智能体会自行决定何时调用工具。如果它始终没有召回记忆，可以提示它查找已知信息，或使用 `reflect` 对存储的记忆进行推理。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需将 `hindsight_api_url` 设置为服务器地址，例如 `http://localhost:8888`。

### 多个智能体可以共享记忆吗？ {#can-multiple-agents-share-memory}

可以。为每个智能体注册工具时使用同一个 `bank_id`，它们就会共用一个记忆库；GroupChat 模式正是这样工作的。

### 可以只安装部分工具吗？ {#can-i-install-only-some-of-the-tools}

可以。`create_hindsight_tools` 接受 `include_retain`、`include_recall` 和 `include_reflect` 参数，因此你可以只注册所需的工具。

### 如何控制召回深度？ {#how-do-i-control-recall-depth}

设置 `budget`（low / mid / high）和 `max_tokens`。这两个值既可以通过 `configure(...)` 全局设置，也可以通过 `create_hindsight_tools(...)` 为每组工具分别设置。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 Hindsight 的[召回 API](/developer/api/recall)。
- 查看 Hindsight 的[存入 API](/developer/api/retain)。
- 阅读 [AG2 集成文档](/sdks/integrations/ag2)。
