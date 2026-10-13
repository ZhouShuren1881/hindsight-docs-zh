---
title: "Hindsight Cloud中的新增功能：MCP 客户端的本机 OAuth"
authors: [hindsight]
date: 2026-03-27T12:00
tags: [hindsight-cloud, release, mcp, oauth, claude-code, cursor, windsurf]
description: "Hindsight Cloud 现在支持MCP 客户端的本机 OAuth 2.1。直接连接 Claude Code、Cursor、Windsurf 和 ChatGPT，无需 API 键。"
image: /img/blog/hindsight-cloud-mcp-oauth.webp
hide_table_of_contents: true
---

![Hindsight Cloud中的新增功能：MCP 客户端的本机 OAuth](/img/blog/hindsight-cloud-mcp-oauth.webp)

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现在支持MCP 客户端的本机 OAuth 2.1。 Claude Code、Claude Desktop、ChatGPT、Cursor 和 Windsurf 等工具可以直接连接到 Hindsight 的记忆API，无需生成、复制或粘贴 API 键。

这篇文章介绍了更改的内容、如何连接每个受支持的客户端，以及 OAuth 相对于传统 API 密钥何时是正确的选择。

<!-- truncate -->

## 概览 {#tldr}

- **双击连接** — 将您的MCP客户端指向Hindsight Cloud，批准访问，完成
- **无API密钥管理** — OAuth 令牌自动颁发和轮换
- **每个组织的范围** — 选择授权期间客户端可以访问的组织
- **每个客户端撤销** — 断开一个工具而不影响其他工具
- **今天有效** — 在所有 Hindsight Cloud帐户中可用

## 改变了什么 {#what-changed}

到目前为止，将MCP客户端连接到Hindsight Cloud意味着在仪表板中创建API密钥，复制它并将其粘贴到客户端配置中。这确实有效，但会产生摩擦——尤其是在安装新机器、添加团队成员或轮换凭证时。

使用本机 OAuth 2.1，连接体验与任何其他 OAuth 保护的服务相同。您的MCP客户端将您重定向到Hindsight Cloud，您批准访问，然后就完成了。无需管理密钥，无需手动编辑配置文件，无需轮换提醒。

## OAuth 2.1 + 动态客户端注册如何工作 {#how-oauth-21--dynamic-client-registration-works}

Hindsight 的 MCP OAuth 实现遵循两个标准：OAuth 2.1（授权流程）和 RFC 7591 动态客户端注册（客户端如何向服务器标识自己）。

这在实践中意味着什么：

**没有动态客户端注册**，您必须在 Hindsight 仪表板中预先注册每个 MCP 工具，然后才能连接 - 这是一项无法扩展的管理任务。

**动态客户端注册**、MCP 客户端在第一次连接时自动注册。 Claude Code、Cursor或任何兼容的MCP客户端向Hindsight Cloud发送注册请求，接收客户端ID，然后继续执行标准OAuth授权流程。您在浏览器中批准一次，客户端就获得授权。

完整流程：

1. 您将 Hindsight MCP 端点添加到客户端配置中
2. 您的MCP客户端向Hindsight Cloud发送注册请求
3. Hindsight 自动发出客户端ID
4. 您的客户端将您重定向至Hindsight Cloud授权页面
5. 您登录（如果需要）并批准访问，选择哪个组织
6. 您的客户端收到访问令牌并将其存储在本地
7. 所有未来的API调用都使用该令牌——无需手动干预

从您的角度来看，步骤 2-6 发生在自动打开的浏览器窗口中。单击“批准”，窗口关闭，然后即可连接。

## 连接您的MCP客户端 {#connecting-your-mcp-client}

### Claude Code {#claude-code}

通过 CLI 添加 Hindsight MCP 服务器：

```bash
claude mcp add hindsight https://mcp.hindsight.vectorize.io --transport http
```

或直接编辑`~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "hindsight": {
      "url": "https://mcp.hindsight.vectorize.io",
      "type": "http"
    }
  }
}
```

首次使用时，Claude Code将打开浏览器窗口进行授权。使用您的 Hindsight Cloud帐户登录，批准访问，然后即可连接。 Hindsight 三个记忆工具（`recall_memory`、`retain_memory`、`reflect_on_memory`）会自动出现在Claude Code中。

### Claude桌面 {#claude-desktop}

编辑你的Claude桌面配置文件：

- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hindsight": {
      "url": "https://mcp.hindsight.vectorize.io"
    }
  }
}
```

重新启动Claude桌面。下次启动时，它将提示您在浏览器中授权Hindsight Cloud。

### Cursor {#cursor}

1. 打开**设置**（⌘，在macOS）
2. 导航至**功能 → MCP 服务器**
3. 点击**添加MCP服务器**
4. 输入服务器网址：`https://mcp.hindsight.vectorize.io`
5. 将传输设置为**HTTP**
6. 保存

Cursor 将在首次连接时打开 OAuth 授权流程的浏览器窗口。

### 风帆冲浪 {#windsurf}

1. 打开**风帆设置**面板
2. 前往**级联 → MCP 服务器**
3. 点击**添加服务器**
4. 输入 `https://mcp.hindsight.vectorize.io` 作为服务器 URL
5. 保存并重新加载

OAuth 提示将在下次会话启动时自动出现。

### ChatGPT {#chatgpt}

ChatGPT 通过ChatGPT Plus 和团队计划中的连接器面板支持MCP。导航到 **设置 → 连接器**，单击 **添加连接器**，然后粘贴 `https://mcp.hindsight.vectorize.io`。授权流程在浏览器中运行。

## OAuth 与 API 密钥：何时使用每个密钥 {#oauth-vs-api-key-when-to-use-each}

两种方法都支持。两者都不会消失。以下是每一个都有意义的时候：

||OAuth (MCP)|API 键|
|---|---|---|
|**最适合**|互动工具（Claude Code、Cursor、Windsurf）|自动化管道、CI/CD、服务器到服务器|
|**设置**|浏览器流程，无复制粘贴|在仪表板中生成，粘贴到配置中|
|**令牌轮换**|自动|手动|
|**撤销**|每个客户，即时|每个键，在仪表板中|
|**团队入职**|每个人授权自己的客户|密钥必须共享，或者每个人生成一个|
|**审计追踪**|每个客户端的访问日志|每键访问日志|

**何时使用 OAuth** 开发人员正在将其本地编码工具连接到 Hindsight，并且您希望他们使用自己的 Hindsight Cloud凭证进行授权 — 无需共享机密，无需分发密钥。

**使用API键** 您正在运行脚本、云函数或任何需要在没有浏览器的情况下调用 Hindsight 的非交互式进程。当您想要更简单的设置时，API 键也可以很好地进行快速本地测试。

## 范围访问和多组织帐户 {#scoped-access-and-multi-org-accounts}

如果您的Hindsight Cloud帐户可以访问多个组织，OAuth授权屏幕将要求您选择MCP客户端可以访问哪个组织。每个客户一次仅限于一个组织。

如果您在多个项目或团队中使用Hindsight，这一点很重要：您可以将Cursor连接到您的个人组织，将Claude Code连接到您团队的组织，并且每个工具只能看到其授权的记忆库。

## 故障排除 {#troubleshooting}

**浏览器窗口打不开**

某些MCP客户端需要显式的浏览器启动权限。检查客户端的 MCP 设置中的“允许 OAuth 重定向”或“打开外部浏览器”选项。或者，从客户端的调试日志复制授权 URL 并将其手动粘贴到浏览器中。

**“客户端注册失败”**

这通常意味着MCP客户端不支持RFC 7591动态客户端注册。检查客户端文档以了解其 OAuth 支持级别。本文中列出的所有客户端都经过测试并确认可以正常工作。

**授权成功但工具不出现
OAuth 流程完成后，**

重新启动或重新加载MCP 客户端。某些客户端在启动时缓存工具列表，需要重新加载才能获取新授权的服务器。

**调用记忆工具时出现“范围不足”错误**

在授权期间，确认您已批准访问记忆读/写范围。如果您批准缩小范围，请删除客户端连接并重新授权。

## 权限 {#permissions}

仅**所有者**或**管理员**用户可以授权MCP客户端连接。这与创建 API 密钥所需的相同权限级别匹配。如果您尝试授权并看到权限错误，请要求您的组织所有者或管理员完成授权步骤。

## 开始 {#get-started}

Native MCP OAuth 现已在所有 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 帐户中可用。将 `https://mcp.hindsight.vectorize.io` 添加到您的 MCP 客户端配置并按照授权提示操作。

对于脚本化或自动化用例，[API 键](https://hindsight.vectorize.io/developer/retrieval) 在Hindsight Cloud仪表板中仍然可用。两种方法都可以完全访问[记忆召回](https://hindsight.vectorize.io/developer/retrieval)、记忆存储和感觉。
