---
title: "Claude Code 现在会自行构建并读取知识库"
authors: [benfrank241]
slug: "2026/08/13/knowledge-pages-coding-agents"
date: 2026-08-13T12:00
tags: [hindsight, knowledge-pages, claude-code, coding-agents, agent-memory, self-updating-docs]
description: "借助 Hindsight 的编码智能体集成，Claude Code 会调查代码库，为其构建一个能够自我修复的 wiki、持续更新内容，并在每项任务开始前读取它。"
image: /img/blog/knowledge-pages-coding-agents.webp
hide_table_of_contents: true
---

![面向编码智能体的知识页：Claude Code 调查代码库，根据记忆构建一个能够自我修复的 wiki，并在每项任务开始前读取它](/img/blog/knowledge-pages-coding-agents.webp)

你的编码智能体聪明过人，却没有记忆。它能出色地推理任务，但结束会话后，就忘了这个代码库用的是 `pnpm`、错误采用带类型的 Result 值，也忘了你上个月已经排除过单独使用向量数据库的方案。每次会话都得从头重新了解代码库。

Hindsight 0.9.0 推出了[知识页](/developer/knowledge-pages)，解决的正是这个问题。知识页是由记忆库根据自身内容生成的持续更新文档；随着记忆库学到新内容，这些文档也会重写。它们特别适合编码场景：通过[编码智能体集成](/sdks/integrations/coding-agents)，智能体可以自行**构建、维护和读取**这些页面。Claude Code 会替你完成这些工作。

<!-- truncate -->

## 概览 {#tldr}

- **知识页**是根据记忆库中的记忆综合生成、并能自我维护的文档。每页回答一个问题（例如“我们的错误处理约定是什么？”），并会随着新记忆写入而自行更新。
- 安装编码智能体集成后，**Claude Code 首次运行时会调查你的代码库**，再从 Git 历史和过去的会话中提取信息，为架构、约定、关键决策和当前计划创建页面。
- 工作过程中，它会**持续更新页面**（每约 10 轮重新注入页面列表），并通过 `hindsight_capture_initiative` 将**新工作记录**为跟踪页面。
- 它还会**读取这些页面**：`hindsight_search_knowledge_pages` 和 `hindsight_read_knowledge_page` 会在智能体开始任务前，把相关页面提供给它。
- 只需运行一条命令：`npx @vectorize-io/hindsight-coding-agents install claude-code`。在我们的基准测试中，记忆让 Claude Code 所需的修正减少了 **约 57%**。

## 知识页究竟是什么 {#what-a-knowledge-page-actually-is}

先看外在形式和底层引擎，因为两者并不相同。外在形式像一个 wiki：页面按文件夹组织，可以浏览、搜索，也可以投影为 Markdown 文件写入磁盘。底层引擎则是记忆。

知识页是处理后记忆的**投影视图**，就像数据库视图并不是一张表。页面生成之前，Hindsight 已经从会话、提交和文档中提取事实、进行去重，并通过整合协调彼此矛盾的内容。原始历史仍然是“说过什么”的事实来源；页面则呈现当前“哪些内容成立”的协调结果。如果某项决定从 X 改为 Y，页面就会显示 Y，并且可以说明原因，而不会把两个版本隔一段文字并列保留。

因此，知识页会自我修复，而不会逐渐失效：它们是渲染结果，不是存储本身。删除某页不会丢失任何内容；下次构建时，它会根据记忆重新生成。

## 编码智能体如何替你构建知识页 {#how-your-coding-agent-builds-it-for-you}

让这一切自动运行、无需手动维护，关键就在这里。安装集成后，在一个尚未探索过的代码库中启动下次会话时，**探索智能体会通过你所用 harness 的 CLI 执行只读调查**。它会梳理代码库，并创建初始页面：组件关系图、核心概念、约定与模式、关键决策及其依据，以及当前计划。从这时起，Hindsight 会持续维护这些页面。

![Hindsight 控制平面中的知识库目录树](/img/blog/knowledge-pages-tree.webp)

这些页面都不是你手动编写的。智能体调查了代码库，Hindsight 则根据调查结果综合生成页面。页面刚生成时会带有一个绿点，整个目录树也都可以搜索。

继续工作时，两件事会自动发生：

- **维护页面。** 每约 10 轮用户交互，集成就会重新获取页面并注入最新的页面列表，让智能体始终依据最新版本工作（`pageRefreshEveryTurns`，默认值为 10）。
- **记录新工作。** 你完成某项功能的构思并开始开发时，智能体会调用 `hindsight_capture_initiative`，为它创建一个跟踪页面。按设计，错误修复和小型杂务会被跳过；计划中的项目则会记录下来。

## 知识页是协调后的综合结果，而不是笔记 {#a-page-is-reconciled-synthesis-not-notes}

打开一页，它读起来就像一位细心的队友写的，只不过实际上没有人动笔。

