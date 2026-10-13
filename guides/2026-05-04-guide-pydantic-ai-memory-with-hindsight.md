---
title: "指南：使用 Hindsight 为 Pydantic AI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, pydantic-ai, agent-frameworks, memory]
description: "通过异步记忆工具和自动注入指令，为 Pydantic AI 添加持久记忆，记住用户和工作流上下文。"
image: /img/guides/guide-pydantic-ai-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Pydantic AI 添加持久记忆](/img/guides/guide-pydantic-ai-memory-with-hindsight.webp)

如需 **Pydantic AI 与 Hindsight 持久记忆**，给智能体工具并添加 `memory_instructions()`，每次运行前注入相关记忆，无需线程池变通或自行实现召回。

集成端到端原生异步。存储、召回和反思直接使用异步路径，让生产服务配置简单。

操作时可参考 [Pydantic AI 集成文档](/sdks/integrations/pydantic-ai)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Pydantic AI 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 Pydantic AI。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Pydantic AI 原生接受工具和指令。工具提供显式动作，`memory_instructions()` 提供运行前上下文，覆盖自动和智能体主动记忆。

## 前提条件 {#prerequisites}

- 可用 Pydantic AI 智能体。
- 已安装 Python 和 `hindsight-pydantic-ai`。
- 同一用户或项目跨运行稳定的 ID 策略。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-pydantic-ai
```

## 步骤 2：连接 Pydantic AI 与 Hindsight {#step-2-connect-pydantic-ai-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")
```

本地自托管使用 `Hindsight(base_url="http://localhost:8888")`。

也可一次调用 `configure()`，创建工具时无需每次传客户端。

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

result = await agent.run("你记得我的哪些偏好？")
print(result.output)
```

仅需工具时移除 `memory_instructions()`；仅需自动注入时只保留指令。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

个人助手按用户最稳妥。同一用户操作多个无关系统时按流程或项目。不要每请求轮换 ID，否则即使集成正确也像无状态。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 运行一次，要求记住偏好或操作规则。
2. 同一 ID 再运行，询问细节。
3. 检查显式工具调用前是否已反映记忆。
4. 否则查看指令输出，确认召回使用预期库。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 只加工具却期待自动召回，忘记记忆指令。
- 工具和指令使用不同 ID。
- 覆盖全局配置，忘记逐次调用参数优先。

## 常见问题 {#faq}

### 需要工具和记忆指令同时存在吗？ {#do-i-need-both-tools-and-memory-instructions}

不一定。两者结合提供自动注入和显式动作，根据设计也可只选一种。

### 异步支持为何重要？ {#why-is-async-support-important-here}

便于异步应用集成，避免同步包装。

### 可按标签筛选召回吗？ {#can-i-filter-recalled-memories-by-tag}

可以，支持 `recall_tags` 和 `recall_tags_match` 限定范围。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)。
