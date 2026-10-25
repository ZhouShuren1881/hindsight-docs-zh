---
title: "指南：在所有 Paperclip 智能体之间共享记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, paperclip, multi-agent, memory]
description: "借助 Hindsight，让每个 Paperclip 智能体都能共享组织范围内的记忆——只需安装一次插件，一个智能体学到的经验就能供所有其他智能体使用。"
image: /img/guides/guide-paperclip-shared-memory-across-agents.svg
hide_table_of_contents: true
---

![指南：在所有 Paperclip 智能体之间共享记忆](/img/guides/guide-paperclip-shared-memory-across-agents.svg)

在 Paperclip 中使用**共享记忆**，原因不是某个智能体会忘事，而是每个智能体都会*各自独立地*遗忘。只需安装一次 `@vectorize-io/hindsight-paperclip` 插件，此后 Paperclip 实例中的每个智能体都会在每次运行前自动召回记忆，并在每次运行后存入记忆。真正需要考虑的，不是要不要添加记忆，而是所有智能体应该共同使用**一个组织记忆库**，还是各自使用不同的记忆库。

本指南将讨论这个选择。插件在事件层运行：`agent.run.started` 会触发记忆召回，运行输出和评论会触发记忆存入，因此只需一个配置值，就能选择记忆的*组织方式*。让所有智能体使用同一个共享记忆库，分流智能体学到的经验就能立即供审查智能体和部署智能体使用。也可以按公司和智能体划分记忆范围，让每个智能体各行其道。插件相同，安装方式相同，记忆库策略不同。

下文会介绍“安装一次，所有智能体都能记住”的模式、共享记忆库何时优于每个智能体各用一个记忆库、何时确实需要隔离，以及许多智能体共用记忆后自动召回和存入的运行方式。至于安装插件和配置凭据等准备工作，现有的[设置指南](/guides/2026/04/16/guide-paperclip-memory-with-hindsight)已完整说明，本指南会链接到该指南，不再重复介绍。

<!-- truncate -->

> **快速解答**
>
> 1. 只需安装一次插件——参阅[设置指南](/guides/2026/04/16/guide-paperclip-memory-with-hindsight)。
> 2. 要共享记忆，请将 `dynamicBankId` 设为 `false`，并为每个智能体设置相同的 `bankId`。
> 3. 要进行隔离，请让 `dynamicBankId` 保持为 `true`，并选择 `bankGranularity`。
> 4. 随后，每个智能体都会自动执行运行前召回和运行后存入，并使用你选定的记忆库。
> 5. 让一个智能体存入一条事实，再让*另一个*智能体召回它，以此验证共享是否生效。

## 安装一次，所有智能体都能记住 {#install-once-every-agent-remembers}

插件安装在 Paperclip 实例级别，而不是逐个智能体安装。`@vectorize-io/hindsight-paperclip` 安装就绪后，会订阅 Paperclip 的事件系统，并以相同方式应用于每个智能体：

- 收到 `agent.run.started` 事件时，插件会获取对应 issue 并调用记忆召回，然后将结果缓存在插件状态中，供本次运行使用。
- 智能体运行期间，可以调用 `hindsight_recall(query)` 定向查找，也可以调用 `hindsight_retain(content)` 立即存入决策。
- 收到 `issue.comment.created` 事件时，插件会存入完整的评论正文；如果有评论作者，就将内容归于评论作者，否则归于 issue 受让人。
- `autoRetain` 默认值为 `true`，因此每次运行结束后都会存入运行输出。

你不必修改每个智能体的代码。明天在 Paperclip 中添加一个智能体，它就会自动继承相同的运行前召回和运行后存入行为。剩下唯一的问题是，每个智能体的记忆要流入哪个记忆库——这正是本指南讨论的配置选择。

## 一个共享记忆库，还是每个智能体各用一个记忆库 {#one-shared-bank-vs-per-agent-banks}

插件的记忆库行为由两个字段决定（完整表格请参阅[集成参考](/sdks/integrations/paperclip)）：

