# dsh-deepseek-status

> DSH web plugin：DeepSeek 服务状态卡（余额卡样式）+ 独立弹出面板 + 故障 / 恢复通知。
> 根文档闭集：`AGENTS.md` / `README.md` / `ARCHITECTURE.md`；`DECISIONS: 无`。

## 入口

- 入口命令：`direnv exec . npm test`

## 闸门

- pre-push：`.githooks/pre-push`（新 clone 后 `git config core.hooksPath .githooks`）。

## 指针

- 人读入口：[README.md](README.md)
- 架构：[ARCHITECTURE.md](ARCHITECTURE.md)

## 不要

- 不加凭据 / API key；状态源是公开的。
- 不显示 uptime / 描述 / 历史；深度信息链官方状态页。
- 读失败标「状态未知」，不报假故障。
- 通知只在 operational ↔ non-operational 转换时发，首载静默。
