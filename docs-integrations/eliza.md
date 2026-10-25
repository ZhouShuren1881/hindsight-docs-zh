---
title: "使用 Hindsight 为 elizaOS 提供长期记忆 | 集成"
description: "为 elizaOS 智能体提供持久的长期记忆。Hindsight 插件会在每次模型调用前将相关记忆召回到提示词中，并在每轮对话后将对话内容存入 Hindsight。"
---

# elizaOS {#elizaos}

`@vectorize-io/hindsight-eliza` 软件包为 [elizaOS](https://github.com/elizaOS/eliza) 智能体提供由 [Hindsight](/) 支持的长期记忆。

它会为智能体注册两个组件：

- **提供器**（`HINDSIGHT_MEMORY`）：在每次模型调用前召回相关记忆，并将其注入提示词。
- **评估器**（`HINDSIGHT_RETAIN`）：在每轮对话后将对话消息存入 Hindsight。

这两个组件默认启用，在 elizaOS 现有记忆的基础上工作，并采用故障安全设计：记忆服务偶尔发生故障也不会阻止智能体作答。

[查看更新日志 →](/changelog/integrations/eliza)

## 安装 {#installation}

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

此软件包面向 `@elizaos/core` `^1.7.2`（声明为对等依赖）。

## 使用方法 {#usage}

创建插件并将其添加到角色的插件列表中：

```ts
import { createHindsightPlugin } from "@vectorize-io/hindsight-eliza";
import { Hindsight } from "@vectorize-io/hindsight-client";

const hindsightPlugin = createHindsightPlugin({
  client: new Hindsight({ apiKey: process.env.HINDSIGHT_API_KEY }),
  recall: { budget: "high", includeEntities: true },
  retain: { tags: ["source:eliza"] },
});

export const character = {
  name: "Ada",
  plugins: [
    // ...你的其他插件
    hindsightPlugin,
  ],
};
```

默认情况下，每条智能体消息都会存入一个记忆库，该记忆库以消息的 `entityId` 为键，从而为每位用户提供相互隔离的记忆存储。

## 配置 {#configuration}

```ts
createHindsightPlugin({
  client,

  // 要读写的记忆库。字符串表示所有消息共用一个固定记忆库；函数则按每条消息
  // 派生记忆库。默认使用 `message.entityId`（每位用户一个记忆库）。
  bank: (message) => message.entityId,

  recall: {
    enabled: true,            // 设为 false 可禁用记忆召回
    budget: "mid",            // "low" | "mid" | "high" — 在延迟与检索深度之间取舍
    types: ["world", "experience"], // 限定事实类型
    maxTokens: 1000,          // 限制召回内容的 token 数
    includeEntities: false,   // 是否包含实体观测
    heading: "# Relevant long-term memories", // 提示词中的标题
  },

  retain: {
    enabled: true,            // 设为 false 可禁用记忆存入
    async: true,              // 即发即忘，不增加每轮对话的延迟
    tags: ["source:eliza"],   // 添加到每条存入记忆的标签
    metadata: { env: "prod" },
    includeAgentMessages: false, // 是否也存入智能体自己的回复
  },
});
```

### 仅使用 Recall 或仅使用 Retain {#using-only-recall-or-only-retain}

将 `recall.enabled: false` 或 `retain.enabled: false` 设为禁用，即可关闭其中一侧。你也可以直接创建组件 `createHindsightProvider` 和 `createHindsightEvaluator`，以便自行将它们接入插件。

## 工作原理 {#how-it-works}

| 组件 | elizaOS 接入点 | 运行时机 | 作用 |
| --- | --- | --- | --- |
| `HINDSIGHT_MEMORY` | 提供器 | 组合提示词期间、模型调用之前 | 使用收到的消息调用 Hindsight `recall`，并将结果注入上下文 |
| `HINDSIGHT_RETAIN` | 评估器 | 智能体处理完本轮对话之后 | 调用 Hindsight `retain` 存入消息（也可选择存入智能体的回复） |
