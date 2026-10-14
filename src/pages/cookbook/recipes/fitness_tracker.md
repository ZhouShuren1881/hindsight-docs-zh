---
sidebar_position: 6
---

# 使用 Hindsight 记忆的健身教练 {#fitness-coach-with-hindsight-memory}


:::tip 运行此笔记本
此食谱提供交互式 Jupyter 笔记本。
[**在 GitHub 中打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/fitness_tracker.ipynb)
:::


这是一款个性化健身助手，可持续跟踪训练、饮食、恢复和进度，并据此提供结合上下文的建议。

## 功能 {#features}
- 记录训练课程、训练动作和使用重量
- 跟踪餐食和饮食偏好
- 监测恢复情况和睡眠模式
- 提供个性化训练建议

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 在本地通过 Docker 运行 Hindsight（见下方设置说明）

## 在本地启动 Hindsight {#start-hindsight-locally}

运行此笔记本前，请先在终端中启动 Hindsight：

```bash
export OPENAI_API_KEY="your-openai-api-key"

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 1. 安装依赖 {#1-install-dependencies}


```python
!pip install -q hindsight-client openai nest-asyncio
```

## 2. 配置 OpenAI API 密钥 {#2-configure-openai-api-key}

按提示输入 OpenAI API 密钥；Hindsight 和本演示都会使用该密钥。


```python
import getpass
import os

# 设置供 Hindsight 和本演示共同使用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

print("API key configured!")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from datetime import datetime
from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端（连接本地 Docker 实例）
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

USER_ID = "fitness-user-demo"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def log_workout(workout_details: str) -> str:
    """Log a workout session with timestamp."""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - WORKOUT LOG: {workout_details}",
        metadata={"category": "workout", "date": today},
    )
    return f"Logged workout for {today}: {workout_details}"


def log_meal(meal_details: str) -> str:
    """Log a meal with timestamp."""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - MEAL LOG: {meal_details}",
        metadata={"category": "nutrition", "date": today},
    )
    return f"Logged meal for {today}: {meal_details}"


def log_recovery(recovery_details: str) -> str:
    """Log recovery information (sleep, soreness, etc.)."""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - RECOVERY LOG: {recovery_details}",
        metadata={"category": "recovery", "date": today},
    )
    return f"Logged recovery for {today}: {recovery_details}"


def store_user_profile(profile_info: str) -> str:
    """Store user profile information."""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"USER PROFILE: {profile_info}",
        metadata={"category": "profile"},
    )
    return f"Stored profile info: {profile_info}"


def fitness_coach(user_query: str) -> str:
    """Get personalized fitness advice based on query and user history."""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"fitness workout diet recovery goals {user_query}",
        budget="high",
    )

    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(f"- {m.text}" for m in memories.results[:10])

    system_prompt = f"""You are a knowledgeable and supportive fitness coach.
You have access to the user's workout history, diet logs, recovery notes, and personal profile.

What you know about this user:
{memory_context if memory_context else "No history recorded yet."}

Provide personalized, actionable advice based on their:
- Training history and progress
- Dietary preferences and restrictions
- Recovery patterns
- Personal goals

Be encouraging but realistic. Reference their specific history when relevant."""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0.7,
        max_tokens=600,
    )

    advice = response.choices[0].message.content

    hindsight.retain(
        bank_id=USER_ID,
        content=f"User asked: {user_query}\nCoach advised: {advice[:200]}...",
        metadata={"category": "coaching"},
    )

    return advice


def get_progress_report() -> str:
    """Generate a progress report based on workout history."""
    report = hindsight.reflect(
        bank_id=USER_ID,
        query="""Analyze this user's fitness journey:
        1. How consistent have they been with workouts?
        2. What progress have they made (weight lifted, exercises)?
        3. How is their recovery and sleep?
        4. What dietary patterns do you notice?
        5. What should they focus on next?""",
        budget="high",
    )
    return report.text if hasattr(report, 'text') else str(report)

print("Helper functions defined!")
```

## 5. 设置用户资料 {#5-set-up-user-profile}


```python
print("Setting up user profile...")

profile_data = [
    "Name: Anish, Age: 26, Height: 5'10\", Weight: 72kg",
    "Goal: Building lean muscle, started gym 6 months ago",
    "Routine: Push-pull-legs split, 5x per week",
    "Rest days: Wednesday and Sunday",
    "Dietary restriction: Mild lactose intolerance, uses almond milk",
    "Health note: Occasional knee pain, avoids deep squats",
    "Supplements: Whey protein (lactose-free), magnesium",
    "Sleep: Aims for 7+ hours, performance drops under 6 hours",
]

for info in profile_data:
    store_user_profile(info)
    print(f"  Stored: {info[:50]}...")
```

## 6. 记录训练历史 {#6-log-workout-history}


```python
print("Logging workout history...")

workouts = [
    "Push day: Bench press 3x8 @ 60kg, overhead press 4x12, tricep dips 3x10. Felt strong.",
    "Pull day: Deadlift 3x5 @ 80kg, barbell rows 4x10, bicep curls 3x12. Good session.",
    "Leg day: Leg press 4x12, hamstring curls 3x12, glute bridges 3x15. Knee felt okay.",
]

for workout in workouts:
    print(f"  {log_workout(workout)[:60]}...")

print("\nLogging recent meals...")
meals = [
    "Post-workout: Whey shake with almond milk, banana, oats",
    "Dinner: Grilled chicken, brown rice, steamed vegetables",
    "Snack: Greek yogurt (lactose-free) with berries",
]

for meal in meals:
    print(f"  {log_meal(meal)[:60]}...")

print("\nLogging recovery notes...")
recovery = [
    "Slept 7.5 hours, feeling well rested",
    "Some DOMS in legs from yesterday, using turmeric milk",
]

for note in recovery:
    print(f"  {log_recovery(note)[:60]}...")
```

## 7. 与健身教练对话 {#7-talk-to-your-fitness-coach}


```python
import time

print("=" * 60)
print("  Talking to your fitness coach...")
print("=" * 60)

queries = [
    "How much was I lifting for bench press recently?",
    "I slept poorly last night (only 5 hours). What should I do for today's workout?",
    "Suggest a post-workout meal that works with my dietary restrictions.",
    "My knee has been bothering me more. Any exercise modifications?",
]

for query in queries:
    print(f"\nUser: {query}")
    print("-" * 40)
    response = fitness_coach(query)
    print(f"Coach: {response}")
    time.sleep(1)
```

## 8. 生成进度报告 {#8-generate-progress-report}


```python
print("=" * 60)
print("  Progress Report")
print("=" * 60)
print(get_progress_report())
```

## 9. 尝试自己的查询 {#9-try-your-own-query}


```python
your_query = "What exercises should I do today?"  # Change this!

print(f"You: {your_query}")
print("-" * 40)
print(f"Coach: {fitness_coach(your_query)}")
```

## 10. 清理 {#10-cleanup}


```python
hindsight.close()
print("Client connection closed.")
```
