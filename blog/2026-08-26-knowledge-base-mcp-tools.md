---
title: "您的智能体现在可以在 MCP 上管理自己的知识库"
authors: [benfrank241]
slug: "2026/08/26/knowledge-base-mcp-tools"
date: 2026-08-26T12:00
tags: [hindsight, knowledge-pages, mcp, agent-memory, knowledge-base, self-updating-docs]
description: "Hindsight 0.9.2 将知识库转变为原生 MCP 界面：七个面向智能体的工具，用于浏览、搜索、创建、更新和修剪自己的 wiki，其连接与记忆存储和记忆召回所使用的连接相同。"
image: /img/blog/knowledge-base-mcp-tools.webp
hide_table_of_contents: true
---

![作为原生的Hindsight知识库MCP表面：七个面向智能体的工具，用于通过智能体用于记忆存储和记忆召回的相同连接来读取、搜索和维护自我修复维基](/img/blog/knowledge-base-mcp-tools.webp)

A [Hindsight](https://hindsight.vectorize.io) 知识库是位于智能体记忆之上的可读、自我修复的维基：这些页面将智能体所知道的内容提炼成人类可以浏览的内容，并随着底层记忆的变化而重建自身。

直到现在还存在一种奇怪的不对称性。智能体可以整天通过`retain`和`recall`超过MCP，但要浏览或维护该wiki，它必须下拉到单独的HTTP路径。记忆是本能的；知识库是第二次整合。

Hindsight 0.9.2 缩小了这一差距。知识库现在是一个**原生MCP表面**：七个面向智能体的操作注册为工具，与智能体已经用来记住的连接相同。

<!-- truncate -->

## 概览 {#tldr}

- **七个知识库操作现在是MCP工具**，因此智能体可以浏览树、搜索、阅读页面、创建文件夹和页面、更新节点以及修剪它们，而无需离开MCP。
- 它们在**与`retain`和`recall`相同的连接**上运行，具有相同的记忆库范围和租户身份验证，因此无需进行第二次集成。
- 它们是**安全注释**：读取被标记为只读（客户端可以自动批准它们），一次删除被标记为破坏性，并且每个工具都与智能体自己的记忆有关。
- 操作员可以**限制记忆库公开哪些工具**，因此您可以向一个记忆库提供完整的管理权限和另一个只读访问权限。
- **每个页面的刷新触发器在树上可见**，因此智能体可以在决定编辑之前区分自我维护页面和手写页面。
- `export_knowledge_base`**保持关闭MCP**：它将整个记忆库作为一个降价包返回，这在智能体的上下文窗口中没有任何作用。

## 七个工具 {#the-seven-tools}

知识库分为读取、写入和单个破坏性操作。这种分裂不仅是文档方面的，也是文档方面的。它被编码在每个工具的 MCP 注释中，这使得客户端能够以不同的方式对待它们。

|工具|类型|它的作用|
| --- | --- | --- |
|`get_knowledge_base_tree`|阅读|返回文件夹和页面树，每个页面的刷新触发器都可见|
|`search_knowledge_base`|阅读|跨页面搜索相关内容|
|`get_knowledge_page`|阅读|阅读单页完整内容|
|`create_knowledge_folder`|写|添加文件夹来组织树|
|`create_knowledge_page`|写|写入新的一页|
|`update_knowledge_node`|写|编辑现有页面或文件夹|
|`delete_knowledge_node`|破坏性|删除页面或文件夹|

读取带有`readOnlyHint`，因此MCP客户端可以对它们进行分组并自动批准安全的读取，而无需每次调用时进行提示。 `delete_knowledge_node`带有`destructiveHint`，因此客户端可以将其挑出进行确认。而且因为这些工具中的每一种都只触及智能体自己的记忆库，所以它们都被标记为封闭世界：无法到达智能体已经拥有的记忆之外。

## 一个连接，循环关闭 {#one-connection-and-the-loop-closes}

重点不在于七个工具。它们利用智能体已有的连接。

之前，智能体与其知识库的关系主要是阅读且尴尬的：记忆存在于MCP上，维基存在于HTTP上，保持它们同步意味着维护两个集成。现在，单个MCP会话可以`retain`一个新事实，`recall`反对它，注意相关页面已过时，并且`update_knowledge_node`修复它，所有这些都在一个地方。编写记忆的智能体就是策划人类可读视图的智能体。

这就是 wiki *关于* 你的智能体和 wiki 你的智能体实际上 *保留* 之间的区别。支持智能体可以在第一次解决新问题时提交新的运行手册页面。编码智能体可以在得知旧架构页面错误时立即更正架构页面。知识库不再是周期性的导出，而是成为智能体在工作时所趋向的活生生的表面。

这是单个会话中的循环：

1. 智能体`recall`用于回答问题并得到有根据的答复。
2. 在完成任务时，它学到了 wiki 还没有想到的东西。
3. 它调用`search_knowledge_base`来查找应该保存它的页面。
4. `get_knowledge_page` 拉出当前文本，`update_knowledge_node` 将更正写入到位。
5. 下一个会话的`recall`，以及下一个人类读者，都从固定页面开始。

无需交接，无需二次集成，无需导出-编辑-重新导入。使用记忆的同一会话提高了它的记录。

## 每一页都显示了重建它的内容 {#every-page-shows-what-rebuilds-it}

知识页面有两种风格：一种是随着底层记忆的变化而在触发器上自行重建的，另一种是手写的。过去，区分它们意味着打开一个页面来找出答案。在 0.9.2 中，`get_knowledge_base_tree` 在树上显示每个页面的刷新触发器，因此智能体可以在接触任何内容之前看到页面是否维护自身或等待编辑。

​​当智能体具有写访问权限时，该信号就很重要。自行刷新的页面通常是不予理睬并让触发器更新的页面；智能体可以使用 `update_knowledge_node` 安全地纠正手写页面。将触发器放在树上会将“我应该编辑这个”从猜测变成智能体从结构中读取的内容，当进行编辑的对象是模型时，这正是您想要的。

## 默认安全，由操作员限定范围 {#safe-by-default-and-scoped-by-the-operator}

将智能体写入和删除对其自己文档的访问权限听起来正是您想要护栏的那种东西，而且有两个。

第一个是每个工具。上面的注释意味着客户端永远不会猜测调用是否安全：读取声明自己为只读，破坏性删除声明自己为破坏性，主机可以自动批准前者，同时对后者进行门控。您无需在删除时签署空白支票，即可享受无人值守读取的便利。

第二个是per-记忆库。操作员可以限制给定记忆库在MCP上公开的工具集，应用于工具列表和实际调用。

将记忆库指向三个阅读工具，您就为智能体提供了一个它可以查阅但不能更改的知识库。再指向所有七个，你就有了一位策展人。范围是在部署时设置的，而不是在提示中设置，您必须信任模型才能遵守。

这也是`export_knowledge_base`根本不在MCP集合中的原因。它存在，但只能通过 HTTP 和 CLI 进行，因为它将整个记忆库作为单个 Markdown 包返还。这是备份知识库的好方法，但放入上下文窗口中却是一件可怕的事情，因此它在设计上远离了智能体的范围。

## 这是给谁的 {#who-its-for}

如果您已经针对 Hindsight 在 MCP 上运行智能体，则此升级可让其拥有自己的文档，而不仅仅是阅读它。编码智能体获得最紧密的循环：调查存储库，编写页面，并在代码库移动时纠正它们，这就是[Claude Code构建和阅读自己的知识库](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents)背后的模式。支持和研究智能体找到一个地方来归档他们所学到的知识，以便下一次会议从这里开始。

如果您因为连接知识库意味着第二次集成而推迟，那么这个理由就消失了。这是相同的连接、相同的身份验证、相同的记忆库。

## 设置 {#setup}

该工具在 0.9.2 上自动为 MCP 客户端注册。将您的智能体连接到Hindsight的MCP服务器，就像您已经对`retain`和`recall`所做的那样，七个知识库工具会出现在它们旁边，范围仅限于您指向的记忆库。要分配更窄的访问权限，请将记忆库的启用工具设置为您希望该记忆库公开的子集。 [MCP服务器指南](/developer/mcp-server) 包含连接详细信息，[知识页面文档](/developer/knowledge-pages) 覆盖页面本身。

## 常见问题 {#frequently-asked-questions}

### 什么是Hindsight知识库？ {#what-is-a-hindsight-knowledge-base}

它是一个人类可读的、自我修复的维基，建立在你的智能体记忆之上。页面将智能体所知道的内容提炼成您可以浏览的内容，并组织在文件夹树中，并且当其背后的记忆发生变化时，它们会自行重建。这是一个人为了理解智能体所学到的东西而阅读的视图，现在也是智能体可以自我维护的一个表面。

### 知识库工具与`retain`和`recall`有何关系？ {#how-do-the-knowledge-base-tools-relate-to-retain-and-recall}

他们坐在上面一层。 `retain`和`recall`是智能体编写和读取原始记忆本身的方式：事实、观察和关系。知识库是从记忆中提炼出来的精心策划的、人类可读的维基，而这七个工具是智能体管理它的方式。

在实践中，两者协同工作：智能体保留其所学知识，回忆其行动，并使用知识库工具来保持其可读摘要的准确性。相同的连接，相同的记忆库，两个抽象层次。

### 这与Claude Code知识库帖子有何不同？ {#how-is-this-different-from-the-claude-code-knowledge-base-post}

那篇文章介绍了编码智能体集成，其中Claude Code通过专用路径构建和读取存储库维基。这是核心服务器中的底层功能：知识库现在是*各自*MCP客户端的本机MCP表面，同一连接上有七个工具用于`retain`和`recall`。编码智能体体验是您可以在此基础上构建的一件事。

### 我可以授予智能体对知识库的只读访问权限吗？ {#can-i-give-an-agent-read-only-access-to-the-knowledge-base}

是的。将记忆库启用的工具限制为三个读取（`get_knowledge_base_tree`、`search_knowledge_base`、`get_knowledge_page`）。智能体可以浏览和搜索其维基，但无法创建、编辑或删除任何内容。该限制适用于工具列表和任何调用未公开工具的尝试。

### 智能体能否从无到有建立知识库？ {#can-an-agent-build-a-knowledge-base-from-nothing}

是的。通过`create_knowledge_folder`和`create_knowledge_page`，智能体可以布置一棵新树并填充它，然后随着它了解更多信息，使其与`update_knowledge_node`保持同步。这就是编码-智能体模式：在同一个 MCP 连接上调查一次存储库，编写初始页面，并从那时起就地纠正它们。

### 为什么智能体不能通过MCP导出整个知识库？ {#why-cant-an-agent-export-the-whole-knowledge-base-over-mcp}

因为`export_knowledge_base`将整个记忆库作为一个markdown包返回，这对于备份很有用，但在上下文窗口中却非常有害。它通过 HTTP 和 CLI（批量导出所属的地方）保持可用，并且有意脱离智能体的 MCP 工具集。

### 知识库工具是否尊重多租户边界？ {#do-the-knowledge-base-tools-respect-multi-tenant-boundaries}

是的。它们与现有的MCP工具共享相同的记忆库范围和租户身份验证，并且每个工具都与智能体自己的记忆绑定。智能体只能看到和改变它所指向的记忆库的知识库。

### 知识库工具调用是否经过审核？ {#are-the-knowledge-base-tool-calls-audited}

是的。可审核的MCP工具运行包含审核日志记录，因此创建、更新或删除都会被记录而不是静默。在 0.9.2 上，工作线程运行也会被跟踪并加入调用者的跟踪，因此异步操作是端到端可见的，而不是在调用返回后消失。你可以看到智能体发生了什么变化，而不仅仅是某些东西发生了变化。

---

**了解更多：**
- [Claude Code构建并读取自己的知识库](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents) — 此功能所支持的编码智能体模式
- [MCP服务器指南](/developer/mcp-server) — 连接智能体并确定其工具范围
- [Hindsight 0.9.2 中的新增功能](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2) — 发布的版本
