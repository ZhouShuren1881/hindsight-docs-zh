---
title: "指南：使用 Hindsight 为 Codex CLI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, codex, coding-agents, memory]
description: "通过钩子召回、自动存储和跨会话保留的项目范围记忆库 ID，为 Codex CLI 添加 Hindsight 持久记忆。"
image: /img/guides/guide-codex-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Codex CLI 添加持久记忆](/img/guides/guide-codex-memory-with-hindsight.webp)

如需 **Codex CLI 与 Hindsight 持久记忆**，最快是安装 Hindsight 钩子包，指向 Cloud 或本地守护进程，让会话钩子自动召回和存储，跨编码会话延续，无需每次复述代码库习惯和项目上下文。

这尤其适合按项目开发。Codex 提供会话钩子，Hindsight 可在提示前召回相关上下文、回复后存储完整轮次。

操作时可参考[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Codex CLI 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 Codex CLI。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复此前上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Codex CLI 提供所需生命周期点：`SessionStart` 预热服务器，`UserPromptSubmit` 注入召回上下文，`Stop` 存储对话，无需每个流程添加手动存储调用。

## 前提条件 {#prerequisites}

- OpenAI Codex CLI 0.116.0 或更高版本。
- 运行钩子脚本的 Python 3.9 或更高版本。
- 可访问 Hindsight 后端，并决定共享还是按项目限定记忆。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash
```

安装器将脚本放入 `~/.hindsight/codex/scripts/`，写入 `~/.codex/hooks.json`，并在 `~/.codex/config.toml` 启用钩子。

## 步骤 2：连接 Codex CLI 与 Hindsight {#step-2-connect-codex-cli-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key",
  "bankId": "my-codex-memory"
}
```

保存为 `~/.hindsight/codex.json`。若偏好使用本地 `hindsight-embed` 自托管，留空 `hindsightApiUrl`，启动前导出提供商密钥：

```bash
export OPENAI_API_KEY=sk-your-key
codex
```

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"],
  "autoRecall": true,
  "autoRetain": true,
  "retainEveryNTurns": 10,
  "recallBudget": "mid"
}
```

此配置按项目隔离记忆。希望所有工作共享时，设 `dynamicBankId` 为 `false`，保留一个 `bankId`。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

Codex 通常应默认按项目，避免无关代码库泄漏，同时延续同一代码库上下文。只有各处应遵守相同约定，如全局 shell 偏好或个人编码习惯时，共享才合理。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 在一个代码库使用 Codex，存储 lint 命令或发布流程。
2. 结束后，在同库开始新会话。
3. 要求召回此前保存的偏好。
4. 召回遗漏时，确认钩子已启用、两次生成相同记忆库 ID。

第二次运行能用第一次细节回答，就说明配置有效。否则启用调试日志、检查记忆库 ID，并确认存储调用完成。

## 常见错误 {#common-mistakes}

- 在不支持钩子的旧 Codex 安装钩子包。
- 忘记在 `~/.codex/config.toml` 启用 `codex_hooks = true`。
- 希望按项目隔离，却关闭 `dynamicBankId`。

## 常见问题 {#faq}

### 支持 Hindsight Cloud 吗？ {#does-this-work-with-hindsight-cloud}

支持。在 `~/.hindsight/codex.json` 中将 `hindsightApiUrl` 设为 `https://api.hindsight.vectorize.io` 并提供令牌。

### 可以改用本地服务器吗？ {#can-i-use-a-local-server-instead}

可以。留空 `hindsightApiUrl`，让钩子连接本地守护进程。

### 如何排查记忆缺失？ {#how-do-i-debug-missing-memories}

启用 `debug`、查看 stderr，确认存储和召回使用相同记忆库 ID。

## 后续步骤 {#next-steps}

- 如需托管记忆后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中的工作流。
