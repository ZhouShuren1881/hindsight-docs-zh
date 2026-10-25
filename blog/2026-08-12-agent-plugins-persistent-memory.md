---
title: "为任意 Agent Plugins 客户端提供长期记忆"
authors: [benfrank241]
slug: "2026/08/12/agent-plugins-persistent-memory"
date: 2026-08-12T12:00
tags: [hindsight, agent-plugins, mcp, agent-memory, persistent-memory, vercel]
description: "Agent Plugins 是一种不依赖特定供应商的新标准，用于打包 Agent Skills 和 MCP 服务器。Hindsight 提供一个可移植插件，为 Codex、Cursor、Copilot、Kiro 和 VS Code 带来长期记忆。"
image: /img/blog/agent-plugins-persistent-memory.png
hide_table_of_contents: true
---

![Hindsight 作为 Agent Plugin：一个可移植的插件包，为每个兼容客户端提供召回、存入和反思能力](/img/blog/agent-plugins-persistent-memory.png)

8 月 6 日，Vercel、OpenAI、Amazon、Cursor 和 GitHub 宣布推出 [Agent Plugins](https://agent-plugins.org)：一种不依赖特定供应商的标准，用于打包智能体扩展，让你只需构建一次，就能在所有兼容客户端上运行。此前，每种工具都有自己的配置格式。为一个智能体编写的技能无法直接迁移到另一个智能体，你接入的 MCP 服务器也一样。

如今，Hindsight 已作为 Agent Plugin 发布。一个可移植的插件包就能让所有受支持的客户端——[Codex](https://openai.com/index/introducing-codex/)、Cursor、GitHub Copilot、Kiro 和 VS Code——使用同一套长期记忆，无须为每种工具手工编写集成。

<!-- truncate -->

## 概览 {#tldr}

- **Agent Plugins** 将 **Agent Skills + MCP 服务器** 打包成一个可分发的插件。该标准发布时已获 ChatGPT/Codex、Cursor、GitHub Copilot、Kiro 和 VS Code 支持。
- Hindsight 为该标准提供 **一个** 插件，无须为每个 IDE 分别维护 N 份配置。插件提供同一套 `recall` / `retain` / `reflect` 记忆能力。
- 插件包由三个文件组成：清单、MCP 服务器配置和记忆技能。它 **仅负责传输**——所有记忆逻辑都留在 Hindsight 服务器端。
- 设置两个环境变量（`HINDSIGHT_API_KEY`，以及可选的 `HINDSIGHT_BANK_ID`），智能体便会在随附技能的指导下自动调用记忆工具。
- 需要说明的限制是：该标准涵盖 Skills 和 MCP，不包含会话钩子，因此记忆调用是 **显式的、由工具驱动的**。若要在编程智能体中自动捕获记忆，请使用 [Coding Agents 集成](/sdks/integrations/coding-agents)；它与插件共用同一批记忆库。

## Agent Plugins 到底是什么 {#what-agent-plugins-actually-is}

在过去大半年的时间里，扩展智能体就意味着要学会每种工具各自的“方言”。MCP 统一了智能体与服务器的通信方式，却没有统一扩展的 *交付* 方式：技能文件、服务器配置和元数据仍然采用各工具自己的格式。

Agent Plugins 填补了这一空缺。它是一份简洁、开放的规范：提案由 Vercel 发起，并与 AWS、Cursor、GitHub、Microsoft 和 OpenAI 一起完善；规范为插件定义了一种统一的目录结构。它把生态系统已经趋于一致的两类内容打包在一起：

- **Agent Skills**：可复用的指令，教智能体 *何时* 以及 *如何* 执行某项任务。
- **MCP 服务器**：连接实时工具和数据的接口。

这样，智能体扩展便可以“一次构建，随处运行”。该标准发布时已获 **ChatGPT / Codex、Cursor、GitHub Copilot、Kiro 和 VS Code** 支持。这些平台正是记忆能发挥作用的地方；也正是在这些平台上，为每个客户端单独维护集成已不再划算。

## Hindsight 发布了什么 {#what-hindsight-shipped}

Hindsight 插件严格遵循 Agent Plugins `1.0.0` 的目录结构，仅此而已：

```
agent-plugin/
├── plugin.json                       # 清单（$schema + name + metadata）
├── mcp.json                          # Hindsight MCP 服务器（Streamable HTTP）
└── skills/
    └── hindsight-memory/
        └── SKILL.md                  # 指导智能体何时调用 recall / retain / reflect
```

这就是插件的全部内容。它刻意保持轻量，因为记忆引擎早已存在且经受过实战检验；这个插件只是以标准化方式提供的入口。

- **`mcp.json`** 通过 Streamable HTTP 将客户端连接到 Hindsight 内置的 [MCP 服务器](/developer/mcp-server)。它仅负责传输：检索、整合和推理都在服务器端完成。
- **`skills/hindsight-memory/SKILL.md`** 会加载到智能体的上下文中，让它知道 *何时* 使用记忆，而不只是知道这些工具存在。这是多数集成会忽略的部分，也正是“拥有记忆工具的智能体”和“能在恰当时机实际使用这些工具的智能体”之间的区别。

整个插件采用 MIT 许可证，存放在 [Hindsight 仓库](https://github.com/vectorize-io/hindsight)中。

## 智能体可以使用哪些记忆 {#the-memory-the-agent-gets}

通过 MCP 服务器，智能体可以使用 Hindsight 提供的全部记忆能力。它最常用的三种工具是：

| 工具 | 使用时机 | 用途 |
|------|------|--------------|
| `recall` | 作答前，且过去的上下文可能有所帮助时 | 在记忆库中进行语义、关键词、图和时间检索 |
| `retain` | 了解到值得长期复用的事实之后 | 存储事实，供后续会话使用 |
| `reflect` | 单次查找不够深入，需要综合推理时 | 根据已记忆的全部内容进行考虑性格倾向的推理 |

知识页、心智模型、文档和标签也都通过同一服务器提供。随附技能规定了使用方式：在任务开始时，或用户提到先前工作时调用 `recall`；存入持久的偏好和决策，而不是短暂的闲聊；仅当单次查找不足以回答问题时才调用 `reflect`。

## 配置 {#configuration}

插件会读取两个环境变量，并将其插入 `mcp.json`：

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| API 密钥 | `HINDSIGHT_API_KEY` | — | 你的 `hsk_...` 密钥，会作为 `Authorization: Bearer` 发送。使用 Hindsight Cloud 时必须设置。 |
| 记忆库 | `HINDSIGHT_BANK_ID` | `default` | 要读取和写入的记忆库，其 ID 会通过 `X-Bank-Id` 发送。每位用户、每个项目或每个团队各使用一个记忆库。 |

记忆库的范围值得特别说明。`mcp.json` 中的端点针对特定记忆库，因此智能体永远不需要传递 `bank_id` 参数；隔离由连接本身保证，而不依赖模型记住为每次调用指定范围。这与多租户用户所依赖的[按用户隔离模式](/blog/2026/08/04/per-user-multi-tenant-agent-memory)相同，也正是[每个项目或团队使用一个记忆库](/blog/2026/07/16/bank-strategy-agent-memory)能让上下文保持相关、避免不同关注事项相互混杂的原因。

还有一点与可移植性有关：大多数客户端会替换 `${VAR}`，但 VS Code 和 Cursor 等客户端要求使用 `${env:VAR}`。如果客户端完全不支持变量插值，就把实际的密钥和记忆库 ID 填入 `mcp.json`。

## 显式调用工具与自动捕获 {#explicit-tools-vs-automatic-capture}

这里有一个明确的边界：Agent Plugins `1.0.0` 标准化了 **Skills 和 MCP**，但没有标准化会话生命周期钩子。因此，这个插件提供的是 **显式的、由工具驱动的** 记忆：技能指示智能体何时调用 `recall` 和 `retain`，所有受支持客户端中的行为都相同。

该插件不会在每条提示到来前自动触发，也不会在会话结束时自动捕获会话内容。要实现完全自动化的体验，需要针对具体工具进行更深入的接入。对于编程任务，[Coding Agents 集成](/sdks/integrations/coding-agents)正是为此提供支持：它通过一个软件包，为 opencode、Cline、Kilo、Cursor CLI、Codex CLI、GitHub Copilot CLI、Claude Code、Grok Build 等工具安装原生记忆。它会根据 git 历史和过往会话自动为每个代码仓库构建一个记忆库，并在智能体工作时注入相关上下文，因此模型不必记住要调用哪些工具。

这两种方式并非互斥方案。它们读写的是 **同一批 Hindsight 记忆库**，因此，Coding Agents 集成自动捕获的上下文可以由任意 Agent Plugins 客户端中的可移植插件召回，反之亦然。你可以针对不同工具选择可移植且显式的方式，或原生且自动的方式；底层使用的是同一个记忆存储。

## 快速开始 {#quick-start}

最快的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册并获取 API 密钥，无须自行托管。

1. 从 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取你的 `hsk_...` 密钥。
2. 设置插件会读取的两个环境变量：

   ```bash
   export HINDSIGHT_API_KEY="hsk_your_token"
   export HINDSIGHT_BANK_ID="my-project"   # 可选；默认值为 "default"
   ```

3. 通过客户端的插件/MCP 界面安装插件。由于规范将分发方式交由各工具决定，安装步骤会因客户端而异。

安装后，可以询问智能体一个需要依赖过去上下文的问题，或告诉它一项持久偏好。在随附技能的指导下，它会自动调用 `recall` 和 `retain`。

**自托管：** 将 `mcp.json` 中的主机地址（`https://api.hindsight.vectorize.io`）替换为你自己的部署 URL。只要本地服务器已开放 MCP 端点，就不需要 API 密钥。

## 为什么这很重要 {#why-this-matters}

标准本身或许枯燥，但只要能省去实际工作，就有了意义。一周前，要让五种不同的智能体拥有记忆，就得构建并维护五套集成。现在只需一个插件，所有兼容客户端都能以相同方式加载它；它还通过共享记忆库与原生集成保持同步。

记忆层能让一个能力强却健忘的智能体，随着你与它协作的时间增长而变得越来越有用。Agent Plugins 让这层记忆可以移植。如果你正在使用 Codex、Cursor、Copilot、Kiro 或 VS Code，今天就可以为它接入长期记忆——[从这里开始](https://ui.hindsight.vectorize.io)。

---

**了解更多：**
- [Agent Plugins 标准](https://agent-plugins.org) — 规范和指南
- [Agent Plugins 介绍](https://vercel.com/blog/introducing-agent-plugins) — Vercel 的公告
- [Hindsight MCP 服务器参考](/developer/mcp-server) — 插件提供的所有工具

---
