---
title: "Hindsight Cloud新功能：文档文件上传"
authors: [benfrank241]
date: 2026-03-09T12:00
tags: [hindsight-cloud, release, memory]
hide_table_of_contents: true
---

[Hindsight Cloud](https://ui.hindsight.vectorize.io)现在可以让您将文件直接上传到任何记忆库。 PDF、Word 文档、PowerPoint 演示文稿、Excel 电子表格、图像和纯文本文件均受支持。

<!-- truncate -->

## 两种提取方法 {#two-extraction-methods}

上传文件时，您可以选择Hindsight如何处理它：

**标准萃取** 使用 [降价](https://github.com/microsoft/markitdown) 从文档中提取文本。它是免费的，适用于 PDF、Word 文档和纯文本等文本较多的文件。

**增强提取（Iris）** 使用 AI 驱动的处理来理解文档的结构和含义。这对于复杂的布局、扫描的文档和图像非常有用。增强提取会产生按token收费。

两种方法都会提取内容并将其作为结构化记忆存储在记忆库中，为记忆召回和反思查询做好准备。

## 它是如何工作的 {#how-it-works}

1. 打开[Hindsight Cloud](https://ui.hindsight.vectorize.io)中任意记忆库
2. 单击上传按钮并选择您的文件
3. 选择标准或增强（Iris）提取
4. 文档操作面板通过状态指示器跟踪进度

处理完成后，提取的内容将成为您记忆库的一部分。您的智能体可以像任何其他记忆一样对文档内容进行记忆和反思。

## 支持的文件类型 {#supported-file-types}

- **PDF** -- 报告、白皮书、研究论文
- **Word文档** (.docx) -- 会议记录、规格、提案
- **PowerPoint 演示文稿** (.pptx) -- 幻灯片、培训材料
- **Excel 电子表格** (.xlsx) -- 数据表、财务报告
- **图片** (.png, .jpg) -- 屏幕截图、图表（建议增强提取）
- **纯文本** (.txt, .md) -- 日志、注释、文档

## 还有什么新内容 {#what-else-is-new}

此更新还遵循最近添加的另外两个内容：

**记忆库范围API键**（3 月 3 日）让您将 API 密钥限制到特定记忆库。这对于多租户设置非常有用，其中每个客户或智能体只能访问自己的记忆。未经授权的访问尝试会返回 403 错误。

**MCP 支持**（2 月 13 日）为 AI 客户端（例如 Claude、Cursor 和 VS Code）添加了 [模型上下文协议集成](/blog/2026/03/04/mcp-agent-memory)。您可以在单记忆库模式下连接以获得专用的智能体记忆，也可以在多记忆库模式下连接以进行跨记忆库操作，并提供 30 种开箱即用的工具。

## 开始 {#get-started}

[Hindsight Cloud](https://ui.hindsight.vectorize.io)现已支持文件上传。上传您的第一个文档并尝试对其进行记忆召回查询以查看结果。
