---
sidebar_position: 14
---

# 立场追踪器 {#stance-tracker}

:::info 完整应用
这是一个展示 Hindsight 集成方式的完整可运行应用。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/stancetracker)
:::

这是一个由 AI 驱动的应用，使用 Hindsight 记忆系统和网络抓取，跟踪政治候选人对各项议题的立场随时间的变化。

## 功能 {#features}

- **按地理位置筛选**：按国家、州/省和城市跟踪立场
- **跟踪多位候选人**：同时监测多位候选人
- **时间分析**：在可配置的时间范围内追踪历史立场
- **自动抓取**：按可配置的频率（每小时/每天/每周）定期收集内容
- **立场变化检测**：自动检测并突出显示立场变化
- **交互式时间线**：通过参考标注直观展示立场的演变
- **来源归属**：每条立场都有经过核验的来源链接和摘录

## 架构 {#architecture}

### 记忆系统（Hindsight 集成） {#memory-system-hindsight-integration}

此应用使用来自 `github.com/vectorize-io/hindsight` 的 Hindsight 记忆系统：

1. **记忆库**：每个抓取智能体都有自己的记忆库
2. **Retain（存入）**：存储候选人的陈述和网络抓取结果
3. **Recall（召回）**：通过语义搜索检索相关记忆
4. **Reflect（反思）**：利用存储的记忆生成上下文分析
5. **时间检索**：查询特定时间段内的记忆

### 技术栈 {#tech-stack}

- **前端**：Next.js 16、React、TypeScript、TailwindCSS
- **可视化**：使用 Recharts 绘制时间线图
- **后端**：Next.js API 路由
- **记忆系统**：Hindsight（来自 `github.com/vectorize-io/hindsight`）
- **数据库**：JSON 文件存储（无需数据库）
- **网络搜索**：Tavily API
- **LLM**：OpenAI、Anthropic 或 Groq（可配置）
- **调度**：node-cron

## 前置条件 {#prerequisites}

1. 正在运行的 **Hindsight API**（来自 `github.com/vectorize-io/hindsight`）
2. **API 密钥**：
   - Tavily API 密钥（用于网络搜索）
   - LLM 服务提供方的 API 密钥（OpenAI、Anthropic 或 Groq）

## 设置 {#setup}

### 1. 安装依赖 {#1-install-dependencies}

```bash
npm install
```

### 2. 配置环境 {#2-configure-environment}

将 `.env.example` 复制为 `.env`，并填写凭据：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# Hindsight API（来自 github.com/vectorize-io/hindsight）
HINDSIGHT_API_URL=http://localhost:8888

# Tavily API（用于网络搜索）
TAVILY_API_KEY=your_tavily_api_key_here

# LLM 服务提供方
LLM_PROVIDER=openai  # 或 anthropic、groq
LLM_API_KEY=your_llm_api_key_here
LLM_MODEL=gpt-4-turbo-preview
```

### 3. 启动 Hindsight {#3-start-hindsight}

从 `github.com/vectorize-io/hindsight` 克隆并运行 Hindsight：

```bash
# 克隆并运行 github.com/vectorize-io/hindsight
cd /path/to/hindsight
cargo run --bin hindsight-server
```

确认 Hindsight 正在 `http://localhost:8888` 运行。

