---
sidebar_position: 7
title: "使用 Hindsight 为 Cursor CLI 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 Cursor CLI 添加持久记忆。Python 钩子脚本会在每次提示前自动召回上下文，并在对话后存入记忆，无需更改工作流程。"
---

# Cursor CLI {#cursor-cli}

:::warning 已由 Coding Agents 插件取代
**Cursor CLI 集成** 已由 [Coding Agents 插件](/sdks/integrations/coding-agents) 取代。该插件通过一个
软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体；这些智能体共享每个代码仓库对应的记忆库，而不是每个智能体各用一个记忆库。

本页面和已发布的软件包仍可使用，但已不再开发。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install cursor-cli
```

记忆不会自动迁移：这些记忆库的作用范围不同，而且无法导入此智能体的历史记录（历史记录保存在内部数据库中）。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/cursor-cli)

通过 [Hindsight](https://vectorize.io/hindsight) 为 [Cursor CLI](https://docs.cursor.com/en/cli/overview) 提供持久记忆。Python 钩子脚本会在每次提示前自动召回相关上下文，并在每轮对话后存入记忆，无需更改 Cursor 的工作流程。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)以获取 Hindsight Cloud API 密钥，无需自托管或管理本地守护进程。
:::

```bash
# 安装 CLI
pip install hindsight-cursor-cli

# 安装钩子（默认使用 Hindsight Cloud）
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

# 重启 Cursor CLI，即可使用记忆
```

安装程序会将钩子脚本复制到 `~/.cursor/hooks/cursor-cli/`，将条目合并写入 `~/.cursor/hooks.json`（保留其中已有条目），并创建 `~/.hindsight/cursor-cli.json` 作为个人配置文件。

**自托管方式**——省略标志即可连接到本地 `hindsight-embed` 守护进程：

```bash
hindsight-cursor-cli install
```

卸载：

```bash
hindsight-cursor-cli uninstall
```

## 功能 {#features}

- **自动召回**——每次提示前向 Hindsight 查询相关记忆，并将其作为额外上下文注入（模型可见，但不会出现在对话记录中）。
- **自动存入**——每次响应后以及会话结束时，都会将对话存入 Hindsight，供后续召回。
- **动态记忆库 ID**——支持根据工作目录隔离各项目的记忆。
- **按会话更新或插入**——使用会话 ID 作为文档 ID，因此重新运行同一会话时会更新已存内容，而不会创建重复内容。
- **零运行时依赖**——钩子脚本仅使用 Python 标准库；`pip install` 只会安装一次性安装程序。

## 架构 {#architecture}

该插件使用 Cursor CLI 的四种钩子事件：

| 钩子 | 事件 | 用途 |
|------|------|------|
| `session_start.py` | `sessionStart` | 预热：验证 Hindsight 是否可访问 |
| `recall.py` | `beforeSubmitPrompt` | **自动召回**：查询记忆并将其作为额外上下文注入 |
| `retain.py` | `stop` | **自动存入**：提取对话记录并异步 POST 到 Hindsight |
| `session_end.py` | `sessionEnd` | **最终写入**：强制存入记忆，避免丢失最后几轮对话 |

触发 `beforeSubmitPrompt` 时，钩子会读取提示，向 Hindsight 查询最相关的记忆，并注入上下文块。Cursor 会在将内容发送给模型前，把该块添加到对话中：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

触发 `stop`（以及之后的 `sessionEnd`）时，钩子会读取会话记录，移除之前注入的记忆标签（防止反馈循环），然后异步将对话 POST 到 Hindsight。

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

通过 `~/.hindsight/cursor-cli.json` 连接到正在运行的 Hindsight 服务器（云端或自托管）：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 本地守护进程 {#2-local-daemon}

在本地运行 `hindsight-embed`。`session_start.py` 钩子会在 `apiPort` 上检测它（默认值为 `9077`）。插件不会自动启动守护进程；请单独启动：

```bash
uvx hindsight-embed
```

然后将配置中的 `hindsightApiUrl` 留空，插件便会连接到 `http://localhost:9077`。

