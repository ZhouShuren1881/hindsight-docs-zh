---
sidebar_position: 10
title: "使用 Hindsight 为 Hermes Agent 提供持久记忆 | 集成"
description: "使用 Hindsight 为 Hermes Agent 添加长期记忆。从 Hermes 插件目录安装，即可在每轮对话前自动召回上下文，并保留对话供后续会话使用。"
---

{/* 由 hindsight-integrations/hermes/README.md 生成 — 编辑该文件，然后运行
    node hindsight-docs/scripts/sync-hermes-doc.mjs */}

:::tip
使用 **Hermes 桌面应用**？你可以完全在“设置”中选择并配置 Hindsight，无需使用终端。请参阅 [Hermes 桌面版](/sdks/integrations/hermes-desktop)。
:::

:::warning 已弃用：独立的 <code>hindsight-hermes</code> 插件
旧版 **<code>hindsight-hermes</code>** pip 插件（安装到 Hermes 虚拟环境，并通过 <code>hermes_agent.plugins</code> 入口点注册）已**弃用**——在当前 Hermes 构建版本中，其工具会因 `{"error": "Timeout context manager should be used inside a task"}` 而失败。请按照[将 hindsight-hermes 迁移到 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)的说明进行切换，同时保留原有记忆库。
:::

借助知识图谱、实体消解和多策略检索实现长期记忆。支持云端、本地嵌入式和本地外部模式。

这是一个用于 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 的记忆提供方插件，可从 Hermes 插件目录安装。它过去随 Hermes 一起位于 <code>plugins/memory/hindsight/</code> 中；Nous Research 将所有记忆提供方移出了核心目录，因此现在由 Hindsight 团队在 [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/hermes) 中维护，并由目录从该处固定版本。

[查看更新日志 →](/changelog/integrations/hermes)

## 安装 {#install}

Hindsight 已加入 Hermes 插件目录，只需使用插件名称：

```bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
```

`plugins install` 会在启用插件前请求确认。传入 `--enable`（或 `--no-enable`）即可跳过提示；脚本或无人值守运行时通常需要这样做。

`pyproject.toml` 中的依赖会安装到 Hermes 虚拟环境中，并在运行 `hermes update` 后保留。Hermes 会在准备依赖前征求确认：如果更新发现新的插件依赖项，就会显示 `<plugin> declares Python dependencies` 并等待确认。无人值守运行 `hermes update` 时会停在该提示处，无法完成。

`hermes plugins enable` **不会**启用记忆提供程序——Hermes 将提供程序视为 `kind: exclusive`，其插件启用门控会有意跳过它们。通过在 `config.yaml` 中设置 `memory.provider: <name>` 来启用提供程序；`hermes memory setup` 会写入此配置。

### `local_embedded` 的运行方式 {#how-local_embedded-runs}

Hindsight 服务器**不是** Hermes 虚拟环境的依赖项。`local_embedded` 会将其作为独立进程启动：优先使用已安装的 `hindsight-api` 二进制文件，否则回退到 `uvx hindsight-api`，后者会使用自己的环境；随后通过 HTTP 与服务器通信。此虚拟环境只保留 `hindsight-client` 和 `hindsight-embed`，两者都在 `pyproject.toml` 中声明，因此安装插件时，各种模式所需的依赖都会一并安装，无需在运行时再下载任何内容。

这并非为了缩小体积而作的优化；只有这种依赖组合能够安装。`hindsight-all` 会拉取整个 `hindsight-api-slim` 依赖树，但它无法与 Hermes 固定的额外依赖版本兼容：api-slim 要求 `protobuf>=7.35.1`，而 `mem0ai==2.0.10` 和 `modal==1.5.5` 将其限制在 7.0 以下；api-slim 还要求 `opentelemetry-semantic-conventions>=0.65b0`，而 `mistralai==2.4.8` 将其限制在 0.61 以下。放宽其中一个版本限制后还会暴露下一个冲突。此外，在 macOS arm64 上它占用 482 MB，在 Linux x86_64 上占用 3.2 GB（CUDA wheels 会在 Linux 上拉取 torch），云端模式用户为此付出的代价毫无用处。

