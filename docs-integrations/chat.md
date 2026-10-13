---
sidebar_position: 5
title: "使用 Hindsight 为 Vercel Chat SDK 添加持久记忆 | 集成"
description: "为 Vercel Chat SDK 机器人提供跨 Slack、Discord、Teams 等平台的用户独立持久记忆。只需包装一个处理函数，无需自定义底层连接。"
---

# Vercel Chat SDK

我们构建了 `@vectorize-io/hindsight-chat`，只需包装一个处理函数，就能为 [Vercel Chat SDK](https://github.com/vercel/chat) 机器人提供按用户隔离的持久记忆。该集成适用于 Slack、Discord、Teams、Google Chat、GitHub 和 Linear，无需自定义底层连接。

[查看更新日志 →](/changelog/integrations/chat)

## 设置 {#setup}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)，立即获取 API 密钥，无需运行基础设施。自托管请参见[安装指南](/developer/installation)。
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
      bankId: (msg) => msg.author.userId, // 按用户隔离的记忆
    },
    async (thread, message, ctx) => {
      await thread.subscribe();

      const result = await streamText({
        model: openai('gpt-4o'),
        system: ctx.memoriesAsSystemPrompt(),
        messages: [{ role: 'user', content: message.text }],
      });

      // 流式输出回答
      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }
      const fullResponse = chunks.join('');
      await thread.post(fullResponse);

      // 将对话存储到记忆中
      await ctx.retain(
        `用户：${message.text}\n助手：${fullResponse}`
      );
    }
  )
);
```

## 配置 {#configuration}

### `withHindsightChat(options, handler)`

`withHindsightChat` 包装现有 Chat SDK 处理函数并自动注入记忆上下文。它返回标准处理函数 `(thread, message) => Promise<void>`，无需修改处理函数签名即可直接使用。

#### 选项 {#options}

| 选项 | 类型 | 默认值 | 说明 |
|--------|------|---------|-------------|
| `client` | `HindsightClient` | *必需* | Hindsight 客户端实例 |
| `bankId` | `string \| (msg) => string` | *必需* | 记忆库 ID 或解析函数 |
| `recall.enabled` | `boolean` | `true` | 处理函数执行前自动召回记忆 |
| `recall.budget` | `'low' \| 'mid' \| 'high'` | `'mid'` | 记忆召回的处理预算 |
| `recall.maxTokens` | `number` | API 默认值 | 召回结果的最大 token 数 |
| `recall.types` | `FactType[]` | 全部 | 过滤为指定事实类型 |
| `recall.includeEntities` | `boolean` | `true` | 包含实体观察 |
| `retain.enabled` | `boolean` | `false` | 自动存储收到的消息 |
| `retain.async` | `boolean` | `true` | 发起后无需等待的记忆存储 |
| `retain.tags` | `string[]` | – | 已存储记忆的标签 |
| `retain.metadata` | `Record<string, string>` | – | 已存储记忆的元数据 |

### 上下文（`ctx`） {#context-ctx}

我们向处理函数注入第三个参数 `ctx`，提供作用于当前用户记忆库的完整 Hindsight 记忆 API：

| 属性/方法 | 说明 |
|----------------|-------------|
| `ctx.bankId` | 解析后的记忆库 ID |
| `ctx.memories` | 已召回记忆的数组 |
| `ctx.entities` | 实体观察（或 null） |
| `ctx.memoriesAsSystemPrompt(options?)` | 将记忆格式化为 LLM 系统提示词 |
| `ctx.retain(content, options?)` | 将内容存储到记忆中 |
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

### 自动存储收到的消息 {#auto-retain-inbound-messages}

```typescript
chat.onNewMention(
  withHindsightChat(
    {
      client: hindsight,
      bankId: (msg) => msg.author.userId,
      retain: { enabled: true, tags: ['slack', 'inbound'] },
    },
    async (thread, message, ctx) => {
      // 收到的消息已经在自动存储
      const result = await generateText({
        model: openai('gpt-4o'),
        system: ctx.memoriesAsSystemPrompt(),
        messages: [{ role: 'user', content: message.text }],
      });
      await thread.post(result.text);

      // 单独存储助手回答
      await ctx.retain(`助手：${result.text}`, {
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

我们设计此集成时确保记忆故障不会中断机器人。自动召回和自动存储错误会在内部被捕获并记录为警告，处理函数会使用空记忆继续执行。手动调用 `ctx.retain()`、`ctx.recall()` 和 `ctx.reflect()` 时，错误会正常向上传递，方便按需处理。
