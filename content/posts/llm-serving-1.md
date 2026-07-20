---
title: LLM Serving（一）:以在H200上部署GLM-5.2为例
date: 2026-07-21 06:15:44
categories: ''
tags:
description: ''
draft: true
---
LLM Serving 或者说 AI Serving 可以说是 AIGC 不可或缺的一环，能提高硬件使用率，加快生成效率，降低用户的延迟和加大吞吐都是实打实的经济效益。而新的模型带着新的模型架构出现，对应的 inference infrastr

这么一块明显的地方，确实已经很早有人发现并付之行动了，23年的vLLM，24年后起之秀的SGLang，都是做 inference 加速的。