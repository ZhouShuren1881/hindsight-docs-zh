---
sidebar_position: 38
title: "使用 Hindsight 为 Eve 智能体提供记忆 | 集成"
description: "通过 Hindsight 的记忆提供者，为 Vercel Eve 智能体添加长期记忆。每回合开始前按范围召回相关记忆，回合结束后自动记录；无需模型调用工具。"
---

# Eve {#eve}

借助 [Hindsight](https://vectorize.io/hindsight)，为 [Vercel Eve](https://eve.dev) 智能体提供长期记忆。`@vectorize-io/hindsight-eve` 包是 Eve [记忆槽位](https://eve.dev/docs/memory)的一个提供者：每回合开始前，它会根据当前用户消息召回相关记忆；每次交互结束后，它会记录对话。用户、租户和频道等每个范围都有各自独立的 Hindsight 记忆库，**模型始终不需要自行选择调用工具。**

[查看更新日志 →](/changelog/integrations/eve)

## 工作原理 {#how-it-works}

Eve 会为每个回合解析并锁定一个范围，然后在固定时机调用提供者：

| 阶段 | Hindsight 的操作 |
| --- | --- |
| `turn.started` | 召回与用户消息相关的记忆，并将其放入上下文，注明它们来自哪个槽位。 |
| `turn.completed` | 执行 Retain（存入），保存用户消息和助手的最终回复（按 Eve 操作 ID 保证幂等）。 |
| 工具 | 暴露 Reflect（反思）工具 `<slot>__reflect`，让模型在需要时可以向长期记忆提问。 |

每次读取和写入都会按已锁定的范围键分区：每个范围对应一个 Hindsight 记忆库，并在首次使用时自动创建。不同租户绝不会看到彼此的记忆。

## 安装 {#install}

```bash
npm install @vectorize-io/hindsight-eve
```

`eve`（版本需为 `>= 0.45.1`）是对等依赖项；Eve 项目中通常已经安装了它。

## 快速开始 {#quick-start}

创建一个文件：

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

提供者会从环境变量读取连接信息：

| 环境变量 | 用途 |
| --- | --- |
| `HINDSIGHT_API_KEY` | 作为 Bearer 令牌，通过 `Authorization: Bearer <key>` 发送。 |
| `HINDSIGHT_API_URL` | Hindsight REST API 的基础 URL；默认指向 Hindsight Cloud。 |
| `HINDSIGHT_BANK_ID` | _可选。_ 将所有范围固定到同一个记忆库（仅适用于单用户智能体）。 |

### Hindsight Cloud {#hindsight-cloud}

从 [Hindsight Cloud](https://hindsight.vectorize.io) 控制台获取 `HINDSIGHT_API_KEY`。`HINDSIGHT_API_URL` 默认是 `https://api.hindsight.vectorize.io`，因此无需设置 URL。

### 自托管 {#self-hosted}

```ts
// 不启用身份验证的本地服务器：
provider: hindsightMemory({ apiUrl: "http://localhost:8000", apiKey: null }),
```

## 范围 → 记忆库 {#scope--bank}

`scope` 属于 Eve：`byPrincipal` 会为每个通过身份验证的调用者提供独立记忆；自定义解析器则可以根据租户、频道或受信任会话元数据中的其他信息确定范围（参见 [Eve 的记忆文档](https://eve.dev/docs/memory)）。Hindsight 会将每个已锁定的范围映射到一个记忆库：

- **默认：** 记忆库 ID 就是范围键（`memscope1_…`），这是 Eve 根据命名空间和范围生成的不透明摘要。隔离会自动生效。
- **自定义：** 传入解析器，自行命名记忆库。例如，使用 `` bankId: (scope) => `eve-${scope.value}` ``，即可在 Hindsight 控制台中使用便于阅读的记忆库名称。
- **共享：** 使用字符串 `bankId`（或 `HINDSIGHT_BANK_ID`）将所有范围固定到同一个记忆库。仅适用于单用户智能体；这样会关闭按范围隔离。

## 选项 {#options}

```ts
hindsightMemory({
  apiUrl, // REST API 基础 URL；默认依次使用 HINDSIGHT_API_URL 和 Cloud
  apiKey, // Bearer 令牌；null = 不进行身份验证（本地开发）
  bankId, // string | (scope) => string — 参见“范围 → 记忆库”
  budget, // "low" | "mid" | "high" — 召回结果预算（默认 "mid"）
  maxTokens, // 召回的 token 预算（默认 1024）
  recallQuery, // 回合没有用户文本时使用的查询（默认：宽泛的个人资料查询）
  context, // 写入所存内容的 `context` 标签（默认 "eve"）
  includeAssistantReply, // 是否也记录助手的回复（默认 true）
  capture, // 是否记录每个回合（默认 true；false = 仅召回）
  tools, // 是否暴露 `reflect` 工具（默认 true）
  timeoutMs, // HTTP 超时时间（默认 15000）
  onError, // (err, phase) => void — 出错时静默降级（默认 console.warn）
});
```

## 注意事项 {#notes}

- Recall（召回）不会导致回合失败：Hindsight 出错时会通过 `onError` 报告错误，回合会在没有记忆的情况下继续运行。记录操作异步执行，不会阻塞回复。
- 每回合的 Recall 都是一条带稳定 ID 的消息，因此它会**替换**上一回合的内容，而不会不断堆积在会话历史中；上下文压缩后也一样。
- 记录操作使用 Eve 的 `operationId` 作为键；重放记录操作时，会替换先前的文档，而不会重复存储。

## 已知问题：Eve 0.51.0–0.68.x 中的记录行为 {#known-issue-capture-on-eve-0510--068x}

Eve 0.51.0 不再向 `turn.completed` 传递该回合的历史记录（这是相对于 [vercel/eve#2690](https://github.com/vercel/eve/pull/2690) 的一次回归），因此这些版本**不会运行任何提供者的 `capture["turn.completed"]`**：记忆可以召回，但不会存入新内容。该问题记录在 [vercel/eve#3223](https://github.com/vercel/eve/issues/3223)，并已由 [vercel/eve#3985](https://github.com/vercel/eve/pull/3985) 修复；修复随 Eve 0.69.0 发布，请升级到该版本。Recall（召回）、`reflect` 工具和上下文压缩时的记录不受影响。若使用较旧版本的 Eve，可以固定到 `eve@0.50.0`，或者在提供者旁边的 `agent/hooks/hindsight.ts` 中继续使用已弃用的 `hindsightRetainHook()`。Eve 的钩子事件仍会触发；为它和提供者配置相同的字符串 `bankId`，即可让二者共用一个记忆库。

## 验证 {#verify}

运行智能体。在一个会话中告诉它一项值得长期记住的偏好（“Whenever you write me code, use Python with full type hints and no comments”）。以同一用户开启一个**新会话**并提出一个请求。智能体会应用记住的偏好，因为模型运行前就已召回记忆，无需调用工具。

## 从 0.2 迁移 {#migrating-from-02}

在 Eve 提供记忆提供者接口之前，0.2 版本通过两个由用户编写的文件接入记忆：`agent/instructions/hindsight.ts` 中的 `hindsightMemory()`，以及 `agent/hooks/hindsight.ts` 中的 `hindsightRetainHook()`。请将二者替换为上文的单个文件 `agent/memory/hindsight.ts`。旧入口仍以 `hindsightAutoRecall()` 和 `hindsightRetainHook()` 的形式提供，但已弃用，并会在下一个版本中移除；现在 `hindsightMemory()` 会返回提供者。

变化包括：Recall 改为使用当前用户消息，而不是固定的宽泛查询；记忆改为按范围隔离，而不是所有人共用一个记忆库；召回的上下文改为作为注明槽位来源的消息传入，而不是作为系统指令传入。

## 链接 {#links}

- [Hindsight 文档](/)
- [Eve 记忆文档](https://eve.dev/docs/memory) · [构建记忆提供者](https://github.com/vercel/eve/blob/main/docs/memory/custom-provider.md)
