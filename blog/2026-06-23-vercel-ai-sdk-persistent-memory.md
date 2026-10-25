---
title: "用五种工具为 Vercel AI SDK 添加持久记忆"
authors: [benfrank241]
slug: "2026/06/23/vercel-ai-sdk-persistent-memory"
date: 2026-06-23T12:00
tags: [vercel-ai-sdk, memory, persistent-memory, hindsight, agents, typescript, tutorial]
description: "借助 Hindsight，为任何 Vercel AI SDK 应用添加长期记忆。五个可直接使用的工具可存入、召回记忆并进行反思，能在任何模型提供方上与 generateText、streamText 和 ToolLoopAgent 配合使用。"
image: /img/blog/vercel-ai-sdk-persistent-memory.webp
hide_table_of_contents: true
---

![Vercel AI SDK 与 Hindsight 的持久记忆](/img/blog/vercel-ai-sdk-persistent-memory.webp)

[Vercel AI SDK](https://ai-sdk.dev) 是用 TypeScript 快速交付 AI 功能的方式：调用一次 `generateText`，通过一行 import 切换模型提供方，再把 token 流式传输给 React 组件。但它没有提供记忆。每次调用都会从空白状态开始，因此请求一结束，助手就会忘记用户的姓名、偏好，以及上次对话中确定的所有内容。

Hindsight 集成按照 AI SDK 预期的扩展方式弥补了这一缺口：通过**工具**。只需运行一次 `npm install`，模型就能获得五种记忆工具，可调用 Retain（存入）来记录事实、Recall（召回）来查找上下文，并通过 Reflect（反思）基于已有信息进行推理。由于这些能力完全位于工具层，因此适用于 SDK 支持的任何模型提供方。

## 简介 {#tldr}

<!-- truncate -->

- Vercel AI SDK 不提供持久记忆。每次 `generateText` / `streamText` 调用都是无状态的。
- `@vectorize-io/hindsight-ai-sdk` 通过**五种 AI SDK 工具**添加记忆：`retain`、`recall`、`reflect`、`getMentalModel` 和 `getDocument`。
- 只需一次调用即可接入这些工具：`createHindsightTools({ client, bankId })`，然后把返回结果传给 `tools`。
- 这种设计清楚地划分了职责：**智能体**控制语义输入（要记住什么、要搜索什么）；**应用**锁定基础设施设置（记忆库、成本预算、标签、异步模式）。模型无法更改记忆库 ID，也无法超出 token 预算。
- 可与 `generateText`、`streamText` 和 `ToolLoopAgent` 搭配使用，并支持任何模型提供方（OpenAI、Anthropic、Google 等）。
- 使用 Hindsight Cloud 无需自行运行基础设施。[免费注册。](https://ui.hindsight.vectorize.io)

## 为什么 AI SDK 需要记忆 {#why-the-ai-sdk-needs-memory}

AI SDK 提供了清晰的请求式抽象：输入消息，输出文本或数据流，中间可以调用工具。无状态正是它易于部署在无服务器和边缘运行时上的原因，也正因如此，记忆成了你需要自行解决的问题。

只要针对同一用户运行多次，这个缺口很快就会显现出来。客服助手每次会话都要重新询问账户信息；编程助手每次重新加载都要重新学习项目约定；个人助理会忘记用户昨天告诉它的偏好。常见的解决办法是把先前的对话轮次塞进提示词，但这只能用到上下文窗口的容量，而且会在会话结束时清空。你要么自行构建真正的记忆层（数据存储、嵌入、检索和去重），要么交付一个健忘的助手。

Hindsight 就是这一记忆层，它以 AI SDK 已经能够调用的工具形式提供能力。

## 用工具实现可靠的记忆功能 {#memory-as-tools-done-right}

AI SDK 是一个工具调用框架。赋予模型新能力的原生方式就是提供工具，因此这个集成也采用这种方式：模型自行决定何时调用记忆，就像它决定何时调用天气 API 或执行计算一样。

基于工具的记忆有一个陷阱：给模型太多可调项。如果每次调用都由模型选择记忆库 ID、成本预算和标签策略，就等于把基础设施决策交给了语言模型，而模型可能会选错。Hindsight 集成通过明确划分两类输入来避免这个问题：

- **语义输入由智能体决定。** 要记住什么、要搜索什么、要围绕什么问题进行反思。这些属于语言层面的决策，正是模型擅长的部分。
- **基础设施由应用决定。** 写入哪个记忆库、愿意花多少时间、附加哪些标签，以及写入是否采用即发即弃模式。这些选项在创建工具时就已固定，模型看不到它们。

实际使用时，记忆库 ID 在创建工具时设置一次，模型根本无法更改它。这样既能可靠地隔离不同用户的数据，也能避免模型意外耗尽 token 预算。

## 五种工具 {#the-five-tools}

`createHindsightTools` 会注册五种工具。中间一列是模型每次调用时提供的内容，右侧一列是创建工具时由你固定的设置。

| 工具 | 智能体提供 | 应用控制 |
| --- | --- | --- |
| `retain` | `content`、`documentId`、`timestamp`、`context` | `async`、`tags`、`metadata` |
| `recall` | `query`、`queryTimestamp` | `budget`、`types`、`maxTokens`、`includeEntities`、`includeChunks` |
| `reflect` | `query`、`context` | `budget`、`maxTokens` |
| `getMentalModel` | `mentalModelId` | — |
| `getDocument` | `documentId` | — |

前三种工具组成核心循环。`retain` 会存入值得记住的内容。`recall` 会搜索相关事实。`reflect` 会基于这些记忆进行推理，综合生成答案，而非只返回匹配项。后两种工具用于精确获取内容：`getMentalModel` 会提取已整合、预先综合好的摘要，比搜索原始记忆更省成本；`getDocument` 则按 ID 获取已存储的文档，以便取回原始文本。

## 设置 {#setup}

将此软件包与 AI SDK 和 Hindsight 客户端一同安装：

```bash
npm install @vectorize-io/hindsight-ai-sdk @vectorize-io/hindsight-client ai
```

推荐使用的后端是 **Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)、创建 API 密钥，并让客户端连接到它。自托管的使用方式相同：只需运行一条命令在本地启动 API，再使用它的 URL：

```bash
uvx hindsight-embed@latest -p myapp daemon start
# API 地址为 http://localhost:8000
```

## 在生成调用中加入记忆 {#adding-memory-to-a-generation}

整个集成只需以下步骤：创建客户端，使用 `bankId` 创建工具，再把它们传给任何 AI SDK 调用：

```typescript
import { HindsightClient } from "@vectorize-io/hindsight-client";
import { createHindsightTools } from "@vectorize-io/hindsight-ai-sdk";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const client = new HindsightClient({ baseUrl: process.env.HINDSIGHT_API_URL! });

const tools = createHindsightTools({
  client,
  bankId: "user-123",
});

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools,
  maxSteps: 5,
  system: "You are a helpful assistant with long-term memory.",
  prompt: "Remember that I prefer dark mode and large fonts.",
});
```

稍后再次调用时，即使这是一次冷启动后的无服务器调用，模型也会调用 `recall` 并取回这些偏好：

```typescript
const { text } = await generateText({
  model: openai("gpt-4o"),
  tools,
  maxSteps: 5,
  system: "You are a helpful assistant with long-term memory.",
  prompt: "What are my display preferences?",
});
// -> answers with dark mode and large fonts
```

除了添加 `tools`，请求处理程序无需做其他改动。设置 `maxSteps`（或 `stopWhen` 条件），模型就能在同一轮中调用记忆工具，并在生成答案时使用返回结果。

## 流式生成与智能体 {#streaming-and-agents}

记忆就是工具，因此无需改动即可接入 AI SDK 的每种入口。

使用 `streamText` 时，工具的工作方式完全相同；模型在生成过程中调用记忆的同时，token 也会持续流出：

```typescript
import { streamText } from "ai";

const result = streamText({
  model: openai("gpt-4o"),
  tools,
  maxSteps: 5,
  system: "You are a helpful assistant with long-term memory.",
  prompt: "What are my display preferences?",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

使用 `ToolLoopAgent` 时，可以把同一组工具交给自主运行的智能体循环：

```typescript
import { ToolLoopAgent, stepCountIs } from "ai";

const agent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  tools: createHindsightTools({ client, bankId: "user-123" }),
  stopWhen: stepCountIs(10),
  system: "You are a helpful assistant with long-term memory.",
});

