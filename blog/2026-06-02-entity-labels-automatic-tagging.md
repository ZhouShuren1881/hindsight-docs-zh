---
title: "使用实体标签在 Hindsight 中自动标记记忆"
authors: [benfrank241]
slug: "2026/06/02/entity-labels-automatic-memory-tagging"
date: 2026-06-02T12:00
tags: [hindsight, memory, entities, tagging, tutorial, agents]
description: "Hindsight 的实体标签可以将自由文本记忆自动转换为结构化、可筛选的分类。通过受控词表、四种标签类型，以及一个让标签也成为可筛选标签的开关，轻松管理记忆。"
image: /img/blog/entity-labels-tagging.webp
hide_table_of_contents: true
---

![Hindsight 中用于自动标记记忆的实体标签](/img/blog/entity-labels-tagging.webp)

Hindsight 的自由格式实体提取很适合发现数据中*已有*的内容，例如模型自行识别出的名称、地点和概念。但如果之后要筛选这些数据，它就没那么好用了。

假设你编写了一个用于摄取支持工单的智能体。有三位客户都来电咨询 Acme Corp。第一次会话存入了 `Acme Corp`，第二次是 `Acme`，第三次是 `Acme Corporation`。它们指的是同一家公司，但实体字符串不一致，因此下游查询“everything Acme”时，只会随机返回三条记忆中的一条。

实体标签可以解决这个问题。你可以在记忆库级别定义一个**受控词表**：一组固定维度，例如 `priority`、`sentiment` 或 `product_area`，以及每个维度允许的值。存入记忆时，LLM 必须从该词表中选择。这样每条记忆都会带有一致、可查询的分类，而且无需更改智能体代码。

<!-- truncate -->

---

## 什么是实体标签 {#what-an-entity-label-is}

标签组是记忆库中的一个分类维度。它包含 `key`（维度名称）、`type`（值的形式），以及（枚举类型的标签组）允许的 `values` 列表。

最小可能的配置：

```json
{
  "entity_labels": [
    {
      "key": "priority",
      "description": "Urgency of the support request",
      "type": "value",
      "values": [
        { "value": "low" },
        { "value": "medium" },
        { "value": "high" },
        { "value": "urgent" }
      ]
    }
  ]
}
```

当此记忆库存入类似*“客户的结账功能坏了，无法处理订单”*的工单时，LLM 会从四个允许值中选出一个，Hindsight 随后会存储一个关联到 `canonical_name = "priority:urgent"` 的记忆实体。这样，两条都被分类为紧急的记忆便会在知识图谱中共享同一个实体：它们会自然聚集，检索时也能一起找到，你还可以在整个记忆库中查询所有紧急事项。

---

## 四种标签类型 {#the-four-label-types}

每个标签组的 `type` 都是四种值之一。选择与该维度的值形式相匹配的类型。

### `value` — 单个枚举 {#value--single-enum}

这是默认类型。LLM 必须恰好选择一个允许值；如果没有适用值，则可以跳过该标签组（默认情况下 `optional: true`）。

```json
{
  "key": "sentiment",
  "description": "Customer's emotional tone in the ticket",
  "type": "value",
  "values": [
    { "value": "frustrated" },
    { "value": "neutral" },
    { "value": "appreciative" }
  ]
}
```

存储结果为：`sentiment:frustrated`、`sentiment:neutral` 或 `sentiment:appreciative`。

### `multi-values` — 多选枚举 {#multi-values--multi-select-enum}

原理相同，但当多个值都适用时，LLM 可以选择*多个*值。

```json
{
  "key": "product_area",
  "description": "Which product areas the ticket touches",
  "type": "multi-values",
  "values": [
    { "value": "billing" },
    { "value": "auth" },
    { "value": "dashboard" },
    { "value": "api" },
    { "value": "mobile" }
  ]
}
```

一张工单可以生成多个实体（`product_area:billing`、`product_area:dashboard`），并将共享其中任一产品领域的记忆关联起来。

### `text` — 已知密钥下的自由形式 {#text--free-form-under-a-known-key}

每次都会使用相同的键前缀，但值本身不受词表限制。适用于需要统一前缀（如 `topic:`、`customer_name:`），却无法枚举所有可能值的维度。

```json
{
  "key": "customer_name",
  "description": "Customer or company mentioned in the ticket",
  "type": "text",
  "values": []
}
```

存储结果示例：`customer_name:Acme Corp`、`customer_name:Globex` 等。由于模型可能在不同会话中以不同方式表达同一个值，图谱聚类不如枚举类型可靠；这是使用开放词表所要接受的取舍。

### `map` — 结构化实体 (v0.6.1+) {#map--structured-entity-v061}

当一个实体包含多个命名字段时使用此类型，例如包含姓名和角色的人员，或包含级别和帐户 ID 的客户。每个字段本身也有类型，因此可以混用 `text`、枚举类型和嵌套的 `map`。

