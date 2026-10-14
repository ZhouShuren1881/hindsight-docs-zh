---
sidebar_position: 4
title: "使用 Hindsight 为 OpenClaw 提供持久记忆 | 插件集成"
description: "使用 Hindsight 为 OpenClaw 智能体添加持久的自动记忆。本地优先、开源：安装一个插件，即可用结构化知识提取和自动召回取代内置记忆。"
---

# OpenClaw {#openclaw}

使用 [Hindsight](https://vectorize.io/hindsight) 为 [OpenClaw](https://openclaw.ai) 智能体提供本地长期记忆。

此插件集成了 [hindsight-embed](https://vectorize.io/hindsight/cli)：一个独立守护进程，可通过单条命令将 Hindsight 记忆引擎（API 和 PostgreSQL）打包运行。所有服务都在本机运行，并复用你已经付费使用的 LLM，不会产生额外费用。

[查看更新日志 →](/changelog/integrations/openclaw)

## 快速入门 {#quick-start}

**步骤 1：安装插件**

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

**步骤 2：运行配置向导**

`openclaw plugins install` 会将插件解压到 `~/.openclaw/extensions/`，
但不会把其中的可执行文件加入 `PATH`。因此请通过 `npx` 运行向导，
它会从已发布的程序包中解析可执行文件：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会引导你从以下三种安装模式中选择一种：

- **云端** — 使用托管版 Hindsight `https://api.hindsight.vectorize.io`。按提示粘贴云端 API 令牌（输入内容会被遮蔽）。无需本地配置。
- **外部 API** — 连接你自己运行的 Hindsight 部署。按提示输入 URL，以及可选的令牌值（输入内容会被遮蔽）。
- **嵌入式守护进程** — 在本机启动 `hindsight-embed` 守护进程。按提示选择 LLM 提供商（OpenAI / Anthropic / Gemini / Groq / Claude Code / OpenAI Codex / Ollama）并输入 API 密钥（输入内容会被遮蔽）。

为简化配置，交互式向导会将凭据**内联**写入 `openclaw.json`。在 CI 或生产环境中，可以将凭据存为 [`SecretRef`](#llm-configuration)，在启动时从环境变量、文件或 `exec` 来源解析，且不会以明文形式写入磁盘。你可以在非交互式向导中传入 `--token-env` / `--api-key-env`，也可以之后使用 `openclaw config set ... --ref-source env|file|exec` 将现有字段改为引用。

在 CI 和脚本化配置中，也可以用非交互模式运行向导，并直接提供内联值或环境变量引用：

```bash
# 云端 — 内联令牌（最简单）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

# 云端 — SecretRef（在网关启动时从环境变量读取）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN

# 外部 API（无需身份验证）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode api --api-url https://mcp.hindsight.example.com --no-token

#带有 OpenAI 的嵌入式守护进程 — 内联 API 密钥
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key sk-...

#带有 OpenAI 的嵌入式守护进程 — SecretRef
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key-env OPENAI_API_KEY

#带有 Claude 代码的嵌入式守护进程（无需 API 密钥）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider claude-code
```

运行 `npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup --help`，查看完整的选项列表。

**步骤 3：启动 OpenClaw**

```bash
openclaw gateway
```

插件会在每轮对话结束后自动记录对话，并在智能体回复前注入相关记忆。

**重要提示：** 上面配置的 LLM **仅用于记忆提取**（后台处理）。OpenClaw 主智能体仍可使用你另行配置的任意模型。

**从 0.5.x 迁移？** 请参阅下文的[从 0.5.x 迁移](#migration-from-05x)，了解环境变量到 `SecretRef` 的映射。

## 工作原理 {#how-it-works}

**自动记录：** 每轮对话结束后都会自动存储对话，并在后台提取事实、实体和关系。

**自动召回：** 每次智能体回复前，系统都会将相关记忆自动注入上下文（默认最多 1024 个 token）。智能体无需调用工具，即可利用先前的上下文。

**手动知识工具：** 启用 `enableKnowledgeTools` 后，插件会提供 `agent_knowledge_*` 工具，供智能体显式查找记忆、进行反思、摄取文档和管理知识页。普通查找使用 `agent_knowledge_recall`；只有需要 Hindsight 根据记忆综合生成答案时，才使用 `agent_knowledge_reflect`。自动注入仍由 `recallMaxTokens` 控制，并可选用 `recallTopK` 限制注入数量。

**防止反馈循环：** 插件会在存储对话前自动移除注入的记忆标签（`<hindsight_memories>`），避免召回的记忆再次被提取为新事实，从而导致记忆数量指数增长并产生重复条目。

传统记忆系统会给智能体提供 `search_memory` 工具，但模型未必会稳定地调用它。自动召回通过在每轮对话前自动注入记忆来解决这个问题。

## 配置 {#configuration}

### 插件设置 {#plugin-settings}

`~/.openclaw/openclaw.json` 中的可选设置：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "apiPort": 9077,
          "embedVersion": "latest"
        }
      }
    }
  }
}
```

**选项：**

- `apiPort` - OpenClaw 配置文件对应的守护进程端口（默认值：`9077`）。
- `embedVersion` - `hindsight-embed` 版本（默认值：`"latest"`）。
- `llmProvider` - 用于提取记忆的 LLM 提供商（`openai`、`anthropic`、`gemini`、`groq`、`ollama`、`openai-codex`、`claude-code`）。除非设置了 `hindsightApiUrl`，否则此项必填。
- `llmModel` - 与 `llmProvider` 配合使用的 LLM 模型；省略时使用该提供商的默认模型。
- `llmApiKey` - LLM 提供商的 API 密钥。**敏感信息**：使用 `openclaw config set ... --ref-source env --ref-id OPENAI_API_KEY` 将其配置为环境变量引用。
- `llmBaseUrl` - OpenAI 兼容提供商的可选基础 URL 覆盖值（例如 `https://openrouter.ai/api/v1`）。
- `bankMission` - 存储在记忆库 `reflect_mission` 中的智能体身份和用途。**仅影响 `reflect`**，不会引导 retain 或 recall。每个记忆库首次使用时设置一次。
- `retainMission` - 首次使用时写入记忆库的 `retain_mission`，用于引导 retain 期间提取哪些内容作为事实。
- `observationsMission` - 首次使用时写入记忆库的 `observations_mission`，用于控制整合期间综合生成哪些观测。
- `retainExtractionMode` - 记忆库首次使用时设置的事实提取模式：`concise`、`verbose`、`custom`、`verbatim` 或 `chunks`。留空则使用服务器默认值。
- `enableObservations` - 控制 retain 后是否进行观测整合，在记忆库首次使用时写入。
- `enableAutoConsolidation` - 控制是否安排自动整合，通过记忆库配置 API 在记忆库首次使用时写入。
- `dispositionSkepticism` / `dispositionLiteralism` / `dispositionEmpathy` - Reflect 的性格倾向（`1`–`5`），在记忆库首次使用时写入。
- `entityLabels` - 实体标签的受控词汇。可以是属性定义列表（例如 `[{ "name": "person", "description": "Human user" }]`），也可以是 `{ "attributes": [...] }` 对象；其他格式会被忽略。记忆库首次使用时写入。
- `dynamicBankId` - 启用按上下文划分记忆库（默认值：`true`）。
- `bankId` - 当 `dynamicBankId` 为 `false` 时使用的静态记忆库 ID。
- `bankIdPrefix` - 记忆库 ID 的可选前缀（例如，`"prod"` 会生成 `"prod-slack-C123"` 或 `"prod-shared-bank"`）。
- `agentBankMap` - 显式的 `agentId` → `bankId` 路由，在静态或动态推导前检查。它可以让一组智能体共享一个命名记忆库，同时让其他智能体使用各自推导出的记忆库。映射名称按原样使用（不应用 `bankIdPrefix`）。
- `dynamicBankGranularity` - 用于推导记忆库 ID 的字段：`agent`、`channel`、`user`、`provider`（默认值：`["agent", "channel", "user"]`）。
- `excludeProviders` - 在 recall / retain 时跳过的消息提供商（例如 `["slack"]`、`["telegram"]` 或 `["discord"]`）。
- `autoRecall` - 在每轮前自动注入记忆（默认值：`true`）。当智能体有自己的召回工具时，可设为 `false`。
- `autoRetain` - 在每轮后自动存储对话（默认值：`true`）。
- `retainRoles` - 要纳入存储内容的消息角色（默认值：`["user", "assistant"]`）。可选值：`user`、`assistant`、`system`、`tool`。
- `recallBudget` - Recall 的检索力度：`"low"`、`"mid"` 或 `"high"`（默认值：`"mid"`）。预算越高，使用的检索策略越多，有助于提高结果质量。
- `recallMaxTokens` - Recall 响应的最大 token 数（默认值：`1024`），用于控制每轮注入多少记忆上下文。
- `recallTopK` - 每轮注入的记忆数量上限（默认值：不限制）。
- `recallTypes` - 要召回的记忆类型（默认值：`["observation"]`）。可选值：`world`、`experience`、`observation`。默认只召回观测，即整合并去重后的视图，避免许多原始记忆表达相同内容时重复呈现答案。
- `preferObservations` - 设为 `true` 时，Recall 会丢弃已整合进观测的原始事实，同时保留尚未整合的事实（默认值：`false`）。可与包含原始类型的 `recallTypes`（例如 `["observation", "world", "experience"]`）搭配，在整合完成前呈现刚存入的事实，例如 `/reset` 后询问“我刚才说了什么？”，同时避免重复呈现已整合的内容。
- `recallMinScores` - 按阶段指定的自动 Recall 可选最低分数（例如 `{"reranker": 0.3}`）。缺少的字段不设下限；分数缺失或为 `null` 的记忆会通过筛选。重排序器分数仅对当前查询有效，因此应把此项用作过滤明显无关结果的门槛，而不是校准后的相关度刻度。
- `recallContextTurns` - 纳入 Recall 查询的先前用户轮数（默认值：`1`）。
- `recallMaxQueryChars` - 组合 Recall 查询的最大字符数（默认值：`800`）。
- `recallPromptPreamble` - 放在召回记忆上方的自定义前导文本，用于覆盖内置指导文本。
- `recallInjectionPosition` - 召回内容的注入位置：`"user"`（默认值）、`"prepend"` 或 `"append"`。默认在用户消息前注入，并保留系统提示缓存。当记忆需要系统级上下文时，使用 `"prepend"` 或 `"append"`。
- `recallRoles` - 组合上下文 Recall 查询时要纳入的消息角色（默认值：`["user", "assistant"]`）。
- `retainEveryNTurns` - 每隔 N 轮存储一次（默认值：`1`，即每轮都存储）。值大于 `1` 时启用分块存储。
- `senderPrefixPattern` - 用于匹配部分频道添加到用户文本前的人类可读名称前缀的正则表达式（例如 `Alice: today weather?`）。只提供名称部分，例如 `Alice|Bob` 或 `[A-Za-z ]{1,20}`；插件会添加 `:` 分隔符和锚定符。设置后，前缀会从 Recall 查询和存储的对话记录中移除，避免发送者名称干扰向量搜索或被提取为事实。未设置（默认值）时不会移除任何内容；无效的正则表达式会被忽略。
- `retainOverlapTurns` - 触发分块存储时额外纳入的先前轮数（默认值：`0`）。
- `enableKnowledgeTools` - 注册 `agent_knowledge_*` 工具，以供智能体显式查找、反思、摄取内容和管理知识页（默认值：`false`）。
- `debug` - 启用调试日志（默认值：`false`）。

