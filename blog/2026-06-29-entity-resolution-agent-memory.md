---
title: "智能体记忆中的实体消解：一个人，多个名字"
authors: [benfrank241]
slug: "2026/06/29/entity-resolution-agent-memory"
date: 2026-06-29T12:00
tags: [hindsight, entity-resolution, agent-memory, memory, retrieval, knowledge-graph, deep-dive]
description: "智能体记忆如何判断 Sarah、Sarah Chen 和 she 指的是同一个人，以及 Hindsight 为何使用共现图而非嵌入来消解实体。"
image: /img/blog/entity-resolution-agent-memory.webp
hide_table_of_contents: true
---

![Hindsight 智能体记忆中的实体消解](/img/blog/entity-resolution-agent-memory.webp)

大多数智能体记忆系统一旦需要判断两个提及是否指向同一个人，就会调用嵌入模型或 LLM。Hindsight 不这样做。它使用三个成本低、便于检查的信号来消解实体：名称有多相似、它们各自与哪些其他实体一同出现，以及每个实体最近一次出现的时间。

这个选择听起来与 2026 年的主流做法几乎背道而驰。但事实证明，对记忆系统来说这是合适的选择：错误合并比漏掉合并更糟，而且我们希望能解释系统为何认为“Sarah”和“the new PM”是同一条记录。

