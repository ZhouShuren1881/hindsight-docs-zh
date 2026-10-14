---
sidebar_position: 3
---

# Go 客户端 {#go-client}

Hindsight API 的官方 Go 客户端，使用 [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) 从 OpenAPI 3.1 规范生成。

import CodeSnippet from '@site/src/components/CodeSnippet';
import quickstartGo from '!!raw-loader!@site/examples/api/quickstart.go';

## 安装 {#installation}

```bash
go get github.com/vectorize-io/hindsight/hindsight-clients/go
```

要求使用 Go 1.23+。

## 快速入门 {#quick-start}

<CodeSnippet code={quickstartGo} section="quickstart-full" language="go" />

## API 结构 {#api-structure}

Go 客户端通过结构化的命名空间提供所有 Hindsight API 操作：

- **`client.MemoryAPI`** - Retain（存入）、Recall（召回）、Reflect（反思）操作
- **`client.BanksAPI`** - 记忆库管理
- **`client.DirectivesAPI`** - 强制指令管理
- **`client.MentalModelsAPI`** - 心智模型管理
- **`client.DocumentsAPI`** - 文档操作
- **`client.EntitiesAPI`** - 实体操作
- **`client.OperationsAPI`** - 异步操作监控

## 使用可为 null 的字段 {#working-with-nullable-fields}

Go 客户端使用 `NullableString`、`NullableTime` 等类型来表示可选字段：

<CodeSnippet code={quickstartGo} section="nullable-fields" language="go" />

## 错误处理 {#error-handling}

<CodeSnippet code={quickstartGo} section="error-handling" language="go" />

## 更多示例 {#more-examples}

有关所有操作的详细示例，请参阅：

- [Python SDK 文档](./python.mdx) - API 概念相同
- [Node.js SDK 文档](./nodejs.mdx) - API 概念相同
- [OpenAPI 规范](https://hindsight.dev/openapi.json) - 完整 API 参考
