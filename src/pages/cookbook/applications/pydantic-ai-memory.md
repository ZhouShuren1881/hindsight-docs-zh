---
sidebar_position: 12
---

# Pydantic AI + Hindsight 记忆 {#pydantic-ai--hindsight-memory}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/pydantic-ai-memory)
:::


给予你的Pydantic AI智能体持久的长期记忆。与助手多次聊天，看着它记住你在之前的会话中告诉它的内容。

## 这说明了什么 {#what-this-demonstrates}

- **记忆工具** — 记忆存储、记忆召回和幻觉，来自 `create_hindsight_tools()`
- **自动注入上下文** — 每次运行时的相关记忆通过`memory_instructions()`
- **跨会话持久记忆** — 智能体在脚本运行之间记住
- **交互式聊天循环** 消息历史复用

## 建筑 {#architecture}

```
Session 1:
    You: "我是一名Python开发人员，从事 FastAPI 项目"
    │
    ├─ memory_instructions() ──► recalls prior context (empty on first run)
    ├─ Agent decides to call hindsight_retain ──► stores the fact
    └─ Agent responds with acknowledgement

Session 2:
    You: "你对我了解多少？"
    │
    ├─ memory_instructions() ──► injects "用户是Python开发者..."
    ├─ Agent calls hindsight_recall ──► finds stored facts
    └─ Agent responds with everything it remembers
```

## 先决条件 {#prerequisites}

1. **Hindsight 正在运行**

   ```bash
   export OPENAI_API_KEY=your-key

   docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
     -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
     -e HINDSIGHT_API_LLM_MODEL=o3-mini \
     -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
     ghcr.io/vectorize-io/hindsight:latest
   ```

2. **OpenAI API 密钥**（对于Pydantic AI的LLM)

   ```bash
   export OPENAI_API_KEY=your-key
   ```

3. **安装依赖**

   ```bash
   cd applications/pydantic-ai-memory
   pip install -r requirements.txt
   ```

## 快速入门 {#quick-start}

### 互动聊天 {#interactive-chat}

```bash
python personal_assistant.py
```

示例会话：

```
Personal assistant ready (bank: personal-assistant)
Type 'quit' or 'exit' to stop.

You: I'm a Python developer and I love hiking on weekends
Assistant: I've noted that! You're a Python developer who enjoys weekend hiking.

You: What do you know about me?
Assistant: From my memory, I know that you're a Python developer and you
love hiking on weekends.

You: quit
```

再次运行它——智能体仍然记得：

```
You: What are my hobbies?
Assistant: Based on my memories, you enjoy hiking on weekends!
```

### 单次查询 {#single-query}

```bash
python personal_assistant.py "关于我的喜好，你还记得什么？"
```

### 重置记忆 {#reset-memory}

```bash
python personal_assistant.py --reset
```

## 它是如何工作的 {#how-it-works}

### 1。创建Hindsight客户端 {#1-create-a-hindsight-client}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

### 2。创建记忆工具 {#2-create-memory-tools}

`create_hindsight_tools()`返回  智能体可以调用的Pydantic AI`Tool`实例：

```python
from hindsight_pydantic_ai import create_hindsight_tools

tools = create_hindsight_tools(client=client, bank_id="personal-assistant")
# Returns: [hindsight_retain, hindsight_recall, hindsight_reflect]
```

### 3。添加记忆说明 {#3-add-memory-instructions}

`memory_instructions()` 返回一个异步可调用对象，它会自动调用相关记忆，并在每次运行时将它们注入到系统提示符中：

```python
from hindsight_pydantic_ai import memory_instructions

instructions_fn = memory_instructions(
    client=client,
    bank_id="personal-assistant",
    query="关于用户的重要上下文",
    max_results=5,
)
```

### 4。连接智能体 {#4-wire-up-the-agent}

```python
from pydantic_ai import Agent

agent = Agent(
    "openai:gpt-4o-mini",
    system_prompt="你是一个有长期记忆力的得力助手...",
    tools=tools,
    instructions=[instructions_fn],
)

result = await agent.run("你对我了解多少？")
```

## 核心文件 {#core-files}

|文件|说明|
|------|-------------|
|`personal_assistant.py`|具有交互式聊天和单一查询模式的完整工作示例|
|`requirements.txt`|Python 依赖关系|

## 定制 {#customization}

### 仅使用工具（无自动注射） {#use-only-tools-no-auto-injection}

让智能体决定何时搜索记忆，而不是总是注入上下文：

```python
agent = Agent(
    "openai:gpt-4o-mini",
    tools=create_hindsight_tools(client=client, bank_id="my-bank"),
)
```

### 仅使用说明（无工具） {#use-only-instructions-no-tools}

自动注入记忆，无需给智能体明确的retain/recall/reflect工具：

```python
agent = Agent(
    "openai:gpt-4o-mini",
    instructions=[memory_instructions(client=client, bank_id="my-bank")],
)
```

### 选择特定工具 {#select-specific-tools}

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="my-bank",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  #省略遗憾
)
```

### 使用不同的模型 {#use-a-different-model}

任何[Pydantic AI 模型](https://ai.pydantic.dev/models/) 工作原理：

```python
agent = Agent(
    "anthropic:claude-sonnet-4-20250514",
    tools=create_hindsight_tools(client=client, bank_id="my-bank"),
)
```

## 常见问题 {#common-issues}

**"Connection refused"**
- 确保Hindsight正在运行`localhost:8888`

**"OPENAI_API_KEY not set"**
```bash
export OPENAI_API_KEY=your-key
```

**"No module named 'hindsight_pydantic_ai'"**
```bash
pip install -r requirements.txt
```

---

**使用以下技术构建：**
- [Pydantic AI](https://ai.pydantic.dev) - 类型安全AI智能体框架
- [hindsight-pydantic-ai](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/pydantic-ai) -Hindsight记忆工具Pydantic AI
- [Hindsight](https://github.com/vectorize-io/hindsight) - 长期记忆AI智能体
