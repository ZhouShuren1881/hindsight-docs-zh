---
sidebar_position: 7
---

# 开发指南 {#development-guide}

本指南介绍如何搭建本地开发环境，参与 Hindsight 开发。

## 前置条件 {#prerequisites}

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)：快速的 Python 包管理器
- Docker 和 Docker Compose
- LLM 提供商凭据，或 Ollama、GitHub Copilot 等本地或基于订阅的提供程序

## 本地开发环境配置 {#local-development-setup}

### 1. 克隆仓库 {#1-clone-the-repository}

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

编辑 `.env`，填入 LLM API 密钥：

```bash
# 数据库（连接到 Docker 中的 postgres）
HINDSIGHT_API_DATABASE_URL=postgresql://hindsight:hindsight_dev@localhost:5432/hindsight

# LLM 提供程序（选择一种）
HINDSIGHT_API_LLM_PROVIDER=groq
HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx
HINDSIGHT_API_LLM_MODEL=llama-3.1-70b-versatile
```

### 5. 启动 API 服务器 {#5-start-the-api-server}

```bash
./scripts/start-server.sh --env local
```

服务器地址为 `http://localhost:8888`。

## 运行测试 {#running-tests}

```bash
# 运行所有测试
uv run pytest

# 运行指定测试文件
uv run pytest tests/test_retrieval.py

# 显示详细输出
uv run pytest -v
```

## 代码生成 {#code-generation}

### 重新生成 API 客户端 {#regenerate-api-clients}

修改 OpenAPI 规范后，重新生成客户端：

```bash
./scripts/generate-clients.sh
```

此操作会生成：
- Python 客户端，位于 `hindsight-clients/python/`
- TypeScript 客户端，位于 `hindsight-clients/typescript/`

### 导出 OpenAPI schema {#export-openapi-schema}

```bash
./scripts/export-openapi.sh
```

## 项目结构 {#project-structure}

```
hindsight/
├── hindsight-api/          # 主 API 服务器
│   ├── hindsight_api/
│   │   ├── api/           # HTTP 端点
│   │   ├── engine/        # 记忆引擎、检索和推理
│   │   └── web/           # 服务器入口
│   └── tests/
├── hindsight-clients/      # 生成的 SDK 客户端
│   ├── python/
│   └── typescript/
├── hindsight-control-plane/ # 管理界面（Next.js）
├── docker/                 # Docker Compose 配置
└── scripts/               # 开发脚本
```

## 贡献 {#contributing}

Hindsight 不接受团队外部的拉取请求。如需报告问题或
提出功能需求，请[创建 issue](https://github.com/vectorize-io/hindsight/issues/new/choose)。
详情见 [CONTRIBUTING.md](https://github.com/vectorize-io/hindsight/tree/v0.10.3/CONTRIBUTING.md)
中的说明。

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

首次运行时，Hindsight 会下载嵌入和重排序模型，可能需要几分钟。模型缓存位于 `~/.cache/huggingface/`。

### 端口冲突 {#port-conflicts}

如果端口 8888 已被占用：

```bash
HINDSIGHT_API_PORT=8889 ./scripts/start-server.sh --env local
```
