# 扩展 {#extensions}

扩展可在不修改核心代码的情况下自定义和扩展 Hindsight 的行为。它们支持多租户、自定义身份验证、额外的 HTTP 端点以及操作钩子。

---

## 可用扩展 {#available-extensions}

### TenantExtension {#tenantextension}

处理多租户和 API 密钥身份验证。它会验证传入请求，并确定数据库操作应使用哪个 PostgreSQL schema，从而在数据库层实现租户隔离。

**内置：ApiKeyTenantExtension**

一种简单实现：根据环境变量验证 API 密钥，并对所有通过身份验证的请求使用 `public` schema。

```bash
HINDSIGHT_API_TENANT_EXTENSION=hindsight_api.extensions.builtin.tenant:ApiKeyTenantExtension
HINDSIGHT_API_TENANT_API_KEY=your-secret-key
```

**已不再内置：SupabaseTenantExtension**

验证 [Supabase](https://supabase.com) JWT，并为每位通过身份验证的用户分配独立的 PostgreSQL schema。它现已移至[扩展注册表](https://github.com/vectorize-io/hindsight/tree/main/hindsight-extensions/supabase-tenant)，其中说明了配置方式，并提供 Dockerfile 以构建包含该扩展的镜像。

:::warning 0.9.3 中的破坏性变更
在 0.9.2 及更早版本中，此扩展是内置的，路径为 `hindsight_api.extensions.builtin.supabase_tenant`。该路径现已不存在，因此仍指向此路径的安装会在启动时因 `ModuleNotFoundError` 而失败。请将扩展加入镜像，并设置 `HINDSIGHT_API_TENANT_EXTENSION=hindsight_ext_supabase_tenant:SupabaseTenantExtension`。所有 `HINDSIGHT_API_TENANT_*` 设置和 schema 命名方式均未改变。
:::

**外部扩展：StaticKeysTenantExtension**

完全自托管的多用户模式：用户及其 API 密钥在环境变量中声明（无需外部身份提供方，也无需用户表）。每位用户对应自己的 PostgreSQL schema（`{prefix}_{user_id}`），该 schema 会在首次访问时按需创建，从而在数据库层隔离各用户的记忆。多个 API 密钥可以映射到同一用户和 schema。

用户 ID 不区分大小写：构造 schema 名称前会将其转换为小写，并把连字符规范化为下划线，因此 `Rafael`、`rafael` 和 `RAFAEL` 都会解析到同一个租户 schema。

它位于[扩展注册表](https://github.com/vectorize-io/hindsight/tree/main/hindsight-extensions/static-keys-tenant)，其中说明了配置方式，并提供 Dockerfile 以构建包含该扩展的镜像。

对于其他需要为每个租户使用独立 schema 的多租户方案（例如基于自定义 JWT 的身份验证），请实现自定义 `TenantExtension`。

---

### HttpExtension {#httpextension}

在 `/ext/` 路径前缀下添加自定义 HTTP 端点。适用于添加与 Hindsight 记忆引擎集成的领域专用 API。

它提供两个路由方法：
- `get_router(memory)` → 返回一个挂载在 `/ext/` 下的 FastAPI 路由器
- `get_root_router(memory)` → 返回一个挂载在应用根路径下的 FastAPI 路由器（用于 well-known 端点或必须位于特定路径的其他端点）。默认返回 `None`。

**没有内置实现** —— 请自行实现，以添加自定义端点。

```bash
HINDSIGHT_API_HTTP_EXTENSION=mypackage.ext:MyHttpExtension
```

---

### OperationValidatorExtension {#operationvalidatorextension}

为 Retain、Recall 和 Reflect 操作提供验证与监控钩子。适用场景包括：
- 速率限制和配额强制执行
- 权限检查和内容过滤
- 审计日志记录和用量跟踪
- 自定义指标收集

**没有内置实现** —— 请根据自身需求实现。

`self.context` 是进程级扩展上下文，可用于 `get_memory_engine()` 等进程级句柄。它不保存每个请求的状态：应从每个钩子自身的参数中获取租户和记忆库（`ctx.bank_id` 和 `ctx.request_context`；后者包含由租户扩展解析出的身份信息）。

```bash
HINDSIGHT_API_OPERATION_VALIDATOR_EXTENSION=mypackage.validators:MyValidator
```

---

### MCPExtension {#mcpextension}

在 Hindsight MCP 服务器上注册额外的 MCP（Model Context Protocol）工具。外部软件包可以借此添加自定义工具，而无需修改核心代码。

**没有内置实现** —— 请自行实现，以添加自定义 MCP 工具。

```bash
HINDSIGHT_API_MCP_EXTENSION=mypackage.mcp:MyMCPExtension
```

---

## 编写自定义扩展 {#writing-custom-extensions}

### 扩展基础知识 {#extension-basics}

扩展是通过环境变量加载的 Python 类：

```bash
HINDSIGHT_API_<TYPE>_EXTENSION=mypackage.module:MyExtensionClass
```

配置通过带前缀的环境变量传入：

```bash
HINDSIGHT_API_<TYPE>_SOME_CONFIG=value
# Extension receives: {"some_config": "value"}
```

所有扩展都支持生命周期钩子：
- `on_startup()` —— 应用启动时调用
- `on_shutdown()` —— 应用关闭时调用

扩展可以访问 `ExtensionContext`，其中提供：
- `run_migration(schema)` —— 为指定 schema 运行数据库迁移
- `get_memory_engine()` —— 获取 `MemoryEngine` 接口

### 提供自定义数据库迁移 {#shipping-your-own-database-migrations}

如果扩展需要维护自己的状态，它应返回存放 Alembic
revision 文件的目录；这些文件会与 Hindsight 自身的迁移在同一轮迁移中应用，并遵循相同的排序保证，使用同一张 `alembic_version` 表：

```python
class MyExtension(TenantExtension):
    def alembic_version_locations(self) -> list[str]:
        return [str(Path(__file__).parent / "alembic" / "versions")]
```

该目录只存放 revision 文件，不包含 `env.py`；schema 和连接由 Hindsight 自身的配置负责。迁移树独立于 Hindsight：请将第一个 revision 的 `down_revision` 设为 `None`，并通过 `branch_labels` 指定扩展名称，以便运维人员可以定位它（`alembic upgrade <label>@head`）。

独立分支之间没有排序关系。如果某个 revision 需要先创建 Hindsight 的表，必须明确声明依赖；这样可以建立排序关系，同时不把 Hindsight 的 revision 设为它的父级：

```python
depends_on = ("a1b2c3d4e5f6",)   # a Hindsight revision id
```

如果目录不存在，系统会发出警告并跳过，而不会导致迁移失败。配置错误的扩展绝不能让数据库无法迁移。

### 示例：使用 JWT 的自定义 TenantExtension {#example-custom-tenantextension-with-jwt}

```python
import jwt
from hindsight_api.extensions import TenantExtension, TenantContext, AuthenticationError

class JwtTenantExtension(TenantExtension):
    def __init__(self, config: dict[str, str]):
        super().__init__(config)
        self.jwt_secret = config.get("jwt_secret")
        if not self.jwt_secret:
            raise ValueError("HINDSIGHT_API_TENANT_JWT_SECRET is required")

    async def authenticate(self, context: RequestContext) -> TenantContext:
        token = context.api_key
        if not token:
            # Optional headers dict is forwarded in HTTP/MCP error responses
            raise AuthenticationError("Bearer token required")

        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            tenant_id = payload.get("tenant_id")
            if not tenant_id:
                raise AuthenticationError("Missing tenant_id in token")
            return TenantContext(schema_name=f"tenant_{tenant_id}")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(str(e))
```

`AuthenticationError` 接受可选的 `headers` 字典，该字典会转发到 HTTP 和 MCP 错误响应中。这样便于返回 `WWW-Authenticate` 等自定义响应头：

```python
raise AuthenticationError(
    "Authorization required",
    headers={"WWW-Authenticate": 'Bearer realm="example"'},
)
```

### 读取其他请求头 {#reading-additional-request-headers}

`RequestContext` 会将 `Authorization` 请求头放在 `api_key` 中。若要通过*另一个*请求头进行身份验证，例如网关使用一个共享身份完成身份验证，再单独转发每个调用方的身份，请指定要转发的请求头：

```bash
HINDSIGHT_API_EXTENSION_PASSTHROUGH_HEADERS=x-user-assertion
```

这些请求头可通过 `context.extra_headers` 访问，键名均为小写：

```python
async def authenticate(self, context: RequestContext) -> TenantContext:
    assertion = context.extra_headers.get("x-user-assertion")
    if not assertion:
        raise AuthenticationError("x-user-assertion header required")

    user_id = verify_assertion(assertion)  # your verification
    return TenantContext(schema_name=f"tenant_{user_id}")
```

这同时适用于 HTTP 和 MCP 传输；同一个 `RequestContext` 也会传给 `OperationValidatorExtension` 钩子，因此验证器可以针对此处解析出的身份执行规则。

只有你列出的请求头才会被转发，并且仅当请求中实际包含它们时才会转发。默认情况下该变量未设置，因此除非显式启用，否则扩展看不到任何请求头数据。

如果同一个请求头被发送了**多次**，系统不会转发该请求头，并会记录一条警告。无法安全地在多个副本中做出选择：代理可能会在客户端提供的值之前或之后追加其可信值。因此，扩展读取时会得到空值，导致请求失败，而不是悄然接受可能遭到伪造的值。请确保代理**替换**其注入的身份请求头，而不是将其追加到已有值之后。

:::caution 延后执行的操作
`extra_headers` 描述的是当前正在处理的请求。之后才运行的操作（例如排队等待的 retain、计划执行的整合、心智模型刷新）由后台工作进程执行，届时没有对应请求，因此它们的 `RequestContext` 不包含请求头。请在请求到达时依据请求头进行授权；不要依赖响应返回后继续执行的工作中仍能读取该请求头。
:::

### 示例：自定义 HttpExtension {#example-custom-httpextension}

```python
from fastapi import APIRouter
from hindsight_api.extensions import HttpExtension

class MyHttpExtension(HttpExtension):
    def get_router(self, memory: MemoryEngine) -> APIRouter:
        router = APIRouter()

        @router.get("/hello")
        async def hello():
            return {"message": "Hello from extension!"}

        @router.post("/custom/{bank_id}/action")
        async def custom_action(bank_id: str):
            # Access memory engine for database operations
            pool = await memory._get_pool()
            # ... custom logic
            return {"status": "ok"}

        return router

    def get_root_router(self, memory: MemoryEngine) -> APIRouter | None:
        """Optional: mount routes at the application root (not under /ext/)."""
        router = APIRouter()

        @router.get("/.well-known/my-metadata")
        async def metadata():
            return {"version": "1.0"}

        return router
```

`get_router` 定义的路由可通过 `/ext/hello`、`/ext/custom/{bank_id}/action` 等路径访问。
`get_root_router` 定义的路由会挂载在应用根路径下（例如 `/.well-known/my-metadata`）。

### 示例：自定义 OperationValidatorExtension {#example-custom-operationvalidatorextension}

```python
from hindsight_api.extensions import (
    OperationValidatorExtension,
    ValidationResult,
    PrecheckContext,
    RetainContext,
    RecallContext,
    ReflectContext,
    RetainResult,
)

class MyValidator(OperationValidatorExtension):
    # Pre-body validation (optional)
    async def precheck(self, ctx: PrecheckContext) -> ValidationResult:
        if ctx.content_length is not None and ctx.content_length > 10_000_000:
            return ValidationResult.reject("Payload is too large")
        return ValidationResult.accept()

    # Pre-operation validation (required)
    async def validate_retain(self, ctx: RetainContext) -> ValidationResult:
        # Implement your validation logic
        return ValidationResult.accept()
        # Or reject: return ValidationResult.reject("Reason")

    async def validate_recall(self, ctx: RecallContext) -> ValidationResult:
        return ValidationResult.accept()

    async def validate_reflect(self, ctx: ReflectContext) -> ValidationResult:
        return ValidationResult.accept()

    # Post-operation hooks (optional)
    async def on_retain_complete(self, result: RetainResult) -> None:
        # Log usage, update metrics, send notifications, etc.
        pass
```

`precheck` 在读取或反序列化请求正文之前运行。其 `PrecheckContext.content_length` 是解析后的 `Content-Length` 请求头整数值；如果请求头缺失或无法解析（例如使用分块传输编码），则为 `None`。可用它实现开销较低、能根据大小作出判断的配额或成本防护；完整的 `validate_*` 钩子仍会在解析之后运行，应在其中执行精确的逐操作限制。

#### 记忆维护钩子 {#memory-curation-hooks}

维护记忆（`PATCH /v1/default/banks/{bank_id}/memories/{memory_id}`：编辑、失效或恢复）时，除首先运行的 `validate_bank_write` 访问检查外，还会运行一对专用钩子：

- `validate_memory_update(ctx: MemoryUpdateContext)` 在任何处理开始前运行。上下文包含请求的 `text`（编辑时）、请求的 `state` 以及 `edits_fields`。在此处拒绝即可阻止维护操作；返回的 `status_code` 会原样传入 HTTP 响应。
- `on_memory_update_complete(result: MemoryUpdateResult)` 在变更提交后运行一次。`result.action` 的值为 `edit`、`invalidate`、`revert` 或 `reason`；`result.reembedded_tokens` 表示引擎重新嵌入的文本量（仅失效或仅更新原因时为 0）。编辑或恢复会重新嵌入记忆并重新整合记忆库，因此，如果维护操作的计费应与摄取相同，可据此数值计量。

#### 将调用方限制在标签范围内 {#confining-a-caller-to-a-tag-scope}

当多人共享一个记忆库，并通过标签划分各自可见的数据时，`resolve_tag_scope` 会将调用方的每项操作限定在标签过滤范围内。请返回调用方可访问数据必须满足的标签组（组间按 AND 组合）；若不限制则返回 `None`：

```python
from hindsight_api.engine.search.tags import TagGroupLeaf
from hindsight_api.extensions import OperationValidatorExtension, TagScopeContext


class TeamScopes(OperationValidatorExtension):
    async def resolve_tag_scope(self, ctx: TagScopeContext):
        user = ctx.request_context.api_key_id  # or whatever your tenant extension resolved
        # Dan reads his own memories plus the shared team rules.
        return [TagGroupLeaf(tags=[f"user:{user}", "kind:rule"], match="any_strict")]
```

引擎会把该范围与调用方提交的过滤条件组合，因此调用方可以进一步缩小可见范围，但不能扩大范围：

- **经过过滤的读取** —— Recall、Reflect（以及它运行的每个工具）、记忆列表、文档列表和心智模型列表、观测范围、标签列表、记忆图、时间序列、实体与实体图，以及知识库树、搜索和导出，都只会读取范围内的行。实体计数会根据可见记忆重新统计。
- **按 ID 读取和写入** —— 如果记忆、文档及其文本分块、心智模型或知识页在范围之外，请求会返回 `404`。如果 Retain 指定了范围外已存在的文档，则会被拒绝（`403`），因为替换或追加内容会触及他人的文本。
- **源文本遵循其所属文档的范围。** 某条记忆可能因自身标签而可见（例如从他人的私密笔记中提取、带有 `kind:rule` 标签的事实），但对应笔记不可见。只有文档自身的标签通过过滤后，才会返回其文本分块和文档正文。无论是否使用扩展，这条规则都适用于所有按标签过滤的 Recall 和 Reflect。
- **心智模型和知识页** —— 受范围限制的调用方创建或更新的心智模型和知识页必须带有范围内的标签（否则返回 `403`，因为调用方将无法看到自己创建的内容），并在其触发条件中记录该范围（`scope_tag_groups`）。每次刷新都会将其与模型自身的过滤条件按 AND 组合，因此绝不会基于创建者无权读取的记忆构建内容。后台刷新不受调用方范围限制运行，并依赖已记录的范围。已记录的范围只会进一步缩小模型范围，且无法通过 API 编辑；若要移除该范围，请重新创建模型。

请使用 `_strict` 匹配模式：非严格模式也会包含无标签行，而没有标签的心智模型会基于整个记忆库构建。

**写入是单独的权限。** 调用方可以读取共享范围，但未必有权修改其中的内容。`resolve_write_tag_scope` 会以 shell 风格的模式（例如 `user:dan`、`project:*`）返回调用方可以写入的标签；不限制时返回 `None`（默认值）：

```python
class TeamScopes(OperationValidatorExtension):
    async def resolve_write_tag_scope(self, ctx: TagScopeContext):
        user = ctx.request_context.api_key_id
        # Everyone writes their own memories; only Kate writes the team rules.
        return [f"user:{user}", "kind:rule"] if user == "kate" else [f"user:{user}"]
```

调用方写入或修改的任何对象上的每个标签都必须匹配其中一个模式，否则写入会被拒绝并返回 `403`（调用方连读取权限都没有的对象仍返回 `404`）。无标签对象对所有人可见，因此受限写入者不能创建或修改无标签对象。限制涵盖：

- **retain**（文本和文件）：每项输入的标签和批次的 `document_tags`，以及该 retain 策略中的[实体标签](./api/memory-banks#entity-labels)在 `tag: true` 时可能添加的所有标签（对每个允许值使用 `key:value`；对开放词汇使用 `key:*`），还有显式设置的 `observation_scopes`（`"shared"` 会写入无标签观测）。它们会在提取之前检查，因此被拒绝的 retain 不会调用 LLM；
- **记忆和文档**：编辑、使记忆失效或清除记忆的观测；更新文档（包括新标签）、重新处理文档或删除文档；
- **心智模型和知识页**：创建（包括设置标签）、更新、刷新、清除或删除；以及重命名、移动或删除知识节点（包括该节点下的所有页面，以及其移动到的文件夹下的页面）；
- **强制指令**：创建、更新或删除。无标签强制指令会影响所有人的 Reflect，因此受限写入者不能创建无标签强制指令。

读取强制指令的方式与 Reflect 相同：无标签强制指令适用于所有人，带标签的强制指令仅在调用方的读取范围内适用。

整库操作会触及所有记忆，不受标签影响，因此具有读取范围或写入范围的调用方一律不能执行这些操作（`403`）：导出、克隆和导入；清除记忆库中的记忆或观测；删除记忆库；更改或重置其配置、任务说明或性格倾向；以及按请求运行（或重试失败的）整合。引擎在受范围限制的调用方完成自身写入后排入队列的整合仍会运行。向受范围限制的调用方返回操作状态时，绝不包含原始任务负载。未按标签范围过滤的读取（统计数据、webhook）仍会经过 `validate_bank_read` / `validate_bank_write` 检查；这些钩子只能允许或拒绝访问。

#### 延后执行操作 {#deferring-an-operation}

除 `accept` 和 `reject` 外，`validate_*` 钩子还可以通过抛出 `DeferOperation`，要求工作进程在未来某个时间**重新排队**该操作。可用它处理背压情况（上游受到速率限制、配额窗口尚未开放、依赖服务仍在预热等）。与重试不同，这不会增加 `retry_count`，也不会写入 `error_message`。工作进程会将 `next_retry_at` 设为指定的 `exec_date`；在该时间之前，领取查询不会返回此任务。

```python
from datetime import datetime, timedelta, timezone

from hindsight_api.extensions import (
    DeferOperation,
    OperationValidatorExtension,
    RetainContext,
    ValidationResult,
)


class QuotaAwareValidator(OperationValidatorExtension):
    async def validate_retain(self, ctx: RetainContext) -> ValidationResult:
        if not await self._quota_available(ctx.bank_id):
            raise DeferOperation(
                exec_date=datetime.now(timezone.utc) + timedelta(minutes=5),
                reason="bank quota window exhausted",
            )
        return ValidationResult.accept()
```

`DeferOperation` **仅供工作进程使用**：不要在同步 HTTP 请求路径中的 `validate_recall` 或 `validate_reflect` 里抛出它。此处没有队列可供延后处理，最终会返回 500。

### 示例：自定义 MCPExtension {#example-custom-mcpextension}

```python
from mcp.server.fastmcp import FastMCP
from hindsight_api.extensions import MCPExtension
from hindsight_api.engine import MemoryEngine

class MyMCPExtension(MCPExtension):
    async def register_tools(self, mcp: FastMCP, memory: MemoryEngine) -> None:
        @mcp.tool()
        async def custom_search(query: str) -> str:
            """Custom MCP tool for specialized search."""
            # Access memory engine for operations
            pool = await memory._get_pool()
            # ... custom logic
            return f"Results for: {query}"
```

---

## 部署自定义扩展 {#deploying-custom-extensions}

### 使用 Docker {#with-docker}

扩展不会打包进镜像。请基于 Hindsight 构建新镜像，在其中安装扩展依赖并复制扩展文件。必须明确将依赖安装到镜像的虚拟环境中：该环境由 `uv sync` 创建，自身不附带 `pip`，因此直接运行 `pip install` 会把依赖装到服务器无法访问的位置：

```dockerfile
FROM ghcr.io/vectorize-io/hindsight:latest

RUN uv pip install --python /app/api/.venv/bin/python --no-cache \
      'PyJWT[crypto]>=2.12.0' 'httpx>=0.27.0'

COPY my_extension /app/extensions/my_extension
ENV PYTHONPATH=/app/extensions

# Fail the build, not the first request, if it isn't importable.
RUN /app/api/.venv/bin/python -c "import my_extension"
```

然后将服务指向该镜像，并通过环境变量传入扩展配置。API 和工作进程容器必须使用相同的扩展配置，因为工作进程会借助租户扩展枚举 schema，以便在后台执行整合。

完整步骤请参阅[扩展注册表 README](https://github.com/vectorize-io/hindsight/blob/main/hindsight-extensions/README.md#docker-packaging)。

### 裸机部署 {#bare-metal}

请将扩展包安装到与 Hindsight 相同的 Python 环境中：

```bash
# Install Hindsight
pip install hindsight-api

# Install your extension package
pip install ./my-extensions
# or
pip install my-extensions-package

# Configure
export HINDSIGHT_API_TENANT_EXTENSION=my_extensions.auth:JwtTenantExtension
export HINDSIGHT_API_TENANT_JWT_SECRET=your-secret

# Run
hindsight-api
```

---

## 贡献扩展 {#contributing-extensions}

如果你构建的扩展解决了常见需求，例如：

- 身份验证提供方（OAuth、SAML、API 网关）
- 速率限制或配额管理
- 审计日志集成
- 指标导出器（Datadog、New Relic 等）
- 面向特定平台的自定义 HTTP 端点

请提交[功能请求](https://github.com/vectorize-io/hindsight/issues/new?template=feature_request.yml)，附上你的代码仓库链接，我们可以将它列入[扩展注册表](https://github.com/vectorize-io/hindsight/blob/main/hindsight-extensions/README.md)。Hindsight 不接受团队外部人员提交的拉取请求，因此注册表条目由团队添加。该 README 介绍了扩展目录结构、开发流程和 Docker 打包方式。

扩展位于服务器之外，因此安装 Hindsight 时不会顺带安装供应商的客户端库，修改扩展也无需发布新版 Hindsight。只有不增加依赖且适用于任何部署的扩展（`ApiKeyTenantExtension`、`MemoryDefenseRegexExtension`）仍保留在 `hindsight_api.extensions.builtin` 中。