---
title: "使用 Hindsight 配置 Hermes 多用户记忆"
authors: [benfrank241]
date: 2026-04-20
tags: [how-to, hermes, memory, multi-user, configuration]
description: "使用 Hindsight 配置 Hermes 多用户记忆，将每个用户映射到正确记忆库，并隔离召回，防止用户继承他人上下文。"
image: /img/blog/guide-hermes-multi-user-memory-with-hindsight.png
hide_table_of_contents: true
---

如果希望 **Hermes 使用 Hindsight 提供多用户记忆**，最重要的设计决策不是 `memory_mode`，而是如何为每个用户生成 `bank_id`。单个静态记忆库适合个人助手，却不适合多用户部署，因为只有记忆库包含正确用户的历史，召回才会更有效。

安全规则很简单：一个用户对应一个记忆库身份。实践中通常从稳定用户标识符生成 `bank_id`，并经常加入租户标识符，再为每个会话将该值传入 Hermes Hindsight 提供商。这样召回保持相关，记忆隔离也更容易理解。

本指南介绍记忆库命名规则、Hermes 按用户配置生成方式、何时加入租户前缀，以及如何验证用户偏好不会进入其他用户的会话。操作时可参考 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)和[记忆召回 API 参考](/developer/api/recall)。

<!-- truncate -->

> **快速解答**
>
> 1. 为每个用户生成唯一 `bank_id`；多租户部署还应区分租户。
> 2. 会话开始前，将该记忆库传给 Hermes。
> 3. 将 `memory_mode`、`prefetch_method` 与身份分开，它们解决不同问题。
> 4. 为用户 A 存储事实，确认用户 B 无法召回，以验证隔离。
> 5. 并行运行预发布和生产环境时，加入环境后缀。

## 前提条件 {#prerequisites}

为 Hermes 接入多个用户前，请确认：

- Hermes 已使用原生 Hindsight 提供商。
- 可以控制每个用户会话的 Hermes 启动方式。
- 应用具有稳定用户 ID，而非临时连接 ID。
- 你知道用户是否属于不同租户。

如需基础提供商配置，从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)、[快速入门指南](/developer/api/quickstart)、[记忆存储 API 参考](/developer/api/retain)和[文档首页](/)开始。

## 分步操作 {#step-by-step}

### 1. 选择合适的记忆库命名模式 {#1-pick-the-right-bank-naming-pattern}

可靠的多用户命名规则通常如下：

```text
user:12345
tenant:acme:user:12345
tenant:acme:user:12345:env:prod
```

关键不是具体字符串格式，而是应该：

- 跨会话保持稳定。
- 每个用户唯一。
- 调试时容易查看。
- 在租户和环境之间安全隔离。

如果用户可能存在于多个租户，加入租户。如果预发布和生产使用同一后端，也加入环境。

### 2. 启动前生成按用户的 Hermes 配置 {#2-generate-per-user-hermes-config-before-launch}

Hermes 默认将 Hindsight 提供商配置存放在 `~/.hermes/hindsight/config.json`。多用户应用可生成会话专用配置，为当前用户设置 `bank_id`：

```bash
python - <<'PY'
import json, pathlib
user_id = '12345'
tenant_id = 'acme'
base = pathlib.Path.home() / '.hermes'
path = base / 'hindsight' / 'config.json'
path.parent.mkdir(parents=True, exist_ok=True)

cfg = {
    'provider': 'hindsight',
    'hindsight_api_url': 'https://api.hindsight.vectorize.io',
    'api_key': 'YOUR_HINDSIGHT_TOKEN',
    'bank_id': f'tenant:{tenant_id}:user:{user_id}:env:prod',
    'memory_mode': 'hybrid',
    'prefetch_method': 'recall'
}

path.write_text(json.dumps(cfg, indent=2) + '\n')
print(f'已写入 {path}，bank_id={cfg["bank_id"]}')
PY
```

这是核心步骤。包括记忆模式在内的其他设置，都建立在记忆库身份之上。

### 3. 将隔离与召回行为分开 {#3-separate-isolation-from-recall-behavior}

不要混淆这两个问题：

