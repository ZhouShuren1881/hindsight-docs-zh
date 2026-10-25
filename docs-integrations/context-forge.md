---
sidebar_position: 21
title: "ContextForge MCP 网关与 Hindsight | 集成"
description: "在 IBM ContextForge 网关中将 Hindsight 注册为 MCP 后端。让每个已连接的 AI 工具（Dust、Claude Desktop、自定义智能体）都能通过统一的 MCP 中枢访问长期记忆。"
---

# ContextForge {#contextforge}

将 [Hindsight](https://vectorize.io/hindsight) 注册为 [IBM ContextForge](https://github.com/IBM/mcp-context-forge) 中的 MCP 后端。ContextForge 是一个开源 MCP 网关。注册后，所有连接到 ContextForge 的 AI 工具（Dust、Claude Desktop、自定义智能体）都能通过单一统一端点使用 Hindsight 的 Retain（存入）、Recall（召回）和 Reflect（反思）工具。

## 为什么要将 ContextForge 与 Hindsight 集成？ {#why-contextforge--hindsight}

ContextForge 充当中央 MCP 中枢，在一个经过身份验证的端点后聚合多个 MCP 服务器。将 Hindsight 添加为后端后，你可以：

- **使用一个端点访问多种工具** — AI 平台只需连接一次 ContextForge，即可访问 Hindsight 记忆以及其他 MCP 服务器提供的服务（如数据库、工作流和元数据目录）。
- **集中管理身份验证** — ContextForge 负责 SSO、RBAC 和基于 JWT 的身份验证，因此无需直接暴露 Hindsight。
- **按团队隔离记忆访问** — 使用 ContextForge 的团队/可见性模型，控制各团队可以访问哪些记忆库。
- **无需修改代码** — Hindsight 内置的 MCP 端点（`/mcp`）使用标准 Streamable HTTP，ContextForge 可以直接连接。

## 架构 {#architecture}

```
AI 工具（Dust、Claude Desktop、自定义智能体）
        │
        ▼
┌─────────────────────────────┐
│  ContextForge MCP 网关       │  ← SSO、RBAC、会话管理
│  （统一 MCP 端点）     │
└──────────┬──────────────────┘
           │  Streamable HTTP
     ┌─────┴──────┬──────────────┐
     ▼            ▼              ▼
 Hindsight    PostgreSQL     OpenMetadata
 （记忆）     MCP（SQL）      （元数据）
```

## 前置条件 {#prerequisites}

- 一个正在运行的 Hindsight 实例（Docker、Helm 或 Cloud）
- 一个正在运行的 ContextForge 实例
- ContextForge 与 Hindsight 之间可进行网络通信（位于同一 Kubernetes 集群、VPC 中，或通过公共 URL 连接）

## 设置 {#setup}

### 选项 1：通过 ContextForge 管理界面注册 {#option-1-register-via-contextforge-admin-ui}

1. 以管理员身份登录 ContextForge。
2. 前往 **Servers（服务器）** → **Add Server（添加服务器）**。
3. 填写以下信息：
   - **Name（名称）**：`hindsight`
   - **URL**：`http://<hindsight-host>:8888/mcp`（或你的 Hindsight API URL 加上 `/mcp`）
   - **Transport（传输方式）**：Streamable HTTP
4. 点击 **Save（保存）**。

### 选项 2：通过管理 API 注册 {#option-2-register-via-admin-api}

```bash
# 身份验证
TOKEN=$(curl -s -X POST https://your-contextforge.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}' \
  | jq -r '.access_token')

# 将 Hindsight 注册为 MCP 服务器
curl -X POST https://your-contextforge.com/admin/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hindsight",
    "url": "http://hindsight-api:8888/mcp",
    "transport": "streamable_http",
    "description": "Hindsight agent memory — retain, recall, and reflect"
  }'
```

### 选项 3：Kubernetes（Helm） {#option-3-kubernetes-helm}

如果两个服务都运行在同一个 EKS/Kubernetes 集群中，可以通过集群内服务 DNS 访问 Hindsight：

```
http://hindsight-api.hindsight.svc.cluster.local:8888/mcp
```

使用上文的管理界面或 API 方法，在 ContextForge 中注册此 URL。

若要在每次 Helm 部署时自动注册，可在 ContextForge chart 中添加一个 post-install Job，调用管理 API（参见下文的 [Helm 自动注册](#helm-auto-registration)示例）。

## 验证集成 {#verifying-the-integration}

注册完成后，验证是否可以通过 ContextForge 使用 Hindsight 工具：

```bash
# 通过 ContextForge 的 MCP 端点列出工具
curl -s -X POST https://your-contextforge.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' \
  | jq '.result[] | select(.name | startswith("hindsight"))'
```

你应该能看到 Hindsight 提供的工具，例如 `retain`、`recall`、`reflect`、`list_banks` 等。

## 记忆库模式 {#bank-modes}

Hindsight 的 MCP 端点支持两种模式，请根据使用场景选择：

### 多记忆库模式（默认） {#multi-bank-mode-default}

注册根 MCP 端点：

```
http://hindsight-api:8888/mcp
```

所有工具都带有可选参数 `bank_id`。智能体可以动态创建记忆库，并在不同记忆库之间切换。

### 单记忆库模式 {#single-bank-mode}

在 URL 中加入记忆库 ID，将端点固定到特定记忆库：

```
http://hindsight-api:8888/mcp/my-team-bank/
```

工具将限定在该记忆库中，因此无需提供 `bank_id` 参数。如果你希望 ContextForge 中的每个团队都拥有独立的记忆库，这种模式会很有用。

## 可用工具 {#available-tools}

注册完成后，可以通过 ContextForge 使用以下 Hindsight 工具：

| 工具 | 说明 |
|------|-------------|
| `retain` | 将信息存入长期记忆 |
| `recall` | 使用自然语言查询检索记忆 |
| `reflect` | 综合记忆并推理得出答案 |
| `list_banks` | 列出所有记忆库 |
| `create_bank` | 创建记忆库 |
| `list_mental_models` | 列出已固定的反思结果 |
| `create_mental_model` | 创建心智模型 |
| `list_documents` | 列出已摄取的文档 |

完整工具列表请参阅 [MCP 服务器参考文档](/developer/mcp-server#available-tools)。

## Helm 自动注册 {#helm-auto-registration}

若要在每次 Helm 部署时自动将 Hindsight 注册到 ContextForge，请在 ContextForge chart 中添加一个 post-install/post-upgrade Job：

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
              # 等待 ContextForge 就绪
              for i in $(seq 1 12); do
                curl -sf http://context-forge:4444/health && break
                sleep 10
              done
              # 身份验证
              TOKEN=$(curl -s -X POST http://context-forge:4444/auth/login \
                -H "Content-Type: application/json" \
                -d "{\"email\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" \
                | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
              # 注册或更新
              curl -X POST http://context-forge:4444/admin/servers \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d '{
                  "name": "hindsight",
                  "url": "http://hindsight-api.hindsight.svc.cluster.local:8888/mcp",
                  "transport": "streamable_http",
                  "description": "Hindsight agent memory"
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

## 通过 ContextForge 连接 AI 工具 {#connecting-ai-tools-via-contextforge}

在 ContextForge 中注册 Hindsight 后，AI 工具应连接到 ContextForge 的统一端点，而不是直接连接 Hindsight。

### Dust {#dust}

1. 在 Dust 中前往 **Spaces → Tools → Add MCP Server（空间 → 工具 → 添加 MCP 服务器）**。
2. URL：`https://your-contextforge.com/mcp`
3. 身份验证：Bearer 令牌（ContextForge JWT 或 MCP 客户端令牌）
4. Hindsight 工具将与所有其他已注册的 MCP 服务器工具一起显示。

### Claude Desktop {#claude-desktop}

将以下内容添加到 MCP 配置中：

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

### 未显示 Hindsight 工具 {#hindsight-tools-not-appearing}

确认服务器已注册且运行正常：

```bash
# 检查已注册的服务器
curl -s https://your-contextforge.com/admin/servers \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name == "hindsight")'

# 直接测试 Hindsight
curl -s http://hindsight-api:8888/health
```

### ContextForge 拒绝连接 {#connection-refused-from-contextforge}

如果 ContextForge 无法连接到 Hindsight：

- 确认网络连通性（位于同一命名空间/VPC，且 NetworkPolicy 允许流量）。
- 检查已注册的 URL 是否与 Hindsight 服务的实际端点一致。
- 确认 ContextForge 设置了 `SSRF_ALLOW_PRIVATE_NETWORKS=true`（集群内后端需要此设置）。

### 身份验证错误 {#auth-errors}

ContextForge 在网关层对用户进行身份验证。从集群内部访问时，Hindsight 的 MCP 端点无需单独身份验证。如果你在 Hindsight 上启用了 `MCP_AUTH_TOKEN`，请通过 ContextForge 的请求头透传功能传递该令牌：

```bash
# 确保 ContextForge 转发 Authorization 请求头
ENABLE_HEADER_PASSTHROUGH=true
DEFAULT_PASSTHROUGH_HEADERS='["Authorization"]'
```