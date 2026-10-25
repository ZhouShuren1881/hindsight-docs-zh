---
title: "Gemini Spark 持久记忆：智能体通过 MCP 主动发起召回"
authors: [benfrank241]
slug: "2026/06/15/gemini-spark-persistent-memory"
date: 2026-06-15T12:00
tags: [gemini-spark, memory, persistent-memory, hindsight, agents, mcp, tutorial]
description: "使用 Hindsight 为 Google 的 Gemini Spark 助手添加持久的长期记忆。无需插件宿主，也无需钩子。Spark 通过 MCP 调用 Hindsight 的 recall 和 retain 工具，可选择使用 Hindsight Cloud 或自托管 OAuth 代理。"
image: /img/blog/gemini-spark-persistent-memory.webp
hide_table_of_contents: true
---

![Gemini Spark 与 Hindsight 实现持久记忆](/img/blog/gemini-spark-persistent-memory.webp)

[Gemini Spark](https://gemini.google/overview/agent/spark/) 是 Google 的常驻智能体助手。它可以规划、调用工具，并在你的一天中协助处理各种事务。但它不会自行把一次对话中的内容带到下一次对话中。今天让它记住一项决定，明天这项决定就不见了。

:::note Spark 正在逐步开放
截至本文撰写时，Gemini Spark 仍处于 **“即将推出”** 阶段。Google 将其描述为 *正在向可信测试者逐步开放*，目前面向年满 18 岁、位于美国的 Google AI Ultra 订阅者以及部分企业用户。下文介绍的 Hindsight 集成已经可以使用，面向这批早期体验用户；如果你还无法使用 Spark，可以把本文当作一份指南，了解获得访问权限后记忆功能会如何运作。MCP 配置格式依据 Google 在 I/O 2026 上发布的开发者指南，正式模式确定后可能会有所调整。
:::

本文将介绍 Gemini Spark 的全新 Hindsight 集成。它与我们大多数集成的形式不同：没有生命周期钩子，也没有在智能体旁边运行的插件代码。Spark 完全运行在 Google Cloud 上，因此只能通过 **MCP** 接入；集成只需一段配置，用于将 Hindsight 注册为 Spark 可调用的 MCP 服务器。

## 概要 {#tldr}

<!-- truncate -->

- Gemini Spark 不会在会话之间保留记忆。每次对话开始时，它都没有先前会话的上下文。
- Hindsight 集成**只需配置**。无需执行 `pip install`，也没有在 Spark 旁边运行的守护进程。将 Hindsight 注册为 MCP 服务器后，Spark 就可以调用它的 `recall` 和 `retain` 工具。
- **记忆由智能体主动发起，而非由钩子驱动。** 与 Cline 或 Claude Code 集成不同，Spark 会自行决定何时召回、何时存入，因为第三方无法查看 Spark 的提示组装过程或对话记录。
- **Hindsight Cloud 是最简单的方式：** 让 Spark 连接到 `https://api.hindsight.vectorize.io/mcp` 并提供 Bearer 令牌即可。
- **也可以自托管，** 但 Spark 连接 MCP 服务器时只支持 OAuth 2.1，因此需要在自己的实例前部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)。
- Spark 写入的是普通的 Hindsight 记忆库。你可以通过 Claude Code、Cline、API 或任何其他集成读取同一批记忆。

## Spark 有何不同 {#why-spark-is-different}

我们的大多数编程智能体集成都通过在智能体宿主中运行代码来工作。Cline 和 Cursor 提供生命周期钩子，因此 Hindsight 可以在每项任务开始前自动召回上下文，并在任务结束时存入对话记录。这样一来，记忆操作是**确定性的**：无论模型是否想到要调用，都会执行。

Spark 不提供这些能力。它运行在 Google 的基础设施上，通过 Antigravity 2.0 接入，也没有可供 Hindsight 代码与智能体循环并行运行的插件宿主。下表如实列出了可实现的功能：

