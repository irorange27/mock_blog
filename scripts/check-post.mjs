#!/usr/bin/env node
/**
 * 博客文章体检
 *
 *   node scripts/check-post.mjs content/posts/xxx.md
 *
 * 检查项：
 *   1. 破折号（—— / — / –）
 *   2. KaTeX 公式能否渲染（逐条试渲染，非正则估算）
 *   3. 段落长度分布
 *   4. front matter 必填字段
 *   5. 大写缩写首现时是否给了全称
 *   6. 加粗闭合（** 前是全角标点且后紧跟文字时不渲染，星号会原样显示）
 *   7. 中英文间距（参照 ruanyf/document-style-guide）：
 *      - 中文字符与英文单词之间必须有半角空格（相邻是标点或行首行尾则不算）
 *      - 中文与数字/百分号空格可选，但全篇风格必须统一
 *      - 半角字符与全角标点之间不留空格（如「MacBook Air 。」）
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const fixMode = process.argv.includes('--fix')
const file = process.argv.find((a) => a !== '--fix' && a !== process.argv[0] && a !== process.argv[1])
if (!file) {
  console.error('用法: node scripts/check-post.mjs [--fix] <markdown 文件>')
  process.exit(1)
}

const raw = fs.readFileSync(file, 'utf8')
const problems = []
const notes = []

// 把行内代码/公式/链接 URL 换成占位符，替换只作用于正文，最后还原
const protect = (line, fn) => {
  const stash = []
  const stashed = line.replace(/(`[^`]*`|\$\$[^$]*\$\$|\$[^$\n]*\$|\]\([^)]*\)|<[^>]+>|::\w+|https?:\/\/[^\s)]+)/g, (seg) => {
    stash.push(seg)
    return `\u0000${stash.length - 1}\u0000`
  })
  return fn(stashed).replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i])
}

const fixLine = (line) => protect(line, (s) => s
  // 半角字符与全角标点之间的空格删掉（两侧）
  .replace(/([\w`]|\p{Script=Han})([ \t]+)(?=[，。？！：；、）】」』》…％])/gu, '$1')
  .replace(/([（【「『《])[ \t]+/g, '$1')
  // 中文与英文/数字之间补空格
  .replace(/(\p{Script=Han})([A-Za-z0-9])/gu, '$1 $2')
  .replace(/([A-Za-z0-9])(\p{Script=Han})/gu, '$1 $2'))

// ---------- front matter ----------
let fm = {}
let body = raw
if (raw.startsWith('---')) {
  const end = raw.indexOf('\n---', 3)
  const block = raw.slice(4, end)
  body = raw.slice(end + 4)
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/)
    if (m) fm[m[1]] = m[2].trim()
  }
}

// ---------- --fix：自动修间距类问题 ----------
// 只处理检查 7 的三条（机械替换即可），其余检查需要人判断，不修：
//   - 中文与英文单词之间补半角空格
//   - 中文与数字统一为加空格风格
//   - 半角字符与全角标点之间的空格删掉
if (fixMode) {
  const fixed = []
  let fence = null
  for (const line of body.split('\n')) {
    const fenceHit = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceHit) {
      const marker = fenceHit[1][0]
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      fixed.push(line)
      continue
    }
    fixed.push(fence ? line : fixLine(line))
  }
  const newBody = fixed.join('\n')
  if (newBody !== body) {
    fs.writeFileSync(file, raw.slice(0, raw.length - body.length) + newBody)
    body = newBody
    console.log(`✓ 已修复间距问题并写回 ${file}（数字风格统一为加空格）`)
  } else {
    console.log('没有可自动修复的间距问题')
  }
}
for (const key of ['title', 'date', 'categories', 'description']) {
  if (!fm[key]) problems.push(`front matter 缺 ${key}`)
}
if (fm.draft !== undefined) notes.push(`draft: ${fm.draft}`)

// ---------- 破折号 ----------
const dashes = [...body.matchAll(/——|—|–/g)]
if (dashes.length) {
  for (const d of dashes.slice(0, 10)) {
    const line = body.slice(0, d.index).split('\n').length
    problems.push(`破折号 @L${line}: …${body.slice(Math.max(0, d.index - 20), d.index + 20).replace(/\n/g, ' ')}…`)
  }
  if (dashes.length > 10) problems.push(`…另有 ${dashes.length - 10} 处破折号`)
}

// ---------- 公式渲染 ----------
const katexDir = path.join(process.cwd(), 'node_modules/.pnpm')
let katexPath = null
if (fs.existsSync(katexDir)) {
  const hit = fs.readdirSync(katexDir).find((d) => d.startsWith('katex@'))
  if (hit) katexPath = path.join(katexDir, hit, 'node_modules/katex/dist/katex.mjs')
}
if (katexPath) {
  const katex = (await import('file://' + katexPath)).default
  const spans = []
  let stripped = body.replace(/\$\$([\s\S]+?)\$\$/g, (_, b) => (spans.push(['display', b]), '\u0000'))
  stripped = stripped.replace(/\$([^\n$]+?)\$/g, (_, b) => (spans.push(['inline', b]), '\u0000'))
  let failed = 0
  for (const [kind, src] of spans) {
    try {
      katex.renderToString(src, { throwOnError: true, displayMode: kind === 'display' })
    } catch (e) {
      failed++
      problems.push(`公式渲染失败 [${kind}]: ${src.slice(0, 60).replace(/\n/g, ' ')} => ${e.message.slice(0, 60)}`)
    }
  }
  notes.push(`公式 ${spans.length} 条（display ${spans.filter((s) => s[0] === 'display').length}）全部渲染通过${failed ? `，失败 ${failed}` : ''}`)
} else {
  notes.push('未找到 katex，跳过公式渲染检查')
}

// ---------- 内联标记完整性 ----------
const blocks = body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
// 自动合并/切分段落时，容易把 ** 或闭合引号切到行首
for (const [i, blk] of blocks.entries()) {
  const n = (blk.match(/\*\*/g) || []).length
  if (n % 2 === 1) problems.push(`块 #${i} 的 ** 数量是奇数（加粗被切断）: ${blk.slice(0, 40)}`)
  if (/^["”』」）)]/.test(blk)) problems.push(`块 #${i} 以闭合引号/括号开头（断句切错）: ${blk.slice(0, 40)}`)
}
if ((body.match(/\$\$/g) || []).length % 2) problems.push('$$ 数量是奇数，有公式没闭合')

// ---------- 加粗闭合 ----------
// commonmark 的 flanking 规则：闭合 ** 前面是全角标点（）。？！：等）、后面紧跟
// 文字时不会闭合，星号原样显示，如 **策略梯度（policy gradient）**理论。
// 用站点同款 micromark 逐段试渲染，输出里残留的字面 ** 就是没渲染成加粗的位置。
// 修法二选一：把标点移出加粗（**策略梯度**（policy gradient）理论），或在闭合 ** 后加空格。
{
  const mmDir = path.join(process.cwd(), 'node_modules/.pnpm')
  let micromark = null
  if (fs.existsSync(mmDir)) {
    const hit = fs.readdirSync(mmDir).find((d) => d.startsWith('micromark@'))
    if (hit) {
      try {
        micromark = (await import('file://' + path.join(mmDir, hit, 'node_modules/micromark/dev/index.js'))).micromark
      } catch {}
    }
  }
  if (micromark) {
    let inFence = false
    let buf = []
    let bufStart = 0
    let lineNo = 0
    const flush = () => {
      if (buf.length && buf.some((l) => l.includes('**'))) {
        const text = buf.join('\n')
        const bad = ((micromark(text) || '').match(/\*\*/g) || []).length
        if (bad > 0) {
          problems.push(`加粗未闭合 @L${bufStart}: 本段残留 ${bad} 处字面 ** …${text.slice(0, 36).replace(/\n/g, ' ')}…`)
        }
      }
      buf = []
    }
    for (const raw of body.split('\n')) {
      lineNo += 1
      if (/^[ \t]{0,3}(`{3,}|~{3,})/.test(raw)) {
        if (!inFence) { flush(); inFence = true; bufStart = lineNo + 1; continue }
        inFence = false; buf = []; bufStart = lineNo + 1; continue
      }
      if (inFence) continue
      if (raw.trim() === '') { flush(); bufStart = lineNo + 1; continue }
      if (buf.length === 0) bufStart = lineNo
      buf.push(raw)
    }
    flush()
  } else {
    notes.push('未找到 micromark，跳过加粗闭合检查')
  }
}

// ---------- 行间公式的写法 ----------
// remark-math 只把「开闭 $$ 各自独占一行」当行间公式；单行 $$…$$ 会被解析成
// 行内公式：行内字号、左对齐、不居中。围栏代码块里的不算。
const singleLineMath = []
{
  let fence = null
  body.split('\n').forEach((line, i) => {
    const fenceHit = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceHit) {
      const marker = fenceHit[1][0]
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      return
    }
    if (fence) return
    if (/^[ \t]*\$\$.+\$\$[ \t]*$/.test(line)) singleLineMath.push(i + 1)
  })
}
for (const line of singleLineMath) {
  problems.push(`行间公式 @L${line}: 单行 $$…$$ 会被当成行内公式（不居中），请让两个 $$ 各自独占一行`)
}

// ---------- 中英文之间的空格 ----------
// 完整英文单词左右要留空格，除非相邻是标点或行首/行尾。如「使用LLM做检索」应写成
// 「使用 LLM 做检索」。跳过围栏代码块、行内代码、公式、链接 URL 和行内 HTML。
{
  const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\u00a1\u00bf\u2010-\u2027\u2030-\u205e\u3000-\u303f\uff01-\uff20\uff3b-\uff40\uff5b-\uff65·—–-]/
  let fence = null
  let lineNo = 0
  const hits = []
  for (const line of body.split('\n')) {
    lineNo += 1
    const fenceHit = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceHit) {
      const marker = fenceHit[1][0]
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence) continue
    // 摘掉行内代码 / 公式 / 链接 URL / 行内 HTML，剩下的才是正文
    const text = line
      .replace(/`[^`]*`/g, ' ')
      .replace(/\$\$[^$]*\$\$|\$[^$\n]*\$/g, ' ')
      .replace(/\]\([^)]*\)/g, ']')
      .replace(/https?:\/\/[^\s)]+/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/::\w+/g, ' ')
    for (const m of text.matchAll(/(?<![A-Za-z])([A-Za-z][A-Za-z'-]*[A-Za-z]|[A-Za-z])(?![A-Za-z])/g)) {
      const word = m[1]
      if (word.length < 2 && !/[A-Z]/.test(word)) continue
      const before = m.index > 0 ? text[m.index - 1] : ''
      const after = text[m.index + word.length] ?? ''
      // 字母与数字连写（BF16、FP8、7B、GPT4 这类型号/精度）按一个词元算，不算缺空格
      if (before && !/[\s0-9]/.test(before) && !PUNCT.test(before)) hits.push([lineNo, word, '左', before])
      if (after && !/[\s0-9]/.test(after) && !PUNCT.test(after)) hits.push([lineNo, word, '右', after])
    }
  }
  const seen = new Set()
  for (const [l, word, side, ch] of hits) {
    const k = `${l}:${word}:${side}`
    if (seen.has(k)) continue
    seen.add(k)
    problems.push(`英文空格 @L${l}: 「${word}」${side}侧紧贴「${ch}」，缺空格`)
  }

  // 中文与数字/百分号：空格可有可无，但全篇风格必须统一（阮一峰 document-style-guide）
  let hanDigitTight = 0
  let hanDigitSpaced = 0
  const tightSample = []
  for (const line of body.split('\n')) {
    const clean = line.replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, ']')
    for (const m of clean.matchAll(/[\u4e00-\u9fff] ?[0-9]/g)) {
      if (m[0][1] === ' ') hanDigitSpaced++
      else {
        hanDigitTight++
        if (tightSample.length < 3) tightSample.push(m[0])
      }
    }
  }
  if (hanDigitTight && hanDigitSpaced) {
    problems.push(`中数空格风格混杂：紧贴 ${hanDigitTight} 处（如 ${tightSample.join(' ')}）vs 加空格 ${hanDigitSpaced} 处，全篇应统一`)
  } else if (hanDigitTight || hanDigitSpaced) {
    notes.push(`中文与数字全部${hanDigitTight ? '紧贴' : '加空格'}（${hanDigitTight + hanDigitSpaced} 处），风格统一`)
  }

  // 半角字符与全角标点之间不留空格：「MacBook Air 。」是错误
  let lineNo2 = 0
  for (const line of body.split('\n')) {
    lineNo2 += 1
    const fenceHit = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceHit) {
      const marker = fenceHit[1][0]
      if (!fence) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence) continue
    const clean = line.replace(/`[^`]*`/g, ' ')
    for (const m of clean.matchAll(/[\w`]([ \t]+)([，。？！：；、）】」』》…％])|([（【「『《])([ \t]+)(?=\w)/g)) {
      problems.push(`全角标点空格 @L${lineNo2}: 「${m[0].replace(/ /g, '␣')}」——半角字符与全角标点 ${m[2] || m[3]} 之间不留空格`)
    }
  }
}

