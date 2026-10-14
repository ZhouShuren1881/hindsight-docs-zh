---
sidebar_position: 5
---

# ClaimsIQ — 保险理赔分流智能体演示 {#claimsiq--insurance-claims-triage-agent-demo}


:::info 完整应用
这是一个完整且可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/claims-iq)
:::


这是一个通过多步工作流处理保险理赔的 AI 智能体。随着 [Hindsight](https://github.com/anthropics/hindsight) 中不断积累记忆，智能体会从“新手菜鸟”成长为“经验丰富的专家”。

通过管线仪表板，可以实时观察智能体如何学习承保规则、理赔员分派方式和升级处理模式。

## 快速入门 {#quick-start}

### 1. 启动 Hindsight API（端口 8888） {#1-start-hindsight-api-port-8888}

```bash
docker run -p 8888:8888 ghcr.io/anthropics/hindsight:latest
```

### 2. 启动后端（端口 8000） {#2-start-backend-port-8000}

```bash
cd backend
pip install -r requirements.txt
./run.sh
```

### 3. 启动前端（端口 5173） {#3-start-frontend-port-5173}

```bash
cd frontend
npm install
npm run dev
```

### 4. 打开浏览器 {#4-open-browser}

访问 `http://localhost:5173`。

## 工作原理 {#how-it-works}

智能体使用 6 种工具处理保险理赔：

1. **分类**理赔类型（汽车、财产、洪水等）
2. **查询**保单详情
3. **检查**该保单类型适用的承保规则
4. **检查**欺诈迹象
5. **分派**合适的理赔员
6. **提交**决策以供验证

系统会根据核验依据验证每项决策。如果智能体出错（例如分派了错误的理赔员，或对承保范围作出错误判断），系统会拒绝该决策并给出反馈，为 Hindsight 提供学习信号。

## 智能体模式 {#agent-modes}

| 模式 | 说明 |
| --- | --- |
| **无记忆** | 基线模式：智能体处理每项理赔时都从头开始 |
| **Recall（召回）** | 处理理赔前注入过往理赔的原始事实 |
| **Reflect（反思）** | 注入由 LLM 综合生成的知识 |
| **心智模型** | 使用完整的 Hindsight 心智模型，并自动刷新 |

## 主要学习难点 {#key-learning-challenges}

- **水损与洪水损失**：Gold 保单承保水损（例如水管破裂），但不承保洪水损失（例如雨水或河水造成的损失）。智能体必须学会区分两者。
- **理赔员分派**：有 8 位理赔员，分别专长于不同领域、服务不同地区。智能体必须学会由谁处理什么理赔。
- **升级处理阈值**：理赔金额超过 $50K 时需要高级理赔员处理；超过 $100K 时需要经理审核。
- **欺诈检测**：存在多种欺诈迹象（如理赔金额接近限额、地址重复），发现后应转交欺诈专员处理。

## 环境变量 {#environment-variables}

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_MODEL` | `openai/gpt-4o` | 智能体使用的 LLM 模型 |
| `HINDSIGHT_API_URL` | `http://localhost:8888` | Hindsight API 地址 |
| `BACKEND_PORT` | `8000` | 后端服务端口 |
