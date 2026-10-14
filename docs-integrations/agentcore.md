---
sidebar_position: 14
title: "使用 Hindsight 为 Amazon Bedrock AgentCore Runtime 智能体提供持久记忆 | 集成"
description: "为 Amazon Bedrock AgentCore Runtime 智能体添加长期记忆。使用稳定的用户身份而非临时的 runtimeSessionId，让记忆跨会话持久保存。"
---

# Amazon Bedrock AgentCore Runtime

使用 Hindsight 为 [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html) 智能体提供持久记忆。

AgentCore Runtime 会话明确是临时的：空闲后会终止，并重新提供全新的环境。`hindsight-agentcore` 可添加跨会话的持久记忆，让智能体在任意数量的 Runtime 会话中记住用户、决策和学到的模式。

[查看更新日志 →](/changelog/integrations/agentcore)

## 工作原理 {#how-it-works}

```
AgentCore Runtime 调用
        │
        ▼
   before_turn()         ← 从 Hindsight 召回相关记忆
        │
        ▼
  智能体执行              ← 将历史上下文补充到提示中
        │
        ▼
   after_turn()          ← 将输出存入 Hindsight（异步）
```

记忆以稳定的用户身份为键，**而不是** `runtimeSessionId`。记忆库会在会话更替后继续保留。

默认记忆库格式：
```
tenant:{tenant_id}:user:{user_id}:agent:{agent_name}
```

## 安装 {#installation}

```bash
pip install hindsight-agentcore
```

## 快速开始 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

```python
import os
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"],
)

adapter = HindsightRuntimeAdapter(agent_name="support-agent")


# AgentCore Runtime 处理函数
async def handler(event: dict) -> dict:
    context = TurnContext(
        runtime_session_id=event["sessionId"],
        user_id=event["userId"],       # 来自已验证的身份认证，不得由客户端提供
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


async def run_my_agent(payload: dict, memory_context: str) -> dict:
    prompt = payload["prompt"]
    if memory_context:
        prompt = f"Past context:\n{memory_context}\n\nCurrent request: {prompt}"

    output = await call_bedrock(prompt)
    return {"output": output}
```

## 底层钩子 {#lower-level-hooks}

如需直接控制召回 → 执行 → 存入的循环：

```python
memory_context = await adapter.before_turn(context, query=user_message)

result = await run_my_agent(payload, memory_context=memory_context)

await adapter.after_turn(context, result=result["output"], query=user_message)
```

## 检索模式 {#retrieval-modes}

### Recall（默认） {#recall-default}

快速的多策略检索（语义 + 关键词 + 图 + 时间）：

```python
from hindsight_agentcore import RecallPolicy

adapter = HindsightRuntimeAdapter(
    recall_policy=RecallPolicy(mode="recall", budget="mid", max_tokens=1500)
)
```

### Reflect {#reflect}

由 LLM 综合生成上下文，适用于复杂推理任务：

```python
adapter = HindsightRuntimeAdapter(
    recall_policy=RecallPolicy(mode="reflect")
)
```

请有选择地使用 `reflect`，因为它速度较慢。将它留给明确的规划步骤或路由决策。

## 异步存入 {#async-retention}

默认情况下，`after_turn()` 会将记忆存入作为后台任务触发，不会延迟用户当前轮次：

```python
configure(retain_async=True)   # 默认
configure(retain_async=False)  # 返回前等待存入完成
```

## 长时间运行的工作流 {#long-running-workflows}

对于跨多个 Runtime 会话的任务，应在开始和完成时存入记忆：

```python
# 任务开始
await adapter.after_turn(
    context,
    result="Started QBR analysis for Acme Corp",
    query=task_description,
)

# ... 可能跨多个会话的长时间运行工作 ...

# 任务完成
await adapter.after_turn(
    context,
    result=f"Completed QBR analysis. Finding: {summary}",
    query=task_description,
)
```

## 身份与认证 {#identity-and-auth}

**绝不要使用 `runtimeSessionId` 作为记忆库 ID。** 会话会过期，记忆必须跨会话保留。

首选身份来源（按优先顺序）：
1. AgentCore JWT/OAuth 上下文中经过验证的用户 ID
2. `X-Amzn-Bedrock-AgentCore-Runtime-User-Id` 请求头
3. 可信服务端部署中由应用提供的用户 ID

```python
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=jwt_claims["sub"],         # 来自已验证令牌的稳定身份
    agent_name="support-agent",
    tenant_id=jwt_claims.get("tenant"),
)
```

## 自定义记忆库解析 {#custom-bank-resolution}

覆盖默认的 `tenant:user:agent` 格式：

```python
from hindsight_agentcore import TurnContext

def my_resolver(context: TurnContext) -> str:
    return f"acme:{context.user_id}:{context.agent_name}"

adapter = HindsightRuntimeAdapter(bank_resolver=my_resolver)
```

**安全规则：** 如果缺少身份信息，解析器必须以失败关闭方式处理（抛出 `BankResolutionError`），以免记忆泄露给其他用户。

## 配置参考 {#configuration-reference}

| 选项 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `hindsight_api_url` | `HINDSIGHT_API_URL` | Hindsight Cloud | Hindsight 服务器 URL |
| `api_key` | `HINDSIGHT_API_KEY` | — | Hindsight Cloud 的 API 密钥 |
| `recall_budget` | — | `"mid"` | 检索深度：`low`、`mid`、`high` |
| `recall_max_tokens` | — | `1500` | 召回的最大 token 数 |
| `retain_async` | — | `True` | 非阻塞式存入 |
| `timeout` | — | `15.0` | HTTP 超时时间，单位为秒 |
| `tags` | — | `[]` | 应用于所有存入记忆的标签 |
| `verbose` | — | `False` | 记录记忆操作日志 |

## 失败情况 {#failure-modes}

| 失败 | 行为 |
|---|---|
| Hindsight 不可用 | `before_turn()` 返回 `""`，智能体继续运行 |
| 召回超时 | 返回 `""`，智能体继续运行 |
| 存入失败 | 记录警告，不影响用户当前轮次 |
| 记忆库解析错误 | 以失败关闭方式处理，避免跨用户记忆泄露 |

## 环境要求 {#requirements}

- Python 3.10+
- `hindsight-client>=0.4.0`
