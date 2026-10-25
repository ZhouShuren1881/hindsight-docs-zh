---
title: "为 elizaOS 智能体添加长期记忆"
authors: [benfrank241]
slug: "2026/08/21/eliza-agent-memory"
date: 2026-08-21T12:00
tags: [hindsight, eliza, elizaos, agent-memory, autonomous-agents, multi-tenant]
description: "elizaOS 智能体全天候运行，与各种用户交流。Hindsight 插件为它们提供持久的、按用户隔离的长期记忆：每次模型调用前召回记忆，每轮对话后存入记忆，默认采用故障安全设计。"
image: /img/blog/eliza-agent-memory.webp
hide_table_of_contents: true
---

![Hindsight 在 elizaOS 中的工作方式：提供方在每次模型调用前召回记忆，评估器在每轮对话后存入对话内容，每位用户使用各自的记忆库](/img/blog/eliza-agent-memory.webp)

[elizaOS](https://github.com/elizaOS/eliza) 智能体旨在全天候运行。你可以定义角色、接入几个插件，让智能体常驻 Discord 服务器、Telegram 群组或 X，持续回答所有人的问题。这也带来了编码助理领域很少以同等规模遇到的问题：始终在线的智能体会与*所有人*交流；如果没有长期记忆，它每次都会把对方当作陌生人。

如今，[`@vectorize-io/hindsight-eliza`](https://www.npmjs.com/package/@vectorize-io/hindsight-eliza) 插件为 elizaOS 智能体提供由 [Hindsight](/) 支持的持久记忆，并利用 elizaOS 已有的两个接入点：提供方和评估器。

<!-- truncate -->

## 概览 {#tldr}

- **`@vectorize-io/hindsight-eliza`** 为任何 elizaOS 智能体添加长期记忆。将它加入角色的 `plugins` 列表即可。
- 插件会注册两个组件：**提供方**（`HINDSIGHT_MEMORY`）在每次模型调用前将相关记忆召回到提示中；**评估器**（`HINDSIGHT_RETAIN`）在每轮对话后存入对话内容。
- 两者默认都**已启用**，会叠加在 elizaOS 自带的记忆之上，并且采用**故障安全设计**：记忆服务短暂故障也不会阻止智能体回复。
- 默认情况下，**每位用户使用一个记忆库**（以消息的 `entityId` 为键），因此公共智能体会自动隔离每个人的记忆，无需额外配置。
- Retain（存入）默认采用**异步即发即忘**方式，因此持久化不会增加每轮对话的延迟。

## 为何持久记忆对全天候运行的智能体至关重要 {#why-memory-is-make-or-break-for-an-always-on-agent}

编码智能体忘记你的约定，你再解释一遍；这很烦人，但用户只有你一个。elizaOS 智能体则不同：它自主运行、生命周期长，而且通常要和许多人交流。缺少持久且按范围隔离的记忆，就会出现两个问题：

- **重启后就会忘记。** 部署新版本，或进程在夜间重启，智能体了解到的社区信息就会全部消失。记不住昨天的社交智能体谈不上有个性，就像一条只会照着优质提示行事的金鱼。
- **它会混淆用户，甚至泄露用户之间的信息。** 公共智能体的意义就在于能和许多人交流。如果所有人的记忆都混在同一堆里，智能体就可能混淆用户；更糟的是，它可能在与某人交谈时想起另一个人的背景。这不是功能，而是事故。

因此，真正有用的不只是“记忆”，而是*按用户隔离的持久记忆*。这正是插件的默认行为。

## 接入方式：两个接入点，默认都启用 {#how-it-plugs-in-two-seams-both-by-default}

elizaOS 通过 **提供方** 组装每一轮对话，并在之后运行 **评估器**；这个插件分别接入其中一个：

| 组件 | elizaOS 接入点 | 运行时机 | 作用 |
| --- | --- | --- | --- |
| `HINDSIGHT_MEMORY` | 提供方 | 组合提示时，在模型调用之前 | 使用收到的消息调用 Hindsight `recall`，并将相关记忆注入上下文 |
| `HINDSIGHT_RETAIN` | 评估器 | 智能体处理完本轮对话后 | 调用 Hindsight `retain` 存入消息，也可选择存入智能体自己的回复 |

有两项设计选择值得关注。首先，两边都采用**故障安全设计**：如果记忆召回出错，提供方就返回空结果，本轮仍使用基础提示继续处理；存入操作也经过封装，写入失败会被吞掉而不会抛出异常。记忆服务不可用时，智能体会退化为原本不使用记忆的状态，而不会因此停机。其次，插件会**叠加在** elizaOS 现有的短期记忆之上，而不是取代它，因此新增的是持久记忆召回，不会替换框架原有的上下文处理方式。

## 记忆库是边界 {#the-bank-is-the-boundary}

在 Hindsight 中，记忆存放在**记忆库**里；记忆库构成严格的召回边界：智能体只能召回其所读取的记忆库中的内容。插件默认使用消息的 `entityId` 作为记忆库，这意味着**系统会自动为每位用户建立相互隔离的记忆存储**。对于公共智能体，这个默认值恰当，而且隔离由存储层实施，而不是依赖提示词。

需要采用其他划分方式时，`bank` 可以接受固定字符串，也可以接受一个根据消息计算结果的函数：

```ts
createHindsightPlugin({
  client,
  bank: (message) => message.entityId, // 默认值：每位用户一个记忆库
  // bank: "community-shared",          // 或所有人共用一个记忆库
  // bank: (m) => m.roomId,              // 或每个房间/频道一个记忆库
});
```

提供一个字符串，就会让整个智能体使用同一个共享记忆库。提供一个函数，则可以按用户、房间或频道划分范围，具体取决于社区的组织方式。只需设置一个字段，就能确定整套隐私设计。

## 调整召回与存入行为 {#tuning-recall-and-retain}

两部分都接受配置选项，而且默认值已经足够合理，因此不一定需要调整：

```ts
createHindsightPlugin({
  client,
  recall: {
    budget: "high",        // "low" | "mid" | "high"：在延迟和检索深度之间取舍
    includeEntities: true, // 纳入实体观测
    maxTokens: 1000,       // 限制注入提示的 token 数
  },
  retain: {
    async: true,           // 异步即发即忘，不会增加每轮对话的延迟
    tags: ["source:eliza"],
    includeAgentMessages: false, // 默认只存入用户的对话内容
  },
});
```

对于自主智能体，有两项配置值得特别说明。`retain.async` 默认值为 `true`，因此持久化会在关键路径之外进行，不会拖慢回复。`includeAgentMessages` 默认值为 `false`，因此智能体只存入用户说的话，不存自己的闲聊；这样记忆依据的是实际信号，而不是模型自身的输出。如果你也希望智能体记住自己的承诺，可以启用此选项。

## 两种值得借鉴的配置 {#two-setups-worth-copying}

**真正了解社区成员的智能体。** 保留默认的按用户划分记忆库。一周下来，智能体可能了解到：一位成员是 Rust 开发者，正在询问某个具体 bug；另一位负责活动频道；还有一位总是希望得到简短回答。这些信息不会在用户之间泄露，也不会因重新部署而重置。智能体不再是无状态机器人，而会逐渐成为社区里的熟面孔。

**为专注型智能体设置共享记忆。** 将 `bank` 指向一个固定字符串，让智能体共享记忆：某个频道中的客服智能体可以逐渐建立对常见问题的共同认识，每位用户都能受益于它与此前用户交流时学到的内容。当记忆针对的是主题而非个人时，可以采用这种方式。

## 设置 {#setup}

如果你已经在 `@elizaos/core` `^1.7.2` 上运行 elizaOS 智能体，接入只需两步：

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

```ts
import { createHindsightPlugin } from "@vectorize-io/hindsight-eliza";
import { Hindsight } from "@vectorize-io/hindsight-client";

export const character = {
  name: "Ada",
  plugins: [
    // ...你的其他插件
    createHindsightPlugin({ client: new Hindsight({ apiKey: process.env.HINDSIGHT_API_KEY }) }),
  ],
};
```

就是这样：智能体启动时，召回提供方和存入评估器都会启用。记忆可以存放在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或你自行托管的服务器上。Hindsight 采用 MIT 许可证，而且只需一条 Docker 命令即可自托管，因此你可以完全在自己的硬件上运行一整套带持久记忆的 elizaOS 智能体。完整操作演示和验证流程请参阅 [elizaOS 记忆指南](/guides/2026/07/17/guide-eliza-memory-with-hindsight)。

为始终在线的智能体配备持久记忆，让它重启后仍能记住所学内容，并确保每位用户彼此隔离。现在就免费试用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)。

---

**了解更多：**
- [elizaOS 集成文档](/sdks/integrations/eliza) — 介绍提供方、评估器及所有配置选项
- [指南：使用 Hindsight 为 elizaOS 添加记忆](/guides/2026/07/17/guide-eliza-memory-with-hindsight) — 分步设置与验证
- [一个记忆库还是多个？如何规划智能体记忆](/blog/2026/07/16/bank-strategy-agent-memory) — 如何按用户、房间或共享范围组织记忆
