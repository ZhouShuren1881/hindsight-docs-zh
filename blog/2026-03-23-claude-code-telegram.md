---
title: "OpenClaude：构建具有长期记忆能力的 Claude Code智能体 — 并随身携带"
authors: [fabioscarsi, nicoloboschi]
date: 2026-03-23T12:00
tags: [claude-code, telegram, hindsight, memory, mcp, agents, tutorial]
image: /img/blog/claude-code-telegram.webp
hide\_table\_of\_contents: true
---

![OpenClaude：构建具有长期记忆能力的 Claude Code智能体 — 并随身携带](/img/blog/claude-code-telegram.webp)

Anthropic刚刚为Claude启动了**频道**代码：Claude连接到消息平台的代码会话。这意味着 Claude Code现在可以作为完全自主的智能体运行，也可以通过您的手机访问，始终针对您的代码库（而不仅仅是它）运行。

Claude Code有一个基于 Markdown 文件的内置记忆系统（`CLAUDE.md`，自动记忆），它非常适合静态首选项和项目说明。但它并不是为会话记忆而设计的——它不会从讨论中提取事实，不会通过语义相似性记忆召回相关上下文，也不会随着时间的推移建立结构化知识。结束会议后，你们讨论的一些丰富性和深度就消失了。

本指南解决了这个问题。我们将在 Telegram 上设置 Claude Code，并将其连接到 [Hindsight][1]，以实现真正的长期记忆 — 自动事实提取、语义记忆召回以及随着每次对话而增长的知识库。结果是你可以在任何地方与持久的AI（编码）助手交谈，它实际上可以从你的互动中学习。

如果您一直在关注 [Openclaw][2] 对 Hindsight 所做的事情 — 这是相同的想法，完全基于 Claude Code构建。

<!-- truncate -->


## 我们正在建设什么 {#what-were-building}

在本教程结束时，您将拥有：

1. **Telegram 机器人** 连接到 Claude Code — 从您的手机向其发送消息，获得由完整代码库和文件系统支持的响应
2. **自动记忆** 由 Hindsight 提供支持 — 每个对话都会被保留，相关上下文都会被调用并在每个提示中注入
3. **持久的智能体
随着时间的推移，** 会变得更加智能——它会记住您的项目、您的偏好、您的架构决策

堆栈很简单：Claude Code负责思考，Telegram提供接口，Hindsight提供记忆。没有自定义代码，没有超出您机器上运行的强制基础设施。


## 第 1 部分：Claude Telegram 代码 {#part-1-claude-code-on-telegram}

### 先决条件 {#prerequisites}

- 已安装 **Claude Code**（`brew install claude-code`位于macOS或`curl -fsSL https://claude.ai/install.sh | bash`）
- **包子
已安装**（macOS或`curl -fsSL https://bun.sh/install | bash`上的`brew install oven-sh/bun/bun`）——Telegram插件特别需要Bun；不支持 Node.js 和 Deno
- A**电报账号**

### 第 1 步：创建 Telegram 机器人 {#step-1-create-a-telegram-bot}

打开 Telegram 并开始与 [@BotFather][3] 聊天。

发送`/newbot`并按照提示操作 - 选择名称和用户名（必须以`bot`结尾）。 BotFather 会给你一个像这样的令牌：

```
[REDACTED_TELEGRAM_BOT_TOKEN]
```

保留此令牌用于第 3 步。

### 第2步：安装Telegram插件 {#step-2-install-the-telegram-plugin}

在您的Claude Code会话中，运行：

```
/plugin install telegram@claude-plugins-official
/reload-plugins
```

这将安装 Telegram MCP 插件并重新加载插件注册表。

