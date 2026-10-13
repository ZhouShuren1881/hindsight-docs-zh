---
title: "指南：CrewAI 团队内部共享记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, crewai, multi-agent, memory]
description: "决定 CrewAI 团队何时共用 Hindsight 记忆库、何时按智能体隔离，以及记忆如何流动。"
image: /img/guides/guide-crewai-shared-memory-across-a-crew.svg
hide_table_of_contents: true
---

![指南：CrewAI 团队内部共享记忆](/img/guides/guide-crewai-shared-memory-across-a-crew.svg)

多智能体 CrewAI 关键是范围。研究员、分析员、写作者共库可看到彼此成果；按角色隔离则专门化且不污染。

这是策略决策。`ExternalMemory` 接 `HindsightStorage`，任务前 search 召回、完成 save 存储，ID 和分库开关决定共享笔记本或私人文件。

本指南介绍共享、隔离、运行内流动和混合。尚未接入先按 [CrewAI 指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-crewai-memory-with-hindsight)。

<!-- truncate -->

> **快速解答**
>
> 1. 默认共享 `HindsightStorage(bank_id="my-crew")`。
> 2. 各角色读写同库，研究发现写作者可见。
> 3. 专门化不混细节时 `per_agent_banks=True`。
> 4. 混合时共享协调，特定角色私人实例保存草稿。
> 5. A 首次存，B 后续召回验证。

## 为什么团队需要共享 {#why-crews-need-shared-memory}

单次 kickoff 顺序传递任务输出，但第二、三、十次运行无持久就失去延续。

共享让一次流水线变成积累知识的组织。事实、实体、关系各角色可用，研究不重复、写作召回语气结论，适合重复研究规划运维。

存储从原始输出提取结构，召回用语义、BM25、图和重排序，不是所有人看全部，而是看当下相关。

## 共享与按智能体分库 {#one-shared-crew-bank-vs-per-agent-banks}

看是否协作同交付或各自专门职责。

**以下情况共享：**

- 相同输出需彼此上下文。
- 决策约定发现应超过单角色。
- 协调比专门化重要。

```python
storage = HindsightStorage(bank_id="research-crew")
crew = Crew(agents=[researcher, writer], tasks=[...],
            external_memory=ExternalMemory(storage=storage))
```

**以下情况分库：**

- 各角色需更窄记忆，不吸收其他全部。
- 混合增加噪声，如事实核查不应混写作草稿。
- 专门化更重要。

```python
storage = HindsightStorage(bank_id="research-crew", per_agent_banks=True)
# 研究员 -> "research-crew-researcher" {#researcher---research-crew-researcher}
# 写作者 -> "research-crew-writer" {#writer-------research-crew-writer}
```

开启后 save 按角色派生 ID，自定义 `(bank_id, agent) -> bank_id` 解析器可控制。

多数先共享，明确某角色需干净窄库才拆分。

## 记忆如何流动 {#how-memory-flows-between-agents}

自动调用与想象可能不同，需理解。

共享时每任务前 search、后 save 都访问 my-crew，研究成果自动流向写作。

分库时 search 不接收 agent，仍查询**基础库**，save 却按角色写。因此只隔离写，不隔离自动读。真正隔离搜索需每角色独立实例。

需显式控制时用 `HindsightReflectTool`，返回带倾向的综合回答。各自 ID 可一角色共享、一角色私人。

## 连接 CrewAI {#connect-crewai-to-hindsight}

安装、Cloud/自托管 configure、ExternalMemory 接入见：

- [使用 Hindsight 为 CrewAI 添加持久记忆](https://hindsight.vectorize.io/guides/2026/05/04/guide-crewai-memory-with-hindsight)

运行后再选范围。

## 混合：共享上下文与私人草稿 {#a-hybrid-shared-context-plus-private-scratch}

共享协调、私人草稿可同时。

共享保存所有角色应见的发现决策约定；大量中间推理如分析草稿写第二私人实例或工具。

```python
# 共享团队记忆，所有人通过此库协调 {#shared-crew-memory-everyone-coordinates-through-this-bank}
shared = HindsightStorage(bank_id="research-crew",
                          mission="跟踪研究发现和团队决策。")

# 分析员私人草稿不进入共享库 {#private-scratch-for-the-analyst-kept-out-of-the-shared-bank}
analyst_scratch = HindsightReflectTool(bank_id="research-crew-analyst-scratch")
analyst = Agent(role="分析员", goal="...", backstory="...",
                tools=[analyst_scratch])

crew = Crew(agents=[researcher, analyst, writer], tasks=[...],
            external_memory=ExternalMemory(storage=shared))
```

ExternalMemory 协调、反思工具私人推理，mission 按实际目标组织。

## 验证共享有效 {#verify-that-shared-memory-is-working}

测试一角色输出在后续另一角色上下文：

1. 首次研究员输出易识别事实决策。
2. 完成，save 存共享。
3. 再次相关写作任务。
4. 不提醒确认召回。

首次研究 Rust 优势，第二次改“比较 Rust 与 Go”，自动带回即有效。

失败则 verbose、同 ID、存储完成。

## 常见错误 {#common-mistakes}

### 以为分库也隔离自动读 {#assuming-per-agent-banks-isolate-recall-too}

只隔离 save，search 仍基础，真正需独立实例。

### 过早分库 {#splitting-into-per-agent-banks-too-early}

多数先共享，具体角色需求才隔离。

### 运行间改 ID {#changing-the-bank-id-between-runs}

同 ID 才延续，不同看似故障实际范围错。

### 目标模糊 {#a-mission-that-is-too-vague}

mission 具体才能指导提取。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，configure 本地 URL 省密钥。

### 默认整个团队共享吗？ {#should-the-whole-crew-share-one-bank-by-default}

通常是，具体角色需要才拆。

### 如何传到另一智能体？ {#how-does-one-agents-memory-reach-another-agent}

同库 save 写、任务前 search 读，工具可显式控制。

### 能混合吗？ {#can-i-mix-shared-and-isolated-memory-in-one-crew}

能，共享 ExternalMemory 加角色私人实例或工具。

## 后续步骤 {#next-steps}

- 先按 [CrewAI 指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-crewai-memory-with-hindsight)接入。
- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [CrewAI 集成文档](/sdks/integrations/crewai)。
