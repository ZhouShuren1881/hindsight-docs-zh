---
title: "Flowise 持久记忆：适用于任意聊天流程的即插即用工具节点"
authors: [benfrank241]
slug: "2026/06/10/flowise-persistent-memory"
date: 2026-06-10T12:00
tags: [flowise, memory, persistent-memory, hindsight, agents, langchain, tutorial]
description: "使用 Hindsight 为任意 Flowise 聊天流程或智能体添加持久的长期记忆。三个工具节点（Retain、Recall、Reflect）可直接接入对话智能体，并共用一个 Hindsight API 凭据。"
image: /img/blog/flowise-persistent-memory.webp
hide_table_of_contents: true
---

![Flowise 与 Hindsight 持久记忆](/img/blog/flowise-persistent-memory.webp)

[Flowise](https://flowiseai.com) 是 LangChain 的可视化聊天流程构建器。你可以把聊天模型、工具和智能体拖到画布上并连接起来，无需编写编排代码，就能交付一个可用的助手。默认情况下，你无法交付一个能跨会话记住内容的智能体，因为 Flowise 聊天流程在每次运行之间都是无状态的。

本文将介绍全新的 Hindsight Flowise 集成。它新增了三个工具节点（Retain（存入）、Recall（召回）、Reflect（反思）），任何聊天流程都可以将它们连接到智能体；三个节点共用一个凭据，并使用同一个记忆库，就像其他 Hindsight 集成一样。

## 概览 {#tldr}

<!-- truncate -->

- Flowise 的 **Tools** 下新增了三个工具节点：**Hindsight Retain**、**Hindsight Recall** 和 **Hindsight Reflect**。
- 三个节点都会返回 LangChain `DynamicStructuredTool`，因此可以接入任何 Flowise Conversational Agent、Tool Agent，或任何接受工具的自定义流程。
- 一个共享的 **Hindsight API** 凭据可供三个节点使用；配置一次，即可到处复用。
- **推荐使用 Hindsight Cloud。** 无需自行运行基础设施；凭据中的默认 URL 指向 Cloud。
- 记忆库是常规的 Hindsight 记忆库：它与通过 Claude Code、Cline、Codex 或直接调用 API 写入的记忆库相同。不同工具可以共享这些记忆。

## Flowise 为什么需要持久记忆 {#why-flowise-needs-persistent-memory}

Flowise 为非开发人员（以及赶时间的开发人员）提供了一种真正可行的方式，无需编写编排代码就能搭建可用的智能体。拖入 `ChatOpenAI`，放入 `Conversational Agent`，接上 `Calculator` 工具，然后部署，就能运行。

Flowise 的问题在于它不会记住用户。智能体的工作记忆仅限于当前对话。关闭聊天窗口，下次会话就从头开始。Flowise 中的 `BufferMemory` 和 `ConversationSummaryMemory` 节点可以在单次会话内提供帮助，但无法跨会话保留记忆，也不会从对话记录中提取或提炼信息。

大多数生产场景很快就会碰到这个限制：支持智能体每次都要重新询问用户的账号；编程助手每次重新加载都得重新学习项目约定；引导流程忘了用户上次进行到哪里。你要么自己搭建记忆层（Postgres、嵌入向量、检索逻辑和去重），要么就无法提供这项功能。

Hindsight 的 Flowise 节点提供了另一条路：接入一个工具，把它指向记忆库，就完成了。

## 工作原理 {#how-it-works}

该集成在 Flowise 的 **Tools** 类别下新增了三个节点：

| 节点 | 功能 |
| --- | --- |
| **Hindsight Retain** | 将自由文本内容存入记忆库。调用返回后，Hindsight 会异步提取结构化事实。 |
| **Hindsight Recall** | 根据自然语言查询搜索记忆库中的相关记忆，并返回排序后的结果。 |
| **Hindsight Reflect** | 通过 LLM 综合记忆库中的内容并生成答案（例如“我们对 X 了解些什么？”）。 |

每个节点初始化时都会返回一个来自 `@langchain/core/tools`、带有类型化 Zod 模式的 LangChain `DynamicStructuredTool`。这很重要：智能体可以按正确的参数结构调用工具，而 Flowise 可以将它接入任何接受 LangChain 工具的智能体接口，包括 Conversational Agent、Tool Agent、OpenAI Function Agent 等。

LLM 看到的工具名是 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。智能体会根据工具说明和用户请求决定何时调用它们。

## 三种工具详解 {#the-three-tools-in-detail}

### Hindsight Retain {#hindsight-retain}

将一段内容存入记忆库。调用返回后，Hindsight 的提取器会从中提取结构化事实，因此工具本身可以很快完成。

**工具输入模式**（由智能体填写）：

```ts
{
  bankId: string,            // 要写入的记忆库
  content: string,           // 要存储的自由文本
  tags?: string[],           // 可选标签，供召回时筛选
}
```

**节点配置**（在 Flowise 界面中设置）：

| 字段 | 说明 |
| --- | --- |
| Default Bank ID | 智能体未传入记忆库 ID 时，Retain 将写入此记忆库。记忆库会在首次使用时创建。 |

如果智能体和节点都没有提供 `bankId`，工具会返回明确的错误信息，而不会悄悄写入错误位置。

### Hindsight Recall {#hindsight-recall}

搜索记忆库中与查询相关的内容。

**工具输入模式：**

```ts
{
  bankId: string,
  query: string,                    // 自然语言查询
  budget?: "low" | "mid" | "high",  // 检索深度（默认：mid）
  maxTokens?: number,               // 限制召回内容的总量
  tags?: string[],                  // 按标签筛选
}
```

**节点配置：**

| 字段 | 说明 |
| --- | --- |
| Default Bank ID | 智能体未传入记忆库 ID 时，搜索此记忆库。 |
| Default Budget | 可选值为 `low`、`mid`、`high`，默认值为 `mid`。值越高，搜索的记忆越多，成本也越高。 |

结果是一组按相关性排序并序列化为 JSON 的记忆，智能体会读取它们，作为下一条回复的上下文。

### Hindsight Reflect {#hindsight-reflect}

让 Hindsight 使用 LLM 综合记忆库内容并生成答案，而不是返回原始记忆。

**工具输入模式：**

```ts
{
  bankId: string,
  query: string,
  budget?: "low" | "mid" | "high",  // 默认：mid
}
```

**节点配置：**

| 字段 | 说明 |
| --- | --- |
| Default Bank ID | 智能体未传入记忆库 ID 时，对此记忆库进行反思。 |
| Default Budget | 可选值为 `low`、`mid`、`high`，默认值为 `mid`。 |

当智能体需要综合答案，而不是原始事实时，Reflect 是合适的工具。例如：“这个用户喜欢什么？”“我们在这个项目中做过哪些架构决策？”记忆库负责检索和综合，智能体收到的是综合生成的段落，无需自行读取并整合原始记忆。

## 设置 {#setup}

你需要一个 Hindsight 账户和 API 密钥。最快的方式是使用 **Hindsight Cloud**。

1. 在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io) **注册**。免费套餐足以完整体验该集成。
2. 在控制面板中**创建 API 密钥**。密钥格式类似 `hsk_...`。
3. 在 **Flowise** 中打开 **Credentials** → **Add Credential** → **Hindsight API**：
   - **API URL**：默认值为 `https://api.hindsight.vectorize.io`。使用 Cloud 时保持默认值；自托管时改为你的实例地址（例如 `http://localhost:8888`）。
   - **API Key**：粘贴你的 `hsk_...` 密钥。如果连接的是无需身份认证的自托管实例，可留空。
