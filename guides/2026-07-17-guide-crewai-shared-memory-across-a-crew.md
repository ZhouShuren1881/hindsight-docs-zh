---
title: "指南：在 CrewAI 团队中共享记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, crewai, multi-agent, memory]
description: "了解 CrewAI 团队何时应共用一个 Hindsight 记忆库，何时应为各智能体分别设置隔离的记忆库，以及记忆如何在智能体之间流动。"
image: /img/guides/guide-crewai-shared-memory-across-a-crew.svg
hide_table_of_contents: true
---

![指南：在 CrewAI 团队中共享记忆](/img/guides/guide-crewai-shared-memory-across-a-crew.svg)

如果你运行的是多智能体 CrewAI 团队，真正要考虑的不是要不要添加记忆，而是如何划定记忆范围。**在 CrewAI 团队中共享记忆**，意味着每个智能体——研究员、分析员、写作者——都读写同一个 Hindsight 记忆库，因此一个智能体得出的发现对接下来的智能体可见。另一种做法是按智能体隔离：每个角色使用自己的记忆库，各自专门处理任务，避免相互干扰。

这是一个策略选择，而不是安装步骤。CrewAI 已通过 `ExternalMemory` 提供存储边界，Hindsight 的 `HindsightStorage` 可以接入其中：`search()` 在每项任务开始时对应记忆召回，`save()` 在每项任务完成后对应记忆存入。`bank_id` 和 `per_agent_banks` 的取值决定团队表现得像共用一本笔记的队伍，还是像各自使用私人文件的专家小组。

本指南介绍何时适合让团队共用一个记忆库、何时更适合按智能体隔离、一次启动过程中记忆实际上如何在智能体间流动，以及如何通过混合模式兼顾两者。如果你还没有接入集成，请先按照 [CrewAI 接入指南](/guides/2026/05/04/guide-crewai-memory-with-hindsight)完成设置，再回来选择范围策略。

<!-- truncate -->

> **快速解答**
>
> 1. 默认让整个团队共用一个记忆库：`HindsightStorage(bank_id="my-crew")`。
> 2. 这样每个智能体都会读写同一份记忆，研究员的发现对写作者可见。
> 3. 如果各角色需要专门处理任务，且不应混入其他角色存入的所有细节，可切换为 `per_agent_banks=True`。
> 4. 混合使用时，以共享记忆库协调工作，并给一名智能体单独提供一个私有 `HindsightStorage` 实例作为草稿区。
> 5. 让智能体 A 在第一次运行时存入一条事实，再让智能体 B 在第二次运行时召回它，以此验证。

## 为什么团队需要共享记忆 {#why-crews-need-shared-memory}

团队协作时，知识不应在交接过程中消失。在一次启动中，CrewAI 会按顺序运行任务：研究员先收集发现，随后写作者对其进行总结。在这一次运行中，CrewAI 会沿任务链传递任务输出。但在多次运行之间——第二次、第三次，乃至第十次启动同一个团队时——如果没有持久化机制，这种连续性就会消失。

共享记忆能让团队从一次性流水线变成不断积累知识的组织。所有智能体都写入同一个记忆库时，团队会建立一套共享的事实、实体和关系，供每个角色使用。研究员不必重新研究上周已经覆盖过的主题；写作者也能召回团队先前确定的语气和结论。这很适合反复执行同类工作的研究、规划和运维团队。

Hindsight 让共享记忆库不只是对话记录的堆放处。存入时，它会从原始任务输出中提取事实、实体和关系；召回时，它会运行语义检索、BM25、图遍历和重排序，找出与当前任务相关的内容。因此，团队共用记忆库并不只是“所有人都能看到所有内容”，更是“所有人都能看到此刻重要的内容”。

## 整个团队共用一个记忆库，还是按智能体分库 {#one-shared-crew-bank-vs-per-agent-banks}

选择取决于智能体是协作完成同一项交付，还是分别专注于不同事项。

**适合共用一个团队记忆库的情况：**

- 智能体共同完成同一项输出，需要彼此的上下文（例如研究员为写作者提供资料）。
- 你希望团队拥有机构级记忆，保存决策、约定和发现，让它们不随某个角色的工作结束而消失。
- 协调比专门化更重要。

