---
title: "指南：Strands Agents 中的按智能体与共享记忆库"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, strands, multi-agent, memory]
description: "了解多个 Strands Agents 协作时，如何使用 Hindsight 原生的 @tool 存入、召回和反思功能，在按智能体隔离的记忆库与承载团队共同记忆的共享记忆库之间做出选择。"
image: /img/guides/guide-strands-per-agent-vs-shared-memory.svg
hide_table_of_contents: true
---

![指南：Strands Agents 中的按智能体与共享记忆库](/img/guides/guide-strands-per-agent-vs-shared-memory.svg)

使用 Strands Agents SDK 构建多智能体系统时，最重要的记忆策略选择是使用**按智能体划分还是共享的记忆库**：每个智能体各自使用私有记忆库，还是由多个智能体写入同一个共享记忆库？Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）操作都会限定在一个 `bank_id` 上，因此只需为每个智能体选择传给 `create_hindsight_tools(bank_id=...)` 的值，就能决定它们彼此隔离，还是共同积累团队的机构记忆。

单个 Strands 智能体很简单：一个用户，一个记忆库。真正需要考虑的是这样的协作流程：规划者把工作交给研究者，研究者再交给撰稿者；你必须决定每个智能体可以记住其他智能体的哪些信息。按智能体划分的记忆库能清晰隔离信息，避免相互污染。共享记忆库则让整个团队使用同一份记忆，因此一名智能体学到的事实，在下一次运行时也能被其他智能体使用。

本指南讨论的是**记忆库策略**，不是又一篇安装教程；[配置指南](/guides/2026/05/04/guide-strands-memory-with-hindsight) 已经介绍了如何接入工具。这里将说明何时应该隔离、何时应该共享，以及如何设置混合模式，让智能体读取共享记忆库，同时只写入自己的记忆库。

<!-- truncate -->

> **快速解答**
>
> 1. 为每个 Strands 智能体配置 Hindsight 工具：`create_hindsight_tools(bank_id=...)`。
> 2. 如果必须避免智能体之间相互污染上下文，就为每个智能体使用独立记忆库。
> 3. 如果团队需要共同积累一份机构记忆，就使用共享记忆库。
> 4. 混合模式下，让 `memory_instructions()` 指向共享记忆库（读取），并为存入工具配置私有记忆库（写入）。
> 5. 用一名智能体存入事实，再检查哪些智能体能召回它，以验证隔离是否生效。

## 记忆库策略的选择 {#the-bank-strategy-decision}

Hindsight 的每个工具每次调用只会在一个记忆库上运行，而且记忆库之间严格隔离，不会发生跨库泄漏。用 Strands 的术语来说，传给 `create_hindsight_tools()`（以及 `memory_instructions()`）的 `bank_id` 就决定了整个策略。两个智能体使用相同的 `bank_id`，就会共享记忆；如果它们使用不同的 `bank_id`，彼此就看不到对方的记忆。

因此，对每一对协作智能体来说，决策归结为一个问题：**一名智能体学到的内容，是否应该让另一名智能体看到？**

- 如果应该，就让它们共享一个记忆库。
- 如果不应该，就让它们各自拥有一个记忆库。
- 如果答案是“有时”——读取共享内容，写入私有记忆——就采用下文介绍的混合模式。

这些工具只是传给 `Agent(tools=[...])` 的普通函数，因此你可以在一个系统中自由组合不同策略。规划者可以拥有私有记忆库，同时由三名工作智能体共享一个记忆库。SDK 不会强制整个系统采用同一种策略。

## 何时应让每个智能体拥有自己的记忆库 {#when-each-agent-should-own-its-bank}

如果智能体承担的角色确实不同，混合它们的记忆弊大于利，就应该为每个智能体分配自己的 `bank_id`。

适合按智能体划分记忆库的情况：

- **角色或性格倾向不同。** 持怀疑态度的审阅智能体和乐观的头脑风暴智能体，不应该把各自学到的上下文混在一起。
- **不同智能体服务不同用户。** 如果每个智能体面向不同的最终用户，按用户划分的记忆库能提供平台保证的硬隔离。
- **工作智能体会产生大量噪声，或只会临时使用。** 临时智能体可能产生大量低价值观测，不应该污染谨慎的智能体所依赖的记忆库。
- **安全或租户边界。** 如果一名智能体绝不能看到另一名智能体的数据，独立记忆库就构成了隔离边界。