手动使用 `agent_knowledge_recall` 时，传入 `max_tokens` 以控制 Recall 响应可包含的记忆文本量。该工具没有 `max_results` 参数；若要限制自动注入的记忆数量，请改用自动 Recall 的 `recallTopK`。如果答案需要原文措辞或精确数字，而非提取出的事实，请传入 `include_chunks: true`，以同时获取这些记忆对应的原始文本，并用 `max_chunk_tokens` 限制其长度（默认值：`8192`）。

使用 `agent_knowledge_reflect` 时，除非确实需要更深入的综合生成，否则请保留较保守的默认设置：`budget` 默认为 `low`，`max_tokens` 默认为 `1024`，`fact_types` 默认为 `world`、`experience` 和 `observation`。Reflect 调用可能比 Recall 成本更高，因为它会先检索记忆，再调用配置的 Reflect LLM 生成答案。在生产环境中，请为记忆库设置有限的 `reflect_source_facts_max_tokens` 值（例如 `4096` 或 `8192`），不要让它不受限制，以免临时 Reflect 将无界数量的来源事实载入 LLM 上下文。

### 记忆隔离 {#memory-isolation}

插件会根据对话上下文创建独立的记忆库。默认情况下，记忆库 ID 由 `agent`、`channel` 和 `user` 字段推导，因此每种不同的字段组合都有自己的独立记忆存储。

