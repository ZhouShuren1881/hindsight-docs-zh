---
sidebar_position: 7
title: "GitHub Copilot CLI 与 Hindsight 持久记忆 | 集成指南"
description: "通过 Hindsight 为 GitHub Copilot CLI 添加持久记忆。Python 钩子脚本会在会话开始时自动召回上下文并存入对话，无需更改工作流程。"
---

# GitHub Copilot CLI {#github-copilot-cli}

:::warning 已由 Coding Agents 插件取代
**GitHub Copilot CLI 集成** 已由 [Coding Agents 插件](/sdks/integrations/coding-agents) 取代。该插件将 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体整合在一个包中，并让同一存储库中的智能体共享一个记忆库，而不是每个智能体各用一个记忆库。

此页面介绍的集成和已发布的软件包仍可使用，但已停止开发。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install copilot-cli
```

记忆不会自动迁移：两种集成的记忆库范围不同，而且无法导入此智能体的历史记录（这些记录保存在内部数据库中）。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

通过 [Hindsight](https://vectorize.io/hindsight) 为 [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks) 添加持久记忆。Python 钩子脚本会在会话开始时自动召回相关上下文（也会为 Copilot CLI 启动的每个子智能体召回），并在对话进行时将其存入记忆，无需更改 Copilot CLI 的工作流程。

[查看更新日志 →](/changelog/integrations/copilot-cli)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 Hindsight Cloud API 密钥，无需自托管，也无需管理本地守护进程。
:::

```bash
# 安装 CLI
pip install hindsight-copilot-cli

# 安装钩子（默认使用 Hindsight Cloud）
hindsight-copilot-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

# 重启 Copilot CLI，即可使用记忆
```

安装程序会将钩子脚本复制到 `~/.copilot/hindsight-copilot-cli/`，在 `~/.copilot/hooks/hindsight-copilot-cli.json` 写入独立配置文件（Copilot CLI 会加载其钩子目录中的每个 `*.json` 文件，因此无需与其他工具的钩子文件合并），并创建 `~/.hindsight/copilot-cli.json` 作为个人配置。

**自托管方案**：省略参数即可连接本地 `hindsight-embed` 守护进程：

```bash
hindsight-copilot-cli install
```

卸载方法：

```bash
hindsight-copilot-cli uninstall
```

### 在存储库级别安装 {#repo-level-install}

如果要将团队共享的配置提交到版本控制，请改为在存储库级别注册钩子：

```bash
hindsight-copilot-cli install --scope repo
```

这会在当前存储库中写入 `.github/hooks/hindsight-copilot-cli.json`。钩子脚本仍会安装到每台机器各自的 `~/.copilot/hindsight-copilot-cli/`，因此令牌必须来自 `HINDSIGHT_API_TOKEN` 环境变量，不能放在提交的文件中。

## 功能 {#features}

- **会话开始时自动召回**：Copilot CLI 会话开始时，查询 Hindsight 获取相关记忆，并将其作为补充上下文注入。如果存在排队的 `initialPrompt`，就用它发起查询；否则根据工作目录生成通用的项目上下文查询。
- **为子智能体自动召回**：Copilot CLI 内置的子智能体（`explore`、`task`、`research`、`code-review`、`rubber-duck`、`security-review` 和自定义智能体）在各自隔离的上下文中运行，默认不会获得会话开始时注入的记忆。`subagentStart` 钩子也会为它们提供项目的基础记忆。
- **自动存入记忆**：每回合结束后（遵循 `retainEveryNTurns` 的间隔），以及会话结束时，都会将对话存入 Hindsight，供以后召回。
- **动态记忆库 ID**：支持根据工作目录隔离每个项目的记忆。
- **按会话更新或插入**：使用会话 ID 作为文档 ID，因此重新运行同一会话时会更新已有内容，而不是重复存入。
- **无需运行时依赖**：钩子脚本仅使用 Python 标准库；`pip install` 只安装一次性安装程序。

## 架构 {#architecture}

该插件使用 Copilot CLI 的四种钩子事件：

| 钩子 | 事件 | 用途 |
|------|-------|------|
| `session_start.py` | `sessionStart` | **自动召回**：使用初始提示（或项目上下文回退查询）查询记忆，并将结果作为补充上下文注入 |
| `subagent_start.py` | `subagentStart` | **为子智能体自动召回**：使用项目上下文回退查询记忆（子智能体负载不包含任务文本），并将结果作为补充上下文注入 |
| `agent_stop.py` | `agentStop` | **自动存入记忆**：读取会话记录，按 `retainEveryNTurns` 的间隔处理，并异步向 Hindsight 发送 POST 请求；同时缓存会话记录路径，供 `sessionEnd` 使用 |
| `session_end.py` | `sessionEnd` | **最终写入**：使用最近一次 `agentStop` 缓存的会话记录路径，强制存入记忆，因为 `sessionEnd` 的负载本身不包含会话记录路径 |

在 `sessionStart` 事件中，钩子会查询 Hindsight 找出最相关的记忆，并注入一个由 Copilot CLI 添加到会话中的上下文块：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

Copilot CLI 启动的每个子智能体都会触发 `subagentStart`，内置的 `general-purpose` 智能体除外（它不会发出此事件）。钩子会注入相同类型的上下文块，并将其放在子智能体提示的开头。

触发 `agentStop` 时（以及之后触发 `sessionEnd` 时），钩子会读取会话记录，移除先前注入的记忆标签以防止反馈循环，然后异步向 Hindsight 发送对话。

:::note 记忆召回不会在每回合刷新
与某些其他集成不同，Copilot CLI 的 `userPromptSubmitted` 和 `preToolUse` 钩子不支持注入补充上下文。因此，每个会话只会在 `sessionStart` 时召回一次记忆，每个子智能体也只会在 `subagentStart` 时召回一次，不会在每回合刷新。这样能让集成保持简单可靠，但代价是会话进行期间不会获取新记忆。
:::

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

通过 `~/.hindsight/copilot-cli.json` 连接到正在运行的 Hindsight 服务器（云端或自托管）：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 本地守护进程 {#2-local-daemon}

在本地运行 `hindsight-embed`。`session_start.py` 钩子会在 `apiPort` 指定的端口上检测它（默认值为 `9077`）。插件不会自动启动守护进程，需要单独启动：

```bash
uvx hindsight-embed
```

然后在配置中将 `hindsightApiUrl` 留空，插件便会连接到 `http://localhost:9077`。

