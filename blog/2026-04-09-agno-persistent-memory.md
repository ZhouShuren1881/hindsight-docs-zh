---
title: "Agno持久记忆：Agno智能体的长期记忆"
authors: [benfrank241]
date: 2026-04-09T09:00
tags: [agno, integrations, agents, memory, persistent-memory, python, tutorial]
description: "Agno 智能体每次运行都焕然一新。后见之明-agno 添加了后见之明工具和记忆指令，以便他们可以跨会话进行记忆存储、记忆召回和反思。"
image: /img/blog/agno-persistent-memory.webp
hide_table_of_contents: true
---

![Agno持久记忆：Agno智能体的长期记忆](/img/blog/agno-persistent-memory.webp)

如果您使用[Agno](https://docs.agno.com/)构建了智能体，您就会知道该框架可以很好地处理多模式输入、团队协调和结构化输出。它不处理运行之间的记忆。每个`agent.run()`都以一个空的上下文窗口开始。智能体不知道用户上周说了些什么，他们分享了什么偏好，或者它已经研究过什么。

​​添加持久记忆不需要构建自定义RAG管道或维护您自己的矢量存储。 `hindsight-agno`包扩展了Agno的原生`Toolkit`模式，为您的智能体提供长期记忆：记忆存储事实，通过语义搜索记忆召回它们，并从积累的知识中合成连贯的答案。

<!-- truncate -->

## 概览 {#tldr}

- Agno没有内置的持久记忆。每个`agent.run()`都从零开始。
- `hindsight-agno` 添加了 `HindsightTools`，一个原生的 Agno `Toolkit`，带有记忆存储、记忆召回和反思工具。
- 三行设置：安装包，创建`HindsightTools`，将其传递给`Agent`。
- `memory_instructions()`都会将相关记忆预加载到`Agent(instructions=[...])`中，因此智能体会根据上下文开始每次对话。
- 每用户记忆库隔离通过`user_id`或自定义`bank_resolver`自动工作。
- [Hindsight Cloud](https://ui.hindsight.vectorize.io) 完全跳过本地设置。两行配置即可运行。

## 问题：Agno没有持久记忆 {#the-problem-agno-has-no-persistent-memory}

[Agno](https://docs.agno.com/)是一个强大的智能体框架。它的`Toolkit`模式可以轻松添加工具，团队协调原语可以处理多智能体工作流程，结构化输出和流式处理开箱即用。但是 Agno 没有记忆层。

每一个`agent.run()`都是从无开始。智能体不知道用户在上一次会话中提到了什么。它不知道他们的偏好、重复出现的问题或智能体本身已经研究过的内容。如果用户今天告诉你的智能体一些重要的事情，那么明天这个事实就会消失。

您可以通过`messages`在单次运行中继续对话。但这是会话历史，而不是记忆。会话历史记录不会提取结构化事实，随着每次轮流线性增长，不会概括或重复数据删除，并且在进程退出时完全消失。

真正的智能体记忆是不同的：

- 从对话中提取离散事实并将其持久存储
- 构建实体和关系的知识图谱
- 通过语义搜索检索几天、几周和几个月的相关上下文
- 从分散的、积累的知识中合成连贯的答案

这就是[Hindsight](https://hindsight.vectorize.io/)提供的。 `hindsight-agno` 包将其直接连接到 Agno 的 `Toolkit` 系统，因此您无需自己构建任何这些。

## Agno持久记忆如何与Hindsight配合使用 {#how-agno-persistent-memory-works-with-hindsight}

`hindsight-agno`集成在两个点连接到Agno：工具和指令。

```text
Agno 智能体
  |-- tools=[HindsightTools(...)]
  |     |-- retain_memory      -> 将事实存储到长期记忆中
  |     |-- recall_memory      -> 搜索相关记忆
  |     |-- reflect_on_memory  -> 从记忆中综合生成答案
  |
  |-- instructions=[memory_instructions(...)]
        |-- 自动将相关记忆召回到系统提示中
```

*工具* 让智能体在对话期间显式存储和检索记忆。 *使用说明* 在智能体开始响应之前，将相关记忆注入到系统提示中。无需调用工具。

`HindsightTools`直接扩展Agno的`Toolkit`基类，与Agno生态系统中`Mem0Tools`使用的模式相同。您可以像任何其他 Agno 工具包一样将其添加到 `tools=[...]` 中。

它有助于理解每个工具的作用以及智能体何时使用它：
当智能体遇到值得保留的东西时，会调用

- **`retain_memory`**：明确的偏好、决定、有关用户或项目的事实。
当智能体遇到值得保留的东西时，会调用
- **`recall_memory`** 返回过去会话中匹配事实的列表。智能体在需要查找某些内容时会使用它。
- **`reflect_on_memory`** 将这些事实综合成一个连贯的答案。其中 `recall_memory` 返回列表，`reflect_on_memory` 推理所有相关记忆以产生单个响应。最好回答诸如“你对我的工程风格了解多少？”之类的问题。比原始事实检索。

## 设置Agno持久记忆 {#setting-up-agno-persistent-memory}

### 第一步：开始Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
```

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

这在本地`http://localhost:8888` 开始Hindsight。唯一的外部依赖是用于实体提取的 LLM API 键。

不想自行托管？使用[Hindsight Cloud](https://ui.hindsight.vectorize.io)并完全跳过此步骤。

### 第 2 步：安装 Agno 集成 {#step-2-install-the-agno-integration}

```bash
pip install hindsight-agno agno
```

### 第3步：将`HindsightTools`添加到您的智能体中 {#step-3-add-hindsighttools-to-your-agent}

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
)
```

这就是完整的设置。智能体现在拥有三种工具：

- **`retain_memory`**：将信息存储到长期记忆中
- **`recall_memory`**：搜索长期记忆中的相关事实
- **`reflect_on_memory`**：从积累的记忆中综合出一个合理的答案

### 第四步：测试跨会话记忆 {#step-4-test-cross-session-memory}

```python
#第一节：智能体存储上下文
agent.print_response(
    "记住我更喜欢函数式编程模式"
    "我正在Python构建数据管道。"
)

#后续课程：智能体回忆上下文
agent.print_response("我应该采取什么方法来处理错误？")
```

重新启动进程并再次运行第二个调用。智能体仍然知道。 Agno持久记忆存储在Hindsight中，而不是智能体的上下文窗口中。

### 第5步：使用`memory_instructions`自动注入记忆 {#step-5-auto-inject-memories-with-memoryinstructions}

对于您希望在每次运行开始时自动注入记忆的情况，请使用`memory_instructions`：

```python
from hindsight_agno import HindsightTools, memory_instructions

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
    instructions=[memory_instructions(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
)
```

每到`agent.run()`，`memory_instructions`都会调用Hindsight的记忆召回API，并将相关记忆注入系统提示符中。智能体以上下文开始每次对话。无需调用工具。

您可以自定义记忆召回查询、结果计数和前缀：

```python
memory_instructions(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    query="用户偏好、历史记录和上下文",
    max_results=10,
    prefix="以下是你已知的用户信息：\n",
)
```

如果记忆召回不返回任何内容或失败，`memory_instructions` 返回空字符串。智能体运行正常。

## 高级Agno记忆配置 {#advanced-agno-memory-configuration}

### 每用户记忆库隔离 {#per-user-bank-isolation}

对于服务多个用户的智能体，`HindsightTools`动态解析记忆库ID。决议顺序：

1. `bank_resolver`，用于自定义逻辑的可调用`(RunContext) -> str`
2. `bank_id`，传递给构造函数的静态记忆库ID
3. `RunContext.user_id`，用于自动每用户记忆库

```python
#每个用户记忆库
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="http://localhost:8888")],
    user_id="user-123",
)

#基于团队的记忆库的自定义解析器
def resolve_bank(ctx):
    return f"team-{ctx.user_id.split('-')[0]}"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_resolver=resolve_bank,
        hindsight_api_url="http://localhost:8888",
    )],
)
```

### 选择要包含的记忆工具 {#selecting-which-memory-tools-to-include}

```python
#只读智能体：记忆、回忆和反思，不存储
tools = HindsightTools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    enable_retain=False,
    enable_recall=True,
    enable_reflect=True,
)
```

在多智能体设置中有用：一个智能体积累知识，另一个智能体从中回答问题。

### 全局配置 {#global-configuration}

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    max_tokens=4096,
)

agent1_tools = HindsightTools(bank_id="user-alice")
agent2_tools = HindsightTools(bank_id="user-bob")
```

