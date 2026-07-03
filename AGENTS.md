这是 Novic.cc 博客 静态网站

## 开发

启动开发服务器（后台模式）：

```bash
pnpm astro dev --background
```

管理后台服务：

```bash
pnpm astro dev stop     # 停止
pnpm astro dev status   # 状态
pnpm astro dev logs     # 日志
```

构建与检查：

```bash
pnpm run build          # 构建 + pagefind 搜索索引
pnpm run check          # astro check（类型检查）
pnpm run format         # Prettier 格式化
pnpm run preview        # 预览构建产物
```

## 项目结构

```
src/
├── assets/         # 静态资源
├── components/     # Astro 组件
├── content/        # 内容集合
├── content.config.ts
├── consts.ts       # 常量
├── fonts/          # 字体文件
├── layouts/        # 布局组件
├── pages/          # 页面路由
└── styles/         # 样式
```

`dist/` — 构建输出目录。

## 技术栈

- **框架**: Astro v7
- **样式**: Tailwind CSS v4（`@tailwindcss/vite` + `@tailwindcss/typography`）
- **内容**: MDX + `@astrojs/mdx`
- **搜索**: Pagefind
- **格式化**: Prettier + prettier-plugin-astro
- **包管理**: pnpm
- **Node**: >= 22.12.0

## 参考文档

- [Astro 路由](https://docs.astro.build/en/guides/routing/)
- [Astro 组件](https://docs.astro.build/en/basics/astro-components/)
- [内容集合](https://docs.astro.build/en/guides/content-collections/)
- [样式 & Tailwind](https://docs.astro.build/en/guides/styling/)
- [国际化](https://docs.astro.build/en/guides/internationalization/)
