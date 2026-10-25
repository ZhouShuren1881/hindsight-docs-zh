---
sidebar_position: 7
---

# 开发指南 {#development-guide}

本指南介绍如何搭建本地开发环境，以便为 Hindsight 做贡献。

## 前置条件 {#prerequisites}

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) - 快速的 Python 包管理器
- Docker 和 Docker Compose
- LLM 提供商凭据，或 Ollama、GitHub Copilot 等本地或基于订阅的提供商

## 本地开发环境配置 {#local-development-setup}

### 1. 克隆代码仓库 {#1-clone-the-repository}

```bash
git clone https://github.com/vectorize-io/hindsight.git
cd hindsight
```

### 2. 安装依赖 {#2-install-dependencies}

```bash
uv sync
```

### 3. 启动 PostgreSQL {#3-start-postgresql}

通过 Docker 仅启动数据库：

```bash
cd docker && docker-compose up -d postgres
```

### 4. 配置环境 {#4-configure-environment}

```bash
cp .env.example .env
```

在 `.env` 中填写 LLM API 密钥：

```bash
# Database (connects to Docker postgres)
HINDSIGHT_API_DATABASE_URL=postgresql://hindsight:hindsight_dev@localhost:5432/hindsight

# LLM Provider (choose one)
HINDSIGHT_API_LLM_PROVIDER=groq
HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx
HINDSIGHT_API_LLM_MODEL=llama-3.1-70b-versatile
```

### 5. 启动 API 服务器 {#5-start-the-api-server}

```bash
./scripts/start-server.sh --env local
```

服务器将在 [http://localhost:8888](http://localhost:8888) 上运行。

## 运行测试 {#running-tests}

```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_retrieval.py

# Run with verbose output
uv run pytest -v
```

## 代码生成 {#code-generation}

### 重新生成 API 客户端 {#regenerate-api-clients}

修改 OpenAPI 规范后，重新生成客户端：

```bash
./scripts/generate-clients.sh
```

此命令会生成：
- 位于 `hindsight-clients/python/` 的 Python 客户端
- 位于 `hindsight-clients/typescript/` 的 TypeScript 客户端

### 导出 OpenAPI 模式 {#export-openapi-schema}

```bash
./scripts/export-openapi.sh
```

## 项目结构 {#project-structure}

```
hindsight/
├── hindsight-api/          # Main API server
│   ├── hindsight_api/
│   │   ├── api/           # HTTP endpoints
│   │   ├── engine/        # Memory engine, retrieval, reasoning
│   │   └── web/           # Server entry point
│   └── tests/
├── hindsight-clients/      # Generated SDK clients
│   ├── python/
│   └── typescript/
├── hindsight-control-plane/ # Admin UI (Next.js)
├── docker/                 # Docker Compose setup
└── scripts/               # Development scripts
```

## 参与贡献 {#contributing}

Hindsight 不接受团队外部人员提交的拉取请求。如需报告错误或提出功能请求，请[提交议题](https://github.com/vectorize-io/hindsight/issues/new/choose)。详情请参阅 [CONTRIBUTING.md](https://github.com/vectorize-io/hindsight/blob/main/CONTRIBUTING.md)。

## 故障排查 {#troubleshooting}

### 数据库连接问题 {#database-connection-issues}

确认 PostgreSQL 正在运行：

```bash
docker-compose ps
```

检查数据库连接：

```bash
psql postgresql://hindsight:hindsight_dev@localhost:5432/hindsight
```

### 机器学习模型下载 {#ml-model-download}

首次运行时，Hindsight 会下载嵌入模型和重排序模型。这可能需要几分钟。模型会缓存在 `~/.cache/huggingface/` 中。

### 端口冲突 {#port-conflicts}

如果端口 8888 已被占用：

```bash
HINDSIGHT_API_PORT=8889 ./scripts/start-server.sh --env local
```
