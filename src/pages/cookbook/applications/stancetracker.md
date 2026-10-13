---
sidebar_position: 14
---

# 姿态追踪器 {#stance-tracker}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/stancetracker)
:::


由AI驱动的应用程序，使用Hindsight记忆系统和网络抓取来跟踪政治候选人对问题的立场。

## 特点 {#features}

- **地理范围定位**：按国家跟踪立场，state/province，以及城市
- **多候选人跟踪**：同时监控多个候选人
- **时间分析**：具有可配置时间范围的历史姿态跟踪
- **自动抓取**：具有可配置频率的定期内容收集（hourly/daily/weekly)
- **立场变化检测**：自动检测并突出显示位置变化
- **交互时间线**：通过参考标注显示姿态演变的可视化图表
- **来源归属**：所有立场均与经过验证的来源相关并附有摘录

## 建筑 {#architecture}

### 记忆系统（Hindsight整合） {#memory-system-hindsight-integration}

此应用程序使用Hindsight记忆系统来自`github.com/vectorize-io/hindsight`：

1. **记忆库**：每个刮刀智能体都有自己的记忆库
2. **记忆存储**：存储候选人陈述和网页抓取结果
3. **记忆召回**：语义搜索以检索相关记忆
4. **反思**：使用存储的记忆生成上下文分析
5. **时间搜索**：查询特定时间段内的记忆

### 技术堆栈 {#tech-stack}

- **前端**：Next.js 16，React，TypeScript，TailwindCSS
- **可视化**：时间线图的重新图表
- **后端**：Next.jsAPI路线
- **记忆**：Hindsight（来自github.com/vectorize-io/hindsight)
- **数据库**：JSON文件存储（无需数据库）
- **网络搜索**：塔维利API
- **LLM**：OpenAI/Anthropic/Groq（可配置）
- **调度**：节点cron

## 先决条件 {#prerequisites}

1. **Hindsight API** 跑步（来自github.com/vectorize-io/hindsight)
2. **API 密钥**：
   - Tavily API 键（用于网页搜索）
   - LLM 提供商 API 密钥（OpenAI、Anthropic 或 Groq）

## 设置 {#setup}

### 1。安装依赖项 {#1-install-dependencies}

```bash
npm install
```

### 2。配置环境 {#2-configure-environment}

复制`.env.example`至`.env` 并填写您的凭据：

```bash
cp .env.example .env
```

编辑`.env`：

```env
# Hindsight API（来自 github.com/vectorize-io/hindsight）
HINDSIGHT_API_URL=http://localhost:8888

# Tavily API（用于网络搜索）
TAVILY_API_KEY=your_tavily_api_key_here

# LLM Provider
LLM_PROVIDER=openai  # or anthropic, groq
LLM_API_KEY=your_llm_api_key_here
LLM_MODEL=gpt-4-turbo-preview
```

### 3。开始Hindsight {#3-start-hindsight}

从github.com/vectorize-io/hindsight克隆并运行Hindsight：

```bash
# 克隆并运行 github.com/vectorize-io/hindsight
cd /path/to/hindsight
cargo run --bin hindsight-server
```

验证Hindsight运行于 `http://localhost:8888`

### 4。运行应用程序 {#4-run-the-application}

```bash
npm run dev
```

参观`http://localhost:3000`

## 使用 {#usage}

### 创建跟踪会话 {#creating-a-tracking-session}

1. **设置地点**：输入国家（必填），state/province，和城市（可选）
2. **选择主题**：指定要跟踪的问题（例如“气候变化政策”）
3. **添加候选人**：输入姓名candidates/politicians追踪
4. **配置时间范围**：设置历史start/end初步分析日期
5. **设置频率**：选择检查更新的频率（hourly/daily/weekly)
6. **开始跟踪**：点击“开始追踪”开始

### 查看结果 {#viewing-results}

- **时间线图**：显示每个候选人的立场随时间变化的置信度
- **立场变化**：图表上的红色圆圈表示检测到的位置变化
- **点击数据点**：点击任意点即可查看详细的立场信息和来源
- **来源链接**：每个立场都包含原始参考文献的链接

### 管理会话 {#managing-sessions}

