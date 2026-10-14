---
sidebar_position: 20
title: "使用 Hindsight 为 OpenCode 添加持久记忆 | 集成"
description: "使用 Hindsight 为 OpenCode 添加长期记忆。自动捕获对话，并在不同编码会话中召回相关上下文。"
---

# OpenCode {#opencode}

:::warning 已被 Coding Agents 插件取代
**opencode 插件**已被 [Coding Agents 插件](/sdks/integrations/coding-agents)取代。该插件用一个包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，并让它们共享每个代码仓库的同一个记忆库，而不是每个智能体各用一个记忆库。

本页面和已发布的软件包仍可使用，但已停止开发。迁移方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install opencode
```

记忆不会自动迁移：新旧记忆库的作用范围不同，而且无法导入此智能体的历史记录（这些记录保存在内部数据库中）。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

这是一个供 [OpenCode](https://opencode.ai) 使用的持久长期记忆插件，底层采用 [Hindsight](https://vectorize.io/hindsight)。它会自动捕获对话，在会话开始时召回相关上下文，并提供智能体可直接调用的 Retain（存入）、Recall（召回）和 Reflect（反思）工具。

[查看更新日志 →](/changelog/integrations/opencode)

## 快速入门 {#quick-start}

将以下配置添加到项目的 `opencode.json` 或全局配置文件 `~/.config/opencode/opencode.json` 中：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

OpenCode 启动时会自动安装 `"plugin"` 数组中的插件，无需运行 `npm install`。

将插件指向 Hindsight 服务器，然后启动 OpenCode：

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
opencode
```

### 使用 Hindsight Cloud {#using-hindsight-cloud}

在 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取 API 密钥：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="your-api-key"
opencode
```

也可以通过 `opencode.json` 中的插件选项直接配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "https://api.hindsight.vectorize.io",
      "hindsightApiToken": "your-api-key"
    }]
  ]
}
```

## 功能 {#features}

### 自定义工具 {#custom-tools}

插件会注册三个可由智能体显式调用的工具：

| 工具 | 说明 |
|---|---|
| `hindsight_retain` | 将信息存入长期记忆 |
| `hindsight_recall` | 在长期记忆中搜索相关信息 |
| `hindsight_reflect` | 根据长期记忆综合生成答案 |

### 自动存入 {#auto-retain}

会话进入空闲状态（触发 `session.idle` 事件）时，插件会自动将对话记录存入 Hindsight。可以通过 `retainEveryNTurns` 配置存入频率。

### 会话召回 {#session-recall}

新会话开始时，插件会召回相关的项目上下文，并将其注入系统提示词，让智能体能够访问此前会话中的记忆。

### 上下文压缩钩子 {#compaction-hook}

OpenCode 压缩上下文窗口时，插件会：
1. 在压缩前存入当前对话
2. 召回相关记忆，并将其注入压缩上下文

这样可以确保上下文窗口裁剪后，记忆仍然保留。

## 配置 {#configuration}

### 插件选项 {#plugin-options}

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "hindsightApiToken": "your-api-key",
      "bankId": "my-project",
      "autoRecall": true,
      "autoRetain": true,
      "recallBudget": "mid",
      "recallTags": [],
      "recallTagsMatch": "any",
      "retainTags": [],
      "retainEveryNTurns": 3,
      "debug": false
    }]
  ]
}
```

### 配置文件 {#config-file}

创建 `~/.hindsight/opencode.json`，即可为所有项目设置持久配置：

```json
{
  "hindsightApiUrl": "http://localhost:8888",
  "hindsightApiToken": "your-api-key",
  "recallBudget": "mid"
}
```

### 环境变量 {#environment-variables}

| 变量 | 说明 | 默认值 |
|---|---|---|
| `HINDSIGHT_API_URL` | Hindsight API 基础 URL | *（必填）* |
| `HINDSIGHT_API_TOKEN` | 用于身份验证的 API 密钥 | |
| `HINDSIGHT_BANK_ID` | 静态记忆库 ID | `opencode` |
| `HINDSIGHT_AGENT_NAME` | 用于生成动态记忆库 ID 的智能体名称 | `opencode` |
| `HINDSIGHT_AUTO_RECALL` | 会话开始时是否自动召回 | `true` |
| `HINDSIGHT_AUTO_RETAIN` | 会话空闲时是否自动存入 | `true` |
| `HINDSIGHT_RETAIN_MODE` | `full-session` 或 `last-turn` | `full-session` |
| `HINDSIGHT_RECALL_BUDGET` | Recall 预算：`low`、`mid`、`high` | `mid` |
| `HINDSIGHT_RECALL_MAX_TOKENS` | Recall 结果的最大 token 数 | `1024` |
| `HINDSIGHT_RECALL_TAGS` | 以逗号分隔的标签，用于筛选 Recall 结果 | |
| `HINDSIGHT_RECALL_TAGS_MATCH` | 标签匹配模式：`any`、`all`、`any_strict`、`all_strict` | `any` |
| `HINDSIGHT_DYNAMIC_BANK_ID` | 是否启用动态记忆库 ID 派生 | `false` |
| `HINDSIGHT_BANK_MISSION` | Reflect 使用的记忆库任务说明/上下文 | |

配置优先级（后者覆盖前者）：默认值 < `~/.hindsight/opencode.json` < 插件选项 < 环境变量。

### 日志与调试 {#logging--debugging}

插件通过 OpenCode 自带的日志流（`service=hindsight`）记录日志，可通过 `opencode --print-logs` 或 OpenCode 日志文件查看。默认情况下，插件会记录错误（存入或召回失败、无法连接 API、身份验证问题），以及解析出的 API URL 和记忆库，因此记忆未能保存时，无需额外启用选项即可看到原因。

详细跟踪由 `debug` 选项控制，该选项只能通过配置设置（在 `opencode.json` 的插件选项或 `~/.hindsight/opencode.json` 中设置 `"debug": true`）。这里有意不提供 `HINDSIGHT_DEBUG` 环境变量：在 OpenCode 的插件运行时中，环境变量可能无法可靠设置。尤其在 Windows 上，常驻运行的 OpenCode 服务器可能始终无法读取这些变量。

```json
{
  "plugin": [["@vectorize-io/opencode-hindsight", { "debug": true }]]
}
```

## 动态记忆库 ID {#dynamic-bank-ids}

如需隔离不同项目的记忆，请启用动态记忆库 ID 派生：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

记忆库 ID 由粒度字段组合而成（默认值：`agent::project`）。支持的字段：`agent`、`project`、`channel`、`user`。

对于多用户场景（例如，共享智能体为多个用户提供服务）：

```bash
export HINDSIGHT_CHANNEL_ID="slack-general"
export HINDSIGHT_USER_ID="user123"
```

## 工作原理 {#how-it-works}

1. **插件加载** — OpenCode 启动时，插件会创建 `HindsightClient`、派生记忆库 ID，并注册工具和钩子
2. **会话开始** — 触发 `session.created` 事件，插件将该会话标记为待注入召回结果
3. **系统转换** — 首次调用 LLM 时，召回的记忆会注入系统提示词
4. **智能体工作** — 会话期间，智能体可以显式调用 `hindsight_recall` 和 `hindsight_retain`
5. **会话空闲** — 触发 `session.idle` 事件，自动存入对话
6. **上下文压缩** — 上下文窗口满时，压缩过程会保留记忆
