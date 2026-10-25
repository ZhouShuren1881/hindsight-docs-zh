---
title: "Hermes 与 Hindsight 的记忆模式：Hybrid、Context、Tools"
authors: [benfrank241]
date: 2026-04-14
tags: [how-to, hermes, memory, configuration]
description: "为 Hindsight 选择合适的 Hermes 记忆模式。了解何时使用 hybrid、context 或 tools，如何切换模式并验证召回。"
image: /img/blog/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools.png
hide_table_of_contents: true
---

![Hermes 与 Hindsight 的记忆模式：Hybrid、Context、Tools](/img/blog/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools.png)

选择 **Hermes 与 Hindsight 的记忆模式**时，关键问题是：应自动注入记忆、以工具形式提供记忆，还是两者兼备？Hermes 原生 Hindsight 提供商支持 `hybrid`、`context`、`tools` 三种集成模式，每种都会改变模型在对话中使用记忆的方式。

模式的影响比表面上更大。团队经常启用 Hindsight，确认记忆有效，就不再深究。但模式决定了是否在每轮之前召回、模型能否直接调用 `hindsight_recall` 和 `hindsight_reflect`，以及助手是默默使用记忆，还是显式调用工具。选错模式后，系统状态可能依然健康，行为却不符合预期。

本指南介绍各模式的作用、适用场景、安全切换方法、`prefetch_method` 对体验的影响，以及如何验证模式是否按预期运行。如需完整参考，请查阅 [Hermes 集成文档](/sdks/integrations/hermes)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 需要自动召回和显式 Hindsight 工具时，使用 **`hybrid`**。
> 2. 需要无感自动召回且不暴露记忆工具时，使用 **`context`**。
> 3. 需要模型主动调用记忆而非自动召回时，使用 **`tools`**。
> 4. 为保证速度，保持 `prefetch_method="recall"`；只有综合上下文的收益值得额外延迟时，才切换为 `reflect`。
> 5. 使用 `hermes memory status`、`/tools` 和实际的下一轮召回测试验证选择。

## 前提条件 {#prerequisites}

更改模式前，请确认：

- Hermes 已配置为使用原生 Hindsight 提供商。
- `hermes memory status` 报告记忆配置健康。
- 你知道 Hermes Hindsight 配置文件的位置。
- 你理解记忆模式影响召回行为，不决定记忆库是否存在。

Hermes 默认将原生 Hindsight 配置存放在 `~/.hermes/hindsight/config.json`。可以这样输出：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
print(path.read_text())
PY
```

如果尚未验证提供商，先执行：

```bash
hermes memory status
```

建议先浏览[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)，以便理解不同模式的行为。`memory_mode` 控制召回如何进入对话，而记忆存储继续遵循提供商的存储设置。

## 分步操作 {#step-by-step}

### 1. 理解每种模式实际改变什么 {#1-understand-what-each-mode-actually-changes}

这三种模式不只是界面差异，它们决定了记忆如何进入智能体循环。

| 模式 | 每轮前自动召回 | 显式 Hindsight 工具可见 | 适合场景 |
|---|---|---|---|
| `hybrid` | 是 | 是 | 大多数用户，以及同时需要便利性和控制能力的助手 |
| `context` | 是 | 否 | 简洁体验、面向消费者的助手、更少的工具干扰 |
| `tools` | 否 | 是 | 应主动决定何时显式查询记忆的智能体 |

可以这样理解：

- **`hybrid`** 是默认的通用模式。LLM 看到新用户消息前，相关记忆已经注入；必要时模型仍可显式调用 `hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect`。
- **`context`** 隐藏工具，仅依赖自动注入。适合希望助手使用体验流畅、不暴露额外记忆操作的场景。
- **`tools`** 从提示词构建路径中移除自动召回。模型必须主动选择调用记忆工具。这使访问更有针对性，但提示不足的模型也可能忘记查询。

请记住：**`tools` 模式中没有自动召回是设计行为，并不意味着故障。**

### 2. 查看当前模式和预取方法 {#2-inspect-your-current-mode-and-prefetch-method}

修改前先查看当前值：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
print("memory_mode:", cfg.get("memory_mode", "hybrid"))
print("prefetch_method:", cfg.get("prefetch_method", "recall"))
PY
```

`prefetch_method` 会改变自动注入内容的形式：

- **`recall`** 注入原始记忆事实，速度更快，通常是合适的默认选择。
- **`reflect`** 注入基于相关记忆综合生成的回答，速度较慢，但当助手需要连贯摘要而非事实列表时可能更好。

