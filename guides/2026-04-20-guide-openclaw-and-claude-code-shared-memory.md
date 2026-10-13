---
title: "配置 OpenClaw 与 Claude Code 共享记忆"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, claude-code, memory, workflow]
description: "使用 Hindsight 在 OpenClaw 与 Claude Code 之间配置共享记忆，让两个工具重用同一记忆库，并验证上下文在聊天和编码之间顺畅延续。"
image: /img/blog/guide-openclaw-and-claude-code-shared-memory.png
hide_table_of_contents: true
---

如果希望 **OpenClaw 与 Claude Code 共享记忆**，关键不是安装另一套记忆系统，而是有意识地让两个工具指向同一 Hindsight 记忆库。这样，聊天中获得的上下文可以出现在编码会话中，编码会话的发现也可以回到聊天，无需重新输入所有背景。

当一个工作流跨越两个工具时，这很有用。例如先与 OpenClaw 助手讨论产品需求，切换到 Claude Code 实现，再回到 OpenClaw 获取状态更新。没有共享记忆时，每个工具都从零开始；共享记忆库则能重用同一项目事实、偏好和工作上下文。

本指南介绍稳妥的连接方式、何时使用固定共享 `bankId`、如何收紧记忆库范围以保持价值，以及如何测试上下文确实从一个工具传到另一个。配置时可参考 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[Claude Code 文章](/guides/2026/05/04/guide-claude-code-memory-with-hindsight)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 为工作流选择一个共享 `bankId`，例如 `team-product-alpha`。
> 2. 配置 Claude Code 和 OpenClaw 使用同一 Hindsight 后端和记忆库。
> 3. 明确存储目标，让两个工具存入兼容、持久的上下文。
> 4. 在 OpenClaw 写入记忆，在 Claude Code 召回，再测试反向路径。
> 5. 如果无关项目开始污染召回，再拆分记忆库。

## 前提条件 {#prerequisites}

在工具之间共享记忆前，请确认：

- Hindsight 已在本地或云端运行。
- OpenClaw 已安装，Hindsight 插件健康。
- Claude Code 已安装 Hindsight 插件。
- 你知道哪个项目或团队应拥有共享记忆库。

如需基础配置，从[快速入门指南](/developer/api/quickstart)、[OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[记忆存储 API 参考](/developer/api/retain)开始。

## 分步操作 {#step-by-step}

### 1. 有意识地选择一个共享记忆库 ID {#1-choose-one-intentional-shared-bank-id}

共享记忆库应对应真实工作流，而非生活中的所有事情。好的示例：

- `team-product-alpha`
- `customer-support-escalations`
- `launch-ops-q2`

不好的示例：

- `default`
- `shared`
- `everything`

名称应说明记忆服务于谁、哪些工作属于它。这个决定对召回质量的帮助，超过大多数令牌设置调整。

### 2. 让 OpenClaw 指向共享记忆库 {#2-point-openclaw-at-the-shared-bank}

更新 OpenClaw 插件配置，使用固定 `bankId`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
entries = config.setdefault('plugins', {}).setdefault('entries', {})
plugin = entries.setdefault('hindsight-openclaw', {'enabled': True, 'config': {}})
plugin['enabled'] = True
cfg = plugin.setdefault('config', {})
cfg['dynamicBankId'] = False
cfg['bankId'] = 'team-product-alpha'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'已更新 {path}')
PY
```

这有意覆盖默认动态记忆库行为。你是在告诉 OpenClaw：“这个智能体始终向同一共享大脑写入并从中召回。”

### 3. 让 Claude Code 指向同一记忆库 {#3-point-claude-code-at-the-same-bank}

在 Claude Code Hindsight 插件配置中，使用相同 `bankId` 和后端凭据：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "YOUR_TOKEN",
  "bankId": "team-product-alpha",
  "retainMission": "提取持久项目决策、编码约定、重要约束和用户偏好，以便在聊天和编码会话之间提供帮助。"
}
```

