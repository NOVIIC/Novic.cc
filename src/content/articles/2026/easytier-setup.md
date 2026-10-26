---
title: ' Easytier 配置远程组网和 ACL 访问控制'
description: '使用 Eazytier 组建虚拟局域网并控制成员权限'
pubDate: 2026-10-26
tags: ['Web', '小工具']
---

## 虚拟局域网是对的

最近整了台新的国内服务器，注意到可以用来远程组网，这样的好处包括但不限于：

- 可以让自己不在物理局域网的多台设备便携互访
- 在服务器整一些 24 小时在线的服务，可以不对公网开放，而是在虚拟局域网内访问，就不用操心鉴权了
- 可以方便稳定地跟朋友远程玩 MC 等局域网游戏以及一些基于 p2p 打洞的游戏

### Easytier

我之前使用的是 vnt ，但这次发现这个 Easytier ，有若干优势

首先它是 p2p 打洞似乎成功率更高，协议和打洞策略更多样

而且它还支持 ACL 访问控制，这样如果我拉很多人加入组网，可以限制每个人只能访问自己的设备（而且 Easytier 的组网是去中心化的，不存在绝对的管理员，可以保证每个人设备的权限都在他自己手里）

而且而且它还支持签发临时凭证，比如我要临时拉个人来联机，就可以只给 ta 签发一个有效期仅一天的凭证

## 配置文件模板

 Easytier 的官方文档感觉写得有点乱，每个功能一个页面，没有一个系统总览的流程。

模板先放这里，之后有时间再来整理

```toml
hostname = ""
ipv4 = ""
listeners = [
    "tcp://0.0.0.0:1123",
    "udp://0.0.0.0:1123",
    "quic://0.0.0.0:1123",
]

[network_identity]
network_name = ""
network_secret = ""

[[peer]]
uri = "tcp://xxx"

[secure_mode]
enabled = true

[flags]
data_compress_algo = "Zstd"
enable_udp_broadcast_relay = true
private_mode = true

[acl.acl_v1.group]
members = ["g1", "g2"]

[[acl.acl_v1.group.declares]]
group_name = "g1"
group_secret = ""

[[acl.acl_v1.group.declares]]
group_name = "g2"
group_secret = ""

[[acl.acl_v1.chains]]
name = "inbound_whitelist"
chain_type = 1                 # 入站
enabled = true
default_action = 2             # 默认拒绝

[[acl.acl_v1.chains.rules]]
name = "allow-ping-v4"
description = "所有人可 ping (ICMP)"
priority = 100
action = 1
protocol = 3                   # ICMP
enabled = true
# source_groups 留空 = 不限来源

[[acl.acl_v1.chains.rules]]
name = "allow-g1"
description = "g1 组完全访问"
priority = 200
action = 1
protocol = 5                   # Any，全部协议
source_groups = ["g1"]
enabled = true
stateful = true
```
