#!/usr/bin/env node
/**
 * 一键把媒体文件收进 public/，并输出可直接粘进文章的 markdown 引用行。
 *
 *   pnpm media <文件...> [--post <文章slug>] [--dry]
 *
 *   图片  png/jpg/jpeg/webp/avif/tiff/gif → 压缩转 webp（长边 ≤2000px，q82）→ public/images/[<post>/]
 *   音频  wav/flac/m4a/ogg 等 → ffmpeg 转 mp3（mp3 本身直接复制）           → public/audio/
 *   乐谱  pdf/gp/gpx/musicxml/mxl/mid → 原样复制                             → public/scores/
 *
 * 重名处理：目标是原样复制的文件内容相同则复用；转码结果不确定，重名自动加 -2/-3 后缀。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PUB = path.join(ROOT, 'public')
const MAX_EDGE = 2000
const QUALITY = 82

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tiff', '.tif'])
const AUDIO_TRANSCODE = new Set(['.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.wma', '.aiff'])
const AUDIO_COPY = new Set(['.mp3'])
const SCORE = new Set(['.pdf', '.gp', '.gpx', '.gp5', '.gp4', '.gp3', '.musicxml', '.xml', '.mxl', '.mid', '.midi'])

// ---------- 参数 ----------
const argv = process.argv.slice(2)
let postSlug = ''
const dry = argv.includes('--dry')
const files = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--post') postSlug = argv[++i] ?? ''
  else if (argv[i] === '--dry') continue
  else files.push(argv[i])
}
if (!files.length) {
  console.log(`用法: pnpm media <文件...> [--post <文章slug>] [--dry]
  图片 → 压缩转 webp → public/images/${postSlug ? postSlug + '/' : ''}…
  音频 → 转 mp3      → public/audio/
  乐谱 → 原样复制    → public/scores/`)
  process.exit(0)
}

function human(n) {
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

function normalizeName(file) {
  const ext = path.extname(file).toLowerCase()
  const stem = path.basename(file, path.extname(file))
    .trim().toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff.-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  return { stem: stem || 'file', ext }
}

// 重名时：可复用（内容一致）则复用，否则递增后缀
function resolveOut(dir, stem, ext, content) {
  let out = path.join(dir, stem + ext)
  let i = 2
  while (fs.existsSync(out)) {
    if (content && fs.readFileSync(out).equals(content)) return { out, reused: true }
    out = path.join(dir, `${stem}-${i++}${ext}`)
  }
  return { out, reused: false }
}

function write(out, data, dry) {
  if (!dry) fs.writeFileSync(out, data)
}

const mdLines = []
const results = []

for (const file of files) {
  if (!fs.existsSync(file)) {
    results.push(`✗ ${file}: 文件不存在`)
    continue
  }
  const { stem, ext } = normalizeName(file)
  const inSize = fs.statSync(file).size

  // ---- 图片：压缩转 webp ----
  if (IMAGE.has(ext) || ext === '.gif') {
    const dir = path.join(PUB, 'images', ...(postSlug ? [postSlug] : []))
    const out = path.join(dir, stem + '.webp')
    const { default: sharp } = await import('sharp')
    if (!dry) fs.mkdirSync(dir, { recursive: true })
    try {
      const pipeline = ext === '.gif'
        ? sharp(file, { animated: true }) // 动图保留动画帧
        : sharp(file).rotate() // 烤进 EXIF 方向
      const buf = await pipeline
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
      const { out: dst, reused } = resolveOut(dir, stem, '.webp', buf)
      if (!reused) write(dst, buf, dry)
      const url = path.relative(PUB, dst).split(path.sep).join('/')
      results.push(`${reused ? '≡' : '✓'} ${file} ${human(inSize)} → /${url} ${human(buf.length)} (-${Math.max(0, 100 - Math.round(buf.length / inSize * 100))}%)`)
      mdLines.push(`![${stem}](/${url})`)
    } catch (e) {
      // 个别格式（如损坏的 gif）转不动时退化为原样复制
      const { out: dst, reused } = resolveOut(dir, stem, ext, fs.readFileSync(file))
      if (!reused) fs.copyFileSync(file, dst)
      const url = path.relative(PUB, dst).split(path.sep).join('/')
      results.push(`⚠ ${file} 转 webp 失败（${e.message.slice(0, 50)}），已原样复制`)
      mdLines.push(`![${stem}](/${url})`)
    }
    continue
  }

  // ---- 音频：统一成 mp3 ----
  if (AUDIO_TRANSCODE.has(ext) || AUDIO_COPY.has(ext)) {
    const dir = path.join(PUB, 'audio')
    if (!dry) fs.mkdirSync(dir, { recursive: true })
    if (AUDIO_COPY.has(ext)) {
      const content = fs.readFileSync(file)
      const { out: dst, reused } = resolveOut(dir, stem, '.mp3', content)
      if (!reused) write(dst, content, dry)
      const url = `/audio/${path.basename(dst)}`
      results.push(`${reused ? '≡' : '✓'} ${file} → ${url} ${human(inSize)}（mp3 直接复制）`)
      mdLines.push(`:music-player{src="${url}" title="${stem.replaceAll('"', '')}"}`)
    } else {
      const has = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
      if (!has) {
        results.push(`✗ ${file}: 需要 ffmpeg 才能转 mp3（brew install ffmpeg 后重试）`)
        continue
      }
      const dst = resolveOut(dir, stem, '.mp3').out
      if (!dry) {
        const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-codec:a', 'libmp3lame', '-q:a', '2', dst])
        if (r.status !== 0) {
          results.push(`✗ ${file}: ffmpeg 转码失败`)
          continue
        }
      }
      const url = `/audio/${path.basename(dst)}`
      const outSize = dry ? 0 : fs.statSync(dst).size
      results.push(`✓ ${file} ${human(inSize)} → ${url}${dry ? '' : ` ${human(outSize)} (-${Math.max(0, 100 - Math.round(outSize / inSize * 100))}%)`}`)
      mdLines.push(`:music-player{src="${url}" title="${stem.replaceAll('"', '')}"}`)
    }
    continue
  }

  // ---- 乐谱：原样复制 ----
  if (SCORE.has(ext)) {
    const dir = path.join(PUB, 'scores')
    if (!dry) fs.mkdirSync(dir, { recursive: true })
    const content = fs.readFileSync(file)
    const { out: dst, reused } = resolveOut(dir, stem, ext, content)
    if (!reused) write(dst, content, dry)
    const url = `/scores/${path.basename(dst)}`
    results.push(`${reused ? '≡' : '✓'} ${file} ${human(inSize)} → ${url}`)
    mdLines.push(`[下载 ${stem}${ext}](${url})`)
    continue
  }

  results.push(`✗ ${file}: 不认识的类型 ${ext}（支持：图片/音频/乐谱，见 pnpm media）`)
}

console.log()
for (const r of results) console.log(`  ${r}`)
if (mdLines.length) {
  console.log(`\n  粘进文章：${dry ? '（--dry 演练，未写入）\n' : '\n'}`)
  for (const m of mdLines) console.log(`  ${m}`)
}
