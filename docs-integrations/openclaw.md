---
sidebar_position: 4
title: "OpenClaw 持久记忆Hindsight |插件集成"
description: "使用Hindsight为您的OpenClaw智能体添加持久、自动的记忆。本地优先、开源——一个插件安装即可用结构化知识提取和自动记忆识别取代内置记忆。"
---

# OpenClaw {#openclaw}

本地、长期记忆[OpenClaw](https://openclaw.ai)智能体使用[Hindsight](https://vectorize.io/hindsight)。

这个插件集成了[hindsight-embed](https://vectorize.io/hindsight/cli)，一个捆绑的独立守护进程Hindsight的记忆引擎（API+PostgreSQL）到单个命令中。一切都在您的机器上本地运行，重用LLM您已经支付了费用，无需额外付费。

[查看更新日志 →](/changelog/integrations/openclaw)

## 快速入门 {#quick-start}

**步骤 1：安装插件**

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

**步骤 2：运行设置向导**

`openclaw plugins install` 将插件解压到 `~/.openclaw/extensions/`
但不将其垃圾箱放在上 `PATH`。通过 运行向导 `npx` 相反 -
它将 bin 从已发布的包中解析出来：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导将引导您选择三种安装模式之一：

- **云端** — 管理Hindsight`https://api.hindsight.vectorize.io`。粘贴你的云  提示时使用API标记（屏蔽输入）。无需本地设置。
- **外部 API** — 你自己的运行Hindsight部署。提示输入 URL 和可选的令牌值（已屏蔽）。
- **嵌入式守护进程** — 生成本地 本机上的 `hindsight-embed`守护进程。提示LLM提供商（OpenAI/Anthropic/Gemini/ 格罗克 /Claude Code /OpenAICodex/Ollama）和API 密钥（被屏蔽）。

交互式向导存储凭据**内联** `openclaw.json` 为了简单起见。对于 CI/生产，您可以将凭据存储为 [`SecretRef`](#llm-configuration)（在启动时从环境变量、文件或执行源解析，从未保存在磁盘上）通过传递 `--token-env` / `--api-key-env` 到非交互式向导或随后通过 切换现有字段 `openclaw config set ... --ref-source env|file|exec`。

对于 CI 和脚本化设置，向导也以非交互方式运行 — 使用内联值或环境变量引用：

```bash
#云 — 内联令牌（最简单）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token hsk_your_cloud_token

#Cloud — SecretRef（在网关启动时从 env 读取）
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN

#外部API（无授权）
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

运行`npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup --help` 查看完整的标志列表。

**步骤 3：启动 OpenClaw**

```bash
openclaw gateway
```

该插件将在每个回合后自动捕获对话，并在智能体响应之前注入相关记忆。

**重要提示：** 的LLM上面配置的是**仅用于记忆提取**（后台处理）。您的主要OpenClaw智能体可以使用您单独配置的任何模型。

**从 0.5.x 迁移？** 参见下面的 [从 0.5.x 迁移](#migration-from-05x) 部分用于 env-var → SecretRef 映射。

## 工作原理 {#how-it-works}

**自动捕获：** 每次对话后都会自动存储。事实、实体和关系在后台提取。

**自动记忆召回：** 在每次智能体响应之前，相关记忆会自动注入到上下文中（默认最多 1024 个令牌）。智能体使用过去的上下文，无需调用工具。

**手动知识工具：** 当`enableKnowledgeTools` 已启用，插件公开 `agent_knowledge_*` 用于显式记忆查找、深思熟虑的反思、文档摄取和知识页面管理的工具。使用`agent_knowledge_recall` 用于普通查找和 `agent_knowledge_reflect`只在你想要的时候Hindsight从记忆中合成答案。自动注入依然使用`recallMaxTokens` 和可选 `recallTopK` 用于响应后计数上限。

**防止反馈循环：** 该插件会自动剥离注入的记忆标签（`<hindsight_memories>`) 在存储对话之前。这可以防止回忆的记忆被重新提取为新的事实，这将导致指数记忆增长和重复条目。

传统记忆系统赋予智能体`search_memory` 工具 - 但模型并没有一致地使用它。自动记忆召回通过在每次转动之前自动注入记忆来解决这个问题。

## 配置 {#configuration}

### 插件设置 {#plugin-settings}

中的可选设置 `~/.openclaw/openclaw.json`：

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

- `apiPort` - openclaw 配置文件守护程序的端口（默认值：`9077`)
- `embedVersion` - 事后嵌入版本（默认：`"latest"`)
- `llmProvider` -LLM记忆提取提供者（`openai`，`anthropic`，`gemini`，`groq`，`ollama`，`openai-codex`，`claude-code`）。需要，除非 `hindsightApiUrl` 已设置。
- `llmModel` -LLM型号与一起使用 `llmProvider`（如果省略，则提供者默认值）
- `llmApiKey` -API 密钥LLM提供商。 **敏感内容** — 通过 设置 `openclaw config set ... --ref-source env --ref-id OPENAI_API_KEY` 引用环境变量。
- `llmBaseUrl` - 可选的基本 URL 覆盖OpenAI兼容的提供商（例如`https://openrouter.ai/api/v1`)
- `bankMission` - 智能体identity/purpose存储在记忆库中`reflect_mission`。 **仅影响 `reflect`** — 不引导记忆存储或记忆召回。首次使用时每个记忆库设置一次。
- `retainMission` - 印在记忆库的上 首次使用时 `retain_mission`。引导在记忆存储过程中提取为事实的内容。
- `observationsMission` - 印在记忆库的上 首次使用时 `observations_mission`。控制在整合期间综合到观察中的内容。
- `retainExtractionMode` - 首次使用记忆库时标记事实提取模式：`concise`，`verbose`，`custom`，`verbatim`，或`chunks`。保留未设置以保持服务器默认值。
- `enableObservations` - 记忆存储后切换观察整合，在第一次使用记忆库时标记。
- `enableAutoConsolidation` - 切换自动整合计划，在第一次使用记忆库时标记（通过记忆库配置API）。
- `dispositionSkepticism` / `dispositionLiteralism` / `dispositionEmpathy` - 回忆性格特征（`1`–`5`）在首次使用记忆库时标记。
- `entityLabels` - 实体标签的受控词汇。属性定义列表（例如 `[{ "name": "person", "description": "Human user" }]`) 或 `{ "attributes": [...] }`对象；其他形状将被忽略。首次使用记忆库时加盖印记。
- `dynamicBankId` - 启用每个上下文记忆库（默认：`true`)
- `bankId` - 时使用的静态记忆库ID `dynamicBankId` 是 `false`。
- `bankIdPrefix` - 记忆库 ID 的可选前缀（例如 `"prod"` → `"prod-slack-C123"`或`"prod-shared-bank"`)
- `agentBankMap` - 明确 `agentId` → `bankId`路由，之前检查过static/dynamic推导。让一组智能体共享一个名为记忆库的智能体，而其他智能体则保留其派生的记忆库。映射的名称完全按照给定的方式使用 (`bankIdPrefix` 不适用）。
- `dynamicBankGranularity` - 用于导出记忆库 ID 的字段：`agent`，`channel`，`user`，`provider`（默认：`["agent", "channel", "user"]`)
- `excludeProviders` - 要跳过的消息提供者recall/retain（例如`["slack"]`，`["telegram"]`，`["discord"]`)
- `autoRecall` - 每回合前自动注入记忆（默认：`true`）。设置为 `false`当智能体有自己的记忆工具时。
- `autoRetain` - 每回合后自动记忆存储对话（默认：`true`)
- `retainRoles` - 记忆存储的消息角色（默认：`["user", "assistant"]`）。选项： `user`，`assistant`，`system`，`tool`
- `recallBudget` - 记忆召回努力：`"low"`，`"mid"`，或`"high"`（默认：`"mid"`）。较高的预算使用更多的检索策略以获得更好的结果。
- `recallMaxTokens` - 记忆召回响应的最大令牌（默认值：`1024`）。控制每回合注入多少记忆上下文。
- `recallTopK` - 每回合注入的最大记忆数量（默认值：无限制）。
- `recallTypes` - 记忆类型到记忆召回（默认：`["observation"]`）。选项： `world`，`experience`，`observation`。默认为“观察”——整合的、去重复的视图——以避免当许多原始记忆说同样的事情时多次出现相同的答案。
- `preferObservations` - 当`true`，记忆召回会丢弃已经合并到观察中的原始事实，同时保留未合并的事实（默认值：`false`）。与 配对 `recallTypes` 包括原始类型（例如 `["observation", "world", "experience"]`）在整合赶上之前显示刚刚保留的事实 - 例如在之后 `/reset` 接下来是“我刚刚说什么？” - 不重复已经合并的内容。
- `recallMinScores` - 用于自动记忆召回的可选分数楼层，按阶段键入（例如 `{"reranker": 0.3}`）。缺失的字段没有限制；缺失或的记忆 `null`分数及格。 重排序器分数是查询本地的，因此将其用作垃圾门而不是校准的相关度盘。
- `recallContextTurns` - 记忆召回查询中包含的先前用户轮数（默认值：`1`）。
- `recallMaxQueryChars` - 组合记忆召回查询的最大字符数（默认值：`800`）。
- `recallPromptPreamble` - 自定义序言文本放置在回忆的上方。覆盖内置指导文本。
- `recallInjectionPosition` - 在哪里注入回忆：`"user"`（默认），`"prepend"`，或`"append"`。默认在用户消息之前注入并保留系统提示缓存。使用`"prepend"`或`"append"` 当记忆需要系统级上下文时。
- `recallRoles` - 编写上下文记忆召回查询时要包含哪些消息角色（默认值：`["user", "assistant"]`）。
- `retainEveryNTurns` - 每 N 轮记忆存储（默认值：`1` = 每回合）。值 > 1 启用分块保留。
- `senderPrefixPattern` - 正则表达式匹配一些频道在用户文本前面添加的人类显示名称前缀（例如 `Alice: today weather?`）。仅提供名称部分 - `Alice|Bob`或`[A-Za-z ]{1,20}` — `:` 分隔符和锚定由插件添加。设置后，前缀将从记忆召回查询和保留的记录中删除，因此发送者的名称不再污染矢量搜索或被提取为事实。取消设置（默认）不会删除任何内容；无效的正则表达式将被忽略。
- `retainOverlapTurns` - 当分块保留触发时包括额外的先前回合（默认值：`0`）。
- `enableKnowledgeTools` - 注册 `agent_knowledge_*` 用于显式智能体驱动的查找、反思、摄取和知识页面管理的工具（默认：`false`）。
- `debug` - 启用调试日志记录（默认值：`false`）。

