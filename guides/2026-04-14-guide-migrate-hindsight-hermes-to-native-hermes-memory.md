---
title: "指南：从 hindsight-hermes 迁移到 Hermes 原生记忆"
authors: [benfrank241]
date: 2026-04-14
tags: [how-to, hermes, memory, migration]
description: "了解如何从 hindsight-hermes 迁移到 Hermes 原生记忆并保留记忆库，再验证召回、工具及跨会话记忆仍正常工作。"
image: /img/blog/guide-migrate-hindsight-hermes-to-native-hermes-memory.png
hide_table_of_contents: true
---

![指南：从 hindsight-hermes 迁移到 Hermes 原生记忆](/img/blog/guide-migrate-hindsight-hermes-to-native-hermes-memory.png)

如果需要**从 `hindsight-hermes` 迁移到 Hermes 原生记忆**，实际工作比看起来少。Hermes 现在内置 Hindsight 提供商，不再需要原始配置指南中的旧 pip 插件路径。多数情况下，只需卸载旧插件包、让 Hermes 使用原生提供商、保持相同的记忆库 ID，再验证下一轮自动召回即可。

保持相同记忆库很重要。许多团队担心迁移意味着从头重建记忆、重新教导智能体，或者手动导入导出数据。通常这些都不需要。如果旧配置已经把记忆存入 Hindsight，记忆库就已存在。只要保留相同的后端和 `bank_id`，原生提供商就能继续使用它。

本指南介绍安全的迁移步骤，包括备份当前配置、干净地卸载已弃用插件、切换到 Hermes 原生 Hindsight 提供商、验证召回和工具，以及修复常见迁移错误。操作时如需更完整的配置参考，可以在其他标签页打开 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)和 [Hindsight 文档首页](/)。

<!-- truncate -->

> **快速解答**
>
> 1. 备份当前 Hermes 和 Hindsight 配置。
> 2. 从 Hermes 的 Python 环境卸载 `hindsight-hermes`。
> 3. 运行 `hermes plugins install hindsight`，再运行 `hermes memory setup` 并选择 `hindsight`，或手动更新原生配置。
> 4. 如需保留现有记忆，请保持相同的 `bank_id`。
> 5. 运行 `hermes memory status`，然后在下一轮而非同一轮测试召回。

## 前提条件 {#prerequisites}

开始前，确认自己属于哪种迁移来源：

- **旧插件配置**：来自早期 `hindsight-hermes` 指南，包安装在 Hermes 虚拟环境中，并通过 Python 入口点注册。
- **Hindsight Cloud 后端**：记忆已在 Hindsight Cloud 中，Hermes 通过 API 密钥访问。
- **本地 Hindsight 后端**：记忆在本地 Hindsight 服务中，Hermes 通过 URL 指向它。

你还需要：

- 已安装且正常工作的 Hermes。
- 可查看的当前 Hindsight 配置。
- 旧插件使用的同一个 API 密钥或本地后端的访问权限。
- 几条可用于迁移后测试的已知记忆。

如果不确定是否安装了旧插件，检查 Hermes 使用的 Python 环境：

```bash
$HOME/.hermes/hermes-agent/venv/bin/python -m pip show hindsight-hermes
```

如果命令输出包元数据，基本可以确定你仍在使用旧插件路径。

开始前也建议浏览新版 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门](/developer/api/quickstart)和[记忆存储 API 参考](/developer/api/retain)，以便核对切换后的存储与召回行为。

## 分步操作 {#step-by-step}

### 1. 修改前备份当前配置 {#1-back-up-your-current-config-before-you-touch-anything}

迁移通常很直接，但复制即将修改的文件是成本最低的保障。先备份 Hermes 环境文件和 Hindsight 配置目录：

```bash
mkdir -p ~/hermes-memory-migration-backup
cp -R ~/.hermes ~/hermes-memory-migration-backup/hermes
cp -R ~/.hindsight ~/hermes-memory-migration-backup/hindsight 2>/dev/null || true
```

