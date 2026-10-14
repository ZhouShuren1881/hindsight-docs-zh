---
title: "我使用的每个 AI 工具，共用一个记忆库"
authors: [404sand808s]
date: 2026-04-07
tags: [mcp, memory, claude, claude-code, openai, hindsight, integration, self-hosting, tutorial]
description: "介绍如何使用 Cloudflare Workers 作为 OAuth 2.1 代理，将 Claude、ChatGPT、Claude Code、Codex 和 OpenClaw 连接到同一个共享 Hindsight 记忆库。"
image: /img/blog/one-memory-for-every-ai-tool.webp
hide_table_of_contents: true
---

![我使用的每个 AI 工具，共用一个记忆库](/img/blog/one-memory-for-every-ai-tool.webp)

和很多人一样，我一天中会根据手头的事和所在的位置使用不同的 AI 工具。我主要用 Claude：桌面和移动应用、Claude Code CLI，以及 VS Code 扩展；此外还会用 ChatGPT 移动应用和桌面版 Codex。

<!-- truncate -->

几周前，我又加入了一个 OpenClaw 智能体。它运行在一台 Mac Mini 上，并连接到 Discord。人们对它褒贬不一，但围绕它某些能力的热潮很快就让我意识到其中的吸引力：除了模型本身，它提供的工具也远比传统 AI 界面丰富。不过，最让我惊喜的是记忆。OpenClaw 能记住不同对话中的内容，这带来了一种真正的转变：我们不再受困于彼此孤立的会话，而是可以拥有持续的记忆。

那为什么不让 Claude 或 ChatGPT 也做到这一点？更进一步说，为什么不能让它们共用一个统一的记忆库？过去几周我一直在使用的就是这种共享记忆模式。

## 问题：AI 工具之间没有共享记忆 {#the-problem-no-shared-memory-across-ai-tools}

每个工具都从零开始。你先向 Claude 解释项目，再向 Codex 解释一遍；每次打开新的 Claude Code 会话，还得再解释一次。上下文无法在工具之间传递。每个工具都把你当成陌生人，因为对它来说，你确实是陌生人。

这不仅仅是不方便，也限制了这些工具能为你做的事。上周帮你设计架构的模型今天无法在此基础上继续工作，因为它不知道那件事曾经发生过。

## 愿景：一个共享记忆库 {#the-vision-one-shared-memory-bank}

想象一下：你在外出途中突然想到一个点子，于是在 Claude 应用里记下来，并围绕几个方面深入思考。之后回到桌面前继续处理。接着切换到 Claude Code 开始构建，它已经掌握了上下文、设计决策及其背后的推理。然后你把项目交给 OpenClaw。每个工具都能从上一个工具停下的地方接着做，并从同一个共享记忆库中提取信息。

这种效果会不断累积。一周之后，你甚至不会再留意那些不必重复说明的内容：偏好、过去的决定、项目背景、技术选择。这些信息都会延续下来，让每个工具更好地完成自己的工作。共享记忆不只节省时间，也能改善输出质量。

## 共享记忆技术栈如何连接 {#how-the-shared-memory-stack-is-wired-together}

如果你使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，就不需要处理下面这些 OAuth 复杂设置：它原生支持 OAuth 2.1，所有云客户端都可以直接连接。只有自托管时才需要配置代理。

我的 [Hindsight](/developer/api/quickstart) 记忆库通过 Docker 运行在一台 M4 Mac Mini 上（和我的 OpenClaw 在同一台机器上）。所有客户端都连接到同一个记忆库，但各自使用不同的连接方式。

**OpenClaw** 的设置最简单。它和 Hindsight 位于同一台机器上，因此 [hindsight-openclaw 插件](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight) 可以通过 `localhost` 直接连接 Hindsight，并使用[标准 Docker 快速入门](/developer/api/quickstart)中的配置。

**其他所有工具**（Claude 桌面和移动应用、Claude Code 及 Codex）都通过 MCP 远程连接。由于这些工具不在同一台机器上，我需要通过公共端点公开本地 Hindsight 实例。难点在于，Claude 应用这类云客户端要连接 MCP 服务器，需要使用支持动态客户端注册和 PKCE 的 OAuth 2.1；而自托管版 Hindsight 只支持 Bearer 令牌身份验证。它没有 OAuth 端点，也没有发现元数据，因此这些客户端无法直接连接。这个技术栈需要在两者之间搭一座桥：

