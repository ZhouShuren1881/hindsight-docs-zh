---
title: "指南：使用 Hindsight 为 NemoClaw 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, nemoclaw, agents, memory]
description: "使用 hindsight-nemoclaw setup 命令为 NemoClaw 添加记忆，让沙箱中的 OpenClaw 智能体无需修改代码即可召回过去的会话并存入新对话。"
image: /img/guides/guide-nemoclaw-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 NemoClaw 添加记忆](/img/guides/guide-nemoclaw-memory-with-hindsight.svg)

如果要为 **NemoClaw 添加 Hindsight 记忆**，最简便的方式是运行 `hindsight-nemoclaw` 命令。NemoClaw 会在 OpenShell 沙箱中运行 OpenClaw，并实施严格的网络出站策略。这个软件包通过一条命令自动完成全部设置：安装 `hindsight-openclaw` 插件、配置外部 API 模式、将 Hindsight 出站规则合并到沙箱策略中，并重启网关。整个过程无需修改代码。

这很适合 NemoClaw，因为沙箱会严格限制网络出站访问——每个出站端点都必须明确获准。`hindsight-openclaw` 插件支持外部 API 模式，在该模式下会跳过本地守护进程，直接通过 HTTPS 调用 Hindsight Cloud。这样一来，插件就成了轻量级 HTTP 客户端，沙箱只需添加一条允许访问 Hindsight API 的出站规则。

本指南会介绍如何运行设置命令、了解插件如何挂接到 OpenClaw 网关的生命周期、选择记忆库策略，以及如何快速验证记忆确实在使用。操作时可将[文档首页](/)和[快速入门指南](/developer/api/quickstart)放在手边。

<!-- truncate -->

> **快速解答**
>
> 1. 注册 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并获取 API 密钥。
> 2. 运行 `npx @vectorize-io/hindsight-nemoclaw setup --sandbox <name> --api-token <key> --bank-prefix <prefix>`。
> 3. 该命令会安装 `hindsight-openclaw` 插件、应用出站策略并重启网关。
> 4. 记忆会存入名为 `<prefix>-openclaw` 的记忆库。
> 5. 验证后续会话能否召回先前会话存入的内容。

## 先决条件 {#prerequisites}

开始之前，请确保你具备以下条件：

- 已安装并正常运行 `openshell` 和 `openclaw` 的 NemoClaw 沙箱
- Hindsight API 令牌，可从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 获取，也可使用自托管服务器的令牌
- 更新沙箱网络策略的权限；如果由你手动管理策略，也可以使用 `--skip-policy`

## 第 1 步：运行设置命令 {#step-1-run-the-setup-command}

这条一键设置命令会安装并配置所有内容：

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

你会看到类似以下输出：

```
[0] Preflight checks...
  ✓ openshell found
  ✓ openclaw found

[1] Installing @vectorize-io/hindsight-openclaw plugin...
  ✓ Plugin installed

[2] Configuring plugin in ~/.openclaw/openclaw.json...
  ✓ Plugin config written (bank: my-sandbox-openclaw)

[3] Applying Hindsight network policy to sandbox "my-assistant"...
  ✓ Policy version 2 submitted
  ✓ Policy version 2 loaded (active version: 2)

[4] Restarting OpenClaw gateway...
  ✓ Gateway restarted

✓ Setup complete!
```

如果想先预览所有更改再应用，可以先使用 `--dry-run`。

## 第 2 步：了解设置步骤 {#step-2-understand-the-setup-steps}

设置命令会执行以下五个步骤：

1. **预检** — 验证是否已安装 `openshell` 和 `openclaw`
2. **安装插件** — 运行 `openclaw plugins install @vectorize-io/hindsight-openclaw`
3. **配置插件** — 将外部 API 模式配置写入 `~/.openclaw/openclaw.json`
4. **应用策略** — 读取当前沙箱策略，合并 Hindsight 出站规则，然后通过 `openshell policy set` 重新应用
5. **重启网关** — 运行 `openclaw gateway restart`

由于 `openshell policy set` 会替换整个策略文档，设置命令会先导出当前策略，再合并 Hindsight 规则，因此不会丢失现有规则。

## 第 3 步：选择记忆库策略 {#step-3-choose-a-bank-strategy}

