---
slug: learning-capabilities
title: "会学习的智能体记忆：观察与心智模型"
authors: [nicoloboschi]
image: /img/reflect-operation.webp
date: 2026-01-28T12:00
hide_table_of_contents: true
tags: [release]
---

今天我们发布了Hindsight 0.4.0，它为AI智能体引入了两个强大的学习功能：**观察**用于自动知识整合，以及**心智模型**用于由用户整理的摘要。

<!-- truncate -->

import Figure from '@site/src/components/Figure';
import observations from '@site/figures/observations.json';
import mentalModelsApi from '@site/figures/mental-models-api.json';

## 两个学习层次 {#two-levels-of-learning}

Hindsight 0.4.0引入了分层学习系统：

|等级|它是什么|它是如何创建的|
|-------|------------|------------------|
|**心智模型**|用户整理的常见查询摘要|通过API手动创建|
|**观察**|由事实整合而成的知识|记忆存储后自动|

在`reflect`期间，智能体按优先顺序检查这些内容——首先是心智模型（你整理的知识），然后是观察（自动合成），然后是原始事实。

---

## 观察：自动知识整合 {#observations-automatic-knowledge-consolidation}

### 实体摘要和意见的演变 {#evolution-from-entity-summaries-and-opinions}

在Hindsight 0.3.0 中，我们有两个独立的综合知识系统：

- **实体摘要**：根据相关事实综合的每个实体的摘要。为经常提到的实体自动生成 - 如果“Alice”出现在许多事实中，您会得到类似“Alice 是 Google 的软件工程师，于 2020 年加入并领导搜索团队”的摘要。内容客观，并限定于实体范围。

- **意见**：在`reflect`操作过程中形成的信念，受到记忆库性格特征的影响。这些通过置信度分数捕获主观判断，例如“Python最适合数据科学”（置信度：0.85）。

两个系统都很好地实现了它们的目的，但它们独立运行。实体摘要以实体为中心，观点以信念为中心，两者都没有捕捉到知识如何随时间演变的全貌。

**观察** 将这些概念统一到一个单一的、更具表现力的系统中，该系统捕获从积累的证据中出现的模式、偏好和学习。

### 什么是观察？ {#what-are-observations}

观察是由多个事实综合而成的**巩固知识**。与作为单独信息的原始事实不同，观察代表了从积累的证据中出现的模式和见解。

|原始事实|观察|
|-----------|--------------|
|“爱丽丝更喜欢Python”|“Alice 是一位专注于 Python 的开发人员，重视可读性和简单性，推荐类型提示，并且更喜欢使用 pytest 进行测试”|
|“Alice 不喜欢冗长的代码”||
|“爱丽丝推荐类型提示”||

### 自动后台整合 {#automatic-background-consolidation}

每次`retain()`调用后，Hindsight的整合引擎会自动运行：

1. **分析新事实** 反对现有知识
2. **检测模式**跨相关信息
3. **综合观察** 捕捉高阶洞察
4. **追踪证据** 将每个观察结果与其支持事实联系起来

<Figure doc={observations} />

### 随证据演变 {#evidence-based-evolution}

观察随着新证据的到来而演变，捕捉整个旅程而不仅仅是当前状态：

|时间|事实|观察|
|------|------|--------------|
|第 1 周|“用户喜欢React”|“用户更喜欢React进行前端开发”|
|第 2 周|“用户称赞React的组件模型”|“用户对React充满热情，尤其是它的组件模型”|
|第三周|“用户切换到Vue并且不会再使用React”|“用户之前是React爱好者，欣赏其组件模型，但现在已转向Vue”|

注意最终的观察如何捕获**全程**——不仅仅是“用户更喜欢Vue”，而是完整的演变。你的智能体现在明白：

- 用户故意远离React（这不是无知）
- 他们之前很欣赏React的组件模型（相关上下文）
- 推荐React教程是不合适的

### 以任务为导向的整合 {#mission-oriented-consolidation}

观察力受到记忆库**使命**的影响。当您设定任务时，集成引擎将专注于提取服务于该目的的知识：

```python
client.create_bank(
    bank_id="support-agent",
    mission="您是客户支持智能体 - 跟踪客户偏好，"
            "过去的问题和沟通方式。"
)
```

执行此任务时，引擎会优先考虑与客户相关的观察，同时跳过短暂的细节。没有使命，它执行通用整合。

---

## 心智模型：用户策划的知识 {#mental-models-user-curated-knowledge}

虽然观察是自动创建的，但**心智模型**可以让您明确控制智能体如何回答常见问题。

### ​​什么是心智模型？ {#what-are-mental-models}

心智模型是您为记忆库策划的**保存了反思回复**。当您创建心智模型时，Hindsight 使用源查询运行反思操作并存储结果。在后续反思调用中，首先检查这些预先计算的摘要。

<Figure doc={mentalModelsApi} />

### 为什么要使用心智模型？ {#why-use-mental-models}

|好处|说明|
|---------|-------------|
|**一致性**|常见问题每次都有相同的答案|
|**速度**|立即返回预先计算的响应|
|**品质**|您已审阅的手动整理摘要|
|**控制**|准确定义应如何回答关键主题|

### 心智模型的两种使用方法 {#two-ways-to-use-mental-models}

心智模型有两种工作方式：

1. **自动via 不敢**：`reflect`调用时，智能体首先自动检查心智模型。如果存在相关的，则将其用于通知响应。

