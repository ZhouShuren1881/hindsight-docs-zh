---
title: "指南：使用 Hindsight 为 LangGraph 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, langgraph, langchain, memory]
description: "通过工具、召回和存入节点，或 BaseStore 适配器，为 LangGraph 添加 Hindsight 持久记忆，让智能体跨运行记住用户。"
image: /img/guides/guide-langgraph-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 LangGraph 添加持久记忆](/img/guides/guide-langgraph-memory-with-hindsight.webp)

如果你想为 **LangGraph 添加 Hindsight 持久记忆**，最直接的配置是在图中加入 Hindsight 工具或记忆节点，并为每个用户或线程解析一个稳定的记忆库 ID。这样，LangGraph 智能体就能在多次运行之间保持上下文连续，而不会把每次图执行都当作全新开始。

Hindsight 适合这种场景，因为该集成支持三种模式：将 Retain（存入）、Recall（召回）和 Reflect（反思）作为工具暴露出来；在 LLM 节点前后添加预构建的 Recall 和 Retain 节点；或者在需要 LangGraph 原生存储语义时使用 BaseStore 适配器。

如果你希望在操作时随手查阅参考资料，可以打开 [LangGraph 集成文档](/sdks/integrations/langgraph)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 LangGraph 集成或插件。
> 2. 将它连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 LangGraph 运行时。
> 4. 存入一项偏好或项目事实，然后启动一次新的运行。
> 5. 确认 Recall 会自动带回先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

LangGraph 已经有清晰的执行图，因此记忆的放置位置也很明确。Recall 节点可以在智能体节点之前运行，Retain 节点可以在其后运行；通过 `RunnableConfig` 动态生成记忆库 ID，就能按用户管理记忆，无需在图中硬编码标识符。

## 前提条件 {#prerequisites}

- 一个可正常运行的 LangGraph 或 LangChain 应用
- 已安装 Python 和 `hindsight-langgraph`
- 一个稳定的用户或线程标识符，可将其映射到 Hindsight 记忆库

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-langgraph
```

## 步骤 2：连接 LangGraph 与 Hindsight {#step-2-connect-langgraph-to-hindsight}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

如果使用 [Hindsight Cloud](https://hindsight.vectorize.io)，请将 base URL 设为 `https://api.hindsight.vectorize.io`，并通过应用中已有的客户端配置传入 API 令牌。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from hindsight_client import Hindsight
from hindsight_langgraph import create_recall_node, create_retain_node
from langgraph.graph import StateGraph, MessagesState, START, END

client = Hindsight(base_url="http://localhost:8888")
recall = create_recall_node(client=client, bank_id_from_config="user_id")
retain = create_retain_node(client=client, bank_id_from_config="user_id")

builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("agent", agent_node)
builder.add_node("retain", retain)
builder.add_edge(START, "recall")
builder.add_edge("recall", "agent")
builder.add_edge("agent", "retain")
builder.add_edge("retain", END)

graph = builder.compile()
```

如果你倾向于使用工具调用，`create_hindsight_tools()` 是最快的选择。如果需要 LangGraph 原生的存储模式，`HindsightStore` 更合适。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

只要有稳定的用户或租户键，就应从 `RunnableConfig` 中解析记忆库 ID。这样可以让记忆在多次图运行之间始终关联到正确的用户。如果你正在为一个团队构建内部助手，共享记忆库可能合适；但大多数生产环境中的图都应按用户、租户或线程限定记忆范围。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 运行一次图，为测试用户存入一项偏好或项目事实。
2. 在 `configurable` 中使用相同的 `user_id` 再次调用该图。
3. 提出一个依赖先前事实的问题，并确认 Recall 能找回该事实。
4. 将 `user_id` 换成另一个值重复测试，确认用户之间相互隔离。

如果第二次运行能根据第一次运行的细节作答，说明配置正常。如果不能，请启用调试日志、检查所配置的记忆库 ID，并确认 Retain 调用确已完成。

## 常见错误 {#common-mistakes}

- 在普通 LangChain 中绑定了工具，却忘记运行工具执行循环
- 第二次运行使用了不同的运行时键，因而静默创建了一个新记忆库
- 应用实际需要按用户限定记忆，却为所有用户选择了同一个共享记忆库

## 常见问题 {#faq}

### 应该使用工具、节点还是 BaseStore？ {#should-i-use-tools-nodes-or-basestore}

如果你希望由智能体控制记忆调用，请使用工具；如果希望在图执行前后自动进行 Recall 和 Retain，请使用节点；如果需要 LangGraph 原生的存储模式，请使用 BaseStore。

### 这适用于普通 LangChain 吗？ {#can-this-work-with-plain-langchain}

适用。工具模式也能在 LangChain 中使用，但你需要自行处理工具执行。

### 如何限定记忆库范围？ {#how-should-i-scope-banks}

按用户划分是最稳妥的默认做法。如果应用需要更强的隔离，再加入租户或线程上下文。

## 后续步骤 {#next-steps}

- 如果你需要托管式记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [完整 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)中的相关工作流。
