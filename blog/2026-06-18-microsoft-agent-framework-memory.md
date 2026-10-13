---
title: "停止构建忘记的微软智能体框架"
authors: [benfrank241]
slug: "2026/06/18/microsoft-agent-framework-memory"
date: 2026-06-18T12:00
tags: [microsoft-agent-framework, semantic-kernel, memory, persistent-memory, hindsight, agents, tutorial]
description: "使用Hindsight将持久的长期记忆添加到Microsoft智能体框架智能体中。插入一个上下文提供程序，每次运行都会调用相关记忆并自动保留对话。没有MCP，模型不需要记住调用任何工具。"
image: /img/blog/microsoft-agent-framework-memory.webp
hide_table_of_contents: true
---

![Microsoft智能体框架的持久记忆与Hindsight](/img/blog/microsoft-agent-framework-memory.webp)

[微软智能体框架](https://github.com/microsoft/agent-framework) 是微软 Semantic Kernel 的开源继承者：一个用于构建计划、调用工具和进行对话的智能体的框架。它不能开箱即用的是在会话结束后记住任何事情。开始新的运行，智能体回到原点，不记得用户是谁或上次决定了什么。

新的Hindsight集成解决了这个问题。它作为**上下文提供者**插入，因此每次运行的智能体都会自动调用与用户消息相关的记忆，并保留随后的对话。循环中没有 MCP 服务器，也没有模型必须决定调用的记忆工具。 记忆就这样发生了。

## 概览 {#tldr}

<!-- truncate -->

- Microsoft 智能体框架 智能体在运行过程中是无状态的。每个会话都是冷启动的。
- Hindsight集成添加了一个**上下文提供者**、`HindsightProvider`。 `pip install hindsight-agent-framework`，传给你的智能体，完成。
- **​​记忆召回是自动的、确定性的。** 它在框架的 `before_run` 挂钩上运行，因此在模型看到提示之前就注入了记忆。模型不会忘记调用任何工具。
- 每次运行后，`after_run` 保留交换，因此下一次运行将在此基础上构建。
- 记忆存在于您为每个用户、智能体或会话选择的Hindsight**记忆库**中，这使得每个用户的隔离成为一个参数的更改。
- Hindsight Cloud意味着没有基础设施。 [免费注册。](https://ui.hindsight.vectorize.io)

## 为什么微软智能体框架需要持久记忆 {#why-microsoft-agent-framework-needs-persistent-memory}

Microsoft 智能体框架为您提供了一种干净的方式来建立强大的智能体：聊天客户端、指令、工具、会话。在单个会话中，智能体具有工作上下文。但当会议结束时，这种背景就消失了。

对于针对同一用户多次运行的任何操作，这是您首先遇到的限制。每次对话时，智能支持都会重新询问帐户详细信息。每次重新加载时，编码助理都会重新学习项目的约定。私人助理忘记了用户昨天所说的偏好。您要么自己构建一个记忆层（数据存储、嵌入、检索、重复数据删除），要么发布一个患有健忘症的智能体。

Hindsight 是记忆层，上下文提供者将其连接起来，而无需改变您编写智能体的方式。

## 它是如何工作的 {#how-it-works}

Microsoft 智能体框架可让您将 **上下文提供者** 连接到智能体。上下文提供者有两个生命周期钩子，并且 Hindsight 集成使用这两个钩子：

|钩子|Hindsight 的作用|
| --- | --- |
|`before_run`|记忆召回与用户消息相关的记忆，并将它们作为`## Memories`块注入到智能体的指令中。|
|`after_run`|记忆存储用户输入加上智能体的响应，因此未来的运行建立在它们的基础上。|

因为记忆召回在`before_run`上运行，所以它是**确定性**：在模型生成令牌之前，记忆位于智能体的上下文中。与基于工具的方法相比，模型必须决定调用 `recall` 工具，也可能不调用。不会出现错误的决定，也不会需要额外的工具使用往返。

召回的记忆作为智能体指令前面的标记块到达：

```
## Memories
Consider the following memories when responding. Ignore any that are not relevant:
- User prefers vegetarian food
- User is allergic to peanuts
- User is cooking for four this week
```

模型将其读取为指令的一部分；您的应用程序代码永远不需要手动记忆。

## 设置 {#setup}

安装包：

```bash
pip install hindsight-agent-framework
```

推荐后端为**Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)，创建一个API密钥，并设置一次：

```bash
export HINDSIGHT_API_KEY=hsk_your_token
```

自托管的工作原理相同；在本地运行 API 并将提供程序指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

## 将记忆添加到智能体中 {#adding-memory-to-an-agent}

这就是整个集成。将 `HindsightProvider` 附加到您的智能体的 `context_providers` 上，它会完成剩下的工作：

```python
from agent_framework.openai import OpenAIChatClient
from hindsight_agent_framework import HindsightProvider

agent = OpenAIChatClient().as_agent(
    name="assistant",
    instructions="你是一个有用的助手。",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("记住我更喜欢素食。", session=session)

#...稍后，即使在新流程中：
await agent.run("建议食谱。", session=session)  #回忆起偏好
```

第二次运行，即使是冷加工，也让人回想起素食偏好，食谱建议也尊重这一点。你的智能体循环中没有任何改变；提供者在跑步之前处理记忆召回，在跑步之后处理记忆存储。

## 每用户记忆 {#per-user-memory}

`bank_id`是记忆的路由键。 Hindsight 记忆库只是一个命名空间，您可以决定其粒度：每个用户一个、每个智能体一个、每个会话一个，无论什么都适合您的应用程序。

最常见的模式是每用户。将 `bank_id` 设置为用户的 ID，每个人都会获得一个独立的记忆，可以跨会话和机器跟踪他们：

```python
HindsightProvider(bank_id=f"user-{current_user.id}")
```

以这种方式构建的支持智能体可以识别回头客的历史记录。个人助理会记住一个用户的偏好，而不会泄露给另一个用户。由于记忆库位于服务器端（在云或您自己的实例上），因此无论智能体运行在何处，都可以使用相同的记忆。

## 配置 {#configuration}

`HindsightProvider(bank_id, ...)` 采用一些可选参数：

|论证|默认|它的作用|
| --- | --- | --- |
|`budget`|`mid`|记忆召回深度：`low`（快速）/`mid`/`high`（彻底）。|
|`max_tokens`|`4096`|注入指令的召回记忆块的上限。|
|`auto_recall`|`true`|记忆召回并在每次跑步前注入记忆。|
|`auto_retain`|`true`|记忆存储 每次运行后进行交换。|
|`recall_tags` / `recall_tags_match`|无 / `any`|过滤记忆召回以标记记忆。|
|`tags`|无|应用于保留记忆的标签。|
|`mission`|无|创建具有事实提取角色的记忆库，以引导记忆内容。|
|`api_key` / `hindsight_api_url`|环境|连接设置（如果不使用环境变量）。|

您还可以调用`configure(...)`一次来设置进程范围的默认值，而不是在每个提供者上重复它们。

## 三件事是正确的 {#three-things-it-gets-right}

**无需调用工具。** 记忆连接到生命周期挂钩，而不是作为工具公开。模型不会忘记使用它，并且不存在工具使用延迟。这与 [Cline积分](https://hindsight.vectorize.io/blog/2026/06/09/cline-persistent-memory) 使用钩子而不是 MCP 的原因相同：确定性击败了希望。

**它永远不会阻碍你的智能体。** 记忆召回和记忆存储是尽力而为的。如果Hindsight暂时无法访问，则故障将被吞掉并记录下来，并且智能体可以正常运行，而不会记住该回合。记忆中的小问题永远不会影响智能体。

**无反馈循环。** 在运行开始时注入的记忆在运行结束时不会保留。仅存储真实的用户输入和智能体响应，因此回忆的上下文不会随着时间的推移而被重新摄取和放大。 （回归测试是专门为了保持这种状态而存在的。）

## 回顾 {#recap}

||Microsoft智能体框架默认|与 Hindsight|
| --- | --- | --- |
|跑步过程中的记忆|无|自动，每个记忆库|
|设置|不适用|一个上下文提供者|
|记忆召回机制|不适用|`before_run` 钩子，按照指令注入|
|记忆存储机制|不适用|`after_run` 挂钩|
|需要模型工具调用|不适用|否|
|每用户隔离|不适用|套装`bank_id`|
|失败行为|不适用|尽力而为，绝不阻挡智能体|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[微软智能体框架+Hindsight](/sdks/integrations/agent-framework)
- **来源：**[vectorize-io/hindsight/hindsight-integrations/ 智能体框架](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/agent-framework)
- **为什么钩子胜过工具：**[Cline 持久记忆](https://hindsight.vectorize.io/blog/2026/06/09/cline-persistent-memory)
