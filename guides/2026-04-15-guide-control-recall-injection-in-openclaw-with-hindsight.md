---
title: "使用 Hindsight 控制 OpenClaw 的召回注入"
authors: [benfrank241]
date: 2026-04-15
tags: [how-to, openclaw, memory, recall]
description: "使用 Hindsight 控制 OpenClaw 的召回注入，选择合适位置并调整记忆放置方式，以改善上下文和提示词行为。"
image: /img/blog/guide-control-recall-injection-in-openclaw-with-hindsight.png
hide_table_of_contents: true
---

![使用 Hindsight 控制 OpenClaw 的召回注入](/img/blog/guide-control-recall-injection-in-openclaw-with-hindsight.png)

如果需要**控制 OpenClaw 的召回注入**，最重要的设置是 `recallInjectionPosition`。Hindsight 插件可以把召回记忆放在系统提示词之前、之后，或作为用户消息。这看似是实现细节，却会改变模型赋予记忆的权重、大型静态提示词的缓存效率，以及结果行为是否容易理解。

多数人从不修改默认值，直到遇到真正的提示词设计问题：大型静态系统提示词应便于缓存，工作流需要把召回事实放得更靠近用户消息，或者记忆对模型行为的影响过强或过弱。此时，理解召回注入位置就成为提示词工程的一部分，而不只是插件配置。

本指南介绍各注入模式的作用、安全切换方式、相关召回设置、结果验证及应避免的错误。操作时如需完整参考，请打开 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 默认值为 `user`，在用户消息前注入记忆，保留系统提示词缓存。
> 2. 如果记忆需要系统级上下文，同时希望大型静态系统提示词前缀仍可缓存，使用 `append`。
> 3. 只有记忆必须出现在系统提示词前、且可接受缓存代价时，才使用 `prepend`。
> 4. 修改设置后重启网关。
> 5. 用真实、依赖记忆的提示词测试并查看日志，不要只看配置文件。

## 前提条件 {#prerequisites}

更改召回注入前，确认：

- OpenClaw 已运行并使用 `@vectorize-io/hindsight-openclaw`。
- 自动召回已启用。
- 记忆库中已有有用记忆，可以实际注入。
- 你知道主要问题是提示词布局、延迟还是模型行为。

使用以下小脚本查看当前召回设置：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
print('autoRecall:', plugin.get('autoRecall', True))
print('recallInjectionPosition:', plugin.get('recallInjectionPosition', 'user'))
print('recallBudget:', plugin.get('recallBudget', 'mid'))
print('recallMaxTokens:', plugin.get('recallMaxTokens', 1024))
print('recallContextTurns:', plugin.get('recallContextTurns', 1))
PY
```

如果 `autoRecall` 已关闭，更改注入位置不会产生作用。这很明显，却是常见的困惑来源。

修改前也建议浏览[记忆召回 API 参考](/developer/api/recall)和 [OpenClaw 集成文档](/sdks/integrations/openclaw)，以便判断记忆缺失究竟是检索问题，还是放置位置的选择。

## 分步操作 {#step-by-step}

### 1. 理解每种注入位置 {#1-know-what-each-injection-position-means}

OpenClaw 的 `recallInjectionPosition` 支持三个值。

| 值 | 作用 | 适合场景 |
|---|---|---|
| `prepend` | 在系统提示词之前注入记忆 | 不关注缓存时，为记忆提供最强的引导作用 |
| `append` | 在系统提示词之后注入记忆 | 大型静态提示词、便于提示词缓存 |
| `user` | 在用户消息之前注入记忆 | 默认行为、提示词缓存、用户侧上下文 |

可以简单理解为：

- **`prepend`**：“先提供记忆，再提供系统规则。”
- **`append`**：“保持系统规则稳定，再添加记忆。”
- **`user`**：“把召回上下文视为额外的对话输入。”

因此，这项设置改变的不是召回哪些记忆，而是它们在模型输入中的位置。

### 2. 需要最强记忆引导时使用 `prepend` {#2-use-prepend-when-you-want-the-strongest-memory-framing}

`prepend` 将变化的召回内容放在系统提示词开头。这让记忆具有较强引导作用，但也会在多数轮次使基于前缀的提示词缓存失效。

显式设置如下：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
plugin['recallInjectionPosition'] = 'prepend'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

以下情况使用 `prepend`：

- 需要记忆出现在所有其他系统上下文之前。
- 不打算优化大型静态系统提示词的缓存。

如果不确定，保持默认的 `user`。

### 3. 重视提示词稳定性时切换为 `append` {#3-switch-to-append-when-prompt-stability-matters}

`append` 最适合在轮次之间保持不变的大型静态系统提示词。把召回记忆放在它**之后**，静态部分更容易利用缓存。

切换为 `append`：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
plugin['recallInjectionPosition'] = 'append'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

以下情况使用 `append`：

- 系统提示词较长且大部分为静态内容。
- 希望静态提示词部分在各轮之间保持稳定。
- 希望记忆影响回答，但不想让它成为模型上下文中的第一项。

对于精心设计、指令很长、成本较高且有意保持稳定的生产提示词，这尤其有吸引力。

### 4. 保持便于缓存的默认 `user` {#4-keep-user-for-the-cache-friendly-default}

`user` 模式把召回记忆放在系统提示词之外，保留稳定的系统提示词缓存，并将记忆作为上下文输入，而非系统级指令。

设置如下：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
plugin['recallInjectionPosition'] = 'user'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

以下情况使用 `user`：

- 希望保留系统提示词缓存。
- 希望系统指令优先于召回内容。
- 记忆数据适合放在靠近用户的位置。

对于未显式设置 `recallInjectionPosition` 的新旧配置，这都是默认值。

### 5. 调整与注入位置有关的设置 {#5-tune-the-settings-that-interact-with-injection-position}

注入位置只是其中一部分。以下设置改变出现的记忆数量和组织方式：

- `autoRecall`
- `recallBudget`
- `recallMaxTokens`
- `recallTopK`
- `recallContextTurns`
- `recallPromptPreamble`

更充分但仍受控的召回配置示例：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
plugin['autoRecall'] = True
plugin['recallInjectionPosition'] = 'append'
plugin['recallBudget'] = 'mid'
plugin['recallMaxTokens'] = 1024
plugin['recallContextTurns'] = 2
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

如果召回效果较弱，问题可能是召回量或相关性，而非注入位置。因此这里尤其需要参考[记忆召回 API 参考](/developer/api/recall)。

### 6. 重启 OpenClaw 并测试行为 {#6-restart-openclaw-and-test-the-behavior-not-just-the-setting}

修改后执行：

```bash
openclaw gateway restart
```

然后进行真实测试，不要只用人为构造的单行请求。选择记忆上下文明显重要的对话。

推荐的测试模式：

1. 告诉智能体一条持久事实，例如："We deploy staging from `develop` and production from `main`."
2. 等待该轮结束，让记忆完成存储。
3. 下一轮询问相关问题，例如："Which branch should I use for staging?"
4. 比较修改注入位置前后的回复质量。

### 7. 如需更多信息，启用日志 {#7-turn-on-logs-if-you-need-to-see-more}

如果行为不明确，使用 OpenClaw 主指南中的 Hindsight 日志查看方法：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

寻找以下证据：

- 召回确实执行。
- 记忆已注入。
- 重启后系统健康。

如需更多信息，启用插件调试日志：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
plugin['debug'] = True
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'Updated {path}')
PY
```

