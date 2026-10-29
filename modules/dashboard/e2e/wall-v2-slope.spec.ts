import { expect, test, type Page } from '@playwright/test'

// 새 화면 급경사지 메뉴 (/wall) — 가짜 서버 데이터로 세 서브탭(총괄·관제 / 계측 상세 / 조기경보·통계)을 본다.
test.describe('새 화면 급경사지 메뉴', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  async function open(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '급경사지', exact: true }).click()
    await expect(page.getByRole('tab', { name: '총괄·관제' })).toHaveAttribute('aria-selected', 'true')
    return errors
  }
  const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
  const rows = (page: Page) => page.getByRole('table', { name: '급경사지 목록' }).getByRole('row')

  test('총괄·관제 — 요약 바와 목록 개수가 맞고 오류가 없다', async ({ page }) => {
    const errors = await open(page)
    const total = await page.getByText(/^총 \d+ 개소$/).textContent()
    const n = Number(total!.match(/\d+/)![0])
    expect(n).toBeGreaterThan(0)
    await expect(page.getByText(`전체등급 ${n}개소 표시 중`)).toBeVisible()
    await expect(rows(page)).toHaveCount(n)
    expect(errors).toEqual([])
  })

  test('총괄·관제 — 검색은 Enter 때만, 등급 고르기, 줄 고르기·다시 눌러 해제', async ({ page }) => {
    await open(page)
    const first = rows(page).first()
    const name = (await first.locator('span').first().textContent())!
    const box = page.getByPlaceholder('급경사지 검색')
    await box.fill(name)
    const before = await rows(page).count()
    await expect(rows(page)).toHaveCount(before) // 아직 안 걸림
    await box.press('Enter')
    await expect(rows(page).first()).toContainText(name)
    expect(await rows(page).count()).toBeLessThanOrEqual(before)
    await box.fill('')
    await page.getByRole('button', { name: '찾기' }).click()
    await expect(rows(page)).toHaveCount(before)

    await page.getByRole('button', { name: '등급 고르기' }).click()
    await page.getByRole('option', { name: 'E', exact: true }).click()
    await expect(page.getByText(/^E등급 \d+개소 표시 중$/)).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(0)
    await page.getByRole('button', { name: '등급 고르기' }).click()
    await page.getByRole('option', { name: '전체', exact: true }).click()

    await first.click()
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await first.click()
    await expect(first).toHaveAttribute('aria-selected', 'false')
  })

  test('지역 탭 — 누르면 켜지고 다시 누르면 꺼진다', async ({ page }) => {
    await open(page)
    const area = page.getByRole('button', { name: /^가상시설0680/ })
    await area.click()
    await expect(area).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /^가상시설0432/ }).click()
    await expect(area).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: /^가상시설0432/ }).click()
    await expect(page.getByRole('button', { name: /^가상시설0432/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('계측 상세 — 첫 줄이 골라져 차트에 나오고, 다른 줄·다른 센서·기간을 고를 수 있다', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    await expect(chart).toContainText('가상시설0680 · 강우량')
    await expect(page.getByRole('button', { name: /^강우량/ }).first()).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: /^낙석검지-1/ }).first().click()
    await expect(chart).toContainText('가상시설0680 · 낙석검지-1')

    // 경사·함수 줄 — 차트는 그 지역 센서 전체, 제목을 눌러 센서 하나를 고른다 (수정 14)
    const row = page.getByRole('button', { name: /^경사·함수-\d+/ }).first()
    const area = (await row.locator('xpath=ancestor::div[.//div[contains(@class,"text-[18px]")]][1]').locator('div.text-\\[18px\\]').first().textContent())!
    await row.click()
    await expect(chart).toContainText(`${area} · 경사·함수 전체`)
    await chart.getByRole('button', { name: '센서 고르기' }).click()
    const other = page.getByRole('option').nth(2)
    const name = (await other.textContent())!.trim()
    await other.click()
    await expect(chart).toContainText(`${area} · ${name}`)
    await expect(page.getByRole('option')).toHaveCount(0)

    await tab(page, '일').click()
    await expect(tab(page, '일')).toHaveAttribute('aria-selected', 'true')
    // 다른 센서를 고르면 기간은 실시간으로
    await page.getByRole('button', { name: /^강우량/ }).first().click()
    await expect(tab(page, '실시간')).toHaveAttribute('aria-selected', 'true')
    expect(errors).toEqual([])
  })

  test('조기경보·통계 — 발령 필요·이력, 기간 바꾸기, 기간설정 달력', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '조기경보·통계').click()
    await expect(page.getByRole('region', { name: '발령 필요' })).toContainText(/\d+건/)
    await expect(page.getByRole('region', { name: '발령 이력' })).toContainText(/총 \d+건/)
    await expect(page.getByRole('region', { name: '기간 내 발령' })).toContainText(/발령 \d+건\/해제 \d+건/)

    await tab(page, '7일').click()
    await expect(tab(page, '7일')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('dialog', { name: '기간 고르기' })).toHaveCount(0)

    await tab(page, '기간설정').click()
    const picker = page.getByRole('dialog', { name: '기간 고르기' })
    await expect(picker).toBeVisible()
    await expect(page.getByText('기간을 선택하세요')).toBeVisible()
    const days = picker.locator('button:not([disabled])').filter({ hasText: /^\d+$/ })
    await days.nth(0).click()
    await days.nth(2).click()
    await expect(page.getByRole('region', { name: '기간 내 발령' })).toContainText(/\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}/)
    // 바깥을 누르면 닫힘
    await page.getByText('월별 추이').click()
    await expect(picker).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('메뉴를 벗어났다 오면 총괄·관제부터', async ({ page }) => {
    await open(page)
    await tab(page, '조기경보·통계').click()
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(tab(page, '총괄·관제')).toHaveCount(0)
    await page.getByRole('button', { name: '급경사지', exact: true }).click()
    await expect(tab(page, '총괄·관제')).toHaveAttribute('aria-selected', 'true')
  })

  test('수정사항 9번 — 급경사지는 위성 지도가 기본, 다른 메뉴로 가면 일반', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('button', { name: '위성', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    await expect(page.getByRole('button', { name: '일반', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('수정사항 11번 — 조건 초기화는 걸린 조건이 있을 때만, 누르면 검색어·등급이 처음으로', async ({ page }) => {
    await open(page)
    const reset = page.getByRole('button', { name: '조건 초기화' })
    await expect(reset).toBeDisabled()
    const all = await rows(page).count()
    await page.getByPlaceholder('급경사지 검색').fill('없는이름')
    await page.getByPlaceholder('급경사지 검색').press('Enter')
    await page.getByRole('button', { name: '등급 고르기' }).click()
    await page.getByRole('option', { name: 'E', exact: true }).click()
    await expect(rows(page)).toHaveCount(0)
    await reset.click()
    await expect(page.getByPlaceholder('급경사지 검색')).toHaveValue('')
    await expect(page.getByText(`전체등급 ${all}개소 표시 중`)).toBeVisible()
    await expect(reset).toBeDisabled()
  })

  test('수정사항 13번 — 차트의 센서 목록은 전체 다음 위험한 순 (같은 단계는 번호 순), 왼쪽 줄은 맨 위 센서', async ({ page }) => {
    await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    // 점 색 → 단계 (colors.ts RISK_FILL)
    const RANK: Record<string, number> = { 'fill-accent-red': 4, 'fill-accent-orange': 3, 'fill-accent-yellow': 2, 'fill-accent-teal': 1, 'fill-accent-green': 0 }
    const multi = page.getByRole('button', { name: /^(경사(·함수)?|낙석검지)-\d+/ })
    const n = await multi.count()
    expect(n).toBeGreaterThan(0)
    let checked = 0
    for (let i = 0; i < n; i++) {
      const row = multi.nth(i)
      const label = (await row.locator('span').first().textContent())!.trim()
      const area = (await row.locator('xpath=ancestor::div[.//div[contains(@class,"text-[18px]")]][1]').locator('div.text-\\[18px\\]').first().textContent())!
      await row.click()
      // 새 차트가 올 때까지는 옛 제목이 남는다 — 이 줄의 제목(전체 또는 그 센서)이 될 때까지
      const kind = label.replace(/-\d+$/, '')
      await expect(chart).toContainText(new RegExp(`${area} · (${kind} 전체|${label})`))
      const picker = chart.getByRole('button', { name: '센서 고르기' })
      // 센서가 하나뿐인 줄은 고르기가 없다
      if ((await picker.count()) === 0) continue
      await picker.click()
      const list = await page.getByRole('option').evaluateAll((els) => els.map((el) => ({ name: el.textContent!.trim(), fill: el.querySelector('circle')?.getAttribute('class') ?? '' })))
      expect(list[0].name).toBe('전체')
      expect(list[1].name).toBe(label)
      for (let k = 2; k < list.length; k++) {
        const [a, b] = [RANK[list[k - 1].fill], RANK[list[k].fill]]
        expect(a).toBeGreaterThanOrEqual(b)
        if (a === b) expect(Number(list[k - 1].name.split('-').at(-1))).toBeLessThan(Number(list[k].name.split('-').at(-1)))
      }
      await picker.click()
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  test('수정사항 14번 — 여러 센서 줄은 전체 차트(아래 5칸 없음·정보 창 없음·X/Y), 하나를 고르면 그 센서 차트·정보 창', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    // 첫 줄(강우량)은 센서 하나 — 고르기 없음, 정보 창
    await expect(page.getByLabel('가상시설0680 · 강우량 계측기 정보')).toBeVisible({ timeout: 10000 })
    await expect(chart.getByRole('button', { name: '센서 고르기' })).toHaveCount(0)
    const slots = chart.locator('span', { hasText: /^\d\d:\d\d$/ })
    await expect(slots).toHaveCount(5)

    // 가상시설0680 경사 — 전체, 정보 창 닫힘, 아래 5칸 없음, X/Y 버튼
    await page.getByRole('button', { name: /^경사-\d+/ }).first().click()
    await expect(chart).toContainText('가상시설0680 · 경사 전체')
    await expect(page.getByLabel(/계측기 정보$/)).toHaveCount(0)
    await expect(slots).toHaveCount(0)
    const axes = chart.getByRole('tablist', { name: '경사 축' })
    await expect(axes.getByRole('tab', { name: 'X축' })).toHaveAttribute('aria-selected', 'true')
    await axes.getByRole('tab', { name: 'Y축' }).click()
    await expect(axes.getByRole('tab', { name: 'Y축' })).toHaveAttribute('aria-selected', 'true')

    // 센서 하나 — 제목이 그 센서, X/Y 버튼 없음, 아래 5칸, 지도 정보 창
    await chart.getByRole('button', { name: '센서 고르기' }).click()
    const name = (await page.getByRole('option').nth(1).textContent())!.trim()
    await page.getByRole('option').nth(1).click()
    await expect(chart).toContainText(`가상시설0680 · ${name}`)
    await expect(axes).toHaveCount(0)
    await expect(slots).toHaveCount(5)
    await expect(page.getByLabel(`가상시설0680 · ${name} 계측기 정보`)).toBeVisible({ timeout: 10000 })

    // 다시 전체
    await chart.getByRole('button', { name: '센서 고르기' }).click()
    await page.getByRole('option', { name: '전체' }).click()
    await expect(chart).toContainText('가상시설0680 · 경사 전체')
    await expect(page.getByLabel(/계측기 정보$/)).toHaveCount(0)

    // 경사·함수 센서 하나 — 함수비 관측항목도 받는다
    await page.getByRole('button', { name: /^경사·함수-\d+/ }).first().click()
    await chart.getByRole('button', { name: '센서 고르기' }).click()
    const reqs: string[] = []
    page.on('request', (r) => r.url().includes('/chart?') && reqs.push(r.url()))
    await page.getByRole('option').nth(1).click()
    await expect.poll(() => reqs.length).toBe(2)
    expect(errors).toEqual([])
  })

  test('수정사항 15번 — 계측 차트 기간설정: 달력으로 고르면 그 기간 칸으로', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    await tab(page, '기간설정').click()
    await expect(tab(page, '기간설정')).toHaveAttribute('aria-selected', 'true')
    await expect(chart.getByText('기간을 선택하세요')).toBeVisible()
    const picker = page.getByRole('dialog', { name: '기간 고르기' })
    const req = page.waitForRequest((r) => /\/chart\?range=\w+&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/.test(r.url()))
    const days = picker.locator('button:not([disabled])').filter({ hasText: /^\d+$/ })
    await days.nth(0).click()
    await days.nth(1).click()
    await req
    await expect(chart.getByText('기간을 선택하세요')).toHaveCount(0)
    // 실시간으로 돌아가면 달력 닫힘
    await tab(page, '실시간').click()
    await expect(picker).toHaveCount(0)
    expect(errors).toEqual([])
  })
  test('수정사항 12번 — 총괄·관제 지도에서 관리지역 점을 누르면 목록 줄을 누른 것처럼 줄이 골라지고 정보 창', async ({ page }) => {
    const errors = await open(page)
    // 등급 글자가 든 점(관리지역) 하나의 화면 자리 — 시설 점은 지도 엔진이 그린다 (app/wall/map/points)
    const dot = () =>
      page.evaluate(async () => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const m = mapState.get().map
        if (!m) return null
        const layers = m.getLayersOrder().filter((l) => l.startsWith('pt-') && l.endsWith('-dot'))
        const r = m.getCanvas().getBoundingClientRect()
        const f = m.queryRenderedFeatures({ layers }).find((x) => {
          if (!x.properties?.innerImg) return false
          const pt = m.project((x.geometry as { coordinates: [number, number] }).coordinates)
          return pt.x > 100 && pt.x < 900 && pt.y > 300 && pt.y < r.height - 300
        })
        if (!f) return null
        const pt = m.project((f.geometry as { coordinates: [number, number] }).coordinates)
        return { name: String(f.properties.name), x: r.x + pt.x, y: r.y + pt.y }
      })
    await expect.poll(async () => (await dot()) !== null, { timeout: 15000 }).toBe(true)
    const d = (await dot())!
    await page.mouse.click(d.x, d.y)
    await expect(rows(page).filter({ hasText: d.name }).first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('관리번호', { exact: false }).first()).toBeVisible()
    expect(errors).toEqual([])
  })
  test('수정사항 12번 — 계측 상세 지도에서 계측기 점을 누르면 센서 목록에서 그 계측기가 골라진다', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    await expect(chart).toContainText('가상시설0680 · 강우량')
    // 정보 창·물방울에 가리지 않은 계측기 점 (강우량이 아닌 것) — 점은 지도 엔진이 그린다
    const areas = (await (await page.request.get('/slope/api/areas')).json()) as { instruments: { id: number; category: string }[] }[]
    const rain = areas.flatMap((a) => a.instruments).filter((i) => i.category === 'RAIN_GAUGE').map((i) => i.id)
    const dot = () =>
      page.evaluate(async (rain) => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const m = mapState.get().map
        if (!m) return null
        const layers = m.getLayersOrder().filter((l) => l.startsWith('pt-') && l.endsWith('-dot'))
        const r = m.getCanvas().getBoundingClientRect()
        for (const f of m.queryRenderedFeatures({ layers })) {
          const pt = m.project((f.geometry as { coordinates: [number, number] }).coordinates)
          const x = r.x + pt.x
          const y = r.y + pt.y
          // 위에 아무것도 없고 그 자리 맨 위 점이 이것
          if (document.elementFromPoint(x, y) !== m.getCanvas()) continue
          const top = m.queryRenderedFeatures([pt.x, pt.y], { layers })[0]
          if (top?.id === f.id && /^수집/.test(String(f.properties.name)) && !rain.includes(Number(f.id))) return { x, y }
        }
        return null
      }, rain)
    await expect.poll(async () => (await dot()) !== null, { timeout: 15000 }).toBe(true)
    const d = (await dot())!
    await page.mouse.click(d.x, d.y)
    // 차트가 그 계측기로 바뀌고, 그 줄이 골라진다
    await expect(chart).not.toContainText('가상시설0680 · 강우량')
    // 차트는 누른 그 계측기 하나 (왼쪽 줄은 그 종류의 가장 위험한 센서를 보여 주므로 종류만 맞춘다)
    const title = (await chart.textContent())!
    const kind = title.match(/· (강우량|경사(?:·함수)?|낙석검지)(?:-\d+)?/)![1]
    expect(title).not.toContain('전체')
    await expect(page.locator('[aria-pressed="true"]').filter({ hasText: new RegExp(`^${kind}`) })).toHaveCount(1)
    expect(errors).toEqual([])
  })
  test('계측 상세 — 고른 계측기 정보 창은 지도가 다 날아간 뒤 뜨고, 닫으면 창만 닫히고 다시 고르면 다시 뜬다', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '계측 상세').click()
    const chart = page.getByRole('region', { name: '계측 차트' })
    const info = (title: string) => page.getByLabel(`${title} 계측기 정보`)
    await expect(info('가상시설0680 · 강우량')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '계측기 정보 닫기' }).click()
    await expect(info('가상시설0680 · 강우량')).toHaveCount(0)
    await expect(chart).toContainText('가상시설0680 · 강우량')
    await page.getByRole('button', { name: /^낙석검지-1/ }).first().click()
    await expect(info('가상시설0680 · 낙석검지-1')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: '계측기 정보 닫기' })).toHaveCount(1)
    expect(errors).toEqual([])
  })
  test('총괄·관제 — 줄을 고르면 지도가 다 날아간 뒤 관리지역 정보 창, 닫으면 고른 것도 풀린다', async ({ page }) => {
    const errors = await open(page)
    const first = rows(page).first()
    const name = (await first.locator('span').first().textContent())!.trim()
    await first.click()
    const info = page.getByLabel(`${name} 급경사지 정보`)
    await expect(info).toBeVisible({ timeout: 10000 })
    await expect(info).toContainText('관리번호')
    await page.getByRole('button', { name: '급경사지 정보 닫기' }).click()
    await expect(info).toHaveCount(0)
    await expect(first).toHaveAttribute('aria-selected', 'false')
    expect(errors).toEqual([])
  })
  test('애니메이션 9번 — 목록 줄을 고르면 그 자리로 날아가 확대 17, 지역 탭은 14.9', async ({ page }) => {
    const errors = await open(page)
    const camera = () =>
      page.evaluate(async () => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const m = mapState.get().map
        return !m || m.isMoving() ? null : m.getZoom()
      })
    await rows(page).first().click()
    await page.waitForTimeout(1500)
    await expect.poll(async () => (await camera()) ?? 0, { timeout: 5000 }).toBeCloseTo(17, 1)
    await page.getByRole('button', { name: /^가상시설0680/ }).click()
    await page.waitForTimeout(1500)
    await expect.poll(async () => (await camera()) ?? 0, { timeout: 5000 }).toBeCloseTo(14.9, 1)
    expect(errors).toEqual([])
  })

  test('API — 발령 필요는 해제 필요를 빼고, 이력은 마우스를 올리면 원인 계측기·끝나지 않은 구간은 진행 중', async ({ page }) => {
    const errors = await open(page)
    await tab(page, '조기경보·통계').click()
    const pending = page.getByRole('region', { name: '발령 필요' })
    // 가짜 서버: 발령 필요 2건(가상시설0432·가상시설0680) + 해제 필요 1건(가상시설0553)
    await expect(pending).toContainText('2건')
    await expect(pending).toContainText('삼익_수집2_경사_함수-3')
    await expect(pending).not.toContainText('가상시설0553')
    const history = page.getByRole('region', { name: '발령 이력' })
    const first = history.locator('[title]').first()
    await expect(first).toHaveAttribute('title', /_수집\d_경사-\d/)
    await expect(first).toContainText('진행 중')
    await expect(history.getByText('진행 중')).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test('API — 지구 단계가 장애면 회색 배지에 장애, 모르는 코드는 -', async ({ page }) => {
    await page.route('**/slope/api/areas/summary', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: '가상시설0432', grade: null, level: '장애', lastMeasuredAt: null },
          { id: 2, name: '가상시설0553', grade: null, level: 'NEWCODE', lastMeasuredAt: null },
          { id: 3, name: '가상시설0680', grade: null, level: '주의', lastMeasuredAt: null },
        ]),
      }),
    )
    await open(page)
    await expect(page.getByRole('button', { name: /^가상시설0432/ })).toHaveText('가상시설0432장애')
    await expect(page.getByRole('button', { name: /^가상시설0432/ }).locator('.bg-neutral-300')).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^가상시설0553/ })).toHaveText('가상시설0553-')
    await expect(page.getByRole('button', { name: /^가상시설0680/ })).toHaveText('가상시설0680주의')
  })

  test('API — 서버가 실패하면(Spring 기본 오류) 빈 화면으로 두고 오류가 없다', async ({ page }) => {
    const spring = JSON.stringify({ timestamp: '2026-10-21T05:00:00.000+00:00', status: 500, error: 'Internal Server Error', path: '/slope/api' })
    await page.route('**/slope/api/**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: spring }))
    const errors = await open(page)
    await expect(page.getByText('총 0 개소')).toBeVisible()
    await expect(rows(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^가상시설0432/ })).toHaveText('가상시설0432정상')
    await tab(page, '계측 상세').click()
    await tab(page, '조기경보·통계').click()
    await expect(page.getByText('발령이 필요한 지역이 없습니다')).toBeVisible()
    await expect(page.getByText('발령 이력이 없습니다')).toBeVisible()
    await expect(page.getByRole('region', { name: '기간 내 발령' })).toContainText('발령 0건/해제 0건')
    expect(errors).toEqual([])
  })

  test('API — 빈 목록이면 빈 화면 글', async ({ page }) => {
    for (const path of ['managed-areas', 'areas', 'areas/summary', 'alarms/pending', 'alarms/history', 'alarms/map'])
      await page.route(`**/slope/api/${path}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.route('**/slope/api/alarms/stats?*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ issued: 0, released: 0, byLevel: {}, needed: 0, neededByLevel: {}, monthly: [] }) }),
    )
    const errors = await open(page)
    await expect(page.getByText('총 0 개소')).toBeVisible()
    await tab(page, '조기경보·통계').click()
    await expect(page.getByText('발령이 필요한 지역이 없습니다')).toBeVisible()
    await expect(page.getByText('발령 이력이 없습니다')).toBeVisible()
    expect(errors).toEqual([])
  })
})
