---
title: "指南：使用 Hindsight 为 Continue 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, continue, coding-agents, memory]
description: "使用 hindsight-continue 适配器将 Hindsight 项目记忆召回到 Continue 聊天中，并可选在智能体模式下自动召回和存入记忆。"
image: /img/guides/guide-continue-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Continue 添加记忆](/img/guides/guide-continue-memory-with-hindsight.svg)

如果要在 Continue 中使用 Hindsight 记忆，最简便的配置是 `hindsight-continue` 适配器。它会运行一个小型本地服务器，在 Hindsight Recall（召回）的基础上实现 Continue 的 HTTP 上下文提供商协议。在 Continue 聊天中输入 `@hindsight`，相关项目记忆就会在查询时被召回并注入模型上下文。

Continue 很适合采用这种方式，因为它没有在发送消息前运行的钩子，但支持该软件包使用的两个原生扩展点。HTTP 上下文提供商通过 `@hindsight` 实现精确的按需召回。可选的 MCP 服务器加规则文件，则能在智能体模式下自动召回和 Retain（存入）记忆，前提是智能体遵循该规则。

本指南将介绍如何安装适配器、将其指向 Hindsight 后端、在 Continue 配置中注册，以及如何快速验证记忆确实正在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-continue`。
> 2. 设置 `HINDSIGHT_API_KEY`（Cloud）或 `HINDSIGHT_API_URL`（自托管），并设置 `HINDSIGHT_CONTINUE_BANK_ID`。
> 3. 运行 `hindsight-continue`；服务会监听 `127.0.0.1:8123`。
> 4. 在 Continue 的 `config.yaml` 中将它注册为 `http` 上下文提供商。
> 5. 在聊天中输入 `@hindsight`，确认召回的记忆出现在上下文中。

## 前提条件 {#prerequisites}

开始前，请确认你已准备好：

- 已安装 Continue（VS Code 或 JetBrains 扩展）
- 已安装 Python 3.10+，用于运行适配器
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 步骤 1：安装适配器 {#step-1-install-the-adapter}

使用 pip 安装适配器：

```bash
pip install hindsight-continue
```

`hindsight-continue` 是一个轻量的本地服务器。它接收 Continue 的上下文提供商请求，从 Hindsight 中召回记忆，并返回格式符合 Continue 预期的上下文项。

## 步骤 2：将适配器指向 Hindsight {#step-2-point-the-adapter-at-hindsight}

设置环境变量，然后运行适配器。

使用 Hindsight Cloud：

```bash
export HINDSIGHT_API_KEY=hsk_...
export HINDSIGHT_CONTINUE_BANK_ID=my-project

hindsight-continue            # 监听 127.0.0.1:8123
```

如果使用自托管的 Hindsight 服务器，请通过 `HINDSIGHT_API_URL` 指定服务器，并省略密钥：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
export HINDSIGHT_CONTINUE_BANK_ID=my-project

hindsight-continue            # 监听 127.0.0.1:8123
```

`HINDSIGHT_CONTINUE_BANK_ID` 用于指定记忆库。每个项目使用一个记忆库，这样一个代码库的上下文就不会泄漏到另一个项目中。

## 步骤 3：在 Continue 中注册适配器 {#step-3-register-it-in-continue}

在 Continue 的 `config.yaml`（`~/.continue/config.yaml` 或工作区的 `.continue` 配置块）中，将适配器添加为 `http` 上下文提供商：

```yaml
context:
  - provider: http
    params:
      url: "http://127.0.0.1:8123/"
      title: hindsight
      displayTitle: Hindsight
      description: Recall long-term memory from Hindsight
```

现在，在 Continue 聊天中输入 `@hindsight`，还可以接着输入想要召回的内容；匹配的记忆会加入模型上下文。

## 适配器如何使用记忆 {#how-the-adapter-uses-memory}

Continue 没有预提示钩子，因此适配器通过 Continue 提供的扩展点工作：

