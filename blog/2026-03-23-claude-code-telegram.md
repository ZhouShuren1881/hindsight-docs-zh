---
title: "OpenClaude：构建具有长期记忆的 Claude Code 智能体，并随时随地使用它"
authors: [fabioscarsi, nicoloboschi]
date: 2026-03-23T12:00
tags: [claude-code, telegram, hindsight, memory, mcp, agents, tutorial]
image: /img/blog/claude-code-telegram.webp
hide\_table\_of\_contents: true
---

![OpenClaude：构建具有长期记忆的 Claude Code 智能体，并随时随地使用它](/img/blog/claude-code-telegram.webp)

Anthropic 刚刚为 Claude Code 推出了 **Channels**：让 Claude Code 会话连接到消息平台的功能。这意味着 Claude Code 现在可以作为完全自主的智能体运行，你可以通过手机联系它；它会始终在你的代码库（以及其他内容）上工作。

Claude Code 内置了一套基于 Markdown 文件（`CLAUDE.md`、自动记忆）的记忆系统，用来保存固定偏好和项目指令，效果很好。但它并非为对话记忆而设计：它不会从讨论中提取事实，不会按语义相似度召回相关上下文，也不会随时间积累结构化知识。会话一结束，你们讨论内容中的丰富细节就会随之消失。

本指南将解决这个问题。我们会在 Telegram 上配置 Claude Code，并将它接入 [Hindsight][1]，为它提供真正的长期记忆，包括自动提取事实、语义召回，以及随每次对话不断增长的知识库。最终，你将得到一位持久运行的 AI（编程）助手，可以随时随地与它交流；它也确实会从互动中学习。

如果你一直在关注 [Openclaw][2] 如何结合 Hindsight 实现这些能力，那么这里的思路是一样的，只是完全基于 Claude Code 构建。

<!-- truncate -->


## 我们要构建什么 {#what-were-building}

完成本教程后，你将拥有：

1. **一个连接到 Claude Code 的 Telegram 机器人**：你可以用手机给它发消息，并获得基于完整代码库和文件系统内容的回复。
2. **由 Hindsight 提供支持的自动记忆**：每次对话都会被存入记忆，相关上下文会在每次提示时召回并注入。
3. **一位会随时间变得更聪明的持久智能体**：它会记住你的项目、偏好和架构决策。

这套技术栈很简单：Claude Code 负责思考，Telegram 提供交互界面，Hindsight 提供记忆。无需编写自定义代码，也不需要在你的机器上运行的服务之外再配置强制性基础设施。


## 第 1 部分：在 Telegram 上使用 Claude Code {#part-1-claude-code-on-telegram}

### 前置条件 {#prerequisites}

- 已安装 **Claude Code**（macOS 上运行 `brew install claude-code`，或者运行 `curl -fsSL https://claude.ai/install.sh | bash`）
- 已安装 **Bun**（macOS 上运行 `brew install oven-sh/bun/bun`，或者运行 `curl -fsSL https://bun.sh/install | bash`）——Telegram 插件必须使用 Bun；不支持 Node.js 和 Deno。
- 一个 **Telegram 账号**

### 第 1 步：创建 Telegram 机器人 {#step-1-create-a-telegram-bot}

打开 Telegram，与 [@BotFather][3] 开始聊天。

发送 `/newbot`，然后按照提示选择机器人名称和用户名（用户名必须以 `bot` 结尾）。BotFather 会给你一个类似下面这样的令牌：

```
[REDACTED_TELEGRAM_BOT_TOKEN]
```

在第 3 步中会用到这个令牌。

### 第 2 步：安装 Telegram 插件 {#step-2-install-the-telegram-plugin}

在 Claude Code 会话中运行：

```
/plugin install telegram@claude-plugins-official
/reload-plugins
```

这会安装 Telegram MCP 插件并重新加载插件注册表。

