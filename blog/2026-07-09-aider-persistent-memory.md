---
title: "为 Aider 提供跨会话记忆"
authors: [benfrank241]
slug: "2026/07/09/aider-persistent-memory"
date: 2026-07-09T12:00
tags: [hindsight, aider, integration, memory, persistent-memory, pair-programming, tutorial]
description: "Aider 是一款出色的终端结对编程工具，但退出后便会忘记所有内容。hindsight-aider 会包装该命令，在每次会话开始前召回项目决策，并在会话结束后存入本次学到的内容。"
image: /img/blog/aider-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 Aider 结对编程 CLI 提供持久记忆](/img/blog/aider-persistent-memory.webp)

[Aider](https://aider.chat) 是目前最出色的终端 AI 结对编程工具之一。它可以编辑真实文件、自己创建 git 提交，而且不会妨碍你的工作。但和所有编程智能体一样，它在单次会话中表现出色，会话之间却一片空白。退出 Aider，第二天再回来，它就忘了这个仓库使用的是 `uv` 而不是 `pip`、你上周决定不采用 ORM，以及测试文件和它们所覆盖的代码放在一起。

`hindsight-aider` 可以解决这个问题，同时不改变你的工作方式。它是 `aider` 命令的即插即用包装器，会在会话开始前召回项目记忆，并在会话结束后将本次产生的内容存入 Hindsight。它使用按 git 仓库划分范围的共享 [Hindsight](https://github.com/vectorize-io/hindsight) 记忆库。

<!-- truncate -->

## 概要 {#tldr}

- `hindsight-aider` 会包装 `aider`。所有参数都会原样传递，因此启动命令只需改一个词。
- 会话开始**前**，它会召回相关项目记忆，并通过 Aider 自带的 `--read` 上下文文件注入这些内容。
- 会话结束**后**，它会将会话记录存入 Hindsight，让下一次会话可以从本次学到的内容开始。
- 记忆按 **git 仓库划分**，因此 Aider 可以与同一项目中其他 Hindsight 编辑器集成共享一份记忆。
- 它既可配合 [Hindsight Cloud](https://hindsight.vectorize.io)，也可配合自托管服务器使用。这种[智能体记忆](https://vectorize.io/what-is-agent-memory)可以跨越当前对话持续存在。

## 问题：出色的结对程序员却没有昨天 {#the-problem-a-great-pair-programmer-with-no-yesterday}

结对程序员若在会话之间忘掉所有事情，你就得替它记住一切。每次启动新的 Aider 会话，你都要重新解释技术栈、重述约定，还要再次讨论已经定下的决定。模型本身很有能力，只是无法在前后两次会话之间保持连续性。

持久记忆填补了这个空白。记忆的意义在于：你之前告诉 Aider 的内容，以及它与你一起推导出的内容，下次仍然可用。这样，每次会话结束就归零的工具才能成为真正了解你项目的结对程序员。

## Aider 的记忆如何运作 {#how-aiders-memory-works}

Aider 没有 MCP 客户端，也没有逐条提示的钩子，因此无法像带有插件 API 的编辑器那样，在对话中途注入上下文。Aider 提供了两个可用机制，包装器会同时利用它们。

**只读上下文文件。** Aider 会将通过 `--read` 传入的文件作为参考资料加载到模型上下文中，并且不会编辑这些文件。`hindsight-aider` 会查询 Hindsight，将结果写入 Markdown 文件（`.aider.hindsight-memory.md`），然后启动 `aider --read .aider.hindsight-memory.md …`，让项目记忆从第一条消息开始就进入上下文。

**聊天记录文件。** Aider 会将会话记录到 `.aider.chat.history.md`。Aider 退出后，包装器只读取本次会话写入的部分，并将其存入该仓库的 Hindsight 记忆库，让这段交流成为下次可用的持久记忆。

记忆召回只在启动时运行一次。如果你用 `aider -m "fix the auth bug"` 启动一次性任务，这条消息就会作为召回查询，使取回的记忆与你即将处理的任务相关。对于交互式会话，它会召回一般的项目上下文。由于 Aider 无法在对话中途接入钩子，每次会话召回一次最符合它的工作流程，也符合人们实际使用 Aider 的方式：打开它处理一件事，完成后再关闭。

## 安装和快速开始 {#install-and-quick-start}

```bash
pip install hindsight-aider        # 还需要安装 Aider：pip install aider-chat
export HINDSIGHT_API_TOKEN=hsk_... # 开放访问的自托管服务器可省略
```

之后像使用 `aider` 一样使用它。所有参数都会原样传递：

```bash
hindsight-aider                        # 交互式运行，加载项目记忆
hindsight-aider -m "add retry logic"   # 单次任务；召回查询使用这条消息
hindsight-aider src/app.py tests/      # 支持任意 aider 参数
```

整个改动就这么简单：以前输入 `aider` 的地方，现在输入 `hindsight-aider`。它需要 Python 3.10 或更高版本，并使用 Aider 自带的标志，不会替换其中任何一个。

## Hindsight Cloud 或自托管 {#cloud-or-self-hosted}

使用 **Hindsight Cloud** 时，将 `HINDSIGHT_API_TOKEN` 设为你在控制台获取的密钥。API URL 默认为 `https://api.hindsight.vectorize.io`，因此无需进行其他配置。

使用**自托管**服务器时，通过 `HINDSIGHT_API_URL=http://localhost:8888` 指定自己的基础 URL。开放访问的本地服务器不需要令牌。

配置从 `~/.hindsight/aider.json` 或环境变量中读取：

| 设置 | 环境变量 | 默认值 |
| --- | --- | --- |
| API URL | `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` |
| API 令牌 | `HINDSIGHT_API_TOKEN` | 无（Hindsight Cloud 需要） |
| 记忆库 ID | `HINDSIGHT_AIDER_BANK_ID` | git 仓库名称 |
| 自动召回 | `HINDSIGHT_AIDER_AUTO_RECALL` | `true` |
| 自动存入 | `HINDSIGHT_AIDER_AUTO_RETAIN` | `true` |
| Aider 命令 | `HINDSIGHT_AIDER_COMMAND` | `aider` |

## 每个仓库一份记忆 {#one-memory-per-repo}

默认情况下，记忆库 ID 使用你的 **git 仓库名称**，而不是 Aider 专用名称。这是有意设计的。让 Aider 和其他 Hindsight 编辑器集成都指向同一个仓库，它们就能共享一份记忆。这样，你在 [Cursor](/blog/2026/06/12/cursor-persistent-memory) 或 [Zed](/blog/2026/07/07/zed-persistent-memory) 中作出的决定，在打开 Aider 时也能用上，反之亦然。这就是[让每种 AI 工具共享一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)的理念：无论你使用哪个智能体，项目都能记住相关内容。

## 验证是否正常工作 {#verify-it-works}

在一次会话中告诉 Aider 一条需要长期保留的事实，例如 “this project uses `uv`, never `pip`”，然后让它修改代码。退出 Aider，再针对相关任务启动一个**新**会话，例如 `hindsight-aider -m "add the httpx dependency"`。启用了记忆的运行会召回这项约定，因此无需提醒就会使用 `uv`，因为这条事实已经存入 Hindsight，并根据新的请求完成召回。

你也可以从另一侧查看结果。在第一次会话后打开 Hindsight 记忆库，就能看到刚存入的会话记录成为一条记忆。

## 常见问题 {#frequently-asked-questions}

**记忆会自动召回吗？**
会，在启动时自动召回。`hindsight-aider` 会在启动 Aider 前执行召回，并通过 `--read` 注入结果，因此你无需额外操作。它每个会话只召回一次，而不是每条消息都召回，因为 Aider 没有提供对话中途调用的钩子。

**它会妨碍正常使用 Aider 吗？**
不会。它只是一个透传包装器：你平常使用的所有 `aider` 参数都能照常工作；如果召回或存入失败，程序会记录错误并跳过这一步，不会阻塞会话。

**需要安装什么？**
需要 Python 3.10 或更高版本、Aider（`pip install aider-chat`）以及 `hindsight-aider`。你可以通过 API 令牌连接 Hindsight Cloud，或通过 `HINDSIGHT_API_URL` 连接自托管服务器。

**可以关闭自动召回或自动存入吗？**
可以。将 `HINDSIGHT_AIDER_AUTO_RECALL=false` 或 `HINDSIGHT_AIDER_AUTO_RETAIN=false` 设为相应值（也可以在 `~/.hindsight/aider.json` 中设置对应键），即可只运行这一循环中的一侧。

**为什么不直接把上下文粘贴到 CONVENTIONS 文件？**
静态文件只能记录你想到并写下的内容，而且不会自行更新。记忆会随着工作逐渐增长，会召回与当前任务相关的内容，并在所有指向该仓库的工具之间共享。它持久且有选择性，不是需要你手动维护的笔记。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解召回与存入背后的概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：了解主流记忆框架之间的比较。
- [Cursor 持久记忆](/blog/2026/06/12/cursor-persistent-memory)：了解如何在 AI 优先的编辑器中实现相同理念。
- [让每种 AI 工具共享一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让 Aider 和其他智能体指向同一个记忆库。
