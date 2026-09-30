---
title: '[译] 深度强化学习入门（三）：策略优化入门'
date: 2026-09-28 17:49:25
categories: '技术'
tags:
  - 强化学习
  - RL
  - Spinning Up
  - 翻译
description: 'OpenAI Spinning Up 教程第三部分的全文翻译：推导最简单的策略梯度、log-derivative trick、EGLP 引理、reward-to-go 与基线，配 PyTorch 示例代码。'
draft: false
---

::note{title="译者说明"}
本文是 OpenAI [Spinning Up in Deep RL](https://spinningup.openai.com/en/latest/) 教程第三部分 [Part 3: Intro to Policy Optimization](https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html) 的全文翻译，原仓库采用 [MIT 协议](https://github.com/openai/spinningup/blob/master/LICENSE)。术语约定与[第一篇](/posts/spinning-up-rl-intro)、[第二篇](/posts/spinning-up-rl-intro-2)一致；文中提到的行号指 GitHub 上对应源文件的行号；选读证明与旧版 Tensorflow 内容链接到官方站点。
::

本节讨论策略优化算法的数学基础，并把内容对接到示例代码上。我们会讲**策略梯度**（policy gradient）理论里的三个关键结果：

- 描述「策略性能对策略参数的梯度」的[最简单的方程](#推导最简单的策略梯度)；
- 一条允许我们从该表达式里[去掉无用项](#别让过去干扰你)的规则；
- 一条允许我们[加入有用项](#策略梯度中的基线)的规则。

最后把这三个结果拼在一起，给出策略梯度的优势函数形式，也就是我们的 [Vanilla Policy Gradient](https://spinningup.openai.com/en/latest/algorithms/vpg.html)（VPG）实现里用的那个版本。

## 推导最简单的策略梯度

这里考虑随机型参数化策略 $\pi_{\theta}$，目标是最大化期望回报 $J(\pi_{\theta}) = \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}[R(\tau)]$。为推导方便，取 $R(\tau)$ 为[有限视界不折扣回报](/posts/spinning-up-rl-intro#奖励与回报)；换成无限视界折扣回报的情形，推导几乎完全一样。

我们想用梯度上升来优化策略，比如：

$$
\theta_{k+1} = \theta_k + \alpha \left. \nabla_{\theta} J(\pi_{\theta}) \right|_{\theta_k}
$$

策略性能的梯度 $\nabla_{\theta} J(\pi_{\theta})$ 叫作**策略梯度**，按这个方式优化策略的算法叫**策略梯度算法**（例子有 Vanilla Policy Gradient 和 TRPO。PPO 常被叫作策略梯度算法，不过严格说稍有不准）。

要真正用上这个算法，得先有一个能数值计算的策略梯度表达式。这分两步：1）推导策略性能的解析梯度，它最后会化成一个期望的形式；2）给这个期望做样本估计，用有限步「智能体-环境交互」的数据就能算出来。

本小节先找出这个表达式最简单的形式；后面几小节再展示如何在最简单的形式上改进，得到标准策略梯度实现里真正使用的版本。

先摆出几个对推导解析梯度有用的事实。

**1. 轨迹的概率**。动作来自 $\pi_{\theta}$ 时，轨迹 $\tau = (s_0, a_0, ..., s_{T+1})$ 的概率是

$$
P(\tau|\theta) = \rho_0 (s_0) \prod_{t=0}^{T} P(s_{t+1}|s_t, a_t) \pi_{\theta}(a_t |s_t)
$$

**2. 对数求导技巧（log-derivative trick）**。它基于微积分里一条简单的规则：$\log x$ 对 $x$ 的导数是 $1/x$。稍作变形、再与链式法则结合，得到：

$$
\nabla_{\theta} P(\tau | \theta) = P(\tau | \theta) \nabla_{\theta} \log P(\tau | \theta)
$$

**3. 轨迹的对数概率**。轨迹的 log 概率就是

$$
\log P(\tau|\theta) = \log \rho_0 (s_0) + \sum_{t=0}^{T} \bigg( \log P(s_{t+1}|s_t, a_t)  + \log \pi_{\theta}(a_t |s_t)\bigg)
$$

**4. 环境函数的梯度**。环境与 $\theta$ 无关，所以 $\rho_0(s_0)$、$P(s_{t+1}|s_t, a_t)$ 和 $R(\tau)$ 的梯度都是零。

**5. 轨迹的 grad-log-prob**。于是轨迹对数概率的梯度为

$$
\begin{aligned}
\nabla_{\theta} \log P(\tau | \theta) &= \cancel{\nabla_{\theta} \log \rho_0 (s_0)} + \sum_{t=0}^{T} \bigg( \cancel{\nabla_{\theta} \log P(s_{t+1}|s_t, a_t)}  + \nabla_{\theta} \log \pi_{\theta}(a_t |s_t)\bigg) \\
&= \sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t)
\end{aligned}
$$

把这些拼起来，推出：

::note{title="基本策略梯度的推导"}
$$
\begin{align*}
\nabla_{\theta} J(\pi_{\theta}) &= \nabla_{\theta} \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}[R(\tau)] && \\
&= \nabla_{\theta} \int_{\tau} P(\tau|\theta) R(\tau) && \text{展开期望} \\
&= \int_{\tau} \nabla_{\theta} P(\tau|\theta) R(\tau) && \text{把梯度移入积分号内} \\
&= \int_{\tau} P(\tau|\theta) \nabla_{\theta} \log P(\tau|\theta) R(\tau) && \text{对数求导技巧} \\
&= \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\nabla_{\theta} \log P(\tau|\theta) R(\tau)\right] && \text{回到期望形式} \\
\therefore \nabla_{\theta} J(\pi_{\theta}) &= \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) R(\tau)\right] && \text{代入轨迹的 grad-log-prob}
\end{align*}
$$
::

