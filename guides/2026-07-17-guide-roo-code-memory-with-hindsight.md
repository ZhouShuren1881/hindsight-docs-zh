---
title: "指南：使用 Hindsight 为 Roo Code 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, roo-code, coding-agents, memory]
description: "使用 hindsight-roo-code 安装器为 Roo Code 接入 Hindsight，让每项任务都能在开始前召回相关项目上下文，并在结束后存入新的经验。"
image: /img/guides/guide-roo-code-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Roo Code 添加记忆](/img/guides/guide-roo-code-memory-with-hindsight.svg)

如果你想为 Roo Code 接入 Hindsight 记忆，最简便的方式是使用 `hindsight-roo-code` 安装器。运行一次后，它就会将 Hindsight 的 MCP 服务器注册到 Roo Code，并注入自定义规则，指导 Roo 在每项任务开始前召回相关上下文、结束后存入新的经验。这样，Roo Code 就能在不同编码会话之间延续长期记忆，无需每次开始新任务时都重新发现相同的项目上下文。

Roo Code 很适合这种集成，因为它提供了两种与记忆配合良好的扩展机制：用于工具的 **MCP 服务器**，以及用于注入系统提示的**自定义规则**。安装器会同时使用这两种机制：将 Hindsight 的 `/mcp` 端点接入为 MCP 服务器，然后放置一个规则文件，告诉 Roo 何时调用 `recall` 和 `retain`，让记忆融入常规任务流程。

