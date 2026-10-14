---
sidebar_position: 2
title: "Hindsight 本地 MCP 服务器 | Claude 的持久记忆"
description: "将 Hindsight 作为本地 MCP 服务器运行，并使用嵌入式 PostgreSQL，无需外部配置。适合 Claude Code 和 Claude Desktop，让 Claude 在不同对话间保留长期记忆。"
---

# 本地 MCP 服务器 {#local-mcp-server}

Hindsight 提供本地 MCP 服务器，可在你的计算机上运行，并使用嵌入式 PostgreSQL 数据库。无需配置外部服务器或数据库。

适用于以下场景：
- **在 Claude Code / Claude Desktop 中个人使用** — 让 Claude 在不同对话间拥有长期记忆
- **开发和测试** — 无需基础设施即可快速设置
- **注重隐私的配置** — 所有数据都保存在你的计算机上

## 工作原理 {#how-it-works}

运行 `hindsight-local-mcp` 后，会在 `localhost:8888` 启动完整的 Hindsight API，并使用嵌入式 PostgreSQL 数据库（pg0）。随后，你可以通过 HTTP 将 MCP 客户端连接到该服务。

- 自动启动嵌入式 PostgreSQL（pg0）
- 启动时运行数据库迁移
- 在 `http://localhost:8888/mcp/` 提供完整的 MCP 端点
- 重启后，数据仍保存在 `~/.pg0/hindsight-mcp/`

## 设置 {#setup}

### 1. 启动服务器 {#1-start-the-server}

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... uvx --from hindsight-api hindsight-local-mcp
```

也可以使用 Ollama（无需 API 密钥）：

```bash
HINDSIGHT_API_LLM_PROVIDER=ollama HINDSIGHT_API_LLM_MODEL=llama3.2 uvx --from hindsight-api hindsight-local-mcp
```

### 2. 配置 MCP 客户端 {#2-configure-your-mcp-client}

**Claude Code：**

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

**其他 MCP 客户端** — 添加一条 HTTP 传输配置，并将地址指向 `http://localhost:8888/mcp/`。

## 记忆库模式 {#bank-modes}

本地服务器支持与托管 API 相同的两种模式：

### 多记忆库模式（默认） {#multi-bank-mode-default}

使用 `http://localhost:8888/mcp/`，即可访问包括记忆库管理在内的所有工具。每次请求通过 `bank_id` 工具参数或 `X-Bank-Id` 请求头选择记忆库。

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

### 单记忆库模式 {#single-bank-mode}

