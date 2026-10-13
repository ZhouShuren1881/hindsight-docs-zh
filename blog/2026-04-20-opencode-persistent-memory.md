---
title: "您的OpenCode智能体会忘记会话之间的一切。这是修复方法。"
authors: [DK09876]
date: 2026-04-20
tags: [opencode, memory, integrations, typescript, tutorial]
description: "OpenCode 会话默认是无状态的。 @vectorize-io/opencode-hindsight 插件通过自动挂钩和三个显式工具添加持久记忆。"
image: /img/blog/opencode-persistent-memory.webp
hide_table_of_contents: true
---

![您的OpenCode智能体会忘记会话之间的一切。这是修复方法。](/img/blog/opencode-persistent-memory.webp)

​​OpenCode 为您提供快速、终端原生的 AI 编码智能体。但每次会议一开始都是冷淡的——不记得你昨天构建了什么，你遵循什么惯例，或者你已经做了什么决定。以下是如何使用一个插件为其提供持久的长期记忆。

<!-- truncate -->

## 概览 {#tldr}

- OpenCode 会话是无状态的——每个对话都从头开始
- `@vectorize-io/opencode-hindsight` 通过三种工具（记忆存储、记忆召回、反思）和自动挂钩添加持久记忆
- 在会话开始时，记忆会被注入系统提示符中，因此智能体在您说任何话之前都有上下文
- 空闲时自动捕获对话，并且记忆在上下文窗口压缩中幸存下来
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)（零设置）或自托管一起使用

---

## 问题：会话之间没有持久的记忆 {#the-problem-no-persistent-memory-between-sessions}

OpenCode是一个强大的基于终端的编码智能体。您可以安装插件、连接提供商并完成实际工作。但每个会话都是孤立的。智能体没有任何机制来记住之前会话中发生的事情。

要求你的智能体使用特定的测试框架。确实如此。下一次会议，它不记得了。解释您的项目架构、部署过程和命名约定。会议结束后一切都消失了。

对于快速的一次性任务，这很好。对于连续性很重要的正在进行的项目工作来说，这是一个真正的限制。

---

## 方法 {#the-approach}