const result = await agent.generate({
  prompt: "Remember that my favorite editor is Neovim",
});
```

## 在 Next.js 路由中为每位用户设置记忆 {#per-user-memory-in-a-nextjs-route}

`bankId` 是记忆的路由键，而 Hindsight 记忆库只是一个命名空间。最常见的做法是每位用户使用一个记忆库。由于记忆库在创建工具时就已固定，在服务器端实现这一模式的简洁方法是在请求处理程序**内部**创建工具，并将当前用户的 ID 闭包捕获在其中：

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { HindsightClient } from "@vectorize-io/hindsight-client";
import { createHindsightTools } from "@vectorize-io/hindsight-ai-sdk";

const hindsightClient = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL!,
});

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // 每次请求都创建工具，并捕获当前用户的 bankId
  const tools = createHindsightTools({
    client: hindsightClient,
    bankId: userId,
  });

  return streamText({
    model: openai("gpt-4o"),
    tools,
    maxSteps: 5,
    system: "You are a helpful assistant with long-term memory.",
    messages,
  }).toDataStreamResponse();
}
```

每个请求获得的工具都只限于一位用户的记忆。这里没有共享的可变状态；由于模型无法控制所连接的记忆库，因此一个用户的请求也无法读写其他用户的记忆库。

## 调整设置，无需改动智能体循环 {#tuning-without-touching-your-agent-loop}

