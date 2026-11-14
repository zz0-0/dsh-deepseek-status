import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSummary, normalizeHistory } from '../lib/status.js'

const ACTIVE = {
  data: {
    page: {
      name: 'DeepSeek',
      components: [{ component_id: 'c1', name: 'API', section_id: 's1' }],
      sections: [{ section_id: 's1', name: 'Core' }],
    },
    active_changes: [
      {
        change_id: 'x',
        type: 'incident',
        status: 'investigating',
        title: 'API down',
        start_at_seconds: 100,
        updates: [
          {
            at_seconds: 110,
            status: 'investigating',
            description: 'degraded',
            component_changes: [{ component_id: 'c1', component_name: 'API', status: 'partial_outage' }],
          },
        ],
      },
    ],
  },
}

const STRUCTURE = {
  data: {
    component_uptimes: [{ component_id: 'c1', uptime: 0.99 }],
    section_uptimes: [{ section_id: 's1', uptime: 0.98 }],
  },
}

test('normalizes an active summary with a component incident', () => {
  const out = normalizeSummary(ACTIVE, STRUCTURE, 123)
  assert.equal(out.ok, true)
  assert.equal(out.indicator, 'partial_outage')
  assert.equal(out.activeCount, 1)
  assert.equal(out.fetchedAt, 123)
  assert.equal(out.groups.length, 1)
  assert.equal(out.groups[0].name, 'Core')
  assert.equal(out.groups[0].components[0].status, 'partial_outage')
  assert.equal(out.groups[0].components[0].uptime, 0.99)
})

test('an invalid active payload is reported, not thrown', () => {
  const out = normalizeSummary(null, null)
  assert.equal(out.ok, false)
  assert.equal(out.indicator, 'unknown')
  assert.equal(out.error, 'invalid status payload')
})

test('a maintenance change without component status stays maintenance', () => {
  const payload = {
    data: {
      page: { components: [], sections: [] },
      active_changes: [{ change_id: 'm', type: 'maintenance', status: 'in_progress', updates: [] }],
    },
  }
  const out = normalizeSummary(payload, null, 1)
  assert.equal(out.ok, true)
  assert.equal(out.indicator, 'maintenance')
})

test('normalizes history, duration, and impact', () => {
  const payload = {
    data: {
      items: [
        {
          change_id: 'h1',
          type: 'incident',
          start_at_seconds: 100,
          close_at_seconds: 200,
          updates: [
            { at_seconds: 150, description: 'degraded', component_changes: [{ status: 'degraded' }] },
          ],
        },
      ],
    },
  }
  const out = normalizeHistory(payload, 456)
  assert.equal(out.ok, true)
  assert.equal(out.fetchedAt, 456)
  assert.equal(out.items[0].durationMs, 100000)
  assert.equal(out.items[0].impact, 'degraded')
})

test('an invalid history payload is reported, not thrown', () => {
  const out = normalizeHistory({})
  assert.equal(out.ok, false)
  assert.equal(out.items.length, 0)
})

test('skips a null history item instead of throwing', () => {
  const payload = {
    data: {
      items: [
        null,
        {
          change_id: 'h2',
          type: 'incident',
          start_at_seconds: 10,
          close_at_seconds: 20,
          updates: [],
        },
      ],
    },
  }
  const out = normalizeHistory(payload, 1)
  assert.equal(out.ok, true)
  assert.equal(out.items.length, 1)
  assert.equal(out.items[0].id, 'h2')
})
