---
sidebar_position: 5
title: "使用 Hindsight 为 Vercel Chat SDK 提供持久记忆 | 集成"
description: "为 Vercel Chat SDK 机器人提供跨 Slack、Discord、Teams 等平台、按用户隔离的持久记忆。只需包装一个处理函数，无需编写自定义连接代码。"
---

# Vercel Chat SDK

我们构建了 `@vectorize-io/hindsight-chat`，只需包装一个处理函数，就能为 [Vercel Chat SDK](https://github.com/vercel/chat) 机器人提供按用户隔离的持久记忆。该集成适用于 Slack、Discord、Teams、Google Chat、GitHub 和 Linear，无需编写自定义连接代码。

[查看更新日志 →](/changelog/integrations/chat)

## 设置 {#setup}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)，立即获取 API 密钥，无需自行运行基础设施。若要自托管，请参阅[安装指南](/developer/installation)。
:::

## 安装 {#installation}

```bash
npm install @vectorize-io/hindsight-chat
```

## 快速入门 {#quick-start}

```typescript
import { Chat } from 'chat';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { withHindsightChat } from '@vectorize-io/hindsight-chat';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const chat = new Chat({ connectors: [/* 你的连接器 */] });
const hindsight = new HindsightClient({ apiKey: process.env.HINDSIGHT_API_KEY });

chat.onNewMention(
  withHindsightChat(
    {
      client: hindsight,
      bankId: (msg) => msg.author.userId, // 按用户隔离记忆
    },
    async (thread, message, ctx) => {
      await thread.subscribe();

      const result = await streamText({
        model: openai('gpt-4o'),
        system: ctx.memoriesAsSystemPrompt(),
        messages: [{ role: 'user', content: message.text }],
      });

      // 流式输出响应
      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }
      const fullResponse = chunks.join('');
      await thread.post(fullResponse);

      // 将对话存入记忆
      await ctx.retain(
        `User: ${message.text}\nAssistant: ${fullResponse}`
      );
    }
  )
);
```

## 配置 {#configuration}

### `withHindsightChat(options, handler)`

`withHindsightChat` 会包装现有的 Chat SDK 处理函数，并自动注入记忆上下文。它会返回标准处理函数 `(thread, message) => Promise<void>`，因此无需更改处理函数签名即可直接使用。

#### 选项 {#options}

| 选项 | 类型 | 默认值 | 说明 |
|--------|------|---------|-------------|
| `client` | `HindsightClient` | *必需* | Hindsight 客户端实例 |
| `bankId` | `string \| (msg) => string` | *必需* | 记忆库 ID 或解析函数 |
| `recall.enabled` | `boolean` | `true` | 在处理函数运行前自动召回记忆 |
| `recall.budget` | `'low' \| 'mid' \| 'high'` | `'mid'` | 召回的处理预算 |
| `recall.maxTokens` | `number` | API 默认值 | 召回结果的最大 token 数 |
| `recall.types` | `FactType[]` | 全部 | 仅包含指定事实类型 |
| `recall.includeEntities` | `boolean` | `true` | 包含实体观测 |
| `retain.enabled` | `boolean` | `false` | 自动存入收到的消息 |
| `retain.async` | `boolean` | `true` | 发起存入后不等待结果 |
| `retain.tags` | `string[]` | – | 存入记忆时使用的标签 |
| `retain.metadata` | `Record<string, string>` | – | 存入记忆时使用的元数据 |

### 上下文（`ctx`） {#context-ctx}

传给 `withHindsightChat` 的回调会额外收到第三个参数 `ctx`，其中提供作用于当前用户记忆库的完整 Hindsight 记忆 API：

| 属性/方法 | 说明 |
|----------------|-------------|
| `ctx.bankId` | 解析后的记忆库 ID |
| `ctx.memories` | 召回的记忆数组 |
| `ctx.entities` | 实体观测（或 null） |
| `ctx.memoriesAsSystemPrompt(options?)` | 将记忆整理为 LLM 系统提示词 |
| `ctx.retain(content, options?)` | 将内容存入记忆 |
| `ctx.recall(query, options?)` | 搜索记忆 |
| `ctx.reflect(query, options?)` | 基于记忆推理 |

## 示例 {#examples}

### 订阅消息处理函数 {#subscribed-message-handler}

```typescript
chat.onSubscribedMessage(
  withHindsightChat(
    {
      client: hindsight,
      bankId: (msg) => msg.author.userId,
      recall: { budget: 'high', maxTokens: 1000 },
    },
    async (thread, message, ctx) => {
      const result = await generateText({
        model: openai('gpt-4o'),
        system: ctx.memoriesAsSystemPrompt(),
        messages: [{ role: 'user', content: message.text }],
      });
      await thread.post(result.text);
    }
  )
);
```

### 自动存入收到的消息 {#auto-retain-inbound-messages}

```typescript
chat.onNewMention(
  withHindsightChat(
    {
      client: hindsight,
      bankId: (msg) => msg.author.userId,
      retain: { enabled: true, tags: ['slack', 'inbound'] },
    },
    async (thread, message, ctx) => {
      // 收到的消息已自动存入记忆
      const result = await generateText({
        model: openai('gpt-4o'),
        system: ctx.memoriesAsSystemPrompt(),
        messages: [{ role: 'user', content: message.text }],
      });
      await thread.post(result.text);

      // 将助手的响应单独存入记忆
      await ctx.retain(`Assistant: ${result.text}`, {
        tags: ['slack', 'outbound'],
      });
    }
  )
);
```

### 固定记忆库 ID（共享记忆） {#static-bank-id-shared-memory}

```typescript
// 所有用户共享同一个记忆库
chat.onNewMention(
  withHindsightChat(
    { client: hindsight, bankId: 'shared-team-memory' },
    async (thread, message, ctx) => {
      // ...
    }
  )
);
```

## 错误处理 {#error-handling}

此集成经过设计，即使记忆功能发生故障，也不会中断机器人。自动召回和自动存入遇到的错误会在内部捕获并记录为警告，处理函数随后会在记忆为空的情况下继续运行。手动调用 `ctx.retain()`、`ctx.recall()` 和 `ctx.reflect()` 时，错误会照常向上传递，供你按需处理。
