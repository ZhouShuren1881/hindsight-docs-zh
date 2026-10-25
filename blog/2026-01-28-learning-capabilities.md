---
slug: learning-capabilities
title: "会学习的智能体记忆：观测与心智模型"
authors: [nicoloboschi]
image: /img/reflect-operation.webp
date: 2026-01-28T12:00
hide_table_of_contents: true
tags: [release]
description: "Hindsight 0.4.0 为智能体新增两种学习方式：自动合并事实的观测，以及由你编写并持续更新的心智模型。"
---

今天我们发布了 Hindsight 0.4.0，为 AI 智能体带来两种强大的学习能力：用于自动整合知识的**观测**，以及由用户维护摘要的**心智模型**。

<!-- truncate -->

import Figure from '@site/src/components/Figure';
import observations from '@site/figures/observations.json';
import mentalModelsApi from '@site/figures/mental-models-api.json';

## 两个学习层次 {#two-levels-of-learning}

Hindsight 0.4.0 引入了一个分层学习系统：

| 层级 | 内容 | 创建方式 |
|-------|------------|------------------|
| **心智模型** | 针对常见查询、由用户维护的摘要 | 通过 API 手动创建 |
| **观测** | 从事实整合而来的知识 | 每次存入后自动创建 |

执行 `reflect` 时，智能体会按以下优先顺序检查：先检查心智模型（由你维护的知识），再检查观测（自动综合生成），最后检查原始事实。

---

## 观测：自动整合知识 {#observations-automatic-knowledge-consolidation}

### 从实体摘要和观点演变而来 {#evolution-from-entity-summaries-and-opinions}

在 Hindsight 0.3.0 中，我们有两个彼此独立的综合知识系统：

- **实体摘要**：按实体汇总相关事实。系统会为经常被提及的实体自动生成摘要。例如，如果许多事实中都出现了“Alice”，你就会得到类似“Alice 是 Google 的软件工程师，于 2020 年加入公司并领导搜索团队”的摘要。摘要内容客观，范围限于该实体。

- **观点**：在 `reflect` 操作期间形成的认知判断，并受记忆库的性格倾向影响。观点以置信度分数表达主观判断，例如“Python 最适合数据科学”（置信度：0.85）。

这两个系统都很好地发挥了各自的作用，但彼此独立：实体摘要以实体为中心，观点以认知判断为中心，两者都无法完整呈现知识如何随时间演变。

**观测** 将这两个概念整合为一个表达力更强的系统，用来记录随着证据不断积累而显现的模式、偏好和认知。

### 什么是观测？ {#what-are-observations}

观测是从多个事实中综合生成的**整合知识**。原始事实是独立的信息片段，而观测则体现了随着证据积累而显现的模式和洞见。

| 原始事实 | 观测 |
|-----------|--------------|
| “Alice 更喜欢 Python” | “Alice 是一位专注于 Python 的开发者，重视可读性和简洁性，会推荐类型提示，并且更喜欢使用 pytest 进行测试” |
| “Alice 不喜欢冗长的代码” | |
| “Alice 推荐使用类型提示” | |

### 自动在后台整合 {#automatic-background-consolidation}

每次调用 `retain()` 后，Hindsight 的整合引擎都会自动运行：

1. **分析新事实**，并与现有知识进行比较
2. **发现相关信息中的模式**
3. **综合生成观测**，提炼出更高层次的洞见
4. **追踪证据**，将每条观测与其支持事实关联起来

<Figure doc={observations} />

### 基于证据演变 {#evidence-based-evolution}

随着新证据出现，观测会不断演变，记录事情的发展过程，而不只是当前状态：

| 时间 | 事实 | 观测 |
|------|------|--------------|
| 第 1 周 | “用户喜欢 React” | “用户更喜欢使用 React 进行前端开发” |
| 第 2 周 | “用户称赞 React 的组件模型” | “用户热衷于 React，尤其喜欢它的组件模型” |
| 第 3 周 | “用户改用 Vue，以后不会再用 React” | “用户以前是 React 爱好者，欣赏它的组件模型，但现在已改用 Vue” |

