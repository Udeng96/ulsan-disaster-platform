






process.env.TZ = 'Asia/Seoul'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

type Row = Record<string, unknown>
const seed = JSON.parse(
  readFileSync(fileURLToPath(new URL('./seed.json', import.meta.url)), 'utf-8'),
) as Record<string, Row[]>

const tbl = <T = Row>(name: string) => (seed[name] ?? []) as unknown as T[]

/** 고정 난수 (mulberry32). */
export function rng(seedNo: number) {
  let a = seedNo >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
  }
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

/** 타임존 없는 로컬 ISO (서버들이 LocalDateTime 으로 내려주는 모양). */
export function localIso(t: number | Date): string {
  const d = new Date(t)
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
/** +09:00 오프셋 ISO (weather 모듈 모양). */
export function kstIso(t: number | Date): string {
  return `${localIso(t)}+09:00`
}


interface Region { id: number; name: string; code: string; display_order: number }
const regions = tbl<Region>('common.region')
const regionName = (id: unknown) => regions.find((r) => r.id === id)?.name ?? null

export const regionList = () =>
  [...regions]
    .sort((a, b) => a.display_order - b.display_order)
    .map((r) => ({ id: r.id, code: r.code, name: r.name }))

/** 행정동 대표 좌표 — 같은 동에 있는 시설 좌표 평균. */
const regionCenter = (() => {
  const acc = new Map<number, { lat: number; lng: number; n: number }>()
  for (const t of ['pump.pump_station', 'shelter.cooling_shelter', 'air.station', 'broadcast.terminal']) {
    for (const r of tbl(t)) {
      const id = r.region_id as number
      if (id == null || typeof r.lat !== 'number') continue
      const a = acc.get(id) ?? { lat: 0, lng: 0, n: 0 }
      a.lat += r.lat as number
      a.lng += r.lng as number
      a.n++
      acc.set(id, a)
    }
  }
  return new Map([...acc].map(([id, a]) => [id, { lat: a.lat / a.n, lng: a.lng / a.n }]))
})()


export const layers = tbl<Row>('common.layer')
  .filter((l) => l.is_active !== false)
  .map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    color: l.color,
    displayOrder: l.display_order,
  }))

export const pumpStations = (() => {
  const zones = tbl<Row>('pump.drainage_zone')
  const equips = tbl<Row>('pump.pump_equipment')
  return tbl<Row>('pump.pump_station').map((s) => ({
    id: s.id,
    name: s.name,
    layerCode: 'PUMP_STATION',
    lat: s.lat,
    lng: s.lng,
    address: s.address,
    drainageZone: zones.find((z) => z.id === s.drainage_zone_id)?.name ?? null,
    region: regionName(s.region_id),
    equipments: equips
      .filter((e) => e.pump_station_id === s.id && e.is_displayed !== false)
      .map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        statusPattern: e.status_pattern,
        state: e.state,
        value: e.value,
        priority: e.priority,
      })),
  }))
})()

export const coolingShelters = tbl<Row>('shelter.cooling_shelter').map((s) => ({
  id: s.id,
  name: s.name,
  layerCode: 'SHELTER',
  roadAddress: s.road_address ?? null,
  parcelDetail: s.parcel_detail ?? null,
  lat: s.lat,
  lng: s.lng,
  region: regionName(s.region_id),
  facilityType: s.facility_type ?? null,
  capacity: s.capacity ?? null,
  weekdayOpen: s.weekday_open ?? null,
  weekdayClose: s.weekday_close ?? null,
}))

export const airStations = tbl<Row>('air.station').map((s) => ({
  id: s.id,
  name: s.name,
  layerCode: 'AIR_QUALITY',
  networkType: s.network_type,
  location: s.location ?? null,
  address: s.address ?? null,
  lat: s.lat,
  lng: s.lng,
  region: regionName(s.region_id),
}))

export const omsRolesDepartments = {
  eventRoles: [
    { id: 'ROLE_EVT_01', name: '상황관리', description: '이벤트 상황 관리' },
    { id: 'ROLE_EVT_02', name: '조회', description: '이벤트 조회만' },
  ],
  departments: [
    { id: 'DPT001', code: 'D001', name: '안전총괄과' },
    { id: 'DPT002', code: 'D002', name: '가상시설0215' },
    { id: 'DPT003', code: 'D003', name: '가상시설0217' },
  ],
}