接入方式是为每个智能体配置一个记忆库：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

planner = Agent(tools=create_hindsight_tools(bank_id="planner"))
researcher = Agent(tools=create_hindsight_tools(bank_id="researcher"))
writer = Agent(tools=create_hindsight_tools(bank_id="writer"))
```

每个智能体都会获得自己的 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect` 工具，并且这些工具都限定在该智能体的记忆库中。撰稿者永远不会召回研究者存入的内容。

## 何时应让智能体共享记忆库 {#when-agents-should-share-a-bank}

如果多个智能体实际上属于同一个团队，共同完成一个目标，并且应该积累共享的机构记忆，就让它们使用同一个 `bank_id`。

适合使用共享记忆库的情况：

- **围绕同一主题开展的工作流。** 规划者、研究者和撰稿者共同撰写同一份报告时，研究者发现的事实可以被撰稿者召回，这会让整个流程受益。
- **项目或会话记忆。** 团队对某个项目了解到的所有内容都应该集中存放，并以项目而不是智能体作为区分依据。
- **必须携带上下文的交接。** 智能体 A 把工作交给智能体 B 时，共享记忆库能让 B 直接接续 A 已经建立的内容，无需你手动序列化并传递这些内容。

为每个智能体配置同一个记忆库：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

BANK = "project-atlas"

planner = Agent(tools=create_hindsight_tools(bank_id=BANK))
researcher = Agent(tools=create_hindsight_tools(bank_id=BANK))
writer = Agent(tools=create_hindsight_tools(bank_id=BANK))
```

现在，任何智能体调用 `hindsight_retain` 都会把内容写入 `project-atlas`，任何智能体调用 `hindsight_recall` 都能读取整个团队的记忆。`hindsight_reflect` 会综合团队存入的所有内容；当多名智能体各自贡献了部分信息时，这正是你需要的效果。

## 将 Strands 接入 Hindsight {#connect-strands-to-hindsight}

本指南假设工具已经接好。如果你还没有安装并接入 `hindsight-strands`，请先阅读 [Strands 配置指南](/guides/2026/05/04/guide-strands-memory-with-hindsight)。该指南介绍了如何运行 `pip install hindsight-strands`，通过 `configure()` 将工具指向 Hindsight Cloud 或本地服务器，以及如何使用原生 `@tool` 模式为每个智能体配置 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。完成后再回到这里选择记忆库策略。

## 混合模式：共享读取，私有写入 {#a-hybrid-shared-read-private-write}

通常你会希望兼顾两者：每个智能体都能**读取**团队共享的记忆，但**只能写入**自己的记忆库。这样，私有工作笔记在被提升到共享记录之前，就不会泄漏进去。

Hindsight 可以自然地实现这种模式，因为读取和写入使用各自限定记忆库范围的独立工具。通过 `memory_instructions()` 注入共享记忆库的内容（读取），并为存入工具指定私有记忆库（写入）：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools, memory_instructions

SHARED = "project-atlas"          # 读取：团队机构记忆
PRIVATE = "researcher"            # 写入：此智能体自己的笔记

# 将共享记忆库召回到系统提示中（读取侧）
shared_context = memory_instructions(bank_id=SHARED)

# 限定到私有记忆库的存入/召回工具（写入侧）
tools = create_hindsight_tools(bank_id=PRIVATE)

researcher = Agent(
    tools=tools,
    system_prompt=f"You are a research agent.\n\n{shared_context}",
)
```

智能体每次运行时，都会通过 `memory_instructions()` 注入团队共享的上下文；但它决定通过 `hindsight_retain` 存入的内容仍会进入自己的私有记忆库。要把发现提升到共享记忆中，可以明确地将其存入 `SHARED`。例如，可以另建一组限定到共享记忆库的工具，或者只给一名“发布者”智能体共享记忆库的写入权限，同时让其他智能体保持只读。

