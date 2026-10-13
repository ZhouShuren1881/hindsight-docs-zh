---
sidebar_position: 7
title: "Devin Desktop 持久记忆Hindsight |整合"
description: "通过MCP使用Hindsight将长期记忆添加到Devin Desktop（以前的Windsurf）。一个命令将 Hindsight MCP 服务器连接到 mcp_config.json 以及始终在线的 recall/retain 规则，因此记忆会在 Devin 中自动工作。"
---

# Devin Desktop {#devin-desktop}

长期记忆[Devin Desktop](https://devin.ai) — 编辑器，以前称为 Windsurf (Codeium) — 由 提供支持 [Hindsight](https://vectorize.io/hindsight)。一条命令连接Devin到HindsightMCP服务器，并添加一条规则告诉智能体使用它——这样它就可以在任务开始时回忆起相关的记忆，并在任务进行过程中保留持久的事实。 记忆召回会在查询时针对您的实际消息发生，并且在您的座位上它是自动的。

:::note Cognition 将 Windsurf 更名为Devin Desktop2026 年 6 月。MCP配置仍然位于 下 `~/.codeium/windsurf/` — 那是Devin Desktop的磁盘数据目录并因品牌重塑而保持不变。工作空间规则现在位于 下 `.devin/rules/`（与`.windsurf/rules/` 作为遗留后备保留）。
:::

[查看更新日志 →](/changelog/integrations/devin-desktop)

## 工作原理 {#how-it-works}

Devin Desktop 支持此集成使用的两种功能：

- **MCP 服务器：**Devin Desktop运行MCP在下配置的服务器 `mcpServers` `~/.codeium/windsurf/mcp_config.json` 并将他们的工具展示给智能体。远程服务器通过 连接 `serverUrl` 带有可选标头的字段，因此HindsightMCP端点直接连接 - 无需桥接 - 提供智能体 `recall` / `retain` / `reflect`工具。
- **工作区规则** `.devin/rules/`。带有 的规则文件 `trigger: always_on` frontmatter 包含在每个Devin工作区中的请求。集成在那里写了一条小规则，告诉智能体首先进行记忆召回，然后记忆存储它学到了什么。

## 设置 {#setup}

```bash
pip install hindsight-devin-desktop
cd your-project
hindsight-devin-desktop init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 添加 `hindsight`MCP服务器到`~/.codeium/windsurf/mcp_config.json` (Devin Desktop单曲全球MCP配置）并写入recall/retain规则`./.devin/rules/hindsight.md`。重新加载Devin Desktop（或刷新MCP服务器），以及 `hindsight`服务器工具可用。

使用[Hindsight Cloud](https://hindsight.vectorize.io) 键，或使用 指向自托管服务器 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。如果你的`mcp_config.json`并不简单JSON，`init` 打印要粘贴的条目，而不是重写文件 — 或运行 `hindsight-devin-desktop init --print-only` 随时。

## 命令 {#commands}

|命令|说明|
| --- | --- |
|`hindsight-devin-desktop init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-devin-desktop status`|显示服务器+规则是否配置|
|`hindsight-devin-desktop uninstall`|删除服务器+规则|

## 注意 {#note}

记忆召回和记忆存储通过智能体调用的MCP工具运行，并遵循始终在线的规则。这使得记忆召回查询时间精确（无延迟），但其代价是它依赖于遵循“记忆召回第一”指令的智能体，而不是编辑器强制执行它。

参见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/devin-desktop) 用于完整配置选项。
