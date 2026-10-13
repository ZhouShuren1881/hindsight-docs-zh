---
title: "在Windows上构建一个记住您的代码库的Hermes编码助手"
authors: [benfrank241]
slug: "2026/06/01/hermes-hindsight-windows"
date: 2026-06-01T12:00
tags: [hermes, windows, coding, memory, agents, tutorial, hindsight]
description: "Nous Research 刚刚宣布Hermes 智能体原生于 Windows。以下是如何使用 Hindsight 添加持久代码库记忆 — 没有 Docker，没有 WSL，PowerShell 从始至终。"
image: /img/blog/hermes-hindsight-windows.webp
hide_table_of_contents: true
---

![Hermes Windows 上的智能体与 Hindsight](/img/blog/hermes-hindsight-windows.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

昨天，Nous Research[宣布Hermes智能体现已在Windows上原生支持](https://x.com/NousResearch/status/2061236625925886252)。以下是如何赋予它持久的代码库记忆。

如果 Windows 是您的日常驱动程序，那么差距是真实存在的 — WSL 解决方法、仅限 Mac 的二进制文件、假设 `bash` 的嵌入式数据库。 Hermes 刚刚缩小了该间隙的一侧。 Hindsight 关闭记忆侧。

​​[Hermes智能体](https://github.com/NousResearch/hermes-agent) 和 Hindsight 在 Windows 上本机运行。没有Docker。没有 WSL。 PowerShell 从头到尾。嵌入式 PostgreSQL 处理存储层，守护进程作为正常的 Windows 进程生成，并且您的代码库记忆在会话之间复合，就像在每个其他平台上一样。

这篇文章是Windows特定于[构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)的姊妹篇。相同的工作流程，相同的复合记忆 - 不同的设置步骤。

在 Hindsight 方面，我们几周来一直在验证 Windows 路径：[每日Windows烟雾测试](https://github.com/vectorize-io/hindsight/tree/v0.10.3/.github/workflows/windows-smoke.yml) 每天早上 06:00 UTC 在 `windows-latest` 上运行完整的 API + 嵌入式 Postgres + Python 客户端堆栈。现在 Hermes 也是原生的，这对组合已经准备好了。

<!-- truncate -->

---

## 你在Windows上得到什么 {#what-you-get-on-windows}

完整的Hermes + Hindsight 功能集，原生：

- **三种部署模式** — 在设置向导中选择云、本地嵌入式或本地外部。没有 Docker，没有 WSL，没有单独的 PostgreSQL 安装。 Local Embedded 附带 `pg0`（嵌入式 Postgres 发行版）；第一次启动会解压二进制文件并运行`initdb`，后续启动速度很快。
- **自动记忆召回和自动记忆存储** — 每个编码会话都从注入到Hermes上下文中的相关记忆开始，并且每个会话都会保留您在下一个会话中讨论的内容。
- **仅限本地选项** — 当您选择本地嵌入式时，您的记忆库位于计算机上的 `~/.hindsight/` 中。除非您将笔记本电脑指向 Hindsight Cloud，否则任何内容都不会离开笔记本电脑。

唯一的Windows特定问题是字符编码（更多内容见下文）。

---

## 单命令设置 {#one-command-setup}

没有Windows特定的安装舞蹈。来自 PowerShell：

```powershell
hermes memory setup
```

从提供商列表中选择**Hindsight**。然后向导会要求您选择一种模式：

```
Select mode
↑↓ navigate  ENTER/SPACE select  ESC cancel

→ (●) Cloud           Hindsight Cloud API (lightweight, just needs an API key)
  (○) Local Embedded  Run Hindsight locally (downloads ~200MB, needs LLM key)
  (○) Local External  Connect to an existing Hindsight instance
```

每种模式的要求：

- **云** — 来自 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 的 `hsk_...` token。默认的 API URL (`https://api.hindsight.vectorize.io`) 是正确的 - 只需接受它即可。
- **本地嵌入式** — 向导在本地下载并运行 Hindsight（首次安装时约 200MB，包括嵌入的 PostgreSQL 二进制文件）。系统将提示您输入 LLM 提供程序（OpenAI、Anthropic、Gemini、Groq、Ollama 等）、该提供程序的 API 密钥以及可选的模型覆盖。无需安装任何其他内容 - `uvx` 处理获取 `hindsight-embed`，并且守护进程会自动生成。
- **本地外部** — 将 Hermes 指向您已经运行的 Hindsight 实例（您自己的服务器、队友的服务器、自托管服务器）。提供 API URL，如果实例需要，还提供 API 密钥。

确认已接线：

```powershell
hermes memory status
```

您应该看到`provider: hindsight`和`status: ready`。在本地嵌入式上，首次启动需要 60-90 秒，而 pg0 解压 Postgres 并运行 `initdb`。

---

## Hermes 在您的Windows 项目中记住了什么 {#what-hermes-remembers-on-your-windows-project}

相同的发动机，相同的排气。在典型的编码会话后自动进入记忆的事实类型：

- `"项目使用 .NET 8，src/ 下所有新代码采用文件范围命名空间"`
- `"没有 LongPathsEnabled 注册表项时，PowerShell 部署脚本在长路径上失败"`
- `"3 月 N+1 事件后，从 EF Core 延迟加载切换为显式 Include() 链"`
- `"约定：异步控制器调用使用 ConfigureAwait(false)，不需要它的 Razor 页面除外"`

你不要告诉Hermes这些。写入管道从您的对话中提取它——您提出的问题、您描述的错误、您在此过程中做出的决定。

---

## 三个卓有成效的工作流程 {#three-workflows-where-it-pays-off}

### 开始新会话 {#starting-a-new-session}

如果没有记忆，复杂的Windows项目的每个会话都从上下文设置开始：.NET版本、SDK、哪些项目依赖于哪个、部署怪癖。在任何实际工作发生之前，你会燃烧 10 分钟。

使用Hermes + Hindsight，这些事实已经被注入。你以实际问题开始：

> “帮我调试 OrderService 中的超时。”

Hermes 已经了解项目的框架、异步处理的约定以及部署配置。第一条消息是真正的工作。

### 调试重复出现的Windows-特定问题 {#debugging-recurring-windows-specific-issues}

一些错误仅出现在Windows上——路径分隔符、行结尾、文件锁定、防病毒对构建输出的干扰。如果没有记忆，您将独立地重新诊断每一个。

有了记忆，当你描述一个闻起来很熟悉的新失败时，Hermes会回忆起之前的例子：

- `"Windows Defender 构建中扫描 obj/ 会使 MSBuild 间歇失败，已在 2026-03 添加排除项"`
- `"dotnet publish 文件锁错误通常因 visual-studio.exe 占用旧输出，关闭 VS 即可解除"`

这些是您永远不会在调试会话开始时粘贴的事实。在适当的时候回忆起来，它们可以节省最多的时间。

### 让队友加入您的Windows项目 {#onboarding-a-teammate-to-your-windows-project}

如果队友加入并且您共享记忆库ID，他们会立即继承您积累的上下文。他们查询 Hermes 来了解它所知道的内容：

```
What do you know about the build pipeline?
```

```
What quirks have come up with the Authentication service on Windows?
```

答案来自您过去的会议 - 包括从未纳入自述文件中的Windows特定问题。

---

## 你应该选择哪种模式？ {#which-mode-should-you-pick}

快速决策树：

- **独立开发，想要零操作：** 云。一个 API 键，无需考虑守护进程，可从您登录的任何机器访问记忆。
- **独立开发，代码库敏感或离线大量：** 本地嵌入。 记忆库保留在您的机器上，适用于航班和气隙网络（您仍然需要网络来进行 LLM 呼叫本身）。
- **具有共享Hindsight服务器的团队：** 本地外部。将每个开发人员的Hermes指向同一个Hindsight实例并共享一个记忆库ID——机构代码库知识在整个团队中积累。

Hindsight v0.5.5版本添加了[原生Windows 支持嵌入模式](/blog/2026/04/28/version-0-5-5)，后续的每个版本都在Windows上进行了验证。 [v0.4.21 原生 Windows 帖子](/blog/2026/03/30/version-0-4-21) 具有在没有 Docker 的情况下运行的原始演练。

---

## 常见Windows陷阱 {#common-windows-gotchas}

从Windows CI 运行和用户报告中提炼出一些需要注意的事项：

- **UTF-8编码** — Hermes 和 Hindsight 日志状态，带有复选标记和方框图字符 (✓, ─, │)，导致 Windows 的默认 `cp1252` 编解码器崩溃。如果您在首次运行时看到 `UnicodeEncodeError`，请在 PowerShell 配置文件中设置 `PYTHONUTF8=1` 和 `PYTHONIOENCODING=utf-8`。出于相同的原因，Hindsight Windows CI 在每次运行时都会设置两者。
- **首次启动Postgres初始化时间**（仅限本地嵌入式）— 在冷 Windows 机器上需要 60-90 秒，同时 `pg0` 解压 Postgres 并运行 `initdb`。原木降落在`~/.hindsight/profiles/<profile>.log`。
- **长文件路径** — 如果您的项目位于树深处，请在注册表中启用 `LongPathsEnabled`。 Hindsight 本身保持在 260 个字符的限制之下，但某些 Python 轮安装则不然。
- **守护进程上的防病毒** — Windows Defender 有时会在首次解压时标记嵌入的 Postgres 二进制文件。如果遇到启动缓慢或隔离警告，请将 `~/.hindsight/` 添加到排除列表中。

---

## 使用的时间越长，解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

与任何其他平台相同的回报。第一节，Hermes 对您的 Windows 项目一无所知。第五节，它了解框架、约定和构建管道。第 30 节，它知道 Windows 特定的怪癖，这些怪癖从未被记录下来，但总是让新的贡献者绊倒。

Hermes 刚刚发货原生Windows。 Hindsight已经在那里了。将它们连接在一起，您的代码库记忆就会在您已经使用的平台上复合。

使用`hermes memory setup`进行设置，或从[Hindsight Windows 安装指南](https://hindsight.vectorize.io/developer/installation#windows)开始。

---

**进一步阅读：**
- [构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 这篇文章的平台无关版本
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
- [Hindsight v0.4.21 — 原生Windows 支持](/blog/2026/03/30/version-0-4-21) — 原始 Windows 版本
- [Hindsight v0.5.5 — Windows 嵌入式模式完善](/blog/2026/04/28/version-0-5-5) — Windows 上的本地 pg0
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全景观比较