你可以通过 `dynamicBankGranularity` 自定义用于划分记忆库的字段：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "dynamicBankGranularity": ["provider", "user"]
        }
      }
    }
  }
}
```

在此示例中，记忆按提供商和用户隔离。这意味着同一用户会在同一提供商下的所有频道之间共享记忆。

可用隔离场：

- `agent` - 智能体或机器人的身份
- `channel` - 频道或对话 ID
- `user` - 与智能体交互的用户
- `provider` - 消息提供商（例如 Slack、Discord）

使用 `bankIdPrefix` 为不同环境中的记忆库 ID 添加命名空间（例如 `"prod"`、`"staging"`）。将 `dynamicBankId` 设为 `false`，即可让所有对话使用同一个共享记忆库。静态模式下，如果设置了 `bankId`，插件就使用该值；否则默认使用 `openclaw` 作为记忆库名称。

#### 混合共享和隔离记忆库 {#mixing-shared-and-isolated-banks}

这两种模式只能择一启用。如果你在同一个网关中运行多个智能体，希望其中一些共享知识、另一些保持隔离，请使用 `agentBankMap`：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "dynamicBankId": true,
          "dynamicBankGranularity": ["agent", "channel", "user"],
          "agentBankMap": {
            "inbound": "ps-technology",
            "outbound": "ps-technology",
            "limpieza": "ps-limpieza"
          }
        }
      }
    }
  }
}
```

