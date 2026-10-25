---
sidebar_position: 5
---

# 守护进程 CLI（hindsight-embed） {#daemon-cli-hindsight-embed}

零配置的本地记忆系统，自动管理守护进程。适合开发、原型设计和单用户应用。

## 概述 {#overview}

`hindsight-embed` 是一个零配置 SDK，将 Hindsight API 和 PostgreSQL 数据库封装在一个自动管理的本地守护进程中。它面向开发、原型设计和单用户应用，让你无需承担基础设施管理开销即可使用记忆功能。

**工作原理：**

1. **首条命令触发启动**：运行任意 `hindsight-embed` 命令时，系统会检查本地守护进程是否正在运行。
2. **自动管理守护进程**：如果没有守护进程，系统会自动在后台启动 `hindsight-api --daemon`。
3. **嵌入式数据库**：守护进程使用 `pg0`（嵌入式 PostgreSQL），无需单独安装数据库。
4. **命令转发**：命令通过 HTTP 转发到本地守护进程（localhost:8888）。
5. **自动关闭**：空闲 5 分钟（可配置）后，守护进程会正常关闭以释放资源。

**主要功能：**

- **无需额外设置**：执行一条 `configure` 命令即可使用。
- **自动管理生命周期**：守护进程按需启动，由所有客户端共享。
- **隔离存储**：每个记忆库都有独立的嵌入式 PostgreSQL 数据库。
- **仅限本地访问**：绑定到 `127.0.0.1:8888`，无法通过网络访问。
- **生产级引擎**：使用与完整 API 服务相同的记忆引擎。

可以将它理解为长期记忆领域的 SQLite：无需管理服务器，即可使用 Hindsight 的全部能力。

## 安装 {#installation}

通过 `uvx` 安装（推荐，始终使用最新版本）：

```bash
# 无需安装，直接运行
uvx hindsight-embed@latest configure

# 或使用 pipx 进行持久安装
pipx install hindsight-embed
```

## 快速入门 {#quick-start}

### 1. 配置 {#1-configure}

```bash
# 交互式配置
hindsight-embed configure

# 或通过环境变量进行非交互式配置
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_API_KEY=sk-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=gpt-4o-mini
hindsight-embed configure
```

配置保存到 `~/.hindsight/embed`：

```bash
HINDSIGHT_API_LLM_PROVIDER=openai
HINDSIGHT_API_LLM_MODEL=gpt-4o-mini
HINDSIGHT_API_LLM_API_KEY=sk-xxxxxxxxxxxx

# 守护进程设置（macOS：强制使用 CPU，避免 MPS/XPC 问题）
HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU=1
HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU=1
```

### 2. 使用记忆操作 {#2-use-memory-operations}

```bash
# 存入一条记忆
hindsight-embed memory retain default "User prefers dark mode"

# 查询记忆
hindsight-embed memory recall default "user preferences"

# 基于记忆推理
hindsight-embed memory reflect default "What color scheme should I use?"
```

首次使用时，守护进程会自动启动！

### 3. 打开控制中心（可选） {#3-open-the-control-center-optional}

如果需要在浏览器中使用配置向导并监控、管理守护进程，可以使用本地控制中心：

```bash
# 启动控制中心并打开浏览器
hindsight-embed control start

# 或在设置时使用浏览器向导，代替终端中的交互提示
hindsight-embed configure --ui
```

控制中心仅监听本地主机（默认为 `http://localhost:7878`），并输出带访问令牌的 URL。它将本地访问令牌保存到 `~/.hindsight/control.token`，将日志写入 `~/.hindsight/control.log`。

```bash
# 为本次启动指定其他控制中心端口
hindsight-embed control start --port 7879

# 启动时不自动打开浏览器
hindsight-embed control start --no-open

# 检查状态、查看日志或停止控制中心
hindsight-embed control status
hindsight-embed control logs -f
hindsight-embed control stop
```

控制中心与记忆守护进程在不同的进程中运行。停止或重启控制中心不会停止正在运行的守护进程。

## 环境变量 {#environment-variables}

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `HINDSIGHT_API_LLM_API_KEY` | **必填**。LLM 服务提供方的 API 密钥 | - |
| `HINDSIGHT_API_LLM_PROVIDER` | LLM 服务提供方：`openai`、`anthropic`、`gemini`、`groq`、`minimax`、`ollama` | `openai` |
| `HINDSIGHT_API_LLM_MODEL` | 模型名称 | `gpt-4o-mini` |
| `HINDSIGHT_EMBED_DAEMON_LOG_MAX_BYTES` | 守护进程启动时，若日志达到此大小则进行轮换；`0` 表示禁用轮换 | `10485760`（10 MiB） |
| `HINDSIGHT_EMBED_DAEMON_LOG_BACKUP_COUNT` | 保留的备份数；`0` 表示在启动时截断已达到大小上限的日志 | `3` |
| `HINDSIGHT_EMBED_CONTROL_PORT` | `hindsight-embed control start` 的默认端口 | `7878` |

