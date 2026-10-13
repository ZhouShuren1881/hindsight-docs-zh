---
sidebar_position: 34
title: "使用 Hindsight 为 Obsidian 添加长期记忆 | 集成"
description: "将 Obsidian 笔记库同步到 Hindsight，与基于笔记回答问题的智能体聊天。笔记库始终是权威数据源，每个答案都会引用来源笔记。"
---

# Obsidian {#obsidian}

借助 [Hindsight](https://hindsight.vectorize.io)，为 [Obsidian](https://obsidian.md) 笔记库添加了解你的笔记的智能体。插件将笔记库同步到 Hindsight 记忆库，并提供聊天面板，让答案基于笔记且附带来源引用。

[查看更新日志 →](/changelog/integrations/obsidian)

## 为什么这很重要 {#why-this-matters}

Obsidian 保存你的知识。向量搜索插件能够找到相关笔记，但无法对笔记进行推理、记住你问过的问题，或随着笔记库增长持续综合知识。Hindsight 提供这些能力：

- **记忆召回**比文本搜索更快、更准确。
- **反思** 结合整个笔记库进行推理，回答问题并显示所用的来源笔记。
- **心智模型**（规划中）维护笔记库的持续摘要，并在你写作时刷新。

## 权威数据源保留在 Obsidian 中 {#source-of-truth-stays-in-obsidian}

此集成遵循一条硬性规则：**Hindsight 始终不会成为第二个权威数据源。** 同步为单向（Obsidian → Hindsight），每个答案都引用来源笔记，让你能够**从源头解决问题**。聊天对话默认**不**存储。修改笔记后，Hindsight 会在下次同步时更新。

## 它的作用 {#what-it-does}

- **增量同步笔记库** — 笔记以 Hindsight 文档存储。编辑会更新或插入文档，删除会移除文档；内容哈希确保跳过未改变的笔记。
- **隐式限定作用域** — 每篇笔记在导入时都会自动标记其 **笔记库**，**文件夹**（和子文件夹），和 **创建与更新日期**。在记忆召回时才需要考虑范围，可通过 Hindsight 的 `tag_groups` 任意组合过滤条件。多个笔记库共享一个记忆库，并通过 `vault:` 标签隔离。
- **界面与 API 使用相同数据** — Obsidian 聊天面板与自动化工具（n8n、Hermes 等）使用相同标签访问同一记忆库，因此看到相同范围的数据。
- **基于记忆的对话** — 侧边面板根据笔记回答问题，提供可折叠的**引用**（点击打开来源笔记）与**推理**详情。
- **手动或自动** — 每次编辑时同步，或按需运行_立即同步笔记库_。

### 范围界定 {#scoping}

记忆召回与反思（通过界面或 API 调用）可以组合以下维度过滤：

|维度|标签|
| -------------------- | ------------------------------------ |
|笔记库|`vault:<name>`|
|文件夹（+祖先）|`folder:Work`，`folder:Work/Clients`|
|日期|`created:2026-03`，`updated:2026-06`|

你自己的主题 `tags` 与 `aliases` 也会一并保留。

## 安装 {#installation}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io) — 免费注册，获得API 密钥，并跳过自托管。

虽然该插件处于测试阶段，但它通过 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)：添加存储库[`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian)（BRAT 安装的专用插件存储库）并在 中启用它 **设置 → 社区插件（Settings → Community plugins）**。

**自托管替代方案** — 运行Hindsight本地：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

## 配置 {#configuration}

打开**设置 → Hindsight（Settings → Hindsight）**：

|设置|默认|说明|
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
|API 网址|`https://api.hindsight.vectorize.io`|Hindsight服务器（使用`http://localhost:8888`用于自托管）|
|API 密钥|—|Hindsight CloudAPI密钥|
|记忆库名称|`obsidian`|所有库的共享记忆库（用 分隔） `vault:`标签）|
|包含/排除文件夹|—|限制同步笔记|
|编辑时同步|开启|编辑时自动重新提取笔记|
|默认聊天深度|低|反思生成聊天答案时的预算|
|记住对话|**关闭**|启用后，聊天轮次会存储到 Hindsight 中（在笔记库之外创建记忆）|

## 命令 {#commands}

- **立即同步笔记库** — 完整同步（导入更改的笔记，移除已删除的笔记）。
- **导入当前笔记** — 强制同步当前笔记。
- **打开聊天** — 打开基于笔记回答的聊天面板。

## 无头/CLI 摄取（无桌面应用程序） {#headless--cli-ingestion-no-desktop-app}

如果你将笔记库放在始终在线的服务器上，并通过 Obsidian Sync 保持磁盘内容更新，可以使用同一软件包中的 `hindsight-obsidian-sync` CLI，在不运行 Obsidian 应用的情况下导入笔记。CLI 与插件使用**相同的同步引擎**，生成相同的文档 ID、作用域标签与删除归属信息。因此你可以从服务器同步笔记库，再在其他设备上交互使用，避免两个导入程序争用或重复创建文档。

```bash
npm install -g @vectorize-io/hindsight-obsidian

#一次性协调（cron 友好）
hindsight-obsidian-sync reconcile \
  --vault ~/Vaults/Brain --bank my-vault \
  --api-url https://api.hindsight.vectorize.io --api-token hsk_...

#或保持运行并实时同步更改
hindsight-obsidian-sync reconcile --vault ~/Vaults/Brain --bank my-vault --watch
```

`--api-url` 与 `--api-token` 未设置时，分别使用 `HINDSIGHT_API_URL` 与 `HINDSIGHT_API_TOKEN`。其他选项包括可重复指定的 `--include` 与 `--exclude`，以及 `--vault-name`、`--prefix-doc-id` 和 `--index`。

同步索引（CLI 中对应插件 `data.json` 的文件）默认位于 `~/.hindsight/obsidian/<vault>.json`，有意放在笔记库**之外**，防止 Obsidian Sync 传播它。如果 CLI 与插件连接同一个记忆库和笔记库，请保持范围设置一致（包含与排除规则、笔记库名称、`prefix-doc-id`）。两者各自维护索引，同步时只删除自身索引跟踪的内容；范围不一致可能导致一方删除另一方管理的文档。