4. 保存凭据。三个工具节点都会使用同名的 `hindsightApi` 凭据。

连接步骤到此完成。此后，你构建的每个聊天流程都可以复用这份凭据。

## 安装 {#installation}

下面说明如何将这些节点加入 Flowise 实例。Flowise 在自己的 monorepo（`FlowiseAI/Flowise` 仓库中的 `packages/components/`）内分发节点包，而不是通过 npm 分发。目前最直接的方式是将 Hindsight 源文件复制进去，然后在本地构建 Flowise：

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

# 复制三个 Hindsight 工具节点
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

# 复制共享凭据类
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

# 将 Hindsight 客户端添加到 components 包
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # 启动后可在 http://localhost:3000 打开
```

Flowise 启动后，三个节点会出现在 **Tools** 类别中，**Credentials** 下也会提供 **Hindsight API** 凭据类型。

## 示例聊天流程：对话式支持智能体 {#example-chatflow-a-conversational-support-agent}

下面是一个可运行全部三个节点的最小流程：

```
ChatOpenAI ─┐
            │
            ▼
  Conversational Agent ──► (输出到聊天)
    ├── tools: Hindsight Recall   (Default Bank ID: user-{{sessionId}})
    ├── tools: Hindsight Retain   (Default Bank ID: user-{{sessionId}})
    └── tools: Hindsight Reflect  (Default Bank ID: user-{{sessionId}})