/** 주소검색 — 시설 이름·주소에서 찾는다 (외부 검색 대신). */
export function searchAddress(q: string) {
  const kw = q.trim()
  if (!kw) return []
  const pool = [
    ...coolingShelters.map((s) => ({ name: s.name, road: s.roadAddress, lat: s.lat, lng: s.lng, cat: '무더위쉼터' })),
    ...pumpStations.map((s) => ({ name: `${s.name} 배수펌프장`, road: s.address, lat: s.lat, lng: s.lng, cat: '배수펌프장' })),
    ...terminals.map((t) => ({ name: t.name, road: t.address, lat: t.lat, lng: t.lng, cat: '방송장비' })),
  ]
  return pool
    .filter((p) => String(p.name).includes(kw) || String(p.road ?? '').includes(kw))
    .slice(0, 30)
    .map((p, i) => ({
      id: `road:mock${String(i).padStart(4, '0')}`,
      title: p.name,
      category: 'PLACE',
      roadAddress: p.road ? `가상시설0565 ${String(p.road).replace(/^가상시설0565 /, '')}` : null,
      parcelAddress: null,
      lat: p.lat,
      lng: p.lng,
    }))
}


export const terminals = tbl<Row>('broadcast.terminal').map((t) => ({
  id: t.id,
  terminalCode: t.terminal_code,
  name: t.name as string,
  commType: t.comm_type,
  phone: t.phone ?? null,
  address: (t.address as string) ?? null,
  lat: t.lat as number,
  lng: t.lng as number,
  installedAt: t.installed_at ?? null,
  manufacturer: t.manufacturer ?? null,
  model: t.model ?? null,
  groupType: t.group_type ?? null,
  region: regionName(t.region_id),
}))

export const signboards = tbl<Row>('signboard.board').map((b) => ({
  id: b.id,
  name: b.name,
  address: b.address ?? null,
  lat: b.lat,
  lng: b.lng,
  region: regionName(b.region_id),
  host: b.host ?? null,
}))

let templateSeq = 0
export const templates = tbl<Row>('broadcast.message_template').map((t) => {
  templateSeq = Math.max(templateSeq, t.id as number)
  return { id: t.id as number, title: t.title as string, content: t.content as string }
})
export const nextTemplateId = () => ++templateSeq


const PUMP_SUB: Record<string, string> = {
  가상시설0502: 'PUMP_YAEUM', 가상시설0472: 'PUMP_SINJEONG', 가상시설0287: 'PUMP_DONGBAEK', 가상시설0291: 'PUMP_DONGSEO',
  가상시설0274: 'PUMP_DOSAN', '가상시설0718': 'PUMP_TAEHWA', 가상시설0242: 'PUMP_NAMJUNG', 가상시설0302: 'PUMP_DUWANG',
  가상시설0411: 'PUMP_SAMSAN', 가상시설0424: 'PUMP_SAMSAN_BONDONG', 가상시설0523: 'PUMP_YEOCHEON', 가상시설0479: 'PUMP_SINJEONG3',
}
export const slopeAreaDefs = [
  { id: 1, name: '가상시설0432', sub: 'SLOPE_SAMIK', address: '가상시설0565 가상시설0502동 762-8', lat: 0.0, lng: 0.0 },
  { id: 2, name: '가상시설0553', sub: 'SLOPE_UJU', address: '가상시설0565 가상시설0480 가상시설0384', lat: 0.0, lng: 0.0 },
  { id: 3, name: '가상시설0680', sub: 'SLOPE_EUNWOLBONG', address: '가상시설0565 가상시설0480 가상시설0402', lat: 0.0, lng: 0.0 },
]

