---
title: "使用实体标签自动标记Hindsight中的记忆"
authors: [benfrank241]
slug: "2026/06/02/entity-labels-automatic-memory-tagging"
date: 2026-06-02T12:00
tags: [hindsight, memory, entities, tagging, tutorial, agents]
description: "Hindsight 的实体标签自动将自由文本记忆转化为结构化、可过滤的分类。受控词汇表、四种标签类型和一种标签：将标签转变为可过滤标签的真正开关。"
image: /img/blog/entity-labels-tagging.webp
hide_table_of_contents: true
---

![Hindsight中自动记忆标记的实体标签](/img/blog/entity-labels-tagging.webp)

Hindsight 的自由格式实体提取非常适合呈现 *in* 数据 - 模型自行找到的名称、地点、概念。当您确实想稍后过滤该数据时，它就不那么好了。

您编写一个支持智能体来获取票证。三个客户都打电话来询问Acme Corp。第一场保留了`Acme Corp`，第二场`Acme`，第三场`Acme Corporation`。它们是同一家公司，但实体字符串不匹配，因此下游查询“everything Acme”会随机返回三个记忆之一。

实体标签解决了这个问题。您在记忆库级别定义 **控制词汇** — 一组固定的维度，例如 `priority`、`sentiment` 或 `product_area` 以及允许的值。在记忆存储时，LLM被迫从该词汇中进行选择。结果是每个记忆都具有一致的、可查询的分类，无需更改智能体代码。

<!-- truncate -->

---

## 什么是实体标签 {#what-an-entity-label-is}

标签组是记忆库上的一个分类维度。它有一个`key`（维度名称）、一个`type`（值的形状），以及（对于枚举样式组）允许的`values`列表。

最小可能的配置：

