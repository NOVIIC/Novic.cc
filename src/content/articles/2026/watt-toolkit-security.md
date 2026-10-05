---
title: 'Watt Toolkit 加速的隐私安全风险点'
description: '检查 Watt Toolkit 源码发现的一些问题'
pubDate: 2026-08-19
updatedDate: 2026-10-06
tags: ['Web', '安全']
---

## 本地反代

很早我就开始使用 [Watt Toolkit](https://github.com/BeyondDimension/SteamTools) （那时候还叫 Steam++ ）来加速访问 Github、 Steam 等网站。因为这款软件加速这些平台是使用**本地反代**加速，与那些加速器的原理不同。本地反代不需要中转服务器，只在本地对请求进行一些处理（比如隐藏 sni ）来实现连接，本质上仍然是直连。

这不是非常的优雅吗？ ~~而且也很安全？~~ 因此我觉得这种方法真的是 fantastic ，（甚至还赞助了 Watt Toolkit

然而，事实真的有这么美好吗

## 安全隐患

### 根证书

其实我一开始翻源代码是担心自签证书的问题。如果它使用的是统一发放的证书，那么开发者甚至其他用户，只要能拿到我的流量数据（当然本地反代的情况下一般来说是拿不到的），就能解密得到所有原始数据。我觉得这多少是个风险点，应该检查一下源码是怎么实现的。检查发现它的证书是在本地随机生成密钥，并不是统一发放。所以这方面是没有什么问题的。

但是，得到了意外“收获”。

### MITM 风险

我顺便让 AI 给我检查了一下加速的逻辑，确认一下它本地反代的逻辑是不是与我想象的一致。

然后发现，**问题大了**

AI 给我翻出了一个 `ProxyType.ServerAccelerate` 类型，说有这种类型的域名会走服务器中转流量。

？？还有服务器中转？？？

我赶紧去详细研究了一下它这代码是怎么写的

```cs startLineNumber=7 title="[ProxyType.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.Primitives/Enums/Accelerator/ProxyType.cs#L7-L32)"
public enum ProxyType : byte
{
    /// <summary>
    /// 本地代理
    /// </summary>
    Local = 0,

    /// <summary>
    /// 启用重定向
    /// </summary>
    Redirect = 1,

    /// <summary>
    /// 直接成功
    /// </summary>
    DirectSuccess,

    /// <summary>
    /// 直接失败
    /// </summary>
    DirectFailure,

    /// <summary>
    /// 服务器加速
    /// </summary>
    ServerAccelerate,
}
```

从上面可以看到有多种 ProxyType ， Watt 启动时会从一个 url 拉取加速网站列表，里面就是每个网站的相关参数

ServerAccelerate 是直接服务器明文中转，这显然是要 pass 掉的（嘶，其实也不一定，如果只是内容 CDN ，无用户数据，好像没什么大问题

大部分网站都是 Local 和 Redirect 类型，连接到下发的网址或ip  
连接的实际站点理论上应该就是官方网站或者是CDN，这样才能通过 SSL 校验  
_但我不清楚这俩的 SSL 校验会校验原域名还是 Redirect 的域名，如果是后者也是不太行的)_
不过其实不用考虑会校验哪个域名，因为我发现下发的网站配置**几乎全都设置了 IgnoreSSLCertVerification**！

所以可以说这些加速的网站全都可以被 MITM 中间人攻击，全都是不安全的。

### 推测代码这样写的原因

我觉得， Watt 这么写也有它的道理

要知道，我们这个本地反代的核心作用是剥离 sni 信息，但你不发 sni 信息的话，对面的响应证书可不一定是你要的网站

所以直接一刀切了？全部不验证 SSL ？

我认为应该还是有更好的解决方案的。目前正在研究中。

总之目前来看这个代码确实是没有恶意的，但安全隐患是有的。
