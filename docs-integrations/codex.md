---
sidebar_position: 6
title: "使用 Hindsight 为 Codex CLI 添加持久记忆 | 集成指南"
description: "使用 Hindsight 为 OpenAI Codex CLI 添加持久记忆。三个 Python 钩子脚本会在每次提示词之前自动召回上下文，并存入对话，无需改变工作流程。"
---

# Codex

:::warning 已由 Coding Agents 插件取代
**Codex CLI 集成**已由 [编码智能体插件](/sdks/integrations/coding-agents)取代。一个软件包覆盖 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，每个仓库的所有智能体共享一个记忆库，而不是每个智能体一个记忆库。

本页面及已发布的软件包仍可使用，但不再开发。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install codex --import-conversations
```

只有两项内容迁移，其他设置不会迁移。

**服务器配置自动迁移。** `install` 读取 `~/.hindsight/codex.json`，保留相同的 `apiUrl` 和令牌；空 URL 仍表示本地守护进程，不会在未告知的情况下切换到 Hindsight Cloud。需要更改时传入 `--server`。

**对话通过 `--import-conversations` 从本地对话记录重新导入**为新文档，而不是从旧记忆库复制。旧记忆库默认由所有项目共享，文档仅记录会话 ID，因此要确定哪些记录属于当前仓库，本来就需要读取本地对话记录。

**其他内容不会迁移。** 旧 `recall*`、`retain*` 设置、任务说明和记忆库命名选项描述的是已被此软件包替换的流水线。命名也会变化：每个仓库一个记忆库，由所有智能体共享。参见[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


[查看更新日志 →](/changelog/integrations/codex)

通过 [Hindsight](https://vectorize.io/hindsight) 为 [Codex CLI](https://github.com/openai/codex) 提供持久记忆。三个 Python 钩子脚本在每次提示词之前自动召回相关上下文，并在每轮之后存入对话记录，无需改变 Codex 工作流程。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)获取 Hindsight Cloud API 密钥，无需自托管或管理本地守护进程。
:::

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash
```

安装程序会指导你选择云端或本地守护进程模式并配置连接。安装完成后，新建 Codex 会话即可使用记忆。

卸载方法：

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash -s -- --uninstall
```

## 功能 {#features}

- **自动召回** — 每次用户提交提示词时，查询 Hindsight 相关记忆并以 `additionalContext` 注入（对话记录中不可见，Codex 可见）
- **自动存入** — 每次 Codex 回答后，将对话记录存入 Hindsight，供以后召回
- **动态记忆库 ID** — 根据工作目录支持项目级记忆隔离
- **会话级 upsert** — 使用会话 ID 作为文档 ID，重新运行同一会话会更新内容而非产生重复
- **零依赖** — 仅使用 Python 标准库，无需 pip 安装

## 架构 {#architecture}

插件使用三个 Codex 钩子事件：

| 钩子 | 事件 | 用途 |
|------|-------|---------|
| `session_start.py` | `SessionStart` | 预热：确认 Hindsight 可访问 |
| `recall.py` | `UserPromptSubmit` | **自动召回**：查询记忆，以 `additionalContext` 注入 |
| `retain.py` | `Stop` | **自动存入**：提取对话记录，异步 POST 到 Hindsight |

在 `UserPromptSubmit` 时，钩子读取提示词，查询 Hindsight 中最相关的记忆，并输出 `hookSpecificOutput.additionalContext` 块。Codex 会将其放在对话开头，然后发送给模型：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

在 `Stop` 时，钩子读取会话记录，移除先前注入的记忆标签（防止反馈循环），并异步 POST 对话到 Hindsight。

## 连接模式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

连接运行中的 Hindsight 服务器（云端或自托管）：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 本地守护进程 {#2-local-daemon}

本地运行 `hindsight-embed`。`session_start.py` 钩子通过 `apiPort`（默认 `9077`）检测它。Codex 插件不会自动启动守护进程，请单独启动：

```bash
uvx hindsight-embed
```

然后在配置中将 `hindsightApiUrl` 留空，插件会连接 `http://localhost:9077`。

## 配置 {#configuration}

设置从 `~/.hindsight/codex.json` 加载，也可通过环境变量覆盖各项设置。

**加载顺序**（后加载项优先）：

