import { expect, test } from '@playwright/test'

// 새 화면 CCTV 5칸·확대 창 (/wall) — 가짜 서버의 /cctv/api/map/cctv 로 본다.
test.describe('새 화면 CCTV', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  const titles = (page: import('@playwright/test').Page) => page.locator('aside span[title]')

  test('메뉴 분류대로 5칸, 모자라면 할당된 CCTV 없음, 급경사지는 순번 없음', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await expect(titles(page)).toHaveCount(5)
    await expect(page.locator('aside [data-variant="normal"]').first()).toBeVisible()

    await page.getByRole('button', { name: '지진가속도', exact: true }).click()
    await expect(titles(page).nth(1)).toHaveText('할당된 CCTV 없음')

    await page.getByRole('button', { name: '급경사지', exact: true }).click()
    await expect(titles(page).first()).toContainText('급경사지')
    await expect(page.locator('aside [data-variant="normal"]')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('목록은 새 주소 /cctv/api/map/cctv 한 번, 메뉴는 menus 로 거른다', async ({ page }) => {
    const calls: string[] = []
    page.on('request', (r) => {
      const u = new URL(r.url()).pathname
      if (u === '/cctv/api/map/cctv' || u === '/api/cctv') calls.push(u)
    })
    await page.goto('/wall')
    await expect(titles(page).nth(1)).not.toHaveText('할당된 CCTV 없음')
    await page.getByRole('button', { name: '배수펌프장', exact: true }).click()
    await expect(titles(page).first()).toContainText('배수펌프장')
    expect(calls).toEqual(['/cctv/api/map/cctv'])
  })

  test('매일 00:30 에 목록을 다시 받는다 (그 전엔 안 받음)', async ({ page }) => {
    let calls = 0
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/cctv/api/map/cctv') calls += 1
    })
    await page.clock.install({ time: new Date('2026-10-21T00:20:00+09:00') })
    await page.goto('/wall')
    await expect(titles(page).nth(1)).not.toHaveText('할당된 CCTV 없음')
    expect(calls).toBe(1)
    await page.clock.runFor(9 * 60_000)
    expect(calls).toBe(1)
    await page.clock.runFor(2 * 60_000)
    await expect.poll(() => calls).toBe(2)
  })

  test('목록을 못 받거나 비어 있으면 5칸 모두 할당된 CCTV 없음, 오류 없이', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const [status, body] of [
      [500, '{"timestamp":"2026-10-21T00:00:00","status":500,"error":"Internal Server Error","path":"/cctv/api/map/cctv"}'],
      [200, '[]'],
    ] as const) {
      await page.unroute('**/cctv/api/map/cctv')
      await page.route('**/cctv/api/map/cctv', (r) => r.fulfill({ status, contentType: 'application/json', body }))
      const answered = page.waitForResponse('**/cctv/api/map/cctv')
      await page.goto('/wall')
      await answered
      await expect(titles(page)).toHaveCount(5)
      await expect(titles(page)).toHaveText(Array(5).fill('할당된 CCTV 없음'))
    }
    expect(errors).toEqual([])
  })

  test('30초마다 다음 5개로 순환', async ({ page }) => {
    await page.clock.install()
    await page.goto('/wall')
    await expect(titles(page)).toHaveCount(5)
    const before = await titles(page).allInnerTexts()
    await page.clock.runFor(30_000)
    await expect.poll(() => titles(page).allInnerTexts()).not.toEqual(before)
  })

  test('급경사지 계측 상세·조기경보·통계는 CCTV 칸이 없어 순환을 멈추고, 총괄·관제로 오면 처음 5개부터', async ({ page }) => {
    const shownIds = () => page.evaluate(async () => (await import('/src/app/wall/dashboard/state.ts')).cctv.get().shown.map((c) => c.cctvId).join(','))
    await page.clock.install()
    await page.goto('/wall')
    await expect(titles(page)).toHaveCount(5)
    await page.getByRole('button', { name: '급경사지', exact: true }).click()
    await page.clock.runFor(3000)
    await expect(titles(page).first()).toContainText('급경사지')
    const first = await shownIds()
    await page.clock.runFor(30_000)
    await expect.poll(shownIds).not.toEqual(first)
    const second = await shownIds()
    for (const tab of ['계측 상세', '조기경보·통계']) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      await page.clock.runFor(3000)
      expect(await shownIds()).toEqual(second)
      await page.clock.runFor(65_000)
      expect(await shownIds()).toEqual(second)
    }
    await page.getByRole('tab', { name: '총괄·관제', exact: true }).click()
    await expect.poll(shownIds).toEqual(first)
    await page.clock.runFor(30_000)
    await expect.poll(shownIds).not.toEqual(first)
  })

  test('확장 → 확대 창(순번·이름), ESC·바깥 누름으로 닫힘', async ({ page }) => {
    await page.goto('/wall')
    // 목록이 오기 전엔 '할당된 CCTV 없음' — 온 뒤의 이름으로
    await expect(titles(page).nth(1)).not.toHaveText('할당된 CCTV 없음')
    const name = await titles(page).nth(1).innerText()
    await page.getByRole('button', { name: '확장' }).nth(1).click()
    const dialog = page.getByRole('dialog', { name })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('2', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: '확장' }).first().click()
    await page.mouse.click(30, 30)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
  // 지도에서 아직 안 연 CCTV 점 하나의 화면 자리 — 영상 창·패널에 가리지 않은 것 (점은 지도 엔진이 그린다)
  const freePoint = (page: import('@playwright/test').Page, skip: readonly number[]) =>
    page.evaluate(async (skip) => {
      const { mapState } = await import('/src/app/wall/map/state.ts')
      const m = mapState.get().map
      if (!m || m.isMoving()) return null
      const canvas = m.getCanvas()
      const r = canvas.getBoundingClientRect()
      const layers = m.getLayersOrder().filter((l) => l.startsWith('cctv-') && l.endsWith('-point'))
      for (const f of m.queryRenderedFeatures({ layers })) {
        const id = Number(f.properties?.id)
        if (skip.includes(id)) continue
        const pt = m.project((f.geometry as { coordinates: [number, number] }).coordinates)
        const x = r.x + pt.x
        const y = r.y + pt.y
        if (pt.x < 100 || pt.x > 700 || pt.y < 300 || pt.y > r.height - 200) continue
        if (document.elementFromPoint(x, y) !== canvas) continue
        return { id, x, y }
      }
      return null
    }, skip)

  test('지도 CCTV 점을 누르면 영상 창, 3개까지·넘으면 안내, 닫기·초기화·메뉴 바꾸기로 닫힘 (플레이어도 같이)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    const boxes = page.locator('.cctv-player-popup-box')
    const players = boxes.locator('[id^=VIDEO_PLAYER_]')
    const opened: number[] = []
    const openOne = async () => {
      await expect.poll(async () => (await freePoint(page, opened)) !== null, { timeout: 15000 }).toBe(true)
      const p = (await freePoint(page, opened))!
      opened.push(p.id)
      await page.mouse.click(p.x, p.y)
    }
    for (let n = 1; n <= 3; n++) {
      await openOne()
      await expect(boxes).toHaveCount(n)
    }
    await expect(players).toHaveCount(3)
    await openOne()
    await expect(page.getByText('최대 3개까지 재생됩니다', { exact: false })).toBeVisible()
    await expect(boxes).toHaveCount(3)

    await boxes.first().getByRole('button', { name: '닫기' }).click()
    await expect(boxes).toHaveCount(2)
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    await expect(boxes).toHaveCount(0)
    await expect(page.locator('[id^=VIDEO_PLAYER_] video')).toHaveCount(5) // 오른쪽 5칸만 남음

    opened.length = 0
    await openOne()
    await expect(boxes).toHaveCount(1)
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(boxes).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
