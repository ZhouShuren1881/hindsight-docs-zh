---
title: "指南：使用 Hindsight 为 Flowise 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, flowise, agents, memory]
description: "使用三个工具节点（Retain、Recall 和 Reflect）为 Flowise 添加记忆，让任意聊天流或智能体都能存储、召回并推理长期记忆。"
image: /img/guides/guide-flowise-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Flowise 添加记忆](/img/guides/guide-flowise-memory-with-hindsight.svg)

如果你想在 **Flowise 中使用 Hindsight 记忆**，只需配置三个工具节点：**Hindsight Retain**、**Hindsight Recall** 和 **Hindsight Reflect**。这些节点可以像其他 LangChain 工具一样加入任意聊天流或智能体流程。每个节点都会返回一个 LangChain `DynamicStructuredTool`，因此可以接入任何接受工具的智能体；三个节点配合使用后，流程便能跨会话保留长期记忆，而不再局限于无状态运行。

Flowise 很适合这种集成，因为它是基于 LangChain 构建的可视化工具，而且其中的智能体已经能够调用工具。你只需接入记忆节点，让它们共用一个 Hindsight 凭据，并让智能体学会在回答前召回上下文、在有意义的交流后存入信息。记忆按记忆库隔离，因此可以通过为每个节点设置 Default Bank ID，将不同用户或会话的数据分开。

本指南将介绍如何把这些节点复制到 Flowise 检出目录、创建 Hindsight 凭据、将三个工具接入对话智能体，以及如何快速验证记忆确实在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 将 Hindsight Retain、Recall 和 Reflect 节点及凭据类复制到 Flowise 检出目录，然后运行 `pnpm add @vectorize-io/hindsight-client`、`pnpm install`、`pnpm build` 和 `pnpm start`。
> 2. 创建 **Hindsight API** 凭据，并填写 API URL 和 `hsk_...` 密钥。
> 3. 将三个工具节点接入 Conversational Agent，并让它们共用该凭据。
> 4. 为每个节点设置 Default Bank ID，例如 `user-${sessionId}`，以便按用户隔离记忆。
> 5. 验证后续对话能否召回较早存入的信息。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 一个可以在本地构建和运行的 Flowise 检出目录（通过 `git clone` 获取 `FlowiseAI/Flowise`）
- 可用于构建和运行 Flowise 的 `pnpm`
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 从 Hindsight 控制台获取的 Hindsight API 密钥（`hsk_...`）

## 步骤 1：将节点复制到 Flowise 检出目录 {#step-1-copy-the-nodes-into-a-flowise-checkout}

Flowise 目前只在主单体仓库中分发节点，因此安装时需要使用一个已复制 Hindsight 节点的 Flowise 检出目录。面向用户的分发方式将是提交到 `FlowiseAI/Flowise` 上游仓库的 PR。

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

# 复制三个工具节点
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

# 复制凭据类
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

# 添加客户端依赖
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # 打开 http://localhost:3000
```

Flowise 启动后，三个 Hindsight 工具节点会与其他工具一起出现在节点面板中。

## 步骤 2：创建 Hindsight 凭据 {#step-2-create-the-hindsight-credential}

在 Flowise 中创建一种新的 **Hindsight API** 凭据：

- **API URL** — 默认为 `https://api.hindsight.vectorize.io`（Cloud）；如果使用自托管服务器，请改为对应地址。
- **API Key** — 填写你的 `hsk_...` 密钥（对于未启用身份验证的自托管实例，此项可选）。

