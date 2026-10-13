---
sidebar_position: 10
---

# 工具学习演示 {#tool-learning-demo}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/hindsight-tool-learning-demo)
:::


交互式 Streamlit 演示，展示 Hindsight 如何帮助法学硕士了解当工具名称不明确时应使用哪个工具。

## 问题 {#the-problem}

通过tool/function调用构建AI智能体时，工具名称和描述并不总是清晰的。 LLM 可能会在名称相似的工具之间随机选择，从而导致不正确的行为。

## 场景 {#the-scenario}

这个演示模拟了 **客户服务路由系统** 有两个通道：

|工具|描述（LLM 看到的内容）|实际目的（隐藏）|
|------|--------------------------------|------------------------|
|`route_to_channel_alpha`|“针对适当请求类型的到 Alpha 通道的路由”|财务问题（退款、账单、付款）|
|`route_to_channel_omega`|“针对适当请求类型的 Omega 通道路由”|技术问题（错误、功能、错误）|

描述是**刻意保持模糊**！在没有先验知识的情况下，LLM必须猜测哪个通道处理什么。

## 解决方案：与Hindsight一起学习 {#the-solution-learning-with-hindsight}

与Hindsight 记忆：
1. **存储路由反馈** 哪个通道处理哪种请求类型
2. **检索已学知识** 做出路由决策时
3. **持续正确路由**基于过去的经验

## 快速入门 {#quick-start}

### 先决条件 {#prerequisites}

1. **Hindsight 服务器** 跑步（Docker）：
```bash
docker run -d -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  ghcr.io/vectorize-io/hindsight:latest
```

2. **OpenAI API 密钥**：
```bash
export OPENAI_API_KEY=your-key-here
```

### 运行演示 {#run-the-demo}

```bash
./run.sh
```

或手动：
```bash
pip install -r requirements.txt
streamlit run app.py
```

## 如何使用演示 {#how-to-use-the-demo}

### 第 1 步：无记忆测试（基线） {#step-1-test-without-memory-baseline}

1. 选择一个**金融请求**（例如，“我需要退款......”）
2. 点击**路由请求**
3. 观察：“Without Hindsight”列可能会错误路由

### 第 2 步：路由第一个客户并学习 {#step-2-route-first-customer-and-learn}

1. 路由客户 → 两个法学硕士同时路由
2. 反馈自动存储到Hindsight
3. 等待〜5秒Hindsight索引记忆

### 步骤 3：用记忆进行测试 {#step-3-test-with-memory}

1. 选择另一个请求（财务或技术）
2. 点击**路由请求**
3. 观察：“With Hindsight”列现在应该正确路由！

### 第 4 步：查看统计信息 {#step-4-view-statistics}

- 查看“无记忆”与“有Hindsight”之间的准确度比较
- 查看测试历史记录以查看随时间的改进

## 演示功能 {#demo-features}

- **并列比较**：查看有或没有记忆的路由结果
- **预定义测试请求**：财务和技术场景
- **自定义请求**：输入您自己的客户请求
- **记忆浏览器**：直接查询存储的路由知识
- **实时统计**：跟踪精度提高

## 关键见解 {#key-insight}

> 即使工具名称和描述没有揭示其用途，Hindsight允许LLM至 **从经验中学习** 针对哪种类型的请求使用哪种工具。

这对于以下方面尤其有价值：
- 具有旧工具名称的企业系统
- 工具具有通用名称的多租户系统
- 需要学习组织特定工作流程的智能体

## 配置 {#configuration}

|设置|默认|说明|
|---------|---------|-------------|
|型号|gpt-4o-mini|LLM 路由决策模型|
|温度（无记忆）|0.7|基线测试的随机性|
|Hindsight API 网址|http://localhost:8888|Hindsight 服务器 URL|

## 文件 {#files}

- `app.py` - 主要Streamlit应用
- `requirements.txt` -Python依赖关系
- `run.sh` - 启动带有依赖性检查的脚本
- `README.md` - 这个文件