![呈现出的知识页“系统架构”：根据代码库的观测综合成清晰的文字，并在最近一次整合后标记更新时间](/img/blog/knowledge-pages-rendered.webp)

“更新时间”透露了其中的机制：新记忆写入后，页面随即自行刷新。代码库不断演进，你的架构文档也能如实反映变化，无需维护；如果偶尔想调整方向，还可以点击“编辑”。

## 引导知识页：名称和问题 {#steering-a-page-a-name-and-a-question}

你不需要编写页面正文。知识页由**名称**和**来源查询**定义——每次整合后，Hindsight 都会重新提出这个问题，并根据记忆重建页面。

![在控制台中编辑知识页](/img/blog/knowledge-pages-edit.webp)

修改问题后，内容就会重新综合生成。这也是自动行为背后的手动控制方式：调查过程和 `hindsight_capture_initiative` 会替你创建问题合理的页面，但你也可以自行添加问题（例如“我们的部署和回滚流程是什么？”），之后 Hindsight 会持续维护对应答案。你可以通过提出更好的问题来维护内容，无需亲自撰写和维护文字。

## 智能体也会读取知识页 {#the-agent-reads-it-too}

智能体“拥有”记忆工具，不代表它真的会“使用”记忆；这正是两者的区别。借助集成提供的 MCP 工具，Claude Code 会在日常工作流程中读取知识库：

- `hindsight_search_knowledge_pages` — 混合搜索，为当前任务找到合适的页面。
- `hindsight_read_knowledge_page` — 完整读取指定页面。
- `hindsight_reflect` — 当单页内容不够深入时，基于代码库的完整记忆进行[更深入的推理](/blog/2026/07/24/recall-vs-reflect)。

这样一来，会话就不再从零开始。智能体动笔之前，可以先读取约定页面和相关决策，并以代码库中已有的信息为依据。这就像一位新同事读完所有文档，而且永远不会忘记其中内容。

## 一览整个记忆：代码库全貌 {#see-the-whole-memory-the-repo-at-a-glance}

知识页是一种视图。记忆库的主页还提供另一种：一个**记忆星座图**，展示代码库中的每条记忆及其关联，并按关联类型着色——语义、时间、实体和因果关系；旁边还显示知识页和作为其信息来源的文档。

![代码库的记忆星座图，展示记忆及其关联并按关联类型着色，旁边是知识页和最近的文档](/img/blog/knowledge-pages-overview.webp)

这里展示的正是智能体用来召回和反思的记忆。当答案显得单薄时，星座图可以帮助你判断：是记忆缺失，还是相关记忆尚未被检索出来。

## 设置 {#setup}

运行一条命令，就能把记忆、调查功能和页面工具接入 Claude Code：

```bash
npx @vectorize-io/hindsight-coding-agents install claude-code
```

同一个软件包也支持其他编码智能体：`install codex`、`cursor-cli`、`copilot-cli`、`opencode` 等；也可以运行 `install all`，为所有检测到的智能体安装。记忆可以存放在 [Hindsight Cloud](https://ui.hindsight.vectorize.io)、你自行运行的服务器或本地守护进程中；只需选择一次。

## 为什么值得使用 {#why-it-is-worth-it}

**你在一个代码库中工作得越久，智能体就越有用。** 第一次会话中学到的内容，会成为第五十次会话的初始上下文，而不是每天早上都被清空。在我们的 61 项任务基准测试中，为 Claude Code 提供记忆后，它所需的修正减少了约 **57%**，成本也更低，执行时间更短。

**文档会自行编写和修复。** 人们往往不会持续更新这些页面，而智能体可以免费维护它们，因为页面只是它已经积累的记忆的呈现结果。

**你可以查看并信任智能体掌握的信息。** 默默积累记忆的智能体很难调试。由可自我修复的页面和记忆星座图组成的文件夹，会把不透明的存储变成你可以打开、审阅和修正的内容。

## 快速开始 {#quick-start}

1. 安装：运行 `npx @vectorize-io/hindsight-coding-agents install claude-code`，并选择记忆的存放位置。
2. 在代码库中启动 Claude Code。首次会话会调查代码库，并创建初始页面。
3. 继续工作。智能体会在开始任务前读取页面、记录新的计划，Hindsight 则会持续更新所有内容。
4. 随时在控制平面、通过 [API](/developer/api/knowledge-pages)，或使用 `hindsight fs mount` 浏览或调整页面。

推理已经不再是难题，保持连续性才是。阅读 [0.9.0 发布说明](/blog/2026/08/06/hindsight-0-9-0)，或者安装集成，让你的编码智能体编写自己的文档。

---

**了解更多：**
- [编码智能体集成](/sdks/integrations/coding-agents) — 一条命令，为 Claude Code 及其他编码智能体接入原生记忆
- [知识页开发者指南](/developer/knowledge-pages) — 了解知识页概念及其底层模型
- [为任意 Agent Plugins 客户端接入记忆](/blog/2026/08/12/agent-plugins-persistent-memory) — 与此自动集成相对应的显式、可移植方案
