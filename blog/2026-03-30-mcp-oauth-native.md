---
title: "Hindsight Cloud 新功能：面向 MCP 客户端的原生 OAuth"
authors: [hindsight]
date: 2026-03-27T12:00
tags: [hindsight-cloud, release, mcp, oauth, claude-code, cursor, windsurf]
description: "Hindsight Cloud 现已支持 MCP 客户端原生 OAuth 2.1。无需 API 密钥，即可直接连接 Claude Code、Cursor、Windsurf 和 ChatGPT。"
image: /img/blog/hindsight-cloud-mcp-oauth.webp
hide_table_of_contents: true
---

![Hindsight Cloud 新功能：面向 MCP 客户端的原生 OAuth](/img/blog/hindsight-cloud-mcp-oauth.webp)

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现已支持面向 MCP 客户端的原生 OAuth 2.1。Claude Code、Claude Desktop、ChatGPT、Cursor 和 Windsurf 等工具可以直接连接 Hindsight 的记忆 API，无需生成、复制或粘贴 API 密钥。

本文介绍了有哪些变化、如何连接各个受支持的客户端，以及与传统 API 密钥相比，何时适合使用 OAuth。

<!-- truncate -->

## 概要 {#tldr}

- **两步即可连接** — 将 MCP 客户端指向 Hindsight Cloud，批准访问即可完成
- **无需管理 API 密钥** — OAuth 令牌会自动签发和轮换
- **按组织限定访问范围** — 授权时选择客户端可访问的组织
- **可单独撤销客户端授权** — 断开一个工具，不影响其他工具
- **现已可用** — 所有 Hindsight Cloud 账户均可使用

## 有哪些变化 {#what-changed}

此前，要将 MCP 客户端连接到 Hindsight Cloud，必须先在控制台中创建 API 密钥，再复制并粘贴到客户端配置中。这种方式可行，但会增加操作步骤，尤其是在新设备上设置、添加团队成员或轮换凭据时。

采用原生 OAuth 2.1 后，连接体验与其他受 OAuth 保护的服务相同。MCP 客户端会将你重定向到 Hindsight Cloud，你批准访问后即可完成连接。无需管理密钥、手动编辑配置文件，也无需记住轮换凭据。

## OAuth 2.1 与动态客户端注册如何协同工作 {#how-oauth-21--dynamic-client-registration-works}

Hindsight 的 MCP OAuth 实现遵循两项标准：OAuth 2.1（授权流程）和 RFC 7591 动态客户端注册（客户端向服务器表明身份的方式）。

实际效果如下：

**没有动态客户端注册时**，每个 MCP 工具都必须先在 Hindsight 控制台中预先注册才能连接。这项管理工作难以扩展。

**使用动态客户端注册时**，MCP 客户端会在首次连接时自动注册。Claude Code、Cursor 或任何符合规范的 MCP 客户端都会向 Hindsight Cloud 发送注册请求，获取客户端 ID，然后继续执行标准 OAuth 授权流程。你只需在浏览器中批准一次，客户端便获得授权。

完整流程如下：

1. 将 Hindsight MCP 端点添加到客户端配置中
2. MCP 客户端向 Hindsight Cloud 发送注册请求
3. Hindsight 自动签发客户端 ID
4. 客户端将你重定向到 Hindsight Cloud 授权页面
5. 登录（如有需要）并批准访问，同时选择组织
6. 客户端收到访问令牌并将其存储在本地
7. 后续所有 API 调用都使用该令牌，无需手动操作

对你来说，第 2 至第 6 步会在自动打开的浏览器窗口中完成。点击批准后，窗口关闭，连接便建立了。

## 连接 MCP 客户端 {#connecting-your-mcp-client}

### Claude Code {#claude-code}

通过 CLI 添加 Hindsight MCP 服务器：

```bash
claude mcp add hindsight https://mcp.hindsight.vectorize.io --transport http
```

也可以直接编辑 `~/.claude/settings.json`：

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

首次使用时，Claude Code 会打开浏览器窗口供你授权。使用 Hindsight Cloud 账户登录并批准访问后，即可完成连接。三个 Hindsight 记忆工具（`recall_memory`、`retain_memory`、`reflect_on_memory`）会自动显示在 Claude Code 中。

### Claude Desktop {#claude-desktop}

编辑 Claude Desktop 配置文件：

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

重新启动 Claude Desktop。下次启动时，它会提示你在浏览器中授权 Hindsight Cloud。

### Cursor {#cursor}

