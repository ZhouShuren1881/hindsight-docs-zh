---
sidebar_position: 3
title: "Hindsight 智能体记忆技能 | AI 编码助手集成"
description: "通过Hindsight的智能体技能提供AI编码助手，如Claude Code和Codex跨会话持久记忆——一个可重复使用的提示模板，用于长期上下文保留。"
---

# 技能 {#skills}

Hindsight 提供了一种智能体技能，可以让 AI 编码助理在整个会话中保持持久的记忆。技能是可重复使用的提示模板，智能体可以在需要时加载以获得专门的功能。

## 支持的平台 {#supported-platforms}

|平台|技能目录|
|----------|-----------------|
|[Claude Code](https://docs.anthropic.com/en/docs/claude-code)|`~/.claude/skills/`|
|[OpenCode](https://github.com/opencode-ai/opencode)|`~/.opencode/skills/`|
|[Codex CLI](https://github.com/openai/codex)|`~/.codex/skills/`|

## 部署模式 {#deployment-modes}

该技能支持两种部署模式：

|模式|最适合|数据位置|
|------|----------|---------------|
|**本地**|个人开发者|您的机器 (`~/.pg0/`)|
|**云端**|团队分享知识|Hindsight Cloud|

## 快速安装 {#quick-install}

### 选项 1：交互式安装程序（推荐） {#option-1-interactive-installer-recommended}

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash
```

安装程序将：
1. 提示您选择AI编码助手
2. 选择部署模式（本地或云端）
3. 配置适当的设置
4. 将技能安装到相应目录

### 针对特定平台安装 {#install-for-a-specific-platform}

```bash
#Claude 代码（交互模式选择）
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude

# OpenCode
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app opencode

#Codex CLI
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app codex
```

### 云模式安装 {#install-with-cloud-mode}

```bash
#直接云设置（跳过模式交互提示）
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude --mode cloud
```

### 选项2：使用附加技能 {#option-2-using-add-skill}

如果你使用[add-skill](https://add-skill.org/) 管理您的智能体技能：

```bash
#对于本地模式（个人开发者）
npx add-skill vectorize-io/hindsight --skill hindsight-local

#对于Hindsight Cloud（团队）
npx add-skill vectorize-io/hindsight --skill hindsight-cloud

#对于自托管 Hindsight 服务器
npx add-skill vectorize-io/hindsight --skill hindsight-self-hosted
```

首次使用时，AI将指导您完成剩余的设置：
- **本地**：运行`uvx hindsight-embed configure` 设置您的LLM提供商
- **云端**：提供您的API密钥和记忆库ID
- **自托管**：提供您的服务器 URL，API密钥和记忆库ID

## 技能提供什么 {#what-the-skill-provides}

安装后，您的AI助手将能够：

- **记忆存储** - 存储用户偏好、学习内容和程序结果
- **记忆召回** - 在开始任务之前搜索相关上下文
- **反思** - 将记忆合成上下文答案

该技能使用`hindsight-embed` CLI，运行带有嵌入式数据库的轻量级本地守护进程。

## 技能如何发挥作用 {#how-skills-work}

技能是**由模型调用**，意思是AI助手会根据您的对话上下文自动决定何时使用它们。您不需要明确触发该技能。

助理将：
- **存储** 当您分享偏好时、当任务时succeed/fail，或者当学习出现时
- **记忆召回** 在开始重要任务之前获取相关上下文

### 存储什么 {#what-gets-stored}

技能优化存储：

|类别|示例|
|----------|----------|
|**用户偏好**|编码风格、工具偏好、语言选择|
|**操作结果**|有效的命令、解决问题的配置|
|**经验总结**|Bug 解决方案、解决方法、架构决策|

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

所有数据都保留在您的计算机上。该守护进程在需要时自动启动，并在不活动后关闭。

### 云模式 {#cloud-mode}

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

数据存储在Hindsight Cloud中并在您的团队中共享。所有具有相同记忆库ID的团队成员都可以访问共享记忆。

---

## 本地模式设置 {#local-mode-setup}

该技能使用存储在中的配置 `~/.hindsight/config.env`。随时重新配置：

```bash
uvx hindsight-embed configure
```

---

## 云模式设置 {#cloud-mode-setup}

云模式连接[Hindsight Cloud](https://ui.hindsight.vectorize.io)，允许团队分享有关代码库的记忆。当一名团队成员学到一些东西时，每个人都会受益。

### 前置条件 {#prerequisites}

1. AHindsight Cloud账号（来自团队管理员的 [注册](https://ui.hindsight.vectorize.io))
2. API 密钥
3. 您项目的记忆库 ID（例如，`team-acme-frontend`)

### 安装 {#installation}

以云模式运行安装程序：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --mode cloud
```

系统将提示您：

|设置|说明|示例|
|---------|-------------|---------|
|**云端 API URL**|Hindsight Cloud端点|`https://api.hindsight.vectorize.io`|
|**API 密钥**|您的身份验证密钥|`hs_xxx...`|
|**记忆库 ID**|为您的团队共享记忆库|`team-acme-frontend`|

### 配置文件 {#configuration-files}

云模式创建两个文件：

**`~/.hindsight/config`** —API连接设置（TOML 格式）：
```toml
api_url = "https://api.hindsight.vectorize.io"
api_key = "hs_xxx..."
```

**`~/.claude/skills/hindsight/SKILL.md`** — 内置记忆库 ID 的技能定义。

### 团队设置 {#team-setup}

为您的团队设置云模式：

1. **团队管理员** 创建一个记忆库Hindsight Cloud（例如，`team-acme-frontend`)
2. **团队管理员** 生成API每个团队成员的钥匙
3. **每位开发者** 使用其运行安装程序API密钥和共享记忆库ID
4. 所有团队成员现在共享相同的记忆库

### 团队记忆库中要存储什么 {#what-to-store-in-team-banks}

云模式使用**团队共享记忆库**。仔细考虑其中的内容：

|类型|示例|如何储存|
|------|----------|--------------|
|**项目约定**|Linting 规则、测试要求、Node 版本|`"Project uses ESLint with Airbnb config"`|
|**团队知识**|架构决策、常见陷阱、领域逻辑|`"Auth module requires Redis 7+"`|
|**个人偏好**|个人编码风格、沟通偏好|`"Alice prefers verbose commit messages"`|

**关键区别**：项目惯例适用于所有人。个人偏好应包括该人的姓名，以便AI知道何时应用它们。

### 工作流程示例 {#example-workflow}

```
第 1 天：Alice 发现一项要求
─────────────────────────────────────
Alice 的 AI 助手存储：
  "身份验证模块需要 Redis 7+"
  "Alice 更喜欢显式错误处理而不是无声失败"

第 2 天：Bob 开始开发身份验证功能
─────────────────────────────────
Bob 的 AI 助手召回：
  "身份验证模块需要 Redis 7+"

Bob 避免了 Alice 遇到的问题！
(Alice 的个人偏好已被存储，但不会应用到 Bob)
```

### 测试云连接 {#testing-cloud-connection}

安装完成后，验证连接：

```bash
#存储测试记忆
hindsight memory retain team-acme-frontend "Alice 在 Google 担任软件工程师"

#记忆召回它
hindsight memory recall team-acme-frontend "Alice"
```

### 记忆库切换 {#switching-between-banks}

如果您同时处理多个项目，您可以为每个AI助手安装不同的技能，或者手动切换记忆库：

```bash
#环境变量覆盖（临时）
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io \
HINDSIGHT_API_KEY=hs_xxx \
hindsight memory recall different-bank "query"
```

对于永久多记忆库设置，请使用不同的记忆库ID重新安装技能。

## 故障排查 {#troubleshooting}

### 技能未激活 {#skill-not-activating}

技能根据符合您的请求的描述激活。尝试明确：
- “记住...”触发存储
- “你知道什么......”触发记忆召回

### 本地模式问题 {#local-mode-issues}

**守护进程无法启动：**
```bash
uvx hindsight-embed daemon status
uvx hindsight-embed daemon logs
```

**重新配置 LLM 提供商：**
```bash
uvx hindsight-embed configure
```

### 云模式问题 {#cloud-mode-issues}

**身份验证错误：**
```bash
#验证您的配置
cat ~/.hindsight/config

#手动测试连接
hindsight bank list
```

**记忆库 ID 错误：**

检查您的 SKILL.md 文件以查看配置了哪个记忆库 ID：
```bash
cat ~/.claude/skills/hindsight/SKILL.md | grep "记忆 记忆存储"
```

要更改记忆库ID，请重新安装技能：
```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --mode cloud
```

**网络或防火墙问题：**
```bash
#测试与云的连接API
curl -I https://api.hindsight.vectorize.io/health
```

## 环境要求 {#requirements}

### 本地模式 {#local-mode}
- Python3.10+（对于`uvx`)
- LLM API 密钥（OpenAI、Anthropic、Groq 等）

### 云模式 {#cloud-mode}
- Python3.10+（对于`uvx`)
- Hindsight CloudAPI密钥
- 网络访问`https://api.hindsight.vectorize.io`
