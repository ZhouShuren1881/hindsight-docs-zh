---
sidebar_position: 23
title: "Flowise 中使用 Hindsight 实现持久记忆 | 集成"
description: "使用 Hindsight 为任意 Flowise 聊天流程或智能体添加持久的长期记忆。三个工具节点——Hindsight Retain、Hindsight Recall 和 Hindsight Reflect——可与其他 LangChain 工具一起接入任意流程。"
---

# Flowise {#flowise}

通过 [Hindsight](https://hindsight.vectorize.io)，为 [Flowise](https://flowiseai.com) 聊天流程和智能体提供持久记忆。三个工具节点——**Hindsight Retain**、**Hindsight Recall** 和 **Hindsight Reflect**——可与其他 LangChain 工具一起接入任意流程。

[查看更新日志 →](/changelog/integrations/flowise)

## 为什么这很重要 {#why-this-matters}

Flowise 是基于 LangChain 构建的可视化工具，面向开发者和非开发者。过去，Flowise 聊天流程在不同会话之间**不保留状态**。借助 Hindsight 工具节点，你可以：

- 用 Retain（存入）将每次已结束的对话、支持工单或表单提交存入记忆库
- 用 Recall（召回）在 LLM 步骤之前获取相关上下文，让模型看到此前的历史记录
- 用 Reflect（反思）在流程中提出综合性问题（“我们对这位客户了解多少？”），基于记忆推理

## 安装 {#installation}

Flowise 目前只在其主 monorepo 中分发节点，因此安装时需要检出 Flowise 代码库并将 Hindsight 节点复制进去。面向用户的正式分发方式将是向上游 `FlowiseAI/Flowise` 提交 PR。

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

# 复制三个工具节点
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

# 复制凭证类
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

# 添加客户端依赖
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # opens http://localhost:3000
```

## 设置 {#setup}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)——无需自行运行基础设施。你可以直接跳到下面创建凭证。
:::

1. 注册 [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐），或选择[自托管](/developer/installation)
2. 从 Hindsight 控制台获取 API 密钥
3. 在 Flowise 中创建 **Hindsight API** 类型的新凭证：
   - **API URL** — 默认为 `https://api.hindsight.vectorize.io`（Cloud）；自托管时请改为对应地址
   - **API Key** — 填入你的 `hsk_...` 密钥（对于未启用身份认证的自托管实例，此项可选）

## 工具 {#tools}

每个 Hindsight 工具节点都会返回一个 LangChain `DynamicStructuredTool`，因此可以接入任何支持工具的智能体。

### Hindsight Retain {#hindsight-retain}

将内容存入记忆库。调用返回后，Hindsight 会异步提取事实。

| 字段 | 说明 |
|---|---|
| 默认记忆库 ID | 当智能体未传入记忆库 ID 时，Retain 操作要存入内容的记忆库 |

工具输入模式（由智能体传入）：`bankId`、`content`，以及可选的 `tags`。

### Hindsight Recall {#hindsight-recall}

在记忆库中搜索与查询相关的记忆，并返回排序后的结果。

| 字段 | 说明 |
|---|---|
| 默认记忆库 ID | 当智能体未传入记忆库 ID 时，要搜索的记忆库 |
| 默认预算 | `low` / `mid` / `high` |

工具输入模式：`bankId`、`query`，以及可选的 `budget`、`maxTokens` 和 `tags`。

### Hindsight Reflect {#hindsight-reflect}

根据记忆库内容返回由 LLM 综合生成的答案。

| 字段 | 说明 |
|---|---|
| 默认记忆库 ID | 当智能体未传入记忆库 ID 时，要基于其内容进行反思的记忆库 |
| 默认预算 | `low` / `mid` / `high` |

工具输入模式：`bankId`、`query`，以及可选的 `budget`。

## 聊天流程示例 {#example-chatflow}

**对话式支持智能体**

1. **ChatOpenAI**（或任意聊天 LLM）
2. 使用 **Hindsight Retain**、**Hindsight Recall** 和 **Hindsight Reflect** 三个工具配置 **Conversational Agent**，并让它们共用同一个 `hindsightApi` 凭证
3. 为每个工具设置默认记忆库 ID，例如 `user-${sessionId}`
4. 让智能体学会在回答前调用 Recall，并在有意义的交流后调用 Retain。遇到“我们对这个用户了解多少？”这类问题时，使用 Reflect。

## 来源 {#source}

- GitHub：[`hindsight-integrations/flowise`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/flowise)

---