这是一个期望，意味着可以用样本均值来估计它。收集一组轨迹 $\mathcal{D} = \{\tau_i\}_{i=1,...,N}$，每条轨迹都让智能体按策略 $\pi_{\theta}$ 在环境中行动得到，策略梯度就可以这样估计：

$$
\hat{g} = \frac{1}{|\mathcal{D}|} \sum_{\tau \in \mathcal{D}} \sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) R(\tau)
$$

其中 $|\mathcal{D}|$ 是 $\mathcal{D}$ 里的轨迹条数（这里是 $N$）。

最后这个式子就是我们想要的「可计算表达式」的最简单的版本。只要策略的表示方式让我们能算出 $\nabla_{\theta} \log \pi_{\theta}(a|s)$，并且能把策略放进环境里跑、收集轨迹数据集，我们就能算出策略梯度、走一步更新。

## 实现最简单的策略梯度

这个最简单版本策略梯度算法的 PyTorch 短实现放在 `spinup/examples/pytorch/pg_math/1_simple_pg.py`（也可以[在 GitHub 上查看](https://github.com/openai/spinningup/blob/master/spinup/examples/pytorch/pg_math/1_simple_pg.py)）。它只有 128 行，我们强烈建议通读一遍。这里不逐行讲整个文件，只挑几块重要的部分解释。

::note{title="你应该知道"}
本节最初写的是 Tensorflow 例子，旧版 Tensorflow 的内容见[这里](https://spinningup.openai.com/en/latest/spinningup/extra_tf_pg_implementation.html#implementing-the-simplest-policy-gradient)。
::

**1. 搭建策略网络。**

```python3
# 搭建策略网络的核心
logits_net = mlp(sizes=[obs_dim]+hidden_sizes+[n_acts])

# 构造计算动作分布的函数
def get_policy(obs):
    logits = logits_net(obs)
    return Categorical(logits=logits)

# 构造选动作的函数（输出整数动作，从策略中采样）
def get_action(obs):
    return get_policy(obs).sample().item()
```

这一块搭建了前馈神经网络分类策略所需的模块和函数（想复习可以看[第一篇的「随机型策略」一节](/posts/spinning-up-rl-intro#随机型策略)）。`logits_net` 模块的输出可以用来构造动作的对数概率和概率，`get_action` 函数根据 logits 算出的概率采样动作。（注意：这个 `get_action` 假定每次只传入一个 `obs`，因此也只输出一个整数动作。这就是它用 `.item()` 的原因，这个方法用来[取出只含单个元素的 Tensor 的内容](https://pytorch.org/docs/stable/tensors.html#torch.Tensor.item)。）

这个例子里有大量工作是由源文件第 36 行的 `Categorical` 对象完成的。它是 PyTorch 的 `Distribution` 对象，封装了与概率分布相关的一些数学函数：既有从分布采样的方法（第 40 行用到了），也有计算给定样本对数概率的方法（后面会用到）。PyTorch 的 distributions 对 RL 非常有用，建议翻一翻[它们的文档](https://pytorch.org/docs/stable/distributions.html)，感受一下怎么用。

::note{title="你应该知道"}
友好提醒！说一个分类分布有「logits」，意思是各结果的概率由 logits 的 softmax 函数给出。也就是说，logits 为 $x_j$ 的分类分布下，动作 $j$ 的概率是：

$$
p_j = \frac{\exp(x_j)}{\sum_{i} \exp(x_i)}
$$
::

**2. 构造损失函数。**

```python3
# 构造损失函数：喂进合适的数据时，它的梯度就是策略梯度
def compute_loss(obs, act, weights):
    logp = get_policy(obs).log_prob(act)
    return -(logp * weights).mean()
```

这一块为策略梯度算法构造一个「损失」函数。喂进正确的数据时，这个损失的梯度就等于策略梯度。所谓正确的数据，是一组按当前策略行动时收集的（状态、动作、权重）三元组，其中状态-动作对的权重是它所属回合的回报。（后面的小节会说明，权重还可以换成别的值，同样正确。）

::note{title="你应该知道"}
虽然我们把它叫作损失函数，但它**不是**监督学习里通常意义上的那种损失函数。它与标准损失函数有两点主要区别。

**1. 数据分布依赖参数**。损失函数通常定义在一个与待优化参数无关的固定数据分布上。这里不是这样：数据必须从最新的策略里采样。

**2. 它不度量性能**。损失函数通常度量我们关心的性能指标。这里我们关心的是期望回报 $J(\pi_{\theta})$，但这个「损失」函数连在期望意义上都不近似它。这个「损失」函数之所以有用，只是因为：在当前参数处、用当前参数生成的数据来评估时，它的梯度是性能的负梯度。

但走出梯度下降的第一步之后，它就与性能没有任何联系了。这意味着：对给定的一批数据，最小化这个「损失」函数*完全*不保证提升期望回报。你可以把这个损失压到 $-\infty$，而策略性能照样会崩；实际上通常就会崩。有的深度 RL 研究者会把这种结果描述成策略对这批数据「过拟合」了。这个说法有描述作用，但别按字面理解，因为它与泛化误差无关。

我们特意提这一点，是因为机器学习从业者习惯把损失函数当作训练中的有用信号：「损失降了，一切安好。」在策略梯度里，这个直觉是错的，你只该关心平均回报。损失函数没有任何意义。
::

::note{title="你应该知道"}
这里构造 `logp` 张量的方式（调用 PyTorch `Categorical` 对象的 `log_prob` 方法）换成其他分布对象时，可能需要一些修改。

比如，如果你用的是 [Normal 分布](https://pytorch.org/docs/stable/distributions.html#normal)（对应对角高斯策略），调用 `policy.log_prob(act)` 返回的张量会给每个向量型动作的每个分量各一个对数概率：输入形状 `(batch, act_dim)` 的张量，出来的还是 `(batch, act_dim)`，而构造 RL 损失需要的是 `(batch,)`。这时要把动作分量的对数概率加总，得到动作的对数概率，也就是计算：

```python3
logp = get_policy(obs).log_prob(act).sum(axis=-1)
```
::

**3. 跑一轮训练。**

```python3
# 用于训练策略
def train_one_epoch():
    # 建几个空列表，用于记录
    batch_obs = []          # 观测
    batch_acts = []         # 动作
    batch_weights = []      # 策略梯度里的 R(tau) 权重
    batch_rets = []         # 记录回合回报
    batch_lens = []         # 记录回合长度

    # 重置回合内变量
    obs = env.reset()       # 第一个观测来自起始分布
    done = False            # 环境给出的「回合结束」信号
    ep_rews = []            # 本回合累计的奖励列表

    # 每个 epoch 渲染第一个回合
    finished_rendering_this_epoch = False

    # 用当前策略在环境中行动，收集经验
    while True:

        # 渲染
        if (not finished_rendering_this_epoch) and render:
            env.render()

        # 保存观测
        batch_obs.append(obs.copy())

        # 在环境中行动
        act = get_action(torch.as_tensor(obs, dtype=torch.float32))
        obs, rew, done, _ = env.step(act)

        # 保存动作与奖励
        batch_acts.append(act)
        ep_rews.append(rew)

        if done:
            # 回合结束，记录该回合的信息
            ep_ret, ep_len = sum(ep_rews), len(ep_rews)
            batch_rets.append(ep_ret)
            batch_lens.append(ep_len)

            # 每个 logprob(a|s) 的权重是 R(tau)
            batch_weights += [ep_ret] * ep_len

            # 重置回合内变量
            obs, done, ep_rews = env.reset(), False, []

            # 这个 epoch 不再渲染
            finished_rendering_this_epoch = True

            # 经验够了就结束收集循环
            if len(batch_obs) > batch_size:
                break

    # 做一次策略梯度更新
    optimizer.zero_grad()
    batch_loss = compute_loss(obs=torch.as_tensor(batch_obs, dtype=torch.float32),
                              act=torch.as_tensor(batch_acts, dtype=torch.int32),
                              weights=torch.as_tensor(batch_weights, dtype=torch.float32)
                              )
    batch_loss.backward()
    optimizer.step()
    return batch_loss, batch_rets, batch_lens
```

`train_one_epoch()` 函数跑一轮（epoch）策略梯度，我们把它定义为：1）经验收集步（源文件第 67 到 102 行），智能体用最新策略在环境中跑若干个回合；2）紧接一次策略梯度更新步（第 104 到 111 行）。算法的主循环就是反复调用 `train_one_epoch()`。

::note{title="你应该知道"}
如果你还不熟悉 PyTorch 的优化流程，注意看第 104 到 111 行做一次梯度下降步的模式：先清空梯度缓存；然后计算损失函数；再对损失做一次反向传播，把新梯度累积进梯度缓存；最后让优化器走一步。
::

## EGLP 引理

本小节推导一个在策略梯度理论里到处会用到的中间结果，我们把它叫作**期望 Grad-Log-Prob（EGLP）引理**。

**EGLP 引理**。设 $P_{\theta}$ 是随机变量 $x$ 上一个带参数的概率分布，那么：

$$
\underset{x \sim P_{\theta}}{\mathbb{E}}\left[\nabla_{\theta} \log P_{\theta}(x)\right] = 0
$$

::note{title="证明"}
回忆所有概率分布都是*归一化*的：

$$
\int_x P_{\theta}(x) = 1
$$

对归一化条件两边取梯度：

$$
\nabla_{\theta} \int_x P_{\theta}(x) = \nabla_{\theta} 1 = 0
$$

用对数求导技巧得到：

$$
\begin{aligned}
0 &= \nabla_{\theta} \int_x P_{\theta}(x) \\
&= \int_x \nabla_{\theta} P_{\theta}(x) \\
&= \int_x P_{\theta}(x) \nabla_{\theta} \log P_{\theta}(x) \\
\therefore 0 &= \underset{x \sim P_{\theta}}{\mathbb{E}}\left[\nabla_{\theta} \log P_{\theta}(x)\right]
\end{aligned}
$$
::

::note{title="注"}
本文作者不知道这个引理在文献里是否有标准名字。但它出现得太频繁了，值得给它起个名字，方便引用。
::

## 别让过去干扰你

看看我们刚才的策略梯度表达式：

$$
\nabla_{\theta} J(\pi_{\theta}) = \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) R(\tau)\right]
$$

沿这个梯度走一步，会把每个动作的对数概率往上推，推的幅度正比于 $R(\tau)$，也就是*曾经拿到的所有奖励*的总和。但这不太讲道理。

智能体强化一个动作，理应只看它的*后果*。采取动作*之前*拿到的奖励与这个动作的好坏毫无关系：有关系的只有*之后*来的奖励。

这个直觉其实藏在数学里：可以证明，策略梯度也能写成

$$
\nabla_{\theta} J(\pi_{\theta}) = \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) \sum_{t'=t}^T R(s_{t'}, a_{t'}, s_{t'+1})\right]
$$

