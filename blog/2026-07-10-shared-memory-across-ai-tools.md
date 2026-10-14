---
title: "一个记忆，三个入口：Cursor、OpenClaw 和 Vapi 的一天"
authors: [benfrank241]
slug: "2026/07/10/shared-memory-across-ai-tools"
date: 2026-07-10T12:00
tags: [hindsight, agent-memory, cursor, openclaw, vapi, shared-memory, workflow, tutorial]
description: "我们让代码编辑器、Slack 智能体和语音智能体共用一个 Hindsight 记忆库。本文记录了这种工作方式的一天，以及它带来的实际变化。"
image: /img/blog/shared-memory-across-ai-tools.webp
hide_table_of_contents: true
---

![Cursor、OpenClaw 和 Vapi 共用同一个 Hindsight 记忆库](/img/blog/shared-memory-across-ai-tools.webp)

今天早上 9:14，我们中的一位告诉 Cursor，我们要弃用 ORM，并统一通过精简的仓储层访问数据。下午 2:30，一位没有参与那场对话的队友问 Slack 机器人，为什么有个查询是手写的；机器人解释了采用仓储层的决定，没人需要重新输入一遍。开车回家时，另一位工程师问语音智能体：“数据访问方案最后定了什么？”并听到了同样的回答。

三种不同的工具，三个不同的使用入口，一个记忆。没人重复说明，因为这些工具都没有忘记。

<!-- truncate -->

## 概览 {#tldr}

- 我们在同一个项目中使用三个 AI 工具：[Cursor](/blog/2026/06/12/cursor-persistent-memory)负责开发，[OpenClaw](/blog/2026/05/27/openclaw-codebase-memory)充当 Slack/Discord 智能体，[Vapi](/blog/2026/06/03/vapi-persistent-memory)负责语音交互。
- 每个工具都集成了 Hindsight，会在回答前召回相关记忆，并在工作过程中存入值得长期保留的事实。
- 诀窍只需一行配置：**让三个工具都指向同一个记忆库**。任何工具存入的事实，其他工具都能召回。
- 最终得到的不是“三个 AI 工具”，而是一个恰好有三个入口的助手。

## 设置方式：共用一个记忆库 {#the-setup-is-one-shared-bank}

每个 Hindsight 集成都把记忆限定在一个**记忆库**中，也就是一个独立隔离的存储空间。在代码仓库中，编辑器集成默认以仓库名称作为记忆库，因此会自动指向同一个库。聊天机器人和语音智能体并不“位于某个仓库中”，所以我们直接让三个工具使用相同的记忆库 ID。

```text
# Cursor: in the repo it uses the project bank by default
#   (or set an explicit bank id in the integration config)

# OpenClaw: it defaults to a per-conversation bank, so switch it
#   to one static shared store —  dynamicBankId: false, bankId: "acme-web"

# Vapi: pass the same bank when you build the webhook —
#   HindsightVapiWebhook(bank_id="acme-web")
```

各工具的语法不同，但做法相同：让每个入口都指向同一个记忆库。这就是全部要点。无需连接总线，无需运行同步作业，也无需为每个工具维护一份真相副本。每个工具都读写同一个记忆库。记忆内容重叠时，Hindsight 会将它们整合成持久的[观测](/blog/2026/05/21/agent-memory-consolidation)，而不是堆叠三条几乎相同的笔记，因此共享存储会保持整洁，不会逐渐堆满重复内容。关于这一理念的详细讨论，请参阅[让每个 AI 工具共用一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)。本文讲的是实际使用这种方式的感受。

## 共享记忆中的一天 {#a-day-in-the-shared-memory}

**早上，在 Cursor 中。** 决策就在做决策的地方产生：任务进行到一半时，人正在编辑器里工作。“我们要弃用 ORM，所有数据访问都经过仓储层。”Cursor 智能体应用了这项更改；由于它会在工作过程中存入值得长期保留的事实，这项决定及其理由也进入了记忆库。我们没有运行任何记忆命令，只是做了决定，然后继续写代码。

**下午，在 Slack 中。** 一位身处三个时区之外的队友打开 PR，看到一条手写查询，便在频道里向我们的 OpenClaw 智能体询问原因。OpenClaw 根据这个问题进行召回，找到了今天早上的决定，并结合实际上下文作答：我们改用了仓储层，这是原因，相关实现就在这里。这位队友既没参与编辑器里的工作，也没参加站会，但仍从 Cursor 写入的同一份记忆中了解了这项决定。

