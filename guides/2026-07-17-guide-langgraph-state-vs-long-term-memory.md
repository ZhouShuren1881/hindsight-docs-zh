---
title: "指南：LangGraph短期状态与Hindsight的长期记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, langgraph, memory]
description: "LangGraph 的检查指针在线程内保留短期状态； Hindsight 添加了跨线程、会话和用户传递知识的长期记忆。"
image: /img/guides/guide-langgraph-state-vs-long-term-memory.svg
hide_table_of_contents: true
---

![指南：LangGraph 短期状态与 Hindsight 长期记忆](/img/guides/guide-langgraph-state-vs-long-term-memory.svg)

LangGraph的检查点为您提供图表 **短期状态**：它保留单个线程的消息和值，以便对话在崩溃、暂停或人机循环中断中幸存下来。但该状态仅限于一个线程。启动一个新线程——或者为不同的用户提供服务——图表从零开始。检查指针永远不会将在线程 A 中学到的内容携带到线程 B 中。

**长期记忆** 是缺失的层。Hindsight存储的事实、偏好和体验比任何单个线程都持久，因此智能体可以在新的会话中记忆用户上周告诉它的内容。两者是互补的，而不是竞争：检查点拥有  当前运行的*工作组*，以及Hindsight拥有*持久知识*应该随处跟随用户。

本指南解释了检查点记住什么和忘记什么，短期状态和长期记忆如何组成，为什么`BaseStore`适配器是它们之间的天然桥梁，也是到达哪一层的决策指南。它建立在现有的[LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight) 和 [LangGraph 集成文档](/sdks/integrations/langgraph) — 将两者放在附近。

<!-- truncate -->

