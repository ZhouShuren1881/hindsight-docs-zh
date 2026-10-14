---
title: "hindsight-openclaw 0.6 新特性"
authors: [benfrank241]
date: 2026-04-13T12:00
tags: [release, openclaw, memory, setup-wizard, plugin]
image: /img/blog/openclaw-plugin-06.webp
hide_table_of_contents: true
description: "hindsight-openclaw 0.6 新增交互式设置向导、按通道隔离的 OpenClaw 记忆库、用于共享持久记忆的外部 API 后端，以及多项可靠性改进。"
---

`@vectorize-io/hindsight-openclaw` 0.6 是 Hindsight OpenClaw 记忆插件的一次重大更新。最主要的变化是新增交互式设置向导，取代手动配置；同时进行了重大配置调整，将所有插件设置移入 `openclaw.json`。此版本还增加了按通道隔离的记忆库、外部 Hindsight API 支持、召回注入控制、基于 JSONL 的存入队列，以及会话过滤。

<!-- truncate -->

![Hindsight × OpenClaw](/img/blog/openclaw-plugin-06.webp)

- [**设置向导**](#setup-wizard)：运行一条命令，不到两分钟即可从零开始使用记忆功能。
- [**配置调整（重大变更）**](#config-overhaul-breaking-change)：现在所有设置都存放在 `openclaw.json` 中。环境变量配置已移除。
- [**按通道隔离记忆库**](#per-channel-memory-banks)：默认按智能体、通道和用户隔离记忆。
- [**外部 API 后端**](#external-api-backend)：让多个 OpenClaw 实例连接到同一个 Hindsight 服务器。
- [**召回注入控制**](#recall-injection-controls)：选择将召回的记忆插入上下文的位置，即系统提示之前或之后。
- [**可靠性：JSONL 存入队列**](#reliability-jsonl-retain-queue)：API 无法访问时，对话会在本地排队，并在连接恢复后重放。
- [**会话过滤**](#session-filtering)：将指定会话模式标记为无状态，以完全跳过记忆操作。
- [**可配置标签**](#configurable-tags)：为存入的记忆添加标签，便于整理和按标签过滤召回结果。
- [**回填 CLI**](#backfill-cli)：将历史对话追溯摄取到 Hindsight。
- [**对话格式（0.6.2）**](#conversation-format-062)：对话现在以 Anthropic 风格的 JSON 格式存储，并保留工具调用和工具结果内容块。

---

## 设置向导 {#setup-wizard}

过去，开始使用 `hindsight-openclaw` 需要在正确的位置设置正确的环境变量。0.6.0 用交互式向导取代了这套流程：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会引导你选择以下三种模式之一：

- **云（推荐）**：连接到托管版 Hindsight，地址为 `https://api.hindsight.vectorize.io`。向导会提示输入[云 API 令牌](https://ui.hindsight.vectorize.io)。无需本地设置。
- **外部 API**：连接到自托管的 Hindsight 服务器。向导会提示输入 URL 和可选的令牌。
- **嵌入式守护进程**：在本机启动本地 `hindsight-embed` 守护进程。向导会提示输入 LLM 服务提供方和 API 密钥。

向导会将结果写入 `~/.openclaw/openclaw.json`。此后，`openclaw gateway` 会自动读取该配置。

对于脚本或 CI 环境，也可以以非交互方式运行向导：

```bash
# 云
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

# 使用 OpenAI 的嵌入式模式
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key sk-...

# 使用 Claude Code 的嵌入式模式（通过 Claude Code CLI 进行身份验证，无需单独的 API 密钥）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider claude-code
```

此处配置的 LLM 仅用于记忆提取。OpenClaw 智能体使用你单独配置的模型。从头安装和配置插件的完整演练，请参阅[如何使用 Hindsight 为 OpenClaw 添加持久记忆](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。

---

## 配置调整（重大变更） {#config-overhaul-breaking-change}

在 0.6.0 之前，插件配置从环境变量读取。这种方式不便于编写脚本，也会把设置埋在 shell 配置文件中，而不是与其他 OpenClaw 配置放在一起。

从 0.6.0 开始，所有配置都位于 `~/.openclaw/openclaw.json` 的插件条目下：

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

**迁移**：如果你之前设置了 `HINDSIGHT_EMBED_API_URL`、`HINDSIGHT_PROVIDER` 或类似的环境变量，请将这些值移入上面的 `config` 块。对于新安装，设置向导会自动完成这一步。所有可用选项请参阅[完整配置参考](/sdks/integrations/openclaw)。

---

## 按通道隔离记忆库 {#per-channel-memory-banks}

默认情况下，插件会根据智能体、通道和用户上下文创建相互隔离的记忆库。同一用户参与的 Slack 私信和 Telegram 群聊会使用不同的记忆存储。

此行为由 `dynamicBankGranularity` 控制：

```json
{
  "config": {
    "dynamicBankGranularity": ["agent", "channel", "user"]
  }
}
```

可用于隔离的维度：

| 字段 | 说明 |
|-------|-------------|
| `agent` | 机器人身份 |
| `channel` | 对话或群组 ID |
| `user` | 与机器人交互的人 |
| `provider` | 消息平台（Slack、Telegram 等） |

默认值为 `["agent", "channel", "user"]`，因此每个用户在每个通道、每个智能体下都有独立的记忆库。若要让某个用户在所有通道间共享记忆，请使用 `["user"]`。若要让所有内容共用一个记忆库，请设置 `dynamicBankId: false`。

现在也支持为静态记忆库配置 `bankId`：

```json
{
  "config": {
    "dynamicBankId": false,
    "bankId": "my-shared-bank"
  }
}
```

使用 `bankIdPrefix` 可在不同环境间为记忆库添加命名空间（例如，`"prod"` 与 `"staging"`）。跨平台按用户隔离记忆的完整示例，请参阅[按用户隔离记忆的食谱](/cookbook/recipes/per-user-memory)。

---

## 外部 API 后端 {#external-api-backend}

现在可以将插件指向自托管的 Hindsight API 服务器，而不是运行本地嵌入式守护进程。当多个 OpenClaw 实例需要共享同一个记忆存储，或需要将记忆服务与网关所在机器分开时，这种配置很合适。基础设施要求请参阅[自托管快速入门](/developer/api/quickstart)。

```json
{
  "config": {
    "hindsightApiUrl": "https://your-hindsight-server.example.com",
    "hindsightApiToken": "YOUR_API_TOKEN"
  }
}
```

插件启动时会检查远程 API 的健康状态。如果检查失败，网关会记录警告，但仍会启动。API 无法访问期间发生的 Retain（存入）操作会在本地排队（见下文的 [JSONL 存入队列](#reliability-jsonl-retain-queue)）。

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 可作为外部 API 端点使用。使用你的 Cloud URL 和令牌，或者通过 `--mode cloud` 运行向导。

---

## 召回注入控制 {#recall-injection-controls}

0.5.0 新增了 `recallInjectionPosition`，用于控制将召回的记忆插入上下文的位置：

| 值 | 行为 |
|----------|----------|
| `"prepend"` | 注入到系统提示之前（默认值） |
| `"append"` | 注入到系统提示之后 |
| `"user"` | 作为用户消息注入 |

如果系统提示较长且内容固定，`"append"` 有助于利用提示缓存：将记忆插入系统提示之后，可以让静态部分在不同轮次之间保持稳定。

```json
{
  "config": {
    "recallInjectionPosition": "append"
  }
}
```

完整的召回控制选项如下：

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `autoRecall` | `true` | 每轮交互开始前自动注入记忆 |
| `recallBudget` | `"mid"` | 召回强度：`low`、`mid` 或 `high` |
| `recallMaxTokens` | `1024` | 注入记忆的最大 token 数 |
| `recallTypes` | `["world", "experience"]` | 要包含的记忆类型 |
| `recallTopK` | unlimited | 每轮注入记忆数量的硬性上限 |
| `recallContextTurns` | `1` | 用于组织召回查询的先前用户轮次数 |
| `recallInjectionPosition` | `"prepend"` | 召回记忆的注入位置 |

存入控制选项如下：

| 选项 | 默认值 | 说明 |
|--------|---------|-------------|
| `autoRetain` | `true` | 每轮交互结束后自动存入对话 |
| `retainEveryNTurns` | `1` | 每隔 N 轮存入一次 |
| `retainOverlapTurns` | `0` | 分块存入时额外包含的先前轮次数 |

---

## 可靠性：JSONL 存入队列 {#reliability-jsonl-retain-queue}

当插件配置为外部 API 模式且 API 暂时无法访问时，Retain 操作会写入本地 JSONL 文件排队，而不会被丢弃。连接恢复后，队列会重放，对话也会照常存入。

无需配置。队列文件位于插件工作目录旁边，并会在成功重放后清理。

---

## 会话过滤 {#session-filtering}

某些会话不应被存入或用于召回，例如机器人的运维消息、内部系统事件，或本质上无状态的内容。0.6.0 新增会话模式过滤，以处理这些情况：

```json
{
  "config": {
    "skipSessionPatterns": ["^bot-", "^system-event-"]
  }
}
```

ID 匹配 `skipSessionPatterns` 中任一模式的会话都会被视为无状态：不存入、不召回，也不执行任何记忆操作。

---

## 可配置标签 {#configurable-tags}

现在可以为插件存入的记忆添加标签，以便整理并按标签过滤召回结果：

```json
{
  "config": {
    "retainTags": ["openclaw", "env:prod"]
  }
}
```

此插件实例存入的所有记忆都会带上这些标签。可用它们限定召回查询范围、区分环境，或区分共享同一记忆库的不同部署所存入的记忆。

---

## 回填 CLI {#backfill-cli}

如果要在现有 OpenClaw 部署中启用 Hindsight 记忆，回填 CLI 可以追溯摄取历史对话：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-backfill
```

CLI 会读取 `openclaw.json` 中的插件配置，并将历史对话数据处理到你配置的 Hindsight 后端。启用插件后运行一次，即可在用户开始与智能体交互前预先填充记忆存储。该插件发布在 [npm](https://www.npmjs.com/package/@vectorize-io/hindsight-openclaw)。

---

## 对话格式（0.6.2） {#conversation-format-062}

从 0.6.2 开始，对话以 Anthropic 风格的 JSON 格式存储，并保留 `tool_use` 和 `tool_result` 内容块。此前，在存入过程中，工具交互要么被丢弃，要么被压平为纯文本。

此项变更提高了存储对话用于分析和重放时的保真度，并确保完整记录复杂的智能体交互，不会丢失工具调用的结构。

0.6.2 还改进了会话稳定性：会话身份在不同轮次之间更加一致；存入时会跳过非用户的运维轮次，以减少记忆存储中的噪声。

---

## 升级 {#upgrading}

安装最新版本：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

如果之前使用环境变量配置，请运行设置向导完成迁移：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会检测现有设置，并将等效配置写入 `openclaw.json`。

---

## 开始使用 {#get-started}

- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)：最快启用记忆功能的方式，无需本地基础设施。
- [OpenClaw 集成文档](/sdks/integrations/openclaw)：完整配置参考。
- [OpenClaw 插件变更日志](/changelog/integrations/openclaw)：列出从 0.5.0 起的所有变更。

---
