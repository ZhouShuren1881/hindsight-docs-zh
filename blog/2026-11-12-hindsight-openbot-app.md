---
title: Hindsight 现已成为 OpenBot 中的应用
authors: [benfrank241]
date: 2026-11-12
tags: [openbot, memory, integrations, mcp, announcement]
description: Hindsight 现已成为 OpenBot 应用市场中可连接的应用。连接一次，机器上的所有智能体就能共享一份跨会话保留的长期记忆。
image: /img/blog/hindsight-openbot-app.webp
hide_table_of_contents: true
---

import Link from '@docusaurus/Link';
import {StaticImage} from '@site/src/components/StaticMedia';

<StaticImage src="/img/blog/hindsight-openbot-app.webp" alt="Hindsight 现已成为 OpenBot 应用市场中可连接的应用" />

Hindsight 现已成为 **OpenBot 应用市场中可连接的应用**。通过 OpenBot 左侧栏底部的店铺按钮打开应用市场，找到 Hindsight 并选择 **Connect**，你机器上的所有智能体就能共享一份长期记忆。

共享记忆正是关键。下面来看看它解决了什么问题。

<StaticImage src="/img/blog/openbot-marketplace-apps.webp" alt="OpenBot 应用市场的 Productivity 分类中列出了 Hindsight，与 Slack、Notion 和 Honcho 并列" />

<!-- truncate -->

## 持续存在的智能体，健忘的团队 {#persistent-agents-forgetful-teams}

一个跨会话持续存在的智能体团队听起来应该能解决上下文问题，但大多时候并非如此。智能体会回来，它们学到的东西却常常不会。

信息会从两个地方流失。对话线程填满时会被压缩，而最先消失的轮次通常正是你解释架构、部署规则以及三个总会出问题的地方的那些轮次。另一方面，一个智能体学到的东西只留在它自己那里，因此周四回答问题的队友并不是你周一交代过情况的那个。再加入第二个工具，割裂就更严重了：每个工具都保留着自己的上下文，彼此之间没有共享。

持续存在的智能体能发挥多大作用，取决于它们记住了什么。

## OpenBot 运行智能体团队 {#openbot-runs-the-team}

