---
title: "如何使用 Hindsight 为 OpenClaw 添加持久记忆"
authors: [benfrank241]
date: 2026-03-06T12:00
tags: [openclaw, memory, agents, persistent-memory, knowledge-graph, tutorial]
image: /img/blog/adding-memory-to-openclaw-with-hindsight.webp
hide_table_of_contents: true
description: "OpenClaw 只会记住智能体主动选择保存的内容。Hindsight 插件会保存每段对话，并在每次回复前召回相关上下文。"
---

OpenClaw 的内置记忆依赖智能体自行决定要保存什么，而模型并不能始终如一地做好这件事。[Hindsight](https://github.com/vectorize-io/hindsight) 通过自动提取和自动召回取代这套机制：每段对话都会被捕获，事实和实体会在后台提取，并且每次响应前都会自动注入相关上下文。只需安装一个插件、运行一次设置向导，无需 Docker。

<!-- truncate -->

## 概览 {#tldr}

- OpenClaw 的内置记忆以文件为基础：磁盘上的 Markdown 文件加上 SQLite 向量搜索。它能正常工作，但必须由智能体决定记住什么。Hindsight 会自动完成整条处理流程。
- Hindsight 是开源软件，默认在本地运行。除非您另行选择，否则对话、提取出的知识和记忆存储都不会离开您的设备。
- 安装一个插件，运行一次设置向导。您可以选择 Cloud、External API 或嵌入式守护进程模式。
- 每次响应前，记忆都会自动注入上下文，无需调用工具，也无需编写检索逻辑。
- 对于团队，Cloud 或 External API 模式可将多个 OpenClaw 实例连接到同一台 Hindsight 服务器，让它们共享记忆。

## 问题 {#the-problem}

OpenClaw 是一款常驻运行的 AI 助手，可在 WhatsApp、Telegram、Slack、Discord、iMessage 等消息应用中使用。它连接到 LLM，代表您执行任务，并通过您日常使用的渠道与您通信。

OpenClaw 内置了记忆功能，设计也很周到。系统使用磁盘上的纯 Markdown 文件：`memory/YYYY-MM-DD.md` 中的每日笔记用于保存会话级上下文，经过整理的 `MEMORY.md` 则用于保存长期知识。基于 SQLite 的向量索引（使用 `sqlite-vec`）可对这些文件进行语义搜索；此外还有一个实验性的 QMD 后端，将 BM25 关键词搜索与向量检索结合起来。

但这里有一个根本限制：**智能体必须自行决定要记住什么**。文档对此直言不讳：“如果你想让某件事留下来，就让机器人把它写下来。”记忆是只能追加的文本，必须由模型明确选择保存。今天和昨天的每日笔记会在会话开始时自动加载；更早的内容则需要智能体主动使用 `memory_search` 工具搜索。

实际使用中，这意味着：

- 模型没想到要记下来的重要事实可能就此遗漏。
- 记忆质量取决于 LLM 遵循自身指令、持久保存信息的能力。
- 每日笔记不断累积后，要找到合适的上下文，就需要智能体在正确的时间用合适的查询进行搜索；而模型并不能始终如一地做到这一点。

对于 OpenClaw 用户，还有一个特别重要的数据问题。OpenClaw 在*您的*设备上运行，并与*您的*消息应用通信。人们期待它以本地为先，默认保护隐私。任何将对话经由第三方云服务传输的记忆方案，都会破坏这种模式。

## 方案 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight) 是一款开源记忆引擎，通过自动化的结构化知识提取取代 OpenClaw 的记忆层。它与内置系统的主要区别如下：

**自动捕获，而非手动保存。** 每轮结束后都会捕获对话，无需智能体判断哪些内容值得记住。Hindsight 在后台提取事实、实体和关系，无需提示模型“把这个保存下来”。

**结构化知识，而非扁平文本。** Hindsight 不会在 Markdown 文件末尾追加文本，而是提取独立事实（例如“生产数据库运行在 5433 端口”），追踪实体（人员、服务和项目），并梳理它们之间的关系（例如“身份验证服务依赖 Redis 来管理会话”）。

**自动召回，而非基于工具的检索。** OpenClaw 的内置记忆提供了智能体可以调用的 `memory_search` 工具，但模型并不能始终如一地使用搜索工具。Hindsight 完全绕过了这一环节：每次智能体响应*之前*，都会把相关记忆注入上下文。智能体无需知道记忆系统的存在。

**防止反馈循环。** 响应前注入上下文的记忆会成为对话的一部分。如果处理不当，这些注入的记忆会再次被存储并提取为新事实，导致内容指数级增长并产生重复。插件会在存入记忆前自动移除自身的 `<hindsight_memories>` 标签，从而避免这种循环。

**本地优先，开源。** Hindsight 通过 `hindsight-embed` 运行。这是一个守护进程，会将记忆 API 和 PostgreSQL 实例打包在一起，作为单个进程运行于您的设备上。数据不会离开您的环境，整个代码库也都是开源的。

```
┌─────────────────┐       ┌────────────────────────────────┐
│    OpenClaw      │       │    hindsight-embed daemon      │
│    Gateway       │──────▶│    ┌──────────┐ ┌───────────┐ │
│                  │◀──────│    │ Memory   │ │PostgreSQL │ │
│ WhatsApp/Slack/  │       │    │ API      │─│(embedded) │ │
│ Telegram/...     │       │    └──────────┘ └───────────┘ │
└─────────────────┘       └────────────────────────────────┘
                            runs locally · port 9077
```

## 实施 {#implementation}

### 第 1 步：安装插件 {#step-1-install-the-plugin}

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

您应看到安装确认，以及 Hindsight 接管记忆插槽的提示：

```
Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw".
Installed plugin: hindsight-openclaw
```

### 第 2 步：运行设置向导 {#step-2-run-the-setup-wizard}

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会引导您选择以下三种模式之一：

- **Cloud**：使用由 Hindsight 托管的服务，地址为 `https://api.hindsight.vectorize.io`。根据提示粘贴您的 [Cloud API 令牌](https://ui.hindsight.vectorize.io)。无需本地设置，这是最快的方式。
- **External API**：连接到您自行运行的 Hindsight 部署。向导会询问 URL，并可选询问令牌。
- **嵌入式守护进程**：在这台设备上启动本地 `hindsight-embed` 守护进程。向导会询问 LLM 服务提供方和 API 密钥。

从智能体的角度看，这三种模式是等效的：无论选择哪种模式，自动捕获和自动召回的工作方式都相同。Cloud 是最容易上手的选择；如果您需要所有内容都留在设备上，嵌入式模式更合适。

您也可以在 CI 或脚本化设置中以非交互方式运行向导：

```bash
# Cloud
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

# 使用 OpenAI 的嵌入式模式
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key sk-...

# 使用 Claude Code 的嵌入式模式（通过 Claude Code CLI 进行身份验证，无需单独的 API 密钥）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider claude-code
```

此处配置的 LLM **仅用于记忆提取**（后台处理）。您的 OpenClaw 主智能体使用哪个模型，由您另行配置。

### 第 3 步：启动 {#step-3-launch}

```bash
openclaw gateway
```

插件会连接到您配置的后端（Cloud、外部 API 或本地守护进程）。您应在网关输出中看到确认信息：

```
[Hindsight] ✓ Using provider: openai, model: gpt-4o-mini
```

设置到此完成。

### 验证是否正常运行 {#verifying-its-working}

进行几轮对话后，检查网关日志，确认记忆操作正在执行：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

您应能看到类似以下的日志：

```
[Hindsight] Retained X messages for session ...
[Hindsight] Auto-recall: Injecting X memories
```

如果想浏览智能体已经学到的内容，可以使用 Hindsight 守护进程附带的 Web UI（仅嵌入式模式提供）：

```bash
uvx hindsight-embed@latest -p openclaw ui
```

### External API 模式：在多个实例间共享记忆 {#external-api-mode-shared-memory-across-instances}

如果您运行着多个 OpenClaw 实例（例如，笔记本电脑和服务器上各一个），或者团队需要共享智能体记忆，可以连接到共享的 Hindsight API 服务器，而不是运行本地守护进程。

设置向导（`--mode api` 或 `--mode cloud`）会以交互方式引导您完成此配置。您也可以直接在 `~/.openclaw/openclaw.json` 中配置：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://your-hindsight-server.example.com",
          "hindsightApiToken": "YOUR_API_TOKEN"
        }
      }
    }
  }
}
```

在此模式下，不会启动本地守护进程。插件启动时会对远程 API 执行健康检查，并通过该 API 路由所有记忆操作，包括 Retain（存入）、Recall（召回）和 Reflect（反思）。您可以在日志中确认运行状态：

```
[Hindsight] External API mode enabled: https://your-hindsight-server.example.com
[Hindsight] External API health check passed
```

> **想完全跳过自托管吗？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 可作为外部 API 端点使用：只需使用您的 Cloud URL 和 API 令牌，或通过 `--mode cloud` 运行向导。对于更看重共享记忆而非仅限本地运行的团队或多实例部署，Cloud 是最快的选择。

## 记忆隔离 {#memory-isolation}

默认情况下，插件会根据智能体、通道和用户上下文创建不同的记忆库，因此每种独特组合都有自己独立的记忆存储。记忆库 ID 根据可通过 `dynamicBankGranularity` 配置的字段生成：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "dynamicBankGranularity": ["provider", "user"]
        }
      }
    }
  }
}
```

