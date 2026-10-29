import { expect, test } from '@playwright/test'

// 새 화면 주소 검색 (/wall) — 가짜 서버의 /api/search 로 본다 (gis 답: juso 검색 + vWorld 좌표).
test.describe('새 화면 주소 검색', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  test('검색 → 결과 강조 → 고르면 닫히고 최근 검색어에 남는다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    const input = page.getByPlaceholder('주소 입력')
    await input.click()
    await expect(page.getByText('최근 검색어가 없습니다.')).toBeVisible()

    await input.fill('달동')
    await input.press('Enter')
    const first = page.locator('button', { hasText: '달동' }).first()
    await expect(first.locator('span.text-accent-teal').first()).toHaveText('달동')

    // 메뉴를 켜 둔 채 고르면 메뉴는 꺼진다
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await page.getByPlaceholder('주소 입력').click()
    // 다시 펼치면 지난 결과가 그대로
    await page.locator('button', { hasText: '울산' }).first().click()
    await expect(page.getByText('최근 검색어')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '레이어', exact: true })).not.toHaveAttribute('aria-pressed', 'true')

    await page.getByPlaceholder('주소 입력').click()
    // 고르고 나면 처음 상태 — 최근 검색어에 남아 있다
    await expect(page.getByRole('button', { name: '달동 삭제' })).toBeVisible()
    await page.getByRole('button', { name: '전체 삭제' }).click()
    await expect(page.getByText('최근 검색어가 없습니다.')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('검색 서버가 죽으면(502 SEARCH_UNAVAILABLE) 결과 없이, 오류 없이 / 지번 "" 은 비움', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route('**/api/search?*', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: '{"code":"SEARCH_UNAVAILABLE","message":"주소검색 서버 응답 없음"}' }))
    await page.goto('/wall')
    const input = page.getByPlaceholder('주소 입력')
    await input.click()
    await input.fill('달동')
    await input.press('Enter')
    await expect(page.locator('button', { hasText: '울산' })).toHaveCount(0)
    await page.unroute('**/api/search?*')
    const one = { id: 'road:1', title: '달동 행정복지센터', category: 'PLACE', roadAddress: '가상시설0565 달동 1', parcelAddress: '', lat: 35.54, lng: 129.33 }
    await page.route('**/api/search?*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([one]) }))
    await input.fill('달동 ')
    await input.press('Enter')
    await expect(page.locator('button', { hasText: '달동 행정복지센터' })).toBeVisible()
    expect(errors).toEqual([])
  })

  // 지도가 다 날아간 뒤의 자리 (움직이는 중이면 null)
  const camera = (page: import('@playwright/test').Page) =>
    page.evaluate(async () => {
      const { mapState } = await import('/src/app/wall/map/state.ts')
      const m = mapState.get().map
      if (!m || m.isMoving()) return null
      const c = m.getCenter()
      return { lng: c.lng, lat: c.lat, zoom: m.getZoom(), pitch: m.getPitch() }
    })

  for (const from of ['메인', '배수펌프장'] as const) {
    test(`애니메이션 9번 — ${from}에서 검색 결과를 고르면 그 자리로 날아가 확대 16`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto('/wall')
      if (from !== '메인') await page.getByRole('button', { name: from, exact: true }).click()
      const input = page.getByPlaceholder('주소 입력')
      await input.click()
      await input.fill('달동')
      await input.press('Enter')
      await page.locator('button', { hasText: '달동' }).first().click()
      await page.waitForTimeout(2500)
      await expect.poll(async () => (await camera(page))?.zoom ?? 0, { timeout: 5000 }).toBeCloseTo(16, 1)
      const c = (await camera(page))!
      expect(c.pitch).toBe(0)
      expect(errors).toEqual([])
    })
  }
})
