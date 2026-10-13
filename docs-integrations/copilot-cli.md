---
sidebar_position: 7
title: "​​GitHub Copilot CLI Hindsight 持久记忆 |集成指南"
description: "将持久记忆添加到GitHubCopilot CLI和Hindsight。 Python 在会话开始时自动挂钩脚本记忆召回上下文和记忆存储对话 - 无需更改工作流程。"
---

# GitHub Copilot CLI {#github-copilot-cli}

:::warning 已被 编码智能体 插件取代
**GitHub Copilot CLI 集成** 被 取代 [编码智能体插件](/sdks/integrations/coding-agents) — 一个
包涵盖Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin 和 Cline 以及其他 CLI 智能体，并且每个存储库都共享它们的记忆库
。

此页面和已发布的包仍然有效；它们不再被开发。切换：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install copilot-cli
```

记忆不会自动移动——记忆库的范围不同，并且该智能体的历史记录无法导入（它保存在内部数据库中）。参见
[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


的持久记忆 [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks) 使用 [Hindsight](https://vectorize.io/hindsight)。Python钩子脚本在会话开始时自动记忆召回相关上下文（并且对于每个子代理Copilot CLI产生）和记忆存储对话，因为它们发生 - 不会改变你的  需要Copilot CLI工作流程。

[查看更新日志 →](/changelog/integrations/copilot-cli)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 对于Hindsight Cloud API 密钥 — 无自托管，无需管理本地守护进程。
:::

```bash
#安装 CLI
pip install hindsight-copilot-cli

#安装钩子（默认为Hindsight Cloud）
hindsight-copilot-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

#重新启动Copilot CLI — 记忆已上线
```

安装程序将钩子脚本复制到`~/.copilot/hindsight-copilot-cli/`，写一个独立的`~/.copilot/hooks/hindsight-copilot-cli.json` (Copilot CLI加载每个`*.json` 文件位于其 hooks 目录中，因此永远不需要与其他工具的钩子文件合并），并创建 `~/.hindsight/copilot-cli.json`适合您的个人配置。

**自托管替代方案** — 连接到本地 `hindsight-embed` 守护进程，省略标志：

```bash
hindsight-copilot-cli install
```

卸载：

```bash
hindsight-copilot-cli uninstall
```

### 仓库级安装 {#repo-level-install}

对于签入版本控制的团队共享配置，请在存储库级别注册挂钩：

```bash
hindsight-copilot-cli install --scope repo
```

这样写当前仓库中的 `.github/hooks/hindsight-copilot-cli.json`。 Hook 脚本仍然安装到 `~/.copilot/hindsight-copilot-cli/`（每台机器），因此令牌必须来自`HINDSIGHT_API_TOKEN` 环境变量而不是提交的文件。

## 功能 {#features}

- **会话开始时自动记忆召回** — 当Copilot CLI会话开始，查询Hindsight获取相关记忆并将其作为附加上下文注入。使用排队的 `initialPrompt` 当存在时，或者回退到从工作目录派生的通用项目上下文查询。
- **为子智能体自动记忆召回** —Copilot CLI的内置子代理（`explore`，`task`，`research`，`code-review`，`rubber-duck`，`security-review` 和自定义智能体）在自己的隔离上下文中运行，否则在会话开始时不会注入任何记忆。 `subagentStart` 钩子也给了他们基线项目记忆。
- **自动记忆存储** — 每回合后（取决于 `retainEveryNTurns`)，并在会话结束时再次将对话存储到Hindsight用于未来的记忆召回。
- **动态记忆库 ID** — 支持基于工作目录的每个项目记忆隔离。
- **会话级更新或插入** — 使用会话 ID 作为文档 ID，因此重新运行相同的会话会更新而不是重复存储的内容。
- **无运行时依赖** — 钩子脚本是纯粹的Python标准库； `pip install` 仅提供一次性安装程序。

## 架构 {#architecture}

插件使用四个Copilot CLI钩子事件：

|钩子|活动|目的|
|------|-------|---------|
|`session_start.py`|`sessionStart`|**自动记忆召回** — 使用初始提示（或项目上下文后备）查询记忆，作为附加上下文注入|
|`subagent_start.py`|`subagentStart`|**为子智能体自动记忆召回** — 使用项目上下文后备查询查询记忆（子代理有效负载不携带任务文本），作为附加上下文注入|
|`agent_stop.py`|`agentStop`|**自动记忆存储** — 阅读成绩单，应用 `retainEveryNTurns` 节奏，发布到Hindsight（异步）；缓存 的转录路径 `sessionEnd`|
|`session_end.py`|`sessionEnd`|**最终写入** — 使用最后一个缓存的转录路径强制记忆存储 `agentStop`，从 `sessionEnd`的有效负载没有自己的转录路径|

开`sessionStart`，钩子查询Hindsight用于最相关的记忆并注入一个上下文块Copilot CLI添加到会话中：

```
<hindsight_memories>
以往对话中的相关记忆...
当前时间 - 2026-03-27 09:14

- 项目使用 FastAPI 与 asyncpg，而非 SQLAlchemy [world] (2026-03-26)
- 首选测试框架：pytest 与 pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

