---
title: "如何修复 Hermes 无法召回上下文的问题"
authors: [benfrank241]
date: 2026-04-14
tags: [how-to, hermes, memory, troubleshooting]
description: "排查 Hermes 无法召回上下文的问题。检查模式、健康状态、钩子、日志和记忆存储时机，让自动召回恢复正常。"
image: /img/blog/guide-debug-hermes-memory-not-recalling-context.png
hide_table_of_contents: true
---

![如何修复 Hermes 无法召回上下文的问题](/img/blog/guide-debug-hermes-memory-not-recalling-context.png)

如果你正在**排查 Hermes 无法召回上下文的问题**，通常可以从五个方面入手：Hermes 使用了错误的记忆模式、后端不健康、原生钩子未启用、新记忆尚未完成存储，或者模型仍在使用错误的记忆路径。

令人困扰的是，系统看似配置正确，实际却仍然失败。`hermes memory status` 可能显示已配置提供商，工具列表中也有 Hindsight 工具，配置文件看上去没有问题，但智能体回答时仍像失去了记忆。这通常意味着问题在于行为，而不只是配置。模式、预期或时机出现偏差，都可能让健康的基础设施看起来像发生了故障。

本指南提供可靠的排查顺序：检查当前模式、确认 Hindsight 后端可达、验证自动召回钩子、实际测试下一轮记忆召回、查看日志，再修复常见问题。操作时如需完整配置参考，请打开 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `hermes memory status`，确认 Hindsight 已启用。
> 2. 检查 `memory_mode`，因为 `tools` 模式按设计会关闭自动召回。
> 3. 确认 Hindsight 后端健康，且记忆库中确实存在记忆。
> 4. 在一轮中测试记忆存储，在下一轮测试召回，不要立即测试。
> 5. 检查 Hermes 是否支持原生生命周期钩子。
> 6. 查看日志；如果内置 `memory` 工具让模型混淆，请将其禁用。

## 前提条件 {#prerequisites}

开始排查前，请确认使用的是原生 Hindsight 提供商，而不是旧的混合配置。

你需要具备：

- 已安装且能正常启动的 Hermes。
- 配置完成的 Hindsight 提供商。
- Hermes 所在机器的访问权限。
- 至少一个可用于测试的已知事实。

先检查状态：

```bash
hermes memory status
```

然后查看提供商配置文件：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
print(json.dumps(json.loads(path.read_text()), indent=2))
PY
```

如果你尚不熟悉 Hindsight 的检索和存储行为，建议先阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。这两份文档解释了为什么成功存储记忆后，系统仍可能没有在你预期的时机提供上下文。

## 分步操作 {#step-by-step}

### 1. 首先检查 `memory_mode` {#1-check-memory_mode-first}

这是最常见的困惑来源。

Hermes 支持三种 Hindsight 记忆模式：

- `hybrid`：自动召回，同时提供显式工具。
- `context`：仅自动召回。
- `tools`：仅提供显式工具。

如果配置为 `tools`，系统就不会自动召回。模型必须显式调用 `hindsight_recall` 或 `hindsight_reflect`。许多人发现自动上下文缺失后便认为召回失效，其实系统只是遵循所选模式。

直接输出模式：

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

如果需要自动召回，请切换为 `hybrid` 或 `context`：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["memory_mode"] = "hybrid"
cfg.setdefault("prefetch_method", "recall")
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"已将 {path} 更新为 hybrid 模式")
PY
```

如果你正在考虑更复杂的模式选择，可以阅读专门介绍 [Hermes 与 Hindsight 记忆模式](/guides/2026/04/14/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools)的指南。

### 2. 确认后端健康 {#2-confirm-the-backend-is-healthy}

如果 Hermes 无法访问 Hindsight，召回自然无法工作。

对于**本地模式**，直接测试嵌入式服务器：

```bash
curl http://localhost:9077/health
```

本地 API 应返回健康响应。如果连接被拒绝，或者进程仍在启动，即使 Hermes 本身正常，召回也可能失败。

对于**云端模式**，最快的状态信号仍是 `hermes memory status`，同时检查环境文件中是否存在必需值：

```bash
grep '^HINDSIGHT_' ~/.hermes/.env || true
```

如果缺少 API 密钥或 URL，Hermes 可能完成初始化，却没有可用的后端。

如果使用本地模式且需要更完整的配置参考，排查时可以随时查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)和[快速入门指南](/developer/api/quickstart)。

