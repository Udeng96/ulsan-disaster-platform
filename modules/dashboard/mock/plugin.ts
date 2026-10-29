// 가짜 서버 — `pnpm dev:mock` 일 때만 켜진다 (MOCK=1).
// vite 프록시보다 먼저 요청을 받아 아래 표에 있는 경로는 가짜 응답을 주고,
// 표에 없는 백엔드 경로는 404 {code,message} 로 막는다 (실서버로 새지 않게).
//
// 실패 흉내: MOCK_FAIL=/slope/api/areas,/api/search  → 해당 경로 접두는 502
// 지연 흉내: MOCK_DELAY=300                          → 모든 응답 300ms 지연
// 부엉이 새 이벤트 주기: MOCK_OWL_MS=60000 (0 이면 안 보냄)
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { deflateSync } from 'node:zlib'
import * as d from './data'
import * as a from './admin'

type Res = ServerResponse
type Handler = (ctx: { req: IncomingMessage; q: URLSearchParams; params: string[]; body: () => Promise<string> }) =>
  unknown | Promise<unknown>

const BACKEND = /^\/(api|bcast|cctv|cctv-sync|server|slope|earthquake|owl|weather|oms|kma-radar|xdworld)(\/|$)/

const json = (res: Res, status: number, body: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

class HttpError {
  status: number
  code: string
  message: string
  constructor(status: number, code: string, message: string) {
    this.status = status
    this.code = code
    this.message = message
  }
}

const routes: [string, RegExp, Handler][] = []
const on = (method: string, path: string, h: Handler) =>
  routes.push([method, new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`), h])

// ── gis ──
on('GET', '/api/regions', () => d.regionList())
on('GET', '/api/layers', () => d.layers)
on('PUT', '/api/layers/colors', async ({ body }) => {
  for (const u of JSON.parse(await body()) as { code: string; color: string }[]) {
    const l = d.layers.find((x) => x.code === u.code)
    if (l) l.color = u.color
  }
  return null
})
on('GET', '/api/pump/stations', () => d.pumpStations)
on('GET', '/api/shelter/cooling', () => d.coolingShelters)
on('GET', '/api/air/stations', () => d.airStations)
on('GET', '/api/oms/roles-departments', () => d.omsRolesDepartments)
on('GET', '/api/search', ({ q }) => d.searchAddress(q.get('q') ?? ''))

// ── 단말·전광판·문구 — 옛 gis 경로와 새 broadcast 경로(/bcast) 둘 다 ──
// 새 broadcast 모양 — layerCode 가 붙고, null 인 필드는 키째 빠진다 (non_null)
const noNull = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null))
on('GET', '/api/broadcast/terminals', () => d.terminals)
on('GET', '/bcast/api/broadcast/terminals', () => d.terminals.map((t) => noNull({ ...t, layerCode: 'BROADCAST' })))
for (const base of ['/api/broadcast', '/bcast/api/broadcast']) {
  on('GET', `${base}/templates`, () => d.templates)
  on('POST', `${base}/templates`, async ({ body }) => {
    const t = { id: d.nextTemplateId(), ...(JSON.parse(await body()) as { title: string; content: string }) }
    d.templates.push(t)
    return t
  })
  on('PUT', `${base}/templates/:id`, async ({ params, body }) => {
    const t = d.templates.find((x) => x.id === Number(params[0]))
    if (!t) throw new HttpError(404, 'NOT_FOUND', '문구가 없습니다')
    Object.assign(t, JSON.parse(await body()))
    return t
  })
  on('DELETE', `${base}/templates/:id`, ({ params }) => {
    const i = d.templates.findIndex((x) => x.id === Number(params[0]))
    if (i >= 0) d.templates.splice(i, 1)
    return null
  })
}
on('GET', '/api/signboard/boards', () => d.signboards)
on('GET', '/bcast/api/broadcast/signboards', () => d.signboards.map((b) => noNull({ ...b, layerCode: 'SIGNBOARD' })))

// 자동음성 — 옛 gis 중계(/api/broadcast/dispatches)와 새 broadcast 직접(/bcast/api/broadcast/voice)
on('POST', '/api/broadcast/dispatches', async ({ body }) => {
  const b = JSON.parse(await body()) as { title: string; alertSound: string; terminalIds: number[] }
  return {
    id: 1, status: 'SUCCESS', castId: 'MOCK', title: b.title, alertSound: b.alertSound,
    targets: b.terminalIds.map((id) => ({ id, name: d.terminals.find((t) => t.id === id)?.name ?? '' })),
    createdAt: d.localIso(Date.now()),
  }
})
on('POST', '/bcast/api/broadcast/voice', () => ({ status: 'SUCCESS' }))
// 전광판 송출 — 옛 gis 중계
on('POST', '/api/signboard/alerts', async ({ body }) => {
  const b = JSON.parse(await body()) as { targetHosts: string[] }
  return { status: 'SUCCESS', targetHosts: b.targetHosts }
})

// ── CCTV — 옛 gis(/api/cctv)·cctv-sync 경로, 새 화면은 /cctv/api/map/cctv ──
on('GET', '/api/cctv', () => d.cctvs)
on('GET', '/cctv/api/map/cctv', () => d.cctvMap)
for (const base of ['/cctv-sync/api', '/cctv/api']) {
  on('GET', `${base}/signboard-cctv`, () => d.signboardCctv)
  on('PUT', `${base}/signboard-cctv/:id`, async ({ params, body }) => {
    const row = d.signboardCctv.find((x) => x.signboardId === Number(params[0]))
    if (!row) throw new HttpError(404, 'NOT_FOUND', '전광판이 없습니다')
    row.cctvId = (JSON.parse(await body()) as { cctvId: string | null }).cctvId
    return row
  })
  on('GET', `${base}/cctv/sync-history`, ({ q }) =>
    d.cctvHistory(q.get('from') ?? '2026-01-01', q.get('to') ?? d.localIso(Date.now()).slice(0, 10), Number(q.get('page') ?? 0), Number(q.get('size') ?? 20)),
  )
}
on('PUT', '/cctv-sync/api/cctv/:id/mapp', () => ({ ok: true }))
on('POST', '/cctv-sync/api/cctv/mapp', () => ({ ok: true }))
on('DELETE', '/cctv-sync/api/cctv/:id/mapp', () => ({ ok: true }))

// ── 지진가속도 ──
on('GET', '/earthquake/api/instruments', () => d.eqInstruments)

// ── 급경사지 ──
on('GET', '/slope/api/managed-areas', () => d.managedAreas)
on('GET', '/slope/api/areas', () => d.slopeAreas())
on('GET', '/slope/api/areas/summary', () => d.slopeSummary())
on('GET', '/slope/api/observations/:id/chart', ({ params, q }) => {
  // 기간설정(from·to) — 끝 날 끝을 '지금'으로, 칸 수는 기간만큼
  const from = q.get('from')
  const to = q.get('to')
  const range = q.get('range') ?? 'realtime'
  const span = from && to ? { end: new Date(`${to}T23:59:59`).getTime(), start: new Date(`${from}T00:00:00`).getTime() } : null
  const c = d.slopeChart(Number(params[0]), range, span ? Math.min(span.end, Date.now()) : Date.now(), span ?? undefined)
  if (!c) throw new HttpError(404, 'NOT_FOUND', '관측항목이 없습니다')
  return c
})
on('GET', '/slope/api/alarms/pending', () => d.slopeAlarmPending())
on('GET', '/slope/api/alarms/history', () => d.slopeAlarmHistory())
on('GET', '/slope/api/alarms/stats', () => d.slopeAlarmStats())
on('GET', '/slope/api/alarms/map', () => d.slopeAlarmMap())

// ── 날씨 ──
on('GET', '/weather/api/summary', () => d.weatherSummary())
on('GET', '/weather/api/radar/latest', () => d.radarLatest())

// ── 부엉이 ──
on('GET', '/owl/event-types', () => d.eventTypes)
on('GET', '/owl/events', ({ q }) => {
  const list = d.searchOwlEvents(q)
  if (!list) throw new HttpError(400, 'BAD_REQUEST', '없는 행정동 id 입니다')
  return list
})

// ── OMS ──
on('POST', '/oms/api/role/event/verify', () => ({ result: 'SUCCESS', code: '0000', message: '확인되었습니다' }))
on('POST', '/oms/userMgt/api/chkLoginId', () => 'true')
on('POST', '/oms/userMgt/api/regUserInfo', () => ({ result: 'SUCCESS' }))

// ── 관리자(server) — 새 화면 (mock/admin.ts). 옛 화면의 /devices 는 그대로 ──
on('GET', '/server/api/devices', () => d.serverDevices)
on('GET', '/server/api/overview', () => a.overview())
on('GET', '/server/api/rack-slots', () => a.rackSlots())
on('GET', '/server/api/servers', () => a.ledger())
on('GET', '/server/api/server-specs', () => a.specs())
on('GET', '/server/api/servers/:host', ({ params }) => a.detail(decodeURIComponent(params[0])) ?? notFound(params[0]))
on('GET', '/server/api/servers/:host/parts', ({ params }) => a.parts(decodeURIComponent(params[0])) ?? notFound(params[0]))
on('GET', '/server/api/firewall/summary', () => a.firewallSummary())
on('GET', '/server/api/firewall/blocks', ({ q }) => a.firewallBlocks(q.get('range') ?? '24h'))
on('GET', '/server/api/firewall/block-types', () => a.firewallBlockTypes())
on('GET', '/server/api/firewall/ports', () => a.firewallPorts())
on('GET', '/server/api/firewall/events', ({ q }) => a.firewallEvents(Number(q.get('limit') ?? 20)))
on('GET', '/server/api/switch/summary', () => a.switchSummary())
on('GET', '/server/api/switch/traffic', ({ q }) => a.switchTraffic(q.get('range') ?? '24h'))
on('GET', '/server/api/switch/ports', () => a.switchPorts())
on('GET', '/server/api/switch/events', () => a.switchEvents())
function notFound(host: string): never {
  throw new HttpError(404, 'SERVER_NOT_FOUND', `없는 장비: ${host}`)
}

// ── 이미지: 지도 타일·레이더 ──
function png(w: number, h: number, px: (x: number, y: number) => [number, number, number, number]) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) raw.set(px(x, y), y * (w * 4 + 1) + 1 + x * 4)
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xffffffff
    for (const v of b) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
// 지도 타일 — 외부 타일 서버 대신 옅은 격자 (모든 칸 같은 그림).
const TILE = png(256, 256, (x, y) => (x % 64 === 0 || y % 64 === 0 ? [58, 66, 80, 255] : [36, 42, 54, 255]))
// 레이더 — 투명 바탕에 비구름 두 덩이.
const RADAR = png(480, 480, (x, y) => {
  const a = Math.hypot(x - 300, y - 200) < 60 ? 150 : Math.hypot(x - 180, y - 320) < 35 ? 120 : 0
  return [64, 160, 255, a]
})

function image(res: Res, buf: Buffer) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'max-age=3600')
  res.end(buf)
}

// ── SSE ──
function sse(req: IncomingMessage, res: Res, tick: (send: (event: string, data: unknown) => void) => () => void) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' })
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  send('connect', { ok: true })
  const stop = tick(send)
  req.on('close', stop)
}

export function mockApi(): Plugin {
  const fail = (process.env.MOCK_FAIL ?? '').split(',').filter(Boolean)
  const delay = Number(process.env.MOCK_DELAY ?? 0)
  const owlMs = Number(process.env.MOCK_OWL_MS ?? 60000)
  return {
    name: 'gis-front-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.config.logger.info('  ➜  가짜 서버(mock) 켜짐 — 백엔드 없이 가짜 데이터로 동작')
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://mock')
        const path = url.pathname
        if (!BACKEND.test(path)) return next()
        if (delay) await new Promise((r) => setTimeout(r, delay))
        if (fail.some((p) => path.startsWith(p)))
          return json(res, 502, { code: 'MOCK_FAIL', message: `가짜 실패: ${path}` })

        if (path.startsWith('/xdworld/')) return image(res, TILE)
        if (path.startsWith('/kma-radar/')) return image(res, RADAR)

        if (path === '/earthquake/api/realtime/stream')
          return sse(req, res, (send) => {
            // status·ping 은 같은 모양 (earthquake 답 4번)
            const status = () => ({ sourceConnected: true, lastValueAt: null, secondsSinceLastValue: null })
            send('status', status())
            const ping = setInterval(() => send('ping', status()), 15000)
            const t = setInterval(() => {
              const now = Date.now()
              for (const i of d.eqInstruments) send('earthquake-realtime', d.eqSample(String(i.stationCode), String(i.net), String(i.obs), now))
            }, 1000)
            return () => {
              clearInterval(t)
              clearInterval(ping)
            }
          })
        if (path === '/owl/events/stream')
          return sse(req, res, (send) => {
            // owl-web 과 같게 — ping 15초 (내용은 글자)
            const ping = setInterval(() => send('ping', 'keep-alive'), 15000)
            const ev = owlMs > 0 ? setInterval(() => send('owl-message', d.newOwlEvent()), owlMs) : undefined
            return () => {
              clearInterval(ping)
              if (ev) clearInterval(ev)
            }
          })

        const method = req.method ?? 'GET'
        for (const [m, rx, h] of routes) {
          const hit = m === method && rx.exec(path)
          if (!hit) continue
          try {
            const out = await h({
              req,
              q: url.searchParams,
              params: hit.slice(1).map(decodeURIComponent),
              body: () =>
                new Promise((resolve) => {
                  let s = ''
                  req.on('data', (c) => (s += c))
                  req.on('end', () => resolve(s))
                }),
            })
            if (typeof out === 'string') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8')
              return res.end(out)
            }
            return out === null ? json(res, 200, {}) : json(res, 200, out)
          } catch (e) {
            if (e instanceof HttpError) return json(res, e.status, { code: e.code, message: e.message })
            return json(res, 500, { code: 'MOCK_ERROR', message: String(e) })
          }
        }
        json(res, 404, { code: 'NOT_FOUND', message: `가짜 서버에 없는 경로: ${method} ${path}` })
      })
    },
  }
}
