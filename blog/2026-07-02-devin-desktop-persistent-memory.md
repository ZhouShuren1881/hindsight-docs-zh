---
title: "Devin 桌面持久记忆（以前称为 Windsurf）"
authors: [benfrank241]
slug: "2026/07/02/devin-desktop-persistent-memory"
date: 2026-07-02T13:00
tags: [hindsight, devin-desktop, devin, windsurf, codeium, memory, persistent-memory, mcp, tutorial]
description: "将持久记忆添加到Devin桌面（以前称为Windsurf）：一台远程MCP服务器加上一条始终在线的规则，可在任务开始时调用并在您工作时保留。"
image: /img/blog/devin-desktop-persistent-memory.webp
hide_table_of_contents: true
---

![Devin 桌面持久记忆与Hindsight](/img/blog/devin-desktop-persistent-memory.webp)

[Devin 桌面版](https://devin.ai) 是 Cognition 编辑器，于 2026 年 6 月由 Windsurf（以前称为 Codeium）更名。名称已更改；差距没有。 Devin 读取您的代码库并在会话中保存计划，但它不会跨会话携带任何内容。关闭编辑器，明天重新打开它，智能体又是一个新的模型，不记得你上周讨论过的决定或你周二设定的惯例。

The`hindsight-devin-desktop`集成增加了持久的长期记忆Devin。值得理解*如何*它到达那里，因为DevinDesktop 不会向第三方公开生命周期挂钩。没有地方可以固定`sessionStart`记忆召回或`stop`记忆存储。相反，集成使用编辑器的两个东西*确实*支持：**远程MCP (MCP) 服务器**和**永远在线的工作空间规则**。

<!-- truncate -->

## 概览 {#tldr}

- Devin Desktop（以前称为 Windsurf）没有第三方生命周期挂钩，因此记忆是通过 MCP 加上规则而不是挂钩脚本来连接的。
- `hindsight-devin-desktop init` 连接Hindsight **远程MCP服务器**（Devin 获取`recall` / `retain` / `reflect` 工具）并将一个**永远在线规则** 写入`.devin/rules/hindsight.md`。
- 规则在每个任务开始时告诉Devin到`recall`，并在工作时告诉`retain`持久的事实。
- 没有本地守护进程，没有插件脚本，没有每回合挂钩。 MCP端点直接连接到[Hindsight Cloud](https://hindsight.vectorize.io)或您的自托管服务器。
- 这是**模型驱动的记忆**：规则存在于每个请求中，但实际的记忆召回/存储记忆调用是Devin的决定。这是与基于钩子的确定性集成的主要权衡。

## 为什么Devin桌面需要持久记忆 {#why-devin-desktop-needs-persistent-memory}

新的Devin会话从它可以看到的任何内容开始：您打开的文件、工作区以及您在`.devin/rules/`中编写的任何规则。它看不到的就是过去。您昨天通过三个文件跟踪的错误、您选择的库及其原因、您一直坚持的命名约定。除非您将其写在 Devin 读取的地方，否则这些都不会在会话边界中幸存下来。

您可以使用规则文件手动固定上下文，以获得有效的稳定事实。对于你不知道的事情提前记录是没有帮助的。持久记忆弥补了这一差距：当你工作时，持久的事实会被保留下来，而相关的事实会在下次重新出现。

这对于你整天生活在编辑器中的人来说更重要。每天早上都会重新自我介绍的编码智能体并不是真正的助手。 记忆可以将每次训练都新鲜的模型变成建立在昨天的基础上的模型。

## Devin桌面持久记忆如何工作 {#how-devin-desktop-persistent-memory-works}

Devin Desktop 为第三方提供了两个集成点，`hindsight-devin-desktop` 同时使用这两个集成点。

**远程MCP服务器。**Devin桌面从单个全局配置读取MCP服务器，并通过`serverUrl`使用自定义标头支持*遥控*服务器，因此集成点Devin直接指向HindsightMCP端点，无需管理本地进程：

```json
{
  "mcpServers": {
    "hindsight": {
      "serverUrl": "https://api.hindsight.vectorize.io/mcp/my-project/",
      "headers": { "Authorization": "承载HSK_..." }
    }
  }
}
```

这给了Devin三个工具：`recall`（搜索记忆）、`retain`（存储持久事实）和`reflect`（综合的、基于记忆的答案）。记忆库在端点路径中进行编码，因此一个配置行范围涵盖到记忆库的整个连接。

**永远在线的规则。** Devin Desktop 将 `.devin/rules/` 下且其 frontmatter 为 `trigger: always_on` 的任何规则文件应用于工作区中的每个请求。该集成会写入一个专用文件 `.devin/rules/hindsight.md`，告诉 Devin 如何以及何时使用这些工具：

```markdown
---
trigger: always_on
---

<!-- Managed by hindsight-devin-desktop -->
You have persistent long-term memory through the Hindsight MCP server
(`recall`, `retain`, and `reflect` tools).

- At the start of each task, call `recall` with the user's request to load
  relevant decisions, preferences, and project context before you act.
  Use what's relevant and ignore the rest.
- When you learn a durable fact, such as an architectural decision, a user
  preference, a convention, or anything worth remembering across sessions,
  call `retain` to store it.
- Do not mention these memory operations unless the user asks about them.
```

该文件带有哨兵注释 (`<!-- Managed by hindsight-devin-desktop -->`)，因此集成端到端地拥有它，并且可以幂等地更新或删除它，而无需触及您编写的任何其他规则。放在一起：MCP服务器使记忆*可用*成为工具，永远在线规则使Devin*使用*成为工具。

## 安装 {#install}

```bash
pip install hindsight-devin-desktop
cd your-project
hindsight-devin-desktop init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 将`mcpServers`条目合并到Devin桌面的全局MCP配置中，并将规则写入`./.devin/rules/hindsight.md`。重新加载Devin桌面（或刷新MCP服务器）并且`hindsight`工具已上线。

三个命令涵盖生命周期：`hindsight-devin-desktop init`添加MCP服务器和记忆召回/存储记忆规则，`status`显示两者是否已配置，`uninstall`删除它们。如果您的 MCP 配置不是简单的 JSON （注释或其他工具拥有它），`init` 不会破坏它。它会打印要粘贴的代码片段，您也可以随时使用 `hindsight-devin-desktop init --print-only` 获取该代码片段。

## 云或自托管 {#cloud-or-self-hosted}

默认情况下，集成点位于Hindsight Cloud(`https://api.hindsight.vectorize.io`)，它需要仪表板中的API密钥。要在您自己的服务器上运行，请传递 `--api-url`。如果是开放的本地服务器，则可以完全跳过令牌：

```bash
hindsight-devin-desktop init --api-url http://localhost:8888 --bank-id my-project
```

设置也可以来自环境：`HINDSIGHT_API_URL`（API端点，默认为云）、`HINDSIGHT_API_TOKEN`（不记名令牌，云所需）和`HINDSIGHT_DEVIN_DESKTOP_BANK_ID`（记忆范围的记忆库，默认为`devin-desktop`）。将两个项目放在同一个记忆库中以共享记忆，或者为每个项目提供自己的记忆库以进行隔离。

## 值得了解的品牌重塑细节 {#a-rebrand-detail-worth-knowing}

因为 Devin Desktop 是 Windsurf 的更名，一些磁盘上路径仍然保留旧名称，并且集成会处理该名称，因此您不必这样做。全局 MCP 配置仍然位于 `~/.codeium/windsurf/` 下（即 Devin 桌面的数据目录，重命名后未更改），而工作区规则现在位于 `.devin/rules/` 下，而 `.windsurf/rules/` 保留为旧后备。如果您在 Windsurf 软件包时使用了集成，则现有规则将继续有效，并且新路径将优先。

## 权衡：模型驱动，而不是 Hook 驱动 {#the-tradeoff-model-driven-not-hook-driven}

这值得直接讨论，因为这是此集成与Claude Code或CursorCLI的基于钩子的集成之间的真正区别。

基于 Hook 的集成是 **确定性**。在智能体看到提示之前，`sessionStart` 钩子就会回忆起来； `stop` 钩子在每个任务之后都会保留，无论模型是否想到。记忆召回和记忆存储的发生是因为安全带触发了一个事件，而不是因为智能体决定这样做。

Devin Desktop 不向第三方提供该界面，因此 `hindsight-devin-desktop` 是 **模型驱动**。永远在线规则被注入到每个请求中，因此使用记忆的指令始终存在，但实际的`recall`和`retain`调用是Devin的决定。在实践中，现代模型可靠地遵循简短、具体、始终在线的规则。但这只是一个指令，而不是一个保证：Devin可以在它认为不值得记住的任务上跳过`retain`，或者从上下文中回答而不先调用`recall`。如果您想为特定任务拉动记忆，您可以直接询问（“检查记忆以了解我们如何处理身份验证”），`reflect` 可以根据需要进行整合。诚实的框架：Devin桌面用钩子的保证换取了远程MCP服务器和一个规则文件的简单性，没有本地守护程序，也没有任何东西可以保持运行。

## 常见问题解答 {#frequently-asked-questions}

**Devin桌面版和Windsurf一样吗？**
是的。 Cognition 于 2026 年 6 月将 Windsurf 编辑器（以前称为 Codeium）更名为Devin Desktop。`hindsight-devin-desktop` 软件包是维护的集成；它将其规则写入`.devin/rules/`，并仍然读取`~/.codeium/windsurf/`下的MCP配置，该配置在品牌重塑后没有改变。

**Devin桌面是否具有跨会话的内置记忆？**
没有。新的会话重新开始。持久记忆来自于像`hindsight-devin-desktop`这样的集成，它在记忆层上提供了Devin记忆召回和记忆存储。

**记忆召回会减慢Devin的速度吗？**
记忆召回是智能体的调用，而不是每次提示的挂钩，因此每次都没有固定的开销。当 Devin 执行记忆召回时，Hindsight Cloud查询通常远低于一秒。

**它可以与自托管Hindsight一起使用吗？**
是的。传递 `--api-url` （或设置 `HINDSIGHT_API_URL`）以指向您的服务器。对于没有身份验证的开放本地服务器，请省略令牌。

## 进一步阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回、保留和记忆库背后的基本概念。
- [最佳AI智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：主要智能体记忆框架的比较。
- [Cursor持久记忆](/blog/2026/06/12/cursor-persistent-memory)：Cursor编辑器和 CLI 的基于钩子的同级集成。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将Devin和你的其他智能体指向同一个记忆库。
