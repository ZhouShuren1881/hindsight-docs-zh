---
title: "配置 OpenClaw 与 Claude Code 的共享记忆"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, claude-code, memory, workflow]
description: "借助 Hindsight 在 OpenClaw 与 Claude Code 之间设置共享记忆，让两种工具共用一个记忆库，并验证上下文能否在聊天和编码工作之间顺畅流转。"
image: /img/blog/guide-openclaw-and-claude-code-shared-memory.png
hide_table_of_contents: true
---

要让 **OpenClaw 和 Claude Code 共享记忆**，诀窍不是再安装一套记忆系统，而是让两个工具都明确指向同一个 Hindsight 记忆库。设置好后，聊天中学到的上下文可以带入编码会话；编码过程中发现的信息也能回到聊天中，无需每次重新输入完整背景。

如果一个工作流需要交替使用这两种工具，这种设置就很有用。比如，你先和 OpenClaw 助手讨论产品需求，再切换到 Claude Code 实现，之后又回到 OpenClaw 查看进度。没有共享记忆时，每种工具都得从头了解情况；共用一个记忆库后，它们就能使用相同的项目事实、偏好和工作背景。

本指南会介绍如何稳妥地连接两种工具、何时应指定固定的共享 `bankId`、如何限定记忆库的范围以保持内容实用，以及怎样验证上下文确实能在两种工具之间流转。配置期间，请打开 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[Claude Code 文章](/guides/2026/05/04/guide-claude-code-memory-with-hindsight)和[快速入门指南](/developer/api/quickstart)以便查阅。

<!-- truncate -->

> **快速解答**
>
> 1. 为这套工作流选定一个共享 `bankId`，例如 `team-product-alpha`。
> 2. 将 Claude Code 和 OpenClaw 配置为使用同一 Hindsight 后端和同一个记忆库。
> 3. 设置重点明确的提取任务说明，让两种工具存入的上下文都持久且彼此兼容。
> 4. 先在 OpenClaw 写入一条记忆，再用 Claude Code 召回，然后测试反向流程。
> 5. 如果无关项目开始影响召回结果，再拆分记忆库。

## 前提条件 {#prerequisites}

在两种工具之间共享记忆之前，请确认：

- Hindsight 已在本地或云端运行。
- 已安装 OpenClaw，且 Hindsight 插件运行正常。
- Claude Code 已安装 Hindsight 插件。
- 你已确定共享记忆库归哪个项目或团队使用。

