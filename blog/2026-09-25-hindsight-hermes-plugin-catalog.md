---
title: "Hindsight + Hermes = AGI？"
authors: [benfrank241]
slug: "2026/09/25/hindsight-hermes-plugin-catalog"
date: 2026-09-25T15:00
tags: [hindsight, hermes, nous-research, plugins, memory-provider, integration, migration]
description: "Hermes 将记忆提供程序移出核心代码，转入插件目录，Hindsight 是首个。了解变化、迁移和新的更新方式。"
image: /img/blog/hindsight-hermes-agi.webp
hide_table_of_contents: true
---

![是吗？](/img/blog/hindsight-hermes-agi.webp)

是。

不，当然不是。不过既然来了：[Hermes Agent](https://github.com/NousResearch/hermes-agent) 本周将记忆提供程序从核心代码移到插件目录，Hindsight 是首个。已同时使用两者的用户，应了解影响。

使用行为不变，这正是本文要点。需要细节的话，请继续阅读。

<!-- truncate -->

## 要点 {#tldr}

- **现有用户的提供程序名称、设置、记忆库和数据目录不变。**
- **Hermes 自动迁移**：`hermes update` 或首次启动时完成，仅显示一行确认。
- **插件现位于 Hindsight 仓库**，由 Hindsight 团队维护，不再捆绑于 Hermes。
- **新用户从目录安装**：先 `hermes plugins install hindsight`，再 `hermes memory setup`。
- **`hermes update` 不更新插件**，应使用 `hermes plugins update hindsight`；可用 `--ref` 固定版本或跟踪 `main`。
- **真正的陷阱**：`hermes plugins enable` 不会激活记忆提供程序，这是此前就有的行为。

## 发生了什么 {#what-actually-happened}

Nous Research 正将全部记忆提供程序从 `hermes-agent` 核心移到各维护者仓库，通过[插件目录](https://hermes-agent.nousresearch.com/docs/plugins)发布。文档说明：

> 记忆提供程序正移到维护者自己的仓库，通过插件目录发布，Hindsight 是首个。

变更于 9 月 23 日合入上游，PR 说明首次启动或 `hermes update` 自动迁移。Hermes 中 `plugins/memory/hindsight/` 已删除，插件位于 Hindsight 的 `hindsight-integrations/hermes/`，由我们维护。

捆绑在别人仓库里的提供程序，受其发布周期限制，问题需由维护智能体而非记忆系统的人修复。现在由记忆系统作者直接发布修复，对双方都有好处。

## 现有 Hindsight 用户：使用不变 {#if-you-already-use-hindsight-nothing-changes}

值得重复，因为“迁移集成”通常意味着一整个周末的工作。

`memory.hindsight` 设置仍有效，记忆库 ID 和内容不变，密钥留在 `~/.hermes/.env`，`~/.hermes/hindsight/config.json` 不改，工具仍叫 `hindsight_retain`、`hindsight_recall` 和 `hindsight_reflect`。

运行 `hermes update`，或直接启动已配置 Hindsight 的智能体，Hermes 会根据目录解析提供程序并安装。会看到类似确认：

```
✓ 记忆提供程序 hindsight 已移出核心，
  已从目录安装插件，memory.hindsight 设置和数据不变。
```

之后插件位于 `~/.hermes/plugins/hindsight/`，`config.yaml` 添加 `plugins.enabled: [hindsight]`，迁移即完成。

我们在仍用捆绑提供程序的机器上验证过。更新是**交互式**的，会询问是否准备 Python 依赖，不自动作答，无人值守会停在提示处。有 Hermes 本地修改时，会先暂存并询问恢复，打印的 `git stash apply <sha>` 应保存。

`~/.hermes/plugins/.install-metadata.json` 记录目录固定版本、源码仓库和解析提交。我们的结果为 1.0.1，固定在 `176f8c2d`。

自动安装依赖默认开启的 `security.allow_lazy_installs`。关闭后不会后台安装，只提示自行执行 `hermes plugins install hindsight`。

## 新用户 {#if-you-are-starting-fresh}

两条命令：

```bash
hermes plugins install hindsight
hermes memory setup    # 选择 hindsight
```

目录中已有 Hindsight，首条只需名称。设置向导通过 `uv` 向 Hermes venv 安装依赖、引导配置，并提供初始记忆模板。覆盖已配置库前会警告，也可完全跳过模板。

不要跳过第二条命令，原因如下。

## 最容易踩的坑 {#the-one-thing-that-trips-people-up}

这是迁移前就存在的行为，应明确说明：

**`hermes plugins enable` 不会激活记忆提供程序。**

Hermes 将提供程序视为 `kind: exclusive`，启用插件的检查有意跳过它。真正激活的是 `config.yaml` 中 `memory.provider: hindsight`，由 `hermes memory setup` 写入。只安装和启用、没执行设置，会使其存在却不使用。

嵌入模式还有相关问题：`local_embedded` 需要 `hindsight-all`，不只是客户端。`pyproject.toml` 有意不声明，以免云用户安装整套本地 ML。向导会安装，插件可在可用性检查时补装，但只执行 `plugins install`、不执行 `memory setup`，嵌入模式会报“not available”。

统一规则：始终运行 `hermes memory setup`。

## 三种模式保持不变 {#three-modes-unchanged}

迁移也适合重新确认模式。

| 模式 | 作用 | 需求 |
|---|---|---|
| `cloud` | 连接 Hindsight Cloud | 从 [ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 获取 API 密钥 |
| `local_embedded` | Hermes 运行带内置 PostgreSQL 的本地守护进程 | 提取与综合用 LLM 密钥；嵌入和重排序在本地 |
| `local_external` | 连接已有 Hindsight 实例 | URL 和可选密钥 |

嵌入模式首次使用后台启动，空闲五分钟后停止。支持任何 OpenAI 兼容端点，包括 llama.cpp、vLLM、LM Studio，选择 `openai_compatible` 并提供基址。需要其 Web 界面时，运行 `hindsight-embed -p hermes ui start`。

## 更新：需要改变的习惯 {#updating-the-habit-to-unlearn}

真正变化的是更新习惯。

**插件不会自行更新。** `hermes update` 只重装 Python 依赖，源码检出位置不变。不要再以为更新 Hermes 就自动带来记忆改进。

选择版本有三种方式。

### 跟随官方固定版本 {#follow-the-official-pin}

默认且适合多数人。`hermes plugins install hindsight` 安装 Nous 审核并固定在目录中的提交。

```bash
hermes plugins update hindsight    # 更新到目录当前固定提交
```

安装提交与目录不同，`hermes plugins list` 标记 `update_available`。重复 `plugins install` 不会更新，会报“already exists”；`plugins update` 才重新固定版本。

我们合并改动不会立即到用户手中，需向 `hermes-agent` 提交 PR 更新目录固定值。Hermes 最多每六小时重新获取一次目录，因此新版本可能六小时后才显示可用。

### 固定特定版本 {#pin-a-specific-release}

自行选择并冻结版本：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes \
  --force --ref <40-character-commit-sha>
```

`--ref` 要完整提交 SHA，**拒绝标签名称**，请从[发布说明](https://github.com/vectorize-io/hindsight/releases)取 SHA，不填 `v1.0.1`。固定安装后 `plugins update` 有意拒绝移动；需要新版时，使用新 `--ref` 重新安装。

### 跟踪最新开发代码 {#track-the-latest-development-code}

修复尚未进入目录时，可使用源码路径而非目录名称安装：

```bash
hermes plugins install vectorize-io/hindsight/hindsight-integrations/hermes
hermes plugins update hindsight    # 此时拉取 main 分支
```

相同更新命令此时跟踪 `main`，得到运行当时的代码，按定义未经审核。适合追踪刚合入修复或协作测试，不建议生产使用。

目录条目位于 Nous 仓库的 [`plugin-catalog/hindsight.yaml`](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/hindsight.yaml)，记录当前固定提交。

**有一项更新不应推迟。** 2026 年 9 月 14～21 日安装的 `hindsight-embed` 0.10.0 会使 `local_embedded` 失效：守护进程探测清空调用线程事件循环，下一次调用报 `Timeout context manager should be used inside a task`。因此客户端最低为 0.10.1，而非 API 所需的 0.6.1。此处 `hermes update` 正是修复方式，因为问题在依赖而非插件代码。

## 需要了解的默认值 {#one-default-worth-knowing-about}

召回默认现在**只返回观察**，此前返回三种事实。

观察是去重、有证据和证据数及新鲜度信号的整合认知，随新事实完善。原始 `world` 和 `experience` 是底层独立证据。每轮注入时，观察的每 token 信息更密集，避免传入五条已被一条观察概括的事实。

需要旧行为时，在 `~/.hermes/hindsight/config.json` 设置 `"recall_types": "observation,world,experience"`。它同时影响自动召回与 `hindsight_recall`，因为工具 schema 没有逐调用类型参数。

## 每轮行为 {#how-it-behaves-per-turn}

趁迁移检查三组日常行为设置：

`memory_mode` 决定记忆如何进入模型。默认 `hybrid` 自动注入并提供三个工具；`context` 仅注入、隐藏工具；`tools` 仅提供工具，不注入，适合由模型决定何时访问。

`auto_recall` 和 `auto_retain` 默认开启，每轮前召回、之后保存。`recall_sync` 默认关闭，后台召回在下一轮到达；开启可针对当前消息提高相关性，但增加延迟。

`recall_indicator` 与 `retain_indicator` 打印 `👁️ Hindsight` 状态。调优时保持开启，查看注入数量是判断有效性的最快方式；面向客户时关闭两者。

## 所以，是 AGI 吗？ {#so-agi}

不是。

得到的是会记住的智能体，这个承诺更小也更有用。Hermes 负责推理和界面，Hindsight 负责对话结束后保留的内容：提取事实、跨会话实体解析、反复证据形成的观察，以及回答前重新提供相关子集。

这不是通用智能，而是助手是否每天询问 PostgreSQL 版本的区别。几周后，能记住的助手已经是明显不同的产品。

转入目录不改变这些，只让记忆系统开发者直接负责发布。

## 常见问题 {#faq}

**我需要做什么吗？**
通常不需要，按原计划更新或继续使用即可，更新或首次启动会自动安装插件，不操作数据。关闭 `security.allow_lazy_installs` 的用户应手动安装一次，2026 年 9 月 14～21 日安装的用户应更新以修复事件循环问题。

**会丢失记忆吗？**
不会，记忆库不被修改。插件只是通信代码，不是存储位置，无论 Cloud、嵌入守护进程或自有实例，数据留在原处，迁移不读写它。

**可以继续用捆绑提供程序吗？**
不能长期使用，核心中的 `plugins/memory/hindsight/` 已移除，之后只有目录插件。两者并存时，查找顺序是捆绑、`~/.hermes/plugins/`、项目、入口点，首次匹配优先，因此提前安装插件只是未生效，不会有害。

**影响 Cloud 或自托管吗？**
不影响，模式、端点、密钥和记忆库行为均不变，只改变 Hermes 连接器的分发。

**如何检查运行版本？**
`hermes plugins list` 显示插件版本，应为 1.0.1 或以上。活动提供程序看 `config.yaml` 的 `memory.provider`，专属设置在 `~/.hermes/hindsight/config.json`。嵌入异常时，启动日志为 `~/.hermes/logs/hindsight-embed.log`，守护进程日志为 `~/.hindsight/profiles/<profile>.log`。

**现在向哪里报告问题？**
Hindsight 仓库，而非 `hermes-agent`。问题和修复由记忆系统团队处理，通过下次目录固定值更新发布，不再等待无关发布周期。

## 了解更多 {#learn-more}

- [Hermes 记忆提供程序](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers)：上游迁移说明。
- [Hermes 目录中的 Hindsight 插件](https://hermes-agent.nousresearch.com/docs/plugins/hindsight)。
- [Hermes 与 Hindsight 持久记忆](https://hindsight.vectorize.io/sdks/integrations/hermes)：完整配置参考。
- [完全开放的智能体记忆栈：自托管 Hermes + Hindsight](https://hindsight.vectorize.io/blog/2026/07/17/hermes-hindsight-open-stack)：本地运行完整系统。
- [为每个 Hermes 机器人提供独立记忆](https://hindsight.vectorize.io/blog/2026/08/18/hermes-bot-mode-memory)：按机器人隔离。
