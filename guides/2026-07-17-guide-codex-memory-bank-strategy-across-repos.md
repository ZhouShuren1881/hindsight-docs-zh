---
title: "指南：Codex CLI 跨代码库、缺陷和决策的记忆库策略"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, codex, bank-strategy, memory]
description: "使用 Hindsight 为 Codex CLI 按代码库划分记忆库，让各仓库的约定、缺陷历史和工程决策都可检索，同时避免无关项目相互干扰。"
image: /img/guides/guide-codex-memory-bank-strategy-across-repos.svg
hide_table_of_contents: true
---

![指南：Codex CLI 跨代码库、缺陷和决策的记忆库策略](/img/guides/guide-codex-memory-bank-strategy-across-repos.svg)

好的 **Codex 记忆库策略**不是让所有项目都写入一个巨大的编码记忆库。使用 Codex CLI 处理多个代码库后，单一共享记忆库可能在你调试数据库迁移时召回前端应用的样式规则，而真正需要的信息反被淹没。最有效的做法是按代码库划分记忆库：每个仓库都能检索自己的约定、反复出现的缺陷历史和工程决策，同时避免无关项目相互干扰。

本指南讨论的是*如何组织记忆*，而不是如何安装钩子。Codex CLI 已经提供 Hindsight 所需的生命周期入口——在每次提示前召回，在每轮对话后存入——因此关键在于把这些记忆放在哪里。记忆库划分得当，Codex 就能记住某个仓库为何修改了身份验证重试逻辑，而不会连带带入另一个无关仓库的发布细节。

如果还没有安装 Codex 钩子，请先按照 [Codex 配置指南](/guides/2026/05/04/guide-codex-memory-with-hindsight)完成设置，再回来决定如何划分记忆库。工作时可将[文档首页](/)和[快速入门](/developer/api/quickstart)放在手边。

<!-- truncate -->

> **快速解答**
>
> 1. 按照[配置指南](/guides/2026/05/04/guide-codex-memory-with-hindsight)安装 Codex 钩子。
> 2. 启用按代码库划分的记忆库：设置 `dynamicBankId: true` 和 `dynamicBankGranularity: ["agent", "project"]`。
> 3. 存入值得记住的内容——约定、脆弱区域、过往调试记录和决策。
> 4. 仅将固定 `bankId` 的共享记忆库用于跨代码库的团队标准。
> 5. 验证后续会话能否在同一代码库中召回此前存入的内容。

## 编码记忆为何很快就会变得混乱 {#why-coding-memory-gets-messy-fast}

编码对话信息密集，而且重复内容很多。一周之内，你可能会接触多个代码库；每个仓库都有自己的构建系统、测试框架，而且那几个缺陷还会反复出现。如果每一轮对话都存入同一个 `codex` 记忆库，那么每次提示时，Recall 都得从一堆混杂且无关的上下文中筛选。

这种失败表现为嘈杂的召回。你让 Codex 修复 API 仓库中的查询问题，它却因为前端 lint 约定最近刚被存入、相关性评分也足够接近而把它们调了出来。内容本身没有错——这些记忆都是真实的——但另一个仓库的上下文正在争夺召回预算。按记忆库隔离才能让 Recall 保持准确：如果 API 仓库的记忆都放在它自己的记忆库里，那么处理该仓库时，Recall 只会考虑这些内容。

## 每个代码库一个记忆库 {#one-bank-per-repo}

对 Codex 来说，最简单可靠的默认做法是每个代码库对应一个记忆库。Hindsight 通过动态记忆库 ID 直接支持这种方式，因此你无需手动为记忆库命名：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

将配置保存在 `~/.hindsight/codex.json` 中。启用 `dynamicBankId` 后，系统会根据 `dynamicBankGranularity` 中的字段生成记忆库 ID；其中 `"project"` 表示工作目录，`"agent"` 表示智能体名称。因此，分别在 `~/projects/api` 和 `~/projects/frontend` 中运行 Codex 时，记忆会各自存入并从各自的记忆库中召回，不会跨代码库混用。

Hindsight 的记忆库隔离十分严格，数据不会跨记忆库流动。因此，每个代码库都拥有自己的私有记忆，并能跨会话持续保存。明天重新打开同一个仓库时，Codex 就能接着使用该项目此前积累的内容。

## 应该存入哪些内容 {#what-to-retain}

按代码库划分的记忆库是否有用，取决于存入了什么。对编码工作最有价值的内容主要有以下四类：

- **约定**——仓库实际采用的规则，例如“本项目使用 FastAPI 和 asyncpg，而不是 SQLAlchemy”、lint 命令、测试运行器以及分支和发布流程。这些内容最常需要向新会话重新解释。
- **已知脆弱区域**——容易以意料之外的方式出问题的模块、部署前必须运行的迁移，以及超时行为不稳定的端点。记录“此处有坑”可以避免 Codex 重新付出代价才学会这些经验。
- **过往调试记录**——弄清缺陷后，值得保存的是根因经过。缺陷会复发；如果记忆库记得“身份验证 401 是由时钟偏差导致的，采用 X 修复”，再次发生时就能快速召回，而不必从头调查。
- **工程决策**——重试逻辑为何改变、为何选择某个库而不是替代方案，以及重构接受了什么取舍。根据 diff 重建决策成本高，召回则很容易。

默认的 `retainMode` 为 `"full-session"`：完整的会话记录会被存入，Hindsight 再从中提取事实。因此，只要正常工作并让会话结束，上述大部分内容都会被捕获。列出这些类别，是为了说明什么样的会话*有用*——其中确实说清了相关约定或决策。

