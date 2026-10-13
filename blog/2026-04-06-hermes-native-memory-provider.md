---
title: "Hindsight 现在是 Hermes 智能体的原生记忆提供者"
authors: [benfrank241]
date: 2026-04-06
tags: [hermes, memory, hindsight, integration, release]
description: "Hermes 智能体现在支持可插拔记忆提供程序。以下是为什么要使用 Hindsight 后端，以及如何在两分钟内设置它。"
image: /img/blog/hermes-native-memory-provider.webp
hide_table_of_contents: true
---

![Hindsight现在是Hermes智能体的原生记忆提供者](/img/blog/hermes-native-memory-provider.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

Hermes 智能体现在附带可插拔记忆提供程序系统。 Hindsight 是受支持的后端之一，并且是领先于 [实际大规模测试记忆的基准](/blog/2026/04/02/beam-sota) 的后端。

<!-- truncate -->

---

## 它是如何工作的 {#how-it-works}

Hindsight 在 Hermes 生命周期中的两个点进行集成：

**每回合前**、Hindsight 对异步预取进行排队。在LLM看到您的消息之前，您过去会话的相关记忆将被检索并注入到系统提示中。该模型具有之前对话的上下文，无需您重复自己。

**每次回复后**，您的对话将异步保留。 Hindsight 在后台提取事实、实体和关系。您在本次通话中所说的内容在下一次通话时就可以被搜索到。

这是故意的：预取模式意味着**当前回合的记忆直到下一回合才会出现**。它使每次通话都保持快速。

---

## 为什么Hindsight在Hermes {#why-hindsight-on-hermes}

Hermes 附带内置记忆工具，可将笔记保存到本地 Markdown 文件。它有效，但它捕获了模型明确决定写下的内容，而不是它从您的对话中隐式学到的内容。上下文不会自动累积。如果您要求 Hermes 帮助您计划周一的冲刺，然后在周五打开一个新会话，它不会记住项目、团队或截止日期，除非您自己重新建立该上下文。

Hindsight 通过对话中的持久记忆解决了这个问题。您曾经提到过产品发布截止日期。一周后，在关于不同主题的新会议中，Hermes 已经知道了。你没有重复自己。您没有在上下文中粘贴。它被自动召回了。

在所有受支持的记忆提供商中，Hindsight 是唯一在 [BEAM](/blog/2026/04/02/beam-sota) 上发布结果的提供商，这是在 1000 万个令牌上测试记忆的基准，其中上下文填充在物理上是不可能的。 Hindsight 在该级别得分为 64.1%。第二好的公布结果是 40.6%。

---

## 设置 {#setting-it-up}

Setup 是一个向导命令：

```bash
hermes memory setup    # select "hindsight"
```

然后确认记忆已激活：

```bash
hermes memory status
```

配置位于`$HERMES_HOME/hindsight/config.json`：

|钥匙|默认|说明|
|-----|---------|-------------|
|`mode`|`cloud`|`cloud` 或 `local`|
|`bank_id`|`hermes`|记忆 记忆库标识符|
|`budget`|`mid`|记忆召回彻底性：`low` / `mid` / `high`|
|`memory_mode`|`hybrid`|`hybrid`、`context` 或 `tools` — 见下文|
|`prefetch_method`|`recall`|`recall`（快速）或`reflect`（LLM-合成）|

---

## 记忆模式 {#memory-modes}

自动记忆召回是核心行为：在每次回合之前，Hindsight会自动从你的历史记录中提取相关记忆并将其注入系统提示符中。 Hermes 拥有所需的上下文，无需模型调用任何工具，也无需您重复自己。每次通话都会透明地进行。

`memory_mode` 设置控制自动记忆召回是否处于活动状态以及是否还公开显式工具：

|模式|行为|
|------|----------|
|`hybrid`（默认）|每回合前自动注入记忆，加上暴露给模型的 `hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect` 工具|
|`context`|仅自动记忆识别 - 自动注入记忆，模型不可见任何工具|
|`tools`|仅显式工具——模型必须调用`hindsight_recall`来检索记忆；没有自动注入任何内容|

`prefetch_method` 控制在自动记忆再生过程中如何检索记忆：
- **`recall`**（默认）：语义搜索、关键词匹配、实体图遍历、重排序。快速地。
- **`reflect`**：LLM综合所有相关记忆的连贯摘要。速度较慢，但​​对于复杂的上下文更有用。

---

## 从旧插件迁移 {#migrating-from-the-old-plugin}

如果您之前安装了`hindsight-hermes`作为pip插件（我们的[早期指南](/blog/2026/03/17/hermes-agent-memory)的方法），请先卸载它：

```bash
uv pip uninstall hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python
```

然后运行设置向导来配置本机提供程序：

```bash
hermes memory setup
```

原生提供程序取代了插件所做的一切，具有更好的生命周期管理和完整的`memory_mode`和`prefetch_method`控件。

---

## 本地或云端 {#local-or-cloud}

在本地模式下，Hindsight运行内置PostgreSQL的嵌入式服务器。首次使用时，守护进程会在后台自动启动；无需手动设置。您需要一个 LLM API 密钥来提取记忆：

```json
{
  "mode": "local",
  "llm_provider": "groq",
  "llm_api_key": "your-groq-key"
}
```

守护进程在Hermes在您的第一条消息上显示“正在启动智能体”时启动——而不是在启动时。在新系统上，嵌入式 PostgreSQL 服务器初始化可能需要一分钟多的时间。后续启动速度很快。如果需要调试，启动日志位于`~/.hermes/logs/hindsight-embed.log`。

对于跨机器的持久记忆或跨多个Hermes实例共享，请改用云模式。两种模式都使用相同的API。切换是单行配置更改，而不是迁移。

---

## 开始 {#get-started}

- **Hermes集成文档**：[/sdks/集成/hermes](/sdks/integrations/hermes)
- **BEAM 基准测试结果**：[Hindsight 在 BEAM 上排名第一](/blog/2026/04/02/beam-sota)
- **快速入门**：[/开发者/api/快速入门](/developer/api/quickstart)
- **GitHub**：[github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)
- **云**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
