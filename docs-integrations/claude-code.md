---
sidebar_position: 5
title: "使用 Hindsight 为 Claude Code 添加持久记忆 | 集成"
description: "使用 Hindsight 为 Claude Code 添加长期记忆。通过 Claude Code 基于钩子的架构自动捕获对话，并跨会话召回相关上下文。"
---

# Claude Code

:::warning 已由 Coding Agents 插件取代
**Claude Code 插件**已由 [编码智能体插件](/sdks/integrations/coding-agents)取代。一个软件包覆盖 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，为每个仓库提供所有智能体共享的记忆库，而不是每个智能体一个记忆库。

本页面及已发布的软件包仍可使用，但不再开发。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install claude-code --import-conversations
```

只有两项内容迁移，其他设置不会迁移。

**服务器配置自动迁移。** `install` 读取 `~/.hindsight/claude-code.json`，保留相同的 `apiUrl` 和令牌；空 URL 仍代表本地守护进程，不会在未告知的情况下切换到 Hindsight Cloud。需要更改时传入 `--server`。

**对话通过 `--import-conversations` 从本地记录重新导入**为新文档，不会从旧记忆库复制。旧记忆库默认由所有项目共享，文档仅记录会话 ID，因此要确定哪些对话属于当前仓库，本来就需要读取本地记录。

**其他内容不会迁移。** 旧的 `recall*`、`retain*` 设置、任务目标和记忆库命名选项描述的是已被此软件包替换的流水线。记忆库命名也会变化：每个仓库一个记忆库，由所有智能体共享。参见[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


通过 [Hindsight](https://vectorize.io/hindsight) 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 提供仿生长期记忆。自动捕获对话、召回相关上下文，并提供知识工具和创建子智能体的技能，让 Claude 能读写自己的记忆。

[查看更新日志 →](/changelog/integrations/claude-code)

:::tip 同样适用于 Grok Build
Grok Build 由 [编码智能体插件](/sdks/integrations/coding-agents#-grok-build)安装。
:::

## 快速入门 {#quick-start}

```bash
# 1. 添加 Hindsight 插件市场并安装插件
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory

# 2. 配置用于记忆提取的 LLM 提供方
# 方案 A：OpenAI（自动检测）
export OPENAI_API_KEY="sk-your-key"

# 方案 B：Anthropic（自动检测）
export ANTHROPIC_API_KEY="your-key"

# 方案 C：无需 API 密钥（使用 Claude Code 自身模型，仅限个人/本地使用）
export HINDSIGHT_LLM_PROVIDER=claude-code

# 方案 D：连接外部 Hindsight 服务器，而非本地运行
mkdir -p ~/.hindsight
echo '{"hindsightApiUrl": "https://your-hindsight-server.com"}' > ~/.hindsight/claude-code.json