### 第 3 步：设置您的机器人令牌 {#step-3-set-your-bot-token}

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN" > ~/.claude/channels/telegram/.env
```

将 `YOUR_BOT_TOKEN` 替换为来自 BotFather 的令牌。该文件包含一个秘密 - 使用 `chmod 600 ~/.claude/channels/telegram/.env` 限制权限。您还可以将 `TELEGRAM_BOT_TOKEN` 导出为 shell 环境变量（shell 优先于文件）。

:::note `/telegram:configure` 技能仅在使用 `--channels` 标志运行的会话中可用（步骤 4）。不要尝试在普通的 Claude Code会话中运行它。
:::

### 第 4 步：使用通道启动 Claude Code {#step-4-launch-claude-code-with-channels}

退出当前会话并重新启动 Telegram 频道：

```bash
claude --channels plugin:telegram@claude-plugins-official
```

Claude Code现在正在运行，并且 Telegram 插件处于活动状态。

### 第 5 步：配对您的 Telegram 帐户 {#step-5-pair-your-telegram-account}

1. 打开 Telegram 并向您的机器人发送任何消息（例如“你好”）
2. 机器人回复 6 个字符的配对码
3. 回到Claude Code，运行：

```
/telegram:access pair <code>
```

您的设备现已配对。

### 第 6 步：锁定访问 {#step-6-lock-down-access}

切换到白名单模式，这样只有您可以使用该机器人：

```
/telegram:access policy allowlist
```

通过消息 [@userinfobot][4] 找到您的 Telegram 用户 ID，然后：

```
/telegram:access allow <your_user_id>
```

不在允许名单上的任何人都将被默默忽略。

### 权限说明 {#a-note-on-permissions}

Claude Code有一个权限系统，在运行某些工具（shell 命令、文件写入等）之前会提示批准。这些提示出现在终端中 - **不在 Telegram 中**。如果您纯粹通过手机进行交互，Claude 可能会默默地阻止等待您看不到的批准。

有两种方法：

1. **以完全权限运行**：与`claude --dangerously-skip-permissions --channels ...`一起启动——这赋予了智能体完全的自主权。如果只有您可以访问该机器人，则适用（这就是第 6 步很重要的原因）。
2. **保持终端可见**：将Claude Code终端在您的计算机上保持打开状态，以便您可以在权限请求进入时批准它们。

对于真正自主的 Telegram 智能体，选项 1 是实用的选择。只需确保您的许可名单首先被锁定即可。

如果您选择选项1，**通过`CLAUDE.md`中的规则降低风险**。由于内置的​​权限门被绕过，因此您需要定义自己的安全边界。一个实用的模式是一个分层系统：

- **第 1 级（免费）**：只读操作——读取文件、搜索代码、浏览网页、git status/log/diff。无需确认。
- **第 2 层（先询问）**：任何创建、修改或删除状态的东西——文件写入、git 提交、发送消息、安装包。智能体应该在 Telegram 上描述操作，并在继续之前等待您的明确批准。
- **第 3 级（禁止）**：不可逆或高风险操作——强制推送、递归删除、泄露秘密、修改 CLAUDE.md 本身。即使有请求，这些也不应该由机器人本身执行。

这样你的智能体就能自主运行安全任务，在对任何有副作用的事情采取行动之前进行询问，并对破坏性操作有严格的限制。这些规则位于 `CLAUDE.md` 中，因此它们在会话中持续存在并自动加载。

### 到目前为止你所拥有的 {#what-you-have-so-far}

Telegram 上的工作Claude Code智能体。您可以从手机向它发送消息，它会通过对您的代码库和文件系统的完全访问权限来响应 - 读取文件、运行命令、进行更改。

但是记忆是有限的。 Claude Code的内置降价记忆捕获了偏好和指令，但它并不能记忆存储你对话的实质内容——你探索的决定、你权衡的权衡、事物为何如此的背景。重新启动会话，对话深度就会丢失。对于快速任务来说，这很好。对于一个长期任职的助理来说，这是一个天花板。

让我们解决这个问题。


## 第 2 部分：使用 Hindsight 添加长期记忆 {#part-2-adding-long-term-memory-with-hindsight}

[Hindsight][5] 是一个仿生记忆引擎——它不仅存储对话，还*明白* 存储对话。当你记忆对话时，Hindsight提取离散的、结构化的事实：决策、偏好、关系、技术背景。当您记忆召回时，它会通过与当前查询的语义相关性来检索事实，而不是通过时间戳或关键字。结果是记忆的行为更像人类的回忆，而不是搜索索引——显示重要的内容，过滤掉不重要的内容。

[Openclaw 集成][6] 几个月来一直在为 Openclaw 智能体执行此操作。现在，[Claude Code集成][7] 为 Claude Code带来了相同的功能。

插件挂钩到Claude Code的生命周期：

- **每次提示之前**：查询Hindsight相关记忆并将它们作为上下文注入 - Claude看到它们，聊天记录看不到
- **回应后定期**：提取对话块并将其保留到Hindsight进行长期存储（每N轮，重叠以保证连续性）
- **课程开始时**：健康检查Hindsight服务器
- **课程结束时**：如果插件启动了守护进程，则清理守护进程

这是完全自动的。安装后，每次对话都会构建您智能体的记忆，并且每个新提示都会受益于它所学到的一切。

### 第七步：安装Hindsight插件 {#step-7-install-the-hindsight-plugin}

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

### 步骤 8：配置您的 LLM 提供商 {#step-8-configure-your-llm-provider}

Hindsight 需要LLM 从对话中提取事实。选择一项：

```bash
#选项 A：OpenAI（自动检测）
export OPENAI_API_KEY="sk-your-key"

