---
title: "SmolAgents 中的智能体记忆：记忆存储、记忆召回和反思"
authors: [benfrank241]
date: 2026-04-29T15:00:00Z
tags: [integrations, agents, smolagents, memory, guide, tutorial]
description: "使用Hindsight为SmolAgents添加持久记忆。 记忆事实、记忆上下文以及对跨会话智能体决策的反思。"
image: /img/blog/smolagents-memory-tools.webp
hide_table_of_contents: true
---

![SmolAgents 中的智能体记忆：记忆存储、记忆召回和反思](/img/blog/smolagents-memory-tools.webp)

SmolAgents 构建轻量级、实用的智能体，可以逐步推理。但没有记忆的智能体却只能重复工作。 Hindsight 现在与 SmolAgents 集成为一组工具，让您的智能体 **记忆存储观察，记忆相关上下文，并对自己的推理感到反思** — 跨会话和任务。这将单次智能体转变为学习系统。

<!-- truncate -->

## 为什么记忆对于 SmolAgents 很重要 {#why-memory-matters-for-smolagents}

SmolAgents 擅长构建最小的、可组合的智能体来推理代码、数据和系统。但传统的智能体是孤立运行的：
- 每个任务都是全新开始的，不了解之前的运行情况
- 智能体无法从过去的错误或成功中学习
- 一项任务的见解并不能为下一项任务提供信息
- 用户不断重复解释和上下文

Hindsight 通过提供三种记忆工具来解决这个问题：**记忆存储**（存储事实）、**记忆召回**（检索上下文）和**反思**（综合学习内容）。他们共同创造出能够随着时间的推移记忆、学习和改进的智能体。

## Hindsight如何与 SmolAgents 集成 {#how-hindsight-integrates-with-smolagents}

Hindsight SmolAgents 集成公开了您的智能体可以使用的三种工具：

1. **记忆存储工具** - 存储事实、决策和观察
   - 在智能体代码中自动或显式调用
   - 从非结构化推理中提取结构化事实
   - 按主题、日期或上下文标记事实

2. **记忆召回工具** - 从记忆中检索相关上下文
   - 问题查询（“关于数据库索引我学到了什么？”）
   - 返回排名、相关事实和置信度分数
   - 无缝集成到智能体推理循环中

3. **反思 工具** - 综合学习内容和模式
   - 分析存储的事实以提取高级见解
   - 生成智能体所学内容的摘要
   - 找出差距或重复的错误

所有三个工具都注册为 SmolAgents 工具，因此您的智能体可以像任何其他工具一样调用它们。

## 使用 SmolAgents 设置 Hindsight {#setting-up-hindsight-with-smolagents}

首先，安装Hindsight SmolAgents 集成：

```bash
pip install hindsight-smolagents
```

然后在你的智能体中配置它：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent, DuckDuckGoSearchTool

#配置Hindsight（一次，全局）
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

#创建三种记忆工具
memory_tools = create_hindsight_tools(bank_id="my-agent-memory")

#使用记忆工具创建智能体
agent = CodeAgent(
    tools=[DuckDuckGoSearchTool()] + memory_tools,
    model_id="openai/gpt-4"
)

#现在你的智能体有了记忆
result = agent.run("搜索Python异步模式并记住你学到的内容")
```

`create_hindsight_tools()`函数返回三个Tool实例：`hindsight_retain`、`hindsight_recall`和`hindsight_reflect`。智能体可以像内置工具一样调用它们中的任何一个。

## 真实世界用例 {#real-world-use-cases}

### 用例 1：代码审查智能体 {#use-case-1-code-review-agent}

一个代码审查智能体，可以从过去的审查中学习：

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
    您是代码审查专家。在查看之前，使用后视_recall
    记忆召回您在此代码库中学到的常见问题。
    审阅后，使用后视保留保存您的发现，以便将来的审阅得到改善。
    """
)

#每条评论都会影响下一条评论
for pr in pull_requests:
    result = agent.run(f"Review PR {pr.number}: {pr.diff}")
```

智能体通过审查、识别模式和捕获重复出现的错误来构建机构知识。

### 用例 2：数据分析智能体 {#use-case-2-data-analysis-agent}

一种分析数据集并记住其发现内容的智能体：

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

#智能体查询数据，保留见解
result = agent.run("""
​​分析销售数据库。寻找趋势。使用后视保留来保存您学到的内容。
然后回答：我们的数据告诉我们有关客户行为的哪些信息？
""")

