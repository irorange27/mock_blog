---
title: 现代 LLM 的 Memory-Compute Trade-off：从 MHA 到 MLA、Sparse 与 Linear Attention
date: 2026-09-11 12:00:00
categories: '技术杂谈'
tags:
    - LLMs
    - Attention
    - MLA
    - DeepSeek
    - 长上下文
description: 'ds4.1f 上线了。它的架构 novel 在哪，便宜和快又是从哪省出来的。'
draft: false
---

GPT6出来之后，体感上很多人都很焦虑迷茫，真的到了AGI time，接下来该做什么呢？虽然说Astra用下来，在一些case上还是会overfit，但真的已经能胜任大多数人完成的任务了（在数字世界里）。这两天ds4.1f正式上线了，如此novel的架构让我感到新奇，模型架构与硬件的co-design达到一定水平的杰作，让我们来看一下吧。**这篇由 AI 整理。**

从 MHA 出发，一路到 Linear Attention，看每一代分别在砍哪一项成本。

## MHA 与 KV Cache

MHA（Multi-Head Attention）是这一切的起点，2017 年《Attention Is All You Need》里提出来的。数学上它就是多个独立的单头注意力拼起来。假设输入向量序列是 $x_1, x_2, \cdots, x_l$，其中 $x_i \in \mathbb{R}^d$。$h$ 是 head 数，$(s)$ 是 head 的下标，$s = 1, 2, \cdots, h$。那么：

$$
o_t = [o_t^{(1)}, o_t^{(2)}, \cdots, o_t^{(h)}]
$$

$$
o_t^{(s)} = \mathrm{Attention}(q_t^{(s)}, k^{(s)}_{\le t}, v^{(s)}_{\le t}) \triangleq \frac{\sum_{i \le t} \exp(q_t^{(s)} k_i^{(s)\top}) v_i^{(s)}}{\sum_{i \le t} \exp(q_t^{(s)} k_i^{(s)\top})}
$$

$$
q_i^{(s)} = x_i W_q^{(s)} \in \mathbb{R}^{d_k}, \quad k_i^{(s)} = x_i W_k^{(s)} \in \mathbb{R}^{d_k}, \quad v_i^{(s)} = x_i W_v^{(s)} \in \mathbb{R}^{d_v}
$$

::note
（省略了缩放因子。常见设置是 $d_k = d_v = d/h$。）关键在因果性。自回归生成时，新预测出来的第 $t+1$ 个 token 不会影响已经算好的 $k^{(s)}_{\le t}$ 和 $v^{(s)}_{\le t}$，所以这部分可以缓存下来，避免重复计算。这就是 KV Cache。它的大小约等于：
::

$$
2 \times L \times h \times d_k \times N \times \text{bytes}
$$

其中 $L$ 是层数，$N$ 是序列长度。注意这里面的 $N$。模型参数是个常数，选定模型就不再变了；但 KV Cache 随 $N$ 线性增长。Context 足够长的时候，它会变成显存里的主导项，可能超出一张卡甚至一台机（8 张卡）的总显存。举个数。按 GPT-3 的配置算：96 层，96 个 attention head，每个 head 维度 128。单个 token 的 KV Cache 是

$$
2 \times 96 \times 96 \times 128 \approx 2.36\text{M}
$$

个参数。按 2 字节精度存，就是 4.7 MB。一个 token 4.7 MB。128k context 就是 600 GB 量级。这个数字基本说明了为什么长上下文不是"再多加个位置编码"就能解决的。它是个显存和带宽问题。而 GPU 部署有个很不讲道理的原则：能一张卡放下的，就不要跨多张卡；能一台机放下的，就不要跨多台机。因为卡内通信带宽 > 卡间通信带宽 > 机间通信带宽。木桶效应，跨的设备越多，被最慢那段拖累得越狠。

单卡 H100 内 SRAM 到 HBM 的带宽已经有 3 TB/s，对 short context 来说这依然是瓶颈，更不用说更慢的卡间和机间了。

## Prefill 与 Decode

LLM 推理分两个阶段，它们的成本结构不同。**Prefill**：把输入的所有 token 并行算一遍，同时把 KV Cache 建起来。所有 token 一起算，矩阵运算排得很满，算力基本能吃满。它是 **compute bound**。**Decode**：之后逐个生成 token。这里有个容易漏掉的点。

每生成一个 token，计算量很小，但要读的东西一点都不少：**模型权重**要整体过一遍，KV Cache 也要读一遍。

不是读一部分权重，也不是只读 attention 那几层。每一步都要把参与计算的权重从 HBM 搬进 SM。算得少，搬得多。所以 decode 是 **memory bound**。同一个模型，两个阶段的瓶颈完全不同。一个是 compute bound，一个是 memory bound。这件事的重要性在于：如果一个架构在两种形式下数学等价，那就可以 prefill 用一种算，decode 用另一种算，各取所需。MLA 就是这么干的。

后面 V4.1 那一节会把这两个瓶颈各自的账算一遍。最后把账单写全：

$$
C_{\text{total}} = C_{\text{attention}} + C_{\text{FFN/MoE}} + C_{\text{memory movement}}
$$

账单上还有另外两项，而且它们经常被无视。第二项 $C_{\text{FFN/MoE}}$ 是前馈层的计算。MoE（Mixture of Experts）就是把这层换成多个专家网络，每个 token 只激活其中少数几个。它跟序列长度 $N$ 成正比，跟模型宽度 $d$ 的平方成正比，所以量级是 $O(Nd^2)$。attention 那项是 $O(N^2 d)$。注意这两个量级里的指数位置不一样。

$N$ 小的时候，$N^2 d$ 打不过 $Nd^2$；$N$ 大起来之后才反过来。

这也是为什么在短 context 时代大家理所当然地只盯 attention。那时候它确实是瓶颈。但当 $N$ 从 4k 涨到 1M，情况变了；再等到 sparse attention 把 $N^2$ 压下去，$O(Nd^2)$ 这一项就浮到水面上了。第三项 $C_{\text{memory movement}}$ 是最容易漏的。GPU 上算一个 FLOP 很快，搬一次数据慢得多。

所以"减少 KV Cache"真正的收益，很多时候不是省显存，而是省搬运。但这件事有个限度：decode 每步要读的权重是固定的，搬不动。KV Cache 压到比它更小之后，继续压的边际收益就下降了。

这条限度解释了后面很多设计的取舍，也解释了为什么 1M context 之后，战场会转向每层的计算和权重。因为账单上还能砍的地方换位置了。

## MQA 与 GQA

既然 KV Cache 是问题，最朴素的想法就是：少存点。MQA（Multi-Query Attention）直接让所有 attention head 共享同一份 K、V。用公式说，就是把所有 $k, v$ 的上标 $(s)$ 去掉。它是 2019 年提出来的。那会儿 LLM 还没火，可见减少 KV Cache 早就已经是热门课题了。KV Cache 直接降到原来的 $1/h$。单从省显存的角度看，这已经是天花板了。

代价也很直白：原来一个 token 的每个 head 都有各自的 K、V，现在被压成一份，信息损失不小。

不过 MQA 的支持者认为这个损失被高估了。理由是不同 head 学到的 K、V 本来就高度相关，共享一份丢不掉太多有效信息；而且这部分损失可以通过继续训练补回来。这个论证后来被证明有一定道理，但"一定道理"和"可以无条件依赖"是两回事。GQA 的出现本身就说明，业界并不敢把压缩率开到 MQA 那么极端。

