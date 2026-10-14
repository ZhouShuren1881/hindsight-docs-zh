---
title: "将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [integrations, chatgpt, perplexity, guide]
description: "通过 MCP、OAuth 和自定义指令将 ChatGPT 和 Perplexity 连接到 Hindsight，让这两个工具能够保留上下文，而不是每次都从零开始。"
image: /img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp
hide_table_of_contents: true
---

![将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆](/img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp)

如果您想**将 ChatGPT 和 Perplexity 连接到 Hindsight**，现在已经有清晰的文档说明如何连接这两个工具。新的官方集成指南展示了在两个界面中都适用的相同核心流程：添加远程 MCP 连接器，在浏览器中完成 OAuth，然后明确指示模型存入和召回有用的上下文。设置时，请打开[ChatGPT 集成指南](https://hindsight.vectorize.io/sdks/integrations/chatgpt)、[Perplexity 集成指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)、[MCP 服务器文档](/developer/mcp-server)和[文档首页](https://hindsight.vectorize.io)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 两种集成都使用 Hindsight MCP 端点和基于浏览器的 OAuth，因此无需在模型界面中粘贴 API 密钥。
- 如果希望自动存入和召回，而不是手动使用工具，就需要分别向 ChatGPT 和 Perplexity 提供明确指令。
- 最简单的起步方式是每个工具使用一个记忆库；只有在确实需要跨工具共享记忆时，再改用共享记忆库。

## 文档有哪些变化 {#what-changed-in-the-docs}

最大的改进不是引入了新的传输方式，而是把说明讲清楚了。Hindsight 现在为 [ChatGPT](https://hindsight.vectorize.io/sdks/integrations/chatgpt) 和 [Perplexity](https://hindsight.vectorize.io/sdks/integrations/perplexity) 分别提供了专门的设置页面，其中集中列出了实际使用的 MCP URL、OAuth 流程和自定义指令示例。

这一点很重要：如果连接器已经创建，但模型从不调用它，集成就只完成了一半。新文档明确指出，先配置连接器，再告诉工具何时存入、何时召回。

## 先连接 ChatGPT {#connect-chatgpt-first}

在 ChatGPT 中，依次前往**设置**、**应用和连接器**，然后创建一个指向以下地址的连接器：

```text
https://api.hindsight.vectorize.io/mcp/default/
```

创建后，浏览器应该会打开 Hindsight OAuth 授权流程。完成授权后，添加自定义指令，告诉 ChatGPT 在每次回复后存入重要事实、决策和约束，并在回答前召回相关记忆。

检查 ChatGPT 中的设置是否成功很简单：打开一个聊天，选择连接器，然后让 ChatGPT 记住一条具体事实。如果这次往返流程失败，请先停下来修复连接器，再调整提示。

## 再连接 Perplexity {#connect-perplexity-second}

Perplexity 使用相同的基本模式，但多了一个门槛：远程 MCP 连接器需要 **Perplexity Pro**。

在**设置**中使用相同的 MCP 服务器 URL，然后依次前往**连接器**和**自定义连接器**。完成 OAuth 授权后，添加自定义指令，告诉 Perplexity 在每次搜索后存入发现、来源和搜索模式。

Perplexity 擅长将当前的网络搜索与您在以往研究会话中已掌握的内容结合起来。这正是 Hindsight 所补充的能力。

## 选择使用独立记忆还是共享记忆 {#decide-whether-you-want-separate-or-shared-memory}

有两种合理的起步方式：

1. **为 ChatGPT 和 Perplexity 使用独立的记忆库**，这种方式更简单，也能减少意外混用。
2. **使用共享记忆库**，适用于两个工具共同处理同一项目、需要利用相同的研究结果、决策和约束继续工作的情况。

如果不确定，就先使用独立记忆库。有了明确理由后，再切换到共享设置。关于共享模式，[MCP 服务器文档](/developer/mcp-server)和 [Perplexity 指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)中的后续工作流有更直接的说明。

## 排查首次连接问题 {#troubleshooting-the-first-connection}

最常见的问题都很普通，但也都能解决：

- 连接器已经创建，但模型从不调用它。这通常是自定义指令的问题。
- OAuth 已成功，但工具调用返回空结果。这通常是因为记忆库中还没有有用的存入内容。
- 一个工具能用，另一个不能。这通常意味着配置的 URL 不同，或者您在浏览器中授权了另一个 Hindsight 帐户。
- Perplexity 完全没有显示该功能。这通常意味着帐户没有订阅 Pro 方案。

请分别检查三件事：连接器已添加、OAuth 已授权、工具行为已在真实对话中验证。

## 常见问题 {#faq}

### 我需要在 ChatGPT 或 Perplexity 中填写 API 密钥吗？ {#do-i-need-api-keys-inside-chatgpt-or-perplexity}

不需要。文档说明的集成流程使用基于浏览器的 OAuth，通过 Hindsight MCP 服务器完成授权。

### 我应该立即启用自动存入吗？ {#should-i-enable-automatic-retention-immediately}

通常应该，但指令应聚焦于持久有效的事实、决策和发现。把每次无关紧要的对话都存入，会让记忆库变得嘈杂。

### 应该先连接哪个工具？ {#which-tool-should-i-wire-up-first}

先连接您使用更频繁的工具。对于推理工作流，ChatGPT 通常更适合作为首个配置；对于研究密集型工作，Perplexity 是很好的第二步。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [ChatGPT 集成指南](https://hindsight.vectorize.io/sdks/integrations/chatgpt)
- [Perplexity 集成指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)
- [MCP 服务器文档](/developer/mcp-server)
- [文档首页](https://hindsight.vectorize.io)
