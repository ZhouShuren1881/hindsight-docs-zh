---
title: "指南：类型安全，异步智能体记忆与Pydantic AI"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, pydantic-ai, memory]
description: "使用 Hindsight 将异步原生、类型安全的长期记忆添加到 Pydantic AI 智能体中 — 记忆存储、记忆召回和回想工具，适合事件循环，无需线程池黑客。"
image: /img/guides/guide-pydantic-ai-type-safe-agent-memory.svg
hide_table_of_contents: true
---

![指南：使用 Pydantic AI 构建类型安全的异步智能体记忆](/img/guides/guide-pydantic-ai-type-safe-agent-memory.svg)

Pydantic AI围绕 构建 **原生异步**，强类型智能体，和记忆应该遵循相同的契约。Hindsight的Pydantic AI集成将记忆存储、记忆召回和反思公开为直接在事件循环上运行的异步工具——没有包含在线程池中的同步客户端，异步智能体和阻塞记忆调用之间没有桥接。智能体保持打字状态，流程保持可预测。

这很重要，因为许多记忆插件都假设有一个同步客户端。要使用异步智能体中的这些内容，您最终会将每个记忆调用卸载到线程池，这会增加延迟，将错误隐藏在执行器边界后面，并使流程更难以推理。Hindsight避免了这一点：它的工具是等待的，所以 `await agent.run(...)` 与智能体的其他所有功能一样，在同一循环中驱动记忆。

本指南是关于*设计*，不是安装。 [配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight) 已经涵盖了安装和接线。这里的重点是为什么异步本地记忆适合Pydantic AI，记忆工具连接的位置，以及如何在生产中保持整个流程的类型化和可预测性。

<!-- truncate -->

> **快速解答**
>
> 1.使用 安装并连接 [配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)。
> 2.附上记忆`create_hindsight_tools(client=..., bank_id=...)` 所以记忆存储、记忆召回和反思是智能体上值得期待的工具。
> 3.添加`memory_instructions(...)`如果您想在每次跑步前注入相关记忆。
> 4.保持稳定`bank_id` 每个用户或项目，以便记忆召回保持一致。
> 5.所有记忆都在事件循环上运行——没有线程池包装器，没有阻塞调用。

## 为什么异步原生记忆很重要 {#why-async-native-memory-matters}

Pydantic AI智能体运行于 `asyncio`。 `agent.run(...)` 是可等待的，等待工具调用，并且模型调用是非阻塞的。重点是单个智能体可以同时扇出工作而不会阻塞事件循环。

记忆应该参与该模型，而不是对抗它。Hindsight的整合用途Pydantic AI的异步工具接口直接，所以`hindsight_retain`, `hindsight_recall`，和`hindsight_reflect` 像任何其他工具一样等待。跑步过程中的记忆召回不会停止循环；当记忆呼叫正在进行时，其他等待的工作可以继续进行。

替代​​方案 - 从异步智能体内部调用的同步记忆客户端 - 在每个记忆操作期间阻塞循环。在处理并发请求的服务中，一个记忆召回可能会阻碍不相关的工作。异步原生记忆完全回避了这一点。

## 没有线程池黑客 {#no-thread-pool-hacks}

当记忆库仅提供同步客户端时，异步智能体内的通常解决方法是将每个调用推送到线程池执行器上。这可行，但需要付出代价：

- **延迟与开销** 从每个记忆存储或记忆召回跳转到工作线程。
- **难以理解的错误**，因为异常跨越执行器边界并失去其自然的异步堆栈上下文。
- ​​ **更复杂的推理**，因为流程不再是等待呼叫的直线。

Hindsight的Pydantic AI工具是端到端等待的，所以这些都不需要。 记忆召回、记忆召回和反思是 `await`直接与智能体在同一循环上。心智模型很简单：智能体等待着它的工具，而记忆只是另一个等待着的工具。

## 记忆工具附加到Pydantic AI智能体 {#where-memory-tools-attach-to-a-pydantic-ai-agent}

有两个干净的附着点，它们映射到两个不同的意图。

**工具** — 通过 `create_hindsight_tools(...)`到智能体`tools=[...]`。这为智能体提供了明确的、可等待的操作，它可以选择调用：存储事实（`hindsight_retain`），搜索记忆（`hindsight_recall`），或从记忆中综合答案（`hindsight_reflect`）。该模型决定记忆何时相关。

**指令** — 通过 `memory_instructions(...)`到智能体`instructions=[...]`。这会调用相关记忆并将其注入系统提示符中*之前*运行开始，因此上下文存在，而智能体不必决定获取它。

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

