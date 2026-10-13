---
title: "指南：使用 Hindsight 为 Flowise 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, flowise, agents, memory]
description: "三个工具节点为聊天流或智能体存储、召回和推理长期记忆。"
image: /img/guides/guide-flowise-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Flowise 添加记忆](/img/guides/guide-flowise-memory-with-hindsight.svg)

Hindsight Retain、Recall、Reflect 三个节点加入流程，返回 LangChain DynamicStructuredTool，兼容接受工具的智能体，跨会话长期保留。

Flowise 是 LangChain 可视化构建器，原生调用工具。节点共享凭据、回答前召回、有意义交互后存储，默认 ID 隔离用户或会话。

本指南介绍复制节点、凭据、接入和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 复制三个节点和凭据类到 Flowise，再 pnpm add 客户端、install、build、start。
> 2. 创建 Hindsight API URL 和密钥。
> 3. 对话智能体接三个工具、共享凭据。
> 4. 各节点 Default Bank ID 如 `user-${sessionId}`。
> 5. 验证后续。

## 前提条件 {#prerequisites}

开始前确认：

- 可构建运行的 Flowise 克隆。
- pnpm。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 仪表盘密钥。

## 步骤 1：复制节点 {#step-1-copy-the-nodes-into-a-flowise-checkout}

节点仅在主仓库发布，目前复制，用户分发将通过上游 PR。

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

# 复制三个工具节点 {#copy-the-three-tool-nodes}
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

# 复制凭据类 {#copy-the-credential-class}
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

# 添加客户端依赖 {#add-the-client-dep}
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # 打开 http://localhost:3000
```

启动后节点面板可见。

## 步骤 2：创建凭据 {#step-2-create-the-hindsight-credential}

新建 Hindsight API：

- URL 默认云端，自托管修改。
- 密钥，无认证自托管可选。

可[免费注册](https://ui.hindsight.vectorize.io)或[自托管](https://hindsight.vectorize.io/developer/installation)，三节点共凭据。

## 步骤 3：接入智能体 {#step-3-attach-the-three-tools-to-an-agent}

返回原生工具，可接任意接受工具的智能体。典型支持流程：

1. ChatOpenAI 或其他 LLM。
2. Conversational Agent 接三工具，共凭据。
3. 各节点设置 Default Bank ID，如 `user-${sessionId}`。
4. 回答前召回、之后存储，综合问题用反思。

## 各工具作用 {#what-each-tool-does}

调用时传字段：

- **记忆存储**：自由文本、返回后异步提取。默认 ID，传 bankId、content、可选 tags。
- **记忆召回**：查询相关记忆排序结果。默认 ID/预算 low/mid/high，传 bankId、query、可选 budget、maxTokens、tags。
- **反思**：综合回答，默认 ID/预算，传 bankId、query、可选 budget。

未传 ID 用默认。底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 三工具、默认 ID 流程。
2. 告知偏好决策事实。
3. 让其存储。
4. 同库新轮次。
5. 询问促召回。

例如：

- 首轮用户喜欢简洁 Rust 回答。
- 后续问代码格式。

召回偏好即有效，也可反思综合了解用户。

## 常见错误 {#common-mistakes}

### 凭据不共享 {#nodes-not-sharing-a-credential}

三节点必须同后端，否则写读可能不同。

### ID 不一致 {#bank-ids-that-dont-line-up}

同库才能延续。

### 存储前测试 {#testing-recall-before-retain-runs}

异步提取，立即可能未处理。

### 未接工具却期待记忆 {#expecting-memory-without-attaching-the-tools}

本身无状态，必须接入且实际调用。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管 URL，无认证密钥可选。

### 如何限定？ {#how-is-memory-scoped}

默认 ID 按用户会话。

### 召回反思区别？ {#whats-the-difference-between-recall-and-reflect}

召回排序供读取，反思单综合答案，适合了解客户。

### 为何复制而非安装包？ {#why-copy-the-nodes-instead-of-installing-a-package}

仅主仓库分发，当前复制，上游 PR 后用户可用。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Flowise 集成文档](/sdks/integrations/flowise)。
