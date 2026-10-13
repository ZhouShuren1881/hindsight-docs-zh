---
sidebar_position: 40
title: "ZCode 持久记忆Hindsight |集成指南"
description: "通过Hindsight为ZCode（Z.ai的GLM桌面编码智能体）添加持久的长期记忆。 Python 在每个提示和记忆存储对话之前自动挂钩记忆召回上下文 - 没有 MCP，没有工作流程更改。"
---

# ZCode {#zcode}

持久记忆[ZCode](https://zcode.z.ai) — Z.ai 的 GLM 桌面编码智能体 — 使用 [Hindsight](https://vectorize.io/hindsight)。ZCode嵌入Claude Code智能体运行时，所以Python在每个提示之前自动挂钩脚本记忆召回相关上下文，并在每个回合之后自动记忆存储对话。否MCP服务器，无需更改您的ZCode工作流程。

[查看更新日志 →](/changelog/integrations/zcode)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 对于Hindsight Cloud API 密钥 — 无自托管，无需管理本地守护进程。
:::

```bash
#安装 CLI
pip install hindsight-zcode

#安装钩子（默认为Hindsight Cloud）
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

#重新启动ZCode — 记忆已上线
```

安装程序将挂钩脚本复制到`~/.zcode/hooks/hindsight/`，将它们注册到`~/.zcode/cli/config.json`（与任何现有的钩子合并），并创建`~/.hindsight/zcode.json`适合您的个人配置。它永远不会触及你的Claude Code配置位于`~/.claude/settings.json`。

**自托管替代方案** — 连接到本地 `hindsight-embed` 守护进程，省略标志：

```bash
hindsight-zcode install
```

卸载：

```bash
hindsight-zcode uninstall
```

### 替代方案：作为 ZCode 插件安装 {#alternative-install-as-a-zcode-plugin}

ZCode可以安装Hindsight直接来自插件市场 — 否 `pip` 步骤。相同的钩子脚本作为仅钩子提供Claude Code插件 (`hindsight-zcode`）在Hindsight市场：

```
#在ZCode中：添加Hindsight市场，然后安装插件
zcode plugins add-marketplace vectorize-io/hindsight
zcode plugins install hindsight-zcode
```

这样安装后，ZCode自动注册钩子（无需编辑配置文件）。提供您的Hindsight通过环境变量的凭证 (`HINDSIGHT_API_URL`，`HINDSIGHT_API_TOKEN`) 或通过创建 `~/.hindsight/zcode.json`：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

## 功能 {#features}

- **自动记忆召回** — 在每个提示之前，查询Hindsight相关记忆并将其作为附加上下文注入（模型可见，而不是转录本）
- **自动记忆存储** — 每次响应后，将轮次存储到Hindsight未来记忆召回
- **无需 MCP** — 简单Python钩子脚本调用Hindsight的REST API；没有什么可以并行的ZCode
- **跨工具共享记忆** — 相同Hindsight记忆库共享Claude Code，Cursor等Hindsight集成，让记忆在工具之间跟随您
- **动态记忆库 ID** — 支持基于工作目录的每个项目记忆隔离
- **无运行时依赖** — 钩子脚本是纯粹的Python标准库； `pip install` 仅提供一次性安装程序

## 架构 {#architecture}

ZCode嵌入Claude编写智能体运行时并读取标准Claude来自其自己的配置命名空间的代码钩子架构，`~/.zcode/cli/config.json`（与`hooks.enabled: true`）。该插件连接了三个钩子事件：

|挂钩|活动|目的|
|------|-------|---------|
|`session_start.py`|`SessionStart`|热身 — 验证 Hindsight 可达|
|`recall.py`|`UserPromptSubmit`|**自动记忆召回** — 查询记忆，注入为 `additionalContext`|
|`retain.py`|`Stop`|**自动记忆存储** — 组装回合，POST 至Hindsight|

开`UserPromptSubmit`，钩子读取提示，查询Hindsight用于最相关的记忆，并发出一个上下文块ZCode在将回合发送给模型之前注入：

```
<hindsight_memories>
以往对话中的相关记忆...
当前时间 - 2026-03-27 09:14

- 项目使用 FastAPI 与 asyncpg，而非 SQLAlchemy [world] (2026-03-26)
- 首选测试框架：pytest 与 pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

开`Stop`，钩子与用户提示配对（在处捕获） `UserPromptSubmit`) 与智能体的响应并发布转向Hindsight。ZCode不提供 `SessionEnd` 挂钩事件，因此保留骑行 `Stop` — 每回合完成后都会被存储。

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

连接到正在运行的Hindsight服务器（云或自托管）通过 `~/.hindsight/zcode.json`：

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

默认配置在中发布 `~/.zcode/hooks/hindsight/settings.json`。对于更新后仍保留的个人覆盖，请创建 `~/.hindsight/zcode.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（后来的作品获胜）：

1. 内置默认值
2. 插件`settings.json`（位于 `~/.zcode/hooks/hindsight/settings.json`)
3. 用户配置（`~/.hindsight/zcode.json`)
4. 环境变量

