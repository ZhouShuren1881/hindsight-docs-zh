---
sidebar_position: 34
title: "使用 Hindsight 为 Obsidian 添加长期记忆 | 集成"
description: "将 Obsidian 笔记库同步到 Hindsight，与基于笔记作答的智能体聊天。笔记库始终是权威数据源，每个答案都会引用来源笔记。"
---

# Obsidian {#obsidian}

借助 [Hindsight](/)，让智能体真正了解 [Obsidian](https://obsidian.md) 笔记库中的内容。插件会将笔记库同步到 Hindsight 记忆库，并添加一个聊天面板。面板中的答案以笔记为依据，并引用相应笔记。

[查看更新日志 →](/changelog/integrations/obsidian)

## 为什么这很重要 {#why-this-matters}

Obsidian 是你存放知识的地方。向量检索插件可以找到相关笔记，但无法综合推理多篇笔记、记住你问过什么，也无法随着笔记库增长持续整合内容。Hindsight 补上了这一层能力：

- **Recall（召回）**比文本搜索更快、更准确。
- **Reflect（反思）**会基于整个笔记库推理并回答问题，同时显示所用笔记。
- **心智模型**（规划中）会持续维护笔记库摘要，并在你写入新内容时刷新。

## 权威数据源仍在 Obsidian 中 {#source-of-truth-stays-in-obsidian}

这项集成遵循一条硬性规则：**Hindsight 绝不会成为第二个权威数据源。** 同步方向是单向的（Obsidian → Hindsight）；每个答案都会引用来源笔记，方便你**直接修改源笔记**；聊天对话默认**不会**存储。编辑笔记后，Hindsight 会在下次同步时重新与笔记内容保持一致。

## 功能说明 {#what-it-does}

- **增量同步笔记库** — 笔记会作为 Hindsight 文档存入。编辑会插入或更新文档，删除会移除文档。系统会计算内容哈希，因此会跳过未更改的笔记。
- **自动限定范围** — 每篇笔记在摄取时都会自动添加 **笔记库**、**文件夹**（含子文件夹）以及**创建/更新日期**标签。只有在召回时，你才需要考虑范围；届时可通过 Hindsight 的 `tag_groups` 任意组合筛选条件。多个笔记库可以共用一个记忆库，并通过 `vault:` 标签彼此区分。
- **界面与 API 使用相同数据** — Obsidian 聊天面板和自动化流程（n8n、Hermes 等）会使用相同标签访问同一个记忆库，因此看到的范围视图一致。
- **有依据的聊天** — 侧边面板通过 Reflect 基于笔记回答问题，并提供可折叠的**引用**（点击即可打开来源笔记）和**推理过程**详情。
- **手动或自动同步** — 可以在每次编辑时同步，也可以按需运行_立即同步笔记库_。

### 范围筛选 {#scoping}

通过界面或 API 调用 Recall / Reflect 时，可以组合以下维度进行筛选：

| 维度 | 标签 |
| --- | --- |
| 笔记库 | `vault:<name>` |
| 文件夹（及其上级目录） | `folder:Work`、`folder:Work/Clients` |
| 日期 | `created:2026-03`、`updated:2026-06` |

你在笔记 frontmatter 中设置的 `tags` 和 `aliases` 也会保留下来。

## 安装 {#installation}

> ✨ **建议使用：**[Hindsight Cloud](https://ui.hindsight.vectorize.io) — 免费注册并获取 API 密钥，即可免去自托管。

该插件仍处于 beta 阶段，目前通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 安装：添加仓库 [`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian)（BRAT 用于安装的专用插件仓库），然后在 **设置 → 社区插件（Settings → Community plugins）** 中启用插件。

**自托管方案** — 在本地运行 Hindsight：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

## 配置 {#configuration}

打开 **设置 → Hindsight（Settings → Hindsight）**：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| API URL | `https://api.hindsight.vectorize.io` | Hindsight 服务器；自托管时使用 `http://localhost:8888` |
| API 密钥 | — | Hindsight Cloud API 密钥 |
| 记忆库名称 | `obsidian` | 所有笔记库共用的记忆库；通过 `vault:` 标签区分 |
| 包含/排除文件夹 | — | 限制同步哪些笔记 |
| 编辑时同步 | 开启 | 编辑笔记时自动重新摄取 |
| 默认聊天深度 | 低 | 聊天答案的 Reflect 推理预算 |
| 记住对话 | **关闭** | 开启后，聊天轮次会存入 Hindsight（这会在笔记库之外创建记忆） |

## 命令 {#commands}

- **立即同步笔记库** — 完整协调同步（摄取已更改的笔记，并清理已删除的笔记）。
- **摄取当前笔记** — 强制同步当前活动笔记。
- **打开聊天** — 打开基于笔记作答的聊天面板。

## 无桌面应用时通过 CLI 摄取 {#headless--cli-ingestion-no-desktop-app}

如果你的笔记库位于始终运行的服务器上（磁盘内容由 Obsidian Sync 保持最新），就可以通过同一软件包提供的 `hindsight-obsidian-sync` CLI，在不运行 Obsidian 应用的情况下执行相同的摄取流程。它使用与插件**相同的同步引擎**，因此生成的文档 ID、范围标签和清理归属都一致。你可以先在服务器上同步笔记库，之后再从其他设备交互使用，而不会让两个摄取程序相互冲突或重复创建文档。

```bash
npm install -g @vectorize-io/hindsight-obsidian

# 单次协调同步（适合由 cron 定时运行）
hindsight-obsidian-sync reconcile \
  --vault ~/Vaults/Brain --bank my-vault \
  --api-url https://api.hindsight.vectorize.io --api-token hsk_...

# 或保持进程运行，实时同步更改
hindsight-obsidian-sync reconcile --vault ~/Vaults/Brain --bank my-vault --watch
```

如果未指定 `--api-url` / `--api-token`，CLI 会分别回退到 `HINDSIGHT_API_URL` / `HINDSIGHT_API_TOKEN`。其他选项包括可重复指定的 `--include` / `--exclude`、`--vault-name`、`--prefix-doc-id` 和 `--index`。

同步索引（CLI 中相当于插件的 `data.json`）默认位于 `~/.hindsight/obsidian/<vault>.json`，特意放在笔记库**之外**，这样 Obsidian Sync 就不会传播该文件。如果 CLI 和插件使用同一个记忆库与笔记库，请让两边的范围设置保持一致（包含/排除规则、笔记库名称、`prefix-doc-id`）。两边分别维护自己的索引；每次协调同步只会清理各自索引跟踪的内容。因此，范围设置不一致时，一方可能删除另一方管理的文档。
