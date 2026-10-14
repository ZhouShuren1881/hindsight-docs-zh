---
title: "别再构建会忘事的 Microsoft Agent Framework 智能体"
authors: [benfrank241]
slug: "2026/06/18/microsoft-agent-framework-memory"
date: 2026-06-18T12:00
tags: [microsoft-agent-framework, semantic-kernel, memory, persistent-memory, hindsight, agents, tutorial]
description: "使用 Hindsight 为 Microsoft Agent Framework 智能体添加持久的长期记忆。接入一个上下文提供方，每次运行都会召回相关记忆，并在对话结束后自动存入对话内容。无需 MCP，也无需模型记得调用工具。"
image: /img/blog/microsoft-agent-framework-memory.webp
hide_table_of_contents: true
---

![Microsoft Agent Framework 的 Hindsight 持久记忆](/img/blog/microsoft-agent-framework-memory.webp)

[Microsoft Agent Framework](https://github.com/microsoft/agent-framework) 是 Microsoft 开源的 Semantic Kernel 后继项目，是一个用于构建能够规划、调用工具并进行对话的智能体框架。它开箱即用却无法做到的一点，是在会话结束后记住任何内容。开始新一轮运行时，智能体就会回到起点，不记得用户是谁，也不记得上次作出了什么决定。

新的 Hindsight 集成解决了这个问题。它以**上下文提供方**的形式接入，因此每次运行时都会自动召回与用户消息相关的记忆，并在之后存入这次对话。整个流程中没有 MCP 服务器，也没有需要模型自行决定是否调用的记忆工具。记忆就这样自动发挥作用。

## 概览 {#tldr}

<!-- truncate -->

- Microsoft Agent Framework 智能体在多次运行之间是无状态的。每个会话启动时都没有历史上下文。
- Hindsight 集成只需添加一个**上下文提供方** `HindsightProvider`。运行 `pip install hindsight-agent-framework`，将它传给智能体即可。
- **记忆召回是自动且确定性的。** 它通过框架的 `before_run` 钩子运行，因此在模型看到提示之前，记忆就已注入上下文。模型不会忘记调用某个工具。
- 每次运行后，`after_run` 都会存入这轮对话，让下一次运行可以接续已有内容。
- 记忆保存在 Hindsight **记忆库**中，你可以按用户、智能体或会话选择记忆库。只需修改一个参数，就能为每位用户隔离记忆。
- 使用 Hindsight Cloud 无需管理基础设施。[免费注册。](https://ui.hindsight.vectorize.io)

## 为什么 Microsoft Agent Framework 需要持久记忆 {#why-microsoft-agent-framework-needs-persistent-memory}

Microsoft Agent Framework 提供了一种简洁的方式来搭建功能完善的智能体：配置聊天客户端、指令、工具和会话。在单个会话内，智能体可以利用工作上下文；但会话一结束，这些上下文就消失了。

只要你需要针对同一用户多次运行智能体，这就是最先遇到的限制。客服智能体每次对话都要重新询问账户信息；编程助手每次重新加载都得重新了解项目惯例；个人助理会忘记用户昨天提过的偏好。你要么自己搭建记忆层（数据存储、嵌入向量、检索、去重），要么只能交付一个患有健忘症的智能体。

Hindsight 提供了这一记忆层，而上下文提供方可以将它接入，不必改变你编写智能体的方式。

## 工作原理 {#how-it-works}

Microsoft Agent Framework 支持为智能体添加**上下文提供方**。上下文提供方有两个生命周期钩子，Hindsight 集成会同时使用它们：

| 钩子 | Hindsight 的操作 |
| --- | --- |
| `before_run` | 召回与用户消息相关的记忆，并将它们作为 `## Memories` 区块注入智能体的指令。 |
| `after_run` | 将用户输入和智能体的响应存入记忆，供之后的运行接续使用。 |

由于记忆召回在 `before_run` 中执行，因此它是**确定性的**：模型生成第一个 token 前，记忆就已经进入智能体的上下文。相比之下，使用工具的方案要求模型自行决定是否调用 `recall` 工具，它也可能不调用。这样就没有可能出错的决策，也不需要额外的一轮工具调用。

召回的记忆会以带标签的区块形式，放在智能体指令的开头：

```
## Memories
Consider the following memories when responding. Ignore any that are not relevant:
- User prefers vegetarian food
- User is allergic to peanuts
- User is cooking for four this week
```

模型会将这段内容作为指令的一部分来读取；应用代码不必手动传递记忆。

## 设置 {#setup}

安装程序包：

```bash
pip install hindsight-agent-framework
```

建议使用 **Hindsight Cloud** 作为后端：[免费注册](https://ui.hindsight.vectorize.io)，创建 API 密钥，然后设置一次：

```bash
export HINDSIGHT_API_KEY=hsk_your_token
```

自托管时，使用方式相同：在本地运行 API，并将提供方指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

```python
HindsightProvider(bank_id="user-123", hindsight_api_url="http://localhost:8888")
```

## 为智能体添加记忆 {#adding-memory-to-an-agent}

这就是全部集成代码。将 `HindsightProvider` 添加到智能体的 `context_providers` 中，剩下的工作就会自动完成：

```python
from agent_framework.openai import OpenAIChatClient
from hindsight_agent_framework import HindsightProvider

agent = OpenAIChatClient().as_agent(
    name="assistant",
    instructions="You are a helpful assistant.",
    context_providers=[HindsightProvider(bank_id="user-123")],
)

session = agent.create_session()
await agent.run("Remember that I prefer vegetarian food.", session=session)

# ……稍后，即使是在新的进程中：
await agent.run("Suggest a recipe.", session=session)  # 会召回这一偏好
```

第二次运行时，即使来自一个刚启动的进程，智能体也会召回用户偏好，并据此给出食谱建议。智能体循环没有任何变化；提供方会在运行前召回记忆，并在运行后存入对话。

## 为每位用户隔离记忆 {#per-user-memory}

`bank_id` 是记忆的路由键。Hindsight 记忆库只是一个命名空间，你可以自行决定它的粒度：每位用户一个、每个智能体一个、每个会话一个，或采用适合应用的其他粒度。

最常见的模式是按用户划分。将用户 ID 设为 `bank_id`，每个人就会拥有独立记忆，并可在不同会话和设备之间延续：

```python
HindsightProvider(bank_id=f"user-{current_user.id}")
```

采用这种方式构建的客服智能体能够识别回访客户及其历史记录。个人助理会记住某位用户的偏好，不会将这些偏好泄露给其他用户。记忆库位于服务器端（Hindsight Cloud 或你自己的实例），因此无论智能体在哪里运行，都能使用同一份记忆。

## 配置 {#configuration}

`HindsightProvider(bank_id, ...)` 接受若干可选参数：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `budget` | `mid` | Recall 的检索深度：`low`（较快）/ `mid` / `high`（更全面）。 |
| `max_tokens` | `4096` | 限制注入指令的召回记忆区块长度。 |
| `auto_recall` | `true` | 在每次运行前召回记忆并将其注入上下文。 |
| `auto_retain` | `true` | 在每次运行后存入这轮对话。 |
| `recall_tags` / `recall_tags_match` | 无 / `any` | 将记忆召回范围限制为带有相应标签的记忆。 |
| `tags` | 无 | 应用于存入记忆的标签。 |
| `mission` | 无 | 创建记忆库时设置事实提取任务说明，以引导记忆库记录哪些内容。 |
| `api_key` / `hindsight_api_url` | 环境变量 | 连接设置；未使用环境变量时可通过这些参数指定。 |

你也可以调用一次 `configure(...)` 设置进程范围的默认值，这样就不必在每个提供方上重复设置。

## 它做对的三件事 {#three-things-it-gets-right}

**无需调用工具。** 记忆通过生命周期钩子接入，不会作为工具暴露给模型。模型不会忘记使用记忆，也不会产生工具调用延迟。[Cline 集成](https://hindsight.vectorize.io/blog/2026/06/09/cline-persistent-memory)同样使用钩子而非 MCP，原因也在于此：确定性胜过寄希望于模型自行调用。

**绝不会阻塞智能体。** 记忆召回和存入都采用尽力而为的方式。如果 Hindsight 暂时无法访问，集成会吞掉故障并记录日志；智能体仍可正常运行，只是这一轮不使用记忆。记忆服务短暂故障不会导致智能体停摆。

**不会形成反馈循环。** 运行开始时注入的记忆不会在运行结束时再次存入。系统只保存真实的用户输入和智能体响应，因此召回的上下文不会被重新摄取并随时间不断放大。（专门设置了一项回归测试来确保这一行为。）

## 小结 {#recap}

|  | Microsoft Agent Framework 的默认行为 | 使用 Hindsight 后 |
| --- | --- | --- |
| 多次运行间的记忆 | 无 | 自动提供，按记忆库隔离 |
| 设置 | 不适用 | 添加一个上下文提供方 |
| 记忆召回机制 | 不适用 | 通过 `before_run` 钩子注入指令 |
| 记忆存入机制 | 不适用 | 通过 `after_run` 钩子存入 |
| 是否需要模型调用工具 | 不适用 | 否 |
| 按用户隔离 | 不适用 | 设置 `bank_id` |
| 故障时的行为 | 不适用 | 尽力而为，不会阻塞智能体 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Microsoft Agent Framework + Hindsight](/sdks/integrations/agent-framework)
- **源代码：**[vectorize-io/hindsight/hindsight-integrations/agent-framework](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/agent-framework)
- **了解钩子为何优于工具：**[Cline 持久记忆](https://hindsight.vectorize.io/blog/2026/06/09/cline-persistent-memory)
