# 管理 CLI {#admin-cli}

`hindsight-admin` CLI 提供用于管理 Hindsight 部署的管理命令，包括数据库迁移、备份和恢复操作。

## 安装 {#installation}

管理 CLI 随 `hindsight-api` 软件包一起提供；安装该软件包后，`hindsight-admin` 可执行文件会加入 `PATH`：

```bash
pip install hindsight-api
# or
uv add hindsight-api
```

## 运行 CLI {#running-the-cli}

`hindsight-admin` **直接连接 PostgreSQL**，不会调用 HTTP API。它读取与 API 服务**相同的配置**（环境变量，以及当前工作目录中的 `.env` 文件），因此会操作 `HINDSIGHT_API_DATABASE_URL` 所指向的数据库：

- **默认值**：`pg0`，嵌入式开发数据库（必须在拥有 pg0 数据的主机上运行）。
- **生产环境**：设置 `HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@host:5432/hindsight`。

由于管理 CLI 直接与数据库交互（使用二进制 `COPY`、`TRUNCATE` 等），它**仅支持 PostgreSQL**（不支持 Oracle）。请在与 API 部署相同的主机或容器上运行，以便继承正确的配置并能够访问数据库：

```bash
# Bare metal / virtualenv (with the API's env or a .env in the working dir)
hindsight-admin worker-status

# Docker — exec into the API container
docker exec -it hindsight-api hindsight-admin backup /data/backup.zip

# Kubernetes — exec into an API pod
kubectl exec deploy/hindsight-api -- hindsight-admin run-db-migration
```

