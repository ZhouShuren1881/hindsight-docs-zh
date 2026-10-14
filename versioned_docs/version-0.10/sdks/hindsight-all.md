---
sidebar_position: 2
---

# 编程 API（Python） {#programmatic-api-python}

`hindsight-all` Python 包让你直接在代码中启动并管理本地 Hindsight 守护进程，无需部署任何服务器基础设施。一次安装就能获得 Hindsight API 服务器、嵌入式 PostgreSQL 和 Python 客户端：执行 `pip install hindsight-all` 后，只需几行 Python 代码，就能启动功能完整的 Hindsight 实例。

守护进程作为**独立的操作系统进程**在 `127.0.0.1` 上运行，而不是运行在 Python 进程的内存中。你的代码通过随包提供的 `HindsightClient`，以 HTTP 与守护进程通信。

如果你已经有正在运行的 Hindsight 服务器，只需要客户端，请改用 [Python 客户端（hindsight-client）](./python.mdx)。

## 工作原理 {#how-it-works}

`hindsight-all` 提供两个主要 API：

- **`HindsightServer`**：显式管理生命周期。需要明确控制启动和关闭时机时（例如在测试中），将它作为上下文管理器使用。
- **`HindsightEmbedded`**：自动管理生命周期。首次使用时启动守护进程，并在后续调用中复用。对于不想操心生命周期管理的应用代码，这是最简单的选择。

两者最终都通过相同的 `HindsightClient` HTTP 接口与同一个底层守护进程通信，区别仅在于如何管理服务器进程。

## 安装 {#installation}

```bash
pip install hindsight-all
```

`hindsight-all` 的 wheel 包将 `hindsight-api-slim`、`hindsight-client` 和 `hindsight-embed` 列为依赖，因此执行一次 `pip install` 就能装齐所有组件。

如果使用 Intel（x86_64）Mac，请改为安装 `hindsight-all-slim`，因为完整包中的本地机器学习模型没有适用于 Intel Mac 的 wheel 包。参见[支持的平台](../developer/installation#supported-platforms)。

## `HindsightServer`：显式管理生命周期 {#hindsightserver--explicit-lifecycle}

如果希望服务器立即启动、在代码块执行期间持续运行，并在代码块结束后妥善关闭，请将 `HindsightServer` 作为上下文管理器使用。这种方式非常适合测试和运行时间较短的脚本。

```python
import os
from hindsight import HindsightServer, HindsightClient

with HindsightServer(
    llm_provider="openai",
    llm_model="gpt-4o-mini",
    llm_api_key=os.environ["OPENAI_API_KEY"],
) as server:
    client = HindsightClient(base_url=server.url)

    client.retain(bank_id="my-bank", content="Alice works at Google")
    results = client.recall(bank_id="my-bank", query="What does Alice do?")
    for r in results:
        print(r.text)

    answer = client.reflect(bank_id="my-bank", query="Tell me about Alice")
    print(answer.text)
# 服务器在此处停止
```

## `HindsightEmbedded`：自动管理生命周期 {#hindsightembedded--auto-managed}

`HindsightEmbedded` 是在 Python 中使用 Hindsight 最简单的方式。它会自动管理一个后台守护进程：首次使用时启动，并在各次调用之间持续运行。

```python
from hindsight import HindsightEmbedded
import os

# 首次调用时自动启动服务器
client = HindsightEmbedded(
    profile="myapp",                        # 用于数据隔离的配置档案
    llm_provider="openai",
    llm_model="gpt-4o-mini",
    llm_api_key=os.environ["OPENAI_API_KEY"],
)

# 可立即使用，无需手动管理服务器
client.retain(bank_id="my-bank", content="Alice works at Google")
results = client.recall(bank_id="my-bank", query="What does Alice do?")

# 服务器会继续运行（可用 `hindsight-embed daemon stop` 停止）
# 也可以显式停止：
client.close(stop_daemon=True)
```

### 什么是配置档案（profile）？ {#whats-a-profile}

一个配置档案对应一个隔离的 Hindsight 环境。每个配置档案都有自己的嵌入式 PostgreSQL 数据库（存储在 `~/.pg0/instances/hindsight-embed-{profile}/`）和 API 服务器。可以使用不同的配置档案来隔离环境（开发/生产）、应用或用户。

### 如何选择 {#when-to-use-which}

| 使用场景 | 选择 |
|---|---|
| 测试、运行时间较短的脚本，需要明确控制启动和关闭时机 | `HindsightServer`（上下文管理器） |
| 长期运行的应用，希望首次使用时自动启动，不想管理生命周期 | `HindsightEmbedded` |
| 已有在其他位置运行的 Hindsight 服务器 | 直接使用 [`hindsight-client`](./python.mdx) |

## API 命名空间 {#api-namespaces}

`HindsightEmbedded` 和 `HindsightClient` 都提供按功能组织的 API 命名空间，用于管理记忆库、心智模型、强制指令和记忆：

```python
from hindsight import HindsightEmbedded
import os

embedded = HindsightEmbedded(
    profile="myapp",
    llm_provider="openai",
    llm_api_key=os.environ["OPENAI_API_KEY"],
)

# 核心操作
embedded.retain(bank_id="test", content="Hello")
results = embedded.recall(bank_id="test", query="Hello")

# 记忆库管理
embedded.banks.create(bank_id="test", name="Test Bank", mission="Help users")
embedded.banks.set_mission(bank_id="test", mission="Updated mission")
embedded.banks.delete(bank_id="test")

# 心智模型
embedded.mental_models.create(
    bank_id="test",
    name="User Preferences",
    content="User prefers dark mode"
)
models = embedded.mental_models.list(bank_id="test")

# 强制指令
embedded.directives.create(
    bank_id="test",
    name="Response Style",
    content="Be concise and friendly"
)
directives = embedded.directives.list(bank_id="test")

# 列出记忆
memories = embedded.memories.list(bank_id="test", type="world", limit=50)
```

API 命名空间会在每次调用前确保守护进程正在运行，因此能够妥善处理守护进程崩溃的情况：

```python
# ✅ 推荐：使用 API 命名空间（会处理守护进程重启）
embedded.banks.create(bank_id="test", name="Test")

# ❌ 不推荐：直接访问客户端（不会处理守护进程崩溃）
client = embedded.client
client.create_bank(bank_id="test", name="Test")  # 守护进程崩溃后，此调用会失败
```

有关 Retain（存入）、Recall（召回）、Reflect（反思）方法及其选项的完整参考，请参阅 [Python 客户端页面](./python.mdx)。无论以哪种方式获取客户端，这些方法的用法都相同。
