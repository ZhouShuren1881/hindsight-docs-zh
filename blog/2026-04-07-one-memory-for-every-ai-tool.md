---
title: "我使用的每个AI工具都有一个记忆"
authors: [404sand808s]
date: 2026-04-07
tags: [mcp, memory, claude, claude-code, openai, hindsight, integration, self-hosting, tutorial]
description: "如何使用 Cloudflare Workers 作为 OAuth 2.1 代理将 Claude、ChatGPT、Claude Code、Codex 和 OpenClaw 连接到单个共享 Hindsight 记忆库。"
image: /img/blog/one-memory-for-every-ai-tool.webp
hide_table_of_contents: true
---

![我使用的每个AI工具都有一个记忆](/img/blog/one-memory-for-every-ai-tool.webp)

像许多人一样，我全天使用不同的AI工具，具体取决于我在做什么和在哪里。主要是Claude，跨桌面和移动应用程序、Claude Code CLI 和 VS Code 扩展。加上ChatGPT的移动应用程序和Codex桌面版。

<!-- truncate -->

几周前，我添加了一个 OpenClaw 智能体，在 Mac Mini 上运行并连接到 Discord。人们对它的看法存在分歧，但围绕其某些功能的炒作立即引起了人们的注意：除了模型本身之外，它还拥有比传统 AI 界面更广泛的工具集。但最具突破性的部分是记忆。让OpenClaw记住对话中的事情感觉就像是一个真正的转变，从孤立的会话到持久的东西。

那么为什么不用Claude或ChatGPT来做呢？或者更好的是，为什么他们不能共享一个统一的记忆？这就是过去几周我一直在运行的共享记忆模式。

## 问题：AI工具之间没有共享记忆 {#the-problem-no-shared-memory-across-ai-tools}

每个工具都是从零开始的。您向Claude解释您的项目，然后再次向Codex解释，然后在打开新的Claude Code会话时再次解释。上下文不会移动。每个工具都把你当作陌生人，因为对它来说，你就是其中之一。

这不仅仅是不方便。它限制了这些工具可以为您做的事情。上周帮助您设计架构的模型无法以今天的工作为基础，因为它不知道它发生了。

## 愿景：共享记忆 记忆库 {#the-vision-one-shared-memory-bank}

想象一下：在旅途中，一个想法突然出现。您将其插入Claude应用程序并思考几个方面。稍后，您继续使用桌面。然后你切换到 Claude Code开始构建，它已经有了上下文、设计决策以及它们背后的推理。然后你将项目交给OpenClaw。每个工具都从上一个工具停止的地方继续，从相同的共享记忆中提取。

效果是累积的。一周后，你就不再注意到那些你不必再说的事情了。偏好、过去的决定、项目背景、技术选择。这一切都会延续下去，并使每个工具更好地发挥其作用。共享记忆不仅可以节省时间，还可以使输出更好。

## 共享记忆堆栈如何连接在一起 {#how-the-shared-memory-stack-is-wired-together}