1. 打开**设置**（macOS 上按 ⌘,）
2. 前往**功能 → MCP 服务器**
3. 点击**添加 MCP 服务器**
4. 输入服务器 URL：`https://mcp.hindsight.vectorize.io`
5. 将传输方式设为**HTTP**
6. 保存

首次连接时，Cursor 会打开浏览器窗口，启动 OAuth 授权流程。

### Windsurf {#windsurf}

1. 打开 **Windsurf 设置**面板
2. 前往 **Cascade → MCP Servers**
3. 点击 **Add Server**
4. 将 `https://mcp.hindsight.vectorize.io` 输入为服务器 URL
5. 保存并重新加载

下次启动会话时，系统会自动显示 OAuth 授权提示。

### ChatGPT {#chatgpt}

ChatGPT Plus 和 Team 计划可通过 ChatGPT 中的连接器面板使用 MCP。前往**设置 → 连接器**，点击**添加连接器**，然后粘贴 `https://mcp.hindsight.vectorize.io`。授权流程会在浏览器中运行。

## OAuth 与 API 密钥：如何选择 {#oauth-vs-api-key-when-to-use-each}

两种方式都受支持，也都将继续提供。适用场景如下：

| | OAuth（MCP） | API 密钥 |
|---|---|---|
| **最适合** | 交互式工具（Claude Code、Cursor、Windsurf） | 自动化流水线、CI/CD、服务器间调用 |
| **设置方式** | 通过浏览器授权，无需复制粘贴 | 在控制台中生成，然后粘贴到配置中 |
| **令牌轮换** | 自动 | 手动 |
| **撤销方式** | 按客户端撤销，即时生效 | 在控制台中按密钥撤销 |
| **团队成员接入** | 每个人授权自己的客户端 | 共享密钥，或由每个人各自生成密钥 |
| **审计记录** | 按客户端记录访问日志 | 按密钥记录访问日志 |

**适合使用 OAuth 的情况：** 开发者要将本地编程工具连接到 Hindsight，你希望他们使用自己的 Hindsight Cloud 凭据授权，这样无需共享机密或分发密钥。

**适合使用 API 密钥的情况：** 你要运行脚本、云函数或其他无需浏览器即可调用 Hindsight 的非交互式进程。若想简化设置，API 密钥也适合用于快速本地测试。

## 限定访问范围与多组织账户 {#scoped-access-and-multi-org-accounts}

如果你的 Hindsight Cloud 账户可以访问多个组织，OAuth 授权页面会要求你选择 MCP 客户端可以访问哪个组织。每个客户端一次只能限定在一个组织内。

如果你在多个项目或团队中使用 Hindsight，这一点很重要：你可以将 Cursor 连接到个人组织，将 Claude Code 连接到团队组织；每个工具只能看到其获准访问的记忆库。

## 故障排查 {#troubleshooting}

**浏览器窗口没有打开**

某些 MCP 客户端需要明确授予启动浏览器的权限。请在客户端的 MCP 设置中查找“允许 OAuth 重定向”或“打开外部浏览器”选项。也可以从客户端调试日志中复制授权 URL，再手动粘贴到浏览器中。

**“客户端注册失败”**

这通常表示 MCP 客户端不支持 RFC 7591 动态客户端注册。请查看客户端文档，了解其 OAuth 支持级别。本文列出的所有客户端均已通过测试并确认可正常工作。

**授权成功，但工具没有显示**

OAuth 流程完成后，重新启动或重新加载 MCP 客户端。有些客户端会在启动时缓存工具列表，需要重新加载才能识别新获授权的服务器。

**调用记忆工具时出现“权限范围不足”错误**

授权时，请确认你批准了记忆读取和写入权限范围。如果批准时选择了较小的权限范围，请移除客户端连接并重新授权。

## 权限 {#permissions}

只有 **Owner** 或 **Admin** 用户可以授权 MCP 客户端连接。这与创建 API 密钥所需的权限级别相同。如果授权时出现权限错误，请联系所在组织的 Owner 或 Admin，由其完成授权。

## 开始使用 {#get-started}

所有 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 账户现已支持原生 MCP OAuth。将 `https://mcp.hindsight.vectorize.io` 添加到 MCP 客户端配置中，然后按照授权提示操作。

对于脚本或自动化场景，[API 密钥](https://hindsight.vectorize.io/developer/retrieval)仍可在 Hindsight Cloud 控制台中使用。两种方式都能完整访问[记忆召回](https://hindsight.vectorize.io/developer/retrieval)、存入和反思功能。
