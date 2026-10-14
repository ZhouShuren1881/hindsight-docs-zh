---
title: "AWS AgentCore 多轮智能体记忆：跨会话记忆"
authors: [benfrank241]
date: 2026-05-01T16:00:00Z
tags: [integrations, aws, agentcore, bedrock, agents, memory, guide, tutorial]
description: "借助 Hindsight 为 AWS AgentCore 智能体添加持久记忆，让智能体在多轮对话和多个会话中记住上下文、决策和经验。"
image: /img/blog/agentcore-persistent-memory.webp
hide_table_of_contents: true
---

![AWS AgentCore 多轮智能体记忆：跨会话记忆](/img/blog/agentcore-persistent-memory.webp)

<!-- truncate -->

AWS AgentCore（Amazon Bedrock Agents）擅长构建能够跨多轮对话进行推理和行动的智能智能体。但没有持久记忆的智能体很难处理跨多个会话的工作流。Hindsight 现已作为运行时适配器与 AgentCore 集成，可自动捕获智能体的上下文、决策和经验，在不同会话之间持久保存这些内容，并帮助智能体积累长期的机构知识。

## 为什么智能体需要记忆 {#why-your-agents-need-memory}

想象一个客户支持智能体。客户第一次联系时，智能体解决了他们的问题。几天后，同一位客户带着后续问题再次联系。**没有记忆，智能体就会忘记一切。** 客户不得不重新解释背景，智能体要再次诊断问题，而你会失去第一次互动中积累的所有经验。

AgentCore 会话是临时的——它们启动以处理请求，随后就会结束。下一次客户请求会由一个全新的智能体处理，它对之前发生的事情一无所知。这种方式适用于无状态事务，却不适合那些应该随着时间推移而变得更智能的智能体。

Hindsight 会自动捕获智能体学到的内容，并在下一个会话中提供这些内容，从而解决这个问题。智能体可以记住客户背景、之前的解决方案和自己发现的模式，你无需手动编写检索代码或管理记忆。

## 记忆如何在智能体中发挥作用 {#how-memory-works-in-your-agent}

将 Hindsight 添加到智能体中很简单。一个轻量适配器会封装智能体，并自动完成三件事：

1. **处理请求前**——召回已学到的内容
   - 查找之前互动中的相关记忆
   - 将这些上下文注入智能体的提示
   - 智能体利用这些内容做出更好的决策

2. **处理请求时**——智能体照常工作
   - 利用召回的上下文处理用户输入
   - 做出决策并生成输出
   - 其他一切保持不变

3. **回复后**——自动记住学到的内容
   - 从智能体的输出中提取关键信息
   - 存储这些信息，供日后召回
   - 完成索引，准备好供下次使用

这一切都会自动完成。配置一次 Hindsight，智能体就会开始记忆。

## Hindsight 与 AgentCore Memory：分别适用于什么场景 {#hindsight-vs-agentcore-memory-when-to-use-each}

AWS AgentCore 内置了记忆服务 **AgentCoreMemory**。两者都可以持久保存智能体状态，但解决的问题不同：

| 特性 | AgentCoreMemory | Hindsight |
| --- | --- | --- |
| **服务类型** | AWS 托管、AWS 原生 | 专用记忆系统 |
| **操作** | 底层操作（写入记录、查询） | 高层操作（Retain（存入）、Recall（召回）、Reflect（反思）） |
| **检索** | 需要显式调用 API | 每轮交互前自动召回 |
| **定制** | 需要外部管道 | 内置（保留策略、提取模式、观测综合生成） |
| **知识** | 原始记录 | 整合后的观测、心智模型、综合生成的见解 |

**选择 AgentCoreMemory 的情况：**
- 你需要 AWS 原生控制和 AWS 管理工作流
- 记忆需求简单（存储/检索记录）
- 你倾向于使用 AWS 的标准策略和命名空间

**选择 Hindsight 的情况：**
- 你需要专用的记忆操作（用于综合生成的 Retain、Recall、Reflect）
- 你需要更丰富的检索能力（观测、心智模型、整合后的知识）
- 你希望自动处理读取和写入，无需显式调用 API
- 你需要内置的定制能力（提取策略、保留规则、观测综合生成）

**在此集成中：** Hindsight 会自动处理完整生命周期——每轮交互前，适配器会自动召回记忆；每轮交互后，适配器会自动存入见解。AgentCore 在事件后保留记忆需要显式写入；读取端的检索也需要显式调用 API。

## 为智能体添加记忆 {#adding-memory-to-your-agent}

**第 1 步：安装集成包**

```bash
pip install hindsight-agentcore
```

**第 2 步：配置 Hindsight**（在启动时配置一次）

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="my-support-agent")
```

**第 3 步：封装智能体的处理程序**

```python
# AgentCore 事件处理程序
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=event["userId"],
    agent_name="my-support-agent",
    tenant_id=event.get("tenantId")  # 可选
)

