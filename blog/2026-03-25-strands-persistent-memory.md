---
title: "为什么您的 AWS Strands 智能体不断从头开始（以及如何阻止它）"
authors: [benfrank241]
date: 2026-03-25T12:00
tags: [strands, aws, agents, python, memory, tutorial]
image: /img/blog/strands-persistent-memory.webp
hide_table_of_contents: true
---

![为什么您的 AWS Strands 智能体不断从头开始（以及如何阻止它）](/img/blog/strands-persistent-memory.webp)

AWS Strands 智能体默认是无状态的——每个会话都是冷启动的。以下是如何使用 `hindsight-strands` 添加持久的长期记忆，以便您的智能体记住运行过程中重要的事情。

<!-- truncate -->

## 概览 {#tldr}

- AWS Strands 智能体默认是无状态的——每个会话都是冷启动的
- `hindsight-strands` 为任何 Strands 智能体添加了三种原生记忆工具：记忆存储、记忆召回和反思
- `memory_instructions()` 在智能体启动前将相关记忆直接预加载到系统提示符中
- 可与任何Strands兼容的LLM后端配合使用：基岩、Anthropic、OpenAI
- 您可以控制记住什么、回忆多少以及如何使用标签来确定记忆范围

---

## 问题 {#the-problem}

AWS Strands 为您提供了一种干净的、基于装饰器的方式来构建智能体。定义你的工具，连接一个模型，然后你就可以运行了。问题是：每次谈话都从头开始。

让您的智能体记住您的 AWS 区域偏好。会的。下次会议时再问它——它不会知道你在说什么。 `@tool` 模式处理智能体能力的形状，但它与持久性无关。

对于大多数演示用例来说，这并不重要。对于实际应用程序（面向客户的智能体、编码助理、支持机器人）来说，这是一个基本限制。

---

## 方法 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight)是AI智能体的记忆层。它存储事实，在查询时提取语义相关的事实，并可以从累积的上下文中合成推理的答案。 `hindsight-strands` 包将其包装到本机 Strands 工具中，因此您的智能体可以像使用任何其他功能一样管理自己的记忆。

三种工具被添加到您的智能体中：

- **`hindsight_retain`** — 将一条信息存储到记忆库中
- **`hindsight_recall`** — 语义搜索记忆并返回相关事实
- **`hindsight_reflect`** — 从记忆中的所有内容中综合出一个合理的答案

还有一个 `memory_instructions()` 帮助程序，可以在智能体启动之前运行记忆召回查询并将结果注入系统提示符中 - 当您希望智能体从第一条消息中感知上下文时非常有用，而不仅仅是在它显式调用工具时有用。

```
User session

┌─────────────────────────────────────────┐
│  System prompt                          │
│  + memory_instructions() results        │
├─────────────────────────────────────────┤
│  Agent (Strands)                        │
│  ├── hindsight_retain                   │
│  ├── hindsight_recall                   │
│  └── hindsight_reflect                  │
└─────────────────────────────────────────┘
          │                   ▲
        retain              recall
          │                   │
          ▼                   │
    ┌───────────────────────────────┐
    │        Hindsight bank         │
    └───────────────────────────────┘
```

---

## 实施 {#implementation}

### 安装 {#install}

```bash
pip install hindsight-strands
```

您还需要一个正在运行的Hindsight实例。两种选择：

**选项 1 — Hindsight Cloud（无需设置）**

在 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 注册并从仪表板获取您的 API URL 和密钥。直接将它们传递给`create_hindsight_tools()`。

> **注意：** 如果您想完全跳过自托管，请使用 Hindsight Cloud — 免费开始。

**选项 2 — 使用 Docker 自托管**

```bash
export OPENAI_API_KEY=sk-...

docker run --rm -it --pull always \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

API 侦听端口 `8888`。 UI 可在 `http://localhost:9999` 获取。 Hindsight 还支持 Anthropic、Gemini、Groq 和 Ollama — 交换 `HINDSIGHT_API_LLM_PROVIDER` 和相应的密钥。