`_new_embedded_client` 会组合旧版 `hindsight.HindsightEmbedded` 封装内部使用的 `hindsight_embed.get_embed_manager()` 和 `hindsight_client.Hindsight`，而不再导入该封装。**现有嵌入式模式用户无需改变任何内容**：守护进程由 profile 决定，因此数据库（`~/.pg0/instances/hindsight-embed-<profile>/`）和 profile 环境文件（`~/.hindsight/profiles/<profile>.env`）仍是相同文件，读取方式也相同。无需迁移或重新设置。

插件不再从任何位置调用 `tools.lazy_deps.install_specs`。在通过包管理器安装的 Hermes 中，这只是一个已弃用的兼容接口：它会将进程交给更新器并退出，而不是安装依赖。因此，每次调用 `hermes` 都会触发约 40 秒的“更新”，清空 `hermes-gateway`，却仍然缺少所需导入（NousResearch/hermes-agent#126494；上游已在 af26acab73 修复为抛出 `ImportError`）。现在没有任何依赖需要它来安装。

## 从内置提供方迁移 {#coming-from-the-built-in-provider}

`plugins/memory/hindsight/` 曾是随 Hermes 一起提供的 Hindsight 副本。Nous Research 于 2026-09-23 移除了该副本，现在需要从插件目录安装提供方。**你无需执行任何操作**，记忆也不会受到影响。

`hermes update` 会调用 Hermes 的 `memory_provider_migration`；对于从不运行该命令的桌面版用户，智能体启动时也会调用它。此迁移会检查是否配置了 `memory.provider: hindsight`，确认磁盘上没有对应提供程序后，再从插件目录查找并安装经过审核的固定提交版本。你会看到：

```
✓ Memory provider 'hindsight' moved out of core — installed its plugin from the catalog
  (your memory.hindsight settings and data are unchanged).
```

你的数据从未存放在 Hermes 目录中：记忆位于你的 Hindsight 记忆库中，即 Hindsight Cloud；如果使用 `local_embedded`，则位于 profile 目录 `~/.hindsight/profiles/<profile>` 及其嵌入式 PostgreSQL 实例中。移动提供程序代码不会触及这些数据，`~/.hermes/hindsight/config.json` 仍按原样读取。

如果无法运行迁移——例如处于离线状态或目录获取失败——Hermes 会打印下面这条手动安装命令，而不会在没有记忆的情况下静默启动：

```bash
hermes plugins install hindsight
```

## 更新 {#updating}

**插件不会自行更新。** 无论选择下面哪种模式，只有运行命令时插件代码才会更新。特别是，`hermes update` **不会**移动插件：它会重新安装插件的 Python 依赖，但会让插件保留在原来的检出位置。如果你之前使用的是内置提供程序，需要改掉这个习惯——现在记忆功能的改进不会再作为更新 Hermes 的附带结果出现。

Hermes 每 6 小时最多重新获取一次已发布的目录，因此新发布的版本可能要等这么久才会显示为可用。

### 使用官方固定版本（默认） {#follow-the-official-pin-default}

运行 `hermes plugins install hindsight` 后获得的版本：Nous 在其目录中审核并固定的提交。

```bash
hermes plugins update hindsight    # 更新到目录当前固定的提交
```

`hermes plugins list` 会在已安装的提交与目录中的提交不同时，将插件标记为 `update_available`。再次运行 `hermes plugins install hindsight` **不会**更新它——该命令会因插件“already exists”而拒绝安装；重新固定版本应使用 `plugins update`。

### 固定特定版本 {#pin-a-specific-release}

如果你要选择并固定一个版本，请在安装时指定提交：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

