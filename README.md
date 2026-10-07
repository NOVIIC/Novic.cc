# Novic.cc

基于 Astro 7 的静态博客网站

## 技术栈

| 类别   | 选型                                    | 说明                                                                                    |
| :----- | :-------------------------------------- | :-------------------------------------------------------------------------------------- |
| 框架   | Astro 7                                 | 岛屿架构，默认纯静态输出                                                                |
| 内容   | Content Collections + Glob Loader       | 本地 Markdown/MDX，带类型校验与查询；`articles` 与 `notes` 两个集合                     |
| 排版   | MDX                                     | 支持在文章中嵌入组件                                                                    |
| 样式   | Tailwind CSS v4 + Typography            | 通过 `@tailwindcss/vite` 接入，`@plugin` 引入排版                                       |
| 字体   | Atkinson / HarmonyOS Sans SC / Maple Mono | `src/fonts/` 下 woff2 文件，由 `vite-plugin-font` 扫描引用并注入                        |
| 代码块 | Expressive Code                         | 行号、折叠段、标题链接等插件（配置集中在 `src/utils/render-config.mjs`）                |
| 数学   | remark-math + rehype-katex              | KaTeX 渲染行内/块级公式                                                                 |
| 锚点   | rehype-slug + rehype-autolink-headings  | 标题自动加 id 与 `#` 锚点链接                                                           |
| 目录   | `render()` 返回的 headings              | 文章与笔记均带侧边 TOC（移动端为 MobileToc）                                            |
| 订阅   | @astrojs/rss                            | `/rss.xml`，同时输出 articles 与 notes                                                  |
| SEO    | @astrojs/sitemap                        | `sitemap-index.xml`（`/editor` 已过滤）                                                 |
| 搜索   | Pagefind + Component UI                 | 构建期生成索引，搜索入口在导航栏右侧（按钮 + `⌘K` / `Ctrl+K` 模态弹窗）                 |
| 编辑器 | CodeMirror + Preact                     | `/editor/` 静态 MDX 编辑器（`src/editor/`），文件系统访问 API，noindex                  |

Markdown 处理器使用 `@astrojs/markdown-remark` 的 `unified()`（见 `astro.config.mjs`），remark/rehype 插件列表与编辑器预览共用同一份配置 `src/utils/render-config.mjs`，GFM 与智能标点已收进共享列表（故 `astro.config.mjs` 中 `gfm: false`、`smartypants: false`）。

## 项目结构

