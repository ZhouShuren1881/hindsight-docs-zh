---
sidebar_position: 38
title: "使用 Hindsight 为 Aider 提供持久记忆 | 集成"
description: "通过 hindsight-aider 包装 aider CLI，在每次会话前召回相关项目记忆，会话后存储记录，为 Aider 提供持久长期记忆。"
---

# Aider

由 [Hindsight](https://vectorize.io/hindsight) 驱动，为 [Aider](https://aider.chat) 提供持久的长期记忆。`hindsight-aider` 是 `aider` 命令的即用包装：**会话前召回相关项目记忆**，通过只读文件注入 Aider 上下文，并在**会话后存储记录**。每次会话都能利用已有经验，并保存新学到的内容。记忆**按 git 仓库**划分。

[查看更新日志 →](/changelog/integrations/aider)

## 工作原理 {#how-it-works}

Aider 没有 MCP 客户端或每次提示的钩子，但支持加载**只读上下文文件**，并写入**聊天历史文件**。包装器利用这两项能力：

- **召回（会话前）**：查询 Hindsight，将结果写入 `.aider.hindsight-memory.md`，并执行 `aider --read .aider.hindsight-memory.md …`，使记忆进入上下文。使用 `aider -m "修复认证问题"` 时，该消息作为召回查询；否则使用通用的项目上下文查询。
- **存储（会话后）**：Aider 退出时，包装器读取本次会话新增的聊天记录，并存入仓库对应记忆库。

每次会话只召回一次，因为无法在 Aider 对话中途挂接钩子，这与其会话式工作流相符。

## 配置 {#setup}

```bash
pip install hindsight-aider aider-chat
export HINDSIGHT_API_TOKEN=hsk_...
```

使用方式与 `aider` 完全一致，所有参数都会透传：

```bash
hindsight-aider                       # 交互模式，载入项目记忆
hindsight-aider -m "添加重试逻辑"  # 单次运行，消息用于召回
hindsight-aider src/app.py            # 支持任意 aider 参数
```

可使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，或设置 `HINDSIGHT_API_URL=http://localhost:8888` 连接自托管服务器。记忆库默认使用 git 仓库名称，因此同一项目可与其他 Hindsight 编辑器集成共享记忆。

完整配置选项见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/aider)。