### 第 3 步：设置机器人令牌 {#step-3-set-your-bot-token}

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN" > ~/.claude/channels/telegram/.env
```

将 `YOUR_BOT_TOKEN` 替换为 BotFather 提供的令牌。这个文件包含敏感凭据，请运行 `chmod 600 ~/.claude/channels/telegram/.env` 限制文件权限。你也可以改为将 `TELEGRAM_BOT_TOKEN` 导出为 shell 环境变量（环境变量的优先级高于文件）。

:::note
`/telegram:configure` 技能仅在使用 `--channels` 标志运行的会话中可用（见第 4 步）。不要在普通的 Claude Code 会话中尝试运行它。
:::

### 第 4 步：使用 Channels 启动 Claude Code {#step-4-launch-claude-code-with-channels}

退出当前会话，并使用 Telegram channel 重新启动：

```bash
claude --channels plugin:telegram@claude-plugins-official
```

现在，Claude Code 已在运行，Telegram 插件也已启用。

### 第 5 步：配对你的 Telegram 账号 {#step-5-pair-your-telegram-account}

1. 打开 Telegram，给你的机器人发送任意消息（例如 "hello"）。
2. 机器人会回复一个 6 个字符的配对码。
3. 返回 Claude Code 并运行：

```
/telegram:access pair <code>
```

你的设备现在已完成配对。

### 第 6 步：限制访问权限 {#step-6-lock-down-access}

切换到允许列表模式，这样只有你能使用机器人：

```
/telegram:access policy allowlist
```

给 [@userinfobot][4] 发消息，查找你的 Telegram 用户 ID，然后运行：

```
/telegram:access allow <your_user_id>
```

不在允许列表中的人发来的消息都会被静默忽略。

### 权限说明 {#a-note-on-permissions}

Claude Code 有一套权限系统，在运行某些工具（例如 shell 命令、写入文件）之前会请求批准。这些请求会显示在终端中，**不会显示在 Telegram 中**。如果你只通过手机与它交互，Claude 可能会因为等待你看不到的批准而停下来。

有两种处理方式：

1. **使用完整权限运行**：通过 `claude --dangerously-skip-permissions --channels ...` 启动，这会赋予智能体完全自主权。如果机器人只有你能访问，这种方式是合适的（这也是第 6 步很重要的原因）。
2. **让终端保持可见**：在你的电脑上保持 Claude Code 终端打开，以便收到权限请求时可以批准。

对于真正自主运行的 Telegram 智能体，方案 1 更实用。只要先确保允许列表已严格限制好即可。

如果选择方案 1，请**在 `CLAUDE.md` 中添加规则来降低风险**。由于内置权限关卡已被绕过，你需要自行定义安全边界。一个实用做法是划分以下几个等级：

- **第 1 级（可直接执行）**：只读操作，例如读取文件、搜索代码、浏览网页，以及 `git status`、`git log`、`git diff`。无需确认。
- **第 2 级（先询问）**：任何会创建、修改或删除状态的操作，例如写入文件、创建 Git 提交、发送消息和安装软件包。智能体应先在 Telegram 上说明要执行的操作，并等待你明确批准后再继续。
- **第 3 级（禁止）**：不可逆或高风险操作，例如强制推送、递归删除、泄露敏感凭据，以及修改 `CLAUDE.md` 本身。即使收到请求，也绝不能由机器人自行执行。

这样，智能体就能自主完成安全任务；遇到会产生副作用的操作时会先询问你，并且在破坏性操作方面受到严格限制。这些规则保存在 `CLAUDE.md` 中，因此会在不同会话间持续生效，并自动加载。

### 当前已经具备的能力 {#what-you-have-so-far}

现在，你已经有了一个可通过 Telegram 使用的 Claude Code 智能体。你可以用手机给它发消息；它能够访问你的完整代码库和文件系统，并据此回复、读取文件、运行命令和修改内容。

不过，它的记忆能力有限。Claude Code 内置的 Markdown 记忆可以记录偏好和指令，却不会保留对话的实质内容，例如你讨论过的决策、权衡过的取舍，以及事情为何如此安排的背景。会话重启后，这些对话深度就会丢失。对于快速任务，这或许足够；但对于长期运行的助手，这会成为瓶颈。

接下来解决这个问题。


## 第 2 部分：使用 Hindsight 添加长期记忆 {#part-2-adding-long-term-memory-with-hindsight}

[Hindsight][5] 是一种仿生记忆引擎：它不只是存储对话，还会*理解*对话内容。存入一段对话时，Hindsight 会提取离散的结构化事实，例如决策、偏好、人际关系和技术背景。召回时，它会根据事实与当前查询的语义相关性检索内容，而不是依赖时间戳或关键词。因此，它的记忆更像人类回忆，而不是搜索索引：呈现重要内容，过滤无关信息。

[Openclaw 集成][6] 几个月来一直在为 Openclaw 智能体提供这种能力。现在，[Claude Code 集成][7] 也把同样的能力带到了 Claude Code。

该插件会在 Claude Code 生命周期的不同阶段运行：

- **每次提示之前**：查询 Hindsight，获取相关记忆并将其作为上下文注入。Claude 能看到这些记忆，但聊天记录中不会出现它们。
- **回复后定期运行**：提取对话文本分块并存入 Hindsight，进行长期保存（每 N 轮处理一次，并通过重叠轮次保持上下文连续）。
- **会话开始时**：检查 Hindsight 服务器的健康状态。
- **会话结束时**：如果插件启动了守护进程，就清理该进程。

整个过程完全自动化。安装后，每次对话都会积累智能体的记忆，而后续每个提示都能利用它已经学到的内容。

### 第 7 步：安装 Hindsight 插件 {#step-7-install-the-hindsight-plugin}

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

### 第 8 步：配置 LLM 服务提供方 {#step-8-configure-your-llm-provider}

Hindsight 需要 LLM 从对话中提取事实。选择以下一种方案：

```bash
# 方案 A：OpenAI（自动检测）
export OPENAI_API_KEY="sk-your-key"

