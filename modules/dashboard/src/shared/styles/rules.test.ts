/// <reference types="node" />
// 새 코드 규칙 검사 — src/app, src/shared, src/map 은 (새 메뉴 폴더도 만들면 NEW_DIRS 에 추가)
//   1) 색을 직접 적지 않고 토큰(tokens.css)만 쓴다
//   2) 옛 styles/designTokens.ts 를 가져다 쓰지 않는다
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const NEW_DIRS = ['app', 'shared', 'map'].map((d) => join(ROOT, d))
const ALLOW = [join(ROOT, 'shared/styles/tokens.css'), join(ROOT, 'shared/styles/palette.ts')] // 토큰 정의, 색 데이터

function files(dir: string): string[] {
  let out: string[] = []
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return out
  }
  for (const n of names) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out = out.concat(files(p))
    else if (/\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n) && !ALLOW.includes(p)) out.push(p)
  }
  return out
}

const all = NEW_DIRS.flatMap(files)

describe('새 코드 스타일 규칙', () => {
  it('색을 직접 적지 않는다 (#hex, rgb())', () => {
    const bad = all.filter((f) => /#[0-9a-fA-F]{3,8}\b(?![\w-])|rgba?\(/.test(readFileSync(f, 'utf-8').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')))
    expect(bad.map((f) => relative(ROOT, f))).toEqual([])
  })
  it('옛 designTokens.ts 를 쓰지 않는다', () => {
    const bad = all.filter((f) => readFileSync(f, 'utf-8').includes('styles/designTokens'))
    expect(bad.map((f) => relative(ROOT, f))).toEqual([])
  })
})
