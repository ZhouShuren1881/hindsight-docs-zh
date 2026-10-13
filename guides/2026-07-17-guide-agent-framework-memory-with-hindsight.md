---
title: "指南：使用 Hindsight 为 Microsoft Agent Framework 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agent-framework, agents, memory]
description: "使用 hindsight-agent-framework 上下文提供商，在每次运行前召回、运行后存储对话。"
image: /img/guides/guide-agent-framework-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Microsoft Agent Framework 添加记忆](/img/guides/guide-agent-framework-memory-with-hindsight.svg)

如需 **Microsoft Agent Framework 与 Hindsight 记忆**，将 `HindsightProvider` 放入 `context_providers`，每次运行前召回至上下文、之后存储，跨运行和进程保留。

集成为上下文提供商，无需 MCP 或模型记住调用工具。`before_run`、`after_run` 自动执行，均尽力而为，记忆故障不阻塞。

本指南介绍安装、后端连接、范围和验证。可参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-agent-framework`.
> 2. Cloud 设置 `HINDSIGHT_API_KEY`，自托管传 `hindsight_api_url=`。
> 3. 将 `HindsightProvider(bank_id="user-123")` 加入 `context_providers`。
> 4. 正常运行，每次自动召回存储。
> 5. 验证后续记住此前内容。

## 前提条件 {#prerequisites}

开始前确认：

- 可以添加提供商的 Agent Framework 智能体。
- 可达 [Hindsight Cloud](https://hindsight.vectorize.io)或自托管后端。
- API 密钥或自托管 URL。

## 步骤 1：安装提供商 {#step-1-install-the-provider}

安装集成包。

```bash
pip install hindsight-agent-framework
```

提供 `HindsightProvider`，不改变构建或运行方式，仅包装每次运行。

## 步骤 2：指向 Hindsight {#step-2-point-the-provider-at-hindsight}

Cloud 一次设置密钥：

```bash
export HINDSIGHT_API_KEY=your-hindsight-key
```

再接入：

```python
from agent_framework.openai import OpenAIChatClient
from hindsight_agent_framework import HindsightProvider

agent = OpenAIChatClient().as_agent(
    name="assistant",
    instructions="你是一位乐于助人的助手。",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("记住，我喜欢素食。", session=session)
await agent.run("推荐一个食谱。", session=session)  # 召回偏好
```

自托管时，本地运行并指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

## 提供商如何使用记忆 {#how-the-provider-uses-memory}

在生命周期两处工作：

- **召回（`before_run`）**：查询用户消息相关记忆，以 `## Memories` 块注入指令供当次模型使用。
- **存储（`after_run`）**：运行结束保存输入和回复，供以后利用。

无 MCP 或显式工具，均自动且尽力而为，不阻塞智能体。

底层行为见[记忆召回 API](/developer/api/recall)和[记忆存储 API](/developer/api/retain)。

## 记忆库 {#memory-banks}

记忆位于 Hindsight **记忆库**，`bank_id` 决定用户、智能体或会话范围。`user-123` 为用户提供独立存储。

还接受 `client`、`hindsight_api_url`、`api_key`、`budget`（low/mid/high）、`max_tokens`、`context`、`tags`、`recall_tags`、`recall_tags_match`、`mission`（以事实提取角色创建库）、`auto_recall`、`auto_retain`、`source_id`。可通过 `configure(...)` 设进程级默认值。

完整选项见[集成源码](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/agent-framework)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 添加 `HindsightProvider(bank_id="user-123")`。
2. 运行并记录偏好或事实。
3. 同一 ID 再运行。
4. 询问此前事实。

例如：

- 首次：“记住，我喜欢素食。”
- 第二次：“推荐一个食谱。”

反映此前偏好就有效，存储持久，因此跨进程也成立。

## 常见错误 {#common-mistakes}

### 运行间 ID 不同 {#using-a-different-bank_id-between-runs}

范围由 ID 决定，不同库无法召回。

### 期待模型调用工具 {#expecting-the-model-to-call-a-tool}

没有记忆工具，钩子自动执行，只需添加提供商。

### 忘记凭据 {#forgetting-to-set-credentials}

Cloud 设置 `HINDSIGHT_API_KEY`，自托管传 URL，必要时 API key。

### 未将提供商加到智能体 {#not-attaching-the-provider-to-the-agent}

必须放入 `context_providers`，仅构造不接入不会执行。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管运行 `hindsight-api` 并传 URL。

### 改变构建方式吗？ {#does-this-change-how-i-build-agents}

不会，只添加一个提供商，正常运行，无 MCP 或工具。

### 如何限定范围？ {#how-is-memory-scoped}

传入的 `bank_id` 决定用户、智能体或会话。

### 可关闭召回或存储吗？ {#can-i-turn-recall-or-retain-off}

可以，`auto_recall` 和 `auto_retain` 独立控制。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [Microsoft Agent Framework 集成文档](/sdks/integrations/agent-framework)。
