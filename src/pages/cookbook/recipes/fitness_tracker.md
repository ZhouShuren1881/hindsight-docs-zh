---
sidebar_position: 6
---

# 拥有 Hindsight 记忆的健身教练 {#fitness-coach-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/fitness_tracker.ipynb)
:::


个性化健身助手，持续跟踪训练、饮食、恢复和进度，提供结合上下文的建议。

## 功能 {#features}
- 记录训练动作和重量
- 跟踪饮食和偏好
- 观察恢复与睡眠模式
- 提供个性化训练建议

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行 Hindsight，配置见下文

## 本地启动 Hindsight {#start-hindsight-locally}

运行笔记本前，在终端启动 Hindsight：

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

按提示输入 OpenAI API 密钥，Hindsight 和演示共同使用。


```python
import getpass
import os

# 设置 Hindsight 与演示共同使用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("请输入 OpenAI API 密钥：")

print("API 密钥配置完成！")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from datetime import datetime
from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端，连接本地 Docker 实例
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

USER_ID = "fitness-user-demo"

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def log_workout(workout_details: str) -> str:
    """记录带时间戳的训练。"""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - 训练记录：{workout_details}",
        metadata={"category": "workout", "date": today},
    )
    return f"已记录 {today} 的训练：{workout_details}"


def log_meal(meal_details: str) -> str:
    """记录带时间戳的饮食。"""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - 饮食记录：{meal_details}",
        metadata={"category": "nutrition", "date": today},
    )
    return f"已记录 {today} 的饮食：{meal_details}"


def log_recovery(recovery_details: str) -> str:
    """记录睡眠、酸痛等恢复信息。"""
    today = datetime.now().strftime("%B %d, %Y")
    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today} - 恢复记录：{recovery_details}",
        metadata={"category": "recovery", "date": today},
    )
    return f"已记录 {today} 的恢复：{recovery_details}"


def store_user_profile(profile_info: str) -> str:
    """存储用户资料。"""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"用户资料：{profile_info}",
        metadata={"category": "profile"},
    )
    return f"已存储资料：{profile_info}"


def fitness_coach(user_query: str) -> str:
    """根据查询和历史提供个性化健身建议。"""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"健身 训练 饮食 恢复 目标 {user_query}",
        budget="high",
    )

    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(f"- {m.text}" for m in memories.results[:10])

    system_prompt = f"""你是知识丰富且给予支持的健身教练。
你可访问用户训练历史、饮食、恢复笔记和个人资料。

你对用户的了解：
{memory_context if memory_context else "尚无历史记录。"}

根据以下信息提供个性化、可执行的建议：
- 训练历史和进度
- 饮食偏好与限制
- 恢复模式
- 个人目标

鼓励用户，但保持现实；相关时引用具体历史。"""

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
        content=f"用户询问：{user_query}\n教练建议：{advice[:200]}...",
        metadata={"category": "coaching"},
    )

    return advice


def get_progress_report() -> str:
    """根据训练历史生成进度报告。"""
    report = hindsight.reflect(
        bank_id=USER_ID,
        query="""分析用户的健身历程：
        1. 训练是否持续？
        2. 重量和动作有何进展？
        3. 恢复和睡眠如何？
        4. 有哪些饮食模式？
        5. 接下来应关注什么？""",
        budget="high",
    )
    return report.text if hasattr(report, 'text') else str(report)

print("辅助函数定义完成！")
```

## 5. 设置用户资料 {#5-set-up-user-profile}


```python
print("正在设置用户资料……")

profile_data = [
    "姓名：Anish，26 岁，身高 5 英尺 10 英寸，体重 72 kg",
    "目标：增长精瘦肌肉，开始健身六个月",
    "计划：推、拉、腿分化，每周五次",
    "休息日：周三和周日",
    "饮食限制：轻度乳糖不耐受，使用杏仁奶",
    "健康备注：偶尔膝痛，避免深蹲到底",
    "补充剂：无乳糖乳清蛋白、镁",
    "睡眠：目标七小时以上，少于六小时表现下降",
]

for info in profile_data:
    store_user_profile(info)
    print(f"  已存储：{info[:50]}...")
```

## 6. 记录训练历史 {#6-log-workout-history}


```python
print("正在记录训练历史……")

workouts = [
    "推训练：卧推 3x8，60 kg；肩推 4x12；臂屈伸 3x10，感觉有力量。",
    "拉训练：硬拉 3x5，80 kg；杠铃划船 4x10；弯举 3x12，训练顺利。",
    "腿训练：腿举 4x12，腿弯举 3x12，臀桥 3x15，膝盖感觉正常。",
]

for workout in workouts:
    print(f"  {log_workout(workout)[:60]}...")

print("\n正在记录近期饮食……")
meals = [
    "训练后：杏仁奶乳清蛋白饮、香蕉、燕麦",
    "晚餐：烤鸡肉、糙米、蒸蔬菜",
    "加餐：无乳糖希腊酸奶配莓果",
]

for meal in meals:
    print(f"  {log_meal(meal)[:60]}...")

print("\n正在记录恢复情况……")
recovery = [
    "睡了 7.5 小时，休息充分",
    "昨天腿训练后有些延迟性肌肉酸痛，正在喝姜黄奶",
]

for note in recovery:
    print(f"  {log_recovery(note)[:60]}...")
```

## 7. 与健身教练对话 {#7-talk-to-your-fitness-coach}


```python
import time

print("=" * 60)
print("  与健身教练对话……")
print("=" * 60)

queries = [
    "最近卧推使用多大重量？",
    "昨晚只睡五小时，今天训练应如何安排？",
    "推荐符合我饮食限制的训练后餐食。",
    "膝盖最近更不舒服，动作应如何调整？",
]

for query in queries:
    print(f"\n用户：{query}")
    print("-" * 40)
    response = fitness_coach(query)
    print(f"教练：{response}")
    time.sleep(1)
```

## 8. 生成进度报告 {#8-generate-progress-report}


```python
print("=" * 60)
print("  进度报告")
print("=" * 60)
print(get_progress_report())
```

## 9. 尝试自己的查询 {#9-try-your-own-query}


```python
your_query = "今天应练哪些动作？"  # 可修改此问题

print(f"你：{your_query}")
print("-" * 40)
print(f"教练：{fitness_coach(your_query)}")
```

## 10. 清理 {#10-cleanup}


```python
hindsight.close()
print("客户端连接已关闭。")
```
