---
title: "指南：使用 Hindsight 为 Zed 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zed, coding-agents, memory]
description: "将 Zed 的智能体面板连接到 Hindsight MCP 服务器，为 Zed 添加记忆，让助手在开始任务前召回相关记忆，并在工作过程中存入值得长期保留的事实。"
image: /img/guides/guide-zed-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Zed 添加记忆](/img/guides/guide-zed-memory-with-hindsight.svg)

如果想为 **Zed 添加 Hindsight 记忆**，最简便的方式是使用 `hindsight-zed` 包。只需运行一条命令，就能将 Zed 的 Agent Panel 连接到 Hindsight MCP 服务器，并添加一条规则，指导智能体使用该服务器。这样，助手便会在任务开始时召回相关记忆，并在工作过程中存入值得长期保留的事实。Zed AI 助手因此可以拥有长期记忆，不必每次对话都从头开始。

这种方案很适合 Zed，因为 Zed 没有预提示钩子，但支持 MCP 上下文服务器和全局指令文件。该集成同时利用了这两项功能：它会在 `settings.json` 的 `context_servers` 中注册 Hindsight MCP 服务器，为智能体提供 `recall` / `retain` / `reflect` 工具；还会在 `~/.config/zed/AGENTS.md` 中添加一条简短规则，指导智能体先召回记忆，再存入学到的内容。召回会在查询时根据你的实际消息执行，因此没有延迟；从你的角度看，整个过程是自动的。

本指南将介绍如何安装软件包、运行 `init` 完成配置、了解 MCP 工具与常驻规则如何配合工作，以及如何通过快速验证流程确认记忆确实在发挥作用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-zed`。
> 2. 运行 `hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory`。
> 3. 重启 Zed 并打开 Agent Panel；`hindsight` 服务器旁应显示绿色圆点。
> 4. 常驻规则会指导智能体先召回记忆，再存入学到的内容。
> 5. 检查后续对话是否记得先前对话存入的内容。

## 前提条件 {#prerequisites}

开始之前，请确保已准备好：

- 安装了 Zed，并能使用其 AI 助手 / Agent Panel
- 安装了 Node.js，因为 MCP 服务器通过 `mcp-remote` stdio 桥接器连接（由 `npx` 运行）
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 第 1 步：安装软件包 {#step-1-install-the-package}

安装 `hindsight-zed` 软件包：

```bash
pip install hindsight-zed
```

`hindsight-zed` 是一个小型 CLI 工具，可配置 Zed 以使用 Hindsight。它不会改变 Zed 的工作方式，只会将 Agent Panel 连接到 Hindsight MCP 服务器，并添加一条召回 / 存入规则。

## 第 2 步：将 Zed 连接到 Hindsight {#step-2-wire-zed-to-hindsight}

运行 `init`，并提供 Hindsight API 密钥以及要使用的记忆库：

```bash
hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 会将 `hindsight` MCP 服务器添加到 `~/.config/zed/settings.json`，并将召回 / 存入规则添加到 `~/.config/zed/AGENTS.md`。重启 Zed，打开 Agent Panel；`hindsight` 服务器旁应显示绿色圆点。

如果使用自托管的 Hindsight 服务器，请改用 `--api-url` 指定服务器地址：

```bash
hindsight-zed init --api-url http://localhost:8888 --bank-id my-memory
```

开放访问的本地服务器无需令牌。

如果你的 `settings.json` 中包含注释（JSONC），`init` 不会重写该文件，而会打印准确的 `context_servers` 条目供你粘贴。你也可以随时运行以下命令查看该配置片段，而不写入文件：

```bash
hindsight-zed init --print-only
```

## 第 3 步：确认配置 {#step-3-confirm-the-wiring}

使用 `status` 命令检查服务器和规则是否已配置：

```bash
hindsight-zed status
```

可用命令如下：

| 命令 | 说明 |
| --- | --- |
| `hindsight-zed init` | 添加 MCP 服务器和召回 / 存入规则 |
| `hindsight-zed status` | 显示服务器和规则是否已配置 |
| `hindsight-zed uninstall` | 移除服务器和规则 |
| `hindsight-zed init --print-only` | 打印配置，供手动添加 |