使用时`agent_knowledge_recall`手动，通过`max_tokens` 控制记忆召回响应可以包含多少记忆文本。该工具没有 `max_results` 参数 — 要限制自动注入记忆的数量，请使用 `recallTopK`改为自动记忆。当答案需要逐字逐句或确切的数字而不是提取的事实时，请传递 `include_chunks: true` 还可以获取这些记忆的原始源文本，以及 `max_chunk_tokens` 绑定它（默认`8192`）。

使用时`agent_knowledge_reflect`，保留默认的保守设置，除非你故意需要更深入的综合：`budget` 默认为 `low`，`max_tokens` 默认为 `1024`，和`fact_types` 默认为 `world`，`experience`，和`observation`。 反思调用可能比记忆召回更昂贵，因为它们检索记忆，然后调用配置的反思LLM生成答案。对于生产记忆库，设置有限的记忆库级别`reflect_source_facts_max_tokens`值（例如`4096`或`8192`）而不是让它不受限制，因此临时反思无法将无限量的源事实拉入LLM上下文。

### 记忆隔离 {#memory-isolation}

该插件根据对话上下文创建单独的记忆库。默认情况下，记忆库源自 `agent`，`channel`，和`user` 字段 - 因此每个独特的组合都有自己独立的记忆存储。

