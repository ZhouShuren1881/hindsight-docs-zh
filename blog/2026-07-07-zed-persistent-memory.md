---
title: "给予Zed的AI辅助持久记忆"
authors: [benfrank241]
slug: "2026/07/07/zed-persistent-memory"
date: 2026-07-07T12:00
tags: [hindsight, zed, integration, memory, persistent-memory, mcp, tutorial]
description: "Zed编辑的AI助理在任务中非常敏锐，但他们之间却是陌生人。Hindsight给予它长期的记忆，可以在不同的会话中回忆和保留。"
image: /img/blog/zed-persistent-memory.webp
hide_table_of_contents: true
---

![Zed编辑器与Hindsight的持久记忆](/img/blog/zed-persistent-memory.webp)

[Zed](https://zed.dev) 是一个快速、Rust 构建的编辑器，其智能体面板中有一个真正优秀的 AI 助手。但就像大多数编码智能体一样，它在单个任务中非常出色，而在它们之间却很陌生。关闭面板，明天开始新的对话，它忘记了这个存储库使用 pnpm，您上周确定了存储库模式，并且您喜欢将测试放在一起。

`hindsight-zed` 解决了这个问题。一个命令将 Zed 的智能体面板连接到共享的 [Hindsight](https://github.com/vectorize-io/hindsight) 记忆，因此智能体可以在回答之前记忆相关决策，并在每个会话中在工作时记忆存储持久的事实。

<!-- truncate -->

## 概览 {#tldr}

- `hindsight-zed init` 在 Zed 中注册 Hindsight **MCP服务器** 并添加一条规则告诉智能体使用它。
- 智能体获得三个工具：`recall`、`retain`和`reflect`。
- 记忆召回在 **查询时间** 针对您的实际消息运行，因此它会提取与您刚刚询问的内容相关的上下文，没有延迟。
- 与[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器配合使用。 [智能体记忆](https://vectorize.io/what-is-agent-memory)比对话更长久。

## 问题：没有昨天的好助手 {#the-problem-a-great-assistant-with-no-yesterday}

一个编码助手会忘记会话之间的所有事情，让你记忆深刻。每次打开新的对话时，您都需要重新解释堆栈，重申约定，并重新论证您已经做出的决定。该模型有能力；它只是没有连续性。

持久记忆弥补了这一差距。记忆的要点是，你已经告诉你的智能体的事情，以及它已经弄清楚的事情，下次仍然存在。这就是将每个会话工具变成真正了解您的项目的助手的原因。

## Zed的记忆如何运作 {#how-zeds-memory-works}

Zed 不公开预提示钩子，因此在转弯之前没有地方自动注入上下文。 Zed 为您提供的是两个构建块，并且集成使用了这两个构建块。

**MCP 上下文服务器。**Zed运行其`settings.json`中`context_servers`下列出的[模型上下文协议](https://modelcontextprotocol.io)服务器，并在智能体面板中公开其工具。 `hindsight-zed`在那里注册HindsightMCP服务器，该服务器负责智能体`recall`、`retain`和`reflect`工具。

**全局说明文件。** Zed 在每个智能体对话中都包含 `~/.config/zed/AGENTS.md`。集成将一条简短的规则写入该文件，位于受隔离的 `<!-- HINDSIGHT:BEGIN -->` 到 `<!-- HINDSIGHT:END -->` 块内，因此它永远不会触及您自己的规则。该规则告诉智能体在每个任务开始时调用 `recall` 来加载相关决策、偏好和项目上下文，并在得知值得跨会话保留的持久事实时调用 `retain`。

结果是在查询时针对您实际发送的消息进行记忆召回。因为它是在您提出请求时运行，而不是按照固定的时间表运行，所以它可以提取与该特定请求相关的记忆。从你的座位上它是自动的：你打字，智能体会安静地检查它的记忆，然后回答。

一张运输单。 Zed 尚未提供本机 HTTP MCP 传输，因此服务器通过 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) stdio 桥连接，通过 `npx` 运行。因为该桥在 Node.js 上运行，并且安装 CLI 也是一个 Node 工具，所以 Node.js 是唯一的要求。不需要Python。

## 安装和快速启动 {#install-and-quick-start}

```bash
npx hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`hindsight-zed` 是一个零依赖节点 CLI，因此 `npx` 无需全局安装即可运行它。更喜欢持久命令？首先运行`npm install -g hindsight-zed`。

`init`将`hindsight`MCP服务器添加到`~/.config/zed/settings.json`并将记忆召回/记忆存储规则添加到`~/.config/zed/AGENTS.md`。重启Zed，打开智能体面板，`hindsight`服务器应该显示一个绿点。

这就是整个设置。在幕后，设置条目如下所示：

```jsonc
{
  "context_servers": {
    "hindsight": {
      "source": "custom",
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://api.hindsight.vectorize.io/mcp/my-memory/",
        "--header", "Authorization: Bearer YOUR_HINDSIGHT_API_KEY"
      ]
    }
  }
}
```

如果你的`settings.json`使用注释（JSONC），`init`不会重写它。相反，它会打印确切的 `context_servers` 条目供您粘贴。您可以随时使用 `hindsight-zed init --print-only` 查看该片段。

## 命令 {#commands}

|命令|它的作用|
| --- | --- |
|`hindsight-zed init`|添加MCP服务器和记忆召回/记忆存储规则|
|`hindsight-zed status`|显示服务器和规则是否配置|
|`hindsight-zed uninstall`|删除服务器和规则|
|`hindsight-zed init --print-only`|打印配置以手动添加|

如果您没有全局安装，请在其中任何一个前面加上 `npx ` 前缀。

## 云或自托管 {#cloud-or-self-hosted}

对于 **Hindsight Cloud**，从仪表板传递 API 密钥。 API URL 默认为 `https://api.hindsight.vectorize.io`，因此无需设置其他内容。

对于 **自托管** 服务器，使用 `--api-url http://localhost:8888` 指向您自己的基本 URL。开放的本地服务器不需要令牌。

配置从标志、环境或`~/.hindsight/zed.json`（由`init`编写）解析：

|设置|环境变量|默认|
| --- | --- | --- |
|API 网址|`HINDSIGHT_API_URL`|`https://api.hindsight.vectorize.io`|
|API 令牌|`HINDSIGHT_API_TOKEN`|无（云所需）|
|记忆库id|`HINDSIGHT_ZED_BANK_ID`|`zed`|

记忆库是一个孤立的存储。将Zed和您的其他工具指向同一个记忆库id，它们共享一个记忆，这就是[每个AI工具都有一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)背后的想法。

## 验证其是否有效 {#verify-it-works}

在一次对话中给智能体一个持久的事实：“这个存储库使用 pnpm，从不使用 npm。”开始 **新** 对话并询问相关内容，例如“添加 date-fns 依赖项”。具有记忆意识的智能体会回忆起惯例并在没有提醒的情况下到达 pnpm，因为该事实已保留到 Hindsight 并根据您的新请求进行了回忆。

你也可以从另一边看到这一切的发生。打开您的Hindsight记忆库，您将看到第一次对话后保留的约定显示为存储的记忆。

## 常见问题 {#frequently-asked-questions}

**智能体记忆会自动识别吗？**
记忆召回是智能体调用的工具，全局规则告诉它在每个任务开始时调用`recall`。因此，在实践中，它会自行运行，并且由于它在查询时运行，因此它会使用您的实际消息来查找相关的记忆。

**我需要安装什么？**
仅 Node.js（版本 18.3 或更高版本）。 `hindsight-zed` 是一个零依赖 Node CLI，Zed 的 MCP 桥 (`mcp-remote`) 也通过 `npx` 在 Node 上运行。不需要Python。

**它会覆盖我的Zed配置吗？**
没有。该规则位于 `AGENTS.md` 中受围栏保护的 `HINDSIGHT` 区块内，而 `init` 则保持其余部分不变。如果您的 `settings.json` 有注释，`init` 会打印片段而不是重写文件。

**`reflect`有什么作用？**
除了`recall`和`retain`之外，智能体还可以调用`reflect`来巩固和推理其存储的内容，因此记忆会随着积累而提高，而不是变成一堆扁平的笔记。

## 进一步阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回和保留背后的概念。
- [最佳AI智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：主要记忆框架的比较。
- [Cursor持久记忆](/blog/2026/06/12/cursor-persistent-memory)：与其他AI优先编辑器的想法相同。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将Zed和你的其他智能体指向同一个记忆库。
