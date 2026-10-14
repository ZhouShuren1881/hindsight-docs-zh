---
title: "指南：使用 Hindsight 为 Microsoft Agent Framework 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agent-framework, agents, memory]
description: "使用 hindsight-agent-framework 上下文提供商为 Microsoft Agent Framework 添加记忆，让每次智能体运行前自动召回相关上下文，并在运行后存入对话内容。"
image: /img/guides/guide-agent-framework-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Microsoft Agent Framework 添加记忆](/img/guides/guide-agent-framework-memory-with-hindsight.svg)

如果你想为 **Microsoft Agent Framework 接入 Hindsight 记忆**，最简洁的方式是使用 `hindsight-agent-framework` 上下文提供商。将 `HindsightProvider` 传给智能体的 `context_providers` 后，每次运行前都会把相关记忆召回到智能体上下文中，运行结束后再存入对话内容。这样，智能体便能在多次运行和不同进程之间保留长期记忆，不会在会话之间遗忘一切。

这种方式很适合 Agent Framework，因为该集成以上下文提供商的形式接入，无需运行 MCP 服务器，也不需要模型记住要调用哪个工具。Recall 和 Retain 会在框架的 `before_run` 和 `after_run` 钩子中自动执行，并且都采用尽力而为的方式，因此记忆暂时不可用也不会阻止智能体运行。

本指南将介绍如何安装提供商、将其连接到 Hindsight 后端、了解记忆库如何限定记忆范围，以及如何快速验证记忆确实正在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)备用。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-agent-framework`。
> 2. 设置 `HINDSIGHT_API_KEY`（Cloud），或传入 `hindsight_api_url=`（自托管）。
> 3. 将 `HindsightProvider(bank_id="user-123")` 加入智能体的 `context_providers`。
> 4. 正常运行智能体——每次运行都会自动 Recall 和 Retain。
> 5. 验证后续运行能否记起之前存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保你具备以下条件：

- 一个可以添加上下文提供商的 Microsoft Agent Framework 智能体
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 一个 Hindsight API 密钥（Cloud）或自托管服务器 URL

## 步骤 1：安装提供商 {#step-1-install-the-provider}

安装集成包。

```bash
pip install hindsight-agent-framework
```

`hindsight-agent-framework` 会提供一个可附加到智能体的 `HindsightProvider`。它不会改变智能体的构建或运行方式，而是包装每次运行，在运行前召回记忆、运行后存入记忆。

## 步骤 2：将提供商连接到 Hindsight {#step-2-point-the-provider-at-hindsight}

使用 Hindsight Cloud 时，只需设置一次 API 密钥：

```bash
export HINDSIGHT_API_KEY=your-hindsight-key
```

然后将提供商附加到智能体：

```python
from agent_framework.openai import OpenAIChatClient
from hindsight_agent_framework import HindsightProvider

agent = OpenAIChatClient().as_agent(
    name="assistant",
    instructions="You are a helpful assistant.",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("Remember that I prefer vegetarian food.", session=session)
await agent.run("Suggest a recipe.", session=session)  # recalls the preference
```

若使用自托管的 Hindsight 服务器，请先在本地运行服务器，再将提供商指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

## 提供商如何使用记忆 {#how-the-provider-uses-memory}

由于该提供商接入了 Agent Framework 的运行生命周期，因此会在框架提供的两个时点执行操作：

- **Recall（`before_run`）：** 查询与用户消息相关的记忆，并将其作为 `## Memories` 区块注入智能体指令，让模型在本次运行中看到这些记忆。
- **Retain（`after_run`）：** 运行结束时，将用户输入和智能体回复存入记忆，以便后续运行基于这些内容继续交互。

无需 MCP，也无需模型记住要调用哪个工具——Recall 和 Retain 都会自动执行。两者都采用尽力而为的方式，因此记忆暂时不可用也不会阻止智能体运行。

如需了解更底层的行为，请阅读 [Hindsight Recall API](/developer/api/recall) 和 [Hindsight Retain API](/developer/api/retain)。

## 记忆库 {#memory-banks}

记忆存放在 Hindsight **记忆库**中，你可以通过 `bank_id` 选择范围：每位用户、每个智能体或每个会话各使用一个记忆库。在上面的示例中，`bank_id="user-123"` 会为该用户提供独立的记忆存储。

除了 `bank_id`，提供商还接受其他参数。`HindsightProvider(bank_id, ...)` 还支持 `client`、`hindsight_api_url`、`api_key`、`budget`（low/mid/high）、`max_tokens`、`context`、`tags`、`recall_tags`、`recall_tags_match`、`mission`（以事实提取角色创建记忆库）、`auto_recall`、`auto_retain` 和 `source_id`。你可以通过 `configure(...)` 设置进程级默认值。

完整选项列表请参阅[集成源码](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/agent-framework)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 将 `HindsightProvider(bank_id="user-123")` 附加到智能体
2. 运行智能体，让它记录一项偏好或事实
3. 使用相同的 `bank_id` 再次运行智能体
4. 询问之前记录的内容

例如：

- 第一次运行时，让智能体“Remember that I prefer vegetarian food.”
- 第二次运行时，让它“Suggest a recipe.”

如果第二次运行能体现之前的偏好，说明配置已生效。由于 Retain 会将内容持久存入记忆库，即使在不同进程之间也能保持这一效果。

## 常见错误 {#common-mistakes}

### 多次运行使用了不同的 `bank_id` {#using-a-different-bank_id-between-runs}

记忆范围由 `bank_id` 决定。如果第二次运行使用了不同的记忆库，就无法召回第一次运行存入的内容。

### 期待模型调用工具 {#expecting-the-model-to-call-a-tool}

模型没有可调用的记忆工具。Recall 和 Retain 会在运行钩子中自动执行——你只需附加提供商即可。

### 忘记设置凭据 {#forgetting-to-set-credentials}

使用 Cloud 时设置 `HINDSIGHT_API_KEY`；自托管时向提供商传入 `hindsight_api_url=`，必要时还需传入 `api_key=`。

### 没有将提供商附加到智能体 {#not-attaching-the-provider-to-the-agent}

必须将提供商放入智能体的 `context_providers` 列表中。仅创建提供商却没有将其附加到智能体，不会触发 Recall 或 Retain。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以使用自托管的 Hindsight 服务器——运行 `hindsight-api`，并将 `hindsight_api_url=` 传给提供商。

### 这会改变我构建智能体的方式吗？ {#does-this-change-how-i-build-agents}

不会。只需附加一个上下文提供商，然后照常运行智能体。无需 MCP 服务器，也不需要模型调用工具。

### 记忆范围由什么决定？ {#how-is-memory-scoped}

由传给 `HindsightProvider` 的 `bank_id` 决定——每位用户、每个智能体或每个会话各使用一个记忆库。

### 我可以关闭 Recall 或 Retain 吗？ {#can-i-turn-recall-or-retain-off}

可以。提供商接受 `auto_recall` 和 `auto_retain` 选项，因此你可以分别控制是否自动执行这两项操作。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight Recall API](/developer/api/recall)
- 查看 [Hindsight Retain API](/developer/api/retain)
- 阅读 [Microsoft Agent Framework 集成文档](/sdks/integrations/agent-framework)
