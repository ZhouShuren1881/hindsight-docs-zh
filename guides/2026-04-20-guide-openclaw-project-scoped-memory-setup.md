---
title: "OpenClaw 按项目限定记忆配置指南"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, openclaw, memory, projects, configuration]
description: "使用 Hindsight 配置 OpenClaw 按项目限定记忆，隔离不同项目上下文，并选择何时使用固定记忆库或动态隔离。"
image: /img/blog/guide-openclaw-project-scoped-memory-setup.png
hide_table_of_contents: true
---

如果希望 **OpenClaw 按项目限定记忆**，目标很简单：智能体处理项目 A 时，不应召回项目 B 的事实。最直接的方式是每个项目使用独立记忆库，可以给各项目智能体固定 `bankId`，或明确让一个智能体实例对应一个项目。

这与按用户记忆不同。按用户回答“谁在说话”，按项目回答“这段对话应该利用哪部分工作的知识”。如果 OpenClaw 支持多个代码库、产品或客户环境，项目范围通常比用户范围更重要。

本指南介绍适用场景、如何为每个项目创建记忆库，以及如何验证项目间不再混杂、项目内仍保持延续。可以参考 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)和[记忆存储 API 参考](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 每个项目创建一个记忆库，例如 `project-alpha` 和 `project-beta`。
> 2. 配置各 OpenClaw 智能体或部署使用正确的固定 `bankId`。
> 3. 除非确实需要合并，否则分开项目记忆和个人记忆。
> 4. 在一个项目中提供事实，确认它不出现在另一个项目中。
> 5. 添加聚焦的 `retainMission`，让各项目记忆库存储持久项目知识。

## 前提条件 {#prerequisites}

按项目限定记忆前，请确认：

- OpenClaw 和 Hindsight 插件已安装。
- 可以按项目运行独立 OpenClaw 智能体或不同配置。
- 你知道哪些项目需要隔离记忆库。

参考资料：[OpenClaw 集成文档](/sdks/integrations/openclaw)、[快速入门指南](/developer/api/quickstart)、[记忆召回 API 参考](/developer/api/recall)和[文档首页](/)。

## 分步操作 {#step-by-step}

### 1. 定义项目边界 {#1-decide-what-counts-as-a-project-boundary}

项目边界应对应真实工作，例如：

- 一个代码库。
- 一个客户部署。
- 一条产品线。
- 一项内部计划。

如果项目之间差异较大，错误召回会造成干扰，就应使用独立记忆库。

### 2. 每个项目使用固定记忆库 {#2-use-a-fixed-bank-per-project}

最简单可靠的模式是每个项目智能体使用固定记忆库：

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
entries = config.setdefault('plugins', {}).setdefault('entries', {})
plugin = entries.setdefault('hindsight-openclaw', {'enabled': True, 'config': {}})
plugin['enabled'] = True
cfg = plugin.setdefault('config', {})
cfg['dynamicBankId'] = False
cfg['bankId'] = 'project-alpha'
path.write_text(json.dumps(config, indent=2) + '\n')
print(f'已更新 {path}')
PY
```

再为第二个项目设置不同记忆库：

```json
{
  "bankId": "project-beta"
}
```

### 3. 让存储目标聚焦项目 {#3-keep-the-retain-mission-project-focused}

项目记忆库最适合存储：

- 架构决策。
- 命名约定。
- 部署约束。
- 重复工作流。
- 已知缺陷和解决办法。

实用的项目存储目标：

```text
提取持久项目决策、架构上下文、工作流、约束和反复出现的实现细节。忽略随意闲聊和临时任务噪声。
```

### 4. 将一个智能体或配置变体对应一个项目 {#4-map-one-agent-or-one-config-variant-to-one-project}

这是最清晰的部署模式：

- 智能体 A -> `project-alpha`
- 智能体 B -> `project-beta`

比起临时把一个运行中的智能体切换到多个项目记忆库，这种方式更容易理解。

### 5. 测试项目间隔离 {#5-test-for-cross-project-isolation}

1. 在项目 Alpha 中告诉智能体：“记住，Alpha 使用 Postgres，并通过 GitHub Actions 部署。”
2. 等待记忆存储完成。
3. 切换到项目 Beta。
4. 询问它记得哪些部署技术栈信息。

预期结果：项目 Alpha 的事实不应出现在项目 Beta。

## 验证是否正常 {#verifying-it-works}

### 输出当前记忆库 {#print-the-active-bank}

```bash
python3 - <<'PY'
import json, pathlib
path = pathlib.Path.home() / '.openclaw' / 'openclaw.json'
config = json.loads(path.read_text())
cfg = config['plugins']['entries']['hindsight-openclaw']['config']
print('dynamicBankId:', cfg.get('dynamicBankId'))
print('bankId:', cfg.get('bankId'))
PY
```

### 使用有辨识度的项目事实测试 {#test-with-a-distinctive-project-fact}

选择在另一个项目中明显不正确的事实，确认它始终保持隔离。

## 排查常见错误 {#troubleshooting--common-errors}

### 智能体仍召回错误项目上下文 {#the-agent-still-recalls-the-wrong-project-context}

很可能两个项目重用了同一记忆库，或加载了错误配置文件。

### 有用的个人偏好不再出现 {#useful-personal-preferences-stopped-showing-up}

项目记忆与用户记忆分离后，这很正常。如果两者都需要，应在概念上区分，再决定哪种在工作流中优先。

### 项目记忆库太嘈杂 {#one-project-bank-is-too-noisy}

收紧存储目标，只保留持久项目上下文。

## 常见问题 {#faq}

### 按项目限定记忆比按用户更好吗？ {#is-project-scoped-memory-better-than-per-user-memory}

不一定，它们回答不同问题。项目范围关注工作上下文，用户范围关注个人上下文。

### 一个用户可以使用多个项目记忆库吗？ {#can-one-user-work-across-several-project-banks}

可以，这通常正是目的。同一人可与各自使用独立记忆库的不同项目智能体交互。

### 每个代码库都应有独立记忆库吗？ {#should-every-repo-get-its-own-bank}

只有跨库错误召回的损害大于共享上下文的帮助时，才应如此。

## 后续步骤 {#next-steps}

- 如需多个项目智能体共用托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整插件配置。
- 如果仍需要搭建 Hindsight，使用[快速入门指南](/developer/api/quickstart)。
- 调整检索或存储前，阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)。
- 对照 [OpenClaw 共享记忆](/blog/2026/04/01/openclaw-shared-memory)和 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解相关协作模式。