最简单可靠的起点是：

- `memory_mode="hybrid"`
- `prefetch_method="recall"`

这样能以最小的额外延迟，同时提供自动上下文和显式工具。

### 3. 需要稳妥默认值时切换为 `hybrid` {#3-switch-to-hybrid-when-you-want-the-safest-default}

如果同时需要自动召回和显式工具访问，设置 `hybrid`：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["memory_mode"] = "hybrid"
cfg["prefetch_method"] = "recall"
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"Updated {path} to hybrid mode")
PY
```

符合以下任一情况时，选择 `hybrid`：

- 希望助手无需提醒就能记住相关上下文。
- 也希望高级用户或模型显式调用 `hindsight_reflect`，进行更深入的综合分析。
- 仍在评估 Hindsight，希望使用最易排查问题的模式。

这也适合内部助手和技术用户，因为工具可见性不会影响他们的体验。

### 4. 需要无感记忆时切换为 `context` {#4-switch-to-context-when-you-want-invisible-memory}

如果希望自动召回，但**不希望**模型看到记忆工具，使用 `context`：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["memory_mode"] = "context"
cfg.setdefault("prefetch_method", "recall")
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"Updated {path} to context mode")
PY
```

以下情况适合 `context`：

- 希望工具界面更简洁。
- 面向客户的助手需要减少可见工具带来的行为干扰。
- 相比工具规划，更信任自动注入。

对许多生产环境中的助手，`context` 能提供最佳体验。模型直接从相关历史开始，无需记住记忆还作为某类工具存在。

### 5. 需要主动访问记忆时切换为 `tools` {#5-switch-to-tools-when-you-want-deliberate-memory-access}

如果完全不需要自动召回，使用 `tools`：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["memory_mode"] = "tools"
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"Updated {path} to tools mode")
PY
```

以下情况适合这种选择：

- 希望模型决定记忆何时相关。
- 希望更严格地控制提示词。
- 正在实验显式智能体策略，将 `hindsight_recall` 和 `hindsight_reflect` 作为核心推理工具。

代价很明确：如果提示词不充分，模型可能忘记使用记忆。`tools` 提供更多控制，但自动兜底能力更少。

### 6. 决定 `prefetch_method` 应保持 `recall` 还是切换为 `reflect` {#6-decide-whether-prefetch_method-should-stay-on-recall-or-move-to-reflect}

`prefetch_method` 仅在自动召回启用时有意义，因此适用于 `hybrid` 和 `context`。

使用以下脚本切换方法：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["prefetch_method"] = "reflect"
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"Updated {path} to reflect prefetch")
PY
```

实际差异如下：

| 预取方法 | Hermes 获得的内容 | 速度 | 适合场景 |
|---|---|---|---|
| `recall` | 原始相关事实 | 更快 | 编码助手、支持服务、大多数聊天工作流 |
| `reflect` | 跨记忆综合生成的摘要 | 更慢 | 复杂规划、开放式推理、摘要生成 |

如果不确定，保持 `recall`。它更容易理解和调试，通常已经足够。只有模型反复需要连贯的记忆摘要而非零散事实时，才使用 `reflect`。

### 7. 根据任务选择模式 {#7-match-the-mode-to-the-job}

实用的快速对应关系：

- **有固定偏好和持续项目的个人助手**：`hybrid`。
- **需要无感个性化的客户助手**：`context`。
- **应主动查询记忆的研究或编码智能体**：`tools`。
- **历史信息丰富、重度依赖规划的助手**：`hybrid` 或 `context`，配合 `prefetch_method="reflect"`。

其他集成也可作为参考。如果喜欢无感记忆，[OpenClaw 集成文档](/sdks/integrations/openclaw)展示了另一种智能体架构中的同类思路。如果希望以工具为核心，可以对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

## 验证是否正常 {#verifying-it-works}

不要只相信配置文件，还要验证实际行为。

### 检查提供商状态 {#check-provider-status}

```bash
hermes memory status
```

这只能确认提供商已启用，不能证明所选模式符合预期。后者需要实际测试。

### 检查工具可见性 {#check-tool-visibility}

启动 Hermes 并查看工具列表。

- **`hybrid`** 中应该能看到 Hindsight 工具。
- **`context`** 中不应看到这些工具。
- **`tools`** 中应该能看到工具，但每轮前不应自动召回。

### 执行下一轮召回测试 {#run-a-next-turn-recall-test}

告诉 Hermes 一条可记住的信息：