**晚上，通话时。** 有人不在电脑旁，便拨打我们的 Vapi 语音智能体，在明天开始前确认一种方案是否合理。“我们对数据访问做了什么决定？”语音智能体从同一个记忆库召回信息，并直接口头回答。没有屏幕、没有搜索，也不用翻 Slack 历史记录。上下文完全跟着人离开了键盘。

一天之内，三个入口都用到了同一条事实，而这条事实只写入了一次。

## 实际发生了哪些变化 {#what-actually-changed}

我们长期以来都在运行没有共享记忆的智能体，因此前后差异很明显。

- **我们不用再针对每个工具重复解释。** 以前，每个入口都是一座孤岛：要教会 Cursor，还要单独教 Slack 机器人，也要另行向负责语音智能体的人说明。现在，第二个和第三个工具已经知道这些信息。
- **队友能了解自己未参与的决策。** 在 Slack 提问的人从未见过 Cursor 会话。记忆把决策传达给了他们，这正是悄然改变团队协作方式的地方。
- **切换入口后，上下文仍然延续，不再局限于同一会话。** 过去，离开编辑器就意味着丢下上下文。现在，从代码切换到聊天，再切换到语音时，讨论脉络仍然连贯，因为它保存在记忆库里，而不属于某一个应用。
- **这些工具给出的答案更一致。** 三个助手读取同一份整合后的记忆时，往往会给出同一个答案，而不是三个略有差异的答案。

这一切不需要增加新的工作流程，只需要去掉一个流程：反复解释同一件事。

## 为什么它能随着使用规模扩大而保持可靠 {#why-it-holds-up-as-it-grows}

共享记忆只有在数据不断累积、三个嘈杂来源中数月的决策逐渐增多时，仍能保持快速和准确，才有用。两方面的能力支撑着这一点。整合会提炼存储内容，把关于同一实体的相关事实合并起来，并识别出“数据层”“仓储层改动”和“移除 ORM”说的是同一项决定，而不是三项不同的决定。检索也必须在大规模数据下保持准确；这正是 [BEAM](/blog/2026/04/02/beam-sota) 测试的场景：在 1,000 万个 token 的规模下，不能把所有内容都塞进上下文。Hindsight 在这一测试中得分为 64.1%；公开发表的次优结果为 40.6%。这部分性能余量使一个记忆库能够支持三个工具，而不至于被噪声淹没。

## 自己动手配置 {#wire-up-your-own}

如果你已经在一个项目中使用多个 AI 工具，这项改动当天下午就能完成：

1. 为你使用的每个工具安装 Hindsight 集成。每个工具都会在回答前召回记忆，并在工作过程中存入记忆。
2. 为所有工具设置**相同的记忆库 ID**。在代码仓库中，编辑器会自动指向同一个库；让聊天和语音智能体也指向它（对于 OpenClaw 这类按对话分别使用记忆库的工具，要将其切换为一个固定的共享记忆库）。
3. 让这些工具连接到 [Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器。

然后在一个工具中做出决定，再到另一个工具中询问。第二个工具已经知道答案。

## 常见问题 {#frequently-asked-questions}

**这些工具会互相覆盖对方的记忆吗？**
不会。它们读写同一个记忆库，整合过程会将重叠的事实合并为单条观测，而不是重复记录。写入来源越多，记忆就越丰富，而不是越混乱。

**所有内容都必须位于同一个仓库吗？**
不必。仓库名称只是编辑器集成默认使用的记忆库。任何工具都可以指向任意记忆库 ID，这正是聊天机器人和语音智能体加入项目记忆的方式。

**这只适用于编程工具吗？**
不是，这正是重点。本文中的三个入口分别是编辑器、聊天智能体和语音智能体。任何集成了 Hindsight 的工具都可以共用这个记忆库。

**私人或按用户区分的上下文怎么办？**
对于需要彼此隔离的内容，请使用不同的记忆库。共享是你通过向工具提供同一个记忆库 ID 来主动选择的，不会默认把所有内容泄露到各处。

## 延伸阅读 {#further-reading}

- [我使用的每个 AI 工具都共用一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：介绍共享记忆库背后的理念。
- [Cursor 持久记忆](/blog/2026/06/12/cursor-persistent-memory)、[OpenClaw 代码库记忆](/blog/2026/05/27/openclaw-codebase-memory)和 [Vapi 持久记忆](/blog/2026/06/03/vapi-persistent-memory)：本文介绍的三个集成。
- [智能体记忆中的整合问题](/blog/2026/05/21/agent-memory-consolidation)：介绍如何将重叠事实整合成一条清晰的观测。
