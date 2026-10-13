---
title: "每个智能体运行框架中缺失的一层"
description: "现代智能体利用工具、MCP和IDE集成——但没有记忆。为什么这是缺失的层，以及安全带如何开始修复它。"
authors: [benfrank241]
date: 2026-05-04
tags: [memory, agents, hindsight, harness, claude-code, openclaw, hermes, deep-dive]
image: /img/blog/agent-harness-needs-memory.webp
---

![每个智能体运行框架中缺失的一层](/img/blog/agent-harness-needs-memory.webp)

选择任何现代智能体运行框架 - [Claude Code](https://docs.claude.com/en/docs/claude-code)、[Cursor](https://cursor.com)、OpenClaw、Hermes、[Codex](https://github.com/openai/codex)、[Aider](https://aider.chat)、Cline、Roo Code、[Pipecat](https://github.com/pipecat-ai/pipecat)。在过去 18 个月里，他们都取得了显著的进步。他们有文件访问权限。他们有 shell 访问权限。他们有 [MCP](https://modelcontextprotocol.io) 服务器。他们拥有浏览器控制权。他们拥有丰富的 IDE 集成、slash 命令、技能和子代理。

他们几乎没有一个附带的是学习记忆。

harness 是包装模型的智能体系统的一部分：它管理循环、公开工具、协调子代理、处理权限和渲染输出。它是您和LLM之间的基础设施。线束层是长期记忆最明显所属的地方 - 但它也是大多数线束在文件系统和静态上下文文件处停止并称为完成的层。

<!-- truncate -->

## 概览 {#tldr}

- 智能体线束（Claude Code、OpenClaw、Hermes、Cursor、Codex等）在工具、MCP和IDE集成方面投入了大量资金
- 他们很大程度上跳过了记忆层，让每节课都从零开始
- CLAUDE.md、智能体.md 和规则文件等解决方法有帮助，但它们是静态的，需要手动维护
- 安全带中的真正记忆层意味着智能体自动从之前的会话中学习——偏好、决定、约定、死胡同
- 诸如Hermes（原生记忆插件）和OpenClaw（带 autoRecall 的记忆插件）之类的工具正在引领这一转变；其他人正在迎头赶上
- [Hindsight](https://github.com/vectorize-io/hindsight) 提供任何线束都可以通过简单的 API 集成的记忆层

---

## 什么是安全带 {#what-a-harness-actually-is}

它有助于精确了解各层，因为“智能体”习惯于表示很多不同的事物。

**型号** 是LLM。 Claude、GPT、Gemini、Qwen，无论您将安全带指向何处。它是无国籍的。它接收令牌并发出令牌。

**安全带** 是模型周围的运行时。它拥有智能体循环、工具注册表、权限、提示组件、渲染。 Claude Code是一个工具。 OpenClaw 是一个安全带。 Cursor 是一个将聊天 UI 固定在编辑器上的工具。 Hermes是一款围绕长期运行的智能体而设计的安全带。

**智能体** 是当线束使用工具驱动模型实现目标时出现的结果。它不是您安装的东西 - 它是线束加上模型和提示的运行时行为。取景**智能体=模型+线束**已成为描述这种分割的标准方式——请参阅[OpenAI 线束工程](https://openai.com/index/harness-engineering/)、[Martin Fowler 谈智能体编码的利用工程](https://martinfowler.com/articles/harness-engineering.html)和[LangChain 智能体线束剖析](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness)了解三个锚定镜头。

当人们说“智能体很健忘”时，他们通常的意思是“安全带不会学习”。该模型永远不会记住跨会话的任何内容；这始终是安全带的工作。线束 *确实* 有一个记忆原语 - 文件系统，加上每个会话都会重新读取的静态指令文件 - 但这些复合体都不是。智能体从工作中学到的任何东西都不会反馈回来。

---

## 线束已经解决了哪些问题 {#what-harnesses-have-already-solved}

在谈论差距之前，值得先承认安全带在其他方面取得了多少进步。

**工具。** 每个现代线束都有丰富的工具调用。文件读取、编辑、写入、shell 命令、网络获取、网络搜索。工具注册表不再是瓶颈。

**MCP。** [模型上下文协议](https://modelcontextprotocol.io) 为线束提供了插入外部系统的标准方法。 Slack、Linear、Gmail、Postgres、自定义内部服务——任何这些都可以成为只需几行配置的工具。这是 2025 年的重大飞跃。

**IDE 集成。** Claude Code、Cursor 和 Codex 位于编辑器内部或旁边。他们看到你正在看的内容，他们就地编辑，他们共享缓冲区，他们理解选择。

​​**浏览器和操作系统控制。** OpenClaw 和类似的工具可以驱动浏览器、点击 UI、填写表格、截屏。智能体的有效表面积现在远远超出了文件系统的范围。

**子代理和技能。** Claude Code具有子代理、技能和斜线命令。 OpenClaw具有插件架构。 Hermes 具有原生的多智能体编排。线束层越来越了解如何委托、并行化和组合。

**权限和安全。** 沙箱、允许列表、危险操作确认、挂钩。线束层也是护栏的所在地，并且已经迅速成熟。

这是一个很大的进步。过去，安全带是围绕模型的细环。现在是一个严重的运行时间。

几乎在所有情况下它仍然做得不好的是*学习*。该工具可以保存文件。它可以每天早上重新读取`CLAUDE.md`。它不能做的是从工作本身中积累理解并让这种理解塑造下一次会议。

---

## 记忆差距 {#the-memory-gap}

在上面的任何安全带中打开一个新会话，您将撞到同一堵墙。

安全带知道您拥有什么工具。它不知道您上周决定使用哪个数据库。

线束可以读取您的代码库。殊不知在两次会议前，团队拒绝了一个重构模式并解释了原因。

线束可以调用您的 Linear MCP 服务器。它不知道您今天早上已经对哪些票进行了分类，或者您倾向于将哪些错误推到下一个冲刺。

线束可以截图。它不知道你更喜欢简洁的解释，并且讨厌智能体向你重述问题。

该信息存在。它是通过交互产生的。线束从未捕获过它，因此下一个会话到达时是空白的。

在编码工具中你可以最敏锐地感受到这一点，因为编码是迭代的和上下文相关的。但它随处可见：支持线束在每次对话时都会重新加入同一客户，语音线束在通话结束时会丢失所有上下文，多智能体线束其中一个实例发现有用的东西，而其他实例则永远不会发现。

---

## 解决方法——以及为什么它们还不够 {#the-workarounds--and-why-they-are-not-enough}

线束生态系统已经确定了一些部分答案。他们帮忙。他们都没有学习记忆。

### 文件系统 {#the-filesystem}

大多数工具将文件系统视为事实上的记忆层 - 写入文件，在下一个会话中读回它。它是安全带最基本的原语，对于许多任务来说它都能很好地工作。限制是该线束正在执行写入和读取操作，但没有人执行*组织*。没有综合，没有相关性排名，没有衰减。文件堆积起来。智能体必须准确地知道要打开哪个文件。它是硬盘，而不是记忆。

### 静态上下文文件（CLAUDE.md、智能体.md、.cursorrules） {#static-context-files-claudemd-agentsmd-cursorrules}

大多数编码工具现在支持项目级指令文件。 Claude Code为[`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory)。 Codex 读取[`AGENTS.md`](https://agents.md)。 Cursor 读取`.cursorrules`。该文件会附加到每个会话的系统提示符中。

这些很有用。它们也是静态的。必须有人编写它们，使它们保持最新状态，在它们变得陈旧时对其进行修剪，并记住在发生变化时更新它们。他们捕捉意图，而不是交互。智能体从工作中学到的任何东西都不会反馈到文件中。

如果你曾经看过几周没有被碰过的`CLAUDE.md`，你就会看到故障模式。有一半是错的。应该有的东西少了一半。安全带继续尽职尽责地阅读它。

### 会话压缩和摘要 {#session-compaction-and-summaries}

长会话会自动压缩。一些工具会在会话结束时进行总结。这是一个上下文窗口管理技巧，而不是记忆——摘要存在于生成它的会话中，下一个会话在没有它的情况下开始。

### 记忆召回手册 {#manual-recall}

最常见的模式是用户将上下文粘贴回。“这是我们上次决定的。” “这是我们最终得到的文件。” “这是上次运行的错误。”这就是在用户的大脑和剪贴板中实现的记忆。

### 文献检索 {#document-retrieval}

将工具指向文档存储（RAG超过`/docs`、代码库索引、票证档案）确实很有价值，但它解决了参考资料问题。它没有捕获实时的交互历史记录——在这个对话中、与这个用户、在这个项目中发生的事情，没有被记录在任何地方。

---

## 当安全带具有记忆时会发生什么变化 {#what-changes-when-the-harness-has-memory}

记忆一旦成为安全带中的一流层，日常的变化就很容易被低估。

智能体不再重新询问您使用哪个包管理器。它不再暗示您上周明确拒绝的抽象。它不再向您重新解释部署过程。它使用上一个已加载的上下文开始下一个会话 - 没有粘贴，没有总结，但实际上保留和调用。

多智能体设置变化更加显著。如果 Slack 智能体、Discord 智能体和 IDE 内智能体共享相同的记忆库，那么其中一个智能体学到的内容其他人也知道。周一向 Slack 机器人提问的用户可以在周二从 IDE 智能体获得连续性。

长期运行的智能体——语音、支持、自动化——每次会话结束时都不再失去关系。

最重要的是，安全带变得能够复合改进。每次会话都会使系统比它发现时更加有用。这是无国籍安全带根本无法拥有的财产。

---

## 具体的安全带是如何实现这一目标的 {#how-specific-harnesses-are-approaching-this}

移位不均匀。一些安全带已经开始直接构建记忆。其他人很乐意通过 MCP 或插件集成外部记忆层。

### Hermes {#hermes}

Hermes 附带原生记忆插件。该模式是记忆作为装备功能的最简洁的示例 - 该插件将保留和记忆召回作为智能体循环的一部分来处理，而不是作为外部关注点。最近版本中的 `hermes memory setup` 向导使集成几乎一步完成。

Hermes 也比大多数安全带更进一步地实现了这个想法：它可以 **创造自己的技能**。当智能体遇到它希望重复的工作流程时，它可以编写一项新技能——可重用、可调用的功能——并将其添加到自己的工具箱中以供将来使用。这是一个真正的线束级差异化因素，它比最初出现的更接近于记忆：一种技能是程序性记忆，是一种捕捉 *如何* 做某事而不是 *什么* 发生的事情。将其与声明性记忆（来自像Hindsight这样的记忆层的事实、决策、偏好）配对，你就拥有了工作中的智能体应该如何记住的两部分。它也是自动驾驶智能体最明显的先驱之一——一个可以扩展自身功能的线束，就是一个可以在没有你的情况下进行迭代的线束。

### OpenClaw {#openclaw}

OpenClaw也将记忆视为一流的插件。典型的配置如下所示：

```yaml
plugins:
  hindsight:
    bank: openclaw
    autoRetain: true
    autoRecall: true
```

记忆发生在工作过程中，记忆发生在下一个反应之前——不需要提示。因为 OpenClaw 充当网关 - 它可以同时使用 Slack、Discord、Telegram、浏览器、IDE，所以记忆层使网关在各个表面上保持一致。没有它，每个表面都会独立忘记。

### Claude Code {#claude-code}

Claude Code还没有原生的长期记忆，但它通过[挂钩](https://docs.claude.com/en/docs/claude-code/hooks)、MCP服务器和技能集成了记忆层。 `hindsight-memory`插件直接使用钩子架构：`SessionStart`用于健康检查，`UserPromptSubmit`用于自动记忆召回，`Stop`用于自动记忆存储。 `CLAUDE.md` 覆盖静态切片； MCP 支持的记忆层处理动态切片——无需任何人编辑文件即可累积的内容。

### Codex {#codex}

Codex 具有用于静态上下文的`AGENTS.md`，并且越来越多地用于多智能体配置，其中Codex 实例之间的共享记忆比任何单个实例内的记忆更重要。记忆层成为让多个Codex实例表现得像一个团队而不是平行的陌生人的基础。

### Cursor、Cline、Roo 代码、Aider {#cursor-cline-roo-code-aider}

这些 IDE 驻留工具通常依赖于静态上下文的规则文件，并且具有最少的本机记忆。积分路径通常是MCP。 Roo Code 有一个记忆食谱示例；该模式适用于其中任何一个。

### Pipecat（语音） {#pipecat-voice}

语音控制是无国籍状态最严重的地方。通话结束，智能体忘记了用户。具有记忆层的Pipecat可以在通话中携带上下文——用户下周回电时无需重新解释任何内容。

### 超级代理、Haystack、LangGraph、CrewAI、Pydantic AI {#superagent-haystack-langgraph-crewai-pydantic-ai}

编排框架均支持可插拔记忆；大多数都有到外部记忆层的集成路径。模式是一致的：框架拥有智能体循环，记忆层拥有保留和记忆召回。

所有这些的趋势都是相同的。要么该线束在（Hermes）中构建记忆，要么该线束暴露一个干净的集成点（其他所有人）并插入一个记忆层。

---

## 记忆层对于线束的作用 {#what-a-memory-layer-has-to-do-for-a-harness}

有用的线束级记忆系统不仅仅是一个键值存储。它必须做好四件事，并且它们直接映射到线束的运行方式。

### 从智能体循环中选择性地记忆存储 {#retain-selectively-from-the-agent-loop}

该工具可以看到每个工具调用、每个模型响应、每个用户消息。其中大部分是噪音。 记忆必须捕捉持久的部分——决定、偏好、事实、模式——并跳过其余部分。保留发生*期间*循环，而不是循环之后。

### 模型调用前的记忆召回 {#recall-before-the-model-is-called}

harness 已经在每次模型调用之前组装了一个提示。这是注入相关记忆的自然位置——不是所有记忆，只是与当前任务相关的记忆。 记忆必须足够便宜，能够在每个回合中运行，并且足够精确，不会淹没上下文。

### 对积累的经验感到反思 {#reflect-across-accumulated-experience}

有些问题不能通过回忆一个事实来回答。这些问题的答案是通过综合多种因素来实现的。具有记忆功能的工具应该能够询问“我们对这个代码库了解什么”并获得综合答案，而不是片段列表。

### 跨用户、项目和界面正确确定范围 {#scope-correctly-across-users-projects-and-surfaces}

编码工具需要每个项目的记忆。多租户支持工具需要每个用户的记忆。一群OpenClaw智能体需要共享记忆。使用Codex的团队需要默认共享和可选隔离。记忆层必须支持所有这些模式，而不强迫线束发明自己的范围逻辑。

这些正是[Hindsight](https://hindsight.vectorize.io)优化的设计点。保留、记忆识别、反思和范围界定是四个原语，它们通过任何工具都可以使用的 API 和集成来公开。

---

## 为什么记忆现在对于安全带很重要 {#why-memory-matters-for-harnesses-now}

一年前，你可能会说记忆是可有可无的，因为安全带仍在寻找工具。这个论点不再成立了。

安全带有工具。他们有 IDE 集成。他们有MCP。他们拥有子代理、技能和权限。 “在一次会议中令人印象深刻的智能体”和“在几个月内工作变得更好的智能体”之间的剩余差距几乎完全是记忆。

解决这个问题的工具——无论是通过内置它，比如Hermes，还是通过干净地集成，比如OpenClaw和Claude Code——在积累的交互的几周内，使用起来会感觉非常不同。那些不这样做的人将在演示中继续令人印象深刻，并在第三周令人沮丧。

---

## Hindsight如何搭配 {#how-hindsight-fits}

[Hindsight](https://hindsight.vectorize.io) 被设计为任何线束都可以插入的记忆层。它首先是 API，MCP 兼容，并与主要框架和线束的 [整合](https://hindsight.vectorize.io/integrations) 一起提供。

在实践中，将其集成到线束中看起来像这样：

- 当循环运行时，线束会保留记忆库的相关上下文（自动保留，或显式`retain`调用）
- 在每次模型调用之前，线束会调用相关记忆并将其注入到提示中（自动调用，或显式 `recall` 调用）
- 记忆库范围正确 - 每个项目、每个用户、每个团队或跨群体共享 - 使用 [记忆库](https://hindsight.vectorize.io/developer/api/memory-banks) 配置
- 积累的记忆会定期合成为观察和心智模型，当需要合成时，线束可以直接查询，而不仅仅是记忆召回

harness 继续做它擅长的事情：运行循环、调用工具、管理权限、渲染输出。记忆层处理线束从未设计用于处理的部分。

您可以运行 Hindsight 和 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 以获得最快路径，或者如果数据需要保留在您的环境中，则可以自行托管。无论哪种方式，集成到线束中都是相同的。

---

## 回顾 {#recap}

- 现代智能体利用在工具、MCP、IDE 集成和编排方面投入了大量资金
- 记忆层是最明显的剩余差距，它是决定智能体是否随着使用而提高的层
- 静态解决方法（CLAUDE.md、智能体.md、规则文件）有帮助，但无法捕获实时交互
- Hermes 提供原生记忆； OpenClaw、Claude Code、Codex和编排框架将记忆集成为一层
- 真正的驾驭级记忆系统必须有选择性地记忆存储、精确的记忆召回、跨经验的反思以及正确的范围

如果您的安全带配备了您需要的所有工具，并且您仍然感觉智能体每天早上都在重新开始，那么差距不是模型，也不是工具。这是缺失的记忆层。

---

## 延伸阅读 {#further-reading}

- [你的智能体不会健忘。它从未被赋予记忆。](https://hindsight.vectorize.io/blog/2026/04/23/your-agent-is-not-forgetful) — 智能体记忆的更广泛情况，其中线束层是一个切片
- [Hindsight 现在是 Hermes 智能体的原生记忆提供者](https://hindsight.vectorize.io/blog/2026/04/06/hermes-native-memory-provider) — 记忆即驾驭功能模式背后的集成故事
- [你们的OpenClaw智能体彼此是陌生人。 Hindsight 改变了这一点。](https://hindsight.vectorize.io/blog/2026/04/01/openclaw-shared-memory) — 多表面网关模式详细信息
- [将持久记忆添加到OpenAICodex和Hindsight](https://hindsight.vectorize.io/blog/2026/04/08/adding-memory-to-codex-with-hindsight) — 编码智能体工具中的共享记忆是什么样子
- [Hindsight 集成](https://hindsight.vectorize.io/integrations) — 当前支持的线束和框架列表

---

## 后续步骤 {#next-steps}

- [注册Hindsight Cloud](https://ui.hindsight.vectorize.io) 在几分钟内将记忆添加到您的安全带中
- 阅读[快速入门](https://hindsight.vectorize.io/developer/api/quickstart)以了解自托管部署
- 浏览适合您的安全带或框架的[集成指南](https://hindsight.vectorize.io/integrations)
- 请参阅 [记忆库参考](https://hindsight.vectorize.io/developer/api/memory-banks) 了解跨用户、项目、团队和群体的范围模式
