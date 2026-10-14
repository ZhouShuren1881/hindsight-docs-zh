---
sidebar_position: 10
---

# 工具学习演示 {#tool-learning-demo}


:::info 完整应用
这是一个展示 Hindsight 集成方式的完整可运行应用。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/hindsight-tool-learning-demo)
:::


这是一个交互式 Streamlit 演示，展示 Hindsight 如何帮助 LLM 在工具名称含义不明确时学会选择合适的工具。

## 问题 {#the-problem}

使用工具调用或函数调用构建 AI 智能体时，工具名称和描述并不总是清晰易懂。LLM 可能会在名称相似的工具之间随机选择，导致行为不正确。

## 场景 {#the-scenario}

此演示模拟了一个包含两个通道的**客户服务路由系统**：

| 工具 | 描述（LLM 看到的内容） | 实际用途（隐藏） |
|------|--------------------------------|------------------------|
| `route_to_channel_alpha` | “将适当类型的请求路由到 Alpha 通道” | 财务问题（退款、账单、付款） |
| `route_to_channel_omega` | “将适当类型的请求路由到 Omega 通道” | 技术问题（缺陷、功能、错误） |

这些描述**有意保持模糊**！如果没有先验知识，LLM 就必须猜测各个通道分别处理什么问题。

## 解决方案：借助 Hindsight 学习 {#the-solution-learning-with-hindsight}

借助 Hindsight 记忆：
1. **存储路由反馈**，记录哪个通道处理哪类请求
2. **检索已学到的知识**，用于作出路由决策
3. **根据过去的经验持续正确路由**

## 快速开始 {#quick-start}

### 前置条件 {#prerequisites}

1. **运行中的 Hindsight 服务器**（Docker）：
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

也可以手动运行：
```bash
pip install -r requirements.txt
streamlit run app.py
```

## 如何使用演示 {#how-to-use-the-demo}

### 第 1 步：在没有记忆的情况下测试（基线） {#step-1-test-without-memory-baseline}

1. 选择一个**财务请求**（例如，“I need a refund...”）
2. 点击 **Route Request**
3. 观察结果：“Without Hindsight” 列可能会路由错误

### 第 2 步：路由首位客户并学习 {#step-2-route-first-customer-and-learn}

1. 路由一位客户 → 两个 LLM 同时进行路由
2. 系统会自动将反馈存储到 Hindsight
3. 等待约 5 秒，让 Hindsight 为记忆建立索引

### 第 3 步：使用记忆进行测试 {#step-3-test-with-memory}

1. 选择另一个请求（财务或技术类）
2. 点击 **Route Request**
3. 观察结果：此时 “With Hindsight” 列应能正确路由！

### 第 4 步：查看统计信息 {#step-4-view-statistics}

- 查看 “Without Memory” 与 “With Hindsight” 两列的准确率对比
- 查看测试历史，了解准确率随时间的变化

## 演示功能 {#demo-features}

- **并排比较**：查看启用和未启用记忆时的路由结果
- **预定义测试请求**：涵盖财务和技术场景
- **自定义请求**：输入自己的客户请求
- **记忆浏览器**：直接查询已存储的路由知识
- **实时统计信息**：跟踪准确率的提升

## 关键见解 {#key-insight}

> 即使工具名称和描述没有揭示其用途，Hindsight 也能让 LLM **从经验中学习**，了解不同类型的请求应使用哪个工具。

这对于以下场景尤其有价值：
- 使用旧工具名称的企业系统
- 工具名称通用的多租户系统
- 需要学习组织专属工作流的智能体

## 配置 {#configuration}

| 设置 | 默认值 | 说明 |
|---------|---------|-------------|
| 模型 | gpt-4o-mini | 用于路由决策的 LLM 模型 |
| 温度（无记忆） | 0.7 | 基线测试的随机程度 |
| Hindsight API URL | http://localhost:8888 | Hindsight 服务器 URL |

## 文件 {#files}

- `app.py` - Streamlit 主应用
- `requirements.txt` - Python 依赖项
- `run.sh` - 带依赖检查的启动脚本
- `README.md` - 此应用的说明文件
