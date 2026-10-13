---
title: "指南：团队记忆与OpenCode — 工程会议的共享记忆库"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, opencode, multi-agent, memory]
description: "让整个工程团队与 Hindsight 共享 OpenCode 记忆库，因此每个开发人员的会议都借鉴相同的约定、已知错误和过去的决策。"
image: /img/guides/guide-opencode-team-shared-memory.svg
hide_table_of_contents: true
---

![指南：OpenCode 团队记忆，用共享记忆库保存工程约定](/img/guides/guide-opencode-team-shared-memory.svg)

如果你跑OpenCode在整个工程团队中，影响力最高的举措是 **团队记忆**：单个共享Hindsight每个开发者的记忆库OpenCode会话读取和写入。整个团队不会从每个人的设置中重新学习相同的约定、已知错误和过去的决策，而是从一个机构记忆中汲取灵感。

大多数OpenCode-with-Hindsight设置默认为每个项目或每个开发人员记忆，这是独立工作的正确选择。但是，一位开发人员学到的编码约定、上个月某人击中的一支枪，或者过去的架构决策之所以如此的原因，都是 *团队* 应该记住的事情，而不仅仅是在场的人。共享的记忆库将那些一次性的发现转化为每个人都能看到的记忆召回。

本指南是关于策略，而不是安装。它涵盖了何时共享记忆库与隔离记忆库、静态和动态记忆库 ID 如何为团队服务，以及如何随着记忆库的增长保持记忆召回干净。插件设置本身已经涵盖 - 请参阅 [使用 Hindsight 为 OpenCode 添加记忆](https://hindsight.vectorize.io/guides/2026/04/16/guide-opencode-memory-with-hindsight) - 所以在这里我们重点关注团队记忆决策。

<!-- truncate -->

> **快速解答**
>
> ​​1。决定共享团队记忆中的内容：约定、已知错误、过去的决定。
> 2.将每个人的 OpenCode 插件指向同一个 Hindsight 后端。
> 3.设置静态`HINDSIGHT_BANK_ID`（例如`acme-platform-team`）因此所有会话共享一个记忆库。
> 4.相反，将真正私有或每个存储库的工作保存在单独的记忆库中。
> 5.验证一个开发人员存储的约定是否显示在另一开发人员的会话中。

## 为什么团队需要共享编码记忆 {#why-a-team-needs-shared-coding-memory}

在团队中，相同的知识会被一遍又一遍地重新发现。一位开发人员了解到必须在 API 之前部署支付服务，另一位开发人员花了一个下午重新发现它。有人记录了为什么重试逻辑使用指数退避，六周后，一位新员工建议将其取消。

每个开发人员的记忆并不能解决这个问题，因为每个人的OpenCode只记住他们自己的会话。共享团队记忆是这样的：当支付部署顺序被保留一次时，每个队友的OpenCode都会在下一个相关会话中回忆起它。价值与团队规模成正比——团队越大，重新学习共享记忆库消除的冗余就越多。

团队的优秀候选人记忆库：

- **约定** — 仓库更喜欢 pnpm，严格TypeScript，常规提交。
- **已知缺陷与易错点** —“临时数据库每晚重置”，“不调用账单API循环。”
- **此前决策** — 为什么选择或拒绝一个库，为什么服务边界位于它所在的位置。

## 共享团队记忆库与每个开发人员记忆库 {#a-shared-team-bank-vs-per-developer-banks}

该插件可让您选择记忆的落地位置。两种常见的形状：

- **一个团队共享记忆库。** 大家的OpenCode指向同一个记忆库ID。每一次会议都会贡献并读取共享的机构记忆。最适合应该成为常识的惯例和决策。
- **按开发者或项目划分记忆库。** 每个开发人员（或每个存储库）都有一个独立的记忆库。最适合私人临时工作、实验，或者两个项目永远不应该看到彼此的上下文时。

这些在整个公司中并不相互排斥 - 您可以为团队的核心平台存储库运行共享记忆库，并为不相关的副项目运行独立的记忆库。对于任何给定的工作流要问的问题很简单：*其他老年人的T0应该记忆这个吗？*如果是，则属于共享记忆库。

**何时应隔离而非共享：**

- 这项工作是探索性的，您不希望队友看到不成熟的发现。
- 两个项目不相关，共享记忆只会增加噪音。
- 内容属于敏感内容，不应在团队会议中传播。

## 团队的静态记忆库 ID 与动态记忆库 ID {#static-vs-dynamic-bank-ids-for-teams}

该插件从其记忆库-ID 配置中解析要使用的记忆库，这是在团队范围内或每个上下文中创建记忆库的杠杆。完整的机制在 [配置指南](https://hindsight.vectorize.io/guides/2026/04/16/guide-opencode-memory-with-hindsight) 和 [集成文档](/sdks/integrations/opencode)；以下是每个人如何映射到团队记忆。

### 静态记忆库ID — 团队默认 {#static-bank-id--the-team-default}

静态记忆库 ID 是为团队提供共享记忆的最简单方法。每个开发人员都设置相同的值，因此他们所有的OpenCode会话都会读取和写入相同的记忆库：

```bash
export HINDSIGHT_BANK_ID="acme-platform-team"
```

因为优先顺序是`defaults < ~/.hindsight/opencode.json < plugin options < env vars`，可以在签到时标准化团队记忆库`opencode.json` 或共享 `~/.hindsight/opencode.json`，并且仍然让个人在需要时使用环境变量覆盖它。

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

### 动态记忆库 ID — 团队加上每个项目的隔离 {#dynamic-bank-ids--team-plus-per-project-isolation}

当一个团队跨多个存储库工作并且您想要隔离时*内*团队，启用动态记忆库 ID。该插件从粒度字段组成记忆库（默认`agent::project`，与 `agent`，`project`，`channel`，和`user`可用）：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

与`agent::project`，每个项目都会自动获得自己的记忆库，而共享的智能体名称在整个团队中保持命名一致——同一存储库上的每个开发人员都位于同一个记忆库中，无需手动编辑配置。如果您需要在共享设置中进行每个用户的分离（例如为多人提供服务的共享智能体），则 `channel` 和 `user` 字段涵盖：

```bash
export HINDSIGHT_CHANNEL_ID="acme-platform"
export HINDSIGHT_USER_ID="user123"
```

经验法则：**静态** 当整个团队应该共享一个记忆库时； **动态** 当团队跨越多个项目并且您希望每个项目的自动记忆库具有一致的命名时。

## 连接OpenCode至Hindsight {#connect-opencode-to-hindsight}

本指南假设Hindsight插件已安装并指向您的后端。如果不是，请首先遵循标准设置 - 添加 `@vectorize-io/opencode-hindsight` 给你的OpenCode配置，将其指向本地服务器或Hindsight Cloud，并启用自动记忆召回和自动记忆存储：

- [使用 Hindsight 为 OpenCode 添加记忆](https://hindsight.vectorize.io/guides/2026/04/16/guide-opencode-memory-with-hindsight)

一旦生效，唯一特定于团队的更改就是上面的记忆库-ID 策略。

## 大规模保持团队记忆清洁 {#keeping-team-recall-clean-at-scale}

共享记忆库比个人记忆库更有价值，但它也收集了更多内容，因此记忆召回卫生更重要。一些做法可以让团队记忆库保持敏锐：

- **标记存储记忆并筛选召回。** 该插件支持`retainTags` 和 `recallTags`（与`recallTagsMatch`模式`any`，`all`，`any_strict`，`all_strict`）。按区域标记 — `payments`，`infra`，`frontend` — 因此前端会话可能会偏向前端记忆而不是整个团队的历史。
- **调整召回预算。**`recallBudget` (`low`，`mid`，`high`) 控制引入多少上下文。从 开始 `mid`；更大的团队记忆库可能值得`low` 用于重点课程和 `high` 仅当广泛的背景确实有帮助时。
- **控制存储频率。**`retainEveryNTurns` 限制自动记忆存储，因此记忆库可以捕获有意义的状态，而无需将每个微转动保存为单独的噪声。
- **排除探索性临时工作。** 将半成品或实验会话路由到隔离的记忆库，以便共享的记忆库保持权威。

## 验证共享记忆是否有效 {#verify-that-shared-memory-is-working}

当一个开发人员的会话出现在另一个开发人员的会话中时，团队记忆就发挥作用了。跨两台机器或两个帐户进行测试：

1. 开发者A运行OpenCode与共享`HINDSIGHT_BANK_ID` 并存储约定（例如“在API”）。
2. 让会话空闲，以便自动记忆存储将其写入共享记忆库。
3. 开发者B运行OpenCode指向同一个记忆库。
4. 开发人员 B 询问部署顺序。
5. 记忆召回应该显示开发人员 A 存储的约定 - 即使 B 从未直接学习过它。

如果 B 的会话回忆起 A 的约定，则共享记忆库处于活动状态。您还可以通过询问来明确确认OpenCode使用`hindsight_recall`反对共享记忆库。

## 常见错误 {#common-mistakes}

### 在不相关的项目中共享一个记忆库 {#sharing-one-bank-across-unrelated-projects}

共享记忆库是为了团队的共同知识，而不是为了合并不相关的存储库。如果两个项目永远不应该看到彼此的上下文，请为它们提供单独的记忆库（每个项目静态，或使用 动态） `project` 粒度）。

### 团队未统一记忆库 ID {#not-aligning-bank-ids-across-the-team}

只有每个人都下定决心，团队记忆才会发挥作用*同上*记忆库。一个人的错别字 `HINDSIGHT_BANK_ID`默默地将它们分割到私人记忆库中。标准化共享配置中的值。

### 让探索性工作污染共享记忆库 {#letting-exploratory-work-pollute-the-shared-bank}

半完成的实验保留在团队记忆库表面，作为每个人的嘈杂记忆召回。在独立的记忆库上保留临时工作。

### 在会话空闲之前测试记忆存储 {#testing-retain-before-the-session-idles}

自动记忆存储火力全开`session.idle`。如果您在第一个开发人员会话空闲之前检查共享记忆库，则该记忆可能尚未存储。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作——只需将每个队友的插件指向同一个`HINDSIGHT_API_URL`。云只是使分布式团队可以轻松访问单个共享后端。

### 我如何确保整个团队写入同一个记忆库？ {#how-do-i-make-sure-the-whole-team-writes-to-the-same-bank}

使用静态`HINDSIGHT_BANK_ID` 在共享配置中设置，或具有一致的智能体名称的动态记忆库 ID，因此每个项目的记忆库对每个人来说都是相同的名称。

### 我们可以分享一些记忆，但隔离其他工作吗？ {#can-we-share-some-memory-but-isolate-other-work}

是的。为共同的约定和决策运行共享的记忆库，为私人或不相关的工作运行单独的记忆库。记忆库-ID策略决定了每个会话的记忆落地的位置。

### 随着团队的成长，共享的记忆库不会变得嘈杂吗？ {#wont-a-shared-bank-get-noisy-as-the-team-grows}

​​可以，这就是记忆卫生很重要的原因。使用标签、适当的记忆召回预算和记忆存储节流，并将探索性工作排除在共享记忆库之外。

## 后续步骤 {#next-steps}

- 按照中的插件设置进行操作 [使用 Hindsight 为 OpenCode 添加记忆](https://hindsight.vectorize.io/guides/2026/04/16/guide-opencode-memory-with-hindsight)
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要为团队提供托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[OpenCode 集成文档](/sdks/integrations/opencode)
