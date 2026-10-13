---
sidebar_position: 21
title: "ContextForge MCP 带有 Hindsight 的网关 |整合"
description: "将Hindsight注册为IBM ContextForge网关中的MCP后端。让每个连接的AI工具——Dust、Claude Desktop、定制智能体——通过统一的MCP集线器访问长期记忆。"
---

# ContextForge {#contextforge}

注册[Hindsight](https://vectorize.io/hindsight) 作为MCP后端 [IBM ContextForge](https://github.com/IBM/mcp-context-forge)，开源MCP网关。一旦注册，每AI工具连接到ContextForge— Dust，Claude Desktop、自定义智能体 — 可以访问Hindsight通过单个统一端点的记忆存储、记忆召回和反思工具。

## 为什么ContextForge + Hindsight？ {#why-contextforge--hindsight}

ContextForge 充当中央 MCP 集线器，在一个经过身份验证的端点后面聚合多个 MCP 服务器。添加 Hindsight 作为后端意味着：

- **一个端点，多种工具** —AI平台连接到ContextForge一次即可访问Hindsight与其他人一起记忆MCP服务器（数据库、工作流程、元数据目录）
- **集中式身份验证** —ContextForge处理 SSO、RBAC 和基于 JWT 的身份验证；无需暴露  直接Hindsight
- **团队范围的记忆** — 使用ContextForge的team/visibility模型控制哪些团队可以访问哪些记忆库
- **无需修改代码** —Hindsight内置MCP端点 (`/mcp`) 使用标准 Streamable HTTP；ContextForge本地连接

## 架构 {#architecture}

```
AI 工具（Dust、Claude Desktop、自定义智能体）
        │
        ▼
┌─────────────────────────────┐
│  ContextForge MCP 网关   │  ← SSO、RBAC、会话管理
│  （统一 MCP 端点）     │
└──────────┬──────────────────┘
           │  Streamable HTTP
     ┌─────┴──────┬──────────────┐
     ▼            ▼              ▼
 Hindsight    PostgreSQL     OpenMetadata
 (memory)     MCP (SQL)      (metadata)
```

## 前置条件 {#prerequisites}

- 正在运行的 Hindsight 实例（Docker、Helm 或 Cloud）
- 正在运行的ContextForge实例
- ContextForge 和 Hindsight 之间的网络连接（相同的 Kubernetes 集群、VPC 或公共 URL）

## 设置 {#setup}

### 选项 1：通过 ContextForge 管理界面注册 {#option-1-register-via-contextforge-admin-ui}

1. 以管理员身份登录ContextForge
2. 导航至**服务器（Servers）**→**添加服务器（Add Server）**
3. 填写：
   - **名称**：`hindsight`
   - **URL**：`http://<hindsight-host>:8888/mcp`（或者你的HindsightAPI网址 + `/mcp`)
   - **传输**：可流式 HTTP
4. 点击**保存（Save）**

### 选项2：通过管理员注册API {#option-2-register-via-admin-api}

```bash
# Authenticate
TOKEN=$(curl -s -X POST https://your-contextforge.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}' \
  | jq -r '.access_token')

#将Hindsight注册为MCP服务器
curl -X POST https://your-contextforge.com/admin/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hindsight",
    "url": "http://hindsight-api:8888/mcp",
    "transport": "streamable_http",
    "description": "Hindsight 智能体记忆 — 记忆存储、记忆召回和反思"
  }'
```

### 选项3：Kubernetes（Helm） {#option-3-kubernetes-helm}

如果两个服务在同一个 EKS/Kubernetes 集群中运行，则可通过其集群内服务 DNS 访问 Hindsight：

```
http://hindsight-api.hindsight.svc.cluster.local:8888/mcp
```

使用上述 UI 或 API 方法在 ContextForge 中注册此 URL。