> **快速解答**
>
> 1.检查点仍然存在 **线程状态** — 一次对话，一次运行 — 并且跨线程忘记了它。
> 2.Hindsight坚持**长期记忆** — 跨线程、会话和用户的事实和偏好。
> 3.连接两者：保留工作状态的检查指针，添加 Hindsight 以获得持久的数据。
> 4. `BaseStore` 适配器 (`HindsightStore`）是最干净的桥 —LangGraph的原生跨线程存储，由Hindsight。
> 5.通过要求 *新话题* 记忆存储在 *旧线程* 中的内容来进行验证。

## 检查点记住（和忘记）什么 {#what-the-checkpointer-remembers-and-forgets}

ALangGraph检查点在每一步之后快照你的图的状态，并通过 对其进行键控 `thread_id`。这就是短期状态有用的原因：

- 对话在进程重新启动后仍然存在，因此您可以在运行中恢复。
- 人机循环中断可以工作，因为暂停状态是持久的。
- *这个帖子* 的完整消息历史记录可供*这个帖子* 使用。

检查指针的作用 **not** 所做的是跨线程共享任何内容。每个`thread_id`是一座岛屿。如果用户在一个线程中告诉您的智能体“我更喜欢深色模式”，并明天在新线程上返回，则新线程的检查指针将开始为空 - 它无法访问旧线程的状态。它也不是知识存储：它保存原始消息历史记录，而不是可以语义搜索的提炼事实。

那就是边界。检查点在*“这次谈话中我在哪里”*表现出色，在*“在所有对话中我对这个用户了解了很多。”*没什么好说的

## 短期状态与长期记忆 {#short-term-state-vs-long-term-memory}

这是逐层分割的：

||LangGraph 检查点（短期）|Hindsight（长期）|
|---|---|---|
|**范围**|1 `thread_id`|跨线程、会话和用户|
|**保存内容**|原始图状态/消息历史记录|蒸馏事实、偏好、经验|
|**索引键**|线程|记忆库（每个用户、租户或线程）|
|**检索**|加载整个线程状态|相关事实的语义记忆|
|**生命周期**|对话|耐用，跟随用户|
|**擅长场景**|恢复运行、中断|运行中的连续性|

他们写作干净，因为他们回答不同的问题。在单个图形运行中，检查点提供工​​作集（到目前为止的消息），而Hindsight记忆召回注入持久的事实，使智能体感觉它已经认识你了。运行结束后，Hindsight记忆存储将值得记住的内容提炼成长期记忆，为下一个线程做好准备。

[LangGraph 集成](/sdks/integrations/langgraph) 提供了三种添加长期层的模式：

- **工具** — `create_hindsight_tools()` 将记忆存储、记忆召回和反思公开为 LangChain `@tool`功能。 智能身体控制：模型决定何时记住或查找某些内容。也适用于普通的 LangChain。
- **节点** — `create_recall_node()` 和 `create_retain_node()` 坐在你身边LLM节点。记忆召回节点在模型运行前注入匹配的记忆；记忆存储节点存储消息。自动、确定地放置在图表中。
- **BaseStore 适配器** — `HindsightStore`实现LangGraph原生跨线程`BaseStore`接口，支持Hindsight。

## BaseStore 适配器作为桥梁 {#the-basestore-adapter-as-the-bridge}

LangGraph已经区分了这两个层API。 **checkpointer**是短期线程状态； **store** (`BaseStore`) 是LangGraph的官方主页*跨线程*长期记忆。 `HindsightStore` 直接插入该插槽，所以Hindsight成为持久的记忆后盾LangGraph自己的长期抽象。

你将两者都传递给`compile()`——短期检查点，长期存储——它们共存：

```python
from hindsight_client import Hindsight
from hindsight_langgraph import HindsightStore

client = Hindsight(base_url="http://localhost:8888")
store = HindsightStore(client=client)

graph = builder.compile(checkpointer=checkpointer, store=store)

#跨线程长期记忆，由命名空间键控
await store.aput(("user", "123", "prefs"), "theme", {"value": "深色模式"})
results = await store.asearch(("user", "123", "prefs"), query="主题偏好")
```

命名空间元组映射到Hindsight记忆库 ID 与 `.` 作为分隔符 (`("user", "123")` 成为记忆库`user.123`）和记忆库是在第一次访问时自动创建的。这正是存储成为天然桥梁的原因：您的 `("user", user_id)` 命名空间在每个线程中保持稳定，因此在一个线程中写入的值可以在同一用户的任何后续线程中搜索。

的一些性质 `HindsightStore` 在依赖它之前要知道：

- **仅支持异步。** 使用`aput`，`aget`，`asearch`，`abatch`，`adelete`，`alist_namespaces`。同步变体引发 `NotImplementedError`。
- **`get()` 基于召回。** 没有直接的键查找——键变成了记忆召回查询并且只有精确的 `document_id` 与 return 匹配，因此顶部记忆结果之外的项目可能看起来丢失。更喜欢`asearch` 用于语义检索。
- **`list_namespaces` 以会话为范围。** 它仅跟踪通过 写入的命名空间 当前进程中的 `aput()`；重新启动后，即使数据仍然存在，它也会返回空Hindsight。
- **`delete` 不执行操作。**Hindsight的记忆模型是面向附加的——在记忆存储过程中自动处理取代的事实——所以 `adelete()` 记录但不删除数据。

如果您想要更严格的提示控制或智能体驱动的记忆，节点和工具模式仍然可用；存储只是符合LangGraph自身长期记忆形状的选项。

## 连接LangGraph至Hindsight {#connect-langgraph-to-hindsight}

本指南是关于*状态与记忆*区分，不是安装。完整的安装和接线演练 — `pip install hindsight-langgraph`，连接客户端，添加recall/retain节点，并解析动态记忆库ID - 遵循[LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight)。一旦到位，本指南的其余部分将直接适用。

## 什么时候使用哪一层 {#which-layer-to-use-when}

到达与您正在回答的问题相匹配的图层：

- **只使用检查点机制** 当工作流程是单会话且自包含时 — 一次性任务、表单填写流程、下次运行时无需记住任何内容。短期状态就是您所需要的。
- **添加 Hindsight 召回/存储节点** 当你想要在每次跑步时自动、确定性的长期记忆时：在智能体思考之前记忆召回用户的持久事实，在响应后记忆存储什么值得保留。
- **添加 Hindsight 工具** 当智能体应该决定何时记住或查找某些内容时，或者当你在没有图表的普通 LangChain 上时。
- **使用 `HindsightStore`**当你特别想要的时候LangGraph的原生跨线程存储语义——命名空间、语义可搜索的长期记忆——与检查点一起存在。

在实践中，大多数生产图使用*两者*检查点和Hindsight层：当前对话的短期状态，长期记忆，因此下一个对话并不陌生。

## 验证跨线程的长期记忆 {#verify-long-term-memory-across-threads}

重点是跨线程连续性，因此直接测试：

1. 运行上的图表 **线程 A** 用于测试用户并存储持久的事实 - 例如“我更喜欢深色模式”——通过记忆存储节点、工具调用或 `store.aput`。
2. 开始**新线程 B** 对于*相同用户*（相同的记忆库ID/命名空间，新`thread_id`）。
3. 在线程 B 中提出一个取决于线程 A 事实的问题。
4. 确认记忆召回浮出水面——线程B的检查点为空，所以如果答案正确，则它来自长期记忆。
5. 重复*不同*用户并确认事实**not**泄漏——记忆库隔离严格。

如果线程 B 根据线程 A 的事实进行回答，并且不同的用户保持隔离，则短期状态和长期记忆正在正确组合。

## 常见错误 {#common-mistakes}

### 期望检查指针跨线程传递知识 {#expecting-the-checkpointer-to-carry-knowledge-across-threads}

检查点是per-设计为 `thread_id`。如果您需要跨线程或用户的连续性，那就是Hindsight的工作，而不是检查点的工作。

### 为每个用户重复使用一个记忆库ID {#reusing-one-bank-id-for-every-user}

如果每个请求都映射到同一个记忆库，则一个用户的事实会出现在另一个用户的事实中。解析每个用户的记忆库ID（例如`bank_id_from_config="user_id"`，或`("user", user_id)`命名空间），因此记忆保持在一定范围内。

### 在第二次运行时更改线程键但期望连续性 {#changing-the-thread-key-on-the-second-run-but-expecting-continuity}

新`thread_id` 是一个新的检查站——这是预料之中的。连续性来自于*bank/namespace*保持稳定，而不是线程。使同一用户的记忆库密钥在运行过程中保持不变。

### 期待`HindsightStore.adelete()` 删除数据 {#expecting-hindsightstoreadelete-to-remove-data}

`delete` 是一个空操作。Hindsight在记忆存储过程中自动取代事实；不要构建依赖于通过存储进行硬删除的逻辑。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 将客户端指向您自己的 URL（例如 `http://localhost:8888`）。 [Hindsight Cloud](https://hindsight.vectorize.io) 只是一个托管后端选项。

### Hindsight是否取代了检查指针？ {#does-hindsight-replace-the-checkpointer}

没有。他们从事不同的工作。保留短期线程状态的检查指针并添加Hindsight以实现长期记忆；两者一起运行。

### 应使用节点、工具还是存储适配器？ {#should-i-use-nodes-tools-or-the-store}

图执行前后自动召回和存储使用节点，智能体主动控制记忆（或普通 LangChain）使用工具，需要 LangGraph 原生跨线程存储语义时使用 `HindsightStore`。参见[上方决策指南](#which-layer-to-use-when)。

### 为什么记忆召回对于我存储的密钥没有返回任何内容？ {#why-did-recall-return-nothing-for-a-key-i-stored}

`HindsightStore.get()` 是基于记忆召回的，不是直接的键查找 — 仅是精确的 `document_id` 匹配 return，顶部记忆召回结果之外的项目可能看起来丢失。使用`asearch` 使用语义查询代替。

## 后续步骤 {#next-steps}

- 跟随[LangGraph 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-langgraph-memory-with-hindsight) 安装和接线集成
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管记忆后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[LangGraph 集成文档](/sdks/integrations/langgraph)