```

1. 将 **ChatOpenAI**（或任意聊天模型）拖到画布上。
2. 放入 **Conversational Agent**，并连接聊天模型。
3. 放入三个 Hindsight 工具节点，将它们全部连接到智能体的 `tools` 输入。为每个节点选择 **Hindsight API** 凭据。
4. 将 **Default Bank ID** 设为按会话区分的值，例如 `user-{{sessionId}}`。智能体仍可在每次调用时传入不同的 `bankId`，而节点提供这个默认值作为后备。
5. 部署并发送消息。

通过这种设置，智能体可以在几次会话中逐渐学会：

- 回答前调用 **Recall**，以往对话为依据作答。
- 在有意义的交流后调用 **Retain**（例如做出决定、发现偏好或解决问题）。
- 当用户提出“我们聊过什么？”这类开放式问题时调用 **Reflect**。

无需专门编写提示词就能实现这种行为：工具说明明确指出了各工具适用的时机，底层智能体提示词会处理路由。如果需要更严格的控制，可以在 `Conversational Agent` 的系统消息中明确要求调用顺序（“回答前始终先检查 Recall”）。

## 权衡 {#tradeoffs}

**Retain 是异步的。** Retain 调用会在内容写入记忆库后返回，而不是等提取器完成后才返回。几秒钟后就可以召回这些事实，但紧接着 Retain 调用的 Recall 可能还看不到刚存入的内容。对于聊天流程，这通常没有问题，因为下一轮用户对话会在提取完成后发生。对于在同一次运行中先 Retain 再 Recall 的自动化脚本，请增加短暂延迟，或改用 Reflect（它不依赖提取是否完成）。

**每轮流程使用一个记忆库 ID 是合适的默认设置。** 单次智能体运行中的多个工具可以使用不同的记忆库，但大多数生产流程在每个用户（或项目、租户）始终使用同一个记忆库时效果更好。可以把 `Default Bank ID` 视为该对话的路由键。

**Cloud 与自托管。** 使用 Cloud 可以省去许多运维工作：提取在服务器端运行，无需把 LLM 密钥传入 Flowise 环境，记忆也跟随记忆库而非某台机器。自托管只要将凭据中的 API URL 指向你的实例，使用方式就相同，但你需要负责让 `hindsight-api` 持续运行。

## 回顾 {#recap}

| | Flowise 默认情况 | 使用 Hindsight 工具节点 |
| --- | --- | --- |
| 跨会话记忆 | 无 | 持久保存，按记忆库隔离 |
| 记忆设置 | 仅有缓冲区/摘要节点 | 一个凭据和三个工具节点 |
| 事实提取 | 无 | 每次 Retain 调用都会异步提取 |
| 跨记忆库综合 | 不支持 | `Reflect` 返回由 LLM 综合生成的答案 |
| 记忆库路由 | 不适用 | 每个节点可设默认值，每次调用可覆盖 |
| 跨工具共享 | 不适用 | Claude Code、Cline、MCP 和 API 均可读取同一记忆库 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Flowise + Hindsight](/sdks/integrations/flowise)
- **源代码：**[`vectorize-io/hindsight/hindsight-integrations/flowise`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/flowise)
- **Hindsight API 参考：**[API 快速入门](/developer/api/quickstart)
