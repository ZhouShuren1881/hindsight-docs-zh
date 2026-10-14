---
sidebar_position: 7
title: "使用 Hindsight 为 Devin Desktop 提供持久记忆 | 集成"
description: "通过 MCP 使用 Hindsight 为 Devin Desktop（原 Windsurf）添加长期记忆。只需一条命令，即可将 Hindsight MCP 服务器配置到 mcp_config.json，并添加始终生效的召回/存入规则，让 Devin 自动使用记忆。"
---

# Devin Desktop {#devin-desktop}

[Devin Desktop](https://devin.ai) 是一款编辑器，前身为 Windsurf（Codeium）。通过 [Hindsight](https://vectorize.io/hindsight)，你可以为它提供长期记忆。只需一条命令，就能将 Devin 连接到 Hindsight MCP 服务器，并添加规则指引智能体使用它：在任务开始时召回相关记忆，并在工作过程中存入值得长期保留的事实。召回会在查询时根据你的实际消息进行；从你的使用角度看，整个过程是自动的。

:::note
Cognition 于 2026 年 6 月将 Windsurf 更名为 Devin Desktop。MCP 配置仍位于 `~/.codeium/windsurf/`，这是 Devin Desktop 在磁盘上的数据目录，更名后没有变化。工作区规则现在位于 `.devin/rules/`；`.windsurf/rules/` 仍作为旧版回退路径保留。
:::

[查看更新日志 →](/changelog/integrations/devin-desktop)

## 工作原理 {#how-it-works}

Devin Desktop 提供了此集成所用的两项功能：

- **MCP 服务器：** Devin Desktop 会运行配置在 `~/.codeium/windsurf/mcp_config.json` 的 `mcpServers` 下的 MCP 服务器，并向智能体提供这些服务器的工具。远程服务器通过 `serverUrl` 字段连接，也可以附带可选请求头，因此 Hindsight MCP 端点可以直接连接，无需桥接；智能体由此可以使用 `recall` / `retain` / `reflect` 工具。
- **工作区规则：** 规则位于 `.devin/rules/` 中。带有 `trigger: always_on` frontmatter 的规则文件会包含在该工作区发出的每个 Devin 请求中。集成会在此写入一条简短规则，指引智能体先召回记忆，再存入它学到的内容。

## 设置 {#setup}

```bash
pip install hindsight-devin-desktop
cd your-project
hindsight-devin-desktop init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 会将 `hindsight` MCP 服务器添加到 `~/.codeium/windsurf/mcp_config.json`（Devin Desktop 唯一的全局 MCP 配置文件），并将召回/存入规则写入 `./.devin/rules/hindsight.md`。重新加载 Devin Desktop（或刷新 MCP 服务器）后，`hindsight` 服务器提供的工具就可以使用了。

你可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，也可以通过 `--api-url http://localhost:8888` 指向自托管服务器（开放的本地服务器无需令牌）。如果你的 `mcp_config.json` 不是纯 JSON，`init` 会打印出供你粘贴的配置项，而不会重写文件；你也可以随时运行 `hindsight-devin-desktop init --print-only`。

## 命令 {#commands}

| 命令 | 说明 |
| --- | --- |
| `hindsight-devin-desktop init` | 添加 MCP 服务器和召回/存入规则 |
| `hindsight-devin-desktop status` | 显示服务器和规则是否已配置 |
| `hindsight-devin-desktop uninstall` | 移除服务器和规则 |

## 说明 {#note}

智能体会按照始终生效的规则，通过 MCP 工具调用召回和存入功能。这样，召回会在查询时根据实际消息进行，精准且没有延迟；代价是这依赖智能体遵守“先召回记忆”的指令，而不是由编辑器强制执行。

完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/devin-desktop)。
