---
sidebar_position: 39
title: "GitHub Copilot Hindsight 持久记忆 |整合"
description: "通过MCP使用Hindsight将长期记忆添加到VS Code中的GitHubCopilot。一条命令连接 Hindsight MCP 服务器以及 recall/retain 规则。\nVS Code 中的"
---

# GitHub Copilot {#github-copilot}

的长期记忆 [GitHub Copilot](https://github.com/features/copilot)，由 提供支持 [Hindsight](https://vectorize.io/hindsight)。一条命令连接Copilot的智能体模式HindsightMCP服务器并添加一个recall/retain规则——所以Copilot在任务开始时回忆相关记忆，并在工作过程中保留持久的事实。

[查看更新日志 →](/changelog/integrations/github-copilot)

## 工作原理 {#how-it-works}

VS Code Copilot 支持此集成使用的两种功能：

- **MCP 服务器**来自`.vscode/mcp.json`（智能体模式），包括**HTTP 服务器** 带标题 — 所以HindsightMCP端点直接连接：

  ```json
  {
    "servers": {
      "hindsight": {
        "type": "http",
        "url": "https://api.hindsight.vectorize.io/mcp/my-project/",
        "headers": { "Authorization": "承载HSK_..." }
      }
    }
  }
  ```

- **`.github/copilot-instructions.md`**，其中Copilot适用于工作区中的每一次聊天 - 这就是recall/retain统治生活。

## 设置 {#setup}

```bash
pip install hindsight-copilot
cd your-project
hindsight-copilot init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 合并 `servers`进入`./.vscode/mcp.json`并将规则写入`./.github/copilot-instructions.md`。重新加载VS Code，打开Copilot聊天**智能体模式**，然后启动聊天工具菜单中的 `hindsight`MCP服务器。

使用[Hindsight Cloud](https://hindsight.vectorize.io) 密钥，或带有 的自托管服务器 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。如果`mcp.json`有评论，`init` 打印要粘贴的代码片段 — 或运行 `hindsight-copilot init --print-only` 随时。

## 命令 {#commands}

|命令|说明|
| --- | --- |
|`hindsight-copilot init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-copilot status`|显示服务器+规则是否配置|
|`hindsight-copilot uninstall`|删除服务器+规则|

参见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/github-copilot) 用于完整配置选项。
