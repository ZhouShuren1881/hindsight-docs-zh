---
title: "如何排查 Hermes 记忆无法召回上下文的问题"
authors: [benfrank241]
date: 2026-04-14
tags: [how-to, hermes, memory, troubleshooting]
description: "排查 Hermes 记忆无法召回上下文的问题。检查模式、后端状态、生命周期钩子、日志和异步存储时机，恢复自动召回。"
image: /img/blog/guide-debug-hermes-memory-not-recalling-context.png
hide_table_of_contents: true
---

![如何排查 Hermes 记忆无法召回上下文的问题](/img/blog/guide-debug-hermes-memory-not-recalling-context.png)

排查 **Hermes 记忆无法召回上下文**时，通常有五类原因：Hermes 处于错误的记忆模式、后端不健康、原生钩子未启用、新记忆尚未完成存储，或模型仍在使用错误的记忆路径。

令人困扰的是，系统表面上似乎一切正常，实际使用时却会失败。`hermes memory status` 可能显示提供方已配置，工具列表中也可能出现 Hindsight 工具，配置文件看起来也没有问题，但智能体的回答仍像是没有记忆。这通常说明问题出在实际行为，而不只是配置：模式、预期或时机不匹配，都可能让正常的基础设施显得像是坏了。

本指南按可靠的顺序带你排查：检查当前模式、确认 Hindsight 后端可以访问、验证自动召回钩子是否可用、实际执行跨轮记忆测试、查看日志，并处理最常见的召回缺失原因。排查时如需完整配置参考，可同时打开 [Hermes 集成文档](/sdks/integrations/hermes)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `hermes memory status`，确认 Hindsight 处于启用状态。
> 2. 检查 `memory_mode`；`tools` 模式按设计不会自动召回。
> 3. 确认 Hindsight 后端健康，且记忆库中确有记忆。
> 4. 在一轮测试存入记忆，在下一轮测试召回，不要紧接着测试。
> 5. 检查 Hermes 是否支持原生生命周期钩子。
> 6. 查看日志；如果内置 `memory` 工具干扰模型判断，调试时将其禁用。

## 前提条件 {#prerequisites}

开始排查前，先确认你使用的是原生 Hindsight 记忆提供方，而不是较早的混合配置。

你需要具备：

- 已安装且能正常启动的 Hermes。
- 配置完成的 Hindsight 提供商。
- 能访问运行 Hermes 的机器。
- 至少一条已知事实，可用于测试。

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

如果你还不熟悉 Hindsight 的检索和存入行为，可以先阅读 [Recall API 参考](/developer/api/recall)和 [Retain API 参考](/developer/api/retain)。这两份文档说明了为什么记忆存入成功后，系统仍可能没有在你预期的时机提供上下文。

## 分步操作 {#step-by-step}

### 1. 首先检查 `memory_mode` {#1-check-memory_mode-first}

这是最常见的困惑原因。

Hermes 支持三种 Hindsight 记忆模式：

- `hybrid`：自动召回，并提供显式工具。
- `context`：仅自动召回。
- `tools`：仅提供显式工具。

