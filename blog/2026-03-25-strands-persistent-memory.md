---
title: "为什么 AWS Strands 智能体总是从头开始（以及如何解决）"
authors: [benfrank241]
date: 2026-03-25T12:00
tags: [strands, aws, agents, python, memory, tutorial]
image: /img/blog/strands-persistent-memory.webp
hide_table_of_contents: true
---

![为什么 AWS Strands 智能体总是从头开始（以及如何解决）](/img/blog/strands-persistent-memory.webp)

AWS Strands 智能体默认是无状态的，每个会话启动时都没有上下文。本文介绍如何使用 `hindsight-strands` 添加持久化的长期记忆，让智能体在多次运行之间记住重要信息。

<!-- truncate -->

## 概览 {#tldr}

- AWS Strands 智能体默认是无状态的，每个会话启动时都没有上下文
- `hindsight-strands` 为任何 Strands 智能体添加三种原生记忆工具：Retain（存入）、Recall（召回）和 Reflect（反思）
- `memory_instructions()` 会在智能体启动前，将相关记忆直接预加载到系统提示中
- 兼容任何与 Strands 兼容的 LLM 后端：Bedrock、Anthropic、OpenAI
- 您可以控制要记住的内容、召回多少内容，以及如何用标签限定记忆范围

---

## 问题 {#the-problem}

AWS Strands 提供了一种简洁的装饰器式方法来构建智能体。定义工具、接入模型，就可以运行了。问题在于，每次对话都会从头开始。

让智能体记住您偏好的 AWS 区域，它会记住。等到下一个会话再问它，它就完全不知道您在说什么。`@tool` 模式规定了智能体能力的形式，却没有解决持久化问题。

对于大多数演示场景，这无关紧要。对于真实应用——面向客户的智能体、编程助手、支持机器人——这却是一个根本限制。

---

## 解决思路 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight) 是面向 AI 智能体的记忆层。它存储事实，在查询时提取语义相关的事实，还能根据累积的上下文综合生成有推理依据的答案。`hindsight-strands` 包将这些能力封装为原生 Strands 工具，因此智能体可以像使用其他能力一样管理自己的记忆。

它会为智能体添加三个工具：

- **`hindsight_retain`**：将一条信息存入记忆库
- **`hindsight_recall`**：以语义方式搜索记忆并返回相关事实
- **`hindsight_reflect`**：根据记忆中的全部内容综合生成有推理依据的答案

此外还有一个 `memory_instructions()` 辅助函数，会在智能体启动前执行召回查询，并将结果注入系统提示。当您希望智能体从收到第一条消息起就具备相关上下文，而不是等它显式调用工具后才获得上下文时，这个函数很有用。

```
用户会话

┌─────────────────────────────────────────┐
│  系统提示                                │
│  + memory_instructions() 的结果          │
├─────────────────────────────────────────┤
│  智能体（Strands）                       │
│  ├── hindsight_retain                    │
│  ├── hindsight_recall                    │
│  └── hindsight_reflect                   │
└─────────────────────────────────────────┘
          │                   ▲
        存入                召回
          │                   │
          ▼                   │
    ┌───────────────────────────────┐
    │            Hindsight 记忆库    │
    └───────────────────────────────┘
```

---

## 实施 {#implementation}

### 安装 {#install}

```bash
pip install hindsight-strands
```

您还需要一个正在运行的 Hindsight 实例。有两种选择：

**选项 1：Hindsight Cloud（无需设置）**

在 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 注册，然后从控制面板获取 API URL 和密钥。将它们直接传给 `create_hindsight_tools()`。

> **注意：** 如果您想完全跳过自托管，可以使用 Hindsight Cloud；该服务可免费开始使用。

**选项 2：使用 Docker 自托管**

