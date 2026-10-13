---
title: "一个记忆库，两类读者，两份使命"
authors: [benfrank241]
slug: "2026/09/30/per-scope-consolidation-strategies"
date: 2026-09-30T14:00
tags: [hindsight, agent-memory, consolidation, observations, multi-tenant, privacy, deep-dive]
description: "Hindsight 0.10.2 支持每个观察范围采用独立整合使命。同一事实，公司范围只记录趋势，用户范围保留细节。"
image: /img/blog/per-scope-consolidation.webp
hide_table_of_contents: true
---

![同一事实在不同范围按各自使命整合：用户保留细节，公司只保留趋势](/img/blog/per-scope-consolidation.webp)

七月的[智能体记忆结构指南](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)将核心选择描述为两难：

> 范围太宽，一个用户的记忆混入另一个；太窄，智能体需要的内容在另一个不可见记忆库中，无法访问。

Hindsight 0.10.2 缓解了这一点：保留一个库让内容可访问，同时为其中每类读者提供不同使命。

<!-- truncate -->

## 要点 {#tldr}

- **每个观察范围可按独立使命整合**，使用 `consolidation_strategies`。
- **只有四个设置**可按策略配置，其他仍属于记忆库。
- **首个匹配整体优先**，后续策略不会补齐空缺。
- **一个陷阱**：策略永远不能匹配无标签范围，文档却未说明。
- `observation_scope_limits` 仍有效，但匹配方式不同，直接迁移可能扩大范围。

## 原来哪些内容按范围配置 {#what-was-already-per-scope-and-what-wasnt}

先回顾术语。

**观察范围**是整合时分组观察的标签集合。存储时通过 `observation_scopes` 选择：`combined` 按全部标签一次整合，`per_tag` 每标签一次，`all_combinations` 每子集一次，`shared` 在无标签空范围一次整合。

标签为 `user:dana`、`team:exec`、`company:acme` 的记忆，原来就能按读者生成三组观察。

无法区分的是各读者的要求。唯一按范围设置的是 `observation_scope_limits`，将范围模式映射为观察数量上限；**使命是记忆库级**，所有范围都收到相同记录指令。

文档说明后果：

> 每个范围生成独立观察，但共享使命时，公司范围与 Dana 私有范围得到同样细节，包括姓名、交易规模和私密内容，只是更多人可见。

这不仅是配置问题，也是保密问题：隔离存在，内容克制却没有。

## 相同事实，不同使命 {#the-same-facts-two-briefs}

`consolidation_strategies` 将使命绑定到范围模式：

```json
[
  {
    "scopes": [{"tags": ["company:*"]}],
    "observations_mission": "该范围由全公司共享，仅记录总体行业趋势，不提及具体公司、个人、交易规模或融资阶段。",
    "max_observations_per_scope": 20
  },
  {
    "scopes": [{"tags": ["team:*"]}],
    "observations_mission": "记录团队需要行动的决策。"
  }
]
```

相同底层事实可得到：

> Dana 的范围保留“Acme Robotics 签订三年租约，租用 4,000 GPU 集群”，公司范围则记录“企业正在租 GPU 集群运行开放权重模型”。

不是生成后脱敏，而是公司范围从一开始就只接收概括要求。每个范围单独调用整合，各范围设置不会进入其他调用。

可按库设置 `consolidation_strategies`，全局设置 `HINDSIGHT_API_CONSOLIDATION_STRATEGIES`，或通过控制平面 Bank → Configuration → Observations 配置。

## 策略只能改变四项设置 {#exactly-four-things-a-strategy-can-change}

它不是按范围覆盖任意设置，策略只支持：

| 字段 | 作用 |
|---|---|
| `observations_mission` | 此类读者的使命 |
| `max_observations_per_scope` | 范围内最多观察数量 |
| `consolidation_source_facts_max_tokens` | 每次调用看到的证据量 |
| `consolidation_source_facts_max_tokens_per_observation` | 每条观察占用的证据预算 |

代码解释，它们只覆盖真正随读者变化的内容：使命、容量和每次证据量。其他设置仍属于记忆库。

尤其**不能**按策略改语义去重阈值，仍为记忆库级 0.97。去重只比较同范围，因此公司概括观察不会与 Dana 详细观察成为合并候选，两项功能自然组合。

## 首个匹配整体优先 {#first-match-wins-whole}

模式使用 glob，同一模式每个 glob 都必须匹配某标签；策略 `scopes` 中任一模式匹配即可。策略之间按列表顺序，第一个匹配者完全接管范围。

这条规则比看起来严格，是有意的：

> 首个策略整体生效。`["company:*"]` 与 `["company:acme"]` 都匹配时，只用前者的设置，未设置项回退记忆库级值；后者不补齐。

例如 `[{company:acme, cap 5}, {company:*, mission X}]` 为该公司提供上限 5，却使用**记忆库级**使命，不是 X。具体规则应排在通用规则前，且按完整规则理解。

早期实现曾逐字段选择，使命与上限可分别来自不同策略。

