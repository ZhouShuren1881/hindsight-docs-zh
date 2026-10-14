---
sidebar_position: 13
---

# Sanity CMS 博客记忆 {#sanity-cms-blog-memory}

:::info 完整应用
这是一个完整且可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/sanity-blog-memory)
:::

这是一个 Hindsight 实战示例，演示如何将 **Sanity CMS** 中的博客文章同步到 Hindsight 智能体记忆中，从而支持语义搜索、时间查询和 AI 内容分析。

## 功能 {#features}

- **博客文章同步**：自动将 Sanity 中的所有博客文章同步到 Hindsight。
- **基于文档的更新或插入**：使用 `document_id` 实现幂等同步；再次运行同步时会更新已有内容。
- **语义搜索**：通过自然语言查询查找相关内容。
- **时间查询**：询问“我在 2025 年 1 月写了什么？”
- **Reflect 洞察分析**：通过 AI 分析博客内容并生成洞见。
- **发现相关内容**：利用语义相似度，为“相关文章”功能提供支持。

## 架构 {#architecture}

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Sanity CMS    │───────▶│    同步脚本      │───────▶│   Hindsight     │
│   (内容)        │  GROQ   │   (TypeScript)  │  HTTP   │   (记忆)        │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────────┐
                                                        │                 │
                                                        │   你的应用      │
                                                        │   - Recall      │
                                                        │   - Reflect     │
                                                        │                 │
                                                        └─────────────────┘
```

## 快速开始 {#quick-start}

### 1. 启动 Hindsight {#1-start-hindsight}

选择你偏好的 LLM 服务提供方：

**方案 A：使用 Docker Compose（推荐）**

```bash
# 设置 API 密钥
export OPENAI_API_KEY=sk-...
# 或
export GOOGLE_API_KEY=...  # Gemini（提供免费套餐）
# 或
export GROQ_API_KEY=...    # Groq（提供免费套餐）

# 启动 Hindsight
docker compose up -d
```

**方案 B：直接使用 Docker**

```bash
export OPENAI_API_KEY=sk-...

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API**：http://localhost:8888
- **控制台界面**：http://localhost:9999

### 2. 配置环境 {#2-configure-environment}

```bash
# 复制示例配置
cp .env.example .env

# 填入你的配置值
nano .env
```

必需的设置：

```bash
# Hindsight
HINDSIGHT_API_URL=http://localhost:8888
HINDSIGHT_BANK_ID=blog-memory

# Sanity CMS
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
```

### 3. 安装依赖 {#3-install-dependencies}

```bash
npm install
```

### 4. 同步博客文章 {#4-sync-your-blog-posts}

```bash
npm run sync
```

预期输出：

```
=======================================
  Sanity -> Hindsight Blog Sync
=======================================

Setting up memory bank...
Memory bank "blog-memory" ready

Fetching posts from Sanity CMS...
Found 10 posts to sync

Syncing posts to Hindsight...
  [1/10] "Why I Chose Qwik"... done
  [2/10] "Building AI Agents"... done
  ...

=======================================
  Sync Complete
=======================================
  Synced: 10 posts
```

### 5. 查询内容 {#5-query-your-content}

```bash
npm run query
```

## 查询示例 {#query-examples}

### 语义搜索 {#semantic-search}

使用自然语言查找相关内容：

```typescript
import { recallMemory } from './hindsight-client.js';

// 查找有关 AI 智能体的文章
const result = await recallMemory('AI agents and automation', {
  budget: 'mid',
  maxTokens: 2048,
});

console.log(`Found ${result.results.length} relevant posts`);
```

### 时间查询 {#temporal-queries}

询问特定时间段的内容：

```typescript
// 2025 年 1 月的文章
const result = await recallMemory('What did I write about in January 2025?', {
  queryTimestamp: '2025-01-31T23:59:59Z',
});
```

### Reflect 洞察分析 {#reflect-for-insights}

通过 AI 分析内容并生成洞见：

```typescript
import { reflectOnMemory } from './hindsight-client.js';

// 分析博客主题
const insights = await reflectOnMemory(
  'What are the main themes of my blog? What topics do I write about most?',
  { budget: 'high' }
);

console.log(insights.text);
```

### 发现相关内容 {#related-content-discovery}

为“相关文章”功能提供支持：

```typescript
// 查找与某篇文章相似的文章
const related = await recallMemory(
  'Find posts related to "Why I Chose Qwik for My Personal Website"',
  { budget: 'mid' }
);
```

## 记忆结构 {#memory-structure}

每篇博客文章都会连同丰富的元数据一起存储，以便更好地召回：

