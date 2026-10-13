---
sidebar_position: 10
title: "Hermes 智能体 Hindsight 持久记忆 |整合"
description: "通过Hindsight为Hermes智能体添加长期记忆。从 Hermes 插件目录安装，然后在每次转动之前自动记忆召回上下文以及未来会话的记忆存储对话。"
---

{/* 从 hindsight-integrations/hermes/README.md 生成 — 编辑该文件，然后运行
    节点hindsight-docs/scripts/sync-hermes-doc.mjs */}

:::tip 使用**Hermes 桌面应用**？您可以选择并配置Hindsight完全在“设置”中 — 没有 需要
终端。参见[Hermes Desktop](/sdks/integrations/hermes-desktop)。
:::

:::warning 已弃用：独立版 `hindsight-hermes`插件
旧**`hindsight-hermes`**pip插件（安装到Hermes虚拟环境和
通过注册 `hermes_agent.plugins`入口点）是**已弃用** — 当前Hermes
构建其工具失败并显示`{"error": "Timeout context manager should be used inside a task"}`。
关注[将 hindsight-hermes 迁移至 Hermes 原生记忆](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)
在保持相同记忆库的情况下进行切换。
:::

知识图、实体解析和多策略检索的长期记忆。支持云端、本地嵌入、本地外部模式。

A[Hermes Agent](https://github.com/NousResearch/hermes-agent) 记忆提供者插件，安装自
theHermes插件目录。它曾经在里面运送Hermes为 `plugins/memory/hindsight/`；诺斯研究
将所有记忆提供者移出核心树，因此现在由 Hindsight 团队维护
[vectorize-io/hindsight](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/hermes)
目录将其固定在此处。

[查看更新日志 →](/changelog/integrations/hermes)

## 安装 {#install}

Hindsight 位于 Hermes 插件目录中，因此您只需要名称即可：

```bash
hermes plugins install hindsight
hermes memory setup           # select "hindsight"
```

`plugins install` 在启用插件之前要求确认。通过`--enable`（或
​​ `--no-enable`) 跳过提示，这正是您在脚本或无人值守运行中想要的。

中的依赖关系 `pyproject.toml` 安装在Hermes生存并生存`hermes update`。
Hermes 在准备它们之前询问：打印找到新插件依赖项的更新
`<plugin> declares Python dependencies` 然后等待“是”。无人值守`hermes update`将会
按照提示坐下而不是完成。

`hermes plugins enable` 是*不是*什么激活了记忆提供者 —Hermes将提供者视为
`kind: exclusive` 由插件启用逻辑刻意跳过。记忆提供者通过以下配置激活：
`memory.provider: <name>` `config.yaml`，其中 `hermes memory setup`写道。

### local_embedded 的运行方式 {#how-localembedded-runs}

TheHindsight服务器是 **不** 的依赖Hermes' venv。 `local_embedded` 开始它作为
单独的进程——已安装的`hindsight-api` 二进制，否则为 `uvx hindsight-api`后备
获得自己的环境 - 并与其进行 HTTP 对话。这个venv只保留`hindsight-client` 和
`hindsight-embed`，均在中声明 `pyproject.toml`，所以每个模式都会安装插件并且
运行时无需获取任何内容。

这不是尺寸优化，它是唯一可安装的形状。 `hindsight-all`拉动整体
`hindsight-api-slim` 树，无法解析Hermes'固定附加功能：api-slim 需求
`protobuf>=7.35.1`同时`mem0ai==2.0.10` 和 `modal==1.5.5` 将其限制在 7.0 以下，并且
`opentelemetry-semantic-conventions>=0.65b0`同时`mistralai==2.4.8` 将其限制在 0.61 以下。放松
一个图钉只能揭开下一个图钉。 macOS arm64 上也有 482 MB，Linux x86_64 上也有 3.2 GB（
CUDA 轮子火炬拉到那里），云模式用户无需支付任何费用。 因此，

