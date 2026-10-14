---
title: "OpenHands（原名 OpenDevin）会忘记每项任务。用一条命令即可解决。"
authors: [benfrank241]
slug: "2026/06/19/openhands-persistent-memory"
date: 2026-06-19T12:00
tags: [openhands, opendevin, mcp, memory, persistent-memory, hindsight, agents, tutorial]
description: "使用 Hindsight 为 OpenHands（原名 OpenDevin）添加持久的长期记忆。只需一条命令，就能将 Hindsight MCP 服务器接入 config.toml，并把召回/存入规则写入 AGENTS.md，让智能体在每项任务开始时召回相关上下文，并在工作过程中存入值得长期保留的事实。"
image: /img/blog/openhands-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 OpenHands 添加持久记忆](/img/blog/openhands-persistent-memory.webp)

[OpenHands](https://github.com/OpenHands/OpenHands) 是功能强大的开源编码智能体之一（原名 OpenDevin）：它可以读取代码仓库、运行命令、编辑文件并交付更改。但每项任务开始时，它都像一张白纸。你上周解释过的架构决策、昨天纠正过的约定、你告诉它绝不要使用的库，都会在任务结束时一并消失。

本文将介绍 Hindsight 与 OpenHands 的集成方式。只需一条命令，就能将 Hindsight 的 **MCP 服务器**接入配置，并把召回/存入规则写入 `AGENTS.md`，让智能体在每项任务开始时提取相关上下文，并在工作过程中保存值得长期保留的事实。

## 简介 {#tldr}

<!-- truncate -->

- OpenHands 智能体每项任务都从零开始：它不记得以往的决策、偏好或约定。
- Hindsight 集成使用 OpenHands 的**原生 MCP 支持**。运行 `pip install hindsight-openhands`，再运行 `init` 即可。
- `init` 会将 Hindsight **MCP 服务器**添加到 `config.toml`（为智能体提供 `recall` / `retain` / `reflect` 工具），并将召回/存入**规则**写入 `AGENTS.md`。
- `AGENTS.md` 会始终载入上下文，因此这条规则能可靠地引导智能体：先召回，再存入值得长期保留的事实，无需额外提示。
- 记忆存放在你为项目选择的 Hindsight **记忆库**中，因此每个代码仓库都有独立的记忆。
- 使用 Hindsight Cloud 无需自行搭建基础设施。[免费注册。](https://ui.hindsight.vectorize.io)

## 为什么 OpenHands 需要持久记忆 {#why-openhands-needs-persistent-memory}

OpenHands 擅长执行任务：你给它一个任务，它便会制定计划、调用工具并反复迭代，直到完成。在单项任务中，它拥有完整的工作上下文；但上下文只在该任务期间有效。关闭任务后再开始下一项，智能体就会回到起点。

如果你每天都让编码智能体处理同一个代码仓库，这会很快成为明显的限制。它会在每项任务中重新梳理项目结构，重新建议你已经否决的依赖项，也会忘记你上次一步步教它执行的部署流程。你不得不一遍遍解释相同的背景，最后甚至觉得自己动手更省事。

Hindsight 让 OpenHands 能在不同任务和会话之间保留记忆。由于 OpenHands 原生支持 MCP，只需一条命令就能完成接入。

## 工作原理 {#how-it-works}

OpenHands 原生支持 Streamable-HTTP MCP，因此 Hindsight MCP 端点可以直接接入，无需桥接或代理：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

这样就为智能体提供了三个工具：`recall`、`retain` 和 `reflect`。但模型“可以”调用的工具，不代表它“会”去调用。集成的另一部分会让记忆成为习惯，而非可选项。

OpenHands 会在**每项任务**中将 `AGENTS.md` 加载到智能体上下文里。因此，集成会在该文件中写入召回/存入规则：

> 你通过 Hindsight MCP 服务器（`recall`、`retain` 和 `reflect` 工具）拥有持久的长期记忆。
>
> - 每项任务开始时，使用用户的请求调用 `recall`，在采取行动之前加载相关决策、偏好和项目背景。只采用相关内容，忽略其余内容。
> - 如果你得知值得长期保留的事实（例如架构决策、用户偏好、约定，或任何值得在不同会话间记住的内容），就调用 `retain` 将其存储起来。
> - 除非用户询问，否则不要提及这些记忆操作。

这条规则位于文件顶部的 `<!-- HINDSIGHT:BEGIN -->` … `<!-- HINDSIGHT:END -->` 围栏块中，因此会优先出现在指令中，也可以单独更新或删除，不会影响你自己的内容。

## 设置 {#setup}

安装软件包，并在项目中运行 `init`：

```bash
pip install hindsight-openhands
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `[mcp]` 配置合并到 `./config.toml`，并将规则写入 `./AGENTS.md`。推荐使用 **Hindsight Cloud** 作为后端：[免费注册](https://ui.hindsight.vectorize.io)并创建 API 密钥。

自托管的接入方式相同：在本地运行 API，然后让 `init` 指向它（开放的本地服务器无需令牌）：

```bash
hindsight-openhands init --api-url http://localhost:8888 --bank-id my-project
```

如果 `config.toml` 无法安全解析，`init` 不会修改该文件，而是打印出可供粘贴的完整配置片段。你也可以先预览所有更改，而不写入任何内容：

```bash
hindsight-openhands init --print-only
```

## 按项目隔离记忆 {#per-project-memory}

`--bank-id` 是记忆的路由键。Hindsight 记忆库本质上是一个命名空间；对编码智能体来说，最自然的粒度是每个项目使用一个记忆库：

```bash
hindsight-openhands init --bank-id acme-api
```

每个代码仓库都有独立的记忆：`acme-api` 的决策和约定不会泄漏到 `acme-frontend`。由于记忆库存放在服务端（Hindsight Cloud 或你自己的实例），无论你在本地、CI 中还是另一台机器上运行 OpenHands，都能使用同一份记忆。如果没有设置，记忆库 ID 默认为 `openhands`。

## 命令 {#commands}

| 命令 | 作用 |
| ------------------------------- | --------------------------------------------------------- |
| `hindsight-openhands init` | 添加 MCP 服务器和召回/存入规则 |
| `hindsight-openhands status` | 显示服务器和规则是否已配置 |
| `hindsight-openhands uninstall` | 移除服务器和规则（保留你自己的内容） |

## 三个做得好的地方 {#three-things-it-gets-right}

**原生 MCP，无需桥接。** OpenHands 支持 Streamable-HTTP MCP，Hindsight 可直接提供服务。无需维护本地代理进程，也无需让其他服务与智能体一同运行；在 `config.toml` 中配置一个 URL 即可。

**规则让召回变得可靠。** 仅仅提供记忆工具还不够，模型还必须实际使用这些工具。将规则写入始终载入的 `AGENTS.md` 上下文后，智能体每项任务都会收到召回和存入的提醒，因此记忆的使用不再靠碰运气。

**它会精准修改你的文件。** `init` 会合并到现有的 `config.toml` 和 `AGENTS.md` 中，而不是覆盖它们；规则也放在围栏块中。`uninstall` 只会移除该块，不会触碰其他内容。配置和智能体指令仍由你掌控。

## 回顾 {#recap}

| | OpenHands 默认情况 | 使用 Hindsight |
| --------------------- | ----------------- | -------------------------------------------------- |
| 跨任务记忆 | 无 | 持久记忆，按记忆库隔离 |
| 设置方式 | 不适用 | 一条命令（`init`） |
| 传输方式 | 不适用 | 原生 MCP（无需桥接） |
| 召回/存入 | 不适用 | `recall` / `retain` / `reflect` 工具，由规则引导 |
| 项目间隔离 | 不适用 | 设置 `--bank-id` |
| 移除方式 | 不适用 | `uninstall`：精准移除，不造成破坏 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[OpenHands + Hindsight](/sdks/integrations/openhands)
- **源代码：**[vectorize-io/hindsight/hindsight-integrations/openhands](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openhands)