### 基本设置 {#basic-setup}

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
)

agent = Agent(tools=tools)
```

`bank_id` 是Hindsight 划分记忆的方式。使用一些有意义的东西：用户 ID、会话命名空间、项目 slug。记忆库是在第一次写入时自动创建的。

现在智能体拥有三个可以调用的新工具。运行会话：

```python
agent("请记住，我正在部署到 us-east-1，并且我更喜欢使用 Bedrock Nova Pro 进行推理。")
```

智能体将调用`hindsight_retain`并告知相关事实。下一届会议：

```python
agent("此部署应针对什么型号和区域？")
```

它将调用`hindsight_recall`，检索存储的首选项，并正确回答 - 即使在新的Python过程中也是如此。

### 将记忆预加载到系统提示符中 {#pre-loading-memory-into-the-system-prompt}

当智能体知道需要查询时，基于工具的召回效果很好。但有时希望第一条消息之前就已有上下文。这就是 `memory_instructions()` 的用途：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools, memory_instructions

bank_id = "user-123"
api_url = "http://localhost:8888"

#智能体开始前的记忆召回相关上下文
memories = memory_instructions(
    bank_id=bank_id,
    hindsight_api_url=api_url,
    query="用户偏好和环境设置",
)

agent = Agent(
    tools=create_hindsight_tools(bank_id=bank_id, hindsight_api_url=api_url),
    system_prompt=f"你是一位乐于助人的 AWS 基础设施助手。\n\n{memories}",
)
```

`memory_instructions()` 同步运行记忆召回查询并返回一个格式化字符串，您可以将其嵌入到提示中的任何位置。输出看起来像：

```
##相关回忆

- User prefers Bedrock Nova Pro for inference tasks
- Default deployment region is us-east-1
- Project uses CDK for infrastructure
```

结合两种方法：使用`memory_instructions()`作为环境上下文，将工具保留在适当的位置，以便智能体在会话期间主动学习新事物。

### 全局配置 {#global-configuration}

如果您要跨多个模块实例化智能体，则在各处线程化 `hindsight_api_url` 和其他参数会变得乏味。启动时使用一次`configure()`：

```python
from hindsight_strands import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="YOUR_API_KEY",       #如果启用了身份验证
    budget="mid",                  # low / mid / high
    tags=["env:prod"],             #标记本次会议编写的所有内容
)

#在其他地方，无需传递连接详细信息
tools = create_hindsight_tools(bank_id="user-123")
```

`budget` 控制在记忆召回上花费了多少token — `low` 快速且便宜，`high` 提取更多上下文。默认为`mid`。

### 基于标签的范围界定 {#tag-based-scoping}

标签可让您跨记忆库或环境组织和过滤记忆：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    tags=["env:prod", "team:platform"],        #适用于保留的所有内容
    recall_tags=["env:prod"],                  #仅记忆召回带有此标签的记忆
    recall_tags_match="all",                   #必须匹配所有标签（相对于“任何”）
)
```

如果您跨环境或团队共享记忆库并希望保持记忆召回范围，这非常有用。

### 选择性工具 {#selective-tools}

您不必启用所有三个工具。

只读智能体对于服务最终用户非常有用，他们应该能够查询记忆但不能修改它——例如，面向客户的助手从由单独进程维护的共享知识记忆库中读取内容：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    enable_retain=False,
    enable_recall=True,
    enable_reflect=True,
)
```

