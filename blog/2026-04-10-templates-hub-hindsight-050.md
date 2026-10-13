---
title: "您的智能体记忆设置不断漂移。 Hindsight 0.5.0 添加模板中心。"
authors: [benfrank241]
date: 2026-04-10T09:00
tags: [hindsight, templates, memory, release, agents]
description: "Hindsight 0.5.0 添加了记忆库模板中心。浏览入门模板，导入清单以配置任何记忆库，并导出设置以在环境中重复使用。"
image: /img/blog/templates-hub-hindsight-050.webp
hide_table_of_contents: true
---

![您的智能体记忆设置不断漂移。 Hindsight 0.5.0 添加模板中心。](/img/blog/templates-hub-hindsight-050.webp)

每个使用长期记忆的团队最终都会遇到同样的问题：第一个记忆库经过仔细调整，然后每个新的记忆库都成为手动娱乐工作。 [Hindsight 0.5.0](/blog/2026/04/07/version-0-5-0) 对此添加了修复：*记忆库模板中心*。

<!-- truncate -->

import Figure from '@site/src/components/Figure';
import templates from '@site/figures/templates.json';

## 概览 {#tldr}

- Hindsight 0.5.0 添加了 *记忆库模板中心* 用于可重复使用的记忆库设置。
- 模板是一个JSON清单，捕获记忆库配置、心智模型和指令。
- 您可以在[hindsight.vectorize.io/templates](https://hindsight.vectorize.io/templates)浏览入门模板，然后通过API或控制平面导入它们。
- ​​您还可以导出现有的记忆库并在其他地方重复使用该设置。
- 重要的警告：模板捕获*配置*，而不是记忆库存储的记忆。

## 问题 {#the-problem}

大多数记忆系统都很容易启动，但标准化却很烦人。

第一次配置记忆库时，您会做出真正的决定。 `retain_mission` 应该优化什么？应该启用观察吗？整合后应该刷新哪个心智模型？哪些指令使智能体可靠有用？

这些选择很重要，因为它们决定了记忆库保留的内容、总结的方式以及智能体稍后返回的上下文类型。

如果没有可移植的模板格式，团队通常会选择以下三个糟糕的选择之一：

- 在 UI 中手动重新创建设置
- 在内部文档中分散JSON片段
- 将记忆库配置硬编码到一个集成中，并希望它在其他地方保持同步

这适用于一个记忆库。当您需要跨阶段、产品、特定于客户的记忆库或多个智能体框架相同的记忆行为时，它会很快变得混乱。

## 方法 {#the-approach}

Hindsight 0.5.0 将记忆库设置变成可重复使用的工件。

记忆库模板是一个声明性JSON清单，包含三个可选部分：

- `bank`，用于每个记忆库配置覆盖
- `mental_models`，用于您要创建或更新的模型
- `directives`，对于您想要附加到记忆库的指令级行为

这意味着智能体的记忆行为现在可以被视为配置即数据，而不是部落知识。

从高层次来看，工作流程如下所示：

<Figure doc={templates} />

新的模板中心为该工作流程添加了一个可发现的前端。您可以从已知良好的模板开始并从那里进行调整，而不是从空的记忆库开始。

## 实施/演练 {#implementation--walkthrough}

### 1。浏览入门模板 {#1-browse-the-starter-templates}

模板中心位于[hindsight.vectorize.io/templates](https://hindsight.vectorize.io/templates)。

在 0.5.0 中，图库附带了三个入门模板：

- **对话**
- **编码智能体**
- **私人助理**

图库支持：

- 类别过滤器
- 按名称/描述搜索
- 集成徽章
- 模式中的清单预览
- 一键JSON复制

这很重要，因为模板只有在人们可以在导入之前检查它们时才有用。 Hub 不会将配置隐藏在向导后面。您可以看到将应用于记忆库的实际清单。

模板可以很小，也可以很固执。例如，内置的Coding智能体模板包括专注于技术决策和项目结构的记忆存储任务，以及`project-context`和`developer-preferences`等心智模型。

### 2.通过一次 API 调用导入模板 {#2-import-a-template-with-one-api-call}

一旦有了清单，导入它就很简单了。

这是面向编码的记忆库的最小有效示例：

```bash
curl -X POST "$HINDSIGHT_URL/v1/default/banks/project-memory/import" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1",
    "bank": {
      "retain_mission": "提取技术决策及理由、架构选择、编码模式与约定、项目结构事实、库和工具偏好以及重复问题。忽略临时调试输出和模板内容。",
      "enable_observations": true,
      "observations_mission": "跟踪稳定的项目事实：技术堆栈、团队约定、架构模式以及代码库如何随时间演变。"
    },
    "mental_models": [
      {
        "id": "project-context",
        "name": "项目背景",
        "source_query": "What is the project'\''s tech stack, architecture, and key conventions? What are the main components and how do they fit together?",
        "max_tokens": 2048,
        "trigger": {
          "refresh_after_consolidation": true
        }
      }
    ]
  }'
```

这是 0.5.0 中的重要转变：配置记忆库不再需要一系列单独的设置步骤。您可以将设置配置为一个清单。

根据[记忆库模板API文档](/developer/api/bank-templates)，导入行为的工作方式如下：

- 配置字段`bank`根据记忆库覆盖应用
- 心智模型搭配`id`
- 指令与`name`匹配
- 创建新条目，更新现有条目

只要保持标识符稳定，这就会为您提供接近幂等记忆库设置的东西。

### 3。也从控制平面导入 {#3-import-from-the-control-plane-too}

如果你不想直接调用API，控制平面也支持模板。

记忆库创建对话框现在包含一个可选的*从模板导入*切换开关，您可以在创建记忆库时粘贴清单JSON。

这非常适合以下情况：

- 您正在交互测试入门模板
- 非后端队友需要提供记忆库
- 你想先检查清单，然后从 UI 创建记忆库

重要的设计选择是UI和API使用相同的清单模型。没有单独的“仅 UI 模板格式”可供学习。

### 4。导出工作记忆库并在其他地方重复使用 {#4-export-a-working-bank-and-reuse-it-elsewhere}

功能的另一半是导出。

一旦您的记忆库按照您想要的方式运行，您就可以导出其模板并将其重新用于另一个记忆库：

```bash
curl "$HINDSIGHT_URL/v1/default/banks/source-bank/export" > template.json

curl -X POST "$HINDSIGHT_URL/v1/default/banks/new-bank/import" \
  -H "Content-Type: application/json" \
  -d @template.json
```

控制平面还通过*操作 > 导出模板*从记忆库设置页面公开此流程。

这就是模板中心在操作上变得有用而不仅仅是方便的地方。

一些具体用例：

- 在许多客户记忆库中标记相同的支持-智能体记忆政策
- 将良好的暂存设置转移到生产中，而无需手动重建它
- 提供推荐的记忆库基线以及框架集成
- 在团队之间共享工作清单，而不共享底层记忆库数据

### 5。申请前验证 {#5-validate-before-applying}

Hindsight 还支持导入的试运行验证：

```bash
curl -X POST "$HINDSIGHT_URL/v1/default/banks/my-bank/import?dry_run=true" \
  -H "Content-Type: application/json" \
  -d @template.json
```

当以编程方式生成或编辑模板时，这一点很重要。

还有一个模式端点：

```bash
curl "$HINDSIGHT_URL/v1/bank-template-schema"
```

在 `dry_run=true` 和 JSON 架构之间，您有足够的结构将模板工具构建到 CI、管理面板或集成包中。

## 为什么中心比复制粘贴片段更有用 {#why-the-hub-is-more-useful-than-copy-paste-snippets}

Hub 不仅仅是一个更好的粘贴JSON 的地方。

它添加了临时片段通常缺少的三件事：

1. **可发现性。** 团队可以从真正的模板库而不是空白的记忆库开始。
2. **可检查性。** 您可以在应用之前预览确切的清单。
3. **便携性。** 导出的模板可以在记忆库之间移动，而无需拖动不相关的服务器默认值。

最后一点微妙而重要。

根据[记忆库模板文档](/developer/api/bank-templates)，导出仅包括显式设置为每个记忆库覆盖的配置字段。它确实 *不是* 导出包含服务器或租户默认值的完全解析的配置。

这使得模板更加便携。这也意味着您应该将它们视为可重用的覆盖层，而不是逐字节的环境快照。

## 陷阱和边缘情况 {#pitfalls--edge-cases}

### 1。模板不会移动记忆 {#1-templates-do-not-move-memories}

模板复制记忆库的设置，而不是其保留的内容。

如果您导出记忆库并将其导入到其他地方，您将获得相同的任务、心智模型和指令。你确实*不是*得到了旧记忆库的事实、观察或文档语料库。

这通常就是你想要的。如果您的目标是记忆库迁移，模板只是故事的一部分。

### 2。稳定的标识符很重要 {#2-stable-identifiers-matter}

心智模型与`id`匹配。指令由`name`匹配。

如果您在模板版本之间随意重命名这些值，Hindsight会将它们视为新条目而不是更新。对于计划随着时间的推移改进模板的团队来说，标识符规则很重要。

### 3。故意部分导出 {#3-export-is-intentionally-partial}

导出的模板仅包含显式的每记忆库覆盖。如果记忆库依赖于服务器范围的默认值，那么这些继承的默认值将被 *不是* 序列化到清单中。

这有利于可移植性，但这意味着跨环境的导入可能不相同，除非底层默认值一致。

### 4。 心智模型生成是异步的 {#4-mental-model-generation-is-asynchronous}

导入可以立即提供记忆库设置，但心智模型内容生成是异步发生的。

所以如果你导入模板并立即查询记忆库，那么在每个生成的心智模型完全刷新之前，结构配置可能已经存在。

### 5。入门模板仍然是入门模板 {#5-a-starter-template-is-still-a-starter-template}

内置模板是很好的默认值，而不是普遍真理。

从事生产事件响应的编码智能体可能需要与编码导师不同的记忆存储行为。一个人的私人助理可能需要比一般对话机器人更严格的任务。

使用 Hub 获得前 80% 的正确率，然后根据实际工作负载调整记忆库。

## 权衡与替代方案 {#tradeoffs--alternatives}

模板并不是标准化智能体记忆行为的唯一方法。

### 手动记忆库配置 {#manual-bank-configuration}

适用场景：

- 一次性实验
- 快速本地测试
- 只管理少数记忆库的团队

不足：

- 容易偏离预期
- 难以审查
- 难以跨环境重现

### 集成中的硬编码配置 {#hard-coding-configuration-in-an-integration}

适用场景：

- 具有明确设计取向的 SDK 封装
- 严格控制的内部平台

不足：

- 操作员不可见
- 更难导出和共享
- 通常与一个框架的生命周期相关

### 记忆库模板 {#bank-templates}

适用场景：

- 可在多个记忆库中重复设置
- 想要标准基线的平台团队
- 需要推荐的默认记忆策略的集成
- 共享记忆库行为而不共享记忆库数据

不足：

- 仍然需要标识符规则
- 不能替代数据迁移
- 导入后可能需要针对每个环境进行调整

如果您只有一个一次性记忆库，模板可能就有点过头了。如果您拥有多个智能体、多个环境或多个团队，它们就会变得更加引人注目。

## 回顾 {#recap}

Hindsight 0.5.0 中的记忆库模板中心解决了一个实际的操作问题：记忆行为太重要了，无法每次都手动重建。

核心思想很简单：

- 将记忆库行为定义为清单
- 浏览或导出清单
- 将其导入到任何需要相同设置的地方

这将记忆库配置变成可移植、可审查和可重用的东西。

对于认真构建智能体的团队来说，这就是“我们有一个经过精心调整的记忆库”和“我们有一个可重复的记忆配置策略”之间的区别。

## 后续步骤 {#next-steps}

- **使用Hindsight Cloud：** 使用 [免费帐户](https://ui.hindsight.vectorize.io) 跳过自托管
- **浏览入门图库：**[hindsight.vectorize.io/templates](https://hindsight.vectorize.io/templates)
- **阅读API文档：**[记忆库模板参考](/developer/api/bank-templates)
- **看看 0.5.0 中还有什么：**[Hindsight 0.5.0 的新增功能](/blog/2026/04/07/version-0-5-0)
- **探索框架集成：** [Agno](/sdks/integrations/agno)、[AutoGen](/sdks/integrations/autogen)、[LangGraph](/sdks/integrations/langgraph)、[Pydantic AI](/sdks/integrations/pydantic-ai)、[CrewAI](/sdks/integrations/crewai)
