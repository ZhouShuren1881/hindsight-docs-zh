---
sidebar_position: 11
---

# OpenAI 智能体 + Hindsight 记忆集成 {#openai-agent--hindsight-memory-integration}

:::info 完整应用
这是一个完整且可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源代码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/openai-fitness-coach)
:::

本健身教练示例演示如何将 **OpenAI Agents** 与 **Hindsight 记忆后端**结合使用。

## 本示例演示的内容 {#what-this-demonstrates}

本示例展示了：

- **OpenAI Assistants** 负责对话逻辑
- **Hindsight** 提供完善的记忆存储与检索
- **函数调用** 将两者连接起来
- **流式响应** 支持实时交互（默认启用）
- **双向记忆**：同时存储用户数据和教练的观测
- **系统级后处理**：自动存储意见，提高可靠性
- **时序语义记忆**：通过函数工具查询
- **增强的偏好学习**：教练会学习并尊重用户的喜好与厌恶
- **真实世界的集成模式**：为 AI 智能体添加记忆

## 架构 {#architecture}

```
User: "I ran 5K today, don't like tempo runs"
    |
OpenAI Assistant
    |
Function Call: store_memory(workout + preference)
    |
Hindsight API (stores as world/agent)
    |
OpenAI Assistant: "What should I focus on?"
    |
Function Call: retrieve_memories("workouts and preferences")
    |
Hindsight API (returns workouts + preferences)
    |
OpenAI Assistant (analyzes, gives advice)
    |
Function Call: store_memory(advice as opinion)
    |
Hindsight API (stores coach's observation)
    |
Personalized Answer
```

## 与标准演示的主要区别 {#key-difference-from-standard-demo}

| 组件 | 标准演示 | OpenAI 集成 |
| --- | --- | --- |
| **对话** | Hindsight `/think` 端点 | OpenAI Assistant API |
| **记忆** | Hindsight（内置） | Hindsight（通过函数调用） |
| **LLM** | 在 Hindsight 中配置 | OpenAI GPT-4 |
| **意见形成** | 在 `/think` 中自动完成 | 通过 `store_memory(type="opinion")` 显式完成 |
| **适用场景** | 原生使用 Hindsight 的应用 | 为现有 OpenAI 智能体集成记忆 |

## 快速开始 {#quick-start}

### 前置条件 {#prerequisites}

1. **OpenAI API 密钥**
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   ```

2. **运行中的 Hindsight API**
   ```bash
   # 按照 Hindsight 的设置说明启动 API
   # 默认地址：http://localhost:8888
   ```

3. **安装依赖项**
   ```bash
   pip install openai requests
   ```

### 运行对话演示 {#run-the-conversational-demo}

```bash
cd openai-fitness-coach
export OPENAI_API_KEY=your_key_here
python demo_conversational.py
```

本演示展示了：

1. **用自然语言记录训练**：以对话方式告诉教练你做了什么
2. **偏好学习**：表达喜好与厌恶，观察教练如何适应
3. **目标跟踪**：设定目标、跟踪进度并达成里程碑
4. **双向记忆**：你的活动和教练的建议都会被存储
5. **流式响应**：实时查看响应内容
6. **7 个交互阶段**：从设定目标到认可成就

本演示使用单独的智能体（`fitness-coach-demo`），避免与真实数据混在一起。

## 用法 {#usage}

### 与教练对话 {#chat-with-your-coach}

**交互模式：**
```bash
python openai_coach.py
```

**提出单个问题：**
```bash
python openai_coach.py "What did I do for training this week?"
```

## 工作原理 {#how-it-works}

### 1. 记忆工具（`memory_tools.py`） {#1-memory-tools-memorytoolspy}

定义 OpenAI 智能体可以调用的函数工具：

```python
retrieve_memories(query, fact_types, top_k)
search_workouts(after_date, before_date, workout_type)
get_nutrition_summary(after_date, before_date)
get_user_goals()
get_coach_opinions(about)
```

每个函数都会调用 Hindsight API，以获取相关记忆。

### 2. OpenAI 智能体（`openai_coach.py`） {#2-openai-agent-openaicoachpy}

创建一个 OpenAI Assistant，并为其配置：

- 健身指导说明
- 记忆函数工具的调用权限
- 对话管理能力

当你提出问题时：

1. 用户消息会发送给 OpenAI Assistant。
2. Assistant 会决定调用哪些记忆函数。
3. 函数会从 Hindsight 获取数据。
4. Assistant 会结合检索到的上下文生成回复。

### 3. 函数调用流程 {#3-function-calling-flow}

```python
# 用户提问：“这周我跑了什么？”

# OpenAI Assistant 决定调用：
search_workouts(
    after_date="2024-11-18",
    workout_type="running"
)

# 函数从 Hindsight 检索数据：
{
  "results": [
    {"text": "User completed 45-minute cardio workout: running..."},
    {"text": "User completed 60-minute cardio workout: running..."}
  ]
}

