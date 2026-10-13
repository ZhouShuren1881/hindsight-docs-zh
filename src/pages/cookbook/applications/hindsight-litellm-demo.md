---
sidebar_position: 9
---

# 记忆方法比较演示 {#memory-approaches-comparison-demo}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/hindsight-litellm-demo)
:::


交互式Streamlit应用程序比较LLM应用程序的三种记忆方法：

1. **无记忆** - 每个查询都是独立的（基线）
2. **完整对话历史** - 通过整个对话（被截断以模拟上下文限制）
3. **Hindsight 记忆** - 智能语义记忆检索

这个演示展示了Hindsight的语义记忆如何优于传统方法，特别是当对话变得更长时。

## 快速入门 {#quick-start}

```bash
#1。 OpenAI API 设置键
export OPENAI_API_KEY=your-key

#2.启动Hindsight服务器
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest

#3. 运行演示
./run.sh
```

然后打开`http://localhost:8501`。

## 这个演示展示了什么 {#what-this-demo-shows}

### 传统方法的问题 {#the-problem-with-traditional-approaches}

|方法|工作原理|限制|
|----------|--------------|------------|
|**无记忆**|每个查询独立|忘记消息之间的所有内容|
|**完整历史**|将所有消息传递至LLM|令牌限制导致截断 - 丢失早期上下文|
|**Hindsight**|相关事实的语义检索|检索相关内容，无论何时说出|

### 关键见解 {#key-insight}

5-10条消息后，观看由于截断， **完整对话历史** 列开始丢失早期上下文（人为设置为 4 条消息以快速演示这一点）。与此同时，**Hindsight 记忆**仍然可以从一开始就记忆事实，因为它使用语义检索而不是顺序历史。

## 测试演示 {#testing-the-demo}

1. **自我介绍**：
   - “嗨，我是 Sarah，Netflix 的数据科学家”
   - “我更喜欢Python并且热爱机器学习”

2. **进行几轮交流**关于不同的主题

3. **测试召回**：
   - “我应该使用什么编程语言？”
   - “你对我了解多少？”

随着对话的展开，观察三栏如何做出不同的反应。

## 特点 {#features}

- **并列比较**
- **调试面板** 显示每种方法使用的上下文
- **记忆浏览器**进行搜索Hindsight直接记忆
- **可配置设置** 用于历史截断、最大记忆等。
- **多提供商支持**来自LiteLLM（OpenAI,Anthropic，Groq）

## 先决条件 {#prerequisites}

- Python 3.10+
- Hindsight服务器正在运行（Docker推荐）
- 至少一个LLMAPI钥匙（推荐OpenAI）

## 设置 {#setup}

### 使用run.sh（推荐） {#using-runsh-recommended}

```bash
#设置API键
export OPENAI_API_KEY=your-key

#启动Hindsight，然后运行：
./run.sh
```

脚本将自动检查并安装依赖项。

### 手动设置 {#manual-setup}

```bash
#安装依赖项
pip install streamlit litellm

#安装Hindsight 软件包
pip install hindsight-client hindsight-litellm

#运行应用程序
streamlit run app.py
```

### 启动Hindsight服务器 {#starting-hindsight-server}

```bash
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest

#验证其正在运行
curl http://localhost:8888/health
```

## 配置 {#configuration}

### 侧边栏选项 {#sidebar-options}

**模型选择：**
- 提供商：OpenAI、Anthropic、Groq
- 型号：每个提供商的各种型号
- 自定义型号ID支持

**完整历史配置：**
- 要保留的最大消息数（默认值：4 以演示截断）

**Hindsight 配置：**
- APIURL（默认：http://localhost:8888)
- 用于记忆隔离的记忆库ID和实体ID
- 可检索的最大记忆数
- 记忆召回预算（low/mid/high）

**生成设置：**
- 温度
- 最大token
- 系统提示

## 支持机型 {#supported-models}

### OpenAI {#openai}
- gpt-4o、gpt-4o-mini、gpt-4-turbo、gpt-4、gpt-3.5-turbo

### Anthropic {#anthropic}
- claude-3-5-sonnet-20241022，claude-3-5-haiku-20241022
- claude-3-opus-20240229，claude-3-sonnet-20240229

### Groq {#groq}
- groq/llama-3.1-70b-versatile，groq/llama-3.1-8b-instant
- groq/mixtral-8x7b-32768

## 环境变量 {#environment-variables}

```bash
# Required
export OPENAI_API_KEY=sk-...

#可选（对于其他提供商）
export ANTHROPIC_API_KEY=sk-ant-...
export GROQ_API_KEY=gsk_...

# Optional
export HINDSIGHT_URL=http://localhost:8888
```

## 故障排除 {#troubleshooting}

### Hindsight 服务器没有响应 {#hindsight-server-not-responding}

```bash
#检查是否正在运行
curl http://localhost:8888/health

#从Docker开始
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  ghcr.io/vectorize-io/hindsight:latest
```

### hindsight-litellm 未安装 {#hindsight-litellm-not-installed}

```bash
pip install hindsight-litellm
```

### API按键错误 {#api-key-errors}

确保设置了适当的API键：
```bash
export OPENAI_API_KEY=your-key
```

## 相关 {#related}

- [Hindsight](https://github.com/vectorize-io/hindsight) - 记忆基础设施AI应用
- [hindsight-litellm](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/litellm) -LiteLLM集成包

## 许可证 {#license}

MIT
