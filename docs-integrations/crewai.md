---
sidebar_position: 5
title: "使用 Hindsight 为 CrewAI 提供持久记忆 | 集成指南"
description: "为 CrewAI 智能体团队添加长期记忆。Hindsight 提供事实提取、实体跟踪和时间感知，并让记忆自动跨团队运行持久保存。"
---

# CrewAI {#crewai}

通过 [CrewAI](https://github.com/crewAIInc/crewAI) 为 AI 智能体团队提供持久记忆。借助事实提取、实体跟踪和时间感知，为团队添加长期记忆。

[查看更新日志 →](/changelog/integrations/crewai)

## 功能 {#features}

- **可直接接入的存储后端**：实现 CrewAI 的 `Storage` 接口，供 `ExternalMemory` 使用。
- **自动记忆流程**：CrewAI 会自动存储任务输出并检索相关记忆。
- **每个智能体独立的记忆库**：可为每个智能体提供独立的记忆库。
- **Reflect（反思）工具**：智能体可以通过受性格倾向影响的综合生成，明确地基于记忆进行推理。
- **简单配置**：配置一次，即可在各处使用。

## 安装 {#installation}

```bash
pip install hindsight-crewai
```

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取 API 密钥，无需自行托管。
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
    agents=[Agent(role="Researcher", goal="Find information", backstory="...")],
    tasks=[Task(description="Research AI trends", expected_output="Report")],
    external_memory=ExternalMemory(
        storage=HindsightStorage(bank_id="my-crew")
    ),
)

crew.kickoff()
```

完成。CrewAI 会自动执行以下操作：

- 在每项任务开始时**查询记忆**。
- 在每项任务完成后**将任务输出存入 Hindsight**。

记忆会在多次团队运行之间持续保存，因此团队会随着时间推移不断积累信息。

### 自行托管（本地开发） {#self-hosting-local-development}

如果你使用 `./scripts/dev/start-api.sh` 在本地运行 Hindsight，请替换服务 URL：

```python
configure(hindsight_api_url="http://localhost:8888")
```

自行托管的设置方法请参阅[安装指南](/developer/installation)。

## 工作原理 {#how-it-works}

此集成将 CrewAI 的三方法 `Storage` 接口映射到 Hindsight API：

| CrewAI | Hindsight | 作用 |
|--------|-----------|--------------|
| `save(value, metadata, agent)` | `retain(bank_id, content, ...)` | 存储任务输出。Hindsight 会从原始文本中提取事实、实体和关系。 |
| `search(query, limit)` | `recall(bank_id, query, ...)` | CrewAI 根据任务描述构造查询。Hindsight 会执行语义检索、BM25、图遍历和重排序。 |
| `reset()` | `delete_bank(bank_id)` | 清空记忆库，并可选择用其原始任务说明重新创建记忆库。 |

CrewAI 会在每项任务开始时自动调用 `search()`，并在每项任务完成后调用 `save()`。

## 配置选项 {#configuration-options}

```python
from hindsight_crewai import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",  # Hindsight Cloud（默认值）
    api_key="your-api-key",                     # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                               # Recall（召回）预算："low"、"mid"、"high"
    max_tokens=4096,                            # Recall 结果的最大 token 数
    tags=["env:prod"],                          # 存储记忆时使用的标签
    recall_tags=["scope:global"],               # 用于筛选 Recall 结果的标签
    recall_tags_match="any",                    # 标签匹配模式：any/all/any_strict/all_strict
    verbose=True,                               # 启用日志记录
)
```

### 单个存储实例的覆盖选项 {#per-storage-overrides}

构造函数参数会覆盖全局配置：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    budget="high",
    max_tokens=8192,
    tags=["team:alpha"],
)
```

## 记忆库任务说明 {#bank-missions}

设置任务说明，指导 Hindsight 如何处理和组织记忆：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    mission="Track software architecture decisions, technical debt, and team preferences.",
)
```

## 每个智能体使用独立记忆库 {#per-agent-memory-banks}

为每个智能体设置独立的记忆库：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    per_agent_banks=True,
    # Researcher -> "my-crew-researcher"
    # Writer     -> "my-crew-writer"
)
```

