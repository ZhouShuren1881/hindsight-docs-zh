---
title: "再添四种记得项目的编程智能体"
authors: [benfrank241]
slug: "2026/09/02/coding-agents-050-four-new-harnesses"
date: 2026-09-02T12:00
tags: [hindsight, coding-agents, integrations, opencode, qwen-code, deepagents, pi, release]
description: "Coding Agents 0.5.0 新增 pi、Qwen Code、DeepAgents Dcode 和 opencode 2，使支持的智能体总数达到 16 种，它们都能按仓库共享同一份记忆。本文介绍编程智能体的工作方式，以及记住项目后会发生什么变化。"
image: /img/blog/coding-agents-050-four-harnesses.webp
hide_table_of_contents: true
---

![Coding Agents 0.5.0 新增四种智能体运行框架：pi、Qwen Code、DeepAgents Dcode 和 opencode 2，它们共享同一份记忆](/img/blog/coding-agents-050-four-harnesses.webp)

如今编程智能体层出不穷，而且能力确实越来越强。几乎每隔几周就会出现一种新工具，对智能体该如何工作都有自己的鲜明主张：如何规划、可以访问哪些内容，以及是在终端中运行还是以无界面模式在 CI 中运行。

`hindsight-coding-agents` 0.5.0 新增了四种智能体——**pi**、**Qwen Code**、**DeepAgents Dcode** 和 **opencode 2**——使软件包支持的智能体总数达到 **16 种**。

接入全部 16 种的理由并非追求面面俱到，而是它们可以共享同一份记忆。

<!-- truncate -->

## 编程智能体实际上如何工作 {#how-a-coding-agent-actually-works}

去掉界面后，这些工具执行的循环都一样：你输入请求，智能体读取文件、搜索符号、运行命令、制定计划并编辑代码。关闭会话后，上下文就消失了。下次使用时，它又得从头开始。

值得关注的是这种重置，因为它会丢掉一些重要内容。

智能体总能重建机械层面的信息。它可以重新读取代码、推导调用图、弄清函数的作用；现代智能体很擅长这些。但代码里从未写过的内容，它无从重建。

实际修复所需的大部分信息都能从代码库推导出来。**最后一公里**通常不能，因为它取决于某人曾作出的决定：

- 采用四舍五入，因为财务团队八个月前在一次讨论中提出过这个要求。
- 不要重试那个端点，因为它不具备幂等性，而团队曾因此吃过亏。
- 两条记录并列时优先选较旧的一条，因为过去的导入器就是这样处理的。

这些信息都不在源码里，而是在 git 历史、拉取请求讨论，以及上周你与智能体的对话中。因此，每次会话都要重新解释一遍。智能体无从了解这些背景，于是自信地选择看似合理、实际却不正确的做法。

## 智能体记住项目后会发生什么 {#what-changes-when-the-agent-remembers}

`hindsight-coding-agents` 接入智能体自身的生命周期。你的工作方式无需改变；智能体只是不再从零开始。

**会话开始时**，项目记忆会载入上下文：这个仓库是什么、有哪些约定、已经作出哪些决定。

**每次提示时**，系统都会根据你刚提出的请求执行一次召回，找出与*当前任务*相关的内容，而不是把所有已知信息一股脑地倒出来。

**会话期间**，智能体可以使用原生 `hindsight_*` 工具，主动查询特定信息。“我们以前遇到过这个问题吗？”从猜测变成了查询。

**会话结束时**，会话内容会写回记忆库。今天下午作出的决定，就是明天会话的起点。

无需额外设置步骤。只需指定一个仓库，工作期间，git 历史和对话就会在后台流入记忆库。在此之上，还有一组人工维护的**知识页**，记录架构、约定和正在进行的工作，后续会话会先读取这些页面。

## 十六种智能体，共享一份记忆 {#sixteen-agents-one-memory}

智能体数量的意义就在于此。

在同一仓库中工作的智能体**默认共享一个记忆库**，名称为 `coding-agent::{gitProject}`。记忆库按项目划分，而不是按智能体划分。

告诉 pi 的内容，在你打开 Prime Agent 时依然可用。周一在 Claude Code 中作出的决定，周四 Qwen Code 也能读取。本周试用 opencode 2、下周改用 Codex，记忆也不会丢失，因为它从来不属于某个智能体，而是属于仓库。

这样，切换智能体就成了无需付出代价的自由选择。做架构工作时，可以选擅长规划的智能体；在 CI 中使用无界面运行的智能体；做小改动时选速度快的智能体。它们读取和写入的是同一份项目记忆。

每个智能体存入内容时都会标记自己的名称，因此你始终可以追溯每条内容是由哪个智能体写入的。

## 新增的四种智能体 {#the-four-new-agents}

| 智能体 | 开发方 | 运行方式 | 接入方式 |
|---|---|---|---|
| **pi** | Earendil Works | 终端 | 扩展、原生工具 |
| **Qwen Code** | Qwen | 终端、无界面 | 钩子 + MCP |
| **DeepAgents Dcode** | LangChain | 终端、无界面 | 原生 Agent Plugin |
| **opencode 2** | opencode（测试版） | 终端 | 插件、原生工具 |

