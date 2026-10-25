---
title: "Cursor 持久记忆：编辑器与 CLI 共用一个记忆库"
authors: [benfrank241]
slug: "2026/06/12/cursor-persistent-memory"
date: 2026-06-12T12:00
tags: [cursor, cursor-cli, memory, persistent-memory, hindsight, coding-agents, tutorial]
description: "Hindsight 新增了两种集成，为 Cursor 提供持久的长期记忆：一种用于 Cursor 编辑器（针对 Cursor 3.x 中失效的 sessionStart additionalContext 通道提供绕行方案），另一种用于 Cursor CLI。两者可以共用同一个记忆库。"
image: /img/blog/cursor-persistent-memory.webp
hide_table_of_contents: true
---

![Cursor 与 Hindsight 的持久记忆](/img/blog/cursor-persistent-memory.webp)

[Cursor](https://cursor.com) 有两种开发者实际会用到的界面：编辑器和 [Cursor CLI](https://cursor.com/docs/cli)。两者都能运行智能体，但都不会在不同会话之间保留记忆。现在有两种新的 Hindsight 集成可以解决这个问题。有意思的是，它们既能写入同一个记忆库，也能从中读取。任务进行到一半时从编辑器切换到 CLI，智能体仍然知道你昨天作出的决定。

本文将介绍这两种集成：用于编辑器的 `hindsight-cursor`，以及用于命令行智能体的 `hindsight-cursor-cli`。两者使用的记忆基础能力大致相同，只是接入了不同的生命周期。编辑器集成还有一个值得注意的细节：Cursor 3.x 的会话启动上下文注入通道存在已知问题，因此该集成提供了一个简洁的绕行方案。

## 概览 {#tldr}

<!-- truncate -->

- 两个 pip 软件包：`hindsight-cursor`（编辑器，官方集成）和 `hindsight-cursor-cli`（由社区成员 [@Korayem](https://github.com/Korayem) 构建）。
- 两者都使用 Cursor 生命周期钩子：每次聊天会话或提示之前召回记忆，每个任务结束后或每 N 轮存入记忆。
- **编辑器集成还提供 MCP 服务器**，除了自动在会话开始时召回记忆，也支持在会话期间显式调用 `recall` / `retain` / `reflect` 工具。
- **编辑器集成绕过了 Cursor 3.x 的一个问题**：原生的 `additionalContext` 注入通道失效。记忆会写入工作区规则文件，再由 Cursor 的规则引擎可靠地读取。
- **CLI 集成有四个钩子**（`sessionStart`、`beforeSubmitPrompt`、`stop`、`sessionEnd`），并要求 Cursor CLI v0.45+。
- 将两种集成指向相同的 `bankId`，就能无缝切换使用。

## Cursor 为什么需要持久记忆 {#why-cursor-needs-persistent-memory}

每个新的 Cursor 会话都是一个没有上下文的新模型。它可以读取工作区中的文件，也能获取你写在 `.cursor/rules` 中的内容。但它不知道之前会话里发生过什么：你周二调试过的错误、上周讨论过的架构决策，或你为这个代码库制定的测试文件命名约定。

你可以手动把上下文写进规则文件。这对你记得要记录的事情有效，却无法涵盖那些当时没意识到重要、后来才发现有用的信息。持久记忆可以补上这个缺口：每个会话都会存入自身内容，每个新会话都会自动召回相关的过往内容。

两个界面，一层记忆。

## `hindsight-cursor`：编辑器集成 {#hindsight-cursor-the-editor-integration}

编辑器集成是一个 `pip` 插件，会安装到项目的 `.cursor-plugin/hindsight-memory/` 目录。它接入了两种互补机制。

**插件钩子（自动运行）。** 智能体处理每个新聊天的第一条提示时会运行 `session_start.py`。该脚本会针对你的记忆库执行项目级记忆召回，并展示结果，让智能体在回答前就能看到相关内容。每项任务结束后，`retain.py` 会在 `stop` 事件触发时运行并存储对话记录。

**MCP 服务器（按需调用）。** 安装程序还会写入 `.cursor/mcp.json`，将 Cursor 连接到 Hindsight 的 MCP 端点。这样智能体就能使用三个显式工具（`recall`、`retain`、`reflect`），并在会话中需要更多记忆时主动调用；这些工具补充了会话开始时自动注入的记忆。

### Cursor 3.x 的绕行方案 {#the-cursor-3x-workaround}

Cursor 原本通过 `additionalContext` JSON 字段传递会话启动钩子的输出：钩子把记忆文本打印到标准输出，Cursor 再将其放入智能体的系统提示中。但在 Cursor 3.x 中，这条通道失效了（Cursor 工作人员已[确认这个问题](https://forum.cursor.com/t/sessionstart-hook-additional-context-is-never-injected-into-agents-initial-system-context/158452)；本文撰写时，该问题在 3.6.31 版本中仍未解决）。如果只通过 `additionalContext` 传递，召回的记忆就无法到达模型。

该插件通过**同时**将召回的记忆写入 `<workspace>/.cursor/rules/hindsight-session.mdc` 来绕过问题，并在 frontmatter 中设置 `alwaysApply: true`。Cursor 的规则引擎会可靠地注入工作区规则文件，因此智能体在每个新聊天的第一条提示中就能看到记忆。

有几点值得了解：

- **每个新智能体的第一条提示都包含记忆。** Cursor 会等到 `sessionStart` 钩子返回后才允许提交提示；记忆召回通常不到一秒。
- **每次 `sessionStart` 开始时都会重新生成规则文件。** 上一会话遗留的过时记忆不会继续保留。
- **在 Git 工作区中，规则文件会自动加入 `.gitignore`。** 这项追加操作可重复执行而不会重复添加；非 Git 工作区中则不执行任何操作。
- **`additionalContext` 仍会输出到标准输出**，以便兼容未来版本。如果 Cursor 恢复了原生通道，该插件无需修改代码就能继续工作。

如果你不希望插件修改工作区规则，可以设置 `useRulesFileFallback: false`，让插件退回到（目前仍失效的）原生通道。只有在你宁愿接受该问题的影响，也不想让插件写入规则文件时，这个设置才有用。

### 安装 {#install}

```bash
pip install hindsight-cursor
cd /path/to/your-project
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

然后**彻底退出并重新打开 Cursor**：插件会在启动时加载。

如果要自托管，请省略 `--api-url` / `--api-token` 参数，并在本地运行 Hindsight（`docker run ghcr.io/vectorize-io/hindsight:latest`）。如果你不想自行运行服务器，该插件也可以通过 `uvx` 自动管理本地 `hindsight-embed` 守护进程。

## `hindsight-cursor-cli`：CLI 集成 {#hindsight-cursor-cli-the-cli-integration}

CLI 集成是一个独立的软件包，由社区成员 [@Korayem](https://github.com/Korayem) 构建。它将四个 Cursor CLI 钩子接入同一套记忆召回和存入能力。

| 钩子 | 操作 |
| --- | --- |
| `sessionStart` | 确认 Hindsight 可访问；如有需要，预热本地守护进程 |
| `beforeSubmitPrompt` | 召回相关记忆，并将其作为 `additional_context` 注入 |
| `stop` | 每经过配置的 N 轮，将对话存入长期记忆 |
| `sessionEnd` | 强制执行最后一次记忆存入，确保较短的会话也能保存 |

这种生命周期与编辑器插件有两点不同：

- **每条提示之前都会触发记忆召回，而不仅是在会话开始时触发。** CLI 的交互更侧重逐轮处理；每条提示都进行记忆召回，可以为每个新问题匹配合适的上下文，而不是只依赖会话开始时的一次宽泛项目级召回。
- **`sessionEnd` 会确保执行记忆存入。** 过去，如果 `stop` 只在每 N 轮触发，较短的 CLI 会话（输入一两条提示后就退出）可能会被漏掉。`sessionEnd` 钩子弥补了这个缺口。

### 安装 {#install-1}

```bash
pip install hindsight-cursor-cli
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

安装程序会将钩子脚本复制到 `~/.cursor/hooks/cursor-cli/`，把脚本的绝对路径写入 `~/.cursor/hooks.json`（并与现有条目合并），同时生成 `~/.hindsight/cursor-cli.json` 供个人覆盖配置使用。重启 Cursor CLI 以加载这些钩子。

钩子功能要求 Cursor CLI v0.45+。钩子脚本只使用 Python 3 标准库，运行时无需执行 `pip install`。

## 在两个界面间共用一个记忆库 {#sharing-one-bank-across-both-surfaces}

两种集成都向 `bankId` 指定的记忆库写入内容。默认情况下，编辑器使用 `cursor`，CLI 使用 `cursor-cli`。将两者指向同一个记忆库，就能共享记忆：

```json
// ~/.hindsight/cursor.json AND ~/.hindsight/cursor-cli.json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_key",
  "bankId": "my-cursor-memory"
}
```

这样，你在 CLI 会话中存入的内容就会出现在编辑器的会话启动记忆召回中，反过来也一样。周二早上你在火车上与 CLI 智能体讨论的决定，周二下午就会出现在编辑器的第一条提示中。

如果要让这两个界面中的每个项目分别隔离，请将两份配置都切换为动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

两种集成都根据工作区路径的基本名称生成 `project`。如果你想在同一代码库的多个工作树之间共享记忆，CLI 还支持 `gitProject`。

## 相同点与不同点 {#whats-the-same-and-whats-different}

大部分配置选项是共用的。两者的差异在于各自界面能做什么，而不是 Hindsight 的行为有何不同。

| | `hindsight-cursor`（编辑器） | `hindsight-cursor-cli`（CLI） |
| --- | --- | --- |
| 作者 | Hindsight 团队（官方） | [@Korayem](https://github.com/Korayem)（社区） |
| 钩子 | `sessionStart`、`stop` | `sessionStart`、`beforeSubmitPrompt`、`stop`、`sessionEnd` |
| 记忆召回触发时机 | 每次聊天一次（会话开始时） | 每条提示一次 |
| MCP 服务器 | 有（提供 `recall` / `retain` / `reflect` 工具） | 无 |
| Cursor 3.x `additionalContext` 绕行方案 | 回退到工作区规则文件 | 不适用（使用不同的通道） |
| 自动管理本地守护进程 | 有（`uvx hindsight-embed`） | 有 |
| 默认 `bankId` | `cursor` | `cursor-cli` |
| Cursor 版本要求 | Cursor 3.x（绕过该问题） | Cursor CLI v0.45+ |
| 运行时 Python 依赖 | 仅标准库 | 仅标准库 |

两者共用：完整的 `retainMode` 语义（`full-session` / `chunked`）、`recallBudget`（`low` / `mid` / `high`）、`recallMaxTokens`、`dynamicBankId` + `dynamicBankGranularity`、`HINDSIGHT_*` 环境变量覆盖，以及连接 Hindsight Cloud 或自托管服务的能力。

## 权衡 {#tradeoffs}

**编辑器：规则文件绕行方案会在工作区中放入一个文件。** 文件很小，每次会话都会重新生成，并且会自动加入 `.gitignore`。大多数人不会注意到它。如果你完全不希望插件写入工作区，可以将 `useRulesFileFallback` 设为 `false`，改用原生通道；代价是 Cursor 修复上游问题之前，记忆都无法传递给模型。

**CLI：每条提示都召回记忆，成本更高。** 智能体运行之前，每条提示都会触发一次 Hindsight 查询。在 Hindsight Cloud 上，通常不到一秒，但仍会产生开销。如果需要跳过召回，可以将 `recallBudget` 降为 `"low"`，或设置 `autoRecall: false`。

**两者：存入操作会异步提取事实。** 存入调用会在对话记录写入记忆库后返回，而不是等到提取器处理完成后才返回。几秒钟后，这些事实便可供召回。对于聊天式工作流来说，这没有问题，因为下一次会话至少要过一分钟才开始。对于在同一次运行中先存入、再召回的自动化脚本，请给提取器一点处理时间。

**选择共用一个记忆库还是使用两个记忆库，确实需要权衡。** 共用一个记忆库很方便，但会把编辑器和 CLI 的使用模式混在同一组事实中。使用两个记忆库可以让每个界面拥有自己的上下文，却会失去跨界面的连续性。多数人会更适合共用一个记忆库；如果需要区分信息来自哪个界面，仍可使用基于标签的筛选（`retainTags`）。

## 设置 {#setup}

两种集成都可以按以下步骤快速完成设置：

1. 在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 注册（免费套餐就够用）。
2. 从控制台获取 API 密钥。
3. 安装你需要的集成：
   ```bash
   pip install hindsight-cursor                  # 编辑器
   pip install hindsight-cursor-cli              # CLI
   ```
4. 对每种集成各运行一次安装程序：
   ```bash
   cd /path/to/your-project
   hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
   hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
   ```
5. 重启 Cursor（彻底退出并重新打开编辑器；重启 CLI 会话）。从下一条提示开始，智能体就能使用记忆。

如果希望两个界面共用一个记忆库，请在 `~/.hindsight/cursor.json` 和 `~/.hindsight/cursor-cli.json` 中设置相同的 `bankId`。

## 回顾 {#recap}

| | Cursor 默认行为 | 使用 Hindsight 后 |
| --- | --- | --- |
| 编辑器跨会话记忆 | 无 | 会话开始时召回；在 `stop` 时存入 |
| CLI 跨提示记忆 | 无 | 每条提示前召回；在 `stop` 和 `sessionEnd` 时存入 |
| 编辑器中的按需记忆工具 | 无 | MCP `recall` / `retain` / `reflect` |
| 按项目隔离 | 手动配置规则 | 可选使用 `dynamicBankId` |
| 编辑器与 CLI 之间共享记忆 | 不适用 | 两份配置使用同一个 `bankId` |
| Cursor 3.x `additionalContext` 问题 | 会受影响 | 通过规则文件绕行 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **编辑器集成文档：**[Cursor + Hindsight](/sdks/integrations/cursor)
- **CLI 集成文档：**[Cursor CLI + Hindsight](/sdks/integrations/cursor-cli)
- **源代码：**
  [`hindsight-integrations/cursor`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cursor)、
  [`hindsight-integrations/cursor-cli`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cursor-cli)
- **Hindsight API 参考：**[API 快速入门](/developer/api/quickstart)
