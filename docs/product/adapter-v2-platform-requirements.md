# Adapter V2 平台内容提取需求分析

> 版本：v1.0 | 日期：2026-02-07
> 角色：产品设计（Don Norman 设计哲学视角）
> 产品：CtxPort — AI 时代的剪贴板

---

## 0. 分析框架说明

本文档从**用户认知和使用场景**出发，分析 CtxPort 未来要适配的各类平台的内容提取需求。分析不关注"技术上能不能做"，而是关注"用户期望它怎么工作"。

核心问题：**当用户在某个平台上看到有价值的内容，想把它喂给 AI 时，他们的心智模型是什么？他们期望怎样的操作和结果？**

---

## 1. GitHub

### 1.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **分析 Issue** | "这个 Issue 的讨论很长，我想让 AI 帮我总结关键论点和结论" | 高 |
| **Review PR** | "这个 PR 有 50 个 comment，我想让 AI 帮我理解 reviewer 的核心关注点" | 高 |
| **理解代码** | "我想把这个文件的代码和它的 README 一起喂给 AI，让它帮我理解这个模块" | 中 |
| **迁移技术方案** | "Issue 里有人提出了一个很好的方案，我想让 AI 帮我在我的项目中落地" | 中 |
| **Debug 参考** | "这个 Issue 描述了和我一样的 bug，我想把它和我的错误日志一起给 AI" | 高 |

### 1.2 数据结构

GitHub 的内容本质上是**线程式对话**，但有几个关键特征使其与 AI 聊天不同：

- **Issue**：主贴 + 评论线程。评论之间是**扁平线性**的（没有嵌套回复），但有 reaction 和引用。
- **PR Discussion**：主贴 + 代码审查评论。代码审查评论是**按文件和代码行**组织的（代码行 -> 评论线程），这是一种独特的空间映射。
- **Code Review Comments**：附着在特定代码行上的评论，有 inline diff 上下文。PR 审查评论实际上是一个二维结构：文件 x 代码行 x 评论链。
- **README / 代码文件**：静态文档，不是对话。
- **Discussion**：类似论坛的分类讨论，支持嵌套回复和答案标记。

**心智模型关键点**：用户把 GitHub Issue 理解为"多人围绕一个问题的讨论"，而不是"一对一对话"。这和 AI 聊天的"我问 AI 答"模型有本质区别。

### 1.3 数据来源与认证

- **公开仓库**：数据可通过公开 API 或 DOM 获取，无需认证
- **私有仓库**：需要用户的 GitHub 登录态（cookie-session）
- **API 可用性**：GitHub 有完善的 REST API 和 GraphQL API，但浏览器扩展环境下更适合使用用户已有的 cookie 会话

### 1.4 参与者模型

- **角色多样**：Issue 作者、评论者、项目维护者、贡献者、机器人（CI bot、dependabot）
- **身份可见**：每个参与者有用户名、头像、角色标签（Owner、Member、Contributor）
- **机器人噪音**：CI 状态更新、自动标签机器人等会产生大量与讨论无关的评论

### 1.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| Issue 完整讨论 | 主贴 + 所有人类评论，过滤掉机器人噪音 | P0 |
| PR 审查评论 | 按文件分组的代码审查意见，保留代码上下文 | P0 |
| 单个代码文件 | 完整的源代码，保留文件路径和语言信息 | P1 |
| README | 项目说明文档，作为 AI 理解项目的背景 | P1 |
| Issue + 关联代码 | 把 Issue 讨论和被引用的代码片段打包在一起 | P2 |

### 1.6 UI 注入点

- **Issue 页面**：在 Issue 标题区域或右上角操作栏放置 "Copy as Context" 按钮
- **PR 页面**：在 PR 标题区域放置按钮，提供选项：复制完整 PR / 仅评论 / 仅代码变更
- **代码文件页面**：在文件头部（文件名旁边）放置复制按钮
- **出现时机**：页面加载完成后立即注入，不需要等待特定交互

