---
title: "指南：为 SmolAgents 提供在运行过程中持续存在的记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, smolagents, memory]
description: "为 SmolAgents 提供与 Hindsight 的交叉运行记忆，因此执行代码的智能体会积累有效和失败的内容，而不是在每次运行时都冷启动。"
image: /img/guides/guide-smolagents-memory-across-runs.svg
hide_table_of_contents: true
---

![指南：为 SmolAgents 提供跨运行持久记忆](/img/guides/guide-smolagents-memory-across-runs.svg)

SmolAgents 以离散运行的方式运行。每个`agent.run(...)` 旋转、推理、执行代码并返回——然后它学到的一切都消失了。本指南解决的独特问题是 **跨运行持久保存的记忆**：为代码执行智能体提供持久存储，以便它积累特定于任务的事实，记住哪些方法有效，并避免它已经遇到的失败 - 而不是在每次新运行时重新发现所有这些。

Hindsight完全符合这一点，因为 SmolAgents 集成将记忆公开为本机工具子类。智能体可以调用`hindsight_retain` 存储在运行过程中学到的内容，新的运行可以通过回忆之前运行发现的所有内容来开始。每次运行都指向相同的稳定记忆库 ID 并继续记忆。这不是设置重复 - 完整的设置指南已经存在，并且该指南重点关注其之上的交叉运行累积模式。

本指南涵盖了为什么每次运行的智能体开始冷，运行中实际上值得保留的内容，如何在新的运行开始时记忆召回先前的运行，以及如何连接插入工具子类以便循环自行关闭。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-smolagents` 并将其连接到Hindsight（请参阅设置指南）。
> 2.使用**稳定记忆库 ID** 同样  每次跑步都agent/user/project。
> 3.添加`create_hindsight_tools(bank_id=...)`因此智能体可以记忆存储和记忆召回。
> 4.通过使用 注入之前的运行来开始每次运行 `memory_instructions()`。
> 5.验证稍后的运行是否使用先前运行存储的事实进行回答。

## 为什么每次运行的智能体开始冷 {#why-per-run-agents-start-cold}

SmolAgents智能体有记忆*以内*一次运行——它的推理步骤、工具观察和中间代码状态存在于智能体循环中。但该状态仅限于运行。下一个`agent.run(...)` 从一块空白的石板开始。

​​对于昂贵的代码执行智能体。在运行一次时，它可能会发现一个库需要特定的版本引脚，API返回分页结果，或者一种特定的方法抛出而另一种方法有效。在第二轮中，这些都不存在。智能体重新探索、重新失败并重新得出相同的事实——在它已经拥有的知识上燃烧token和挂钟时间。

交叉运行记忆打破了这个循环。持久存储不会在运行边界中抹去智能体学到的知识，而是将有用的残留物向前推进：事实、工作方法和值得避免的死胡同。

## 跑步中记忆存储的内容 {#what-to-retain-from-a-run}

并不是跑步中的所有事情都值得保留。文字记录有噪音；价值在于持久的教训。 的好候选人 `hindsight_retain`：

- **任务特定事实** 智能体必须发现——模式形状、所需版本引脚、端点怪癖、凭证位置（本身绝不是秘密）。
- **成功的方法** — “用 解析 CSV `pandas.read_csv(..., sep=';')` 在默认分隔符失败的地方成功了。”
- **失败的方法** —“调用不分页的端点会在 100 行处截断”，因此下一次运行不会重复它。
- ​​ **决策与约定** 智能体或用户在运行过程中确定的位置。

让智能体来电`hindsight_retain` 当它到达这些时刻之一时，或者记忆存储在跑步结束时的蒸馏摘要。重点是存储*课程*，不是原始的逐步跟踪。Hindsight提取并巩固摄取的事实，因此简短、具体的陈述记忆存储最好。对于较低级别的行为，请参阅 [Hindsight 记忆存储 API](/developer/api/retain)。

## 新一轮开始时的先前运行记忆 {#recall-prior-runs-at-the-start-of-a-new-one}

新的运行应该开始时已经知道之前的运行学到了什么。有两种方法可以引入这种背景，并且它们是相辅相成的：

- **通过 `memory_instructions()` 提前加载。** 运行开始前，预先记忆最相关的记忆，并将其注入系统提示符中。智能体从上下文中的先前课程开始，因此它从第一步开始就围绕这些课程进行计划：

  ```python
  from hindsight_smolagents import create_hindsight_tools, memory_instructions
  from smolagents import CodeAgent, HfApiModel

  BANK = "code-agent-project-x"

  memories = memory_instructions(
      bank_id=BANK,
      query="该项目的先前方法、失败和任务事实",
  )

  agent = CodeAgent(
      tools=create_hindsight_tools(bank_id=BANK),
      model=HfApiModel(),
      system_prompt=f"你是一位编码智能体。\n\n{memories}",
  )
  ```

- **通过 `hindsight_recall` 按需查询。** 因为记忆召回也是一种工具，所以当智能体遇到前置上下文未涵盖的问题时，它可以在运行中搜索记忆。这保持了早期上下文的紧密性，同时仍然允许智能体访问整个存储。

使用**每次运行使用相同 `bank_id`** 是这项工作得以实现的原因——记忆库是将运行联系在一起的线索。对于较低级别的行为，请参阅 [Hindsight 记忆召回 API](/developer/api/recall)。

## 将 SmolAgents 连接到 Hindsight {#connect-smolagents-to-hindsight}

安装并连接一次 - 设置指南中对此进行了完整介绍，因此本指南不再重复：

```bash
pip install hindsight-smolagents
```

指向Hindsight Cloud或本地服务器，然后继续。参见**[指南：使用 Hindsight 为 SmolAgents 添加持久记忆](https://hindsight.vectorize.io/guides/2026/05/04/guide-smolagents-memory-with-hindsight)** 完整的安装和连接演练，包括 `configure()` 和自托管。

## 您的智能体可以调用的嵌入式记忆工具 {#drop-in-memory-tools-your-agent-can-call}

集成交付了三个原生`Tool` 子类，因此智能体使用记忆的方式与使用任何其他工具的方式相同。使用工厂创建它们：

```python
from hindsight_smolagents import create_hindsight_tools

