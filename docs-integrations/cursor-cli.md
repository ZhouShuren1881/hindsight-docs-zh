---
sidebar_position: 7
title: "Cursor CLI 持久记忆Hindsight |集成指南"
description: "用Hindsight将持久记忆添加到Cursor CLI。 Python 在每个提示和记忆存储对话之前自动挂钩脚本记忆召回上下文 - 无需更改工作流程。"
---

# Cursor CLI {#cursor-cli}

:::warning 已被 编码智能体 插件取代
**Cursor CLI 集成** 被 取代 [编码智能体插件](/sdks/integrations/coding-agents) — 一个
包涵盖Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin 和 Cline 以及其他 CLI 智能体，并且每个存储库都共享它们的记忆库
。

此页面和已发布的包仍然有效；它们不再被开发。切换：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install cursor-cli
```

记忆不会自动移动——记忆库的范围不同，并且该智能体的历史记录无法导入（它保存在内部数据库中）。参见
[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


[查看更新日志 →](/changelog/integrations/cursor-cli)

的持久记忆 [Cursor CLI](https://docs.cursor.com/en/cli/overview) 使用 [Hindsight](https://vectorize.io/hindsight)。Python自动挂钩脚本 每个提示之前的记忆召回相关上下文以及每个回合之后的记忆存储对话 — 不会改变您的Cursor工作流程。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 对于Hindsight Cloud API 密钥 — 无自托管，无需管理本地守护进程。
:::

```bash
#安装 CLI
pip install hindsight-cursor-cli

#安装钩子（默认为Hindsight Cloud）
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

#重新启动Cursor CLI — 记忆已上线
```

安装程序将钩子脚本复制到`~/.cursor/hooks/cursor-cli/`，写道`~/.cursor/hooks.json`（与任何现有条目合并），并创建 `~/.hindsight/cursor-cli.json`适合您的个人配置。

**自托管替代方案** — 连接到本地 `hindsight-embed` 守护进程，省略标志：

```bash
hindsight-cursor-cli install
```

卸载：

```bash
hindsight-cursor-cli uninstall
```

## 功能 {#features}

- **自动记忆召回** — 在每个提示之前，查询Hindsight用于相关记忆并将它们作为附加上下文注入（对模型可见，而不是转录本）
- **自动记忆存储** — 每次响应后，以及在会话结束时再次将对话存储到Hindsight未来记忆召回
- **动态记忆库 ID** — 支持基于工作目录的每个项目记忆隔离
- **会话级更新或插入** — 使用会话 ID 作为文档 ID，因此重新运行相同的会话会更新而不是重复存储的内容
- **无运行时依赖** — 钩子脚本是纯粹的Python标准库； `pip install` 仅提供一次性安装程序

## 架构 {#architecture}

插件使用四个Cursor CLI钩子事件：

|钩子|活动|目的|
|------|-------|---------|
|`session_start.py`|`sessionStart`|热身 — 验证 Hindsight 可达|
|`recall.py`|`beforeSubmitPrompt`|**自动记忆召回** — 查询记忆，作为附加上下文注入|
|`retain.py`|`stop`|**自动记忆存储** — 提取文字记录，发布到Hindsight（异步）|
|`session_end.py`|`sessionEnd`|**最终写入** — 强制记忆存储，这样最后的回合就不会丢失|

开`beforeSubmitPrompt`，钩子读取提示，查询Hindsight用于最相关的记忆，并注入上下文块。Cursor在将其发送给模型之前将其添加到对话中：

```
<hindsight_memories>
以往对话中的相关记忆...
当前时间 - 2026-03-27 09:14

- 项目使用 FastAPI 与 asyncpg，而非 SQLAlchemy [world] (2026-03-26)
- 首选测试框架：pytest 与 pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

开`stop`（再次在`sessionEnd`），该钩子读取会话记录，剥离之前注入的记忆标签（以防止反馈循环），并将对话发布到Hindsight异步。

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

