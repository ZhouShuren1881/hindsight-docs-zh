---
title: "让 DeepSeek Harness 记住你的代码库"
authors: [benfrank241]
slug: "2026/08/14/deepseek-harness-persistent-memory"
date: 2026-08-14T15:00
tags: [hindsight, deepseek, deepseek-harness, coding-agents, agent-memory, persistent-memory]
description: "DeepSeek 刚刚推出 Harness（dsh），这是一个基于插件构建的开源编程智能体。Hindsight 可原生接入，让它长期记住你的代码库。"
image: /img/blog/deepseek-harness-memory-cover.webp
hide_table_of_contents: true
---

![DeepSeek Harness 与 Hindsight：一种能够存入项目规则并在未来会话中召回这些规则的编程智能体](/img/blog/deepseek-harness-memory-cover.webp)

昨天，DeepSeek 将 [Harness](https://github.com/deepseek-ai/dsh)（`dsh`）开源了。它是一个基于 [Cordis](https://github.com/deepseek-ai/dsh) 插件框架构建的编程智能体，其指导原则是“一切皆插件”。它采用 MIT 许可证，以 TypeScript 编写，并明确定位为 Claude Code 的开源替代方案。发布后数小时内，它就获得了 27,000 个星标。

和所有编程智能体一样，它在会话之间完全没有记忆。关闭终端，第二天回来，它就忘了这个仓库用的是 `pgm` 而不是 `npm`、PR 标题必须遵循 Conventional Commits，以及你上周讨论过的平局判定规则。Harness 以插件为先，因此我们也可以用插件解决这个问题，就像它处理其他一切一样。

<!-- truncate -->

## 概览 {#tldr}

- **DeepSeek Harness 现在拥有长期记忆**，通过 [Hindsight 编程智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents)实现。
- 只需一条命令：`npx @vectorize-io/hindsight-coding-agents install dsh`。它会作为 **原生 Cordis 插件**安装，因此无需运行 MCP 服务器。
- 它会**全自动运行**：仓库的 git 历史和对话会在后台流入记忆库；Harness 开始任务时，会召回相关上下文。
- 它还会构建并读取**知识页**：一部自我修复的 wiki，记录架构、约定和决策，供后续会话开始时参考。
- 记忆保存在你控制的 Hindsight 记忆库中，可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管版本；其他工具也能共享这些记忆。

## 为什么编程智能体最需要记忆 {#why-a-coding-agent-needs-memory-most}

智能体按独立会话工作的方式有利于专注，却难以保持连续性。每次会话都要从头学习技术栈，重新发现同样的注意事项，再次询问你已经回答过的问题。实际修复中的大部分内容都能从代码推导出来，但最后一步往往取决于代码中没有记录的项目特定决策：舍入规则、重试允许列表或命名约定。这些决策存在于 git 历史和过去的对话中。记忆能在智能体开始工作时，把这些信息重新呈现给它。

## 设置：一条命令 {#setup-one-command}

Harness 将所有东西都视为插件，因此这项集成也通过插件提供。安装软件包并接入 `dsh`：

```bash
npx @vectorize-io/hindsight-coding-agents install dsh
```

这会注册一项 Cordis 插件配置，每个 `dsh` 配置文件都会组合使用它；集成采用原生工具，无需 MCP。你只需选择一次，将记忆连接到 [Hindsight Cloud](https://ui.hindsight.vectorize.io)、自己运行的服务器或本地守护进程即可。（Harness 会将会话日志写成 Zstandard 帧格式的 JSONL，需要 Node 22.15 或更高版本。）

你不必记住任何捕获命令。从下一个会话开始，记忆会自动记录。

## 教它一次 {#teach-it-once}

在日常工作会话中，告诉 Harness 仓库的规则。下面它记录了两条项目约定，Hindsight 会将它们存为持久记忆：

![DeepSeek Harness 将两条项目规则存入仓库对应的 Hindsight 记忆库](/img/blog/deepseek-harness-retain.webp)

这些记忆会存入一个与仓库关联的 Hindsight 记忆库。你可以在控制台中查看它们；每条记忆都带有生成它的运行框架标签：

![Hindsight 控制台显示已存入的对话和约定，并带有 harness-dsh 标签](/img/blog/deepseek-harness-memory.webp)

这一切都不需要手动导出。Harness 完成工作后，集成会在后台自动记录重要内容。

## 它会在下一个会话中记住 {#it-remembers-in-the-next-session}

稍后开启一个新会话，询问项目约定。Harness 不必猜测，而是从记忆中召回之前教给它的规则：

![新的 DeepSeek Harness 会话从 Hindsight 记忆中召回包管理和 PR 标题约定](/img/blog/deepseek-harness-recall.webp)

包管理规则和 Conventional Commits 要求会原样返回，因为它们已作为协调后的记忆存储起来，而不是留在每次会话都会重置的上下文窗口中。第一次会话中学到的内容，会成为第五十次会话的起点。

## 超越召回：自我修复的 wiki {#beyond-recall-a-self-healing-wiki}

这项集成不只会存入和召回单条事实。在一个全新的仓库中，它会进行只读巡查，为架构、约定和正在进行的项目创建知识页；之后也会随着你的工作持续更新这些页面。Harness 开始工作前会先读取这些页面，并把新工作记录为可追踪的页面，让文档能够自行编写和修复。详情请参阅[面向编程智能体的知识页](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents)。

## 共享记忆库的优势 {#the-nice-thing-about-a-shared-bank}

记忆保存在 Hindsight 记忆库中，而不是 Harness 内部，因此可以跨工具使用。Harness 写入的同一个记忆库，也能供 Claude Code、Codex、Cursor 以及这项集成支持的其他[十种编程智能体](https://hindsight.vectorize.io/sdks/integrations/coding-agents)召回。教会其中一个，其他工具也能知道这些内容。

DeepSeek 发布了一个以插件为先的编程智能体。我们提供了让它拥有记忆的插件。你可以用一条命令安装，也可以先阅读[集成指南](https://hindsight.vectorize.io/sdks/integrations/coding-agents)。

---

**了解更多：**
- [编程智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents) — 用一条命令为 DeepSeek Harness 和另外十种智能体接入原生记忆
- [面向编程智能体的知识页](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents) — 智能体构建并读取的自我修复 wiki
- [Hindsight on GitHub](https://github.com/vectorize-io/hindsight) — 底层的开源记忆引擎

---
