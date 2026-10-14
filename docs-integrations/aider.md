---
sidebar_position: 38
title: "使用 Hindsight 为 Aider 提供持久记忆 | 集成"
description: "通过 hindsight-aider 为 Aider 提供持久的长期记忆。hindsight-aider 包装 aider CLI，在每次会话前召回相关项目记忆，并在会话后存入对话记录。"
---

# Aider

借助 [Hindsight](https://vectorize.io/hindsight)，为 [Aider](https://aider.chat) 提供持久的长期记忆。`hindsight-aider` 是 `aider` 命令的即用型包装器：它会**在每次会话前召回相关项目记忆**（通过只读文件注入 Aider 的上下文），并在**会话结束后存入会话记录**，让每次 Aider 会话都能从已有经验开始，并保存新学到的内容。记忆按 **git 仓库**划分。

[查看更新日志 →](/changelog/integrations/aider)

## 工作原理 {#how-it-works}

Aider 没有 MCP 客户端或针对每条提示的钩子，但它可以加载**只读上下文文件**，并写入**聊天历史文件**。包装器会同时利用这两种能力：

- **Recall（召回，会话前）：**查询 Hindsight，将结果写入 `.aider.hindsight-memory.md`，然后启动 `aider --read .aider.hindsight-memory.md …`，使记忆进入上下文。`aider -m "fix the auth bug"` 会将该消息用作召回查询；否则会使用通用的项目上下文查询。
- **Retain（存入，会话后）：**Aider 退出时，包装器会读取聊天历史文件中本次会话写入的部分，并将其存入该仓库的记忆库。

每次会话只执行一次 Recall（Aider 无法在对话中途挂接钩子），这与它以会话为单位的工作方式相符。

## 配置 {#setup}

```bash
pip install hindsight-aider aider-chat
export HINDSIGHT_API_TOKEN=hsk_...
```

使用方式与 `aider` 完全相同，所有参数都会透传：

```bash
hindsight-aider                       # 交互模式，载入项目记忆
hindsight-aider -m "add retry logic"  # 单次运行；Recall 使用该消息
hindsight-aider src/app.py            # 可传入任意 aider 参数
```

可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥，也可以通过设置 `HINDSIGHT_API_URL=http://localhost:8888` 连接自托管服务器。记忆库默认使用 git 仓库名称，因此同一项目的记忆可与其他 Hindsight 编辑器集成共享。

完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/aider)。