使用云端模式时，备份主要是为了操作方便。记忆保存在远端，关键是保持相同的 API 凭据和记忆库 ID。使用本地后端时，备份更重要，因为它提供配置和运行日志的快速回退点。

迁移前也应查看当前 Hindsight 配置。最重要的值通常是：

- Hindsight API 地址。
- 记忆库 ID。
- 使用云端还是本地模式。
- 旧插件写入的是共享记忆库还是个人记忆库。

如果 Hermes 已有原生配置文件，直接查看：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
print(path)
if path.exists():
    print(path.read_text())
else:
    print("尚无 Hermes 原生 Hindsight 配置")
PY
```

如果旧配置依赖环境变量，也查看 `~/.hermes/.env`：

```bash
grep '^HINDSIGHT_' ~/.hermes/.env || true
```

记下当前 `bank_id`。重用这个记忆库，才能保留现有记忆历史。

### 2. 从 Hermes 环境移除已弃用插件包 {#2-remove-the-deprecated-plugin-package-from-the-hermes-environment}

旧 `hindsight-hermes` 路径已弃用。Hermes 现在提供原生提供商，应避免两种方式互相争夺职责。从 Hermes 使用的同一个 Python 环境卸载插件：

```bash
uv pip uninstall hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python
```

如果不使用 `uv`，也可以这样操作：

```bash
$HOME/.hermes/hermes-agent/venv/bin/python -m pip uninstall -y hindsight-hermes
```

新提供商可以与同一后端共存，为什么仍要卸载？因为目标是统一记忆路径、配置入口和排查方式。保留旧插件会使问题更难定位：召回缺失可能来自旧注册路径、新提供商配置，或两者的冲突。

卸载后，确认 Hermes 不再发现插件入口点：

```bash
$HOME/.hermes/hermes-agent/venv/bin/python - <<'PY'
import importlib.metadata
for ep in importlib.metadata.entry_points(group='hermes_agent.plugins'):
    print(f"{ep.name}: {ep.value}")
PY
```

如果仍看到 `hindsight` 入口，很可能卸载时使用了错误的环境。

### 3. 配置原生 Hindsight 提供商 {#3-configure-the-native-hindsight-provider}

最简单的方式是配置向导：

```bash
hermes plugins install hindsight
hermes memory setup           # select "hindsight"
```

出现提示时，选择 **Hindsight** 提供商。如果使用 Hindsight Cloud，输入之前使用的 API URL 和 API 密钥。如果使用本地模式，让 Hermes 指向同一个本地后端，或在向导中选择本地模式，以创建预期的原生配置。

如果更喜欢手动配置，请设置提供商，并写入 Hermes 后续应使用的相同凭据：

```bash
hermes config set memory.provider hindsight
printf '%s\n' 'HINDSIGHT_API_KEY=your-key' >> ~/.hermes/.env
printf '%s\n' 'HINDSIGHT_API_URL=https://api.hindsight.vectorize.io' >> ~/.hermes/.env
```

然后确认原生配置已存在：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
print(json.dumps(cfg, indent=2))
PY
```

如果保留现有记忆库，确认 `bank_id` 与原配置相同。这是容易遗漏的关键细节。记忆归属于 Hindsight 记忆库，而非已弃用插件包。只要新提供商指向同一后端和同一记忆库 ID，就能继续使用同一存储。

最小的原生云端配置如下：

```json
{
  "mode": "cloud",
  "api_url": "https://api.hindsight.vectorize.io",
  "api_key": "hsk_your_token",
  "bank_id": "hermes"
}
```

最小的原生本地配置如下：

```json
{
  "mode": "local",
  "llm_provider": "groq",
  "llm_api_key": "your-groq-key",
  "bank_id": "hermes"
}
```

如果想深入理解提供商在存储和召回期间的工作方式，可以阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。