- **Recall（HTTP 上下文提供商）：** 输入 `@hindsight <query>`（或只输入 `@hindsight`），适配器就会收到 Continue 的请求（`{query, fullInput, options, workspacePath}`），从 Hindsight 中召回记忆，并返回格式为 `{name, description, content}` 的上下文项。召回在查询时按需进行。
- **召回和存入（可选，MCP + 规则）：** 将 Continue 的智能体模式指向 Hindsight MCP 服务器，以使用 `retain`/`recall`/`reflect` 工具，并配置规则文件，要求智能体在每项任务开始时召回记忆，并存入值得长期保留的事实。

如需了解更底层的行为，请阅读 Hindsight 的[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 在智能体模式下自动召回 {#automatic-recall-in-agent-mode}

`@hindsight` 提供商适合精确的按需召回。如果希望自动召回和存入记忆，可以将 Hindsight MCP 服务器接入 Continue 的智能体模式，并添加“先召回”规则。示例资源位于 [`examples/.continue/`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/continue/examples/.continue) 目录中：

- 注册 Hindsight 工具的 MCP 服务器配置块
- 要求智能体自动召回的规则文件

自动召回取决于智能体是否遵循规则，因此其确定性不如 `@hindsight` 提供商。

## 按项目划分记忆库 {#per-project-memory-banks}

记忆按**记忆库**划分范围。你设置的 `HINDSIGHT_CONTINUE_BANK_ID` 是适配器默认进行召回的记忆库。

在提供商配置中发送 `options.bankId`，可以让单个请求改用其他记忆库，从而覆盖默认值。每个项目使用一个记忆库，既能隔离各代码库的记忆，也能让同一项目中使用 Hindsight 的其他编辑器集成共享记忆。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

建议按以下顺序测试：

1. 运行 `hindsight-continue`，并在 Continue 中注册它
2. 在项目的记忆库中存入一条决策或约定
3. 打开 Continue 聊天，输入 `@hindsight` 和相关查询
4. 确认召回的记忆出现在模型上下文中

例如：

- 存入项目当前的身份验证约定
- 使用 `@hindsight auth conventions` 查询这些约定

如果召回的上下文显示了先前存入的决策，说明配置正常工作。

## 常见错误 {#common-mistakes}

### 忘记设置记忆库 {#forgetting-to-set-the-bank}

召回会使用 `HINDSIGHT_CONTINUE_BANK_ID`。如果未设置该变量，适配器就没有默认记忆库可供召回；请为每个项目设置一个记忆库。

### 期待每条消息都被动触发召回 {#expecting-passive-recall-on-every-message}

Continue 没有预提示钩子，因此只有在调用 `@hindsight` 时，提供商才会执行召回。想要将记忆加入上下文时，请输入 `@hindsight`；也可以在智能体模式下使用 MCP + 规则配置。

### 适配器和配置中的 URL 不匹配 {#mismatched-url-between-adapter-and-config}

适配器默认监听 `127.0.0.1:8123`。如果更改主机或端口，请同步更新 Continue 的 `config.yaml` 中的 `url`。

### 误以为记忆是全局共享的 {#assuming-memory-is-global}

记忆按记忆库划分范围。这通常正是你需要的行为，但不要指望一个项目的记忆库能召回另一个项目的上下文。

## 常见问题 {#faq}

### 是否必须使用 Hindsight Cloud？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用：设置 `HINDSIGHT_API_URL`，并省略密钥。

### `@hindsight` 会自动召回吗？ {#does-hindsight-recall-automatically}

不会。只有调用 `@hindsight` 时，该提供商才会按需召回。要自动召回，请在智能体模式下使用可选的 MCP 服务器和规则文件。

### 记忆如何划分范围？ {#how-is-memory-scoped}

范围按记忆库划分，由 `HINDSIGHT_CONTINUE_BANK_ID` 指定。每个项目使用一个记忆库；如有需要，可通过 `options.bankId` 按请求覆盖。

### 可以更改适配器的主机或端口吗？ {#can-i-change-the-adapters-host-or-port}

可以。设置 `HINDSIGHT_CONTINUE_HOST` 和 `HINDSIGHT_CONTINUE_PORT`，然后更新 Continue 配置中的 `url` 以保持一致。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 Hindsight 的[召回 API](/developer/api/recall)
- 查看 Hindsight 的[存入 API](/developer/api/retain)
- 阅读 [Continue 集成文档](/sdks/integrations/continue)