## 集成如何使用记忆 {#how-the-integration-uses-memory}

Zed 没有预提示钩子，因此该集成利用了 Zed 提供的两个接入点：

- **MCP 上下文服务器：** Zed 会运行在 `settings.json` 的 `context_servers` 中配置的 MCP 服务器，并在 Agent Panel 中显示它们提供的工具。`hindsight-zed` 会在此处注册 Hindsight MCP 服务器，为智能体提供 `recall` / `retain` / `reflect` 工具。由于 Zed 尚未原生支持 HTTP-MCP 传输，服务器通过 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) stdio 桥接器连接，并由 `npx` 运行，因此需要安装 Node.js。
- **全局指令文件**（`~/.config/zed/AGENTS.md`）：Zed 会在每次对话中包含此文件。集成会在 `<!-- HINDSIGHT -->` 围栏块内添加一条简短规则，指导智能体先召回记忆，再存入值得长期保留的事实，同时保留文件中的其他内容。

智能体会根据常驻规则调用 MCP 工具来召回和存入记忆。这样，召回便能在查询时根据你的实际消息精准执行，不会有延迟；代价是它依赖智能体遵循“先召回记忆”的指令，而不是由编辑器强制执行。

如需了解更底层的行为，请阅读 [Hindsight 的召回 API](/developer/api/recall) 和 [Hindsight 的存入 API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤测试：

1. 运行 `hindsight-zed status`，确认服务器和规则已配置。
2. 在 Zed 中打开 Agent Panel，检查 `hindsight` 服务器旁是否显示绿色圆点。
3. 在一次对话中，告诉智能体一条值得长期保留的事实或约定，并让它存入记忆。
4. 开始一次新对话。
5. 询问先前提到的事实。

例如：

- 在第一次对话中说明一项身份验证约定，并让智能体记住它。
- 在第二次对话中询问当前有哪些身份验证约定。

如果智能体能召回先前的事实，说明配置正常。

## 常见错误 {#common-mistakes}

### 未安装 Node.js {#nodejs-not-installed}

MCP 服务器通过 `npx` 运行的 `mcp-remote` stdio 桥接器连接，因此必须安装 Node.js，否则 `hindsight` 服务器将无法连接。

### 编辑 JSONC 设置文件 {#editing-a-jsonc-settings-file}

如果你的 `settings.json` 中有注释，`init` 不会重写该文件，而会打印供你粘贴的配置条目。粘贴该片段，或者运行 `hindsight-zed init --print-only` 再次查看。

### 忘记重启 Zed {#not-restarting-zed}

Zed 重启后才会加载 `hindsight` 服务器和规则。如果没有看到绿色圆点，请重启 Zed 并重新打开 Agent Panel。

### 期待编辑器强制执行记忆召回 {#expecting-the-editor-to-force-recall}

是否召回记忆取决于智能体是否遵循常驻的“先召回记忆”规则，而非编辑器是否强制执行。如果智能体在某项任务中没有召回记忆，请提醒它先进行召回。

## 常见问题解答 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用；通过 `--api-url http://localhost:8888` 指向它即可（开放访问的本地服务器无需令牌）。

### 这会改变我使用 Zed 的方式吗？ {#does-this-change-how-i-use-zed}

不会。该集成只是将 Agent Panel 连接到 Hindsight MCP 服务器并添加一条规则。你仍然可以照常使用 Zed 的 AI 助手。

### 记忆按什么范围隔离？ {#how-is-memory-scoped}

记忆按记忆库划分。在 `init` 时传入 `--bank-id` 即可指定记忆库（默认记忆库 ID 为 `zed`）。

### 这与其他编码智能体集成类似吗？ {#is-this-similar-to-other-coding-agent-integrations}

理念相似。Zed 使用 MCP 上下文服务器和全局指令文件，而不是包装器或钩子；不过，“先召回，后存入”的模式是相同的。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 [Hindsight 的召回 API](/developer/api/recall)。
- 查看 [Hindsight 的存入 API](/developer/api/retain)。
- 阅读 [Zed 集成文档](/sdks/integrations/zed)。
