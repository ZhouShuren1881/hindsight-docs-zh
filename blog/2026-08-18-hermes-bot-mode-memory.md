---
title: "让每个 Hermes 机器人都拥有自己的记忆"
authors: [benfrank241]
slug: "2026/08/18/hermes-bot-mode-memory"
date: 2026-08-18T12:00
tags: [hindsight, hermes, bot-mode, multi-agent, agent-memory, shared-memory]
description: "Nous 刚刚为 Hermes 推出了 Bot Mode：可命名的机器人，每个机器人都有自己的记忆。借助 Hindsight，这些记忆会持久保存，并且能按机器人精确划定范围。"
image: /img/blog/hermes-bot-mode-memory.webp
hide_table_of_contents: true
---

![Hermes Bot Mode 与 Hindsight：为每个命名机器人分配独立记忆库，也可以让协作房间中的机器人共享一个记忆库](/img/blog/hermes-bot-mode-memory.webp)

:::info 本文发布后，设置方式已有变化
Hindsight 不再随 Hermes 一同打包。Nous Research 已将所有记忆提供方移出 Hermes 核心代码树，因此新安装现在需要先运行 `hermes plugins install hindsight`，再运行 `hermes memory setup`。现有安装会自动迁移。请参阅[成为 Hermes 插件后，Hindsight 有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

Nous Research 刚刚为 Hermes 推出了 [Bot Mode](https://x.com/NousResearch/status/2089429432612147572)。你的智能体配置档案会变成一组可命名的**机器人**，每个机器人都有自己的角色、模型、技能和头像。机器人可以使用任何模型，甚至可以在同一个共享房间里彼此交谈。只需打造一次专业机器人，就能一直使用它。

这则公告中对我们最重要的是一句简短的话：**每个机器人都有自己的记忆。**这正是 [Hindsight](https://vectorize.io/hindsight) 可以发挥作用的地方，也决定了一组机器人最终会成为真正的团队，还是一群只有名字的金鱼。

<!-- truncate -->

## TL;DR {#tldr}

- **Bot Mode** 将 Hermes 智能体配置档案变成可命名的机器人，每个机器人都有自己的角色、模型、技能和**记忆**。2 到 6 个机器人的房间可以协同工作。
- 机器人能发挥多大作用，取决于它能否记住会话之间的信息。Hermes 已将 **Hindsight** 用作原生记忆提供方，因此只需一条设置命令，就能让记忆持久保存。
- 关键在于选择*范围*。在 Hindsight 中，**记忆库**划定了召回边界，因此你可以为每个机器人决定使用哪个记忆库：
  - **每个机器人使用一个记忆库** → 每位专家都拥有私有且相互隔离的记忆。
  - **每个房间使用一个共享记忆库** → 一组机器人共享记忆、协同工作。
  - **混合模式** → 每个机器人各有一个私有记忆库，另外再配一个共享团队记忆库。
- 在 Hindsight 提供方配置中设置一个字段 `bank_id` 即可。

## 什么是 Bot Mode {#what-bot-mode-is}

Bot Mode 本周刚刚推出，目前已在 Hermes Desktop 中默认启用。它让你可以定义一组命名机器人，而不再局限于单个智能体。每个机器人都是“拥有自己的记忆、技能和聊天记录的命名队友”，而且任何机器人都可以运行在任何模型上。

![Hermes Bot Mode：创建命名机器人的“新建智能体”对话框，机器人拥有自己的记忆、技能和聊天记录](/img/blog/hermes-bot-mode-new-agent.webp)

最有意思的是协作方式：你可以把 2 到 6 个机器人放进一个房间。它们会针对每条消息依次进行几轮串行响应，在有人提及自己时作答，也可以选择跳过。研究机器人、编程机器人和编辑机器人现在可以待在同一个房间里，一起解决问题。

Hermes 和 Hindsight 一样，均采用 MIT 许可证。

## 为什么记忆决定成败 {#why-memory-is-the-make-or-break}

一组专家机器人听起来很棒，直到会话一结束，它们就把一切忘得一干二净。研究机器人如果无法回想自己已经找到的内容，就会重复劳动。编程机器人若忘了你的惯例，每天早上都得重新学习。机器人组成的*房间*还有一个更隐蔽的问题：你必须决定哪些内容应该共享、哪些不应该共享。如果支持机器人能读取内部策略机器人的记忆，那带来的就是信息泄漏，而非功能优势。

所以，“每个机器人都有自己的记忆”是一个很好的基本构件，但要真正实现这一点，关键在于持久性和范围。这正是 Hindsight 所提供的能力。

## 记忆库就是边界 {#the-bank-is-the-boundary}

在 Hindsight 中，记忆保存在**记忆库**里。记忆库会严格划定召回边界：机器人只能召回它所指向的记忆库中的内容。Hermes 已内置 Hindsight 原生提供方，因此每个机器人在回答前都会自动召回记忆，并在回答后自动存入记忆。现在唯一需要决定的是每个机器人使用哪个记忆库，而这正是整个设计的核心：

- **每个机器人使用一个记忆库。** 为每个命名机器人分配自己的 `bank_id`。研究机器人积累研究记忆，支持机器人积累支持记忆，彼此无法看到对方的内容。隔离由存储层强制执行，而不是依赖提示词。
- **每个房间使用一个共享记忆库。** 让协作房间中的机器人都指向同一个 `bank_id`，它们就能*共同*记忆。研究机器人学到的内容，写作机器人可以在下一轮召回。它们的上下文不断累积，让整个房间发挥出超过单个机器人的能力。
- **混合模式。** 为每个机器人设置一个用于自身工作记忆的私有记忆库，再设置一个共享团队记忆库，用来保存房间共同认可的结论。这种模式更容易扩展，也是我们的多智能体用户已经在采用的[记忆库策略](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)。

## 设置 {#setup}

如果你的 Hermes 已经在使用 Hindsight，那么大部分工作都已完成。全新安装时：

```bash
hermes memory setup      # 选择 "hindsight"
hermes memory status     # 确认提供方和记忆库
```

在 Hermes Desktop 中，这些设置位于**设置 → 记忆与上下文**，并且按机器人分别配置。顶部的 **Applies to** 选择器用于选定设置所属的机器人；将该机器人的 **Memory Provider** 设为 Hindsight，并为它指定自己的 **Bank ID**。这个字段划定了边界：相同的 bank id 表示共享记忆，不同的 bank id 表示记忆相互隔离。

![Hermes Desktop 的“记忆与上下文”设置，按智能体分别配置；Hindsight 作为记忆提供方，并为每个机器人设置 Bank ID](/img/blog/hermes-bot-mode-memory-settings.webp)

更习惯用终端？相同的设置保存在 `~/.hermes/hindsight/config.json` 中（`bank_id` 字段默认值为 `hermes`，也可以设置 `HINDSIGHT_BANK_ID`）。无论使用哪种方式，自动召回都会通过 `pre_llm_call` 钩子运行，自动存入则通过 `post_llm_call` 钩子运行。即使处于网关模式，提供方也会在每条消息到来时召回最新记忆，因此机器人在不同平台和不同轮次之间都能保持连贯。

记忆可以保存在 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，也可以保存在你自行运行的服务器上。Hermes 和 Hindsight 都采用 MIT 许可证，而 Hindsight 只需一条 Docker 命令即可自行托管，因此整组拥有持久记忆的机器人都可以完全运行在你自己的硬件上。

## 两种值得借鉴的配置 {#two-setups-worth-copying}

**能不断积累经验的单兵专家。** 打造一个“发行说明”机器人，为它分配自己的记忆库。每次起草发行说明，都会加深它对产品风格和历史的了解。六个月后，它已不再是一个配有优质提示词的全新模型，而是一个读过自己所有作品的机器人。

**共同思考的房间。** 把研究员、程序员和审阅者放进一个共享记忆库的房间。研究员的发现进入记忆，程序员在实现时召回这些发现，审阅者检查成果时也能召回前两者的内容。没有人需要反复解释，因为这份记忆就是大家共同读写的共享空间。

## 为什么它们很契合 {#why-it-fits}

Bot Mode 为每个机器人预留了一个记忆位置。Hindsight 为它提供了持久且范围明确的记忆：记忆会跨会话保留，可以通过单个 bank id 实现隔离或共享，支持自行托管，而且已经作为原生提供方接入 Hermes。记忆库模型几乎能直接对应到白板上绘制的专家团队结构，这正是一个优秀基础构件的特点。

组建你的机器人团队，决定哪些机器人共享记忆、哪些机器人保留自己的记忆，让它们每次运行都能变得更有经验。你可以从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 免费开始，也可以先阅读 [Hermes 集成指南](https://hindsight.vectorize.io/sdks/integrations/hermes)。

---

**了解更多：**
- [Hermes 集成](https://hindsight.vectorize.io/sdks/integrations/hermes) — 原生记忆提供方、设置和配置
- [一个记忆库还是多个？构建智能体记忆](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory) — 如何按机器人或房间划定记忆范围
- [构建具有共享记忆的多智能体系统](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory) — 经得起实践的隔离与共享模式

---
