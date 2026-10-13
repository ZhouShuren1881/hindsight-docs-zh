---
sidebar_position: 2
---

# 程序化API (Python) {#programmatic-api-python}

`hindsight-all` Python 软件包让你的代码启动并管理本地 Hindsight 守护进程，无需部署服务器基础设施。一次安装即可获得 Hindsight API 服务器、嵌入式 PostgreSQL 与 Python 客户端。运行 `pip install hindsight-all` 后，只需几行 Python 代码即可启动功能完整的 Hindsight 实例。

守护进程以**独立的操作系统进程**运行，监听 `127.0.0.1`，不在 Python 进程的内存中。你的代码通过捆绑的 `HindsightClient` 使用 HTTP 与它通信。

如果已有运行中的 Hindsight 服务器，只需要客户端，请使用 [Python 客户端（hindsight-client）](./python.mdx)。

## 工作原理 {#how-it-works}

`hindsight-all`公开两个主要API：

- **`HindsightServer`** — 显式生命周期。需要确定性的启动与关闭行为时（例如测试中），将它作为上下文管理器使用。
- **`HindsightEmbedded`** — 自动管理。首次使用时启动守护程序并在调用之间重用它。对于不想考虑生命周期的应用程序代码来说最简单。

两者都通过相同的 `HindsightClient` HTTP 接口与同一个底层守护进程通信，区别仅在于服务器进程的管理方式。

## 安装 {#installation}

```bash
pip install hindsight-all
```

`hindsight-all` 将 `hindsight-api-slim`、`hindsight-client` 和 `hindsight-embed` 作为依赖项，一次 `pip install` 即可安装全部组件。

Intel（x86_64）Mac 请安装 `hindsight-all-slim`，因为完整软件包中的本地机器学习模型没有适用于 Intel Mac 的 wheel 安装包。参见[支持的平台](../developer/installation#supported-platforms)。

## `HindsightServer`：显式生命周期 {#hindsightserver--explicit-lifecycle}

如果希望服务器立即启动，在代码块执行期间运行，并在结束后正常关闭，请将 `HindsightServer` 作为上下文管理器使用。这适合测试与短期脚本。

```python
import os
from hindsight import HindsightServer, HindsightClient

with HindsightServer(
    llm_provider="openai",
    llm_model="gpt-4o-mini",
    llm_api_key=os.environ["OPENAI_API_KEY"],
) as server:
    client = HindsightClient(base_url=server.url)

    client.retain(bank_id="my-bank", content="爱丽丝在Google工作")
    results = client.recall(bank_id="my-bank", query="爱丽丝做什么？")
    for r in results:
        print(r.text)

    answer = client.reflect(bank_id="my-bank", query="告诉我关于爱丽丝的事")
    print(answer.text)
#服务器在此停止
```

## `HindsightEmbedded` — 自动管理 {#hindsightembedded--auto-managed}

`HindsightEmbedded` 是在 Python 中使用 Hindsight 的最简单方式。它自动管理后台守护进程，首次使用时启动，并在各次调用之间保持运行。

```python
from hindsight import HindsightEmbedded
import os

#服务器在第一次调用时自动启动
client = HindsightEmbedded(
    profile="myapp",                        #数据隔离配置文件
    llm_provider="openai",
    llm_model="gpt-4o-mini",
    llm_api_key=os.environ["OPENAI_API_KEY"],
)

#立即使用 - 无需手动服务器管理
client.retain(bank_id="my-bank", content="爱丽丝在Google工作")
results = client.recall(bank_id="my-bank", query="爱丽丝做什么？")

# 服务器继续运行，可使用 hindsight-embed daemon stop 停止
#或者明确停止它：
client.close(stop_daemon=True)
```

### 什么是配置档案？ {#whats-a-profile}

配置档案是一个隔离的 Hindsight 环境。每个档案拥有自己的嵌入式 PostgreSQL 数据库（存储在 `~/.pg0/instances/hindsight-embed-{profile}/`）与 API 服务器。使用不同档案来隔离环境（dev/prod）、应用或用户。

### 何时使用哪个 {#when-to-use-which}

|用例|选择|
|---|---|
|测试、短期脚本、确定性的启动与关闭|`HindsightServer`（上下文管理器）|
|长时间运行的应用程序，首次使用时自动启动，不想管理生命周期|`HindsightEmbedded`|
|现有 Hindsight 服务器在其他地方运行|[`hindsight-client`](./python.mdx)|

## API命名空间 {#api-namespaces}

`HindsightEmbedded` 与 `HindsightClient` 均提供组织清晰的 API 命名空间，用于管理记忆库、心智模型、指令与记忆：

```python
from hindsight import HindsightEmbedded
import os

embedded = HindsightEmbedded(
    profile="myapp",
    llm_provider="openai",
    llm_api_key=os.environ["OPENAI_API_KEY"],
)

# 核心操作
embedded.retain(bank_id="test", content="你好")
results = embedded.recall(bank_id="test", query="你好")

#记忆库管理
embedded.banks.create(bank_id="test", name="测试记忆库", mission="帮助用户")
embedded.banks.set_mission(bank_id="test", mission="更新任务")
embedded.banks.delete(bank_id="test")

#心智模型
embedded.mental_models.create(
    bank_id="test",
    name="用户偏好",
    content="用户更喜欢深色模式"
)
models = embedded.mental_models.list(bank_id="test")

# 指令
embedded.directives.create(
    bank_id="test",
    name="响应风格",
    content="简洁、友好"
)
directives = embedded.directives.list(bank_id="test")

# 列出记忆
memories = embedded.memories.list(bank_id="test", type="world", limit=50)
```

API 命名空间确保守护进程在每次调用之前运行，因此守护进程崩溃可以得到妥善处理：

```python
#✅ 好 - 使用 API 命名空间（已处理守护进程重启）
embedded.banks.create(bank_id="test", name="测试")

#❌ 不好 - 直接客户端访问（未处理守护进程崩溃）
client = embedded.client
client.create_bank(bank_id="test", name="测试")  #如果守护进程崩溃则失败
```

有关记忆存储、记忆召回、反思方法及其选项的完整说明（无论如何获取客户端，用法均相同），请参阅 [Python 客户端文档](./python.mdx)。