`inbound` 和 `outbound` 智能体共用 `ps-technology` 记忆库，`limpieza` 将内容写入 `ps-limpieza`；未列出的智能体则继续使用按原规则推导出的记忆库。插件会在静态或动态推导前检查此映射，因此映射的优先级也高于已配置的 `bankId`。

智能体 ID 必须完全匹配（区分大小写），映射的记忆库名称也会按原样使用；`bankIdPrefix` 不适用于这些名称。映射后的记忆库在首次使用时仍会应用你配置的记忆库默认值。自动 Recall、自动 Retain 和知识工具解析出的也都是同一个映射记忆库。

### 每用户记忆库默认值 {#per-user-bank-defaults}

启用 `dynamicBankId`（默认值）后，每个派生记忆库默认只会继承 Hindsight **服务器**的默认设置（例如 `concise` 提取模式、不配置实体标签）。若要让每个用户的记忆库都符合预期的基础或共享记忆库配置，请设置下方的记忆库默认选项。这些选项会在每个记忆库**首次使用时**、第一次 Retain 或 Recall 之前写入：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "dynamicBankId": true,
          "dynamicBankGranularity": ["agent", "channel", "user"],
          "retainExtractionMode": "verbose",
          "enableObservations": true,
          "enableAutoConsolidation": true,
          "dispositionSkepticism": 3,
          "dispositionLiteralism": 3,
          "dispositionEmpathy": 4,
          "entityLabels": [
            { "name": "person", "description": "A human user or contact" },
            { "name": "project", "description": "A software project or product" }
          ],
          "retainMission": "Extract durable preferences, decisions, and project context.",
          "observationsMission": "Synthesise stable user preferences and active projects.",
          "bankMission": "You are a helpful assistant with long-term memory across channels."
        }
      }
    }
  }
}
```

未设置的选项不会发送，因此仅配置任务说明时，现有行为保持不变。每个网关进程最多为每个记忆库配置一次。

### 保留控制 {#retention-controls}

默认情况下，插件会在每轮结束后存储 `user` 和 `assistant` 消息。你可以自定义此行为：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "autoRetain": true,
          "retainRoles": ["user", "assistant", "system"]
        }
      }
    }
  }
}
```