```text
/
├── public/
│   ├── background.jpg            # 站点背景图
│   ├── favicon.ico               # 16/32/48 多尺寸 ICO（主站与 editor 共用）
│   ├── favicon-16x16.png / favicon-32x32.png
│   ├── apple-touch-icon.png      # 180x180，源图在 brand/logo.png
│   ├── editor/                   # editor 的 Service Worker
│   ├── editor-icons/             # editor PWA 图标（192/512）
│   └── manifest-editor.json      # editor PWA manifest
├── src/
│   ├── assets/icons/             # 图标资源
│   ├── components/
│   │   ├── BaseHead.astro        # <head> 元信息、OG/Twitter、canonical
│   │   ├── Header.astro          # 透明导航栏 + 搜索模态 + RSS 图标
│   │   ├── Footer.astro
│   │   ├── ContentLayout.astro   # 内容页布局骨架（侧边栏插槽等）
│   │   ├── ArticleCard.astro     # 文章卡片（含字数统计）
│   │   ├── TopicCard.astro       # Notes 主题卡片
│   │   ├── CardLink.astro        # 卡片链接基件
│   │   ├── TagCloud.astro        # 标签云
│   │   ├── Toc.astro / MobileToc.astro   # 侧边目录 / 移动端目录
│   │   ├── NotesNav.astro / NotesNavMobile.astro / NotesTree.astro  # Notes 导航树
│   │   ├── BackButton.astro      # 返回按钮
│   │   └── FormattedDate.astro
│   ├── content/
│   │   ├── articles/             # 技术文章（.md / .mdx），按年份分子目录
│   │   └── notes/                # 学习笔记，按主题分子目录（每个主题含 intro.md(x)）
│   ├── editor/                   # /editor 静态 MDX 编辑器（CodeMirror、预览、滚动同步等）
│   ├── fonts/                    # woff2 字体（Atkinson / HarmonyOS Sans SC / Maple Mono）
│   ├── layouts/
│   │   ├── Layout.astro          # 基础布局
│   │   ├── ArticleLayout.astro   # 文章布局（prose + 目录 + tags）
│   │   └── NoteLayout.astro      # 笔记布局（prose + 目录 + 主题导航）
│   ├── pages/
│   │   ├── index.astro           # 首页（Welcome! + Still working on）
│   │   ├── 404.astro
│   │   ├── rss.xml.ts            # 同时输出 articles + notes
│   │   ├── editor/index.astro    # 静态 MDX 编辑器（noindex）
│   │   ├── articles/
│   │   │   ├── index.astro       # 文章列表 + tag 云
│   │   │   ├── [...slug].astro   # 单篇文章
│   │   │   └── tags/[tag].astro  # 标签独立页
│   │   └── notes/
│   │       ├── index.astro       # 主题卡片
│   │       ├── tags/[tag].astro  # 按标签聚合的主题列表
│   │       └── [topic]/
│   │           ├── index.astro   # 主题内笔记列表（从旧到新）
│   │           └── [...slug].astro
│   ├── styles/
│   │   └── global.css            # Tailwind 入口 + 字体变量 + 背景图
│   ├── utils/
│   │   ├── notes.ts              # Notes 主题树 / 标签聚合 / 路径解析
│   │   ├── reading.ts            # 正文字数统计（中文 + 英文单词）
│   │   └── render-config.mjs     # 主站与编辑器预览共用的 remark/rehype/EC 配置
│   ├── consts.ts                 # SITE 信息
│   └── content.config.ts         # articles / notes 集合定义与 schema
├── scripts/
│   └── generate-icons.mjs        # pnpm icons：从 brand/logo.png 生成各类图标
├── brand/logo.png                # 站点 Logo 源图
├── astro.config.mjs
├── ec.config.mjs                 # Expressive Code 配置（消费 render-config.mjs 的 ecOptions）
├── patches/                      # pnpm patch 补丁（见下方"工具链修复"）
├── pnpm-workspace.yaml           # 含 patchedDependencies / overrides
├── tsconfig.json
└── package.json
```

## 常用命令

所有命令在项目根目录执行：

| 命令             | 作用                                                            |
| :--------------- | :-------------------------------------------------------------- |
| `pnpm install`   | 安装依赖（会自动应用 `patches/` 下的补丁）                      |
| `pnpm dev`       | 启动开发服务器（`localhost:4321`）                              |
| `pnpm check`     | Astro 类型检查 + remark lint 内容校验（`--frail`）              |
| `pnpm build`     | 构建生产站点到 `./dist/`，并运行 Pagefind 生成搜索索引          |
| `pnpm preview`   | 本地预览构建产物（搜索在此时可用）                              |
| `pnpm format`    | Prettier 格式化全仓库                                           |
| `pnpm md`        | Prettier 格式化 + remark 校验内容                               |
| `pnpm icons`     | 从 `brand/logo.png` 重新生成 favicon / PWA 图标                 |
| `pnpm astro ...` | 运行 Astro CLI，如 `astro add`、`astro check`                   |

> 注意：Pagefind 索引在 `pnpm build` 时生成，因此搜索功能仅在 `pnpm preview` 或部署后可用

## 写文章

**Articles** 在 `src/content/articles/<年>/` 下新建 `.md` 或 `.mdx`（目录名即四位年份，如 `2026/`；文章 URL 自动为 `/articles/<年>/<slug>/`）：

```yaml
---
title: '文章标题'
description: '摘要，会显示在列表与 SEO 中'
pubDate: 2025-07-01 # 发布日期
updatedDate: 2025-07-03 # 可选，更新日期
tags: ['astro', '教程'] # 可选，默认 []
draft: false # 可选，true 时生产构建会排除、dev 下可见
heroImage: '/path/to/img' # 可选，OG/Twitter 分享图
---
```