## 配置 {#configuration}

默认配置位于 `~/.cursor/hooks/cursor-cli/settings.json`。如需在更新后仍保留个人覆盖项，请创建 `~/.hindsight/cursor-cli.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（后面的设置优先）：

1. 内置默认值
2. 插件的 `settings.json`（位于 `~/.cursor/hooks/cursor-cli/settings.json`）
3. 用户配置（`~/.hindsight/cursor-cli.json`）
4. 环境变量

---

### 连接 {#connection}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `""` | Hindsight API 服务器的 URL。留空表示使用本地守护进程。 |
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | `null` | 用于身份验证的 API 令牌。使用 Hindsight Cloud 时必填。 |
| `apiPort` | `HINDSIGHT_API_PORT` | `9077` | 本地 `hindsight-embed` 守护进程使用的端口。 |

---

### 记忆库 {#memory-bank}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"cursor-cli"` | 要读取和写入的记忆库。除非启用 `dynamicBankId`，否则所有会话共用此记忆库。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 编码智能体提示 | 描述智能体的用途。创建或更新记忆库时会发送此说明。 |
| `retainMission` | — | 事实提取提示 | 为 Hindsight 的事实提取提供说明，即从编码对话中提取哪些内容。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 为 `true` 时，根据 `dynamicBankGranularity` 中的字段生成唯一的记忆库 ID，适用于按项目隔离。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 指定组合哪些字段来生成动态记忆库 ID。`"project"` 表示工作目录，`"agent"` 表示智能体名称。 |
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"cursor-cli"` | 用于推导动态记忆库 ID 的智能体名称。 |

---

### 自动召回 {#auto-recall}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回的总开关。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 检索深度：`"low"`（快速）、`"mid"`（均衡）、`"high"`（全面）。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回的记忆块中 token 数量的上限。 |
| `recallTypes` | — | `["world", "experience"]` | 要检索的记忆类型。 |
| `recallContextTurns` | `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | 构建召回查询时纳入的先前对话轮数。`1` 表示仅包含最新提示。 |

---

### 自动存入 {#auto-retain}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入的总开关。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | `"full-session"` 会发送整个会话的对话记录（按会话 ID 更新或插入）；`"chunked"` 会每隔 N 轮发送一个滑动窗口。 |
| `retainEveryNTurns` | — | `10` | 每 N 轮触发一次存入。`1` 表示每轮都触发。值越大，API 调用越少。 |
| `retainContext` | — | `"cursor-cli"` | 用于标识来源集成的标签。多个集成向同一记忆库写入时，此标签很有用。 |

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用向 stderr 输出详细日志。所有日志行都以 `[Hindsight]` 为前缀。 |

## 按项目隔离记忆 {#per-project-memory}

如需为每个项目使用独立的记忆库，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置时，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Cursor 会分别存储和召回记忆。记忆库 ID 根据工作目录路径生成。

## 故障排查 {#troubleshooting}

**钩子未触发**：确认 `~/.cursor/hooks.json` 存在，并且 shell 的 `$PATH` 中包含 `python3`。重新运行 `hindsight-cursor-cli install` 以重写钩子条目。

**未召回记忆**：只有存入内容后，Recall 才会返回结果。请先完成一次 Cursor 会话，再启动新的会话。

**记忆未存入**：`retainEveryNTurns` 的默认值为 `10`，因此 `stop` 钩子每 10 轮才触发一次存入。测试时，可在 `~/.hindsight/cursor-cli.json` 中添加 `"retainEveryNTurns": 1`。关闭会话时，`sessionEnd` 钩子也会强制执行最终存入。

**调试模式**：在 `~/.hindsight/cursor-cli.json` 中添加 `"debug": true`，即可查看 Hindsight 在每轮中的操作。
