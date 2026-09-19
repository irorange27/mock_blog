---
title: LLM的数学基础（1）：
date: 2026-09-19 22:59:55
categories: ''
tags:
description: ''
draft: true
---

我们从范畴论的角度来谈论LLM的数学基础。范畴学是描述关系的工具，Attention中QKV类似先做余弦相似度根据相似度查询的数据库思想，其实和范畴论高度一致。甚至在生产部署中的 infra 也可以通过范畴论来概括。我们可以从模型本身的结构和工程的实践中抽象出类似的关系结构，而通过这种关系结构，我们可以更好的把握LLM模型结构到实际生产部署中的各种理解。

Transformer是autoregressive的。

```plaintext
previous state ──────────────┐
                             ▼
new token ── computation ── update ── new state
                             │
                             ▼
                           output
```

我们可以用如上图表示整个auto regressive的变换过程。
