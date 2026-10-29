import { expect, test, type Page } from '@playwright/test'

// 새 화면 지진가속도 메뉴 (/wall) — 가짜 서버의 계측기 목록·실시간 SSE 로 본다.
test.describe('새 화면 지진가속도 메뉴', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  const STREAM = '**/earthquake/api/realtime/stream'

  async function open(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '지진가속도', exact: true }).click()
    return errors
  }

  test('계측기 줄이 서버 목록대로 나오고, 실시간 값이 들어온다', async ({ page }) => {
    const errors = await open(page)
    const res = await page.request.get('/earthquake/api/instruments')
    const codes = ((await res.json()) as { stationCode: string }[]).map((i) => i.stationCode)
    expect(codes.length).toBeGreaterThan(0)
    await expect(page.getByAltText('지진가속도 측정 지점')).toBeVisible()
    await expect(page.getByRole('group')).toHaveCount(codes.length)
    for (const c of codes) await expect(page.getByRole('group', { name: c })).toContainText(c)
    // 1초마다 값이 오면 '상태 확인 필요'가 사라지고 시각이 찍힌다
    await expect(page.getByText('상태 확인 필요')).toHaveCount(0, { timeout: 5000 })
    await expect(page.getByRole('group', { name: codes[0] })).toContainText(/S: \d{2}:\d{2}:\d{2} \/ D: \d{2}:\d{2}:\d{2} \/ 1 sec/)
    await expect(page.getByRole('status')).toHaveCount(0)
    // 평상시 값(진도 I) — 큰 칸 I, 막대는 I 칸만 밝게
    const row = page.getByRole('group', { name: codes[0] })
    await expect(row.locator('[aria-current="true"]')).toHaveCount(1)
    await expect(row.locator('[aria-current="true"]')).toHaveText('I')
    await expect(row.locator('.opacity-25')).toHaveCount(8)
    expect(errors).toEqual([])
  })

  test('업체 연결이 끊기면 수신 중단 배지, 값이 없으면 이름 밑에 상태 확인 필요 (가운데 글 없음)', async ({ page }) => {
    await page.route(STREAM, (r) =>
      r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'event: status\ndata: {"sourceConnected":false}\n\n' }),
    )
    await open(page)
    await expect(page.getByRole('status')).toHaveText('계측 데이터 수신 중단', { timeout: 5000 })
    const first = page.getByRole('group').first()
    await expect(first.getByText('상태 확인 필요')).toBeVisible()
    await expect(first.locator('.text-accent-red')).toHaveText('상태 확인 필요')
    await expect(page.getByText('수신 대기 중')).toHaveCount(0)
    await expect(page.getByText('상태 확인 필요')).toHaveCount(await page.getByRole('group').count())
  })

  test('실시간 연결은 대시보드가 뜰 때 한 번 — 메뉴를 여닫아도 다시 붙지 않는다', async ({ page }) => {
    let opened = 0
    page.on('request', (r) => r.url().includes('/earthquake/api/realtime/stream') && opened++)
    await page.goto('/wall')
    await expect.poll(() => opened).toBe(1)
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: '지진가속도', exact: true }).click()
      await expect(page.getByRole('group').first()).toBeVisible()
      await page.getByRole('button', { name: '레이어', exact: true }).click()
    }
    expect(opened).toBe(1)
  })

  test('API — 15초마다 오는 ping 도 상태라서, ping 의 sourceConnected false 로 수신 중단 배지', async ({ page }) => {
    await page.route(STREAM, (r) =>
      r.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'event: connect\ndata: "connected"\n\nevent: ping\ndata: {"sourceConnected":false,"lastValueAt":null,"secondsSinceLastValue":null}\n\n',
      }),
    )
    const errors = await open(page)
    await expect(page.getByRole('status')).toHaveText('계측 데이터 수신 중단', { timeout: 5000 })
    expect(errors).toEqual([])
  })

  test('API — 계측기 목록이 실패(Spring 기본 오류)하거나 비면 옛 4개 줄로, 오류 없음', async ({ page }) => {
    const spring = JSON.stringify({ timestamp: '2026-10-21T05:00:00.000+00:00', status: 500, error: 'Internal Server Error', path: '/earthquake/api/instruments' })
    await page.route('**/earthquake/api/instruments', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: spring }))
    const errors = await open(page)
    await expect(page.getByRole('group')).toHaveCount(4)
    await expect(page.getByRole('group', { name: 'US_NGG' })).toContainText('가상시설0683(3축)')
    expect(errors).toEqual([])

    await page.unroute('**/earthquake/api/instruments')
    await page.route('**/earthquake/api/instruments', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.reload()
    await page.getByRole('button', { name: '지진가속도', exact: true }).click()
    await expect(page.getByRole('group')).toHaveCount(4)
    expect(errors).toEqual([])
  })
})
