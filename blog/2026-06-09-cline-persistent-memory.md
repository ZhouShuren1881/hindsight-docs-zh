---
title: "Cline 持久记忆：用生命周期钩子代替 MCP"
authors: [benfrank241]
slug: "2026/06/09/cline-persistent-memory"
date: 2026-06-09T12:00
tags: [cline, memory, persistent-memory, hindsight, coding-agents, tutorial]
description: "通过生命周期钩子，使用 Hindsight 为 Cline 添加持久记忆。无需 MCP 服务器，也无需模型调用工具。钩子会在每项任务开始前确定性地召回上下文，并在任务结束后存入相关内容。"
image: /img/blog/cline-persistent-memory.webp
hide_table_of_contents: true
---

![使用 Hindsight 为 Cline 添加持久记忆](/img/blog/cline-persistent-memory.webp)

[Cline](https://github.com/cline/cline) 是 VS Code 中使用最广泛的 AI 编程智能体之一。它可以读取文件、运行命令、编写代码，并不断迭代，直到任务完成。但任务一结束，它就什么也记不住了。下一个任务开始时，它对你做过的决定、你确立的惯例，以及你费力发现的代码库脆弱之处都毫无印象。

本文将介绍新版 Hindsight + Cline 集成。它利用 **Cline 生命周期钩子**，在每项任务开始前自动召回记忆，并在任务结束时自动存入记忆；整个流程不需要 MCP 服务器，模型也不必自行决定调用记忆工具。记忆会自动处理。

## 内容提要 {#tldr}

<!-- truncate -->

- Cline 没有内置持久记忆，每项任务都会从头开始。
- Hindsight 集成会安装四个生命周期钩子脚本（`TaskStart`、`UserPromptSubmit`、`TaskComplete`、`TaskCancel`）和一个小型 Python 库。运行 `pip install hindsight-cline` 和一条 `install` 命令即可；钩子本身使用 Python 3 标准库运行，无需运行时依赖。
- **记忆召回是确定性的。** 记忆由钩子自动注入，模型不会忘记使用某个 MCP 工具。
- 召回的记忆会以 `<hindsight_memories>` 块的形式显示在 Cline 中，范围由当前任务描述和正在输入的提示决定。
- 使用 Hindsight Cloud 就不需要本地守护进程。记忆存储在服务器端，并可在多台设备间同步。[免费注册。](https://ui.hindsight.vectorize.io)
- **平台说明：** Cline 钩子仅支持 **macOS 和 Linux**，不支持 Windows。

## 问题：Cline 的记忆不会跨任务保留 {#the-problem-cline-has-no-memory-between-tasks}

Cline 在单项任务中既快速又能干。它可以读取整个项目、编辑数十个文件、运行测试，并逐步收敛到解决方案。但任务结束时，它学到的一切都会消失。下一个任务只能依赖模型的训练数据和 Cline 读取的文件，不会带上你之前教过它的内容。

对于一次性任务，这没什么问题。但如果你每天都在同一个代码库中使用智能体，就会遇到麻烦：每次都要重新解释相同的惯例、再次提醒它留意同样的陷阱、重新陈述相同的架构决策。智能体始终无法像队友那样熟悉你的代码库。

Hindsight 为 Cline 提供持久记忆库，弥补了这一缺口；生命周期钩子集成则让它无需在任务中调用工具，也能连接记忆库。

## Hindsight 如何为 Cline 添加记忆 {#how-hindsight-adds-memory-to-cline}

Cline 支持[生命周期钩子](https://docs.cline.bot/customization/hooks)：它会在关键时刻运行这些小型可执行脚本。Hindsight 集成会安装其中四个钩子，并将每个事件转发给相应的 Hindsight API 调用：

| Cline 钩子 | Hindsight 执行的操作 |
| --- | --- |
| `TaskStart` | 为新任务描述召回上下文并注入记忆。 |
| `UserPromptSubmit` | 为你的消息召回记忆，并记录提示，以便之后存入记忆。 |
| `TaskComplete` | 存入任务累积的对话记录和最终摘要。 |
| `TaskCancel` | 存入已取消任务的部分对话记录。 |

由于记忆处理由钩子触发，因此具有**确定性**。模型不会忘记调用 MCP 工具，也不会因工具调用往返而增加延迟。记忆召回和存入操作会在 Cline 任务生命周期中预先确定的时点运行。

```
Task starts ─ TaskStart ─────────► recall(task description) → inject memories
You send a message ─ UserPromptSubmit ─► recall(prompt) → inject memories
                                          (and append the prompt to the task transcript)
Task completes ─ TaskComplete ──► retain(accumulated transcript + summary)
Task cancelled ─ TaskCancel ────► retain(partial transcript)
```

有一点 Cline 特有的细节值得注意：**Cline 不会向钩子提供对话记录。** 每个钩子拿到的是任务 ID 和当前事件的载荷，而不是正在进行的对话内容。集成会在运行过程中把每项任务的提示累积到 `~/.hindsight/cline/state/`，任务结束钩子再读取这些内容，一次性存入完整对话记录。模型看不到这些记录管理过程，只会在相关时看到记忆出现在上下文中。

## 安装 {#installing}

安装器是一个小型 CLI，会将四个钩子文件（以及它们共用的库和 `settings.json`）复制到 Cline 的钩子目录。使用 pip 安装：

```bash
pip install hindsight-cline
```

然后在项目目录中运行：

```bash
hindsight-cline install \
  --api-url https://api.hindsight.vectorize.io \
  --api-token YOUR_KEY
```

安装器会将文件放入 `.clinerules/hooks/`；提交这些文件即可与团队共享。若要全局安装（应用于每个项目），请添加 `--global`：

```bash
hindsight-cline install --global \
  --api-url https://api.hindsight.vectorize.io \
  --api-token YOUR_KEY
```

这样会将钩子放到 `~/Documents/Cline/Rules/Hooks/`。运行 `hindsight-cline uninstall` 可将其移除。

**最后一步，在 Cline 中启用钩子：** 设置 → 功能 → 钩子（打开开关）。

Cline 钩子仅支持 **macOS 和 Linux**。它们使用 Python 3（任何较新的系统 Python 都可以），运行时不需要 `pip install`。

## Hindsight Cloud（推荐） {#hindsight-cloud-recommended}

最快捷的方式是使用 Hindsight Cloud：无需持续运行守护进程，记忆可在设备间同步，信息提取也在服务器端完成。相比服务器端智能体，这对 Cline 更有帮助。Cline 运行在 VS Code 中，而大多数开发者会在笔记本电脑、台式机，有时还会在远程开发机上使用 VS Code。使用 Cloud，同一个记忆库就能在各处使用，无需来回复制文件。由于信息提取在服务器端运行，你也不必把 LLM API 密钥传入钩子环境（否则，存入记忆的钩子需要密钥才能调用信息提取模型），也无需在打开 VS Code 前记得启动 `hindsight-api` 进程。安装器的 `--api-url` 和 `--api-token` 参数可一步完成配置。连接设置保存在 `~/.hindsight/cline.json` 中，重新安装后仍会保留：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

创建账户并在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 获取 API 密钥。

自托管的使用方式也一样：在本地启动 API，并将安装器指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

然后使用 `--api-url http://localhost:8888` 重新运行安装器。

## 会召回哪些内容 {#what-gets-recalled}

`TaskStart` 和 `UserPromptSubmit` 都会调用 Hindsight 进行记忆召回，并返回一个 `<hindsight_memories>` 块，作为 Cline 在模型看到提示前注入的上下文：

```
<hindsight_memories>
Relevant memories from past conversations. Only use memories that are directly useful to continue this task; ignore the rest:
Current time - 2026-06-09 13:42

- Project uses asyncpg, not SQLAlchemy; switched after Redis cache stampede in March [world]
- Tests live under tests/integration/ and run via `make test-int`, not pytest directly [world]
- The `auth_v2` module is being deprecated; new code should target `identity/` [experience]
</hindsight_memories>
```

Cline 会看到这个记忆块，但它不会显示在编辑器输出中。因此，每项任务开始时都会带上相关的历史上下文，无需你手动提供。

你可以通过 `recallBudget`（`"low"` / `"mid"` / `"high"`）和 `recallMaxTokens` 调整召回的上下文量。

### 使用前后对比 {#before-and-after}

没有持久记忆时，Cline 的新任务会从零开始。你输入“修复有问题的身份验证测试”，Cline 便会读取测试文件，猜测应该处理哪个身份验证模块，还可能尝试你早已否决的方案。

使用 Hindsight 后，同一任务开始时就会带上召回的上下文：`auth_v2` 已弃用，测试运行命令是 `make test-int`，最近的修复方案已经落在 `identity/` 中。Cline 第一轮就能选对模块和测试命令，不必等到第三轮。

## 按项目隔离记忆 {#per-project-memory}

默认情况下，所有 Cline 任务共用一个记忆库（`cline`）。如果要为每个项目使用独立记忆库，可在 `~/.hindsight/cline.json` 中启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

记忆库 ID 根据工作区路径生成（`agent::project`），因此，在 `~/projects/api` 中进行的任务会写入一个记忆库，在 `~/projects/frontend` 中进行的任务则会写入另一个。切换文件夹时，记忆上下文也会自动切换。

有效的粒度字段有 `agent`、`project`、`session` 和 `user`。如果多人共用一台机器，但不应共享召回到的记忆，可以添加 `user`（取自 `HINDSIGHT_USER_ID` 环境变量）。

## 团队共享记忆 {#team-shared-memory}

个人持久记忆很有用；团队共享记忆则能带来巨大改变。

当团队中的每个人都将自己的 Cline 配置指向同一个 Hindsight 记忆库时，一位开发者积累的上下文就能供所有人使用。周一发现的错误可能会在周二召回时出现，无论提问者是谁。一项任务中做出的架构决策也会为后续任务提供参考，无需任何人更新共享文档。

若要设置团队共享记忆，请在每位开发者的配置中设置固定的 `bankId`，并让所有配置指向同一个 Hindsight Cloud 端点：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token",
  "bankId": "my-team-project"
}
```

完整的团队设置指南请参阅[为 AI 编程智能体配置共享记忆【无效博客链接】](https://hindsight.vectorize.io/blog/2026/03/31/team-shared-memory-ai-coding-agents)。

## 重要配置选项 {#key-configuration-options}

设置保存在 `~/.hindsight/cline.json`（个人覆盖项）或已安装的 `settings.json`（默认值）中。每项设置也可以通过 `HINDSIGHT_*` 环境变量设置。

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| `bankId` | `cline` | 此集成使用的记忆库。 |
| `autoRecall` | `true` | 在任务或提示提交前注入记忆。 |
| `autoRetain` | `true` | 任务结束时存入任务对话记录。 |
| `recallBudget` | `mid` | 召回深度：`low`（快速）/ `mid` / `high`（全面）。 |
| `recallTypes` | `["world","experience"]` | 要召回的记忆类别。 |
| `retainMission` | 通用 | 指导事实提取；可在此说明关注重点。 |
| `dynamicBankId` | `false` | 按项目隔离记忆库。 |
| `debug` | `false` | 将运行记录写入 stderr。 |

明确的 `retainMission` 能显著改善提取出的记忆：

```json
{
  "retainMission": "Extract technical decisions, code patterns, debugging solutions, user preferences, project context, and architectural choices. Ignore routine greetings and transient operational details."
}
```

## 常见问题 {#pitfalls}

**钩子没有运行。** 安装器会复制文件，但钩子开关默认仍为关闭。前往 Cline 的“设置 → 功能 → 钩子”并打开开关。要快速确认钩子是否运行，可启用 `debug: true`，并在 stderr 中查看 `[Hindsight]` 行。

**第一个任务没有召回记忆。** 只有在记忆存入后，召回才会返回结果。先完成一项实际任务；从第二项任务开始，就能看到召回的上下文。

**在 Windows 上没有任何反应。** Cline 的钩子运行器仅支持 macOS 和 Linux，目前没有 Windows 版本。如果你使用 Windows，并希望为编程智能体添加持久记忆，[Hermes + Hindsight](/blog/2026/06/01/hermes-hindsight-windows-setup) 是一个不错的选择。

**不启动 Cline，直接对钩子进行冒烟测试。** 可以将合成事件直接通过管道传给钩子脚本，确认整个流程能够运行：

```bash
echo '{"hookName":"UserPromptSubmit","prompt":"how do we authenticate?","taskId":"t1","workspaceRoots":["/tmp/x"]}' \
  | .clinerules/hooks/UserPromptSubmit
# → {"cancel": false, "contextModification": "<hindsight_memories>…", "errorMessage": ""}
```

## 权衡 {#tradeoffs}

**记忆召回会增加延迟。** 每次提交提示后，Cline 都要等 Hindsight 查询完成才能看到提示。使用 Hindsight Cloud 且网络连接较快时，延迟通常低于 300 毫秒，在交互过程中难以察觉。如果需要跳过召回，可将 `recallBudget` 设为 `"low"`，或设置 `autoRecall: false`。

**记忆要到任务结束时才会存入。** 当前任务中的记忆要等任务完成后才能使用。如果你取消了一项原本希望之后能召回内容的任务，`TaskCancel` 钩子仍会存入部分对话记录；但只有实际取消任务才会触发该钩子。

**提取质量取决于对话质量。** Hindsight 会从对话记录中提取事实。如果任务只有文件编辑，没有任何叙述，提取器就没有多少内容可处理。用几句话说明你的决定及理由，会很有帮助。

## 回顾 {#recap}

|  | Cline 默认情况 | 使用 Hindsight 后 |
| --- | --- | --- |
| 跨任务记忆 | 无 | 自动 |
| 记忆设置 | 手动维护 `.clinerules` / 文档 | 从任务对话记录中提取 |
| 记忆召回机制 | Cline 在每项任务中读取的文件 | 语义搜索，并按任务或提示注入 |
| 按项目隔离 | 不支持 | 可通过 `dynamicBankId` 启用 |
| 团队共享记忆 | 不支持 | 通过 Hindsight Cloud 共用记忆库 |
| 是否需要模型调用工具 | 不适用 | 不需要（使用生命周期钩子） |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：** [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：** [Cline + Hindsight](/sdks/integrations/cline)
- **源码：** [vectorize-io/hindsight/hindsight-integrations/cline](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cline)
- **团队记忆：** [为 AI 编程智能体配置共享记忆【无效博客链接】](https://hindsight.vectorize.io/blog/2026/03/31/team-shared-memory-ai-coding-agents)
- **Windows 替代方案：** [使用 Hindsight 的 Hermes 智能体](/blog/2026/06/01/hermes-hindsight-windows-setup)