### 3. 测试记忆存储是否成功 {#3-test-whether-retention-is-succeeding-at-all}

召回只能返回记忆库中已有的内容。用户在从未存储有效信息的记忆库中测试召回，这种问题比想象中更常见。

执行一次严格受控的测试。

在 Hermes 的一轮对话中，告诉它一条有辨识度的信息：

```text
记住，计费冻结期周五结束，而新用户引导流程的重写因分析事件尚未就绪而受阻。
```

等待回复结束。然后在**下一轮**提问：

```text
你还记得哪些关于计费冻结期的信息？
```

下一轮这一要求很重要。Hindsight 在助手回复后异步存储记忆，然后让新记忆可供后续检索。如果存储后立即在同一轮验证，就可能把正常的异步行为误认为故障。

如需更严格的测试，在工具可用时要求 Hermes 显式检索记忆：

```text
使用 hindsight_recall，告诉我你知道哪些关于计费冻结期的信息。
```

这样可以区分两类问题：

- 可召回的数据不存在。
- 可召回的数据存在，但没有自动注入。

### 4. 检查 Hermes 是否具备原生生命周期钩子 {#4-check-whether-hermes-has-the-native-lifecycle-hooks}

Hermes 文档强调了一点：自动召回和自动存储依赖 `pre_llm_call`、`post_llm_call` 等生命周期钩子。在旧版 Hermes 中，Hindsight 工具可能仍会注册，但会跳过自动注入。

这会产生特定的故障表现：

- 工具列表中存在 `hindsight_recall`。
- 显式工具调用有效。
- 没有自动注入上下文。

如果与你的情况一致，问题很可能是 Hermes 版本，而非 Hindsight 配置错误。

可以通过以下症状快速判断：

- 显式调用 `hindsight_recall` 有效，但在 `hybrid` 或 `context` 模式中记忆从未自动出现。
- 后端健康。
- 记忆库明确包含数据。

那么很可能缺少钩子支持。

### 5. 检查模型是否使用了错误的记忆路径 {#5-check-whether-the-model-is-using-the-wrong-memory-path}

Hermes 仍有内置记忆存储，会将 Markdown 笔记写入本地的 `MEMORY.md` 和更精简的用户档案 `USER.md`。如果保持启用，模型可能继续使用它们，而不是 Hindsight。这会令人困惑：助手似乎在存储记忆，却没有存到你正在排查的路径。

测试期间关闭这些文件存储：

```bash
hermes config set memory.memory_enabled false
hermes config set memory.user_profile_enabled false
```

然后重复受控的记忆存储和召回测试，以消除一个极易造成误判的来源。

如果之后决定在某个工作流中恢复内置存储，将相同标志重新设为 `true` 即可。

### 6. 查看日志，避免猜测 {#6-inspect-logs-instead-of-guessing}

日志可以把模糊的记忆问题转化为明确的系统问题。

如果本地模式启动异常，查看嵌入式守护进程日志：

```bash
cat ~/.hermes/logs/hindsight-embed.log
```

如果 Hindsight 本身在运行时出错，查看当前配置档案的日志：

```bash
tail -f ~/.hindsight/profiles/*.log
```

如需提供商输出更多信息，在配置文件中启用调试模式：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["debug"] = True
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"已在 {path} 中启用调试日志")
PY
```

然后重启 Hermes 并复现问题。

日志尤其有助于区分以下情况：

- 提供商从未初始化。
- 后端不可达。
- 已存储记忆，但召回未找到相关内容。
- 预取已执行，但模型回答仍不理想。

### 7. 核对记忆库 ID {#7-verify-the-bank-id-is-the-bank-you-think-it-is}

有时召回是正常的，但 Hermes 指向了错误的记忆库。这通常发生在迁移后或手动修改配置后。

直接输出记忆库 ID：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
print("bank_id:", cfg.get("bank_id"))
PY
```

如果记忆库选错了，Hermes 并不是召回失败，而是从错误的位置召回。

这也是迁移指南强调从旧插件路径迁移时应保持相同记忆库的原因。如需操作步骤，请参阅[指南：从 hindsight-hermes 迁移到 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)。

## 验证是否正常 {#verifying-it-works}

修复疑似问题后，分层验证。

### 状态 {#status}

```bash
hermes memory status
```

这里应显示 Hindsight 已启用。

### 配置合理性 {#config-sanity}

确认：

- `memory_mode` 符合预期。
- `prefetch_method` 符合预期。
- `bank_id` 正确。
- 后端设置与实际情况一致。