export const cctvs = (() => {
  const r = rng(11)
  const GBN = ['방범', '방범', '방범', '교통', '재난', '어린이보호']
  const list: {
    cctvId: string; name: string; lat: number; lng: number; gbnCd: string; mgtNo: string
    ptzYn: string; regionId: number | null; facilities: { facClfy: string; facSubClfy: string | null }[]
  }[] = []
  const add = (name: string, lat: number, lng: number, regionId: number | null, fac: { facClfy: string; facSubClfy: string | null }[]) => {
    const n = list.length + 1
    list.push({
      cctvId: `CTV${String(n).padStart(7, '0')}`,
      name,
      lat: round(lat, 6),
      lng: round(lng, 6),
      gbnCd: fac.length ? '재난' : r.pick(GBN),
      mgtNo: `UL-NG-${String(1000 + n)}`,
      ptzYn: r.next() < 0.4 ? 'Y' : 'N',
      regionId,
      facilities: fac,
    })
  }
  for (const s of pumpStations) {
    const sub = PUMP_SUB[s.name as string] ?? null
    for (let i = 1; i <= r.int(1, 3); i++)
      add(`${s.name} 배수펌프장 ${i}`, (s.lat as number) + r.range(-6e-4, 6e-4), (s.lng as number) + r.range(-6e-4, 6e-4), null, [{ facClfy: 'PUMP_STATION', facSubClfy: sub }])
  }
  for (const a of slopeAreaDefs)
    for (let i = 1; i <= 3; i++)
      add(`${a.name} 급경사지 ${i}`, a.lat + r.range(-5e-4, 5e-4), a.lng + r.range(-5e-4, 5e-4), null, [{ facClfy: 'SLOPE', facSubClfy: a.sub }])
  add('지진가속도계 설치동', 0.0, 0.0, 5, [{ facClfy: 'SEISMOMETER', facSubClfy: 'US_NGG' }])
  for (const b of signboards)
    add(`${b.name} 전광판`, (b.lat as number) + 3e-4, (b.lng as number) - 3e-4, null, [{ facClfy: 'DISASTER_ALERT', facSubClfy: 'SIGNBOARD' }])
  // 나머지 — 행정동마다 방범·교통 CCTV
  for (const reg of regions) {
    const c = regionCenter.get(reg.id)
    if (!c) continue
    for (let i = 1; i <= 8; i++)
      add(`${reg.name} ${r.pick(['교차로', '공원', '어린이공원', '주택가', '학교앞', '시장', '하천변'])} ${i}`, c.lat + r.range(-4e-3, 4e-3), c.lng + r.range(-4e-3, 4e-3), reg.id, [])
  }
  return list
})()

/** 새 cctv 모듈 GET /cctv/api/map/cctv — 옛 facilities 를 menus 로 (재난 예·경보는 BROADCAST, facId = 펌프장·지구·전광판 id) */
export const cctvMap = cctvs.map(({ facilities, ...c }) => {
  const fac = (prefix: string, rows: readonly { id: unknown; name: unknown }[]) => rows.find((x) => c.name.startsWith(`${x.name as string} ${prefix}`))
  const menus = facilities.map((f) => {
    if (f.facClfy === 'PUMP_STATION') {
      const p = fac('배수펌프장', pumpStations)
      return { menu: 'PUMP_STATION', facId: (p?.id as number) ?? null, facName: (p?.name as string) ?? null }
    }
    if (f.facClfy === 'SLOPE') {
      const a = fac('급경사지', slopeAreaDefs)
      return { menu: 'SLOPE', facId: a?.id ?? null, facName: a?.name ?? null }
    }
    if (f.facClfy === 'SEISMOMETER') return { menu: 'SEISMOMETER', facId: null, facName: null }
    const b = fac('전광판', signboards)
    return { menu: 'BROADCAST', facId: (b?.id as number) ?? null, facName: (b?.name as string) ?? null }
  })
  return { ...c, regionName: regionName(c.regionId), menus }
})

/** 전광판 ↔ CCTV 1:1 연결 (cctv 모듈). */
export const signboardCctv = signboards.map((b) => ({
  signboardId: b.id as number,
  cctvId: cctvs.find((c) => c.name === `${b.name} 전광판`)?.cctvId ?? null,
}))

export function cctvHistory(from: string, to: string, page = 0, size = 20) {
  const r = rng(13)
  const end = new Date(`${to}T23:59:59`).getTime()
  const start = new Date(`${from}T00:00:00`).getTime()
  const all = Array.from({ length: 64 }, (_, i) => {
    const c = r.pick(cctvs)
    return {
      id: 64 - i,
      type: r.pick(['NEW', 'UP', 'UP', 'DEL'] as const),
      cctvId: c.cctvId,
      name: c.name,
      gbnCd: c.gbnCd,
      syncedAt: localIso(end - i * 9.5 * 3600_000),
      changes: r.next() < 0.5 ? '좌표 변경' : undefined,
    }
  }).filter((h) => new Date(h.syncedAt).getTime() >= start)
  return { content: all.slice(page * size, page * size + size), totalElements: all.length }
}


