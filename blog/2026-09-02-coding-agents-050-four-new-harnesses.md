---
title: "再添四种记得项目的编程智能体"
authors: [benfrank241]
slug: "2026/09/02/coding-agents-050-four-new-harnesses"
date: 2026-09-02T12:00
tags: [hindsight, coding-agents, integrations, opencode, qwen-code, deepagents, pi, release]
description: "Coding Agents 0.5.0 新增 pi、Qwen Code、DeepAgents Dcode 和 opencode 2，总计支持 16 种智能体，按仓库共享记忆。了解其工作原理及拥有记忆后的变化。"
image: /img/blog/coding-agents-050-four-harnesses.webp
hide_table_of_contents: true
---

![Coding Agents 0.5.0 新增 pi、Qwen Code、DeepAgents Dcode 和 opencode 2，共享同一记忆库](/img/blog/coding-agents-050-four-harnesses.webp)

编程智能体越来越多，能力也越来越好。每隔几周就有新工具出现，对规划方式、可访问内容，以及终端或 CI 无界面运行，都有自己的明确主张。

`hindsight-coding-agents` 0.5.0 新增 **pi**、**Qwen Code**、**DeepAgents Dcode** 和 **opencode 2**，总计支持 **16 种智能体**。

接入全部十六种的理由并非凑齐数量，而是它们能共享同一份记忆。

<!-- truncate -->

## 编程智能体如何工作 {#how-a-coding-agent-actually-works}

去掉界面，这些工具执行的循环都相同：你提出请求，智能体读取文件、搜索符号、运行命令、规划并编辑。关闭会话后，上下文消失，下次重新开始。

值得关注的是重置时*丢失了什么*。

机械性的理解总能重建：重新读代码、推导调用图、理解函数用途，现代智能体很擅长这些。但从未写进代码的内容，无法重建。

真正修复所需的大部分信息可从代码库推导，**最后一步**往往不行，它依赖某人曾作出的决定：

- 采用四舍五入，因为财务八个月前在讨论中要求过。
- 不重试某端点，因为它不幂等，团队曾为此付出代价。
- 两条记录并列时优先较旧的，因为旧导入器就是这样处理。

这些不在源码里，而在 git 历史、拉取请求讨论，以及上周与智能体的对话中。因此每次会话都要重新解释。智能体无从了解背景，自信地做出看似合理但不正确的选择。

## 智能体拥有记忆后的变化 {#what-changes-when-the-agent-remembers}

`hindsight-coding-agents` 接入智能体自身的生命周期，工作方式无需改变，智能体只是不再从零开始。

**会话开始时**，项目记忆注入上下文：仓库是什么、采用哪些约定、已经作过哪些决定。

**每次提示时**，针对当前请求召回与*该任务*相关的内容，而非倾倒全部知识。

**会话期间**，智能体有原生 `hindsight_*` 工具，可主动查证。“我们遇到过吗？”成为查询，而非猜测。

**结束时**，会话写回记忆库。今天下午的决定成为明天会话的起点。

无需额外配置步骤。指向仓库后，git 历史和对话会在工作期间后台进入记忆库。其上还有经过整理的**知识页面**，记录架构、约定和进行中的计划，后续会话先读这些页面。

## 十六种智能体，一份记忆 {#sixteen-agents-one-memory}

数量的意义在这里。

同一仓库中的智能体**默认共享一个记忆库**，名为 `coding-agent::{gitProject}`。按项目划分，不是按智能体划分。

告诉 pi 的内容，打开 Prime Agent 时仍在；周一在 Claude Code 作出的决定，周四 Qwen Code 可使用。本周试用 opencode 2、下周回到 Codex，也不会丢失，因为记忆属于仓库。

切换智能体因此成为自由选择，不再付出上下文成本：架构工作用擅长规划的，CI 用无界面运行的，小修改用快速的。它们都读写同一项目记忆。

每个智能体存储时仍标记自己的名称，始终可查看是谁学到什么。

## 新增的四种智能体 {#the-four-new-agents}

| 智能体 | 开发方 | 运行方式 | 接入方式 |
|---|---|---|---|
| **pi** | Earendil Works | 终端 | 扩展、原生工具 |
| **Qwen Code** | Qwen | 终端、无界面 | 钩子 + MCP |
| **DeepAgents Dcode** | LangChain | 终端、无界面 | 原生 Agent Plugin |
| **opencode 2** | opencode（测试版） | 终端 | 插件、原生工具 |

