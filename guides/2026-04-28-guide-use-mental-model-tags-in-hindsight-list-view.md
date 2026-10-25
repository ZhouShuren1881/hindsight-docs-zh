---
title: "在 Hindsight 新版列表视图中使用心智模型标签"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [mental-models, tags, control-plane, guide]
description: "借助新版列表视图、服务端标签建议和更安全的筛选，在 Hindsight 的刷新与反思工作流中使用心智模型标签。"
image: /img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp
hide_table_of_contents: true
---

![在 Hindsight 新版列表视图中使用心智模型标签](/img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp)

如果你想在 Hindsight 新版列表视图中**使用心智模型标签**，最重要的变化是：控制平面现在将心智模型视为真正用于日常工作的文档。页面默认显示分栏列表，标签建议也来自实际的心智模型标签来源，不必再靠记忆手动输入标签。调整工作流时，可以随时查阅[心智模型 API 文档](/developer/api/mental-models)、[反思文档](/developer/api/reflect)、[观测文档](/developer/observations)和[文档首页](/)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 心智模型现在默认以列表视图打开，旧版卡片仪表盘仍可作为次要视图使用。
- 标签建议从新的心智模型标签来源获取，因此筛选依据的是模型实际使用的标签。
- 心智模型标签会影响刷新输入和反思时的可见性，所以筛选不只是外观上的变化。

## 新版列表视图带来哪些变化 {#what-the-new-list-view-changes}

列表视图更适合作为默认视图，因为心智模型是需要长期维护的运维文档，而不只是仪表盘卡片。你可以在一个窗格中浏览名称、来源查询和刷新状态，再在另一个窗格中查看内容。

这看起来只是小改动，却解决了实际工作流中的问题。维护一个包含多个心智模型的记忆库时，卡片网格便于浏览，列表则更适合实际维护。这次更新保留了两种视图，但会首先打开维护视图。

## 使用真实建议筛选标签 {#filter-by-tags-with-real-suggestions}

新的标签建议路径很有用，因为它会直接查询心智模型标签来源。这样一来，UI 可以推荐心智模型使用的标签，而不是普通记忆使用的标签。

如果要查看底层端点的形式，可以参考：

```bash
curl "$BASE_URL/v1/default/banks/$BANK_ID/tags?source=mental_models"
```

当一个记忆库有许多普通记忆标签，却只有少数标签附加在心智模型上时，这种区分正是你需要的。

## 了解心智模型标签的实际作用 {#remember-what-mental-model-tags-actually-do}

这一点很容易让人困惑：心智模型标签不只是用于浏览的标记。[心智模型 API 文档](/developer/api/mental-models)说明，标签会缩小模型刷新期间可读取的记忆范围，也会影响 [Reflect（反思）](/developer/api/reflect)期间哪些心智模型可见。

例如，给心智模型添加 `user:alice` 标签后，刷新时只会读取同样带有这一必需标签的记忆。这样可以限定模型范围；但如果标签加得过多，而底层记忆从未补上相应标签，模型看起来就可能是空的或内容待更新。

## 有意选择 any 或 all {#use-any-vs-all-deliberately}

控制平面现在支持使用匹配模式筛选标签。实际使用时，可以采用以下两种方式：

- 浏览并快速查找相关心智模型时，使用 **any**。
- 调试精确范围、只查看匹配整个标签集合的模型时，使用 **all**。

如果筛选后的列表突然变得很短，首先可以把 **all** 切换回 **any**。接着检查心智模型自身的标签是否比你预期读取的记忆所带的标签限制更严格。

## 排查空结果或容易误解的结果 {#troubleshoot-empty-or-misleading-results}

以下情况很常见：

- **模型存在，但内容为空。** 通常是模型标签比可用记忆的标签限制更严格。
- **一直看不到需要的标签选项。** 通常是还没有心智模型带有该标签，即使普通记忆已经带有它。
- **Reflect 似乎没有找到某个模型。** 通常是 Reflect 调用使用的标签与模型自身的标签没有交集。

不确定时，可以回头查阅[心智模型 API 文档](/developer/api/mental-models)和[观测指南](/developer/observations)。大多数关于心智模型的困惑，归根结底都是标签范围问题。

## 常见问题 {#faq}

### 仪表盘视图取消了吗？ {#is-the-dashboard-view-gone}

没有。仪表盘仍然可用。这次更新将列表视图设为默认视图，因为它更适合日常维护。

### 为什么心智模型标签建议需要单独的数据来源？ {#why-do-mental-model-tag-suggestions-need-a-separate-source}

因为记忆标签和心智模型标签解决的是不同的浏览问题。建议直接来自当前正在筛选的心智模型表时，会实用得多。

### 标签会让反思时看不到某个心智模型吗？ {#can-a-tag-make-a-mental-model-disappear-from-reflect}

会。反思时也会按标签筛选可见的心智模型，因此请求标签与模型标签不匹配时，模型可能会被隐藏。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [心智模型 API 文档](/developer/api/mental-models)
- [反思文档](/developer/api/reflect)
- [观测指南](/developer/observations)
- [文档首页](/)