# 3. 启动 Claude Code，插件会自动启用
claude
```

配置完成！插件会自动开始捕获和召回记忆。

## 功能 {#features}

- **自动召回** — 每次用户提交提示词时，查询 Hindsight 并将相关记忆注入上下文（聊天记录中不可见，Claude 可见）
- **自动存储** — 每次回答后（或每 N 轮）提取对话内容并存储到 Hindsight，长期保存
- **知识工具** — Claude 通过 MCP 工具读写和搜索自己的记忆（知识页面、召回、导入）
- **子智能体技能** — `/hindsight-memory:create-agent` 创建由独立记忆库支持的子智能体
- **动态记忆库 ID** — 按智能体、项目或会话隔离记忆（每个子智能体有自己的大脑）
- **守护进程管理** — 自动启停本地 `hindsight-embed`，或连接外部 Hindsight 服务器
- **不限定渠道** — 适用于 Claude Code Channels（Telegram、Discord、Slack）及交互式会话

## 架构 {#architecture}

插件结合钩子（自动记忆召回/存储）、MCP 服务器（显式知识工具）和技能（创建子智能体）：

| 组件 | 触发方式 | 用途 |
|-----------|---------|---------|
| `session_start.py` | `SessionStart` 钩子 | 健康检查：确认 Hindsight 可访问 |
| `recall.py` | `UserPromptSubmit` 钩子 | **自动召回**：查询记忆，以 `additionalContext` 注入 |
| `retain.py` | `Stop` 钩子 | **自动存储**：提取对话记录，异步 POST 到 Hindsight |
| `session_end.py` | `SessionEnd` 钩子 | 清理：停止已启动的自动管理守护进程 |
| `mcp_server.py` | MCP 服务器 | 提供 `agent_knowledge_*` 工具：列出/读取/创建/更新/删除页面、召回、导入 |
| `create-agent` | 技能 | 在 `~/.claude/agents/` 创建子智能体文件，并初始化其记忆库 |

首次运行时，Python 依赖（`mcp`）会初始化到 `${CLAUDE_PLUGIN_DATA}/venv` 下的专用虚拟环境。不需要全局 pip 安装，与插件隔离，插件更新后仍保留。

## 连接模式 {#connection-modes}

### 1. 外部 API（生产环境推荐） {#1-external-api-recommended-for-production}

连接运行中的 Hindsight 服务器（云端或自托管）。无需本地 LLM，服务器负责事实提取。

```json
{
  "hindsightApiUrl": "https://your-hindsight-server.com",
  "hindsightApiToken": "your-token"
}
```

### 2. 本地守护进程（自动管理） {#2-local-daemon-auto-managed}

插件通过 `uvx` 自动启停 `hindsight-embed`。本地事实提取需要 LLM 提供方的 API 密钥。

设置 LLM 提供方：
```bash
export OPENAI_API_KEY="sk-your-key"
# 或
export ANTHROPIC_API_KEY="your-key"
# 或
export HINDSIGHT_LLM_PROVIDER=claude-code # 无需 API 密钥
```

Hindsight API 自动选择模型。要覆盖默认值，请设置 `HINDSIGHT_LLM_MODEL`。

### 3. 已有本地服务器 {#3-existing-local-server}

如果已运行 `hindsight-embed`，请将 `hindsightApiUrl` 留空，将 `apiPort` 设置为服务器端口。插件会自动检测。

## 配置 {#configuration}

所有设置位于 `~/.hindsight/claude-code.json`，也可通过环境变量覆盖。插件提供合理的默认值，只需配置希望更改的项目。

**加载顺序**（后加载项优先）：
1. 内置默认值（硬编码在插件中）
2. 插件 `settings.json`（随插件提供，位于 `CLAUDE_PLUGIN_ROOT/settings.json`）
3. 用户配置（`~/.hindsight/claude-code.json`，推荐用于覆盖设置）
4. 环境变量

---

### 连接与守护进程 {#connection--daemon}

以下设置控制插件如何连接 Hindsight API。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `hindsightApiUrl` | `HINDSIGHT_API_URL` | `""`（空） | 外部 Hindsight API 服务器 URL。为空时，插件改用本地守护进程。 |
| `hindsightApiToken` | `HINDSIGHT_API_TOKEN` | `null` | 外部 API 的身份验证令牌。仅设置 `hindsightApiUrl` 时需要。 |
| `apiPort` | `HINDSIGHT_API_PORT` | `9077` | 本地 `hindsight-embed` 守护进程端口。运行多个实例或发生端口冲突时可更改。 |
| `embedVersion` | `HINDSIGHT_EMBED_VERSION` | `"latest"` | 通过 `uvx` 安装的 `hindsight-embed` 版本。固定具体版本（例如 `"0.5.2"`）可保证可重复性。 |
| `embedPackagePath` | `HINDSIGHT_EMBED_PACKAGE_PATH` | `null` | 本地 `hindsight-embed` 检出目录路径。设置后从该路径运行，不通过 `uvx` 安装，适合开发。 |
| `requestTimeoutSeconds` | `HINDSIGHT_REQUEST_TIMEOUT_SECONDS` | `null` | 覆盖记忆召回（默认 `10s`）、记忆存储（默认 `15s`）和知识工具调用（`10–15s`）的逐次请求超时。不设置时保留各调用默认值。自托管 Hindsight 在资源争用（例如并行召回）下正常处理也需要超过 10 秒时，可提高此值，避免服务器成功完成而客户端报告 `read operation timed out`。不影响健康检查，健康检查有意保持快速（5 秒）。 |

---

### LLM 提供方（仅本地守护进程） {#llm-provider-local-daemon-only}

以下设置配置本地守护进程用于事实提取的 LLM。连接外部 API 时会**忽略**这些设置（服务器使用自己的 LLM 配置）。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `llmProvider` | `HINDSIGHT_LLM_PROVIDER` | 自动检测 | 使用的 LLM 提供方。支持：`openai`、`anthropic`、`gemini`、`groq`、`ollama`、`ollama-cloud`、`openai-codex`、`claude-code`。省略时，插件按以下顺序检测 API 密钥环境变量：`OPENAI_API_KEY` → `ANTHROPIC_API_KEY` → `GEMINI_API_KEY` → `GROQ_API_KEY`。 |
| `llmModel` | `HINDSIGHT_LLM_MODEL` | 提供方默认值 | 覆盖所选提供方的默认模型（例如 `"gpt-4o"`、`"claude-sonnet-4-20250514"`）。省略时，Hindsight API 为各提供方选择合理默认模型。 |
| `llmApiKeyEnv` | — | 提供方标准值 | 存储 API 密钥的环境变量名称。通常自动检测（例如 `openai` 使用 `OPENAI_API_KEY`）。仅密钥位于非标准环境变量中时需要设置。 |

---

### 记忆库 {#memory-bank}

**记忆库**是隔离的记忆存储，类似一个独立的“大脑”。以下设置控制插件读写哪个记忆库。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `bankId` | `HINDSIGHT_BANK_ID` | `"claude_code"` | `dynamicBankId` 为 `false` 时使用的记忆库 ID。所有会话共享这个记忆库。 |
| `bankMission` | `HINDSIGHT_BANK_MISSION` | 通用助手提示词 | 简要描述智能体的身份和用途。创建或更新记忆库时发送给 Hindsight，并在召回时为结果提供上下文。 |
| `retainMission` | — | 提取提示词 | 事实提取 LLM 的指令，告诉它从对话中提取*什么*（例如“提取技术决策和用户偏好”）。 |
| `dynamicBankId` | `HINDSIGHT_DYNAMIC_BANK_ID` | `false` | 为 `true` 时，插件根据上下文字段（见 `dynamicBankGranularity`）派生唯一记忆库 ID，为每种组合提供独立记忆。 |
| `dynamicBankGranularity` | — | `["agent", "project"]` | 构造动态记忆库 ID 时组合的上下文字段。可用字段：`agent`（智能体名称）、`project`（工作目录）、`session`（会话 ID）、`channel`（渠道 ID）、`user`（用户 ID）。 |
| `bankIdPrefix` | — | `""` | 添加到所有静态和动态记忆库 ID 前面的字符串。适合区分命名空间（例如 `"prod"` 或 `"staging"`）。 |
| `agentName` | `HINDSIGHT_AGENT_NAME` | `"claude-code"` | 派生动态记忆库 ID 时，`agent` 字段使用的名称。 |
| `resolveWorktrees` | — | `true` | 派生 `project` 字段时，将 git 工作树解析为**主仓库目录名**，使同一仓库的所有工作树共享一个记忆库。设为 `false` 则使用实际工作目录名（每个工作树有自己的记忆库）。 |
| `directoryBankMap` | — | `{}` | 显式 `{ "/path/to/dir": "bank-id" }` 映射。当前工作目录匹配条目时直接使用该记忆库，覆盖静态和动态解析。仍会添加 `bankIdPrefix`。 |

#### 工作树和显式映射 {#worktrees-and-explicit-mapping}

默认情况下，同一仓库的所有 git 工作树共享一个记忆库。例如，主检出目录为 `/home/me/myproject`，工作树为 `/home/me/myproject-wt1` 时，两者均解析为 `project = "myproject"`。因此 `claude-code::myproject` 之类的动态记忆库 ID 在所有工作树中保持一致，避免记忆分散在短期分支中。

若希望每个工作树都有自己的记忆库，请设置 `"resolveWorktrees": false`。

需要完全控制时，使用 `directoryBankMap` 将特定目录固定映射到特定记忆库 ID：

```json
{
  "directoryBankMap": {
    "/home/me/work/client-a": "client-a-memories",
    "/home/me/personal/blog": "blog"
  }
}
```

`cwd` 匹配某个键时，立即使用对应记忆库，不再执行静态或动态解析。未列出的目录使用正常逻辑。

---

### 自动记忆召回 {#auto-recall}

自动召回在每次用户提交提示词时执行。它查询 Hindsight 的相关记忆，并以不可见的 `additionalContext` 注入 Claude 上下文（用户在聊天记录中看不到）。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRecall` | `HINDSIGHT_AUTO_RECALL` | `true` | 自动召回总开关。设为 `false` 可完全禁用记忆检索。 |
| `recallBudget` | `HINDSIGHT_RECALL_BUDGET` | `"mid"` | 控制 Hindsight 搜索记忆的深度。`"low"`：快速、策略较少；`"mid"`：均衡；`"high"`：全面、较慢。直接影响延迟。 |
| `recallMaxTokens` | `HINDSIGHT_RECALL_MAX_TOKENS` | `1024` | 召回记忆块的最大 token 数。较低值减少上下文占用，但可能截断相关记忆。 |
| `recallTypes` | — | `["observation"]` | 要检索的记忆类型。`"world"`：一般事实；`"experience"`：个人经历；`"observation"`：由多个事实构建、经过整合和去重的信念。默认使用观察，避免多条原始记忆表达相同内容时反复呈现同一答案。 |
| `recallContextTurns` | `HINDSIGHT_RECALL_CONTEXT_TURNS` | `1` | 构造召回查询时包含的先前对话轮数。`1`：仅最新用户消息；较高值提供更多上下文，但可能稀释查询重点。 |
| `recallMaxQueryChars` | `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | `800` | 发送给 Hindsight 的查询最大字符数。超长查询会被截断。 |
| `recallRoles` | — | `["user", "assistant"]` | 使用先前对话构造召回查询时包含的消息角色。 |
| `recallPromptPreamble` | — | 内置字符串 | 注入上下文块中放在召回记忆上方的文本。自定义可改变 Claude 解读记忆的方式。 |

---

### 自动记忆存储 {#auto-retain}

自动存储在 Claude 回答后执行，提取对话记录并发送给 Hindsight，进行长期存储和事实提取。

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `autoRetain` | `HINDSIGHT_AUTO_RETAIN` | `true` | 自动存储总开关。设为 `false` 可完全禁用记忆存储。 |
| `retainMode` | `HINDSIGHT_RETAIN_MODE` | `"full-session"` | 存储策略。`"full-session"` 发送完整对话记录（会分块）。 |
| `retainEveryNTurns` | — | `10` | 存储频率。`1`：每轮；`10`：每 10 轮。较高值减少 API 调用，但延迟记忆捕获。大于 1 时启用滑动窗口**分块存储**。 |
| `retainOverlapTurns` | — | `2` | 分块存储触发时，为保持连续性，从前一块额外包含的轮数。窗口总大小 = `retainEveryNTurns + retainOverlapTurns`。 |
| `retainRoles` | — | `["user", "assistant"]` | 存储的对话记录中包含的消息角色。 |
| `retainToolCalls` | — | `true` | 是否在存储的对话记录中包含工具调用（函数调用及结果）。捕获文件读取、搜索和代码编辑等结构化操作。 |
| `retainTags` | — | `["{session_id}"]` | 存储文档附带的标签。支持 `{session_id}` 占位符，运行时替换为当前会话 ID。 |
| `retainMetadata` | — | `{}` | 存储文档附带的任意键值元数据。 |
| `retainContext` | — | `"claude-code"` | 存储记忆附带的来源标签。多个集成写入同一记忆库时很有用。 |

---

### 知识工具 {#knowledge-tools}

插件运行 MCP 服务器，提供 `agent_knowledge_*` 工具，让 Claude 显式读写和搜索记忆库；钩子驱动的召回/存储则完全自动执行。这些工具都不接受 `bank_id` 参数。服务器使用与钩子相同的配置解析当前记忆库，确保工具和钩子始终操作同一个库。

| 工具 | 用途 |
|------|---------|
| `agent_knowledge_get_current_bank` | 报告当前会话绑定的记忆库 ID。 |
| `agent_knowledge_list_pages` | 列出所有知识页面（心智模型）的 ID 和名称。 |
| `agent_knowledge_get_page` | 读取指定页面的完整综合内容。 |
| `agent_knowledge_create_page` | 创建包含 `source_query` 的知识页面，每次整合后重新综合内容。 |
| `agent_knowledge_update_page` | 更新页面名称或 `source_query`。 |
| `agent_knowledge_delete_page` | 永久删除知识页面。 |
| `agent_knowledge_recall` | 在已存储对话和文档中搜索特定事实。 |
| `agent_knowledge_ingest` | 将原始文本内容作为文档上传到记忆库。 |
| `agent_knowledge_ingest_file` | 读取磁盘文件并导入其完整内容。 |

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `enableKnowledgeTools` | `HINDSIGHT_ENABLE_KNOWLEDGE_TOOLS` | `true` | MCP 知识工具总开关。为 `false` 时，MCP 服务器仍以空服务器运行，不提供任何 `agent_knowledge_*` 工具（不会退出，因为退出会在 Claude Code 中触发 `-32000` 重连错误）。 |

---

### 带记忆的子智能体 {#subagents-with-memory}

`/hindsight-memory:create-agent` 技能创建拥有独立 Hindsight 记忆库的 Claude Code 子智能体。每个子智能体的提示词都指示它使用上述知识工具进行召回和导入，使 Claude 将持久记忆视为该智能体的核心能力。

两种模式：

- **从目录创建** — `/hindsight-memory:create-agent <name> from <path>` 导入 `<path>` 下的所有文本文件（`.md`、`.txt`、`.html`、`.json`、`.csv`、`.xml`），创建初始知识页面集，并将子智能体文件写入 `~/.claude/agents/<name>.md`。如果目录包含列出明确 `mental_models` 的 `bank-template.json`，则原样使用这些模型，不自动生成。
- **交互式创建** — `/hindsight-memory:create-agent`（不带参数）询问智能体名称和用途，然后写入子智能体文件，不导入内容。

要按子智能体隔离记忆，请启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"],
  "enableKnowledgeTools": true
}
```

