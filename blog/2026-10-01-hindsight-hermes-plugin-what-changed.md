---
title: "Hindsight 成为Hermes 插件后有何变化"
authors: [benfrank241]
slug: "2026/10/01/hindsight-hermes-plugin-what-changed"
date: 2026-10-01T12:00
tags: [hindsight, hermes, nous-research, plugins, memory-provider, migration]
description: "Hindsight 用于在Hermes 内运输。它现在从插件目录安装。您的设置和记忆没有受到影响，但有一件事真正改变了：更新的来源。"
image: /img/blog/migrate-hindsight-hermes.webp
hide_table_of_contents: true
---

![Hindsight 现在从 Hermes 插件目录安装，而不是在 Hermes 内发货](/img/blog/migrate-hindsight-hermes.webp)

直到 9 月下旬，Hindsight 在[Hermes智能体](https://github.com/NousResearch/hermes-agent) 内作为`plugins/memory/hindsight/` 的捆绑记忆提供程序发货。它不再是了。 Nous Research 将所有记忆提供者从Hermes 核心树中移出，Hindsight 是第一个移出的。

您读到的大部分内容都会告诉您如何迁移。这部分很短，因为 Hermes 已经为你完成了。更有用的问题是现在实际上有什么不同，而且只有一个答案很重要。

<!-- truncate -->

## 概览 {#tldr}

- **你的设置没有改变。**设置、记忆库、API密钥、配置文件和三个工具都没有动过。
- **代码已移动。** 该插件位于 Hindsight 存储库中，由我们维护。
- ​​**一个真正的变化：更新。** `hermes update` 不再移动插件。 过去记忆的改进伴随着 Hermes 版本的发布，但现在不再这样了。
- **您现在选择您的版本：** 关注目录 pin，冻结提交，或跟踪我们的 `main`。
- **错误现在交给我们了**，并修复了引脚碰撞而不是不相关的发布周期的问题。

## 从没有改变的地方开始 {#start-with-what-did-not-change}

值得避开，因为“我们移动了您的集成”通常会附带一个周末。

你的记忆没有任何变化。该插件是与 Hindsight 对话的代码，而不是您的记忆所在的地方，因此无论您的记忆库位于 Hindsight Cloud、本地嵌入式守护程序还是您自己运行的实例上，它都位于它所在的位置。

|东西|还是原来的样子|
|---|---|
| 提供者设置 | `config.yaml` 中的 `memory.provider: hindsight` |
| 插件配置 | `~/.hermes/hindsight/config.json` |
| API 密钥 | `~/.hermes/.env` |
| 记忆库 | Cloud、本地守护进程或自建实例 |
| 工具 | `hindsight_retain`、`hindsight_recall`、`hindsight_reflect` |

迁移本身是插件安装，而不是数据操作。运行 `hermes update`，或者只是启动一个智能体，Hermes 根据目录解析提供程序名称并安装它。你得到一行：

```
✓ Memory provider 'hindsight' moved out of core — installed its plugin from the
  catalog (your memory.hindsight settings and data are unchanged).
```

之后，插件位于`~/.hermes/plugins/hindsight/`，并且您的`config.yaml`拾取`plugins.enabled: [hindsight]`。如果您关闭了`security.allow_lazy_installs`，Hermes将不会为您安装任何东西，并记录一行指令来自行运行`hermes plugins install hindsight`。

## 插件到底是什么 {#what-the-plugin-actually-is}

值得将分裂具体化，因为它使得“你的记忆没有移动”不仅仅是一句令人放心的短语。

该插件是**记忆提供者**：Python的一小部分，Hermes在定义的时刻加载和调用。在每次转动之前，它可以调用 `recall` 并将返回的内容放回到模型的上下文中。转弯后它可以调用`retain`。它公开了模型可以直接调用的三个工具。这就是整个工作，它是几百行客户端代码加上一个配置模式。

下面的一切都是Hindsight：将对话转化为事实的提取，跨会话识别同一个人的实体解析，将重复的事实折叠成观察的整合，决定返回什么的检索。这些都不在插件中，也没有在 Hermes 中提供。它在 Hindsight Cloud上运行，在插件为您启动的本地守护进程中，或者在您托管的实例上运行。

所以移动存储库的是连接器。记忆系统总是在其他地方，这就是为什么这种大小的改变可以让你的记忆库保持不变。

它还解释了您可以运行的三种模式的形状。`cloud`将连接器指向Hindsight Cloud。 `local_embedded` 让插件启动并使用自己的 PostgreSQL 监督本地守护进程，在五分钟不活动后将其闲置。 `local_external` 指向您已经运行的实例。

相同的连接器，记忆的三个地方。这也是为什么你所处的模式决定了移动可能对你产生多大的影响：云用户的记忆从来就不在他们的机器上，而嵌入式用户的守护进程是由插件启动的，但不是它的一部分。

## 代码现在所在的位置 {#where-the-code-lives-now}

捆绑目录已从`hermes-agent`消失。该插件位于 [向量化-io/Hindsight](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/hermes)，由 Hindsight 团队维护，Hermes 从其插件目录安装它。

目录条目是值得理解的部分，因为它所做的工作比看起来要多。它不会指向我们的存储库并跟踪它。它固定了 Nous 已审查过的**具体提交**。您安装的副本是提交直到图钉移动。

你可以准确地看到你得到了什么：

```bash
cat ~/.hermes/plugins/.install-metadata.json
```

记录目录条目、源存储库和已解析的提交。

## 真正改变的一件事 {#the-one-thing-that-genuinely-changed}

这里是内化的部分，它是一种习惯而不是命令。

**`hermes update` 不更新插件。** 它重新安装插件的 Python 依赖项并将结帐保留在原来的位置。没有任何东西会自行更新插件。

当提供者在Hermes内发货时，其发布周期为Hermes’发布周期。更新Hermes更新了你的记忆层，无论你是否想过。现在情况已不再如此，如果您来自捆绑提供商，则该假设将被放弃。

取代它的是你以前没有的选择。

### 按照目录图钉操作 {#follow-the-catalog-pin}

默认值，也是几乎每个人的正确答案。这就是 `hermes plugins install hindsight` 为您提供的：Nous 审核的提交。

```bash
hermes plugins update hindsight
```

`hermes plugins list` 就会标记插件`update_available`。请注意，重新运行 `plugins install` 会 **不是
一旦您安装的提交与目录不同，** 更新它 - 它会拒绝“已存在”。 `plugins update` 是重新固定的命令。

### 冻结特定提交 {#freeze-a-specific-commit}

对于您选择并持有的版本：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

替换整个占位符，包括尖括号。 `--ref` 采用完整的 40 个字符 SHA 并拒绝标签名称，因此从 [发行说明](https://github.com/vectorize-io/hindsight/releases) 中获取 SHA，而不是键入版本号。 `--ref` 安装被标记为固定，`plugins update` 将故意拒绝移动它。

### 追踪我们的开发分支 {#track-our-development-branch}

在到达目录之前进行修复：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight
```

从源路径而不是目录名称安装，相同的更新命令成为我们的`main`的git pull。未经定义审查。当您与我们一起追求特定的东西而不是我们在生产中运行的东西时，这很有用。

## 两个会让你感到困惑的时间事实 {#two-timing-facts-that-will-otherwise-confuse-you}

**我们合并的修复程序不是您拥有的修复程序。** 目录引脚是发布边界。我们的合并是第一步；引脚凸块到达您手中，这需要对 `hermes-agent` 进行后续更改。如果您在等待某事，您就是在等待 pin，而不是我们。

**Hermes 最多每六个小时重新获取一次目录。** 因此，即使 pin 移动后，新发布的版本也可能需要很长时间才能显示为可用。如果我们宣布的某些内容尚未发布，这通常就是原因，并且在六个小时结束之前不值得报告错误。

## 你得到什么交换 {#what-you-get-in-exchange}

住在别人树上的记忆提供者按照那棵树的速度移动。 Hindsight 连接器中的错误必须由其项目是智能体而不是记忆系统的人员来修复，并且在 Hermes 下次发布时修复完成。对于智能体每次转动的热循环中的代码来说，这是一条缓慢的路径。

现在，构建记忆系统的人维护与之对话的东西。问题会转到 [Hindsight 存储库](https://github.com/vectorize-io/hindsight/issues)，我们在那里修复它们，然后它们会在下一个 pin 上发布，而不是在不相关的版本上发布。

您还可以获得上面的三向选择，这在捆绑提供程序时不存在。如果修复足够重要，您可以在修复当天就运行它，而不必等待；如果稳定性更重要，你可以坚持承诺，并且知道没有什么会改变它。当您的记忆层通过其他人的发布列车发货时，这两种方法都不可用。

## 全新安装 {#installing-fresh}

如果您要进行设置而不是迁移：

```bash
hermes plugins install hindsight
hermes memory setup           # select "hindsight"
```

Hindsight 在目录中，所以第一行只需要名称即可。

**不要跳过第二个命令。** 安装插件不会将其打开。 Hermes将记忆提供者视为`kind: exclusive`，并且其插件启用门故意跳过它们，因此`hermes plugins enable`不是激活提供者的东西。激活的是`config.yaml`中的`memory.provider`，这是设置为你写的。无论迁移如何，这都会吸引人们，这是正确安装的插件似乎没有任何作用的最常见原因。

另请注意，`plugins install`在启用前会提示。通过 `--enable` 或 `--no-enable` 跳过脚本中的提示。

## 同一窗口中的另一项更改 {#one-other-change-in-the-same-window}

与移动无关，但它的位置足够接近，足以与之混淆：`recall_types`现在默认为**仅观察**，之前它返回了所有三种事实类型。

​​ 观察是巩固层——具有证据价值的去重复信念，而不是其之下的个别事实。对于每轮上下文注入，每个令牌的密度更大。如果您想要旧的行为，请在 `~/.hermes/hindsight/config.json` 中设置 `"recall_types": "observation,world,experience"`。它管理自动记忆召回和 `hindsight_recall` 工具。

## 如果看起来有问题 {#if-something-looks-wrong}

实际出现的事情的简短列表。

**`Timeout context manager should be used inside a task`** — 您有 `hindsight-embed` 0.10.0，这会破坏 `local_embedded` 模式。这会影响 2026 年 9 月 14 日至 21 日之间的安装。运行 `hermes update`，这是此处的修复方法，因为问题是依赖项而不是插件代码。云和`local_external`不受影响。

**提供商报告在嵌入模式下“不可用”** — 您安装了插件但跳过了`hermes memory setup`。嵌入式模式需要 `hindsight-all` 软件包而不仅仅是客户端，安装向导会安装它。

**已安装并启用，但记忆不起作用** — `plugins enable` 不激活提供程序。检查`memory.provider`，或运行`hermes memory setup`。

**`plugins update` 表示无事可做** — 要么您被 `--ref` 固定，在这种情况下它会拒绝，要么目录尚未重新获取。

**`hermes update` 似乎挂起** — 正在等待输入。它会在准备插件的 Python 依赖项之前进行提示，如果您的 Hermes 树进行了修改，则会再次提示恢复隐藏的本地更改。

**记忆召回失败并显示 HTTP 状态而不是插件错误** — 401、402 或 403 是Hindsight 拒绝请求，而不是插件行为不当。检查您的 API 密钥和帐户状态。

## 常见问题 {#frequently-asked-questions}

**我需要手动迁移吗？**
没有。 Hermes 在 `hermes update` 或第一次智能体启动时执行此操作，前提是 `security.allow_lazy_installs` 打开（这是默认设置）。

**我会失去记忆吗？**
没有。迁移期间不会读取或写入有关您的记忆库的任何内容。

**这会影响Hermes桌面应用程序吗？**
它在第一次智能体启动时以相同的方式迁移。桌面用户完全在“设置”→“记忆和上下文”中配置Hindsight，并且永远不要触摸插件层。桌面仅支持云和本地外部模式。

**我可以继续使用捆绑的提供商吗？**
一旦你更新了删除之后就不会了。虽然两者都存在，但捆绑副本获胜，因为提供者查找被捆绑，然后是`~/.hermes/plugins/`，然后是项目，然后是入口点，首先命中获胜。

**我如何知道我使用的是哪个版本？**
​​`hermes plugins list` 显示已安装的版本和标志`update_available`。 `~/.hermes/plugins/.install-metadata.json` 显示已解决的提交以及您是否被固定，这实际上决定了 `plugins update` 是否会移动您。

**我现在在哪里报告错误？**
[Hindsight 存储库](https://github.com/vectorize-io/hindsight/issues)。

## 了解更多 {#learn-more}

- [Hermes智能体集成参考](https://hindsight.vectorize.io/sdks/integrations/hermes) 用于完整配置表面
- [Hermes 桌面版](https://hindsight.vectorize.io/sdks/integrations/hermes-desktop) 仅用于设置路径
- [Hindsight + Hermes = AGI 吗？](https://hindsight.vectorize.io/blog/2026/09/25/hindsight-hermes-plugin-catalog) 更短、更固执己见的版本
- [赋予每个Hermes机器人自己的记忆](https://hindsight.vectorize.io/blog/2026/08/18/hermes-bot-mode-memory) 每个机器人记忆库隔离
