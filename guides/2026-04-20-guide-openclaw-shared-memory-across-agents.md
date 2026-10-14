---
title: "OpenClaw 跨智能体共享记忆指南"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, memory, configuration]
description: "使用 Hindsight 为 OpenClaw 配置跨智能体共享记忆，选择合适的记忆库粒度，并验证多个智能体能否安全地复用同一上下文。"
image: /img/blog/guide-openclaw-shared-memory-across-agents.png
hide_table_of_contents: true
---

如果你想让 **OpenClaw 中的多个智能体共享记忆**，真正的问题不在于 Hindsight 能不能做到——它可以。关键在于你想保留多少默认的记忆库隔离。开箱即用时，OpenClaw 插件会按 `agent`、`channel` 和 `user` 隔离记忆。这是一个安全的起点，但也意味着两个智能体即使都与同一个人对话，也可能彼此毫无了解。

如果每个智能体都应该有独立的“大脑”，默认设置很有用。如果你希望支持机器人、运维机器人和个人助理共享同一用户上下文，这种布局就不合适了。解决方法很简单：从记忆库键中移除 `agent`，保留用户这一维度，并确保所有智能体都指向同一个 Hindsight 后端。

本指南将介绍如何配置共享模式、如何在 `["provider", "user"]` 和 `["user"]` 之间做选择、如何通过明确的提取任务说明让共享记忆保持整洁，以及如何测试一个智能体能否复用另一个智能体学到的信息。操作时请同时打开 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 在每个智能体上按常规方式安装并配置 `hindsight-openclaw`。
> 2. 从 `dynamicBankGranularity` 中移除 `agent`，这样所有智能体会为同一用户生成相同的记忆库。
> 3. 从 `["provider", "user"]` 开始；只有确实需要跨平台共享时才使用 `["user"]`。
> 4. 为所有智能体配置相同的 `retainMission`，让记忆库存储长期有用的上下文，而不是各智能体产生的噪声。
> 5. 重启所有智能体，并让同一用户分别在两个智能体上进行测试。

## 前提条件 {#prerequisites}

在智能体之间共享记忆前，请确认以下基础条件都已满足：

- OpenClaw 已安装，网关运行正常。
- 每个参与共享的智能体都已安装 `@vectorize-io/hindsight-openclaw`。
- 所有参与的智能体都指向同一个 Hindsight 后端，无论它运行在本地还是云端。
- 你已决定要按提供商分别共享，还是跨所有提供商共享。

如果还没有安装插件，请先执行以下安装步骤：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
openclaw gateway status
```

也可以浏览[记忆召回 API 参考](/developer/api/recall)、[记忆存入 API 参考](/developer/api/retain)和 [OpenClaw 共享记忆文章](/blog/2026/04/01/openclaw-shared-memory)。这三份资料有助于理解其中的取舍。

## 分步操作 {#step-by-step}

### 1. 理解智能体为何默认不共享记忆 {#1-understand-why-agents-do-not-share-memory-by-default}

默认的记忆库粒度较为保守：

```json
["agent", "channel", "user"]
```

以下任一项发生变化，记忆库标识就会改变：

- OpenClaw 智能体身份
- 渠道或房间
- 用户

如果智能体 A 学到了用户偏好简洁回复，之后智能体 B 就看不到这一偏好，因为两者的 `agent` 维度不同。这不是配置故障，而是智能体彼此隔离的结果。

你可以直接检查当前设置：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
print(plugin.get('dynamicBankGranularity', ['agent', 'channel', 'user']))
PY
```

如果列表中包含 `agent`，说明记忆仍按智能体隔离。

### 2. 选择合适的共享记忆范围 {#2-choose-the-right-shared-memory-scope}

对于大多数多智能体 OpenClaw 部署，建议的默认值是：

```json
["provider", "user"]
```

这样，每个平台上的每个用户都会有一个共享记忆库。同一用户可以在 Slack 上的多个 OpenClaw 智能体之间保持上下文连贯，但 Slack 和 Telegram 中的记忆仍然彼此独立。

只有当你明确希望同一用户在所有平台上共用一个记忆库时，才使用 `["user"]`。这种方式可能有用，但会带来更多身份识别和隐私方面的问题。

### 3. 为每个智能体设置相同的记忆库模式 {#3-update-every-agent-to-use-the-same-bank-pattern}

