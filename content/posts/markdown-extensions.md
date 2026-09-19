---
title: Markdown 扩展语法速查
date: 2026-09-01 15:30:00
categories: '技术杂谈'
tags:
  - 博客
description: 本站 Markdown 支持的扩展语法演示与速查：admonition 提示块、GitHub 仓库卡片、spoiler 遮罩、ABC 乐谱、音频播放器、浏览器可运行代码块。
draft: true
---

本站用 @nuxt/content 的 MDC 语法支持了几个 Markdown 扩展。这篇就是各语法的实际渲染效果，写作时可以直接当速查用。

## 提示块 Admonition

五种类型，MDC 块语法（两个冒号开头、两个冒号收尾），可选 `title` 参数自定义标题：

::tip
小技巧、捷径、顺手的做法写这里。
::

::note
补充说明、背景信息写这里。
::

::important
关键的、不能错过的信息写这里。
::

::warning
容易踩的坑、前置条件写这里。
::

::caution
危险操作、不可逆的后果写这里。
::

带自定义标题的写法：

::tip{title="为什么这样写"}
这是自定义标题的提示块，正文里可以继续用 **加粗**、`行内代码` 和[链接](https://github.com)。
::

## GitHub 仓库卡片

行内语法，`repo` 参数支持 `owner/name` 或完整仓库链接。星数和简介由浏览器端从 GitHub API 拉取，失败时只显示仓库名和头像：

:github{repo="saicaca/fuwari"}

:github{repo="nuxt/content"}

## Spoiler 遮罩

行内语法，hover 时揭示，句中也能用：这是 :spoiler{text="鼠标悬停才能看到的文字"} 的效果，适合埋梗和防剧透。注意 `:` 前面要有空格，紧跟全角标点会解析失败。

## 链接样式

正文里的链接自带主题色下划线，hover 时整条变主色，比如 [fuwari 主题](https://github.com/saicaca/fuwari)，就是本站样式的参考对象。

## ABC 乐谱

块语法，组件内放一个**无语言标注**的围栏代码块，内容为 ABC 记谱，渲染成 SVG 乐谱。点「播放」会加载音色并用浏览器合成播放（首次点击需要等音色下载，需要联网）：

::abc-score
```
X:1
T:小星星（片段）
M:4/4
L:1/8
Q:1/4=100
V:1
C2 C2 G2 G2 | A2 A2 G4 |
```
::

参数 `scale` 可以调整乐谱缩放，如 `::abc-score{scale=1.2}`。

## 音频播放器

行内参数写法，`src` 指向 `public/audio/` 下的音频文件，`cover` 可选（不填则显示音符占位块）：

:music-player{src="/audio/pentatonic-sketch.wav" title="五声音阶小品" artist="生成音频 · C 大调五声"}

上面的音频由 `scripts/generate-demo-audio.mjs` 纯合成而来，无版权顾虑；写文章时换成自己演奏的录音即可。

## 复合节拍谱

块语法，组件内放一个**无语言标注**的围栏代码块，每行一个声部，写法为 `拍号 @速度`，可选 `bars=N` 限定小节数。各行共享一条时间轴：同速时自动按最小公倍数拍数取整周期，虚线标出小节线重新对齐的位置；混速时按真实时间比例展示错拍。「播放节拍」用浏览器直接合成节拍器音，不依赖网络：

::poly-score
```
4/4 @72
3/4 @72
```
::

不同速度的写法（`3/4 @108`）：

::poly-score
```
4/4 @72 bars=2
3/4 @108
```
::

声部数量不限，三条也行：4/4@72、3/4@108、5/4@90 恰好等长（各 13.3 秒），每 3.3 秒三条小节线重合一次（3:4:5 的速度关系）：

::poly-score
```
4/4 @72
3/4 @108
5/4 @90
```
::

两条提示：`@` 后面的速度以"每小节分子的一拍"计（`6/8 @120` 即每分钟 120 个八分音符拍点）；同速多声部若最小公倍数拍数超过 24（比如 4/3/5 组合是 60 拍），会自动放弃取整周期、退回默认 4 小节，避免谱面长到没法看。

加 `{staff}` 参数切换成五线谱模式：真五线谱呈现，每行有自己的谱号、拍号和小节线，音符按拍点写成四分音符（Bravura 音乐字体子集，本地加载）：

::poly-score{staff}
```
4/4 @72
3/4 @72
5/4 @90
```
::

每行还可以直接写音符，变成真正的旋律谱：`音名[升降]八度[时值]`，时值 `w/h/q/e/s` 对应全/二/四/八/十六分音符，`.` 附点，`r` 休止，`#`/`b` 升降号；`|` 只是视觉分隔，小节线按拍号自动画。同一段旋律两个速度，就是最直观的 polytempo：旋律相同，快的声部提前结束：

::poly-score{staff}
```
4/4 @60 inst=pluck c4 d4 e4 f4 | g4 a4 b4 c' |
4/4 @90 inst=sine c4 d4 e4 f4 | g4 a4 b4 c' |
```
::

写谱速记（LilyPond 风格，时值数字后缀，八度用 `'` 升、`,` 降，默认中央 C 八度）：`c4` = 中央 C 四分音符；`d8` = 八分音符；`c1` = 全音符；`g4.` = 附点四分；`f#2` = 升 F 二分音符；`c'` = 高八度 do；`c,` = 低八度 do；`r4` = 四分休止。每行还可以用 `inst=名字` 指定合成音色：`click`（节拍声，脉冲行默认）、`tone`（三角波，逐音行默认）、`sine`、`square`、`saw`、`pluck`（拨弦）、`bell`（铃音）。播放时逐音行按音高合成旋律，脉冲行合成节拍，多声部用不同音色更好分辨。

## 可运行代码块

`js` / `ts` / `python` 三种语言的围栏代码块右上角会多一个「运行」按钮，点击后代码在浏览器本地执行，输出直接显示在代码块下方。`js` 与 `ts` 跑在独立的 Worker 线程里，死循环会被超时终止；`python` 由 Pyodide（WebAssembly 版 CPython）在本页内解释执行，首次点击需联网下载约 10 MB 运行时，之后走缓存。

```js
const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2))
console.log('斐波那契前 10 项:', Array.from({ length: 10 }, (_, i) => fib(i)))
```

TypeScript 代码会先剥离类型标注再执行，类型别名、参数标注这些写法都能直接跑：

```ts
type Vec = number[]
const dot = (a: Vec, b: Vec): number => a.reduce((s, x, i) => s + x * b[i], 0)
console.log('点积 =', dot([1, 2, 3], [4, 5, 6]))
```

Python 侧代码 import 到的 [Pyodide 内置包](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)（`numpy`、`scipy`、`pandas`、`sympy` 等）会在运行前自动加载，适合放注意力、归一化这类小演示：

```python
import numpy as np

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

q = k = v = np.random.default_rng(0).standard_normal((3, 4))
attn = softmax(q @ k.T / np.sqrt(4))
print('注意力权重:\n', attn.round(3))
print('输出:\n', (attn @ v).round(3))
```

注意两点：示例要写成能独立跑通的自包含脚本（`def forward(self, x)` 这类方法片段单独运行会报错）；`torch` 等带原生扩展的库不在 Pyodide 发行版里，浏览器跑不了，演示请用 `numpy` 等价改写。另外，同一页面内的 Python 块共享一个解释器，前一个块定义的变量后一个块可以接着用。






