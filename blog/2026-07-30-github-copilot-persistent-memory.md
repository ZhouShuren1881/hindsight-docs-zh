---
title: "让 GitHub Copilot CLI 记住您的代码库"
authors: [benfrank241]
slug: "2026/07/30/github-copilot-persistent-memory"
date: 2026-07-30T12:00
tags: [hindsight, github-copilot, copilot-cli, agent-memory, persistent-memory, coding-agent, tutorial]
description: "GitHub Copilot CLI 在会话之间忘记您的项目。添加Hindsight，以便它通过钩子自动回忆过去的决定并保留它学到的东西。"
image: /img/blog/github-copilot-persistent-memory.png
hide_table_of_contents: true
---

![GitHub Copilot CLI 和 Hindsight：会话开始时的记忆召回项目上下文，退出时的记忆存储会话](/img/blog/github-copilot-persistent-memory.png)

[GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) 将 Copilot 智能体带入您的终端：它计划、编辑文件、运行命令并端到端地执行任务。它确实擅长完成眼前的任务。在会话之间它也是完全失忆的。关闭终端，明天再回来，它忘记了这个存储库使用`pnpm`而不是`npm`，这是你上周讨论过的架构决策，以及你已经排除的方法。

`hindsight-copilot-cli` 解决了这个问题，而无需改变您的工作方式。它通过挂钩将 [Hindsight](https://vectorize.io/hindsight) 插入 Copilot CLI，因此智能体会在会话开始时调用相关项目历史记录，并保留会话结束时生成的内容。无需运行记忆命令，无需手动调用工具。

<!-- truncate -->

## 概览 {#tldr}

- 两步：`pip install hindsight-copilot-cli`，然后`hindsight-copilot-cli install`。
- 它使用Copilot CLI 的**挂钩**：记忆在`sessionStart`上运行，记忆存储在`agentStop`和`sessionEnd`上运行。它是自动的。
- **子代理也能获得记忆**：每个生成的子代理都以 `subagentStart` 上的基线项目上下文为种子。
- 记忆存在于您控制的Hindsight记忆库中，[云](https://ui.hindsight.vectorize.io)或自托管，并且它可以跨您的其他工具移植。
- 诚实的限制：记忆召回在每个会话启动时触发一次，而不是在每个提示之前触发（Copilot CLI 挂钩约束，如下所述）。

## 为什么终端智能体最需要记忆 {#why-a-terminal-agent-needs-memory-most}

聊天助手至少可以维持一场对话。 Copilot CLI 在离散会话中工作：您启动一个会话，它运行一项任务，当它退出时会擦除板岩。这对于集中注意力很有帮助，但对于连续性却很糟糕。每次会话都会从头开始重新学习您的堆栈，重新发现相同的陷阱，并重新询问您已经回答的问题。

持久记忆能够将一系列孤立的会话转变为真正了解您的项目的智能体。从第一节课中学到的知识将成为第五十节课的起始上下文，因此您在存储库中工作的时间越长，而不是每天早上重置，智能体就会变得越有用。

## 设置 {#setup}

首先，获取一个Hindsight实例。快速路径是[Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册，获取API密钥，无需运行。

然后安装集成并运行一次性安装程序：

```bash
pip install hindsight-copilot-cli

#Hindsight Cloud
hindsight-copilot-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

#或本地服务器，省略标志
hindsight-copilot-cli install
```

安装程序将钩子脚本复制到`~/.copilot`下，注册一个独立的`~/.copilot/hooks/hindsight-copilot-cli.json`，这样它就不会与其他工具的钩子发生冲突，并在`~/.hindsight/copilot-cli.json`下播种一个配置文件。重新启动 Copilot CLI 来加载钩子，记忆就可以了。

## 工作原理：四个挂钩，零手动步骤 {#how-it-works-four-hooks-zero-manual-steps}

Copilot CLI 可以在生命周期事件中运行脚本，并将记忆集成到其中的四个事件中。这就是让它感觉是自动的，而不是像一个你必须记住调用的工具。

|钩子|Hindsight 的作用|
|------|---------------------|
|`sessionStart`|回忆与你的打开提示相关的记忆并将它们作为上下文注入|
|`subagentStart`|回顾每个生成的子代理的基线项目上下文|
|`agentStop`|每 N 轮保留对话|
|`sessionEnd`|强制最终的记忆存储，因此即使是很短的会话也会被存储|

在阅读方面，当会话开始时Hindsight搜索您的记忆库并在智能体答案之前将相关事实作为`additionalContext`注入。在写入方面，会话记录在退出时被读取和存储，其中记忆引擎提取持久的事实、关系和决策。你永远不会重新解释你的堆栈。

一个诚实的限制，自述文件对此很坦率：Copilot CLI 只允许一些钩子注入上下文，因此 **记忆召回在会话开始时发生一次，而不是在每次提示之前发生。** 在一个很长的会话中，顶部调用的上下文可能会过时。每回合刷新是未来可能添加的内容，而不是这个版本所做的事情。对于常见的模式，开始一个针对某项任务的会话，一旦达到顶峰正是记忆得到回报的时候。

## 你的下属也记得 {#your-subagents-remember-too}

Copilot CLI 可以生成子代理（`explore`、`task`、`research`、`code-review` 等），并且通常每个子代理都在独立的上下文中运行，不知道主会话知道什么。 `subagentStart` 钩子修复了这个问题：每个子代理在生成时都会植入基线项目记忆，因此您的审阅者和您的浏览器从对代码库的相同共享理解开始，而不是从无到有。

## 适合您工作流程的记忆 {#memory-that-fits-your-workflow}

默认情况下，所有内容都会存储到名为 `copilot-cli` 的记忆库中。如果您想要每个项目的记忆范围，请在 `~/.hindsight/copilot-cli.json` 中打开动态记忆库：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

现在，每个存储库都有自己的记忆库，源自工作目录，因此一个项目的约定永远不会渗透到另一个项目的约定中。同一文件控制记忆存储频率 (`retainEveryNTurns`)、记忆召回深度 (`recallBudget`) 以及注入的记忆量 (`recallMaxTokens`)，并且您可以使用 `--scope repo` 在存储库范围内安装，以便与团队共享钩子注册。切勿提交令牌：而是为每个环境设置 `HINDSIGHT_API_TOKEN`。

因为记忆存在于Hindsight记忆库中而不是Copilot内部，所以它不被锁定到一个工具。将另一个 Hindsight 集成指向同一个记忆库，上下文就会延续：保留的决策 Copilot CLI 可供 Cursor、Claude Code或从该记忆库读取的任何其他内容使用。如果您想了解范围界定的完整情况，我们编写了 [记忆库策略实地指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 验证它是否有效 {#verifying-it-works}

在一个会话中教它一些东西（“此存储库使用 pnpm，而不是 npm，并且在源旁边进行实时测试”），然后退出。第二天开始一个新的 `copilot` 会话，要求它添加一个测试，并观察它自己应用该约定，因为 `sessionStart` 钩子在智能体开始之前就召回了它。如果出现问题，请在配置中将 `debug` 设置为 `true`，并在 `~/.hindsight/copilot-cli/state/` 下跟踪日志。

## 常见问题 {#frequently-asked-questions}

**我必须运行任何记忆命令吗？**
没有。 记忆召回和记忆存储通过钩子自动运行。没有什么可以手动调用的。

**记忆召回是否在每次提示之前运行？**
没有。 Copilot CLI 只允许在某些钩子上进行上下文注入，因此记忆召回在会话开始时（以及子代理生成时）运行，而不是在每条消息上运行。

**我的记忆仅限于一个项目吗？**
默认情况下，所有会话共享一个记忆库。对于每个存储库的单独记忆库，将 `dynamicBankId` 设置为 true。

**可以离线使用吗？**
是的。运行本地 Hindsight 服务器并在没有 API 标志的情况下进行安装，并且不会离开您的计算机。

## 尝试一下 {#try-it}

如果您已经使用Copilot CLI，感受差异的最快方法是安装集成，完成任务，然后明天开始新的会话，并观察它从您上次停下的地方继续。 [获取免费的Hindsight Cloud密钥](https://ui.hindsight.vectorize.io) 并运行`hindsight-copilot-cli install`。

## 进一步阅读 {#further-reading}

- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：Hindsight对其存储的每个会话执行什么操作。
- [记忆召回 vs 反思](/blog/2026/07/24/recall-vs-reflect)：回读记忆的两种方法。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：为什么存储位于任何单一智能体之外。