请完整替换占位符，包括尖括号：在大多数 shell 中，`<` 和 `>` 是重定向运算符，保留它们会导致命令解析失败。如果复制这两行，请保留第一行末尾的 `\`，或将两行合并为一行，因为 `\` 后面若不是换行符，命令同样会解析失败。

`--ref` 接受完整的 40 字符提交 SHA，**不接受标签名称**。因此，请从你想使用的[版本发布说明](https://github.com/vectorize-io/hindsight/releases)中复制 SHA，不要直接输入 `v1.1.0`。在[插件提交历史](https://github.com/vectorize-io/hindsight/commits/main/hindsight-integrations/hermes)中，提交旁边的复制按钮可以复制完整 SHA；屏幕上显示的缩写太短。

使用 `--ref` 安装的插件会标记为固定版本，`hermes plugins update hindsight` 会有意拒绝移动它。想改用其他版本时，请再次安装并指定新的 `--ref`。

### 追踪最新开发代码 {#track-the-latest-development-code}

如果要在修复进入目录前就使用它们，请从源代码路径而不是目录名称安装：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight    # 此时会从我们的 main 分支执行 git pull
```

此版本按定义未经审核——运行命令时 `main` 分支上的内容都会安装到你的环境中。

目录条目位于 Nous 的仓库 [`plugin-catalog/hindsight.yaml`](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/hindsight.yaml) 中，该条目记录当前固定版本。

## 环境要求 {#requirements}

- **云端：**需要来自 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 的 API 密钥。
- **本地嵌入式：**需要受支持的 LLM 提供程序 API 密钥（OpenAI、Anthropic、Gemini、Groq、OpenRouter、MiniMax、Ollama，或任何兼容 OpenAI 的端点）。嵌入和重排序在本地运行，无需其他 API 密钥。
- **本地外部：**需要一个可通过 HTTP 访问的 Hindsight 实例（Docker 或自托管）。

## 设置 {#setup}

```bash
hermes memory setup    # 选择 "hindsight"
```

设置向导不会安装任何内容（依赖项随插件一同提供），会引导你完成配置，并询问是否要使用**初始记忆模板**为记忆库填充内容。模板是一组为常见智能体角色精选的性格倾向和强制指令。你可以跳过此步骤；如果记忆库已配置内容，向导会在覆盖之前发出警告。

或手动（默认云模式）：
```bash
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

### 云 {#cloud}

连接到 Hindsight Cloud API。需要来自 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 的 API 密钥。

### 本地嵌入式 {#local-embedded}

Hermes 会启动带有内置 PostgreSQL 的本地 Hindsight 守护进程。记忆提取和综合生成需要 LLM API 密钥。首次使用时，守护进程会自动在后台启动，并在闲置 5 分钟后停止。

支持任何兼容 OpenAI 的 LLM 端点（llama.cpp、vLLM、LM Studio 等）。选择 `openai_compatible` 作为提供程序，并输入基本 URL。

守护进程启动日志：`~/.hermes/logs/hindsight-embed.log`
守护进程运行时日志：`~/.hindsight/profiles/<profile>.log`

打开 Hindsight Web UI（仅适用于本地嵌入式模式）：
```bash
hindsight-embed -p hermes ui start
```

### 本地外部 {#local-external}

将插件指向你已运行的 Hindsight 实例（Docker、自托管等）。此模式不管理守护进程，只需要 URL 和可选的 API 密钥。

## 配置 {#config}

配置文件：`~/.hermes/hindsight/config.json`

### 连接 {#connection}

|参数|默认值|说明|
|-----|---------|-------------|
|`mode`|`cloud`|`cloud`、`local_embedded` 或 `local_external`|
|`api_url`|`https://api.hindsight.vectorize.io`|API URL（用于云端和 `local_external` 模式）|

### 记忆库 {#memory-bank}

