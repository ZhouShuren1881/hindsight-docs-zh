---
title: "Hermes Windows 上的智能体：使用 Hindsight 设置持久记忆"
authors: [benfrank241]
slug: "2026/06/01/hermes-hindsight-windows-setup"
date: 2026-06-01T18:00
tags: [hermes, windows, memory, agents, tutorial, hindsight]
description: "Nous Research 已在 Windows 上发布 Hermes 智能体。使用 Hindsight 为它提供持久记忆：一条命令、三种模式，无需 Docker 或 WSL。"
image: /img/blog/hermes-hindsight-windows-setup.webp
hide_table_of_contents: true
---

![Hermes Windows 上的智能体与 Hindsight](/img/blog/hermes-hindsight-windows-setup.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

本周早些时候，Nous Research [宣布Hermes智能体现已在Windows上原生支持](https://x.com/NousResearch/status/2061236625925886252)。以下是如何赋予它持久的记忆。

[Hermes智能体](https://github.com/NousResearch/hermes-agent) 是一款自我改进的助手，拥有 40 多种工具 - 聊天、研究、语音、网关集成到 Telegram、Discord、Slack 等。开箱即用，每次对话都从零开始：Hermes 不记得你昨天讨论了什么，你正在计划什么项目，或者你已经分享了哪些偏好。 Hindsight 缩小了这一差距。配置完成后，Hermes会在每次回复之前回忆相关事实，并在之后保留对话——跨会话、跨平台、跨重新启动。

这篇文章是平台中立的Windows指南。如果您特别想要一个具有代码库记忆功能的编码助手，请参阅[Hermes Windows 上的编码助手](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows)同伴。

<!-- truncate -->

---

## 你在Windows上得到什么 {#what-you-get-on-windows}

完整的Hermes + Hindsight 功能集，原生：

- **三种部署模式** — 在设置向导中选择云、本地嵌入式或本地外部。没有 Docker，没有 WSL，没有单独的 PostgreSQL 安装。 Local Embedded 附带 `pg0`（嵌入式 Postgres 发行版）；第一次启动会解压二进制文件并运行`initdb`，后续启动速度很快。
- **自动记忆召回和自动记忆存储** — 每个对话都以相关记忆注入Hermes的上下文开始，并且每个对话都会保留您为下一个对话讨论的内容。
- **跨平台身份** — 如果您运行Hermes网关（Telegram、Discord、Slack），所有平台共享相同的记忆库。在 Telegram 中告诉 Hermes 一些事情，稍后再通过 Discord 询问，它就会记住。

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

## Hermes 记得什么 {#what-hermes-remembers}

经过几次对话，自动进入记忆的事实是：

- `"用户偏好公制单位和 24 小时制。"`
- `"计划 8 月去怀俄明州露营，六人同行，采用帐篷与小木屋结合的住宿。"`
- `"每周站会记录于美国东部时间下午 5 点发送到 Slack 的 #team-eng。"`
- `"用户写作简洁，避免感叹号，偏好长破折号。"`

你不会直接告诉Hermes任何这些。写入管道从您的对话中提取信息 - 您提出的问题、您做出的决定、您一路分享的上下文。

---

## 记忆得到回报的三个工作流程 {#three-workflows-where-memory-pays-off}

### 从上次停下的地方继续 {#picking-up-where-you-left-off}

如果没有记忆，每节课都会从重新解释开始。你昨天计划了一次旅行；今天你打开Hermes并说“让我们继续前进”——它不知道你的意思。

使用Hindsight，下一个会话将在实际延续中打开：

> “怀俄明州之旅第三天的行程我们在哪里着陆？”

Hermes 已经知道行程、团体规模、您讨论过的限制条件以及未解决的问题。第一条消息是实际工作，而不是设置。

### 跨平台与Hermes对话 {#talking-to-hermes-across-platforms}

Hermes 网关运行在 Telegram、Discord、Slack 和其他消息平台上。如果没有记忆，每个平台感觉就像一个不同的助手——你周一在 Telegram 中告诉 Hermes 一个事实，周三从 Discord 中询问，Discord 方 Hermes 耸耸肩。

与Hindsight，记忆库是共享的。该插件会钩住每个平台上的每一回合——您在一个频道中所说的任何内容都可以从任何其他频道中调用。一名助手，多种表面。

### 长期研究和写作 {#long-running-research-and-writing}

为期数周的项目——一次研究潜水、一份书籍大纲、一次求职——积累了数百个事实。如果没有记忆，你就会在每次会议中与智能体争夺背景：重新粘贴摘要，重新解释观众是谁，重新陈述三周前设置的限制。

通过记忆，你可以查询Hermes已经知道的内容：

```
What did we decide about the audience for the agent-memory ebook?
```

```
What's still open on the job hunt — which roles am I waiting to hear back on?
```

答案来自之前的会议 - 包括从未写入文档的小决定和旁注。

---

## 你应该选择哪种模式？ {#which-mode-should-you-pick}

快速决策树：

- **独奏，想要零操作：** 云。一个 API 键，无需考虑守护进程，可从您登录的任何机器访问记忆。
- **单人、隐私敏感或离线重度：** 本地嵌入。 记忆库保留在您的机器上，适用于航班和气隙网络（您仍然需要网络来进行 LLM 呼叫本身）。
- **具有共享Hindsight服务器的团队：** 本地外部。将每个用户的Hermes指向同一个Hindsight实例并共享记忆库ID——机构知识在整个团队中积累。

Hindsight v0.5.5版本添加了[原生Windows 支持嵌入模式](/blog/2026/04/28/version-0-5-5)，后续的每个版本都在Windows上进行了验证。 [v0.4.21 原生 Windows 帖子](/blog/2026/03/30/version-0-4-21) 具有在没有 Docker 的情况下运行的原始演练。

---

## 常见Windows陷阱 {#common-windows-gotchas}

从Windows CI 运行和用户报告中提炼出一些需要注意的事项：

- **UTF-8编码** — Hermes 和 Hindsight 记录带有复选标记和方框图字符 (✓, ─, │) 的状态，导致 Windows 的默认 `cp1252` 编解码器崩溃。如果您在首次运行时看到 `UnicodeEncodeError`，请在 PowerShell 配置文件中设置 `PYTHONUTF8=1` 和 `PYTHONIOENCODING=utf-8`。出于相同的原因，Hindsight [Windows冒烟测试](https://github.com/vectorize-io/hindsight/tree/v0.10.3/.github/workflows/windows-smoke.yml) 在每次运行时都会设置两者。
- **首次启动Postgres初始化时间**（仅限本地嵌入式）— 在冷 Windows 机器上需要 60-90 秒，同时 `pg0` 解压 Postgres 并运行 `initdb`。原木降落在`~/.hindsight/profiles/<profile>.log`。
- **长文件路径** — 如果您的主目录或工作区位于树深处，请在注册表中启用 `LongPathsEnabled`。 Hindsight 本身保持在 260 个字符的限制之下，但某些 Python 轮安装则不然。
- **守护进程上的防病毒** — Windows Defender 有时会在首次解压时标记嵌入的 Postgres 二进制文件。如果遇到启动缓慢或隔离警告，请将 `~/.hindsight/` 添加到排除列表中。

---

## 使用的时间越长，解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

第一节，Hermes对你一无所知。第五部分，它知道你喜欢的单位、你正在处理的项目、你生活中的人。第 30 节，它知道重复的任务、写作的声音、从未被记录下来但总是让新助手绊倒的小偏好。

Hermes 刚刚发货原生Windows。 Hindsight已经在那里了。将它们连接在一起，您的助手就能记住您已经使用的平台。

使用`hermes memory setup`进行设置，或从[Hindsight Windows 安装指南](https://hindsight.vectorize.io/developer/installation#windows)开始。

---

**进一步阅读：**
- [Hermes Windows 上的编码助手](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows) — 这篇文章的代码库-记忆伴侣
- [构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 与平台无关的编码版本
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
- [Hindsight v0.4.21 — 原生Windows 支持](/blog/2026/03/30/version-0-4-21) — 原始 Windows 版本
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全景观比较
