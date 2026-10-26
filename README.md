<div align="center">

![Hindsight Banner](./static/img/hindsight-github-banner.png)

[文档](https://zhoushuren1881.github.io/hindsight-docs-zh/) • [集成](https://zhoushuren1881.github.io/hindsight-docs-zh/integrations) • [实践手册](https://zhoushuren1881.github.io/hindsight-docs-zh/cookbook) • [基准测试](https://benchmarks.hindsight.vectorize.io/) • [论文](https://arxiv.org/abs/2512.12818) • [Hindsight Cloud](https://ui.hindsight.vectorize.io)

[![Release](https://github.com/vectorize-io/hindsight/actions/workflows/release.yml/badge.svg)](https://github.com/vectorize-io/hindsight/actions/workflows/release.yml)
[![Version](https://img.shields.io/pypi/v/hindsight-api?logo=python&logoColor=white&label=version&color=blue)](https://pypi.org/project/hindsight-api/)
[![PyPI Downloads](https://img.shields.io/pypi/dm/hindsight-client?logo=pypi&logoColor=white&label=PyPI&color=blue)](https://pypi.org/project/hindsight-client/)
[![NPM Downloads](https://img.shields.io/npm/dm/%40vectorize-io%2Fhindsight-client?logo=npm&logoColor=white&label=NPM&color=blue)](https://www.npmjs.com/package/@vectorize-io/hindsight-client)
[![Slack Community](https://img.shields.io/badge/Slack-Join%20Community-4A154B?logo=slack)](https://vectorize.io/slack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<br/>
<p align="center">
 <a href="https://www.star-history.com/vectorize-io/hindsight"><img src="https://api.star-history.com/badge?repo=vectorize-io/hindsight&type=rank" alt="Star History Rank" /> <img src="https://api.star-history.com/badge?repo=vectorize-io/hindsight&type=trending" alt="GitHub Trending Repository of the Day" /></a>
</p>

</div>

---

## Hindsight 社区中文文档

Hindsight 文档社区翻译版。对应的上游项目hash存放于项目根目录下的 [local-meta.json](./local-meta.json)。

## 什么是 Hindsight？

Hindsight™ 是一个智能体记忆系统，旨在打造能够随着时间推移不断学习、变得更智能的智能体。大多数智能体记忆系统侧重于召回历史对话。Hindsight 则致力于让智能体能够学习，而不只是记住信息。

它克服了检索增强生成（RAG）和知识图谱等其他技术的局限，在长期记忆任务上达到 SOTA。

## 安装与构建

需要 Node.js 20 或更高版本。

构建 product。使用 `npm ci` 根据锁文件安装依赖（ci = Clean Install）。

```bash
npm ci
npm run build
```

本地开发 [http://localhost:8300](http://localhost:8300)

```bash
npm run dev
```

## 与原版的差异

1. 压缩了大量图片，并精简了构建产物的冗余部分
2. 使用了自行维护的 giotto 库（用于构建HTML图表）
3. 大量 UI bug 修复
4. changelog 改为指向英语原文的链接