`_new_embedded_client`因此构成了旧的`hindsight.HindsightEmbedded` 包装组成
内部 — `hindsight_embed.get_embed_manager()`加`hindsight_client.Hindsight` — 而不是
导入它。 **现有嵌入式用户的全部数据会保留**：配置文件决定守护进程，因此
数据库（`~/.pg0/instances/hindsight-embed-<profile>/`) 和配置文件环境
(`~/.hindsight/profiles/<profile>.env`）是相同的文件，读取方式相同。没有迁移步骤，没有
重新设置。

插件不再调用`tools.lazy_deps.install_specs` 从任何地方。在包管理器上Hermes
这是一个已退役的垫片，它将进程交给更新程序并退出而不是安装，所以
每个`hermes` 调用变成了约 40 秒的“更新”，耗尽了 `hermes-gateway` 仍然离开了
import missing (NousResearch/hermes-agent#126494, fixed upstream in af26acab73 to raise
`ImportError`）。没有什么可以安装的了。

## 从内置提供程序迁移 {#coming-from-the-built-in-provider}

Hindsight用于内部运输Hermes为 `plugins/memory/hindsight/`。 Nous Research 删除了该副本 2026 年 9 月 23 日的
，提供商现在改为从目录安装。 **你不需要做
任何事情**——你的记忆不会受到影响。

`hermes update`，以及为从未运行过它的桌面用户调用的智能体启动Hermes'
`memory_provider_migration`：它看到`memory.provider: hindsight`已配置，找不到提供商
disk，在插件目录中查找名称并将其安装在已审核的提交引脚上。你会看到：

```
✓ 记忆提供程序 'hindsight' 已从核心移出，已从目录安装对应插件
  （你的 memory.hindsight 设置与数据保持不变）。
```

您的数据从未存在于Hermes树中：记忆位于您的Hindsight记忆库中 - Hindsight Cloud中，或者
对于`local_embedded`个人资料目录`~/.hindsight/profiles/<profile>`及其嵌入
PostgreSQL实例。移动提供商代码不会触及任何内容，并且您的
`~/.hermes/hindsight/config.json` 的读法与之前完全相同。

如果迁移无法运行 — 离线，或者目录获取失败 — Hermes 打印手册
一句台词，而不是在没有记忆的情况下默默开始：

```bash
hermes plugins install hindsight
```

## 更新 {#updating}

**插件不会自行更新。** 无论您选择下面哪种模式，代码只会移动
当您运行命令时。特别是`hermes update` 确实*不是*移动它：它会重新安装
插件的 Python 依赖项并将结帐保留在原来的位置。如果您使用内置
提供者，这是一个值得改掉的习惯——记忆力的提高不再是一个侧面
更新Hermes的效果。

Hermes 最多每 6 小时重新获取一次已发布的目录，因此是一个新发布的版本
可能需要很长时间才能显示为可用。

### 使用官方固定版本（默认） {#follow-the-official-pin-default}

你从中得到什么`hermes plugins install hindsight`：提交 Nous 审查并固定在他们的
目录。

```bash
hermes plugins update hindsight    #移动到目录的当前图钉
一旦您安装的提交与
```

`hermes plugins list` 标记插件 `update_available` 一旦您安装的提交与
目录的。重新运行`hermes plugins install hindsight` **不**更新它——它拒绝
与“已经存在”； `plugins update` 是重新固定的命令。

### 固定特定版本 {#pin-a-specific-release}

对于您选择并冻结的版本，请使用显式提交进行安装：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

替换整个占位符，包括尖括号：`<` 和 `>` 是重定向运算符
大多数 shell，因此将它们留在其中会使命令无法解析。如果您复制这两行，请保留
尾随`\` 在第一个的末尾或将它们连接成一行，因为 `\`已关注
除换行符之外的任何内容也是解析错误。

`--ref` 采用完整的 40 个字符提交 SHA 和 **拒绝标签名称**，所以从
发行说明[发行版](https://github.com/vectorize-io/hindsight/releases)你更想要
比打字`v1.1.0`。提交旁边的复制按钮
[插件历史记录](https://github.com/vectorize-io/hindsight/commits/main/hindsight-integrations/hermes)
给你完整的SHA；屏幕上显示的缩写太短。

A`--ref` 安装标记为固定，并且 `hermes plugins update hindsight`故意拒绝
移动它 — 使用新的再次安装 `--ref` 当您想要不同的版本时。

### 追踪最新开发代码 {#track-the-latest-development-code}

用于在到达目录之前进行修复。从源路径而不是目录名称安装：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight    #现在是我们 git pull 的主要分支
```

根据定义未经审查 - 你会得到任何内容 `main` 在你运行它的那一刻。

目录条目位于 Nous 的存储库中
[`plugin-catalog/hindsight.yaml`](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/hindsight.yaml),
记录当前引脚。

## 环境要求 {#requirements}

- **云端：**API来自的钥匙 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **本地嵌入式：**API支持的键LLM提供者（OpenAI,Anthropic,Gemini，Groq，OpenRouter，MiniMax，Ollama，或任何OpenAI兼容端点）。嵌入和重排序在本地运行 - 无需额外  需要API钥匙。
- **本地外部服务：** 运行Hindsight实例（Docker或自托管）可通过 HTTP 访问。

## 设置 {#setup}

```bash
hermes memory setup    # select "hindsight"
```

安装向导不安装任何内容（插件附带依赖项），引导您完成配置，并提供使用 为记忆库播种 **初始记忆模板**（一组精选的dispositions/instructions适用于常见的智能体角色）——您可以跳过它，它会在覆盖已配置的记忆库之前发出警告。

或手动（默认云模式）：
```bash
hermes config set memory.provider hindsight
echo "HINDSIGHT_API_KEY=your-key" >> ~/.hermes/.env
```

### 云 {#cloud}

连接到Hindsight CloudAPI。需要一个API来自的钥匙 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)。

### 本地嵌入式 {#local-embedded}

Hermes 启动带有内置 PostgreSQL 的本地 Hindsight 守护进程。需要LLMAPI密钥进行记忆提取和合成。该守护进程在首次使用时自动在后台启动，并在 5 分钟不活动后停止。

支持任何OpenAI兼容LLM端点（llama.cpp、vLLM、LM Studio 等）— 选择 `openai_compatible` 作为提供商并输入基本 URL。

守护进程启动日志：`~/.hermes/logs/hindsight-embed.log`
守护进程运行时日志：`~/.hindsight/profiles/<profile>.log`

打开Hindsight Web UI（仅限本地嵌入模式）：
```bash
hindsight-embed -p hermes ui start
```

### 本地外部 {#local-external}

将插件指向您已经运行的现有Hindsight实例（Docker、自托管等）。没有守护进程管理——只有一个 URL 和一个可选的 API 密钥。

## 配置 {#config}

配置文件：`~/.hermes/hindsight/config.json`

### 连接 {#connection}

|钥匙|默认|说明|
|-----|---------|-------------|
|`mode`|`cloud`|`cloud`，`local_embedded`，或`local_external`|
|`api_url`|`https://api.hindsight.vectorize.io`|API URL（云和local_external模式）|

### 记忆库 {#memory-bank}

|钥匙|默认|说明|
|-----|---------|-------------|
|`bank_id`|`hermes`|记忆 记忆库名称（当 时使用静态回退 `bank_id_template` 未设置或解析为空）|
|`bank_id_template`|—|动态导出记忆库名称的可选模板。占位符：`{profile}`，`{workspace}`，`{project}`，`{platform}`，`{user}`，`{session}`。 `{project}` 是 git 存储库的名称Hermes跑进去；存储库的每个工作树都会解析为相同的名称，并且在存储库外部或根目录下的工作树中它是空的。示例：`hermes-{profile}` 隔离每个活动的记忆Hermes个人资料，`{project}` 为每个存储库提供了自己的记忆库。空占位符会干净地折叠（例如 没有用户的 `hermes-{user}`变成`hermes`）。|
|`mirror_to_own_bank`|`false`|也写信给`bank_id` 当模板解析为不同的记忆库时，因此配置文件在项目记忆库中工作时会保留自己的记忆。|
|`additional_banks`|—|按优先顺序写入和记忆召回的额外记忆库。|
|`recall_additional_banks`|—|额外记忆库到记忆召回但从未写入，写入记忆库后搜索。别名`recallAdditionalBanks`，名字Claude Code集成使用。 中还列出了一个记忆库 `additional_banks` 保持可写。|
|`trusted_project_dirs`|—|绝对文件夹，其 git 存储库可以使用 选择自己的记忆库 `.hindsight/config.toml`。默认情况下为空，因此克隆存储库无法重定向您的记忆。|
|`bank_mission`|—|反思使命（identity/framing 反思推理）。通过记忆库API应用。|
|`bank_retain_mission`|—|记忆存储任务（引导提取的内容）。通过记忆库API应用。|

#### 多个记忆库 {#multiple-banks}

主要记忆库按以下顺序选择：a `.hindsight/config.toml` 在受信任的存储库中，然后 `bank_id_template`，然后`bank_id`。写入到主节点，然后 `bank_id`当`mirror_to_own_bank` 开启，然后每个 `additional_banks`条目。 记忆召回搜索相同的记忆库，然后每个 `recall_additional_banks` 一次性输入，每个都有配置的预算和 `recall_max_tokens`；结果按该顺序合并并按文本删除重复项。 预计仅使用主要记忆库。

三个列表设置采用JSON列表或逗号分隔的文本；对于包含逗号的值，请使用 JSON 形式。

发生故障的额外记忆库会被跳过五分钟，当它出现故障时会出现一条警告，当它再次应答时会出现一条信息行； 记忆召回和写入分别冷却，并且记忆库会在写入冷却时错过所做的写入。 80% 后还没有回答的额外记忆库 `timeout`算作失败，所以它不会影响初选的结果。发生故障的主记忆库会导致调用失败，就像处理单个记忆库一样，并且在触及任何额外的记忆库之前，写入会停止在那里。

本身位于其中一个的存储库 `trusted_project_dirs`（链接的工作树是根据工作树在哪里来判断的）可以在中命名其记忆库 `.hindsight/config.toml` 在其根目录或其下面的任何文件夹中：

```toml
bank_id = "acme-billing"
```

查找在存储库根停止。只有`bank_id` 已读取。

### 记忆召回 {#recall}

|钥匙|默认|说明|
|-----|---------|-------------|
|`recall_budget`|`mid`|记忆召回彻底性：`low` / `mid` / `high`|
|`recall_prefetch_method`|`recall`|自动记忆召回方法：`recall`（原始事实）或`reflect` (LLM合成）|
|`recall_max_tokens`|`4096`|记忆召回结果的最大 token 数|
|`recall_max_input_chars`|`800`|自动记忆召回的最大输入查询长度|
|`recall_prompt_preamble`|—|自定义序言，用于回忆上下文中的记忆|
|`recall_tags`|—|搜索记忆时要过滤的标签|
|`recall_tags_match`|`any`|标签匹配模式：`any` / `all` / `any_strict` / `all_strict`|
|`recall_types`|`observation`|记忆召回所呈现的事实类型（自动记忆召回和 `hindsight_recall`工具）。以逗号分隔的字符串或JSON列表。 **默认范围缩小为仅 `observation`**（参见下面的“行为改变”）。设置为 `observation,world,experience` 还包括原始事实。|
|`recall_min_scores`|—|每个分数字段的最小相关性，作为JSON对象（例如 `{"reranker": 0.25}`或`{"semantic": 0.5}`）。适用于自动记忆召回和 `hindsight_recall`工具。请参阅下面的提示。|
|`auto_recall`|`true`|每回合前自动记忆召回|
|`recall_sync`|`false`|记忆召回与*当前 每轮*消息同步（更高相关性，增加记忆召回延迟）。默认关闭：记忆召回在后台运行，并在下一回合注入。|
|`recall_indicator`|`true`|显示`👁️ Hindsight — recalled N memories` 自动记忆召回注入记忆时的状态线。关闭面向客户的智能体。|

> **行为变更：`recall_types` 默认仅包含 `observation`。**
>
> 以前记忆召回返回所有三种事实类型。现在它只返回观察。
>
> 每[Hindsight 文档](/developer/observations)，观察就是**已整合**知识层Hindsight建立在原始事实之上：基于证据的重复数据删除信念，随着新事实的到来而完善，并带有证据数量和新鲜度信号。生`world` / `experience` 事实是为他们提供支持的个人支持证据。对于每轮上下文注入，观察的每个标记更密集，并避免向模型提供一个观察已经总结的多个原始事实。
>
> 用恢复广泛的记忆 `"recall_types": "observation,world,experience"`（字符串或JSON列表）在`~/.hermes/hindsight/config.json`。这适用于**两者** 自动记忆召回和 `hindsight_recall` 工具 — 两者读起来相同 `recall_types` 设置（工具模式没有每次调用`types` 参数），因此缩小默认值会缩小两条路径。

> **提示：使用 `recall_min_scores` 避免召回偏离主题的记忆。**记忆召回排名，它不判断相关性：一个问题 与存储的任何内容无关的
> 与存储的任何内容无关仍然返回最多`recall_max_tokens` 最不糟糕的回忆。的
> `reranker` 分数将两者完全分开 - 在小型记忆库上，相关命中得分为 0.7-0.97，而无关命中得分为 0.7-0.97
> 0.0-0.1 — 所以 `"recall_min_scores": {"reranker": 0.25}` `~/.hermes/hindsight/config.json` 消除噪音
> 进入空洞的记忆。服务器仅保证`reranker` 和 `final`楼层；一个`semantic`或`keyword`楼层
> 仅修剪其自己的检索臂，而另一臂找到的结果仍会返回 `null`分数
> 那个阶段。因此，该插件还会根据每个结果报告的分数检查每个楼层，并拒绝
> 不报告地板阶段的结果。在调整楼层之前检查您自己的记忆库中的分数：使用
> 多语言嵌入模型，`{"semantic": 0.5}` 比相关查询更好地分离相关查询和不相关查询
> 重排序器做到了。默认情况下未设置，因此除非您选择加入，否则不会发生任何变化。

### 记忆存储 {#retain}

|钥匙|默认|说明|
|-----|---------|-------------|
|`auto_retain`|`true`|自动记忆存储对话|
|`retain_async`|`true`|在Hindsight服务器上异步处理记忆存储|
|`retain_every_n_turns`|`1`|记忆存储每 N 回合（1 = 每回合）|
|`retain_context`|`conversation between Hermes Agent and the User`|保留记忆的上下文标签|
|`retain_tags`|—|应用于保留记忆的默认标签；与每次调用工具标签合并|
|`retain_source`|—|选择加入 `metadata.source` 附加到保留的记忆（标识存储客户端，例如 `hermes`）。默认为空 - 除非您设置，否则不会发送任何归因标签。|
|`retain_strategy`|—|与每个存储项目一起发送的命名记忆存储策略 (`HINDSIGHT_RETAIN_STRATEGY`）。记忆库必须在下定义它 `retain_strategies`；服务器会忽略未知的名称。空让记忆库决定。|
|`retain_indicator`|`true`|显示`👁️ Hindsight — saving to memory…` 保存回合时的状态行。关闭面向客户的智能体。|
|`retain_user_prefix`|`User`|用户提交自动保留的成绩单之前使用的标签|
|`retain_assistant_prefix`|`Assistant`|助理提交自动保留的成绩单之前使用的标签|

### 集成 {#integration}

|钥匙|默认|说明|
|-----|---------|-------------|
|`memory_mode`|`hybrid`|记忆如何融入智能体|

**memory_mode:**
- `hybrid` — 自动上下文注入 + 可用的工具LLM
- `context` — 仅自动注射，无工具暴露
- `tools` — 仅工具，无自动注入

### 本地嵌入式LLM {#local-embedded-llm}

|钥匙|默认|说明|
|-----|---------|-------------|
|`llm_provider`|`openai`|`openai`，`anthropic`，`gemini`，`groq`，`openrouter`，`minimax`，`ollama`，`lmstudio`，`openai_compatible`|
|`llm_model`|每个提供商|型号名称（例如 `gpt-4o-mini`，`qwen/qwen3.5-9b`)|
|`llm_base_url`|—|的端点 URL `openai_compatible`（例如`http://192.168.1.10:8080/v1`)|

TheLLMAPI密钥存储在 `~/.hermes/.env` 为 `HINDSIGHT_LLM_API_KEY`。

嵌入式守护进程是一个无法看到每回合秘密的子进程
范围，因此它从读取密钥 `~/.hindsight/profiles/<profile>.env`
（仅在设置和配置更改时具体化所有者）。关键决议
顺序是显式配置 → 秘密范围 → 磁盘配置文件环境，以及
重写路径失败关闭：没有密钥的构建永远不会破坏配置文件
已保存一个文件。

插件仅拥有该文件中的LLM、日志级别和空闲超时键。里面还有什么东西
（端口事后嵌入记录、租户扩展及其 `HINDSIGHT_API_TENANT_API_KEY`) 是
单独留下，永远不会算作配置更改，并且插件的客户端将该租户密钥发送到
守护进程。