## 验证是否正常 {#verifying-it-works}

### 检查配置 {#check-the-config}

修改后输出关键设置：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
plugin = config['plugins']['entries']['hindsight-openclaw']['config']
for key in ['autoRecall', 'recallInjectionPosition', 'recallBudget', 'recallMaxTokens', 'recallContextTurns']:
    print(f'{key}:', plugin.get(key))
PY
```

### 检查真实提示词下的回复行为 {#check-response-behavior-under-a-real-prompt}

最佳验证方式是观察一个注入位置应影响结果的真实回答。助手是否自然地利用召回上下文？是否仍遵循系统规则？回复比之前更好还是更差？

### 检查是否解决了正确的问题 {#check-whether-the-right-problem-was-actually-solved}

如果目标是提示词缓存，`append` 可能有帮助。如果希望记忆影响更强，`prepend` 可能更好。如果需要靠近用户的上下文，`user` 的取舍可能值得。正确答案取决于你要解决什么问题。

## 排查常见问题 {#troubleshooting-common-problems}

### 问题：修改设置后没有变化 {#problem-changing-the-setting-does-not-change-anything}

最可能的原因：

- `autoRecall` 已关闭。
- 没有有用记忆可供注入。
- 网关未重启。

### 问题：`append` 没有改善行为 {#problem-append-did-not-improve-behavior}

这种情况可能发生。`append` 主要影响位置和提示词稳定性，不改善检索质量。如果召回内容本身不好，改变注入位置也无济于事。

### 问题：`user` 模式感觉奇怪或影响太强 {#problem-user-mode-feels-weird-or-too-strong}

这是正常的。你让插件把记忆放得更靠近用户轮次。如果希望影响更温和，可以切回 `prepend` 或 `append`。

### 问题：记忆似乎占据主导 {#problem-memory-seems-too-dominant}

尝试 `append`，降低 `recallMaxTokens`，或减少 `recallContextTurns`。有时问题在于召回量，而非位置。

### 问题：记忆作用似乎太弱 {#problem-memory-seems-too-weak}

尝试 `prepend`、提高 `recallBudget` 或增加 `recallMaxTokens`。也可以查看[记忆存储 API 参考](/developer/api/retain)，排除正确事实从未被妥善存储的情况。

## 常见问题 {#faq}

### 大多数人应该使用哪个召回注入位置？ {#which-recall-injection-position-should-most-people-use}

从 `user` 开始。它是便于缓存的默认值，并使召回内容的优先级低于系统指令。

### 何时应该切换为 `append`？ {#when-should-i-switch-to-append}

当系统提示词较长且稳定，希望在其后添加召回记忆以保持提示词结构稳定时。

### 何时使用 `user`？ {#when-should-i-use-user}

当召回记忆应像用户侧上下文，且保留系统提示词缓存很重要时。

### 这会改变 Hindsight 召回的内容吗？ {#does-this-change-what-hindsight-recalls}

不会。它改变召回记忆的注入位置，而非检索算法。

### 除 `recallInjectionPosition` 外，还有什么重要设置？ {#what-else-matters-besides-recallinjectionposition}

通常是 `autoRecall`、`recallBudget`、`recallMaxTokens` 和 `recallContextTurns`。可以进一步阅读 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。

## 后续步骤 {#next-steps}

- [创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)，快速测试跨机器或环境的召回行为。
- 查阅 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整插件参考。
- 如需用于比较的清晰配置基线，保持[快速入门指南](/developer/api/quickstart)在手边。
- 使用[记忆召回 API 参考](/developer/api/recall)，先理解检索内容，再考虑位置。
- 如果怀疑存储了错误事实，使用[记忆存储 API 参考](/developer/api/retain)。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)，了解其他智能体中提示词和记忆布局的相互作用。
