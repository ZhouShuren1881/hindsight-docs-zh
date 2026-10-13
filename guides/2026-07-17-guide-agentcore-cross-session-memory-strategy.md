---
title: "指南：Bedrock AgentCore 跨会话记忆策略"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agentcore, bank-strategy, memory]
description: "为 Bedrock AgentCore 选择稳定用户或智能体身份作为记忆库范围，让记忆超越临时 runtimeSessionId。"
image: /img/guides/guide-agentcore-cross-session-memory-strategy.svg
hide_table_of_contents: true
---

![指南：Bedrock AgentCore 跨会话记忆策略](/img/guides/guide-agentcore-cross-session-memory-strategy.svg)

为 Amazon Bedrock AgentCore 提供**跨会话记忆**，最重要不是安装什么库，而是记忆关联何种身份。Runtime 会话短暂，空闲时终止，再创建新环境。绑定 `runtimeSessionId` 的记忆随更替消失，因此演示良好却生产健忘。

这是策略指南，不是安装教程。适配器已提供召回 → 执行 → 存储循环，但不能替你决定“用户”代表个人、租户、角色或组合。选择决定持久或碎片化。

以下介绍短长期取舍、稳定身份、用户隔离和多智能体。参考 [AgentCore 集成文档](/sdks/integrations/agentcore)和[文档首页](/)。

<!-- truncate -->

> **快速解答**
>
> 1. 永不以临时 `runtimeSessionId` 作库键。
> 2. 使用验证用户 ID，通常加租户和智能体名。
> 3. 会话状态留 AgentCore，持久记忆放 Hindsight。
> 4. ID 包含用户，确保不共库。
> 5. 各角色独立后缀，保持一致。

## 为什么会话间遗忘 {#why-agentcore-agents-forget-between-sessions}

Runtime 明确临时，空闲结束、下一调用全新环境，使其无状态可替换，但会话内信息下一次消失。

`runtimeSessionId` 看似方便，会话内稳定且事件中已有。关联它后单对话正常，更替后静默重置，留下孤立单会话库，每次重新介绍。

修复是将持久记忆移出会话，关联更长寿命身份。

## 会话记忆与长期记忆 {#session-memory-vs-long-term-memory}

两者任务不同，混淆是根因。

- **会话短期记忆**是当前对话、草稿状态和进行中任务。AgentCore 已处理，结束时消失可以接受。
- **长期记忆**是应保留的偏好、决策、账户细节和模式，由 Hindsight 存储，不可绑定会话生命周期。

让 AgentCore 管会话，Hindsight 管持久内容。轮次开始召回，之后存新事实，让每个新会话知道此前所学。

## 选择稳定记忆库身份 {#choose-a-stable-bank-identity}

库 ID 是持久边界，同用户跨会话一致且可信。

默认格式：

```
tenant:{tenant_id}:user:{user_id}:agent:{agent_name}
```

包含通常关注的租户、用户和智能体三轴，都不随会话变，因而稳定。

身份来源同样重要，优先顺序：

1. JWT/OAuth 上下文验证用户 ID，如 `jwt_claims["sub"]`。
2. `X-Amzn-Bedrock-AgentCore-Runtime-User-Id` 头。
3. 应用提供 ID，仅可信服务端部署。

绝不使用未经验证客户端 ID，否则可读取他人记忆。缺失时应拒绝而非共享回退，自定义解析路径因此抛 `BankResolutionError`。

## 连接 AgentCore 与 Hindsight {#connect-agentcore-to-hindsight}

安装、`configure(...)` 和适配器接入见[使用 Hindsight 添加 AgentCore Runtime 记忆](https://hindsight.vectorize.io/guides/2026/05/04/guide-agentcore-memory-with-hindsight)。按指南安装、连接 Cloud 或自托管，接入循环后回来决定范围。

## 多智能体与按用户隔离 {#multi-agent-and-per-user-isolation}

非简单配置会遇到两问题。

**按用户隔离。**用户 ID 在库 ID 中，不同用户不共库。保证依赖可信验证身份，而非客户端。正确身份映射不同库，结构上防止泄漏。

**多个智能体。**同账户多角色时，有意识决定共享：

- 各角色需独立时，`agent:{agent_name}` 后缀不同。支持与销售通常不应混合。
- 只有角色明确应合并用户知识时，才共享后缀。

默认 `tenant:user:agent` 不适合时用 `bank_resolver`，如 `f"acme:{context.user_id}:{context.agent_name}"`。无论格式，缺身份应拒绝，而非静默共享。

## 验证跨会话持久 {#verify-that-memory-persists-across-sessions}

目标就是更替后保留，测试：

1. 为测试用户存偏好或账户细节。
2. 结束或开始真正新 Runtime 会话，避免重用状态。
3. *同一用户*新会话询问。
4. 确认回答前召回。
5. 第二用户确认看不到第一记忆。

第二次能回答说明稳定，否则很可能键临时，启用 `verbose` 比较 ID。

## 常见错误 {#common-mistakes}

### 用 runtimeSessionId 关联记忆库 {#keying-the-bank-to-runtimesessionid}

临时 ID 让库随会话消失，记忆无法积累。

### 信任客户端用户 ID {#trusting-a-client-supplied-user-id}

未验证可指向他人库，应来自 JWT 或可信头。

### 混淆会话状态与长期记忆 {#confusing-session-state-with-long-term-memory}

临时草稿不放 Hindsight，会话不承担长期，持久事实放后端。

### 意外多角色共库 {#blurring-multiple-agents-into-one-bank-by-accident}

不经意共后缀会混合，各角色独立 `agent_name`，明确共享除外。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管可指 VPC 内 ECS/EKS、RDS PostgreSQL 加 pgvector，Cloud 只是最快。

### 为何不用 runtimeSessionId？ {#why-not-just-use-runtimesessionid-as-the-bank-id}

每次更替重置，正是问题而非解决。

### 每个智能体都独立吗？ {#should-every-agent-get-its-own-bank}

角色需要一致独立记忆时是，明确合并同用户知识才共享。

### 如何保证按用户隔离？ {#how-is-per-user-isolation-guaranteed}

用户 ID 是库 ID 一部分，不同用户不同库，前提是身份来自验证认证。

## 后续步骤 {#next-steps}

- 按 [AgentCore 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-agentcore-memory-with-hindsight)安装接入。
- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [AgentCore 集成文档](/sdks/integrations/agentcore)。
