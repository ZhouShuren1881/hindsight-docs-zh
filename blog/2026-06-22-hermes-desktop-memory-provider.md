---
title: "Hindsight 现已成为 Hermes 桌面应用中的一键式记忆提供方"
authors: [benfrank241]
slug: "2026/06/22/hermes-desktop-memory-provider"
date: 2026-06-22T12:00
tags: [hermes, memory, hindsight, desktop, integration, release]
description: "Hermes 智能体的桌面应用现在支持选择 Hindsight 作为记忆提供方，并可完全在应用内完成配置：选择模式、粘贴 API 密钥，即可使用。无需配置文件，也无需编辑 .env。它还是唯一拥有完整设置面板的记忆后端。"
image: /img/blog/hermes-desktop-memory-provider.webp
hide_table_of_contents: true
---

![Hindsight 现已成为 Hermes 桌面应用中的一键式记忆提供方](/img/blog/hermes-desktop-memory-provider.webp)

:::info 自本文发布后，设置方式已有变化
Hindsight 不再与 Hermes 捆绑。Nous Research 已将所有记忆提供方移出 Hermes 核心代码库，因此新安装时需要先运行 `hermes plugins install hindsight`，再运行 `hermes memory setup`。已有安装会自动迁移。请参阅[Hindsight 成为 Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

Nous Research 开发的 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 已将 Hindsight 作为[原生记忆提供方](/blog/2026/04/06/hermes-native-memory-provider)提供一段时间了。此前要配置它，需要编辑 `config.json`，或把密钥写进 `.env`。如果你习惯使用终端，这不成问题；否则，这就成了一道门槛。

现在这道门槛消失了。**Hermes 桌面应用现在支持选择 Hindsight 作为记忆提供方，并直接在应用内完成全部配置**：选择模式、粘贴 API 密钥、保存。无需处理文件或环境变量，也不必折腾重启。

## 概览 {#tldr}

<!-- truncate -->

- Hermes 桌面应用的**设置 → 记忆与上下文**部分现在列出了 Hindsight 这一记忆提供方。
- 选择它后会打开完整的配置面板，包含**模式、API 密钥、API URL、记忆库 ID 和 Recall 预算**，都可以在应用内编辑。
- API 密钥以机密信息的形式存储，只写入、不回读；其他设置则保存为配置文件配置。无需再手动编辑文件。
- Hindsight 是 Hermes 中**唯一拥有完整应用内设置面板的记忆提供方**；其他提供方不会显示设置面板。
- 云模式是最快的使用方式：[免费注册](https://ui.hindsight.vectorize.io)，粘贴密钥，Hermes 就能在每个会话中记住信息。

## 改动内容 {#what-changed}

Hermes 支持可插拔的记忆后端，桌面应用此前也已支持通过下拉菜单在不同后端之间切换。但切换只是完成了一半：大多数提供方仍要求你找到配置文件，再手动填写凭据。

现在，在桌面应用中选择 **Hindsight** 后，Hermes 会直接显示专用设置表单。填写表单并点击保存，智能体就能获得长期记忆。各项值会自动写入正确的位置：API 密钥会存入机密信息存储区（绝不会回读到表单中），其他内容则写入配置文件。

![在 Hermes 桌面应用的“设置 → 记忆与上下文”中选择 Hindsight 作为记忆提供方](/img/blog/hermes-desktop-provider-dropdown.webp)

这让“支持 Hindsight”变成了“只需点击两下即可使用 Hindsight”。

## 可配置的内容 {#what-you-configure}

应用内面板提供了实际需要的全部设置：

| 设置 | 作用 | 默认值 |
| --- | --- | --- |
| **模式** | `Cloud`（只需 API 密钥）或 `Local External`（连接到现有的 Hindsight 实例） | `Cloud` |
| **API 密钥** | 用于向 Hindsight API 进行身份认证，以只写机密信息的形式存储 | — |
| **API URL** | Hindsight 端点 | `https://api.hindsight.vectorize.io` |
| **记忆库 ID** | 此 Hermes 配置文件读写的记忆库 | `hermes` |
| **Recall 预算** | 每轮召回记忆时使用的力度：`low` / `mid` / `high` | `mid` |

![Hermes 桌面应用中的 Hindsight 记忆提供方配置面板，显示模式、API 密钥、API URL、记忆库 ID 和 Recall 预算字段](/img/blog/hermes-desktop-config-panel.webp)

选择 **Cloud**，粘贴从 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 获取的密钥，就完成了。想运行自己的后端？将模式切换为 **Local External**，并将 API URL 指向你的实例。

## 值得注意之处 {#the-part-worth-noticing}

Hermes 自带一系列记忆插件。在桌面应用的提供方下拉菜单中，你会看到若干选项，但**Hindsight 是唯一拥有实际配置面板的提供方**。选择其他任何选项，设置区域都会保持空白；选择 Hindsight，则会显示上面的完整表单。

这并非界面渲染碰巧如此。桌面 UI 是通用的：它会询问后端“这个提供方需要配置什么？”，然后根据返回内容绘制界面。Hermes 选择由 Hindsight 完整描述所需配置，包括模式、机密信息和默认值等，因此你无需离开应用就能完成设置。

## 这为何重要 {#why-it-matters}

记忆是能为智能体带来的最大单项升级，而设置过程一直是阻力。在正式发布的桌面应用中加入点选即可使用的 Hindsight，消除了最后一道障碍。即使从未打开过终端的 Hermes 用户，现在也能在不到一分钟内为智能体添加持久的跨会话记忆：

1. 打开**设置 → 记忆与上下文**。
2. 将记忆提供方设为 **Hindsight**。
3. 选择 **Cloud**，粘贴 API 密钥并保存。

从此以后，Hermes 就能在每个会话中记住偏好、决策和项目背景；在配置文件所使用的每台设备上，这些记忆都能跨会话继续可用。

## 开始使用 {#get-started}

- **集成文档：**[在 Hermes 桌面应用中配置 Hindsight](/sdks/integrations/hermes-desktop)
- **Hermes Agent：**[github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- **Hindsight Cloud（免费）：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **关于原生提供方：**[Hindsight 现已成为 Hermes Agent 的原生记忆提供方](/blog/2026/04/06/hermes-native-memory-provider)