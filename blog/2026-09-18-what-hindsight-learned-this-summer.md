---
title: "这个夏天，Hindsight 学会了什么"
authors: [benfrank241]
slug: "2026/09/18/what-hindsight-learned-this-summer"
date: 2026-09-18T14:00
tags: [hindsight, agent-memory, release, knowledge-pages, coding-agents, roundup]
description: "八周内六个版本，从 0.8.5 到 0.10.0。按可构建的能力梳理 Hindsight 这个夏天最重要的进展。"
image: /img/blog/what-hindsight-learned-this-summer.webp
hide_table_of_contents: true
---

![Hindsight 夏季进展：从 0.8.5 到 0.10.0 的六个版本](/img/blog/what-hindsight-learned-this-summer.webp)

七月下旬至九月中旬，Hindsight 发布 0.8.5、0.8.6、0.9.0、0.9.1、0.9.2 和 0.10.0 六个版本。每版都有发布说明，逐篇阅读很方便，未读全则难掌握全貌。

这里换个视角，按夏季初还没有、现在能实现的能力梳理，而非按版本列变更。

<!-- truncate -->

## 要点 {#tldr}

- **记忆编写自己的文档。** 知识页面将记忆库变成持续更新的 wiki，支持 MCP 和跨实例迁移。
- **所有编程智能体共享记忆。** 一次安装接入 18 种智能体，每仓库共享一个记忆库。
- **记忆能看见。** 图片和文件成为原生存储内容，事实可引用来源截图。
- **记忆可检查。** 查看准确提示词、试运行心智模型刷新，并浏览一个实体的全部知识。
- **记忆理解时间。** 直接为召回指定时间窗口，反思也知道当前日期。
- **运行成本更低。** 批量折扣、提示缓存、按操作配置推理强度，以及更低开销的请求路径。

## 记忆编写自己的文档 {#memory-that-writes-its-own-documentation}

