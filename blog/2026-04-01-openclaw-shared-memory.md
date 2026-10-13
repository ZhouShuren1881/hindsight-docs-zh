---
title: "你们的OpenClaw智能体彼此是陌生人。 Hindsight 改变了这一点。"
authors: [benfrank241]
date: 2026-04-01T09:00
tags: [openclaw, memory, hindsight, tutorial]
image: /img/blog/openclaw-shared-memory.webp
description: "当您运行多个OpenClaw实例时，每个实例都独立学习。以下是如何为团队中的每个实例提供一个共享的记忆库，以便每个人都知道所学的内容。"
hide_table_of_contents: true
---

![你们的OpenClaw智能体彼此是陌生人。 Hindsight 改变了这一点。](/img/blog/openclaw-shared-memory.webp)

您正在运行多个OpenClaw 实例。也许一位负责客户支持，一位为您的开发团队服务，一位是私人助理。每个实例都在做自己的工作——进行对话、了解上下文、了解重要的事情。但默认情况下，这些学习都不会被共享。一个实例解决了一些问题；所有其他实例都从零开始。

一个无法共享记忆的智能体团队并不是真正的团队。

<!-- truncate -->

Hindsight 通过共享记忆库解决了这个问题——每个实例都可以读取和写入的单个存储。一个智能体可以学习一些东西；每个智能体都知道这一点。一项配置更改。

---

## 为什么实例在孤岛中学习 {#why-instances-learn-in-silos}

[hindsight-openclaw 插件](/sdks/integrations/openclaw)默认创建单独的记忆库。每个实例从其配置中派生出自己的记忆库 ID：

```
Instance A  →  bank: openclaw-instance-a
Instance B  →  bank: openclaw-instance-b
Instance C  →  bank: openclaw-instance-c
```

当您想要完全隔离时，此默认值是有意义的。但是，当您的实例为相同的用户工作或在同一个项目上运行时，这意味着每个智能体都在独立学习 - 并且这些学习都不会复合。

---

## 设置 {#setup}

### 第1步：获取HindsightAPI端点 {#step-1-get-a-hindsight-api-endpoint}

共享记忆库需要所有实例都可以访问的外部Hindsight服务器。最快的选项是 [Hindsight Cloud](https://ui.hindsight.vectorize.io) — 注册、创建记忆库，并获取 API URL 和令牌。

如果您需要完整的数据控制，您可以在自己的基础设施上[自托管Hindsight](/developer/installation)。

### 第 2 步：配置用于提取的 LLM 提供程序 {#step-2-configure-an-llm-provider-for-extraction}

Hindsight 需要LLM 从后台对话中提取事实。这与你的智能体的主要模型是分开的。在每台机器上设置其中之一：

```bash
#OpenAI（默认使用 gpt-4o-mini）
export OPENAI_API_KEY="sk-..."

#Anthropic（默认使用 claude-3-5-haiku）
export ANTHROPIC_API_KEY="sk-ant-..."

# Gemini
export GEMINI_API_KEY="..."

#Claude Code或Codex（无需密钥）
export HINDSIGHT_API_LLM_PROVIDER=claude-code
```

任何OpenAI兼容端点也可以工作——OpenRouter、本地模型等。小型、便宜的模型在这里就可以了；提取不需要您最有能力的模型。

### 第三步：安装插件 {#step-3-install-the-plugin}

在团队中的每台机器上运行：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

你应该看到：

```
Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw".
Installed plugin: hindsight-openclaw
```

这确认Hindsight已接管该实例上的记忆槽。

### 第4步：将每个实例指向共享记忆库 {#step-4-point-every-instance-at-the-shared-bank}

将每个实例配置为使用相同的Hindsight端点并禁用每个实例的记忆库派生。在 `~/.openclaw/openclaw.json` 中 **每台运行实例的机器**：

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

`dynamicBankId: false` 禁用默认记忆库导出。所有实例都在同一个记忆库中写入和读取。学什么，大家都知道。

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  OpenClaw    │   │  OpenClaw    │   │  OpenClaw    │
│  Instance A  │   │  Instance B  │   │  Instance C  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Hindsight Memory    │
              │   (shared bank)       │
              └───────────────────────┘
```

---

## 模式：每用户共享记忆 {#pattern-per-user-shared-memory}

对于某些设置，单个全局记忆库过于广泛。如果您的实例为多个用户提供服务，您可能希望每个用户的上下文在实例之间保持一致，但用户之间不会发生冲突。

将`dynamicBankGranularity`设置为`["user"]`：

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

现在，团队中的每个实例都共享每个用户的记忆。用户 A 的上下文在每个实例中都跟随他们。用户 B 的上下文保持独立。这些实例不需要了解彼此的任何信息——它们只是记忆与它们正在交谈的用户相关的内容。

---

## 分享内容 {#what-gets-shared}

通过统一的记忆库，知识可以在团队中的每个实例中积累：

- **用户偏好**：他们喜欢怎样的回答结构、要避免的事情、沟通方式
- **正在进行的项目**：他们正在构建什么，处于什么阶段，谁参与了
- **重复上下文**：时间表、关键关系、正在跟踪的事物
- **决策和历史**：用户提到的事情，他们正在解决的问题

使用`retainMission`将提取集中在实际传输的内容上：

```json
{
  "retainMission": "提取用户偏好、正在进行的项目、经常性承诺和重要背景。 记忆存储在未来任何对话中都会有用的事实。跳过临时任务细节和一次性请求。"
}
```

如果没有专注的使命，记忆库就会积累一切。对于其中之一，只有跨对话概括的上下文才会被保留。

---

## 实际情况如何 {#what-it-looks-like-in-practice}

一位用户告诉一个实例，他们将在下周五推出一款产品，需要保护他们的日历。谈话结束； Hindsight 将这两个事实提取到共享记忆库中。

第二天，同一个用户转到不同的实例并请求帮助确定他们一周的优先级。该实例已经知道发射。用户没有重复自己的话。他们没有在上下文中粘贴。它只是知道——因为团队中的每个实例都来自相同的记忆。

---

## 托管选项 {#hosting-options}

两种模式都需要外部 Hindsight 服务器，以便所有实例都可以连接到同一存储。

|选项|设置|数据控制|最适合|
|--------|-------|-------------|----------|
|**Hindsight Cloud**|零设置，1 个 API 令牌|由 Vectorize 托管|大多数团队|
|**自托管**|通过Docker部署在您自己的基础设施上|完全属于你|隐私敏感设置|
|**每台机器本地**|在每台设备上运行 `hindsight-embed`|仅限本地|仅单实例，不可共享|

对于大多数团队来说，Hindsight Cloud是正确的起点。创建帐户，生成 API 令牌，在实例中部署配置。对于需要完全数据控制的设置，[自托管部署](/developer/installation) 可以满足您的要求。

---

## 清单 {#checklist}

1. [注册Hindsight Cloud](https://ui.hindsight.vectorize.io)（或自托管）并获取您的API URL 和令牌
2. 在每台机器上设置提取LLMAPI密钥
3. 在每台机器上运行`openclaw plugins install @vectorize-io/hindsight-openclaw`
4. 将共享记忆库配置（`dynamicBankId: false`或`dynamicBankGranularity: ["user"]`）添加到每个实例
5. （可选）添加`retainMission`以重点关注保留的内容
6. 启动每个实例——记忆库从第一次对话开始构建

您的实例交互越多，共享记忆库积累的就越多。每个实例都从其他实例的对话中变得更加聪明。

---

*设置集成：[OpenClaw](/sdks/integrations/openclaw)·[记忆库参考](/developer/api/memory-banks)*
