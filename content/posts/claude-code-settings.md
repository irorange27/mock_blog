---
title: Claude Code 配置分享
date: 2026-06-23 14:22:12
categories: '殆罔集'
tags:
  - LLMs
  - AI Agent
  - Agent
  - Claude Code
description: ''
draft: false
---

Claude Code 用户级的配置文件在 `~/.claude/settings.json`，环境变量通过 `env` 键值对来设置。除此之外常用的键还有 `permissions`、`hooks`、`enabledPlugins` 等。

## 为什么要花心思配它

[The Register 2026 年 4 月那篇 Claude Code 源码分析](https://www.theregister.com/software/2026/04/01/claude-codes-source-reveals-extent-of-system-access/5222658) 出来之后，我把自己的 settings 又调整了一些。几个让我在意的点：

遥测默认开启。CC 每次启动会上报 user ID、session ID、组织 UUID、邮箱、平台、终端类型、当前的 feature gates；网络不通就先落盘到 `~/.claude/telemetry/` 等下次再发送。只有走 Bedrock / Vertex / Foundry 时才默认关闭。错误上报那条路也类似，CC 抛异常时把 cwd 和路径片段一起传上去。目录名本身也是信息，算半个泄露。

更值得注意的是本地留底。每一次 `Read`、`Bash`、`Grep`、`Edit/Write` 的输入输出都以明文 JSONL 写进会话归档。还没正式发布的 autoDream 会去 grep 这堆归档，把摘要写进 `MEMORY.md`，然后 `MEMORY.md` 又会注入下一轮 system prompt。这流程走完，模型看过的文件最终就进了 API 的。

企业部署还多一层 `policySettings`，每小时拉一次，可以热更新 `.env`、`PATH`、`LD_PRELOAD`、permissions 和 feature flag。个人用户用不到，但知道这个通道存在比较好。自动更新走 Statsig / GrowthBook，Anthropic 想禁用某个版本一句话的事，所以保守做法是关闭自动更新、自己锁版本。我自己是 brew 安装的，不 `upgrade` 就停在当前版本上，但只要 `brew upgrade` 一下就直接跳到最新——如果想严格锁版本，还是得用 npm 指定具体版本号安装。

本文后面那些环境变量和 `permissions.deny`、空 `attribution`，本质就是在缩减这个 CC 暴露的信息：

- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 把 telemetry、错误上报、自动更新和其他后台请求一并关闭，相当于把上面前两条 + 版本远控一起断掉。
- `permissions.deny` 把 `~/.ssh/`、`./secrets/` 封掉，就算 autoDream 哪天默认开启去扫归档，这些路径它也读不进来。
- `attribution.commit/pr` 留空，不在 git history 里留 AI 痕迹。顺带一提，源码里有个 `undercover.ts`，在仓库被识别成"明确拒绝 AI 贡献的开源项目"时会主动让 Claude 隐藏作者身份 —— 这个态度本身就挺微妙的。

文章里还提到两个设置，我没用，但还是记一下：

- **`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`**：关闭所有 memory / telemetry 写入。
- **`CLAUDE_CODE_SIMPLE`**（`--bare` 模式）：直接关闭 memory 和 autoDream。

下面进入正题。

## 环境变量（`env`）

### 行为控制

- **`CLAUDE_CODE_EFFORT_LEVEL`**：执行任务的努力程度，`max` 表示最充分的分析和规划。
- **`DISABLE_AUTOUPDATER`**：关闭自动更新检查，避免在国内网络环境下卡住启动。
- **`ENABLE_TOOL_SEARCH`**：启用工具搜索，让 Claude 通过 `ToolSearch` 动态发现和加载工具的 schema，节省启动时的 context。

### 隐私与流量控制

三个相关的环境变量，避免暴露隐私：

- **`DISABLE_TELEMETRY`**：关闭遥测数据上报，不上传使用统计。
- **`DISABLE_ERROR_REPORTING`**：关闭错误报告，崩溃或异常时不会自动向 Anthropic 发送错误信息。
- **`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`**：一键关闭所有非必要网络流量，**包含了前两者的功能（以及关闭了自动更新）**，同时还会禁用更新检查等其他后台请求。如果只想保留纯 API 调用，设这一个就够了。

### 其他常用变量（按需开启）

这些没出现在配置里，但切换 API 提供商时常用：

- **`ANTHROPIC_AUTH_TOKEN`**：API 密钥。使用第三方 API 代理（如火山引擎）时填代理提供的 key。
- **`ANTHROPIC_BASE_URL`**：API 端点地址，切换模型提供商时改这里。
- **`ANTHROPIC_MODEL`** / **`ANTHROPIC_DEFAULT_OPUS_MODEL`** / **`ANTHROPIC_DEFAULT_SONNET_MODEL`** / **`ANTHROPIC_DEFAULT_HAIKU_MODEL`**：指定各级别对应的实际模型名。当你用 `--model opus` 这类参数时，CLI 会读对应环境变量。值可以带后缀，比如 `glm-5.2[1m]`，`[1m]` 表示 1M 上下文窗口。
- **`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`**：控制自动压缩（compact）的触发阈值。默认约 0.9（90%），调高（如 `0.95`）可以减少压缩频率、保留更多对话细节，调低则更早触发压缩、节省 token。

## 模型（`model`）

- **`opus[1m]`**：CLI 启动时默认使用的模型等级，表示用 Opus 级模型加 1M 上下文。
- 切换模型或 API 提供商时，推荐用 **CC-Switch** 工具，可以在多套配置之间快速切换，省得手动改 `settings.json`。

## 提交署名（`attribution`）

```json
"attribution": {
  "commit": "",
  "pr": ""
}
```

控制 Claude 在生成 commit message 和 PR 描述时附带的署名后缀（默认会加 "Generated with Claude Code" 之类的尾巴）。两个字段都置空，等于关掉署名 —— 提交历史干净，看不出哪些是 AI 写的。

## 权限（`permissions`）

### `allow`：预授权

放行后无需弹确认框。常见的是放行特定域名的 `WebFetch`：

```json
"allow": [
  "WebFetch(domain:deepseek.com)",
  "WebFetch(domain:moonshot.cn)",
  "WebFetch(domain:qwen.ai)",
  "WebFetch(domain:google.com)",
  "WebFetch(domain:anthropic.com)",
  "WebFetch(domain:openai.com)",
  "WebFetch(domain:arxiv.org)",
  "WebFetch(domain:*.edu)",
  "WebFetch(domain:*.ac.cn)"
]
```

域名覆盖建议：主流 AI 厂商（DeepSeek、Moonshot、Qwen、Anthropic、OpenAI），搜索引擎（Google），学术站点（arxiv、各大学 `.edu` 及中科院 `.ac.cn`）。支持通配符 `*.edu`。

如果你使用的是非 Claude 官方的供应商，需要把的 **`skipWebFetchPreflight: true`** 一起打开，来启用 `WebFetch` 工具。另外，`WebFetch` 默认会先发一次预检请求探测域名可达性，再发真正的 GET。对于已经 allow 的可信域名，这一轮纯属浪费 —— 跳过预检后每次抓网页少一轮 RTT。

### `deny`：硬性拒绝

无论怎么 prompt 都不会执行的兜底护栏，比 `allow` 优先级更高：

```json
"deny": [
  "Read(**/.ssh/**)",
  "Read(./secrets/**)",
  "Bash(rm -rf *)"
]
```

- `Read(**/.ssh/**)`：防止 Claude 读到 SSH 私钥。
- `Read(./secrets/**)`：项目本地的密钥目录。
- `Bash(rm -rf *)`：防止递归删除。

划好这几条红线之后，可以放心打开顶层的 **`skipDangerousModePermissionPrompt: true`** —— 用 `claude --dangerously-skip-permissions`（YOLO 模式）启动时，CLI 默认会弹一个红色确认框让你回车确认，这个开关跳过那一步。前提就是 `deny` 已经把后路封住，否则跳过确认就毫无防护了。

## 钩子（`hooks`）

工具调用前后触发本地命令，可以做日志、改写、拦截、统计等。下面这条把所有 `Bash` 工具的调用接入 RTK（Rust Token Killer）代理，用更短的输出来省 token：

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {"type": "command", "command": "rtk hook claude"}
      ]
    }
  ]
}
```

`matcher` 支持按工具名匹配（`Bash` / `Read` / `Edit` / `Write` 等），`PreToolUse` 在工具执行前触发，对应的还有 `PostToolUse`、`UserPromptSubmit`、`SessionStart`、`Stop` 等事件。

## 插件推荐（`enabledPlugins` + `extraKnownMarketplaces`）

Claude Code 的插件机制由两部分组成：先在 `extraKnownMarketplaces` 注册插件仓库，再在 `enabledPlugins` 中按 `插件名@市场名` 启用。

### 注册插件市场

```json
"extraKnownMarketplaces": {
  "wakatime": {
    "source": {"source": "git", "url": "https://github.com/wakatime/claude-code-wakatime.git"}
  },
  "ponytail": {
    "source": {"source": "github", "repo": "DietrichGebert/ponytail"}
  },
  "claude-hud": {
    "source": {"source": "github", "repo": "jarrodwatts/claude-hud"}
  }
}
```

`source` 类型有两种：

- `"source": "github"` + `repo`：GitHub 仓库的简写。
- `"source": "git"` + `url`：任意 Git URL，包括自建 Gitea / GitLab。

### 启用具体插件

```json
"enabledPlugins": {
  "claude-code-wakatime@wakatime": true,
  "ponytail@ponytail": true,
  "skill-creator@claude-plugins-official": true,
  "claude-md-management@claude-plugins-official": true,
  "superpowers@claude-plugins-official": true,
  "code-simplifier@claude-plugins-official": true,
  "claude-hud@claude-hud": true
}
```

`claude-plugins-official` 是内置的官方市场，不用在 `extraKnownMarketplaces` 里注册。这套配置里启用的几个插件：

- **claude-code-wakatime**：把编码时长记录到 WakaTime。
- **ponytail**：强制"懒人最简解"风格，避免过度工程。
- **skill-creator**：创建、修改、衡量 skill。
- **claude-md-management**：管理 `CLAUDE.md`。
- **superpowers**：一组通用工作流 skill（TDD、调试、code review、计划撰写等）。
- **code-simplifier**：在保持功能不变的前提下精简最近改动的代码。
- **claude-hud**：状态栏 HUD，需要 `/claude-hub:setup` 初始化，其实和官方提供的 `/statusline <prompt>` 没区别。

这些是通用的插件，而且都没有 MCP，只是 skills，挺轻量的，我就默认一直启用了。其他特定功能的插件根据项目按需开启。

## 我的配置分享

下面是我在CC-Switch里的通用配置：

```json
{
  "env": {
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "true",
    "CLAUDE_CODE_EFFORT_LEVEL": "max",
    "DISABLE_AUTOUPDATER": "1",
    "DISABLE_ERROR_REPORTING": "true",
    "DISABLE_TELEMETRY": "true",
    "ENABLE_TOOL_SEARCH": "true"
  },
  "attribution": {
    "commit": "",
    "pr": ""
  },
  "model": "opus[1m]",
  "permissions": {
    "allow": [
      "WebFetch(domain:deepseek.com)",
      "WebFetch(domain:moonshot.cn)",
      "WebFetch(domain:qwen.ai)",
      "WebFetch(domain:google.com)",
      "WebFetch(domain:anthropic.com)",
      "WebFetch(domain:openai.com)",
      "WebFetch(domain:arxiv.org)",
      "WebFetch(domain:*.edu)",
      "WebFetch(domain:*.ac.cn)"
    ],
    "deny": [
      "Read(**/.ssh/**)",
      "Read(./secrets/**)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "rtk hook claude"
          }
        ]
      }
    ]
  },
  "enabledPlugins": {
    "claude-code-wakatime@wakatime": true,
    "ponytail@ponytail": true,
    "skill-creator@claude-plugins-official": true,
    "claude-md-management@claude-plugins-official": true,
    "superpowers@claude-plugins-official": true,
    "code-simplifier@claude-plugins-official": true,
    "claude-hud@claude-hud": true
  },
  "extraKnownMarketplaces": {
    "wakatime": {
      "source": {
        "source": "git",
        "url": "https://github.com/wakatime/claude-code-wakatime.git"
      }
    },
    "ponytail": {
      "source": {
        "source": "github",
        "repo": "DietrichGebert/ponytail"
      }
    },
    "claude-hud": {
      "source": {
        "source": "github",
        "repo": "jarrodwatts/claude-hud"
      }
    }
  },
  "skipDangerousModePermissionPrompt": true,
  "skipWebFetchPreflight": true
}
```

---

日常用下来，`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` + `permissions.allow/deny` + 几个 skill 插件，基本就能覆盖 90% 的需求。
