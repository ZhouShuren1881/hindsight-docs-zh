---
title: "指南：使用 Hindsight 为 Codex CLI 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, codex, coding-agents, memory]
description: "通过钩子自动召回和存入，并使用跨会话稳定的项目范围记忆库 ID，为 Codex CLI 添加 Hindsight 持久记忆。"
image: /img/guides/guide-codex-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Codex CLI 添加持久记忆](/img/guides/guide-codex-memory-with-hindsight.webp)

如果你想为 **Codex CLI 配置 Hindsight 持久记忆**，最快的做法是安装 Hindsight 钩子包，将 Codex 接入 Hindsight Cloud 或本地守护进程，然后让会话钩子自动处理记忆召回和存入。这样，Codex 就能在不同编码会话之间延续上下文，你不必每次都重新说明代码库习惯和项目背景。

这种方案尤其适合按项目开展开发。Codex 已提供会话钩子，因此 Hindsight 可以在每次提示前召回相关上下文，并在每次回复后存入已完成的对话轮次。

如果你希望工作时随手查阅参考资料，可以打开[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的召回 API](/developer/api/recall)和 [Hindsight 的存入 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Codex CLI 集成或插件。
> 2. 将它接入 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的记忆库 ID，将记忆接入 Codex CLI 运行时。
> 4. 存入一项偏好或项目事实，然后启动一次新会话。
> 5. 确认系统会自动召回先前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Codex CLI 提供了记忆系统所需的各个生命周期节点。`SessionStart` 可以预热服务器，`UserPromptSubmit` 可以注入召回的上下文，而 `Stop` 可以存入对话。因此，你无需在每个工作流中手动调用存入操作，也能自动使用记忆。

## 前提条件 {#prerequisites}

- OpenAI Codex CLI 0.116.0 或更高版本
- 用于运行钩子脚本的 Python 3.9 或更高版本
- 一个可访问的 Hindsight 后端，以及一个选择：让记忆共享使用，还是限定在项目范围内

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash
```

安装器会将钩子脚本放在 `~/.hindsight/codex/scripts/` 下，写入 `~/.codex/hooks.json`，并在 `~/.codex/config.toml` 中启用钩子支持。

## 步骤 2：将 Codex CLI 接入 Hindsight {#step-2-connect-codex-cli-to-hindsight}

> ✨ **推荐：** [Hindsight Cloud](https://ui.hindsight.vectorize.io) — 提供免费档位，无需自行托管。

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key",
  "bankId": "my-codex-memory"
}
```

将这些内容保存为 `~/.hindsight/codex.json`。如果你更愿意使用本地守护进程（`hindsight-embed`）自行托管，请将 `hindsightApiUrl` 留空，并在启动 Codex 前导出一个服务提供方密钥：

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

此配置会按项目隔离记忆。如果你希望所有工作共用一个记忆库，请将 `dynamicBankId` 设为 `false`，并只使用一个 `bankId`。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

对 Codex 而言，通常应默认按项目划分记忆库。这样可以避免无关代码库之间相互泄漏信息，同时让同一代码库在不同会话间保持上下文连续。只有当相同约定需要伴随你出现在所有地方时，共享记忆库才有意义，例如全局 shell 偏好或个人编码习惯。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 在一个代码库中使用 Codex，并存入一项事实，例如首选 lint 命令或发布流程。
2. 结束会话，然后在同一个代码库中启动新的 Codex 会话。
3. 请 Codex 召回此前存入的代码库偏好。
4. 如果召回未命中，请确认钩子已启用，并且两次运行使用了相同的派生记忆库 ID。

如果第二次运行能回答出第一次运行中的细节，说明配置已生效。如果不能，请启用调试日志、检查配置的记忆库 ID，并确认存入调用确实已完成。

## 常见错误 {#common-mistakes}

- 在不支持钩子的旧版 Codex 上安装钩子包
- 忘记在 `~/.codex/config.toml` 中启用 `codex_hooks = true`
- 预期按项目隔离记忆，却关闭了 `dynamicBankId`

## 常见问题 {#faq}

### 支持 Hindsight Cloud 吗？ {#does-this-work-with-hindsight-cloud}

支持。将 `hindsightApiUrl` 设为 `https://api.hindsight.vectorize.io`，并在 `~/.hindsight/codex.json` 中提供令牌。

### 可以改用本地服务器吗？ {#can-i-use-a-local-server-instead}

可以。将 `hindsightApiUrl` 留空，让钩子连接本地 Hindsight 守护进程。

### 如何排查记忆缺失？ {#how-do-i-debug-missing-memories}

启用 `debug`，检查 stderr 输出，并确认 Codex 存入和召回时使用的是同一个记忆库 ID。

## 后续步骤 {#next-steps}

- 如果你需要托管式记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)开始操作。
- 查阅 [Hindsight 的召回 API](/developer/api/recall)。
- 查阅 [Hindsight 的存入 API](/developer/api/retain)。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中的相关工作流。
