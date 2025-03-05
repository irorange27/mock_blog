---
title: Django 框架的思考
date: 2024-12-09 21:00:00
categories: 殆罔集
tags:
  - Django
  - Python
description: 对 Django 框架的思考记录。
---
Django 是由 Python 编写的后端服务器侧 Web 框架。基于 Model-Template-Views（MTV）的设计模式。最近浏览过的两个项目代表了两种Django的不同架构模式。

一种 [Django 项目](https://github.com/HumanSignal/label-studio) 就是选择了 MTV 的模式，该项目项目是支持多类型数据标注的软件平台，这也是我思考的第一种模式，MTV前后端一体。。它使用了 Django Template，但是也具有不错的扩展性。同时它的APP也按照了功能分类可以拆分和合并。不过为什么会需要微服务呢？什么时候需要微服务呢？

而另一种是只使用 Django 写[后端](https://github.com/makeplane/plane) ，而不使用 MTV 的模式。这是一个项目管理的软件，写的很复杂，部署也是用 Docker 或者 kubernetes。还是问：为什么需要微服务呢？它目标服务的人群到底是有多大规模呢？微服务不得不涉及到 DevOps ，其中额外的学习成本很大。而且这种只写

我在这两种模式中取舍。
