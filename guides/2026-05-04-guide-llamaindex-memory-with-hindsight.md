---
title: "指南：使用 Hindsight 为 LlamaIndex 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, llamaindex, agent-frameworks, memory]
description: "使用 HindsightMemory 自动召回和存储，或用 HindsightToolSpec 显式工具，为 LlamaIndex 添加持久记忆。"
image: /img/guides/guide-llamaindex-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 LlamaIndex 添加持久记忆](/img/guides/guide-llamaindex-memory-with-hindsight.webp)

如需 **LlamaIndex 与 Hindsight 持久记忆**，先使用 `HindsightMemory` 自动召回和存储，只有希望智能体主动决定工具调用时才改用 `HindsightToolSpec`，避免每个流程都手动管理记忆。

集成清晰支持两种模式：用 `BaseMemory` 保持高层抽象，或暴露存储、召回和反思工具获得更多控制。

操作时可参考 [LlamaIndex 集成文档](/sdks/integrations/llamaindex)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 LlamaIndex 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 LlamaIndex。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

LlamaIndex 已有记忆抽象，Hindsight 可接入正确层。`HindsightMemory` 在运行前召回、轮次后存储；工具规范模式提供显式控制。

## 前提条件 {#prerequisites}

- 可用 LlamaIndex 智能体或工作流。
- 已安装 Python 和 `hindsight-llamaindex`。
- 代表应长期延续的用户、项目或助手的稳定 ID。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-llamaindex
```

## 步骤 2：连接 LlamaIndex 与 Hindsight {#step-2-connect-llamaindex-to-hindsight}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

使用 [Hindsight Cloud](https://hindsight.vectorize.io)时，采用云端 API URL，并像其他 Python 集成一样认证客户端。

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
        mission="跟踪用户偏好和项目上下文",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("记住，我偏好深色模式", memory=memory)
    print(response)

asyncio.run(main())
```

如需显式工具，创建 `HindsightToolSpec` 并传入智能体。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

跨会话服务个人时按用户，同一用户跨多个无关领域时按项目。关键是 ID 稳定，让 `aput()` 和 `aget()` 始终访问同库。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 运行一次，存储测试偏好或项目事实。
2. 同一 ID 开始新会话，询问细节。
3. 确认无需手动工具调用就注入此前上下文。
4. 失败时，确认自动建库且重用相同 ID。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 每次运行使用新 ID，破坏延续。
- 自动记忆更简单，却选择工具规范模式。
- 专门领域需提取指导，却留空存储目标。

## 常见问题 {#faq}

### 应先用 HindsightMemory 还是 HindsightToolSpec？ {#should-i-start-with-hindsightmemory-or-hindsighttoolspec}

需要自动行为时先用 `HindsightMemory`，智能体应决定何时存储或搜索时用 `HindsightToolSpec`。

### HindsightMemory 也保留本地缓冲吗？ {#does-hindsightmemory-keep-a-local-buffer-too}

是，本地聊天缓冲与长期库分开，新会话可从空缓冲开始，同时召回过去记忆。

### 记忆库目标应写什么？ {#what-should-the-bank-mission-say}

描述应记住的事实和上下文，如项目决策、用户偏好或重复流程细节。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)。
