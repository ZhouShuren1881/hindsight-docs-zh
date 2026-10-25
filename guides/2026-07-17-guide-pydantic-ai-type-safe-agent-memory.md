---
title: "指南：借助 Pydantic AI 构建类型安全的异步智能体记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, pydantic-ai, memory]
description: "借助 Hindsight，为 Pydantic AI 智能体添加原生异步、类型安全的长期记忆——提供适配事件循环的存入、召回和反思工具，无需线程池变通方案。"
image: /img/guides/guide-pydantic-ai-type-safe-agent-memory.svg
hide_table_of_contents: true
---

![指南：借助 Pydantic AI 构建类型安全的异步智能体记忆](/img/guides/guide-pydantic-ai-type-safe-agent-memory.svg)

Pydantic AI 面向**原生异步**、强类型智能体构建，记忆也应遵循相同的约定。Hindsight 的 Pydantic AI 集成将 Retain（存入）、Recall（召回）和 Reflect（反思）封装为直接运行在事件循环上的异步工具：无需把同步客户端包装在线程池中，也无需在异步智能体与阻塞式记忆调用之间搭桥。这样既能保持智能体的类型安全，也能让整个流程清晰可预测。

这很重要，因为许多记忆扩展都假设使用同步客户端。要在异步智能体中使用它们，你最终会把每次记忆调用都交给线程池处理，这会增加延迟、让错误隐藏在线程池执行器的边界后面，也会让流程更难推理。Hindsight 避开了这些问题：它的工具都可以直接等待，因此 `await agent.run(...)` 会像驱动智能体执行其他工作一样，在同一个事件循环上驱动记忆操作。

本指南讲的是*设计*，不是安装。[配置指南](/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight) 已介绍安装和接线。这里重点说明原生异步记忆为什么适合 Pydantic AI、记忆工具应挂接在哪里，以及怎样让整个生产流程保持类型安全、可预测。

<!-- truncate -->

> **快速解答**
>
> 1. 按照[配置指南](/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)完成安装和连接。
> 2. 使用 `create_hindsight_tools(client=..., bank_id=...)` 为智能体接入记忆，让存入、召回和反思成为可等待的工具。
> 3. 如果希望每次运行前注入相关记忆，请添加 `memory_instructions(...)`。
> 4. 为每位用户或每个项目使用一个稳定的 `bank_id`，让记忆召回前后一致。
> 5. 所有记忆操作都运行在事件循环上，无需线程池包装器，也不会出现阻塞调用。

## 原生异步记忆为何重要 {#why-async-native-memory-matters}

Pydantic AI 智能体运行在 `asyncio` 上。`agent.run(...)` 可以等待，工具调用会被等待，模型调用也不会阻塞。这样，单个智能体就能并发分派多项工作，而不阻塞事件循环。

