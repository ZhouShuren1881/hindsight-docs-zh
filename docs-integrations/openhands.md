---
sidebar_position: 37
title: "借助 Hindsight 为 OpenHands 提供持久记忆 | 集成"
description: "通过 OpenHands 原生 MCP 支持，借助 Hindsight 为其添加长期记忆。运行一条命令即可接入 Hindsight MCP 服务器并添加 recall/retain 规则。"
---

# OpenHands {#openhands}

借助 [Hindsight](https://vectorize.io/hindsight)，为 [OpenHands](https://github.com/OpenHands/OpenHands)（前身为 OpenDevin）提供长期记忆。运行一条命令，即可将 OpenHands 连接到 Hindsight MCP 服务器并添加 recall/retain 规则，让智能体在任务开始时召回相关记忆，并在工作过程中存入值得长期保留的事实。

[查看更新日志 →](/changelog/integrations/openhands)

## 工作原理 {#how-it-works}

OpenHands 原生支持 **Streamable-HTTP MCP**，因此 Hindsight MCP 端点可以直接连接，无需桥接：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

OpenHands 还会在每项任务中将 `AGENTS.md`（以及仓库中的 microagents）加载到智能体上下文中。recall/retain 规则就写在这里，指导智能体先调用 `recall`，再将值得长期保留的事实存入记忆。

## 设置 {#setup}

```bash
pip install hindsight-openhands
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `[mcp]` 条目合并到 `./config.toml`，并将规则写入 `./AGENTS.md`。你可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，也可以通过 `--api-url http://localhost:8888` 指向自托管服务器（开放的本地服务器无需令牌）。如果 `config.toml` 无法安全解析，`init` 会打印可供粘贴的代码片段；你也可以随时运行 `hindsight-openhands init --print-only`。

## 命令 {#commands}

| 命令 | 说明 |
| --- | --- |
| `hindsight-openhands init` | 添加 MCP 服务器和 recall/retain 规则 |
| `hindsight-openhands status` | 显示服务器和规则是否已配置 |
| `hindsight-openhands uninstall` | 移除服务器和规则 |

完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openhands)。