如果配置中设为 `tools`，系统就不会自动召回。模型必须显式调用 `hindsight_recall` 或 `hindsight_reflect`。很多人看到没有自动注入上下文就以为召回坏了，其实系统只是在按所选模式运行。

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
print(f"Updated {path} to hybrid mode")
PY
```

如果你想深入了解不同模式的选择，可阅读专门介绍 [Hermes 与 Hindsight 记忆模式](/guides/2026/04/14/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools)的指南。

### 2. 确认后端健康 {#2-confirm-the-backend-is-healthy}

Hermes 如果无法连接 Hindsight，召回当然无法工作。

对于**本地模式**，直接测试嵌入式服务器：

```bash
curl http://localhost:9077/health
```

本地 API 应返回健康状态。如果连接被拒绝，或进程仍在启动，即使 Hermes 本身运行正常，召回仍可能失败。

对于**云端模式**，最快的状态信号仍然是 `hermes memory status`；还要检查环境文件中是否包含必需的值：

```bash
grep '^HINDSIGHT_' ~/.hermes/.env || true
```

如果缺少 API 密钥或 URL，Hermes 可能看似完成了初始化，实际上却没有可用后端。

如果使用本地模式，且需要更全面的配置参考，可在排查时随手查阅 [Hermes 集成文档](/sdks/integrations/hermes)和[快速入门指南](/developer/api/quickstart)。

### 3. 检查记忆是否确实存入 {#3-test-whether-retention-is-succeeding-at-all}

Recall 只能返回记忆库中已有的内容。人们常常会在一个从未存入过有用信息的记忆库中测试召回，这种情况比想象中更常见。

做一次严格受控的测试。

在 Hermes 的一轮对话中，告诉它一条容易识别的信息：

```text
Remember that the billing freeze ends Friday and the onboarding rewrite is blocked on analytics events.
```

等回复完成，然后在**下一轮**提问：

```text
What do you remember about the billing freeze?
```

必须等到下一轮，这一点很重要。Hindsight 会在助手回复后异步存入记忆，然后才让新记忆可供后续检索。如果存入后就在同一轮立即验证，就可能把正常的异步行为误判为系统故障。

如果想做更严格的测试，并且工具可用，可要求 Hermes 显式检索记忆：

```text
Use hindsight_recall and tell me what you know about the billing freeze.
```

这有助于区分两种不同的问题：

- 记忆库中没有可召回的数据。
- 存在可召回的数据，但没有发生自动注入。

### 4. 检查 Hermes 是否具备原生生命周期钩子 {#4-check-whether-hermes-has-the-native-lifecycle-hooks}

Hermes 文档特别说明：自动召回和自动存入依赖 `pre_llm_call`、`post_llm_call` 等生命周期钩子。在旧版 Hermes 中，Hindsight 工具可能仍会注册，但自动注入可能被跳过。

这会产生特定的故障表现：

- 工具列表中存在 `hindsight_recall`。
- 显式工具调用有效。
- 没有自动注入上下文。

如果这符合你的情况，问题很可能出在 Hermes 版本，而不是 Hindsight 配置有误。

可根据以下症状快速判断：

- 显式调用 `hindsight_recall` 有效，但在 `hybrid` 或 `context` 模式下，记忆从未自动出现；
- 后端健康；
- 记忆库中明确有数据。

如果以上情况都成立，很可能是缺少钩子支持。

### 5. 检查模型是否使用了错误的记忆路径 {#5-check-whether-the-model-is-using-the-wrong-memory-path}

Hermes 仍有内置记忆存储，会把 Markdown 笔记写入本地的 `MEMORY.md`，并把更精简的用户档案写入 `USER.md`。如果这些功能仍处于启用状态，模型可能会继续使用它们，而不是 Hindsight。这样就会让人困惑：助手看似在存入记忆，实际却没有写入你正在排查的存储路径。

测试时先关闭这两种文件存储：

```bash
hermes config set memory.memory_enabled false
hermes config set memory.user_profile_enabled false
```

然后重新执行受控的存入和召回测试，排除这个很容易造成误判的因素。

如果之后决定在某个工作流中重新启用内置存储，只需把同样的标志设回 `true`。

### 6. 查看日志，避免猜测 {#6-inspect-logs-instead-of-guessing}

查看日志，可以把模糊的记忆问题定位为明确的系统问题。

如果本地模式启动异常，查看嵌入式守护进程日志：

```bash
cat ~/.hermes/logs/hindsight-embed.log
```

如果 Hindsight 在运行时出错，查看当前配置档案对应的日志：

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
print(f"Enabled debug logging in {path}")
PY
```

随后重启 Hermes，再复现问题。

日志尤其有助于区分以下情况：

- 提供方从未完成初始化；
- 后端无法访问；
- 记忆已存入，但召回没有找到相关内容；
- 预取已经运行，但模型的回答仍然不理想。

### 7. 核对记忆库 ID {#7-verify-the-bank-id-is-the-bank-you-think-it-is}

有时召回本身没有问题，只是 Hermes 指向了错误的记忆库。这种情况最常见于迁移之后，或有人手动编辑配置之后。

