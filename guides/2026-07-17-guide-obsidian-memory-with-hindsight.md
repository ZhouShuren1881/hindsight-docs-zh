---
title: "指南：使用 Hindsight 为 Obsidian 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, obsidian, knowledge, memory]
description: "将 Obsidian 库同步到 Hindsight 记忆库，并与基于笔记回答问题的智能体聊天；每个答案都会引用其来源笔记。"
image: /img/guides/guide-obsidian-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Obsidian 添加记忆](/img/guides/guide-obsidian-memory-with-hindsight.svg)

如果你想让 **Obsidian 拥有 Hindsight 记忆**，可以为 Obsidian 安装 Hindsight 插件。它会将你的库同步到 Hindsight 记忆库，并添加一个聊天面板，让回答以笔记为依据并引用来源。这样一来，智能体就能真正了解你的库，而不是只能做纯文本搜索；它还可以跨笔记推理，并随着库的增长持续综合已有知识。

这种方式很适合 Obsidian，因为你的知识本来就存放在那里。同步是单向的，从 Obsidian 到 Hindsight，因此 Obsidian 库仍是权威来源。每个答案都会引用来源笔记，方便你从源头修正内容；默认情况下，聊天对话不会被存储。编辑笔记后，Hindsight 会在下一次同步时重新与之保持一致，不会成为第二个事实来源。

本指南将逐步介绍如何安装插件、将插件连接到 Hindsight 后端、了解库同步和范围限定的工作方式，以及如何快速验证聊天是否以笔记为依据。操作时，请将[文档首页](/)和[快速入门指南](/developer/api/quickstart)放在手边。

<!-- truncate -->

> **快速解答**
>
> 1. 通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 从仓库 `vectorize-io/hindsight-obsidian` 安装插件，然后在 **设置 → 社区插件** 中启用。
> 2. 打开 **设置 → Hindsight**，填写 **API URL** 和 **API key**（使用 Cloud 时），或者将 API URL 指向自托管服务器。
> 3. 运行 **Sync vault now（立即同步库）**，将笔记作为 Hindsight 文档摄取。
> 4. 打开聊天面板并提问，获得以笔记为依据且附有引用的回答。
> 5. 检查答案是否引用了实际记载该事实的笔记。

## 开始前的准备 {#prerequisites}

开始之前，请确认你已准备好：