### 1.7 输出格式期望

用户期望的输出格式：

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: GitHub Issue | Repo: owner/repo | Date: 2026-02-07 -->
<!-- URL: https://github.com/owner/repo/issues/123 -->

# [Bug] App crashes when clicking save button (#123)

## @author (Issue Author) — 2026-02-01
The app crashes with a TypeError when...

## @reviewer1 (Contributor) — 2026-02-02
I can reproduce this. The root cause seems to be...

## @maintainer (Owner) — 2026-02-03
Good catch. Let me look into the error handling in...

<!-- Bot comments filtered: 3 CI status updates removed -->
```

**关键设计决策**：
- 保留用户名和角色标签——多人讨论中"谁说的"很重要
- 自动过滤机器人评论，但在底部注明被过滤的数量（透明性原则）
- 保留时间线顺序——讨论的演进过程本身就是有价值的上下文

---

## 2. Gmail

### 2.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **总结邮件线程** | "这个邮件来回了 20 封，我想让 AI 帮我总结核心结论和待办" | 高 |
| **起草回复** | "我想让 AI 基于之前的邮件上下文帮我起草一封专业的回复" | 高 |
| **提取行动项** | "这封会议纪要邮件里提到了很多 action items，帮我提取出来" | 中 |
| **翻译沟通** | "这封外文邮件很长，我想让 AI 翻译并解释关键要点" | 中 |

### 2.2 数据结构

- **邮件线程（Thread）**：Gmail 的核心组织单元。一个 thread 包含多封相关邮件，按时间排序。
- **单封邮件（Message）**：有发件人、收件人、抄送、时间戳、主题、正文。正文可能是纯文本或 HTML。
- **引用（Quoted Text）**：回复邮件会包含之前邮件的引用文本，嵌套层级可能很深。
- **附件（Attachments）**：不在文本提取范围内，但用户可能期望至少看到附件的文件名列表。

**心智模型关键点**：邮件线程在用户心中是"一次关于某个主题的往来沟通"。它和 AI 聊天的相似之处在于有"你来我往"的结构，但参与者更多、每条消息更长、且有正式程度的差异。

### 2.3 数据来源与认证

- **DOM 抓取**：Gmail 的 DOM 结构高度动态化（React 单页应用），抓取难度极高
- **认证**：需要用户的 Google 登录态
- **隐私敏感度**：**极高**。邮件是最私密的沟通渠道之一，用户对任何接触邮件数据的工具都会高度警觉

### 2.4 参与者模型

- **角色**：发件人、收件人、抄送人
- **身份**：邮箱地址 + 显示名称
- **关系**：可能包含内部同事、外部客户、自动通知邮件

### 2.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| 完整邮件线程 | 整个来回过程，去除重复引用 | P0 |
| 单封邮件正文 | 清理后的纯文本内容 | P0 |
| 邮件元数据 | 发件人、时间、主题——作为上下文的结构化框架 | P1 |
| 附件文件名列表 | 知道有哪些附件（不需要内容） | P2 |

### 2.6 UI 注入点

- **邮件详情页**：在邮件工具栏（回复/转发/更多 旁边）添加 "Copy as Context" 按钮
- **线程视图**：在线程顶部添加按钮，一键复制整个线程
- **出现时机**：当用户打开一封邮件或线程时注入

### 2.7 输出格式期望

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: Gmail Thread | Subject: Q2 Marketing Plan | Date: 2026-02-07 -->

# Re: Q2 Marketing Plan

## From: alice@company.com — 2026-02-01 09:30
Hi team, here's my proposal for Q2...

## From: bob@company.com — 2026-02-01 14:15
Thanks Alice. I have a few suggestions...

## From: alice@company.com — 2026-02-02 10:00
Good points Bob. Updated version attached.
<!-- Attachment: Q2-plan-v2.pdf -->
```

