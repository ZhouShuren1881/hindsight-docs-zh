# Hindsight v0.10 文档汉化版本

## 安装与构建

需要 Node.js 20 或更高版本。

构建 product。使用 `npm ci` 根据锁文件安装依赖（ci = Clean Install）。

```bash
npm ci
npm run build
```

本地开发（http://localhost:8300）

```bash
npm run dev
```

## 与原版的差异

1. 压缩了大量图片，并精简了构建产物的冗余部分
2. 使用了自行维护的 giotto 库（用于构建HTML图表）
