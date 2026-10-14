---
title: "为 Roo Code 配置记忆，让每个任务都能承接上一个任务"
authors: [benfrank241]
slug: "2026/07/23/roo-code-persistent-memory"
date: 2026-07-23T12:00
tags: [hindsight, roo-code, agent-memory, persistent-memory, coding-agent, mcp, tutorial]
description: "Roo Code 可以自主执行编码任务，但每次都会从零开始。为它添加 Hindsight 智能体记忆：每个任务开始前召回上下文，结束后存入摘要。"
image: /img/blog/roo-code-persistent-memory.webp
hide_table_of_contents: true
---

![Roo Code 与 Hindsight：每个任务开始前召回上下文，结束后存入摘要](/img/blog/roo-code-persistent-memory.webp)

[Roo Code](https://github.com/RooVetGit/Roo-Code) 是 VS Code 中增长最快的自主编码智能体之一。你交给它一项任务，它会规划、编辑、运行命令，并自行逐步完成工作。它很擅长处理眼前的任务，但在不同任务之间完全没有记忆：昨天学到的约定、你上周解释过的架构决策、它曾经调试过的错误模式，等你下次启动任务时全都不复存在。

Hindsight 可以解决这个问题。只需安装一次，Roo 就会在每项任务开始前召回相关上下文，并在任务结束后存入学到的内容。这样，每项任务都能承接上一个任务，而不是从零开始。

<!-- truncate -->

## 概览 {#tldr}

- 一条命令即可为 Roo Code 安装持久记忆：先运行 `pip install hindsight-roo-code`，再运行 `hindsight-roo-code install`。
- 它会同时使用 Roo 的两个扩展点：Hindsight 的 **MCP 工具**（`recall`、`retain`），以及一份告诉 Roo 何时调用这些工具的**自定义规则文件**。
- **每项任务开始前**，Roo 会召回相关记忆；**每项任务结束后**，它会存入摘要。它也可以在任务进行期间存入决策。
- 记忆范围可以设为单个项目（`.roo/`）或全局（`~/.roo/`）。
- 可搭配 [Hindsight Cloud](https://ui.hindsight.vectorize.io)（推荐，可免费开始使用）或自托管服务器。

## 为什么基于任务运行的智能体尤其需要记忆 {#why-a-task-based-agent-needs-memory-most}

聊天助手至少能延续一场对话。Roo 这样的自主智能体则按独立任务工作：你启动一项任务，它运行至完成，然后当前状态就被清空。这种结构有利于专注，却不利于保持连续性。每项任务都会从头了解你的技术栈，重新发现同样的注意事项，还会再次询问你已经回答过的问题。

智能体记忆能把一连串彼此孤立的任务，变成真正了解你项目的智能体。第一个任务中学到的内容会成为第五十个任务的起点，因此你使用得越久，智能体就越有用。

## 设置 {#setup}

首先，准备一个 Hindsight 实例。最简单的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册并获取 API 密钥，无需自行运行服务。（如果你更愿意自托管，下面也有相关说明。）

然后安装集成：

```bash
# 安装 CLI
pip install hindsight-roo-code

# 安装到当前项目（默认使用 Hindsight Cloud）
hindsight-roo-code install

# 重启 Roo Code，即可启用记忆
```

设置就完成了。重启 Roo Code，然后开始一项任务。

## 工作原理：MCP 工具与规则协同 {#how-it-works-mcp-tools-plus-rules}

Roo Code 提供两个扩展点；这个集成将它们结合使用，因此记忆会自动运作，而不需要你手动操作。

**MCP 服务器**为 Roo 提供能力。安装程序会写入 `.roo/mcp.json`，注册 Hindsight 内置的 `/mcp` 端点，并公开两个工具：

| 工具 | 作用 |
|------|------|
| `recall` | 在记忆中搜索与当前任务相关的上下文 |
| `retain` | 立即存入一项决策、发现或摘要 |

这两个工具都会自动获准调用（`alwaysAllow`），因此 Roo 可以使用它们，无需每次调用都停下来请求许可。

**规则文件**规定了行为。安装程序还会写入 `.roo/rules/hindsight-memory.md`。这份文件会注入每条 Roo 系统提示，并告诉智能体何时调用这些工具：

```
新任务开始
  └─ 规则要求 Roo 调用 recall
       └─ 将相关记忆注入上下文

智能体正在工作……
  └─ retain 随时存入决策和发现

任务结束
  └─ 规则要求 Roo 调用 retain 存入摘要
       └─ 为下一次会话保存摘要
```

只有 MCP，Roo 虽然拥有记忆工具，却可能从不使用；只有规则，则无法存储或检索任何内容。两者结合后，能力和指令让智能体默认记住重要信息：任务开始时提取合适的上下文，结束时写回重要内容。

## 项目记忆或全局记忆 {#project-memory-or-global-memory}

默认情况下，安装程序会将文件写入当前项目的 `.roo/` 目录，因此记忆仅限于该代码库。这通常更适合编码智能体，因为一个项目的约定不会影响另一个项目。

```bash
hindsight-roo-code install                       # 仅用于当前项目
hindsight-roo-code install --project-dir /path   # 指定项目
hindsight-roo-code install --global              # ~/.roo，适用于所有项目
```

全局安装适合跨项目通用的习惯和偏好；项目级安装适合只在某个代码库中有意义的细节。如果你想全面了解记忆范围的设置，可以阅读我们的[记忆库策略实用指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 云端或自托管 {#cloud-or-self-hosted}

对于 **Hindsight Cloud**，安装程序默认使用 `https://api.hindsight.vectorize.io`，你只需要 API 密钥。

如果使用**自托管**服务器，先启动 Hindsight，再将安装程序指向该服务器：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api                                   # 提供 http://localhost:8888 服务

hindsight-roo-code install --api-url http://localhost:8888
```

安装程序写入的 MCP 配置如下，你可以随时查看或编辑：

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "streamable-http",
      "url": "http://localhost:8888/mcp",
      "timeout": 30,
      "alwaysAllow": ["recall", "retain"]
    }
  }
}
```

## 验证是否正常工作 {#verifying-it-works}

1. 启动 Hindsight（或使用 Cloud），然后运行安装程序。
2. 在项目中打开 Roo Code。
3. 打开 **设置 → MCP 服务器**，确认 `hindsight` 显示为已连接。
4. 启动一项任务并查看工具调用日志。你应该能看到任务开始时调用了 `recall`。

在一项任务中教它一些内容（“这个代码库使用 pnpm，而不是 npm；测试文件与源文件放在一起”），然后第二天开始一项新任务，看看它能否自行召回这条信息。

## 记忆可以跨工具使用 {#the-memory-follows-you}

记忆存放在 Hindsight 记忆库中，而不在 Roo Code 内部，因此不会被某个工具锁定。将另一个 Hindsight 集成指向同一个记忆库，上下文就能继续沿用。Roo 存入的决策也可以供 Claude Code、Cursor 或任何读取该记忆库的其他工具使用。Roo 负责运行任务；记忆则会留存下来。

## 常见问题 {#frequently-asked-questions}

**这会取代 Roo Code 的上下文吗？**
不会。Roo 仍会为每项任务组装自己的工作上下文。Hindsight 会增加一个可跨任务和会话留存的记忆层，并在任务开始时注入相关内容。

**每次调用记忆工具都需要我批准吗？**
不需要。MCP 配置会自动批准 `recall` 和 `retain`，因此它们运行时不会中断任务。

**我的记忆会限制在一个项目内吗？**
默认情况下会。项目级安装会写入 `.roo/`，因此每个代码库都有自己的记忆。如果希望所有项目共享记忆，请使用 `--global`。

**离线时可以使用吗？**
可以。自托管 Hindsight，将安装程序指向 `http://localhost:8888`，所有数据都不会离开你的计算机。

## 试用 {#try-it}

如果你已经在使用 Roo Code，最快的体验方式就是安装这个集成，完成几项任务，然后第二天开始一项新任务，看看它如何从上次停下的地方继续。[获取免费的 Hindsight Cloud 密钥](https://ui.hindsight.vectorize.io)，然后运行 `hindsight-roo-code install`。

## 延伸阅读 {#further-reading}

- [Roo Code 集成参考](/sdks/integrations/roo-code)：集中查看所有选项。
- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：了解每次 Roo 存入摘要时，Hindsight 会保存什么。
- [让所有 AI 工具共享一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：了解为什么记忆存储在任何单一智能体之外。