### pi

在 `~/.pi/agent/settings.json` 注册扩展并配合技能，使用原生工具，没有中间 MCP 层。pi 分支 **Prime Agent** 在自己的设置文件中采用相同方式；两者共享仓库记忆，同时保留各自来源。

### Qwen Code

Qwen Code 已有项目上下文约定：读取仓库中的 `QWEN.md`，启动时利用手动记录的内容。

![Qwen Code 启动时读取三个 QWEN.md 文件](/img/blog/hindsight-coding-agents-qwen-code.webp)

Hindsight 添加未被写下的另一半。`QWEN.md` 保存人们记得记录的内容，记忆库保存实际发生的事情，包括 git 决策和产生它们的对话。钩子写入 `~/.qwen/settings.json`，与 MCP 和配套技能并存。

### DeepAgents Dcode

这是 LangChain 的编程智能体，插件机制最鲜明：拥有自己的市场和插件管理器，Hindsight 通过它作为**原生 Agent Plugin**安装，而非外接。一份 `plugin.json` 同时提供技能、会话生命周期和 `hindsight_*` 工具。

![DeepAgents Dcode v0.1.65](/img/blog/hindsight-coding-agents-dcode.png)

Dcode 也支持无界面运行（`dcode -n`）。CI 中无人值守的智能体没有人可问，项目记忆必须预先提供上下文。

### opencode 2

新版 opencode 目前处于测试阶段，以 `opencode2` 与 v1 并存，而非取代它。插件 API 完全重写，因此作为独立运行工具接入。

![本地运行的 opencode](/img/blog/hindsight-coding-agents-opencode.png)

两版读取同一配置文件并共享仓库记忆库，试用 v2 不会失去 v1 已学到的内容。

## 安装 {#installing}

一条命令即可接入机器上找到的所有智能体：

```bash
npx @vectorize-io/hindsight-coding-agents install all
```

![hindsight-coding-agents install all 在 3.2 秒内接入七个检测到的智能体](/img/blog/hindsight-coding-agents-install-all.png)

输出值得细看：七种智能体，**没有两种接入方式完全相同**。有的合并 JSON 钩子设置，有的注册扩展，有的按用户范围添加 MCP 服务器，有的修改适用于机器所有配置的 YAML 插件配置。

不指定目标的 `install` 不作修改，只显示选项，便于先查看。也可指定一种智能体：

```bash
npx @vectorize-io/hindsight-coding-agents install qwen-code
```

更新时再次执行同一命令。

## 实现中的细节 {#a-note-on-what-that-takes}

统一安装背后是不同工具的接入约定，有些细节稍有不慎就会出错。

Qwen Code 最典型：钩子协议的封装、输出和退出语义与 Claude Code 逐字段一致，唯一区别是**超时单位为毫秒而非秒**。填写常见的 `30` 就变成 30 毫秒。更糟的是，测试看起来正常，因为 Qwen 只终止直接子进程，孤立后台任务仍完成，记忆仍出现。现在运行工具定义显式包含 `timeoutUnit`，遗漏时测试会失败。

大多数工作都如此：安装命令只有一行，因为差异在这里被吸收，无需用户处理。

## 0.5.0 的其他更新 {#also-in-050}

- **按来源划分观察范围**，观察保留来源。
- **已安装运行时自动保持最新**，不再固定首次安装版本。
- **MCP 工具安全注解**，某些工具要求有注解才允许调用。
- **git 探测失败不再使工作树分裂为独立记忆库。**

随后发布的 0.5.1 修复了运行时自动更新未触发的问题。首日安装 0.5.0 的用户请更新。

```bash
npm install -g @vectorize-io/hindsight-coding-agents@latest
```

## 了解更多 {#learn-more}

- [Coding Agents 更新日志](https://hindsight.vectorize.io/changelog/integrations/coding-agents)：各版本的完整信息。
- [编程智能体的知识页面](/blog/2026/08/13/knowledge-pages-coding-agents)：这些智能体首先阅读的整理层。
- [一个记忆库还是多个？智能体记忆结构指南](/blog/2026/07/16/bank-strategy-agent-memory)：跨仓库与智能体的范围划分。