您可以使用自定义哪些字段用于记忆库分段 `dynamicBankGranularity`：

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

在此示例中，每个提供商+用户的记忆都是隔离的，这意味着同一用户在提供商内的所有通道上共享记忆。

可用隔离场：

- `agent` - 的agent/bot身份
- `channel` - 频道或对话 ID
- `user` - 用户与智能体交互
- `provider` - 消息提供者（例如 Slack、Discord）

使用`bankIdPrefix` 跨环境的命名空间记忆库 ID（例如 `"prod"`，`"staging"`）。设置`dynamicBankId`至`false` 对所有对话使用单个共享记忆库。在静态模式下，插件使用 `bankId` 如果设置，否则默认 `openclaw`记忆库名称。

#### 混合共享和隔离记忆库 {#mixing-shared-and-isolated-banks}

这两种模式要么全有要么全无。当您在一个网关中运行多个智能体并希望其中一些智能体共享知识而其他智能体保持隔离时，请使用 `agentBankMap`：

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

`inbound` 和 `outbound` 智能体分享 `ps-technology`记忆库，`limpieza` 写入`ps-limpieza`，并且任何未列出的智能体都会保留它本来可以导出的记忆库。在静态和动态推导之前都会检查映射，因此它也优先于配置的 `bankId`。

