# Agent Work Guide

- 修改 package.json、更新依赖、修改README的操作需要用户明确要求/专门批准，且尽可能避免此类操作
- 执行翻译任务时，直接翻译，不要调用外部服务，遇到大规模任务尝试将翻译工作拆分并分配给 subagent
- Computer Use/Browser Snapshot 的截图放入 `temp/` 目录中
- 执行样式修改、正文文本修正等简单任务时，使用 dev 热更新快速验证而不是 build 构建生产级产物验证
- 项目适配的媒体宽度只需要验证 800,1024,1440,2048px
