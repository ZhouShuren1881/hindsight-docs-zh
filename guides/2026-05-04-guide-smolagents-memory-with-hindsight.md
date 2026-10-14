---
title: "指南：使用 Hindsight 为 SmolAgents 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, smolagents, agent-frameworks, memory]
description: "使用原生 Tool 子类、可选的记忆指令，以及供重复运行使用的稳定记忆库 ID，为 SmolAgents 添加 Hindsight 持久记忆。"
image: /img/guides/guide-smolagents-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 SmolAgents 添加持久记忆](/img/guides/guide-smolagents-memory-with-hindsight.webp)

如果你想为 **SmolAgents 添加 Hindsight 持久记忆**，最简洁的做法是创建 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）工具，然后可选地通过 `memory_instructions()` 将召回的记忆预先注入系统提示词。这样，SmolAgents 就能拥有长期记忆，而无需改变智能体循环的其他部分。

这种模式很适合 SmolAgents，因为该集成使用原生 Tool 子类。你可以保留熟悉的 CodeAgent 流程，同时在其后添加持久记忆层。

如果你希望工作时随手查阅参考资料，可以打开 [SmolAgents 集成文档](/sdks/integrations/smolagents)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 SmolAgents 集成或插件。
> 2. 将其连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 SmolAgents 运行时。
> 4. 存入一条偏好或项目事实，然后启动一次新的运行。
> 5. 确认 Recall 会自动恢复此前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

SmolAgents 围绕工具设计，因此 Hindsight 可以顺畅接入。智能体需要时可以直接调用记忆工具；也可以通过简单的指令字符串，在每次运行开始时预先提供最相关的上下文。

## 前提条件 {#prerequisites}

- 一个可用的 SmolAgents 智能体，例如 `CodeAgent`。
- 已安装 Python 和 `hindsight-smolagents`。
- 为同一用户、项目或助手准备一个在多次运行间保持稳定的记忆库 ID。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-smolagents
```

## 步骤 2：连接 SmolAgents 与 Hindsight {#step-2-connect-smolagents-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)——提供免费套餐，无需自托管。

```python
from hindsight_smolagents import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 也可以设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

如果你选择在本地自托管 Hindsight，请将 API URL 改为 `http://localhost:8888`，并移除 `api_key`。

如果你愿意，也可以跳过全局配置，直接将 `hindsight_api_url` 传给 `create_hindsight_tools()`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from smolagents import CodeAgent, HfApiModel
from hindsight_smolagents import create_hindsight_tools, memory_instructions

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

agent = CodeAgent(
    tools=tools,
    model=HfApiModel(),
    system_prompt=f"You are a helpful assistant.

{memories}",
)
```

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

如果你希望跨任务记住同一个人，请为每位用户使用一个记忆库。如果同一用户会在互不相关的上下文之间切换，请为每个项目使用一个记忆库。关键是，工具和可选的记忆指令必须使用相同的记忆库键。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 要求智能体记住一项偏好或可复用的项目事实。
2. 再次运行智能体，并询问这项信息。
3. 确认 Recall 能通过注入的上下文或工具调用找到此前的记忆。
4. 如果要测试多个用户，请切换记忆库 ID，并确认各自的记忆彼此隔离。

如果第二次运行能根据第一次运行中的细节作答，说明配置正常。如果不能，请开启调试日志，检查配置的记忆库 ID，并确认 Retain 调用确实已完成。

## 常见错误 {#common-mistakes}

- 在工具和 `memory_instructions()` 中传入不同的记忆库 ID。
- 只使用工具，却期待系统自动注入提示词。
- 应用实际需要按用户隔离，却让 Recall 使用范围宽泛的共享记忆库。

## 常见问题 {#faq}

### 必须使用记忆指令吗？ {#do-i-need-to-use-memory-instructions}

不需要。只有在你希望智能体开始推理前自动注入上下文时，才使用它们。

### 可以只使用 Recall 和 Retain 吗？ {#can-i-use-only-recall-and-retain}

可以。`create_hindsight_tools()` 允许你只加入所需的工具。

### 这只适用于 CodeAgent 吗？ {#is-this-limited-to-codeagent}

不适用。该集成遵循 SmolAgents 的工具模型，因此同一组记忆工具也可以用于其他接受工具的智能体。

## 后续步骤 {#next-steps}

- 如果你需要托管的记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照 [Agno 持久记忆工作流](/blog/2026/04/09/agno-persistent-memory)。