`subagentStart` 为每个子代理触发Copilot CLI生成除内置 之外的 `general-purpose` 智能体（从不发出事件）并注入相同样式的上下文块，前置到该子代理的提示符之前。

开`agentStop`（再次在`sessionEnd`），该钩子读取会话记录，剥离之前注入的记忆标签（以防止反馈循环），并将对话发布到Hindsight异步。

:::note 记忆召回每回合不会刷新
与其他一些集成不同，Copilot CLI的`userPromptSubmitted` 和 `preToolUse` 钩子不支持注入额外的上下文，因此记忆召回每个会话仅运行一次（在 `sessionStart`），每个子代理一次（在 `subagentStart`）而不是每回合都刷新。这使集成保持简单可靠，但代价是不能在会话中获取新的记忆。
:::

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

连接到正在运行的Hindsight服务器（云或自托管）通过 `~/.hindsight/copilot-cli.json`：

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

默认配置在中发布 `~/.copilot/hindsight-copilot-cli/settings.json`。对于更新后仍保留的个人覆盖，请创建 `~/.hindsight/copilot-cli.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（较晚的作品获胜）：

1. 内置默认值
2. 插件`settings.json`（位于 `~/.copilot/hindsight-copilot-cli/settings.json`)
3. 用户配置（`~/.hindsight/copilot-cli.json`)
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
|`bankId`|`HINDSIGHT_BANK_ID`|`"copilot-cli"`|​​ 用于读取和写入的记忆库。所有会话共享此记忆库，除非 `dynamicBankId` 已启用。|
|`bankMission`|`HINDSIGHT_BANK_MISSION`|编码助手提示|描述智能体的目的。创建或更新记忆库时发送。|
|`retainMission`|—|提取提示|Hindsight 事实提取的说明——从编码对话中提取什么。|
|`dynamicBankId`|`HINDSIGHT_DYNAMIC_BANK_ID`|`false`|当`true`，从导出唯一的记忆库ID `dynamicBankGranularity` 字段 — 对于每个项目的隔离很有用。|
|`dynamicBankGranularity`|—|`["agent", "project"]`|动态记忆库 ID 需要组合哪些字段。 `"project"` = 工作目录，`"agent"` = 智能体名称。|
|`agentName`|`HINDSIGHT_AGENT_NAME`|`"copilot-cli"`|用于动态记忆库 ID 推导的智能体名称。|

---

### 自动记忆召回 {#auto-recall}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRecall`|`HINDSIGHT_AUTO_RECALL`|`true`|自动记忆召回总开关（涵盖`sessionStart` 和 `subagentStart`）。|
|`recallBudget`|`HINDSIGHT_RECALL_BUDGET`|`"mid"`|搜索深度：`"low"`（快），`"mid"`（平衡），`"high"`（彻底）。|
|`recallMaxTokens`|`HINDSIGHT_RECALL_MAX_TOKENS`|`1024`|召回的记忆块中的最大 token 数。|
|`recallTypes`|—|`["world", "experience"]`|要检索的记忆类型。|
|`recallFallbackQueryTemplate`|—|项目上下文提示|无特定时使用的查询prompt/task文本可用（交互式 `sessionStart` 没有排队提示，或任何 `subagentStart`）。|

---

### 自动记忆存储 {#auto-retain}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRetain`|`HINDSIGHT_AUTO_RETAIN`|`true`|自动记忆存储的主开关。|
|`retainMode`|`HINDSIGHT_RETAIN_MODE`|`"full-session"`|`"full-session"` 发送每个会话的完整记录（按会话 ID 更新插入）。 `"chunked"` 每 N 轮发送一次滑动窗口。|
|`retainEveryNTurns`|—|`10`|记忆存储每 N 回合触发一次。 `1` = 每回合。较高的值会减少API来电。|
|`retainContext`|—|`"copilot-cli"`|标识源集成的标签。当多个集成写入同一个记忆库时很有用。|

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

使用此配置，运行Copilot CLI于 `~/projects/api` 和 `~/projects/frontend` 分别存储和调用记忆。 记忆库 ID 源自工作目录路径。

## 故障排查 {#troubleshooting}

**钩子未触发**：检查`~/.copilot/hooks/hindsight-copilot-cli.json`（或`.github/hooks/hindsight-copilot-cli.json` 对于回购范围）有效JSON。Copilot CLI在启动时加载钩子配置，因此在安装或更新钩子后重新启动CLI。

**未召回记忆**：记忆召回仅在保留某些内容后才返回结果。完成一  首先进行Copilot CLI会话，然后开始新的会话。

**记忆未被存储**：`retainEveryNTurns` 默认为 `10` — `agentStop` 钩子每 10 回合只会触发一次记忆存储。测试时，添加 `"retainEveryNTurns": 1`至`~/.hindsight/copilot-cli.json`。 当会话终止时， `sessionEnd`钩子还会强制执行最终的记忆存储。

**调试模式**：添加`"debug": true`至`~/.hindsight/copilot-cli.json` 看看什么Hindsight每回合都在做。
