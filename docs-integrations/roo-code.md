---
sidebar_position: 20
title: "Roo Code 使用 Hindsight 实现持久记忆 | 集成"
description: "通过 Hindsight MCP 为 Roo Code 添加持久的长期记忆。系统会在每项任务开始前自动召回相关上下文，并在任务结束后存入新学到的内容，让每次会话都能承接上一次的经验。"
---

# Roo Code {#roo-code}

通过 [Hindsight](https://vectorize.io/hindsight) 为 [Roo Code](https://github.com/RooVetGit/Roo-Code) 添加持久的长期记忆。只需运行一条安装命令，即可注册 Hindsight 的 MCP 服务器并注入自定义规则，引导 Roo 在任务开始前召回上下文，并在任务结束后存入经验。

[查看更新日志 →](/changelog/integrations/roo-code)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 即可获取 API 密钥，无需自行运行基础设施。
:::

```bash
# 安装 CLI
pip install hindsight-roo-code

# 将集成安装到项目中（默认使用 Hindsight Cloud）
hindsight-roo-code install

# 重启 Roo Code，即可启用记忆
```

**自托管方式：**

```bash
# 先在本地启动 Hindsight
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api

# 然后使用本地 URL 安装
hindsight-roo-code install --api-url http://localhost:8888
```

## 工作原理 {#how-it-works}

Roo Code 主要通过两种机制扩展功能：用于提供工具的 **MCP 服务器**，以及用于注入系统提示的 **自定义规则**。此集成同时使用这两种机制。

```
新任务开始
  └─ 规则文件指示 Roo 调用 recall
       └─ 自动将相关记忆注入上下文

智能体工作中……
  └─ 智能体调用 retain，存入重要决策和发现

任务结束
  └─ 规则文件指示 Roo 调用 retain，存入摘要
       └─ 将摘要保存下来，供后续会话使用
```

安装程序会写入以下文件：

- **`.roo/mcp.json`** — 将 Hindsight 的 `/mcp` 端点注册为 MCP 服务器，并自动批准 `recall` 和 `retain`。
- **`.roo/rules/hindsight-memory.md`** — 注入到 Roo 每条系统提示中的指令。

## 安装选项 {#installation-options}

### 项目级安装（默认） {#project-local-install-default}

将文件写入当前目录的 `.roo/`，使记忆仅适用于此项目：

```bash
hindsight-roo-code install
hindsight-roo-code install --api-url https://api.hindsight.vectorize.io  # 默认（Hindsight Cloud）
hindsight-roo-code install --api-url http://localhost:8888                 # 自托管
hindsight-roo-code install --project-dir /path/to/project
```

### 全局安装 {#global-install}

将文件写入 `~/.roo/`，使其适用于所有项目：

```bash
hindsight-roo-code install --global
```

## 配置 {#configuration}

安装程序写入 `.roo/mcp.json` 的 MCP 配置项如下：

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "streamable-http",
      "url": "http://localhost:8888/mcp",
      "timeout": 30,
      "alwaysAllow": ["recall", "retain"]
    }
  }
}
```

安装后如需更新 API URL，请重新运行安装程序，或直接编辑 `.roo/mcp.json`。

## MCP 工具 {#mcp-tools}

Hindsight 通过 `/mcp` 端点提供两个工具：

| 工具 | 说明 |
|------|------|
| `recall` | 搜索记忆，查找与查询相关的上下文 |
| `retain` | 立即将内容存入记忆 |

规则文件会引导 Roo 在任务开始和结束时自动调用这些工具。智能体也可以在任务过程中显式调用它们。

## 验证设置 {#verifying-setup}

1. 启动 Hindsight 并运行安装程序。
2. 在项目中打开 Roo Code。
3. 检查 **Settings → MCP Servers**，确认 `hindsight` 显示为已连接。
4. 开始一项任务，检查工具调用日志中是否出现 `recall` 调用。

## 前置条件 {#prerequisites}

需要有一个正在运行的 Hindsight 实例：

**Hindsight Cloud（推荐）：**[免费注册](https://ui.hindsight.vectorize.io)，无需自行托管。

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # 在 http://localhost:8888 启动
```
