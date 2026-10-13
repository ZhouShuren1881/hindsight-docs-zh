---
sidebar_position: 38
title: "Eve 智能体记忆与 Hindsight |整合"
description: "通过Hindsight的记忆提供者为VercelEve智能体添加长期记忆。每回合之前进行范围记忆识别，之后自动捕获——无需模型工具调用。"
---

# Eve {#eve}

的长期记忆 [Vercel Eve](https://eve.dev)智能体使用[Hindsight](https://vectorize.io/hindsight)。 `@vectorize-io/hindsight-eve` 包是一个提供者Eve的[记忆槽位](https://eve.dev/docs/memory)：每次轮流之前都会在实时用户消息中调用相关记忆，之后捕获每次交换，并且每个范围（用户、租户、通道）都有自己的隔离Hindsight记忆库 — **无需模型主动选择调用工具。**

[查看更新日志 →](/changelog/integrations/eve)

## 工作原理 {#how-it-works}

Eve 解析并锁定每个回合的范围，然后在固定点调用提供者：

|相位|Hindsight 的作用|
| ---------------- | -------------------------------------------------------------------------------------------------- |
|`turn.started`|回忆与用户消息相关的记忆并将其置于上下文中，归因于插槽|
|`turn.completed`|保留用户消息和助手的最终回复（根据Eve操作id幂等）|
|工具|暴露`<slot>__reflect`，因此模型可以在需要时提出长期记忆问题|

每次读取和写入都由锁定的范围键进行分区：每个范围一个Hindsight记忆库，在第一次使用时自动创建。两个房客永远看不到对方的记忆。

## 安装 {#install}

```bash
npm install @vectorize-io/hindsight-eve
```

`eve` (>= 0.45.1) 是您在Eve项目。

## 快速入门 {#quick-start}

创建一个文件：

```ts
// agent/memory/hindsight.ts
import { hindsightMemory } from "@vectorize-io/hindsight-eve";
import { defineMemory } from "eve/memory";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description: "关于当前用户的长期记忆。",
  provider: hindsightMemory(),
  scope: byPrincipal,
});
```

提供者从环境中读取其连接：

|环境变量|目的|
| ------------------- | ------------------------------------------------------------------------ |
|`HINDSIGHT_API_KEY`|不记名令牌作为 发送 `Authorization: Bearer <key>`|
|`HINDSIGHT_API_URL`|Hindsight REST 基础（默认为 Hindsight Cloud）|
|`HINDSIGHT_BANK_ID`|_可选._ 将每个范围固定到一个共享记忆库（仅限单用户智能体）|

### Hindsight Cloud {#hindsight-cloud}

套装`HINDSIGHT_API_KEY` 来自你的 [Hindsight Cloud](https://hindsight.vectorize.io)仪表板。 `HINDSIGHT_API_URL` 默认为 `https://api.hindsight.vectorize.io`，所以不需要 URL。

### 自托管 {#self-hosted}

```ts
//没有授权的本地服务器：
provider: hindsightMemory({ apiUrl: "http://localhost:8000", apiKey: null }),
```

## 范围 → 记忆库 {#scope--bank}

`scope` 是Eve的 — `byPrincipal` 为每个经过身份验证的呼叫者提供自己的记忆；自定义解析器可以按租户、通道或受信任会话元数据中的任何其他内容确定范围（请参阅[Eve 记忆文档](https://eve.dev/docs/memory)）。Hindsight将每个锁定范围映射到记忆库：

- **默认：** 记忆库是范围键（`memscope1_…`)，不透明的摘要Eve源自命名空间和作用域。隔离是自动的。
- **自定义：** 传入解析器自行命名记忆库，例如 `` bankId: (scope) => `eve-${scope.value}` ``，让 Hindsight 仪表板中的记忆库名称更易读。
- **共享：** 字符串 `bankId`（或`HINDSIGHT_BANK_ID`）将每个范围固定到一个记忆库。仅对单用户智能体执行此操作 - 它会禁用每个范围的隔离。

## 选项 {#options}

```ts
hindsightMemory({
  apiUrl, // REST 基础地址，默认先使用 HINDSIGHT_API_URL，再使用云端
  apiKey, // Bearer 令牌；null = 不进行身份验证（本地开发）
  bankId, // string | (scope) => string — see "Scope → bank"
  budget, //“低”| “中”| “high” - 记忆再现结果预算（默认“mid”）
  maxTokens, //记忆召回token 预算（默认1024）
  recallQuery, //当回合没有用户文本时查询（默认：广泛的个人资料查询）
  context, //`context` 写在保留项目上的标签（默认“eve”）
  includeAssistantReply, //也是记忆存储助手的回复（默认 true）
  capture, //每回合记忆存储（默认 true；false = 仅记忆召回）
  tools, //暴露`reflect`工具（默认true）
  timeoutMs, //HTTP 超时（默认 15000）
  onError, // (err, phase) => void，失败时静默降级（默认 console.warn）
});
```

## 注释 {#notes}

- 记忆召回永远不会失败：aHindsight通过报错 `onError` 转弯时没有记忆。捕获异步运行并且永远不会阻止回复。
- 每一回合的记忆召回都是一条具有稳定id的消息，所以**取代** 上一回合的区块，而不是堆积在会话历史记录中——包括压缩之后。
- 捕获的关键帧为Eve的`operationId`；重播的捕获会替换较早的文档，而不是将其存储两次。

## 已知问题：Eve 0.51.0–0.68.x 中的捕获功能 {#known-issue-capture-on-eve-0510--068x}

eve 0.51.0 停止将回合历史记录传递给 `turn.completed`（从回归
[vercel/eve#2690](https://github.com/vercel/eve/pull/2690))，所以**没有提供商的
`capture["turn.completed"]` 在这些版本上运行** — 记忆被回忆起来，但没有什么新东西
已存储。追踪于 [vercel/eve#3223](https://github.com/vercel/eve/issues/3223) 并由
[vercel/eve#3985](https://github.com/vercel/eve/pull/3985)，在 0.69.0 前夕发布 — 升级
到它。 记忆召回，`reflect`工具和压缩捕获不受影响。在一个较旧的夜晚，要么
针`eve@0.50.0`，或保留
已弃用 `hindsightRetainHook()` `agent/hooks/hindsight.ts` 提供者旁边 — 夏娃的钩子
事件仍然触发 - 给出相同的字符串`bankId` 所以他们共享一个记忆库。

## 验证 {#verify}

运行你的智能体。在一次会话中告诉它一个持久的偏好（“每当你给我写代码时，使用Python有完整的类型提示，没有注释”）。开始一个**最新** 作为同一用户进行会话并要求某些内容 - 智能体应用记住的偏好，因为记忆是在模型运行之前调用的，无需调用任何工具。

## 从 0.2 迁移 {#migrating-from-02}

0.2 通过两个编写的文件进行有线记忆（`agent/instructions/hindsight.ts` 与 `hindsightMemory()` 和 `agent/hooks/hindsight.ts` 与 `hindsightRetainHook()`), 之前Eve签订了记忆提供者合同。将两者替换为单个 `agent/memory/hindsight.ts` 上面。旧的入口点仍然作为 `hindsightAutoRecall()` 和 `hindsightRetainHook()`（已弃用，在下一版本中删除）； `hindsightMemory()` 现在返回提供者。

发生了什么变化：记忆召回使用实时用户消息而不是固定的广泛查询，记忆是按范围隔离的，而不是每个人都有一个记忆库，并且召回的上下文作为槽属性消息而不是系统指令到达。

## 链接 {#links}

- [Hindsight 文档](https://hindsight.vectorize.io)
- [Eve 记忆](https://eve.dev/docs/memory)·[构建记忆提供程序](https://github.com/vercel/eve/blob/main/docs/memory/custom-provider.md)