在每个参与共享的智能体上修改 `~/.openclaw/openclaw.json`，使记忆库标识不再包含 `agent`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
entries = config.setdefault('plugins', {}).setdefault('entries', {})
plugin = entries.setdefault('hindsight-openclaw', {'enabled': True, 'config': {}})
plugin['enabled'] = True
cfg = plugin.setdefault('config', {})
cfg['dynamicBankId'] = True
cfg['dynamicBankGranularity'] = ['provider', 'user']
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

关键在于保持一致。如果一个智能体使用 `["agent", "channel", "user"]`，另一个使用 `["provider", "user"]`，即使两边各自的配置都有效，它们也不会共享记忆库。

### 4. 为共享记忆设置合适的提取任务说明 {#4-use-a-retention-mission-built-for-shared-memory}

共享记忆库的价值在于不断积累上下文；如果把每个临时细节都存进去，也会造成问题。请为每个智能体设置相同的 `retainMission`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
cfg = config['plugins']['entries']['hindsight-openclaw']['config']
cfg['retainMission'] = (
    'Extract durable user preferences, recurring tasks, project context, '
    'important constraints, and decisions that should help any cooperating '
    'agent. Ignore one-off chatter, duplicate tool output, and transient noise.'
)
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

如果你想了解这种配置背后的思路，可以对照[团队智能体共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

### 5. 重启所有智能体并测试交接流程 {#5-restart-every-agent-and-run-a-handoff-test}

完成配置修改后，重启每个智能体的网关：

```bash
openclaw gateway restart
```

然后测试一次真实的跨智能体流程：

1. 让智能体 A 记住一项长期有用的信息，例如：“Remember that I prefer concise summaries and my current launch date is May 15.”
2. 等待这一轮对话结束，确保记忆已完成存入。
3. 向智能体 B 提出一个需要用到该上下文的问题。
4. 确认第二个智能体能根据已存入的偏好或项目事实作答。

## 验证是否正常 {#verifying-it-works}

通过两个信号来验证，不要只检查其中一个。

### 确认配置 {#confirm-the-config}

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
print('dynamicBankId:', plugin.get('dynamicBankId', True))
print('dynamicBankGranularity:', plugin.get('dynamicBankGranularity'))
print('retainMission:', plugin.get('retainMission'))
PY
```

### 确认实际行为 {#confirm-the-behavior}

真正的测试不在于文件本身，而在于第二个智能体是否掌握了相关信息。如果智能体 B 的回答仍像是从未与用户接触过，就说明共享尚未生效。

## 排查常见错误 {#troubleshooting--common-errors}

### 智能体仍未共享记忆 {#the-agents-still-do-not-share-memory}

通常是某个智能体的粒度列表中仍包含 `agent` 或 `channel`。分别输出两个智能体的生效配置，再逐行对比。

### 记忆范围过宽 {#memory-is-too-broad}

如果不断出现无关事实，说明共享范围过广，或者 `retainMission` 写得太宽泛。先收紧任务说明，再考虑重新扩大隔离范围。

### 意外发生了跨平台共享 {#cross-platform-sharing-is-happening-when-you-did-not-want-it}

这说明你使用了 `["user"]`；`["provider", "user"]` 通常更稳妥。

## 常见问题 {#faq}

### 是否应该让所有用户也共用一个记忆库？ {#should-i-ever-share-one-bank-across-all-users-too}

通常不应该。对大多数 OpenClaw 助手来说，记忆应按用户共享，而不是全局共享。完全共享的记忆库只适用于专门的团队智能体。

### `["provider", "user"]` 比 `["user"]` 更好吗？ {#is-provider-user-better-than-user}

对大多数部署来说，是的。它能在同一平台内保持上下文连贯，同时不预设用户身份在所有平台上都可信。

### 每个智能体都需要相同的 Hindsight API 凭据吗？ {#do-i-need-the-same-hindsight-api-credentials-on-every-agent}

需要。如果智能体指向不同的后端或不同的账户，它们就没有共享同一套记忆系统。

### 可以把本指南与按用户配置的指南结合起来吗？ {#can-i-combine-this-with-the-per-user-guide}

可以。本指南建立在相同思路上。之前的按用户配置指南关注单个智能体如何跨渠道共享；本指南则把这一模式扩展到多个智能体。

## 后续步骤 {#next-steps}

- 如果希望所有智能体共用一个后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 操作时保留 [OpenClaw 集成文档](/sdks/integrations/openclaw)作为完整的插件参考。
- 如果还需要部署 Hindsight，请查阅[快速入门指南](/developer/api/quickstart)。
- 调整检索和记忆存入行为时，请参考[记忆召回 API 参考](/developer/api/recall)和[记忆存入 API 参考](/developer/api/retain)。
- 通过[面向 AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)了解更广泛的应用模式。
