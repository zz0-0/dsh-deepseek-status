# TODO

## 未完成

| id | 状态 | 任务 | 指针 | 下一步 | 验收 |
|---|---|---|---|---|---|

## 已完成

### 2026-11-18 · 与余额卡一致的 hover / 固定交互

- 链/步骤：coding → 实现 / 测试
- 有效：一行状态卡 hover 140ms 打开 400px 面板，移开 180ms 关闭；点击固定 / 收起，hover 打开后点击改为固定，不闪关；指针跨过间隙进入面板后仍保持打开，面板内刷新 / 链接可操作；与余额面板用 `dsh-dock-panel-open` 互斥。`npm test` 6/6 绿（新增 `node --check lib/client.js`）；Playwright 真机验证 hover / 移入面板 / 固定 / 离开 / Esc / 外部点击。
- 失败：无；入口 `npm test` 已跑（6/6）
- 环境 diff：`lib/client.js` + `package.json` + `README.md` + `README.zh.md` + `TODO.md`

### 2026-11-15 · history 的 null item 不再崩

- 链/步骤：coding → bug-to-check / 测试
- 有效：items 过滤非对象；npm test 6/6；pre-push 仍绿
- 失败：红：新用例在旧代码上 `not ok 6`，TypeError: Cannot read properties of null (reading 'start_at_seconds')
- 环境 diff：`lib/status.js`（+1 过滤）+ `test/status.test.mjs`（+1 用例）