> 这会让两个策略静默混合，没人能判断范围实际用哪个；单一优胜策略则可在控制平面明确展示。

可调试性优于灵活性，对决定智能体可记住哪些个人信息的配置，通常是正确选择。

默认 `"all"` 是包含匹配，范围具有模式全部标签，允许额外标签；`"exact"` 要求精确覆盖。没有 `"any"`，因为多个模式已表示替代项，任意标签应写成每标签一个模式。

## 陷阱：无法匹配全局范围 {#the-trap-your-global-scope-cannot-be-claimed}

这是应记录却尚未记录的限制。

**策略永远不能匹配无标签范围。** 两个匹配器直接拒绝空集合，包含匹配器为：

```python
return bool(tags) and all(any(fnmatchcase(t, g) for t in tags) for g in globs)
```

开头的 `bool(tags)` 使任何模式都无法匹配全局范围，包括 `['company:*']` 和 `['*']`。文档字符串提及无标签永不匹配，测试也验证，但策略文档未说明。

这影响很大，因为 `shared` 是易变会话标签的推荐方案，让各会话一起整合。但选择后得到永久使用记忆库默认值、策略无法触及的范围，系统不提醒。

需要不同使命的兜底范围，应使用真实标签并匹配它，不依赖 `shared`。

## 从 `observation_scope_limits` 迁移 {#migrating-from-observation_scope_limits}

旧字段弃用但仍作为容量回退。优先级是获胜策略显式上限、`observation_scope_limits`、记忆库默认。

两个容易误解的后果：

只设置使命的策略不会覆盖上限，没有 `max_observations_per_scope` 时仍用旧字段，且会**跳过后续策略**。测试名为 `test_the_winners_missing_cap_falls_back_past_later_strategies`。

两字段匹配不同：旧字段仅精确覆盖，策略默认包含。原样复制会静默匹配**更多**范围，需加 `"tags_match": "exact"` 才保留行为。目前没有提示该迁移步骤。

弃用只有文字说明，没有运行时警告，日志不会催促迁移。

## 其他限制 {#other-limits-worth-knowing}

**不支持否定。** 不能表达“有公司标签但无用户标签”，模式只能正向匹配。

**Oracle 支持策略，不支持此语义去重。** 去重 SQL 仅 Postgres 可用，Oracle 无论阈值如何都跳过，因此更依赖 `max_observations_per_scope` 防止近似重复填满范围。

**验证取决于入口。** API 或控制平面禁止未知键，`"scope"` 拼成 `"scopes"` 之外的错误返回 400。环境变量宽松解析，坏条目静默丢弃，未知 `tags_match` 回退 `"all"`。环境配置后应在控制平面确认匹配范围。

**观察不记录生成它的策略。** 跨范围召回时，不同使命的观察并列，仅通过标签区分。范围端点列出数量，预览显示归属，但这是配置查询，不是结果自身信息。

## 对单记忆库选择的影响 {#where-this-leaves-the-one-bank-question}

七月建议谨慎选择库边界，因为它也是召回边界，现在仍然如此。但保密要求不必全部依赖库边界。

记忆库决定召回可达范围，观察范围决定采用哪份使命。智能体可访问整个组织记忆，同时按读者控制记忆能说什么。

## 常见问题 {#faq}

**策略能修改其范围的去重阈值吗？**
不能，只支持上述四项，阈值仍为记忆库级 0.97。去重只比较同范围，公司摘要和 Dana 细节不会互相合并。

**没有策略匹配的范围怎么办？**
使用记忆库级值，控制平面标为 Default。没有隐式兜底，也无法写覆盖所有未匹配内容的策略。

**没有设置的策略会挡住后面的策略吗？**
不会，解析时丢弃，不匹配也不遮挡。控制平面边输入边保存，半写规则不应生效。

**能为 `shared` 单独设使命吗？**
不能，空标签集合无模式可匹配。需要不同使命的兜底范围应加真实标签。

**`observation_scope_limits` 会被移除吗？**
目前弃用但保留，策略之后仍作为观察数量上限回退。它原来只控制容量，策略补充了按读者变化的使命。

**范围使命会泄露到其他观察吗？**
不会，每范围独立整合调用，设置互不进入，观察带对应范围标签。

**如何检查哪个策略匹配范围？**
控制平面显示归属策略，范围端点列出范围及观察数。修改后应检查，尤其是通过环境变量配置时。

## 了解更多 {#learn-more}

- [一个记忆库还是多个？智能体记忆结构指南](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)：选择边界。
- [迁移事实，重新建立认知](https://hindsight.vectorize.io/blog/2026/09/23/bring-facts-not-beliefs)：整合能合并什么。
- [智能体记忆的整合问题](https://hindsight.vectorize.io/blog/2026/05/21/agent-memory-consolidation)：重要性、合并、衰减和淘汰。
- [Hindsight 0.10.2 新功能](https://hindsight.vectorize.io/blog/2026/09/29/version-0-10-2)：其他更新。
