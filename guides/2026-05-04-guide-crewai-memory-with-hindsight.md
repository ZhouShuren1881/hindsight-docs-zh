---
title: "指南：使用 Hindsight 为 CrewAI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, crewai, multi-agent, memory]
description: "通过 ExternalMemory、HindsightStorage 和可选按智能体记忆库，为 CrewAI 添加持久记忆，让重复运行利用此前成果。"
image: /img/guides/guide-crewai-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 CrewAI 添加持久记忆](/img/guides/guide-crewai-memory-with-hindsight.webp)

如需 **CrewAI 与 Hindsight 持久记忆**，可将 `HindsightStorage` 接入 `ExternalMemory`，让 CrewAI 在任务前搜索记忆，Hindsight 在完成后存储输出，为重复运行的团队提供延续。

这尤其适合反复执行的研究、规划和运维团队。Hindsight 保留此前事实、实体和关系，后续运行便能利用已有知识。

操作时可参考 [CrewAI 集成文档](/sdks/integrations/crewai)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 CrewAI 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 CrewAI。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

CrewAI 通过 `ExternalMemory` 提供存储边界。`search()` 对应召回，`save()` 对应存储，可选按智能体记忆库决定共享程度。

## 前提条件 {#prerequisites}

- 已安装 CrewAI，并有能端到端运行的团队。
- 已安装 Python 和 `hindsight-crewai`。
- 明确共享团队记忆库或按智能体隔离。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-crewai
```

## 步骤 2：连接 CrewAI 与 Hindsight {#step-2-connect-crewai-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
from hindsight_crewai import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

本地自托管时，将 URL 换为 `http://localhost:8888` 并移除 `api_key`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from crewai.memory.external.external_memory import ExternalMemory
from crewai import Agent, Crew, Task
from hindsight_crewai import HindsightStorage

crew = Crew(
    agents=[Agent(role="研究员", goal="查找信息", backstory="...")],
    tasks=[Task(description="研究 AI 趋势", expected_output="报告")],
    external_memory=ExternalMemory(
        storage=HindsightStorage(bank_id="my-crew")
    ),
)

crew.kickoff()
```

需要显式记忆推理时，为相关智能体添加 `HindsightReflectTool`，适合规划下一步前综合记忆。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

协作同一交付物时先共用团队记忆库。各角色应保留更窄内容时启用 `per_agent_banks=True`，如研究员和写作者不应混合每个细节。共享利于协调，隔离利于专门化。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 运行一次，输出容易识别的事实或决策。
2. 用相关任务再次启动相同团队。
3. 检查无需手动提醒是否召回此前输出或偏好。
4. 按智能体分库时仔细观察，因为任务开始自动搜索默认仍查询基础库。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- CrewAI 没有向 `search()` 传智能体，却未创建独立存储实例就期待隔离。
- 记忆库目标太模糊，无法指导提取。
- 第二次使用不同 ID，却认为召回失效。

## 常见问题 {#faq}

### 每个 CrewAI 智能体能有独立记忆库吗？ {#can-each-crewai-agent-have-its-own-bank}

可以，设 `per_agent_banks=True`，更精细控制可提供 `bank_resolver`。

### CrewAI 自动存储什么？ {#what-does-crewai-store-automatically}

任务完成后调用 `save()`，集成存储输出供未来召回。

### 何时添加反思工具？ {#when-should-i-add-the-reflect-tool}

需要记忆的综合视图而非原始召回结果时。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
