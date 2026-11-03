/**
 * Public DeepSeek status-page data. The status page is a Flashcat deployment;
 * these are the same JSON endpoints its own web client calls. No credentials
 * are involved, so this module never touches DSH credentials.
 */
const STATUS_ORIGIN = 'https://status.deepseek.com'
const STATUS_PAGE_ID = '6410630422455'
const STATUS_PAGE_URL = `${STATUS_ORIGIN}/`
const ACTIVE_URL = `${STATUS_ORIGIN}/api/status-page/${STATUS_PAGE_ID}/summary/active`
const STRUCTURE_URL = `${STATUS_ORIGIN}/api/status-page/${STATUS_PAGE_ID}/summary/structure`
const CHANGES_URL = `${STATUS_ORIGIN}/api/status-page/${STATUS_PAGE_ID}/change/list`

const UPTIME_WINDOW_DAYS = 90
const HISTORY_WINDOW_DAYS = 30
const MAX_HISTORY = 40

const STATUS_RANK = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  partial_outage: 3,
  full_outage: 4,
}

const ACTIVE_EXCLUDED = new Set(['resolved', 'completed', 'cancelled', 'canceled'])

async function requestJson(url, timeoutMs = 8000) {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function fetchActiveStatus() {
  return requestJson(ACTIVE_URL)
}

export function fetchStatusStructure(days = UPTIME_WINDOW_DAYS) {
  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 86400
  return requestJson(`${STRUCTURE_URL}?start_at_from_seconds=${from}&start_at_to_seconds=${to}`)
}

export function fetchStatusHistory(days = HISTORY_WINDOW_DAYS) {
  const to = Math.floor(Date.now() / 1000)
  const from = to - days * 86400
  return requestJson(`${CHANGES_URL}?start_at_seconds=${from}&end_at_seconds=${to}`)
}

function isActiveChange(change) {
  const status = String((change && change.status) || '').toLowerCase()
  return !ACTIVE_EXCLUDED.has(status)
}

function latestUpdate(change) {
  const updates = change && Array.isArray(change.updates) ? change.updates : []
  let latest = null
  for (const update of updates) {
    const at = Number(update && update.at_seconds) || 0
    if (latest === null || at >= latest.at) latest = { at, update }
  }
  return latest
}

function worseStatus(current, candidate) {
  if (STATUS_RANK[candidate] === undefined) return current
  return STATUS_RANK[candidate] > STATUS_RANK[current] ? candidate : current
}

function changeComponentStatuses(change) {
  const latest = latestUpdate(change)
  const rows = []
  if (latest && latest.update && Array.isArray(latest.update.component_changes)) {
    for (const component of latest.update.component_changes) {
      if (component && typeof component.status === 'string') rows.push(component)
    }
  }
  if (change && Array.isArray(change.affected_components)) {
    for (const component of change.affected_components) {
      if (component && typeof component.status === 'string') rows.push(component)
    }
  }
  return rows
}

function changeComponents(change) {
  const latest = latestUpdate(change)
  const names = []
  const seen = new Set()
  const sources = []
  if (latest && latest.update && Array.isArray(latest.update.component_changes)) sources.push(latest.update.component_changes)
  if (change && Array.isArray(change.affected_components)) sources.push(change.affected_components)
  for (const source of sources) {
    for (const component of source) {
      const name = component && (component.component_name || component.name)
      if (typeof name === 'string' && name && !seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    }
  }
  return names
}

function changeIndicator(change) {
  let indicator = 'operational'
  for (const component of changeComponentStatuses(change)) {
    indicator = worseStatus(indicator, component.status)
  }
  if (change.type === 'maintenance') {
    if (indicator === 'operational') indicator = 'maintenance'
  } else if (indicator === 'operational') {
    // An active incident without a component-level value still outranks
    // "everything operational".
    indicator = 'degraded'
  }
  return indicator
}

function normalizeIncident(change) {
  const latest = latestUpdate(change)
  const update = latest ? latest.update : null
  const updates = (Array.isArray(change.updates) ? change.updates : [])
    .map((row) => ({
      at: Number(row.at_seconds) ? Number(row.at_seconds) * 1000 : null,
      status: String(row.status || ''),
      description: String(row.description || '').replace(/\s+/g, ' ').trim(),
    }))
    .sort((a, b) => (a.at || 0) - (b.at || 0))
  return {
    id: String(change.change_id ?? change.id ?? ''),
    type: change.type === 'maintenance' ? 'maintenance' : 'incident',
    title: String(change.title || ''),
    status: String(change.status || ''),
    indicator: changeIndicator(change),
    description: String((update && update.description) || change.description || '')
      .replace(/\s+/g, ' ')
      .trim(),
    components: changeComponents(change),
    updates,
    startedAt: Number(change.start_at_seconds) ? Number(change.start_at_seconds) * 1000 : null,
    updatedAt: latest && latest.at ? latest.at * 1000 : null,
  }
}

/**
 * Combine summary/active and summary/structure into the shape the status page
 * renders: overall indicator, grouped components with uptime, active incidents.
 * @param activePayload - JSON from `/summary/active`, or null on failure.
 * @param structurePayload - JSON from `/summary/structure`, or null.
 * @param fetchedAt - milliseconds when the read completed.
 */
export function normalizeSummary(activePayload, structurePayload, fetchedAt = Date.now()) {
  const activeData = activePayload && activePayload.data
  const page = activeData && activeData.page
  if (!activeData || !page) {
    return {
      ok: false,
      indicator: 'unknown',
      error: 'invalid status payload',
      fetchedAt,
      url: STATUS_PAGE_URL,
    }
  }
  const changes = (Array.isArray(activeData.active_changes) ? activeData.active_changes : []).filter(isActiveChange)
  const incidents = changes.map(normalizeIncident)
  let indicator = 'operational'
  for (const incident of incidents) indicator = worseStatus(indicator, incident.indicator)

  const structureData = structurePayload && structurePayload.data
  const uptimeById = new Map()
  const sectionUptimeById = new Map()
  if (structureData) {
    for (const row of structureData.component_uptimes || []) {
      const id = row && row.component_id
      if (id) uptimeById.set(String(id), Number(row.uptime))
    }
    for (const row of structureData.section_uptimes || []) {
      const id = row && row.section_id
      if (id) sectionUptimeById.set(String(id), Number(row.uptime))
    }
  }

  const statusById = new Map()
  const statusByName = new Map()
  for (const change of changes) {
    for (const component of changeComponentStatuses(change)) {
      const id = component.component_id
      const name = component.component_name || component.name
      if (id) statusById.set(String(id), worseStatus(statusById.get(String(id)) || 'operational', component.status))
      if (name) statusByName.set(String(name), worseStatus(statusByName.get(String(name)) || 'operational', component.status))
    }
  }

  const allComponents = (Array.isArray(page.components) ? page.components : []).map((component) => {
    const id = String(component.component_id || '')
    const name = String(component.name || '')
    const status = statusById.get(id) || statusByName.get(name) || 'operational'
    return {
      id,
      name,
      description: String(component.description || ''),
      sectionId: component.section_id ? String(component.section_id) : '',
      status,
      uptime: uptimeById.has(id) ? uptimeById.get(id) : null,
    }
  })
  const sections = Array.isArray(page.sections) ? page.sections : []
  const groups = []
  const ungrouped = allComponents.filter((component) => !component.sectionId)
  if (ungrouped.length) {
    groups.push({ id: 'ungrouped', name: '', uptime: null, components: ungrouped })
  }
  for (const section of sections) {
    if (!section || section.hide_all === true) continue
    const id = String(section.section_id || '')
    const components = allComponents.filter((component) => component.sectionId === id)
    if (!components.length) continue
    groups.push({
      id,
      name: String(section.name || ''),
      uptime: sectionUptimeById.has(id) ? sectionUptimeById.get(id) : null,
      components,
    })
  }
  return {
    ok: true,
    indicator,
    activeCount: incidents.length,
    incidents,
    groups,
    pageName: String(page.name || 'DeepSeek'),
    url: STATUS_PAGE_URL,
    fetchedAt,
    uptimeWindowDays: UPTIME_WINDOW_DAYS,
    structureOk: Boolean(structureData),
  }
}

function historyImpact(item) {
  let indicator = 'operational'
  for (const update of (item && Array.isArray(item.updates) ? item.updates : [])) {
    for (const component of (update && Array.isArray(update.component_changes) ? update.component_changes : [])) {
      if (component && typeof component.status === 'string') indicator = worseStatus(indicator, component.status)
    }
  }
  if (indicator === 'operational' && item && item.type === 'maintenance') indicator = 'maintenance'
  return indicator
}

function normalizeHistoryItem(item) {
  const start = Number(item.start_at_seconds) || 0
  const close = Number(item.close_at_seconds) || 0
  const updates = (Array.isArray(item.updates) ? item.updates : []).map((update) => ({
    at: Number(update.at_seconds) ? Number(update.at_seconds) * 1000 : null,
    status: String(update.status || ''),
    description: String(update.description || '').replace(/\s+/g, ' ').trim(),
  }))
  updates.sort((a, b) => (a.at || 0) - (b.at || 0))
  const latest = updates.length ? updates[updates.length - 1] : null
  return {
    id: String(item.change_id ?? item.id ?? ''),
    type: item.type === 'maintenance' ? 'maintenance' : 'incident',
    title: String(item.title || ''),
    status: String(item.status || ''),
    impact: historyImpact(item),
    startAt: start ? start * 1000 : null,
    closeAt: close ? close * 1000 : null,
    durationMs: start && close ? Math.max(0, close - start) * 1000 : null,
    components: changeComponents(item),
    description: String(item.description || '').replace(/\s+/g, ' ').trim(),
    latestUpdate: latest,
    updates,
  }
}

/**
 * Normalize `/change/list` into recent incidents and maintenance.
 * @param payload - JSON from `/change/list`.
 * @param fetchedAt - milliseconds when the read completed.
 * @param days - requested window, echoed to the client.
 */
export function normalizeHistory(payload, fetchedAt = Date.now(), days = HISTORY_WINDOW_DAYS) {
  const items = payload && payload.data && Array.isArray(payload.data.items) ? payload.data.items : null
  if (!items) {
    return { ok: false, error: 'invalid history payload', fetchedAt, days, items: [] }
  }
  const normalized = items.map(normalizeHistoryItem)
  normalized.sort((a, b) => (b.startAt || 0) - (a.startAt || 0))
  return {
    ok: true,
    fetchedAt,
    days,
    items: normalized.slice(0, MAX_HISTORY),
  }
}

export { STATUS_PAGE_URL, UPTIME_WINDOW_DAYS, HISTORY_WINDOW_DAYS }