#后来，智能体回忆起这些见解
follow_up = agent.run("""
使用后视回忆来记住您学到的有关客户行为的知识。
然后回答：我们应该如何根据您了解到的情况调整定价？
""")
```

智能体的分析会随着时间的推移而复合——每个新查询都可以参考之前的发现。

### 用例 3：研究助理 {#use-case-3-research-assistant}

一种阅读论文并构建知识库的智能体：

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

#处理一系列论文
papers = ["paper1.pdf", "paper2.pdf", "paper3.pdf"]
for paper in papers:
    agent.run(f"阅读 {paper}，提取关键发现，并用 hindsight_retain 保存。")

#然后合成
summary = agent.run("使用后视反思来分析你所学到的一切。主要主题是什么？")
```

智能体综合多篇论文，提取从任何单一来源都不明显的模式。

## 三种记忆工具 {#the-three-memory-tools}

`create_hindsight_tools()` 函数返回您的智能体可以使用的三个 SmolAgents Tool 实例：

**后见之明_保留** - 存储事实和观察
- 记一串内容
- 将其存储在记忆库中，并带有可选标签
- 当智能体发现重要的事情时调用
- 示例：`hindsight_retain("Python async/await 无需线程即可并发执行")`

**后见之明_回忆** - 检索相关上下文
- 获取有关您想知道的内容的查询字符串
- 从记忆中返回与查询匹配的排名事实
- 示例：`hindsight_recall("我学到了哪些 Python 异步模式？")`

**后见之明_反思** - 合成和提取模式
- 询问要合成什么
- 分析存储的事实以产生高级见解
- 示例：`hindsight_reflect("我学到的机器学习知识有哪些主要主题？")`

这三个都被注册为工具，因此智能体在推理中使用它们的自然名称来调用它们。

## 示例：交互式学习循环 {#example-interactive-learning-loop}

这是一个完整的示例，展示了通过多次交互进行学习的智能体：

```python
from hindsight_smolagents import configure, create_hindsight_tools
from smolagents import CodeAgent, DuckDuckGoSearchTool

#全局配置一次
configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-hindsight-key"
)

#使用记忆工具创建智能体
memory_tools = create_hindsight_tools(bank_id="learning-agent")
agent = CodeAgent(
    tools=[DuckDuckGoSearchTool()] + memory_tools
)

#第一个任务：研究机器学习
print("=== 任务 1：机器学习研究 ===")
result1 = agent.run("""
搜索2026年最新的机器学习突破。
专注于：变压器改进、效率、新颖的架构。
使用后视保留来保存您的发现。
""")

#第二个任务：React 新研究
print("\n=== 任务 2：利用此前所学 ===")
result2 = agent.run("""
使用后视回忆来记住您学到的关于机器学习突破的知识。
现在研究这些如何应用于资源受限的环境。
使用后视保留来保存你发现的内容。
""")

#第三个任务：综合学习内容
print("\n=== Task 3: Synthesize ===")
result3 = agent.run("""
使用后视_reflect 综合您在 2026 年学到的有关 ML 的所有知识。
有哪些图案？什么是最重要的？
开发者应该关注什么？
""")

print(result3)  #智能体的高级合成
```

每项任务都建立在前一项任务的基础上。智能体会回忆所学到的知识，将其应用于新问题，并综合所有交互。

## 最佳实践 {#best-practices}

**显式保留：** 当智能体发现一些有价值的东西时调用记忆存储()，而不是每一步都调用。这可以保持记忆集中。

**情境记忆召回：** 使用特定查询。 “关于数据库性能我学到了什么？”比“告诉我一切”更好。

**反思 定期：** 在完成多个任务后，使用 Г() 来综合所学内容并识别模式。

**组织标签：** 使用`["ml", "2026"]`或`["database", "performance"]`等标签按主题组织事实。

**版本您的智能体：** 不同版本的智能体可能有不同的记忆需求。为不同的智能体角色使用单独的记忆库。

## 故障排除 {#troubleshooting}

**记忆召回返回空：** 智能体尚未保留任何内容，或者查询与存储的事实不匹配。检查记忆存储（）是否被调用并检查存储的内容。

**记忆感觉多余：** 事实被存储多次。使用标签并有选择性地选择你的记忆存储——质量胜于数量。

**^输出是通用的：** 调用回忆()时提供上下文。 “反思你对 X 的了解”比开放式反思更有用。

**API 错误：** 验证您的bank_id 是否存在并且您的API 密钥有效。检查Hindsight Cloud仪表板以检查存储的事实。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [SmolAgents 文档](https://github.com/huggingface/smolagents)
- [Hindsight 记忆召回API](/developer/api/recall)
- [Hindsight记忆存储API](/developer/api/retain)
- [Hindsight SmolAgents 集成自述文件](/sdks/integrations/smolagents)
