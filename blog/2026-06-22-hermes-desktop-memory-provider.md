---
title: "Hindsight 现在是 Hermes 桌面应用程序中的一键记忆提供程序"
authors: [benfrank241]
slug: "2026/06/22/hermes-desktop-memory-provider"
date: 2026-06-22T12:00
tags: [hermes, memory, hindsight, desktop, integration, release]
description: "Hermes智能体的桌面应用程序现在允许您选择Hindsight作为您的记忆提供程序并完全在应用程序内配置它 - 选择一种模式，粘贴API键，完成。没有配置文件，没有 .env 编辑。它是唯一拥有完整设置面板的记忆后端。"
image: /img/blog/hermes-desktop-memory-provider.webp
hide_table_of_contents: true
---

![Hindsight现在是Hermes桌面应用程序中的一键式记忆提供程序](/img/blog/hermes-desktop-memory-provider.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

[Hermes智能体](https://github.com/NousResearch/hermes-agent) 将Hindsight 作为[本地记忆提供者
Nous Research 的](https://hindsight.vectorize.io/blog/2026/04/06/hermes-native-memory-provider) 一段时间了。到目前为止，配置它意味着编辑 `config.json` 或将密钥放入 `.env` 中。如果你住在终端里那就没问题了。如果你不这样做，那就是一堵墙。

那堵墙不见了。 **Hermes桌面应用程序现在允许您选择Hindsight作为您的记忆提供者并在应用程序内配置整个内容** — 选择一种模式，粘贴API 键，保存。没有文件，没有环境变量，没有重新启动舞蹈。

## 概览 {#tldr}

<!-- truncate -->

- Hermes桌面应用程序的**设置→记忆和上下文**部分现在将Hindsight列为记忆提供者。
- 选择它会打开一个真正的配置面板：**模式、API键、API URL、记忆库ID、记忆召回预算** — 全部可在应用程序中编辑。
- ​​API 密钥作为秘密存储（只写），其余作为配置文件配置。不再需要手动编辑文件。
仅
- Hindsight 是 Hermes 中的 **** 记忆提供者，它获得完整的应用内设置面板 - 其他面板不渲染任何内容。
- 云模式是快速路径：[免费注册](https://ui.hindsight.vectorize.io)，粘贴密钥，Hermes会记住每个会话。

## 改变了什么 {#what-changed}

Hermes 支持可插拔记忆后端，并且桌面应用程序已经允许您通过下拉菜单在它们之间切换。但切换只是工作的一半——大多数提供商仍然需要您找到配置文件并手动填写凭据。

现在，当您在桌面应用程序中选择**Hindsight**时，Hermes会在那里呈现专用设置表单。你填写它，点击保存，智能体就会有长期记忆。这些值会自动落在正确的位置：您的 API 密钥将进入秘密存储（并且永远不会读回到表单中），其他所有内容都会写入您的个人资料配置中。

![在Hermes桌面应用程序的设置→记忆和上下文中选择Hindsight作为记忆提供者](/img/blog/hermes-desktop-provider-dropdown.webp)

这是“支持Hindsight”和“Hindsight 只需点击两下”之间的区别。

## 您的配置 {#what-you-configure}

应用程序内面板准确地显示了重要的设置：

|设置|它的作用|默认|
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
|**模式**|`Cloud`（只需要一个API密钥）或`Local External`（连接到现有的Hindsight实例）|`Cloud`|
|**API键**|使用 Hindsight API 进行身份验证 — 存储为只写秘密|—|
|**API 网址**|Hindsight 端点|`https://api.hindsight.vectorize.io`|
|**记忆库ID**|此Hermes配置文件读取和写入哪个记忆库|`hermes`|
|**记忆召回预算**|每回合记忆召回的工作强度：`low` / `mid` / `high`|`mid`|

![Hermes桌面应用程序中的Hindsight记忆提供程序配置面板，显示模式、API键、API URL、记忆库ID和记忆召回预算字段](/img/blog/hermes-desktop-config-panel.webp)

选择**云**，粘贴[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)中的密钥，就完成了。更喜欢运行自己的后端？将模式切换到 **本地外部** 并将 API URL 指向您的实例。

## 值得关注的部分 {#the-part-worth-noticing}

Hermes 附带一整套记忆插件。在桌面应用程序的提供程序下拉列表中，您会看到一些选项 - 但**Hindsight是唯一具有实际配置面板的。**选择任何其他选项，设置区域保持空白；选择Hindsight，您将获得上面的完整表格。

这不是渲染的意外。桌面 UI 是通用的：它询问后端“该提供程序需要配置什么？”并绘制返回的任何内容。 Hindsight 是 Hermes 选择完整描述的提供程序 - 模式、秘密、默认值等 - 因此您无需离开应用程序即可进行设置。

## 为什么重要 {#why-it-matters}

记忆是你可以给予智能体的最大的单一升级，并且摩擦总是被设置的。在发布的桌面应用程序中使Hindsight成为点击式选择就消除了最后一个借口。从未打开过终端的Hermes用户现在可以在不到一分钟的时间内给予他们的智能体持久的、跨会话的记忆：

1. 打开**设置→记忆和上下文**
2. 将记忆提供者设置为**Hindsight**
3. 选择**云**，粘贴API键，保存

从那时起，Hermes 会记住 — 偏好、决策、项目背景 — 在每个会话中、在配置文件所遵循的每台机器上。

## 开始 {#get-started}

- **集成文档：**[在Hermes桌面应用程序中配置Hindsight](https://hindsight.vectorize.io/sdks/integrations/hermes-desktop)
- **Hermes智能体：**[github.com/NousResearch/hermes-智能体](https://github.com/NousResearch/hermes-agent)
- **Hindsight Cloud（免费）：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **本地提供商的故事：**[Hindsight 现在是Hermes智能体的原生记忆提供者](https://hindsight.vectorize.io/blog/2026/04/06/hermes-native-memory-provider)
