import { expect, test, type Page } from '@playwright/test'

// 새 화면 재난 예·경보 메뉴 (/wall) — 가짜 서버의 방송장비·전광판·템플릿·권한으로 본다.
test.describe('새 화면 재난 예·경보 메뉴', () => {
  test.skip(({ viewport }) => viewport?.width !== 2880, 'wall 프로젝트에서만')

  async function open(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/wall')
    await page.getByRole('button', { name: '재난 예·경보', exact: true }).click()
    return errors
  }
  const send = (page: Page) => page.getByRole('button', { name: /^(권한 확인|송출)$/ }).last()

  // ── 목록은 새 주소에서 (7-재난예경보-답-broadcast.md·-답-gis.md, 10-22) ──
  const LISTS = {
    terminals: '**/bcast/api/broadcast/terminals',
    signboards: '**/bcast/api/broadcast/signboards',
    templates: '**/bcast/api/broadcast/templates',
    roles: '**/api/oms/roles-departments',
  } as const
  async function fake(page: Page, bodies: Partial<Record<keyof typeof LISTS, { status: number; body: unknown }>>) {
    for (const [k, v] of Object.entries(bodies)) await page.route(LISTS[k as keyof typeof LISTS], (r) => r.fulfill({ status: v.status, contentType: 'application/json', body: JSON.stringify(v.body) }))
  }
  const voiceDots = (page: Page) =>
    page.evaluate(async () => {
      const { mapState } = await import('/src/app/wall/map/state.ts')
      const m = mapState.get().map
      if (!m) return -1
      const layers = m.getLayersOrder().filter((l) => l.startsWith('pt-') && l.endsWith('-dot'))
      return m.queryRenderedFeatures({ layers }).length
    })

  test('목록 — broadcast·gis 새 주소에서 받고, 빠진 필드(좌표·행정동·host)도 견딘다', async ({ page }) => {
    const old: string[] = []
    page.on('request', (r) => {
      const u = new URL(r.url()).pathname
      if (/^\/api\/(broadcast\/(terminals|templates)|signboard\/boards)/.test(u)) old.push(u)
    })
    const roles = page.waitForRequest(LISTS.roles)
    // null 인 필드는 키째 빠진다 (non_null)
    await fake(page, {
      terminals: { status: 200, body: [
        { id: 1, terminalCode: 'T1', name: '가상시설0003', layerCode: 'BROADCAST', commType: 'BROADCAST_CDMA', groupType: '경로당', region: '달동', lat: 0.0, lng: 0.0, phone: '012-0000-0000' },
        { id: 2, terminalCode: 'T2', name: '(가상시설0412) 좌표없는어울림@', layerCode: 'BROADCAST', commType: 'BROADCAST_CDMA', groupType: '아파트' },
      ] },
      signboards: { status: 200, body: [
        { id: 2, name: '가상시설0433', layerCode: 'SIGNBOARD', host: 'samhogyo.example', lat: 0.0, lng: 0.0, region: '삼호동' },
        { id: 5, name: '가상시설0692', layerCode: 'SIGNBOARD', lat: 0.0, lng: 0.0 },
      ] },
      templates: { status: 200, body: [{ id: 1, title: '시험문구', content: '시험 내용' }] },
    })
    const errors = await open(page)
    await roles
    await expect(page.getByText('(선택 0/2)')).toBeVisible()
    await page.getByRole('button', { name: '모두 펼치기' }).click()
    await expect(page.getByRole('treeitem', { name: '가상시설0260' }).first()).toBeVisible()
    // 행정동이 없으면 '미지정', 좌표가 없어도 트리에는 있다
    await expect(page.getByRole('treeitem', { name: '미지정' })).toBeVisible()
    await expect(page.getByRole('treeitem', { name: '좌표없는어울림@' }).first()).toBeVisible()
    // 지도에는 좌표 있는 1개만
    await expect.poll(() => voiceDots(page)).toBe(1)
    await page.getByRole('button', { name: '시험문구', exact: true }).click()
    await expect(page.getByLabel('내용', { exact: true })).toHaveValue('시험 내용')
    // host 없는 전광판도 목록에 온다
    await page.getByRole('button', { name: '재해 문자 전광판' }).click()
    await expect(page.getByText('(선택 0/2)')).toBeVisible()
    await expect(page.getByRole('button', { name: '가상시설0692' })).toBeVisible()
    expect(old).toEqual([])
    expect(errors).toEqual([])
  })

  for (const [what, status, body] of [
    ['실패(500)하면', 500, { status: 'ERROR', message: ['서버 오류'] }],
    ['빈 목록이면', 200, []],
  ] as const) {
    test(`목록 — ${what} 빈 트리·칩 없이 열린다`, async ({ page }) => {
      const res = { status, body }
      await fake(page, { terminals: res, signboards: res, templates: res, roles: what === '빈 목록이면' ? { status, body: { eventRoles: [], departments: [] } } : res })
      const errors = await open(page)
      await expect(page.getByText('(선택 0/0)')).toBeVisible()
      await expect(page.getByRole('button', { name: '한파주의보', exact: true })).toHaveCount(0)
      await expect(send(page)).toBeDisabled()
      await page.getByRole('button', { name: '재해 문자 전광판' }).click()
      await expect(page.getByText('(선택 0/0)')).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('자동 음성 통보 — 대상·템플릿을 고르고 권한 확인 후 송출', async ({ page }) => {
    const errors = await open(page)
    const total = ((await (await page.request.get('/bcast/api/broadcast/terminals')).json()) as unknown[]).length
    await expect(page.getByText(`(선택 0/${total})`)).toBeVisible()
    await expect(send(page)).toBeDisabled()

    // 행정동별 갈래를 통째로 고르면 전체가 선택
    await page.getByRole('treeitem', { name: '행정동별' }).click()
    await expect(page.getByText(`(선택 ${total}/${total})`)).toBeVisible()
    // 모두 펼치기 ↔ 트리 펼침
    await page.getByRole('button', { name: '모두 펼치기' }).click()
    await expect(page.getByRole('button', { name: '모두 펼치기' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('treeitem', { name: '유형별' })).toHaveAttribute('aria-expanded', 'true')

    // 템플릿 → 제목·내용 채워짐
    const chip = page.getByRole('button', { name: '한파주의보', exact: true })
    await chip.click()
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('한파주의보')
    await expect(page.getByLabel('내용', { exact: true })).not.toHaveValue('')

    await expect(send(page)).toBeEnabled()
    await send(page).click()
    const login = page.getByRole('dialog', { name: '권한 확인' })
    await login.getByLabel('아이디').fill('admin')
    await login.getByLabel('비밀번호').fill('pw')
    await login.getByRole('button', { name: '확인' }).click()
    await expect(login).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText('확인되었습니다')
    // 권한 확인 뒤엔 입력이 잠기고 버튼이 송출로
    await expect(page.getByLabel('제목', { exact: true })).toHaveAttribute('readonly', '')
    await expect(page.getByRole('button', { name: '취소', exact: true })).toBeVisible()

    const req = page.waitForRequest('**/api/broadcast/dispatches')
    await page.getByRole('button', { name: '송출', exact: true }).click()
    expect(((await req).postDataJSON() as { terminalIds: number[] }).terminalIds).toHaveLength(total)
    await expect(page.getByText('송출 성공')).toBeVisible()
    await expect(page.getByText(`(선택 0/${total})`)).toBeVisible()
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('')
    expect(errors).toEqual([])
  })

  test('수정사항 — 재난 알림음을 고르면 입력 칸 대신 안내, 대상만 고르면 "오"로 송출', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: '한파주의보', exact: true }).click()
    await page.getByRole('radio', { name: '재난 알림음' }).click()
    await expect(page.getByRole('note')).toHaveText('사이렌이 울립니다.')
    await expect(page.getByLabel('제목', { exact: true })).toHaveCount(0)
    await expect(page.getByText('메시지 유형(템플릿)')).toHaveCount(0)
    await expect(send(page)).toBeDisabled()
    await page.getByRole('treeitem', { name: '유형별' }).click()
    await expect(send(page)).toBeEnabled()
    await send(page).click()
    const login = page.getByRole('dialog', { name: '권한 확인' })
    await login.getByLabel('아이디').fill('a')
    await login.getByLabel('비밀번호').fill('b')
    await login.getByRole('button', { name: '확인' }).click()
    const req = page.waitForRequest('**/api/broadcast/dispatches')
    await page.getByRole('button', { name: '송출', exact: true }).click()
    expect((await req).postDataJSON()).toMatchObject({ title: '사이렌', content: '오', alertSound: '1' })
    // 송출 뒤엔 기본 알림음으로 — 입력 칸이 다시 나오고 비어 있다
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('')
  })

  test('송출 취소는 확인을 거쳐 입력·권한을 지운다', async ({ page }) => {
    await open(page)
    await page.getByRole('treeitem', { name: '유형별' }).click()
    await page.getByRole('button', { name: '한파주의보', exact: true }).click()
    await send(page).click()
    const login = page.getByRole('dialog', { name: '권한 확인' })
    await login.getByLabel('아이디').fill('a')
    await login.getByLabel('비밀번호').fill('b')
    await login.getByRole('button', { name: '확인' }).click()
    await page.getByRole('button', { name: '취소', exact: true }).click()
    const confirm = page.getByRole('dialog', { name: '취소' })
    await expect(confirm).toContainText('취소할 경우 입력한 내용 및 권한이 제거됩니다.')
    await confirm.getByRole('button', { name: '진행' }).click()
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('')
    await expect(send(page)).toHaveText('권한 확인')
    await expect(send(page)).toBeDisabled()
  })

  test('템플릿 추가·삭제, 초기화 확인', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: '템플릿 추가' }).click()
    const add = page.getByRole('dialog', { name: '템플릿 추가' })
    await add.getByLabel('템플릿 제목').fill('새 문구')
    await add.getByLabel('템플릿 내용').fill('내용입니다')
    await add.getByRole('button', { name: '확인' }).click()
    const chip = page.getByRole('button', { name: '새 문구', exact: true })
    await expect(chip).toBeVisible()
    await page.getByRole('button', { name: '새 문구 옵션' }).click()
    await page.getByRole('menu').getByRole('button', { name: '삭제' }).click()
    await page.getByRole('dialog', { name: '템플릿 삭제' }).getByRole('button', { name: '삭제' }).click()
    await expect(chip).toHaveCount(0)

    await page.getByLabel('제목', { exact: true }).fill('제목')
    // 지도에도 '초기화' 버튼이 있어 '텍스트 입력' 줄의 것을 누른다. 미리듣기는 뺐다 (사용자 10-22)
    await expect(page.getByRole('button', { name: '미리듣기' })).toHaveCount(0)
    await page.getByText('텍스트 입력', { exact: true }).locator('..').getByRole('button', { name: '초기화' }).click()
    await page.getByRole('dialog', { name: '초기화' }).getByRole('button', { name: '초기화' }).click()
    await expect(page.getByLabel('제목', { exact: true })).toHaveValue('')
  })

  test('재해 문자 전광판 — 고른 순서대로 CCTV 칸, ✕ 로 해제, 송출하면 표출 중 목록', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: '재해 문자 전광판' }).click()
    await expect(page.getByRole('button', { name: '재해 문자 전광판' })).toHaveAttribute('aria-pressed', 'true')
    const cards = page.locator('button[aria-pressed]').filter({ has: page.locator('svg[data-state]') }).filter({ hasNotText: /전광판|통보|펼치기/ })
    const names = await cards.allInnerTexts()
    expect(names.length).toBeGreaterThan(2)
    await cards.nth(1).click()
    await cards.nth(0).click()
    const groups = page.getByRole('group')
    await expect(groups).toHaveCount(2)
    await expect(groups.nth(0)).toHaveAccessibleName(names[1])
    await expect(groups.nth(1)).toHaveAccessibleName(names[0])
    // 칸의 ✕ → 그 카드 해제
    await groups.nth(0).getByRole('button', { name: '닫기' }).click()
    await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'false')
    await expect(groups).toHaveCount(1)

    await page.getByLabel('전광판 내용').fill('호우경보 발효 중')
    await send(page).click()
    const login = page.getByRole('dialog', { name: '권한 확인' })
    await login.getByLabel('아이디').fill('a')
    await login.getByLabel('비밀번호').fill('b')
    await login.getByRole('button', { name: '확인' }).click()
    const req = page.waitForRequest('**/api/signboard/alerts')
    await page.getByRole('button', { name: '송출', exact: true }).click()
    expect(((await req).postDataJSON() as { msgCn: string }).msgCn).toBe('호우경보 발효 중')
    await expect(page.getByText('표출 중')).toBeVisible()
  })

  test('권한 등록 창 — 비밀번호가 다르면 알림, 가입하면 권한 확인 창으로', async ({ page }) => {
    await open(page)
    await page.getByRole('treeitem', { name: '유형별' }).click()
    await page.getByRole('button', { name: '한파주의보', exact: true }).click()
    await send(page).click()
    await page.getByRole('dialog', { name: '권한 확인' }).getByRole('button', { name: '등록' }).click()
    const signup = page.getByRole('dialog', { name: '회원 가입' })
    await signup.getByLabel('아이디').fill('new')
    await signup.getByLabel('이름').fill('홍길동')
    await signup.getByLabel('비밀번호', { exact: true }).fill('a')
    await signup.getByLabel('비밀번호 확인').fill('b')
    await signup.getByRole('button', { name: '가입하기' }).click()
    await expect(page.getByRole('status')).toHaveText('비밀번호가 일치하지 않습니다.')
    await signup.getByLabel('비밀번호 확인').fill('a')
    await signup.getByRole('button', { name: '가입하기' }).click()
    await expect(page.getByRole('dialog', { name: '권한 확인' })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('권한 등록이 완료되었습니다.')
  })

  test('지도 마커 — 재난 예·경보에서 점을 누르면 패널에서 골라지고 강조된다', async ({ page }) => {
    const errors = await open(page)
    const total = ((await (await page.request.get('/bcast/api/broadcast/terminals')).json()) as unknown[]).length
    await expect(page.getByText(`(선택 0/${total})`)).toBeVisible()
    // 화면에 그려진 방송장비 점 하나의 화면 자리와 강조 여부
    const dot = () =>
      page.evaluate(async () => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const m = mapState.get().map
        if (!m) return null
        const layers = m.getLayersOrder().filter((l) => l.startsWith('pt-') && l.endsWith('-dot'))
        const r = m.getCanvas().getBoundingClientRect()
        const f = m.queryRenderedFeatures({ layers }).find((x) => {
          const [lng, lat] = (x.geometry as { coordinates: [number, number] }).coordinates
          const pt = m.project([lng, lat])
          return pt.x > 200 && pt.x < 900 && pt.y > 300 && pt.y < r.height - 300
        })
        if (!f) return null
        const pt = m.project((f.geometry as { coordinates: [number, number] }).coordinates)
        return { id: f.id, x: r.x + pt.x, y: r.y + pt.y, em: m.getFeatureState({ source: f.source, id: f.id! }).em === true }
      })
    await expect.poll(async () => (await dot()) !== null).toBe(true)
    const d = (await dot())!
    expect(d.em).toBe(false)
    await page.mouse.click(d.x, d.y)
    await expect(page.getByText(`(선택 1/${total})`)).toBeVisible()
    await expect.poll(async () => (await dot())?.em).toBe(true)
    // 다시 누르면 풀린다
    await page.mouse.click(d.x, d.y)
    await expect(page.getByText(`(선택 0/${total})`)).toBeVisible()
    expect(errors).toEqual([])
  })

  test('지도 마커 — 레이어 메뉴에서 방송장비·전광판을 켜면 보인다', async ({ page }) => {
    await page.goto('/wall')
    await page.getByRole('button', { name: '레이어', exact: true }).click()
    // 시설 마커는 지도 엔진이 그린다 (app/wall/map/points) — 화면에 그려진 점 수를 센다
    const dots = () =>
      page.evaluate(async () => {
        const { mapState } = await import('/src/app/wall/map/state.ts')
        const m = mapState.get().map
        if (!m) return 0
        const layers = m.getLayersOrder().filter((l) => l.startsWith('pt-') && l.endsWith('-dot'))
        return m.queryRenderedFeatures({ layers }).length
      })
    await expect.poll(dots).toBe(0)
    await page.getByRole('button', { name: '재난예경보 표시' }).click()
    await expect.poll(dots).toBeGreaterThan(100)
    const mid = await dots()
    await page.getByRole('button', { name: '재해전광판 표시' }).click()
    await expect.poll(dots).toBeGreaterThan(mid)
  })
})
