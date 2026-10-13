# 管理 CLI {#admin-cli}

`hindsight-admin` CLI 提供管理 Hindsight 部署的命令，包括数据库迁移、备份和恢复操作。

## 安装 {#installation}

管理 CLI 包含在 `hindsight-api` 软件包中，安装后 `hindsight-admin` 可执行程序会加入 `PATH`：

```bash
pip install hindsight-api
# 或
uv add hindsight-api
```

## 运行 CLI {#running-the-cli}

`hindsight-admin` **直接连接 PostgreSQL**，不调用 HTTP API。它读取**与 API 服务相同的配置**（环境变量及当前工作目录中的 `.env` 文件），操作 `HINDSIGHT_API_DATABASE_URL` 指向的数据库：

- **默认**：嵌入式开发数据库 `pg0`（必须在拥有 pg0 数据的主机运行）。
- **生产环境**：设置 `HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@host:5432/hindsight`。

管理 CLI 直接操作数据库（二进制 `COPY`、`TRUNCATE` 等），因此**仅支持 PostgreSQL**（不支持 Oracle）。请在 API 部署所在的同一主机/容器中运行，以继承正确配置并访问数据库：

```bash
# 裸机 / 虚拟环境（使用 API 环境变量或工作目录中的 .env）
hindsight-admin worker-status

# Docker：进入 API 容器执行
docker exec -it hindsight-api hindsight-admin backup /data/backup.zip

# Kubernetes：进入 API pod 执行
kubectl exec deploy/hindsight-api -- hindsight-admin run-db-migration
```

