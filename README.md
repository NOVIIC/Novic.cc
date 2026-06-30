# Novic.cc

基于 Astro 7 的个人博客，静态输出、运行时几乎零 JS。

## 技术栈

| 类别 | 选型 | 说明 |
| :--- | :--- | :--- |
| 框架 | Astro 7 | 岛屿架构，默认纯静态输出 |
| 内容 | Content Collections + Glob Loader | 本地 Markdown/MDX，带类型校验与查询 |
| 排版 | MDX | 支持在文章中嵌入组件 |
| 样式 | Tailwind CSS v4 + Typography | 通过 `@tailwindcss/vite` 接入，`@plugin` 引入排版 |
| 代码块 | Expressive Code + 行号插件 | 语法高亮、行号、复制、行高亮、diff |
| 锚点 | rehype-slug + rehype-autolink-headings | 标题自动加 id 与 `#` 锚点链接 |
| 目录 | `render()` 返回的 headings | 侧边栏目录，无需额外插件 |
| 订阅 | @astrojs/rss | `/rss.xml` |
| SEO | @astrojs/sitemap | `sitemap-index.xml` |
| 搜索 | Pagefind + Component UI | 构建期生成索引，纯前端搜索 |

Markdown 处理器使用 `@astrojs/markdown-remark` 的 `unified()`（见 `astro.config.mjs`），以支持上述 rehype 插件。

## 项目结构

```text
/
├── public/
│   ├── background.jpg        # 站点背景图
│   ├── favicon.svg
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── BaseHead.astro       # <head> 元信息、OG/Twitter、canonical
│   │   ├── Header.astro         # 顶部导航
│   │   ├── Footer.astro
│   │   ├── FormattedDate.astro
│   │   └── Toc.astro            # 侧边目录
│   ├── content/
│   │   └── blog/                # 博客文章（.md / .mdx）
│   ├── layouts/
│   │   ├── Layout.astro         # 基础布局
│   │   └── BlogPost.astro       # 文章布局（prose + 目录）
│   ├── pages/
│   │   ├── index.astro          # 首页（最新文章）
│   │   ├── 404.astro
│   │   ├── search.astro         # Pagefind 搜索页
│   │   ├── rss.xml.ts
│   │   └── blog/
│   │       ├── index.astro      # 文章列表（按年分组）
│   │       └── [...slug].astro  # 单篇文章
│   ├── styles/
│   │   └── global.css           # Tailwind 入口 + 基础样式 + 背景图
│   └── content.config.ts        # blog 集合定义与 schema
├── astro.config.mjs
├── ec.config.mjs                # Expressive Code 配置（行号插件等）
├── tsconfig.json
└── package.json
```

## 常用命令

所有命令在项目根目录执行：

| 命令 | 作用 |
| :--- | :--- |
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 启动开发服务器（`localhost:4321`） |
| `pnpm check` | TypeScript / Astro 类型检查 |
| `pnpm build` | 构建生产站点到 `./dist/`，并运行 Pagefind 生成搜索索引 |
| `pnpm preview` | 本地预览构建产物（搜索在此时可用） |
| `pnpm astro ...` | 运行 Astro CLI，如 `astro add`、`astro check` |

> 注意：Pagefind 索引在 `pnpm build` 时生成，因此搜索功能仅在 `pnpm preview` 或部署后可用，开发模式下会显示提示。

## 写文章

在 `src/content/blog/` 下新建 `.md` 或 `.mdx` 文件，frontmatter 字段如下：

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

代码块由 Expressive Code 渲染，支持 `showLineNumbers`、`{2,4}` 行高亮、`title="..."` 标题等语法。

## 配置

- **站点地址**：`astro.config.mjs` 中的 `site` 字段（当前为 `https://novic.cc`），RSS / sitemap / canonical 均依赖它，部署前请确认。
- **站点信息**：`src/consts.ts` 中的标题、描述、作者。

## 了解更多

- Astro 文档：<https://docs.astro.build>
- Tailwind CSS v4：<https://tailwindcss.com>
- Expressive Code：<https://expressive-code.com>
- Pagefind：<https://pagefind.app>