有个细节容易被忽略。MQA 共享 K、V 之后，attention 部分的参数量少了将近一半。为了保持总参数量不变，通常会相应增大 FFN 的规模。这能补回来一部分效果损失。但还有人担心压得太狠，影响学习效率和最终效果。于是有了 GQA（Grouped-Query Attention），那是 2023 年的事。GQA 把 $h$ 个 head 分成 $g$ 组，每组共享同一对 K、V。具体怎么分？

记第 $s$ 个 head 属于第 $\gamma(s)$ 组：

$$
\gamma(s) = \left\lceil \frac{sg}{h} \right\rceil
$$

（就是按顺序平均切开：前 $h/g$ 个 head 一组，接着 $h/g$ 个一组，以此类推。）于是 attention 写成：

$$
o_t^{(s)} = \mathrm{Attention}\left(q_t^{(s)},\ k^{(\gamma(s))}_{\le t},\ v^{(\gamma(s))}_{\le t}\right)
$$

注意 Q 仍然是每个 head 一份，只有 K、V 被分组共用。这个不对称就是 GQA 的全部内容。举个具体的数。$h = 8$、$g = 2$ 时，第 1 到第 4 个 head 共用一对 K、V，第 5 到第 8 个 head 共用另一对。$g = h$ 时每个 head 各自一对，退化成 MHA；$g = 1$ 时所有 head 共用一对，退化成 MQA。

它提供了 MHA 到 MQA 的自然过渡，压缩率不如 MQA，但自由度和效果保证更好。

llama2/3-70B 用的 $g = 8$。早年有个很整齐的解释：70B 这个体量放不进单卡，得单机 8 卡，而 attention 的 head 本来就是独立运算再拼接的，$g = 8$ 正好让每张卡负责一组 K、V 对应的 head，把卡间通信压到最小。这个解释现在不太站得住了。量化让更大的模型能进单卡，MoE 让 activated 参数远小于总参数，跨机推理也早就不是禁区。

