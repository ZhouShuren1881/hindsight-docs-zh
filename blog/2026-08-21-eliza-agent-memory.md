---
title: "为您的 elizaOS 智能体提供长期记忆"
authors: [benfrank241]
slug: "2026/08/21/eliza-agent-memory"
date: 2026-08-21T12:00
tags: [hindsight, eliza, elizaos, agent-memory, autonomous-agents, multi-tenant]
description: "elizaOS 智能体全天候运行并与每个人交谈。 Hindsight 插件为他们提供了持久的、每个用户的长期记忆：每次模型调用之前的记忆召回，每轮之后的记忆存储，默认情况下的故障安全。"
image: /img/blog/eliza-agent-memory.webp
hide_table_of_contents: true
---

![Hindsight：在每次模型调用之前调用记忆的提供者和在每次调用后保留对话的评估器，每个用户有一个记忆库
elizaOS 的](/img/blog/eliza-agent-memory.webp)

[elizaOS](https://github.com/elizaOS/eliza) 智能体专为全天候运行而打造。你定义一个角色，连接一些插件，智能体就会存在于 Discord 服务器、Telegram 群组或 X 上，永远回答与它交谈的人。这暴露了编码助理群体很少遇到的一个问题：一个始终在线的智能体与*大家*交谈，并且没有长期记忆，它每次都会以陌生人的身份遇到他们每个人。

今天，[`@vectorize-io/hindsight-eliza`](https://www.npmjs.com/package/@vectorize-io/hindsight-eliza)插件提供了由[Hindsight](https://hindsight.vectorize.io)支持的elizaOS智能体持久记忆，并且它利用elizaOS已经公开的两个接缝来实现：提供者和评估者。

<!-- truncate -->

## 概览 {#tldr}

- **`@vectorize-io/hindsight-eliza`** 为任何 elizaOS 智能体添加长期记忆。将其添加到角色的 `plugins` 列表中即可完成。
- 它注册了两个组件：**提供商**（`HINDSIGHT_MEMORY`）在每次模型调用之前将相关记忆召回到提示中，以及**评估器**（`HINDSIGHT_RETAIN`）在每次调用后保留对话。
- 两者都是**默认启用**，位于 elizaOS 自己的记忆之上，以及**故障安全**：记忆服务的问题永远不会阻止智能体的回复。
- 记忆默认为**每个用户一个记忆库**（由消息的`entityId`键入），因此公共智能体可以使每个人的记忆保持隔离，无需任何额外的接线。
- 记忆存储是**默认情况下即发即忘**，因此持久性不会增加回合的延迟。

## 为什么记忆对于永远在线的智能体来说是成败的关键 {#why-memory-is-make-or-break-for-an-always-on-agent}

编码智能体忘记了你的约定，你重新解释它们；很烦人，但你是唯一的用户。 elizaOS 智能体是一种不同的形状。它是自主的、寿命长的，而且通常是与人群交谈。如果没有持久的、有范围的记忆，有两件事就会崩溃：

- **它会在重新启动后忘记。** 部署新版本，或者整个流程循环一整夜，智能体了解到的关于其社区的所有信息都会消失。一个不记得昨天的社会智能体不是一个人格，它是一条有良好提示的金鱼。
- ​​**它使用户模糊在一起，或者在他们之间泄漏。** 公共智能体的全部意义在于它可以与很多人交谈。如果他们的记忆集中在一堆，智能体要么会让他们感到困惑，要么更糟糕的是，在与另一个人交谈时回忆起一个人的背景。这不是一个特征，而是一个事件。

所以有用的原语不仅仅是“记忆”，它是*持久记忆，针对每个用户。*，这正是插件默认的。

## 插入方式：两条接缝，默认均为两条接缝 {#how-it-plugs-in-two-seams-both-by-default}

elizaOS 从 **提供商** 开始编写每一轮，然后用 **评估者** 对其进行评估，并且插件挂钩其中的一个：

|组件|elizaOS 接缝|当它运行时|它的作用|
| --- | --- | --- | --- |
|`HINDSIGHT_MEMORY`|提供者|提示合成期间，模型调用之前|使用传入消息调用 Hindsight `recall` 并将相关记忆注入上下文中|
|`HINDSIGHT_RETAIN`|评估器|智能体处理转弯后|调用 Hindsight `retain` 来保存消息，以及可选地智能体自己的回复|

两个设计选择很重要。首先，双方**故障安全**：如果记忆召回错误，则提供者不返回任何内容，并且按照基本提示继续进行； 记忆存储被包装起来，因此写入失败会被吞掉而不是抛出。记忆中断会将智能体降级为正常的、无记忆的状态，而不是将其摧毁。其次，插件 **上面的层** elizaOS 现有的短期记忆而不是替换它，因此您正在添加持久的记忆召回，而不是交换框架的上下文处理。

## 记忆库是边界 {#the-bank-is-the-boundary}

在Hindsight中，记忆存在于**记忆库**中，而记忆库是硬记忆召回边界：智能体只能记忆库中读取的内容。该插件将记忆库默认为消息的`entityId`，这意味着**每个用户都会自动获得自己独立的记忆存储。**对于公共智能体来说，该默认值是正确的，并且它是通过存储而不是提示来强制执行的。

当您需要不同的形状时，`bank`采用固定字符串或消息函数：

```ts
createHindsightPlugin({
  client,
  bank: (message) => message.entityId, //默认：每个用户一个记忆库
  // bank: "community-shared",          // 或所有人共用一个记忆库
  // bank: (m) => m.roomId,             // 或每个房间/频道一个记忆库
});
```

一个字符串给整个智能体一个单一的共享记忆。功能可让您根据用户、房间或频道的范围来确定范围，只要与社区的组织方式相匹配即可。决策是单一领域的，是整个隐私设计的。

## 调整记忆召回和记忆存储 {#tuning-recall-and-retain}

双方都接受选项，默认值是合理的，因此调整是可选的：

```ts
createHindsightPlugin({
  client,
  recall: {
    budget: "high",        //“低”| “中”| “高”：延迟与深度
    includeEntities: true, //折叠实体 观察
    maxTokens: 1000,       //限制注入到提示中的内容
  },
  retain: {
    async: true,           //即发即忘；永远不会增加转弯延迟
    tags: ["source:eliza"],
    includeAgentMessages: false, //默认仅存储用户回合
  },
});
```

其中一些值得为自主智能体而呼吁。默认情况下，`retain.async`是`true`，因此持久性发生在关键路径之外，并且永远不会减慢回复速度。默认情况下，`includeAgentMessages`是`false`，因此智能体存储用户所说的话，而不是自己的喋喋不休，这使记忆基于真实信号而不是模型自己的输出。当您希望智能体也记住自己的承诺时，请打开它。

## 两个值得复制的设置 {#two-setups-worth-copying}

**一个真正了解其成员的社区智能体。** 保留默认的每用户记忆库。一周多以来，智能体了解到一个人是 Rust 开发人员，询问特定的错误，另一个人运行事件通道，另一个人总是想要简短的答案。它们之间没有任何泄漏，并且在您重新部署时也不会重置。智能体不再是无状态机器人，而是开始成为常规机器人。

**共享大脑，打造专注的智能体。** 将 `bank` 指向单个固定字符串，智能体就会记住 *集体*：一个通道中的支持智能体会构建重复出现的问题的共享图片，每个用户都会从与上一个用户交谈中学到的知识中受益。当记忆是关于主题而不是人时，请使用此选项。

## 设置 {#setup}

如果您已经在 `@elizaos/core` `^1.7.2` 上运行 elizaOS 智能体，则只需两步即可连接：

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

```ts
import { createHindsightPlugin } from "@vectorize-io/hindsight-eliza";
import { Hindsight } from "@vectorize-io/hindsight-client";

export const character = {
  name: "Ada",
  plugins: [
    //...你的其他插件
    createHindsightPlugin({ client: new Hindsight({ apiKey: process.env.HINDSIGHT_API_KEY }) }),
  ],
};
```

这就是整个事情：记忆召回提供者和记忆存储评估者都在智能体运行的那一刻。 记忆可以存在于 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或您自己托管的服务器中，并且由于 Hindsight 已获得 MIT 许可，并且可以在一个 Docker 命令中自行托管，因此一整套 elizaOS 智能体可以完全在您自己的硬件上以持久记忆运行。有关完整演练和验证流程，请遵循 [elizaOS 记忆 guide](https://hindsight.vectorize.io/guides/2026/07/17/guide-eliza-memory-with-hindsight)。

为您始终在线的智能体提供记忆，使其在重新启动后仍能保留，并使每个用户保持独立。 [Hindsight Cloud](https://ui.hindsight.vectorize.io)开始免费。

---

**了解更多：**
- [elizaOS 集成文档](https://hindsight.vectorize.io/sdks/integrations/eliza) — 提供者、评估者和每个选项
- [指南：使用 Hindsight 为 elizaOS 添加记忆](https://hindsight.vectorize.io/guides/2026/07/17/guide-eliza-memory-with-hindsight) — 逐步设置和验证
- [一个记忆库还是多个？构建智能体记忆](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory) — 如何确定每个用户、每个房间或共享的记忆范围
