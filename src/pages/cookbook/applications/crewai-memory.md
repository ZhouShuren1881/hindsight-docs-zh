---
sidebar_position: 6
---

# CrewAI + Hindsight 记忆 {#crewai--hindsight-memory}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/crewai-memory)
:::


为您的CrewAI团队提供持久的长期记忆。多次运行一个团队，观察它在之前运行中学到的知识的基础上进行构建。

## 这说明了什么 {#what-this-demonstrates}

- **可直接接入的记忆后端** 为CrewAI来自`hindsight-crewai`
- **跨运行持久记忆** - 工作人员记住之前的研究
- **反思工具** - 智能体明确推理过去的记忆
- **记忆库目标** - 指导如何Hindsight整理记忆

## 建筑 {#architecture}

```
Run 1: "研究 Rust 的好处"
    │
    ├─ Researcher agent ──► Hindsight reflect (no prior memories)
    │                        ──► produces research findings
    ├─ Writer agent ────────► summarizes findings
    │
    └─ CrewAI auto-stores task outputs to Hindsight
                    │
Run 2: "比较 Rust 和 Go"
    │
    ├─ Researcher agent ──► Hindsight reflect (recalls Rust research!)
    │                        ──► builds on prior knowledge
    ├─ Writer agent ────────► writes comparative summary
    │
    └─ Memories accumulate across runs
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

2. **OpenAI API 密钥**（对于CrewAI的LLM)

   ```bash
   export OPENAI_API_KEY=your-key
   ```

3. **安装依赖**

   ```bash
   cd applications/crewai-memory
   pip install -r requirements.txt
   ```

   > **注意：**`hindsight-crewai` 不在 PyPI 上 — 它是直接从
   > [Hindsight 代码仓库](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai) 通过 git。

## 快速入门 {#quick-start}

```bash
#第一次运行 - 船员还没有记忆
python research_crew.py "Rust 有什么好处？"

#第二次运行 - 工作人员记得 Rust 研究
python research_crew.py "比较 Rust 和 Go"

#第三次运行 - 工作人员从之前的两次运行中获得了背景信息
python research_crew.py "我应该为 CLI 工具选择哪种语言？"

#重置记忆并重新开始
python research_crew.py --reset
```

## 它是如何工作的 {#how-it-works}

### 1。配置Hindsight {#1-configure-hindsight}

```python
from hindsight_crewai import configure, HindsightStorage

configure(hindsight_api_url="http://localhost:8888", verbose=True)

storage = HindsightStorage(
    bank_id="research-crew",
    mission="跟踪技术研究结果、比较和建议。",
)
```

### 2。添加预计工具 {#2-add-the-reflect-tool}

`HindsightReflectTool` 让智能体通过处置感知综合显式查询他们的记忆：

```python
from hindsight_crewai import HindsightReflectTool

reflect_tool = HindsightReflectTool(bank_id="research-crew", budget="mid")

researcher = Agent(
    role="Researcher",
    goal="彻底研究课题",
    backstory="始终使用hindsight_reflect检查您已经知道的内容。",
    tools=[reflect_tool],
)
```

### 3。连接船员 {#3-wire-up-the-crew}

```python
from crewai.memory.external.external_memory import ExternalMemory

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, summary_task],
    external_memory=ExternalMemory(storage=storage),
)

crew.kickoff()
```

CrewAI 自动：
- **查询记忆** 在每个任务开始时
- **存储任务输出**

## 核心文件 {#core-files}

|文件|说明|
|------|-------------|
|`research_crew.py`|研究员+作家智能体的完整工作示例|
|`requirements.txt`|Python 依赖项|

## 定制 {#customization}

### 每智能体记忆库 {#per-agent-memory-banks}

给予每个智能体独立的记忆：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    per_agent_banks=True,  # "my-crew-researcher", "my-crew-writer"
)
```

### 自定义记忆库解析器 {#custom-bank-resolver}

完全控制记忆库命名：

```python
storage = HindsightStorage(
    bank_id="my-crew",
    bank_resolver=lambda base, agent: f"{base}-{agent.lower()}" if agent else base,
)
```

### 配置选项 {#configuration-options}

|参数|默认|说明|
|-----------|---------|-------------|
|`bank_id`|（必填）|记忆 记忆库标识符|
|`mission`|`None`|指导Hindsight如何组织记忆|
|`budget`|`"mid"`|记忆召回预算：low/mid/high|
|`max_tokens`|`4096`|记忆识别结果的最大令牌数|
|`per_agent_banks`|`False`|每个智能体隔离记忆|
|`tags`|`None`|存储时应用的标签|
|`verbose`|`False`|启用日志记录|

参见[hindsight-crewai 文档](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai) 完整版API参考。

## 常见问题 {#common-issues}

**"Connection refused"**
- 确保Hindsight运行于 `localhost:8888`

**"OPENAI_API_KEY not set"**
```bash
export OPENAI_API_KEY=your-key
```

**"No module named 'hindsight_crewai'"**
```bash
pip install -r requirements.txt
```

---

**使用以下技术构建：**
- [CrewAI](https://crewai.com) - 多智能体编排
- [hindsight-crewai](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/crewai) -Hindsight存储后端CrewAI
- [Hindsight](https://github.com/vectorize-io/hindsight) - 长期记忆AI智能体
