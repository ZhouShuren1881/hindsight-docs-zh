---
sidebar_position: 14
title: "使用 Hindsight 为 Amazon Bedrock AgentCore 提供持久记忆 | 集成"
description: "为 Amazon Bedrock AgentCore Runtime 智能体添加长期记忆。使用稳定用户身份而非临时 runtimeSessionId，实现跨会话持久化。"
---

# Amazon Bedrock AgentCore Runtime

使用 Hindsight 为 [Amazon Bedrock AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-sessions.html) 智能体提供持久记忆。

AgentCore Runtime 会话是临时的，空闲后会终止，之后重新创建全新环境。`hindsight-agentcore` 提供持久的跨会话记忆，使智能体在任意数量的 Runtime 会话间记住用户、决策和学到的模式。

[查看更新日志 →](/changelog/integrations/agentcore)

## 工作原理 {#how-it-works}

```
AgentCore Runtime 调用
        │
        ▼
   before_turn()         ← 从 Hindsight 召回相关记忆
        │
        ▼
   智能体执行            ← 注入历史上下文
        │
        ▼
   after_turn()          ← 异步存储输出到 Hindsight
```

记忆以稳定的用户身份为键，**不是** `runtimeSessionId`。记忆库不会随会话更替而消失。

默认记忆库名称格式：
```
tenant:{tenant_id}:user:{user_id}:agent:{agent_name}
```

## 安装 {#installation}

```bash
pip install hindsight-agentcore
```

## 快速开始 {#quick-start}

:::tip 推荐使用 Hindsight Cloud
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
        user_id=event["userId"],       # 来自已验证认证，不可信任客户端直接提供
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
        prompt = f"历史上下文：\n{memory_context}\n\n当前请求：{prompt}"

    output = await call_bedrock(prompt)
    return {"output": output}
```

## 底层钩子 {#lower-level-hooks}

如需直接控制召回 → 执行 → 存储循环：

```python
memory_context = await adapter.before_turn(context, query=user_message)

result = await run_my_agent(payload, memory_context=memory_context)

await adapter.after_turn(context, result=result["output"], query=user_message)
```

## 检索模式 {#retrieval-modes}

### 召回（默认） {#recall-default}

快速多策略检索（语义 + 关键词 + 图 + 时间）：

```python
from hindsight_agentcore import RecallPolicy

adapter = HindsightRuntimeAdapter(
    recall_policy=RecallPolicy(mode="recall", budget="mid", max_tokens=1500)
)
```

### 反思 {#reflect}

通过 LLM 综合生成上下文，用于复杂推理任务：

```python
adapter = HindsightRuntimeAdapter(
    recall_policy=RecallPolicy(mode="reflect")
)
```

`reflect` 较慢，应按需使用，留给明确的规划步骤或路由决策。

## 异步存储 {#async-retention}

默认情况下，`after_turn()` 在后台启动存储任务，不延迟用户当前轮次：

```python
configure(retain_async=True)   # 默认
configure(retain_async=False)  # 返回前等待存储
```

## 长时间运行的工作流 {#long-running-workflows}

跨多个 Runtime 会话的任务，应在开始和完成时存储记忆：

```python
# 任务开始
await adapter.after_turn(
    context,
    result="开始分析 Acme Corp 的季度业务评审",
    query=task_description,
)

# ……工作可能跨多个会话……

# 任务完成
await adapter.after_turn(
    context,
    result=f"季度业务评审完成，发现：{summary}",
    query=task_description,
)
```

## 身份与认证 {#identity-and-auth}

**切勿使用 `runtimeSessionId` 作为记忆库 ID。** 会话会过期，而记忆必须跨会话保留。

优先使用的身份来源，按顺序如下：
1. AgentCore JWT/OAuth 上下文中经过验证的用户 ID。
2. `X-Amzn-Bedrock-AgentCore-Runtime-User-Id` 请求头。
3. 可信服务端部署中，由应用提供的用户 ID。

```python
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=jwt_claims["sub"],         # 已验证令牌中的稳定身份
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

**安全规则：** 身份缺失时，解析器必须拒绝继续并返回 `BankResolutionError`，而非导致跨用户记忆泄露。

## 配置参考 {#configuration-reference}

| 选项 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| `hindsight_api_url` | `HINDSIGHT_API_URL` | Hindsight Cloud | Hindsight 服务器地址 |
| `api_key` | `HINDSIGHT_API_KEY` | — | Hindsight Cloud API 密钥 |
| `recall_budget` | — | `"mid"` | 搜索深度：`low`、`mid`、`high` |
| `recall_max_tokens` | — | `1500` | 召回的最大 token 数 |
| `retain_async` | — | `True` | 非阻塞存储 |
| `timeout` | — | `15.0` | HTTP 超时，单位为秒 |
| `tags` | — | `[]` | 为所有存储记忆附加的标签 |
| `verbose` | — | `False` | 记录记忆操作日志 |

## 失败情况 {#failure-modes}

| 失败 | 行为 |
|---|---|
| Hindsight 不可用 | `before_turn()` 返回 `""`，智能体继续执行 |
| 召回超时 | 返回 `""`，智能体继续执行 |
| 存储失败 | 记录警告，不影响用户当前轮次 |
| 记忆库解析失败 | 拒绝继续，避免跨用户记忆泄露 |

## 环境要求 {#requirements}

- Python 3.10+
- `hindsight-client>=0.4.0`
