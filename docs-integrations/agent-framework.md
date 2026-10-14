---
sidebar_position: 8
title: "使用 Hindsight 为 Microsoft Agent Framework 提供持久记忆 | 集成指南"
description: "通过上下文提供方，为 Microsoft Agent Framework 智能体添加持久记忆。每次运行前都会召回相关上下文，运行后会存入对话，无需 MCP，也无需调用工具。"
---

# Microsoft Agent Framework

[查看更新日志 →](/changelog/integrations/agent-framework)

使用 [Hindsight](https://vectorize.io/hindsight) 为 [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)（Semantic Kernel 的后继项目）提供持久记忆。该集成以**上下文提供方**的形式接入，因此每次智能体运行时，都会自动将相关记忆召回并注入智能体上下文，随后存入这轮对话。无需 MCP，也不需要模型记住要调用哪些工具。

## 快速开始 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)，获取 Hindsight Cloud API 密钥，无需自行托管。
:::

```bash
pip install hindsight-agent-framework
export HINDSIGHT_API_KEY=your-hindsight-key
```

```python
from agent_framework.openai import OpenAIChatClient
from hindsight_agent_framework import HindsightProvider

agent = OpenAIChatClient().as_agent(
    name="assistant",
    instructions="You are a helpful assistant.",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("Remember that I prefer vegetarian food.", session=session)
await agent.run("Suggest a recipe.", session=session)  # 召回这项偏好
```

## 工作原理 {#how-it-works}

| 钩子 | 行为 |
| --- | --- |
| `before_run` | 召回与用户消息相关的记忆，并将其作为 `## Memories` 区块注入智能体指令。 |
| `after_run` | 存入用户输入和智能体回复，供后续运行参考。 |

记忆保存在 Hindsight **记忆库**中；你可以通过 `bank_id` 选择按用户、智能体或会话各自使用一个记忆库。Recall（召回）和 Retain（存入）都尽力而为；记忆处理出现问题不会阻塞智能体运行。

## 配置 {#configuration}

`HindsightProvider(bank_id, ...)` 接受 `hindsight_api_url`、`api_key`、`budget`（low/mid/high）、`max_tokens`、`tags`、`recall_tags`、`mission`、`auto_recall`、`auto_retain` 等参数。可以通过 `configure(...)` 设置进程级默认值。

## 自行托管 {#self-hosting}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

完整信息请参阅[集成源码](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/agent-framework)。