使用 `http://localhost:8888/mcp/<bank-id>/`，可将所有工具固定到一个记忆库，因此无需提供 `bank_id` 参数。此模式取代了旧的 `HINDSIGHT_API_MCP_LOCAL_BANK_ID` 环境变量。

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/my-bank/
```

## 可用工具 {#available-tools}

本地服务器提供完整的工具集（多记忆库模式下有 29 个工具，单记忆库模式下有 26 个工具）：

**核心记忆**

| 工具 | 说明 |
|------|-------------|
| `retain` | 将信息存入长期记忆，可选添加标签、元数据并关联文档 |
| `recall` | 使用自然语言搜索记忆，并可配置预算、类型过滤器和标签过滤器 |
| `reflect` | 综合记忆并生成经过推理的答案，可选择附加结构化输出 |

**心智模型**

| 工具 | 说明 |
|------|-------------|
| `list_mental_models` | 列出记忆库中固定的反思结果 |
| `get_mental_model` | 获取指定的心智模型 |
| `create_mental_model` | 创建心智模型，可选择设置自动刷新的触发条件 |
| `update_mental_model` | 更新心智模型的元数据 |
| `delete_mental_model` | 删除心智模型 |
| `refresh_mental_model` | 重新生成心智模型的内容 |

**强制指令**

| 工具 | 说明 |
|------|-------------|
| `list_directives` | 列出用于指导记忆处理的强制指令 |
| `create_directive` | 创建强制指令 |
| `delete_directive` | 删除强制指令 |

**记忆浏览**

| 工具 | 说明 |
|------|-------------|
| `list_memories` | 使用过滤条件和分页浏览记忆 |
| `get_memory` | 按 ID 获取指定记忆 |

**文档**

| 工具 | 说明 |
|------|-------------|
| `list_documents` | 列出已摄取的文档 |
| `get_document` | 获取指定文档 |
| `delete_document` | 删除文档及其关联的记忆 |

**操作**

| 工具 | 说明 |
|------|-------------|
| `list_operations` | 按状态过滤并列出异步操作 |
| `get_operation` | 查看操作状态和进度 |
| `cancel_operation` | 取消待处理或正在运行的操作 |

**标签和记忆库管理**

| 工具 | 说明 |
|------|-------------|
| `list_tags` | 列出记忆库中使用的所有唯一标签 |
| `get_bank` | 获取记忆库资料（名称、任务说明、性格倾向） |
| `get_bank_stats` | 获取记忆库统计信息（仅限多记忆库模式） |
| `update_bank` | 更新记忆库名称或任务说明 |
| `delete_bank` | 删除整个记忆库及其中的所有数据 |
| `clear_memories` | 清空记忆，但保留记忆库 |
| `list_banks` | 列出所有记忆库（仅限多记忆库模式） |
| `create_bank` | 创建或配置记忆库（仅限多记忆库模式） |

**知识库**

| 工具 | 说明 |
|------|-------------|
| `get_knowledge_base_tree` | 浏览文件夹和页面构成的目录树 |
| `search_knowledge_base` | 对知识页进行混合搜索 |
| `get_knowledge_page` | 以 Markdown 文档形式读取页面 |
| `create_knowledge_folder` | 创建文件夹 |
| `create_knowledge_page` | 创建页面（根据记忆库中的记忆持续更新的文档） |
| `update_knowledge_node` | 重命名或移动节点，或更新页面选项 |
| `delete_knowledge_node` | 删除文件夹或页面及其子树 |

参数的详细说明请参阅 [MCP 服务器参考](/developer/mcp-server#available-tools)。

## 环境变量 {#environment-variables}

本地服务器支持所有标准的 [Hindsight 配置变量](/developer/configuration)。本地使用时常用的变量如下：

| 变量 | 必填 | 默认值 | 说明 |
|----------|----------|---------|-------------|
| `HINDSIGHT_API_LLM_API_KEY` | 是* | — | LLM 提供商的 API 密钥 |
| `HINDSIGHT_API_LLM_PROVIDER` | 否 | `openai` | LLM 提供商（`openai`、`anthropic`、`ollama` 等） |
| `HINDSIGHT_API_LLM_MODEL` | 否 | `gpt-4o-mini` | 模型名称 |
| `HINDSIGHT_API_DATABASE_URL` | 否 | `pg0://hindsight-mcp` | 覆盖数据库 URL |
| `HINDSIGHT_API_PORT` | 否 | `8888` | 监听端口 |
| `HINDSIGHT_API_LOG_LEVEL` | 否 | `info` | 日志级别 |

*使用 Ollama 等本地提供商时无需 API 密钥。

## 故障排查 {#troubleshooting}

### 首次启动较慢 {#slow-first-startup}

首次启动时会下载本地嵌入模型（约 100 MB）并初始化数据库。之后再次启动会更快。

### 端口已被占用 {#port-already-in-use}

设置其他端口：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_PORT=9000 uvx --from hindsight-api hindsight-local-mcp
```

然后将 MCP 客户端 URL 更新为 `http://localhost:9000/mcp/`。

### 查看日志 {#checking-logs}

将 `HINDSIGHT_API_LOG_LEVEL` 设为 `debug`，以输出更详细的日志：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_LOG_LEVEL=debug uvx --from hindsight-api hindsight-local-mcp
```
