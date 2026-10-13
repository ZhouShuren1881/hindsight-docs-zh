# 存储 {#storage}

Hindsight 使用 PostgreSQL 作为主要存储后端，也提供 Oracle AI Database 作为企业部署的替代方案。

## 为什么选择 PostgreSQL？ {#why-postgresql}

PostgreSQL 在一个数据库中提供了语义记忆系统需要的所有能力：

| 能力 | 实现 |
|------------|----------------|
| 向量搜索 | pgvector 扩展，配合 HNSW 索引 |
| 全文搜索 | 内置 tsvector，配合 GIN 索引 |
| 关系数据 | PostgreSQL 原生支持 |
| JSON 文档 | 支持索引的 JSONB |
| 图查询 | 递归 CTE |

### 减少系统依赖 {#reduced-system-dependencies}

专门基于 PostgreSQL 构建可简化部署和运维：

- 只需配置一个连接字符串
- 统一的备份与恢复策略
- 单一监控目标
- 所有数据类型均支持 ACID 事务
- 统一的升级路径

### 不提供存储抽象 {#no-storage-abstraction}

Hindsight 不会把存储封装在通用接口后面。这是经过权衡的选择。

我们认为 PostgreSQL 正在成为标准数据库 API。它的普及程度、扩展生态和模块化设计，使兼容 PostgreSQL 的接口不断出现在各类产品中，从无服务器服务到分布式数据库。今天基于 PostgreSQL 构建，意味着未来能兼容不断壮大的生态。

支持多个数据库可以增加灵活性，却与我们的核心目标冲突：Hindsight 完全开源，并希望尽可能易于运行和使用。增加数据库抽象会让代码、测试、文档和运维更加复杂，而这些复杂性最终会传递给用户。

基于 PostgreSQL，我们可以保持系统简单：
- 一套部署说明
- 一套需要理解的性能特性
- 针对单一后端优化的代码库
- 无需决定使用哪种数据库

### Oracle AI Database 支持 {#oracle-ai-database-support}

面向企业部署，Hindsight 也支持 Oracle AI Database，且功能完全对等。所有记忆操作——记忆存储、记忆召回和反思——在 Oracle 上的行为都相同，因此已统一使用 Oracle 基础设施的组织可以直接选择它。

设置方法请参见 [Oracle 数据库指南](./oracle)，涵盖前提条件、资源配置、连接 URL、迁移，以及与 PostgreSQL 的区别。

## 使用 pg0 开发 {#development-with-pg0}

在本地开发时，Hindsight 使用 **[pg0](https://github.com/vectorize-io/pg0)**，即嵌入式 PostgreSQL 发行版。

### 什么是 pg0？ {#what-is-pg0}

pg0 是一个包含以下内容的独立二进制程序：
- PostgreSQL 服务器
- pgvector 扩展（预装）
- 自动初始化功能

### 行为 {#behavior}

未配置 `HINDSIGHT_API_DATABASE_URL` 时，Hindsight 会：
1. 在端口 5555 启动嵌入式 PostgreSQL 实例
2. 初始化 schema
3. 将数据存储在 `~/.hindsight/pg0/`

### 环境 {#environments}

| 环境 | 数据库 | 配置 |
|-------------|----------|---------------|
| 开发环境 | pg0（嵌入式） | 自动配置 |
| 生产环境 | PostgreSQL 15+ | `HINDSIGHT_API_DATABASE_URL` 环境变量 |

## 要求 {#requirements}

- PostgreSQL 15 或更高版本
- pgvector 0.5.0 或更高版本

满足这些要求的任何 PostgreSQL 实例都应该可以使用。如果特定配置遇到问题，请[提交 GitHub issue](https://github.com/hindsight-ai/hindsight/issues)。

### 已测试的托管服务 {#tested-managed-services}

- AWS RDS（PostgreSQL 15+）
- Google Cloud SQL
- Azure Database for PostgreSQL
- Supabase
- Neon
