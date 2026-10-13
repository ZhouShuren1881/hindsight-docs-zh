---
title: "五种工具中VercelAISDK的持久记忆"
authors: [benfrank241]
slug: "2026/06/23/vercel-ai-sdk-persistent-memory"
date: 2026-06-23T12:00
tags: [vercel-ai-sdk, memory, persistent-memory, hindsight, agents, typescript, tutorial]
description: "使用Hindsight为任何VercelAISDK应用程序添加长期记忆。五个即用型记忆存储、记忆感知和反思工具，可在任何模型提供程序上与generateText、streamText 和 ToolLoopAgent 配合使用。"
image: /img/blog/vercel-ai-sdk-persistent-memory.webp
hide_table_of_contents: true
---

![VercelAISDK和Hindsight的持久记忆](/img/blog/vercel-ai-sdk-persistent-memory.webp)

[VercelAISDK](https://ai-sdk.dev) 是在 TypeScript 中交付 AI 功能的最快方式：一次 `generateText` 调用、通过单行导入交换模型提供程序、将令牌流式传输到 React 组件。它不能给你的是记忆。每个呼叫都是从空白开始，因此您的助手会忘记用户的姓名、偏好以及请求结束时上次对话中决定的所有内容。

Hindsight 集成缩小了这一差距，就像 AI SDK 希望您扩展它的方式：使用 **工具**。一个`npm install`，模型就获得了五种记忆工具，可以调用它来记忆事实、记忆上下文以及对它所知道的事情的反思。它可以与 SDK 支持的任何模型提供程序一起使用，因为它完全位于工具层上。

## 概览 {#tldr}

<!-- truncate -->

- VercelAISDK没有持久记忆。每个 `generateText` / `streamText` 调用都是无状态的。
- `@vectorize-io/hindsight-ai-sdk` 将记忆添加为 **五个AISDK工具**：`retain`、`recall`、`reflect`、`getMentalModel` 和 `getDocument`。
- 一个调用将它们连接到：`createHindsightTools({ client, bankId })`，然后将结果传递给`tools`。
- 设计清晰地划分了职责：**智能体**控制语义输入（要记住什么，要搜索什么）；您的**应用**锁定基础设施（记忆库、成本预算、标签、异步模式）。该模型无法更改记忆库 ID 或超出您的token预算。
- 可在任何提供商（OpenAI、Anthropic、Google 等）上与`generateText`、`streamText` 和 `ToolLoopAgent` 配合使用。
- Hindsight Cloud意味着无需运行基础设施。 [免费注册。](https://ui.hindsight.vectorize.io)

## 为什么AISDK需要记忆 {#why-the-ai-sdk-needs-memory}

AISDK为您提供了一个干净的请求形状的抽象：消息输入、文本或流输出，其间有工具调用。这种无状态性正是使得在无服务器和边缘运行时上部署变得容易的原因。这也是记忆成为你的问题的原因。

对于针对同一用户多次运行的任何操作，差距很快就会显现出来。支持助理在每次会话时都会重新询问帐户详细信息。每次重新加载时，编码助手都会重新学习项目的约定。私人助理忘记了用户昨天告诉它的偏好。通常的解决方法是将先前的回合填充到提示中，但这只会延伸到上下文窗口，并且会在会话结束时重置。你要么自己构建一个真正的记忆层（数据存储、嵌入、检索、重复数据删除），要么派一个患有健忘症的助手。

Hindsight 是记忆层，作为工具公开，AI SDK 已经知道如何驾驶。

## 记忆作为工具，做得正确 {#memory-as-tools-done-right}

AISDK是一个工具调用框架。赋予模型新功能的原生方法是给它一个工具，这就是这种集成的工作原理：模型决定何时进行记忆，就像它决定何时调用天气API或运行计算一样。

基于工具的记忆的陷阱给模型带来了太多的旋钮。如果模型在每次调用时选择记忆库 ID、成本预算和标记策略，那么您就将基础设施决策交给了语言模型，但它会出错。 Hindsight 的集成通过在两种输入之间划出一条硬线来避免这种情况：

- **语义输入属于智能体。** 要记住什么，要搜索什么，要思考什么问题。这些是语言决策，这正是模型所擅长的。
- **基础设施属于您的应用程序。** 写入哪个记忆库，花费多少延迟，附加什么标签，写入是否是即发即忘的。这些在您创建工具时就已修复，并且模型永远看不到它们。

实际上，这意味着记忆库 ID 在构造时设置一次，并且模型实际上无法更改它。结果是您可以信任的多用户隔离以及模型不会意外破坏的令牌预算。

## 五种工具 {#the-five-tools}

`createHindsightTools` 注册了五个工具。中间一列是模型在每次调用时填写的内容；右列是您在构建时锁定的内容。

|工具|智能体提供|应用程序控制|
| --- | --- | --- |
|`retain`|`content`、`documentId`、`timestamp`、`context`|`async`、`tags`、`metadata`|
|`recall`|`query`, `queryTimestamp`|`budget`、`types`、`maxTokens`、`includeEntities`、`includeChunks`|
|`reflect`|`query`, `context`|`budget`, `maxTokens`|
|`getMentalModel`|`mentalModelId`|—|
|`getDocument`|`documentId`|—|

前三个是核心循环。 `retain` 存储一些值得记住的东西。 `recall` 在记忆中搜索相关事实。 `reflect` 对这些记忆进行推理以综合答案，而不仅仅是返回匹配项。最后两个用于精确检索：`getMentalModel` 提取一个综合的、预先合成的摘要，这比搜索原始记忆更便宜，而 `getDocument` 在您需要返回精确原始文本的情况下通过 ID 获取存储的文档。

## 设置 {#setup}

将软件包与AISDK和Hindsight客户端一起安装：

```bash
npm install @vectorize-io/hindsight-ai-sdk @vectorize-io/hindsight-client ai
```

推荐的后端是**Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)，创建一个API密钥，并将客户端指向它。自托管的工作原理相同；使用一个命令在本地运行 API 并使用其 URL：

```bash
uvx hindsight-embed@latest -p myapp daemon start
# API 位于 http://localhost:8000
```

## 为一代人增加记忆 {#adding-memory-to-a-generation}

这就是整个整合。创建一个客户端，使用 `bankId` 创建工具，并将它们传递给任何 AI SDK 调用：

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
  system: "你是一个有长期记忆力的得力助手。",
  prompt: "请记住，我更喜欢深色模式和大字体。",
});
```

在稍后的调用中，即使是冷无服务器调用，模型也会调用 `recall` 并获取首选项：

```typescript
const { text } = await generateText({
  model: openai("gpt-4o"),
  tools,
  maxSteps: 5,
  system: "你是一个有长期记忆力的得力助手。",
  prompt: "我的显示偏好是什么？",
});
//-> 使用深色模式和大字体的答案
```

除了添加`tools`之外，请求处理程序中没有任何更改。设置`maxSteps`（或`stopWhen`条件）可以让模型调用记忆工具，然后在一个回合内将结果用于其答案。

## 流媒体和智能体 {#streaming-and-agents}

因为记忆只是工具，所以它不变地落入每个AISDK入口点。

使用`streamText`，工具的工作原理完全相同；当模型调用记忆中期时，token会流动：

```typescript
import { streamText } from "ai";