在此示例中，记忆按服务提供方和用户隔离；也就是说，同一用户在同一服务提供方内的所有通道间共享记忆。

可用于隔离的字段：

- `agent`：机器人身份
- `channel`：对话或群组 ID
- `user`：与机器人交互的人
- `provider`：消息平台（Slack、Telegram 等）

默认值为 `["agent", "channel", "user"]`，这会按用户、通道和智能体分别实现完全隔离。设置 `dynamicBankId: false` 可让所有对话共用一个记忆库；设置 `bankId` 可显式指定记忆库名称。使用 `bankIdPrefix` 可为不同环境中的记忆库添加命名空间（例如 `"prod"`、`"staging"`）。

## 保留与召回控制 {#retention-and-recall-controls}

插件提供了合理的默认值，但大多数行为都可以配置。

**保留**用于控制存入哪些内容：

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `autoRetain` | `true` | 每轮对话后自动存入对话内容。设为 `false` 可禁用。 |
| `retainRoles` | `["user", "assistant"]` | 要纳入存储记录的消息角色。 |
| `retainEveryNTurns` | `1` | 每 N 轮存入一次。值大于 1 时，会启用带滑动窗口的分块存入。 |
| `retainOverlapTurns` | `0` | 分块存入触发时，额外包含此前的对话轮次。 |