也可以使用自定义记忆库解析器，以便完全控制记忆库名称：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    bank_resolver=lambda base, agent: f"{base}-{agent.lower()}" if agent else base,
)
```

:::info
当 `per_agent_banks=True` 时，任务开始时自动执行的 `search()` 会查询基础记忆库（共享上下文），因为 CrewAI 的 `search()` 方法不会接收智能体参数。若要隔离每个智能体的搜索，请为每个智能体分别创建 `HindsightStorage` 实例。
:::

## Reflect 工具 {#reflect-tool}

CrewAI 的存储接口仅支持 `save`、`search` 和 `reset`。若要让智能体使用 Hindsight 的 `reflect`（一种受性格倾向影响的记忆综合生成方式），请将它添加为工具：

```python
from hindsight_crewai import HindsightReflectTool

reflect_tool = HindsightReflectTool(
    bank_id="my-crew",
    budget="mid",
    reflect_context="You are helping a software team track decisions.",
)

agent = Agent(
    role="Analyst",
    goal="Analyze project history",
    backstory="...",
    tools=[reflect_tool],
)
```

智能体调用此工具时，会获得基于所有相关记忆生成的综合上下文答案，而不是原始事实片段。

## 完整示例 {#full-example}

以下研究团队会记住多次运行中的研究发现：

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
    mission="Track technology research findings and comparisons.",
)

reflect_tool = HindsightReflectTool(bank_id="research-crew", budget="mid")

researcher = Agent(
    role="Researcher",
    goal="Research topics, building on prior knowledge.",
    backstory="Before starting, use hindsight_reflect to check what you already know.",
    tools=[reflect_tool],
)

writer = Agent(
    role="Writer",
    goal="Write summaries incorporating prior findings.",
    backstory="Use hindsight_reflect to recall prior research.",
    tools=[reflect_tool],
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[
        Task(description="Research the benefits of Rust", expected_output="Analysis", agent=researcher),
        Task(description="Write an executive summary", expected_output="Summary", agent=writer),
    ],
    external_memory=ExternalMemory(storage=storage),
)

# 第 1 次运行：研究 Rust 并存储发现
crew.kickoff()

# 第 2 次运行：比较 Rust 和 Go 时召回 Rust 研究内容
crew.tasks[0].description = "Compare Rust with Go"
crew.kickoff()
```

## API 参考 {#api-reference}

### 配置 {#configuration}

| 函数 | 说明 |
|----------|-------------|
| `configure(...)` | 设置全局连接和默认选项 |
| `get_config()` | 获取当前配置 |
| `reset_config()` | 将配置重置为 `None` |

### 存储 {#storage}

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `bank_id` | 必填 | Hindsight 记忆库 ID |
| `hindsight_api_url` | 来自配置 | 覆盖 API URL |
| `api_key` | 来自配置 | 覆盖 API 密钥 |
| `budget` | `"mid"` | Recall 预算（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存储记忆时应用的标签 |
| `recall_tags` | `None` | 搜索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式 |
| `per_agent_banks` | `False` | 为每个智能体提供独立记忆库 |
| `bank_resolver` | `None` | 自定义 `(bank_id, agent) -> bank_id` 解析器 |
| `mission` | `None` | 用于组织记忆的记忆库任务说明 |
| `verbose` | `False` | 启用详细日志记录 |

### Reflect 工具 {#reflect-tool-1}

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `bank_id` | 必填 | Hindsight 记忆库 ID |
| `budget` | `"mid"` | Reflect 预算（low/mid/high） |
| `reflect_context` | `None` | 用于推理的附加上下文 |
| `hindsight_api_url` | 来自配置 | 覆盖 API URL |
| `api_key` | 来自配置 | 覆盖 API 密钥 |

## 环境要求 {#requirements}

- Python >= 3.10
- crewai >= 0.86.0
- 正在运行的 Hindsight API 服务器
