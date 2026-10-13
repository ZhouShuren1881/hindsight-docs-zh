---
sidebar_position: 35
title: "OMO (oh-my-openagent) 与 Hindsight 的持久记忆 |集成指南"
description: "使用 Hindsight 将持久记忆添加到 oh-my-openagent (OMO)。在每个提示和记忆存储对话之前，五个生命周期会自动挂钩记忆召回上下文 - 无需更改工作流程。"
---

# OMO（哦我的开放代理） {#omo-oh-my-openagent}

[查看更新日志 →](/changelog/integrations/omo)

持久记忆[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) (OMO) 使用 [Hindsight](https://vectorize.io/hindsight)。五个生命周期会在每个提示之前自动挂钩记忆召回相关上下文，并在每个回合之后自动挂钩记忆存储对话 - 无需更改 OMO 工作流程。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 对于Hindsight Cloud API 密钥 — 无自托管，无需管理本地守护进程。
:::

来自 `hindsight-integrations/omo/`目录：

```bash
# Hooks (global)
mkdir -p ~/.omo/hooks
cp hooks/hooks.json ~/.omo/hooks/hindsight-hooks.json

# Scripts + settings (global)
mkdir -p ~/.omo/plugins/hindsight/scripts
cp -r scripts/ ~/.omo/plugins/hindsight/scripts/
cp settings.json ~/.omo/plugins/hindsight/settings.json

#规则（每个项目 - 从项目根运行）
mkdir -p .omo/rules
cp rules/hindsight-memory.md .omo/rules/hindsight-memory.md
```

然后设置你的API 密钥：

```bash
export HINDSIGHT_API_TOKEN=hsk_your_key_here
```

将环境变量添加到 中的 OMO 允许列表 `~/.config/opencode/oh-my-openagent.jsonc`：

```jsonc
{
  "mcp_env_allowlist": [
    "HINDSIGHT_API_URL",
    "HINDSIGHT_API_TOKEN",
    "HINDSIGHT_BANK_ID"
  ]
}
```

开始新的 OMO 会话 — 记忆已上线。

## 功能 {#features}

- **自动记忆召回** — 每个用户提示、查询Hindsight获取相关记忆并将其注入为 `additionalContext`（对转录本不可见，对 OMO 可见）
- **自动记忆存储** — 每次 OMO 响应和子智能体停止后，将对话记录存储到Hindsight未来记忆召回
- **捕获子智能体内容** — `SubagentStop` 钩子捕获来自 OMO 委托子智能体的学习（Claude Code，Codex,OpenCode)
- **动态记忆库 ID** — 支持基于工作目录的每个项目记忆隔离
- **会话级更新或插入** — 使用会话 ID 作为文档 ID，因此重新运行相同的会话会更新而不是重复存储的内容
- **优先使用云端** — 默认为Hindsight无需管理本地守护进程的云
- **无依赖** — 纯净Python标准库，没有pip需要安装

## 架构 {#architecture}

该插件使用五个 OMO 挂钩事件：

|挂钩|活动|目的|
|------|-------|---------|
|`session_start.py`|`SessionStart`|热身 — 验证 Hindsight 可达|
|`recall.py`|`UserPromptSubmit`|**自动记忆召回** — 查询记忆，注入为 `additionalContext`|
|`retain.py`|`Stop`|**自动记忆存储** — 提取文字记录，发布到Hindsight（异步）|
|`retain.py`|`SubagentStop`|**存储子智能体记忆** — 捕获委托的子智能体学习|
|`session_end.py`|`SessionEnd`|强制短期记忆存储|

开`UserPromptSubmit`，钩子读取提示，查询Hindsight获取最相关的记忆，并输出 `hookSpecificOutput.additionalContext`块。 OMO 在将其发送到模型之前将其添加到对话中：

```
<hindsight_memories>
以往对话中的相关记忆...
当前时间 - 2026-06-08 14:30

- 项目使用 FastAPI 与 asyncpg，而非 SQLAlchemy [world] (2026-06-07)
- 首选测试框架：pytest 与 pytest-asyncio [experience] (2026-06-07)
</hindsight_memories>
```

开`Stop` 和 `SubagentStop`，钩子读取会话记录，剥离之前注入的记忆标签（以防止反馈循环），并将对话发布到Hindsight异步。

## 连接方式 {#connection-modes}

### 1。 Hindsight Cloud（推荐） {#1-hindsight-cloud-recommended}