**召回**用于控制注入哪些内容：

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `autoRecall` | `true` | 每轮开始前自动注入记忆。当智能体有自己的召回工具时，设为 `false`。 |
| `recallBudget` | `"mid"` | 召回强度：`low`、`mid` 或 `high`。预算越高，使用的检索策略越多。 |
| `recallMaxTokens` | `1024` | 召回响应的最大 token 数，控制每轮注入多少记忆上下文。 |
| `recallTypes` | `["world", "experience"]` | 要召回的记忆类型。默认排除篇幅较长的 `observation` 条目。 |
| `recallTopK` | unlimited | 每轮注入记忆数量的硬性上限。 |
| `recallContextTurns` | `1` | 编写召回查询时纳入的此前用户对话轮次。 |
| `recallPromptPreamble` | built-in string | 注入上下文中的召回记忆上方显示的自定义文本。 |
| `recallInjectionPosition` | `"prepend"` | 召回记忆的注入位置：`prepend`、`append` 或 `user`。使用 `append` 可在系统提示较长且固定时保留提示缓存。 |

示例：结合多轮上下文进行高保真召回：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "recallBudget": "high",
          "recallMaxTokens": 2048,
          "recallContextTurns": 3,
          "recallTopK": 10
        }
      }
    }
  }
}
```

## 陷阱与边缘情况 {#pitfalls--edge-cases}

**记忆提取是异步的。** 每轮对话结束后，系统都会在后台提取事实。如果您结束一个会话后立即开始新会话，最新的事实可能仍在处理中。实际处理时间可能只有一两秒，因此不要期待它们能在不同会话间即时可用。

**提取质量取决于您选择的模型。** 非常小或质量较低的提取模型可能会漏掉细微的技术细节。`gpt-4o-mini` 和 `claude-3-5-haiku` 是可靠的默认选择：它们足以可靠地提取事实，成本也足够低，可以每轮都运行。

**召回窗口有上限。** 默认的 `recallMaxTokens` 为 1024，这意味着并非每条相关记忆都会出现在每次响应中。检索结果按相关性排序，最相关的事实会优先显示，但请留意这个上限。您可以在配置中将其调高到 2048 或更高。

**记忆默认按智能体、通道和用户隔离。** 这意味着 Slack 群聊中的记忆不会混入 Telegram 私信，反之亦然。如果您希望跨通道统一记忆，可将 `dynamicBankGranularity` 调整为仅包含 `["user"]`，或设置 `dynamicBankId: false` 来使用单个共享记忆库。

**嵌入式 PostgreSQL 需要系统库。** `hindsight-embed` 通过 [pg0](https://github.com/vectorize-io/pg0) 打包 PostgreSQL。在精简的 Docker 镜像（例如 `ubuntu:latest`）中，必须先安装 `libxml2` 和 `libreadline`，守护进程才能启动：

```bash
apt-get install -y libxml2 libreadline8t64
```

如果遇到其他缺失库的错误，请查阅适用于您平台的 pg0 README。

**PostgreSQL 不能以 root 身份运行。** 如果在 Docker 中运行，请确保使用非 root 用户。PostgreSQL 的 `initdb` 拒绝以 root 身份运行，守护进程会因此报错并显示 `initdb: error: cannot be run as root`。请创建用户并切换到该用户：

```dockerfile
RUN useradd -m -s /bin/bash myuser
USER myuser
```

**首次运行会下载约 3GB 的依赖项。** 首次运行 `openclaw gateway` 时，`hindsight-embed` 会下载 Python 软件包，包括 PyTorch、sentence-transformers，以及在 x86 架构上使用的 CUDA 库。这可能需要几分钟，也可能导致守护进程启动超时。插件会自动重试，之后的启动会使用缓存的软件包，因此这笔开销只会发生一次。

**外部 API 的韧性。** 如果您使用 External API 模式，而 API 暂时无法访问，插件会将存入记忆的操作排入本地 JSONL 文件，待连接恢复后再重放。服务中断期间不会丢失对话。

**调试日志。** 如果某些功能未按预期运行，可在插件配置中启用 `debug: true`。这会详细记录召回查询、保留的对话记录、记忆库 ID 的生成过程等信息。

## 权衡与替代方案 {#tradeoffs--alternatives}

**适合继续使用 OpenClaw 内置记忆的情况：**

- 您看重纯 Markdown 文件的透明性，可以用任何文本编辑器修改，也可以用 Git 进行版本控制。
- 您的使用场景较轻量，且仅涉及会话范围；每日笔记和 `MEMORY.md` 已能满足需求。
- 您不希望网关旁边再运行其他进程。

**适合选择 Hindsight 的情况：**

- 您希望自动提取记忆，而不依赖模型自行决定要保存什么。
- 您需要稳定的自动召回，而不是寄希望于智能体在合适的时间调用 `memory_search`。
- 您需要结构化知识（事实、实体和关系），而非原始文本。
- 您需要在多个 OpenClaw 实例或团队成员之间共享记忆。
- 您希望细致控制存入哪些内容、召回哪些内容，以及如何在不同智能体和通道间隔离记忆。

**本地守护进程、Cloud 与 External API：**

本地嵌入式守护进程会将所有内容留在一台计算机上，这是个人使用时合适的默认选择。对于共享记忆或多设备场景，Cloud 是最简单的方式，无需管理基础设施。External API 模式则通过自托管服务器提供同样的共享记忆优势。由于 Hindsight 是开源的，您也可以在自己的基础设施上自托管，并保有相同的数据所有权保障。

## 回顾 {#recap}

OpenClaw 的内置记忆以文件为基础且透明，但它依赖智能体决定记住什么、何时搜索。Hindsight 通过自动提取和自动召回取代了这套机制：捕获对话，在后台提取事实，并在每次响应前将相关知识注入上下文。

核心要点是：自动运行的记忆，与依赖模型行为的记忆有本质区别。当智能体无需选择保存什么或何时搜索时，它只需获得正确的上下文即可。

而且，Hindsight 是开源软件并以本地为先（您也可以选择 Cloud），因此您能保有让 OpenClaw 从一开始就如此吸引人的数据所有权模式。

## 后续步骤 {#next-steps}

- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)，这是无需运行任何本地基础设施即可快速上手的方式。
- 安装插件，并通过不同通道进行几次对话。然后打开 Web UI（`uvx hindsight-embed@latest -p openclaw ui`）查看捕获的内容（嵌入式模式）。
- 尝试使用不同的 LLM 服务提供方进行提取，并比较捕获事实的质量。
- 调整 `recallBudget`、`recallMaxTokens` 和 `recallContextTurns`，为您的使用场景找到合适的召回效果。
- 如果希望记忆在不同通道间共享，或按服务提供方隔离，请调整 `dynamicBankGranularity`。
- 浏览 GitHub 上的 [Hindsight 源代码](https://github.com/vectorize-io/hindsight)，了解提取流程。
- 阅读[完整集成文档](/sdks/integrations/openclaw)，查看完整的配置参考。
- 如果您运行着多个 OpenClaw 实例，可尝试 Cloud 或 External API 模式来共享记忆。