## 配置 {#configuration}

默认配置随插件提供，位于 `~/.copilot/hindsight-copilot-cli/settings.json`。如需设置更新后仍会保留的个人覆盖项，请创建 `~/.hindsight/copilot-cli.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（后加载的设置优先）：

1. 内置默认值
2. 插件的 `settings.json`（位于 `~/.copilot/hindsight-copilot-cli/settings.json`）
3. 用户配置（`~/.hindsight/copilot-cli.json`）
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
| `bankId` | `HINDSIGHT_BANK_ID` | `"copilot-cli"` | 要读取和写入的记忆库。除非启用 `dynamicBankId`，否则所有会话共用此记忆库。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 编码助手提示 | 描述智能体的用途。创建或更新记忆库时会发送此内容。 |
| `retainMission` | — | 提取提示 | 指导 Hindsight 提取事实，说明应从编码对话中提取哪些内容。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 设为 `true` 时，根据 `dynamicBankGranularity` 中的字段生成唯一的记忆库 ID，便于按项目隔离。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 指定用于组合生成动态记忆库 ID 的字段。`"project"` 表示工作目录，`"agent"` 表示智能体名称。 |
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"copilot-cli"` | 用于推导动态记忆库 ID 的智能体名称。 |

---

### 自动召回 {#auto-recall}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回总开关，同时控制 `sessionStart` 和 `subagentStart`。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 检索深度：`"low"`（快速）、`"mid"`（均衡）、`"high"`（全面）。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回的记忆块中的最大 token 数。 |
| `recallTypes` | — | `["world", "experience"]` | 要检索的记忆类型。 |
| `recallFallbackQueryTemplate` | — | 项目上下文提示 | 没有特定提示或任务文本时使用的查询，例如交互式 `sessionStart` 没有排队的提示，或发生任何 `subagentStart` 时。 |

---

### 自动存入记忆 {#auto-retain}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入记忆的总开关。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | `"full-session"` 会发送每个会话的完整记录（按会话 ID 更新或插入）；`"chunked"` 会每隔 N 回合发送一个滑动窗口。 |
| `retainEveryNTurns` | — | `10` | 每 N 回合触发一次存入操作。`1` 表示每回合执行一次。值越大，API 调用越少。 |
| `retainContext` | — | `"copilot-cli"` | 标识来源集成的标签。多个集成向同一记忆库写入内容时，此标签会很有用。 |

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用写入 stderr 的详细日志。所有日志行都以 `[Hindsight]` 为前缀。 |

## 每个项目使用独立记忆 {#per-project-memory}

如需为每个项目使用各自独立的记忆库，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置时，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Copilot CLI，会分别存入和召回各自的记忆。记忆库 ID 根据工作目录路径生成。

## 故障排查 {#troubleshooting}

**钩子未触发**：检查 `~/.copilot/hooks/hindsight-copilot-cli.json`（或存储库级配置中的 `.github/hooks/hindsight-copilot-cli.json`）是否为有效 JSON。Copilot CLI 会在启动时加载钩子配置，因此安装或更新钩子后要重启 CLI。

**没有召回记忆**：只有在至少存入一些内容后，召回才会返回结果。先完成一次 Copilot CLI 会话，再启动新会话。

**记忆没有存入**：`retainEveryNTurns` 的默认值为 `10`，因此 `agentStop` 钩子每 10 回合才会触发一次存入操作。测试时，可将 `"retainEveryNTurns": 1` 添加到 `~/.hindsight/copilot-cli.json`。会话结束时，`sessionEnd` 钩子也会强制执行最后一次存入操作。

**调试模式**：将 `"debug": true` 添加到 `~/.hindsight/copilot-cli.json`，即可查看 Hindsight 在每回合执行的操作。
