#!/usr/bin/env node
/**
 * 类型检查的软门槛（CI 与本地都可跑）
 *
 *   node scripts/typecheck-ci.mjs            # 检查；比基线多出错误就退出码 1
 *   node scripts/typecheck-ci.mjs --report   # 打印比对结果，永远退出码 0
 *   node scripts/typecheck-ci.mjs --update   # 把当前错误集合写成新基线
 *
 * 为什么不是「零错误」：这个仓库在 main 上就带着一批类型错误（清单见
 * scripts/typecheck-baseline.json）。一道常红的检查等于没有检查，新错误会混在
 * 旧错误里没人看。所以改成**比对**：
 *
 *   本次报错 ⊆ 基线 → 通过（既有问题原样保留）
 *   本次报错 ⊄ 基线 → 失败（多出来的就是本次改动引入的）
 *
 * 基线粒度是「文件 + 行 + 错误码」，所以同一个文件里新加的错误也会被抓到，
 * 而不是给整个文件免责。修好既有问题后跑 --update 收敛基线。
 *
 * 前置：需要 .nuxt 存在（pnpm install 的 postinstall 会生成）。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const BASELINE_FILE = 'scripts/typecheck-baseline.json'
const NUXT_DIR = '.nuxt'
const OUT_FILE = path.join(NUXT_DIR, 'tsconfig.ci.json')

const args = process.argv.slice(2)
const reportOnly = args.includes('--report')
const updateBaseline = args.includes('--update')

const nuxtTsconfig = path.join(NUXT_DIR, 'tsconfig.json')
if (!existsSync(nuxtTsconfig)) {
  console.error(`✖ 找不到 ${nuxtTsconfig}；先跑一次 pnpm install（postinstall 会生成 .nuxt）`)
  process.exit(1)
}

const root = JSON.parse(readFileSync(nuxtTsconfig, 'utf8'))

// 生成的这份必须留在 .nuxt/ 同层：include 与 compilerOptions.paths 都相对
// tsconfig 所在目录，换个目录会让里面的 ../app 全部指错。
mkdirSync(NUXT_DIR, { recursive: true })
writeFileSync(OUT_FILE, `${JSON.stringify({ ...root, include: ['./nuxt.d.ts'] }, null, 2)}\n`)

const tsc = path.join('node_modules', '.bin', 'tsc')
const result = spawnSync(tsc, ['--noEmit', '-p', OUT_FILE], { encoding: 'utf8', stdio: 'pipe' })
rmSync(OUT_FILE, { force: true })

/** 归一成 { file, line, code }；不保留报错正文（措辞会随 TS 版本变） */
const normalize = (line) => {
  const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+)/)
  // .vue 的 TS6054 是 tsc 不认扩展名造成的，那是 vue-tsc 的活，不计入
  if (!match || match[1].endsWith('.vue')) return null
  return { file: match[1].replace(/\\/g, '/'), line: Number(match[2]), code: match[4] }
}

const output = `${result.stdout || ''}${result.stderr || ''}`
const seen = output
  .split('\n')
  .filter(line => line.includes('error TS'))
  .map(normalize)
  .filter(Boolean)

const key = (e) => `${e.file}(${e.line}): ${e.code}`
const current = [...new Map(seen.map(e => [key(e), e])).values()]
  .sort((a, b) => key(a).localeCompare(key(b)))

if (updateBaseline) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`已把当前 ${current.length} 处错误写入 ${BASELINE_FILE}`)
  process.exit(0)
}

let baseline
try {
  baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
} catch {
  console.error(`✖ 读不到 ${BASELINE_FILE}；首次使用先跑一次 node scripts/typecheck-ci.mjs --update`)
  process.exit(1)
}

const baselineKeys = new Set(baseline.map(key))
const newErrors = current.filter(e => !baselineKeys.has(key(e)))

const byFile = (list) => {
  const grouped = new Map()
  for (const e of list) {
    if (!grouped.has(e.file)) grouped.set(e.file, [])
    grouped.get(e.file).push(e)
  }
  return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

if (reportOnly) {
  if (newErrors.length) {
    console.log(`基线之外的新错误（${newErrors.length} 处）：`)
    for (const [file, list] of byFile(newErrors)) {
      console.log(`   ${file}`)
      for (const e of list) console.log(`      ${e.line}: ${e.code}`)
    }
  } else {
    console.log('基线之外没有新错误')
  }

  console.log(`\n当前报错 ${current.length} 处；基线 ${baseline.length} 处`)

  const fixed = baseline.filter(e => !current.some(c => key(c) === key(e)))
  if (fixed.length) {
    console.log(`\n基线里已经不存在、可以收敛掉的（${fixed.length} 处）：`)
    for (const [file, list] of byFile(fixed)) console.log(`   ${file}（${list.length} 处）`)
    console.log('\n跑 --update 收敛基线')
  }
  process.exit(0)
}

if (newErrors.length) {
  console.error(`✖ 基线之外出现 ${newErrors.length} 处类型错误：\n`)
  for (const e of newErrors) console.error(`   ${e.file}(${e.line}): ${e.code}`)
  console.error(`\n这些是本次改动引入的，请修掉；确认是既有问题才动 ${BASELINE_FILE}。`)
  process.exit(1)
}

console.log(`✔ 类型检查通过：${current.length} 处报错全部在基线内（基线 ${baseline.length} 处）`)
