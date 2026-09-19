#!/usr/bin/env node
/**
 * 暂存区大文件保险丝（pre-commit 自动调用，也可手动跑）
 *
 *   node scripts/check-media-size.mjs [文件...]   # 无参数时检查暂存区新增文件
 *
 * 只看「新增」文件——已入库的文件历史里已经有了，拦也拦不回来。
 * 红线：单文件 > 5MB，或本次新增文件总量 > 20MB。
 * 确认要破例：git commit --no-verify 跳过本次检查。
 */
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const PER_FILE = 5 * 1024 * 1024
const TOTAL = 20 * 1024 * 1024

const manual = process.argv.length > 2
let files = process.argv.slice(2)
if (!files.length) {
  const res = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=A', '-z'], { encoding: 'utf8' })
  if (res.status !== 0) process.exit(0) // 不在 git 仓库里等场景，不拦提交
  files = res.stdout.split('\0').filter(Boolean)
}

function human(n) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`
}

const sizes = []
for (const f of files) {
  try {
    const st = fs.lstatSync(f)
    if (st.isFile()) sizes.push([f, st.size])
  } catch { /* 路径异常或已删除，跳过 */ }
}

const over = sizes.filter(([, s]) => s > PER_FILE)
const total = sizes.reduce((a, [, s]) => a + s, 0)

if (over.length || total > TOTAL) {
  console.log('✗ 检出待提交的大文件（红线：单文件 >5MB / 总量 >20MB）')
  for (const [f, s] of over) console.log(`    - ${f}  ${human(s)}`)
  if (!over.length || total > TOTAL) console.log(`    - 本次新增合计 ${human(total)}`)
  console.log(`  建议：图片/音频先跑 pnpm media <文件> 压缩转码；确实要提交大文件用 git commit --no-verify`)
  process.exit(1)
}

if (manual) console.log(`✓ ${sizes.length} 个文件都在红线内（合计 ${human(total)}）`)
