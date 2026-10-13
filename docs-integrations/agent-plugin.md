---
sidebar_position: 2
title: "使用 Hindsight 为 Agent Plugins 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 Codex、Cursor、GitHub Copilot、Kiro、VS Code 等 Agent Plugins 客户端提供长期记忆。一个可移植的标准插件包含 MCP 服务器和记忆技能，支持召回、存储和反思。"
---

# Agent Plugins

由 [Hindsight](https://vectorize.io/hindsight) 驱动，为任意 [智能体插件](https://agent-plugins.org) 客户端提供可移植的长期记忆。

[智能体插件](https://agent-plugins.org) 是厂商中立的开放标准，与 Amazon、Cursor、Microsoft、OpenAI 和 Vercel 共同开发，将 **Agent Skills 与 MCP 服务器**打包为单一可分发插件。Hindsight 提供**一个**所有兼容客户端均可加载的插件，无需逐工具单独集成。发布时支持 **ChatGPT / Codex、Cursor、GitHub Copilot、Kiro 和 VS Code**。

:::warning Codex
Codex 的 Agent Plugins 加载器会丢弃本插件的 `Authorization` 请求头，导致无法认证。请改用[编程智能体](/sdks/integrations/coding-agents)集成，见下文 [Codex](#codex)。
:::

## 快速开始 {#quick-start}

:::tip 推荐使用 Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)以获取 Hindsight Cloud API 密钥，无需自行托管或管理本地守护进程。
:::

1. 从 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取 `hsk_...` API 密钥。
2. 设置插件读取的环境变量：

   ```bash
   export HINDSIGHT_API_KEY="hsk_your_token"
   export HINDSIGHT_BANK_ID="my-project"   # 可选，见下文记忆库选择说明
   ```

3. 在客户端安装插件：使用其插件／MCP 界面，或指定插件目录。标准允许各客户端采用自己的安装方式。

安装后，可以提出依赖历史上下文的问题，或告诉智能体一项长期偏好。随附技能会引导它自动调用 `recall` 和 `retain`。

## 插件内容 {#whats-in-the-plugin}

插件只是轻量的传输层包装，所有记忆逻辑都留在 Hindsight 服务端，目录结构遵循 Agent Plugins `1.0.0`：

```
agent-plugin/
├── plugin.json                       # 清单（$schema + name + metadata）
├── mcp.json                          # Hindsight MCP 服务器（Streamable HTTP）
└── skills/
    └── hindsight-memory/
        └── SKILL.md                  # 指导何时召回、存储和反思
```

- **`mcp.json`**：通过 Streamable HTTP 将客户端连接到 Hindsight 内置的 [MCP 服务器](/developer/mcp-server)。
- **`skills/hindsight-memory/SKILL.md`**：加载到智能体上下文，使它知道*何时*使用记忆，而不仅是知道工具存在。

## 记忆工具 {#memory-tools}

通过 MCP 服务器，智能体可使用 Hindsight 的完整记忆能力，最常用的是：

| 工具 | 使用时机 | 作用 |
|------|------|--------------|
| `recall` | 回答前，历史上下文可能有帮助时 | 对记忆库执行语义、关键词、图和时间检索 |
| `retain` | 学到持久且可复用的事实后 | 为后续会话存储事实 |
| `reflect` | 简单查询不够，需要综合推理时 | 结合已记住的内容，按性格倾向推理 |

此外还提供知识页面、心智模型、文档和标签工具，见 [MCP 服务器参考](/developer/mcp-server)。

## 配置 {#configuration}

插件读取两个环境变量，并将值插入 `mcp.json`：

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| API 密钥 | `HINDSIGHT_API_KEY` | — | `hsk_...` 密钥，以 `Authorization: Bearer` 发送。使用 Hindsight Cloud 时必填。 |
| 记忆库 | `HINDSIGHT_BANK_ID` | 见下文 | 读写的记忆库，以 `X-Bank-Id` 发送。可按用户、项目或团队分别设置，以实现隔离。 |

:::note 各客户端的环境变量语法不同
多数客户端使用 `${VAR}`；VS Code、Cursor 等使用 `${env:VAR}`。如果客户端不替换变量，请在 `mcp.json` 中直接填写密钥和记忆库 ID。Codex 不适用，因为它无论请求头值为何都会删除 `Authorization`。
:::

**未设置 `HINDSIGHT_BANK_ID` 时如何选择记忆库。** 支持变量替换的客户端发送空 `X-Bank-Id`，服务器使用 `default` 记忆库。不支持替换的客户端发送字面值 `${HINDSIGHT_BANK_ID}`，Hindsight 将其视为记忆库名称：读取报记忆库不存在，首次 `retain` 则创建该名称的记忆库。设置变量或直接填写记忆库 ID 可避免此情况。

**自行托管：** 将 `mcp.json` 中的主机地址（`https://api.hindsight.vectorize.io`）替换为部署地址。开放 MCP 端点的本地服务器无需 API 密钥。

## Codex

Codex 的 Agent Plugins 加载器认为 `Authorization` 只能由客户端设置，因此会删除插件 `mcp.json` 中的该请求头；其他请求头也原样复制，不展开 `${VAR}` 占位符。因此此可移植插件无法从 Codex 认证到 Hindsight Cloud，直接填写密钥也无效，因为请求头始终会被删除。

Codex 请使用[编程智能体](/sdks/integrations/coding-agents)集成，它写入 Codex 原生 MCP 配置，并添加自动召回／存储钩子：

```bash
npx @vectorize-io/hindsight-coding-agents install codex
```

## 显式工具与自动采集 {#explicit-tools-vs-automatic-capture}

Agent Plugins `1.0.0` 标准化了 **Skills 与 MCP**，没有标准化会话生命周期钩子。因此本插件提供**显式、工具驱动**的记忆，在所有支持的客户端中保持一致。

若需要完全自动的体验，即每次提示前注入召回结果、会话结束时存储记录，请使用基于钩子的[编程智能体](/sdks/integrations/coding-agents)集成，它支持 Claude Code、Codex 等工具。两种集成共享同一 Hindsight 记忆库，所以钩子采集的记忆可通过 Agent Plugin 召回，反之亦然。

## 故障排查 {#troubleshooting}

**没有召回记忆**：只有存储过内容后，`recall` 才会返回结果。先存储一条事实，或通过 [API](/developer/api/quickstart) 初始化记忆库。

**401 Unauthorized**：检查 `HINDSIGHT_API_KEY` 是否设置，客户端是否将其替换进 `Authorization` 请求头，见上文环境变量语法说明。Codex 中这是预期情况，因为请求头会被删除，请使用 [Codex](#codex) 对应的集成方式。

**出现名为 `${HINDSIGHT_BANK_ID}` 的记忆库**：客户端未替换占位符。设置变量或在 `mcp.json` 中直接填写记忆库 ID，再删除误建的记忆库。

**记忆错误或为空**：确认 `HINDSIGHT_BANK_ID` 指向预期记忆库。不同工具写入不同记忆库时不会共享记忆。

## 了解更多 {#learn-more}

- [智能体插件标准](https://agent-plugins.org)
- [Hindsight MCP 服务器参考](/developer/mcp-server)
- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)
