---
title: "在 Windows 上使用 Hermes Agent：借助 Hindsight 设置持久记忆"
authors: [benfrank241]
slug: "2026/06/01/hermes-hindsight-windows-setup"
date: 2026-06-01T18:00
tags: [hermes, windows, memory, agents, tutorial, hindsight]
description: "Nous Research 刚刚发布了原生支持 Windows 的 Hermes Agent。只需一条命令、三种模式，无需 Docker 或 WSL，即可用 Hindsight 为它添加持久记忆。"
image: /img/blog/hermes-hindsight-windows-setup.webp
hide_table_of_contents: true
---

![在 Windows 上运行的 Hermes Agent 与 Hindsight](/img/blog/hermes-hindsight-windows-setup.webp)

:::info 这篇文章发布后，设置方式已有变化
Hindsight 已不再与 Hermes 捆绑。Nous Research 已将所有记忆提供方移出 Hermes 核心代码树，因此新安装现在需要先运行 `hermes plugins install hindsight`，再运行
`hermes memory setup`。现有安装会自动迁移。请参阅[成为 Hermes 插件后，Hindsight 有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

本周早些时候，Nous Research [宣布 Hermes Agent 已原生支持 Windows](https://x.com/NousResearch/status/2061236625925886252)。下面介绍如何为它添加持久记忆。

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 是一款能够自我改进的助手，提供 40 多种工具，涵盖聊天、研究、语音以及 Telegram、Discord、Slack 等平台的网关集成。开箱即用时，每次对话都从零开始：Hermes 不会记得你昨天聊了什么、正在规划什么项目，也不记得你已经分享过哪些偏好。Hindsight 可以弥补这一缺口。完成配置后，Hermes 会在每次回复前召回相关事实，并在回复后存入本次对话中的内容；这些记忆可跨会话、跨平台、跨重启使用。

本文是适用于 Windows 的通用指南。如果你想要的是能够记住代码库内容的编程助手，请参阅配套文章 [在 Windows 上使用 Hermes 编程助手](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows)。

<!-- truncate -->

---

## 在 Windows 上可以获得什么 {#what-you-get-on-windows}

Hermes + Hindsight 的完整功能集都可原生运行：

- **三种部署模式** — 在设置向导中选择 Cloud、Local Embedded 或 Local External。无需 Docker、WSL 或单独安装 PostgreSQL。Local Embedded 随附 `pg0`（一种嵌入式 Postgres 发行版）；首次启动时会解压二进制文件并运行 `initdb`，之后启动会很快。
- **自动召回和自动存入** — 每次对话开始时，相关记忆都会注入 Hermes 的上下文；每次对话结束后，讨论内容都会存入记忆，供下一次对话使用。
- **跨平台身份** — 如果你运行 Hermes Gateway（Telegram、Discord、Slack），所有平台都会共享同一个记忆库。你可以在 Telegram 中告诉 Hermes 一件事，之后再通过 Discord 询问，它也能记得。

Windows 上唯一需要特别留意的是字符编码（下文详述）。

---

## 一条命令完成设置 {#one-command-setup}

Windows 上无需特殊的安装步骤。在 PowerShell 中运行：

```powershell
hermes memory setup
```

在提供方列表中选择 **hindsight**。随后，向导会让你选择一种模式：

```
Select mode
↑↓ navigate  ENTER/SPACE select  ESC cancel

→ (●) Cloud           Hindsight Cloud API (lightweight, just needs an API key)
  (○) Local Embedded  Run Hindsight locally (downloads ~200MB, needs LLM key)
  (○) Local External  Connect to an existing Hindsight instance
```

各模式需要提供的信息：

- **Cloud** — 你的 `hsk_...` token，获取地址为 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect)。默认 API URL（`https://api.hindsight.vectorize.io`）无需修改，直接确认即可。
- **Local Embedded** — 向导会在本地下载并运行 Hindsight（首次安装约 200MB，其中包括嵌入式 PostgreSQL 二进制文件）。系统会提示你选择 LLM 提供方（OpenAI、Anthropic、Gemini、Groq、Ollama 等），输入该提供方的 API 密钥，并可选地指定模型覆盖项。无需再安装其他内容：`uvx` 会负责获取 `hindsight-embed`，守护进程也会自动启动。
- **Local External** — 将 Hermes 指向一个已经运行的 Hindsight 实例（可以是你自己的服务器、队友的服务器或自托管服务器）。提供 API URL；如果该实例需要身份验证，也要提供 API 密钥。

确认连接正常：

```powershell
hermes memory status
```

你应该能看到 `provider: hindsight` 和 `status: ready`。Local Embedded 首次启动时，`pg0` 解压 Postgres 并运行 `initdb` 需要 60–90 秒。

---

## Hermes 会记住什么 {#what-hermes-remembers}

经过几次对话后，自动存入记忆的事实可能包括：

- `"User prefers metric units and 24-hour time."`
- `"Planning a camping trip to Wyoming in August — group of six, mix of tent and cabin."`
- `"Weekly standup notes go to #team-eng on Slack at 5 PM ET."`
- `"User's writing voice is concise, avoids exclamation points, and prefers em-dashes."`

你不必直接把这些信息告诉 Hermes。写入流程会从对话中提取信息，包括你提出的问题、做出的决定以及逐步分享的上下文。

---

## 记忆能发挥作用的三种工作流程 {#three-workflows-where-memory-pays-off}

### 接着上次的进度继续 {#picking-up-where-you-left-off}

没有记忆时，每次会话都得从重新解释开始。昨天你计划了一趟旅行；今天打开 Hermes，说“我们接着来”，它却完全不知道你指的是什么。

有了 Hindsight，下次会话就能直接接上之前的进度：

> “怀俄明之旅第三天的行程，我们最后是怎么定的？”

Hermes 已经知道这趟旅行、同行人数、你讨论过的限制条件以及尚未解决的问题。开场第一句话就能进入正事，无需重新铺垫。

### 跨平台与 Hermes 对话 {#talking-to-hermes-across-platforms}

Hermes Gateway 可在 Telegram、Discord、Slack 等消息平台上运行。没有记忆时，每个平台都像是不同的助手：你周一在 Telegram 上告诉 Hermes 一件事，周三从 Discord 询问，Discord 上的 Hermes 却一无所知。

有了 Hindsight，各平台共用同一个记忆库。该插件会在每个平台的每一轮对话中发挥作用：你在一个频道中说过的内容，都可以从其他频道召回。同一个助手，多个使用入口。

### 长期研究与写作 {#long-running-research-and-writing}

持续数周的项目——深入研究、撰写书籍大纲或求职——会积累数百条事实。没有记忆时，每次会话都得费力让智能体重新了解背景：再次粘贴概要、重新解释目标读者是谁、重申三周前设定的限制条件。

有了记忆，你可以直接查询 Hermes 已掌握的信息：

```
What did we decide about the audience for the agent-memory ebook?
```

```
What's still open on the job hunt — which roles am I waiting to hear back on?
```

答案来自之前的会话，其中包括那些从未写进文档的小决定和旁注。

---

## 应该选择哪种模式？ {#which-mode-should-you-pick}

可以按下面的快速决策树选择：

- **个人使用，希望完全免维护：** 选择 Cloud。只需一个 API 密钥，无需操心守护进程；你从任何设备登录都能访问记忆。
- **个人使用，重视隐私或经常离线：** 选择 Local Embedded。记忆库保存在你的设备上，乘机或处于隔离网络时也能使用（但调用 LLM 本身仍需要网络）。
- **团队共用 Hindsight 服务器：** 选择 Local External。让每位用户的 Hermes 都连接到同一个 Hindsight 实例，并共用一个记忆库 ID，这样团队的机构知识就能逐步积累。

Hindsight v0.5.5 增加了[嵌入式模式的原生 Windows 支持](/blog/2026/04/28/version-0-5-5)，此后的每个版本也都经过 Windows 验证。[v0.4.21 原生 Windows 文章](/blog/2026/03/30/version-0-4-21)介绍了最初如何在不使用 Docker 的情况下运行。

---

## Windows 上常见的问题 {#common-windows-gotchas}

下面列出了从 Windows CI 运行和用户反馈中总结出的几项注意事项：

- **UTF-8 编码** — Hermes 和 Hindsight 会使用勾号、制表框线字符（✓、─、│）记录状态；这些字符会导致 Windows 默认的 `cp1252` 编码器报错。如果首次运行时遇到 `UnicodeEncodeError`，请在 PowerShell 配置文件中设置 `PYTHONUTF8=1` 和 `PYTHONIOENCODING=utf-8`。出于同样的原因，Hindsight 的 [Windows 冒烟测试](https://github.com/vectorize-io/hindsight/blob/main/.github/workflows/windows-smoke.yml)会在每次运行时设置这两个变量。
- **Postgres 首次初始化耗时**（仅限 Local Embedded）— 在一台刚开始使用的 Windows 设备上，`pg0` 解压 Postgres 并运行 `initdb` 需要 60–90 秒。日志位于 `~/.hindsight/profiles/<profile>.log`。
- **文件路径过长** — 如果主目录或工作区的目录层级较深，请在注册表中启用 `LongPathsEnabled`。Hindsight 本身的路径不会超过 260 个字符，但某些 Python wheel 安装路径可能会超出限制。
- **守护进程被杀毒软件拦截** — Windows Defender 有时会在首次解压时将嵌入式 Postgres 二进制文件标记为威胁。如果启动很慢或出现隔离警告，请将 `~/.hindsight/` 添加到排除列表。

---

## 用得越久，需要解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

第一次会话时，Hermes 对你一无所知。到第五次会话，它会知道你偏好的单位、正在推进的项目以及你生活中的人。到第三十次会话，它会知道你经常要做的事、你的写作风格，以及那些从未记录下来、却总会让新助手犯错的小偏好。

Hermes 刚刚原生支持 Windows，Hindsight 早已在此可用。把两者连接起来，你常用的平台上的助手就有了记忆。

运行 `hermes memory setup` 即可开始设置，也可以先阅读 [Hindsight Windows 安装指南](https://hindsight.vectorize.io/developer/installation#windows)。

---

**延伸阅读：**
- [在 Windows 上使用 Hermes 编程助手](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows) — 本文的代码库记忆配套文章
- [构建能够记住代码库的 Hermes 编程助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 面向各种平台的编程助手版本
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基础概念介绍
- [Hindsight v0.4.21 — 原生支持 Windows](/blog/2026/03/30/version-0-4-21) — 最初发布的 Windows 版本
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全面比较

---