在这个形式里，动作只根据它*被采取之后*获得的奖励来强化。

我们把这个形式叫作「reward-to-go 策略梯度」，因为轨迹中某一点之后的奖励总和

$$
\hat{R}_t \doteq \sum_{t'=t}^T R(s_{t'}, a_{t'}, s_{t'+1})
$$

就叫作从该点起的 **reward-to-go**（只往后算的奖励），而这个策略梯度表达式依赖的正是各状态-动作对的 reward-to-go。

::note{title="你应该知道"}
**但这为什么更好**？策略梯度的一个关键问题是：要把它的样本估计做到低方差，需要多少条采样轨迹。我们出发的那个公式里，强化动作的项正比于过去的奖励，这些项均值为零、方差非零，只会给策略梯度的样本估计添噪音。去掉它们，所需的采样轨迹就少了。
::

这个论断的（选读）证明见[这里](https://spinningup.openai.com/en/latest/spinningup/extra_pg_proof1.html)，最终靠的是 EGLP 引理。

## 实现 reward-to-go 策略梯度

reward-to-go 策略梯度的 PyTorch 短实现放在 `spinup/examples/pytorch/pg_math/2_rtg_pg.py`（也可以[在 GitHub 上查看](https://github.com/openai/spinningup/blob/master/spinup/examples/pytorch/pg_math/2_rtg_pg.py)）。

相比 `1_simple_pg.py`，唯一的变化是损失函数里用了不同的权重。代码改动非常小：加一个新函数，再改两行。新函数是：

```python3
def reward_to_go(rews):
    n = len(rews)
    rtgs = np.zeros_like(rews)
    for i in reversed(range(n)):
        rtgs[i] = rews[i] + (rtgs[i+1] if i+1 < n else 0)
    return rtgs
```

然后把原来的第 91、92 行从：

```python3
                # 每个 logprob(a|s) 的权重是 R(tau)
                batch_weights += [ep_ret] * ep_len
```

改成：

```python3
                # 每个 logprob(a_t|s_t) 的权重是从 t 时刻起的 reward-to-go
                batch_weights += list(reward_to_go(ep_rews))
```

::note{title="你应该知道"}
本节最初写的是 Tensorflow 例子，旧版 Tensorflow 的内容见[这里](https://spinningup.openai.com/en/latest/spinningup/extra_tf_pg_implementation.html#implementing-reward-to-go-policy-gradient)。
::

## 策略梯度中的基线

EGLP 引理的一个直接推论：对任何只依赖状态的函数 $b$，有

$$
\underset{a_t \sim \pi_{\theta}}{\mathbb{E}}\left[\nabla_{\theta} \log \pi_{\theta}(a_t|s_t) b(s_t)\right] = 0
$$

这让我们可以在策略梯度表达式里加上或减去任意多个这样的项，而期望不变：

$$
\nabla_{\theta} J(\pi_{\theta}) = \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) \left(\sum_{t'=t}^T R(s_{t'}, a_{t'}, s_{t'+1}) - b(s_t)\right)\right]
$$