tools = create_hindsight_tools(bank_id="code-agent-project-x")
```

这给出了智能体：

- **`hindsight_retain`** — 将事实、教训或决定存储为长期记忆。
- **`hindsight_recall`** — 在长期记忆中搜索相关的先前事实。
- **`hindsight_reflect`** — 从存储的记忆中合成一个合理的答案。

您可以只包含您需要的工具。对于跨运行的累积循环，记忆存储和记忆召回是必需的； 当您想要综合答案而不是原始事实时，反思很有用：

```python
tools = create_hindsight_tools(
    bank_id="code-agent-project-x",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,
)
```

如果您想单独实例化工具，`HindsightRetainTool` 和 `HindsightRecallTool`采取同样的`bank_id`。 [集成文档](/sdks/integrations/smolagents) 列出每个参数，包括范围界定和记忆召回预算的标签。

## 验证记忆在运行中持续存在 {#verify-memory-persists-across-runs}

测试很简单：证明运行二知道只有运行一才能学到的东西。

1. 在运行一中，让智能体解决任务并调用 `hindsight_retain` 一个具体的课程 - 例如，“导出端点分页为 100 行，因此始终传递 `page`。”
2. 让跑步结束。记忆存储被存储到记忆库中。
3. 开始运行第二个**相同 `bank_id`**，以及前载 `memory_instructions()` 或提出一个应该触发的问题 `hindsight_recall`。
4. 询问智能体有关分页行为的信息，或者观察它是否围绕它进行计划而不重新发现它。

如果使用第一轮中的事实来运行两个答案，则交叉运行记忆正在发挥作用。如果冷启动，请检查两次运行是否使用相同的记忆库 ID，以及记忆库调用是否实际完成。

## 常见错误 {#common-mistakes}

### 每次运行使用不同的记忆库ID {#using-a-different-bank-id-per-run}

记忆库是将纽带联系在一起的。如果每次运行都会生成一个新的记忆库 ID，则不会保留任何内容。为智能体、用户或项目固定一个稳定的 ID。

### 保留原始转录本 {#retaining-the-raw-transcript}

存储完整的逐步跟踪将教训埋藏在噪音中。 记忆存储是简短的、具体的事实和决定——这就是记忆召回稍后出现的内容。

### 添加工具但从不注入上下文 {#adding-tools-but-never-injecting-context}

赋予智能体`hindsight_recall` 让它按需搜索，但它不会自动使用先前的上下文开始每次运行，除非您也注入 `memory_instructions()`。两者结合使用可实现可靠的热启动。

### 在记忆存储完成之前测试记忆召回 {#testing-recall-before-retain-completes}

如果您在运行一个的记忆存储完成之前检查运行二，则记忆可能尚未存储。让第一个运行完成，然后再断言第二个运行记住。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管 Hindsight 服务器也可以工作 - 将工具指向您的本地 API URL。有关连接详细信息，请参阅设置指南。

### 智能体如何决定何时存储记忆？ {#how-does-an-agent-decide-when-to-retain}

智能体呼叫`hindsight_retain` 像任何工具一样，因此您可以提示它在自然时刻存储课程，或者在跑步结束时自己存储摘要。存储教训，而不是原始痕迹。

### 这会减慢每次跑步的速度吗？ {#does-this-slow-down-every-run}

前置式`memory_instructions()` 在运行前添加一个记忆召回，并保持注入的上下文受 限制 `max_results` 和 `max_tokens`。按需`hindsight_recall`仅在智能体选择调用它时运行。

### 这仅限于CodeAgent吗？ {#is-this-limited-to-codeagent}

没有。这些工具遵循 SmolAgents 工具模型，因此任何接受工具的智能体都可以使用相同的交叉运行记忆模式。

## 后续步骤 {#next-steps}

- 从完整开始[SmolAgents 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-smolagents-memory-with-hindsight)
- 尝试[Hindsight Cloud](https://hindsight.vectorize.io) 用于托管记忆后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[SmolAgents 集成文档](/sdks/integrations/smolagents)
