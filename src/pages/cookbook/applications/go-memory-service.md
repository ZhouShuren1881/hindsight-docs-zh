---
sidebar_position: 8
---

# Go记忆增强API {#go-memory-augmented-api}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/go-memory-service)
:::


Go HTTP 微服务通过 Hindsight 演示每个用户的记忆隔离。记住每个用户的技术堆栈、解决的问题和偏好，以提供个性化的帮助。

## 特点 {#features}

- 🔐**按用户隔离**：每个用户都有自己的记忆库
- 🧠**感知上下文的回复**：使用记忆召回 + 回忆来获得个性化答案
- 🏃**发出即返回的记忆操作**：后台 goroutine 存储交互而不阻塞响应
- 🏷️**基于标签的分区**：按类型组织记忆（项目、调试、首选项）

## 设置 {#setup}

### 1。开始Hindsight {#1-start-hindsight}

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=o3-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

### 2。运行服务 {#2-run-the-service}

```bash
go run main.go
```

### 3。尝试一下 {#3-try-it-out}

```bash
#储存记忆
curl -s localhost:8080/learn -d '{
  "user_id": "alice",
  "content": "我正在使用 gRPC 和 PostgreSQL 构建 Go 微服务",
  "tags": ["project"]
}'

curl -s localhost:8080/learn -d '{
  "user_id": "alice",
  "content": "我更喜欢使用 slog 进行结构化日志记录而不是 Zerolog",
  "tags": ["preferences"]
}'

#问问题（使用记忆召回+反思）
curl -s localhost:8080/ask -d '{
  "user_id": "alice",
  "query": "我使用什么技术堆栈？"
}' | jq .

#原始记忆召回
curl -s "localhost:8080/recall/alice?q=database" | jq .
```

## API 端点 {#api-endpoints}

- `POST /learn` - 为用户存储新信息
- `POST /ask` - 使用用户的记忆提出问题
- `GET /recall/{userID}?q=query` - 直接记忆召回
- `GET /health` - 健康检查

## 关键模式 {#key-patterns}

**按用户记忆库**：每个用户都会获得一个独立的记忆库（`user-alice`，`user-bob`)

**异步记忆存储**：交互存储在后台 goroutine 中：

```go
go func() {
    bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    retainReq := hindsight.RetainRequest{
        Items: []hindsight.MemoryItem{{
            Content: interaction,
            Context: *hindsight.NewNullableString(hindsight.PtrString("问答互动")),
        }},
    }
    client.MemoryAPI.RetainMemories(bgCtx, bankID).RetainRequest(retainReq).Execute()
}()
```

**基于标签的筛选**：按类型对记忆库中的记忆进行分区以进行范围检索

## 了解更多 {#learn-more}

- [Go SDK 文档](https://hindsight.vectorize.io/sdks/go)
- [Hindsight 文档](https://hindsight.vectorize.io)