智能体 ID 完全匹配（区分大小写），并且映射的记忆库名称完全按照书写方式使用 — `bankIdPrefix` 不适用于它们。映射记忆库在首次使用时仍会收到您配置的记忆库默认值，并且自动记忆召回、自动记忆存储和知识工具都解析相同的映射记忆库。

### 每用户记忆库默认值 {#per-user-bank-defaults}

与`dynamicBankId`启用（默认），否则每个派生记忆库仅继承Hindsight**服务器** 默认值 (`concise`提取，无实体标签等）。让每个用户的记忆库都符合您的预期base/shared记忆库，设置下面的记忆库-默认选项——它们被印在每个记忆库上**首次使用时**，在第一个记忆存储或记忆召回之前：

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
            { "name": "person", "description": "人类用户或联系人" },
            { "name": "project", "description": "软件项目或产品" }
          ],
          "retainMission": "提取持久的偏好、决策和项目背景。",
          "observationsMission": "综合稳定的用户偏好和活跃的项目。",
          "bankMission": "你是一个有跨渠道长期记忆的得力助手。"
        }
      }
    }
  }
}
```

不会发送未设置的选项，因此当您仅配置任务时，现有行为不会改变。每个记忆库在每个网关进程中最多配置一次。

### 保留控制 {#retention-controls}

默认情况下，插件保留每回合后 `user` 和 `assistant`消息。您可以自定义此行为：

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

- `autoRetain` - 设置为 `false` 完全禁用自动保留（如果您自己处理保留，则很有用）
- `retainRoles` - 控制保留的记录中包含哪些消息角色。每轮仅保留最后一条用户消息之后的消息，从而防止重复存储。

### LLM 配置 {#llm-configuration}

> 如果你使用过快速入门中的 `hindsight-openclaw-setup`，这部分是
> 已为您处理 - 如果您想编辑，请继续阅读 `openclaw.json`
> 直接或切换到file/exec秘密源。

通过OpenClaw的插件配置配置记忆提取LLM。 API 密钥
应存储为`SecretRef` 值，因此它们是从环境变量解析的， 运行时的
已安装的文件，或 运行时的 `exec`风格的秘密管理器（Vault等）
而不是以明文形式存放在磁盘上。

|提供商|`llmProvider`|API 密钥|
| ------------ | -------------- | ----------------------------------- |
|OpenAI|`openai`        需要||
|Anthropic|`anthropic`||
|Gemini|`gemini`        需要||
|格罗克|`groq`||
|Ollama|`ollama`        需要|不需要（本地）|
|Claude 代码|`claude-code`|不需要（使用 Claude 代码 CLI）|
|OpenAICodex|`openai-codex`|不需要（使用 Codex CLI 身份验证）|

**设置提供商与 API 密钥：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENAI_API_KEY
```

**覆盖模型（可选，Hindsight 会为每个提供商选择合理的默认模型）：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmModel gpt-4o-mini
```

**兼容 OpenAI 的提供商（OpenRouter、Azure OpenAI、vLLM 等）：**

```bash
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmBaseUrl https://openrouter.ai/api/v1
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENROUTER_API_KEY
openclaw config set plugins.entries.hindsight-openclaw.config.llmModel xiaomi/mimo-v2-flash
```

**使用文件或命令输出作为来源，替代环境变量（适用于 K8s Secret、Vault 等）：**

```bash
# 文件来源（例如挂载的 Docker/K8s Secret）
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source file --ref-provider mounted-json --ref-id /providers/openai/apiKey

