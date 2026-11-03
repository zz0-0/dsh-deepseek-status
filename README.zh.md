# dsh-deepseek-status

[English](README.md) | **简体中文**

一个独立的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
（DSH）Web 插件，用于 **DeepSeek 服务状态**：右下角常驻状态条、原生完整状态页，
以及服务中断/恢复时的浏览器通知。

![DeepSeek 状态页](screenshot.png)

## 功能

- **常驻状态条** — 固定在窗口右下角。装有 `dsh-balance` 时，状态条位于余额卡片
  上方 8px；未安装时直接占据右下角。显示总体状态和活动事件数量，点击打开状态页。
- **原生状态页** — 左侧边栏的 `状态` 入口打开一个真正的 DSH 主面板：按服务分组
  的组件与 90 天可用性、活动事件时间线，以及最近 7/30/90 天的事件/维护记录。
- **中断/恢复通知** — 仅在「正常 ↔ 非正常」切换时发送一条浏览器通知；首次加载
  只记录基线，不通知。点击通知会打开状态页。通知可选，只有授权后才生效。
- **不需要 DeepSeek 凭据** — 状态源是公开的，因此没有 API Key 也能用，也独立于
  `dsh-balance`。
- **不是第二张卡片** — 本插件只占用一条紧凑状态条，不会在右下角再堆一张完整卡片。
  打开状态页时，状态条和余额卡片都会让位，把整个主区域留给页面。
- **双语、跟随主题** — 中英文界面，使用 DSH 菜单设计变量，支持明暗主题。

## 环境要求

- **DSH 0.2.1.x**，并启用 Web profile。已在 `0.2.1-rc.3` 上测试；包内声明
  `engines.dsh = ">=0.2.1-0 <0.2.2-0"`。
- Node.js `^22.19.0 || >=24.0.0`（DSH 的要求）。
- 如需中断/恢复通知，需要为 DSH 站点授予浏览器通知权限。

## 安装

直接从 GitHub 安装：

```bash
dsh plugin --profile web add github:zz0-0/dsh-deepseek-status
systemctl --user restart dsh-web
```

然后 **硬刷新** DSH 页面。插件同时包含 Host 半（状态路由）和浏览器半（页面、
侧边栏入口、状态条），所以既需要重启也需要刷新。

卸载：

```bash
dsh plugin --profile web remove dsh-deepseek-status
systemctl --user restart dsh-web
```

## 使用

- 左侧边栏新增 `状态` 入口，图标上有一个状态色点。
- 右下角的 **状态条** 是直接入口：绿色正常，黄色降级/部分中断，红色完全中断，
  蓝色维护中，灰色未知。
- 点击状态条或侧边栏入口打开状态页。
- 状态页上的 **启用通知** 按钮会请求通知权限。授权后，正常 → 异常、异常 → 正常
  各发送一条浏览器通知；点击通知打开状态页。
- 状态页的 `7天/30天/90天` 切换最近事件窗口；`⟳` 刷新摘要和当前窗口的历史。

## 与 `dsh-balance` 的布局关系

两个插件不会争抢右下角：

- `dsh-balance` 继续在右下角显示余额卡片。
- `dsh-deepseek-status` 的状态条位于余额卡片上方 8px。
- 打开状态页时，状态条和余额卡片暂时隐藏（页面本身已经显示状态）；回到对话或
  其他面板后恢复。
- 如果只安装 `dsh-deepseek-status`，状态条会自己占据右下角，并避开输入框与
  会话状态行。

服务状态已从 `dsh-balance` 0.2.1 中移除，因此本插件是状态轮询和状态 UI 的
唯一归属。

## 数据来源

Host 读取 DeepSeek 状态页的公开后端（状态页自身使用的同一份 JSON）：

| 接口 | 用途 |
|---|---|
| `summary/active` | 总体状态、页面/分组/组件树、活动变更 |
| `summary/structure?start_at_from_seconds=…&start_at_to_seconds=…` | 90 天组件/分组可用性 |
| `change/list?start_at_seconds=…&end_at_seconds=…` | 最近事件/维护及其更新记录 |

Host 最多每 30 秒拉取一次活动状态；结构与历史缓存 5 分钟。浏览器只访问本地
DSH 服务：

- `GET /api/deepseek-status/summary`
- `GET /api/deepseek-status/history?days=30`

组件状态来自活动变更中的组件状态；没有活动变更时按正常处理。总体状态取最严重的
活动变更。可用性使用状态页自己的 90 天数据。

状态页后端不是正式文档 API，读取失败时显示 `状态未知` 并提供官方状态页链接，
不会伪造「中断」。

## 隐私

- **对外请求**：只有 `status.deepseek.com`（公开状态源和页面）。不需要凭据、
  API Key，也没有遥测。
- **仅本地**：浏览器只请求本地 `/api/deepseek-status` 两个路由。
- **通知**：浏览器通知在状态切换时本地生成，没有推送服务；浏览器关闭时收不到。

## 兼容性

- 仅支持 **DSH 0.2.1.x**，由 `engines.dsh` 强制。
- 浏览器半使用 DSH 原生的 `main` 面板与 `sidebar.panellist` 槽位（与官方「插件」
  页面同一机制），并注入 `locale`、`layout` 服务。
- 状态页后端属于第三方公开服务页；解析器保持防御性，若页面变化，界面会显示
  明确的未知状态。

## 开发

没有构建步骤：Host 是普通 ESM，浏览器半是手写的 `__ModuleLoader__` bundle。

```bash
git clone https://github.com/zz0-0/dsh-deepseek-status.git
cd dsh-deepseek-status
dsh plugin --profile web add link:$(pwd)
systemctl --user restart dsh-web
```

- Host 改动（`lib/index.js`、`lib/status.js`）需要重启 `dsh web`。
- 浏览器改动（`lib/client.js`）以 `Cache-Control: no-store` 提供，硬刷新页面即可。
- 浏览器半注册状态页（`main` key `deepseek-status`）、侧边栏图标
  （`sidebar.panellist` id `deepseek-status`）和常驻状态条；每 30 秒轮询一次
  Host 摘要。

### 文件

| 文件 | 作用 |
|---|---|
| `package.json` | DSH bundle 与 client 元数据 |
| `cordis.patch.yml` | 把 Host 入口插入 web profile |
| `lib/index.js` | Host 路由、缓存、回环校验 |
| `lib/status.js` | 公开状态源的抓取与归一化 |
| `lib/client.js` | 原生状态页、侧边栏入口、状态条、通知 |
| `screenshot.png` | README 截图 |

## 许可证

[MIT](LICENSE)