---

### 连接 {#connection}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`hindsightApiUrl`|`HINDSIGHT_API_URL`|`""`|Hindsight API 服务器的 URL。空=本地守护进程。|
|`hindsightApiToken`|`HINDSIGHT_API_TOKEN`|`null`|API 用于身份验证的令牌。 Hindsight Cloud所需。  用于身份验证的|
|`apiPort`|`HINDSIGHT_API_PORT`|`9077`|本地端口 `hindsight-embed`守护进程。|

---

### 记忆库 {#memory-bank}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`bankId`|`HINDSIGHT_BANK_ID`|`"zcode"`|用于读取和写入的记忆库。所有会话共享此记忆库，除非 `dynamicBankId` 已启用。|
|`bankMission`|`HINDSIGHT_BANK_MISSION`|编码助手提示|描述智能体的用途。创建或更新记忆库时发送。|
|`dynamicBankId`|`HINDSIGHT_DYNAMIC_BANK_ID`|`false`|当`true`，从导出唯一的记忆库ID `dynamicBankGranularity` 字段 — 对于每个项目的隔离很有用。|
|`agentName`|`HINDSIGHT_AGENT_NAME`|`"zcode"`|用于动态记忆库 ID 推导的智能体名称。|

---

### 自动记忆召回 {#auto-recall}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRecall`|`HINDSIGHT_AUTO_RECALL`|`true`|​​ 自动记忆召回总开关。|
|`recallBudget`|`HINDSIGHT_RECALL_BUDGET`|`"mid"`|搜索深度：`"low"`（快），`"mid"`（平衡），`"high"`（彻底）。|
|`recallMaxTokens`|`HINDSIGHT_RECALL_MAX_TOKENS`|`1024`|注入记忆块的token 预算。|

---

### 自动记忆存储 {#auto-retain}

|设置|环境变量|默认|说明|
|---------|---------|---------|-------------|
|`autoRetain`|`HINDSIGHT_AUTO_RETAIN`|`true`|自动记忆存储的主开关。|
|`retainEveryNTurns`|`HINDSIGHT_RETAIN_EVERY_N_TURNS`|`1`|记忆存储每N轮一次。默认`1` 存储每次开启`Stop`。|

## 与ZCode内置记忆的关系 {#relationship-to-zcodes-built-in-memory}

ZCode提供自己的本地、每个项目记忆 (`~/.zcode/cli/memories/`）。Hindsight是互补的：它将记忆存储在中 **跨工具共享的云端（或自托管）记忆库** — 相同的记忆库能力Claude Code，Cursor等Hindsight集成 - 因此您的环境在智能体和机器之间跟随您，而不是停留在本地ZCode项目。
