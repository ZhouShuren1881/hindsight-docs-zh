---
title: "指南：使用 Hindsight 为 OMO（oh-my-openagent）添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, omo, agents, memory]
description: "使用五个生命周期钩子为 OMO（oh-my-openagent）接入 Hindsight 记忆：每次提示前召回上下文，并在每轮结束后存入对话。"
image: /img/guides/guide-omo-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OMO（oh-my-openagent）添加记忆](/img/guides/guide-omo-memory-with-hindsight.svg)

如果你想让 **OMO（oh-my-openagent）使用 Hindsight 记忆**，最简洁的设置方式是安装包含五个钩子的插件。它会接入 OMO 的钩子系统，在每次提示前召回相关记忆，并在每轮结束后存入对话记录。这样，OMO 就能在多个会话之间保留长期记忆，而不必每次开启新会话都从头开始。

OMO 很适合这种方式，因为它会触发生命周期钩子事件：`SessionStart`、`UserPromptSubmit`、`Stop`、`SubagentStop` 和 `SessionEnd`。该插件会使用这五个事件：每当用户提交提示时，它都会查询 Hindsight，并将结果作为 `additionalContext` 注入；随后在停止时读取会话记录，并将其 POST 到 Hindsight。由于 OMO 会把工作委派给子智能体，`SubagentStop` 钩子也会捕获这些子智能体通过委派任务获得的信息。

