---
title: 'Watt Toolkit 加速的隐私安全风险点'
description: '检查 Watt Toolkit 源码发现的一些问题'
pubDate: 2026-08-19
tags: ['Web', '安全']
---

## 本地反代

很早我就开始使用 [Watt Toolkit](https://github.com/BeyondDimension/SteamTools) （那时候还叫 Steam++ ）来加速访问 Github、 Steam 等网站。因为这款软件加速这些平台是使用**本地反代**加速，与那些加速器的原理不同。本地反代不需要中转服务器，只在本地对请求进行一些处理（比如隐藏 sni ）来实现连接，本质上仍然是直连。

这不是非常的优雅吗？ ~~而且也很安全？~~ 因此我觉得这种方法真的是 fantastic ，（甚至还赞助了 Watt Toolkit

然而，事实真的有这么美好吗

## 安全隐患

### 根证书

其实我一开始翻源代码是担心自签证书的问题。如果它使用的是统一发放的证书，那么开发者甚至其他用户，只要能拿到我的流量数据（当然本地反代的情况下一般来说是拿不到的），就能解密得到所有原始数据。我觉得这多少是个风险点，应该检查一下源码是怎么实现的。检查发现它的证书是在本地随机生成密钥，并不是统一发放。所有这方面是没有什么问题的。

但是，得到了意外“收获”。

### 中转

我顺便让 AI 给我检查了一下加速的逻辑，确认一下它本地反代的逻辑是不是与我想象的一致。

然后发现，**问题大了**

AI 给我翻出了一个 `ProxyType.ServerAccelerate` 类型，说有这种类型的域名会走服务器中转流量。

？？还有服务器中转？？？

我赶紧去详细研究了一下它这代码是怎么写的

**下面部分内容我还没有彻底清楚，审计脚本还没完全人工复核，结论不一定完全正确。之后会再次更新这篇文章**

### 目前的结论

<details>
<summary>涉及的源代码</summary>

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

### 加速项 DTO 字段

`ForwardDomainNames=key3`、`IgnoreSSLCertVerification=key4`、`FakeServerName=key5`、`ProxyType=key6`：

```cs startLineNumber=146 title="[AccelerateProjectDTO.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.Primitives.Models/Models/Accelerator/AccelerateProjectDTO.cs#L146-L169)"
    [MPKey(3), MP2Key(3)]
    public string ForwardDomainNames
    {
        get => _ForwardDomainName ?? string.Empty;
        set => _ForwardDomainName = value;
    }

    /// <summary>
    /// 忽略 SSL 证书验证
    /// </summary>
    [MPKey(4), MP2Key(4)]
    public bool IgnoreSSLCertVerification { get; set; }

    /// <summary>
    /// 伪装 ServerName
    /// </summary>
    [MPKey(5), MP2Key(5)]
    public string? FakeServerName { get; set; }

    /// <summary>
    /// 代理类型
    /// </summary>
    [MPKey(6), MP2Key(6)]
    public ProxyType ProxyType { get; set; }
```

### ProxyType 与连接行为

`ProxyType` 到 `IsServerSideProxy`、`IPAddress`、`ForwardDestination`、`Destination` 等连接行为属性的投影：

```cs startLineNumber=134 title="[DomainConfig.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.Primitives.Models/Models/Accelerator/Yarp.Configuration/DomainConfig.cs#L134-L197)"
partial class AccelerateProjectDTO : IDomainConfig
{
    bool IDomainConfig.TlsSni => !string.IsNullOrEmpty(FakeServerName);

    string? IDomainConfig.TlsSniPattern => FakeServerName;

    bool IDomainConfig.TlsIgnoreNameMismatch => IgnoreSSLCertVerification;

    IPAddress? IDomainConfig.IPAddress
    {
        get
        {
            if (ProxyType == ProxyType.Local && IPAddress2.TryParse(ForwardDomainNames, out var ip))
            {
                return ip;
            }
            return null;
        }
    }

    string? IDomainConfig.ForwardDestination
    {
        get
        {
            if (ProxyType == ProxyType.Local && !IPAddress2.TryParse(ForwardDomainNames, out var _))
            {
                return ForwardDomainNames;
            }
            return null;
        }
    }

    TimeSpan? IDomainConfig.Timeout => null;

    Uri? IDomainConfig.Destination
    {
        get
        {
            if (ProxyType == ProxyType.Redirect)
            {
                var b = new UriBuilder
                {
                    Scheme = Port == 443 ? Uri.UriSchemeHttps : Uri.UriSchemeHttp,
                    Host = ForwardDomainNames,
                    Port = Port,
                };
                return b.Uri;
            }
            else if (ProxyType == ProxyType.ServerAccelerate)
            {
                var uri = new Uri(ForwardDomainNames);
                return uri;
            }
            return null;
        }
    }

    bool IDomainConfig.IsServerSideProxy => ProxyType == ProxyType.ServerAccelerate;

    string? IDomainConfig.UserAgent => FakeUserAgent;

    IResponseConfig? IDomainConfig.Response => null;

    IReadOnlyDictionary<DomainPattern, IDomainConfig>? IDomainConfig.Items => Items?.ToDictionary(x => new DomainPattern(x.MatchDomainNames), y => (IDomainConfig)y);
```

`IgnoreSSLCertVerification` 映射到 `TlsIgnoreNameMismatch`：

```cs startLineNumber=140 title="[DomainConfig.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.Primitives.Models/Models/Accelerator/Yarp.Configuration/DomainConfig.cs#L140)"
    bool IDomainConfig.TlsIgnoreNameMismatch => IgnoreSSLCertVerification;
```

### 证书校验回调

当 `TlsIgnoreNameMismatch=true` 时直接放行证书主机名不匹配：

```cs startLineNumber=320 title="[ReverseProxyHttpClientHandler.cs](https://github.com/BeyondDimension/SteamTools/blob/c16ffa08e03b192d23ada290c4969e77f9201f3d/src/BD.WTTS.Client.Plugins.Accelerator.ReverseProxy/Services.Implementation/Http/ReverseProxyHttpClientHandler.cs#L320-L336)"
        bool ValidateServerCertificate(object sender, X509Certificate? cert, X509Chain? chain, SslPolicyErrors errors)
        {
            if (errors.HasFlag(SslPolicyErrors.RemoteCertificateNameMismatch))
            {
                if (domainConfig.TlsIgnoreNameMismatch == true)
                {
                    return true;
                }

                var domain = context.DnsEndPoint.Host;
                var dnsNames = ReadDnsNames(cert);
                return dnsNames.Any(dns => IsMatch(dns, domain));
            }

            return errors == SslPolicyErrors.None;
        }
    }
```

### 服务器加速转发

转发层判断 `ServerAccelerate`（`IsServerSideProxy` 为真时添加 `X-Watt-*` 头并使用 HTTP/3）：

```cs startLineNumber=141 title="[HttpReverseProxyMiddleware.cs](https://github.com/BeyondDimension/SteamTools/blob/c16ffa08e03b192d23ada290c4969e77f9201f3d/src/BD.WTTS.Client.Plugins.Accelerator.ReverseProxy/Services.Implementation/HttpServer/Middleware/HttpReverseProxyMiddleware.cs#L141-L157)"
            if (domainConfig.IsServerSideProxy)
            {
                SetWattHeaders(context, reverseProxyConfig.Service.ServerSideProxyToken);
                forwarderRequestConfig = new ForwarderRequestConfig()
                {
                    Version = HttpVersion.Version30,
                    VersionPolicy = HttpVersionPolicy.RequestVersionOrLower
                };
            }
            else
            {
                forwarderRequestConfig = new ForwarderRequestConfig()
                {
                    Version = GetHttpVersion(context.Request.Protocol),
                };
            }
```

`X-Watt-*` 请求头定义：

```cs startLineNumber=473 title="[HttpReverseProxyMiddleware.cs](https://github.com/BeyondDimension/SteamTools/blob/c16ffa08e03b192d23ada290c4969e77f9201f3d/src/BD.WTTS.Client.Plugins.Accelerator.ReverseProxy/Services.Implementation/HttpServer/Middleware/HttpReverseProxyMiddleware.cs#L473-L480)"
    static void SetWattHeaders(HttpContext context, string? token)
    {
        context.Request.Headers.TryAdd("X-Watt-Origin-Dest-Scheme", context.Request.Scheme);
        context.Request.Headers.TryAdd("X-Watt-Origin-Dest-Host", context.Request.Host.ToString());
        context.Request.Headers.TryAdd("X-Watt-Origin-Dest-PathAndQuery", context.Request.GetEncodedPathAndQuery());

        context.Request.Headers.TryAdd("X-Watt-Token", token ?? string.Empty);
    }
```

### 加速列表与 Token 申请

客户端实际拉取加速列表的端点：

```cs startLineNumber=342 title="[MicroServiceClientBase.Clients.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.MicroServices.ClientSDK/Services/Implementation/MicroServiceClientBase.Clients.cs#L342-L351)"
    public async Task<IApiRsp<List<AccelerateProjectGroupDTO>?>> All()
    {
        var r = await Conn.SendAsync<GetAccelerateProjectGroupRequest, List<AccelerateProjectGroupDTO>>(
               isPolly: true,
               isAnonymous: false,
               isSecurity: false,
               method: HttpMethod.Post,
               requestUri: "accelerator/projectgroups",
               request: new(),
               cancellationToken: default)!;
```

启动时按 `ProxyType==ServerAccelerate` 申请中转 token：

```cs startLineNumber=77 title="[ProxyService.Operate.cs](https://github.com/BeyondDimension/SteamTools/blob/c16ffa08e03b192d23ada290c4969e77f9201f3d/src/BD.WTTS.Client.Plugins.Accelerator/Services/Mvvm/ProxyService.Operate.cs#L77-L78)"
        string? proxyToken = proxyDomains.Any_Nullable(s => s.ProxyType == ProxyType.ServerAccelerate || s.Items.Any_Nullable(x => x.ProxyType == ProxyType.ServerAccelerate)) ?
            await TryRequestServerSideProxyToken() : null;
```

### 旧版兼容模型

旧端点中 `key3=转发域名`、`key4=转发IP`、`key5=伪装SNI` 的兼容模型：

```cs startLineNumber=79 title="[AccelerateProjectDTOCompat.cs](https://github.com/BeyondDimension/WTTS.MicroServices.ClientSDK/blob/d397c6b8a0d36932d851b3433312b871ea4b7b48/src/BD.WTTS.Primitives.Models.Compat/Models/Accelerator/AccelerateProjectDTOCompat.cs#L79-L152)"
    [MPKey(3), MP2Key(3)]
    [N_JsonProperty("3")]
    [S_JsonProperty("3")]
    public string ForwardDomainName
    {
        get => _ForwardDomainName ?? string.Empty;
        set => _ForwardDomainName = value;
    }

    string? _ForwardDomainIP;

    /// <summary>
    /// 转发域名 IP
    /// </summary>
    [MPKey(4), MP2Key(4)]
    [N_JsonProperty("4")]
    [S_JsonProperty("4")]
    public string ForwardDomainIP
    {
        get => _ForwardDomainIP ?? string.Empty;
        set => _ForwardDomainIP = value;
    }

#if !MVVM_VM
    string? _ForwardDomainNames;

    [MPIgnore, MP2Ignore]
#if __HAVE_N_JSON__
    [N_JsonIgnore]
#endif
#if !__NOT_HAVE_S_JSON__
    [S_JsonIgnore]
#endif
    public string? ForwardDomainNames
    {
        get => _ForwardDomainNames;
        set
        {
            _ForwardDomainNames = value;
            if (!string.IsNullOrEmpty(value))
            {
                var values = GetSplitValues(value);
                if (IPAddress2.TryParse(values.FirstOrDefault(), out var _))
                {
                    ForwardDomainIP = value;
                }
                else
                {
                    ForwardDomainName = value;
                }
            }
        }
    }
#endif

    /// <summary>
    /// 转发是域名(<see langword="true"/>)还是域名IP(<see langword="false"/>)
    /// </summary>
    [MPIgnore, MP2Ignore]
#if __HAVE_N_JSON__
    [N_JsonIgnore]
#endif
#if !__NOT_HAVE_S_JSON__
    [S_JsonIgnore]
#endif
    public bool ForwardDomainIsNameOrIP => string.IsNullOrEmpty(_ForwardDomainIP);

    /// <summary>
    /// 服务器名
    /// </summary>
    [MPKey(5), MP2Key(5)]
    [N_JsonProperty("5")]
    [S_JsonProperty("5")]
    public string ServerName { get; set; } = string.Empty;
```

</details>

<details>
<summary> 获取并解析网站加速配置列表的 Python 脚本 </summary>

```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Watt Toolkit 加速域名列表获取与解析工具
=====================================

功能说明:
---------
本脚本通过调用 Watt Toolkit 官方（客户端实际使用）的加速配置 API 接口，获取最新
的网络加速项目列表，筛选出所有 ProxyType != 0（即非本地直连）的域名项，并逐项
标注是否跳过证书校验（IgnoreSSLCertVerification），输出为 Markdown 表格文件，
便于用户审计哪些域名的流量会经过第三方服务器、以及连接是否经过密码学校验。

ProxyType 类型说明:
------------------
根据源码审计（ref/WTTS.MicroServices.ClientSDK 子模块 ProxyType.cs 枚举：
Local=0, Redirect=1, DirectSuccess=2, DirectFailure=3, ServerAccelerate=4）
以及线上 API 数据验证（线上仅出现 0/1/4），Watt Toolkit 的加速项通过
ProxyType 字段区分加速模式：

  - ProxyType = 0 : Local
      流量路径: 浏览器 → 本地 MITM 代理 → 直连目标服务器
      本地代理通过修改 Hosts、系统代理或 DNS 拦截将域名劫持到本地，再直接
      连接到目标服务器的 IP。若配置了 ForwardDomainNames，则直连该覆盖节点
      （通常为加速边缘节点）。流量不经过任何第三方中转站。

  - ProxyType = 1 : Redirect
      流量路径: 浏览器 → 本地 MITM 代理 → 镜像服务器 → 目标服务器
      本地代理将请求的 Host 改写为配置的镜像域名（Forward Domain），保持原路径。
      请求会经过镜像服务器，并且 本地代理到镜像 和 镜像到目标 是两段独立的 SSL 连接。
      该服务器能看到你的连接的所有内容

  - ProxyType = 4 : ServerAccelerate
      流量路径: 浏览器 → 本地 MITM 代理 → 中转服务器 → 目标服务器
      本地代理将完整请求参数转发到配置好的中转域名（Forward Domain），并携带
      X-Watt-Token 认证头。中转站服务器能看到你的请求内容（包括 URL、Header、
      Cookie 等），
      注意：部分中转站的转发地址为明文 http://（如 greasyfork 项的
      http://pt.mossimo.net:41080/），传输过程不加密，任何人都能截获。

证书校验说明 (IgnoreSSLCertVerification):
-----------------------------------------
本地代理连接转发/镜像节点时是否校验 TLS 证书：
  - true  : 跳过证书主机名校验（TlsIgnoreNameMismatch 生效），节点无需出示
            原域名的有效证书。此时"直连"在密码学上不保证连接目标就是原域名
            的合法服务器，第三方节点（如 rmbgame.net、steam302.xyz 等）可
            自由解密你的全部流量。
  - false : 保留校验，节点必须出示对原域名（或 FakeServerName 指定域名）有效
            的证书，握手才会成功。

线上数据实测：绝大多数加速项（约 58/62）将 IgnoreSSLCertVerification 设为 true。

API 说明:
---------
  主接口  : https://api.steampp.net/accelerator/projectgroups  (POST)
  备用接口: https://api.steampp.net/api/Accelerate/All          (GET，旧版数据格式)
  返回格式: JSON
  数据结构: {"🦕": [AccelerateProjectGroupDTO, ...]}
  数据来源: Watt Toolkit 官方服务器，每次启动软件时自动拉取

使用方法:
---------
  python watt_toolkit_accelerate_audit.py

  运行后会在当前目录生成 accelerate_server_types.md 文件。

依赖:
-----
  Python 3.9+ (仅需标准库 json、urllib，无需第三方包)

"""

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime
from typing import Any

# Windows 控制台默认 GBK 无法输出 ✅/❌ 等 emoji，强制 stdout 使用 UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


# ---------------------------------------------------------------------------
# 常量定义
# ---------------------------------------------------------------------------

# Watt Toolkit 官方加速配置 API 接口
# 主接口为客户端实际使用的端点（POST，新版字段布局），备用为旧版匿名端点（GET，兼容布局）
API_URL = "https://api.steampp.net/accelerator/projectgroups"
API_URL_FALLBACK = "https://api.steampp.net/api/Accelerate/All"

# 输出 Markdown 文件名
OUTPUT_FILE = "accelerate_server_types.md"

# ProxyType 值到人类可读名称的映射
# 依据源码枚举（ProxyType.cs）：Local=0, Redirect=1, ServerAccelerate=4，
# 并经线上 API 数据验证（线上仅出现 0/1/4 三种值）
PROXY_TYPE_MAP = {
    0: ("Local", "本地加速", "直连目标服务器，可用 ForwardDomainNames 覆盖连接目标"),
    1: ("Redirect", "镜像站改写", "改写 Host 到第三方镜像/加速域，不携带 X-Watt-Token"),
    4: ("ServerAccelerate", "服务器加速", "官方中转，携带 X-Watt-Token 转发到第三方中转站"),
}

# User-Agent，模拟正常浏览器请求
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.0 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0"
)


# ---------------------------------------------------------------------------
# 核心函数
# ---------------------------------------------------------------------------

def _fetch(url: str, method: str = "GET") -> dict:
    """
    发送 HTTP 请求并解析 JSON 响应。

    参数:
        url: API 接口地址
        method: HTTP 方法（GET 或 POST）

    返回:
        解析后的 JSON 字典
    """
    data = b"{}" if method == "POST" else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def fetch_accelerate_list(url: str = API_URL, fallback_url: str = API_URL_FALLBACK) -> tuple[dict, str]:
    """
    从 Watt Toolkit 官方 API 获取加速项目列表。

    优先请求主接口（新版布局），失败时回退到旧版匿名接口（兼容布局）。

    参数:
        url: 主 API 接口地址
        fallback_url: 备用 API 接口地址

    返回:
        (解析后的 JSON 字典, 实际使用的接口地址)
    """
    try:
        return _fetch(url, method="POST"), url
    except Exception:
        return _fetch(fallback_url, method="GET"), fallback_url


def _get(item: dict, new_key, old_keys, default=None):
    """
    兼容新版（命名键）与旧版（数字键）两种 API 布局取值。

    参数:
        item: 加速项字典
        new_key: 新版字段名（如 "Name"）；None 表示新版无此字段
        old_keys: 旧版数字键（如 "0"），可为单个键或键列表
        default: 默认值
    """
    if new_key is not None and new_key in item:
        return item[new_key]
    if old_keys is None:
        return default
    keys = old_keys if isinstance(old_keys, (list, tuple)) else [old_keys]
    for k in keys:
        if k in item:
            return item[k]
    return default


def parse_accelerate_data(data: dict) -> list[dict]:
    """
    解析 API 返回的加速列表数据，提取所有加速项的详细信息。

    Watt Toolkit 的 API 返回格式是一个 JSON 对象，其唯一的键是 "🦕" 恐龙 emoji，
    值为 AccelerateProjectGroupDTO 数组。每个项目组包含名称和子项目列表。
    兼容新版（命名键）与旧版（数字键）两种布局。

    参数:
        data: API 返回的 JSON 字典

    返回:
        扁平化的加速项列表，每个元素是一个包含详细信息的字典
    """
    # 获取根键（应该是 "🦕"）
    root_key = list(data.keys())[0]
    groups = data[root_key]

    all_items: list[dict] = []

    # 递归遍历所有项目组和子项
    def walk(items: list[dict], parent_path: str = "") -> None:
        """递归遍历加速项树形结构，将叶子节点加入 all_items 列表。"""
        for item in items:
            # 新版为命名键，旧版为数字键（MessagePack-CSharp 显式布局）
            name = _get(item, "Name", "0", "")
            port = _get(item, "Port", "1", 0)
            match_domains = _get(item, "MatchDomainNames", "2", "")
            forward_domain = _get(item, "ForwardDomainNames", "3", "")
            # 旧版布局 key 4 为转发 IP（新版已合并进 ForwardDomainNames）
            forward_domain_ip = _get(item, None, "4", "") if "ForwardDomainNames" not in item else ""
            fake_server_name = _get(item, "FakeServerName", "5", "")
            proxy_type = _get(item, "ProxyType", "ProxyType", 0)
            # 新版才有 IgnoreSSLCertVerification 字段；旧版无此字段视为 False
            ignore_ssl = bool(_get(item, "IgnoreSSLCertVerification", None, False))
            listen_domains = _get(item, "ListenDomainNames", "7", "")
            checked = _get(item, "Checked", "8", False)
            item_id = _get(item, "Id", "9", "")
            order = _get(item, "Order", "10", 0)
            user_agent = _get(item, "FakeUserAgent", "11", "")
            sub_items = _get(item, "Items", "12", None) or []

            # 构造当前项的完整路径
            current_path = f"{parent_path} > {name}" if parent_path else name

            # 转发目标（域名或 IP，兼容两种布局）
            forward_target = forward_domain or forward_domain_ip

            # 记录当前项的详细信息
            info = {
                "name": name,
                "proxy_type": proxy_type,
                "port": port,
                "match_domains": match_domains,
                "forward_domain": forward_domain,
                "forward_domain_ip": forward_domain_ip,
                "forward_target": forward_target,
                "ignore_ssl": ignore_ssl,
                "fake_server_name": fake_server_name,
                "listen_domains": listen_domains,
                "user_agent": user_agent,
                "order": order,
                "id": item_id,
                "checked": checked,
                "path": current_path,
                "has_subitems": len(sub_items) > 0,
            }
            all_items.append(info)

            # 递归处理子项
            if sub_items:
                walk(sub_items, current_path)

    # 遍历每个项目组（新版为 Name/Items，旧版为 "0"/"1"）
    for group in groups:
        group_name = group.get("Name", group.get("0", "未命名"))
        group_items = group.get("Items", group.get("1", [])) or []
        walk(group_items, group_name)

    return all_items


def get_proxy_type_label(proxy_type: int) -> str:
    """
    将 ProxyType 数值转换为人类可读的标签和描述。

    参数:
        proxy_type: ProxyType 整数值

    返回:
        格式为 "类型名(中文名) - 描述" 的字符串
    """
    if proxy_type in PROXY_TYPE_MAP:
        code_name, cn_name, desc = PROXY_TYPE_MAP[proxy_type]
        return f"{code_name}({cn_name}) - {desc}"
    return f"Unknown({proxy_type})"


def is_safe(item: dict) -> bool:
    """
    判断加速项是否安全：仅 ProxyType=Local 且保留证书校验（IgnoreSSL=false）才算安全。
    """
    return item["proxy_type"] == 0 and not item["ignore_ssl"]


def get_security_mark(item: dict) -> str:
    """返回安全性的 ✅/❌ 标记。"""
    return "✅" if is_safe(item) else "❌"


def format_forward_target(item: dict) -> str:
    """
    格式化转发目标并合并端口：完整 URL 原样显示，其余追加 ':端口'。
    """
    target = item["forward_target"]
    if not target:
        return "-"
    if target.startswith(("http://", "https://")):
        return target
    return f"{target}:{item['port']}"


def generate_markdown(
    all_items: list[dict],
    server_items: list[dict],
    output_path: str = OUTPUT_FILE,
    source_url: str = API_URL,
) -> None:
    """
    生成 Markdown 报告文件。

    参数:
        all_items: 所有加速项的列表
        server_items: ProxyType != 0 的加速项列表
        output_path: 输出文件路径
        source_url: 实际使用的数据来源接口
    """
    # 统计各 ProxyType 的数量
    from collections import Counter
    type_counts = Counter(item["proxy_type"] for item in all_items)

    # 证书校验统计
    ssl_on = [item for item in all_items if item["ignore_ssl"]]
    ssl_off = [item for item in all_items if not item["ignore_ssl"]]
    safe_items = [item for item in all_items if is_safe(item)]

    # 获取当前时间
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines: list[str] = []

    # ------------------------------------------------------------------
    # 文件头
    # ------------------------------------------------------------------
    lines.append("# Watt Toolkit 加速域名审计报告\n")
    lines.append(f"> 生成时间: {now}\n")
    lines.append(f"> 数据来源: [{source_url}]({source_url})\n")
    lines.append("---\n")

    # ------------------------------------------------------------------
    # 总体统计
    # ------------------------------------------------------------------
    lines.append("## 📊 总体统计\n")
    lines.append(f"- **总加速项数**: {len(all_items)}\n")
    lines.append(f"- **本地加速 (ProxyType=0)**: {type_counts.get(0, 0)} 项\n")
    lines.append(f"- **镜像站改写 (ProxyType=1)**: {type_counts.get(1, 0)} 项\n")
    lines.append(f"- **服务器加速 (ProxyType=4)**: {type_counts.get(4, 0)} 项\n")
    lines.append(f"- **非本地直连项数**: {len(server_items)} 项\n")
    lines.append(f"- **跳过证书校验 (IgnoreSSL=true)**: {len(ssl_on)} 项\n")
    lines.append(f"- **保留证书校验**: {len(ssl_off)} 项\n")
    lines.append(f"- **安全项 (Local + 保留校验)**: {len(safe_items)} 项 ✅\n")
    lines.append("\n")

    # ------------------------------------------------------------------
    # ProxyType 说明
    # ------------------------------------------------------------------
    lines.append("## 📖 ProxyType 类型说明\n")
    lines.append("Watt Toolkit 通过 `ProxyType` 字段区分不同的加速模式。根据源码审计，各类型含义如下:\n")
    lines.append("")
    lines.append("| ProxyType | 类型代码 | 中文名称 | 流量路径 | 安全风险 |")
    lines.append("|:---------:|:--------:|:--------:|:---------|:--------|")
    lines.append("| 0 | Local | 本地加速 | 浏览器 → 本地代理 → **直连** 目标服务器 | 🟢 低 - 流量不经第三方 |")
    lines.append("| 1 | Redirect | 镜像站改写 | 浏览器 → 本地代理 → **第三方镜像域** → 目标服务器 | 🟡 中 - 镜像/中转站可解密流量 |")
    lines.append("| 4 | ServerAccelerate | 服务器加速 | 浏览器 → 本地代理 → **第三方中转站** → 目标服务器 | 🔴 高 - 镜像/中转站可解密流量 |")
    lines.append("")
    lines.append("> ⚠️ **注意**: 对于 ProxyType=4 的项（ServerAccelerate 官方中转），本地代理会将请求转发到 `Forward Domain` 指定的" ""
                "第三方中转服务器，并携带 `X-Watt-Token` 认证头。中转站服务器能够看到你的请求内容"
                "（包括 URL、Header、Cookie 等）。\n")
    lines.append("")
    lines.append("> ⚠️ **注意**: ProxyType=1 的项（Redirect 镜像站改写）不携带 `X-Watt-Token`，"
                "但请求 Host 会被改写为第三方镜像域名，镜像服务器同样能看到你的请求内容。\n")
    lines.append("")
    lines.append("> 🚨 **特别提醒**: 当前唯一 ProxyType=4 的项是 greasyfork，其转发地址为 **明文 HTTP**"
                "（`http://pt.mossimo.net:41080/`），传输过程中的数据完全不加密，任何人都能截获和读取。\n")
    lines.append("\n")

    # ------------------------------------------------------------------
    # 全部加速项列表
    # ------------------------------------------------------------------
    lines.append("## 📋 全部加速项列表\n")
    lines.append("以下列出所有加速项。`安全性` 仅当 ProxyType 为 Local 且保留证书校验时为 ✅，其余为 ❌。\n")
    lines.append("")
    lines.append("| # | 名称 | 安全性 | ProxyType | 证书校验 | 匹配域名 | 转发目标 |")
    lines.append("|:-:|:-----|:------:|:---------|:--------:|:---------|:---------|")

    for idx, item in enumerate(all_items, 1):
        # 名称使用完整路径（分组 > 子项），保留所属分组信息
        name = item["path"].replace("|", "\\|")
        security = get_security_mark(item)

        pt_code, pt_cn, _ = PROXY_TYPE_MAP.get(
            item["proxy_type"], (f"未知({item['proxy_type']})", "", ""))
        pt_label = f"{pt_code}({pt_cn})" if pt_cn else pt_code

        ssl_label = "跳过" if item["ignore_ssl"] else "校验"
        match_domains = item["match_domains"].replace("|", "\\|") if item["match_domains"] else "-"
        forward = format_forward_target(item).replace("|", "\\|")

        lines.append(
            f"| {idx} | {name} | {security} | {pt_label} | {ssl_label} | `{match_domains}` | `{forward}` |"
        )

    lines.append("")

    # ------------------------------------------------------------------
    # 文件尾
    # ------------------------------------------------------------------
    lines.append("---\n")
    lines.append("> 📌 本报告由自动化脚本生成。数据来源于 Watt Toolkit 官方 API。\n"
                "> ⚠️ 使用加速工具时请注意隐私安全：大多数加速项跳过证书校验（IgnoreSSL=true），"
                "第三方节点可解密你的全部流量。\n")

    # 写入文件
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✅ 报告已生成: {output_path}")
    print(f"   总加速项: {len(all_items)}")
    print(f"   非本地直连项: {len(server_items)}")
    print(f"   其中 ProxyType=1 (Redirect): {type_counts.get(1, 0)} 项")
    print(f"   其中 ProxyType=4 (ServerAccelerate): {type_counts.get(4, 0)} 项")
    print(f"   其中跳过证书校验(IgnoreSSL=true): {len(ssl_on)} 项")


# ---------------------------------------------------------------------------
# 主程序入口
# ---------------------------------------------------------------------------

def main() -> None:
    """
    主函数：获取 Watt Toolkit 加速列表，筛选非本地直连项，输出 Markdown 报告。
    """
    print("=" * 60)
    print("Watt Toolkit 加速域名审计工具")
    print("=" * 60)
    print()

    # 步骤 1: 从官方 API 获取加速列表
    print("[1/3] 正在从 Watt Toolkit 官方 API 获取加速列表...")
    print(f"      主接口: {API_URL}")
    try:
        data, used_url = fetch_accelerate_list()
        print(f"      ✅ 获取成功 (来源: {used_url})")
    except Exception as e:
        print(f"      ❌ 获取失败: {e}")
        return

    # 步骤 2: 解析数据
    print("\n[2/3] 正在解析加速列表数据...")
    all_items = parse_accelerate_data(data)
    print(f"      共解析到 {len(all_items)} 个加速项")

    # 步骤 3: 筛选 ProxyType != 0 的项
    print("\n[3/3] 正在筛选 ProxyType ≠ 0 的加速项...")
    server_items = [item for item in all_items if item["proxy_type"] != 0]
    print(f"      共筛选出 {len(server_items)} 个非本地直连项")

    # 步骤 4: 生成 Markdown 报告
    print(f"\n[4/4] 正在生成 Markdown 报告: {OUTPUT_FILE} ...")
    generate_markdown(all_items, server_items, OUTPUT_FILE, used_url)

    print()
    print("=" * 60)
    print("处理完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()

```

</details>

从我当前获取的信息来看，是这么一个情况：

一共 62 个网站加速项

- 本地加速 (ProxyType=0): 50 项
- 镜像站加速 (ProxyType=1): 11 项
- 中转站加速 (ProxyType=4): 1 项

_ProxyType在上面源码部分可以看到定义_

ProxyType 的 1 和 4 实质都是中转节点，并且源站到中转服务器是一段 SSL ，中转服务器到本地是另一段 SSL ，也就是说，服务器可以解密所有流量。

那么本地加速的那 50 项大概就是安全的，对吧？

非也

本地加速项里大部分也是设置了 `ForwardDomainNames` ，会直连那个节点。理论上那个节点应该是对应网站的官方 CDN 节点，这样才能通过 SSL 校验

但是啊但是，大部分网站设置都把 `IgnoreSSLCertVerification` 设为了 `True` ！SSL 校验关闭了！那也就是说本质上和中转服务器又是没什么区别了。

只有三个本地加速的网站保留了证书校验。（想知道具体哪三个可以自己跑脚本看报告，时效性也最强）

那我们完蛋了吗？

别急，还有反转

我挑了几个 ForwardDomain 看了一下，比如 Github Api 的 `githubapi.rmbgame.net`，我发现它其实是 CNAME 到了 `api.github.com` ，所以实际上是直连官方域名的。

那它为什么要整个这域名放这？还关掉了 SSL 校验？

哎，明天再研究

总之目前来看没出什么大事，但安全隐患是有的。