```bash
export OPENAI_API_KEY=sk-...

docker run --rm -it --pull always \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

API 监听端口 `8888`，界面可通过 `http://localhost:9999` 访问。Hindsight 还支持 Anthropic、Gemini、Groq 和 Ollama；相应替换 `HINDSIGHT_API_LLM_PROVIDER` 和密钥即可。

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

`bank_id` 用于指定 Hindsight 如何划分记忆。请使用有意义的值，例如用户 ID、会话命名空间或项目 slug。首次写入时，系统会自动创建记忆库。

现在，智能体有了三个可调用的新工具。运行一个会话：

```python
agent("Remember that I'm deploying to us-east-1 and I prefer Bedrock Nova Pro for inference.")
```

智能体会调用 `hindsight_retain`，存入相关事实。接着在下一个会话中运行：

```python
agent("What model and region should I target for this deployment?")
```

它会调用 `hindsight_recall`，取回已存储的偏好并正确作答，即使运行在全新的 Python 进程中也是如此。

### 将记忆预加载到系统提示中 {#pre-loading-memory-into-the-system-prompt}

当智能体知道需要查找信息时，基于工具的召回方式很有效。但有时您希望智能体在收到第一条消息前就已经具备相关上下文。这正是 `memory_instructions()` 的用途：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools, memory_instructions

bank_id = "user-123"
api_url = "http://localhost:8888"

# 在智能体启动前召回相关上下文
memories = memory_instructions(
    bank_id=bank_id,
    hindsight_api_url=api_url,
    query="user preferences and environment setup",
)

agent = Agent(
    tools=create_hindsight_tools(bank_id=bank_id, hindsight_api_url=api_url),
    system_prompt=f"You are a helpful AWS infrastructure assistant.\n\n{memories}",
)
```

`memory_instructions()` 会同步执行召回查询，并返回格式化字符串，您可以将它嵌入提示中的任意位置。输出示例如下：

```
## Relevant memories

- User prefers Bedrock Nova Pro for inference tasks
- Default deployment region is us-east-1
- Project uses CDK for infrastructure
```

可以结合这两种方式：用 `memory_instructions()` 提供常驻上下文，同时保留工具，让智能体在会话期间主动学习新信息。

### 全局配置 {#global-configuration}

如果您要在多个模块中实例化智能体，每次都传入 `hindsight_api_url` 等参数会很繁琐。可以在启动时调用一次 `configure()`：

```python
from hindsight_strands import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="YOUR_API_KEY",       # 如果启用了身份验证
    budget="mid",                  # low / mid / high
    tags=["env:prod"],             # 为本次会话写入的所有内容添加标签
)

# 在其他位置无需再传入连接参数
tools = create_hindsight_tools(bank_id="user-123")
```

`budget` 控制召回时使用多少 token：`low` 速度快、成本低，`high` 会提取更多上下文。默认值为 `mid`。

### 按标签限定范围 {#tag-based-scoping}

标签可帮助您跨记忆库或环境整理和筛选记忆：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    tags=["env:prod", "team:platform"],        # 应用于所有存入的内容
    recall_tags=["env:prod"],                  # 只召回带有此标签的记忆
    recall_tags_match="all",                   # 必须匹配所有标签（而非“任意一个”）
)
```

如果您在多个环境或团队之间共享记忆库，并希望限定召回范围，这种方式就很有用。

### 选择性启用工具 {#selective-tools}

不必启用全部三个工具。

只读智能体适合服务这样的最终用户：他们可以查询记忆，但不能修改记忆。例如，面向客户的助手可以从由独立进程维护的共享知识库中读取内容：

```python
tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    enable_retain=False,
    enable_recall=True,
    enable_reflect=True,
)
```

只写智能体适合摄取流水线：这类后台智能体处理文档、支持工单或日志，并存储结构化事实，但不提供召回功能：

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

## 注意事项和边缘情况 {#pitfalls--edge-cases}

