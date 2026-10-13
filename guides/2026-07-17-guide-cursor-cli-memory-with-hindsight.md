---
title: "指南：使用 Hindsight 为 Cursor CLI 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cursor-cli, coding-agents, memory]
description: "通过 Python 钩子每提示召回、每轮自动存储，为 Cursor CLI 添加记忆。"
image: /img/guides/guide-cursor-cli-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cursor CLI 添加记忆](/img/guides/guide-cursor-cli-memory-with-hindsight.svg)

包安装 Python 钩子，提示前召回、轮次后存储，跨会话记住技术栈、偏好和决策。

Cursor CLI 提供钩子而非 MCP，接入 sessionStart、beforeSubmitPrompt、stop、sessionEnd。纯标准库，pip 仅一次安装器。

本指南介绍安装、连接、按项目和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-cursor-cli`.
> 2. 运行带 Cloud URL/令牌的安装命令，本地省标志。
> 3. 重启 Cursor CLI，记忆启用。
> 4. 默认 cursor-cli，动态按项目。
> 5. 验证后续会话。

## 前提条件 {#prerequisites}

开始前确认：

- 支持钩子的 Cursor CLI v0.45+。
- Python 3.9+，纯标准库。
- 可达 [Cloud](https://hindsight.vectorize.io)或本地嵌入守护进程。

## 步骤 1：安装包 {#step-1-install-the-package}

pip 安装一次安装器。

```bash
pip install hindsight-cursor-cli
```

钩子本身零运行依赖。

## 步骤 2：安装钩子 {#step-2-install-the-hooks}

运行一次接入。

Cloud：

```bash
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

本地省标志，默认嵌入连接：

```bash
hindsight-cursor-cli install
```

复制到 `~/.cursor/hooks/cursor-cli/`，合并写 hooks.json，创建个人 cursor-cli.json。重启加载。

卸载移除脚本和条目、保留个人配置：

```bash
hindsight-cursor-cli uninstall
```

## 步骤 3：连接 Hindsight {#step-3-point-the-hooks-at-hindsight}

未传连接参数则写个人配置，更新保留：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

本地留空 URL，独立启动 embed，session_start.py 通过默认 9077 检测：

```bash
uvx hindsight-embed
```

加载后者优先：内置、插件 settings、个人、环境。多数可环境覆盖，如 API URL、令牌、BANK_ID。

## 钩子如何使用 {#how-the-hooks-use-memory}

四事件而非 MCP：

- **召回**：beforeSubmitPrompt 读提示、查询、注入额外上下文，模型可见而非记录。
- **存储**：stop 读取历史、去旧注入标签避免反馈循环、异步 POST；sessionEnd 强制最终存储。

会话 ID 作文档 ID，重复更新而非复制。默认 full-session 全历史，chunked 每 N 轮滑动窗口。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 按项目记忆库 {#per-project-memory-banks}

默认全部 cursor-cli，动态隔离配置：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

目录不同则分开，按工作目录生成。同库全部工作树共享可用 gitProject。

完整配置见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cursor-cli)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 开会话。
2. 告知决策约定。
3. 结束存储。
4. 新会话。
5. 问此前。

默认每 10 轮存，测试个人配置设 1，每轮执行；结束钩子最终强制。

新会话呈现就有效。

## 常见错误 {#common-mistakes}

### 测得太早 {#testing-retain-too-early}

先完成一次，再新会话。

### 测试仍默认 10 {#leaving-retaineverynturns-at-the-default-while-testing}

短会话可能不触发中途，设 1，结束仍刷新。

### 安装后钩子不执行 {#hooks-not-firing-after-install}

确认 hooks.json、python3 在 PATH，重启，必要重新安装写条目。

### 假定默认按项目 {#assuming-memory-is-per-project-by-default}

默认共享，需开启动态。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，省参数独立运行 embed。

### 改用法吗？ {#does-this-change-how-i-use-cursor-cli}

不改，事件自动。

### 如何限定？ {#how-is-memory-scoped}

默认单库，动态按目录。

### 短会话为什么不存？ {#why-arent-my-memories-being-stored-during-a-short-session}

默认每 10 轮，测试设 1，或结束强制。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Cursor CLI 集成文档](/sdks/integrations/cursor-cli)。
