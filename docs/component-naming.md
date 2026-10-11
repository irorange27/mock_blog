# 组件命名与身份 class 约定

每个 Vue 组件的根元素挂一个身份 class。用途：浏览器 DevTools 的 Elements 面板里靠 class 名认出「这块 DOM 是什么业务部位」。

命名按**业务角色**，不按实现形态：名字回答「这个东西在页面里是干什么的」（`author-profile` 博主资料、`recent-moments` 最近动态、`site-nav` 站点导航），不回答「它长什么样、由什么标签实现」。`gh`、`toc` 这类通行缩写可以直接用；要靠猜的缩写（`adm`、`fab`）和只说形态不说内容的词（`widget-card`）不合格。组件文件名跟 class 同一语义（`AuthorProfile.vue` → `author-profile`），过时的名字（如早已平铺无卡片的 `*Card`）连文件名一起改。

## 规则

1. **身份 class 与样式 class 分离**：新建组件加的标记 class（`site-nav`、`author-profile`、`recent-moments` 这批）禁止写任何 CSS 选择器引用，样式一律走 Tailwind 工具类或 main.css 里的独立样式类（如 `.paper`、`.widget-card`）。
2. **历史样式类是已知例外**：`.admonition`、`.github-card`、`.table-of-contents`、`.music-player`、`.abc-score`、`.poly-score`、`.spoiler` 原本就是样式挂载点，语义化改名后兼任身份名，允许被选择器引用。给这类改名时必须连 CSS 选择器一起改；不要把新的身份标记变成样式挂载点。
3. 新建组件时根部顺手带上身份 class；改名时文件名、class、引用同步。
4. 无根元素的组件（如 `content/` 下的 Admonition 薄包装、`CodeCopy.vue` 等注入式增强器）不用加，DOM 里自然继承或已语义命名。
5. `content/` 下的 MDC 组件文件名对应 Markdown 里的 `:xxx` 用法，改名会破坏全站文章，不要动。
