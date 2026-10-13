---
title: "hindsight-openclaw 0.6"
authors: [benfrank241]
date: 2026-04-13T12:00
tags: [release, openclaw, memory, setup-wizard, plugin]
image: /img/blog/openclaw-plugin-06.webp
hide_table_of_contents: true
description: "hindsight-openclaw 0.6 添加了交互式设置向导、每通道 OpenClaw 记忆库、用于共享持久记忆的外部 API 后端，以及多项可靠性改进。"
---

`@vectorize-io/hindsight-openclaw` 0.6 是对 Hindsight OpenClaw 记忆插件的重大更新。主要变化是交互式设置向导取代了手动配置，同时进行了重大配置检修，将所有插件设置移至`openclaw.json`。此版本还添加了每通道记忆存储库、外部HindsightAPI支持、记忆召回注入控制、JSONL支持的记忆队列和会话过滤。

<!-- truncate -->

![Hindsight×OpenClaw](/img/blog/openclaw-plugin-06.webp)

- [**设置向导**](#setup-wizard)：一个命令即可让您在两分钟内从零开始记忆。
- [**配置大修**](#config-overhaul-breaking-change)：所有设置现在都位于`openclaw.json`。环境变量没了。
- [**每通道记忆 记忆库**](#per-channel-memory-banks)：默认情况下，记忆现在是按智能体、通道和用户隔离的。
- [**外部API后端**](#external-api-backend)：将多个OpenClaw实例指向共享的Hindsight服务器。
- [**记忆召回注射控制**](#recall-injection-controls)：选择在系统提示之前或之后回忆的记忆在上下文中的位置。
- [**可靠性：JSONL 记忆存储队列**](#reliability-jsonl-retain-queue)：当 API 无法访问时，对话会在本地排队，并在连接恢复时重播。
- [**会话过滤**](#session-filtering)：将特定会话模式标记为无状态以完全跳过记忆操作。
- [**可配置标签**](#configurable-tags)：标记保留的记忆以进行组织和过滤记忆召回。
- [**回填 CLI**](#backfill-cli)：将历史对话追溯至Hindsight。
- [**对话格式（0.6.2）**](#conversation-format-062)：对话现在存储在Anthropic样式JSON中，保留工具使用和工具结果块。

---

## 设置向导 {#setup-wizard}

开始使用`hindsight-openclaw`过去需要在正确的位置设置正确的环境变量。 0.6.0 用交互式向导取代了它：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会经历三种模式：

- **云（推荐）**：连接到位于 `https://api.hindsight.vectorize.io` 的托管 Hindsight。提示您输入 [云 API 令牌](https://ui.hindsight.vectorize.io)。无需本地设置。
- **外部API**：连接到自托管的Hindsight服务器。提示输入 URL 和可选令牌。
- **嵌入式守护进程**：在机器上生成本地`hindsight-embed`守护进程。提示输入 LLM 提供商和 API 密钥。

向导将结果写入`~/.openclaw/openclaw.json`。从那时起，`openclaw gateway` 自动拾取它。

对于脚本化或 CI 设置，向导也以非交互方式运行：

```bash
# Cloud
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

#嵌入OpenAI
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key sk-...

#嵌入Claude Code（通过Claude CodeCLI进行身份验证，无需单独的API密钥）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider claude-code
```

LLM仅用于记忆提取。您的OpenClaw智能体使用您单独配置的任何模型。有关从头开始安装和配置插件的完整演练，请参阅 [如何使用Hindsight将持久记忆添加到OpenClaw](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。
这里配置的

---

## 配置大修（重大变更） {#config-overhaul-breaking-change}

0.6.0之前，插件配置是从环境变量中读取的。这种方法使脚本编写变得尴尬，并将设置隐藏在 shell 配置文件中，而不是与 OpenClaw 配置的其余部分一起放置。

在0.6.0中，所有配置都位于插件条目下的`~/.openclaw/openclaw.json`中：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "http://localhost:9077",
          "provider": "openai",
          "model": "gpt-4o-mini",
          "apiKey": "sk-..."
        }
      }
    }
  }
}
```

**迁移**：如果您要设置`HINDSIGHT_EMBED_API_URL`、`HINDSIGHT_PROVIDER`或类似的环境变量，请将这些值移动到上面的`config`块中。安装向导会自动为新安装处理此问题。请参阅[完整配置参考](/sdks/integrations/openclaw)了解所有可用选项。

---

## 每通道记忆 记忆库 {#per-channel-memory-banks}

默认情况下，该插件现在根据智能体、通道和用户上下文创建独立的记忆库。涉及同一用户的 Slack DM 和 Telegram 群聊拥有单独的记忆存储。

这是由`dynamicBankGranularity`控制的：

```json
{
  "config": {
    "dynamicBankGranularity": ["agent", "channel", "user"]
  }
}
```

可用隔离尺寸：

|场|说明|
|-------|-------------|
|`agent`|机器人身份|
|`channel`|对话或群组 ID|
|`user`|与机器人交互的人|
|`provider`|消息平台（Slack、Telegram 等）|

默认为`["agent", "channel", "user"]`，为每个用户每个通道每个智能体提供完全隔离。要在用户的所有渠道上共享记忆，请使用`["user"]`。要对所有内容使用单个共享记忆库，请设置 `dynamicBankId: false`。

对于静态记忆库配置，现在支持`bankId`：

```json
{
  "config": {
    "dynamicBankId": false,
    "bankId": "my-shared-bank"
  }
}
```

使用`bankIdPrefix`跨环境命名记忆库（例如`"prod"`与`"staging"`）。请参阅[每用户记忆食谱](/cookbook/recipes/per-user-memory)，了解跨平台隔离每个用户记忆的有效示例。

---

## 外部API后端 {#external-api-backend}

您现在可以将插件指向自托管的HindsightAPI服务器，而不是运行本地嵌入式守护程序。当多个 OpenClaw 实例应共享相同的记忆存储时，或者当您想要将记忆服务与网关计算机分开时，这是正确的设置。有关基础设施要求，请参阅[自托管快速入门](/developer/api/quickstart)。

```json
{
  "config": {
    "hindsightApiUrl": "https://your-hindsight-server.example.com",
    "hindsightApiToken": "YOUR_API_TOKEN"
  }
}
```

插件在启动时对远程API执行健康检查。如果检查失败，网关将记录警告但仍会启动。 当API无法访问时发生的记忆存储操作在本地排队（参见下面的[JSONL 记忆存储队列](#reliability-jsonl-retain-queue)）。

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 作为外部 API 端点。使用您的云 URL 和令牌，或使用 `--mode cloud` 运行向导。

---

## 记忆召回注射控制 {#recall-injection-controls}

0.5.0 添加了 `recallInjectionPosition`，它控制召回的记忆插入上下文的位置：
添加

|值|行为|
|-------|----------|
|`"prepend"`|在系统提示之前注入（默认）|
|`"append"`|系统提示后注入|
|`"user"`|作为用户消息注入|

如果您的系统提示很长且基本不变，`"append"` 可以发挥提示缓存的优势：将记忆注入到系统提示之后，让静态部分在各轮交互之间保持稳定。

```json
{
  "config": {
    "recallInjectionPosition": "append"
  }
}
```

全套记忆召回控件：

|选项|默认|说明|
|--------|---------|-------------|
|`autoRecall`|`true`|每回合前自动注入记忆|
|`recallBudget`|`"mid"`|记忆召回努力：`low`、`mid` 或 `high`|
|`recallMaxTokens`|`1024`|注入记忆的最大令牌|
|`recallTypes`|`["world", "experience"]`|包括的记忆类型|
|`recallTopK`|无限制|每回合注入记忆的硬上限|
|`recallContextTurns`|`1`|之前的用户轮流用于组成记忆召回查询|
|`recallInjectionPosition`|`"prepend"`|将回忆注入何处|

和保留控制：

|选项|默认|说明|
|--------|---------|-------------|
|`autoRetain`|`true`|每回合后自动记忆存储对话|
|`retainEveryNTurns`|`1`|记忆存储每N回合|
|`retainOverlapTurns`|`0`|当分块保留开火时，包括额外的先前回合|

---

## 可靠性：JSONL 记忆存储队列 {#reliability-jsonl-retain-queue}

当插件配置为外部API模式并且API暂时无法访问时，存储记忆操作现在会在本地JSONL文件中排队而不是被丢弃。当连接恢复时，队列将被重放，并且对话将照常保留。

无需配置。队列文件与插件的工作目录并存，并在成功重播后被清除。

---

## 会话过滤 {#session-filtering}

某些会话不应保留或召回：来自机器人的操作消息、内部系统事件或任何本质上无状态的内容。 0.6.0 添加了会话模式过滤来处理这些情况：

```json
{
  "config": {
    "skipSessionPatterns": ["^bot-", "^system-event-"]
  }
}
```

ID 与 `skipSessionPatterns` 中的任何模式匹配的会话被视为无状态：没有记忆存储，没有记忆召回，根本没有记忆操作。

---

## 可配置标签 {#configurable-tags}

插件保留的记忆现在可以标记为组织和过滤记忆召回：

```json
{
  "config": {
    "retainTags": ["openclaw", "env:prod"]
  }
}
```

标签出现在该插件实例保留的所有记忆中。使用它们来确定记忆召回查询的范围、分离环境或区分共享相同记忆库的不同部署的记忆。

---

## 回填 CLI {#backfill-cli}

如果您在现有OpenClaw部署上启用Hindsight记忆，回填CLI可让您追溯历史对话：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-backfill
```

CLI 读取您的 `openclaw.json` 插件配置，并将历史对话数据处理到您配置的 Hindsight 后端。在启用插件后运行一次，以在用户与智能体交互之前填充记忆存储。该插件发布在[npm](https://www.npmjs.com/package/@vectorize-io/hindsight-openclaw)。

---

## 对话格式（0.6.2） {#conversation-format-062}

从0.6.2开始，对话以Anthropic样式JSON格式存储，保留`tool_use`和`tool_result`内容块。以前，工具交互在保留期间要么被丢弃，要么被扁平化为纯文本。

此更改提高了用于分析和重放的存储对话的保真度，并确保完整捕获复杂的代理交互，而不是丢失工具调用的结构。

0.6.2 还包括会话稳定性改进：会话身份现在在各个回合中更加一致，并且在保留期间会跳过非用户操作回合，以减少记忆存储中的噪音。

---

## 升级 {#upgrading}

安装最新版本：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

如果您使用环境变量进行配置，请运行设置向导进行迁移：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导将检测您现有的设置并将等效配置写入`openclaw.json`。

---

## 开始 {#get-started}

- [注册Hindsight Cloud](https://ui.hindsight.vectorize.io)，最快的工作记忆路径，无需本地基础设施。
- [OpenClaw集成文档](/sdks/integrations/openclaw)，完整配置参考。
- [OpenClaw插件变更日志](/changelog/integrations/openclaw)，自 0.5.0 以来的完整更改列表。
