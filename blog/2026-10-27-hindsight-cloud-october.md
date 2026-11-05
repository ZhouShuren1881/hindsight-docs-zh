---
title: "Hindsight Cloud 更新：API 如今是一项承诺"
authors: [benfrank241]
slug: "2026/10/27/hindsight-cloud-october"
date: 2026-10-27T15:00
tags: [hindsight-cloud, release, memlake, reflect]
description: "Hindsight 发布 1.0，Cloud 的大部分服务迁移到新存储引擎，记忆库文档现可通过 zip 导入导出，Reflect 也能展示推理依据。"
image: /img/blog/hindsight-cloud-october.webp
hide_table_of_contents: true
---

import { StaticImage } from '@site/src/components/StaticMedia';

<StaticImage alt="Hindsight Cloud 更新：Hindsight 1.0、底层的 Memlake、文档导入和 Reflect 的证据面板" src="/img/blog/hindsight-cloud-october.webp" />

过去五周里，Hindsight Cloud 最重要的变化在控制台中看不到，而这正是它的意义所在。

Hindsight 发布了 **1.0**。经过一年的生产环境运行，架构和 API 已经稳定；从现在起，API 就是一项承诺：随着 Hindsight 不断发展，你基于 Hindsight Cloud 构建的应用会继续正常运行。你的代码、SDK 和 MCP 设置都无需更改。这就是公告的全部内容；如果你正基于我们的产品交付应用，这也是最重要的消息。

在底层，还有许多变化。下面是其余更新。

<!-- truncate -->

## 简要概览 {#tldr}

- **Hindsight 1.0。** API 已经稳定，并将保持稳定。
- **Cloud 的大部分服务现已运行在 Memlake 上。** 这是一个新的存储引擎，无需手动启用。
- **记忆库文档可以双向迁移。** 导出为 zip 后，可以导入原记忆库或其他记忆库，导入费率低于 Retain 费率。
- **Reflect 展示推理依据**，还能将手册排在闲聊内容之前。
- **一个记忆库可以使用多个名称。**
- **成员可以批准 AI 客户端**，连接也会在访问权限终止时失效。

## Cloud 的大部分服务现已运行在 Memlake 上 {#memlake-runs-most-of-cloud-now}

[Hindsight Memlake](/blog/2026/10/13/memlake) 是一个用 Rust 编写的智能体记忆新存储引擎，它将记忆保存在对象存储中。它可服务 1 亿条记忆，p99 延迟低于 100 ms，而且每次写入都在确认成功之前实现持久化。

Hindsight Cloud 的大部分服务已经运行在 Memlake 上。它由 Vectorize 运营，因此无需启用功能、安排迁移或查找设置。如果你想了解它的工作原理，可以阅读发布文章；[Memlake 文档](https://docs.hindsight.vectorize.io/enterprise/memlake)介绍了如何通过 Hindsight Enterprise 在自己的云环境或数据中心运行它。

这类变化通常体现在一些问题的消失上：大型记忆库的慢查询更少，也有了无需你操心的扩展余量。

## 记忆库文档可以双向迁移 {#a-banks-documents-travel-both-ways}

导出功能早已支持将记忆库文档打包为 zip。现在，你也可以将它导入。

由 **Export** 生成的 `.zip` 压缩包，无论来自同一个记忆库还是其他记忆库，都可以导入记忆库的 **Documents** 视图。文档及从中提取的记忆会被添加进来，无需重新提取事实：系统会在导入的目标记忆库中重新生成事实的嵌入向量并重建关联。你可以用它恢复备份，或将文档从一个记忆库复制到另一个记忆库。

你将看到：

- 记忆库的 **Documents** 视图中，**Export** 旁边有一个 **Import from zip** 操作，供组织所有者和管理员使用
- 对于已存在的文档，可以选择跳过、替换或同时保留两份
- 确认前会显示你所在组织的导入费率

**这比重新存入相同内容更便宜。** 导入按文档内容每百万 token 收费，使用导入费率。由于不运行事实提取，导入费率低于标准 Retain 费率，且绝不会高于你所在组织的 Retain 费率。该费率显示在 Billing 页面的 **Pricing** 卡片的 **Retain** 项下。

## Reflect 展示推理依据 {#reflect-shows-its-work}

两项变化让 Reflect 的答案更容易获得信任。

**Based On** 面板现在会显示答案引用的观测及其完整文本，以及附在证据上的图片和文件。你可以直接看到答案所依据的内容，无需自行推断。

Reflect 现在还会读取每篇文档的**自身元数据**。如果你在存入文档时用元数据标明其来源，例如用 `{"doc_type": "kb"}` 标记已发布的文章，用 `{"doc_type": "ticket"}` 标记支持讨论，那么记忆库的任务说明就可以告诉 Reflect 如何权衡这些来源：优先考虑手册而非闲聊内容，除非有更新、更权威的信息推翻手册。此前，即使这些信息就在文档中，Reflect 也无法看到这种区别。

## 一个记忆库可以使用多个名称 {#a-bank-answers-to-more-than-one-name}

为记忆库添加**别名**后，发往任一 ID 的请求都会访问同一批记忆。将别名提升为主名称后，记忆库在各处都会**显示为**该名称，而底层仍使用原始 ID。

这样重命名就很轻松：让新客户端使用新名称，现有客户端仍可使用旧名称，无需停机或迁移任何内容。限定到某个记忆库的 API 密钥也适用于该记忆库的别名。所有者和管理员可以在记忆库的 **Configuration** 选项卡上管理别名。

## 谁可以连接 AI 客户端 {#who-can-connect-an-ai-client}

过去，只有所有者和管理员可以批准 AI 客户端。现在，组织所有者可以依次打开 **Settings** 和 **Connected AI clients (MCP)**，允许普通**成员**也批准 MCP 连接。

连接现在也会随访问权限变化而调整。当某人离开组织，或失去允许其建立连接的角色时，其连接会被撤销，不会继续默默运行。

## 在大型记忆库中查找内容 {#finding-things-in-a-large-bank}

还有一系列较小的新增功能，目的是只读取记忆库中的一部分内容，而非全部内容：

- Documents 列表新增**时间筛选器**，支持预设或自定义范围，并新增**标签筛选器**
- **知识库和实体的标签筛选器。** 知识库目录树和搜索，以及实体列表、详情和图谱，现在都支持 Recall 使用的相同 `tags` 和 `tags_match` 筛选条件，因此你可以只显示某个用户、团队或主题对应的页面和实体
- 每条记忆的详情中显示文档**元数据**
- 知识库页面的高级**搜索对话框**
- 记忆库统计信息中新增因果链接，星座图新增暂停、动态效果和 SVG 导出功能

记忆和文档 API 现在也支持在服务端按时间筛选和排序，因此客户端不再需要获取一页数据后自行排序。

## 了解更多 {#learn-more}

- [Hindsight Memlake](/blog/2026/10/13/memlake)：了解 Cloud 大部分服务所使用的存储引擎
- [Hindsight Cloud 更新日志](https://docs.hindsight.vectorize.io/cloud/whats-new)：查看持续更新的列表，每一项均标有日期
- [账单说明](https://docs.hindsight.vectorize.io/cloud/billing)：了解导入费率和定价卡片的其他内容
- [Hindsight Cloud 更新：能够读取截图的记忆](/blog/2026/09/21/hindsight-cloud-0-10-0)：查看上一篇更新汇总
