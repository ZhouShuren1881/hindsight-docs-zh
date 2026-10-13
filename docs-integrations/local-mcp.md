---
sidebar_position: 2
title: "Hindsight本地MCP服务器 | Claude 的持久记忆"
description: "将 Hindsight 作为嵌入了 PostgreSQL 的本地 MCP 服务器运行 — 无需外部设置。非常适合 Claude 代码和 Claude 桌面，可在对话中实现长期记忆。"
---

# 本地MCP服务器 {#local-mcp-server}

Hindsight 提供本地 MCP 服务器，该服务器完全在您的计算机上运行，​​并带有嵌入式 PostgreSQL 数据库。无需外部服务器或数据库设置。

这非常适合：
- **在 Claude Code / Claude Desktop 中个人使用** — 给予Claude对话中的长期记忆
- **开发与测试** — 无需基础设施即可快速设置
- **重视隐私的配置** — 所有数据都保留在您的计算机上

## 工作原理 {#how-it-works}

运行`hindsight-local-mcp`开始完整HindsightAPI`localhost:8888` 带有嵌入式PostgreSQL数据库（pg0）。然后您连接您的MCP通过 HTTP 访问它的客户端。

- 自动启动嵌入式PostgreSQL (pg0)
- 启动时运行数据库迁移
- 暴露完整MCP终点位于 `http://localhost:8888/mcp/`
- 数据持续存在`~/.pg0/hindsight-mcp/` 重新启动

## 设置 {#setup}

### 1。启动服务器 {#1-start-the-server}

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... uvx --from hindsight-api hindsight-local-mcp
```

或使用Ollama（无需API密钥）：

```bash
HINDSIGHT_API_LLM_PROVIDER=ollama HINDSIGHT_API_LLM_MODEL=llama3.2 uvx --from hindsight-api hindsight-local-mcp
```

### 2。配置您的MCP客户端 {#2-configure-your-mcp-client}

**Claude Code：**

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

**其他 MCP 客户端** — 添加指向 的 HTTP 传输条目 `http://localhost:8888/mcp/`。

## 记忆库模式 {#bank-modes}

本地服务器支持与托管API相同的两种模式：

### 多记忆库模式（默认） {#multi-bank-mode-default}

使用`http://localhost:8888/mcp/` — 公开所有工具，包括记忆库管理。 记忆库是根据请求通过 选择的 `bank_id` 工具参数或`X-Bank-Id`标题。

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

### 单一记忆库模式 {#single-bank-mode}

使用`http://localhost:8888/mcp/<bank-id>/` — 将所有工具固定到一个记忆库，否 需要 `bank_id`参数。这取代了旧的`HINDSIGHT_API_MCP_LOCAL_BANK_ID` 环境变量。

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/my-bank/
```

## 可用工具 {#available-tools}

本地服务器公开完整的工具集（多记忆库模式下有29个工具，单记忆库模式下有26个工具）：

**核心记忆**

|工具|说明|
|------|-------------|
|`retain`|使用可选标签、元数据和文档关联将信息存储到长期记忆中|
|`recall`|使用自然语言、可配置预算、类型过滤器和标签过滤器搜索记忆|
|`reflect`|将记忆合成为带有可选结构化输出的推理答案|

**心智模型**

|工具|说明|
|------|-------------|
|`list_mental_models`|列出记忆库的保存的反思结果|
|`get_mental_model`|获取特定的心智模型|
|`create_mental_model`|创建一个带有可选自动刷新触发器的新心智模型|
|`update_mental_model`|更新心智模型元数据|
|`delete_mental_model`|删除心智模型|
|`refresh_mental_model`|重新生成心智模型的内容|

**指令**

|工具|说明|
|------|-------------|
|`list_directives`|列出指导记忆处理的指令|
|`create_directive`|创建一个新指令|
|`delete_directive`|删除指令|

**浏览记忆**

|工具|说明|
|------|-------------|
|`list_memories`|通过过滤和分页浏览记忆|
|`get_memory`|通过ID获取特定记忆|

**文档**

|工具|说明|
|------|-------------|
|`list_documents`|列出摄取的文档|
|`get_document`|获取特定文档|
|`delete_document`|删除文档及其链接的记忆|

**操作**

|工具|说明|
|------|-------------|
|`list_operations`|列出带有状态过滤的异步操作|
|`get_operation`|检查操作状态和进度|
|`cancel_operation`|取消挂起或正在运行的操作|

**标签与记忆库管理**

|工具|说明|
|------|-------------|
|`list_tags`|列出记忆库中使用的独特标签|
|`get_bank`|获取记忆库简介（姓名、使命、性格）|
|`get_bank_stats`|获取记忆库统计信息（仅限多记忆库）|
|`update_bank`|更新记忆库名称或使命|
|`delete_bank`|删除整个记忆库及其所有数据|
|`clear_memories`|清除记忆而不删除记忆库|
|`list_banks`|列出所有记忆库（仅限多记忆库）|
|`create_bank`|创建或配置记忆库（仅限多记忆库）|

**知识库**

|工具|说明|
|------|-------------|
|`get_knowledge_base_tree`|浏览folder/page树|
|`search_knowledge_base`|知识页面的混合搜索|
|`get_knowledge_page`|将页面作为 Markdown 文档阅读|
|`create_knowledge_folder`|创建文件夹|
|`create_knowledge_page`|创建一个页面（记忆库记忆中的动态文档）|
|`update_knowledge_node`|Rename/move 节点或更新页面的选项|
|`delete_knowledge_node`|删除文件夹或页面及其子树|

详细参数文档请参见[MCP 服务器参考](/developer/mcp-server#available-tools)。

## 环境变量 {#environment-variables}

全标配支持 [Hindsight 配置变量](/developer/configuration)。本地使用的关键：

|变量|必填|默认|说明|
|----------|----------|---------|-------------|
| `HINDSIGHT_API_LLM_API_KEY` | 是* | — | LLM 提供商的 API 密钥 |
| `HINDSIGHT_API_LLM_PROVIDER` | 否 | `openai` | LLM 提供商（`openai`、`anthropic`、`ollama` 等） |
| `HINDSIGHT_API_LLM_MODEL` | 否 | `gpt-4o-mini` | 模型名称 |
| `HINDSIGHT_API_DATABASE_URL` | 否 | `pg0://hindsight-mcp` | 覆盖数据库 URL |
| `HINDSIGHT_API_PORT` | 否 | `8888` | 监听端口 |
| `HINDSIGHT_API_LOG_LEVEL` | 否 | `info` | 日志级别 |

*使用Ollama等本地提供商时不需要。

## 故障排查 {#troubleshooting}

### 首次启动缓慢 {#slow-first-startup}

第一次启动下载本地嵌入模型（~100MB）并初始化数据库。随后的启动速度会更快。

### 端口已在使用中 {#port-already-in-use}

设置不同的端口：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_PORT=9000 uvx --from hindsight-api hindsight-local-mcp
```

然后更新你的MCP客户端 URL 至 `http://localhost:9000/mcp/`。

### 检查日志 {#checking-logs}

套装`HINDSIGHT_API_LOG_LEVEL=debug` 用于详细输出：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_LOG_LEVEL=debug uvx --from hindsight-api hindsight-local-mcp
```