API 密钥之外无设置：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2。自托管 {#2-self-hosted}

指向你自己的Hindsight实例：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
```

或在`~/.hindsight/omo.json`：

```json
{
  "hindsightApiUrl": "http://localhost:8888"
}
```

本地实例不需要API令牌。

## 配置 {#configuration}

设置按顺序从三个来源加载（稍后获胜）：

1. 插件`settings.json`（云端URL预设）
2. 用户配置（`~/.hindsight/omo.json`)
3. `HINDSIGHT_*`环境变量

---

### 连接 {#connection}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`hindsightApiUrl`|`HINDSIGHT_API_URL`|`https://api.hindsight.vectorize.io`|API 端点。|
|`hindsightApiToken`|`HINDSIGHT_API_TOKEN`|—|API 用于身份验证的密钥。 Hindsight Cloud所需。|

---

### 记忆库 {#memory-bank}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`bankId`|`HINDSIGHT_BANK_ID`|`"omo"`|用于读取和写入的记忆库。所有会话共享此记忆库，除非 `dynamicBankId` 已启用。|
|`bankMission`|`HINDSIGHT_BANK_MISSION`|OMO Orchestrator 提示|描述智能体的目的。创建或更新记忆库时发送。|
|`retainMission`|—|提取提示|Hindsight事实提取说明。|
|`dynamicBankId`|`HINDSIGHT_DYNAMIC_BANK_ID`|`false`|当`true`，从导出唯一的记忆库ID `dynamicBankGranularity` 字段。|
|`dynamicBankGranularity`|—|`["agent", "project"]`|组合动态记忆库 ID 的字段。 `"project"` = 工作目录，`"agent"` = 智能体名称。|
|`bankIdPrefix`|—|`""`|所有记忆库 ID 前面的前缀。|

---

### 自动记忆召回 {#auto-recall}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRecall`|`HINDSIGHT_AUTO_RECALL`|`true`|自动记忆召回总开关。|
|`recallBudget`|`HINDSIGHT_RECALL_BUDGET`|`"mid"`|搜索深度：`"low"`（快），`"mid"`（平衡），`"high"`（彻底）。|
|`recallMaxTokens`|`HINDSIGHT_RECALL_MAX_TOKENS`|`1024`|召回的记忆块中的最大 token 数。|
|`recallTypes`|—|`["world", "experience"]`|要检索的记忆类型。|
|`recallContextTurns`|`HINDSIGHT_RECALL_CONTEXT_TURNS`|`1`|在构建记忆召回查询时，先要包含。 `1` = 仅最新提示。|
|`recallMaxQueryChars`|`HINDSIGHT_RECALL_MAX_QUERY_CHARS`|`800`|发送到Hindsight 的查询中的最大字符数。|
|`recallRoles`|—|`["user", "assistant"]`|构建多轮查询时要包含的角色。|
|`recallPromptPreamble`|—|内置|文本放置在注入的上下文块中调用的记忆上方。|

---

### 自动记忆存储 {#auto-retain}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRetain`|`HINDSIGHT_AUTO_RETAIN`|`true`|自动记忆存储的主开关。|
|`retainMode`|`HINDSIGHT_RETAIN_MODE`|`"full-session"`|`"full-session"` 发送每个会话的完整成绩单。 `"chunked"` 每 N 轮发送一次滑动窗口。|
|`retainEveryNTurns`|—|`10`|记忆存储每 N 回合触发一次。 `1` = 每回合。较高的值会减少API呼叫。|
|`retainOverlapTurns`|—|`2`|包含前一个块的额外回合（仅限块模式）。|
|`retainRoles`|—|`["user", "assistant"]`|要包含在保留转录本中的角色。|
|`retainTags`|—|`["{session_id}"]`|附加到存储文档的标签。 `{session_id}` 在运行时被替换。|
|`retainMetadata`|—|`{}`|附加到存储文档的任意键值元数据。|
|`retainContext`|—|`"omo"`|标识源集成的标签。|

---

### 调试 {#debug}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`debug`|`HINDSIGHT_DEBUG`|`false`|启用 stderr 的详细日志记录。所有日志行都以 为前缀 `[Hindsight]`。|

## 每个项目记忆 {#per-project-memory}

要为每个项目提供自己独立的记忆库，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置，在 中运行 OMO `~/projects/api` 和 `~/projects/frontend` 分别存储和调用记忆。 记忆库 ID 源自工作目录路径（例如 `omo::api`，`omo::frontend`）。

## 多记忆库 记忆召回 {#multi-bank-recall}

查询附加记忆库和主记忆库：

```json
{
  "recallAdditionalBanks": ["shared-team-knowledge"]
}
```

## 故障排查 {#troubleshooting}

**未召回记忆**：记忆召回仅在保留某些内容后才返回结果。先完成一个 OMO 会话，然后开始一个新的 OMO 会话以查看回忆。

**记忆未被存储**：`retainEveryNTurns` 默认为 `10` — 记忆存储每 10 回合才触发一次。测试时，添加 `"retainEveryNTurns": 1`至`~/.hindsight/omo.json`。

**云端模式静默跳过**：如果`hindsightApiUrl` 指向Hindsight有云但无`hindsightApiToken`已设置，钩子默默地跳过。设置`HINDSIGHT_API_TOKEN` 或添加到`~/.hindsight/omo.json`。

**调试模式**：添加`"debug": true`至`~/.hindsight/omo.json` 看看什么Hindsight每回合都在做：

```
[Hindsight] 正在从记忆库 'omo' 召回，查询长度：42
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'omo', doc 'sess-abc123', 2 messages, 847 chars
```