使用 `--schema` 指定目标租户模式（命令默认使用已配置的基础模式）。请参阅下文的[环境变量](#environment-variables)。

## 命令 {#commands}

### run-db-migration {#run-db-migration}

将数据库迁移到最新版本。默认情况下，此命令会迁移基础模式，以及通过租户扩展发现的所有租户模式。使用 `--schema` 可指定只迁移一个模式。当你希望将迁移与 API 启动分开执行时（例如在 CI/CD 流水线中，或部署新版本前），此命令很有用。

```bash
hindsight-admin run-db-migration [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 要运行迁移的数据库模式。省略时，迁移基础模式以及所有已发现的租户模式。 | 所有模式 |
| `--embedding-dimension` | 迁移后要强制校验的预期嵌入维度。省略时跳过迁移后的维度同步。 | 跳过 |
| `--skip-extension-reconcile` | 跳过迁移后的向量/全文检索索引协调处理（仅当 `HINDSIGHT_API_VECTOR_EXTENSION`/`HINDSIGHT_API_TEXT_SEARCH_EXTENSION` 与某个模式现有索引不同时才会执行操作）。当后端没有变化时，使用此选项可显著加快跨许多租户模式的无变更重迁移；仅在后端未变更时使用。 | 执行协调处理 |

**示例：**

```bash
# Run migrations on the base schema plus all discovered tenant schemas
hindsight-admin run-db-migration

# Run migrations on a specific tenant schema
hindsight-admin run-db-migration --schema tenant_acme
```

:::tip 禁用自动迁移
如要禁用 API 启动时的自动迁移，请设置 `HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP=false`。如果要在部署流水线中单独执行迁移，这会很有用。
:::

---

### repair-bank {#repair-bank}

验证并修复某个记忆库在每个 `(bank, fact_type)` 上的向量索引覆盖情况。

通常在首次创建记忆库时就会创建这些部分索引（空记忆库上会立即完成），之后 PostgreSQL 会随着记忆库增长而增量维护索引。如果记忆库**绕过创建时的流程而被填入数据**（例如通过逻辑恢复、跨版本升级或切换向量扩展），就不会创建这些索引；该记忆库的召回会在不知不觉中退回到使用全局索引并在之后进行筛选。这种回退会**降低速度**，也可能**返回不足的结果**（近似最近邻搜索先从所有记忆库中选出候选项，然后才筛选出你所需的记忆库）。

发生上述任一情况后运行此命令，即可恢复完整的索引覆盖。它会检测**缺失或无效**的覆盖（中断构建留下的 INVALID 索引，或切换后端导致索引类型不匹配，都会视为缺失），并使用 `CREATE INDEX CONCURRENTLY` 重建索引，因此不会阻塞正在运行的存入、召回或整合操作。此命令具备幂等性，可以安全地重复运行。

```bash
hindsight-admin repair-bank (--bank BANK_ID | --all) [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--bank`, `-b` | 要修复的记忆库 ID。不能与 `--all` 同时使用。 | — |
| `--all` | 修复基础模式和所有已发现租户模式中的每个记忆库。 | — |
| `--schema`, `-s` | 限定为单个模式。 | 所有模式 |
| `--dry-run` | 报告将要修复的内容，不创建或删除任何索引。 | 关闭 |

必须且只能指定 `--bank` 或 `--all` 其中之一。对于使用单一全局向量索引的后端（AlloyDB ScaNN、Oracle），该命令不执行操作。它具备幂等性，可以安全地重复运行，也可以在 API 正常提供服务时运行。

如果某个记忆库由自定义存储负责管理其记忆，此命令也不会对该记忆库执行操作；这次会逐个记忆库判断，而不是按整个部署判断：这类记忆库在 `memory_units` 中没有行，因此不需要创建按记忆库划分的索引，也不会为其创建索引。命令也不会删除任何索引：记忆库迁移到该存储之前已有的索引会保留，因为何时移除索引应由运维人员决定，修复命令不会代为处理。因此，无论该记忆库是否仍带有索引，由存储负责管理的记忆库都会报告 `0 present, 0 created`。若要查看它实际拥有哪些索引，请查询该记忆库自己的部分索引目录：

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = '<tenant schema>'
  AND tablename = 'memory_units'
  AND indexname LIKE 'idx_mu_emb_%'
  AND strpos(indexdef, $$bank_id = '<bank id>'$$) > 0;
```

移除最后一个条件，即可列出该模式中的所有按记忆库划分的索引。

这些索引本身为空，但 Postgres 会在规划查询时考虑关系上的每个索引，因此在有许多由存储负责管理的记忆库的部署中，每个访问 `memory_units` 的其他查询都会承担这些索引带来的开销。准备好后，可使用 `DROP INDEX CONCURRENTLY` 删除它们。

**退出代码。** 所有模式均已协调完成时返回 `0`。索引构建失败时返回 `1`（命令会打印索引名称，重跑时会再次尝试），或者有模式未能完成协调时返回 `1`；例如，记忆存储无法说明自己负责管理哪些记忆库。此时命令不会猜测，因为猜测会重建上文提到的那些索引。

无论模式是在处理第一个记忆库前失败，还是处理到一半时失败，都会报告为跳过；因此该模式可能已经协调过其中一些记忆库。如果处理已进行到这一步，该模式对应的行会列出已处理的数量，且不会撤销已构建的索引。命令退出前会同时报告构建失败的索引名称和跳过的模式，两类问题不会相互掩盖。如果数据库连接在扫描过程中断开，运行会立即停止，不会对剩余的每个模式重复报告同一错误，同时仍会报告已完成的工作。

**示例：**

```bash
# See which banks are missing coverage without changing anything
hindsight-admin repair-bank --all --dry-run

# Repair every bank across all schemas (run once after a restore/upgrade)
hindsight-admin repair-bank --all

# Repair a single bank
hindsight-admin repair-bank --bank acme-prod
```

---

### rename-bank {#rename-bank}

:::tip 考虑使用别名


重命名要求先停止记忆库的客户端，因为重命名一旦提交，旧 ID 就会立即失效。如果你的目的是让调用方改用新 ID，可以使用[记忆库别名](./api/memory-banks.mdx#aliases)：无需停机，也无需重写任何数据行；在你完成迁移之前，该记忆库会同时响应两个 ID。

只有当旧 ID 确实必须停止存在时，才使用 `rename-bank`；别名不会移除旧 ID。

:::

原地更改记忆库的 ID。所有记忆、文档、实体、心智模型和知识页都会原样保留。不会重新提取或重新生成嵌入向量，也不会调用 LLM。

```bash
hindsight-admin rename-bank --from OLD_ID --to NEW_ID [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--from` | 当前记忆库 ID。 | — |
| `--to` | 新的记忆库 ID。该 ID 必须尚不存在。 | — |
| `--schema`, `-s` | 记忆库所在的模式。 | 已配置的基础模式 |
| `--dry-run` | 完整执行一次重命名流程，按表打印将移动的行，然后回滚。 | 关闭 |

**运行前须知：**

- **停止记忆库的客户端。** 任何仍使用旧 ID 的调用都会收到 404；如果客户端会按需创建记忆库，则会悄悄在旧 ID 下新建一个空记忆库。请在重启客户端前，将每个客户端以及任何限定到该记忆库的 API 密钥都改为使用新 ID。
- **等待记忆库操作完成。** 只要记忆库仍有等待处理或正在处理的操作，命令就会拒绝执行。

文件的存储键中包含记忆库 ID，因此数据行迁移后，记忆库的存储文件（文档附件和上传的原始文件）会复制到使用新 ID 的键下，文件对应的数据行也会改为指向新键，旧 ID 的前缀则会被清除。最后一步也会移除旧 ID 下遗留的任何导出或导入归档：重命名后，它们的下载链接会失效，但可以重新生成归档。之后删除记忆库时，其文件也会一并删除。

重命名在单个事务中执行，并且只锁定该记忆库的数据行。其他记忆库可以继续提供服务。执行时间会随记忆库大小增长。之后，记忆库的向量索引会使用 `CREATE INDEX CONCURRENTLY` 重建；重建完成前，对重命名后记忆库的召回会在没有这些索引的情况下运行。已运行的 API 服务器可能会继续响应旧 ID，直到记忆库信息缓存过期。仅支持 PostgreSQL。

**示例：**

```bash
# See what would move, change nothing
hindsight-admin rename-bank --from acme --to acme-prod --dry-run

hindsight-admin rename-bank --from acme --to acme-prod
```

---

### backup {#backup}

将所有 Hindsight 数据备份到 ZIP 文件。

```bash
hindsight-admin backup OUTPUT [OPTIONS]
```

**参数：**

| 参数 | 说明 |
|----------|-------------|
| `OUTPUT` | 输出文件路径（若路径不含 `.zip` 扩展名，则会自动添加） |

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 要备份的数据库模式 | `public` |

**示例：**

```bash
# Backup to a file
hindsight-admin backup /backups/hindsight-2024-01-15.zip

# Backup a specific tenant schema
hindsight-admin backup /backups/tenant-acme.zip --schema tenant_acme
```

备份包含：
- 记忆库及其配置
- 文档和文本分块
- 实体及其关系
- 记忆单元（事实、经历、观测）
- 实体共现信息和记忆连接
- 心智模型和强制指令
- Webhook 和文件存储
- 内部运维表（异步操作、审计日志、图维护队列及类似的记录数据），以便恢复时得到忠实的完整数据库快照

:::note 一致性
备份在数据库事务中创建，并使用 `REPEATABLE READ` 隔离级别，确保所有表中的数据来自一致的快照。
:::

---

### restore {#restore}

从备份文件恢复数据。**警告：这会删除目标模式中的所有现有数据。**

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
| `--schema`, `-s` | 要恢复到的数据库模式 | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# Restore with confirmation prompt
hindsight-admin restore /backups/hindsight-2024-01-15.zip

# Restore without confirmation (for scripts)
hindsight-admin restore /backups/hindsight-2024-01-15.zip --yes

# Restore to a specific tenant schema
hindsight-admin restore /backups/tenant-acme.zip --schema tenant_acme --yes
```

:::warning 数据丢失
导入备份前，restore 会**删除目标模式中的所有现有数据**。执行恢复前，请务必确认已有近期备份。
:::

---

### decommission-worker {#decommission-worker}

释放某个工作进程拥有的所有任务，将它们的状态从“processing”重置为“pending”，以便其他工作进程领取这些任务。

```bash
hindsight-admin decommission-worker WORKER_ID [OPTIONS]
```

**参数：**

| 参数 | 说明 |
|----------|-------------|
| `WORKER_ID` | 要退役的工作进程 ID |

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库模式 | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# Before scaling down - release tasks from workers being removed
hindsight-admin decommission-worker hindsight-worker-4
hindsight-admin decommission-worker hindsight-worker-3

# Release tasks from a crashed worker
hindsight-admin decommission-worker worker-2

# For a specific tenant schema
hindsight-admin decommission-worker worker-1 --schema tenant_acme
```

**适用场景：**

- **缩减规模**：从 Kubernetes 中移除工作进程副本前
- **平稳退役**：将工作进程下线维护时
- **崩溃恢复**：工作进程处理任务时崩溃
- **工作进程卡住**：工作进程没有响应

:::tip 查找工作进程 ID
工作进程 ID 默认取自主机名。在 Kubernetes StatefulSet 中，它就是 Pod 名称（例如 `hindsight-worker-0`）。也可以通过 `HINDSIGHT_API_WORKER_ID` 或 `--worker-id` 设置自定义 ID。
:::

### decommission-workers {#decommission-workers}

释放所有工作进程当前正在处理的任务，将这些任务的状态从“processing”重置为“pending”。当一个或多个工作进程崩溃，或在未平稳关闭的情况下被移除，而你又不知道应指定哪些工作进程 ID 时，可使用此命令。

```bash
hindsight-admin decommission-workers [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库模式 | `public` |
| `--yes`, `-y` | 跳过确认提示 | `false` |

**示例：**

```bash
# Release all processing tasks across all workers (with confirmation)
hindsight-admin decommission-workers

# Skip the confirmation prompt (useful in scripts)
hindsight-admin decommission-workers --yes

# Release tasks in a specific tenant schema
hindsight-admin decommission-workers --schema tenant_acme
```

**适用场景：**

- **不知道哪些工作进程已失效**：多个工作进程崩溃，而你不知道它们的 ID
- **全体工作进程恢复**：基础设施事件导致许多工作进程停机后
- **“全部处理一下”**：逐个工作进程清理过于繁琐时，快速清空整个队列

:::warning 有影响的操作
此命令会释放**每一个**正在处理的任务，不论其属于哪个工作进程，包括仍正常运行的工作进程所拥有的任务。如果你知道哪些工作进程需要清理，优先使用 `decommission-worker <WORKER_ID>`。
:::

---

### worker-status {#worker-status}

按工作进程分组，显示所有当前正在处理的任务，包括操作类型、记忆库、每项任务已运行多长时间以及上次更新时间。可用于在退役工作进程前找出孤立任务。

```bash
hindsight-admin worker-status [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--schema`, `-s` | 数据库模式 | `public` |

**示例：**

```bash
# Show all processing tasks across all workers
hindsight-admin worker-status

# Show processing tasks for a specific tenant schema
hindsight-admin worker-status --schema tenant_acme
```

**适用场景：**

- **退役工作进程前**：检查哪些工作进程有陈旧任务，以及这些任务卡住了多久
- **排查吞吐量问题**：诊断队列为何没有清空（是否有任务卡在 processing 状态？）
- **检查工作进程健康状态**：找出 `last_update_ago` 持续增大的工作进程，这可能表示它已停止运行或没有响应

---

### export-bank {#export-bank}

将整个记忆库导出为可移植的 ZIP 归档，内容包括文档、事实、观测、记忆库配置、心智模型、强制指令和 Webhook。**绝不**导出嵌入向量；导入时会重新生成。这是跨实例迁移的导出端，例如迁移到其他嵌入模型、向量扩展或全文检索后端。仅支持 PostgreSQL。

```bash
hindsight-admin export-bank --bank <BANK_ID> --output <FILE.zip> [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--bank`, `-b` | 要导出的记忆库 ID。 |（必需）|
| `--output`, `-o` | 要写入 `.zip` 归档的路径。 |（必需）|
| `--schema`, `-s` | 记忆库所在的模式。 | 基础模式 |
| `--include-history` | 同时导出运维历史记录（`audit_log`、`llm_requests`）。 | `false` |

**示例：**

```bash
hindsight-admin export-bank --bank my-bank --output my-bank.zip

# include operational history
hindsight-admin export-bank --bank my-bank --output my-bank.zip --include-history
```

此操作只读，可以对正在运行的实例安全执行。

---

### import-bank {#import-bank}

将整个记忆库归档（由 `export-bank` 生成）恢复到**此**实例。事实会使用此实例配置的嵌入模型重新生成嵌入向量，并重建连接和索引；记忆库配置、心智模型、强制指令和 Webhook 会原样恢复。不会运行 LLM 事实提取；由于这是迁移过程中的状态恢复，因此**不会触发 Webhook，也不会重新运行整合**。仅支持 PostgreSQL。

```bash
hindsight-admin import-bank --archive <FILE.zip> [OPTIONS]
```

**选项：**

| 选项 | 说明 | 默认值 |
|--------|-------------|---------|
| `--archive`, `-a` | 由 `export-bank` 生成的 `.zip` 文件路径。 |（必需）|
| `--schema`, `-s` | 目标模式。 | 基础模式 |
| `--target-bank` | 覆盖记忆库 ID（默认使用归档中的来源记忆库 ID）。 | 来源记忆库 |
| `--include-history` | 如果归档中包含历史记录，也一并恢复。 | `false` |

**示例：**

```bash
hindsight-admin import-bank --archive my-bank.zip
```

请在配置了**目标嵌入模型/向量扩展/全文检索后端**的实例上运行此命令，因为重新生成嵌入向量时会使用这些配置。

:::warning 目标记忆库必须尚不存在
导入会恢复**整个记忆库**（配置、事实、心智模型等），而**不会合并**数据。如果目标 ID 的记忆库已存在，命令会失败。请先删除该记忆库，或使用 `--target-bank` 恢复到一个新 ID 下。
:::

---

## 将记忆库迁移到新实例 {#migrating-a-bank-to-a-new-instance}

已填充数据的记忆库无法原地更改其**嵌入模型**（例如从 384 维编码器换成 1024 维编码器）、**向量扩展**（pgvector/vchord/pgvectorscale）或**全文检索后端**；存储的向量和索引都依赖这些设置。由于每个嵌入向量和索引都是根据磁盘上已有文本确定性生成的，受支持的做法是：将记忆库迁移到已按新设置配置的全新实例，并在那里重新派生所有数据，**无需让 LLM 重新提取事实**。

`export-bank`/`import-bank` 会迁移文档、事实、观测、记忆库配置、心智模型、强制指令和 Webhook，但不会迁移嵌入向量；目标实例会使用自己的模型重新生成这些向量。

**蓝绿部署操作流程：**

1. 在全新的数据库上启动**新实例**，并配置新的嵌入模型/向量扩展/全文检索后端。
2. 暂停对源记忆库的写入（维护窗口），并运行 `hindsight-admin backup` 作为安全备份。
3. 从源实例导出，再导入目标实例：
   ```bash
   # 在源实例上：
   hindsight-admin export-bank --bank my-bank --output my-bank.zip
   # 在已配置新设置的目标实例上：
   hindsight-admin import-bank --archive my-bank.zip
   ```
4. 在目标实例上验证：运行有代表性的召回查询并比较结果。
5. 将流量切换到新实例。确认一切正常前，保留旧实例作为可立即回滚的版本。

:::note 为什么要用新实例，而不是原地更改
嵌入模型是服务器级配置，并且某个模式中的 `memory_units.embedding` 列只有一个所有记忆库共用的维度。因此，维度或后端不同的记忆库需要拥有自己的实例/数据库。旧向量不会被修改，所以回滚十分简单。
:::

---

## 恢复卡住或僵死的操作 {#recovering-stuck-or-zombie-operations}

“僵死”操作是指某项操作一直停留在 `processing` 状态，因为领取它的工作进程已经消失。最常见的原因是 `HINDSIGHT_API_WORKER_ID` 不稳定：默认情况下，该 ID 使用容器主机名；Docker 重启会产生新的容器 ID，而新工作进程无法识别旧工作进程领取的任务，导致这些任务被搁置。

**如何发现：**

```bash
# List processing tasks grouped by worker — workers with a growing last_update_ago are dead
hindsight-admin worker-status

# Bank-level counters; pending_consolidation that never decreases is the usual symptom
curl -s http://localhost:8888/v1/default/banks/<bank_id>/stats
```

**如何恢复：**

```bash
# You know which worker is dead (e.g. from worker-status):
hindsight-admin decommission-worker <old-worker-id>

# You don't know — release every processing task across the fleet:
hindsight-admin decommission-workers
```

这两个命令都会将处于 `processing` 状态的行重置为 `pending`，这样仍在运行的工作进程就能在下一次轮询时领取它们。

**如何预防：**

将 `HINDSIGHT_API_WORKER_ID` 设置为稳定值，使工作进程在重启后仍保持相同身份：

- **Docker**：传入 `-e HINDSIGHT_API_WORKER_ID=hindsight-prod`（若运行多个容器，可为每个副本使用不同名称）
- **Kubernetes（Helm）**：Chart 的 StatefulSet 会自动使用 Pod 名称，无需额外配置
- **裸机/pip**：传入 `--worker-id <name>`，或为每个进程设置环境变量

请参阅[安装 - Docker](./installation#docker)和[配置 - 分布式工作进程](./configuration#distributed-workers)。

---

## 环境变量 {#environment-variables}

管理 CLI 使用与 API 服务相同的环境变量。其中最重要的是：

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `HINDSIGHT_API_DATABASE_URL` | PostgreSQL 连接字符串 | `pg0`（嵌入式） |

**示例：**

```bash
# Use a specific database
export HINDSIGHT_API_DATABASE_URL=postgresql://user:pass@localhost:5432/hindsight
hindsight-admin backup /backups/mybackup.zip
```
