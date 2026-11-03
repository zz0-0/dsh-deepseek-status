(function () {
  if (window.__dshDeepSeekStatusInstalled) return
  window.__dshDeepSeekStatusInstalled = true

  var SUMMARY_URL = '/api/deepseek-status/summary'
  var STATUS_URL = 'https://status.deepseek.com/'
  var CARD_WIDTH = 172
  var CARD_EDGE = 12
  var CARD_GAP = 8

  function isZh() {
    try {
      return /^zh/i.test(document.documentElement.lang || navigator.language || '')
    } catch {
      return false
    }
  }
  function t(zh, en) {
    return isZh() ? zh : en
  }
  function node(tag, cls, text) {
    var el = document.createElement(tag)
    if (cls) el.className = cls
    if (text !== undefined) el.textContent = text
    return el
  }
  function append(parent) {
    for (var i = 1; i < arguments.length; i += 1) {
      if (arguments[i]) parent.appendChild(arguments[i])
    }
    return parent
  }
  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text
  }
  function fmtUptime(value) {
    var n = Number(value)
    return Number.isFinite(n) ? n.toFixed(2) + '%' : '—'
  }
  function fmtDateTime(ms) {
    if (!ms) return '—'
    try {
      return new Date(ms).toLocaleString(undefined, {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }
  function fmtTime(ms) {
    if (!ms) return '—'
    try {
      return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '—'
    }
  }
  function indicatorOf(summary) {
    return summary && summary.ok ? String(summary.indicator || 'unknown') : 'unknown'
  }
  function cardState(indicator) {
    var map = {
      operational: t('正常', 'OK'),
      degraded: t('降级', 'Degraded'),
      partial_outage: t('部分中断', 'Partial'),
      full_outage: t('中断', 'Down'),
      maintenance: t('维护', 'Maint'),
      unknown: t('未知', 'Unknown'),
    }
    return map[indicator] || map.unknown
  }
  function overallTitle(indicator) {
    var map = {
      operational: t('一切正常', 'All systems operational'),
      degraded: t('服务降级', 'Degraded performance'),
      partial_outage: t('部分中断', 'Partial outage'),
      full_outage: t('完全中断', 'Full outage'),
      maintenance: t('维护中', 'Under maintenance'),
      unknown: t('状态未知', 'Status unknown'),
    }
    return map[indicator] || map.unknown
  }
  function overallDesc(indicator) {
    var map = {
      operational: t('所有系统均按预期运行。', 'All services are running normally.'),
      degraded: t('部分服务性能下降。', 'Some services are experiencing degraded performance.'),
      partial_outage: t('部分服务出现故障。', 'Some services are experiencing issues.'),
      full_outage: t('关键服务不可用。', 'Critical services are down.'),
      maintenance: t('正在按计划维护。', 'Scheduled maintenance is in progress.'),
      unknown: t('暂时无法获取状态页数据。', 'The status feed is temporarily unavailable.'),
    }
    return map[indicator] || map.unknown
  }
  function statusLabel(status) {
    var map = {
      operational: t('正常', 'Operational'),
      degraded: t('降级', 'Degraded'),
      partial_outage: t('部分中断', 'Partial'),
      full_outage: t('中断', 'Down'),
      maintenance: t('维护', 'Maintenance'),
      unknown: t('未知', 'Unknown'),
    }
    return map[status] || map.unknown
  }
  function incidentStatusLabel(status) {
    var key = String(status || '').toLowerCase()
    var map = {
      investigating: t('排查中', 'Investigating'),
      identified: t('已定位', 'Identified'),
      monitoring: t('监控中', 'Monitoring'),
      scheduled: t('已计划', 'Scheduled'),
      in_progress: t('进行中', 'In progress'),
      resolved: t('已恢复', 'Resolved'),
      completed: t('已完成', 'Completed'),
      cancelled: t('已取消', 'Cancelled'),
    }
    return map[key] || status || '—'
  }
  function groupShortName(name) {
    return String(name || '').replace(/\(.*$/, '').trim() || t('API 服务', 'API service')
  }
  function componentShortName(name, groupName) {
    var short = String(name || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/^DeepSeek\s+/i, '')
      .trim() || name
    if (short === groupShortName(groupName)) {
      var match = String(name || '').match(/\(([^)]+)\)\s*$/)
      if (match) return match[1].trim()
    }
    return short
  }
  function groupStatus(group) {
    var rank = { operational: 0, maintenance: 1, degraded: 2, partial_outage: 3, full_outage: 4, unknown: 5 }
    var worst = 'operational'
    var components = group && Array.isArray(group.components) ? group.components : []
    for (var i = 0; i < components.length; i += 1) {
      var status = components[i].status || 'unknown'
      if ((rank[status] || 0) > (rank[worst] || 0)) worst = status
    }
    return worst
  }
  function notificationPermission() {
    try {
      return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
    } catch {
      return 'unsupported'
    }
  }

  var css = document.createElement('style')
  css.textContent = [
    '.dsh-status-card{position:fixed;z-index:2147483000;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;width:172px;padding:8px 10px;border-radius:var(--dsw-radius-lg,12px);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));user-select:none;cursor:pointer;transition:background .12s ease}',
    'body:has(.dsh-balance-panel:not([hidden])) .dsh-status-card{visibility:hidden !important;pointer-events:none !important}',
    '.dsh-status-head{display:flex;align-items:flex-start;gap:6px}',
    '.dsh-status-label{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px}',
    '.dsh-status-value{min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-size:12px;line-height:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-chevron{margin-left:auto;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10px;line-height:18px;opacity:.7;transition:transform .15s ease}',
    '.dsh-status-card[aria-expanded="true"] .dsh-status-chevron{transform:rotate(180deg)}',
    '.dsh-status-refresh{margin-left:auto;border:0;background:transparent;color:inherit;opacity:.45;font-size:12px;line-height:1;padding:2px;cursor:pointer}',
    '.dsh-status-detail-card{position:fixed;z-index:2147483001;cursor:default;user-select:text}',
    '.dsh-status-detail-card[hidden]{display:none}',
    '.dsh-status-detail-body{margin-top:6px;padding-top:6px;border-top:1px solid color-mix(in srgb,CanvasText 12%,transparent);font-size:9px;line-height:1.45;opacity:.82;max-height:240px;overflow-y:auto}',
    '.dsh-status-popup-close{margin-left:2px;border:0;background:transparent;color:inherit;opacity:.45;font-size:12px;line-height:1;padding:1px;cursor:pointer}',
    '.dsh-status-popup-close:hover{opacity:1}',
    '.dsh-status-panel{position:fixed;z-index:2147483002;box-sizing:border-box;display:flex;flex-direction:column;width:min(400px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:16px;border:0;border-radius:var(--dsw-radius-lg,12px);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));text-align:left;white-space:normal;user-select:text}',
    '.dsh-status-panel[hidden]{display:none}',
    '.dsh-status-panel-head{display:flex;align-items:flex-start;gap:16px}',
    '.dsh-status-panel-title{flex:1;min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel-updated{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;white-space:nowrap}',
    '.dsh-status-panel-close{margin-left:2px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:14px;line-height:1;padding:1px;cursor:pointer}',
    '.dsh-status-panel-close:hover{color:var(--dsw-alias-label-secondary,CanvasText)}',
    '.dsh-status-panel-rule{margin:8px 0 10px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 12%,transparent))}',
    '.dsh-status-panel-grid{display:grid;grid-template-columns:minmax(96px,auto) minmax(0,1fr);gap:6px 16px;margin:0;padding:0}',
    '.dsh-status-panel-grid dt,.dsh-status-panel-grid dd{min-width:0;margin:0;font-size:12px;line-height:18px;font-weight:400}',
    '.dsh-status-panel-grid dt{color:var(--dsw-alias-label-tertiary,CanvasText);overflow-wrap:anywhere}',
    '.dsh-status-panel-grid dd{color:var(--dsw-alias-label-secondary,CanvasText);text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
    '.dsh-status-value-dot{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:#3fb950;vertical-align:middle}',
    '.dsh-status-value-dot[data-status="degraded"],.dsh-status-value-dot[data-status="partial_outage"]{background:#e6a23c}',
    '.dsh-status-value-dot[data-status="full_outage"]{background:#d5484a}',
    '.dsh-status-value-dot[data-status="maintenance"]{background:#4a7dff}',
    '.dsh-status-value-dot[data-status="unknown"]{background:currentColor;opacity:.35}',
    '.dsh-status-panel-grid .dsh-status-group{grid-column:1 / -1;margin-top:5px;color:var(--dsw-alias-label-secondary,CanvasText);font-weight:600;opacity:.8}',
    '.dsh-status-panel-grid .dsh-status-group:first-child{margin-top:0}',
    '.dsh-status-panel-empty{grid-column:1 / -1;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px}',
    '.dsh-status-panel-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 12%,transparent));color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px}',
    '.dsh-status-panel-link{color:var(--dsw-alias-link,CanvasText);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel-link:hover{text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-panel-refresh{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;margin-left:auto;padding:0;border:0;border-radius:24px;background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:13px;line-height:1;cursor:pointer}',
    '.dsh-status-panel-refresh:hover{color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-alias-interactive-bg-hover)}',
    '.dsh-status-panel-bell{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font:inherit;font-size:11px;line-height:16px;padding:0;cursor:pointer;white-space:nowrap}',
    '.dsh-status-panel-bell:hover{color:var(--dsw-alias-label-secondary,CanvasText);text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-panel-bell[hidden]{display:none}',
    '.dsh-status-refresh:hover,.dsh-status-chevron:hover{opacity:1}',
    '.dsh-status-line{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px}',
    '.dsh-status-dot{display:inline-block;width:6px;height:6px;flex:0 0 auto;border-radius:50%;background:#3fb950;vertical-align:middle}',
    '.dsh-status-head .dsh-status-dot{margin-top:6px}',
    '.dsh-status-detail-group{margin-top:5px;font-weight:600;opacity:.8}',
    '.dsh-status-detail-group:first-of-type{margin-top:0}',
    '.dsh-status-card[data-status="degraded"] .dsh-status-dot,.dsh-status-card[data-status="partial_outage"] .dsh-status-dot,.dsh-status-detail-dot[data-status="degraded"],.dsh-status-detail-dot[data-status="partial_outage"]{background:#e6a23c}',
    '.dsh-status-card[data-status="full_outage"] .dsh-status-dot,.dsh-status-detail-dot[data-status="full_outage"]{background:#d5484a}',
    '.dsh-status-card[data-status="maintenance"] .dsh-status-dot,.dsh-status-detail-dot[data-status="maintenance"]{background:#4a7dff}',
    '.dsh-status-card[data-status="unknown"] .dsh-status-dot,.dsh-status-detail-dot[data-status="unknown"]{background:currentColor;opacity:.35}',
    '.dsh-status-window{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-remain{margin-left:auto;opacity:.72;white-space:nowrap}',
    '.dsh-status-next{display:block;font-size:9.5px;opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-details{display:block;margin-top:0;padding-top:0;border-top:0 solid color-mix(in srgb,CanvasText 12%,transparent);font-size:9px;line-height:1.45;white-space:normal;opacity:0;max-height:0;overflow:hidden;pointer-events:none;transition:max-height .2s ease,opacity .2s ease,margin-top .2s ease,padding-top .2s ease}',
    '.dsh-status-card.expanded .dsh-status-details{margin-top:6px;padding-top:6px;border-top:1px solid color-mix(in srgb,CanvasText 12%,transparent);opacity:.82;max-height:240px;overflow-y:auto;pointer-events:auto}',
    '.dsh-status-detail-row{display:block;margin-top:2px;overflow-wrap:anywhere}',
    '.dsh-status-detail-row b{font-weight:600;opacity:.7;margin-right:4px}',
    '.dsh-status-detail-group{margin-top:5px;font-weight:600;opacity:.7}',
    '.dsh-status-detail-link{color:inherit;opacity:.72;text-decoration:none}',
    '.dsh-status-detail-link:hover{opacity:1;text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-detail-bell{border:0;background:transparent;color:inherit;font:inherit;opacity:.72;padding:0;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-detail-bell:hover{opacity:1}',
    '.dsh-status-detail-uptime{opacity:.62}',
  ].join('')
  document.head.appendChild(css)

  var state = { summary: null, error: '', loading: false }
  var expanded = false
  var prevIndicator = null
  var inFlight = false

  function notify(isUp, summary) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    var indicator = indicatorOf(summary)
    var incident = summary && Array.isArray(summary.incidents) ? summary.incidents[0] : null
    var title = isUp ? t('DeepSeek 服务已恢复', 'DeepSeek service restored') : t('DeepSeek 服务异常', 'DeepSeek service issue')
    var body = isUp
      ? t('所有系统已恢复正常。', 'All systems are back to normal.')
      : t('服务状态：', 'Service status: ') + statusLabel(indicator) + (incident && incident.title ? ' · ' + incident.title : '')
    try {
      var n = new Notification(title, { body: body, tag: 'dsh-deepseek-status' })
      n.onclick = function () {
        try { window.focus() } catch {}
        openCard()
        try { n.close() } catch {}
      }
    } catch {}
  }
  function observe(summary) {
    var indicator = indicatorOf(summary)
    if (indicator === 'unknown') return
    if (prevIndicator === null) {
      prevIndicator = indicator
      return
    }
    if (indicator === prevIndicator) return
    var wasOperational = prevIndicator === 'operational'
    var isOperational = indicator === 'operational'
    prevIndicator = indicator
    if (wasOperational !== isOperational) notify(isOperational, summary)
  }
  function loadSummary(force) {
    if (inFlight) return
    inFlight = true
    state.loading = true
    updateCard()
    fetch(SUMMARY_URL + (force ? '?force=1' : ''), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || 'invalid payload')
        state.summary = data
        state.error = ''
        observe(data)
      })
      .catch(function (err) {
        state.error = String((err && err.message) || err)
      })
      .finally(function () {
        state.loading = false
        inFlight = false
        updateCard()
        if (expanded) {
          renderDetails()
          positionDetail()
        }
      })
  }

  var card = node('div', 'dsh-status-card')
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.setAttribute('aria-expanded', 'false')
  card.innerHTML = [
    '<div class="dsh-status-head">',
    '  <span class="dsh-status-label"></span>',
    '  <span class="dsh-status-dot"></span>',
    '  <span class="dsh-status-value">…</span>',
    '  <span class="dsh-status-chevron" aria-hidden="true">▾</span>',
    '</div>',
  ].join('')
  document.body.appendChild(card)

  var detailCard = node('div', 'dsh-status-panel')
  detailCard.hidden = true
  detailCard.setAttribute('role', 'dialog')
  detailCard.innerHTML = [
    '<div class="dsh-status-panel-head">',
    '  <span class="dsh-status-panel-title"></span>',
    '  <span class="dsh-status-panel-updated"></span>',
    '  <button class="dsh-status-panel-close" type="button" aria-label="关闭">×</button>',
    '</div>',
    '<div class="dsh-status-panel-rule"></div>',
    '<div class="dsh-status-panel-grid"></div>',
    '<div class="dsh-status-panel-foot">',
    '  <a class="dsh-status-panel-link" target="_blank" rel="noreferrer noopener">status.deepseek.com ↗</a>',
    '  <button class="dsh-status-panel-refresh" type="button">⟳</button>',
    '  <button class="dsh-status-panel-bell" type="button">启用通知</button>',
    '</div>',
  ].join('')
  document.body.appendChild(detailCard)

  function chromeRects() {
    var rects = []
    var composer = document.querySelector('[data-composer-card]')
    if (composer) {
      var rect = composer.getBoundingClientRect()
      if (rect.width > 0) rects.push(rect)
    }
    var dock = document.querySelector('[data-slot="conversation.composer.dock"]')
    if (dock) {
      var dockRect = dock.getBoundingClientRect()
      if (dockRect.width > 0) rects.push(dockRect)
      for (var i = 0; i < dock.children.length; i += 1) {
        var childRect = dock.children[i].getBoundingClientRect()
        if (childRect.width > 0) rects.push(childRect)
      }
    }
    return rects
  }
  function positionCard() {
    if (!card.isConnected) return
    var right = CARD_EDGE
    var bottom = CARD_EDGE
    var balance = document.querySelector('[data-dsh-balance-overview]')
    var balanceRect = balance ? balance.getBoundingClientRect() : null
    if (balanceRect && balanceRect.width > 0 && balanceRect.height > 0) {
      right = Math.max(CARD_EDGE, Math.round(window.innerWidth - balanceRect.right))
      bottom = Math.max(CARD_EDGE, Math.round(window.innerHeight - balanceRect.top + CARD_GAP))
    } else {
      var height = card.offsetHeight || 72
      var left = window.innerWidth - right - CARD_WIDTH
      var rects = chromeRects()
      for (var i = 0; i < rects.length; i += 1) {
        var rect = rects[i]
        var overlapsX = rect.right + CARD_GAP > left && rect.left - CARD_GAP < window.innerWidth - right
        var top = window.innerHeight - bottom - height
        var overlapsY = rect.bottom + CARD_GAP > top && rect.top - CARD_GAP < window.innerHeight - bottom
        if (overlapsX && overlapsY) bottom = Math.max(bottom, window.innerHeight - rect.top + CARD_GAP)
      }
    }
    card.style.right = right + 'px'
    card.style.bottom = bottom + 'px'
    if (expanded) positionDetail()
  }
  function positionDetail() {
    if (!expanded || detailCard.hidden) return
    var anchor = card.getBoundingClientRect()
    var width = detailCard.offsetWidth || CARD_WIDTH
    var height = detailCard.offsetHeight
    var left = Math.max(CARD_EDGE, Math.min(anchor.right - width, window.innerWidth - width - CARD_EDGE))
    var top = anchor.bottom - height
    if (top < CARD_EDGE) top = CARD_EDGE
    detailCard.style.left = Math.round(left) + 'px'
    detailCard.style.top = Math.round(top) + 'px'
  }
  function updateCard() {
    var summary = state.summary
    var indicator = indicatorOf(summary)
    card.setAttribute('data-status', indicator)
    setText(card.querySelector('.dsh-status-label'), t('服务', 'Service'))
    setText(card.querySelector('.dsh-status-value'), cardState(indicator))
    var hint = expanded ? t('点击收起', 'Click to collapse') : t('点击展开详情', 'Click for details')
    if (card.title !== hint) card.title = hint
    var aria = t('DeepSeek 服务：', 'DeepSeek service: ') + cardState(indicator)
    card.setAttribute('aria-label', aria)
  }

  function addPanelRow(grid, label, value, status) {
    grid.appendChild(node('dt', null, label))
    var dd = node('dd')
    if (status) {
      var dot = node('span', 'dsh-status-value-dot')
      dot.setAttribute('data-status', status)
      dd.appendChild(dot)
    }
    dd.appendChild(document.createTextNode(value))
    grid.appendChild(dd)
  }
  function renderDetails() {
    var grid = detailCard.querySelector('.dsh-status-panel-grid')
    var summary = state.summary
    var scroll = detailCard.scrollTop
    grid.textContent = ''
    setText(detailCard.querySelector('.dsh-status-panel-title'), t('DeepSeek 状态', 'DeepSeek status'))
    setText(detailCard.querySelector('.dsh-status-panel-updated'),
      t('更新于 ', 'Updated ') + (summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : '—'))
    var link = detailCard.querySelector('.dsh-status-panel-link')
    link.href = (summary && summary.url) || STATUS_URL
    var bell = detailCard.querySelector('.dsh-status-panel-bell')
    bell.textContent = t('启用通知', 'Enable notifications')
    bell.hidden = notificationPermission() !== 'default'

    if (!summary) {
      grid.appendChild(node('div', 'dsh-status-panel-empty',
        state.error ? t('加载失败：', 'Failed to load: ') + state.error : t('正在加载…', 'Loading…')))
      detailCard.scrollTop = scroll
      return
    }

    addPanelRow(grid, t('总体', 'Overall'), overallTitle(indicatorOf(summary)), indicatorOf(summary))
    var groups = Array.isArray(summary.groups) ? summary.groups : []
    for (var i = 0; i < groups.length; i += 1) {
      var group = groups[i]
      var components = Array.isArray(group.components) ? group.components : []
      if (!components.length) continue
      grid.appendChild(node('div', 'dsh-status-group', groupShortName(group.name)))
      for (var j = 0; j < components.length; j += 1) {
        var component = components[j]
        addPanelRow(grid,
          componentShortName(component.name, group.name),
          statusLabel(component.status || 'unknown'),
          component.status || 'unknown')
      }
    }
    var incidents = Array.isArray(summary.incidents) ? summary.incidents : []
    if (incidents.length) {
      var incident = incidents[0]
      addPanelRow(grid, t('事件', 'Incident'), incident.title)
      var meta = statusLabel(incident.indicator) + ' · ' + incidentStatusLabel(incident.status)
      if (incident.startedAt) meta += ' · ' + fmtDateTime(incident.startedAt)
      addPanelRow(grid, t('状态', 'Status'), meta, incident.indicator)
    }
    detailCard.scrollTop = scroll
  }
  function setExpanded(value) {
    if (expanded === value) {
      if (value) positionDetail()
      return
    }
    expanded = value
    card.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    var chevron = card.querySelector('.dsh-status-chevron')
    if (chevron) chevron.textContent = expanded ? '▴' : '▾'
    if (expanded) {
      detailCard.hidden = false
      detailCard.style.visibility = 'hidden'
      detailCard.setAttribute('aria-label', t('DeepSeek 状态详情', 'DeepSeek status details'))
      renderDetails()
      positionDetail()
      detailCard.style.visibility = 'visible'
      card.style.visibility = 'hidden'
    } else {
      detailCard.hidden = true
      card.style.visibility = ''
    }
    updateCard()
  }
  function openCard() {
    setExpanded(true)
  }
  function toggleCard(event) {
    if (event && event.target && event.target.closest && event.target.closest('button, a')) return
    setExpanded(!expanded)
  }
  card.addEventListener('click', toggleCard)
  card.addEventListener('keydown', function (event) {
    if (event.target && event.target.closest && event.target.closest('button, a')) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setExpanded(!expanded)
    }
  })
  detailCard.querySelector('.dsh-status-panel-refresh').addEventListener('click', function (event) {
    event.stopPropagation()
    loadSummary(true)
  })
  detailCard.querySelector('.dsh-status-panel-bell').addEventListener('click', function (event) {
    event.stopPropagation()
    try {
      Notification.requestPermission().then(function () { renderDetails() })
    } catch {}
  })
  detailCard.querySelector('.dsh-status-panel-close').addEventListener('click', function (event) {
    event.stopPropagation()
    setExpanded(false)
    card.focus()
  })
  document.addEventListener('pointerdown', function (event) {
    if (!expanded) return
    if (card.contains(event.target) || detailCard.contains(event.target)) return
    setExpanded(false)
  }, true)
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !expanded) return
    setExpanded(false)
    card.focus()
  })
  window.addEventListener('resize', positionCard)

  updateCard()
  positionCard()
  requestAnimationFrame(positionCard)
  loadSummary(false)
  setInterval(function () { loadSummary(false) }, 30_000)
  setInterval(positionCard, 1000)
})()
