---
title: "与你的 Obsidian 库对话：有依据的回答会引用笔记"
authors: [benfrank241]
slug: "2026/06/16/obsidian-persistent-memory"
date: 2026-06-16T12:00
tags: [obsidian, memory, persistent-memory, hindsight, second-brain, knowledge-management, tutorial]
description: "为 Obsidian 库配备真正了解你笔记的 AI 智能体。Hindsight 插件会将库同步到记忆库，并添加一个聊天面板；回答以你的笔记为依据并引用来源，而你的库仍是唯一事实来源。"
image: /img/blog/obsidian-persistent-memory.webp
hide_table_of_contents: true
---

![使用 Hindsight 的 Obsidian 持久记忆](/img/blog/obsidian-persistent-memory.webp)

[Obsidian](https://obsidian.md) 是许多人整理思路的地方。这里积累着多年的笔记、会议记录、研究资料和未完成的想法。问题在于，库一旦变大，就很难再用有用的方式搜索。你记得自己六个月前写过一条关于某项决定的内容，却怎么也找不到那篇笔记。全文检索只能找到词语，找不到想法，更无法综合五篇笔记来回答一个问题。

本文将带你了解 Obsidian 的全新 Hindsight 插件。它会把你的库同步到 Hindsight 记忆库，并添加一个可基于笔记回答问题的聊天面板；每个回答都会**引用其来源笔记**。你的库始终是唯一事实来源，Hindsight 则是在其上运行的推理层。

## 概览 {#tldr}

<!-- truncate -->

- Obsidian 内置的搜索和向量检索插件能找到相关笔记，但无法综合推理整个库，也不会随着库的增长持续维护对整个库内容的摘要。
- Hindsight 插件会**将你的库同步到记忆库**（一篇笔记对应一份文档），并添加一个由 Hindsight `reflect` 支持的**有依据的聊天面板**。
- **每个回答都会引用来源笔记。** 点击引用即可打开笔记。展开推理说明，还能看到每一步查询了什么。
- **你的库是权威来源。** 同步方向只有一个（从 Obsidian 到 Hindsight），而且**默认不存储聊天对话**。Hindsight 不会成为第二个事实来源。
- **自动限定范围：** 每篇笔记都会自动添加库、文件夹和日期标签，无需设置就能将问题限定为“仅限 Work 库”或“本月更新的笔记”。
- 使用 Hindsight Cloud 无需准备基础设施。[免费注册。](https://ui.hindsight.vectorize.io)
- 插件**现已上架 [Obsidian 社区插件商店](https://community.obsidian.md/plugins/hindsight)**，可一键安装。

:::tip 现已上架 Obsidian 社区插件商店
Hindsight 插件**已在 [Obsidian 社区插件商店](https://community.obsidian.md/plugins/hindsight)上架**（撰写本文时为 `v0.1.2`）。你可以直接在 Obsidian 中一键安装，无需手动操作；这也让数百万 Obsidian 用户只需点击一次即可使用 Hindsight。请参阅下文的[安装](#installing)。
:::

## 问题：大型库难以综合推理 {#the-problem-a-big-vault-is-hard-to-reason-over}

小型库很容易管理。几十篇笔记，配合搜索和反向链接，通常就能找到所需内容。麻烦始于库变得足够大、真正有价值的时候，而这恰恰也是它开始变得难用的时候。

向量检索插件能帮上忙：它们会找出与你输入内容在语义上相关的笔记，比关键词匹配更有效。但“给我看相关笔记”不等于“回答我的问题”。如果答案分散在三篇笔记里，相关笔记列表只是把这三篇交给你，综合信息的工作仍要由你完成。整个流程也不会记住你问过什么，或随着时间推移逐渐形成对整个库的认知。

Hindsight 补上了缺少的这一层：

- **Recall（召回）** 比文本搜索更快、更准确。
- **Reflect（反思）** 会基于整个库进行推理来回答问题，并指出用到了哪些笔记。
- **心智模型**（已列入路线图）会持续维护关于你库内容的答案，并在你写入新内容时刷新。

## 事实来源仍在 Obsidian 中 {#source-of-truth-stays-in-obsidian}

这一设计原则决定了其余所有机制，因此先把它说清楚：**Hindsight 绝不会成为第二个事实来源。**

- **同步是单向的。** 数据只从 Obsidian 流向 Hindsight，绝不反向同步。你的库是权威来源；Hindsight 是派生出的索引。
- **每个回答都会引用来源笔记。** 如果内容有误或需要更新，你应在源头的笔记中修正，而不是去某个不透明的记忆存储里修改。
- **默认不存储聊天对话。** 提问不会在库外生成新的记忆。（如果你需要，可以打开相应开关；默认关闭。）
- **编辑笔记后，Hindsight 会在下次同步时重新与其保持一致。** 索引始终跟随库，而不是反过来。

如果你曾遇到某些工具悄悄成为数据的另一份副本，最终与原数据不同步，那么这个设计正是为了解决这类顾虑。

## 工作原理 {#how-it-works}

插件会监视你的库，并将文件事件映射为 Hindsight 操作：

```
新建/编辑笔记        ──▶ retain(documentId = note path)   （插入或更新；替换之前的版本）
重命名笔记            ──▶ deleteDocument(old) + retain(new)
删除笔记              ──▶ deleteDocument(path)
“立即同步库”          ──▶ reconcile：摄取有变更的笔记，清理孤立文档

聊天轮次              ──▶ 对整个记忆库执行 reflect(question)
                          └─ 回答 + 引用（来源笔记）+ 推理过程
```

每篇笔记都会成为一份 Hindsight 文档，并以笔记路径作为 ID。插件还维护一个本地索引，记录笔记路径、内容哈希和修改时间（mtime），因此只有实际发生变化的笔记才会重新摄取。比如，一个有 400 篇笔记的库只改动了一个文件，同步时就只会重新发送这一份文件，而不是全部 400 份。

状态栏和聊天面板标题中始终会显示同步状态，因此同步不会悄无声息地发生。状态可能类似于 `Hindsight ✓ 412 notes · 2m ago`，旁边还有一个刷新按钮；同步时按钮会转动，点击后会触发同步。

## 在聊天中获得有依据的回答和引用 {#grounded-chat-with-citations}

聊天面板是你日常会实际使用的功能。打开侧边栏面板，用自然语言提问，Hindsight 就会在你的记忆库上运行 `reflect`，生成回答。

回答附带的信息让你能够核实它：

- **引用。** 每个回答都会列出检索到的笔记。点击其中一条即可在库中打开来源笔记。如果回答说你在 3 月决定不再使用 Postgres，你可以直接跳转到记录这一决定的笔记进行确认。
- **推理说明。** 展开的视图会显示 Reflect 每一步实际查询了什么，因此回答不是一个黑箱。
- **范围下拉菜单。** 提问栏上方提供库和文件夹下拉菜单，你可以在提问前把问题限定到库的一部分。
- 点击**新建聊天**可开启一个新对话。如果你想查看具体调用过程，可以启用设置中的**调试日志**；它会将确切的 `reflect` 请求和检索到的笔记打印到控制台。

由于回答会指向真实笔记，“AI 自信地编造内容”这一问题就变成了“点击引用并核实”。笔记库就在眼前。

## 自动限定范围：无需设置即可筛选 {#implicit-scoping-filter-without-setup}

每篇笔记在摄取时都会自动添加标签。你无需手动添加；插件会根据笔记所在位置生成标签：

| 维度 | 标签 | 筛选示例 |
| --- | --- | --- |
| 库 | `vault:<name>` | 仅限 Work 库 |
| 文件夹（及其上级文件夹） | `folder:Work`、`folder:Work/Clients` | `Work/` 目录下的全部内容 |
| 日期 | `created:2026-03`、`updated:2026-06` | 本月更新的笔记 |

你在笔记 frontmatter 中填写的 `tags` 和 `aliases` 也会一并保留。这样，平时你无需考虑范围；需要筛选时，再通过 Hindsight 的 `tag_groups` 组合任意条件（库、文件夹和日期）。例如，位于 `Work/Clients/Acme` 的笔记可以通过 `folder:Work`、`folder:Work/Clients` 或库标签进行查找，因为插件也会为文件夹添加其所有上级文件夹的标签。

多个库可以共用一个记忆库，并通过各自的 `vault:` 标签彼此区分。因此，默认记忆库名称为 `obsidian`，且默认启用“为文档 ID 添加前缀”，这样不同库中同名的笔记就不会冲突。

## 同一个记忆库，供界面和 API 共用 {#one-bank-ui-and-api}

有个容易忽略但很重要的细节：聊天面板和外部自动化会访问**同一个带有相同标签的记忆库**。从 Obsidian 同步的库也可以通过 n8n 工作流、[Hermes](https://hindsight.vectorize.io/blog/2026/03/17/hermes-agent-memory) 智能体、直接 API 调用或其他 Hindsight 集成读取；它们看到的范围视图都相同。

这样，你的笔记就不再局限于一个应用。夜间自动化可以针对 `folder:Meetings updated:2026-06` 进行 Reflect，并将摘要发布到 Slack；它使用的正是你在聊天面板中提出相同问题时能够看到的笔记。

## 安装 {#installing}

该插件已上架 **Obsidian 社区插件商店**，可以直接在 Obsidian 中一键安装：

1. 打开**设置 → 社区插件 → 浏览**。
2. 搜索 **Hindsight**，点击**安装**，然后点击**启用**。

> 想在测试版正式上架商店前体验最新版本？你也可以通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 跟踪测试版：添加仓库 [`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian) 即可。

接下来配置 Hindsight。推荐使用 **Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)，获取 API 密钥，再粘贴到**设置 → Hindsight**。无需运行服务器；同步和 Reflect 请求都会发送到 Cloud。

如果更喜欢自托管，可以在本地运行 Hindsight，并将 API URL 设置为你的实例：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

然后在插件设置中将 **API URL** 设为 `http://localhost:8888`。

## 关键设置 {#key-settings}

所有设置都位于**设置 → Hindsight**：

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| API URL | `https://api.hindsight.vectorize.io` | Hindsight 服务器；自托管时使用 `http://localhost:8888`。 |
| API 密钥 | （无） | 你的 Hindsight Cloud 密钥。 |
| 记忆库名称 | `obsidian` | 所有库共用的记忆库，通过 `vault:` 标签区分。 |
| 包含/排除文件夹 | （无） | 限定需要同步的笔记。 |
| 编辑时同步 | 开启 | 编辑笔记时自动重新摄取。 |
| 默认聊天深度 | `low` | 聊天回答使用的 Reflect 预算；遇到更难的问题时可以调高。 |
| 记住对话 | **关闭** | 开启后，聊天轮次会存储在 Hindsight 中（也就是在库之外创建记忆）。 |
| 为文档 ID 添加前缀 | 开启 | 在 ID 前添加库名作为前缀，避免共用记忆库的多个库发生冲突。仅在只使用一个库时才关闭。 |

命令面板还提供三个命令：**立即同步库**（完整协调）、**摄取当前笔记**（强制同步当前活动笔记）和**打开聊天**。

## 权衡 {#tradeoffs}

**同步依赖内容哈希，并非自动保证所有内容都是最新的。** 笔记内容变化时才会重新摄取。如果你希望确保整个库都处于最新状态（例如进行了大量外部编辑，或通过 git pull 更新了库目录），请运行**立即同步库**进行协调，而不要只依赖逐笔编辑触发的同步。

**回答质量会受“默认聊天深度”影响。** 默认值为 `low`，速度快，足以应对大多数查找问题。若问题需要综合许多笔记，可以提高预算；这样会进行更全面的搜索，但成本和延迟也会增加。

**聊天记忆默认由用户选择启用。** “记住对话”默认关闭，这样提问不会在库外悄悄积累状态。如果你希望智能体记住较长工作会话中的上下文，可以开启此项；但要注意，这样创建的记忆并不属于你的笔记。

## 对比 {#recap}

|  | Obsidian 默认功能 | 使用 Hindsight |
| --- | --- | --- |
| 查找笔记 | 全文检索 / 反向链接 | 更快、更准确的语义召回 |
| 综合多篇笔记回答问题 | 自行综合 | Reflect 生成回答并引用笔记 |
| 核实回答 | 不适用 | 每个回答都链接到来源笔记 |
| 事实来源 | 你的库 | 仍是你的库（单向同步） |
| 限定查询范围 | 手动使用搜索运算符 | 自动标签：库 / 文件夹 / 日期 |
| 从自动化访问 | 每个应用各自访问 | n8n、Hermes 和 API 共用同一个记忆库 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Obsidian + Hindsight](/sdks/integrations/obsidian)
- **安装（Obsidian 商店）：**[community.obsidian.md/plugins/hindsight](https://community.obsidian.md/plugins/hindsight)
- **源码：**[vectorize-io/hindsight/hindsight-integrations/obsidian](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/obsidian)
- **让每种工具共用同一份记忆：**[One Memory for Every AI Tool](https://hindsight.vectorize.io/blog/2026/04/07/one-memory-for-every-ai-tool)
