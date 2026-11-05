---
sidebar_position: 42
title: "通过 Hindsight 为 OpenBot 提供共享智能体记忆 | 集成"
description: "让 OpenBot 队友拥有跨线程持久保存、在整个团队共享的长期记忆：将 Hindsight MCP 服务器连接到任意 OpenBot 智能体。"
---

import Link from '@docusaurus/Link';

# OpenBot

借助 [Hindsight](https://hindsight.vectorize.io)，为你的 [OpenBot](https://openbot.run) 队友提供持久记忆。OpenBot 在你自己的计算机上运行一个由持久 AI 智能体组成的团队，包括 Claude、Codex、Grok、Gemini、OpenCode 等。将 Hindsight 连接为 MCP 服务器后，每个智能体都能 **Recall（召回）** 之前线程中学到的信息，在工作时 **Retain（存入）** 新事实，并对它所知道的关于你和项目的所有信息进行 **Reflect（反思）**。

## 为什么这很重要 {#why-this-matters}

OpenBot 智能体是持久的，但其上下文并非如此：每个线程填满时都会进行压缩，一个智能体学到的内容对下一个智能体不可见。OpenBot 的内置记忆有所帮助，但容量很小（每个智能体仅几 KB），且为单个智能体私有。Hindsight 在其旁边增加了持久记忆层：

- **Recall** 使用语义检索，即使用词不同也能找到相关事实。
- **Retain** 跨线程和重启保存事实、经历和决策。
- **Reflect** 基于智能体所知道的全部信息推理并回答问题。
- **共享一个记忆库** 意味着整个团队使用同一份记忆，而不是让 17 个智能体各自保留待更新的副本。

## 功能 {#what-it-does}

连接 Hindsight MCP 服务器后，每个 OpenBot 智能体都可以使用 Hindsight 工具（`recall`、`retain`、`sync_retain`、`reflect`、心智模型和文档工具）。将每个智能体或整个团队指向一个 Hindsight **记忆库**，即可实现：

- **记忆跨线程保留**：一个会话中存入的事实可以在下一个会话、上下文压缩后以及重启后召回。
- **共享或隔离，由你选择**：团队可以共享一个记忆库，也可以为每个智能体单独设置记忆库以实现严格隔离。记忆库由 MCP URL 选择。
- **各处使用同一份数据**：OpenBot 智能体写入的记忆与其他 Hindsight 集成和自动化读取的记忆位于同一个库中，因此它们看到一致的数据视图。

## Hindsight 与 OpenBot 内置记忆 {#hindsight-and-openbots-built-in-memory}

OpenBot 自带内置记忆（`remember` / `search_memories` 工具），它是一个容量较小的单智能体存储。连接 Hindsight 后，智能体可以使用**两套**记忆工具，但两个存储不共享数据。如果由智能体自行判断，它仍可能将某些事实保存到 OpenBot 内置存储，而不是 Hindsight。

这带来两点：

- **MCP 连接提供的是能力，而不是使用习惯。** 连接 Hindsight 后，服务器上的每个智能体都能使用其工具，但智能体只有决定使用时才会调用。要让智能体持续从 Hindsight 召回并向其存入内容，而不是使用内置存储，请配合使用 **Hindsight Memory 技能**（参见[自动使用](#make-it-automatic-optional)）。
- **Hindsight 是共享的持久层。** 内置记忆容量小且属于单个智能体；Hindsight 记忆库支持语义检索、长期保存，并由指向该库的所有智能体共享。

## 安装 {#installation}

> ✨ **推荐：** [Hindsight Cloud](https://ui.hindsight.vectorize.io/signup)——免费注册、创建记忆库并获取 API 密钥，无需自行托管。

### 通过 OpenBot 应用市场安装（推荐） {#via-the-openbot-marketplace-recommended}

在 OpenBot 中打开 **Apps**，找到 **Hindsight** 并点击 **Connect**。系统会要求填写两个值：

| 字段 | 值 |
| --- | --- |
| MCP URL | `https://api.hindsight.vectorize.io/mcp/<bank>/`（替换 `<bank>`） |
| API key | 你的 Hindsight Cloud API 密钥（`hsk_…`） |

为需要共享记忆的智能体启用该应用。

### 手动添加为自定义 MCP 服务器 {#add-it-manually-as-a-custom-mcp-server}

无需应用市场中的条目，现在就可以连接 Hindsight。在 OpenBot 的**服务器设置**中，添加一个 URL MCP 服务器：

- **URL**：`https://api.hindsight.vectorize.io/mcp/<bank>/`
- **Header**：`Authorization: Bearer hsk_…`

## 自托管 {#self-hosting}

想在自己的计算机上运行 Hindsight？启动本地服务器并将 MCP URL 指向它：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

然后使用 `http://localhost:8888/mcp/<bank>/` 作为 MCP URL。不启用身份认证的本地服务器无需 API 密钥，将该字段留空即可。

## 选择记忆库 {#choosing-a-bank}

记忆库是 MCP URL（`/mcp/<bank>/`）的一部分，因此每个连接都限定在一个记忆库内，智能体无需传递 `bank_id`。

- **团队记忆**：为每个智能体提供相同的 URL（例如 `/mcp/team/`）。
- **单智能体记忆**：为每个智能体提供各自的 URL（例如 `/mcp/research-bot/`、`/mcp/ops-bot/`）。

完整工具列表和记忆库选择规则请参见 [MCP 服务器参考](/developer/mcp-server)。

## 自动使用（可选） {#make-it-automatic-optional}

连接应用为智能体提供记忆*工具*；**Hindsight Memory 技能**则培养其使用*习惯*：行动前召回、存入持久事实，并使用 Hindsight 工具代替 OpenBot 内置记忆。<Link to="pathname:///skills/openbot/hindsight-memory/SKILL.md" download="SKILL.md">下载 `SKILL.md`</Link>，将其添加到 OpenBot 技能库，并为使用 Hindsight 的智能体启用。

**为多个智能体启用。** 技能需要**逐个智能体**启用，没有“所有智能体”开关，新智能体也不会自动继承：

- 为每个应该使用 Hindsight 的智能体启用该技能（通过智能体的 **Skills** 面板，或让智能体运行 `install_local_skill`）。
- 相比之下，MCP 服务器连接只需在 Local 服务器设置中添加一次，即可供**所有**智能体使用。因此工具对所有智能体可用，只有技能（使用习惯）需要逐个启用。
- 对于 **Claude** 智能体，放在 `~/.agents/skills/<slug>/` 中的技能会由每个 Claude 智能体自动加载。其他提供方（OpenCode、Codex、Gemini 等）需要逐个智能体安装。

> 要让“每个智能体都自动使用 Hindsight”，最简洁的长期方案是让 Hindsight *替换* OpenBot 内置记忆，而不是与其并存；上游正在 [nightly-labs/openbot#3682](https://github.com/nightly-labs/openbot/issues/3682) 跟踪此事。

## 试一试 {#try-it}

让智能体记住一件事，然后启动新线程并询问：

> **记住，我们决定为所有新服务统一使用 Postgres。**

> *（新线程）* **我们统一采用了什么数据库？为什么？**

启用 **Hindsight Memory 技能**后，智能体通过 Hindsight 的 `sync_retain` 保存信息，第二个线程从 Hindsight 召回该决策，即使它自己的上下文为空。

> **提示：** 如果第一个线程报告已将信息保存到自己的“essential memories”，而第二个线程无法召回，说明智能体使用了 OpenBot 内置记忆，而不是 Hindsight。启用记忆技能（见下文），使其使用 Hindsight 的 `retain`/`recall`。