### pi

在 `~/.pi/agent/settings.json` 中注册扩展，并搭配一个配套技能使用原生工具，中间无需经过 MCP 层。pi 的一个衍生版本 **Prime Agent** 也在自己的设置文件中以相同方式接入。根据前文所述，两者共享仓库记忆，同时各自保留来源标记。

### Qwen Code

Qwen Code 已有自己的项目上下文约定：它会读取仓库中的 `QWEN.md` 文件，因此启动时会先获得你手动记录的内容。

![Qwen Code 启动时读取三个 QWEN.md 文件](/img/blog/hindsight-coding-agents-qwen-code.webp)

Hindsight 补上了你未曾记录下来的另一半。`QWEN.md` 保存人们记得写下的内容，记忆库保存实际发生过的事——包括 git 历史中的决定，以及促成这些决定的对话。钩子会写入 `~/.qwen/settings.json`，与 MCP 和配套技能一同配置。

### DeepAgents Dcode

这是 LangChain 推出的编程智能体，其插件机制也最有主见：它有自己的市场和插件管理器，Hindsight 通过该管理器作为**原生 Agent Plugin**安装，无需额外拼接接入。一份 `plugin.json` 就能同时提供技能、会话生命周期集成和 `hindsight_*` 工具。

![DeepAgents Dcode v0.1.65](/img/blog/hindsight-coding-agents-dcode.png)

Dcode 也支持无界面运行（`dcode -n`）。这正是项目记忆发挥作用的场景：在 CI 中无人值守运行的智能体没有人可问，因此所需上下文必须预先准备好。

### opencode 2

新版 opencode 目前仍处于测试阶段，以 `opencode2` 的形式与 v1 并存，而不是取代 v1。它从头重写了插件 API，因此作为独立的智能体运行框架接入。

![本地运行的 opencode](/img/blog/hindsight-coding-agents-opencode.png)

两个版本读取同一份配置文件，也共享仓库记忆库，因此你可以试用 v2，同时保留 v1 已经积累的所有内容。

## 安装 {#installing}

只需一条命令，就能接入机器上检测到的所有智能体：

```bash
npx @vectorize-io/hindsight-coding-agents install all
```

![hindsight-coding-agents install all 在 3.2 秒内接入检测到的七种编程智能体](/img/blog/hindsight-coding-agents-install-all.png)

这段输出值得仔细看看，因为它展现了不同宿主之间的巨大差异。七种智能体，**没有两种采用相同的接入方式**：有的把钩子合并进 JSON 设置文件，有的注册扩展，有的在用户级别添加 MCP 服务器，还有的把插件补丁写入一个适用于机器上所有配置档案的 YAML 配置档案。

不指定目标直接运行 `install` 不会修改任何内容，只会显示可选项，让你可以先查看再进行接入。也可以指定一种智能体：

```bash
npx @vectorize-io/hindsight-coding-agents install qwen-code
```

更新时，再执行一次相同的命令即可。

## 实现这些接入时的一些细节 {#a-note-on-what-that-takes}

统一的安装命令背后，是一组差异很大的宿主接入约定，其中有些细节稍不留神就会出问题。

Qwen Code 是最典型的例子。它的钩子协议与 Claude Code 的协议逐字段一致：数据封装结构相同，输出格式相同，退出语义也相同，唯一区别是：**Qwen Code 的超时单位是毫秒，而不是秒。**如果按惯例填写 `30`，注册的就是一个 30 毫秒的钩子。更麻烦的是，测试看起来可能一切正常，因为 Qwen 只会终止直接子进程；孤立任务仍会继续完成，记忆也仍然会出现。现在，智能体运行框架规范中明确包含 `timeoutUnit`，测试会在该字段被遗漏时失败。

大多数工作都属于这种情况。安装命令只有一行，是因为这些差异都由这里处理了，无需你逐一应对。

## 0.5.0 的其他更新 {#also-in-050}

- **按来源划分观测范围**，让观测能够保留其来源信息。
- **已安装的运行时会自动保持最新**，而不再固定在最初安装的版本。
- **MCP 工具安全注解**，某些宿主要求工具带有此类注解，才会允许调用。
- **git 探测失败时，不再把工作树误分配到独立的记忆库。**

随后发布的 0.5.1 带来了一项值得采用的修复：运行时自动更新此前没有触发。如果你在 0.5.0 发布首日就安装了它，请进行更新。

```bash
npm install -g @vectorize-io/hindsight-coding-agents@latest
```

## 了解更多 {#learn-more}

- [Coding Agents 更新日志](/changelog/integrations/coding-agents)：查看所有版本的完整记录。
- [面向编程智能体的知识页](/blog/2026/08/13/knowledge-pages-coding-agents)：智能体会首先读取的人工维护层。
- [一个记忆库还是多个？智能体记忆结构指南](/blog/2026/07/16/bank-strategy-agent-memory)：了解记忆如何在不同仓库和智能体之间划分范围。
