---
title: "指南：使用 Hindsight 为 Strands 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, strands, agent-frameworks, memory]
description: "通过原生工具、可选记忆指令，以及按用户划分且在智能体会话间保持稳定的记忆库，为 Strands 添加 Hindsight 持久记忆。"
image: /img/guides/guide-strands-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Strands 添加持久记忆](/img/guides/guide-strands-memory-with-hindsight.webp)

如果你想为 **Strands 添加 Hindsight 持久记忆**，最简单的做法是创建 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）工具，然后按需通过 `memory_instructions()` 将召回的记忆加入系统提示。这样，Strands 智能体就能在不同会话之间保持持续记忆，同时其余 SDK 用法仍然熟悉。

这种集成很自然，因为 Strands 智能体本来就把工具当作普通函数。Hindsight 可以直接接入这种模式，无需在智能体运行时中另行加入记忆守护进程。

操作时可将[Strands 集成文档](/sdks/integrations/strands)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)放在手边，随时查阅。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Strands 集成或插件。
> 2. 将其连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 Strands 运行时。
> 4. 在首次运行时存储一项偏好或项目事实，然后开始一次全新的运行。
> 5. 确认 Recall 会自动恢复先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Strands SDK 已经对工具和提示的用法做了明确约定，因此 Hindsight 只需两个接入点：用于显式记忆操作的工具函数，以及用于自动召回的可选注入指令。这样一来，集成接口既精简又易于预测。

## 前提条件 {#prerequisites}

- 一个可用的 Strands 智能体
- 已安装 Python 和 `hindsight-strands`
- 一套为同一用户或项目保持稳定的记忆库 ID 规则

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-strands
```

## 步骤 2：连接 Strands 与 Hindsight {#step-2-connect-strands-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费套餐，无需自托管。

```python
from hindsight_strands import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

如果你改为在本地自托管 Hindsight，请将 API URL 换成 `http://localhost:8888`，并移除 `api_key`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from strands import Agent
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
    system_prompt=f"You are a helpful assistant.

{memories}",
)
```

如果你不需要自动注入，可以移除 `memory_instructions()`，让智能体在需要时显式调用 Recall。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

对助手来说，通常按用户划分记忆库更合适。如果同一用户会在互不相关的工作流之间切换，按项目划分记忆库则更合适。无论选择哪种策略，都要确保记忆指令和记忆工具使用相同的记忆库值。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 在第一次运行中存储一项偏好或工作事实。
2. 使用相同的记忆库 ID 开始第二次运行。
3. 询问先前记录的事实，确认智能体能给出一致的回答。
4. 测试另一个记忆库 ID，确认记忆隔离符合预期。

如果第二次运行能回答第一轮中的细节，就说明配置正常。如果不能，请启用调试日志、检查所配置的记忆库 ID，并确认 Retain 调用已完成。

## 常见错误 {#common-mistakes}

- 记忆指令使用一个记忆库，而工具却指向另一个记忆库
- 忘记自动注入是可选的，必须显式添加
- 应用需要严格区分用户，却选择了共享记忆库

## 常见问题 {#faq}

### 可以只使用基于工具的记忆吗？ {#can-i-use-only-tool-based-memory}

可以。如果你希望由智能体自行决定何时查询记忆，仅使用这些工具就足够了。

### Reflect 相比 Recall 增加了什么？ {#what-does-reflect-add-beyond-recall}

Reflect 会根据记忆综合生成答案；当需要结合多条记忆时，这很有用。

### 应该全局配置还是逐次调用配置？ {#should-i-configure-globally-or-per-call}

对于单个服务，全局配置更方便。如果不同智能体需要不同的记忆行为，逐次调用配置则更安全。

## 后续步骤 {#next-steps}

- 如果你需要托管式记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)了解相关工作流

---
