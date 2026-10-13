---
title: "Gemini Spark 持久记忆：智能体在 MCP 上发起的记忆召回"
authors: [benfrank241]
slug: "2026/06/15/gemini-spark-persistent-memory"
date: 2026-06-15T12:00
tags: [gemini-spark, memory, persistent-memory, hindsight, agents, mcp, tutorial]
description: "使用Hindsight为Google的Gemini Spark助手添加持久的长期记忆。没有插件主机，没有钩子。 Spark 使用 Hindsight Cloud或自托管 OAuth 代理通过 MCP 调用 Hindsight 的记忆召回和记忆存储工具。"
image: /img/blog/gemini-spark-persistent-memory.webp
hide_table_of_contents: true
---

![Gemini 通过Hindsight激发持久记忆](/img/blog/gemini-spark-persistent-memory.webp)

[Gemini火花](https://gemini.google/overview/agent/spark/)是Google永远在线的特工助手。它会计划、调用工具并在您的一天中工作。它本身无法将一个对话中的任何内容带到下一个对话中。让它记住今天的决定，明天它就会消失。

:::note Spark 正在推出
截至撰写本文时，Gemini Spark 为 **“即将推出。” 截至撰写本文时，Gemini Spark 为 **“即将推出。” 截至撰写本文时，Gemini Spark 为 **"coming soon."** Google 将其描述为 *向值得信赖的测试人员推出*，适用于 Google AI 超级订阅者（18 岁以上，美国）和精选商业用户。下面的Hindsight集成现已准备就绪，面向早期访问受众；如果您还没有 Spark 访问权限，请将此视为您获得 Spark 访问权限后记忆将如何发挥作用的指南。 MCP 配置形状遵循 Google 的 I/O 2026 开发人员指南，并且可能会在正式架构落地时发生变化。** Google 将其描述为 *向值得信赖的测试人员推出*，适用于 Google AI 超级订阅者（18 岁以上，美国）和精选商业用户。下面的Hindsight集成现已准备就绪，面向早期访问受众；如果您还没有 Spark 访问权限，请将此视为您获得 Spark 访问权限后记忆将如何发挥作用的指南。 MCP 配置形状遵循 Google 的 I/O 2026 开发人员指南，并且可能会在正式架构落地时发生变化。** Google 将其描述为 *向值得信赖的测试人员推出*，可供 Google AI Ultra 订阅者（18 岁以上，美国）和精选商业用户使用。下面的Hindsight集成现已准备就绪，面向早期访问受众；如果您还没有 Spark 访问权限，请将此视为您获得 Spark 访问权限后记忆将如何发挥作用的指南。 MCP 配置形状遵循 Google 的 I/O 2026 开发人员指南，并且可能会在正式架构落地时发生变化。
:::

这篇文章是Gemini Spark 的新Hindsight 集成的演练。它与我们大多数集成的形式不同：没有生命周期挂钩，也没有在智能体旁边运行的插件代码。 Spark 完全依赖于 Google 的云，因此唯一的进入方式是 **MCP**，并且集成是一个配置片段，它将 Hindsight 注册为 Spark 可以调用的 MCP 服务器。

## 概览 {#tldr}

<!-- truncate -->

- Gemini Spark 没有跨会话的持久记忆。每次谈话都开始冷淡。
- Hindsight积分为**仅配置**。 `pip install` 没有任何内容，也没有在 Spark 旁边运行的守护进程。您将 Hindsight 注册为 MCP 服务器，Spark 调用其 `recall` 和 `retain` 工具。
- ​​**记忆是智能体发起的，而不是钩子驱动的。** 与Cline 或Claude Code集成不同，Spark 决定何时进行记忆召回以及何时进行记忆存储，因为第三方无法看到 Spark 的提示组件或其记录。
- **Hindsight Cloud是最简单的路径：** 使用 Bearer 令牌将 Spark 指向 `https://api.hindsight.vectorize.io/mcp`，完成。
- **自托管也可以，** 但 Spark 仅与 MCP 服务器使用 OAuth 2.1，因此您将 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cloudflare-oauth-proxy) 放在实例前面。
Spark写入的
- 记忆库是一个普通的Hindsight记忆库。可以从Claude Code、Cline、API或任何其他集成读取相同的存储器。

