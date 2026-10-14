---
title: "OpenCode 智能体会忘记会话之间的一切：解决方法在这里"
authors: [DK09876]
date: 2026-04-20
tags: [opencode, memory, integrations, typescript, tutorial]
description: "OpenCode 会话默认是无状态的。@vectorize-io/opencode-hindsight 插件通过自动钩子和三个显式工具添加持久记忆。"
image: /img/blog/opencode-persistent-memory.webp
hide_table_of_contents: true
---

![OpenCode 智能体会忘记会话之间的一切：解决方法在这里](/img/blog/opencode-persistent-memory.webp)

OpenCode 为你提供快速、原生终端的 AI 编程智能体。但每次会话开始时，它都像刚启动一样：不记得你昨天构建了什么、遵循哪些约定，也不记得你已经做过哪些决定。下面介绍如何通过一个插件为它添加持久的长期记忆。

<!-- truncate -->

## 简要概览 {#tldr}

- OpenCode 会话默认是无状态的，每次对话都从头开始
- `@vectorize-io/opencode-hindsight` 通过三个工具（Retain（存入）、Recall（召回）、Reflect（反思））和自动钩子添加持久记忆
- 会话开始时，记忆会注入系统提示词，因此你还没开口，智能体就已经获得上下文
- 会话空闲时，对话会自动存入；上下文窗口压缩后，记忆也会保留下来
- 可搭配 [Hindsight Cloud](https://ui.hindsight.vectorize.io)（无需配置）或自托管实例使用

---

## 问题：会话之间没有持久记忆 {#the-problem-no-persistent-memory-between-sessions}

OpenCode 是一款强大的终端编程智能体。你可以安装插件、接入服务提供方并完成实际工作。但每个会话彼此隔离，智能体没有机制记住之前会话中发生的事情。

让智能体使用特定的测试框架，它会照做。到了下一次会话，它却不记得了。你解释项目架构、部署流程和命名约定；会话一结束，这些信息就全都消失了。

对于快速的一次性任务，这没有问题。但对于需要保持连续性的项目工作，这确实是个限制。

---

## 解决思路 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight) 是面向 AI 智能体的记忆层。它会从对话中提取事实，在收到查询时通过语义检索这些事实，并能根据累积的上下文综合生成有依据的答案。

`@vectorize-io/opencode-hindsight` 插件将 Hindsight 直接集成到 OpenCode 的插件系统中。它有两种工作模式：

**自动模式** — 钩子会在后台处理所有事情：
- 会话开始时召回相关记忆，并将其注入系统提示词
- 会话空闲时存入对话
- 在上下文窗口压缩期间保留记忆

**显式模式** — 智能体可以直接调用以下三个工具：
- `hindsight_retain` — 存入特定事实或决定
- `hindsight_recall` — 搜索记忆，查找相关上下文
- `hindsight_reflect` — 根据累积的记忆综合生成有依据的答案

```
会话开始
    │
    ▼
┌─────────────────────────────────────┐
│  系统提示词                          │
│  + 已召回的记忆（自动注入）          │
├─────────────────────────────────────┤
│  OpenCode 智能体                     │
│  ├── hindsight_retain  （显式调用）  │
│  ├── hindsight_recall  （显式调用）  │
│  └── hindsight_reflect （显式调用）  │
└─────────────────────────────────────┘
        │                   ▲
      存入                召回
        │                   │
        ▼                   │
  ┌───────────────────────────────┐
  │          Hindsight 记忆库      │
  └───────────────────────────────┘
```

自动钩子可以满足大多数使用场景。智能体（或你）需要精细控制时，可以调用显式工具。

---

## 设置 {#setup}

### 1. 安装插件 {#1-install-the-plugin}

```bash
npm install @vectorize-io/opencode-hindsight
```

### 2. 在 opencode.json 中注册 {#2-register-in-opencodejson}

```json
{
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

### 3. 指定 Hindsight 服务器 {#3-point-at-a-hindsight-server}

**选项 A：Hindsight Cloud**（无需设置）

注册 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 账号并生成 API 令牌，然后设置两个环境变量：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="hsk_your_token"
```

**选项 B：自托管**

在本地或自己的基础设施上运行 Hindsight。请参阅[安装指南](/developer/installation)开始使用：

```bash
uvx hindsight-server
export HINDSIGHT_API_URL="http://localhost:8888"
```

### 4. 启动 OpenCode {#4-start-opencode}

```bash
opencode
```

插件会自动激活。首次启动会话时，它会连接到 Hindsight 并开始捕获上下文。

---

## 插件在后台的工作流程 {#what-happens-under-the-hood}

以下是插件启用后一个会话的生命周期：

1. **会话开始** — `session.created` 事件触发，将此会话标记为需要注入记忆
2. **首次调用 LLM** — 系统转换钩子运行一次记忆召回查询（“project context and recent work”），并将匹配的记忆注入系统提示词
3. **会话进行中** — 智能体可按需显式调用 `hindsight_retain`、`hindsight_recall` 或 `hindsight_reflect`
4. **会话空闲** — `session.idle` 事件触发，将对话转录自动存入记忆
5. **上下文压缩** — 如果上下文窗口已满，插件会存入当前对话，并将召回的记忆注入压缩后的上下文，因此重要内容不会丢失

自动存入采用由 `retainEveryNTurns` 控制的滑动窗口（默认值：3）。这样既能避免重复存储，也能让近期上下文保持最新。

---

## 配置 {#configuration}

你可以通过三个层级配置插件（后面的配置优先）：

1. **配置文件** — `~/.hindsight/opencode.json`，用于设置用户级默认值
2. **插件选项** — 在 `opencode.json` 中内联配置，用于设置项目专属选项
3. **环境变量** — 用于 CI/CD 或针对单台机器的覆盖设置

### 插件选项示例 {#plugin-options-example}

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "bankId": "my-project",
      "recallBudget": "high",
      "retainEveryNTurns": 5,
      "bankMission": "You are a coding assistant for a TypeScript monorepo. Focus on architecture decisions, test patterns, and deployment procedures."
    }]
  ]
}
```

### 关键设置 {#key-settings}

| 设置 | 默认值 | 作用 |
|---|---|---|
| `autoRecall` | `true` | 在会话开始时注入记忆 |
| `autoRetain` | `true` | 会话空闲时捕获对话 |
| `recallBudget` | `mid` | 检索记忆的数量：`low`、`mid`、`high` |
| `retainEveryNTurns` | `3` | 自动存入的频率（按用户轮次计） |
| `retainMode` | `full-session` | `full-session` 会插入或更新整个对话；`last-turn` 会创建分块窗口 |
| `bankMission` | *（无）* | 指导 Hindsight 提取哪些内容，以及如何基于记忆推理 |
| `dynamicBankId` | `false` | 根据项目/智能体上下文派生记忆库 ID |

完整的环境变量参考见[集成文档](/sdks/integrations/opencode)。

---

## 使用记忆库 ID 界定记忆范围 {#scoping-memory-with-bank-ids}

默认情况下，所有会话共用一个 `opencode` 记忆库。若要隔离不同项目，可以选择以下两种方式：

**静态记忆库 ID** — 每个项目使用一个记忆库：

```bash
export HINDSIGHT_BANK_ID="my-project"
```

**动态记忆库 ID** — 根据上下文自动派生：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

在动态模式下，记忆库 ID 由粒度字段组合而成（默认值：`agent::project`）。路径为 `/home/user/my-app` 的项目会获得记忆库 ID `opencode::my-app`。

多用户配置示例：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
export HINDSIGHT_CHANNEL_ID="team-backend"
export HINDSIGHT_USER_ID="alice"
```

