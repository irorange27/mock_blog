# 本博客 Markdown 扩展语法参考（供 AI 写作时使用）

写 `content/posts/` 下的文章时使用本语法。基于 @nuxt/content 的 MDC 语法。
人类可读的渲染演示见 `content/posts/markdown-extensions.md`。

## 通用规则

- 行内组件 `:name{param="value"}`；块组件 `::name` 开头、`::` 收尾，参数写 `::name{param}`。
- `:spoiler` 这类行内组件的 `:` 前面要有空格，紧跟全角标点会解析失败。
- 未知标签（非本站组件）会被 MDC 解析器报 warning，开发环境已过滤，但不要发明不存在的组件。

## 图片主题适配

透明的黑色单色线稿可在图片后添加 `.dark-ink`，让它在暗色主题中使用浅色线条；透明部分仍显示页面或灯箱自身的背景：

```markdown
![图示说明](/images/diagram.png){.dark-ink}
```

仅用于黑色单色透明图。照片、截图、彩色插图不要添加此标记，以免原图颜色被反转。

## 中文与英文混排中的加粗边界

CommonMark 会根据 `**` 两侧的字符判断它能否作为闭合标记。如果闭合符号前紧邻标点、后紧邻非空白且非标点字符（例如汉字），解析器不会把它当作加粗结束符；星号可能原样显示，也可能与后面的 `**` 错配。例如：

```markdown
**策略（policy）**是智能体用来决定动作的规则。
**采样。**拿到每个动作的概率后，……
```

修正时可以在闭合符号后加空格或自然标点：`**策略（policy）** 是……`；也可以把句号、冒号移出加粗范围：`**采样**。拿到……`、`**第一种**：只有……`。若不适合调整句子，就只加粗中文术语、把英文释义留在括号中：`**策略**（policy）是……`。

## 提示块 Admonition

五种类型：`tip` / `note` / `important` / `warning` / `caution`。块语法，可选 `title`：

```markdown
::warning{title="前置条件"}
正文，可继续用 **加粗**、`行内代码`、[链接](https://example.com)。
::
```

## GitHub 仓库卡片

行内语法，`repo` 支持 `owner/name` 或完整仓库链接：

```markdown
:github{repo="saicaca/fuwari"}
```

## Spoiler 遮罩

行内语法，hover 揭示，注意前面留空格：

```markdown
这是 :spoiler{text="被遮住的文字"} 的效果
```

## ABC 乐谱

块语法，组件内放一个**无语言标注**的围栏代码块，内容为 ABC 记谱，渲染成 SVG，可在浏览器合成播放。可选 `scale` 参数（如 `::abc-score{scale=1.2}`）：

```markdown
::abc-score

```abc-score
X:1
T:标题
M:4/4
L:1/8
C2 C2 G2 G2 | A2 A2 G4 |
```

::

```


## 音频播放器

行内参数语法。`src` 指向 `public/audio/` 下的文件；`cover` 可选，缺省显示音符占位块：

```markdown
:music-player{src="/audio/xxx.wav" title="曲名" artist="作者"}
```

## 复合节拍谱 poly-score

块语法，组件内放**无语言标注**的围栏代码块，每行一个声部：

- 脉冲行（节拍）：`拍号 @速度`，如 `4/4 @72`；可选 `bars=N` 限定小节数。
- 逐音行（旋律）：`4/4 @60 inst=pluck c4 d4 e4 f4 | g4 a4 b4 c' |`。
  - 音符写法 `音名[#/b]八度[时值]`，时值 `w/h/q/e/s`（全/二/四/八/十六分），`.` 附点，`r` 休止；`c'` 高八度、`c,` 低八度，默认中央 C 八度；`|` 仅视觉分隔。
  - 音色 `inst=`：`click`（脉冲行默认）、`tone`（逐音行默认）、`sine`、`square`、`saw`、`pluck`、`bell`。
- 速度含义：`6/8 @120` 即每分钟 120 个八分音符拍点。
- 同速多声部按最小公倍数取整周期，超过 24 拍自动退回默认 4 小节。
- `{staff}` 参数切换五线谱模式（`::poly-score{staff}`）。

示例：

```markdown
::poly-score{staff}
```

4/4 @60 inst=pluck c4 d4 e4 f4 | g4 a4 b4 c' |
4/4 @90 inst=sine c4 d4 e4 f4 | g4 a4 b4 c' |

```
::
```

## 可运行代码块

`js` / `ts` / `python` 三种语言的围栏代码块自动带「运行」按钮，浏览器本地执行：

- `js`/`ts` 跑在 Worker 里，死循环会被超时终止；`ts` 先剥离类型再执行。
- `python` 由 Pyodide 解释，首次点击需联网下载约 10 MB 运行时；代码 import 到的 [Pyodide 内置包](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)会在运行前自动下载加载（`numpy`、`scipy`、`pandas`、`sympy`、`scikit-learn`、BeautifulSoup、Pillow 等约 280 个；import 名与包名不一致也能对上，如 `PIL` 对应 Pillow、`cv2` 对应 opencv-python）。
- 示例必须是自包含可独立运行的脚本（不要放 `def forward(self, x)` 这类依赖外部上下文的片段）。
- `torch`、`tensorflow` 等带原生扩展的大库不在 Pyodide 内置包里，浏览器跑不了，示例用 `numpy` 等价改写；其余不在内置列表里的包同样不可用。
- 输出面板只显示文本，`matplotlib` 等绘图库能 import、能计算，但图不会显示。
- 运行结束会在输出末尾标注结果与耗时；标签页切到后台时，标题栏闪烁提醒。
- 同页多个 Python 块共享一个解释器，前面的块定义的变量后面的块可用。