```python
storage = HindsightStorage(bank_id="research-crew")
crew = Crew(agents=[researcher, writer], tasks=[...],
            external_memory=ExternalMemory(storage=storage))
```

**适合按智能体分库的情况：**

- 每个角色都需要范围更窄的记忆，不应吸收其他角色的所有细节。
- 混合记忆会增加噪声，例如事实核查智能体的记忆库应避免混入写作者的草稿。
- 专门化比协调更重要。

```python
storage = HindsightStorage(bank_id="research-crew", per_agent_banks=True)
# 研究员 -> "research-crew-researcher"
# 写作者 -> "research-crew-writer"
```

设置 `per_agent_banks=True` 后，每个智能体的 `save()` 都会写入一个根据其角色派生出的记忆库。如果你需要不同的命名方案，可以传入 `bank_resolver`——一个 `(bank_id, agent) -> bank_id` 函数——来自行控制命名。

共享记忆更利于协调，隔离记忆更利于专门化。大多数团队会先使用一个共享记忆库，只有在某个特定角色确实需要干净、范围更窄的存储空间时才拆分。

## 记忆如何在智能体之间流动 {#how-memory-flows-between-agents}

理解记忆流动方式很重要，因为 CrewAI 自动调用记忆的方法可能与你的预期不同。

启动团队时，CrewAI 会在每项任务开始时调用 `search()`，并在每项任务完成后调用 `save()`。如果整个团队共用一个记忆库，流程很直接：每次 `save()` 都写入 `my-crew`，每次 `search()` 都从 `my-crew` 读取。研究员存入的发现会在写作者任务开始时被召回，因此记忆会自动沿团队向后流动。

使用 `per_agent_banks=True` 时有一个重要细节：CrewAI 的 `search()` 方法不会接收智能体参数，因此任务开始时自动进行的召回会查询**基础记忆库**，而不是各智能体自己的记忆库；`save()` 则仍然写入各智能体自己的记忆库。也就是说，按智能体分库会隔离写入，但不会隔离自动读取。如果你确实需要隔离各智能体的检索，应为每个智能体分别创建一个 `HindsightStorage` 实例，而不要依赖 `per_agent_banks`。

如果要明确控制智能体之间的记忆流动，可以给需要这项能力的智能体添加 `HindsightReflectTool`。智能体调用该工具后，得到的是综合所有相关记忆、并考虑性格倾向生成的答案，而不是原始召回片段。这很有用：研究员开始工作前可以先核对“what do we already know?”，写作者起草前也可以回顾以往的结论。Reflect（反思）工具使用自己的 `bank_id`，因此你可以让团队中的一个智能体指向共享记忆库，另一个指向私有记忆库。

## 将 CrewAI 接入 Hindsight {#connect-crewai-to-hindsight}

如果你还没有安装并接通集成，请参阅专门的接入指南。该指南介绍了 `pip install hindsight-crewai`、面向 Cloud 或自托管服务的 `configure(...)`，以及如何将 `HindsightStorage` 接入 `ExternalMemory`：

- [指南：使用 Hindsight 为 CrewAI 添加持久记忆](/guides/2026/05/04/guide-crewai-memory-with-hindsight)

团队开始使用记忆后，本指南的其余内容将帮助你选择合适的记忆范围。

## 混合模式：共享上下文加私人草稿区 {#a-hybrid-shared-context-plus-private-scratch}

你不必只能二选一。常见模式是用共享团队记忆库协调工作，同时为需要草稿空间的某个智能体提供一个私有记忆库。

共享记忆库保存团队的机构级记忆：所有角色都应了解的发现、决策和约定。如果某个智能体会生成大量中间推理，而你不希望这些内容污染共享存储——例如分析员需要反复修改草稿——就可以给它第二个私有 `HindsightStorage`（或一个使用私有记忆库的 Reflect 工具），让它自行写入。

```python
# 共享团队记忆：所有人通过此记忆库协调
shared = HindsightStorage(bank_id="research-crew",
                          mission="Track research findings and crew decisions.")

# 分析员的私人草稿区，与共享记忆库隔离
analyst_scratch = HindsightReflectTool(bank_id="research-crew-analyst-scratch")
analyst = Agent(role="Analyst", goal="...", backstory="...",
                tools=[analyst_scratch])

crew = Crew(agents=[researcher, analyst, writer], tasks=[...],
            external_memory=ExternalMemory(storage=shared))
```

