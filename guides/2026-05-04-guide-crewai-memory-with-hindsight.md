---
title: "指南：使用 Hindsight 为 CrewAI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, crewai, multi-agent, memory]
description: "借助 ExternalMemory、HindsightStorage 和可选的按智能体分库，为 CrewAI 添加持久记忆，让重复运行的团队能够沿用此前的工作成果。"
image: /img/guides/guide-crewai-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 CrewAI 添加持久记忆](/img/guides/guide-crewai-memory-with-hindsight.webp)

如果要为 **CrewAI 接入 Hindsight 持久记忆**，最直接的做法是将 `HindsightStorage` 接入 CrewAI 的 `ExternalMemory` 接口：让 CrewAI 在执行任务前搜索记忆，并由 Hindsight 在任务完成后存储任务输出。这样，重复运行的团队就能保持真正的连续性，而不是每次启动都从空白状态开始。

这种方式尤其适用于需要反复执行同一类工作的研究、规划和运营团队。Hindsight 会保留此前运行中提取的事实、实体和关系，让后续运行能够建立在团队已经掌握的信息之上。

工作时可以随手查阅 [CrewAI 集成文档](/sdks/integrations/crewai)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 CrewAI 集成或插件。
> 2. 将其指向 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 CrewAI 运行时。
> 4. 存入一条偏好或项目事实，然后重新运行。
> 5. 确认系统自动召回此前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

CrewAI 已通过 `ExternalMemory` 提供存储接口，因此集成方式简单且可预测。`search()` 对应 Hindsight 的 Recall（召回），`save()` 对应 Retain（存入）；可选的按智能体分库功能则让你决定团队成员之间共享多少记忆。

## 前提条件 {#prerequisites}

- 已安装 CrewAI，并有一个可以端到端运行的团队。
- 已安装 Python 和 `hindsight-crewai`。
- 已确定记忆方案：使用一个由团队共享的记忆库，或为各智能体隔离记忆库。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-crewai
```

## 步骤 2：连接 CrewAI 与 Hindsight {#step-2-connect-crewai-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io) 提供免费套餐，无需自行托管。

```python
from hindsight_crewai import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

如果要在本地自托管 Hindsight，请将 API URL 替换为 `http://localhost:8888`，并移除 `api_key`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from crewai.memory.external.external_memory import ExternalMemory
from crewai import Agent, Crew, Task
from hindsight_crewai import HindsightStorage

crew = Crew(
    agents=[Agent(role="Researcher", goal="Find information", backstory="...")],
    tasks=[Task(description="Research AI trends", expected_output="Report")],
    external_memory=ExternalMemory(
        storage=HindsightStorage(bank_id="my-crew")
    ),
)

crew.kickoff()
```

如果需要智能体显式基于记忆进行推理，可以将 `HindsightReflectTool` 添加到需要此功能的智能体中。当团队需要先综合记忆、再规划下一步时，这会很有帮助。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

如果各智能体要协作完成同一项交付成果，可以先使用一个团队共享的记忆库。如果每个角色都应保留范围更窄的记忆，则启用 `per_agent_banks=True`；例如，研究员和写作者不应混用所有存入的细节。共享记忆更利于协作，隔离记忆更利于专业分工。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 运行一次团队，让它生成包含易于记住的事实或决策的输出。
2. 为同一团队启动一次与之相关的新任务。
3. 检查团队能否在无需手动提醒的情况下，召回此前的输出或偏好。
4. 如果启用了按智能体分库，请仔细检查行为，因为任务开始时的自动搜索默认仍会查询基础记忆库。

如果第二次运行能根据第一次运行的细节作答，说明配置已生效。如果不能，请启用调试日志、检查配置的记忆库 ID，并确认 Retain（存入）调用确实已完成。

## 常见错误 {#common-mistakes}

- CrewAI 调用 `search()` 时不会传入智能体；如果没有创建独立的存储实例，却期待搜索按智能体隔离，就会出现问题。
- 记忆库的任务说明过于宽泛，无法有效指导记忆提取。
- 第二次运行使用了不同的记忆库 ID，却误以为 Recall（召回）功能失效。

## 常见问题 {#faq}

### 每个 CrewAI 智能体都能有自己的记忆库吗？ {#can-each-crewai-agent-have-its-own-bank}

可以。设置 `per_agent_banks=True`；如果需要更精细的控制，也可以提供自定义 `bank_resolver`。

### CrewAI 会自动存储什么？ {#what-does-crewai-store-automatically}

任务完成后，CrewAI 会调用 `save()`，Hindsight 集成会存入该任务的输出，以供之后召回。

### 什么时候应该添加 Reflect 工具？ {#when-should-i-add-the-reflect-tool}

当智能体需要的是记忆的综合视图，而不是原始召回结果时，可以使用它。

## 后续步骤 {#next-steps}

- 如果需要托管的记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 对照[面向 AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中的相关工作流。
