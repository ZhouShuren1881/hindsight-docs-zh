---
title: "Hermes 智能体间共享记忆配置指南"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, hermes, memory, multi-agent, configuration]
description: "使用 Hindsight 配置 Hermes 智能体间的共享记忆，有意共用同一个记忆库，并验证多个智能体能否安全地基于同一上下文协作。"
image: /img/blog/guide-hermes-shared-memory-across-agents.png
hide_table_of_contents: true
---

如果你想让 **多个 Hermes 智能体共享记忆**，配置过程比大多数人预想的简单。多个智能体不需要特殊的联邦层，只要指向同一个 Hindsight 后端和同一个 `bank_id` 即可。这样一来，它们便能在同一记忆空间中检索和存入记忆。

这种简单配置很有用，但也要求你审慎规划。只有参与者确实属于同一工作流，共享记忆才能改善结果。如果两个无关的智能体写入同一个记忆库，召回很快就会变得嘈杂。如果两个协作智能体共用一个目标明确的记忆库，效果则相反：每个智能体都能基于其他智能体已经学到的内容继续积累知识。

本指南将介绍如何选择合适的共享记忆库、配置多个 Hermes 智能体共用它、在不拆分记忆库的情况下保留角色边界，以及如何验证一个智能体能否召回另一个智能体产生的记忆。操作时请同时打开 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门指南](/developer/api/quickstart)和 [Retain API 参考](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 为这条工作流选择一个共享 `bank_id`，不要让整个组织共用一个。
> 2. 配置每个 Hermes 智能体使用相同的后端和记忆库。
> 3. 如果目标是协作，就在提示词和任务说明中区分智能体角色，而不是为它们创建不同的记忆库。
> 4. 用两个智能体进行测试：一个存入一条持久事实，另一个召回它。
> 5. 如果无关上下文开始干扰召回，再拆分记忆库。

## 前提条件 {#prerequisites}

在 Hermes 智能体之间共享记忆之前，请确认：

- 每个智能体都已使用 Hindsight 原生提供商。
- 你可以控制每个智能体的配置。
- 这些智能体确实属于同一个项目、客户工作流或团队流程。
- 你清楚哪些持久上下文应该共享。

如果还没有完成基础提供商配置，请从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)和 [Recall API 参考](/developer/api/recall)开始。

## 分步操作 {#step-by-step}

### 1. 为一个真实工作流选择合适的记忆库名称 {#1-choose-a-bank-name-that-matches-one-real-workflow}

合适的共享记忆库名称示例：

- `support-escalations`
- `team-product-alpha`
- `launch-ops-q2`

不合适的示例：

- `shared`
- `general`
- `everyone`

记忆库应对应一个协作记忆空间。如果你无法说明哪些智能体应该加入其中，这个记忆库的范围可能太宽。

### 2. 配置第一个 Hermes 智能体 {#2-configure-the-first-hermes-agent}

在 Hermes 的 Hindsight 配置中，显式设置共享记忆库：

```json
{
  "provider": "hindsight",
  "hindsight_api_url": "https://api.hindsight.vectorize.io",
  "api_key": "YOUR_HINDSIGHT_TOKEN",
  "bank_id": "team-product-alpha",
  "memory_mode": "hybrid",
  "prefetch_method": "recall"
}
```

第一个智能体将成为共享记忆库的读写者之一。

### 3. 为第二个智能体配置同一个记忆库 {#3-configure-the-second-agent-with-the-same-bank}

第二个智能体也要使用相同的后端和 `bank_id`：

```json
{
  "provider": "hindsight",
  "hindsight_api_url": "https://api.hindsight.vectorize.io",
  "api_key": "YOUR_HINDSIGHT_TOKEN",
  "bank_id": "team-product-alpha",
  "memory_mode": "hybrid",
  "prefetch_method": "recall"
}
```

现在两个智能体已连接到同一记忆空间。它们仍可通过提示词、工具访问权限和操作规则承担不同角色，但会共用记忆库。

### 4. 在指令中区分角色，而不是使用不同的记忆库 ID {#4-keep-roles-separate-in-instructions-not-bank-ids}

一种常见的错误做法是拆分记忆库以维持角色差异，这样就失去了共享记忆的意义。你应该：

- 保留一个共享记忆库；
- 为每个智能体设置不同的提示词或技能；
- 使用目标明确的存入任务说明，只保存持久的工作流上下文。

这与 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中介绍的思路相同。

### 5. 测试一次真实的跨智能体交接 {#5-test-a-real-cross-agent-handoff}

可以进行这样一项简单测试：

1. 智能体 A 得知：“The customer wants concise weekly summaries and the billing export must include tax codes.”
2. 会话结束，记忆存入流程完成。
3. 在同一个共享记忆库上启动智能体 B。
4. 向智能体 B 提出一个需要用到这些事实的问题。

如果共享记忆库正常工作，智能体 B 应该能召回存入的上下文，你无需再次告诉它这些信息。

## 验证是否正常 {#verifying-it-works}

### 确认两个智能体使用相同的记忆库 ID {#confirm-both-agents-use-the-same-bank-id}

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get('HERMES_HOME', pathlib.Path.home() / '.hermes'))
path = base / 'hindsight' / 'config.json'
cfg = json.loads(path.read_text())
print(cfg.get('bank_id'))
PY
```

在每个智能体的运行环境中执行检查。两个值应完全一致。

### 确认跨智能体召回，而不只是单个智能体的召回 {#confirm-cross-agent-recall-not-just-single-agent-recall}

如果智能体 A 能召回自己的事实，而智能体 B 不能，问题不在 Hindsight 本身，而在于两个智能体没有使用同一个记忆库。

## 排查常见问题 {#troubleshooting--common-errors}

### 第二个智能体无法召回任何内容 {#the-second-agent-does-not-recall-anything}

通常是两个记忆库 ID 不匹配，或者其中一个智能体仍然指向另一个 Hindsight 后端。

### 共享召回结果太嘈杂 {#shared-recall-is-too-noisy}

记忆库范围太宽。应按工作流或团队拆分，而不是让所有 Hermes 智能体都写入一个通用记忆库。

### 智能体在概念上相互覆盖 {#agents-overwrite-each-other-conceptually}

这通常表示存入任务说明太含糊。请明确规定哪些内容应视为持久的共享记忆。

## 常见问题 {#faq}

### 公司里的每个 Hermes 智能体都应该共用一个记忆库吗？ {#should-every-hermes-agent-in-the-company-share-one-bank}

通常不应该。共享记忆最适合边界明确的工作流，不适合整个组织。

### 可以让不同智能体使用不同记忆模式，同时共用一个记忆库吗？ {#can-i-combine-a-shared-bank-with-different-memory-modes-per-agent}

可以。如果符合你期望的使用体验，记忆库可以保持共享，而一个智能体使用 `hybrid` 模式、另一个使用 `context` 模式。

### 共用一个记忆库比手动传递笔记更好吗？ {#is-one-shared-bank-better-than-passing-notes-manually}

对于持续进行的工作流，是的。共享记忆可以减少重复传递上下文的需要，也让智能体随着时间积累知识。

## 后续步骤 {#next-steps}

- 如果你希望所有 Hermes 智能体共用一个托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)，了解完整的提供商配置细节。
- 如果你还需要后端，请使用[快速入门指南](/developer/api/quickstart)。
- 阅读 [Recall API 参考](/developer/api/recall)和 [Retain API 参考](/developer/api/retain)，调整检索和存入行为。
- 参考 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解协作模式。
