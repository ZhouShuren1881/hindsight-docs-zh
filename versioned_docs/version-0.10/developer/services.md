import Figure from '@site/src/components/Figure';
import services from '@site/figures/services.json';

# 服务 {#services}

Hindsight 由三个服务组成，可根据部署需求一起运行或分别运行。

<Figure doc={services} />

## API 服务 {#api-service}

核心记忆引擎，负责所有记忆操作：

- **记忆存储**：导入内容、提取事实并构建知识图谱
- **记忆召回**：对记忆执行语义搜索
- **反思**：生成考虑性格倾向的回答

```bash
hindsight-api        # 默认端口：8888
```

API 服务无状态，可以部署在负载均衡器后进行水平扩展。所有状态均存储在 PostgreSQL 中。

默认情况下，API 也会在内部处理后台任务（心智模型整合）。在高吞吐量部署中，可以禁用内部处理，改用专用工作进程。

## 工作进程服务 {#worker-service}

后台操作的专用任务处理器。使用与 API 服务**相同的软件包和 Docker 镜像**，只是入口不同。

```bash
hindsight-worker     # 默认指标端口：8889
```

工作进程使用 PostgreSQL 作为任务代理，轮询待处理任务。多个工作进程可以同时运行而不产生冲突。

| 部署场景 | 内部工作进程 | 专用工作进程 |
|------------|-----------------|-------------------|
| **开发环境** | ✅ 简单，一体运行 | ❌ 配置过重 |
| **小型生产环境** | ✅ 基础设施更少 | ❌ 配置过重 |
| **高吞吐量** | ❌ API 成为瓶颈 | ✅ 可独立扩展 |
| **长时间运行的任务** | ❌ 占用 API 资源 | ✅ 隔离处理 |

要使用专用工作进程，请禁用 API 内部的工作进程并启动独立进程：

```bash
# 禁用 API 中的内部工作进程
HINDSIGHT_API_WORKER_ENABLED=false hindsight-api

# 启动专用工作进程（运行多个实例）
hindsight-worker --worker-id worker-1
hindsight-worker --worker-id worker-2
```

每个工作进程都提供 `/health/live`（存活检查，不访问数据库）、`/health` 和 `/health/ready`（就绪检查，检查数据库），以及用于监控的 `/metrics`。
参见[监控 — 健康检查端点](./monitoring#health-endpoints)。

缩容或移除工作进程之前，请使用 `hindsight-admin decommission-worker <worker-id>` 释放其任务。

所有工作进程设置请参见[配置 — 分布式工作进程](./configuration#distributed-workers)，Kubernetes 部署请参见[安装 — Helm](./installation#distributed-workers)。

## 控制平面 {#control-plane}

用于管理和探索记忆库的 Web 界面：

- 浏览智能体和记忆库
- 探索实体及其关系
- 查看导入历史和操作
- 交互式测试记忆召回查询

控制平面连接 API 服务，为开发和调试提供可视化界面。

裸机部署时，可以使用 npx 独立运行控制平面。详情参见[安装 — 裸机](./installation#control-plane)。
