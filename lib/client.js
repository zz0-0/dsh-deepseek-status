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
  function componentShortName(name) {
    return String(name || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/^DeepSeek\s+/i, '')
      .trim() || name
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
    '.dsh-status-card{position:fixed;z-index:2147483000;display:flex;flex-direction:column;gap:3px;box-sizing:border-box;width:172px;min-width:0;max-width:172px;padding:8px 9px;border-radius:12px;font:500 11px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:10.5px;font-variant-numeric:tabular-nums;color:CanvasText;background:color-mix(in srgb,Canvas 95%,transparent);border:1px solid color-mix(in srgb,CanvasText 16%,transparent);box-shadow:0 10px 34px rgba(0,0,0,.2);user-select:none;backdrop-filter:blur(10px);cursor:pointer;transition:width .15s ease;max-height:calc(100vh - 180px);overflow:auto}',
    '.dsh-status-head{display:flex;align-items:flex-start;gap:6px}',
    '.dsh-status-label{padding-top:3px;font-size:10px;opacity:.58}',
    '.dsh-status-value{min-width:0;font-size:13px;font-weight:650;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-chevron{margin-left:2px;opacity:.45;font-size:10px;line-height:1;padding:1px}',
    '.dsh-status-refresh{margin-left:auto;border:0;background:transparent;color:inherit;opacity:.45;font-size:12px;line-height:1;padding:2px;cursor:pointer}',
    '.dsh-status-refresh:hover,.dsh-status-chevron:hover{opacity:1}',
    '.dsh-status-line{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px}',
    '.dsh-status-dot{display:inline-block;width:6px;height:6px;flex:0 0 auto;border-radius:50%;background:#3fb950;vertical-align:middle}',
    '.dsh-status-head .dsh-status-dot{margin-top:7px}',
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
    '.dsh-status-detail-row{display:flex;align-items:baseline;gap:5px;margin-top:2px;min-width:0;overflow-wrap:anywhere}',
    '.dsh-status-detail-name{min-width:0;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.dsh-status-detail-right{display:inline-flex;align-items:center;gap:4px;margin-left:auto;white-space:nowrap}',
    '.dsh-status-detail-dot{display:inline-block;width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:#3fb950}',
    '.dsh-status-detail-title{opacity:.9;font-weight:600}',
    '.dsh-status-detail-desc{margin-top:1px;opacity:.62;overflow-wrap:anywhere}',
    '.dsh-status-detail-link{display:block;margin-top:6px;color:inherit;opacity:.72;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dsh-status-detail-link:hover{opacity:1;text-decoration:underline dotted;text-underline-offset:2px}',
    '.dsh-status-detail-foot{display:flex;align-items:center;gap:6px;margin-top:6px}',
    '.dsh-status-detail-foot .dsh-status-detail-link{margin-top:0;min-width:0}',
    '.dsh-status-detail-bell{margin-left:auto;border:0;background:transparent;color:inherit;font:inherit;opacity:.72;padding:0;cursor:pointer;white-space:nowrap}',
    '.dsh-status-detail-bell:hover{opacity:1;text-decoration:underline dotted;text-underline-offset:2px}',
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
        if (expanded) renderDetails()
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
    '  <button class="dsh-status-refresh" type="button">⟳</button>',
    '</div>',
    '<div class="dsh-status-details"></div>',
  ].join('')
  document.body.appendChild(card)
  card.querySelector('.dsh-status-refresh').title = t('刷新', 'Refresh')

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

  function detailDot(status) {
    var dot = node('span', 'dsh-status-detail-dot')
    dot.setAttribute('data-status', status)
    return dot
  }
  function renderDetails() {
    var details = card.querySelector('.dsh-status-details')
    var scroll = details.scrollTop
    details.textContent = ''
    var summary = state.summary
    if (!summary) {
      details.appendChild(node('div', 'dsh-status-detail-desc',
        state.error ? t('加载失败：', 'Failed to load: ') + state.error : t('正在加载…', 'Loading…')))
      details.scrollTop = scroll
      return
    }
    var indicator = indicatorOf(summary)
    var overall = append(node('div', 'dsh-status-detail-row'),
      detailDot(indicator),
      node('span', 'dsh-status-detail-title', overallTitle(indicator)))
    details.appendChild(overall)

    var groups = Array.isArray(summary.groups) ? summary.groups : []
    for (var i = 0; i < groups.length; i += 1) {
      var group = groups[i]
      var components = Array.isArray(group.components) ? group.components : []
      if (!components.length) continue
      details.appendChild(node('div', 'dsh-status-detail-group', groupShortName(group.name)))
      for (var j = 0; j < components.length; j += 1) {
        var component = components[j]
        var componentStatus = component.status || 'unknown'
        var name = node('span', 'dsh-status-detail-name', componentShortName(component.name))
        name.title = component.name || ''
        details.appendChild(append(node('div', 'dsh-status-detail-row'),
          name,
          append(node('span', 'dsh-status-detail-right'),
            detailDot(componentStatus),
            node('span', null, statusLabel(componentStatus)))))
      }
    }

    var incidents = Array.isArray(summary.incidents) ? summary.incidents : []
    for (var k = 0; k < Math.min(incidents.length, 2); k += 1) {
      var incident = incidents[k]
      details.appendChild(node('div', 'dsh-status-detail-row dsh-status-detail-title', incident.title))
      var meta = statusLabel(incident.indicator) + ' · ' + incidentStatusLabel(incident.status)
      if (incident.startedAt) meta += ' · ' + fmtDateTime(incident.startedAt)
      details.appendChild(node('div', 'dsh-status-detail-desc', meta))
    }

    var link = node('a', 'dsh-status-detail-link', 'status.deepseek.com ↗')
    link.href = (summary && summary.url) || STATUS_URL
    link.target = '_blank'
    link.rel = 'noreferrer noopener'
    link.addEventListener('click', function (event) { event.stopPropagation() })
    var foot = append(node('div', 'dsh-status-detail-foot'), link)
    if (notificationPermission() === 'default') {
      var bell = node('button', 'dsh-status-detail-bell', t('启用通知', 'Enable notifications'))
      bell.type = 'button'
      bell.addEventListener('click', function (event) {
        event.stopPropagation()
        try {
          Notification.requestPermission().then(function () { renderDetails() })
        } catch {}
      })
      foot.appendChild(bell)
    }
    details.appendChild(foot)
    details.scrollTop = scroll
  }
  function setExpanded(value) {
    expanded = value
    card.classList.toggle('expanded', expanded)
    card.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    var chevron = card.querySelector('.dsh-status-chevron')
    if (chevron) chevron.textContent = expanded ? '▴' : '▾'
    updateCard()
    if (expanded) {
      renderDetails()
      positionCard()
    }
    card.title = expanded ? t('点击收起', 'Click to collapse') : t('点击展开详情', 'Click for details')
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
  card.querySelector('.dsh-status-refresh').addEventListener('click', function (event) {
    event.stopPropagation()
    loadSummary(true)
  })
  window.addEventListener('resize', positionCard)

  updateCard()
  positionCard()
  requestAnimationFrame(positionCard)
  loadSummary(false)
  setInterval(function () { loadSummary(false) }, 30_000)
  setInterval(positionCard, 1000)
})()