**关键设计决策**：
- **去除引用冗余**：回复邮件中的引用文本必须去重，否则内容会严重膨胀
- **保留邮件结构**：每封邮件的发件人、时间、主题是 AI 理解沟通背景的关键元数据
- **附件仅记录文件名**：不提取附件内容，但让 AI 知道有附件存在
- **隐私提示**：首次使用时必须明确告知用户"此操作仅在本地处理，邮件内容不会上传"

### 2.8 特殊考量：信任门槛极高

Gmail 是 CtxPort 扩展到非 AI 平台后**信任挑战最大的场景**。邮件包含的敏感信息远超 AI 对话：

- 商业机密、客户信息、财务数据
- 个人隐私、健康信息
- 法律文件、合同条款

**Don Norman 视角**：如果用户需要犹豫"我敢不敢用这个按钮"，那就是设计失败。必须通过可供性设计让用户在点击前就确信数据是安全的——例如按钮文案用"Copy Locally"而非"Copy"，按钮旁显示一个小锁图标。

---

## 3. Stack Overflow

### 3.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **定制化方案** | "这个问题的高票回答很好但不完全适合我的情况，让 AI 帮我改编" | 高 |
| **对比方案** | "有 5 个回答各说各的，让 AI 帮我分析每个方案的优缺点" | 中 |
| **理解报错** | "我遇到了同样的错误，把问答给 AI 看，帮我在我的项目中排查" | 高 |
| **学习概念** | "这个概念的多个回答解释了不同方面，让 AI 给我一个综合性的解释" | 中 |

### 3.2 数据结构

- **问答线程**：一个问题 + 多个回答。这是一个**一对多**的结构（不是对话）。
- **回答排序**：按投票数排序（不是时间），高票回答 > 被采纳回答 > 低票回答。
- **评论**：问题和每个回答下都有评论线程，通常是补充说明或追问。
- **代码片段**：高度密集的代码内容，语言标记很重要。
- **标签（Tags）**：问题附带的技术标签（如 `javascript`, `react`, `typescript`），是理解技术上下文的关键。

**心智模型关键点**：用户把 Stack Overflow 理解为"一个问题的多个解答方案"。它不是对话，而是**知识的多角度呈现**。用户想要的是"把这些方案都给 AI，让 AI 帮我选最适合的"。

### 3.3 数据来源与认证

- **公开数据**：所有内容公开可访问，无需认证
- **DOM 结构**：Stack Overflow 的 DOM 相对稳定（传统服务端渲染）
- **API**：有公开 API，但有速率限制

### 3.4 参与者模型

- **角色**：提问者（Asker）、回答者（Answerer）、评论者（Commenter）
- **声望**：每个用户有声望值（reputation），是回答质量的信号
- **采纳标记**：提问者可以标记一个回答为"被采纳"（accepted answer）

### 3.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| 问题 + 所有回答 | 完整的问答内容，保留投票数和采纳标记 | P0 |
| 问题 + 高票回答 | 只要投票数超过一定阈值的回答 | P1 |
| 仅被采纳回答 | 最简洁的提取 | P1 |
| 包含评论 | 评论通常包含重要的补充和修正 | P2 |

### 3.6 UI 注入点

- **问题页面**：在问题标题旁边或投票按钮下方放置 "Copy as Context" 按钮
- **可选粒度**：按钮可能需要一个小下拉菜单，让用户选择"复制全部 / 仅高票 / 仅采纳"
- **出现时机**：页面加载完成后立即注入

### 3.7 输出格式期望

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: Stack Overflow | Tags: javascript, react, hooks | Date: 2026-02-07 -->
<!-- URL: https://stackoverflow.com/questions/12345678 -->

# How to properly use useEffect cleanup function?

## Question — @asker (Score: 45)
I'm trying to clean up a subscription in useEffect but...

```javascript
useEffect(() => {
  const sub = api.subscribe();
  return () => sub.unsubscribe();
}, []);
```

