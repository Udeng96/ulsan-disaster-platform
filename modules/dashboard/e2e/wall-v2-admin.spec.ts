import { expect, test } from '@playwright/test'

// 새 화면 관리자 머리 (/wall) — 서브탭 4개·공지 줄. 본문은 디자인이 나오는 대로 (10-22)
test.describe('새 화면 관리자 머리', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  test('서브탭 4개(306 폭) · 공지 줄 · 떠나면 처음 탭으로', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '관리자', exact: true }).click()

    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveText(['서버 운영', '자산대장', '네트워크', '기타'])
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
    // 탭 하나 306 (화면은 1920 기준 크기를 통째로 늘리므로 offsetWidth 는 그대로)
    const w = await tabs.nth(0).evaluate((el) => (el as HTMLElement).offsetWidth)
    expect(w).toBe(306)

    await expect(page.getByText('서버실 랙')).toBeVisible()
    for (const t of ['정상 10', '주의 3', '장애 0']) await expect(page.getByText(t, { exact: true })).toBeVisible()

    await tabs.nth(1).click()
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false')

    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(page.getByText('서버실 랙')).toHaveCount(0)
    await page.getByRole('button', { name: '관리자', exact: true }).click()
    await expect(page.getByRole('tab').nth(0)).toHaveAttribute('aria-selected', 'true')
    expect(errors).toEqual([])
  })
})
