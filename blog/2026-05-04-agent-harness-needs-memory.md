---
title: "每个智能体运行框架中缺失的一层"
description: "现代智能体运行框架配备了工具、MCP 和 IDE 集成，却没有记忆。本文说明记忆为何是缺失的一层，以及运行框架如何开始弥补这一点。"
authors: [benfrank241]
date: 2026-05-04
tags: [memory, agents, hindsight, harness, claude-code, openclaw, hermes, deep-dive]
image: /img/blog/agent-harness-needs-memory.webp
---

![每个智能体运行框架中缺失的一层](/img/blog/agent-harness-needs-memory.webp)

随便选一个现代智能体运行框架——[Claude Code](https://docs.claude.com/en/docs/claude-code)、[Cursor](https://cursor.com)、OpenClaw、Hermes、[Codex](https://github.com/openai/codex)、[Aider](https://aider.chat)、Cline、Roo Code 或 [Pipecat](https://github.com/pipecat-ai/pipecat)。在过去 18 个月里，它们都有了显著进步：可以访问文件和 shell，可以使用 [MCP](https://modelcontextprotocol.io) 服务器，可以控制浏览器，还提供丰富的 IDE 集成、斜杠命令、技能和子智能体。

它们几乎都没有配备能够学习的记忆。

智能体系统中的运行框架负责包裹模型：它管理循环、提供工具、协调子智能体、处理权限并呈现输出。它是你与 LLM 之间的基础设施。长期记忆显然应该属于运行框架这一层；然而，大多数运行框架只做到提供文件系统和静态上下文文件，就认为工作已经完成。

<!-- truncate -->

## 概览 {#tldr}

- Claude Code、OpenClaw、Hermes、Cursor、Codex 等智能体运行框架在工具、MCP 和 IDE 集成方面投入了大量精力
- 它们基本跳过了记忆层，导致每次会话都从零开始
- `CLAUDE.md`、`AGENTS.md` 和规则文件等变通方法有所帮助，但它们是静态的，需要人工维护
- 真正融入运行框架的记忆层，意味着智能体可以自动从之前的会话中学习偏好、决策、约定和走过的弯路
- Hermes（原生记忆插件）和 OpenClaw（带有 `autoRecall` 的记忆插件）等工具正在引领这一转变，其他工具也在跟进
- [Hindsight](https://github.com/vectorize-io/hindsight) 提供了记忆层，任何运行框架都可以通过简单的 API 集成

---

## 智能体运行框架究竟是什么 {#what-a-harness-actually-is}

要准确理解这些层次很有帮助，因为“智能体”一词常被用来指很多不同的东西。

**模型**就是 LLM。Claude、GPT、Gemini、Qwen，或者你指定给运行框架的其他模型。它没有状态：输入 token，输出 token。

**运行框架**是模型周围的运行时。它负责智能体循环、工具注册表、权限、提示组装和输出呈现。Claude Code 是运行框架，OpenClaw 也是。Cursor 则是在编辑器上附加了聊天界面的运行框架。Hermes 是面向长时间运行的智能体设计的运行框架。

**智能体**是运行框架使用工具驱动模型去实现目标时产生的行为。它不是一个可以安装的独立组件，而是运行框架、模型和提示共同形成的运行时行为。** 智能体 = 模型 + 运行框架**已成为描述这种分工的标准方式。可参阅 [OpenAI 关于运行框架工程的文章](https://openai.com/index/harness-engineering/)、[Martin Fowler 关于编程智能体运行框架工程的文章](https://martinfowler.com/articles/harness-engineering.html)，以及 [LangChain 对智能体运行框架的剖析](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness)，了解三种代表性观点。

人们说“智能体健忘”时，通常真正想说的是“运行框架不会学习”。模型本来就不会跨会话记住任何事情，这一直是运行框架的职责。运行框架**确实**有一种记忆原语——文件系统，以及每次会话都会重新读取的静态指令文件——但这两者都不会积累成长。智能体从工作中学到的内容不会反馈进来。

---

## 运行框架已经解决了哪些问题 {#what-harnesses-have-already-solved}

讨论缺口之前，值得先承认运行框架在其他方面取得了多大进步。

**工具。** 每个现代运行框架都支持丰富的工具调用，包括读取、编辑和写入文件，运行 shell 命令，获取网页和搜索网页。工具注册表已经不再是瓶颈。

**MCP。** [模型上下文协议](https://modelcontextprotocol.io) 为运行框架提供了接入外部系统的标准方式。Slack、Linear、Gmail、Postgres 和自定义内部服务都可以通过几行配置变成工具。这是 2025 年的一次重大飞跃。

**IDE 集成。** Claude Code、Cursor 和 Codex 位于编辑器内部或旁边。它们能看到你正在查看的内容，可以直接在原处编辑，共享缓冲区，也能理解当前选区。

**浏览器和操作系统控制。** OpenClaw 及类似运行框架可以操控浏览器、点击界面、填写表单和截屏。智能体实际可操作的范围已远超文件系统。

**子智能体和技能。** Claude Code 支持子智能体、技能和斜杠命令。OpenClaw 采用插件架构。Hermes 原生支持多智能体编排。运行框架越来越擅长委派、并行处理和组合任务。

**权限和安全。** 沙箱、允许列表、危险操作确认和钩子都属于运行框架的能力。护栏也由运行框架管理，而且这方面已经快速成熟。

进步已经很大。过去，运行框架只是模型外面的一层薄循环；现在，它已经是一个功能完备的运行时。

几乎所有情况下，运行框架仍然不擅长的是**学习**。它可以持久化文件，也可以每天早晨重新读取 `CLAUDE.md`。但它做不到从工作本身积累理解，并让这些理解影响下一次会话。

---

## 记忆缺口 {#the-memory-gap}

在上述任一运行框架中开启新会话，都会遇到同一道墙。

运行框架知道你有哪些工具，却不知道你上周决定使用哪个数据库。

运行框架可以读取代码库，却不知道团队在两次会话前否决了某种重构模式，也不知道原因。

运行框架可以调用你的 Linear MCP 服务器，却不知道你今天早上已经分类了哪些工单，也不知道你倾向于把哪些缺陷留到下个冲刺。

运行框架可以截屏，却不知道你偏好简洁的解释，也不喜欢智能体把你的问题复述一遍。

这些信息原本存在，是交互过程中产生的。运行框架从未记录下来，所以新会话开始时仍是一片空白。

在编程运行框架中，这种问题最明显，因为编程是迭代式的，而且高度依赖上下文。但其他场景也一样：支持类运行框架每次对话都要重新了解同一位客户；语音运行框架在通话结束时丢失所有上下文；多智能体运行框架中的某个实例发现了有用信息，其他实例却永远无从得知。

---

## 变通方法为何不够 {#the-workarounds--and-why-they-are-not-enough}

运行框架生态已经形成了几种不完整的解决办法。它们有帮助，但都不具备能够学习的记忆。

### 文件系统 {#the-filesystem}

大多数运行框架把文件系统当作事实上的记忆层——写入文件，在下次会话中再读出来。这是运行框架最基础的原语，对许多任务来说也够用。问题在于，运行框架负责写入和读取，却没有任何东西负责**整理**。没有综合生成、相关性排序或衰减机制。文件越积越多，智能体必须准确知道要打开哪个文件。它是硬盘，不是记忆。

### 静态上下文文件（CLAUDE.md、AGENTS.md、.cursorrules） {#static-context-files-claudemd-agentsmd-cursorrules}

现在大多数编程运行框架都支持项目级指令文件。Claude Code 会读取 [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory)，Codex 会读取 [`AGENTS.md`](https://agents.md)，Cursor 会读取 `.cursorrules`。该文件会在每次会话中附加到系统提示中。

这些文件很有用，但也是静态的。必须有人编写、持续更新，在内容过时时删减，还要记得在情况变化时修改。它们记录的是意图，而非交互。智能体从工作中学到的内容不会反馈到文件里。

如果你看过几周都没人改过的 `CLAUDE.md`，就会看到这种做法的问题：一半内容已经不对，另一半本该写进去的内容却缺失。运行框架仍然尽职尽责地读取它。

### 会话压缩与摘要 {#session-compaction-and-summaries}

较长的会话会自动压缩。一些运行框架会在会话结束时生成摘要。这是管理上下文窗口的技巧，不是记忆——摘要只存在于生成它的会话中，下一个会话开始时并没有摘要。

### 手动召回 {#manual-recall}

最常见的模式是用户把上下文粘贴回来：“这是我们上次决定的内容。”“这是上次停下时的文件。”“这是上次运行时的错误。”这种记忆靠的是用户的大脑和剪贴板。

### 文档检索 {#document-retrieval}

让运行框架访问文档库（对 `/docs` 使用 RAG、代码库索引或工单档案）确实很有价值，但它解决的是参考资料问题。它无法捕获真实发生过的交互历史——在这段对话中、与这位用户、围绕这个项目发生的事，如果没有写到任何地方，就无从检索。

---

## 运行框架拥有记忆后会有什么变化 {#what-changes-when-the-harness-has-memory}

当记忆成为运行框架中的一等层时，日常体验会发生变化，只是这种变化很容易被低估。

智能体不再反复询问你使用哪个包管理器，也不再建议你上周明确否决的抽象方案，更不会反复向你解释部署流程。下一次会话开始时，上次的上下文已经载入——不是粘贴进来的，也不是摘要，而是真正被存入并召回的记忆。

多智能体设置的变化更为显著。如果 Slack 智能体、Discord 智能体和 IDE 内的智能体共用同一个记忆库，那么一个智能体学到的内容，其他智能体也能知道。用户周一向 Slack 机器人提出的问题，周二可以由 IDE 智能体接着处理。

语音、支持和自动化等长时间运行的智能体，也不再每次会话结束时都失去与用户建立的连续关系。

更关键的是，运行框架能够持续累积改进。每次会话都会让系统比开始时更有用一点。这种特性是无状态运行框架完全不具备的。

---

## 各类运行框架如何实现这一点 {#how-specific-harnesses-are-approaching-this}

这场转变并不均衡。一些运行框架已经开始直接构建记忆能力；另一些则乐于通过 MCP 或插件集成外部记忆层。

### Hermes {#hermes}

Hermes 自带原生记忆插件。这是记忆作为运行框架功能的一个清晰示例：插件在智能体循环中处理记忆存入和召回，而不是把记忆当作外部事项。近期版本提供了 `hermes memory setup` 向导，让集成几乎只需一步。

Hermes 还比大多数运行框架更进一步：它可以**创建自己的技能**。当智能体遇到预计会重复使用的工作流时，可以编写一项新技能——一种可复用、可调用的能力——并将其加入自己的工具箱，供后续会话使用。这是运行框架层面的一项真正差异化能力，而且它与记忆的关系比初看起来更密切：技能属于程序性记忆，记录的是**如何**做某件事，而非**发生了什么**。再配上声明性记忆（例如 Hindsight 这类记忆层提供的事实、决策和偏好），智能体要记住的两类内容就齐备了。这也是迈向自动驾驶智能体最清晰的先兆之一：能够扩展自身能力的运行框架，也能够在没有你参与时持续迭代。

### OpenClaw {#openclaw}

OpenClaw 也把记忆作为一等插件。典型配置如下：

```yaml
plugins:
  hindsight:
    bank: openclaw
    autoRetain: true
    autoRecall: true
```

工作过程中会存入记忆，并在下一次响应前召回记忆，无需提示。OpenClaw 充当网关，可以同时接入 Slack、Discord、Telegram、浏览器和 IDE；记忆层让网关在这些界面之间保持连贯。没有记忆层，每个界面都会各自遗忘。

### Claude Code {#claude-code}

Claude Code 尚无原生长期记忆，但可以通过[钩子](https://docs.claude.com/en/docs/claude-code/hooks)、MCP 服务器和技能集成记忆层。`hindsight-memory` 插件直接使用钩子架构：`SessionStart` 用于健康检查，`UserPromptSubmit` 用于自动召回记忆，`Stop` 用于自动存入记忆。`CLAUDE.md` 覆盖静态部分；由 MCP 支持的记忆层处理动态部分，也就是无需任何人编辑文件便应逐渐积累的内容。

### Codex {#codex}

Codex 使用 `AGENTS.md` 提供静态上下文，并且越来越多地用于多智能体配置。在这种配置中，Codex 实例之间的共享记忆比任何单个实例内部的记忆更重要。记忆层成为底座，让多个 Codex 实例能够像一个团队协作，而不是一群彼此平行的陌生人。

### Cursor、Cline、Roo Code 和 Aider {#cursor-cline-roo-code-aider}

这些驻留在 IDE 中的运行框架通常依赖规则文件提供静态上下文，本机记忆能力很少。它们通常通过 MCP 集成。Roo Code 提供了一个记忆食谱示例；这种模式也适用于其他工具。

### Pipecat（语音） {#pipecat-voice}

语音运行框架最经不起无状态：通话结束，智能体就忘了用户。接入记忆层的 Pipecat 可以在多次通话间延续上下文，这样用户下周回电时就不必重新解释一切。

### Superagent、Haystack、LangGraph、CrewAI 和 Pydantic AI {#superagent-haystack-langgraph-crewai-pydantic-ai}

这些编排框架都支持可插拔记忆；大多数都能集成外部记忆层。模式是一致的：框架负责智能体循环，记忆层负责存入和召回。

这些工具的发展趋势相同：运行框架要么像 Hermes 一样内置记忆，要么像其他工具一样提供清晰的集成点，再接入记忆层。

---

## 记忆层需要为运行框架做什么 {#what-a-memory-layer-has-to-do-for-a-harness}

适用于运行框架的记忆系统不能只是键值存储。它必须做好四件事，而且这四件事与运行框架的运行方式直接对应。

### 从智能体循环中选择性地存入记忆 {#retain-selectively-from-the-agent-loop}

运行框架能看到每次工具调用、每次模型响应和每条用户消息，其中大多数都是噪声。记忆必须捕捉持久的信息——决策、偏好、事实和模式——并跳过其余内容。记忆存入发生在循环**进行期间**，而非循环结束后。

### 在调用模型前召回记忆 {#recall-before-the-model-is-called}

运行框架已经会在每次模型调用前组装提示。这正是注入相关记忆的自然位置——不注入所有记忆，只注入与当前任务有关的内容。召回的成本必须低到足以在每一轮运行，精确度也必须足够高，避免上下文被淹没。

### 基于累积的经历进行反思 {#reflect-across-accumulated-experience}

有些问题无法通过召回一条事实来回答，而需要综合多条信息。具有记忆能力的运行框架应该能回答“我们对这个代码库了解什么”，给出综合生成的答案，而不是一串零散片段。

### 正确划分用户、项目和界面的范围 {#scope-correctly-across-users-projects-and-surfaces}

编程运行框架需要按项目划分记忆。多租户支持运行框架需要按用户划分记忆。一群 OpenClaw 智能体需要共享记忆。使用 Codex 的团队需要默认共享，也可以选择隔离。记忆层必须支持所有这些模式，不能迫使运行框架自行发明范围逻辑。

这些正是 [Hindsight](https://hindsight.vectorize.io) 优化的设计点。存入、召回、反思和范围划分是四种原语，通过任何运行框架都能使用的 API 和集成提供。

---

## 记忆为何如今对运行框架如此重要 {#why-memory-matters-for-harnesses-now}

一年前，你可能会认为记忆不是必需品，因为运行框架还在摸索工具。现在这个说法已经站不住脚了。

运行框架已经拥有工具、IDE 集成和 MCP，也拥有子智能体、技能和权限。“单次会话中令人印象深刻的智能体”和“几个月来越来越擅长处理你的工作”的智能体之间，剩下的差距几乎全在记忆。

能够解决这个问题的运行框架——无论是像 Hermes 一样内置记忆，还是像 OpenClaw 和 Claude Code 一样顺畅集成——在交互累积几周后，使用体验都会明显不同。做不到这一点的工具，演示时仍会让人印象深刻，到第三周却会令人沮丧。

---

## Hindsight 如何融入 {#how-hindsight-fits}

[Hindsight](https://hindsight.vectorize.io) 被设计为任何运行框架都能接入的记忆层。它以 API 为先、兼容 MCP，并为主要框架和运行框架提供[集成](https://hindsight.vectorize.io/integrations)。

实际集成时，运行框架的工作方式如下：

- 随着循环运行，运行框架会将相关上下文存入记忆库（自动存入，或显式调用 `retain`）
- 每次调用模型之前，运行框架都会召回相关记忆并将其注入提示（自动召回，或显式调用 `recall`）
- 通过[记忆库](https://hindsight.vectorize.io/developer/api/memory-banks)配置，正确划分记忆库范围：按项目、按用户、按团队，或在一群智能体之间共享
- 累积的记忆会定期综合生成观测和心智模型；需要综合信息时，运行框架可以直接查询它们，而不只进行记忆召回

运行框架继续做自己擅长的事：运行循环、调用工具、管理权限和呈现输出。记忆层负责运行框架从未被设计来处理的部分。

你可以运行 Hindsight 和 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，以最快速度开始；如果数据必须留在自己的环境中，也可以自行托管。无论哪种方式，集成到运行框架的过程都相同。

---

## 回顾 {#recap}

- 现代智能体运行框架在工具、MCP、IDE 集成和编排方面投入了大量精力
- 记忆层是最明显的剩余缺口，也是决定智能体能否随着使用不断改进的一层
- 静态变通方法（`CLAUDE.md`、`AGENTS.md` 和规则文件）有所帮助，却无法捕捉真实的交互经历
- Hermes 自带原生记忆；OpenClaw、Claude Code、Codex 和编排框架则把记忆集成为一层
- 真正适用于运行框架的记忆系统必须有选择地存入记忆、精准召回、基于经历进行反思，并正确划分范围

如果你的运行框架配齐了所需工具，而你仍觉得智能体每天早上都像重新开始，那么缺口不在模型，也不在工具，而在缺失的记忆层。

---

## 延伸阅读 {#further-reading}

- [你的智能体并非健忘，它从未被赋予记忆。](https://hindsight.vectorize.io/blog/2026/04/23/your-agent-is-not-forgetful) — 关于智能体记忆的更广泛论述，运行框架层只是其中一部分
- [Hindsight 现已成为 Hermes Agent 的原生记忆提供方](https://hindsight.vectorize.io/blog/2026/04/06/hermes-native-memory-provider) — 记忆作为运行框架功能这一模式背后的集成故事
- [你的 OpenClaw 智能体彼此陌生，Hindsight 可以改变这一点。](https://hindsight.vectorize.io/blog/2026/04/01/openclaw-shared-memory) — 多界面网关模式详解
- [使用 Hindsight 为 OpenAI Codex 添加持久记忆](https://hindsight.vectorize.io/blog/2026/04/08/adding-memory-to-codex-with-hindsight) — 编程智能体运行框架中的共享记忆是什么样子
- [Hindsight 集成](https://hindsight.vectorize.io/integrations) — 当前支持的运行框架和框架列表

---

## 后续步骤 {#next-steps}

- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)，几分钟内为你的运行框架添加记忆
- 阅读[快速入门](https://hindsight.vectorize.io/developer/api/quickstart)，了解自托管部署
- 浏览适用于你的运行框架或框架的[集成指南](https://hindsight.vectorize.io/integrations)
- 查看[记忆库参考](https://hindsight.vectorize.io/developer/api/memory-banks)，了解如何按用户、项目、团队和智能体群体划分范围
