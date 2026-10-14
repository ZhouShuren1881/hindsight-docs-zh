---
title: "指南：使用 Hindsight 为 elizaOS 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, eliza, agents, memory]
description: "使用 @vectorize-io/hindsight-eliza 插件为 elizaOS 添加记忆：每次调用模型前召回相关记忆，并在每轮对话后存入对话内容。"
image: /img/guides/guide-eliza-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 elizaOS 添加记忆](/img/guides/guide-eliza-memory-with-hindsight.svg)

如果你想为 elizaOS 添加 Hindsight 记忆，最直接的做法是使用 `@vectorize-io/hindsight-eliza` 插件。把它加入角色的插件列表后，它会在智能体上注册两个组件：一个提供程序会在每次调用模型前，将相关记忆召回并加入提示词；一个评估器会在每轮对话后存入对话消息。这样，elizaOS 智能体就能在不同对话间保留长期记忆，而不会在每轮之后忘记所有内容。

elizaOS 很适合这种集成，因为框架本身就提供了提供程序和评估器的接入点。该插件会同时接入两者：`HINDSIGHT_MEMORY` 在组合提示词时运行，以注入召回的记忆；`HINDSIGHT_RETAIN` 在每轮结束后运行，以持久保存对话内容。两者默认启用，并叠加在 elizaOS 现有记忆功能之上；即使 Hindsight 服务中断，也不会阻止智能体作出响应。