```json
{
  "key": "customer",
  "description": "Customer mentioned in the ticket",
  "type": "map",
  "fields": {
    "name":       { "type": "text", "description": "Customer or company name" },
    "tier":       { "type": "value", "values": [
                      { "value": "free" }, { "value": "pro" }, { "value": "enterprise" }
                    ]},
    "account_id": { "type": "text", "description": "Account or organization ID" }
  }
}
```

提取出的每个字段都会存储为扁平的 `key:field:value` 实体，例如 `customer:name:Acme Corp`、`customer:tier:enterprise`、`customer:account_id:org_8f4a`。这种扁平编码使 map 字段能够像单值标签一样参与知识图谱和检索，底层无需更改数据库模式。

---

## 提取的工作原理 {#how-extraction-works}

整个处理流程很精简，也容易理解。

**1. 记忆库配置会编译成 Pydantic 模型。** 使用 `entity_labels` 块调用 `update_bank_config` 时，Hindsight 会将其解析为 `EntityLabelsConfig`，再通过 `build_labels_model()` 生成一个动态 Pydantic 类，为每个标签组创建一个类型化字段。枚举组会变成 `Literal[...]`，多值组会变成 `list[Literal[...]]`，map 组则会变成 `list[NestedModel]`。

**2. 存入记忆时，LLM 调用会强制遵循 JSON Schema。** 该动态 Pydantic 模型会附加到提取调用的结构化输出模式中，并由模型供应商强制执行：对于枚举组，模型实际上无法返回词表之外的值。随模式一并发送的提示部分如下：

```text
══════════════════════════════════════════════════════════════════════════
ENTITY LABELS - CLASSIFICATION ATTRIBUTES
══════════════════════════════════════════════════════════════════════════

Classify each fact using the structured 'labels' field below. Continue
extracting regular named entities in the 'entities' field.

For each fact, fill the 'labels' object. Each field is a label group:

- priority (single value or null): Urgency of the support request
    • "low"
    • "medium"
    • "high"
    • "urgent"

- product_area (multi-value (list)): Which product areas the ticket touches
    • "billing"
    • "auth"
    • "dashboard"
    • "api"
    • "mobile"

Only assign labels when clearly applicable. Leave null/empty if the fact does not match.
```

**3. 后处理会验证并写入实体。** LLM 会为每条事实返回一个结构化的 `labels` 字典。Hindsight 根据预先构建的 `labels_lookup` 集合（由配置中的枚举构成）检查每个值，丢弃词表之外的值，递归处理 map 类型，并为每个匹配值写入一个实体。结果写入已有的 `unit_entities` 关联表；该表本来就支持自由格式实体检索，因此无需专门的标签存储。

实体形式与自由格式实体相同，检索路径也相同，只是字符串变得可预测。

---

## `tag: true` 回报 {#the-tag-true-payoff}

标签默认会成为实体。在标签组中添加 `"tag": true` 后，匹配的 `key:value` 还会写入记忆的 `tags` 字段。这样就可以像使用用户提供的标签一样，按标签筛选召回结果。

```json
{
  "key": "priority",
  "type": "value",
  "tag": true,
  "values": [
    { "value": "low" }, { "value": "medium" }, { "value": "high" }, { "value": "urgent" }
  ]
}
```

存入工单后，记忆会自动带有 `tags = ["priority:urgent", ...]`。接下来：

```python
results = client.recall(
    bank_id="support",
    query="What's the most pressing issue with billing right now?",
    tags=["priority:urgent"],
    tags_match="all",
)
```

召回结果仅包含带有该标签的记忆。将 `priority` 与情绪标签结合起来，就可以通过两个标签和一个查询来询问*“本周哪些紧急工单让客户感到沮丧？”*。

只在确实计划用于筛选的维度上设置 `tag: true`。每个标签都会扩展记忆可筛选的范围；标签过多会带来更多噪声，却不会显著提升检索价值。

---

## 仅标签模式 {#labels-only-mode}

默认情况下，标签实体会与自由格式实体*一同*写入；后者包括 LLM 自行识别出的人物、地点和概念。如果只需要标签（例如，为了满足分析级别的一致性、下游 BI 流程或确定性仪表板），请将 `entities_allow_free_form` 设为 `false`：

```json
{
  "entity_labels": [ /* … */ ],
  "entities_allow_free_form": false
}
```

此后，记忆库只会提供受控词表中的实体。自由格式实体提取会从源头被关闭，无需事后筛选。

---

## 设计词汇 {#designing-a-vocabulary}

根据这些功能在生产环境中的使用经验，可以总结出几条实用建议：

