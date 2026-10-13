---
title: "指南：用Hindsight添加Roo Code记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, roo-code, coding-agents, memory]
description: "使用后视-roo-code安装程序将Roo Code记忆与Hindsight一起添加，因此每个Roo Code任务在开始之前都会回忆起相关的项目上下文，并在开始之后保留所学到的知识。"
image: /img/guides/guide-roo-code-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Roo Code 添加记忆](/img/guides/guide-roo-code-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Roo Code 添加记忆**，运行一次 `hindsight-roo-code` 安装器，注册 MCP 服务器并注入自定义规则，让 Roo 在任务前召回相关上下文、之后存储所学，跨编码会话延续项目知识。

这非常适合Roo Code因为Roo Code公开了两种与记忆完美搭配的可扩展机制：**MCP 服务器** 用于工具和 **自定义规则** 用于系统提示注入。安装程序同时使用两者。它电线Hindsight的`/mcp` 端点作为MCP服务器，然后放置一个规则文件，告诉 Roo 何时调用 `recall` 和 `retain` 所以记忆成为正常任务循环的一部分。

本指南逐步介绍如何安装CLI，针对您的运行安装程序Hindsight后端，了解规则和MCP配置协同工作，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-roo-code`。
> 2.准备好 Hindsight 后端 — Hindsight Cloud（默认）或自托管服务器。
> 3.运行项目目录中的 `hindsight-roo-code install`。
> 4.重新启动 Roo Code，以便它获取新的 MCP 服务器和规则。
> 5.验证后面的任务是否记住前面的任务存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Roo Code已安装并工作
- 可达Hindsight后端，[Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管服务器
- Python和 `pip` 可用于安装CLI

对于自托管，首先在本地运行Hindsight：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # starts on http://localhost:8888
```

## 第一步：安装CLI {#step-1-install-the-cli}

安装安装包：

```bash
pip install hindsight-roo-code
```

这给你`hindsight-roo-code` 命令，接线Hindsight进入Roo Code的配置目录。它不会改变如何Roo Code有效 — 它注册了一个MCP服务器并添加规则文件。

## 第 2 步：运行安装程序 {#step-2-run-the-installer}

从您的项目目录中，运行：

```bash
hindsight-roo-code install
```

默认目标为Hindsight Cloud。对于自托管服务器，请传递本地 URL：

```bash
hindsight-roo-code install --api-url http://localhost:8888
```

安装程序写入两个文件：

- **`.roo/mcp.json`** — 寄存器Hindsight的`/mcp` 端点作为MCP服务器，带有 `recall` 和 `retain` 自动批准
- **`.roo/rules/hindsight-memory.md`** — 每个 Roo 系统提示中注入指令

然后重新启动Roo Code，以便加载新的MCP服务器和规则。

## 第 3 步：选择项目本地或全局 {#step-3-choose-project-local-or-global}

默认情况下，安装程序写入`.roo/` 在当前目录中，因此记忆的范围仅限于该项目：

```bash
hindsight-roo-code install --project-dir /path/to/project
```

要在所有项目中应用集成，请全局安装到 `~/.roo/`：

```bash
hindsight-roo-code install --global
```

更新API安装后的URL，重新运行安装程序或编辑直接 `.roo/mcp.json`。

## 整合如何使用记忆 {#how-the-integration-uses-memory}

Roo Code 有两个主要的可扩展性机制 - 用于工具的MCP 服务器和用于系统提示注入的自定义规则 - 并且此集成同时使用：

- **召回（之前）：** 规则文件指示 Roo 调用 `recall` 当新任务开始时，相关记忆会自动注入到上下文中。
- **存储（工作期间与结束后）：**智能体可以打电话`retain` 任务中存储重大决策或发现，规则文件指示Roo调用`retain` 任务结束时有总结。

Hindsight通过其 暴露了两个工具 `/mcp`端点：

|工具|说明|
|------|-------------|
|`recall`|在记忆中搜索与查询相关的上下文|
|`retain`|立即将内容存储在记忆中|

因为这两个工具都列在下 `alwaysAllow` `.roo/mcp.json`，Roo 可以调用它们，而无需每次调用批准提示。对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 启动Hindsight并运行安装程序
2. 打开Roo Code
3. 检查**设置 → MCP 服务器（Settings → MCP Servers）** — `hindsight` 应显示为已连接
4. 开始任务并观察工具调用日志中的 `recall`
5. 让一个任务记录一个决定或约定，然后开始一个稍后的任务并询问它

例如：

- 一个任务重构了 auth 模块并记录了重试逻辑发生变化的原因
- 稍后的任务询问当前的身份验证约定是什么

如果后面的任务显示了前面的决定，则设置正在起作用。

## 常见错误 {#common-mistakes}

### 安装后不重新启动Roo Code {#not-restarting-roo-code-after-install}

安装程序写道`.roo/mcp.json` 和 `.roo/rules/hindsight-memory.md`，但是Roo Code在启动时加载它们。重新启动它，这样MCP服务器和规则生效。

### 指向错误的后端 {#pointing-at-the-wrong-backend}

如果您自行托管，请通过 `--api-url http://localhost:8888`。如果没有它，安装程序的目标Hindsight Cloud，因此正在运行的本地服务器将不会被使用。

### 令人困惑的项目本地和全局安装 {#confusing-project-local-and-global-installs}

`hindsight-roo-code install` 写入当前目录下的 `.roo/`； `--global` 写入当前目录下的 `~/.roo/`。如果记忆没有出现在项目中，请确认您安装到哪个范围。

### 在MCP服务器连接之前期望记忆 {#expecting-memory-before-the-mcp-server-connects}

如果**设置 → MCP 服务器（Settings → MCP Servers）**不显示`hindsight` 连接后，记忆召回将不会运行。请先确认连接后再判断记忆是否有效。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 运行 `hindsight-api` 并使用 安装 `--api-url http://localhost:8888`。

### 这会改变我使用Roo Code的方式吗？ {#does-this-change-how-i-use-roo-code}

没有。安装程序仅注册一个MCP服务器并添加一个规则文件。你像以前一样使用Roo Code； 记忆召回和记忆存储通过正常的任务循环发生。

### 智能体可以在任务中调用记忆召回和记忆存储吗？ {#can-the-agent-call-recall-and-retain-mid-task}

是的。规则文件驱动任务开始和结束时的自动调用，但智能体也可以调用 工作时明确 `recall` 和 `retain`。

### 以后如何更改API URL？ {#how-do-i-change-the-api-url-later}

重新运行`hindsight-roo-code install` 与新`--api-url`，或编辑`.roo/mcp.json`。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Roo Code 集成文档](/sdks/integrations/roo-code)
