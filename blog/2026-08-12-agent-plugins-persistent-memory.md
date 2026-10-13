---
title: "给予任何智能体插件客户端长期记忆"
authors: [benfrank241]
slug: "2026/08/12/agent-plugins-persistent-memory"
date: 2026-08-12T12:00
tags: [hindsight, agent-plugins, mcp, agent-memory, persistent-memory, vercel]
description: "智能体插件是用于打包技能和MCP服务器的新的供应商中立标准。 Hindsight 附带了一款便携式插件，可以为 Codex、Cursor、Copilot、Kiro 和 VS Code 提供长期记忆。"
image: /img/blog/agent-plugins-persistent-memory.png
hide_table_of_contents: true
---

![Hindsight 作为智能体插件：一个便携式捆绑包为每个兼容客户端带来记忆召回、记忆存储和反思](/img/blog/agent-plugins-persistent-memory.png)

8 月 6 日，Vercel、OpenAI、亚马逊、Cursor 和 GitHub 宣布了 [智能体插件](https://agent-plugins.org)：用于打包智能体扩展的供应商中立标准，以便您构建一次并在每个兼容客户端上运行。到目前为止，每个工具都需要自己的配置格式。您为一个智能体编写的技能不会转移到下一个智能体，您连接的MCP服务器也不会转移。

Hindsight 现在作为智能体插件提供。一个便携式捆绑包可为任何受支持的客户端（[Codex](https://openai.com/index/introducing-codex/)、Cursor、GitHub Copilot、Kiro 和 VS Code）提供相同的长期记忆，无需手动集成每个工具。

<!-- truncate -->

## 概览 {#tldr}

- **智能体插件** 将 **智能体技能+MCP服务器** 打包到单个可分发插件中。它在 ChatGPT/Codex、Cursor、GitHub Copilot、Kiro 和 VS Code 中支持。
- Hindsight 为标准提供 **一个** 插件，而不是 N 个每个 IDE 配置。它具有相同的`recall` / `retain` / `reflect` 记忆。
- 该捆绑包包含三个文件：清单、MCP 服务器配置和记忆技能。它是 **仅限交通** — 所有记忆逻辑都保留在服务器端的 Hindsight 中。
- 设置两个环境变量（`HINDSIGHT_API_KEY`，可选`HINDSIGHT_BANK_ID`），智能体会在捆绑技能的引导下自动调用记忆工具。
- 诚实的限制：标准涵盖技能和MCP，而不是会话挂钩，所以这是**显式、工具驱动**记忆。要跨编码智能体全自动捕获，请使用 [编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents) — 它共享相同的记忆库。

## 智能体插件实际上是什么 {#what-agent-plugins-actually-is}

在去年的大部分时间里，扩展智能体意味着学习每种工具的方言。 MCP标准化了智能体如何与服务器通信，但没有标准化*船*扩展：技能文件、服务器配置和元数据仍然以特定于工具的格式存在。

智能体插件弥补了这一差距。这是一个小型的开放规范 — Vercel 发起了该提案，并与 AWS、Cursor、GitHub、Microsoft 和 OpenAI 进行了完善 — 为插件定义了一个文件夹布局。插件捆绑了生态系统已经融合的两件事：

- **智能体技能**：可重复使用的指令，教智能体*当*和*如何*做某事。
- **MCP 服务器**：与实时工具和数据的连接。

结果是智能体扩展“一次构建，随处运行”。该标准发布时由 **ChatGPT / Codex、Cursor、GitHub Copilot、Kiro 和 VS Code** 支持。这正是记忆重要的表面，也正是为每个客户维护单独的集成不再值得的地方。

## Hindsight 已发货 {#what-hindsight-shipped}

Hindsight插件遵循智能体插件`1.0.0`布局，仅此而已：

```
agent-plugin/
├── plugin.json                       # manifest ($schema + name + metadata)
├── mcp.json                          #Hindsight MCP服务器（流式HTTP）
└── skills/
    └── hindsight-memory/
        └── SKILL.md                  # teaches the agent when to recall / retain / reflect
```

这就是整个事情。它故意很薄，因为记忆引擎已经存在并且经过了实际测试——插件只是它基于标准的前门。

- **`mcp.json`** 通过 Streamable HTTP 将客户端连接到 Hindsight 的内置 [MCP服务器](https://hindsight.vectorize.io/developer/mcp-server)。它仅用于传输：检索、集成和推理都发生在服务器端。
- **`skills/hindsight-memory/SKILL.md`** 被加载到智能体的上下文中，因此它知道 *当* 来获取记忆，而不仅仅是工具的存在。这是大多数集成都会跳过的部分，这是具有记忆工具的智能体和在正确的时刻实际使用它们的智能体之间的区别。

整个插件已获得 MIT 许可并位于 [Hindsight 仓库](https://github.com/vectorize-io/hindsight) 中。

## 智能体获得的记忆 {#the-memory-the-agent-gets}

通过MCP服务器，智能体获得Hindsight的完整记忆表面。它最常用的三种工具：

|工具|当|它的作用|
|------|------|--------------|
|`recall`|回答之前，过去的背景何时可以提供帮助|语义+关键词+图形+记忆库的时间检索|
|`retain`|学习了一个持久的、可重复使用的事实之后|存储未来会话的事实|
|`reflect`|当查找太浅并且需要综合推理时|对记住的一切进行倾向感知推理|

知识页面、心智模型、文档、标签通过同一服务器暴露。捆绑的技能阐明了纪律：在任务开始时或当用户参考早期工作时进行记忆召回，记忆存储持久的偏好和决策而不是短暂的喋喋不休，并且仅当单个查找对于问题来说太浅时才进行反思。

## 配置 {#configuration}

插件读取两个环境变量，插入到`mcp.json`中：

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|API 键|`HINDSIGHT_API_KEY`|—|您的 `hsk_...` 密钥，作为 `Authorization: Bearer` 发送。 Hindsight Cloud所需。|
|记忆库|`HINDSIGHT_BANK_ID`|`default`|用于读取和写入的记忆库，作为 `X-Bank-Id` 发送。每个用户、项目或团队使用一个记忆库。|

记忆库范围值得一试。 `mcp.json`端点是每个记忆库的，因此智能体永远不会传递`bank_id`参数——隔离是由连接强制执行的，而不是由模型记住其调用范围来强制执行的。这与我们的多租户用户所依赖的[每用户隔离模型](https://hindsight.vectorize.io/blog/2026/08/04/per-user-multi-tenant-agent-memory)相同，也是[每个项目或团队一个记忆库](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)保持上下文相关而不是跨关注点的原因。

一个可移植性说明：大多数客户端替换 `${VAR}`，但有些 — VS Code 和 Cursor — 期望使用 `${env:VAR}`。如果您的客户端根本不进行插值，请将文字密钥和记忆库 id 粘贴到 `mcp.json` 中。

## 显式工具与自动捕获 {#explicit-tools-vs-automatic-capture}

这里是诚实的边界。 智能体插件`1.0.0`标准化了**技能和MCP**，而不是会话生命周期挂钩。因此，这个插件提供了**显式、工具驱动**记忆：当技能告诉它时，智能体会调用`recall`和`retain`，并且该行为在每个受支持的客户端上都是相同的。

它不会在每次提示之前自行触发或在会话结束时自动捕获会话。这种全自动体验需要更深入的、特定于工具的接线。对于编码工作，这正是 [编码智能体集成](https://hindsight.vectorize.io/sdks/integrations/coding-agents) 提供的：一个跨 opencode、Cline、Kilo、Cursor CLI、Codex CLI、GitHub Copilot CLI、Claude Code、Grok Build 等安装本机记忆的软件包。它根据 git 历史记录和过去的会话自动构建每个存储库的记忆库，然后在智能体工作时注入相关上下文——模型不需要记住调用的工具。

这两种方法不是分叉。他们读取和写入**同Hindsight记忆库**，因此任何智能体插件客户端内的便携式插件都会调用编码智能体集成自动捕获的上下文，反之亦然。选择可移植且显式的或本机且自动的每个工具；下面的记忆是一家存储。

## 快速入门 {#quick-start}

快速路径是[Hindsight Cloud](https://ui.hindsight.vectorize.io)：免费注册，获取API密钥，无需自行托管。

1. 从[ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect)获取`hsk_...`钥匙。
2. 设置插件读取的两个环境变量：

   ```bash
   export HINDSIGHT_API_KEY="hsk_your_token"
   export HINDSIGHT_BANK_ID="my-project"   #可选；默认为“默认”
   ```

3. 通过插件/MCP UI 在客户端安装插件。安装在设计上是针对特定客户的——规范将分配留给每个工具。

安装后，询问智能体一些取决于过去背景的信息，或者告诉它一个持久的偏好。它在技能的引导下自动调用`recall`和`retain`。

**自托管：** 将 `mcp.json` (`https://api.hindsight.vectorize.io`) 中的主机替换为您自己的部署的 URL。 MCP端点打开的本地服务器不需要API密钥。

## 为什么这很重要 {#why-this-matters}

标准是无聊的，直到它们消除了真正的工作。一周前，提供五种不同的智能体记忆意味着需要构建和维护五种集成。现在，它是一个插件，每个兼容的客户端都以相同的方式加载，并且它通过共享记忆库与本机集成保持同步。

记忆层将一个有能力但健忘症的智能体转变为一个随着你使用时间的延长而变得更有用的智能体。 智能体插件使该层可移植。如果您正在运行 Codex、Cursor、Copilot、Kiro 或 VS Code，您今天就可以给它长期记忆 — [从这里开始](https://ui.hindsight.vectorize.io)。

---

**了解更多：**
- [智能体插件标准](https://agent-plugins.org) — 规格和指南
- [智能体插件介绍](https://vercel.com/blog/introducing-agent-plugins) — Vercel 的公告
- [Hindsight MCP 服务器参考](https://hindsight.vectorize.io/developer/mcp-server) — 插件公开的每个工具