- **`dynamicBankId`**（默认值为 `true`）——根据 `bankGranularity` 生成记忆库 ID，因此不同智能体或公司会进入不同的记忆库。
- **`bankId`**——当 `dynamicBankId` 为 `false` 时使用的静态记忆库 ID。`bankId` 相同的所有智能体都会读写同一个记忆库。

这就形成了两种模式。

**一个共享的组织记忆库。**将 `dynamicBankId` 设为 `false`，并为每个智能体设置相同的 `bankId`：

```
{bankId}   ← 静态共享记忆库（dynamicBankId = false）
```

这样，任何一个智能体学到的内容都会写入同一个记忆库，其他智能体也都能从中召回。分流智能体发现客户总是希望先收到 Slack 提醒再收到邮件；通知智能体下次运行时就能召回这个偏好，无需任何人再次录入。这就是组织范围内的机构记忆模式：整个智能体群共同变得更聪明，而不是一次只提升一个智能体。

**按智能体（或公司）划分记忆库。**让 `dynamicBankId` 保持默认值 `true`，由 `bankGranularity` 决定键的组成方式。默认值为 `["company", "agent"]`：

```
paperclip::{companyId}::{agentId}   ← 默认：按公司和智能体划分
paperclip::{companyId}              ← 按公司划分（该公司的智能体共享）
paperclip::{agentId}                ← 按智能体划分（同一智能体跨公司的记忆）
```

按 `company` 划分是一个很有用的折中方案：同一家公司内的智能体共享记忆，但不同公司彼此隔离——机构记忆按*租户*划分，而不是覆盖整个实例。

## 何时隔离智能体 {#when-to-isolate-an-agent}

共享记忆功能强大，因此隔离应该是经过审慎考虑的选择，而不是偶然造成的。遇到以下情况时，可按智能体或公司划分记忆库：

- **不同租户的内容不能混在一起。**在多租户设置中，将一家公司的上下文召回到另一家公司的运行中，会造成数据隔离问题。请在粒度中保留 `companyId`，或添加 `"user"` 以按用户隔离：

  ```
  paperclip::{companyId}::{agentId}::user::{userId}   ← 按用户隔离（有助于满足 GDPR 要求）
  ```

- **智能体的观点互相冲突。**如果“保守的审查者”智能体和“激进的优化者”智能体共用一个记忆库，它们会用与对方角色相矛盾的经验污染彼此的上下文。隔离可让每个智能体的记忆与其职责保持一致。
- **你正在进行试验。**仍在调试的新智能体不应把尚未成熟的结论写入整个智能体群依赖的记忆库。在你信任它之前，先给它单独的记忆库；确认可靠后，再将其提升为共享记忆库的一部分。

经验法则是：智能体在同一领域协作时，默认共享；如果它们之间的边界关系到正确性或合规性，就进行隔离。

## 将 Paperclip 连接到 Hindsight {#connect-paperclip-to-hindsight}

现有设置指南完整介绍了安装插件、自托管或连接到 Hindsight Cloud，以及配置 API 密钥。请先按照该指南完成设置，再回到这里选择记忆库策略：

- [指南：使用 Hindsight 为 Paperclip 添加记忆](/guides/2026/04/16/guide-paperclip-memory-with-hindsight)

安装并配置插件后，要实现共享记忆，只需更改 **Settings → Plugins → Hindsight Memory** 中的 `dynamicBankId` / `bankId` 设置。

## 自动召回和存入如何在多个智能体间运行 {#how-automatic-recall-and-retain-behave-across-agents}

使用共享记忆库后，运行前召回、运行后存入的循环就会成为整个智能体群的反馈机制，而不再局限于单个智能体：

- **召回是整个智能体群的读取操作。**任何智能体开始运行时，其召回查询都会从共享记忆库中读取所有智能体写入的内容。新智能体第一次运行时，就能受益于智能体群数月来积累的记忆。
- **存入是整个智能体群的写入操作。**每次运行的输出、每项已存储的决策，以及每条 issue 评论都会流入同一个记忆库。记忆以记忆库为键，而不是以运行 ID 为键，因此会持续累积，不会在每次运行时重置。
- **召回预算仍按每次运行计算。**`recallBudget`（`low`、`mid`、`high`）控制每次召回的彻底程度；它不会改变读取哪个记忆库。共享记忆库变大不会因此让召回变慢——可按需调整预算。
- **归属信息会得到保留。**即使使用共享记忆库，存入的事实也会带有其作者信息（评论作者或 issue 受让人），因此召回结果可以指出是谁确立了某项约定。

