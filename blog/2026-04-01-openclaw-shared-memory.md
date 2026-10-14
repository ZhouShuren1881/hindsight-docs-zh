---
title: "你们的 OpenClaw 智能体彼此陌生，Hindsight 可以改变这一点"
authors: [benfrank241]
date: 2026-04-01T09:00
tags: [openclaw, memory, hindsight, tutorial]
image: /img/blog/openclaw-shared-memory.webp
description: "运行多个 OpenClaw 实例时，每个实例都会独立学习。本文介绍如何让团队中的每个实例共用一个记忆库，使每个实例学到的内容都能被其他实例获知。"
hide_table_of_contents: true
---

![你们的 OpenClaw 智能体彼此陌生，Hindsight 可以改变这一点](/img/blog/openclaw-shared-memory.webp)

你正在运行多个 OpenClaw 实例。也许一个负责客户支持，一个服务开发团队，还有一个充当私人助理。每个实例都在履行自己的职责：与人对话、获取上下文、了解哪些事情重要。但默认情况下，这些学习成果彼此不共享。一个实例解决了某个问题，其他实例却都要从头开始。

无法共享记忆的智能体团队，算不上真正的团队。

<!-- truncate -->

Hindsight 通过共享记忆库解决这个问题：所有实例都从同一个存储中读取内容并写入内容。一个智能体学到一件事，所有智能体都能知道。只需更改一项配置。

---

## 为什么各个实例各自为战 {#why-instances-learn-in-silos}

[hindsight-openclaw 插件](/sdks/integrations/openclaw)默认会创建独立的记忆库。每个实例都会根据自身配置生成一个记忆库 ID：

```
Instance A  →  bank: openclaw-instance-a
Instance B  →  bank: openclaw-instance-b
Instance C  →  bank: openclaw-instance-c
```

如果你需要完全隔离，这个默认设置很合适。但如果这些实例服务于相同的用户，或在同一个项目中运行，每个智能体就会独立学习，学习成果也无法累积。

---

## 设置 {#setup}

### 第 1 步：获取 Hindsight API 端点 {#step-1-get-a-hindsight-api-endpoint}

要共用记忆库，需要有一台所有实例都能访问的外部 Hindsight 服务器。最快的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：注册账号、创建记忆库，然后获取 API URL 和令牌。

如果你需要完全掌控数据，也可以在自己的基础设施上[自托管 Hindsight](/developer/installation)。

### 第 2 步：配置用于提取的 LLM 提供商 {#step-2-configure-an-llm-provider-for-extraction}

Hindsight 需要调用 LLM，在后台从对话中提取事实。它使用的 LLM 与智能体的主模型相互独立。在每台机器上任选一种方式设置：

```bash
# OpenAI（默认使用 gpt-4o-mini）
export OPENAI_API_KEY="sk-..."

# Anthropic（默认使用 claude-3-5-haiku）
export ANTHROPIC_API_KEY="sk-ant-..."

# Gemini
export GEMINI_API_KEY="..."

# Claude Code 或 Codex（无需密钥）
export HINDSIGHT_API_LLM_PROVIDER=claude-code
```

任何兼容 OpenAI API 的端点也都可以使用，例如 OpenRouter 或本地模型。这里使用较小、成本较低的模型就可以；提取事实不需要用能力最强的模型。

### 第 3 步：安装插件 {#step-3-install-the-plugin}

在团队中的每台机器上运行：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

你应该会看到：

```
Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw".
Installed plugin: hindsight-openclaw
```

这表示 Hindsight 已接管该实例的记忆槽。

### 第 4 步：让每个实例使用共享记忆库 {#step-4-point-every-instance-at-the-shared-bank}

将每个实例配置为连接同一个 Hindsight 端点，并关闭按实例生成记忆库 ID 的功能。在**每台运行实例的机器**上的 `~/.openclaw/openclaw.json` 文件中进行配置：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://api.hindsight.vectorize.io",
          "hindsightApiToken": "hsk_your_token",
          "dynamicBankId": false
        }
      }
    }
  }
}
```

`dynamicBankId: false` 会关闭默认的记忆库 ID 派生功能。所有实例都会读写同一个记忆库。一个实例学到的内容，所有实例都能知道。

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  OpenClaw    │   │  OpenClaw    │   │  OpenClaw    │
│ 实例 A       │   │ 实例 B       │   │ 实例 C       │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Hindsight 记忆库    │
              │     （共享记忆库）    │
              └───────────────────────┘
```

