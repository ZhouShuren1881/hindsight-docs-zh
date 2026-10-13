---
title: "oh-my-pi 如何在 Hindsight 上构建持久代码库记忆"
authors: [benfrank241, can1357]
slug: "2026/06/08/oh-my-pi-hindsight-memory"
date: 2026-06-08T12:00
tags: [hindsight, coding, agents, memory, case-study, oh-my-pi, mental-models, tutorial]
description: "oh-my-pi——一个万星终端编码智能体——使用Hindsight作为其长期记忆后端。以下是集成的演练：记忆库范围界定、心智模型播种和自动记忆存储管道，代码直接来自存储库。"
image: /img/blog/oh-my-pi-hindsight-memory.webp
hide_table_of_contents: true
---

![oh-my-pi 如何在 Hindsight 上构建持久代码库记忆](/img/blog/oh-my-pi-hindsight-memory.webp)

[天哪](https://github.com/can1357/oh-my-pi)（或`omp`）是一个针对终端的TypeScript + Rust 编码智能体——拥有 10,600 多个星星、40 多个提供商、32 个工具——它的目标是连接 IDE，每个工具都针对智能体的性能精心设计。当谈到记忆时，他们信任Hindsight，因为它具有出色的长期记忆召回性能以及底层使用的多方面检索技术。

这也不是一个薄弱的集成：它具有一个构建在Hindsight的API之上的完整记忆子系统——记忆库范围界定、心智模型播种、去抖记忆存储队列、第一轮自动记忆召回。这篇文章介绍了他们如何构建它，代码直接从公共存储库中提取。如果您正在考虑将 Hindsight 作为您自己的编码智能体，那么这是深度集成形状的有用参考。

<!-- truncate -->

## 概览 {#tldr}

- oh-my-pi 将 `retain` / `recall` / `reflect` 公开为由 Hindsight 支持的面向模型的工具，以及模型不必考虑的自动记忆存储 / 自动记忆召回生命周期。
默认情况下
- 记忆是**项目范围**，通过三种模式（`global`、`per-project`、`per-project-tagged`）之一实现，默认模式为`per-project-tagged`。
- A **心智模型层** 在第一次会话启动时播种三个精心策划的由 RH 支持的摘要（`user-preferences`、`project-conventions`、`project-decisions`），并将其缓存的输出拼接到每个提示重建中。
- 他们最初使用`@vectorize-io/hindsight-client`，但一旦他们确定了他们实际需要的API端点，就使用了[内置一个最小的获取客户端](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/client.ts)——无需更改底层合约。

---

## 记忆库范围模型 {#the-bank-scoping-model}

编码智能体必须做出的第一个决定是*什么算作一个用户的记忆*。 oh-my-pi 通过 `hindsight.scoping` 公开了三个答案。从[`bank.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/bank.ts)：

> 三种范围模式（`HindsightConfig.scoping`）：
> - `global` — 单个共享记忆库，没有每个项目的过滤器。
> - `per-project` — 每个 cwd 基本名称一个记忆库，硬隔离。
> - `per-project-tagged` — 单个共享记忆库，保留带有 `project:<name>` 标签和记忆召回过滤器，但仍然显示未标记的（“全局”）记忆。

默认值 - `per-project-tagged` - 是一个有趣的选择。它为整个用户使用一个记忆库，但用它来自的项目标记每个记忆库。然后使用`tagsMatch: "any"`进行回忆过滤，因此智能体可以看到项目范围的记忆**和**用户在全局范围内保留的任何内容（用户偏好、跨项目约定）。这比全局记忆库的隔离性更强，比每个存储库单独的记忆库更不严格，并且正是您想要在项目之间跳转的编码智能体所需要的权衡。

推导是一个小函数：
```ts
export function computeBankScope(config: HindsightConfig, directory: string) {
  const base = baseBankId(config); //“omp”除非被覆盖
  switch (config.scoping) {
    case "global":
      return { bankId: base };
    case "per-project":
      return { bankId: `${base}-${projectLabel(directory)}` };
    case "per-project-tagged": {
      const tag = `${PROJECT_TAG_PREFIX}${projectLabel(directory)}`;
      return { bankId: base, retainTags: [tag], recallTags: [tag], recallTagsMatch: "any" };
    }
  }
}
```

`projectLabel` 只是目录的基本名称，因此在 `~/code/superproject` 中工作会标记所有内容 `project:superproject`。 Hindsight 的 `tags` / `tags_match` 在服务器端完成剩下的工作——没有模式工作，没有每个存储库的记忆库来保持活动。想要硬墙吗？ `per-project`为每个目录提供了自己的记忆库。

---

## 心智模型层 {#the-mental-models-layer}

集成的巧妙部分是**心智模型层**。 Hindsight心智模型是一个命名的、持久的摘要，服务器可以自行保持最新状态，omp 依靠它作为智能体已经了解的有关您和您的项目的低延迟缓存，在每次提示重建时拼接到开发人员指令中，而不是为每次记忆召回往返付费。

种子文件（[`seeds.json`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/seeds.json)）是整个策略：

```json
{
  "seeds": [
    {
      "id": "user-preferences",
      "name": "用户偏好",
      "source_query": "用户在编码风格、工具、沟通和审查方面更喜欢什么？仅捕获跨会话表达的持久偏好，而不是一次性请求。",
      "scopes": ["global", "per-project", "per-project-tagged"],
      "projectTagged": false,
      "max_tokens": 600,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    },
    {
      "id": "project-conventions",
      "name": "项目约定",
      "source_query": "该项目的代码风格、构建、测试、发布和拉取请求审查的约定是什么？仅包含项目中明确的约定（设置、脚本、贡献者文档、在审核中重复执行）。",
      "scopes": ["per-project", "per-project-tagged"],
      "projectTagged": true,
      "max_tokens": 800,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    },
    {
      "id": "project-decisions",
      "name": "项目决策",
      "source_query": "为此项目做出了哪些持久的架构或产品决策，以及记录了哪些理由或权衡？仅包括跨会话稳定的决策；排除临时计划、未解决的想法和活动任务状态。",
      "scopes": ["per-project", "per-project-tagged"],
      "projectTagged": true,
      "max_tokens": 800,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    }
  ]
}
```

该文件中值得注意的三件事：

1. **`trigger.mode = "delta"` + `refresh_after_consolidation = true`。** 这是编码智能体的正确模式 - 心智模型不会在每次集成过程中重新生成，只有当整合器呈现对模型有实质性改变的新内容时。保存便宜，需要时保持新鲜。
2. **`source_query` 是*提示*，而不是关键字过滤器。**Hindsight将其作为对记忆库的回顾，因此LLM会挑选出相关的记忆，而不是进行精确匹配搜索。提示是说“只有持久的偏好”，“只有项目中明确的约定”，“只有跨会议稳定的决策”。
3. **标记纪律。** [`mental-models.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/mental-models.ts) 中的评论警告：

   > Hindsight刷新路径使用与模型标签匹配的`all_strict`标签来过滤源记忆。标记有我们在记忆存储时从未写入的内容的种子将刷新为空。因此，种子标签必须是主动作用域模式的 `retainSession` / `enqueueRetain` 实际附加的标签的子集。

   这是一个深思熟虑的集成细节。 `projectTagged: true`条目的种子会嵌入活动范围的`project:<cwd>`标签。未标记的种子（如`user-preferences`）会读取记忆库中的每个记忆，因为当`tags`为空时，镜子不应用标签过滤器。

​​加载缓存的心智模型块时，它会使用“反反馈”包装器进行渲染，因此LLM将其视为背景知识而不是可执行指令 - 与Hindsight自己的集成用于记忆片段的模式相同。

---

## 记忆存储管道 {#the-retain-pipeline}

oh-my-pi 的记忆存储代码将*工具启动* 保留（模型在回合中调用`retain`）与*自动记忆存储*（在会话结束时刷新整个会话）。面向模型的工具使用去抖批队列：

```ts
const RETAIN_FLUSH_BATCH_SIZE = 16;
const RETAIN_FLUSH_INTERVAL_MS = 5_000;
```

当模型使用一项或多项调用 `retain` 时，它们会排队。当队列达到 16 个项目时，或第一轮后 5 秒后，队列会立即刷新。每次刷新都是针对 `/v1/default/banks/{bank_id}/memories` 和 `async: true` 的单个 `retainBatch(...)` POST，因此智能体不会等待服务器端事实提取。该模型的工具结果是立即的`"<count> memory queued."`——实际的写入是即发即忘的，刷新失败作为会话警告通知而不是异常出现。

自动记忆存储走了一条不同的道路。它构建会话的记录（可通过 `hindsight.retainMode` 配置为 `full-session` 或 `last-turn`）并将其作为一个大型 `retain` 调用发送。默认值 - `full-session` - 让 Hindsight 的事实提取器决定什么值得保留，而不是要求 oh-my-pi 在客户端上进行预先总结。

生命周期配置默认值在[`config.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/config.ts)中可见：

```ts
scoping: "per-project-tagged",
autoRecall: true,
autoRetain: true,
retainMode: "full-session",
retainContext: "omp",
recallBudget: "mid",
```

开箱即用，在指向Hindsight Cloud的全新安装中，您会被标记为每个项目记忆、每个第一回合的自动记忆召回以及会话结束时的自动记忆存储。用户无需配置任何内容即可获得复合效果。

---

## 记忆召回管道 {#the-recall-pipeline}

记忆召回以两种方式公开：作为面向模型的工具（模型使用查询字符串在中间调用`recall`）和作为自动注入步骤（`HindsightSessionState.beforeAgentStartPrompt`在第一个LLM调用之前运行组合查询）。第一个很简单 - `POST /v1/default/banks/{bank_id}/memories/recall` 包含模型的查询、配置的预算、类型和记忆库范围标签过滤器。

自动注射路径就是工作所在。从 `content.ts` 开始，oh-my-pi 在最后几个用户轮次 (`recallContextTurns`) 中组成一个记忆召回查询，将其限制在配置的字符预算 (`recallMaxQueryChars`)，并在记忆召回响应前添加以下前导码：

```text
过去对话的相关记忆（冲突时优先考虑最近的对话）。
仅使用对继续此对话直接有用的记忆；
忽略其余的：
```

这个序言是故意的。 Hindsight 的记忆召回将 *相关* 呈现给查询，而不是 *现在有用*。序言告诉LLM进一步过滤——当新的记忆与旧的记忆相矛盾时，更喜欢新的记忆。 （如果您之前在智能体提示中看到过记忆召回结果，您就会认识到这种模式；Hindsight 文档也使用它。）

`reflect` 工具将其自己的 POST 发送到 `/v1/default/banks/{bank_id}/reflect`，在每个进程首次使用时，尽最大努力 `PUT` 记忆库的 `reflect_mission` / `retain_mission`。与SDK相同的逻辑，只是在他们控制端到端的获取包装器中重写。

---

## 他们为什么重写客户端 {#why-they-rewrote-the-client}

整合于`@vectorize-io/hindsight-client`开始。他们最终将其换成了手动获取客户端。来自`client.ts`中的标题注释：

> 用手动获取调用替换`@vectorize-io/hindsight-client`SDK，因此我们只依赖于我们实际使用的API端点：`retain`、`retainBatch`、`recall`、`reflect`、记忆库+文档管理和批量列表。这里的集中构造保留了一条缝，以便于监视测试。

这对于任何充分投资的集成来说都是正常的——真正的运输产品希望最大限度地减少其依赖面，并完全控制重试、超时和测试接缝。重要的细节是他们没有改变API合约；他们只是直接与相同的端点对话。这是对 API 设计的无声信任投票：它足够干净，可以在内部反对。

---

## 这对于 Hindsight 上的智能体编码意味着什么 {#what-this-means-for-coding-agents-on-hindsight}

退后一步。 oh-my-pi 集成的形状看起来与我们介绍过的其他 Hindsight 支持的编码智能体非常相似（[Hermes](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)、[Claude Code](/blog/2026/03/04/mcp-agent-memory)、[OpenClaw](/blog/2026/05/27/openclaw-codebase-memory)）：

- 接触模型的三种记忆存储/记忆召回/反思工具
- 第一回合自动记忆召回，会话结束自动记忆存储
- 每个项目的记忆库范围（具有不同的风格）
- 低延迟首轮上下文的心智模型式摘要缓存
- 去抖记忆存储队列，因此模型的`retain`调用不会阻塞

这不是巧合。这是用于代码助手的 *有效* 的形状，而 Hindsight 的 API 正是围绕该生命周期设计的。 oh-my-pi 的实现是该模式最详细的公共参考；如果您想提升其中任何一个，上面的文档会直接链接到它们的源文件。

---

## 尝试一下 {#try-it}

oh-my-pi 通过一个命令安装：

```bash
# macOS / Linux
curl -fsSL https://omp.sh/install | sh

# Bun (recommended)
bun install -g @oh-my-pi/pi-coding-agent

# Windows
irm https://omp.sh/install.ps1 | iex
```

安装后，将其指向Hindsight Cloud：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="hsk_your_token"
```

或使用应用内设置 - `hindsight.apiUrl`、`hindsight.apiToken`、`hindsight.scoping`。默认的 `per-project-tagged` 范围自动生效；心智模型播种在每个记忆库的第一个会话中触发。

您可以[免费获取Hindsight Cloud密钥](https://ui.hindsight.vectorize.io)或[自托管Hindsight](https://hindsight.vectorize.io/developer/installation)并将oh-my-pi指向`http://localhost:8888`。无论哪种方式，API 表面都是相同的。

---

**进一步阅读：**

- [天哪GitHub](https://github.com/can1357/oh-my-pi) — 完整源代码，包括本文中引用的 [`packages/coding-agent/src/hindsight/`](https://github.com/can1357/oh-my-pi/tree/main/packages/coding-agent/src/hindsight) 目录
- [oh-my-pi 自述文件§11 — Hindsight](https://github.com/can1357/oh-my-pi#11--hindsight-memory-the-agent-curates) — 官方功能描述
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
- [构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 不同智能体中的相同模式
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全景观比较