如果还没有完成基础配置，请先查看[快速入门指南](/developer/api/quickstart)、[OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和 [Retain API 参考](/developer/api/retain)。

## 操作步骤 {#step-by-step}

### 1. 认真选定一个共享记忆库 ID {#1-choose-one-intentional-shared-bank-id}

共享记忆库应对应一项明确的工作流，而不是包揽你生活中的所有事情。合适的名称例如：

- `team-product-alpha`
- `customer-support-escalations`
- `launch-ops-q2`

不合适的名称例如：

- `default`
- `shared`
- `everything`

记忆库名称应让人看出它服务于谁，以及其中应包含哪些工作。与大多数 token 设置调整相比，这个决定更能影响召回质量。

### 2. 将 OpenClaw 指向共享记忆库 {#2-point-openclaw-at-the-shared-bank}

更新 OpenClaw 插件配置，为其指定固定的 `bankId`：

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
print(f'Updated {path}')
PY
```

这样会有意覆盖默认的动态记忆库行为。你相当于告诉 OpenClaw：“这个智能体始终从同一个共享记忆库中召回记忆，并向其中写入记忆。”

### 3. 将 Claude Code 指向同一个记忆库 {#3-point-claude-code-at-the-same-bank}

在 Claude Code 的 Hindsight 插件配置中，使用相同的 `bankId` 和后端凭据：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "YOUR_TOKEN",
  "bankId": "team-product-alpha",
  "retainMission": "Extract durable project decisions, coding conventions, important constraints, and user preferences that should help across chat and coding sessions."
}
```

Claude Code 插件配置文件的位置可能因安装方式而异，请通过插件自身的配置界面进行设置。关键是让两种工具共用同一个 `bankId`。如果 Claude Code 和 OpenClaw 都指向 `team-product-alpha`，它们就会读写同一个记忆库。

### 4. 统一两种工具的提取任务说明 {#4-align-the-retention-mission-across-both-tools}

只有当记忆库中保存的内容在两种环境下都派得上用场，共享记忆才有效。因此，两种工具都应优先存入：

- 项目决策
- 用户偏好
- 尚未完成的任务和约束
- 架构背景
- 命名约定和惯例

应避免存入：

- 临时的聊天填充内容
- 重复日志
- 一次性的运维杂项

[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)介绍了实用的共享记忆库示例，可供参考。

### 5. 测试两个方向的记忆流转 {#5-test-both-directions}

先在 OpenClaw 中写入记忆，再用 Claude Code 召回。

1. 在 OpenClaw 中对助手说：“Remember that the new launch checklist must include billing smoke tests and the team prefers concise summaries.”
2. 等待这一轮对话结束。
3. 在 Claude Code 中让它继续处理发布工作，或总结它所知道的清单内容。

接着测试反向流程。

1. 在 Claude Code 的实现过程中作出一项决定，例如：“We are using background jobs for webhook retries, not in-request processing.”
2. 结束会话，以便记忆存入流程运行。
3. 在 OpenClaw 中询问状态摘要。

如果共享记忆库配置正确，上下文就应能双向流转。

## 验证配置是否生效 {#verifying-it-works}

### 检查记忆库配置 {#check-the-bank-configuration}

OpenClaw 应显示固定的 `bankId`：

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

Claude Code 的 Hindsight 插件配置中也应显示同一个记忆库。

### 检查跨工具召回，而不只是各自的本地召回 {#check-cross-tool-recall-not-just-local-recall}

真正的成功标准是上下文能在不同工具间延续。如果每种工具只能召回自己存入的内容，就还没有实现共享记忆。

## 故障排查与常见错误 {#troubleshooting--common-errors}

### OpenClaw 和 Claude Code 仍像是彼此独立 {#openclaw-and-claude-code-still-feel-separate}

通常是其中一种工具指向了不同的记忆库，或使用了不同的后端 URL。

### 召回结果杂乱 {#recall-quality-is-noisy}

这说明记忆库范围太宽。请按团队、项目或客户工作流拆分，而不要让一个记忆库囊括所有内容。

### 一种工具存入了有用上下文，另一种却存入了杂项 {#one-tool-stores-useful-context-the-other-stores-junk}

请统一 `retainMission`。如果一种工具存入持久事实，另一种却写入对话杂项，共享记忆就无法正常发挥作用。

## 常见问题 {#faq}

### 这里应该使用固定记忆库还是动态记忆库？ {#should-i-use-a-fixed-bank-or-dynamic-banks-here}

要真正实现跨工具共享，请使用固定记忆库。动态记忆库适合自动隔离；如果主要目标是共享，固定记忆库更简单。

### 多个 Claude Code 用户也可以共用一个记忆库吗？ {#can-multiple-claude-code-users-share-the-same-bank-too}

可以，但前提是这是有意的安排。共享记忆库应对应一项真实的共同工作流，而不是为了方便而模糊地共用设置。

### 这比在工具之间手动复制笔记好吗？ {#is-this-better-than-copying-notes-manually-between-tools}

对于正在持续进行的工作流，是的。手动笔记仍有用，但共享记忆可以减少反复补充背景的工作。

## 后续步骤 {#next-steps}

- 如果希望聊天和编码工具共用一个后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 配置两端时，请将 [OpenClaw 集成文档](/sdks/integrations/openclaw)和 [Claude Code 持久记忆文章](/guides/2026/05/04/guide-claude-code-memory-with-hindsight)保持在手边。
- 如果还需要 Hindsight 服务器，请参阅[快速入门指南](/developer/api/quickstart)。
- 阅读 [Recall API 参考](/developer/api/recall)和 [Retain API 参考](/developer/api/retain)，调整工具之间传递的上下文量。
- 如果要把这一模式扩展到整个团队，请阅读[面向 AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
