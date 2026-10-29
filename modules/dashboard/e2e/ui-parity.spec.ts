import { expect, test, type Page } from '@playwright/test'

// 옛 컴포넌트와 새 공통 컴포넌트가 같은 모양인지 — /dev/ui 의 data-pair 마다 old·new 를 캡처해 픽셀 비교.
//   평소 모습과 마우스를 올린 모습 둘 다 본다.
//   글라스(backdrop-blur) 가장자리처럼 그리는 방식 차이로 생기는 미세한 차이만 허용한다 (색 차 24(약 10%) 넘는 픽셀 0.5% 이하 — 가장자리 안티앨리어싱 차이는 18~19 정도).
const MAX_RATIO = 0.005

/** 두 PNG 를 브라우저 canvas 로 읽어 색 차가 큰 픽셀 비율을 센다. */
async function diffRatio(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([a64, b64]) => {
      const load = (s: string) =>
        new Promise<HTMLImageElement>((ok) => {
          const img = new Image()
          img.onload = () => ok(img)
          img.src = `data:image/png;base64,${s}`
        })
      const [ia, ib] = await Promise.all([load(a64), load(b64)])
      if (ia.width !== ib.width || ia.height !== ib.height) return 1
      const px = (img: HTMLImageElement) => {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, c.width, c.height).data
      }
      const da = px(ia)
      const db = px(ib)
      let bad = 0
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]))
        if (d > 24) bad++
      }
      return bad / (da.length / 4)
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}

test('공통 컴포넌트 모양이 옛 것과 같다', async ({ page }, info) => {
  test.skip(info.project.name !== 'wall', 'wall 프로젝트에서 한 번만')
  await page.goto('/dev/ui')
  const pairs = page.locator('[data-pair]')
  await expect(pairs.first()).toBeVisible({ timeout: 20_000 })
  const names = await pairs.evaluateAll((els) => els.map((e) => e.getAttribute('data-pair')!))
  const results: string[] = []
  for (const name of names) {
    for (const hover of [false, true]) {
      const shot = async (side: string) => {
        const box = page.locator(`[data-pair="${name}"] [data-side="${side}"]`)
        await page.mouse.move(0, 0)
        if (hover) {
          const target = box.locator('button, [role=tab], .group').first()
          if (await target.count()) await target.hover({ force: true })
        }
        return box.screenshot({ animations: 'disabled' })
      }
      const oldShot = await shot('old')
      const newShot = await shot('new')
      const ratio = await diffRatio(page, oldShot, newShot)
      const label = `${name}${hover ? ' (hover)' : ''}`
      results.push(`${label}: ${(ratio * 100).toFixed(2)}%`)
      if (ratio > MAX_RATIO) {
        await info.attach(`${label}-old.png`, { body: oldShot, contentType: 'image/png' })
        await info.attach(`${label}-new.png`, { body: newShot, contentType: 'image/png' })
      }
      expect.soft(ratio, label).toBeLessThanOrEqual(MAX_RATIO)
    }
  }
  console.log(results.join('\n'))
})
