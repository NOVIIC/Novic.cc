---
title: 'Markdown 排版能力演示'
description: '标题、列表、引用、代码、表格——一篇用来验证排版的样板。'
pubDate: 2025-07-02
updatedDate: 2025-07-03
tags: ['markdown', '排版']
---

这是一篇用于验证 Markdown 排版的样板文章，覆盖常见元素。

## 文本样式

支持 **加粗**、*斜体*、~~删除线~~、`行内代码`，以及 [链接](https://astro.build)。

## 列表

无序列表：

- 第一项
  - 嵌套项
- 第二项

有序列表：

1. 步骤一
2. 步骤二
3. 步骤三

## 引用

> 简单胜于复杂。
> —— 某位工程师

## 代码块

带行号与语言标签的代码块：

```py showLineNumbers
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("Novic"))
```

## 表格

| 工具         | 作用         | 是否启用 |
| ------------ | ------------ | -------- |
| Astro        | 框架         | ✅       |
| Tailwind     | 样式         | ✅       |
| Pagefind     | 搜索         | ✅       |
| ExpressiveCode | 代码块美化 | ✅       |

## 分隔线

---

正文结束。
