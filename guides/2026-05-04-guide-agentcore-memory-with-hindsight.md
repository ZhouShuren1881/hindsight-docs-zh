---
title: "指南：使用 Hindsight 为 AgentCore Runtime 添加记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, agentcore, bedrock, memory]
description: "通过运行时适配器、稳定的用户记忆库 ID，以及跨会话更替的召回和存入钩子，为 AgentCore Runtime 添加 Hindsight 记忆。"
image: /img/guides/guide-agentcore-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AgentCore Runtime 添加记忆](/img/guides/guide-agentcore-memory-with-hindsight.webp)

如果你想在 AgentCore Runtime 中使用 **Hindsight 记忆**，最简洁的模式是用 `HindsightRuntimeAdapter` 包装 Bedrock AgentCore 处理器，并根据稳定的用户身份关联记忆，而不是使用临时的运行时会话 ID。这样一来，即使 Runtime 会话不断更替，记忆仍能持久保留，也就补上了团队从演示转向真实用户流量时遇到的主要缺口。

AgentCore Runtime 会话本来就很短暂。没有外部记忆层时，运行环境一旦更替，智能体就可能丢失上下文。

操作时可将[AgentCore Runtime 集成文档](/sdks/integrations/agentcore)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall（召回）API](/developer/api/recall)和 [Hindsight 的 Retain（存入）API](/developer/api/retain)放在手边，方便查阅底层参考资料。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 AgentCore Runtime 集成或插件。
> 2. 将其连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 AgentCore Runtime。
> 4. 存入一项偏好或项目信息，然后启动一次全新的运行。
> 5. 确认召回功能会自动恢复先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

运行时适配器为每轮交互提供清晰的召回、执行和存入流程。`before_turn()` 获取上下文，`run_turn()` 包装整次交互，`after_turn()` 存入结果。关键设计规则很简单：记忆库 ID 必须对应稳定的用户身份，而不是 `runtimeSessionId`。

## 前提条件 {#prerequisites}

- 已能接收可信用户标识符的 AgentCore Runtime 处理器
- 已安装 Python 和 `hindsight-agentcore`
- 稳定的记忆库命名模式，通常由租户、用户和智能体名称组成

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-agentcore
```

## 步骤 2：连接 AgentCore Runtime 与 Hindsight {#step-2-connect-agentcore-runtime-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)——提供免费档位，无需自行托管。

```python
import os
from hindsight_agentcore import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"],
)
```

如果你更愿意在 AWS 上自行托管（使用 ECS/EKS 和 RDS PostgreSQL + pgvector），请将 `hindsight_api_url` 设为 VPC 内的 Hindsight 端点。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext

adapter = HindsightRuntimeAdapter(agent_name="support-agent")

async def handler(event: dict) -> dict:
    context = TurnContext(
        runtime_session_id=event["sessionId"],
        user_id=event["userId"],
        agent_name="support-agent",
        tenant_id=event.get("tenantId"),
        request_id=event.get("requestId"),
    )

    result = await adapter.run_turn(
        context=context,
        payload={"prompt": event["prompt"]},
        agent_callable=run_my_agent,
    )
    return result
```

默认记忆库格式为 `tenant:{tenant_id}:user:{user_id}:agent:{agent_name}`。这种格式正适合在 Runtime 会话不断更替时持久保留记忆。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

不要根据 `runtimeSessionId` 关联记忆。该 ID 是临时的，会立即导致记忆碎片化。应使用能跨会话保持稳定的身份，例如租户、用户和智能体名称的组合。如果多个智能体角色共用一个账户，请为每个角色添加独立后缀，确保记忆内容一致。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 为测试用户运行一轮，并存入一项偏好或账户详情。
2. 为同一用户启动另一个 Runtime 会话。
3. 询问先前存入的详情，确认适配器会在智能体回答前将其召回。
4. 对第二个用户重复测试，确认不同用户的记忆库彼此隔离。

如果第二次运行能根据第一次运行中的细节作答，说明配置有效。如果不能，请启用调试日志、检查配置的记忆库 ID，并确认存入调用已完成。

## 常见错误 {#common-mistakes}

- 使用未经信任验证、由客户端提供的标识符，导致不同用户的记忆混在一起
- 根据 `runtimeSessionId` 设置记忆库，按设计就会破坏记忆的连续性
- 在所有场景都开启 Reflect（反思）模式；多数轮次使用 Recall（召回）会更快、更简单

## 常见问题 {#faq}

### 为什么记忆不应使用 runtimeSessionId？ {#why-should-i-avoid-runtimesessionid-for-memory}

因为 AgentCore Runtime 会话是临时的。绑定到该 ID 的记忆库会随着你试图摆脱的会话模式而失去作用。

### 何时应使用 Reflect 模式？ {#when-should-i-use-reflect-mode}

只在较难的推理步骤中选择性使用 Reflect。普通轮次继续使用 Recall 模式，以降低延迟。

### 存入可以在后台进行吗？ {#can-retention-run-in-the-background}

可以。该集成支持异步存入，因此用户轮次无需等待存入操作完成。

## 后续步骤 {#next-steps}

- 如果需要托管的记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)中的相关工作流。
