---
title: "教会 Vercel Eve 记住信息：智能体自动记忆"
authors: [benfrank241]
slug: "2026/07/06/eve-persistent-memory"
date: 2026-07-06T12:00
tags: [hindsight, eve, vercel, integration, memory, persistent-memory, tutorial]
description: "借助 hindsight-eve v0.2.0，Vercel Eve 智能体可获得自动长期记忆：每轮开始前注入上下文，每轮结束后保存对话，无需模型调用工具。"
image: /img/blog/eve-persistent-memory.png
hide_table_of_contents: true
---

![借助 Hindsight 实现 Eve 持久记忆](/img/blog/eve-persistent-memory.png)

[Vercel Eve](https://vercel.com/eve) 是一个开源、以文件系统为核心的 AI 智能体构建框架：智能体是一个文件目录，工具是一个 TypeScript 文件，技能是一个 Markdown 文件。Vercel 于 2026 年 6 月[发布了 Eve](https://vercel.com/blog/introducing-eve)，并默认提供持久执行、沙盒计算和 OpenTelemetry 追踪等生产环境功能。它没有内置长期记忆，而这正是 [Hindsight](https://hindsight.vectorize.io) 能发挥作用的地方。

最初为 [Eve](https://github.com/vercel/eve) 开发的 Hindsight 集成版本向智能体提供记忆**工具**：`recall`、`retain` 和 `reflect`，通过 MCP 暴露给模型调用。这种方式可行，但和所有基于工具的记忆方案一样有个问题：模型必须**决定**使用它。如果模型没有调用 `recall`，这些记忆就形同不存在。

`@vectorize-io/hindsight-eve` v0.2.0 消除了对模型这一决定的依赖。现在记忆是**自动的**：每轮开始前注入相关上下文，每轮结束后保存本轮对话，模型无需选择调用工具。

<!-- truncate -->

## 概览 {#tldr}

- v0.2.0 从由模型调用记忆工具切换为**自动记忆**。
- 需要编写两个文件：一个**指令解析器**，在每轮开始前执行召回，并将结果作为系统消息注入；另一个是**钩子**，在每轮结束后执行存入。
- 两者都直接调用 Hindsight REST API，因此记忆不再取决于 LLM 是否决定采取行动。
- 召回**基于用户档案，而非单条消息**（解析器无法看到当前用户消息）。它适合实现“智能体了解你”，而且可以调整。
- 可配合 [Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器使用；存入操作异步运行，不会阻塞对话轮次。

## 为什么自动记忆优于记忆工具 {#why-automatic-beats-a-memory-tool}

基于工具的记忆层有多可靠，取决于模型判断何时该使用它。给智能体一个 `recall` 工具，它有时会用：例如提示显然需要历史信息时，或它碰巧想起这个工具时。其他时候，它会在没有上下文的情况下回答，悄悄忘掉你总是希望 Python 代码带上类型提示，或者这个项目上周刚统一采用的某个约定。

这类不可靠正是[智能体记忆](https://vectorize.io/what-is-agent-memory)要解决的问题。如果记忆是可选的，你得到的还是一个无状态、偶尔会记起事情的智能体。让每一轮的召回和存入都自动执行，才能把“有记忆工具”变成“确实会记住”。

## Eve 的自动记忆如何运作 {#how-eves-automatic-memory-works}

Eve 以文件系统为核心：只要把文件放进项目，智能体就能获得相应行为。v0.2.0 集成会接入两个此类文件，两者都不会向模型暴露工具。

**`agent/instructions/hindsight.ts`** 是一个动态指令解析器。在 `turn.started` 事件发生时，也就是模型运行之前，它会从你的 Hindsight 记忆库中召回内容，并将结果作为系统消息注入。该消息块由哨兵注释括起，避免召回的事实在返回时被再次存入。

**`agent/hooks/hindsight.ts`** 是一个钩子。在 `turn.completed` 事件发生时，它会将本轮对话存入记忆库。默认情况下，用户消息和助手回复都会存入，因为答案通常包含在回复中。存入操作异步运行，不会增加轮次延迟；如果发生故障，`onError` 回调会安静地处理错误，而不会导致智能体中断。

这两个文件都会直接调用 Hindsight REST API（召回使用 `POST /v1/default/banks/{bank}/memories/recall`，存入使用 `POST /v1/default/banks/{bank}/memories`）。这里没有 MCP 服务器，也没有供模型调用的工具。记忆操作发生在轮次前后，而不是轮次执行过程中。

![一项偏好被存入并整合为 Hindsight 记忆库中的观测，整个过程无需调用工具。](/img/blog/eve-bank-observation.webp)

## 安装和快速开始 {#install-and-quick-start}

```bash
npm install @vectorize-io/hindsight-eve
```

`eve` 是同级依赖，因此 Eve 项目中已经有它。接下来创建两个文件：

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

集成只需这些内容。两个文件都从环境变量读取配置：

| 环境变量 | 用途 |
| --- | --- |
| `HINDSIGHT_API_KEY` | Bearer 令牌，通过 `Authorization: Bearer <key>` 发送 |
| `HINDSIGHT_API_URL` | Hindsight REST API 的基础 URL（默认为 Hindsight Cloud） |
| `HINDSIGHT_BANK_ID` | 要使用的记忆库 ID（默认为 `default`，并会自动创建） |

让两个文件使用相同的 `HINDSIGHT_BANK_ID`，这样召回和存入就会共用同一个存储空间（例如，每位用户使用一个记忆库）。

## 召回基于用户档案，而非单条消息 {#recall-is-profile-based-not-per-message}

需要理解这项设计取舍。Eve 的指令解析器在每轮**开始时**运行，此时还无法读取当前用户消息。因此，召回查询无法针对用户刚刚提出的问题。它改用固定且范围较广的查询（默认值为 `"user preferences, identity, and working context"`），每轮都提取用户的整体档案信息。

对于“智能体了解你”这种用途，这恰好合适：偏好、身份、正在进行的项目背景，以及应该影响每次回复的持久信息。这个过程是确定性的；你可以使用 `recallQuery` 选项调整查询，使其符合智能体应该始终关注的内容。

这种方式不提供针对单条消息的语义检索。要找出与**当前问题**最相关的三条事实，模型必须在适当时机调用工具；这有意不在自动路径的范围内。如果两种能力都需要，可以组合使用：自动召回用户档案以提供常驻上下文，再通过模型调用的工具执行定向查询。

## 使用云服务或自托管服务器 {#cloud-or-self-hosted}

若使用 **Hindsight Cloud**，请将 `HINDSIGHT_API_KEY` 设置为控制台中的密钥。`HINDSIGHT_API_URL` 默认为 `https://api.hindsight.vectorize.io`，因此无需再配置其他内容。

若使用**自托管**服务器，请将基础 URL 指向自己的服务器。如果服务器未启用身份验证，请传入 `apiKey: null`：

```ts
import { hindsightMemory } from "@vectorize-io/hindsight-eve";

export default hindsightMemory({ apiUrl: "http://localhost:8000", apiKey: null });
```

两个工厂函数接受相同的选项；每项配置都会回退到对应的环境变量：

| 选项 | 默认值 | 用途 |
| --- | --- | --- |
| `apiUrl` / `apiKey` / `bankId` | 环境变量，其次为 Cloud | 连接设置和记忆库（`apiKey: null` = 不进行身份验证） |
| `recallQuery` | `"user preferences, identity, and working context"` | 用于召回的宽泛查询 |
| `budget` | `"mid"` | 召回结果预算（`low` / `mid` / `high`） |
| `maxTokens` | `1024` | 召回结果的 token 预算 |
| `includeAssistantReply` | `true` | 是否也存入助手回复；设为 `false` 时只存入用户消息 |
| `context` | `"eve"` | 写入存入项的 `context` 标签 |
| `onError` | `console.warn` | 召回或存入失败时调用的错误处理函数 |

## 验证是否生效 {#verify-it-works}

运行智能体，在一次对话中告诉它一项长期偏好，例如：“我让你写代码时，请始终使用 Rust。”

![在一次对话中教会智能体一项长期偏好。](/img/blog/eve-teach-preference.png)

接着开始一个**新**对话并提出问题。由于模型运行前记忆已作为系统消息注入，智能体会应用记住的偏好；整个过程无需调用工具，也无需你再次提示。

![在新对话中，智能体使用 Rust 编写 CSV 解析器并应用记住的偏好，全程无需调用工具。](/img/blog/eve-recall-rust.webp)

## 常见问题 {#frequently-asked-questions}

**模型必须调用工具才能使用记忆吗？**
不需要。这正是 v0.2.0 要实现的效果。模型运行前会注入召回结果，每轮结束后则通过钩子执行存入。模型不会看到或调用记忆工具。

**每轮会召回哪些内容？**
系统会用一个固定的宽泛查询提取你的整体档案，包括偏好、身份和工作背景。指令解析器运行时还无法读取当前用户消息，因此召回基于用户档案，而非单条消息。可通过 `recallQuery` 调整查询。

**助手的回复也会被存入吗？**
会。默认情况下，用户消息和助手回复都会存入，因为回复通常包含真正有价值的信息：智能体做出的决定、描述的解决方案以及编写的代码。如果你只想保留用户说的内容，请设置 `includeAssistantReply: false`。

**这会增加延迟吗？**
存入操作异步运行，不会阻塞轮次；召回则是在每轮开始前进行一次调用。若发生故障，`onError` 会处理错误，而不会导致智能体中断。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解召回和存入的基础概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：了解主要智能体记忆框架的比较。
- [Vercel AI SDK 持久记忆](/blog/2026/06/23/vercel-ai-sdk-persistent-memory)：为 Vercel 的另一套智能体技术栈添加记忆。
- [让所有 AI 工具共用一套记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让 Eve 和你的其他智能体使用同一个记忆库。

---
