---
title: "将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [integrations, chatgpt, perplexity, guide]
description: "通过 MCP、OAuth 和自定义指令，将 ChatGPT 和 Perplexity 连接到 Hindsight，让两种工具都能存入上下文，而不必每次从头开始。"
image: /img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp
hide_table_of_contents: true
---

![将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆](/img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp)

如果你想**将 ChatGPT 和 Perplexity 连接到 Hindsight**，现在两种工具都有清晰的配置文档。新发布的官方集成指南在两个界面中介绍了相同的核心流程：添加远程 MCP 连接器、在浏览器中完成 OAuth，然后明确指示模型存入和召回有用的上下文。配置时请打开[ChatGPT 集成指南](/sdks/integrations/chatgpt)、[Perplexity 集成指南](/sdks/integrations/perplexity)、[MCP 服务器文档](/developer/mcp-server)和[文档首页](/)备用。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 两种集成都使用 Hindsight MCP 端点和基于浏览器的 OAuth，因此无需在模型界面中粘贴 API 密钥。
- 如果想让 ChatGPT 和 Perplexity 自动存入和召回记忆，而不是手动使用工具，就需要分别为它们提供明确指令。
- 最容易上手的方式是为每种工具各用一个记忆库；只有确实需要跨工具共享记忆时，再改用共享记忆库。

## 文档有哪些变化 {#what-changed-in-the-docs}

最大的改进不是新增了传输方式，而是说明更清楚了。Hindsight 现在分别提供 [ChatGPT](/sdks/integrations/chatgpt)和 [Perplexity](/sdks/integrations/perplexity)专用配置页面，其中集中列出了实际 MCP URL、OAuth 流程和自定义指令示例。

如果连接器已经配置好，但模型从不调用它，集成就只完成了一半。新文档明确指出：先接好连接器，再教会工具何时存入、何时召回。

## 先连接 ChatGPT {#connect-chatgpt-first}

在 ChatGPT 中依次打开 **Settings（设置）**和 **Apps & Connectors（应用与连接器）**，然后创建一个指向以下地址的连接器：

```text
https://api.hindsight.vectorize.io/mcp/default/
```

创建连接器后，浏览器应打开 Hindsight 的 OAuth 授权流程。完成授权后，添加自定义指令，告诉 ChatGPT 在每次回复后存入重要事实、决策和约束，并在回答前召回相关记忆。

验证 ChatGPT 配置很简单：打开一个聊天、选择该连接器，然后要求它记住一条具体事实。如果这次往返调用失败，就先排查并修复连接器，再调整提示词。

## 再连接 Perplexity {#connect-perplexity-second}

Perplexity 使用相同的基本模式，但还有一个额外门槛：远程 MCP 连接器要求 **Perplexity Pro**。

在 **Settings（设置）**、**Connectors（连接器）**和 **Custom Connector（自定义连接器）**中使用相同的 MCP 服务器 URL。完成 OAuth 授权后，添加自定义指令，告诉 Perplexity 在每次搜索后存入发现、来源和搜索模式。

Perplexity 最擅长将当前网络搜索与此前研究会话中积累的知识结合起来。这正是 Hindsight 补上的部分。

## 决定使用独立记忆还是共享记忆 {#decide-whether-you-want-separate-or-shared-memory}

有两种合理的起步方式：

1. 为 ChatGPT 和 Perplexity 使用**独立记忆库**。这种方式更简单，也能减少意外混杂。
2. 如果两个工具正在处理同一个项目，并且需要共享研究、决策和约束，就使用**共享记忆库**。

如果还不确定，就先分开。等有了明确理由，再改为共享设置。[MCP 服务器文档](/developer/mcp-server)和 [Perplexity 指南](/sdks/integrations/perplexity)中的后续工作流更直接地介绍了共享模式。

## 排查首次连接问题 {#troubleshooting-the-first-connection}

最常见的问题都很普通，也都能解决：

- 连接器已经配置，但模型从不调用它。这通常是自定义指令的问题。
- OAuth 已成功，但工具调用返回空结果。这通常是因为记忆库还没有存入有用内容。
- 一个工具能用，另一个不能。这通常意味着配置了不同的 URL，或在浏览器中授权了不同的 Hindsight 账户。
- Perplexity 完全不显示这项功能。这通常意味着账户没有 Pro 套餐。

把配置过程拆成三项检查：连接器已添加、OAuth 已授权、工具行为已在真实对话中验证。

## 常见问题 {#faq}

### 需要在 ChatGPT 或 Perplexity 中填写 API 密钥吗？ {#do-i-need-api-keys-inside-chatgpt-or-perplexity}

不需要。文档介绍的集成方式是通过浏览器 OAuth 连接到 Hindsight MCP 服务器。

### 应该立即启用自动存入吗？ {#should-i-enable-automatic-retention-immediately}

通常应该，但指令应聚焦于值得长期保留的事实、决策和发现。把每次无关紧要的对话都存入记忆库，会让其中内容变得杂乱。

### 应该先连接哪个工具？ {#which-tool-should-i-wire-up-first}

先连接你用得更频繁的那个。对于推理工作流，通常先配置 ChatGPT 更合适；对于研究密集型工作，Perplexity 是很好的第二步。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [ChatGPT 集成指南](/sdks/integrations/chatgpt)
- [Perplexity 集成指南](/sdks/integrations/perplexity)
- [MCP 服务器文档](/developer/mcp-server)
- [文档首页](/)