### Hindsight Cloud端配置 {#hindsight-cloud-configuration}

```python
from hindsight_agno import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_your_token",
)
```

无需管理守护进程。没有本地Postgres。云服务器处理提取、索引和检索。

## 完整工作示例 {#full-working-example}

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools, memory_instructions

BANK_ID = "demo-user"
HINDSIGHT_URL = "http://localhost:8888"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id=BANK_ID,
        hindsight_api_url=HINDSIGHT_URL,
    )],
    instructions=[memory_instructions(
        bank_id=BANK_ID,
        hindsight_api_url=HINDSIGHT_URL,
    )],
)

print("--- 运行 1：教授智能体 ---")
agent.print_response(
    "记住：我是一名后端工程师。我使用 Python 和 Rust。"
    "与大型框架相比，我更喜欢小型、可组合的库。"
)

print("\n--- 运行 2：智能体召回上下文 ---")
agent.print_response("为我的下一个项目推荐一个网络框架。")

print("\n--- Run 3: Agent synthesizes ---")
agent.print_response("你对我的工程理念了解多少？")
```

运行两次。智能体会记住第一次执行以来的所有事情。

## 何时不使用Agno持久记忆 {#when-not-to-use-agno-persistent-memory}

跳过记忆层，实现从不与同一用户交互两次的一次性智能体、每个请求完全独立的无状态API处理程序，或者您想要完全控制输入提示内容的智能体。在这些情况下，请直接使用 Hindsight Python 客户端，而不是 Agno 集成。

## 与替代品相比如何 {#how-it-compares-to-alternatives}

|方法|优势|弱点|最适合|
|---|---|---|---|
|**Hindsight + Agno**|多策略检索（语义+BM25+图+时态）、结构化事实提取、合成|需要Hindsight 服务器或云|需要深度记忆的多会话智能体|
|**手动消息**|内置于Agno，无依赖|不持久，增长到上下文窗口限制|简短的单会话对话|

## 陷阱 {#pitfalls}

**记忆库ID冲突。** 每个`bank_id` 都是一个单独的记忆存储。对每个用户、每个智能体或每个项目使用唯一的记忆库 ID，以防止不相关的智能体之间的记忆流失。

**记忆指令延迟。** `memory_instructions` 在每个 `agent.run()` 上调用记忆召回 API。对于延迟敏感的应用程序，请使用`budget="low"`和较小的`max_results`。 根据记忆库大小和网络条件，记忆召回会增加大约 50 到 200 毫秒。

**重复的记忆。**Hindsight在事实级别上进行重复数据删除，但在系统中提示智能体指导何时存储新事实会有所帮助。

## 回顾 {#recap}

||Agno 默认|与 Hindsight|
|---|---|---|
|跨课程记忆|无|自动|
|记忆设置|无|`pip install hindsight-agno`|
|记忆召回机制|不可用|通过工具或指令进行语义搜索|
|每用户隔离|否|通过 `user_id` 或 `bank_resolver`|
|托管|不适用|本地或[Hindsight Cloud](https://ui.hindsight.vectorize.io)|

## 后续步骤 {#next-steps}

- **Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)
- **本地尝试**: `pip install hindsight-all hindsight-agno agno` 并运行上面的示例
- **配置参考**：[Agno集成文档](/sdks/integrations/agno)
- **探索其他集成**：[Pydantic AI](/sdks/integrations/pydantic-ai)、[LangGraph](/sdks/integrations/langgraph)、[CrewAI](/sdks/integrations/crewai)
- **检查知识图谱**：使用[Hindsight Cloud端仪表板](https://ui.hindsight.vectorize.io)浏览提取的事实、实体和关系