const result = streamText({
  model: openai("gpt-4o"),
  tools,
  maxSteps: 5,
  system: "你是一个有长期记忆力的得力助手。",
  prompt: "我的显示偏好是什么？",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

使用`ToolLoopAgent`，您可以将相同的工具交给自动驾驶智能体循环：

```typescript
import { ToolLoopAgent, stepCountIs } from "ai";

const agent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  tools: createHindsightTools({ client, bankId: "user-123" }),
  stopWhen: stepCountIs(10),
  system: "你是一个有长期记忆力的得力助手。",
});

const result = await agent.generate({
  prompt: "记住我最喜欢的编辑器是 Neovim",
});
```

## Next.js 路由中的每用户记忆 {#per-user-memory-in-a-nextjs-route}

`bankId`是记忆的路由键，Hindsight记忆库只是一个命名空间。最常见的模式是每个用户一个记忆库。因为记忆库在构造时是固定的，所以在服务器上执行此操作的干净方法是创建工具 **里面** 您的请求处理程序，关闭当前用户的 ID：

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

  //根据请求创建工具，以当前用户的银行 ID 结束
  const tools = createHindsightTools({
    client: hindsightClient,
    bankId: userId,
  });

  return streamText({
    model: openai("gpt-4o"),
    tools,
    maxSteps: 5,
    system: "你是一个有长期记忆力的得力助手。",
    messages,
  }).toDataStreamResponse();
}
```

每个请求都会获得仅限于一个用户记忆的工具。没有共享的可变状态，一个用户的请求也无法读取或写入另一个用户的记忆库，因为该模型永远无法控制它正在与哪个记忆库进行通信。

## 无需接触智能体循环即可进行调整 {#tuning-without-touching-your-agent-loop}

每个基础设施问题都是`createHindsightTools`上的一个选项，分组在它影响的工具下。您只需设置一次即可；模型永远不会看到它们：

```typescript
const tools = createHindsightTools({
  client,
  bankId: userId,

  retain: {
    async: true,                        // fire-and-forget (default: false)
    tags: ["env:prod", "app:support"],  //附在每个保留的记忆上
    metadata: { version: "2.0" },
  },

  recall: {
    budget: "high",                     // low | mid | high (default: 'mid')
    types: ["experience", "world"],     //限制事实类型（默认：全部）
    maxTokens: 2048,                    //限制token预算
    includeEntities: true,              //包括实体 观察
  },

  reflect: {
    budget: "mid",
  },
});
```

在生产中重要的一些：

- **`retain.async: true`** 使写入一劳永逸，因此记忆存储调用不会增加用户的摄取延迟。
- **`recall.budget`** 以延迟换取深度：`low` 用于快速查找，`high` 当彻底性比速度更重要时。
当您只想要一种事实时，
- **`recall.types`**将记忆召回限制为`world`、`experience`或`observation`事实。
- **`retain.tags`** 使用标签标记此表面上的每个记忆，从而在多个应用程序之间组织共享记忆库。

您还可以覆盖任何工具的`description`，以便在模型到达时进行转向，而无需更改系统提示。

## 为什么这个设计有效 {#why-this-design-holds-up}

||AI SDK 默认|与 Hindsight|
| --- | --- | --- |
|通话中的记忆|无|持久，根据记忆库|
|设置|不适用|`createHindsightTools`，传至`tools`|
|机制|不适用|五个 AI SDK 工具|
|模型提供者|任意|任何（工具与提供商无关）|
|谁控制着记忆库ID|不适用|应用程序，固定于施工|
|谁控制成本/延迟|不适用|应用程序，而不是模型|
|多用户隔离|不适用|每个请求 `bankId`|

即使您构建自己的记忆工具，语义输入和基础设施输入之间的划分也是值得复制的部分。让模型决定要记住什么以及要查找什么。不要让它决定记忆的位置或成本。这就是可以在生产中运行的记忆层与在模型选择错误的记忆库之前一直运行的演示之间的区别。

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Vercel AI SDK + Hindsight](/sdks/integrations/ai-sdk)
- **来源：**[vectorize-io/hindsight/hindsight-integrations/ai-sdk](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/ai-sdk)
- **反思，解释道：**[心智模型与分层检索](https://hindsight.vectorize.io/blog/2026/06/05/mental-models-deep-dive)
