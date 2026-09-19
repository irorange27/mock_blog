// 生成演示音频：C 大调五声音阶小品（合成拨弦音色），写入 public/audio/。
// 纯合成，无版权问题；输出 16-bit PCM 单声道 WAV。
// 用法：node scripts/generate-demo-audio.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const SR = 32000
const BPM = 88
const BEAT = 60 / BPM

// [音名, 起始拍, 时值(拍)]，C4 = MIDI 60
const PENTA = { C: 0, D: 2, E: 4, G: 7, A: 9 }
const melody = [
  ['C4', 0, 1], ['E4', 1, 1], ['G4', 2, 1], ['A4', 3, 1],
  ['G4', 4, 1], ['E4', 5, 1], ['C4', 6, 2],
  ['D4', 8, 1], ['E4', 9, 1], ['G4', 10, 1], ['A4', 11, 1],
  ['E4', 12, 1], ['D4', 13, 1], ['C4', 14, 2],
]
const bass = [
  ['C3', 0, 4], ['C3', 4, 4], ['A2', 8, 4], ['G2', 12, 4],
]

function freqOf(note) {
  const m = note.match(/^([A-G])(\d)$/)
  const midi = PENTA[m[1]] + (Number(m[2]) + 1) * 12
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const totalBeats = 16 + 2 // 留 2 拍收尾衰减
const N = Math.ceil(totalBeats * BEAT * SR)
const buf = new Float64Array(N)

function pluck(f, startBeat, beats, amp, tau) {
  const start = Math.round(startBeat * BEAT * SR)
  const len = Math.ceil(beats * BEAT * SR * 3) // 衰减拖尾可超出记谱时值
  for (let i = 0; i < len; i++) {
    const idx = start + i
    if (idx >= N) break
    const t = i / SR
    const env = Math.exp(-t / tau)
    const v =
      Math.sin(2 * Math.PI * f * t) +
      0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / (tau * 0.5)) +
      0.12 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t / (tau * 0.3))
    buf[idx] += amp * env * v
  }
}

for (const [n, s, d] of melody) pluck(freqOf(n), s, d, 0.5, 0.3)
for (const [n, s, d] of bass) pluck(freqOf(n), s, d, 0.22, 1.0)

// 归一化到 0.85 峰值
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]))
const gain = 0.85 / peak

const pcm = Buffer.alloc(N * 2)
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * gain * 32767))), i * 2)
}

const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + pcm.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(SR, 24)
header.writeUInt32LE(SR * 2, 28)
header.writeUInt16LE(2, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(pcm.length, 40)

const out = resolve(process.cwd(), 'public/audio/pentatonic-sketch.wav')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.concat([header, pcm]))
console.log(`written: ${out} (${(N / SR).toFixed(1)}s)`)
