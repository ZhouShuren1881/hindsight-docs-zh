---
title: "指南：使用 OpenCode 构建团队共享记忆——工程约定共用记忆库"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, opencode, multi-agent, memory]
description: "借助 Hindsight 为整个工程团队提供一个共享的 OpenCode 记忆库，让每位开发者的会话都能利用同一套约定、已知缺陷和过往决策。"
image: /img/guides/guide-opencode-team-shared-memory.svg
hide_table_of_contents: true
---

![指南：使用 OpenCode 构建团队共享记忆——工程约定共用记忆库](/img/guides/guide-opencode-team-shared-memory.svg)

如果你在整个工程团队中使用 OpenCode，最能发挥作用的一项改进就是**团队记忆**：建立一个共享的 Hindsight 记忆库，供每位开发者的 OpenCode 会话读取和写入。这样，整个团队就能从同一份组织记忆中获取信息，无须每个人各自反复学习相同的约定、已知缺陷和过往决策。

大多数 OpenCode 与 Hindsight 的配置默认采用按项目或按开发者划分的记忆库，这适合彼此隔离的工作。不过，一位开发者学到的编码约定、某人上个月踩过的坑，或过去某项架构决策背后的原因，都应该由*团队*共同记住，而不只留在当事人的记忆中。共享记忆库能把这些一次性的发现转化为每个人都能召回的信息。

本指南讨论的是策略，而不是安装过程。内容涵盖何时共享记忆库、何时隔离记忆库，静态和动态记忆库 ID 如何服务团队，以及记忆库逐渐扩充时如何保持召回内容整洁。插件本身的配置已在[使用 Hindsight 为 OpenCode 添加记忆](/guides/2026/04/16/guide-opencode-memory-with-hindsight)中介绍；这里聚焦在此基础上的团队记忆决策。

<!-- truncate -->

> **快速解答**
>
> 1. 确定哪些内容应纳入团队共享记忆：约定、已知缺陷和过往决策。
> 2. 将每个人的 OpenCode 插件指向同一个 Hindsight 后端。
> 3. 设置静态 `HINDSIGHT_BANK_ID`（例如 `acme-platform-team`），让所有会话共用一个记忆库。
> 4. 将真正私密或按仓库隔离的工作放在单独的记忆库中。
> 5. 验证一位开发者存入的约定能否出现在另一位开发者的会话中。

## 为什么团队需要共享编码记忆 {#why-a-team-needs-shared-coding-memory}

在团队中，同样的知识会被一再发现。一位开发者了解到支付服务必须先于 API 部署，另一位开发者却花了一个下午才重新发现这一点。有人记录了重试逻辑为何使用指数退避；六周后，新员工又提议删掉这套逻辑。

按开发者划分的记忆库无法解决这个问题，因为每个人的 OpenCode 只记得自己的会话。团队共享记忆则可以：支付服务的部署顺序只要存入一次，每位队友的 OpenCode 就会在下次相关会话中召回它。团队越大，共享记忆库消除的重复学习就越多，因此它带来的价值也会随团队规模增长。

适合纳入团队记忆库的内容包括：

- **约定**——仓库偏好使用 pnpm、严格模式的 TypeScript 和 Conventional Commits。
- **已知缺陷和易踩的坑**——“预发布环境的数据库每晚都会重置”“不要在循环中调用账单 API”。
- **过往决策**——为何选择或拒绝某个库，服务边界为何划在当前位置。

## 团队共享记忆库与按开发者划分的记忆库 {#a-shared-team-bank-vs-per-developer-banks}

插件允许你选择记忆写入哪个记忆库。常见的两种方式是：

- **一个团队共享记忆库。** 每个人的 OpenCode 都指向同一个记忆库 ID。每次会话都会为共享的组织记忆贡献内容，也会从中读取信息。适合存放应成为团队共识的约定和决策。
- **按开发者或项目划分记忆库。** 每位开发者（或每个仓库）各自使用独立的记忆库。适合私人的临时工作、实验，或两个项目绝不应互相读取上下文的情况。