### 4. 决定是否禁用 Hermes 内置记忆存储 {#4-decide-whether-to-disable-hermess-built-in-memory-store}

原生 Hindsight 提供商通过生命周期钩子自动召回，也可提供显式 Hindsight 工具。Hermes 仍保留内置存储，会向本地写入 Markdown 笔记（`MEMORY.md` 和更精简的 `USER.md` 用户档案）。如果两者同时启用，模型可能习惯性地继续使用内置路径。

如果希望 Hindsight 成为唯一记忆路径，关闭文件存储：

```bash
hermes config set memory.memory_enabled false
hermes config set memory.user_profile_enabled false
```

两项都设为 `false` 后，内置 `memory` 工具会从智能体中完全移除。迁移后这样做尤其有助于消除歧义：测试存储和召回时，可以确定结果来自 Hindsight，而非旧 Markdown 路径。

之后随时可以把相同标志设回 `true` 来恢复。

### 5. 设置实际需要的集成模式 {#5-set-the-integration-mode-you-actually-want}

原生提供商支持 `hybrid`、`context` 和 `tools`。迁移后，`hybrid` 通常是最稳妥的默认选择，因为它同时提供自动上下文注入和显式工具。

使用这个小脚本显式设置模式：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
cfg = json.loads(path.read_text())
cfg["memory_mode"] = "hybrid"
cfg.setdefault("prefetch_method", "recall")
path.write_text(json.dumps(cfg, indent=2) + "\n")
print(f"已更新 {path}")
PY
```

如果旧配置仅依赖显式工具，`tools` 可能更贴近旧使用方式。如果希望终端用户体验更轻松，让相关记忆无需模型决定搜索就自动出现，通常应选择 `hybrid` 或 `context`。

### 6. 执行实际迁移测试 {#6-run-a-real-migration-test}

不要只看 `status`。测试用户真正关心的跨会话记忆。

启动 Hermes 并存储一条简单事实：

```text
记住，我们的发布日期是 5 月 21 日，API 推出依赖计费迁移。
```

然后在**下一轮**或新会话中追问：

```text
你还记得哪些关于发布计划的信息？
```

下一轮这个细节很重要。Hindsight 在回复后异步存储记忆，提供商在下一轮前执行预取。如果在同一轮存储和召回，可能把系统的正常行为误判成迁移失败。

## 验证是否正常 {#verifying-it-works}

分层验证，不要只依赖一项检查。

### `hermes memory status` {#hermes-memory-status}

从最直接的检查开始：

```bash
hermes memory status
```

确认 Hermes 将 Hindsight 提供商视为已启用。如果不是，先修复这一点，再测试其他功能。

### 查看配置 {#config-inspection}

确认配置过程中重要值没有改变：

- `mode`
- `bank_id`
- `memory_mode`
- `prefetch_method`

最快的检查方式是：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get("HERMES_HOME", pathlib.Path.home() / ".hermes"))
path = base / "hindsight" / "config.json"
print(json.dumps(json.loads(path.read_text()), indent=2))
PY
```

### 工具可见性 {#tool-visibility}

使用 `hybrid` 或 `tools` 时，启动 Hermes 并查看可用工具。列表中应出现 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。

### 跨会话行为 {#cross-session-behavior}

这是真正的成功标准。告诉 Hermes 一条容易识别的信息，然后在下一轮或新会话查询。如果记忆库 ID 和后端保持一致，迁移后就应该保留记忆历史。

### 本地后端健康状态 {#local-backend-health}

使用本地模式时，验证守护进程可达：

```bash
curl http://localhost:9077/health
```

健康响应说明提供商确实能连接后端。使用云端模式时，正常的 `hermes memory status` 结果加上成功的实际召回，是更好的信号。

## 排查常见迁移问题 {#troubleshooting-common-migration-problems}

### 问题：提供商已配置，却没有自动召回 {#problem-the-provider-is-configured-but-nothing-is-recalled-automatically}

