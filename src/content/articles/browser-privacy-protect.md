---
title: '隐私优先的日用浏览器选择与设置'
description: '在不影响日常浏览网页体验下最大化保护浏览器指纹等个人信息'
pubDate: 2026-07-22
tags: ['Web', '小技巧']
draft: true
---

最近在考虑换浏览器，于是顺带着研究了一下隐私保护设置

## Brave

还记得当年 Microsoft Edge 换了 Chromium 内核，我一用，发现竟如此舒适，于是便换掉了 Chrome，这么多年来一直都使用 Edge 。几个月前我开始研究 Web 隐私防护相关的东西，了解到 Brave 浏览器，自带 Shield 功能，做了不少隐私方面的优化。于是便换过去试了试。

但是，几个月用下来， Brave 主要遇到了两个痛点：

1. 网页消息推送依赖 Google Service ，如果禁用就完全收不到消息通知了。这应该也是所有 Chromium 的通病（除了 Edge 有微软自家的推送服务）
2. Brave 的 Container 功能还刚推出没多久，相比 Firefox 还是略显逊色。

于是考虑换到 Firefox 系

选择了 LibreWolf

## LibreWolf

### 安装方式

我最近整了个 scoop ，发现非常好使啊，于是反手就是一个 `scoop search` ，发现真有，于是 `scoop install` 然后就用起来了。

但后来才发现 scoop 版的 LibreWolf 是便携版的，有个大问题，并且官方没有很好的解决方案。  
我在此直接 [引用官方原文](https://github.com/ltGuillaume/LibreWolf-Portable#pinning-librewolf-to-the-taskbar)

> #### Pinning LibreWolf to the taskbar
>
> If you choose to pin a running LibreWolf window to the taskbar, you'll actually pin librewolf.exe, not LibreWolf-Portable.exe. As such, the next time you start LibreWolf via the pinned taskbar icon, you'll start a non-portable LibreWolf instance which will create a profile inside %AppData%\LibreWolf\Profiles. Registry traces and other files that the portable launcher would normally clean up will all stay on your system. While you can manually pin LibreWolf-Portable.exe to the taskbar to prevent this, it will cause a separate LibreWolf icon to show up once you run LibreWolf.

简单来说就是没法优雅地固定到任务栏。

并且 Portable 版在每次关闭后会清理掉一些缓存文件，而这实际上会延迟下次加载所需的时间。

所以如果是作为主力浏览器，不要用 scoop 装。

令我惊喜的是 LibreWolf 有 Microsoft Store 版本。这个很不错。我不需要在电脑上多运行一个软件的更新检查器了。

## To Be Continued
