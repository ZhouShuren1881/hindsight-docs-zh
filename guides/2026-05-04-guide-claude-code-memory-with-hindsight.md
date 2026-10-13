---
title: "指南：使用 Hindsight 为 Claude Code 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, claude-code, coding-agents, memory]
description: "通过记忆插件、自动召回钩子和感知项目的记忆库 ID，为 Claude Code 添加跨会话 Hindsight 持久记忆。"
image: /img/guides/guide-claude-code-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Claude Code 添加持久记忆](/img/guides/guide-claude-code-memory-with-hindsight.webp)

如需 **Claude Code 与 Hindsight 持久记忆**，最清晰的方式是安装记忆插件，连接 Cloud 或本地守护进程，让内置钩子自动召回和存储。这样每次新会话无需重新发现项目约定、偏好或此前决策。

插件将记忆直接接入 Claude Code 会话生命周期，适合编码工作。提示前召回、回复后存储，动态记忆库 ID 决定跨项目共享或按代码库隔离。

操作时可参考 [Claude Code 集成文档](/sdks/integrations/claude-code)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Claude Code 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 Claude Code。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复此前上下文。

## 为什么这种配置有效 {#why-this-setup-works}

插件使用已有钩子：`UserPromptSubmit` 将召回记忆注入额外上下文，`Stop` 存储新对话，`SessionStart` 提前预热 Hindsight。无需教模型手动记忆，集成会处理循环。

## 前提条件 {#prerequisites}

- 已安装 Claude Code，插件市场可用。
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io)或本地守护进程。
- 已决定所有工作共享记忆，还是按项目隔离。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

## 步骤 2：连接 Claude Code 与 Hindsight {#step-2-connect-claude-code-to-hindsight}

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key"
}
```

保存为 `~/.hindsight/claude-code.json`。如偏好本地守护进程，留空 `hindsightApiUrl`，启动 Claude Code 前导出 LLM 提供商密钥。例如：

```bash
export OPENAI_API_KEY="sk-your-key"
claude
```

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"],
  "agentName": "claude-code",
  "autoRecall": true,
  "autoRetain": true,
  "recallBudget": "mid"
}
```

此配置按项目生成记忆库，同时保留相同 Claude Code 身份。希望全部工作共享时，设 `dynamicBankId` 为 `false` 并提供固定 `bankId`。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

希望所有 Claude Code 工作长期共用记忆、各处记住个人偏好时，使用静态库。每个代码库应隔离时使用动态 ID。默认按项目通常更安全，避免无关代码库互相污染。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 开始会话，告诉它应记住的事实，如测试命令或分支命名规则。
2. 结束后，在同一项目开始新会话。
3. 询问项目配置或工作流偏好。
4. 必要时启用调试日志，确认两次使用相同记忆库 ID。

第二次运行能用第一次细节回答，就说明配置有效。否则启用调试日志、检查记忆库 ID，并确认存储调用完成。

## 常见错误 {#common-mistakes}

- 安装插件却未创建 `~/.hindsight/claude-code.json`，导致没有连接目标。
- 无关代码库共用静态库，使记忆嘈杂。
- 本地模式未配置 LLM 提供商，存储无法完成。

## 常见问题 {#faq}

### 用户会在对话记录中看到召回记忆块吗？ {#do-users-see-the-recalled-memory-block-in-the-transcript}

不会，插件注入额外上下文，不显示为聊天文本。

### 应使用 Hindsight Cloud 还是本地守护进程？ {#should-i-use-hindsight-cloud-or-a-local-daemon}

Cloud 最快上手。本地适合本地优先或需要更严格后端控制。

### 可以按代码库隔离吗？ {#can-i-keep-memory-separate-per-repo}

可以。启用 `dynamicBankId`，在 `dynamicBankGranularity` 包含 `project`，每个库就有独立记忆库。

## 后续步骤 {#next-steps}

- 如需托管记忆后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中的工作流。
