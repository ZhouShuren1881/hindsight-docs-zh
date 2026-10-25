---
title: "用 Vercel Eve 和 Hindsight 实现的四种能力"
authors: [benfrank241]
slug: "2026/10/16/eve-memory-provider"
date: 2026-10-16T12:00
tags: [hindsight, eve, vercel, integration, memory, agent-memory, multi-tenant, use-cases]
description: "让团队术语表跨会话延续、让同一客户在所有渠道共享记忆、实现无需过滤器的租户隔离，以及复用其他 AI 工具已经写入的记忆。"
image: /img/blog/eve-memory-provider.webp
hide_table_of_contents: true
---

import {StaticImage} from '@site/src/components/StaticMedia';

<StaticImage src="/img/blog/eve-memory-provider.webp" alt="Hindsight 作为 Vercel Eve 记忆槽的记忆提供方" />

告诉 [Vercel Eve](https://eve.dev) 智能体：收入是扣除退款后的净额，一周从周一开始。在这次对话余下的时间里，它就能正确计算你的数据。可到了明天，它又会问一遍。坐在你旁边的同事也完全享受不到这个好处。

Eve 为记忆提供了专门的位置：一个槽位、一种范围和一个提供方；[Hindsight](https://vectorize.io/hindsight) 就是可以接入其中的一个提供方。下面介绍智能体的记忆跨越会话后，四件更容易做到的事，以及每件事需要怎样实现。

<!-- truncate -->

## 概要 {#tldr}

- **跨会话延续的术语表。** 将记忆槽的范围设为团队，而不是单次对话，就不必反复教智能体团队内部的定义。
- **同一客户，所有渠道。** 记忆跟随通过身份认证的主体，因此 3 月在 Slack 上交谈、10 月在 WhatsApp 上出现的会是同一个人——前提是身份提供方将其识别为同一人。
- **无需过滤器的租户隔离。** 每个锁定的范围都使用独立的 Hindsight 记忆库，因此隔离由查询所处的位置保证，而不依赖你是否记得加上 `WHERE` 子句。
- **技术栈已经写入的记忆。** 将槽位指向编程智能体已经在写入的记忆库，Eve 智能体就能直接了解它们学到的内容。

<a id="a-glossary-that-outlives-the-session"></a>

## 1. 跨会话延续的术语表 {#1-a-glossary-that-outlives-the-session}

Eve 自己的教程让分析智能体学习这类术语，并用 `defineState` 存储。Eve 的文档称，这些状态可以跨越同一会话中的步骤和轮次边界继续存在。思路没错，但保存时间不够长。术语表不是关于这次对话的事实，而是关于整个团队的事实。

每次会话都重新解释一遍很浪费；让每位同事各自私下教智能体则更糟，因为这样一来，智能体知道什么就取决于它正在和谁交谈。

将术语表放进范围设为团队的记忆槽，就能同时解决这两个问题：

```ts
// agent/memory/glossary.ts
import { defineMemory } from "eve/memory";
import { hindsightMemory } from "@vectorize-io/hindsight-eve";

export default defineMemory({
  description: "The team's house definitions for metrics and analysis.",
  provider: hindsightMemory(),
  scope: (ctx) => {
    const team = ctx.session.auth.current?.attributes.teamId;
    return typeof team === "string" ? [team] : null;
  },
});
```

这样一来，无论谁先提到“收入是扣除退款后的净额”，智能体只需学习一次，此后就能为所有人召回这条信息。无需调用工具来保存，也无需调用工具来查询：Hindsight 会在轮次结束后捕获这段交流，并在模型处理下一个问题前召回相关内容。

还需要了解一下：范围解析器返回 `null` 时，Eve 会在本轮禁用记忆，而不是回退到共享范围。因此，未经身份认证的调用者会得到一个没有记忆的智能体，而不会看到别人的术语表。

<a id="one-customer-every-channel"></a>

## 2. 同一客户，所有渠道 {#2-one-customer-every-channel}

Eve 提供 Slack、Discord、Teams、Telegram、Twilio、GitHub、Linear 渠道以及聊天 SDK。客服智能体通常最终会接入其中两三个渠道，麻烦之处不在于如何连通这些渠道，而在于：客户 3 月通过 WhatsApp 说明过自己的设置，10 月打开网页组件时却又得从头解释一遍。

将槽位的范围设为个人，而不是对话，就能解决这个问题：

```ts
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description: "What this customer has told us, across every channel.",
  provider: hindsightMemory(),
  scope: byPrincipal,
});
```

**有一项注意事项需要直说，**因为它决定这种做法是否适合你。`byPrincipal` 会根据主体类型、身份验证器、签发者和主体 ID 生成键。只有当两个渠道将用户解析为同一个经过身份认证的主体时，它们才会共享记忆。如果每个渠道都通过各自的系统验证用户身份，同一个人就会成为两个主体，并获得两个记忆库。

这是正确的默认行为——擅自猜测 Slack ID 和电话号码属于同一个人，可能导致陌生人之间发生记忆泄漏。但如果你有真正的身份层，就可以根据它提供的稳定用户 ID 设置范围，让记忆随人延续，而不是随渠道变化。

<a id="tenant-isolation-that-is-not-a-filter"></a>

## 3. 无需过滤器的租户隔离 {#3-tenant-isolation-that-is-not-a-filter}

每个多租户智能体都有同一种隐患：隔离依赖某个查询条件，而有一个查询可能忘了加上它。这种做法一直有效，直到某天出错；问题还不容易察觉，因为过滤条件不匹配时只会返回更少的结果。

Eve 认为这是范围设置问题，而不是存储问题。应从经过验证的会话身份中解析租户，绝不能从模型中解析，然后返回一个元组：

```ts
scope(ctx) {
  const caller = ctx.session.auth.current;
  const tenantId = caller?.attributes.tenantId;
  const principal = byPrincipal(ctx);
  if (caller?.principalType !== "user" || typeof tenantId !== "string" || principal === null) {
    return null;
  }
  return [tenantId, principal];
},
visibility: "scope",
```

Eve 会根据这个元组派生一个不透明键，在任何召回操作开始前锁定该键，并将同一个键用于每次读取、写入和工具调用。模型看不到这个键，也无法更改它。提供方工具会绑定到已锁定的范围，因此无法通过对话诱使工具转而指向另一个租户。

Hindsight 会将每个锁定范围映射到**独立的记忆库**。对于语义存储而言，这一点比听起来更重要：如果先在所有租户中进行近邻搜索、之后再过滤，那么其他租户的向量已经被读取了；而且结果数量会少于请求值，看起来像是相关性问题，实际上却是数据泄漏。搜索某个租户自己的记忆库，与搜索所有人的记忆库再丢弃其他结果，是两种不同的操作。

请保留 `visibility: "scope"`，它也是默认值。如果同一会话中的经过身份认证的调用者发生变化，Eve 会隐藏先前范围召回的记录，不会让这些记录继续显示。

<a id="the-memory-your-stack-already-wrote"></a>

## 4. 技术栈已经写入的记忆 {#4-the-memory-your-stack-already-wrote}

前三项是任何优秀记忆提供方都应具备的能力。这一项则是 Hindsight 独有的，也是 Eve 智能体能够一开始就掌握信息的原因。

Hindsight 记忆库不归写入它的智能体所有。如果你的工程师在编程智能体背后运行 Hindsight，那么你已经有一个记忆库，里面记录了重试逻辑为何如此设计，以及 8 月是哪次迁移导致预发布环境出问题：

```bash
npx @vectorize-io/hindsight-coding-agents install all
```

将 Eve 槽位指向这个记忆库，智能体就能继承其中的全部内容：

```ts
provider: hindsightMemory({ bankId: "engineering-shared" }),
```

在 Slack 上回答“结账流程为什么会重试三次”的内部智能体，就可以利用团队在编辑器中总结出的经验，而不只依赖写进文档的内容。反过来也一样：Eve 智能体学到的内容会保存在其他工具也能读取的记忆库中。

要谨慎设置。字符串 `bankId` 会将**所有**范围固定到同一个记忆库；对于共享的内部智能体，这恰好合适；对于面向客户的智能体，这样做则完全不合适，因为它会关闭上一节介绍的隔离机制。如果你既需要每位用户各自的记忆，又希望它能访问共享记忆库，请让槽位保留按范围划分记忆的默认设置，并为共享记忆库单独设置一个槽位。Eve 支持多个槽位，每个槽位都有自己的范围。

## 所需配置 {#what-it-takes}

四种能力都只需一个文件：

```ts
// agent/memory/hindsight.ts
import { hindsightMemory } from "@vectorize-io/hindsight-eve";
import { defineMemory } from "eve/memory";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description: "Long-term memory about the current user.",
  provider: hindsightMemory(),
  scope: byPrincipal,
});
```

```bash
npm install @vectorize-io/hindsight-eve
```

设置 `HINDSIGHT_API_KEY` 后，记忆槽就会启用：每轮开始前，根据当前用户消息进行召回；消息结束后捕获记忆；如果问题需要跨多条记忆进行推理，而不是只检索几条，就会提供一个 `reflect` 工具。关键路径无需模型调用工具；如果召回失败，智能体会退化为没有记忆的智能体，而不会导致整个轮次失败。

建议使用 Eve 0.69.0 或更高版本。在 0.51.0 到 0.68.x 版本中，任何提供方的 `capture["turn.completed"]` 都不会运行，因此只能召回记忆，无法存入新内容。

## 延伸阅读 {#further-reading}

- [Eve 的 Hindsight 集成](/sdks/integrations/eve)：安装、选项，以及范围如何映射到记忆库。
- [Eve 记忆](https://eve.dev/docs/memory)和[多租户记忆](https://github.com/vercel/eve/blob/main/docs/patterns/multi-tenant-memory.md)：本文示例所用的槽位、范围和可见范围模型。
- [我使用的每个 AI 工具，共用一个记忆库](/blog/2026/04/07/one-memory-for-every-ai-tool)：第四种用例背后的共享记忆库思路。
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：存储的内容是什么，以及它为何不是对话记录。
