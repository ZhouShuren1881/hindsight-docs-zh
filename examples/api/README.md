# API 文档示例

此目录包含可运行的示例脚本，是文档代码示例的真实来源。

## 工作方式 {#how-it-works}

1. **脚本可运行**：每个文件可作为冒烟测试执行。
2. **标记定义片段**：提取 `# [docs:section-name]` 与 `# [/docs:section-name]` 之间的代码。
3. **构建时导入**：MDX 使用 `raw-loader` 导入脚本，再由 `CodeSnippet` 提取标记片段。

## 文件结构 {#file-structure}

| 文件 | 文档 | 说明 |
|------|---------------|-------------|
| `quickstart.py/mjs/sh` | quickstart.md | 入门示例 |
| `retain.py/mjs/sh` | retain.md | 记忆存储示例 |
| `recall.py/mjs/sh` | recall.md | 记忆召回示例 |
| `reflect.py/mjs/sh` | reflect.md | AI 反思示例 |
| `memory-banks.py/mjs` | memory-banks.md | 记忆库管理示例 |
| `documents.py/mjs` | documents.md | 文档增删改查示例 |
| `reflections.py` | reflections.md | 反思增删改查示例 |
| `main-methods.py` | main-methods.md | 核心方法示例 |
| `cli-reference.sh` | cli.mdx | CLI 命令示例 |

## 运行示例 {#running-examples}

```bash
# 运行全部 Python 示例
for f in *.py; do python "$f"; done

# 运行全部 Node.js 示例
for f in *.mjs; do node "$f"; done

# 运行全部 CLI 示例
for f in *.sh; do bash "$f"; done
```

需要运行中的 Hindsight 服务器，默认 `http://localhost:8888`，或设置 `HINDSIGHT_API_URL`。

## 旧版示例 {#legacy-examples}

`legacy/` 保存已弃用示例，仅兼容旧文档版本。这些文件**不可运行**，CI 测试会跳过。

## 不涵盖的内容 {#whats-not-covered}

### 1. OpenAPI 自动生成文档（`/api-reference/*`） {#1-openapi-auto-generated-docs-api-reference}

页面直接从 OpenAPI 规范生成，规范为真实来源，文档自动反映其内容，无需验证手工代码示例。

### 2. 交互式 CLI 命令 {#2-interactive-cli-commands}

| 命令 | 原因 |
|---------|--------|
| `hindsight configure` | 需要交互输入 API URL、凭据 |
| `hindsight configure --show` | 显示敏感配置，不适合自动测试 |

### 3. 安装与配置说明 {#3-installationsetup-instructions}

文档中的 `pip install`、`npm install` 和系统配置属于操作说明，由 CI 环境配置验证，不是可运行代码示例。

### 4. 错误处理示例 {#4-error-handling-examples}

有些文档展示错误响应，如记忆库不存在时。这需要刻意构造错误状态，会导致冒烟测试失败，错误行为由单元测试覆盖。

## 添加新示例 {#adding-new-examples}

1. 创建或编辑对应脚本。
2. 为新代码片段添加标记：
   ```python
   # [docs:my-new-section]
   client.some_method(...)
   # [/docs:my-new-section]
   ```
3. 在 MDX 中引用：
   ```mdx
   import myScript from '!!raw-loader!@site/examples/api/my-script.py';
   <CodeSnippet code={myScript} section="my-new-section" language="python" />
   ```
4. 本地运行，验证有效。

## 标记格式 {#marker-format}

- **Python/Bash**: `# [docs:section-name]` / `# [/docs:section-name]`
- **JavaScript**: `// [docs:section-name]` / `// [/docs:section-name]`

片段名应采用 kebab-case 且有描述性，如 `retain-with-context`、`recall-basic`。
