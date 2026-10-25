---
title: "指南：让 SmolAgents 的记忆跨运行持久保存"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, smolagents, memory]
description: "借助 Hindsight 为 SmolAgents 提供跨运行记忆，让执行代码的智能体能够积累有效和失败的经验，而不必在每次运行时从头开始。"
image: /img/guides/guide-smolagents-memory-across-runs.svg
hide_table_of_contents: true
---

![指南：让 SmolAgents 的记忆跨运行持久保存](/img/guides/guide-smolagents-memory-across-runs.svg)

SmolAgents 的运行彼此独立。每次调用 `agent.run(...)` 都会启动智能体、进行推理、执行代码并返回，之后它学到的一切便会消失。本指南要解决的具体问题是**让记忆跨运行持久保存**：为代码执行智能体提供持久存储，使其能够积累任务相关事实、记住哪些方法有效，并避开已经遇到过的失败，而不必在每次新运行时重新发现这些内容。

Hindsight 很适合解决这个问题，因为 SmolAgents 集成会将记忆封装为原生 `Tool` 子类。智能体可以调用 `hindsight_retain`，存下自己在一次运行中学到的内容；新的运行则可以先召回此前运行发现的信息。让每次运行都指向同一个稳定的记忆库 ID，记忆就能延续下去。本指南不再重复设置流程，因为完整的设置指南已经存在；这里重点介绍在此基础上如何积累跨运行记忆。

本指南将介绍为什么每次运行的智能体都会从零开始、一次运行中有哪些内容值得存入记忆、如何在新运行开始时召回过去运行的记忆，以及如何接入现成的 `Tool` 子类来形成完整循环。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-smolagents` 并将其连接到 Hindsight（参见设置指南）。
> 2. 为同一个智能体、用户或项目的每次运行使用**稳定的记忆库 ID**。
> 3. 添加 `create_hindsight_tools(bank_id=...)`，让智能体可以存入和召回记忆。
> 4. 每次运行开始时，通过 `memory_instructions()` 注入过去运行的记忆。
> 5. 验证后续运行能否根据较早运行存入的事实作答。

## 为什么每次运行的智能体都会从零开始 {#why-per-run-agents-start-cold}

SmolAgents 智能体在一次运行**内部**拥有记忆：推理步骤、工具观测和中间代码状态都保存在智能体循环中。但这些状态只在本次运行内有效。下一次调用 `agent.run(...)` 时，智能体会从空白状态开始。

对于执行代码的智能体来说，这会带来不小的成本。第一次运行时，它可能发现某个库需要固定到特定版本、某个 API 会分页返回结果，或者某种方法会抛出异常而另一种方法可行。到了第二次运行，这些发现全都不复存在。智能体只能重新探索、再次失败，并重新推导同样的事实，把 token 和实际耗时花在它已经掌握的知识上。

跨运行记忆可以打破这个循环。持久存储会让智能体学到的内容跨越运行边界继续保留，并将有用的经验传递下去：事实、行之有效的方法，以及值得避开的死路。

## 一次运行中有哪些内容值得存入记忆 {#what-to-retain-from-a-run}

一次运行中的内容并非都值得保留。运行记录往往很嘈杂，真正有价值的是能长期复用的经验。适合交给 `hindsight_retain` 的内容包括：

- **任务相关事实**：智能体必须自行发现的信息，例如模式结构、所需的版本固定值、端点的特殊行为，以及凭据的位置（绝不要保存凭据本身）。
- **成功的方法**：例如，“使用 `pandas.read_csv(..., sep=';')` 解析 CSV 成功了，而默认分隔符解析失败。”
- **失败的方法**：例如，“调用端点时不分页会在 100 行处截断”，这样下一次运行就不会重蹈覆辙。
- **运行期间由智能体或用户确定的决策和约定**。

可以让智能体在遇到这些情况时调用 `hindsight_retain`，也可以在运行结束时存入提炼后的总结。重点是保存**经验**，而不是原始的逐步过程记录。Hindsight 会在摄取时提取并整合事实，因此简短、具体的陈述最适合存入记忆。有关底层行为，请参阅 [Hindsight 的 Retain API](/developer/api/retain)。

## 在新运行开始时召回过去运行的记忆 {#recall-prior-runs-at-the-start-of-a-new-one}

新的运行应该一开始就能利用过去运行学到的内容。可以通过两种互补的方式提供这些上下文：

- **用 `memory_instructions()` 预先加载。** 在运行开始前，预先召回最相关的记忆并将其注入系统提示。智能体从一开始就能在上下文中获得过去的经验，并据此规划：

  ```python
  from hindsight_smolagents import create_hindsight_tools, memory_instructions
  from smolagents import CodeAgent, HfApiModel

  BANK = "code-agent-project-x"

  memories = memory_instructions(
      bank_id=BANK,
      query="prior approaches, failures, and task facts for this project",
  )

  agent = CodeAgent(
      tools=create_hindsight_tools(bank_id=BANK),
      model=HfApiModel(),
      system_prompt=f"You are a coding agent.\n\n{memories}",
  )
  ```

- **通过 `hindsight_recall` 按需召回。** 由于记忆召回也是一种工具，当智能体遇到预先注入的上下文未涵盖的问题时，可以在运行期间搜索记忆。这样既能控制早期上下文的规模，也能让智能体访问完整的存储内容。

每次运行都使用**相同的 `bank_id`**，才能实现这一点：记忆库将不同运行串联起来。有关底层行为，请参阅 [Hindsight 的 Recall API](/developer/api/recall)。

## 将 SmolAgents 连接到 Hindsight {#connect-smolagents-to-hindsight}

只需安装并连接一次即可。设置指南已完整介绍这些步骤，因此本指南不再重复：

```bash
pip install hindsight-smolagents
```

将它指向 Hindsight Cloud 或本地服务器，然后即可继续。完整的安装和连接流程（包括 `configure()` 和自托管方式），请参阅**[指南：使用 Hindsight 为 SmolAgents 添加持久记忆](/guides/2026/05/04/guide-smolagents-memory-with-hindsight)**。

## 智能体可以直接调用的记忆工具 {#drop-in-memory-tools-your-agent-can-call}

该集成提供了三个原生 `Tool` 子类，因此智能体使用记忆的方式与使用其他工具相同。通过工厂函数创建这些工具：

```python
from hindsight_smolagents import create_hindsight_tools

