---
title: "指南：在所有Paperclip智能体中共享记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, paperclip, multi-agent, memory]
description: "让每个Paperclip智能体在组织范围内与Hindsight共享记忆——安装插件一次，一个智能体的课程就可供所有其他智能体使用。"
image: /img/guides/guide-paperclip-shared-memory-across-agents.svg
hide_table_of_contents: true
---

![指南：所有 Paperclip 智能体共享记忆](/img/guides/guide-paperclip-shared-memory-across-agents.svg)

到达的理由 **共享记忆** 在Paperclip不是单个智能体忘记了——而是每个智能体都忘记了*独立*。您安装`@vectorize-io/hindsight-paperclip` 插件一次，从那时起，您的每个智能体Paperclip实例在每次运行前获得自动记忆召回，并在每次运行后获得记忆存储。有趣的决定不在于是否添加记忆，而在于你所有的智能体是否应该从中汲取 **一个组织记忆库** 或分开保存。

本指南就是关于这个决定的。因为插件运行在事件层——`agent.run.started` 触发记忆召回，运行输出和评论触发记忆存储 — 您可以选择  具有单个配置值的记忆的*形状*。将每个智能体指向一个共享的记忆库，您的分类智能体学到的课程可立即供您审查智能体和部署智能体使用。或者每个公司和每个智能体的记忆范围，以便每个人都保持在自己的轨道上。相同的插件，相同的安装，不同的记忆库策略。

