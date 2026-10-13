---
title: "指南：使用 Hindsight 为 elizaOS 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, eliza, agents, memory]
description: "使用 @vectorize-io/hindsight-eliza 插件在模型前召回、每轮后存储。"
image: /img/guides/guide-eliza-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 elizaOS 添加记忆](/img/guides/guide-eliza-memory-with-hindsight.svg)

插件加入角色列表，注册提示前召回提供商和轮次后存储评估器，跨对话保留。

框架原生提供商/评估器，HINDSIGHT_MEMORY 组装提示、HINDSIGHT_RETAIN 持久保存，默认开启、叠加现有记忆、故障不阻塞。

本指南介绍安装、客户端、按用户和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client`.
> 2. 用密钥创建客户端。
> 3. createHindsightPlugin 构建。
> 4. 加入角色 plugins，默认按用户。
> 5. 验证后续轮次。

## 前提条件 {#prerequisites}

开始前确认：

- @elizaos/core ^1.7.2，peer 依赖。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 客户端可用密钥或本地 URL。

## 步骤 1：安装插件 {#step-1-install-the-plugin}

与客户端一起安装。

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

目标 peer ^1.7.2，装入已有项目。

## 步骤 2：创建并添加 {#step-2-create-the-plugin-and-add-it-to-your-character}

客户端创建后加列表：

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
    // ...其他插件
    hindsightPlugin,
  ],
};
```

这就是全部，两组件默认开启。

## 步骤 3：可选调优 {#step-3-tune-recall-and-retain-optional}

以下是选项及默认：

```ts
createHindsightPlugin({
  client,

  // 读写库。字符串固定共享，
  // 函数按消息生成。默认
  // message.entityId，即每用户一库。
  bank: (message) => message.entityId,

  recall: {
    enabled: true,            // false 禁用召回
    budget: "mid",            // low/mid/high，延迟与深度
    types: ["world", "experience"], // 限定事实类型
    maxTokens: 1000,          // 召回 token 上限
    includeEntities: false,   // 包含实体观察
    heading: "# 相关长期记忆", // 提示词标题
  },

  retain: {
    enabled: true,            // false 禁用存储
    async: true,              // 发出即返回，不加轮次延迟
    tags: ["source:eliza"],   // 每条存储标签
    metadata: { env: "prod" },
    includeAgentMessages: false, // 同时保存智能体回复
  },
});
```

单侧可关闭另一侧，也可直接创建提供商和评估器自行插件接入。

## 插件如何使用 {#how-the-plugin-uses-memory}

两个原生接点：

- **召回**：组装提示前查询当前消息，在配置标题下注入。
- **存储**：处理后保存消息，可选智能体回复。

默认异步发出即返回，无轮次延迟。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 按用户记忆库 {#per-user-memory-banks}

默认消息 entityId 作库，每用户隔离。

固定 bank 字符串共享，或函数按消息，完整见[文档](/sdks/integrations/eliza)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 带插件运行。
2. 告知具体内容。
3. 完成轮次存储。
4. 后续询问。

例如：

- 首轮告知语言偏好。
- 后续询问。

呈现此前即有效。

## 常见错误 {#common-mistakes}

### 忘记客户端依赖 {#forgetting-the-client-dependency}

安装导入客户端并传实例。

### 未加入角色 {#not-adding-the-plugin-to-the-character}

仅构建无效，必须 plugins 列表。

### 过早测试 {#testing-retain-too-early}

处理中未存，异步后台。

### 假定用户共享 {#assuming-memory-is-shared-across-users}

默认 entityId 隔离，固定 bank 才共享。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，客户端指自托管。

### 可只召回或存储？ {#can-i-run-only-recall-or-only-retain}

可关闭开关或自行组装。

### 如何限定？ {#how-is-memory-scoped}

默认用户，字符串或函数变更。

### 拖慢吗？ {#does-it-slow-down-my-agent}

不会，故障安全、默认异步不阻塞延迟。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [elizaOS 集成文档](/sdks/integrations/eliza)。
