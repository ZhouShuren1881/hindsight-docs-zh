---
title: "使用 Hindsight 为 Claude Agent SDK 添加持久记忆 | 集成"
description: "使用 Hindsight 为 Anthropic 的 Claude Agent SDK 添加持久长期记忆。可直接接入的 MCP 记忆工具让智能体存储、召回记忆并进行反思，钩子则在每轮自动注入相关记忆。"
---

# Claude Agent SDK

通过 [Hindsight](https://vectorize.io/hindsight) 为 Anthropic 的 [Claude Agent SDK](https://pypi.org/project/claude-agent-sdk/) 提供持久长期记忆。将记忆存储、记忆召回和反思暴露为 MCP 工具，让智能体自行决定何时使用记忆，或接入钩子，在每轮之前自动注入相关记忆。

[查看更新日志 →](/changelog/integrations/claude-agent-sdk)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自托管。
:::

```bash
pip install hindsight-claude-agent-sdk
```

### 工具（显式记忆） {#tools-explicit-memory}

为 Claude 智能体提供记忆存储、记忆召回和反思工具，让它决定何时使用记忆：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server

server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

async for msg in query(
    prompt="记住我偏好深色模式。然后查看你对我有哪些了解。",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
    ),
):
    print(msg)
```

## 功能 {#features}

- **记忆工具** — 将记忆存储、记忆召回和反思暴露为智能体可自主调用的 MCP 工具
- **自动钩子** — 每轮之前向上下文注入相关记忆，之后存储对话内容，无需显式调用工具
- **按智能体划分记忆库** — 使用 `bank_id` 为智能体或用户隔离记忆
- **云端或自托管** — 连接 Hindsight Cloud 或自己的 Hindsight 部署

## 了解更多 {#learn-more}

- [Claude Agent SDK 实践示例](/cookbook/recipes/claude-agent-sdk)
- [GitHub 源码](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/claude-agent-sdk)