export const eqInstruments = tbl<Row>('earthquake.instrument').map((i) => ({
  id: i.id,
  stationCode: i.station_code,
  net: i.net,
  obs: i.obs,
  installLocation: i.install_location,
  axis: i.axis,
  modelName: i.model_name,
  serialNo: i.serial_no,
  connectionType: i.connection_type,
  lat: 0.0,
  lng: 0.0,
}))

/** 지진 실시간 한 건 — 미세진동(0.001~0.02 gal) + 가끔 튀는 값. */
export function eqSample(stationCode: string, net: string, obs: string, t: number) {
  const r = rng(Math.floor(t / 1000) * 7 + stationCode.length * 131 + obs.charCodeAt(2))
  const spike = r.next() < 0.02 ? r.range(0.03, 0.09) : 0
  const hpga = round(r.range(0.001, 0.02) + spike, 4)
  return { stationCode, net, obs, time: localIso(t), hpga, tpga: round(hpga * r.range(1.1, 1.6), 4) }
}


export const managedAreas = tbl<Row>('slope.steep_slope').map((a) => ({
  id: a.id,
  mgmtNo: a.mgmt_no,
  name: a.name,
  legalDong: a.legal_dong ?? null,
  legalDongCode: a.legal_dong_code ?? null,
  jibun: a.jibun ?? null,
  grade: a.grade ?? null,
  org: a.org ?? null,
  department: a.department ?? null,
  lat: a.lat ?? null,
  lng: a.lng ?? null,
}))

const LEVELS = ['정상', '관심', '주의', '경계', '심각'] as const
const THRESH = {
  INCLINOMETER: [0.3, 0.6, 0.9, 1.7],
  SOIL_MOISTURE: [20, 32.5, 35, 45],
  ROCKFALL_DETECTOR: [100, 110, 120, 130],
  RAIN_GAUGE: { realtime: [4, 6, 10, 14], hour: [12, 16, 27, 38], day: [61, 84, 147, 181], month: [] as number[] },
}
const levelOf = (v: number, th: number[]) => {
  let l = 0
  th.forEach((x, i) => { if (Math.abs(v) >= x) l = i + 1 })
  return LEVELS[l]
}

interface ItemDef {
  itemId: number
  type: 'INCLINOMETER' | 'SOIL_MOISTURE' | 'ROCKFALL_DETECTOR' | 'RAIN_GAUGE'
  axes: { unitType: string; label: string; unit: string; base: number }[]
}
interface InstrumentDef {
  id: number; areaId: number; displayName: string; sourceName: string
  category: 'INCLINOMETER' | 'ROCKFALL_DETECTOR' | 'RAIN_GAUGE'
  lat: number; lng: number; spotNo: string; address: string; installedAt: string; items: ItemDef[]
}

/** 지구 3곳·계측기 48대·관측항목 70개 (slope README 기준 규모). */
export const slopeInstruments: InstrumentDef[] = (() => {
  const r = rng(21)
  const out: InstrumentDef[] = []
  let itemId = 1
  // 지구별 [경사계(함수비 포함), 경사계(함수비 없음), 낙석, 강우] 수 — 합 48대, 관측항목 70개
  const plan: Record<number, [number, number, number, number]> = { 1: [10, 0, 4, 1], 2: [12, 0, 0, 1], 3: [0, 18, 1, 1] }
  const short: Record<number, string> = { 1: '삼익', 2: '우주', 3: '가상시설0680' }
  for (const a of slopeAreaDefs) {
    const [incW, inc, rock, rain] = plan[a.id]
    let no = 0
    const mk = (category: InstrumentDef['category'], kind: string, items: ItemDef[]) => {
      no++
      const coll = no <= 9 ? 1 : 2
      out.push({
        id: out.length + 1,
        areaId: a.id,
        displayName: `수집${coll} - ${no}`,
        sourceName: `${short[a.id]}_수집${coll}_${kind}-${no}`,
        category,
        lat: round(a.lat + r.range(-4e-4, 4e-4), 7),
        lng: round(a.lng + r.range(-4e-4, 4e-4), 7),
        spotNo: `마마${r.int(60000000, 69999999)}`,
        address: a.address,
        installedAt: '2024-07-09T16:00:00',
        items,
      })
    }
    const inc2 = () => ({ itemId: itemId++, type: 'INCLINOMETER' as const, axes: [
      { unitType: 'U081', label: 'X축', unit: '°', base: r.range(-0.4, 0.5) },
      { unitType: 'U082', label: 'Y축', unit: '°', base: r.range(-0.3, 0.45) },
    ] })
    for (let i = 0; i < incW; i++)
      mk('INCLINOMETER', '경사_함수', [inc2(), { itemId: itemId++, type: 'SOIL_MOISTURE', axes: [{ unitType: 'U040', label: '함수비', unit: '%', base: r.range(14, 33) }] }])
    for (let i = 0; i < inc; i++) mk('INCLINOMETER', '경사', [inc2()])
    for (let i = 0; i < rock; i++)
      mk('ROCKFALL_DETECTOR', '낙석', [{ itemId: itemId++, type: 'ROCKFALL_DETECTOR', axes: [{ unitType: 'U210', label: '감지', unit: '회', base: r.int(0, 12) }] }])
    for (let i = 0; i < rain; i++)
      mk('RAIN_GAUGE', '강우', [{ itemId: itemId++, type: 'RAIN_GAUGE', axes: [{ unitType: 'U010', label: '강우량', unit: 'mm', base: r.range(0, 2) }] }])
  }
  return out
})()

