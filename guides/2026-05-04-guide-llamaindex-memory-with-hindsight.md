---
title: "指南：使用 Hindsight 为 LlamaIndex 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, llamaindex, agent-frameworks, memory]
description: "使用 HindsightMemory 自动召回和存入，或在智能体需要显式工具时使用 HindsightToolSpec，为 LlamaIndex 添加持久记忆。"
image: /img/guides/guide-llamaindex-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 LlamaIndex 添加持久记忆](/img/guides/guide-llamaindex-memory-with-hindsight.webp)

如果你想为 **LlamaIndex 添加 Hindsight 持久记忆**，最顺畅的配置方式是先使用 `HindsightMemory` 自动召回和存入；只有当你希望智能体明确决定何时运行记忆工具时，才切换到 `HindsightToolSpec`。这样，LlamaIndex 智能体就能在不同会话之间延续上下文，也不必让每个工作流都手动处理记忆。

这种集成很适合 LlamaIndex，因为它能清晰地支持这两种模式。你可以通过 `BaseMemory` 使用较高层次的抽象；如果希望获得更多控制，也可以向智能体提供 Retain（存入）、Recall（召回）和 Reflect（反思）工具。

工作时可以随手参考 [LlamaIndex 集成文档](/sdks/integrations/llamaindex)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 LlamaIndex 集成或插件。
> 2. 将其连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 LlamaIndex 运行时。
> 4. 存入一项偏好或项目事实，然后启动新一轮运行。
> 5. 确认 Recall 自动带回先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

LlamaIndex 已经提供了记忆抽象，因此 Hindsight 可以接入合适的层。`HindsightMemory` 会在智能体运行前召回上下文，并在一轮交互结束后存入消息；工具规范模式则在更适合智能体设计时，让你显式控制工具的使用。

## 前提条件 {#prerequisites}

- 一个可运行的 LlamaIndex 智能体或工作流
- 已安装 Python 和 `hindsight-llamaindex`
- 一个稳定的记忆库 ID，用于标识你希望长期保存信息的用户、项目或助手

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-llamaindex
```

## 步骤 2：连接 LlamaIndex 与 Hindsight {#step-2-connect-llamaindex-to-hindsight}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

使用 [Hindsight Cloud](https://hindsight.vectorize.io) 时，请填写云端 API URL，并按照其他 Python 集成中的相同方式对客户端进行身份认证。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightMemory
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    memory = HindsightMemory.from_client(
        client=client,
        bank_id="user-123",
        mission="Track user preferences and project context",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("Remember that I prefer dark mode", memory=memory)
    print(response)

asyncio.run(main())
```

如果你需要显式的记忆工具，可以改为创建 `HindsightToolSpec`，并将其中的工具传给智能体。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

对于需要跨会话持续服务同一个人的助手，按用户划分记忆库。对于同一用户会在多个互不相关的领域中工作的情况，则按项目划分记忆库。关键在于保持一致：无论选择哪种键，都要让它保持稳定，这样 `aput()` 和 `aget()` 才会始终访问同一个记忆库。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 运行一次智能体，并存入一项测试偏好或项目事实。
2. 使用相同的记忆库 ID 开始新会话，并询问这条信息。
3. 确认 `HindsightMemory` 无需手动调用工具，就会注入先前的上下文。
4. 如果召回失败，请确认记忆库已自动创建，并且再次使用了相同的记忆库 ID。

如果第二次运行能利用第一次运行中的细节作答，说明配置正常。如果不能，请启用调试日志、检查配置的记忆库 ID，并确认存入调用确实已完成。

## 常见错误 {#common-mistakes}

- 每次运行都使用新的记忆库 ID，导致上下文无法延续
- 明明自动记忆更简单，却选择了工具规范模式
- 智能体面向专门领域、适合获得更好的提取指导，却把任务说明留空

## 常见问题 {#faq}

### 应该从 HindsightMemory 还是 HindsightToolSpec 开始？ {#should-i-start-with-hindsightmemory-or-hindsighttoolspec}

如果你希望自动处理记忆，就从 `HindsightMemory` 开始。如果你希望智能体自行决定何时存入或搜索记忆，则切换到 `HindsightToolSpec`。

### HindsightMemory 也会保留本地缓冲区吗？ {#does-hindsightmemory-keep-a-local-buffer-too}

会。本地聊天缓冲区与长期记忆库相互独立，因此每个新会话都可以从空缓冲区开始，同时仍能召回过去的记忆。

### 记忆库的任务说明应该写什么？ {#what-should-the-bank-mission-say}

描述你希望记住的事实和上下文，例如项目决策、用户偏好或反复出现的工作流细节。

## 后续步骤 {#next-steps}

- 如果你需要托管的记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)中的相关工作流。

---