本指南将介绍如何安装 CLI、针对 Hindsight 后端运行安装器、了解规则与 MCP 配置如何协同工作，以及如何快速验证记忆确实正在使用。操作时请备好[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-roo-code`。
> 2. 准备好可用的 Hindsight 后端：Hindsight Cloud（默认）或自托管服务器。
> 3. 在项目目录中运行 `hindsight-roo-code install`。
> 4. 重启 Roo Code，使其加载新的 MCP 服务器和规则。
> 5. 验证后续任务是否记得先前任务存入的内容。

## 前置条件 {#prerequisites}

开始之前，请确保你已准备好：

- 已安装并可正常使用的 Roo Code
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管服务器
- 可用于安装 CLI 的 Python 和 `pip`

如果使用自托管服务，请先在本地运行 Hindsight：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # 在 http://localhost:8888 启动服务
```

## 第 1 步：安装 CLI {#step-1-install-the-cli}

安装安装器软件包：

```bash
pip install hindsight-roo-code
```

安装后会提供 `hindsight-roo-code` 命令，用于将 Hindsight 接入 Roo Code 的配置目录。它不会改变 Roo Code 的工作方式，只会注册一个 MCP 服务器并添加一个规则文件。

## 第 2 步：运行安装器 {#step-2-run-the-installer}

在项目目录中运行：

```bash
hindsight-roo-code install
```

默认情况下，安装器会连接 Hindsight Cloud。如果使用自托管服务器，请传入本地 URL：

```bash
hindsight-roo-code install --api-url http://localhost:8888
```

安装器会写入两个文件：

- **`.roo/mcp.json`**：将 Hindsight 的 `/mcp` 端点注册为 MCP 服务器，并将 `recall` 和 `retain` 设为自动批准
- **`.roo/rules/hindsight-memory.md`**：注入到 Roo 每个系统提示中的指令

然后重启 Roo Code，使其加载新的 MCP 服务器和规则。

## 第 3 步：选择项目级或全局安装 {#step-3-choose-project-local-or-global}

默认情况下，安装器会将文件写入当前目录下的 `.roo/`，因此记忆仅适用于该项目：

```bash
hindsight-roo-code install --project-dir /path/to/project
```

若要将集成应用于所有项目，请全局安装到 `~/.roo/`：

```bash
hindsight-roo-code install --global
```

安装后如需更新 API URL，请重新运行安装器，或直接编辑 `.roo/mcp.json`。

## 集成如何使用记忆 {#how-the-integration-uses-memory}

Roo Code 有两种主要的扩展机制：用于工具的 MCP 服务器和用于注入系统提示的自定义规则。本集成同时使用这两种机制：

- **Recall（开始前）：**规则文件会指示 Roo 在新任务开始时调用 `recall`，自动将相关记忆注入上下文。
- **Retain（进行中和结束后）：**智能体可以在任务进行中调用 `retain`，存入重要决策或发现；规则文件也会指示 Roo 在任务结束时调用 `retain`，存入一份总结。

Hindsight 通过 `/mcp` 端点提供两个工具：

| 工具 | 说明 |
| --- | --- |
| `recall` | 在记忆中搜索与查询相关的上下文 |
| `retain` | 立即将内容存入记忆 |

由于这两个工具都列在 `.roo/mcp.json` 的 `alwaysAllow` 中，Roo 无需针对每次调用请求批准即可使用它们。若要了解更底层的行为，请阅读 [Hindsight Recall API](/developer/api/recall) 和 [Hindsight Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 启动 Hindsight 并运行安装器
2. 在项目中打开 Roo Code
3. 检查**设置 → MCP 服务器**（Settings → MCP Servers），确认 `hindsight` 显示为已连接
4. 开始一项任务，并在工具调用日志中查看是否调用了 `recall`
5. 让某项任务记录一个决策或约定，然后开始后续任务并询问相关内容

例如：

- 一项任务重构了 auth 模块，并记录重试逻辑发生变化的原因
- 后续任务询问当前的身份验证约定

如果后续任务能说出先前记录的决策，就说明集成正常工作。

## 常见错误 {#common-mistakes}

### 安装后未重启 Roo Code {#not-restarting-roo-code-after-install}

安装器会写入 `.roo/mcp.json` 和 `.roo/rules/hindsight-memory.md`，但 Roo Code 只会在启动时加载这些文件。请重启 Roo Code，使 MCP 服务器和规则生效。

### 指向了错误的后端 {#pointing-at-the-wrong-backend}

如果使用自托管服务，请传入 `--api-url http://localhost:8888`。如果不传此参数，安装器会连接 Hindsight Cloud，因此正在运行的本地服务器不会被使用。

### 混淆项目级和全局安装 {#confusing-project-local-and-global-installs}

`hindsight-roo-code install` 会将文件写入当前目录下的 `.roo/`；`--global` 则写入 `~/.roo/`。如果某个项目中没有出现记忆，请确认安装时选择的作用范围。

### MCP 服务器连接前就期待记忆生效 {#expecting-memory-before-the-mcp-server-connects}

如果**设置 → MCP 服务器**（Settings → MCP Servers）中没有显示 `hindsight` 已连接，Recall 就不会运行。请先确认连接正常，再判断记忆是否有效。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：运行 `hindsight-api`，并在安装时传入 `--api-url http://localhost:8888`。

### 这会改变我使用 Roo Code 的方式吗？ {#does-this-change-how-i-use-roo-code}

不会。安装器只会注册一个 MCP 服务器并添加一个规则文件。你仍可像以前一样使用 Roo Code；Recall 和 Retain 会融入常规任务流程。

### 智能体可以在任务进行中调用 recall 和 retain 吗？ {#can-the-agent-call-recall-and-retain-mid-task}

可以。规则文件会在任务开始和结束时触发自动调用，智能体也可以在工作期间显式调用 `recall` 和 `retain`。

### 之后如何更改 API URL？ {#how-do-i-change-the-api-url-later}

使用新的 `--api-url` 重新运行 `hindsight-roo-code install`，或直接编辑 `.roo/mcp.json`。

## 后续步骤 {#next-steps}

- 如果想使用托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight Recall API](/developer/api/recall)
- 查看 [Hindsight Retain API](/developer/api/retain)
- 阅读 [Roo Code 集成文档](/sdks/integrations/roo-code)
