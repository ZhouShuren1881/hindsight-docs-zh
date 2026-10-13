---
title: "使用 AWS AgentCore 进行多轮智能体记忆：跨会话记住"
authors: [benfrank241]
date: 2026-05-01T16:00:00Z
tags: [integrations, aws, agentcore, bedrock, agents, memory, guide, tutorial]
description: "使用 Hindsight 将持久记忆添加到 AWS AgentCore 智能体。 智能体可以记住多轮对话和会话中的上下文、决策和学习内容。"
image: /img/blog/agentcore-persistent-memory.webp
hide_table_of_contents: true
---

![使用 AWS AgentCore 进行多轮智能体记忆：跨会话记住](/img/blog/agentcore-persistent-memory.webp)

<!-- truncate -->

AWS AgentCore（Amazon Bedrock 智能体）擅长构建能够在多个回合中进行推理和行动的智能智能体。但是，没有持久记忆的智能体很难应对多会话工作流程。 Hindsight 现在与 AgentCore 集成，作为运行时适配器，自动捕获智能体上下文、决策和学习内容，将它们保留在会话中，并使智能体能够构建长期的机构知识。

## 为什么你的智能体需要记忆 {#why-your-agents-need-memory}

想象一个客户支持智能体。客户第一次联系时，智能体就会解决他们的问题。几天后，同一位客户再次提出后续问题。 **没有记忆，智能体就会忘记一切。** 客户必须重新解释他们的背景，智能体重新诊断问题，你会失去第一次互动中学到的所有知识。

AgentCore 会话是短暂的——它们会启动以处理请求并随后销毁。下一个客户请求从一个新的智能体开始，它对之前发生的事情一无所知。这适用于无状态事务，但它不适用于随着时间的推移而变得更加智能的智能体。

Hindsight 通过自动捕获您的智能体所学到的内容并使其在下一个会话中可用来解决这个问题。您的智能体会记住客户背景、以前的解决方案以及它发现的模式，而无需您手动编写检索代码或管理记忆。

## 记忆如何在你的智能体中发挥作用 {#how-memory-works-in-your-agent}

将Hindsight添加到您的智能体中非常简单。薄型适配器包裹您的智能体并自动执行三件事：

1. **处理请求之前** - 记忆你所学的内容
   - 从之前的互动中查找相关记忆
   - 将该上下文注入智能体的提示中
   - 智能体用它来做出更好的决策

2. **处理请求时** - 你的智能体表现正常
   - 使用调用的上下文处理用户输入
   - 做出决策并产生输出
   - 其他一切保持不变

3. **回复后** - 自动记住你所学的内容
   - 从智能体的输出中提取关键见解
   - 存储它们以供将来记忆召回
   - 已编入索引并为下次做好准备

所有这一切都是自动发生的。你配置Hindsight一次，你的智能体就开始记忆。

## Hindsight vs AgentCore 记忆：何时使用每个 {#hindsight-vs-agentcore-memory-when-to-use-each}

AWS AgentCore 包括内置记忆服务**AgentCore记忆**。两者都可以持久保持智能体状态，但它们解决不同的问题：

|特点|AgentCoreMemory|Hindsight|
|---------|-----------------|-----------|
|**服务类型**|AWS 托管、AWS 原生|专业记忆系统|
|**操作**|低级（写入记录、查询）|高级（记忆存储、记忆召回、反思）|
|**检索**|需要显式 API 调用|每轮交互前自动记忆召回|
|**定制**|需要外部管道|内置（保留策略、提取模式、观察综合）|
|**知识**|原始记录|综合观察、心智模型、综合见解|

**选择 AgentCoreMemory，如果：**
- 您需要 AWS 原生控制和 AWS 管理工作流程
- 您的记忆需求很简单（存储/检索记录）
- 您更喜欢AWS的标准策略和命名空间

**选择Hindsight，如果：**
- 你想要专门的记忆操作（记忆存储、记忆召回、合成的回忆）
- 你需要更丰富的检索（观察、心智模型、巩固知识）
- 您希望自动化处理读取和写入，而无需显式 API 调用
- 你需要内置定制（提取策略、保留规则、观察综合）

**在此整合中：**Hindsight自动化整个生命周期——在每次转动之前，适配器会自动调用记忆；每转一圈后，它都会自动保留见解。 AgentCore 的事后保留需要显式写入；读端检索需要显式的 API 调用。

## 将记忆添加到您的智能体中 {#adding-memory-to-your-agent}

**第 1 步：安装集成**

```bash
pip install hindsight-agentcore
```

**第2步：配置Hindsight**（启动时一次）

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="my-support-agent")
```

**第 3 步：包装智能体的处理程序**

```python
#您的 AgentCore 事件处理程序
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=event["userId"],
    agent_name="my-support-agent",
    tenant_id=event.get("tenantId")  # optional
)

