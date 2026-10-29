import { expect, test } from '@playwright/test'

// 화면이 뜨는지만 확인 — 메뉴별 테스트는 메뉴를 다시 만들 때 추가한다.
test('라우트가 오류 없이 열린다', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const path = info.project.name === 'wall' ? '/v2/wall' : '/tablet'
  await page.goto(path)
  await expect(page.locator('#root')).not.toBeEmpty()
  expect(errors).toEqual([])
})