## 将 Codex 连接到 Hindsight {#connect-codex-to-hindsight}

这是一份策略指南，不是安装教程。完整安装流程涵盖钩子包、连接 Hindsight Cloud 或本地守护进程，以及启用 `codex_hooks`；请参阅 [Codex 配置指南](/guides/2026/05/04/guide-codex-memory-with-hindsight)。先完成设置，再采用下面的记忆库布局。

## 团队代码库共用一个记忆库 {#a-shared-bank-for-team-repos}

默认应按代码库隔离，但有些知识确实适用于多个仓库。团队标准——组织的提交约定、共享 CI 流水线、安全评审要求以及所有项目都依赖的内部库——适合放在同一个位置，让每个仓库中的 Codex 会话都能用到。

此时应使用固定记忆库，而不是动态记忆库。关闭 `dynamicBankId`，并为共享记忆库设置稳定的 `bankId`：

```json
{
  "dynamicBankId": false,
  "bankId": "team-standards"
}
```

一种实用布局是：日常工作使用按代码库划分的记忆库，必须在所有项目中通用的约定则放在一个共享记忆库中。指向相同 `bankId` 的 Hindsight 集成会共用记忆库，因此一位队友通过 Codex 存入某项标准后，使用同一共享记忆库的其他队友也能召回它。

## 避免把所有内容都塞进一个通用记忆库 {#avoid-one-all-purpose-bank}

最诱人的捷径是保留默认的单一 `codex` 记忆库，从此不再考虑这件事。项目少时似乎可行，但随着更多代码库写入同一个记忆库，每次 Recall 都要与无关上下文竞争，召回结果也越来越难以信任。

如果 Recall 开始返回错误项目的细节，这就说明该拆分了。启用 `dynamicBankId`，按代码库隔离；同时为真正跨项目通用的标准保留一个具名共享记忆库。只有确实适用于全局的个人习惯才适合放在一个共享所有内容的记忆库中；若你维护的是一组彼此独立的代码库，就不适合这样做。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

记忆库布局是否有效，要看记忆能否始终限定在其来源代码库内。可以按以下顺序测试：

1. 在一个代码库中，让 Codex 记录一项约定或决策，例如偏好的 lint 命令，或添加重试逻辑的原因。
2. 结束会话，让系统存入会话记录。
3. 在**同一个**代码库中启动新的 Codex 会话，并询问该决策。应该能召回相关内容。
4. 然后在**另一个**代码库中运行 Codex，并询问同一个问题。使用按代码库划分的记忆库时，它*不应该*返回第一个代码库的答案。

如果第 3 步能召回，而第 4 步没有串入其他项目的内容，说明隔离正常。如果第 3 步没有召回，请确认两次运行生成的记忆库 ID 相同；如果第 4 步发生泄漏，请检查是否确实启用了 `dynamicBankId`。测试期间，`retainEveryNTurns` 的默认值是 `10`，可以临时将其设为 `1`，以便每轮都触发存入。

## 常见错误 {#common-mistakes}

### 所有内容都放在一个记忆库中 {#leaving-everything-on-one-bank}

默认 `bankId` 为 `codex`；除非启用 `dynamicBankId`，否则所有代码库都会共用它。如果一直不拆分，项目超过几个后，跨代码库的嘈杂召回就会越来越明显。

### 把团队标准放进按代码库划分的记忆库 {#putting-team-standards-in-a-per-repo-bank}

某项约定如果应该适用于所有项目，却只存在于一个代码库的记忆库中，就失去了应有的价值。跨项目通用的标准应放进固定的共享 `bankId`。

### 期待一个代码库召回另一个代码库的上下文 {#expecting-one-repo-to-recall-anothers-context}

记忆库隔离十分严格。按代码库划分的记忆库是有意设为私有的；不要期待 API 仓库召回前端仓库的决策。这种隔离正是其作用所在。

### 会话结束前就测试存入效果 {#testing-retain-before-a-session-ends}

当 `retainMode` 设为 `"full-session"` 时，系统会按会话存入完整记录。如果在会话中途或轮数还不够时检查 Recall，记忆可能尚未存入——测试时应调低 `retainEveryNTurns`。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器或本地 `hindsight-embed` 守护进程都可以采用同样的方式。无论后端是哪一种，记忆库策略都相同；连接方式请参阅[配置指南](/guides/2026/05/04/guide-codex-memory-with-hindsight)。

### 按代码库划分记忆库，还是使用一个共享记忆库？ {#per-repo-banks-or-one-shared-bank}

日常编码使用按代码库划分的记忆库，确保项目彼此隔离。对于必须适用于所有代码库的标准，再增加一个固定的共享记忆库。

### 按代码库划分的记忆库如何命名？ {#how-are-per-repo-banks-named}

启用 `dynamicBankId` 后，Hindsight 会根据 `dynamicBankGranularity` 中的字段生成记忆库 ID。默认使用智能体名称和工作目录，因此每个项目目录都会自动获得自己的记忆库。

### 哪些内容不值得存入？ {#what-should-i-not-bother-retaining}

临时草稿和一次性命令通常不值得占用召回预算。重点记录约定、脆弱区域、根因调试结果和决策——也就是你原本需要向每个新会话重新解释的上下文。

## 后续步骤 {#next-steps}

- 先按照 [Codex 配置指南](/guides/2026/05/04/guide-codex-memory-with-hindsight)安装钩子。
- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整的 Hindsight 文档](/)。
- 阅读[快速入门指南](/developer/api/quickstart)。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [Codex 集成文档](/sdks/integrations/codex)。
