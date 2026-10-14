---
sidebar_position: 6
---

# CrewAI + Hindsight 记忆 {#crewai--hindsight-memory}


:::info 完整应用
这是一个展示 Hindsight 集成方式的完整可运行应用。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/crewai-memory)
:::


为 CrewAI 团队提供持久的长期记忆。多次运行同一个团队，观察它如何在先前运行中学到的内容之上继续工作。

## 这展示了什么 {#what-this-demonstrates}

- **可直接接入的记忆后端**：通过 `hindsight-crewai` 为 CrewAI 提供
- **跨运行持久记忆**：团队会记住之前的研究内容
- **Reflect（反思）工具**：智能体可主动对过去的记忆进行推理
- **记忆库任务说明**：指导 Hindsight 如何整理记忆

## 架构 {#architecture}

```
运行 1：“Research Rust benefits”
    │
    ├─ 研究员智能体 ──► Hindsight Reflect（没有先前记忆）
    │                    ──► 生成研究发现
    ├─ 撰写者智能体 ──► 汇总研究发现
    │
    └─ CrewAI 自动将任务输出存入 Hindsight
                    │
运行 2：“Compare Rust with Go”
    │
    ├─ 研究员智能体 ──► Hindsight Reflect（召回 Rust 研究内容！）
    │                    ──► 基于先前知识继续工作
    ├─ 撰写者智能体 ──► 撰写对比总结
    │
    └─ 记忆会在多次运行中不断积累
```

## 前置条件 {#prerequisites}

1. **运行中的 Hindsight**

   ```bash
   export OPENAI_API_KEY=your-key

   docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
     -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
     -e HINDSIGHT_API_LLM_MODEL=o3-mini \
     -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
     ghcr.io/vectorize-io/hindsight:latest
   ```

2. **OpenAI API 密钥**（供 CrewAI 的 LLM 使用）

   ```bash
   export OPENAI_API_KEY=your-key
   ```

3. **安装依赖**

   ```bash
   cd applications/crewai-memory
   pip install -r requirements.txt
   ```

   > **注意：**`hindsight-crewai` 未发布到 PyPI，需要通过 git 直接从
   > [Hindsight 仓库](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai) 安装。

## 快速开始 {#quick-start}

```bash
# 第一次运行：团队还没有记忆
python research_crew.py "What are the benefits of Rust?"

# 第二次运行：团队会记起关于 Rust 的研究
python research_crew.py "Compare Rust with Go"

# 第三次运行：团队会结合前两次运行中的上下文
python research_crew.py "Which language should I pick for a CLI tool?"

# 重置记忆并重新开始
python research_crew.py --reset
```

## 工作原理 {#how-it-works}

### 1. 配置 Hindsight {#1-configure-hindsight}

```python
from hindsight_crewai import configure, HindsightStorage

configure(hindsight_api_url="http://localhost:8888", verbose=True)

storage = HindsightStorage(
    bank_id="research-crew",
    mission="Track technology research findings, comparisons, and recommendations.",
)
```

### 2. 添加 Reflect 工具 {#2-add-the-reflect-tool}

`HindsightReflectTool` 让智能体能够主动查询记忆，并根据性格倾向进行综合推理：

```python
from hindsight_crewai import HindsightReflectTool

reflect_tool = HindsightReflectTool(bank_id="research-crew", budget="mid")

researcher = Agent(
    role="Researcher",
    goal="Research topics thoroughly",
    backstory="Always use hindsight_reflect to check what you already know.",
    tools=[reflect_tool],
)
```

### 3. 将组件接入 Crew {#3-wire-up-the-crew}

```python
from crewai.memory.external.external_memory import ExternalMemory

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, summary_task],
    external_memory=ExternalMemory(storage=storage),
)

crew.kickoff()
```

CrewAI 会自动执行以下操作：
- **查询记忆**：在每项任务开始时查询
- **存储任务输出**：每项任务完成后存储其输出

## 核心文件 {#core-files}

| 文件 | 说明 |
|------|-------------|
| `research_crew.py` | 包含研究员和撰写者智能体的完整可运行示例 |
| `requirements.txt` | Python 依赖项 |

## 自定义 {#customization}

### 为每个智能体使用独立记忆库 {#per-agent-memory-banks}

为每个智能体分配相互隔离的记忆：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    per_agent_banks=True,  # "my-crew-researcher", "my-crew-writer"
)
```

### 自定义记忆库解析器 {#custom-bank-resolver}

完全控制记忆库的命名方式：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    bank_resolver=lambda base, agent: f"{base}-{agent.lower()}" if agent else base,
)
```

### 配置选项 {#configuration-options}

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `bank_id` |（必填）| 记忆库标识符 |
| `mission` | `None` | 指导 Hindsight 如何组织记忆 |
| `budget` | `"mid"` | Recall 检索预算：low/mid/high |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `per_agent_banks` | `False` | 为每个智能体隔离记忆 |
| `tags` | `None` | 存储记忆时应用的标签 |
| `verbose` | `False` | 启用日志记录 |

完整 API 参考请参阅 [hindsight-crewai 文档](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai)。

## 常见问题 {#common-issues}

**“Connection refused”**
- 确认 Hindsight 正在 `localhost:8888` 上运行。

**“OPENAI_API_KEY not set”**
```bash
export OPENAI_API_KEY=your-key
```

**“No module named 'hindsight_crewai'”**
```bash
pip install -r requirements.txt
```

---

**使用以下技术构建：**
- [CrewAI](https://crewai.com) - 多智能体编排
- [hindsight-crewai](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai) - 为 CrewAI 提供 Hindsight 存储后端
- [Hindsight](https://github.com/vectorize-io/hindsight) - 面向 AI 智能体的长期记忆

---