要在每个 Helm 部署上自动注册，请将安装后作业添加到您的ContextForge调用管理员的图表API（参见[Helm 示例](#helm-auto-registration)如下）。

## 验证集成 {#verifying-the-integration}

注册后，验证Hindsight工具可通过ContextForge使用：

```bash
#通过 ContextForge 的 MCP 端点列出工具
curl -s -X POST https://your-contextforge.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' \
  | jq '.result[] | select(.name | startswith("hindsight"))'
```

你应该看到Hindsight的工具：`retain`，`recall`，`reflect`，`list_banks`等

## 记忆库模式 {#bank-modes}

Hindsight的MCP端点支持两种模式。根据您的用例进行选择：

### 多记忆库模式（默认） {#multi-bank-mode-default}

注册根MCP端点：

```
http://hindsight-api:8888/mcp
```

所有工具都包含一个可选的`bank_id`参数。 智能体可以动态创建记忆库并在记忆库之间切换。

### 单一记忆库模式 {#single-bank-mode}

通过在 URL 中包含记忆库 ID 来固定到特定记忆库：

```
http://hindsight-api:8888/mcp/my-team-bank/
```

工具的范围仅限于记忆库 — 否 需要 `bank_id`参数。当您想要每一个时都很有用ContextForge团队拥有自己独立的记忆。

## 可用工具 {#available-tools}

注册后，这些Hindsight工具即可通过ContextForge使用：

|工具|说明|
|------|-------------|
|`retain`|将信息存储到长期记忆中|
|`recall`|使用自然语言查询搜索记忆|
|`reflect`|将记忆综合成一个合理的答案|
|`list_banks`|列出所有记忆库|
|`create_bank`|创建一个新的记忆库|
|`list_mental_models`|列出保存的反思结果|
|`create_mental_model`|创建一个新的心智模型|
|`list_documents`|列出摄取的文档|

查看中的完整工具列表 [MCP 服务器参考](https://hindsight.vectorize.io/developer/mcp-server#available-tools)。

## Helm 自动注册 {#helm-auto-registration}

要在每次 Helm 部署时自动在 ContextForge 中注册 Hindsight，请将 post-install/post-upgrade 作业添加到 ContextForge 图表中：

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: register-hindsight-{{ .Release.Revision }}
  annotations:
    "helm.sh/hook": post-install,post-upgrade
    "helm.sh/hook-weight": "5"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: register
          image: curlimages/curl:latest
          command: ["/bin/sh", "-c"]
          args:
            - |
              #等待ContextForge
              for i in $(seq 1 12); do
                curl -sf http://context-forge:4444/health && break
                sleep 10
              done
              # Authenticate
              TOKEN=$(curl -s -X POST http://context-forge:4444/auth/login \
                -H "Content-Type: application/json" \
                -d "{\"email\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" \
                | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
              #注册或更新
              curl -X POST http://context-forge:4444/admin/servers \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d '{
                  "name": "hindsight",
                  "url": "http://hindsight-api.hindsight.svc.cluster.local:8888/mcp",
                  "transport": "streamable_http",
                  "description": "Hindsight智能体记忆"
                }'
          env:
            - name: ADMIN_USER
              valueFrom:
                secretKeyRef:
                  name: context-forge-credentials
                  key: ADMIN_USERNAME
            - name: ADMIN_PASS
              valueFrom:
                secretKeyRef:
                  name: context-forge-credentials
                  key: ADMIN_PASSWORD
```

## 通过ContextForge连接AI工具 {#connecting-ai-tools-via-contextforge}

一旦 Hindsight 在 ContextForge 中注册，AI 工具就会连接到 ContextForge 的统一端点，而不是直接连接到 Hindsight。

### Dust {#dust}

1. 在 Dust 中 → **空间 → 工具 → 添加 MCP 服务器（Spaces → Tools → Add MCP Server）**
2. 网址：`https://your-contextforge.com/mcp`
3. Auth：承载令牌（ContextForge JWT 或MCP 客户端令牌）
4. Hindsight 工具与所有其他注册的 MCP 服务器一起出现

### Claude Desktop {#claude-desktop}

添加到您的MCP配置：

```json
{
  "mcpServers": {
    "context-forge": {
      "url": "https://your-contextforge.com/mcp",
      "headers": {
        "Authorization": "Bearer <your-contextforge-token>"
      }
    }
  }
}
```

## 故障排查 {#troubleshooting}

### Hindsight 工具未出现 {#hindsight-tools-not-appearing}

验证服务器已注册且运行正常：

```bash
#检查已注册的服务器
curl -s https://your-contextforge.com/admin/servers \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "hindsight")'

#直接测试Hindsight
curl -s http://hindsight-api:8888/health
```

### 来自ContextForge的连接被拒绝 {#connection-refused-from-contextforge}

如果ContextForge无法到达Hindsight：
- 验证网络连接（同namespace/VPC，NetworkPolicy允许流量）
- 检查注册的URL是否与实际的Hindsight服务端点匹配
- 确保`SSRF_ALLOW_PRIVATE_NETWORKS=true` 设置于ContextForge（集群内后端必需）

### 身份验证错误 {#auth-errors}

ContextForge在网关级别对用户进行身份验证。  从集群内部访问时，Hindsight的MCP端点不需要单独的身份验证。如果您已启用 `MCP_AUTH_TOKEN` 开启Hindsight，通过ContextForge的头传递：

```bash
#确保ContextForge转发授权标头
ENABLE_HEADER_PASSTHROUGH=true
DEFAULT_PASSTHROUGH_HEADERS='["Authorization"]'
```