#Exec 源（例如 HashiCorp Vault）
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source exec --ref-provider vault --ref-id openai/api-key
```

需要在下配置相应的secretprovider `secrets.providers`
在你的OpenClaw配置 — 参见 `openclaw config set --help` 对于
`--provider-source`/`--provider-path`/`--provider-command` 建造者旗帜。

### 外部API（高级） {#external-api-advanced}

> `hindsight-openclaw-setup --mode api --api-url <url>` 覆盖这条路径
> 交互 — 本节记录了底层配置字段。

连接到远程HindsightAPI服务器而不是运行本地守护程序。这对于：

- **共享记忆** 跨多个OpenClaw实例
- **生产部署** 带集中记忆存储
- **团队环境** 智能体分享知识的地方

#### 插件配置 {#plugin-configuration}

在中配置 `~/.openclaw/openclaw.json`：

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

- `hindsightApiUrl` - 外部的完整 URLHindsightAPI（例如，`https://mcp.hindsight.example.com`)
- `hindsightApiToken` -API用于身份验证的令牌（可选）。 **敏感内容** — 设置为 SecretRef：

  ```bash
  openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiToken \
      --ref-source env --ref-provider default --ref-id HINDSIGHT_API_TOKEN
  ```

#### 行为 {#behavior}

当外部API模式启用时：

- **无需本地守护进程** 已启动（无事后嵌入过程）
- **健康检查** 在启动时运行以验证API连接性
- **所有记忆操作**（记忆存储，记忆召回，反思）去外部API
- **启动更快** 因为没有本地人  需要PostgreSQL或嵌入模型

#### 验证 {#verification}

检查外部API模式的OpenClaw日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

#启动时应该看到：
# [Hindsight] 已启用外部 API 模式：https://your-hindsight-server.com
#[Hindsight]外部API健康检查通过
```

如果您看到守护程序启动消息，请验证您的配置是否正确。

## 检查记忆 {#inspecting-memories}

### 检查配置 {#check-configuration}

查看插件编写的守护进程配置：

```bash
cat ~/.hindsight/profiles/openclaw.env
```

这显示了LLM 提供程序、模型、端口和守护程序正在使用的其他设置。

### 检查守护进程状态 {#check-daemon-status}

```bash
#检查守护进程是否正在运行
uvx hindsight-embed@latest -p openclaw daemon status

#查看守护进程日志
tail -f ~/.hindsight/profiles/openclaw.log
```

### 查询记忆 {#query-memories}

```bash
#搜索记忆
uvx hindsight-embed@latest -p openclaw memory recall openclaw "用户偏好"

#查看最近的记忆
uvx hindsight-embed@latest -p openclaw memory list openclaw --limit 10

#打开Web UI（使用openclaw配置文件的监控进程）
uvx hindsight-embed@latest -p openclaw ui
```

## OpenClaw兼容性 {#openclaw-compatibility}

该插件针对当前的OpenClaw版本和旧版本进行了测试。
版本 0.12.0 及更高版本适用于 **OpenClaw 2026.7.x 至 2026.9.x**。

**如果你使用 OpenClaw 2026.8.1 或更高版本，请将插件升级至 0.12.0。**OpenClaw
2026.8.1 更改了附加到每个会话元数据的标签方式
消息。早期的插件版本不再识别这些标签，这导致
受影响设置的三个问题：

- 回合被跳过而不是被记住， 网关日志中的
  `missing stable sender identity`。
- OpenClaw 的内部路由详细信息（发送者和通道 ID）被存储为好像
  它们是谈话的一部分，因此它们可以在后来的回忆中浮现出来。
- 自动记忆召回有时使用该元数据而不是您的内容进行搜索
  其实就是说，返回无关的记忆。

  0.12.0 同时读取旧标签和新标签，因此在任何受支持的 OpenClaw 上都是安全的
  版本 — 您不需要匹配插件和OpenClaw版本。

在 OpenClaw 2026.8.1 或更高版本安装后需要注意以下两点：

- 安装打印件
  `Exclusive slot "memory" switched from "memory-core" to "hindsight-openclaw"`。
  这是正确的：Hindsight取代了OpenClaw的内置记忆。
- `openclaw plugins doctor` 然后报告 `memory-core` 未选择
  记忆槽。这是预期的结果，而不是错误 — OpenClaw 注意到
  其内置记忆退到一边。

:::note 从 0.11.1 或更早版本升级
安装 0.11.x 可能会失败
`npm error Cannot read properties of null (reading 'edgesOut')`。那是一个
插件中的打包问题，由npm注册表中的更改触发，以及
已在 0.12.0 中修复 — 使用新版本重试安装。
:::

## 故障排查 {#troubleshooting}

### 插件未加载 {#plugin-not-loading}

```bash
openclaw plugins list | grep hindsight
#应显示：✓ 已启用 │ Hindsight 记忆 │ ...