# 方案 B：Anthropic（自动检测）
export ANTHROPIC_API_KEY="your-key"

# 方案 C：无需 API 密钥，使用 Claude Code 自带的模型（仅供个人/本地使用）
export HINDSIGHT_LLM_PROVIDER=claude-code

# 方案 D：连接到外部 Hindsight 服务器，不在本地运行
mkdir -p ~/.hindsight
echo '{"hindsightApiUrl": "https://your-hindsight-server.com"}' > ~/.hindsight/claude-code.json
```

方案 A、B 和 C 都会在首次使用时自动启动本地 Hindsight 守护进程，无需单独设置。方案 D 则完全跳过本地守护进程，让插件连接到现有服务器。

### 第 9 步：自定义智能体的记忆设置 {#step-9-customize-your-agents-memory}

这些设置会影响智能体如何形成记忆。默认值通常够用，但你可能会想调整以下选项：

```json
{
  "bankId": "my-telegram-agent",
  "bankMission": "You are a senior software engineer assistant. Focus on architectural decisions, code patterns, project context, and the user's preferences.",
  "retainMission": "Extract technical decisions, architectural choices, user preferences, project context, and relationships between people and tools. Ignore routine greetings and transient operational details."
}
```

| 设置 | 默认值 | 作用 |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `bankId` | `"claude_code"` | 为记忆库命名。更改此值可为每个智能体隔离记忆。 |
| `bankMission` | 通用助手 | 告诉 Hindsight 这个智能体的身份，有助于它提取更相关的事实。 |
| `retainMission` | 技术内容提取 | 指引 Hindsight 从对话中记住哪些内容。 |
| `retainEveryNTurns` | `10` | 在滑动窗口中每 10 轮存入一次，避免频繁调用 API，同时保持完整覆盖。 |
| `retainOverlapTurns` | `2` | 在相邻的存入窗口之间额外重叠 2 轮，以保持上下文连续。 |
| `recallBudget` | `"mid"` | 控制 Hindsight 搜索相关记忆的力度。`"low"` 更快，`"high"` 更全面。 |
| `recallMaxTokens` | `1024` | 每次提示最多注入多少 token 的记忆上下文。 |

完整配置说明见[插件 README][9]。

### 第 10 步：重新启动并验证 {#step-10-relaunch-and-verify}

同时启用两个插件，重新启动 Claude Code：

```bash
claude --channels plugin:telegram@claude-plugins-official
```

给机器人发几条消息，然后检查日志。在 `~/.hindsight/claude-code.json` 中设置 `"debug": true` 后，你会看到类似内容：

```
[Hindsight] Recalling from bank 'my-telegram-agent', query length: 142
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'my-telegram-agent', doc '...', 8 messages, 2341 chars
```

记忆流程已经开始运行：每次提示都会注入相关上下文，每次对话都会被存入记忆。

验证完成后，移除调试设置，或在 `~/.hindsight/claude-code.json` 中将它设为 `"debug": false`，关闭调试模式。


## 实际使用效果 {#what-this-looks-like-in-practice}

要理解使用效果的变化，需要先了解 Hindsight 在幕后做什么。它不只是记录对话，还会*提取结构化事实*。例如，你告诉智能体 "we decided to use Postgres because the team already knows it and we need JSONB support"，Hindsight 不会存储原始对话记录，而是提取出若干离散事实：技术选择、选择理由和团队约束。这些事实会被分类（世界事实、经历事实、观测）、标记时间戳，并以便于按语义相关性检索的方式存储，而不只是依赖关键词匹配。

正因如此，召回才有用。一周后，当你让智能体设计一项新服务时，Hindsight 不会把整个对话历史都塞进提示，而是呈现与你当前问题真正相关的 3 到 4 条事实，例如你选择的数据库、约定的命名方式和已经确立的架构模式。智能体拿到的正是所需上下文，不多不少。

整个过程大致如下：

**第 1 天**：你向机器人介绍一个新项目。此时它还没有记忆，只能依据你告诉它的内容，以及它从代码库中读到的信息开展工作。

**第 3 天**：你问 "what was the database schema we discussed?" Hindsight 会将这个查询与第 1 天提取的事实进行匹配，并将相关事实作为上下文注入。机器人能准确接续上次的工作，不是因为它重放了旧对话，而是因为它召回了与当前问题相关的具体决策。

**第 2 周**：你让它重构一个模块。Hindsight 会召回你的架构偏好、确立的命名约定和你否决过的模式。智能体不必再让你重复说明，因为它已经拥有从之前对话中提取、并按相关性排序的这些事实。

**第 2 个月**：机器人已经存入数百次对话，Hindsight 也提取了数千条离散事实。智能体对你的代码库了如指掌：不只是代码（它随时都能读取代码），还包括*代码背后的决策*。例如，为什么选择 Postgres 而不是 SQLite，为什么重写身份认证中间件，以及是谁提出了 API 变更。代码本身没有记录的背景，如今已被提炼为结构化记忆。

这就是无状态工具与具备上下文的协作者之间的区别。Claude Code 提供推理能力，以及对代码库和文件系统的访问；Hindsight 则提供连续性，让智能体能够在一次次会话中积累理解，并在每个新问题上准确运用其中相关的部分。两者结合，智能体的响应质量会随着使用时间不断提高。


## 为什么选择 Claude Code {#why-claude-code}

如果你了解 [Openclaw][10]，这一套会让你感到熟悉。Openclaw 已经与 Hindsight 集成数月，这正是 Openclaw 智能体获得记忆的方式。这套方案用不同的技术栈实现了同样的效果。问题在于：哪种方式更适合你的工作流程？

不过，先来谈谈显而易见的一点：Channels 让 Claude Code 会话连接到消息平台，并支持持久运行、插件钩子和自主操作；这项能力最早由 Openclaw 开创。两者的架构方法截然不同（钩子和插件对比网关运行时、Python 脚本对比 npm 包、基于文件的状态对比内存状态），但用户体验却明显趋同：你可以在聊天中与 AI 智能体交流，通过手机联系它，并让它访问你的代码库。这并非巧合。Channels 的发布表明，Anthropic 将智能体原生消息传递视为一项一等能力；而 Openclaw 的创建者加入 OpenAI 后，Anthropic 推出这项功能的时机也让其战略意图显而易见。对用户来说，这无疑是好消息：这一模式如今得到社区和大型 AI 实验室的共同验证，生态系统之间的竞争也将推动两个平台向前发展。

具体选择取决于你的需求和正在使用的工具。

Openclaw 和 Claude Code 都能读取文件、运行命令并与消息平台交互。它们的功能有很大重叠，差异主要在架构和取舍上。

**Claude Code** 是 Anthropic 的官方 CLI，由构建 Claude 的同一团队维护。它提供定义清晰的钩子生命周期、沙盒执行、细粒度权限模型，以及专为自主运行设计的插件架构。Channels 系统、MCP 集成和权限模型都是产品自带的一方功能，会随产品一同演进。

**Openclaw** 是由社区推动的智能体框架，支持更广泛的模型生态：开箱即用地支持多个 LLM 服务提供方和多个消息渠道，并拥有成熟的社区插件生态。Hindsight 集成最初就在这里开发；如果你需要跨模型或跨平台配置，它仍然是更灵活的选择。

对于已经使用 Claude、希望采用精简的单一供应商技术栈并获得较强默认安全设置的开发者，Claude Code 是自然的选择。对于需要模型灵活性或已经在运行 Openclaw 智能体的人，Openclaw 集成同样胜任：Hindsight 和记忆质量相同，运行时不同。

| | Openclaw + Hindsight | Claude Code + Telegram + Hindsight |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| **运行时** | Openclaw 网关 | 启用 Channels 的 Claude Code |
| **维护方** | 社区（开源） | Anthropic（一方维护） |
| **模型** | 可配置（OpenAI、Claude 等） | Claude（通过 Anthropic API） |
| **交互界面** | 多渠道（Telegram、Discord、Slack、Web 等） | 任意 Channel 插件（目前支持 Telegram、Discord，更多即将推出） |
| **记忆集成** | hindsight-openclaw（TypeScript） | hindsight-claude-code（Python） |
| **代码库访问** | 原生支持（读取、写入、编辑、执行） | 原生支持（Read、Edit、Write、Bash、Git、PR 工作流） |
| **插件系统** | Openclaw 插件格式 | Claude Code 钩子（结构化生命周期） |
| **配置方式** | 配置 Openclaw 并安装插件 | 安装 Claude Code、Channel 和插件 |

Claude Code 的 Hindsight 插件是 [Openclaw 插件的完整移植][11]，架构、配置选项以及召回/存入逻辑都相同。如果你已经在 Openclaw 中使用 Hindsight，这些概念完全一致。不同之处在于你所构建的底层平台。


## 动态记忆库 {#dynamic-memory-banks}

对于高级配置，该插件支持动态记忆库 ID，可按项目、渠道或用户隔离记忆：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

采用此配置后，每个项目目录都会拥有自己的记忆库，前端项目的记忆会与后端项目的记忆分开。设置 `HINDSIGHT_CHANNEL_ID` 和 `HINDSIGHT_USER_ID` 环境变量后，还可以为多用户或多渠道智能体增加 `"channel"` 和 `"user"` 维度。


## 故障排查 {#troubleshooting}

**机器人没有响应**：确认 Claude Code 是通过 `--channels plugin:telegram@claude-plugins-official` 运行的。该插件只在活动会话中工作。

**没有出现配对码**：检查 `~/.claude/channels/telegram/.env` 中的机器人令牌是否设置正确。

**出现 "Bun not found" 错误**：运行 `curl -fsSL https://bun.sh/install | bash` 安装 Bun，然后重新启动终端。

