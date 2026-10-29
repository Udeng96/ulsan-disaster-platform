import { defineConfig } from '@playwright/test'

// 화면 테스트 — 가짜 서버(pnpm dev:mock, mock/plugin.ts)를 띄워 백엔드 없이 본다.
//   특정 응답(실패·빈 데이터)이 필요한 테스트는 page.route 로 덮어쓴다.
//   wall 은 2880×1080, tablet 은 1920×1080 으로 본다.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: 'wall', use: { viewport: { width: 2880, height: 1080 } } },
    { name: 'tablet', use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: 'pnpm dev:mock --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
