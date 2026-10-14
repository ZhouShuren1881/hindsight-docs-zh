---
sidebar_position: 35
title: "OMO (oh-my-openagent) 与 Hindsight 的持久记忆 | 集成指南"
description: "使用 Hindsight 为 oh-my-openagent (OMO) 添加持久记忆。五个生命周期钩子会在每次提示前自动召回上下文，并在每轮对话后存入对话内容，无需更改工作流程。"
---

# OMO (oh-my-openagent) {#omo-oh-my-openagent}

[查看更新日志 →](/changelog/integrations/omo)

借助 [Hindsight](https://vectorize.io/hindsight)，为 [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)（OMO）提供持久记忆。五个生命周期钩子会在每次提示前自动召回相关上下文，并在每轮对话后存入对话内容，无需更改 OMO 工作流程。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)，获取 Hindsight Cloud API 密钥；无需自行托管，也无需管理本地守护进程。
:::

在 `hindsight-integrations/omo/` 目录中运行：

```bash
# 钩子（全局）
mkdir -p ~/.omo/hooks
cp hooks/hooks.json ~/.omo/hooks/hindsight-hooks.json

# 脚本和设置（全局）
mkdir -p ~/.omo/plugins/hindsight/scripts
cp -r scripts/ ~/.omo/plugins/hindsight/scripts/
cp settings.json ~/.omo/plugins/hindsight/settings.json

# 规则（每个项目单独配置；从项目根目录运行）
mkdir -p .omo/rules
cp rules/hindsight-memory.md .omo/rules/hindsight-memory.md
```

然后设置 API 密钥：

```bash
export HINDSIGHT_API_TOKEN=hsk_your_key_here
```

在 OMO 的 `~/.config/opencode/oh-my-openagent.jsonc` 允许列表中添加环境变量：

```jsonc
{
  "mcp_env_allowlist": [
    "HINDSIGHT_API_URL",
    "HINDSIGHT_API_TOKEN",
    "HINDSIGHT_BANK_ID"
  ]
}
```

启动新的 OMO 会话后，记忆即可使用。

## 功能 {#features}

- **自动召回** — 每次收到用户提示时，都会向 Hindsight 查询相关记忆，并将其注入为 `additionalContext`（对转录记录不可见，对 OMO 可见）
- **自动存入** — 每次 OMO 响应结束以及子智能体停止后，都会将对话转录记录存入 Hindsight，供以后召回
- **捕获子智能体内容** — `SubagentStop` 钩子会捕获 OMO 委派的子智能体（Claude Code、Codex、OpenCode）的经验
- **动态记忆库 ID** — 支持根据工作目录为每个项目隔离记忆
- **按会话更新或插入** — 使用会话 ID 作为文档 ID，因此再次运行同一会话会更新已存内容，而不是创建重复内容
- **优先使用云端** — 默认使用 Hindsight Cloud，无需管理本地守护进程
- **零依赖** — 仅使用 Python 标准库，无需通过 pip 安装

## 架构 {#architecture}

该插件使用五种 OMO 钩子事件：

| 钩子 | 事件 | 用途 |
|------|-------|---------|
| `session_start.py` | `SessionStart` | 预热：确认 Hindsight 可以访问 |
| `recall.py` | `UserPromptSubmit` | **自动召回** — 查询记忆，并注入为 `additionalContext` |
| `retain.py` | `Stop` | **自动存入** — 提取转录记录并异步 POST 到 Hindsight |
| `retain.py` | `SubagentStop` | **存入子智能体内容** — 捕获受委派子智能体的经验 |
| `session_end.py` | `SessionEnd` | 为较短的会话强制执行最后一次存入 |

收到 `UserPromptSubmit` 事件时，钩子会读取提示，向 Hindsight 查询最相关的记忆，并输出 `hookSpecificOutput.additionalContext` 内容块。OMO 会在将对话发送给模型之前，把这段内容添加到对话中：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-06-08 14:30

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-06-07)
- Preferred testing framework: pytest with pytest-asyncio [experience] (2026-06-07)
</hindsight_memories>
```

收到 `Stop` 和 `SubagentStop` 事件时，钩子会读取会话转录记录，移除先前注入的记忆标签（以防止反馈循环），然后异步 POST 对话内容到 Hindsight。

## 连接方式 {#connection-modes}

### 1. Hindsight Cloud（推荐） {#1-hindsight-cloud-recommended}

除 API 密钥外无需额外设置：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 自托管 {#2-self-hosted}

将地址指向你自己的 Hindsight 实例：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
```