## 为什么 Spark 与众不同 {#why-spark-is-different}

我们的大多数编码-智能体集成都是通过在智能体主机内运行代码来工作的。 Cline和Cursor暴露了生命周期钩子，因此Hindsight可以自动记忆每个任务之前的上下文，并在任务结束时存储记忆副本。这使得记忆**确定性**：无论模型是否认为需要它，它都会发生。

Spark 没有给你这些。它运行在 Google 的基础设施上，通过反重力 2.0 实现，并且没有插件主机让 Hindsight 代码可以与智能体循环一起运行。下表是对可能性的诚实统计：

|能力|Spark 支持|
|---|---|
|基于 Hook 的自动记忆识别（在提示前添加上下文）|不可用。 Spark 的提示程序集是私有的。当智能体的规划者认为它有用时，它会调用`recall`。|
|基于 Hook 的自动记忆存储（在回合结束时保存成绩单）|不可用。第三方看不到 Spark 的成绩单。当智能体学到值得保留的东西时，它会调用`retain`。|
|MCP 工具（`recall`、`retain` 等）|是的。 Spark通过其内置的MCP客户端调用Hindsight的MCP工具。|

因此，集成完全依赖于 Spark 确实公开的一个表面：MCP。您注册了Hindsight的MCP服务器，从此以后`recall`、`retain`和`reflect`都是Spark可以选择使用的工具。

## 它是如何工作的 {#how-it-works}

### 搭配Hindsight Cloud（推荐） {#with-hindsight-cloud-recommended}

干净的道路。 Spark 使用 MCP 的 Streamable HTTP 传输直接与 通过 HTTPS 访问 Hindsight Cloud 对话：

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + MCP (Streamable HTTP)
        v
Hindsight Cloud (api.hindsight.vectorize.io)
```

没有代理，没有隧道，没有基础设施。云端点已经是支持 OAuth 的 MCP 服务器，并且持有者令牌足以进行身份​​验证。

### 自托管Hindsight {#with-self-hosted-hindsight}

如果您自己运行Hindsight，则会出现一个问题：Spark 只与**OAuth 2.1** 与MCP 服务器通信。具有静态令牌的原始 `hindsight-embed` MCP 服务器无法满足该握手。该集成提供了一个 Cloudflare Worker [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cloudflare-oauth-proxy)，它充当 Spark 期望的 OAuth 授权服务器，并将经过身份验证的请求桥接到您的 Hindsight API 令牌：

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + OAuth 2.1 (Spark's MCP client)
        v
Cloudflare Worker (cloudflare-oauth-proxy)
   - OAuth authorization server
   - Auth bridging to Hindsight API 令牌
        |
        | HTTPS + Cloudflare Tunnel
        v
Self-hosted Hindsight + hindsight-embed (MCP server)
```

对于大多数人来说，云消除了这一切。该代理是为需要记忆以留在自己的基础设施内的团队而存在的。

## 设置 {#setup}

### 选项 1：Hindsight Cloud {#option-1-hindsight-cloud}

