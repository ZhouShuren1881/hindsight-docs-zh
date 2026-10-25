# Oracle 数据库 {#oracle-database}

Hindsight 默认使用 PostgreSQL 作为存储后端，但对于采用 Oracle 基础设施的组织，也支持运行在 **Oracle Database 23ai** 上。所有记忆操作——Retain（存入）、Recall（召回）和 Reflect（反思）——在 Oracle 上的工作方式相同；只需设置一个环境变量即可选择后端。

本指南涵盖在 Oracle 上运行 Hindsight 所需的全部内容：前置条件、驱动程序、本地快速入门、生产数据库配置、运行迁移，以及与 PostgreSQL 的少数行为差异。

:::info 何时使用 Oracle
如果组织已经在运行 Oracle，并且需要让 Hindsight 部署在现有 Oracle 基础设施中，Oracle 就是合适的选择。其他情况下，默认的 PostgreSQL 后端更易于运维；原因请参阅[存储](./storage)。Oracle 和 PostgreSQL 的配置彼此独立，每个部署选择其中一种即可。
:::

## 环境要求 {#requirements}

| 要求 | 详细信息 |
|-------------|---------|
| Oracle Database | **23ai**（23.4+）。开发环境可使用 [Oracle Database Free 23ai](https://www.oracle.com/database/free/)。 |
| `VECTOR` 类型 | 用于存储嵌入向量。要求架构位于 **ASSM 表空间**中（见下文）。 |
| Oracle Text | 全文搜索使用 Oracle Text 索引。架构用户需要拥有 `CTXAPP` 角色。 |
| 驱动程序 | [`python-oracledb`](https://python-oracledb.readthedocs.io/) ≥ 2.5.0，运行于 **thin mode**——纯 Python，无需 Oracle Instant Client。 |

:::warning 架构必须使用 ASSM 表空间
Oracle 的 `SYSTEM` 表空间使用*手动*段空间管理（MSSM），**不支持 `VECTOR` 列**。请将 Hindsight 用户创建在使用**自动段空间管理（ASSM）** 的表空间中，否则迁移在创建嵌入向量列时会失败。下方的配置 SQL 会为你完成此操作。
:::

## 安装驱动程序 {#install-the-driver}

Oracle 驱动程序是可选扩展，不包含在默认软件包中。请与 Hindsight 一起安装：

```bash
# With the packaged extra
pip install "hindsight-api-slim[oracle]"

# Or add the driver to an existing install (e.g. the full hindsight-api package)
pip install hindsight-api oracledb
```

如果启动时缺少驱动程序，Hindsight 会报错：
`python-oracledb is required for Oracle backend. Install it with: pip install oracledb`。

## 快速入门（本地 Oracle） {#quick-start-local-oracle}

在 Oracle 上试用 Hindsight 的最快方式是使用随附的辅助脚本。该脚本会启动本地 **Oracle Database Free 23ai** 容器，使用正确的表空间和授权配置测试用户，并输出可直接使用的连接 URL：

```bash
# Start Oracle Free in Docker and bootstrap the hindsight_test user
./scripts/dev/start-oracle.sh

# ...prints:
#   export HINDSIGHT_API_DATABASE_BACKEND=oracle
#   export HINDSIGHT_API_DATABASE_URL='oracle+oracledb://hindsight_test:hindsight_test@localhost:1521/FREEPDB1'

# Stop and remove the container when done
./scripts/dev/stop-oracle.sh
```

数据库初始化期间，首次冷启动需要 60–120s。如果第一次运行报告配置错误，说明数据库仍在启动；等容器健康后重新运行一次 `./scripts/dev/start-oracle.sh` 即可（该脚本可重复安全运行）。

脚本输出连接 URL 后，请导出它显示的变量，**并且还要设置架构**，将其指向脚本创建的 Oracle 用户：

```bash
export HINDSIGHT_API_DATABASE_SCHEMA=HINDSIGHT_TEST
```

然后运行迁移并启动 API（步骤见下文）。在 Oracle 上必须设置架构；请参阅[步骤 3](#3-configure-hindsight)。Hindsight 的 CI 使用相同配置来测试 Oracle 后端。

## 生产环境配置 {#production-setup}

### 1. 配置架构用户 {#1-provision-the-schema-user}

以有权限的用户（例如 `SYSTEM`）连接到可插拔数据库，并为 Hindsight 创建专用表空间和用户。表空间**必须**使用 ASSM，才能支持 `VECTOR` 列：

```sql
-- ASSM tablespace (required for VECTOR columns). Size to your data volume.
CREATE BIGFILE TABLESPACE hindsight_ts
    DATAFILE 'hindsight_ts.dbf' SIZE 2G AUTOEXTEND ON NEXT 500M MAXSIZE UNLIMITED
    EXTENT MANAGEMENT LOCAL
    SEGMENT SPACE MANAGEMENT AUTO;

-- Dedicated schema user
CREATE USER hindsight IDENTIFIED BY "<strong-password>"
    DEFAULT TABLESPACE hindsight_ts
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON hindsight_ts;

-- Object privileges Hindsight's migrations need
GRANT CONNECT, RESOURCE, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW, CREATE PROCEDURE TO hindsight;

-- Oracle Text (full-text search indexes)
GRANT CTXAPP TO hindsight;
```

:::note 最小权限
`CONNECT` 和 `RESOURCE` 提供基础权限；架构迁移所需的是显式授予的 `CREATE TABLE / SEQUENCE / VIEW / PROCEDURE` 权限以及 `CTXAPP`。无需 `DBA` 角色。如果托管服务不支持直接执行 `CREATE TABLESPACE`，请使用平台的管理工具配置架构；要求不变：默认表空间须为 **ASSM**（`VECTOR` 列所需），且用户须拥有 `CTXAPP` 角色。
:::

### 2. 构建连接 URL {#2-build-the-connection-url}

Hindsight 使用 SQLAlchemy 风格的 URL。Oracle 的格式如下：

```
oracle+oracledb://USER:PASSWORD@HOST:PORT/SERVICE_NAME
```

| 部分 | 示例 | 说明 |
|------|---------|-------|
| `USER` / `PASSWORD` | `hindsight` / `s3cret` | 第 1 步创建的架构用户。密码中的保留字符（`@`、`/`、`:`）需要进行 URL 编码。 |
| `HOST:PORT` | `db.internal:1521` | 监听器的主机和端口（Oracle 默认端口为 `1521`）。 |
| `SERVICE_NAME` | `FREEPDB1` | 可插拔数据库的**服务名**（不是 SID）。Oracle Free 使用 `FREEPDB1`。 |

示例：

```
oracle+oracledb://hindsight:s3cret@db.internal:1521/ORCLPDB1
```

#### 完整连接描述符和 TNS 别名 {#full-connect-descriptors-and-tns-aliases}

上面的格式是 Easy Connect，只能表示 `host:port/service`。如果需要更多配置——例如通过 TCPS 连接 Autonomous Database、设置 `retry_count` 或 `ssl_server_dn_match`，或者使用 `tnsnames.ora` 中的 TNS 别名——请将主机留空，并把描述符作为 `dsn` 查询参数传入：

```
oracle+oracledb://USER:PASSWORD@/?dsn=DESCRIPTOR_OR_TNS_ALIAS
```

描述符必须像密码一样进行百分号编码。例如，Autonomous Database 描述符

```
(description=(retry_count=20)(address=(protocol=tcps)(port=1522)(host=adb.example.com))(connect_data=(service_name=abc_low))(security=(ssl_server_dn_match=yes)))
```

会变为

```bash
export HINDSIGHT_API_DATABASE_URL="oracle+oracledb://hindsight:s3cret@/?dsn=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.stdin.read().strip()))' <<< '(description=(retry_count=20)(address=(protocol=tcps)(port=1522)(host=adb.example.com))(connect_data=(service_name=abc_low))(security=(ssl_server_dn_match=yes)))')"
```

:::warning 目前仍不支持基于 Wallet 的 mTLS
Hindsight 不会向驱动程序传递 wallet 目录或 wallet 密码，因此需要 wallet 的连接（mTLS）无法使用。支持带有 `ssl_server_dn_match` 的 TCPS。其他情况下，请在网络层保护连接（例如使用私有网络、VPN 或 TLS 终止代理）。
:::

### 3. 配置 Hindsight {#3-configure-hindsight}

通过两个环境变量将 Hindsight 指向 Oracle：

```bash
export HINDSIGHT_API_DATABASE_BACKEND=oracle
export HINDSIGHT_API_DATABASE_URL='oracle+oracledb://hindsight:s3cret@db.internal:1521/ORCLPDB1'
export HINDSIGHT_API_DATABASE_SCHEMA=HINDSIGHT   # the Oracle user from step 1
```

`HINDSIGHT_API_DATABASE_BACKEND` 的默认值是 `postgresql`；将其设为 `oracle` 以选择 Oracle 后端。

:::warning 将 `DATABASE_SCHEMA` 设为 Oracle 用户名
`HINDSIGHT_API_DATABASE_SCHEMA` 的默认值是 `public`，这是 PostgreSQL 中的概念。在 Oracle 中，架构**就是一个用户**，不存在 `public` 架构；保留默认值会导致迁移失败，并报错 `ORA-01435: user does not exist`。请将其设为第 1 步创建的架构用户，并严格按照 Oracle 中保存的名称填写——**大写**（例如 `HINDSIGHT`），除非你创建用户时使用了带引号的小写名称。
:::

数据库变量的完整列表请参阅[配置 → 数据库](./configuration#database)。

### 4. 运行迁移 {#4-run-migrations}

Hindsight 在 Oracle 和 PostgreSQL 上运行相同的架构迁移。默认情况下，API 会在启动时自动应用迁移（`HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP=true`）。如需显式运行迁移——例如在受控的部署步骤中——请执行：

```bash
hindsight-admin run-db-migration
```

此命令会调用支持方言的迁移运行器，并创建 Oracle 架构。（与管理 CLI 的数据迁移命令不同，`run-db-migration` 在 Oracle 上受到完整支持；请参阅[限制](#limitations-vs-postgresql)。）

:::warning 使用运行时嵌入维度执行迁移
嵌入向量 `VECTOR` 列的大小取决于已配置嵌入模型的维度。运行迁移时，必须使用**与服务运行时相同的嵌入供应商/模型**，否则列维度将与 API 生成的向量不匹配，导致存入操作报错 `ORA-51803: Vector dimension count must match…`（例如，按本地 384 维模型创建的架构无法接受来自 OpenAI `text-embedding-3-small` 的 1536 维向量）。如果之后更换嵌入模型，请使用 `--embedding-dimension <N>` 重新运行迁移以调整列大小。
:::

### 5. 启动 API {#5-start-the-api}

```bash
hindsight-api
```

启动时，Hindsight 会记录解析后的数据库信息（凭据会被遮蔽）；日志应显示你的 Oracle 主机，并确认 Oracle 后端已启用。

## 配置参考 {#configuration-reference}

与 Oracle 相关的设置如下，完整说明请参阅[配置](./configuration)页面：

| 变量 | 用途 |
|----------|---------|
| `HINDSIGHT_API_DATABASE_BACKEND` | `postgresql`（默认值）或 `oracle`。 |
| `HINDSIGHT_API_DATABASE_URL` | `oracle+oracledb://…` 连接 URL。 |
| `HINDSIGHT_API_DATABASE_SCHEMA` | 表的架构/用户。在 Oracle 上应设为架构用户（大写）；`public` 默认值会导致失败。 |
| `HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP` | API 启动时自动应用迁移（默认值 `true`）。 |

## 与 PostgreSQL 相比的限制 {#limitations-vs-postgresql}

在 Oracle 上，记忆操作的行为相同，但部分运维和内部细节有所不同：

- **管理 CLI 的数据命令仅支持 PostgreSQL。** `hindsight-admin` 的备份、恢复、记忆库导出/导入和工作进程状态命令使用 asyncpg 的二进制 `COPY` 与 `TRUNCATE`，这些操作专用于 PostgreSQL，在 Oracle 上不可用。架构迁移（`run-db-migration`）则**支持**在 Oracle 上运行。
- **没有嵌入式数据库。** 零配置本地开发所用的 `pg0` 嵌入式 PostgreSQL 没有 Oracle 对应方案；Oracle 始终要求有正在运行的数据库实例（本地使用时可运行[快速入门脚本](#quick-start-local-oracle)）。
- **会跳过整合协调处理。** 整合过程中的基于相似度的近似重复项协调处理（`HINDSIGHT_API_CONSOLIDATION_DEDUP_THRESHOLD`）仅适用于 PostgreSQL；Oracle 上仍会运行整合，但不会执行这一步额外的协调处理。
- **实体消解使用 Oracle 模糊匹配。** 存入时进行的模糊实体查询使用 Oracle 的文本匹配，而不是 PostgreSQL 的 `pg_trgm` 三元组匹配。行为等效，但底层机制不同。

## 故障排查 {#troubleshooting}

| 症状 | 原因 / 解决方法 |
|---------|-------------|
| `python-oracledb is required for Oracle backend` | 未安装驱动程序。运行 `pip install oracledb`（或安装 `[oracle]` 扩展）。 |
| 迁移时报错 `ORA-01435: user does not exist` | 未设置 `HINDSIGHT_API_DATABASE_SCHEMA`（默认值为 `public`），或名称拼写错误。将其设为 Oracle 架构用户，并使用大写（例如 `HINDSIGHT`）。 |
| 存入时报错 `ORA-51803: Vector dimension count must match` | 架构迁移时使用的嵌入维度与当前运行的嵌入模型不一致。使用相同的嵌入配置迁移，或重新运行 `run-db-migration --embedding-dimension <N>`。 |
| 创建嵌入/`VECTOR` 列时迁移出错 | 架构用户的默认表空间不是 ASSM（通常是 `SYSTEM` 表空间）。按上文所述，在 ASSM 表空间中重新创建用户。 |
| 全文搜索出错 / 缺少 Oracle Text 索引 | 架构用户缺少 `CTXAPP` 角色。运行 `GRANT CTXAPP TO <user>;`。 |
| `ORA-12514` / 找不到服务 | URL 使用了 SID 或错误的服务名。请使用可插拔数据库的**服务名**（例如 `FREEPDB1`），而不是 SID。 |
| 手动登录成功，但从 Hindsight 连接失败 | 密码中的保留字符未进行 URL 编码。请在 `DATABASE_URL` 中对 `@ / : ?` 编码。 |

## 另请参阅 {#see-also}

- [存储](./storage) — 了解为何默认使用 PostgreSQL，以及 Oracle 的适用场景
- [配置](./configuration#database) — 所有数据库环境变量
- [安装](./installation) — 打包和部署选项
- [管理 CLI](./admin-cli) — 管理命令（数据操作仅支持 PostgreSQL）
