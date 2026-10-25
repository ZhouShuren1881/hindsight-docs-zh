---
title: "指南：Bedrock AgentCore 跨会话记忆策略"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agentcore, bank-strategy, memory]
description: "为 Amazon Bedrock AgentCore 制定跨会话记忆策略：将 Hindsight 记忆库限定到稳定的用户或智能体身份，使记忆能够跨越临时的 runtimeSessionId，在不同会话间持续保留。"
image: /img/guides/guide-agentcore-cross-session-memory-strategy.svg
hide_table_of_contents: true
---

![指南：Bedrock AgentCore 跨会话记忆策略](/img/guides/guide-agentcore-cross-session-memory-strategy.svg)

如果要让 Amazon Bedrock AgentCore 支持**跨会话记忆**，最关键的决定不是安装哪个库，而是用什么身份来确定记忆库的范围。AgentCore Runtime 会话有意设计得很短：空闲一段时间后会终止，并获得全新的环境。任何绑定到 `runtimeSessionId` 的记忆都会在会话轮换时消失；这正是一些智能体在演示中表现良好、投入生产后却不断忘记真实用户的原因。

这是一份策略指南，不是安装教程。`hindsight-agentcore` 适配器已经为每个轮次提供了清晰的“召回 → 执行 → 存入”循环。它无法替你决定记忆的范围：“这个用户”是指一个人、一个租户、一个智能体角色，还是其中几者的组合。这个选择决定了记忆能否跨会话持续保留，还是会碎片化成互不相连的会话孤岛。

本指南接下来会讨论这些取舍：会话（短期）记忆与长期记忆的区别、如何选择一个稳定身份作为 Hindsight 记忆库的标识、如何隔离不同用户，以及如何处理多智能体设置。做决定时，可以同时参考 [AgentCore 集成文档](/sdks/integrations/agentcore)和[文档首页](/)。

<!-- truncate -->

> **快速解答**
>
> 1. 绝不要用 `runtimeSessionId` 标识 Hindsight 记忆库，因为它本来就是临时的。
> 2. 使用稳定身份作为标识：经过验证的用户 ID，通常再加上租户和智能体名称。
> 3. 会话范围内的状态留在 AgentCore；持久记忆放在 Hindsight。
> 4. 将用户 ID 纳入记忆库标识来隔离用户，确保不同用户不会共用一个记忆库。
> 5. 为每个智能体角色使用独立的记忆库后缀，使多智能体记忆保持连贯。

## 为什么 AgentCore 智能体会在会话之间遗忘 {#why-agentcore-agents-forget-between-sessions}

AgentCore Runtime 会话明确设计为临时会话。会话空闲时会终止，下一次调用会获得全新的环境。这是有意为之：运行时因此保持无状态且可随时销毁。但这也意味着，存放在“会话中”的任何内容到了下一个会话都会消失。

问题在于，`runtimeSessionId` 看起来像一个方便的记忆键：它在单个会话中保持稳定，而且就在事件负载里。如果用它限定记忆库的范围，单次对话里一切正常；会话轮换时，记忆却会悄然重置。结果就是堆积起一批只属于单个会话、无人再用的记忆库，智能体每次都要向同一个用户重新自我介绍。

解决办法是把持久记忆彻底移出会话，并用一个在会话轮换后仍然有效的身份来标识它。

## 会话记忆与长期记忆 {#session-memory-vs-long-term-memory}

这两类记忆承担不同的任务，把它们混为一谈正是遗忘问题的根源。

- **会话（短期）记忆**是当前对话的工作上下文：持续进行的对话、临时状态、尚未完成的任务。AgentCore Runtime 已经会在会话内处理这些内容。会话结束后它们消失是可以接受的。
- **长期记忆**保存需要持续保留的内容：用户偏好、过往决策、账户详情和习得的模式。这些内容由 Hindsight 存储，不能绑定到会话生命周期。

由此得出的设计规则是：让 AgentCore 管理会话状态，让 Hindsight 管理所有需要持久保留的内容。适配器会在轮次开始时召回长期记忆并用它补充提示，然后在轮次结束后存入新的持久事实。因此，每个新会话一开始就能了解此前会话学到的内容。

## 选择稳定的记忆库身份 {#choose-a-stable-bank-identity}

记忆库 ID 划定了持久化边界。选择一个对同一用户而言能在不同会话间保持一致、且值得信任的身份。

适配器使用的默认记忆库格式是：

```
tenant:{tenant_id}:user:{user_id}:agent:{agent_name}
```

这是一个不错的默认格式，因为它编码了通常关心的三个维度：客户属于哪个租户、具体是哪位用户，以及当前由哪个智能体提供服务（智能体名称）。这三个值在不同会话间都不会改变，因此记忆库标识能够保持稳定。

身份的来源与格式同样重要。建议按以下顺序选择：

1. 从 AgentCore JWT/OAuth 上下文取得经过验证的用户 ID（例如 `jwt_claims["sub"]`）。
2. 使用 `X-Amzn-Bedrock-AgentCore-Runtime-User-Id` 请求头。
3. 使用应用提供的用户 ID，但仅限可信的服务端部署。

关键规则是：绝不要使用未经验证的客户端 ID。不可信的 ID 会让一个调用方读取另一个用户的记忆。如果缺少身份，安全的做法是拒绝继续处理，而不是回退到共享记忆库；适配器的自定义解析器路径正是出于这个原因抛出 `BankResolutionError`。