## 工具 {#tools}

有售`hybrid` 和 `tools`记忆模式：

|工具|说明|
|------|-------------|
|`hindsight_retain`|通过自动实体提取存储信息；支持可选的每次调用 `tags`|
|`hindsight_recall`|多策略搜索（语义+实体图）|
|`hindsight_reflect`|交叉记忆合成（LLM驱动）|

## 环境变量 {#environment-variables}

|变量|说明|
|----------|-------------|
|`HINDSIGHT_API_KEY`|API Hindsight Cloud密钥|
|`HINDSIGHT_LLM_API_KEY`|LLM API 本地模式键|
|`HINDSIGHT_API_LLM_BASE_URL`|LLM 本地模式的基本 URL（例如 OpenRouter）|
|`HINDSIGHT_API_URL`|覆盖API端点|
|`HINDSIGHT_BANK_ID`|覆盖记忆库名称|
|`HINDSIGHT_BUDGET`|覆盖记忆召回预算|
|`HINDSIGHT_MODE`|覆盖模式 (`cloud`，`local_embedded`，`local_external`)|
|`HINDSIGHT_RETAIN_CONTEXT`|与每个保留对话一起存储的标签 (`retain_context`)|
|`HINDSIGHT_RETAIN_INDICATOR`|`false` 隐藏“保存到记忆”状态行（`retain_indicator`)|
|`HINDSIGHT_RECALL_INDICATOR`|`false`隐藏“召回N个记忆”状态栏（`recall_indicator`)|
|`HINDSIGHT_RECALL_SYNC`|`true` 在回答之前回忆当前消息（`recall_sync`)|

