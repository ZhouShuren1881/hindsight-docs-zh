---
title: "与您的Obsidian Vault 聊天：引用您笔记的接地答案"
authors: [benfrank241]
slug: "2026/06/16/obsidian-persistent-memory"
date: 2026-06-16T12:00
tags: [obsidian, memory, persistent-memory, hindsight, second-brain, knowledge-management, tutorial]
description: "为您的Obsidian库提供真正了解您笔记的AI智能体。 Hindsight 插件将您的金库同步到记忆库中，并添加一个聊天面板，其答案基于您的笔记并引用来源，而您的金库仍然是唯一的事实来源。"
image: /img/blog/obsidian-persistent-memory.webp
hide_table_of_contents: true
---

![Obsidian 持久记忆Hindsight](/img/blog/obsidian-persistent-memory.webp)

[Obsidian](https://obsidian.md)是很多人思考的地方。多年的笔记、会议记录、研究、半成品的想法。问题是这么大的金库无法以任何有用的方式进行搜索。你知道你六个月前写了一些关于决定的文章；你就是找不到那张纸条。全文搜索找到的是单词，而不是想法，而且它当然无法通过五个注释进行推理来回答问题。

这篇文章是Obsidian的新Hindsight插件的演练。它将您的保管库同步到Hindsight记忆库，并添加一个聊天面板来回答您的笔记问题以及每个答案**引用它来自的注释**。您的金库仍然是唯一的事实来源； Hindsight是其之上的推理层。

## 概览 {#tldr}

<!-- truncate -->

- Obsidian的内置和矢量搜索插件可以查找相关笔记。它们不会在你的金库中进行推理，也不会随着它的增长而保持运行的综合。
- Hindsight插件**将您的金库同步到记忆库中**（一篇笔记=一份文档）并添加了由Hindsight的`reflect`支持的**接地聊天面板**。
- **每个答案都引用其来源注释。** 单击引文以打开注释。推理披露显示了每个步骤所询问的内容。
- **你的金库是规范的。** 同步是单向的（Obsidian 到Hindsight），聊天对话是**默认不存储**。 Hindsight永远不会成为第二个真理来源。
- **隐式范围：** 每个笔记都会自动标记其保管库、文件夹和日期，因此您可以将问题过滤为“仅工作保管库”或“本月更新的笔记”，无需任何设置。
- Hindsight Cloud意味着没有基础设施。 [免费注册。](https://ui.hindsight.vectorize.io)
- **现已上市 [Obsidian 社区插件市场](https://community.obsidian.md/plugins/hindsight)中的**在[Obsidian社区插件存储](https://community.obsidian.md/plugins/hindsight)：一键安装。

:::tip 现在在Obsidian社区存储
这Hindsight插件是**住在[Obsidian 社区插件市场](https://community.obsidian.md/plugins/hindsight)** (`v0.1.2`在撰写本文时）。这意味着从内部一键安装Obsidian，没有手动步骤，它把Hindsight一键点击即可Obsidian的数百万用户。看[安装](#installing)以下。
:::

## 问题：大金库很难推理 {#the-problem-a-big-vault-is-hard-to-reason-over}

小金库很容易。几十个笔记、搜索和反向链接可以让你到达任何地方。当金库变得足够大而具有真正价值时，麻烦就开始了，而这正是它变得难以使用的时候。

矢量搜索插件有帮助：它们会显示与您键入的内容语义相关的注释，这比关键字匹配更有效。但“显示相关注释”与“回答我的问题”并不相同。如果答案包含三个音符，则相关注释列表会将这三个音符交给您，并将综合留给您。该流程中的任何内容都不会记住您的要求，也不会随着时间的推移构建您的金库的运行图。

Hindsight 添加缺少的图层：

- **记忆召回** 比文本搜索更快、更准确。
- **反思** 推理整个库来回答问题，并告诉您它使用了哪些注释。
- **心智模型**（在路线图上）将保留您的保管库的实时摘要，并在您编写时刷新。

## 真理之源留在Obsidian {#source-of-truth-stays-in-obsidian}

这是塑造其他一切的设计规则，因此值得在机制之前明确说明：**Hindsight永远不会成为第二个真相来源。**

- **同步是单向的。** Obsidian 到 Hindsight，绝不相反。你的金库是规范的； Hindsight 是派生索引。
- **每个答案都引用它来自的注释。** 当出现问题或过时时，您可以在笔记中、在源头修复它，而不是在一些不透明的记忆存储中。
- **默认情况下不存储聊天对话。** 提出问题不会在你的金库之外创造新的记忆。 （如果你需要的话，有一个开关；它是开箱即用的。）
- **编辑注释并Hindsight重新收敛
下次同步时**。指数总是追逐金库，而不是相反。

如果您被那些悄悄成为不同步数据的并行副本的工具所困扰，那么这就是您担心的答案。

## 它是如何工作的 {#how-it-works}

插件监视您的保管库并将文件事件映射到Hindsight操作：

```
note created / edited ──▶ retain(documentId = note path)   (upsert; replaces prior version)
note renamed          ──▶ deleteDocument(old) + retain(new)
note deleted          ──▶ deleteDocument(path)
"立即同步保管库"      ──▶ reconcile: ingest drifted notes, prune orphans

chat turn             ──▶ reflect(question) over the whole bank
                          └─ answer + citations (source notes) + reasoning
```

每个笔记都成为一个Hindsight文档，由其路径作为键控。本地索引（内容哈希的音符路径加上 mtime）意味着只有实际更改的音符才会被重新摄取，因此在编辑一个文件后同步 400 个音符的保管库会重新发送一个文件，而不是 400 个文件。

状态栏（和聊天标题）中始终有一个可见的同步指示器，因此不会发生任何看不见的事情：类似于`Hindsight ✓ 412 notes · 2m ago`，旁边有一个刷新按钮，在同步时旋转并在单击时触发同步。

## 带有引文的扎根聊天 {#grounded-chat-with-citations}

聊天面板是您日常实际使用的部分。您将其作为侧面板打开，用自然语言提出问题，然后Hindsight在您的记忆库上运行`reflect`以产生答案。

让它值得信赖的是答案所附的内容：

- **引用。** 每个答案都列出了它检索到的笔记。单击其中之一即可打开保管库中的源注释。如果答案显示您决定在 3 月份离开Postgres，您可以直接跳到这样说的注释并确认。
- **推理披露。** 可折叠的视图显示了梦想的每一步实际查询的内容，因此答案不是黑匣子。
- **范围下拉菜单。** 在询问栏上方，保管库和文件夹下拉菜单可让您在提问之前将问题缩小到保管库的一部分。
- **新聊天** 启动一个新线程，如果您想查看管道，**调试日志记录**（一项设置）会打印确切的 `reflect` 请求并检索注释到控制台。

因为答案指向真实的笔记，所以“AI自信地胡编乱造”的失败模式变成了“点击引文查看”。金库就在那里。

## 隐式范围：无需设置的过滤器 {#implicit-scoping-filter-without-setup}

每条笔记都会在摄取时自动标记。您不需要手工标记任何东西；该插件从笔记所在的位置派生标签：

|尺寸|标签|过滤器示例|
| --- | --- | --- |
|避难所|`vault:<name>`|仅工作库|
|文件夹（和祖先）|`folder:Work`, `folder:Work/Clients`|`Work/`下的所有内容|
|日期|`created:2026-03`, `updated:2026-06`|本月更新笔记|

你自己的前线`tags`和`aliases`也贯穿其中。回报：您永远不会考虑范围，直到您需要它的那一刻，然后您可以通过Hindsight的`tag_groups`按任意组合（保管库加文件夹加日期）进行过滤。 `Work/Clients/Acme` 下的注释可通过 `folder:Work` 过滤器、`folder:Work/Clients` 过滤器或保管库过滤器访问，因为文件夹也标记其祖先。

多个保管库可以共享一个记忆库，并通过其`vault:`标签保持清晰的分离，这就是为什么默认记忆库名称只是`obsidian`，并且默认情况下`Prefix document IDs`处于打开状态（因此不同保管库中的同名笔记不会发生冲突）。

## 一个记忆库、UI 和API {#one-bank-ui-and-api}

一个很容易跳过但很重要的细节：聊天面板和任何外部自动化都会点击**具有相同标签的相同记忆库**。您从 Obsidian 同步的保管库可从 n8n 工作流程、[Hermes](https://hindsight.vectorize.io/blog/2026/03/17/hermes-agent-memory) 智能体、直接 API 调用或任何其他 Hindsight 集成读取，并且它们都看到相同的范围视图。

因此您的笔记不再被困在一个应用程序中。每晚的自动化可以回顾 `folder:Meetings updated:2026-06` 并将摘要发布到 Slack，使用的正是您在聊天面板中询问相同问题时会看到的注释。

## 安装 {#installing}

该插件位于**Obsidian社区店**中，因此只需在Obsidian中单击即可安装：

1. 打开**设置→社区插件→浏览**。
2. 搜索**Hindsight**，单击**安装**，然后单击**启用**。

> 想要在上市之前获得最前沿的测试版本吗？您还可以通过添加存储库 [`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian) 通过 [小子](https://github.com/TfTHacker/obsidian42-brat) 跟踪它们。

然后指向Hindsight。推荐路径是**Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)，抓取一个API密钥，并将其粘贴到**设置→Hindsight**中。无需运行服务器；同步和反思均在云端进行。

更喜欢自托管？在本地运行 Hindsight 并将 API URL 设置为您的实例：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

然后在插件设置中将**API 网址**设置为`http://localhost:8888`。

## 按键设置 {#key-settings}

一切都生活在**设置→Hindsight**下：

|设置|默认|它的作用|
| --- | --- | --- |
|API 网址|`https://api.hindsight.vectorize.io`|Hindsight服务器；使用 `http://localhost:8888` 进行自托管。|
|API 键|（无）|您的Hindsight Cloud密钥。|
|记忆库名称|`obsidian`|所有保管库的共享记忆库（由 `vault:` 标签分隔）。|
|包含/排除文件夹|（无）|限制哪些音符同步。|
|编辑时同步|开启|编辑时自动重新提取笔记。|
|默认聊天深度|低|反思聊天答案的预算；对于更难的问题提出它。|
|记住对话|**关闭**|开启后，聊天回合将存储在Hindsight（保管库外部的记忆）中。|
|前缀文档 ID|开启|Vault 前缀 ID，因此共享记忆库Vault 不会发生冲突。仅针对单保管库设置关闭。|

命令面板中的三个命令：**立即同步保管库**（完全协调）、**摄取当前笔记**（强制同步活动音符）和**打开聊天**。

## 权衡 {#tradeoffs}

**同步取决于内容哈希，而不是魔法。** 当内容发生变化时，笔记会被重新摄取。如果您希望整个保管库保持新鲜状态（例如在进行大型外部编辑或将 git 拉入保管库文件夹后），请运行 **立即同步保管库** 进行协调，而不是依赖于每次编辑同步。

**用`Default chat depth`衡量质量。** 默认为 `low`，对于大多数查找来说快速且良好。对于需要涉及很多笔记的问题，提高预算；它以更高的成本和延迟进行更彻底的搜索。

**聊天记忆是有意选择加入的。** `Remember conversations` 已关闭，因此提出问题不会悄悄地在您的保管库之外累积状态。如果您希望智能体记住长时间工作会话的线程，请将其打开，但要知道您随后创建的记忆不是您的笔记之一。

## 回顾 {#recap}

||Obsidian 默认|与 Hindsight|
| --- | --- | --- |
|查找注释|全文/反向链接|语义记忆，更快更准|
|跨笔记回答问题|你手动合成|反思答案并引用笔记|
|相信答案|不适用|每个答案都链接其源注释|
|真相来源|你的金库|仍然是您的保管库（单向同步）|
|确定查询范围|手动搜索运算符|自动标签：保管库/文件夹/日期|
|自动化的影响力|每个应用程序|与 n8n、Hermes、API 相同的记忆库|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Obsidian + Hindsight](/sdks/integrations/obsidian)
- **安装（Obsidian存储）：**[community.obsidian.md/plugins/hindsight](https://community.obsidian.md/plugins/hindsight)
- **来源：**[向量化-io/后见之明/后见之明-集成/黑曜石](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/obsidian)
- **每种工具都有一个记忆：**[每个AI工具一个记忆](https://hindsight.vectorize.io/blog/2026/04/07/one-memory-for-every-ai-tool)
