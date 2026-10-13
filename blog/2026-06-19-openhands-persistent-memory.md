---
title: "OpenHands（以前的 OpenDevin）忘记每项任务。这是一命令修复。"
authors: [benfrank241]
slug: "2026/06/19/openhands-persistent-memory"
date: 2026-06-19T12:00
tags: [openhands, opendevin, mcp, memory, persistent-memory, hindsight, agents, tutorial]
description: "使用Hindsight为OpenHands（以前的OpenDevin）添加持久的长期记忆。一个命令将 Hindsight MCP 服务器连接到 config.toml 中，并将记忆召回/记忆存储规则放入智能体.md 中，这样智能体就会在每个任务开始时回忆起相关上下文，并在工作时保留持久的事实。"
image: /img/blog/openhands-persistent-memory.webp
hide_table_of_contents: true
---

![OpenHands 持久记忆Hindsight](/img/blog/openhands-persistent-memory.webp)

[OpenHands](https://github.com/OpenHands/OpenHands)（以前称为 OpenDevin）是最强大的开源编码智能体之一 - 它读取您的存储库、运行命令、编辑文件和发布更改。但每项任务都是从一张白纸开始的。你上周解释的架构决策、你昨天纠正的约定、你告诉它永远不要使用的库——在任务结束时一切都消失了。

这篇文章是Hindsight OpenHands 集成的演练。一个命令将 Hindsight 的 **MCP服务器** 连接到您的配置中，并将记忆召回/记忆存储规则放入 `AGENTS.md` 中，因此智能体在每项任务开始时都会提取相关上下文，并在工作时保存持久的事实。

## 概览 {#tldr}

<!-- truncate -->

- OpenHands 智能体冷启动每项任务——不记得过去的决定、偏好或惯例。
- Hindsight积分使用OpenHands'**原生MCP支持**。 `pip install hindsight-openhands`，运行`init`，完成。
- `init`将Hindsight**MCP服务器**添加到`config.toml`（赋予智能体`recall` / `retain` / `reflect`工具），并将记忆召回/记忆存储**规则**写入`AGENTS.md`。
- 因为`AGENTS.md`是永远在线的上下文，所以该规则可靠地引导智能体：首先是记忆召回，存储记忆持久的事实——不需要提示。
- 记忆存在于您为每个项目选择的Hindsight**记忆库**中，因此每个存储库都有自己独立的记忆。
- Hindsight Cloud意味着没有基础设施。 [免费注册。](https://ui.hindsight.vectorize.io)

## 为什么OpenHands需要持久记忆 {#why-openhands-needs-persistent-memory}

OpenHands 非常擅长“做事”：给它一个任务，它会计划、运行工具并迭代，直到工作完成。在任务中它具有完整的工作上下文。但该上下文仅限于任务范围。关闭它，开始下一个，智能体就归零了。

对于日复一日地针对同一个存储库运行的编码智能体，这是您首先遇到的限制。它重新推导出每个任务的项目结构。它重新建议您已经拒绝的依赖项。它忘记了您上次执行的部署步骤。你最终会重新解释相同的上下文，直到感觉自己完成这项工作变得更容易为止。

Hindsight 为 OpenHands 提供了一种在任务和会话中持续存在的记忆 - 并且因为 OpenHands 本身就讲 MCP，因此只需一个命令即可将其连接起来。

## 它是如何工作的 {#how-it-works}

OpenHands 有 **原生 Streamable-HTTP MCP 支持**，因此 Hindsight MCP 端点直接连接 — 没有网桥，没有代理：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

仅此一项就为智能体提供了三种工具：`recall`、`retain`和`reflect`。但模型_可以_调用的工具不是它_将_调用的工具。整合的后半部分使记忆成为一种习惯，而不是一种选择。

OpenHands 将 `AGENTS.md` 加载到 **每项任务** 上的智能体上下文中。因此，集成在那里写入了记忆召回/记忆存储规则：

> 您通过HindsightMCP服务器（`recall`、`retain`和`reflect`工具）拥有持久的长期记忆。
>
> - 在每个任务开始时，根据用户的请求调用 `recall`，以在行动之前加载相关决策、首选项和项目上下文。使用相关的内容并忽略其余的。
> -当您了解一个持久的事实 - 架构决策、用户偏好、约定或任何值得跨会话记住的内容时 - 调用 `retain` 来存储它。
> ​​- 不要提及这些记忆操作，除非用户询问。

该规则位于文件顶部受隔离的`<!-- HINDSIGHT:BEGIN -->` … `<!-- HINDSIGHT:END -->` 块中，因此它引导指令，并且可以在不触及您自己的内容的情况下更新或删除。

## 设置 {#setup}

安装包并在项目中运行`init`：

```bash
pip install hindsight-openhands
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init`将`[mcp]`条目合并到`./config.toml`中，并将规则写入`./AGENTS.md`中。推荐的后端是 **Hindsight Cloud** — [免费注册](https://ui.hindsight.vectorize.io) 并创建一个 API 密钥。

自托管的工作原理相同；在本地运行 API 并将 `init` 指向它（开放本地服务器不需要令牌）：

```bash
hindsight-openhands init --api-url http://localhost:8888 --bank-id my-project
```

如果`config.toml`无法安全解析，`init`永远不会接触它——它会打印要粘贴的确切片段。您还可以预览所有内容，而无需编写任何内容：

```bash
hindsight-openhands init --print-only
```

## 每个项目记忆 {#per-project-memory}

`--bank-id`是记忆的路由键。 Hindsight记忆库只是一个命名空间，编码智能体的自然粒度是每个项目一个记忆库：

```bash
hindsight-openhands init --bank-id acme-api
```

每个存储库都有自己独立的记忆——`acme-api`的决策和约定永远不会渗透到`acme-frontend`。因为记忆库位于服务器端（在云或您自己的实例上），所以无论您在本地、在 CI 中还是从另一台机器运行 OpenHands，都会存在相同的记忆。如果不设置，记忆库id默认为`openhands`。

## 命令 {#commands}

|命令|它的作用|
| ------------------------------- | --------------------------------------------------------- |
|`hindsight-openhands init`|添加MCP服务器+记忆召回/记忆存储规则|
|`hindsight-openhands status`|显示服务器+规则是否配置|
|`hindsight-openhands uninstall`|删除服务器+规则（保留您自己的内容完整）|

## 三件事是正确的 {#three-things-it-gets-right}

**原生MCP，无桥接。** OpenHands 讲 Streamable-HTTP MCP，Hindsight 直接为其提供服务。没有本地代理进程来照顾，也没有任何东西可以与智能体一起运行——只有`config.toml`中的一个URL。

**这条规则使记忆召回变得可靠。** 暴露记忆工具是不够的；模型必须实际使用它们。将规则置于始终在线的 `AGENTS.md` 上下文中意味着智能体会在每一项任务上提醒记忆召回和记忆存储，因此记忆不会落空。

​​**它可以像外科手术一样编辑您的文件。** `init` 合并到现有的 `config.toml` 和 `AGENTS.md` 而不是覆盖它们，并且该规则位于围栏块中。 `uninstall` 完全删除该块，而不删除任何其他内容。您的配置和智能体指令归您所有。

## 回顾 {#recap}

||OpenHands 默认|与 Hindsight|
| --------------------- | ----------------- | -------------------------------------------------- |
|跨任务记忆|无|持久，每个记忆库|
|设置|不适用|一个命令 (`init`)|
|交通|不适用|本机MCP（无桥）|
|记忆召回/记忆存储|不适用|`recall` / `retain` / `reflect` 工具，规则引导|
|每个项目的隔离|不适用|套装`--bank-id`|
|移除|不适用|`uninstall` — 手术，非破坏性|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[OpenHands + Hindsight](/sdks/integrations/openhands)
- **来源：**[vectorize-io/hindsight/hindsight-integrations/openhands](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/openhands)
