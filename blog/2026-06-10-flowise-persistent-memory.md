---
title: "Flowise 持久记忆：任何聊天流程的插入式工具节点"
authors: [benfrank241]
slug: "2026/06/10/flowise-persistent-memory"
date: 2026-06-10T12:00
tags: [flowise, memory, persistent-memory, hindsight, agents, langchain, tutorial]
description: "使用Hindsight为任何Flowise聊天流程或智能体添加持久的长期记忆。三个工具节点（记忆存储、记忆感知、反思）直接落入会话智能体并共享一个 Hindsight API 凭证。"
image: /img/blog/flowise-persistent-memory.webp
hide_table_of_contents: true
---

![Flowise 持久记忆Hindsight](/img/blog/flowise-persistent-memory.webp)

[Flowise](https://flowiseai.com)是LangChain的可视化聊天流程构建器。您可以将聊天模型、工具和智能体拖到画布上，将它们连接起来，然后发布一个工作助手，而无需编写编排代码。默认情况下，您无法提供能够记住从一个会话到下一个会话的任何内容的智能体； Flowise 聊天流在运行过程中是无状态的。

这篇文章是Flowise的新Hindsight集成的演练。它添加了三个工具节点（记忆存储、记忆感知、反思），任何聊天流都可以将其附加到智能体，共享一个凭证并使用与任何其他Hindsight集成中使用的相同记忆库。

## 概览 {#tldr}

<!-- truncate -->

- **工具**下的Flowise中出现三个新工具节点：**Hindsight 记忆存储**、**Hindsight 记忆召回**、**Hindsight反思**。
- 所有三个都返回一个 LangChain `DynamicStructuredTool`，因此它们可以插入任何 Flowise 对话智能体、工具智能体或接受工具的自定义流程。
- 一个共享的**HindsightAPI**凭证覆盖所有三个节点；配置一次，随处重复使用。
- **Hindsight Cloud是推荐路径。** 没有基础设施可运行；凭证的默认 URL 指向那里。
- 记忆库是一个常规的Hindsight记忆库：与您从Claude Code、Cline、Codex或直接API调用写入的内容相同。 记忆跨越工具。

## 为什么Flowise需要持久记忆 {#why-flowise-needs-persistent-memory}

Flowise 为非开发人员（以及匆忙的开发人员）提供了一条无需编写编排即可运行的智能体的真正路径。拖动`ChatOpenAI`，放入`Conversational Agent`，附加`Calculator`工具，点击部署。有用。

它不记住用户。智能体的工作记忆是当前的对话。关闭聊天窗口，下一次会话从零开始。 Flowise 中的 `BufferMemory` 和 `ConversationSummaryMemory` 节点在会话中提供帮助，但它们不会在它们之间生存，并且不会从转录本中提取或提取任何内容。

对于大多数生产用例，这是您首先遇到的限制。每次访问时都会重新询问帐号的支持智能体。一个编码助手，每次重新加载时都会重新学习项目的约定。忘记用户离开位置的引导流程。您要么自己构建记忆层（Postgres、嵌入、检索逻辑、重复数据删除），要么不提供该功能。

Hindsight的Flowise节点为您提供了第二条路径：放入工具，将其指向记忆库，完成。

## 它是如何工作的 {#how-it-works}

集成在Flowise的**工具**类别下添加了三个节点：

|节点|它的作用|
| --- | --- |
|**Hindsight 记忆存储**|将自由文本内容存储在记忆库中。 Hindsight 在调用返回后异步提取结构化事实。|
|**Hindsight 记忆召回**|在记忆库中搜索与自然语言查询相关的记忆。返回排名结果。|
|**Hindsight反思**|通过记忆库获得LLM综合答案（“我们对 X 了解什么？”）。|

​​每个节点在初始化时都会返回一个具有类型化 Zod 模式的 LangChain `DynamicStructuredTool`（来自 `@langchain/core/tools`）。这很重要：这意味着智能体可以调用具有正确形状的工具，并且Flowise可以将其连接到任何接受LangChain工具的智能体套接字：会话智能体，工具智能体，OpenAI功能智能体，所有这些。

LLM看到的工具名称是`hindsight_retain`、`hindsight_recall`和`hindsight_reflect`。智能体根据工具的描述和用户的请求决定何时调用它们。

## 三种工具详细介绍 {#the-three-tools-in-detail}

### Hindsight 记忆存储 {#hindsight-retain}

将一段内容存储到记忆库中。 Hindsight 的提取器在调用返回后从中提取结构化事实，因此该工具本身可以快速完成。

**工具输入模式**（智能体填写这些）：

```ts
{
  bankId: string,            //写入哪个记忆库
  content: string,           //要存储的自由文本
  tags?: string[],           //用于过滤记忆召回的可选标签
}
```

**节点配置**（在Flowise UI 中设置）：

|领域|说明|
| --- | --- |
|默认记忆库ID|当智能体未通过时，记忆库将进入记忆存储。 记忆库是在第一次使用时创建的。|

如果智能体和节点都没有提供`bankId`，该工具将返回一个明确的错误字符串，而不是默默地写入错误的位置。

### Hindsight 记忆召回 {#hindsight-recall}

在记忆库中搜索与查询相关的内容。

**工具输入模式：**

```ts
{
  bankId: string,
  query: string,                    //自然语言
  budget?: "low" | "mid" | "high",  //搜索深度（默认：中）
  maxTokens?: number,               //总记忆容量上限
  tags?: string[],                  //按标签过滤
}
```

**节点配置：**

|领域|说明|
| --- | --- |
|默认记忆库ID|智能体未通过时进行搜索。|
|默认预算|`low` / `mid` / `high`。默认`mid`。较高的值以较高的成本搜索更多的记忆。|

结果是一组序列化为JSON的排序记忆，智能体将其读回作为其下一个响应的上下文。

### Hindsight反思 {#hindsight-reflect}

要求Hindsight使用LLM从记忆库中合成答案，而不是返回原始记忆。

**工具输入模式：**

```ts
{
  bankId: string,
  query: string,
  budget?: "low" | "mid" | "high",  // default: mid
}
```

**节点配置：**

|领域|说明|
| --- | --- |
|默认记忆库ID|智能体未通过时的反思。|
|默认预算|`low` / `mid` / `high`。默认`mid`。|

反思是正确的工具。 “这个用户喜欢什么？” “我们在这个项目上做出了哪些架构决策？”记忆库负责跑腿工作；智能体获得一个合成的段落，而不必本身读取和组合原始记忆。

## 设置 {#setup}

您需要一个Hindsight帐户和API密钥。最快的路径是**Hindsight Cloud**。

1. **注册** [hindsight.vectorize.io](https://ui.hindsight.vectorize.io)。免费套餐足以尝试端到端集成。
2. **创建API密钥
仪表板上的**。看起来像`hsk_...`。
3. **在Flowise**，打开**凭证** → **添加凭证** → **HindsightAPI**：
   - **API 网址**：默认为`https://api.hindsight.vectorize.io`。保留原样以供云使用；更改为自托管（例如`http://localhost:8888`）。
   - **API 钥匙**：粘贴您的`hsk_...`密钥。如果您要访问未经身份验证的自托管实例，请保留空白。
4. 保存凭证。所有三个工具节点都从相同的 `hindsightApi` 名称中选取它。

这就是整个连接步骤。从这里开始，凭证可以在您构建的每个聊天流中重复使用。

## 安装 {#installation}

关于节点如何进入Flowise实例的注释。 Flowise 从其自己的 monorepo 内部（`packages/components/` 下的`FlowiseAI/Flowise`）分发节点包，而不是从 npm。今天最短的路径是使用复制到的 Hindsight 源文件运行本地 Flowise 构建：

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

#复制三个Hindsight工具节点
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

#复制共享凭证类
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

#将Hindsight客户端添加到组件包中
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # opens http://localhost:3000
```

一旦Flowise启动，三个节点将显示在**工具**类别中，并且**HindsightAPI**凭证类型在**凭证**下可用。

## 示例聊天流程：对话支持智能体 {#example-chatflow-a-conversational-support-agent}

执行所有三个节点的最小流程：

```
ChatOpenAI ─┐
            │
            ▼
  Conversational Agent ──► (output to chat)
    ├── tools: Hindsight Recall   (Default Bank ID: user-{{sessionId}})
    ├── tools: Hindsight Retain   (Default Bank ID: user-{{sessionId}})
    └── tools: Hindsight Reflect  (Default Bank ID: user-{{sessionId}})
```

1. 将**ChatOpenAI**（或任何聊天模型）拖放到画布上。
2. 放下**会话智能体**并连接聊天模型。
3. 删除三个Hindsight工具节点。将所有三个连接到智能体的 `tools` 输入。在每一个上选择 **HindsightAPI** 凭证。
4. 将 **默认记忆库ID** 设置为会话范围内的内容，例如`user-{{sessionId}}`。智能体仍然可以在每次调用时传递不同的`bankId`，但节点提供了这种后备。
5. 部署并发送消息。

通过这种设置，智能体可以在几个会话的过程中学习：

- 在接听之前致电 **记忆召回**，以便在过去的对话中做出回应
- 在有意义的交流后致电**记忆存储**（做出决定、透露偏好、解决问题）
当用户提出诸如“我们讨论了什么？”之类的开放式问题时，
- 致电**反思**

不需要立即进行工程设计即可获得此行为；工具描述明确说明了每个工具何时应启动，并且底层智能体提示处理路由。如果您想要更严格的控制，您可以设置`Conversational Agent`的系统消息来明确地推动顺序（“在回答之前始终检查记忆召回”）。

## 权衡 {#tradeoffs}

**记忆存储是异步的。** 记忆存储调用会在内容到达记忆库时返回，而不是在提取器完成时返回。事实在几秒钟内就可以回忆起来，但是在记忆存储之后立即触发的记忆召回可能还看不到您刚刚存储的内容。对于聊天风格的流程来说这很好；下一次用户轮流发生在提取完成后。对于在同一运行中先记忆存储再记忆召回的自动化脚本，请添加短暂的延迟或使用 挫（这不依赖于提取是否完成）。

**每个流程转弯一个记忆库 ID 是正确的默认值。** 多个工具可以在单个智能体运行中使用不同的记忆库，但大多数生产流程在每个用户（或每个项目或每个租户）使用一个记忆库时效果会更好。将 `Default Bank ID` 视为对话的路由键。

**云与自托管。** 云删除了许多移动部件：提取在服务器端运行，您不必将LLM密钥插入到Flowise环境中，并且记忆遵循记忆库而不是机器。一旦您将凭证的 API URL 指向您的实例，自托管就会以相同的方式工作，但您将成为保持 `hindsight-api` 运行的人。

## 回顾 {#recap}

||Flowise 默认|带有 Hindsight 工具节点|
| --- | --- | --- |
|跨会话记忆|无|持久，根据记忆库|
|记忆设置|仅缓冲区/汇总节点|1个凭证+3个工具节点|
|事实提取|无|每个记忆存储都异步|
|跨记忆库合成|不可用|`Reflect` 返回 LLM 合成答案|
|记忆库路由|不适用|每个节点默认，每个调用可覆盖|
|跨工具共享|不适用|可从 Claude Code、Cline、MCP、API 读取相同的记忆库|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Flowise + Hindsight](/sdks/integrations/flowise)
- **来源：**[`vectorize-io/hindsight/hindsight-integrations/flowise`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/flowise)
- **HindsightAPI参考：**[API 快速入门](/developer/api/quickstart)
