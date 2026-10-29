import { expect, test } from '@playwright/test'

// 새 화면 틀 (/wall) — 가짜 서버 데이터로 좌·메인·우가 다 뜨고, 메뉴·제목·CCTV 접기가 동작하는지.
test.describe('새 화면 틀 /wall', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  test('세 칸이 뜨고 오류가 없다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await expect(page.getByRole('button', { name: '재난관리 통합플랫폼' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('기상특보')).toBeVisible()
    await expect(page.getByText('위성 지도')).toBeVisible()
    await expect(page.getByText(/\/ 12 개소/)).toBeVisible() // 가짜 서버 펌프장 12곳
    await expect(page.getByText('지진가속도').last()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('메뉴를 누르면 켜지고 다시 누르면 꺼진다, 제목은 처음으로', async ({ page }) => {
    await page.goto('/wall')
    const btn = page.getByRole('button', { name: '레이어', exact: true })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: '레이어' })).toBeVisible()
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
    await btn.click()
    await page.getByRole('button', { name: '재난관리 통합플랫폼' }).click()
    await expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  test('CCTV 접기·펼치기', async ({ page }) => {
    await page.goto('/wall')
    await page.getByRole('button', { name: 'CCTV 접기' }).click()
    await expect(page.getByRole('button', { name: 'CCTV 펼치기' })).toBeVisible()
    await page.getByRole('button', { name: 'CCTV 펼치기' }).click()
    await expect(page.getByRole('button', { name: 'CCTV 접기' })).toBeVisible()
  })

  test('수정사항 2번 — 상단 특보는 네모칸 없이 큰 글씨', async ({ page }) => {
    await page.goto('/wall?previewWeatherWarning=1')
    const warn = page.locator('header').getByRole('status')
    await expect(warn).toContainText('호우주의보 발효중')
    const style = await warn.evaluate((el) => {
      const c = getComputedStyle(el)
      const t = getComputedStyle(el.querySelector('span') ?? el)
      return { border: c.borderTopWidth, bg: c.backgroundColor, font: t.fontSize }
    })
    expect(style.border).toBe('0px')
    expect(style.bg).toBe('rgba(0, 0, 0, 0)')
    expect(parseFloat(style.font)).toBeGreaterThanOrEqual(60)
  })

  test('수정사항 3번 — 시간별 날씨는 시간·날씨 열이 맞는다', async ({ page }) => {
    await page.goto('/wall')
    const times = page.getByText(/^\d{2}:00$/)
    await expect(times).toHaveCount(3)
    const xs = await times.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)))
    expect(new Set(xs).size).toBe(1)
    const sky = await times.evaluateAll((els) => els.map((el) => Math.round((el.nextElementSibling as HTMLElement).getBoundingClientRect().left)))
    expect(new Set(sky).size).toBe(1)
  })
})
