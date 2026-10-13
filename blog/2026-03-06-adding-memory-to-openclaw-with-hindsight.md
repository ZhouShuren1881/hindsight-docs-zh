---
title: "如何用Hindsight为OpenClaw添加持久记忆"
authors: [benfrank241]
date: 2026-03-06T12:00
tags: [openclaw, memory, agents, persistent-memory, knowledge-graph, tutorial]
image: /img/blog/adding-memory-to-openclaw-with-hindsight.webp
hide_table_of_contents: true
---

OpenClaw 的内置记忆取决于智能体决定保存什么——而模型并不能始终如一地做到这一点。 [Hindsight](https://github.com/vectorize-io/hindsight)用自动提取和自动记忆召回取代它：捕获每个对话，在后台提取事实和实体，并在每次响应之前自动注入相关上下文。一个插件安装，一个设置向导，无需Docker。

<!-- truncate -->

## 概览 {#tldr}

- OpenClaw 的内置记忆是基于文件的 — 磁盘上的 Markdown 文件，具有 SQLite 向量搜索。它有效，但智能体必须决定记住什么。 Hindsight 自动化整个管道。
- Hindsight 是开源的，默认在本地运行。除非您另有选择，否则您的对话、提取的知识和记忆存储永远不会离开您的机器。
- 一个插件安装，一个设置向导。选择云、外部API或嵌入式守护程序模式。
- 记忆会在每次响应之前自动注入上下文中——无需调用工具，无需编写检索逻辑。
- 对于团队来说，云或外部API模式将多个OpenClaw实例连接到共享的Hindsight服务器，以便它们都共享记忆。

## 问题 {#the-problem}

OpenClaw 是一款始终在线的 AI 助手，存在于您的消息应用程序中 - WhatsApp、Telegram、Slack、Discord、iMessage 等。它连接到LLM，代表您执行任务，并通过您已使用的通道进行通信。

OpenClaw内置记忆功能，这是一个贴心的设计。该系统使用磁盘上的纯 Markdown 文件：`memory/YYYY-MM-DD.md` 中的每日笔记用于会话级上下文，以及精心策划的 `MEMORY.md` 用于长期知识。 SQLite 支持的向量索引（使用 `sqlite-vec`）支持对这些文件进行语义搜索，甚至还有一个实验性的 QMD 后端，将 BM25 关键字搜索与向量检索相结合。

但是有一个基本约束：**智能体必须决定记住什么**。文档直接说——“如果你想要粘住一些东西，请让机器人来写它。” 记忆是模型必须明确选择保存的仅附加文本。今天和昨天的每日笔记会在会话开始时自动加载，但任何较旧的内容都需要智能体使用 `memory_search` 工具主动搜索。

在实践中，这意味着：

- 重要的事实被忽略，因为模型没有想到把它们写下来。
- 记忆的质量取决于LLM遵循其自身指令来保存信息的程度。
- 随着日常笔记的积累，找到正确的上下文需要智能体在正确的时间使用正确的查询进行搜索——而模型并不能始终如一地做到这一点。

还有一个对于OpenClaw 用户特别重要的数据问题。 OpenClaw 在 *你的* 机器上运行并与 *你的* 消息应用程序对话。期望是本地优先，默认情况下是私有的。任何通过第三方云服务路由对话的记忆解决方案都会打破这种模式。

## 方法 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight) 是一个开源记忆引擎，它通过自动化、结构化的知识提取取代了 OpenClaw 的记忆层。与内置系统的主要区别：

**自动捕捉，非手动。** 每个对话都会在每个回合后被捕获，而无需智能体来决定什么值得记住。 Hindsight 在后台提取事实、实体和关系——不需要提示模型“保存”。

**结构化知识，而不是平面文本。** Hindsight 不是在 Markdown 文件中追加行，而是提取离散事实（“生产数据库在端口 5433 上运行”），跟踪实体（人员、服务、项目），并映射它们之间的关系（“身份验证服务依赖于 Redis 进行会话”）。

**自动记忆召回，而不是基于工具的检索。**OpenClaw的内置记忆公开了智能体可以调用的`memory_search`工具，但模型并不一致地使用搜索工具。 Hindsight 通过将相关记忆注入上下文*之前* 每个智能体响应中，完全回避了这一点。智能体不需要知道记忆系统的存在。

**防止反馈循环。** 当记忆在响应之前被注入上下文时，它们就成为对话的一部分。如果不小心，那些注入的记忆将会被重新存储并重新提取为新的事实，从而导致指数级增长和重复。该插件会在保留之前自动删除自己的 `<hindsight_memories>` 标签，从而防止出现这种循环。

**​​本地优先，开源。**Hindsight通过`hindsight-embed`运行，`hindsight-embed`是一个守护进程，它将记忆API和PostgreSQL实例捆绑到计算机上的单个进程中。没有数据离开您的环境。整个代码库是开源的。

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

### 第1步：安装插件 {#step-1-install-the-plugin}

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

您应该看到确认安装的输出，并且Hindsight接管记忆插槽：

```
Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw".
Installed plugin: hindsight-openclaw
```

### 第 2 步：运行设置向导 {#step-2-run-the-setup-wizard}

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导将引导您完成三种模式：

- **云** — 在 `https://api.hindsight.vectorize.io` 管理 Hindsight。出现提示时粘贴您的 [云 API 令牌](https://ui.hindsight.vectorize.io)。无需本地设置——这是最快的路径。
- **外部API** — 您自己运行的 Hindsight 部署。提示输入 URL 和可选的令牌。
- **嵌入式守护进程** — 在本机上生成本地 `hindsight-embed` 守护进程。提示输入 LLM 提供商和 API 密钥。

从智能体的角度来看，这三者都是等效的——无论模式如何，自动捕捉和自动记忆的工作方式都是相同的。云是最简单的起点；当您需要设备上的所有内容时，嵌入式是正确的选择。

该向导还可以针对 CI 或脚本化设置以非交互方式运行：

```bash
# Cloud
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

#嵌入OpenAI
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key sk-...

#嵌入 Claude Code（通过 Claude Code CLI 进行身份验证 — 无需单独的 API 密钥）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider claude-code
```

您在这里配置的LLM是**仅用于记忆提取**（后台处理）。您的主要OpenClaw智能体使用您单独配置的任何模型。

### 第 3 步：启动 {#step-3-launch}

```bash
openclaw gateway
```

插件连接到您配置的后端（云、外部API或本地守护进程）。您应该在网关输出中看到确认：

```
[Hindsight] ✓ Using provider: openai, model: gpt-4o-mini
```

这就是整个设置。

### 验证它是否正常工作 {#verifying-its-working}

几次对话后，检查网关日志以确认记忆操作正在发生：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

您应该看到类似以下的行：

```
[Hindsight] Retained X messages for session ...
[Hindsight] Auto-recall: Injecting X memories
```

如果您想浏览您的智能体所学的内容，Hindsight 守护进程包含一个 Web UI（仅限嵌入模式）：

```bash
uvx hindsight-embed@latest -p openclaw ui
```

### 外部API模式：跨实例共享记忆 {#external-api-mode-shared-memory-across-instances}

如果您正在运行多个OpenClaw实例（例如，一个在笔记本电脑上，一个在服务器上），或者如果您的团队想要共享智能体记忆，请连接到共享的HindsightAPI服务器，而不是运行本地守护程序。

设置向导（`--mode api`或`--mode cloud`）以交互方式覆盖此路径。直接在`~/.openclaw/openclaw.json`中配置：

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

在此模式下，不会启动本地守护进程。该插件在启动时对远程API执行健康检查，并通过它路由所有记忆操作——记忆存储、记忆召回、反思。您可以在日志中验证它是否正常工作：

```
[Hindsight] External API mode enabled: https://your-hindsight-server.example.com
[Hindsight] External API health check passed
```

> **想要完全跳过自托管吗？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 作为外部 API 端点 — 只需使用您的云 URL 和 API 令牌，或使用 `--mode cloud` 运行向导。对于共享记忆比仅限本地更重要的团队或多实例设置，云是最快的路径。

## 记忆隔离 {#memory-isolation}

默认情况下，该插件根据智能体、通道和用户上下文创建单独的记忆库 - 因此每个独特的组合都有自己独立的记忆库。记忆库 ID 通过 `dynamicBankGranularity` 从可配置字段导出：

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

在此示例中，每个提供商+用户的记忆都是隔离的，这意味着同一用户在提供商内的所有通道上共享记忆。

可用隔离场：
- `agent` — 机器人身份
- `channel` — 对话或组 ID
- `user` — 与机器人交互的人
- `provider` — 消息平台（Slack、Telegram 等）

默认为`["agent", "channel", "user"]`，它为每个用户每个通道每个智能体提供完全隔离。设置 `dynamicBankId: false` 为所有对话使用单个共享记忆库，并设置 `bankId` 显式指定记忆库名称。使用`bankIdPrefix`跨环境命名记忆库（例如`"prod"`、`"staging"`）。

## 保留和记忆控制 {#retention-and-recall-controls}

该插件附带了合理的默认值，但大多数行为都是可配置的。

**保留** 控制存储的内容：

|选项|默认|说明|
|--------|---------|-------------|
|`autoRetain`|`true`|每回合后自动记忆存储对话。将 `false` 设置为禁用。|
|`retainRoles`|`["user", "assistant"]`|保留的记录中要包含哪些消息角色。|
|`retainEveryNTurns`|`1`|​​ 记忆存储每 N 回合。值 > 1 启用带有滑动窗口的分块保留。|
|`retainOverlapTurns`|`0`|当分块保留触发时，包括额外的先前回合。|

**记忆召回** 控制注入的内容：

|选项|默认|说明|
|--------|---------|-------------|
|`autoRecall`|`true`|每回合前自动注入记忆。当智能体有自己的记忆召回工具时，设置`false`。|
|`recallBudget`|`"mid"`|记忆召回努力：`low`、`mid`或`high`。较高的预算使用更多的检索策略。|
|`recallMaxTokens`|`1024`|记忆召回响应的最大令牌 — 控制每轮注入多少记忆上下文。|
|`recallTypes`|`["world", "experience"]`|记忆类型到记忆召回。默认情况下排除详细的 `observation` 条目。|
|`recallTopK`|无限制|每回合注入记忆数量的硬性上限。|
|`recallContextTurns`|`1`|编写记忆召回查询时要包括的先前用户轮次数。|
|`recallPromptPreamble`|内置字符串|自定义文本放置在注入上下文中的回忆上方。|
|`recallInjectionPosition`|`"prepend"`|在哪里注入回忆：`prepend`、`append`、或`user`。使用 `append` 保留大型静态系统提示的提示缓存。|

示例：具有多回合上下文的高保真记忆召回：

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

## 陷阱和边缘情况 {#pitfalls--edge-cases}

**记忆提取是异步的。** 每回合后都会在后台提取事实。如果您结束一个会话并立即开始一个新会话，则最新的事实可能仍在处理中。实际上，这可能需要一两秒，因此不要期望跨会话即时可用。

**提取质量取决于您选择的型号。** 非常小的或低质量的提取模型会错过细微的技术细节。 `gpt-4o-mini` 和 `claude-3-5-haiku` 是可靠的默认设置——足够可靠的事实提取，足够便宜，可以在每一个回合中运行。

**记忆召回窗口是有界的。** 默认`recallMaxTokens` 1024 意味着并非每个相关记忆都会出现在每个响应中。检索是按相关性排序的，因此最相关的事实首先出现，但要注意上限。您可以在 config.xml 中将其增加到 2048 或更高。

**记忆隔离默认为每个智能体+每个通道+每个用户。** 这意味着您的 Slack 群聊记忆不会渗入您的 Telegram DM 记忆中，反之亦然。如果您希望跨通道统一记忆，请将`dynamicBankGranularity`调整为`["user"]`或为单个共享记忆库设置`dynamicBankId: false`。

**嵌入式PostgreSQL需要系统库。** `hindsight-embed` 通过 [pg0](https://github.com/vectorize-io/pg0) 捆绑 PostgreSQL。在最小的 Docker 映像（例如 `ubuntu:latest`）上，您需要在守护进程启动之前安装 `libxml2` 和 `libreadline`：

```bash
apt-get install -y libxml2 libreadline8t64
```

如果您遇到其他缺少库的错误，请检查您平台的 pg0 自述文件。

**PostgreSQL 无法以 root 身份运行。** 如果您在 Docker 内运行，请确保您使用的是非 root 用户。 PostgreSQL 的 `initdb` 拒绝以 root 身份运行，并且守护进程将因 `initdb: error: cannot be run as root` 失败。创建一个用户并切换到该用户：

```dockerfile
RUN useradd -m -s /bin/bash myuser
USER myuser
```

**首次运行下载约 3GB 的依赖项。** 在第一次 `openclaw gateway` 启动时，`hindsight-embed` 下载 Python 软件包，包括 PyTorch、句子转换器和（在 x86 上）CUDA 库。这可能需要几分钟时间，并可能导致守护程序启动超时。插件会自动重试，后续启动会使用缓存的包 - 因此这是一次性成本。

**外部API恢复力。** 如果您使用外部 API 模式并且 API 暂时无法访问，则该插件会将记忆存储操作排队到本地 JSONL 文件中，并在连接恢复后重播它们。中断期间不会丢失任何对话。

**调试日志记录。** 如果某些功能未按预期工作，请在插件配置中启用`debug: true`。这会生成记忆召回查询、保留记录、记忆库 ID 派生等的详细日志记录。

## 权衡与替代方案 {#tradeoffs--alternatives}

**何时坚持OpenClaw的内置记忆：**

- 您更喜欢纯 Markdown 文件的透明度，您可以在任何文本编辑器中编辑并使用 Git 进行版本控制。
- 您的用例是轻量级的且仅限于会话范围 - 每日笔记加上 `MEMORY.md` 可以满足您的需求。
- 您不希望任何其他进程与网关一起运行。

**当Hindsight是更好的选择时：**

- 您想要自动提取记忆，而不依赖模型来决定保存什么。
- 你需要一致的自动记忆召回，而不是希望智能体在正确的时间调用`memory_search`。
- 您需要结构化知识（事实、实体、关系）而不是原始文本。
- 您需要在多个OpenClaw实例或团队成员之间共享记忆。
- ​​您希望对保留的内容、回忆的内容以及如何跨智能体和通道隔离记忆进行细粒度控制。

**本地守护进程与云与外部API：**

本地嵌入式守护进程将所有内容保留在一台计算机上 - 这是个人使用的正确默认设置。云是共享记忆或多设备设置的最简单路径，无需管理基础设施。外部API模式为您提供与自托管服务器相同的共享记忆优势。由于 Hindsight 是开源的，您可以在自己的基础设施上自行托管并保持相同的数据所有权保证。

## 回顾 {#recap}

OpenClaw的内置记忆是基于文件且透明的，但它取决于智能体决定记住什么以及何时搜索。 Hindsight 用自动提取和自动记忆召回取代了这一点——捕获对话，在后台提取事实，并在每次响应之前将相关知识注入上下文中。

核心见解：自动工作的记忆与依赖模型行为的记忆有本质上的不同。当智能体不必选择保存什么或何时搜索时，它只需拥有正确的上下文即可。

而且由于Hindsight是开源且本地优先（或者云，如果您愿意的话），您可以保留相同的数据所有权模型，这使得OpenClaw首先引人注目。

## 后续步骤 {#next-steps}

- [注册Hindsight Cloud](https://ui.hindsight.vectorize.io) — 无需运行任何本地基础设施即可开始的最快方式。
- 安装插件并通过不同渠道进行一些对话。然后打开 Web UI (`uvx hindsight-embed@latest -p openclaw ui`) 以查看捕获的内容（嵌入模式）。
- 使用不同的LLM提供者进行提取实验并比较捕获事实的质量。
- 使用`recallBudget`、`recallMaxTokens`和`recallContextTurns`调整记忆召回，为您的用例找到正确的平衡。
- 如果希望跨渠道共享记忆或按提供商隔离记忆，请调整 `dynamicBankGranularity`。
- 如果您希望跨渠道共享记忆或每个提供商隔离记忆，请调整`dynamicBankGranularity`。
- 浏览[Hindsight 来源GitHub](https://github.com/vectorize-io/hindsight)以了解提取管道。
- 阅读[完整集成文档](/sdks/integrations/openclaw)以获取完整的配置参考。
- 如果您正在运行多个OpenClaw实例，请尝试云或外部API模式来共享记忆。