2. **直接查找**：心智模型的工作方式就像一个键值存储——你可以通过 ID 立即检索它们，完全绕过了推理循环。

```python
#ID直接查找——即时响应，无需LLM调用
mental_model = client.get_mental_model(
    bank_id="my-bank",
    mental_model_id="team-communication"
)
print(mental_model.content)  #预先计算的答案，随时可用
```

当您确切地知道您需要什么心智模型并想要最快的响应时，这非常有用 - 不需要 LLM 推理，只需简单的数据库查找。

### 创建心智模型 {#creating-mental-models}

```python
#为常见问题创建心智模型
response = client.create_mental_model(
    bank_id="my-bank",
    name="团队沟通偏好",
    source_query="团队更喜欢如何沟通？",
    tags=["team"]
)
```

### 自动刷新 {#automatic-refresh}

心智模型可以自动与您的观察保持同步：
观察更新时刷新的

```python
#心智模型
response = client.create_mental_model(
    bank_id="my-bank",
    name="项目状态",
    source_query="目前项目进展如何？",
    trigger={"refresh_after_consolidation": True}
)
```

---

## 指令：合规性和护栏 {#directives-compliance-and-guardrails}

除了学习能力之外，**指令**还提供了你的智能体在〜操作过程中必须始终遵循的硬性规则。与*影响力*推理风格的性格特征不同，指令是在每个响应中强制执行的绝对要求。

使用合规性、隐私和安全约束指令：
- “切勿提供医疗诊断或治疗建议”
- “始终用正式英语回复”
- “切勿分享个人身份信息”
- “在提出事实主张时始终引用来源”

指令作为硬约束注入到 反思提示中，并包含在响应的 `based_on` 字段中。请参阅[指令文档](../developer/api/memory-banks#directives)了解如何创建和管理它们。

---

## 0.3.0 有何变化 {#what-changes-from-030}

### 统一记忆类型 {#unified-memory-types}

意见和实体摘要现已合并到观察中：

```python
#0.3.0 - 通过类型的意见，通过 include_entities 的实体摘要
response = client.recall(
    bank_id="my-bank",
    query="你觉得Python怎么样？",
    types=["opinion"],
    include_entities=True  #获取实体摘要
)

#0.4.0 - 观察统一两者
response = client.recall(
    bank_id="my-bank",
    query="你觉得Python怎么样？",
    types=["observation"]
)
```

### 从置信度分数到证据跟踪 {#from-confidence-scores-to-evidence-tracking}

意见有数字置信度分数（0.0-1.0）。 观察而不是追踪：

- **支持事实**：观察背后的证据
- **最后更新**：最后一次精炼观察的时间
- **新鲜度**：观察是否反映了最近的信息

从单一分数到证据跟踪的转变意味着你的智能体可以解释*为什么*它相信某事，而不仅仅是*多么自信*它是。

### 自动与按需 {#automatic-vs-on-demand}

实体摘要是为顶级实体自动创建的，但意见仅在`reflect`期间形成。 观察总是在`retain`之后自动合并，确保知识保持最新状态而无需显式查询。

### 背景成为使命 {#background-becomes-mission}

记忆库的`background`字段已重命名为`mission`。在迁移过程中，您现有的背景文本会自动复制到任务字段 - 无需执行任何操作。

### 代理回忆 {#agentic-reflect}

`reflect`操作现在是代理式的——它通过迭代检索记忆并在制定响应之前查阅心智模型和观察来进行更深入的推理。这使得反思变得更加聪明，特别是对于需要综合多个主题信息的复杂问题。

权衡是，反思可能需要更长的时间才能做出反应。对于延迟敏感的用例，当您只需要检索事实时，请考虑直接使用`recall`。

### 数据迁移 {#data-migration}

**重要：** 升级到0.4.0时，现有的意见和实体摘要将被删除。整合引擎将根据您现有的事实自动创建新的观察。这是一次性迁移 - 您的原始事实将被保留，升级后将根据它们综合观察。

### 迁移清单 {#migration-checklist}

**如果您在记忆召回中使用`types=["opinion"]`：**

1. 更新至`types=["observation"]`
2. 观察结合了以实体为中心的总结和基于信念的见解

**如果您在记忆召回中使用`include_entities=True`：**

1. 实体摘要现已包含在观察中
2. 使用`types=["observation"]`检索它们

**如果您依赖置信度分数：**

1. 使用`based_on`字段获取支持证据
2. 支持事实的数量和新近程度表明了强度

**如果您在记忆库上设置`background`：**

1. 该字段现在称为`mission`
2. 现有值会自动迁移

**不需要改变：**

观察结果会通过 `based_on` 字段自动包含在反思响应中。

---

## 下一步是什么 {#whats-next}

这些学习能力是我们正在探索的更复杂的智能体记忆能力的基础：

- **时间推理**：更好地理解知识如何随时间演变
- **选择性整合**：对合成到观察中的内容进行细粒度控制
- **整合见解**：观察如何形成和更新的可见性

---

**资源：**
- [记忆召回API](../developer/api/recall) — 检索观察结果和事实
- [反思API](../developer/api/reflect) — 回复现在包括支持观察
- [心智模型API](../developer/api/mental-models) — 创建和管理精选摘要
- [观察指南](../developer/observations) — 深入了解知识整合
- [指令](../developer/api/memory-banks#directives) — 合规性和护栏的硬性规则
- [完整变更日志](../changelog)
