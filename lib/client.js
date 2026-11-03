(function () {
  if (window.__dshDeepSeekStatusInstalled) return
  window.__dshDeepSeekStatusInstalled = true

  var SUMMARY_URL = '/api/deepseek-status/summary'
  var HISTORY_URL = '/api/deepseek-status/history?days=30'
  var STATUS_URL = 'https://status.deepseek.com/'
  var CARD_WIDTH = 172
  var CARD_EDGE = 12
  var CARD_GAP = 8
  var PANEL_WIDTH = 420

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
      var child = arguments[i]
      if (child) parent.appendChild(child)
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
  function fmtDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '—'
    var mins = Math.max(1, Math.round(ms / 60000))
    if (mins < 60) return mins + 'm'
    var hours = Math.floor(mins / 60)
    var rest = mins % 60
    if (hours < 24) return hours + 'h' + (rest ? ' ' + rest + 'm' : '')
    var days = Math.floor(hours / 24)
    var hh = hours % 24
    return days + 'd' + (hh ? ' ' + hh + 'h' : '')
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
  function overallLabel(indicator) {
    var map = {
      operational: t('服务正常', 'Service OK'),
      degraded: t('服务降级', 'Degraded'),
      partial_outage: t('部分中断', 'Partial outage'),
      full_outage: t('服务中断', 'Full outage'),
      maintenance: t('维护中', 'Maintenance'),
      unknown: t('状态未知', 'Status unknown'),
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
      maintenance: t('正在按计划维护，部分服务可能受影响。', 'Scheduled maintenance is in progress.'),
      unknown: t('暂时无法获取状态页数据。', 'The status feed is temporarily unavailable.'),
    }
    return map[indicator] || map.unknown
  }
  function pillLabel(indicator) {
    var map = {
      operational: t('正常', 'Operational'),
      degraded: t('降级', 'Degraded'),
      partial_outage: t('部分中断', 'Partial'),
      full_outage: t('中断', 'Down'),
      maintenance: t('维护', 'Maintenance'),
      unknown: t('未知', 'Unknown'),
    }
    return map[indicator] || map.unknown
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
  function notificationPermission() {
    try {
      return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
    } catch {
      return 'unsupported'
    }
  }

  var css = document.createElement('style')
  css.textContent = [
    '.dsh-status-card{position:fixed;z-index:940;box-sizing:border-box;width:172px;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));color:var(--dsw-alias-label-secondary,CanvasText);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;text-align:left;cursor:pointer;user-select:none}',
    '.dsh-status-card:hover{background-color:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 5%,Canvas))}',
    '.dsh-status-card:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,CanvasText);outline-offset:2px}',
    '.dsh-status-card-head{display:flex;align-items:flex-start;gap:6px;min-width:0}',
    '.dsh-status-card-label{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px;white-space:nowrap}',
    '.dsh-status-card-state{display:inline-flex;align-items:center;gap:5px;margin-left:auto;min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-size:12px;line-height:18px;font-weight:500;white-space:nowrap}',
    '.dsh-status-card-chevron{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10px;line-height:18px;opacity:.7;transition:transform .15s ease}',
    '.dsh-status-card[aria-expanded="true"] .dsh-status-card-chevron{transform:rotate(180deg)}',
    '.dsh-status-card-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950)}',
    '.dsh-status-card[data-status="degraded"] .dsh-status-card-dot,.dsh-status-card[data-status="partial_outage"] .dsh-status-card-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.dsh-status-card[data-status="full_outage"] .dsh-status-card-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.dsh-status-card[data-status="maintenance"] .dsh-status-card-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.dsh-status-card[data-status="unknown"] .dsh-status-card-dot{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
    '.dsh-status-card-sub{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-card-meta{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:10.5px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel{position:fixed;z-index:1100;box-sizing:border-box;width:min(420px,calc(100vw - 24px));max-height:min(680px,calc(100vh - 24px));overflow:auto;padding:16px;border:0;border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));color:var(--dsw-alias-label-secondary,CanvasText);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:12px;line-height:18px;font-weight:400;text-align:left;white-space:normal;user-select:text}',
    '.dsh-status-panel[hidden]{display:none}',
    '.ds-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}',
    '.ds-title{margin:0;color:var(--dsw-alias-label-primary,CanvasText);font-size:16px;line-height:24px;font-weight:600}',
    '.ds-sub{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:2px}',
    '.ds-actions{display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}',
    '.ds-btn{display:inline-flex;align-items:center;gap:4px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,CanvasText);font:inherit;font-size:11px;line-height:16px;padding:3px 7px;cursor:pointer;text-decoration:none}',
    '.ds-btn:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
    '.ds-btn:disabled{opacity:.5;cursor:default}',
    '.ds-overall{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-bottom:16px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:color-mix(in srgb,CanvasText 2%,transparent)}',
    '.ds-overall-dot{width:10px;height:10px;border-radius:50%;margin-top:4px;flex:none;background:var(--dsw-alias-state-success-primary,#3fb950)}',
    '.ds-overall[data-status="degraded"] .ds-overall-dot,.ds-overall[data-status="partial_outage"] .ds-overall-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.ds-overall[data-status="full_outage"] .ds-overall-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.ds-overall[data-status="maintenance"] .ds-overall-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.ds-overall[data-status="unknown"] .ds-overall-dot{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
    '.ds-overall-title{color:var(--dsw-alias-label-primary,CanvasText);font-size:14px;line-height:20px;font-weight:600}',
    '.ds-overall-desc{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:2px}',
    '.ds-section{margin-top:16px}',
    '.ds-section-title{display:flex;align-items:center;gap:8px;margin-bottom:6px;color:var(--dsw-alias-label-primary,CanvasText);font-size:11px;line-height:16px;font-weight:600}',
    '.ds-group{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);overflow:hidden;margin-top:6px}',
    '.ds-group-head{display:flex;align-items:center;gap:8px;padding:8px 12px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:11px;line-height:16px;font-weight:500}',
    '.ds-group-head .ds-uptime{margin-left:auto}',
    '.ds-comp{display:grid;grid-template-columns:7px minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:7px 12px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent))}',
    '.ds-comp-main{min-width:0}',
    '.ds-comp-name{color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px;font-weight:500;overflow-wrap:anywhere}',
    '.ds-comp-desc{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:10.5px;line-height:15px;margin-top:1px;overflow-wrap:anywhere}',
    '.ds-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary,CanvasText)}',
    '.ds-dot[data-status="operational"]{background:var(--dsw-alias-state-success-primary,#3fb950)}',
    '.ds-dot[data-status="degraded"],.ds-dot[data-status="partial_outage"]{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.ds-dot[data-status="full_outage"]{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.ds-dot[data-status="maintenance"]{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.ds-dot[data-status="unknown"]{opacity:.5}',
    '.ds-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:0 7px;font-size:10.5px;line-height:17px;font-weight:500;white-space:nowrap;color:var(--dsw-alias-label-tertiary,CanvasText);background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
    '.ds-pill[data-status="operational"]{color:var(--dsw-alias-state-success-primary,#3fb950);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#3fb950) 12%,transparent)}',
    '.ds-pill[data-status="degraded"],.ds-pill[data-status="partial_outage"]{color:var(--dsw-alias-state-warn-primary,#e6a23c);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e6a23c) 14%,transparent)}',
    '.ds-pill[data-status="full_outage"]{color:var(--dsw-alias-state-error-primary,#d5484a);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d5484a) 12%,transparent)}',
    '.ds-pill[data-status="maintenance"]{color:var(--dsw-alias-state-business-primary,#4a7dff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4a7dff) 12%,transparent)}',
    '.ds-uptime{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.ds-incident{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);padding:10px 12px;margin-top:6px}',
    '.ds-incident-head{display:flex;align-items:flex-start;gap:8px}',
    '.ds-incident-main{min-width:0;flex:1}',
    '.ds-incident-title{color:var(--dsw-alias-label-primary,CanvasText);font-size:12px;line-height:18px;font-weight:600;overflow-wrap:anywhere}',
    '.ds-incident-meta{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;line-height:15px;margin-top:2px}',
    '.ds-incident-desc{color:var(--dsw-alias-label-secondary,CanvasText);font-size:11.5px;line-height:17px;margin-top:6px;overflow-wrap:anywhere}',
    '.ds-updates{margin-top:6px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));padding-top:4px}',
    '.ds-update{display:grid;grid-template-columns:48px minmax(0,1fr);gap:6px;padding-top:3px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:11px;line-height:16px}',
    '.ds-update-time{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;line-height:16px;white-space:nowrap}',
    '.ds-update-text{overflow-wrap:anywhere}',
    '.ds-incident-comps{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;line-height:15px;margin-top:4px;overflow-wrap:anywhere}',
    '.ds-history-item{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-sm,8px);margin-top:4px}',
    '.ds-history-item>summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;list-style:none}',
    '.ds-history-item>summary::-webkit-details-marker{display:none}',
    '.ds-history-date{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;line-height:16px;white-space:nowrap}',
    '.ds-history-title{color:var(--dsw-alias-label-secondary,CanvasText);font-size:11px;line-height:16px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ds-history-duration{display:none}',
    '.ds-history-body{border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));padding:6px 10px 9px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:11px;line-height:16px}',
    '.ds-empty{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;padding:4px 0}',
    '.ds-loading{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;padding:8px 0}',
    '.ds-error{border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#d5484a) 35%,transparent);border-radius:var(--dsw-radius-lg,12px);padding:9px 11px;color:var(--dsw-alias-state-error-primary,#d5484a);font-size:11px;line-height:16px;display:flex;align-items:center;gap:8px}',
    '.ds-error .ds-btn{margin-left:auto;color:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.ds-warn{color:var(--dsw-alias-state-warn-primary,#e6a23c);font-size:10.5px;line-height:15px;margin:-8px 0 10px}',
    '.ds-foot{margin-top:14px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:10.5px;line-height:15px}',
    '.ds-foot a{color:var(--dsw-alias-link,CanvasText);text-decoration:none}',
    '.ds-foot a:hover{text-decoration:underline dotted}',
  ].join('')
  document.head.appendChild(css)

  var state = {
    summary: null,
    summaryError: '',
    summaryLoading: false,
    history: null,
    historyError: '',
    historyLoading: false,
  }
  var listeners = new Set()
  var prevIndicator = null
  var summaryInFlight = false
  var historyInFlight = false

  function emit() {
    for (var listener of Array.from(listeners)) {
      try { listener() } catch {}
    }
  }
  function subscribe(listener) {
    listeners.add(listener)
    return function () { listeners.delete(listener) }
  }
  function summaryIndicator(summary) {
    return summary && summary.ok ? String(summary.indicator || 'unknown') : 'unknown'
  }

  function notify(isUp, summary) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    var indicator = summaryIndicator(summary)
    var incident = summary && Array.isArray(summary.incidents) ? summary.incidents[0] : null
    var title = isUp ? t('DeepSeek 服务已恢复', 'DeepSeek service restored') : t('DeepSeek 服务异常', 'DeepSeek service issue')
    var body = isUp
      ? t('所有系统已恢复正常。', 'All systems are back to normal.')
      : t('服务状态：', 'Service status: ') + overallLabel(indicator) + (incident && incident.title ? ' · ' + incident.title : '')
    try {
      var n = new Notification(title, { body: body, tag: 'dsh-deepseek-status' })
      n.onclick = function () {
        try { window.focus() } catch {}
        openPanel()
        try { n.close() } catch {}
      }
    } catch {}
  }
  function observeIndicator(summary) {
    var indicator = summaryIndicator(summary)
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
    if (summaryInFlight) return
    summaryInFlight = true
    state.summaryLoading = true
    emit()
    fetch(SUMMARY_URL + (force ? '?force=1' : ''), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || 'invalid payload')
        state.summary = data
        state.summaryError = ''
        observeIndicator(data)
      })
      .catch(function (err) {
        state.summaryError = String((err && err.message) || err)
      })
      .finally(function () {
        state.summaryLoading = false
        summaryInFlight = false
        emit()
      })
  }

  function loadHistory(force) {
    if (historyInFlight) return
    historyInFlight = true
    state.historyLoading = true
    emit()
    fetch(HISTORY_URL + (force ? '&force=1' : ''), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || 'invalid payload')
        state.history = data
        state.historyError = ''
      })
      .catch(function (err) {
        state.historyError = String((err && err.message) || err)
      })
      .finally(function () {
        state.historyLoading = false
        historyInFlight = false
        emit()
      })
  }

  var card = node('button')
  card.type = 'button'
  card.className = 'dsh-status-card'
  card.setAttribute('data-status', 'unknown')
  card.setAttribute('aria-haspopup', 'dialog')
  card.setAttribute('aria-expanded', 'false')
  append(card,
    append(node('div', 'dsh-status-card-head'),
      node('span', 'dsh-status-card-label', t('服务', 'Service')),
      append(node('span', 'dsh-status-card-state'),
        node('span', 'dsh-status-card-dot'),
        node('span', 'dsh-status-card-state-text', '…')),
      node('span', 'dsh-status-card-chevron', '▾')),
    node('div', 'dsh-status-card-sub', t('正在获取状态…', 'Fetching status…')),
    node('div', 'dsh-status-card-meta', ''),
  )
  document.body.appendChild(card)

  var panel = node('div', 'dsh-status-panel')
  panel.hidden = true
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', t('DeepSeek 服务状态', 'DeepSeek service status'))
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
    var indicator = summaryIndicator(summary)
    card.setAttribute('data-status', indicator)
    setText(card.querySelector('.dsh-status-card-label'), t('服务', 'Service'))
    setText(card.querySelector('.dsh-status-card-state-text'), overallLabel(indicator))
    var count = summary && Number(summary.activeCount)
    var sub
    if (!summary && state.summaryError) {
      sub = t('状态页不可用', 'Status feed unavailable')
    } else if (!summary) {
      sub = t('正在获取状态…', 'Fetching status…')
    } else if (count > 0) {
      sub = count + t(' 个活动事件', ' active incident' + (count > 1 ? 's' : ''))
    } else {
      sub = t('没有活动事件', 'No active incidents')
    }
    setText(card.querySelector('.dsh-status-card-sub'), sub)
    var updated = summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : '—'
    setText(card.querySelector('.dsh-status-card-meta'), t('更新于 ', 'Updated ') + updated)
    var aria = t('DeepSeek 服务：', 'DeepSeek service: ') + overallLabel(indicator)
    if (count > 0) aria += ' · ' + count + t(' 个活动事件', ' active incident' + (count > 1 ? 's' : ''))
    card.setAttribute('aria-label', aria)
    card.title = aria
  }

  function header() {
    var summary = state.summary
    var indicator = summaryIndicator(summary)
    var updated = summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : '—'
    var actions = node('div', 'ds-actions')
    var refresh = node('button', 'ds-btn', '⟳ ' + t('刷新', 'Refresh'))
    refresh.type = 'button'
    refresh.disabled = state.summaryLoading
    refresh.addEventListener('click', function (event) {
      event.stopPropagation()
      loadSummary(true)
      loadHistory(true)
    })
    actions.appendChild(refresh)
    var official = node('a', 'ds-btn', t('官方状态页', 'Official status page') + ' ↗')
    official.href = (summary && summary.url) || STATUS_URL
    official.target = '_blank'
    official.rel = 'noreferrer noopener'
    actions.appendChild(official)
    if (notificationPermission() === 'default') {
      var bell = node('button', 'ds-btn', t('启用通知', 'Enable notifications'))
      bell.type = 'button'
      bell.addEventListener('click', function (event) {
        event.stopPropagation()
        try {
          Notification.requestPermission().then(function () { renderPanel() })
        } catch {}
      })
      actions.appendChild(bell)
    }
    return append(node('div', 'ds-head'),
      append(node('div'),
        node('h2', 'ds-title', t('DeepSeek 服务状态', 'DeepSeek service status')),
        node('div', 'ds-sub', t('更新于 ', 'Updated ') + updated)),
      actions,
    )
  }

  function overallSection(summary) {
    var indicator = summaryIndicator(summary)
    var incidents = summary && Array.isArray(summary.incidents) ? summary.incidents : []
    var description = incidents.length
      ? incidents[0].title + (incidents.length > 1 ? ' · +' + (incidents.length - 1) : '')
      : overallDesc(indicator)
    var section = node('section', 'ds-overall')
    section.setAttribute('data-status', indicator)
    append(section,
      node('span', 'ds-overall-dot'),
      append(node('div'),
        node('div', 'ds-overall-title', overallTitle(indicator)),
        node('div', 'ds-overall-desc', description)))
    return section
  }

  function componentsSection(summary) {
    var section = append(node('section', 'ds-section'),
      node('div', 'ds-section-title', t('组件', 'Components')))
    var groups = Array.isArray(summary.groups) ? summary.groups : []
    for (var i = 0; i < groups.length; i += 1) {
      var group = groups[i]
      var groupEl = append(node('div', 'ds-group'),
        append(node('div', 'ds-group-head'),
          node('span', null, group.name || t('API 服务', 'API service')),
          group.uptime !== null && group.uptime !== undefined
            ? node('span', 'ds-uptime', fmtUptime(group.uptime) + ' · ' + (summary.uptimeWindowDays || 90) + t('天', 'd'))
            : null))
      var components = Array.isArray(group.components) ? group.components : []
      for (var j = 0; j < components.length; j += 1) {
        var component = components[j]
        var row = append(node('div', 'ds-comp'),
          (function () {
            var dot = node('span', 'ds-dot')
            dot.setAttribute('data-status', component.status || 'unknown')
            return dot
          })(),
          append(node('div', 'ds-comp-main'),
            node('div', 'ds-comp-name', component.name),
            component.description ? node('div', 'ds-comp-desc', component.description) : null),
          (function () {
            var pill = node('span', 'ds-pill', pillLabel(component.status))
            pill.setAttribute('data-status', component.status || 'unknown')
            return pill
          })(),
          node('span', 'ds-uptime', fmtUptime(component.uptime)))
        groupEl.appendChild(row)
      }
      section.appendChild(groupEl)
    }
    return section
  }

  function incidentsSection(summary) {
    var section = append(node('section', 'ds-section'),
      node('div', 'ds-section-title', t('活动事件', 'Active incidents')))
    var incidents = summary && Array.isArray(summary.incidents) ? summary.incidents : []
    if (!incidents.length) {
      section.appendChild(node('div', 'ds-empty', t('当前没有活动事件。', 'No active incidents.')))
      return section
    }
    for (var i = 0; i < incidents.length; i += 1) {
      var incident = incidents[i]
      var cardEl = append(node('div', 'ds-incident'),
        append(node('div', 'ds-incident-head'),
          append(node('div', 'ds-incident-main'),
            node('div', 'ds-incident-title', incident.title),
            node('div', 'ds-incident-meta',
              t('开始于 ', 'Started ') + fmtDateTime(incident.startedAt) +
              (incident.status ? ' · ' + incidentStatusLabel(incident.status) : '') +
              (incident.startedAt ? ' · ' + t('持续 ', 'Duration ') + fmtDuration(Date.now() - incident.startedAt) : ''))),
          (function () {
            var pill = node('span', 'ds-pill', pillLabel(incident.indicator))
            pill.setAttribute('data-status', incident.indicator || 'unknown')
            return pill
          })()))
      if (incident.description) cardEl.appendChild(node('div', 'ds-incident-desc', incident.description))
      if (incident.updates && incident.updates.length) {
        var updates = node('div', 'ds-updates')
        for (var u = 0; u < incident.updates.length; u += 1) {
          var updateRow = node('div', 'ds-update')
          append(updateRow,
            node('span', 'ds-update-time', fmtTime(incident.updates[u].at)),
            node('span', 'ds-update-text', incident.updates[u].description))
          updates.appendChild(updateRow)
        }
        cardEl.appendChild(updates)
      }
      if (incident.components && incident.components.length) {
        cardEl.appendChild(node('div', 'ds-incident-comps', t('受影响组件：', 'Affected: ') + incident.components.join(' · ')))
      }
      section.appendChild(cardEl)
    }
    return section
  }

  function historySection() {
    var section = append(node('section', 'ds-section'),
      node('div', 'ds-section-title', t('最近事件（30 天）', 'Recent events (30 days)')))
    if (state.historyLoading && !state.history) {
      section.appendChild(node('div', 'ds-loading', t('正在加载…', 'Loading…')))
      return section
    }
    if (state.historyError && !state.history) {
      var error = append(node('div', 'ds-error'), node('span', null, t('加载失败：', 'Failed to load: ') + state.historyError))
      var retry = node('button', 'ds-btn', t('重试', 'Retry'))
      retry.type = 'button'
      retry.addEventListener('click', function (event) {
        event.stopPropagation()
        loadHistory(true)
      })
      error.appendChild(retry)
      section.appendChild(error)
      return section
    }
    var items = state.history && Array.isArray(state.history.items) ? state.history.items : []
    if (!items.length) {
      section.appendChild(node('div', 'ds-empty', t('没有最近事件。', 'No recent events.')))
      return section
    }
    var limit = Math.min(items.length, 6)
    for (var i = 0; i < limit; i += 1) {
      var item = items[i]
      var details = node('details', 'ds-history-item')
      var summaryRow = append(node('summary'),
        node('span', 'ds-history-date', fmtDateTime(item.startAt)),
        node('span', 'ds-history-title', item.title),
        (function () {
          var pill = node('span', 'ds-pill', pillLabel(item.impact))
          pill.setAttribute('data-status', item.impact || 'unknown')
          return pill
        })())
      details.appendChild(summaryRow)
      var body = append(node('div', 'ds-history-body'))
      if (item.components && item.components.length) {
        body.appendChild(node('div', 'ds-incident-comps', t('受影响组件：', 'Affected: ') + item.components.join(' · ')))
      }
      if (item.updates && item.updates.length) {
        for (var k = 0; k < item.updates.length; k += 1) {
          var row = node('div', 'ds-update')
          append(row, node('span', 'ds-update-time', fmtTime(item.updates[k].at)), node('span', 'ds-update-text', item.updates[k].description))
          body.appendChild(row)
        }
      } else if (item.description) {
        body.appendChild(node('div', 'ds-incident-desc', item.description))
      }
      details.appendChild(body)
      section.appendChild(details)
    }
    return section
  }

  function renderPanel() {
    var scroll = panel.scrollTop
    panel.textContent = ''
    panel.appendChild(header())
    if (!state.summary && state.summaryLoading) {
      panel.appendChild(node('div', 'ds-loading', t('正在加载…', 'Loading…')))
    } else if (!state.summary && state.summaryError) {
      var error = append(node('div', 'ds-error'), node('span', null, t('加载失败：', 'Failed to load: ') + state.summaryError))
      var retry = node('button', 'ds-btn', t('重试', 'Retry'))
      retry.type = 'button'
      retry.addEventListener('click', function (event) {
        event.stopPropagation()
        loadSummary(true)
        loadHistory(true)
      })
      error.appendChild(retry)
      panel.appendChild(error)
    } else if (state.summary) {
      if (state.summaryError) panel.appendChild(node('div', 'ds-warn', t('刷新失败：', 'Refresh failed: ') + state.summaryError))
      panel.appendChild(overallSection(state.summary))
      panel.appendChild(componentsSection(state.summary))
      panel.appendChild(incidentsSection(state.summary))
      panel.appendChild(historySection())
      var foot = append(node('div', 'ds-foot'), node('span', null, t('数据来自 ', 'Data from ') + ' '))
      var link = node('a', null, 'status.deepseek.com')
      link.href = (state.summary && state.summary.url) || STATUS_URL
      link.target = '_blank'
      link.rel = 'noreferrer noopener'
      foot.appendChild(link)
      panel.appendChild(foot)
    }
    panel.scrollTop = scroll
  }

  function openPanel() {
    if (panelOpen) return
    panelOpen = true
    panel.hidden = false
    panel.style.visibility = 'hidden'
    panel.setAttribute('aria-label', t('DeepSeek 服务状态', 'DeepSeek service status'))
    card.setAttribute('aria-expanded', 'true')
    renderPanel()
    panel.style.visibility = 'hidden'
    positionPanel()
    panel.style.visibility = 'visible'
    if (!state.history && !state.historyLoading) loadHistory(false)
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

  function onChange() {
    updateCard()
    if (panelOpen) {
      renderPanel()
      positionPanel()
    }
    positionCard()
  }
  subscribe(onChange)

  updateCard()
  positionCard()
  requestAnimationFrame(positionCard)
  loadSummary(false)
  setInterval(function () { loadSummary(false) }, 30_000)
  setInterval(positionCard, 1000)
})()
