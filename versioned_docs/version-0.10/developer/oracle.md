# Oracle 数据库 {#oracle-database}

Hindsight 默认使用 PostgreSQL 作为存储后端，也能在 **Oracle Database 23ai** 上运行，适用于统一采用 Oracle 基础设施的组织。所有记忆操作——记忆存储、记忆召回和反思——在 Oracle 上的行为完全相同；只需一个环境变量即可选择后端。

本指南介绍在 Oracle 上运行 Hindsight 所需的全部内容：前提条件、驱动、本地快速入门、生产数据库配置、迁移运行方法，以及与 PostgreSQL 的少量行为差异。

:::info 何时使用 Oracle
如果组织已经运行 Oracle，并且需要将 Hindsight 纳入现有基础设施，Oracle 就是合适的选择。其他情况下，默认 PostgreSQL 后端的运维更简单，原因参见[存储](./storage)。Oracle 与 PostgreSQL 独立配置，每个部署选择其中一种。
:::

## 要求 {#requirements}

| 要求 | 详情 |
|-------------|---------|
| Oracle Database | **23ai** (23.4+). [Oracle Database Free 23ai](https://www.oracle.com/database/free/) 可用于开发。 |
| `VECTOR` type | 用于嵌入向量。要求 schema 位于 **ASSM 表空间**中（见下文）。 |
| Oracle Text | 全文搜索使用 Oracle Text 索引。schema 用户需要 `CTXAPP` 角色。 |
| 驱动 | [`python-oracledb`](https://python-oracledb.readthedocs.io/) ≥ 2.5.0, 以 **thin 模式**运行，即纯 Python 模式，无需 Oracle Instant Client。 |

:::warning schema 必须使用 ASSM 表空间
Oracle 的 `SYSTEM` 表空间使用*手动*段空间管理（MSSM），**不支持 `VECTOR` 列**。请在采用**自动段空间管理（ASSM）**的表空间中创建 Hindsight 用户，否则迁移在创建嵌入向量列时会失败。下方的资源配置 SQL 会完成此操作。
:::

## 安装驱动 {#install-the-driver}

Oracle 驱动是可选附加依赖，不包含在默认软件包中。请与 Hindsight 一起安装：

```bash
# 使用软件包的可选附加依赖
pip install "hindsight-api-slim[oracle]"

# 或向现有安装添加驱动（例如完整的 hindsight-api 软件包）
pip install hindsight-api oracledb
```

如果启动时缺少驱动，Hindsight 会失败并报错：
`python-oracledb is required for Oracle backend. Install it with: pip install oracledb`.

## 快速入门（本地 Oracle） {#quick-start-local-oracle}

体验 Oracle 上的 Hindsight，最快的方法是使用随附的辅助脚本。它会启动本地 **Oracle Database Free 23ai** 容器，为测试用户配置正确的表空间和授权，并输出可直接使用的连接 URL：

```bash
# 在 Docker 中启动 Oracle Free，并初始化 hindsight_test 用户
./scripts/dev/start-oracle.sh

# ...输出：
#   export HINDSIGHT_API_DATABASE_BACKEND=oracle
#   export HINDSIGHT_API_DATABASE_URL='oracle+oracledb://hindsight_test:hindsight_test@localhost:1521/FREEPDB1'

# 完成后停止并删除容器
./scripts/dev/stop-oracle.sh
```

冷启动时数据库初始化需要 60–120 秒。如果首次运行报告资源配置错误，说明数据库仍在启动。等待容器健康后重新运行 `./scripts/dev/start-oracle.sh` 即可（脚本是幂等的）。

脚本输出连接 URL 后，导出它显示的变量，并将 **schema 也设置为**脚本创建的 Oracle 用户：

```bash
export HINDSIGHT_API_DATABASE_SCHEMA=HINDSIGHT_TEST
```

然后运行迁移并启动 API（见下方步骤）。Oracle 必须设置 schema，参见[步骤 3](#3-configure-hindsight)。Hindsight 的 CI 也使用相同配置测试 Oracle 后端。

## 生产环境设置 {#production-setup}

### 1. 配置 schema 用户 {#1-provision-the-schema-user}

以特权用户（例如 `SYSTEM`）连接可插拔数据库，为 Hindsight 创建专用表空间和用户。表空间**必须**使用 ASSM 才能支持 `VECTOR` 列：

```sql
-- ASSM 表空间（VECTOR 列所必需）。根据数据量调整大小。
CREATE BIGFILE TABLESPACE hindsight_ts
    DATAFILE 'hindsight_ts.dbf' SIZE 2G AUTOEXTEND ON NEXT 500M MAXSIZE UNLIMITED
    EXTENT MANAGEMENT LOCAL
    SEGMENT SPACE MANAGEMENT AUTO;

-- 专用 schema 用户
CREATE USER hindsight IDENTIFIED BY "<strong-password>"
    DEFAULT TABLESPACE hindsight_ts
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON hindsight_ts;

-- Hindsight 迁移所需的对象权限
GRANT CONNECT, RESOURCE, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW, CREATE PROCEDURE TO hindsight;

-- Oracle Text（全文搜索索引）
GRANT CTXAPP TO hindsight;
```

:::note 最小权限
`CONNECT` 和 `RESOURCE` 提供基础权限；schema 迁移还需要显式授予 `CREATE TABLE / SEQUENCE / VIEW / PROCEDURE` 和 `CTXAPP`。无需 `DBA` 角色。如果托管服务不允许直接使用 `CREATE TABLESPACE`，请通过平台管理工具配置 schema。要求仍然相同：默认表空间采用 **ASSM**（`VECTOR` 列所必需），并授予 `CTXAPP` 角色。
:::

### 2. 构造连接 URL {#2-build-the-connection-url}

Hindsight 使用 SQLAlchemy 风格的 URL。Oracle 的格式为：

```
oracle+oracledb://USER:PASSWORD@HOST:PORT/SERVICE_NAME
```

| 部分 | 示例 | 说明 |
|------|---------|-------|
| `USER` / `PASSWORD` | `hindsight` / `s3cret` | 步骤 1 中的 schema 用户。密码中的保留字符（`@`、`/`、`:`）需要进行 URL 编码。 |
| `HOST:PORT` | `db.internal:1521` | 监听器主机和端口（Oracle 默认端口为 `1521`）。 |
| `SERVICE_NAME` | `FREEPDB1` | 可插拔数据库的**服务名称**（不是 SID）。Oracle Free 使用 `FREEPDB1`。 |

示例：

```
oracle+oracledb://hindsight:s3cret@db.internal:1521/ORCLPDB1
```

#### 完整连接描述符和 TNS 别名 {#full-connect-descriptors-and-tns-aliases}

上面的格式是 Easy Connect，只能表达 `host:port/service`。需要更丰富的设置时，例如通过 TCPS 连接 Autonomous Database、设置 `retry_count` 和 `ssl_server_dn_match`，或使用 `tnsnames.ora` 中的 TNS 别名，请将主机留空，并通过 `dsn` 查询参数传入描述符：

```
oracle+oracledb://USER:PASSWORD@/?dsn=DESCRIPTOR_OR_TNS_ALIAS
```

描述符和密码一样，必须进行百分号编码。例如，以下 Autonomous Database 描述符

```
(description=(retry_count=20)(address=(protocol=tcps)(port=1522)(host=adb.example.com))(connect_data=(service_name=abc_low))(security=(ssl_server_dn_match=yes)))
```

转换为

```bash
export HINDSIGHT_API_DATABASE_URL="oracle+oracledb://hindsight:s3cret@/?dsn=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.stdin.read().strip()))' <<< '(description=(retry_count=20)(address=(protocol=tcps)(port=1522)(host=adb.example.com))(connect_data=(service_name=abc_low))(security=(ssl_server_dn_match=yes)))')"
```

:::warning 仍不支持基于 wallet 的 mTLS
Hindsight 不会向驱动传递 wallet 目录或密码，因此无法使用需要 wallet 的连接（mTLS）。带 `ssl_server_dn_match` 的 TCPS 可以使用。其他情况下，请在网络层保护连接（私有网络、VPN 或终止 TLS 的代理）。
:::

### 3. 配置 Hindsight {#3-configure-hindsight}

使用两个环境变量将 Hindsight 指向 Oracle：

```bash
export HINDSIGHT_API_DATABASE_BACKEND=oracle
export HINDSIGHT_API_DATABASE_URL='oracle+oracledb://hindsight:s3cret@db.internal:1521/ORCLPDB1'
export HINDSIGHT_API_DATABASE_SCHEMA=HINDSIGHT   # 步骤 1 中的 Oracle 用户
```

`HINDSIGHT_API_DATABASE_BACKEND` 默认为 `postgresql`；设置为 `oracle` 即可选择 Oracle 后端。

:::warning 将 `DATABASE_SCHEMA` 设置为 Oracle 用户
`HINDSIGHT_API_DATABASE_SCHEMA` 默认为 `public`，这是 PostgreSQL 的概念。Oracle 中 schema **就是用户**，没有 `public` schema。保留默认值会使迁移失败，报错 `ORA-01435: user does not exist`。请设置为步骤 1 创建的 schema 用户，并与 Oracle 存储的名称完全一致：通常为**大写**（例如 `HINDSIGHT`），除非创建用户时使用了带引号的小写名称。
:::

数据库变量的完整列表请参见[配置 → 数据库](./configuration#database)。

### 4. 运行迁移 {#4-run-migrations}

Hindsight 在 Oracle 上运行与 PostgreSQL 相同的 schema 迁移。默认情况下，API 在启动时自动应用迁移（`HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP=true`）。需要显式运行时，例如在受控部署步骤中，使用：

```bash
hindsight-admin run-db-migration
```

此命令通过支持数据库方言的迁移运行器创建 Oracle schema。（与管理 CLI 的数据移动命令不同，Oracle 完整支持 `run-db-migration`，参见[限制](#limitations-vs-postgresql)。）

:::warning 使用运行时的嵌入向量维度进行迁移
嵌入向量 `VECTOR` 列的大小按已配置嵌入模型的维度确定。运行迁移时必须使用**与实际服务相同的嵌入提供方和模型**，否则列维度与 API 生成的向量不匹配，记忆存储会失败并报错 `ORA-51803: Vector dimension count must match…`（例如，为 384 维本地模型创建的 schema 会拒绝 OpenAI `text-embedding-3-small` 的 1536 维向量）。之后如果更换嵌入模型，请使用 `--embedding-dimension <N>` 重新运行迁移，调整列大小。
:::

### 5. 启动 API {#5-start-the-api}

```bash
hindsight-api
```

启动时，Hindsight 会记录解析后的数据库信息（凭据已脱敏）；日志应显示 Oracle 主机，并确认 Oracle 后端已启用。

## 配置参考 {#configuration-reference}

以下为 Oracle 相关设置，完整说明均见[配置](./configuration)页面：

| 变量 | 用途 |
|----------|---------|
| `HINDSIGHT_API_DATABASE_BACKEND` | `postgresql`（默认）或 `oracle`。 |
| `HINDSIGHT_API_DATABASE_URL` | `oracle+oracledb://…` 连接 URL。 |
| `HINDSIGHT_API_DATABASE_SCHEMA` | 表所属的 schema/用户。Oracle 上设置为 schema 用户（大写）；默认值 `public` 会导致失败。 |
| `HINDSIGHT_API_RUN_MIGRATIONS_ON_STARTUP` | API 启动时自动应用迁移（默认 `true`）。 |

## 与 PostgreSQL 相比的限制 {#limitations-vs-postgresql}

Oracle 上的记忆操作行为相同，但部分运维和内部实现细节有所不同：

- **管理 CLI 的数据命令仅支持 PostgreSQL。** `hindsight-admin` 的备份、恢复、记忆库导入/导出和 worker-status 使用 asyncpg 二进制 `COPY` 和 `TRUNCATE`，这些是 PostgreSQL 专有功能，无法在 Oracle 上使用。Oracle *支持* schema 迁移（`run-db-migration`）。
- **没有嵌入式数据库。** 用于零配置本地开发的 `pg0` 嵌入式 PostgreSQL 没有对应的 Oracle 版本。Oracle 始终需要运行中的实例（本地可使用[快速入门脚本](#quick-start-local-oracle)）。
- **跳过整合中的协调去重。** 整合时基于相似度协调近似重复项的流程（`HINDSIGHT_API_CONSOLIDATION_DEDUP_THRESHOLD`）仅支持 PostgreSQL。Oracle 仍会运行整合，只是不执行额外的协调步骤。
- **实体消歧使用 Oracle 模糊匹配。** 记忆存储中的模糊实体查找使用 Oracle 文本匹配，而不是 PostgreSQL 的 `pg_trgm` 三元组匹配。行为等价，底层机制不同。

## 故障排查 {#troubleshooting}

| 现象 | 原因 / 解决方法 |
|---------|-------------|
| `python-oracledb is required for Oracle backend` | 未安装驱动。运行 `pip install oracledb`（或安装 `[oracle]` 附加依赖）。 |
| 迁移时出现 `ORA-01435: user does not exist` | 未设置 `HINDSIGHT_API_DATABASE_SCHEMA`（默认 `public`）或拼写错误。设置为大写 Oracle schema 用户，例如 `HINDSIGHT`。 |
| 记忆存储时出现 `ORA-51803: Vector dimension count must match` | 迁移 schema 时使用的嵌入维度与运行中的模型不同。使用相同嵌入配置迁移，或重新运行 `run-db-migration --embedding-dimension <N>`。 |
| 迁移创建嵌入/`VECTOR` 列时报错 | schema 用户的默认表空间不使用 ASSM（通常是 `SYSTEM` 表空间）。按照上文在 ASSM 表空间重新创建用户。 |
| 全文搜索报错 / 缺少 Oracle Text 索引 | schema 用户缺少 `CTXAPP` 角色。运行 `GRANT CTXAPP TO <user>;`。 |
| `ORA-12514` / 找不到服务 | URL 使用了 SID 或错误的服务名称。使用可插拔数据库的**服务名称**（例如 `FREEPDB1`），不要使用 SID。 |
| 手动登录正常，但 Hindsight 登录失败 | 密码中的保留字符未进行 URL 编码。请对 `DATABASE_URL` 中的 `@ / : ?` 编码。 |

## 另请参见 {#see-also}

- [存储](./storage) — PostgreSQL 为何是默认后端，以及 Oracle 的定位
- [配置](./configuration#database) — 所有数据库环境变量
- [安装](./installation) — 软件包和部署选项
- [管理 CLI](./admin-cli) — 管理命令（数据操作仅支持 PostgreSQL）