如果你还没有密钥，可以在 [Hindsight Cloud 免费注册](https://ui.hindsight.vectorize.io)，然后从控制台获取 API 密钥；也可以[自托管](https://hindsight.vectorize.io/developer/installation)服务器。三个工具节点可以共用同一个凭据。

## 步骤 3：将三个工具接入智能体 {#step-3-attach-the-three-tools-to-an-agent}

每个 Hindsight 工具节点都会返回一个 LangChain `DynamicStructuredTool`，因此可以接入任何接受工具的 Flowise 智能体。下面是一种常见的对话式支持智能体配置：

1. **ChatOpenAI**（或任意聊天 LLM）
2. 一个接入了三个工具的 **Conversational Agent**：Hindsight Retain、Hindsight Recall 和 Hindsight Reflect，且三个工具共用同一个 Hindsight API 凭据
3. 为每个工具设置 **Default Bank ID**，例如 `user-${sessionId}`
4. 让智能体学会在回答前调用 Recall，并在有意义的交流后调用 Retain。遇到“我们对这位用户了解什么？”这类问题时，可以使用 Reflect。

## 各工具的作用 {#what-each-tool-does}

这三个节点分别对应 Hindsight 的核心记忆操作；调用时由智能体传入相应字段：

- **Hindsight Retain** 会将自由文本内容存入记忆库；调用返回后，Hindsight 会异步提取事实。节点带有 **Default Bank ID** 字段，智能体传入 `bankId`、`content` 和可选的 `tags`。
- **Hindsight Recall** 会在记忆库中搜索与查询相关的记忆，并返回排序后的结果。节点带有 **Default Bank ID** 和 **Default Budget**（`low` / `mid` / `high`）字段，智能体传入 `bankId`、`query`，以及可选的 `budget`、`maxTokens` 和 `tags`。
- **Hindsight Reflect** 会基于记忆库返回由 LLM 综合生成的答案。节点带有 **Default Bank ID** 和 **Default Budget** 字段，智能体传入 `bankId`、`query`，以及可选的 `budget`。

如果智能体没有传入自己的 `bankId`，节点就会使用各自的 Default Bank ID。更底层的行为说明请参阅 [Hindsight Recall API](/developer/api/recall) 和 [Hindsight Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 运行一个接入了三个 Hindsight 工具并设置了 Default Bank ID 的聊天流。
2. 告诉智能体一件它应该记住的事（例如偏好、决定或事实）。
3. 让智能体对这段交流调用 Retain。
4. 在同一个记忆库中开启新一轮对话或新会话。
5. 询问先前提到的细节，让智能体调用 Recall。

例如：

- 第一轮对话中，用户告诉智能体自己偏好简洁的 Rust 答案。
- 后续一轮询问智能体应如何为这位用户排版代码。

如果智能体通过 Recall 提取出了先前的偏好，说明配置正常。你也可以用 Reflect 提出“我们对这位用户了解什么？”这类需要综合信息的问题。

## 常见错误 {#common-mistakes}

### 节点没有共用凭据 {#nodes-not-sharing-a-credential}

三个工具节点都应指向同一个 Hindsight API 凭据。如果其中一个节点使用了不同的凭据或 URL，它可能会向另一个后端写入或读取数据。

### 记忆库 ID 不一致 {#bank-ids-that-dont-line-up}

Retain 和 Recall 必须指向同一个记忆库，记忆才能延续。如果 Retain 写入一个 Default Bank ID，而 Recall 从另一个 ID 读取，先前的上下文就不会出现。

### Retain 尚未完成就测试 Recall {#testing-recall-before-retain-runs}

Retain 返回后，Hindsight 才会异步提取事实。如果你马上执行 Recall，最新内容可能还没有处理完成。

### 没有接入工具却期待记忆生效 {#expecting-memory-without-attaching-the-tools}

Flowise 聊天流本身不会跨会话保留状态。只有接入 Hindsight 工具节点，并且智能体实际调用了这些节点，记忆才会生效。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要，自托管的 Hindsight 服务器也可以使用；只需将凭据的 API URL 设置为自托管服务器的地址。对于未启用身份验证的自托管实例，API Key 是可选的。

### 记忆如何隔离？ {#how-is-memory-scoped}

记忆按记忆库隔离。为每个节点设置 Default Bank ID，例如 `user-${sessionId}`，即可按用户或会话隔离记忆。

### Recall 和 Reflect 有什么区别？ {#whats-the-difference-between-recall-and-reflect}

Recall 会搜索记忆库并返回排序后的结果，供智能体读取。Reflect 会基于记忆库返回一条由 LLM 综合生成的答案，更适合回答“我们对这位客户了解什么？”这类问题。

### 为什么要复制节点，而不是安装软件包？ {#why-copy-the-nodes-instead-of-installing-a-package}

Flowise 目前只在主单体仓库中分发节点，因此现在需要将节点复制到 Flowise 检出目录。面向用户的分发方式将是提交到 `FlowiseAI/Flowise` 上游仓库的 PR。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 [Hindsight Recall API](/developer/api/recall)。
- 查看 [Hindsight Retain API](/developer/api/retain)。
- 阅读 [Flowise 集成文档](/sdks/integrations/flowise)。