```text
Remember that the design review is Thursday at 3 PM and we are prioritizing the mobile onboarding flow.
```

然后在下一轮提问：

```text
What do you remember about the design review?
```

预期行为：

- **`hybrid`** 和 **`context`**：模型回答前，相关记忆应已在上下文中。
- **`tools`**：模型必须主动调用 Hindsight 工具，否则可能不使用记忆就回答。

### 核对预期与所选模式 {#verify-your-expectations-against-the-chosen-mode}

许多误报实际来自预期不匹配：

- 用户选择 `tools`，却期待自动召回。
- 用户选择 `context`，却期待 `/tools` 中出现 Hindsight 工具。
- 用户选择 `reflect` 预取，却对更高的延迟感到意外。

行为必须与所选模式匹配。

## 排查常见错误 {#troubleshooting-common-mistakes}

### 问题：`tools` 模式似乎什么都不记得 {#problem-tools-mode-seems-to-forget-everything}

通常只是提示词问题。在 `tools` 模式中，模型必须主动决定使用记忆工具。如果需要可靠的自动记忆访问，切换为 `hybrid` 或 `context`。

### 问题：`context` 模式有效，但找不到 `hindsight_reflect` {#problem-context-mode-works-but-i-cannot-find-hindsight_reflect}

这是预期行为。`context` 会隐藏显式工具，其功能是自动召回，而非暴露工具。

### 问题：`hybrid` 显示工具，却没有注入记忆 {#problem-hybrid-shows-tools-but-no-memory-is-injected}

检查 Hermes 版本是否支持所需生命周期钩子。Hermes 文档指出，旧版只会注册工具，并跳过自动注入。

### 问题：`reflect` 预取感觉很慢 {#problem-reflect-prefetch-feels-slow}

这是因为它综合生成上下文，而不是注入召回的原始事实。如果更重视响应速度，切回 `recall`。

### 问题：修改配置文件后没有变化 {#problem-nothing-changes-after-editing-the-config-file}

确认修改的是 `~/.hermes/hindsight/config.json` 下正确的文件，然后重启 Hermes 以加载新配置。

### 问题：用户刚提供新事实后，记忆内容待更新或不完整 {#problem-memory-appears-stale-or-incomplete-right-after-a-user-shares-a-new-fact}

请记住异步流程：回复结束后才存储记忆，新记忆在下一轮可用。测试下一轮行为，不要在同一轮测试。

## 常见问题 {#faq}

### 大多数人应该从哪种模式开始？ {#which-mode-should-most-people-start-with}

`hybrid`。这是最稳妥的默认选择，也最容易调试。

### 何时 `context` 比 `hybrid` 更好？ {#when-is-context-better-than-hybrid}

需要无感个性化和更简洁的工具界面时，尤其适合应保持简单、自然对话体验的助手。

### 何时 `tools` 比 `hybrid` 更好？ {#when-is-tools-better-than-hybrid}

明确希望模型推理是否应查询记忆时。它提供更多控制，但自动化更少。

### `tools` 模式也会禁用记忆存储吗？ {#does-tools-mode-disable-retention-too}

不会。`tools` 改变召回进入智能体体验的方式。存储行为仍由提供商的存储设置和生命周期钩子控制。

### 应该到处使用 `prefetch_method="reflect"` 吗？ {#should-i-use-prefetch_methodreflect-everywhere}

通常不应如此。默认使用 `recall`；确实需要综合记忆上下文时再切换为 `reflect`。

### 哪里可以了解 Hindsight 注入的内容？ {#where-can-i-learn-more-about-what-hindsight-is-injecting}

[记忆召回 API 参考](/developer/api/recall)最适合了解事实检索，[记忆存储 API 参考](/developer/api/retain)解释新信息如何变成记忆。[Hermes 集成文档](/sdks/integrations/hermes)则将这些概念与 Hermes 配置联系起来。

## 后续步骤 {#next-steps}

- [创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)，无需处理本地基础设施，即可快速测试模式变更。
- 阅读 [Hermes 集成文档](/sdks/integrations/hermes)，了解完整配置选项。
- 如需清晰的端到端配置参考，保持[快速入门指南](/developer/api/quickstart)在手边。
- 阅读[记忆召回 API 参考](/developer/api/recall)，了解 `recall` 预取实际返回什么。
- 如果需要严格控制哪些信息成为记忆，阅读[记忆存储 API 参考](/developer/api/retain)。
- 对照 [OpenClaw 集成文档](/sdks/integrations/openclaw)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，了解其他记忆交互方式。