也可以在 `~/.hindsight/omo.json` 中设置：

```json
{
  "hindsightApiUrl": "http://localhost:8888"
}
```

本地实例无需 API 令牌。

## 配置 {#configuration}

设置按以下顺序从三个来源加载，后加载的来源优先：

1. 插件的 `settings.json`（已预设云端 URL）
2. 用户配置（`~/.hindsight/omo.json`）
3. `HINDSIGHT_*` 环境变量

---

### 连接 {#connection}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` | API 端点。 |
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | — | 用于身份验证的 API 密钥。Hindsight Cloud 必须设置此项。 |

---

### 记忆库 {#memory-bank}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"omo"` | 用于读取和写入的记忆库。除非启用 `dynamicBankId`，否则所有会话共用此记忆库。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | OMO 编排器提示 | 描述智能体的用途。创建或更新记忆库时会发送此内容。 |
| `retainMission` | — | 提取提示 | 为 Hindsight 的事实提取提供说明。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 设为 `true` 时，根据 `dynamicBankGranularity` 字段生成唯一的记忆库 ID。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 用于组合生成动态记忆库 ID 的字段。`"project"` 表示工作目录，`"agent"` 表示智能体名称。 |
| `bankIdPrefix` | — | `""` | 添加到所有记忆库 ID 前面的前缀。 |

---

### 自动召回 {#auto-recall}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回的总开关。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 检索深度：`"low"`（快速）、`"mid"`（均衡）、`"high"`（全面）。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回记忆块的最大 token 数。 |
| `recallTypes` | — | `["world", "experience"]` | 要检索的记忆类型。 |
| `recallContextTurns` | `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | 构建召回查询时纳入的先前对话轮数。`1` 表示仅使用最新提示。 |
| `recallMaxQueryChars` | `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | `800` | 发送给 Hindsight 的查询最多包含的字符数。 |
| `recallRoles` | — | `["user", "assistant"]` | 构建多轮查询时纳入的角色。 |
| `recallPromptPreamble` | — | 内置 | 放在注入上下文块中已召回记忆上方的文本。 |

---

### 自动存入 {#auto-retain}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入的总开关。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | `"full-session"` 会发送每个会话的完整转录记录。`"chunked"` 会每隔 N 轮发送一个滑动窗口。 |
| `retainEveryNTurns` | — | `10` | 每经过 N 轮触发一次存入。`1` 表示每轮都触发。数值越大，API 调用越少。 |
| `retainOverlapTurns` | — | `2` | 纳入前一个分块的额外对话轮数（仅适用于分块模式）。 |
| `retainRoles` | — | `["user", "assistant"]` | 转录记录中要纳入的角色。 |
| `retainTags` | — | `["{session_id}"]` | 附加到存储文档的标签。`{session_id}` 会在运行时替换。 |
| `retainMetadata` | — | `{}` | 附加到存储文档的任意键值元数据。 |
| `retainContext` | — | `"omo"` | 用于标识来源集成的标签。 |

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用向 stderr 输出详细日志。所有日志行都以 `[Hindsight]` 为前缀。 |

## 每个项目使用独立记忆 {#per-project-memory}

若要为每个项目使用独立的记忆库，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置时，在 `~/projects/api` 和 `~/projects/frontend` 中运行 OMO，会分别存取记忆。记忆库 ID 根据工作目录路径生成（例如 `omo::api`、`omo::frontend`）。

## 多记忆库召回 {#multi-bank-recall}

在主记忆库之外，同时查询其他记忆库：

```json
{
  "recallAdditionalBanks": ["shared-team-knowledge"]
}
```

## 故障排查 {#troubleshooting}

**没有召回任何记忆**：只有在存入过内容后，Recall 才会返回结果。先完成一个 OMO 会话，再启动新会话以查看记忆。

**没有存储记忆**：`retainEveryNTurns` 的默认值为 `10`，因此每 10 轮才触发一次存入。测试时，可在 `~/.hindsight/omo.json` 中添加 `"retainEveryNTurns": 1`。

**云端模式静默跳过**：如果 `hindsightApiUrl` 指向 Hindsight Cloud，但未设置 `hindsightApiToken`，钩子会静默跳过。请设置 `HINDSIGHT_API_TOKEN`，或将令牌添加到 `~/.hindsight/omo.json`。

**调试模式**：在 `~/.hindsight/omo.json` 中添加 `"debug": true`，即可查看 Hindsight 在每轮对话中的操作：

```
[Hindsight] Recalling from bank 'omo', query length: 42
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'omo', doc 'sess-abc123', 2 messages, 847 chars
```