|参数|默认值|说明|
|-----|---------|-------------|
|`bank_id`|`hermes`|记忆库名称（未设置 `bank_id_template` 或其解析结果为空时使用的静态回退值）|
|`bank_id_template`|—|可选模板，用于动态生成记忆库名称。占位符：`{profile}`、`{workspace}`、`{project}`、`{platform}`、`{user}`、`{session}`。`{project}` 是 Hermes 当前所在 git 仓库的名称；同一仓库的所有工作树会解析为相同名称；如果当前目录不在仓库中，或仓库根目录位于你的主目录，则该值为空。示例：`hermes-{profile}` 会按当前 Hermes profile 隔离记忆；`{project}` 会为每个仓库创建自己的记忆库。空占位符会自然折叠（例如，没有用户时，`hermes-{user}` 会变为 `hermes`）。|
|`mirror_to_own_bank`|`false`|如果模板解析为另一个记忆库，也写入 `bank_id`，以便 profile 在项目记忆库中工作时仍保有自己的记忆。|
|`additional_banks`|—|按优先顺序写入并召回的额外记忆库。|
|`recall_additional_banks`|—|仅用于召回、绝不写入的额外记忆库；在可写记忆库之后搜索。别名为 `recallAdditionalBanks`，这是 Claude Code 集成使用的名称。若某记忆库也列在 `additional_banks` 中，它仍可写入。|
|`trusted_project_dirs`|—|绝对路径目录；这些目录中的 git 仓库可以通过 `.hindsight/config.toml` 选择自己的记忆库。默认值为空，因此克隆的仓库无法重定向你的记忆。|
|`bank_mission`|—|Reflect 任务说明（为 Reflect 推理设定身份和框架）。通过 Banks API 应用。|
|`bank_retain_mission`|—|Retain 任务说明（引导要提取的内容）。通过 Banks API 应用。|

#### 多个记忆库 {#multiple-banks}

按以下顺序选择主记忆库：受信任仓库中的 `.hindsight/config.toml`、`bank_id_template`，最后是 `bank_id`。写入时依次写入主记忆库、（如果启用了 `mirror_to_own_bank`）`bank_id`，再写入每个 `additional_banks` 条目。召回会同时搜索相同的记忆库，以及每个 `recall_additional_banks` 条目；每个记忆库使用配置的预算和 `recall_max_tokens`。结果按该顺序合并，并按文本去重。Reflect 仅使用主记忆库。

三个列表设置接受 JSON 列表或逗号分隔的文本；值中含逗号时请使用 JSON 格式。

额外记忆库发生故障时会跳过 5 分钟；记忆库停止响应时会记录一条警告，恢复响应时会记录一条信息。召回和写入分别冷却；写入冷却期间，该记忆库会漏掉此期间发生的写入。额外记忆库在 `timeout` 的 80% 时间过去后仍未响应，就会被视为故障，因此不会拖延主记忆库的结果。主记忆库发生故障时，整个调用会像只使用单个记忆库时一样失败；写入也会立即停止，不会继续尝试任何额外记忆库。

如果仓库本身位于 `trusted_project_dirs` 之一（对于链接的工作树，按工作树所在位置判断），则可以在仓库根目录或其下任意目录中的 `.hindsight/config.toml` 指定记忆库：

```toml
bank_id = "acme-billing"
```

查找会在仓库根目录停止。仅读取 `bank_id`。

### 记忆召回 {#recall}