直接打印记忆库 ID：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
print("bank_id:", cfg.get("bank_id"))
PY
```

如果记忆库选错了，Hermes 并没有召回失败，而是从错误的位置检索了记忆。

因此，迁移指南会特别强调：从旧插件路径迁移时，应继续使用同一个记忆库。具体步骤请参阅[指南：从 hindsight-hermes 迁移到 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)。

## 验证是否正常 {#verifying-it-works}

修复疑似问题后，按层次逐项验证。

### 状态 {#status}

```bash
hermes memory status
```

状态中应显示 Hindsight 处于启用状态。

### 配置合理性 {#config-sanity}

确认：

- `memory_mode` 是你预期的值。
- `prefetch_method` 是你预期的值。
- `bank_id` 正确。
- 后端设置与实际情况一致。

### 受控的下一轮测试 {#controlled-next-turn-test}

提供一条新的事实，然后在下一轮询问它。不要依赖先前对话中模糊的印象。

### 显式召回测试 {#explicit-recall-test}

如果能看到相关工具，就让 Hermes 直接调用 `hindsight_recall`。如果显式调用有效、自动召回却无效，问题几乎总是出在模式选择或钩子是否可用。

### 用户体验测试 {#ux-test}

最后，测试你真正关心的行为。在一段真实对话中自然地提出后续问题，看看 Hermes 能否直接依据正确的上下文作答，而无需你重新复述信息。

## 排查常见故障模式 {#troubleshooting-common-failure-patterns}

### 表现：`hermes memory status` 正常，但从不自动召回 {#pattern-hermes-memory-status-is-fine-but-auto-recall-never-happens}

最可能的原因包括：

- `memory_mode` 设为 `tools`；
- Hermes 不支持所需钩子；
- 记忆库中还没有有用的记忆。

### 表现：显式调用 `hindsight_recall` 有效，但普通回复像没有状态 {#pattern-explicit-hindsight_recall-works-but-normal-replies-feel-stateless}

最可能的原因包括：

- 自动召回模式已关闭；
- 缺少钩子支持；
- 虽然配置了 `prefetch_method`，但你期待的是同一轮就返回结果。

### 表现：本地模式仅首次启动失败 {#pattern-local-mode-fails-only-on-first-start}

最可能的原因是：

- 嵌入式 Hindsight 和 PostgreSQL 仍在初始化。

在认定整个配置都无法使用之前，先检查 `~/.hermes/logs/hindsight-embed.log`。

### 表现：昨天记忆正常，今天却不一致 {#pattern-memory-was-working-yesterday-now-it-feels-inconsistent}

最可能的原因包括：

- 配置已更改；
- 记忆库 ID 已更改；
- 模型又开始使用 Hermes 内置的 `memory` 工具；
- `~/.hermes/.env` 中的某项后端凭据已丢失。

### 表现：模型似乎忽视了明显相关的历史 {#pattern-the-model-seems-to-ignore-obviously-relevant-history}

即使召回在技术上运行正常，也可能出现这种情况。此时问题可能在于相关性判断或提示词的使用，而不是提供方故障。[Recall API 参考](/developer/api/recall)可以帮助你理解 Hindsight 如何判断哪些内容相关。

## 常见问题 {#faq}

### 为什么存储记忆后立即测试召回会失败？ {#why-does-recall-fail-when-i-test-it-right-after-storing-a-memory}

因为 Retain（存入）是异步的。新记忆会在之后的轮次中可用，不会在同一轮立即出现。

### 为什么能看到 Hindsight 工具，却没有自动上下文？ {#why-do-i-see-hindsight-tools-but-no-automatic-context}

通常是因为 Hermes 版本较旧，不支持原生生命周期钩子；也可能是 `memory_mode` 设为了 `tools`。

### `tools` 模式意味着 Hindsight 出错了吗？ {#does-tools-mode-mean-hindsight-is-broken}

不是。这表示模型必须自行决定是否显式调用记忆工具。

### 应该禁用 Hermes 内置 `memory` 工具吗？ {#should-i-disable-hermess-built-in-memory-tool}

调试期间应当禁用，这样可以排除歧义。召回稳定后，你可以再决定是否启用该工具。

### 如何判断是记忆库为空还是召回失效？ {#how-do-i-know-whether-the-bank-is-empty-or-recall-is-broken}

进行一次受控的记忆存入测试，等回复完成后，在下一轮查询新事实。如果显式调用 `hindsight_recall` 也找不到内容，记忆库中很可能没有预期的数据。

### 如需深入 CLI 之外排查，可以阅读什么？ {#where-can-i-learn-more-if-i-want-to-debug-deeper-than-the-cli}

先阅读 [Hermes 集成文档](/sdks/integrations/hermes)，然后查看 [Recall API 参考](/developer/api/recall)和 [Retain API 参考](/developer/api/retain)。如果还想看自动注入记忆的另一个实例，可以对照 [OpenClaw 集成文档](/sdks/integrations/openclaw)。

## 后续步骤 {#next-steps}

- 如果想最快开始测试记忆，同时避免本地守护进程配置带来的干扰，可以[创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)。
- 实际排查问题时，可随时查阅 [Hermes 集成文档](/sdks/integrations/hermes)。
- 想先建立一个更简单的配置基线，再继续排查，可阅读[快速入门指南](/developer/api/quickstart)。
- 通过 [Recall API 参考](/developer/api/recall)了解召回正常时应该返回什么。
- 通过 [Retain API 参考](/developer/api/retain)分析预期信息为何可能从未被存入。
- 如果问题始于迁移之后，请将配置与[指南：从 hindsight-hermes 迁移到 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)进行对照。