团队通过 `ExternalMemory` 使用共享记忆库进行协调，而分析员通过 Reflect 工具在自己的私有记忆库中进行推理。在共享记忆库上设置 `mission`，有助于 Hindsight 围绕团队的实际目标组织存入的内容。

## 验证共享记忆是否正常工作 {#verify-that-shared-memory-is-working}

共享记忆的作用，是让一名智能体的输出在后续运行中出现在另一名智能体的上下文里。可以直接按以下方式测试：

1. 运行团队一次，让靠前的智能体（研究员）输出一条容易记住的事实或决策。
2. 等待这次运行结束，让 CrewAI 通过 `save()` 将该输出存入共享记忆库。
3. 再次启动团队，给另一名智能体（写作者）安排相关任务。
4. 确认写作者无需人工提醒就能召回之前的事实。

例如：第一次运行时，让研究员分析 Rust 的优势并存入发现。第二次运行时，将任务改为“compare Rust with Go”——如果团队自行带回之前的 Rust 分析，就说明共享记忆正在工作。

如果第二次运行无法召回第一次运行的内容，请启用 `verbose=True`，确认两次运行使用了相同的 `bank_id`，并检查存入调用是否确实已完成。

## 常见错误 {#common-mistakes}

### 误以为按智能体分库也会隔离召回 {#assuming-per-agent-banks-isolate-recall-too}

`per_agent_banks=True` 会隔离 `save()` 写入，但 CrewAI 的自动 `search()` 仍会查询基础记忆库，因为它不会传递智能体参数。若要真正隔离各智能体的检索，请为每个智能体使用独立的 `HindsightStorage` 实例。

### 过早按智能体分库 {#splitting-into-per-agent-banks-too-early}

大多数团队先使用共享记忆更合适。只有当某个角色的记忆库确实需要保持干净且范围较窄时，才将其隔离；不要默认分库。

### 在不同运行之间更改记忆库 ID {#changing-the-bank-id-between-runs}

只有两次运行使用相同的 `bank_id`，召回才能取回较早的上下文。第二次运行使用了不同的记忆库 ID，看起来会像召回失效，实际原因是范围不匹配。

### `mission` 过于宽泛 {#a-mission-that-is-too-vague}

如果为记忆库设置 `mission`，内容应足够具体，能够指导提取。过于宽泛的任务说明无法为 Hindsight 提供足够的组织依据。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以使用自托管的 Hindsight 服务器——将 `configure(hindsight_api_url=...)` 指向本地 API（例如 `http://localhost:8888`），并省略 API 密钥。

### 默认情况下，整个团队应该共用一个记忆库吗？ {#should-the-whole-crew-share-one-bank-by-default}

通常应该如此。先用一个共享记忆库协调工作，只有在某个特定角色需要隔离且范围更窄的记忆时，才按智能体分库。

### 一名智能体的记忆如何传给另一名智能体？ {#how-does-one-agents-memory-reach-another-agent}

通过共享记忆库传递。使用同一个 `bank_id` 时，每个智能体的 `save()` 都会写入该库，每项任务开始时的 `search()` 也都会从该库读取，因此发现会自动向后传递。添加 `HindsightReflectTool` 可以明确控制智能体如何召回记忆。

### 能否在一个团队中混用共享记忆和隔离记忆？ {#can-i-mix-shared-and-isolated-memory-in-one-crew}

可以。通过 `ExternalMemory` 使用共享记忆库来协调工作，再为特定智能体提供一个私有 `HindsightStorage` 实例或一个使用私有记忆库的 Reflect 工具作为草稿区。

## 后续步骤 {#next-steps}

- 先按照 [CrewAI 接入指南](/guides/2026/05/04/guide-crewai-memory-with-hindsight)设置集成。
- 如果想使用托管记忆后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的召回 API](/developer/api/recall)。
- 查阅 [Hindsight 的存入 API](/developer/api/retain)。
- 阅读 [CrewAI 集成文档](/sdks/integrations/crewai)。