|参数|默认值|说明|
|-----|---------|-------------|
|`recall_budget`|`mid`|召回详尽程度：`low` / `mid` / `high`|
|`recall_prefetch_method`|`recall`|自动召回方法：`recall`（原始事实）或 `reflect`（LLM 综合生成）|
|`recall_max_tokens`|`4096`|召回结果的最大 token 数|
|`recall_max_input_chars`|`800`|自动召回查询的最大输入字符数|
|`recall_prompt_preamble`|—|召回记忆在上下文中的自定义前言|
|`recall_tags`|—|搜索记忆时用于筛选的标签|
|`recall_tags_match`|`any`|标签匹配模式：`any` / `all` / `any_strict` / `all_strict`|
|`recall_types`|`observation`|召回中显示的事实类型（适用于自动召回和 `hindsight_recall` 工具）。接受逗号分隔的字符串或 JSON 列表。**默认值已缩窄为仅 `observation`**（见下文“行为变更”）。设置为 `observation,world,experience` 也会包含原始事实。|
|`recall_min_scores`|—|JSON 对象，用于设置每种分数的最低相关性（例如 `{"reranker": 0.25}` 或 `{"semantic": 0.5}`）。适用于自动召回和 `hindsight_recall` 工具。请参阅下方提示。|
|`auto_recall`|`true`|每轮开始前自动召回记忆|
|`recall_sync`|`false`|每轮针对**当前**消息同步召回（相关性更高，但会增加召回延迟）。默认关闭：召回在后台运行，并在下一轮注入。|
|`recall_indicator`|`true`|自动召回注入记忆时显示 `👁️ Hindsight — recalled N memories` 状态行。面向客户的智能体应关闭此项。|

> **行为变更：`recall_types` 默认仅包含 `observation`。**
>
> 以前，召回会返回所有三种事实类型。现在只返回观测。
>
> 根据 [Hindsight 文档](/developer/observations)，观测是 Hindsight 在原始事实之上构建的**整合后**知识层：它是基于证据的去重认知判断，会随新事实到来而不断完善，并带有支持事实数和更新状态信号。原始 `world` / `experience` 事实是构成观测的独立支持证据。对于每轮上下文注入，观测的单位 token 信息更密集，也能避免向模型重复提供已由观测概括的多个原始事实。
>
> 若要恢复宽泛的召回范围，请在 `~/.hermes/hindsight/config.json` 中将 `"recall_types"` 设为 `"observation,world,experience"`（字符串或 JSON 列表）。此设置适用于**自动召回和 `hindsight_recall` 工具**：两者读取相同的 `recall_types` 设置（工具模式没有单次调用的 `types` 参数），所以缩小默认值会同时缩小这两条路径的范围。

> **提示：使用 `recall_min_scores` 过滤离题的召回结果。**召回负责排序，并不判断相关性：即使问题与存储的所有内容都无关，系统仍会返回最多 `recall_max_tokens` 个最不差的记忆。`reranker` 分数可以清楚地区分两类结果——在较小的记忆库中，相关命中的分数为 0.7-0.97，而无关命中为 0.0-0.1。因此，在 `~/.hermes/hindsight/config.json` 中设置 `"recall_min_scores": {"reranker": 0.25}`，可以将这些噪声过滤为空召回。服务器只保证 `reranker` 和 `final` 阈值；`semantic` 或 `keyword` 阈值只会筛除各自检索分支的结果，而由其他分支找到的结果仍会返回，只是该阶段的分数为 `null`。因此，插件也会根据每个结果报告的分数检查所有阈值，并拒绝没有报告所设阈值阶段分数的结果。调整阈值前，请先检查自己的记忆库分数：使用多语言嵌入模型时，`{"semantic": 0.5}` 比 reranker 更能区分相关和无关查询。默认未设置，因此除非你主动启用，否则行为不会改变。

### 存入 {#retain}

|参数|默认值|说明|
|-----|---------|-------------|
|`auto_retain`|`true`|自动存入对话轮次|
|`retain_async`|`true`|在 Hindsight 服务器上异步处理存入操作|
|`retain_every_n_turns`|`1`|每 N 轮存入一次（1 = 每轮）|
|`retain_context`|`conversation between Hermes Agent and the User`|存入记忆的上下文标签|
|`retain_tags`|—|应用于存入记忆的默认标签；与每次工具调用的标签合并|
|`retain_source`|—|选择启用后，将 `metadata.source` 附加到存入的记忆中（用于标识存储客户端，例如 `hermes`）。默认为空——除非你设置此项，否则不会发送归因标签。|
|`retain_strategy`|—|随每条存储项发送的命名存入策略（`HINDSIGHT_RETAIN_STRATEGY`）。记忆库必须在 `retain_strategies` 下定义该策略；服务器会忽略未知名称。留空时由记忆库决定。|
|`retain_indicator`|`true`|存入一轮对话时显示 `👁️ Hindsight — saving to memory…` 状态行。面向客户的智能体应关闭此项。|
|`retain_user_prefix`|`User`|自动存入的对话记录中，用户轮次前使用的标签|
|`retain_assistant_prefix`|`Assistant`|自动存入的对话记录中，助手轮次前使用的标签|