- `bank_id` 决定读取谁的记忆。
- `memory_mode` 决定 Hermes 在一轮中如何使用记忆。

多用户助手的稳妥起点是：

```json
{
  "bank_id": "tenant:acme:user:12345:env:prod",
  "memory_mode": "hybrid",
  "prefetch_method": "recall"
}
```

需要自动召回和显式工具时使用 `hybrid`；希望工具界面更简洁时，切换为 `context`。后续调整可参考 [Hermes 记忆模式指南](https://hindsight.vectorize.io/guides/2026/04/14/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools)。

### 4. 尽早加入租户和环境边界 {#4-add-tenant-and-environment-boundaries-early}

多用户错误往往要等第二个客户进入同一环境后才出现。因此建议在认为有需要之前，就添加租户和环境标记。

合适的生产模式如下：

```text
tenant:{tenant_id}:user:{user_id}:env:{environment}
```

这使会话应该访问哪个记忆库一目了然，也提供了排查异常召回的可预测规则。

### 5. 用两个真实用户验证隔离 {#5-verify-isolation-with-two-real-users}

不要只查看配置，还要测试实际行为。

1. 以用户 A 身份启动 Hermes。
2. 告诉它持久信息，例如：“记住，我希望每周五收到周报。”
3. 结束会话，让记忆存储完成。
4. 以用户 B 身份使用不同 `bank_id` 启动 Hermes。
5. 询问它记得哪些摘要偏好。

预期结果：用户 B 不应继承用户 A 的事实。

然后再次以用户 A 身份启动 Hermes，确认偏好仍然存在。

## 验证是否正常 {#verifying-it-works}

### 输出实际记忆库 ID {#print-the-effective-bank-id}

```bash
python - <<'PY'
import json, os, pathlib
base = pathlib.Path(os.environ.get('HERMES_HOME', pathlib.Path.home() / '.hermes'))
path = base / 'hindsight' / 'config.json'
cfg = json.loads(path.read_text())
print('bank_id:', cfg.get('bank_id'))
print('memory_mode:', cfg.get('memory_mode'))
print('prefetch_method:', cfg.get('prefetch_method'))
PY
```

### 执行隔离测试，而非仅检查健康状态 {#run-an-isolation-test-not-just-a-health-check}

`hermes memory status` 说明提供商已配置，并不能证明隔离。只有两个用户无法召回彼此上下文，才能证明隔离。

## 排查常见错误 {#troubleshooting--common-errors}

### 两个用户仍共享上下文 {#two-users-still-share-context}

通常是仍使用同一 `bank_id`，或封装层忘记在启动前覆盖默认配置。

### 回访用户召回为空 {#recall-is-empty-for-returning-users}

提供商可能因用户身份来源不稳定，在会话之间切换了记忆库 ID。不要使用连接 ID 或临时会话令牌。

### 预发布污染生产记忆 {#staging-polluted-production-memory}

在记忆库命名规则中添加显式环境后缀。

## 常见问题 {#faq}

### 应每个用户一个记忆库，还是共用记忆库加标签？ {#should-i-use-one-bank-per-user-or-one-bank-plus-tags}

对多数 Hermes 多用户配置，每人一个记忆库更简单安全。只有确实需要把用户放在同一检索空间时，标签才有帮助。

### 即使用户 ID 全局唯一，也应加入租户吗？ {#should-i-include-the-tenant-even-if-user-ids-are-globally-unique}

如果确定全局唯一，可以省略。实践中，租户前缀便于调试，也能减少未来意外。

### 多用户配置需要不同记忆模式吗？ {#do-i-need-a-different-memory-mode-for-multi-user-setups}

不需要。身份和召回模式是独立决策。除非有明确理由使用 `context` 或 `tools`，否则从 `hybrid` 开始。

## 后续步骤 {#next-steps}

- 如需多用户 Hermes 的托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)，了解提供商配置。
- 如果仍需要后端，使用[快速入门指南](/developer/api/quickstart)。
- 阅读[记忆召回 API 参考](/developer/api/recall)和[记忆存储 API 参考](/developer/api/retain)，了解展示和存储的内容。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解记忆库范围划分的取舍。
