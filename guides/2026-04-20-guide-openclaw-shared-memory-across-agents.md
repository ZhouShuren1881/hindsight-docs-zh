---
title: "OpenClaw 跨智能体共享记忆指南"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, memory, configuration]
description: "使用 Hindsight 配置 OpenClaw 跨智能体共享记忆，选择合适记忆库粒度，并验证多个智能体能否安全重用相同上下文。"
image: /img/blog/guide-openclaw-shared-memory-across-agents.png
hide_table_of_contents: true
---

如果希望 **OpenClaw 跨智能体共享记忆**，真正的问题不是 Hindsight 能否做到——它可以——而是需要保留多少默认记忆库隔离。默认 OpenClaw 插件按 `agent`、`channel` 和 `user` 隔离，这是安全起点，但也意味着两个智能体可以与同一人对话，却仍像彼此毫无了解。

每个智能体需要独立大脑时，默认方式很有用。但如果希望支持机器人、运维机器人和个人助手共享同一用户上下文，就不适合。解决方法很简单：从记忆库键中移除 `agent`，保留用户维度，并确保每个智能体指向同一 Hindsight 后端。

本指南介绍如何配置共享、选择 `["provider", "user"]` 或 `["user"]`、通过明确存储目标保持共享记忆清晰，以及测试智能体能否重用其他智能体学到的知识。可以参考 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 在每个智能体上常规安装并配置 `hindsight-openclaw`。
> 2. 从 `dynamicBankGranularity` 移除 `agent`，让所有智能体为同一用户生成相同记忆库。
> 3. 除非明确需要跨平台共享，否则从 `["provider", "user"]` 开始，而非 `["user"]`。
> 4. 添加相同 `retainMission`，存储持久上下文，而非各智能体的噪声。
> 5. 重启每个智能体，让同一用户在两个智能体中测试。

## 前提条件 {#prerequisites}

跨智能体共享前，确认以下基础条件：

- OpenClaw 已安装，网关健康。
- 每个参与智能体都已安装 `@vectorize-io/hindsight-openclaw`。
- 所有参与智能体指向同一个本地或云端 Hindsight 后端。
- 你知道需要按提供商共享，还是跨全部提供商共享。

如果尚未安装插件，从安装开始：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
openclaw gateway status
```

也建议浏览[记忆召回 API 参考](/developer/api/recall)、[记忆存储 API 参考](/developer/api/retain)和 [OpenClaw 共享记忆文章](/blog/2026/04/01/openclaw-shared-memory)，以理解取舍。

## 分步操作 {#step-by-step}

### 1. 理解为什么智能体默认不共享记忆 {#1-understand-why-agents-do-not-share-memory-by-default}

默认记忆库粒度较保守：

```json
["agent", "channel", "user"]
```

以下任一项变化，记忆库身份就会变化：

- OpenClaw 智能体身份。
- 渠道或房间。
- 用户。

如果智能体 A 学到用户偏好简洁回复，B 之后不会看到该偏好，因为 `agent` 维度不同。这不是故障，只是智能体被隔离。

直接查看当前设置：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
print(plugin.get('dynamicBankGranularity', ['agent', 'channel', 'user']))
PY
```

列表中出现 `agent`，说明记忆仍按智能体隔离。

### 2. 选择合适的共享记忆范围 {#2-choose-the-right-shared-memory-scope}

对于多数多智能体 OpenClaw 配置，最佳默认值是：

```json
["provider", "user"]
```

这为每个平台的每个用户提供共享记忆库。同一用户可在 Slack 的多个 OpenClaw 智能体之间保持延续，但 Slack 和 Telegram 记忆仍分开。

只有明确希望同一用户跨所有平台共享时，才使用 `["user"]`。它可能有用，但会带来更多身份和隐私问题。

### 3. 更新每个智能体以使用相同模式 {#3-update-every-agent-to-use-the-same-bank-pattern}

修改各参与智能体的 `~/.openclaw/openclaw.json`，使记忆库不再包含 `agent`：

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
print(f'已更新 {path}')
PY
```

关键是一致性。如果一个使用 `["agent", "channel", "user"]`，另一个使用 `["provider", "user"]`，即使各自配置正确，也不会共享。

### 4. 使用为共享记忆设计的存储目标 {#4-use-a-retention-mission-built-for-shared-memory}

共享记忆库通过积累上下文产生价值，但积累所有临时细节时也有风险。为每个智能体加入相同 `retainMission`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
cfg = config['plugins']['entries']['hindsight-openclaw']['config']
cfg['retainMission'] = (
    '提取持久用户偏好、重复任务、项目上下文、'
    '重要约束及有助于所有协作智能体的决策。'
    '忽略一次性闲聊、重复工具输出和临时噪声。'
)
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'已更新 {path}')
PY
```

如果想理解配置背后的思路，可以对照[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

### 5. 重启每个智能体并测试交接 {#5-restart-every-agent-and-run-a-handoff-test}

修改配置后，重启各智能体网关：

```bash
openclaw gateway restart
```

然后测试真实跨智能体流程：

1. 让智能体 A 学到持久信息，例如：“记住，我喜欢简洁摘要，目前发布日期是 5 月 15 日。”
2. 等待该轮结束，让记忆存储完成。
3. 向智能体 B 提出依赖该上下文的问题。
4. 确认第二个智能体能使用已存偏好或项目事实回答。

## 验证是否正常 {#verifying-it-works}

使用两个信号，而非只看一个。

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

### 确认行为 {#confirm-the-behavior}

真正的测试不在文件，而在第二个智能体是否掌握信息。如果 B 仍像从未见过用户一样回答，共享就尚未生效。

## 排查常见错误 {#troubleshooting--common-errors}

### 智能体仍不共享记忆 {#the-agents-still-do-not-share-memory}

通常是其中一个粒度列表仍包含 `agent` 或 `channel`。输出两者实际配置，逐行比较。

### 记忆范围太广 {#memory-is-too-broad}

无关事实不断出现时，记忆库共享过度或 `retainMission` 太宽松。再次扩大隔离前，先收紧存储目标。

### 意外发生跨平台共享 {#cross-platform-sharing-is-happening-when-you-did-not-want-it}

这说明使用了 `["user"]`，而 `["provider", "user"]` 更稳妥。

## 常见问题 {#faq}

### 是否也应该让所有用户共享一个记忆库？ {#should-i-ever-share-one-bank-across-all-users-too}

通常不应如此。多数 OpenClaw 助手应按用户共享，而非全局共享。完全共享只适合专门的团队智能体。

### `["provider", "user"]` 比 `["user"]` 更好吗？ {#is-provider-user-better-than-user}

对多数部署，是的。它在同一平台保持延续，不假设用户身份在各平台都可信。

### 每个智能体需要相同 Hindsight API 凭据吗？ {#do-i-need-the-same-hindsight-api-credentials-on-every-agent}

是的。如果指向不同后端或账户，就没有共享同一记忆系统。

### 可以与按用户指南结合吗？ {#can-i-combine-this-with-the-per-user-guide}

可以。两者基于同一思路。早期按用户指南关注一个智能体跨渠道共享，本指南将其扩展到多个智能体。

## 后续步骤 {#next-steps}

- 如需各智能体共用后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整插件参考。
- 如果仍需要搭建 Hindsight，阅读[快速入门指南](/developer/api/quickstart)。
- 调整检索和存储时，使用[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解更广泛的模式。
