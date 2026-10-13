---
title: "elizaOS 与 Hindsight 的长期记忆 |整合"
description: "赋予 elizaOS 智能体持久的长期记忆。 Hindsight 插件会在每次模型调用之前将相关记忆召回到提示中，并在每次调用后保留对话。"
---

# elizaOS {#elizaos}

`@vectorize-io/hindsight-eliza` 套餐赠送[elizaOS](https://github.com/elizaOS/eliza) 智能体长期记忆支持[Hindsight](https://hindsight.vectorize.io)。

它在您的智能体上注册两个组件：

- A**提供程序** (`HINDSIGHT_MEMORY`），在每次模型调用之前调用相关记忆并将其注入到提示中。
- 安**评估器** (`HINDSIGHT_RETAIN`）保留对话消息  每回合后Hindsight。

两者均默认启用，位于 elizaOS 现有记忆之上，并且故障安全 - 记忆服务故障永远不会阻止您的智能体响应。

[查看更新日志 →](/changelog/integrations/eliza)

## 安装 {#installation}

```bash
npm install @vectorize-io/hindsight-eliza @vectorize-io/hindsight-client
```

此软件包的目标`@elizaos/core``^1.7.2`（声明为对等依赖）。

## 使用 {#usage}

创建插件并将其添加到角色的插件列表中：

```ts
import { createHindsightPlugin } from "@vectorize-io/hindsight-eliza";
import { Hindsight } from "@vectorize-io/hindsight-client";

const hindsightPlugin = createHindsightPlugin({
  client: new Hindsight({ apiKey: process.env.HINDSIGHT_API_KEY }),
  recall: { budget: "high", includeEntities: true },
  retain: { tags: ["source:eliza"] },
});

export const character = {
  name: "Ada",
  plugins: [
    //...你的其他插件
    hindsightPlugin,
  ],
};
```

默认情况下，每个智能体消息都存储在记忆下 **记忆库** 由
消息`entityId`，给每个用户一个独立的记忆存储。

## 配置 {#configuration}

```ts
createHindsightPlugin({
  client,

  // 指定读写的记忆库。字符串表示所有会话使用同一个固定记忆库
  //消息；函数导出每条消息的记忆库。默认为
  //`message.entityId`（每个用户一个记忆库）。
  bank: (message) => message.entityId,

  recall: {
    enabled: true,            //设置 false 禁用记忆召回
    budget: "mid",            //“低”| “中”| “high”——延迟与深度
    types: ["world", "experience"], //限制事实类型
    maxTokens: 1000,          // 召回结果的 token 数上限
    includeEntities: false,   //包括实体 观察
    heading: "#相关长期记忆", //提示标题
  },

  retain: {
    enabled: true,            //设置 false 以禁用记忆存储
    async: true,              //即发即忘；永远不会增加转弯延迟
    tags: ["source:eliza"],   //每个保留记忆上都有标签
    metadata: { env: "prod" },
    includeAgentMessages: false, //还存储智能体自己的回复
  },
});
```

### 仅使用记忆召回或仅使用记忆存储 {#using-only-recall-or-only-retain}

用禁用任一侧 `recall.enabled: false`或`retain.enabled: false`。你
也可以直接使用构建组件 `createHindsightProvider` 和
`createHindsightEvaluator`如果你想自己将它们连接到插件中。

## 工作原理 {#how-it-works}

|组件|elizaOS 接缝|运行时|它的作用|
| --- | --- | --- | --- |
|`HINDSIGHT_MEMORY`|提供者|提示合成期间，模型调用之前|通话Hindsight`recall` 处理传入消息并将结果注入上下文中|
|`HINDSIGHT_RETAIN`|评估者|智能体处理转弯后|通话Hindsight`retain` 保存消息（以及可选的智能体的回复）|
