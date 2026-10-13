---
sidebar_position: 7
title: "Zed 持久记忆Hindsight |整合"
description: "通过MCP为Zed编辑器的AI助手和Hindsight添加长期记忆。一条命令连接HindsightMCP服务器以及recall/retain规则，因此记忆在智能体面板中自动工作。"
---

# Zed {#zed}

长期记忆[Zed](https://zed.dev)编辑的AI助手，由 提供支持 [Hindsight](https://vectorize.io/hindsight)。一条命令连接Zed的智能体面板HindsightMCP服务器并添加一条规则告诉智能体使用它 - 因此它可以在任务开始时回忆起相关的记忆，并在任务进行过程中保留持久的事实。 记忆召回会在查询时针对您的实际消息发生，并且在您的座位上它是自动的。

[查看更新日志 →](/changelog/integrations/zed)

## 工作原理 {#how-it-works}

Zed 没有预提示钩子，但它支持此集成使用的两个功能：

- **MCP 上下文服务器：**Zed运行MCP在下配置的服务器 `context_servers` `settings.json` 并在智能体面板中显示他们的工具。 `hindsight-zed` 注册HindsightMCP服务器在那里，提供智能体`recall` / `retain` / `reflect`工具。
- **全局指令文件** (`~/.config/zed/AGENTS.md`）那个Zed包含在每次对话中。该集成添加了一条小规则，告诉智能体首先进行记忆召回，然后记忆存储它学到了什么。

Zed还没有原生 HTTP-MCP传输，因此服务器通过连接 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) stdio 桥（通过 运行 `npx`)，表示必须安装Node.js。

## 设置 {#setup}

`hindsight-zed` 是一个零依赖 Node CLI — Node.js 是唯一的要求（已经需要） `mcp-remote`桥）。直接从运行它npm与 `npx`：

```bash
npx @vectorize-io/hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

或者全局安装它以获取持久命令：

```bash
npm install -g @vectorize-io/hindsight-zed
hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 添加 `hindsight`MCP服务器到 `~/.config/zed/settings.json` 和recall/retain规则`~/.config/zed/AGENTS.md`。重新启动Zed，打开智能体面板，`hindsight` 服务器应显示一个绿点。

使用[Hindsight Cloud](https://hindsight.vectorize.io) 键，或使用 指向自托管服务器 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。如果你的`settings.json` 有评论 (JSONC), `init` 打印要粘贴的条目，而不是重写文件 — 或运行 `hindsight-zed init --print-only` 随时。

## 命令 {#commands}

|命令|说明|
| --- | --- |
|`hindsight-zed init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-zed status`|显示服务器+规则是否配置|
|`hindsight-zed uninstall`|删除服务器+规则|

## 注意 {#note}

记忆召回和记忆存储通过智能体调用的MCP工具运行，并遵循始终在线的规则。这使得记忆召回查询时间精确（无延迟），但其代价是它依赖于遵循“记忆召回第一”指令的智能体，而不是编辑器强制执行它。

参见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zed) 用于完整配置选项。
