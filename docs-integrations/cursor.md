---
sidebar_position: 6
title: "使用 Hindsight 为 Cursor 提供持久记忆 | 集成"
description: "使用 Hindsight 为 Cursor 添加长期记忆。借助 Cursor 插件架构，在会话开始时自动召回相关上下文，并在每项任务完成后存入对话记录。"
---

# Cursor {#cursor}

使用 [Hindsight](https://vectorize.io/hindsight) 为 [Cursor](https://cursor.com) 提供仿生长期记忆。在每个会话开始时自动召回相关项目上下文，并在每项任务完成后存入对话记录；它适配 Cursor 基于钩子的插件架构，并通过 MCP 提供按需工具。

[查看更新日志 →](/changelog/integrations/cursor)

## 工作原理 {#how-it-works}

Hindsight 插件通过两种互补机制提供功能：

| | 插件钩子（自动） | MCP 工具（按需） |
|--|--------------------------|----------------------|
| **安装** | `pip install hindsight-cursor && hindsight-cursor init` | 由 `init` 自动配置 |
| **召回** | 会话开始时通过 `additionalContext` 注入记忆 | 智能体在会话中调用 `recall` 工具 |
| **存入** | 任务停止时自动执行 | 智能体显式调用 `retain` 工具 |
| **反思** | 钩子不可用 | 可作为工具使用 |
| **适用场景** | 无需用户干预的常驻项目记忆 | 定向查询和显式记忆操作 |

运行一条 `hindsight-cursor init` 命令即可完成两种机制的设置。如果只需要钩子，可使用 `--no-mcp` 跳过 MCP 集成。

## 快速开始 {#quick-start}

```bash
# 1. 安装插件
pip install hindsight-cursor
cd /path/to/your-project

# 2a. 连接到 Hindsight Cloud（最快，无需本地服务器）
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_HINDSIGHT_API_TOKEN

# 2b. 或连接到本地 Hindsight 服务器
hindsight-cursor init --api-url http://localhost:8888

# 3. 完全退出并重新打开 Cursor——插件会在启动时加载
```

在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 注册以获取令牌，或使用 Docker 在本地启动 Hindsight：

```bash
export OPENAI_API_KEY=your-key
docker run --rm -it --pull always -p 8888:8888 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

### `init` 会做什么 {#what-init-does}

- 将插件文件复制到 `.cursor-plugin/hindsight-memory/`。
- 写入或合并项目的 `.cursor/hooks.json`，以便 Cursor 注册这些钩子。Cursor 只会从 `.cursor/hooks.json`（工作区）或 `~/.cursor/hooks.json`（用户）加载钩子；仅将文件放在 `.cursor-plugin/` 下还不够。已有钩子会保留；再次运行 `init` 时，只会替换 Hindsight 自己的条目。
- 创建 `~/.hindsight/cursor.json` 并写入连接设置（仅当该文件尚不存在时）。
- 写入 `.cursor/mcp.json`，配置供按需工具使用的 Hindsight MCP 端点。
- 使用 `--force` 覆盖现有安装。
- 使用 `--no-mcp` 跳过 MCP 配置。

`hindsight-cursor uninstall` 会撤销上述所有更改：移除插件目录、Hindsight 在 `.cursor/hooks.json` 中的条目、MCP 服务器条目、生成的会话规则文件及其 `.gitignore` 条目。

:::caution
如果要在已经打开的工作区中添加插件，请**完全退出 Cursor，然后重新打开**。插件在启动时加载；仅重新加载窗口并不足够。
:::

## 功能 {#features}

- **会话记忆召回**：每个会话开始时，查询 Hindsight 以查找相关项目记忆，并通过 `additionalContext` 将它们作为上下文注入（聊天中不可见，智能体可见）。
- **自动存入**：每项任务完成后，提取对话内容并存入 Hindsight，以供长期存储。
- **按需 MCP 工具**：提供 `recall`、`retain` 和 `reflect` 工具，用于在会话中显式执行记忆操作。
- **按需召回技能**：使用 `hindsight-recall` 技能手动查询记忆。
- **守护进程管理**：可在本地自动启动和停止 `hindsight-embed`，也可连接到外部 Hindsight 服务器。
- **动态记忆库 ID**：支持按智能体、项目或会话隔离记忆。
- **零运行时依赖**：插件脚本仅使用 Python 标准库。

## 架构 {#architecture}

该插件使用 Cursor 的钩子系统：

| 钩子 | 事件 | 用途 |
|------|-------|---------|
| `session_start.py` | `sessionStart` | **会话记忆召回**：查询记忆，并注入为 `additionalContext` |
| `retain.py` | `stop` | **自动存入**：提取对话记录，并通过 POST 发送到 Hindsight |
| `retain.py` | `sessionEnd` | **最终写入**：存入轮次窗口此前未处理的内容 |

新的 Cursor 会话开始时，`sessionStart` 钩子会触发一次。它会执行广泛的项目级记忆召回，并将相关记忆作为隐藏上下文注入。

`retain.py` 也会在 `sessionEnd` 时运行。如果没有这个钩子，所有短于 `retainEveryNTurns` 的对话都会彻底丢失：默认值为 10 时，一段 7 轮的聊天会触发 7 次 `stop`，但轮次门控会拒绝这 7 次写入，最终整段会话都不会被存入。`sessionEnd` 会绕过轮次窗口，因此会话末尾的内容总能被存入。插件会跟踪每个会话中已经存入的对话消息数，因此这两个事件之间的重叠内容不会被重复存入。

`init` 命令还会配置 Cursor 的 MCP 支持（`.cursor/mcp.json`），以连接 Hindsight 的 MCP 端点，并为智能体提供 `recall`、`retain` 和 `reflect` 工具，供会话中调用。

此外，插件还提供：
- **技能**（`hindsight-recall`）：按需查询记忆。
- **规则**（`hindsight-memory.mdc`）：始终生效的规则，指示智能体利用召回的记忆和 MCP 工具。

## 连接模式 {#connection-modes}

### 1. 外部 API（建议用于生产环境） {#1-external-api-recommended-for-production}

连接到正在运行的 Hindsight 服务器（云服务或自托管服务器）。无需本地 LLM，事实提取由服务器处理。

```json
{
  "hindsightApiUrl": "https://your-hindsight-server.com",
  "hindsightApiToken": "your-token"
}
```

### 2. 本地守护进程（自动管理） {#2-local-daemon-auto-managed}

插件会通过 `uvx` 自动启动和停止 `hindsight-embed`。本地提取事实需要 LLM 服务提供方的 API 密钥。

设置 LLM 服务提供方：
```bash
export OPENAI_API_KEY="sk-your-key"
# 或
export ANTHROPIC_API_KEY="your-key"
```

Hindsight API 会自动选择模型。要指定其他模型，请设置 `HINDSIGHT_LLM_MODEL`。

### 3. 已有本地服务器 {#3-existing-local-server}

如果 `hindsight-embed` 已在运行，请将 `hindsightApiUrl` 留空，并设置 `apiPort` 以匹配服务器端口。插件会自动检测该服务器。

## 配置 {#configuration}

所有设置都位于 `~/.hindsight/cursor.json` 中。每项设置也可以通过环境变量覆盖。插件提供了合理的默认值；你只需配置想要更改的项目。

**加载顺序**（越靠后的优先级越高）：
1. 内置默认值（硬编码在插件中）
2. 插件的 `settings.json`（随插件提供，路径为 `CURSOR_PLUGIN_ROOT/settings.json`）
3. 用户配置（`~/.hindsight/cursor.json`，建议在此设置自定义项）
4. 环境变量

---

### 连接与守护进程 {#connection--daemon}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `""`（空字符串） | 外部 Hindsight API 服务器的 URL。为空时，插件会改用本地守护进程。 |
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | `null` | 外部 API 的身份验证令牌。仅当设置了 `hindsightApiUrl` 时才需要。 |
| `apiPort` | `HINDSIGHT_API_PORT` | `9077` | 本地 `hindsight-embed` 守护进程使用的端口。 |
| `embedVersion` | `HINDSIGHT_EMBED_VERSION` | `"latest"` | 要通过 `uvx` 安装的 `hindsight-embed` 版本。 |
| `embedPackagePath` | `HINDSIGHT_EMBED_PACKAGE_PATH` | `null` | 开发时使用的本地 `hindsight-embed` 检出目录路径。 |

---

### LLM 服务提供方（仅限本地守护进程） {#llm-provider-local-daemon-only}

这些设置用于配置本地守护进程通过哪个 LLM 提取事实。连接到外部 API 时，这些设置**会被忽略**。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `llmProvider` | `HINDSIGHT_LLM_PROVIDER` | 自动检测 | LLM 服务提供方：`openai`、`anthropic`、`gemini`、`groq`、`ollama`。系统通过检查 API 密钥环境变量自动检测。 |
| `llmModel` | `HINDSIGHT_LLM_MODEL` | 服务提供方默认值 | 覆盖所选服务提供方的默认模型。 |
| `llmApiKeyEnv` | — | 服务提供方标准名称 | 非标准情况下，存放 API 密钥的环境变量名称。 |

---

### 记忆库 {#memory-bank}

**记忆库**是一个相互隔离的记忆存储空间，就像独立的“大脑”。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"cursor"` | 当 `dynamicBankId` 为 `false` 时使用的记忆库 ID。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 通用助手提示词 | 对智能体身份和用途的描述。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 为 `true` 时，根据上下文字段派生唯一的记忆库 ID（参见 `dynamicBankGranularity`）。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 用于组合生成动态记忆库 ID 的字段：`agent`、`project`、`session`、`channel`、`user`。 |
| `bankIdPrefix` | — | `""` | 添加到所有记忆库 ID 前面的字符串，用于命名空间隔离。 |
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"cursor"` | 动态记忆库 ID 派生时，`agent` 字段使用的名称。 |

---

### 会话记忆召回 {#session-recall}

每个会话开始时都会执行一次会话记忆召回。它会查询 Hindsight 以查找相关项目记忆，并将记忆作为不可见的 `additionalContext` 注入智能体上下文。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 会话记忆召回的总开关。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 搜索力度：`"low"`、`"mid"`、`"high"`。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回记忆块的最大 token 数。 |
| `recallTypes` | — | `["world", "experience"]` | 要检索的记忆类型。 |
| `recallMaxQueryChars` | `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | `800` | 查询的最大字符数。 |

---

### 自动存入 {#auto-retain}

智能体完成任务后会执行自动存入。该功能会提取对话记录并将其发送到 Hindsight。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入的总开关。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | 存入策略：`"full-session"` 或 `"chunked"`。 |
| `retainEveryNTurns` | `HINDSIGHT_RETAIN_EVERY_N_TURNS` | `10` | 存入频率。`1` 表示每轮都存入。 |
| `retainOverlapTurns` | — | `2` | 为保持上下文连贯，从前一个分块中额外纳入的轮次数。 |
| `retainContext` | `HINDSIGHT_RETAIN_CONTEXT` | `"cursor"` | 存入记忆的来源标签。 |
| `retainToolCalls` | — | `false` | 是否在存入的对话记录中包含工具调用。 |

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用详细日志，并将其写入 stderr。日志前缀为 `[Hindsight]`。 |

## 验证插件钩子 {#verifying-plugin-hooks}

每次调用钩子时，插件都会写入状态文件，即使没有找到记忆或跳过了存入操作。检查这些文件即可确认钩子是否正常触发：

```bash
# 未设置 CURSOR_PLUGIN_DATA 时的默认位置：
cat ~/.hindsight/cursor-state/state/last_recall.json
cat ~/.hindsight/cursor-state/state/last_retain.json
```

每个文件包含：
- `saved_at`：上次调用的时间戳。
- `status`：`success`、`empty`、`skipped` 或 `error` 之一。
- `bank_id`：所用的记忆库（在 `success` 和 `empty` 状态下存在）。
- `mode`：始终为 `plugin`。
- `hook`：记忆召回时为 `sessionStart`。
- `result_count`（记忆召回）或 `message_count`（存入）字段（在 `success` 状态下存在）。

如果使用 Cursor 时 `saved_at` 有更新，说明钩子正在触发。查看 `status` 可了解发生了什么。

## 故障排查 {#troubleshooting}

**插件未激活**：检查插件目录中是否存在 `.cursor-plugin/plugin.json`。在 `~/.hindsight/cursor.json` 中启用 `"debug": true`，并检查 stderr 输出。

**智能体窗口中显示 “Ran Recall in hindsight”？** 这是 MCP，不是插件。基于插件的记忆召回是静默的——它通过 `additionalContext` 注入上下文，不会显示工具调用。如果看到明确的 Hindsight 工具调用，说明已在 `.cursor/mcp.json` 中配置 MCP。两种方式可以同时使用。

**召回没有返回记忆**：确认 Hindsight 服务器可访问（`curl http://localhost:9077/health`）。记忆库至少需要完成一个存入周期。

**守护进程无法启动**：确保已设置 LLM API 密钥。查看 `~/.hindsight/profiles/cursor.log` 中的守护进程日志。

**会话开始时延迟较高**：会话记忆召回钩子的超时为 15 秒。可使用 `recallBudget: "low"` 或减小 `recallMaxTokens`。
