---
title: '从 0 开始创建个人网站'
description: '使用 OpenCode ，从 0 开始建一个 Astro v7 个人博客网站'
pubDate: 2026-07-01
updatedDate: 2026-07-05
tags: ['AI', 'Web', '开发']
---

## 欢迎来到 **Novic.cc**

我在 23 年就购入了这个域名，并尝试建立一个个人网站。

那时，我还完全没有相关经验， AI 也远没到今天这种水平，所以我边学前端三件套，边慢慢折腾。我先是使用 Gatsby.js ，套用它的博客模板尝试自己改。后来又换 Astro 重写了一次（依然是套用模板），花了挺长时间在修改主题色和背景上。现在这个网站的背景便是沿用了那一版的设计。

但我当时折腾这些并不是真的想写博客，而主要是想试着自己建一个网站。因此在把背景主题调得让自己满意之后就没有继续了（甚至示例文章和模板里的 github 链接之类的都没换）。之后我在折腾虚拟组网时，把一些局域网内链接添加到了网站上方便我自己访问。之后就很久没有更新这个网站了。那是 24 年。

## 再次建站

### 心血来潮

最近，突然又重拾了建站的想法。买了个域名摆在这里，总得利用起来，是吧？  
并且现在的 AI 前端也相当强了。遂决定整个厉害点的模型，依旧使用 Astro ，从 0 开始写个博客网站。

御三家的模型大抵是不好整的。思索之后，决定开个 OpenCode GO 尝试一下 GLM5.2 ，顺便试试 OpenCode 。

### 开发环境搭建

目前我日用的环境是 VSCode + ClaudeCode Extension + DeepSeek V4 Pro

这次要用 OpenCode ，一开始的想法自然也是整个 VSCode 扩展

扩展要求先装 cli （我的评价是不如 ClaudeCode 扩展那样内嵌一个）

于是打开官网文档看看如何安装

众所周知目前的 AI 模型对 Bash 命令表现最好，而 OpenCode 在 Windows 上并不像 ClaudeCode 那样使用 Git Bash ，因此比较好的方式是使用 WSL （这也是官方推荐的方式）。

在我的 Debian WSL 里安装好 OpenCode 后下载了 VSCode 扩展，然后发现这个扩展...实在有些难说，其实就是分出一个窗口打开终端的 TUI ...与 ClaudeCode 和 Codex 的 GUI 相比差远了。我直接就是一个绷不住了，然后卸载了扩展。

