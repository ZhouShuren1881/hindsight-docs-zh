---
title: "指南：使用 Hindsight 管理 LangGraph 短期状态与长期记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, langgraph, memory]
description: "LangGraph 的检查点器在线程内保存短期状态；Hindsight 则提供长期记忆，让知识可以跨线程、会话和用户延续。"
image: /img/guides/guide-langgraph-state-vs-long-term-memory.svg
hide_table_of_contents: true
---

![使用 Hindsight 管理 LangGraph 短期状态与长期记忆](/img/guides/guide-langgraph-state-vs-long-term-memory.svg)

LangGraph 的检查点器为图提供**短期状态**：它持久保存单个线程的消息和值，因此即使进程崩溃、暂停或因人机协作而中断，对话也能继续。但这种状态仅限于一个线程。开启新线程，或改为服务另一位用户，图都会从空状态开始。检查点器不会把线程 A 中学到的内容带到线程 B。

缺少的这一层就是**长期记忆**。Hindsight 会存储事实、偏好和经历，其生命周期超过任何单个线程，因此智能体能在新会话中回想起用户上周告诉它的内容。两者互为补充，并不冲突：检查点器管理本次运行的*工作集*，Hindsight 管理应随用户延续到各处的*持久知识*。

本指南会说明检查点器记住和忘记的内容、短期状态与长期记忆如何协同、为什么 `BaseStore` 适配器是连接两者的自然桥梁，以及该选择哪一层的决策方法。指南基于现有的 [LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight) 和 [LangGraph 集成文档](https://hindsight.vectorize.io/docs/integrations/langgraph)，建议将两者放在手边。

<!-- truncate -->

> **快速解答**
>
> 1. 检查点器会持久保存**线程状态**——一次对话、一次运行——但无法跨线程延续。
> 2. Hindsight 会持久保存**长期记忆**——可跨线程、会话和用户延续的事实与偏好。
> 3. 将两者接起来：检查点器保留工作状态，Hindsight 提供持久知识。
> 4. `BaseStore` 适配器（`HindsightStore`）是最直接的桥梁：由 Hindsight 支持的 LangGraph 原生跨线程存储。
> 5. 让*新线程*回想起*旧线程*中存储的内容，以此验证。

## 检查点器记住和忘记的内容 {#what-the-checkpointer-remembers-and-forgets}

LangGraph 检查点器会在每一步之后为图的状态创建快照，并以 `thread_id` 为键保存。这正是短期状态发挥作用的原因：

- 进程重启后，对话仍然存在，因此可以从运行中途恢复。
- 暂停状态会持久保存，因此人机协作中断可以正常工作。
- *当前线程*可以访问*该线程*的完整消息历史。

检查点器**不会**跨线程共享任何内容。每个 `thread_id` 都是一座孤岛。如果用户在一个线程中告诉智能体“我喜欢深色模式”，第二天又在新线程中回来，那么新线程的检查点器会从空状态开始，无法访问旧线程的状态。它也不是知识存储：其中保存的是原始消息历史，而不是可供语义检索的提炼事实。

这就是它的边界。检查点器很擅长回答*“我在这段对话中进行到哪里了”*，但无法回答*“在所有对话中，我对这位用户了解什么”*。

## 短期状态与长期记忆 {#short-term-state-vs-long-term-memory}

下面按层列出了两者的区别：

| | LangGraph 检查点器（短期） | Hindsight（长期） |
|---|---|---|
| **范围** | 一个 `thread_id` | 跨线程、会话和用户 |
| **保存内容** | 原始图状态／消息历史 | 提炼后的事实、偏好和经历 |
| **键控方式** | 线程 | 记忆库（按用户、租户或线程划分） |
| **检索方式** | 加载整个线程状态 | 对相关事实进行语义召回 |
| **生命周期** | 对话 | 持久存在，随用户延续 |
| **擅长场景** | 恢复运行、处理中断 | 在多次运行之间保持连续性 |

它们各自回答不同问题，因此可以自然协同。在一次图运行中，检查点器提供工作集，也就是目前为止的消息；Hindsight 的 Recall（召回）会注入持久事实，让智能体表现得仿佛早已认识你。运行结束后，Hindsight 的 Retain（存入）会把值得记住的内容提炼并写入长期记忆，为下一个线程做好准备。

[LangGraph 集成](/sdks/integrations/langgraph) 提供了三种添加长期记忆层的模式：

- **工具**——`create_hindsight_tools()` 会把 Retain（存入）、Recall（召回）和 Reflect（反思）功能封装为 LangChain 的 `@tool` 函数，由智能体控制：模型决定何时记住内容或查找信息。普通 LangChain 也可以使用。
- **节点**——`create_recall_node()` 和 `create_retain_node()` 位于 LLM 节点的前后。召回节点会在模型运行前注入匹配的记忆；存入节点会在模型响应后保存消息。它们可以自动、确定地放置在图中。
- **BaseStore 适配器**——`HindsightStore` 实现了 LangGraph 原生的跨线程 `BaseStore` 接口，并由 Hindsight 提供后端支持。

## BaseStore 适配器：连接两层的桥梁 {#the-basestore-adapter-as-the-bridge}

LangGraph 的 API 已经区分了这两层：**检查点器**负责短期线程状态；**存储**（`BaseStore`）是 LangGraph 为*跨线程*长期记忆提供的官方接口。`HindsightStore` 可以直接接入这个接口，让 Hindsight 为 LangGraph 自己的长期记忆抽象提供持久存储。

将两者都传给 `compile()`：检查点器用于短期状态，存储用于长期记忆；两者可以共存：

```python
from hindsight_client import Hindsight
from hindsight_langgraph import HindsightStore

client = Hindsight(base_url="http://localhost:8888")
store = HindsightStore(client=client)

graph = builder.compile(checkpointer=checkpointer, store=store)

# 跨线程长期记忆，以命名空间为键
await store.aput(("user", "123", "prefs"), "theme", {"value": "dark mode"})
results = await store.asearch(("user", "123", "prefs"), query="theme preference")
```

命名空间元组会以 `.` 为分隔符映射到 Hindsight 记忆库 ID（`("user", "123")` 会变成记忆库 `user.123`）；首次访问时会自动创建记忆库。这正是存储成为自然桥梁的原因：`("user", user_id)` 命名空间在每个线程中都保持稳定，因此在一个线程中写入的值，可在同一用户之后的任一线程中检索。

使用 `HindsightStore` 前需要了解以下特性：

- **仅支持异步操作。** 使用 `aput`、`aget`、`asearch`、`abatch`、`adelete` 和 `alist_namespaces`。同步版本会引发 `NotImplementedError`。
- **`get()` 基于召回。** 它不直接按键查找——键会成为召回查询，且只有 `document_id` 完全匹配的项目才会返回。因此，不在召回结果前列的项目可能看起来像是丢失了。语义检索建议使用 `asearch`。
- **`list_namespaces` 的范围限于当前会话。** 它只跟踪当前进程中通过 `aput()` 写入的命名空间；进程重启后，即使数据仍保存在 Hindsight 中，它也会返回空结果。
- **`delete` 不执行删除操作。** Hindsight 的记忆模型以追加为主；存入时会自动处理被新事实取代的旧事实。因此，`adelete()` 只会记录日志，不会移除数据。

如果需要更精细地控制提示，或由智能体主动管理记忆，仍可使用节点和工具模式；存储适配器则是符合 LangGraph 自身长期记忆形式的选项。

## 将 LangGraph 连接到 Hindsight {#connect-langgraph-to-hindsight}

本指南讨论的是*状态与记忆*的区别，不涉及安装。完整的安装和接线步骤包括运行 `pip install hindsight-langgraph`、连接客户端、添加召回／存入节点，以及解析动态记忆库 ID。请参阅 [LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight)。完成这些步骤后，本指南的其余内容即可直接应用。

## 何时使用哪一层 {#which-layer-to-use-when}

根据你要解决的问题选择对应层：

- **只使用检查点器**：当工作流限于单个会话且自成一体时，例如一次性任务、表单填写流程，或下次运行无需记住任何内容的任务。此时短期状态已经足够。
- **添加 Hindsight 召回／存入节点**：当你希望每次运行都自动、确定地使用长期记忆时，可以在智能体思考前召回用户的持久事实，并在智能体响应后存入值得保留的内容。
- **添加 Hindsight 工具**：当智能体需要自行决定何时记住或查找内容，或者你使用的是没有图结构的普通 LangChain 时。
- **使用 `HindsightStore`**：当你需要 LangGraph 原生的跨线程存储语义，也就是可按命名空间组织、可进行语义检索的长期记忆，并让它与检查点器并存时。

在实际生产中，大多数图会同时使用检查点器和 Hindsight 层：短期状态服务于当前对话，长期记忆则让下一次对话不再从陌生开始。

## 验证跨线程的长期记忆 {#verify-long-term-memory-across-threads}

跨线程连续性是关键，因此要直接测试这一点：

1. 在测试用户的**线程 A**中运行图，并通过存入节点、工具调用或 `store.aput` 保存一个持久事实，例如“我喜欢深色模式”。
2. 为*同一位用户*开启**新线程 B**（使用相同的记忆库 ID／命名空间，但使用新的 `thread_id`）。
3. 在线程 B 中提出一个需要用到线程 A 中事实的问题。
4. 确认召回结果中出现了该事实。线程 B 的检查点器原本是空的，因此如果答案正确，信息就来自长期记忆。
5. 换一位用户重复测试，并确认事实**不会**泄漏给对方——记忆库之间严格隔离。

如果线程 B 能根据线程 A 中的事实作答，而另一位用户仍与该事实隔离，说明短期状态和长期记忆正在正确协同。

## 常见错误 {#common-mistakes}

### 认为检查点器会在线程之间传递知识 {#expecting-the-checkpointer-to-carry-knowledge-across-threads}

检查点器按 `thread_id` 划分，这是它的设计方式。如果你需要跨线程或跨用户保持连续性，这属于 Hindsight 的职责，而不是检查点器的职责。

### 为所有用户重复使用同一个记忆库 ID {#reusing-one-bank-id-for-every-user}

如果每个请求都映射到同一个记忆库，一位用户的事实就可能出现在另一位用户的结果中。应按用户解析记忆库 ID（例如使用 `bank_id_from_config="user_id"` 或 `("user", user_id)` 命名空间），以限定记忆的范围。

### 第二次运行时更改线程键，却仍期待连续性 {#changing-the-thread-key-on-the-second-run-but-expecting-continuity}

新的 `thread_id` 会创建一个新的检查点，这是预期行为。连续性依赖于稳定的*记忆库／命名空间*，而不是线程。对于同一用户，应在每次运行中保持记忆库键不变。

### 认为 `HindsightStore.adelete()` 会移除数据 {#expecting-hindsightstoreadelete-to-remove-data}

`delete` 不执行删除操作。Hindsight 会在存入时自动用新事实取代旧事实；不要构建依赖通过存储适配器彻底删除数据的逻辑。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也能使用，只需将客户端指向你自己的 URL（例如 `http://localhost:8888`）。[Hindsight Cloud](https://hindsight.vectorize.io) 只是托管后端的一种选择。

### Hindsight 会取代检查点器吗？ {#does-hindsight-replace-the-checkpointer}

不会。它们各自承担不同的工作。保留检查点器来管理短期线程状态，再添加 Hindsight 来提供长期记忆；两者应一起运行。

### 应该使用节点、工具还是存储适配器？ {#should-i-use-nodes-tools-or-the-store}

要在图的前后自动执行召回和存入，请使用节点；要让智能体主动管理记忆（或在普通 LangChain 中使用），请使用工具；要采用 LangGraph 原生的跨线程存储语义，请使用 `HindsightStore`。参见[上方的决策指南](#which-layer-to-use-when)。

### 为什么我存入某个键后，召回却没有返回任何内容？ {#why-did-recall-return-nothing-for-a-key-i-stored}

`HindsightStore.get()` 基于召回，而不是直接按键查找：只有 `document_id` 完全匹配的项目才会返回，不在召回结果前列的项目可能看起来像是丢失了。请改用 `asearch` 和语义查询。

## 后续步骤 {#next-steps}

- 按照 [LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight) 安装并接入集成
- 如果需要托管记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整 Hindsight 文档](/)
- 阅读[快速入门指南](/developer/api/quickstart)
- 查看 [Hindsight 的召回 API](/developer/api/recall)
- 查看 [Hindsight 的存入 API](/developer/api/retain)
- 阅读 [LangGraph 集成文档](/sdks/integrations/langgraph)