1. 内置默认值
2. 插件 `settings.json`（位于 `~/.hindsight/codex/settings.json`）
3. 用户配置（`~/.hindsight/codex.json`）
4. 环境变量

---

### 连接 {#connection}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `""` | Hindsight API 服务器 URL。必需。 |
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | `null` | 身份验证 API 令牌。Hindsight Cloud 必需。 |
| `apiPort` | `HINDSIGHT_API_PORT` | `9077` | 本地 `hindsight-embed` 守护进程端口。 |

---

### 记忆库 {#memory-bank}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"codex"` | 读写的记忆库。除非启用 `dynamicBankId`，否则所有会话共享此库。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 编程助手提示词 | 描述智能体用途。创建或更新记忆库时发送。 |
| `retainMission` | — | 提取提示词 | Hindsight 事实提取指令：从编程对话中提取哪些内容。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 为 `true` 时，从 `dynamicBankGranularity` 字段派生唯一记忆库 ID，适合项目级隔离。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 动态记忆库 ID 组合的字段。`"project"` = 工作目录，`"agent"` = 智能体名称。 |
| `bankIdPrefix` | — | `""` | 添加到所有记忆库 ID 前面的前缀。 |
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"codex"` | 派生动态记忆库 ID 时使用的智能体名称。 |

---

### 自动记忆召回 {#auto-recall}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回总开关。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 搜索深度：`"low"`（快速）、`"mid"`（均衡）、`"high"`（全面）。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回记忆块中的最大 token 数。 |
| `recallTypes` | — | `["world", "experience"]` | 要检索的记忆类型。 |
| `recallContextTurns` | `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | 构造召回查询时包含的先前轮数。`1` = 仅最新提示词。 |
| `recallMaxQueryChars` | `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | `800` | 发送给 Hindsight 的查询最大字符数。 |
| `recallRoles` | — | `["user", "assistant"]` | 构造多轮查询时包含的角色。 |
| `recallPromptPreamble` | — | 内置值 | 注入上下文块中放在召回记忆上方的文本。 |

---

### 自动存入 {#auto-retain}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入总开关。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | `"full-session"` 发送每个会话的完整记录（按会话 ID 更新插入）。`"chunked"` 每 N 轮发送滑动窗口。 |
| `retainEveryNTurns` | — | `10` | 每 N 轮触发存入。`1` = 每轮。较高值减少 API 调用。 |
| `retainOverlapTurns` | — | `2` | 从上一块额外包含的轮数（仅分块模式）。 |
| `retainRoles` | — | `["user", "assistant"]` | 存储的对话记录中包含的角色。 |
| `retainTags` | — | `["{session_id}"]` | 存储文档附带的标签。`{session_id}` 在运行时替换。 |
| `retainMetadata` | — | `{}` | 存储文档附带的任意键值元数据。 |
| `retainContext` | — | `"codex"` | 标识来源集成的标签。多个集成写入同一记忆库时很有用。 |

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用输出到 stderr 的详细日志。所有日志行以 `[Hindsight]` 为前缀。 |

## 项目独立记忆 {#per-project-memory}

启用动态记忆库 ID，为每个项目提供独立记忆库：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Codex 会分别存储和召回记忆。记忆库 ID 根据工作目录路径派生。

## 故障排查 {#troubleshooting}

**钩子未触发**：确认 `~/.codex/config.toml` 的 `[features]` 下包含 `codex_hooks = true`。重新运行安装程序可自动修复。

**未召回记忆**：只有存储内容后，召回才会返回结果。先完成一次 Codex 会话，或使用[实践示例](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/codex-memory)手动初始化记忆库。

**记忆未存入**：`retainEveryNTurns` 默认 `10`，每 10 轮才触发存入。测试时在 `~/.hindsight/codex.json` 添加 `"retainEveryNTurns": 1`。

**调试模式**：在 `~/.hindsight/codex.json` 添加 `"debug": true`，查看 Hindsight 每轮执行的操作：

```
[Hindsight] Recalling from bank 'codex', query length: 42
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'codex', doc 'sess-abc123', 2 messages, 847 chars
```

**召回延迟高**：使用 `"recallBudget": "low"` 或降低 `recallMaxTokens`，加快召回查询。
