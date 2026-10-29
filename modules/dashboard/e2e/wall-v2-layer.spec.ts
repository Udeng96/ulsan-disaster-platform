import { expect, test, type Page } from '@playwright/test'

// 새 화면 레이어 메뉴 (/wall) — 가짜 서버 레이어 목록으로 체크·라벨보기·검색·CCTV 행정동·색 바꾸기를 본다.
test.describe('새 화면 레이어 메뉴', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  async function open(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(page.getByLabel('배수펌프 표시')).toBeVisible({ timeout: 20_000 })
    return errors
  }
  const shown = (page: Page, name: string) => page.getByLabel(`${name} 표시`)
  const label = (page: Page, name: string) => page.getByRole('switch', { name: `${name} 라벨보기` })

  test('처음엔 CCTV 만 켜져 있고, 누르면 켜고 끈다', async ({ page }) => {
    const errors = await open(page)
    await expect(shown(page, 'CCTV')).toHaveAttribute('aria-pressed', 'true')
    await expect(shown(page, '배수펌프')).toHaveAttribute('aria-pressed', 'false')
    await shown(page, '배수펌프').click()
    await expect(shown(page, '배수펌프')).toHaveAttribute('aria-pressed', 'true')
    await shown(page, '배수펌프').click()
    await expect(shown(page, '배수펌프')).toHaveAttribute('aria-pressed', 'false')
    expect(errors).toEqual([])
  })

  test('전체선택·전체해제 (체크, 라벨보기 따로)', async ({ page }) => {
    await open(page)
    const allOn = page.getByRole('button', { name: '전체선택' }).nth(0)
    const allOff = page.getByRole('button', { name: '전체해제' }).nth(0)
    const labelsOn = page.getByRole('button', { name: '전체선택' }).nth(1)
    const labelsOff = page.getByRole('button', { name: '전체해제' }).nth(1)
    await allOn.click()
    await expect(page.locator('[aria-label$=" 표시"][aria-pressed="false"]')).toHaveCount(0)
    await allOff.click()
    await expect(page.locator('[aria-label$=" 표시"][aria-pressed="true"]')).toHaveCount(0)
    await labelsOn.click()
    await expect(page.getByRole('switch', { checked: false })).toHaveCount(0)
    await labelsOff.click()
    await expect(page.getByRole('switch', { checked: true })).toHaveCount(0)
  })

  test('라벨보기 스위치', async ({ page }) => {
    await open(page)
    await label(page, '계측기').click()
    await expect(label(page, '계측기')).toHaveAttribute('aria-checked', 'true')
    await expect(label(page, '배수펌프')).toHaveAttribute('aria-checked', 'false')
  })

  test('검색은 Enter·찾기 때만 걸리고 CCTV 는 늘 남는다', async ({ page }) => {
    await open(page)
    const box = page.getByPlaceholder('목록 입력')
    await box.fill('계 측')
    await expect(shown(page, '배수펌프')).toBeVisible() // 아직 안 걸림
    await box.press('Enter')
    await expect(shown(page, '배수펌프')).toHaveCount(0)
    await expect(shown(page, '계측기')).toBeVisible()
    await expect(shown(page, 'CCTV')).toBeVisible()
    await box.fill('')
    await page.getByRole('button', { name: '찾기' }).click()
    await expect(shown(page, '배수펌프')).toBeVisible()
  })

  test('CCTV 행정동 — 하나 끄면 CCTV 는 켜진 채, 다 끄면 CCTV 도 꺼진다', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: '펼치기' }).first().click()
    const items = page.getByRole('treeitem')
    await expect(items.first()).toBeVisible()
    const n = await items.count()
    expect(n).toBeGreaterThan(1)
    await expect(page.getByRole('treeitem', { checked: false })).toHaveCount(0)
    await items.first().click()
    await expect(items.first()).toHaveAttribute('aria-checked', 'false')
    await expect(shown(page, 'CCTV')).toHaveAttribute('aria-pressed', 'true')
    for (let i = 1; i < n; i++) await items.nth(i).click()
    await expect(shown(page, 'CCTV')).toHaveAttribute('aria-pressed', 'false')
    // CCTV 를 다시 켜면 행정동도 다 켜진다
    await shown(page, 'CCTV').click()
    await expect(page.getByRole('treeitem', { checked: false })).toHaveCount(0)
  })

  test('색 바꾸기 — 최근 색 고르고 적용하면 점 색이 바뀌고, 취소하면 그대로', async ({ page }) => {
    await open(page)
    const dot = page.getByLabel('배수펌프 색상 변경').locator('circle')
    const before = await dot.getAttribute('fill')
    await page.getByLabel('배수펌프 색상 변경').click()
    const dialog = page.getByRole('dialog', { name: '색상 변경' })
    await expect(dialog).toBeVisible()
    // 지금 색과 다른 최근 색 하나 (가짜 서버가 바꾼 색을 기억하므로)
    const labels = await dialog.getByRole('button', { name: /^최근 색상 / }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))
    const pick = labels.map((l) => l.replace('최근 색상 ', '')).find((c) => c.toLowerCase() !== before?.toLowerCase())!
    const swatch = dialog.getByRole('button', { name: `최근 색상 ${pick}` }).first()
    await swatch.click()
    await dialog.getByRole('button', { name: '취소' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(dot).toHaveAttribute('fill', before!)
    await page.getByLabel('배수펌프 색상 변경').click()
    await dialog.getByRole('button', { name: `최근 색상 ${pick}` }).first().click()
    await dialog.getByRole('button', { name: '적용' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(dot).toHaveAttribute('fill', new RegExp(pick, 'i'))
  })

  test('아래쪽 레이어도 색 창이 화면 안에 뜨고 적용 버튼을 누를 수 있다', async ({ page }) => {
    await open(page)
    const last = page.locator('[aria-label$=" 색상 변경"]').last()
    await last.click()
    const dialog = page.getByRole('dialog', { name: '색상 변경' })
    const box = (await dialog.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height)
    await dialog.getByRole('button', { name: '적용' }).click()
    await expect(dialog).toHaveCount(0)
  })
  test('토양함수계는 서버 목록에 있어도 레이어 줄에 없다 (경사계가 같이 재는 값, 사용자 10-21)', async ({ page }) => {
    await open(page)
    await expect(shown(page, '계측기')).toBeVisible()
    await expect(shown(page, '토양함수계')).toHaveCount(0)
  })

  test('API — 바꾼 색은 60초 뒤 한 번에 PUT /api/layers/colors 로 저장', async ({ page }) => {
    await page.clock.install()
    const puts: unknown[] = []
    await page.route('**/api/layers/colors', async (route) => {
      puts.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, body: '' })
    })
    await page.goto('/wall')
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await page.clock.runFor(3000)
    await expect(page.getByLabel('배수펌프 표시')).toBeVisible({ timeout: 20_000 })
    await page.getByLabel('배수펌프 색상 변경').click()
    const dialog = page.getByRole('dialog', { name: '색상 변경' })
    await dialog.getByRole('button', { name: /^최근 색상 / }).first().click()
    await dialog.getByRole('button', { name: '적용' }).click()
    expect(puts).toEqual([])
    await page.clock.runFor(60_000)
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]).toEqual([{ code: 'PUMP_STATION', color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/) }])
  })

  test('API — 목록이 실패하거나 비어도 화면은 깨지지 않는다 (CCTV 줄만 남음)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route('**/api/layers', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"INTERNAL_ERROR","message":"서버 내부 오류"}' }))
    await page.route('**/api/shelter/cooling', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route('**/api/regions', (route) => route.abort())
    await page.goto('/wall')
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(shown(page, 'CCTV')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[aria-label$=" 표시"]')).toHaveCount(1)
    await page.getByRole('button', { name: '전체선택' }).nth(0).click()
    expect(errors).toEqual([])
  })
})
