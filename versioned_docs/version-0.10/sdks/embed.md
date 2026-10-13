---
sidebar_position: 5
---

# 守护进程 CLI（hindsight-embed） {#daemon-cli-hindsight-embed}

具有自动守护进程管理的零配置本地记忆系统。非常适合开发、原型设计和单用户应用程序。

## 概述 {#overview}

`hindsight-embed` 是零配置SDK包裹着HindsightAPI和PostgreSQL数据库到单个自动管理的本地守护进程中。它专为开发、原型设计和单用户应用程序而设计，您需要在没有基础设施开销的情况下实现记忆功能。

**工作原理：**

1. **首条命令触发启动**：当你运行任何`hindsight-embed`命令，它检查本地守护进程是否正在运行
2. **自动管理守护进程**：如果没有守护进程存在，它会自动生成`hindsight-api --daemon` 在后台
3. **嵌入式数据库**：守护进程使用`pg0`（嵌入PostgreSQL) — 无需单独安装数据库
4. **命令转发**：您的命令通过以下方式转发到本地守护进程HTTP(本地主机:8888)
5. **自动关闭**：5 分钟不活动（可配置）后，守护进程正常关闭以释放资源

**主要功能：**

- **无需设置** — 一个 `configure`命令，你就准备好了
- **自动管理生命周期** — 守护进程按需启动并由每个客户端共享
- **隔离存储** — 每个记忆库都有自己的嵌入PostgreSQL数据库
- **仅限本地** — 绑定到 `127.0.0.1:8888`，无法通过网络访问
- **生产级引擎** — 使用与完整版本相同的记忆引擎API服务

将其视为长期记忆的SQLite — 无需管理服务器即可获得Hindsight的所有功能。

## 安装 {#installation}

通过安装 `uvx`（推荐 - 始终最新版本）：

```bash
#无需安装直接运行
uvx hindsight-embed@latest configure

#或者使用pipx进行持久化安装
pipx install hindsight-embed
```

## 快速入门 {#quick-start}

### 1. 配置 {#1-configure}

```bash
#交互配置
hindsight-embed configure

#或者通过环境变量进行非交互
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_API_KEY=sk-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=gpt-4o-mini
hindsight-embed configure
```

配置保存到`~/.hindsight/embed`：

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
#存储记忆
hindsight-embed memory retain default "用户更喜欢深色模式"

#查询记忆
hindsight-embed memory recall default "用户偏好"

#用记忆推理
hindsight-embed memory reflect default "我应该使用什么配色方案？"
```

守护进程在首次使用时自动启动！

### 3. 打开控制中心（可选） {#3-open-the-control-center-optional}

当您需要基于浏览器的配置向导和守护程序监控程序时，请使用本地控制中心：

```bash
#启动控制中心并打开浏览器
hindsight-embed control start

#或者在设置过程中使用浏览器向导而不是终端提示
hindsight-embed configure --ui
```

控制中心仅在本地主机上侦听（默认情况下 `http://localhost:7878`）并打印标记化的 URL。它将本地访问令牌存储在 `~/.hindsight/control.token` 并将日志写入`~/.hindsight/control.log`。

```bash
#为此次发布选择不同的控制中心端口
hindsight-embed control start --port 7879

#不自动打开浏览器启动
hindsight-embed control start --no-open

#检查、检查或停止控制中心
hindsight-embed control status
hindsight-embed control logs -f
hindsight-embed control stop
```

控制中心作为记忆守护进程的独立进程运行。停止或重新启动控制中心不会停止正在运行的守护程序。

## 环境变量 {#environment-variables}

|变量|说明|默认|
|----------|-------------|---------|
|`HINDSIGHT_API_LLM_API_KEY`|**必填**。API 密钥用于LLM提供商|-|
|`HINDSIGHT_API_LLM_PROVIDER`|LLM提供商：`openai`, `anthropic`, `gemini`, `groq`, `minimax`, `ollama`|`openai`|
|`HINDSIGHT_API_LLM_MODEL`|型号名称|`gpt-4o-mini`|
|`HINDSIGHT_EMBED_DAEMON_LOG_MAX_BYTES`|当守护进程日志达到此大小时，在启动时轮换它； `0` 禁用旋转|`10485760` (10 MiB)|
|`HINDSIGHT_EMBED_DAEMON_LOG_BACKUP_COUNT`|保留备份； `0` 在启动时截断完整日志|`3`|
|`HINDSIGHT_EMBED_CONTROL_PORT`|的默认端口 `hindsight-embed control start`|`7878`|

