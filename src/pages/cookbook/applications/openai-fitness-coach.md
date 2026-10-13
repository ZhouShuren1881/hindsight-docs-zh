---
sidebar_position: 11
---

# OpenAI智能体+Hindsight记忆整合 {#openai-agent--hindsight-memory-integration}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/openai-fitness-coach)
:::


健身教练示例演示如何使用**OpenAI Agents** 与 **Hindsight 作为记忆后端**。

## 这说明了什么 {#what-this-demonstrates}

此示例展示了：

- **OpenAI Assistants** 处理对话逻辑
- **Hindsight** 提供复杂的记忆存储和检索
- **函数调用** 将它们连接在一起
- **流式回复**用于实时交互（默认启用）
- **双向记忆** - 存储用户数据和教练观察
- **系统级后处理** - 自动意见存储以确保可靠性
- **时间与语义记忆** 通过功能工具查询
- **增强偏好学习** - 教练学习并尊重用户likes/dislikes
- **实际集成模式** 用于添加记忆AI智能体

## 建筑 {#architecture}

```
User: "今天跑了5K，不喜欢节奏跑"
    |
OpenAI Assistant
    |
Function Call: store_memory(workout + preference)
    |
Hindsight API (stores as world/agent)
    |
OpenAI Assistant: "我应该关注什么？"
    |
Function Call: retrieve_memories("锻炼和偏好")
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

|组件|标准演示|OpenAI 积分|
|-----------|---------------|-------------------|
|**对话**|Hindsight`/think`终点|OpenAI助理API|
|**记忆**|Hindsight（内置）|Hindsight（通过函数调用）|
|**LLM**|配置于Hindsight|OpenAIGPT-4|
|**观点形成**|自动`/think`|显式通过 `store_memory(type="opinion")`|
|**适用场景**|Hindsight-原生应用程序|将记忆集成到现有OpenAI智能体中|

## 快速入门 {#quick-start}

### 先决条件 {#prerequisites}

1. **OpenAI API 密钥**
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   ```

2. **Hindsight API 正在运行**
   ```bash
   #按照Hindsight设置说明启动API
   # Default: http://localhost:8888
   ```

3. **安装依赖**
   ```bash
   pip install openai requests
   ```

### 运行对话演示 {#run-the-conversational-demo}

```bash
cd openai-fitness-coach
export OPENAI_API_KEY=your_key_here
python demo_conversational.py
```

演示展示了：
1. **自然语言训练记录** - 通过对话告诉教练你做了什么
2. **偏好学习** - 快递likes/dislikes观看教练适应
3. **目标跟踪** - 设定目标、跟踪进度、实现里程碑
4. **双向记忆** - 您的活动和教练的建议都会被存储
5. **流式回复** - 查看实时出现的回复
6. **7 个交互阶段** - 从目标设定到成就认可

演示使用单独的智能体（`fitness-coach-demo`）以避免与真实数据混合。

## 使用 {#usage}

### 与你的教练聊天 {#chat-with-your-coach}

**交互模式：**
```bash
python openai_coach.py
```

**单个问题：**
```bash
python openai_coach.py "这周我训练了什么？"
```

## 它是如何工作的 {#how-it-works}

### 1。 记忆工具（`memory_tools.py`) {#1-memory-tools-memorytoolspy}

定义了OpenAI智能体可以调用的功能工具：

```python
retrieve_memories(query, fact_types, top_k)
search_workouts(after_date, before_date, workout_type)
get_nutrition_summary(after_date, before_date)
get_user_goals()
get_coach_opinions(about)
```

每个函数都会对Hindsight进行API调用以获取相关记忆。

### 2。OpenAI智能体 (`openai_coach.py`) {#2-openai-agent-openaicoachpy}

创建一个OpenAI助手：
- 健身教练指导
- 访问记忆功能工具
- 对话管理

当你提问时：
1. 用户消息发送至OpenAI助手
2. 助手决定调用哪些记忆函数
3. 函数从Hindsight获取数据
4. Assistant 使用检索到的上下文生成响应

### 3。函数调用流程 {#3-function-calling-flow}

```python
#用户问：“这周我跑了什么？”

#OpenAI 助理决定呼叫：
search_workouts(
    after_date="2024-11-18",
    workout_type="running"
)

#函数从Hindsight检索：
{
  "results": [
    {"text": "用户完成了 45 分钟的有氧运动：跑步..."},
    {"text": "用户完成了 60 分钟的有氧运动：跑步..."}
  ]
}

#OpenAI 助手生成响应：
"This week you've done two runs: a 45-minute run on Monday
and a longer 60-minute run on Wednesday. Great consistency!"
```

