# 扩展 {#extensions}

扩展允许在不修改核心代码的情况下自定义并扩展 Hindsight 行为，支持多租户、自定义身份验证、额外 HTTP 端点及操作钩子。

---

## 可用扩展 {#available-extensions}

### TenantExtension

处理多租户和 API 密钥身份验证。验证入站请求，确定数据库操作使用哪个 PostgreSQL schema，实现数据库级租户隔离。

**内置：ApiKeyTenantExtension**

简单实现：根据环境变量验证 API 密钥，所有已认证请求使用 `public` schema。

```bash
HINDSIGHT_API_TENANT_EXTENSION=hindsight_api.extensions.builtin.tenant:ApiKeyTenantExtension
HINDSIGHT_API_TENANT_API_KEY=your-secret-key
```

**不再内置：SupabaseTenantExtension**

验证 [Supabase](https://supabase.com) JWT，为每个已认证用户分配独立 PostgreSQL schema。现位于[扩展注册表](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-extensions/supabase-tenant)，其中说明配置并提供用于构建包含该扩展镜像的 Dockerfile。

:::warning 0.9.3 的破坏性变更
截至 0.9.2，此扩展内置于 `hindsight_api.extensions.builtin.supabase_tenant`。该路径已不存在，仍指向它的安装会在启动时因 `ModuleNotFoundError` 失败。请将扩展加入镜像，并设置 `HINDSIGHT_API_TENANT_EXTENSION=hindsight_ext_supabase_tenant:SupabaseTenantExtension`。所有 `HINDSIGHT_API_TENANT_*` 设置和 schema 命名不变。
:::

**外部：StaticKeysTenantExtension**

完全自托管的多用户模式：在环境变量中声明用户及 API 密钥（无需外部身份提供方或用户表）。每个用户映射到独立 PostgreSQL schema（`{prefix}_{user_id}`），首次访问时按需创建，实现用户间数据库级记忆隔离。多个 API 密钥可映射到同一用户和 schema。

用户 ID 不区分大小写：构造 schema 名称前转换为小写，并将连字符归一化为下划线，因此 `Rafael`、`rafael` 和 `RAFAEL` 都解析到同一个租户 schema。

它位于[扩展注册表](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-extensions/static-keys-tenant)，其中说明配置，并提供构建含该扩展镜像的 Dockerfile。

其他每个租户独立 schema 的多租户设置（例如自定义 JWT 身份验证），请实现自定义 `TenantExtension`。

---

### HttpExtension

在 `/ext/` 路径前缀下添加自定义 HTTP 端点，适合增加与 Hindsight 记忆引擎集成的领域 API。

提供两个路由器方法：
- `get_router(memory)`：返回挂载在 `/ext/` 的 FastAPI 路由器
- `get_root_router(memory)`：返回挂载在应用根路径的 FastAPI 路由器（用于 well-known 端点或必须位于指定位置的路径）。默认返回 `None`。

**没有内置实现**，请自行实现以添加自定义端点。

```bash
HINDSIGHT_API_HTTP_EXTENSION=mypackage.ext:MyHttpExtension
```

---

### OperationValidatorExtension

接入记忆存储、记忆召回和反思操作，进行验证和监控。使用场景包括：
- 限流和配额执行
- 权限检查和内容过滤
- 审计日志和用量跟踪
- 自定义指标收集

**没有内置实现**，请根据需求自行实现。

`self.context` 是进程级扩展上下文，用于 `get_memory_engine()` 等全局句柄。不包含请求级状态：请从各钩子参数中获取租户和库（`ctx.bank_id` 与 `ctx.request_context`，后者包含租户扩展解析的身份）。

```bash
HINDSIGHT_API_OPERATION_VALIDATOR_EXTENSION=mypackage.validators:MyValidator
```

---

### MCPExtension

在 Hindsight MCP（模型上下文协议）服务器注册额外工具，让外部软件包无需修改核心代码即可添加自定义工具。

**没有内置实现**，请自行实现以添加自定义 MCP 工具。

```bash
HINDSIGHT_API_MCP_EXTENSION=mypackage.mcp:MyMCPExtension
```

---

## 编写自定义扩展 {#writing-custom-extensions}

### 扩展基础 {#extension-basics}

扩展是通过环境变量加载的 Python 类：

```bash
HINDSIGHT_API_<TYPE>_EXTENSION=mypackage.module:MyExtensionClass
```

配置通过带前缀的环境变量传入：

```bash
HINDSIGHT_API_<TYPE>_SOME_CONFIG=value
# 扩展接收到： {"some_config": "value"}
```

所有扩展支持生命周期钩子：
- `on_startup()`：应用启动时调用
- `on_shutdown()`：应用关闭时调用

扩展可以访问 `ExtensionContext`，它提供：
- `run_migration(schema)`：为 schema 运行数据库迁移
- `get_memory_engine()`：获取 MemoryEngine 接口

### 提供自己的数据库迁移 {#shipping-your-own-database-migrations}

保存自身状态的扩展返回 Alembic 修订文件目录；这些修订与 Hindsight 自身迁移在同一次运行应用，具有相同顺序保证，使用同一 `alembic_version` 表：

```python
class MyExtension(TenantExtension):
    def alembic_version_locations(self) -> list[str]:
        return [str(Path(__file__).parent / "alembic" / "versions")]
```

目录仅包含修订文件，没有 `env.py`；Hindsight 自己的环境负责配置 schema 和连接。修订树独立于 Hindsight：首个修订设置 `down_revision = None`，并用 `branch_labels` 命名扩展，让运维人员可以指定它（`alembic upgrade <label>@head`）。

独立分支之间没有顺序。需要 Hindsight 表先存在的修订必须显式声明依赖，这会确定顺序，而不把 Hindsight 修订设为父修订：

```python
depends_on = ("a1b2c3d4e5f6",)   # Hindsight 修订 ID
```

不存在的目录会被跳过并警告，而非使迁移失败；配置错误的扩展不能让数据库无法迁移。

### 示例：使用 JWT 的自定义 TenantExtension {#example-custom-tenantextension-with-jwt}

```python
import jwt
from hindsight_api.extensions import TenantExtension, TenantContext, AuthenticationError

class JwtTenantExtension(TenantExtension):
    def __init__(self, config: dict[str, str]):
        super().__init__(config)
        self.jwt_secret = config.get("jwt_secret")
        if not self.jwt_secret:
            raise ValueError("必须设置 HINDSIGHT_API_TENANT_JWT_SECRET")

    async def authenticate(self, context: RequestContext) -> TenantContext:
        token = context.api_key
        if not token:
            # 可选 headers 字典会转发到 HTTP/MCP 错误响应
            raise AuthenticationError("需要 Bearer 令牌")

        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            tenant_id = payload.get("tenant_id")
            if not tenant_id:
                raise AuthenticationError("令牌中缺少 tenant_id")
            return TenantContext(schema_name=f"tenant_{tenant_id}")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(str(e))
```

`AuthenticationError` 接受可选 `headers` 字典，转发到 HTTP 和 MCP 错误响应。可用于返回 `WWW-Authenticate` 等自定义头：

```python
raise AuthenticationError(
    "需要授权",
    headers={"WWW-Authenticate": 'Bearer realm="example"'},
)
```

### 读取额外请求头 {#reading-additional-request-headers}

`RequestContext` 使用 `api_key` 携带 `Authorization` 头。通过*其他*头认证时，例如网关以共享身份完成认证、另外转发逐调用方身份，可声明需要转发的头：

```bash
HINDSIGHT_API_EXTENSION_PASSTHROUGH_HEADERS=x-user-assertion
```

可通过 `context.extra_headers` 获取，键为小写名称：

```python
async def authenticate(self, context: RequestContext) -> TenantContext:
    assertion = context.extra_headers.get("x-user-assertion")
    if not assertion:
        raise AuthenticationError("需要 x-user-assertion 请求头")

    user_id = verify_assertion(assertion)  # 你的验证逻辑
    return TenantContext(schema_name=f"tenant_{user_id}")
```

此方式适用于 HTTP 和 MCP 传输，相同 `RequestContext` 会传给 `OperationValidatorExtension` 钩子，因此验证器可根据此处解析的身份执行规则。

仅转发列出的头，且必须实际存在于请求中。默认未设置该变量，因此除非显式启用，否则扩展看不到任何头数据。

**重复发送**的头完全不转发，并记录警告。无法安全选择多个值：代理可能在客户端值之前或之后追加可信值。因此扩展读取时看不到该头，拒绝请求，而非静默接受可能伪造的值。确保代理*替换*注入的身份头，而非追加。

:::caution 延迟操作
`extra_headers` 描述当前服务的请求。稍后运行的操作——排队的记忆存储、计划整合、心智模型刷新——由没有关联请求的后台工作进程执行，因此其 `RequestContext` 不携带头。请在请求时根据头授权，不要在响应结束后的工作中依赖它。
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
            return {"message": "来自扩展的问候！"}

        @router.post("/custom/{bank_id}/action")
        async def custom_action(bank_id: str):
            # 访问记忆引擎以执行数据库操作
            pool = await memory._get_pool()
            # ... 自定义逻辑
            return {"status": "ok"}

        return router

    def get_root_router(self, memory: MemoryEngine) -> APIRouter | None:
        """可选：将路由挂载到应用根路径（不在 /ext/ 下）。"""
        router = APIRouter()

        @router.get("/.well-known/my-metadata")
        async def metadata():
            return {"version": "1.0"}

        return router
```

`get_router` 的路由可通过 `/ext/hello`、`/ext/custom/{bank_id}/action` 等访问。
`get_root_router` 的路由挂载到应用根路径（例如 `/.well-known/my-metadata`）。

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
    # 读取请求体前验证（可选）
    async def precheck(self, ctx: PrecheckContext) -> ValidationResult:
        if ctx.content_length is not None and ctx.content_length > 10_000_000:
            return ValidationResult.reject("载荷过大")
        return ValidationResult.accept()

    # 操作前验证（必需）
    async def validate_retain(self, ctx: RetainContext) -> ValidationResult:
        # 实现验证逻辑
        return ValidationResult.accept()
        # 或拒绝：return ValidationResult.reject("原因")

    async def validate_recall(self, ctx: RecallContext) -> ValidationResult:
        return ValidationResult.accept()

    async def validate_reflect(self, ctx: ReflectContext) -> ValidationResult:
        return ValidationResult.accept()

    # 操作后钩子（可选）
    async def on_retain_complete(self, result: RetainResult) -> None:
        # 记录用量、更新指标、发送通知等。
        pass
```

`precheck` 在读取或反序列化请求体前执行。`PrecheckContext.content_length` 是将 `Content-Length` 头解析得到的整数；头缺失或无法解析时（例如分块传输编码）为 `None`。可用它低成本地按大小检查配额或成本；完整 `validate_*` 钩子仍在解析后运行，并应执行准确的逐操作限制。

#### 记忆整理钩子 {#memory-curation-hooks}

整理记忆（`PATCH /v1/default/banks/{bank_id}/memories/{memory_id}`：编辑、失效或还原）除了先执行 `validate_bank_write` 访问检查，还拥有一对专门钩子：

- `validate_memory_update(ctx: MemoryUpdateContext)` 在任何工作之前执行。上下文携带请求的 `text`（编辑时）、`state` 和 `edits_fields`。在此拒绝即可阻止整理，返回的 `status_code` 直接传给 HTTP 响应。
- `on_memory_update_complete(result: MemoryUpdateResult)` 在更改提交后执行。`result.action` 为 `edit`、`invalidate`、`revert` 或 `reason`，`result.reembedded_tokens` 是引擎重新生成嵌入的文本大小（仅失效或只更新理由时为 0）。编辑或还原会重新生成记忆嵌入并重新整合库；若整理与导入相同文本按同样费用计价，应计量此值。

#### 将调用方限制在标签范围内 {#confining-a-caller-to-a-tag-scope}

多人共享记忆库，并通过标签区分各自可见内容时，`resolve_tag_scope` 将调用方的所有操作固定到标签过滤器。返回可访问数据必须满足的标签组（组间为 AND），或返回 `None` 表示不限制：

```python
from hindsight_api.engine.search.tags import TagGroupLeaf
from hindsight_api.extensions import OperationValidatorExtension, TagScopeContext


class TeamScopes(OperationValidatorExtension):
    async def resolve_tag_scope(self, ctx: TagScopeContext):
        user = ctx.request_context.api_key_id  # 或租户扩展解析出的其他身份
        # Dan 读取自己的记忆和共享团队规则。
        return [TagGroupLeaf(tags=[f"user:{user}", "kind:rule"], match="any_strict")]
```

引擎将范围与调用方发送的过滤器组合，因此调用方可以缩小视图，却无法扩大：

- **过滤后的读取**：记忆召回、反思（及其运行的所有工具）、记忆/文档/心智模型列表、观察范围、标签列表、记忆图、时间序列、实体与实体图，以及知识库树、搜索和导出，只能看到范围内的行。实体数量按可见记忆重新统计。
- **按 ID 读写**：记忆、文档及其文本块、心智模型或知识页面，条目超出范围时返回 `404`。记忆存储指定了范围外现有文档时拒绝（`403`），因为替换或追加会修改别人的文本。
- **源文本遵循文档权限。** 记忆可能因自身标签可见（例如从私人笔记提取的 `kind:rule` 事实），但笔记不可见。只有*文档*标签通过过滤时，才返回文本块和文档文本。适用于所有按标签过滤的召回和反思，无论是否使用扩展。
- 有范围限制的调用方创建或更新的**心智模型和知识页面**必须携带范围内标签（否则返回 `403`，因为调用方无法看到自己的创建结果），并在触发器中记录范围（`scope_tag_groups`）。每次刷新将其与模型自身过滤器 AND 组合，确保永不使用创建者无权读取的记忆构建。后台刷新本身无范围限制，依赖记录的范围。记录的范围只能缩小模型，无法通过 API 编辑；要移除，需重新创建模型。

请使用 `_strict` 匹配模式：非严格模式还允许无标签行，而无标签心智模型基于整个记忆库构建。

**写入是独立权限。** 调用方可以读取共享范围，而无权修改。`resolve_write_tag_scope` 返回允许写入的标签，采用 shell 风格模式（`user:dan`、`project:*`），或返回 `None` 表示不限制（默认）：

```python
class TeamScopes(OperationValidatorExtension):
    async def resolve_write_tag_scope(self, ctx: TagScopeContext):
        user = ctx.request_context.api_key_id
        # 每个人写入自己的记忆；只有 Kate 能写入团队规则。
        return [f"user:{user}", "kind:rule"] if user == "kate" else [f"user:{user}"]
```

调用方写入或修改内容上的每个标签都必须匹配某个模式，否则返回 `403` 拒绝写入（连读取权限都没有的条目仍返回 `404`）。无标签条目属于所有人，因此受限写入方不能创建或修改。覆盖以下操作：

- **记忆存储**（文本和文件）：每个条目的标签、批次的 `document_tags`，以及存储策略中设置 `tag: true` 的[实体标签](./api/memory-banks#entity-labels)可能添加的所有标签（每个允许值对应 `key:value`，开放词汇使用 `key:*`），还有显式 `observation_scopes`（`"shared"` 写入无标签观察）。提取前检查，因此被拒绝的存储不消耗 LLM 调用；
- **记忆和文档**：编辑、使记忆失效或清除其观察；更新文档（包括新标签）、重新处理或删除文档；
- **心智模型和知识页面**：创建（检查其标签）、更新、刷新、清除或删除，以及重命名、移动或删除知识节点（检查其下每个页面，以及移入文件夹下的页面）；
- **指令**：创建、更新或删除。无标签指令引导所有人的反思，因此受限写入方不能创建。

指令读取遵循反思读取规则：无标签指令适用于所有人，有标签指令仅在调用方读取范围内适用。

整库操作不考虑标签，访问每条记忆，因此具有读取或写入范围的调用方完全不能执行（`403`）：导出、克隆、导入，清除库的记忆或观察，删除库，更改或重置配置、任务目标或性格倾向，以及按请求运行整合（或重试失败整合）。引擎在受限调用方写入后排队的整合仍会运行。操作状态绝不向受限调用方返回原始任务载荷。不按标签限制的读取（统计、webhook）仍经过 `validate_bank_read` / `validate_bank_write`，它们只能允许或拒绝。

#### 延迟操作 {#deferring-an-operation}

除 `accept` 和 `reject` 外，`validate_*` 钩子还可以抛出 `DeferOperation`，请求工作进程将操作**重新入队**，未来执行。用于背压场景（上游限流、配额窗口未开放、依赖预热）。与重试不同，它不增加 `retry_count`，也不写入 `error_message`。工作进程将 `next_retry_at` 设为你的 `exec_date`，在该时刻之前，领取查询看不到此任务。

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
                reason="记忆库配额窗口已耗尽",
            )
        return ValidationResult.accept()
```

`DeferOperation` **仅用于工作进程**：不要在同步 HTTP 请求路径的 `validate_recall` 或 `validate_reflect` 中抛出，因为没有可延迟到的队列，会表现为 500 错误。

### 示例：自定义 MCPExtension {#example-custom-mcpextension}

```python
from mcp.server.fastmcp import FastMCP
from hindsight_api.extensions import MCPExtension
from hindsight_api.engine import MemoryEngine

class MyMCPExtension(MCPExtension):
    async def register_tools(self, mcp: FastMCP, memory: MemoryEngine) -> None:
        @mcp.tool()
        async def custom_search(query: str) -> str:
            """用于专门搜索的自定义 MCP 工具。"""
            # 访问记忆引擎执行操作
            pool = await memory._get_pool()
            # ... 自定义逻辑
            return f"查询结果： {query}"
```

---

## 部署自定义扩展 {#deploying-custom-extensions}

### 使用 Docker {#with-docker}

镜像不包含自定义扩展。请基于 Hindsight 镜像构建新镜像，安装扩展依赖并复制扩展代码。安装时须明确指定镜像的虚拟环境：该环境由 `uv sync` 创建，自身没有 `pip`，直接运行 `pip install` 会将依赖安装到服务无法访问的位置：

```dockerfile
FROM ghcr.io/vectorize-io/hindsight:latest

RUN uv pip install --python /app/api/.venv/bin/python --no-cache \
      'PyJWT[crypto]>=2.12.0' 'httpx>=0.27.0'

COPY my_extension /app/extensions/my_extension
ENV PYTHONPATH=/app/extensions

# 无法导入时让构建失败，而非首次请求失败。
RUN /app/api/.venv/bin/python -c "import my_extension"
```

然后让服务使用该镜像，并通过环境变量传入扩展设置。API 和工作进程容器使用相同扩展配置：工作进程通过租户扩展枚举后台整合的 schema。

完整做法参见[扩展注册表 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-extensions/README.md#docker-packaging)。

### 裸机 {#bare-metal}

在与 Hindsight 相同的 Python 环境中安装扩展软件包：

```bash
# 安装 Hindsight
pip install hindsight-api

# 安装扩展软件包
pip install ./my-extensions
# 或
pip install my-extensions-package

# 配置
export HINDSIGHT_API_TENANT_EXTENSION=my_extensions.auth:JwtTenantExtension
export HINDSIGHT_API_TENANT_JWT_SECRET=your-secret

# 运行
hindsight-api
```

---

## 贡献扩展 {#contributing-extensions}

如果构建了能解决常见需求的扩展，例如：

- 身份验证提供方（OAuth、SAML、API 网关）
- 限流或配额管理
- 审计日志集成
- 指标导出器（Datadog、New Relic 等）
- 特定平台的自定义 HTTP 端点

请[提交功能请求](https://github.com/vectorize-io/hindsight/issues/new?template=feature_request.yml)，附上仓库链接，我们可以将其加入[扩展注册表](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-extensions/README.md)。Hindsight 不接受团队外部的拉取请求，因此注册表条目由团队添加。该 README 说明扩展目录结构、开发流程和 Docker 打包方式。

扩展位于服务器之外，避免安装 Hindsight 时拉入厂商客户端库，也让扩展更改无需发布 Hindsight。只有不添加依赖且适用于任何部署的扩展（`ApiKeyTenantExtension`、`MemoryDefenseRegexExtension`）保留在 `hindsight_api.extensions.builtin`。