| 功能 | Spark 支持情况 |
| --- | --- |
| 基于钩子的自动召回（将上下文前置到提示中） | 不支持。Spark 的提示组装过程不公开。智能体会在规划器认为有用时调用 `recall`。 |
| 基于钩子的自动存入（在轮次结束时保存对话记录） | 不支持。第三方看不到 Spark 的对话记录。智能体学到值得保留的信息时会调用 `retain`。 |
| MCP 工具（`recall`、`retain` 等） | 支持。Spark 通过内置的 MCP 客户端调用 Hindsight 的 MCP 工具。 |

因此，这项集成完全依赖 Spark 开放的唯一接入方式：MCP。注册 Hindsight 的 MCP 服务器后，Spark 就可以选择使用 `recall`、`retain` 和 `reflect` 工具。

## 工作原理 {#how-it-works}

### 使用 Hindsight Cloud（推荐） {#with-hindsight-cloud-recommended}

这是最直接的方式。Spark 使用 MCP 的 Streamable HTTP 传输，通过 HTTPS 直接与 Hindsight Cloud 通信：

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + MCP (Streamable HTTP)
        v
Hindsight Cloud (api.hindsight.vectorize.io)
```

无需代理、隧道或其他基础设施。Cloud 端点本身就是支持 OAuth 的 MCP 服务器，只需 Bearer 令牌即可完成身份验证。

### 自托管 Hindsight {#with-self-hosted-hindsight}

如果你自行运行 Hindsight，需要注意一个问题：Spark 连接 MCP 服务器时只支持 **OAuth 2.1**。使用静态令牌的原始 `hindsight-embed` MCP 服务器无法完成这套握手流程。该集成提供了一个 Cloudflare Worker [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)，充当 Spark 所需的 OAuth 授权服务器，并将通过身份验证的请求转接到你的 Hindsight API 令牌：

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + OAuth 2.1 (Spark's MCP client)
        v
Cloudflare Worker (cloudflare-oauth-proxy)
   - OAuth authorization server
   - Auth bridging to Hindsight API token
        |
        | HTTPS + Cloudflare Tunnel
        v
Self-hosted Hindsight + hindsight-embed (MCP server)
```

对大多数人来说，使用 Cloud 就能省去这一整套配置。提供代理是为了满足那些必须将记忆保留在自有基础设施中的团队的需求。

## 设置 {#setup}

### 选项 1：Hindsight Cloud {#option-1-hindsight-cloud}

1. [免费注册](https://ui.hindsight.vectorize.io)并创建一个记忆库。
2. 从控制台复制 API 密钥。
3. 在 Spark 的 MCP 配置中注册 Hindsight（见下文）。

### 选项 2：自托管 {#option-2-self-hosted}

1. 部署 Hindsight 实例，并运行指向该实例、通过公共 HTTPS 端点对外提供服务的 `hindsight-embed` MCP 服务器。
2. 部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)，因为 Spark 连接 MCP 服务器时只支持 OAuth 2.1。
3. 在 Spark 的 MCP 配置中注册代理 URL（见下文）。

### 在 Spark 中注册 Hindsight {#register-hindsight-in-spark}

Spark 通过 Antigravity 2.0，根据运行方式从以下两个位置之一读取 MCP 服务器配置。

**Antigravity 桌面版 / IDE** 从 `~/.gemini/antigravity/mcp_config.json` 读取配置。将以下内容加入文件：

```json
{
  "mcpServers": {
    "hindsight": {
      "serverUrl": "https://api.hindsight.vectorize.io/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_HINDSIGHT_API_KEY"
      }
    }
  }
}
```

**托管智能体 / Spark Cloud** 从 `antigravity.yaml` 清单读取配置。添加 `tools.mcp_servers` 条目：

```yaml
tools:
  mcp_servers:
    - name: hindsight
      endpoint: https://api.hindsight.vectorize.io/mcp
      auth: bearer
      description: >
        Long-term memory across sessions. Call recall whenever the user
        references past work, decisions, or preferences from earlier
        conversations. Call retain whenever the user shares a fact,
        preference, or decision worth remembering.
```