#选项 B：Anthropic（自动检测）
export ANTHROPIC_API_KEY="your-key"

# 方案 C：无需 API 密钥，使用 Claude Code 自身模型（仅个人/本地用途）
export HINDSIGHT_LLM_PROVIDER=claude-code

#选项 D：连接到外部 Hindsight 服务器而不是在本地运行
mkdir -p ~/.hindsight
echo '{"hindsightApiUrl": "https://your-hindsight-server.com"}' > ~/.hindsight/claude-code.json
```

选项 A、B 和 C 都会在首次​​使用时自动运行本地 Hindsight 守护进程 — 无需单独设置。选项 D 完全跳过本地守护进程并将插件指向现有服务器。

### 第 9 步：定制您智能体的记忆 {#step-9-customize-your-agents-memory}

这些设置决定了你的智能体的记忆方式。默认值运行良好，但您可能需要调整以下内容：

```json
{
  "bankId": "my-telegram-agent",
  "bankMission": "你是一名高级软件工程师助理。重点关注架构决策、代码模式、项目上下文和用户偏好。",
  "retainMission": "提取技术决策、架构选择、用户偏好、项目背景以及人与工具之间的关系。忽略例行的问候和短暂的操作细节。"
}
```

|设置|默认|它的作用|
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
|`bankId`|`"claude_code"`|命名记忆库。更改此设置以隔离每个智能体的记忆。|
|`bankMission`|通用助手|告诉 Hindsight 这个智能体是谁——帮助它提取更多相关事实。|
|`retainMission`|技术提取|指导Hindsight 应从对话中记住什么。|
|`retainEveryNTurns`|`10`|在滑动窗口中每 10 回合保留一次 — 避免 API 轰炸，同时保持完全覆盖。|
|`retainOverlapTurns`|`2`|包括保留窗口之间 2 圈额外的重叠，以确保连续性。|
|`recallBudget`|`"mid"`|Hindsight 多么努力地寻找相关记忆。 `"low"`代表速度，`"high"`代表彻底。|
|`recallMaxTokens`|`1024`|每个提示注入的记忆上下文的最大标记。|

完整的配置参考位于[插件自述文件][9]中。

### 第 10 步：重新启动并验证 {#step-10-relaunch-and-verify}

重新启动Claude 使用两个插件的代码：

```bash
claude --channels plugin:telegram@claude-plugins-official
```

向您的机器人发送几条消息。然后检查日志 — 使用 `~/.hindsight/claude-code.json` 中的 `"debug": true`，您将看到：

```
[Hindsight] Recalling from bank 'my-telegram-agent', query length: 142
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'my-telegram-agent', doc '...', 8 messages, 2341 chars
```

每次提示都注入相关上下文，每次对话都被保存。验证完成后，在 `~/.hindsight/claude-code.json` 中删除调试配置或设置 `"debug": false`。

通过删除或设置进行验证后关闭调试模式`"debug": false`在`~/.hindsight/claude-code.json`.


## 这在实践中是什么样子 {#what-this-looks-like-in-practice}

要了解发生了什么变化，您需要了解Hindsight实际上在幕后做了什么。它不只是记录对话——它还*重构事实*。当您告诉您的智能体“我们决定使用Postgres，因为团队已经知道它并且我们需要 JSONB 支持”时，Hindsight 不会存储原始转录本。它提取离散的事实：技术选择、基本原理、团队约束。这些事实被分类（世界知识、经验、观察）、时间戳，并以某种方式存储，使它们可以通过语义相关性检索——而不仅仅是关键字匹配。

这就是记忆召回的有用之处。当你一周后要求你的智能体设计一项新服务时，Hindsight不会将你的整个对话历史记录转储到提示中。它显示了与您现在所问的问题实际相关的 3-4 个事实：您的数据库选择、您的命名约定、您建立的架构模式。智能体准确地接收它所需的上下文，仅此而已。

这个进程是这样的：

**第 1 天**：你告诉你的机器人一个新项目。它没有记忆——它根据你告诉它的内容以及它可以在代码库中读取的内容来工作。

**第 3 天**：你问“我们讨论的数据库模式是什么？” Hindsight 将您的查询与第一天提取的事实进行匹配，并将它们作为上下文注入。机器人会准确地从你上次停下的地方继续——不是因为它重播了旧的对话，而是因为它回想起了相关的具体决定。

**第 2 周**：你要求它重构一个模块。 Hindsight 回想起您的架构偏好、您建立的命名约定、您拒绝的模式。智能体不会要求你重复自己——它已经拥有从之前的对话中提取的事实，并按相关性进行排名。

**第 2 个月**：您的机器人保留了数百条对话。 Hindsight 提取了数千个离散事实。智能体非常了解您的代码库——不仅仅是代码（它总是可以读取代码），还有*代码背后的决定*。为什么您选择Postgres而不是SQLite。为什么要重写auth中间件。谁要求改变API。上下文不存在于代码本身中，被提炼成结构化记忆。

​​这是无状态工具和上下文协作者之间的区别。 Claude Code提供推理和代码库/文件系统访问。 Hindsight 提供了连续性——能够随着时间的推移、一次又一次的会议积累理解，并准确地利用该理解的正确部分来解决每个新问题。它们共同产生了一个智能体，您使用它的次数越多，其响应质量就会越高。


## 为什么Claude Code {#why-claude-code}

如果你了解[张爪][10]，这听起来很熟悉。 Openclaw 已经与 Hindsight 集成了几个月——这给了 Openclaw 智能体的记忆。此设置使用不同的堆栈实现相同的结果。问题是：哪个更适合您的工作流程？

但首先，让我们承认房间里的大象。通道 — Claude 连接到消息传递平台的代码会话，具有持久执行、插件挂钩和自主操作 — 是 Openclaw 首创的功能。架构方法完全不同（挂钩和插件与网关运行时、Python脚本与npm包、基于文件的状态与记忆），但用户体验惊人地趋同：聊天中的AI智能体，可以访问您的代码库，您可以通过手机与之交谈。这并非巧合。 Channels 的发布标志着 Anthropic 将智能体原生消息传递视为一流的功能，而在 Openclaw 的创建者加入 OpenAI 之后的时机，使得这一战略意图不容忽视。对于用户来说，这无疑是个好消息：该模式现已得到社区和主要AI实验室的验证，生态系统竞争将推动两个平台向前发展。

选择取决于您的需求和您已经使用的内容。

Openclaw 和Claude Code都可以读取您的文件、运行命令以及与消息平台交互。功能集明显重叠。差异在于架构和权衡。

**Claude Code** 是 Anthropic 的官方 CLI — 由构建 Claude 的同一个团队维护。它提供了明确定义的钩子生命周期、沙盒执行、精细的权限模型以及专为自主操作而设计的插件架构。通道系统、MCP集成、权限模型——这些是随产品一起提供并随之发展的第一方功能。

**张开爪**是一个社区驱动的智能体框架，具有更广泛的模型生态系统——它支持多个LLM提供商，开箱即用的多个消息通道，并拥有由社区构建的成熟插件生态系统。 Hindsight 集成起源于此，如果您需要多模型或多平台设置，它仍然是更灵活的选择。

对于已经投资于Claude并想要一个具有强大安全默认值的精简、单一供应商堆栈的开发人员来说，Claude Code是自然的选择。对于那些想要模型灵活性或已经运行 Openclaw 智能体的人来说，Openclaw 集成同样有能力 — 相同的Hindsight，相同的记忆质量，不同的运行时间。

||开爪 + Hindsight|Claude Code + 电报 + Hindsight|
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
|**运行时**|Openclaw 网关|Claude 带通道的代码|
|**维护者**|社区（开源）|Anthropic（第一方）|
|**型号**|可配置（OpenAI、Claude等）|Claude（通过AnthropicAPI）|
|**接口**|多渠道（Telegram、Discord、Slack、网络等）|任何频道插件（Telegram、Discord 今天 - 更多即将推出）|
|**记忆**|hindsight-openclaw (TypeScript)|hindsight-claude-code (Python)|
|**代码库访问**|本机（读、写、编辑、执行）|Native（读取、编辑、写入、Bash、Git、PR 工作流程）|
|**插件系统**|Openclaw 插件格式|Claude Code挂钩（结构化生命周期）|
|**设置**|Openclaw 配置 + 插件安装|Claude Code+频道+插件安装|

Claude Code的Hindsight插件是[Openclaw插件的完整端口][11]——相同的架构，相同的配置选项，相同的记忆召回/记忆存储逻辑。如果您已经将 Hindsight 与 Openclaw 一起使用，则概念是相同的。区别在于您构建的基础。


## 动态记忆库 {#dynamic-memory-banks}

对于高级设置，该插件支持动态记忆库 ID — 隔离每个项目、每个通道或每个用户的记忆：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

通过这种配置，每个项目目录都有自己的记忆库。您的前端项目的记忆与后端项目的记忆是分开的。您还可以通过设置 `HINDSIGHT_CHANNEL_ID` 和 `HINDSIGHT_USER_ID` 环境变量来为多用户或多通道智能体添加 `"channel"` 和 `"user"` 维度。


## 故障排除 {#troubleshooting}

**机器人没有反应**：确保Claude Code与`--channels plugin:telegram@claude-plugins-official`一起运行。该插件仅在活动会话中工作。

**配对码未出现**：检查您的机器人令牌是否在`~/.claude/channels/telegram/.env`中正确设置。

**“找不到小圆面包”错误**：使用`curl -fsSL https://bun.sh/install | bash`安装Bun并重新启动终端。