这样使用的任何函数 $b$ 都叫作**基线（baseline）**。

最常见的基线选择是[同策略价值函数](/posts/spinning-up-rl-intro#价值函数) $V^{\pi}(s_t)$。回忆一下：它指智能体从状态 $s_t$ 出发、之后一直按策略 $\pi$ 行动所能得到的平均回报。

经验上，取 $b(s_t) = V^{\pi}(s_t)$ 能切实降低策略梯度样本估计的方差，策略学得更快也更稳。从概念上讲，这个选择也有吸引力：它编码了这样一个直觉，如果智能体得到的就是它预期的，它对此应该「无感」。

::note{title="你应该知道"}
实践中 $V^{\pi}(s_t)$ 算不出来，只能近似。通常用一个神经网络 $V_{\phi}(s_t)$，与策略同时更新（让价值网络始终近似最新策略的价值函数）。

学习 $V_{\phi}$ 最简单的方法（VPG、TRPO、PPO 和 A2C 的大多数实现都这么做）是最小化均方误差目标：

$$
\phi_k = \arg \min_{\phi} \underset{s_t, \hat{R}_t \sim \pi_k}{\mathbb{E}}\left[\left( V_{\phi}(s_t) - \hat{R}_t \right)^2\right]
$$

其中 $\pi_k$ 是第 $k$ 轮的策略。具体做法是从上一轮的价值参数 $\phi_{k-1}$ 出发，做一步或多步梯度下降。
::

## 策略梯度的其他形式

到目前为止我们看到，策略梯度有如下一般形式：

$$
\nabla_{\theta} J(\pi_{\theta}) = \underset{\tau \sim \pi_{\theta}}{\mathbb{E}}\left[\sum_{t=0}^{T} \nabla_{\theta} \log \pi_{\theta}(a_t |s_t) \Phi_t\right]
$$

其中 $\Phi_t$ 可以取

$$
\Phi_t = R(\tau)
$$

或

$$
\Phi_t = \sum_{t'=t}^T R(s_{t'}, a_{t'}, s_{t'+1})
$$

