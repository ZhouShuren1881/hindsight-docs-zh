---
title: "团队的 OpenClaw 记忆库策略"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, memory, teams, configuration]
description: "为团队选择合适的 OpenClaw 与 Hindsight 记忆库策略，对比按用户和共享模式，避免常见隔离错误。"
image: /img/blog/guide-openclaw-memory-bank-strategy-for-teams.png
hide_table_of_contents: true
---

选择**团队的 OpenClaw 记忆库策略**时，重要问题不是“是否使用记忆”，而是“什么应该算作一个记忆空间”。答案决定召回是否聚焦、团队上下文能否有效积累，以及一个用户的聊天历史是否会进入另一个用户的回答。

OpenClaw 通过 Hindsight 记忆库配置提供多种可行模式：按用户、提供商、渠道隔离，或为团队工作流使用有意共享的单个记忆库。没有一种方式普遍正确，最佳选择取决于智能体服务的是个人、共享队列，还是一起处理同一项目的小团队。

本指南介绍三种最重要的模式，如何在不过度复杂化的情况下选择，以及需求变化后如何迁移。可以参考 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)、[记忆召回 API 参考](/developer/api/recall)和[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)。

<!-- truncate -->

> **快速解答**
>
> 1. 大多数面向个人的团队助手使用 `["provider", "user"]`。
> 2. 只有紧密共享的工作流才使用固定共享 `bankId`。
> 3. 除非智能体明确用于协作，否则避免所有用户共用一个记忆库。
> 4. 扩大共享范围前，先收紧 `retainMission`。
> 5. 召回变得嘈杂时就重新评估划分，不要只在配置变化时评估。

## 前提条件 {#prerequisites}

选择团队策略前，请确认：

- OpenClaw 和 Hindsight 插件已安装。
- 团队知道哪些对话应保持私有、哪些应共享。
- 有一个所有参与智能体都能访问的 Hindsight 后端，可为本地或云端。

基础配置参考：[OpenClaw 集成文档](/sdks/integrations/openclaw)、[快速入门指南](/developer/api/quickstart)、[记忆存储 API 参考](/developer/api/retain)和[文档首页](/)。

## 分步操作 {#step-by-step}

### 1. 理解三种重要的记忆库模式 {#1-understand-the-three-bank-patterns-that-matter}

对多数团队，实际选择是：

| 模式 | 示例 | 适合场景 |
|---|---|---|
| 按用户 | `["provider", "user"]` | 个人助手、面向个人的支持机器人 |
| 按用户和智能体 | `["agent", "provider", "user"]` | 智能体角色之间严格隔离 |
| 固定共享记忆库 | `bankId="team-product-alpha"` | 团队协作工作流 |

默认模式更安全，共享模式更强大。选择取决于团队实际需要多少协调。

### 2. 除非工作流确实共享，否则从按用户开始 {#2-start-with-per-user-unless-the-workflow-is-truly-shared}

多数团队应从以下配置开始：

```json
["provider", "user"]
```

因为它在同一平台跨渠道保留同一人的上下文，同时避免自动混合不同用户或提供商。

应用配置：

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
print(f'已更新 {path}')
PY
```

### 3. 只有以协作为目标时才使用固定共享记忆库 {#3-move-to-a-fixed-shared-bank-only-when-collaboration-is-the-point}

如果多个人或多个智能体需要利用同一共享上下文，改用固定记忆库：

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
print(f'已更新 {path}')
PY
```

这适合团队规划、共享项目协调和集体知识积累，却不适合个人助手工作流。

### 4. 使用 `retainMission` 保持召回清晰 {#4-use-retainmission-to-keep-recall-clean}

无论选择哪种模式，团队配置都更需要聚焦的存储规则，因为记忆库增长更快：

```text
提取持久项目决策、重复任务、稳定偏好、重要约束和共享上下文。忽略一次性闲聊、重复日志和临时工具输出。
```

这是整个系统中最有影响力的设置之一，通常比召回预算更重要。

### 5. 按工作流选模式，而非按公司选模式 {#5-pick-one-pattern-per-workflow-not-per-company}

一家公司通常需要多种策略。

例如：

- 客户支持智能体：按用户。
- 共享发布管理助手：固定团队记忆库。
- 工程助手：团队记忆库或项目记忆库。

这比强迫整个组织使用同一种记忆结构更合理。

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

- 选择按用户共享时，同一用户应跨渠道保持上下文延续。
- 选择团队共享记忆库时，不同成员或智能体角色应能在同一上下文上继续工作。

## 排查常见错误 {#troubleshooting--common-errors}

### 召回太嘈杂 {#recall-is-too-noisy}

记忆库范围太广，或存储目标太宽松。

### 用户看到彼此上下文 {#users-see-each-others-context}

本应按用户隔离的工作流使用了共享记忆库。

### 团队知识从不积累 {#team-knowledge-never-compounds}

工作流需要协作，却仍采用严格按用户隔离。

## 常见问题 {#faq}

### 总应从记忆库粒度中移除 `agent` 吗？ {#should-we-always-remove-agent-from-the-bank-granularity}

不应。只有智能体需要通过同一记忆库协作时才移除。

### 一个固定记忆库更容易管理吗？ {#is-one-fixed-bank-easier-to-manage}

是，但简单不代表正确。共享工作流有明确意图时，单个记忆库才有用。

### 之后可以更改策略吗？ {#can-we-change-strategies-later}

可以在动态记忆库和固定记忆库之间迁移，但必须理解每种策略指向不同记忆空间。

## 后续步骤 {#next-steps}

- 团队需要托管后端时，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整插件配置。
- 如果仍需要后端，使用[快速入门指南](/developer/api/quickstart)。
- 调整检索或存储前，阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解更广泛的协作模式。