// ---------- 段落分布 ----------
const isProseBlock = (s) => !/^(#|\$\$|```|\||>|::|[-*+] |\d+\. )/.test(s)
const prose = blocks.filter(isProseBlock)
const lens = prose.map((s) => s.length).sort((a, b) => b - a)
if (lens.length) {
  const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)
  const med = lens[Math.floor(lens.length / 2)]
  notes.push(`段落 总块 ${blocks.length}，文字段 ${prose.length}，段均 ${avg} 字符，中位 ${med}，最长 ${lens[0]}`)
  if (lens[0] > 400) problems.push(`最长段落 ${lens[0]} 字符，偏长`)
  const han = (body.match(/[\u4e00-\u9fff]/g) || []).length
  notes.push(`汉字 ${han}`)
}

// ---------- 缩写首现 ----------
// 只扫全大写缩写 + 少量驼峰缩写；单位/通用词不算问题，只作提示
const NOISE = new Set([
  'AI', 'AGI', 'GPT', 'LLM', 'LLMS', 'GPU', 'CPU', 'API', 'RL', 'KV', 'HBM', 'HBM3',
  'TP', 'FP8', 'NVFP4', 'QSA', 'GDN', 'SM', 'SRAM', 'MB', 'GB', 'TB', 'KB', 'NB',
  'MS', 'CUDA', 'NCCL', 'ROI', 'SXM', 'FLOP', 'FLOPS', 'TFLOPS', 'MFLOP', 'GFLOP',
  'PPO', 'GRPO', 'RWKV', 'QK', 'SFT', 'MCP', 'RAG', 'PDF', 'URL', 'HTTP', 'JSON',
  'ID', 'UI', 'UX', 'RLHF', 'SSM', 'MoE', 'RoPE', 'LoRA', 'KDA', 'FFN', 'MHA',
])
const abbrevs = [
  ...new Set([
    ...[...body.matchAll(/\b([A-Z]{2,7})\b/g)].map((m) => m[1]),
    ...[...body.matchAll(/\b(RoPE|MoE|LoRA|DeepSWE|CyberGym|TerminalBench|Alibi)\b/g)].map((m) => m[1]),
  ]),
]
const undefinedAbbrevs = []
for (const a of abbrevs) {
  if (NOISE.has(a)) continue
  const first = body.indexOf(a)
  const after = body.slice(first + a.length, first + a.length + 26)
  if (!/^（[A-Za-z\u4e00-\u9fff]/.test(after)) undefinedAbbrevs.push(a)
}

// ---------- 输出 ----------
console.log(`\n体检: ${file}\n${'─'.repeat(60)}`)
for (const n of notes) console.log(`  · ${n}`)
if (undefinedAbbrevs.length) {
  console.log(`\n  提示：以下缩写首现处没紧跟全称（可能是路线图式提前提及，自行判断）`)
  console.log(`    ${undefinedAbbrevs.join('  ')}`)
}
if (problems.length) {
  console.log(`\n  ✗ ${problems.length} 个问题：`)
  for (const p of problems) console.log(`    - ${p}`)
  process.exit(1)
} else {
  console.log(`\n  ✓ 全部通过`)
}