- `autoRetain` - 设为 `false` 可完全禁用自动 Retain（适用于你自行处理 Retain 的情况）。
- `retainRoles` - 控制存储的对话记录中包含哪些消息角色。每轮只存储最后一条用户消息及其之后的消息，以避免重复存储。

### LLM 配置 {#llm-configuration}

> 如果你在“快速入门”中运行过 `hindsight-openclaw-setup`，此部分已经
> 配置完成。若要直接编辑 `openclaw.json`，或切换到文件 / `exec` 密钥来源，
> 请继续阅读。

通过 OpenClaw 插件配置来设置用于记忆提取的 LLM。API 密钥
应保存为 `SecretRef`，以便在运行时从环境变量、已挂载文件或
`exec` 类密钥管理器（如 Vault）中解析，而不是以明文形式存储在磁盘上。

| 提供商 | `llmProvider` | API 密钥 |
| ------------ | -------------- | ----------------------------------- |
| OpenAI | `openai` | 必需 |
| Anthropic | `anthropic` | 必需 |
| Gemini | `gemini` | 必需 |
| Groq | `groq` | 必需 |
| Ollama | `ollama` | 不需要（本地运行） |
| Claude Code | `claude-code` | 不需要（使用 Claude Code CLI） |
| OpenAI Codex | `openai-codex` | 不需要（使用 Codex CLI 身份验证） |

**设置提供商和 API 密钥：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENAI_API_KEY
```

**覆盖模型（可选；Hindsight 会为每个提供商选择合适的默认模型）：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmModel gpt-4o-mini
```

**OpenAI 兼容提供商（OpenRouter、Azure OpenAI、vLLM 等）：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmBaseUrl https://openrouter.ai/api/v1
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENROUTER_API_KEY
openclaw config set plugins.entries.hindsight-openclaw.config.llmModel xiaomi/mimo-v2-flash
```

**使用文件或 `exec` 来源替代环境变量（适用于 K8s Secret、Vault 等）：**

```bash
# 文件来源（例如挂载的 Docker/K8s Secret）
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source file --ref-provider mounted-json --ref-id /providers/openai/apiKey

# Exec 来源（例如 HashiCorp Vault）
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source exec --ref-provider vault --ref-id openai/api-key
```

需要在 OpenClaw 配置的 `secrets.providers` 下配置相应的密钥提供商。请参阅
`openclaw config set --help`，了解 `--provider-source`、`--provider-path` 和
`--provider-command` 构造选项。

### 外部 API（高级） {#external-api-advanced}

> 通过交互式运行 `hindsight-openclaw-setup --mode api --api-url <url>`
> 即可完成此配置；本节介绍底层配置字段。

连接到远程 Hindsight API 服务器，而不是运行本地守护进程。适用于以下场景：

- **共享记忆**：多个 OpenClaw 实例共用记忆。
- **生产部署**：集中存储记忆。
- **团队环境**：多个智能体共享知识。

#### 插件配置 {#plugin-configuration}

在 `~/.openclaw/openclaw.json` 中配置：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://your-hindsight-server.com",
          "hindsightApiToken": "your-api-token"
        }
      }
    }
  }
}
```

**选项：**

