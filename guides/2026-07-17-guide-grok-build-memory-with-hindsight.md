---
title: "指南：使用 Hindsight 为 Grok Build 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, grok-build, coding-agents, memory]
description: "使用 hindsight-memory 插件每提示召回、存储对话，跨会话提供 Grok Build 记忆。"
image: /img/guides/guide-grok-build-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Grok Build 添加记忆](/img/guides/guide-grok-build-memory-with-hindsight.svg)

Grok Build 原生读取 Claude Code 插件，同插件无需修改，每提示召回注入、每回复提取存储。

钩子、MCP、技能和市场元数据可直接用。UserPromptSubmit 自动召回、Stop 自动存储，跨会话延续。

本指南介绍市场、安装、提取提供商、范围和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `claude plugin marketplace add vectorize-io/hindsight`.
> 2. `claude plugin install hindsight-memory`.
> 3. 设置提取用 OPENAI_API_KEY 或 ANTHROPIC_API_KEY。
> 4. 运行 grok，自动激活。
> 5. 验证后续。

## 前提条件 {#prerequisites}

开始前确认：

- 正常 grok。
- 可用 claude CLI 安装。
- 提取提供商密钥或外部后端。
- 不希望本地时可选 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：添加市场安装 {#step-1-add-the-marketplace-and-install-the-plugin}

标准 Claude 命令，Grok 自动发现激活。

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

同插件所有功能配置和知识工具可用。

## 步骤 2：提取提供商 {#step-2-configure-a-provider-for-memory-extraction}

设置自动检测密钥：

```bash
# 方案 A：OpenAI，自动检测 {#option-a-openai-auto-detected}
export OPENAI_API_KEY="sk-your-key"

# 方案 B：Anthropic，自动检测 {#option-b-anthropic-auto-detected}
export ANTHROPIC_API_KEY="your-key"
```

或外部服务器：

```bash
mkdir -p ~/.hindsight
echo '{"hindsightApiUrl": "https://your-hindsight-server.com"}' > ~/.hindsight/claude-code.json
```

## 步骤 3：启动 {#step-3-start-grok-build}

正常启动自动激活：

```bash
grok
```

后台捕获召回，无流程变化。

## 插件如何使用 {#how-the-plugin-uses-memory}

生命周期：

- **自动召回**：每提示查询，additionalContext 注入，模型可见而非聊天记录。
- **自动存储**：每回复或 N 轮提取内容长期保存。
- **知识工具**：通过 agent_knowledge_recall、agent_knowledge_ingest 直接读写搜索。
- **守护管理**：自动启停 embed 或连接外部。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 按项目和工具 {#per-project-and-per-tool-memory}

默认共享 Claude 配置和记忆，动态隔离：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

不同目录分库，同代码库 git 工作树默认共享。

想与 Claude 分开，在 Grok shell 覆盖名称：

```bash
export HINDSIGHT_AGENT_NAME=grok-build
export HINDSIGHT_BANK_ID=grok_build
grok
```

完整见 [Claude Code 配置](https://hindsight.vectorize.io/sdks/integrations/claude-code#configuration)。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 项目 grok。
2. 告知决策约定。
3. 退出存储。
4. 同项目再次。
5. 询问。

至少一次存储才可用，完成会话再新会话。debug true 可 stderr 确认。

## 常见错误 {#common-mistakes}

### 首次存储前查 {#checking-recall-before-the-first-retain-cycle}

先完整会话再测试。

### 忘记提取提供商 {#forgetting-the-extraction-provider}

无密钥也无外部，提取不运行。

### 假定与 Claude 分开 {#assuming-grok-build-and-claude-code-memory-are-separate}

默认共享，隔离需名称和 ID。

### 期待自动项目隔离 {#expecting-projects-to-be-isolated-automatically}

无动态全部一库，启用。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，本地 embed 或自托管。

### 改用法吗？ {#does-this-change-how-i-use-grok-build}

不改，后台自动。

### 如何限定？ {#how-is-memory-scoped}

默认工具共享，动态项目、环境分工具。

### 插件不出现或钩子不运行？ {#the-plugin-isnt-listed-or-hooks-arent-firing--what-do-i-check}

grok plugin list、grok inspect 的 Hooks，debug stderr。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Grok Build 集成文档](/sdks/integrations/coding-agents#-grok-build)。