result = await agent.run("你还记得我的喜好吗？")
print(result.output)
```

当你想要自动上下文注入时使用两者*和*明确的记忆动作。仅当智能体应该决定何时获取记忆时才使用工具。仅当您希望注入回忆上下文而不将记忆工具暴露给模型时才使用指令。如果您只需要一些工具，`include_retain`, `include_recall`，和`include_reflect` 让您选择附加哪些。

## 连接Pydantic AI至Hindsight {#connect-pydantic-ai-to-hindsight}

标准设置指南中介绍了安装和连接 — `pip install hindsight-pydantic-ai`，将客户指向Hindsight Cloud或本地服务器，并将工具连接到您的智能体中。关注一次，然后返回此处查看设计细节：

- [配置指南：使用 Hindsight 为 Pydantic AI 添加持久记忆](https://hindsight.vectorize.io/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)

## 保持记忆流程类型化且可预测 {#keeping-the-memory-flow-typed-and-predictable}

可预测性来自于围绕配置和范围的一些深思熟虑的选择。

**选择一种记忆库策略并保持稳定。** 记忆召回和记忆存储都关闭 `bank_id`。为个人助理的每个用户使用稳定的 ID，或者当一个用户驱动多个不相关的系统时为每个项目使用稳定的 ID。即使集成正确，每个请求轮换记忆库 ID 也会使智能体看起来无状态。

**统一配置，有意识地覆盖。** 您可以将客户端传递给每个调用，或者调用 `configure(...)`一次，每次都可以在没有客户端的情况下创建工具。每次调用构造函数参数（如 `budget`或`tags`) 覆盖全局配置 - 因此，如果某个值令您感到惊讶，请检查每次调用参数是否胜过您的全局设置。

**通过标签限定召回。**`recall_tags` 和 `recall_tags_match` 缩小运行可以看到的记忆范围，这可以保持注入的上下文相关，并且流程在运行中可重现。

因为在循环中等待记忆存储、记忆召回和反思，所以流程读取为键入的、等待的调用的直接序列——与Pydantic AI智能体的其余部分相同的形状。

## 验证记忆是否有效 {#verify-that-memory-is-working}

1. 用稳定版运行智能体一次`bank_id`并让它存储偏好或操作规则。
2. 以同样的方式开始新的跑步`bank_id` 并询问详细信息。
3. 检查答案是否反映了进行任何显式工具调用之前的早期记忆 - 这确认了`memory_instructions(...)` 注入回忆上下文。
4. ​​如果没有，检查指令输出并确认记忆召回使用了预期的记忆库。

如果第二次运行的答案来自第一次运行的记忆，则设置正在运行。对于较低级别的行为，请参阅 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 常见错误 {#common-mistakes}

### 无论如何将客户端包装在线程池中 {#wrapping-the-client-in-a-thread-pool-anyway}

工具已经准备好了。直接等待它们是正确的——将它们推送到执行器上会增加开销并隐藏错误，但没有任何好处。

### 在工具和说明中使用不同的记忆库ID {#using-a-different-bank-id-in-tools-and-instructions}

召回读取的记忆库与存储写入的记忆库不同，会让注入上下文看起来为空。工具与指令中的 `bank_id` 必须一致。

### 期望仅通过工具自动注入 {#expecting-auto-injection-from-tools-alone}

工具赋予智能体*选项*调用记忆。如果您希望在运行之前显示上下文而不调用工具，请添加 `memory_instructions(...)`。

### 忘记每次调用覆盖获胜 {#forgetting-per-call-overrides-win}

每次调用一次`budget`, `tags`，或`max_tokens`覆盖全局`configure(...)`值。如果某个设置看起来被忽略，请检查是否有覆盖它的构造函数参数。

## 常见问题解答 {#faq}

### 为什么异步原生对于Pydantic AI特别重要？ {#why-does-async-native-matter-for-pydantic-ai-specifically}

因为智能体运行在事件循环上。可等待的记忆工具将记忆保留在该循环上，因此记忆召回不会阻止不相关的并发工作，并且流程保持等待调用的干净序列。

### 我需要工具和记忆说明吗？ {#do-i-need-both-tools-and-memory-instructions}

​​没有。将两者用于自动注入和显式记忆操作，或使用适合您的智能体设计的任何一种。

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作——将客户端指向本地服务器（例如 `Hindsight(base_url="http://localhost:8888")`）。

### 我可以限制智能体获得哪些记忆工具吗？ {#can-i-limit-which-memory-tools-the-agent-gets}

是的。 `include_retain`, `include_recall`，和`include_reflect` `create_hindsight_tools(...)` 让您仅附加所需的工具。

## 后续步骤 {#next-steps}

- 在中完成安装和接线 [Pydantic AI 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-pydantic-ai-memory-with-hindsight)
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Pydantic AI 集成文档](/sdks/integrations/pydantic-ai)
