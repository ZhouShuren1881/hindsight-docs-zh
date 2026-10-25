---
title: "Hindsight 成为 Hermes 插件后有哪些变化"
authors: [benfrank241]
slug: "2026/10/01/hindsight-hermes-plugin-what-changed"
date: 2026-10-01T12:00
tags: [hindsight, hermes, nous-research, plugins, memory-provider, migration]
description: "Hindsight 过去随 Hermes 一起发布，现在改为从插件目录安装。你的设置和记忆都没有改变，但更新的来源确实变了。"
image: /img/blog/migrate-hindsight-hermes.webp
hide_table_of_contents: true
---

![Hindsight 现在从 Hermes 插件目录安装，而不再随 Hermes 一起发布](/img/blog/migrate-hindsight-hermes.webp)

直到 9 月下旬，Hindsight 一直作为捆绑的记忆提供方随 [Hermes Agent](https://github.com/NousResearch/hermes-agent) 一起发布，位于 `plugins/memory/hindsight/`。现在已经不是这样了。Nous Research 将所有记忆提供方移出了 Hermes 核心代码树，Hindsight 是第一个移出的。

你看到的多数相关内容都会告诉你如何迁移。这部分很简单，因为 Hermes 会替你完成。现在真正发生了什么变化？更值得关注的是这个问题，而答案只有一个。

<!-- truncate -->

## 概览 {#tldr}

- **你的设置没有变化。** 设置、记忆库、API 密钥、配置文件和三个工具都保持原样。
- **代码换了位置。** 插件现在位于 Hindsight 仓库中，并由我们维护。
- **唯一的实质变化是更新方式。** `hermes update` 不再更新插件。过去，记忆功能的改进会随 Hermes 版本一起发布；现在不会了。
- **现在由你选择使用哪个版本：** 跟随插件目录固定的版本、锁定某个提交，或跟踪我们的 `main` 分支。
- **错误现在由我们处理，** 修复会随目录固定提交的更新发布，而不是等到无关的版本发布周期。

## 先说没有变化的部分 {#start-with-what-did-not-change}

先把这件事说清楚，因为“我们移动了你的集成”通常意味着你得搭进去一个周末。

你的记忆没有移动。插件只是与 Hindsight 通信的代码，不是存放记忆的地方。因此，无论你的记忆库位于 Hindsight Cloud、本地嵌入式守护进程，还是你自行运行的实例中，它都仍在原处。

| 项目 | 位置仍然不变 |
|---|---|
| 提供方设置 | `config.yaml` 中的 `memory.provider: hindsight` |
| 插件配置 | `~/.hermes/hindsight/config.json` |
| API 密钥 | `~/.hermes/.env` |
| 记忆库 | Cloud、本地守护进程或你自己的实例 |
| 工具 | `hindsight_retain`、`hindsight_recall`、`hindsight_reflect` |

这次迁移只是安装插件，不涉及数据操作。运行 `hermes update`，或者直接启动智能体，Hermes 就会根据插件目录解析提供方名称并安装插件。你会看到这样一行：

```
✓ Memory provider 'hindsight' moved out of core — installed its plugin from the
  catalog (your memory.hindsight settings and data are unchanged).
```

之后，插件会位于 `~/.hermes/plugins/hindsight/`，而 `config.yaml` 中会加入 `plugins.enabled: [hindsight]`。如果你关闭了 `security.allow_lazy_installs`，Hermes 就不会替你安装任何内容，而是记录一行提示，让你自行运行 `hermes plugins install hindsight`。

## 插件究竟是什么 {#what-the-plugin-actually-is}

有必要把两者的分工说具体，因为这能说明“你的记忆没有移动”并非只是一句安慰话。

插件是一个**记忆提供方**：一小段 Python 代码，Hermes 会在指定时机加载并调用它。每轮对话开始前，它可以调用 `recall`，并把返回的内容放进模型上下文；一轮结束后，它可以调用 `retain`。它还会提供三个可供模型直接调用的工具。这就是插件的全部职责：几百行客户端代码和一个配置模式。

其余环节都属于 Hindsight：把对话提取为事实、跨会话识别同一个人的实体消解、将重复事实整合为观测的处理，以及决定返回哪些内容的检索。这些都不在插件里，也从未随 Hermes 一起发布。它们运行在 Hindsight Cloud、由插件为你启动的本地守护进程，或你自行托管的实例上。

因此，迁移仓库的是连接器。记忆系统一直运行在别处，所以这次规模的改动不会影响你的记忆库。

这也解释了三种运行模式的区别。`cloud` 会将连接器指向 Hindsight Cloud。`local_embedded` 会让插件启动并管理一个使用独立 PostgreSQL 的本地守护进程；守护进程闲置五分钟后会进入休眠。`local_external` 则指向你已经运行的实例。

同一个连接器，记忆可以存放在三个地方。这也解释了为什么你使用的模式决定了这次迁移可能对你造成多大影响：云端用户的记忆原本就不在自己的机器上；嵌入式模式用户的守护进程由插件启动，但它本身并不属于插件。

## 现在代码位于哪里 {#where-the-code-lives-now}

`hermes-agent` 中的捆绑目录已经移除。插件现在位于 [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/hermes)，由 Hindsight 团队维护，Hermes 会从自己的插件目录安装它。

插件目录条目比表面看起来承担了更多工作，值得了解。它不会指向我们的仓库并跟随仓库变化，而是固定到 Nous 审核过的**一个具体提交**。目录中的固定提交未更新前，你安装的副本就一直是这个提交。

运行下面的命令，可以准确查看安装了什么：

```bash
cat ~/.hermes/plugins/.install-metadata.json
```

这个文件会记录目录条目、源仓库和解析出的提交。

## 唯一真正发生变化的事 {#the-one-thing-that-genuinely-changed}

下面这点需要记住，它更像一种习惯上的改变，而不是一条命令。

**`hermes update` 不会更新插件。** 它会重新安装插件的 Python 依赖项，但会让插件代码仍停留在原来的提交。插件不会自行更新。

当记忆提供方随 Hermes 一起发布时，它的发布周期就跟随 Hermes。更新 Hermes 也会更新你的记忆层，不管你是否留意到这一点。现在情况变了；如果你之前用的是捆绑版提供方，就需要放下这个假设。

取而代之的是你以前没有的选择。

### 跟随插件目录固定的版本 {#follow-the-catalog-pin}

这是默认方式，也是几乎所有人的正确选择。运行 `hermes plugins install hindsight` 安装的就是 Nous 审核过的提交。

```bash
hermes plugins update hindsight
```

安装的提交与目录中的提交不同时，`hermes plugins list` 会将插件标记为 `update_available`。请注意，重新运行 `plugins install` **不会**更新插件；如果插件已经存在，它会以“already exists”拒绝安装。用于更新目录固定提交的命令是 `plugins update`。

### 锁定某个具体提交 {#freeze-a-specific-commit}

如果你想选定一个版本并保持使用：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

请替换整个占位符，包括尖括号。`--ref` 接受完整的 40 字符 SHA，不接受标签名称，所以请从[发行说明](https://github.com/vectorize-io/hindsight/releases)中获取 SHA，不要输入版本号。使用 `--ref` 安装的插件会标记为已固定，`plugins update` 会有意拒绝更新它。

### 跟踪我们的开发分支 {#track-our-development-branch}

如果你想在修复进入插件目录前就使用它：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight
```

从源路径而非目录名称安装后，同一个更新命令就会变成对我们 `main` 分支执行 `git pull`。这意味着它未经审核。适合你正和我们一起追查某个具体问题时使用，不适合作为我们会在生产环境运行的版本。

## 两个容易造成困惑的时间点 {#two-timing-facts-that-will-otherwise-confuse-you}

**我们合并了修复，不代表你已经获得修复。** 插件目录中的固定提交才是发布边界。我们合并代码只是第一步；随后还要对 `hermes-agent` 作出更改，更新目录固定提交，你才能获得修复。如果你正在等某项修复，等的是固定提交更新，不是我们完成合并。

**Hermes 最多每六小时重新获取一次插件目录。** 因此，即使固定提交已经更新，新发布的版本也可能要过一段时间才会显示为可用。如果我们宣布的内容还没出现，通常就是这个原因；六小时过去前不必提交错误报告。

## 这样做带来的好处 {#what-you-get-in-exchange}

记忆提供方放在别人的代码树里，就得跟着那棵代码树的节奏走。Hindsight 连接器中的错误，过去需要由项目重点是智能体而不是记忆系统的团队修复；修复要等 Hermes 下次发布才会到你手上。对于每轮智能体运行都会经过的高频主循环中的代码来说，这条路径太慢了。

现在，构建记忆系统的人会维护与之通信的代码。问题会提交到 [Hindsight 仓库](https://github.com/vectorize-io/hindsight/issues)，我们会在那里修复，并随下一次目录固定提交更新发布，而不必等待无关的版本发布。

你还可以使用上面提到的三种版本选择，而捆绑版提供方不存在这种选择。如果某项修复足够重要，你可以在它合并当天就运行，不必等待；如果稳定性更重要，你可以固定到某个提交，确保版本不会自行变化。记忆层随别人的发布周期一起提供时，这两种选择都不存在。

## 全新安装 {#installing-fresh}

如果你是在新环境中安装，而不是迁移：

```bash
hermes plugins install hindsight
hermes memory setup           # select "hindsight"
```

Hindsight 已在插件目录中，所以第一行只需写名称。

**不要跳过第二条命令。** 安装插件不会启用它。Hermes 将记忆提供方视为 `kind: exclusive`，插件启用逻辑会有意跳过这类提供方，因此 `hermes plugins enable` 不会启用记忆提供方。真正起作用的是 `config.yaml` 中的 `memory.provider`，配置向导会替你写入这一项。无论是否迁移，这一点都容易让人困惑；正确安装的插件看起来毫无反应，最常见的原因就是漏掉了这一步。

另请注意，`plugins install` 会在启用前询问。脚本中可以传入 `--enable` 或 `--no-enable` 来跳过询问。

## 同一时期的另一项变化 {#one-other-change-in-the-same-window}

这项变化与插件迁移无关，但发生时间相近，容易被混为一谈：`recall_types` 现在默认仅返回**观测**，过去默认返回全部三种事实类型。

观测是整合后的层级：它们是经过去重、带有支持事实数的认知判断，而不是其底层的单条事实。用于每轮上下文注入时，单位 token 所含的信息更多。如果你想恢复旧行为，请在 `~/.hermes/hindsight/config.json` 中设置 `"recall_types": "observation,world,experience"`。该设置同时控制自动召回和 `hindsight_recall` 工具。

## 如果遇到问题 {#if-something-looks-wrong}

下面简要列出实际常见的问题。

**`Timeout context manager should be used inside a task`** — 你安装了 `hindsight-embed` 0.10.0，它会导致 `local_embedded` 模式无法工作。2026 年 9 月 14 日至 21 日期间安装的版本会受影响。运行 `hermes update` 即可修复，因为问题出在依赖项而非插件代码。Cloud 和 `local_external` 不受影响。

**嵌入式模式下提供方报告“不可用”** — 你安装了插件，但跳过了 `hermes memory setup`。嵌入式模式需要 `hindsight-all` 软件包，而不只是客户端；安装向导会安装它。

**已安装并启用，但记忆功能没有反应** — `plugins enable` 不会启用记忆提供方。检查 `memory.provider`，或运行 `hermes memory setup`。

**`plugins update` 提示没有可更新内容** — 可能是你用 `--ref` 固定了版本，按设计它不会更新；也可能是插件目录还没有重新获取。

**`hermes update` 看起来卡住了** — 它正在等待输入。准备插件的 Python 依赖项之前会询问一次；如果 Hermes 代码树有本地改动，还会再次询问是否恢复暂存起来的本地更改。

**Recall 返回 HTTP 状态错误，而不是插件错误** — 401、402 或 403 表示 Hindsight 拒绝了请求，不是插件本身出错。请检查 API 密钥和账户状态。

## 常见问题 {#frequently-asked-questions}

**我需要手动迁移吗？**
不需要。如果 `security.allow_lazy_installs` 已开启（默认值），Hermes 会在运行 `hermes update` 或智能体首次启动时完成迁移。

**我的记忆会丢失吗？**
不会。迁移期间不会读取或写入记忆库中的任何内容。

**这会影响 Hermes 桌面应用吗？**
迁移方式相同，会在智能体首次启动时进行。桌面版用户完全通过“设置”→“记忆与上下文”配置 Hindsight，不会接触插件层。桌面版仅支持 Cloud 和 Local External 模式。

**我还能继续使用捆绑版提供方吗？**
更新到移除该提供方的版本后就不能继续使用了。两者并存时，捆绑副本会优先，因为提供方的查找顺序是：捆绑版、`~/.hermes/plugins/`、项目目录、入口点；找到第一个匹配项后就会停止。

**怎么查看自己使用的是哪个版本？**
`hermes plugins list` 会显示已安装的版本，并标记 `update_available`。`~/.hermes/plugins/.install-metadata.json` 会显示解析出的提交以及插件是否已固定；这两项信息决定 `plugins update` 是否会更新它。

**现在应该在哪里报告错误？**
[Hindsight 仓库](https://github.com/vectorize-io/hindsight/issues)。

## 了解更多 {#learn-more}

- [Hermes Agent 集成参考](/sdks/integrations/hermes)：了解完整的配置选项
- [Hermes Desktop](/sdks/integrations/hermes-desktop)：了解仅通过设置界面配置的方式
- [Hindsight + Hermes = AGI？](/blog/2026/09/25/hindsight-hermes-plugin-catalog)：阅读更短、观点更鲜明的版本
- [让每个 Hermes 机器人都有自己的记忆](/blog/2026/08/18/hermes-bot-mode-memory)：了解如何为每个机器人隔离记忆库