**没有回忆起来**：记忆至少需要一个记忆存储周期才能可用。发送几条消息，等待异步记忆存储处理，然后检查下一个提示。启用 `"debug": true` 查看记忆召回/记忆存储流程。

**Hindsight 守护进程未启动**：检查LLMAPI键（或`HINDSIGHT_LLM_PROVIDER=claude-code`）是否已设置。在 `~/.hindsight/profiles/claude-code.log` 查看日志。

**记忆召回上的高延迟**：记忆召回钩子有 12 秒超时（API 调用本身在 10 秒时超时，有处理余量）。尝试`"recallBudget": "low"`以获得更快的响应，或减少`"recallMaxTokens"`。


## 下一步是什么 {#whats-next}

此设置 - Claude Code、电报、Hindsight - 为您提供持久的 AI 编码助手，具有长期记忆，可从任何地方以及通过手机访问。到目前为止，这种事情只有专用的智能体框架才能实现。

Claude Code的Hindsight插件是[开源][12]，并且适用于任何Claude Code频道，而不仅仅是Telegram。 Discord 已经得到支持，并且随着更多 Channel 插件的发布，记忆层保持不变。

​​设置好，使用一周，看看有什么不同。

[1]: https://vectorize.io/hindsight
[2]: https://openclaw.ai
[3]: https://t.me/botfather
[4]: https://t.me/userinfobot
[5]: https://vectorize.io/hindsight
[6]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openclaw
[7]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[9]: https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[10]：https://openclaw.ai
[11]：https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
[12]：https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-code
