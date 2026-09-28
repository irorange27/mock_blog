---
title: [译] 深度强化学习入门（二）：强化学习算法的分类
date: 2026-09-28 10:20:21
categories: '技术'
tags:
  - 强化学习
  - RL
  - Spinning Up
  - 翻译
description: 'OpenAI Spinning Up 第二部分的全文翻译：无模型与基于模型的 RL、策略优化与 Q-learning 的取舍，以及规划、专家迭代和经验增强等方法。'
draft: false
---

::note{title="译者说明"}
本文是 OpenAI [Spinning Up in Deep RL](https://spinningup.openai.com/en/latest/) 教程第二部分 [Part 2: Kinds of RL Algorithms](https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html) 的全文翻译。原仓库采用 [MIT 协议](https://github.com/openai/spinningup/blob/master/LICENSE)。分类图保留官方英文原图，正文保留算法缩写与外链；术语首次出现时附英文原词，后文沿用同一译名。
::

术语和记号打好基础后，接下来可以看更丰富的内容：现代 RL 算法的整体版图，以及算法设计中各种取舍。

## 强化学习算法的分类

![现代强化学习算法的一种分类图（官方英文原图）](https://spinningup.openai.com/en/latest/_images/rl_algorithms_9_15.svg)

*图 1：现代 RL 算法的一种实用分类，并未穷尽所有方法。算法引用见文末。*

先说明一点：现代 RL 算法的模块化特征很难用树形结构表示，因此要画出准确且包罗万象的算法分类图相当困难。为了让分类图能放在一页内，并使这篇导论便于阅读，我们省略了不少进阶主题，例如探索、迁移学习和元学习。本文的目标是：

- 突出深度 RL 算法中最基础的设计选择：要学习什么，以及怎样学习；
- 展示这些选择各自的取舍；
- 将几种重要的现代算法放进这些选择构成的脉络中。

### 无模型与基于模型的强化学习

强化学习算法面临的一个重要分岔是：智能体能否访问环境模型，或者能否学到一个环境模型。这里的环境模型指预测状态转移和奖励的函数。

使用模型的主要好处，是智能体可以向前规划：设想若干种选择分别会带来什么结果，再明确比较这些选择。随后，智能体还可以把规划所得提炼成一个学到的策略。一个著名例子是 [AlphaZero](https://arxiv.org/abs/1712.01815)。模型方法若能奏效，相较于不使用模型的方法，样本效率（sample efficiency）可能会大幅提高。

主要困难在于，智能体通常拿不到环境的真实模型。此时若想使用模型，就只能从经验中学习它；这会带来一系列挑战。最突出的一点是，智能体可能利用模型中的偏差，在学到的模型里表现良好，到了真实环境中却表现欠佳，甚至极差。模型学习本身就很难；即使投入大量时间和算力，也可能得不到相应收益。

使用环境模型的算法称为**基于模型的方法（model-based methods）**，不使用环境模型的算法称为**无模型方法（model-free methods）**。无模型方法放弃了借助模型提高样本效率的潜在收益，但通常更容易实现和调参。截至这篇导论写作时（2018 年 9 月），无模型方法更受欢迎，也经过了更多开发和测试。

### 要学习什么

另一个关键分岔是算法要学习什么。常见的学习对象包括：

- 策略，可以是随机型策略，也可以是确定型策略；
- 动作价值函数（Q 函数）；
- 价值函数；
- 环境模型；
- 或以上对象的组合。

#### 无模型强化学习要学习什么

无模型 RL 中，表征和训练智能体主要有两种方法。

**策略优化（policy optimization）**。这类方法显式地用策略 $\pi_{\theta}(a|s)$ 表示智能体。它们通过两种方式优化参数 $\theta$：直接对性能目标 $J(\pi_{\theta})$ 做梯度上升，或者间接地最大化该目标的局部代理（surrogate）。优化过程几乎总是采用**同策略（on-policy）** 方式：每次更新只使用智能体按照当前最新策略与环境交互时收集的数据。

策略优化通常还会学习一个函数 $V_{\phi}(s)$，用来近似该策略下的价值函数 $V^{\pi}(s)$，并据此计算如何更新策略。策略优化方法的例子包括：

- [A2C / A3C](https://arxiv.org/abs/1602.01783)：通过梯度上升直接最大化性能；
- [PPO](https://arxiv.org/abs/1707.06347)：通过最大化一个代理目标函数，间接推动性能目标上升。这个代理目标会保守估计这次策略更新可能引起的性能目标变化。

**Q-learning**。这类方法学习一个函数 $Q_{\theta}(s,a)$，用来近似最优动作价值函数 $Q^*(s,a)$。它们通常使用基于贝尔曼方程的目标函数。优化过程几乎总是采用**异策略（off-policy）** 方式：每次更新可以使用训练过程中任意时刻收集的数据，而不受智能体采集这些数据时采用何种探索策略的限制。

最优策略会选择使 $Q^*(s,a)$ 最大的动作；Q-learning 则用学得的 $Q_{\theta}$ 近似 $Q^*$，据此选取动作：

$$
a(s) = \arg\max_a Q_{\theta}(s,a)
$$

Q-learning 方法的例子包括：

- [DQN](https://www.cs.toronto.edu/~vmnih/docs/dqn.pdf)：推动深度 RL 领域发展的经典方法；
- [C51](https://arxiv.org/abs/1707.06887)：一种学习回报分布的变体，其期望就是 $Q^*$。

#### 策略优化与 Q-learning 的取舍

策略优化方法的主要优点是目标明确：它直接优化我们真正关心的对象，因此往往稳定、可靠。相比之下，Q-learning 通过训练 $Q_{\theta}$ 满足自洽方程，间接推动智能体表现变好。这类学习存在多种失效模式，因此通常稳定性较差（相关讨论见文末参考资料 [1]）。不过，在能够奏效时，Q-learning 的样本效率明显更高，因为它比策略优化更充分地复用数据。

#### 介于策略优化与 Q-learning 之间的方法

策略优化与 Q-learning 并不互斥，在[某些条件下甚至可以等价](https://arxiv.org/abs/1704.06440)。处于两者之间的一系列算法，可以在两端方法的优缺点之间作出折中。例如：

- [DDPG](https://arxiv.org/abs/1509.02971) 同时学习一个确定型策略和一个 Q 函数，并利用两者相互改进；
- [SAC](https://arxiv.org/abs/1801.01290) 使用随机策略、熵正则化和其他技巧来稳定学习，在标准基准上的得分高于 DDPG。

### 基于模型的强化学习要学习什么

与无模型 RL 不同，基于模型的方法很难归纳成少数几类边界清晰的算法；模型的使用方式有许多彼此独立的维度。下面只举几个例子，远未穷尽。每种方法使用的模型都可能是直接给定的，也可能是从经验中学到的。

#### 背景：纯规划

最基础的做法是不显式表示策略，而是使用 [模型预测控制（model-predictive control，MPC）](https://en.wikipedia.org/wiki/Model_predictive_control) 这样的纯规划方法来选择动作。MPC 中，智能体每次观测环境时，都会根据模型计算一个最优计划；计划规定从当前时刻起，在一个固定时间窗口内要采取哪些动作。

规划算法也可以借助学到的价值函数，考虑规划视界之外的未来奖励。随后，智能体只执行计划中的第一个动作，并立即丢弃计划的其余部分。每次准备与环境交互时，智能体都会重新计算计划，以免继续执行旧计划时规划视界已短于预期。

- [MBMF](https://sites.google.com/view/mbmf) 探索了在深度 RL 的标准基准任务中，使用学到的环境模型进行 MPC 的做法。

#### 专家迭代

在纯规划的基础上，一个直接的扩展是显式表示并学习策略 $\pi_{\theta}(a|s)$。智能体在模型中使用规划算法（例如蒙特卡洛树搜索）来规划，并从当前策略中采样候选动作。规划算法给出的动作比策略单独给出的动作更好，因此，规划算法可以充当相对于当前策略的“专家”。

之后，智能体更新策略，使它更倾向于给出与规划算法相似的动作。

- [ExIt](https://arxiv.org/abs/1705.08439) 使用这种方法训练深度神经网络来玩 Hex。
- [AlphaZero](https://arxiv.org/abs/1712.01815) 也是这种方法的例子。

#### 用模型生成的经验增强无模型方法

使用无模型 RL 算法训练策略或 Q 函数，同时在更新智能体时采取以下做法之一：

1. 用模型生成的虚拟经验补充真实经验；
2. 只使用模型生成的虚拟经验来更新智能体。

- [MBVE](https://arxiv.org/abs/1803.00101) 展示了如何用虚拟经验补充真实经验。
- [World Models](https://worldmodels.github.io/) 展示了如何只用虚拟经验训练智能体，并把这种方式称作“在梦境中训练”（training in the dream）。

#### 在策略中嵌入规划过程

另一种方法是把规划过程直接嵌入策略，作为策略调用的一个子程序；完整计划作为辅助信息提供给策略。再用任意标准的无模型算法训练策略。这里的关键是，策略可以学会选择在什么时候、以什么方式使用规划结果。

这样可以减轻模型偏差的影响：如果模型在某些状态下给出的规划不可靠，策略可以学会忽略它。

- [I2A](https://arxiv.org/abs/1707.06203) 是让智能体具备这类“想象”能力的一种方法。

## 参考资料

**[1] Q-learning 方法为何会失效**

- Tsitsiklis 和 Van Roy 的[经典论文](https://web.mit.edu/jnt/www/Papers/J063-97-bvr-td.pdf)；
- Szepesvári 的[综述](https://sites.ualberta.ca/~szepesva/papers/RLAlgsInMDPs.pdf)，第 4.3.2 节；
- Sutton 与 Barto 的[《强化学习：导论》](http://incompleteideas.net/book/the-book-2nd.html)第 11 章，尤其是第 11.3 节关于“致命三元组”（deadly triad）的讨论：函数逼近、自举更新和异策略数据共同导致价值学习算法不稳定。

**分类图中的算法引用**

- **[2] [A2C / A3C](https://arxiv.org/abs/1602.01783)**（Asynchronous Advantage Actor-Critic）：Mnih 等，2016。
- **[3] [PPO](https://arxiv.org/abs/1707.06347)**（Proximal Policy Optimization）：Schulman 等，2017。
- **[4] [TRPO](https://arxiv.org/abs/1502.05477)**（Trust Region Policy Optimization）：Schulman 等，2015。
- **[5] [DDPG](https://arxiv.org/abs/1509.02971)**（Deep Deterministic Policy Gradient）：Lillicrap 等，2015。
- **[6] [TD3](https://arxiv.org/abs/1802.09477)**（Twin Delayed DDPG）：Fujimoto 等，2018。
- **[7] [SAC](https://arxiv.org/abs/1801.01290)**（Soft Actor-Critic）：Haarnoja 等，2018。
- **[8] [DQN](https://www.cs.toronto.edu/~vmnih/docs/dqn.pdf)**（Deep Q-Networks）：Mnih 等，2013。
- **[9] [C51](https://arxiv.org/abs/1707.06887)**（Categorical 51-Atom DQN）：Bellemare 等，2017。
- **[10] [QR-DQN](https://arxiv.org/abs/1710.10044)**（Quantile Regression DQN）：Dabney 等，2017。
- **[11] [HER](https://arxiv.org/abs/1707.01495)**（Hindsight Experience Replay）：Andrychowicz 等，2017。
- **[12] [World Models](https://worldmodels.github.io/)**：Ha 和 Schmidhuber，2018。
- **[13] [I2A](https://arxiv.org/abs/1707.06203)**（Imagination-Augmented Agents）：Weber 等，2017。
- **[14] [MBMF](https://sites.google.com/view/mbmf)**（Model-Based RL with Model-Free Fine-Tuning）：Nagabandi 等，2017。
- **[15] [MBVE](https://arxiv.org/abs/1803.00101)**（Model-Based Value Expansion）：Feinberg 等，2018。
- **[16] [AlphaZero](https://arxiv.org/abs/1712.01815)**：Silver 等，2017。