- `hindsightApiUrl` - 外部 Hindsight API 的完整 URL（例如 `https://mcp.hindsight.example.com`）。
- `hindsightApiToken` - 用于 API 身份验证的令牌（可选）。**敏感信息**：请将其设为 `SecretRef`：

  ```bash
  openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiToken \
      --ref-source env --ref-provider default --ref-id HINDSIGHT_API_TOKEN
  ```

#### 行为 {#behavior}

启用外部 API 模式后：

- **不会启动本地守护进程**（不会运行 `hindsight-embed` 进程）。
- **启动时执行健康检查**，验证 API 是否可连接。
- **所有记忆操作**（retain、recall、reflect）都会调用外部 API。
- **启动更快**，因为无需本地 PostgreSQL 或嵌入模型。

#### 验证 {#verification}

检查 OpenClaw 日志，确认是否启用了外部 API 模式：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

# 启动时应看到：
# [Hindsight] External API mode enabled: https://your-hindsight-server.com
# [Hindsight] External API health check passed
```

如果看到守护进程启动消息，请检查配置是否正确。

## 检查记忆 {#inspecting-memories}

### 检查配置 {#check-configuration}

查看插件写入的守护进程配置：

```bash
cat ~/.hindsight/profiles/openclaw.env
```

此文件会显示守护进程正在使用的 LLM 提供商、模型、端口和其他设置。

### 检查守护进程状态 {#check-daemon-status}

```bash
# 检查守护进程是否正在运行
uvx hindsight-embed@latest -p openclaw daemon status

# 查看守护进程日志
tail -f ~/.hindsight/profiles/openclaw.log
```

### 查询记忆 {#query-memories}

```bash
# 搜索记忆
uvx hindsight-embed@latest -p openclaw memory recall openclaw "user preferences"

# 查看最近的记忆
uvx hindsight-embed@latest -p openclaw memory list openclaw --limit 10

# 打开 Web UI（使用 openclaw 配置文件对应的守护进程）
uvx hindsight-embed@latest -p openclaw ui
```

## OpenClaw 兼容性 {#openclaw-compatibility}

该插件已针对当前及旧版 OpenClaw 进行测试。
0.12.0 及更高版本适用于 **OpenClaw 2026.7.x 至 2026.9.x**。

**如果你使用 OpenClaw 2026.8.1 或更高版本，请升级到插件 0.12.0。**OpenClaw
2026.8.1 更改了附加到每条消息的会话元数据标签。旧版插件无法再识别这些标签，
受影响的配置因此会出现以下三个问题：

- 对话轮次被跳过，没有存入记忆；网关日志中会出现
  `missing stable sender identity`。
- OpenClaw 的内部路由详情（发送者和频道 ID）会被当作对话内容存储，
  因而可能在之后的 Recall 中出现。
- 自动 Recall 有时会用这些元数据而不是你实际说的话进行搜索，
  因此返回无关记忆。

0.12.0 会同时读取新旧标签，因此可用于所有受支持的 OpenClaw 版本；
你无需让插件版本与 OpenClaw 版本保持一致。

在 OpenClaw 2026.8.1 或更高版本上安装后，请留意以下两点：

- 安装时会输出
  `Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw"`。
  这是正常现象：Hindsight 会取代 OpenClaw 的内置记忆。
- 随后，`openclaw plugins doctor` 会报告 `memory-core` 未被选为记忆槽。
  这是预期结果，不是错误；这表示 OpenClaw 的内置记忆已让位。

:::note 从 0.11.1 或更早版本升级
安装 0.11.x 时可能会遇到
`npm error Cannot read properties of null (reading 'edgesOut')`。
这是由 npm 注册表变更触发的插件打包问题，已在 0.12.0 中修复；请使用新版本重试安装。
:::

## 故障排查 {#troubleshooting}

### 插件未加载 {#plugin-not-loading}

```bash
openclaw plugins list | grep hindsight
# Should show: ✓ enabled │ Hindsight Memory │ ...

# 如有需要，重新安装
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 守护进程未启动 {#daemon-not-starting}

```bash
# 检查守护进程状态（注意：-p openclaw 使用 openclaw 配置文件）
uvx hindsight-embed@latest -p openclaw daemon status