tools = create_hindsight_tools(bank_id="code-agent-project-x")
```

这会为智能体提供以下工具：

- **`hindsight_retain`**：将事实、经验或决策存入长期记忆。
- **`hindsight_recall`**：在长期记忆中搜索相关的过往事实。
- **`hindsight_reflect`**：根据已存储的记忆综合生成经过推理的答案。

你可以只加入需要的工具。对于跨运行积累记忆的循环，存入和召回是必需的；如果你需要综合答案而非原始事实，反思也很有用：

```python
tools = create_hindsight_tools(
    bank_id="code-agent-project-x",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,
)
```

如果你希望单独实例化工具，`HindsightRetainTool` 和 `HindsightRecallTool` 接受相同的 `bank_id`。[集成文档](/sdks/integrations/smolagents)列出了所有参数，包括用于限定范围的标签和记忆召回预算。

## 验证记忆是否能跨运行持久保存 {#verify-memory-persists-across-runs}

验证方法很简单：证明第二次运行知道只有第一次运行才可能学到的信息。

1. 在第一次运行中，让智能体解决一个任务，并调用 `hindsight_retain` 存入一条具体经验，例如：“导出端点每页返回 100 行，因此始终传入 `page`。”
2. 等待本次运行结束。存入的内容会保存到记忆库中。
3. 开始第二次运行，并使用**相同的 `bank_id`**；然后通过 `memory_instructions()` 预先注入记忆，或者提出一个应该触发 `hindsight_recall` 的问题。
4. 询问智能体有关该分页行为的信息，或观察它能否据此规划而无需重新发现这一点。

如果第二次运行根据第一次运行存入的事实作答，说明跨运行记忆正常工作。如果它仍从零开始，请检查两次运行是否使用了相同的记忆库 ID，以及存入调用是否确实完成。

## 常见错误 {#common-mistakes}

### 每次运行都使用不同的记忆库 ID {#using-a-different-bank-id-per-run}

记忆库负责将不同运行串联起来。如果每次运行都生成新的记忆库 ID，内容就无法持久保存。为智能体、用户或项目固定使用一个稳定的 ID。

### 存入原始运行记录 {#retaining-the-raw-transcript}

保存完整的逐步过程记录，会让经验淹没在噪声中。应改为存入简短、具体的事实和决策，之后召回时才更容易找到有用内容。

### 添加工具，却从不注入上下文 {#adding-tools-but-never-injecting-context}

为智能体提供 `hindsight_recall` 后，它可以按需搜索记忆；但除非同时注入 `memory_instructions()`，否则每次运行开始时都不会自动获得过去的上下文。两者配合使用，才能可靠地温启动。

### 在存入完成前测试召回 {#testing-recall-before-retain-completes}

如果第一次运行的存入操作尚未完成，你就检查第二次运行，记忆可能还没有保存。请等第一次运行完成后，再确认第二次运行是否记得相关内容。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需将工具指向本地 API URL。连接详情请参阅设置指南。

### 智能体如何决定何时存入记忆？ {#how-does-an-agent-decide-when-to-retain}

智能体像调用其他工具一样调用 `hindsight_retain`。你可以提示它在适当时机存入经验，也可以在运行结束时自行存入提炼后的总结。保存经验，而不是原始过程记录。

### 这会拖慢每次运行吗？ {#does-this-slow-down-every-run}

使用 `memory_instructions()` 预先加载会在运行前增加一次记忆召回，并通过 `max_results` 和 `max_tokens` 限制注入的上下文。按需调用的 `hindsight_recall` 只会在智能体选择调用时运行。

### 这只适用于 CodeAgent 吗？ {#is-this-limited-to-codeagent}

不只如此。这些工具遵循 SmolAgents 的工具模型，因此任何接受工具的智能体都能使用相同的跨运行记忆模式。

## 后续步骤 {#next-steps}

- 从完整的 [SmolAgents 设置指南](/guides/2026/05/04/guide-smolagents-memory-with-hindsight)开始
- 试用托管记忆后端 [Hindsight Cloud](https://hindsight.vectorize.io)
- 阅读[完整的 Hindsight 文档](/)
- 查看[快速入门指南](/developer/api/quickstart)
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [SmolAgents 集成文档](/sdks/integrations/smolagents)
