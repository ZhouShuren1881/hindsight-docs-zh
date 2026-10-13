---
title: "在 Hindsight 新列表视图中使用心智模型标签"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [mental-models, tags, control-plane, guide]
description: "结合新列表视图、服务端标签建议及更安全的筛选，在 Hindsight 刷新和反思工作流中使用心智模型标签。"
image: /img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp
hide_table_of_contents: true
---

![在 Hindsight 新列表视图中使用心智模型标签](/img/guides/guide-use-mental-model-tags-in-hindsight-list-view.webp)

**在 Hindsight 新列表视图中使用心智模型标签**时，重要变化是控制平面将心智模型视为实际工作文档。页面默认采用分栏列表，标签建议来自真实心智模型标签来源，无需手动记住标签。可参考[心智模型 API 文档](/developer/api/mental-models)、[反思文档](/developer/api/reflect)、[观察文档](/developer/observations)和[文档首页](https://hindsight.vectorize.io)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 心智模型默认以列表视图打开，旧卡片仪表盘仍为次要视图。
- 标签建议来自新心智模型标签来源，筛选基于模型实际使用的标签。
- 标签同时影响刷新输入和反思可见性，因此筛选并非只改外观。

## 新列表视图改变什么 {#what-the-new-list-view-changes}

心智模型是长期运维文档，不只是仪表盘卡片，因此列表更适合作默认。一栏浏览名称、来源查询和刷新状态，另一栏查看内容。

这虽小，却解决真实流程问题：维护多个心智模型时，卡片网格适合浏览，列表适合实际维护。更新保留两者，但首先显示维护视图。

## 使用实际建议按标签筛选 {#filter-by-tags-with-real-suggestions}

新标签建议直接查询心智模型标签来源，使 UI 推荐模型标签，而非普通记忆标签。

底层端点形式如下：

```bash
curl "$BASE_URL/v1/default/banks/$BANK_ID/tags?source=mental_models"
```

一个记忆库有大量普通标签，却只有少量模型标签时，正需要这种区分。

## 记住心智模型标签的实际作用 {#remember-what-mental-model-tags-actually-do}

标签不只是浏览标记。[心智模型 API 文档](/developer/api/mental-models)说明，它限制刷新期间可读记忆，也影响[反思](/developer/api/reflect)期间可见的心智模型。

模型标记为 `user:alice` 时，刷新只读取也带此必需标签的记忆。这适合限定范围，但标签过严且底层记忆未补齐时，模型可能显得空或过时。

## 有意识地选择 any 或 all {#use-any-vs-all-deliberately}

控制平面支持带匹配模式的标签筛选：

- 浏览、快速找相关模型时，使用 **any**。
- 调试精确范围、只看匹配全部标签的模型时，使用 **all**。

筛选列表突然过小时，先从 **all** 切回 **any**，再检查模型标签是否比预期读取的记忆更严格。

## 排查空结果或误导结果 {#troubleshoot-empty-or-misleading-results}

常见情况：

- **模型存在但内容为空。**通常是模型标签比可用记忆更严格。
- **需要的标签从不出现。**通常尚无模型带此标签，即使普通记忆有。
- **反思似乎遗漏模型。**通常请求标签与模型自身标签不重叠。

不确定时，回看[心智模型 API 文档](/developer/api/mental-models)和[观察指南](/developer/observations)。多数困惑实际是标签范围问题。

## 常见问题 {#faq}

### 仪表盘视图消失了吗？ {#is-the-dashboard-view-gone}

没有。仪表盘仍存在，列表更适合日常维护，因此改为默认。

### 为什么心智模型标签建议需要独立来源？ {#why-do-mental-model-tag-suggestions-need-a-separate-source}

记忆标签和模型标签解决不同浏览问题。建议来自实际筛选的心智模型表时更有用。

### 标签能让模型在反思中不可见吗？ {#can-a-tag-make-a-mental-model-disappear-from-reflect}

能。反思可见性也按标签筛选，请求与模型标签不匹配可能隐藏模型。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [心智模型 API 文档](/developer/api/mental-models)
- [反思文档](/developer/api/reflect)
- [观察指南](/developer/observations)
- [文档首页](https://hindsight.vectorize.io)
