---
title: "让 GitHub Copilot CLI 记住您的代码库"
authors: [benfrank241]
slug: "2026/07/30/github-copilot-persistent-memory"
date: 2026-07-30T12:00
tags: [hindsight, github-copilot, copilot-cli, agent-memory, persistent-memory, coding-agent, tutorial]
description: "GitHub Copilot CLI 会在会话之间忘记您的项目。接入 Hindsight 后，它便能通过钩子自动召回过去的决策，并保留学到的内容。"
image: /img/blog/github-copilot-persistent-memory.png
hide_table_of_contents: true
---

![GitHub Copilot CLI 与 Hindsight：会话开始时召回项目上下文，会话结束时存入本次会话](/img/blog/github-copilot-persistent-memory.png)

[GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) 将 Copilot 智能体带入终端：它会规划、编辑文件、运行命令，并端到端地完成任务。它确实很擅长处理眼前的任务，但在不同会话之间完全没有记忆。关闭终端，第二天再回来，它就忘了这个代码库使用的是 `pnpm` 而不是 `npm`，忘了您上周讨论过的架构决策，也忘了您已经排除过哪些方案。

`hindsight-copilot-cli` 无需改变您的工作方式，就能解决这个问题。它通过 Copilot CLI 的钩子接入 [Hindsight](https://vectorize.io/hindsight)，让智能体在会话开始时召回相关项目历史，并在会话结束时存入本次会话产生的内容。您不必运行记忆命令，也不必手动调用工具。

<!-- truncate -->

## 概览 {#tldr}

- 两步即可完成：先运行 `pip install hindsight-copilot-cli`，再运行 `hindsight-copilot-cli install`。
- 它使用 Copilot CLI 的**钩子**：`sessionStart` 时执行召回，`agentStop` 和 `sessionEnd` 时执行存入。整个过程会自动进行。
- **子代理也能获得记忆**：每个启动的子代理都会在 `subagentStart` 时获得基础项目上下文。
- 记忆保存在由您控制的 Hindsight 记忆库中，可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，也可以自托管；这些记忆还可供您的其他工具使用。
- 需要坦诚说明的限制：召回只会在每次会话开始时触发一次，不会在每条提示前触发（这是 Copilot CLI 钩子的限制，后文会解释）。

## 为什么终端智能体最需要记忆 {#why-a-terminal-agent-needs-memory-most}

聊天助手至少能延续一场对话。Copilot CLI 则按彼此独立的会话工作：您启动会话，它执行一项任务；会话结束时，所有上下文都会清空。这有助于专注，却严重影响连续性。每次会话都得从头重新了解您的技术栈，重新发现同样的注意事项，还会再次询问您已经回答过的问题。

持久记忆能把一系列互不相连的会话，变成真正了解您项目的智能体。第一次会话中的经验会成为第五十次会话的起始上下文。这样，您在同一个代码库中工作得越久，智能体就越有用，而不是每天早上都从零开始。

## 设置 {#setup}

首先，准备一个 Hindsight 实例。最快的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册并获取 API 密钥，无需自行运行服务。

然后安装集成并运行一次性安装程序：

```bash
pip install hindsight-copilot-cli

# Hindsight Cloud
hindsight-copilot-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

# 或使用本地服务器，此时省略这些标志
hindsight-copilot-cli install
```

安装程序会将钩子脚本复制到 `~/.copilot` 下，并注册独立的 `~/.copilot/hooks/hindsight-copilot-cli.json`，避免与其他工具的钩子冲突；它还会在 `~/.hindsight/copilot-cli.json` 下创建配置文件。重启 Copilot CLI 以加载钩子后，记忆功能便会启用。

## 工作原理：四个钩子，无需手动操作 {#how-it-works-four-hooks-zero-manual-steps}

Copilot CLI 可以在生命周期事件发生时运行脚本。这个集成会在其中四个事件中接入记忆功能，因此用起来是自动的，不像某些工具那样需要您记得手动调用。

| 钩子 | Hindsight 的操作 |
|------|------------------|
| `sessionStart` | 召回与您开场提示相关的记忆，并将其作为上下文注入 |
| `subagentStart` | 为每个启动的子代理召回基础项目上下文 |
| `agentStop` | 每隔 N 轮存入一次对话 |
| `sessionEnd` | 强制执行最后一次存入，确保短会话也会保存 |

在读取记忆时，会话开始后，Hindsight 会搜索您的记忆库，并在智能体回答前将相关事实作为 `additionalContext` 注入。在写入记忆时，系统会在会话退出时读取并存储会话记录，由记忆引擎提取可长期保留的事实、关系和决策。您不必再重复解释自己的技术栈。

有一项需要坦诚说明的限制，项目 README 也明确提到了：Copilot CLI 只允许少数钩子注入上下文，因此**记忆只会在会话开始时召回一次，不会在每条提示前召回**。在很长的会话中，开头召回的上下文可能会过时。按轮次刷新是未来可能添加的功能，本版本尚未实现。对于通常的用法——围绕一项任务启动会话——在开头召回正是记忆最能发挥作用的时候。

## 您的子代理也能记住 {#your-subagents-remember-too}

Copilot CLI 可以启动子代理（`explore`、`task`、`research`、`code-review` 等）。通常，每个子代理都在隔离的上下文中运行，不知道主会话已经了解什么。`subagentStart` 钩子解决了这个问题：每个子代理启动时都会获得基础项目记忆，让代码审查代理和探索代理从对代码库的同一份共享理解出发，而不是从一无所知开始。

## 适合您工作流程的记忆 {#memory-that-fits-your-workflow}

默认情况下，所有内容都会存入名为 `copilot-cli` 的记忆库。如果您希望按项目划分记忆范围，可以在 `~/.hindsight/copilot-cli.json` 中启用动态记忆库：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

这样，每个代码库都会根据工作目录获得自己的记忆库，一个项目的约定就不会混入另一个项目。同一个文件还可以设置存入频率（`retainEveryNTurns`）、召回深度（`recallBudget`）和注入的记忆量（`recallMaxTokens`）。您也可以使用 `--scope repo` 在代码库范围内安装，以便团队共享钩子注册信息。切勿提交令牌；请为每个环境分别设置 `HINDSIGHT_API_TOKEN`。

由于记忆保存在 Hindsight 记忆库中，而不在 Copilot 内部，因此不会被锁定在单一工具中。将其他 Hindsight 集成指向同一个记忆库，相关上下文便能延续下去：Copilot CLI 存入的决策也可供 Cursor、Claude Code 或任何其他读取该记忆库的工具使用。有关范围设置的完整介绍，请参阅我们的[记忆库策略实地指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 验证是否生效 {#verifying-it-works}

在一次会话中告诉它一些信息（“这个代码库使用 `pnpm` 而不是 `npm`，测试与源文件放在一起”），然后退出。第二天启动一个新的 `copilot` 会话，让它添加测试，看看它是否会自行遵循这个约定：这是因为 `sessionStart` 钩子在智能体开始工作前就已召回相关记忆。如果行为不符合预期，请在配置中将 `debug` 设为 `true`，并查看 `~/.hindsight/copilot-cli/state/` 下的日志。

## 常见问题 {#frequently-asked-questions}

**我需要运行任何记忆命令吗？**
不需要。召回和存入都会通过钩子自动执行，无需手动调用任何命令。

**每条提示前都会执行记忆召回吗？**
不会。Copilot CLI 只允许在特定钩子中注入上下文，因此召回会在会话开始时（以及子代理启动时）执行，而不是在每条消息前执行。

**我的记忆会限定在一个项目中吗？**
默认情况下，所有会话共用一个记忆库。将 `dynamicBankId` 设为 `true`，即可为每个代码库单独使用一个记忆库。

**可以离线使用吗？**
可以。运行本地 Hindsight 服务器，并在安装时省略 API 标志，数据就不会离开您的设备。

## 试试看 {#try-it}

如果您已经在使用 Copilot CLI，最快的体验方式就是安装此集成，完成一项任务，然后第二天启动新会话，看看它如何从上次中断的地方继续。[获取免费的 Hindsight Cloud 密钥](https://ui.hindsight.vectorize.io)，然后运行 `hindsight-copilot-cli install`。

## 延伸阅读 {#further-reading}

- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：了解 Hindsight 如何处理每个被存入的会话。
- [recall 与 reflect 的区别](/blog/2026/07/24/recall-vs-reflect)：了解读取记忆的两种方式。
- [每个 AI 工具共用一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：了解为什么记忆存储位于单个智能体之外。