---

## 模式：按用户共享记忆 {#pattern-per-user-shared-memory}

对于某些使用场景，单个全局记忆库涵盖的范围太广。如果你的实例服务多个用户，你可能希望同一用户的上下文能在各个实例间保持一致，同时避免不同用户的上下文混在一起。

将 `dynamicBankGranularity` 设为 `["user"]`：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://api.hindsight.vectorize.io",
          "hindsightApiToken": "hsk_your_token",
          "dynamicBankGranularity": ["user"]
        }
      }
    }
  }
}
```

现在，团队中的每个实例都会按用户共享记忆。用户 A 的上下文会随其在各个实例间流转；用户 B 的上下文则保持独立。实例之间无需互相了解，它们只需召回与当前对话用户相关的内容。

---

## 哪些内容会共享 {#what-gets-shared}

使用统一的记忆库后，团队中所有实例的知识都会累积起来：

- **用户偏好**：用户喜欢怎样组织回复、哪些事情需要避免，以及沟通风格
- **进行中的项目**：用户在构建什么、项目处于哪个阶段，以及参与者
- **重复出现的上下文**：日程安排、重要关系，以及正在跟踪的事项
- **决策和历史**：用户提过的事情，以及他们正在处理的问题

使用 `retainMission`，让提取聚焦于真正值得在实例间传递的内容：

```json
{
  "retainMission": "Extract user preferences, ongoing projects, recurring commitments, and important context. Retain facts that would be useful in any future conversation. Skip ephemeral task details and one-off requests."
}
```

如果没有明确的任务说明，记忆库就会把所有内容都积累下来。设置任务说明后，只有能推广到其他对话中的上下文才会被存入。

---

## 实际使用效果 {#what-it-looks-like-in-practice}

某个用户告诉一个实例，他们计划在下周五推出一款产品，需要留出时间处理相关事务。对话结束后，Hindsight 会把这两条事实提取到共享记忆库中。

第二天，同一用户转而向另一个实例寻求帮助，想安排本周的优先事项。那个实例已经知道产品发布的安排。用户不用重复说明，也不用粘贴上下文；实例会自动获知这些信息，因为团队中的所有实例都读取同一份记忆。

---

## 托管选项 {#hosting-options}

这两种模式都需要一台外部 Hindsight 服务器，以便所有实例都能连接到同一个存储：

| 选项 | 设置 | 数据控制 | 适用场景 |
|--------|-------|-------------|----------|
| **Hindsight Cloud** | 无需设置，只需一个 API 令牌 | 由 Vectorize 托管 | 大多数团队 |
| **自托管** | 通过 Docker 部署到自己的基础设施 | 完全由你掌控 | 对隐私敏感的场景 |
| **每台机器本地运行** | 在每台设备上运行 `hindsight-embed` | 仅限本地 | 仅适用于单个实例，无法共享 |

对于大多数团队，Hindsight Cloud 是合适的起点。创建账号、生成 API 令牌，然后将配置部署到各个实例。若要完全掌控数据，可以使用[自托管部署](/developer/installation)。

---

## 检查清单 {#checklist}

1. [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)（或自行托管），并获取 API URL 和令牌
2. 在每台机器上设置用于提取的 LLM API 密钥
3. 在每台机器上运行 `openclaw plugins install @vectorize-io/hindsight-openclaw`
4. 为每个实例添加共享记忆库配置（`dynamicBankId: false` 或 `dynamicBankGranularity: ["user"]`）
5. 可选：添加 `retainMission`，以限定存入内容的重点
6. 启动各个实例，记忆库就会从第一次对话开始逐步建立

实例之间互动越多，共享记忆库中累积的内容就越丰富。每个实例都能从团队中其他实例的对话里学到东西。

---

*设置集成：[OpenClaw](/sdks/integrations/openclaw) · [记忆库参考](/developer/api/memory-banks)*