记忆也应融入这种运行方式，而不是与之冲突。Hindsight 的集成直接使用 Pydantic AI 的异步工具接口，因此 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect` 与其他工具一样通过 `await` 等待。一次运行中的记忆召回不会阻塞事件循环；记忆调用尚未完成时，其他等待中的工作仍可继续。

另一种做法是在异步智能体内部调用同步记忆客户端，这会在每次记忆操作期间阻塞事件循环。在处理并发请求的服务中，一次召回就可能拖住无关请求。原生异步记忆完全避免了这个问题。

## 无需线程池变通方案 {#no-thread-pool-hacks}

如果记忆库只提供同步客户端，异步智能体通常会把每次调用交给线程池执行器。这种做法虽然可行，但需要付出代价：

- **延迟和开销**：每次存入或召回都要切换到工作线程。
- **错误难以追踪**：异常跨越执行器边界后，会失去原本的异步堆栈上下文。
- **更难推理**：流程不再是按顺序等待调用的直线过程。

Hindsight 的 Pydantic AI 工具从头到尾都可等待，因此不需要上述做法。Retain、Recall 和 Reflect 会在与智能体相同的事件循环上直接通过 `await` 等待。这样心智模型也很简单：智能体等待它的工具，记忆只是另一个可等待的工具。

## 记忆工具应挂接到 Pydantic AI 智能体的哪里 {#where-memory-tools-attach-to-a-pydantic-ai-agent}

有两种清晰的挂接方式，分别适用于不同目的。

**工具**——将 `create_hindsight_tools(...)` 传给智能体的 `tools=[...]`。这样，智能体就可以选择调用明确且可等待的操作：存入事实（`hindsight_retain`）、搜索记忆（`hindsight_recall`），或依据记忆综合生成答案（`hindsight_reflect`）。由模型判断何时需要记忆。

**指令**——将 `memory_instructions(...)` 传给智能体的 `instructions=[...]`。这会召回相关记忆，并在运行开始*之前*将其注入系统提示词，因此智能体无需自行决定是否获取记忆，上下文就已经就绪。

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

如果你既想自动注入上下文，又想提供明确的记忆操作，就同时使用两者。只有在希望智能体自行决定何时调用记忆时，才只接入工具；如果希望注入召回的上下文，又不向模型提供记忆工具，就只接入指令。如果只需要部分工具，可以通过 `include_retain`、`include_recall` 和 `include_reflect` 选择要挂接的工具。

## 将 Pydantic AI 接入 Hindsight {#connect-pydantic-ai-to-hindsight}

标准配置指南介绍了安装和连接：运行 `pip install hindsight-pydantic-ai`，将客户端指向 Hindsight Cloud 或本地服务器，再把工具接入智能体。按指南完成一次配置后，再回到这里了解设计细节：

- [配置指南：借助 Hindsight 为 Pydantic AI 添加持久记忆](/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)

## 让记忆流程保持类型安全且可预测 {#keeping-the-memory-flow-typed-and-predictable}

要让行为可预测，需要有意识地选择配置方式和作用范围。

**选择一种记忆库策略并保持稳定。** Recall 和 Retain 都使用 `bank_id` 确定记忆库。个人助理可以为每位用户使用稳定 ID；如果一位用户运行多个彼此无关的系统，则可以为每个项目使用稳定 ID。每次请求都轮换记忆库 ID，会让智能体看起来没有状态，即使集成本身配置正确也是如此。

**一次配置，按需覆盖。** 你可以在每次调用时传入客户端，也可以先调用一次 `configure(...)`，之后创建工具时不再逐次传入客户端。每次调用的构造参数（如 `budget` 或 `tags`）会覆盖全局配置。因此，如果某个值与预期不符，请检查是否有每次调用的参数覆盖了全局设置。

**用标签限定召回范围。** `recall_tags` 和 `recall_tags_match` 会缩小每次运行能够访问的记忆范围，让注入的上下文保持相关，也让不同运行中的流程可以复现。

由于 Retain、Recall 和 Reflect 都在事件循环上等待，整个流程就是一连串类型明确、按顺序等待的调用，与 Pydantic AI 智能体的其他部分采用相同的模式。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

1. 使用稳定的 `bank_id` 运行一次智能体，让它存入一项偏好或操作规则。
2. 使用相同的 `bank_id` 开始一次全新的运行，并询问刚才存入的内容。
3. 检查智能体是否在任何显式工具调用之前就根据早先的记忆作答；如果是，就说明 `memory_instructions(...)` 已注入召回的上下文。
4. 如果没有，请检查指令输出，并确认召回操作使用了预期的记忆库。

如果第二次运行能依据第一次运行存入的记忆作答，说明配置已生效。若要了解更底层的行为，请参阅 [Hindsight 的召回 API](/developer/api/recall) 和 [Hindsight 的存入 API](/developer/api/retain)。

## 常见错误 {#common-mistakes}

### 仍然把客户端包装在线程池中 {#wrapping-the-client-in-a-thread-pool-anyway}

这些工具本身就可以等待。直接等待它们才是正确做法；把它们交给执行器只会增加开销、隐藏错误，没有任何收益。

### 在工具和指令中使用不同的 bank ID {#using-a-different-bank-id-in-tools-and-instructions}

召回读取的记忆库与存入写入的记忆库不同，因此注入的上下文看起来会是空的。工具和指令中的 `bank_id` 必须相同。

### 以为只接入工具就会自动注入记忆 {#expecting-auto-injection-from-tools-alone}

工具只是让智能体*可以选择*调用记忆。如果你希望在运行开始前就提供上下文，而不必等待工具调用，请添加 `memory_instructions(...)`。

### 忘记每次调用的覆盖值优先生效 {#forgetting-per-call-overrides-win}

每次调用传入的 `budget`、`tags` 或 `max_tokens` 会覆盖全局 `configure(...)` 值。如果某个设置看起来没有生效，请检查是否有构造参数覆盖了它。

## 常见问题解答 {#faq}

### 为什么原生异步对 Pydantic AI 尤其重要？ {#why-does-async-native-matter-for-pydantic-ai-specifically}

因为智能体运行在事件循环上。可等待的记忆工具会让记忆操作也留在这个事件循环中，因此一次召回不会阻塞无关的并发工作，整个流程也会保持为一连串清晰的等待调用。

### 我需要同时接入工具和记忆指令吗？ {#do-i-need-both-tools-and-memory-instructions}

不需要。如果你既要自动注入上下文，又要提供明确的记忆操作，就同时使用两者；也可以根据智能体的设计只选其中一种。

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用；只需将客户端指向本地服务器，例如 `Hindsight(base_url="http://localhost:8888")`。

### 我可以限制智能体可用的记忆工具吗？ {#can-i-limit-which-memory-tools-the-agent-gets}

可以。`create_hindsight_tools(...)` 的 `include_retain`、`include_recall` 和 `include_reflect` 参数可以让你只挂接需要的工具。

## 后续步骤 {#next-steps}

- 按照 [Pydantic AI 配置指南](/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)完成安装和接线。
- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)开始使用。
- 查看 [Hindsight 的召回 API](/developer/api/recall)。
- 查看 [Hindsight 的存入 API](/developer/api/retain)。
- 阅读 [Pydantic AI 集成文档](/sdks/integrations/pydantic-ai)。