### 4. 运行应用 {#4-run-the-application}

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 使用方法 {#usage}

### 创建跟踪会话 {#creating-a-tracking-session}

1. **设置地点**：输入国家（必填）、州/省和城市（选填）
2. **选择议题**：指定要跟踪的议题（例如“气候变化政策”）
3. **添加候选人**：输入要跟踪的候选人/政客姓名
4. **设置时间范围**：为初始分析设置历史起止日期
5. **设置频率**：选择检查更新的频率（每小时/每天/每周）
6. **开始跟踪**：点击“开始跟踪”以启动跟踪

### 查看结果 {#viewing-results}

- **时间线图**：显示每位候选人立场置信度随时间的变化
- **立场变化**：图表上的红色圆圈表示检测到的立场变化
- **点击数据点**：点击任意数据点，查看详细立场信息和来源
- **来源链接**：每条立场都包含指向原始来源的链接

### 管理会话 {#managing-sessions}

- **暂停/恢复**：暂时停止或重新启动跟踪
- **立即运行**：在预定时间之外立即触发一次更新
- **状态**：查看当前会话状态和执行频率

## API 端点 {#api-endpoints}

### 会话 {#sessions}

- `POST /api/sessions` - 创建跟踪会话
- `GET /api/sessions?id={id}` - 获取会话详情
- `GET /api/sessions` - 列出所有会话
- `PATCH /api/sessions` - 更新会话状态

### 立场 {#stances}

- `POST /api/stances` - 处理候选人的立场
- `GET /api/stances?sessionId={id}&candidate={name}` - 获取立场

### 调度器 {#scheduler}

- `POST /api/scheduler` - 控制会话调度
  - 操作：`start`、`stop`、`run`

## Hindsight 集成示例 {#hindsight-integration-examples}

### 1. 存储记忆 {#1-storing-memories}

```typescript
// 存储网络抓取结果
await hindsightClient.retain(bankId, articleContent, {
  context: 'web_search_result',
  timestamp: articleDate,
  metadata: { url: articleUrl }
});
```

### 2. 语义搜索 {#2-semantic-search}

```typescript
// 搜索相关记忆
const results = await hindsightClient.recall(bankId, query, {
  budget: 'high',
  maxTokens: 8192
});
```

### 3. 按时间筛选 {#3-temporal-filtering}

```typescript
// 查询截至指定时间点的记忆
const results = await hindsightClient.recall(bankId, query, {
  queryTimestamp: '2024-12-01T00:00:00Z'
});
```

### 4. 上下文分析 {#4-contextual-analysis}

```typescript
// 使用存储的记忆生成分析
const response = await hindsightClient.reflect(bankId,
  'What is the candidate\'s stance on this issue?',
  { budget: 'high' }
);
```

## 生产环境部署 {#production-deployment}

### 部署到 Vercel {#vercel-deployment}

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 在 Vercel 控制台中设置环境变量：
# - HINDSIGHT_API_URL
# - TAVILY_API_KEY
# - LLM_PROVIDER
# - LLM_API_KEY
# - LLM_MODEL
```

**注意**：在 Vercel 上，JSON 存储所用的 `data/` 目录内容不会持久保存。用于生产环境时，建议考虑使用持久化数据库或对象存储。

## 开发 {#development}

### 项目结构 {#project-structure}

```
stancetracker/
├── app/
│   ├── api/          # API 路由
│   ├── globals.css   # 全局样式
│   ├── layout.tsx    # 根布局
│   └── page.tsx      # 主页面
├── components/       # React 组件
├── lib/
│   ├── db/          # JSON 数据库工具
│   ├── hindsight-client.ts    # Hindsight API 客户端
│   ├── llm-client.ts       # LLM 服务提供方客户端
│   ├── web-scraper.ts      # Tavily 网络抓取器
│   ├── scraper-agent.ts    # 内容抓取智能体
│   ├── rag-system.ts       # 记忆检索
│   ├── stance-extractor.ts # 立场提取
│   ├── stance-pipeline.ts  # 主处理流程
│   └── scheduler.ts        # 作业调度
└── types/           # TypeScript 类型
```

### 添加新的 LLM 服务提供方 {#adding-new-llm-providers}

编辑 `lib/llm-client.ts` 并添加一个新方法：

```typescript
private async newProviderComplete(messages, options) {
  // 实现
}
```

## 限制 {#limitations}

- **网络搜索**：使用 Tavily API，该 API 有速率限制
- **来源核验**：对于关键应用，建议人工核验来源
- **立场提取**：基于 LLM，受模型能力限制
- **存储**：JSON 文件存储不适合大规模生产环境
- **速率限制**：请遵守 Tavily、Hindsight 和 LLM 服务提供方的 API 速率限制

## 后续改进 {#future-enhancements}

- [ ] 实时监测社交媒体
- [ ] 分析语音/视频转录文本
- [ ] 支持多种语言
- [ ] 集成情感分析
- [ ] 添加对比分析仪表板
- [ ] 导出为 CSV/PDF
- [ ] 立场变化时发送电子邮件通知
- [ ] 提供供第三方使用的公共 API

## 许可证 {#license}

MIT

## 支持 {#support}

如有问题或疑问，请查阅：
- Hindsight 文档：`github.com/vectorize-io/hindsight/README.md`
- Tavily API 文档：https://tavily.com/
- 项目问题：在代码仓库中提交 issue