**Notes** 在 `src/content/notes/<topic>/` 下新建 `.md` 或 `.mdx`（`<topic>` 为英文 slug，即主题目录名）：

```yaml
---
title: '笔记标题'
description: '摘要'
pubDate: 2025-06-10
updatedDate: 2025-06-12 # 可选
tags: ['数学'] # 可选，默认 []
draft: false # 可选
---
```

新增 Notes 主题时，直接建立 `src/content/notes/<topic>/` 目录，并在其中放一个 `intro.md(x)` 作为主题介绍——主题的标题、描述与 tags 均取自它的 frontmatter（主题卡片排序按 intro 的 `pubDate` 正序）。没有 intro 的主题会退化为以目录名作为标题。生产构建会排除 `draft: true` 的主题（以 intro 为准）与笔记。

## 配置

- **站点地址**：`astro.config.mjs` 中的 `site` 字段（当前为 `https://novic.cc`），RSS / sitemap / canonical 均依赖它，部署前请确认。
- **站点信息**：`src/consts.ts` 中的标题、描述、作者。
- **渲染行为**：remark/rehype/Expressive Code 配置集中在 `src/utils/render-config.mjs`，主站构建与编辑器预览共用，调整渲染只改这一份。

## 工具链修复：MDX 代码块 inline style 解析失败

### 现象

任何 MDX 文件中包含代码块（含语言标签）时，`pnpm build` 报错：

```
Could not parse `style` attribute on `span`
  Caused by: styleToJs is not a function
```

普通 `.md` 文件不受影响，仅 `.mdx` 触发。

### 根因

一条由三件工具拼接出的 interop 失败链：

1. **Expressive Code 的 shiki 插件** 对代码块做语法高亮时，给每个 token 生成 `InlineStyleAnnotation`，最终在 hast 里产出 `<span style="color:...">` 节点（见 `@expressive-code/plugin-shiki` 与 `@expressive-code/core` 的 `setInlineStyles` / `h("span", { style: ... })`）。这是 EC 的固有行为，无法通过配置关闭。
2. **MDX 编译器**（`@astrojs/mdx` → `hast-util-to-estree`）在把 hast 转成 estree 时，遇到带 `style` 属性的元素会调用 `style-to-js` 把 CSS 字符串解析成对象。`hast-util-to-estree` 用的是 `import styleToJs from 'style-to-js'` 这种 ESM default import。
3. **rolldown**（Astro 7 / Vite 8 底层打包器）对 CJS 模块 `style-to-js` 做 ESM interop 时，不按 Node 的标准 `default = module.exports` 规则，而是把整个 `module.exports` 再包一层成 `ns.default`（即函数实际在 `ns.default.default`）。于是 `import styleToJs from 'style-to-js'` 拿到的是一个命名空间对象而非函数，调用时抛 `styleToJs is not a function`。

链路：MDX 代码块 → EC 注入 `<span style>` → `hast-util-to-estree` 调 `styleToJs()` → rolldown CJS interop 形状不对 → 崩。

### 修复

用 `pnpm patch` 给 `hast-util-to-estree@3.1.3` 打补丁，把单层 default import 改成兼容多种 interop 形状的命名空间解包：

```js
// 修复前
import styleToJs from 'style-to-js';

// 修复后
import * as styleToJsNS from 'style-to-js';
const _d = styleToJsNS.default;
const styleToJs = /** @type {any} */ (
	typeof _d === 'function'
		? _d
		: typeof _d?.default === 'function'
			? _d.default
			: typeof styleToJsNS === 'function'
				? styleToJsNS
				: _d
);
```

补丁文件：`patches/hast-util-to-estree@3.1.3.patch`；声明在 `package.json` 与 `pnpm-workspace.yaml` 的 `patchedDependencies`。`pnpm install` 会自动应用，无需手动操作。

> 该补丁仅影响 MDX 编译期的 style 解析，不改变运行时产物，对纯 `.md` 文章无副作用。若上游 `hast-util-to-estree` 或 rolldown 修复了 interop，可移除该补丁。
