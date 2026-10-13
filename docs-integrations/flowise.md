---
sidebar_position: 23
title: "Flowise 持久记忆Hindsight |整合"
description: "使用Hindsight为任何Flowise聊天流程或智能体添加持久的长期记忆。三个工具节点——记忆存储、记忆感知、反思——与其他 LangChain 工具一起放入任何流程中。"
---

# Flowise {#flowise}

持久记忆[Flowise](https://flowiseai.com) 聊天流程和智能体，来自 [Hindsight](https://hindsight.vectorize.io)。三个工具节点 — **Hindsight 记忆存储**，**Hindsight 记忆召回**，**Hindsight 反思** — 与其他 LangChain 工具一起放入任何流程。

[查看更新日志 →](/changelog/integrations/flowise)

## 为什么这很重要 {#why-this-matters}

Flowise是浪链衍生的可视化构建器，适用于非开发者和开发者。直到现在，Flowise聊天流程已**各会话之间无状态**。与Hindsight工具节点您可以：

- **记忆存储** 每一次封闭式对话、支持票或表单提交到记忆库中
- **记忆召回** 之前的相关上下文LLM步骤让模型看到之前的历史
- **反思** 在流程中提出综合问题（“我们对该客户了解多少？”）

## 安装 {#installation}

Flowise仅在其主 monorepo 内分发节点，因此今天的安装意味着使用Flowise结帐  复制进来的Hindsight节点。面向用户的分布将是的上游PR `FlowiseAI/Flowise`。

```bash
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

#复制三个工具节点
cp -r /path/to/hindsight/hindsight-integrations/flowise/nodes/tools/Hindsight* \
  packages/components/nodes/tools/

#复制凭证类别
cp /path/to/hindsight/hindsight-integrations/flowise/credentials/HindsightApi.credential.ts \
  packages/components/credentials/

#添加客户部门
cd packages/components && pnpm add @vectorize-io/hindsight-client
cd ../.. && pnpm install && pnpm build
pnpm start  # opens http://localhost:3000
```

## 设置 {#setup}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 无需运行基础设施。直接跳到下面创建您的凭证。
:::

1. **注册** [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）或[自托管](/developer/installation)
2. **获取 API 密钥** 来自Hindsight仪表板
3. **在 Flowise 中**，创建类型为的新凭证 **Hindsight API**：
   - **API URL** — 默认为 `https://api.hindsight.vectorize.io`（云）；更改为自托管
   - **API 密钥** — 你的 `hsk_...` 密钥（对于自托管未经身份验证的实例可选）

## 工具 {#tools}

每个Hindsight工具节点返回一个LangChain `DynamicStructuredTool`，因此它可以插入任何接受工具的智能体中。

### Hindsight 记忆存储 {#hindsight-retain}

将内容存储在记忆库中。 Hindsight 在调用返回后异步提取事实。

|字段|说明|
|---|---|
|默认记忆库ID|记忆库到智能体未通过时的记忆存储|

工具输入模式（智能体通过这些）：`bankId`，`content`，可选`tags`。

### Hindsight 记忆召回 {#hindsight-recall}

在记忆库中搜索与查询相关的记忆。返回排名结果。

|字段|说明|
|---|---|
|默认记忆库ID|智能体未通过时搜索记忆库|
|默认预算|`low` / `mid` / `high`|

工具输入模式：`bankId`，`query`，可选`budget`，`maxTokens`，`tags`。

### Hindsight 反思 {#hindsight-reflect}

通过记忆库返回LLM合成的答案。

|字段|说明|
|---|---|
|默认记忆库ID|记忆库 智能体未通过考试时的反思|
|默认预算|`low` / `mid` / `high`|

工具输入模式：`bankId`，`query`，可选`budget`。

## 聊天流程示例 {#example-chatflow}

**对话式客服智能体**

1. **ChatOpenAI**（或任何聊天LLM)
2. **对话智能体** 附带三个工具：Hindsight记忆存储 +Hindsight 记忆召回 + Hindsight 反思，大家都一样`hindsightApi`证书
3. 将默认记忆库 ID 设置为类似 每个工具上都有 `user-${sessionId}`
4. 智能体学会在回答之前调用记忆召回，并在有意义的交流之后调用记忆存储。使用“推测”来表示“我们对这个用户了解多少？”提示。

## 来源 {#source}

- GitHub：[`hindsight-integrations/flowise`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/flowise)
