# 存储 {#storage}

Hindsight 使用 PostgreSQL 作为主要存储后端，也提供 Oracle AI Database 作为企业部署的替代方案。

## 为什么选择 PostgreSQL？ {#why-postgresql}

PostgreSQL 在单个数据库中提供语义记忆系统所需的全部能力：

| 能力 | 实现方式 |
|------------|----------------|
| 向量检索 | pgvector 扩展与 HNSW 索引 |
| 全文检索 | 内置 tsvector 与 GIN 索引 |
| 关系数据 | PostgreSQL 原生支持 |
| JSON 文档 | JSONB，支持索引 |
| 图查询 | 递归 CTE |

### 减少系统依赖 {#reduced-system-dependencies}

专门基于 PostgreSQL 构建，可简化部署和运维：

- 只需配置一个连接字符串
- 只需采用一套备份与恢复策略
- 只需监控一个目标
- 所有数据类型都能使用 ACID 事务
- 只需遵循一条升级路径

### 不提供存储抽象 {#no-storage-abstraction}

Hindsight 不会在通用接口后抽象存储。这是经过权衡后作出的选择。

我们认为 PostgreSQL 正在成为标准的数据库 API。它的普及程度、扩展生态和模块化特性，使兼容 PostgreSQL 的接口遍布各处，从无服务器服务到分布式数据库。今天基于 PostgreSQL 构建，意味着明天能够兼容不断壮大的生态。

支持多个数据库固然能提高灵活性，却会与我们的核心目标冲突：Hindsight 完全开源，设计目标是让运行和使用尽可能简单。增加数据库抽象会使代码、测试、文档和运维变得复杂，而这些复杂性最终会转嫁给用户。

基于 PostgreSQL 构建，让我们得以保持系统简单：
- 只需一套部署说明
- 只需了解一套性能特性
- 只需一个针对单一后端优化的代码库
- 无需配置选择使用哪种数据库

### Oracle AI Database 支持 {#oracle-ai-database-support}

对于企业部署，Hindsight 也支持 Oracle AI Database，且功能完全对等。所有记忆操作——Retain（存入）、Recall（召回）和 Reflect（反思）——在 Oracle 上的工作方式都相同，因此，对于统一采用 Oracle 基础设施的组织而言，它是一个可直接采用的选项。

设置方法请参阅 [Oracle Database 指南](./oracle)，其中介绍了前提条件、资源配置、连接 URL、迁移，以及与 PostgreSQL 的差异。

## 使用 pg0 开发 {#development-with-pg0}

在本地开发时，Hindsight 使用 **[pg0](https://github.com/vectorize-io/pg0)**，这是一种嵌入式 PostgreSQL 发行版。

### 什么是 pg0？ {#what-is-pg0}

pg0 是一个包含以下内容的单一二进制程序：
- PostgreSQL 服务器
- pgvector 扩展（预装）
- 自动初始化

### 行为 {#behavior}

未配置 `HINDSIGHT_API_DATABASE_URL` 时，Hindsight 会：
1. 在端口 5555 上启动嵌入式 PostgreSQL 实例
2. 初始化数据库架构
3. 将数据存储在 `~/.hindsight/pg0/`

### 环境 {#environments}

| 环境 | 数据库 | 配置 |
|-------------|----------|---------------|
| 开发环境 | pg0（嵌入式） | 自动配置 |
| 生产环境 | PostgreSQL 15+ | `HINDSIGHT_API_DATABASE_URL` 环境变量 |

## 要求 {#requirements}

- PostgreSQL 15 或更高版本
- pgvector 0.5.0 或更高版本

任何满足这些要求的 PostgreSQL 实例都应该可以使用。如果特定配置遇到问题，请[在 GitHub 上提交 issue](https://github.com/hindsight-ai/hindsight/issues)。

### 已测试的托管服务 {#tested-managed-services}

- AWS RDS（PostgreSQL 15+）
- Google Cloud SQL
- Azure Database for PostgreSQL
- Supabase
- Neon