在 [官方 WSL 文档](https://opencode.ai/docs/windows-wsl) 中看到，GUI 有 **Win 桌面应用 + WSL 服务器** 和 **Win 浏览器 + WSL 服务器** 两种方式

两种都试了一下，然后发现 OpenCode 桌面应用纯纯 Web 套壳（最近好像还看到说从 Tauri 换 Electron 了）。那么对于我来说完全没必要安装桌面应用， WSL Web 服务器 + Win 浏览器 的方式是更方便舒服的。

至此，开发环境搭建完成。

<div class="text-sm text-white/50">

后话：

我一直以来都是使用 VSCode + Agent 侧边栏的形式进行开发，这次使用 OpenCode 是我第一次在这种 _以 Agent 为核心构建的交互界面_ 下开发。

就我本人来说，我还是经常需要看看文件树和代码（更别说我还要写 mdx ），而 OpenCode 的文件操作界面还是比不上 IDE ，（也不能手动编辑？）而是更贴近于 Github Review 的那种体验。

所以我依旧在我的后台开着 VSCode，两个窗口来回切换。  
（所以 OpenCode 你的 VSCode 扩展能不能做个 GUI 的 QAQ）

</div>

### 选择技术栈

我只敲定了 Astro 7 和 pnpm ，以及提醒要加上格式化工具，其它都是由 AI 建议和设置的。

当前架构如下：

| 类别     | 选型                                                                                          |
| -------- | --------------------------------------------------------------------------------------------- |
| 框架     | Astro v7（静态）                                                                              |
| 内容格式 | Markdown / MDX                                                                                |
| 样式     | Tailwind CSS v4（`@tailwindcss/vite` + Typography 插件）                                      |
| 字体     | 本地 woff，使用 Astro Fonts API                                                              |
| 代码高亮 | Expressive Code（行号、行高亮、复制、diff）                                                   |
| 锚点     | rehype-slug + rehype-autolink-headings                                                        |
| 搜索     | Pagefind（构建期生成索引）                                                                    |
| SEO      | @astrojs/sitemap + canonical + OG/Twitter                                                     |
| RSS     | @astrojs/rss                                                                                 |
| 构建工具 | Vite v8 (rolldown 内核)                                                                       |
| 包管理   | pnpm v11                                                                                      |
| 类型检查 | Astro check + TypeScript v6                                                                   |
| 格式化   | Prettier + prettier-plugin-astro                                                              |

确定技术栈后便让 GLM 5.2 写出了一个初始框架。接下来的开发便是不断向 AI 提出需求，然后验收。  
OpenCode GO 用 GLM 5.2 体感上额度消耗得挺快的，因此我还接入了 DeepSeek 的 API ，小任务使用 DeepSeek V4 Pro 。

就我的体感而言，并没有体会到 GLM 5.2 的前端美术强到什么特别的程度。当然也有可能是因为我的大部分设计细节都自己描述得相当清楚，没有留给它很大的发挥空间。  
（如果我不描述具体一点，它做出来的效果似乎也达不到我的预期）

## 开发过程中的小问题

### 代码能否完全交给 AI

对于这种复杂度较低的小型博客网站，只要手动测试下来没有问题，那其实大抵就是 OK 的。毕竟前端嘛，主要就是视觉效果。

但就我而言，还是会大概扫一遍代码。其实很多相关语法我也不是那么了解，但是大概的结构还是要清楚。

明白项目结构，才能更好地给 AI 提出修改建议，并且在出一些奇奇怪怪的问题时可以更快~~也更省钱~~地排查出来。

一些代码风格上细节也需要主动告诉 AI 怎么写更优雅  
（当然你要是完全不看代码，也不会注意到这些细节。~~就让 AI 写屎山也没事，反正代码量不大，不太容易出事~~）

所以，**总的来说**：

AI 的确让开发网站的门槛和难度降低了非常多。即使你完全没有相关经验，也可以**相当轻松**地做出一个网站（对于你来说最难的一步或许将是搭建开发环境）。  
只要你有设计的想法， AI 就能帮你实现。  
不过，如果完全不看代码，你会需要在 AI 上花费更多的 time 和 money 来达到你要的效果。

因此，我的建议是：**可以不懂语法，但最好不要不懂代码**。在搭建的过程中有意识地去了解熟悉相关逻辑（如果不懂让 AI 解释就好了），去注意一些技术细节，然后才能引导 AI 写出质量更好的代码。

_我目前对前端并不是非常熟悉，这些话不一定正确，仅作为当前的感想，提供一些参考。_

### Debian 上安装 Nodejs 最新 LTS

Debian 13 (Trixie) 默认仓库自带的是 Node.js 20 ，已经终止支持。当前最新 LTS 版本为 24 。

我选择使用 NodeSource + extrepo 安装 Nodejs ，好处是依旧由 apt 托管更新

```bash
# 安装 extrepo
sudo apt update
sudo apt install -y extrepo

# 启用 NodeSource 的 Node.js 24.x 源
sudo extrepo enable node_24.x

# 更新并安装
sudo apt update
sudo apt install -y nodejs

# 验证
node -v   # 应输出 v24.x.x
npm -v    # 应输出 11.x.x
```

卸载：
```bash
sudo extrepo disable node_24.x
sudo rm -f /etc/apt/sources.list.d/extrepo_node_24.x.sources
sudo rm -f /var/lib/extrepo/keys/node_24.x.asc
sudo apt remove --purge nodejs
sudo apt update
```

### 未完待续
