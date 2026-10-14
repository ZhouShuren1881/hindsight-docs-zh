---
sidebar_position: 39
title: "使用 Hindsight 为 GitHub Copilot 提供持久记忆 | 集成"
description: "通过 MCP 将 Hindsight 接入 VS Code 中的 GitHub Copilot，为其添加长期记忆。一条命令即可配置 Hindsight MCP 服务器和 recall/retain 规则。"
---

# GitHub Copilot {#github-copilot}

借助 [Hindsight](https://vectorize.io/hindsight)，为 VS Code 中的 [GitHub Copilot](https://github.com/features/copilot) 提供长期记忆。只需一条命令，即可将 Copilot 的智能体模式连接到 Hindsight MCP 服务器，并添加 recall/retain 规则。这样，Copilot 会在任务开始时召回相关记忆，并在工作过程中存入可长期保留的事实。

[查看更新日志 →](/changelog/integrations/github-copilot)

## 工作原理 {#how-it-works}

此集成使用 VS Code Copilot 支持的两项功能：

- 通过 `.vscode/mcp.json` 配置 **MCP 服务器**（用于智能体模式），其中包括可设置请求头的 **HTTP 服务器**，因此可以直接连接 Hindsight MCP 端点：

  ```json
  {
    "servers": {
      "hindsight": {
        "type": "http",
        "url": "https://api.hindsight.vectorize.io/mcp/my-project/",
        "headers": { "Authorization": "Bearer hsk_..." }
      }
    }
  }
  ```

- **`.github/copilot-instructions.md`**：Copilot 会将此文件中的指令应用于工作区内的每次聊天，recall/retain 规则就写在这里。

## 设置 {#setup}

```bash
pip install hindsight-copilot
cd your-project
hindsight-copilot init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `servers` 条目合并到 `./.vscode/mcp.json`，并将规则写入 `./.github/copilot-instructions.md`。重新加载 VS Code，在**智能体模式**下打开 Copilot Chat，然后从聊天工具菜单启动 `hindsight` MCP 服务器。

你可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，也可以连接自托管服务器，并通过 `--api-url http://localhost:8888` 指定地址（开放的本地服务器无需令牌）。如果 `mcp.json` 中含有注释，`init` 会打印供你粘贴的代码片段；你也可以随时运行 `hindsight-copilot init --print-only`。

## 命令 {#commands}

| 命令 | 说明 |
| --- | --- |
| `hindsight-copilot init` | 添加 MCP 服务器和 recall/retain 规则 |
| `hindsight-copilot status` | 显示服务器和规则是否已配置 |
| `hindsight-copilot uninstall` | 移除服务器和规则 |

完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/github-copilot)。
