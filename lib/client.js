/**
 * dsh-deepseek-status — browser half.
 *
 * Registers three things:
 *   - `main` panel `deepseek-status`: the full status page (the status-page
 *     replica, grouped components, uptime, active incident, recent history);
 *   - `sidebar.panellist` id `deepseek-status`: the sidebar entry;
 *   - a bottom-right status strip, anchored above the dsh-balance card when it
 *     is installed, that always shows the current overall state and opens the
 *     page on click.
 *
 * The strip and the page share one store that polls the host's normalized
 * `/api/deepseek-status/summary` endpoint every 30 seconds. The same store
 * raises one browser notification per down/up transition.
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-status',
  factory: (require) => {
    const react = require('react')
    const h = react.createElement

    const NS = 'deepseekStatus'
    const PANEL_ID = 'deepseek-status'
    const CSS_ID = 'dsh-deepseek-status/style'
    const STATUS_URL = 'https://status.deepseek.com/'

    const zh = {
      panel: '状态',
      title: 'DeepSeek 状态',
      updated: '更新于',
      refresh: '刷新',
      official: '官方状态页',
      components: '组件',
      apiGroup: 'API 服务',
      activeIncidents: '活动事件',
      noActiveIncidents: '当前没有活动事件。',
      recent: '最近事件',
      noRecent: '没有最近事件。',
      loading: '正在加载…',
      loadFailed: '加载失败',
      retry: '重试',
      affected: '受影响组件',
      started: '开始于',
      duration: '持续',
      updates: '进展',
      enableNotifications: '启用通知',
      notificationsOn: '通知已开启',
      notificationsBlocked: '通知被浏览器阻止',
      notifUpTitle: 'DeepSeek 服务已恢复',
      notifUpBody: '所有系统已恢复正常。',
      notifDownTitle: 'DeepSeek 服务异常',
      notifDownBody: '服务状态：',
      ov_operational: '一切正常',
      ov_degraded: '服务降级',
      ov_partial_outage: '部分中断',
      ov_full_outage: '完全中断',
      ov_maintenance: '维护中',
      ov_unknown: '状态未知',
      ovd_operational: '所有系统均按预期运行。',
      ovd_degraded: '部分服务性能下降。',
      ovd_partial_outage: '部分服务出现故障。',
      ovd_full_outage: '关键服务不可用。',
      ovd_maintenance: '正在按计划维护，部分服务可能受影响。',
      ovd_unknown: '暂时无法获取状态页数据。',
      op_operational: '正常',
      op_degraded: '降级',
      op_partial_outage: '部分中断',
      op_full_outage: '中断',
      op_maintenance: '维护',
      op_unknown: '未知',
      st_operational: '服务正常',
      st_degraded: '服务降级',
      st_partial_outage: '部分中断',
      st_full_outage: '服务中断',
      st_maintenance: '维护中',
      st_unknown: '状态未知',
      inc_investigating: '排查中',
      inc_identified: '已定位',
      inc_monitoring: '监控中',
      inc_scheduled: '已计划',
      inc_in_progress: '进行中',
      inc_resolved: '已恢复',
      inc_completed: '已完成',
      inc_cancelled: '已取消',
      dayUnit: '天',
      noData: '暂无数据',
      dataSource: '数据来自',
      incidentUnit: '个事件',
      stripIncidents: '个',
    }

    const en = {
      panel: 'Status',
      title: 'DeepSeek status',
      updated: 'Updated',
      refresh: 'Refresh',
      official: 'Official status page',
      components: 'Components',
      apiGroup: 'API service',
      activeIncidents: 'Active incidents',
      noActiveIncidents: 'No active incidents.',
      recent: 'Recent events',
      noRecent: 'No recent events.',
      loading: 'Loading…',
      loadFailed: 'Failed to load',
      retry: 'Retry',
      affected: 'Affected components',
      started: 'Started',
      duration: 'Duration',
      updates: 'Updates',
      enableNotifications: 'Enable notifications',
      notificationsOn: 'Notifications on',
      notificationsBlocked: 'Notifications blocked by the browser',
      notifUpTitle: 'DeepSeek service restored',
      notifUpBody: 'All systems are back to normal.',
      notifDownTitle: 'DeepSeek service issue',
      notifDownBody: 'Service status: ',
      ov_operational: 'All systems operational',
      ov_degraded: 'Degraded performance',
      ov_partial_outage: 'Partial outage',
      ov_full_outage: 'Full outage',
      ov_maintenance: 'Under maintenance',
      ov_unknown: 'Status unknown',
      ovd_operational: 'All services are running normally.',
      ovd_degraded: 'Some services are experiencing degraded performance.',
      ovd_partial_outage: 'Some services are experiencing issues.',
      ovd_full_outage: 'Critical services are down.',
      ovd_maintenance: 'Scheduled maintenance is in progress.',
      ovd_unknown: 'The status feed is temporarily unavailable.',
      op_operational: 'Operational',
      op_degraded: 'Degraded',
      op_partial_outage: 'Partial',
      op_full_outage: 'Down',
      op_maintenance: 'Maintenance',
      op_unknown: 'Unknown',
      st_operational: 'Service OK',
      st_degraded: 'Degraded',
      st_partial_outage: 'Partial outage',
      st_full_outage: 'Service down',
      st_maintenance: 'Maintenance',
      st_unknown: 'Status unknown',
      inc_investigating: 'Investigating',
      inc_identified: 'Identified',
      inc_monitoring: 'Monitoring',
      inc_scheduled: 'Scheduled',
      inc_in_progress: 'In progress',
      inc_resolved: 'Resolved',
      inc_completed: 'Completed',
      inc_cancelled: 'Cancelled',
      dayUnit: 'd',
      noData: 'No data',
      dataSource: 'Data from',
      incidentUnit: 'incidents',
      stripIncidents: '',
    }

    const css = [
      '.ds-page{height:100%;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base,Canvas);color:var(--dsw-alias-label-secondary,CanvasText);font-family:var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:13px;line-height:20px}',
      '.ds-page-inner{max-width:960px;margin:0 auto;padding:28px 32px 48px;box-sizing:border-box}',
      '.ds-head{display:flex;align-items:flex-start;gap:16px;margin-bottom:20px}',
      '.ds-title{margin:0;color:var(--dsw-alias-label-primary,CanvasText);font-size:20px;line-height:28px;font-weight:600}',
      '.ds-sub{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px;margin-top:2px}',
      '.ds-actions{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap}',
      '.ds-btn{display:inline-flex;align-items:center;gap:5px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,CanvasText);font:inherit;font-size:12px;line-height:18px;padding:4px 9px;cursor:pointer;text-decoration:none}',
      '.ds-btn:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
      '.ds-btn:disabled{opacity:.5;cursor:default}',
      '.ds-overall{display:flex;align-items:flex-start;gap:12px;padding:18px 20px;margin-bottom:24px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));box-shadow:var(--dsw-elevation-panel,0 0 0 .5px color-mix(in srgb,CanvasText 12%,transparent))}',
      '.ds-overall-dot{width:12px;height:12px;border-radius:50%;margin-top:5px;flex:none;background:var(--dsw-alias-state-success-primary,#3fb950)}',
      '.ds-overall[data-status="degraded"] .ds-overall-dot,.ds-overall[data-status="partial_outage"] .ds-overall-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.ds-overall[data-status="full_outage"] .ds-overall-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
      '.ds-overall[data-status="maintenance"] .ds-overall-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
      '.ds-overall[data-status="unknown"] .ds-overall-dot{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
      '.ds-overall-title{color:var(--dsw-alias-label-primary,CanvasText);font-size:16px;line-height:24px;font-weight:600}',
      '.ds-overall-desc{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px;margin-top:2px}',
      '.ds-section{margin-top:24px}',
      '.ds-section-title{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--dsw-alias-label-primary,CanvasText);font-size:12px;line-height:18px;font-weight:600}',
      '.ds-tabs{display:inline-flex;gap:4px;margin-left:auto}',
      '.ds-tab{border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-tertiary,CanvasText);font:inherit;font-size:11px;line-height:18px;padding:1px 7px;cursor:pointer}',
      '.ds-tab:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
      '.ds-tab[data-active="true"]{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent));color:var(--dsw-alias-label-secondary,CanvasText)}',
      '.ds-group{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));overflow:hidden;margin-top:8px}',
      '.ds-group-head{display:flex;align-items:center;gap:8px;padding:10px 14px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px;font-weight:500}',
      '.ds-group-head .ds-uptime{margin-left:auto}',
      '.ds-comp{display:grid;grid-template-columns:8px minmax(0,1fr) auto auto;align-items:center;gap:9px;padding:10px 14px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent))}',
      '.ds-comp-main{min-width:0}',
      '.ds-comp-name{color:var(--dsw-alias-label-secondary,CanvasText);font-size:13px;line-height:20px;font-weight:500;overflow-wrap:anywhere}',
      '.ds-comp-desc{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:11px;line-height:16px;margin-top:1px;overflow-wrap:anywhere}',
      '.ds-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-label-tertiary,CanvasText)}',
      '.ds-dot[data-status="operational"]{background:var(--dsw-alias-state-success-primary,#3fb950)}',
      '.ds-dot[data-status="degraded"],.ds-dot[data-status="partial_outage"]{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.ds-dot[data-status="full_outage"]{background:var(--dsw-alias-state-error-primary,#d5484a)}',
      '.ds-dot[data-status="maintenance"]{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
      '.ds-dot[data-status="unknown"]{opacity:.5}',
      '.ds-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:1px 8px;font-size:11px;line-height:18px;font-weight:500;white-space:nowrap;color:var(--dsw-alias-label-tertiary,CanvasText);background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 7%,transparent))}',
      '.ds-pill[data-status="operational"]{color:var(--dsw-alias-state-success-primary,#3fb950);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#3fb950) 12%,transparent)}',
      '.ds-pill[data-status="degraded"],.ds-pill[data-status="partial_outage"]{color:var(--dsw-alias-state-warn-primary,#e6a23c);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e6a23c) 14%,transparent)}',
      '.ds-pill[data-status="full_outage"]{color:var(--dsw-alias-state-error-primary,#d5484a);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d5484a) 12%,transparent)}',
      '.ds-pill[data-status="maintenance"]{color:var(--dsw-alias-state-business-primary,#4a7dff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4a7dff) 12%,transparent)}',
      '.ds-uptime{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.ds-incident{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));padding:14px 16px;margin-top:8px}',
      '.ds-incident-head{display:flex;align-items:flex-start;gap:10px}',
      '.ds-incident-main{min-width:0;flex:1}',
      '.ds-incident-title{color:var(--dsw-alias-label-primary,CanvasText);font-size:13px;line-height:20px;font-weight:600;overflow-wrap:anywhere}',
      '.ds-incident-meta{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:2px}',
      '.ds-incident-desc{color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px;margin-top:8px;overflow-wrap:anywhere}',
      '.ds-updates{margin-top:8px;border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));padding-top:6px}',
      '.ds-update{display:grid;grid-template-columns:56px minmax(0,1fr);gap:8px;padding-top:4px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px}',
      '.ds-update-time{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:18px;white-space:nowrap}',
      '.ds-update-text{overflow-wrap:anywhere}',
      '.ds-incident-comps{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:16px;margin-top:6px;overflow-wrap:anywhere}',
      '.ds-history-item{border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));margin-top:6px}',
      '.ds-history-item>summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;list-style:none}',
      '.ds-history-item>summary::-webkit-details-marker{display:none}',
      '.ds-history-date{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:18px;white-space:nowrap}',
      '.ds-history-title{color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ds-history-duration{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:11px;line-height:18px;white-space:nowrap}',
      '.ds-history-body{border-top:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));padding:8px 14px 12px;color:var(--dsw-alias-label-secondary,CanvasText);font-size:12px;line-height:18px}',
      '.ds-history-body .ds-update{grid-template-columns:56px minmax(0,1fr)}',
      '.ds-empty{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px;padding:8px 0}',
      '.ds-loading{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:12px;line-height:18px;padding:12px 0}',
      '.ds-error{border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#d5484a) 35%,transparent);border-radius:var(--dsw-radius-lg,12px);padding:12px 14px;color:var(--dsw-alias-state-error-primary,#d5484a);font-size:12px;line-height:18px;display:flex;align-items:center;gap:10px}',
      '.ds-error .ds-btn{margin-left:auto;color:var(--dsw-alias-state-error-primary,#d5484a)}',
      '.ds-warn{color:var(--dsw-alias-state-warn-primary,#e6a23c);font-size:11px;line-height:16px;margin:-12px 0 12px}',
      '.ds-foot{margin-top:28px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary,CanvasText));font-size:11px;line-height:16px}',
      '.ds-foot a{color:var(--dsw-alias-link,CanvasText);text-decoration:none}',
      '.ds-foot a:hover{text-decoration:underline dotted}',
      '@media (max-width:700px){.ds-page-inner{padding:18px 16px 36px}.ds-head{flex-wrap:wrap}.ds-actions{margin-left:0}.ds-comp{grid-template-columns:8px minmax(0,1fr) auto}.ds-comp .ds-uptime{grid-column:2;padding-bottom:2px}.ds-history-item>summary{grid-template-columns:auto minmax(0,1fr);}.ds-history-duration{display:none}}',
      '.dsh-status-strip{position:fixed;z-index:940;box-sizing:border-box;width:172px;display:flex;align-items:center;gap:6px;padding:6px 10px;border:.5px solid var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 18%,transparent));border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,color-mix(in srgb,Canvas 96%,transparent));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 14%,transparent));box-shadow:var(--dsw-elevation-prominent,0 10px 34px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(10px));color:var(--dsw-alias-label-secondary,CanvasText);font:400 12px/18px var(--dsw-font-family,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);text-align:left;cursor:pointer;user-select:none}',
      '.dsh-status-strip:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 5%,Canvas))}',
      '.dsh-status-strip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,CanvasText);outline-offset:2px}',
      '.dsh-status-strip-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950)}',
      '.dsh-status-strip[data-status="degraded"] .dsh-status-strip-dot,.dsh-status-strip[data-status="partial_outage"] .dsh-status-strip-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.dsh-status-strip[data-status="full_outage"] .dsh-status-strip-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
      '.dsh-status-strip[data-status="maintenance"] .dsh-status-strip-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
      '.dsh-status-strip[data-status="unknown"] .dsh-status-strip-dot{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
      '.dsh-status-strip-label{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary,CanvasText);font-weight:500}',
      '.dsh-status-strip-meta{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:10.5px;white-space:nowrap}',
      '.dsh-status-strip-arrow{color:var(--dsw-alias-label-tertiary,CanvasText);font-size:14px;line-height:1;opacity:.7}',
      '.dsh-status-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none}',
      '.dsh-status-icon svg{display:block}',
      '.dsh-status-icon-dot{position:absolute;right:0;top:0;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950);box-shadow:0 0 0 1px var(--dsw-alias-bg-base,Canvas)}',
      '.dsh-status-icon[data-status="degraded"] .dsh-status-icon-dot,.dsh-status-icon[data-status="partial_outage"] .dsh-status-icon-dot{background:var(--dsw-alias-state-warn-primary,#e6a23c)}',
      '.dsh-status-icon[data-status="full_outage"] .dsh-status-icon-dot{background:var(--dsw-alias-state-error-primary,#d5484a)}',
      '.dsh-status-icon[data-status="maintenance"] .dsh-status-icon-dot{background:var(--dsw-alias-state-business-primary,#4a7dff)}',
      '.dsh-status-icon[data-status="unknown"] .dsh-status-icon-dot{background:var(--dsw-alias-label-tertiary,CanvasText);opacity:.5}',
    ].join('')

    // One stylesheet per plugin bundle, reconciled for HMR-style reloads.
    if (typeof document !== 'undefined' && document.head) {
      let tag = document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')
      if (!tag) {
        tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-deepseek-status'
        tag.dataset.pluginCss = CSS_ID
        document.head.appendChild(tag)
      }
      if (tag.textContent !== css) tag.textContent = css
    }

    function tr(t, key, fallback) {
      const value = t(key)
      return value && value !== key ? value : (fallback === undefined ? key : fallback)
    }

    function overallLabel(t, status) {
      return tr(t, 'ov_' + String(status || 'unknown'), String(status || 'unknown'))
    }
    function overallDesc(t, status) {
      return tr(t, 'ovd_' + String(status || 'unknown'), '')
    }
    function pillLabel(t, status) {
      return tr(t, 'op_' + String(status || 'unknown'), String(status || 'unknown'))
    }
    function stripLabel(t, status) {
      return tr(t, 'st_' + String(status || 'unknown'), String(status || 'unknown'))
    }
    function incidentLabel(t, status) {
      return tr(t, 'inc_' + String(status || '').toLowerCase(), String(status || '—'))
    }

    function fmtUptime(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(2) + '%' : '—'
    }
    function fmtDuration(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '—'
      const mins = Math.max(1, Math.round(ms / 60000))
      if (mins < 60) return mins + 'm'
      const hours = Math.floor(mins / 60)
      const rest = mins % 60
      if (hours < 24) return hours + 'h' + (rest ? ' ' + rest + 'm' : '')
      const days = Math.floor(hours / 24)
      const hh = hours % 24
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
    function notificationPermission() {
      try {
        return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
      } catch {
        return 'unsupported'
      }
    }

    function createStore(ctx, t) {
      const state = {
        summary: null,
        summaryLoading: false,
        summaryError: '',
        history: null,
        historyLoading: false,
        historyError: '',
        historyDays: 30,
      }
      const listeners = new Set()
      let prevIndicator = null
      let summaryInFlight = false
      let historyInFlight = false
      let timer = null

      function emit() {
        for (const listener of Array.from(listeners)) {
          try { listener() } catch {}
        }
      }
      function subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
      function getSnapshot() {
        return state
      }

      function notify(isUp, summary) {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        const indicator = summary && summary.indicator
        const incident = summary && Array.isArray(summary.incidents) ? summary.incidents[0] : null
        const title = isUp ? tr(t, 'notifUpTitle') : tr(t, 'notifDownTitle')
        let body
        if (isUp) {
          body = tr(t, 'notifUpBody')
        } else {
          body = tr(t, 'notifDownBody') + overallLabel(t, indicator)
          if (incident && incident.title) body += ' · ' + incident.title
        }
        try {
          const notification = new Notification(title, { body, tag: 'dsh-deepseek-status' })
          notification.onclick = () => {
            try { window.focus() } catch {}
            try { ctx.layout.selectPanel(PANEL_ID) } catch {}
            try { notification.close() } catch {}
          }
        } catch {}
      }

      function observeIndicator(summary) {
        const indicator = summary && summary.ok ? String(summary.indicator || 'unknown') : 'unknown'
        if (indicator === 'unknown') return
        if (prevIndicator === null) {
          prevIndicator = indicator
          return
        }
        if (indicator === prevIndicator) return
        const wasOperational = prevIndicator === 'operational'
        const isOperational = indicator === 'operational'
        prevIndicator = indicator
        // Only the operational <-> non-operational edge notifies; escalation
        // within non-operational states is left to the page/badge.
        if (wasOperational !== isOperational) notify(isOperational, summary)
      }

      async function loadSummary(force) {
        if (summaryInFlight) return
        summaryInFlight = true
        state.summaryLoading = true
        emit()
        try {
          const res = await fetch('/api/deepseek-status/summary' + (force ? '?force=1' : ''), { cache: 'no-store' })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const data = await res.json()
          if (!data || !data.ok) throw new Error((data && data.error) || 'invalid payload')
          state.summary = data
          state.summaryError = ''
          observeIndicator(data)
        } catch (err) {
          state.summaryError = String((err && err.message) || err)
        } finally {
          state.summaryLoading = false
          summaryInFlight = false
          emit()
        }
      }

      async function loadHistory(days, force) {
        if (historyInFlight) return
        historyInFlight = true
        state.historyLoading = true
        emit()
        const requested = days
        try {
          const res = await fetch('/api/deepseek-status/history?days=' + encodeURIComponent(days) + (force ? '&force=1' : ''), { cache: 'no-store' })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const data = await res.json()
          if (!data || !data.ok) throw new Error((data && data.error) || 'invalid payload')
          if (state.historyDays !== requested) return
          state.history = data
          state.historyError = ''
        } catch (err) {
          if (state.historyDays === requested) state.historyError = String((err && err.message) || err)
        } finally {
          historyInFlight = false
          state.historyLoading = false
          emit()
        }
      }

      function ensureHistory(days) {
        if (state.historyDays === days && (state.history || state.historyLoading)) return
        if (state.historyDays !== days) {
          state.historyDays = days
          state.history = null
        }
        void loadHistory(days, false)
      }
      function setHistoryDays(days) {
        if (state.historyDays === days) return
        state.historyDays = days
        state.history = null
        state.historyError = ''
        emit()
        void loadHistory(days, false)
      }
      function refresh() {
        void loadSummary(true)
        void loadHistory(state.historyDays, true)
      }
      function start() {
        void loadSummary(false)
        if (timer !== null) clearInterval(timer)
        timer = setInterval(() => { void loadSummary(false) }, 30_000)
      }
      function dispose() {
        if (timer !== null) clearInterval(timer)
        timer = null
        listeners.clear()
      }

      function useStore() {
        const [snapshot, setSnapshot] = react.useState(state)
        react.useEffect(() => subscribe(() => setSnapshot({ ...state })), [])
        return snapshot
      }

      return { state, subscribe, getSnapshot, loadSummary, loadHistory, ensureHistory, setHistoryDays, refresh, start, dispose, useStore }
    }

    function createStatusStrip(ctx, store, t) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'dsh-status-strip'
      el.setAttribute('data-status', 'unknown')
      el.innerHTML = '<span class="dsh-status-strip-dot"></span><span class="dsh-status-strip-label"></span><span class="dsh-status-strip-meta"></span><span class="dsh-status-strip-arrow" aria-hidden="true">›</span>'
      document.body.appendChild(el)
      const labelEl = el.querySelector('.dsh-status-strip-label')
      const metaEl = el.querySelector('.dsh-status-strip-meta')
      let visible = true

      function pageActive() {
        try { return ctx.layout.panelInfo.getSnapshot().activePanelId === PANEL_ID } catch { return false }
      }
      function update() {
        const summary = store.getSnapshot().summary
        const indicator = summary && summary.ok ? String(summary.indicator || 'unknown') : 'unknown'
        el.setAttribute('data-status', indicator)
        labelEl.textContent = stripLabel(t, indicator)
        const count = summary && Number(summary.activeCount)
        metaEl.textContent = count > 0 ? '· ' + count : ''
        const aria = tr(t, 'panel') + ': ' + stripLabel(t, indicator) + (count > 0 ? ' · ' + count + ' ' + tr(t, 'incidentUnit') : '')
        el.setAttribute('aria-label', aria)
        el.title = aria
      }
      function chromeRects() {
        const rects = []
        const composer = document.querySelector('[data-composer-card]')
        if (composer) {
          const rect = composer.getBoundingClientRect()
          if (rect.width > 0) rects.push(rect)
        }
        const dock = document.querySelector('[data-slot="conversation.composer.dock"]')
        if (dock) {
          const dockRect = dock.getBoundingClientRect()
          if (dockRect.width > 0) rects.push(dockRect)
          for (const child of Array.from(dock.children)) {
            const rect = child.getBoundingClientRect()
            if (rect.width > 0) rects.push(rect)
          }
        }
        return rects
      }
      function place() {
        if (!visible || !el.isConnected) return
        const width = 172
        const height = el.offsetHeight || 32
        let right = 12
        let bottom = 12
        const balance = document.querySelector('[data-dsh-balance-overview]')
        const balanceRect = balance ? balance.getBoundingClientRect() : null
        if (balanceRect && balanceRect.width > 0 && balanceRect.height > 0) {
          right = Math.max(12, Math.round(window.innerWidth - balanceRect.right))
          bottom = Math.max(12, Math.round(window.innerHeight - balanceRect.top + 8))
        } else {
          const left = window.innerWidth - right - width
          for (const rect of chromeRects()) {
            const overlapsX = rect.right + 8 > left && rect.left - 8 < window.innerWidth - right
            const top = window.innerHeight - bottom - height
            const overlapsY = rect.bottom + 8 > top && rect.top - 8 < window.innerHeight - bottom
            if (overlapsX && overlapsY) bottom = Math.max(bottom, window.innerHeight - rect.top + 8)
          }
        }
        el.style.right = right + 'px'
        el.style.bottom = bottom + 'px'
      }
      function syncVisibility() {
        visible = !pageActive()
        el.style.display = visible ? '' : 'none'
        try {
          document.body.classList.toggle('dsh-deepseek-status-page', !visible)
        } catch {}
        if (visible) place()
      }

      const removeStore = store.subscribe(() => { update(); place() })
      const removePanel = (() => {
        try { return ctx.layout.panelInfo.subscribe(syncVisibility) } catch { return () => {} }
      })()
      const onClick = () => {
        try { ctx.layout.selectPanel(PANEL_ID) } catch {}
      }
      el.addEventListener('click', onClick)
      const resize = () => place()
      window.addEventListener('resize', resize)
      const timer = setInterval(place, 1000)
      update()
      syncVisibility()
      requestAnimationFrame(place)

      return {
        dispose() {
          clearInterval(timer)
          window.removeEventListener('resize', resize)
          el.removeEventListener('click', onClick)
          try { removeStore() } catch {}
          try { removePanel() } catch {}
          try { document.body.classList.remove('dsh-deepseek-status-page') } catch {}
          el.remove()
        },
      }
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'deepseek-status: dictionaries')
      const t = ctx.locale.bind(NS)
      const store = createStore(ctx, t)

      function StatusPage() {
        const snapshot = store.useStore()
        const [permission, setPermission] = react.useState(notificationPermission())
        const summary = snapshot.summary
        const indicator = summary && summary.ok ? String(summary.indicator || 'unknown') : 'unknown'
        const updated = summary && summary.fetchedAt ? fmtTime(summary.fetchedAt) : '—'

        react.useEffect(() => {
          store.ensureHistory(snapshot.historyDays)
        }, [snapshot.historyDays])

        function requestNotifications() {
          if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') return
          Notification.requestPermission().then((value) => setPermission(value)).catch(() => {})
        }

        const header = h('div', { className: 'ds-head' },
          h('div', null,
            h('h1', { className: 'ds-title' }, tr(t, 'title')),
            h('div', { className: 'ds-sub' }, tr(t, 'updated') + ' ' + updated),
          ),
          h('div', { className: 'ds-actions' },
            h('button', {
              type: 'button', className: 'ds-btn', disabled: snapshot.summaryLoading,
              onClick: () => store.refresh(),
            }, '⟳ ' + tr(t, 'refresh')),
            h('a', {
              className: 'ds-btn', href: (summary && summary.url) || STATUS_URL,
              target: '_blank', rel: 'noreferrer noopener',
            }, tr(t, 'official') + ' ↗'),
            permission === 'default'
              ? h('button', { type: 'button', className: 'ds-btn', onClick: requestNotifications }, tr(t, 'enableNotifications'))
              : null,
          ),
        )

        let body
        if (!summary && snapshot.summaryLoading) {
          body = h('div', { className: 'ds-loading' }, tr(t, 'loading'))
        } else if (!summary && snapshot.summaryError) {
          body = h('div', { className: 'ds-error' },
            tr(t, 'loadFailed') + ': ' + snapshot.summaryError,
            h('button', { type: 'button', className: 'ds-btn', onClick: () => store.refresh() }, tr(t, 'retry')),
          )
        } else if (!summary) {
          body = h('div', { className: 'ds-loading' }, tr(t, 'loading'))
        } else {
          const incidents = Array.isArray(summary.incidents) ? summary.incidents : []
          const groups = Array.isArray(summary.groups) ? summary.groups : []
          const overall = h('section', { className: 'ds-overall', 'data-status': indicator },
            h('span', { className: 'ds-overall-dot' }),
            h('div', null,
              h('div', { className: 'ds-overall-title' }, overallLabel(t, indicator)),
              h('div', { className: 'ds-overall-desc' },
                incidents.length
                  ? incidents[0].title + (incidents.length > 1 ? ' · +' + (incidents.length - 1) : '')
                  : overallDesc(t, indicator)),
            ),
          )

          const componentSections = groups.map((group) => h('div', { className: 'ds-group', key: group.id },
            h('div', { className: 'ds-group-head' },
              h('span', null, group.name || tr(t, 'apiGroup')),
              group.uptime !== null && group.uptime !== undefined
                ? h('span', { className: 'ds-uptime' }, fmtUptime(group.uptime) + ' · ' + (summary.uptimeWindowDays || 90) + tr(t, 'dayUnit'))
                : null,
            ),
            (group.components || []).map((component) => h('div', { className: 'ds-comp', key: component.id || component.name },
              h('span', { className: 'ds-dot', 'data-status': component.status || 'unknown' }),
              h('div', { className: 'ds-comp-main' },
                h('div', { className: 'ds-comp-name' }, component.name),
                component.description ? h('div', { className: 'ds-comp-desc' }, component.description) : null,
              ),
              h('span', { className: 'ds-pill', 'data-status': component.status || 'unknown' }, pillLabel(t, component.status)),
              h('span', { className: 'ds-uptime' }, fmtUptime(component.uptime)),
            )),
          ))

          const activeSection = h('section', { className: 'ds-section' },
            h('div', { className: 'ds-section-title' }, tr(t, 'activeIncidents')),
            incidents.length === 0
              ? h('div', { className: 'ds-empty' }, tr(t, 'noActiveIncidents'))
              : incidents.map((incident) => h('div', { className: 'ds-incident', key: incident.id, 'data-status': incident.indicator },
                h('div', { className: 'ds-incident-head' },
                  h('div', { className: 'ds-incident-main' },
                    h('div', { className: 'ds-incident-title' }, incident.title),
                    h('div', { className: 'ds-incident-meta' },
                      tr(t, 'started') + ' ' + fmtDateTime(incident.startedAt) +
                      (incident.status ? ' · ' + incidentLabel(t, incident.status) : '') +
                      (incident.startedAt ? ' · ' + tr(t, 'duration') + ' ' + fmtDuration(Date.now() - incident.startedAt) : ''),
                    ),
                  ),
                  h('span', { className: 'ds-pill', 'data-status': incident.indicator }, pillLabel(t, incident.indicator)),
                ),
                incident.description ? h('div', { className: 'ds-incident-desc' }, incident.description) : null,
                incident.updates && incident.updates.length
                  ? h('div', { className: 'ds-updates' }, incident.updates.map((update, index) => h('div', { className: 'ds-update', key: index },
                    h('span', { className: 'ds-update-time' }, fmtTime(update.at)),
                    h('span', { className: 'ds-update-text' }, update.description),
                  )))
                  : null,
                incident.components && incident.components.length
                  ? h('div', { className: 'ds-incident-comps' }, tr(t, 'affected') + ': ' + incident.components.join(' · '))
                  : null,
              )),
          )

          const history = snapshot.history
          const historyItems = history && Array.isArray(history.items) ? history.items : []
          const historySection = h('section', { className: 'ds-section' },
            h('div', { className: 'ds-section-title' },
              h('span', null, tr(t, 'recent')),
              h('span', { className: 'ds-tabs' }, [7, 30, 90].map((days) => h('button', {
                type: 'button', key: days, className: 'ds-tab',
                'data-active': snapshot.historyDays === days ? 'true' : 'false',
                onClick: () => store.setHistoryDays(days),
              }, days + tr(t, 'dayUnit')))),
            ),
            snapshot.historyLoading && !history
              ? h('div', { className: 'ds-loading' }, tr(t, 'loading'))
              : snapshot.historyError && !history
                ? h('div', { className: 'ds-error' },
                  tr(t, 'loadFailed') + ': ' + snapshot.historyError,
                  h('button', { type: 'button', className: 'ds-btn', onClick: () => store.setHistoryDays(snapshot.historyDays) }, tr(t, 'retry')),
                )
                : historyItems.length === 0
                  ? h('div', { className: 'ds-empty' }, tr(t, 'noRecent'))
                  : historyItems.map((item) => h('details', { className: 'ds-history-item', key: item.id },
                    h('summary', null,
                      h('span', { className: 'ds-history-date' }, fmtDateTime(item.startAt)),
                      h('span', { className: 'ds-history-title' }, item.title),
                      h('span', { className: 'ds-pill', 'data-status': item.impact }, pillLabel(t, item.impact)),
                      h('span', { className: 'ds-history-duration' }, fmtDuration(item.durationMs)),
                    ),
                    h('div', { className: 'ds-history-body' },
                      item.components && item.components.length
                        ? h('div', { className: 'ds-incident-comps' }, tr(t, 'affected') + ': ' + item.components.join(' · '))
                        : null,
                      item.updates && item.updates.length
                        ? item.updates.map((update, index) => h('div', { className: 'ds-update', key: index },
                          h('span', { className: 'ds-update-time' }, fmtTime(update.at)),
                          h('span', { className: 'ds-update-text' }, update.description),
                        ))
                        : h('div', { className: 'ds-update' },
                          h('span', { className: 'ds-update-time' }, '—'),
                          h('span', { className: 'ds-update-text' }, item.description || tr(t, 'noData')),
                        ),
                    ),
                  )),
          )

          body = h('div', null,
            snapshot.summaryError ? h('div', { className: 'ds-warn' }, tr(t, 'loadFailed') + ': ' + snapshot.summaryError) : null,
            overall,
            h('section', { className: 'ds-section' },
              h('div', { className: 'ds-section-title' }, tr(t, 'components')),
              componentSections,
            ),
            activeSection,
            historySection,
            h('div', { className: 'ds-foot' },
              tr(t, 'dataSource') + ' ',
              h('a', { href: summary.url || STATUS_URL, target: '_blank', rel: 'noreferrer noopener' }, 'status.deepseek.com'),
            ),
          )
        }

        return h('div', { className: 'ds-page' }, h('div', { className: 'ds-page-inner' }, header, body))
      }

      function StatusIcon(props) {
        const snapshot = store.useStore()
        const indicator = snapshot.summary && snapshot.summary.ok ? String(snapshot.summary.indicator || 'unknown') : 'unknown'
        const size = props && typeof props.size === 'number' ? props.size : 20
        return h('span', {
          className: 'dsh-status-icon', 'data-status': indicator,
          style: { width: size + 'px', height: size + 'px' },
        },
        h('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
          'aria-hidden': true,
        }, h('path', { d: 'M2.5 12h4l2.2-5.2L13 17l2.3-5H21.5' })),
        h('span', { className: 'dsh-status-icon-dot' }),
        )
      }

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, StatusPage))

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel'),
      }, StatusIcon))

      const strip = createStatusStrip(ctx, store, t)
      ctx.effect(() => () => {
        strip.dispose()
        store.dispose()
      }, 'deepseek-status: strip and store')
      store.start()
    }

    const exports = {}
    exports.apply = apply
    exports.inject = ['slots', 'locale', 'layout']
    return exports
  },
})
