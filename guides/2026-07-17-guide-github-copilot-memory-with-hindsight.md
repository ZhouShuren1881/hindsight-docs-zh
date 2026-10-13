---
title: "指南：使用 Hindsight 为 GitHub Copilot 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, github-copilot, coding-agents, memory]
description: "CLI 配置 VS Code MCP 和召回存储规则，让 Copilot 智能体跨任务记忆。"
image: /img/guides/guide-github-copilot-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 GitHub Copilot 添加记忆](/img/guides/guide-github-copilot-memory-with-hindsight.svg)

一次 CLI 写 MCP 和 copilot-instructions 规则，智能体模式跨任务记住项目。

VS Code 支持含头 HTTP MCP 和每聊天指令。服务器提供三工具，规则要求任务前召回、工作中存储持久事实。

本指南介绍 CLI、init、范围和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-copilot`.
> 2. 项目运行 init，传令牌和 my-project。
> 3. 写 MCP 配置和规则。
> 4. 重载 VS Code，智能体聊天工具菜单启动服务器。
> 5. 验证后续任务。

## 前提条件 {#prerequisites}

开始前确认：

- VS Code Copilot Chat **智能体模式**。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 项目工作区，init 写 .vscode 和 .github。

## 步骤 1：安装 CLI {#step-1-install-the-cli}

pip 安装。

```bash
pip install hindsight-copilot
```

仅配置，不聊天运行，MCP 运行时操作。

## 步骤 2：接入项目 {#step-2-wire-up-your-project}

目标目录 init：

```bash
pip install hindsight-copilot
cd your-project
hindsight-copilot init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

合并 servers、写规则，条目：

```json
{
  "servers": {
    "hindsight": {
      "type": "http",
      "url": "https://api.hindsight.vectorize.io/mcp/my-project/",
      "headers": { "Authorization": "Bearer hsk_..." }
    }
  }
}
```

重载、智能体模式、工具菜单启动。

自托管开放本地无令牌，传 URL：

```bash
hindsight-copilot init --api-url http://localhost:8888 --bank-id my-project
```

JSON 有注释不会重写，而输出粘贴片段。也可仅打印：

```bash
hindsight-copilot init --print-only
```

## 集成如何使用 {#how-the-integration-uses-memory}

无逐提示包装，两接口：

- **MCP 工具**：HTTP 服务器提供三操作，URL 最后路径是库。
- **指令规则**：工作区每聊天应用，指导任务前召回、持续存储。

规则告诉 Copilot 时机，无需手动记得。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 记忆库 {#memory-banks}

--bank-id 默认 copilot，URL 最后段，隔离项目。

同库其他编辑器智能体共享约定。

也可环境 BANK_ID、API URL 和令牌，完整见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/github-copilot)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. status 确认配置。
2. 智能体任务记录决策。
3. 同工作区新聊天。
4. 询问。
5. 确认。

例如：

- 首任务重构认证、记录重试原因。
- 后续问约定。

召回就有效。

## 常见错误 {#common-mistakes}

### 未启动 MCP {#not-starting-the-mcp-server-in-the-chat}

init 后还需重载、智能体模式、菜单启动，否则无工具。

### 带注释 JSON {#editing-an-mcpjson-that-has-comments}

不会重写，自行粘贴或 print-only。

### Cloud 无令牌 {#expecting-cloud-to-work-without-a-token}

Cloud 必需，本地开放不需。

### 默认共享 {#assuming-banks-are-shared-by-default}

各库独立，共享需同 ID。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，开放本地 URL 无令牌。

### 改用法吗？ {#does-this-change-how-i-use-copilot}

不改，仍智能体聊天，规则指导。

### 如何限定？ {#how-is-memory-scoped}

按 --bank-id，默认 copilot，URL 最后段。

### 如何移除？ {#how-do-i-remove-it}

uninstall 移除条目规则，status 查看。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [GitHub Copilot 集成文档](/sdks/integrations/github-copilot)。
