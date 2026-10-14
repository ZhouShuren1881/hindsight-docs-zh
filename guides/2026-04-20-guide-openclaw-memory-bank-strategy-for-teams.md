---
title: "团队的 OpenClaw 记忆库策略"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, memory, teams, configuration]
description: "为团队选择合适的 OpenClaw 与 Hindsight 记忆库策略，对比按用户隔离和共享模式，并避免常见的隔离错误。"
image: /img/blog/guide-openclaw-memory-bank-strategy-for-teams.png
hide_table_of_contents: true
---

选择**团队的 OpenClaw 记忆库策略**时，关键问题不是“要不要使用记忆”，而是“什么应该算作一个记忆空间？”答案决定召回是否聚焦、团队上下文能否持续有效积累，以及一个用户的聊天记录是否会进入另一个用户的回答。

通过配置 Hindsight 记忆库，OpenClaw 支持多种可行模式：按用户、提供商或渠道隔离，也可以为团队工作流集中使用一个有意共享的记忆库。这些选项没有放之四海而皆准的最佳方案。具体选择取决于智能体服务的对象是个人、共享队列，还是一起开展同一项目的小团队。

本指南介绍三种最重要的模式，说明如何在不过度复杂化配置的情况下作出选择，以及需求变化后如何迁移。比较时可以同时查看 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)、[Recall API 参考](/developer/api/recall)和[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)。

<!-- truncate -->

> **快速结论**
>
> 1. 对于大多数服务个人用户的团队助手，使用 `["provider", "user"]`。
> 2. 只有工作流确实需要紧密共享时，才使用一个固定的共享 `bankId`。
> 3. 除非智能体明确用于协作，否则不要让所有用户共用一个记忆库。
> 4. 扩大共享范围前，先收紧 `retainMission`。
> 5. 召回结果变得嘈杂时就重新评估记忆库划分，不要等到配置发生变化才评估。

## 前提条件 {#prerequisites}

选择团队策略前，请确认：

- OpenClaw 和 Hindsight 插件已安装。
- 团队清楚哪些对话应保持个人私有，哪些应共享。
- 所有参与的智能体都能访问同一个 Hindsight 后端，无论它部署在本地还是云端。

基础配置参考：[OpenClaw 集成文档](/sdks/integrations/openclaw)、[快速入门指南](/developer/api/quickstart)、[Retain API 参考](/developer/api/retain)和[文档首页](/)。

## 分步操作 {#step-by-step}

### 1. 了解三种重要的记忆库模式 {#1-understand-the-three-bank-patterns-that-matter}

对大多数团队来说，实际需要考虑的是：

| 模式 | 示例 | 适用场景 |
|---|---|---|
| 按用户隔离 | `["provider", "user"]` | 个人助手、服务个人用户的支持机器人 |
| 按用户和智能体隔离 | `["agent", "provider", "user"]` | 严格隔离不同智能体角色 |
| 固定共享记忆库 | `bankId="team-product-alpha"` | 团队协作工作流 |

默认模式更安全，共享模式能力更强。该选择取决于团队实际需要多少协作。

### 2. 除非工作流确实需要共享，否则从按用户隔离开始 {#2-start-with-per-user-unless-the-workflow-is-truly-shared}

大多数团队应从以下配置开始：

```json
["provider", "user"]
```

为什么？这样可以让同一用户在同一平台不同渠道中的上下文保持连贯，同时避免自动混合不同用户或不同提供商的上下文。

可以通过以下命令应用配置：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
entries = config.setdefault('plugins', {}).setdefault('entries', {})
plugin = entries.setdefault('hindsight-openclaw', {'enabled': True, 'config': {}})
cfg = plugin.setdefault('config', {})
cfg['dynamicBankId'] = True
cfg['dynamicBankGranularity'] = ['provider', 'user']
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

### 3. 只有协作本身是目标时，才改用固定共享记忆库 {#3-move-to-a-fixed-shared-bank-only-when-collaboration-is-the-point}

如果多个人或多个智能体需要基于同一份共享上下文继续工作，请改用固定记忆库：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
entries = config.setdefault('plugins', {}).setdefault('entries', {})
plugin = entries.setdefault('hindsight-openclaw', {'enabled': True, 'config': {}})
cfg = plugin.setdefault('config', {})
cfg['dynamicBankId'] = False
cfg['bankId'] = 'team-product-alpha'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

这种模式适合团队规划、共享项目协调和集体知识积累，却不适合个人助手工作流。

### 4. 用 `retainMission` 保持召回结果清晰 {#4-use-retainmission-to-keep-recall-clean}

无论选择哪种记忆库模式，团队配置都更需要明确聚焦的存入规则，因为记忆库增长得更快：

```text
Extract durable project decisions, recurring tasks, stable preferences, important constraints, and shared context. Ignore one-off chatter, duplicate logs, and transient tool output.
```

这是整个系统中影响最大的设置之一，往往比召回预算更重要。

### 5. 按工作流选择模式，而不是按公司选择 {#5-pick-one-pattern-per-workflow-not-per-company}

一家公司通常需要不止一种策略。

例如：

- 客户支持智能体：按用户隔离
- 共享发布管理助手：固定的团队记忆库
- 工程助手：团队记忆库或项目记忆库

这种做法比强迫整个组织采用同一种记忆结构更合理。

## 验证是否正常 {#verifying-it-works}

### 输出当前记忆库设置 {#print-the-active-bank-settings}

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
print('dynamicBankId:', plugin.get('dynamicBankId'))
print('dynamicBankGranularity:', plugin.get('dynamicBankGranularity'))
print('bankId:', plugin.get('bankId'))
PY
```

### 测试实际选择的模式 {#test-the-pattern-you-actually-chose}

- 如果选择按用户隔离，同一用户在不同渠道中应能保持上下文连贯。
- 如果选择团队共享记忆库，不同团队成员或智能体角色应能基于同一上下文继续工作。

## 排查常见错误 {#troubleshooting--common-errors}

### 召回结果太嘈杂 {#recall-is-too-noisy}

记忆库范围太广，或者存入任务说明过于宽泛。

### 用户看到彼此的上下文 {#users-see-each-others-context}

你为本应按用户隔离的工作流选择了共享记忆库。

### 团队知识始终无法积累 {#team-knowledge-never-compounds}

工作流明明需要协作，你却仍采用严格的按用户隔离模式。

## 常见问题 {#faq}

### 是否应该总是从记忆库粒度中移除 `agent`？ {#should-we-always-remove-agent-from-the-bank-granularity}

不应该。只有当智能体需要通过同一个记忆库协作时，才移除它。

### 一个固定记忆库更容易管理吗？ {#is-one-fixed-bank-easier-to-manage}

是，但易于管理不代表选择正确。只有在明确需要共享工作流时，单个记忆库才有用。

### 之后可以更改策略吗？ {#can-we-change-strategies-later}

可以在动态记忆库和固定记忆库之间迁移，也可以反向迁移，但要明白每种策略都指向不同的记忆空间。

## 后续步骤 {#next-steps}

- 如果团队需要一个托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 查看 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整的插件配置选项。
- 如果仍需要后端，请使用[快速入门指南](/developer/api/quickstart)。
- 调整检索或存储前，请阅读 [Recall API 参考](/developer/api/recall)和 [Retain API 参考](/developer/api/retain)。
- 阅读[《AI 编码智能体的团队共享记忆》](/blog/2026/07/10/shared-memory-across-ai-tools)，了解更广泛的协作模式。
