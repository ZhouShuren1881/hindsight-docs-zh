---
title: "指南：使用 Hindsight 为 LangGraph 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, langgraph, langchain, memory]
description: "通过工具、召回与存储节点，或 BaseStore 适配器，为 LangGraph 添加 Hindsight 持久记忆，跨运行记住用户。"
image: /img/guides/guide-langgraph-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 LangGraph 添加持久记忆](/img/guides/guide-langgraph-memory-with-hindsight.webp)

如需 **LangGraph 与 Hindsight 持久记忆**，可在图中添加工具或记忆节点，为每个用户或线程解析稳定记忆库 ID，跨运行保持延续，而非每次执行从零开始。

集成支持三种模式：暴露存储、召回和反思工具；在 LLM 节点前后添加预建召回和存储节点；或用 BaseStore 适配器提供原生存储语义。

操作时可参考 [LangGraph 集成文档](/sdks/integrations/langgraph)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 LangGraph 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 LangGraph。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

LangGraph 执行图清晰，记忆位置明确。召回节点在智能体前，存储节点在后，`RunnableConfig` 的动态 ID 让按用户记忆无需硬编码。

## 前提条件 {#prerequisites}

- 可用 LangGraph 或 LangChain 应用。
- 已安装 Python 和 `hindsight-langgraph`。
- 可映射到 Hindsight 记忆库的稳定用户或线程标识符。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-langgraph
```

## 步骤 2：连接 LangGraph 与 Hindsight {#step-2-connect-langgraph-to-hindsight}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

使用 [Hindsight Cloud](https://hindsight.vectorize.io)时，将 base URL 设为 `https://api.hindsight.vectorize.io`，通过应用已有客户端配置传入 API 令牌。

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

偏好工具调用时，`create_hindsight_tools()` 最快。需要原生存储模式时，`HindsightStore` 更适合。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

有稳定用户或租户键时，从 `RunnableConfig` 解析 ID，让跨运行记忆关联正确用户。单团队内部助手可共享，但多数生产图应按用户、租户或线程限定。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 运行一次，为测试用户存储偏好或项目事实。
2. 在 `configurable` 中使用同一 `user_id` 再次调用。
3. 提出依赖此前事实的问题，确认召回。
4. 用不同 `user_id` 重复测试隔离。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 在普通 LangChain 绑定工具，却忘记运行工具执行循环。
- 第二次使用不同运行时键，静默创建新记忆库。
- 应用需按用户范围，却共用一个库。

## 常见问题 {#faq}

### 应使用工具、节点还是 BaseStore？ {#should-i-use-tools-nodes-or-basestore}

智能体控制调用时用工具，自动在图前后召回存储时用节点，原生存储模式用 BaseStore。

### 支持普通 LangChain 吗？ {#can-this-work-with-plain-langchain}

支持工具模式，但需自行执行工具。

### 如何限定记忆库？ {#how-should-i-scope-banks}

按用户最稳妥。需要更强隔离时加入租户或线程上下文。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)。