你还可以使用召回标签，限制每名智能体从共享记忆库中获取的内容。这样，多个智能体虽然共享一个记忆库，但每个智能体可以只读取自己的部分。详见 [Strands 集成文档](/sdks/integrations/strands) 中的 `recall_tags`。

## 验证记忆库策略 {#verify-the-bank-strategy}

确认隔离和共享的行为符合预期：

1. 使用智能体 A 存入一个容易辨认的事实，例如“API 截止日期是 March 3”。
2. 向智能体 B 询问这个事实。
3. 如果 A 和 B **共享**一个记忆库，B 应该能召回它；如果它们彼此**隔离**，B 就不应该能召回它。
4. 对于混合模式，确认智能体 A 的私有写入在提升到共享记忆库之前对 B *不可见*，同时共享上下文*会*注入两名智能体。

如果结果符合预期策略，记忆库就配置正确。如果不符合，请检查每个智能体的 `bank_id`，以及传给 `memory_instructions()` 的记忆库，确认它们都与你的预期完全一致。

## 常见错误 {#common-mistakes}

### 需要隔离时却共享了记忆库 {#sharing-a-bank-when-you-needed-isolation}

如果两个智能体意外共用了一个 `bank_id`，一名智能体产生的嘈杂记忆或角色专属记忆就会渗入另一名智能体的记忆中。如果智能体承担不同角色或服务不同用户，请为它们分别配置记忆库。

### 需要协作的智能体被隔离了 {#isolating-agents-that-needed-to-collaborate}

另一种常见问题是：工作流中的每名智能体都拥有私有记忆库，导致交接时丢失上下文，撰稿者也无法召回研究者的发现。如果整个团队共同完成一个目标，就应使用共享记忆库。

### 混合模式中读取和写入使用了不匹配的记忆库 {#mismatched-read-and-write-banks-in-the-hybrid}

在共享读取、私有写入的设置中，`memory_instructions()` 和存入工具本来就应该指向不同的记忆库。如果你意外让它们指向同一个记忆库，就会失去私有写入边界。请有意区分这两个 `bank_id` 的值。

### 根据不稳定的值构造 `bank_id` {#building-bank_id-from-something-unstable}

如果记忆库的值在不同运行之间发生变化，例如使用随机 ID 或时间戳，智能体就无法召回自己先前的记忆。应根据稳定的信息生成 `bank_id`，例如智能体角色、项目或用户。

## 常见问题解答 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器同样可用，只需让工具指向 `http://localhost:8888`，而不是 Cloud URL。两种方式使用的记忆库策略完全相同。

### 智能体能否只共享部分记忆？ {#can-agents-share-some-memory-but-not-all}

可以，这就是混合模式：通过 `memory_instructions()` 读取共享记忆库，同时通过存入工具写入私有记忆库。你也可以让智能体共享一个记忆库，并使用 `recall_tags` 让每名智能体只读取自己的部分。

### Reflect 能否处理共享记忆库中的内容？ {#does-reflect-work-across-a-shared-bank}

可以。`hindsight_reflect` 会综合其所限定的记忆库中的所有内容来生成答案。因此，如果它指向共享记忆库，就会基于整个团队的贡献进行推理。

### 记忆库多少才算太多？ {#how-many-banks-is-too-many}

没有硬性上限；记忆库成本低，而且隔离严格。根据协作结构来决定：每个隔离边界使用一个记忆库，每个团队或项目使用一个共享记忆库。

## 后续步骤 {#next-steps}

- 如果工具还没有接好，请先阅读 [Strands 配置指南](/guides/2026/05/04/guide-strands-memory-with-hindsight)。
- 试用面向托管后端的 [Hindsight Cloud](https://hindsight.vectorize.io)。
- 阅读[完整 Hindsight 文档](/)。
- 查看[快速入门指南](/developer/api/quickstart)。
- 查看 [Hindsight Recall API](/developer/api/recall)。
- 查看 [Hindsight Retain API](/developer/api/retain)。
- 阅读 [Strands 集成文档](/sdks/integrations/strands)。
