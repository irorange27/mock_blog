---
title: 怎么让网络变得干净
date: 2026-10-11 19:40:02
categories: '技术'
tags:
  - VPN
  - 网络
  - AI
description: '一个干净的网络，让人省心的使用服务。'
draft: false
---

简单说，就是如何配置正确的 DNS、代理分流。

目前（2026年）的网络代理软件非常成熟，正确配置之后不管是基于 TCP 或 UDP 的流量都能正确代理流量。关键在于还有哪些需要做的。

## DNS

检测 DNS 的工具

推荐 [ip.sb](https://ip.sb/) ，以及 [broswerleaks.com](https://browserleaks.com/)。 主要看 Location 是否一致，ISP 是否如分流策略一致。记得同时检测 WebRTC，指纹等等。

## 分流对象

需要注意 [datadoghq.com ](https://www.datadoghq.com/)一定需要经过代理，一些应用会通过其探测您的网络环境。

对特定应用使用前，可以先少量使用确认其网络连接是否遵循分流规则，是否存在漏网之鱼等等。避免网络环境没有按照预料的进行。

::note
订阅的机场提供的配置，不一定覆盖所使用的服务，有些甚至 DNS 配置都很有问题。需要自己通过拓展脚本等的方式，确保配置正确。
::

## 实际案例

1. Google 转区

    一开始在TUN+规则模式下发的转区请求（从cn转到ja），都没过（基本两小时以内回复）。最后改成TUN+全局就转成功了。

2. Claude 使用

    把 Claude 相关域名以及 datadog 都 `DOMAIN-SUFFIX` 写进代理配置后，应该可以在 TUN+rules 下随意注册使用 Claude free 服务。

    新账号付费的时候会弹 KYC，准备好相关材料，如果是在没有可以用的资料，可以 AI Gen 用来过 KYC。Claude本身是不知道 KYC 的具体资料的。