const thresholdsFor = (type: ItemDef['type'], range: string) =>
  type === 'RAIN_GAUGE'
    ? THRESH.RAIN_GAUGE[range as keyof typeof THRESH.RAIN_GAUGE] ?? []
    : THRESH[type]

function itemValue(axis: ItemDef['axes'][number], type: ItemDef['type'], t: number, seedNo: number) {
  const r = rng(Math.floor(t / 60000) * 31 + seedNo)
  if (type === 'ROCKFALL_DETECTOR') return Math.max(0, Math.round(axis.base + r.range(-3, 3)))
  if (type === 'RAIN_GAUGE') return round(Math.max(0, axis.base + r.range(-1, 1)), 1)
  if (type === 'SOIL_MOISTURE') return round(axis.base + r.range(-0.3, 0.3), 1)
  return round(axis.base + r.range(-0.01, 0.01), 3)
}

export function slopeAreas(now = Date.now()) {
  const lastAt = localIso(Math.floor(now / 60000) * 60000 - 18000)
  return slopeAreaDefs.map((a) => {
    const instruments = slopeInstruments.filter((i) => i.areaId === a.id).map((i) => {
      const failed = a.id === 2 // 가상시설0553 — 장애 지구 (API.md 예시와 같게)
      const values = i.items.flatMap((it) =>
        it.axes.map((ax) => {
          const v = itemValue(ax, it.type, now, it.itemId * 10 + ax.unitType.length)
          return {
            observationItemId: it.itemId,
            type: it.type,
            unitType: ax.unitType,
            label: ax.label,
            value: failed ? null : v,
            unit: ax.unit,
            level: failed ? null : levelOf(v, thresholdsFor(it.type, 'realtime')),
            measuredAt: failed ? null : lastAt,
          }
        }),
      )
      const lv = values.map((v) => LEVELS.indexOf(v.level as (typeof LEVELS)[number])).filter((x) => x >= 0)
      return {
        id: i.id,
        displayName: i.displayName,
        sourceName: i.sourceName,
        category: i.category,
        level: lv.length ? LEVELS[Math.max(...lv)] : null,
        lastMeasuredAt: failed ? null : lastAt,
        spotNo: i.spotNo,
        address: i.address,
        installedAt: i.installedAt,
        lat: i.lat,
        lng: i.lng,
        values,
      }
    })
    const lv = instruments.map((i) => LEVELS.indexOf(i.level as (typeof LEVELS)[number])).filter((x) => x >= 0)
    return {
      id: a.id,
      name: a.name,
      address: a.address,
      lat: a.lat,
      lng: a.lng,
      grade: null,
      level: lv.length ? LEVELS[Math.max(...lv)] : '정상',
      lastMeasuredAt: a.id === 2 ? null : lastAt,
      instruments,
    }
  })
}

export const slopeSummary = (now = Date.now()) =>
  slopeAreas(now).map(({ id, name, grade, level, lastMeasuredAt }) => ({ id, name, grade, level, lastMeasuredAt }))

