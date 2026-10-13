/**
 * 构建-timeGitHub星星计数。
 *
 * 导航栏GitHub项目和主页英雄都显示星星数 - 这是
 * 页面上最便宜的社交证明，将未标记的图标变成
 * 值得点击的目标。 build-time编号是第一次绘制（无布局
 * shift，无需JS）； `useGitHubStars` 然后从访问者的页面刷新它
 * 浏览器，因此陈旧或后备版本号永远不会保留。
 *
 * FALLBACK 是获取失败时呈现的内容 — 离线开发，一个 CI 运行程序
 * 无出口，或速率-limited IP。它故意是一个低于
 * 真实计数：陈旧的-low数字是诚实的，陈旧的-high则不是。
 */
const FALLBACK = 40000;
const REPO = 'vectorize-io/hindsight';

/* 构建一定不能挂在这个上面。没有最后期限的缓慢或
   黑色-holedapi.github.com 停顿`docusaurus build`无限期，在CI中
   表示一项工作会为了装饰而燃烧整个超时。五秒很远
   超过呼叫需求，后备覆盖其余部分。*/
const TIMEOUT_MS = 5000;

module.exports = function githubStarsPlugin() {
  return {
    name: 'github-stars',

    async loadContent() {
      try {
        const res = await fetch(`https://api.github.com/repos/${REPO}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: {
            Accept: 'application/vnd.github+json',
            // GITHUB_TOKEN 解除了60/hr 对共享 CI IP 的未经身份验证的限制。
            ...(process.env.GITHUB_TOKEN
              ? {Authorization: `Bearer ${process.env.GITHUB_TOKEN}`}
              : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP${res.status}`);
        const {stargazers_count: stars} = await res.json();
        if (typeof stars !== 'number') throw new Error('无stargazers_count');
        return {stars};
      } catch (err) {
        console.warn(
          `[github-stars] 无法获取${REPO}星星（${err.message}) — 使用${FALLBACK}`,
        );
        return {stars: FALLBACK};
      }
    },

    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
};
