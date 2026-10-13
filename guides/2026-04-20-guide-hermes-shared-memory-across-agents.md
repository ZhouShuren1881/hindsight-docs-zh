---
title: "配置 Hermes 跨智能体共享记忆"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, hermes, memory, multi-agent, configuration]
description: "使用 Hindsight 配置 Hermes 跨智能体共享记忆，有意识地重用同一记忆库，并测试多个智能体能否安全地在相同上下文上继续工作。"
image: /img/blog/guide-hermes-shared-memory-across-agents.png
hide_table_of_contents: true
---

如果希望 **Hermes 跨智能体共享记忆**，配置比多数人想象中简单。多个智能体无需特殊的联合层，只需指向同一 Hindsight 后端和同一 `bank_id`，即可在相同记忆空间中检索和存储。

这种简单性很强大，也意味着需要有明确意图。只有参与的智能体确实属于同一工作流，共享记忆才改善结果。两个无关智能体写入同一记忆库会迅速让召回变得嘈杂；两个协作智能体共享目标明确的记忆库，则能利用彼此已有知识，持续变得更聪明。

本指南介绍如何选择共享记忆库、配置多个 Hermes 智能体重用它、在不拆分记忆库的情况下保留角色边界，以及验证一个智能体能否召回另一个产生的记忆。可参考 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门指南](/developer/api/quickstart)和[记忆存储 API 参考](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 为工作流选择共享 `bank_id`，不要覆盖整个组织。
> 2. 配置各 Hermes 智能体使用同一后端和记忆库。
> 3. 以协作为目标时，在提示词和存储目标中区分角色，而非拆分记忆库。
> 4. 用两个智能体测试：一个写入持久事实，另一个召回。
> 5. 如果无关上下文开始污染召回，再拆分记忆库。

## 前提条件 {#prerequisites}

在 Hermes 智能体之间共享记忆前，请确认：

- 每个智能体已使用原生 Hindsight 提供商。
- 可以控制每个智能体的配置。
- 智能体确实属于同一项目、客户工作流或团队流程。
- 你知道应该共享什么持久上下文。

如需基础提供商配置，从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)和[记忆召回 API 参考](/developer/api/recall)开始。

## 分步操作 {#step-by-step}

### 1. 选择对应真实工作流的记忆库名称 {#1-choose-a-bank-name-that-matches-one-real-workflow}

好的共享记忆库名称示例：

- `support-escalations`
- `team-product-alpha`
- `launch-ops-q2`

不好的示例：

- `shared`
- `general`
- `everyone`

记忆库应代表一个协作记忆空间。如果无法说明哪些智能体属于它，范围很可能太广。

### 2. 配置第一个 Hermes 智能体 {#2-configure-the-first-hermes-agent}

在 Hermes Hindsight 配置中显式设置共享记忆库：

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

第一个智能体成为共享记忆库的读写者之一。

### 3. 为第二个智能体配置相同记忆库 {#3-configure-the-second-agent-with-the-same-bank}

第二个智能体也使用相同后端和 `bank_id`：

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

现在两个智能体连接相同记忆空间。提示词、工具访问和操作规则仍可区分角色，但记忆库共享。

### 4. 在指令中区分角色，而非记忆库 ID {#4-keep-roles-separate-in-instructions-not-bank-ids}

常见错误是通过拆分记忆库保留角色差异，这违背共享记忆的初衷。应当：

- 保持一个共享记忆库。
- 每个智能体使用不同提示词或技能。
- 使用明确的存储目标，只存储持久工作流上下文。

这与 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)讨论的是同一思路。

### 5. 测试实际跨智能体交接 {#5-test-a-real-cross-agent-handoff}

简单测试如下：

1. 智能体 A 得知：“客户希望每周收到简洁摘要，计费导出必须包含税务代码。”
2. 会话结束，记忆存储完成。
3. 智能体 B 在同一共享记忆库上启动。
4. 向智能体 B 提出依赖这些事实的问题。

如果共享记忆库有效，智能体 B 应无需你重复就能召回已存上下文。

## 验证是否正常 {#verifying-it-works}

### 确认两个智能体使用相同记忆库 ID {#confirm-both-agents-use-the-same-bank-id}

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get('HERMES_HOME', pathlib.Path.home() / '.hermes'))
path = base / 'hindsight' / 'config.json'
cfg = json.loads(path.read_text())
print(cfg.get('bank_id'))
PY
```

在每个智能体环境中执行检查，值应完全一致。

### 确认跨智能体召回，而非仅单智能体召回 {#confirm-cross-agent-recall-not-just-single-agent-recall}

如果 A 能记住自己的事实，B 却不能，问题不在 Hindsight 本身，而在于两个智能体没有使用同一记忆库。

## 排查常见错误 {#troubleshooting--common-errors}

### 第二个智能体无法召回内容 {#the-second-agent-does-not-recall-anything}

通常是记忆库 ID 不匹配，或一个智能体仍指向不同的 Hindsight 后端。

### 共享召回太嘈杂 {#shared-recall-is-too-noisy}

记忆库范围太广。按工作流或团队拆分，不要让每个 Hermes 智能体都写入通用记忆库。

### 智能体在概念上互相覆盖 {#agents-overwrite-each-other-conceptually}

通常意味着存储目标太模糊，应明确哪些内容算作持久共享记忆。

## 常见问题 {#faq}

### 公司所有 Hermes 智能体都应共享一个记忆库吗？ {#should-every-hermes-agent-in-the-company-share-one-bank}

通常不应如此。共享记忆最适合有明确边界的工作流，而非整个组织。

### 共享记忆库可以搭配不同智能体记忆模式吗？ {#can-i-combine-a-shared-bank-with-different-memory-modes-per-agent}

可以。记忆库保持共享，一个智能体使用 `hybrid`，另一个使用 `context`，只要符合预期体验。

### 一个共享记忆库比手动传递笔记更好吗？ {#is-one-shared-bank-better-than-passing-notes-manually}

对持续工作流来说，是的。共享记忆减少重复交接上下文，并让智能体的知识随时间积累。

## 后续步骤 {#next-steps}

- 如需所有 Hermes 智能体共用托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)，了解完整提供商配置。
- 如果仍需要后端，使用[快速入门指南](/developer/api/quickstart)。
- 阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)，调整检索与存储。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中的协作模式。