只写智能体对于摄取管道非常有用——一种后台智能体，可以处理文档、支持票证或日志并存储结构化事实，而不会暴露记忆召回：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    enable_retain=True,
    enable_recall=False,
    enable_reflect=False,
)
```

---

## 陷阱和边缘情况 {#pitfalls--edge-cases}

**智能体不会记忆存储，除非它决定这样做。**
记忆工具只是工具——智能体根据上下文调用它们。如果你要求它“记住 X”，它会的。如果您进行一次临时交换并希望它归档某些内容，那么它可能不会。使用`memory_instructions()`注入重要的东西，而不是希望智能体自主地保留它。

**`bank_id` 是你的一致性原语。**
如果两个会话使用不同的`bank_id`值，则它们有单独的记忆——句号。确保用户身份在您的应用程序中可靠地映射到`bank_id`。一个常见的错误是使用会话 ID 而不是用户 ID，这会默默地为每个会话提供一张白纸。

**Asyncio 与Strands 冲突。**
Strands 运行自己的事件循环。 `hindsight-strands` 包通过在 `ThreadPoolExecutor` 而不是 `asyncio.run()` 中执行 Hindsight 客户端调用来处理此问题。如果您在此基础上进行构建或编写自定义工具，请不要尝试直接在 Strands 工具内调用 `await` Hindsight 调用 — 您将收到“事件循环已在运行”错误。

**`memory_instructions()` 是同步且阻塞的。**
它在智能体初始化时运行网络调用。如果智能体经常被重建，不要在热循环中或在每个请求中调用它。如果查询是静态的并且您正在启动许多智能体，则缓存结果。

**​​反思很贵。**
`hindsight_reflect` 从记忆中综合答案，而不仅仅是检索事实。它对于开放式查询更有用，但会使用更多标记。如果成本是一个问题，请将其禁用并使用记忆召回代替。

---

## 权衡与替代方案 {#tradeoffs--alternatives}

**何时不使用此功能：**
如果您的会话是完全独立的并且用户期望没有连续性，那么添加记忆工具会带来不必要的复杂性和延迟。并非每个智能体都需要持久状态。

**对话历史与长期记忆：**
Strands 通过其消息历史记录自动管理会话内上下文。 `hindsight-strands` 用于跨会话记忆——需要在单个对话之外保存的事实。不要用它来代替提示历史记录。

**替代方案：**
- **DynamoDB / RDS**：您可以通过将会话数据写入数据库并将其加载回来来滚动自己的持久性。更多控制，更多代码，无需语义搜索。
- **Amazon Bedrock AgentCore 记忆**：AWS 针对 Bedrock 智能体的完全托管记忆服务。自动处理短期（会话内）和长期（跨会话）记忆。更紧密的 AWS 集成，但将您锁定在 Bedrock 智能体运行时 — 您无法将其与非 Bedrock 提供商支持的 Strands 智能体一起使用。
- **LangChain 记忆原语**：如果你已经在LangChain，它的记忆抽象更加成熟。 `hindsight-strands`的存在是因为Strands有自己的工具协议，LangChain记忆无法插入。

---

## 回顾 {#recap}

Strands 智能体默认是无状态的。 `hindsight-strands` 添加了三种原生记忆工具——记忆存储、记忆感知、反思——让您的智能体使用与其他所有事物相同的 `@tool` 协议来管理自己的长期记忆。 `memory_instructions()` 处理您希望预加载上下文而不是按需检索上下文的情况。

心智模型：记忆库的范围为`bank_id`，标签可让您跨环境进行过滤，`budget`控制记忆召回深度。其他一切都只是带有额外工具的Strands智能体。

---

## 后续步骤 {#next-steps}

- [PyPI 的后见之明](https://pypi.org/project/hindsight-strands/)
- [Hindsight文档：Strands集成指南](https://hindsight.vectorize.io/sdks/integrations/strands)
- 使用 Docker 在本地运行 Hindsight 并尝试上面的快速启动
- 探索`memory_instructions()`在面向客户的应用程序中预热智能体
- 查看 [CrewAI](/blog/2026/03/02/crewai) 和 [LangGraph](/blog/2026/03/24/langgraph-longterm-memory) 集成帖子，以对类似模式进行比较
