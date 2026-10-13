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
  system: '你是具有长期记忆的助手。',
  prompt: '记住，我偏好深色模式和大字体。',
});
// [/docs:generate-text]

// [docs:stream-text]
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  tools,
  maxSteps: 5,
  system: '你是具有长期记忆的助手。',
  prompt: '我的显示偏好是什么？',
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
  system: '你是具有长期记忆的助手。',
});

const result = await agent.generate({
  prompt: '记住，我最喜欢的编辑器是 Neovim',
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
    system: '你是具有长期记忆的助手。',
    messages,
  }).toDataStreamResponse();
}
// [/docs:next-api-route]

// [docs:constructor-options]
const tools = createHindsightTools({
  client,
  bankId: userId,

  retain: {
    async: true,                        // 异步发出，默认 false
    tags: ['env:prod', 'app:support'],  // 附加到每条存储记忆
    metadata: { version: '2.0' },       // 附加到每条存储记忆
  },

  recall: {
    budget: 'high',                     // 深度 low | mid | high，默认 mid
    types: ['experience', 'world'],     // 限制事实类型，默认全部
    maxTokens: 2048,                    // token 预算上限，默认 API 值
    includeEntities: true,              // 包含实体观察，默认 false
    includeChunks: true,                // 包含来源分块，默认 false
  },

  reflect: {
    budget: 'mid',                      // 深度，默认 mid
  },

});

// [/docs:constructor-options]
