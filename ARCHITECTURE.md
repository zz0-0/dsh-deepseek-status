# dsh-deepseek-status · architecture

> DSH web plugin：DeepSeek 服务状态卡（余额卡样式）+ 独立弹出面板 + 故障 / 恢复通知。`README.md` 是人读入口；这里放不变量、块和数据源。

## 不变量

- 不加凭据 / API key：状态源是公开的，独立于 `dsh-balance`。
- chip 保持一行（点 + `服务` + 总体状态）；悬停/点击开独立的 400 px 面板，深度信息链官方 `status.deepseek.com`。
- 布局：在侧栏 footer 的设置上方单独插一行（32px chip / 32px 行高，与会话 / 工作区行同高），和 `dsh-balance` 的 chip 共用（余额在左、状态在右）；footer 的 action 行留给 Cordis，不挤进去；不在视口里浮动，不避让 composer / 文件面板。
- chip 与面板字体继承侧栏/正文，字号用 `--dsh-content-font-size-secondary`；行左右
  内边距 7px，文字与设置行同一列（20px 起），不跟列表的层级缩进；面板块序与余额插件一致：标题 + 更新时间 + 关闭 → 状态摘要（点 + 总体状态）→ 明细网格 → 页脚（官方链接在左，通知/刷新在右）→ 说明文字。
- 通知只在 operational ↔ non-operational 转换时发；首载静默。弹层提供显式启用入口：授予权限后发一条确认通知，按钮显示「通知已开启」；拒绝时显示「通知被浏览器阻止」，不重复弹浏览器提示。
- host 最多每 30 秒轮询 active feed；浏览器只调本地 summary 路由。
- 读失败 → `状态未知` + 官方状态页链接，不报假故障。
- 总状态 = 最严重的 active change；不显示 uptime、描述或历史。

## 块

| 块 | 文件 | 做什么 |
|---|---|---|
| Host | `lib/index.js` | 读公开状态后端、维护 summary、提供 `GET /api/deepseek-status/summary` 和 `GET /api/deepseek-status/client.js` |
| Browser | `lib/client.js` | 注入 DSH 首页：侧栏 footer 的状态 chip、弹出面板、通知 |
| Status | `lib/status.js` | 状态映射 / 最严重状态 / 轮询逻辑 |
| 载体 | `AGENTS.md`、`ARCHITECTURE.md`、`README.md`、`README.zh.md`、`LICENSE` | 人读入口与架构卡片 |
| 构建 | `package.json`、`cordis.patch.yml` | 包声明 / bundle patch |
| 资产 | `assets/` | README 截图 |
| 测试 | `test/` | host / client 测试 |
| 文档 | `docs/` | 架构视图 / 文档 |

## 数据

Host 读公开状态页后端：

| Endpoint | Used for |
|---|---|
| `summary/active` | 总状态、page / section / component 树、active changes |

浏览器只调：

```text
GET /api/deepseek-status/summary
GET /api/deepseek-status/client.js   # the injected card script
```

状态页后端不是有文档的 API；读失败就返回 `状态未知`，不把失败当故障。

## 接口

- Host → 浏览器：`GET /api/deepseek-status/summary`（总状态 / 明细 / 更新时间）、`GET /api/deepseek-status/client.js`（注入脚本）。
- 上游：公开状态页 `summary/active`；读失败 → `状态未知`。
- 注入：`ctx.webServer.tapIndex` 插 `client.js`；UI 落点是侧栏 footer 与余额 chip 共用的那一行。
- 通知：浏览器 Notification API；只在 operational ↔ non-operational 转换时发。

## 边界

- 没有 sidebar 入口、没有状态页；UI 就是 footer 里的 chip + 面板。
- 不显示 uptime / 描述 / 事件时间线；官方页负责这些。
- 不修改 `dsh-balance`；状态轮询和状态 UI 归本插件。