本指南将介绍如何安装插件、接入 Hindsight 客户端、理解按用户划分记忆库的策略，以及如何快速验证记忆确实在使用。操作时可以同时查看[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client`。
> 2. 使用 `HINDSIGHT_API_KEY` 创建 `Hindsight` 客户端。
> 3. 使用 `createHindsightPlugin({ client, ... })` 构建插件。
> 4. 将插件加入角色的 `plugins` 列表；默认情况下，每位用户使用一个记忆库。
> 5. 验证后续轮次能否记起此前存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 使用 `@elizaos/core` `^1.7.2` 的 elizaOS 智能体（该插件将其声明为对等依赖）
- 可访问的 Hindsight 后端，可以是 [Hindsight Cloud](https://hindsight.vectorize.io)，也可以是自托管服务器
- 客户端可用的 Hindsight API 密钥，或自托管服务器的基础 URL

## 步骤 1：安装插件 {#step-1-install-the-plugin}

将该插件与 Hindsight 客户端一起安装。

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

该软件包将 `@elizaos/core` `^1.7.2` 声明为对等依赖，因此应将它安装到现有的 elizaOS 项目中。

## 步骤 2：创建插件并添加到角色中 {#step-2-create-the-plugin-and-add-it-to-your-character}

使用 Hindsight 客户端创建插件，并将其加入角色的 `plugins` 列表：

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

配置到这里就完成了。召回提供程序和存入评估器默认都已启用，因此智能体运行后就会开始召回和存入记忆。

## 步骤 3：调整召回和存入选项（可选） {#step-3-tune-recall-and-retain-optional}

插件为两侧都提供了选项。以下是文档列出的选项及其默认值：

```ts
createHindsightPlugin({
  client,

  // 要读写的记忆库。字符串表示所有消息使用同一个固定记忆库；
  // 函数则按每条消息派生记忆库。默认值为
  // `message.entityId`（每位用户一个记忆库）。
  bank: (message) => message.entityId,

  recall: {
    enabled: true,            // 设为 false 可禁用召回
    budget: "mid",            // "low" | "mid" | "high" — 在延迟与检索深度之间取舍
    types: ["world", "experience"], // 限定事实类型
    maxTokens: 1000,          // 召回内容的 token 上限
    includeEntities: false,   // 包含实体观测
    heading: "# Relevant long-term memories", // 提示词中的标题
  },

  retain: {
    enabled: true,            // 设为 false 可禁用存入
    async: true,              // 发出后即返回；不会增加轮次延迟
    tags: ["source:eliza"],   // 添加到每条存入记忆的标签
    metadata: { env: "prod" },
    includeAgentMessages: false, // 同时存入智能体自己的回复
  },
});
```

如果只想启用其中一侧，可以将 `recall.enabled: false` 或 `retain.enabled: false` 关闭。你也可以直接使用 `createHindsightProvider` 和 `createHindsightEvaluator` 构建组件，再自行将它们接入插件。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

elizaOS 提供了提供程序和评估器两个接入点，插件会同时使用它们：

- **Recall（召回，调用前）：** `HINDSIGHT_MEMORY` 提供程序在组合提示词时、调用模型之前运行。它会使用收到的消息调用 Hindsight `recall`，并将结果按配置的标题注入上下文。
- **Retain（存入，调用后）：** 智能体处理完本轮后，`HINDSIGHT_RETAIN` 评估器会运行。它调用 Hindsight `retain` 来持久保存消息；如果设置了 `includeAgentMessages`，也可以存入智能体自己的回复。

默认情况下，`retain.async` 为开启状态，存入操作会在后台发出后即返回，因此不会增加轮次延迟。

有关更底层的行为，请参阅 [Hindsight 的召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 按用户划分记忆库 {#per-user-memory-banks}

默认情况下，每条智能体消息都会存入一个以消息 `entityId` 为键的记忆库，因此每位用户都有独立的记忆存储。这可以避免一位用户的记忆泄露给其他用户。

如果要采用不同策略，可以将 `bank` 设为固定字符串，让所有消息共用一个记忆库；也可以传入 `(message) => string` 函数，按每条消息派生记忆库。完整选项列表请参阅[集成文档](/sdks/integrations/eliza)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 安装插件并运行智能体。
2. 在一轮对话中告诉智能体一件需要记住的具体事情。
3. 等待本轮结束，让消息完成存入。
4. 在之后的一轮中询问智能体此前告诉它的内容。

例如：

- 第一轮告诉智能体你偏好的编程语言。
- 后续一轮询问你偏好哪种语言。

如果召回的记忆中出现了先前告知的细节，说明配置正在正常工作。

## 常见错误 {#common-mistakes}

### 忘记添加客户端依赖 {#forgetting-the-client-dependency}

插件需要 Hindsight 客户端，因此请安装并导入 `@vectorize-io/hindsight-client`，再将客户端实例作为 `client` 传入。

### 没有将插件加入角色 {#not-adding-the-plugin-to-the-character}

`createHindsightPlugin(...)` 只会构建插件。只有将它加入角色的 `plugins` 列表后才会生效。

### 过早测试存入结果 {#testing-retain-too-early}

消息会在本轮处理完成后存入。如果在轮次中途检查，消息可能尚未存入；而且 `retain.async` 默认开启，存入操作会在后台运行。

### 误以为用户之间共享记忆 {#assuming-memory-is-shared-across-users}

默认情况下，每位用户都有一个以 `entityId` 为键的独立记忆库。这通常符合预期；如果没有设置固定的 `bank`，就不要指望一位用户能召回另一位用户的上下文。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需让 Hindsight 客户端连接到你的服务器，而不是 Hindsight Cloud。

### 可以只运行召回或只运行存入吗？ {#can-i-run-only-recall-or-only-retain}

可以。将 `recall.enabled: false` 或 `retain.enabled: false` 设为 `false` 即可。你也可以使用 `createHindsightProvider` 和 `createHindsightEvaluator` 自行组装插件。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

默认按用户划分，以消息的 `entityId` 作为记忆库。传入 `bank` 字符串或 `(message) => string` 函数即可更改这一设置。

### 这会拖慢智能体吗？ {#does-it-slow-down-my-agent}

不会。两个组件都会安全降级，而且 `retain.async` 默认采用发出后即返回的方式，因此记忆服务出现短暂故障时也不会阻止或延迟响应。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io)开始
- 阅读[完整的 Hindsight 文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的召回 API](/developer/api/recall)
- 查看 [Hindsight 的存入 API](/developer/api/retain)
- 阅读 [elizaOS 集成文档](/sdks/integrations/eliza)