```json
{
  "entity_labels": [
    {
      "key": "priority",
      "description": "支持请求的紧急程度",
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

当这个记忆库保留像*“客户结帐已损坏，无法处理订单”*这样的票证时，LLM选择四个允许值之一，并且Hindsight存储与`canonical_name = "priority:urgent"`相关的记忆实体。现在，两个都被归类为紧急的记忆在知识图中共享一个实体——它们自然地聚集在一起，检索可以将它们找到在一起，并且您可以在整个记忆库中查询所有紧急的内容。

---

## 四种标签类型 {#the-four-label-types}

每个标签组都有四个`type`值之一。选择与尺寸形状相匹配的一个。

### `value` — 单个枚举 {#value--single-enum}

默认。 LLM 恰好选择允许的值之一，或者在没有任何适用的情况下跳过它（如果`optional: true`，这是默认值）。

```json
{
  "key": "sentiment",
  "description": "工单中客户的情绪基调",
  "type": "value",
  "values": [
    { "value": "frustrated" },
    { "value": "neutral" },
    { "value": "appreciative" }
  ]
}
```

存储为：`sentiment:frustrated`、`sentiment:neutral`或`sentiment:appreciative`。

### `multi-values` — 多选枚举 {#multi-values--multi-select-enum}

同样的想法，但是当多个应用时，LLM可以选择*几个*值。

```json
{
  "key": "product_area",
  "description": "票据涉及哪些产品领域",
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

一张票可以产生多个实体（`product_area:billing`，`product_area:dashboard`）并链接共享任何这些区域的记忆。

### `text` — 已知密钥下的自由形式 {#text--free-form-under-a-known-key}

每次都有相同的键前缀，但值本身是开放词汇。适合需要一致前缀（`topic:`、`customer_name:`）而不枚举每个可能值的维度。

```json
{
  "key": "customer_name",
  "description": "工单中提到的客户或公司",
  "type": "text",
  "values": []
}
```

存储为`customer_name:Acme Corp`、`customer_name:Globex`等。图聚类不如枚举可靠，因为模型可能会在会话之间以不同的方式表述相同的值 - 这是开放词汇的权衡。

### `map` — 结构化实体 (v0.6.1+) {#map--structured-entity-v061}

当单个实体具有多个命名字段时使用此字段 - 具有名称和角色的人员、具有级别和帐户 ID 的客户。每个字段本身都是类型化的，因​​此您可以混合使用`text`、枚举和嵌套`map`。

```json
{
  "key": "customer",
  "description": "工单中提到的顾客",
  "type": "map",
  "fields": {
    "name":       { "type": "text", "description": "客户或公司名称" },
    "tier":       { "type": "value", "values": [
                      { "value": "free" }, { "value": "pro" }, { "value": "enterprise" }
                    ]},
    "account_id": { "type": "text", "description": "帐户或组织 ID" }
  }
}
```

每个提取的字段都存储为平面`key:field:value`实体 - `customer:name:Acme Corp`、`customer:tier:enterprise`、`customer:account_id:org_8f4a`。平面编码意味着地图字段以与单值标签相同的方式参与知识图谱和检索，并且底层没有模式更改。

---

## 提取的工作原理 {#how-extraction-works}

管道很小，很容易推理。

**1。您的记忆库配置编译成 Pydantic 模型。** 当您使用 `entity_labels` 块调用 `update_bank_config` 时，Hindsight 将其解析为 `EntityLabelsConfig` 并使用 `build_labels_model()` 生成一个动态 Pydantic 类，每个标签组有一个类型化字段。枚举组变成`Literal[...]`。多值组变成`list[Literal[...]]`。地图组变成`list[NestedModel]`。

**2。记忆存储LLM调用使用JSON模式执行。** 该动态 Pydantic 模型附加到提取调用的结构化输出模式。提供者强制执行它——模型实际上不能返回枚举组词汇之外的值。与模式一起提供的提示部分如下所示：

```text
══════════════════════════════════════════════════════════════════════════
实体标签 - 分类属性
══════════════════════════════════════════════════════════════════════════

使用下面的结构化“标签”字段对每个事实进行分类。继续
提取“实体”字段中的常规命名实体。

对于每个事实，填写“标签”对象。每个字段都是一个标签组：

- 优先级（单值或空）：支持请求的紧急程度
    • "low"
    • "medium"
    • "high"
    • "urgent"

-product_area（多值（列表））：票据涉及哪些产品区域
    • "billing"
    • "auth"
    • "dashboard"
    • "api"
    • "mobile"

Only assign labels when clearly applicable. Leave null/empty if the fact does not match.
```

**3。后处理验证并写入实体。** LLM 响应作为每个事实的结构化 `labels` 字典返回。 Hindsight 根据预构建的 `labels_lookup` 集（根据配置的枚举构建）检查每个值，删除词汇表之外的任何内容，递归到映射类型，并为每个匹配的值写入一个实体。结果落在 `unit_entities` 连接表中，该表已经支持自由格式实体检索 - 无需特殊标签存储。

与自由形式实体形状相同。相同的检索路径。只是可预测的字符串。

---

## `tag: true` 回报 {#the-tag-true-payoff}

标签默认成为实体。将 `"tag": true` 添加到标签组，匹配的 `key:value` 也会写入记忆的 `tags` 字段 — 这样您就可以按标签过滤记忆召回，就像按任何用户提供的标签过滤一样。

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

记忆存储一张票，记忆会自动与`tags = ["priority:urgent", ...]`一起出现。然后：

```python
results = client.recall(
    bank_id="support",
    query="目前计费方面最紧迫的问题是什么？",
    tags=["priority:urgent"],
    tags_match="all",
)
```

记忆召回的范围是带有该标签的记忆。将 `priority` 与情感标签配对，您可以使用两个标签和一个查询询问 *“本周哪些紧急票据让客户感到沮丧？”*。

仅在您实际计划过滤的维度上设置`tag: true`。每个标签也成为记忆可过滤表面的一部分，因此过度标记会使表面变得更加嘈杂，而不会增加太多检索价值。

---

## 仅标签模式 {#labels-only-mode}

默认情况下，标签实体被写入*旁边*自由形式实体——LLM自己找到的人物、地点、概念。如果您只需要标签而不需要其他内容（分析级一致性、下游 BI 管道、确定性仪表板），请将 `entities_allow_free_form` 设置为 `false`：

```json
{
  "entity_labels": [ /* … */ ],
  "entities_allow_free_form": false
}
```

记忆库现在只显示受控词汇中的实体。从源头抑制自由形式提取——无需事后过滤。

---

## 设计词汇 {#designing-a-vocabulary}

在生产中观看了这些内容后，得出了一些经验法则：

- **从两到四维开始。** 您可以稍后添加更多，但更多标签意味着每个记忆存储调用更多的 LLM 令牌，并且更多的注意力花在分类而不是提取事实上。从您要过滤的*知道*维度开始。
- **优先使用枚举 (`value` / `multi-values`) 而不是 `text`。** 枚举保证相同的概念获得相同的字符串，这就是重点。仅当价值空间真正开放时才使用`text`（人名、自由格式主题、产品 SKU）。
- **对具有子字段的实体使用`map`。** 人员、组织、地址、客户资料 - 任何您需要将结构化数据填充到扁平字符串中的地方。
- **仅在您要过滤记忆召回的维度上设置`tag: true`。** 过滤就是回报；标签噪音就是成本。
- **依靠`description`领域。** 它们直接注入到 LLM 提示中，并且形状提取质量比其他任何东西都重要。描述每个标签 *意思是* 的含义及其适用时间。

一个稳定性说明：从[Hindsight v0.7.0](/blog/2026/05/27/version-0-7-0)开始，用户定义的标签实体不受模糊解析的影响。 `priority:urgent` 永远保持 `priority:urgent` — 它不会被合并者合并到外观相似的实体中。这使得标签可以安全地作为分析作业、警报规则和仪表板中的长期标识符。

---

## A 支持-票证记忆库，端到端 {#a-support-ticket-bank-end-to-end}

放在一起。以下是支持智能体的完整配置，它按四个维度对工单进行分类：

```python
client.update_bank_config(
    bank_id="support",
    entity_labels=[
        {
            "key": "priority",
            "description": "支持请求的紧急程度",
            "type": "value",
            "tag": True,
            "values": [
                {"value": "low"}, {"value": "medium"},
                {"value": "high"}, {"value": "urgent"},
            ],
        },
        {
            "key": "sentiment",
            "description": "工单中客户的情绪基调",
            "type": "value",
            "values": [
                {"value": "frustrated"}, {"value": "neutral"}, {"value": "appreciative"}
            ],
        },
        {
            "key": "product_area",
            "description": "票据涉及哪些产品领域",
            "type": "multi-values",
            "tag": True,
            "values": [
                {"value": "billing"}, {"value": "auth"}, {"value": "dashboard"},
                {"value": "api"}, {"value": "mobile"},
            ],
        },
        {
            "key": "customer",
            "description": "工单中提到的顾客",
            "type": "map",
            "fields": {
                "name":       {"type": "text", "description": "客户或公司名称"},
                "tier":       {"type": "value", "values": [
                    {"value": "free"}, {"value": "pro"}, {"value": "enterprise"}
                ]},
                "account_id": {"type": "text", "description": "帐户或组织 ID"},
            },
        },
    ],
)
```

记忆存储一张票：

```python
client.retain(
    bank_id="support",
    content=(
        "Acme Corp（企业，帐户org_8f4a）报告其结账情况"
        "完全损坏——客户无法处理订单。他们已经"
        "被封锁了40分钟，非常沮丧。"
        "计费仪表板显示正确的计划，但 API 拒绝"
        "每次充电尝试都为 500。"
    ),
)
```

提取完成后，记忆携带以下实体：

```text
priority:urgent
sentiment:frustrated
product_area:billing
product_area:api
customer:name:Acme Corp
customer:tier:enterprise
customer:account_id:org_8f4a
```

…以及这些标签（因为`priority`和`product_area`有`tag: true`）：

```text
["priority:urgent", "product_area:billing", "product_area:api"]
```

现在记忆召回标签：

```python
results = client.recall(
    bank_id="support",
    query="目前哪些紧急问题阻碍了客户？",
    tags=["priority:urgent"],
)
```

查询是语义*和*标签过滤的。您可以获得模型认为相关的所有记忆，仅限于标记为紧急的记忆。添加第二个标签 - `tags=["priority:urgent", "product_area:billing"]` - 过滤器会进一步收紧。

---

## 整个想法 {#the-whole-idea}

自由形式实体提取告诉您LLM注意到了什么。实体标签每次都使用相同的词汇告诉您您的*关心*。添加`tag: true`，词汇表就可以兼作每个记忆的可过滤索引。添加`map`，您可以对丰富的结构化实体进行建模，而无需单独的模式。添加`entities_allow_free_form: false`，您就拥有了一个分析干净的记忆库，没有词汇外的噪音。

对记忆库配置进行了两次更改，没有智能体代码，对每个记忆进行持久分类。这就是整个球场。

---

**进一步阅读：**

- [`entity_labels`参考](https://hindsight.vectorize.io/developer/api/memory-banks#entity-labels) — 完整模式文档
- [地图类型实体标签 (v0.6.1)](/blog/2026/05/08/version-0-6-1) — 结构化主体发货时
- [稳定的用户定义标签实体（v0.7.0）](/blog/2026/05/27/version-0-7-0) — 为什么标签能够在整合中生存下来
- [星座图视图](/blog/2026/04/16/constellation-view) — 查看可视化的标签实体
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
