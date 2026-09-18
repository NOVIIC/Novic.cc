---
title: 'Windows 一种挤出更多磁盘空间的方法'
description: '使用 Windows 自带的 Compact 工具从硬盘里挤出更多空间'
pubDate: 2026-09-18
tags: ['小技巧']
---

用于压缩只读文件

[官方文档](https://learn.microsoft.com/zh-cn/windows-server/administration/windows-commands/compact)

```cmd title="压缩"
compact /S /C /EXE:XPRESS8K *.<文件后缀>
```
