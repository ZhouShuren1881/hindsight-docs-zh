---
title: "SmolAgents 中的智能体记忆：Retain、Recall 与 Reflect"
authors: [benfrank241]
date: 2026-04-29T15:00:00Z
tags: [integrations, agents, smolagents, memory, guide, tutorial]
description: "使用 Hindsight 为 SmolAgents 添加持久记忆。跨会话和任务存入事实、召回上下文，并反思智能体的决策。"
image: /img/blog/smolagents-memory-tools.webp
hide_table_of_contents: true
---

![SmolAgents 中的智能体记忆：Retain、Recall 与 Reflect](/img/blog/smolagents-memory-tools.webp)

SmolAgents 可以构建轻量、实用且逐步推理的智能体。但没有记忆的智能体只能不断重复工作。现在，Hindsight 已与 SmolAgents 集成，提供一组工具，让智能体能够**跨会话和任务存入观测、召回相关上下文，并反思自身的推理过程**。这样，单次运行的智能体就能成为会学习的系统。

<!-- truncate -->

## 为什么 SmolAgents 需要记忆 {#why-memory-matters-for-smolagents}

SmolAgents 擅长构建精简、可组合的智能体，用于推理代码、数据和系统。但传统智能体彼此隔离：

- 每项任务都从头开始，不了解之前的运行情况
- 智能体无法从过去的错误或成功中学习
- 一项任务的见解无法帮助下一项任务
- 用户必须不断重复解释和上下文

Hindsight 通过提供三种记忆工具来解决这个问题：**Retain（存入）**（存储事实）、**Recall（召回）**（检索上下文）和 **Reflect（反思）**（综合所学）。三者结合后，智能体就能记住、学习，并随着时间推移不断改进。

## Hindsight 如何与 SmolAgents 集成 {#how-hindsight-integrates-with-smolagents}

Hindsight 的 SmolAgents 集成提供了三种供智能体使用的工具：

1. **Retain 工具** - 存入事实、决策和观测
   - 可在智能体代码中自动或显式调用
   - 从非结构化推理中提取结构化事实
   - 按主题、日期或上下文为事实添加标签

2. **Recall 工具** - 从记忆中检索相关上下文
   - 可通过问题查询，例如“我对数据库索引了解了什么？”
   - 返回经过排序的相关事实及其置信度分数
   - 可无缝融入智能体的推理循环

3. **Reflect 工具** - 综合所学并归纳模式
   - 分析存储的事实，提取高层见解
   - 生成智能体所学内容的总结
   - 找出知识缺口或反复出现的错误

这三种工具都会注册为 SmolAgents 工具，因此智能体可以像调用其他工具一样调用它们。

## 为 SmolAgents 设置 Hindsight {#setting-up-hindsight-with-smolagents}

首先，安装 Hindsight 的 SmolAgents 集成：

```bash
pip install hindsight-smolagents
```

然后在智能体中配置它：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent, DuckDuckGoSearchTool

# 配置 Hindsight（全局配置一次）
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

# 创建三种记忆工具
memory_tools = create_hindsight_tools(bank_id="my-agent-memory")

# 创建带有记忆工具的智能体
agent = CodeAgent(
    tools=[DuckDuckGoSearchTool()] + memory_tools,
    model_id="openai/gpt-4"
)

# 现在智能体具备了记忆能力
result = agent.run("Search for Python async patterns and remember what you learn")
```

`create_hindsight_tools()` 函数会返回三个 Tool 实例：`hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。智能体可以像调用内置工具一样调用其中任意一个。

## 实际应用场景 {#real-world-use-cases}

### 场景 1：代码审查智能体 {#use-case-1-code-review-agent}

能够从过往审查中学习的代码审查智能体：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

memory_tools = create_hindsight_tools(bank_id="code-reviews")

agent = CodeAgent(
    tools=[CodeAnalysisTool()] + memory_tools,
    system_prompt="""
    You are a code review expert. Before reviewing, use hindsight_recall to 
    recall what you've learned about common issues in this codebase. 
    After reviewing, use hindsight_retain to save your findings so future reviews improve.
    """
)

# 每次审查都会为下一次审查提供经验
for pr in pull_requests:
    result = agent.run(f"Review PR {pr.number}: {pr.diff}")
```

智能体在多次审查中积累团队知识，识别模式并捕捉反复出现的缺陷。

### 场景 2：数据分析智能体 {#use-case-2-data-analysis-agent}

能够分析数据集并记住发现的智能体：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

memory_tools = create_hindsight_tools(bank_id="data-analysis")

agent = CodeAgent(
    tools=[PandasTool(), SQLQueryTool()] + memory_tools
)

# 智能体查询数据并存入见解
result = agent.run("""
Analyze the sales database. Find trends. Use hindsight_retain to save what you learn.
Then answer: What does our data tell us about customer behavior?
""")

# 稍后，智能体召回这些见解
follow_up = agent.run("""
Use hindsight_recall to remember what you learned about customer behavior. 
Then answer: How should we adjust pricing based on what you've learned?
""")
```

