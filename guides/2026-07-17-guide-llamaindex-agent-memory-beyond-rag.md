---
title: "指南：超越 RAG——为 LlamaIndex 添加智能体记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, llamaindex, rag, memory]
description: "LlamaIndex RAG 会检索文档中的内容；Hindsight 则添加智能体记忆层，记录过去会话中学到的内容和每位用户的偏好。"
image: /img/guides/guide-llamaindex-agent-memory-beyond-rag.svg
hide_table_of_contents: true
---

![指南：超越 RAG——为 LlamaIndex 添加智能体记忆](/img/guides/guide-llamaindex-agent-memory-beyond-rag.svg)

LlamaIndex 最为人熟知的用途是 RAG：为文档建立索引，并检索能够回答问题的段落。这是在固定知识语料库中进行检索。**智能体记忆**则是另一回事：它记录过去会话中发生的事情、做出的决定，以及这位特定用户的偏好。RAG 回答“文档说了什么”；记忆回答“我们学到了什么，以及这位用户想要什么”。

这两种能力并不冲突，而是相辅相成。只有 RAG 的 LlamaIndex 智能体每次运行时都要把每位用户当作陌生人重新认识一遍，并重新发现相同的上下文。只有记忆的 LlamaIndex 智能体虽然能保持连续性，却没有可供参考、有事实依据的知识库。把两者结合起来，智能体既能从索引中回忆持久、可靠的知识，也能回忆先前对话中不断变化的个人背景。

本指南会说明 RAG 在哪里止步、记忆从哪里开始，然后介绍 Hindsight 如何通过集成中已有的两种模式为 LlamaIndex 添加记忆层：由智能体调用的工具（`HindsightToolSpec`），以及通过 LlamaIndex `BaseMemory` 接口实现的自动记忆。本指南侧重概念和实践，不是安装教程；安装步骤请参阅[配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight)。

<!-- truncate -->

> **快速解答**
>
> 1. 保留 LlamaIndex RAG 索引，用于检索有依据的文档知识。
> 2. 添加 Hindsight 作为智能体记忆，用来记录过去的会话、决定和偏好。
> 3. 使用 `HindsightMemory`（`BaseMemory`）实现每轮自动召回/存入。
> 4. 当需要由智能体决定何时存入或检索记忆时，使用 `HindsightToolSpec`。
> 5. 并行使用 RAG 和记忆：索引回答“文档说了什么”，记忆回答“我们学到了什么”。

## RAG 检索知识；记忆留存经历 {#rag-retrieves-knowledge-memory-retains-experience}

RAG 和智能体记忆都会进行“检索”，因此容易被混为一谈，但它们回答的是不同的问题。

**RAG** 基于预先建立的文档索引工作。语料库由人编写，内容大多固定，例如产品文档、知识库、代码库或一组 PDF。收到查询后，LlamaIndex 会将其转换为嵌入向量，检索最相关的文本分块，再交给模型。答案以*文档内容*为依据。如果文档没有变化，明天用相同查询得到的上下文也会相同。

**智能体记忆**基于智能体运行期间不断积累的经历流工作。它不是由人预先编写的，而是在会话发生时逐渐写入。记忆会记录用户告诉智能体的内容、做出的决定及其原因，以及只有在交互过程中才会显现的偏好（“我更喜欢深色模式”“始终使用 TypeScript”“我们已经试过那种方法，但失败了”）。普通 RAG 索引无法存放这些内容，因为它们不在你的文档里，而是从实际使用中*逐渐形成*的。

Hindsight 正是为后一种用途打造的。它把记忆组织为世界事实（一般知识）、经历事实（发生过的事情）和心智模型（整合后的偏好与模式）；静态文档索引不具备这种结构。

## RAG 在哪里止步，记忆从哪里开始 {#where-rag-stops-and-memory-begins}

判断一条信息属于哪一层，可以快速问自己：

- **“API 参考文档对分页是怎么说的？”** → RAG。答案就在文档中。
- **“上周我们对分页做了什么决定？”** → 记忆。答案在过去的会话中。
- **“我们的退款政策是什么？”** → RAG。这是由人编写的知识。
- **“这位用户通常想要简洁还是详细的说明？”** → 记忆。这是从交互中学到的偏好。

RAG 的范围止于语料库边界。一旦有用的信息是智能体*学到的*，而不是作者*写下的*，就属于记忆的范畴。LlamaIndex 为前者提供检索引擎；Hindsight 为后者提供记忆引擎。

## 添加记忆层（工具 + 自动 BaseMemory） {#adding-the-memory-layer-tools--automatic-basememory}

`hindsight-llamaindex` 软件包提供两种互补的模式，可以单独使用，也可以同时使用。

**自动记忆（`HindsightMemory`）**实现了 LlamaIndex 的 `BaseMemory` 接口，因此无需智能体主动决定，记忆就会自动工作。每一轮中，`aget(input)` 会从 Hindsight 召回相关记忆，并将其作为系统消息添加到前文；`aput(message)` 会存入消息，供之后召回。将它通过 `memory=` 传给智能体：

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
        mission="Track user preferences and project context",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("Remember that I prefer dark mode", memory=memory)
    print(response)

asyncio.run(main())
```

**由智能体调用的工具（`HindsightToolSpec`）**会将存入、召回和反思作为工具提供，由智能体选择调用。如果你希望由模型决定*何时*值得写入或检索记忆，而不是每轮都执行，这种模式就很适合：

```python
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightToolSpec
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

client = Hindsight(base_url="http://localhost:8888")

spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
)
tools = spec.to_tool_list()

agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
```

你可以通过 `spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])` 限定要公开的工具，也可以通过 `create_hindsight_tools(...)` 工厂函数及其 `include_retain` / `include_recall` / `include_reflect` 标记来限定。两种模式共用同一个记忆库，因此自动存入的事实也能由显式召回工具获取，反之亦然。完整的参数表见 [LlamaIndex 集成文档](https://hindsight.vectorize.io/docs/integrations/llamaindex)。

## 将 LlamaIndex 连接到 Hindsight {#connect-llamaindex-to-hindsight}

安装和首次连接步骤请参阅 [LlamaIndex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight)。简而言之：运行 `pip install hindsight-llamaindex`，将 `Hindsight` 客户端指向 Hindsight Cloud 或本地 API，并传入稳定的 `bank_id`。完成后，可以回到这里了解如何让记忆与 RAG 索引协同工作。

## 同时使用 RAG 和记忆 {#using-rag-and-memory-together}

清晰的架构会将两层分开，让智能体同时利用两者：

- 你的 **LlamaIndex 查询引擎/检索器**保持原样，继续基于文档索引提供有依据的答案。
- **Hindsight 记忆**通过 `HindsightMemory` 接入，实现每轮自动召回和存入。
- 还可以公开一个显式的 `reflect` 工具，让智能体按需基于累积的记忆进行推理。

该集成正是为这种组合设计的。你可以同时接入自动记忆*和*部分工具，让 `HindsightMemory` 处理召回/存入，而工具规范只公开 `reflect`：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

# 自动记忆，用于补充上下文
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

# 仅公开显式反思工具；记忆负责召回/存入
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,
    include_recall=False,
    include_reflect=True,
)

agent = ReActAgent(tools=tools, llm=llm)
response = await agent.run("What should I prioritize?", memory=memory)
```

你的 RAG 工具也在同一个 `tools` 列表中。现在，智能体会在同一次运行中从索引检索有依据的知识，并从记忆召回学到的上下文：文档告诉它*哪些内容属实*，记忆则告诉它*这位用户和这个项目做过哪些决定*。

## 验证记忆是否生效 {#verify-that-memory-is-working}

记忆的作用是让信息跨会话延续，因此要通过两次运行来验证，而不是只运行一次：

1. 使用稳定的 `bank_id` 运行一次智能体，并陈述一项偏好或决定（“我更喜欢深色模式”）。
2. 使用*同一个* `bank_id` 开始一个新会话。
3. 提出一个依赖前一轮信息的问题（“你应该如何设置我的输出格式？”）。
4. 确认 `HindsightMemory` 无需手动调用工具便注入了先前的上下文。

如果第二次运行时，智能体能根据第一次运行中的细节作答，说明记忆层正在工作。要确认它与 RAG 相互独立，可以询问一个文档无法回答、但过去会话能够回答的问题；如果智能体仍答对了，答案就来自记忆。

## 常见错误 {#common-mistakes}

### 把 RAG 当作记忆 {#treating-rag-as-memory}

把对话历史或用户偏好塞进文档索引既不可靠，也会混淆由人编写的知识和使用中逐渐形成的经历。让索引存放文档，让 Hindsight 保存记忆。

### 每次运行都使用新的记忆库 ID {#using-a-new-bank-id-per-run}

连续性取决于重复使用同一个 `bank_id`。每次运行都新建记忆库会让智能体失忆，因为召回和存入永远不会访问同一个存储。

### 指望记忆回答文档问题 {#expecting-memory-to-answer-document-questions}

记忆保存智能体学到的内容，而不是你的完整语料库。“手册第 4 节说了什么？”属于 RAG 问题；不要指望记忆替代索引。

### 专业智能体的任务说明留空 {#leaving-the-mission-blank-on-a-specialized-agent}

记忆库的 `mission` 会引导事实提取。对于特定领域的智能体，使用描述清晰的任务说明（“跟踪项目决定和编码偏好”），比使用默认设置更能提取准确的记忆。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器工作方式相同：将 `Hindsight` 客户端指向本地 API URL（例如 `http://localhost:8888`）即可。Cloud 只是托管式后端。

### 添加记忆会取代我的 RAG 流程吗？ {#does-adding-memory-replace-my-rag-pipeline}

不会。它们是不同的层。LlamaIndex 检索器会继续回答文档问题；Hindsight 则在此基础上增加对过去会话和偏好的召回。

### 我应该使用 HindsightMemory 还是 HindsightToolSpec？ {#should-i-use-hindsightmemory-or-hindsighttoolspec}

先从 `HindsightMemory` 开始，实现每轮自动召回和存入。当你希望智能体明确决定何时存储、搜索或反思时，可以使用 `HindsightToolSpec`；如果既想要自动记忆，也想按需调用 `reflect` 工具，则可以同时使用两者。

### 偏好和决定实际存放在哪里？ {#where-do-preferences-and-decisions-actually-live}

它们存放在由你的 `bank_id` 标识的 Hindsight 记忆库中，并按世界事实、经历事实和心智模型组织，而不在文档索引中。

## 后续步骤 {#next-steps}

- 按照 [LlamaIndex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-llamaindex-memory-with-hindsight)完成安装和首次连接
- 如果你想使用托管式记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](https://hindsight.vectorize.io/docs)
- 阅读[快速入门指南](https://hindsight.vectorize.io/docs/quickstart)
- 查看 [Hindsight 的召回 API](https://hindsight.vectorize.io/docs/api/recall)
- 查看 [Hindsight 的存入 API](https://hindsight.vectorize.io/docs/api/retain)
- 阅读 [LlamaIndex 集成文档](https://hindsight.vectorize.io/docs/integrations/llamaindex)
