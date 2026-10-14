---
title: "指南：使用 Hindsight 为 Pydantic AI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, pydantic-ai, agent-frameworks, memory]
description: "通过异步记忆工具和自动注入的指令，为 Pydantic AI 添加持久记忆，让智能体记住用户信息和工作流上下文。"
image: /img/guides/guide-pydantic-ai-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Pydantic AI 添加持久记忆](/img/guides/guide-pydantic-ai-memory-with-hindsight.webp)

如果要为 **Pydantic AI 接入 Hindsight 持久记忆**，最简洁的做法是向智能体提供 Hindsight 工具，并添加 `memory_instructions()`，以便在每次运行前注入相关记忆。这样，Pydantic AI 智能体就能拥有长期记忆，无需借助线程池变通方案，也不用手动编写召回逻辑。

这套集成的一大优势是全程原生支持异步。Retain（存入）、Recall（召回）和 Reflect（反思）都直接使用异步调用路径，因此在生产服务中也能保持简单的配置。

操作时可随手查阅 [Pydantic AI 集成文档](/sdks/integrations/pydantic-ai)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Pydantic AI 集成或插件。
> 2. 将其连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 Pydantic AI 运行时。
> 4. 存入一条偏好或项目信息，然后启动一次新的运行。
> 5. 确认 Recall 能自动找回先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Pydantic AI 智能体原生支持工具和指令这两种一等概念。Hindsight 同时适配二者：记忆工具让智能体可以显式执行操作，而 `memory_instructions()` 会在运行开始前提供召回的上下文。二者结合，既能支持自动使用记忆，也能支持由智能体主动调用记忆。

## 前提条件 {#prerequisites}

- 一个可运行的 Pydantic AI 智能体
- 已安装 Python 和 `hindsight-pydantic-ai`
- 为同一用户或项目跨多次运行保持稳定的记忆库 ID 策略

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-pydantic-ai
```

## 步骤 2：连接 Pydantic AI 与 Hindsight {#step-2-connect-pydantic-ai-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)——提供免费套餐，无需自行托管。

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")
```

如果要在本地自托管 Hindsight，则使用 `Hindsight(base_url="http://localhost:8888")`。

也可以只调用一次 `configure()`，之后创建工具时就不必每次都传入客户端。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

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

result = await agent.run("What do you remember about my preferences?")
print(result.output)
```

如果只需要工具，删除 `memory_instructions()` 即可。如果希望自动注入但不使用工具，则只保留指令。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

对于服务于单个用户的助手，按用户分别建库通常是最稳妥的默认方案。如果一个用户要操作多个互不相关的系统，按工作流或项目建库会更合适。避免每次请求都更换记忆库 ID，否则即使集成配置正确，智能体也会显得像没有状态一样。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 运行一次智能体，让它记住一项偏好或操作规则。
2. 使用同一个记忆库 ID 再次运行，并询问这项信息。
3. 检查智能体是否能在显式调用任何工具之前，就根据先前的记忆作答。
4. 如果不能，检查指令输出，并确认 Recall 使用的是预期的记忆库。

如果第二次运行能根据第一次运行的细节作答，说明配置正常。如果不能，请开启调试日志、检查配置的记忆库 ID，并确认 Retain 调用确实已完成。

## 常见错误 {#common-mistakes}

- 添加了工具，却忘记加入记忆指令，因而无法实现预期的自动召回。
- 工具和指令使用了不同的记忆库 ID。
- 在某处覆盖了全局配置，却忘记每次调用传入的参数优先级更高。

## 常见问题 {#faq}

### 需要同时使用工具和记忆指令吗？ {#do-i-need-both-tools-and-memory-instructions}

不需要。如果既想自动注入上下文，又想显式执行记忆操作，就同时使用二者。也可以根据智能体的设计只使用其中一种。

### 为什么这里的异步支持很重要？ {#why-is-async-support-important-here}

异步支持让集成在异步应用中更简单，也避免了围绕记忆调用编写繁琐的同步包装层。

### 可以按标签筛选召回的记忆吗？ {#can-i-filter-recalled-memories-by-tag}

可以。该集成支持 `recall_tags` 和 `recall_tags_match`，可用于缩小记忆范围。

## 后续步骤 {#next-steps}

- 如果需要托管的记忆后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)中的相关工作流。
