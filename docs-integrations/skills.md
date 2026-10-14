---
sidebar_position: 3
title: "Hindsight 智能体记忆技能 | AI 编码助手集成"
description: "借助 Hindsight 智能体技能，让 Claude Code 和 Codex 等 AI 编码助手在不同会话间保留长期记忆。该技能是一种可重复使用的提示模板，用于保留长期上下文。"
---

# 技能 {#skills}

Hindsight 提供智能体技能，让 AI 编码助手在不同会话间保留记忆。技能是可重复使用的提示模板，智能体可以按需加载，以获得特定能力。

## 支持的平台 {#supported-platforms}

| 平台 | 技能目录 |
|----------|-----------------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `~/.claude/skills/` |
| [OpenCode](https://github.com/opencode-ai/opencode) | `~/.opencode/skills/` |
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/skills/` |

## 部署模式 {#deployment-modes}

该技能支持两种部署模式：

| 模式 | 适用场景 | 数据位置 |
|------|----------|---------------|
| **本地** | 个人开发者 | 您的计算机（`~/.pg0/`） |
| **云端** | 需要共享知识的团队 | Hindsight Cloud |

## 快速安装 {#quick-install}

### 选项 1：交互式安装程序（推荐） {#option-1-interactive-installer-recommended}

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash
```

安装程序会：
1. 提示您选择 AI 编码助手
2. 让您选择部署模式（本地或云端）
3. 配置相应设置
4. 将技能安装到相应目录

### 为指定平台安装 {#install-for-a-specific-platform}

```bash
# Claude Code（交互式选择模式）
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude

# OpenCode
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app opencode

# Codex CLI
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app codex
```

### 以云端模式安装 {#install-with-cloud-mode}

```bash
# 直接配置云端模式（跳过模式选择提示）
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude --mode cloud
```

### 选项 2：使用 add-skill {#option-2-using-add-skill}

如果您使用 [add-skill](https://add-skill.org/) 管理智能体技能：

```bash
# 本地模式（个人开发者）
npx add-skill vectorize-io/hindsight --skill hindsight-local

# Hindsight Cloud（团队）
npx add-skill vectorize-io/hindsight --skill hindsight-cloud

# 自托管的 Hindsight 服务器
npx add-skill vectorize-io/hindsight --skill hindsight-self-hosted
```

首次使用时，AI 会引导您完成后续设置：
- **本地**：运行 `uvx hindsight-embed configure`，配置 LLM 提供商
- **云端**：提供 API 密钥和记忆库 ID
- **自托管**：提供服务器 URL、API 密钥和记忆库 ID

## 技能提供的能力 {#what-the-skill-provides}

安装后，您的 AI 助手将能够：

- **Retain（存入）** - 存储用户偏好、经验教训和流程执行结果
- **Recall（召回）** - 在开始任务前检索相关上下文
- **Reflect（反思）** - 综合记忆，生成结合上下文的回答

该技能使用 `hindsight-embed` CLI；它会运行一个带嵌入式数据库的轻量级本地守护进程。

## 技能的工作方式 {#how-skills-work}

技能由模型调用：AI 助手会根据对话上下文自动判断何时使用技能。您无需明确触发技能。

助手会：
- 在您分享偏好、任务成功或失败，或出现经验教训时**存入记忆**
- 在开始较复杂的任务前**召回记忆**，获取相关上下文

### 存储哪些内容 {#what-gets-stored}

该技能针对以下内容进行了优化：

| 类别 | 示例 |
|----------|----------|
| **用户偏好** | 编码风格、工具偏好、语言选择 |
| **流程结果** | 成功执行的命令、解决问题的配置 |
| **经验教训** | Bug 修复方案、变通办法、架构决策 |

## 架构 {#architecture}

### 本地模式 {#local-mode}

```
AI 编码助手
    │
    ▼
Hindsight 技能（SKILL.md）
    │
    ▼
hindsight-embed CLI
    │
    ▼
本地守护进程（自动启动）
    │
    ▼
嵌入式 PostgreSQL（~/.pg0/hindsight-embed/）
```

所有数据都保留在您的计算机上。守护进程会在需要时自动启动，并在闲置一段时间后关闭。

### 云端模式 {#cloud-mode}

```
AI 编码助手
    │
    ▼
Hindsight 技能（SKILL.md）
    │
    ▼
hindsight-cli
    │
    ▼
Hindsight Cloud API (https://api.hindsight.vectorize.io)
    │
    ▼
共享记忆库（团队可访问）
```

数据存储在 Hindsight Cloud 中，并在团队内共享。所有使用相同记忆库 ID 的团队成员都可以访问共享记忆。

---

## 本地模式设置 {#local-mode-setup}

该技能使用保存在 `~/.hindsight/config.env` 中的配置。您可以随时重新配置：

```bash
uvx hindsight-embed configure
```

---

## 云端模式设置 {#cloud-mode-setup}

云端模式会连接到 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，让团队共享有关代码库的记忆。一位团队成员学到的信息，其他人也能受益。

### 前置条件 {#prerequisites}

1. 一个 Hindsight Cloud 账户（[注册](https://ui.hindsight.vectorize.io)）
2. 团队管理员提供的 API 密钥
3. 项目对应的记忆库 ID（例如 `team-acme-frontend`）

### 安装 {#installation}

使用云端模式运行安装程序：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --mode cloud
```

安装程序会提示您填写：

| 设置 | 说明 | 示例 |
|---------|-------------|---------|
| **Cloud API URL** | Hindsight Cloud 端点 | `https://api.hindsight.vectorize.io` |
| **API Key** | 用于身份验证的密钥 | `hs_xxx...` |
| **Bank ID** | 团队共享的记忆库 | `team-acme-frontend` |

### 配置文件 {#configuration-files}

云端模式会创建两个文件：

**`~/.hindsight/config`** — API 连接设置（TOML 格式）：
```toml
api_url = "https://api.hindsight.vectorize.io"
api_key = "hs_xxx..."
```

**`~/.claude/skills/hindsight/SKILL.md`** — 技能定义文件，其中已写入您的记忆库 ID。

### 团队设置 {#team-setup}

为团队设置云端模式：

1. **团队管理员**在 Hindsight Cloud 中创建记忆库（例如 `team-acme-frontend`）
2. **团队管理员**为每位团队成员生成 API 密钥
3. **每位开发者**使用自己的 API 密钥和共享记忆库 ID 运行安装程序
4. 此后，所有团队成员都可以使用同一个记忆库

### 团队记忆库中适合存储的内容 {#what-to-store-in-team-banks}

云端模式使用**团队共享记忆库**。请谨慎选择要存入的内容：

| 类型 | 示例 | 存储方式 |
|------|----------|--------------|
| **项目约定** | 代码检查规则、测试要求、Node 版本 | `"Project uses ESLint with Airbnb config"` |
| **团队知识** | 架构决策、常见问题、领域逻辑 | `"Auth module requires Redis 7+"` |
| **个人偏好** | 个人编码风格、沟通偏好 | `"Alice prefers verbose commit messages"` |

**关键区别**：项目约定适用于所有人。个人偏好应注明所属人员的姓名，让 AI 知道何时应用这些偏好。

### 工作流程示例 {#example-workflow}

```
第 1 天：Alice 发现一项要求
─────────────────────────────────────
Alice 的 AI 助手存入：
  "The auth module requires Redis 7+ due to HEXPIRE command usage"
  "Alice prefers explicit error handling over silent failures"

第 2 天：Bob 开始处理身份验证模块
─────────────────────────────────
Bob 的 AI 助手召回：
  "The auth module requires Redis 7+ due to HEXPIRE command usage"

Bob 避开了 Alice 遇到的同一个问题！
(Alice 的个人偏好也已存入，但不会应用到 Bob 身上)
```

### 测试云端连接 {#testing-cloud-connection}

安装后，验证连接：

```bash
# 存入一条测试记忆
hindsight memory retain team-acme-frontend "Alice works at Google as a software engineer"

# 召回这条记忆
hindsight memory recall team-acme-frontend "Alice"
```

### 在不同记忆库之间切换 {#switching-between-banks}

如果您同时参与多个项目，可以为每个 AI 助手安装不同的技能，也可以手动切换记忆库：

```bash
# 临时覆盖环境变量
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io \
HINDSIGHT_API_KEY=hs_xxx \
hindsight memory recall different-bank "query"
```

如需长期使用多个记忆库，请使用不同的记忆库 ID 重新安装技能。

## 故障排查 {#troubleshooting}

### 技能未激活 {#skill-not-activating}

技能会根据其描述与您的请求是否匹配来激活。请尝试使用明确的表达：
- “Remember that...” 会触发存入
- “What do you know about...” 会触发召回

### 本地模式问题 {#local-mode-issues}

**守护进程未启动：**
```bash
uvx hindsight-embed daemon status
uvx hindsight-embed daemon logs
```

**重新配置 LLM 提供商：**
```bash
uvx hindsight-embed configure
```

### 云端模式问题 {#cloud-mode-issues}

**身份验证错误：**
```bash
# 检查配置
cat ~/.hindsight/config

# 手动测试连接
hindsight bank list
```

**记忆库 ID 错误：**

检查您的 SKILL.md 文件，确认其中配置的记忆库 ID：
```bash
cat ~/.claude/skills/hindsight/SKILL.md | grep "memory retain"
```

要更改记忆库 ID，请重新安装技能：
```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --mode cloud
```

**网络或防火墙问题：**
```bash
# 测试到云端 API 的连通性
curl -I https://api.hindsight.vectorize.io/health
```

## 系统要求 {#requirements}

### 本地模式 {#local-mode-1}
- Python 3.10+（用于运行 `uvx`）
- LLM API 密钥（OpenAI、Anthropic、Groq 等）

### 云端模式 {#cloud-mode-1}
- Python 3.10+（用于运行 `uvx`）
- Hindsight Cloud API 密钥
- 可访问 `https://api.hindsight.vectorize.io` 的网络连接
