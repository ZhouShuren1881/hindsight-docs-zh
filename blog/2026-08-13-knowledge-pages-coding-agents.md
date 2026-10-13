---
title: "Claude Code现在构建并读取自己的知识库"
authors: [benfrank241]
slug: "2026/08/13/knowledge-pages-coding-agents"
date: 2026-08-13T12:00
tags: [hindsight, knowledge-pages, claude-code, coding-agents, agent-memory, self-updating-docs]
description: "通过 Hindsight 的编码智能体集成，Claude Code会调查您的存储库，为其构建一个自我修复的 wiki，使其保持最新状态，并在执行每个任务之前阅读它。"
image: /img/blog/knowledge-pages-coding-agents.webp
hide_table_of_contents: true
---

![用于编码智能体的知识页面：Claude Code调查您的存储库，从其记忆中构建一个自我修复的维基，并在每个任务之前阅读它](/img/blog/knowledge-pages-coding-agents.webp)

你的编码智能体非常出色，但健忘症。它完美地推理了一个任务，然后关闭会话，并忘记了该存储库使用`pnpm`，错误被键入结果值，并且您上个月已经排除了单独的矢量数据库。每次会话都会从头开始重新学习代码库。

[知识页面](https://hindsight.vectorize.io/developer/knowledge-pages)，在Hindsight 0.9.0 中发布，修复该问题。它们是记忆库编写的关于自身的活文件，并且随着记忆库的学习而重写自己。让他们点击编码的部分：使用[编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents)，您的智能体**构建、维护和读取**这些页面本身。 Claude Code会为你做到这一点。

<!-- truncate -->

## 概览 {#tldr}

- **知识页面**是从记忆库的记忆合成的自我维护文档。每个人都回答一个问题（“我们的错误处理约定是什么？”）并随着新的记忆落地而自我治愈。
- 安装编码智能体集成和**Claude Code在首次运行时调查您的存储库**，从您的 git 历史记录和过去的会话中播种架构、约定、关键决策和积极计划的页面。
- It **保持最新状态** 在您工作时（每约 10 轮重新注入页面名单）和 **录制新作品** 通过 `hindsight_capture_initiative` 作为跟踪页面。
- It **读回它们**：`hindsight_search_knowledge_pages`和`hindsight_read_knowledge_page`在智能体开始任务之前将右侧页面放在智能体前面。
- 一个命令：`npx @vectorize-io/hindsight-coding-agents install claude-code`。在我们的基准测试中，记忆将Claude Code的更正减少了**~57%**。

## 知识页面实际上是什么 {#what-a-knowledge-page-actually-is}

从形状和引擎开始，因为它们是不同的东西。其形状是一个 wiki：文件夹中的页面，可浏览、可搜索、可作为 Markdown 投影到磁盘。下面的引擎是记忆。

页面是**投影视图**过度处理的记忆，就像数据库视图不是表一样。在编写页面之前，Hindsight已经从您的会话、提交和文档中提取事实，对它们进行重复数据删除，并通过集成调和它们的矛盾。您的原始历史仍然是*说什么*的真相来源。该页面是目前关于 *持有什么* 的调和真相。当决定从 X 更改为 Y 时，页面会显示 Y，并且可以说出原因，而不是保留两个段落。

这就是为什么页面会自我修复而不是腐烂：它们是渲染，而不是存储。删除一个，什么也不会丢失；它会在下一个版本中从记忆中重新投影。

## 您的编码智能体如何为您构建它 {#how-your-coding-agent-builds-it-for-you}

这是使这一切变得自动而不是苦差事的部分。安装集成，并在冷存储库中的下一个会话中，在您自己的线束的 CLI 下安装 **探索智能体运行只读调查**。它映射了代码库并为初始页面提供了种子：组件图、核心概念、约定和模式、关键决策和基本原理以及积极的举措。从那一刻起，Hindsight维护它们。

![知识视图：页面Claude Code播种并现在维护 — 架构、约定、决策、开放倡议 — 每一个都从存储库的记忆中合成](/img/blog/knowledge-pages-tree.webp)

这些都不是你写的。智能体调查了存储库，然后Hindsight根据发现的内容合成了页面。每棵树刚建成时都有一个绿点，整棵树都是可搜索的。

当你继续工作时，无需你询问就会发生两件事：

- **维护。** 每约 10 个用户都会重新获取页面并重新注入当前名册，因此智能体始终针对最新版本（`pageRefreshEveryTurns`，默认 10）。
- **新作品被录制。** 当您完成对某个功能的头脑风暴并开始构建时，智能体会调用 `hindsight_capture_initiative` 打开其跟踪页面。故意跳过错误修复和小杂务；倡议则不然。

## A页是调和合成，不是笔记 {#a-page-is-reconciled-synthesis-not-notes}

打开一个，它读起来就像是一位细心的队友写的东西，只是没有人这样做。

![呈现的知识页面 - “系统架构” - 从存储库的观察合成为干净的散文，并在最新整合后标记更新时刻](/img/blog/knowledge-pages-rendered.webp)

“更新”时间戳说明：新记忆登陆时页面会自行刷新。随着代码库的发展，您的架构文档保持诚实，维护为零，并且在您想要引导它的罕见时间有一个编辑按钮。

## 引导页面：名称和问题 {#steering-a-page-a-name-and-a-question}

你永远不会创作正文。页面由**名称**和**来源查询**定义——每次整合后都会重新询问Hindsight问题，以从记忆中重建页面。

![页面编辑器：名称字段和“源查询”——从记忆中重建此页面的问题——加上可选标签](/img/blog/knowledge-pages-edit.webp)

改变问题，内容重新合成。这也是自动行为背后的手动杠杆：调查和`hindsight_capture_initiative`为您创建包含合理问题的页面，但您可以添加自己的问题（“我们的部署和回滚过程是什么？”），并且Hindsight从那时起就保持答案。你通过提出更好的问题来进行策划，而不是通过撰写和维护散文来进行。

## 智能体也会读它 {#the-agent-reads-it-too}

这是记忆工具智能体*有*和实际记忆*用途*之间的区别。通过集成的 MCP 工具，Claude Code将读取知识库作为其正常循环的一部分：

- `hindsight_search_knowledge_pages` — 混合搜索，为手头的任务拉出正确的页面。
- `hindsight_read_knowledge_page` — 完整阅读特定页面。
- `hindsight_reflect` — [更深层次的推理
当单个页面太浅时，](https://hindsight.vectorize.io/blog/2026/07/24/recall-vs-reflect) 超过存储库的完整记忆。
当单页太浅时，

所以会话不会冷启动。在智能体写入一行之前，它可以根据已建立的存储库提取约定页面和相关决策。这是最接近新员工阅读所有文档并且永远不会忘记的事情。

## 查看整体记忆：仓库一目了然 {#see-the-whole-memory-the-repo-at-a-glance}

页面是一个视图。记忆库的主页为您提供了另一个：一个**记忆星座**，它绘制了每个记忆以及它们之间的链接，并根据它们的连接方式（语义、时间、实体和因果关系）着色，旁边是页面和提供它们的文档。

![记忆库概述：存储库的记忆和链接的记忆星座，按连接类型着色，位于知识页面和最近文档旁边](/img/blog/knowledge-pages-overview.webp)

这与智能体回忆和反映的记忆相同，变得可见。当答案看起来很薄弱时，星座会告诉你记忆是否丢失或只是未被检索。

## 设置 {#setup}

一个命令将记忆、调查和页面工具连接到Claude Code：

```bash
npx @vectorize-io/hindsight-coding-agents install claude-code
```

相同的软件包支持舰队的其余部分 - `install codex`、`cursor-cli`、`copilot-cli`、`opencode` 等 - 或`install all` 对于每个检测到的智能体。 记忆可以存在于[Hindsight Cloud](https://ui.hindsight.vectorize.io)、您运行的服务器或本地守护进程中；你选择一次。

## 为什么值得 {#why-it-is-worth-it}

**您在仓库中工作的时间越长，您的智能体就会变得越有用。** 从第一节课中学到的知识成为第五十节课的起始背景，而不是每天早上重新设置。在我们的 61 任务基准测试中，给予 Claude Code记忆将其所需的修正减少了约 **57%**，并且成本更低，运行时间更快。

**文档可以自行编写和修复。** 人类永远不会保持最新的页面，智能体免费保持最新，因为它们是它已经积累的记忆的呈现。

**你可以阅读并相信你的智能体所知道的内容。** 默默积累记忆的智能体很难调试。一个包含自我修复页面的文件夹加上星座，可以将不透明的存储变成您可以打开、查看和更正的内容。

## 快速入门 {#quick-start}

1. 安装：`npx @vectorize-io/hindsight-coding-agents install claude-code`，然后选择记忆所在的位置。
2. 打开存储库中的Claude Code。第一个会议对其进行调查并为您的页面播种。
3. 继续工作。智能体会在执行任务之前读取页面，记录新的计划，并且 Hindsight 使所有内容保持最新状态。
4. 随时在控制平面、[API](https://hindsight.vectorize.io/developer/api/knowledge-pages)或通过`hindsight fs mount`浏览或引导页面。

推理不再是困难的部分。连续性是。阅读[0.9.0 发布说明](https://hindsight.vectorize.io/blog/2026/08/06/hindsight-0-9-0)，或安装集成并让您的编码智能体编写自己的文档。

---

**了解更多：**
- [编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents) — 一个命令，Claude Code和其余内容的本机记忆
- [知识页面开发者指南](https://hindsight.vectorize.io/developer/knowledge-pages) — 概念和底层模型
- [给予任何智能体插件客户端记忆](https://hindsight.vectorize.io/blog/2026/08/12/agent-plugins-persistent-memory) — 此自动集成的显式、可移植对应物
