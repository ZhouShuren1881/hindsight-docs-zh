# 安装 {#installation}

Hindsight 支持多种部署方式，可根据基础设施和需求选择。

:::tip 不想管理基础设施？
**[Hindsight Cloud](https://ui.hindsight.vectorize.io)** 是全托管服务，负责基础设施、扩缩容和维护。[点击注册](https://ui.hindsight.vectorize.io)。
:::

## 支持的平台 {#supported-platforms}

Hindsight 可运行在 **Linux**、**macOS** 和 **Windows** 上：

| 平台 | Docker | 裸机安装（pip） | 嵌入式数据库（pg0） | 说明 |
|----------|--------|------------------|--------------------|-------|
| **Linux**（x86_64、ARM64） | ✅ | ✅ | ✅ | 完全支持，推荐用于生产环境 |
| **macOS**（Apple Silicon / arm64） | ✅ | ✅ | ✅ | 完全支持 |
| **macOS**（Intel / x86_64） | ✅ | ⚠️ 仅 slim | ✅ | 使用 `hindsight-all-slim` / `hindsight-api-slim`。完整包使用的本地机器学习模型（PyTorch、MLX）不提供 Intel Mac 的 wheel，因此 `pip install hindsight-all` 会在不提示的情况下回退到几个月前的版本。可为 slim 包配备托管的嵌入／重排序提供程序，或进程内 ONNX 后端（`hindsight-api-slim[local-onnx]`）。 |
| **Windows**（x86_64） | ✅ | ✅ | ✅ | 完全支持；外部 PostgreSQL 的配置方法见 [Windows 配置](#windows) |

所有平台都支持使用嵌入式数据库（pg0）进行开发。Windows 也可使用外部 PostgreSQL；具体步骤见 [Windows](#windows) 一节。

---

## 前置条件 {#prerequisites}

### PostgreSQL

Hindsight 需要 PostgreSQL 14+，并使用向量扩展进行相似度搜索。支持的扩展包括：

- **pgvector**（默认）
- **pgvectorscale**
- **vchord**
- **scann** (AlloyDB)

通过 `HINDSIGHT_API_VECTOR_EXTENSION` 选择扩展，详情见[配置](./configuration)。

**默认情况下**，Hindsight 使用 **pg0**，即在本机运行的嵌入式 PostgreSQL。它便于开发，但**不建议用于生产环境**。

**生产环境**应使用外部 PostgreSQL，并安装一种支持的向量扩展：
- **Supabase**：内置 pgvector 的托管 PostgreSQL。
- **Neon**：支持 pgvector 的无服务器 PostgreSQL。
- **Azure Database for PostgreSQL**：支持 pgvector 和 pgvectorscale。
- **Google AlloyDB** / **AlloyDB Omni**：支持 pgvector 和 ScaNN。
- **AWS RDS** / **Cloud SQL**：启用 pgvector 扩展。
- **自行托管**：PostgreSQL 14+，搭配你选择的向量扩展。

### LLM 提供程序 {#llm-provider}

事实提取、实体解析和答案生成需要 LLM API 密钥。支持的提供程序、模型建议及配置见[模型](./models)。

### 硬件 {#hardware}

Hindsight 可运行在普通硬件上。资源占用主要取决于使用 **full** 镜像（内置本地嵌入和重排序模型），还是 **slim** 镜像（使用外部提供程序）。

| 组件 | 最低内存 | 建议内存 | 说明 |
|-----------|-------------|-----------------|-------|
| **API：完整镜像** | 1.5 GB | 2 GB | 将本地 BGE 嵌入模型（约 130 MB）和 MiniLM 交叉编码器（约 90 MB）载入内存，此外还有 PyTorch/ONNX 运行时内存区。空闲 RSS 约为 0.8～1.0 GB，负载下预计为 1.2～1.5 GB。 |
| **API：精简镜像** | 512 MB | 1 GB | 不加载本地模型，稳定运行时 RSS 主要来自 Python 运行时和数据库连接。需要[外部嵌入和重排序提供程序](./configuration#embeddings)，例如 TEI、OpenAI、Cohere。 |
| **控制平面（UI）** | 128 MB | 256 MB | 轻量的 Next.js 进程。 |
| **工作进程**（独立部署时） | 与所选 API 镜像相同 | 与所选 API 镜像相同 | 工作进程加载的模型与 API 服务器相同。 |
| **PostgreSQL** | 512 MB | 1 GB+ | 资源需求随记忆和索引数量增长。 |

:::tip 减少资源占用
完整镜像的大部分内存用于嵌入和重排序模型及其 PyTorch/ONNX 运行时。切换为 **slim** 镜像并配置[外部嵌入和重排序提供程序](./configuration#embeddings)，可将内存需求降至几百 MB。
:::

CPU 与 GPU：仅使用 CPU 时，2 个 vCPU 即可满足开发和基础工作负载。生产流量下，本地重排序模型（交叉编码器）是主要瓶颈，通常使用 GPU 才能保持合理的召回延迟；也可以将重排序交给部署在专用 GPU 上的[外部重排序提供程序](./configuration#embeddings)，例如 TEI 或 Cohere。

---

## Docker

**适合**：快速入门、开发和小规模部署。

在一个容器中运行所有服务，并使用嵌入式 PostgreSQL：

```bash
export OPENAI_API_KEY=sk-xxx

docker run -it --pull always --name hindsight --restart unless-stopped --shm-size=1g -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API 服务器**：http://localhost:8888
- **控制平面**（Web 界面）：http://localhost:9999

:::note 数据持久化：命名卷与宿主机目录挂载
容器以非 root 用户（UID 1000）运行。推荐使用上面的 `hindsight-data` **命名卷**：Docker 会将其所有者设为容器用户，无需额外配置。

如果改为挂载**宿主机目录**（`-v $HOME/.hindsight-docker:/home/hindsight/.pg0`），目录必须归 UID 1000 所有，否则嵌入式数据库会因 `Permission denied` 而启动失败：

```bash
sudo chown -R 1000:1000 $HOME/.hindsight-docker
```

**不要**通过 `--user` 指定其他 UID 来绕过此问题。镜像只定义了 `hindsight` 用户（UID 1000），其他 UID 没有对应的 `/etc/passwd` 条目，启动时某个按 ID 查找当前用户的库会崩溃：

```
KeyError: 'getpwuid(): uid not found: 1042'
```

使用 UID 1000（默认值），并将目录所有者调整为该 UID，才是受支持的宿主机目录挂载方式。如果无法更改目录所有者，例如挂载的 NAS 共享使用了固定 `uid=`，请改用命名卷。
:::

所有发布镜像都[使用 Cosign 签名](#verifying-image-signatures)，验证签名是可选步骤。

:::tip 在生产环境中设置稳定的 `HINDSIGHT_API_WORKER_ID`
工作进程使用容器主机名作为身份，Docker 默认将其设为容器 ID。该值每次重启都会变化，因此容器停止时正在处理的任务会留在旧 ID 下，新容器无法识别这些任务属于自己。

将 `HINDSIGHT_API_WORKER_ID` 设为稳定值，例如 `-e HINDSIGHT_API_WORKER_ID=hindsight-prod`，使工作进程在重启后保持同一身份。即使只有一个容器，也建议这样设置。诊断和恢复命令见[管理 CLI：恢复卡住的操作](./admin-cli#recovering-stuck-or-zombie-operations)。
:::

### Docker 镜像类型 {#docker-image-variants}

| 类型 | 大小（AMD64） | 大小（ARM64） | 适用场景 |
|---------|--------------|--------------|-------------|
| **完整镜像**（`latest`） | 约 9 GB | 约 3.7 GB | 默认选择。嵌入和重排序在镜像内运行；LLM 始终在镜像外运行，本地推理也一样。 |
| **精简镜像**（`slim`） | 约 500 MB | 约 500 MB | 适用于已使用外部嵌入和重排序服务（OpenAI、Cohere、TEI）的场景。镜像显著减小，部署更快。需要[外部提供程序](./configuration#embeddings)。 |

精简镜像对应 [`hindsight-api-slim`](#bare-metal-pip) pip 包。外部提供程序选项见[配置](./configuration#embeddings)。

两种镜像都不包含 llama.cpp，因此 Docker 中无法使用内置的 `llamacpp` 提供程序。如需本地推理，请在 Hindsight 旁运行 llama.cpp（或 Ollama、LM Studio、vLLM），并将 `HINDSIGHT_API_LLM_BASE_URL` 指向它。可用的 Compose 示例见 [`docker/docker-compose/local-llm/`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/docker/docker-compose/local-llm)。

### NVIDIA GPU 加速（CUDA） {#nvidia-gpu-acceleration-cuda}

如需在 NVIDIA GPU 上运行进程内嵌入和重排序模型，请参照 [`docker/docker-compose/cuda/`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/docker/docker-compose/cuda) 构建支持 CUDA 的自定义镜像：

```bash
docker compose -f docker/docker-compose/cuda/docker-compose.yaml up --build
```

该方案将进程内 PyTorch 升级到 CUDA 12.6，并通过 NVIDIA Container Toolkit 配置 GPU 透传。请在实际运行镜像的机器上构建；通过仿真构建的跨架构镜像无法访问 GPU。

CUDA 运行时会叠加到现有镜像上，基础镜像的 CPU PyTorch wheel 仍留在较低层，因此最终镜像**磁盘占用约 11 GB**，而完整镜像约为 9 GB。这也是没有发布 CUDA 镜像的原因：只有真正使用 GPU 时，这部分成本才值得承担。

前置条件、手动构建步骤和验证方法见 [`docker/docker-compose/cuda/README.md`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/docker/docker-compose/cuda)。

### 在自定义镜像中打包自定义模型 {#bundling-custom-models-in-a-custom-image}

:::tip 使用非默认本地模型的生产部署
如果使用非默认的本地嵌入或重排序模型，请在构建时将模型打包到自定义镜像，而不是启用 Helm 的 `modelCache` PVC。可运行的示例见 [`docker/docker-compose/custom-models/`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/docker/docker-compose/custom-models)。
:::

### 可用标签 {#available-tags}

```bash
# 独立部署（API + 控制平面）
ghcr.io/vectorize-io/hindsight:latest        # 完整镜像，最新版本
ghcr.io/vectorize-io/hindsight:latest-slim          # 精简镜像，最新版本
ghcr.io/vectorize-io/hindsight:0.4.9         # 完整镜像，指定版本
ghcr.io/vectorize-io/hindsight:0.4.9-slim    # 精简镜像，指定版本

# 仅 API
ghcr.io/vectorize-io/hindsight-api:latest
ghcr.io/vectorize-io/hindsight-api:latest-slim

# 仅控制平面
ghcr.io/vectorize-io/hindsight-control-plane:latest
```

### 验证镜像签名 {#verifying-image-signatures}

镜像使用 [Cosign](https://docs.sigstore.dev/cosign/signing/overview/) 的无密钥 OIDC 签名。验证任意标签的方法：

```bash
cosign verify ghcr.io/vectorize-io/hindsight:<tag> \
  --certificate-identity-regexp '^https://github\.com/vectorize-io/hindsight/\.github/workflows/(sign-images|release)\.yml@.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

---

## Helm / Kubernetes

**适合**：生产部署、自动扩缩容和云环境。

```bash
# 使用内置 PostgreSQL 安装
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set api.llm.provider=groq \
  --set api.llm.apiKey=gsk_xxxxxxxxxxxx \
  --set postgresql.enabled=true

# 或使用外部 PostgreSQL
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set api.llm.provider=groq \
  --set api.llm.apiKey=gsk_xxxxxxxxxxxx \
  --set postgresql.enabled=false \
  --set api.database.url=postgresql://user:pass@postgres.example.com:5432/hindsight

# 安装指定版本
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight --version 0.1.3

# 升级到最新版本
helm upgrade hindsight oci://ghcr.io/vectorize-io/charts/hindsight
```

**要求**：
- Kubernetes 集群（GKE、EKS、AKS 或自行托管）
- Helm 3.8+

### 分布式工作进程 {#distributed-workers}

高吞吐量部署可启用专用工作 Pod，独立扩展任务处理能力：

```bash
helm install hindsight oci://ghcr.io/vectorize-io/charts/hindsight \
  --set worker.enabled=true \
  --set worker.replicaCount=3
```

Chart 将工作进程部署为 StatefulSet，每个 Pod 因此获得稳定名称（例如 `hindsight-worker-0`），工作进程将其用作 `HINDSIGHT_API_WORKER_ID`。Pod 重启后仍能识别自己领取的任务。如果改用普通 Deployment，请为每个副本显式设置 `HINDSIGHT_API_WORKER_ID`；否则主机名随机变化，之前领取的任务就会失去归属。诊断方法见[管理 CLI：恢复卡住的操作](./admin-cli#recovering-stuck-or-zombie-operations)。

配置详情和架构见[服务：工作进程服务](./services#worker-service)。

所有 Chart 选项见 [Helm chart values.yaml](https://github.com/vectorize-io/hindsight/tree/v0.10.3/helm/hindsight/values.yaml)。

---

## 裸机安装（pip） {#bare-metal-pip}

**适合**：在宿主机上将 Hindsight 作为独立服务运行。

### 安装 {#install}

```bash
pip install hindsight-api        # 完整包，开箱即用
pip install hindsight-api-slim   # 精简包，嵌入、重排序和数据库均需外部服务
```

使用 `hindsight-api-slim` 时，必须为所有模型操作配置外部提供程序。详情见[配置](./configuration#embeddings)。

### 使用嵌入式数据库运行 {#run-with-embedded-database}

开发和测试时，Hindsight 可使用嵌入式 PostgreSQL（pg0）运行：

```bash
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx

hindsight-api
```

此命令在 `~/.hindsight/data/` 创建数据库，并在 http://localhost:8888 启动 API。

### 使用外部 PostgreSQL 运行 {#run-with-external-postgresql}

生产环境应连接到你自己的 PostgreSQL 实例：

```bash
export HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@localhost:5432/hindsight
export HINDSIGHT_API_LLM_PROVIDER=groq
export HINDSIGHT_API_LLM_API_KEY=gsk_xxxxxxxxxxxx

hindsight-api
```

**注意**：数据库必须已存在，并已启用 pgvector（`CREATE EXTENSION vector;`）。

### CLI 选项 {#cli-options}

```bash
hindsight-api --port 9000          # 自定义端口（默认 8888）
hindsight-api --host 127.0.0.1     # 仅绑定 localhost
hindsight-api --workers 4          # 多个工作进程
hindsight-api --log-level debug    # 详细日志
```

### 控制平面 {#control-plane}

控制平面（Web 界面）可通过 npx 独立运行：

```bash
npx @vectorize-io/hindsight-control-plane --api-url http://localhost:8888
```

它连接到正在运行的 API 服务器，提供管理记忆库、探索实体和测试查询的可视化界面。

#### 选项 {#options}

| 选项 | 环境变量 | 默认值 | 说明 |
|--------|---------------------|---------|-------------|
| `-p, --port` | `PORT` | 9999 | 监听端口 |
| `-H, --hostname` | `HOSTNAME` | 0.0.0.0 | 绑定的主机名 |
| `-a, --api-url` | `HINDSIGHT_CP_DATAPLANE_API_URL` | http://localhost:8888 | Hindsight API 地址 |
| | `HINDSIGHT_CP_ACCESS_KEY` | *（无）* | 用于保护控制平面界面的访问密钥。设置后，用户必须输入该密钥才能登录。 |

#### 示例 {#examples}

```bash
# 在自定义端口上运行
npx @vectorize-io/hindsight-control-plane --port 9999 --api-url http://localhost:8888

# 使用环境变量
export HINDSIGHT_CP_DATAPLANE_API_URL=http://api.example.com
npx @vectorize-io/hindsight-control-plane

# 生产部署
PORT=80 HINDSIGHT_CP_DATAPLANE_API_URL=https://api.hindsight.io npx @vectorize-io/hindsight-control-plane
```

---

## Windows

**适合**：不使用 Docker，在 Windows 上原生运行 Hindsight。

Hindsight 在 Windows 上可通过嵌入式数据库（pg0）开箱即用，只需安装并运行：

```powershell
pip install hindsight-api

set HINDSIGHT_API_LLM_PROVIDER=openai
set HINDSIGHT_API_LLM_API_KEY=sk-xxx
set HINDSIGHT_API_LLM_MODEL=gpt-4o-mini

hindsight-api
```

### 使用外部 PostgreSQL（可选） {#using-external-postgresql-optional}

如果希望使用自己的 PostgreSQL 实例，而不是嵌入式数据库：

```powershell
# 安装 PostgreSQL
winget install PostgreSQL.PostgreSQL.17

# 构建 pgvector（需要 Visual Studio Build Tools）
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# 打开“x64 Native Tools Command Prompt for VS”并运行：
set PGROOT=C:\Program Files\PostgreSQL\17
nmake /F Makefile.win
nmake /F Makefile.win install

# 创建数据库并启用向量扩展
psql -U postgres -c "CREATE DATABASE hindsight;"
psql -U postgres -d hindsight -c "CREATE EXTENSION vector;"
```

然后启动 Hindsight，并指向你的数据库：

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
配置外部嵌入和重排序提供程序后，也可以使用精简包（`pip install hindsight-api-slim`）。详情见[配置](./configuration#embeddings)。
:::

### Windows 与中国网络环境说明 {#windows--china-network-notes}

如果你在中国网络环境下使用 Windows：

1. `HINDSIGHT_API_LLM_PROVIDER` 可以使用 DeepSeek，但 DeepSeek 不提供嵌入端点。
2. 使用本地嵌入模型，适合注重隐私和受限网络可靠性的场景。
3. 启动 Hindsight 前设置 `HF_ENDPOINT=https://hf-mirror.com`，使 Hugging Face 模型下载使用中国可访问的镜像。

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

`HF_ENDPOINT` 由 Hugging Face 工具（`huggingface_hub`）使用，并非由 Hindsight 自身使用。

---

## 嵌入 Python 应用 {#embedded-in-a-python-application}

**适合**：从 Python 代码使用 Hindsight，无需独立运行服务器进程。

```bash
pip install hindsight-all        # 完整包，开箱即用（Linux、Windows、Apple Silicon Mac）
pip install hindsight-all-slim   # 精简包，嵌入、重排序和数据库均需外部服务
```

Intel（x86_64）Mac 请安装 `hindsight-all-slim`，见[支持的平台](#supported-platforms)。

`hindsight-all` 支持两种嵌入模式：

**进程内**（`HindsightServer`）：服务器在应用内的后台线程中运行，适合需要紧密集成且已自行管理进程生命周期的场景。

```python
from hindsight import HindsightServer, HindsightClient

with HindsightServer(llm_provider="openai", llm_api_key="sk-xxx") as server:
    client = HindsightClient(base_url=server.url)
    client.retain(bank_id="alice", content="Alice 偏好简洁的回答。")
    results = client.recall(bank_id="alice", query="我应该如何回复 Alice？")
```

**托管子进程**（`HindsightEmbedded`）：服务器作为后台守护进程运行，多个 Python 进程或会话共享它。守护进程在首次使用时启动，直到被停止。

```python
from hindsight import HindsightEmbedded

client = HindsightEmbedded(llm_provider="openai", llm_api_key="sk-xxx")
client.retain(bank_id="alice", content="Alice 偏好简洁的回答。")
results = client.recall(bank_id="alice", query="我应该如何回复 Alice？")
```

完整 API 参考见 [Python SDK](../sdks/python.mdx)。

---

## 后续步骤 {#next-steps}

- [配置](./configuration.mdx)：环境变量与设置。
- [模型](./models.mdx)：机器学习模型及提供程序。
- [监控](./monitoring.md)：指标与可观测性。
