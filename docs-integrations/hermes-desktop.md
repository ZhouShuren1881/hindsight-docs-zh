---
sidebar_position: 39
title: "Hermes 桌面应用：配置 Hindsight 记忆 | 集成"
description: "在 Hermes 桌面应用的“设置”中，将 Hindsight 配置为记忆提供方。选择模式并粘贴 API 密钥，即可让智能体跨会话使用持久的长期记忆。无需配置文件或环境变量。"
---

# Hermes 桌面应用 {#hermes-desktop}

在 **[Hermes](https://github.com/NousResearch/hermes-agent) 桌面应用**中，将 [Hindsight](https://vectorize.io/hindsight) 配置为记忆提供方——所有操作都在“设置”中完成。无需 `config.json`、`.env` 或终端。选择模式并粘贴 API 密钥，Hermes 就能在每次会话中记住信息。

:::tip
如果你更喜欢使用命令行，或以 CLI/网关方式运行 Hermes，请参阅 [Hermes Agent 集成](/sdks/integrations/hermes)，了解 `hermes memory setup` 向导、插件架构和完整配置参考。
:::

:::note Hindsight 现已从 Hermes 插件目录安装
Nous Research 已将所有记忆提供方移出 Hermes 核心代码库。桌面应用会自动处理：智能体首次启动时，它会安装目录中的插件；你的设置、记忆库和 API 密钥都保持不变。本指南的操作也无需更改。如果你还使用 CLI，请参阅[成为 Hermes 插件后，Hindsight 有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

## 设置 {#setup}

**1. 打开 Settings → Memory & Context（设置 → 记忆与上下文）。** 在 **Memory Provider（记忆提供方）**下拉菜单中选择 **Hindsight**。

![在 Hermes 桌面应用的 Settings → Memory & Context 中选择 Hindsight 作为记忆提供方](/img/integrations/hermes-desktop-dropdown.webp)

**2. 填写 Hindsight 设置面板。** 选择 Hindsight 后会显示以下配置字段：

![Hermes 桌面应用中的 Hindsight 记忆提供方配置面板](/img/integrations/hermes-desktop-config-panel.webp)

| 字段 | 作用 | 默认值 |
| --- | --- | --- |
| **模式** | `Cloud`（只需 API 密钥）或 `Local External`（连接到现有 Hindsight 实例） | `Cloud` |
| **API 密钥** | 用于通过 Hindsight API 身份验证，并作为只写密钥存储 | — |
| **API URL** | Hindsight 端点 | `https://api.hindsight.vectorize.io` |
| **记忆库 ID** | 此 Hermes 配置文件读取和写入的记忆库 | `hermes` |
| **Recall 预算** | 控制每轮召回的力度：`low` / `mid` / `high` | `mid` |

**3. 点击 Save（保存）。** 完成后，Hermes 就拥有了持久的长期记忆。

## 连接模式 {#connection-modes}

### Cloud（云端，推荐） {#cloud-recommended}

这是最快捷的方式。选择 **Cloud**，然后粘贴从 [ui.hindsight.vectorize.io/connect](https://ui.hindsight.vectorize.io/connect) 获取的 API 密钥。无需自行托管——Hindsight Cloud 会处理存储、提取和检索。

### Local External（本地外部） {#local-external}

如果你已经运行自己的 Hindsight 实例（通过 Docker 或自托管），请选择 **Local External**，并将 **API URL** 设为你的实例地址（例如 `http://localhost:8888`）。记忆数据不会离开你的基础设施。

## 记忆的存储方式 {#how-memory-is-stored}

你的设置会自动保存到相应位置：

- **API 密钥**存储在密钥库中，不会回显到表单里（保存后会显示 _API key set_ 徽章）。
- **模式、API URL、记忆库 ID 和 Recall 预算**会写入 Hermes 配置文件。

每个配置文件都指向一个 **Bank ID（记忆库 ID）**，因此不同配置文件的记忆彼此隔离；无论在哪台机器上运行该配置文件，都能使用相应记忆。

## 后续步骤 {#next-steps}

- **Hindsight Cloud（免费）：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **Hermes CLI / 插件设置：**[Hermes Agent 集成](/sdks/integrations/hermes)
- **Hermes Agent：**[github.com/NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