Claude Code 插件配置的具体位置随安装方式而异，应使用插件自身的配置入口。关键是共享 `bankId`。Claude Code 和 OpenClaw 都指向 `team-product-alpha` 时，就在读写同一记忆库。

### 4. 对齐两个工具的记忆存储目标 {#4-align-the-retention-mission-across-both-tools}

只有存储的记忆在两个环境中都有意义，共享记忆库才有效。两个工具都应优先关注：

- 项目决策。
- 用户偏好。
- 未完成任务和约束。
- 架构上下文。
- 命名约定和模式。

应避免存储：

- 临时聊天填充内容。
- 重复日志。
- 一次性运维噪声。

[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)展示了实际有用的共享记忆库，很适合参考。

### 5. 测试两个方向 {#5-test-both-directions}

先在 OpenClaw 写入，在 Claude Code 召回。

1. 在 OpenClaw 中告诉助手：“记住，新发布清单必须包含计费冒烟测试，团队偏好简洁摘要。”
2. 等待该轮结束。
3. 在 Claude Code 中，让它继续发布工作或总结它知道的清单信息。

然后测试反向路径。

1. 在 Claude Code 实现过程中做出决策，例如：“Webhook 重试使用后台任务，不在请求处理中执行。”
2. 结束会话，让记忆存储执行。
3. 在 OpenClaw 中询问状态摘要。

共享记忆库连接正确时，上下文应双向流动。

## 验证是否正常 {#verifying-it-works}

### 检查记忆库配置 {#check-the-bank-configuration}

OpenClaw 应显示固定 `bankId`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
cfg = config['plugins']['entries']['hindsight-openclaw']['config']
print('dynamicBankId:', cfg.get('dynamicBankId'))
print('bankId:', cfg.get('bankId'))
PY
```

Claude Code 的 Hindsight 插件配置应显示相同记忆库。

### 检查跨工具召回，而非仅本地召回 {#check-cross-tool-recall-not-just-local-recall}

真正的成功标准是跨工具延续。如果每个工具仅召回自己存入的内容，仍未实现共享记忆。

## 排查常见错误 {#troubleshooting--common-errors}

### OpenClaw 和 Claude Code 仍像彼此独立 {#openclaw-and-claude-code-still-feel-separate}

几乎总是其中一个指向不同记忆库或不同后端 URL。

### 召回质量嘈杂 {#recall-quality-is-noisy}

记忆库范围太广。按团队、项目或客户工作流拆分，不要用一个库保存所有内容。

### 一个工具存有用上下文，另一个存无用内容 {#one-tool-stores-useful-context-the-other-stores-junk}

对齐 `retainMission`。一个写入持久事实、另一个写入对话杂物时，共享记忆就会失效。

## 常见问题 {#faq}

### 此处应使用固定还是动态记忆库？ {#should-i-use-a-fixed-bank-or-dynamic-banks-here}

真正的跨工具共享应使用固定记忆库。动态记忆库适合自动隔离，但既然目标是共享，固定库更简单。

### 多个 Claude Code 用户也能共享同一记忆库吗？ {#can-multiple-claude-code-users-share-the-same-bank-too}

可以，但必须有明确意图。共享记忆库应对应真实共享工作流，而非模糊的便利设置。

### 这比在工具之间手动复制笔记更好吗？ {#is-this-better-than-copying-notes-manually-between-tools}

对活跃且持续的工作流，是的。手动笔记仍有价值，但共享记忆减少反复补充背景的工作。

## 后续步骤 {#next-steps}

- 如需聊天和编码工具共用后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 配置两端时，查阅 [OpenClaw 集成文档](/sdks/integrations/openclaw)和 [Claude Code 持久记忆文章](/guides/2026/05/04/guide-claude-code-memory-with-hindsight)。
- 如果仍需要 Hindsight 服务器，使用[快速入门指南](/developer/api/quickstart)。
- 阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)，调整工具间传递的上下文量。
- 如需将模式扩展到整个团队，阅读 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
