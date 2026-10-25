---
sidebar_position: 8
---

# Go 记忆增强 API {#go-memory-augmented-api}


:::info 完整应用
这是一个完整且可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 查看源代码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/go-memory-service)
:::


这是一个 Go HTTP 微服务，通过 Hindsight 演示如何为不同用户隔离记忆。它会记住每位用户使用的技术栈、解决过的问题和偏好，从而提供个性化帮助。

## 功能 {#features}

- 🔐 **按用户隔离**：每位用户都有自己的记忆库
- 🧠 **结合上下文作答**：使用 Recall（召回）和 Reflect（反思）生成个性化回答
- 🏃 **即发即忘式记忆存储**：后台 goroutine 存储交互内容，不会阻塞响应
- 🏷️ **按标签划分范围**：按类型（项目、调试、偏好）整理记忆

## 设置 {#setup}

### 1. 启动 Hindsight {#1-start-hindsight}

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=o3-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

### 2. 运行服务 {#2-run-the-service}

```bash
go run main.go
```

### 3. 试用 {#3-try-it-out}

```bash
# 存入记忆
curl -s localhost:8080/learn -d '{
  "user_id": "alice",
  "content": "I am building a Go microservice with gRPC and PostgreSQL",
  "tags": ["project"]
}'

curl -s localhost:8080/learn -d '{
  "user_id": "alice",
  "content": "I prefer structured logging with slog over zerolog",
  "tags": ["preferences"]
}'

# 提问（使用 Recall 和 Reflect）
curl -s localhost:8080/ask -d '{
  "user_id": "alice",
  "query": "What tech stack am I using?"
}' | jq .

# 直接召回记忆
curl -s "localhost:8080/recall/alice?q=database" | jq .
```

## API 端点 {#api-endpoints}

- `POST /learn` - 为用户存入新信息
- `POST /ask` - 使用用户的记忆回答问题
- `GET /recall/{userID}?q=query` - 直接召回记忆
- `GET /health` - 健康检查

## 关键模式 {#key-patterns}

**按用户划分记忆库**：每位用户都有独立的记忆库（`user-alice`、`user-bob`）。

**异步存储记忆**：交互内容通过后台 goroutine 存储：

```go
go func() {
    bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    retainReq := hindsight.RetainRequest{
        Items: []hindsight.MemoryItem{{
            Content: interaction,
            Context: *hindsight.NewNullableString(hindsight.PtrString("Q&A interaction")),
        }},
    }
    client.MemoryAPI.RetainMemories(bgCtx, bankID).RetainRequest(retainReq).Execute()
}()
```

**按标签筛选**：在一个记忆库内按类型划分记忆，以便限定检索范围。

## 了解更多 {#learn-more}

- [Go SDK 文档](/sdks/go)
- [Hindsight 文档](/)
