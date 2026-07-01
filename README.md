# Novic.cc

基于 Astro 7 的个人博客，静态输出、运行时几乎零 JS。

## 内容结构

博客内容分为两个集合，分别对应不同路由：

| 集合 | 目录 | 路由 | 列表顺序 |
| :--- | :--- | :--- | :--- |
| **Articles**（技术文章） | `src/content/articles/` | `/articles/`、`/articles/tags/[tag]/`、`/articles/[...slug]/` | 按创建时间倒序（最新在上） |
| **Notes**（学习笔记） | `src/content/notes/<topic>/` | `/notes/`、`/notes/[topic]/`、`/notes/[topic]/[...slug]/` | 主题内按时间正序（从旧到新） |

- **Articles** 顶部列出所有 tag（带计数），点击进入该 tag 的独立文章列表页。
- **Notes** 按主题分目录存放（目录名即英文 slug），首页展示主题卡片，点击进入主题内笔记列表。主题元数据定义在 `src/consts.ts` 的 `NOTES_TOPICS`。

首页仅保留一个左对齐的大号 `Welcome!` 标题与一行 `Still working on`。

## 技术栈

| 类别 | 选型 | 说明 |
| :--- | :--- | :--- |
| 框架 | Astro 7 | 岛屿架构，默认纯静态输出 |
| 内容 | Content Collections + Glob Loader | 本地 Markdown/MDX，带类型校验与查询；`articles` 与 `notes` 两个集合 |
| 排版 | MDX | 支持在文章中嵌入组件 |
| 样式 | Tailwind CSS v4 + Typography | 通过 `@tailwindcss/vite` 接入，`@plugin` 引入排版 |
| 字体 | Atkinson | `public/fonts/` 下 woff 文件，`global.css` 中 `@font-face` |
| 代码块 | Expressive Code + 行号插件 | 语法高亮、行号、复制、行高亮、diff |
| 锚点 | rehype-slug + rehype-autolink-headings | 标题自动加 id 与 `#` 锚点链接 |
| 目录 | `render()` 返回的 headings | 文章与笔记均带侧边 TOC |
| 订阅 | @astrojs/rss | `/rss.xml`，同时输出 articles 与 notes |
| SEO | @astrojs/sitemap | `sitemap-index.xml` |
| 搜索 | Pagefind + Component UI | 构建期生成索引，搜索入口在导航栏右侧（按钮 + `⌘K` / `Ctrl+K` 模态弹窗） |

Markdown 处理器使用 `@astrojs/markdown-remark` 的 `unified()`（见 `astro.config.mjs`），以支持上述 rehype 插件。

## 视觉

导航栏采用透明背景 + 毛玻璃（`bg-transparent backdrop-blur-md`），中间三个按钮 `Home / Articles / Notes` 采用 legacy-2024 风格：选中项加粗并带 accent 色下划线，按 URL 前缀匹配高亮。右侧依次为搜索按钮（触发 `<dialog>` 模态）与 RSS 图标（SVG）。

色板复刻 legacy-2024，定义在 `src/styles/global.css` 的 `:root`：

- `--white: 240, 237, 230`（标题）
- `--gray: 159, 140, 96`（暗金，正文辅助色、Footer "All rights reserved"）
- `--gray-light: 229, 233, 240`（正文）
- `--accent: #8a23ff`

## 项目结构

```text
/
├── public/
│   ├── background.jpg            # 站点背景图
│   ├── favicon.svg
│   ├── favicon.ico
│   └── fonts/                    # Atkinson woff 字体
├── src/
│   ├── components/
│   │   ├── BaseHead.astro        # <head> 元信息、OG/Twitter、canonical
│   │   ├── Header.astro          # 透明导航栏 + 中间按钮 + 搜索模态 + RSS 图标
│   │   ├── Footer.astro          # 暗金 "All rights reserved"
│   │   ├── FormattedDate.astro
│   │   └── Toc.astro             # 侧边目录
│   ├── content/
│   │   ├── articles/             # 技术文章（.md / .mdx）
│   │   └── notes/                # 学习笔记，按主题分子目录
│   │       ├── single-variable-calculus/
│   │       └── multivariable-integration/
│   ├── layouts/
│   │   ├── Layout.astro          # 基础布局
│   │   ├── ArticleLayout.astro   # 文章布局（prose + 目录 + tags）
│   │   └── NoteLayout.astro      # 笔记布局（prose + 目录 + 主题回链）
│   ├── pages/
│   │   ├── index.astro           # 首页（Welcome! + Still working on）
│   │   ├── 404.astro
│   │   ├── rss.xml.ts            # 同时输出 articles + notes
│   │   ├── articles/
│   │   │   ├── index.astro       # 文章列表 + tag 云
│   │   │   ├── [...slug].astro   # 单篇文章
│   │   │   └── tags/[tag].astro  # 标签独立页
│   │   └── notes/
│   │       ├── index.astro       # 主题卡片
│   │       └── [topic]/
│   │           ├── index.astro   # 主题内笔记列表（从旧到新）
│   │           └── [...slug].astro
│   ├── styles/
│   │   └── global.css            # Tailwind 入口 + Atkinson 字体 + legacy 色板 + 背景图
│   ├── consts.ts                 # SITE 信息 + NOTES_TOPICS 主题元数据
│   └── content.config.ts         # articles / notes 集合定义与 schema
├── astro.config.mjs
├── ec.config.mjs                 # Expressive Code 配置（行号插件等）
├── patches/                      # pnpm patch 补丁（见下方"已知工具链修复"）
├── pnpm-workspace.yaml           # 含 patchedDependencies
├── tsconfig.json
└── package.json
```