使用 `--schema` 指定租户 schema（命令默认使用配置的基础 schema）。参见下方[环境变量](#environment-variables)。

## 命令 {#commands}

### run-db-migration

运行数据库迁移到最新版本。默认迁移基础 schema 以及租户扩展发现的所有租户 schema。使用 `--schema` 可只迁移指定 schema。适合在 API 启动之外单独运行迁移，例如 CI/CD 流水线或部署新版本之前。

```bash
hindsight-admin run-db-migration [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 运行迁移的数据库 schema。省略时迁移基础 schema 和所有发现的租户 schema。 | 所有 schema |
| `--embedding-dimension` | 迁移后强制采用的预期嵌入维度。省略时跳过迁移后维度同步。 | 跳过 |
| `--skip-extension-reconcile` | 跳过迁移后的向量/文本搜索索引协调（仅当 `HINDSIGHT_API_VECTOR_EXTENSION` / `HINDSIGHT_API_TEXT_SEARCH_EXTENSION` 与 schema 现有索引不同时才会执行）。可显著加快多个租户 schema 的无变更重复迁移，仅在后端未变化时使用。 | 执行协调 |

**示例：**

```bash
# 迁移基础 schema 和所有发现的租户 schema
hindsight-admin run-db-migration

# 迁移指定租户 schema
hindsight-admin run-db-migration --schema tenant_acme
```

:::tip 禁用自动迁移
设置 `HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP=false` 可禁用 API 启动时的自动迁移。适合在部署流水线中将迁移作为独立步骤运行。
:::

---

### repair-bank

验证并修复记忆库按 `(bank, fact_type)` 划分的向量索引覆盖。

这些部分索引通常在记忆库首次创建时建立（空库即时完成），之后 PostgreSQL 随库增长增量维护。通过逻辑恢复、跨版本升级或切换向量扩展等**创建流程之外的路径填充**的记忆库没有这些索引，因此库范围召回会静默回退到全局索引 + 后过滤。这既**更慢**，也可能**返回不足**（近似最近邻搜索先从所有库获取候选，再过滤为当前库）。

上述事件发生后运行此命令可恢复完整覆盖。它检测**缺失或无效**的覆盖（中断构建留下的 INVALID 索引，或后端切换后类型不符的索引，都视为缺失），通过 `CREATE INDEX CONCURRENTLY` 重建，不阻塞正在进行的记忆存储、召回或整合。操作幂等，可安全重复运行。

```bash
hindsight-admin repair-bank (--bank BANK_ID | --all) [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--bank`, `-b` | 待修复记忆库 ID。与 `--all` 互斥。 | — |
| `--all` | 修复基础 schema 和所有发现的租户 schema 中的每个库。 | — |
| `--schema`, `-s` | 仅处理一个 schema。 | 所有 schema |
| `--dry-run` | 报告将修复的内容，不创建或删除任何索引。 | 关闭 |

必须且只能指定 `--bank` 或 `--all` 之一。使用单一全局向量索引的后端（AlloyDB ScaNN、Oracle）不会执行操作。操作幂等，可安全重复运行，也可在 API 服务流量时运行。

记忆由自定义存储拥有的库也不执行操作，但此处按库而非部署决定。此类库在 `memory_units` 没有行，不需要按库索引，因此不建立任何索引。也不删除索引：迁移到自定义存储前已有的索引会保留，因为移除索引及其时机由运维人员决定，修复不会代为执行。因此无论是否仍有索引，自定义存储管理的库都报告 `0 present, 0 created`。要查看实际保留的索引，请查询该库的部分索引目录：

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = '<tenant schema>'
  AND tablename = 'memory_units'
  AND indexname LIKE 'idx_mu_emb_%'
  AND strpos(indexdef, $$bank_id = '<bank id>'$$) > 0;
```

去掉最后一个条件，可以列出该 schema 中所有按库索引。

这些索引是空的，而 Postgres 会为关系上的每个索引规划，因此存在许多自定义存储管理库的部署中，所有访问 `memory_units` 的其他查询都承担这项成本。准备好后，使用 `DROP INDEX CONCURRENTLY` 删除。

**退出码。** 每个 schema 都协调完成时为 `0`。索引构建失败（输出名称，重新运行会重试），或 schema 未完全协调时为 `1`，例如记忆存储无法说明自己拥有哪些库。命令不会猜测，因为猜测会重建上述不需要的索引。

schema 无论在第一个库之前还是中途失败，都会列为跳过，因此可能已有部分库协调完成。此时逐 schema 输出会说明数量，已完成的构建不会撤销。退出前同时报告失败索引名称和跳过的 schema，互不遮蔽。如果扫描中数据库连接丢失，会立即停止，而非对每个剩余 schema 重复相同错误，并仍报告已执行内容。

**示例：**

```bash
# 查看哪些记忆库缺少覆盖，不做更改
hindsight-admin repair-bank --all --dry-run

# 修复所有 schema 的每个库（恢复/升级后运行一次）
hindsight-admin repair-bank --all

# 修复单个记忆库
hindsight-admin repair-bank --bank acme-prod
```

---

### rename-bank

:::tip 可以考虑使用别名

重命名需要停止库的客户端，因为提交后旧 ID 立即失效。如果只是希望调用方使用新 ID，**[记忆库别名](./api/memory-banks.mdx#aliases)** 无需停机或重写行即可实现：迁移完成前，库同时响应两个 ID。

只有必须让旧 ID 不再存在时才使用 `rename-bank`，别名不会移除旧 ID。

:::

原地更改记忆库 ID。所有记忆、文档、实体、心智模型和知识页面保持原样，不重新提取或生成嵌入，不调用 LLM。

```bash
hindsight-admin rename-bank --from OLD_ID --to NEW_ID [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--from` | 当前记忆库 ID。 | — |
| `--to` | 新的记忆库 ID，必须尚不存在。 | — |
| `--schema`, `-s` | 记忆库所在的 schema。 | 配置的基础 schema |
| `--dry-run` | 执行完整重命名，逐表输出将移动的行，再回滚。 | 关闭 |

**运行前：**

- **停止库的客户端。** 仍调用旧 ID 的请求会收到 404，或在按需创建库时静默建立旧 ID 下的新空库。重启前将每个客户端及限定到该库的 API 密钥指向新 ID。
- **等待库操作完成。** 库存在待处理或处理中操作时，命令会拒绝执行。

文件存储键包含记忆库 ID，因此行移动后，库中的文档附件和上传原件会复制到新 ID 下的键，更新行引用并清空旧 ID 前缀。最后一步也移除旧 ID 下残留的导出/导入归档，重命名后其下载链接失效，可以重新运行操作生成。之后删除库也会删除其文件。

重命名在单一事务中执行，仅锁定该库的行。其他库继续服务，耗时随库大小增长。之后通过 `CREATE INDEX CONCURRENTLY` 重建向量索引；完成前，重命名库的召回不使用这些索引。运行中的 API 服务器可能在库信息缓存过期前继续响应旧 ID。仅支持 PostgreSQL。

**示例：**

```bash
# 查看将移动的内容，不做更改
hindsight-admin rename-bank --from acme --to acme-prod --dry-run

hindsight-admin rename-bank --from acme --to acme-prod
```

---

### backup

将所有 Hindsight 数据备份到 zip 文件。

```bash
hindsight-admin backup OUTPUT [OPTIONS]
```

**参数：**

| 参数 | 说明 |
|----------|-------------|
| `OUTPUT` | 输出文件路径（没有 `.zip` 扩展名时会自动添加） |

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 要备份的数据库 schema | `public` |

**示例：**

```bash
# 备份到文件
hindsight-admin backup /backups/hindsight-2024-01-15.zip

# 备份指定租户 schema
hindsight-admin backup /backups/tenant-acme.zip --schema tenant_acme
```

备份包括：
- 记忆库及其配置
- 文档和文本块
- 实体及其关系
- 记忆单元（事实、经历、观察）
- 实体共现和记忆链接
- 心智模型和指令
- Webhook 和文件存储
- 内部运维表（异步操作、审计日志、图维护队列及类似记录），确保恢复后忠实重现完整数据库快照

:::note 一致性
备份在 `REPEATABLE READ` 隔离级别的数据库事务中创建，确保所有表的快照一致。
:::

---

### restore

从备份文件恢复数据。**警告：这会删除目标 schema 中所有现有数据。**

```bash
hindsight-admin restore INPUT [OPTIONS]
```

**参数：**

| 参数 | 说明 |
|----------|-------------|
| `INPUT` | 输入备份文件（.zip） |

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 恢复目标数据库 schema | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# 恢复并显示确认提示
hindsight-admin restore /backups/hindsight-2024-01-15.zip

# 无需确认直接恢复（用于脚本）
hindsight-admin restore /backups/hindsight-2024-01-15.zip --yes

# 恢复到指定租户 schema
hindsight-admin restore /backups/tenant-acme.zip --schema tenant_acme --yes
```

:::warning 数据丢失
恢复会在导入备份前**删除目标 schema 中的所有现有数据**。执行恢复前务必确认拥有近期备份。
:::

---

### decommission-worker

释放某个工作进程拥有的所有任务，将其从“processing”重置为“pending”，以便其他工作进程接手。

```bash
hindsight-admin decommission-worker WORKER_ID [OPTIONS]
```

**参数：**

| 参数 | 说明 |
|----------|-------------|
| `WORKER_ID` | 要停用的工作进程 ID |

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库 schema | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# 缩容前：释放将移除工作进程的任务
hindsight-admin decommission-worker hindsight-worker-4
hindsight-admin decommission-worker hindsight-worker-3

# 释放崩溃工作进程的任务
hindsight-admin decommission-worker worker-2

# 指定租户 schema
hindsight-admin decommission-worker worker-1 --schema tenant_acme
```

**适用场景：**

- **缩容**：移除 Kubernetes 工作进程副本之前
- **平稳移除**：下线工作进程进行维护时
- **崩溃恢复**：工作进程处理任务时崩溃
- **工作进程卡住**：工作进程无响应时

:::tip 查找工作进程 ID
工作进程 ID 默认为主机名。Kubernetes StatefulSet 中是 pod 名称（例如 `hindsight-worker-0`）。也可通过 `HINDSIGHT_API_WORKER_ID` 或 `--worker-id` 设置自定义 ID。
:::


### decommission-workers

释放所有工作进程当前正在处理的全部任务，将“processing”重置为“pending”。一个或多个工作进程崩溃或未平稳关闭就被移除，且不知道目标工作进程 ID 时使用。

```bash
hindsight-admin decommission-workers [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库 schema | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# 释放所有工作进程的全部处理中任务（需要确认）
hindsight-admin decommission-workers

# 跳过确认提示（适合脚本）
hindsight-admin decommission-workers --yes

# 释放指定租户 schema 中的任务
hindsight-admin decommission-workers --schema tenant_acme
```

**适用场景：**

- **未知失效工作进程**：多个工作进程崩溃，不知道其 ID
- **整个工作进程集群恢复**：基础设施事件导致大量工作进程下线后
- **“全部修复”**：逐进程清理过于繁琐时，快速释放整个队列

:::warning 会中断处理
这会释放**所有**处理中任务，无论所属工作进程，包括健康工作进程的任务。知道需要清理哪些工作进程时，优先使用 `decommission-worker <WORKER_ID>`。
:::

---

### worker-status

按工作进程分组显示所有处理中任务，包括操作类型、记忆库、各任务运行时长及上次更新时间。适合停用工作进程之前识别孤立任务。

```bash
hindsight-admin worker-status [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库 schema | `public` |

**示例：**

```bash
# 显示所有工作进程的处理中任务
hindsight-admin worker-status

# 显示指定租户 schema 的处理中任务
hindsight-admin worker-status --schema tenant_acme
```

**适用场景：**

- **停用前**：查看哪些工作进程拥有过时任务，以及卡住多久
- **吞吐量调试**：诊断队列为何没有消减（任务是否卡在处理中？）
- **工作进程健康检查**：发现 `last_update_ago` 持续增长的工作进程，说明其失效或无响应

---

### export-bank

将整个记忆库导出为可移植 ZIP 归档，包含文档、事实、观察、库配置、心智模型、指令和 webhook。**不包含**嵌入向量，它们在导入时重新生成。这是跨实例迁移的源端步骤，例如切换嵌入模型、向量扩展或文本搜索后端。仅支持 PostgreSQL。

```bash
hindsight-admin export-bank --bank <BANK_ID> --output <FILE.zip> [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--bank`, `-b` | 要导出的记忆库 ID。 | （必需） |
| `--output`, `-o` | 写入 `.zip` 归档的路径。 | （必需） |
| `--schema`, `-s` | 记忆库所在的 schema。 | 基础 schema |
| `--include-history` | 同时导出操作历史（`audit_log`、`llm_requests`）。 | `false` |

**示例：**

```bash
hindsight-admin export-bank --bank my-bank --output my-bank.zip

# 包含操作历史
hindsight-admin export-bank --bank my-bank --output my-bank.zip --include-history
```

只读操作，可以安全地对运行中的实例执行。

---

### import-bank

将整库归档（由 `export-bank` 生成）恢复到**当前**实例。使用当前实例配置的嵌入模型为事实重新生成向量，并重建链接/索引；库配置、心智模型、指令和 webhook 原样恢复。不运行 LLM 事实提取，且迁移是恢复状态，因此**不会**触发 webhook 或重新整合。仅支持 PostgreSQL。

```bash
hindsight-admin import-bank --archive <FILE.zip> [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--archive`, `-a` | `export-bank` 生成的 `.zip` 路径。 | （必需） |
| `--schema`, `-s` | 目标 schema。 | 基础 schema |
| `--target-bank` | 覆盖记忆库 ID（默认使用归档中的源库）。 | 源记忆库 |
| `--include-history` | 归档包含历史时同时恢复。 | `false` |

**示例：**

```bash
hindsight-admin import-bank --archive my-bank.zip
```

请对配置了**目标**嵌入模型/向量扩展/文本搜索后端的实例运行，重新生成嵌入会使用这些配置。

:::warning 目标记忆库必须不存在
导入恢复的是**整个记忆库**（配置、事实、心智模型等），**不是合并**。目标 ID 已存在时命令失败。先删除该库，或使用 `--target-bank` 恢复到新 ID。
:::

---

## 将记忆库迁移到新实例 {#migrating-a-bank-to-a-new-instance}

已有内容的记忆库无法原地更换**嵌入模型**（例如 384 维编码器 → 1024 维）、**向量扩展**（pgvector / vchord / pgvectorscale）或**文本搜索后端**，因为存储的向量和索引与这些设置绑定。每个嵌入和索引都可以由磁盘已有文本确定性生成，因此受支持的方式是**将库迁移到采用新设置的新实例，并在那里重新推导所有内容，无需 LLM 重新提取**。

`export-bank` / `import-bank` 携带文档、事实、观察、库配置、心智模型、指令和 webhook，但不携带嵌入，目标实例使用自己的模型重新生成。

**蓝绿迁移操作流程：**

1. 在新数据库上启动**新实例**，配置新的嵌入模型/向量扩展/文本搜索后端。
2. Quiesce writes to the 源记忆库 (maintenance window) and run `hindsight-admin backup` for safety.
3. 从源端导出，再导入目标端：
   ```bash
   # 在源实例：
   hindsight-admin export-bank --bank my-bank --output my-bank.zip
   # 在目标实例（已采用新配置）：
   hindsight-admin import-bank --archive my-bank.zip
   ```
4. 验证目标端：运行有代表性的召回查询并比较结果。
5. 将流量切换到新实例。在确认可靠之前保留旧实例，供立即回滚。

:::note 为何使用新实例而非原地修改
嵌入模型是服务器级配置，库的 `memory_units.embedding` 列维度由整个 schema 共享，因此不同维度或后端的库需要自己的实例/数据库。旧向量始终不变，便于回滚。
:::

---

## 恢复卡住或僵尸操作 {#recovering-stuck-or-zombie-operations}

“僵尸”操作指领取任务的工作进程已消失，任务却无限期停留在 `processing`。最常见原因是 `HINDSIGHT_API_WORKER_ID` 不稳定：默认使用容器主机名时，Docker 重启生成新容器 ID，新工作进程不认为旧进程领取的任务属于自己，任务因而搁置。

**如何发现：**

```bash
# 按工作进程列出处理中任务：last_update_ago 不断增长的工作进程已失效
hindsight-admin worker-status

# 记忆库级计数：pending_consolidation 从不减少是常见症状
curl -s http://localhost:8888/v1/default/banks/<bank_id>/stats
```

**如何恢复：**

```bash
# 知道哪个工作进程失效（例如从 worker-status 得知）：
hindsight-admin decommission-worker <old-worker-id>

# 不知道具体进程：释放整个集群的全部处理中任务：
hindsight-admin decommission-workers
```

两个命令都将 `processing` 行重置为 `pending`，让存活工作进程在下次轮询时领取。

**如何预防：**

将 `HINDSIGHT_API_WORKER_ID` 设为稳定值，确保重启后身份不变：

- **Docker**：传入 `-e HINDSIGHT_API_WORKER_ID=hindsight-prod`（多个容器时使用各副本独立名称）
- **Kubernetes（Helm）**：chart 的 StatefulSet 自动使用 pod 名称，无需额外配置
- **裸机 / pip**：传入 `--worker-id <name>` 或逐进程设置环境变量

参见[安装 — Docker](./installation#docker)和[配置 — 分布式工作进程](./configuration#distributed-workers)。

---

## 环境变量 {#environment-variables}

管理 CLI 使用与 API 服务相同的环境变量。最重要的是：

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `HINDSIGHT_API_DATABASE_URL` | PostgreSQL 连接字符串 | `pg0`（嵌入式） |

**示例：**

```bash
# 使用指定数据库
export HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@localhost:5432/hindsight
hindsight-admin backup /backups/mybackup.zip
```
