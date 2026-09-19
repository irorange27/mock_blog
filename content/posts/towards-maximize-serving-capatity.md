---
title: 如何在 offline bench 里最大化 LLM serving system 的吞吐 
date: 2026-09-19 05:45:05
categories: ''
tags:
description: ''
draft: true
---

存在一个不可拓展的推理系统，其评价指标是在同样的硬件下最小化用户平均的TTFT和TPOT。评测时根据不同任务，requster会根据任务类型做对应的workload，且requester的并发数恒定。当一个request完成时，便向推理系统发出新的req。

benchmark的任务类型涵盖chat、长输入、长输出，coding agent等等场景，详见下表。

正式评测共包含 10 个 case：

| Problem ID | 场景说明 |
| --- | --- |
| LLM-A1 | Multilingual Chat: 中英文混合的单轮与多轮对话，考察通用对话服务的吞吐与稳定性。 |
| LLM-A2 | Long Prefill 64K: 最高 64K 级别的长上下文输入，重点覆盖 prefill、KV cache 与长上下文处理。 |
| LLM-A3 | Ultra Context 1M: 接近 1M context window 的超长输入，考察超长上下文处理、显存管理与服务稳定性。 |
| LLM-A4 | Long Decode: 长文本持续生成，考察 decode 吞吐、流式输出和长时间请求稳定性。 |
| LLM-A5 | Coding Agent: 多轮编程智能体任务，包含代码、工具交互历史和持续增长的会话上下文。 |
| LLM-B1 | Multilingual Chat: 中英文混合的单轮与多轮对话，考察通用对话服务的吞吐与稳定性。 |
| LLM-B2 | Long Prefill 64K: 最高 64K 级别的长上下文输入，重点覆盖 prefill、KV cache 与长上下文处理。 |
| LLM-B3 | Ultra Context 1M: 接近 1M context window 的超长输入，考察超长上下文处理、显存管理与服务稳定性。 |
| LLM-B4 | Long Decode: 长文本持续生成，考察 decode 吞吐、流式输出和长时间请求稳定性。 |
| LLM-B5 | High Reasoning: Think High 模式下的复杂推理任务，考察长推理过程的吞吐与流式响应稳定性。 |