result = await adapter.run_turn(
    context=context,
    payload={"prompt": user_message},
    agent_callable=my_agent_function
)
```

就是这样。现在，适配器会在每次请求前自动召回记忆，并在请求后存储新的见解。智能体代码无需改动，它只会随着时间推移变得更智能。

## 真实场景示例 {#real-world-use-cases}

### 用例 1：客户支持智能体 {#use-case-1-customer-support-agent}

这种 AgentCore 智能体可以在多个会话中处理客户支持，并保留案例上下文：

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

# 配置一次
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="support-agent")

# 由 LLM 驱动的智能体函数
async def support_agent(payload: dict, memory_context: str) -> dict:
    user_message = payload["prompt"]
    
    # 如果有此前的案例上下文，则将其注入提示
    system_prompt = "You are a helpful support agent."
    if memory_context:
        system_prompt += f"\n\nPrior context about this customer:\n{memory_context}"
    
    # 调用 LLM
    response = await llm.invoke(
        system_prompt=system_prompt,
        user_message=user_message
    )
    
    return {"output": response}

# 客户几天后再次联系时
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=customer_id,
    agent_name="support-agent",
    tenant_id=account_id
)

result = await adapter.run_turn(
    context=context,
    payload={"prompt": "I need help with my invoice from last week"},
    agent_callable=support_agent
)
```

智能体会自动召回客户的问题、之前的解决方案和账户详情，客户无需重复说明这些信息。

### 用例 2：数据分析智能体 {#use-case-2-data-analysis-agent}

这种 AgentCore 智能体可以探索数据集，并记住发现以供后续分析：

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="analytics-agent")

async def analytics_agent(payload: dict, memory_context: str) -> dict:
    query = payload["prompt"]
    
    # 使用之前分析的上下文构建提示
    system = "You are a data analyst. Analyze trends carefully."
    if memory_context:
        system += f"\n\nPrevious analyses:\n{memory_context}"
    
    # 执行分析
    analysis = await llm.invoke(system_prompt=system, user_message=query)
    return {"output": analysis}

# 会话 1：对第一季度进行初步分析
context1 = TurnContext(
    runtime_session_id="session-1",
    user_id="analyst-1",
    agent_name="analytics-agent"
)
result1 = await adapter.run_turn(
    context=context1,
    payload={"prompt": "Analyze Q1 sales trends from our database"},
    agent_callable=analytics_agent
)

# 会话 2（几天后）：比较第二季度与第一季度
context2 = TurnContext(
    runtime_session_id="session-2",
    user_id="analyst-1",
    agent_name="analytics-agent"
)
result2 = await adapter.run_turn(
    context=context2,
    payload={"prompt": "How do Q2 trends compare to what you found in Q1?"},
    agent_callable=analytics_agent
)
```

智能体的分析会不断累积——每个新查询都会自动访问之前的发现，因此无需手动传递上下文也能进行比较分析。

### 用例 3：代码审查智能体 {#use-case-3-code-review-agent}

这种 AgentCore 智能体可以学习代码库模式，并在多次审查中应用学到的经验：

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="code-reviewer")

async def code_reviewer(payload: dict, memory_context: str) -> dict:
    pr_diff = payload["prompt"]
    
    system = """You are a code reviewer. Check for:
- Performance issues
- Security problems
- Style inconsistencies
- Design patterns"""
    
    # 注入此前审查中总结的代码库模式
    if memory_context:
        system += f"\n\nCoding patterns in this repo:\n{memory_context}"
    
    review = await llm.invoke(system_prompt=system, user_message=pr_diff)
    return {"output": review}

# 在多个会话中审查 PR
for pr in pull_requests:
    context = TurnContext(
        runtime_session_id=f"review-{pr.id}",
        user_id="reviewer-team",
        agent_name="code-reviewer",
        tenant_id="engineering"
    )
    
    result = await adapter.run_turn(
        context=context,
        payload={"prompt": f"Review this PR:\n\n{pr.diff}"},
        agent_callable=code_reviewer
    )
    # 智能体会自动召回此前审查中发现的模式
    # 并将这些模式应用于本次审查
```

智能体会积累机构知识——通过识别并贯彻所有审查中总结的代码库模式，提升审查质量。

## 适配器的工作原理 {#how-the-adapter-works}

**HindsightRuntimeAdapter** 会围绕智能体协调三个阶段：

```python
# 1. 轮次开始前：召回相关上下文
memory_context = await adapter.before_turn(
    context=turn_context,
    query=user_message
)

# 2. 使用召回的记忆执行智能体
result = await agent_callable(
    payload={"prompt": user_message},
    memory_context=memory_context  # 由适配器注入
)

# 3. 轮次结束后：存储输出，供日后召回
await adapter.after_turn(
    context=turn_context,
    result=result["output"],
    query=user_message
)
```

