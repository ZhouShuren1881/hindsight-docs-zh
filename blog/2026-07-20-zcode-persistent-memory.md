---
title: "给 ZCode 一个长期记忆，在工具之间跟随你"
authors: [benfrank241]
slug: "2026/07/20/zcode-persistent-memory"
date: 2026-07-20T12:00
tags: [hindsight, zcode, glm, agent-memory, persistent-memory, coding-agent, tutorial]
description: "ZCode是Z.ai的GLM桌面编码智能体。通过普通的Python钩子添加Hindsight以实现持久记忆，无MCP，与Claude Code和Cursor共享。"
image: /img/blog/zcode-persistent-memory.webp
hide_table_of_contents: true
---

![ZCode 与 Hindsight：持久记忆跟随您跨编码工具](/img/blog/zcode-persistent-memory.webp)

[Z代码](https://zcode.z.ai)是Z.ai的GLM桌面编码智能体，基于Z.ai的GLM模型构建。它速度很快，它驱动一个有能力的模型，并且像几乎所有编码智能体一样，它从一张白纸开始每个会话。关闭应用程序，明天重新打开它，它忘记了您的 API 是 asyncpg 上的 FastAPI，您使用 pytest-asyncio 进行了测试，并且您上周决定不使用 ORM。

这篇文章展示了如何使用 Hindsight 将持久记忆添加到 ZCode，并且无需 MCP 服务器即可完成此操作，并且无需更改您使用 ZCode 的方式。您安装了一小组钩子，从那时起，ZCode 会在每个提示之前调用相关上下文，并在完成后保留每个回合。更好的是，它构建的智能体记忆并没有被困在 ZCode 中：它存在于 Hindsight 记忆库中，Claude Code 和 Cursor 也可以从中读取，因此您的上下文在工具之间跟随您。

<!-- truncate -->

## 概览 {#tldr}

- **ZCode 的持久记忆，没有MCP。** ZCode 嵌入了 Claude Code 智能体运行时并提供了本机进程挂钩系统，因此 Hindsight 作为普通 Python 挂钩插入。没有服务器，没有工作流程变化。
- **两个钩子完成这项工作：** 每个提示之前的记忆召回（作为额外上下文注入），每个回合之后的记忆存储。
- **安装两种方式：** 作为来自 Hindsight 市场的 ZCode 插件（无 pip），或使用 `hindsight-zcode` CLI 安装程序。
- **一个记忆库，多种工具：**相同的Hindsight记忆库为Claude Code和Cursor提供动力，因此记忆在智能体和机器之间跟随您。
- **零运行时依赖：** 挂钩脚本是纯Python 标准库。

## 为什么是钩子，而不是MCP {#why-hooks-not-mcp}

大多数记忆集成通过模型上下文协议附加：您与智能体一起运行服务器并将记忆公开为模型可以调用的工具。这是可行的，但它又是一个需要管理的过程，并且它将记忆置于模型手中，而不是使其自动化。

ZCode 为我们提供了一条更清晰的路径。因为它嵌入了 Claude Code 智能体运行时，所以它仅从位于 `~/.zcode/cli/config.json` 的其自己的配置命名空间读取标准 Claude Code挂钩架构。 Hindsight 使用它在生命周期级别连接记忆：记忆召回和记忆存储在每个回合中自动发生，没有任何东西与 ZCode 一起运行。钩子脚本是纯Python标准库，因此不需要安装运行时依赖项，也不需要保持更新。

## 设置 {#setup}

首先，拿到钥匙。 [免费注册Hindsight Cloud](https://ui.hindsight.vectorize.io) 所以没有守护进程可以运行，或者如果您愿意的话可以自行托管（更多内容见下文）。

有两种安装方式，第一种根本不需要`pip`。

**作为 ZCode 插件。** 钩子在 Hindsight 市场中作为仅钩子插件提供，因此 ZCode 可以直接安装它们：

```
zcode plugins add-marketplace vectorize-io/hindsight
zcode plugins install hindsight-zcode
```

这样安装后，ZCode会自动注册钩子。为您的凭据提供环境变量（`HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN`）或位于`~/.hindsight/zcode.json`的小配置文件：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

**使用 CLI 安装程序。** 如果您更喜欢命令行安装，`hindsight-zcode` 软件包附带了一个一次性安装程序：

```bash
pip install hindsight-zcode
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

安装程序将钩子脚本复制到`~/.zcode/hooks/hindsight/`，将其条目合并到`~/.zcode/cli/config.json`（保留您已有的任何钩子）并将`hooks.enabled`翻转到`true`，并为您的个人配置添加种子`~/.hindsight/zcode.json`。它永远不会触及您在 `~/.claude/settings.json` 的真实 Claude Code配置。重新启动 ZCode，记忆就会生效。为了支持这一切，`hindsight-zcode uninstall` 仅删除 Hindsight 的条目，并保留其他所有内容。

## 它是如何工作的 {#how-it-works}

ZCode 触发三个钩子事件，Hindsight 将一个作业映射到每个事件上：

|钩子|活动|它的作用|
|------|-------|--------------|
|`session_start.py`|`SessionStart`|确认 Hindsight 可达并预热本地守护进程（如果您是自托管）|
|`recall.py`|`UserPromptSubmit`|查询您的记忆库中的相关记忆并将其作为上下文注入，然后隐藏提示|
|`retain.py`|`Stop`|将提示与助手的回复配对并存储回合|

在`UserPromptSubmit`，记忆召回钩子读取您的提示，搜索您的Hindsight记忆库，并在回合到达模型之前发出 ZCode 注入的上下文块。它显示为模型可以看到的附加上下文，而不是文本中的混乱：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg, not SQLAlchemy [world]
- Preferred testing framework: pytest with pytest-asyncio [experience]
</hindsight_memories>
```

在`Stop`，记忆存储挂钩获取它存储的提示，将其与响应配对，并将轮次发布到Hindsight。这里有一个值得了解的小设计细节：ZCode 没有 `SessionEnd` 事件，因此保留乘坐 `Stop` 代替。每个回合在完成时都会被存储，每个回合都有自己的记忆，而不是在会话结束时批量存储。实际上，这意味着如果您突然关闭应用程序，不会丢失任何内容。

## 让这一切与众不同的部分：一个记忆，多种工具 {#the-part-that-makes-this-different-one-memory-many-tools}

这就是 ZCode 加上 Hindsight 超越“记忆的智能体”的地方。记忆不属于ZCode。它属于 Hindsight 记忆库，而同一个记忆库是 Claude Code和 Cursor 通过自己的 Hindsight 集成读取和写入的内容。

想象一下正常的一周。您与 GLM 一起使用 ZCode，并告诉它您的团队仅在紧急情况下在周五进行部署。两天后，你在Cursor完成一个功能，并且Cursor已经知道部署规则，因为它来自同一个记忆库。在家里的笔记本电脑上切换到Claude Code，项目的约定也在那里。智能体发生变化；记忆则不然。

这工作得非常干净，因为 ZCode 嵌入了 Claude Code运行时并采用相同的钩子模式。除了将工具指向同一个记忆库（这是默认设置）之外，没有什么需要特殊配置来获得共享行为。

## 每个项目记忆 {#per-project-memory}

默认情况下，每个 ZCode 会话共享一个记忆库，名为 `zcode`。这是个人喜好和跨项目习惯的正确选择。当您希望项目的记忆保持独立时，请打开动态记忆库 ID：

```json
{
  "dynamicBankId": true
}
```

通过该集合，Hindsight为每个工作目录派生出一个独特的记忆库，因此一个存储库的决策永远不会渗透到另一个存储库中。如果您想了解一个共享记忆库和多个范围记忆库之间的权衡，我们在 [构建智能体记忆](/blog/2026/07/16/bank-strategy-agent-memory) 上编写了一份完整的现场指南。

## 云或自托管 {#cloud-or-self-hosted}

推荐路径是Hindsight Cloud：将API URL和令牌放入`~/.hindsight/zcode.json`即可完成。如果您希望将所有内容保留在本地，请运行 `hindsight-embed` 守护进程并将 `hindsightApiUrl` 留空。 `session_start.py` 钩子在端口 `9077` 上检测到它：

```bash
uvx hindsight-embed
```

守护进程不会为您启动，因此在打开 ZCode 之前单独启动它。

## 它补充了ZCode的内置记忆 {#it-complements-zcodes-built-in-memory}

ZCode 已经在 `~/.zcode/cli/memories/` 下提供了本地的、每个项目的记忆。 Hindsight 不取代它；它填补了一个不同的空白。 ZCode 的内置存储位于一台机器上的一个项目的本地。 Hindsight 记忆库是一个跨工具和机器的共享、云或自托管存储，因此您的上下文会跟随您从 ZCode 到 Claude Code到 Cursor，从工作笔记本电脑到家庭台式机。使用两者：本地存储用于项目从头开始，Hindsight用于您想要无处不在的记忆。

## 常见问题 {#frequently-asked-questions}

**这会取代ZCode的内置记忆吗？**
没有。 ZCode 的内置存储保留在一台计算机上的一个项目的本地。 Hindsight 添加了跨工具和机器的共享、云或自托管记忆库。运行两者。

**需要MCP服务器吗？**
没有。集成是简单的 Python 钩子脚本，调用 Hindsight 的 REST API，因此没有任何东西与 ZCode 一起运行。

**哪些工具共享记忆？**
任何指向同一个Hindsight记忆库的工具。 ZCode、Claude Code 和Cursor 都对其进行读取和写入，因此您在其中一个中教授的事实会在其他中被回忆起来。

**可以离线使用吗？**
是的。在本地运行 `hindsight-embed` 守护进程，将 `hindsightApiUrl` 留空，挂钩通过端口 `9077` 连接到它。没有任何东西离开你的机器。

**它会减慢ZCode吗？**
记忆召回在每个提示之前运行一次，记忆存储在每个回合之后运行一次。钩子脚本是纯标准库，没有运行时依赖性，因此开销是每轮一次轻量级 API 调用。

## 尝试一下 {#try-it}

如果您已经使用 ZCode，感受差异的最快方法是安装钩子，进行一个会话，然后第二天开始一个新的会话，然后看着它从您上次停下的地方继续。 [获取免费的Hindsight Cloud密钥](https://ui.hindsight.vectorize.io)，添加市场，并安装插件。

## 进一步阅读 {#further-reading}

- [ZCode集成参考](/sdks/integrations/zcode)：每个配置选项都集中在一处。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：跨智能体共享记忆库的案例。
- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：每次 ZCode 保留回合时Hindsight实际存储的内容。
