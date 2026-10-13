# 侧边栏图标 {#sidebar-icons}

此目录包含侧边栏导航项使用的 SVG 图标。

## 所需图标 {#required-icons}

### 客户端图标 {#client-icons}
- `python.svg` - Python 标志（从 https://www.python.org/community/logos/ 下载）
- `nodejs.svg` - Node.js 标志（从 https://nodejs.org/en/about/branding 下载）
- `terminal.svg` - 终端/CLI 图标
- `package.svg` - 嵌入式 SDK 使用的软件包/盒子图标

### 集成图标 {#integration-icons}
- `mcp.svg` - MCP 服务器图标
- `litellm.svg` - LiteLLM 标志（从 https://github.com/BerriAI/litellm 下载）
- `openclaw.svg` - OpenClaw 标志
- `vercel.svg` - Vercel 三角形标志（从 https://vercel.com/design/brands 下载）
- `skills.svg` - 技能/星形图标

## 规格 {#specifications}

- **格式**：SVG（推荐）或 PNG
- **尺寸**：16x16px 或更大（会缩放为 14x14px）
- **风格**：单色或简单配色效果最佳
- **颜色**：图标应同时适用于浅色和深色背景

## 替代方案：使用远程 URL {#alternative-using-remote-urls}

也可以直接在 CSS 中使用远程 URL，替代本地文件：

```css
a.menu__link[href*="/sdks/python"]::before {
  background-image: url('https://cdn.jsdelivr.net/npm/simple-icons@v10/icons/python.svg');
}
```

常用的图标 CDN：
- Simple Icons: https://simpleicons.org/
- cdnjs: https://cdnjs.com/
- jsDelivr: https://www.jsdelivr.com/

## 创建图标 {#creating-icons}

如需创建自定义图标，可以使用以下工具：
- Figma (https://figma.com)
- Inkscape (https://inkscape.org)
- SVGOMG，用于优化图标（https://jakearchibald.github.io/svgomg/）