### 集成 {#integration}

|参数|默认值|说明|
|-----|---------|-------------|
|`memory_mode`|`hybrid`|记忆如何融入智能体|

**memory_mode：**
- `hybrid` — 自动注入上下文，同时向 LLM 提供工具
- `context` — 仅自动注入，不向智能体提供工具
- `tools` — 仅提供工具，不自动注入

### 本地嵌入式 LLM {#local-embedded-llm}

|参数|默认值|说明|
|-----|---------|-------------|
|`llm_provider`|`openai`|`openai`，`anthropic`，`gemini`，`groq`，`openrouter`，`minimax`，`ollama`，`lmstudio`，`openai_compatible`|
|`llm_model`|每个提供商分别设置|模型名称（例如 `gpt-4o-mini`、`qwen/qwen3.5-9b`）|
|`llm_base_url`|—|`openai_compatible` 的端点 URL（例如 `http://192.168.1.10:8080/v1`）|

LLM API 密钥存储在 `~/.hermes/.env` 中，键名为 `HINDSIGHT_LLM_API_KEY`。

嵌入式守护进程是一个子进程，无法访问每轮对话的密钥作用域，因此会从 `~/.hindsight/profiles/<profile>.env` 读取密钥（在设置时以及配置变更时以仅所有者可读的权限写入该文件）。密钥的解析顺序为：显式配置 → 密钥作用域 → 磁盘上的 profile 环境文件。重写文件时采用失败关闭策略：如果构建版本没有密钥，绝不会覆盖已经包含密钥的 profile 文件。

插件仅管理该文件中的 LLM、日志级别和闲置超时配置项。文件中的其他内容（例如 `hindsight-embed` 记录的端口、租户扩展及其 `HINDSIGHT_API_TENANT_API_KEY`）会保持原样，不会被视为配置变更；插件客户端会将该租户密钥发送给守护进程。

## 工具 {#tools}

以下工具可用于 `hybrid` 和 `tools` 记忆模式：

|工具|说明|
|------|-------------|
|`hindsight_retain`|通过自动实体提取存储信息；支持可选的单次调用 `tags`|
|`hindsight_recall`|多策略搜索（语义 + 实体图谱）|
|`hindsight_reflect`|跨记忆综合生成（由 LLM 驱动）|

## 环境变量 {#environment-variables}

|变量|说明|
|----------|-------------|
|`HINDSIGHT_API_KEY`|Hindsight Cloud 的 API 密钥|
|`HINDSIGHT_LLM_API_KEY`|本地模式的 LLM API 密钥|
|`HINDSIGHT_API_LLM_BASE_URL`|本地模式的 LLM 基本 URL（例如 OpenRouter）|
|`HINDSIGHT_API_URL`|覆盖 API 端点|
|`HINDSIGHT_BANK_ID`|覆盖记忆库名称|
|`HINDSIGHT_BUDGET`|覆盖召回预算|
|`HINDSIGHT_MODE`|覆盖模式（`cloud`、`local_embedded`、`local_external`）|
|`HINDSIGHT_RETAIN_CONTEXT`|随每次存入的对话一同保存的标签（`retain_context`）|
|`HINDSIGHT_RETAIN_INDICATOR`|设为 `false` 可隐藏“正在存入记忆”状态行（`retain_indicator`）|
|`HINDSIGHT_RECALL_INDICATOR`|设为 `false` 可隐藏“已召回 N 条记忆”状态行（`recall_indicator`）|
|`HINDSIGHT_RECALL_SYNC`|设为 `true` 可在回答前针对当前消息进行召回（`recall_sync`）|