- 已安装 Obsidian，且已有一个库
- 可用于安装测试版插件的 [BRAT](https://github.com/TfTHacker/obsidian42-brat)
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管服务器

## 第一步：安装插件 {#step-1-install-the-plugin}

插件处于测试阶段时，请通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装。添加仓库 [`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian)——这是 BRAT 用来安装插件的专用仓库——然后在 **设置 → 社区插件** 中启用插件。

如果你想自托管 Hindsight 而不使用 Cloud，可以运行本地服务器：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

## 第二步：将插件连接到 Hindsight {#step-2-point-the-plugin-at-hindsight}

打开 **设置 → Hindsight** 并配置连接：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| API URL | `https://api.hindsight.vectorize.io` | Hindsight 服务器；自托管时可使用 `http://localhost:8888` |
| API key | — | Hindsight Cloud API 密钥 |
| 记忆库名称 | `obsidian` | 所有库共用的记忆库，各库通过 `vault:` 标签区分 |
| 包含/排除文件夹 | — | 限定要同步的笔记范围 |
| 编辑时同步 | 开启 | 编辑笔记时自动重新摄取 |
| 默认聊天深度 | `low` | 聊天回答使用的 Reflect（反思）推理预算 |
| 记住对话 | **关闭** | 开启后，聊天轮次会存储在 Hindsight 中（会在 Obsidian 库之外创建记忆） |

使用 Hindsight Cloud 时，保留默认 API URL 并粘贴 API 密钥。自托管时，将 API URL 设为 `http://localhost:8888`（或你的服务器地址）。

## 第三步：同步库 {#step-3-sync-your-vault}

运行 **Sync vault now（立即同步库）** 命令执行完整协调：摄取有更改的笔记，并清理已删除笔记对应的文档。另有两个命令可用：

- **Sync vault now（立即同步库）**：完整协调（摄取有更改的笔记，清理已删除笔记）。
- **Ingest current note（摄取当前笔记）**：强制同步当前活动笔记。
- **Open chat（打开聊天）**：打开基于记忆的聊天面板。

保持 **Sync on edit（编辑时同步）** 开启后，笔记会在编辑时自动重新摄取，因此通常不必手动同步。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

该插件围绕 Obsidian 提供的两个部分工作：笔记和聊天面板。

- **同步（库 → Hindsight）：** 每篇笔记都会成为一份 Hindsight 文档。编辑笔记会执行新增或更新，删除笔记会移除对应文档；内容哈希用于跳过未更改的笔记。本地索引会记录笔记路径及其内容哈希，因此只有发生更改的笔记才会重新摄取。
- **基于记忆库的聊天：** 侧边面板通过 Reflect 针对笔记回答问题。回答带有可折叠的引用，点击即可打开来源笔记；推理过程说明还会展示每一步查询了什么。

由于同步是单向的，Obsidian 库仍是事实来源。每个答案都会引用来源笔记，方便你从源头修正内容；聊天对话默认不会存储。编辑笔记后，Hindsight 会在下一次同步时重新与之保持一致。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall（召回）API](/developer/api/recall) 和 [Hindsight 的 Retain（存入）API](/developer/api/retain)。

## 隐式范围限定 {#implicit-scoping}

摄取笔记时，插件会自动为每篇笔记添加其所属的 **库**、**文件夹**（包括子文件夹）以及**创建/更新时间**标签。只有在 Recall（召回）时，你才需要考虑范围；届时可通过 Hindsight 的 `tag_groups` 任意组合筛选条件。多个库共用一个记忆库，并通过各自的 `vault:` 标签保持区分。

无论在界面中操作还是调用 API，Recall（召回）和 Reflect（反思）都可以按以下任意维度组合筛选：

| 维度 | 标签 |
| --- | --- |
| 库 | `vault:<name>` |
| 文件夹（及其上级文件夹） | `folder:Work`、`folder:Work/Clients` |
| 日期 | `created:2026-03`、`updated:2026-06` |

你自己的 frontmatter `tags` 和 `aliases` 也会保留。聊天面板和外部自动化使用相同标签访问同一个记忆库，因此看到的范围视图也相同。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤测试：

1. 运行 **Sync vault now（立即同步库）**，确保笔记已摄取。
2. 打开聊天面板。
3. 提出一个答案记录在特定笔记中的问题。
4. 检查回答是否以记忆为依据，并列出所用笔记。
5. 点击引用，确认打开的是正确的来源笔记。

例如：

- 询问某篇笔记中记录的决定或约定。
- 确认引用的笔记确实包含相关内容。

如果回答给出了相关事实，并引用了正确的笔记，说明配置已正常工作。

## 常见错误 {#common-mistakes}

### 以为同步是双向的 {#expecting-a-two-way-sync}

同步方向只有 Obsidian → Hindsight。Obsidian 库是权威来源，因此请在笔记中修正内容，而不要在 Hindsight 中修改。

### 聊天前没有同步 {#not-syncing-before-you-chat}

聊天面板只会根据已摄取的内容作答。运行 **Sync vault now（立即同步库）**，或保持 **Sync on edit（编辑时同步）** 开启，让记忆库反映当前笔记内容。

### 以为对话默认会存储 {#expecting-stored-conversations-by-default}

**Remember conversations（记住对话）** 默认关闭。只有希望将聊天轮次存储在 Hindsight 中时才开启；这会在 Obsidian 库之外创建记忆。

### 以为不同库使用彼此隔离的记忆库 {#assuming-vaults-are-isolated-banks}

多个库默认共用一个记忆库，并通过各自的 `vault:` 标签区分。只想查看单个库的内容时，可按 `vault:<name>` 筛选。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：通过 `pip install hindsight-all` 安装，运行 `hindsight-api`，再将插件的 API URL 指向该服务器（例如 `http://localhost:8888`）。

### Hindsight 会成为笔记的第二份副本吗？ {#does-hindsight-become-a-second-copy-of-my-notes}

不会。同步是单向的，Obsidian 库仍是事实来源。每个答案都会引用来源笔记，方便你从源头修正内容；Hindsight 会在下一次同步时重新与之保持一致。

### 我的库如何限定范围？ {#how-is-my-vault-scoped}

每篇笔记都会自动添加所属库、文件夹（及其上级文件夹）和创建/更新时间标签，因此你可以按任意组合筛选 Recall 和 Reflect。

### 聊天对话会被存储吗？ {#are-my-chat-conversations-stored}

默认不会。除非你主动开启，否则 **Remember conversations（记住对话）**处于关闭状态。

## 后续步骤 {#next-steps}

- 想使用托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 查看[快速入门指南](/developer/api/quickstart)。
- 查看 [Hindsight 的 Recall API](/developer/api/recall)。
- 查看 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [Obsidian 集成文档](/sdks/integrations/obsidian)。
