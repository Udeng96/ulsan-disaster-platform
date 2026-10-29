import { expect, test, type Page } from '@playwright/test'

// 새 화면 이벤트(부엉이) 패널 (/wall) — 가짜 서버의 행정동·이벤트 종류·이벤트로 본다.
test.describe('새 화면 이벤트 패널', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  type Ev = { id: number; occurDtm: string; regionName: string; disasterTypeName: string }

  async function open(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '이벤트', exact: true }).click()
    return errors
  }
  const rows = (page: Page) => page.getByLabel('이벤트 목록').locator(':scope > div')

  test('열면 최신 이벤트 목록(오늘 것만 아님, 최대 100건), 닫으면 숨고 고른 이벤트가 풀린다', async ({ page }) => {
    const asked = page.waitForRequest((r) => new URL(r.url()).pathname === '/owl/events')
    const errors = await open(page)
    expect(new URL((await asked).url()).searchParams.get('limit')).toBe('100')
    const all = (await (await page.request.get('/owl/events')).json()) as Ev[]
    const n = all.length
    expect(all.some((e) => new Date(e.occurDtm).toDateString() !== new Date().toDateString())).toBe(true)
    await expect(page.getByText(`[${n}건]`)).toBeVisible()
    await expect(rows(page)).toHaveCount(n || 1)
    await expect(page.getByText('#지역 전체')).toBeVisible()
    await expect(page.getByText('#이벤트 전체')).toBeVisible()

    if (n) {
      await rows(page).first().click()
      await expect(rows(page).first()).toHaveAttribute('aria-current', 'true')
      await rows(page).first().getByRole('button', { name: '펼쳐보기' }).click()
      await expect(rows(page).first().getByText('상세 내용')).toBeVisible()
    }
    await page.getByRole('button', { name: '이벤트 패널 닫기' }).click()
    await expect(page.getByRole('button', { name: '이벤트', exact: true })).toBeVisible()
    await expect(page.getByText('이벤트 검색 조건 설정')).toBeHidden()
    expect(errors).toEqual([])
  })

  test('조건 — 다 풀면 조회 대신 알림, 하나 고르면 토큰 + 그 지역으로 조회, ✕ 로 해제', async ({ page }) => {
    await open(page)
    const regions = (await (await page.request.get('/api/regions')).json()) as { id: number; name: string }[]
    await page.getByRole('button', { name: '발생 지역 dropdown' }).click()
    await page.getByRole('treeitem', { name: '전체' }).click()
    await expect(page.getByRole('button', { name: /전체 해제/ })).toBeDisabled()
    await page.getByRole('button', { name: '완료' }).click()
    await expect(page.getByText('지역을 선택해주세요')).toBeVisible()
    await page.getByRole('button', { name: '조회', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('지역 조건을 선택해주세요')

    await page.getByRole('button', { name: '발생 지역 dropdown' }).click()
    await page.getByRole('treeitem', { name: regions[1].name, exact: true }).click()
    await page.getByRole('button', { name: '완료' }).click()
    const req = page.waitForRequest((r) => r.url().includes('/owl/events?'))
    await page.getByRole('button', { name: '조회', exact: true }).click()
    expect(new URL((await req).url()).searchParams.get('regionIds')).toBe(String(regions[1].id))

    await page.getByRole('button', { name: `#${regions[1].name} 삭제` }).click()
    await expect(page.getByText('지역을 선택해주세요')).toBeVisible()
  })

  test('실시간으로 온 이벤트는 맨 위에 빨간 테두리, 누르면 풀린다', async ({ page }) => {
    const occur = new Date(Date.now() - 60_000)
    const local = new Date(occur.getTime() - occur.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
    const ev = { id: 999999, msgId: 'LIVE', disasterTypeCode: '601', disasterTypeName: '실시간화재', title: '실시간', occurDtm: local, sendDtm: local, endStatus: null, regionCode: '', regionName: '가상시설0565 달동 1', addr: null, roadAddr: null, lat: 35.53, lng: 129.31 }
    // 처음 연결에만 이벤트 하나 (끊기면 다시 붙으므로 그 뒤엔 빈 응답)
    let sent = false
    await page.route('**/owl/events/stream', (r) => {
      const body = sent ? 'event: ping\ndata: {}\n\n' : `event: owl-message\ndata: ${JSON.stringify(ev)}\n\n`
      sent = true
      return r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body })
    })
    await open(page)
    const first = rows(page).first()
    await expect(first).toContainText('실시간화재')
    await expect(first).toHaveCSS('border-top-color', 'rgb(255, 66, 69)')
    await first.click()
    await expect(first).toHaveCSS('border-top-color', 'rgb(66, 184, 255)')
  })

  test('수정사항 16번 — 조건이 걸린 칸에만 휴지통, 누르면 그 칸만 전체로', async ({ page }) => {
    await open(page)
    const regions = (await (await page.request.get('/api/regions')).json()) as { id: number; name: string }[]
    await expect(page.getByText('#지역 전체')).toBeVisible()
    await expect(page.getByRole('button', { name: '발생 지역 전체로' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '이벤트 유형 전체로' })).toHaveCount(0)

    await page.getByRole('button', { name: '발생 지역 dropdown' }).click()
    await page.getByRole('treeitem', { name: regions[0].name, exact: true }).click()
    await page.getByRole('button', { name: '완료' }).click()
    await page.getByRole('button', { name: '이벤트 유형 dropdown' }).click()
    await page.getByRole('treeitem', { name: '전체' }).click()
    await page.getByRole('button', { name: '완료' }).click()
    await expect(page.getByText('이벤트 유형을 선택해주세요')).toBeVisible()

    await page.getByRole('button', { name: '발생 지역 전체로' }).click()
    await expect(page.getByText('#지역 전체')).toBeVisible()
    await expect(page.getByRole('button', { name: '발생 지역 전체로' })).toHaveCount(0)
    // 다른 칸은 그대로
    await expect(page.getByText('이벤트 유형을 선택해주세요')).toBeVisible()
    await page.getByRole('button', { name: '이벤트 유형 전체로' }).click()
    await expect(page.getByText('#이벤트 전체')).toBeVisible()
  })
  test('수정사항 8번 — 고른 이벤트의 투망종료를 누르면 지도 표시와 이벤트 창이 같이 닫힌다', async ({ page }) => {
    const errors = await open(page)
    await rows(page).first().click()
    const end = page.getByRole('button', { name: '투망종료' })
    await expect(end).toBeVisible()
    await end.click()
    await expect(end).toHaveCount(0)
    await expect(page.getByText('이벤트 검색 조건 설정')).toBeHidden()
    await expect(page.getByRole('button', { name: '이벤트', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })
  test('애니메이션 9번 — 이벤트를 고르면 그 자리로 날아가 확대 16, 왼쪽 창이 열려 있으면 그만큼 비켜서', async ({ page }) => {
    const errors = await open(page)
    await rows(page).first().click()
    await page.waitForTimeout(1200)
    const where = () =>
      page.evaluate(async () => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const { dash } = await import('/src/app/wall/dashboard/state.ts')
        const m = mapState.get().map
        const e = dash.get().activeEvent
        if (!m || !e || m.isMoving()) return null
        const pt = m.project([e.lng, e.lat])
        return { zoom: m.getZoom(), dx: pt.x - m.getCanvas().clientWidth / 2 }
      })
    await expect.poll(async () => (await where())?.zoom ?? 0, { timeout: 5000 }).toBeCloseTo(16, 1)
    expect(Math.round((await where())!.dx)).toBe(260)
    expect(errors).toEqual([])
  })

  test('실시간 연결이 끊겼다 다시 붙으면 목록을 다시 받는다 (같은 조건)', async ({ page }) => {
    // 다시 붙었다는 로그 뒤에 목록 요청이 오는지 (개발 모드는 처음 연결·조회를 두 번 해서 횟수로는 못 본다)
    const log: string[] = []
    page.on('console', (m) => m.text().includes('다시 연결됨') && log.push('reconnect'))
    page.on('request', (r) => new URL(r.url()).pathname === '/owl/events' && log.push(`list ${new URL(r.url()).search}`))
    // 첫 연결들은 바로 끝내서 끊긴 것처럼 — 브라우저가 다시 붙는다
    let streams = 0
    await page.route('**/owl/events/stream', (r) =>
      ++streams <= 2 ? r.fulfill({ status: 200, contentType: 'text/event-stream', body: 'retry: 200\nevent: connect\ndata: "connected"\n\n' }) : r.continue(),
    )
    const errors = await open(page)
    await expect.poll(() => log.indexOf('reconnect')).toBeGreaterThan(-1)
    await expect.poll(() => log.slice(log.indexOf('reconnect')).some((l) => l === 'list ?limit=100')).toBe(true)
    expect(errors).toEqual([])
  })

  test('비어(null) 온 값 — 유형·지역·시각 칸은 비우고, 좌표 없는 이벤트는 핀 없이 고르기만', async ({ page }) => {
    const blank = { id: 1, msgId: 'M1', disasterTypeCode: null, disasterTypeName: null, title: null, occurDtm: null, sendDtm: null, endStatus: null, regionName: null, addr: null, roadAddr: null, lat: null, lng: null, summary: null }
    await page.route('**/owl/events?*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([blank]) }))
    const errors = await open(page)
    await expect(page.getByText('[1건]')).toBeVisible()
    await rows(page).first().click()
    await expect(rows(page).first()).toHaveAttribute('aria-current', 'true')
    await rows(page).first().getByRole('button', { name: '펼쳐보기' }).click()
    await expect(rows(page).first().getByText('상세 내용이 없습니다.')).toBeVisible()
    await expect(page.getByRole('button', { name: '투망종료' })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('목록을 못 받으면(Spring 기본 오류) 빈 목록, 오류 없이', async ({ page }) => {
    await page.route('**/owl/events?*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"timestamp":"2026-10-22T09:00:00","status":500,"error":"Internal Server Error","path":"/owl/events"}' }))
    const errors = await open(page)
    await expect(page.getByText('[0건]')).toBeVisible()
    expect(errors).toEqual([])
  })
})
