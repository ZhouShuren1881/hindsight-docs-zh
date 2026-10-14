---
title: "智能体现在可以通过 MCP 管理自己的知识库"
authors: [benfrank241]
slug: "2026/08/26/knowledge-base-mcp-tools"
date: 2026-08-26T12:00
tags: [hindsight, knowledge-pages, mcp, agent-memory, knowledge-base, self-updating-docs]
description: "Hindsight 0.9.2 将知识库变为原生 MCP 能力：智能体可通过与存入和召回记忆相同的连接，浏览、搜索、创建、更新和清理自己的 wiki，共有七种工具。"
image: /img/blog/knowledge-base-mcp-tools.webp
hide_table_of_contents: true
---

![Hindsight 知识库作为原生 MCP 能力：智能体通过用于存入和召回记忆的同一连接，读取、搜索并维护一个可自我修复的 wiki](/img/blog/knowledge-base-mcp-tools.webp)

[Hindsight](https://hindsight.vectorize.io) 知识库是构建在智能体记忆之上的可读、自我修复 wiki：其中的页面会提炼智能体所知的内容，方便人类快速浏览；底层记忆发生变化时，页面也会自行重建。

此前，这两者之间存在一种奇怪的不对称：智能体可以随时通过 MCP `retain` 和 `recall`，但要浏览或维护 wiki，就必须另走 HTTP 接口。记忆原生支持 MCP，知识库却需要第二套集成。

Hindsight 0.9.2 弥合了这一差距。知识库现在具备**原生 MCP 能力**：七种面向智能体的操作注册为工具，使用的正是智能体原本用于记忆的连接。

<!-- truncate -->

## 概览 {#tldr}

- **七种知识库操作现在都可作为 MCP 工具使用**，智能体可以浏览目录树、搜索、阅读页面、创建文件夹和页面、更新节点及清理节点，全程无需离开 MCP。
- 这些工具使用**与 `retain` 和 `recall` 相同的连接**，沿用相同的记忆库范围和租户身份认证，因此无需再配置第二套集成。
- 工具带有**安全注释**：读取操作标记为只读（客户端可以自动批准），删除操作标记为破坏性操作，并且每种工具的范围都限于智能体自己的记忆。
- 操作员可以**限制记忆库公开的工具**，例如让一个记忆库拥有完整的编修权限，另一个只开放只读访问。
- **目录树会显示每个页面的刷新触发器**，让智能体在决定是否编辑前，判断页面是自行维护还是手动编写的。
- `export_knowledge_base` **有意不通过 MCP 提供**：它会将整个记忆库打包为一份 Markdown 文档，这不适合放进智能体的上下文窗口。

## 七种工具 {#the-seven-tools}

知识库工具分为读取、写入和一种破坏性操作。这种区分不只体现在文档中，也编码在每种工具的 MCP 注释里，客户端因此可以区别处理。

| 工具 | 类型 | 作用 |
| --- | --- | --- |
| `get_knowledge_base_tree` | 读取 | 返回文件夹和页面组成的目录树，并显示每个页面的刷新触发器 |
| `search_knowledge_base` | 读取 | 搜索各个页面，找出相关内容 |
| `get_knowledge_page` | 读取 | 读取单个页面的完整内容 |
| `create_knowledge_folder` | 写入 | 添加文件夹以整理目录树 |
| `create_knowledge_page` | 写入 | 创建新页面 |
| `update_knowledge_node` | 写入 | 编辑现有页面或文件夹 |
| `delete_knowledge_node` | 破坏性 | 删除页面或文件夹 |

读取工具带有 `readOnlyHint`，因此 MCP 客户端可以将它们归为一类，并自动批准安全的读取操作，无需每次调用都提示用户。`delete_knowledge_node` 带有 `destructiveHint`，客户端可以据此单独标出它并要求确认。此外，每种工具都只会操作智能体自己的记忆库，因此它们都标记为封闭世界：不会访问智能体已有记忆范围之外的数据。

## 同一连接，让闭环完整运转 {#one-connection-and-the-loop-closes}

重点其实不在这七种工具本身，而在于它们使用了智能体已有的连接。

此前，智能体与知识库的交互大多只能读取，而且不够顺畅：记忆通过 MCP 访问，wiki 则通过 HTTP 访问；要让两者保持同步，就得维护两套集成。现在，只需一个 MCP 会话，智能体就可以 `retain` 一条新事实、针对它 `recall`、发现相关页面内容待更新，再调用 `update_knowledge_node` 修正页面，全程在同一处完成。写入记忆的智能体，也能编修记忆的人类可读视图。

这就是“关于智能体的 wiki”与“智能体实际维护的 wiki”之间的区别。支持智能体首次解决新问题时，可以归档一页新的运行手册；编码智能体发现旧架构页面有误时，可以立即更正。知识库不再只是定期导出的内容，而成为智能体工作时持续维护的内容界面。

一个 MCP 会话中的闭环如下：

1. 智能体通过 `recall` 回答问题，并得到有依据的答复。
2. 在处理任务时，它学到 wiki 尚未记录的信息。
3. 它调用 `search_knowledge_base`，找到应该收录这条信息的页面。
4. `get_knowledge_page` 读取当前文本，`update_knowledge_node` 则将修正写回原处。
5. 下一次会话中的 `recall` 和下一位人类读者，都可以从修正后的页面开始。

无需交接，无需第二套集成，也无需导出、编辑再重新导入。同一会话使用记忆后，也更新了记忆的记录。

## 每个页面都会显示触发其重建的条件 {#every-page-shows-what-rebuilds-it}

知识页有两种：一种会在底层记忆发生变化时按触发器自行重建，另一种由人手动编写。过去，要分辨它们只能打开页面查看。在 0.9.2 中，`get_knowledge_base_tree` 会直接在目录树中显示每个页面的刷新触发器，因此智能体在改动任何内容前，就能判断页面会自行维护，还是等待编辑。

智能体获得写入权限后，这个信号就很重要。自行刷新的页面通常应当保留原样，让触发器负责更新；手动编写的页面则可以由智能体使用 `update_knowledge_node` 安全修正。在目录树中显示触发器，让智能体可以根据结构判断“我是否应该编辑这个页面”，无需猜测；当负责编辑的是模型时，这正是所需要的行为。

## 默认安全，并由操作员限定范围 {#safe-by-default-and-scoped-by-the-operator}

让智能体有权写入和删除自己的文档，听起来确实需要设置防护措施。这里有两层防护。

第一层按工具设置。前面的注释让客户端无需猜测调用是否安全：读取操作声明为只读，删除操作声明为破坏性；宿主可以自动批准前者，同时对后者设置审批门槛。这样既能方便地无人值守读取，也不必对删除操作不加限制地放行。

第二层按记忆库设置。操作员可以限制某个记忆库通过 MCP 公开的工具集；此限制同时应用于工具列表和实际调用。

将一个记忆库配置为仅提供三种读取工具，就能让智能体查阅知识库，但无法修改它。另一个记忆库若提供全部七种工具，智能体就可以负责编修。访问范围应在部署时确定，而不是依赖提示词中要求模型遵守的规则。

这也是 `export_knowledge_base` 完全不属于 MCP 工具集的原因。该操作确实存在，但只能通过 HTTP 和 CLI 使用，因为它会将整个记忆库作为一份 Markdown 文档返回。这很适合备份知识库，却不适合放进上下文窗口，因此设计上不会让智能体通过 MCP 使用它。

## 适用对象 {#who-its-for}

如果你已经通过 MCP 让智能体使用 Hindsight，这次升级就能让智能体拥有并维护自己的文档，而不只是阅读文档。编码智能体可以形成最紧密的工作闭环：检查代码仓库、编写页面，并随着代码库变化就地更正页面。这正是[Claude Code 构建并阅读自己的知识库](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents)所采用的模式。支持和研究智能体也可以将所学归档到知识库，让下一次会话从已有记录开始。

如果你此前因为接入知识库需要配置第二套集成而暂缓，现在这个顾虑已不复存在：连接、身份认证和记忆库都相同。

## 设置 {#setup}

在 0.9.2 中，MCP 客户端连接时会自动注册这些工具。像之前使用 `retain` 和 `recall` 那样，将智能体连接到 Hindsight 的 MCP 服务器，七种知识库工具就会一并出现，并且范围限定为你指定的记忆库。如需授予更有限的访问权限，可将记忆库的启用工具设置为希望该记忆库公开的子集。[MCP 服务器指南](/developer/mcp-server)介绍连接方法，[知识页文档](/developer/knowledge-pages)介绍知识页本身。

## 常见问题 {#frequently-asked-questions}

### 什么是 Hindsight 知识库？ {#what-is-a-hindsight-knowledge-base}

它是构建在智能体记忆之上的 wiki，内容便于人类阅读，并能自我修复。页面会将智能体所知的内容提炼成易于浏览的信息，按文件夹树组织；当页面背后的记忆发生变化时，页面会自行重建。人们可以通过这个视图了解智能体学到了什么；现在，智能体也能自行维护这个视图。

### 知识库工具与 `retain` 和 `recall` 有什么关系？ {#how-do-the-knowledge-base-tools-relate-to-retain-and-recall}

知识库工具处于更高一层。智能体通过 `retain` 和 `recall` 写入和读取原始记忆，也就是事实、观测和关系。知识库则是从这些记忆中提炼出的、经过编修且便于人类阅读的 wiki；这七种工具让智能体能够维护它。

实际使用时，两者可以协同工作：智能体存入所学内容，通过召回来采取行动，再使用知识库工具确保人类可读的整理内容保持准确。相同的连接、相同的记忆库，两个抽象层次。

### 这与 Claude Code 知识库那篇文章有什么不同？ {#how-is-this-different-from-the-claude-code-knowledge-base-post}

那篇文章介绍的是 Coding Agents 集成：Claude Code 通过专用路径构建并读取代码仓库 wiki。这里介绍的是核心服务器中的底层能力：知识库现在成为任意 MCP 客户端都能使用的原生 MCP 能力，客户端可以通过与 `retain` 和 `recall` 相同的连接调用七种工具。编码智能体体验只是可以构建在此能力之上的一种用法。

### 可以只授予智能体对知识库的只读访问权限吗？ {#can-i-give-an-agent-read-only-access-to-the-knowledge-base}

可以。将记忆库启用的工具限制为三种读取工具（`get_knowledge_base_tree`、`search_knowledge_base`、`get_knowledge_page`）。智能体可以浏览和搜索自己的 wiki，但不能创建、编辑或删除内容。该限制既适用于工具列表，也适用于任何调用未公开工具的尝试。

### 智能体能从零开始构建知识库吗？ {#can-an-agent-build-a-knowledge-base-from-nothing}

可以。智能体可以使用 `create_knowledge_folder` 和 `create_knowledge_page` 创建新的目录树并填入内容，然后在继续学习时通过 `update_knowledge_node` 保持内容更新。这就是编码智能体采用的模式：检查一次代码仓库，编写初始页面，此后都在同一个 MCP 连接上就地修正页面。

### 为什么智能体不能通过 MCP 导出整个知识库？ {#why-cant-an-agent-export-the-whole-knowledge-base-over-mcp}

因为 `export_knowledge_base` 会将整个记忆库作为一份 Markdown 文档返回。这适合备份，却会给上下文窗口带来大量无用内容。该功能仍可通过 HTTP 和 CLI 使用，批量导出也适合在这些接口中进行；它有意不属于智能体的 MCP 工具集。

### 知识库工具遵守多租户边界吗？ {#do-the-knowledge-base-tools-respect-multi-tenant-boundaries}

遵守。它们与现有 MCP 工具使用相同的记忆库范围和租户身份认证；每种工具都限定在智能体自己的记忆范围内。智能体只能查看和更改它所连接的记忆库中的知识库。

### 知识库工具调用会留下审计记录吗？ {#are-the-knowledge-base-tool-calls-audited}

会。可审计的 MCP 工具运行会写入审计日志，因此创建、更新或删除操作都会留下记录。对于 0.9.2，工作进程的运行也会被追踪并关联到调用方的追踪记录中；这样，异步操作从头到尾都可见，不会在调用返回后失去踪迹。你可以查看智能体改动了什么，而不仅仅知道发生过改动。

---

**了解更多：**
- [Claude Code 构建并阅读自己的知识库](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents) — 此能力支持的编码智能体模式
- [MCP 服务器指南](/developer/mcp-server) — 连接智能体并限定其工具范围
- [Hindsight 0.9.2 有哪些新内容](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2) — 发布此功能的版本