---

## Answer 1 (Accepted, Score: 128) — @expert_user
The issue is that your dependency array is empty...

```javascript
// Corrected version
useEffect(() => {
  // ...
}, [dependency]);
```

---

## Answer 2 (Score: 67) — @another_expert
An alternative approach using useRef...
```

**关键设计决策**：
- **保留投票数和采纳标记**——这是 AI 判断回答质量的关键信号
- **保留标签**——告诉 AI 这个问题的技术上下文
- **代码块必须完整保留**，包括语言标记
- 答案之间用分隔线区分，形成清晰的结构

---

## 4. Notion

### 4.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **基于知识库生成** | "把我的产品需求文档给 AI，让它帮我写技术方案" | 高 |
| **总结笔记** | "这个月的会议笔记太多了，让 AI 帮我提炼关键决策" | 中 |
| **扩展内容** | "我有一个大纲，让 AI 帮我扩展成完整文档" | 中 |
| **跨页面关联** | "把这三个相关的 Notion 页面打包给 AI，让它找出矛盾之处" | 中 |

### 4.2 数据结构

Notion 是所有目标平台中**数据结构最复杂**的：

- **页面（Page）**：由 Block 组成的树形结构。每个 Block 可以是段落、标题、列表、代码块、图片、表格、数据库视图等。
- **数据库（Database）**：结构化数据的集合，每条记录本身也是一个 Page。属性有多种类型（文本、选择、日期、关系等）。
- **嵌套子页面**：页面可以包含子页面，形成深层嵌套的树形结构。
- **关系（Relation）**：数据库记录之间可以有双向关系链接。
- **模板（Template）**：可复用的页面结构。

**心智模型关键点**：用户把 Notion 理解为"我的知识库"。他们想要的不是导出一个页面的文本，而是**把相关知识打包成 AI 能理解的结构**。这和复制一段对话有本质区别——Notion 内容是**用户自己创作的结构化知识**，不是与 AI 的对话记录。

### 4.3 数据来源与认证

- **需要认证**：几乎所有 Notion 内容都需要登录
- **DOM 复杂度**：Notion 的编辑器 DOM 极其复杂（Block 嵌套、虚拟化渲染）
- **API**：有官方 API，但需要 OAuth 或 Integration Token
- **最佳策略**：DOM 抓取（利用用户已登录状态），而非 API 调用

### 4.4 参与者模型

- **Notion 没有对话参与者**——内容是用户/团队创作的文档
- **协作者**：多人编辑的页面有编辑历史，但通常不需要区分"谁写了什么"
- **特殊情况**：Notion AI 对话嵌入页面中时，有类似 AI 聊天的 user/assistant 结构

### 4.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| 单个页面 | 完整的页面内容，保留标题层级和格式 | P0 |
| 数据库视图 | 当前视图的表格数据，以 Markdown 表格呈现 | P1 |
| 页面 + 子页面 | 递归提取子页面内容，保留层级关系 | P2 |
| 选中内容 | 只复制用户在页面中选中的部分 | P1 |

### 4.6 UI 注入点

- **页面顶部**：在页面标题旁的操作区域（分享、收藏旁边）放置按钮
- **右键菜单**：增强浏览器右键菜单，添加 "Copy Selection as Context" 选项
- **出现时机**：用户打开任何 Notion 页面时注入

### 4.7 输出格式期望

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: Notion Page | Date: 2026-02-07 -->
<!-- URL: https://www.notion.so/workspace/page-id -->

# Product Requirements Document

## Overview
This document describes...

## User Stories

### As a developer...

| Priority | Story | Status |
|----------|-------|--------|
| P0 | ... | Done |
| P1 | ... | In Progress |

## Technical Constraints
- Must support...
```