- **Hindsight** 通过 Docker 运行在 Mac Mini 上，并绑定到 `localhost`
- **Cloudflare Tunnel** 通过我拥有的域名下的一个子域名，将它公开到外部
- **Cloudflare Worker**（约 250 行代码）部署在前端，实现完整的 OAuth 2.1 规范（发现、DCR、PKCE S256、令牌交换），再通过隧道将经过身份验证的请求代理到 Hindsight
- **云客户端**（Claude 应用、Claude Code、Codex）通过 Worker 使用 MCP 连接

我使用 `@cloudflare/workers-oauth-provider` 构建了 Worker。它处理了大部分 OAuth 流程；我还在 Cloudflare 上部署了 Worker，并用一个 KV 命名空间保存令牌状态。Worker 会为授权流程提供一个简单的登录页面，并将云客户端发送的 OAuth 令牌转换成 Hindsight 需要的 Bearer 令牌。部署后，Claude 应用就能连接并显示所有 Hindsight 工具，连接过程和在“自定义”设置中验证其他 MCP 集成一样。Claude Code 和 Codex 也通过同一个 Worker 连接，因为它们的远程 MCP 支持使用相同的 OAuth 流程。Hindsight 的[多策略检索架构](/blog/2026/04/02/beam-sota)让每个客户端无论通过哪种方式连接，都能获得高质量的记忆召回。

## 让这些工具存入记忆 {#getting-them-to-store-memories}

OpenClaw 和 Claude Code CLI 都有原生钩子系统，Hindsight 可以接入其中。[hindsight-openclaw 插件](/sdks/integrations/openclaw)会在每轮对话结束后自动存入记忆，并在每次回复前自动召回记忆。[Claude Code 的 hindsight-memory 插件](/sdks/integrations/claude-code)也利用 Claude Code 的钩子架构实现同样的效果：用 `SessionStart` 进行健康检查，用 `UserPromptSubmit` 自动召回记忆，用 `Stop` 自动存入记忆。不需要额外提示，记忆操作会自动进行。

但对于 Claude Code CLI 之外的 Claude，我无法直接利用这些钩子，因此改用指令。对于 Claude Code 和 VS Code 扩展，我在用户级 `CLAUDE.md` 文件中说明何时以及如何使用 recall、retain 和 reflect。对于 Claude 桌面和移动应用以及浏览器，我会把同样的指令填入应用设置中的“用户偏好”。

实际使用效果很好。这些指令会要求模型在对话进行时及时存入重要上下文，并在对话结束时做最后检查，以免遗漏内容。绝大多数会话都会访问 Hindsight，而我不必明确提出要求。对于特别重要的对话，我会在结束时再检查一遍。

理想情况下，Claude 桌面和移动应用以后也能像 Claude Code CLI 和 OpenClaw 一样提供生命周期钩子。如果应用能够触发 MCP 服务器可订阅的 `onConversationEnd` 等事件，记忆捕获就完全不必依赖提示指令。所需的构件已经具备：Hindsight 已经为 OpenClaw 和 Claude Code CLI 提供了基于钩子的插件。缺少的只是应用端的支持，而大多数人实际上都在应用里花时间。

## 接下来 {#whats-next}

我正在和 Hindsight 团队合作，把这个 Worker 贡献为供自托管用户参考的 OAuth 代理实现。代码是通用的：替换源站 URL 和凭据，部署到你自己的 Cloudflare 账户，就可以连接使用。

多客户端共用单个记忆库的模式正是 Hindsight 的优势所在。Hindsight 的架构已经支持所有这些工具共享记忆，只剩 OAuth 这一小处需要补齐。还有一项改进能让这种模式更完善：在 Claude 应用中加入 MCP 生命周期钩子。Claude Code CLI 已经有这些钩子，Hindsight 插件也用它们自动处理记忆。如果桌面和移动应用也有同样的能力，最后这一处差距就能补上。

体验这种模式最简单的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：无需基础设施，也无需 OAuth 代理，可以直接连接所有云客户端。自托管用户则可以在 Worker 参考实现发布后使用它。

- **开始使用 Hindsight Cloud**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **Claude Code 集成**：[/sdks/integrations/claude-code](/sdks/integrations/claude-code)
- **OpenClaw 集成**：[/sdks/integrations/openclaw](/sdks/integrations/openclaw)
- **自托管快速入门**：[/developer/api/quickstart](/developer/api/quickstart)

如果你也构建了类似的东西，或者这篇文章让你想到 Hindsight 如何更好地支持多客户端设置，我很乐意听听你的想法。
