# Agent Work Guide

- 修改 `package.json`、更新依赖、修改 `README.md` 的操作需要用户明确要求/专门批准，且尽可能避免此类操作
- 执行翻译任务时，参考 `translation-rules/` 下的 principles 和 term-base
- 临时文件及 Computer Use/Browser Snapshot 的截图放入 `temp/` 目录中，`temp/`中的文件不会进入 git 历史
- 执行样式修改、正文文本修正等简单任务时，使用 dev 热更新快速验证而不是 build 构建生产级产物验证
- 项目适配的媒体宽度只需要验证 800,1024,1440,2048px
- `src-mono-repo/` 用于存放上游项目 hindsight，已加入 git ignore

## 执行对齐任务

上游项目更新时，用户会要求你执行对齐任务。对齐要求见 `translation-rules/alignment.md` 文档。

执行工程代码对齐时，subagent 要使用和主代理一致的 model & effort。执行文档对齐时，你就是 Leader，负责组织翻译团队。

## 组织团队翻译任务

在用户要求 agents 团队执行翻译任务时，参考本节内容。

用户下发团队翻译任务时，第一时间确定系统并发支持≥5，用户环境不支持时停止执行并要求用户修改设置。

组织 agents 团队翻译时，不要调用外部翻译服务，负责用户沟通的 agent 称为 leader，其余叫做 subagent。

Leader 负责将翻译工作拆分并分配给 subagent，subagent 全部使用 GPT 6 luna(effort=high)。
翻译任务分派以页面为单位，每个 subagent 只能翻译一个页面。
每个 subagent 任务结束后，不再接收新的翻译任务，即不能复用 subagent。
Subagent 工作时，遵循 `translation-rules` 的要求。

Leader 与 subagents 之间的沟通包括 subagents 之间的沟通，要传递待翻译文件路径而非文件内容。
Leader 在检查 subagent 回报的翻译疑点、新术语、新状况时，可以选择更新 `translation-rules` 中的内容，但 subagent 不能自主更新这些翻译工具。

锚点检查等任务要在整个翻译任务全部完成后进行，且5~10个一组分配给 subagent 执行。

最后由 leader 进行编译检查等工作。