实际效果是，智能体不再各自重复发现相同的上下文。一个智能体历经摸索学到的经验，会成为整个智能体群下次运行时已有的知识。

## 验证共享记忆是否生效 {#verify-that-shared-memory-is-working}

要真正证明记忆是*共享的*（而不只是每个智能体各自有记忆），应让两个不同的智能体使用同一个记忆库进行测试：

1. 配置共享记忆库（两个智能体都设为 `dynamicBankId` = `false`，并使用相同的 `bankId`）。
2. 让**智能体 A**运行并存入一条独特的事实，例如部署必须等待值班人员批准。
3. 针对相关 issue 触发**智能体 B**（另一个智能体）。
4. 确认智能体 B 的召回结果中出现了智能体 A 存入的事实，无需你再次录入。

如果智能体 B 能看到智能体 A 学到的内容，跨智能体共享记忆就已生效。如果看不到，两个智能体几乎肯定使用了不同的记忆库——请检查两者的 `dynamicBankId` 是否都为 `false`，以及 `bankId` 是否完全相同。

## 常见错误 {#common-mistakes}

### `dynamicBankId` 为 `true` 时还期待共享 {#expecting-sharing-while-dynamicbankid-is-true}

默认粒度为 `["company", "agent"]`，因此每个智能体都会有自己的记忆库。要共享记忆，必须采用更粗的粒度（例如 `company`），或者使用静态 `bankId` 并将 `dynamicBankId` 设为 `false`。

### `bankId` 值不一致 {#mismatched-bankid-values}

一个拼写错误就会让两个智能体写入不同的记忆库，彼此无法看到对方的记忆。要共享记忆库，每个智能体的 `bankId` 字符串都必须完全相同。

### 在彼此敌对的租户之间共享记忆库 {#sharing-a-bank-across-hostile-tenants}

公司范围或实例范围的共享有利于协作，却不适合需要隔离的场景。如果两家公司不得访问彼此的数据，请在粒度中保留 `companyId`。

### 只用一个智能体验证 {#verifying-with-one-agent}

一个智能体召回自己存入的事实，只能证明它有自己的记忆。要证明记忆确实*共享*，写入记忆的智能体和读取记忆的智能体必须不同。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器运行方式相同——将 `hindsightApiUrl` 指向你的实例即可（例如 `http://localhost:8888`）。设置指南介绍了这两种方式。

### 可以在一个实例中同时使用共享记忆和隔离记忆吗？ {#can-i-mix-shared-and-isolated-agents-in-one-instance}

可以。记忆库行为由配置决定，因此你可以让一组核心协作智能体使用共享的 `bankId`，同时让其他智能体继续使用默认的公司加智能体粒度。

### 共享记忆库变大后，召回会变慢吗？ {#does-a-bigger-shared-bank-slow-recall-down}

基本不会。召回的彻底程度由 `recallBudget` 决定，而不是由记忆库大小决定。希望兼顾效果和速度时可设为 `mid`，追求速度时可设为 `low`。

### 以后如何从按智能体划分改为共享？ {#how-do-i-move-from-per-agent-to-shared-later}

将 `dynamicBankId` 改为 `false`，再设置一个共同的 `bankId`。现有的按智能体划分的记忆库会保留原样；此后新记忆会累积到共享记忆库中。

## 后续步骤 {#next-steps}

- 先参阅 [Paperclip 设置指南](/guides/2026/04/16/guide-paperclip-memory-with-hindsight)配置插件
- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight Recall API](/developer/api/recall)
- 查看 [Hindsight Retain API](/developer/api/retain)
- 阅读 [Paperclip 集成文档](/sdks/integrations/paperclip)
