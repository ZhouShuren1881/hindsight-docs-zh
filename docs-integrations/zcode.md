---
sidebar_position: 40
title: "使用 Hindsight 为 ZCode 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 ZCode（Z.ai 的 GLM 桌面编程智能体）添加持久的长期记忆。Python 钩子会在每次提示前自动召回相关上下文，并在每轮结束后存入对话记忆；无需 MCP，也无需更改工作流。"
---

# ZCode {#zcode}

[ZCode](https://zcode.z.ai) 是 Z.ai 的 GLM 桌面编程智能体；本指南介绍如何使用 [Hindsight](https://vectorize.io/hindsight) 为它提供持久记忆。ZCode 内置 Claude Code 智能体运行时，因此 Python 钩子脚本会在每次提示前自动召回相关上下文，并在每轮结束后存入对话。无需 MCP 服务器，也无需更改 ZCode 工作流。

[查看更新日志 →](/changelog/integrations/zcode)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)，获取 Hindsight Cloud API 密钥；无需自行托管，也无需管理本地守护进程。
:::

```bash
# 安装 CLI
pip install hindsight-zcode

# 安装钩子（默认使用 Hindsight Cloud）
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key

# 重启 ZCode — 记忆即可使用
```

安装程序会将钩子脚本复制到 `~/.zcode/hooks/hindsight/`，将钩子注册到 `~/.zcode/cli/config.json`（并入任何现有钩子），并创建个人配置文件 `~/.hindsight/zcode.json`。它绝不会改动位于 `~/.claude/settings.json` 的 Claude Code 配置。

**自托管方案** — 省略参数即可连接本地 `hindsight-embed` 守护进程：

```bash
hindsight-zcode install
```

卸载：

```bash
hindsight-zcode uninstall
```

### 另一种方式：作为 ZCode 插件安装 {#alternative-install-as-a-zcode-plugin}

ZCode 可以直接从插件市场安装 Hindsight，无需执行 `pip` 步骤。相同的钩子脚本也作为仅包含钩子的 Claude Code 插件（`hindsight-zcode`）发布在 Hindsight 插件市场中：

```
# 在 ZCode 中：添加 Hindsight 插件市场，然后安装插件
zcode plugins add-marketplace vectorize-io/hindsight
zcode plugins install hindsight-zcode
```

通过这种方式安装时，ZCode 会自动注册钩子（无需编辑配置文件）。请通过环境变量（`HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN`）提供 Hindsight 凭证，或创建 `~/.hindsight/zcode.json`：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

## 功能 {#features}

- **自动召回** — 每次提示前向 Hindsight 查询相关记忆，并将其作为额外上下文注入（模型可以看到，但不会出现在转录记录中）
- **自动存入** — 每次响应后，将本轮内容存入 Hindsight，供之后召回
- **无需 MCP** — 只需调用 Hindsight REST API 的纯 Python 钩子脚本；无需在 ZCode 旁运行其他服务
- **跨工具共享记忆** — Claude Code、Cursor 和其他 Hindsight 集成都可共享同一个 Hindsight 记忆库，让记忆随你在不同工具间切换
- **动态记忆库 ID** — 支持根据工作目录隔离每个项目的记忆
- **零运行时依赖** — 钩子脚本仅使用 Python 标准库；`pip install` 只用于安装一次性安装程序

## 架构 {#architecture}

ZCode 内置 Claude Code 智能体运行时，并从自己的配置命名空间 `~/.zcode/cli/config.json` 读取标准 Claude Code 钩子格式（需设置 `hooks.enabled: true`）。该插件会连接三个钩子事件：

| 钩子 | 事件 | 用途 |
|------|-------|---------|
| `session_start.py` | `SessionStart` | 预热 — 验证 Hindsight 是否可访问 |
| `recall.py` | `UserPromptSubmit` | **自动召回** — 查询记忆，并注入为 `additionalContext` |
| `retain.py` | `Stop` | **自动存入** — 组装本轮内容并 POST 到 Hindsight |

在 `UserPromptSubmit` 事件发生时，钩子会读取提示，向 Hindsight 查询最相关的记忆，并输出一个上下文块。ZCode 会在将本轮内容发送给模型前注入该上下文块：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-27 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [experience] (2026-03-26)
</hindsight_memories>
```

在 `Stop` 事件发生时，钩子会将用户提示（在 `UserPromptSubmit` 时捕获）与智能体的响应配对，然后通过 POST 将本轮内容发送到 Hindsight。ZCode 不提供 `SessionEnd` 钩子事件，因此会在 `Stop` 时存入记忆 — 每轮完成后都会存储。

## 连接方式 {#connection-modes}

### 1. 外部 API（推荐） {#1-external-api-recommended}

通过 `~/.hindsight/zcode.json` 连接正在运行的 Hindsight 服务器（云端或自托管）：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

### 2. 本地守护进程 {#2-local-daemon}

在本地运行 `hindsight-embed`。`session_start.py` 钩子会在 `apiPort` 端口检测它（默认值为 `9077`）。插件不会自动启动守护进程 — 请单独启动：

```bash
uvx hindsight-embed
```

然后让配置中的 `hindsightApiUrl` 保持为空，插件便会连接到 `http://localhost:9077`。

## 配置 {#configuration}

默认配置随插件提供，位于 `~/.zcode/hooks/hindsight/settings.json`。如需在更新后仍保留个人覆盖配置，请创建 `~/.hindsight/zcode.json`。大多数设置也可以通过环境变量覆盖。

**加载顺序**（后面的配置优先）：

1. 内置默认值
2. 插件的 `settings.json`（位于 `~/.zcode/hooks/hindsight/settings.json`）
3. 用户配置（`~/.hindsight/zcode.json`）
4. 环境变量

---

### 连接 {#connection}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `""` | Hindsight API 服务器的 URL。空字符串表示使用本地守护进程。|
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | `null` | 用于身份验证的 API 令牌。Hindsight Cloud 必须提供。|
| `apiPort` | `HINDSIGHT_API_PORT` | `9077` | 本地 `hindsight-embed` 守护进程使用的端口。|

---

### 记忆库 {#memory-bank}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"zcode"` | 用于读取和写入的记忆库。除非启用 `dynamicBankId`，否则所有会话共用此记忆库。|
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 编程助手任务说明 | 描述智能体的用途。创建或更新记忆库时会发送此值。|
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 为 `true` 时，根据 `dynamicBankGranularity` 字段生成唯一的记忆库 ID — 可用于按项目隔离。|
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"zcode"` | 用于推导动态记忆库 ID 的智能体名称。|

---

### 自动召回 {#auto-recall}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回的总开关。|
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 搜索深度：`"low"`（快速）、`"mid"`（均衡）、`"high"`（全面）。|
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 注入的记忆块可使用的 token 预算。|

---

### 自动存入 {#auto-retain}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存入的总开关。|
| `retainEveryNTurns` | `HINDSIGHT_RETAIN_EVERY_N_TURNS` | `1` | 每 N 轮存入一次。默认值 `1` 表示每次 `Stop` 时都存入本轮内容。|

## 与 ZCode 内置记忆的关系 {#relationship-to-zcodes-built-in-memory}

ZCode 自带本地的项目级记忆（`~/.zcode/cli/memories/`）。Hindsight 与之互补：它会将记忆存储在可供多个工具共享的云端（或自托管）记忆库中 — Claude Code、Cursor 和其他 Hindsight 集成都使用同一个记忆库 — 因此你的上下文可以在不同智能体和机器之间随你迁移，而不会只留在某个 ZCode 项目本地。