1. [免费注册](https://ui.hindsight.vectorize.io)并创建一个记忆库。
2. 从仪表板上复制API密钥。
3. 在 Spark 的 MCP 配置中注册 Hindsight（如下）。

### 选项 2：自托管 {#option-2-self-hosted}

1. 部署一个Hindsight实例并运行指向它的`hindsight-embed`MCP服务器，在公共HTTPS端点上公开。
2. 部署[`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cloudflare-oauth-proxy)，因为 Spark 仅与 MCP 服务器使用 OAuth 2.1。
3. 在 Spark 的 MCP 配置中注册代理 URL（如下）。

### 在 Spark 中注册 Hindsight {#register-hindsight-in-spark}

Spark 通过 Antigravity 2.0，根据您的运行方式从两个位置之一读取 MCP 服务器。

**反重力桌面/IDE** 读取`~/.gemini/antigravity/mcp_config.json`。投入：

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

**托管智能体 / Spark 云** 读取 `antigravity.yaml` 清单。添加 `tools.mcp_servers` 条目：

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

对于自托管，请将端点替换为您的`cloudflare-oauth-proxy` URL。这两个示例文件都位于 [集成目录](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/gemini-spark)：[`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/gemini-spark/mcp_config.example.json) 和 [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/gemini-spark/manifest.example.yaml) 中。

清单上的注释：其形状遵循反重力 2.0 发布的开发人员指南Google。一旦正式模式落地，清单字段名称可能需要进行一些小调整。桌面客户端的 MCP 配置是当今两者中更稳定的。

## 工具说明即提示 {#the-tool-description-is-the-prompt}

因为没有钩子，智能体的行为完全由**MCP工具说明**和清单的`description`字段控制。这是最重要的一个旋钮，因此值得仔细研究。

当 Spark 计划转弯时，它会扫描其拥有的工具及其描述来决定调用什么。模糊的描述（“记忆工具”）会在您想要使用它的时候被忽略。示例清单特意阐明了触发器：

> 每当用户参考之前的对话中过去的工作、决定或偏好时，调用记忆召回。每当用户分享值得记住的事实、偏好或决定时，就调用记忆存储。

如果您希望 Spark 更积极地依赖记忆，请锐化该文本。在回答有关正在进行的项目的问题之前告诉记忆召回，或者在用户陈述约束之后告诉记忆存储。您在这里并不是在配置Hindsight，而是在指导 Spark 的规划器记忆何时相关。

## 验证它是否有效 {#verifying-it-works}

智能体端没有调试日志可供查看，因此测试是行为性的。提示 Spark 一些显然应该路由到记忆工具的东西：

- **记忆再现：**“上周我的公开API决定是什么？”应该触发 `recall` 调用。
- **记忆存储：**“请记住，对于新项目，我更喜欢TypeScript严格模式。”应该触发 `retain` 调用。

然后开始新的对话并询问 Spark 它对您的 TypeScript 偏好了解多少。如果记忆连接正确，第二个会话会回忆第一个会话存储的内容。您也可以从另一面确认：在Hindsight仪表板中打开您的记忆库，然后看到保留的记忆出现。

## 权衡 {#tradeoffs}

**记忆是尽力而为，但不能保证。** 这是主要的权衡，也是此集成与基于钩子的集成读起来不同的原因。使用Cline，记忆召回可以在每个任务上运行，无论模型是否需要。对于 Spark，只有当规划者决定调用该工具时，记忆才会发生。好的工具描述可以帮助你完成大部分工作，但不具备记忆能力的模型则不会。

**您看不到 Spark 的成绩单。** 记忆存储仅捕获智能体选择传递到`retain`工具中的内容，而不是完整的对话。如果 Spark 用一句话总结一个决策并将其存储，那么您将得到该句子。没有像 Cline 集成运行那样的转录本累积步骤，因为转录本没有公开。

​​**自托管添加了 OAuth 跃点。** Cloudflare 代理是一个真正需要部署和保持活动的基础设施。如果您没有自行托管的硬性要求，云会完全跳过它。

## 回顾 {#recap}

||Spark 默认|与 Hindsight (MCP)|
| --- | --- | --- |
|跨课程记忆|无|持久，根据记忆库|
|设置|不适用|仅配置：注册一台 MCP 服务器|
|记忆召回机制|不适用|智能体发起的`recall`工具调用|
|记忆存储机制|不适用|智能体发起的`retain`工具调用|
|决定论|不适用|尽力而为（计划者决定），通过工具描述进行调整|
|跨工具共享|不适用|可从 Claude Code、Cline、API 读取相同的记忆库|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Gemini火花+Hindsight](/sdks/integrations/gemini-spark)
- **来源：**[vectorize-io/hindsight/hindsight-integrations/gemini-spark](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/gemini-spark)
- **OAuth 代理：**[cloudflare-oauth-proxy](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cloudflare-oauth-proxy)
- **为什么MCP用于记忆：**[MCP 客户端的本机 OAuth](/blog/2026/03/30/mcp-oauth-native)