仅在守护进程启动时检查大小，因此单个不间断运行永远不会被截断并且可以
成长过去`MAX_BYTES` — 在下次启动时，整个文件将保留为第一个备份。保留尺寸 因此，
在附近 `MAX_BYTES × (BACKUP_COUNT + 1)`（默认为 40 MiB）仅适用于重新启动的守护进程
定期；运行数周的守护进程会保留其写入的内容。重新启动以保持绑定
有意义。

**提供商示例：**

```bash
# OpenAI
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_API_KEY=sk-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=gpt-4o

#Groq（快速推理）
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=llama-3.3-70b-versatile

# Anthropic
export HINDSIGHT_API_LLM_PROVIDER=anthropic
export HINDSIGHT_API_LLM_API_KEY=sk-ant-xxxxxxxxxxxx
export HINDSIGHT_API_LLM_MODEL=claude-sonnet-4-20250514
```

## 守护进程管理 {#daemon-management}

守护进程会一直运行，直到你停止它——它永远不会自行退出，所以一个很长的记忆存储、反思或
整合永远不会中断。

### 守护进程命令 {#daemon-commands}

```bash
#检查守护进程状态
hindsight-embed daemon status

#实时查看守护进程日志
hindsight-embed daemon logs -f

#手动停止守护进程
hindsight-embed daemon stop
```

### 回收磁盘空间 {#reclaiming-disk-space}

当守护进程通过 启动时 `uvx`（默认值npm包和编辑器插件），每个  它运行的Hindsight版本保留自己的缓存Python环境 — 每个大约 1.5 GB — 并且这些不会自动删除。如果磁盘空间紧张，请在清除缓存之前停止守护进程：只有在没有守护进程运行时才能回收未使用的条目。

```bash
hindsight-embed daemon stop
uv cache prune
hindsight-embed daemon status   #在当前版本上重新开始
```

### 控制中心命令 {#control-center-commands}

```bash
#启动或重用本地浏览器控制中心
hindsight-embed control start

#检查是否正在运行
hindsight-embed control status

#查看控制中心日志
hindsight-embed control logs -f

#停止控制中心进程
hindsight-embed control stop
```

## 命令 {#commands}

所有记忆操作都遵循与CLI相同的界面：

### 记忆存储（存储记忆） {#retain-store-memory}

```bash
hindsight-embed memory retain <bank_id> "content"

#有上下文
hindsight-embed memory retain <bank_id> "content" --context "来源信息"

#后台处理
hindsight-embed memory retain <bank_id> "content" --async
```

### 记忆召回（搜索） {#recall-search}

```bash
hindsight-embed memory recall <bank_id> "query"

#有预算控制
hindsight-embed memory recall <bank_id> "query" --budget high

#显示轨迹
hindsight-embed memory recall <bank_id> "query" --trace
```

### 反思（生成响应） {#reflect-generate-response}

```bash
hindsight-embed memory reflect <bank_id> "prompt"

#有额外的上下文
hindsight-embed memory reflect <bank_id> "prompt" --context "附加信息"
```

### 记忆库管理 {#bank-management}

```bash
#列出所有记忆库
hindsight-embed bank list

#查看记忆库统计数据
hindsight-embed bank stats <bank_id>

#设置记忆库名称
hindsight-embed bank name <bank_id> "我的助手"

#设定记忆库使命
hindsight-embed bank mission <bank_id> "我是一个乐于助人的AI助手"
```

## 故障排查 {#troubleshooting}

### 守护进程无法启动 {#daemon-wont-start}

检查守护进程日志：

```bash
hindsight-embed daemon logs
#或实时观看
hindsight-embed daemon logs -f
```

常见问题：
- **缺少 API 密钥**：设置`HINDSIGHT_API_LLM_API_KEY`
- **端口冲突**：使用端口 8888 的另一个服务
- **权限**：检查`~/.hindsight/`目录权限

### 守护进程立即退出 {#daemon-exits-immediately}

守护进程永远不会自行停止，因此退出意味着崩溃或启动失败。检查日志：

```bash
hindsight-embed daemon status
tail -n 100 ~/.hindsight/daemon.log
```

### 重置配置 {#reset-configuration}

```bash
#删除配置文件并重新配置
rm ~/.hindsight/embed
hindsight-embed configure
```

## 何时使用 {#when-to-use}

**适合：**
- 开发和原型设计
- 单用户应用程序
- 本地优先工具
- 使用Hindsight进行快速实验

**不适用于：**
- 生产多用户部署
- 网络可访问的服务
- 高可用性要求
- 多租户应用程序

对于生产部署，请使用 [API 服务](/developer/services) 带外部  改为PostgreSQL。
