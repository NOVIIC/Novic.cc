---
title: '安装 EndeavourOS 桌面系统'
description: '安装并配置 EndeavourOS + KDE 桌面系统'
pubDate: 2026-08-23
updatedDate: 2026-08-24
tags: ['Linux']
---

本文记录我 EndeavourOS + KDE 的桌面系统配置过程

我用的是一台A卡的台式，一直以来都是 Win + wsl 命令行。去年突然想折腾折腾桌面 Linux ，研究之后选择了 Arch 作为我的第一款 Linux 桌面（~~上来就搞这么复杂的~~）。跟着B站上up的视频一行行手敲把这个 Arch 给装上了。然而，桌面环境使用的 Gnome ，一直只使用 Windows 的我感觉非常不顺手，而且也一直没有去折腾设置和美化。因此 Arch 实际上大部分时间处于吃灰的状态，只是偶尔上去更新一下，尝试些新软件或者浏览器看看网页。  
_至少一年了没挂过不是吗，说明稳定性其实还挺好的_

但 Linux 还是吸引我的，比如软件包管理，以及游戏性能似乎是高于 win 的（而且我还是A卡呢）。于是最近决定重新拾起它试试。但 Gnome 实在用不惯，换 KDE 吧。那索性重装得了。

## 系统选择

虽然 wsl 和服务器我都用 Debian ，但是来到桌面系统，我依旧还是比较想选 Arch 系的。但是我现在确实是没什么兴致一行一行研究安装指令了。~~听说 SteamOS 挺好使的，可惜用不到~~于是最后决定使用 EndeavourOS ，能比较好地开箱即用，并且仍然提供未经修改的 Arch 体验。

## 安装流程

有 GUI 那就非常友好了，没有太多要说的

先更新一下镜像源，然后就开始安装

系统引导方式使用 grub ，会自动扫描把 Windows 启动项也加进去

桌面我选择 KDE

swap 我选择了 `no swap` ，之后再手动配置 zram

文件系统选择的是 brtfs ，原生支持快照，配合 Snapper ，万一系统出问题了直接回滚即可

## 配置系统

### Shell

可以先根据 [之前的文章](./linux-init.mdx#Shell-配置) 配置好 Shell 。切换默认 Shell 之后需要重启才会生效

### yay

yay 每次安装软件都会有几个交互式选项。然而大部分情况下我们的回答应该都是固定的。因此可以直接设置：

```zsh
yay --answerclean=None --answerdiff=All --answeredit=None --save
```

`answerclean` 设为 `None` 表示不清理而是复用之前的构建缓存（如果有）  
`answerdiff` 设为 `All` 则代表审阅所有 PKGBUILD 的 diff ，为了安全我认为人工检查是有必要的  
`answeredit` 设为 `None` 则是不修改 PKGBUILD ，一般来说确实不会需要修改

使用 `yay -Pg` 可以查看当前设置

还可以安装 aur-scanner

```zsh
yay -S aur-scanner
```

可以用来扫描 PKGBUILD （静态规则，可能误伤也可能遗漏，不能代替人工审查）

```zsh
aur-scan check <包名>      # 装之前检查
aur-scan system            # 扫描已装的 AUR 包
```

### zram

简单来说，zram 就是使用内存而不是硬盘来当 swap （相当于 win 上的虚拟内存）。它在内存里划出一块区域，把要换出的内存页先压缩，再存到这块内存区域里。这样内存的总容量就大些了，同时也不需要产生硬盘读写。

安装：

```zsh
sudo pacman -S zram-generator
```

创建并编辑配置文件：`/etc/systemd/zram-generator.conf`:

```ini
[zram0]
zram-size = ram / 2
compression-algorithm = zstd
```

_注意 zram-size 是未压缩数据的体积上限，而不是压缩后的_

然后重启即可

### Snapper

需要安装：

- snapper — 快照引擎
- snap-pac — pacman 钩子，装/卸/升级包时自动快照
- grub-btrfs — 把快照挂到 GRUB 启动菜单里
- inotify-tools 让 grub-btrfsd 监听到新快照后自动重建 GRUB 菜单。
- btrfs-assistant — 图形界面

```zsh
sudo pacman -S snapper snap-pac grub-btrfs btrfs-assistant inotify-tools
```

接下来创建 root 的 snapper 配置

```zsh
sudo snapper -c root create-config /
```

然后启用 grub-btrfs 的自动刷新守护进程：

```zsh
sudo systemctl enable --now grub-btrfsd
```

接下来就可以在 btrfs-assistant 中调节快照设置了

如果还想给 `/home` 添加快照，同样 create config 就行：

```zsh
sudo snapper -c home create-config /home
```

### 输入法

安装 Fcitx 5 、 GTK/Qt 支持、Rime 引擎和图形配置工具：

```zsh
sudo pacman -S fcitx5 fcitx5-gtk fcitx5-qt fcitx5-rime fcitx5-configtool
```

打开 KDE 系统设置 - 键盘 - 虚拟键盘，选择 Fcitx 5

然后到 系统设置 - 输入法 里确认 Rime （中州韵）是启用的

并在下面 配置附加组件 - 经典用户界面 设置 跟随系统浅色/深色设置

然后就可以使用了

默认使用 <kbd>Ctrl</kbd> + <kbd>Space</kbd> 切换中英文

<kbd>Ctrl</kbd> + <kbd>`</kbd> 可以切换拼音方案和简繁体什么的

### Grub

**目前会遇上 GRUB 写入 grubenv 与 CoW 的 btrfs 冲突的问题，暂未解决**

将 Grub 的默认启动项会设置为上次使用的选项

编辑 `/etc/default/grub`的设置

```ini
GRUB_DEFAULT='saved'
GRUB_SAVEDEFAULT=true
```

然后：

```zsh
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

### 其它设置

关闭 系统设置 - 显示和监视器 - 显示器配置 - 允许在全屏窗口中发生画面撕裂
