---
title: "指南：通过 Hindsight 为 OpenCode 添加记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, opencode, coding-agents, memory]
description: "使用原生插件为 OpenCode 添加 Hindsight 记忆，支持自动召回、自动存储，以及直接使用存储、召回和反思工具。"
image: /img/blog/guide-opencode-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：通过 Hindsight 为 OpenCode 添加记忆](/img/blog/guide-opencode-memory-with-hindsight.png)

为 **OpenCode 添加 Hindsight 记忆**，最清晰的方式是安装 Hindsight 插件并指向后端，让它处理会话召回、自动存储和直接记忆工具调用。这样 OpenCode 就拥有跨编程会话的长期记忆，无需每次重新发现同样的上下文。

这适合编程工作流，因为 OpenCode 已有 Hindsight 可接入的插件机制。配置后，插件在会话开始时召回上下文，空闲时保存记忆，并在智能体工作流中提供 retain、recall 和 reflect 显式工具。

本指南介绍插件配置、关键选项、静态与动态记忆库 ID 的区别，以及确认记忆实际被使用的快速验证流程。操作时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)。

<!-- truncate -->

> **快速步骤**
>
> 1. 将 `@vectorize-io/opencode-hindsight` 加入 OpenCode 插件配置。
> 2. 指定 Hindsight 后端。
> 3. 启用自动召回和自动存储。
> 4. 选择静态或动态记忆库 ID 策略。
> 5. 确认后续会话能记住此前存储的内容。

## 前置条件 {#prerequisites}

开始前，请准备：

- 已安装并正常工作的 OpenCode
- 可访问的 Hindsight 后端，本地部署或 [Hindsight Cloud](https://hindsight.vectorize.io)
- 明确记忆应按项目隔离，还是跨上下文共享

## 第一步：添加插件 {#step-1-add-the-plugin}

在 OpenCode 配置中添加 Hindsight 插件。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

OpenCode 启动时自动安装数组中的插件，无需单独为插件执行 `npm install`。

## 第二步：连接 Hindsight {#step-2-point-the-plugin-at-hindsight}

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

也可在 `opencode.json` 内直接配置插件选项。

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

插件添加三个直接调用工具：

- `hindsight_retain`
- `hindsight_recall`
- `hindsight_reflect`

同时支持：

- 会话开始时**自动召回**
- 会话空闲时**自动存储**
- **压缩前保存**，使记忆在上下文窗口裁剪后仍然保留

因此集成在两个层面工作：智能体可显式调用记忆工具，插件也会在后台自动保存记忆。

底层行为见 [Hindsight 召回 API](/developer/api/recall) 和[存储 API](/developer/api/retain)。

## 静态与动态记忆库 ID {#static-vs-dynamic-bank-ids}

### 静态记忆库 ID {#static-bank-id}

静态记忆库最简单，适合一套 OpenCode 配置始终使用同一共享记忆库。

```bash
export HINDSIGHT_BANK_ID="my-project"
```

### 动态记忆库 ID {#dynamic-bank-ids}

同一 OpenCode 环境跨项目或用户工作时，动态 ID 更适合。

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

插件可以根据智能体、项目、频道或用户等字段推导记忆库，从而实现项目隔离，无需每次手动重写配置。

## 推荐的入门配置 {#recommended-starter-config}

实用的初始配置如下：

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

它提供自动记忆能力，同时避免配置过于激进。

## 验证记忆是否有效 {#verify-that-memory-is-working}

建议按以下步骤测试：

1. 开始一个 OpenCode 会话
2. 存储一条事实或项目偏好
3. 关闭会话或让其进入空闲
4. 开始新会话
5. 询问已保存的事实

例如：

- 第一个会话存储仓库偏好 pnpm 和严格 TypeScript 的信息
- 第二个会话询问仓库约定

召回结果包含已存储偏好时，说明配置有效。

也可让 OpenCode 直接使用 retain、recall 或 reflect，测试显式工具调用。

## 常见错误 {#common-mistakes}

### 无关项目共用一个静态记忆库 {#using-one-static-bank-for-unrelated-projects}

希望共享记忆时可以这样做，但若期望项目隔离，就有风险。

### 未理解命名输入就启用动态记忆库 {#turning-on-dynamic-banks-without-understanding-the-naming-inputs}

推导出的 ID 不可预测时，召回可能看起来不一致。

### 忘记自动存储发生在空闲时 {#forgetting-that-auto-retain-happens-on-idle}

测试过早时，对话可能尚未存储。

### 认为上下文压缩意味着记忆丢失 {#assuming-compaction-means-memory-loss}

插件明确在压缩前存储内容，并将相关记忆重新注入上下文。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必，本地 Hindsight 服务器也可以。

### 只有插件就够了吗？ {#is-the-plugin-enough-by-itself}

插件负责集成，仍需 Hindsight 后端。

### 应使用静态还是动态 ID？ {#should-i-use-static-or-dynamic-bank-ids}

一个明确的项目记忆库使用静态 ID，跨项目或用户的环境使用动态 ID。

### 与 Claude Code 或 Codex 记忆类似吗？ {#is-this-similar-to-claude-code-or-codex-memory}

总体上类似，但 OpenCode 使用自己的插件和事件机制。相关工作流可比较[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和 [Claude Code 集成](/sdks/integrations/claude-code)。

## 后续步骤 {#next-steps}

- 希望使用托管后端时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中比较编程工作流。
