# TODO

## 未完成

| id | 状态 | 任务 | 指针 | 下一步 | 验收 |
|---|---|---|---|---|---|

## 已完成

### 2026-11-15 · history 的 null item 不再崩

- 链/步骤：coding → bug-to-check / 测试
- 有效：items 过滤非对象；npm test 6/6；pre-push 仍绿
- 失败：红：新用例在旧代码上 `not ok 6`，TypeError: Cannot read properties of null (reading 'start_at_seconds')
- 环境 diff：`lib/status.js`（+1 过滤）+ `test/status.test.mjs`（+1 用例）
