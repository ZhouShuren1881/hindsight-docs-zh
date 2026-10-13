---
sidebar_position: 39
title: "Hermes Desktop 应用程序：配置Hindsight 记忆 |整合"
description: "将 Hindsight 设置为 Hermes 桌面应用程序的记忆提供者 — 完全在“设置”中。选择一种模式，粘贴API 密钥，你的智能体就会拥有持久的长期记忆。没有配置文件，没有环境变量。"
---

# Hermes Desktop {#hermes-desktop}

配置[Hindsight](https://vectorize.io/hindsight) 作为的记忆提供者 **[Hermes](https://github.com/NousResearch/hermes-agent) 桌面应用** — 完全来自“设置”。没有`config.json`，没有`.env`，无终端。选择一种模式，粘贴API 密钥，以及Hermes记得每一次训练。

:::tip 更喜欢命令行，或者运行Hermes作为CLI/gateway？参见[Hermes Agent 集成](/sdks/integrations/hermes) `hermes memory setup` 向导、插件架构和完整的配置参考。
:::

:::note Hindsight 现在从 Hermes 插件目录安装
Nous Research 将所有记忆提供者移出Hermes核心树。桌面应用程序会为您处理此问题：它会在智能体第一次启动时安装目录插件，以及您的设置、记忆库和API 密钥不变。本指南中的内容没有任何变化。参见[Hindsight 成为 Hermes 插件后有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed) 如果您还使用 CLI。
:::

## 设置 {#setup}

**1. 打开设置 → 记忆与上下文（Settings → Memory & Context）。** 在**记忆提供程序**下拉菜单，选择**Hindsight**。

![在 Hermes 桌面应用的设置 → 记忆与上下文中选择 Hindsight 作为记忆提供程序](/img/integrations/hermes-desktop-dropdown.webp)

**2. 填写 Hindsight 设置面板。** 选择Hindsight揭示其配置字段：

![Hermes 桌面应用中的 Hindsight 记忆提供程序配置面板](/img/integrations/hermes-desktop-config-panel.webp)

|字段|它的作用|默认|
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
|**模式**|`Cloud`（只需要一个API 密钥）或`Local External`（连接到现有的Hindsight实例）|`Cloud`|
|**API 密钥**|使用 Hindsight API 进行身份验证 — 存储为只写机密|—|
|**API URL**|Hindsight 端点|`https://api.hindsight.vectorize.io`|
|**记忆库 ID**|此 Hermes 配置文件读取和写入哪个记忆库|`hermes`|
|**记忆召回预算**|每回合的记忆力有多强：`low` / `mid` / `high`|`mid`|

**3. 点击保存（Save）。** 就是这样——Hermes现在具有持久的长期记忆。

## 连接方式 {#connection-modes}

### 云（推荐） {#cloud-recommended}

快速路径。选择**云端**，然后粘贴API来自的钥匙 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect)。没什么可主持的——Hindsight Cloud处理存储、提取和检索。

### 本地外部 {#local-external}

已经运行自己的Hindsight实例（Docker或自托管）？选择**本地外部服务** 并设置 **API URL** 到您的实例（例如 `http://localhost:8888`）。您的记忆永远不会离开您的基础设施。

## 记忆是如何存储的 {#how-memory-is-stored}

您的设置会自动保存到正确的位置：

- **API 密钥** 进入秘密存储 - 它永远不会读回到表单中（保存后您将看到一个 _API 密钥集_ 徽章）。
- **模式、API URL、记忆库 ID 与记忆召回预算** 写给你Hermes配置文件配置。

每个配置文件都指向一个**记忆库 ID**，因此记忆是根据配置文件隔离的，并在运行配置文件的每台计算机上跟随您。

## 后续步骤 {#next-steps}

- **Hindsight Cloud（免费）：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **Hermes CLI / 插件设置：**[Hermes Agent 集成](/sdks/integrations/hermes)
- **Hermes Agent：**[github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