使用 `["agent", "project"]` 时，每个子智能体在每个仓库都有唯一记忆库：`<agent-name>::<project-basename>`。改为 `["agent"]` 可让每个子智能体跨所有项目使用同一记忆库；使用 `["agent", "session"]` 可按会话使用临时记忆库。

---

### 调试 {#debug}

| 设置 | 环境变量 | 默认值 | 说明 |
|---------|---------|---------|-------------|
| `debug` | `HINDSIGHT_DEBUG` | `false` | 启用输出到 stderr 的详细日志。所有日志行以 `[Hindsight]` 为前缀，适合诊断连接问题、召回/存储行为和记忆库 ID 派生过程。 |

## Claude Code Channels {#claude-code-channels}

通过 [Claude Code Channels](https://docs.anthropic.com/en/docs/claude-code)，Claude Code 可以作为持久后台智能体，连接 Telegram、Discord、Slack 等消息平台。此插件为基于渠道的智能体提供长期记忆，能力与 `hindsight-openclaw` 为 Openclaw 智能体提供的记忆相同。

对于渠道智能体，启用动态记忆库 ID，以按渠道/用户隔离记忆：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "channel", "user"]
}
```

通过环境变量设置渠道上下文：

```bash
export HINDSIGHT_CHANNEL_ID="telegram-group-12345"
export HINDSIGHT_USER_ID="user-67890"
```

## 故障排查 {#troubleshooting}

**插件未启用**：检查 Claude Code 日志中的 `[Hindsight]` 消息。在 `~/.hindsight/claude-code.json` 启用 `"debug": true`。

**召回未返回记忆**：确认 Hindsight 服务器可访问（`curl http://localhost:9077/health`）。记忆至少需要经过一次存储周期才可使用。

**守护进程未启动**：确认已设置 LLM API 密钥（或使用 `HINDSIGHT_LLM_PROVIDER=claude-code`）。查看 `~/.hindsight/profiles/claude-code.log` 中的守护进程日志。

**召回延迟高**：召回钩子超时为 12 秒。使用 `recallBudget: "low"` 或降低 `recallMaxTokens`，以加快回答。

**Claude 中缺少知识工具**：确认 `~/.hindsight/claude-code.json` 中的 `enableKnowledgeTools` 为 `true`，然后重启 Claude Code。启用后首次启动需要约 20–30 秒，在 `${CLAUDE_PLUGIN_DATA}/venv` 初始化 Python 虚拟环境；之后可立即启动。
