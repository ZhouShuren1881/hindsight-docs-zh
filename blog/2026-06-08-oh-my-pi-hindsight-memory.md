---
title: "oh-my-pi 如何基于 Hindsight 构建代码库持久记忆"
authors: [benfrank241, can1357]
slug: "2026/06/08/oh-my-pi-hindsight-memory"
date: 2026-06-08T12:00
tags: [hindsight, coding, agents, memory, case-study, oh-my-pi, mental-models, tutorial]
description: "oh-my-pi 是一款获得 1 万多个星标的终端编程智能体，它使用 Hindsight 作为长期记忆后端。本文演示其集成方式：记忆库范围界定、心智模型播种和自动存入管道，代码均直接摘自其代码库。"
image: /img/blog/oh-my-pi-hindsight-memory.webp
hide_table_of_contents: true
---

![oh-my-pi 如何基于 Hindsight 构建代码库持久记忆](/img/blog/oh-my-pi-hindsight-memory.webp)

[oh-my-pi](https://github.com/can1357/oh-my-pi)（也称 `omp`）是一款面向终端的 TypeScript + Rust 编程智能体，拥有 10,600 多个星标、40 多个服务提供方和 32 种工具。它致力于让智能体与 IDE 紧密集成，并精心设计每种工具，以提升智能体的性能。谈到记忆，他们选择了 Hindsight，因为它的长期记忆召回性能出色，底层采用多方面的检索技术。

这也不是一个浅层集成：oh-my-pi 在 Hindsight API 之上构建了完整的记忆子系统，包括记忆库范围界定、心智模型播种、去抖存入队列，以及首轮自动召回。本文将介绍他们如何构建这套系统，代码直接摘自公开代码库。如果你正考虑为自己的编程智能体集成 Hindsight，这篇文章可以帮助你了解深度集成的实现方式。

<!-- truncate -->

## 概览 {#tldr}

- oh-my-pi 将由 Hindsight 支持的 `retain` / `recall` / `reflect` 作为面向模型的工具提供；此外还实现了自动存入和自动召回的生命周期，无需模型自行处理。
- 默认情况下，记忆按项目范围组织，可选三种模式（`global`、`per-project`、`per-project-tagged`），默认模式为 `per-project-tagged`。
- 心智模型层会在首次启动会话时播种三个由 Reflect 支持、经人工维护的摘要（`user-preferences`、`project-conventions`、`project-decisions`），并在每次重建提示时将其缓存输出拼接进去。
- 他们最初使用 `@vectorize-io/hindsight-client`，确定实际需要的 API 端点后，便[自行实现了一个精简的 fetch 客户端](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/client.ts)，没有改变底层 API 合约。

---

## 记忆库范围模型 {#the-bank-scoping-model}

编程智能体首先要决定：*什么内容算作某个用户的记忆？* oh-my-pi 通过 `hindsight.scoping` 提供了三种答案。以下内容摘自 [`bank.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/bank.ts)：

> 三种范围模式（`HindsightConfig.scoping`）：
> - `global` — 使用一个共享记忆库，不按项目筛选。
> - `per-project` — 按当前工作目录（cwd）的基本名称为每个项目使用一个记忆库，彼此严格隔离。
> - `per-project-tagged` — 使用一个共享记忆库；每次存入都会带上 `project:<name>` 标签，召回时按该标签筛选，但仍会一并返回未标记的（“全局”）记忆。

默认模式 `per-project-tagged` 是一个值得关注的选择。整个用户只使用一个记忆库，但每次存入都会带上来源项目的标签。随后，召回使用 `tagsMatch: "any"` 进行筛选，因此智能体既能看到项目范围内的记忆，也能看到用户全局存入的内容（如用户偏好和跨项目约定）。与单一全局记忆库相比，它提供了更强的隔离；与每个代码库单独使用一个记忆库相比，它的限制更少。这正是会在多个项目之间切换的编程智能体所需要的权衡。

其计算逻辑只需一个小函数：
```ts
export function computeBankScope(config: HindsightConfig, directory: string) {
  const base = baseBankId(config); // 除非被覆盖，否则为 "omp"
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

`projectLabel` 只是目录的基本名称，因此在 `~/code/superproject` 中工作时，所有内容都会带上 `project:superproject` 标签。Hindsight 会在服务器端根据 `tags` / `tags_match` 完成其余工作，无需修改模式，也不必维护每个代码库各自的记忆库。如果需要严格隔离，`per-project` 会为每个目录分配独立的记忆库。

---

## 心智模型层 {#the-mental-models-layer}

这套集成的巧妙之处在于**心智模型层**。Hindsight 心智模型是一个有名称、持久保存的摘要，服务器会自行让它保持最新。omp 将它用作低延迟缓存，记录智能体对用户及其项目已有的了解，并在每次重建提示时将其拼接到开发者指令中；这样就不必每一轮都花费一次召回往返。

种子文件（[`seeds.json`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/seeds.json)）定义了整套策略：

```json
{
  "seeds": [
    {
      "id": "user-preferences",
      "name": "User Preferences",
      "source_query": "What does the user prefer in coding style, tooling, communication, and review? Capture only durable preferences expressed across sessions, not one-off requests.",
      "scopes": ["global", "per-project", "per-project-tagged"],
      "projectTagged": false,
      "max_tokens": 600,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    },
    {
      "id": "project-conventions",
      "name": "Project Conventions",
      "source_query": "What are this project's conventions for code style, build, testing, release, and pull-request review? Only include conventions that are explicit in the project (settings, scripts, contributor docs, repeatedly enforced in review).",
      "scopes": ["per-project", "per-project-tagged"],
      "projectTagged": true,
      "max_tokens": 800,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    },
    {
      "id": "project-decisions",
      "name": "Project Decisions",
      "source_query": "What durable architectural or product decisions have been made for this project, and what rationale or trade-offs were recorded? Include only decisions that are stable across sessions; exclude transient plans, unresolved ideas, and active task state.",
      "scopes": ["per-project", "per-project-tagged"],
      "projectTagged": true,
      "max_tokens": 800,
      "trigger": { "mode": "delta", "refresh_after_consolidation": true }
    }
  ]
}
```

这个文件有三点值得注意：

1. **`trigger.mode = "delta"` 加上 `refresh_after_consolidation = true`。** 这是适用于编程智能体的模式：心智模型不会在每次整合时都重新生成，只有整合器发现了会实质改变模型的新内容时才会刷新。维护成本低，需要时又能保持最新。
2. **`source_query` 是一个*提示*，不是关键词筛选器。** Hindsight 会通过 Reflect 根据该提示查询记忆库，由 LLM 挑选相关记忆，而不是做精确匹配搜索。提示承担了筛选要求，例如“只记录持久偏好”“只记录项目中明确规定的约定”以及“只记录跨会话保持稳定的决策”。
3. **标签纪律。** [`mental-models.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/mental-models.ts) 中的一条注释提醒：

   > Hindsight 的刷新路径会使用 `all_strict` 标签匹配，根据模型的标签筛选来源记忆。如果种子带有一个存入时从未写入的标签，刷新结果就会为空。因此，种子标签必须是当前范围模式下 `retainSession` / `enqueueRetain` 实际附加标签的子集。

   这是一个经过周密考虑的集成细节。对于 `projectTagged: true` 的条目，种子会带上当前范围的 `project:<cwd>` 标签。未标记的种子（例如 `user-preferences`）会读取记忆库中的所有记忆，因为当 `tags` 为空时，Reflect 不会应用标签筛选器。

加载缓存的心智模型块时，系统会用“反反馈”包装器渲染它，让 LLM 将其视为背景知识，而不是可执行指令。这与 Hindsight 自身集成处理召回片段的方式相同。

---

## 存入管道 {#the-retain-pipeline}

oh-my-pi 的存入代码将*工具发起的存入*（模型在一轮对话中调用 `retain`）与*自动存入*（在会话结束时刷新整个会话）分开处理。面向模型的工具使用去抖批处理队列：

```ts
const RETAIN_FLUSH_BATCH_SIZE = 16;
const RETAIN_FLUSH_INTERVAL_MS = 5_000;
```

模型调用 `retain` 并提交一项或多项内容时，这些内容会进入队列。队列达到 16 项时会立即刷新；否则会在首轮之后 5 秒刷新。每次刷新都会向 `/v1/default/banks/{bank_id}/memories` 发送一个 `retainBatch(...)` POST 请求，并设置 `async: true`，这样智能体就不必等待服务器端提取事实。工具会立即向模型返回 `"<count> memory queued."`；实际写入采用发起后即返回的方式，如果刷新失败，会在会话中显示警告通知，而不会抛出异常。

自动存入走另一条路径。它会构建本次会话的记录（可通过 `hindsight.retainMode` 配置为 `full-session` 或 `last-turn`），并将其作为一次较大的 `retain` 调用发送。默认模式 `full-session` 让 Hindsight 的事实提取器决定哪些内容值得保留，而不是要求 oh-my-pi 先在客户端进行摘要。

生命周期配置的默认值可见于 [`config.ts`](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/hindsight/config.ts)：

```ts
scoping: "per-project-tagged",
autoRecall: true,
autoRetain: true,
retainMode: "full-session",
retainContext: "omp",
recallBudget: "mid",
```

全新安装并指向 Hindsight Cloud 后，开箱即用的配置会提供按项目标记的记忆、每次会话首轮自动召回，以及会话结束时自动存入。用户无需进行任何配置，就能获得不断积累的效果。

---

## 召回管道 {#the-recall-pipeline}

召回有两种使用方式：一种是面向模型的工具（模型在一轮对话中通过查询字符串调用 `recall`）；另一种是自动注入步骤（`HindsightSessionState.beforeAgentStartPrompt` 会在首次调用 LLM 前运行组合查询）。第一种方式很直接：向 `/v1/default/banks/{bank_id}/memories/recall` 发送 `POST` 请求，其中包含模型的查询、已配置的预算、类型和记忆库范围标签筛选条件。

自动注入路径则包含较多处理逻辑。根据 `content.ts`，oh-my-pi 会从最近几轮用户对话（`recallContextTurns`）中组合出召回查询，将查询长度限制在配置的字符数预算（`recallMaxQueryChars`）内，然后在召回结果前添加以下引导语：

```text
Relevant memories from past conversations (prioritize recent when conflicting).
Only use memories that are directly useful to continue this conversation;
ignore the rest:
```

这段引导语是有意这样设计的。Hindsight 的召回会呈现与查询*相关*的记忆，但它们未必*此刻有用*。这段引导语让 LLM 进一步筛选；当新记忆与旧记忆矛盾时，优先采用较新的记忆。（如果你曾在智能体提示中看到召回结果，就会认出这种模式；Hindsight 文档也使用了它。）

`reflect` 工具会向 `/v1/default/banks/{bank_id}/reflect` 单独发送 `POST` 请求，并在每个进程首次使用时，尽力通过 `PUT` 设置记忆库的 `reflect_mission` / `retain_mission`。这与 SDK 使用相同的逻辑，只是改写成由他们完全控制的 fetch 包装器。

---

## 他们为何重写客户端 {#why-they-rewrote-the-client}

这个集成最初使用 `@vectorize-io/hindsight-client`。后来，他们将其换成了手动编写的 fetch 客户端。以下内容摘自 `client.ts` 顶部的注释：

> 用手动编写的 fetch 调用替换 `@vectorize-io/hindsight-client` SDK，这样我们只依赖实际使用的 API 端点：`retain`、`retainBatch`、`recall`、`reflect`、记忆库和文档管理，以及批量列表。将构造逻辑集中在这里，可以为测试提供一个统一的监视切入点。

对于投入较多的集成而言，这很常见：真正交付的产品希望尽量缩小依赖范围，并全面掌控重试、超时和测试切入点。关键在于，他们没有改变 API 合约，而是直接调用相同的端点。这也从侧面说明 API 设计足够清晰，可以在内部自行实现客户端。

---

## 这对基于 Hindsight 的编程智能体意味着什么 {#what-this-means-for-coding-agents-on-hindsight}

退一步看，oh-my-pi 的集成方式与我们介绍过的其他基于 Hindsight 的编程智能体非常相似（[Hermes](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)、[Claude Code](/blog/2026/03/04/mcp-agent-memory)、[OpenClaw](/blog/2026/05/27/openclaw-codebase-memory)）：

- 向模型提供三种存入、召回和反思工具
- 首轮自动召回，会话结束时自动存入
- 按项目划分记忆库范围（具体方式各有不同）
- 通过类似心智模型的摘要缓存，为首轮上下文提供低延迟支持
- 使用去抖存入队列，避免模型调用 `retain` 时发生阻塞

这并非巧合。这种模式适用于代码助手，而 Hindsight 的 API 正是围绕这样的生命周期设计的。oh-my-pi 的实现是这一模式最详尽的公开参考资料；如果你想借鉴其中某部分，本文链接的文档都直接指向对应源文件。

---

## 试用 {#try-it}

oh-my-pi 可以通过一条命令安装：

```bash
# macOS / Linux
curl -fsSL https://omp.sh/install | sh

# Bun（推荐）
bun install -g @oh-my-pi/pi-coding-agent

# Windows
irm https://omp.sh/install.ps1 | iex
```

安装后，将其连接到 Hindsight Cloud：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="hsk_your_token"
```

也可以使用应用内设置：`hindsight.apiUrl`、`hindsight.apiToken`、`hindsight.scoping`。默认的 `per-project-tagged` 范围会自动生效；每个记忆库的首次会话会触发心智模型播种。

你可以[免费获取 Hindsight Cloud 密钥](https://ui.hindsight.vectorize.io)，也可以[自行托管 Hindsight](/developer/installation)，并将 oh-my-pi 指向 `http://localhost:8888`。无论采用哪种方式，API 接口都相同。

---

**延伸阅读：**

- [oh-my-pi 的 GitHub 代码库](https://github.com/can1357/oh-my-pi) — 完整源代码，包括本文中多次引用的 [`packages/coding-agent/src/hindsight/`](https://github.com/can1357/oh-my-pi/tree/main/packages/coding-agent/src/hindsight) 目录
- [oh-my-pi README 第 11 节 — Hindsight](https://github.com/can1357/oh-my-pi#11--hindsight-memory-the-agent-curates) — 官方功能说明
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基础概念
- [构建一个能够记住代码库的 Hermes 编程助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 另一种智能体中的相同模式
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全面比较
