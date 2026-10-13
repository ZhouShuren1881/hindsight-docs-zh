---
title: "Cursor 持久记忆：编辑器和 CLI 的一个记忆库"
authors: [benfrank241]
slug: "2026/06/12/cursor-persistent-memory"
date: 2026-06-12T12:00
tags: [cursor, cursor-cli, memory, persistent-memory, hindsight, coding-agents, tutorial]
description: "两个新的Hindsight集成为Cursor提供持久的长期记忆：一个用于Cursor编辑器（在Cursor3.x中提供了针对损坏的sessionStartadditionalContext通道的解决方法），另一个用于CursorCLI。两者可以共享相同的记忆库。"
image: /img/blog/cursor-persistent-memory.webp
hide_table_of_contents: true
---

![Cursor 持久记忆Hindsight](/img/blog/cursor-persistent-memory.webp)

[Cursor](https://cursor.com) 有开发人员实际使用的两个界面：编辑器和 [Cursor CLI](https://cursor.com/docs/cli)。两者都运行智能体。两人都不记得会议之间的任何事情。今天有两个新的 Hindsight 集成解决了这个问题，并且（这是有趣的部分）它们都可以在同一个记忆库中写入和读取。在任务中从编辑器切换到 CLI，智能体已经知道您昨天的决定。

这篇文章是两种集成的演练：`hindsight-cursor`用于编辑器和`hindsight-cursor-cli`用于命令行智能体。这个故事主要是将相同的记忆原语连接到两个不同的生命周期中，在编辑器方面有一个值得注意的细节：Cursor 3.x 在其会话启动上下文注入通道中存在一个已知错误，并且编辑器集成附带了一个干净的解决方法。

## 概览 {#tldr}

<!-- truncate -->

- ​​两个pip软件包：`hindsight-cursor`（编辑器，第一方）和`hindsight-cursor-cli`（CLI，由[@Korayem](https://github.com/Korayem)社区构建）。
- 两者都使用Cursor的生命周期钩子：每个聊天会话/提示之前的记忆召回，每个任务或每N轮之后的记忆存储。
- **编辑器集成还附带一个MCP服务器**，用于会话期间的显式 `recall` / `retain` / `reflect` 工具，位于自动会话启动记忆召回之上。
- **编辑器集成围绕 Cursor 3.x 错误**打破了原生的`additionalContext`注入通道。记忆被写入Cursor的规则引擎可靠地拾取的工作区规则文件中。
- **CLI 集成有四个钩子**（`sessionStart`、`beforeSubmitPrompt`、`stop`、`sessionEnd`）并需要 Cursor CLI v0.45+。
- 点都在同一个`bankId`并且切换表面是透明的。

## 为什么Cursor需要持久记忆 {#why-cursor-needs-persistent-memory}

新的Cursor会话是一个没有上下文的新模型。它可以读取您工作区中的文件，并且它具有您在`.cursor/rules`中写入的任何内容。它没有任何关于之前会议的信息：您在周二调试的错误、您上周讨论的架构决策、您为该代码库命名测试文件的方式建立的约定。

您可以使用规则文件手动固定上下文。这适用于你记得写下来的事情，但不适用于你后来才意识到重要的事情。持久记忆弥补了这一差距：每个会话都会保留自己，每个新会话都会自动回忆起相关的过去内容。

两个表面，一个记忆层。

## `hindsight-cursor`：编辑器集成 {#hindsight-cursor-the-editor-integration}

编辑器集成是一个`pip`插件，安装到项目的`.cursor-plugin/hindsight-memory/`目录中。它连接了两个互补的机制。

**​​插件挂钩（自动）。
当智能体处理每个新聊天的第一个提示时，**`session_start.py`运行。它针对您的记忆库运行项目级记忆召回并显示结果，以便智能体在回答之前看到它。 `retain.py` 在每个任务之后在 `stop` 事件上运行并存储脚本。

**MCP 服务器（按需）。** 安装程序还编写 `.cursor/mcp.json` 将 Cursor 连接到 Hindsight 的 MCP 端点，为智能体提供三个显式工具（`recall`、`retain`、`reflect`），以便在需要记忆时可以在会话中调用。超出了开始时注入的内容。

### Cursor 3.x 解决方法 {#the-cursor-3x-workaround}

Cursor 用于传递会话启动钩子输出的本机通道是 `additionalContext` JSON 字段：钩子在标准输出上打印记忆文本，Cursor 将其放置在智能体的系统提示符中。在 Cursor 3.x 中，该通道已损坏（错误是 [得到Cursor工作人员的认可](https://forum.cursor.com/t/sessionstart-hook-additional-context-is-never-injected-into-agents-initial-system-context/158452)，在撰写本文时针对 3.6.31 仍然开放）。如果 `additionalContext` 是唯一的传递路径，则回忆永远不会到达模型。

插件通过 **还有** 将调用的记忆写入 `<workspace>/.cursor/rules/hindsight-session.mdc` 以及 `alwaysApply: true` 来解决这个问题。工作区规则文件由Cursor的规则引擎可靠地注入，因此智能体在每次新聊天的第一个提示时都能看到记忆。

一些值得了解的细节：

- **每个新智能体的第一个提示都有记忆。** Cursor 阻止提示提交，直到 `sessionStart` 钩子返回； 记忆延迟通常低于一秒。
- **规则文件在每个`sessionStart`的顶部重新生成。** 上一课的陈旧记忆不会持续存在。
- **规则文件是自动`.gitignore`'d
git 工作区中的**（幂等追加；非 git 工作区无操作）。
- **`additionalContext` 仍然发送到标准输出** 用于向前兼容。如果 Cursor 恢复原生频道，同一插件无需更改代码即可继续工作。

如果您不想让插件触及您的工作区规则，请设置`useRulesFileFallback: false`，插件将回退到（当前已损坏的）本机通道。仅当您宁愿看到错误而不愿让插件编写规则文件时才有用。

### 安装 {#install}

```bash
pip install hindsight-cursor
cd /path/to/your-project
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

然后**完全退出并重新打开Cursor**：插件在启动时加载。

对于自托管，请删除 `--api-url` / `--api-token` 标志并在本地运行 Hindsight (`docker run ghcr.io/vectorize-io/hindsight:latest`)。如果您不想自己运行服务器，该插件还可以通过 `uvx` 自动管理本地 `hindsight-embed` 守护进程。

## `hindsight-cursor-cli`：CLI 集成 {#hindsight-cursor-cli-the-cli-integration}

CLI 集成是一个单独的包，由[@Korayem](https://github.com/Korayem) 社区构建，它将四个 Cursor CLI 挂钩连接到相同的记忆召回/记忆存储原语。

|钩子|行动|
|---|---|
|`sessionStart`|确认 Hindsight 可达，并在需要时预热本地守护进程|
|`beforeSubmitPrompt`|召回相关记忆并将其注入为`additional_context`|
|`stop`|每配置N轮，将对话保留长期记忆|
|`sessionEnd`|强制最终记忆存储，因此仍然存储短会话|

此生命周期与编辑器插件有两点不同：

- **记忆召回在每次提示之前触发，而不仅仅是会话开始。** CLI 是一个更加逐个转弯的界面，每个提示的记忆召回意味着每个新问题都会得到适合的上下文，而不是依赖于顶部的单个广泛的项目级记忆召回。
- **`sessionEnd`保证记忆存储。
如果 `stop` 仅每 N 轮触发一次，** 短 CLI 会话（一到两个提示，然后退出）通常会掉在地板上。 `sessionEnd` 钩子弥补了这一差距。

### 安装 {#install}

```bash
pip install hindsight-cursor-cli
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

安装程序将挂钩脚本复制到`~/.cursor/hooks/cursor-cli/`，使用脚本的绝对路径写入`~/.cursor/hooks.json`（与任何现有条目合并），并为个人覆盖添加种子`~/.hindsight/cursor-cli.json`。重新启动 Cursor CLI 以加载挂钩。

Cursor CLI v0.45+ 需要钩子支持。挂钩脚本仅使用 Python 3 stdlib，运行时不需要 `pip install`。

## 在两个表面上共享一个记忆库 {#sharing-one-bank-across-both-surfaces}

两个集成都写入`bankId`。默认情况下，编辑器使用`cursor`，CLI 使用`cursor-cli`。将他们指向同一个记忆库，他们共享记忆：

```json
// ~/.hindsight/cursor.json AND ~/.hindsight/cursor-cli.json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_key",
  "bankId": "my-cursor-memory"
}
```

现在，您从 CLI 会话中记忆存储的任何内容都会显示在编辑器的会话启动记忆召回中，反之亦然。您周二早上在火车上与 CLI 智能体讨论的决定将在周二下午出现在编辑的第一个提示中。

对于跨两个表面的每个项目隔离，将两个配置切换为动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

两个集成都从工作空间路径（基本名称）派生`project`。如果您想在同一存储库的工作树之间共享记忆，CLI 还支持`gitProject`。

## 相同点和不同点 {#whats-the-same-and-whats-different}

大部分配置表面是共享的。差异在于每个表面可以做什么，而不是 Hindsight 的行为方式。

||`hindsight-cursor`（编辑）|`hindsight-cursor-cli`（命令行）|
|---|---|---|
|作者|Hindsight团队（第一方）|[@Korayem](https://github.com/Korayem)（社区）|
|挂钩|`sessionStart`, `stop`|`sessionStart`、`beforeSubmitPrompt`、`stop`、`sessionEnd`|
|记忆召回触发|每次聊天一次（会话开始）|每个提示一次|
|MCP 服务器|是（`recall` / `retain` / `reflect` 工具）|否|
|Cursor 3.x `additionalContext` 解决方法|工作区规则-文件后备|不适用（使用不同的通道）|
|本地守护进程自动管理|是 (`uvx hindsight-embed`)|是|
|默认 `bankId`|`cursor`|`cursor-cli`|
|Cursor 版本要求|Cursor 3.x（解决该错误）|Cursor CLI v0.45+|
|运行时 Python 依赖|仅 stdlib|仅 stdlib|

两者共享：完整的`retainMode`语义 (`full-session` / `chunked`), `recallBudget` (`low` / `mid` / `high`), `recallMaxTokens`, `dynamicBankId` + `dynamicBankGranularity`, `HINDSIGHT_*` 环境变量覆盖，以及 Hindsight Cloud或自主机连接。

## 权衡 {#tradeoffs}

**编辑器：规则文件解决方法将文件放入您的工作区中。** 它很小，每次会话都会重新生成，并且自动`.gitignore`'d。大多数人不会注意到。如果您根本不想让插件写入您的工作区，`useRulesFileFallback: false` 会恢复到本机通道，但代价是没有记忆传递，直到 Cursor 修复上游错误。

**CLI：每次提示记忆召回成本更高。** 每个提示都会在智能体运行之前触发Hindsight 查询。在 Hindsight Cloud上，通常不到一秒，但它不是免费的。如果需要跳过，请将`recallBudget`删除至`"low"`，或设置`autoRecall: false`。

​​**两者：记忆存储异步提取事实。** 记忆存储调用会在成绩单到达记忆库时返回，而不是在提取器完成时返回。事实在几秒钟内就可以回忆起来。这对于聊天式工作流程来说很好，因为下一个会话至少还有一分钟的时间。对于在同一运行中记忆存储然后记忆召回的自动化脚本，请给提取器一个节奏。

**两个记忆库与一个记忆库是一个真正的选择。** 共享一个记忆库很方便，但在同一事实集中混合了编辑器和 CLI 使用模式。两个记忆库为每个表面提供了自己的上下文，但失去了跨表面的连续性。大多数人会对拥有一个共享的记忆库感到更高兴；如果需要，基于标签的过滤 (`retainTags`) 仍然可以区分哪个表面产生了什么。

## 设置 {#setup}

两者的快速路径：

1. 在[hindsight.vectorize.io](https://ui.hindsight.vectorize.io)注册（免费套餐就足够了）。
2. 从仪表板上获取API钥匙。
3. 安装您想要的任何集成：
   ```bash
   pip install hindsight-cursor                  # editor
   pip install hindsight-cursor-cli              # CLI
   ```
4. 每次集成运行一次安装程序：
   ```bash
   cd /path/to/your-project
   hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
   hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
   ```
5. 重新启动Cursor（完全退出并重新打开编辑器；重新启动 CLI 会话）。智能体从下一个提示开始就有记忆。

如果您希望两个表面共享一个记忆库，请在`~/.hindsight/cursor.json`和`~/.hindsight/cursor-cli.json`中设置相同的`bankId`。

## 回顾 {#recap}

||Cursor 默认|与 Hindsight|
|---|---|---|
|跨会话记忆（编辑）|无|在会话开始时调用，在 `stop` 保留|
|跨提示记忆 (CLI)|无|在每个提示前调用，保留在 `stop` + `sessionEnd`|
|编辑器中的按需记忆工具|无|MCP `recall` / `retain` / `reflect`|
|每个项目的隔离|手动规则|可选通过`dynamicBankId`|
|跨编辑器 + CLI 共享记忆|不适用|两个配置中都有一个 `bankId`|
|Cursor 3.x `additionalContext` 错误|击中你|通过规则文件解决|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **编辑器集成文档：**[Cursor + Hindsight](/sdks/integrations/cursor)
- **CLI 集成文档：**[Cursor CLI + Hindsight](/sdks/integrations/cursor-cli)
- **来源：**
  [`hindsight-integrations/cursor`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cursor),
  [`hindsight-integrations/cursor-cli`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cursor-cli)
- **HindsightAPI参考：**[API 快速入门](/developer/api/quickstart)
