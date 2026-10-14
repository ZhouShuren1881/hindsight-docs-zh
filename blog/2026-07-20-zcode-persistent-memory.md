---
title: "让 ZCode 拥有长期记忆，在不同工具间伴你同行"
authors: [benfrank241]
slug: "2026/07/20/zcode-persistent-memory"
date: 2026-07-20T12:00
tags: [hindsight, zcode, glm, agent-memory, persistent-memory, coding-agent, tutorial]
description: "ZCode 是 Z.ai 的 GLM 桌面编程智能体。通过普通 Python 钩子接入 Hindsight，实现持久记忆，无需 MCP，并可与 Claude Code 和 Cursor 共享。"
image: /img/blog/zcode-persistent-memory.webp
hide_table_of_contents: true
---

![ZCode 与 Hindsight：持久记忆伴你穿梭于不同编程工具](/img/blog/zcode-persistent-memory.webp)

[ZCode](https://zcode.z.ai) 是 Z.ai 基于 GLM 模型打造的桌面编程智能体。它运行迅速，搭载的模型能力出色；和几乎所有编程智能体一样，每次会话开始时，它都没有此前的上下文。关闭应用，第二天重新打开，它就忘了你的 API 使用 FastAPI 和 asyncpg、你用 pytest-asyncio 测试，以及你上周决定不使用 ORM。

本文将介绍如何借助 Hindsight 为 ZCode 添加持久记忆，无需 MCP 服务器，也不用改变你使用 ZCode 的方式。安装一组小型钩子后，ZCode 就会在每次提示前召回相关上下文，并在每轮结束后存入本轮内容。更重要的是，智能体建立的记忆不会困在 ZCode 里：它保存在 Hindsight 记忆库中，Claude Code 和 Cursor 也会读取，因此你的上下文可以在不同工具间跟随你。

<!-- truncate -->

## 概览 {#tldr}

- **ZCode 的持久记忆，无需 MCP。** ZCode 嵌入了 Claude Code 智能体运行时，并提供原生进程钩子系统，因此 Hindsight 可以通过普通 Python 钩子接入。无需运行服务器，也不必改变工作流程。
- **两个钩子各司其职：** 每次提示前召回记忆（作为额外上下文注入），每轮结束后存入记忆。
- **两种安装方式：** 从 Hindsight 市场安装 ZCode 插件（无需 `pip`），或使用 `hindsight-zcode` CLI 安装程序。
- **一个记忆库，多种工具：** Claude Code 和 Cursor 也使用同一个 Hindsight 记忆库，因此记忆可以跟随你穿梭于不同智能体和设备。
- **零运行时依赖：** 钩子脚本只使用 Python 标准库。

## 为什么使用钩子，而不是 MCP {#why-hooks-not-mcp}

大多数记忆集成通过模型上下文协议（MCP）接入：你需要和智能体一起运行一个服务器，并把记忆作为模型可调用的工具提供出来。这种方式可行，但多了一个需要管理的进程；它也把是否使用记忆交给模型决定，而没有让记忆自动发挥作用。

ZCode 提供了一条更直接的路径。由于它嵌入了 Claude Code 智能体运行时，因此会读取标准的 Claude Code 钩子配置格式，只是配置使用 ZCode 自己的命名空间 `~/.zcode/cli/config.json`。Hindsight 借此在智能体生命周期中接入记忆：每轮都会自动执行召回和存入，无需另行运行进程。钩子脚本只使用 Python 标准库，无需安装或维护运行时依赖。

## 设置 {#setup}

首先获取密钥。你可以[免费注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)，这样就无需运行守护进程；也可以选择自托管（下文详述）。

有两种安装方式，第一种完全不需要 `pip`。

**作为 ZCode 插件安装。** Hindsight 市场提供了一个仅包含钩子的插件，ZCode 可以直接安装：

```
zcode plugins add-marketplace vectorize-io/hindsight
zcode plugins install hindsight-zcode
```

安装后，ZCode 会自动注册这些钩子。通过环境变量（`HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN`）提供凭据，或者在 `~/.hindsight/zcode.json` 中创建一个小型配置文件：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

**使用 CLI 安装程序。** 如果你更喜欢通过命令行设置，`hindsight-zcode` 软件包附带一次性安装程序：

```bash
pip install hindsight-zcode
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

安装程序会将钩子脚本复制到 `~/.zcode/hooks/hindsight/`，把相应条目合并到 `~/.zcode/cli/config.json`（保留已有钩子），将 `hooks.enabled` 设为 `true`，并为个人配置创建 `~/.hindsight/zcode.json`。它绝不会改动你实际使用的 Claude Code 配置 `~/.claude/settings.json`。重启 ZCode 后，记忆功能就会启用。如需撤销安装，运行 `hindsight-zcode uninstall`；它只会移除 Hindsight 的条目，其余配置都会保留。

## 工作原理 {#how-it-works}

ZCode 会触发三个钩子事件，Hindsight 为每个事件分配一项工作：

| 钩子 | 事件 | 作用 |
|------|-------|------|
| `session_start.py` | `SessionStart` | 确认 Hindsight 可以访问；如果你选择自托管，则预热本地守护进程 |
| `recall.py` | `UserPromptSubmit` | 查询记忆库以获取相关记忆，将其作为上下文注入，然后暂存这条提示 |
| `retain.py` | `Stop` | 将暂存的提示与智能体回复配对，并存入本轮内容 |

在 `UserPromptSubmit` 事件中，召回钩子会读取你的提示、搜索 Hindsight 记忆库，然后生成一个上下文块，供 ZCode 在本轮内容传给模型之前注入。模型可以将它作为额外上下文读取，不会让对话记录变得杂乱：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg, not SQLAlchemy [world]
- Preferred testing framework: pytest with pytest-asyncio [experience]
</hindsight_memories>
```

在 `Stop` 事件中，存入钩子会取出暂存的提示，与回复配对，再将本轮内容发送给 Hindsight。这里有个值得了解的设计细节：ZCode 没有 `SessionEnd` 事件，因此改用 `Stop` 来存入记忆。每轮完成后都会单独存为一条记忆，而不是等到会话结束时再批量处理。这样一来，即使你突然关闭应用，也不会丢失已完成的轮次。

## 与众不同之处：一份记忆，多种工具 {#the-part-that-makes-this-different-one-memory-many-tools}

ZCode 加上 Hindsight 的能力不止于“能记住事情的智能体”。记忆不属于 ZCode，而是属于 Hindsight 记忆库；Claude Code 和 Cursor 通过各自的 Hindsight 集成，也会读写同一个记忆库。

想象一个普通的工作周：你在 ZCode 中使用 GLM，告诉它团队只会在紧急情况下于周五部署。两天后，你在 Cursor 中完成一个功能时，它已经知道这条部署规则，因为规则来自同一个记忆库。你回到家后在笔记本电脑上切换到 Claude Code，项目约定也会随之出现。智能体换了，记忆没有变。

这一共享体验之所以能顺畅实现，正是因为 ZCode 嵌入了 Claude Code 运行时，并使用相同的钩子配置格式。只要让这些工具连接到同一个记忆库（默认就是如此），无需特别配置就能共享记忆。

## 按项目隔离记忆 {#per-project-memory}

默认情况下，所有 ZCode 会话共用一个名为 `zcode` 的记忆库。这适合保存个人偏好和跨项目习惯。如果你希望不同项目的记忆互相隔离，可以启用动态记忆库 ID：

```json
{
  "dynamicBankId": true
}
```

启用后，Hindsight 会根据每个工作目录生成独立的记忆库，因此一个仓库中的决策不会渗入另一个仓库。如果你想了解使用一个共享记忆库与多个范围受限的记忆库各有什么取舍，我们写了一篇完整的实践指南，介绍如何[规划智能体记忆结构](/blog/2026/07/16/bank-strategy-agent-memory)。

## 使用云服务或自托管 {#cloud-or-self-hosted}

推荐使用 Hindsight Cloud：将 API URL 和令牌填入 `~/.hindsight/zcode.json` 即可。如果你希望所有内容都保留在本地，可以运行 `hindsight-embed` 守护进程，并将 `hindsightApiUrl` 留空。`session_start.py` 钩子会在端口 `9077` 上检测本地服务：

```bash
uvx hindsight-embed
```

守护进程不会自动为你启动，因此打开 ZCode 前需要单独启动它。

## 与 ZCode 内置记忆互为补充 {#it-complements-zcodes-built-in-memory}

ZCode 已经在 `~/.zcode/cli/memories/` 中提供了按项目隔离的本地记忆。Hindsight 不会取代这项功能，而是补足另一项能力：ZCode 的内置存储只属于一台机器上的一个项目；Hindsight 记忆库则是可在云端或本地运行的共享存储，能够跨工具和设备使用。因此，你的上下文可以跟随你从 ZCode 转到 Claude Code 和 Cursor，也可以从工作笔记本电脑同步到家用台式机。两者可以一起使用：本地存储用来记录项目中的临时内容，Hindsight 则保存你希望在各处都能使用的记忆。

## 常见问题 {#frequently-asked-questions}

**它会取代 ZCode 内置记忆吗？**
不会。ZCode 的内置存储仍只属于一台机器上的一个项目。Hindsight 会添加可跨工具和设备使用的共享记忆库，该记忆库可托管在云端或由你自行托管。两者可以同时运行。

**它需要 MCP 服务器吗？**
不需要。这项集成由普通 Python 钩子脚本构成，脚本会调用 Hindsight 的 REST API，因此无需另行运行进程。

**哪些工具可以共享记忆？**
任何连接到同一个 Hindsight 记忆库的工具都可以。ZCode、Claude Code 和 Cursor 都会读写该记忆库，因此你在其中一个工具中教给智能体的事实，也能在其他工具中召回。

**可以离线使用吗？**
可以。在本地运行 `hindsight-embed` 守护进程，将 `hindsightApiUrl` 留空，钩子就会通过端口 `9077` 连接到它。所有内容都留在你的设备上。

**这会拖慢 ZCode 吗？**
召回会在每次提示前运行一次，存入会在每轮结束后运行一次。钩子脚本只使用 Python 标准库，没有运行时依赖，因此每轮只增加一次轻量级 API 调用的开销。

## 试试看 {#try-it}

如果你已经在使用 ZCode，最快感受差异的方法是安装钩子，先用它完成一段会话，然后第二天开始新会话，看看它如何接上之前的进度。[免费获取 Hindsight Cloud 密钥](https://ui.hindsight.vectorize.io)，添加市场并安装插件即可。

## 延伸阅读 {#further-reading}

- [ZCode 集成参考](/sdks/integrations/zcode)：集中介绍所有配置选项。
- [让每种 AI 工具共享一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：说明为什么应该让多个智能体共享一个记忆库。
- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：介绍 ZCode 每次存入一个轮次时，Hindsight 实际保存了什么。