检查 `memory_mode`。如果设为 `tools`，按设计会关闭自动召回，模型必须显式调用 `hindsight_recall`。如果希望每轮前自动注入记忆，切换为 `hybrid` 或 `context`。

### 问题：卸载后旧插件仍然出现 {#problem-the-old-plugin-still-appears-after-uninstall}

很可能卸载时使用了错误的 Python 环境。使用准确的 Hermes 虚拟环境路径重新卸载：

```bash
$HOME/.hermes/hermes-agent/venv/bin/python -m pip uninstall -y hindsight-hermes
```

然后重新运行入口点查看命令。

### 问题：迁移成功，但智能体似乎什么都不记得 {#problem-the-migration-succeeded-but-the-agent-seems-to-remember-nothing}

确认新配置与旧配置使用相同的 `bank_id` 和后端。任一项改变，都相当于让 Hermes 使用了另一个大脑。

### 问题：工具出现了，但仍未自动召回 {#problem-tools-show-up-but-auto-recall-still-does-not-happen}

Hermes 文档指出，生命周期钩子需要版本支持 `pre_llm_call` 和 `post_llm_call`。旧版本只注册三个工具。这时提供商部分可用，但跳过了自动注入。

### 问题：本地模式首次启动后看起来异常 {#problem-local-mode-feels-broken-right-after-first-launch}

首次启动本地模式可能较慢，因为嵌入式 Hindsight 服务器和 PostgreSQL 需要初始化。查看启动日志：

```bash
cat ~/.hermes/logs/hindsight-embed.log
```

如果只等了几秒就判定失败，请再等待一段时间后重试。

### 问题：刚存储完记忆就召回失败 {#problem-recall-fails-right-after-retain}

这可能是正常的。记忆存储是异步的，请在下一轮测试。这是迁移期间最容易发生的误报之一。

## 常见问题 {#faq}

### 迁移会丢失现有记忆吗？ {#do-i-lose-my-existing-memories-when-i-migrate}

通常不会。如果旧插件和新提供商指向同一 Hindsight 后端及相同 `bank_id`，使用的就是同一个记忆库。迁移改变集成路径，不改变底层存储的记忆。

### 需要先导出或导入数据吗？ {#do-i-need-to-export-or-import-anything-first}

常规的插件到原生迁移不需要。主要工作是更改配置，而非转换数据。

### 应该保持相同的记忆库 ID 吗？ {#should-i-keep-the-same-bank-id}

如果希望延续记忆，应该如此。只有明确需要全新记忆库时才更改 ID。

### 还需要 Hermes 内置 `memory` 工具吗？ {#do-i-still-need-the-built-in-hermes-memory-tool}

不一定。许多团队将其禁用，让 Hindsight 成为持久记忆的唯一事实来源，使测试和排查更加清晰。

### 迁移后最佳模式是什么？ {#what-is-the-best-mode-after-migration}

大多数用户应以 `hybrid` 作为稳妥默认值，同时获得自动召回和显式工具。如果需要无感记忆、不向模型暴露工具，使用 `context`；如果只需要手动检索，使用 `tools`。

### 哪里有更完整的配置参考？ {#where-should-i-go-if-i-want-a-more-complete-setup-reference}

可以查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。如果想比较其他智能体集成的共享记忆方式，[OpenClaw 集成文档](/sdks/integrations/openclaw)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)也很有参考价值。

## 后续步骤 {#next-steps}

- [创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)，使用托管后端快速完成迁移。
- 阅读 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)，了解完整配置选项。
- 如需简明的端到端 Hindsight 回顾，阅读[快速入门指南](/developer/api/quickstart)。
- 需要理解自动召回实际返回什么时，使用[记忆召回 API 参考](/developer/api/recall)。
- 需要调整记忆库的存储内容时，使用[记忆存储 API 参考](/developer/api/retain)。
- 对照 [OpenClaw 集成文档](/sdks/integrations/openclaw)等相关工作流，了解其他智能体框架如何实现自动记忆注入。
