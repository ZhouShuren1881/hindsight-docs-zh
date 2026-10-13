---
title: "指南：用Hindsight添加NemoClaw记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, nemoclaw, agents, memory]
description: "使用后视-nemoclaw设置命令添加NemoClaw记忆与Hindsight，因此沙箱化OpenClaw智能体记忆召回过去的会话和记忆存储新的对话，无需更改代码。"
image: /img/guides/guide-nemoclaw-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 NemoClaw 添加记忆](/img/guides/guide-nemoclaw-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 NemoClaw 添加记忆**，使用 `hindsight-nemoclaw` 命令。NemoClaw 在网络出站策略严格的 OpenShell 沙箱内运行 OpenClaw。这个包用一个命令完成安装插件、配置外部 API、合并 Hindsight 出站规则和重启网关，无需更改代码。

这非常适合NemoClaw因为沙箱强制执行严格的网络出口 — 每个出站端点都必须得到明确允许。 `hindsight-openclaw`插件支持外部API模式，它跳过本地守护进程并直接进行 HTTPS 调用Hindsight Cloud。这使得插件变得很薄HTTP客户端，因此唯一需要的沙箱更改是一个出口规则HindsightAPI。

本指南逐步介绍如何运行安装命令，了解插件如何挂接到OpenClaw网关生命周期，选择记忆库策略，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> ​​1。报名[Hindsight Cloud](https://ui.hindsight.vectorize.io) 并获得API键。
> 2.运行`npx @vectorize-io/hindsight-nemoclaw setup --sandbox <name> --api-token <key> --bank-prefix <prefix>`。
> 3.该命令安装 `hindsight-openclaw`插件，应用出口策略，并重新启动网关。
>4. 记忆存入名为`<prefix>-openclaw`。
> 5.验证后续会话是否能回忆起先前会话存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- ANemoClaw沙箱与 `openshell` 和 `openclaw` 安装并工作
- AHindsightAPItoken，来自[Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管服务器
- 能够更新沙箱网络策略（或使用`--skip-policy`（如果您手动管理策略）

## 第 1 步：运行安装命令 {#step-1-run-the-setup-command}

单命令安装程序可安装和配置所有内容：

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

您将看到如下输出：

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

使用`--dry-run`。

## 第 2 步：了解设置步骤 {#step-2-understand-the-setup-steps}

设置命令执行五个步骤：

1. **准备检查** — 验证`openshell` 和 `openclaw`已安装
2. **安装插件** — 运行 `openclaw plugins install @vectorize-io/hindsight-openclaw`
3. **配置插件** — 写入外部API模式配置为`~/.openclaw/openclaw.json`
4. **应用策略** — 读取当前沙箱策略，合并Hindsight出口阻塞，并通过重新申请 `openshell policy set`
5. **重启网关** — 运行 `openclaw gateway restart`

设置处理以下事实：`openshell policy set` 替换整个策略文档，因此它首先导出当前策略并合并Hindsight阻止——现有规则不会丢失。

## 第3步：选择记忆库策略 {#step-3-choose-a-bank-strategy}

插件配置控制记忆库的命名和隔离方式：

|选项|类型|默认|说明|
|---|---|---|---|
|`hindsightApiUrl`|字符串|—|Hindsight API 基本 URL|
|`hindsightApiToken`|字符串|—|API 用于身份验证的令牌|
|`llmProvider`|字符串|自动检测|LLM 记忆提取提供商|
|`dynamicBankId`|布尔值|`false`|隔离每个用户的记忆 (`true`）或跨会话分享（`false`)|
|`bankIdPrefix`|字符串|`"nemoclaw"`|记忆库名称的前缀|

当`dynamicBankId: false`，所有会话都写入名为 的单个记忆库 `{bankIdPrefix}-openclaw`。当`dynamicBankId: true`，每个用户都会获得一个独立的记忆库——对于多租户部署很有用。

设置`llmProvider: "claude-code"` 使用Claude Code进程已经存在于沙箱中，所以不需要额外的  记忆提取需要API键。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

设置后，`hindsight-openclaw` 插件挂钩到OpenClaw网关生命周期有两个点：

- **召回（`before_agent_start`）：** 它会回忆过去会话中的相关记忆并将其注入上下文中。
- **存储（`agent_end`）：**当智能体结束时，它会将对话保留给Hindsight记忆库。

沙箱不会干扰任何一步——它会看到Hindsight作为正常 HTTPS 出口调用到允许的端点。对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

设置完成后，检查网关日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

启动时您应该看到：

```
[Hindsight] Plugin loaded successfully
[Hindsight] ✓ Using external API: https://api.hindsight.vectorize.io
[Hindsight] External API health: {"status":"healthy","database":"connected"}
[Hindsight] Default bank: my-sandbox-openclaw
[Hindsight] ✓ Ready (external API mode)
```

对话后：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] agent_end triggered - bank: my-sandbox-openclaw
[Hindsight] Retained 6 messages to bank my-sandbox-openclaw for session agent:main:...
```

如果记忆存储线在会话后出现并且稍后的会话回忆起该上下文，则设置正在工作。

## 常见错误 {#common-mistakes}

### 手动申请时期望策略合并 {#expecting-policy-merge-when-applying-manually}

`openshell policy set` 替换整个保单文件。 setup 命令会自动处理此问题，但如果您自己应用策略，请先导出当前策略，以免丢失现有规则。

### 符号链接插件安装在macOS {#symlinked-plugin-install-on-macos}

开macOS，OpenClaw网关在受限安全上下文下作为 LaunchAgent 运行。 `openclaw plugins install --link` 创建一个 LaunchAgent 无法遵循的符号链接。如果你看到网关日志中的 `EPERM: operation not permitted, scandir`，改为安装为副本 - 这就是安装命令的作用。

### 测试记忆存储太早 {#testing-retain-too-early}

事实提取和实体解析发生在记忆存储之后的后台。如果您在关闭会话后立即打开一个新会话，则最近的记忆可能尚未建立索引 - 通常需要几秒钟。

### 假设出口在二进制升级中幸存下来 {#assuming-egress-survives-binary-upgrades}

网络策略中的 `binaries` 字段将出站规则限定为特定可执行文件路径。更新 OpenClaw 后，路径变化会让规则静默失效。升级后检查二进制路径。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。您可以将该插件指向自托管Hindsight服务器，带有 `--api-url`（或配置中的 `hindsightApiUrl`）。Hindsight Cloud非常适合沙箱，因为它只需要一个 HTTPS 出口规则。

### 这是否需要对我的沙箱进行代码更改？ {#does-this-require-code-changes-to-my-sandbox}

没有。 setup 命令会安装插件、写入配置、应用出口策略并重新启动网关 - 无需更改代码。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

记忆库。与 `dynamicBankId: false` 所有会话共享一个 `{bankIdPrefix}-openclaw`记忆库；与 `dynamicBankId: true` 每个用户都有一个独立的记忆库。

### 如果我手动管理沙盒策略会怎样？ {#what-if-i-manage-sandbox-policies-manually}

通过`--skip-policy` 跳过网络策略更新，然后添加Hindsight自行对您的保单进行出口封锁。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[NemoClaw 集成文档](/sdks/integrations/nemoclaw)
