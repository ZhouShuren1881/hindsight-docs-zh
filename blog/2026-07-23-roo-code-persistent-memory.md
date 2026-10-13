---
title: "给 Roo 代码一个记忆，这样每个任务都建立在最后一个任务的基础上"
authors: [benfrank241]
slug: "2026/07/23/roo-code-persistent-memory"
date: 2026-07-23T12:00
tags: [hindsight, roo-code, agent-memory, persistent-memory, coding-agent, mcp, tutorial]
description: "Roo Code 运行自主编码任务，但每个任务都从零开始。添加Hindsight智能体记忆：在每个任务之前添加记忆召回上下文，在之后添加记忆存储摘要。"
image: /img/blog/roo-code-persistent-memory.webp
hide_table_of_contents: true
---

![Roo 代码与 Hindsight：每个任务之前的记忆召回上下文，之后的记忆存储摘要](/img/blog/roo-code-persistent-memory.webp)

[Roo 代码](https://github.com/RooVetGit/Roo-Code) 是 VS Code 中增长最快的自主编码智能体之一。你给它一个任务，它会计划、编辑、运行命令，并自行完成这些步骤。它非常擅长完成眼前的任务。它在任务之间也是完全失忆的：它昨天学到的约定、你上周解释的架构决策、它已经调试过一次的错误模式，在你下次启动任务时都消失了。

Hindsight 解决了这个问题。安装一次后，Roo 就会回忆起每个任务之前的相关上下文，并保留之后学到的内容，因此每个任务都建立在最后一个任务的基础上，而不是从零开始。

<!-- truncate -->

## 概览 {#tldr}

- 一个命令将持久记忆安装到 Roo 代码中：`pip install hindsight-roo-code`，然后`hindsight-roo-code install`。
- 它使用Roo扩展点的**两者**：Hindsight的**MCP工具**（`recall`，`retain`）加上告诉Roo何时调用它们的**自定义规则文件**。
- **每项任务之前** Roo回忆起相关记忆； **每项任务之后** 它保留了摘要。它还可以在任务中记忆存储决策。
- 每个项目（`.roo/`）或全球（`~/.roo/`）的范围记忆。
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)（推荐，免费启动）或自托管服务器配合使用。

## 为什么基于任务的智能体最需要记忆 {#why-a-task-based-agent-needs-memory-most}

聊天助手至少可以让对话继续下去。像 Roo 这样的自主智能体可以处理离散的任务：你启动一个任务，它运行到完成，然后擦除。这种结构对于集中注意力很有帮助，但对于连续性却很糟糕。每个任务都会从头开始重新学习您的堆栈，重新发现相同的陷阱，并重新询问您已经回答的问题。

智能体记忆能够将一系列孤立的任务转变为真正了解您的项目的智能体。从任务一中学到的知识将成为任务五十的起始背景，因此智能体随着您使用时间的延长而变得更加有用，而不是更少。

## 设置 {#setup}

