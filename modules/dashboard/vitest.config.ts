import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// 단위 테스트 — 공통 컴포넌트·훅·데이터 변환. 화면 흐름은 e2e(Playwright) 에서 본다.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  }),
)