**关键设计决策**：
- **保留 Notion 的层级结构**——标题层级、嵌套列表、表格都是内容结构的关键部分
- **数据库视图转 Markdown 表格**——这是用户最直观理解的格式
- **不展开所有子页面**（除非用户明确要求）——避免内容过度膨胀
- Notion 的特殊 Block 类型（callout、toggle、quote）应转换为语义最接近的 Markdown 元素

---

## 5. Slack / Discord

### 5.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **总结讨论** | "这个频道今天讨论了一个架构决策，让 AI 帮我总结结论" | 高 |
| **提取决策** | "上周的 #engineering 频道有关于数据库迁移的讨论，提取决策点" | 中 |
| **线程整理** | "这个 thread 有 50 条回复，帮我整理出关键信息" | 高 |
| **跨频道汇总** | "把 #product 和 #engineering 的相关讨论打包给 AI 做可行性分析" | 低 |

### 5.2 数据结构

- **频道消息（Channel Messages）**：按时间排列的消息流，扁平结构
- **线程回复（Thread Replies）**：每条消息可以有子线程（类似评论），形成两层结构
- **Slack 特有**：Emoji reaction、@mention、Channel link、文件分享、代码片段（Snippet）、Canvas
- **Discord 特有**：类似但增加了服务器（Server）和角色（Role）层级
- **消息密度**：单条消息通常很短（1-3 句），信息密度低，需要大量消息才构成有意义的上下文

**心智模型关键点**：用户把 Slack/Discord 理解为"实时讨论的记录"。和 GitHub Issue 不同，Slack 讨论更碎片化、更非正式、噪音更多。用户需要的不是"完整记录"，而是"从噪音中提炼信号"。

### 5.3 数据来源与认证

- **需要认证**：所有内容需要用户的登录态
- **Slack**：DOM 抓取可行（Web 版），API 需要 workspace token
- **Discord**：类似，Web 版 DOM 抓取可行
- **隐私**：团队内部沟通内容，敏感度中等

### 5.4 参与者模型

- **角色**：消息发送者，带有用户名、头像、角色标签
- **机器人**：大量 bot 消息（CI 通知、Jira 更新、GitHub webhook），需要过滤或标记
- **反应（Reaction）**：Emoji 反应可以作为共识信号

### 5.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| 整个线程 | 完整的 thread 回复链 | P0 |
| 频道时间段 | 特定时间范围内的频道消息 | P1 |
| 选中消息 | 手动选择若干条消息打包 | P1 |
| 过滤 bot | 去除 bot 消息，只保留人类讨论 | P0 |

### 5.6 UI 注入点

- **Thread 视图**：在 thread 头部放置 "Copy Thread as Context" 按钮
- **频道视图**：在频道头部放置按钮，附带日期范围选择器
- **单条消息**：在消息的操作菜单（更多...）中添加 "Copy as Context" 选项
- **出现时机**：进入频道或打开 thread 时注入

### 5.7 输出格式期望

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: Slack Thread | Channel: #engineering | Date: 2026-02-07 -->

# Thread: Database migration strategy

## @alice (Engineering Lead) — 14:30
Should we go with a blue-green deployment for the DB migration?

## @bob (Backend) — 14:32
I think so. Main risk is the schema diff between old and new...

## @charlie (DBA) — 14:45
We need to handle the foreign key constraints carefully. Here's my suggested approach:

```sql
ALTER TABLE users ADD COLUMN new_field...
```

## @alice (Engineering Lead) — 15:10
Let's go with Charlie's approach. Action items:
1. Charlie writes migration script
2. Bob sets up staging environment
3. Review by Friday

