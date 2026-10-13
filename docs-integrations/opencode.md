---
sidebar_position: 20
title: "OpenCode 持久记忆Hindsight |一体化"
description: "用Hindsight将长期记忆添加到OpenCode。自动捕获对话并回忆编码会话中的相关上下文。"
---

# OpenCode {#opencode}

:::warning 已被 编码智能体 插件取代
**opencode 插件** 被 取代 [编码智能体插件](/sdks/integrations/coding-agents) — 一个
包涵盖Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin 和 Cline 以及其他 CLI 智能体，并且每个存储库都共享它们的记忆库
。

此页面和已发布的包仍然有效；它们不再被开发。切换：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install opencode
```

记忆不会自动移动——记忆库的范围不同，并且该智能体的历史记录无法导入（它保存在内部数据库中）。参见
[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


持久长期记忆插件[OpenCode](https://opencode.ai) 使用 [Hindsight](https://vectorize.io/hindsight)。自动捕获对话，回忆会话开始时的相关上下文，并提供retain/recall/reflect智能体可以直接调用的工具。

[查看更新日志 →](/changelog/integrations/opencode)

## 快速入门 {#quick-start}

添加到您的`opencode.json`（项目）或`~/.config/opencode/opencode.json`（全局）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

OpenCode自动安装插件 `"plugin"` 启动时的数组 — 否 需要 `npm install`。

将插件指向您的Hindsight服务器并启动OpenCode：

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
opencode
```

### 使用Hindsight Cloud {#using-hindsight-cloud}

获取API 密钥位于 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect)：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="your-api-key"
opencode
```

或者通过中的插件选项配置内联 `opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "https://api.hindsight.vectorize.io",
      "hindsightApiToken": "your-api-key"
    }]
  ]
}
```

## 功能 {#features}

### 自定义工具 {#custom-tools}

该插件注册了智能体可以显式调用的三个工具：

|工具|说明|
|---|---|
|`hindsight_retain`|将信息存储在长期记忆中|
|`hindsight_recall`|搜索长期记忆中的相关信息|
|`hindsight_reflect`|根据长期记忆生成综合答案|

### 自动记忆存储 {#auto-retain}

当会话空闲时 (`session.idle`事件），插件会自动保留对话记录Hindsight。可通过 配置 `retainEveryNTurns`控制频率。

### 会话记忆召回 {#session-recall}

当新会话开始时，插件会调用相关项目上下文并将其注入系统提示符中，从而使智能体能够访问先前会话的记忆。

### 压紧钩 {#compaction-hook}

当OpenCode压缩上下文窗口时，插件：
1. 保留压缩前的当前对话
2. 调用相关记忆并将其注入到压缩上下文中

这可以确保记忆在上下文窗口修剪中幸存下来。

## 配置 {#configuration}

### 插件选项 {#plugin-options}

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "hindsightApiToken": "your-api-key",
      "bankId": "my-project",
      "autoRecall": true,
      "autoRetain": true,
      "recallBudget": "mid",
      "recallTags": [],
      "recallTagsMatch": "any",
      "retainTags": [],
      "retainEveryNTurns": 3,
      "debug": false
    }]
  ]
}
```

### 配置文件 {#config-file}

创建`~/.hindsight/opencode.json` 适用于所有项目的持久配置：

```json
{
  "hindsightApiUrl": "http://localhost:8888",
  "hindsightApiToken": "your-api-key",
  "recallBudget": "mid"
}
```

### 环境变量 {#environment-variables}

|变量|说明|默认|
|---|---|---|
|`HINDSIGHT_API_URL`|Hindsight API 基本 URL|*（必填）*|
|`HINDSIGHT_API_TOKEN`|API 用于身份验证的密钥||
|`HINDSIGHT_BANK_ID`|静态记忆 记忆库 ID|`opencode`|
|`HINDSIGHT_AGENT_NAME`|动态记忆库 ID 的智能体名称|`opencode`|
|`HINDSIGHT_AUTO_RECALL`|会话开始时自动记忆召回|`true`|
|`HINDSIGHT_AUTO_RETAIN`|会话空闲时自动记忆存储|`true`|
|`HINDSIGHT_RETAIN_MODE`|`full-session`或`last-turn`|`full-session`|
|`HINDSIGHT_RECALL_BUDGET`|记忆召回预算：`low`，`mid`，`high`|`mid`|
|`HINDSIGHT_RECALL_MAX_TOKENS`|记忆结果的最大 token 数数|`1024`|
|`HINDSIGHT_RECALL_TAGS`|用逗号分隔的标签来过滤记忆召回结果||
|`HINDSIGHT_RECALL_TAGS_MATCH`|标签匹配模式：`any`，`all`，`any_strict`，`all_strict`|`any`|
|`HINDSIGHT_DYNAMIC_BANK_ID`|启用动态记忆库ID派生|`false`|
|`HINDSIGHT_BANK_MISSION`|记忆库mission/context为恍||

配置优先级（稍后获胜）：默认 < `~/.hindsight/opencode.json` < 插件选项 < 环境变量。

### 日志记录和调试 {#logging--debugging}

插件登录通过OpenCode自己的日志流（`service=hindsight`)，通过 可见 `opencode --print-logs` 或在OpenCode日志文件。错误（失败retain/recall，无法到达API，身份验证问题）以及已解决的问题APIURL + 记忆库已记录 **默认** — 因此，如果记忆没有保存，原因显而易见，无需任何选择。

详细跟踪由 控制 `debug`选项，即**仅需配置**（套装`"debug": true` `opencode.json`插件选项或`~/.hindsight/opencode.json`）。故意没有`HINDSIGHT_DEBUG` 环境变量：环境变量设置不可靠OpenCode的插件运行时（特别是在Windows，坚持不懈的地方OpenCode服务器可能永远不会看到它们）。

```json
{
  "plugin": [["@vectorize-io/opencode-hindsight", { "debug": true }]]
}
```

## 动态记忆库ID {#dynamic-bank-ids}

对于多项目隔离，启用动态记忆库ID派生：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

记忆库ID由粒度字段组成（默认：`agent::project`）。支持的字段：`agent`，`project`，`channel`，`user`。

对于多用户场景（例如，为多个用户提供服务的共享智能体）：

```bash
export HINDSIGHT_CHANNEL_ID="slack-general"
export HINDSIGHT_USER_ID="user123"
```

## 工作原理 {#how-it-works}

1. **插件加载**当OpenCode开始 — 创建一个 `HindsightClient`，导出记忆库ID，注册工具+钩子
2. **会话开始时** — `session.created` 事件触发器，插件标记记忆召回注入会话
3. **系统转换** — 在第一个LLM调用，召回记忆注入系统提示
4. **智能体工作** — 可以打电话 `hindsight_recall` 和 `hindsight_retain` 在会议期间明确
5. **会话空闲时** — `session.idle`事件触发对话的自动记忆存储
6. **上下文压缩** — 如果上下文窗口填满，则通过压缩保留记忆