连接到正在运行的Hindsight服务器（云或自托管）通过 `~/.hindsight/cursor-cli.json`：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 本地守护进程 {#2-local-daemon}

运行`hindsight-embed`本地。 `session_start.py` 钩子在 上检测到它 `apiPort`（默认`9077`）。该守护进程不是由插件自动启动的——单独启动它：

```bash
uvx hindsight-embed
```

然后离开`hindsightApiUrl` 配置中为空，插件连接到 `http://localhost:9077`。

## 配置 {#configuration}

默认配置在中发布 `~/.cursor/hooks/cursor-cli/settings.json`。对于更新后仍保留的个人覆盖，请创建 `~/.hindsight/cursor-cli.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（较晚的作品获胜）：

1. 内置默认值
2. 插件`settings.json`（位于 `~/.cursor/hooks/cursor-cli/settings.json`)
3. 用户配置（`~/.hindsight/cursor-cli.json`)
4. 环境变量

---

### 连接 {#connection}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`hindsightApiUrl`|`HINDSIGHT_API_URL`|`""`|Hindsight API 服务器的 URL。空=本地守护进程。|
|`hindsightApiToken`|`HINDSIGHT_API_TOKEN`|`null`|API 用于身份验证的令牌。 Hindsight Cloud所需。|
|`apiPort`|`HINDSIGHT_API_PORT`|`9077`|本地端口 `hindsight-embed`守护进程。|

---

### 记忆库 {#memory-bank}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`bankId`|`HINDSIGHT_BANK_ID`|`"cursor-cli"`|​​ 用于读取和写入的记忆库。所有会话共享此记忆库，除非 `dynamicBankId` 已启用。|
|`bankMission`|`HINDSIGHT_BANK_MISSION`|编码助手提示|描述智能体的目的。创建或更新记忆库时发送。|
|`retainMission`|—|提取提示|Hindsight 事实提取的说明——从编码对话中提取什么。|
|`dynamicBankId`|`HINDSIGHT_DYNAMIC_BANK_ID`|`false`|当`true`，从导出唯一的记忆库ID `dynamicBankGranularity` 字段 — 对于每个项目的隔离很有用。|
|`dynamicBankGranularity`|—|`["agent", "project"]`|动态记忆库 ID 需要组合哪些字段。 `"project"` = 工作目录，`"agent"` = 智能体名称。|
|`agentName`|`HINDSIGHT_AGENT_NAME`|`"cursor-cli"`|用于动态记忆库 ID 推导的智能体名称。|

---

### 自动记忆召回 {#auto-recall}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRecall`|`HINDSIGHT_AUTO_RECALL`|`true`|自动记忆召回总开关。|
|`recallBudget`|`HINDSIGHT_RECALL_BUDGET`|`"mid"`|搜索深度：`"low"`（快），`"mid"`（平衡），`"high"`（彻底）。|
|`recallMaxTokens`|`HINDSIGHT_RECALL_MAX_TOKENS`|`1024`|召回的记忆块中的最大 token 数。|
|`recallTypes`|—|`["world", "experience"]`|要检索的记忆类型。|
|`recallContextTurns`|`HINDSIGHT_RECALL_CONTEXT_TURNS`|`1`|优先在构建记忆召回查询时包含。 `1` = 仅最新提示。|

---

### 自动记忆存储 {#auto-retain}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRetain`|`HINDSIGHT_AUTO_RETAIN`|`true`|自动记忆存储的主开关。|
|`retainMode`|`HINDSIGHT_RETAIN_MODE`|`"full-session"`|`"full-session"` 发送每个会话的完整记录（按会话 ID 更新插入）。 `"chunked"` 每 N 轮发送一次滑动窗口。|
|`retainEveryNTurns`|—|`10`|记忆存储每 N 回合触发一次。 `1` = 每回合。较高的值会减少API来电。|
|`retainContext`|—|`"cursor-cli"`|标识源集成的标签。当多个集成写入同一个记忆库时很有用。|

---

### 调试 {#debug}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`debug`|`HINDSIGHT_DEBUG`|`false`|启用对 stderr 的详细日志记录。所有日志行都以 为前缀 `[Hindsight]`。|

## 每个项目记忆 {#per-project-memory}

要为每个项目提供自己独立的记忆库，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置，运行Cursor于 `~/projects/api` 和 `~/projects/frontend` 分别存储和调用记忆。 记忆库 ID 源自工作目录路径。

## 故障排查 {#troubleshooting}

**钩子未触发**：确认`~/.cursor/hooks.json` 存在且 `python3` 在你的 shell 上 `$PATH`。重新运行`hindsight-cursor-cli install` 重写钩子条目。

**未召回记忆**：记忆召回仅在保留某些内容后才返回结果。完成一  首先进行Cursor会话，然后开始新的会话。

**记忆未被存储**：`retainEveryNTurns` 默认为 `10` — `stop` 钩子每 10 回合只会触发一次记忆存储。测试时，添加 `"retainEveryNTurns": 1`至`~/.hindsight/cursor-cli.json`。 当会话终止时， `sessionEnd` 钩子还会强制执行最终的记忆存储。

**调试模式**：添加`"debug": true`至`~/.hindsight/cursor-cli.json` 看看什么Hindsight每回合都在做。
