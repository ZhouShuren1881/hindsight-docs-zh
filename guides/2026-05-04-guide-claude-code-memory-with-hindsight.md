---
title: "指南：使用 Hindsight 为 Claude Code 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, claude-code, coding-agents, memory]
description: "通过记忆插件、自动召回钩子和感知项目的记忆库 ID，为 Claude Code 添加跨会话的 Hindsight 持久记忆。"
image: /img/guides/guide-claude-code-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Claude Code 添加持久记忆](/img/guides/guide-claude-code-memory-with-hindsight.webp)

如果你想让 **Claude Code 借助 Hindsight 使用持久记忆**，最简洁的配置方式是安装 Hindsight 记忆插件，将它连接到 Hindsight Cloud 或本地守护进程，再由内置钩子自动处理召回和存入。这样 Claude Code 就能在不同会话之间保持连续性，不必每次启动都重新摸索项目约定、偏好或先前做出的决定。

这个插件很适合编程工作，因为它把记忆直接接入 Claude Code 的会话生命周期。Recall（召回）会在提交提示前运行，Retain（存入）会在回复后运行；动态记忆库 ID 则让你可以决定是跨项目共享记忆，还是按代码库隔离记忆。

工作时如需随手查阅参考资料，可以打开 [Claude Code 集成文档](/sdks/integrations/claude-code)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的记忆召回 API](/developer/api/recall)和 [Hindsight 的记忆存入 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Claude Code 集成或插件。
> 2. 将它连接到 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 Claude Code 运行时。
> 4. 存入一条偏好或项目事实，然后启动一个新会话。
> 5. 确认召回会自动带回先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Claude Code 插件使用运行时已有的钩子事件。`UserPromptSubmit` 会把召回的记忆作为额外上下文注入，`Stop` 会存入新产生的对话内容，而 `SessionStart` 可以提前预热 Hindsight 一侧，让召回在需要时及时就绪。你不必教模型手动记忆，因为集成会替你处理整个记忆循环。

## 前提条件 {#prerequisites}

- 已安装 Claude Code，并且可以使用插件市场。
- 可以访问 Hindsight 后端：可以是 [Hindsight Cloud](https://hindsight.vectorize.io)，也可以是本地守护进程。
- 已决定记忆范围：所有工作共享，还是按项目隔离。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

## 步骤 2：将 Claude Code 连接到 Hindsight {#step-2-connect-claude-code-to-hindsight}

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key"
}
```

将配置保存为 `~/.hindsight/claude-code.json`。如果你倾向于使用本地守护进程，请将 `hindsightApiUrl` 留空，并在启动 Claude Code 前导出一个 LLM 服务提供方密钥。例如：

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

使用此配置时，插件会为每个项目生成一个记忆库，同时继续使用同一个 Claude Code 智能体身份。如果你希望所有工作共用一个记忆库，请将 `dynamicBankId` 设为 `false`，并改为提供固定的 `bankId`。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

如果你希望所有 Claude Code 工作都使用一个长期积累记忆的记忆库，例如让个人编程助手在任何地方都记住你的偏好，就使用静态记忆库。如果每个代码库都应保持隔离，就使用动态记忆库 ID。默认按项目划分的模式通常更安全，因为它可以避免无关代码库中的信息彼此混杂。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 启动 Claude Code 会话，告诉它一条应该记住的事实，例如你偏好的测试命令或分支命名规则。
2. 结束会话，然后在同一个项目中启动一个新会话。
3. 询问 Claude Code 它记得哪些项目配置或工作流偏好。
4. 如有需要，启用调试日志，确认两次运行使用了相同的记忆库 ID。

如果第二次运行能根据第一次运行的细节作答，说明配置已生效。如果不能，请开启调试日志、检查已配置的记忆库 ID，并确认存入调用确实已完成。

## 常见错误 {#common-mistakes}

- 安装插件后却没有创建 `~/.hindsight/claude-code.json`，导致插件无处连接。
- 在互不相关的代码库之间共用一个静态记忆库，使记忆变得嘈杂，失去实用性。
- 本地守护进程模式下没有配置 LLM 服务提供方，导致存入无法完成。

## 常见问题 {#faq}

### 用户会在对话记录中看到召回的记忆块吗？ {#do-users-see-the-recalled-memory-block-in-the-transcript}

不会。插件会把召回的记忆作为额外上下文注入 Claude Code，而不是显示为聊天文本。

### 应使用 Hindsight Cloud 还是本地守护进程？ {#should-i-use-hindsight-cloud-or-a-local-daemon}

使用 Cloud 是最快的入门方式。如果你希望优先在本地运行，或需要更严格地控制后端，则本地守护进程很有用。

### 可以按代码库隔离记忆吗？ {#can-i-keep-memory-separate-per-repo}

可以。启用 `dynamicBankId`，并在 `dynamicBankGranularity` 中包含 `project`，这样每个代码库都会有自己的记忆库。

## 后续步骤 {#next-steps}

- 如果你想使用托管记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 的记忆存入 API](/developer/api/retain)。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，了解相关工作流。