在公司范围内，这两种方式并不互斥——你可以为团队的核心平台仓库使用共享记忆库，同时为无关的副项目使用独立记忆库。面对任何一项具体工作，只需问：*其他队友的 OpenCode 应该召回这条信息吗？*如果应该，就把它存入共享记忆库。

**适合隔离而不共享的情况：**

- 工作仍在探索阶段，你不希望尚不成熟的发现出现在队友的会话中。
- 两个项目彼此无关，共享召回只会引入噪声。
- 内容涉及敏感信息，不应传播到团队成员的会话中。

## 团队使用静态还是动态记忆库 ID {#static-vs-dynamic-bank-ids-for-teams}

插件根据记忆库 ID 配置确定要使用哪个记忆库；这个配置决定记忆库适用于整个团队，还是仅适用于特定上下文。完整机制见[设置指南](/guides/2026/04/16/guide-opencode-memory-with-hindsight)和[集成文档](/sdks/integrations/opencode)。下面说明两种方式如何用于团队记忆。

### 静态记忆库 ID——团队默认方案 {#static-bank-id--the-team-default}

静态记忆库 ID 是为团队提供一个共享记忆库的最简单方式。每位开发者设置相同的值，这样他们所有的 OpenCode 会话都会读取和写入同一个记忆库：

```bash
export HINDSIGHT_BANK_ID="acme-platform-team"
```

