---
title: 快速搭建个人VPS
date: 2024-12-31 19:00:00
categories: 殆罔集
tags:
  - VPS
description: 如何快速搭建个人VPS。
---
参见 [Reference](#reference) 部分，根据以下教程，并结合 `VPS`、`optimize`、`订阅聚合`等关键词，可以检索出 VPS 搭建的相应教程。

## 拥有一台非大陆的服务器

VPS(Virtual Private Server)，顾名思义你需要拥有至少一台非大陆的服务器，推荐的操作系统是 Debian12(RAM>=1GB)。后面的步骤有配置 SSH 免密访问，禁止密码登录，乃至修改默认 sshd 端口。这部分操作是出于远程连接的安全性考虑的，我在此不赘述，感兴趣的读者自行检索即可找到相应教程（亦可参考引用部分的文章）。

## 通过脚本一键搭建 V2Ray

233Boy 提供了完整的脚本用于创建 V2Ray 节点。代码以 GPL-3.0 协议[开源](https://github.com/233boy/v2ray)在 Github 上。

```bash
# 下载并运行 233Boy 提供的 V2Ray 安装脚本（会默认生成使用 Vmess-TCP 的链接）
bash <(wget -qO- -o- https://git.io/v2ray.sh)
# 添加新节点
v2ray add Vmess-TCP-dynamic-port
```

此时会得到我们新生成的链接，对于 V2RayN 用户，此时复制粘贴进 V2RayN 即可使用（支持ShadowRocket、V2RayN）。但是对于其他 VPN 客户端，比如 Clash系列来说，并不一定能直接支持，此时需要部署订阅转换服务。

> **为什么需要自己搭建自己的订阅转换服务而不是使用其他人的？**

我也在思量这个问题。

## VPS 性能调优

参见 [Linux 网络优化](https://www.taurusxin.com/linux-network-optimize/)，运行脚本前请先下载 speedtest 进行测速，对比优化前后速度，避免错误的优化。

## 使用 CloudFlare 扩展 VPS 网络出口

参见 [Cloudflare WARP 教程：给 VPS 额外添加“原生” IPv4/IPv6 双栈网络出口](https://p3terx.com/archives/use-cloudflare-warp-to-add-extra-ipv4-or-ipv6-network-support-to-vps-servers-for-free.html)。一般而言所购买的服务器只有 IPv4。我们可以通过 warp 添加 IPv6 并调整 v4/v6 的使用优先级，将默认的出站 IP转成 warp 的 IP。

我的建议是给 IPv4 only 的服务器只添加 IPv6 warp, 并且 IPv6优先于 IPv4（如何确认上述文章有提及）。

## 部署订阅转换服务（可选）

最好拥有自己的域名，国内外的域名供应商皆可。

## 使用 CloudFlare Pages 部署订阅链接

最好拥有自己的域名，一般购买很方便且可以很便宜。教程参见 [Pages 部署方法](https://github.com/cmliu/CF-Workers-SUB?tab=readme-ov-file#pages-%E9%83%A8%E7%BD%B2%E6%96%B9%E6%B3%95-%E8%A7%86%E9%A2%91%E6%95%99%E7%A8%8B)

## 总结

按照如上步骤，可以得到个人使用的性能良好的 VPS，从而可以更好地浏览和使用互联网上的资源。

## 额外的问题

> 无法访问引用的网页（比如 GitHub、个人博客）怎么办？

考虑安装 Watt Toolkit，其提供 GitHub 网络加速(通过修改 Hosts 的方式)。

## Reference

1. [V2Ray 一键搭建详细图文教程（小白试用）-233Boy](https://233boy.com/v2ray/v2ray-server/)
2. [V2Ray搭建详细图文教程 - 233Boy](https://github.com/233boy/v2ray/wiki/V2Ray%E6%90%AD%E5%BB%BA%E8%AF%A6%E7%BB%86%E5%9B%BE%E6%96%87%E6%95%99%E7%A8%8B)
3. [VPS 网速优化](https://www.taurusxin.com/linux-network-optimize/)
4. 订阅链接汇聚 [cmliu/CF-Workers-SUB](https://github.com/cmliu/CF-Workers-SUB)
5. [Setup Cloudflare WARP on IPv6 Only VPS](https://www.animmouse.com/p/setup-cloudflare-warp-on-ipv6-only-vps/)
6. [Cloudflare WARP 教程：给 VPS 额外添加“原生” IPv4/IPv6 双栈网络出口](https://p3terx.com/archives/use-cloudflare-warp-to-add-extra-ipv4-or-ipv6-network-support-to-vps-servers-for-free.html)
7. [【配置优化】我拿到VPS服务器必做的那些事](https://linux.do/t/topic/160305)
