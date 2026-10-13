---
title: "Cline 持久记忆：生命周期钩子代替MCP"
authors: [benfrank241]
slug: "2026/06/09/cline-persistent-memory"
date: 2026-06-09T12:00
tags: [cline, memory, persistent-memory, hindsight, coding-agents, tutorial]
description: "使用生命周期挂钩将持久记忆添加到Cline和Hindsight。无需MCP服务器，无需模型工具调用。确定性地挂钩每个任务之前的记忆召回上下文以及之后发生的记忆存储。"
image: /img/blog/cline-persistent-memory.webp
hide_table_of_contents: true
---

![Cline 持久记忆Hindsight](/img/blog/cline-persistent-memory.webp)

[Cline](https://github.com/cline/cline) 是 VS Code 中最常用的 AI 编码智能体之一。它读取文件、运行命令、编写代码并迭代任务直到完成。它不会在任务结束后记住任何事情。下一个任务一开始就冷冰冰的，不记得你所做的决定、你建立的约定，或者你费尽心思找到的代码库中的脆弱区域。

这篇文章是新的 Hindsight + Cline 集成的演练。它使用**Cline 的生命周期钩子**在每个任务之前添加自动记忆召回，并在任务结束时添加自动记忆存储，循环中没有MCP服务器，并且模型不必决定调用记忆工具。 记忆就这样发生了。

## 概览 {#tldr}

<!-- truncate -->

- Cline没有内置持久记忆。任务每次都从零重新开始。
- Hindsight集成安装四个生命周期挂钩脚本（`TaskStart`、`UserPromptSubmit`、`TaskComplete`、`TaskCancel`）以及一个小型Python库。 `pip install hindsight-cline`、一个 `install` 命令，以及钩子本身在 stdlib Python 3 上运行 — 无运行时依赖性。
- **记忆召回是确定性的。** 因为它在钩子上运行，所以记忆是自动注入的。模型不会忘记使用任何 MCP 工具。
- 召回的记忆作为`<hindsight_memories>`块出现在Cline内，范围为当前任务描述和正在进行的提示。
- Hindsight Cloud意味着没有本地守护进程。 记忆存储在服务器端并跨机器跟随您。 [免费注册。](https://ui.hindsight.vectorize.io)
- **平台说明：** Cline 挂钩仅在 **macOS 和 Linux** 上运行，不支持 Windows。

## 问题：Cline在任务之间没有记忆 {#the-problem-cline-has-no-memory-between-tasks}

Cline 在单个任务中速度快且能力强。它可以读取您的整个项目、编辑数十个文件、运行测试并集中解决方案。但当任务结束时，它学到的一切都消失了。下一个任务从模型的训练数据以及 Cline 读取的任何文件开始，而不是您之前教过的任何内容。

对于一次性任务来说没问题。对于每天在同一个代码库上使用的智能体来说，这是一个问题。您每次都重新解释相同的约定，重新警告相同的陷阱，并重新陈述相同的架构决策。智能体永远不会像队友那样了解您的代码库。

Hindsight 通过为 Cline 提供持久的记忆库来缩小这一差距，并且生命周期挂钩集成将其连接起来，而无需任何任务内工具调用。

## Hindsight如何将记忆添加到Cline {#how-hindsight-adds-memory-to-cline}

Cline支持[生命周期挂钩](https://docs.cline.bot/customization/hooks)：在关键时刻运行的小型可执行脚本。 Hindsight 集成安装其中四个，并将每个事件路由到 Hindsight API 调用：

|Cline 挂钩|Hindsight 的作用|
| ------------------ | --------------------------------------------------------------------- |
|`TaskStart`|新任务描述的记忆召回上下文；注射它。|
|`UserPromptSubmit`|记忆召回对您的消息的记忆；稍后记录记忆存储的提示。|
|`TaskComplete`|记忆存储任务的累积记录和最终摘要。|
|`TaskCancel`|记忆存储已取消任务的部分记录。|

因为它是在钩子上运行的，所以记忆是**确定性**。模型不会忘记调用任何MCP工具，并且工具使用往返不会产生额外的延迟。记忆召回和记忆存储逻辑在Cline任务生命周期中明确定义的点运行。

```
Task starts ─ TaskStart ─────────► recall(task description) → inject memories
You send a message ─ UserPromptSubmit ─► recall(prompt) → inject memories
                                          (and append the prompt to the task transcript)
Task completes ─ TaskComplete ──► retain(accumulated transcript + summary)
Task cancelled ─ TaskCancel ────► retain(partial transcript)
```

One Cline 值得了解的特定细节： **Cline 不手钩成绩单。** 每个钩子获取任务 ID 和当前事件负载，而不是正在运行的会话。集成过程中会在`~/.hindsight/cline/state/`中累积每个任务的提示，任务结束挂钩会立即将完整的记录读回到存储记忆中。该模型永远不会看到这种簿记；它只是看到相关的记忆在上下文中出现。

## 安装 {#installing}

安装程序是一个小型 CLI，它将四个钩子文件（加上它们的共享库和`settings.json`）复制到Cline 的 hooks 目录中。使用pip安装：

```bash
pip install hindsight-cline
```

然后，从你的项目目录：

```bash
hindsight-cline install \
  --api-url https://api.hindsight.vectorize.io \
  --api-token YOUR_KEY
```

安装到`.clinerules/hooks/`；承诺与您的团队分享。要全局安装（适用于每个项目），请添加 `--global`：

```bash
hindsight-cline install --global \
  --api-url https://api.hindsight.vectorize.io \
  --api-token YOUR_KEY
```

这会将钩子放入`~/Documents/Cline/Rules/Hooks/`。 （`hindsight-cline uninstall`删除它们。）

**最后一步，启用Cline中的钩子：** 设置 → 功能 → 挂钩（打开）。
仅

Cline 钩子在 **macOS 和 Linux** 上运行。他们使用Python 3（任何现代系统Python都可以工作，运行时不需要`pip install`）。

## Hindsight Cloud（推荐） {#hindsight-cloud-recommended}

最快的路径是Hindsight Cloud：没有守护进程可以保持活动，记忆在机器之间同步，提取工作发生在服务器端。这对于 Cline 来说比服务器端智能体更重要。 Cline 存在于 VS Code 中，大多数开发人员在笔记本电脑、台式机，有时甚至是远程开发盒上使用它；云意味着相同的记忆库出现在任何地方，而无需复制文件。因为提取在服务器端运行，所以您也不必将 LLM API 密钥线程到钩子环境中（记忆存储钩子否则需要一个来调用提取模型），并且在打开 VS Code 之前无需记住启动 `hindsight-api` 进程。安装程序的 `--api-url` 和 `--api-token` 标志可一步完成配置。您的连接设置位于`~/.hindsight/cline.json`，在重新安装后保持稳定：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

创建一个帐户并在[hindsight.vectorize.io](https://ui.hindsight.vectorize.io)获取API密钥。

自托管的工作方式完全相同：在本地启动 API 并将安装程序指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

然后使用`--api-url http://localhost:8888`重新运行安装程序。

## 什么被召回 {#what-gets-recalled}

`TaskStart` 和 `UserPromptSubmit` 都运行 Hindsight 记忆召回，并返回 `<hindsight_memories>` 块作为 Cline 在模型看到提示之前注入的上下文：

```
<hindsight_memories>
Relevant memories from past conversations. Only use memories that are directly useful to continue this task; ignore the rest:
Current time - 2026-06-09 13:42

- Project uses asyncpg, not SQLAlchemy; switched after Redis cache stampede in March [world]
- Tests live under tests/integration/ and run via `make test-int`, not pytest directly [world]
- The `auth_v2` module is being deprecated; new code should target `identity/` [experience]
</hindsight_memories>
```

Cline看到这个块；它不会出现在您的编辑器输出中。结果：Cline 使用范围内已有的相关过去上下文启动每个任务，而无需您提供它。

您可以使用 `recallBudget` (`"low"` / `"mid"` / `"high"`) 和 `recallMaxTokens` 调整要提取的上下文量。

### 之前和之后 {#before-and-after}

如果没有持久记忆，Cline中的新任务就会冷启动。您输入“修复损坏的身份验证测试”，然后Cline读取测试文件，对哪个身份验证模块在范围内做出合理的猜测，并可能尝试您已经拒绝的模式。

对于 Hindsight，相同的任务会在调用上下文中打开：`auth_v2` 已弃用，测试运行程序是 `make test-int`，最近的修复堆栈位于 `identity/`。 Cline 在第一回合而不是第三回合选择正确的模块和正确的测试命令。

## 每个项目记忆 {#per-project-memory}

默认情况下，所有Cline任务共享一个记忆库（`cline`）。要为每个项目提供自己独立的记忆库，请切换到 `~/.hindsight/cline.json` 中的动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

记忆库 ID 源自工作空间路径 (`agent::project`)，因此`~/projects/api` 中的任务写入的记忆库与`~/projects/frontend` 中的任务不同。切换文件夹会自动切换记忆上下文。

有效粒度字段为`agent`、`project`、`session` 和 `user`。如果多人共享一台机器但不应该共享记忆召回，则添加 `user` （源自 `HINDSIGHT_USER_ID` 环境变量）非常有用。

## 团队共享记忆 {#team-shared-memory}

个人持久记忆是有用的。整个团队共享记忆具有变革性。

当团队中的每个人都将他们的Cline配置指向同一个Hindsight记忆库时，一个开发人员积累的上下文将可供所有人使用。周一发现的错误会在周二的记忆召回中浮现出来，无论是谁提出的。一项任务中做出的架构决策将为下一项任务提供信息，而无需任何人更新共享文档。

要配置团队共享记忆，请在每个开发人员的配置中设置固定的`bankId`，并将它们指向相同的Hindsight Cloud端点：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token",
  "bankId": "my-team-project"
}
```

有关完整的团队设置指南，请参阅[AI编码智能体的共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。

## 关键配置选项 {#key-configuration-options}

设置位于`~/.hindsight/cline.json`（个人覆盖）或已安装的`settings.json`（默认值）中。每个设置也可以通过 `HINDSIGHT_*` 环境变量进行设置。

|设置|默认|它的作用|
| --------------- | ------------------------ | ------------------------------------------------------- |
|`bankId`|`cline`|用于此集成的记忆库。|
|`autoRecall`|`true`|在任务/提示之前注入记忆。|
|`autoRetain`|`true`|记忆存储任务结束时的记录。|
|`recallBudget`|`mid`|记忆召回深度：`low`（快速）/`mid`/`high`（彻底）。|
|`recallTypes`|`["world","experience"]`|记忆类别到记忆召回。|
|`retainMission`|通用|引导事实提取；告诉它要关注什么。|
|`dynamicBankId`|`false`|每个项目的记忆库隔离。|
|`debug`|`false`|将活动记录到 stderr。|

专注的`retainMission`使提取的记忆变得更有意义：

```json
{
  "retainMission": "提取技术决策、代码模式、调试解决方案、用户偏好、项目上下文和架构选择。忽略例行的问候和短暂的操作细节。"
}
```

## 陷阱 {#pitfalls}

**钩子不发射。** 安装程序会复制文件，但默认情况下该开关仍处于关闭状态。转到Cline中的设置→功能→挂钩并将其打开。验证钩子运行的快速方法：启用 `debug: true` 并观察 `[Hindsight]` 行的 stderr。

**第一个任务中没有回忆起任何记忆。** 记忆召回仅在保留某些内容后返回结果。先完成一项真实任务；第二个开始看到回忆的上下文。

**Windows 没有发生任何事情。** Cline的钩子流道仅限macOS/Linux；目前没有 Windows 路径。 （如果您使用 Windows 并且想要持久记忆编码智能体，[Hermes + Hindsight](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows-setup) 设置是一个不错的选择。）

**对没有Cline的钩子进行冒烟测试。** 您可以将合成事件直接通过管道传输到钩子脚本中，以确保它端到端地工作：

```bash
echo '{"hookName":"UserPromptSubmit","prompt":"我们如何认证？","taskId":"t1","workspaceRoots":["/tmp/x"]}' \
  | .clinerules/hooks/UserPromptSubmit
# → {"cancel": false, "contextModification": "<hindsight_memories>…", "errorMessage": ""}
```

## 权衡 {#tradeoffs}

**记忆召回增加了延迟。** 每个提示都会在 Cline 看到之前触发 Hindsight 查询。借助Hindsight Cloud和通常低于300毫秒的快速连接，在交互使用中难以察觉。如果需要跳过，请将`recallBudget`删除至`"low"`，或设置`autoRecall: false`。

**记忆存储在任务结束时运行，而不是在任务中运行。** 你所从事的任务的记忆在任务完成后变得可用。如果您取消了原本想要记忆召回的任务，`TaskCancel` 挂钩仍会保留部分记录，但您必须实际取消才能触发它。

**提取质量取决于对话质量。** Hindsight 从文字记录中提取事实。如果任务全部是文件编辑而没有旁白，那么提取器就没有什么可处理的。用几句话解释你的决定以及为什么会大有帮助。

## 回顾 {#recap}

||Cline 默认|与 Hindsight|
| ------------------------- | --------------------------- | ----------------------------------------- |
|跨任务记忆|无|自动|
|记忆设置|手册 `.clinerules` / 文档|摘自任务记录|
|记忆召回机制|文件Cline 读取每个任务|语义搜索，根据任务/提示注入|
|每个项目隔离|否|可选通过`dynamicBankId`|
|团队共享记忆|否|通过Hindsight Cloud端共享记忆库|
|需要模型工具调用|不适用|否（生命周期挂钩）|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Cline + Hindsight](/sdks/integrations/cline)
- **来源：**[vectorize-io/hindsight/hindsight-integrations/cline](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cline)
- **团队记忆：**[AI编码智能体的共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)
- **Windows替代方案：**[Hermes智能体与Hindsight](https://hindsight.vectorize.io/blog/2026/06/01/hermes-hindsight-windows-setup)
