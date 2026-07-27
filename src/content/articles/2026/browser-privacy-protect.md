---
title: '隐私优先的日用浏览器选择与设置'
description: '在不影响日常浏览网页体验下最大化保护浏览器指纹等个人信息'
pubDate: 2026-07-22
updatedDate: 2026-07-27
tags: ['Web', '小技巧']
---

还记得当年 Microsoft Edge 换了 Chromium 内核，我一用，发现竟如此舒适，于是便换掉了 Chrome，这么多年来一直都使用 Edge 。几个月前我开始研究 Web 隐私防护相关的东西，了解到 Brave 浏览器，自带 Shield 功能，做了不少隐私方面的优化。于是便换过去试了试。

## Brave

### 配置

Brave 浏览器是 Chromium 阵营做得比较好的隐私保护浏览器。

直接打开 Shield (设置-屏蔽) 中 _拦截脚本_ 以外的所有屏蔽功能，基本不会影响网页的正常功能。

然后再到 **隐私与安全** 中，把那俩自动重定向、语言指纹识别防护、 DNT 头打开。然后把底下的**遥测信息**都关了。 **安全** 中的 _管理 JavaScript 优化和安全性_ 也可以调一下。  
如果你尝试使用一些技术来隐藏自己的真实 IP ，那么把 **WebRTC IP 处理政策**改为 _禁用无代理的 UDP_ 来避免 WebRTC 泄漏。并在 安全 设置中打开 **使用安全 DNS** 以避免 DNS 泄漏。  
以及如果你的伪装 IP 与真实 IP 不在一个时区，那么可以使用 [Spoof Timezone 扩展](https://chromewebstore.google.com/detail/spoof-timezone/kcabmhnajflfolhelachlflngdbfhboe) 来改变浏览器的时区。

还可以视情况安装 NoScript 扩展来达到更加严格的防护。但这个需要手动维护信任白名单，有些繁琐。 Chrome Web Store 中的是 MV3 的版本，而 Brave 自托管了 MV2 的版本，可能保护能力更强。

然后就可以正常使用了。

### 缺点

几个月用下来， 发现 Brave 还是有一些缺点：

1. 网页消息推送依赖 Google Service ，如果禁用就完全收不到消息通知了。这应该也是所有 Chromium 的通病（除了 Edge 有微软自家的推送服务）
2. Brave 的 Container 功能还刚推出没多久，相比 Firefox 还是略显逊色。
3. Chrome Web Store 即将废除 MV2 ，扩展必须迁移到权限限制更严格的 MV3 。这其实能提升浏览器的安全性和性能，但一些隐私扩展的功能会受到限制。而 Firefox 系目前没有这个问题。不过对于 Brave 来说这其实没什么影响，毕竟它有自己的 Shield ，不需要装 uBlock Origin 这些扩展。
4. 我印象里 Chromium 的安全 DNS 在解析失败时不能 fallback 到默认 DNS ，而 Firefox 可以。因此如果是有在校园网等环境下访问内网网站的需求， Chromium 就不能自定义 DNS ，而 Firefox 可以。（这是我之前使用 Edge 时发现的问题，不知道现状是否依旧如此，目前也没有环境测试。如果有这种需求的可以自行测一下）

于是乎，我又研究上了 Firefox 系

选择了 LibreWolf

## LibreWolf

（ LibreWolf 对 Firefox 进行了一些默认设置的调节和遥测功能的删除。因此直接使用 Firefox 也可以达到比较近似的防护等级，只不过你得手动关闭一些功能）

### 安装方式

我最近整了个 scoop ，发现非常好使啊，于是反手就是一个 `scoop search` ，发现真有，于是 `scoop install` 然后就用起来了。

但后来才发现 scoop 版的 LibreWolf 是便携版的，有个大问题，并且官方没有很好的解决方案。  
我在此直接 [引用官方原文](https://github.com/ltGuillaume/LibreWolf-Portable#pinning-librewolf-to-the-taskbar)

> #### Pinning LibreWolf to the taskbar
>
> If you choose to pin a running LibreWolf window to the taskbar, you'll actually pin librewolf.exe, not LibreWolf-Portable.exe. As such, the next time you start LibreWolf via the pinned taskbar icon, you'll start a non-portable LibreWolf instance which will create a profile inside %AppData%\LibreWolf\Profiles. Registry traces and other files that the portable launcher would normally clean up will all stay on your system. While you can manually pin LibreWolf-Portable.exe to the taskbar to prevent this, it will cause a separate LibreWolf icon to show up once you run LibreWolf.

简单来说就是没法优雅地固定到任务栏。

并且 Portable 版在每次关闭后会清理掉一些缓存文件，而这实际上会增加下次加载所需的时间。

所以如果是作为主力浏览器，不要用 scoop 装。

令我惊喜的是 LibreWolf 有 Microsoft Store 版本。这个很不错。我不需要在电脑上多运行一个软件的更新检查器了。

### 配置

首先，第一次启动便会提示你更改语言设置为 English 。不过如果不常访问英文网站，大抵是没必要开的。

然后来到设置。如果要使用浏览器同步功能，可以打开 Firefox 同步。 LibreWolf 没有额外提供自己的同步服务。

接下来到 **隐私与安全** 。视个人情况配置 DoH （安全 DNS）。 LibreWolf 的默认设置是把隐私设置拉满的，而这可能会影响使用体验。所以，取消勾选 _在 LibreWolf 关闭时清除历史记录_ 。以及关闭 _启用 ResistFingerprinting_ 。我们接下来将细调指纹防护的设置。

在地址栏输入 `about:config` 进入高级首选项，搜索 `privacy.fingerprintingProtection` 将其设置为 true 。

firefox 系内置的指纹防护功能有两个，一个是 RFP `privacy.resistFingerprinting` (也就是我们刚刚在 Librewolf 设置里关闭的那个），一个是 FPP `privacy.fingerprintingProtection` 。他们的区别是，RFP 的防护策略是让所有用户看起来一模一样，因此会强制统一所有指纹设置，而这样可能会影响我们的部分日常浏览体验；而 FPP 是对指纹数据进行随机化修改，各项防护措施可以都可以选择单独开启或关闭，通过 `privacy.fingerprintingProtection.overrides` 来调节。

FPP 的防护效果的确是不如 RFP 的，但为了尽量不影响日常浏览体验，我还是选择 FPP ，手动调节防护参数。

我的 `privacy.fingerprintingProtection.overrides` 参数设置是:

```
+AllTargets,-CSSPrefersColorScheme,-RoundWindowSize
```

`+AllTargets` 是开启所有防护措施， `-CSSPrefersColorScheme` 允许网站知道我是深色模式还是浅色模式， `-RoundWindowSize`关闭窗口大小取整，这样浏览器打开的时候就不会自动取整窗口（我习惯最大化浏览器窗口使用）。

所有可用参数在 [这里](https://searchfox.org/mozilla-release/source/toolkit/components/resistfingerprinting/RFPTargets.inc) 查看

接下来到扩展

LibreWolf 会自动帮你安装 uBlock Origin 扩展，其它 Firefox 系需手动安装

同样，可以视情况安装 NoScript 扩展来手动筛选可运行的脚本，达到更加严格的防护。

### 缺点

1. Firefox 的指纹防护措施与 Brave 相比是更为强力的，但这也意味着影响日常浏览体验的可能性更高，需要根据遇到的情况手动调节这些防护措施（或者适应这些不便）。如果想要开箱即用的体验，可以只使用 FPP 的默认设置（即不调节 `privacy.fingerprintingProtection.overrides` ）。
2. 市场主流毕竟还是 Chromium ，因此 Firefox 系可能会有兼容性问题。但我在日常浏览中目前没有遇到过问题，只在测试自己开发的 WebGPU 项目时发现 Firefox 的 WebGPU 支持不完整，运行不了。
3. Firefox 系不支持 PWA ，如果你要使用 PWA ，那只能 Chromium 了。

## 其它

在 https://coveryourtracks.eff.org/ 可以了解到浏览器的基本防护信息和相关知识

Edge 和 Chrome 这些浏览器的隐私防护能力肯定是排不上号的。如果真的要用这几个浏览器，推荐在隐私设置里把相关防护拉到最严，并安装 uBlock Origin Lite 、 Canvas Blocker 扩展，以及可选 NoScript。
