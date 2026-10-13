---
title: "指南：超越RAG — 将智能体记忆添加到LlamaIndex"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, llamaindex, rag, memory]
description: "LlamaIndex RAG 检索您的文档内容； Hindsight 添加了智能体记忆层，可以记住过去的课程学到的内容以及每个用户喜欢的内容。"
image: /img/guides/guide-llamaindex-agent-memory-beyond-rag.svg
hide_table_of_contents: true
---

![指南：超越 RAG，为 LlamaIndex 添加智能体记忆](/img/guides/guide-llamaindex-agent-memory-beyond-rag.svg)

LlamaIndex最出名的是RAG：在文档上建立索引并检索回答问题的段落。这就是对固定知识库的检索。 **智能体记忆** 是另一回事 - 它是过去会话中发生的事情、做出的决定以及该特定用户的偏好。RAG回答“文档怎么说”； 记忆回答“我们学到了什么，这个用户想要什么”。

这两种能力不是竞争对手。他们相辅相成。仅具有 RAG 的 LlamaIndex 智能体会以陌生人的身份重新认识每个用户，并在每次运行时重新发现相同的上下文。仅具有记忆的LlamaIndex智能体具有连续性，但没有可供借鉴的基础知识基础。将两者放在一起，智能体就会从索引*和*中回忆起持久的、权威的知识，以及之前对话中不断变化的个人背景。

本指南解释了哪里RAG停止，记忆开始，然后展示如何Hindsight添加记忆层LlamaIndex通过集成已经提供的两种模式：智能体驱动工具 (`HindsightToolSpec`) 并自动记忆LlamaIndex的`BaseMemory`接口。这是一个概念性和实用性指南，而不是安装演练 — [配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight) 涵盖安装。

<!-- truncate -->

> **快速解答**
>
> 1.保留您的 LlamaIndex RAG 索引以获取基础文档知识。
> 2.添加 Hindsight 表示智能体记忆 — 过去的会话、决定、偏好。
> 3.使用`HindsightMemory` (`BaseMemory`) 用于自动  每回合recall/retain。
> 4.使用`HindsightToolSpec`智能体何时应决定何时存储或搜索记忆。
> 5.并排运行 RAG 和记忆：索引回答“文档说了什么”，记忆回答“我们学到了什么”。

## RAG检索知识； 记忆保留经验 {#rag-retrieves-knowledge-memory-retains-experience}

RAG和智能体记忆都是“检索”，这就是它们被混淆的原因，但它们回答了不同的问题。

**RAG** 对您提前构建的文档索引进行操作。该语料库是经过编写的，大部分是静态的——产品文档、知识库、代码库、一组 PDF。当有查询进来时，LlamaIndex嵌入它，检索最相关的块，并将它们交给模型。答案是基于*文件内容*。如果文档没有更改，明天相同的查询将返回相同的上下文。

**智能体记忆** 通过智能体在运行时积累的经验流来运作。没有人预先编写它——它是在会议发生时编写的。它捕获用户告诉智能体的内容、做出了哪些决定以及原因，以及仅通过交互才能显现出来的偏好（“我更喜欢深色模式”、“始终使用TypeScript，”“我们已经尝试过这种方法，但失败了”）。这就是普通的材质RAG索引没有地方可以存储，因为它不在你的文档中 - 它*出现*来自使用。

Hindsight 是为第二项工作而构建的。它将记忆组织为世界事实（一般知识）、经验事实（发生了什么）和心智模型（综合偏好和模式）——静态文档索引不提供的结构。

## RAG停止且记忆开始的地方 {#where-rag-stops-and-memory-begins}

快速判断一条信息属于哪一层的方法：

- **“API 参考如何说明分页？”** →RAG。答案就在您的文档中。
- **“上周我们对分页做出了什么决策？”** → 记忆。答案就在过去的会话中。
- **“退款政策是什么？”** →RAG。它是创作知识。
- **“这个用户通常喜欢简短还是详细的解释？”** → 记忆。这是一种习得的偏好。

RAG 停在语料库的边缘。当有用的事实是智能体*学到了*而不是作者*写道*时，你就进入了记忆领域。 LlamaIndex为您提供第一个检索引擎； Hindsight 为您提供第二个记忆引擎。

## 添加记忆层（工具+自动BaseMemory） {#adding-the-memory-layer-tools--automatic-basememory}

`hindsight-llamaindex` 包暴露了两种互补的模式。您可以使用其中之一，或同时使用两者。

**自动记忆（`HindsightMemory`）**实现LlamaIndex的`BaseMemory` 接口，因此记忆无需智能体思考即可发生。每回合，`aget(input)` 回忆起相关记忆Hindsight并将它们作为系统消息添加到前面； `aput(message)` 保留信息以供将来记忆召回。你将它传递给智能体作为 `memory=`：

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightMemory
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    memory = HindsightMemory.from_client(
        client=client,
        bank_id="user-123",
        mission="跟踪用户偏好和项目背景",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("记住我更喜欢深色模式", memory=memory)
    print(response)

asyncio.run(main())
```

**智能体控制的工具（`HindsightToolSpec`）** 将记忆存储、记忆召回和反思暴露为智能体可以选择调用的工具。当您希望模型来决定时，这适合*当*记忆值得书写或搜索，而不是每次都这样做：

```python
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightToolSpec
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

client = Hindsight(base_url="http://localhost:8888")

spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    mission="跟踪用户偏好",
)
tools = spec.to_tool_list()

agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
```

您可以使用缩小暴露的工具范围 `spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])`，或通过 `create_hindsight_tools(...)`工厂与`include_retain` / `include_recall` / `include_reflect` 旗帜。两种模式共享相同的记忆库，因此自动存储的事实可用于显式记忆召回工具，反之亦然。完整参数表在[LlamaIndex 集成文档](/sdks/integrations/llamaindex)。

## 连接LlamaIndex至Hindsight {#connect-llamaindex-to-hindsight}

安装和首次接线包含在中 [LlamaIndex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight)。简而言之：`pip install hindsight-llamaindex`，点a`Hindsight` 客户位于Hindsight Cloud或本地API，并通过马厩`bank_id`。一旦到位，请回到这里了解记忆如何与您的RAG索引。

## RAG和记忆一起使用 {#using-rag-and-memory-together}

干净的架构将两层分开，并让智能体在这两层上进行绘制：

- 你的**LlamaIndex 查询引擎/检索器** 保持原样 - 基于文档索引的答案。
- **Hindsight 记忆** 与 层叠 `HindsightMemory` 用于自动每回合记忆召回和记忆存储。
- （可选）公开显式的 `reflect` 工具，智能体可以根据需要推理累积的记忆。

集成正是针对这种组合而设计的。您可以附加自动记忆*和*同时是工具的子集 — 让 `HindsightMemory`手柄recall/retain，而工具规范仅公开 `reflect`：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

#自动记忆以丰富上下文
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

# 仅显式反思工具；记忆层处理召回/存储
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,
    include_recall=False,
    include_reflect=True,
)

agent = ReActAgent(tools=tools, llm=llm)
response = await agent.run("我应该优先考虑什么？", memory=memory)
```

你的RAG工具也存在于此 `tools` 列表。智能体现在从索引中检索基础知识，并在同一次运行中回忆起从记忆中学到的上下文——文档告诉它*什么是真的*，记忆告诉它*这个用户和这个项目决定什么*。

## 验证记忆是否有效 {#verify-that-memory-is-working}

因为记忆是关于跨会话的连续性，所以要在两次运行中验证它，而不是一次：

1. 用稳定版运行智能体一次`bank_id` 并陈述偏好或决定（“我更喜欢深色模式”）。
2. 与*同上*`bank_id`。
3. 问一些取决于前一回合的问题（“你应该如何格式化我的输出？”）。
4. 确认`HindsightMemory` 无需手动工具调用即可注入早期上下文。

如果第二次运行使用第一次运行的详细信息进行回答，则记忆层正在工作。要确认它与RAG是分开的，请提出一个你的文档无法回答但过去的会话可以回答的问题——如果智能体仍然正确，那么答案来自记忆。

## 常见错误 {#common-mistakes}

### 将RAG视为记忆 {#treating-rag-as-memory}

将对话历史记录或用户偏好填充到文档索引中是脆弱的，并且会模糊创作知识与紧急经验。保留文档的索引，让Hindsight保存记忆。

### 每次运行使用新的记忆库ID {#using-a-new-bank-id-per-run}

连续性取决于重复使用相同的`bank_id`。每次运行都会产生一个新的记忆库，从而导致智能体失忆症——记忆召回和记忆存储从来不会出现在同一个存储库中。

### 期望记忆回答文档问题 {#expecting-memory-to-answer-document-questions}

记忆保存的是智能体学到的东西，而不是你的完整语料库。 “手册第4节说什么”是一个RAG问题；不要指望记忆可以替代索引。

### 将任务留空在专门的智能体上 {#leaving-the-mission-blank-on-a-specialized-agent}

记忆库`mission` 指导事实提取。对于特定领域的智能体，描述性任务（“跟踪项目决策和编码偏好”）会产生比默认情况更清晰的记忆。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器的工作方式相同 — 指向 `Hindsight` 您当地的客户APIURL（例如`http://localhost:8888`）。云只是一个托管后端。

### 添加记忆会取代我的RAG管道吗？ {#does-adding-memory-replace-my-rag-pipeline}

没有。它们是单独的层。您的LlamaIndex检索器不断回答文档问题； Hindsight 在顶部添加了过去会话和偏好的记忆召回。

### ​​我应该使用 HindsightMemory 还是 HindsightToolSpec？ {#should-i-use-hindsightmemory-or-hindsighttoolspec}

从开始 `HindsightMemory` 用于自动每回合记忆召回和记忆存储。伸手去拿`HindsightToolSpec` 当智能体应该明确决定何时存储、搜索或反思时，当你想要自动记忆和按需记忆时，将两者结合起来 `reflect`工具。

### 偏好和决定实际上存在于哪里？ {#where-do-preferences-and-decisions-actually-live}

在Hindsight由您的 键入的记忆库 `bank_id`，按照世界事实、经验事实和心智模型进行组织——不在您的文档索引中。

## 后续步骤 {#next-steps}

- 跟随[LlamaIndex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight) 用于安装和首次接线
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管记忆后端
- 阅读[完整 Hindsight 文档](/)
- 关注[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[LlamaIndex 集成文档](/sdks/integrations/llamaindex)