由于优先级顺序为 `defaults < ~/.hindsight/opencode.json < plugin options < env vars`，你可以把团队记忆库设置写入已提交到仓库的 `opencode.json`，或写入共享的 `~/.hindsight/opencode.json`，同时仍允许个人在需要时通过环境变量覆盖它。

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "bankId": "acme-platform-team",
      "autoRecall": true,
      "autoRetain": true
    }]
  ]
}
```

### 动态记忆库 ID——团队共享名称并按项目隔离 {#dynamic-bank-ids--team-plus-per-project-isolation}

当团队跨多个仓库协作，又希望在*团队内部*按项目隔离时，可以启用动态记忆库 ID。插件会根据粒度字段组合出记忆库 ID（默认组合为 `agent::project`；也可以使用 `agent`、`project`、`channel` 和 `user`）：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

使用 `agent::project` 时，每个项目都会自动拥有自己的记忆库；共享的智能体名称则能让团队内的命名保持一致。同一仓库上的每位开发者都会进入同一个记忆库，无须手动编辑配置。如果你需要在共享配置中按用户隔离（例如，一个共享智能体服务多位用户），可以使用 `channel` 和 `user` 字段：

```bash
export HINDSIGHT_CHANNEL_ID="acme-platform"
export HINDSIGHT_USER_ID="user123"
```

经验法则：整个团队应该共用一个记忆库时，使用**静态** ID；团队跨多个项目，且希望自动为每个项目创建命名一致的记忆库时，使用**动态** ID。

## 将 OpenCode 连接到 Hindsight {#connect-opencode-to-hindsight}

本指南假设 Hindsight 插件已经安装并指向你的后端。如果还没有，请先完成标准设置：将 `@vectorize-io/opencode-hindsight` 添加到 OpenCode 配置中，将其指向本地服务器或 Hindsight Cloud，并启用自动召回和自动存入：

- [使用 Hindsight 为 OpenCode 添加记忆](/guides/2026/04/16/guide-opencode-memory-with-hindsight)

完成后，唯一与团队有关的改动就是前面介绍的记忆库 ID 策略。

## 团队规模扩大后如何保持召回内容整洁 {#keeping-team-recall-clean-at-scale}

共享记忆库比个人记忆库更有价值，但它收集的内容也更多，因此需要更注意召回内容的管理。以下做法有助于让团队记忆库保持精简、实用：

- **为存入的记忆添加标签，并按标签筛选召回。** 插件支持 `retainTags` 和 `recallTags`，以及 `recallTagsMatch` 模式 `any`、`all`、`any_strict`、`all_strict`。按领域添加标签，例如 `payments`、`infra`、`frontend`，这样前端会话就能优先召回前端相关记忆，而不是团队的全部历史。
- **调整召回预算。** `recallBudget`（`low`、`mid`、`high`）控制引入多少上下文。可以先从 `mid` 开始；团队记忆库更大时，重点明确的会话可能适合用 `low`，只有在广泛上下文确实有帮助时才用 `high`。
- **控制存入频率。** `retainEveryNTurns` 会限制自动存入的频率，让记忆库记录有意义的状态，而不把每个细小的对话轮次都作为独立噪声保存下来。
- **不要把探索性工作写入共享库。** 将尚未成熟或实验性的会话导向独立记忆库，让共享记忆库继续作为团队的可靠依据。

## 验证共享记忆是否正常工作 {#verify-that-shared-memory-is-working}

如果一位开发者的会话能在另一位开发者的会话中体现出来，团队记忆就开始发挥作用了。可以用两台机器或两个账户进行测试：

1. 开发者 A 在 OpenCode 中使用共享的 `HINDSIGHT_BANK_ID`，并存入一条约定（例如 "deploy payments before the API"）。
2. 让会话保持空闲，等待自动存入功能将这条信息写入共享记忆库。
3. 开发者 B 运行 OpenCode，并将其指向同一个记忆库。
4. 开发者 B 询问部署顺序。
5. 召回应显示开发者 A 存入的约定，即使 B 从未亲自了解过它。

如果 B 的会话召回了 A 存入的约定，就说明共享记忆库已正常工作。你也可以明确要求 OpenCode 使用 `hindsight_recall` 从共享记忆库中召回信息，以进一步确认。

## 常见错误 {#common-mistakes}

### 在无关项目之间共用一个记忆库 {#sharing-one-bank-across-unrelated-projects}

共享记忆库用于保存团队共同的知识，而不是合并无关仓库的内容。如果两个项目不应互相读取上下文，就为它们使用不同的记忆库（按项目设置静态 ID，或使用 `project` 粒度的动态 ID）。

### 团队成员的记忆库 ID 不一致 {#not-aligning-bank-ids-across-the-team}

只有每个人都指向*同一个*记忆库，团队记忆才能发挥作用。某位成员把 `HINDSIGHT_BANK_ID` 拼错后，系统可能会悄悄把他导向一个私人记忆库。请在共享配置中统一该值。

### 让探索性工作污染共享记忆库 {#letting-exploratory-work-pollute-the-shared-bank}

存入团队记忆库的未完成实验会成为噪声，影响每个人的召回结果。请把临时工作留在独立的记忆库中。

### 在会话空闲前测试存入功能 {#testing-retain-before-the-session-idles}

自动存入会在 `session.idle` 事件触发。如果第一位开发者的会话还没有进入空闲状态，你就检查共享记忆库，那么相关记忆可能尚未存入。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器同样可用；只需让每位队友的插件都指向同一个 `HINDSIGHT_API_URL`。对于分布式团队，Cloud 只是让大家更容易访问同一个共享后端。

### 如何确保整个团队都写入同一个记忆库？ {#how-do-i-make-sure-the-whole-team-writes-to-the-same-bank}

可以在共享配置中设置静态 `HINDSIGHT_BANK_ID`，也可以使用动态记忆库 ID，并统一智能体名称，这样每个人都会以相同的名称创建各项目记忆库。

### 我们能否共享部分记忆，同时隔离其他工作？ {#can-we-share-some-memory-but-isolate-other-work}

可以。为共同约定和决策使用共享记忆库，为私密或无关工作使用独立记忆库。记忆库 ID 策略决定了每次会话的记忆写入哪个库。

### 团队扩大后，共享记忆库会不会变得嘈杂？ {#wont-a-shared-bank-get-noisy-as-the-team-grows}

有可能，所以需要管理好召回内容。使用标签、合适的召回预算和存入频率限制，并把探索性工作留在共享记忆库之外。

## 后续步骤 {#next-steps}

- 按照[使用 Hindsight 为 OpenCode 添加记忆](/guides/2026/04/16/guide-opencode-memory-with-hindsight)中的说明配置插件。
- 如果想为团队使用托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 阅读[快速入门指南](/developer/api/quickstart)。
- 查阅 [Hindsight 的召回 API](/developer/api/recall)。
- 查阅 [Hindsight 的存入 API](/developer/api/retain)。
- 阅读 [OpenCode 集成文档](/sdks/integrations/opencode)。
