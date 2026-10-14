---
title: "在 Windows 上构建能记住代码库的 Hermes 编程助手"
authors: [benfrank241]
slug: "2026/06/01/hermes-hindsight-windows"
date: 2026-06-01T12:00
tags: [hermes, windows, coding, memory, agents, tutorial, hindsight]
description: "Nous Research 刚刚宣布 Hermes Agent 已原生支持 Windows。下面介绍如何使用 Hindsight 为它添加持久的代码库记忆：无需 Docker 或 WSL，全程使用 PowerShell。"
image: /img/blog/hermes-hindsight-windows.webp
hide_table_of_contents: true
---

![运行在 Windows 上并接入 Hindsight 的 Hermes Agent](/img/blog/hermes-hindsight-windows.webp)

:::info 本文发布后，设置方式已有变化
Hindsight 不再随 Hermes 一同打包。Nous Research 已将所有记忆提供方移出 Hermes 核心代码树，因此新安装现在需要先运行 `hermes plugins install hindsight`，再运行 `hermes memory setup`。现有安装会自动迁移。详情请参阅[成为 Hermes 插件后，Hindsight 有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

昨天，Nous Research [宣布 Hermes Agent 现已原生支持 Windows](https://x.com/NousResearch/status/2061236625925886252)。下面介绍如何为它添加持久的代码库记忆。

如果 Windows 是你日常使用的平台，你一定感受过这种缺口：需要借助 WSL 绕行、二进制文件只支持 Mac、嵌入式数据库还假定你使用 `bash`。Hermes 刚刚补上了 Windows 支持这一侧，Hindsight 则补上了记忆这一侧。

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 与 Hindsight 可以原生运行在 Windows 上。无需 Docker，也无需 WSL，全程使用 PowerShell。嵌入式 PostgreSQL 负责存储，守护进程作为普通 Windows 进程启动，代码库记忆会像在其他平台上一样，在不同会话间不断积累。

本文是[构建能记住代码库的 Hermes 编程助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)的 Windows 专题篇。工作流程和不断积累的记忆都相同，区别在于设置步骤。

在 Hindsight 方面，我们已经连续数周验证 Windows 运行路径：[每日 Windows 冒烟测试](https://github.com/vectorize-io/hindsight/blob/main/.github/workflows/windows-smoke.yml)每天早上 06:00 UTC 都会在 `windows-latest` 上运行完整的 API、嵌入式 Postgres 和 Python 客户端堆栈。如今 Hermes 也已原生支持 Windows，两者开箱即可配合使用。

<!-- truncate -->

---

## 在 Windows 上可以获得什么 {#what-you-get-on-windows}

Hermes + Hindsight 的完整功能集都能原生运行：

- **三种部署模式**：在设置向导中选择 Cloud、Local Embedded 或 Local External。无需 Docker、WSL，也无需单独安装 PostgreSQL。Local Embedded 内置 `pg0`（一种嵌入式 Postgres 发行版）；首次启动时会解包二进制文件并运行 `initdb`，之后启动会很快。
- **自动召回和自动存入**：每次编码会话开始时，相关记忆都会注入 Hermes 的上下文；每次会话也会存入你讨论的内容，供下一次会话使用。
- **仅在本机运行的选项**：选择 Local Embedded 后，记忆库会保存在你机器的 `~/.hindsight/` 目录中。除非你将其指向 Hindsight Cloud，否则任何内容都不会离开你的笔记本电脑。

Windows 特有的注意事项只有字符编码（下文详述）。

---

## 一条命令完成设置 {#one-command-setup}

Windows 上无需特殊的安装流程。在 PowerShell 中运行：

```powershell
hermes memory setup
```

在提供方列表中选择 **hindsight**。随后向导会让你选择运行模式：

```
Select mode
↑↓ navigate  ENTER/SPACE select  ESC cancel

→ (●) Cloud           Hindsight Cloud API (lightweight, just needs an API key)
  (○) Local Embedded  Run Hindsight locally (downloads ~200MB, needs LLM key)
  (○) Local External  Connect to an existing Hindsight instance
```

各模式需要提供的信息如下：

- **Cloud**：提供从 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取的 `hsk_...` token。默认 API URL（`https://api.hindsight.vectorize.io`）是正确的，直接接受即可。
- **Local Embedded**：向导会在本地下载并运行 Hindsight（首次安装约需下载 200MB，其中包括嵌入式 PostgreSQL 二进制文件）。系统会提示你选择 LLM 服务提供方（OpenAI、Anthropic、Gemini、Groq、Ollama 等），输入该提供方的 API 密钥，并可选择指定模型覆盖项。无需另行安装；`uvx` 会负责获取 `hindsight-embed`，守护进程也会自动启动。
- **Local External**：让 Hermes 连接到已在运行的 Hindsight 实例（可以是你自己的服务器、队友的服务器或自托管主机）。填写 API URL；如果该实例需要 API 密钥，也要一并提供。

检查是否已连接成功：

```powershell
hermes memory status
```

你应该会看到 `provider: hindsight` 和 `status: ready`。Local Embedded 首次启动需要 60–90 秒，因为 `pg0` 要先解包 Postgres 并运行 `initdb`。

---

## Hermes 会记住 Windows 项目中的哪些内容 {#what-hermes-remembers-on-your-windows-project}

底层引擎和信息提取方式都相同。典型编码会话结束后自动存入记忆的事实包括：

- `"Project targets .NET 8, all new code under src/ uses file-scoped namespaces"`
- `"PowerShell deployment script fails on long file paths without the LongPathsEnabled registry key"`
- `"We switched from EF Core lazy loading to explicit Include() chains after the N+1 incident in March"`
- `"Convention: all async controllers wrap calls in ConfigureAwait(false) — except Razor pages, which don't need it"`

你无需逐条告诉 Hermes 这些信息。写入流程会从对话中提取它们，包括你提出的问题、描述的故障，以及过程中作出的决定。

---

## 三种能派上用场的工作流程 {#three-workflows-where-it-pays-off}

### 开始新会话 {#starting-a-new-session}

没有记忆时，每次处理复杂的 Windows 项目都要先补充上下文：.NET 版本、SDK、项目之间的依赖关系和部署方面的特殊情况。真正开始工作之前，你可能已经花了 10 分钟。

有了 Hermes + Hindsight，这些信息已经注入上下文。你可以直接提出实际问题：

> “Help me debug this timeout in the OrderService.”

Hermes 已经了解项目使用的框架、异步处理约定和部署配置。第一条消息就能进入实际工作。

### 调试反复出现的 Windows 特有问题 {#debugging-recurring-windows-specific-issues}

有些故障只会在 Windows 上出现，例如路径分隔符、换行符、文件锁，以及防病毒软件对构建输出的干扰。没有记忆时，每次都得重新独立诊断。

有了记忆，当你描述一个似曾相识的新故障时，Hermes 会召回之前的相关情况：

- `"MSBuild fails intermittently when Windows Defender real-time protection scans the obj/ directory mid-build — added an exclusion in 2026-03"`
- `"File lock errors on dotnet publish are usually visual-studio.exe still holding the previous output — closing VS clears it"`

这些事实你绝不会在调试会话开始时主动贴出来，但在合适的时候召回它们，最能节省时间。

### 帮队友熟悉你的 Windows 项目 {#onboarding-a-teammate-to-your-windows-project}

队友加入后，只要你与其共享一个记忆库 ID，对方就能立即获得你积累的上下文。他们可以向 Hermes 查询已知信息：

```
What do you know about the build pipeline?
```

```
What quirks have come up with the Authentication service on Windows?
```

回答来自你过去的会话，其中也包括那些从未写进 README 的 Windows 特有问题。

---

## 应该选择哪种模式？ {#which-mode-should-you-pick}

可以按下面的思路快速选择：

- **个人开发者，希望省去运维**：选择 Cloud。只需一个 API 密钥，无需操心守护进程；你登录的任何设备都能访问记忆。
- **个人开发者，代码库需要保密或经常离线**：选择 Local Embedded。记忆库留在自己的机器上，乘飞机或在隔离网络中也能使用（但调用 LLM 本身仍然需要联网）。
- **团队已有共享的 Hindsight 服务器**：选择 Local External。让每位开发者的 Hermes 连接到同一个 Hindsight 实例，并共享一个记忆库 ID，团队的代码库知识便会不断积累。

Hindsight v0.5.5 增加了[嵌入式模式的原生 Windows 支持](/blog/2026/04/28/version-0-5-5)，之后的每个版本也都经过了 Windows 验证。[v0.4.21 原生 Windows 版本介绍](/blog/2026/03/30/version-0-4-21)提供了无需 Docker 的最初操作指南。

---

## Windows 上常见的注意事项 {#common-windows-gotchas}

以下注意事项整理自 Windows CI 运行记录和用户反馈：

- **UTF-8 编码**：Hermes 和 Hindsight 会使用勾号和制表图形字符（✓、─、│）记录状态；Windows 默认的 `cp1252` 编码器无法处理这些字符，可能导致程序崩溃。如果首次运行时遇到 `UnicodeEncodeError`，请在 PowerShell 配置文件中设置 `PYTHONUTF8=1` 和 `PYTHONIOENCODING=utf-8`。Hindsight Windows CI 的每次运行都会设置这两个值，原因相同。
- **Postgres 首次启动初始化时间**（仅 Local Embedded）：在未预热的 Windows 机器上，`pg0` 解包 Postgres 并运行 `initdb` 需要 60–90 秒。日志位于 `~/.hindsight/profiles/<profile>.log`。
- **长文件路径**：如果项目目录层级较深，请在注册表中启用 `LongPathsEnabled`。Hindsight 自身的路径不会超过 260 个字符的限制，但部分 Python wheel 安装过程会超过限制。
- **守护进程受到防病毒软件干扰**：Windows Defender 有时会在首次解包时将嵌入式 Postgres 二进制文件标记为威胁。如果启动缓慢或收到隔离警告，请将 `~/.hindsight/` 添加到排除列表。

---

## 用得越久，需要解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

无论在哪个平台，长期使用都会带来同样的好处。第一次会话时，Hermes 对你的 Windows 项目一无所知。到第五次会话时，它已经了解框架、约定和构建流程。到第三十次会话时，它还会记住那些从未写成文档、却总让新贡献者踩坑的 Windows 特有情况。

Hermes 刚刚推出了原生 Windows 支持，Hindsight 早已支持 Windows。将两者结合起来，你的代码库记忆就会在你日常使用的平台上持续积累。

运行 `hermes memory setup` 完成设置，或从 [Hindsight Windows 安装指南](https://hindsight.vectorize.io/developer/installation#windows)开始。

---

**延伸阅读：**
- [构建能记住代码库的 Hermes 编程助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)：本文的平台无关版本
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)：基础概念介绍
- [Hindsight v0.4.21：原生 Windows 支持](/blog/2026/03/30/version-0-4-21)：最初的 Windows 版本
- [Hindsight v0.5.5：打磨 Windows 嵌入式模式](/blog/2026/04/28/version-0-5-5)：在 Windows 上本地运行 pg0
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)：完整的行业对比
---
