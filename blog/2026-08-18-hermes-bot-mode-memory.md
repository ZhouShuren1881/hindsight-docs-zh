---
title: "赋予每个Hermes机器人自己的记忆"
authors: [benfrank241]
slug: "2026/08/18/hermes-bot-mode-memory"
date: 2026-08-18T12:00
tags: [hindsight, hermes, bot-mode, multi-agent, agent-memory, shared-memory]
description: "Nous 刚刚推出了 Hermes 的机器人模式：命名机器人，每个机器人都有自己的记忆。有了 Hindsight，记忆就会持久并且每个机器人的范围都精确。"
image: /img/blog/hermes-bot-mode-memory.webp
hide_table_of_contents: true
---

![Hermes 机器人模式与 Hindsight：为每个指定机器人提供自己的记忆库，或在协作房间共享一个](/img/blog/hermes-bot-mode-memory.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

Nous Research 刚刚为 Hermes 发货了 [机器人模式](https://x.com/NousResearch/status/2089429432612147572)。你的智能体档案会成为一个名为**机器人**的名册，每一个都有自己的角色、模型、技能和头像。机器人可以使用任何模型，甚至可以在共享房间中相互交谈。建立一次专家，并永远使用它。

该公告中对我们来说最重要的一行是：**每个机器人都有自己的记忆。**，这正是[Hindsight](https://vectorize.io/hindsight)适合的接缝，并且机器人名单要么成为真正的团队，要么成为一组有名字的金鱼。

<!-- truncate -->

## 概览 {#tldr}

- **机器人模式** 将 Hermes 智能体配置文件转变为命名机器人，每个机器人都有自己的角色、模型、技能和 **记忆**。 2 到 6 个机器人的房间可以进行协作。
- 机器人的有用程度取决于它在会话之间记住的内容。 Hermes 已经使用 **Hindsight** 作为本机记忆提供者，因此使记忆持久化是一个设置命令。
- 重要的选择是*范围*。在 Hindsight 中，**记忆库** 是记忆召回边界，因此您可以根据机器人决定它：
  - **每个机器人一个记忆库** → 每个专家都有私人的、孤立的记忆。
  - **每个房间一个共享记忆库** → 一群一起记忆的机器人。
  - **混合动力** → 每个人一个私人记忆库，加上一个共享团队记忆库。
- 在Hindsight提供者配置中使用单个字段`bank_id`进行设置。

## 什么是机器人模式 {#what-bot-mode-is}

机器人模式于本周发布，现已在Hermes桌面中默认启用，可让您定义一组命名机器人而不是单个智能体。每个机器人都是“一个指定的队友，拥有自己的记忆、技能和聊天能力”，任何机器人都可以在任何模型上运行。

![Hermes 机器人模式：新的智能体对话框，创建一个具有自己的记忆、技能和聊天功能的命名机器人](/img/blog/hermes-bot-mode-new-agent.webp)

有趣的部分是协作：你可以在一个房间里放置两到六个机器人，它们轮流处理每条消息的几个连续轮次，在提到时做出响应，或者通过。研究机器人、编码机器人和编辑机器人现在可以坐在一个房间里一起解决问题。

都是MIT授权的，与Hermes和Hindsight相同。

## 为什么记忆是成败的关键 {#why-memory-is-the-make-or-break}

专家机器人名单听起来很棒，直到专家在会话结束时忘记了一切。一个无法记忆它已经发现的东西的研究机器人会重复自己。忘记约定的编码机器人每天早上都会重新学习它们。 *房间* 机器人还有第二个更微妙的问题：你必须决定他们应该分享什么，不应该分享什么。如果支持机器人可以读取内部策略机器人的记忆，那么您就有漏洞，而不是功能。

所以“每个机器人都有自己的记忆”是正确的原语，但持久性和范围才是使它成为现实的原因。这正是 Hindsight 所添加的内容。

## 记忆库是边界 {#the-bank-is-the-boundary}

在Hindsight中，记忆存在于**记忆库**中，而记忆库是硬记忆边界：机器人只能记忆召回它所指向的记忆库中的内容。 Hermes 已经提供了原生 Hindsight 提供商，因此每个机器人的记忆都会在应答之前自动调用，并在应答之后自动保留。剩下的唯一决定是每个机器人使用哪个记忆库，这个决定就是整个设计：

- **每个机器人一个记忆库。** 为每个命名机器人提供自己的`bank_id`。研究机器人积累研究记忆，支持机器人积累支持记忆，两者都看不到对方。隔离是通过存储而不是提示来强制执行的。
- **每个房间一个共享记忆库。** 将机器人协作室指向同一个 `bank_id`，它们会记住 *在一起*。研究机器人学到的东西，写作机器人可以在下一轮进行记忆。房间变得不仅仅是机器人的总和，因为它们的环境复合了。
- **混合动力。** 为每个机器人提供一个用于其自己工作记忆的私人记忆库，以及一个用于存储房间一致结论的共享团队记忆库。这就是可扩展的模式，它与我们的多智能体用户已经依赖的[记忆库-策略](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)相同。

## 设置 {#setup}

如果您的Hermes已经使用了Hindsight，那么您已经完成了大部分工作。从全新安装：

```bash
hermes memory setup      # choose "hindsight"
hermes memory status     #确认提供者和记忆库
```

在Hermes桌面版中，它位于**设置→记忆和上下文**中，并且它的作用域是每个机器人。顶部的**适用于**选择器选择设置所属的机器人；将该机器人的 **记忆提供者** 设置为 Hindsight 并为其指定自己的 **记忆库ID**。这个单一字段就是边界：相同的记忆库 id 意味着共享的记忆，不同的记忆库 id 意味着孤立的记忆。

![Hermes 桌面记忆和上下文设置，范围为每个智能体，Hindsight 作为记忆提供者和每个机器人记忆库 ID](/img/blog/hermes-bot-mode-memory-settings.webp)

更喜欢终端？相同的设置位于 `~/.hermes/hindsight/config.json`（`bank_id` 字段，默认 `hermes`，或设置 `HINDSIGHT_BANK_ID`）。无论哪种方式，自动记忆召回在`pre_llm_call`钩子上运行，自动记忆存储在`post_llm_call`上运行，即使在网关模式下，提供者也会回忆每条消息的新鲜记忆，因此机器人在跨平台和跨回合时保持一致。

记忆可以存在于[Hindsight Cloud](https://ui.hindsight.vectorize.io)或您运行的服务器中。由于 Hermes 和 Hindsight 均获得 MIT 许可，并且 Hindsight 在一个 Docker 命令中自行托管，因此具有持久记忆的一整套机器人可以完全在您自己的硬件上运行。

## 两个值得复制的设置 {#two-setups-worth-copying}

**复合独奏专家。** 构建一个“发行说明”机器人一次，给它自己的记忆库，它起草的每个版本都会增加它对产品的声音和历史的了解。六个月后，它不再是一个具有良好提示的新鲜模型；它是一个已经阅读了它所写的所有内容的机器人。

​​**一个共同思考的房间。** 将一名研究员、一名编码员和一名审阅者放在一个共享记忆库的房间里。研究人员的发现落入记忆中，编码员在实施时回忆它们，审阅者在检查工作时回忆这两者。没有人重新解释任何事情，因为记忆是他们所有人读写的共享表面。

## 为什么适合 {#why-it-fits}

机器人模式给每个机器人一个记忆槽。 Hindsight 用持久且有范围的东西填充它：跨会话持续存在，由单个记忆库 ID 隔离或共享，可自托管，并且已经作为本机提供者连接到 Hermes。记忆库模型几乎完全映射到如何在白板上绘制专家团队，这是良好基元的标志。

调整你的阵容，决定谁共享大脑，谁保留自己的大脑，让他们每次跑步都变得更好。从[Hindsight Cloud](https://ui.hindsight.vectorize.io)开始免费，或者先阅读[Hermes集成指南](https://hindsight.vectorize.io/sdks/integrations/hermes)。

---

**了解更多：**
- [Hermes集成](https://hindsight.vectorize.io/sdks/integrations/hermes) — 原生记忆提供程序、设置和配置
- [一个记忆库还是多个？构建智能体记忆](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory) — 如何确定每个机器人或每个房间的记忆范围
- [构建具有共享记忆的多智能体系统](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory) — 有效的隔离和共享模式