注意，最终的观测记录了**完整的变化过程**，而不只是“用户更喜欢 Vue”。因此，智能体现在能够理解：

- 用户是有意改用 Vue 的（并非因为不了解 React）。
- 用户以前很欣赏 React 的组件模型（这是有用的上下文）。
- 此时再推荐 React 教程并不合适。

### 以任务说明为导向的整合 {#mission-oriented-consolidation}

观测会受到记忆库**任务说明** 的影响。设置任务说明后，整合引擎会着重提取有助于实现该目的的知识：

```python
client.create_bank(
    bank_id="support-agent",
    mission="You're a customer support agent - track customer preferences, "
            "past issues, and communication styles."
)
```

有了这段任务说明，引擎会优先生成与客户相关的观测，同时跳过短暂细节。未设置任务说明时，引擎会进行通用整合。

---

## 心智模型：由用户维护的知识 {#mental-models-user-curated-knowledge}

观测会自动创建，而**心智模型** 让你能够明确控制智能体如何回答常见问题。

### 什么是心智模型？ {#what-are-mental-models}

心智模型是由你为记忆库维护的**已保存的 Reflect 响应**。创建心智模型时，Hindsight 会根据来源查询执行一次 Reflect 操作，并保存结果。在后续的 Reflect 调用中，系统会优先检查这些预先计算的摘要。

<Figure doc={mentalModelsApi} />

### 为什么使用心智模型？ {#why-use-mental-models}

| 优点 | 说明 |
|---------|-------------|
| **一致性** | 常见问题每次都会得到相同的答案 |
| **速度** | 立即返回预先计算的响应 |
| **质量** | 摘要由你手动维护并审核 |
| **控制力** | 准确定义关键主题应如何作答 |

### 使用心智模型的两种方式 {#two-ways-to-use-mental-models}

心智模型有两种用法：

1. **通过 Reflect 自动使用**：调用 `reflect` 时，智能体会自动优先检查心智模型。如果存在相关模型，就会用它来辅助生成响应。

2. **直接查找**：心智模型的工作方式类似键值存储。你可以按 ID 立即获取模型，完全跳过 Reflect 的推理循环。

```python
# 通过 ID 直接查找——立即响应，无需调用 LLM
mental_model = client.get_mental_model(
    bank_id="my-bank",
    mental_model_id="team-communication"
)
print(mental_model.content)  # 预先计算好的答案，可直接使用
```

如果你明确知道需要哪个心智模型，并希望尽可能快地获得响应，这种方式就很有用：无需 LLM 推理，只需执行简单的数据库查找。

### 创建心智模型 {#creating-mental-models}

```python
# 为常见问题创建心智模型
response = client.create_mental_model(
    bank_id="my-bank",
    name="Team Communication Preferences",
    source_query="How does the team prefer to communicate?",
    tags=["team"]
)
```

### 自动刷新 {#automatic-refresh}

心智模型可以自动与观测保持同步：

```python
# 观测更新后刷新的心智模型
response = client.create_mental_model(
    bank_id="my-bank",
    name="Project Status",
    source_query="What is the current project status?",
    trigger={"refresh_after_consolidation": True}
)
```

---

## 强制指令：合规与防护规则 {#directives-compliance-and-guardrails}

除了学习能力，**强制指令** 还为智能体提供必须在 Reflect 操作期间始终遵守的硬性规则。性格倾向会*影响*推理风格，而强制指令则是每次响应都必须执行的绝对要求。

强制指令可用于合规、隐私和安全约束：
- “绝不提供医疗诊断或治疗建议”
- “始终使用正式英语回复”
- “绝不分享个人身份信息”
- “提出事实主张时始终引用来源”