## 客户端版本 {#client-version}

需要`hindsight-client >= 0.10.1` 且，对于 `local_embedded`，`hindsight-embed >= 0.10.1`。下面有一个版本
楼层仅记录警告； `hermes plugins update hindsight` 移动环境。

该插件在 API 级别所需的下限是 0.10.1，而不是 0.6.1，因为
`hindsight-embed` 0.10.0 中断 `local_embedded` 彻底：它的守护进程探针清除了调用
线程的事件循环，因此下一个客户端调用失败，并显示“应使用超时上下文管理器”
任务内`. If you installed between 2026-09-14 and 2026-09-21, run `爱马仕更新`（或
`hermes plugins update hindsight`) 移开它。

## Hermes 网关（Telegram、Discord、Slack） {#hermes-gateway-telegram-discord-slack}

提供商适用于每个网关平台。 Hermes 为每条消息构建一个新的智能体，并且
provider 会用它重新初始化，因此无论平台如何，每轮都会运行自动记忆召回。

对于面向客户的机器人，有两个设置值得关闭：`recall_indicator` 和
`retain_indicator`，否则打印 `👁️ Hindsight` 进入用户频道的状态行。

## 禁用Hermes'内置记忆 {#disabling-hermes-built-in-memory}

Hermes有自己的记忆存储，由本地 Markdown 文件支持（`MEMORY.md`，加上更苗条的`USER.md`
简介）。当两者都处于活动状态时，模型可能更喜欢内置的，因此请关闭平面文件存储：

```bash
hermes config set memory.memory_enabled false
hermes config set memory.user_profile_enabled false   #可选：USER.md 配置文件
```

将两者设置为`false` 删除内置`memory` 完全来自智能体的工具。稍后重新启用
通过将相同的标志设置回`true`。

如果您保持内置存储打开，智能体在其中添加或替换的每个条目也会保存到
每个记忆库Hindsight写入，标记为 `builtin-memory`，`builtin-target:<memory|user>` 和 `builtin-action:<add|replace>`,
因此从大小上限文件中删除的事实不会丢失。删除不会被镜像。

## 故障排查 {#troubleshooting}

**`/tools` 中未显示工具** — 未配置时提供程序会跳过工具注册。
检查`hermes memory status`报告`hindsight` 作为活跃提供者并且 `Status: available`。在
`memory_mode: context` 这些工具是故意隐藏的。

**`local_embedded` 模式中显示 `Status: not available`** — 这个插件自己的包 环境中缺少
(`hindsight-client`，`hindsight-embed`）从环境中丢失，当 venv
rebuild 删除了插件成员。运行`hermes pm repair`并重新启动Hermes重建它们。的Hindsight服务器是  该 venv 中需要*不是*- 它作为单独的运行
处理，如果没有则首次使用下载`hindsight-api` 二进制文件还存在。

**`Timeout context manager should be used inside a task`** — `hindsight-embed` 0.10.0。运行
`hermes plugins update hindsight`移动到0.10.1层。

**本地守护进程无法启动** — 检查日志：

```bash
cat ~/.hermes/logs/hindsight-embed.log     # startup
cat ~/.hindsight/profiles/<profile>.log    #守护进程运行时
```

**记忆召回未返回结果** — 记忆至少需要一个记忆存储周期，而提取是一种LLM打电话。
存储一个事实，然后在稍后的回合中询问它。
