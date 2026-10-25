---
title: "Hindsight Cloud 新功能：上传文档文件"
authors: [benfrank241]
date: 2026-03-09T12:00
tags: [hindsight-cloud, release, memory]
hide_table_of_contents: true
description: "Hindsight Cloud 现已支持 PDF、Word、PowerPoint、Excel、图片和文本文件，可将其转化为智能体能够召回的记忆。"
---

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现在支持将文件直接上传到任意记忆库。支持 PDF、Word 文档、PowerPoint 演示文稿、Excel 电子表格、图像和纯文本文件。

<!-- truncate -->

## 两种提取方法 {#two-extraction-methods}

上传文件时，您可以选择 Hindsight 处理文件的方式：

**标准提取** 使用 [Markitdown](https://github.com/microsoft/markitdown) 从文档中提取文本。该方法免费，适用于 PDF、Word 文档和纯文本等以文本为主的文件。

**增强提取（Iris）** 使用 AI 驱动的处理来理解文档的结构和含义，适用于布局复杂的文件、扫描文档和图像。增强提取按 token 计费。

两种方法都会提取内容，并将其作为结构化记忆存入记忆库，以供 Recall（召回）和 Reflect（反思）查询使用。

## 工作原理 {#how-it-works}

1. 在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 中打开任意记忆库。
2. 点击上传按钮并选择文件。
3. 选择标准提取或增强提取（Iris）。
4. 在“文档操作”面板中通过状态指示器跟踪进度。

处理完成后，提取的内容就会成为记忆库的一部分。您的智能体可以像使用其他记忆一样，召回和反思文档内容。

## 支持的文件类型 {#supported-file-types}

- **PDF**：报告、白皮书、研究论文
- **Word 文档**（.docx）：会议记录、规格说明、提案
- **PowerPoint 演示文稿**（.pptx）：幻灯片、培训材料
- **Excel 电子表格**（.xlsx）：数据表、财务报告
- **图像**（.png、.jpg）：屏幕截图、示意图（建议使用增强提取）
- **纯文本**（.txt、.md）：日志、笔记、文档

## 其他新功能 {#what-else-is-new}

此次更新还接续了近期推出的另外两项功能：

**按记忆库限定范围的 API 密钥**（3 月 3 日）可将 API 密钥限制为只能访问指定的记忆库。这适用于多租户设置，例如每位客户或每个智能体只能访问自己的记忆。未经授权的访问尝试会返回 403 错误。

**MCP 支持**（2 月 13 日）为 Claude、Cursor 和 VS Code 等 AI 客户端添加了[模型上下文协议集成](/blog/2026/03/04/mcp-agent-memory)。您可以使用单记忆库模式连接，为智能体提供专用记忆；也可以使用多记忆库模式执行跨库操作。开箱即用提供 30 种工具。

## 开始使用 {#get-started}

文件上传现已在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 中提供。上传第一份文档，并针对它尝试一次 Recall（召回）查询，查看返回结果。
