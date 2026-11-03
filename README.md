# dsh-deepseek-status

**English** | [简体中文](README.zh.md)

A standalone [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(DSH) web plugin that puts **DeepSeek service status** in a **card like the
balance plugin** — always visible in the bottom-right corner, with a detail
popover and browser notifications when DeepSeek goes down or recovers.

![Status card and detail popover](screenshot.png)

## Features

- **Always-visible status card** — fixed to the bottom-right corner. When
  `dsh-balance` is installed it sits 8 px above the balance card; without it, it
  takes the corner itself. The card shows the overall state, active-incident
  count and last update time.
- **Detail popover, not a page** — click the card to open a status popover above
  it: overall state, grouped components with 90-day uptime, active incident with
  its update timeline, and the last 30 days of incidents/maintenance. The
  popover closes on outside click or `Esc`.
- **Down/up notifications** — one browser notification on the
  operational ↔ non-operational transition. The first load is a silent baseline;
  clicking a notification opens the status popover.
- **No DeepSeek credentials** — the status feed is public, so it works without an
  API key and independently of `dsh-balance`.
- **No sidebar entry, no status page** — the card and its popover are the whole
  UI. The balance plugin keeps its own card and its own popover.
- **Bilingual and themed** — Chinese/English labels, DSH menu-surface tokens,
  light/dark theme support.

## Requirements

- **DSH 0.2.1.x** with the web profile. Tested with `0.2.1-rc.3`; the package
  declares `engines.dsh = ">=0.2.1-0 <0.2.2-0"`.
- Node.js `^22.19.0 || >=24.0.0` (the DSH requirement).
- Browser notification permission for the DSH site, only if you want the
  down/up notifications.

## Install

Install this repository directly from GitHub:

```bash
dsh plugin --profile web add github:zz0-0/dsh-deepseek-status
systemctl --user restart dsh-web
```

Then **hard-refresh** the DSH web page. The plugin has a host half (the status
routes and the injected card script), so it needs the restart as well as the
refresh.

Remove:

```bash
dsh plugin --profile web remove dsh-deepseek-status
systemctl --user restart dsh-web
```

## Using it

- The **bottom-right status card** is the direct view. Green = operational,
  amber = degraded/partial, red = full outage, blue = maintenance, gray =
  unknown. The second line shows the active-incident count; the third shows
  `更新于 HH:MM`.
- Click the card to open the detail popover. It has the overall state, each
  component with its 90-day uptime, the active incident and its updates, and the
  recent 30-day event list.
- The popover's `⟳` refreshes status and history; the official status-page link
  opens the full DeepSeek page.
- Click **启用通知** in the popover to request notification permission. After
  that, operational → incident and incident → operational each produce one
  notification. Clicking it opens the card's popover.
- Outside click or `Esc` closes the popover.

## Placement with `dsh-balance`

The two plugins share the corner without a second card stack:

- `dsh-balance` keeps its balance card at bottom-right.
- `dsh-deepseek-status` places its status card 8 px above that card.
- Both cards stay visible, and each opens its **own** detail popover.
- If only `dsh-deepseek-status` is installed, its card takes the bottom-right
  corner itself and avoids the composer/status row.

Status was removed from `dsh-balance` (0.2.1), so this plugin is the single owner
of status polling and status UI.

## Data

The host reads the public DeepSeek status page backend (the same JSON its own
status page uses):

| Endpoint | Used for |
|---|---|
| `summary/active` | overall state, page/section/component tree, active changes |
| `summary/structure?start_at_from_seconds=…&start_at_to_seconds=…` | 90-day component/section uptime |
| `change/list?start_at_seconds=…&end_at_seconds=…` | recent incidents/maintenance and update timelines |

The host polls the active feed at most every 30 seconds and caches structure and
history for five minutes. The browser talks only to the local DSH server:

- `GET /api/deepseek-status/summary`
- `GET /api/deepseek-status/history?days=30`
- `GET /api/deepseek-status/client.js` — the injected card script

Component status is derived from active changes; without an active change,
components are operational. Overall status is the worst active change. Uptime is
the status page's own 90-day figure.

The status page backend is not a documented API. A failed read yields
`状态未知` with the official status-page link rather than a false outage.

## Privacy

- **Outbound requests**: only `status.deepseek.com` (the public status feed and
  its page). No credentials, no API key, no telemetry.
- **Local-only**: the browser requests only the local `/api/deepseek-status`
  routes.
- **Notifications**: generated locally on status transitions; no push service.
  A closed browser receives none.

## Compatibility

- DSH **0.2.1.x** only, enforced by `engines.dsh`.
- The browser side is a classic script injected into the DSH index page, the
  same pattern as `dsh-balance`. It does not patch React and it registers no
  sidebar/page slots.
- The status backend is a public third-party service page. The parser is
  defensive.

## Development

No build step: plain ESM on the host and a classic script for the browser.

```bash
git clone https://github.com/zz0-0/dsh-deepseek-status.git
cd dsh-deepseek-status
dsh plugin --profile web add link:$(pwd)
systemctl --user restart dsh-web
```

- Host changes (`lib/index.js`, `lib/status.js`) require a `dsh web` restart.
- Browser changes (`lib/client.js`) are served with `Cache-Control: no-store`;
  hard-refresh the page.
- The injected script fetches the host summary every 30 seconds and renders the
  card and popover.

### Files

| File | Role |
|---|---|
| `package.json` | DSH bundle metadata |
| `cordis.patch.yml` | Inserts the host entry into the web profile |
| `lib/index.js` | Host routes, caching, loopback fence, client injection |
| `lib/status.js` | Public status feed fetch + normalization |
| `lib/client.js` | Bottom-right card, detail popover, notifications |
| `screenshot.png` | README screenshot |

## License

[MIT](LICENSE)
