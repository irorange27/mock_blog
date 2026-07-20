---
title: cluade code compact 行为
date: 2026-06-23 20:17:42
categories: ''
tags:
  - Agent
  - AI Agent
  - Claude Code
description: ''
draft: true
---

在 Claude Code 中输入 `/compact` 之后发生了什么呢？

实验版本：

`Claude Code`: v2.1.118

第一告知当前情况（目前的会话继续自超过上下文），第二是告知模型早期对话的总结。

```text
This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
```

总结包含以下部分：

1. 主要请求和意图
2. 重要的技术概念
3. 涉及的文件和代码
4. 错误和相关修复
5. 正在解决的问题
6. 来自用户的所有历史消息
7. 正在进行的任务
8. 当前的工作
9. 可选的下一步

总结之后跟这一句话。

```text
 If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: 具体记录的地址
```