本指南将介绍如何安装钩子、将 OMO 指向你的 Hindsight 后端、了解按项目隔离记忆库的方式，以及如何快速验证记忆确实在使用。操作时可同时查看[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 在 `hindsight-integrations/omo/` 目录中，将 `hooks/hooks.json`、`scripts/` 目录和 `settings.json` 复制到 `~/.omo/`，并将 `rules/hindsight-memory.md` 复制到项目的 `.omo/rules/` 目录。
> 2. 设置 `HINDSIGHT_API_TOKEN`（Cloud）或 `HINDSIGHT_API_URL`（自托管）。
> 3. 将 `HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN` 和 `HINDSIGHT_BANK_ID` 添加到 `~/.config/opencode/oh-my-openagent.jsonc` 中的 `mcp_env_allowlist`。
> 4. 记忆库默认使用 `omo`；启用 `dynamicBankId` 可按项目隔离。
> 5. 验证后续会话能否记住先前会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保你已具备以下条件：

- 已安装并能正常使用 OMO（[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)）
- 可访问的 Hindsight 后端，可以是 [Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 已安装 Python 3（这些钩子仅使用 Python 标准库，无需运行 `pip install`）

## 第 1 步：安装钩子 {#step-1-install-the-hooks}

在 `hindsight-integrations/omo/` 目录中，全局安装钩子、脚本和设置文件：

```bash
# 钩子（全局）
mkdir -p ~/.omo/hooks
cp hooks/hooks.json ~/.omo/hooks/hindsight-hooks.json

# 脚本和设置（全局）
mkdir -p ~/.omo/plugins/hindsight/scripts
cp -r scripts/ ~/.omo/plugins/hindsight/scripts/
cp settings.json ~/.omo/plugins/hindsight/settings.json
```

然后，从项目根目录安装该项目专用的记忆规则：

```bash
# 规则（每个项目一份；在项目根目录运行）
mkdir -p .omo/rules
cp rules/hindsight-memory.md .omo/rules/hindsight-memory.md
```

该插件没有依赖项，只使用 Python 标准库，因此无需安装任何软件包。

## 第 2 步：将插件指向 Hindsight {#step-2-point-the-plugin-at-hindsight}

使用 Hindsight Cloud 时，设置 API 密钥：

```bash
export HINDSIGHT_API_TOKEN=hsk_your_key_here
```

使用自托管 Hindsight 服务器时，覆盖 API URL：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
```

本地实例无需 API 令牌。你也可以在 `~/.hindsight/omo.json` 中持久设置这些值：

```json
{
  "hindsightApiUrl": "http://localhost:8888",
  "hindsightApiToken": null
}
```

## 第 3 步：在 OMO 配置中允许传递环境变量 {#step-3-allow-the-env-vars-in-omos-config}

OMO 会限制哪些环境变量可以传递给它的钩子。将 Hindsight 相关变量添加到 `~/.config/opencode/oh-my-openagent.jsonc` 中的允许列表：

```jsonc
{
  "mcp_env_allowlist": [
    "HINDSIGHT_API_URL",
    "HINDSIGHT_API_TOKEN",
    "HINDSIGHT_BANK_ID"
  ]
}
```

启动新的 OMO 会话，记忆功能就会启用。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

该插件接入 OMO 的五种钩子事件：

| 钩子 | 事件 | 用途 |
|------|-------|---------|
| `session_start.py` | `SessionStart` | 预热：确认 Hindsight 可以访问 |
| `recall.py` | `UserPromptSubmit` | 自动召回：查询记忆，并将结果注入为 `additionalContext` |
| `retain.py` | `Stop` | 自动存入：提取会话记录，并将其异步 POST 到 Hindsight |
| `retain.py` | `SubagentStop` | 存入子智能体记忆：捕获受委派的子智能体获得的信息 |
| `session_end.py` | `SessionEnd` | 为较短会话强制执行最终存入 |

在 `UserPromptSubmit` 事件中，钩子会读取提示，向 Hindsight 查询最相关的记忆，并输出一个 `hookSpecificOutput.additionalContext` 块。OMO 会在将对话发送给模型之前，把这个块添加到对话中。注入的内容不会显示在会话记录中，但 OMO 可以读取。

在 `Stop` 和 `SubagentStop` 事件中，钩子会读取会话记录，移除之前注入的记忆标签（以防止反馈循环），并异步将对话 POST 到 Hindsight。它使用会话 ID 作为文档 ID，因此再次运行同一会话时会更新已存储的内容，而不会创建重复内容。

所有钩子都能平稳降级：如果无法访问 Hindsight，OMO 仍会正常工作，只是不使用记忆。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 按项目划分记忆库 {#per-project-memory-banks}

默认情况下，所有会话共用 `omo` 记忆库。若要为每个项目使用各自隔离的记忆，请在 `~/.hindsight/omo.json` 中启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

启用此配置后，在 `~/projects/api` 和 `~/projects/frontend` 中运行 OMO 时，会分别存入和召回记忆。记忆库 ID 根据工作目录路径生成（例如 `omo::api`、`omo::frontend`）。

你也可以通过 `recallAdditionalBanks`，在主记忆库之外同时查询其他记忆库，例如共享的团队知识库。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 启动一个 OMO 会话。
2. 告诉 OMO 一项值得记住的决定或约定。
3. 结束会话，让会话记录存入记忆库。
4. 在相同的上下文中启动新的 OMO 会话。
5. 询问先前那项决定。

如果召回的上下文包含先前的决定，说明设置正常。

`retainEveryNTurns` 的默认值是 `10`，因此只有每 10 轮才会触发一次存入。测试时，可在 `~/.hindsight/omo.json` 中添加 `"retainEveryNTurns": 1`，让每轮都触发存入。添加 `"debug": true` 可查看 Hindsight 在每轮执行的操作；所有日志行都以 `[Hindsight]` 开头。

## 常见错误 {#common-mistakes}

### 忘记配置环境变量允许列表 {#forgetting-the-env-allowlist}

如果 `HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN` 和 `HINDSIGHT_BANK_ID` 未列入 `mcp_env_allowlist`，OMO 就不会将它们传递给钩子，记忆功能也不会启用，而且不会给出提示。

### Cloud 模式下未设置令牌 {#cloud-mode-with-no-token}

如果 `hindsightApiUrl` 指向 Hindsight Cloud，但未设置 `hindsightApiToken`，钩子会静默跳过。请设置 `HINDSIGHT_API_TOKEN`，或将令牌添加到 `~/.hindsight/omo.json`。

### 在存入触发前进行测试 {#testing-before-retain-fires}

`retainEveryNTurns` 的默认值是 `10`，因此较短的会话可能不会存入任何内容。测试时将其设为 `"retainEveryNTurns": 1`。

### 期待在第一个会话中召回记忆 {#expecting-memories-on-the-first-session}

只有存入内容后，Recall 才会返回结果。先完成一个 OMO 会话，再启动新会话以查看召回的记忆。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：设置 `HINDSIGHT_API_URL`，并在本地实例中不设置令牌。

### 这会改变我使用 OMO 的方式吗？ {#does-this-change-how-i-use-omo}

不会。这些钩子会在正常的 OMO 工作流程中自动运行。如果无法访问 Hindsight，OMO 仍会继续工作，只是不使用记忆。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

默认情况下，所有会话共用 `omo` 记忆库。启用 `dynamicBankId`，并将 `dynamicBankGranularity` 设为 `["agent", "project"]`，即可按项目隔离，生成类似 `omo::myproject` 的记忆库 ID。

### 它会捕获子智能体的工作吗？ {#does-it-capture-sub-agent-work}

会。OMO 会将工作委派给子智能体（Claude Code、Codex、OpenCode），而 `SubagentStop` 钩子会捕获这些受委派的子智能体获得的信息。

## 后续步骤 {#next-steps}

- 如果你需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [OMO 集成文档](/sdks/integrations/omo)
