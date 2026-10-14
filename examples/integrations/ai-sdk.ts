/**
 * Hindsight AI SDK 集成示例
 * 这些片段通过 CodeSnippet 嵌入文档。
 */

// [docs:setup]
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { createHindsightTools } from '@vectorize-io/hindsight-ai-sdk';

const client = new HindsightClient({ baseUrl: 'http://localhost:8888' });

const tools = createHindsightTools({
  client,
  bankId: 'user-123',
});
// [/docs:setup]

// [docs:generate-text]
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools,
  maxSteps: 5,
  system: 'You are a helpful assistant with long-term memory.',
  prompt: 'Remember that I prefer dark mode and large fonts.',
});
// [/docs:generate-text]

// [docs:stream-text]
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  tools,
  maxSteps: 5,
  system: 'You are a helpful assistant with long-term memory.',
  prompt: 'What are my display preferences?',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
// [/docs:stream-text]

// [docs:tool-loop-agent]
import { generateText, ToolLoopAgent, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { createHindsightTools } from '@vectorize-io/hindsight-ai-sdk';

const client = new HindsightClient({ baseUrl: process.env.HINDSIGHT_API_URL! });

const agent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  tools: createHindsightTools({ client, bankId: 'user-123' }),
  stopWhen: stepCountIs(10),
  system: 'You are a helpful assistant with long-term memory.',
});

const result = await agent.generate({
  prompt: 'Remember that my favorite editor is Neovim',
});
// [/docs:tool-loop-agent]

// [docs:next-api-route]
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { createHindsightTools } from '@vectorize-io/hindsight-ai-sdk';

const hindsightClient = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL!,
});

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // 按请求创建工具，绑定当前用户的 bankId
  const tools = createHindsightTools({
    client: hindsightClient,
    bankId: userId,
  });

  return streamText({
    model: openai('gpt-4o'),
    tools,
    maxSteps: 5,
    system: 'You are a helpful assistant with long-term memory.',
    messages,
  }).toDataStreamResponse();
}
// [/docs:next-api-route]

// [docs:constructor-options]
const tools = createHindsightTools({
  client,
  bankId: userId,

  retain: {
    async: true,                        // fire-and-forget（默认值：false）
    tags: ['env:prod', 'app:support'],  // 始终附加到每条存入的记忆
    metadata: { version: '2.0' },       // 始终附加到每条存入的记忆
  },

  recall: {
    budget: 'high',                     // 检索深度：low | mid | high（默认值：mid）
    types: ['experience', 'world'],     // 限制事实类型，默认全部
    maxTokens: 2048,                    // 返回 token 上限（默认值：API 默认值）
    includeEntities: true,              // 包含实体观测（默认值：false）
    includeChunks: true,                // 包含原始来源文本分块（默认值：false）
  },

  reflect: {
    budget: 'mid',                      // 综合生成深度（默认值：mid）
  },

});

// [/docs:constructor-options]
