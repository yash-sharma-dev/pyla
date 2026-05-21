# CtxPort 愉悦微交互设计文档

> 版本：v1.0 | 日期：2026-02-07
> 方法论：Alan Cooper Goal-Directed Design
> Primary Persona：Alex -- The Multi-Tool Developer
> 设计目标：让产品有"让用户忍不住推荐"的品质

---

## 0. 设计哲学

在 Alan Cooper 的交互礼仪框架中，愉悦（Delight）不是一种装饰，而是软件向用户传递**尊重和能力感**的方式。一个体贴的人类助手不会每次帮你复印完文件后放烟花，但他会微笑着说"搞定了，24 页"，然后安静地退到一边。

CtxPort 的微交互遵循三个设计约束：

| 约束 | 含义 | 反面教材 |
|------|------|---------|
| **不打断** | 微交互绝不阻塞用户的下一步操作（复制后切换到另一个 Tab） | 全屏 confetti 遮挡页面 |
| **有信息量** | 每一帧动画都在传递有用信息（消息数、token 数、状态变化） | 纯装饰性动画 |
| **渐进惊喜** | 首次使用简洁克制，随使用深度逐渐解锁惊喜时刻 | 首次使用就弹 5 步引导 |

**核心判断标准**：如果 Alex 在深度工作（flow state）中使用 CtxPort，这个微交互会不会打断他的心流？如果会，砍掉它。

---

## 1. Copy 成功后的反馈动画

### 1.1 按钮状态机时序（精确到毫秒）

```
时间轴 (ms)    按钮状态        视觉表现                         用户感知
─────────────────────────────────────────────────────────────────────────
  0            IDLE           剪贴板图标, opacity 0.7           "那个复制按钮"
  0            用户点击
  0-10         LOADING        scale(0.88) 按压反馈              "我点到了"
  10           释放鼠标
  10-160       LOADING        scale(1) + spinner 替换图标       "正在处理"
                              spinner: 0.8s 一圈, opacity 0.6
  ~300-2000    LOADING        spinner 持续旋转                  "在工作"
                              (典型耗时 300-800ms)
  T+0          SUCCESS        spinner 停止                      -
  T+0          SUCCESS        checkmark 从 scale(0.5) + opacity(0)
                              弹入 scale(1) + opacity(1)
                              时长: 250ms, 缓动: spring
                              颜色: #059669 (绿)                "成功了!"
  T+0          SUCCESS        Toast 从顶部 translateY(-100%)
                              滑入 translateY(0)
                              时长: 350ms, 缓动: spring
                              内容: "Copied 24 messages . ~8.2K tokens"
  T+1500       回归 IDLE      checkmark 淡出: opacity 0, 150ms
                              剪贴板图标淡入: opacity 0.7, 150ms
  T+2000       Toast 退出     Toast translateY(-20px) + opacity 0
                              时长: 150ms, 缓动: easeIn
```

**时序设计决策说明**：

- **按压反馈 (0ms)**：`scale(0.88)` 的按压效果在 `mouseDown` 瞬间触发，不等动画完成。这给用户"物理按钮"的触感反馈。使用 100ms easeIn 确保按压感干脆。
- **弹回 (mouseUp)**：`scale(1)` 使用 150ms spring 缓动，轻微的过冲 (overshoot) 让弹回有弹性感。
- **Spinner 替换 (10ms)**：图标替换在按压弹回后立即发生，使用原地替换（同一 DOM 位置），避免布局跳动。
- **Checkmark 弹入**：使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` spring 缓动。1.56 的 overshoot 让 checkmark 有"弹出来"的活力感，但不夸张。
- **1500ms 停留**：这是 Alex 从"点击复制"到"Cmd+Tab 切换到目标工具"的典型时间窗口。成功反馈在这个窗口内可见，但不会在他切走后还残留。
- **Toast 停留 2000ms**：比按钮状态多 500ms，因为 Toast 含有信息（消息数、token 数），需要给用户一点阅读时间。但 2 秒已经足够扫一眼。

### 1.2 错误状态时序

```
时间轴 (ms)    按钮状态        视觉表现
─────────────────────────────────────────────────────────────
  T+0          ERROR          warning 三角从 scale(0.5) 弹入 scale(1)
                              时长: 150ms, 缓动: easeOut (不用 spring, 错误不要"弹跳")
                              颜色: #dc2626 (红)
  T+0          ERROR          Toast 滑入, 橙色背景
                              内容: 错误原因 + 恢复建议
  T+3000       回归 IDLE      warning 淡出, 剪贴板图标淡入
  T+4000       Toast 退出     Toast 淡出