如果您使用[Hindsight Cloud](https://ui.hindsight.vectorize.io)，则以下 OAuth 复杂性均不适用 - 它已经使用 OAuth 2.1，因此所有云客户端都直接连接。仅当您自托管时才需要代理设置。

我的[Hindsight](/developer/api/quickstart)记忆库在M4 Mac Mini上以Docker运行（与我的OpenClaw相同）。所有客户端都连接到同一个记忆库，但每个客户端的连接方式不同。

**OpenClaw** 设置最简单。由于位于同一台机器上，[hindsight-openclaw 插件](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight) 使用 [标准Docker快速启动](/developer/api/quickstart) 通过 `localhost` 直接与 Hindsight 对话。

**其他一切**（Claude桌面和移动应用程序、Claude Code和Codex）通过MCP远程连接。由于这些工具不在同一台计算机上，因此我需要通过公共端点公开本地 Hindsight 实例。挑战在于像 Claude 应用程序这样的云客户端需要具有动态客户端注册和 PKCE 的 OAuth 2.1 才能连接到 MCP 服务器，而自托管 Hindsight 仅支持不记名令牌身份验证。没有 OAuth 端点，没有发现元数据。他们不能直接交谈。堆栈需要桥接这个：

- **Hindsight** 在 Mac Mini 上运行于 Docker，绑定到 `localhost`
- **Cloudflare隧道** 通过我拥有的域上的子域公开它
- **Cloudflare Worker**（大约 250 行代码）位于前面，实现完整的 OAuth 2.1 规范（发现、DCR、PKCE S256、令牌交换）并通过隧道将经过身份验证的请求代理到Hindsight
- **云客户端**（Claude应用程序，Claude Code，Codex）通过Worker通过MCP连接

我使用 `@cloudflare/workers-oauth-provider` 构建了 Worker，它处理大部分 OAuth 管道，并将其部署在 Cloudflare 上，并使用用于令牌状态的 KV 命名空间。它为授权流程提供一个简单的登录页面，并在云客户端发送的 OAuth 令牌和 Hindsight 期望的承载令牌之间进行转换。部署后，Claude应用程序将连接（就像在其自定义部分中验证任何其他MCP集成一样）并显示所有Hindsight工具。 Claude Code和Codex通过同一个Worker连接，因为它们的远程MCP支持使用相同的OAuth流程。 Hindsight的[多策略检索架构](/blog/2026/04/02/beam-sota)意味着每个客户端无论如何连接都可以获得高质量的记忆召回。

## 让他们储存记忆 {#getting-them-to-store-memories}

OpenClaw和ClaudeCode的CLI已经具有Hindsight可以锁定的本机钩子系统。 [hindsight-openclaw 插件](/sdks/integrations/openclaw) 在每个回合后自动保留，并在每次响应前自动调用。 [hindsight-Claude Code记忆插件](/sdks/integrations/claude-code)使用Claude Code的钩子架构做同样的事情：`SessionStart`用于健康检查，`UserPromptSubmit`用于自动记忆召回，`Stop`用于自动记忆存储。无需提示。 记忆就这样发生了。

​​但是对于 Claude Code CLI 之外的 Claude，我无法直接从这些钩子中受益。相反，我使用说明。对于 Claude Code 和 VS Code 扩展，用户级 `CLAUDE.md` 文件告诉他们如何以及何时使用记忆召回、存储记忆和联想。对于Claude桌面和移动应用程序和浏览器，相同的说明进入应用程序设置中的“用户首选项”。

在实践中，这效果很好。这些指令告诉模型在对话发生时内联记忆存储重要的上下文，并在结束时进行最后的扫描，以防遗漏任何内容。绝大多数会话在没有我明确询问的情况下访问Hindsight。对于特别重要的对话，我会在最后仔细检查。

理想情况下，Claude的桌面和移动应用程序最终将公开Claude Code的CLI和OpenClaw已经拥有的相同类型的生命周期挂钩。如果应用程序可以触发 MCP 服务器可以订阅的类似 `onConversationEnd` 的事件，那么记忆捕获将根本不依赖于提示指令。构建模块已经存在。 Hindsight 已经为 OpenClaw 和 Claude Code 的 CLI 提供了基于钩子的插件。差距只是应用程序的表面，这是大多数人实际花费时间的地方。

## 下一步是什么 {#whats-next}

我正在与 Hindsight 团队合作，贡献 Worker 作为自托管者的参考 OAuth 代理。该代码是通用的：交换原始 URL 和凭据，部署到您自己的 Cloudflare 帐户，然后连接。

多客户端、单记忆库模式是Hindsight真正的优势。 Hindsight 的架构已经支持在所有这些架构之间共享，仅在 OAuth 方面有一个小差距需要弥补。一件事可以进一步改进这种模式：Claude应用程序中的MCP生命周期挂钩。 Claude Code 的 CLI 已经有了它们，Hindsight 的插件使用它们来自动记忆。将相同的功能引入桌面和移动应用程序将弥补最后一个差距。

尝试此模式的最简单方法是[Hindsight Cloud](https://ui.hindsight.vectorize.io) — 无需基础设施，无需 OAuth 代理，直接连接到所有云客户端。 Worker 参考发布后，自托管者可以使用它。

- **开始使用Hindsight Cloud**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **Claude Code集成**：[/sdks/integrations/claude-code](/sdks/integrations/claude-code)
- **OpenClaw集成**：[/sdks/integrations/openclaw](/sdks/integrations/openclaw)
- **自托管快速入门**：[/开发者/api/快速入门](/developer/api/quickstart)

如果您构建了类似的东西，或者其中任何一个激发了Hindsight如何更好地支持多客户端设置的想法，我很想听听。
