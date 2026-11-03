# dsh-deepseek-status

[English](README.md) | **简体中文**

一个独立的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
（DSH）Web 插件：用一张**和余额插件同款的紧凑卡片**显示 **DeepSeek 服务状态**，
固定在右下角，点击可在卡片内展开紧凑详情；服务中断/恢复时发送浏览器通知。

![状态卡片与余额卡片，样式一致](screenshot.png)

## 功能

- **和余额卡片同款** — 使用相同的表面、字体、内边距和宽度。装有 `dsh-balance`
  时位于余额卡片上方 8px；未安装时占据右下角。
- **卡片内展开详情** — 点击卡片就地展开，和余额卡片一致。展开后显示总体状态、
  服务分组状态（API / 对话）及分组 90 天可用性、活动事件的标题/状态/时间。
  **不显示逐组件列表、不显示更新记录、不显示最近事件历史**；这些请去官方状态页。
  再次点击卡片或点击箭头收起。
- **中断/恢复通知** — 仅在「正常 ↔ 非正常」切换时发送一条通知；首次加载只记录
  基线。点击通知展开状态卡片。
- **不需要凭据** — 状态源公开，没有 API Key 也能用，独立于 `dsh-balance`。
- **没有侧边栏入口，没有状态页** — 卡片和卡片内详情就是全部 UI；余额插件继续使用
  自己的卡片和内联详情。
- **双语、跟随主题** — 中英文界面，使用 DSH 菜单设计变量，支持明暗主题。

## 环境要求

- **DSH 0.2.1.x**，并启用 Web profile。已在 `0.2.1-rc.3` 上测试；包内声明
  `engines.dsh = ">=0.2.1-0 <0.2.2-0"`。
- Node.js `^22.19.0 || >=24.0.0`（DSH 的要求）。
- 如需中断/恢复通知，需要为 DSH 站点授予浏览器通知权限。

## 安装

```bash
dsh plugin --profile web add github:zz0-0/dsh-deepseek-status
systemctl --user restart dsh-web
```

然后硬刷新 DSH 页面。插件包含 Host 半（状态路由和注入的卡片脚本），所以既需要
重启也需要刷新。

卸载：

```bash
dsh plugin --profile web remove dsh-deepseek-status
systemctl --user restart dsh-web
```

## 使用

- 右下角的 **状态卡片** 显示：
  - `服务` + 总体状态（`正常` / `降级` / `部分中断` / `中断` / `维护` / `未知`）；
  - 状态点 + `无活动事件` 或活动事件数量；
  - `更新于 HH:MM`。
- 点击卡片就地展开：总体状态、分组状态、活动事件（如有）。再次点击或点击箭头
  收起。
- 展开后的 `status.deepseek.com ↗` 打开官方状态页，查看完整组件详情和历史；
  卡片头部的 `⟳` 刷新状态；`启用通知` 请求通知权限。

## 与 `dsh-balance` 的布局关系

- `dsh-balance` 继续在右下角显示余额卡片。
- `dsh-deepseek-status` 的状态卡位于余额卡片上方 8px。
- 两张卡片都可见，各自独立展开。
- 如果只安装 `dsh-deepseek-status`，状态卡会自己占据右下角，并避开输入框与
  会话状态行。

服务状态已从 `dsh-balance` 0.2.1 中移除，因此本插件是状态轮询和状态 UI 的
唯一归属。

## 数据来源

Host 读取 DeepSeek 状态页的公开后端：

| 接口 | 用途 |
|---|---|
| `summary/active` | 总体状态、页面/分组/组件树、活动变更 |
| `summary/structure?start_at_from_seconds=…&start_at_to_seconds=…` | 90 天分组可用性 |

Host 最多每 30 秒拉取一次活动状态；结构缓存 5 分钟。浏览器只访问本地摘要路由：

```text
GET /api/deepseek-status/summary
GET /api/deepseek-status/client.js   # 注入的卡片脚本
```

分组状态取该组内最严重的组件状态；总体状态取最严重的活动变更。展开卡片不显示
逐组件历史，需要时请去官方状态页。

状态页后端不是正式文档 API，读取失败时显示 `状态未知` 并提供官方状态页链接，
不会伪造「中断」。

## 隐私

- **对外请求**：只有 `status.deepseek.com`。不需要凭据、API Key，也没有遥测。
- **仅本地**：浏览器只请求本地 `/api/deepseek-status` 路由。
- **通知**：本地生成，没有推送服务；浏览器关闭时收不到。

## 兼容性

- 仅支持 **DSH 0.2.1.x**，由 `engines.dsh` 强制。
- 浏览器侧是注入到 DSH 首页的普通脚本，与 `dsh-balance` 同一模式；不修改 React，
  也不注册侧边栏/页面槽位。
- 状态页后端属于第三方公开服务页；解析器保持防御性。

## 开发

```bash
git clone https://github.com/zz0-0/dsh-deepseek-status.git
cd dsh-deepseek-status
dsh plugin --profile web add link:$(pwd)
systemctl --user restart dsh-web
```

- Host 改动（`lib/index.js`、`lib/status.js`）需要重启 `dsh web`。
- 浏览器改动（`lib/client.js`）以 `Cache-Control: no-store` 提供，硬刷新页面即可。

### 文件

| 文件 | 作用 |
|---|---|
| `package.json` | DSH bundle 元数据 |
| `cordis.patch.yml` | 把 Host 入口插入 web profile |
| `lib/index.js` | Host 路由、缓存、回环校验、注入客户端脚本 |
| `lib/status.js` | 公开状态源的抓取与归一化 |
| `lib/client.js` | 状态卡片、卡片内详情、通知 |
| `screenshot.png` | README 截图 |

## 许可证

[MIT](LICENSE)
