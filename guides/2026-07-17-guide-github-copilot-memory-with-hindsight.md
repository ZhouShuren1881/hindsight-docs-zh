---
title: "指南：使用 Hindsight 为 GitHub Copilot 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, github-copilot, coding-agents, memory]
description: "使用 hindsight-copilot CLI 将 Hindsight MCP 服务器接入 VS Code，并添加召回/存入规则，让 Copilot 智能体模式在不同任务间延续记忆。"
image: /img/guides/guide-github-copilot-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 GitHub Copilot 添加记忆](/img/guides/guide-github-copilot-memory-with-hindsight.svg)

如果你想为 **GitHub Copilot 添加 Hindsight 记忆**，最简便的方式是使用 `hindsight-copilot` CLI。只需运行一条命令，就能将 Hindsight MCP 服务器接入 VS Code 的 `.vscode/mcp.json`，并在 `.github/copilot-instructions.md` 中添加召回/存入规则。这样，Copilot 的智能体模式便能在不同任务间使用长期记忆，每次开启新聊天时也不必重新发现相同的项目背景。

这很适合 VS Code Copilot，因为它支持该集成所需的两个功能：在 `.vscode/mcp.json` 中配置 MCP 服务器（包括带请求头的 HTTP 服务器，因此 Hindsight MCP 端点可以直接连接），以及配置 `.github/copilot-instructions.md`，由 Copilot 应用于工作区中的每次聊天。MCP 服务器会向智能体模式提供 Recall（召回）、Retain（存入）和 Reflect（反思）工具；指令文件则保存一条规则，要求 Copilot 在任务开始时召回相关记忆，并在工作过程中存入持久事实。

本指南将介绍如何安装 CLI、运行 `init` 完成接入、了解记忆库的作用范围，以及通过一套快速验证流程确认记忆确实在使用。操作时可同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-copilot`。
> 2. 在项目目录中运行 `hindsight-copilot init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project`。
> 3. `init` 会将 MCP 服务器写入 `.vscode/mcp.json`，并将规则写入 `.github/copilot-instructions.md`。
> 4. 重新加载 VS Code，在智能体模式下打开 Copilot Chat，然后从聊天的工具菜单启动 `hindsight` MCP 服务器。
> 5. 验证后续任务能否召回先前存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保你具备以下条件：

- 已安装带 GitHub Copilot 的 VS Code，并能在**智能体模式**下使用 Copilot Chat。
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器。
- 已在 VS Code 中打开项目文件夹作为工作区，因为 `init` 会在 `.vscode/` 和 `.github/` 中写入文件。

## 步骤 1：安装 CLI {#step-1-install-the-cli}

使用 pip 安装 CLI：

```bash
pip install hindsight-copilot
```

`hindsight-copilot` 仅负责配置，不会在聊天期间运行。它会将 Hindsight MCP 服务器和召回/存入规则接入工作区；运行时的记忆操作则通过 MCP 服务器执行。

## 步骤 2：接入项目 {#step-2-wire-up-your-project}

在要启用记忆的项目目录中运行 `init`：

```bash
pip install hindsight-copilot
cd your-project
hindsight-copilot init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `servers` 条目合并到 `./.vscode/mcp.json`，并将规则写入 `./.github/copilot-instructions.md`。MCP 服务器条目如下：

```json
{
  "servers": {
    "hindsight": {
      "type": "http",
      "url": "https://api.hindsight.vectorize.io/mcp/my-project/",
      "headers": { "Authorization": "Bearer hsk_..." }
    }
  }
}
```

重新加载 VS Code，在**智能体模式**下打开 Copilot Chat，然后从聊天的工具菜单启动 `hindsight` MCP 服务器。

如果使用自托管的 Hindsight 服务器，请传入 `--api-url http://localhost:8888`（开放的本地服务器不需要令牌）：

```bash
hindsight-copilot init --api-url http://localhost:8888 --bank-id my-project
```

如果你的 `mcp.json` 中含有注释，`init` 不会重写该文件，而会打印一段供你粘贴的配置。你也可以随时只打印配置，不修改任何文件：

```bash
hindsight-copilot init --print-only
```

## 集成如何使用记忆 {#how-the-integration-uses-memory}

