---
sidebar_position: 2
title: "使用 Hindsight 为 Agent Plugins 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 Codex、Cursor、GitHub Copilot、Kiro、VS Code 等 Agent Plugins 客户端提供长期记忆。一个可移植的标准插件将 Hindsight MCP 服务器和记忆技能打包在一起，用于召回、存入和反思。"
---

# Agent Plugins

由 [Hindsight](https://vectorize.io/hindsight) 驱动，为任意 [Agent Plugins](https://agent-plugins.org) 客户端提供可移植的长期记忆。

[Agent Plugins](https://agent-plugins.org) 是厂商中立的开放标准，由 Amazon、Cursor、Microsoft、OpenAI 和 Vercel 共同开发，用于将 **Agent Skills + MCP 服务器**打包为单一可分发插件。Hindsight 提供**一个**所有兼容客户端都能加载的插件，无需为每种工具分别集成。该插件发布时支持 **ChatGPT / Codex、Cursor、GitHub Copilot、Kiro 和 VS Code**。

:::warning Codex
Codex 的 Agent Plugins 加载器会丢弃本插件的 `Authorization` 请求头，因此插件无法通过 Codex 完成身份验证。请改用[编程智能体](/sdks/integrations/coding-agents)集成，详见下文 [Codex](#codex)。
:::

## 快速开始 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 Hindsight Cloud API 密钥，无需自行托管，也无需管理本地守护进程。
:::

1. 从 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取 `hsk_...` API 密钥。
2. 设置插件要读取的环境变量：

   ```bash
   export HINDSIGHT_API_KEY="hsk_your_token"
   export HINDSIGHT_BANK_ID="my-project"   # 可选；参见下文“记忆库选择”
   ```

3. 在客户端中安装插件（通过客户端的插件/MCP 界面，或指定插件目录；按照该标准，各客户端的安装方式有所不同）。

安装后，可以向智能体提出一个依赖过往上下文的问题，或告诉它一项值得长期记住的偏好。随附的技能会引导智能体自动调用 `recall` 和 `retain`。

## 插件包含什么 {#whats-in-the-plugin}

该插件是一个仅负责传输的轻量封装；所有记忆逻辑都留在 Hindsight 服务端。它遵循 Agent Plugins `1.0.0` 的目录结构：

```
agent-plugin/
├── plugin.json                       # 清单（$schema + name + metadata）
├── mcp.json                          # Hindsight MCP 服务器（Streamable HTTP）
└── skills/
    └── hindsight-memory/
        └── SKILL.md                  # 指导智能体何时召回、存入或反思
```

- **`mcp.json`** 通过 Streamable HTTP 将客户端连接到 Hindsight 内置的 [MCP 服务器](/developer/mcp-server)。
- **`skills/hindsight-memory/SKILL.md`** 会加载到智能体的上下文中，让它知道*何时*使用记忆，而不仅仅是知道这些工具存在。

## 记忆工具 {#memory-tools}

通过 MCP 服务器，智能体可以使用 Hindsight 的全部记忆功能。它最常用的三个工具是：

| 工具 | 使用时机 | 功能 |
|------|------|--------------|
| `recall` | 回答前，过往上下文可能有帮助时 | 对记忆库进行语义、关键词、图关系和时间检索 |
| `retain` | 学到持久且可复用的事实后 | 存入该事实，供后续会话使用 |
| `reflect` | 单次查询过于浅显，需要综合推理时 | 根据性格倾向，对已记住的所有内容进行推理 |

此外还提供知识页、心智模型、文档和标签等工具，详见 [MCP 服务器参考](/developer/mcp-server)。

## 配置 {#configuration}

插件会读取两个环境变量，并将其插入 `mcp.json`：

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| API 密钥 | `HINDSIGHT_API_KEY` | — | `hsk_...` 密钥，通过 `Authorization: Bearer` 发送。使用 Hindsight Cloud 时必填。 |
| 记忆库 | `HINDSIGHT_BANK_ID` | 见下文 | 要读取和写入的记忆库，通过 `X-Bank-Id` 发送。可为每位用户、每个项目或每个团队使用单独的记忆库，以实现隔离。 |

:::note 各客户端的环境变量语法不同
多数客户端会替换 `${VAR}`；VS Code、Cursor 等客户端使用 `${env:VAR}`。如果客户端不进行插值，请在 `mcp.json` 中直接填写密钥和记忆库 ID。Codex 中这样做无效，因为它无论 `Authorization` 的值是什么都会删除该请求头。
:::

**未设置 `HINDSIGHT_BANK_ID` 时的记忆库选择。** 能替换变量的客户端会发送空的 `X-Bank-Id`，服务器随后使用 `default` 记忆库。不会替换变量的客户端则会发送字面文本 `${HINDSIGHT_BANK_ID}`，Hindsight 会将其视为记忆库名称：读取操作会因找不到该记忆库而失败，而首次 `retain` 会创建一个同名记忆库。请设置该变量，或直接填写记忆库 ID，以避免这种情况。

**自行托管：** 将 `mcp.json` 中的主机地址（`https://api.hindsight.vectorize.io`）替换为你的部署地址。开放了 MCP 端点的本地服务器无需 API 密钥。

## Codex

Codex 的 Agent Plugins 加载器将 `Authorization` 视为只能由客户端设置的请求头，因此会删除插件 `mcp.json` 中的该请求头。它还会原样复制其他请求头，不会展开其中的 `${VAR}` 占位符。因此，这个可移植插件无法从 Codex 向 Hindsight Cloud 完成身份验证；直接填写密钥也无济于事，因为无论该请求头的值是什么，它都会被删除。

在 Codex 中，请使用[编程智能体](/sdks/integrations/coding-agents)集成。它会写入 Codex 原生 MCP 配置，并添加自动召回/存入钩子：

```bash
npx @vectorize-io/hindsight-coding-agents install codex
```

## 显式工具与自动采集 {#explicit-tools-vs-automatic-capture}

Agent Plugins `1.0.0` 标准化了 **Skills + MCP**，但没有标准化会话生命周期钩子。因此，本插件提供由工具显式驱动的记忆功能，在所有受支持的客户端中行为一致。

如需完全自动的体验——每次提示前注入召回结果，并在会话结束时存入对话记录——请使用基于钩子的[编程智能体](/sdks/integrations/coding-agents)集成。它支持 Claude Code、Codex 以及许多其他编程智能体。两种集成共用相同的 Hindsight 记忆库，因此通过钩子采集的记忆可以由 Agent Plugin 召回，反之亦然。

## 故障排查 {#troubleshooting}

**没有召回到记忆**：只有在存入过内容后，`recall` 才会返回结果。请先存入一条事实，或通过 [API](/developer/api/quickstart) 为记忆库初始化数据。

**401 Unauthorized**：检查是否已设置 `HINDSIGHT_API_KEY`，以及客户端是否将其插入 `Authorization` 请求头（参见上方的环境变量语法说明）。在 Codex 中出现此错误是预期行为：请求头会被删除，因此请改用 [Codex](#codex) 所述方案。

**出现名为 `${HINDSIGHT_BANK_ID}` 的记忆库**：客户端发送了尚未替换的占位符。请设置该变量，或在 `mcp.json` 中直接填写记忆库 ID，然后删除误建的记忆库。

**记忆内容不正确或为空**：确认 `HINDSIGHT_BANK_ID` 指向预期的记忆库。不同工具若写入不同记忆库，就不会共享记忆。

## 了解更多 {#learn-more}

- [Agent Plugins 标准](https://agent-plugins.org)
- [Hindsight MCP 服务器参考](/developer/mcp-server)
- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)