## 常用命令

所有命令在项目根目录执行：

| 命令 | 作用 |
| :--- | :--- |
| `pnpm install` | 安装依赖（会自动应用 `patches/` 下的补丁） |
| `pnpm dev` | 启动开发服务器（`localhost:4321`） |
| `pnpm check` | TypeScript / Astro 类型检查 |
| `pnpm build` | 构建生产站点到 `./dist/`，并运行 Pagefind 生成搜索索引 |
| `pnpm preview` | 本地预览构建产物（搜索在此时可用） |
| `pnpm astro ...` | 运行 Astro CLI，如 `astro add`、`astro check` |

> 注意：Pagefind 索引在 `pnpm build` 时生成，因此搜索功能仅在 `pnpm preview` 或部署后可用，开发模式下会显示提示。

## 写文章 / 笔记

**Articles** 在 `src/content/articles/` 下新建 `.md` 或 `.mdx`：

```yaml
---
title: '文章标题'
description: '摘要，会显示在列表与 SEO 中'
pubDate: 2025-07-01          # 发布日期
updatedDate: 2025-07-03      # 可选，更新日期
tags: ['astro', '教程']      # 可选，默认 []
draft: false                 # 可选，true 时生产构建会排除、dev 下可见
heroImage: '/path/to/img'    # 可选，OG/Twitter 分享图
---
```

**Notes** 在 `src/content/notes/<topic>/` 下新建 `.md` 或 `.mdx`（`<topic>` 须为 `NOTES_TOPICS` 中已定义的 slug）：

```yaml
---
title: '笔记标题'
description: '摘要'
pubDate: 2025-06-10
updatedDate: 2025-06-12      # 可选
draft: false                 # 可选
---
```

新增 Notes 主题时，在 `src/consts.ts` 的 `NOTES_TOPICS` 中追加 `{ slug, title, description }`，并建立对应的内容子目录。

代码块由 Expressive Code 渲染，支持 `showLineNumbers`、`{2,4}` 行高亮、`title="..."` 标题等语法。

## 配置

- **站点地址**：`astro.config.mjs` 中的 `site` 字段（当前为 `https://novic.cc`），RSS / sitemap / canonical 均依赖它，部署前请确认。
- **站点信息**：`src/consts.ts` 中的标题、描述、作者，以及 Notes 主题元数据。

## 已知工具链修复：MDX 代码块 inline style 解析失败

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
import styleToJs from 'style-to-js'

// 修复后
import * as styleToJsNS from 'style-to-js'
const _d = styleToJsNS.default
const styleToJs = /** @type {any} */ (
  typeof _d === 'function' ? _d :
  typeof _d?.default === 'function' ? _d.default :
  typeof styleToJsNS === 'function' ? styleToJsNS :
  _d
)
```

补丁文件：`patches/hast-util-to-estree@3.1.3.patch`；声明在 `pnpm-workspace.yaml` 的 `patchedDependencies`。`pnpm install` 会自动应用，无需手动操作。

> 该补丁仅影响 MDX 编译期的 style 解析，不改变运行时产物，对纯 `.md` 文章无副作用。若上游 `hast-util-to-estree` 或 rolldown 修复了 interop，可移除该补丁。

## 了解更多

- Astro 文档：<https://docs.astro.build>
- Tailwind CSS v4：<https://tailwindcss.com>
- Expressive Code：<https://expressive-code.com>
- Pagefind：<https://pagefind.app>