- **暂停/恢复**：暂时停止或重新开始跟踪
- **立即运行**：在计划之外触发立即更新
- **状态**：查看当前会话状态和频率

## API 端点 {#api-endpoints}

### 课程 {#sessions}

- `POST /api/sessions` - 创建新的跟踪会话
- `GET /api/sessions?id={id}` - 获取会话详细信息
- `GET /api/sessions` - 列出所有会话
- `PATCH /api/sessions` - 更新会话状态

### 立场 {#stances}

- `POST /api/stances` - 处理候选人立场
- `GET /api/stances?sessionId={id}&candidate={name}` - 获取立场

### 调度程序 {#scheduler}

- `POST /api/scheduler` - 控制会话调度
  - 行动：`start`，`stop`，`run`

## Hindsight 集成示例 {#hindsight-integration-examples}

### 1。储存记忆 {#1-storing-memories}

```typescript
//存储网页抓取结果
await hindsightClient.retain(bankId, articleContent, {
  context: 'web_search_result',
  timestamp: articleDate,
  metadata: { url: articleUrl }
});
```

### 2。语义搜索 {#2-semantic-search}

```typescript
//搜索相关记忆
const results = await hindsightClient.recall(bankId, query, {
  budget: 'high',
  maxTokens: 8192
});
```

### 3。时间过滤 {#3-temporal-filtering}

```typescript
//查询截至特定时间点的记忆
const results = await hindsightClient.recall(bankId, query, {
  queryTimestamp: '2024-12-01T00:00:00Z'
});
```

### 4。情境分析 {#4-contextual-analysis}

```typescript
//使用存储的记忆生成分析
const response = await hindsightClient.reflect(bankId,
  'What is the candidate\'s stance on this issue?',
  { budget: 'high' }
);
```

## 生产部署 {#production-deployment}

### Vercel 部署 {#vercel-deployment}

```bash
#安装 Vercel CLI
npm i -g vercel

# Deploy
vercel

#在Vercel仪表板中设置环境变量：
# - HINDSIGHT_API_URL
# - TAVILY_API_KEY
# - LLM_PROVIDER
# - LLM_API_KEY
# - LLM_MODEL
```

**注意**：`data/`目录JSON存储将是短暂的Vercel。对于生产，请考虑使用持久数据库或对象存储。

## 发展 {#development}

### 项目结构 {#project-structure}

```
stancetracker/
├── app/
│   ├── api/          #API 路线
│   ├── globals.css   #全局样式
│   ├── layout.tsx    #根布局
│   └── page.tsx      #主页
├── components/       #React 组件
├── lib/
│   ├── db/          #JSON 数据库实用程序
│   ├── hindsight-client.ts    #Hindsight API 客户端
│   ├── llm-client.ts       #LLM 提供商客户端
│   ├── web-scraper.ts      #Tavily 网络爬虫
│   ├── scraper-agent.ts    #内容抓取
│   ├── rag-system.ts       #记忆检索
│   ├── stance-extractor.ts #立场分析
│   ├── stance-pipeline.ts  #主管道
│   └── scheduler.ts        #作业调度
└── types/           #TypeScript 类型
```

### 添加新的LLM提供商 {#adding-new-llm-providers}

编辑`lib/llm-client.ts`并添加一个新方法：

```typescript
private async newProviderComplete(messages, options) {
  // Implementation
}
```

## 限制 {#limitations}

- **网络搜索**：使用塔维利API有速率限制
- **来源验证**：建议关键应用进行手动验证
- **立场提取**：LLM，受型号限制
- **存储**：JSON文件存储不适合大规模生产使用
- **速率限制**：尊重APITavily 的费率限制，Hindsight，以及LLM提供商

## 未来的增强 {#future-enhancements}

- [ ] 实时社交媒体监控
- [ ] Speech/video 转录分析
- [ ] 多语言支持
- [ ] 情感分析集成
- [ ] 对比分析仪表板
- [ ] 导出到CSV/PDF
- [ ] 立场变化的电子邮件通知
- [ ] 公共 API 用于第三方集成

## 许可证 {#license}

MIT

## 支持 {#support}

如有问题或疑问，请检查：
- Hindsight文档：`github.com/vectorize-io/hindsight/README.md`
- 塔维利API文档：https://tavily.com/
- 项目问题：在存储库中创建问题
