import Figure from '@site/src/components/Figure';
import services from '@site/figures/services.json';

# 服务 {#services}

Hindsight 由三个服务组成，可根据部署需求共同运行，也可以分别运行。

<Figure doc={services} />

## API 服务 {#api-service}

核心记忆引擎，负责处理所有记忆操作：

- **Retain（存入）**：摄取内容、提取事实并构建知识图谱
- **Recall（召回）**：跨记忆进行语义检索
- **Reflect（反思）**：根据性格倾向生成答案

```bash
hindsight-api        # 默认端口：8888
```

API 服务是无状态的，可以在负载均衡器后横向扩展。所有状态都存储在 PostgreSQL 中。

默认情况下，API 还会在进程内处理后台任务（心智模型整合）。对于高吞吐量部署，可以关闭这项内置处理，改为运行独立工作进程。

## 工作进程服务 {#worker-service}

用于处理后台操作的专用任务处理器。它与 API 服务使用**相同的软件包和 Docker 镜像**，只是入口点不同。

```bash
hindsight-worker     # 默认指标端口：8889
```

工作进程使用 PostgreSQL 作为任务代理，通过轮询查找待处理的任务。多个工作进程可以同时运行而不会互相冲突。

| 部署场景 | 内置工作进程 | 独立工作进程 |
|------------|-----------------|-------------------|
| **开发环境** | ✅ 简单，一体化 | ❌ 用不上 |
| **小型生产环境** | ✅ 所需基础设施更少 | ❌ 用不上 |
| **高吞吐量** | ❌ API 会成为瓶颈 | ✅ 可独立扩展 |
| **长时间运行的任务** | ❌ 占用 API 资源 | ✅ 隔离处理 |

要使用独立工作进程，请先在 API 中关闭内置工作进程，再启动工作进程：

```bash
# 在 API 中禁用内置工作进程
HINDSIGHT_API_WORKER_ENABLED=false hindsight-api

# 启动独立工作进程（运行多个实例）
hindsight-worker --worker-id worker-1
hindsight-worker --worker-id worker-2
```

每个工作进程都会提供 `/health/live`（存活状态，不访问数据库）、`/health` 和 `/health/ready`（就绪状态，会检查数据库），以及用于监控的 `/metrics`。
请参阅[监控 - 健康检查端点](./monitoring#health-endpoints)。

缩减工作进程数量或移除工作进程之前，请运行 `hindsight-admin decommission-worker <worker-id>` 释放其任务。

所有工作进程设置请参阅[配置 - 分布式工作进程](./configuration#distributed-workers)；Kubernetes 部署请参阅[安装 - Helm](./installation#distributed-workers)。

## 控制台 {#control-plane}

用于管理和浏览记忆库的 Web 界面：

- 浏览智能体和记忆库
- 探索实体及其关系
- 查看摄取历史记录和操作
- 交互式测试召回查询

控制台连接到 API 服务，为开发和调试提供可视化界面。

在裸机部署中，可以使用 npx 单独运行控制台。详情请参阅[安装 - 裸机](./installation#control-plane)。