<!-- Bot messages filtered: 4 CI notifications removed -->
```

**关键设计决策**：
- **保留用户名和角色**——团队讨论中"谁说的"是关键上下文
- **过滤 bot 消息**——默认过滤，但注明过滤数量
- **时间戳保留**——对话的时间间隔也是上下文（两小时后的回复和两分钟后的回复意味不同）
- **代码片段完整保留**——Slack 中的代码片段常常是讨论的核心

---

## 6. 技术文档站（MDN、技术博客、API Docs）

### 6.1 用户场景

| 场景 | 用户故事 | 频率 |
|------|----------|------|
| **API 参考** | "把这个 API 的文档给 AI，让它帮我写调用代码" | 高 |
| **概念学习** | "MDN 上这个 Web API 的说明很长，让 AI 给我一个简版解释" | 中 |
| **最新文档** | "AI 的训练数据可能过期了，把最新文档给它看" | 高 |
| **迁移指南** | "新版本的 breaking changes 文档给 AI，让它帮我检查我的代码" | 中 |
| **对比学习** | "把两个库的 API 文档都给 AI，让它帮我对比异同" | 低 |

### 6.2 数据结构

技术文档是所有目标平台中**结构最多样**的：

- **MDN**：标准化的参考文档，有固定的章节结构（语法、参数、返回值、示例、兼容性）
- **技术博客**：自由格式的文章，有标题、段落、代码示例、图片
- **API Docs（Swagger/OpenAPI）**：高度结构化的 endpoint 描述，有 HTTP 方法、参数、请求/响应示例
- **框架文档**：教程 + API 参考的混合体，常有导航结构（侧边栏目录）

**心智模型关键点**：用户把技术文档理解为"权威参考资料"。他们想用文档来"**纠正或补充 AI 的知识**"。这个心智模型和其他平台有根本区别——其他平台是"给 AI 看讨论/对话"，这里是"给 AI 看教科书"。

### 6.3 数据来源与认证

- **大多数公开**：MDN、技术博客、开源项目文档均公开
- **部分需认证**：内部 API 文档、付费内容
- **DOM 友好度**：变化极大——MDN 结构稳定清晰，某些文档站点使用重度 JS 渲染

### 6.4 参与者模型

- **无对话参与者**——文档是单一作者或团队的产出
- **不需要角色区分**

### 6.5 用户想提取什么

| 内容类型 | 用户期望 | 优先级 |
|----------|----------|--------|
| 完整页面 | 当前页面的全部内容，保留结构 | P0 |
| 选中内容 | 只复制用户选中的段落或代码 | P0 |
| 代码示例 | 提取页面中的所有代码示例 | P1 |
| API 签名 | 提取函数/方法的签名和参数说明 | P1 |
| 多页面打包 | 一个功能的多个相关文档页面合并 | P2 |

### 6.6 UI 注入点

- **页面级按钮**：在页面顶部或浮动工具栏中放置 "Copy as Context" 按钮
- **选中内容浮动按钮**：用户选中文本时弹出浮动按钮（类似 Medium 的高亮分享功能）
- **右键菜单**：增强右键菜单添加 "Copy Selection as Context" 选项
- **出现时机**：页面加载完成后注入浮动按钮；选中文本时显示浮动按钮

### 6.7 输出格式期望

```markdown
<!-- CtxPort Context Bundle -->
<!-- Source: MDN Web Docs | Date: 2026-02-07 -->
<!-- URL: https://developer.mozilla.org/en-US/docs/Web/API/Fetch -->

# Fetch API

## Syntax

```javascript
fetch(resource, options)
```

## Parameters

- **resource**: The resource to fetch (URL string or Request object)
- **options**: An object containing custom settings...

## Return Value

A Promise that resolves to a Response object.

## Examples

