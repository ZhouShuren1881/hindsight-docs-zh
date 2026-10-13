---
title: "指南：使用 Hindsight 为 Strands 添加持久记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, strands, agent-frameworks, memory]
description: "通过原生工具、可选记忆指令及跨会话稳定的按用户记忆库，为 Strands 添加 Hindsight 持久记忆。"
image: /img/guides/guide-strands-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Strands 添加持久记忆](/img/guides/guide-strands-memory-with-hindsight.webp)

如需 **Strands 与 Hindsight 持久记忆**，创建存储、召回和反思工具，可选以 `memory_instructions()` 添加系统提示上下文，跨会话延续，保留熟悉的 SDK 用法。

Strands 已将工具视为普通函数，Hindsight 无需在运行时加入单独记忆守护进程即可接入。

操作时可参考 [Strands 集成文档](/sdks/integrations/strands)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Strands 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 Strands。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

Strands SDK 有明确工具和提示模式，Hindsight 只需两个接入点：显式记忆工具函数、可选自动召回指令，集成接口小且可预测。

## 前提条件 {#prerequisites}

- 可用 Strands 智能体。
- 已安装 Python 和 `hindsight-strands`。
- 同一用户或项目稳定 ID 规则。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-strands
```

## 步骤 2：连接 Strands 与 Hindsight {#step-2-connect-strands-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
from hindsight_strands import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
)
```

本地自托管时换为 `http://localhost:8888`，移除 `api_key`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools, memory_instructions

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

memories = memory_instructions(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = Agent(
    tools=tools,
    system_prompt=f"你是一位乐于助人的助手。

{memories}",
)
```

不需要自动注入时移除 `memory_instructions()`，让智能体按需显式召回。

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

助手通常按用户，同一用户跨无关工作时按项目。指令和工具中保持相同值。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 首次运行存储偏好或工作事实。
2. 同一 ID 再运行。
3. 询问此前事实，确认回答一致。
4. 测试不同 ID，确认隔离符合预期。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 指令来自一个库，工具指向另一库。
- 忘记自动注入可选且须显式添加。
- 需要严格用户分离，却选择共享库。

## 常见问题 {#faq}

### 可以只用工具记忆吗？ {#can-i-use-only-tool-based-memory}

可以，需要智能体决定何时查询时，工具足够。

### 反思比召回多什么？ {#what-does-reflect-add-beyond-recall}

反思从记忆综合生成回答，适合需要结合多条记忆时。

### 应全局还是逐次配置？ {#should-i-configure-globally-or-per-call}

单服务全局方便，不同智能体需不同记忆行为时逐次更安全。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [Agno 持久记忆](/blog/2026/04/09/agno-persistent-memory)。
