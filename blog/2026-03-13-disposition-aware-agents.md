---
title: "我们如何构建实际上具有不同思考方式的性格感知智能体"
authors: [chrislatimer]
date: 2026-03-13T12:00
tags: [disposition, personality, skepticism, empathy, reflect, agents, deep-dive]
image: /img/blog/disposition-aware-agents.webp
---

![Hindsight — 性格感知智能体](/img/blog/disposition-aware-agents.webp)

当我们开始赋予[Hindsight](https://ui.hindsight.vectorize.io)驱动的智能体“个性”时，我们并没有试图发明另一层即时角色扮演。 AI智能体个性的标准方法——长长的“保持怀疑”、“同理心”、“字面意思解释”——是脆弱的、难以维护的，并且无法在与实际工作负载的接触中生存。我们想要一些更小、更具架构性的东西：系统中融入一些特征，静静地改变智能体的思维方式，而不仅仅是它如何表达答案。

<!-- truncate -->

我们最终得到的是一个三数性格模型：怀疑主义、字面主义和同理心。我们使用它们来产生不同的智能体推理风格，而无需变成额外提示文本的段落。

## 问题：每项工作都有一个AI智能体推理风格 {#the-problem-one-ai-agent-reasoning-style-for-every-job}

大多数系统为您提供一种内部推理风格，并要求您在所有事情上重用它：

- A **事实检查器** 应该积极寻找矛盾。
- A **法律助理** 必须按字面解释语言。
- A **咨询智能体** 应该非常关心情感背景。
- A **创意伙伴** 应该说“是的，并且……”而不是“实际上……”

标准的解决方法是堆叠指令：

```text
“对所有主张持怀疑态度。质疑来源。寻找矛盾......”
“从字面上解释一切。不要做出假设......”
“要有同理心。考虑情感背景……”
```

那种即时工程：

- **使系统提示变得臃肿。**
- **很容易被覆盖**或与特定任务指令冲突。
- **无法缩放** 当你想要数十种不同的智能体“角色”时。

我们希望能够用三个数字表达“这个记忆库的智能体是怀疑的、字面的、低同理心的”，然后让架构来做剩下的事情。

## 三特质性格模型 {#the-three-trait-disposition-model}

我们最终得到了三个特征，每个特征都有 1-5 级：

### 怀疑论 (1-5) {#skepticism-1-5}

- **1 – 信任**：以表面价值获取信息，假定善意。
- **3 – 平衡**：正常的批判性思维。
- **5 – 高度怀疑**：寻找不一致之处，喜欢多种来源，接受声明较慢。 （相关：[Hindsight如何解决记忆冲突](/blog/2026/02/09/resolving-memory-conflicts)。）

### 写实主义（1-5） {#literalism-1-5}

- **1 – 解释**：字里行间，轻松推理。
- **3 – 平衡**：将文字阅读与推理相结合。
- **5 – 高度字面意义**：严格遵守所陈述的内容，避免假设。

### 同理心（1-5） {#empathy-1-5}

- **1 – 独立**：针对正确性而非感受进行优化。
- **3 – 平衡**：同时考虑事实和情感背景。
- **5 – 高度同理心**：严重衡量人类影响和情绪状态。

这三个数字存在于[记忆库简介](/developer/retrieval)中，并且永远不会显示为“做X，不做Y”规则。

## 为什么有这三个特征和 1-5 等级？ {#why-these-three-traits-and-a-1-5-scale}

我们尝试了更丰富的个性空间（包括完整的[大五](https://en.wikipedia.org/wiki/Big_Five_personality_traits)向量），结果发现，对于我们实际需要的那种推理控制，几乎所有东西都折叠到三个轴上：

- **信任与验证→怀疑**
  智能体应该多快接受主张而不是要求更多证据？
- **字面阅读与解释性阅读 → 字面主义**
  允许超出精确文本进行推理的程度如何？
- **抽象正确性与人类影响→同理心**
  它应该在多大程度上考虑人们的感受、历史和背景？

这些尺寸是：

- **足够正交** 区分真实角色（事实核查员、顾问、法律助理、创意合伙人）。
- **足够小** 您可以在头脑中而不是电子表格中推理它们。

我们使用 1-5 整数范围而不是连续浮点数，因为：

- **清晰可见**：“怀疑=4”很容易阅读和讨论。
- **可调**：您可以感受到2和4之间的差异，而不必担心0.73和0.76。
- **稳定**：自由度越少意味着奇怪的行为边缘情况就越少。

早期的内部版本使用大五风格向量；我们现在深入研究这三个特征并只暴露它们。通过适合JSON记忆库配置的界面，您可以在重要的地方保留大部分表达能力（智能体如何推理）。

## 智能体倾向如何塑造推理和记忆检索 {#how-agent-disposition-shapes-reasoning-and-memory-retrieval}

关键的设计选择：我们不会将这些特征转化为更多的指令。我们将它们作为元数据显示，并让堆栈的其余部分做出响应。

### 1。作为元数据的配置，而不是讲座 {#1-disposition-as-metadata-not-a-lecture}

我们将系统提示中的处置作为记忆库上下文的一部分，而不是作为行为块：

```python
def build_agent_prompt(query: str,
                       context_history: list[dict],
                       bank_profile: dict,
                       additional_context: str | None = None):
    parts = []

    name    = bank_profile.get("name", "Assistant")
    mission = bank_profile.get("mission", "")

    parts.append(f"## 记忆库上下文\nName: {name}")
    if mission:
        parts.append(f"Mission: {mission}")

    disposition = bank_profile.get("disposition", {})
    if disposition:
        traits = []
        if "skepticism" in disposition:
            traits.append(f"skepticism={disposition['skepticism']}")
        if "literalism" in disposition:
            traits.append(f"literalism={disposition['literalism']}")
        if "empathy" in disposition:
            traits.append(f"empathy={disposition['empathy']}")
        if traits:
            parts.append(f"Disposition: {', '.join(traits)}")

    #...添加工具说明、查询等...
```

现代模型非常擅长捕捉这种上下文线索。 `Disposition: skepticism=5, literalism=4, empathy=2` 足以让模型调整其搜索方式、谨慎程度以及得出结论的方式。

### 2。记忆层次结构的不同导航 {#2-different-navigation-of-the-memory-hierarchy}

Hindsight暴露了[三层记忆堆栈](/blog/2026/03/12/spreading-activation-memory-graphs)：

- **心智模型** — 人工撰写或策划的摘要。
- **观察**——从原始记忆中获得的巩固知识。
- **原始事实** — 个人记忆/事件，真理的权威来源。

提示告诉智能体每一层的用途；配置改变了它在堆栈中上下移动的积极程度：

- **高度怀疑** → 经常深入研究原始事实，更多地交叉检查心智模型和观察。
- **高度字面主义** → 更重视原始事实和精确观察，更轻地使用解释性心智模型。
- **高度同理心** → 偏爱捕捉人、人际关系和情感模式的心智模型和观察。

相同的工具，不同的使用“习惯”。

### 3。具有不同习惯的工具驱动循环 {#3-tool-driven-loops-with-different-habits}

当智能体使用反思时，它们不需要从预先填充的上下文开始。他们从工具开始：`search_mental_models`、`search_observations`、`recall`、扩展函数等。配置通过记忆库配置文件进行：

```python
async def run_reflect_agent(
    llm_config: LLMProvider,
    bank_id: str,
    query: str,
    bank_profile: dict[str, Any],  #包括处置
    search_mental_models_fn,
    search_observations_fn,
    recall_fn,
    expand_fn,
    ...
):
    #推理循环：决定调用哪些工具、以什么顺序、多久调用一次。
```

实践中：

- **怀疑↑** → 更多的工具调用，更多的“验证”步骤，更长的推理链。
- **写实主义↑** → 更窄、更精确的查询；投机扩张较少。
- **同理心↑**→更多地使用用户历史记录、关系记忆和“软”上下文。

我们不会硬编码该行为；它是将这些特征与一致的工具表面相结合而产生的。

## 智能体个性档案：相同的代码，不同的推理 {#agent-personality-profiles-same-code-different-reasoning}

这些只是JSON配置，但它们产生明显不同的推理风格：

|简介|怀疑论|字面主义|同理心|典型行为|
|---------|-----------|-----------|---------|-----------------|
|**事实检查器**|5|4|2|频繁调用原始事实工具，标记过时的观察结果，使用谨慎的语言并明确提出警告|
|**辅导员**|2|2|5|接受用户的框架，解读对话历史中的字里行间，优化情感验证|
|**法律助理**|3|5|2|引用记忆中的准确文本，避免推断未表述的意图，专注于精确的文档式推理|
|**创意伙伴**|1|1|4|对想法说“是的，并且……”，从松散相关的记忆中汲取灵感，关心情感共鸣|

它们全部运行在相同的代码路径上。唯一的区别是三个整数。

## 行动中的性格：同一个问题，两种不同的智能体 {#disposition-in-action-the-same-question-two-different-agents}

为了具体说明这一点，以下是两个具有不同配置的智能体如何针对相同的记忆库处理相同的查询：

**查询**：“团队准备好下周的产品发布了吗？”

**智能体A**（怀疑主义=2，字面主义=2，同理心=4）：
> 根据团队最近的更新，事情看起来步入正轨。莎拉上周四提到感觉自己很疲惫——可能值得直接与她联系。营销资产已完成，工程部门昨天关闭了最后一个障碍。该团队似乎谨慎乐观。

**智能体B**（怀疑主义=5，字面主义=4，同理心=2）：
> 截至昨天，五个启动清单项目中的三个已标记为完成。其中两个仍处于开放状态：QA 签核（最后更新于 3 天前，此后状态没有更改）和合作伙伴通知电子邮件（分配给 Sarah，未记录完成情况）。我在原始事实中找不到确认的质量检查完成情况。建议在确认准备就绪之前进行验证。

同样的回忆。相同的工具。相同型号。不同的性格，不同的答案——两者都有用，具体取决于提问者和原因。

## 多智能体系统中的配置感知智能体 {#disposition-aware-agents-in-multi-agent-systems}

一旦配置达到一流，连接智能体合奏就变得很容易：

- A **怀疑检查器** 可以审查创造性或乐观的智能体的输出。
- A **高同理心智能体** 可以处理面向用户的交互，而低同理心、高文字主义的智能体则处理内部推理。
- 您可以**将查询展开**进行多种配置并并排展示他们的观点。

你不需要为每个单独的提示或模型；您只需改变配置并重用相同的基础设施即可。 （具体示例请参见我们如何在 [我们的CrewAI集成](/blog/2026/03/02/crewai) 中进行连接。）

## 调优指导：选择正确的配置 {#tuning-guidance-picking-the-right-disposition}

如果您要建立一个新的记忆库智能体，请从以下起点开始：

- **客户支持**：怀疑=2，字面主义=3，同理心=4——信任客户，足够精确以提供帮助，关心他们的体验。
- **研究助理**：怀疑主义=4，字面主义=3，同理心=2——验证主张，允许一些推论，优先考虑准确性而不是感觉。
- **执行简报**：怀疑主义=3、字面主义=4、同理心=3——平衡验证、贴近事实、适度的组织动态意识。

从中点（3,3,3）开始，一次调整一个特性。只需几次查询，您就会感受到差异。如果你想在本地尝试一下，[以下是如何使用Ollama运行Hindsight](/blog/2026/03/10/run-hindsight-with-ollama)。

## 为什么基于特质的AI智能体人格有效 {#why-trait-based-ai-agent-personality-works}

我们并没有通过编写更聪明的指令来获得独特的智能体“个性”。我们通过以下方式获得它们：

1. **选择三个特质** 严格控制智能体如何对待证据、推理和人类背景。
2. **将这些特征编码为紧凑元数据** 而不是庞大的指令。
3. **让我们的[记忆层次与工具驱动循环](/developer/retrieval)**给这些特质留出改变行为的空间。

结果：智能体不仅听起来不同，实际上它们处理记忆的方式也不同，这有助于智能体按照你想要的方式行事。

---

*Hindsight 为您的AI智能体提供持久、塑造的记忆以及认知推理。 [了解 Hindsight 的工作方式](/developer/retrieval)，或[免费开始使用](https://ui.hindsight.vectorize.io)。*