如果是自托管，请将 endpoint 替换为你的 `cloudflare-oauth-proxy` URL。两个示例文件都位于[集成目录](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/gemini-spark)：[`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/mcp_config.example.json) 和 [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/manifest.example.yaml)。

关于清单：其格式依据 Google 随 Antigravity 2.0 发布的开发者指南。正式模式发布后，清单字段名可能需要做小幅调整。就目前而言，桌面客户端的 MCP 配置更为稳定。

## 工具说明就是提示词 {#the-tool-description-is-the-prompt}

由于没有钩子，智能体的行为完全由 **MCP 工具说明**和清单中的 `description` 字段引导。这是最关键的调节手段，值得仔细说明。

Spark 规划一轮对话时，会查看可用工具及其说明，再决定调用哪些工具。含糊的说明（例如“记忆工具”）会让工具在你最希望它被使用时遭到忽略。示例清单特意明确写出了触发条件：

> 用户提及先前对话中的过往工作、决定或偏好时，调用 `recall`。用户分享值得记住的事实、偏好或决定时，调用 `retain`。

如果你希望 Spark 更积极地使用记忆，可以把触发条件写得更明确。例如，要求它在回答正在进行的项目相关问题前先调用 `recall`，或在用户提出一项约束后调用 `retain`。这里配置的重点与其说是 Hindsight，不如说是告诉 Spark 的规划器何时应当使用记忆。

## 验证是否生效 {#verifying-it-works}

智能体端没有调试日志可供查看，因此要通过行为来验证。给 Spark 一条显然应该调用记忆工具的提示：

- **召回：**“我上周有哪些尚未解决的 API 决定？”这应该会触发一次 `recall` 调用。
- **存入：**“请记住，新项目中我偏好启用 TypeScript 严格模式。”这应该会触发一次 `retain` 调用。

然后开启一段新对话，询问 Spark 记得哪些与你的 TypeScript 偏好有关的信息。如果记忆接入正常，第二个会话就能召回第一个会话存入的信息。你也可以从另一端验证：在 Hindsight 控制台打开记忆库，查看存入的记忆是否出现。

## 取舍 {#tradeoffs}

**记忆尽力而为，并非有保证。** 这是主要的取舍，也是本集成与基于钩子的集成有所不同的原因。使用 Cline 时，无论模型是否认为有必要，召回都会在每项任务中运行。使用 Spark 时，只有规划器决定调用工具，才会发生召回。编写良好的工具说明能解决大部分问题，但如果模型没有想到要召回，召回就不会发生。

**你看不到 Spark 的对话记录。** `retain` 只会存入智能体选择传给该工具的内容，不会捕获完整对话。如果 Spark 用一句话概括一项决定并将其存入，那么你得到的就是这句话。由于对话记录不对外公开，因此不会像 Cline 集成那样累积对话记录。

**自托管会增加一道 OAuth 转接环节。** Cloudflare 代理是一项实际的基础设施，需要部署并保持运行。如果你没有必须自托管的要求，使用 Cloud 就能完全省去这项工作。

## 回顾 {#recap}

|  | Spark 默认情况 | 使用 Hindsight（MCP） |
| --- | --- | --- |
| 跨会话记忆 | 无 | 持久记忆，按记忆库隔离 |
| 设置 | 不适用 | 只需配置：注册一个 MCP 服务器 |
| 召回机制 | 不适用 | 由智能体主动调用 `recall` 工具 |
| 存入机制 | 不适用 | 由智能体主动调用 `retain` 工具 |
| 确定性 | 不适用 | 尽力而为（由规划器决定），可通过工具说明调整 |
| 跨工具共享 | 不适用 | Claude Code、Cline 和 API 都能读取同一个记忆库 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Gemini Spark + Hindsight](/sdks/integrations/gemini-spark)
- **源码：**[vectorize-io/hindsight/hindsight-integrations/gemini-spark](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/gemini-spark)
- **OAuth 代理：**[cloudflare-oauth-proxy](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)
- **为什么通过 MCP 实现记忆：**[MCP 客户端的原生 OAuth](/blog/2026/03/30/mcp-oauth-native)