下面介绍了“安装一次，所有智能体记住”模型，当一个共享的记忆库击败每个智能体记忆库时，当隔离实际上很重要时，以及一旦许多智能体共享相同的记忆，自动记忆召回和记忆存储如何表现。对于管道 - 安装插件和接线凭证 - [配置指南](https://hindsight.vectorize.io/guides/2026/04/16/guide-paperclip-memory-with-hindsight) 已经涵盖了它，本指南链接到那里而不是重复它。

<!-- truncate -->

> **快速解答**
>
> 1.安装插件一次 - 请参阅 [配置指南](https://hindsight.vectorize.io/guides/2026/04/16/guide-paperclip-memory-with-hindsight)。
> 2.为了共享记忆，设置 `dynamicBankId`至`false`并给予每个智能体相同的`bankId`。
> 3.为了隔离，离开`dynamicBankId` `true` 并选择一个 `bankGranularity`。
> 4. 记忆召回-之前和记忆存储-之后会针对每个智能体自动运行到您选择的任何记忆库中。
> 5.通过让一个智能体存储一个事实和一个*不同*智能体记忆来验证它。

## 安装一次，每个智能体都会记住 {#install-once-every-agent-remembers}

插件安装在Paperclip-实例级别，不是每个智能体。一次`@vectorize-io/hindsight-paperclip`已就位，已订阅Paperclip的事件系统，统一适用于每个智能体：

- 开`agent.run.started`，它获取问题并调用记忆召回，将结果缓存在该运行的插件状态中。
- 智能体运行时，可以调用`hindsight_recall(query)` 用于定向查找和 `hindsight_retain(content)` 立即存储决定。
- 开`issue.comment.created`，它保留完整的评论正文，归属于评论作者（当存在时），否则归属于问题受让人。
- 与`autoRetain` 默认为 `true`，每次运行后都会保留运行输出。

你不接触每个智能体的代码。明天向Paperclip添加一个智能体，它会自动继承相同的记忆召回之前/记忆存储之后的行为。剩下的唯一问题是每个智能体的记忆流入哪个记忆库 - 这就是本指南所涉及的配置选择。

## 一个共享记忆库与每个智能体记忆库 {#one-shared-bank-vs-per-agent-banks}

插件的记忆库行为由两个字段驱动（请参阅[集成参考](/sdks/integrations/paperclip) 为全表）：

- **`dynamicBankId`**（默认`true`) — 从导出记忆库 ID `bankGranularity`，如此不同agents/companies登陆不同的记忆库。
- **`bankId`** — 时使用的静态记忆库 `dynamicBankId` 是 `false`。每个共享该值的智能体都会读取和写入相同的记忆库。

这给了你两种姿势。

**一个共享组织记忆库。**套装`dynamicBankId`至`false`并给予每个智能体相同的`bankId`：

```
{bankId}   ← static shared bank (dynamicBankId = false)
```

现在，任何一个智能体所学到的东西都会被写入一个记忆库，并且所有其他智能体都会从中回忆起。您的分类智能体注意到客户总是希望在发送电子邮件之前收到 Slack 警报；您的通知智能体会在下次运行时回忆起该首选项，而无需任何人对其进行重新编码。这是整个组织范围内的机构记忆模型：舰队作为一个整体变得更加智能，而不是一次只有一个智能体。

**按智能体或公司划分记忆库。**离开`dynamicBankId` 默认为 `true` 并让 `bankGranularity` 塑造钥匙形状。默认为 `["company", "agent"]`：

```
paperclip::{companyId}::{agentId}   ← default: per company + agent
paperclip::{companyId}              ← company granularity (shared across that company's agents)
paperclip::{agentId}                ← agent granularity (one agent's memory across companies)
```

`company` 粒度是有趣的中间立场：一家公司内的智能体共享记忆，但公司之间保持隔离——机构记忆*每个机场*而不是整个实例。

## 何时隔离智能体 {#when-to-isolate-an-agent}

共享记忆是强大的，这正是为什么隔离应该是一个深思熟虑的选择而不是偶然的原因。在以下情况下达到每个智能体或每个公司的记忆库：

- **不同租户的上下文不能混合。** 在多租户设置中，将一家公司的上下文重新调用到另一家公司的运行中是一个数据隔离问题。保留粒度中 `companyId`，或添加`"user"` 用于每用户隔离：

  ```
  paperclip::{companyId}::{agentId}::user::{userId}   ← per-user (GDPR-friendly)
  ```

- **智能体对事实的理解存在冲突。** 如果“保守的审阅者”智能体和“积极的优化者”智能体共享一个记忆库，每个人都会用与其自身角色相矛盾的教训来污染对方的背景。隔离使每个智能体的记忆与其工作保持一致。
- **正在进行实验。** 您仍在调整的新智能体不应该将半成形的结论写入整个舰队所依赖的记忆库中。给它一个自己的记忆库，直到你信任它，然后将其提升为共享记忆库。

经验法则：智能体在同一域上协作时默认共享；当它们之间的边界是正确性或合规性边界时进行隔离。

## 连接Paperclip至Hindsight {#connect-paperclip-to-hindsight}

​​安装插件、自托管或指向Hindsight Cloud，以及连接API密钥都在现有的设置指南中进行了端到端的介绍。首先遵循它，然后回到这里选择你的记忆库策略：

- [指南：使用 Hindsight 为 Paperclip 添加记忆](https://hindsight.vectorize.io/guides/2026/04/16/guide-paperclip-memory-with-hindsight)

安装并配置插件后，共享记忆所需的唯一更改是`dynamicBankId` / `bankId` 设置**设置 → 插件 → Hindsight 记忆（Settings → Plugins → Hindsight Memory）**。

## 自动记忆召回和记忆存储如何在智能体中表现 {#how-automatic-recall-and-retain-behave-across-agents}

有了共享的记忆库，记忆召回之前/记忆存储之后的循环就变成了整个舰队的反馈循环，而不是每个智能体的反馈循环：

- **召回是整个智能体群的读取操作。** 当任何智能体开始运行时，其记忆召回查询将从每个智能体写入共享记忆库的所有内容中提取。全新智能体的首次运行就已经受益于数月积累的舰队记忆。
- **存储是整个智能体群的写入操作。** 每次运行的输出、每个存储的决策和每个问题评论都会流入同一个记忆库。 记忆是记忆库的关键，而不是运行 ID，因此它会累积而不是重置每次运行。
- **召回预算仍按每次运行应用。**`recallBudget` (`low`，`mid`，`high`) 控制每个记忆的彻底程度；它没有改变*哪个*记忆库已读取。更大的共享记忆库不会迫使记忆召回变慢——根据口味调整预算。
- **保留归属信息。** 即使在共享的记忆库中，保留的事实也带有其作者（评论作者或问题受让人），因此记忆召回可以显示谁建立了给定的约定。

实际后果：智能体停止独立地重新发现相同的上下文。一个智能体来之不易的教训将成为整个舰队下一次航行的起始知识。

## 验证共享记忆是否有效 {#verify-that-shared-memory-is-working}

实际证明*分享*记忆（不仅仅是每个智能体记忆）的测试使用两种不同的智能体对抗一个记忆库：

1. 配置共享记忆库（`dynamicBankId` = `false`，同上`bankId`）。
2. 有**智能体 A** 运行并存储一个独特的事实 - 例如，部署必须等待待命批准。
3. 触发器**智能体 B**（不同的智能体）关于相关问题。
4. 无需重新编码，即可确认智能体B的记忆召回表面智能体A的事实。

如果智能体B看到智能体A学到的东西，跨智能体共享的记忆就会生效。如果没有，这两个智能体几乎肯定会登陆不同的记忆库——检查两者是否都有 `dynamicBankId` = `false` 和完全相同`bankId`。

## 常见错误 {#common-mistakes}

### 期待分享`dynamicBankId` 是 `true` {#expecting-sharing-while-dynamicbankid-is-true}

默认粒度为`["company", "agent"]`，所以每个智能体都有自己的记忆库。共享记忆需要较粗的粒度（例如 `company`) 或静态 `bankId` 与 `dynamicBankId` = `false`。

### 不匹配`bankId`值 {#mismatched-bankid-values}

一个拼写错误意味着两个智能体写入两个不同的记忆库并且永远看不到彼此的记忆。对于共享记忆库，每个智能体必须具有相同的 `bankId` 字符串。

### 在敌对租户之间共享记忆库 {#sharing-a-bank-across-hostile-tenants}

公司范围或实例范围的共享非常有利于协作，但不利于隔离。如果两家公司不得看到对方的数据，请保留 粒度上 `companyId`。

### 用一个智能体进行验证 {#verifying-with-one-agent}

单个智能体回忆起自己保留的事实只能证明每个智能体的记忆。为了证明*分享*记忆，书写智能体和阅读智能体必须不同。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器工作原理相同 — 点 `hindsightApiUrl` 根据您的情况（例如 `http://localhost:8888`）。设置指南涵盖了这两个路径。

### 我可以在一个实例中混合共享和隔离的智能体吗？ {#can-i-mix-shared-and-isolated-agents-in-one-instance}

是的。 记忆库行为是由配置驱动的，因此您可以将一组核心的协作智能体指向共享的`bankId`，同时将其他智能体保留为默认的每个智能体粒度。

### 更大的共享记忆库是否会减慢记忆召回速度？ {#does-a-bigger-shared-bank-slow-recall-down}

没有意义。 记忆彻底性由 决定 `recallBudget`，不是记忆库大小。保持在`mid` 平衡，或 `low`速度。

### ​​如何从单独智能体转变为稍后共享？ {#how-do-i-move-from-per-agent-to-shared-later}

开关`dynamicBankId`至`false`并设置一个共同的`bankId`。现有的每个智能体记忆库保留在原处；新的记忆将在共享记忆库中不断积累。

## 后续步骤 {#next-steps}

- 首先使用 设置插件 [Paperclip 配置指南](https://hindsight.vectorize.io/guides/2026/04/16/guide-paperclip-memory-with-hindsight)
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Paperclip 集成文档](/sdks/integrations/paperclip)
