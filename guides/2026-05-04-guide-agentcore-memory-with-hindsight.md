---
title: "指南：使用 Hindsight 为 AgentCore Runtime 添加记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, agentcore, bedrock, memory]
description: "通过运行时适配器、稳定用户记忆库 ID，以及跨会话更替的召回和存储钩子，为 AgentCore Runtime 添加 Hindsight 记忆。"
image: /img/guides/guide-agentcore-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AgentCore Runtime 添加记忆](/img/guides/guide-agentcore-memory-with-hindsight.webp)

如需 **AgentCore Runtime 与 Hindsight 记忆**，最清晰的模式是用 `HindsightRuntimeAdapter` 包装 Bedrock AgentCore 处理器，并以稳定用户身份而非临时运行时会话 ID 关联记忆。这让记忆跨会话更替保持持久，解决从演示走向真实用户流量的主要缺口。

AgentCore Runtime 会话有意保持短暂，没有外部记忆层，运行环境更替时智能体会丢失上下文。

操作时可参考 [AgentCore Runtime 集成文档](/sdks/integrations/agentcore)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 AgentCore Runtime 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 Hindsight API。
> 3. 用稳定记忆库 ID 将记忆接入 AgentCore Runtime。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复此前上下文。

## 为什么这种配置有效 {#why-this-setup-works}

适配器在每轮周围提供清晰的召回、执行、存储循环。`before_turn()` 获取上下文，`run_turn()` 包装整次交互，`after_turn()` 存储结果。关键规则是记忆库 ID 跟随稳定用户身份，而非 `runtimeSessionId`。

## 前提条件 {#prerequisites}

- 已接收可信用户标识符的 AgentCore Runtime 处理器。
- 已安装 Python 和 `hindsight-agentcore`。
- 稳定记忆库模式，通常是租户加用户加智能体名称。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-agentcore
```

## 步骤 2：连接 AgentCore Runtime 与 Hindsight {#step-2-connect-agentcore-runtime-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
import os
from hindsight_agentcore import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"],
)
```

如果更喜欢在 AWS 自托管（ECS/EKS 配合 RDS PostgreSQL + pgvector），将 `hindsight_api_url` 设为 VPC 内的 Hindsight 端点。

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

默认记忆库格式为 `tenant:{tenant_id}:user:{user_id}:agent:{agent_name}`，正适合在 Runtime 会话更替中保留持久记忆。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

不要以 `runtimeSessionId` 关联记忆，它是临时 ID，会立即使记忆碎片化。使用跨会话稳定身份，例如租户加用户加智能体名称。同一账户有多个智能体角色时，各角色用独立后缀保持记忆一致。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 为测试用户执行一轮，存储偏好或账户细节。
2. 为同一用户触发另一个 Runtime 会话。
3. 询问此前细节，确认适配器在回答前召回。
4. 用第二个用户重复测试，确认记忆库隔离。

第二次运行能用第一次细节回答，就说明配置有效。否则启用调试日志、检查记忆库 ID，并确认存储调用实际完成。

## 常见错误 {#common-mistakes}

- 使用不可信客户端标识符，可能混合用户记忆。
- 以 `runtimeSessionId` 关联记忆库，按设计就会破坏延续。
- 到处使用反思，而多数轮次用召回更快更简单。

## 常见问题 {#faq}

### 为什么记忆应避免使用 runtimeSessionId？ {#why-should-i-avoid-runtimesessionid-for-memory}

AgentCore Runtime 会话是临时的，绑定该 ID 的记忆库会随你希望超越的会话模式失去作用。

### 何时应使用反思模式？ {#when-should-i-use-reflect-mode}

仅在较难推理步骤选择性使用。普通轮次保持召回以降低延迟。

### 存储可以在后台运行吗？ {#can-retention-run-in-the-background}

可以，集成支持异步存储，用户轮次无需等待。

## 后续步骤 {#next-steps}

- 如需托管记忆后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)中的相关工作流。
