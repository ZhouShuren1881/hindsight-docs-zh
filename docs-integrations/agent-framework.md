---
sidebar_position: 8
title: "使用 Hindsight 为 Microsoft Agent Framework 提供持久记忆 | 集成指南"
description: "通过上下文提供程序，为 Microsoft Agent Framework 智能体添加持久记忆。每次运行前召回相关上下文，运行后存储对话，无需 MCP 或模型主动调用工具。"
---

# Microsoft Agent Framework

[查看更新日志 →](/changelog/integrations/agent-framework)

使用 [Hindsight](https://vectorize.io/hindsight) 为 [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)（Semantic Kernel 的后继项目）提供持久记忆。集成以**上下文提供程序**形式接入，每次智能体运行前自动召回相关记忆并注入上下文，运行后存储对话。无需 MCP，也无需模型记得调用工具。

## 快速开始 {#quick-start}

:::tip 推荐使用 Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)以获取 Hindsight Cloud API 密钥，无需自行托管。
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
    instructions="你是有帮助的助手。",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("记住，我偏好素食。", session=session)
await agent.run("推荐一个食谱。", session=session)  # 召回饮食偏好
```

## 工作原理 {#how-it-works}

| 钩子 | 行为 |
| --- | --- |
| `before_run` | 召回与用户消息相关的记忆，以 `## Memories` 区块注入智能体指令。 |
| `after_run` | 存储用户输入和智能体回复，让后续运行利用这些信息。 |

记忆保存在 Hindsight **记忆库**中，可按用户、智能体或会话划分，通过 `bank_id` 选择。召回和存储均采用尽力而为的方式，记忆服务故障不会阻塞智能体。

## 配置 {#configuration}

`HindsightProvider(bank_id, ...)` 支持 `hindsight_api_url`、`api_key`、`budget`（low/mid/high）、`max_tokens`、`tags`、`recall_tags`、`mission`、`auto_recall`、`auto_retain` 等选项。可通过 `configure(...)` 设置进程级默认值。

## 自行托管 {#self-hosting}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

完整详情见[集成源码](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/agent-framework)。
