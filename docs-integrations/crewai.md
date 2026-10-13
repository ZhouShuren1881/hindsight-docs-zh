---
sidebar_position: 5
title: "CrewAI 持久记忆Hindsight |集成指南"
description: "为您的CrewAI智能体团队添加长期记忆。 Hindsight 提供事实提取、实体跟踪和时间感知——在所有机组运行中自动保持。"
---

# CrewAI {#crewai}

持久记忆AI智能体团队来自 [CrewAI](https://github.com/crewAIInc/crewAI)。通过事实提取、实体跟踪和时间感知为您的工作人员提供长期记忆。

[查看更新日志 →](/changelog/integrations/crewai)

## 功能 {#features}

- **可直接替换的存储后端** - 实施CrewAI的`Storage` 接口 `ExternalMemory`
- **自动记忆流程** -CrewAI自动存储任务输出并检索相关记忆
- **各智能体独立的记忆库** - 可选择为每个智能体提供其自己独立的记忆库
- **反思工具** - 智能体可以通过处置感知合成明确地推理记忆
- **简单配置** - 配置一次，随处使用

## 安装 {#installation}

```bash
pip install hindsight-crewai
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
:::

```python
from hindsight_crewai import configure, HindsightStorage
from crewai.memory.external.external_memory import ExternalMemory
from crewai import Agent, Crew, Task

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)

crew = Crew(
    agents=[Agent(role="Researcher", goal="查找信息", backstory="...")],
    tasks=[Task(description="研究AI趋势", expected_output="Report")],
    external_memory=ExternalMemory(
        storage=HindsightStorage(bank_id="my-crew")
    ),
)

crew.kickoff()
```

就是这样。 CrewAI 将自动：
- **查询记忆** 在每个任务开始时
- **存储任务输出** 至Hindsight每个任务完成后

记忆会在船员运行过程中持续存在，因此你的船员会随着时间的推移而学习。

### 自托管（本地开发） {#self-hosting-local-development}

如果你通过以下命令在本地运行 Hindsight：`./scripts/dev/start-api.sh`，替换服务地址：

```python
configure(hindsight_api_url="http://localhost:8888")
```

参见[安装指南](/developer/installation) 用于自托管设置。

## 工作原理 {#how-it-works}

整合图CrewAI的3种方法`Storage` 接口Hindsight的API：

|CrewAI|Hindsight|发生了什么|
|--------|-----------|--------------|
|`save(value, metadata, agent)`|`retain(bank_id, content, ...)`|任务输出被存储。 Hindsight 从原始文本中提取事实、实体和关系。|
|`search(query, limit)`|`recall(bank_id, query, ...)`|CrewAI 根据任务描述构造查询。 Hindsight 运行语义搜索、BM25、图遍历和重排序。|
|`reset()`|`delete_bank(bank_id)`|擦除记忆库并可以选择使用其原始任务重新创建它。|

CrewAI打电话 `search()` 在每个任务开始时自动并且 每个任务完成后 `save()`。

## 配置选项 {#configuration-options}

```python
from hindsight_crewai import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  #Hindsight Cloud（默认）
    api_key="your-api-key",                     # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                               #记忆召回预算：“低”、“中”、“高”
    max_tokens=4096,                            #记忆结果的最大 token 数数
    tags=["env:prod"],                          #存储记忆的标签
    recall_tags=["scope:global"],               #要过滤的标签 记忆召回
    recall_tags_match="any",                    # 标签匹配：any/all/any_strict/all_strict
    verbose=True,                               #启用日志记录
)
```

### 每个存储覆盖 {#per-storage-overrides}

构造函数参数覆盖全局配置：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    budget="high",
    max_tokens=8192,
    tags=["team:alpha"],
)
```

## 记忆库任务说明 {#bank-missions}

设定一个任务来指导Hindsight如何处理和组织记忆：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    mission="跟踪软件架构决策、技术债务和团队偏好。",
)
```

## 每智能体记忆库 {#per-agent-memory-banks}

给每个智能体一个独立的记忆库：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    per_agent_banks=True,
    # Researcher -> "my-crew-researcher"
    # Writer     -> "my-crew-writer"
)
```