## 客户端版本 {#client-version}

需要 `hindsight-client >= 0.10.1`；使用 `local_embedded` 时还需要 `hindsight-embed >= 0.10.1`。低于此版本下限时只会记录警告；运行 `hermes plugins update hindsight` 可更新环境。

此插件在 API 层面实际只需要 0.6.1，但版本下限设为 0.10.1，因为 `hindsight-embed` 0.10.0 会彻底破坏 `local_embedded`：其守护进程探测会清除调用线程的事件循环，导致下一次客户端调用失败，并显示 `Timeout context manager should be used inside a task`。如果你在 2026-09-14 至 2026-09-21 期间安装了插件，请运行 `hermes update`（或 `hermes plugins update hindsight`）以升级到该版本下限以上。

## Hermes 网关（Telegram、Discord、Slack） {#hermes-gateway-telegram-discord-slack}

此提供程序适用于所有网关平台。Hermes 会为每条消息创建新的智能体，并随之重新初始化提供程序，因此无论使用哪个平台，每轮都会执行自动召回。

面向客户的机器人建议关闭两个设置：`recall_indicator` 和 `retain_indicator`；否则状态行 `👁️ Hindsight` 会显示在用户所在的频道中。

## 禁用 Hermes 内置记忆 {#disabling-hermes-built-in-memory}

Hermes 自带的记忆存储由本地 Markdown 文件支持（`MEMORY.md`，以及更精简的 `USER.md` profile）。如果两种记忆都启用，模型可能更倾向使用内置记忆，因此请关闭纯文本文件存储：

```bash
hermes config set memory.memory_enabled false
hermes config set memory.user_profile_enabled false   # 可选：禁用 USER.md profile
```

将两项都设为 `false` 后，智能体会完全移除内置的 `memory` 工具。之后如需重新启用，将相同的标志设回 `true` 即可。

如果保留内置存储，智能体在其中添加或替换的每条内容也会保存到 Hindsight 写入的每个记忆库，并带有 `builtin-memory`、`builtin-target:<memory|user>` 和 `builtin-action:<add|replace>` 标签。因此，从有大小上限的文件中清理掉事实后，这些事实也不会丢失。删除操作不会镜像到 Hindsight。

## 故障排查 {#troubleshooting}

**`/tools` 中没有显示工具** — 提供程序未配置时会跳过工具注册。检查 `hermes memory status` 是否报告 `hindsight` 为当前提供程序，并显示 `Status: available`。在 `memory_mode: context` 下，工具会按预期隐藏。

**`local_embedded` 模式显示 `Status: not available`** — 该插件自身的依赖包（`hindsight-client`、`hindsight-embed`）未安装到环境中；如果重建虚拟环境时移除了插件，就可能发生这种情况。运行 `hermes pm repair`，然后重启 Hermes 以重新构建环境。该虚拟环境**不需要**安装 Hindsight 服务器——服务器作为独立进程运行；如果尚无 `hindsight-api` 二进制文件，首次使用时会下载它。

**`Timeout context manager should be used inside a task`** — 这是 `hindsight-embed` 0.10.0 的问题。运行 `hermes plugins update hindsight`，升级到 0.10.1 版本下限。

**本地守护进程无法启动** — 检查日志：

```bash
cat ~/.hermes/logs/hindsight-embed.log     # 启动日志
cat ~/.hindsight/profiles/<profile>.log    # 守护进程运行日志
```

**召回没有返回内容** — 记忆至少需要经过一个存入周期，而提取操作需要调用 LLM。先存入一条事实，然后在后续轮次中询问它。
