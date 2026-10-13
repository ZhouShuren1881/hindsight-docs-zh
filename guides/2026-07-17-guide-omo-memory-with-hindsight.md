---
title: "指南：使用Hindsight添加OMO（oh-my-openagent）记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, omo, agents, memory]
description: "使用Hindsight添加OMO（oh-my-openagent）记忆，使用五个生命周期挂钩，在每个提示之前记忆召回上下文，在每个回合之后记忆存储对话。"
image: /img/guides/guide-omo-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OMO（oh-my-openagent）添加记忆](/img/guides/guide-omo-memory-with-hindsight.svg)

如果你愿意**使用 Hindsight 为 OMO (oh-my-openagent) 添加记忆**，最干净的设置是五钩插件。它安装到 OMO 的挂钩系统中，在每次提示之前调用相关记忆，并在每次提示后保留对话记录。这使得 OMO 能够在各个会话中保持长期记忆，而不是从头开始每个新会话。

这非常适合 OMO，因为 OMO 公开了生命周期钩子事件 — `SessionStart`，`UserPromptSubmit`，`Stop`，`SubagentStop`，和`SessionEnd`。该插件使用所有五个：它查询Hindsight在每个用户提示上并将结果注入为 `additionalContext`，然后在停止时读取会话记录并将其发布到Hindsight。因为 OMO 委托给了子智能体，所以 `SubagentStop` 钩子还捕获那些被委托的子智能体学到的东西。

本指南将引导您安装挂钩，让 OMO 指向您的Hindsight后端，了解每个项目的记忆库隔离，以及快速验证流程，以便您可以确认记忆实际上正在使用。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1.来自 `hindsight-integrations/omo/`，复制`hooks/hooks.json`，`scripts/`目录，以及`settings.json` 进入`~/.omo/`，然后复制`rules/hindsight-memory.md` 进入您的项目 `.omo/rules/`。
> 2.设置`HINDSIGHT_API_TOKEN`（云）或`HINDSIGHT_API_URL`（自托管）。
> 3.添加`HINDSIGHT_API_URL`，`HINDSIGHT_API_TOKEN`，和`HINDSIGHT_BANK_ID`至`mcp_env_allowlist` `~/.config/opencode/oh-my-openagent.jsonc`。
> 4.记忆库默认为`omo`；启用`dynamicBankId` 用于每个项目的隔离。
> 5.验证后面的会话是否记住前面的会话存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- 奥莫 ([oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent))已安装并运行
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- Python3个可用（挂钩是纯的Python标准库，无 需要 `pip install`）

## 第1步：安装挂钩 {#step-1-install-the-hooks}

来自`hindsight-integrations/omo/`目录，全局安装钩子、脚本和设置：

```bash
# Hooks (global)
mkdir -p ~/.omo/hooks
cp hooks/hooks.json ~/.omo/hooks/hindsight-hooks.json

# Scripts + settings (global)
mkdir -p ~/.omo/plugins/hindsight/scripts
cp -r scripts/ ~/.omo/plugins/hindsight/scripts/
cp settings.json ~/.omo/plugins/hindsight/settings.json
```

然后从项目根目录安装每个项目的记忆规则：

```bash
#规则（每个项目 - 从项目根运行）
mkdir -p .omo/rules
cp rules/hindsight-memory.md .omo/rules/hindsight-memory.md
```

该插件具有零依赖性 - 它是纯粹的Python stdlib，因此无需安装任何软件包。

## 第2步：将插件指向Hindsight {#step-2-point-the-plugin-at-hindsight}

对于Hindsight Cloud，设置API键：

```bash
export HINDSIGHT_API_TOKEN=hsk_your_key_here
```