## 示例问题 {#example-questions}

尝试询问：

```bash
python openai_coach.py "这周我的训练怎么样？"
python openai_coach.py "根据我的锻炼情况，我今天应该休息吗？"
python openai_coach.py "我的营养如何支持我的目标？"
python openai_coach.py "我在实现目标方面取得了哪些进展？"
python openai_coach.py "比较我这个月和上个月的训练"
```

智能体会自动：
1. 识别它需要什么记忆
2. 调用相应的功能工具
3. 从Hindsight检索数据
4. 生成个性化响应

## 检索的记忆类型 {#memory-types-retrieved}

OpenAI智能体可以从Hindsight检索不同的记忆类型：

- **世界事实** (`fact_type: "world"`)：锻炼、膳食、活动
- **智能体事实** (`fact_type: "agent"`)：目标、意图
- **观点** (`fact_type: "opinion"`)：教练对模式的观察

## 定制 {#customization}

### 添加新功能工具 {#add-new-function-tools}

编辑`memory_tools.py` 添加新功能：

```python
def get_weekly_summary(week_offset: int = 0):
    """获取特定一周的摘要。"""
    # Implementation
    pass

# 加入 MEMORY_TOOLS 列表
MEMORY_TOOLS.append({
    "type": "function",
    "function": {
        "name": "get_weekly_summary",
        "description": "获取特定一周的训练总结",
        # ... parameters
    }
})

# 加入 FUNCTION_MAP
FUNCTION_MAP["get_weekly_summary"] = get_weekly_summary
```

### 修改助手指令 {#modify-assistant-instructions}

编辑 `openai_coach.py`，更改教练的风格或行为：

```python
assistant = client.beta.assistants.create(
    name="您的定制教练",
    instructions="您的自定义说明在这里...",
    model="gpt-4o-mini",
    tools=MEMORY_TOOLS
)
```

## 用例 {#use-cases}

此模式适用于任何需要记忆的应用程序：

1. **客户支持智能体** - 记住此前对话和问题
2. **个人助手** - 记住偏好、日程和此前决策
3. **教育辅导助手** - 跟踪一段时间内的学习进度
4. **健康教练** - 监控习惯、进度、目标（如本示例）
5. **销售助手** - 记住客户互动和偏好

## 整合模式 {#integration-pattern}

**为你的 OpenAI 智能体添加 Hindsight 记忆：**

1. 定义调用HindsightAPI的函数工具
2. 通过您的OpenAI助手注册
3. 实现函数处理程序来执行Hindsight查询
4. 让OpenAI助手决定何时检索记忆

主要好处：**职责分离**
- OpenAI = 对话逻辑
- Hindsight = 记忆存储、检索、时间查询、实体链接

## 何时使用此与标准Hindsight {#when-to-use-this-vs-standard-hindsight}

**以下情况使用 OpenAI 与 Hindsight（本示例）：**
- 你想要OpenAI的对话功能
- 您已经在使用OpenAI智能体
- 你想要明确控制何时检索记忆
- 您想要将Hindsight与其他OpenAI功能结合起来

**以下情况直接使用 Hindsight：**
- 您想要一个完整的记忆第一解决方案
- 你想要自动记忆检索和意见形成
- 您想使用不同的LLM提供商（不仅仅是OpenAI）
- 你想要`/think`端点的集成方法

## 学习要点 {#learning-points}

运行此演示后，您将了解：

1. 如何为任何OpenAI智能体添加复杂的记忆
2. 函数调用如何桥接法学硕士和记忆系统
3. 时间语义查询如何通过函数工具工作
4. LLM+记忆整合的真实世界模式

## 核心文件 {#core-files}

- `demo_conversational.py` - 展示偏好学习和目标跟踪的对话演示
- `openai_coach.py` -OpenAI具有流媒体和记忆集成的辅助包装器
- `memory_tools.py` - 桥接到的函数调用工具HindsightAPI
- `.openai_assistant_id` - 保存的助手 ID（自动生成，gitignored）

## 常见问题 {#common-issues}

**"OPENAI_API_KEY not set"**
```bash
export OPENAI_API_KEY=your_api_key_here
```

**"Agent not found"**
- 确保Hindsight健身教练智能体存在

**"Connection refused"**
- 确保 Hindsight API 在 localhost:8888 上运行

## 后续步骤 {#next-steps}

1. 运行演示以查看其实际效果
2. 尝试与教练聊天：`python openai_coach.py`
3. 记录您自己的锻炼和膳食
4. 尝试不同的问题
5. 为您的用例添加自定义功能工具

---

**使用以下技术构建：**
- OpenAI 助手API
- Hindsight（时间语义记忆）
- 集成函数调用
