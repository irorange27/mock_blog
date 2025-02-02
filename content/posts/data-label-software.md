---
title: AI数据（自动）标注软件概述
date: 2024-12-20 14:00:00
categories: 殆罔集
tags:
  - 数据标注
  - 深度学习
description: 对市面上目前的AI数据（自动）标注软件进行调研。
---
数据驱动的深度学习已经成为了计算机科学解决现实问题的一大强有力的解决方案。而对于深度学习数据是重中之重。以我浅薄的经验来看，对于现实世界中的大多数任务，所使用数据质量的高低甚至比模型的工作更为重要。一个好的数据就是成功的一半。

涉及有监督的学习需要数据标注。而人工数据标注作为苦力活一直为人所诟病，认为这并不值得去学习。我认为，其中的关键并不在如何标注数据，而是怎样的数据标注是好的，或者说数据应当标注成什么样。这些问题其实在实践中已经积累下了不少的答案，我们已经有了“最佳实践”。

不同的数据领域划分了不同的任务。而一些任务存在了令人满意的通解，比如视觉上的 SAM、NLP上的 Transformer 系，Audio上的解决方案也很成熟。如何从一个成熟的解决方案中让自己的项目更自动化的受益？这就是数据自动标注所做的事。

举例，对于小的细分的尚且没有人做的领域任务，且使用深度学习的方法是可行的（而可行性多半决定于数据的质量和数量）。这时使用通用的领域模型对新任务自动的进行标注（乃至交互式标注），可以大大省去新任务的数据处理时间（甚至获得更高质量的数据）。这就是从成熟解决方案更自动化地受益的所指。

> 当我们在浏览器上搜索某样东西时，其实我们是假定使用浏览器的某人遇到了同样（相似）的问题并且有了解决方案。类似的，当我们有了一个想法的时候，你需要审查一下世界上有没有其他人早已经提出了类似的想法。

AI4S，这是很自然的想法，将AI用于数据标注，并且现实中已经存在实践。考虑到数据安全性问题以及我所能接触到的调研对象有限，下面仅列举无数据安全问题的开源项目。首先简单分类为领域特定的数据标注和通用类的数据标注。更详细的可以参见 [awesome-data-labeling](https://github.com/humansignal/awesome-data-labeling) 和 [Data_Label_Tools](https://github.com/mingx9527/Data_Label_Tools).

领域特定：

- CV：

- - [label-me](https://www.labelme.io/) FOSS
- - [X-AnyLabeling](https://github.com/CVHub520/X-AnyLabeling) GPL-3.0
- - [label-img](https://github.com/HumanSignal/labelImg) MIT(且已经 Archive, 被并入 label-studio)

- NLP:

- - [data-labeling](https://github.com/risesoft-y9/Data-Labeling) GPL-3.0

通用类：

- [label-studio](https://github.com/HumanSignal/label-studio/) Apache-2.0

按企业整理的话。国外有 [HumanSignal](https://humansignal.com/)。国内有[星尘](https://stardust.ai/) 、[有生](https://www.risesoft.net/)。HumanSignal 和 星尘是较早开始进入数据标注领域的。有生是今年才开始进入数据标注软件，并在 ToG 业务上有了进展。
