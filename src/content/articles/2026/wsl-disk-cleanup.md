---
title: '清理 WSL 占用的空间'
description: '直观地查看 WSL 发行版的空间占用并进行清理'
pubDate: 2026-07-13
tags: ['小技巧', 'Linux']
---

## 查看占用

### 基本命令

`du -sh *` 查看当前目录下所有子目录的大小

### 图形化

使用 ncdu 命令行工具可视化分析磁盘

```bash
# 命令行工具 ncdu
sudo apt install ncdu

# 扫描整个根目录，但排除 win 磁盘挂载的目录和 win 驱动映射的目录
ncdu / --exclude /mnt --exclude /usr/lib/wsl/drivers
```

列出部分常用按键：

| 按键                   | 功能                                     |
| :--------------------- | :--------------------------------------- |
| **q**                  | 退出                                     |
| **↑ / ↓** 或 **j / k** | 上下移动光标                             |
| **→** 或 **Enter**     | 进入选中的目录                           |
| **←** 或 **h**         | 返回上级目录（后退）                     |
| **g** / **G**          | 跳转到列表顶部 / 底部                    |
| **d**                  | **删除**当前选中的项目（会弹出确认提示） |
| **?**                  | 打开帮助菜单（快捷键列表）               |

## 清理软件缓存

下面列出部分软件 ~~（我用到了的）~~ 缓存的清理方法

### OpenCode

```bash
# 需要安装 uv
# uv 临时使用清华源
$env:UV_INDEX_URL = "https://pypi.tuna.tsinghua.edu.cn/simple"

# 安装 OpenCode Garbage Collector
uv tool install ocgc

ocgc status  # 用于查看空间占用概况
ocgc analyze # 提供更深入的分析

# 运行前记得关闭 OpenCode
ocgc vacuum
```

## 压缩 WSL 虚拟磁盘

```powershell
# 关闭 WSL
wsl --shutdown

# 使用 HyperV 套件中的功能压缩磁盘（需要启用相关 Windows 功能）
Optimize-VHD -Path "<WSL 路径>\ext4.vhdx" -Mode Full
```
