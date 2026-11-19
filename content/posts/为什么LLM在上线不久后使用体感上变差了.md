---
title: 为什么模型上线后，体感像是“降智”了？
date: 2026-09-29 21:44:08
categories: '技术杂谈'
tags:
  - LLMs
  - Serving
  - 量化
description: '权重与 KV cache 的量化都能降低 serving 成本，也可能改变输出；但体感变弱不足以证明服务后来切换了精度。'
draft: false
---
如果你觉得某个模型刚上线时表现更好，但过一段时间后，同一个模型名下的回答却像变迟钝了，serving 侧的量化值得排查。量化能降低显存占用和推理成本，也可能改变模型输出。

## Checkpoint 与 serving 配置

仅知道训练得到的 checkpoint，并不能判断线上服务是否直接按 checkpoint 保存时的精度运行。Serving 配置涉及模型计算所用的 `dtype`、权重量化方案和 KV cache 的存储 `dtype` 等方面；这些配置能否组合使用，以及量化是否同时覆盖权重与激活，取决于量化方案、模型和硬件。

以 vLLM 为例，在线量化可以在加载 BF16/FP16 模型时把 Linear、MoE 权重转换为 FP8；KV cache 也有独立的 `--kv-cache-dtype` 设置。[vLLM 在线量化文档](https://docs.vllm.ai/en/latest/features/quantization/online/)、[serving 参数文档](https://docs.vllm.ai/en/latest/cli/serve/) 展示了这条技术路径，但没有说明任何特定厂商怎样部署。

因此，量化不一定以替换 checkpoint 文件的方式发生；服务可以从上线之初就使用量化配置，也可以之后调整配置。对外模型名本身无法告诉用户后端使用的精确 revision、路由或数值格式；“上线时直接跑训练 checkpoint，后来才换成量化 checkpoint”只是众多可能部署过程中的一种。[vLLM 模型配置文档](https://docs.vllm.ai/en/latest/api/vllm/config/model/) 也分别配置了对外服务名与模型 revision。

## 权重量化与 KV cache 量化

权重量化用较少位元表示参数，能压缩权重显存占用，并减少解码时读取权重的内存流量；端到端延迟是否下降，取决于量化内核和硬件能否高效执行。数值近似会改变前向计算得到的 logits。如果最高分 token 与其他候选 token 接近，细微误差就可能改变下一个 token，自回归解码随后会沿着新的文本继续。输出因此可能变化，任务质量却不必然明显下降。

[GPTQ（GPT 模型后训练量化方法）论文](https://arxiv.org/html/2210.17323v2) 在 OPT（Open Pre-trained Transformer）、BLOOM（BigScience Large Open-science Open-access Multilingual Language Model）等模型及 perplexity、zero-shot 基准上评测了离线权重量化。

例如，OPT-175B 在 WikiText2 上的 perplexity，FP16 基线为 8.34，4-bit GPTQ 为 8.37。该结果表明这一方案在这个指标上保留了质量，但不能保证其他量化方法、模型或线上对话也有相同表现。论文报告的速度收益依赖定制 GPU kernel 和减少内存搬运的实现。

权重之外，推理还会保存已处理 token 的 key/value，供后续 token 生成时计算 attention。活动序列越长、并发请求越多，KV cache 通常占用越多显存，因此压缩它能腾出并发空间。KV cache 精度与权重精度是不同的配置维度，调整 KV cache 精度也可能影响回答。

[KIVI（KV cache 非对称量化方法）论文](https://arxiv.org/html/2402.02750v2) 给出了一个 2-bit KV cache 方案：key 按 channel 量化，value 按 token 量化，并为近期 token 保留全精度残余区。它在 Llama、Mistral 的若干基准上报告较小的质量下降，也评测了 LongBench 长上下文任务；论文同时指出，Falcon 的多查询注意力让原始 KV cache 较小，2-bit 方案在部分任务上可能明显退化。

论文摘要报告，Llama-2-7B 使用 KIVI 时的峰值总显存约为 FP16 基线的 1/2.6（统计口径包含模型权重）。

第 4.2.4 节另报告一组吞吐实验：研究者在单张 80GB A100 上使用 ShareGPT 衍生负载，逐步增大 batch 至显存耗尽。以 FP16 基线为比较对象、显存上限相近时，KIVI 可容纳最高 4 倍 batch size，吞吐为基线的 2.35 到 3.47 倍。结果受论文所用模型、硬件和负载限制，不能直接外推为生产服务的速度保证。量化效果取决于方案、模型、任务和运行条件；长上下文质量也不能只凭位宽判断。

## 怎样判断服务是否改过精度

运营者采用低精度配置有成本动机：较小的权重与 cache 能释放显存，有机会容纳更多并发请求。但研究论文和开源引擎文档证明的是技术可行性，不是某家服务实际做过哪次变更。同样的体感还可能来自模型 revision 或路由、系统提示词、采样参数和推理预算的变化。

用户侧要判断服务是否变过，需要保留上线初期的同题输出作基线，固定可见的模型版本、输入、采样参数和工具设置，再重复测试短、长上下文任务并盲评。没有历史基线，只能测量当前表现；如果系统提示词、路由或模型 revision 不公开，前后结果的变化也无法定位到量化。

能访问 serving 配置时，可以固定 checkpoint `revision`、代码与量化内核、硬件、tokenizer、模板和采样配置，分别比较权重量化与 `kv_cache_dtype`。两者可能相互作用，因此还可以补齐四种配置：都不量化、仅量化权重、仅量化 cache、两者都量化。若权重量化方案同时改变激活精度，测到的是整套方案的效果；要单独归因权重，还需固定激活精度或选用 weight-only 方案。

因此，量化是“体感变弱”的一种可检验解释。要断定某项服务上线后才切换了精度，还需要部署变更记录或能够隔离变量的服务端对照。
