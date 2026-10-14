import 'giotto/player';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'giotto-player': {doc?: string; src?: string; autoplay?: string; speed?: string};
    }
  }
}

/** 来自 hindsight-docs/figures/*.json 的 Giotto 动画图表。 */
export default function Figure({doc}: {doc: object}) {
  // 自定义元素会把 React 属性作为字符串传入；播放器会解析此属性。
  return <giotto-player doc={JSON.stringify(doc)} />;
}