# 查看日志中的错误
tail -f ~/.hindsight/profiles/openclaw.log

# 检查配置
cat ~/.hindsight/profiles/openclaw.env

# 列出所有配置文件
uvx hindsight-embed@latest profile list
```

### API 密钥缺失错误 {#no-api-key-error}

请确保已通过 `openclaw config set` 配置 LLM 提供商，
或改用不需要 API 密钥的提供商：

```bash
# 选项 1：OpenAI（环境中需设置 OPENAI_API_KEY）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENAI_API_KEY

# 选项 2 — Anthropic
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider anthropic
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id ANTHROPIC_API_KEY

# 选项 3 — Claude Code（无需 API 密钥）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider claude-code

# 选项 4 — OpenAI Codex（无需 API 密钥）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai-codex

# 验证配置是否有效
openclaw config validate

# 查看当前值
openclaw config get plugins.entries.hindsight-openclaw.config.llmProvider
```

如果你在快速入门中使用了 `--ref-source env`，请确认被引用的环境变量
（例如 `OPENAI_API_KEY`）已导出到运行 `openclaw gateway` 的 shell 中。

## 限制 {#limitations}

### `memory-wiki` 不支持桥接模式 {#memory-wiki-bridge-mode-is-not-supported}

`hindsight-openclaw` 不会导出 OpenClaw 的 `publicArtifacts`，因此不支持 OpenClaw
`memory-wiki` 的**桥接模式**（`vaultMode: "bridge"`）。启用 Hindsight 插件后，
`openclaw wiki bridge import` 会导入 `0` 个资源，而 `openclaw wiki status` 会警告：
当前启用的记忆插件没有导出任何公共记忆资源。

这只影响 wiki 桥接模式。Hindsight 自身的记忆功能仍正常运行；Retain、Recall、Reflect、
共享记忆库以及上文的外部 API 配置均不受影响。

### 验证其是否正常工作 {#verify-its-working}

检查网关日志中的记忆操作：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

# 启动时应看到：
# [Hindsight] ✓ Using provider: openai, model: gpt-4o-mini
# 或
# [Hindsight] ✓ Using provider: claude-code, model: claude-sonnet-4-20250514

# 对话后应看到：
# [Hindsight] Retained X messages for session ...
# [Hindsight] Auto-recall: Injecting X memories
```

## 从 0.5.x 迁移 {#migration-from-05x}

0.6.0 移除了插件对进程环境变量的所有读取。以前通过 shell 环境变量提供的配置，
现在必须通过 OpenClaw 插件配置设置（凭据使用 `SecretRef`）。插件不再根据
`OPENAI_API_KEY`、`ANTHROPIC_API_KEY` 等自动检测提供商；你必须显式设置
`llmProvider`。

|旧版（0.5.x）|新版（0.6.0）|
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|`OPENAI_API_KEY=…`（自动检测）|`openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai`<br/>`openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey --ref-source env --ref-id OPENAI_API_KEY`|
|`HINDSIGHT_API_LLM_PROVIDER=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider …`|
|`HINDSIGHT_API_LLM_MODEL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmModel …`|
|`HINDSIGHT_API_LLM_API_KEY=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey --ref-source env --ref-id …`|
|`HINDSIGHT_API_LLM_BASE_URL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmBaseUrl …`|
|`HINDSIGHT_EMBED_API_URL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiUrl …`|
|`HINDSIGHT_EMBED_API_TOKEN=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiToken --ref-source env --ref-id …`|
|`HINDSIGHT_BANK_ID=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.bankId …`|
|`llmApiKeyEnv: "MY_KEY"`（插件配置）|将 `llmApiKey` 配置为 `SecretRef`，并设置 `--ref-id MY_KEY`|

如果 shell 已经导出了 `OPENAI_API_KEY`，上面的 `SecretRef` 配置会在启动时
解析为相同的值。无需更改 shell 设置，只需明确让插件引用该变量即可。
迁移后运行 `openclaw config validate`，确认新配置能够正确解析。
