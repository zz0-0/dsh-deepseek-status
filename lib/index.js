import {
  fetchActiveStatus,
  fetchStatusStructure,
  fetchStatusHistory,
  normalizeSummary,
  normalizeHistory,
  STATUS_PAGE_URL,
  HISTORY_WINDOW_DAYS,
} from './status.js'

const SUMMARY_TTL_MS = 30_000
const STRUCTURE_TTL_MS = 5 * 60_000
const HISTORY_TTL_MS = 5 * 60_000
const ERROR_TTL_MS = 30_000

const state = {
  active: null,
  activeAt: 0,
  structure: null,
  structureAt: 0,
  history: new Map(),
}

function errorMessage(err) {
  return err && err.message ? err.message : String(err)
}

async function getActive(force) {
  const now = Date.now()
  if (!force && state.active && now - state.activeAt < (state.active.ok ? SUMMARY_TTL_MS : ERROR_TTL_MS)) {
    return state.active
  }
  try {
    state.active = { ok: true, payload: await fetchActiveStatus() }
  } catch (err) {
    state.active = { ok: false, error: errorMessage(err) }
  }
  state.activeAt = now
  return state.active
}

async function getStructure(force) {
  const now = Date.now()
  if (!force && state.structure && now - state.structureAt < (state.structure.ok ? STRUCTURE_TTL_MS : ERROR_TTL_MS)) {
    return state.structure
  }
  try {
    state.structure = { ok: true, payload: await fetchStatusStructure() }
  } catch (err) {
    state.structure = { ok: false, error: errorMessage(err) }
  }
  state.structureAt = now
  return state.structure
}

async function getSummary(force) {
  const now = Date.now()
  const [active, structure] = await Promise.all([getActive(force), getStructure(force)])
  if (!active.ok) {
    return {
      ok: false,
      indicator: 'unknown',
      error: active.error,
      fetchedAt: now,
      url: STATUS_PAGE_URL,
    }
  }
  return normalizeSummary(active.payload, structure.ok ? structure.payload : null, now)
}

async function getHistory(days, force) {
  const now = Date.now()
  const cached = state.history.get(days)
  if (!force && cached && now - cached.at < (cached.result.ok ? HISTORY_TTL_MS : ERROR_TTL_MS)) {
    return cached.result
  }
  let result
  try {
    result = normalizeHistory(await fetchStatusHistory(days), now, days)
  } catch (err) {
    result = { ok: false, error: errorMessage(err), fetchedAt: now, days, items: [] }
  }
  state.history.set(days, { result, at: now })
  return result
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

function denied(ctx, req, res) {
  let connection
  try {
    connection = ctx.get('connection')
  } catch {}
  if (!connection || typeof connection.requestRejection !== 'function') return false
  let code
  try {
    code = connection.requestRejection(req)
  } catch {
    code = 403
  }
  if (code === undefined || code === null || code === false) return false
  res.writeHead(typeof code === 'number' ? code : 403, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('forbidden\n')
  return true
}

function requestFlag(req) {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    return { force: url.searchParams.get('force') === '1', days: Number(url.searchParams.get('days')) || HISTORY_WINDOW_DAYS }
  } catch {
    return { force: false, days: HISTORY_WINDOW_DAYS }
  }
}

export const name = 'deepseek-status'
export const inject = ['webServer']

export async function apply(ctx) {
  const disposers = []
  const registerRoute = (route) => {
    const inner = route.handler
    const disposer = ctx.webServer.register({
      ...route,
      handler: async (req, res) => {
        if (denied(ctx, req, res)) return
        try {
          await inner(req, res)
        } catch (err) {
          sendJson(res, 500, { ok: false, error: errorMessage(err) })
        }
      },
    })
    if (typeof disposer === 'function') disposers.push(disposer)
    return disposer
  }

  registerRoute({
    kind: 'exact',
    path: '/api/deepseek-status/summary',
    handler: async (req, res) => {
      const { force } = requestFlag(req)
      sendJson(res, 200, await getSummary(force))
    },
  })

  registerRoute({
    kind: 'exact',
    path: '/api/deepseek-status/history',
    handler: async (req, res) => {
      const { force, days: rawDays } = requestFlag(req)
      const days = Math.min(90, Math.max(1, Math.trunc(rawDays)))
      sendJson(res, 200, await getHistory(days, force))
    },
  })

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {}
      }
    })
  }

  // Warm both so the first page open is instant.
  void getSummary(true)
  void getHistory(HISTORY_WINDOW_DAYS, true)
  console.log('[dsh-deepseek-status] ready')
}
