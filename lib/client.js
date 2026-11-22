(function () {
  if (window.__dshDeepSeekStatusInstalled) return
  window.__dshDeepSeekStatusInstalled = true

  var SUMMARY_URL = '/api/deepseek-status/summary'
  var STATUS_URL = 'https://status.deepseek.com/'
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
    // The service state is one chip on the footer's own 32px line above
    // Settings, right aligned after the balance chip. The chip fills that line,
    // so its hover surface is the same height as a workspace/session row
    // instead of a short text pill. That line is a sibling of the footer's
    // action row (which already holds the stock Cordis occupant), so the chip
    // never competes with a full-width flex item for the row.
    // The chips share the footer's own column, not the list's indented text
// column: the Settings trigger's content starts at sidebar inline 8 + paint
// inset 3 + its padding 9 = 20px, and ends 12px from the right edge. The chip
// adds its own 5px inline padding, so the row pads 7px on each side. List rows
// sit deeper than this by their own nesting indent.
    '.dsh-footer-status-row{display:flex;flex:none;align-items:center;gap:8px;box-sizing:border-box;width:100%;min-width:0;overflow:hidden;height:32px;padding:0 7px}',
    '[data-sidebar-collapsed] .dsh-footer-status-row{display:none}',
    // Same type as the balance chip and the sidebar rows: family inherited
    // (the button opts back in), size from the theme's secondary content size.
    '.dsh-status-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;min-width:0;overflow:hidden;flex:0 0 auto;box-sizing:border-box;height:32px;margin-left:auto;padding:0 5px;border:0;border-radius:var(--dsw-radius-md,8px);background:transparent;font-family:inherit;font-size:var(--dsh-content-font-size-secondary,13px);line-height:32px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,CanvasText);white-space:nowrap;cursor:pointer;transition:background .12s ease}',
    '@media (hover:hover){.dsh-status-chip:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}}',
    '.dsh-status-chip[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
    '.dsh-status-label{color:var(--dsw-alias-label-tertiary,CanvasText)}',
    '.dsh-status-value{min-width:0;color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel{position:fixed;z-index:950;box-sizing:border-box;display:flex;flex-direction:column;width:min(400px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:16px;border:0;border-radius:var(--dsw-radius-lg,12px);font-size:12px;line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));text-align:left;white-space:normal;user-select:text}',
    '.dsh-status-panel[hidden]{display:none}',
    '.dsh-status-panel:focus{outline:none}',
    '.dsh-status-panel-head{display:flex;align-items:flex-start;gap:8px}',
    '.dsh-status-panel-summary{display:flex;align-items:center;gap:6px;margin-top:4px}',
    '.dsh-status-panel-overall{color:var(--dsw-alias-label-primary,CanvasText);font-weight:500;white-space:nowrap}',
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
    '.dsh-status-panel-note{margin:8px 0 0;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:11px;line-height:16px}',
    '.dsh-status-panel-foot{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 12%,transparent));color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px}',
    '.dsh-status-panel-link{color:var(--dsw-alias-link,CanvasText);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-panel-link:hover{text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-panel-refresh{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;margin-left:auto;padding:0;border:0;border-radius:24px;background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font-size:13px;line-height:1;cursor:pointer}',
    '.dsh-status-panel-refresh:hover{color:var(--dsw-alias-label-secondary,CanvasText);background:var(--dsw-alias-interactive-bg-hover)}',
    '.dsh-status-panel-bell{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font:inherit;font-size:11px;line-height:16px;padding:0;cursor:pointer;white-space:nowrap}',
    '.dsh-status-panel-bell[data-state="default"]:hover{color:var(--dsw-alias-label-secondary,CanvasText);text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-panel-bell[data-state="granted"]{color:var(--dsw-alias-state-success-primary,#3fb950);cursor:default}',
    '.dsh-status-panel-bell[data-state="denied"]{color:var(--dsw-alias-state-warn-primary,#e6a23c);cursor:help}',
    '.dsh-status-panel-bell[hidden]{display:none}',
    '.dsh-status-dot{display:inline-block;width:6px;height:6px;flex:0 0 auto;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950);vertical-align:middle}',
    '.dsh-status-dot[data-status="degraded"],.dsh-status-dot[data-status="partial_outage"]{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.dsh-status-dot[data-status="full_outage"]{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.dsh-status-dot[data-status="maintenance"]{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.dsh-status-dot[data-status="unknown"]{background:currentColor;opacity:.35}',
    '.dsh-status-chip[data-status="degraded"] .dsh-status-dot,.dsh-status-chip[data-status="partial_outage"] .dsh-status-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
    '.dsh-status-chip[data-status="full_outage"] .dsh-status-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
    '.dsh-status-chip[data-status="maintenance"] .dsh-status-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
    '.dsh-status-chip[data-status="unknown"] .dsh-status-dot{background:currentColor;opacity:.35}',
  ].join('')
  document.head.appendChild(css)

  var state = { summary: null, error: '', loading: false }
  var expanded = false
  var pinned = false
  var hoverOpenTimer = 0
  var hoverCloseTimer = 0
  var prevIndicator = null
  var inFlight = false
  var HOVER_OPEN_MS = 400
  var HOVER_CLOSE_MS = 180
  var PANEL_EVENT = 'dsh-dock-panel-open'

  function canHover() {
    try {
      return window.matchMedia('(hover: hover)').matches
    } catch {
      return true
    }
  }

  function clearHoverTimers() {
    if (hoverOpenTimer) clearTimeout(hoverOpenTimer)
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
    hoverOpenTimer = 0
    hoverCloseTimer = 0
  }

  function announcePanelOpen() {
    try {
      window.dispatchEvent(new CustomEvent(PANEL_EVENT, { detail: { id: 'dsh-deepseek-status' } }))
    } catch {}
  }

  function notify(isUp, summary) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    var indicator = indicatorOf(summary)
    var incident = summary && Array.isArray(summary.incidents) ? summary.incidents[0] : null
    var title = isUp ? t('DeepSeek 服务已恢复', 'DeepSeek service restored') : t('DeepSeek 服务异常', 'DeepSeek service issue')
    var body = isUp
      ? t('所有系统已恢复正常。', 'All systems are back to normal.')
      : t('服务状态：', 'Service status: ') + statusLabel(indicator) + (incident && incident.title ? ' · ' + incident.title : '')
    raiseNotification(title, body, 'dsh-deepseek-status')
  }
  function raiseNotification(title, body, tag) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      var n = new Notification(title, { body: body, tag: tag })
      n.onclick = function () {
        try { window.focus() } catch {}
        openCard()
        try { n.close() } catch {}
      }
    } catch {}
  }
  // A single confirmation notification when permission is granted: the browser
  // prompt may vanish without any visible result, and this proves the channel
  // works before the first real outage.
  function notifyEnabled() {
    raiseNotification(
      t('DeepSeek 状态通知已开启', 'DeepSeek status notifications are on'),
      t('服务异常或恢复时会在这里提醒你。', 'You will be notified here when DeepSeek goes down or recovers.'),
      'dsh-deepseek-status-permission',
    )
  }
  function bellLabel(permission) {
    if (permission === 'granted') return t('通知已开启', 'Notifications on')
    if (permission === 'denied') return t('通知被浏览器阻止', 'Notifications blocked')
    return t('启用通知', 'Enable notifications')
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

  // The footer column ends with the action row and then the Settings trigger.
  // This plugin finds the same full-width 24px line the balance plugin inserts
  // there (or creates it), so both chips share a row that nothing else claims.
  // The sidebar remounts with the mobile drawer and the frame, so the tick
  // below re-creates the chip when detached.
  var card = null

  function footerRow() {
    var settings = document.querySelector('[data-slot="sidebar.settings"]')
    var settingsArea = settings ? settings.parentElement : null
    var foot = settingsArea ? settingsArea.parentElement : null
    if (!foot) return null
    var row = foot.querySelector('[data-dsh-footer-status-row]')
    if (row) return row
    row = document.createElement('div')
    row.className = 'dsh-footer-status-row'
    row.setAttribute('data-dsh-footer-status-row', '1')
    foot.insertBefore(row, settingsArea)
    return row
  }

  function ensureChip() {
    if (card && card.isConnected) return card
    var row = footerRow()
    if (!row) return null
    var chip = node('button', 'dsh-status-chip')
    chip.type = 'button'
    chip.setAttribute('data-dsh-status-chip', '1')
    chip.setAttribute('aria-haspopup', 'dialog')
    chip.setAttribute('aria-controls', 'dsh-status-panel')
    chip.setAttribute('aria-expanded', 'false')
    chip.innerHTML = [
      '<span class="dsh-status-dot"></span>',
      '<span class="dsh-status-label"></span>',
      '<span class="dsh-status-value">…</span>',
    ].join('')
    // A <button> turns Enter/Space into a click itself; adding keydown here
    // would toggle twice.
    chip.addEventListener('click', toggleCard)
    // The chip sits on the way to Settings, so hover waits longer than the old
    // floating card did; a pointer passing through never opens the panel.
    if (canHover()) {
      chip.addEventListener('pointerenter', scheduleHoverOpen)
      chip.addEventListener('pointerleave', scheduleHoverClose)
    }
    row.appendChild(chip)
    card = chip
    return chip
  }

  var detailCard = node('div', 'dsh-status-panel')
  detailCard.hidden = true
  detailCard.setAttribute('id', 'dsh-status-panel')
  detailCard.setAttribute('tabindex', '-1')
  detailCard.setAttribute('role', 'dialog')
  detailCard.innerHTML = [
    '<div class="dsh-status-panel-head">',
    '  <span class="dsh-status-panel-title"></span>',
    '  <span class="dsh-status-panel-updated"></span>',
    '  <button class="dsh-status-panel-close" type="button">×</button>',
    '</div>',
    '<div class="dsh-status-panel-summary">',
    '  <span class="dsh-status-dot"></span>',
    '  <span class="dsh-status-panel-overall"></span>',
    '</div>',
    '<div class="dsh-status-panel-rule"></div>',
    '<div class="dsh-status-panel-grid"></div>',
    '<div class="dsh-status-panel-foot">',
    '  <a class="dsh-status-panel-link" target="_blank" rel="noreferrer noopener">status.deepseek.com ↗</a>',
    '  <button class="dsh-status-panel-refresh" type="button">⟳</button>',
    '  <button class="dsh-status-panel-bell" type="button">启用通知</button>',
    '</div>',
    '<p class="dsh-status-panel-note"></p>',
  ].join('')
  document.body.appendChild(detailCard)

  // The detail panel opens upward from the chip and clamps to the viewport.
  // Because the chip lives in the sidebar footer, the panel never has to dodge
  // the composer or the file panel: it covers the bottom-left corner only
  // while it is open.
  function positionDetail() {
    if (!expanded || detailCard.hidden || !card || !card.isConnected) return
    var anchor = card.getBoundingClientRect()
    var width = detailCard.offsetWidth || 400
    var height = detailCard.offsetHeight
    var left = Math.max(CARD_EDGE, Math.min(anchor.left, window.innerWidth - width - CARD_EDGE))
    var top = anchor.top - height - CARD_GAP
    if (top < CARD_EDGE) top = Math.min(anchor.bottom + CARD_GAP, window.innerHeight - height - CARD_EDGE)
    detailCard.style.left = Math.round(left) + 'px'
    detailCard.style.top = Math.round(Math.max(CARD_EDGE, top)) + 'px'
  }
  function updateCard() {
    var chip = ensureChip()
    if (!chip) {
      // The footer is gone (drawer closed, rail, frame rebuilt): drop the panel
      // rather than leave it floating without an anchor.
      if (expanded) {
        expanded = false
        pinned = false
        detailCard.hidden = true
      }
      return
    }
    var summary = state.summary
    var indicator = indicatorOf(summary)
    chip.setAttribute('data-status', indicator)
    setText(chip.querySelector('.dsh-status-label'), t('服务', 'Service'))
    setText(chip.querySelector('.dsh-status-value'), cardState(indicator))
    // No `title`: the chip opens its panel on hover, and a native tooltip would
    // pop up on top of it.
    var aria = t('DeepSeek 服务：', 'DeepSeek service: ') + cardState(indicator)
    chip.setAttribute('aria-label', aria)
    chip.setAttribute('aria-expanded', expanded ? 'true' : 'false')
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
    var permission = notificationPermission()
    bell.hidden = permission === 'unsupported'
    bell.textContent = bellLabel(permission)
    bell.dataset.state = permission
    bell.setAttribute('aria-disabled', permission === 'default' ? 'false' : 'true')
    bell.title = permission === 'denied'
      ? t('在浏览器的站点设置里允许通知，然后刷新页面。', 'Allow notifications for this site in the browser settings, then reload.')
      : permission === 'granted'
        ? t('浏览器已允许通知；服务异常或恢复时会提醒。', 'The browser allows notifications; you will be told when service goes down or recovers.')
        : ''

    var summaryDot = detailCard.querySelector('.dsh-status-panel-summary .dsh-status-dot')
    var summaryOverall = detailCard.querySelector('.dsh-status-panel-overall')
    if (summaryDot && summaryOverall) {
      summaryDot.setAttribute('data-status', indicatorOf(summary))
      setText(summaryOverall, summary ? overallTitle(indicatorOf(summary))
        : (state.error ? t('状态未知', 'Status unknown') : t('正在加载…', 'Loading…')))
    }
    setText(detailCard.querySelector('.dsh-status-panel-note'), t(
      '状态来自 DeepSeek 官方状态页，每 30 秒刷新。',
      'Status comes from the official DeepSeek status page; refreshed every 30 seconds.',
    ))

    if (!summary) {
      grid.appendChild(node('div', 'dsh-status-panel-empty',
        state.error ? t('加载失败：', 'Failed to load: ') + state.error : t('正在加载…', 'Loading…')))
      detailCard.scrollTop = scroll
      return
    }
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
    clearHoverTimers()
    if ((!card || !card.isConnected) && !ensureChip()) {
      expanded = false
      pinned = false
      detailCard.hidden = true
      return
    }
    // A rail-hidden chip has no box to anchor to; opening from a notification
    // in that state must not paste the panel into the corner.
    if (value && card.getClientRects().length === 0) {
      expanded = false
      pinned = false
      detailCard.hidden = true
      return
    }
    if (expanded === value) {
      if (value) {
        updateCard()
        positionDetail()
      }
      return
    }
    expanded = value
    if (!expanded) pinned = false
    if (expanded) {
      announcePanelOpen()
      detailCard.hidden = false
      detailCard.style.visibility = 'hidden'
      detailCard.setAttribute('aria-label', t('DeepSeek 状态详情', 'DeepSeek status details'))
      renderDetails()
      positionDetail()
      detailCard.style.visibility = 'visible'
    } else {
      var hadFocus = detailCard.contains(document.activeElement)
      detailCard.hidden = true
      if (hadFocus && card && card.isConnected) card.focus()
    }
    updateCard()
  }
  function openCard() {
    pinned = true
    setExpanded(true)
    // A click or keyboard activation moves into the dialog; hover-open does not
    // steal focus.
    try { detailCard.focus({ preventScroll: true }) } catch {}
  }
  function scheduleHoverOpen() {
    if (!canHover()) return
    clearHoverTimers()
    if (expanded) return
    hoverOpenTimer = setTimeout(function () {
      hoverOpenTimer = 0
      // A pointer that only passed over the chip must not open the panel after
      // it has left; without this check the pending open survives pointerleave.
      if (expanded || !card || !card.matches(':hover')) return
      pinned = false
      setExpanded(true)
    }, HOVER_OPEN_MS)
  }
  function scheduleHoverClose() {
    if (!canHover()) return
    // Always cancel a pending open: the footer chip sits on the way to
    // Settings, so a pass-through is the common case, not the exception.
    if (hoverOpenTimer) {
      clearTimeout(hoverOpenTimer)
      hoverOpenTimer = 0
    }
    if (!expanded || pinned) return
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
    hoverCloseTimer = setTimeout(function () {
      hoverCloseTimer = 0
      if (expanded && !pinned) setExpanded(false)
    }, HOVER_CLOSE_MS)
  }
  function cancelHoverClose() {
    clearHoverTimers()
  }
  function toggleCard() {
    // The chip is a <button> itself, so a closest('button') guard here would
    // swallow every click; it has no nested controls to skip.
    clearHoverTimers()
    if (expanded) {
      if (pinned) {
        setExpanded(false)
        return
      }
      // A hover-opened panel turns into a pinned one on click instead of
      // closing under the pointer that just arrived.
      pinned = true
      updateCard()
      return
    }
    pinned = true
    setExpanded(true)
    // A click or keyboard activation moves into the dialog; hover-open does not
    // steal focus.
    try { detailCard.focus({ preventScroll: true }) } catch {}
  }
  if (canHover()) {
    detailCard.addEventListener('pointerenter', cancelHoverClose)
    detailCard.addEventListener('pointerleave', scheduleHoverClose)
  }
  detailCard.querySelector('.dsh-status-panel-refresh').setAttribute('aria-label', t('刷新状态', 'Refresh status'))
  detailCard.querySelector('.dsh-status-panel-refresh').addEventListener('click', function (event) {
    event.stopPropagation()
    loadSummary(true)
  })
  detailCard.querySelector('.dsh-status-panel-bell').addEventListener('click', function (event) {
    event.stopPropagation()
    if (notificationPermission() !== 'default') return
    try {
      Notification.requestPermission().then(function (result) {
        renderDetails()
        if (result === 'granted') notifyEnabled()
      })
    } catch {}
  })
  detailCard.querySelector('.dsh-status-panel-close').setAttribute('aria-label', t('关闭', 'Close'))
  detailCard.querySelector('.dsh-status-panel-close').addEventListener('click', function (event) {
    event.stopPropagation()
    setExpanded(false)
    if (card) card.focus()
  })
  document.addEventListener('pointerdown', function (event) {
    if (!expanded) return
    if ((card && card.contains(event.target)) || detailCard.contains(event.target)) return
    setExpanded(false)
  }, true)
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !expanded) return
    setExpanded(false)
    if (card) card.focus()
  })
  window.addEventListener(PANEL_EVENT, function (event) {
    if (event && event.detail && event.detail.id === 'dsh-deepseek-status') return
    if (expanded) setExpanded(false)
  })
  window.addEventListener('resize', function () { if (expanded) positionDetail() })

  updateCard()
  loadSummary(false)
  setInterval(function () { loadSummary(false) }, 30_000)
  // The sidebar remounts (drawer, frame rebuild) and the rail hides the chip
  // through CSS; re-anchor and close rather than leave the panel behind.
  setInterval(function () {
    var chip = ensureChip()
    if (!chip) {
      if (expanded) setExpanded(false)
      return
    }
    // The sidebar mounts after this script, so the first paint can land before
    // the footer exists: repaint until the chip has its readings.
    updateCard()
    if (expanded && chip.getClientRects().length === 0) setExpanded(false)
    if (expanded) positionDetail()
  }, 1000)
})()
