// 浏览器工具栏/状态栏染色的正式通道是 theme-color meta。
// Safari 的怪癖：按 meta 元素缓存解析结果，setAttribute 更新 content 会被
// 无视（首次进入对、切换不跟的原因），必须移除旧元素、插入新元素才重采。
// meta 的 content 是纯字符串，引用不了 CSS 变量，所以运行时把当前生效的
// --page-bg 解析出来写进去：颜色出自 token 单一来源，跟随 --hue 与明暗切换。
// 站点 token 是 oklch，部分浏览器的 meta 解析对它支持不稳，
// 统一换算成 hex 再写入（oklch→sRGB 标准矩阵，无依赖）。
function oklchToHex(oklch: string): string | null {
  const m = oklch.match(/oklch\(\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)/)
  if (!m) return null
  const [L, C, Hdeg] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]
  const h = (Hdeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = L + 0.3963377774 * a + 0.2158037573 * b
  const mm = L - 0.1055613458 * a - 0.0638541728 * b
  const s = L - 0.0894841775 * a - 1.291485548 * b
  const lin = [l ** 3, mm ** 3, s ** 3]
  const rgb = [
    4.0767416621 * lin[0] - 3.3077115913 * lin[1] + 0.2309699292 * lin[2],
    -1.2684380046 * lin[0] + 2.6097574011 * lin[1] - 0.3413193965 * lin[2],
    -0.0041960863 * lin[0] - 0.7034186147 * lin[1] + 1.707614701 * lin[2],
  ]
  const to8 = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055
    return Math.round(Math.min(255, Math.max(0, v * 255)))
  }
  return '#' + rgb.map(c => to8(c).toString(16).padStart(2, '0')).join('')
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const colorMode = useColorMode()

  const sync = () => {
    const token = getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim()
    if (!token) return
    const hex = oklchToHex(token) ?? token
    // 关键：整体移除再插入，而不是 setAttribute——Safari 不重读改过的 meta
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove())
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', hex)
    document.head.appendChild(meta)
  }

  // immediate：首屏也同步一次；明暗切换、跟随系统时都会再触发
  watch(() => colorMode.value, () => nextTick(sync), { immediate: true })
})