对于自托管 Hindsight 服务器，覆盖 API URL：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
```

否  本地实例需要API令牌。您还可以在 中永久设置这些 `~/.hindsight/omo.json`：

```json
{
  "hindsightApiUrl": "http://localhost:8888",
  "hindsightApiToken": null
}
```

## 第 3 步：允许 OMO 配置中的环境变量 {#step-3-allow-the-env-vars-in-omos-config}

OMO 控制哪些环境变量到达其钩子。添加Hindsight变量添加到 中的允许列表 `~/.config/opencode/oh-my-openagent.jsonc`：

```jsonc
{
  "mcp_env_allowlist": [
    "HINDSIGHT_API_URL",
    "HINDSIGHT_API_TOKEN",
    "HINDSIGHT_BANK_ID"
  ]
}
```

开始新的 OMO 会话 — 记忆已上线。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

插件连接到五个 OMO 挂钩事件：

|挂钩|活动|目的|
|------|-------|---------|
|`session_start.py`|`SessionStart`|热身 — 验证 Hindsight 可达|
|`recall.py`|`UserPromptSubmit`|自动记忆召回 — 查询记忆，注入为 `additionalContext`|
|`retain.py`|`Stop`|自动记忆存储 — 提取记录，POST 到Hindsight（异步）|
|`retain.py`|`SubagentStop`|子智能体记忆存储 — 捕获委托的子智能体学习|
|`session_end.py`|`SessionEnd`|强制短期会话的最终记忆存储|

开`UserPromptSubmit`，钩子读取提示，查询Hindsight用于最相关的记忆，并输出 `hookSpecificOutput.additionalContext` 阻止 OMO 在将对话发送到模型之前添加到对话中。注入的块对转录本不可见，但对 OMO 可见。

开`Stop` 和 `SubagentStop`，钩子读取会话记录，剥离之前注入的记忆标签（以防止反馈循环），并将对话发布到Hindsight异步。它使用会话 ID 作为文档 ID，因此重新运行同一会话会更新存储的内容，而不是复制它。

所有钩子优雅降级：如果Hindsight不可达，OMO保持正常工作，无需记忆。

对于较低级别的行为，请阅读[Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 每个项目记忆库 {#per-project-memory-banks}

默认情况下所有会话共享 `omo`记忆库。要为每个项目提供独立的记忆，请在 中启用动态记忆库 ID `~/.hindsight/omo.json`：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置，在 中运行 OMO `~/projects/api` 和 `~/projects/frontend` 分别存储和调用记忆。 记忆库 ID 源自工作目录路径（例如 `omo::api`，`omo::frontend`）。

您还可以使用 查询主要记忆库旁边的其他记忆库 `recallAdditionalBanks`，例如共享团队知识记忆库。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 开始 OMO 会话
2. 告诉 OMO 值得记住的决定或惯例
3. 让会话结束，以便保留记录
4. 在相同的上下文中开始新的 OMO 会话
5. 询问之前的决定

如果回忆起的上下文显示了先前的决定，则该设置正在起作用。

因为`retainEveryNTurns` 默认为 `10`，记忆存储每10回合才触发一次。测试时，添加 `"retainEveryNTurns": 1`至`~/.hindsight/omo.json` 所以记忆存储每回合都会触发。添加`"debug": true` 看看什么Hindsight每回合都会执行 — 所有日志行都以 为前缀 `[Hindsight]`。

## 常见错误 {#common-mistakes}

### 忘记环境白名单 {#forgetting-the-env-allowlist}

如果`HINDSIGHT_API_URL`，`HINDSIGHT_API_TOKEN`，和`HINDSIGHT_BANK_ID` 不在 `mcp_env_allowlist`，OMO 永远不会将它们传递给钩子，而记忆则默默地不做任何事情。

### 无令牌云模式 {#cloud-mode-with-no-token}

如果`hindsightApiUrl` 指向Hindsight Cloud但没有`hindsightApiToken` 已设置，钩子无声地跳过。设置`HINDSIGHT_API_TOKEN`或将其添加到`~/.hindsight/omo.json`。

### 记忆存储启动前的测试 {#testing-before-retain-fires}

`retainEveryNTurns` 默认为 `10`，所以短暂的会话可能不会存储任何内容。设置测试时 `"retainEveryNTurns": 1`。

### 期待第一堂课的回忆 {#expecting-memories-on-the-first-session}

记忆召回仅在保留某些内容后才会返回结果。先完成一个 OMO 会话，然后开始一个新的 OMO 会话以查看回忆。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 设置 `HINDSIGHT_API_URL` 并保留本地实例的令牌未设置。

### 这会改变我使用 OMO 的方式吗？ {#does-this-change-how-i-use-omo}

没有。这些挂钩会围绕您正常的 OMO 工作流程自动运行。如果 Hindsight 无法到达，OMO 会继续工作，无需记忆。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

默认情况下所有会话共享 `omo`记忆库。启用`dynamicBankId` 与 `dynamicBankGranularity: ["agent", "project"]` 用于每个项目的隔离，生成类似的记忆库 `omo::myproject`。

### 它是否捕获亚智能体工作？ {#does-it-capture-sub-agent-work}

是的。 OMO 代表子智能体 (Claude Code，Codex,OpenCode），以及 `SubagentStop` 钩子捕获来自那些被委托的子智能体的学习。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[OMO 集成文档](/sdks/integrations/omo)
