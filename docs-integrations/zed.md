---
sidebar_position: 7
title: "使用 Hindsight 为 Zed 提供持久记忆 | 集成"
description: "通过 MCP，使用 Hindsight 为 Zed 编辑器的 AI 助手添加长期记忆。一条命令即可连接 Hindsight MCP 服务器并配置召回/存入规则，让智能体面板中的记忆功能自动运行。"
---

# Zed {#zed}

[Hindsight](https://vectorize.io/hindsight) 为 [Zed](https://zed.dev) 编辑器的 AI 助手提供长期记忆。一条命令即可将 Zed 的智能体面板连接到 Hindsight MCP 服务器，并添加一条规则，指导智能体使用该服务器：在任务开始时召回相关记忆，并在处理过程中存入值得长期保留的事实。Recall（召回）会在查询时根据你的实际消息执行；从你的角度看，这一过程是自动的。

[查看更新日志 →](/changelog/integrations/zed)

## 工作原理 {#how-it-works}

Zed 尚无预提示钩子，但它支持本集成所用的两项功能：

- **MCP 上下文服务器：** Zed 会运行在 `settings.json` 的 `context_servers` 中配置的 MCP 服务器，并在智能体面板中提供这些服务器的工具。`hindsight-zed` 会在此处注册 Hindsight MCP 服务器，为智能体提供 `recall` / `retain` / `reflect` 工具。
- **全局指令文件**（`~/.config/zed/AGENTS.md`）：Zed 会在每次对话中载入该文件。集成会在其中添加一条简短规则，指导智能体先召回记忆，再存入它学到的内容。

Zed 目前尚不支持原生 HTTP-MCP 传输，因此本集成通过 `npx` 运行 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) 这一 stdio 桥接程序来连接服务器；这意味着必须安装 Node.js。

## 设置 {#setup}

`hindsight-zed` 是一个零依赖的 Node.js CLI；唯一的前提是安装 Node.js（运行 `mcp-remote` 桥接程序也需要它）。你可以通过 `npx` 直接从 npm 运行：

```bash
npx @vectorize-io/hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

也可以全局安装，以便持续使用该命令：

```bash
npm install -g @vectorize-io/hindsight-zed
hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 会将 `hindsight` MCP 服务器添加到 `~/.config/zed/settings.json`，并将召回/存入规则添加到 `~/.config/zed/AGENTS.md`。重启 Zed 并打开智能体面板后，`hindsight` 服务器旁应会显示绿色圆点。

请使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥；也可以通过 `--api-url http://localhost:8888` 指向自托管服务器（开放的本地服务器无需令牌）。如果你的 `settings.json` 包含注释（JSONC），`init` 会打印出供你粘贴的配置项，而不会重写文件；你也可以随时运行 `hindsight-zed init --print-only`。

## 命令 {#commands}

| 命令 | 说明 |
| --- | --- |
| `hindsight-zed init` | 添加 MCP 服务器和召回/存入规则 |
| `hindsight-zed status` | 查看服务器和规则是否已配置 |
| `hindsight-zed uninstall` | 移除服务器和规则 |

## 注意 {#note}

召回和存入通过智能体调用的 MCP 工具执行，并由始终生效的规则引导。这样可以在查询时精确召回（没有延迟）；相应地，整个流程依赖智能体遵循“先召回”的指令，而不是由编辑器强制执行该指令。

完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zed)。