export function slopeChart(itemId: number, range: string, now = Date.now(), span?: { start: number; end: number }) {
  const inst = slopeInstruments.find((i) => i.items.some((it) => it.itemId === itemId))
  const item = inst?.items.find((it) => it.itemId === itemId)
  if (!item) return null
  const step = { realtime: 300_000, hour: 3600_000, day: 86400_000, month: 30 * 86400_000 }[range] ?? 300_000
  const last = Math.floor(now / step) * step
  const count = span ? Math.max(1, Math.floor((last - span.start) / step) + 1) : ({ realtime: 9, hour: 24, day: 30, month: 12 }[range] ?? 9)
  const series = item.axes.map((ax) => ({
    unitType: ax.unitType,
    label: item.type === 'RAIN_GAUGE' && range === 'realtime' ? '5분 강우량' : ax.label,
    bar: item.type === 'RAIN_GAUGE',
    points: Array.from({ length: count }, (_, k) => {
      const t = last - (count - 1 - k) * step
      const v = itemValue(ax, item.type, t, itemId * 10 + ax.unitType.length + k)
      // 경사계 차트는 절댓값 — 실제 slope 서버와 같게 (ChartReader: 임계값이 절댓값 기준)
      return { at: localIso(t), value: item.type === 'INCLINOMETER' && v !== null ? Math.abs(v) : v, complete: k < count - 1 }
    }),
  }))
  if (item.type === 'RAIN_GAUGE' && range === 'realtime') {
    const bars = series[0].points
    series.push({
      unitType: 'U010',
      label: '15분 누적',
      bar: false,
      points: bars.map((p, k) => ({
        ...p,
        value: round(bars.slice(Math.max(0, k - 2), k + 1).reduce((s, b) => s + (b.value ?? 0), 0), 1),
      })),
    })
  }
  return {
    observationItemId: itemId,
    category: item.type,
    unit: item.axes[0].unit,
    bar: item.type === 'RAIN_GAUGE',
    range,
    thresholds: thresholdsFor(item.type, range).map((value, i) => ({ level: LEVELS[i + 1], value })),
    series,
  }
}

export function slopeAlarmPending(now = Date.now()) {
  // 발령 필요 2건 + 해제 필요 1건 (cause null, 단계가 내려감). 원인 수치는 서버가 싣지 않는다 (slope 답 10-21)
  const none = { causeUnitType: null, causeValue: null, causeUnit: null }
  return [
    { areaName: '가상시설0432', level: '관심', fromLevel: '정상', occurredAt: localIso(now - 5.2 * 3600_000), cause: '삼익_수집2_경사_함수-3', ...none },
    { areaName: '가상시설0680', level: '관심', fromLevel: '정상', occurredAt: localIso(now - 5.2 * 3600_000), cause: '가상시설0680_수집1_경사_함수-8', ...none },
    { areaName: '가상시설0553', level: '정상', fromLevel: '주의', occurredAt: localIso(now - 1.5 * 3600_000), cause: null, ...none },
  ]
}

export function slopeAlarmHistory(now = Date.now()) {
  const r = rng(31)
  const out = []
  let t = now - 2 * 3600_000
  for (let i = 0; i < 18; i++) {
    const a = r.pick(slopeAreaDefs)
    const up = r.next() < 0.6
    const lv = r.int(1, 3)
    const from = up ? LEVELS[lv - 1] : LEVELS[Math.min(4, lv + 1)]
    out.push({
      areaName: a.name, issuer: null, fromLevel: from, level: LEVELS[lv], issuedAt: localIso(t), message: null,
      direction: up ? 'UP' : 'DOWN', lastSentAt: up ? localIso(t) : null, sendCount: up ? 1 : 0,
      endedAt: i === 0 ? null : localIso(t + r.range(1, 9) * 3600_000),
      causes: `${a.name}_수집${r.int(1, 2)}_경사-${r.int(1, 9)}`,
    })
    t -= r.range(6, 40) * 3600_000
  }
  return out
}