这样会生成 `opencode::my-app::team-backend::alice`，从而按用户、项目和频道实现完全隔离。更多模式请参阅[按用户划分记忆的食谱](/cookbook/recipes/per-user-memory)。

---

## 注意事项与边缘情况 {#pitfalls-and-edge-cases}

**记忆反馈循环。** 插件会在存入之前从转录中移除 `<hindsight_memories>` 标签，防止内容循环放大。如果你正在构建会将 OpenCode 输出直接输入 Hindsight 的自定义工具，请留意这一点。

**首次会话冷启动。** 新记忆库中的首个会话没有记忆可供召回，智能体会从空白状态开始。从第二个会话起，记忆才会逐步累积。若要预先填充记忆库，可直接使用 [Hindsight API](/developer/api/quickstart) 或 CLI。

**压缩时机。** 压缩钩子会存入当前对话并召回相关上下文。如果 Hindsight 服务器响应缓慢或无法访问，压缩仍会继续，只是不注入记忆；插件绝不会阻塞智能体。

**上下文窗口预算。** 被召回的记忆会占用上下文窗口中的 token。使用 `recallBudget: "high"` 可以获得更多上下文，但留给对话的空间会更少。对于较长的会话，`mid`（默认值）是较好的平衡点。

---

## 权衡与替代方案 {#tradeoffs-and-alternatives}

**不适用的场景：**
- 如果会话总是没有连续性的一次性问答，那么捕获和召回记忆的开销并不值得
- 如果你处理的是不应让对话内容离开本机的敏感代码库，请使用自托管的 Hindsight 实例

**替代方案：**
- **手动维护上下文文件** — 在项目根目录维护 `CONTEXT.md` 或 `CLAUDE.md`。这种方式可行，但需要手动维护，也无法扩展到多个会话
- **Git 历史** — 提交消息和 PR 能记录改了什么，却没有记录做出决定的原因
- **会话导出/重放** — 有些工具支持导出并重放会话，但你无法把此前 50 个会话都注入上下文窗口

如果你持续推进某个项目，决策、偏好和上下文会在数天或数周内不断累积，那么这个插件就最有价值。

---

## 回顾 {#recap}

- OpenCode 会话默认是无状态的
- Hindsight 插件通过自动钩子（启动时召回、空闲时存入、在压缩期间保留记忆）和显式工具（存入、召回、反思）添加持久记忆
- 配置分为多个层级：配置文件、插件选项、环境变量
- 记忆通过记忆库 ID 界定范围：简单场景可使用静态 ID，多项目/多用户隔离可使用动态 ID
- 插件不会阻塞智能体；Hindsight 无法访问时，插件也会平稳降级

---

## 后续步骤 {#next-steps}

- **[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)** — 无需配置托管，几秒钟即可就绪
- 安装插件：`npm install @vectorize-io/opencode-hindsight`
- 阅读 [OpenCode 集成参考](/sdks/integrations/opencode)，了解完整配置详情
- 如果你更倾向自托管，可以尝试[快速入门](/developer/api/quickstart)
- 设置与项目重点相符的 `bankMission`，这会显著改善提取和召回的内容
- 浏览[食谱](/cookbook)，了解适用于不同智能体框架的记忆模式
