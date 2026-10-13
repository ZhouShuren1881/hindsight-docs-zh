---
sidebar_position: 37
title: "OpenHands 持久记忆Hindsight |一体化"
description: "通过其原生MCP支持，使用Hindsight将长期记忆添加到OpenHands（以前的OpenDevin）。一条命令连接 Hindsight MCP 服务器以及 recall/retain 规则。"
---

# OpenHands {#openhands}

的长期记忆 [OpenHands](https://github.com/OpenHands/OpenHands)（以前的 OpenDevin），由 提供支持 [Hindsight](https://vectorize.io/hindsight)。一条命令连接OpenHands到HindsightMCP服务器并添加一个recall/retain规则——智能体在任务开始时回忆起相关记忆，并在工作时保留持久的事实。

[查看更新日志 →](/changelog/integrations/openhands)

## 工作原理 {#how-it-works}

OpenHands有**原生 Streamable-HTTP MCP 支持**，所以HindsightMCP端点直接连接（无桥接）：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

OpenHands也加载`AGENTS.md`（和回购微代理）进入智能体的每项任务的上下文中——这就是recall/retain统治生活，告诉智能体`recall` 首先和 `retain` 持久的事实。

## 设置 {#setup}

```bash
pip install hindsight-openhands
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 合并 `[mcp]`进入`./config.toml`并将规则写入`./AGENTS.md`。使用[Hindsight Cloud](https://hindsight.vectorize.io) 键，或使用 指向自托管服务器 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。如果`config.toml` 无法安全解析，`init` 打印要粘贴的代码片段 — 或运行 `hindsight-openhands init --print-only` 随时。

## 命令 {#commands}

|命令|说明|
| --- | --- |
|`hindsight-openhands init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-openhands status`|显示服务器+规则是否配置|
|`hindsight-openhands uninstall`|删除服务器+规则|

参见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openhands) 用于完整配置选项。
