---
sidebar_position: 6
---

# 程序化 API（Node.js） {#programmatic-api-nodejs}

`@vectorize-io/hindsight-all` npm 包是 Python [`hindsight-all`](./hindsight-all.md) 包的 Node.js 对应版本。它让 Node 代码能够启动和监管本地 Hindsight 守护进程，无需部署任何服务器基础设施；搭配 [`@vectorize-io/hindsight-client`](./nodejs.mdx) 即可执行记忆操作。

守护进程作为**独立的操作系统进程**运行在 `127.0.0.1` 上，不在 Node 进程内运行。你的代码通过 `HindsightClient`，经由 HTTP 与守护进程通信。

此包**不包含 HTTP 客户端**，仅负责管理服务器进程。守护进程启动后，使用 [`@vectorize-io/hindsight-client`](./nodejs.mdx) 连接 `server.getBaseUrl()` 返回的地址。两个包可以组合使用：一个管理进程，另一个提供 API 接口。

## 工作原理 {#how-it-works}

1. `server.start()` 确定底层的 `hindsight-embed` 命令：通过 `uvx` 使用 PyPI 上的包，或通过 `uv run --directory <path>` 使用本地源码检出目录。
2. 运行 `profile create <name> --merge --port <port> [--env KEY=VALUE ...]`，将 `options.env` 中的每个条目都作为 `--env` 参数传入。
3. 运行 `daemon --profile <name> start`。
4. 轮询 `http://host:port/health`，直到返回 `200`，或耗尽 `readyTimeoutMs` 指定的等待时间。
5. `server.stop()` 运行 `daemon --profile <name> stop`。

服务器封装有意保持透明：守护进程新增环境变量或 CLI 参数时，无需为此发布新版封装包，直接通过 `env`、`extraProfileCreateArgs` 或 `extraDaemonStartArgs` 传入即可。

## 环境要求 {#requirements}

- **Node.js ≥ 22**：使用全局 `fetch` 和 `AbortSignal.timeout`。
- **`uv` / `uvx`** 位于 `PATH` 中：用于下载和运行 Hindsight 守护进程。安装方法见 [docs.astral.sh/uv](https://docs.astral.sh/uv/)。

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
await client.retain('user-123', 'User prefers dark mode.');
const recall = await client.recall('user-123', 'what are the user preferences?');

await server.stop();
```

使用远程 Hindsight API 时，完全无需使用服务器对象，直接让 `HindsightClient` 连接远程 URL 即可。

## `HindsightServerOptions` {#hindsightserveroptions}

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `profile` | `string` | `"default"` | 配置档案名称，通过每个子命令的 `--profile` 参数传入。 |
| `port` | `number` | `8888` | 守护进程监听的 TCP 端口。 |
| `host` | `string` | `"127.0.0.1"` | 守护进程绑定的主机名，也用于健康检查。 |
| `embedVersion` | `string` | `"latest"` | 通过 `uvx` 运行的底层 `hindsight-embed` 包版本。 |
| `embedPackagePath` | `string` | — | 本地源码检出路径，优先于 `embedVersion`。使用 `uv run --directory` 替代 `uvx`。 |
| `env` | `Record<string, string \| undefined>` | `{}` | 传递给守护进程的环境变量，**同时**通过 `--env KEY=VALUE` 写入配置档案。这是传入任何 `HINDSIGHT_API_*` / `HINDSIGHT_EMBED_*` 设置的首选方式。 |
| `extraProfileCreateArgs` | `string[]` | `[]` | 原样追加到 `profile create` 的额外参数。 |
| `extraDaemonStartArgs` | `string[]` | `[]` | 原样追加到 `daemon start` 的额外参数。 |
| `platformCpuWorkaround` | `boolean` | macOS 上为 `true` | 自动设置 `HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU=1` 和 `HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU=1`，以避免 Metal/MPS 崩溃。调用者提供的 `env` 值优先于自动设置的值。 |
| `readyTimeoutMs` | `number` | `30000` | 等待 `/health` 返回 200 的最长时间。 |
| `readyPollIntervalMs` | `number` | `1000` | 等待 `/health` 时的轮询间隔。 |
| `logger` | `Logger` | 静默 | 可插拔的日志记录器（`debug`/`info`/`warn`/`error`）。包中导出了 `consoleLogger` 和 `silentLogger` 辅助工具。 |

## 服务器方法 {#server-methods}

| 方法 | 返回值 | 说明 |
|---|---|---|
| `start()` | `Promise<void>` | 设置配置档案，启动守护进程，并等待 `/health` 就绪。此方法具有幂等性，可以安全地重复运行。 |
| `stop()` | `Promise<void>` | 停止守护进程。绝不抛出异常；即使失败，也会记录日志并让 Promise 正常完成。 |
| `checkHealth()` | `Promise<boolean>` | 执行一次 `/health` 探测，超时时间为 2 秒。 |
| `getBaseUrl()` | `string` | 返回 `http://host:port`，可直接传给 `HindsightClient`。 |
| `getProfile()` | `string` | 此服务器所使用的配置档案名称。 |

记忆操作（Retain（存入）、Recall（召回）、Reflect（反思）和记忆库管理）请使用 [`@vectorize-io/hindsight-client`](./nodejs.mdx)。
