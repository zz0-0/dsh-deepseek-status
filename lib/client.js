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
  function fmtDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '—'
    var mins = Math.max(1, Math.round(ms / 60000))
    if (mins < 60) return mins + 'm'
    var hours = Math.floor(mins / 60)
    var rest = mins % 60
    if (hours < 24) return hours + 'h' + (rest ? ' ' + rest + 'm' : '')
    return Math.floor(hours / 24) + 'd' + (hours % 24 ? ' ' + (hours % 24) + 'h' : '')
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
    '.dsh-status-card{position:fixed;z-index:950;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;width:172px;padding:8px 10px;border-radius:var(--dsw-radius-lg,12px);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));user-select:none;cursor:pointer;transition:background .12s ease}',
    '.dsh-status-card:hover{--dsw-elevation-stroke-color:var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 20%,transparent))}',
    '.dsh-status-head{display:flex;align-items:flex-start;gap:6px;min-width:0}',
    '.dsh-status-label{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px}',
    '.dsh-status-value{min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-size:12px;line-height:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-chevron{margin-left:auto;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10px;line-height:18px;opacity:.7;transition:transform .15s ease}',
    '.dsh-status-card[aria-expanded="true"] .dsh-status-chevron{transform:rotate(180deg)}',
    '.dsh-status-line{display:flex;align-items:center;gap:5px;min-width:0}',
    '.dsh-status-dot{display:inline-block;width:6px;height:6px;flex:0 0 auto;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950);vertical-align:middle}',
    '.dsh-status-card[data-status="degraded"] .dsh-status-dot,.dsh-status-card[data-status="partial_outage"] .dsh-status-dot,.dsh-status-panel-dot[data-status="degraded"],.dsh-status-panel-dot[data-status="partial_outage"]{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.dsh-status-card[data-status="full_outage"] .dsh-status-dot,.dsh-status-panel-dot[data-status="full_outage"]{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.dsh-status-card[data-status="maintenance"] .dsh-status-dot,.dsh-status-panel-dot[data-status="maintenance"]{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.dsh-status-card[data-status="unknown"] .dsh-status-dot,.dsh-status-panel-dot[data-status="unknown"]{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
    '.dsh-status-dot[data-status="degraded"],.dsh-status-dot[data-status="partial_outage"]{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.dsh-status-dot[data-status="full_outage"]{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.dsh-status-dot[data-status="maintenance"]{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.dsh-status-dot[data-status="unknown"]{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
    '.dsh-status-window{color:var(--dsw-alias-label-secondary,CanvasText);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-remain{margin-left:auto;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;white-space:nowrap}',
    '.dsh-status-next{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel{position:fixed;z-index:1100;box-sizing:border-box;display:flex;flex-direction:column;width:min(400px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:16px;border:0;border-radius:var(--dsw-radius-lg,12px);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));text-align:left;white-space:normal;user-select:text}',
    '.dsh-status-panel[hidden]{display:none}',
    '.dsh-status-panel-head{display:flex;align-items:flex-start;gap:12px}',
    '.dsh-status-panel-title{min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel-updated{margin-left:auto;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;white-space:nowrap}',
    '.dsh-status-panel-rule{margin:9px 0;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 12%,transparent))}',
    '.dsh-status-overall{display:flex;align-items:flex-start;gap:8px;padding:2px 0 0}',
    '.dsh-status-panel-dot{display:inline-block;width:8px;height:8px;flex:0 0 auto;margin-top:5px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950)}',
    '.dsh-status-overall-main{min-width:0}',
    '.dsh-status-overall-title{color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;font-size:12px;line-height:18px}',
    '.dsh-status-overall-desc{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:1px;overflow-wrap:anywhere}',
    '.dsh-status-group-row{display:flex;align-items:center;gap:8px;min-width:0;padding:2px 0}',
    '.dsh-status-group-name{min-width:0;color:var(--dsw-alias-label-secondary,CanvasText);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.dsh-status-group-right{display:inline-flex;align-items:center;gap:5px;margin-left:auto;white-space:nowrap}',
    '.dsh-status-group-right .dsh-status-dot{width:6px;height:6px}',
    '.dsh-status-group-status{color:var(--dsw-alias-label-secondary,CanvasText)}',
    '.dsh-status-group-uptime{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}',
    '.dsh-status-incident-title{color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;overflow-wrap:anywhere}',
    '.dsh-status-incident-meta{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:1px;overflow-wrap:anywhere}',
    '.dsh-status-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 12%,transparent));color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px}',
    '.dsh-status-foot a{color:var(--dsw-alias-link,CanvasText);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-foot a:hover{text-decoration:underline dotted var(--dsw-alias-link,CanvasText);text-underline-offset:2px}',
    '.dsh-status-panel-btn{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:20px;height:20px;margin-left:auto;padding:0 2px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font:inherit;font-size:11px;line-height:16px;cursor:pointer}',
    '.dsh-status-panel-btn:hover{color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
    '.dsh-status-panel-btn:disabled{opacity:.5;cursor:default}',
    '.dsh-status-empty{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px}',
  ].join('')
  document.head.appendChild(css)

  var state = { summary: null, error: '', loading: false }
  var listeners = new Set()
  var prevIndicator = null
  var inFlight = false

  function emit() {
    for (var listener of Array.from(listeners)) {
      try { listener() } catch {}
    }
  }
  function subscribe(listener) {
    listeners.add(listener)
    return function () { listeners.delete(listener) }
  }
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
        openPanel()
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
    emit()
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
        emit()
      })
  }

  var card = node('div', 'dsh-status-card')
  card.setAttribute('role', 'button')
  card.setAttribute('tabindex', '0')
  card.setAttribute('aria-haspopup', 'dialog')
  card.setAttribute('aria-expanded', 'false')
  card.innerHTML = [
    '<div class="dsh-status-head">',
    '  <span class="dsh-status-label"></span>',
    '  <span class="dsh-status-value">…</span>',
    '  <span class="dsh-status-chevron" aria-hidden="true">▾</span>',
    '</div>',
    '<div class="dsh-status-line">',
    '  <span class="dsh-status-dot"></span>',
    '  <span class="dsh-status-window">…</span>',
    '  <span class="dsh-status-remain"></span>',
    '</div>',
    '<div class="dsh-status-next"></div>',
  ].join('')
  document.body.appendChild(card)

  var panel = node('div', 'dsh-status-panel')
  panel.hidden = true
  panel.setAttribute('role', 'dialog')
  document.body.appendChild(panel)
  var panelOpen = false

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
    if (panelOpen) positionPanel()
  }
  function positionPanel() {
    if (panel.hidden) return
    var anchor = card.getBoundingClientRect()
    var width = panel.offsetWidth
    var height = panel.offsetHeight
    var left = Math.min(
      Math.max(CARD_EDGE, anchor.right - width),
      Math.max(CARD_EDGE, window.innerWidth - width - CARD_EDGE),
    )
    var top = anchor.top - height - CARD_GAP
    if (top < CARD_EDGE) top = CARD_EDGE
    panel.style.left = Math.round(left) + 'px'
    panel.style.top = Math.round(top) + 'px'
  }
  function updateCard() {
    var summary = state.summary
    var indicator = indicatorOf(summary)
    card.setAttribute('data-status', indicator)
    setText(card.querySelector('.dsh-status-label'), t('服务', 'Service'))
    setText(card.querySelector('.dsh-status-value'), cardState(indicator))
    var count = summary && Number(summary.activeCount)
    var windowText
    if (!summary && state.error) windowText = t('连接失败', 'Connection failed')
    else if (!summary) windowText = '…'
    else if (count > 0) windowText = count + t(' 个活动事件', ' active incident' + (count > 1 ? 's' : ''))
    else windowText = t('无活动事件', 'No active incidents')
    setText(card.querySelector('.dsh-status-window'), windowText)
    setText(card.querySelector('.dsh-status-remain'), '')
    var updated = summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : ''
    var next
    if (!summary && state.error) next = state.error
    else if (!summary) next = t('正在获取状态…', 'Fetching status…')
    else next = t('更新于 ', 'Updated ') + updated
    setText(card.querySelector('.dsh-status-next'), next)
    var hint = t('点击查看状态详情', 'Click for status details')
    if (card.title !== hint) card.title = hint
    var aria = t('DeepSeek 服务：', 'DeepSeek service: ') + cardState(indicator)
    if (count > 0) aria += ' · ' + count + t(' 个活动事件', ' active incident' + (count > 1 ? 's' : ''))
    card.setAttribute('aria-label', aria)
  }

  function overallSection(summary) {
    var indicator = indicatorOf(summary)
    var description = overallDesc(indicator)
    var dot = node('span', 'dsh-status-panel-dot')
    dot.setAttribute('data-status', indicator)
    return append(node('div', 'dsh-status-overall'),
      dot,
      append(node('div', 'dsh-status-overall-main'),
        node('div', 'dsh-status-overall-title', overallTitle(indicator)),
        node('div', 'dsh-status-overall-desc', description)))
  }
  function groupsSection(summary) {
    var wrap = node('div')
    var groups = summary && Array.isArray(summary.groups) ? summary.groups : []
    for (var i = 0; i < groups.length; i += 1) {
      var group = groups[i]
      var status = groupStatus(group)
      var dot = node('span', 'dsh-status-dot')
      dot.setAttribute('data-status', status)
      var right = append(node('span', 'dsh-status-group-right'),
        dot,
        node('span', 'dsh-status-group-status', statusLabel(status)),
        group.uptime !== null && group.uptime !== undefined
          ? node('span', 'dsh-status-group-uptime', fmtUptime(group.uptime))
          : null)
      append(wrap,
        append(node('div', 'dsh-status-group-row'),
          node('span', 'dsh-status-group-name', group.name || t('API 服务', 'API service')),
          right))
    }
    return wrap
  }
  function incidentsSection(summary) {
    var incidents = summary && Array.isArray(summary.incidents) ? summary.incidents : []
    if (!incidents.length) return null
    var wrap = node('div')
    var limit = Math.min(incidents.length, 2)
    for (var i = 0; i < limit; i += 1) {
      var incident = incidents[i]
      var meta = statusLabel(incident.indicator) + ' · ' + incidentStatusLabel(incident.status)
      if (incident.startedAt) meta += ' · ' + t('开始于 ', 'Started ') + fmtDateTime(incident.startedAt)
      if (i > 0) wrap.appendChild(node('div', 'dsh-status-panel-rule'))
      append(wrap,
        node('div', 'dsh-status-incident-title', incident.title),
        node('div', 'dsh-status-incident-meta', meta))
    }
    return wrap
  }
  function renderPanel() {
    var scroll = panel.scrollTop
    panel.textContent = ''
    var summary = state.summary
    var indicator = indicatorOf(summary)
    var updated = summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : '—'
    append(panel,
      append(node('div', 'dsh-status-panel-head'),
        node('span', 'dsh-status-panel-title', t('DeepSeek 状态', 'DeepSeek status')),
        node('span', 'dsh-status-panel-updated', t('更新于 ', 'Updated ') + updated)))

    if (!summary && state.loading) {
      append(panel, node('div', 'dsh-status-panel-rule'), node('div', 'dsh-status-empty', t('正在加载…', 'Loading…')))
    } else if (!summary && state.error) {
      append(panel, node('div', 'dsh-status-panel-rule'),
        append(node('div', 'dsh-status-empty'), node('span', null, t('加载失败：', 'Failed to load: ') + state.error)))
      var errorFoot = node('div', 'dsh-status-foot')
      var retry = node('button', 'dsh-status-panel-btn', t('重试', 'Retry'))
      retry.type = 'button'
      retry.addEventListener('click', function (event) {
        event.stopPropagation()
        loadSummary(true)
      })
      errorFoot.appendChild(retry)
      panel.appendChild(errorFoot)
    } else if (summary) {
      append(panel, node('div', 'dsh-status-panel-rule'), overallSection(summary))
      var groups = groupsSection(summary)
      if (groups.childNodes.length) append(panel, node('div', 'dsh-status-panel-rule'), groups)
      var incidents = incidentsSection(summary)
      if (incidents) append(panel, node('div', 'dsh-status-panel-rule'), incidents)
      if (state.error) append(panel, node('div', 'dsh-status-incident-meta', t('刷新失败：', 'Refresh failed: ') + state.error))

      var foot = append(node('div', 'dsh-status-foot'))
      var official = node('a', null, 'status.deepseek.com ↗')
      official.href = (summary && summary.url) || STATUS_URL
      official.target = '_blank'
      official.rel = 'noreferrer noopener'
      foot.appendChild(official)
      var refresh = node('button', 'dsh-status-panel-btn', '⟳')
      refresh.type = 'button'
      refresh.title = t('刷新', 'Refresh')
      refresh.setAttribute('aria-label', t('刷新', 'Refresh'))
      refresh.disabled = state.loading
      refresh.addEventListener('click', function (event) {
        event.stopPropagation()
        loadSummary(true)
      })
      foot.appendChild(refresh)
      if (notificationPermission() === 'default') {
        var bell = node('button', 'dsh-status-panel-btn', t('启用通知', 'Enable notifications'))
        bell.type = 'button'
        bell.title = t('启用通知', 'Enable notifications')
        bell.addEventListener('click', function (event) {
          event.stopPropagation()
          try {
            Notification.requestPermission().then(function () { renderPanel() })
          } catch {}
        })
        foot.appendChild(bell)
      }
      panel.appendChild(foot)
    }
    panel.scrollTop = scroll
  }

  function openPanel() {
    if (panelOpen) return
    panelOpen = true
    panel.hidden = false
    panel.style.visibility = 'hidden'
    panel.setAttribute('aria-label', t('DeepSeek 状态', 'DeepSeek status'))
    card.setAttribute('aria-expanded', 'true')
    renderPanel()
    positionPanel()
    panel.style.visibility = 'visible'
  }
  function closePanel() {
    if (!panelOpen) return
    panelOpen = false
    panel.hidden = true
    card.setAttribute('aria-expanded', 'false')
  }
  function togglePanel() {
    if (panelOpen) closePanel()
    else openPanel()
  }

  card.addEventListener('click', function () { togglePanel() })
  card.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      togglePanel()
    }
  })
  document.addEventListener('pointerdown', function (event) {
    if (!panelOpen) return
    if (panel.contains(event.target) || card.contains(event.target)) return
    closePanel()
  }, true)
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !panelOpen) return
    closePanel()
    card.focus()
  })
  window.addEventListener('resize', positionCard)
  window.addEventListener('resize', positionPanel)

  subscribe(function () {
    updateCard()
    if (panelOpen) {
      renderPanel()
      positionPanel()
    }
    positionCard()
  })
  updateCard()
  positionCard()
  requestAnimationFrame(positionCard)
  loadSummary(false)
  setInterval(function () { loadSummary(false) }, 30_000)
  setInterval(positionCard, 1000)
})()