**没有召回记忆**：至少要完成一个存入周期后，记忆才可供召回。发送几条消息，等待异步存入处理完毕，然后在下一次提示时检查。启用 `"debug": true` 可查看召回/存入流程。

**Hindsight 守护进程无法启动**：检查是否已设置 LLM API 密钥（或 `HINDSIGHT_LLM_PROVIDER=claude-code`）。查看 `~/.hindsight/profiles/claude-code.log` 中的日志。

**召回延迟较高**：召回钩子的超时时间为 12 秒（API 调用本身在 10 秒时超时，留出额外时间进行处理）。尝试将 `"recallBudget": "low"` 设为较快模式，或调低 `"recallMaxTokens"`。


## 接下来 {#whats-next}

这套方案由 Claude Code、Telegram 和 Hindsight 组成，可为你提供具备长期记忆的持久 AI 编程助手，让你随时随地（包括通过手机）访问它。直到现在，这类能力还只有专用智能体框架才能实现。

Claude Code 的 Hindsight 插件是[开源的][12]，适用于任意 Claude Code Channel，而不只是 Telegram。目前已支持 Discord；随着更多 Channel 插件推出，记忆层本身无需改变。

配置好之后，连续使用一周，看看效果如何。

[1]: https://vectorize.io/hindsight
[2]: https://openclaw.ai
[3]: https://t.me/botfather
[4]: https://t.me/userinfobot
[5]: https://vectorize.io/hindsight
[6]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openclaw
[7]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[9]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[10]: https://openclaw.ai
[11]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[12]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
