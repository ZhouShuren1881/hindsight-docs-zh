---
sidebar_position: 9
---

# 记忆方案对比演示 {#memory-approaches-comparison-demo}

:::info 完整应用
这是一个可直接运行的完整应用，演示了如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/hindsight-litellm-demo)
:::

这是一个交互式 Streamlit 应用，用于比较 LLM 应用的三种记忆方案：

1. **无记忆**：每个查询都独立处理（基线）
2. **完整对话历史**：传入整个对话（截断内容以模拟上下文限制）
3. **Hindsight 记忆**：智能检索相关语义记忆

本演示展示了 Hindsight 的语义记忆如何优于传统方案，尤其是在对话变长时。

## 快速入门 {#quick-start}

```bash
# 1. 设置 OpenAI API 密钥
export OPENAI_API_KEY=your-key

# 2. 启动 Hindsight 服务器
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest

# 3. 运行演示
./run.sh
```

然后在浏览器中打开 [http://localhost:8501](http://localhost:8501)。

## 本演示展示的内容 {#what-this-demo-shows}

### 传统方案的问题 {#the-problem-with-traditional-approaches}

| 方案 | 工作方式 | 局限 |
| --- | --- | --- |
| **无记忆** | 每个查询都独立处理 | 不会保留不同消息之间的内容 |
| **完整历史** | 将所有消息传递给 LLM | token 数量限制会导致内容被截断，丢失较早的上下文 |
| **Hindsight** | 语义检索相关事实 | 无论相关内容何时被提及，都能检索出来 |

### 关键点 {#key-insight}

发送 5–10 条消息后，注意“完整对话历史”列会因为截断而开始丢失早期上下文（为便于快速演示，这里人为将上限设为 4 条消息）。与此同时，“Hindsight 记忆”仍能召回对话开头提到的事实，因为它使用语义检索，而不是按顺序传入对话历史。

## 测试演示 {#testing-the-demo}

1. **介绍自己**：
   - "Hi, I'm Sarah, a data scientist at Netflix"
   - "I prefer Python and love machine learning"

2. **围绕不同话题进行几轮交流**

3. **测试召回效果**：
   - "What programming language should I use?"
   - "What do you know about me?"

随着对话变长，观察三列给出的回答有何不同。

## 功能 {#features}

- **三种方案并列对比**
- **调试面板**：显示每种方案使用的上下文
- **记忆浏览器**：直接搜索 Hindsight 中的记忆
- **可配置选项**：包括历史截断方式、要检索的最大记忆数等
- **支持多个服务提供方**：通过 LiteLLM 支持 OpenAI、Anthropic 和 Groq

## 先决条件 {#prerequisites}

- Python 3.10+
- 正在运行的 Hindsight 服务器（建议使用 Docker）
- 至少一个 LLM API 密钥（建议使用 OpenAI）

## 设置 {#setup}

### 使用 run.sh（推荐） {#using-runsh-recommended}

```bash
# 设置 API 密钥
export OPENAI_API_KEY=your-key

# 启动 Hindsight，然后运行：
./run.sh
```

该脚本会自动检查并安装依赖项。

### 手动设置 {#manual-setup}

```bash
# 安装依赖项
pip install streamlit litellm

# 安装 Hindsight 软件包
pip install hindsight-client hindsight-litellm

# 运行应用
streamlit run app.py
```

### 启动 Hindsight 服务器 {#starting-hindsight-server}

```bash
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest

# 检查服务器是否正在运行
curl http://localhost:8888/health
```

## 配置 {#configuration}

### 侧边栏选项 {#sidebar-options}

**模型选择：**
- 服务提供方：OpenAI、Anthropic、Groq
- 模型：各服务提供方支持的不同模型
- 支持自定义模型 ID

**完整历史配置：**
- 要保留的最大消息数（默认值为 4，用于演示截断）

**Hindsight 配置：**
- API URL（默认值为 http://localhost:8888）
- 用于隔离记忆的记忆库 ID 和实体 ID
- 要检索的最大记忆数
- 召回预算（low/mid/high）

**生成设置：**
- Temperature
- 最大 token 数
- 系统提示词

## 支持的模型 {#supported-models}

### OpenAI {#openai}
- gpt-4o、gpt-4o-mini、gpt-4-turbo、gpt-4、gpt-3.5-turbo

### Anthropic {#anthropic}
- claude-3-5-sonnet-20241022、claude-3-5-haiku-20241022
- claude-3-opus-20240229、claude-3-sonnet-20240229

### Groq {#groq}
- groq/llama-3.1-70b-versatile、groq/llama-3.1-8b-instant
- groq/mixtral-8x7b-32768

## 环境变量 {#environment-variables}

```bash
# 必需
export OPENAI_API_KEY=sk-...

# 可选（用于其他服务提供方）
export ANTHROPIC_API_KEY=sk-ant-...
export GROQ_API_KEY=gsk_...

# 可选
export HINDSIGHT_URL=http://localhost:8888
```

## 故障排除 {#troubleshooting}

### Hindsight 服务器没有响应 {#hindsight-server-not-responding}

```bash
# 检查服务器是否正在运行
curl http://localhost:8888/health

# 使用 Docker 启动服务器
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest
```

### 未安装 hindsight-litellm {#hindsight-litellm-not-installed}

```bash
pip install hindsight-litellm
```

### API 密钥错误 {#api-key-errors}

请确认已设置相应的 API 密钥：
```bash
export OPENAI_API_KEY=your-key
```

## 相关资源 {#related}

- [Hindsight](https://github.com/vectorize-io/hindsight) - 面向 AI 应用的记忆基础设施
- [hindsight-litellm](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/litellm) - LiteLLM 集成软件包

## 许可证 {#license}

MIT