Nightly Labs 的 [OpenBot](https://openbot.run) 是一个本地优先的桌面工作空间，用于运行持续存在的 AI 队友。它在你自己的机器上运行一个智能体团队（Claude、Codex、Grok、Gemini、OpenCode、Cursor 和 Cline），每个智能体都有自己的工作空间和任务队列，也可以相互发送消息。这些智能体会持续存在：它们在会话之间保持待命，等待任务。

这是困难的一半。缺失的另一半是与它们一起持续存在的记忆。

## Hindsight 应用为智能体提供什么 {#what-the-hindsight-app-gives-your-agents}

连接应用后，[Hindsight](https://hindsight.vectorize.io) 会以多记忆库地址 `https://api.hindsight.vectorize.io/mcp` 作为 MCP 服务器接入，每个智能体都会获得三种能力：

- 在工作过程中 **Retain（存入）** 新事实和事件，而不必等到会话结束
- 按含义、时间和实体 **Recall（召回）** 记忆，即使措辞不同也能找到正确的事实
- 对所知内容进行 **Reflect（反思）**，形成心智模型

<StaticImage src="/img/blog/openbot-hindsight-listing.webp" alt="OpenBot 中的 Hindsight 应用页面展示了 Recall、Retain 和 Reflect 的入门提示" />

应用页面附带三个入门提示，每种操作各一个，让你无需自己编写提示就能尝试全部三种操作。

前两项是记忆功能中常见的能力。第三项值得先试一试。让智能体反思它所了解的你过去一个月的工作，它会对整个记忆库进行推理，而不是检索最相近的几个片段。这样你得到的可能是“你总是在周五回退账单模块的更改”，而不是三条关联松散的搜索结果。

记忆存放在**记忆库**中，智能体可以为每个项目或每个人维护一个记忆库。由于这个应用通过多记忆库地址连接，智能体还可以使用 `list_banks`、`create_bank` 和 `get_bank_stats`，每个记忆工具也都接受可选的 `bank_id`。在智能体指令或任务中告诉它使用哪个记忆库。如果智能体没有指定记忆库，就会使用名为 `default` 的记忆库，该库在首次使用时创建，其中的记忆不会出现在其他记忆库中。

## 真正改变日常工作的地方 {#the-part-that-actually-changes-your-day}

区别不在于存储，而在于谁能读取它。

周一告诉 Codex，你只在周五且预发布环境的冒烟测试通过后部署。周四，在新线程中问 Claude 什么时候可以部署。它会根据自己从未参与过的一次对话，回答这条规则和冒烟测试条件。不需要上下文文件、重新交代情况或粘贴内容。

这就是演示的内容，你自己运行大约只需两分钟。亲眼看到第二个智能体根据第一个智能体的对话回答问题，与阅读介绍的感受不同。

OpenBot 智能体各自保有自己的记忆。Hindsight 在此基础上提供共享持久记忆，每个智能体和你连接到 Hindsight 的其他 AI 工具都可以读写同一个记忆库。智能体现在有两套记忆工具，仍可能将内容写入其他工具无法看到的内置存储。<Link to="pathname:///skills/openbot/hindsight-memory/SKILL.md" download="SKILL.md">Hindsight Memory 技能</Link>会引导智能体始终使用 Hindsight。

智能体存入的内容会进入你自己的 Hindsight Cloud 账户。

## 如何连接 {#how-to-connect-it}

应用市场不在主导航中。它通过**左侧栏底部**的店铺按钮打开，位于服务器列表下方和帮助按钮上方：

<StaticImage src="/img/blog/openbot-marketplace-button.png" alt="OpenBot 应用市场按钮，即左侧栏底部的店铺图标" width="44" height="44" />

点击该按钮，打开 **Apps**，找到 **Hindsight** 并选择 **Connect**。你也可以在网页上浏览该应用页面：[openbot.run/plugins/hindsight](https://openbot.run/plugins/hindsight)。

你有两种连接方式，均无需填写 URL。

<StaticImage src="/img/blog/openbot-connect-hindsight.png" alt="OpenBot 的 Connect Hindsight 对话框，提供浏览器登录和 API 密钥两种方式" />

在浏览器中登录 Hindsight Cloud，选择允许 OpenBot 使用的组织。该组织的 Owner 或 Admin 必须批准此请求；批准页面会明确说明你授予的权限：客户端将以你的授权角色访问该组织的 Hindsight MCP 服务器，并查看你的姓名和电子邮件地址。请像创建 API 密钥一样谨慎对待，因为它实质上就是如此。

<StaticImage src="/img/blog/openbot-approve-mcp.png" alt="Hindsight Cloud 的 Approve MCP Access 页面，包含组织选择器" />

或者选择 **Use an API key instead**，粘贴从 Hindsight Cloud 的 Connect 页面获取的密钥。密钥以 `hsk_` 开头，OpenBot 会将其加密存储。

无论选择哪种方式，完成后都会看到：

<StaticImage src="/img/blog/openbot-hindsight-connected.png" alt="OpenBot 中的 Hindsight 应用显示绿色 Connected 状态" />

然后为需要共享记忆的智能体启用该应用。

更希望将所有内容保留在本地？Hindsight 是开源的，自托管服务器提供相同的 MCP 工具。此方式需要通过 OpenBot 的 MCP 服务器设置，而不是这个应用页面；[集成指南](/blog/2026/10/29/openbot-persistent-memory)介绍了具体步骤。

## 从一个记忆库开始 {#start-with-one-bank}

最快感受差异的方法也是最简单的：连接 Hindsight，让两个不同的智能体使用同一个记忆库，然后向第二个智能体提出一个只有第一个智能体被告知过的问题。

通过 OpenBot 应用市场连接 Hindsight，或者阅读 [Hindsight 文档](/)和 [MCP 服务器参考](/developer/mcp-server)，了解完整工具列表、记忆库选择规则和自托管设置。