```javascript
const response = await fetch('https://api.example.com/data');
const json = await response.json();
```
```

**关键设计决策**：
- **保留文档结构**——标题层级、参数列表、代码示例的结构就是文档的价值
- **保留代码语言标记**——AI 需要知道代码是什么语言
- **Source URL 必须保留**——用户可能需要回溯到原始文档
- **文档版本信息**（如果可用）应包含在元数据中——因为 API 文档有版本差异

---

## 7. 跨平台认知分析

### 7.1 心智模型的共同点

在所有分析的平台上，用户的核心心智模型是一致的：

**"我看到了有价值的内容 -> 我想把它喂给 AI -> AI 应该理解这个上下文"**

这个三步心智模型是 CtxPort 统一操作的基础。不管内容来自 GitHub Issue、Gmail 邮件还是 MDN 文档，用户的认知过程是相同的。

### 7.2 心智模型的差异

| 维度 | AI 聊天（ChatGPT/Claude） | 多人讨论（GitHub/Slack） | 结构化知识（Notion/Docs） | 问答平台（Stack Overflow） |
|------|---------------------------|--------------------------|---------------------------|---------------------------|
| **内容本质** | 我和 AI 的对话 | 多人参与的讨论 | 我/团队创作的文档 | 社区贡献的解答 |
| **参与者** | 我 + AI（二元） | 多人 + Bot（N元） | 无参与者（文档） | 提问者 + 多个回答者 |
| **复制目的** | 迁移到另一个 AI | 让 AI 理解讨论背景 | 让 AI 基于知识生成 | 让 AI 定制化解答 |
| **格式期望** | 角色标记的对话 | 多人时间线 | 保留文档结构 | 问题-答案结构 |
| **完整性期望** | 要完整对话 | 可以只要关键片段 | 要完整页面 | 要问题+最佳回答 |
| **隐私敏感度** | 中 | 中-高（团队讨论） | 中-高（内部文档） | 低（公开内容） |

### 7.3 "Copy as Context Bundle" 是否是统一的正确交互？

**结论：核心操作统一，但需要平台级的适配。**

统一的部分：
- **触发方式**统一——都是一个"Copy"按钮
- **输出格式**统一——都是 Markdown Context Bundle
- **元数据框架**统一——都有 Source、URL、Date 等 meta
- **本地处理**统一——所有平台都不上传数据

需要适配的部分：
- **粒度选择**不同——AI 聊天是"整个对话"，Stack Overflow 可能是"问题+选定回答"，Slack 可能是"一个 thread"或"一段时间"
- **参与者呈现**不同——AI 聊天用 User/Assistant，GitHub 用 @username (Role)，文档无参与者
- **默认过滤规则**不同——Slack 默认过滤 bot，GitHub 默认过滤 CI bot，文档不需要过滤

### 7.4 角色模型的统一与分类

分析所有平台后，参与者角色可以归纳为以下几类：

| 角色类别 | 出现平台 | Markdown 呈现 |
|----------|----------|---------------|
| **用户自己**（User） | AI 聊天 | `## User` |
| **AI 助手**（Assistant） | AI 聊天 | `## Assistant` |
| **具名人类**（Named Person） | GitHub, Gmail, Slack, SO | `## @username (Role)` |
| **自动化机器人**（Bot） | GitHub, Slack | 默认过滤，或 `## bot-name [Bot]` |
| **文档作者**（Author） | Notion, Docs | 通常省略，内容即权威 |

### 7.5 输出格式：Markdown 够用吗？

**Markdown 作为 Context Bundle 的基础格式是正确的**，理由如下：

1. **AI 友好**：所有主流 AI 模型都能良好理解 Markdown
2. **人类可读**：用户可以在复制前检查和编辑内容
3. **通用性强**：无需额外解析器，直接粘贴即用
4. **结构足够**：标题层级、代码块、表格、列表足以表达所有平台的内容结构

但有两个场景需要特殊处理：

