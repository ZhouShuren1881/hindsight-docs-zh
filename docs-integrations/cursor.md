---
sidebar_position: 6
title: "Cursor 持久记忆Hindsight |整合"
description: "用Hindsight将长期记忆添加到Cursor。使用 Cursor 的插件架构在会话开始时自动调用相关上下文并在每个任务后保留对话。"
---

# Cursor {#cursor}

仿生长期记忆[Cursor](https://cursor.com) 使用 [Hindsight](https://vectorize.io/hindsight)。在会话开始时自动回忆相关项目上下文，并在每次任务后保留对话记录 — 适合Cursor基于钩子的插件架构MCP用于按需工具。

[查看更新日志 →](/changelog/integrations/cursor)

## 工作原理 {#how-it-works}

Hindsight插件使用两种互补机制：

||插件挂钩（自动）|MCP 工具（按需）|
|--|--------------------------|----------------------|
|**安装**|`pip install hindsight-cursor && hindsight-cursor init`|由 自动配置 `init`|
|**记忆召回**|会话开始 — 通过 注入记忆 `additionalContext`|智能体调用 `recall` 会话中工具|
|**记忆存储**|任务自动停止|智能体调用 `retain` 明确工具|
|**反思**|无法通过钩子使用|可作为工具使用|
|**最适合**|无需用户干预的环境项目记忆|有针对性的查找和显式记忆操作|

两者均由一个设置 `hindsight-cursor init`命令。使用`--no-mcp` 跳过  如果您只想要钩子，则MCP集成。

## 快速入门 {#quick-start}

```bash
#1.安装插件
pip install hindsight-cursor
cd /path/to/your-project

#2a。连接到Hindsight Cloud（最快 - 无需本地服务器）
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_HINDSIGHT_API_TOKEN

#2b。或者连接到本地Hindsight服务器
hindsight-cursor init --api-url http://localhost:8888

#3.完全退出并重新打开Cursor — 插件在启动时加载
```

报名[Hindsight Cloud](https://ui.hindsight.vectorize.io) 获取令牌，或开始Hindsight本地Docker：

```bash
export OPENAI_API_KEY=your-key
docker run --rm -it --pull always -p 8888:8888 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

### init 的作用 {#what-init-does}

- 将插件文件复制到`.cursor-plugin/hindsight-memory/`
- Writes/merges项目`.cursor/hooks.json`所以Cursor注册钩子。Cursor仅加载来自 的钩子 `.cursor/hooks.json`（工作区）或`~/.cursor/hooks.json`（用户）— 下的文件 `.cursor-plugin/` 本身还不够。您已经拥有的 Hook 会被保留，并重新运行 `init` 仅替换Hindsight自己的作品。
- 创造`~/.hindsight/cursor.json` 与您的连接设置（如果该文件尚不存在）
- 写`.cursor/mcp.json` 与HindsightMCP按需工具端点
- 使用`--force` 覆盖现有安装
- 使用`--no-mcp` 跳过  如果您只想要钩子，则MCP配置

`hindsight-cursor uninstall` 反转所有内容：插件目录，Hindsight的`.cursor/hooks.json` 条目，MCP服务器条目，生成的会话规则文件及其 `.gitignore`线。

:::warning 如果将插件添加到已打开的工作区，**完全退出 Cursor，然后重新打开**。插件在启动时加载 - 简单的窗口重新加载是不够的。
:::

## 功能 {#features}

- **会话记忆召回** — 在每个会话开始时，查询Hindsight用于相关项目记忆，并通过 将它们作为上下文注入 `additionalContext`（对聊天不可见，对智能体可见）
- **自动记忆存储** — 每次任务完成后，提取并保留对话内容以Hindsight用于长期存储
- **按需使用 MCP 工具** — `recall`，`retain`，和`reflect` 用于显式会话中记忆操作的工具
- **按需记忆召回技能** — 使用 `hindsight-recall` 手动记忆查找技能
- **守护进程管理** — 可以auto-start/stop`hindsight-embed`本地或连接到外部Hindsight服务器
- **动态记忆库 ID** — 支持每个智能体、每个项目或每个会话记忆隔离
- **无运行时依赖** — 插件脚本使用 purePython仅 stdlib

## 架构 {#architecture}

插件使用Cursor的钩子系统：

|钩子|活动|目的|
|------|-------|---------|
|`session_start.py`|`sessionStart`|**会话记忆召回** — 查询记忆，注入为 `additionalContext`|
|`retain.py`|`stop`|**自动记忆存储** — 提取文字记录，发布到Hindsight|
| `retain.py` | `sessionEnd` | **最终写入** — 保存轮次窗口尚未处理的内容 |

`sessionStart` 当新的钩子触发一次Cursor会议开始。它执行广泛的项目级记忆召回，并将相关记忆作为隐藏上下文注入。

`retain.py` 运行于 `sessionEnd`也是如此。如果没有这个，每次对话都会短于 `retainEveryNTurns` 彻底丢失：默认为 10 时，会触发七回合聊天 `stop`七次，转门拒绝所有七次，并且会话永远不会被存储。 `sessionEnd` 绕过转向窗口，因此会话的尾部始终保留。该插件跟踪每个会话已经保留了多少条转录消息，因此两个事件之间的重叠不能双重存储。

`init`命令还配置Cursor的MCP支持（`.cursor/mcp.json`) 连接到Hindsight的MCP端点，给出智能体显式`recall`，`retain`，和`reflect` 供课中使用的工具。

此外，该插件还提供：
- **技能** (`hindsight-recall`) — 按需记忆查询
- **规则** (`hindsight-memory.mdc`) — 永远在线的规则指示智能体利用回忆的记忆和MCP工具

## 连接方式 {#connection-modes}

### 1. 外部 API（生产环境推荐） {#1-external-api-recommended-for-production}

连接到正在运行的Hindsight服务器（云或自托管）。不需要本地LLM——服务器处理事实提取。

```json
{
  "hindsightApiUrl": "https://your-hindsight-server.com",
  "hindsightApiToken": "your-token"
}
```

### 2. 本地守护进程（自动管理） {#2-local-daemon-auto-managed}

插件自动启动和停止`hindsight-embed`来自`uvx`。需要一个LLM提供商API用于本地事实提取的密钥。

设置LLM提供商：
```bash
export OPENAI_API_KEY="sk-your-key"
# or
export ANTHROPIC_API_KEY="your-key"
```

型号由系统自动选择HindsightAPI。要覆盖，请设置 `HINDSIGHT_LLM_MODEL`。

### 3. 已有本地服务器 {#3-existing-local-server}

如果你已经有了 `hindsight-embed`跑，离开`hindsightApiUrl` 清空并设置 `apiPort` 匹配您服务器的端口。该插件会自动检测它。

## 配置 {#configuration}

所有设置均位于`~/.hindsight/cursor.json`。每个设置也可以通过环境变量覆盖。该插件附带了合理的默认设置 - 您只需配置您想要更改的内容。

**加载顺序**（较晚的作品获胜）：
1. 内置默认值（硬编码在插件中）
2. 插件`settings.json`（随插件一起提供，位于 `CURSOR_PLUGIN_ROOT/settings.json`)
3. 用户配置（`~/.hindsight/cursor.json` — 推荐用于您的覆盖）
4. 环境变量

---

### 连接和守护进程 {#connection--daemon}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`hindsightApiUrl`|`HINDSIGHT_API_URL`|`""`（空）|外部 Hindsight API 服务器的 URL。当为空时，插件将使用本地守护进程。|
|`hindsightApiToken`|`HINDSIGHT_API_TOKEN`|`null`|外部的身份验证令牌API。仅当 时需要 `hindsightApiUrl` 已设置。|
|`apiPort`|`HINDSIGHT_API_PORT`|`9077`|本地使用的端口`hindsight-embed`守护进程。|
|`embedVersion`|`HINDSIGHT_EMBED_VERSION`|`"latest"`|哪个版本`hindsight-embed` 通过 安装 `uvx`。|
|`embedPackagePath`|`HINDSIGHT_EMBED_PACKAGE_PATH`|`null`|的本地路径 `hindsight-embed` 签出开发。|

---

### LLM 提供者（仅限本地守护进程） {#llm-provider-local-daemon-only}

这些设置配置哪些LLM本地守护进程用于事实提取。他们是**忽略** 连接外部设备时API。

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`llmProvider`|`HINDSIGHT_LLM_PROVIDER`|自动检测|LLM提供商：`openai`，`anthropic`，`gemini`，`groq`，`ollama`。通过检查自动检测API关键环境变量。|
|`llmModel`|`HINDSIGHT_LLM_MODEL`|提供商默认值|覆盖所选提供商的默认模型。|
|`llmApiKeyEnv`|—|提供商标准|持有 API 密钥的环境变量的名称（如果非标准）。|

---

### 记忆库 {#memory-bank}

A**记忆库**是一个孤立的记忆库——就像一个独立的“大脑”。

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`bankId`|`HINDSIGHT_BANK_ID`|`"cursor"`|时的记忆库ID `dynamicBankId` 是 `false`。|
|`bankMission`|`HINDSIGHT_BANK_MISSION`|通用辅助提示|智能体身份和目的的描述。|
|`dynamicBankId`|`HINDSIGHT_DYNAMIC_BANK_ID`|`false`|当`true`，从上下文字段中派生出唯一的记忆库ID（参见`dynamicBankGranularity`）。|
|`dynamicBankGranularity`|—|`["agent", "project"]`|动态记忆库 ID 的组合字段：`agent`，`project`，`session`，`channel`，`user`。|
|`bankIdPrefix`|—|`""`|所有记忆库 ID 前面的字符串用于命名空间。|
|`agentName`|`HINDSIGHT_AGENT_NAME`|`"cursor"`|用于的名称 动态记忆库ID推导中的 `agent`字段。|

---

### 会话记忆召回 {#session-recall}

会话记忆召回在每个会话开始时运行一次。它查询Hindsight相关项目记忆并将其以不可见的形式注入到智能体的上下文中 `additionalContext`。

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRecall`|`HINDSIGHT_AUTO_RECALL`|`true`|会话记忆召回总开关。|
|`recallBudget`|`HINDSIGHT_RECALL_BUDGET`|`"mid"`|搜索彻底性：`"low"`，`"mid"`，`"high"`。|
|`recallMaxTokens`|`HINDSIGHT_RECALL_MAX_TOKENS`|`1024`|召回的记忆块中的最大 token 数。|
|`recallTypes`|—|`["world", "experience"]`|要检索的记忆类型。|
|`recallMaxQueryChars`|`HINDSIGHT_RECALL_MAX_QUERY_CHARS`|`800`|查询的最大字符长度。|

---

### 自动记忆存储 {#auto-retain}

自动记忆存储在智能体完成任务后运行。它提取对话记录并将其发送到Hindsight。

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRetain`|`HINDSIGHT_AUTO_RETAIN`|`true`|自动记忆存储的主开关。|
|`retainMode`|`HINDSIGHT_RETAIN_MODE`|`"full-session"`|保留策略。 `"full-session"` 或 `"chunked"`。|
|`retainEveryNTurns`|`HINDSIGHT_RETAIN_EVERY_N_TURNS`|`10`|记忆存储的频率。 `1` = 每回合。|
|`retainOverlapTurns`|—|`2`|为了连续性，从前一个块中包含了额外的回合。|
|`retainContext`|`HINDSIGHT_RETAIN_CONTEXT`|`"cursor"`|保留记忆的来源标签。|
|`retainToolCalls`|—|`false`|是否在保留的记录中包含工具调用。|

---

### 调试 {#debug}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`debug`|`HINDSIGHT_DEBUG`|`false`|启用对 stderr 的详细日志记录。前缀为 `[Hindsight]`。|

## 验证插件挂钩 {#verifying-plugin-hooks}

该插件会在每次钩子调用时写入状态文件 - 即使没有找到记忆或跳过记忆存储。检查它们以确认钩子正在触发：

```bash
# 未设置 CURSOR_PLUGIN_DATA 时的默认位置：
cat ~/.hindsight/cursor-state/state/last_recall.json
cat ~/.hindsight/cursor-state/state/last_retain.json
```

每个文件包含：
- `saved_at` — 最后一次调用的时间戳
- `status` — 之一 `success`，`empty`，`skipped`，或`error`
- `bank_id` — 使用了哪个记忆库（出现在 `success` 和 `empty`)
- `mode` — 总是 `plugin`
- `hook` — `sessionStart` 记忆召回
- `result_count`（记忆召回）或`message_count`（记忆存储）— 出现在 `success`

如果`saved_at` 使用时更新Cursor，钩子正在发射。检查`status` 了解发生了什么。

## 故障排查 {#troubleshooting}

**插件未激活**：检查`.cursor-plugin/plugin.json`存在于插件目录中。启用`"debug": true` `~/.hindsight/cursor.json` 并检查 stderr 输出。

**智能体窗口中显示“Ran Recall in hindsight”？** 那就是MCP，不是插件。基于插件的记忆召回是无声的——它通过 注入上下文 `additionalContext` 没有可见的工具调用。如果你看到明确的Hindsight工具调用，你有MCP配置于 `.cursor/mcp.json`。两者可以一起工作。

**记忆召回未返回记忆**：验证Hindsight服务器可访问 (`curl http://localhost:9077/health`）。记忆至少需要一个记忆存储周期。

**守护进程无法启动**：确保LLMAPI 密钥已设定。在 查看守护程序日志 `~/.hindsight/profiles/cursor.log`。

**会话启动延迟较高**：会话记忆召回挂钩有 15 秒超时。使用 `recallBudget: "low"`或减少`recallMaxTokens`。