本文将介绍[智能体记忆](https://vectorize.io/what-is-agent-memory)如何进行实体消解，并以 Hindsight 的实现为具体示例。如果你曾想知道记忆层如何避免让“Sarah”、“Sarah Chen”和 “she” 各自散落在三段互不相连的历史中，下面就是其中的机制。

<!-- truncate -->

## 概要 {#tldr}

- **实体消解** 是判断两个不同的提及（“Sarah”、“Sarah Chen”、“she”）何时指向同一个现实世界实体，并将它们关联起来。
- Hindsight 在提取事实时使用 LLM 提取实体，但**消解**实体时不依赖嵌入或 LLM 判断。
- 消解依据三个信号的加权分数：**名称相似度**（0.5）、**共现重叠度**（0.3）和**时间接近度**（0.2）。分数超过 `0.6`，该提及就会关联到已有实体；否则会创建新实体。
- **共现图**（`entity_cooccurrences`）是关键所在：实体与谁一同出现，可以帮助区分同名的人。
- 系统**有意采取保守的合并策略**，并在检索时借助图，而不是把尚不能确定的记录合并起来。
- 你可以提前提高消解的可靠性：在 Retain 时传入 `context` 字符串，或者将已知的一组实体声明为**枚举实体标签**，让提及通过精确匹配映射到固定词表。

---

## 实体消解的实际含义 {#what-entity-resolution-actually-means}

三个术语经常被混用，但它们的含义不同。**实体提取**是从句子中识别出“Sarah”。**实体消解**是判断这个“Sarah”是否就是上周存入的那个 Sarah。**基于实体的检索**则是智能体收到请求时，利用已消解的身份取回所有相关内容。

记忆系统需要这三者，但最难的是实体消解。实体提取是成熟的 LLM 任务，检索是数据库联结，而实体消解是介于两者之间的判断环节，也是记忆层悄然成败的地方。

判断出错会造成过度合并：两个名叫 Alex 的不同人被并成一条互相矛盾的记录，智能体还自信地向客户讲起内部冲刺。如果往另一个方向出错，则会合并不足：“Sarah”和“Sarah Chen”各自保留为独立实体，因此检索 Sarah 的记忆时会漏掉一半历史。整个工作的目标就是避开这两种情况。

如果你评估记忆系统时关注的不只是检索分数，就值得直接考察实体消解行为。它决定了智能体对某个人的记忆是连贯还是支离破碎。（若想了解更广泛的情况，可以参考[主要框架比较](https://vectorize.io/articles/best-ai-agent-memory-systems)。）

## 显而易见的方法，以及 Hindsight 为何不采用 {#the-obvious-approach-and-why-hindsight-skips-it}

到了 2026 年，常见的第一反应是为每个实体提及生成嵌入，再按余弦相似度合并，或者询问 LLM：“这两者是同一个人吗？”这两种方法都有效，也各有优势：嵌入能捕捉字符串匹配遗漏的语义等价关系，LLM 则能结合上下文进行打分机制无法完成的推理。

但它们也有一些故障模式，在记忆系统中比在搜索系统中影响更大。嵌入相似度是个黑箱：如果它错误地把 “Apple the customer” 和 “Apple the fruit reference” 合并，你很难看出原因，也无法在不重新生成嵌入的情况下调整行为。每个实体、每条事实都调用一次 LLM，速度慢且结果不确定；它偶尔会不可预测地认定两个陌生人是同一个人。

Hindsight 针对另一种属性进行优化：**错误合并应该少见、易于调试，而且绝不能悄无声息地发生。**因此，实体消解依赖工程师可以直接检查的信号。这里的取舍很明确：嵌入能捕捉到本方法遗漏的一些等价关系，但遗漏的后果较安全（出现重复记录）；避免的错误则很危险（记录遭到破坏）。

## 三个信号 {#the-three-signals}

一条新事实进入系统时，其中提取出的每个实体都会与同一记忆库中的现有实体进行匹配。对于每个候选实体，Hindsight 都会计算加权分数：

```python
score  = name_similarity      * 0.5   # difflib SequenceMatcher，取值 0–1
score += cooccurrence_overlap * 0.3   # 图中的共享邻居
score += temporal_proximity   * 0.2   # 时间接近度，7 天窗口内

if best_score > 0.6:
    resolve_to(best_candidate)        # 同一实体
else:
    create_new_entity()               # 创建新记录
```

**名称相似度（权重 0.5）**使用 Python 的 [`difflib.SequenceMatcher`](https://docs.python.org/3/library/difflib.html)，即简单的字符串比率比较。“Sarah”与“Sarah”比较得分为 1.0；“Sarah”与“Sarah Chen”比较得分接近 0.7。候选项通过 PostgreSQL 的 [`pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html) 三元组索引获取，因此大型记忆库对每次提及只需返回少量模糊匹配项，无需全表扫描。

**共现重叠度（权重 0.3）**最值得关注，下一节将专门讨论它。

**时间接近度（权重 0.2）**会让实体消解倾向于最近出现过的实体。如果匹配名称上次出现是在两天前，它就能获得大部分时间权重；如果上次出现是在六个月前，获得的时间权重就几乎为零。你近期频繁谈论的人，更有可能是你当前指的人。

`0.6` 阈值控制着消解的保守程度。一个提及必须在这些信号上达到明确门槛，才会与已有记录合并。达不到时，Hindsight 会创建新实体而不是猜测，因为重复记录可以补救，错误合并则不行。

## 共现图帮助消歧 {#the-co-occurrence-graph-does-the-disambiguation}

仅靠名称相似度无法区分两个名叫 Alex 的人，共现图可以。

Hindsight 维护一张 `entity_cooccurrences` 表：每当两个实体出现在同一条事实中，它们的配对计数就会增加。经过几周的对话，这张表会逐渐形成一幅地图，显示谁常与谁一同出现。实体消歧主要依靠这张地图。

下面的场景能说明这一点。你的记忆库中有两个 Alex。一个是**前端团队的 Alex**，常与 “React”、“Sprint 14” 和 “the staging deploy” 一同出现；另一个是**Acme 的 Alex**，一位客户，常与 “the renewal”、“the SOC 2 review” 和 “Acme” 一同出现。名称相同，但他们在图中的邻域截然不同。

系统收到一条新事实：“Alex flagged a blocker on the Acme renewal.”提及“Alex”会按名称匹配到这两个候选人。它们的名称相似度相同，都是 1.0。但这条事实还提到了“Acme”和“the renewal”，与客户 Alex 的共现重叠度很高，而与工程师 Alex 的重叠度为零。图的 0.3 权重打破了平局，于是这条事实关联到了正确的 Alex。

只看名称，嵌入也无法做到这一点，因为名称完全相同。用于消解的信号并非实体“是什么”，而是它“附近有什么”。大多数“只用嵌入就行”的设计都没有利用这一点。

## 已消解实体如何增强检索 {#how-resolved-entities-power-retrieval}

如果实体消解不会改变智能体能检索到的内容，那它就只是纸上谈兵。它会驱动实体链接扩展，也就是 Hindsight 并行[混合检索](/blog/2026/03/27/parallel-hybrid-search)中的实体检索分支。

查询找到一组种子事实后，Hindsight 会收集其中的实体，再沿这些实体查找所有提及相同实体的其他事实，并按候选事实与种子事实共享的实体数量评分。比如查询 “what's the status of the Acme renewal”，先找到几条种子事实，扩展过程就会找出所有涉及 Acme 的 Alex、the renewal 和 the SOC 2 review 的其他事实，包括从未出现 “status” 一词的事实。

这就是实体消解质量会不断累积提升的原因。每个正确消解的提及都会加深事实之间的联系，因此检索只需较少提示就能找到更多相关历史。实体链接还会与语义、因果和[时间感知](/blog/2026/03/12/spreading-activation-memory-graphs)链接并行工作，而不是取代它们，因此漏掉的实体匹配通常能由其他策略弥补。

## 如何确保实体得到正确消解 {#how-to-make-sure-entities-resolve}

消解器在设计上采取保守策略，因此有时会把你希望合并的两条记录分开。当消解准确性很重要时，你可以使用两个杠杆，而且它们都会在评分开始之前、提取阶段发挥作用。它们远比寄希望于名称相似度超过 0.6 可靠。

### 为提取器提供上下文 {#give-the-extractor-context}

每次 Retain 调用都可以在内容旁边附带一个可选的 `context` 字符串。它会直接加入提取提示，并在判断谁说了什么、做了什么时优先于模型默认值。

这对文字记录和多人文本尤其重要，因为单独看时，“我”“她”和“客户”都可能指代不明。告诉提取器有哪些人在场，第一人称陈述就会归到正确的人名下，而不是默认归给智能体。提取出的实体已经指向你指定的人，后续消解就无需做太多猜测。

```python
client.retain(
    content=transcript,
    context="Support call between agent Maria Lopez and customer John Doe (Acme).",
)
```

### 在枚举模式下使用实体标签 {#use-entity-labels-in-enum-mode}

如果你已经知道完整人员名单、项目成员、产品目录或支持分类，就不必让消解器重新发现这些值。将这些值声明为记忆库 `entity_labels` 配置中的**实体标签**，提取过程便会被限制为将每个提及映射到其中一个值。

在底层，`value` 类型的标签会编译为仅包含允许值的 Pydantic `Literal[...]`，因此模型无法返回列表之外的值。标签实体通过**精确匹配**消解，而不是模糊评分。“Sarah”、“Sarah Chen”和“she”都会映射到你定义的同一个规范值，完全不受 `0.6` 阈值影响。

```json
{
  "entity_labels": {
    "attributes": [
      {
        "key": "person",
        "type": "value",
        "values": [
          { "value": "sarah-chen", "description": "Eng lead, frontend" },
          { "value": "alex-kim",   "description": "PM, growth" }
        ]
      }
    ]
  }
}
```

枚举模式是 Hindsight 提供的最可靠实体消解手段。但它只适用于已知且范围有限的集合：固定团队或有限目录很适合，随着工作逐渐发现成员的开放式人员集合则不适合。对于开放式情况，`context` 字段配合共现图才是合适工具。（如果你已在上游识别出实体，也可以通过 Retain 调用中的 `entities` 字段直接传入。）

## 数据模型简述 {#the-data-model-briefly}

三张表支撑着整个系统，值得了解一下，因为它们简单得令人耳目一新：

- **`entities`** 为每个规范实体保存一行：`canonical_name`、`mention_count`、`first_seen`、`last_seen`，以及用于在数据库层执行不区分大小写去重的 `UNIQUE (bank_id, LOWER(canonical_name))` 约束。
- **`unit_entities`** 是联结表，以多对多方式将事实映射到其中提及的实体。
- **`entity_cooccurrences`** 是图，包含 `(entity_id_1, entity_id_2, cooccurrence_count, last_cooccurred)`，并设有 `CHECK (entity_id_1 < entity_id_2)`，确保每对实体只存储一次。

这里没有外部图数据库，也没有单独的实体向量存储。存储层仍是保存其他所有内容的嵌入式 PostgreSQL，因此自托管只需运行一条 Docker 命令。

## 工程实现中的真实取舍 {#the-engineering-honesty-section}

营销图表里不会展示的部分，往往才是真正的工程工作所在。

**标签有意采用精确匹配消解。**像 `pedagogy:scaffolding` 这样的受控词表实体会完全跳过模糊匹配，因为三元组相似度可能会把两个不同的标签值合并，从而悄悄破坏分类体系。这个边界情况来自一个真实缺陷。

**Unicode 小写转换容易踩坑。**Python 的 `str.lower()` 和 PostgreSQL 的 `LOWER()` 对土耳其语带点字母 İ 的处理并不一致：Python 会生成两个字符，Postgres 则生成一个。如果应用程序一侧和数据库一侧分别执行小写转换，“İstanbul”与自身匹配时就可能失败。Hindsight 在比较时让数据库执行小写转换，使两侧结果一致。

**并发 Retain 会发生竞争。**两个工作进程可能同时尝试创建同一个实体。新实体通过 `INSERT ... ON CONFLICT DO NOTHING` 写入，随后执行 `SELECT` 找出成功写入的那一行，因此竞争最终只会创建一个实体，不会产生两个实体或报错。提及计数和共现更新会延后，并按固定锁定顺序刷新，以避免死锁。

## 它不会做什么 {#what-it-doesnt-do}

坦诚说明边界比列举功能更重要。

Hindsight 不会追溯合并规范实体。如果“Sarah”和“Sarah Chen”最终成为两条记录，之后共同出现只会加强它们之间的图连接，不会将它们合并为一条记录。系统也没有实体拆分操作：如果两个真人早先被错误合并，系统没有内置方法把他们分开。此外，系统没有别名表；实体身份来自名称和图结构，而非人工维护的映射关系。

这些都是经过权衡的选择，并非疏忽。追溯合并和拆分正是可能在批量操作中引发灾难性错误的操作。采取保守路径——宁可保留重复记录，在读取时借助图——可以让故障模式保持简单。如果你的用例需要积极规范化，这确实是考虑其他系统的合理理由；Hindsight 优先避免破坏记忆。

## 如何自行查看 {#how-to-look-at-it-yourself}

如果你正在运行 Hindsight，可以直接查询实体表：`mention_count` 会显示哪些实体在记忆库中最常出现，`entity_cooccurrences` 则会显示实体邻域。这是检查智能体实际上如何理解世界的一种好方法。你可以[自行托管整个系统](/developer/installation)并检查图，也可以从云服务的免费套餐开始。

## 常见问题 {#frequently-asked-questions}

**Hindsight 会使用嵌入进行实体消解吗？**

不会。系统其他部分会使用嵌入进行语义检索，但实体消解本身依赖字符串相似度、共现图和时间近期性。目标是实现可调试的保守合并，而不是最大化召回率。

**它如何区分两个同名的人？**

看他们的邻居。共现图会记录哪些实体一同出现，因此即使名称完全相同，“Acme”附近的“Alex”也会与“Sprint 14”附近的“Alex”对应到不同记录。

**系统不确定时会怎样？**

它会创建新实体。只有加权分数超过 `0.6` 时，实体消解才会执行合并。重复记录容易处理；错误合并会破坏智能体对某个人的记忆，因此系统宁可犯较安全的错误。

**如何确保系统合并的是正确实体？**

有两个杠杆，都在提取阶段发挥作用。Retain 时传入 `context` 字符串（它会告诉提取器有哪些人参与，并优先用于归因）；已知人员名单时，则把这些值声明为枚举实体标签，让提及通过精确匹配映射到固定词表。这两种方法都比事后依赖名称相似度评分更可靠。

**如果系统后来得知两条记录其实指向同一个人，能否再把它们合并？**

不会自动合并。两条记录之间的共现连接会加强，这有助于检索同时找到它们，但 Hindsight 不会追溯合并规范实体，也没有实体拆分操作。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：介绍提取、实体消解和召回的基础概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：比较主要框架。
- [我们如何解决 Hindsight 中的记忆冲突](/blog/2026/02/09/resolving-memory-conflicts)：说明已消解事实发生冲突时会怎样。
- [通过实体标签自动标记实体](/blog/2026/06/02/entity-labels-automatic-memory-tagging)：介绍实体的受控词表机制。