每种基础设施设置都是 `createHindsightTools` 的一个选项，并按其影响的工具分组。你只需设置一次，模型看不到这些设置：

```typescript
const tools = createHindsightTools({
  client,
  bankId: userId,

  retain: {
    async: true,                        // 即发即弃（默认值：false）
    tags: ["env:prod", "app:support"],  // 附加到每条存入的记忆
    metadata: { version: "2.0" },
  },

  recall: {
    budget: "high",                     // low | mid | high（默认值：'mid'）
    types: ["experience", "world"],     // 限定事实类型（默认：全部）
    maxTokens: 2048,                    // 限制 token 预算
    includeEntities: true,              // 包含实体观测
  },

  reflect: {
    budget: "mid",
  },
});
```

在生产环境中，以下几项尤其重要：

- **`retain.async: true`** 会让写入以即发即弃方式进行，因此 `retain` 调用不会增加用户请求中的摄取延迟。
- **`recall.budget`** 用延迟换取检索深度：快速查询可用 `low`；彻底性比速度更重要时可用 `high`。
- **`recall.types`** 可将记忆召回限制为 `world`、`experience` 或 `observation` 类型的事实，以便只获取某一类事实。
- **`retain.tags`** 会给来自此入口的每条记忆都添加标签，便于在多个应用共享的记忆库中进行整理。

你也可以覆盖任一工具的 `description`，以引导模型在何时调用该工具，而无需更改系统提示词。

## 这种设计为何可靠 {#why-this-design-holds-up}

| | AI SDK 默认行为 | 使用 Hindsight |
| --- | --- | --- |
| 多次调用之间的记忆 | 无 | 持久保存，按记忆库隔离 |
| 设置方式 | 不适用 | 调用 `createHindsightTools`，并传给 `tools` |
| 实现机制 | 不适用 | 五种 AI SDK 工具 |
| 模型提供方 | 任意 | 任意（工具与提供方无关） |
| 记忆库 ID 由谁控制 | 不适用 | 应用在创建工具时固定 |
| 成本和延迟由谁控制 | 不适用 | 应用，而非模型 |
| 多用户隔离 | 不适用 | 每个请求使用自己的 `bankId` |

即使你打算自行构建记忆工具，也值得借鉴语义输入与基础设施输入的这种划分。让模型决定要记住什么、要查找什么。不要让模型决定记忆存放在哪里或会产生多少成本。这就是可投入生产的记忆层与演示程序的区别：后者可能会一直运行，直到模型选错记忆库为止。

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Vercel AI SDK + Hindsight](/sdks/integrations/ai-sdk)
- **源代码：**[vectorize-io/hindsight/hindsight-integrations/ai-sdk](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/ai-sdk)
- **Reflect 详解：**[心智模型与分层检索](/blog/2026/06/05/mental-models-deep-dive)
