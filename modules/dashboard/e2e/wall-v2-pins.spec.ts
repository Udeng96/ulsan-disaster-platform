import { expect, test } from '@playwright/test'

// 새 화면 투망 핀 (/wall) — 검색 핀(파랑)과 구별되는 연분홍 (사용자 10-20).
test.describe('새 화면 투망 핀', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  test('투망을 켜고 지도를 누르면 연분홍 핀 하나, 초기화하면 사라진다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    const canvas = page.locator('.maplibregl-canvas').first()
    await expect(canvas).toBeVisible()
    await page.getByRole('button', { name: '투망', exact: true }).click()
    const box = (await canvas.boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const pink = page.locator('.maplibregl-marker stop[stop-color="#FF8FE0"]')
    await expect(pink).toHaveCount(1)
    await expect(page.locator('.maplibregl-marker stop[stop-color="#42B8FF"]')).toHaveCount(0)
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    await expect(pink).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
