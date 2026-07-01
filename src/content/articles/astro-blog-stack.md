---
title: '用 Astro + Tailwind v4 搭建博客的技术栈细节'
description: '从 Content Collections 到 Pagefind，逐个说明每块配置怎么写。'
pubDate: 2025-07-01
tags: ['astro', 'tailwind', '教程']
---

这篇文章记录本站技术栈每一步的关键配置，方便日后回查，也供同样在搭博客的人参考。

## 内容集合

在 `src/content.config.ts` 里用 `glob()` 加载器声明集合，并用 Zod 校验 frontmatter。本站把内容分为 `articles`（技术文章）与 `notes`（学习笔记）两个集合：

```ts title="src/content.config.ts" showLineNumbers
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, notes };
```

### 渲染单篇文章

动态路由 `src/pages/articles/[...slug].astro` 用 `render()` 拿到 HTML 与标题列表：

```ts showLineNumbers
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('articles');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content, headings } = await render(post);
```

## Tailwind v4

Tailwind v4 改用 Vite 插件接入，不再需要 PostCSS 配置：

```js title="astro.config.mjs" {3,8-10}
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: { plugins: [tailwindcss()] },
});
```

CSS 入口只需两行，排版插件用 `@plugin` 引入：

```css title="src/styles/global.css"
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

## Expressive Code

装上 `astro-expressive-code` 后，代码块自动获得语法高亮、行号、复制按钮与行高亮：

```js {2,4} showLineNumbers
const features = ['highlight', 'line-numbers', 'copy'];
features.forEach((f) => console.log(f));
// 上面第 2、4 行会被高亮
features.reverse();
```

## 锚点与目录

`rehype-slug` 给标题加 `id`，`rehype-autolink-headings` 追加可复制的 `#` 链接。
侧边目录则直接用 `render()` 返回的 `headings` 数组生成，无需额外插件。

## 小结

整套配置都是构建期产物，运行时几乎零 JS。