result = await adapter.run_turn(
    context=context,
    payload={"prompt": user_message},
    agent_callable=my_agent_function
)
```

就是这样。现在，适配器会在每次请求之前自动回忆记忆，并在之后存储新的见解。您的智能体代码不会改变——它只是随着时间的推移变得更加智能。

## 真实世界用例 {#real-world-use-cases}

### 用例 1：客户支持智能体 {#use-case-1-customer-support-agent}

AgentCore 智能体，可处理具有持久案例上下文的多会话客户支持：

```python
from hindsight_agentcore import HindsightRuntimeAdapter, TurnContext, configure
import os

#配置一次
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

adapter = HindsightRuntimeAdapter(agent_name="support-agent")

#您的 LLM 支持的智能体功能
async def support_agent(payload: dict, memory_context: str) -> dict:
    user_message = payload["prompt"]
    
    #注入先前的案例上下文（如果有）
    system_prompt = "你是一个有帮助的支持智能体。"
    if memory_context:
        system_prompt += f"\n\n此前关于该客户的上下文：\n{memory_context}"
    
    #致电您的LLM
    response = await llm.invoke(
        system_prompt=system_prompt,
        user_message=user_message
    )
    
    return {"output": response}

#当顾客几天后回来时
context = TurnContext(
    runtime_session_id=event["sessionId"],
    user_id=customer_id,
    agent_name="support-agent",
    tenant_id=account_id
)

result = await adapter.run_turn(
    context=context,
    payload={"prompt": "我需要有关上周发票的帮助"},
    agent_callable=support_agent
)
```

智能体会自动回忆客户的问题、之前的解决方案和帐户详细信息，而客户无需重复任何操作。

### 用例 2：数据分析智能体 {#use-case-2-data-analysis-agent}

AgentCore 智能体，可探索数据集并记住发现以供后续分析：

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
    
    #使用先前的分析上下文构建提示
    system = "你是一名数据分析师。仔细分析趋势。"
    if memory_context:
        system += f"\n\nPrevious analyses:\n{memory_context}"
    
    #运行分析
    analysis = await llm.invoke(system_prompt=system, user_message=query)
    return {"output": analysis}

#第 1 节：第一季度初步分析
context1 = TurnContext(
    runtime_session_id="session-1",
    user_id="analyst-1",
    agent_name="analytics-agent"
)
result1 = await adapter.run_turn(
    context=context1,
    payload={"prompt": "从我们的数据库分析第一季度销售趋势"},
    agent_callable=analytics_agent
)

#第 2 节（几天后）：比较 Q2 和 Q1
context2 = TurnContext(
    runtime_session_id="session-2",
    user_id="analyst-1",
    agent_name="analytics-agent"
)
result2 = await adapter.run_turn(
    context=context2,
    payload={"prompt": "第二季度的趋势与第一季度的趋势相比如何？"},
    agent_callable=analytics_agent
)
```

智能体的分析复合——每个新查询都会自动访问先前的发现，从而无需手动传递上下文即可实现比较洞察。

### 用例 3：代码审查智能体 {#use-case-3-code-review-agent}

AgentCore 智能体，可学习代码库模式并在评论中应用所学知识：

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
    
    system = """您是代码审查员。检查：
- 性能问题
- 安全问题
- 风格不一致
- 设计模式"""
    
    #从之前的评论中注入代码库模式
    if memory_context:
        system += f"\n\n本代码库的编码模式：\n{memory_context}"
    
    review = await llm.invoke(system_prompt=system, user_message=pr_diff)
    return {"output": review}

#跨多个会议审查 PR
for pr in pull_requests:
    context = TurnContext(
        runtime_session_id=f"review-{pr.id}",
        user_id="reviewer-team",
        agent_name="code-reviewer",
        tenant_id="engineering"
    )
    
    result = await adapter.run_turn(
        context=context,
        payload={"prompt": f"审查此 PR：\n\n{pr.diff}"},
        agent_callable=code_reviewer
    )
    #智能体自动回忆之前评论的模式
    #并将其应用到本次评论中
```

智能体构建机构知识——通过识别和执行所有评论的代码库模式来提高评论质量。

## 适配器的工作原理 {#how-the-adapter-works}

**HindsightRuntimeAdapter**围绕您的智能体协调三个阶段：

```python
#1. 转弯之前：记忆相关上下文
memory_context = await adapter.before_turn(
    context=turn_context,
    query=user_message
)

#2. 利用回忆执行智能体
result = await agent_callable(
    payload={"prompt": user_message},
    memory_context=memory_context  #由适配器注入
)

