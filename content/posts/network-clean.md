---
title: 怎么让网络变得干净
date: 2026-10-11 19:40:02
categories: ''
tags:
description: ''
draft: false
---

简单说，就是如何配置正确的 DNS、代理分流。

## DNS

检测 DNS 的工具

推荐 [ip.sb](https://ip.sb/) ，以及 [broswerleaks.com](https://browserleaks.com/)。 主要看 Location 是否一致，ISP 是否如分流策略一致。

## 分流对象

需要注意 [datadoghq.com ](https://www.datadoghq.com/)一定需要经过代理，一些应用会通过其探测您的网络环境。
