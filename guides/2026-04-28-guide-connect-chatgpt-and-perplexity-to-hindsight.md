---
title: "将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [integrations, chatgpt, perplexity, guide]
description: "通过 MCP、OAuth 和自定义指令，将 ChatGPT 和 Perplexity 连接到 Hindsight，让两者存储上下文，而非从零开始。"
image: /img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp
hide_table_of_contents: true
---

![将 ChatGPT 和 Perplexity 连接到 Hindsight 记忆](/img/guides/guide-connect-chatgpt-and-perplexity-to-hindsight.webp)

如果希望**将 ChatGPT 和 Perplexity 连接到 Hindsight**，两种工具现在都有明确文档。官方集成指南介绍了共同模式：添加远程 MCP 连接器、在浏览器完成 OAuth，再明确指示模型存储和召回有用上下文。配置时可参考 [ChatGPT 集成指南](https://hindsight.vectorize.io/sdks/integrations/chatgpt)、[Perplexity 集成指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)、[MCP 服务器文档](/developer/mcp-server)和[文档首页](https://hindsight.vectorize.io)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 两种集成都使用 Hindsight MCP 端点和浏览器 OAuth，无需在模型界面粘贴 API 密钥。
- 如需自动存储和召回，而非手动调用工具，ChatGPT 和 Perplexity 都需要明确指令。
- 最简单的起点是每个工具独立记忆库，确实需要跨工具记忆后再共享。

## 文档有什么变化 {#what-changed-in-the-docs}

主要改进不是新传输方式，而是说明更清楚。Hindsight 为 [ChatGPT](https://hindsight.vectorize.io/sdks/integrations/chatgpt)和 [Perplexity](https://hindsight.vectorize.io/sdks/integrations/perplexity)提供专门页面，将实际 MCP URL、OAuth 流程和自定义指令示例放在一起。

连接器存在但模型从不调用，集成只能算完成一半。新文档明确说明：先连接，再告诉工具何时存储和召回。

## 先连接 ChatGPT {#connect-chatgpt-first}

在 ChatGPT 的 **Settings（设置）**中打开 **Apps & Connectors（应用与连接器）**，创建指向以下地址的连接器：

```text
https://api.hindsight.vectorize.io/mcp/default/
```

创建后，浏览器应打开 Hindsight OAuth 授权流程。完成后添加自定义指令，让 ChatGPT 每次回复后存储重要事实、决策和约束，并在回答前召回相关记忆。

可以直接验证 ChatGPT 配置：打开聊天、选择连接器、让它记住具体事实。如果往返调用失败，先修复连接器，再调整提示词。

## 再连接 Perplexity {#connect-perplexity-second}

Perplexity 采用相同基本模式，但远程 MCP 连接器要求 **Perplexity Pro**。

在 **Settings（设置）**、**Connectors（连接器）**、**Custom Connector（自定义连接器）**中使用相同 MCP URL。完成 OAuth 授权，再添加指令，要求每次搜索后存储发现、来源和搜索模式。

Perplexity 将当前网络搜索与此前研究成果结合时最强，Hindsight 增加的正是后一部分。

## 决定独立还是共享记忆 {#decide-whether-you-want-separate-or-shared-memory}

有两个合理起点：

1. ChatGPT 和 Perplexity **独立记忆库**，更简单，减少意外混合。
2. 两个工具处理同一项目、应利用相同研究、决策和约束时，使用**共享记忆库**。

不确定时先分开，有具体理由再共享。[MCP 服务器文档](/developer/mcp-server)和 [Perplexity 指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)的后续工作流更直接介绍共享模式。

## 排查首次连接 {#troubleshooting-the-first-connection}

常见遗漏都很普通，也可以修复：

- 连接器存在但模型从不调用，通常是自定义指令问题。
- OAuth 成功但工具返回为空，通常是记忆库尚无有用内容。
- 一个工具有效另一个无效，通常配置了不同 URL，或授权了不同 Hindsight 账户。
- Perplexity 完全不显示功能，通常是账户没有 Pro 套餐。

将配置分为三个独立检查：已添加连接器、已完成 OAuth 授权、已在真实对话验证工具行为。

## 常见问题 {#faq}

### 需要在 ChatGPT 或 Perplexity 中提供 API 密钥吗？ {#do-i-need-api-keys-inside-chatgpt-or-perplexity}

不需要。文档介绍的集成通过浏览器 OAuth 连接 Hindsight MCP 服务器。

### 应立即启用自动存储吗？ {#should-i-enable-automatic-retention-immediately}

通常应该，但指令应聚焦持久事实、决策和发现。保存每个琐碎交互会增加噪声。

### 应先连接哪个工具？ {#which-tool-should-i-wire-up-first}

从使用更频繁的开始。推理流程通常先配置 ChatGPT，研究密集型任务适合随后接入 Perplexity。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [ChatGPT 集成指南](https://hindsight.vectorize.io/sdks/integrations/chatgpt)
- [Perplexity 集成指南](https://hindsight.vectorize.io/sdks/integrations/perplexity)
- [MCP 服务器文档](/developer/mcp-server)
- [文档首页](https://hindsight.vectorize.io)