[Hindsight](https://github.com/vectorize-io/hindsight)是AI智能体的记忆层。它从对话中提取事实，在查询时从语义上检索它们，并可以从积累的上下文中合成合理的答案。

`@vectorize-io/opencode-hindsight`插件将Hindsight直接集成到OpenCode的插件系统中。它以两种模式工作：

**自动** — 钩子处理幕后的所有事情：
- 会话开始时调用相关记忆（注入系统提示符中）
- 会话空闲时保留对话
- 通过上下文窗口压缩保留记忆

**明确** — 智能体可以直接调用的三个工具：
- `hindsight_retain` — 存储特定事实或决定
- `hindsight_recall` — 在记忆中搜索相关上下文
- `hindsight_reflect` — 从积累的记忆中合成一个合理的答案

```
Session start
    │
    ▼
┌─────────────────────────────────────┐
│  System prompt                      │
│  + recalled memories (automatic)    │
├─────────────────────────────────────┤
│  OpenCode Agent                     │
│  ├── hindsight_retain  (explicit)   │
│  ├── hindsight_recall  (explicit)   │
│  └── hindsight_reflect (explicit)   │
└─────────────────────────────────────┘
        │                   ▲
      retain              recall
        │                   │
        ▼                   │
  ┌───────────────────────────────┐
  │        Hindsight bank         │
  └───────────────────────────────┘
```

自动挂钩可以处理大多数用例。当智能体（或您）需要细粒度控制时，可以使用显式工具。

---

## 设置 {#setup}

### 1。安装插件 {#1-install-the-plugin}

```bash
npm install @vectorize-io/opencode-hindsight
```

### 2。在 opencode.json 中注册 {#2-register-in-opencodejson}

```json
{
  "plugin": ["@vectorize-io/opencode-hindsight"]
}
```

### 3。指向Hindsight服务器 {#3-point-at-a-hindsight-server}

**选项A：Hindsight Cloud**（零设置）

在[Hindsight Cloud](https://ui.hindsight.vectorize.io)注册，生成API令牌，并设置两个环境变量：

```bash
export HINDSIGHT_API_URL="https://api.hindsight.vectorize.io"
export HINDSIGHT_API_TOKEN="hsk_your_token"
```

**选项 B：自托管**

在本地或您自己的基础设施上运行Hindsight。请参阅[安装指南](/developer/installation)开始：

```bash
uvx hindsight-server
export HINDSIGHT_API_URL="http://localhost:8888"
```

### 4。开始OpenCode {#4-start-opencode}

```bash
opencode
```

插件自动激活。在您的第一个会话中，它连接到Hindsight并开始捕获上下文。

---

## 幕后发生了什么 {#what-happens-under-the-hood}

以下是插件处于活动状态的会话的生命周期：

1. **会议开始** — `session.created` 事件触发，标记此会话为记忆注入
2. **第一次LLM通话** — 系统转换钩子运行记忆召回查询（“项目上下文和最近的工作”）并将匹配的记忆注入系统提示符中
3. **会议期间** — 智能体可以根据需要显式调用 `hindsight_retain`、`hindsight_recall` 或 `hindsight_reflect`
4. **会话空闲** — `session.idle` 事件触发对话记录的自动记忆存储
5. **上下文压缩** — 如果上下文窗口填满，插件将保留当前对话并将召回的记忆注入压缩上下文中，因此不会丢失任何重要内容

自动记忆存储使用由`retainEveryNTurns`控制的滑动窗口（默认值：3）。这可以防止冗余存储，同时保持最新的上下文。

---

## 配置 {#configuration}

您可以在三个级别配置插件（稍后获胜）：

1. **配置文件** — `~/.hindsight/opencode.json` 用于用户范围默认值
2. **插件选项** — 内联于`opencode.json`，用于项目特定设置
3. **环境变量** — 用于 CI/CD 或每台机器覆盖

### 插件选项示例 {#plugin-options-example}

```json
{
  "plugin": [
    ["@vectorize-io/opencode-hindsight", {
      "hindsightApiUrl": "http://localhost:8888",
      "bankId": "my-project",
      "recallBudget": "high",
      "retainEveryNTurns": 5,
      "bankMission": "您是TypeScript monorepo 的编码助手。重点关注架构决策、测试模式和部署过程。"
    }]
  ]
}
```

### 按键设置 {#key-settings}

|设置|默认|它的作用|
|---|---|---|
|`autoRecall`|`true`|在会话开始时注入记忆|
|`autoRetain`|`true`|空闲时捕获对话|
|`recallBudget`|`mid`|要检索多少记忆：`low`、`mid`、`high`|
|`retainEveryNTurns`|`3`|自动记忆存储频率（用户轮次）|
|`retainMode`|`full-session`|`full-session` 更新整个对话； `last-turn` 创建分块窗口|
|`bankMission`|*（无）*|指导 Hindsight 提取内容及其反映方式|
|`dynamicBankId`|`false`|从项目/智能体上下文中获取记忆库 ID|

完整的环境变量参考位于[集成文档](/sdks/integrations/opencode)。

---

## 使用记忆库 ID 界定记忆范围 {#scoping-memory-with-bank-ids}

默认情况下，所有会话共享一个`opencode`记忆库。对于项目隔离，您有两种选择：

**静态记忆库ID** — 每个项目一个记忆库：

```bash
export HINDSIGHT_BANK_ID="my-project"
```

**动态记忆库ID** — 从上下文自动派生：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
```

动态模式下，记忆库ID由粒度字段组成（默认：`agent::project`）。 `/home/user/my-app` 的项目获得记忆库 ID `opencode::my-app`。

对于多用户设置：

```bash
export HINDSIGHT_DYNAMIC_BANK_ID=true
export HINDSIGHT_CHANNEL_ID="team-backend"
export HINDSIGHT_USER_ID="alice"
```

这为您提供了`opencode::my-app::team-backend::alice` — 每个用户、每个项目、每个通道的完全隔离。更多模式请参见[每用户记忆食谱](/cookbook/recipes/per-user-memory)。

---

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

**记忆反馈循环。** 该插件在保留之前从转录本中剥离 `<hindsight_memories>` 标签，防止循环放大。如果您正在构建将 OpenCode 输出直接输入到 Hindsight 的自定义工具，请注意这一点。

**第一节冷启动。** 新记忆库中的第一个会话没有记忆召回。智能体是从一张白纸开始的。记忆从第二次会议开始积累。要预填充记忆库，请直接使用 [HindsightAPI](/developer/api/quickstart) 或 CLI。

**压实时机。** 压缩钩子保留当前对话并调用相关上下文。如果您的 Hindsight 服务器速度缓慢或无法访问，则压缩会在没有记忆注入的情况下继续进行 - 该插件永远不会阻止智能体。

**上下文窗口预算。** 调用的内存消耗上下文窗口中的令牌。使用`recallBudget: "high"`，您可以获得更多背景信息，但留给对话的空间却更少。对于长时间会话，`mid`（默认）是一个很好的平衡。

---

## 权衡和替代方案 {#tradeoffs-and-alternatives}

**何时不使用此功能：**
- 如果你的课程总是一次性的问题，没有连续性，那么记忆捕获和记忆召回的开销就不值得
- 如果您正在处理敏感代码库，其中对话内容不应离开计算机，请使用自托管 Hindsight 实例

**替代方案：**
- **手动上下文文件** — 在项目根目录中维护 `CONTEXT.md` 或 `CLAUDE.md`。有效，但需要手动维护并且不能跨会话扩展
- **Git 历史记录** — 您的提交消息和 PR 捕获了更改的内容，而不是决定的原因
- **会话导出/重放** — 有些工具可以让您导出会话并重播它们，但您无法将 50 个先前会话注入到上下文窗口中

当您正在进行项目工作时，决策、偏好和背景会在数天或数周内积累，该插件最有价值。

---

## 回顾 {#recap}

- OpenCode 会话默认是无状态的
- Hindsight插件通过自动挂钩（启动记忆召回、空闲记忆存储、通过压缩保存）和显式工具（记忆召回、记忆召回、反思）添加持久记忆
- 配置是分层的：配置文件、插件选项、环境变量
- 记忆通过记忆库 ID 确定范围 - 静态用于简单设置，动态用于多项目/多用户隔离
- 该插件是非阻塞的，如果Hindsight无法访问，它会优雅地降级

---

## 后续步骤 {#next-steps}

- **[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)**— 零配置托管，几秒钟内准备就绪
- 安装插件：`npm install @vectorize-io/opencode-hindsight`
- 阅读 [OpenCode积分参考](/sdks/integrations/opencode) 了解完整配置详细信息
- 如果您喜欢自托管，请尝试[快速入门](/developer/api/quickstart)
- 设置与您的项目重点相匹配的`bankMission` — 它显著改善了提取和回忆的内容
- 探索[食谱](/cookbook)跨智能体框架的记忆模式
