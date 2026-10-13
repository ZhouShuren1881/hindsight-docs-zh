---
title: "指南：使用 Hindsight 为 SmolAgents 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, smolagents, agent-frameworks, memory]
description: "通过原生 Tool 子类、可选记忆指令和重复运行的稳定 ID，为 SmolAgents 添加 Hindsight 持久记忆。"
image: /img/guides/guide-smolagents-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 SmolAgents 添加持久记忆](/img/guides/guide-smolagents-memory-with-hindsight.webp)

如需 **SmolAgents 与 Hindsight 持久记忆**，创建存储、召回和反思工具，可选通过 `memory_instructions()` 预先注入系统提示词，无需改变其他循环。

集成使用原生 Tool 子类，在熟悉的 CodeAgent 流程后添加持久层。

操作时可参考 [SmolAgents 集成文档](/sdks/integrations/smolagents)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 SmolAgents 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 SmolAgents。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

SmolAgents 围绕工具设计，可直接接入 Hindsight。必要时调用工具，简单指令字符串可在运行开始前提供最相关上下文。

## 前提条件 {#prerequisites}

- 可用 SmolAgents 智能体，如 `CodeAgent`。
- 已安装 Python 和 `hindsight-smolagents`。
- 同一用户、项目或助手跨运行稳定 ID。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-smolagents
```

## 步骤 2：连接 SmolAgents 与 Hindsight {#step-2-connect-smolagents-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
from hindsight_smolagents import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

本地自托管时换为 `http://localhost:8888`，移除 `api_key`。

也可跳过全局配置，直接向 `create_hindsight_tools()` 传 `hindsight_api_url`。

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
    system_prompt=f"你是一位乐于助人的助手。

{memories}",
)
```

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

跨任务记住同一人时按用户；单用户跨无关上下文时按项目。工具和可选指令必须用相同键。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 要求记住偏好或可重用项目事实。
2. 再运行并询问细节。
3. 确认通过注入或工具找到此前记忆。
4. 多用户时切换 ID，验证隔离。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 工具与 `memory_instructions()` 使用不同 ID。
- 仅用工具，却期待自动注入。
- 应用需要隔离，却使用广泛共享库。

## 常见问题 {#faq}

### 必须用记忆指令吗？ {#do-i-need-to-use-memory-instructions}

不是。需要推理前自动注入时才使用。

### 可只用召回和存储吗？ {#can-i-use-only-recall-and-retain}

可以，`create_hindsight_tools()` 可只包含所需工具。

### 仅限 CodeAgent 吗？ {#is-this-limited-to-codeagent}

不是，原生工具模型也适合其他接受工具的智能体。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)。
