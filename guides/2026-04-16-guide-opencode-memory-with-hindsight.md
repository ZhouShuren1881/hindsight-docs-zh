---
title: "指南：使用 Hindsight 为 OpenCode 添加记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, opencode, coding-agents, memory]
description: "通过原生插件为 OpenCode 添加 Hindsight 记忆，支持自动召回、自动存入，以及直接调用存入、召回和反思工具。"
image: /img/blog/guide-opencode-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OpenCode 添加记忆](/img/blog/guide-opencode-memory-with-hindsight.png)

如果要为 **OpenCode 添加 Hindsight 记忆**，最直接的配置方式是将 Hindsight 插件添加到 OpenCode，连接到 Hindsight 后端，再由插件处理会话召回、自动存入和直接记忆工具调用。这样，OpenCode 在不同编程会话之间就能保留长期记忆，无需每次都重新发现相同的上下文。

这种方式适合编程工作流，因为 OpenCode 已提供插件机制，Hindsight 可以接入其中。完成配置后，插件可以在会话开始时召回上下文、在会话进入空闲状态时保存记忆，并在智能体工作流中提供显式的存入、召回和反思工具。

本指南将介绍插件的配置方法、主要配置选项、静态与动态记忆库 ID 的区别，以及一套快速验证流程，帮助你确认记忆确实在发挥作用。操作时请同时参考[文档首页](/)和[快速开始指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速答案**
>
> 1. 将 `@vectorize-io/opencode-hindsight` 添加到 OpenCode 插件配置中。
> 2. 将插件连接到 Hindsight 后端。
> 3. 启用自动召回和自动存入。
> 4. 选择静态或动态记忆库 ID 策略。
> 5. 验证后续会话能否记住之前会话存入的内容。

## 前置条件 {#prerequisites}

开始前，请确保你已准备好：

- 已安装并能正常运行的 OpenCode
- 可访问的 Hindsight 后端，可以是本地服务或 [Hindsight Cloud](https://hindsight.vectorize.io)
- 已决定记忆应按项目隔离，还是在不同上下文之间共享

## 第一步：添加插件 {#step-1-add-the-plugin}

将 Hindsight 插件添加到 OpenCode 配置中。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

OpenCode 会在启动时自动安装数组中列出的插件，因此无需另外为该插件执行 `npm install`。

## 第二步：连接到 Hindsight {#step-2-point-the-plugin-at-hindsight}

使用本地 Hindsight 服务器时：

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
opencode
```

使用 Hindsight Cloud 时：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="your-api-key"
opencode
```

你也可以直接在 `opencode.json` 中配置插件选项。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "https://api.hindsight.vectorize.io",
      "hindsightApiToken": "your-api-key"
    }]
  ]
}
```

## 插件提供的能力 {#what-the-plugin-gives-you}

该插件提供三个可直接调用的工具：

- `hindsight_retain`
- `hindsight_recall`
- `hindsight_reflect`

它还支持：

- 会话开始时**自动召回**
- 会话进入空闲状态时**自动存入**
- **上下文压缩前保存**，让记忆在上下文窗口裁剪后仍然可用

这意味着集成在两个层面发挥作用：智能体可以显式调用记忆工具，插件也可以在后台自动保存记忆。

如需了解更底层的行为，请参阅 [Hindsight 的召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 静态与动态记忆库 ID {#static-vs-dynamic-bank-ids}

### 静态记忆库 ID {#static-bank-id}

静态记忆库 ID 是最简单的选择，适用于一套 OpenCode 配置始终使用同一个共享记忆库的情况。

```bash
export HINDSIGHT_BANK_ID="my-project"
```

### 动态记忆库 ID {#dynamic-bank-ids}

如果同一个 OpenCode 环境会用于不同项目或用户，动态记忆库 ID 会更合适。

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

插件可以根据智能体、项目、频道或用户等字段推导记忆库 ID。如果你希望隔离不同项目，又不想每次都手动改写配置，这种方式会很有帮助。

## 推荐的入门配置 {#recommended-starter-config}

可以从下面这份实用配置开始：

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "bankId": "my-project",
      "autoRecall": true,
      "autoRetain": true,
      "recallBudget": "mid",
      "retainEveryNTurns": 3,
      "debug": false
    }]
  ]
}
```

这份配置可以自动处理记忆，同时不会让配置变得过于激进。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤测试：

1. 启动一个 OpenCode 会话
2. 存入一条事实或项目偏好
3. 关闭会话，或让会话进入空闲状态
4. 启动一个新会话
5. 询问刚才保存的事实

例如：

- 第一个会话存入仓库偏好使用 pnpm 和严格 TypeScript 的信息
- 第二个会话询问仓库有哪些约定

如果召回结果中出现了已存入的偏好，说明配置正在工作。

你也可以让 OpenCode 直接调用存入、召回或反思工具，测试显式工具访问。

## 常见错误 {#common-mistakes}

### 无关项目共用一个静态记忆库 {#using-one-static-bank-for-unrelated-projects}

如果你希望共享记忆，这样做没有问题；如果你期望项目之间相互隔离，就可能带来风险。

### 未了解命名依据就启用动态记忆库 {#turning-on-dynamic-banks-without-understanding-the-naming-inputs}

如果推导出的 ID 难以预测，召回结果可能显得不一致。

### 忘记自动存入会在空闲时发生 {#forgetting-that-auto-retain-happens-on-idle}

如果测试得太早，对话可能还没有存入记忆。

### 误以为上下文压缩会导致记忆丢失 {#assuming-compaction-means-memory-loss}

插件会在压缩前显式存入记忆，并将相关记忆重新注入上下文。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。本地 Hindsight 服务器也可以使用。

### 只安装插件就够了吗？ {#is-the-plugin-enough-by-itself}

插件负责集成，但你仍然需要一个 Hindsight 后端。

### 应该使用静态还是动态记忆库 ID？ {#should-i-use-static-or-dynamic-bank-ids}

如果只对应一个明确的项目记忆库，使用静态 ID；如果环境会跨项目或用户使用，则使用动态 ID。

### 这和 Claude Code 或 Codex 的记忆类似吗？ {#is-this-similar-to-claude-code-or-codex-memory}

大体上类似，但 OpenCode 使用自己的插件和事件机制。若要了解相关工作流，可以对比[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和 [Claude Code 集成](/sdks/integrations/claude-code)。

## 后续步骤 {#next-steps}

- 如果想使用托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](/)
- 按照[快速开始指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的召回 API](/developer/api/recall)
- 查看 [Hindsight 的存入 API](/developer/api/retain)
- 在[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中对比编程工作流