#如果需要请重新安装
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 守护进程未启动 {#daemon-not-starting}

```bash
#检查监控进程状态（注意：-p openclaw 使用 openclaw 配置文件）
uvx hindsight-embed@latest -p openclaw daemon status

#查看日志中的错误
tail -f ~/.hindsight/profiles/openclaw.log

#检查配置
cat ~/.hindsight/profiles/openclaw.env

#列出所有个人资料
uvx hindsight-embed@latest profile list
```

### 无API按键错误 {#no-api-key-error}

确保您已配置LLM提供者通过 `openclaw config set`
（或使用不需要密钥的提供商）：

```bash
# 选项 1：OpenAI（环境中需设置 OPENAI_API_KEY）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id OPENAI_API_KEY

# Option 2 — Anthropic
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider anthropic
openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey \
    --ref-source env --ref-provider default --ref-id ANTHROPIC_API_KEY

#选项 3 — Claude 代码（无需 API 密钥）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider claude-code

#选项 4 — OpenAI Codex（用API 密钥）
openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai-codex

#验证配置是否有效
openclaw config validate

#检查当前值
openclaw config get plugins.entries.hindsight-openclaw.config.llmProvider
```

如果你使用过快速入门中的 `--ref-source env`，仔细检查引用的环境变量
（例如`OPENAI_API_KEY`) 在运行 的 shell 中导出 `openclaw gateway`。

## 限制 {#limitations}

### `memory-wiki` 不支持桥接模式 {#memory-wiki-bridge-mode-is-not-supported}

`hindsight-openclaw` 不导出OpenClaw`publicArtifacts`，所以OpenClaw的
`memory-wiki`**桥接模式** (`vaultMode: "bridge"`) 不支持。随着
Hindsight插件已激活，`openclaw wiki bridge import`进口`0` 文物和
`openclaw wiki status` 警告活动记忆插件未导出任何内容
公共记忆文物。

这仅适用于 wiki 桥。 Hindsight自身记忆正常运转——
记忆存储 / 记忆感知 / 反思，共享记忆库，以及上面的外部-API设置都是
不受影响。

### 验证其是否正常工作 {#verify-its-working}

检查网关日志以进行记忆操作：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

#启动时应该看到：
#[Hindsight] ✓ 使用提供商：openai，型号：gpt-4o-mini
# or
#[Hindsight] ✓ 使用提供程序：claude-code，模型：claude-sonnet-4-20250514

#对话后应该看到：
#[Hindsight] 会话保留 X 消息 ...
#[Hindsight]自动记忆召回：注入X记忆
```

## 从 0.5.x 迁移 {#migration-from-05x}

0.6.0 从插件中删除所有进程环境读取。配置说明
以前来自 shell 环境变量现在必须经过 OpenClaw 的插件配置
（有`SecretRef` 凭证）。该插件不再自动检测提供商
来自`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / 等 — 您必须设置
`llmProvider` 明确。

|旧版 (0.5.x)|新 (0.6.0)|
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|`OPENAI_API_KEY=…`（自动检测）|`openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider openai`<br/>`openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey --ref-source env --ref-id OPENAI_API_KEY`|
|`HINDSIGHT_API_LLM_PROVIDER=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmProvider …`|
|`HINDSIGHT_API_LLM_MODEL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmModel …`|
|`HINDSIGHT_API_LLM_API_KEY=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmApiKey --ref-source env --ref-id …`|
|`HINDSIGHT_API_LLM_BASE_URL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.llmBaseUrl …`|
|`HINDSIGHT_EMBED_API_URL=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiUrl …`|
|`HINDSIGHT_EMBED_API_TOKEN=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.hindsightApiToken --ref-source env --ref-id …`|
|`HINDSIGHT_BANK_ID=…`|`openclaw config set plugins.entries.hindsight-openclaw.config.bankId …`|
|`llmApiKeyEnv: "MY_KEY"`（插件配置）|`llmApiKey` 配置为带有 的 SecretRef `--ref-id MY_KEY`|

如果你的 shell 已经导出了 `OPENAI_API_KEY`，上面的 SecretRef 配置
在启动时解析为相同的值 - 您无需更改 shell
设置，只需将插件显式指向变量即可。运行
迁移后确认新形状解析的
迁移后运行 `openclaw config validate`，确认新配置能够正确解析。
