---
sidebar_position: 5
---

# ClaimsIQ — 保险索赔分类智能体演示 {#claimsiq--insurance-claims-triage-agent-demo}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/claims-iq)
:::


安AI通过多步骤工作流程处理保险索赔的智能体。智能体从“困惑的菜鸟”开始，成为“经验丰富的专家”，如[Hindsight](https://github.com/anthropics/hindsight)记忆积累。

观看智能体通过管道仪表板实时学习覆盖规则、调整器分配和升级模式。

## 快速入门 {#quick-start}

### 1。启动 Hindsight API（端口 8888） {#1-start-hindsight-api-port-8888}

```bash
docker run -p 8888:8888 ghcr.io/anthropics/hindsight:latest
```

### 2。启动后端（端口8000） {#2-start-backend-port-8000}

```bash
cd backend
pip install -r requirements.txt
./run.sh
```

### 3。启动前端（端口 5173） {#3-start-frontend-port-5173}

```bash
cd frontend
npm install
npm run dev
```

### 4。打开浏览器 {#4-open-browser}

导航至`http://localhost:5173`。

## 它是如何工作的 {#how-it-works}

智能体使用 6 种工具处理保险索赔：

1. **分类** 索赔类别（汽车、财产、洪水等）
2. **查询**保单详情
3. **检查承保范围** 策略类型规则
4. **检查欺诈**指标
5. **分派** 右侧调节器
6. **提交** 验证决定

系统根据真实情况验证每个决策。如果智能体犯了错误（错误的调节器、错误的覆盖呼叫），则决策将被拒绝并提供反馈——为 Hindsight 创建学习信号。

## 智能体模式 {#agent-modes}

|模式|说明|
|------|-------------|
|**无记忆**|基线 — 智能体从每一项声明开始|
|**记忆召回**|在处理之前注入的过去索赔的原始事实|
|**反思**|LLM-注入综合知识|
|**心智模型**|完整Hindsight心智模型自动刷新|

## 主要学习挑战 {#key-learning-challenges}

- **水损与洪水**：黄金保单承保水灾（水管爆裂），但不承保洪水损坏（rain/river）。智能体必须学会这种微妙的区别。
- **理赔员分派**：8位不同专业、不同地区的调节员。智能体必须知道谁处理什么。
- **升级处理阈值**：超过 5 万美元的索赔需要高级理赔员；超过 10 万美元需要经理审核。
- **欺诈检测**：多个指标（接近限额索赔、重复地址）路由至欺诈专家。

## 环境变量 {#environment-variables}

|变量|默认|说明|
|----------|---------|-------------|
|`LLM_MODEL`|`openai/gpt-4o`|LLM 智能体模型|
|`HINDSIGHT_API_URL`|`http://localhost:8888`|Hindsight API 网址|
|`BACKEND_PORT`|`8000`|后端服务器端口|
