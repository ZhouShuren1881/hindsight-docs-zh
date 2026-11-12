const fs = require('node:fs');
const path = require('node:path');

// 保留更名前的书签和外部链接，跳转时继续携带页内锚点。
const RENAMED = {
  '/developer/pages': '/developer/knowledge-pages',
  '/developer/api/pages': '/developer/api/knowledge-pages',
};

module.exports = function renamedDocsPlugin({siteConfig}) {
  const baseUrl = siteConfig.baseUrl;
  return {
    name: 'renamed-docs',
    async postBuild({outDir, routesPaths}) {
      const routes = new Set(routesPaths);
      for (const route of routesPaths) {
        for (const [to, from] of Object.entries(RENAMED)) {
          if (!route.endsWith(to)) continue;
          const oldRoute = route.slice(0, -to.length) + from;
          if (routes.has(oldRoute)) continue;
          const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>正在跳转…</title><link rel="canonical" href="${route}"><meta http-equiv="refresh" content="0; url=${route}"><script>location.replace(${JSON.stringify(route)} + location.hash)</script></head><body><a href="${route}">前往新页面</a></body></html>`;
          // 路由含部署前缀，但 outDir 已经是站点根目录。
          const relativeRoute = oldRoute.startsWith(baseUrl)
            ? oldRoute.slice(baseUrl.length)
            : oldRoute.replace(/^\//, '');
          const file = path.join(outDir, `${relativeRoute}.html`);
          fs.mkdirSync(path.dirname(file), {recursive: true});
          fs.writeFileSync(file, html);
        }
      }
    },
  };
};