随着时间推移，智能体的分析会不断积累；每个新查询都可以参考先前的发现。

### 场景 3：研究助理 {#use-case-3-research-assistant}

能够阅读论文并构建知识库的智能体：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

memory_tools = create_hindsight_tools(bank_id="research-papers")

agent = CodeAgent(
    tools=[DocumentReaderTool()] + memory_tools
)

# 处理一系列论文
papers = ["paper1.pdf", "paper2.pdf", "paper3.pdf"]
for paper in papers:
    agent.run(f"Read {paper}. Extract key findings and use hindsight_retain to save them.")

# 然后综合所学
summary = agent.run("Use hindsight_reflect to analyze everything you've learned. What are the major themes?")
```

智能体可以综合多篇论文，提取无法从任何单篇论文中直接看出的模式。

## 三种记忆工具 {#the-three-memory-tools}

`create_hindsight_tools()` 函数会返回三个可供智能体使用的 SmolAgents Tool 实例：

**hindsight_retain** - 存入事实和观测
- 接收一段要记住的字符串内容
- 可带有可选标签，并将内容存入记忆库
- 智能体发现重要信息时调用
- 示例：`hindsight_retain("Python async/await allows concurrent execution without threads")`

**hindsight_recall** - 检索相关上下文
- 接收一个查询字符串，说明你想了解什么
- 从记忆中返回与查询匹配且经过排序的事实
- 示例：`hindsight_recall("What have I learned about Python async patterns?")`

**hindsight_reflect** - 综合所学并归纳模式
- 接收一个关于要综合哪些内容的查询
- 分析存储的事实，生成高层见解
- 示例：`hindsight_reflect("What are the main themes in everything I've learned about ML?")`

这三种工具都会注册为工具，因此智能体可以在推理过程中使用各自的原名调用它们。

## 示例：交互式学习循环 {#example-interactive-learning-loop}

下面是一个完整示例，展示智能体如何通过多次交互不断学习：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent, DuckDuckGoSearchTool

# 全局配置一次
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

# 创建带有记忆工具的智能体
memory_tools = create_hindsight_tools(bank_id="learning-agent")
agent = CodeAgent(
    tools=[DuckDuckGoSearchTool()] + memory_tools
)

# 第一个任务：研究机器学习
print("=== Task 1: ML Research ===")
result1 = agent.run("""
Search for the latest machine learning breakthroughs in 2026.
Focus on: transformer improvements, efficiency, novel architectures.
Use hindsight_retain to save your findings.
""")

# 第二个任务：结合新研究继续探索
print("\n=== Task 2: Build on Prior Learning ===")
result2 = agent.run("""
Use hindsight_recall to remember what you learned about ML breakthroughs.
Now research how these apply to resource-constrained environments.
Use hindsight_retain to save what you discover.
""")

# 第三个任务：综合所学
print("\n=== Task 3: Synthesize ===")
result3 = agent.run("""
Use hindsight_reflect to synthesize everything you've learned about ML in 2026.
What are the patterns? What's most important?
What should developers focus on?
""")

print(result3)  # 智能体的高层综合结果
```

每项任务都建立在前一项任务的基础上。智能体会召回所学，将其应用于新问题，并综合各次交互中的信息。

## 最佳实践 {#best-practices}

**显式存入：** 智能体发现有价值的信息时调用 `retain()`，而不是每一步都调用。这样可以让记忆保持聚焦。

**结合上下文召回：** 使用具体的查询。“我对数据库性能了解了什么？”比“告诉我所有内容”更有效。

**定期反思：** 完成多项任务后，使用 `reflect()` 综合所学并识别模式。

**用标签整理：** 使用 `["ml", "2026"]` 或 `["database", "performance"]` 之类的标签，按主题整理事实。

**为智能体管理版本：** 不同版本的智能体可能有不同的记忆需求。为不同的智能体角色使用独立的记忆库。

## 故障排查 {#troubleshooting}

**Recall 返回空结果：** 智能体尚未存入任何内容，或者查询与存储的事实不匹配。检查是否调用了 `retain()`，并查看已存入的内容。

**记忆内容重复：** 同一事实被存入多次。使用标签，并谨慎选择要存入的内容，重质不重量。

**Reflect 输出泛泛：** 调用 `reflect()` 时提供上下文。“反思你对 X 的了解”比开放式反思更有用。

**API 错误：** 确认 `bank_id` 存在，且 API 密钥有效。检查 Hindsight Cloud 控制台中的已存事实。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [SmolAgents 文档](https://github.com/huggingface/smolagents)
- [Hindsight Recall API](/developer/api/recall)
- [Hindsight Retain API](/developer/api/retain)
- [Hindsight SmolAgents 集成 README](/sdks/integrations/smolagents)