export function slopeAlarmStats() {
  const y = new Date().getFullYear()
  return {
    issued: 9,
    released: 7,
    byLevel: { 관심: 5, 주의: 3, 경계: 1 },
    needed: 14,
    neededByLevel: { 관심: 8, 주의: 4, 경계: 2 },
    monthly: Array.from({ length: 12 }, (_, i) => ({ month: `${y}-${String(i + 1).padStart(2, '0')}`, count: [0, 0, 0, 2, 0, 1, 3, 2, 1, 0, 0, 0][i], needed: [0, 0, 1, 3, 0, 2, 4, 2, 2, 0, 0, 0][i] })),
  }
}

export const slopeAlarmMap = () =>
  slopeAreaDefs.map((a, i) => ({ areaId: a.id, name: a.name, lat: a.lat, lng: a.lng, count: [3, 1, 5][i], needed: [5, 2, 7][i] }))


export function weatherSummary(now = Date.now()) {
  const hour = Math.floor(now / 3600_000) * 3600_000
  const r = rng(Math.floor(now / 3600_000))
  return {
    location: { name: '울산 남구', latitude: 0.0, longitude: 0.0 },
    observation: {
      observedAt: kstIso(hour),
      temperatureC: round(r.range(14, 19), 1),
      humidityPct: r.int(45, 70),
      rainfallMm: 0,
      windSpeedMs: round(r.range(1, 4), 1),
      windDirectionDeg: r.int(0, 359),
      ptyCode: 0,
    },
    // 지금 정시부터 3개 (weather 답 10-23)
    predictions: Array.from({ length: 3 }, (_, k) => ({
      forecastAt: kstIso(hour + k * 3600_000),
      skyCode: [1, 1, 3, 3, 4][k % 5],
      ptyCode: k > 15 && k < 19 ? 1 : 0,
      temperatureC: round(16 + 4 * Math.sin(((k + 6) / 24) * 2 * Math.PI), 1),
      humidityPct: 50 + (k % 7) * 3,
      rainfallMm: k > 15 && k < 19 ? 1.5 : 0,
      windSpeedMs: round(1.5 + (k % 4) * 0.6, 1),
      windDirectionDeg: (k * 37) % 360,
    })),
    airQuality: {
      measuredAt: kstIso(hour), stationName: '가상시설0412',
      pm10Value: 34, pm10Grade: 2, pm25Value: 17, pm25Grade: 2, o3Value: 0.031, o3Grade: 1, khaiValue: 62, khaiGrade: 2,
    },
    // 발효 중인 울산 특보만 — 모양: { tmFc, kind, areas, title: "강풍주의보 : 울산", content | null }
    warnings: [] as { tmFc: string; kind: string; areas: string[]; title: string; content: string | null }[],
  }
}

export function radarLatest(now = Date.now()) {
  const t = Math.floor((now - 10 * 60000) / 300000) * 300000
  return { observedAtKst: kstIso(t), imageUrl: '/kma-radar/latest.png', radarType: 'CMP_WRC' }
}


export const eventTypes = (() => {
  const details = tbl<Row>('owl.disaster_type_detail')
  return tbl<Row>('owl.disaster_type').map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    children: details
      .filter((d) => d.group_code === g.code)
      .map((d) => ({ id: d.id, name: d.name, code: d.code, groupCode: d.group_code })),
  }))
})()

const TITLES: Record<string, string[]> = {
  '6': ['아파트 화재 신고', '차량 화재', '인명 구조 요청', '응급환자 이송'],
  '2': ['도로 침수로 통행 제한', '가스 누출 의심 신고', '정전 발생', '교통사고 다중 추돌'],
  '1': ['강풍으로 간판 낙하 위험', '하천 수위 상승', '지진 감지', '낙석 발생'],
  '5': ['재난 대응 모의훈련'],
}

let eventSeq = 0
function makeEvent(r: ReturnType<typeof rng>, t: number) {
  const group = r.pick(['6', '6', '2', '2', '1', '5'])
  const g = eventTypes.find((x) => x.code === group)!
  const d = r.pick(g.children)
  const reg = r.pick(regions)
  const c = regionCenter.get(reg.id) ?? { lat: 35.53, lng: 129.31 }
  eventSeq++
  return {
    id: eventSeq,
    msgId: `MSG${String(eventSeq).padStart(8, '0')}`,
    disasterTypeCode: String(d.code),
    disasterTypeName: String(d.name),
    title: `${reg.name} ${r.pick(TITLES[group] ?? ['상황 전파'])}`,
    occurDtm: localIso(t),
    sendDtm: localIso(t + 90_000),
    endStatus: r.next() < 0.7 ? '진행중' : '종결',
    regionName: reg.name,
    addr: `가상시설0565 ${reg.name}`,
    roadAddr: null,
    lat: round(c.lat + r.range(-2e-3, 2e-3), 6),
    lng: round(c.lng + r.range(-2e-3, 2e-3), 6),
    summary: '신고내역',
  }
}