```

**错误状态不用 spring 缓动**：错误反馈应该是"稳重的提醒"，不是"弹跳的惊喜"。easeOut 给出"平稳出现"的感觉。

### 1.3 列表侧边栏复制的差异

列表复制图标比主按钮更小（28x28 vs 32x32），其微交互也相应收敛：

| 属性 | 主按钮 (CopyButton) | 列表图标 (ListCopyIcon) |
|------|---------------------|------------------------|
| 图标尺寸 | 18x18 | 16x16 |
| 按压缩放 | scale(0.88) | scale(0.9) |
| hover 放大 | scale(1.08) | scale(1.06) |
| Checkmark 弹入时长 | 250ms | 250ms (相同) |
| 列表项背景闪烁 | 无 | 成功时行背景 flash 绿色 200ms |

**列表项背景闪烁**：当用户在侧边栏复制时，不仅图标变绿，该列表项的背景也短暂闪烁淡绿色。这解决了列表图标太小、仅靠图标变色可能不够醒目的问题。闪烁用 200ms fadeIn + 200ms 停留 + 300ms fadeOut，总共 700ms，不抢眼但够用。

### 1.4 Confetti/粒子效果：不使用

**设计决策：明确不做 confetti。**

理由：

1. **违反"不打断"原则**：Alex 复制完会话后的下一个动作是 Cmd+Tab 切换窗口。Confetti 会遮挡他正在看的内容，哪怕只有 0.5 秒。
2. **与产品调性不符**：CtxPort 是一个开发者生产力工具，不是游戏化应用。开发者在 flow state 中不希望被烟花打断。
3. **重复使用后的厌烦**：Alex 每天复制 5-10 次。第一次 confetti 可能觉得有趣，第三次就会觉得烦。Alan Cooper 的交互礼仪原则明确反对"每次都庆祝日常操作"。
4. **性能开销**：粒子系统占用 GPU 资源，在已经被 ChatGPT/Claude 自身占用大量资源的页面上增加额外渲染负担。

**替代方案**：用 checkmark 的 spring 弹入动画传递"完成！"的愉悦感。这比 confetti 更克制，但同样有效。Spring 缓动的 overshoot 是"愉悦"和"干净"之间的平衡点。

---

## 2. 使用统计的展示交互

### 2.1 设计定位：统计不是虚荣指标，是用户的成就感来源

Alex 不关心"你用了 CtxPort 100 次"，他关心"CtxPort 帮我节省了多少时间"。统计设计必须回答这个问题。

### 2.2 展示位置：Extension Popup

**为什么不在 Toast 中展示统计？**
- Toast 的存在时间只有 2 秒，不够阅读累积统计
- Toast 用于**即时反馈**，不是**回顾**
- 在 Toast 中塞统计会让即时反馈变得冗长

**为什么不做独立页面？**
- MVP 阶段不值得为统计做独立页面
- 独立页面增加了导航步骤，违反"一键即达"原则
- Alex 不会主动打开一个"统计仪表盘"

**最终决策：在 Extension Popup 的底部展示简要统计。**

### 2.3 Popup 统计区域设计

```
┌──────────────────────────────────┐
│  [logo] CtxPort                  │
│  Copy AI conversations as        │
│  Context Bundles.                │
│                                  │
│  [=== Copy Current Conv. ===]    │
│                                  │
│      ChatGPT detected            │
│                                  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ <-- 分隔线
│                                  │
│  YOUR CONTEXT FLOW               │ <-- 低对比度标题
│                                  │
│   42 conversations copied        │ <-- 累计数字
│   ~186K tokens transferred       │ <-- 累计 token 数
│   Est. ~3.1 hours saved          │ <-- 换算为时间（核心指标）
│                                  │
└──────────────────────────────────┘
```

### 2.4 统计指标定义

| 指标 | 计算方式 | 存储位置 | 含义 |
|------|---------|---------|------|
| **Conversations copied** | 每次成功复制 +1（批量中每个会话分别计数） | `chrome.storage.local` | 累计使用次数 |
| **Tokens transferred** | 每次复制累加 `estimatedTokens` | `chrome.storage.local` | 累计搬运的上下文量 |
| **Hours saved** | `(conversations * 15 min) / 60` | 实时计算，不存储 | 核心价值感知 |

**"Hours saved" 的计算逻辑**：

基于 Persona 调研数据，手动复制一次会话的平均摩擦时间是 15-40 分钟。我们取保守估计 **15 分钟**作为基准。这不是精确数字，而是给用户一个"量级感知"。显示时使用 `Est.` 前缀和 `~` 近似标记，诚实表明这是估算。

**为什么选这三个指标而非其他？**

- **不展示 "连续使用天数"**：这是虚荣指标，不反映实际价值。Alex 周末不用不代表产品价值减少。
- **不展示 "排名"**：没有社交比较的必要。CtxPort 不是社交产品。
- **不展示 "本周/本月趋势图"**：MVP 阶段过度设计。用户不需要在 Popup 的 280px 宽窗口里看趋势图。
- **展示 token 数**：因为 Alex 关心 "我搬运了多少上下文"，token 是 AI 时代的通用度量单位。
- **展示时间节省**：因为这直接回答 "CtxPort 对我有什么用"。

### 2.5 统计数字的微交互

**首次展示（统计 > 0 时）**：
- 统计区域在 Popup 打开时不立即显示
- 延迟 200ms 后 fadeIn（opacity 0 -> 1, 300ms easeOut）
- 数字用轻量的 countUp 动画：从 0 滚动到实际值，300ms，easeOut
- 目的：给用户一个"发现彩蛋"的微小惊喜，而非一上来就信息轰炸

**数字更新（刚完成一次复制后打开 Popup）**：
- 如果用户刚复制了一个会话，然后立即打开 Popup
- 最新的数字有轻微的"弹跳"效果（scale 1 -> 1.05 -> 1, 300ms spring）
- 颜色短暂变为绿色 500ms 后恢复
- 目的：让用户感知到"我的行动被记录了"

### 2.6 统计区域的出现条件

- **0 次使用**：不显示统计区域（空状态没有意义）
- **1-4 次使用**：仅显示 `N conversations copied`（单一指标，不要信息过载）
- **5+ 次使用**：显示全部三个指标
- **里程碑数字**（10、50、100、500、1000）：数字旁边有一个微小的星号标记，但不弹窗、不祝贺

---

## 3. "分享"触发点的交互设计

### 3.1 核心原则：被动分享 > 主动提示

Alan Cooper 的交互礼仪有一条铁律：**不要在用户完成任务时打断他去做另一件事**。"Rate this app" 弹窗之所以令人厌恶，正是因为它在用户达成目标（完成复制）的瞬间，强行插入了一个与用户目标无关的请求。

CtxPort 的分享策略：**永远不弹出"请分享/评价"的提示。**

取而代之的是，让产品本身成为分享的载体。

### 3.2 内嵌品牌水印（被动分享机制）

每个 Context Bundle 的 Markdown 末尾包含一行轻量签名：

```markdown
<!-- Copied with CtxPort (https://ctxport.com) -->
```

这是一个 HTML 注释，在大多数 Markdown 渲染器中不可见，但：
- 被粘贴到 AI 聊天中时，AI 会"看到"这行注释
- AI 可能会提到"看起来你用 CtxPort 整理了上下文"，自然地向对话中的其他人（如果是团队共享场景）暴露品牌
- 技术人员在查看 Markdown 原文时会注意到
- 不影响内容、不占视觉空间、不侵犯用户内容所有权

**用户可以关闭**：在 Popup 设置中提供 "Include CtxPort signature in copied content" 开关，默认开启，随时关闭。尊重用户的控制权。

### 3.3 里程碑时刻的柔性分享引导

**触发条件**：仅在**特定里程碑**时，在 Popup 统计区域下方显示一条柔性提示。不弹窗、不 Toast、不打断任何正在进行的操作。

```
里程碑触发规则：
- 第 10 次成功复制：首次触发
- 第 50 次成功复制：第二次触发
- 第 100 次成功复制：第三次触发
- 此后不再触发（最多 3 次，终身）
```

**提示形式**（在 Popup 统计区域下方）：

```
┌──────────────────────────────────┐
│  YOUR CONTEXT FLOW               │
│                                  │
│   10 conversations copied        │
│   ~42K tokens transferred        │
│   Est. ~2.5 hours saved          │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ You've saved ~2.5 hours.     │ │ <-- 柔性提示区
│ │ If CtxPort is useful,        │ │
│ │ a Chrome Store review helps  │ │
│ │ others find it.              │ │
│ │              [Leave a review] │ │ <-- 低调链接
│ │              [Dismiss]        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**设计约束**：

| 约束 | 实现 |
|------|------|
| **只在 Popup 中展示** | 永远不在 Content Script 中弹出（不打断工作流） |
| **用户主动打开 Popup 才看到** | 用户没有打开 Popup 就永远不会看到 |
| **可永久关闭** | 点击 [Dismiss] 后永远不再显示（存储在 `chrome.storage.local`） |
| **文案基于事实** | "You've saved ~2.5 hours" 是基于实际使用数据的陈述，不是"你喜欢我们吗？" |
| **不使用情感操控** | 不说"Love CtxPort?"，不用表情符号，不用渐变色高亮 |
| **终身最多 3 次** | 即使用户每次都 Dismiss，也只会在 10/50/100 三个节点出现 |

### 3.4 "复制为 Tweet" 功能（可选，非侵入式）

在 Popup 统计区域提供一个次要按钮，让用户可以一键生成分享文案：

```
[Share your stats] <-- 文字链接，不是按钮，极低视觉优先级
```

点击后，在系统剪贴板写入一段预生成的分享文案（不打开浏览器新 Tab）：

```
I've used CtxPort to transfer 186K tokens across AI tools, saving ~3 hours of manual copy-paste. If you work with multiple AI assistants, check it out: https://ctxport.com
```

然后 Toast 提示："Share text copied to clipboard. Paste anywhere."

**为什么是复制到剪贴板而非直接打开 Twitter？**
- 尊重用户选择分享到哪里（Twitter、Mastodon、Slack、Discord...）
- 不假设用户有 Twitter 账户
- 不强制打开新 Tab（打断当前工作流）
- 用户可以编辑文案后再发布

### 3.5 反模式清单（明确不做的事情）

| 反模式 | 为什么不做 |
|--------|-----------|
| 每 N 次使用后弹窗 "Rate this app" | 违反交互礼仪，打断用户目标 |
| 在 Toast 中加 "Share" 按钮 | Toast 是即时反馈，不是营销渠道 |
| NPS 评分弹窗 | Alex 不是在做调研，他在工作 |
| "邀请好友获得高级功能" | 产品还没有付费版，过早引入增长套路 |
| 成功后播放音效 | 在办公环境中是灾难，尤其对远程工作者 |
| 社交媒体分享浮动按钮 | 污染 Content Script 注入的 UI |

---

## 4. 首次使用引导 vs 长期使用的交互差异

### 4.1 核心理念：Zero-Onboarding

Alex 是高级开发者，日常使用 4-5 个 AI 工具。他**不需要被教**如何使用一个复制按钮。

CtxPort 的首次使用体验应该是：

```
安装扩展 → 打开 ChatGPT/Claude → 看到复制按钮 → 点一下 → 成功了 → "哦，好用"
```

不需要：Welcome 页面、Step-by-step 引导、Tooltip 巡游、Feature 介绍弹窗。

### 4.2 首次使用的差异化微交互

虽然不做正式引导，但首次使用有几个微妙的差异：

#### 4.2.1 按钮发现脉冲（仅一次）

**触发条件**：安装扩展后首次打开 ChatGPT/Claude 会话页面。

**表现**：复制按钮出现时有一个轻微的脉冲动画。

```
时间轴:
  0ms     按钮出现, opacity 0
  100ms   opacity 1, 正常尺寸
  600ms   第一次脉冲: scale(1.15), opacity 0.9, ring 扩散
  900ms   回到 scale(1)
  1400ms  第二次脉冲: scale(1.12), opacity 0.9, ring 扩散
  1700ms  回到 scale(1)
  2200ms  第三次脉冲: scale(1.10), opacity 0.9, ring 扩散
  2500ms  回到 scale(1), 之后完全静止
```

**"Ring 扩散"细节**：按钮外围有一个半透明圆环从按钮中心扩散并淡出，类似 Material Design 的 ripple 效果但更克制。

**设计约束**：
- 脉冲幅度递减（1.15 -> 1.12 -> 1.10），避免"跳大神"感
- 三次后永远不再出现（标记存入 `chrome.storage.local`）
- 如果用户在脉冲过程中 hover 或点击按钮，脉冲立即停止
- 不影响按钮功能，脉冲期间按钮完全可交互

#### 4.2.2 首次成功 Toast 增强

**触发条件**：第一次成功复制。

**差异**：Toast 内容比后续使用多一行：

```
首次 Toast:
┌──────────────────────────────────────────────────────────────┐
│ [check] Copied 24 messages . ~8.2K tokens                    │
│         Paste into any AI tool with Cmd+V                    │
└──────────────────────────────────────────────────────────────┘

后续 Toast:
┌──────────────────────────────────────────────────────────────┐
│ [check] Copied 24 messages . ~8.2K tokens                    │
└──────────────────────────────────────────────────────────────┘
```

**为什么增加 "Paste into any AI tool with Cmd+V"？**
- 对 Alex 来说这是多余的（他当然知道 Cmd+V）
- 但对 Maya（Secondary Persona，非技术背景的 Vibecoder）来说，这明确告诉她"下一步做什么"
- 只显示一次，不造成长期噪音

#### 4.2.3 第二次使用的快捷键提示

**触发条件**：第二次成功复制（不是第一次，因为第一次用户还在消化"这东西是什么"）。

**差异**：Toast 末尾附加快捷键提示：

```
第二次 Toast:
┌──────────────────────────────────────────────────────────────┐
│ [check] Copied 18 messages . ~6.1K tokens                    │
│         Tip: Cmd+Shift+C to copy without clicking            │
└──────────────────────────────────────────────────────────────┘
```

**为什么是第二次？**
- 第一次：用户在学习"这个按钮干什么"
- 第二次：用户已知道功能，此时提供效率提升建议最合适
- 第三次及以后：纯净的单行反馈，不再有任何教育信息

### 4.3 长期使用的交互演进

随着使用次数增加，交互逐渐精简：

```
使用阶段         Toast 内容                        额外元素
───────────────────────────────────────────────────────────────
第 1 次          消息数 + token 数                  + "Paste with Cmd+V"
                                                   + 按钮脉冲动画
第 2 次          消息数 + token 数                  + 快捷键提示
第 3-9 次        消息数 + token 数                  (纯净反馈)
第 10 次         消息数 + token 数                  (纯净反馈)
                                                   Popup 中出现分享提示
第 50 次         消息数 + token 数                  (纯净反馈)
                                                   Popup 中出现第二次分享提示
第 100 次        消息数 + token 数                  (纯净反馈)
                                                   Popup 中出现最后一次分享提示
第 100+ 次       消息数 + token 数                  (永远纯净)
```

**设计原则：Content Script 中的交互随使用次数趋向极简。** 所有"额外信息"在前几次使用后消失，此后复制操作的反馈永远是一行：消息数 + token 数。增长相关的提示全部收敛到 Popup（用户主动打开的空间），不污染核心工作流。

### 4.4 复制格式记忆的渐进披露

| 使用阶段 | 格式选项行为 |
|---------|------------|
| 第 1-3 次 | 右键菜单中只显示默认项（完整会话）标记为 [check]，其他选项正常列出但无特殊标记 |
| 第 4 次起 | 如果用户曾使用过非默认格式，右键菜单中该格式旁显示 "Recently used" 标记 |
| 长期使用 | 右键菜单按用户使用频率微调排序（默认始终在第一位，其他按最近使用排序） |

---

## 5. 状态转换的精确时序图

### 5.1 完整状态转换图（Copy Button）

```
                          ┌───────────┐
                          │           │
                 ┌────────│   IDLE    │◄─────────────────────────────┐
                 │        │           │                              │
                 │        └─────┬─────┘                              │
                 │              │                                    │
           mouseEnter      click (mouseDown)                   1500ms timeout
                 │              │                                    │
                 v              v                                    │
        ┌──────────────┐  ┌──────────┐                               │
        │ IDLE:HOVERED │  │ LOADING  │──────────────────┐            │
        │              │  │          │                  │            │
        │ opacity: 1.0 │  │ spinner  │            parse/API error   │
        │ scale: 1.08  │  │ scale:1  │                  │            │
        │ bg: 0.08     │  │ op: 0.6  │                  v            │
        └──────────────┘  └────┬─────┘          ┌──────────┐         │
                               │                │  ERROR   │         │
                          parse + clipboard      │          │─────────┤
                          success               │ warning  │  3000ms │
                               │                │ #dc2626  │         │
                               v                └──────────┘         │
                        ┌──────────┐                                 │
                        │ SUCCESS  │─────────────────────────────────┘
                        │          │
                        │ check    │
                        │ #059669  │
                        │ spring   │
                        └──────────┘
```

### 5.2 Toast 出现/消失时序

```
                                      Toast 可见
                                   ◄──────────────────────►

         复制成功          Toast 入场        Toast 停留            Toast 退场
            │               350ms            ~1650ms               150ms
            │          ┌────────────┐   ┌──────────────┐   ┌──────────────┐
            │          │ Y: -100%   │   │ Y: 0         │   │ Y: -20px     │
            ▼          │ → Y: 0     │   │ opacity: 1   │   │ opacity: 0   │
         T+0ms         │ opacity: 1 │   │ 静止         │   │ easeIn       │
                       │ spring     │   │              │   │              │
                       └────────────┘   └──────────────┘   └──────────────┘

总时间: ~2150ms (成功) / ~4150ms (错误)
```

### 5.3 列表复制图标的可见性状态机

```
             mouseEnter
  ┌────────┐ ──────────► ┌──────────┐
  │ HIDDEN │             │ VISIBLE  │
  │        │ ◄────────── │          │
  └────────┘  mouseLeave └─────┬────┘
              (且非加载中)       │
                          click │
                               v
                        ┌──────────┐     mouseLeave
                        │ FETCHING │ ──► 图标保持可见
                        │          │     直到操作完成
                        └─────┬────┘
                              │
                    ┌─────────┼─────────┐
                    v                   v
             ┌──────────┐        ┌──────────┐
             │ SUCCESS  │        │  ERROR   │
             │          │        │          │
             │ 行背景闪绿│        │ 行背景不变│
             └─────┬────┘        └─────┬────┘
                   │  1500ms           │  3000ms
                   └─────────┬─────────┘
                             v
                    回到 HIDDEN 或 VISIBLE
                    (取决于鼠标是否仍在列表项上)
```

---

## 6. 动效设计令牌（Motion Design Tokens）

所有动效参数统一定义，确保整个产品的微交互感觉一致：

```typescript
const MOTION = {
  // Duration
  instant: '100ms',     // 按压反馈、微小状态变化
  fast: '150ms',        // 淡入淡出、颜色变化
  normal: '250ms',      // 图标替换、checkmark 弹入
  smooth: '350ms',      // Toast 入场、较大的位移动画
  emphasis: '500ms',    // 首次使用脉冲（仅一次性动画使用）

  // Easing
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',      // 大多数入场动画
  easeIn: 'cubic-bezier(0.55, 0, 1, 0.45)',       // 退场动画
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',    // 对称过渡
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // 成功弹入（有 overshoot）
  springSubtle: 'cubic-bezier(0.22, 1.2, 0.36, 1)', // 轻微弹性（hover 放大）
  snapOut: 'cubic-bezier(0, 0.7, 0.3, 1)',        // 快速减速（按压弹回）
} as const;
```

**设计原则**：
- **入场用 easeOut**：元素"减速到达目标位置"，给人"滑入停稳"的感觉
- **退场用 easeIn**：元素"加速离开"，干净利落不拖泥带水
- **成功用 spring**：overshoot 传递"完成！"的活力感
- **错误不用 spring**：错误状态应该"稳重出现"，不应该"弹跳"
- **按压用 instant + easeIn**：快速、干脆，模拟物理按钮的触感

---

## 7. 数据持久化需求

微交互系统需要以下数据存储在 `chrome.storage.local` 中：

```typescript
interface CtxPortLocalStorage {
  // 使用统计
  stats: {
    totalConversations: number;    // 累计复制会话数
    totalTokens: number;           // 累计 token 数
    firstUsedAt: string;           // ISO 日期，首次使用时间
    lastUsedAt: string;            // ISO 日期，最近使用时间
  };

  // 首次使用标记
  onboarding: {
    discoveryPulseDone: boolean;   // 按钮脉冲是否已播放
    firstCopyDone: boolean;        // 首次复制是否已完成
    shortcutTipShown: boolean;     // 快捷键提示是否已显示
  };

  // 分享提示状态
  sharing: {
    milestone10Dismissed: boolean;  // 第 10 次里程碑提示
    milestone50Dismissed: boolean;  // 第 50 次里程碑提示
    milestone100Dismissed: boolean; // 第 100 次里程碑提示
    includeSignature: boolean;      // 是否在 Bundle 中包含品牌签名（默认 true）
  };

  // 格式偏好
  format: {
    lastUsedNonDefault: BundleFormatType | null; // 最近使用的非默认格式
    recentFormats: BundleFormatType[];           // 最近使用过的格式列表
  };
}
```

**存储策略**：
- 所有数据存在本地，不上传到任何服务器
- 使用 `chrome.storage.local`（非 `sync`），避免跨设备同步带来的隐私问题
- 卸载扩展时数据自动清除
- 数据量极小（< 1KB），不需要考虑配额问题

---

## 8. 交互陷阱与规避

### 8.1 陷阱：Toast 在用户切走后残留

**问题**：用户点击复制后立即 Cmd+Tab 切换到另一个应用。Toast 在无人看的页面上播放完动画。用户切回来时，可能看到 Toast 的退场尾巴或已经消失。

**规避**：这不是问题，而是正确的行为。Toast 的存在是为了**可能被看到**的即时反馈，不是**必须被看到**的重要通知。Alex 切走了说明他已经知道复制成功了（checkmark 变化是更快的反馈），Toast 自行退场是正确的。

**不要做**：不要在用户切回来时重新播放 Toast 或显示"刚才复制成功了"的提示。

### 8.2 陷阱：脉冲动画被误认为"出 bug 了"

**问题**：首次安装后的按钮脉冲可能让用户误以为界面出了问题。

**规避**：
- 脉冲幅度很小（最大 scale 1.15），不像"抖动/报错"
- 脉冲有明确的节奏感（均匀间隔），不像随机抖动
- Ring 扩散效果明确传达"注意这里"的意图
- 用户 hover 按钮时脉冲立即停止，恢复正常交互

### 8.3 陷阱：统计数字给用户压力

**问题**：展示"你用了 CtxPort 42 次"可能让某些用户感到"我是不是用太多了"或"我应该用更多"。

**规避**：
- 统计用积极的框架：不说"你复制了 42 次"，说"42 conversations copied"——强调产出而非行为频率
- 核心指标是"时间节省"而非"使用次数"——强调价值而非数量
- 统计区域在 Popup 中是次要元素（低对比度标题、较小字号），不是视觉焦点

### 8.4 陷阱：分享提示被误认为"又一个催评弹窗"

**问题**：即使我们的分享提示很克制，用户可能因为其他应用的"Rate this app"创伤而条件反射地反感。

**规避**：
- 提示只出现在 Popup 中（用户主动打开的空间），不是弹窗
- 文案以事实开头（"You've saved ~2.5 hours"），不以请求开头
- [Dismiss] 按钮视觉优先级等于甚至高于 [Leave a review]
- 点击 Dismiss 后永远消失，不会"过几天再问一次"

---

## 9. 与现有代码的对齐

### 9.1 当前已实现的部分

基于代码审查，以下微交互已在代码中实现：

| 微交互 | 文件 | 状态 |
|--------|------|------|
| 按钮 4 状态（idle/loading/success/error） | `copy-button.tsx` | 已实现 |
| Spring 缓动的 checkmark 弹入 | `copy-button.tsx:180-196` | 已实现 |
| Spinner 旋转动画 | `copy-button.tsx:152-177` | 已实现 |
| 按压缩放 scale(0.88) | `copy-button.tsx:103-104` | 已实现 |
| Hover 放大 scale(1.08) | `copy-button.tsx:105` | 已实现 |
| Toast 入场/退场动画 | `toast.tsx:195-210` | 已实现 |
| Toast 成功 2s / 错误 4s 自动消失 | `toast.tsx:164` | 已实现 |
| 暗色模式适配 | `toast.tsx:55-72` | 已实现 |
| 列表复制图标状态机 | `list-copy-icon.tsx` | 已实现 |
| Motion design tokens | `copy-button.tsx:7-16`, `toast.tsx:15-27` | 已实现 |

### 9.2 需要新增的部分

| 微交互 | 优先级 | 工作量估算 |
|--------|--------|-----------|
| 首次使用按钮脉冲动画 | P1 | 小 -- 新增 `discoveryPulseDone` flag + CSS 脉冲 |
| 首次 Toast 增强文案 | P1 | 小 -- `firstCopyDone` flag 判断 Toast 内容 |
| 第二次使用快捷键提示 | P2 | 小 -- `shortcutTipShown` flag 判断 |
| Popup 统计区域 | P1 | 中 -- 新增统计存储 + Popup UI 组件 |
| 里程碑分享提示 | P2 | 中 -- 里程碑检测逻辑 + Popup 提示组件 |
| Bundle 末尾品牌签名 | P1 | 小 -- 在 `serializeConversation` 中追加注释行 |
| "Share your stats" 复制功能 | P3 | 小 -- Popup 中的次要按钮 |
| 列表项背景闪烁（成功时） | P2 | 小 -- 列表项成功状态增加背景色变化 |
| 统计数字 countUp 动画 | P3 | 小 -- Popup 中的数字动画 |

---

## 10. 总结

CtxPort 的微交互策略可以用一句话概括：

> **在用户的外围视觉中传递"一切尽在掌控"的信号，在用户主动关注时提供有意义的累积价值感。**

具体来说：
- **Core Loop（每次复制）**：按压 -> spinner -> checkmark 弹入 -> Toast 信息 -> 安静退场。干净、快速、有信息量。
- **发现引导**：三次脉冲 + 两条一次性提示，然后永远退场。不教育，只提示。
- **价值累积**：Popup 中的统计数字随使用增长，用"时间节省"而非"使用次数"框定价值。
- **被动传播**：Bundle 中的 HTML 注释签名 + Popup 中的可选分享。永不弹窗催促。

这些设计让 Alex 在每次使用时感到"这工具懂我"——它不会烦我、不会浪费我的时间、但它在安静地帮我追踪价值。当他在 Dev 社区被问到"你怎么管理跨 AI 工具的上下文"时，他会自然地提到 CtxPort——不是因为被催促分享，而是因为产品真的好用。

---

*本文档由 Alan Cooper Goal-Directed Design 方法论驱动。所有微交互决策均以 "Alex 在 flow state 中使用 CtxPort 时是否会被打断" 为核心判断标准。*
