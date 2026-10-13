---
sidebar_position: 20
title: "Roo Code 持久记忆Hindsight |整合"
description: "通过HindsightMCP将持久的长期记忆添加到Roo Code。自动回忆每项任务之前的相关背景，并保留之后学到的知识 - 因此每个课程都建立在上一个课程的基础上。"
---

# Roo Code {#roo-code}

持久的长期记忆[Roo Code](https://github.com/RooVetGit/Roo-Code)来自[Hindsight](https://vectorize.io/hindsight)。一命令安装程序注册Hindsight的MCP服务器并注入自定义规则，教 Roo 在任务之前进行记忆召回上下文，并在任务之后进行记忆存储学习。

[查看更新日志 →](/changelog/integrations/roo-code)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 得到一个API即时密钥，无需运行基础设施。
:::

```bash
#安装 CLI
pip install hindsight-roo-code

#将集成安装到您的项目中（默认为Hindsight Cloud）
hindsight-roo-code install

#重新启动Roo Code — 记忆已激活
```

**自托管替代方案：**

```bash
#首先本地启动Hindsight
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api

#然后使用本地URL安装
hindsight-roo-code install --api-url http://localhost:8888
```

## 工作原理 {#how-it-works}

Roo Code有两个主要的扩展机制： **MCP 服务器** 用于工具和 **自定义规则** 用于系统提示注入。此集成同时使用两者。

```
新任务开始
  └─ 规则文件指示 Roo 调用 recall
       └─ 自动将相关记忆注入上下文

智能体工作中……
  └─ 智能体调用 retain 存储重要决策与发现

任务结束
  └─ 规则文件指示 Roo 调用 retain 存储摘要
       └─ 存储摘要以供后续会话使用
```

安装程序写道：
- **`.roo/mcp.json`** — 寄存器Hindsight的`/mcp` 端点作为MCP服务器，带有 `recall` 和 `retain` 自动批准
- **`.roo/rules/hindsight-memory.md`** — 指令注入到每个 Roo 系统提示符中

## 安装选项 {#installation-options}

### 项目本地安装（默认） {#project-local-install-default}

写入当前目录中的 `.roo/` — 记忆的范围仅限于此项目：

```bash
hindsight-roo-code install
hindsight-roo-code install --api-url https://api.hindsight.vectorize.io  #默认（Hindsight Cloud）
hindsight-roo-code install --api-url http://localhost:8888                 # self-hosted
hindsight-roo-code install --project-dir /path/to/project
```

### 全局安装 {#global-install}

写入当前目录中的 `~/.roo/` — 适用于所有项目：

```bash
hindsight-roo-code install --global
```

## 配置 {#configuration}

TheMCP条目写入`.roo/mcp.json`：

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

更新API安装后的 URL，重新运行安装程序或编辑 直接 `.roo/mcp.json`。

## MCP工具 {#mcp-tools}

Hindsight通过其公开了两个工具 `/mcp`端点：

|工具|说明|
|------|-------------|
|`recall`|在记忆中搜索与查询相关的上下文|
|`retain`|立即将内容存储在记忆中|

规则文件指示 Roo 在任务开始和结束时自动调用这些规则。 智能体也可以明确地在任务中调用它们。

## 验证设置 {#verifying-setup}

1. 启动Hindsight并运行安装程序
2. 在您的项目中打开Roo Code
3. 检查**设置 → MCP 服务器（Settings → MCP Servers）** — `hindsight` 应显示为已连接
4. 开始一项任务——你应该看到工具调用日志中调用 `recall`

## 前置条件 {#prerequisites}

正在运行的Hindsight实例：

**Hindsight Cloud（推荐）：**[注册](https://ui.hindsight.vectorize.io) — 无需自托管。

**自托管：**
```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # starts on http://localhost:8888
```
