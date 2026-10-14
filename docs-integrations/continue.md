---
sidebar_position: 36
title: "Continue.dev 与 Hindsight：持久记忆 | 集成"
description: "借助 Hindsight 为 Continue.dev 编码助手添加长期记忆。使用 @hindsight 将项目记忆召回到聊天中；也可通过 Hindsight MCP 服务器启用自动召回和存入。"
---

# Continue {#continue}

借助 [Hindsight](https://vectorize.io/hindsight)，为 [Continue.dev](https://continue.dev) 编码助手提供长期记忆。你可以将相关项目记忆直接召回到聊天中，也可以选择让智能体在智能体模式下自动召回和存入记忆。

[查看更新日志 →](/changelog/integrations/continue)

## 工作原理 {#how-it-works}

Continue 没有在发送消息前运行的钩子，但它支持 `hindsight-continue` 所使用的两个原生扩展点：

- **HTTP 上下文提供程序（精确召回）：**在 Continue 聊天中输入 `@hindsight <query>`（或只输入 `@hindsight`），即可在查询时召回相关记忆并注入模型上下文。该软件包附带一个小型适配器服务器，它基于 Hindsight 召回功能实现 Continue 的 HTTP 上下文提供程序契约（`{query, fullInput, options, workspacePath}` → 上下文条目）。
- **MCP 服务器 + 规则（自动召回）：**将 Continue 的智能体模式连接到 Hindsight MCP 服务器，以使用 `retain`/`recall`/`reflect` 工具；再添加规则文件，指示智能体在每项任务开始时召回记忆，并存入值得长期保留的事实。

记忆按**记忆库**划分范围：每个项目使用一个记忆库，避免一个代码库的上下文泄漏到另一个代码库。

## 设置 {#setup}

```bash
pip install hindsight-continue
```

运行适配器，并将其指向你的 Hindsight 实例和记忆库：

```bash
export HINDSIGHT_API_KEY=hsk_...
export HINDSIGHT_CONTINUE_BANK_ID=my-project
hindsight-continue            # 在 127.0.0.1:8123 上提供服务
```

然后在 Continue 的 `config.yaml` 中注册适配器：

```yaml
context:
  - provider: http
    params:
      url: "http://127.0.0.1:8123/"
      title: hindsight
      displayTitle: Hindsight
      description: 从 Hindsight 召回长期记忆
```

你可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，也可以通过 `HINDSIGHT_API_URL=http://localhost:8888` 指向自托管服务器。

## 自动召回（可选） {#automatic-recall-optional}

如需在智能体模式下自动召回和存入记忆，请将 Hindsight MCP 服务器接入 Continue，并添加一条“先召回”规则。相关资源见集成目录中的 [`examples/.continue/`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/continue/examples/.continue)。

## 限制 {#limitation}

Continue 没有预提示钩子，因此无法在每条消息中完全被动地注入记忆。`@hindsight` 提供程序可按需在查询时精确召回记忆；MCP + 规则配置则可在智能体模式下自动召回，但这取决于智能体是否遵循规则。