这个夏天最大的想法是 [0.9.0](https://hindsight.vectorize.io/blog/2026/08/07/version-0-9-0) 推出的**知识页面**。

知识页面是记忆库为自身编写并持续更新的文档，回答“我们的错误处理约定是什么？”等单个问题，并随新知识改写。页面像 wiki 一样组成文件夹树，`hindsight fs mount` 将其映射为磁盘真实 Markdown，`ls`、`grep`、编辑器和智能体文件工具都可直接使用。

它超越 wiki 的关键是：页面是投影，不是原始存储。删除也不会丢失知识，因为可从已提取、去重和协调的记忆重建。页面反映*当前*成立的知识，而非保留所有历史矛盾陈述。

两个版本后，[0.9.2](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2) 将知识库变成原生 MCP 能力，七个工具支持浏览、搜索和维护页面，智能体可通过原本存储和召回的连接管理自身 wiki。[0.10.0](https://hindsight.vectorize.io/blog/2026/09/14/version-0-10-0) 又让整个综合层可迁移，整库导出携带知识页面与心智模型，无需另一端重建。

## 所有编程智能体共享记忆 {#one-memory-for-every-coding-agent}

编程智能体插件现可用一条命令接入 **18 种智能体**：

```bash
npx @vectorize-io/hindsight-coding-agents install all
```

Claude Code、Codex CLI、Cursor CLI、GitHub Copilot CLI、opencode、Qwen Code、Cline CLI、Devin CLI 等默认**每仓库共享一个记忆库**。早晨向一个工具解释的内容，下午另一个仍能使用，因为记忆属于项目。

真正修复的大部分信息可从代码推导，但最后一步常依赖代码外的决定，例如舍入规则或重试策略。它们存在于 git 历史和对话中，插件在智能体开始工作时提供这些内容，同时维护架构与约定知识页面。

[九月初新增四种智能体](https://hindsight.vectorize.io/blog/2026/09/02/coding-agents-050-four-new-harnesses)，[编程智能体的知识页面](https://hindsight.vectorize.io/blog/2026/08/13/knowledge-pages-coding-agents)则深入介绍整理层。

## 记忆能看见 {#memory-that-can-see}

0.10.0 之前，支持对话中的截图对记忆不可见，图片里的请求 ID 对智能体等于不存在。

现在 `content` 可为有序文本、图片和文件块。图片按实际位置读取，两段之间的图表仍在两段之间理解。来源按事实关联，召回可返回准确的来源截图，而非分块全部图片。

归属不确定时，提取器被询问事实需要哪张图，无法解析的回答丢弃，不会改成最近图片。没有引用优于错误引用。[完整说明见此](https://hindsight.vectorize.io/blog/2026/09/16/screenshot-agent-memory)。

## 记忆可检查 {#memory-you-can-inspect}

这个夏天反复出现的主题是：减少对记忆实际行为的猜测。

- **消耗 token 前查看提示词。** 0.10.0 预览端点准确返回存储、整合或反思消息，按对应设置拆块，不调用 LLM、不写入。例如可发现存储使命在用户消息而非系统提示词。[详情](https://hindsight.vectorize.io/blog/2026/09/17/prompt-preview)。
- **不修改心智模型也能调试。** 0.9.0 刷新试运行计算下一版本但不持久化，保留读取和决策跟踪。0.9.2 为每次刷新新增类型化结果，内容未变时会明确报告，不声称已写入。
- **按顺序查看实体全部内容。** [0.8.6](https://hindsight.vectorize.io/blog/2026/07/29/version-0-8-6) 新增实体时间线，选择人、公司或项目，从首次提及起查看全部知识。底层使用 API 筛选，自有工具可获得相同视图。

## 记忆理解时间 {#memory-that-understands-time}

两项改动让时间成为明确输入，而不只是从文字推断。

[0.9.1](https://hindsight.vectorize.io/blog/2026/08/14/version-0-9-1) 向 reflect 提供当前日期时间，使“上周”和“最近”有真实时钟基准。

0.9.2 可直接提供有起止边界的 `temporal_window`。过去只能在查询中措辞并希望解析器理解，现在日期选择器或已解析“上季度”的智能体可直接指定范围。也会跳过被替代的日期提取，文档级查询最多可节省约 1.3 秒。

## 运行成本更低 {#memory-that-costs-less-to-run}

这是最不起眼，却可能最有价值的工作。

| 改动 | 版本 | 节省内容 |
|---|---|---|
| Anthropic Message Batches | 0.8.5 | 符合条件的存储与整合任务享 50% token 折扣 |
| Anthropic 提示缓存 | 0.8.5 | 重复提示前缀不再每次全额计费 |
| 按操作配置推理强度 | 0.8.6 | 只在提取等有帮助的操作中支付推理成本 |
| 存储内存预算 | 0.9.2 | 过去 45 MB 文档在提取前就分配 385 MB，现在不同文档大小的占用保持平稳 |
| 纯 ASGI 请求路径 | 0.10.0 | 两个 CPU 的健康检查吞吐从每秒 2,476 提升至 7,917 |
| 无需生成 ID 的 token 计数 | 0.10.0 | 一次召回的计数阶段从 34.2 ms 降至 5.0 ms |

这些不改变记住什么，而改变记忆成本，使用越多越重要。[存储内存预算文章](https://hindsight.vectorize.io/blog/2026/08/27/retain-memory-budget)深入解释内存上限。

## 后续方向 {#where-to-go-from-here}

以上均包含在 v0.10.0，Cloud 与自托管均可使用。各版本说明有完整细节，升级前应阅读 0.10.0 的若干不兼容变更。

- [0.10.0](https://hindsight.vectorize.io/blog/2026/09/14/version-0-10-0)：附件、提示词预览、更快请求路径。
- [0.9.2](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2)：MCP 知识库、时间窗口、存储内存预算。
- [0.9.1](https://hindsight.vectorize.io/blog/2026/08/14/version-0-9-1)：反思当前时间、可迁移的文档传输。
- [0.9.0](https://hindsight.vectorize.io/blog/2026/08/07/version-0-9-0)：知识页面、重新设计的控制平面。
- [0.8.6](https://hindsight.vectorize.io/blog/2026/07/29/version-0-8-6)：实体时间线、按操作控制模型。
- [0.8.5](https://hindsight.vectorize.io/blog/2026/07/21/version-0-8-5)：批量 API、提示缓存、稳健模型输出。

## 常见问题 {#faq}

**必须逐个版本升级吗？**
不必。发布说明标出不兼容变化，0.10.0 尤其应先阅读，包括移除记忆库 profile 端点和 Docker 不再包含 `curl`。

**Hindsight Cloud 已支持吗？**
支持。Cloud 运行 0.10.0，全部内容都可使用；知识库自 [Cloud 6—8 月汇总](https://hindsight.vectorize.io/blog/2026/09/01/hindsight-cloud-june-august-updates)时就已提供。自托管 v0.10.0 也全部可用。

**编程智能体插件属于核心版本吗？**
它以 `@vectorize-io/hindsight-coding-agents` 独立发布，支持 Cloud、自有服务器或本地守护进程。
