---
title: "给予Aider比会话更持久的记忆"
authors: [benfrank241]
slug: "2026/07/09/aider-persistent-memory"
date: 2026-07-09T12:00
tags: [hindsight, aider, integration, memory, persistent-memory, pair-programming, tutorial]
description: "Aider是一个锋利的终端对编程器，退出时会忘记一切。 hindsight-aider 包装该命令，以便它在每次会话之前回忆您项目的决策，并保留其之后学到的内容。"
image: /img/blog/aider-persistent-memory.webp
hide_table_of_contents: true
---

![Aider 与 Hindsight 结对编程 CLI 的持久记忆](/img/blog/aider-persistent-memory.webp)

[Aider](https://aider.chat) 是最好的终端 AI 结对程序员之一。它编辑真实的文件，进行自己的 git 提交，并且不妨碍您。但就像每个编码智能体一样，它在单个会话中非常出色，而在会话之间却是空白。退出Aider，明天再回来，它忘记了这个存储库使用`uv`而不是`pip`，你上周决定反对ORM，并且你的测试位于它们覆盖的代码旁边。

`hindsight-aider` 解决了这个问题，而无需改变您的工作方式。它是 `aider` 命令的嵌入式包装器，可以在会话之前调用项目的记忆，并保留会话之后生成的内容，并由 git 存储库范围内的共享 [Hindsight](https://github.com/vectorize-io/hindsight) 记忆支持。

<!-- truncate -->

## 概览 {#tldr}

- `hindsight-aider` 包裹`aider`。每个论点都会直接通过，因此只需一个词就可以改变你的启动方式。
- **之前** 会话会调用相关项目记忆并通过Aider自己的`--read`上下文文件注入它。
- **之后** 该会话将成绩单保留到Hindsight，因此下一个会话将从本次学到的内容开始。
- 记忆的范围是**每个 git 仓库**，因此Aider与同一项目上的其他Hindsight编辑器集成共享一个记忆。
- 与[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器配合使用。 [智能体记忆](https://vectorize.io/what-is-agent-memory)比对话更长久。

## 问题：伟大的结对程序员没有昨天 {#the-problem-a-great-pair-programmer-with-no-yesterday}

一对程序员在会话之间忘记所有事情，这让你记忆深刻。每次开始新的 Aider 运行时，您都需要重新解释堆栈，重述约定，并重新论证您已经解决的决定。该模型有能力；它只是从一个会话到下一个会话没有连续性。

持久记忆弥补了这一差距。记忆的意义在于，你已经告诉过Aider的事情，以及与你一起解决的事情，下次仍然存在。这就是将每会话工具变成真正了解您的项目的结对程序员的原因。

## Aider的记忆如何运作 {#how-aiders-memory-works}

Aider 没有 MCP 客户端，也没有每个提示钩子，因此无法像带有插件 API 的编辑器那样在对话中注入上下文。 Aider 确实为您提供了两个构建块，并且包装器使用了这两个构建块。

**只读上下文文件。** Aider 将使用 `--read` 传递的文件加载到模型上下文中作为参考材料，它不会编辑。 `hindsight-aider` 查询 Hindsight，将结果写入 Markdown 文件 (`.aider.hindsight-memory.md`)，然后启动 `aider --read .aider.hindsight-memory.md …`，以便您的项目记忆处于第一条消息的上下文中。

​​**聊天记录文件。** Aider 将会话记录到`.aider.chat.history.md`。 Aider退出后，包装器仅读取本次会话期间写入的切片，并将其保留到存储库的Hindsight记忆库中，因此交换成为下次的持久记忆。

记忆召回在启动时运行一次。如果您使用 `aider -m "修复认证缺陷"` 启动一次性任务，该消息将成为记忆召回查询，因此提取的记忆与您将要做的事情相关。对于交互式会话，它会回忆一般的项目上下文。因为 Aider 无法在对话中挂钩，所以每次会话一次的记忆召回非常适合其工作流程，并且它与人们实际使用 Aider 的方式一致：打开它来处理某件事，在事情完成后关闭它。

## 安装和快速启动 {#install-and-quick-start}

```bash
pip install hindsight-aider        #还需要Aider：pip安装aider-chat
export HINDSIGHT_API_TOKEN=hsk_... #省略开放式自托管服务器
```

然后像`aider`一样使用它。每个参数都原封不动地通过：

```bash
hindsight-aider                        #交互式，项目记忆已加载
hindsight-aider -m "添加重试逻辑"   #一发； 记忆召回使用信息
hindsight-aider src/app.py tests/      #任何辅助参数都可以工作
```

这就是整个更改：在您过去输入`aider`的地方输入`hindsight-aider`。它需要 Python 3.10 或更高版本，并且它依赖于 Aider 自己的标志，而不是替换它们中的任何一个。

## 云或自托管 {#cloud-or-self-hosted}

对于 **Hindsight Cloud**，将 `HINDSIGHT_API_TOKEN` 设置为仪表板上的键。 API URL 默认为 `https://api.hindsight.vectorize.io`，因此无需配置其他内容。

对于 **自托管** 服务器，使用 `HINDSIGHT_API_URL=http://localhost:8888` 指向您自己的基本 URL。开放的本地服务器不需要令牌。

配置从`~/.hindsight/aider.json`或环境变量解析：

|设置|环境变量|默认|
| --- | --- | --- |
|API 网址|`HINDSIGHT_API_URL`|`https://api.hindsight.vectorize.io`|
|API 令牌|`HINDSIGHT_API_TOKEN`|无（云所需）|
|记忆库id|`HINDSIGHT_AIDER_BANK_ID`|git 仓库名称|
|自动记忆召回|`HINDSIGHT_AIDER_AUTO_RECALL`|`true`|
|自动记忆存储|`HINDSIGHT_AIDER_AUTO_RETAIN`|`true`|
|Aider 命令|`HINDSIGHT_AIDER_COMMAND`|`aider`|

## 每个存储库一个记忆 {#one-memory-per-repo}

默认情况下，记忆库是您的**git 仓库名称**，而不是Aider特定的标签。那是故意的。点Aider和您的其他Hindsight编辑器集成在同一个存储库中，并且它们共享一个记忆，因此当您打开Aider时，您在[Cursor](/blog/2026/06/12/cursor-persistent-memory)或[Zed](/blog/2026/07/07/zed-persistent-memory)中做出的决定就在那里，反之亦然。这就是[每个AI工具都有一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)背后的想法：无论您碰巧驾驶的是哪种智能体，该项目都会记住。

## 验证其是否有效 {#verify-it-works}

在一次会话中给Aider一个持久的事实：告诉它“这个项目使用`uv`，从不使用`pip`”，并让它进行编辑。退出，然后启动相关任务的 **新** 会话，例如 `hindsight-aider -m "添加 httpx 依赖"`。记忆感知运行会回忆起惯例并在没有提醒的情况下到达`uv`，因为事实已保留到Hindsight并根据您的新请求被召回。

你也可以从另一边观看。在第一次会话后打开您的Hindsight记忆库，您将看到保留的成绩单显示为存储的记忆。

## 常见问题 {#frequently-asked-questions}

**记忆召回会自动发生吗？**
是的，在发布时。 `hindsight-aider` 在开始之前调用 Aider 并通过 `--read` 注入结果，因此您无需执行任何额外操作。它会在每个会话而不是每条消息中调用一次，因为 Aider 没有公开对话中的钩子。

**会妨碍Aider的正常使用吗？**
没有。它是一个传递包装器：所有常用的 `aider` 参数都保持不变，如果记忆召回或记忆存储失败，它将被记录并跳过，而不是阻塞会话。

**我需要安装什么？**
Python 3.10+、Aider (`pip install aider-chat`) 和 `hindsight-aider`。使用 API 令牌将其指向 Hindsight Cloud，或使用 `HINDSIGHT_API_URL` 指向自托管服务器。

**我可以关闭记忆召回或记忆存储吗？**
是的。设置`HINDSIGHT_AIDER_AUTO_RECALL=false`或`HINDSIGHT_AIDER_AUTO_RETAIN=false`（或`~/.hindsight/aider.json`中的匹配键）以仅运行循环的一侧。

**为什么不直接将上下文粘贴到 CONVENTIONS 文件中？**
静态文件捕获您想要写下的内容，并且永远不会自行更新。 记忆会随着您的工作而增长，回忆起与当前任务相关的内容，并在存储库中指向的每个工具之间共享。它耐用且有选择性，而不是您手工维护的手动注释。

## 进一步阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回和保留背后的概念。
- [最佳AI智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：主要记忆框架的比较。
- [Cursor持久记忆](/blog/2026/06/12/cursor-persistent-memory)：与AI第一编辑器的想法相同。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将Aider和你的其他智能体指向同一个记忆库。