const startedAt = Date.now()
export const owlEvents: ReturnType<typeof makeEvent>[] = (() => {
  const r = rng(41)
  const list = []
  let t = startedAt - 20 * 60000
  for (let i = 0; i < 28; i++) {
    list.push(makeEvent(r, t))
    t -= r.range(0.5, 4) * 3600_000
  }
  return list.reverse()
})()

const liveRng = rng(43)
/** SSE 로 보낼 새 이벤트 — 목록에도 추가해 다시 조회해도 보인다. */
export function newOwlEvent() {
  const e = makeEvent(liveRng, Date.now())
  owlEvents.push(e)
  return e
}

export function searchOwlEvents(q: URLSearchParams) {
  const ids = (k: string) => (q.get(k) ?? '').split(',').filter(Boolean).map(Number)
  const typeIds = ids('typeIds')
  const subTypeIds = ids('subTypeIds')
  const regionIds = ids('regionIds')
  if (regionIds.some((id) => !regions.some((r) => r.id === id))) return null
  const groupCodes = eventTypes.filter((g) => typeIds.includes(g.id as number)).map((g) => g.code)
  const subCodes = eventTypes.flatMap((g) => g.children).filter((c) => subTypeIds.includes(c.id as number)).map((c) => c.code)
  const regionNames = regions.filter((r) => regionIds.includes(r.id)).map((r) => r.name)
  return [...owlEvents]
    .filter((e) => (!groupCodes.length && !subCodes.length) || groupCodes.includes(e.disasterTypeCode[0]) || subCodes.includes(e.disasterTypeCode))
    .filter((e) => !regionNames.length || regionNames.includes(e.regionName))
    // owl-web 과 같게 — 발생 일시 최신순, 같으면 id 큰 것 먼저, limit 건 (안 주면 100)
    .sort((a, b) => b.occurDtm.localeCompare(a.occurDtm) || b.id - a.id)
    .slice(0, Math.min(Number(q.get('limit') ?? 100) || 100, 1000))
}


export const serverDevices = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, kind: i === 9 ? 'FIREWALL' : i === 10 ? 'SWITCH' : 'SERVER', code: `SV${String(i + 1).padStart(2, '0')}`,
  name: `${i + 1}번 서버`, ip: `10.10.11.${100 + i}`, rackPos: 40 - i * 3, vendor: 'DELL', model: 'PowerEdge R650',
  serialNo: `SN${1000 + i}`, supplier: null, itemNo: null, contractPrice: null, contractEnd: null, cpu: 'Xeon Silver 4310',
  ram: '64GB', storage: '2TB', nic: '1GbE x4', power: '800W x2', sizeMm: null, os: 'Rocky 9', displayYn: 'Y' as const,
  status: (i === 4 ? 'WARN' : 'NORMAL') as string, lastSeenAt: localIso(Date.now() - 30_000),
}))

export const firewallSummary = () => ({
  collectedAt: localIso(Date.now() - 30_000), uptimeDays: 128, rttMs: 2, sessionCnt: 1832, cpuPct: 12, memPct: 41,
  cpuTempC: 47, fanRpm: [5200, 5150], policyCount: 64, allowCount: 52, policyChangedAt: localIso(Date.now() - 9 * 86400_000),
  blockedLast24h: 214, alertsLast24h: 3,
})

export const firewallPorts = Array.from({ length: 8 }, (_, i) => ({
  label: `ge${i + 1}`, ifName: `port${i + 1}`, zone: i < 4 ? 'internal' : 'external', usage: null, peer: null,
  linkUp: i !== 6, speed: '1G', inBps: 1_000_000 * (i + 1), outBps: 600_000 * (i + 1),
}))

export const firewallEvents = (limit: number) =>
  Array.from({ length: limit }, (_, i) => ({
    at: localIso(Date.now() - (i + 1) * 17 * 60000), tag: 'BLOCK', body: `차단 ${i + 1}`, summary: `외부 접속 차단 (10.0.0.${i + 1})`,
  }))