### 受控的下一轮测试 {#controlled-next-turn-test}

提供一条新事实，在下一轮查询它。不要依赖此前对话留下的模糊印象。

### 显式召回测试 {#explicit-recall-test}

如果工具可见，要求 Hermes 直接调用 `hindsight_recall`。如果显式调用有效而自动召回无效，几乎总是模式选择或钩子可用性问题。

### 用户体验测试 {#ux-test}

最后，测试你实际关注的行为。在真实对话中自然地追问，看看 Hermes 能否无需你复述就从正确的上下文开始回答。

## 排查常见故障模式 {#troubleshooting-common-failure-patterns}

### 表现：`hermes memory status` 正常，但从不自动召回 {#pattern-hermes-memory-status-is-fine-but-auto-recall-never-happens}

最可能的原因：

- `memory_mode` 为 `tools`。
- Hermes 缺少钩子支持。
- 记忆库尚无有用记忆。

### 表现：显式调用 `hindsight_recall` 有效，但普通回复像没有状态 {#pattern-explicit-hindsight_recall-works-but-normal-replies-feel-stateless}

最可能的原因：

- 自动召回模式被关闭。
- 缺少钩子支持。
- 已配置 `prefetch_method`，但你预期的是同一轮结果。

### 表现：本地模式仅首次启动失败 {#pattern-local-mode-fails-only-on-first-start}

最可能的原因：

- 嵌入式 Hindsight 和 PostgreSQL 仍在初始化。

在认定配置完全失效之前，先检查 `~/.hermes/logs/hindsight-embed.log`。

### 表现：昨天记忆正常，今天却不一致 {#pattern-memory-was-working-yesterday-now-it-feels-inconsistent}

最可能的原因：

- 配置发生变化。
- 记忆库 ID 发生变化。
- 模型又开始使用 Hermes 内置 `memory` 工具。
- `~/.hermes/.env` 中的某个后端凭据丢失。

### 表现：模型似乎忽视了明显相关的历史 {#pattern-the-model-seems-to-ignore-obviously-relevant-history}

即使召回在技术层面正常，仍可能出现这种情况。这时问题可能出在相关性或提示词使用，而非提供商故障。[记忆召回 API 参考](/developer/api/recall)有助于理解 Hindsight 如何判断相关性。

## 常见问题 {#faq}

### 为什么存储记忆后立即测试召回会失败？ {#why-does-recall-fail-when-i-test-it-right-after-storing-a-memory}

因为记忆存储是异步的。新记忆会在后续轮次可用，而不会在同一轮立即出现。

### 为什么能看到 Hindsight 工具，却没有自动上下文？ {#why-do-i-see-hindsight-tools-but-no-automatic-context}

通常是因为 Hermes 版本较旧，缺少原生生命周期钩子，或者 `memory_mode` 被设为 `tools`。

### `tools` 模式意味着 Hindsight 出错了吗？ {#does-tools-mode-mean-hindsight-is-broken}

不是。这意味着模型必须主动决定显式使用记忆工具。

### 应该禁用 Hermes 内置 `memory` 工具吗？ {#should-i-disable-hermess-built-in-memory-tool}

调试期间应该禁用，以消除歧义。召回稳定后，再决定是否恢复该工具。

### 如何判断是记忆库为空还是召回失效？ {#how-do-i-know-whether-the-bank-is-empty-or-recall-is-broken}

执行受控的记忆存储测试，等待回复结束，在下一轮查询新事实。如果显式调用 `hindsight_recall` 也未找到内容，记忆库很可能没有预期数据。

### 如需深入 CLI 之外排查，可以阅读什么？ {#where-can-i-learn-more-if-i-want-to-debug-deeper-than-the-cli}

从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始，再阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。如果想了解其他自动注入记忆的实例，可以参考 [OpenClaw 集成文档](/sdks/integrations/openclaw)。

## 后续步骤 {#next-steps}

- [创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)，无需考虑本地守护进程因素，即可快速开始记忆测试。
- 排查实际问题时，保持 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)在手边。
- 如需在进一步排查前建立更简单的配置基线，请阅读[快速入门指南](/developer/api/quickstart)。
- 使用[记忆召回 API 参考](/developer/api/recall)，了解正常召回应返回什么。
- 使用[记忆存储 API 参考](/developer/api/retain)，理解预期信息为何可能从未存储。
- 如果问题出现在迁移后，请对照[指南：从 hindsight-hermes 迁移到 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)检查配置。