适配器会根据 **TurnContext** 中的以下字段为记忆确定键：
- **runtime_session_id**：用于临时跟踪的会话标识符
- **user_id**：发起本轮交互的用户（记忆范围）
- **agent_name**：生成这条记忆的智能体
- **tenant_id**：可选的多租户隔离标识
- **request_id**：可选的请求追踪标识

这些字段可确保记忆在不同会话间得到正确的范围限定、隔离和检索。

## 记忆范围：多租户部署 {#memory-scoping-multi-tenant-deployments}

对于服务多个用户或租户的部署，TurnContext 会强制实施适当的隔离：

```python
from hindsight_agentcore import TurnContext

# 为每个用户/租户创建隔离的记忆
turn_context = TurnContext(
    runtime_session_id=runtime_session_id,  # AgentCore 会话跟踪
    user_id=authenticated_user_id,          # 按用户隔离记忆
    agent_name="my-agent",                  # 标识智能体
    tenant_id=customer_account_id,          # 多租户隔离（可选）
    request_id=request_id                   # 请求追踪（可选）
)

result = await adapter.run_turn(
    context=turn_context,
    payload={"prompt": user_request},
    agent_callable=agent_function
)

# 用户 A 的记忆绝不会泄露给用户 B
# 记忆库 ID 根据 tenant_id:user_id:agent_name 派生
```

适配器使用 **tenant_id** 和 **user_id** 构建彼此隔离的记忆库。一个用户存储的记忆绝不会被另一个用户召回；这对多租户系统至关重要。

## 最佳实践 {#best-practices}

**保持 user_id 一致：** TurnContext 中的 user_id 字段是主要的隔离边界。应使用稳定的用户标识符，确保同一个人在不同会话中的标识符保持一致。

**为多租户应用添加 tenant_id：** 如果你正在为多个客户构建应用，请使用 tenant_id，确保客户之间绝不会泄露记忆。

**从简单开始，之后再添加功能：** 你无需立即优化记忆。先配置 Hindsight、添加适配器并运行。稍后可查看 Hindsight Cloud 控制台，了解存储了哪些内容，再按需调整。

**在生产环境中监控：** 对于高流量系统，应定期检查 Hindsight 控制台，确保智能体存储了相关记忆，且没有累积无关内容。

**使用多个会话进行测试：** 创建一个测试场景：智能体处理请求，会话结束；然后同一用户开启新会话并提出后续请求。验证智能体能否召回之前的上下文并正确使用。

## Hindsight 的部署方式 {#where-to-deploy-hindsight}

Hindsight 提供两种部署选项，可根据基础设施偏好进行选择：

**Hindsight Cloud**（建议用于快速入门）
- 完全由 Hindsight 托管
- 无需运维基础设施
- 自动扩展和备份
- 通过 API key 进行身份认证
- 最适合：希望专注于构建应用，而非运行数据库的团队

**自托管 Hindsight OSS**（适用于高级部署）
- 在你的 AWS 账户中运行 Hindsight（EC2、ECS、Lambda）
- 数据库：兼容 PostgreSQL（RDS、Aurora）
- 完全掌控数据驻留和网络
- 可与现有基础设施集成
- 最适合：有严格数据驻留要求或已有数据库基础设施的团队

这两种选项与 AgentCore 集成的工作方式完全相同——适配器不关心 Hindsight 运行在哪里。可以先使用 Hindsight Cloud，在几分钟内启动服务；如果需求发生变化，再迁移到自托管部署。

## 故障排查 {#troubleshooting}

**智能体没有使用之前的上下文：** 确认各会话使用的是同一个 user_id。如果第一次请求和后续请求之间的 user_id 发生变化，智能体就会使用不同的记忆库。请检查 TurnContext 的创建逻辑。

**没有存储记忆：** 确认智能体确实返回了输出（结果字典必须包含一个名为 `output` 的键）。如果智能体提前返回或发生错误，就不会存储任何内容。请检查日志和智能体输出。

**看到的是旧记忆：** 检查 Hindsight Cloud 控制台中存储的内容。智能体可能存储了你没有预料到的内容。了解存储内容后，可以调整保留策略或提取说明。

**多用户隔离未生效：** 如果多个用户共用一个适配器，请确保每个用户在其 TurnContext 中都有唯一的 user_id。记忆以 user_id 为键；如果所有人使用相同的 user_id，他们就会共享记忆。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [AWS Bedrock Agents 文档](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Hindsight AgentCore 集成 README](/sdks/integrations/agentcore)
- [Hindsight Retain API](/developer/api/retain)
- [Hindsight Recall API](/developer/api/recall)