- **代码**：必须保留语言标记（````javascript`）和完整缩进。Markdown 的 fenced code block 完美支持这一点。
- **表格数据**（Notion 数据库、API 参数列表）：Markdown 表格对宽表格不友好，但作为 AI 输入足够——AI 能理解 Markdown 表格的语义。

---

## 8. 平台优先级建议

基于用户价值、实现复杂度和战略意义的综合评估：

| 优先级 | 平台 | 理由 |
|--------|------|------|
| **Phase 1（MVP 后第一批）** | Stack Overflow | 公开数据、DOM 稳定、开发者高频使用、复制代码到 AI 是最自然的场景 |
| **Phase 1** | GitHub Issues | 开发者核心工具、数据结构清晰、和 CtxPort 目标用户高度重叠 |
| **Phase 2** | 技术文档站（MDN 等） | 公开数据、"给 AI 补最新知识"是强需求、但站点多样性增加适配成本 |
| **Phase 2** | GitHub PR Reviews | 在 Issue 基础上扩展，但 PR 审查的二维结构（文件 x 评论）增加复杂度 |
| **Phase 3** | Notion | 用户价值高，但 DOM 极其复杂，且需要认证 |
| **Phase 3** | Slack / Discord | 用户价值高，但消息碎片化处理复杂，且隐私敏感度中等 |
| **Phase 4** | Gmail | 用户价值高，但隐私敏感度极高、DOM 复杂度极高、信任门槛最高 |

### 优先级决策逻辑

1. **先公开后私密**——公开数据的平台优先，降低隐私争议风险
2. **先开发者后通用**——与 CtxPort 核心用户（开发者）最相关的平台优先
3. **先稳定后复杂**——DOM 结构稳定、数据模型简单的平台优先
4. **先验证后扩展**——每个 Phase 验证用户反馈后再推进下一批

---

## 9. 对 Adapter V2 架构的产品需求

基于以上分析，新的 Adapter 架构需要支持以下产品层面的能力：

### 9.1 内容模型扩展

当前的 `Message` 模型假设了 user/assistant 二元对话结构。新平台需要：

- **多参与者模型**：支持具名参与者（@username + 角色标签），不仅仅是 user/assistant
- **非对话内容**：文档（Notion、MDN）没有"对话"结构，需要支持"文档"内容类型
- **嵌套结构**：GitHub PR 审查按文件分组的评论、Stack Overflow 回答下的评论线程

### 9.2 元数据扩展

当前的 `SourceMeta` 和 `BundleMeta` 以 AI 聊天为中心设计。新平台需要：

- **平台特有元数据**：GitHub 的 repo、issue number；Stack Overflow 的 tags、vote count；Gmail 的 thread subject
- **参与者列表**：记录参与者信息（用户名、角色），而不仅仅是 provider
- **内容统计**：除了 message count，还需要 word count、code block count 等

### 9.3 过滤与粒度控制

- **可配置的默认过滤**：每个平台有不同的默认过滤规则（GitHub 过滤 CI bot、Slack 过滤 bot 消息）
- **用户选择粒度**：Stack Overflow 可以选"所有回答 / 高票回答 / 仅采纳"；Slack 可以选"整个 thread / 时间范围"

### 9.4 安全与信任

- **隐私分级**：不同平台的内容有不同的隐私敏感度，UI 提示应反映这一点
- **本地处理保证**：所有新平台适配器必须和 ChatGPT/Claude 一样，100% 本地处理

---

## 10. 总结

CtxPort 从 AI 聊天扩展到通用网站内容提取，本质上是在回答一个更大的问题：

**在 AI 时代，用户如何把散落在各处的知识和讨论，无摩擦地喂给 AI？**

当前 MVP 验证的是 AI 聊天场景。未来的扩展应遵循以下原则：

1. **保持操作的一致性**——用户只需要学习一个动作："看到有价值的内容 -> 点击 Copy as Context"
2. **适配输出的多样性**——不同平台的内容结构不同，输出格式应尊重内容的原始结构
3. **渐进式信任构建**——先做公开平台（Stack Overflow、GitHub），建立信任后再进入私密平台（Gmail、Slack）
4. **永远本地处理**——这不是功能特性，这是产品的宪法

> "Design is not just what it looks like and feels like. Design is how it works."
>
> CtxPort 的设计哲学：让用户忘记"上下文迁移"这件事的存在——因为它已经变得如呼吸般自然。

---

*文档维护者：产品设计（Don Norman 视角）*
*最后更新：2026-02-07*
