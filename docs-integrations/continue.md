---
sidebar_position: 36
title: "Continue.dev 持久记忆与Hindsight |整合"
description: "添加长期记忆Continue.dev 编码助手Hindsight。 记忆召回项目记忆与聊天@hindsight，加上可选的自动recall/retain通过HindsightMCP服务器。"
---

# Continue {#continue}

长期记忆[Continue.dev](https://continue.dev) 编码助手，由 提供支持 [Hindsight](https://vectorize.io/hindsight)。 记忆召回相关项目直接记忆到聊天中，并可选择让智能体记忆召回和记忆存储自动处于智能体模式。

[查看更新日志 →](/changelog/integrations/continue)

## 工作原理 {#how-it-works}

Continue没有在发送消息之前运行的钩子，但它支持两个本机扩展点 `hindsight-continue`用途：

- **HTTP 上下文提供程序（精确记忆召回）：**型`@hindsight <query>`（或裸`@hindsight`) 在Continue聊天和相关记忆被调用并注入到模型的上下文中 **在查询时**。该软件包附带了一个小型适配器服务器，它实现了Continue的 HTTP 上下文提供者合约 (`{query, fullInput, options, workspacePath}` → 上下文项）位于顶部Hindsight记忆再现。
- **MCP 服务器 + 规则（自动）：**点Continue的智能体模式HindsightMCP服务器 `retain`/`recall`/`reflect` 工具，带有一个规则文件，指示智能体在每个任务开始时进行记忆召回，并存储持久的事实。

记忆范围为**记忆库** — 每个项目使用一个记忆库，这样一个代码库的上下文就不会泄漏到另一个代码库中。

## 设置 {#setup}

```bash
pip install hindsight-continue
```

运行适配器，将其指向您的Hindsight实例和记忆库：

```bash
export HINDSIGHT_API_KEY=hsk_...
export HINDSIGHT_CONTINUE_BANK_ID=my-project
hindsight-continue            #服务于 127.0.0.1:8123
```

然后注册到Continue的`config.yaml`：

```yaml
context:
  - provider: http
    params:
      url: "http://127.0.0.1:8123/"
      title: hindsight
      displayTitle: Hindsight
      description: 从 Hindsight 召回长期记忆
```

使用[Hindsight Cloud](https://hindsight.vectorize.io) 键，或使用 指向自托管服务器 `HINDSIGHT_API_URL=http://localhost:8888`。

## 自动记忆召回（可选） {#automatic-recall-optional}

对于智能体模式下的免提记忆召回和记忆存储，请连接HindsightMCP服务器进入Continue并添加“记忆召回优先”规则。参见集成目录中的 [`examples/.continue/`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/continue/examples/.continue)资产。

## 限制 {#limitation}

Continue没有预提示钩子，所以记忆不能完全被动地注入到每条消息上。这 `@hindsight` 提供者按需提供精确的查询时间记忆召回；的MCP+规则设置在智能体模式下提供自动记忆召回，但智能体遵循规则。
