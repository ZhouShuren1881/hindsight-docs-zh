---
title: "使用 Hindsight 为 Claude Agent SDK 添加持久记忆 | 集成"
description: "使用 Hindsight 为 Anthropic 的 Claude Agent SDK 添加持久化的长期记忆。通过 MCP 工具提供 Retain（存入）、Recall（召回）和 Reflect（反思），让智能体决定何时使用记忆；也可以接入钩子，在每轮开始前自动注入相关记忆。"
---

# Claude Agent SDK {#claude-agent-sdk}

通过 [Hindsight](https://vectorize.io/hindsight) 为 Anthropic 的 [Claude Agent SDK](https://pypi.org/project/claude-agent-sdk/) 提供持久记忆。将 Retain（存入）、Recall（召回）和 Reflect（反思）作为 MCP 工具暴露给智能体，由它决定何时使用记忆；也可以接入钩子，在每轮开始前自动注入相关记忆。

[查看更新日志 →](/changelog/integrations/claude-agent-sdk)

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```bash
pip install hindsight-claude-agent-sdk
```

### 工具（显式使用记忆） {#tools-explicit-memory}

为 Claude 智能体提供 Retain（存入）、Recall（召回）和 Reflect（反思）工具，让它自行决定何时使用记忆：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server

server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

async for msg in query(
    prompt="Remember that I prefer dark mode. Then check what you know about me.",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
    ),
):
    print(msg)
```

## 功能 {#features}

- **记忆工具** — 将 Retain、Recall 和 Reflect 作为 MCP 工具提供，供智能体自行调用
- **自动钩子** — 每轮开始前将相关记忆注入上下文，并在之后存入对话内容，无需显式调用工具
- **按智能体划分记忆库** — 使用 `bank_id` 按智能体或用户隔离记忆
- **云端或自托管** — 指向 Hindsight Cloud 或自行部署的 Hindsight

## 了解更多 {#learn-more}

- [Claude Agent SDK cookbook 配方](/cookbook/recipes/claude-agent-sdk)
- [GitHub 上的源码](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-agent-sdk)