# OpenAI Assistant 生成回复：
"This week you've done two runs: a 45-minute run on Monday
and a longer 60-minute run on Wednesday. Great consistency!"
```

## 示例问题 {#example-questions}

可以尝试提出以下问题：

```bash
python openai_coach.py "What does my training look like this week?"
python openai_coach.py "Based on my workouts, should I rest today?"
python openai_coach.py "How is my nutrition supporting my goals?"
python openai_coach.py "What's my progress toward my goal?"
python openai_coach.py "Compare my training this month to last month"
```

智能体会自动：

1. 判断需要哪些记忆
2. 调用相应的函数工具
3. 从 Hindsight 检索数据
4. 生成个性化回复

## 检索的记忆类型 {#memory-types-retrieved}

OpenAI 智能体可以从 Hindsight 检索不同类型的记忆：

- **世界事实**（`fact_type: "world"`）：训练、膳食和活动
- **智能体事实**（`fact_type: "agent"`）：目标和意图
- **意见**（`fact_type: "opinion"`）：教练对行为模式的观测

## 自定义 {#customization}

### 添加新的函数工具 {#add-new-function-tools}

编辑 `memory_tools.py`，添加新的功能：

```python
def get_weekly_summary(week_offset: int = 0):
    """Get a summary of a specific week."""
    # 实现
    pass

# 添加到 MEMORY_TOOLS 列表
MEMORY_TOOLS.append({
    "type": "function",
    "function": {
        "name": "get_weekly_summary",
        "description": "Get training summary for a specific week",
        # ... 参数
    }
})

# 添加到 FUNCTION_MAP
FUNCTION_MAP["get_weekly_summary"] = get_weekly_summary
```

### 修改 Assistant 的指令 {#modify-assistant-instructions}

编辑 `openai_coach.py`，修改教练的个性或行为：

```python
assistant = client.beta.assistants.create(
    name="Your Custom Coach",
    instructions="Your custom instructions here...",
    model="gpt-4o-mini",
    tools=MEMORY_TOOLS
)
```

## 使用场景 {#use-cases}

这种模式适用于任何需要记忆的应用：

1. **客户支持智能体**：记住以往的对话和问题
2. **个人助手**：记住偏好、日程安排和过往决定
3. **教育辅导智能体**：跟踪长期学习进度
4. **健康教练**：监测习惯、进度和目标（如本示例）
5. **销售助手**：记住客户互动和偏好

## 集成模式 {#integration-pattern}

**为自己的 OpenAI 智能体添加 Hindsight 记忆：**

1. 定义调用 Hindsight API 的函数工具。
2. 将这些工具注册到 OpenAI Assistant。
3. 实现函数处理程序，执行 Hindsight 查询。
4. 由 OpenAI Assistant 决定何时检索记忆。

主要优势：**职责分离**

- OpenAI = 对话逻辑
- Hindsight = 记忆存储、检索、时序查询和实体关联

## 何时采用此方案，何时直接使用 Hindsight {#when-to-use-this-vs-standard-hindsight}

**以下情况适合使用 OpenAI + Hindsight（本示例）：**

- 你希望使用 OpenAI 的对话能力。
- 你已经在使用 OpenAI 智能体。
- 你希望明确控制何时检索记忆。
- 你希望将 Hindsight 与其他 OpenAI 功能结合使用。

**以下情况适合直接使用 Hindsight：**

- 你希望采用完整的记忆优先方案。
- 你希望自动检索记忆并形成意见。
- 你希望使用不同的 LLM 服务提供方，而不局限于 OpenAI。
- 你希望使用 `/think` 端点提供的一体化方案。

## 学习要点 {#learning-points}

运行本演示后，你将了解：

1. 如何为任意 OpenAI 智能体添加完善的记忆能力
2. 函数调用如何连接 LLM 与记忆系统
3. 如何通过函数工具执行时序语义查询
4. LLM 与记忆系统集成的真实场景模式

## 核心文件 {#core-files}

- `demo_conversational.py`：演示偏好学习和目标跟踪的对话应用
- `openai_coach.py`：集成流式响应和记忆功能的 OpenAI Assistant 封装
- `memory_tools.py`：通过函数调用连接 Hindsight API 的工具
- `.openai_assistant_id`：保存的 Assistant ID（自动生成，已加入 gitignore）

## 常见问题 {#common-issues}

**“OPENAI_API_KEY 未设置”**
```bash
export OPENAI_API_KEY=your_api_key_here
```

**“找不到智能体”**
- 确认已创建 Hindsight 的 `fitness-coach` 智能体。

**“连接被拒绝”**
- 确认 Hindsight API 正在 `localhost:8888` 上运行。

## 后续步骤 {#next-steps}

1. 运行演示，了解其工作方式。
2. 尝试与教练对话：`python openai_coach.py`
3. 记录自己的训练和膳食。
4. 尝试提出不同的问题。
5. 根据自己的使用场景添加自定义函数工具。

---

**构建所用技术：**

- OpenAI Assistants API
- Hindsight（时序语义记忆）
- 用于集成的函数调用

---
