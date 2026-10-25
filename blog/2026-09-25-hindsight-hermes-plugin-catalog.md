---
title: "Hindsight + Hermes = AGI？"
authors: [benfrank241]
slug: "2026/09/25/hindsight-hermes-plugin-catalog"
date: 2026-09-25T15:00
tags: [hindsight, hermes, nous-research, plugins, memory-provider, integration, migration]
description: "Hermes 已将记忆提供方从核心代码移入插件目录，Hindsight 是首个迁移的提供方。本文介绍发生了什么、你需要采取什么行动，以及现在如何获取更新。"
image: /img/blog/hindsight-hermes-agi.webp
hide_table_of_contents: true
---

![是的。](/img/blog/hindsight-hermes-agi.webp)

是的。

不，显然不是。不过既然你已经来了：[Hermes Agent](https://github.com/NousResearch/hermes-agent) 本周将记忆提供方从核心代码库移到了插件目录，Hindsight 是第一个迁移的提供方。如果你已经同时运行这两者，就应该了解这对你意味着什么。

这意味着什么也不会改变。这正是本文的全部要点；如果愿意，你现在就可以停止阅读。想了解细节的读者请继续。

<!-- truncate -->

## 简要概览 {#tldr}

- **如果你已经在 Hermes 中使用 Hindsight，一切都不会改变。** 提供方名称、设置、记忆库和数据目录都保持原样。
- **Hermes 会自动完成迁移**，触发时机是运行 `hermes update` 或首次启动智能体。你只会看到一行确认信息，不会有其他变化。
- **插件现在位于 Hindsight 仓库中**，由 Hindsight 团队维护，不再随 Hermes 一起发布。
- **新用户从目录安装插件**：运行 `hermes plugins install hindsight`，然后运行 `hermes memory setup`。
- **`hermes update` 不会更新插件。** 更新插件要运行 `hermes plugins update hindsight`。你也可以用 `--ref` 固定版本，或跟踪我们的 `main` 分支。
- **有一个确实容易踩到的问题**，而且它早在这次变更之前就存在：`hermes plugins enable` 不会激活记忆提供方。

## 实际发生了什么 {#what-actually-happened}

Nous Research 正在把所有记忆提供方从 `hermes-agent` 核心代码树移出，分别放到各自维护者的仓库，并通过[插件目录](https://hermes-agent.nousresearch.com/docs/plugins)发布。他们的文档对此说得很直白：

> 记忆提供方正从 Hermes 代码树移到各自维护者的仓库，通过插件目录发布。Hindsight 是第一个。

这项变更于 9 月 23 日在上游合入，PR 标题为“hindsight moves to the plugin catalog (auto-migrated on first start / hermes update)”。Hermes 中原先随附的 `plugins/memory/hindsight/` 目录已删除，插件现在位于 Hindsight 仓库的 `hindsight-integrations/hermes/` 下，由我们维护。

这对所有人都有好处。记忆提供方如果捆绑在别人的代码树里，发布速度就受那棵代码树的发布周期限制；而 Hindsight 提供方的错误也得由一个做智能体、而非记忆系统的团队来修复。现在，编写记忆系统的人可以直接发布修复。

## 如果你已经在使用 Hindsight：一切照旧 {#if-you-already-use-hindsight-nothing-changes}

这一点值得重复，因为“我们迁移了你的集成”通常意味着你要花一个周末来处理。

你的 `memory.hindsight` 设置仍然有效。记忆库的 ID 和内容都不变。API 密钥仍保存在 `~/.hermes/.env`。`~/.hermes/hindsight/config.json` 不会被修改。三个工具仍叫作 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。

迁移会自动进行。运行 `hermes update`，或者直接启动一个已配置 Hindsight 提供方的智能体，Hermes 就会根据目录解析提供方名称，并为你安装插件。你会看到类似下面的一行信息：

```
✓ Memory provider 'hindsight' moved out of core — installed its plugin from the
  catalog (your memory.hindsight settings and data are unchanged).
```

之后，插件会放在 `~/.hermes/plugins/hindsight/`，而你的 `config.yaml` 会增加 `plugins.enabled: [hindsight]`。迁移就这样完成了。

我们在一台仍使用捆绑提供方的机器上实际运行了迁移。开始前有两点值得了解。更新过程是**交互式的**：它会询问是否准备插件的 Python 依赖，但不会自行回答；因此，无人值守的运行会停在提示处，无法完成。如果你在 Hermes 代码树中做过本地修改，更新前会先暂存这些修改，再询问是否恢复；它会打印 `git stash apply <sha>`，你需要留好这条命令。

迁移后，`~/.hermes/plugins/.install-metadata.json` 会准确记录你安装的内容：目录固定版本、源代码仓库和解析得到的提交。我们这次安装的是固定在 `176f8c2d` 的 1.0.1 版本。

需要留意一个条件：自动安装依赖于 `security.allow_lazy_installs`，该设置默认开启。如果你关闭了它，Hermes 不会在后台替你安装任何内容，而是只记录一行日志，提示你自行运行 `hermes plugins install hindsight`。

## 如果你是刚开始使用 {#if-you-are-starting-fresh}

只需运行两条命令：

```bash
hermes plugins install hindsight
hermes memory setup    # 选择 "hindsight"
```

Hindsight 已在目录中，因此第一条命令只需写名称。随后，设置向导会通过 `uv` 将依赖安装到 Hermes 的 venv 中，引导你完成配置，并提供用初始记忆模板填充记忆库的选项。覆盖已配置的记忆库之前，它会发出警告；你也可以完全跳过模板。

不要跳过第二条命令，原因见下文。

## 最容易让人弄错的一点 {#the-one-thing-that-trips-people-up}

这件事早在迁移之前就存在，也一直会让人困惑，所以值得明确说明：

**`hermes plugins enable` 不会激活记忆提供方。**

Hermes 将记忆提供方视为 `kind: exclusive`，而插件启用检查会有意跳过这类提供方。真正负责激活提供方的是 `config.yaml` 中的 `memory.provider: hindsight`，该设置由 `hermes memory setup` 写入。只安装并启用插件、却不运行设置向导，会导致提供方虽然已安装，却没有投入使用。

嵌入模式还有一个相关陷阱。`local_embedded` 需要的是 `hindsight-all` 包，而不只是客户端。`pyproject.toml` 有意不声明这个依赖，因为那会迫使使用云模式、完全不需要本地机器学习组件的用户也安装整套本地 ML 依赖。设置向导会安装它；插件也会在检查可用性时自行补装，以作兜底。但如果只运行 `plugins install` 而不运行 `memory setup`，嵌入模式就会报告“not available”。

这两种情况都适用的一条规则是：始终运行 `hermes memory setup`。

## 三种模式，保持不变 {#three-modes-unchanged}

既然这次迁移正好提供了检查配置的机会，也一并列出三种模式：

| 模式 | 功能 | 所需内容 |
|---|---|---|
| `cloud` | 连接 Hindsight Cloud | 从 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 获取 API 密钥 |
| `local_embedded` | Hermes 运行带内置 PostgreSQL 的本地 Hindsight 守护进程 | 用于提取和综合生成的 LLM API 密钥；嵌入和重排序在本地运行 |
| `local_external` | 指向你已经运行的 Hindsight 实例 | URL 和可选的 API 密钥 |

嵌入模式会在首次使用时于后台启动守护进程，并在闲置五分钟后将其停止。它支持任何兼容 OpenAI 的端点，因此 llama.cpp、vLLM 和 LM Studio 都可以使用：选择 `openai_compatible` 并提供基 URL。如果想让 Hindsight Web 界面连接到你的嵌入式实例，可以运行 `hindsight-embed -p hermes ui start`。

## 更新：需要改掉的习惯 {#updating-the-habit-to-unlearn}

对你来说，真正变化的是一项习惯，而不是命令本身。

**插件不会自动更新。** 特别是，`hermes update` 不会更新它。这个命令会重新安装插件的 Python 依赖，但会让当前检出的代码保持原样。如果你之前使用的是捆绑提供方，就需要放下“更新 Hermes 时记忆功能也会顺带改进”的预期：记忆功能的改进不再随 Hermes 更新自动送达。

你可以用三种方式决定运行哪个版本。

### 跟随官方固定版本 {#follow-the-official-pin}

这是默认方式，也适合绝大多数人。运行 `hermes plugins install hindsight` 时会采用这种方式：安装 Nous 已审核并固定在目录中的提交。

```bash
hermes plugins update hindsight    # 切换到目录当前固定的提交
```

如果已安装提交与目录中的提交不同，`hermes plugins list` 会将插件标记为 `update_available`。请注意，重新运行 `hermes plugins install hindsight` **不会**更新插件，它会以“already exists”拒绝安装。负责重新固定版本的命令是 `plugins update`。

这个固定版本机制有两个后果，需要记住。我们合入的变更不会在合入时立即送达用户；必须先移动目录中的固定版本，这需要再向 `hermes-agent` 提交一个 PR。另外，Hermes 最多每六小时才会重新获取一次已发布的目录，因此新发布的版本可能要等六小时才会显示为可用。如果我们今天发布的内容还没有出现，通常就是这个原因。

### 固定到指定版本 {#pin-a-specific-release}

选择一个版本并将其固定：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

关于 `--ref` 有两点要注意。它需要完整的提交 SHA，**不接受标签名称**，所以请从[发布说明](https://github.com/vectorize-io/hindsight/releases)复制 SHA，不要直接填写 `v1.0.1`。此外，使用 `--ref` 安装的插件会被标记为已固定，因此 `hermes plugins update hindsight` 会有意拒绝切换版本。这正是固定版本的目的。如果想用其他版本，请换一个新的 `--ref` 再次安装。

### 跟踪最新开发代码 {#track-the-latest-development-code}

如果想在修复进入目录之前先使用它，可以通过源代码路径而不是目录名称安装：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight    # 此时会拉取我们的 main 分支
```

更新命令相同，含义却不同：按这种方式安装后，它会跟踪我们的 `main` 分支。也就是说，运行时会获取当时分支上的内容，按定义未经审核。适合追踪刚合入的修复，或与我们一起测试；我们不会在生产环境中这样运行。

目录条目本身位于 Nous 的仓库 [`plugin-catalog/hindsight.yaml`](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/hindsight.yaml)，其中记录了当前固定版本。

**有一项更新不应拖延。** 如果你在 2026 年 9 月 14 日至 21 日期间安装了 `hindsight-embed` 0.10.0，它会让 `local_embedded` 完全无法使用：该版本的守护进程探测会清空调用线程的事件循环，导致下一次客户端调用失败，并报错 `Timeout context manager should be used inside a task`。这就是为什么客户端的最低版本要求是 0.10.1，而不是插件在 API 层面所需的 0.6.1。这里运行 `hermes update` 确实能解决问题，因为问题出在依赖项，而不是插件代码。

## 需要了解的一项默认设置 {#one-default-worth-knowing-about}

现在，Recall 默认只返回**观测**；过去默认返回全部三种事实类型。

观测是 Hindsight 的整合层：它们是去重后的认知判断，有证据依据，带有支持事实数和更新状态信号，并会随着新事实到来而不断完善。原始 `world` 和 `experience` 事实则是底层的单条证据。在逐轮上下文注入时，观测所含的信息更密集，平均每个 token 承载的信息更多，也能避免把五条已被一条观测概括的原始事实都交给模型。

如果想恢复旧行为，请在 `~/.hermes/hindsight/config.json` 中设置 `"recall_types": "observation,world,experience"`。请注意，这个设置同时控制自动召回和 `hindsight_recall` 工具，因为该工具的 schema 没有按单次调用指定类型的参数。默认范围缩窄后，两者都会受影响。

## 每轮的行为方式 {#how-it-behaves-per-turn}

既然迁移是检查配置的好时机，下面列出影响日常行为的三项设置：

`memory_mode` 决定记忆如何传给模型。默认的 `hybrid` 会自动注入上下文，并开放三个工具。`context` 只注入上下文，不开放工具。`tools` 开放工具但不注入上下文；如果你希望由模型决定何时调用记忆工具，就应选择这一项。

`auto_recall` 和 `auto_retain` 默认都开启，分别会在每轮开始前召回记忆，并保存每一轮的内容。`recall_sync` 默认关闭，这表示召回在后台运行，结果会在下一轮到达。开启后，召回会针对当前消息进行，相关性更高，但会增加本轮延迟。

`recall_indicator` 和 `retain_indicator` 会打印 `👁️ Hindsight` 状态行。调整配置时建议保持开启，因为查看注入了多少条记忆，是判断召回是否有用的最快方法。面向客户时，请将这两个设置都关闭。

## 所以，是 AGI 吗？ {#so-agi}

不是。

你得到的是一个会记住事情的智能体。这项能力的说法更克制，也更实用。Hermes 负责推理和界面，Hindsight 负责在对话结束后保留下来的内容：从你的对话轮次中提取事实、跨会话解析实体、根据反复出现的证据整合观测，以及在模型回答前把相关子集重新提供给它。

这不等于通用智能。它的差别在于：一个助手每天早上都要问你 PostgreSQL 的版本，另一个则不会。使用几周后，后者会成为一个体验上明显不同的产品。

迁入目录不会改变这些。它只是让构建记忆系统的人现在也负责发布它。

## 常见问题 {#faq}

**我需要做什么吗？**
不需要。照常运行 `hermes update`，或者继续使用 Hermes 即可。迁移会在更新时或智能体首次启动时发生；它安装的是插件，不会操作数据。只有关闭了 `security.allow_lazy_installs` 的用户需要主动运行一次 `hermes plugins install hindsight`；此外，2026 年 9 月 14 日至 21 日期间安装插件的用户应进行更新，以修复嵌入模式中的事件循环问题。

**我会丢失任何记忆吗？**
不会。记忆库不会受到任何影响。插件是用于与 Hindsight 通信的代码，不是记忆的存放位置。无论记忆库位于 Hindsight Cloud、本地嵌入式守护进程，还是你自行运行的实例中，数据都会留在原处；迁移不会读取或写入这些数据。

**我可以继续使用捆绑提供方吗？**
不能太久。`hermes-agent` 已移除捆绑的 `plugins/memory/hindsight/` 目录，因此更新到该版本之后，目录插件将成为唯一副本。在两者同时存在时，捆绑版本优先：提供方的查找顺序是捆绑目录、`~/.hermes/plugins/`、项目目录，然后是入口点，采用第一个匹配项。这就是为什么提前安装插件只会暂时不起作用，而不会造成损害。

**这会影响 Hindsight Cloud 或自托管吗？**
不会。模式、端点、API 密钥和记忆库行为都保持不变。这只改变 Hermes 侧连接器的分发方式，影响范围到连接器为止。

**如何检查当前运行的版本？**
`hermes plugins list` 会显示已安装插件及其版本，应为 1.0.1 或更高版本。当前启用的提供方见 `config.yaml` 中的 `memory.provider`；Hindsight 专属设置位于 `~/.hermes/hindsight/config.json`。如果嵌入模式运行异常，启动日志位于 `~/.hermes/logs/hindsight-embed.log`，守护进程自己的日志位于 `~/.hindsight/profiles/<profile>.log`。

**现在应该在哪里报告错误？**
请报告到 Hindsight 仓库，而不是 `hermes-agent`。这正是迁移的实际好处：问题和修复会由维护记忆系统的团队处理，并在下次更新目录固定版本时发布，而不用等待无关项目的发布周期。

## 了解更多 {#learn-more}

- [Hermes 记忆提供方](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers)：了解上游对这次迁移的说明。
- [Hermes 目录中的 Hindsight 插件](https://hermes-agent.nousresearch.com/docs/plugins/hindsight)
- [Hermes Agent 使用 Hindsight 实现持久记忆](/sdks/integrations/hermes)：查看完整配置参考。
- [完整开放的智能体记忆技术栈：自托管 Hermes + Hindsight](/blog/2026/07/17/hermes-hindsight-open-stack)：了解如何在本地运行整套系统。
- [为每个 Hermes 机器人配备独立记忆](/blog/2026/08/18/hermes-bot-mode-memory)：了解如何按机器人隔离记忆库。

---
