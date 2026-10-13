---
sidebar_position: 6
title: "编程智能体"
description: "为编程智能体提供统一的 Hindsight 记忆插件：根据 git 历史和以往会话自动构建每个仓库的记忆库，并在智能体工作时注入记忆。"
---

import {StaticImage} from '@site/src/components/StaticMedia';


{/* 从 hindsight-integrations/coding-agents/README.md 生成。请编辑该文件，再运行
    node hindsight-docs/scripts/sync-coding-agents-doc.mjs */}

import Figure from '@site/src/components/Figure';
import codingAgents from '@site/figures/coding-agents.json';
import CodingAgentsChart from '@site/src/components/CodingAgentsChart';

由 [Hindsight](https://vectorize.io/hindsight) 支持的**编程智能体**长期项目记忆。
一个软件包支持多个智能体：共享反思与注入核心，每个智能体只需一个轻量入口
（**Claude Code**、**Codex CLI**、**DeepAgents Dcode**、**opencode**、**opencode 2**、**Kilo CLI**、**Cursor CLI**、**GitHub Copilot CLI**、**Grok Build**、**Qwen Code**、**Kimi Code**、**Factory Droid**、**ZCode**、**TraeCode**、**Antigravity CLI**、**Devin CLI**、**Cline CLI**、**pi**、**Prime Agent**、**DeepSeek Harness**、**WorkBuddy**、**CodeBuddy**）。导入完全自动进行，无需设置命令：工作时，仓库的 git 历史和对话会在后台流入记忆库。

基本前提是：真正修复问题所需的大部分信息可以从代码推导出来，但*最后一步*往往依赖代码中完全没有的项目决策，例如舍入规则、重试允许列表或平局处理策略。这些决策存在于 git 历史和以往对话中。此软件包在智能体开始工作时将它们呈现出来，并维护整理过的**知识页面**（架构、约定、进行中的工作），作为后续会话的起点。

<Figure doc={codingAgents} />

[查看更新日志 →](/changelog/integrations/coding-agents)

## 是否有效？ {#does-it-work}

测量采用 [AMB 的 sdebench](https://agentmemorybenchmark.ai/dataset/sdebench)：编程智能体处理 61 个真实仓库任务，有记忆和无记忆条件下各运行三次。

变化并不在准确率：两种条件下每次都能完成 61 个任务中的 60–61 个。这些本就是优秀智能体能够完成的任务。记忆改变的是完成任务的成本：需要多少次停下来纠正智能体，以及 token 的费用。

<CodingAgentsChart title="AMB · sdebench" />

| 智能体      | 每个任务的纠正次数 | 每个任务的费用       |
| ----------- | ------------------ | ------------------- |
| Claude Code | 0.85 → **0.36**    | $0.445 → **$0.338** |
| Codex CLI   | 1.34 → **0.47**    | $0.577 → **$0.276** |
| opencode    | 1.20 → **0.80**    | $0.634 → **$0.553** |

无记忆 → 使用 Hindsight，取 3 次运行的平均值。纠正次数沿用 AMB 图表中的标签，费用来自同一张逐次运行数据表。

两个数字一起下降，这是作用机制而非巧合。一次纠正就是一次往返：智能体猜错项目特定决策，你叫停、解释，智能体重做。每次都消耗一轮 token 和一轮注意力。在开始*之前*就提供决策——几个月前已在提交消息或对话中确定的舍入规则、重试允许列表、平局处理策略——就能消除猜测，也消除这次往返。

## 安装 {#install}

```bash
npx @vectorize-io/hindsight-coding-agents install all          # 以原生方式接入所有检测到的智能体
npx @vectorize-io/hindsight-coding-agents install claude-code  # 或仅接入一个
npx @vectorize-io/hindsight-coding-agents uninstall all        # 精确移除安装时添加的内容
npx @vectorize-io/hindsight-coding-agents update               # 仅更新运行时，不重新接线
npx @vectorize-io/hindsight-coding-agents stats                # 各智能体使用 Hindsight 的频率
```

`install` 接受明确目标：`all` 或一个/多个智能体运行环境名称。不带目标的 `npx @vectorize-io/hindsight-coding-agents install` 不会更改任何内容，只会显示可选项，因此不会意外接入机器上的所有智能体。**更新时再次运行相同的 `install` 命令**，即可在原位置重新复制运行时。

日常无需手动更新：每天首次会话启动时检查 npm，并在后台准备更新的运行时（`autoUpdate` 默认启用，设为 `false` 可固定当前版本）。这相当于上面的 `update` 命令：更新所有已接入智能体引用的副本，有意不改动宿主配置。发布版本增加新钩子时，或希望接入另一个智能体时，请自行重新运行 `install`。

在终端中还会询问**记忆应存储在哪里**：Hindsight Cloud、自建服务器或本机守护进程（见记忆的存储位置）。脚本化安装则传入 `--server cloud|self-hosted|daemon`；仅首次询问，重新安装时不会重复。

### 按智能体安装 {#per-agent}

命令相同，只需更改运行环境名称。全局安装软件包后运行。

#### <StaticImage src="/img/harness/claude-code.webp" alt="" width="20" height="20" /> Claude Code

```bash
npx @vectorize-io/hindsight-coding-agents install claude-code
```

在 `~/.claude/settings.json` 注册 3 个钩子，通过 `claude mcp add` 注册 MCP（用户范围），并安装配套技能。

#### <StaticImage src="/img/harness/codex.svg" alt="" width="20" height="20" /> Codex CLI

```bash
npx @vectorize-io/hindsight-coding-agents install codex
```

在 `~/.codex/hooks.json` 注册 3 个钩子，并在 `config.toml` 注册 `[mcp_servers]`（需要 `codex_hooks = true`）。

#### <StaticImage src="/img/harness/dcode.svg" alt="" width="20" height="20" /> DeepAgents Dcode

```bash
npx @vectorize-io/hindsight-coding-agents install dcode
```

安装程序将此软件包注册为 Dcode 本地插件市场，再调用 Dcode 自己的 `plugin install` 命令。软件包是原生 Agent Plugin：根目录的 `plugin.json` 提供共享技能、Hooks V2 的 `SessionStart`、`UserPromptSubmit` 和 `Stop` 生命周期，以及带命名空间的 `hindsight_*` MCP 服务器。通过 Dcode 正常插件管理器启用即可，无需修补 Dcode 配置或添加兼容桥接。

Dcode 为插件 MCP 工具添加命名空间，因此显示为 `plugin__hindsight-coding-…__hindsight_…`，而非原始名称；智能体都能通过工具指南解析它们。无界面运行（`dcode -n`）时，Dcode 允许只读 Hindsight 工具，但两个写入工具（`hindsight_ingest_document`、`hindsight_capture_initiative`）需要批准，而该模式没有批准界面。请在交互式 TUI 中捕获工作计划或导入文档。同理，存在其他已安装智能体时，一次性代码库调查会通过那个智能体的 CLI 运行，与 Cursor、Copilot、Devin、Grok Build、Cline、Kilo 和 Prime Agent 相同。

#### <StaticImage src="/img/harness/opencode.png" alt="" width="20" height="20" /> opencode

```bash
npx @vectorize-io/hindsight-coding-agents install opencode
```

向 `~/.config/opencode/opencode.json` 添加插件条目，使用原生工具，无需 MCP。

#### <StaticImage src="/img/harness/opencode.png" alt="" width="20" height="20" /> opencode 2

```bash
npx @vectorize-io/hindsight-coding-agents install opencode2
```

opencode v2（`npm @opencode/cli`）除 `opencode` 外还提供 `opencode2` 二进制别名，并重写了插件 API，因此是独立运行环境。它向同一个 `~/.config/opencode/opencode.json` 写入相同插件条目。两个 CLI 共享该文件，v1 如果遇到 v2 的 `plugins` 键，会拒绝整个配置；随后各 CLI 从同一注册路径加载自己的入口。因此安装任一运行环境都会接入两者，卸载任一也会移除共享条目。

与 v1 有两处区别，均来自宿主限制：一次性代码库调查通过其他已安装智能体的 CLI 运行（v2 插件无法定义调查所需的只读智能体）；初始数据提示写入插件日志，而非 TUI 通知（v2 插件无法显示通知）。召回、注入、原生 `hindsight_*` 工具和会话回写完全相同。配套技能也相同，但通过 v2 技能 API 在内存中注册，而非复制到技能目录：opencode2 没有自己的技能目录，读取的两个目录属于其他智能体。

#### <StaticImage src="/img/harness/kilo.svg" alt="" width="20" height="20" /> Kilo CLI

```bash
npx @vectorize-io/hindsight-coding-agents install kilo
```

向 `~/.config/kilo/kilo.json[c]` 添加插件条目。

#### <StaticImage src="/img/harness/cursor-cli.svg" alt="" width="20" height="20" /> Cursor CLI

```bash
npx @vectorize-io/hindsight-coding-agents install cursor-cli
```

在 `~/.cursor/hooks.json` 注册钩子，配置 `~/.cursor/mcp.json`，并安装配套技能。

#### <StaticImage src="/img/harness/copilot-cli.svg" alt="" width="20" height="20" /> GitHub Copilot CLI

```bash
npx @vectorize-io/hindsight-coding-agents install copilot-cli
```

配置 `~/.copilot/hooks/`、`mcp-config.json` 和配套技能。

#### <StaticImage src="/img/harness/grok-build.svg" alt="" width="20" height="20" /> Grok Build

```bash
npx @vectorize-io/hindsight-coding-agents install grok-build
```

在 `~/.grok/hooks/hindsight.json` 注册原生钩子，在 `~/.grok/config.toml` 注册 MCP，并安装配套技能。Grok 也会运行 `~/.claude/settings.json` 中的 Claude Code 钩子，但这些钩子在 Grok 中保持静默，因此同时接入两个宿主的机器只会记录每个 Grok 会话一次。

#### <StaticImage src="/img/harness/qwen-code.svg" alt="" width="20" height="20" /> Qwen Code

```bash
npx @vectorize-io/hindsight-coding-agents install qwen-code
```

在 `~/.qwen/settings.json` 注册原生钩子，并配置 MCP 和配套技能。

> Qwen 钩子的 `timeout` 单位是**毫秒**（其文档原文为“Timeout in milliseconds, default 60000”），与其他受支持智能体不同，因此安装的值为 `30000/30000/60000`。
> 召回只在真实提交时触发：`UserPromptSubmit` 也会在工具结果续接时触发，因此交互会话每个提示词召回一次，而无界面（`qwen -p`）、`serve`、SDK 和 ACP 会话会初始化并存储记忆，但不进行召回。

#### <StaticImage src="/img/harness/kimi-code.svg" alt="" width="20" height="20" /> Kimi Code

```bash
npx @vectorize-io/hindsight-coding-agents install kimi-code
```

在 `~/.kimi-code/config.toml` 注册原生钩子，在 `~/.kimi-code/mcp.json` 注册 MCP，并安装配套技能。
（设置 `$KIMI_CODE_HOME` 时，钩子和 MCP 则位于该目录下。）

> Kimi 的 SessionStart 钩子无法接触模型，因此会话简报在该阶段保持静默；召回记忆改为在首次提示词时以 `<hook_result>` 块到达。会话从会话目录下每个智能体的 `wire.jsonl` 存储，包括子智能体。

#### <StaticImage src="/img/harness/factory-droid.svg" alt="" width="20" height="20" /> Factory Droid

```bash
npx @vectorize-io/hindsight-coding-agents install factory-droid
```

在 `~/.factory/hooks.json` 注册 4 个钩子（用户范围），包括能安全处理取消的 `Notification` 回写；在 `~/.factory/mcp.json` 的 `mcpServers.hindsight` 下注册 stdio MCP，并在 `~/.factory/skills` 安装配套技能。安装程序只操作 JSON 文件，无需调用 Droid CLI，并拒绝覆盖用户自行管理、已命名为 `hindsight` 的 MCP 服务器。Droid 的钩子协议与 Claude Code 相同（输入 `session_id`/`transcript_path`/`cwd`，输出 `hookSpecificOutput.additionalContext`）。召回和注入使用相同协议；回写也处理 Droid 的取消通知，因为取消一轮后 Droid 不发出 `Stop`。

#### <StaticImage src="/img/harness/zcode.svg" alt="" width="20" height="20" /> ZCode

```bash
npx @vectorize-io/hindsight-coding-agents install zcode
```

在 ZCode 自己的 CLI 配置 `~/.zcode/cli/config.json` 中注册三个钩子，以及位于 `mcp.servers.hindsight` 下的 stdio MCP 服务器。即使 ZCode 内嵌 Claude Code 智能体运行时并使用其钩子协议，也绝不操作真实的 Claude Code 设置。配套技能位于 `~/.zcode/skills`。配置钩子默认**禁用**，因此安装程序还会将 `hooks.enabled` 设为 `true`；如果该处没有其他注册项，`uninstall` 会再次移除整个块，并拒绝操作非本插件创建的 `hindsight` MCP 服务器。

> ZCode 钩子的 `timeoutMs` 单位是**毫秒**（安装值为 `30000/30000/60000`）；`hooks.maxOutputBytes` 限制钩子的输出，超出限制会丢弃全部输出，包括注入内容。仅当配置未设置此值时，安装程序才将其初始化为 `32768`。
>
> ZCode 不保存持久会话记录：`Stop` 仅携带回答和一个只含助手内容的临时文件，钩子返回后立即删除，完全不包含用户提示词。因此这是唯一由插件自行记录对话的智能体：提示词钩子记录问题，`Stop` 钩子记录回答，回写随后像其他智能体一样，将每个新轮次追加到同一会话文档。ZCode 因而不支持 `--import-conversations`，因为磁盘上没有可供回填的历史记录。

#### <StaticImage src="/img/harness/traecode.png" alt="" width="20" height="20" /> TraeCode

```bash
npx @vectorize-io/hindsight-coding-agents install traecode
```

在 TraeCode 用户级 `hooks.json` 注册三个钩子，在同一隐藏目录的 `skills/` 安装配套技能，并在 `sandbox.json` 添加两条 `filesystem.readWrite` 规则：一条用于 `~/.hindsight`，缺少它时沙箱会阻止写入，钩子静默失败（退出码 0，但无效果）；另一条用于 Trae 每个窗口的存储数据库（`<userData>/User/workspaceStorage`），SessionStart 钩子在其中初始化工作区的 MCP 启用开关。默认允许网络访问。TRAE 有两个品牌根目录不同的版本：国内版使用 `~/.trae-cn` 和“Trae CN”，国际版使用 `~/.trae` 和“Trae”。因此所有路径通过探测现有版本目录解析，默认使用国内版名称。仅操作普通 JSON 文件，无需调用 CLI。TraeCode 使用 Claude Code 钩子协议，因此召回和注入行为相同；事件映射位于顶层 `hooks` 键下，保留宿主写入的 `version` 字段。

MCP 按仓库注册，绝不注册到用户级：Trae 使用 Electron 进程的 cwd（主目录）启动用户级服务器，导致 Hindsight 条目在 `optInOnly` 下自行禁用（零工具），或解析为主目录记忆库而非仓库记忆库。因此安装程序为所有通过 `mapPathToBank` 启用的仓库预先注册：在 `<repo>/.trae/mcp.json` 中添加 `mcpServers.hindsight` stdio 服务器，通过 `HINDSIGHT_MCP_PROJECT_CWD` 固定到该仓库；从 `<userData>/User/mcp.json` 移除过时用户级条目，并直接初始化每个工作区的启用开关。SessionStart 钩子在每次会话重新检查两者，仅缺失或过时时才写入（幂等回退），因为不能依赖 Trae 的钩子沙箱自行完成写入。仓库级文件会合并而非覆盖；仓库有 `.gitignore` 时还会忽略该文件（路径与机器相关）。任一文件中外来的 `hindsight` 条目都属于用户自己的服务器，绝不操作。

Trae 仅在全局 `trae.mcp.enableWorkspaceMcp` 设置启用时才读取仓库级文件（默认关闭），因此安装程序会处理此开关：交互运行时询问，非交互运行时接受 `--enable-workspace-mcp`。两种方式都会写入设置，需要重启 Trae 窗口才生效（拒绝，或设置文件带注释时，会输出手动操作步骤）。注册和启用开关在下一个窗口生效，因此首次会话后重新加载即可看到 MCP 工具；安装后通过 `mapPathToBank` 新启用的仓库需要再运行一次 `install traecode`。如果仓库服务器在 MCP 面板仍显示禁用，请在那里手动启用一次。

> 安装后仍有一个手动步骤（安装程序无法写入的 UI 状态）：在 TraeCode Settings（设置）> Hooks（钩子）中启用钩子。如果拒绝了工作区 MCP 提示，可之后在 Trae 设置中搜索“enableWorkspaceMcp”并启用。

> TraeCode 不保留可读的会话记录，会话存储在加密本地数据库或云端。与 ZCode 相同，插件自行记录对话：提示词钩子记录你的问题，`Stop` 钩子使用 `last_assistant_message` 中的回答结束该轮。因此 TraeCode 不支持 `--import-conversations`，磁盘上没有可回填的历史记录。

#### <StaticImage src="/img/harness/antigravity-cli.png" alt="" width="20" height="20" /> Antigravity CLI

```bash
npx @vectorize-io/hindsight-coding-agents install agy
```

生命周期钩子、MCP，以及 `Hindsight · <bank>` 状态行。

#### <StaticImage src="/img/harness/devin-cli.svg" alt="" width="20" height="20" /> Devin CLI

```bash
npx @vectorize-io/hindsight-coding-agents install devin-cli
```

在 `~/.config/devin/config.json` 注册钩子，并配置 MCP。需要 Node 22.5+，见下文。

#### <StaticImage src="/img/harness/cline-cli.svg" alt="" width="20" height="20" /> Cline CLI

```bash
npx @vectorize-io/hindsight-coding-agents install cline-cli
```

通过 `cline plugin install` 安装原生插件，并配置 MCP 和配套技能。

#### <StaticImage src="/img/harness/pi.svg" alt="" width="20" height="20" /> pi

```bash
npx @vectorize-io/hindsight-coding-agents install pi
```

在 `~/.pi/agent/settings.json` 添加扩展条目，在 `~/.pi/agent/skills` 安装配套技能。使用原生工具，无需 MCP。

对于 pi 和下文的 Prime Agent，此命令是唯一受支持的安装方式。有意不支持将我们作为 pi 软件包安装（`pi install npm:@vectorize-io/hindsight-coding-agents`）：两个宿主读取软件包 `package.json` 中相同的 `pi` 键，而该键只能指定一个入口。未被指定的宿主会加载另一宿主的打包代码，将自己报告为错误智能体，采用错误运行环境的配置，并为每个存储文档打上错误归属。因此软件包完全不包含 `pi` 键，上面的安装命令让每个宿主指向自己的打包代码。

#### <StaticImage src="/img/harness/prime-agent.svg" alt="" width="20" height="20" /> Prime Agent

```bash
npx @vectorize-io/hindsight-coding-agents install prime-agent
```

Prime Agent 是 pi 的分支，因此接入方式相同：在 `~/.prime/agent/settings.json` 添加扩展条目，在 `~/.prime/agent/skills` 安装配套技能，使用原生工具，无需 MCP。可以且预期同时安装两者：各宿主从自己的设置文件加载自己的入口，像其他任意两个智能体一样，**每个仓库共享一个记忆库**（默认 `coding-agent::{gitProject}`），所以告诉 pi 的内容在打开 Prime Agent 时同样可用。独立入口确保各自归属正确：自己的 `harnesses.<name>` 配置部分，以及每个存储文档上的智能体标记。

#### <StaticImage src="/img/harness/dsh.svg" alt="" width="20" height="20" /> DeepSeek Harness

```bash
npx @vectorize-io/hindsight-coding-agents install dsh
```

在 `$DSH_HOME/cordis.patch.yml`（默认 `~/.dsh`）添加 Cordis 插件条目，每个 dsh 配置档都会组合该文件，使用原生工具，无需 MCP。dsh 有两点特殊之处：一个进程服务**多个仓库**（Web UI 可为每个会话选择目录），因此按会话工作区解析记忆库，而非每个进程只解析一次；dsh 没有面向插件的通知渠道，因此初始数据提示写入插件日志而非 UI。所有面向模型的内容——召回记忆、知识前导文本、`hindsight_*` 工具——不受影响。偏好已发布软件包方式时，`dsh plugin --profile web add @vectorize-io/hindsight-coding-agents` 也可用：软件包提供配置档补丁层，无需额外编辑。两种方式都会安装配套技能；通过宿主插件管理器接入时，插件在首次会话自行安装技能，因为此方式不会运行我们的安装程序。

#### <StaticImage src="/img/harness/workbuddy.png" alt="" width="20" height="20" /> WorkBuddy

```bash
npx @vectorize-io/hindsight-coding-agents install workbuddy
```

在 `~/.workbuddy/settings.json` 注册 3 个钩子，在 `~/.workbuddy/mcp.json` 注册 stdio MCP 服务器，并在 `~/.workbuddy/skills` 安装配套技能。WorkBuddy（腾讯 AI 工作台）基于共享 `@genie/agent-cli` 引擎，因此钩子遵循 Claude Code 协议。主要区别是对话记录 schema（`type:"message"` 记录包含顶层 `role`/`content`），由软件包自己的读取器归一化。

#### <StaticImage src="/img/harness/codebuddy.webp" alt="" width="20" height="20" /> CodeBuddy

```bash
npx @vectorize-io/hindsight-coding-agents install codebuddy
```

在 `~/.codebuddy/settings.json` 注册 3 个钩子，在推荐文件 `~/.codebuddy/.mcp.json` 注册 stdio MCP 服务器，并在 `~/.codebuddy/skills` 安装配套技能。安装程序遵循 CodeBuddy 文档中的回退链，会合并现有的已弃用 `~/.codebuddy/mcp.json` 或旧版 `~/.codebuddy.json`，而非创建优先文件遮蔽它们。CodeBuddy Code 与 WorkBuddy 使用相同的 `@genie/agent-cli` 引擎，WorkBuddy 只是采用不同主目录，因此复用 WorkBuddy 的钩子运行时，仅写入根目录不同。

**覆盖两个 CodeBuddy 宿主，但它们的会话存储方式不同。** CodeBuddy Code（CLI）写入共享读取器可解析的 WorkBuddy JSONL。IDE 则向 Stop 钩子传入独立对话目录：`CodeBuddyIDE/<uid>/history/<md5(workspace)>/<conversationId>/`。其中 `index.json` 就是 `transcript_path`，正文位于下一层的 `messages/<messageId>.json`，因此读取器依据接收到的数据结构分派（core/transcript-codebuddy-ide.ts）。

同样方式卸载：`npx @vectorize-io/hindsight-coding-agents uninstall claude-code`（或 `uninstall all`）。

**Devin CLI 需要 Node 22.5 或更高版本。** 钩子仅传入会话 ID，对话本身位于 `~/.local/share/devin/cli/sessions.db`，因此读取依赖 Node 内置的 `node:sqlite`。安装 `devin-cli` 时会先检查此条件，不满足时拒绝并说明原因，避免接入永远无法存储内容的钩子。其他智能体均可使用任何受支持的 Node 版本。

`install` 将所需内容复制到 `~/.hindsight/coding-agents`，并让各智能体的接入配置指向该处，因此不依赖最初运行命令的位置。**更新**时再次运行相同命令，原位重新复制运行时，保持接入配置有效，让每个新会话使用新版本。

`install` 将原生接入配置（钩子及宿主要求的 MCP 注册）合并到各智能体自己的配置中，保留已有内容；操作是幂等的（移动软件包后可重新运行），并将操作过的现有文件备份为 `<file>.hindsight-backup`。`uninstall` 只移除我们的条目。Claude Code 安装还会提供**配套技能**（`~/.claude/skills/hindsight-coding-agent`），教智能体理解记忆的工作方式：如何执行“将此存储到 hindsight”、工具接口、仓库级配置、调试等，让用户可以直接询问智能体。也可以按运行环境手动接入：

**opencode** 和 **opencode 2** 可直接安装：让 `opencode.json` 指向软件包目录：

```json
{ "plugin": ["/path/to/hindsight-coding-agents"] }
```

一个条目支持两个 CLI：v1 通过 `package.json` 的 `main` 解析目录，v2 通过 `index.js` 解析，各自加载自己的插件。

**Claude Code** 和 **Codex** 通过此软件包自己的安装程序获得完整三钩子 + MCP 接入配置：`npx @vectorize-io/hindsight-coding-agents install claude-code` / `install codex`。软件包的 `bin` 条目（`hindsight-claude-hook`、`hindsight-codex-hook`、`hindsight-cursor-hook`）是单独的 `UserPromptSubmit` 入口，仅负责注入，适合最小手动配置。

添加智能体：基于钩子时，编写 `HookSpec` 入口（见 `src/cursor-hook.ts`），并在 `src/harness/registry.ts` 注册 `hookAdapter`；基于持久插件时，完整实现 `HarnessAdapter`（`src/core/types.ts`，示例见 `src/harness/opencode.ts`），或宿主不是 opencode 分支时，将其插件 API 直接绑定到 `RuntimeCore`（见 `src/cline.ts`、`src/dsh.ts`）。

## 从独立智能体插件迁移 {#migrating-from-the-per-agent-plugins}

旧的独立智能体集成（`hindsight-claude-code`、`hindsight-cursor-cli`、`hindsight-codex` 等）已由此软件包取代。只有两项内容迁移，其他设置不会迁移。

**服务器配置自动迁移。** 如果存在 `~/.hindsight/claude-code.json` 或 `~/.hindsight/codex.json`，`install` 会采用其中的端点：`hindsightApiUrl` → `apiUrl`，`hindsightApiToken` → `apiToken`，空 URL 仍表示本地守护进程。优先检查正在安装的智能体，因此接入 Codex 时，即使还残留旧 `claude-code.json`，也会使用 Codex 的服务器。你已经选择过记忆存储位置；默认切换到 Cloud 会将提示词悄悄发送到别处。传入 `--server` 可以覆盖。（只有这两个旧插件提供用户配置；Cursor CLI、Copilot CLI、opencode 和 Cline 没有可迁移的端点。）

**对话从本地磁盘重新导入**为新文档：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install claude-code --import-conversations   # 或：install codex --import-conversations
```

这会重新提取智能体已写入的记录，因此 token 消耗大致与导入历史量成正比。可以安全地重复运行（导入按文档 ID 去重）。

来源是本地记录而非旧记忆库，因为旧库无法按仓库拆分。它默认是**单一固定记忆库**：`dynamicBankId` 默认为 false，所有内容都进入名为 `claude_code` 的库。文档只记录 `retained_at`、`message_count` 和 `session_id`，没有项目标识。要判断哪些文档属于哪个仓库，需要通过 `session_id` 关联回本地记录中的 `cwd`，因此无论如何都需要这些记录；直接处理它们只是路径更短。

**会话匹配方法。** 仅当会话本身记录运行目录时才导入，绝不根据文件名或文件夹名推断。Claude Code 在条目中记录目录，Codex 在 `session_meta` 头部记录，DeepSeek Harness 在会话日志头部记录，pi 和 Prime Agent 则在会话头部记录。因此这五个宿主都能精确归属，包括从仓库子目录启动的会话。猜测看似方便（Claude 按项目路径命名历史文件夹），却不安全：`/` 和 `.` 都编码为 `-`，所以 `repo-sub` 可能是 `repo/sub` 子目录，也可能是无关的同级仓库。猜错会将别人的对话存入你的库。不记录目录的会话会跳过，并报告数量。DeepSeek Harness 日志是 `$DSH_HOME/sessions` 下带 Zstandard 帧的 JSONL，需要 Node 22.15+ 才可读取；旧 Node 会说明原因并跳过，而非静默导入空内容。Dcode 记录完全不含目录，工作目录仅存在于 LangGraph 检查点数据库，因此通过 `dcode threads list --json` 获取仓库信息：这是声明过、带版本的命令契约，而非内部 schema；没有 `dcode` CLI 时会说明原因并跳过。其他运行环境（opencode、opencode 2、Kilo、Cursor、Cline、Copilot、Devin）使用无版本 schema 的内部 SQLite 数据库存储历史，也会说明原因并跳过。

**其他设置不作转换。** 旧插件的行为设置——12 项 `recall*`、7 项 `retain*`、`bankMission`/`retainMission`、`dynamicBankGranularity`——描述的是已替换的流水线，重新解释只能依靠猜测。记忆库命名也会变化：此软件包为每个**仓库**提供所有智能体共享的一个记忆库（`coding-agent::{gitProject}`）。保留旧命名方式可以这样设置：

```jsonc
{ "bankIdTemplate": "{harness}::{gitProject}" } // 复现旧的按智能体命名方式
```

## 记忆的存储位置 {#where-memory-lives}

三种模式，安装时选择一次（终端中 `install` 会询问；脚本安装传入 `--server`）：

| 模式          | 运行内容                                  | 所需条件                                 |
| ------------- | ----------------------------------------- | ---------------------------------------- |
| `cloud`       | Hindsight Cloud（默认）                  | API 令牌                                 |
| `self-hosted` | 已运行的 Hindsight 服务器                | 服务器 URL                               |
| `daemon`      | 本机的本地 `hindsight-embed`              | PATH 中的 `uv` + 用于提取的 LLM 密钥       |

```bash
npx @vectorize-io/hindsight-coding-agents install claude-code --server daemon
npx @vectorize-io/hindsight-coding-agents install claude-code --server self-hosted --api-url http://localhost:8888
npx @vectorize-io/hindsight-coding-agents install claude-code --server cloud --api-token <token>
```

重新运行 `install` 不会再次询问：已指定服务器的配置保持原样。

### 本地守护进程模式 {#local-daemon-mode}

无需注册，也无需托管服务，记忆运行在本机。插件按需在 `127.0.0.1:9077` 启动 `hindsight-embed`，并让所有智能体连接它。

- **直接采用端口上已有的服务器，绝不重启**：一个守护进程服务所有智能体和仓库，如果已运行自己的 `hindsight-embed`，会直接复用。
- **冷启动在后台进行。** 首次启动需要下载守护进程并加载模型，超过任何钩子允许的执行时间，因此在会话启动时以分离进程运行。若会话在它就绪前开始，前一两轮只是不具备记忆。尚未启动的守护进程被视为不可访问的服务器，与 Cloud 或自托管故障使用相同错误处理和诊断。URL 之后的所有组件都无需了解是哪种模式。
- **它会持续运行**，直到手动停止。有意不在退出会话时停止：守护进程是共享的，结束一个会话不能让其他仍在工作的智能体失去记忆。
- **macOS 还需要较新的 Rust 工具链。** `litellm`（API 的传递依赖）只发布 Linux 和 Windows wheel，因此 Mac 通过 maturin 从源码编译，其 crate 固定使用较新的 `rustc`。请从 [rustup.rs](https://rustup.rs) 安装并保持更新；工具链过时与未安装都会导致失败。Linux 和 Windows 使用 wheel，不需要这些步骤。
- **事实提取在本地进行**，因此需要 LLM。优先使用已设置的 `HINDSIGHT_API_LLM_PROVIDER`；否则按顺序采用 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY` 中首个可用项；再否则使用无需密钥的 Claude Code CLI。`install` 会告知检测到的提供方。

守护进程设置沿用旧独立 Claude Code 插件的名称，因此现有环境可以原样迁移：

| 字段                | 环境变量                        | 默认值         | 含义                                                       |
| ------------------- | ------------------------------- | -------------- | ---------------------------------------------------------- |
| `serverMode`        | `HINDSIGHT_SERVER_MODE`         | `cloud`        | `cloud` \| `self-hosted` \| `daemon`                       |
| `apiPort`           | `HINDSIGHT_API_PORT`            | `9077`         | 本地守护进程监听端口                                       |
| `daemonIdleTimeout` | `HINDSIGHT_DAEMON_IDLE_TIMEOUT` | —              | 已弃用并忽略：守护进程不再自行退出                         |
| `daemonProfile`     | `HINDSIGHT_DAEMON_PROFILE`      | `coding-agent` | 使用哪个本地数据库                                         |
| `embedVersion`      | `HINDSIGHT_EMBED_VERSION`       | `latest`       | 运行哪个 `hindsight-embed` 版本                            |
| `embedPackagePath`  | `HINDSIGHT_EMBED_PACKAGE_PATH`  | —              | 改为运行本地检出目录（开发用途）                           |

导出的所有 `HINDSIGHT_API_*` 变量都会转发给守护进程，因此无需在此为服务器设置提供对应字段。

## 配置 {#configuration}

配置是**一个 JSON 文件**：`~/.hindsight/coding-agent.json`。逐字段分层合并，后者优先：

1. 内置默认值
2. 环境变量：`HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN`，以及每个标量设置的 `HINDSIGHT_<FIELD_IN_CAPS>`，供容器和 CI 注入配置而非写文件
3. 文件顶层
4. `harnesses.<name>`：智能体级覆盖
5. `paths.<prefix>`：目录级覆盖，在解析记忆库后应用（见目录级覆盖）
6. `banks.<resolvedBankId>`：仓库级覆盖，在解析记忆库后应用（见仓库级启用/禁用）

环境变量是**后备值**：文件中有值的地方均以文件为准，因此向现有配置添加环境变量不会改变那些设置。两个列表设置 `retainTags` 和 `optInPaths` 接受逗号分隔值（`HINDSIGHT_RETAIN_TAGS="project:{gitProject},env:work"`），条目会去除首尾空格并丢弃空值。映射设置（`mapPathToBank`、`harnesses`、`paths`、`banks`、`retainMetadata`）只能通过文件配置，因为按键分支无法扁平化到一个变量。容器和 CI 可使用 `HINDSIGHT_MAX_PARALLEL_RETAINS` 设置 `maxParallelRetains`。

`HINDSIGHT_CONFIG` 更改文件本身的位置：容器或测试运行环境中 `$HOME` 不适合作为基准时，可指向其他路径。仍然只有一个文件，只是位置变化。（其他非设置变量为 `HINDSIGHT_LOG_FILE`、`HINDSIGHT_DIAG_FILE`、`HINDSIGHT_USAGE_FILE` 和 `HINDSIGHT_LOG_LEVEL`，见诊断与日志。）

### 更改何时生效 {#when-a-change-takes-effect}

配置在进程启动时读取，不监视文件。因此修改何时生效取决于读取方：

| 宿主 | 读取文件的时机 | 修改生效时间 |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| 钩子运行环境（Claude Code、Codex CLI、Cursor CLI、GitHub Copilot CLI、Grok Build、Antigravity CLI、Devin） | 每次钩子调用读取一次，各钩子是独立短期进程 | 下次提示词时 |
| 持久插件（opencode、opencode 2、Kilo CLI、Cline CLI、pi、Prime Agent、DeepSeek Harness） | 每个工作区加载插件时读取一次 | 重启智能体后 |
| `hindsight_*` 工具后面的 MCP 服务器 | 启动时读取一次 | 下次会话中 |

`apiToken` 是例外。服务器拒绝请求时，每个宿主都会重新读取它，因此启用身份验证或轮换密钥会在下一次调用时生效，无需重启。否则，轮换会让长期运行智能体的每次记忆调用持续失败，直到重启。其他设置均遵循上表，包括 `apiUrl`、`disabled`、记忆库路由、`gitIngest`、调查和知识页面设置。

`hindsight_diagnose` 会报告这两方面的差异：文件当前写了什么，以及运行中的客户端实际使用什么。

### 仅在明确启用的项目中运行 {#opt-in-only}

默认每个项目都有记忆，这使插件无需设置。如果希望在明确允许前不记住任何内容，可以全局关闭记忆，并列出允许使用记忆的项目：

```jsonc
{
  "optInOnly": true,
  "optInPaths": ["~/work/client-x", "~/oss"],
}
```

这些路径之外的项目处于**未启用状态**：不创建记忆库、不存储内容、不初始化数据，智能体行为与没有插件时完全相同。允许使用记忆不要求其他设置：`optInPaths` 声明的是*哪些项目*，而非*哪个记忆库*，因此获准仓库保留通常的 `coding-agent::{gitProject}` 名称。路径按前缀匹配，允许 `~/work` 就允许该目录下的所有仓库，同时每个仓库仍有独立记忆库。

`mapPathToBank` 条目也表示明确启用，因为将路径路由到命名记忆库已声明该项目。单独设置 `bankId` 不表示启用：它命名的是记忆库而非项目，无法确定哪些工作可被记住，而隐私开关必须在不确定时保持关闭。

没有仓库级启用文件，原因与不提供任何随仓库携带的配置相同：克隆的仓库不能自行开启记忆。

有意不提供随仓库携带的配置文件。仓库级记忆库路由使用 `mapPathToBank`，智能体差异使用 `harnesses.<name>`。

每个入口都知道自己属于哪个运行环境（opencode 插件由 opencode 加载，codex 钩子由 Codex 加载等），因此一份共享配置可同时服务多个智能体：

```jsonc
{
  "apiUrl": "https://api.hindsight.vectorize.io",
  "harnesses": {
    "opencode": { "reflectTimeoutMs": 60000 },
    "claude-code": { "disabled": true }, // 例如只关闭 Claude 的记忆
  },
}
```

### 参考 {#reference}

| 字段                   | 默认值                              | 含义                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`                | `https://api.hindsight.vectorize.io` | Hindsight API 基础 URL（本地服务器设为 `http://localhost:8888`） |
| `apiToken`              | —                                    | bearer 令牌（Hindsight Cloud）。无需重启智能体即可生效：长期运行宿主在请求被拒绝后重新读取，因此会话中启用身份验证或轮换密钥会在下次调用时恢复。 |
| `bankId`                | —                                    | **显式固定记忆库**；未设置 ⇒ 按仓库动态解析（见下文） |
| `dynamicBankId`         | 未设置 `bankId` 时动态解析 | 强制动态（`true`）或静态（`false`）解析 |
| `bankIdTemplate`        | `"coding-agent::{gitProject}"`       | 动态记忆库 ID 格式；默认让所有智能体按仓库共享一个记忆库 |
| `mapPathToBank`         | —                                    | 绝对路径 → 记忆库；**最长前缀优先**；关联工作树继承主检出目录映射；覆盖所有其他设置 |
| `optInOnly`             | `false`                              | 仅在明确启用的项目运行记忆；其他项目不启用、不创建记忆库，见选择性启用说明 |
| `optInPaths`            | —                                    | 明确启用的目录，展开 `~` 后按前缀匹配；下属每个仓库及关联工作树均获准，同时保留各自动态记忆库 |
| `resolveWorktrees`      | `true`                               | 关联工作树继承主检出目录的记忆库身份、路径许可和映射 |
| `retainTags`            | —                                    | 为集成写入的每个文档添加标签，例如 `["project:{gitProject}"]`，见下文**记录记忆来源** |
| `retainMetadata`        | —                                    | 为集成写入的每个文档添加元数据，例如 `{"repo": "{gitProject}"}` |
| `retainContext`         | 见说明 | 每次会话回写发送的 `context`。提取过程读取它来确定句子是谁的说法，因此默认点明双方说话者，要求将智能体自己声称的“已修复”或“通过”存为其说法，而非事实。接受与 `retainTags` 相同的 `{placeholder}` 模板 |
| `manageBankConfig`      | `true`                               | 允许插件配置记忆库：写入所用的存储策略、`knowledge` 实体标签组，以及尚未设置的任务目标。写入是**增补式**的：只添加库未定义的内容，绝不覆盖现有值，因此控制平面编辑保留。唯一例外是插件自身策略的提取模式，遵循 `retainExtractionMode`。设为 `false` 可完全停止管理库配置，见下文**自行配置记忆库** |
| `retainExtractionMode`  | `"concise"`                          | 服务器从会话、提交和文档提取记忆的方式：`"concise"`、`"verbose"`、`"verbatim"` 或 `"chunks"`（直接存储文本，不提取）。每次 Stop 都回写会话，因此决定每轮成本；`"verbose"` 提取更多细节，消耗数倍 token。每个会话同步插件自己的存储策略，因此修改也影响现有记忆库（`manageBankConfig: false` 时除外） |
| `defaultBankConfig`     | —                                    | 为插件管理的记忆库提供自定义配置字段，例如 `{"enable_observations": false, "enable_auto_consolidation": false, "mental_model_min_refresh_interval_seconds": 21600}`。键使用记忆库配置 API 自身的字段名。同样遵循增补规则，仅在库未定义字段时写入，因此插件创建的库会采用这些值而非服务器默认值，控制平面设置永不被覆盖。与模板同名的键（`enable_observations`）优先采用此值；拒绝 `retain_strategies`、`entity_labels` 和 `retain_extraction_mode`，因为这些由插件管理。`manageBankConfig: false` 时忽略，见下文**自行配置记忆库**。与 `recallOptions` 相同，仅文件配置；在 `banks.<id>` 中替换全局映射，而非合并 |
| `observationScopes`     | `"shared"`                           | 整合如何分组观察：`"shared"`（默认）= 每库一个全局范围，使仓库上的所有智能体构建一套信念；也支持 `"combined"`（服务器默认）、`"per_tag"`、`"all_combinations"`、`[["t"]]`；`"per_source"` 在全局范围之外为每种 `source:` 增加范围，让提交知识和对话知识分开整合 |
| `disabled`              | `false`                              | 彻底关闭开关（插件/钩子不启用，形成无记忆基线） |
| `reflectTimeoutMs`      | `20000`                              | **自动**会话反思超时；基于钩子的运行环境会注册 30 秒提示词钩子超时，因此超过约 20 秒时，还需提高宿主配置中的钩子 `timeout`，否则宿主会在反思中途终止钩子。超时或 5xx 时回退到知识页面搜索，再原始召回观察（记录日志） |
| `reflectToolTimeoutMs`  | `330000`                             | 智能体调用 `hindsight_reflect` 工具的超时：智能体会等待该调用，内容丰富记忆库的高预算综合可能持续数分钟。默认超过服务器自身的反思总时间限制（`HINDSIGHT_API_REFLECT_WALL_TIMEOUT`，300 秒），由服务器决定何时放弃。未设置时会继承显式提高的 `reflectTimeoutMs`，但较短值不会降低它 |
| `injectTimeoutMs`       | `7000`                               | `autoInject: "pages"` 和 `autoInject: "recall"` 的检索超时，单位毫秒；也是反思超时/5xx 后页面搜索再召回的**共享**预算（召回仅获得搜索后剩余时间）。例如设为 `2000` 限制每轮延迟，较慢的自托管库可用 `15000`。环境变量后备：`HINDSIGHT_INJECT_TIMEOUT_MS`。钩子运行环境中，注入必须在宿主提示词钩子超时内完成（默认 30 秒）；带回退的反思要预留 **`reflectTimeoutMs` + `injectTimeoutMs`**，必要时提高宿主钩子的 `timeout` |
| `reflectBudget`         | `"high"`                             | `hindsight_reflect` 工具的反思预算：`"low"`、`"mid"` 或 `"high"`。大记忆库的高预算综合超过服务器总时间限制时可降低。自动会话启动反思始终使用 `"low"` 以适应钩子时间窗口，不受此设置影响 |
| `autoInject`            | `"reflect"`                          | 在会话**第一个提示词**时注入一次的内容：`"reflect"` = 低预算反思综合（超时/5xx 时回退到页面搜索，再召回）；`"pages"` = 搜索匹配提示词的知识页面；`"recall"` = 针对提示词召回库中记忆（由 `recallOptions` 指定，默认观察）；`"none"` = 不注入，智能体先搜索知识页面，仅页面信息不足时反思。`"pages"` 和 `"recall"` 仅检索、不调用 LLM，时间预算为 `injectTimeoutMs` |
| `autoReflect`           | `true`                               | **已弃用**，请使用 `autoInject`。仍兼容（`false` = `autoInject: "none"`），设置 `autoInject` 时忽略，并记录弃用警告 |
| `pageSearchLimit`       | `3`                                  | 一次搜索返回的知识页面数。作用于库的所有搜索：`autoInject: "pages"` 注入、反思回退，以及智能体自己的 `hindsight_search_knowledge_pages` 工具，因为限制位于它们共享的客户端中 |
| `recallOptions`         | 见说明 | 逐键合并到每次召回请求体中的覆盖值，影响 `autoInject: "recall"` 和反思回退。键直接使用 API 召回参数，原样传入，因此无需新增选项就可设置召回接受的任何参数；唯一不可覆盖字段为 `query`。默认请求体是 `{"types": ["observation"], "budget": "low", "max_tokens": 2000, "include": {"entities": null}}`，逐键合并设置；`{"max_tokens": 4000}` 改变预算并保留其余项。观察是整合层，每 token 的回答价值最高，但**禁用整合的库不会生成观察**，默认召回结果为空：此类库设为 `{"types": ["world", "experience"]}`，或使用 `{"types": null}` 获取所有类型。与 `retainMetadata` 相同，仅文件配置；对象无法扁平化为环境变量 |
| `toolGuideExtra`        | —                                    | 自定义智能体使用记忆的指导，在内置工具指南**之后**添加（会话启动及每次刷新时），也添加到 `hindsight_search_knowledge_pages` 结果的来源说明之后。只增补内置文本，不替换。与其他键一样可按运行环境或记忆库设置，例如“记忆是过去的记录，并非当前状态：采取行动前，请根据代码核实任何说法。” |
| `pageRefreshEveryTurns` | `10`                                 | 每 N 个用户轮次重新获取知识页面，并重新注入页面列表及工具指南 |
| `pageTriggerType`       | `"cron"`                             | 新知识页面何时刷新，即保持最新的成本：`"cron"`（默认）仅按 `pageTriggerCron`，且确实过时时刷新；`"auto-refresh"` 在每次生成新材料的整合后刷新；`"manual"` 从不自行刷新。自动刷新最及时，也最昂贵：每次整合每个页面一次综合。对应 Hindsight API 的页面 `trigger.refresh_cron`，或 `trigger.refresh_after_consolidation`（自动刷新为 `true`，手动为 `false`） |
| `pageTriggerCron`       | `"H * * * *"`                        | `pageTriggerType: "cron"` 的调度，使用 UTC、标准 5 字段 cron，例如 `"0 3 * * *"`。默认每小时执行，每个页面使用自己的哈希分钟。设置页面的 `trigger.refresh_cron`，API 将其与 `refresh_after_consolidation` 视为互斥；无变化时跳过调度刷新。将字段写为 `H`，可为各页面分配独立值，见下文**使用 `H` 分散刷新** |
| `pages`                 | 所有页面 | 初始化知识页面的逐页面配置，键为页面名称（不区分大小写）：`false` 完全跳过页面，`{"source_query": "..."}` 使用你的问题而非内置问题初始化。省略时全部五页采用内置查询。这是自定义页面措辞的受支持方式：插件会重新同步实际查询与配置不一致的页面，因此通过 API 或控制平面编辑的查询会在下次会话被替换。跳过页面**不会删除**已有页面：保留内容，停止重新同步。你的查询也会附加范围限定条款，防止改写后的页面将依赖项决策当成当前项目决策。与 `recallOptions` 相同，仅文件配置；`banks.<id>` 中替换全局映射，而非合并 |
| `customPages`           | —                                    | 自定义知识页面，与上面五页一起初始化，以页面名称为键：`{"Security posture": {"source_query": "...", "tags": ["knowledge:decision"]}}`。`source_query` 必需；`tags` 可选，用于选择提供给页面的事实，省略时使用库内全部内容。有意独立于 `pages`，让该处未知名称保持为拼写警告，而非静默创建页面。仅文件配置，在 `banks.<id>` 中替换而非合并 |
| `autoSeed`              | `true`                               | SessionStart：根据 git 历史自动初始化尚未使用仓库的记忆库 |
| `seedLimit`             | `300`                                | 自动初始化：最近 N 次提交上限 |
| `codebaseSurvey`        | `true`                               | SessionStart：对尚未使用仓库结构进行无界面调查，通过当前运行环境自己的 CLI（claude/codex/antigravity/opencode）运行，回退到任意可用智能体 |
| `surveyModel`           | `haiku`                              | 调查模型，仅适用于 Claude 方案（`claude -p --model`）；其他智能体使用其配置的默认模型 |
| `surveyBudgetUsd`       | `2`                                  | 调查费用上限，仅适用于 Claude 方案（`claude -p --max-budget-usd`）；其他智能体依靠只读沙箱 |
| `surveyRefreshCommits`  | `20`                                 | 距上次调查累积这么多提交后，在 SessionStart 重新调查，让结构页面跟踪持续变化的架构（`0` = 仅调查首次使用的仓库，之后不再调查） |
| `retainSessions`        | `true`                               | 会话回写，所有运行环境均遵循：钩子运行环境在 Stop 写入记录，Factory Droid 也在取消通知时写入；插件运行环境（opencode、opencode 2、Kilo）每轮更新插入，并在空闲时刷新，以捕获逐轮处理看不到的回答。全局、按运行环境或按库设为 `false` 可停止写入记录（后台历史导入也停止），召回、git 导入和记忆工具仍可使用 |
| `maxParallelRetains`    | `10`                                 | 记忆存储相关并发请求上限：drain() 的逐操作轮询以及 deepen 的聊天/git 存储池。API 限制的是突发流量而非单个请求；出现 429 时应降低而非提高 |
| `logLevel`              | `"info"`                             | 插件日志详细程度（`"debug"` \| `"info"` \| `"warn"` \| `"error"`）；`HINDSIGHT_LOG_LEVEL` 环境变量优先 |
| `autoUpdate`            | `true`                               | 自动保持已安装运行时最新：每天一次，会话启动时查询 npm 发布版本，较新时在后台更新 `~/.hindsight/coding-agents`。不更改宿主接入配置，因此新增钩子入口的发布仍需手动 `install`。设为 `false` 可固定版本；`disabled` 也会停止更新，因为未启用插件应保持静止。只替换按文档通过 `npx` 安装的运行时；`npm i -g` 安装、作为项目依赖嵌入或由检出目录构建的副本由其管理者按原安装方式更新。需要 PATH 中有 `npx` 和 `npm` |
| `gitIngest`             | `"message"`                          | 初始化和持续更新的 git 深度（同一引擎）：`"message"` = 仅提交消息（一个文档，HEAD 新增未包含提交时重新更新插入）；`"full"` = 消息 + 每次提交的完整差异（渐进处理，最新优先）；`"none"` = 关闭 git |
| `harnesses.<name>`      | —                                    | 按运行环境覆盖上述任意字段 |
| `harness`               | `opencode`                           | **仅 deepen 引擎**：`--conversations` 应按哪种会话格式读取 |

默认页面**每小时错峰刷新**：`pageTriggerCron` 为 `"H * * * *"`，每个页面在一小时内获得自己的分钟（见下文），没有新内容可合并时，服务器会跳过该次调度。这样页面与仓库状态的差距不超过一小时，也无需支付自动刷新的成本：持续整合的仓库中，每次整合每个页面都要进行一次 LLM 综合。设置 `pageTriggerType: "auto-refresh"` 可恢复每次整合后刷新。

`pageTriggerType`/`pageTriggerCron` 仅决定页面**何时**刷新。**如何**刷新由服务器决定：Hindsight 创建的知识页面采用增量刷新（每次编辑页面而非重建），不对同级页面进行反思。这些设置合并到默认值之上，而非替换它们。

### 使用 `H` 分散刷新 {#spreading-refreshes-with-h}

所有使用此插件的仓库和页面共享同一个 `pageTriggerCron`。因此字面值 `"0 3 * * *"` 并非只在 03:00 调度*一次*刷新，而是把**所有**刷新都安排在 03:00：每个记忆库五个页面，使用与记忆存储相同的工作进程池。03:0x 导入的会话会排在这批任务之后，换个小时只是把集中负载挪到别处。

将某个字段写成 `H`，插件会逐页面根据记忆库 ID 和页面名称哈希得到值并替换。每个页面都有自己的时间槽，且每次运行相同：

| `pageTriggerCron`  | 每个页面的调度 |
| ------------------ | ------------------------------------------------------ |
| `"H H * * *"`      | 每天一次，各自的小时和分钟 |
| `"H * * * *"`      | 每小时一次，各自的分钟 |
| `"H 3 * * *"`      | 每天 03:MM，在所选小时内分散 |
| `"H H(0-5) * * *"` | 每天一次，仅在 00:00–05:59 内分散 |
| `"0 3 * * *"`      | 无 `H`，无哈希，严格按表达式同时运行 |

`H` 是 [Jenkins 的语法](https://www.jenkins.io/doc/book/pipeline/syntax/#cron-syntax)，用于解决相同问题。它不会传到 API：插件创建页面时先解析为普通 cron 表达式（`"41 17 * * *"`），因此控制平面中看到的是可以编辑的常规调度。哈希只是分散页面，并不保证各自时间互斥；两个页面仍可能落在同一分钟，但不会所有页面同时运行。

**这些设置也适用于仓库已有的页面。** 每次会话都会将此插件创建的页面——初始化的分类页面及所有捕获的工作计划——与配置比较，并重新同步有差异的页面。因此在默认值变化前初始化的记忆库会自行切换为每小时调度；在控制平面手动更改触发方式的页面，也会在下次智能体运行时恢复为配置策略。配置文件是这些页面的权威来源：要使用不同调度，请修改 `pageTriggerType`/`pageTriggerCron`（仅影响某仓库时使用记忆库级配置），而非编辑页面。只操作插件声明的字段，页面的 `mode`、排除的同级页面和最小刷新间隔保持原样。

### 自定义知识页面 — `pages` {#customize-knowledge-pages--pages}

每个仓库默认都有相同的五个页面。它们是**知识分类体系**，而非源码摘要：每页综合记忆库导入的提交历史和以往对话，并绑定某个知识层级，因此只使用提取器路由到该层级的事实。

| 页面 | 回答的问题 | 层级标签 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| `Component map`（组件图谱） | 主要组件/模块/子系统、各自职责及依赖关系 | `knowledge:component` |
| `Core concepts`（核心概念） | 领域抽象和关键实体，即开发者必须掌握的词汇 | `knowledge:concept` |
| `Conventions and patterns`（约定与模式） | 当前项目的做事方式：测试、错误处理、命名、结构、如何更改 | `knowledge:convention` |
| `Key decisions and rationale`（关键决策及依据） | 重要技术决策，以及长期有效的“为何这样做” | `knowledge:decision` |
| `Initiatives and enhancements`（工作计划与增强） | 历来的主要工作计划和功能，链接到每个已捕获计划的独立页面 | `knowledge:feature-work` |

`pages` 指定初始化哪些页面，以及各页面提出什么问题。键是上述页面名称，匹配时忽略大小写和首尾空格：

```jsonc
{
  "pages": {
    // 完全不初始化这个页面
    "Component map": false,
    // 初始化，但使用你的问题而非内置问题
    "Key decisions and rationale": {
      "source_query": "我们对数据保留、加密和 PII 处理作出了哪些决定，为什么？优先考虑约束新代码行为的决策。",
    },
  },
}
```

完全省略 `pages`（默认行为），则全部五页使用内置查询初始化。

**减少页面数量。** 每页每次刷新需要一次 LLM 综合，因此只需要架构页面的仓库可以关闭其他页面：

```jsonc
{
  "pages": {
    "Initiatives and enhancements": false,
    "Conventions and patterns": false,
    "Key decisions and rationale": false,
  },
}
```

与其他字段一样，可以**按仓库**设置，通常也应该如此，因为页面应提出什么问题属于项目属性，而非机器属性：

```jsonc
{
  "banks": {
    "coding-agent::payments-api": {
      "pages": {
        "Core concepts": {
          "source_query": "支付领域包含哪些实体——订单、账本、结算状态——它们在我们的模型中各自意味着什么？",
        },
      },
    },
  },
}
```

使用前需要了解四点：

- **这是持久修改页面措辞的唯一方式。** 每个会话将初始化页面与配置查询比较并重新同步差异，因此通过 API 或控制平面编辑的 `source_query` 会在下次智能体运行时被替换。此处设置的措辞才是配置值。重新同步替换查询时，插件会在日志中说明是哪一页，不会静默处理。
- **自定义查询仍附加范围限定条款。** 防止依赖项决策出现在项目页面的句子也会附加到自定义查询；库中含有仓库使用的库和服务的事实，没有此条款就会将它们当成你的项目知识。
- **层级标签仍遵循分类体系。** 它决定综合过程读取哪些事实；改写问题改变的是如何询问这些事实，而非事实范围。
- **`false` 不删除任何内容。** 已初始化页面保留内容，只是停止重新同步；想删除时请在控制平面移除。

不匹配上述任何页面的名称会被忽略，并在插件日志记录警告，让拼写错误明确暴露，而非看起来像禁用了页面。此设置不用于添加自定义页面：智能体的 `hindsight_capture_initiative` 工具已会为每个工作计划创建独立查询的页面。

#### 自定义页面 — `customPages` {#pages-of-your-own--custompages}

`pages` 仅调整上面的五页。要添加页面，请在 `customPages` 下命名：

```jsonc
{
  "customPages": {
    "Security posture": {
      "source_query": "当前项目有哪些安全决策——身份验证、机密信息处理、PII、依赖策略——它们对新代码有什么约束？",
      "tags": ["knowledge:decision"],
    },
    "Operational runbook": {
      "source_query": "此项目如何部署、监控和回滚？生产环境出过什么故障，如何修复？",
    },
  },
}
```

`source_query` 必需。`tags` 可选，决定哪些事实用于页面：可使用上述层级标签，或通过 `retainTags` 为写入内容添加的任何标签。省略时使用库中全部内容：刷新采用 `all` 匹配标签，因此无标签表示无标签约束，**并非**空页面。

自定义页面与分类页面在相同根节点初始化，使用相同刷新调度，并同样从配置重新同步；在此改写，实际页面在下次会话跟随更新。它们与 `pages` 配合使用，因此可以同时关闭两个内置页面并添加一个自定义页面。

**为何使用独立设置。** `pages` 拒绝不匹配任何初始化页面的名称，因此拼写错误会明确暴露。如果未知键表示“创建页面”，`"Componnet map"` 就会悄悄创建第二个空页，而非修改目标页面。同理，`customPages` 拒绝已初始化页面的名称；应在 `pages` 下改写它。

自己在控制平面创建的页面属于第三类，插件绝不操作它们：初始化过程仅访问配置为自己管理的页面。

### 自行配置记忆库 — `manageBankConfig` {#a-bank-you-shape-yourself--managebankconfig}

连接记忆库后，插件会配置导入所需结构：为它写入的文档种类（`git`、`gitlog`、`conversation`、`document`、`survey`）设置记忆存储策略，添加将事实路由到知识页面的 `knowledge` 实体标签组，并在库尚无任务目标时添加编程任务目标。

**它只添加缺失内容。** 自己定义的策略、对插件策略的修改、改写后的标签组、在控制平面重写的任务目标，每次会话都会永远原样保留。记忆库已有配置优先。代价是：插件发布中对现有策略或标签的*改写*，不会应用到已拥有这些条目的库。要恢复当前默认值，请清除库上的覆盖设置（在控制平面删除该策略或整个 `retain_strategies` 条目）；下次会话发现该处未定义，就会重新初始化。

一个字段例外：插件自己的四种策略（`git`、`gitlog`、`conversation`、`document`）的提取模式遵循 `retainExtractionMode`。每次会话发现偏离都会恢复，与初始化页面的查询一样。请在 `coding-agent.json` 修改，而非控制平面。策略其他字段和自定义策略仍保持原样。

**新记忆库的自定义默认值 — `defaultBankConfig`。** 模板未指明的字段由服务器提供：自动整合开启、观察开启、心智模型刷新间隔下限 60 秒。每个仓库一个记忆库时，这些设置会产生费用；智能体接触新仓库就会创建一个全部开启的新库，而在控制平面手动调整过的库已有较低成本的基线。`defaultBankConfig` 在插件配置中统一声明基线，并随创建记忆库的同一次导入传入：

```json
{
  "defaultBankConfig": {
    "enable_observations": false,
    "enable_auto_consolidation": false,
    "mental_model_min_refresh_interval_seconds": 21600
  }
}
```

键直接使用记忆库配置 API 字段名并原样传入，因此 API 接受的内容都可以放在这里。与模板一样遵循增补规则，只在库未定义时写入，所以现有库在下次会话会采用它们，**已设置的字段除外**：控制平面选择的值即使等于服务器默认值也保持不变，旧插件版本初始化的值同样保留（模板会随任务目标写入 `enable_observations: true`；清除库中的覆盖值，才能采用你的默认值）。与模板同名的键以自定义默认值优先。插件自行管理的三个字段——`retain_strategies`、`entity_labels` 和 `retain_extraction_mode`——会被拒绝并警告：前两者逐条合并，后者属于 `retainExtractionMode`。

设置 `manageBankConfig: false` 可让插件完全不操作库配置，包括 `defaultBankConfig`。适用于与非编程工作共享的库，或自行配置的库。此时库需要自行定义上述五种策略。缺少策略会**静默回退**：服务器不会拒绝指定了不存在策略的记忆存储请求，而是记录警告并使用库自身配置提取。因此提交差异、会话记录和调查标记会受到相同通用处理，而非各自所需的提取方式。两种情况下都会初始化知识页面；`pageTriggerType` 决定其成本。

与此处所有字段一样，可以按记忆库设置，通常也应该这样做：

```json
{
  "bankId": "my-global-bank",
  "banks": { "my-global-bank": { "manageBankConfig": false } }
}
```

### 仓库级启用/禁用 — `banks.<bankId>` {#per-repo-opt-inout--banksbankid}

仓库级控制位于同一个文件，以**解析后的记忆库 ID**（会话提示中显示）为键，在记忆库解析后应用。因此不依赖仓库位置，移动目录后仍有效：

```jsonc
{
  "banks": {
    "coding-agent::secret-client": { "disabled": true }, // 禁用列表：完全不使用记忆
    "coding-agent::old-name": { "bank": "team::shared" }, // 重命名 / 汇合记忆库
    "coding-agent::big-mono": { "gitIngest": "full", "retainSessions": false },
  },
}
```

任何行为字段都可以按记忆库覆盖，`bank` 会**重命名目标**（单跳：按解析后的 ID 选择配置部分，目标按字面值使用；多个 ID 可汇合到同一个共享库，不再读取目标库自己的配置部分）。记忆库配置部分中的其他库解析字段会被忽略。

#### 示例：两个仓库，一个共享记忆库 {#recipe-two-repos-one-shared-bank}

根据自然键的不同，有两种方式：

**按解析后的 ID**：已知仓库名称时使用，无论仓库位于何处都有效，移动后仍有效。两个 ID 汇合到一个字面目标：

```jsonc
{
  "banks": {
    "coding-agent::backend": { "bank": "team::product" },
    "coding-agent::frontend": { "bank": "team::product" },
  },
}
```

**按路径前缀**：仓库都位于一个目录下时，一条 `mapPathToBank` 即可覆盖该目录下现有及未来的每个仓库：

```jsonc
{
  "mapPathToBank": { "/Users/me/work/client-x": "client-x-memory" },
}
```

经验规则：人工选择的一组仓库按 **ID** 汇合；文件夹构成边界时按**路径**映射（“克隆到 `work/client-x` 下的所有内容共享记忆”）。

### 目录级覆盖 — `paths.<prefix>` {#per-directory-overrides--pathsprefix}

文件夹作为记忆库之外其他设置的边界时（通常为客户工作使用不同服务器或租户），请按目录而非记忆库 ID 设置覆盖：

```jsonc
{
  "apiToken": "personal-key",
  "paths": {
    "~/work/client-x": { "apiToken": "client-x-key" },
    "~/work/acme": { "apiUrl": "https://hindsight.acme.internal", "apiToken": "acme-key" },
    "~/oss": { "serverMode": "daemon" },
  },
}
```

该前缀下现有及未来的每个仓库都保留自己的记忆库，但使用条目中的设置。最长匹配前缀优先，目录树之外的关联工作树使用主检出目录的条目，与 `mapPathToBank` 相同。此配置在记忆库解析后、`banks.<bankId>` 之前应用，因此记忆库配置对自身仓库仍优先。库解析和许可字段（`bankId`、`mapPathToBank`、`bank`、`optInOnly`、`optInPaths` 等）在路径部分被忽略。所有连接设置均可覆盖：`serverMode`、`apiUrl`、`apiPort`、`apiToken`，因此一个目录可使用本地守护进程，另一个可用 Cloud 或自托管服务器。与顶层 `apiToken` 一样，请求被拒绝时会重新读取令牌，但仅在目录仍指向同一服务器时如此。

### 记忆库解析 {#bank-resolution}

编程记忆**按仓库划分**。工作目录的解析顺序：

1. `mapPathToBank`：最长匹配绝对路径前缀（映射仓库根目录覆盖所有子目录；更深映射优先，甚至覆盖显式 `bankId`）。
2. 静态：已设置 `bankId`（或 `dynamicBankId: false`）。
3. 动态：`bankIdTemplate` 使用占位符：
   - `{gitProject}`：支持工作树的仓库名。`git rev-parse --git-common-dir` 将每个关联工作树解析为**主**工作树目录名，因此同一仓库所有工作树共享一个库（裸仓库使用裸目录名）。**仓库之外**没有 git 可解析的内容，因此回退到**会话启动目录**的目录名：智能体 `cd` 到子目录后仍写入同一个库；只有明确从子目录启动会话，子目录才拥有独立库。
   - `{project}`：普通工作目录名。
   - `{harness}`：发起请求的入口（`opencode`、`claude-code`、`codex`、`antigravity-cli`、`cursor-cli`、`copilot-cli`）。
   - `{channel}` / `{user}`：`$HINDSIGHT_CHANNEL_ID` / `$HINDSIGHT_USER_ID`。

默认 `"coding-agent::{gitProject}"` **不区分运行环境**，因此 opencode、Claude Code 和 Codex 在每个仓库共享一个记忆库。要按智能体拆分，使用 `"{harness}-{gitProject}"`。

### 记录记忆来源 {#recording-where-a-memory-came-from}

每个仓库一个记忆库时，库本身就是“来自哪里”的答案。刻意使用**共享**库时则不是：一个库保存跨项目知识，让事实可在任何地方召回，每条记忆看起来都一样。`retainTags` 和 `retainMetadata` 为对话、git 历史和差异、调查生命周期文档、工作计划标记，以及通过 `hindsight_ingest_document` 保存的文档添加来源：

```jsonc
{
  "bankId": "shared", // 所有内容使用一个记忆库
  "retainTags": ["project:{gitProject}", "env:work"],
  "retainMetadata": { "repo": "{gitProject}" },
}
```

之后召回可按 `project:<repo>` 过滤，每个文档都显示来自哪个仓库。两者接受与 `bankIdTemplate` 相同的占位符：`{gitProject}`、`{project}`、`{harness}`、`{channel}`、`{user}`，还支持 `{bankId}`、`{sessionId}` 和 `{timestamp}`。这里的 `{gitProject}` 也支持工作树，同一仓库的所有关联工作树标记相同名称。不来自智能体会话的文档，其 `{sessionId}` 解析为 `unknown`。

插件自身的 `source:` 和 `harness:` 标签为保留项。这些命名空间中的自定义条目会被忽略并警告，确保文档的智能体归属始终反映实际写入者。

### 每个仓库一套信念 {#one-set-of-beliefs-per-repo}

此集成写入的每个文档都携带来源标签：`source:chat`、`harness:<id>`、`knowledge:<kind>`，以及 `retainTags` 添加的所有标签。它们说明记忆由**谁写入**，用于过滤召回、显示文档智能体标志，并保留在事实上。

但它们并非[观察](/developer/observations)的合适边界。整合默认值 `combined` 为每组不同标签构建一套观察，因此两个智能体在同一仓库工作会产生两套平行信念：按运行环境分开、永不合并、互相不可见，整合成本翻倍。由哪个智能体输入，不会改变约定或决策是否成立。

因此集成使用 `observationScopes: "shared"` 存储：每个库只有一个全局无标签观察范围，这正是记忆库本来的含义——一个项目的记忆。可设置此字段更改：

```jsonc
{
  "observationScopes": "combined", // 每组不同标签一套观察（服务器默认）
  "banks": {
    "coding-agent::mono": { "observationScopes": "per_tag" }, // 与所有行为字段一样，可按仓库设置
  },
}
```

### 将代码与对话分开 — `per_source` {#splitting-code-from-conversation--per_source}

`shared` 将仓库生成的所有文档放入同一套信念。`"per_source"` 保留这套信念，同时按来源增加独立集合，从而可以分别询问“提交中说了什么”和“对话中决定了什么”：

```jsonc
{ "observationScopes": "per_source" }
```

每个文档整合到全局范围，**再加上**它携带的每个 `source:` 标签对应的范围：会话记录为 `[[], ["source:chat"]]`，提交差异为 `[[], ["source:git"]]`。使用 `tags: ["source:git"], tags_match: "exact"` 读取某个维度，使用 `tags: [], tags_match: "exact"` 读取合并视图。

携带两个 `source:` 标签的文档会各自获得一个范围，这是有意设计而非重复。提交消息初始文档带 `source:git` 和 `source:git-log`，因此 `source:git-log` 仅接受初始文档，表示提交*消息*的内容；`source:git` 在 `gitIngest: "full"` 下还汇集每次提交差异。两个问题，两个答案，各自在整合时内部去重。事实属于多个维度正是设计目的。

无法用范围列表表达这种行为。服务器将显式 `list[list[str]]` 视为无条件范围，不按记忆自身标签过滤。因此 `[[], ["source:git"], ["source:chat"]]` 会将每个文档写入全部三个范围，`source:git` 中也会充满来自聊天记录的信念。只有逐文档决定范围才能分离。

每个文档多消耗一次整合，只读取 `source:`，因此易变的来源标签永远不会成为范围。仍先写入全局范围，且其内容不变，因此知识页面读取的无标签观察不受影响。

`"per_tag"` 和 `"all_combinations"` 会进一步拆分，显式 `[["project:demo"], …]` 则按字面声明范围。`HINDSIGHT_OBSERVATION_SCOPES` 设置标量模式，范围列表只能通过文件配置。更改不会重写旧范围下已整合的观察：它们保留在原处，新工作按新设置累积。

## 诊断与日志 {#diagnostics--logging}

所有日志位于 `~/.hindsight/coding-agents-logs/`（仅所有者可访问）。每个文件达到 10 MB 时轮转为 `<file>.1`。

**分级插件日志**（供人工调试）：`~/.hindsight/coding-agents-logs/plugin.log`（通过 `HINDSIGHT_LOG_FILE` 覆盖），包含各组件（包括导入引擎）带时间戳的 `LEVEL [scope] message` 行。默认级别为 `info`；临时调试可在配置设置 `"logLevel": "debug"` 或 `HINDSIGHT_LOG_LEVEL=debug`（`debug` 时下文所有诊断事件也会镜像到此，因此一个文件即可了解完整过程）。

**结构化诊断事件**（供机器/运行环境使用）：每次反思和页面获取结果以一行 JSON 追加到 `~/.hindsight/coding-agents-logs/diag.jsonl`（通过 `HINDSIGHT_DIAG_FILE` 覆盖）：

```json
{
  "ts": "2026-07-27T07:05:52Z",
  "harness": "claude-code",
  "event": "reflect_ok",
  "ms": 14210,
  "chars": 792,
  "query": "..."
}
```

`reflect_failed` / `pages_failed` 记录错误；比较启用与禁用记忆时请查看此文件：反思失败的运行实际相当于无记忆。超时或 5xx 时，钩子回退到知识页面搜索；没有页面匹配时，再原始召回库中记忆。`reflect_fallback_pages` / `reflect_fallback_observations` 记录每一步返回内容（报错时为 `*_failed`）。初始化开始记录为 `seed_started`。

`autoInject` 指定检索来源而非反思时，该来源会记录自身结果及返回条目数：`"pages"` 使用 `inject_pages`，`"recall"` 使用 `inject_recall`（报错时为 `inject_pages_failed` / `inject_recall_failed`）。这些轮次不写反思事件，因为没有执行反思。

**工具使用情况**（智能体是否使用 Hindsight）：每个已完成用户轮次在 `~/.hindsight/coding-agents-logs/usage.jsonl` 写入一行 JSON（通过 `HINDSIGHT_USAGE_FILE` 覆盖），记录该轮调用的 `hindsight_*` 工具，以及回答是否注明来自 Hindsight 记忆（“From Hindsight memory”）。来源标注率只统计调用了检索工具（搜索、列出、读取、反思）的轮次；保存文档不要求注明来源。会话回写时记录，因此 `retainSessions: false` 范围不记录任何条目。数据始终保留在本机。按智能体汇总：

```bash
npx @vectorize-io/hindsight-coding-agents stats
```

### 记忆是否已就绪？ {#is-the-memory-ready-yet}

面向智能体的工具 `hindsight_sync_status`（脚本使用 `dist/status.js`）专门回答这个问题：`"synced": true` 表示初始化的记忆已可查询。它还报告 gitlog 新鲜度、逐提交深化进度、代码库调查状态（`surveyBaseline` 是上次调查起点的 HEAD，`surveyDocs` 统计已到达的发现文档数，0–4；没有发现的基线会自动重试），以及仍在执行的提取操作。

### 重置仓库记忆 {#resetting-a-repos-memory}

在服务器上删除记忆库即可。库是此集成保留的**唯一**状态，因此下次该仓库会话就是真正首次打开：初始化和调查从头运行。无需清理任何客户端文件。

### 可能看到的标记文档 {#marker-documents-you-may-notice}

两个文档 ID 用于内部记录。两者均可安全忽略或删除：

- `survey-baseline:<sha>`：代码库调查运行时显示“🛰️ researching…”（研究中），发现到达后变为“✅ completed”（已完成）。使用 `survey` 策略存储，其标记规则从状态标记中**不提取任何内容**。它控制重新调查频率（`surveyRefreshCommits`），并提供同步状态中的 `surveyBaseline`。
- `gitlog:<repo>`：聚合提交消息的初始文档，初始化再次运行时重新更新插入，不产生重复。

### 感觉记忆缺失时 {#when-memory-seems-to-be-missing}

故障不会中断智能体：反思、页面获取或记忆存储失败时，会降级为普通无记忆轮次，并记录日志。因此“没有记忆”应通过日志排查：查看诊断文件中该库是否触发过 `session_start` 和 `deepen_started`。安装插件时已运行的会话没有经历 SessionStart；安装后的第一个提示词会自行恢复。
