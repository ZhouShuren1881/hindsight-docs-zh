---
title: "让 Zed 的 AI 助手拥有持久记忆"
authors: [benfrank241]
slug: "2026/07/07/zed-persistent-memory"
date: 2026-07-07T12:00
tags: [hindsight, zed, integration, memory, persistent-memory, mcp, tutorial]
description: "Zed 编辑器的 AI 助手在单项任务中表现出色，但任务之间却像陌生人。hindsight-zed 为它提供长期记忆，让它能在不同会话中召回和存入信息。"
image: /img/blog/zed-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 Zed 编辑器提供持久记忆](/img/blog/zed-persistent-memory.webp)

[Zed](https://zed.dev) 是一款速度很快、用 Rust 构建的编辑器，它的 Agent Panel 里有一位确实出色的 AI 助手。但和大多数编程智能体一样，它在单项任务中表现出色，任务之间却像陌生人。关闭面板，明天开始一段新对话，它就忘了这个代码库使用 pnpm、你上周决定采用仓库模式，以及你喜欢把测试和代码放在一起。

`hindsight-zed` 可以解决这个问题。只需一条命令，就能把 Zed 的 Agent Panel 连接到共享的 [Hindsight](https://github.com/vectorize-io/hindsight) 记忆库，让智能体在回答前召回相关决策，并在工作过程中存入值得长期保留的事实，供所有会话使用。

<!-- truncate -->

## 概览 {#tldr}

- `hindsight-zed init` 会在 Zed 中注册 Hindsight **MCP 服务器**，并添加一条指示智能体使用它的规则。
- 智能体会获得三个工具：`recall`（召回）、`retain`（存入）和 `reflect`（反思）。
- 召回会在**查询时**针对你的实际消息运行，因此它能提取与你刚刚提出的问题相关的上下文，不会有延迟。
- 它既可与 [Hindsight Cloud](https://hindsight.vectorize.io) 配合使用，也可连接自托管服务器。这是一种能延续到对话之外的[智能体记忆](https://vectorize.io/what-is-agent-memory)。

## 问题：出色的助手，却没有昨天 {#the-problem-a-great-assistant-with-no-yesterday}

编程助手如果在会话之间什么都记不住，你就得自己充当记忆。每次开始新对话，你都要重新解释技术栈、重申约定，还要再次讨论已经做过的决定。模型本身很有能力，只是缺少连续性。

持久记忆弥补了这个缺口。记忆的意义在于：你已经告诉智能体的内容，以及它已经推断出的内容，下次仍然可用。这样，每次会话都从头开始的工具才能变成真正了解你项目的助手。

## Zed 的记忆如何运作 {#how-zeds-memory-works}

Zed 没有提供预提示钩子，因此无法在每轮对话开始前自动注入上下文。Zed 提供了两个构件，而这项集成会同时使用它们。

**MCP 上下文服务器。** Zed 会运行 `settings.json` 中 `context_servers` 项下列出的[模型上下文协议](https://modelcontextprotocol.io)服务器，并在 Agent Panel 中提供这些服务器的工具。`hindsight-zed` 会在那里注册 Hindsight MCP 服务器，从而向智能体提供 `recall`、`retain` 和 `reflect` 工具。

**全局指令文件。** Zed 会在每次智能体对话中加入 `~/.config/zed/AGENTS.md`。集成会把一条简短规则写入该文件，并放在由 `<!-- HINDSIGHT:BEGIN -->` 和 `<!-- HINDSIGHT:END -->` 标记围住的代码块中，因此不会触碰你自己的规则。这条规则会指示智能体在每项任务开始时调用 `recall`，加载相关决策、偏好和项目上下文；每当它了解到值得留存以供后续会话使用的事实时，就调用 `retain`。

这样一来，召回会在查询时针对你实际发送的消息运行。它在你提出请求时执行，而非按固定计划运行，因此可以找出与当前请求相关的记忆。对你来说，这个过程是自动的：你输入问题，智能体会在后台查看记忆，然后作答。

还有一点与传输方式有关：Zed 目前尚未内置 HTTP MCP 传输，因此服务器通过 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) 标准输入/输出桥接程序连接，并由 `npx` 运行。由于桥接程序运行在 Node.js 上，安装 CLI 也是一个 Node.js 工具，因此只需安装 Node.js，无需 Python。

## 安装和快速开始 {#install-and-quick-start}

```bash
npx hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`hindsight-zed` 是一个零依赖的 Node.js CLI，使用 `npx` 即可运行，无需全局安装。如果你更喜欢使用持久安装的命令，可以先运行 `npm install -g hindsight-zed`。

`init` 会把 `hindsight` MCP 服务器添加到 `~/.config/zed/settings.json`，并把召回/存入规则添加到 `~/.config/zed/AGENTS.md`。重启 Zed 并打开 Agent Panel 后，`hindsight` 服务器旁应显示一个绿色圆点。

设置就完成了。其底层配置项如下所示：

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

如果你的 `settings.json` 使用了注释（JSONC），`init` 不会重写该文件，而是打印出可供你粘贴的完整 `context_servers` 配置项。你随时可以运行 `hindsight-zed init --print-only` 查看这段配置。

## 命令 {#commands}

| 命令 | 作用 |
| --- | --- |
| `hindsight-zed init` | 添加 MCP 服务器和召回/存入规则 |
| `hindsight-zed status` | 显示服务器和规则是否已配置 |
| `hindsight-zed uninstall` | 移除服务器和规则 |
| `hindsight-zed init --print-only` | 打印配置，供手动添加 |

如果你没有全局安装，可以在以上任一命令前加上 `npx `。

## 使用云服务或自托管服务 {#cloud-or-self-hosted}

使用 **Hindsight Cloud** 时，请传入从控制面板获取的 API 密钥。API URL 默认为 `https://api.hindsight.vectorize.io`，无需额外设置。

使用**自托管**服务器时，通过 `--api-url http://localhost:8888` 指定你自己的基础 URL。开放的本地服务器无需令牌。

配置可通过命令行标志、环境变量或 `~/.hindsight/zed.json` 设置（该文件由 `init` 写入）：

| 设置 | 环境变量 | 默认值 |
| --- | --- | --- |
| API URL | `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` |
| API 令牌 | `HINDSIGHT_API_TOKEN` | 无（Cloud 必填） |
| 记忆库 ID | `HINDSIGHT_ZED_BANK_ID` | `zed` |

记忆库是一个彼此隔离的存储空间。让 Zed 和其他工具使用同一个记忆库 ID，它们就会共享同一份记忆；这正是[每种 AI 工具共用一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)这一做法的核心。

## 验证是否正常工作 {#verify-it-works}

在一次对话中告诉智能体一条值得长期记住的事实：“这个代码库使用 pnpm，绝不使用 npm。”然后开始一段**新**对话，提出相关请求，例如“添加 date-fns 依赖项”。记忆增强型智能体会回想起这条约定，无需提醒就使用 pnpm，因为这条事实已存入 Hindsight，并针对你的新请求进行了召回。

你也可以从另一端观察这一过程。打开你的 Hindsight 记忆库，就能看到第一次对话后存入的约定已作为一条记忆保存下来。

## 常见问题 {#frequently-asked-questions}

**智能体会自动召回记忆吗？**
召回是由智能体调用的工具，全局规则会指示它在每项任务开始时调用 `recall`。因此，实际使用时它会自行运行；而且由于它在查询时运行，会根据你的实际消息查找相关记忆。

**需要安装什么？**
只需安装 Node.js（18.3 或更高版本）。`hindsight-zed` 是一个零依赖的 Node.js CLI，Zed 的 MCP 桥接程序 `mcp-remote` 也通过 `npx` 在 Node.js 上运行。无需 Python。

**它会覆盖我的 Zed 配置吗？**
不会。规则位于 `AGENTS.md` 中由 `HINDSIGHT` 标记围住的代码块内，`init` 会保留文件其余部分。如果你的 `settings.json` 含有注释，`init` 会打印配置片段，而不是重写文件。

**`reflect` 有什么作用？**
除了 `recall` 和 `retain`，智能体还可以调用 `reflect`，对已存入的内容进行整合和推理。这样，记忆会随着积累而不断改进，而不是变成一堆扁平的笔记。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解召回与存入背后的概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：比较主要的记忆框架。
- [Cursor 持久记忆](/blog/2026/06/12/cursor-persistent-memory)：在另一款 AI 优先的编辑器中实现同样的功能。
- [每种 AI 工具共用一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让 Zed 和你的其他智能体连接到同一个记忆库。