首先，获取一个Hindsight实例。最简单的方法是[Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册，获取API密钥，无需运行。 （如果您愿意，下面是自托管说明。）

然后安装集成：

```bash
#安装 CLI
pip install hindsight-roo-code

#安装到您的项目中（默认为Hindsight Cloud）
hindsight-roo-code install

#重启Roo Code，记忆激活
```

这就是整个设置。重新启动 Roo Code 并启动任务。

## 工作原理：MCP工具加规则 {#how-it-works-mcp-tools-plus-rules}

Roo Code 有两个扩展点，这种集成同时使用了这两个扩展点，这使得它感觉是自动的而不是手动的。

**MCP服务器** 赋予 Roo 能力。安装程序编写`.roo/mcp.json`，注册Hindsight的内置`/mcp`端点并公开两个工具：

|工具|它的作用|
|------|--------------|
|`recall`|在记忆中搜索与当前任务相关的上下文|
|`retain`|立即存储决定、发现或总结|

两者都是自动批准的（`alwaysAllow`），因此 Roo 可以使用它们，而无需在每次通话时停下来请求许可。

**规则文件** 提供行为。安装程序还编写`.roo/rules/hindsight-memory.md`，它被注入到每个 Roo 系统提示符中，并告诉智能体何时使用这些工具：

```
New task starts
  └─ Rules tell Roo to call recall
       └─ Relevant memories injected into context

Agent working…
  └─ retain stores decisions and discoveries as they happen

Task ends
  └─ Rules tell Roo to call retain with a summary
       └─ Summary stored for the next session
```

MCP就能为Roo提供它可能永远不会使用的记忆工具。仅靠规则无法存储或检索任何内容。功能和指令一起产生一个默认记住的智能体：它在任务开始时提取正确的上下文，并在结束时写回重要部分。
仅

## 项目记忆或全局记忆 {#project-memory-or-global-memory}

默认情况下，安装程序会写入当前项目中的`.roo/`，因此记忆范围仅限于该代码库，这通常是您想要的编码智能体。一个项目的惯例不会渗透到另一个项目的惯例中。

```bash
hindsight-roo-code install                       #仅此项目
hindsight-roo-code install --project-dir /path   #特定项目
hindsight-roo-code install --global              # ~/.roo, applies everywhere
```

使用全局安装来实现跨项目的习惯和偏好，并使用项目安装来实现仅在一个存储库中有意义的细节。如果您想了解记忆范围的完整情况，我们写了一个[记忆库策略实地指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 云或自托管 {#cloud-or-self-hosted}

对于**Hindsight Cloud**，安装程序默认为`https://api.hindsight.vectorize.io`，您只需要API密钥即可。

对于 **自托管** 服务器，首先启动 Hindsight 并将安装程序指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api                                   # serves http://localhost:8888

hindsight-roo-code install --api-url http://localhost:8888
```

它写入的MCP条目看起来像这样，所以你可以随时检查或编辑它：
它写入的

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "streamable-http",
      "url": "http://localhost:8888/mcp",
      "timeout": 30,
      "alwaysAllow": ["recall", "retain"]
    }
  }
}
```

## 验证它是否有效 {#verifying-it-works}

1. 启动Hindsight（或使用云）并运行安装程序。
2. 在您的项目中打开 Roo Code。
3. 在 **设置→MCP服务器** 中，`hindsight` 应显示为已连接。
4. 启动任务并查看工具调用日志。你应该在一开始就看到 `recall` 着火。

在一个任务中教它一些东西（“这个存储库使用 pnpm，而不是 npm；在源旁边进行实时测试”），然后在第二天开始一项新任务并自行观看记忆。

## 记忆跟随你 {#the-memory-follows-you}

因为记忆存在于Hindsight记忆库中而不是Roo代码中，所以它不被锁定到一种工具。将另一个Hindsight集成指向同一个记忆库，上下文就会延续。 Roo 保留的决策可供Claude Code、Cursor或从该记忆库读取的任何其他工具使用。 Roo 是任务运行的地方；记忆是它幸存下来的东西。

## 常见问题 {#frequently-asked-questions}

**这会取代 Roo Code 的上下文吗？**
没有。 Roo 仍然为任务组装自己的工作环境。 Hindsight 添加了一个跨任务和会话持续存在的持久层，并在开始时注入相关切片。

**我必须批准每个记忆通话吗？**
没有。 `recall` 和 `retain` 在 MCP 配置中自动批准，因此它们运行时不会中断任务。

**我的记忆仅限于一个项目吗？**
默认是。项目安装写入`.roo/`，因此每个存储库都有自己的记忆。如果您想在所有项目中共享记忆，请使用`--global`。

**可以离线使用吗？**
是的。自托管 Hindsight，将安装程序指向 `http://localhost:8888`，一切都不会离开您的计算机。

## 尝试一下 {#try-it}

如果您已经使用 Roo Code，感受差异的最快方法是安装集成，完成几个任务，然后明天开始一个新的任务，看着它从您上次停下的地方继续。 [获取免费的Hindsight Cloud密钥](https://ui.hindsight.vectorize.io) 并运行`hindsight-roo-code install`。

## 进一步阅读 {#further-reading}

- [Roo 代码集成参考](/sdks/integrations/roo-code)：每个选项都在一处。
- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：Roo 每次保留摘要时Hindsight 存储的内容。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：为什么存储位于任何单一智能体之外。