或者使用自定义记忆库解析器进行完全控制：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    bank_resolver=lambda base, agent: f"{base}-{agent.lower()}" if agent else base,
)
```

:::info 当`per_agent_banks=True`，自动`search()` 在任务开始时查询基础记忆库（共享上下文），因为CrewAI的`search()`方法不接收智能体参数。对于每个智能体搜索隔离，创建单独的 每个智能体 `HindsightStorage`实例。
:::

## 反思工具 {#reflect-tool}

CrewAI的存储接口仅支持save/search/reset。让智能体能够访问Hindsight的`reflect`（处置感知记忆合成），将其添加为工具：

```python
from hindsight_crewai import HindsightReflectTool

reflect_tool = HindsightReflectTool(
    bank_id="my-crew",
    budget="mid",
    reflect_context="您正在帮助软件团队跟踪决策。",
)

agent = Agent(
    role="Analyst",
    goal="分析项目历史",
    backstory="...",
    tools=[reflect_tool],
)
```

当智能体调用此工具时，它会根据所有相关记忆而不是原始事实片段获得综合的上下文答案。

## 完整示例 {#full-example}

一个研究小组会记住运行中的发现：

```python
from hindsight_crewai import configure, HindsightStorage, HindsightReflectTool
from crewai.memory.external.external_memory import ExternalMemory
from crewai import Agent, Crew, Task

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

storage = HindsightStorage(
    bank_id="research-crew",
    mission="跟踪技术研究结果和比较。",
)

reflect_tool = HindsightReflectTool(bank_id="research-crew", budget="mid")

researcher = Agent(
    role="Researcher",
    goal="基于先验知识的研究主题。",
    backstory="开始之前，使用hindsight_reflect检查您已经知道的内容。",
    tools=[reflect_tool],
)

writer = Agent(
    role="Writer",
    goal="结合先前的发现撰写摘要。",
    backstory="使用hindsight_reflect记忆先前的研究。",
    tools=[reflect_tool],
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[
        Task(description="研究 Rust 的好处", expected_output="Analysis", agent=researcher),
        Task(description="写执行摘要", expected_output="Summary", agent=writer),
    ],
    external_memory=ExternalMemory(storage=storage),
)

#运行 1：研究 Rust，存储发现
crew.kickoff()

#运行 2：与 Go 进行比较时回顾 Rust 研究
crew.tasks[0].description = "比较 Rust 和 Go"
crew.kickoff()
```

## API参考 {#api-reference}

### 配置 {#configuration}

|功能|说明|
|----------|-------------|
|`configure(...)`|设置全局连接和默认设置|
|`get_config()`|获取当前配置|
|`reset_config()`|将配置重置为无|

### 存储 {#storage}

|参数 
需要|默认|说明|
|-----------|---------|-------------|
|`bank_id`|required|Hindsight 记忆 记忆库 ID|
|`hindsight_api_url`||覆盖API URL|
|`api_key`||覆盖API 密钥|
|`budget`|`"mid"`|记忆召回预算 (low/mid/high)|
|`max_tokens`|`4096`|记忆结果的最大 token 数数|
|`tags`|`None`|存储时应用的标签|
|`recall_tags`|`None`|搜索时要过滤的标签|
|`recall_tags_match`|`"any"`|标签匹配模式|
|`per_agent_banks`|`False`|赋予每个智能体自己的记忆库|
|`bank_resolver`|`None`|定制`(bank_id, agent) -> bank_id`|
|`mission`|`None`|记忆组织的记忆库使命|
|`verbose`|`False`|启用详细日志记录|

### 反思工具 {#reflect-tool}

|参数 
需要|默认|说明|
|-----------|---------|-------------|
|`bank_id`|required|Hindsight 记忆 记忆库 ID|
|`budget`|`"mid"`|预计预算 (low/mid/high)|
|`reflect_context`|`None`|推理的附加上下文|
|`hindsight_api_url`||覆盖API URL|
|`api_key`||覆盖API 密钥|

## 环境要求 {#requirements}

- Python >= 3.10
- crewai >= 0.86.0
- 正在运行 Hindsight API 服务器