VS Code Copilot 在这里没有逐提示包装器；该集成使用的是 Copilot 提供的两个接入点：

- **MCP 服务器（工具）：** `hindsight` HTTP MCP 服务器会直接向 Copilot 的智能体模式提供 `recall`、`retain` 和 `reflect` 工具。服务器限定到一个记忆库，即 MCP 端点 URL 的最后一个路径段。
- **指令规则（行为）：** 写入 `.github/copilot-instructions.md` 的召回/存入规则适用于工作区中的每次聊天。Copilot 会按照规则在任务开始时召回相关记忆，并在工作过程中存入持久事实。

有了这两项配置，你就不必记得亲自调用这些工具；规则会告诉 Copilot 何时使用它们。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

## 记忆库 {#memory-banks}

MCP 服务器限定到一个**记忆库**，其名称就是 MCP 端点 URL 的最后一个路径段。通过 `--bank-id` 设置记忆库（默认值为 `copilot`），即可让项目记忆与无关工作隔离。

如果你还在其他编辑器或编程智能体中使用 Hindsight，并将它们指向同一个记忆库，它们就会读取同一份项目记忆：在一个工具中学到的约定也能供其他工具使用。

你也可以通过 `HINDSIGHT_COPILOT_BANK_ID` 环境变量设置记忆库，或通过 `HINDSIGHT_API_URL` 和 `HINDSIGHT_API_TOKEN` 设置 API URL 与令牌。完整配置选项见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/github-copilot)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤测试：

1. 运行 `hindsight-copilot status`，确认 MCP 服务器和规则已配置。
2. 在 Copilot 智能体模式下处理一项任务，让 Copilot 记录一条决策或约定。
3. 在同一工作区中开启新聊天。
4. 询问之前的决策。
5. 确认 Copilot 召回了对应记忆。

例如：

- 第一个任务重构认证模块，并记录修改重试逻辑的原因。
- 后续聊天询问当前的认证约定是什么。

如果 Copilot 召回了之前的决策，说明配置已生效。

## 常见错误 {#common-mistakes}

### 未在聊天中启动 MCP 服务器 {#not-starting-the-mcp-server-in-the-chat}

运行 `init` 后，你仍需重新加载 VS Code，在**智能体模式**下打开 Copilot Chat，并从聊天的工具菜单启动 `hindsight` MCP 服务器。如果服务器未运行，这些工具就不可用。

### 编辑带注释的 mcp.json 文件 {#editing-an-mcpjson-that-has-comments}

如果 `.vscode/mcp.json` 中含有注释，`init` 不会重写该文件。你可以自行粘贴打印出的 `servers` 配置片段，也可以运行 `hindsight-copilot init --print-only` 查看该片段。

### 误以为不提供令牌也能使用 Cloud {#expecting-cloud-to-work-without-a-token}

Hindsight Cloud 需要 API 令牌。请传入 `--api-token`，或设置 `HINDSIGHT_API_TOKEN`。自托管的开放本地服务器不需要令牌。

### 误以为记忆库默认共享 {#assuming-banks-are-shared-by-default}

每个记忆库彼此隔离。如果要让两个项目或工具共享记忆，请将它们指向同一个 `--bank-id`；否则它们看不到彼此的上下文。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需传入 `--api-url http://localhost:8888`（开放的本地服务器不需要令牌）。

### 这会改变我使用 Copilot 的方式吗？ {#does-this-change-how-i-use-copilot}

不会。它会在工作区中添加 `hindsight` MCP 服务器和召回/存入规则。你仍可像往常一样在智能体模式下使用 Copilot Chat；规则会告诉 Copilot 何时召回和存入记忆。

### 记忆的作用范围如何确定？ {#how-is-memory-scoped}

按记忆库确定，通过 `--bank-id` 设置（默认值为 `copilot`）。记忆库就是 MCP 端点 URL 的最后一个路径段。

### 如何移除？ {#how-do-i-remove-it}

运行 `hindsight-copilot uninstall`，即可移除 `hindsight` MCP 服务器条目和召回/存入规则。运行 `hindsight-copilot status` 可检查当前状态。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 [Hindsight 的 Recall API](/developer/api/recall)。
- 查看 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [GitHub Copilot 集成文档](/sdks/integrations/github-copilot)。