日志大小仅在守护进程启动时检查，因此单次连续运行期间，日志绝不会被截断，其大小可以超过 `MAX_BYTES`。下次启动时，整个日志文件会作为第一份备份保留。因此，只有定期重启的守护进程，其保留的日志总大小才会在 `MAX_BYTES × (BACKUP_COUNT + 1)` 左右（默认为 40 MiB）；连续运行数周的守护进程会保留期间写入的全部日志。要让这个大小限制起作用，需要重启守护进程。

**服务提供方示例：**

```bash
# OpenAI
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_API_KEY=sk-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=gpt-4o

# Groq（快速推断）
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=llama-3.3-70b-versatile

# Anthropic
export HINDSIGHT_API_LLM_PROVIDER=anthropic
export HINDSIGHT_API_LLM_API_KEY=sk-ant-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=claude-sonnet-4-20250514
```

## 守护进程管理 {#daemon-management}

守护进程会持续运行，直到你将其停止；它绝不会自行退出，因此长时间运行的 Retain（存入）、Reflect（反思）或整合过程不会被中途打断。

### 守护进程命令 {#daemon-commands}

```bash
# 检查守护进程状态
hindsight-embed daemon status

# 实时查看守护进程日志
hindsight-embed daemon logs -f

# 手动停止守护进程
hindsight-embed daemon stop
```

### 回收磁盘空间 {#reclaiming-disk-space}

通过 `uvx` 启动守护进程时（npm 包和编辑器插件默认采用此方式），每个运行过的 Hindsight 版本都会保留自己的 Python 环境缓存，每个约占 1.5 GB，而且不会自动删除。如果磁盘空间紧张，请先停止守护进程，再清理缓存：只有在没有守护进程运行时，才能回收未使用的缓存条目。

```bash
hindsight-embed daemon stop
uv cache prune
hindsight-embed daemon status   # 使用当前版本重新启动
```

### 控制中心命令 {#control-center-commands}

```bash
# 启动或复用本地浏览器控制中心
hindsight-embed control start

# 检查是否正在运行
hindsight-embed control status

# 查看控制中心日志
hindsight-embed control logs -f

# 停止控制中心进程
hindsight-embed control stop
```

## 命令 {#commands}

所有记忆操作都采用与 CLI 相同的接口：

### Retain：存入记忆 {#retain-store-memory}

```bash
hindsight-embed memory retain <bank_id> "content"

# 附带上下文
hindsight-embed memory retain <bank_id> "content" --context "source information"

# 后台处理
hindsight-embed memory retain <bank_id> "content" --async
```

### Recall（召回）：搜索 {#recall-search}

```bash
hindsight-embed memory recall <bank_id> "query"

# 控制预算
hindsight-embed memory recall <bank_id> "query" --budget high

# 显示执行追踪
hindsight-embed memory recall <bank_id> "query" --trace
```

### Reflect：生成响应 {#reflect-generate-response}

```bash
hindsight-embed memory reflect <bank_id> "prompt"

# 附带额外上下文
hindsight-embed memory reflect <bank_id> "prompt" --context "additional info"
```

### 记忆库管理 {#bank-management}

```bash
# 列出所有记忆库
hindsight-embed bank list

# 查看记忆库统计信息
hindsight-embed bank stats <bank_id>

# 设置记忆库名称
hindsight-embed bank name <bank_id> "My Assistant"

# 设置记忆库任务说明
hindsight-embed bank mission <bank_id> "I am a helpful AI assistant"
```

## 故障排查 {#troubleshooting}

### 守护进程无法启动 {#daemon-wont-start}

检查守护进程日志：

```bash
hindsight-embed daemon logs
# 或实时查看
hindsight-embed daemon logs -f
```

常见问题：

- **缺少 API 密钥**：设置 `HINDSIGHT_API_LLM_API_KEY`。
- **端口冲突**：其他服务正在使用端口 8888。
- **权限问题**：检查 `~/.hindsight/` 目录的权限。

### 守护进程立即退出 {#daemon-exits-immediately}

守护进程绝不会自行停止，因此退出意味着发生了崩溃或启动失败。请检查日志：

```bash
hindsight-embed daemon status
tail -n 100 ~/.hindsight/daemon.log
```

### 重置配置 {#reset-configuration}

```bash
# 删除配置文件并重新配置
rm ~/.hindsight/embed
hindsight-embed configure
```

## 适用场景 {#when-to-use}

**适合：**

- 开发和原型设计
- 单用户应用
- 本地优先的工具
- 使用 Hindsight 进行快速实验

**不适合：**

- 生产环境中的多用户部署
- 可通过网络访问的服务
- 要求高可用性的场景
- 多租户应用

生产部署请使用 [API 服务](/developer/services)，并搭配外部 PostgreSQL 数据库。
