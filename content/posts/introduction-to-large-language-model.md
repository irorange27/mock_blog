---
title: 大语言模型入门基础
date: 2026-06-16 22:36:11
categories: '殆罔集'
tags:
  - Transformer
  - LLMs
description: ''
draft: False
---

本文介绍大语言模型(LLM)的基础内容。

## Insight

对于推理时的 LLMs 来说，它只做一件事：预测下一个 token。这听起来是一件非常简单的一件事。为什么 LLMs 却在文本模态上表现的如此全能呢？

力大砖飞？道法自然？或许都对。LLMs 在海量数据上做了 pretrain。截止到2026年4月份，国内开源的几家模型公司在预训练阶段训练的token数量大约都在30T-35TB之间。模型每个参数预训练消耗的token都远大于20了。并且我相信这个数据使用量会在 DeepSeek V4 分享他们新的稀疏方法后，继续增长。另外，qwen 小模型的实践告诉了我们：预训练时，随着数据量的增多，即使是小模型，其能力也在稳步提升。

## 数据飞轮

在模型的长上下文突破(RoPE、YaRN), 基座模型 Agentic 能力提升， LLM Infra(vLLM、SGLang etc.) Day0级跟进支持等等突破之后，一批全新的、过去没有的长上下文 Agent 任务的数据在飞速产生。这个时候谁拥有更多数据（并且能聪明地运用），那么他们下一代的模型就会更强，这是个正反馈的过程，也被称为数据飞轮。

数据飞轮正在拉大不同模型厂商之间的差距。

## 看到新的 Token 产生的时候，发生了什么？

使用 LLM 时，输入的是人类的文本，输出的是人类的文本，这个过程中模型到底做了什么呢？

在看到文本的前一步，token是经过采样后得到的next token ID，根据ID一做 detokenizer 就得到看见的文本了。

得到 token id 的前一步，是经过 Softmax 计算出的一个概率矩阵，根据不同的解码策略（贪婪解码：取概率最大的； 投机解码：需要 MTP 模块； 或者按概率采样等等），选择next token id。再上一步就是 logits。我们平常说的 Temperature（对 logits 矩阵做除法）、Top-K（只在概率最大的K个Token中选）、Top-P（只在累积概率P以内的Token中选）都是在这步做的。

logits 输出前是 LM Head（Linear 层），它将 hidden Linear 的特征数扩大到词表的大小。在此之前是文本经过 Embedding 向量化和 PE（Positional Encode）后进入若干个 Transformer Block 后又过了一遍 RMSNorm。

Transformer Block很简单。就是 Attn 机制加上前馈网络（FFN）罢了。

```python
# Input: x
# Transformer Block
def forward(self, x):
    x = x + Attn(RMSNorm(x))  # 简单的残差
    x = x + FFN(RMSNorm(x))
    return x
```

Attn 机制的话，现在有DSA、MLA等等。不过未来的趋势还是掌管稀疏的神——DeepSeek的新Attention的时代，这成本降的太夸张了。

干了什么？混合注意力（CSA：压缩稀疏注意力， HCA：高度压缩注意力）。不仅仅是上一代注意力的稀疏性，还直接对 Attn 进行压缩。表明了一个潜在的观点，对于长上下文（百万级），即使利用其稀疏性能够将 Attn 的算法复杂度降到 O(L)级。但是面对长上下文存储的 KV Cache还是无能为力。V4 直接对 Attn 进行压缩，减少 KV Cache数量。（Tips: KV Cache可以近似看成 Context 的物理实体）

```python
def forward(self, x):
    # 计算多头注意力 -> xq, xk, xv
    xq, xk = RMSNorm(xq), RMSNorm(xk) # qk-norm
    
    xq, xk = apply_RoPE(xq, xk, cos, sin) # 加入相对位置编码
    #... 存 KV Cache。  
    # KV Cache 一般存显存。但是现在有存在SSD上的，比如DeepSeek，使得缓存命中成本惊人的低，是未来降低推理成本的一个方向

    output = F.scaled_dot_product_attention(xq, xk, xk, is_casual=True) # FlashAttention
    output = output.transpose(1, 2).reshape(bsz, seq_lean, -1)

    return output, past_kv
```

## Optimizer

除了 Embeding 模型和 LM Head Linear层以及其余Linear层、Bias用 AdamW 优化器，其余矩阵用 Muon(dim>=2)。Muon 能够保证矩阵正交性，可以加速收敛，Loss下降更稳定。但是 Muon 较新，一些后端实现的性能不好（比如 PyTorch 2.12 的 mps 后端， 替换 AdamW 之后训练速度变慢了）。

不过使用 Muon 是趋势，相比 AdamW 能够减少一半optim的参数使用，训练也更稳定。

## MTP 多 Token 预测

一次推理输出多个 Token。

如何实现？加上一个 MTP 模块（可以当只有一块注意力块的LLM）：输入是模型预测出的t+1，经过类似的步骤但是Transformer Block只有一块（减少计算量以及显存开销），得到t+2。嵌套调用后可以一次推理得到多个token。和主模型的 logits 一对比后，结果一样的就保留，不一样的就重新预测。因为序列相近，语义大概率类似，因此成功率很高，一般可以实现2-3倍的加速比。
