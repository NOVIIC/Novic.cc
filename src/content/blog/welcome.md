---
title: '欢迎来到 Novic.cc'
description: '一个全新的开始 —— 这篇介绍本站用了什么技术栈搭建。'
pubDate: 2025-06-30
tags: ['公告', 'astro']
---

欢迎来到 **Novic.cc**。这是我用 [Astro 7](https://astro.build) 重新搭建的个人博客，
从旧版 `legacy-2024` 分支继承了那张深空背景图，其余则全部基于现代技术栈重写。

## 这个站点用了什么

本站是一套"零运行时 JS"的静态博客，核心依赖如下：

- **Astro 7** 与内容集合（Content Collections + Glob Loader）
- **MDX** 支持
- **Tailwind CSS v4** 与 Typography 插件
- **Expressive Code** 代码块增强
- **Pagefind** 站内搜索
- **RSS** 与 **Sitemap**

## 为什么选 Astro

Astro 的岛屿架构默认输出纯静态 HTML，只在需要交互处局部注水。
对博客这种以内容为主的站点来说，能做到接近零 JS、首屏极快。

> 内容是主角，框架是配角。

后续文章会逐一拆解每一块的配置方式。先从这篇能正常显示开始吧。