插件配置决定记忆库的命名方式和隔离方式：

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `hindsightApiUrl` | 字符串 | — | Hindsight API 基础 URL |
| `hindsightApiToken` | 字符串 | — | 用于 API 身份验证的令牌 |
| `llmProvider` | 字符串 | 自动检测 | 用于提取记忆的 LLM 提供方 |
| `dynamicBankId` | 布尔值 | `false` | 按用户隔离记忆（`true`），或让各会话共享记忆（`false`） |
| `bankIdPrefix` | 字符串 | `"nemoclaw"` | 记忆库名称前缀 |

当 `dynamicBankId: false` 时，所有会话都会写入同一个名为 `{bankIdPrefix}-openclaw` 的记忆库。当 `dynamicBankId: true` 时，每位用户都会获得独立的记忆库，这适用于多租户部署。

设置 `llmProvider: "claude-code"` 后，记忆提取会使用沙箱中已有的 Claude Code 进程，因此无需额外的 API 密钥。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

设置完成后，`hindsight-openclaw` 插件会在 OpenClaw 网关生命周期的两个时点挂接：

- **召回（`before_agent_start`）：** 从过去的会话中召回相关记忆，并将其注入上下文。
- **存入（`agent_end`）：** 智能体结束运行时，将对话存入 Hindsight 记忆库。

沙箱不会妨碍这两个步骤——它会将 Hindsight 调用视为发往获准端点的普通 HTTPS 出站请求。若要了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

设置完成后，检查网关日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

启动时，你应该会看到：

```
[Hindsight] Plugin loaded successfully
[Hindsight] ✓ Using external API: https://api.hindsight.vectorize.io
[Hindsight] External API health: {"status":"healthy","database":"connected"}
[Hindsight] Default bank: my-sandbox-openclaw
[Hindsight] ✓ Ready (external API mode)
```

进行一次对话后：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] agent_end triggered - bank: my-sandbox-openclaw
[Hindsight] Retained 6 messages to bank my-sandbox-openclaw for session agent:main:...
```

如果会话结束后出现存入记录，并且后续会话能召回其中的上下文，就说明设置已正常工作。

## 常见错误 {#common-mistakes}

### 手动应用策略时以为会自动合并 {#expecting-policy-merge-when-applying-manually}

`openshell policy set` 会替换整个策略文档。设置命令会自动处理这一点；如果你自行应用策略，请先导出现有策略，以免丢失已有规则。

### 在 macOS 上通过符号链接安装插件 {#symlinked-plugin-install-on-macos}

在 macOS 上，OpenClaw 网关会以 LaunchAgent 运行，并处于受限的安全上下文中。`openclaw plugins install --link` 会创建符号链接，而 LaunchAgent 无法跟随该链接。如果你在网关日志中看到 `EPERM: operation not permitted, scandir`，请改用副本安装；设置命令正是这样做的。

### 过早测试记忆存入 {#testing-retain-too-early}

事实提取和实体解析会在存入后于后台进行。如果刚结束一个会话就立即开启新会话，最近的记忆可能尚未建立索引——通常需要几秒钟。

### 以为二进制升级后出站规则仍然有效 {#assuming-egress-survives-binary-upgrades}

网络策略中的 `binaries` 字段会将出站规则限定到特定的可执行文件路径。如果 OpenClaw 更新后路径发生变化，该规则会悄然失效。升级后请检查二进制文件路径。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。你可以通过 `--api-url`（或在配置中设置 `hindsightApiUrl`）将插件指向自托管的 Hindsight 服务器。Hindsight Cloud 很适合沙箱，因为只需一条 HTTPS 出站规则即可访问。

### 这需要修改沙箱代码吗？ {#does-this-require-code-changes-to-my-sandbox}

不需要。设置命令会安装插件、写入配置、应用出站策略并重启网关，无需修改代码。

### 记忆的作用范围如何确定？ {#how-is-memory-scoped}

作用范围由记忆库决定。使用 `dynamicBankId: false` 时，所有会话共享一个 `{bankIdPrefix}-openclaw` 记忆库；使用 `dynamicBankId: true` 时，每位用户都有独立的记忆库。

### 如果我手动管理沙箱策略怎么办？ {#what-if-i-manage-sandbox-policies-manually}

传入 `--skip-policy` 以跳过网络策略更新，然后自行将 Hindsight 出站规则添加到策略中。

## 后续步骤 {#next-steps}

- 如果你需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [NemoClaw 集成文档](/sdks/integrations/nemoclaw)
