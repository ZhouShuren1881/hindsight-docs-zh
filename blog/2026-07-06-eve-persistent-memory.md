---
title: "教学Vercel夏娃要记住：自动智能体记忆"
authors: [benfrank241]
slug: "2026/07/06/eve-persistent-memory"
date: 2026-07-06T12:00
tags: [hindsight, eve, vercel, integration, memory, persistent-memory, tutorial]
description: "Vercel Eve 智能体通过后见之明获得自动长期记忆 - eve v0.2.0：每次回合前注入上下文，每次交换后保存，无模型工具调用。"
image: /img/blog/eve-persistent-memory.png
hide_table_of_contents: true
---

![Eve 持续记忆Hindsight](/img/blog/eve-persistent-memory.png)

[Vercel 夏娃](https://vercel.com/eve) 是一个开源的、文件系统优先的框架，用于构建 AI 智能体：智能体是一个文件目录，一个工具是一个 TypeScript 文件，一项技能是一个 Markdown 文件。 Vercel [宣布了](https://vercel.com/blog/introducing-eve) 于 2026 年 6 月发布，它默认提供持久执行、沙盒计算和 OpenTelemetry 跟踪等生产功能。它不提供的是长期记忆，这就是 [Hindsight](https://hindsight.vectorize.io) 的用武之地。

[夏娃](https://github.com/vercel/eve)的Hindsight集成的第一个版本提供了智能体记忆*工具*：`recall`、`retain`和`reflect`，通过MCP公开供模型调用。这是可行的，但它有一个对于每个基于工具的记忆设置来说都是共同的问题。该模型必须*决定*才能使用它。如果达不到`recall`，记忆也可能不存在。

`@vectorize-io/hindsight-eve` v0.2.0 删除了该依赖性。 现在的记忆是**自动**：在每轮之前注入相关上下文，然后保存每次交换，模型无需选择调用工具。

<!-- truncate -->

## 概览 {#tldr}

- v0.2.0 从称为记忆工具的模型切换到**自动记忆**。
- 两个编写的文件：一个**指令解析器**，在每轮之前调用并将结果作为系统消息注入，以及一个**挂钩**，在每轮之后保留。
- 两者都直接调用Hindsight的RESTAPI，因此记忆永远不依赖于LLM决定采取行动。
- 记忆召回是**基于配置文件，而不是每条消息**（解析器看不到实时用户消息）。它是“智能体了解你”的理想选择，并且是可调的。
- 与[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器配合使用；保留异步运行并且从不阻塞回合。

## 为什么自动机器胜过记忆工具 {#why-automatic-beats-a-memory-tool}

基于工具的记忆层的可靠性取决于模型对何时使用它的判断。给一个智能体一个`recall`工具，它有时会使用它：当提示明显需要历史记录时，当它碰巧想到它时。其余时间，它会从冷漠的上下文中进行回答，并悄悄地忘记您总是想要带有类型提示的 Python，或者该项目上周根据特定约定进行了标准化。

不可靠性是[智能体记忆](https://vectorize.io/what-is-agent-memory) 应该解决的整个问题。如果记忆是可选的，那么你就回到了偶尔会记住的无状态智能体。让记忆召回和记忆存储在每一个回合都变得自动化，才能将“拥有记忆工具”变成“实际记住”。

## 夏娃的自动记忆是如何运作的 {#how-eves-automatic-memory-works}

Eve 是文件系统优先的：智能体通过将文件放入项目中来获得行为。 v0.2.0 集成连接了其中两个，并且都不向模型公开工具。

**`agent/instructions/hindsight.ts`**是一个动态指令解析器。在`turn.started`，模型运行之前，它会从您的Hindsight记忆库中调用，并将结果作为系统消息注入。该区块被哨兵评论围起来，因此回忆的事实在返回时永远不会被重新保留。

**`agent/hooks/hindsight.ts`** 是一个钩子。在`turn.completed`，它保留与记忆库的交换：默认情况下，用户的消息和助理的回复，因为回复通常是答案所在的地方。保留异步运行，因此它们永远不会增加回合的延迟，并且故障会通过 `onError` 回调安静地降级，而不是破坏智能体。

​​两个文件都直接调用Hindsight的RESTAPI（通过`POST /v1/default/banks/{bank}/memories/recall`记忆召回，通过`POST /v1/default/banks/{bank}/memories`记忆存储）。没有MCP服务器，也没有模型调用的工具。 记忆发生在转弯处，而不是转弯处。

![保留的偏好合并到Hindsight记忆库中的观察中，不涉及工具调用。](/img/blog/eve-bank-observation.webp)

## 安装和快速启动 {#install-and-quick-start}

```bash
npm install @vectorize-io/hindsight-eve
```

`eve` 是对等依赖项，因此您已经在 Eve 项目中拥有它。然后创建两个文件：

```ts
// agent/instructions/hindsight.ts
import { hindsightMemory } from "@vectorize-io/hindsight-eve";

export default hindsightMemory();
```

```ts
// agent/hooks/hindsight.ts
import { hindsightRetainHook } from "@vectorize-io/hindsight-eve";

export default hindsightRetainHook();
```

这就是整个整合。两者都从环境中读取配置：

|环境变量|目的|
| --- | --- |
|`HINDSIGHT_API_KEY`|不记名令牌，作为`Authorization: Bearer <key>`发送|
|`HINDSIGHT_API_URL`|Hindsight REST 基础（默认为 Hindsight Cloud）|
|`HINDSIGHT_BANK_ID`|记忆库范围记忆到（默认为`default`，自动创建）|

将两个文件指向同一个`HINDSIGHT_BANK_ID`，因此记忆召回和记忆存储共享一个存储（例如，每个用户一个记忆库）。

## 记忆召回是基于配置文件的，而不是基于每条消息 {#recall-is-profile-based-not-per-message}

这是值得理解的设计权衡。 Eve 的指令解析器在实时用户消息可用之前在回合的 *开始* 处运行。因此，记忆召回不能特定于用户刚刚询问的内容。相反，它使用固定的、广泛的查询（默认为`"用户偏好、身份和工作上下文"`）来显示用户每回合的环境概况。

这对于“智能体了解你”的情况来说是完全正确的：偏好、身份、正在进行的项目背景、应该塑造每个回复的持久事物。它是确定性的，您可以使用 `recallQuery` 选项调整查询，以匹配您的智能体应始终保持在视图中的内容。

它不是按消息进行语义检索。提取 *这个具体问题* 的三个最相关的事实本质上需要模型在正确的时刻调用一个工具，而这超出了自动路径设计的范围。如果您需要两者，则这两种方法组成：环境上下文的自动配置记忆召回，用于目标查找的调用工具。

## 云或自托管 {#cloud-or-self-hosted}

对于 **Hindsight Cloud**，将 `HINDSIGHT_API_KEY` 设置为仪表板上的键。 `HINDSIGHT_API_URL` 默认为`https://api.hindsight.vectorize.io`，因此无需配置其他内容。

对于 **自托管** 服务器，指向您自己的基本 URL。如果它在没有身份验证的情况下运行，则传递`apiKey: null`：

```ts
import { hindsightMemory } from "@vectorize-io/hindsight-eve";

export default hindsightMemory({ apiUrl: "http://localhost:8000", apiKey: null });
```

两个工厂都接受相同的选项，每个选项都回退到其环境变量：

|选项|默认|目的|
| --- | --- | --- |
|`apiUrl` / `apiKey` / `bankId`|env，然后是云|连接和记忆库（`apiKey: null` = 无身份验证）|
|`recallQuery`|`"用户偏好、身份和工作上下文"`|用于记忆召回的广泛查询|
|`budget`|`"mid"`|记忆召回结果预算 (`low` / `mid` / `high`)|
|`maxTokens`|`1024`|记忆召回token预算|
|`includeAssistantReply`|`true`|记忆存储 助理的回复；设置`false`仅存储用户的消息|
|`context`|`"eve"`|写在保留项目上的`context`标签|
|`onError`|`console.warn`|记忆召回/记忆存储故障退化为|

## 验证它是否有效 {#verify-it-works}

运行你的智能体并在一次聊天中告诉它一个持久的偏好，例如“当我要求代码时，总是用 Rust 编写。”

![在一次聊天中教会智能体一种持久的偏好。](/img/blog/eve-teach-preference.png)

然后开始**新鲜**聊天并询问一些事情。智能体应用记住的偏好，因为记忆是在模型运行之前作为系统消息注入的，没有工具调用，也没有您的提示。

![新的聊天记录用 Rust 编写了 CSV 解析器，应用记住的首选项，无需调用任何工具。](/img/blog/eve-recall-rust.webp)

## 常见问题解答 {#frequently-asked-questions}

**模型是否必须调用工具才能使用记忆？**
没有。这就是 v0.2.0 的重点。 记忆召回是在模型运行之前注入的，记忆存储是在模型运行之后通过钩子发生的。该模型永远不会看到或调用记忆工具。

**每回合会回忆起什么？**
您的环境概况：通过固定的广泛查询，偏好、身份和工作环境。指令解析器在实时用户消息可用之前运行，因此记忆召回是基于配置文件的，而不是基于每个消息的。用 `recallQuery` 进行调整。

**它也存储助手的回复吗？**
是的。默认情况下，它会保留用户的消息和助理的回复，因为回复通常是真实信号所在的地方：它做出的决定、它描述的解决方案、它编写的代码。如果您只想保留用户所说的内容，请设置`includeAssistantReply: false`。

**它会增加延迟吗？**
保持异步运行，永不阻塞转弯； 记忆召回是回合前的一次呼叫。失败会导致`onError`退化，而不是破坏智能体。

## 进一步阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回和保留背后的基本概念。
- [最佳AI智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：主要智能体记忆框架的比较。
- [Vercel AI SDK 持久记忆](/blog/2026/06/23/vercel-ai-sdk-persistent-memory)：其他Vercel智能体堆栈的记忆。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将 Eve 和你的其他智能体指向同一个记忆库。
