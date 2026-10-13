---
title: "给予DeepSeek 利用你的代码库的记忆"
authors: [benfrank241]
slug: "2026/08/14/deepseek-harness-persistent-memory"
date: 2026-08-14T15:00
tags: [hindsight, deepseek, deepseek-harness, coding-agents, agent-memory, persistent-memory]
description: "DeepSeek 刚刚推出了 Harness (dsh)，这是一个基于插件的开源编码智能体。 Hindsight 原生插入，使其能够长期记住您的代码库。"
image: /img/blog/deepseek-harness-memory-cover.webp
hide_table_of_contents: true
---

![DeepSeek 与 Hindsight 结合：一种编码智能体，可保留项目规则并在未来的会话中调用它们](/img/blog/deepseek-harness-memory-cover.webp)

昨天DeepSeek开源[安全带](https://github.com/deepseek-ai/dsh)（`dsh`），一个基于[康得思](https://github.com/deepseek-ai/dsh)插件框架构建的编码智能体，其指导原则是“一切都是插件”。它获得了 MIT 许可，用 TypeScript 编写，并定位为 Claude Code的开放替代品。它在发射后数小时内就突破了 27,000 星。

它也像每个编码智能体一样，在会话之间完全失忆。关闭终端，明天再回来，它忘记了这个仓库使用`pgm`而不是`npm`，PR标题必须遵循常规提交，以及你上周讨论过的抢七规则。因为 Harness 是插件优先的，所以我们可以像解决其他问题一样解决这个问题：使用插件。

<!-- truncate -->

## 概览 {#tldr}

- **DeepSeek 安全带现在具有长期记忆**，通过[Hindsight 编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents)。
- 一个命令：`npx @vectorize-io/hindsight-coding-agents install dsh`。它作为 **原生 Cordis 插件** 安装，因此没有要运行的 MCP 服务器。
- 是**全自动**：一个repo的git历史和对话流入后台的记忆库中，Harness在启动任务时会回忆起相关的上下文。
- 它还构建并读取**知识页面**：一个自我修复的 wiki，包含未来会议开始的架构、约定和决策。
- 记忆存在于您控制的Hindsight记忆库中，[云](https://ui.hindsight.vectorize.io)或自托管，并且它在您的其他工具之间共享。

## 为什么编码智能体最需要记忆 {#why-a-coding-agent-needs-memory-most}

在离散会话中工作的智能体非常适合集中注意力，但不利于连续性。每次会话都会从头开始重新学习您的堆栈，重新发现相同的陷阱，并重新询问您已经回答的问题。大多数真正的修复都可以从代码中得出，但最后一英里通常取决于根本不在代码中的特定于项目的决策：舍入规则、重试允许列表、命名约定。这些决定存在于 git 历史和过去的对话中。 记忆使他们在智能体开始工作时回到智能体面前。

## 设置：一条命令 {#setup-one-command}

Harness 将所有内容视为插件，因此集成也是其中之一。安装软件包并连接`dsh`：

```bash
npx @vectorize-io/hindsight-coding-agents install dsh
```

注册每个`dsh`配置文件组成的Cordis插件行，使用本机工具，不需要MCP。将记忆指向[Hindsight Cloud](https://ui.hindsight.vectorize.io)，您运行的服务器或本地守护进程；你选择一次。 （Harness 将其会话日志写入 Zstandard-framed JSONL，需要 Node 22.15+。）

没有需要记住的捕获命令。从下一次开始，记忆就会自动进行。

## 教一次 {#teach-it-once}

在正常的工作会话中，告诉 Harness 存储库的规则。这里记录了两个项目约定，Hindsight将它们保留为持久记忆：

![DeepSeek 将两个项目规则存储到存储库的 Hindsight 记忆中](/img/blog/deepseek-harness-retain.webp)

这些保留落在存储库范围内的Hindsight记忆库中。您可以看到它们到达控制平面，并由生成它们的线束标记：

![Hindsight 控制平面显示保留的对话和约定，标记为harness-dsh](/img/blog/deepseek-harness-memory.webp)

这里不需要手动导出。 Harness 发挥了作用，并且集成捕获了背景中的重要内容。

## 它会在下一个会话中记住 {#it-remembers-in-the-next-session}

稍后开始新的会话并询问项目的约定。 Harness 没有猜测，而是从记忆中回忆起所教的规则：

![新的DeepSeek Harness 会话回顾Hindsight 中的包管理和公关标题约定](/img/blog/deepseek-harness-recall.webp)

包管理规则和常规提交要求会逐字返回，因为它们被存储为协调的记忆，而不是留在重置每个会话的上下文窗口中。第一节课的学习内容成为第五节课的起始背景。

## 超越记忆召回：自我修复维基 {#beyond-recall-a-self-healing-wiki}

整合的作用不仅仅是记忆存储和记忆召回单个事实。在冷仓库上，它会运行只读调查并为架构、约定和正在进行的计划提供种子**知识页面**，然后在您工作时保持它们最新。 Harness 在开始之前读取这些页面，并将新工作记录为跟踪页面，以便文档自行编写和修复。您可以在[智能体编码知识页面](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents)阅读更多内容。

## 共享记忆库的好处 {#the-nice-thing-about-a-shared-bank}

因为记忆存在于Hindsight记忆库中而不是在Harness中，所以它是便携式的。 Harness 填充的相同记忆库可通过 Claude Code、Codex、Cursor 以及集成支持的其他 [十编码智能体](https://hindsight.vectorize.io/sdks/integrations/coding-agents) 进行调用。教其中一个，你舰队的其他人也会知道。

DeepSeek 提供了插件优先的编码智能体。我们提供了赋予它记忆的插件。使用一个命令安装它，或者先阅读[集成指南](https://hindsight.vectorize.io/sdks/integrations/coding-agents)。

---

**了解更多：**
- [编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents) — 一个命令，DeepSeek 安全带和其他十个命令的原生记忆
- [智能体编码知识页面](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents) — 您的智能体构建和阅读的自我修复维基
- [Hindsight GitHub](https://github.com/vectorize-io/hindsight) — 底层的开源记忆引擎