强制指令会作为硬性约束注入 Reflect 提示词，并包含在响应的 `based_on` 字段中。如何创建和管理强制指令，请参阅[强制指令文档](../developer/api/memory-banks#directives)。

---

## 0.3.0 版有哪些变化 {#what-changes-from-030}

### 统一记忆类型 {#unified-memory-types}

现在，观点和实体摘要都整合到了观测中：

```python
# 0.3.0 - 通过 types 获取观点，通过 include_entities 获取实体摘要
response = client.recall(
    bank_id="my-bank",
    query="What do you think about Python?",
    types=["opinion"],
    include_entities=True  # 获取实体摘要
)

# 0.4.0 - 观测统一了两者
response = client.recall(
    bank_id="my-bank",
    query="What do you think about Python?",
    types=["observation"]
)
```

### 从置信度分数转向证据追踪 {#from-confidence-scores-to-evidence-tracking}

观点带有数值置信度分数（0.0–1.0）。观测则会追踪：

- **支持事实**：为观测提供依据的证据
- **最后更新时间**：观测上次经过优化的时间
- **更新状态**：观测是否反映了近期信息

从单一分数转向追踪证据后，智能体能够解释*为什么*它相信某件事，而不仅仅说明它*有多确信*。

### 自动整合与按需生成 {#automatic-vs-on-demand}

系统会为最常出现的实体自动创建实体摘要，而观点仅在 `reflect` 期间形成。每次 `retain` 后都会自动整合观测，因此无需显式查询，知识也能保持最新。

### 从 background 改为 mission {#background-becomes-mission}

记忆库的 `background` 字段已重命名为 `mission`。迁移时，现有的 background 文本会自动复制到 mission 字段，无需执行任何操作。

### 具备智能体行为的 Reflect {#agentic-reflect}

`reflect` 操作现在具备智能体行为：它会通过迭代检索记忆，并在组织响应前查阅心智模型和观测，从而进行更深入的推理。这让 Reflect 更擅长回答复杂问题，尤其是需要综合多个主题信息的问题。

代价是 Reflect 可能需要更长时间才能响应。对于对延迟敏感、只需检索事实的场景，可以直接使用 `recall`。

### 数据迁移 {#data-migration}

**重要：** 升级到 0.4.0 时，现有的观点和实体摘要将被删除。整合引擎会根据现有事实自动创建新观测。这是一次性迁移：原始事实会保留，升级后系统会以这些事实为依据综合生成观测。

### 迁移清单 {#migration-checklist}

**如果你在 recall 中使用了 `types=["opinion"]`：**

1. 改为使用 `types=["observation"]`。
2. 观测会同时包含以实体为中心的摘要和基于认知判断的洞见。

**如果你在 recall 中使用了 `include_entities=True`：**

1. 实体摘要现已包含在观测中。
2. 使用 `types=["observation"]` 检索这些内容。

**如果你依赖置信度分数：**

1. 使用 `based_on` 字段访问支持证据。
2. 支持事实的数量和新近程度可以反映证据强度。

**如果你为记忆库设置了 `background`：**

1. 该字段现已更名为 `mission`。
2. 现有值会自动迁移。

**Reflect 无需改动：**

观测会通过 `based_on` 字段自动包含在 Reflect 响应中。

---

## 后续计划 {#whats-next}

这些学习能力为我们正在探索的、更高级的智能体记忆能力奠定了基础：

- **时间推理**：更好地理解知识如何随时间演变
- **选择性整合**：更精细地控制哪些内容会被综合到观测中
- **整合洞见**：了解观测如何形成和更新

---

**相关资源：**
- [Recall API](../developer/api/recall) — 检索观测和事实
- [Reflect API](../developer/api/reflect) — 响应现在会包含支持观测
- [心智模型 API](../developer/api/mental-models) — 创建和管理由用户维护的摘要
- [观测指南](../developer/observations) — 深入了解知识整合
- [强制指令](../developer/api/memory-banks#directives) — 用于合规与防护规则的硬性约束
- [完整变更日志](../changelog)