```
# Blog Post: {title}

**Published:** {date}
**URL:** {base_url}/blog/{slug}
**Tags:** {tags}
**Reading Time:** {reading_time}

## Description
{description}

## Content
{full_content}
```

主要特性：

- **document_id**：`post:{slug}`，用于在重新同步时更新已有文档。
- **context**：`blog-post`，用于对记忆类型进行分类。
- **timestamp**：文章发布日期，用于支持时间查询。

## 使用场景 {#use-cases}

### 1. AI 博客搜索 {#1-ai-powered-blog-search}

用语义理解替代关键词搜索：

```typescript
// 旧方式：关键词匹配
const results = posts.filter(p => p.title.includes('React'));

// 新方式：语义理解
const result = await recallMemory('frontend framework tutorials');
```

### 2. 内容推荐引擎 {#2-content-recommendation-engine}

生成个性化推荐：

```typescript
const recommendations = await reflectOnMemory(
  'Based on a reader interested in "AI automation", recommend related posts'
);
```

### 3. 写作助手 {#3-writing-assistant}

根据已有内容获取选题建议：

```typescript
const suggestions = await reflectOnMemory(
  'What topics should I write about next? What gaps exist in my content?'
);
```

### 4. 内容分析 {#4-content-analytics}

分析博客内容随时间的演变：

```typescript
const analysis = await reflectOnMemory(
  'How have my writing topics evolved over the past year?'
);
```

## 配置 {#configuration}

### 环境变量 {#environment-variables}

| 变量 | 说明 | 默认值 |
|----------|-------------|---------|
| `HINDSIGHT_API_URL` | Hindsight API 端点 | `http://localhost:8888` |
| `HINDSIGHT_BANK_ID` | 记忆库标识符 | `blog-memory` |
| `SANITY_PROJECT_ID` | 你的 Sanity 项目 ID | （必需） |
| `SANITY_DATASET` | Sanity 数据集名称 | `production` |
| `SANITY_API_TOKEN` | Sanity API 令牌（用于私有数据集） | （无） |
| `SANITY_API_VERSION` | Sanity API 版本 | `2024-01-09` |
| `SITE_URL` | 博客的基础 URL | `https://example.com` |

### 记忆库性格倾向 {#memory-bank-disposition}

记忆库的性格倾向配置针对博客内容进行了优化：

```typescript
{
  skepticism: 2,   // 倾向信任：博客内容具有权威性
  literalism: 4,   // 倾向按字面解读：准确内容很重要
  empathy: 3,      // 保持平衡
}
```

## 扩展到其他 CMS 平台 {#extending-for-other-cms-platforms}

这种模式可以适配任何 CMS。主要组成部分如下：

### 1. CMS 客户端 {#1-cms-client}

将 `sanity-client.ts` 替换为适用于你的 CMS 的客户端：

```typescript
// contentful-client.ts
import { createClient } from 'contentful';

export async function getAllPosts(): Promise<BlogPost[]> {
  const client = createClient({...});
  const entries = await client.getEntries({ content_type: 'blogPost' });
  return entries.items.map(transformPost);
}
```

### 2. 内容转换 {#2-content-transformation}

确保内容格式适合语义搜索：

```typescript
function formatPostContent(post: BlogPost): string {
  return `# ${post.title}
  
**Published:** ${post.date}
...
${post.content}`;
}
```

### 3. 文档 ID 策略 {#3-document-id-strategy}

使用一致的文档 ID，以支持更新或插入：

```typescript
await retainBlogPost(content, {
  documentId: `post:${post.slug}`,  // 唯一且稳定的标识符
  timestamp: post.date,
});
```

## 故障排查 {#troubleshooting}

### 出现“Connection refused”错误 {#connection-refused-error}

确认 Hindsight 正在运行：

```bash
docker compose up -d
curl http://localhost:8888/health
```

### 同步时“未找到文章” {#no-posts-found-during-sync}

检查 Sanity 配置：

```bash
# 验证项目 ID
echo $SANITY_PROJECT_ID

# 测试 GROQ 查询
npx sanity query '*[_type == "post"][0..2]{title}'
```

### Recall/Reflect 响应缓慢 {#slow-recallreflect-responses}

首次查询较慢是正常的，因为 Hindsight 需要生成嵌入向量。后续查询会更快。将 `budget` 设为 `'low'` 可以加快响应，但会降低召回质量。

## 资源 {#resources}

- [Hindsight 文档](https://hindsight.vectorize.io/)
- [Hindsight GitHub 仓库](https://github.com/vectorize-io/hindsight)
- [Sanity CMS 文档](https://www.sanity.io/docs)
- [Hindsight 实战示例集](https://github.com/vectorize-io/hindsight-cookbook)

## 许可证 {#license}

MIT