或

$$
\Phi_t = \sum_{t'=t}^T R(s_{t'}, a_{t'}, s_{t'+1}) - b(s_t)
$$

尽管方差不同，这些选择给出的策略梯度期望值全都相同。事实上，$\Phi_t$ 还有两个同样合法的选择，也很重要，值得知道。

**1. 同策略动作价值函数**。取

$$
\Phi_t = Q^{\pi_{\theta}}(s_t, a_t)
$$

也是合法的。（选读）证明见[这个页面](https://spinningup.openai.com/en/latest/spinningup/extra_pg_proof2.html)。

**2. 优势函数**。回忆一下，动作的[优势](/posts/spinning-up-rl-intro#优势函数)定义为 $A^{\pi}(s_t,a_t) = Q^{\pi}(s_t,a_t) - V^{\pi}(s_t)$，描述的是（相对当前策略）它平均而言比其他动作好多少。取

$$
\Phi_t = A^{\pi_{\theta}}(s_t, a_t)
$$

也合法。证明：它等价于先取 $\Phi_t = Q^{\pi_{\theta}}(s_t, a_t)$，再加一个价值函数基线，而基线我们随时可以加。

::note{title="你应该知道"}
用优势函数表述策略梯度极其常见，不同算法有各自估计优势函数的办法。
::

::note{title="你应该知道"}
想更深入这个主题，应该去读 [Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438)（GAE）的论文，它的背景章节深入讨论了 $\Phi_t$ 的各种选择。

那篇论文接着提出了 GAE，一种在策略优化算法中近似优势函数的方法，如今使用非常广泛。比如 Spinning Up 的 VPG、TRPO、PPO 实现都用它。所以我们强烈建议研究它。
::

## 小结

本章讲了策略梯度方法的基本理论，并把其中一些早期结果对接到了代码示例上。有兴趣的读者可以从这里继续，去研究后面的结果（价值函数基线、策略梯度的优势形式）如何落实到 Spinning Up 的 [Vanilla Policy Gradient](https://spinningup.openai.com/en/latest/algorithms/vpg.html) 实现里。
