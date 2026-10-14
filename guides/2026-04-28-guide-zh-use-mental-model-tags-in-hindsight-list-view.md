---
title: "在 Hindsight 的新列表视图中使用心智模型标签"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [mental-models, tags, control-plane, guide]
description: "介绍如何在 Hindsight 的新列表视图中使用心智模型标签、服务器端标签建议，以及如何更安全地筛选刷新和反思工作流。"
image: /img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp
hide_table_of_contents: true
---

![在 Hindsight 的新列表视图中使用心智模型标签](/img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp)

如果您想**在 Hindsight 的新列表视图中使用心智模型标签**，主要变化是控制平面现在把心智模型视为真正用于工作的文档。页面默认显示分栏列表，标签建议也改为从实际的心智模型标签来源获取，您不必再靠记忆手动输入标签。调整工作流时，可以随时查阅[心智模型 API 文档](/developer/api/mental-models)、[反思文档](/developer/api/reflect)、[观测文档](/developer/observations)和[文档首页](https://hindsight.vectorize.io)。

<!-- truncate -->

## 快速了解 {#the-quick-answer}

- 心智模型现在默认以列表视图打开，原来的卡片仪表板仍可作为辅助视图使用。
- 标签建议从新的心智模型标签来源获取，因此筛选依据是模型实际使用的标签。
- 心智模型标签会影响刷新时读取的内容和反思时的可见范围，所以筛选不只是界面上的装饰。

## 新列表视图带来的变化 {#what-the-new-list-view-changes}

列表视图更适合作为默认视图，因为心智模型是长期使用的操作文档，而不只是仪表板卡片。您可以在一个窗格中浏览名称、来源查询和刷新状态，再在另一个窗格中查看内容。

这看起来只是小改动，却解决了实际工作流中的问题。维护包含多个心智模型的记忆库时，卡片网格适合浏览，列表则更适合实际维护。这次更新保留了两种视图，同时让您首先进入维护视图。

## 根据实际建议按标签筛选 {#filter-by-tags-with-real-suggestions}

新的标签建议来源很重要，因为它会直接查询心智模型标签来源。实际效果是，界面可以从心智模型中建议标签，而不是从普通记忆中建议标签。

如果您想查看底层端点的形式，可以参考：

```bash
curl "$BASE_URL/v1/default/banks/$BANK_ID/tags?source=mental_models"
```

当一个记忆库中有许多普通记忆标签、但只有少量标签附加在心智模型上时，这种区分正是您需要的。

## 了解心智模型标签的实际作用 {#remember-what-mental-model-tags-actually-do}

这一点很容易让人混淆。心智模型标签不只是用于浏览的标签。正如[心智模型 API 文档](/developer/api/mental-models)所述，标签会限定模型在刷新期间可以读取哪些记忆，也会影响[反思](/developer/api/reflect)期间哪些心智模型可见。

例如，如果您给心智模型添加 `user:alice` 标签，刷新时只会读取同样带有这个必需标签的记忆。若您希望模型的范围受到限定，这很有用；但如果底层记忆从未补录该标签，添加过多标签也可能让模型看起来没有内容或处于待更新状态。

## 有意识地选择 any 或 all {#use-any-vs-all-deliberately}

控制平面现在支持按匹配模式筛选标签。实际使用时，可以采用以下两种方式：

- 浏览并快速查找相关心智模型时使用 **any（任一）**。
- 排查精确范围问题、只想查看匹配整个标签集的模型时使用 **all（全部）**。

如果筛选后的列表突然变得很短，首先可以尝试从 **all（全部）** 切换回 **any（任一）**。其次，检查心智模型自身的标签是否比您预期它读取的记忆所带的标签更严格。

## 排查空结果或误导性结果 {#troubleshoot-empty-or-misleading-results}

以下情况很常见：

- **模型存在，但内容为空。** 通常是因为模型的标签范围比现有记忆更严格。
- **找不到想要的标签选项。** 通常是因为目前还没有心智模型带有该标签，即使普通记忆带有它也是如此。
- **反思似乎没有找到该模型。** 通常是因为反思调用所用的标签与模型自身的标签没有交集。

遇到疑问时，可以回头查看[心智模型 API 文档](/developer/api/mental-models)和[观测指南](/developer/observations)。大多数心智模型问题，归根结底都是标签范围问题。

## 常见问题 {#faq}

### 仪表板视图取消了吗？ {#is-the-dashboard-view-gone}

没有，仪表板视图仍然保留。这次更新将列表视图设为默认视图，因为它更适合日常维护。

### 为什么心智模型标签建议需要单独的来源？ {#why-do-mental-model-tag-suggestions-need-a-separate-source}

因为记忆标签和心智模型标签解决的是不同的浏览需求。建议来自您实际筛选的心智模型表时，会更有用。

### 标签会让心智模型在反思中不可见吗？ {#can-a-tag-make-a-mental-model-disappear-from-reflect}

会。反思时的可见性也受标签筛选，因此请求标签与模型标签不匹配时，模型可能会被隐藏。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [心智模型 API 文档](/developer/api/mental-models)
- [反思文档](/developer/api/reflect)
- [观测指南](/developer/observations)
- [文档首页](https://hindsight.vectorize.io)