两个现成的例子：Qwen3.8-Flash-Next 是 125B 的模型、每个 token 只激活 6B，在 B200 上用 TP4 就能跑（[SGLang 的 day-0 支持](https://www.lmsys.org/blog/2026-08-26-qwen-flash-next)）；DeepSeek-V4-Flash-FP8 同样 TP4 就能跑，H200 上就够。

所以更准确的说法是：$g$ 跟并行度对齐仍然是个好主意，但"必须单机 8 卡"这种硬约束已经没有了。$g = 8$ 能留下来，一半是因为并行度，一半是习惯。但 MQA 和 GQA 有一个共同的性质，值得单独点出来：

**它们压的是 head 的数量，不是 head 的内容。**

被保留下来的那些 KV，每一个仍然是完整的、未经压缩的向量。共享是**离散**的。要么整份共用，要么各自一份，中间没有别的可能。下一节就是打破这个限制。

## MLA

MLA（Multi-head Latent Attention）是 DeepSeek-V2 在 2024 年 5 月提出来的，到现在两年多。技术报告是从低秩投影的角度引入的，以至于有人问：LoRA 提出这么久了，为什么直到 MLA 才有人对 KV Cache 做低秩分解？我认为低秩投影这个角度不贴近本质。因为要说低秩投影的话，只要把 GQA 的所有 K、V 拼成一个长向量，就会发现 GQA 本身也是低秩投影。

把这个拼起来的向量记作 $c_i$。它由 $g$ 组 K、V 依次首尾相接而成：

$$
c_i = [k_i^{(1)}, \cdots, k_i^{(g)}, v_i^{(1)}, \cdots, v_i^{(g)}] \in \mathbb{R}^{g(d_k + d_v)}
$$

而它整个是由 $x_i$ 一次矩阵乘法得到的。把各组投影矩阵横向拼起来记作 $W_c$：

$$
c_i = x_i W_c, \qquad W_c = [W_k^{(1)}, \cdots, W_k^{(g)}, W_v^{(1)}, \cdots, W_v^{(g)}] \in \mathbb{R}^{d \times g(d_k + d_v)}
$$

因为 $d_c = g(d_k + d_v) < d$，这一步就是在把维度压小。所以 $x_i \to c_i$ 本来就是低秩投影。也就是说，光看"低秩投影"这一步，GQA 和 MLA 没有区别。MLA 的本质改进不在低秩投影，而在**低秩投影之后做了什么**。GQA 投影之后干的事很简单：把向量对半分成 K 和 V，每一份再均分成 $g$ 份，每份复制 $h/g$ 次，凑够 $h$ 个 head。分割和复制都是极简的线性变换。

MLA 的第一步想法就是把它们换成一般的线性变换，让每个 head 拿到的 K、V 各不相同：

$$
k_i^{(s)} = c_i W_k^{(s)} \in \mathbb{R}^{d_k}, \quad v_i^{(s)} = c_i W_v^{(s)} \in \mathbb{R}^{d_v}
$$

但这样问题就来了。我们缓存的是投影后的 $k_i, v_i$，一旦它们各不相同，KV Cache 就恢复成 MHA 那么大，GQA 的初衷全丢了。MLA 的做法是找一个恒等变换绕过去。在推理阶段：

$$
q_t^{(s)} k_i^{(s)\top} = (x_t W_q^{(s)})(c_i W_k^{(s)})^\top = x_t (W_q^{(s)} W_k^{(s)\top}) c_i^\top
$$

这意味着可以把 $W_q^{(s)} W_k^{(s)\top}$ 合并起来当作 Q 的投影矩阵，那么 $c_i$ 就取代了 $k_i$。同理 $v_i^{(s)} = c_i W_v^{(s)}$ 里的 $W_v^{(s)}$ 也能吸收进后面的输出投影，$v_i$ 也可以用 $c_i$ 代替。于是推理时 KV Cache 只需要存 $c_i$。而 $c_i$ 与 $(s)$ 无关，是所有 head 共享的。

**MLA 在推理阶段恒等变换成了一个 MQA。** 到这里 MLA 完成了什么就很清楚了：它用不同的投影矩阵增强了 GQA 的能力，同时在推理时保持同样大小的 KV Cache。反过来想，如果只需要跟 GQA 相当的能力，那 $d_c$ 就不必取 $g(d_k + d_v)$，取更小的值就行。DeepSeek-V2 取了 512。

这就是 MLA 的核心。低秩压缩为什么有效？因为不同 head 需要的信息本来就有大量重叠。下投影矩阵负责提取这些共同信息，上投影矩阵让各个 head 用各自的方式去使用它。这甚至可能带来一点正则化效果。它强制模型把冗余的共同信息压进同一个低维空间，而不是每个 head 各存一份。

我一开始以为 MLA 只是"把 KV 存小一点"。后来才反应过来，它换掉的是一整套共享方式。存小只是结果，不是原因。

> **补充说明**
>
> $W_q^{(s)} W_k^{(s)\top}$ 合并成一个矩阵，理论上只在无限精度下成立。实际上如果用 BF16，变换后的精度损失往往挺明显，多层累积后可能放大到可观的程度。
>
> 另外实际实现一般不按 $x_t (W_q^{(s)} W_k^{(s)\top})$ 算 Q，而是按 $(x_t W_q^{(s)}) W_k^{(s)\top}$ 算。虽然是串行的，但在低秩假设下计算量更少，理论精度损失也更小。

不过别急。到这里 MLA 有个绕不开的缺陷：**不兼容 RoPE**。前面那步恒等变换能成立，关键在于 $W_q^{(s)} W_k^{(s)\top}$ 是一个跟位置无关的固定矩阵。加上 RoPE 之后就不行了：

$$
q_t^{(s)} k_i^{(s)\top} = (x_t W_q^{(s)} R_t)(c_i W_k^{(s)} R_i)^\top = x_t (W_q^{(s)} R_{t-i} W_k^{(s)\top}) c_i^\top
$$

$W_q^{(s)} R_{t-i} W_k^{(s)\top}$ 跟位置差 $t - i$ 相关，无法合并成一个固定矩阵。放弃 RoPE 换 ALIBI 之类的 attention bias 是一种办法，但实验显示明显不如 RoPE。最后 MLA 采取的是混合方案：每个 head 的 Q、K 新增 $d_r$ 个维度专门用来加 RoPE，其中 K 新增的这部分在 head 间共享。

这样没有 RoPE 的维度继续走前面的压缩，带 RoPE 的维度补充位置信息。$d_r$ 取 $d_k/2 = 64$，相比 $d_c = 512$，增加幅度不大。

还有一个细节：MLA 最终版把 Q 的输入也改成了低秩投影。这跟减少 KV Cache 无关，主要是为了减少训练期间的参数量和梯度所占显存。$d_c'$ 取 1536，和 $d_c = 512$ 不同。于是解码阶段的 MLA 是 MQA 形式，Q、K 的 head size 变成 $d_c + d_r$，是 $d_k$ 的 4 倍。

**解码的计算量其实是增加的。**

用 DeepSeek-V2 的配置把这笔账算一遍。$L = 60$ 层，$h = 128$ 个 head，$d_k = 128$，MLA 这边 $d_c = 512$、$d_r = 64$，BF16 存储，所以每参数 $b = 2$ 字节。decode 到第 $N$ 个位置时，每 token 每层：

| | KV 读取 | attention FLOPs |
| --- | --- | --- |
| MHA | $2 h d_k N b$ | $4 h d_k N$ |
| MLA decode | $(d_c + d_r) N b$ | $2h(d_c+d_r)N + 2hd_cN$ |

代进数字：

| | MHA | MLA | 比值 |
| --- | --- | --- | --- |
| KV 读取 / 层 / token | $65536N$B | $1152N$B | **1 : 56.9** |
| attention FLOPs / 层 / token | $65536N$ | $278528N$ | **4.25 : 1** |

用 roofline 分析一下。H100 SXM 的 BF16 算力约 989 TFLOPS，HBM3 带宽 3.35 TB/s，拐点在：

$$
\frac{989\ \text{TFLOPS}}{3.35\ \text{TB/s}} \approx 295\ \text{FLOP/byte}
$$

算术强度低于 295 就是 memory bound，高于才是 compute bound。

再看 MLA decode 这一侧。别忘了每 token 还要把权重读一遍。

- $N$：当前 context 长度，也就是 decode 到这一步时要看多少个历史 token
- $L = 60$：层数
- $c_{\text{kv}} = (d_c + d_r)b = 576 \times 2 = 1152$ 字节：每层、每 token、每多看一个历史位置，要多读多少 KV
- $c_{\text{flop}} = 2h(d_c + d_r) + 2hd_c = 278528$：每层、每 token、每多看一个历史位置，要多做多少次浮点运算
- $W = 21\text{B} \times 2\ \text{字节} = 42$ GB：每 token 要读的权重字节数（21B 是 activated 参数量），它不随 $N$ 变

算术强度就是一个字节要承担多少次浮点运算：

$$
\text{AI}(N) = \frac{2P + c_{\text{flop}} \cdot L \cdot N}{W + c_{\text{kv}} \cdot L \cdot N}
$$

分子是每个 token 要做的浮点次数：权重矩阵乘 $2P$，加上 attention 那部分。分母是要搬的字节：权重 $W$，加上 KV。代进数字：

$$
\text{AI}(N) = \frac{42 \times 10^9 + 278528 \times 60 \times N}{42 \times 10^9 + 1152 \times 60 \times N}
$$

$N$ 一大，分子分母里那两项权重就被 KV 和 attention 项压过去了，于是有上界：

$$
\lim_{N \to \infty} \text{AI}(N) = \frac{c_{\text{flop}}}{c_{\text{kv}}} = \frac{278528}{1152} \approx 242\ \text{FLOP/byte}
$$

注意 $L$ 被约掉了。**无论多少层，这个上限都一样**，因为 KV 和 attention 计算都随层数线性增长。

**242 小于 295。** 也就是说，不管 context 多长，MLA 的 decode 都落在拐点左边，是 memory bound。那 4.25 倍的计算量加进去就是白加的。算力本来就在空转等内存。

具体看几个长度：

| $N$ | 算术强度 | 内存耗时 | 计算耗时 | 瓶颈 |
| --- | --- | --- | --- | --- |
| 4k | 2.6 | 12.6 ms | 0.11 ms | memory |
| 32k | 13.3 | 13.2 ms | 0.60 ms | memory |
| 128k | 43.7 | 15.2 ms | 2.3 ms | memory |
| 1M | 153 | 34.2 ms | 17.8 ms | memory |

到 1M 的时候计算耗时（17.8 ms）已经追到内存耗时（34.2 ms）的一半了，但还没越过去。

不过这里只算了 batch size 等于 1。在线服务几乎不会单条跑，batch 是提高算术强度的另一条路子，而且它会改变结论。

原因很直接：权重每一步只需要读一次，然后同时喂给 batch 里所有序列；KV 读取却是一条序列一份。把 $B$ 写进去：

$$
\text{AI}(B, N) = \frac{B\left(2P + c_{\text{flop}} L N\right)}{W + B \cdot c_{\text{kv}} L N}
$$

$B$ 一大，分母里的 $W$ 就被摊薄，算术强度趋近于：

$$
\text{AI}(\infty, N) = \frac{2P + c_{\text{flop}} L N}{c_{\text{kv}} L N}
$$

代进数字：

| $N$ | $B=1$ | $B=8$ | $B=64$ | $B=512$ | $B \to \infty$ |
| --- | --- | --- | --- | --- | --- |
| 4k | 2.6 | 20.0 | 118 | **303** | **390** |
| 32k | 13.3 | 78.5 | 202 | 251 | 260 |
| 128k | 43.7 | 156 | 230 | 244 | 246 |
| 1M | 153 | 226 | 240 | 242 | 242 |

（加粗的是越过 295 的格子。）

于是结论要分区间说：

- **短 context（4k 这一档）**：batch 开得够大，decode 会翻到 compute bound。这时候那 4.25 倍的计算量是真的要还的。
- **32k 及以上**：即使 batch 开到无穷，算术强度也够不到 295。decode 始终 memory bound，那 4.25 倍照样白加。

原因在渐近值里写得清楚。$N$ 一大，$c_{\text{flop}} L N$ 就压过 $2P$，权重项被稀释掉，剩下的比值就是 $c_{\text{flop}}/c_{\text{kv}} = 242$，跟 batch 无关。

所以 batch 只在短 context 上有效，而短 context 恰恰是 MLA 收益最小的区间。前面那张加速比表里，4k 只有 1.4×。两件事碰在一起，这个取舍就更清楚了：**MLA 在自己最有价值的长 context 区间永远是 memory bound，那笔计算量从头到尾都不用还。**

长 context 下 batch 也开不大，还有另一个原因：KV Cache 装不下。MLA 在 128k 时每条序列 9.06 GB，32 条就是 290 GB，早就超出单卡。而同样条件下的 MHA 是 515 GB，**一条序列都放不下**。

所以 MHA 在长 context 不是一个"慢"的方案，是一个"跑不起来"的方案。

那"划算"的刻度在哪里？MLA 省的是字节，而字节由权重和 KV 两部分组成。KV 读取追平权重的位置：

$$
\text{MHA：}\ 3.93\ \text{MB} \times N = 42\ \text{GB} \Rightarrow N \approx 1.1\ \text{万}
$$

$$
\text{MLA：}\ 69.1\ \text{KB} \times N = 42\ \text{GB} \Rightarrow N \approx 61\ \text{万}
$$

既然两边都是 memory bound，加速比就等于字节数之比：

| $N$ | MLA 相对 MHA 的每 token 加速比 |
| --- | --- |
| 4k | 1.4× |
| 32k | 3.9× |
| 128k | 10.9× |
| 1M | 36.4× |

所以答案不是"足够大时才划算"，而是一条具体的曲线：**4k 时几乎白干（1.4×），32k 开始有意义（3.9×），128k 是 11 倍，1M 是 36 倍。**

这条曲线顺带解释了 MLA 的时间线。它 2024 年出来的时候，主流 context 还在 4k 到 32k 之间，那一段的收益并不惊人。真正让它值回票价的是后面 128k、1M 的军备竞赛。

另外还有一件事能说明这个设计有多自觉。一般 LLM 架构满足 $h \times d_k = d$，但 DeepSeek-V2 是 $d_k = 128, d = 5120, h = 128$，head 数是一般设置的 3 倍。

因为 MLA 的 KV Cache 大小跟 $h$ 无关。增大 $h$ 只增加计算量和提升模型能力，不增加 KV Cache，所以不会带来速度瓶颈。MLA 完成的思想升级可以写成一句话：

从离散的 head sharing，到连续的 representation compression

## CSA 与 HCA

### 压 Sequence 轴

MLA 压小的是每个 token 存的东西。但 $c_1, c_2, \cdots, c_N$ 仍然有 $N$ 个。如果每个 query 还是要看全部历史，那 $N \times N$ 还在。

**MLA 解决的是 KV 的宽度，没解决历史的长度。**

把 KV Cache 想成一个二维矩阵：

$$
\text{Sequence} \times \text{Feature}
$$

MQA、GQA、MLA 压的都是 Feature 轴。V4 开始压 Sequence 轴。V4 改成了三类 attention：

- **CSA**：先按大约 4:1 沿序列压缩，再用 Lightning Indexer 给每个 query 挑少量 top-k compressed blocks
- **HCA**：用更激进的序列压缩（约 128 倍），让 query 对压缩后的全局历史做 attention
- **Sliding Window**：保留最近的精细上下文

这两个压缩率不是估的。Hugging Face 对 V4 的实现文档给出了默认值：CSA 是 4，HCA 是 128。为什么非要留一个 sliding window？因为压缩是有损的。CSA 压到 1/4，HCA 压到 1/128，最近的几个 token 一旦被压进 block，细节就再也找不回来了。而语言模型对紧接着的上下文又格外敏感。代词指谁、缩进几个空格、刚才那个变量叫什么名字、上一个 tool call 返回了什么。

这些信息全都发生在最后几百个 token 里。

所以最近的一段必须原样保留。三类 attention 不是三个可以互相替代的方案，而是三段分工：最近的原样看，中间挑着看，最远的粗着看。这个分工其实很符合直觉。人读一篇长文档也是这样：最后一段逐字读，中间扫小标题，开头的细节早忘了，只记得大意。于是 attention 不再是简单的 $N \times N$，而是三种东西的叠加（记局部窗口大小为 $W$，每个 query 选中的 block 数为 $B$，压缩率为 $r$）：

$$
N \times W \quad \text{（局部窗口）}
$$

$$
N \times B \quad \text{（稀疏选中的 compressed blocks）}
$$

$$
N \times \frac{N}{r} \quad \text{（高度压缩的 global branch）}
$$

### 复杂度没有变成 O(N)

如果 HCA 那一路的 $r$ 是个固定常数，那么它的理论渐进复杂度仍然带有 $N^2/r$。

**并没有数学意义上 magically 变成 $O(N)$。**

但工程量级已经差很多。而 CSA 的 sparse branch 更接近：

$$
O(NB), \quad B \ll N
$$

这才是 V4 真正攻击 quadratic attention 的部分。所以"V4 把 attention 变成线性了"这种说法，把两件事混成了一件。严格结论和工程结论要分开讲。

## Linear Attention 与 SSM

前面所有方案都建立在同一个前提上：KV 要保存下来。那换个问题。**如果 KV 这么贵，为什么一定要保存它？** RNN 的答案是最极端的：

$$
h_t = \tanh(W_x x_t + W_h h_{t-1} + b)
$$

过去全部信息压进一个固定大小的状态。不保存 KV，只保存状态。代价是长期记忆很差，而且不能并行。LSTM / GRU 用门控改善了记忆，但没根治，也仍然不能并行。然后 Linear Attention 出现了：

$$
S_t = S_{t-1} + \phi(k_t) v_t^\top
$$

$$
o_t = \phi(q_t)^\top S_t
$$

每步只更新一个 state，复杂度 $O(N)$。看到这个式子会觉得眼熟。它其实是：

$$
\boxed{\text{LSTM 式的 recurrent state} + \text{Attention 式的 query-key retrieval}}
$$

所以它像一个"现代 LSTM"是有道理的，不是公式恰巧长得像。它重新选择了**压缩历史，而不是保存历史**。代价是信息碰撞。不同的 key 的信息全挤进同一个 state，容量有限，互相干扰。这件事值得展开一点，因为它是 Linear Attention 的核心缺陷，也是判断它能不能替代 full attention 的关键。state $S_t$ 的大小是固定的，跟 $d_k \times d_v$ 同阶，不随 $N$ 增长。

而它要装的是全部历史的信息。序列越长，需要塞进去的东西越多，碰撞就越严重。

具体表现是：想精确取回某一个早先 token 的信息时，取回来的其实是很多 token 叠加后的结果。full attention 能精确地只挑那一个，Linear Attention 做不到。所以它的失效方式不是"忘了"，而是"记混了"。这两个词听起来差不多，实际差很远。前者可以通过更好的门控缓解，后者是容量上限本身决定的。

**Mamba / SSM 是什么？**

SSM（State Space Model）是这条线的另一个分支，典型代表是 Mamba。它和 Linear Attention 的数学形式不同，但目标一样：用固定大小的状态代替完整历史，把 $O(N^2)$ 降到 $O(N)$。Mamba 的特点在状态更新的方式上。它让状态转移矩阵随输入变化，相当于给状态加了一层输入相关的门控。这和 LSTM 的门控思路一脉相承，只是换了个数学外衣。

所以往上看，Mamba、RWKV、RetNet、DeltaNet、Gated DeltaNet、Kimi Linear，看起来像一堆论文名字动物园，其实都在回答同一个问题：**怎么用固定大小的记忆，尽可能少地丢掉历史。** 于是有了 Hybrid：大部分层用廉价的 state memory，少数几层保留对完整历史的随机访问。

$$
\text{高速压缩记忆} + \text{偶尔随机访问原始信息}
$$

有个很漂亮的观察：这不是"RNN 又赢了"，而是大家终于发现 attention 的随机访问能力很好、RNN 的固定状态成本也很好，真正有意思的问题是怎么把两者揉到一起，而不是宗教战争式地选一个。

## Kimi 与 DeepSeek

到这里可以做一个全文最重要的比较。Kimi 和 DeepSeek 都在压历史，但压完之后的处理方式不一样：

$$
\text{Kimi：compress history into state}
$$

$$
\text{DeepSeek：compress history but keep it retrievable}
$$

### State Machine 与 Indexed Memory

Kimi 的 Linear Attention 路线（KDA 那一支）是把历史递推成一个 state，查询时直接对 state 做操作：

```text
历史
 ↓
recurrent state
 ↓
query state
```

DeepSeek 的路线是压缩，但压缩后的东西仍然带索引、可以被检索回来：

```text
历史
 ↓
compressed memory
 ↓
index / retrieval
 ↓
sparse attention
```

我把它们概括成：

$$
\boxed{\text{State Machine}} \quad \text{vs.} \quad \boxed{\text{Indexed Memory}}
$$

这比说"Linear Attention vs Sparse Attention"有解释力。因为后者的区别看起来只是稀疏程度不同，而前者是两种根本不同的 memory 哲学：一个是**把历史变成状态**，一个是**把历史变成可检索的索引**。有一个细节能说明 Kimi 这边并不只是"换了个 attention"。

K3 的技术报告把 refined training and data recipes、general/agentic/coding RL、million-token agentic RL infrastructure、sandbox state，和 KDA、AttnRes、LatentMoE 并列成核心进展。注意这个列表的构成：一半是架构，一半是数据和基础设施。

如果 KDA 真是能力跃迁的唯一来源，报告没必要把 RL infra 抬到同样的位置。

反过来看，这也解释了 KDA 这类工作为什么重要。它让 $1\text{M}$ context 和 long-horizon rollout 在计算上变得现实，于是以前喂不起的 RL trajectories 变得喂得起。架构在这里是**开路的**，不是**发力的**。DeepSeek 这边也一样。CSA/HCA 最漂亮的地方未必是"稀疏 attention 本身理解能力比 MLA 强"，而是 1M context 变得足够便宜。

那这两条路线谁能赢？我觉得决胜点不在复杂度写 $O(N)$ 还是 $O(NB)$，而在更朴素的地方：

$$
\boxed{\text{在同样的显存带宽和 FLOPs 下，谁还能准确找回 50 万 token 前那个关键细节。}}
$$

这才是长上下文模型最难骗 benchmark 的地方。

## L × N × D

把前面的方案合起来看，它们动的其实是同一个三维对象，也就是 KV 的形状：

$$
\boxed{L \times N \times D}
$$

$L$ 是层数，$N$ 是序列长度，$D$ 是每个 token 存下来的表示宽度。于是整条 DeepSeek 路线可以重新写成：

$$
\text{GQA / MLA：压 } D
$$

$$
\text{V4（CSA / HCA）：压 } N
$$

$$
\text{V4.1：压 } L \text{ 和 compute path}
$$

到 V4.1，问题变成了：

$$
\boxed{\text{既然历史已经压缩过一次，为什么每一层还要重复为它付费？}}
$$

ds4.1f 采用的是一个新架构族：552B MoE，Causal-Encoder-Decoder，输入侧约 8B activated、输出侧约 16B activated。这个不对称的计算预算是关键。要理解为什么 8B 和 16B 是分开的两个数，得把那两个瓶颈各自的账算一遍。先定符号。$P$ 是参数量（MoE 里指 activated 部分），$b$ 是每个参数的字节数，$N$ 是序列长度。**输入侧**面对的是长 prompt。

1M 个 token 全部要走一遍编码器，计算量约 $2PN$，而要读的权重只有 $P \times b$。

$N$ 到百万量级时，算术强度能到几千 FLOPs/byte，早就超过了硬件的算力带宽比。这一侧完全被算力卡住。想在 prefill 上省钱，唯一有效的办法就是把 $P$ 压下去。**8B 是这么来的。** **输出侧**面对的是逐个生成的 token，情况正好反过来。每生成一个 token，计算量只有 $2P$，但要读两份东西：模型权重 $P \times b$，加上 KV Cache。而模型权重是必须整体读一遍的。

拿 16B activated、BF16 存储来算：

$$
16\text{B} \times 2\ \text{bytes} = 32\ \text{GB}
$$

每生成一个 token，光权重就要搬 32 GB。而这一个 token 的计算量是 $2 \times 16\text{B} = 32$ GFLOPs。算术强度大约是 $1$ FLOP/byte。现代 GPU 的算力带宽比是几十到几百 FLOP/byte。差了将近两个数量级，意味着算力几乎全程在等内存。所以在 decode 这一侧，多算一点几乎不花钱。反正算力在空转等数据。既然这样，就没有理由在生成端省参数量。**16B 是这么来的。**

（这里按"每步只生成一个 token"算，是个简化。speculative decoding 会一次验证多个候选 token，test-time scaling、parallel decoding 这类技术也会改变每步的计算和内存特征。但它们不改变这条主线：无论一步生成几个 token，权重该读的还是要读，KV Cache 该读的还是要读。

speculative decoding 甚至更吃带宽，草稿模型本身要读一遍权重，验证阶段还要再读主模型。）

$$
\boxed{\text{Compute bound 的那一侧压计算，memory bound 的那一侧压不住，那就把能力堆上去。}}
$$

（这个读法是我的理解，不是官方给出的设计理由。但 8B 和 16B 正好落在 prefill 和 decode 两侧，而且方向符合各自的瓶颈，我觉得不像是巧合。）传统 decoder-only LLM 对 prompt 里每个 token 和 decode token 用几乎同一套昂贵 backbone，等于强迫两个瓶颈完全不同的阶段共用一套参数。

如果输入有 $N = 1\text{M}$，那么即使 attention 已经 sparse 或 compressed，你依然需要对百万 token 做很多层计算。V4.1 攻击的不只是 attention matrix：

$$
QK^\top
$$

还攻击整个长序列每层 FFN/MoE 的计算。这一点非常重要，因为前面那张账单上的第二项，一直被 $N^2$ 的光环盖着。attention 那项是 $O(N^2 d)$，FFN/MoE 那项是 $O(Nd^2)$。$N$ 大到百万量级、$N^2$ 又被打下来之后，后者因为每一层都要对每个 token 算一遍，纹丝不动。

所以 V4.1 做 asymmetric compute，本质上是：attention 都已经省下来了，总不能剩下的网络继续拿同样预算烧百万 token。终于有人检查了完整账单，而不是只盯着最显眼的那一行。

省下来的成本是多少？ds4.1f 的技术报告（[DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression](https://www.alphaxiv.org/abs/2609.deepseek-v4-1-flash)）给了具体的数。相比上一代 V4-Flash：

- 常驻 **HBM** 的 global KV cache：**890 字节 / token**，约为原来的 **1/4**
- 落在 **SSD 或 host memory** 的 persistent KV cache：约为原来的 **1/8**

报告把这些收益归因于"entry size、sequence dimension、layer dimension 三个方向上的协同优化"，落到 CSA2 上就是三个模式：投影让 head 之间共享信息（压 $D$）、把多个 token 合成一个 KV entry（压 $N$）、跨层复用 KV（压 $L$）。再加上主 KV cache 本身换成 FP4。

**这不就是前面的 $L \times N \times D$。** 前面那条"压宽度 → 压长度 → 压深度"的路线，在 ds4.1f 上是第一次三个方向同时动刀。

压 $L$ 这一个方向前面一直只是断言，说清楚它得看 CSA2 的三种模式：

- **Full**：这层自己算主 K、V，投影一个 indexer key，产出一组新的 Top-K 索引
- **Reindex**：主 K、V 和 indexer key 都从前一层继承，只重算 indexer query，于是选出一组**不同**的 Top-K
- **Reuse**：主 K、V 和 Top-K 索引全部继承，这层几乎不做索引计算

再配一个分层的 indexer：第一个 Full 层先圈出一个 block 级的候选池，后面的 Reindex 层只在这个池子里打分。于是每个 query 的索引开销被限住，context 是一万还是一百万都一样。

这才是"每一层不再重复为同一份历史付费"的具体做法。**不是每层都重建索引，而是让多数层复用、少数层重建。**

持久层那 1/8 靠的是另一个部署优化，叫 SWA Bounded Replay：局部窗口的 cache 不再常驻，请求恢复时只重放最近一小段就能近似重建，不必把整条序列重算一遍。

另外 CED 让 prefill 的复杂度从 $O(N \cdot L)$ 降到大约 $O(N \cdot \frac{L}{2} + n_{\text{win}} \cdot \frac{L}{2})$，长输入的计算量差不多减半。

那 890 字节 / token 在真实硬件上意味着什么。拿 B200 算一遍（[规格](https://inferencex.semianalysis.com/chips/b200)）。

先说部署形态。552B 权重按 FP4 存是 276 GB，单卡 180 GB 装不下，所以要拆卡。**四卡（TP4）就够**：每卡 69 GB 权重，还剩 111 GB 放 KV。

下面算的都是**每张卡**的数字。TP4 之后每卡只承担四分之一，所以字面值和耗时都除以 4，算术强度不变。

先把精度定死，因为算力和字节数都随它变：

| | 精度 | 依据 |
| --- | --- | --- |
| 模型权重 | FP4 | 每参数 0.5 字节 |
| KV cache | FP4（MXFP4） | 技术报告的 QAT 就是按 MXFP4 做的，890 字节 / token 是这个精度下的值 |
| 算力基准 | FP4 | B200 dense 9000 TFLOP/s |

三项同一把尺子，拐点和字节数才可比。

B200 的 BF16 / FP8 / FP4 dense 算力分别是 2250 / 4500 / 9000 TFLOP/s，HBM3e 带宽 8 TB/s。FP4 的拐点是：

$$
\frac{9000\ \text{TFLOPS}}{8\ \text{TB/s}} = 1125\ \text{FLOP/byte}
$$

decode 侧每 token 要搬多少？16B activated，FP4 存储：

$$
16\text{B} \times 0.5\ \text{字节} = 8\ \text{GB}
$$

KV 那边，1M context 时是 $890 \times 10^6 \approx 0.93$ GB。加起来 8.93 GB。算术强度：

$$
\text{AI} = \frac{2 \times 16\text{B}}{8.93\ \text{GB}} \approx 3.6\ \text{FLOP/byte}
$$

按 8 TB/s 的带宽上限，单流大约 900 token/s。

**3.6 对 1125，差了 300 倍。** B200 的 FP4 算力有 99.7% 用不上。

换权重精度结论也一样。KV 那 890 字节 / token 已经是 FP4 下的实测值，所以只动权重：

| 权重精度 | 权重字节 / token | 拐点 | 算术强度 | 差几倍 |
| --- | --- | --- | --- | --- |
| FP4 | 8.0 GB | 1125 | 3.58 | 314× |
| FP8 | 16.0 GB | 562 | 1.89 | 298× |
| BF16 | 32.0 GB | 281 | 0.97 | 289× |

精度降一半，拐点翻一倍，但算术强度也跟着掉一半，两边抵消。根源是 B200 上这三个精度的「算力 × 每参字节」都是同一个数：$9000 \times 0.5 = 4500 \times 1 = 2250 \times 2 = 4500$。所以**差多少倍基本由架构决定，不由精度决定**。

真正有意思的是这个拆分：

| 1M context 下每 token 的流量 | 字节 | 占比 |
| --- | --- | --- |
| 权重 | 8.0 GB | 90% |
| KV | 0.93 GB | 10% |

通过模型结构和硬件的codesign，**KV 已经不是瓶颈了。**

ds4.1f 把 KV 压到 890 字节 / token 之后，就算跑到 1M context，它也只占总流量的 10%。再压一半，总时间只少 6%；压到四分之一，也只少 9%。

而权重占 90%。把它减半，就是接近一倍的提速。

字节数直接决定速度。decode 是 memory bound，每个 token 的耗时就是总字节除以带宽：

| $N$ | 权重 | KV | 合计 | 每 token | 单流 tok/s |
| --- | --- | --- | --- | --- | --- |
| 4k | 8.00 GB | 0.004 GB | 8.00 GB | 1.00 ms | 1000 |
| 32k | 8.00 GB | 0.029 GB | 8.03 GB | 1.00 ms | 996 |
| 128k | 8.00 GB | 0.117 GB | 8.12 GB | 1.01 ms | 986 |
| 1M | 8.00 GB | 0.933 GB | 8.93 GB | 1.12 ms | 896 |

**从 4k 到 1M，单流速度只掉 10%。** 这才是 KV 压缩真正买到的东西。不是"能跑长 context"，是"跑长 context 不掉速"。

再看容量。单卡 172 GB 可用显存，按 890 字节 / token：

$$
\frac{172\ \text{GB}}{890\ \text{B}} \approx 1.93\ \text{亿 token}
$$

一张卡装得下 1.93 亿 token 的 global KV。

但容量不是硬上限。装不下就往下沉，host DRAM、SSD 一级一级放；请求再来时命中 prefix cache，把 KV 搬回 HBM 就能接着算。技术报告里那两个数本来就是按这个层级给的：常驻 HBM 的 global KV 是 890 字节 / token，而落在 SSD 或 host memory 的 persistent KV 再压到 V4-Flash 的 1/8。

**KV 这一层已经从"装不下就崩"的硬约束，变成了一个分层的存储问题。**

所以这条线走到这里，战场又换了一次位置：从"压 KV"换到"压权重"。前面几代解决的是历史存成什么样，接下来要解决的是 16B activated 这个数本身。

batch 能不能救？批处理把权重摊薄，但同时把 KV 按 batch 复制：

$$
\text{AI}(B, N) = \frac{B \times 2 \times 16\text{B}}{8\ \text{GB} + B \times 890 \times N}
$$

代进不同长度：

| $N$ | $B=1$ | $B=8$ | $B=64$ | $B=512$ | $B \to \infty$ |
| --- | --- | --- | --- | --- | --- |
| 4k | 4.0 | 32 | 249 | **1661** | **8778** |
| 32k | 4.0 | 31 | 208 | 715 | 1097 |
| 128k | 3.9 | 29 | 132 | 242 | 274 |
| 1M | 3.6 | 17 | 30 | 34 | 34 |

（加粗的是越过 1125 的格子。）

整张表只有两格越线，都在 4k 那一行，而且要 $B \ge 512$。$N \to 0$ 时 $\text{AI} \to 4B$，所以 batch 要超过 280 才有可能碰到那条线。$B=64$ 的极限是 256，连门槛都摸不到。

$N$ 一大就更没戏。$B \to \infty$ 时 $\text{AI} \to 2P / (890N)$，1M context 下只有 34，离 1125 差 33 倍。因为 KV 太小，把权重完全摊掉之后剩下的那点 KV 依然喂不饱算力。

结论比 MLA 那次更极端。MLA 至少留了一个"大 batch 加短 context 会翻到 compute bound"的窗口，而且那个窗口落在 4k，恰好是它收益最小的区间。ds4.1f 的窗口更窄：要 $B \ge 512$ 且 $N$ 压到 1.4 万以内，才算勉强碰到算力那一侧。

再算一遍吞吐。每步耗时取带宽和算力里较大的那个：

| $B$ | 1M：单序列 tok/s | 1M：总吞吐 | 32k：总吞吐 |
| --- | --- | --- | --- |
| 1 | 896 | 896 | 996 |
| 8 | 517 | 4,138 | 7,773 |
| 32 | 211 | 6,761 | 28,657 |
| 128 | 63 | 8,034 | 87,276 |
| 512 | 16 | 8,431 | 178,617 |
| $\to \infty$ | 趋于 0 | 8,572 | 274,315 |

**总吞吐有上限，因为它最终被 KV 的带宽锁住：**

$$
\text{吞吐}_{\max} \to \frac{8\ \text{TB/s}}{890\ \text{B} \times N}
$$

| $N$ | 4k | 32k | 128k | 1M |
| --- | --- | --- | --- | --- |
| 吞吐上限 | 281k | 274k | 68.6k | 8.6k |

4k 和 32k 那两档其实先被算力封顶（281k），再往上才是 KV 带宽封顶。分界在 $N \approx 3.2$ 万，和前面 batch 表里算出来的是同一个数。

**代价在延迟那一列。** 同一个 1M 的请求，batch 从 1 开到 512，单序列速度从 896 掉到 16 token/s。长 context 上吞吐和交互速度是直接对立的：要吃满吞吐，就得牺牲单个用户的等待时间。

反过来，如果要求单序列不低于 200 token/s，1M context 下 batch 只能开到 30 上下，单卡吞吐就是 6-7k token/s。这个量级和我实际跑 ds4.1f 的手感对得上。

换成 TP4 部署，每卡的账是这样：

| | 每卡 |
| --- | --- |
| 权重常驻显存（全部 552B 专家） | 69 GB |
| 留给 KV 的显存 | 111 GB |
| 每步读的权重（16B activated 的四分之一） | **2.00 GB** |
| 每步读的 KV（batch 1，1M context） | **0.23 GB** |
| 合计 | 2.23 GB |
| 每步带宽下限 | 0.28 ms |

要分清常驻和每步读，也要交代那个除以 4 是哪来的。

**常驻**：552B 个专家参数必须都在显存里。TP4 把每个权重矩阵切成四份、每卡持一份，所以是

$$
\frac{552\text{B} \times 0.5\ \text{字节}}{4} = 69\ \text{GB}
$$

**每步读**：一个 token 只激活其中 16B。整机每步要读

$$
16\text{B} \times 0.5\ \text{字节} = 8\ \text{GB}
$$

而这 16B 激活参数同样散在四张卡上，各卡只读自己那一份，所以每卡读四分之一：

$$
\frac{8\ \text{GB}}{4} = 2\ \text{GB}
$$

KV 是同一个道理。TP 把 KV head 也分到四张卡上，每卡只存自己那部分，也就只读自己那部分：

$$
\frac{890\ \text{B} \times 10^6}{4} = 0.23\ \text{GB}
$$

**两项加起来，KV 只占 10%。** 和前面 batch 1 的结论一致，TP 不改变这个比例。

四张卡合起来，节点级 KV 容量是 444 GB，按 890 字节 / token 算就是 4.99 亿 token。单序列的理论上限也从 896 提到约 3,600 token/s。

这就是 ds4.1f-FP4 在 B200 上的 roofline。

拐点 1125 FLOP/byte 换一种读法：**搬运 1 个字节的时间，够做 1125 次浮点运算**。于是一个机制只要能用不到 1125 次运算省下 1 个字节的搬运，就净赚。以这个比值衡量，ds4.1f 里的几个设计都在做同一笔交易：

- **SWA Bounded Replay**：请求恢复时不重放整条序列，只重算最近 $n_{\text{win}}$ 个 token 来重建局部状态。用一段计算，换掉局部窗口 KV 的持久化。
- **FP4 KV**：存储和带宽都降到四分之一，代价是读进来要反量化。用一点计算，换掉四分之三的字节。
- **Hierarchical Indexer**：先用一层打分粗筛出候选池，后续层只在这个池子里挑。用一层索引，换掉对全部候选的扫描。

共同点是把成本从 memory 一侧挪到 compute 一侧。

前面几代的动作一直是压缩存储。现在存储已经压到接近下限，规则反过来：**用富余的算力，去重建那些不值得搬过来的字节。**

这些省下来的资源最终可以被重新花到：更多 tokens、更好的数据过滤、更长的 RL rollout、更多 environment interaction、更多 rejection sampling、更多 verifier compute、更大的 batch、更复杂的 agent tasks。到这里，可以回到最初的问题了。ds4.1f 省掉的，是账单上几乎每一项。

## Capability 与 Efficiency

业界基本有共识：能力里很大的一部分来自后训练，而不是架构。三个例子。

GLM-5.3 的发布说明只有一句话，[Scaling post-training is all we did](https://z.ai/blog/glm-5.3)。基座和 GLM-5.2 一样，没有新增一个预训练 token，Terminal-Bench 3.0 从 4.6 涨到 28.3，六倍。

Cognition 的 [SWE-2](https://cognition.com/blog/swe-2) 更能说明分工。它是一个美国实验室从 Kimi K3 的开源权重上后训练出来的，而 Kimi K3 是 Moonshot 放出来的 2.8T 参数模型。Cognition 报的成绩是编码能力离前沿只差一点，成本低 64%；首次真正动手改代码的中位步数从 48 降到 18。

开源权重到了这个水平，做一款有竞争力的编码产品，贵的环节已经不是预训练，而是后训练和 harness。

第三个例子是 DeepSeek V4-Flash-0731。它的模型结构和尺寸与 Preview 保持一致，只重新做了后训练，但 Agent benchmark 大幅提升：

$$
\text{DeepSWE: } 7.3 \rightarrow 54.4
$$

$$
\text{CyberGym: } 38.7 \rightarrow 76.7
$$

$$
\text{TerminalBench 2.1: } 61.8 \rightarrow 82.7
$$

模型 backbone 没换。Attention 没换。参数量没换。官方更新日志直接写明结构不变、仅重新后训练。这个例子比任何口号都说明问题：**同一个 backbone 的 post-training 差异，完全可能比两代 architecture 的差异更大。** 所以把"模型进步"拆成四个层次更合适：

| 层次 | 解决什么 | 对能力的作用 |
| --- | --- | --- |
| Architecture | 每 FLOP / 每 GB 能做多少事 | 提高上限和效率 |
| Data | 模型到底看到了什么分布 | 决定知识、能力覆盖 |
| Post-training / RL | 学会怎么推理、用工具、完成任务 | 直接决定最终行为能力 |
| Infra | 上面三件事是否真的按设计运行 | 防止几个月训练被 bug 偷走 |

Infra 这一层最容易被低估，也最残酷。因为 RL 不是：

$$
\text{写个 PPO/GRPO 公式} \rightarrow \text{模型自动变聪明}
$$

而是一条很长的系统：

$$
\text{prompt} \rightarrow \text{rollout} \rightarrow \text{tool environment} \rightarrow \text{reward} \rightarrow \text{sampling} \rightarrow \text{advantage} \rightarrow \text{gradient} \rightarrow \text{model update}
$$

任何地方一个小 bug，最后都会变成同一句话："奇怪，我们这个新的 RL 算法怎么效果一般？" 而那个 bug 可能是 reward 算错、tool state 泄漏、rollout truncation 错、mask 错、sampling distribution 不一致、tokenizer offset 错、advantage normalization 错、stale policy 太严重，或者 sandbox reset 有问题。实际上不是算法一般，是代码在偷偷犯罪。所以更准确的因果链是：

$$
\boxed{\text{Architecture} \rightarrow \text{Cost reduction} \rightarrow \text{More effective training} \rightarrow \text{Capability}}
$$

而不是：

$$
\boxed{\text{Architecture} \rightarrow \text{Magic intelligence}}
$$

架构对能力的作用，经常是**间接的**。如果只能从这一节记一句话，我会记这个排序：

$$
\boxed{\text{Data} > \text{Post-training/RL} > \text{Eval/Verifier} > \text{Training infra} > \text{Architecture}}
$$

这不是说 architecture 最不重要。而是如果你问"这一代模型为什么明显更好用了"，答案很多时候在前面几项，而不是"我们把 attention 又改了一个 acronym"。旁边还有一组更好记的说法，把每一层对应到一个"前沿"：

- Architecture 决定 **efficiency frontier**：每单位算力能处理多少有效训练信号
- Data 决定 **learning frontier**：模型有机会学到什么
- RL / post-training 决定 **behavior frontier**：模型会不会把能力真正用出来
- Infra 决定**你是否真的获得前三者**：实验结果到底是不是你以为的实验

最后这条听起来最不起眼，实际经常最残酷。一个漂亮的新 loss 写在论文里只需要半页。一个可靠的 million-token agent rollout system，可能需要几十个人跟各种分布式 bug、CUDA bug、环境 bug、数据 bug 打几个月架。论文不会把那些凌晨三点的 NCCL timeout 写进公式里，但模型能力很可能就死在那里。Kimi K3 的 KDA 为什么重要？不是因为 Linear Attention 本身突然赋予模型神秘推理能力。而是它让 1M context、long-horizon rollout、agentic RL 在计算上变得现实：

$$
\text{KDA} \rightarrow \text{长上下文更便宜} \rightarrow \text{更多 long-horizon RL rollout} \rightarrow \text{更好的 agent 数据} \rightarrow \text{Agent 能力提高}
$$

CSA/HCA 也一样。它最漂亮的地方未必是"稀疏 attention 本身理解能力比 MLA 强"，而是 1M context 变得足够便宜。

$$
\boxed{\text{架构是 compute multiplier，不是 intelligence generator。}}
$$

## 算力预算

如果架构主要在省钱，那"该不该冒架构的险"就变成了一个纯粹的预算问题。假设已验证的 Transformer scaling recipe 能拿到 95 分。新架构理论上能到 100，但有 20% 概率训练炸掉，只剩 70。如果算力富裕，为什么要冒险？把已验证的架构再 scale 10 倍，可能直接拿到 98，而且更可靠。

$$
\boxed{\text{scale proven architecture first}}
$$

这其实是一种"富人的保守"。而算力紧张的实验室没有 10× compute 可以挥霍，只能想办法：

$$
\boxed{\text{让 } 1\times \text{ compute 做出 } 3\times \text{ compute 的效果}}
$$

于是架构创新的 ROI 突然变得非常高。从优化目标看更直白。算力富裕的一方更接近：

$$
\max \text{Capability}, \quad \text{s.t. Compute 很大}
$$

所以可以接受较低的 architecture efficiency，只要 scaling 稳。而算力受限的一方更像：

$$
\max \frac{\text{Capability}}{\text{Compute}}
$$

于是被逼出 MLA、MoE、Sparse、Linear、各种 compression。这和芯片行业很像。资源充裕时加晶体管，资源受限时改 architecture。所以很多所谓架构路线之争，底层其实是不同算力预算下的经济学。把这件事再拆细一点，会发现竞争其实发生在四种资本上：

$$
\boxed{\text{Compute Capital}}
$$

GPU、HBM、network、datacenter。

$$
\boxed{\text{Data Capital}}
$$

真实用户、agent trajectories、enterprise workflow、feedback。

$$
\boxed{\text{Algorithmic Capital}}
$$

architecture、training recipe、RL、verifier。

$$
\boxed{\text{Infrastructure Capital}}
$$

稳定地把几千几万张 GPU、RL environment、rollout 全跑起来。算力富裕的一方在前两项和第四项上有巨大积累；算力受限的一方被迫在第三项特别凶。这也是为什么"美国靠暴力 scaling、中国靠聪明架构"这种说法太简化了。更接近事实的写法是：**一边在用资源优势降低研究风险，另一边在用资源约束提高创新收益。**

而且"数据"这一项也没法简单说成谁多谁少。真正稀缺的早就不是互联网文本了。Wikipedia、Common Crawl、GitHub 这些 public corpus，大家拿到的量级差不多。现在值钱的是高质量 reasoning traces、真实 agent trajectories、用户交互反馈、专业任务数据、tool-use traces、可验证环境。这些东西不是爬虫能给你的，是产品规模给的。

所以更要命的不是"谁有更多互联网 token"，而是"谁有更多高价值的 interaction token"。但这里有个反转。

一旦某个架构优化被证明有效，情况就变了。DeepSeek 做出 MLA，或者 Kimi 做出成熟的 Linear Attention，算力多的一方并不会因为自己算力多就拒绝使用。它们完全可以：

$$
\boxed{\text{更多算力} \times \text{更高效架构}}
$$

于是原本弱者为了生存开发出来的 efficiency innovation，最后反而可能让强者 scale 得更狠。这才是最残酷的一层。所以问题最后又回到：省下来的钱，值不值得花。

## 小结

开头说 ds4.1f 是模型架构与硬件 co-design 的杰作。看完整条路线，我觉得这个说法可以讲得更具体一点：它省掉的不是某一项。是账单上的好几项，而且是分几代攒下来的。把整条路线画成一张图是这样：

```text
MHA              每个 head 一份 K、V
 │
 ▼
MQA / GQA        压 head 数：离散地共享
 │
 ▼
MLA              压 D 轴：连续压缩成 latent
 │
 ▼
CSA / HCA        压 N 轴：压成 block，再挑着看
 │
 ▼
Linear / SSM     压掉保存本身：只留一个 state
 │
 ▼
V4.1             压 L 轴和计算阶段：不再每层每步都付同样的钱
```

同样的路线，换成一连串追问：

$$
\text{每个 head 都需要独立 KV 吗？} \quad \rightarrow \quad \text{MQA / GQA}
$$

$$
\text{每个 token 都需要完整 KV 吗？} \quad \rightarrow \quad \text{MLA}
$$

$$
\text{每个 query 都需要看所有 token 吗？} \quad \rightarrow \quad \text{CSA / HCA}
$$

$$
\text{每个 token 都需要被永久保存吗？} \quad \rightarrow \quad \text{Linear / SSM}
$$

$$
\text{每个 layer 都需要独立 memory 吗？} \quad \rightarrow \quad \text{V4.1}
$$

$$
\text{Prefill 和 Decode 必须用同样计算吗？} \quad \rightarrow \quad \text{V4.1}
$$

每一代都在放松一个假设。而这三个动作一直循环：

$$
\boxed{\text{保存信息} \leftrightarrow \text{压缩信息} \leftrightarrow \text{找回信息}}
$$

最后那句话还可以再收一下。

前面一直把架构、数据、算力当成三样不同的东西比轻重，这个切法可能一开始就偏了。它们互相兑换：

**数据是架构。** 用什么数据、怎么组织、怎么采样，直接决定模型长成什么样。同一套 attention，换一个数据分布就是另一个模型。数据管线里每个决定，效果上和改架构是同一个量级。

**架构是算力。** 这条前面已经推过一遍。MLA 把 KV 压到 1/57，ds4.1f 把 decode 的算术强度压到离拐点 300 倍，省下来的都是算力。架构不改模型会做什么，只改做同一件事要花多少钱。它是算力的另一种记账方式。

**算力是数据。** 省下来的算力不会消失，它会被重新花到更多 tokens、更长的 RL rollout、更多 environment interaction、更多 verifier compute。算力的下游就是数据。

三个词绕成一个环。所以能力和架构谁更重要，这个问题本身可能就问错了：它们不是三条并行的赛道，而是同一笔资源的三种形态。换哪个名字都不改变总量，变的只是兑换率。

那当成本压到足够低之后，架构这条线上的竞争还剩多少意义？我的答案是，它的意义从来不是自己创造能力，而是决定那笔资源能兑换多少次。
