---
title: 从零配置 Windows11 开发环境
categories: 技术
mathjax: false
date: 2023-09-05 10:00:52
tags:
  - 软件环境
  - Windows
  - 计算机
description: 爽快的开发感从这里开始！
---
Fork from: [汇尘轩 - 锦恢的博客 (kirigaya.cn)](https://kirigaya.cn/blog/article?seq=28)

> There is no end though there is a start in space. ---Infinity.

记录一下简单的电脑配置流程。按照这个顺序配置即可。

## Windows

必须是Win11，因为我需要这个版本上面的一些特性，或是功能性的，或是装饰性的。

一、登录微软账号

1. 同步部分OS配置
2. 同步edge
3. 同步应用商店
4. 升级到相应的Win11版本

二、转移基本的静态文件

1. 所有的图片（壁纸+图标+光标）
2. 所有的额外字体文件（Jetbrain+Nerd等宽字体+几款我喜欢的中文字体）
3. `.ssh`文件夹（用于登录服务器）
4. windows terminal 的配置文件`setting.json`，并替换本机windows terminal配置文件，将部分的图标路径进行修改。

三、下载应用软件

1. 微软应用商店：Dolby Access（音效）, ScreenMix（录屏）, Snipaste（截屏）、TranslucentTB（美化任务栏）、Starrea（ePub阅读器）
2. 下载前往魔法址获取SSR订阅，下载并配置CFW。
3. 网上下载：Google Chrome, FireFox, Tim, 微信, 飞书, 百度网盘, 7z, postman, Office套件, 向日葵, obsidian, OneNote

四、配置开发环境

1. 下载 PowerShell 7.x 最新版本
官方文档：[在 Windows 上安装 PowerShell - PowerShell | Microsoft Learn](https://learn.microsoft.com/zh-cn/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.3#msi)

1. 删除和python默认起冲突的可执行文件。使用管理员权限打开powershell，输入：

    ```sh
    cd C:\Users\<用户名>\AppData\Local\Microsoft\WindowsApps
    rm python*
    ```

2.下载 Git

  1. 前往 [https://git-scm.com/download/win](https://git-scm.com/download/win)

  2. 配置信息：

  ```sh
  git config --global user.email xxx
  git config --global user.name xxx
  ```

  3.设置代理：

  ```sh
  git config --global http.proxy http://127.0.0.1:<端口号>
  git config --global https.proxy https://127.0.0.1:<端口号>
  ```

3.安装python

  1.去 [https://www.python.org/downloads/windows/](https://www.python.org/downloads/windows/) 寻找稳定版本的x64可执行文件下载

  2.配置pip源：

  ```sh
  pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
  pip config set global.proxy http://127.0.0.1:<端口号>
  ```

4.安装MinGW [https://sourceforge.net/projects/mingw/](https://sourceforge.net/projects/mingw/)

  > 忘记安装配置怎么选看[这篇博客](https://blog.csdn.net/QuantumYou/article/details/119676283)

5.安装cmake [https://cmake.org/download/](https://cmake.org/download/)

> 如果安装了VS，可以查看路径`C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin`，这里面存在VS构建的cmake，上面的cmake可以不用下载。

6.安装node [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
    npm 换源：

  ```sh
  npm config set registry https://registry.npm.taobao.org
  ```

7.安装go
    1. 找到安装 [https://golang.google.cn/dl/](https://golang.google.cn/dl/)
    2. 配置：
    ```shell
     go env -w GO111MODULE=on
     go env -w GOPROXY=https://goproxy.cn,direct
    ```
    3.如果有必要，设置GOROOT和GOPATH环境变量

8.安装Java：[https://www.oracle.com/hk/java/technologies/downloads/](https://www.oracle.com/hk/java/technologies/downloads/)

9.测试以上编译器、解释器能否正常工作。

10.安装vscode（科学上网），安装后打开并登录GitHub账号进行配置与插件同步（等到左下角的“正在同步”消失后，就可以退出了）

11.安装VS2022（反正是最新版的就行），安装windows通用开发和C++的。

五、配置终端

以管理员权限打开windows terminal，执行下面的指令

1. 配置 powershell，安装powershell插件

```sh
# 允许运行Install-Module脚本
set-executionpolicy remotesigned

# 更新最新版本的PSReadLine，为了自动补全
Install-Module PSReadLine -Force

# 创建powershell 的初始化脚本，点击确认创建即可
notepad $profile

# 安装几个插件
Install-Module posh-git
Install-Module Terminal-Icons
```

2.安装并配置oh-my-posh

  1.安装oh-my-posh

  ```sh
  winget install JanDeDobbeleer.OhMyPosh -s winget
  ```

  > 如果该方法失效，移步[oh-my-posh windows set up](https://ohmyposh.dev/docs/installation/windows)查看最新安装方法

  2.下载oh-my-posh主题

  ```sh
  git clone https://github.com/JanDeDobbeleer/oh-my-posh 
  ```

  将里面的theme文件夹保留即可。

  3.测试

  ```sh
  oh-my-posh init pwsh | Invoke-Expression
  ```

3.配置整体运行文件

```sh
notepad++ $profile
```

将以下文本写入其中：

```sh
oh-my-posh init pwsh --config <主题路径（json文件）> | Invoke-Expression
Import-Module posh-git
Import-Module Terminal-Icons
Set-PSReadLineOption -PredictionSource History
Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete
```

重新打开terminal查看安装效果

## 六、安装WSL2

**以管理员身份**打开windows terminal

```powershell
# 开启VM组件 开启后需要重启电脑
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform

# 列出可安装的安装包
wsl --list --online

# 安装你想要的发行版，我这里是Ubuntu-22.04
wsl --install -d Ubuntu-22.04

# 设置为wsl2
wsl --set-default-version 2
```

WSL可以简单的创建多个发行版，并进行管理和切换。并且可以对接VS code及Jetbrain(学生可以申请专业版！！快去)等IDE。支持CUDA，docker，并且享受linux命令行的各种工具。掌握使用WSL是重要的。
现在来举例一些基本的操作。

```shell
# 列出已安装的Linux发行版
wsl -l -v
# 导出/备份
wsl --export Ubuntu-22.04 Ubuntu-22.04.tar
# 导入/还原/利用备份创建新的安装
# wsl --import <wsl_name> <route> <source>
wsl --import Anaconda C:\Users\niina\root\var\wsl\anaconda
```

以上操作完成后，在win+Q(或win)中搜索ubuntu on Windows，打开，完成安装和账号注册（Unix账号必须是开头小写的单词）

完成后打开windows terminal的下拉菜单，会发现多出了一个Ubuntu的标签页。后面移步Linux的配置。

WSL学习使用：[适用于 Linux 的 Windows 子系统文档 | Microsoft Learn](https://learn.microsoft.com/zh-cn/windows/wsl/)
开源的一个WSL入门手册： [在Windows上优雅地使用WSL开发](https://dowww.spencerwoo.com/)

七、兴趣爱好

- cuDNN开发套件（用于开发kernel op和安装编译torch cuda） [https://developer.nvidia.com/cuda-downloads](https://developer.nvidia.com/cuda-downloads)
- [FL Studio](https://www.flstudiochina.com/xiazai.html)
- Cubase
- [REAPER](https://www.reaper.fm/download.php)
- [Synthesizer V](https://dreamtonics.com/en/synthesizerv/)
- [Steam](https://store.steampowered.com/about/)
- ACE studio  [https://ace-studio.timedomain.cn/](https://ace-studio.timedomain.cn/)

## Linux

### 一、apt换源

操作如下。

```sh
cd /etc/apt/

# 留个source备份
sudo cp sources.list sources.list.backup

# 使用源
sudo vim sources.list
```

写入：(根据ubuntu版本号自己查, `cat /etc/os-release`)
清华源给出的Ubuntu22.04源的网址 [Ubuntu](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)
下面是同版本阿里云的源，复制粘贴进即可。

```sh
## aliyun mirrors
deb http://mirrors.aliyun.com/ubuntu/ jammy main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ jammy main restricted universe multiverse

deb http://mirrors.aliyun.com/ubuntu/ jammy-security main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ jammy-security main restricted universe multiverse

deb http://mirrors.aliyun.com/ubuntu/ jammy-updates main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ jammy-updates main restricted universe multiverse

deb http://mirrors.aliyun.com/ubuntu/ jammy-proposed main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ jammy-proposed main restricted universe multiverse

deb http://mirrors.aliyun.com/ubuntu/ jammy-backports main restricted universe multiverse
deb-src http://mirrors.aliyun.com/ubuntu/ jammy-backports main restricted universe multiverse
## aliyun mirrors End
```

保存退出。

移除自带的包（因为可能和国内源的软件有冲突）

```bash
sudo apt remove ubuntu-advantage-tools
```

更新包管理器：

```shell
sudo apt update && sudo apt upgrade
sudo apt-get update
```

### 二、安装基本的开发工具

```shell
# mingw套组
sudo apt install build-essential cmake

# python3 pip 工具
sudo apt install python3-pip
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 三、美化终端

#### 使用fish

安装

```shell
sudo apt install fish
chsh -s $(which fish)
export SHELL=`which fish` && exec "$SHELL" -l
```

修改风格

```shell
fish_config prompt choose scope
fish_config prompt save
```

安装[oh-my-fish](https://github.com/oh-my-fish/oh-my-fish) 可选

```shell
# with git
$ git clone https://github.com/oh-my-fish/oh-my-fish
$ cd oh-my-fish
$ bin/install --offline
# with a tarball
$ curl https://raw.githubusercontent.com/oh-my-fish/oh-my-fish/master/bin/install > install
$ fish install --offline=omf.tar.gz
```

#### 使用zsh

安装

```shell
sudo apt install zsh
chsh -s $(which zsh)
```

在bashrc里面加入

```shell
export SHELL=`which zsh`
[ -z "$ZSH_VERSION" ] && exec "$SHELL" -l
```

重新打开当前终端，就会进入zsh终端，接着安装oh-my-zsh主题框架。

```shell
cd ~
git clone https://gitee.com/mirrors/oh-my-zsh
sh oh-my-zsh/tools/install.sh
```

安装两个插件

```shell
cd ~/.oh-my-zsh/custom/plugins/

# 高亮关键词
git clone https://gitee.com/haohaogood/zsh-syntax-highlighting

# 自动补全
git clone https://gitee.com/qiushaocloud/zsh-autosuggestions
```

然后进入 `~/.zshrc` 在 plugins 参数中添加 `zsh-syntax-highlighting` 和`zsh-autosuggestions`。也就是说你的 .zshrc 中必须要有一行长这样：

```shell
plugins=(git zsh-syntax-highlighting zsh-autosuggestions)
```

## 四、安装部分驱动程序

默认pip 版本较低，升级一下

```shell
pip install --upgrade pip
```

安装opencv的包

```shell
sudo apt install libopencv-dev
pip install opencv-python
```

安装torch cuda

```shell
sudo apt install nvidia-cuda-toolkit
```

然后去 [PyTorch](https://pytorch.org/) 找对应的安装指令。自从某个版本之后 Linux 下载 PyTorch GPU 版本可以直接 pip（自动下载对应 CUDA 依赖）。