**智能体是否存入记忆，取决于它是否自行决定这样做。**
记忆工具只是工具，智能体会根据上下文决定是否调用。您要求它“记住 X”，它就会存入；如果只是随意聊了几句，却期待它把某些内容记录下来，它很可能不会这样做。请用 `memory_instructions()` 注入重要信息，不要寄希望于智能体自动存入记忆。

**`bank_id` 是保证一致性的关键。**
如果两个会话使用不同的 `bank_id` 值，它们就会拥有彼此独立的记忆，这一点毫无例外。请确保应用能将用户身份可靠地映射到 `bank_id`。一个常见错误是使用会话 ID 而不是用户 ID，这会让每个会话都悄无声息地从空白状态开始。

**Asyncio 会与 Strands 冲突。**
Strands 会运行自己的事件循环。`hindsight-strands` 包通过在 `ThreadPoolExecutor` 中执行 Hindsight 客户端调用来处理这个问题，而不是使用 `asyncio.run()`。如果您在此基础上构建功能或编写自定义工具，不要在 Strands 工具内部直接对 Hindsight 调用使用 `await`，否则会遇到“事件循环已在运行”错误。

**`memory_instructions()` 是同步且会阻塞的。**
它会在智能体初始化时发起网络调用。如果智能体经常被重新创建，不要在紧密循环中或每次请求时调用它。如果查询内容固定，且您会启动许多智能体，请缓存结果。

**Reflect 的开销较高。**
`hindsight_reflect` 会根据记忆综合生成答案，而不只是检索事实。它更适合开放式查询，但会使用更多 token。如果您在意成本，可以关闭它，改用 Recall。

---

## 权衡与替代方案 {#tradeoffs--alternatives}

**何时不适合使用：**
如果每个会话都完全独立，且用户不需要保持连续性，那么添加记忆工具会带来不必要的复杂性和延迟。并非每个智能体都需要持久状态。

**对话历史与长期记忆：**
Strands 会通过消息历史自动管理会话内上下文。`hindsight-strands` 用于跨会话记忆，即需要在单次对话结束后继续保留的事实。不要用它替代提示历史。

**替代方案：**
- **DynamoDB / RDS**：您可以自行实现持久化，将会话数据写入数据库，再读取回来。这样控制力更强，但代码更多，也不具备语义搜索。
- **Amazon Bedrock AgentCore Memory**：AWS 为 Bedrock 智能体提供的全托管记忆服务，可自动处理短期（会话内）和长期（跨会话）记忆。它与 AWS 的集成更紧密，但会让您受限于 Bedrock 智能体运行时，无法与由非 Bedrock 提供商支持的 Strands 智能体搭配使用。
- **LangChain 记忆原语**：如果您已经在使用 LangChain，它的记忆抽象更加成熟。`hindsight-strands` 之所以存在，是因为 Strands 有自己的工具协议，而 LangChain 的记忆机制无法接入该协议。

---

## 回顾 {#recap}

Strands 智能体默认是无状态的。`hindsight-strands` 添加了三种原生记忆工具——存入、召回和反思，让智能体能用与其他能力相同的 `@tool` 协议管理自己的长期记忆。`memory_instructions()` 则适用于预先加载上下文，而非按需检索的场景。

可以这样理解：记忆库按 `bank_id` 划分范围，标签可以跨环境筛选记忆，`budget` 控制召回深度。除此之外，它仍然是一个配备了额外工具的 Strands 智能体。

---

## 后续步骤 {#next-steps}

- [PyPI 上的 hindsight-strands](https://pypi.org/project/hindsight-strands/)
- [Hindsight 文档：Strands 集成指南](/sdks/integrations/strands)
- 使用 Docker 在本地运行 Hindsight，并尝试上面的快速入门
- 探索 `memory_instructions()`，了解如何为面向客户的应用预热智能体
- 查看 [CrewAI](/blog/2026/03/02/crewai) 和 [LangGraph](/blog/2026/03/24/langgraph-longterm-memory) 集成文章，对比类似的集成模式
