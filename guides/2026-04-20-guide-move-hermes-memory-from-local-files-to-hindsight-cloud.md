---
title: "将 Hermes 记忆迁移到 Hindsight Cloud"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, hermes, memory, cloud, migration]
description: "将 Hermes 记忆从本地文件迁移到 Hindsight Cloud，保持配置清晰，并验证切换至托管后端后召回仍正常。"
image: /img/blog/guide-move-hermes-memory-from-local-files-to-hindsight-cloud.png
hide_table_of_contents: true
---

如果你想**将 Hermes 记忆从本地文件迁移到 Hindsight Cloud**，关键是把过去混在一起的两类记忆分开。Hermes 可以继续用有容量限制的本地文件记忆保存智能体本地上下文，同时由 Hindsight Cloud 充当持久的长期记忆后端，让记忆跨会话保留，并更好地适配跨设备或共享工作流。

关键不在于逐字节复制所有本地内容，而在于保留你真正关心的持久事实，然后将 Hermes 指向托管的 Hindsight 后端，使之后的记忆存入和召回都在那里进行。实际操作中，先备份当前 Hermes 记忆文件，再将记忆提供方配置切换到 Cloud，并用几条已知事实验证召回，确认无误后再完全依赖新路径。

本指南介绍如何安全迁移、如何为 Hermes 配置 Hindsight Cloud，以及如何确认切换后助手仍记得重要信息。操作时可同时参考 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门指南](/developer/api/quickstart)、[Retain API 参考](/developer/api/retain)和[文档首页](/)。

<!-- truncate -->

> **快速解答**
>
> 1. 先备份当前 Hermes 本地记忆文件。
> 2. 决定哪些持久上下文值得保留。
> 3. 使用稳定 `bank_id` 配置 Hermes 访问 Hindsight Cloud。
> 4. 如有必要，存储一段简短摘要，为新记忆库提供初始内容。
> 5. 在删除或忽略旧本地文件前，验证召回。

## 前提条件 {#prerequisites}

迁移前，请确认：

- 已有 Hindsight Cloud 账户和 API 令牌。
- Hermes 在本地已正常工作，你知道要保留哪些行为。
- 可以编辑 `~/.hermes/hindsight/config.json`。

参考资料：[Hindsight Cloud](https://hindsight.vectorize.io)、[Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门指南](/developer/api/quickstart)和[记忆存储 API 参考](/developer/api/retain)。

## 分步操作 {#step-by-step}

### 1. 备份本地 Hermes 记忆文件 {#1-back-up-the-local-hermes-memory-files}

修改前先备份：

```bash
mkdir -p ~/hermes-memory-backup
cp -R ~/.hermes ~/hermes-memory-backup/hermes-$(date +%Y%m%d-%H%M%S)
```

之后可能不需要每个文件，但应保留清晰的回退点。

### 2. 决定应该保留什么 {#2-decide-what-should-be-preserved}

本地文件记忆经常混合持久上下文和短期会话细节。迁移到 Hindsight Cloud 时，保留持久部分：

- 用户偏好。
- 项目上下文。
- 持续承诺。
- 关键决策。
- 稳定工作流。

必要时创建紧凑摘要，Cloud 配置完成后存入新记忆库。

### 3. 配置 Hermes 使用 Hindsight Cloud {#3-configure-hermes-for-hindsight-cloud}

更新原生 Hindsight 提供商配置：

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get('HERMES_HOME', pathlib.Path.home() / '.hermes'))
path = base / 'hindsight' / 'config.json'
path.parent.mkdir(parents=True, exist_ok=True)

cfg = {
    'provider': 'hindsight',
    'hindsight_api_url': 'https://api.hindsight.vectorize.io',
    'api_key': 'YOUR_HINDSIGHT_TOKEN',
    'bank_id': 'hermes-primary',
    'memory_mode': 'hybrid',
    'prefetch_method': 'recall'
}

path.write_text(json.dumps(cfg, indent=2) + '\n')
print(f'Updated {path}')
PY
```

这不会删除本地 Hermes 文件，只会改变今后长期记忆的读取和写入位置。

### 4. 如需立即延续记忆，为新记忆库提供初始内容 {#4-seed-the-new-bank-if-you-need-continuity-on-day-one}

如果希望几条关键事实立即可用，将紧凑摘要存入新记忆库。例如：

```text
The user prefers concise answers, is launching Product Alpha in May, uses Postgres, and cares most about billing reliability and release checklists.
```

无需初始化所有内容，只存入丢失后会让你困扰的持久上下文。

### 5. 在全新会话中验证召回 {#5-verify-recall-in-a-fresh-session}

切换到 Cloud 后：

1. 启动 Hermes。
2. 告诉它一条新的持久事实。
3. 结束会话。
4. 开始新会话。
5. 询问该事实。

如果全新会话中召回有效，Cloud 路径就是健康的。

## 验证是否正常 {#verifying-it-works}

### 输出当前配置 {#print-the-active-config}

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get('HERMES_HOME', pathlib.Path.home() / '.hermes'))
path = base / 'hindsight' / 'config.json'
cfg = json.loads(path.read_text())
print('hindsight_api_url:', cfg.get('hindsight_api_url'))
print('bank_id:', cfg.get('bank_id'))
print('memory_mode:', cfg.get('memory_mode'))
PY
```

### 执行全新会话召回测试 {#run-a-clean-session-recall-test}

迁移成功的标准不是“文件看起来正确”，而是“新会话仍能召回正确的持久上下文”。

## 排查常见错误 {#troubleshooting--common-errors}

### 切换后召回停止工作 {#recall-stopped-working-after-the-switch}

通常是 API 令牌或 URL 错误，或新 `bank_id` 与预期记忆库不一致。

### 助手似乎什么都忘记了 {#the-assistant-feels-like-it-forgot-everything}

通常是未提供初始内容，旧持久上下文只存在于本地文件。向新记忆库存储紧凑摘要，以弥补差距。

### 预发布和生产内容混在一起 {#i-am-seeing-staging-and-production-mix-together}

按环境拆分记忆库，例如 `hermes-primary-prod` 和 `hermes-primary-staging`。

## 常见问题 {#faq}

### 必须精确迁移每个本地记忆文件吗？ {#do-i-need-to-migrate-every-local-memory-file-exactly}

不必。保留持久事实，而非每个产物。

### 迁移到 Cloud 后，应始终保持相同 `bank_id` 吗？ {#should-i-keep-the-same-bank_id-forever-after-moving-to-cloud}

如果希望记忆延续，应该如此。只有明确希望全新记忆库时才修改。

### Hindsight Cloud 对每种 Hermes 场景都优于本地文件吗？ {#is-hindsight-cloud-better-than-local-files-for-every-hermes-use-case}

不一定。需要持久性、共享或简化运维时，Cloud 更好。狭窄的个人工作流仍可使用本地文件。

## 后续步骤 {#next-steps}

- 如果尚未创建后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)，了解原生提供商配置。
- 如果希望自托管而非 Cloud，使用[快速入门指南](/developer/api/quickstart)。
- 阅读[记忆存储 API 参考](/developer/api/retain)和[记忆召回 API 参考](/developer/api/recall)，更有针对性地初始化或调整新记忆库。
- 对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解相关迁移思路。
