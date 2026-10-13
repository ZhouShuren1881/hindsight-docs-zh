---
sidebar_position: 6
---

# 程序化API (Node.js) {#programmatic-api-nodejs}

`@vectorize-io/hindsight-all` npm 软件包是 Python [`hindsight-all`](./hindsight-all.md) 的 Node.js 对应版本。它让 Node.js 代码启动并管理本地 Hindsight 守护进程，无需部署服务器基础设施。搭配 [`@vectorize-io/hindsight-client`](./nodejs.mdx) 即可执行记忆操作。

守护进程以**独立的操作系统进程**运行，监听 `127.0.0.1`，不在 Node 进程内。你的代码通过 `HindsightClient` 使用 HTTP 与它通信。

该软件包**不包含 HTTP 客户端**，仅负责管理服务器进程。守护进程运行后，使用 [`@vectorize-io/hindsight-client`](./nodejs.mdx) 连接 `server.getBaseUrl()` 返回的地址。两个软件包分工协作：一个管理进程，另一个提供 API 接口。

## 工作原理 {#how-it-works}

1. `server.start()`解析底层`hindsight-embed`命令（通过来自 PyPI 的 `uvx`，或 `uv run --directory <path>` 用于本地源码检出目录）。
2. 执行 `profile create <name> --merge --port <port> [--env KEY=VALUE ...]`，将 `options.env` 中的每个条目作为 `--env` 参数传递。
3. 运行`daemon --profile <name> start`。
4. 轮询 `http://host:port/health`，直到返回 `200` 或耗尽 `readyTimeoutMs` 时间预算。
5. `server.stop()` 运行 `daemon --profile <name> stop`。

服务器包装器保持透明：添加守护进程环境变量或 CLI 参数无需等待包装器发布新版本，直接通过 `env`、`extraProfileCreateArgs` 或 `extraDaemonStartArgs` 传入即可。

## 环境要求 {#requirements}

- **Node.js ≥ 22** — 使用全局 `fetch` 和 `AbortSignal.timeout`。
- **`uv` / `uvx`** 位于 `PATH` 中 — 用于下载并运行Hindsight守护进程。通过安装 [docs.astral.sh/uv](https://docs.astral.sh/uv/)。

## 安装 {#install}

```bash
npm install @vectorize-io/hindsight-all @vectorize-io/hindsight-client
```

## 示例 {#example}

```ts
import { HindsightServer, consoleLogger } from '@vectorize-io/hindsight-all';
import { HindsightClient } from '@vectorize-io/hindsight-client';

const server = new HindsightServer({
  profile: 'my-app',
  port: 9077,
  env: {
    HINDSIGHT_API_LLM_PROVIDER: 'anthropic',
    HINDSIGHT_API_LLM_API_KEY: process.env.ANTHROPIC_API_KEY,
    HINDSIGHT_API_LLM_MODEL: 'claude-sonnet-4-20250514',
  },
  logger: consoleLogger,
});

await server.start();

const client = new HindsightClient({ baseUrl: server.getBaseUrl() });
await client.retain('user-123', '用户更喜欢深色模式。');
const recall = await client.recall('user-123', '用户偏好是什么？');

await server.stop();
```

使用远程 Hindsight API 时，无需创建服务器，直接让 `HindsightClient` 连接远程 URL。

## `HindsightServerOptions` {#hindsightserveroptions}

|选项|类型|默认|说明|
|---|---|---|---|
|`profile`|`string`|`"default"`|配置档案名称，通过每个子命令的 `--profile` 参数传递。|
|`port`|`number`|`8888`|守护进程监听的 TCP 端口。|
|`host`|`string`|`"127.0.0.1"`|守护进程绑定的主机名（用于健康检查）。|
|`embedVersion`|`string`|`"latest"`|底层版本 `hindsight-embed` 包通过 运行 `uvx`。|
|`embedPackagePath`|`string`|—|本地源码检出路径，优先于 `embedVersion`，使用 `uv run --directory` 替代 `uvx`。|
|`env`|`Record<string, string\|undefined>`|`{}`|传递给守护进程的环境变量，**并且**通过 `--env KEY=VALUE` 写入配置档案。这是传入 `HINDSIGHT_API_*` 与 `HINDSIGHT_EMBED_*` 设置的首选方式。|
|`extraProfileCreateArgs`|`string[]`|`[]`|额外参数逐字附加到 `profile create`。|
|`extraDaemonStartArgs`|`string[]`|`[]`|额外参数逐字附加到 `daemon start`。|
|`platformCpuWorkaround`|`boolean`|`true` 开启macOS|自动设置`HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU=1` 和 `HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU=1`避免Metal/MPS崩溃。调用者提供的 `env` 值优先于自动设置的值。|
|`readyTimeoutMs`|`number`|`30000`|最长时间等待`/health`返回200。|
|`readyPollIntervalMs`|`number`|`1000`|等待时的轮询间隔 `/health`。|
|`logger`|`Logger`|沉默|可插拔记录器 (`debug`/`info`/`warn`/`error`）。 `consoleLogger` 和 `silentLogger` 助手已导出。|

## 服务器方法 {#server-methods}

|方法|返回|说明|
|---|---|---|
|`start()`|`Promise<void>`|配置档案、启动守护进程并等待 `/health`。幂等——可以安全地重新运行。|
|`stop()`|`Promise<void>`|停止守护进程。不会抛出异常；失败时记录日志，Promise 仍正常完成。|
|`checkHealth()`|`Promise<boolean>`|执行一次 `/health` 探测，超时为 2 秒。|
|`getBaseUrl()`|`string`|`http://host:port` — 直接将其传递给 `HindsightClient`。|
|`getProfile()`|`string`|该服务器运行的配置文件名称。|

用于记忆操作（记忆存储、记忆召回、反思、记忆库管理）使用 [`@vectorize-io/hindsight-client`](./nodejs.mdx)。
