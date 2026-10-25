# 安装 {#installation}

Hindsight 可根据你的基础设施和需求采用多种方式部署。

:::tip 不想管理基础设施？
**[Hindsight Cloud](https://ui.hindsight.vectorize.io)** 是全托管服务，可负责所有基础设施、扩缩容和维护工作 — [在此注册](https://ui.hindsight.vectorize.io)。
:::

## 支持的平台 {#supported-platforms}

Hindsight 可在 **Linux**、**macOS** 和 **Windows** 上运行：

| 平台 | Docker | 裸机（pip） | 内嵌数据库（pg0） | 说明 |
|----------|--------|------------------|--------------------|-------|
| **Linux**（x86_64、ARM64） | ✅ | ✅ | ✅ | 完全支持，建议用于生产环境 |
| **macOS**（Apple Silicon / arm64） | ✅ | ✅ | ✅ | 完全支持 |
| **macOS**（Intel / x86_64） | ✅ | ⚠️ 仅 slim | ✅ | 使用 `hindsight-all-slim` / `hindsight-api-slim`。完整套件中的本地 ML 模型（PyTorch、MLX）没有发布适用于 Intel Mac 的 wheel，因此执行 `pip install hindsight-all` 时会悄悄回退到数月前的版本。将 slim 套件与托管嵌入/重排服务提供方或进程内 ONNX 后端（`hindsight-api-slim[local-onnx]`）搭配使用。 |
| **Windows**（x86_64） | ✅ | ✅ | ✅ | 完全支持 — 使用外部 PostgreSQL 的选项请参阅 [Windows 设置](#windows) |

所有平台在开发时都支持使用内嵌数据库（pg0）。在 Windows 上，你还可以使用外部 PostgreSQL 安装；分步指南请参阅 [Windows](#windows) 部分。

---

## 先决条件 {#prerequisites}

### PostgreSQL {#postgresql}

Hindsight 需要 PostgreSQL 14+，并需要向量扩展来执行相似度搜索。支持的扩展包括：

- **pgvector**（默认）
- **pgvectorscale**
- **vchord**
- **scann**（AlloyDB）

使用 `HINDSIGHT_API_VECTOR_EXTENSION` 配置要使用的扩展。详情请参阅[配置](./configuration)。

**默认情况下**，Hindsight 使用 **pg0** — 一种在本机运行的内嵌 PostgreSQL。它便于开发使用，但**不建议用于生产环境**。

**用于生产环境时**，请使用外部 PostgreSQL，并搭配一种受支持的向量扩展：
- **Supabase** — 内置 pgvector 的托管 PostgreSQL
- **Neon** — 无服务器 PostgreSQL，支持 pgvector
- **Azure Database for PostgreSQL** — 支持 pgvector 和 pgvectorscale
- **Google AlloyDB** / **AlloyDB Omni** — 支持 pgvector 和 ScaNN
- **AWS RDS** / **Cloud SQL** — 启用了 pgvector 扩展
- **自行托管** — PostgreSQL 14+，搭配你选择的向量扩展

### LLM 提供方 {#llm-provider}

事实提取、实体消解和答案生成都需要 LLM API 密钥。支持的提供方、模型建议和配置方式，请参阅[模型](./models)。

### 硬件 {#hardware}

Hindsight 专为在常见硬件上运行而设计。资源占用主要取决于使用**完整**镜像（内含本地嵌入和重排模型），还是使用将这些任务交给外部提供方的 **slim** 镜像。

| 组件 | 最低 RAM | 建议 RAM | 说明 |
|-----------|-------------|-----------------|-------|
| **API — 完整镜像** | 1.5 GB | 2 GB | 将本地 BGE 嵌入模型（约 130 MB）和 MiniLM 交叉编码器（约 90 MB）载入内存，并使用 PyTorch/ONNX 运行时内存区。空闲时 RSS 稳定在约 0.8–1.0 GB；负载下预计为 1.2–1.5 GB。 |
| **API — Slim 镜像** | 512 MB | 1 GB | 不含本地模型。稳定运行时的 RSS 主要来自 Python 运行时和数据库连接。需要[外部嵌入和重排服务提供方](./configuration#embeddings)（例如 TEI、OpenAI、Cohere）。 |
| **控制平面（UI）** | 128 MB | 256 MB | Next.js 进程，资源占用较低。 |
| **工作进程**（如单独部署） | 与 API 镜像变体相同 | 与 API 镜像变体相同 | 工作进程会加载与 API 服务器相同的模型。 |
| **PostgreSQL** | 512 MB | 1 GB+ | 随记忆和索引数量增加而扩展。 |

:::tip 降低资源占用
完整镜像的大部分内存用于其内含的嵌入和重排模型及 PyTorch/ONNX 运行时。若要将部署的 RAM 占用降到几百 MB，可改用 **slim** 镜像，并配置[外部嵌入和重排服务提供方](./configuration#embeddings)。
:::

CPU 与 GPU：仅使用 CPU 时，2 个 vCPU 足以满足开发和基本工作负载。对于生产流量，本地重排器（交叉编码器）通常是主要瓶颈，使用 GPU 通常有助于将召回延迟维持在合理范围；也可以将重排任务交给配备专用 GPU 硬件的[外部重排服务提供方](./configuration#embeddings)（例如 TEI、Cohere）。

---

## Docker {#docker}

**适用场景**：快速开始、开发、小规模部署

在一个容器中运行所有组件，并使用内嵌 PostgreSQL：

```bash
export OPENAI_API_KEY=sk-xxx

docker run -it --pull always --name hindsight --restart unless-stopped --shm-size=1g -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API 服务器**：http://localhost:8888
- **控制平面**（Web UI）：http://localhost:9999

:::note 持久化数据：命名卷与主机绑定挂载
容器以非 root 用户（UID 1000）运行。建议使用上方的 `hindsight-data` **命名卷** — Docker 会将其所有者设为容器用户，因此无需额外设置即可使用。

如果改为绑定挂载**主机目录**（`-v $HOME/.hindsight-docker:/home/hindsight/.pg0`），该目录必须由 UID 1000 所有，否则内嵌数据库会因 `Permission denied` 而无法启动：

```bash
sudo chown -R 1000:1000 $HOME/.hindsight-docker
```

不要用 `--user` 让镜像以其他 UID 运行来绕过此问题。镜像只定义了 `hindsight` 用户（UID 1000），其他 UID 在 `/etc/passwd` 中都没有对应条目，因此启动时会在一个按 ID 查询当前运行用户的库中崩溃：

```
KeyError: 'getpwuid(): uid not found: 1042'
```

受支持的主机目录绑定挂载方式是以 UID 1000（默认值）运行，并将目录所有者改为该 UID。如果你无法更改目录所有者 — 例如目录位于固定使用 `uid=` 挂载的 NAS 共享上 — 请改用命名卷。
:::

所有已发布镜像都[使用 Cosign 签名](#verifying-image-signatures) — 验证是可选的。

:::tip 在生产环境中为 `HINDSIGHT_API_WORKER_ID` 设置稳定值
工作进程使用容器主机名作为自身标识；Docker 默认会将主机名设为容器 ID。容器 ID 每次重启都会变化，因此容器停止时正在处理的任务会留在旧 ID 下，新容器无法将其识别为自己的任务。

将 `HINDSIGHT_API_WORKER_ID` 设为稳定值（例如 `-e HINDSIGHT_API_WORKER_ID=hindsight-prod`），使工作进程在重启后仍保持相同标识。即使只部署一个容器，也建议这样设置。诊断和恢复命令请参阅 [Admin CLI - 恢复卡住的操作](./admin-cli#recovering-stuck-or-zombie-operations)。
:::

### Docker 镜像变体 {#docker-image-variants}

| 变体 | 大小（AMD64） | 大小（ARM64） | 适用场景 |
|---------|--------------|--------------|-------------|
| **Full**（`latest`） | 约 9 GB | 约 3.7 GB | 默认选项。嵌入和重排在镜像内运行；LLM 始终使用外部服务，包括本地推理场景。 |
| **Slim**（`slim`） | 约 500 MB | 约 500 MB | 当嵌入和重排已依赖外部服务（OpenAI、Cohere、TEI）时使用。镜像显著更小，部署速度更快。需要配置[外部服务提供方](./configuration#embeddings)。 |

Slim 镜像对应 pip 包 [`hindsight-api-slim`](#bare-metal-pip)。外部提供方选项请参阅[配置](./configuration#embeddings)。

这两种镜像都不包含 llama.cpp，因此 Docker 中无法使用内置的 `llamacpp` 提供方。要在本地运行推理，请在 Hindsight 旁边启动 llama.cpp（或 Ollama、LM Studio、vLLM），并将 `HINDSIGHT_API_LLM_BASE_URL` 指向它 — 可参考 [`docker/docker-compose/local-llm/`](https://github.com/vectorize-io/hindsight/tree/main/docker/docker-compose/local-llm) 中可运行的 compose 文件。

### NVIDIA GPU 加速（CUDA） {#nvidia-gpu-acceleration-cuda}

若要在 NVIDIA GPU 上运行进程内本地嵌入和重排模型，请按 [`docker/docker-compose/cuda/`](https://github.com/vectorize-io/hindsight/tree/main/docker/docker-compose/cuda) 中的方案构建启用 CUDA 的自定义镜像：

```bash
docker compose -f docker/docker-compose/cuda/docker-compose.yaml up --build
```

该方案将进程内 PyTorch 升级到 CUDA 12.6，并通过 NVIDIA Container Toolkit 配置 GPU 直通。请在实际运行镜像的机器上构建 — 经过模拟的跨架构镜像无法访问 GPU。

CUDA 运行时是额外叠加的：基础镜像中的 CPU 版 PyTorch wheel 仍保留在底层，因此生成的镜像在磁盘上约为 **11 GB**，而 Full 镜像约为 9 GB。这就是为什么没有发布 CUDA 镜像 — 只有实际配备 GPU 并会使用它时，额外开销才值得承担。

前置条件、手动构建步骤和验证方法请参阅 [`docker/docker-compose/cuda/README.md`](https://github.com/vectorize-io/hindsight/tree/main/docker/docker-compose/cuda)。

### 在自定义镜像中打包自定义模型 {#bundling-custom-models-in-a-custom-image}

:::tip 使用非默认本地模型部署到生产环境
如果使用非默认的本地嵌入器或重排器，请在构建时将模型打包进自定义镜像，而不是启用 Helm `modelCache` PVC。可运行示例请参阅 [`docker/docker-compose/custom-models/`](https://github.com/vectorize-io/hindsight/tree/main/docker/docker-compose/custom-models)。
:::

### 可用标签 {#available-tags}

```bash
# Standalone (API + Control Plane)
ghcr.io/vectorize-io/hindsight:latest        # Full, latest release
ghcr.io/vectorize-io/hindsight:latest-slim          # Slim, latest release
ghcr.io/vectorize-io/hindsight:0.4.9         # Full, specific version
ghcr.io/vectorize-io/hindsight:0.4.9-slim    # Slim, specific version

# API only
ghcr.io/vectorize-io/hindsight-api:latest
ghcr.io/vectorize-io/hindsight-api:latest-slim

# Control Plane only
ghcr.io/vectorize-io/hindsight-control-plane:latest
```

### 验证镜像签名 {#verifying-image-signatures}

镜像使用 [Cosign](https://docs.sigstore.dev/cosign/signing/overview/) 进行无密钥 OIDC 签名。验证任意标签的命令如下：

```bash
cosign verify ghcr.io/vectorize-io/hindsight:<tag> \
  --certificate-identity-regexp '^https://github\.com/vectorize-io/hindsight/\.github/workflows/(sign-images|release)\.yml@.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

---

## Helm / Kubernetes {#helm--kubernetes}

**适用场景**：生产部署、自动扩缩容、云环境

```bash
# Install with built-in PostgreSQL
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set api.llm.provider=groq \
  --set api.llm.apiKey=gsk_xxxxxxxxxxxx \
  --set postgresql.enabled=true

# Or use external PostgreSQL
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set api.llm.provider=groq \
  --set api.llm.apiKey=gsk_xxxxxxxxxxxx \
  --set postgresql.enabled=false \
  --set api.database.url=postgresql://user:pass@postgres.example.com:5432/hindsight

# Install a specific version
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight --version 0.1.3

# Upgrade to latest
helm upgrade hindsight oci://ghcr.io/vectorize-io/charts/hindsight
```

**要求**：
- Kubernetes 集群（GKE、EKS、AKS 或自行托管）
- Helm 3.8+

### 分布式工作进程 {#distributed-workers}

对于高吞吐量部署，可启用专用工作进程 Pod，以便独立扩展任务处理能力：

```bash
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set worker.enabled=true \
  --set worker.replicaCount=3
```

该 chart 会将工作进程部署为 StatefulSet，因此每个 Pod 都会获得稳定名称（例如 `hindsight-worker-0`），并将其用作自身的 `HINDSIGHT_API_WORKER_ID`。Pod 领取的任务在重启后仍会被识别为自己的任务。如果将该 chart 换成普通 Deployment，则必须为每个副本显式设置 `HINDSIGHT_API_WORKER_ID` — 否则主机名会随机变化，之前领取的任务会成为孤儿任务。诊断方式请参阅 [Admin CLI - 恢复卡住的操作](./admin-cli#recovering-stuck-or-zombie-operations)。

配置详情和架构说明请参阅[服务 - 工作进程服务](./services#worker-service)。

所有 chart 选项请参阅 [Helm chart values.yaml](https://github.com/vectorize-io/hindsight/tree/main/helm/hindsight/values.yaml)。

---

## 裸机（pip） {#bare-metal-pip}

**适用场景**：在主机上将 Hindsight 作为独立服务运行。

### 安装 {#install}

```bash
pip install hindsight-api        # Full — works out of the box
pip install hindsight-api-slim   # Slim — requires external services for embeddings, reranking, and the database
```

使用 `hindsight-api-slim` 时，必须为所有模型操作配置外部服务提供方。详情请参阅[配置](./configuration#embeddings)。

### 使用内嵌数据库运行 {#run-with-embedded-database}

在开发和测试时，Hindsight 可以使用内嵌 PostgreSQL（pg0）运行：

```bash
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx

hindsight-api
```

这会在 `~/.hindsight/data/` 中创建数据库，并在 http://localhost:8888 启动 API。

### 使用外部 PostgreSQL 运行 {#run-with-external-postgresql}

在生产环境中，连接到你自己的 PostgreSQL 实例：

```bash
export HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@localhost:5432/hindsight
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx

hindsight-api
```

**注意**：数据库必须已创建，并启用 pgvector（`CREATE EXTENSION vector;`）。

### CLI 选项 {#cli-options}

```bash
hindsight-api --port 9000          # Custom port (default: 8888)
hindsight-api --host 127.0.0.1     # Bind to localhost only
hindsight-api --workers 4          # Multiple worker processes
hindsight-api --log-level debug    # Verbose logging
```

### 控制平面 {#control-plane}

可以使用 npx 独立运行控制平面（Web UI）：

```bash
npx @vectorize-io/hindsight-control-plane --api-url http://localhost:8888
```

它会连接到正在运行的 API 服务器，并提供可视化界面，用于管理记忆库、浏览实体和测试查询。

#### 选项 {#options}

| 选项 | 环境变量 | 默认值 | 说明 |
|--------|---------------------|---------|-------------|
| `-p, --port` | `PORT` | 9999 | 监听端口 |
| `-H, --hostname` | `HOSTNAME` | 0.0.0.0 | 绑定的主机名 |
| `-a, --api-url` | `HINDSIGHT_CP_DATAPLANE_API_URL` | http://localhost:8888 | Hindsight API URL |
| | `HINDSIGHT_CP_ACCESS_KEY` | *(无)* | 用于保护控制平面 UI 的访问密钥。设置后，用户必须输入此密钥才能登录。 |

#### 示例 {#examples}

```bash
# Run on custom port
npx @vectorize-io/hindsight-control-plane --port 9999 --api-url http://localhost:8888

# Using environment variables
export HINDSIGHT_CP_DATAPLANE_API_URL=http://api.example.com
npx @vectorize-io/hindsight-control-plane

# Production deployment
PORT=80 HINDSIGHT_CP_DATAPLANE_API_URL=https://api.hindsight.io npx @vectorize-io/hindsight-control-plane
```

---

## Windows {#windows}

**适用场景**：无需 Docker，直接在 Windows 上运行 Hindsight

Hindsight 开箱即支持在 Windows 上使用内嵌数据库（pg0）— 只需安装并运行：

```powershell
pip install hindsight-api

set HINDSIGHT_API_LLM_PROVIDER=openai
set HINDSIGHT_API_LLM_API_KEY=sk-xxx
set HINDSIGHT_API_LLM_MODEL=gpt-4o-mini

hindsight-api
```

### 使用外部 PostgreSQL（可选） {#using-external-postgresql-optional}

如果你更愿意使用自己的 PostgreSQL 实例，而不是内嵌数据库：

```powershell
# Install PostgreSQL
winget install PostgreSQL.PostgreSQL.17

# Build pgvector (requires Visual Studio Build Tools)
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# Open "x64 Native Tools Command Prompt for VS" and run:
set PGROOT=C:\Program Files\PostgreSQL\17
nmake /F Makefile.win
nmake /F Makefile.win install

# Create the database and enable the vector extension
psql -U postgres -c "CREATE DATABASE hindsight;"
psql -U postgres -d hindsight -c "CREATE EXTENSION vector;"
```

然后运行 Hindsight 并将其指向你的数据库：

```powershell
pip install hindsight-api

set HINDSIGHT_API_DATABASE_URL=postgresql://postgres@localhost:5432/hindsight
set HINDSIGHT_API_LLM_PROVIDER=openai
set HINDSIGHT_API_LLM_API_KEY=sk-xxx
set HINDSIGHT_API_LLM_MODEL=gpt-4o-mini

hindsight-api
```

- **API 服务器**：http://localhost:8888

:::tip
你也可以使用 slim 包（`pip install hindsight-api-slim`），但需要为嵌入和重排配置外部服务提供方。详情请参阅[配置](./configuration#embeddings)。
:::

### Windows 与中国网络环境说明 {#windows--china-network-notes}

如果你在受中国网络限制的 Windows 环境中运行：

1. DeepSeek 可用于 `HINDSIGHT_API_LLM_PROVIDER`，但 DeepSeek 不提供嵌入端点。
2. 使用本地嵌入（在受限网络中更有利于隐私和可靠性，建议采用）。
3. 启动 Hindsight 前设置 `HF_ENDPOINT=https://hf-mirror.com`，让 Hugging Face 模型下载通过中国可访问的镜像进行。

```powershell
set HF_ENDPOINT=https://hf-mirror.com

set HINDSIGHT_API_LLM_PROVIDER=deepseek
set HINDSIGHT_API_LLM_API_KEY=sk-your-deepseek-key
set HINDSIGHT_API_LLM_MODEL=deepseek-v4-flash
set HINDSIGHT_API_LLM_BASE_URL=https://api.deepseek.com

set HINDSIGHT_API_EMBEDDINGS_PROVIDER=local
set HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL=BAAI/bge-small-en-v1.5

set HINDSIGHT_API_RERANKER_PROVIDER=flashrank

hindsight-api
```

`HF_ENDPOINT` 变量由 Hugging Face 工具（`huggingface_hub`）使用，并非 Hindsight 自身使用。

---

## 嵌入 Python 应用 {#embedded-in-a-python-application}

**适用场景**：通过 Python 以编程方式使用 Hindsight，无需运行独立的服务器进程。

```bash
pip install hindsight-all        # Full — works out of the box (Linux, Windows, Apple Silicon Macs)
pip install hindsight-all-slim   # Slim — requires external services for embeddings, reranking, and the database
```

在 Intel（x86_64）Mac 上，请安装 `hindsight-all-slim` — 详情请参阅[支持的平台](#supported-platforms)。

`hindsight-all` 支持两种嵌入运行模式：

**进程内**（`HindsightServer`）：服务器在应用内部的后台线程中运行。适合需要紧密集成，并且已自行管理进程生命周期的场景。

```python
from hindsight import HindsightServer, HindsightClient

with HindsightServer(llm_provider="openai", llm_api_key="sk-xxx") as server:
    client = HindsightClient(base_url=server.url)
    client.retain(bank_id="alice", content="Alice prefers concise answers.")
    results = client.recall(bank_id="alice", query="How should I respond to Alice?")
```

**托管子进程**（`HindsightEmbedded`）：服务器作为后台守护进程运行，可供多个 Python 进程或会话共享。守护进程会在首次使用时启动，并持续运行，直到被停止。

```python
from hindsight import HindsightEmbedded

client = HindsightEmbedded(llm_provider="openai", llm_api_key="sk-xxx")
client.retain(bank_id="alice", content="Alice prefers concise answers.")
results = client.recall(bank_id="alice", query="How should I respond to Alice?")
```

完整 API 参考请参阅 [Python SDK](../sdks/python.mdx)。

---

## 后续步骤 {#next-steps}

- [配置](./configuration.mdx) — 环境变量和设置
- [模型](./models.mdx) — ML 模型和提供方
- [监控](./monitoring.md) — 指标和可观测性