## 将 AgentCore 连接到 Hindsight {#connect-agentcore-to-hindsight}

安装以及 `configure(...)` 的具体配置方式和 `HindsightRuntimeAdapter` 的接入方式，已在设置指南中完整介绍。本指南讨论策略，因此不再重复这些步骤；请参阅[使用 Hindsight 为 AgentCore Runtime 添加记忆](/guides/2026/05/04/guide-agentcore-memory-with-hindsight)，了解如何安装 `hindsight-agentcore`、将其指向 Hindsight Cloud 或自托管端点，以及如何把“召回 → 执行 → 存入”循环接入处理函数。之后再回到本指南决定记忆库的范围。

## 多智能体与按用户隔离 {#multi-agent-and-per-user-isolation}

设置不再那么简单时，会遇到两个隔离问题。

**按用户隔离。**用户 ID 是记忆库 ID 的一部分，因此不同用户绝不会共用同一个记忆库。隔离强度取决于你信任的身份；这也是用户 ID 必须来自经过验证的身份认证、而不能来自客户端的原因。只要正确处理这一点，跨用户的数据泄漏在结构上就不可能发生：不同用户会解析到不同的记忆库。

**多个智能体。**如果同一账户由多个智能体角色提供服务，需要有意识地决定它们是否共享记忆：

- 如果每个智能体都应拥有连贯且独立的记忆，就为每个角色保留不同的 `agent:{agent_name}` 后缀。支持智能体和销售智能体通常不应混淆彼此的上下文。
- 只有在这些角色确实需要汇总它们对同一用户的了解时，才改用共享后缀。

如果默认的 `tenant:user:agent` 格式不符合你的拓扑结构，可以用自定义 `bank_resolver` 覆盖它，例如 `f"acme:{context.user_id}:{context.agent_name}"`。无论选择什么格式，只要身份缺失，解析器就应拒绝继续处理，而不是悄悄返回共享记忆库。

## 验证记忆能否跨会话保留 {#verify-that-memory-persists-across-sessions}

这套策略的目标就是让记忆经受住会话轮换，因此要按下面的步骤准确测试：

1. 为一个测试用户运行一个轮次，并存入一项偏好或账户详情。
2. 等待该 Runtime 会话结束（或启动一个确实全新的会话），确保没有重复使用会话状态。
3. 为*同一用户*启动新会话，并询问刚才存入的详情。
4. 确认适配器在智能体回答前已召回这项记忆。
5. 换另一个用户重复测试，确认其无法看到第一位用户的记忆。

如果第二次运行能回答出第一次提供的详情，说明记忆库身份是稳定的。如果不能，记忆库很可能使用了临时身份作为标识；启用 `verbose` 日志，对比两个会话解析出的记忆库 ID。

## 常见错误 {#common-mistakes}

### 用 runtimeSessionId 标识记忆库 {#keying-the-bank-to-runtimesessionid}

本指南要防止的正是这个错误。会话 ID 是临时的，因此以它为范围的记忆库会随会话一起消失，记忆也就无法积累。

### 信任客户端提供的用户 ID {#trusting-a-client-supplied-user-id}

如果身份未经验证，调用方就可以指向其他用户的记忆库。始终从经过验证的身份认证中取得用户 ID，例如 JWT 声明或可信的 Runtime 请求头。

### 混淆会话状态与长期记忆 {#confusing-session-state-with-long-term-memory}

不要试图让 AgentCore 会话保存长期记忆，也不要把临时草稿状态放进 Hindsight。会话状态留在 AgentCore；持久事实存入 Hindsight。

### 意外将多个智能体合并到一个记忆库 {#blurring-multiple-agents-into-one-bank-by-accident}

如果不同角色意外共用记忆库后缀，它们的上下文就会相互混杂。除非明确希望它们共享记忆，否则要为每个角色设置自己的 `agent_name`。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以工作；将 `hindsight_api_url` 指向自己的端点即可（对于 AWS，可以在 VPC 内通过 ECS/EKS 部署，并使用带 pgvector 的 RDS PostgreSQL）。Cloud 只是最快的入门方式。

### 为什么不直接用 runtimeSessionId 作为记忆库 ID？ {#why-not-just-use-runtimesessionid-as-the-bank-id}

因为 AgentCore Runtime 会话本来就是临时的。绑定到该 ID 的记忆库会在每次会话轮换时重置，这正是造成遗忘的问题，不能解决它。

### 每个智能体都应该使用自己的记忆库吗？ {#should-every-agent-get-its-own-bank}

如果每个角色都需要连贯且独立的记忆，是的，应为其保留不同的 `agent_name` 后缀。只有在不同角色需要汇总对同一用户的记忆时，才共享后缀。

### 如何保证按用户隔离？ {#how-is-per-user-isolation-guaranteed}

用户 ID 是记忆库 ID 的一部分，因此不同用户会解析到不同的记忆库。只要用户 ID 来自经过验证的身份认证，而不是客户端，这项保证就成立。

## 后续步骤 {#next-steps}

- 按照 [AgentCore 设置指南](/guides/2026/05/04/guide-agentcore-memory-with-hindsight)完成安装和接线
- 如果需要托管的记忆后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io)开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)开始使用
- 查阅 [Hindsight Recall API](/developer/api/recall)
- 查阅 [Hindsight Retain API](/developer/api/retain)
- 阅读 [AgentCore 集成文档](/sdks/integrations/agentcore)