- **先从两到四个维度开始。** 之后还可以增加维度，但标签越多，每次存入记忆时消耗的 LLM 令牌就越多，也会让更多注意力用于分类而非事实提取。先选择你*确定*会用于筛选的维度。
- **优先使用枚举（`value` / `multi-values`），而不是 `text`。** 枚举能确保同一概念始终使用相同的字符串，这正是使用标签的目的。只有当值的范围确实开放时才使用 `text`，例如人名、自由格式主题或产品 SKU。
- **对包含子字段的实体使用 `map`。** 适用于人员、组织、地址、客户资料等需要表达结构化数据的场景，避免将它们塞进一个扁平字符串。
- **只在要用于 Recall 筛选的维度上设置 `tag: true`。** 筛选是收益，标签噪声则是代价。
- **认真填写 `description` 字段。** 这些描述会直接注入 LLM 提示，对提取质量的影响超过其他因素。应说明每个标签*表示什么*，以及*何时适用*。

关于稳定性需要说明一点：从 [Hindsight v0.7.0](/blog/2026/05/27/version-0-7-0) 起，用户定义的标签实体不参与模糊解析。`priority:urgent` 会一直保持为 `priority:urgent`，不会被整合器合并到相似的实体中。因此，标签可以安全地用作分析作业、告警规则和仪表板中的长期标识符。

---

## 从头到尾构建支持工单记忆库 {#a-support-ticket-bank-end-to-end}

下面将这些内容组合起来。以下是一个支持智能体的完整配置，它会从四个维度对工单分类：

```python
client.update_bank_config(
    bank_id="support",
    entity_labels=[
        {
            "key": "priority",
            "description": "Urgency of the support request",
            "type": "value",
            "tag": True,
            "values": [
                {"value": "low"}, {"value": "medium"},
                {"value": "high"}, {"value": "urgent"},
            ],
        },
        {
            "key": "sentiment",
            "description": "Customer's emotional tone in the ticket",
            "type": "value",
            "values": [
                {"value": "frustrated"}, {"value": "neutral"}, {"value": "appreciative"}
            ],
        },
        {
            "key": "product_area",
            "description": "Which product areas the ticket touches",
            "type": "multi-values",
            "tag": True,
            "values": [
                {"value": "billing"}, {"value": "auth"}, {"value": "dashboard"},
                {"value": "api"}, {"value": "mobile"},
            ],
        },
        {
            "key": "customer",
            "description": "Customer mentioned in the ticket",
            "type": "map",
            "fields": {
                "name":       {"type": "text", "description": "Customer or company name"},
                "tier":       {"type": "value", "values": [
                    {"value": "free"}, {"value": "pro"}, {"value": "enterprise"}
                ]},
                "account_id": {"type": "text", "description": "Account or org ID"},
            },
        },
    ],
)
```

存入一张工单：

```python
client.retain(
    bank_id="support",
    content=(
        "Acme Corp (enterprise, account org_8f4a) reports their checkout "
        "is completely broken — customers can't process orders. They've "
        "been blocked for 40 minutes and are extremely frustrated. "
        "Billing dashboard shows the right plan, but the API rejects "
        "every charge attempt with a 500."
    ),
)
```

提取完成后，这条记忆包含以下实体：

```text
priority:urgent
sentiment:frustrated
product_area:billing
product_area:api
customer:name:Acme Corp
customer:tier:enterprise
customer:account_id:org_8f4a
```

……以及以下标签（因为 `priority` 和 `product_area` 都设置了 `tag: true`）：

```text
["priority:urgent", "product_area:billing", "product_area:api"]
```

现在按标签召回记忆：

```python
results = client.recall(
    bank_id="support",
    query="What urgent issues are blocking customers right now?",
    tags=["priority:urgent"],
)
```

查询同时使用语义检索*和*标签筛选。结果包含模型认为相关且带有“紧急”标签的所有记忆。再添加一个标签（`tags=["priority:urgent", "product_area:billing"]`），筛选范围就会进一步缩小。

---

## 整个想法 {#the-whole-idea}

自由格式实体提取会告诉你 LLM 注意到了什么；实体标签则会用统一的词表记录你*关心*的内容。添加 `tag: true` 后，词表还能兼作每条记忆的可筛选索引。使用 `map` 可以建模丰富的结构化实体，无需另设模式。将 `entities_allow_free_form` 设为 `false`，就能建立一个适用于分析、没有词表外噪声的记忆库。

只需修改记忆库配置，无需更改智能体代码，就能为每条记忆持久保存分类。这就是全部要点。

---

**进一步阅读：**

- [`entity_labels` 参考](https://hindsight.vectorize.io/developer/api/memory-banks#entity-labels) — 完整的模式文档
- [Map 类型实体标签（v0.6.1）](/blog/2026/05/08/version-0-6-1) — 结构化实体功能的发布说明
- [稳定的用户定义标签实体（v0.7.0）](/blog/2026/05/27/version-0-7-0) — 了解标签为何能在整合过程中保持稳定
- [星座图视图](/blog/2026/04/16/constellation-view) — 查看标签实体的可视化效果
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
