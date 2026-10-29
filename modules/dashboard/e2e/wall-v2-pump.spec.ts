import { expect, test } from '@playwright/test'

// 새 화면 배수펌프장·지진가속도 지도 마커 (/wall, app/wall/map/pump·QuakeMarkers)
test.describe('새 화면 배수펌프장·지진가속도 지도 마커', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  test('배수펌프장 — 지도가 다 기울어진 뒤 마커, 구역에 올리면 그 구역 펌프장이 커진다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '배수펌프장', exact: true }).click()
    const total = ((await (await page.request.get('/api/pump/stations')).json()) as { lat: unknown }[]).filter((s) => typeof s.lat === 'number').length
    await expect(page.locator('.pump-marker')).toHaveCount(total)
    // 가상시설0523 구역 안 한 점 — 폴리곤은 지도 엔진이 그린다
    const pt = await page.evaluate(async () => {
      const { mapState } = await import('/src/app/wall/map/state.ts')
      const m = mapState.get().map!
      const r = m.getCanvas().getBoundingClientRect()
      const fill = m.getLayersOrder().find((l) => l.startsWith('pump-') && l.endsWith('-fill'))!
      for (let y = 300; y < 500; y += 6)
        for (let x = 100; x < 900; x += 6) {
          const f = m.queryRenderedFeatures([x, y], { layers: [fill] })
          if (f[0]?.properties.name === '가상시설0523') return { x: r.x + x, y: r.y + y }
        }
      return null
    })
    expect(pt).not.toBeNull()
    await page.mouse.move(pt!.x, pt!.y)
    await page.mouse.move(pt!.x + 1, pt!.y)
    await expect(page.locator('.pump-marker-emphasized').first()).toBeVisible()
    await page.mouse.move(5, 5)
    await expect(page.locator('.pump-marker-emphasized')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('지진가속도 — 계측기 자리에 이름표 달린 마커, 메뉴를 나가면 사라진다', async ({ page }) => {
    await page.goto('/wall')
    const marker = page.locator('.maplibregl-marker .marker-label-content.is-plain')
    await page.getByRole('button', { name: '지진가속도', exact: true }).click()
    await expect(marker.first()).toBeVisible()
    await page.getByRole('button', { name: '지진가속도', exact: true }).click()
    await expect(marker).toHaveCount(0)
  })
})