#3. 转后：记忆存储 未来记忆召回的输出
await adapter.after_turn(
    context=turn_context,
    result=result["output"],
    query=user_message
)
```

适配器通过以下方式与**TurnContext**集成到关键存储器：
- **runtime_session_id**：临时跟踪的会话标识符
- **用户id**：发起回合的用户（记忆范围）
- **agent_name**：哪个智能体产生了记忆
- **租户_id**：可选的多租户隔离
- **request_id**：可选的请求跟踪

这些字段确保记忆在会话中正确定位、隔离和检索。

## 记忆范围：多租户部署 {#memory-scoping-multi-tenant-deployments}

对于服务多个用户/租户的部署，TurnContext 强制执行适当的隔离：

```python
from hindsight_agentcore import TurnContext

# 每个用户/租户获得隔离记忆
turn_context = TurnContext(
    runtime_session_id=runtime_session_id,  #AgentCore 会话跟踪
    user_id=authenticated_user_id,          #隔离用户的记忆
    agent_name="my-agent",                  #识别智能体
    tenant_id=customer_account_id,          #多租户隔离（可选）
    request_id=request_id                   # Tracing (optional)
)

result = await adapter.run_turn(
    context=turn_context,
    payload={"prompt": user_request},
    agent_callable=agent_function
)

#用户A的记忆永远不会泄露给用户B
#记忆库ID源自tenant_id:user_id:agent_name
```

适配器使用**租户_id**和**用户id**构建隔离的记忆库。一个用户存储的记忆永远不会被另一个用户调用，这对于多租户系统至关重要。

## 最佳实践 {#best-practices}

**设置user_id一致：** TurnContext 中的 user_id 字段是您的主要隔离边界。使用稳定的用户标识符，该标识符在同一个人的各个会话中保持不变。

**为多租户应用程序添加tenant_id：** 如果您正在为多个客户构建，请使用tenant_id来确保记忆不会在客户之间泄漏。

**从简单开始，稍后添加功能：** 你不需要立即优化记忆。配置Hindsight，添加适配器并让它运行。稍后查看 Hindsight Cloud仪表板，了解存储的内容并根据需要进行优化。

**生产中的显示器：** 在大容量系统中，定期检查Hindsight仪表板，以确保智能体存储相关记忆并且不会累积噪音。

**使用多个会话进行测试：** 创建一个测试场景，其中您的智能体处理请求，会话结束，与同一用户启动新会话，然后传入后续请求。验证智能体是否回忆起先前的上下文并正确使用它。

## 部署地点Hindsight {#where-to-deploy-hindsight}

Hindsight 适用于两种部署选项 - 根据您的基础设施偏好进行选择：

**Hindsight Cloud**（推荐入门）
- 完全由Hindsight管理
- 没有可运行的基础设施
- 自动缩放和备份
- 通过API密钥进行身份验证
- 最适合：想要专注于构建而不是运行数据库的团队

**自托管HindsightOSS**（适用于高级部署）
- 在您的 AWS 账户（EC2、ECS、Lambda）中运行 Hindsight
- 数据库：PostgreSQL兼容（RDS、Aurora）
- 完全控制数据驻留和网络
- 与您现有的基础设施集成
- 最适合：具有严格数据驻留要求或现有数据库基础设施的团队

这两个选项与 AgentCore 集成的工作方式相同 — 适配器不关心 Hindsight 在哪里运行。从 Hindsight Cloud开始，只需几分钟即可启动并运行，然后如果您的需求发生变化，则迁移到自托管。

## 故障排除 {#troubleshooting}

**智能体不使用先验上下文：** 确保您在各个会话中使用相同的 user_id。如果 user_id 在第一次请求和后续请求之间发生变化，则智能体将具有不同的记忆库。检查您的 TurnContext 创建逻辑。

**记忆没有被存储：** 验证智能体实际上正在返回输出（结果在结果字典中必须有一个“output”键）。如果您的智能体提前返回或出错，则不会存储任何内容。检查日志和智能体输出。

**我看到了旧的记忆：** 查看Hindsight Cloud仪表板中存储的内容。智能体可能会存储你意想不到的东西。了解存储的内容后，您可以调整保留策略或提取说明。

**多用户隔离不起作用：** 如果您在多个用户之间共享单个适配器，请确保每个用户在其 TurnContext 中都有唯一的 user_id。记忆以 user_id 为密钥，因此如果每个人都有相同的 user_id，他们就会共享记忆。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [AWS Bedrock 智能体文档](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Hindsight AgentCore 集成自述文件](/sdks/integrations/agentcore)
- [Hindsight记忆存储API](/developer/api/retain)
- [Hindsight 记忆召回API](/developer/api/recall)
