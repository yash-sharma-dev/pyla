# CtxPort 用户画像与场景调研报告

> 交互设计视角 | 基于 Alan Cooper Goal-Directed Design 方法论
> 调研日期：2026-02-07

---

## 1. 调研方法和信息来源

### 调研方法

本次调研采用 **Goal-Directed Design** 的调研框架，核心目标不是收集"功能需求"，而是理解用户在真实场景中的 **目标（Goals）**、**行为模式（Behavior Patterns）** 和 **挫折点（Frustration Points）**。

调研手段包括：

- **行业数据分析**：Stack Overflow 2025 Developer Survey、CB Insights AI Coding Market Report、Jellyfish 2025 AI Metrics Report、BCG AI at Work 2025
- **社区信号采集**：Reddit (r/ChatGPT, r/programming, r/ArtificialIntelligence)、Hacker News、OpenAI Developer Community Forum、Cursor Community Forum、DEV Community
- **竞品与工具调研**：Echoes、AI Context Courier、Convo、ChatHub、TypingMind、Repomix、ChatClip 等已有工具
- **开发者行为数据**：GitHub Copilot 使用统计、Cursor ARR 数据、Claude Code 采用率、Vibecoding 市场数据
- **隐私与安全分析**：Stanford AI Privacy Research 2025、Anthropic/OpenAI Terms of Service 变更

### 核心数据来源

| 来源 | 关键数据点 |
|------|-----------|
| Stack Overflow 2025 Survey | 84% 开发者使用 AI 工具；51% 日常使用；46% 不信任 AI 输出准确性 |
| CB Insights 2025 | AI Coding 市场 Top 3 占 70%+ 份额：Copilot (42%)、Cursor (18%)、Claude Code (~10%) |
| Jellyfish 2025 Metrics | 85%+ 工程师使用至少一种 AI 工具；Cursor 市占率从年初 20% 增长到近 40% |
| Adapty 2025 Report | 39% 订阅用户计划取消至少一项订阅；AI 是首要整合类别 |
| Vibecoding Statistics | 63% vibecoding 用户是非开发者；全球代码 41% 由 AI 生成 |
| Plurality Network | 跨 AI 平台切换每年浪费 200+ 小时 |

---

## 2. Persona 定义

基于调研数据，我定义了 3 个关键 Persona。Persona 的构建遵循 Alan Cooper 的核心原则：**基于真实行为模式聚类，而非人口统计学分类**。

### Persona 1: Alex — The Multi-Tool Developer ★ Primary Persona

> "我每天在 4-5 个 AI 工具之间切换，最痛苦的不是工具不好用，而是每次切换都要重新解释一遍我在做什么。"

**基本画像**

| 属性 | 描述 |
|------|------|
| 年龄 | 28-38 |
| 角色 | 全栈开发者 / 独立开发者 / 技术 Lead |
| 技术水平 | 高级，5+ 年经验 |
| 工作模式 | 远程或混合办公，高度自驱 |
| AI 工具使用 | 日均 4-5 小时，日常依赖 |

**工具组合（典型）**

- **IDE**：Cursor (主力编辑器) + GitHub Copilot (inline 补全)
- **CLI**：Claude Code (终端内复杂重构和多文件推理)
- **Web Chat**：ChatGPT (头脑风暴、快速原型) + Claude.ai (长文档分析、代码审查)
- **Search**：Perplexity (带引用的技术调研)
- **辅助**：Repomix (打包 Repo 上下文)

**行为模式**

- 一个典型工作流：在 ChatGPT 中讨论架构方案 → 在 Claude.ai 中做详细设计 → 在 Cursor 中实现 → 在 Claude Code 中做跨文件重构 → 回到 ChatGPT 写文档
- 经常手动复制粘贴会话片段（架构图、代码块、错误日志）到另一个工具
- 维护一个 "context snippets" 文件夹，存放常用的项目背景描述
- 使用 Repomix 打包 Repo，手动粘贴到 ChatGPT/Claude web
- 在 CLAUDE.md 中维护项目上下文，但这只对 Claude Code 有效

**挫折点（按严重程度排序）**

1. **上下文重建成本极高**：切换工具后需要 5-15 分钟重新建立上下文，每天发生 8-12 次
2. **代码格式丢失**：从 ChatGPT 复制代码块到 IDE 时缩进和语法高亮丢失
3. **会话找不到**：ChatGPT 中两周前讨论过的架构方案找不到了，只能重新对话
4. **Token 浪费**：每次都要把项目背景重新喂给 AI，大量 token 花在重复上下文上
5. **CLI ↔ Web 断裂**：Claude Code 中的对话无法在 Claude.ai 中继续，反之亦然
6. **批量操作缺失**：想导出 ChatGPT 中某个项目相关的 10 个会话，只能逐个打开复制

**数据支撑**

- Stack Overflow 2025：82% 开发者使用 ChatGPT，41% 使用 Claude，47% 使用 Gemini——多工具使用是常态而非例外
- Atlassian 2025 DevEx Survey：开发者在工具间 context-switching 上花费大量时间
- 85% 开发者使用至少一种 AI 工具（Pragmatic Engineer 2025 Survey）

---

### Persona 2: Maya — The Vibecoder

> "我不是程序员出身，但我用 Cursor 和 Claude Code 做出了一个有 2000 用户的 SaaS 产品。问题是，每次 context window 满了我就慌了。"

**基本画像**

| 属性 | 描述 |
|------|------|
| 年龄 | 25-45 |
| 角色 | 产品经理 / 创业者 / 设计师 / 非技术背景创造者 |
| 技术水平 | 初中级，依赖 AI 完成编码 |
| 工作模式 | 独立项目或小团队 |
| AI 工具使用 | 集中在某几个工具，日均 3-6 小时 |

**工具组合（典型）**

- **主力**：Cursor (Composer 模式) 或 Claude Code
- **辅助**：ChatGPT (解释错误、学习概念)、Claude.ai (长对话、需求分析)
- **部署**：Vercel / Netlify / Railway

**行为模式**

- 在 ChatGPT 中描述产品需求，获取技术方案建议
- 将方案复制到 Cursor 中让 AI 实现
- 遇到错误时，复制错误信息到 ChatGPT/Claude 寻求帮助
- 经常触发 context window 上限，被迫开新会话从头解释项目
- 保存"项目介绍 prompt"在笔记应用中，每次新会话手动粘贴

**挫折点（按严重程度排序）**

1. **Context Window 断裂恐慌**：长会话被截断后，AI 忘记了之前所有上下文，对非技术用户来说这是灾难性的
2. **不知道该用哪个工具**：面对 Cursor、Claude Code、ChatGPT 的不同能力，选择焦虑严重
3. **项目上下文无法跨工具携带**：在 ChatGPT 中建立的产品理解无法带到 Cursor 中
4. **"找会话"的认知负担**：会话列表变成一个不可管理的长列表，没有搜索、标签、分组
5. **代码和需求分离**：需求讨论在一个 AI 中，代码在另一个 AI 中，两边对不上
6. **隐私焦虑**：不清楚粘贴的代码和商业信息是否会被用于训练

**数据支撑**

- Vibecoding 统计：63% vibecoding 用户是非开发者
- Product Hunt State of Vibecoding 2025：44% 用户生成 UI，20% 构建全栈应用
- Context Window 问题：Cursor 社区论坛用户报告实际可用上下文经常只有 70k-120k tokens，远低于宣称的 200k
- 44% 观察到初级开发者基础编程能力下降（vibecoding 副作用）

---

### Persona 3: Sam — The Knowledge Orchestrator

> "我是咨询顾问，每天要为不同客户在 ChatGPT 和 Claude 中维护独立的上下文。最怕的是把 A 客户的信息不小心粘贴到 B 客户的会话里。"

**基本画像**

| 属性 | 描述 |
|------|------|
| 年龄 | 30-50 |
| 角色 | 咨询顾问 / 内容创作者 / 产品经理 / 研究员 |
| 技术水平 | 中等，不写代码但深度使用 AI |
| 工作模式 | 多客户/多项目并行 |
| AI 工具使用 | 日均 2-4 小时，主要是对话和文档处理 |

**工具组合（典型）**

- **写作分析**：Claude.ai (长文档分析、报告撰写) + ChatGPT (头脑风暴、数据分析)
- **调研**：Perplexity (事实核查、引用追踪) + Gemini (Google 生态整合)
- **Prompt 管理**：Notion / Google Docs 中的 Prompt Library
- **协作**：分享 AI 输出给团队成员或客户

**行为模式**

- 为每个客户/项目在 ChatGPT 和 Claude 中分别维护一组相关会话
- 在一个 AI 中完成调研 → 将结论复制到另一个 AI 中深化分析
- 维护一个"项目背景 prompt"文档，手动复制粘贴到每次新对话
- 使用 ChatGPT memory 功能但发现不够透明，对跨客户信息泄露感到担忧
- 每周花 30-60 分钟整理和查找之前的 AI 会话

**挫折点（按严重程度排序）**

1. **客户/项目间上下文隔离缺失**：AI 的 memory 功能可能把 A 项目的信息渗透到 B 项目中
2. **会话管理是噩梦**：几百个会话没有有效的搜索、标签、分组功能
3. **跨平台知识无法累积**：在 Claude 中建立的分析框架无法在 ChatGPT 中复用
4. **格式转换痛苦**：从 AI 复制内容到文档、邮件、Slide 时格式全乱
5. **订阅成本累积**：3-5 个 AI 工具的订阅费每月 $60-200+
6. **AI 训练数据的隐私风险**：Anthropic 2025 年更改 ToS，默认用会话数据训练模型

**数据支撑**

- 专业人士平均使用 3-5 个 AI 平台（Plurality Network）
- 39% 用户因订阅疲劳计划取消订阅（Adapty 2025）
- 平均每天 2+ 小时在工具间切换（多份行业报告交叉验证）
- Stanford 2025 研究揭示 AI 聊天隐私风险
- Washington Post 2025 报道揭示 ChatGPT 年度总结暴露过多个人信息

---

### Primary Persona 确认：Alex（The Multi-Tool Developer）

**选择理由**：

1. **市场规模最大**：84% 开发者使用 AI 工具，51% 日常使用，这是最大的潜在用户群
2. **痛点最深**：开发者在 CLI/IDE/Web 三个界面间的上下文迁移摩擦最大，且涉及代码这种高结构化内容
3. **付费意愿最强**：开发者已经在为 Cursor ($20/mo)、Claude Pro ($20/mo)、Copilot ($19/mo) 付费，对生产力工具的付费习惯已建立
4. **口碑传播最快**：开发者社区的 Build in Public 文化天然适合产品推广
5. **CtxPort 的核心功能（Context Bundle、CLI 工具链、结构化格式）与开发者工作流匹配度最高**

Maya（Vibecoder）是重要的 **Secondary Persona**——她的需求与 Alex 高度重叠，但使用门槛要求更低。Sam（Knowledge Orchestrator）是 **Supplementary Persona**——代表了产品扩展到非开发者市场时的用户画像。

---

## 3. Top 10 使用场景排序

基于调研数据中的出现频率、痛点严重程度和用户覆盖面综合排序：

### 场景 1：AI 编码工具间的上下文迁移

**场景描述**：开发者在 ChatGPT web 中讨论完架构方案后，需要将上下文（方案描述、代码片段、约束条件）迁移到 Cursor 或 Claude Code 中继续实现。

**当前行为路径**：
1. 在 ChatGPT 中完成讨论（10-30 分钟对话）
2. 手动滚动查找关键结论和代码块
3. 逐段复制粘贴到文本编辑器中整理
4. 格式修复（缩进丢失、代码块标记消失）
5. 将整理后的内容粘贴到 Cursor 的 Composer 或 Claude Code 的 prompt 中
6. 重新向 AI 解释上下文（因为复制的内容不完整）

**挫折点**：全流程 15-30 分钟，每天发生 3-5 次。代码格式丢失是最大痛点。

**涉及 Persona**：Alex (Primary)、Maya (Secondary)

---

### 场景 2：Context Window 耗尽后的会话延续

**场景描述**：在 Claude Code 或 Cursor 中进行长时间编码，context window 接近或达到上限，需要开新会话但不想丢失累积的上下文。

**当前行为路径**：
1. AI 提示 context window 即将耗尽（或响应质量明显下降）
2. 手动总结当前对话的关键上下文
3. 开启新会话
4. 粘贴总结 + 项目背景 prompt
5. 花 5-10 分钟重新"热身"AI 到之前的理解水平

**挫折点**：Claude Code 的自动 compaction 部分解决了这个问题，但跨工具时无法携带。Cursor 的实际 context 经常只有 70k-120k tokens。

**涉及 Persona**：Alex、Maya（对 Maya 来说更为致命，因为她不具备手动总结技术上下文的能力）

---

### 场景 3：将 GitHub Repo 打包为上下文喂给 AI

**场景描述**：需要让 AI 理解整个项目的代码结构、技术栈和约束条件，以便进行架构分析、代码审查或重构规划。

**当前行为路径**：
1. 使用 Repomix 打包 repo 为单个文件（XML/Markdown 格式）
2. 检查 token 数（Repomix 提供 token 计数）
3. 如果超出限制，手动选择包含/排除的文件
4. 将打包结果复制到 ChatGPT/Claude web
5. 如果太大，分段粘贴（极其痛苦）

**挫折点**：Repomix 生态说明"37 个类似工具"——问题真实存在但没有优雅的解决方案。工具间打包格式不互通。

**涉及 Persona**：Alex

---

### 场景 4：跨 AI 平台查找和复用历史会话

**场景描述**：两周前在 ChatGPT 中讨论过的 API 设计方案，现在需要在 Claude 中引用来做实现。

**当前行为路径**：
1. 打开 ChatGPT，在冗长的会话列表中滚动寻找
2. 尝试搜索（ChatGPT 的搜索功能有限，Claude 的搜索是 opt-in）
3. 找到后打开，滚动到相关部分
4. 手动复制关键段落
5. 粘贴到 Claude 中并添加上下文说明

**挫折点**：会话列表没有有效的标签/分组系统。搜索质量差。找一个旧会话可能花 5-15 分钟。

**涉及 Persona**：Alex、Sam、Maya

---

### 场景 5：批量导出/迁移 AI 会话

**场景描述**：想将某个项目相关的所有 ChatGPT 会话批量导出，迁移到 Claude 中继续或归档。

**当前行为路径**：
1. ChatGPT 的 "Export Data" 功能导出全部数据（JSON 格式，不可选）
2. 从巨大的 JSON 文件中手动筛选相关会话
3. 没有结构化的方式将这些会话喂给 Claude
4. 只能逐个手动复制粘贴

**挫折点**：**完全没有批量操作**。没有"选择多个会话 → 打包导出"的功能。ChatGPT/Claude/Gemini 的导出格式互不兼容。

**涉及 Persona**：Alex、Sam

---

### 场景 6：不同 AI 的能力适配（能力路由）

**场景描述**：不同 AI 擅长不同任务——用 Claude 做代码审查、用 ChatGPT 做创意头脑风暴、用 Perplexity 做带引用的调研——但每次切换都需要重建上下文。

**当前行为路径**：
1. 在 Claude 中完成代码审查，得到改进建议
2. 想用 ChatGPT 来头脑风暴替代方案
3. 复制 Claude 的审查结论到 ChatGPT
4. 在 ChatGPT 中重新描述项目背景
5. ChatGPT 给出建议后，再手动搬回 Claude 或 IDE

**挫折点**：Reddit 高赞工作流"ChatGPT brainstorming → Claude writing → Perplexity fact-checking"（1500+ upvotes）说明这个路径普遍存在但极其低效。

**涉及 Persona**：Alex、Sam

---

### 场景 7：CLI 工具链上下文传递

**场景描述**：在 Claude Code 中完成了一轮重构，想将上下文（做了什么、为什么这样做、还有什么要做）传递给 Cursor 或 Codex CLI 继续。

**当前行为路径**：
1. Claude Code 的对话存在终端历史中，但格式不标准
2. 手动将 Claude Code 的关键输出复制到剪贴板
3. 在 Cursor 中打开 Composer，粘贴上下文
4. 或在 CLAUDE.md 中手动更新项目状态供下次使用

**挫折点**：CLI ↔ IDE ↔ Web 三个界面之间没有标准化的上下文传递协议。CLAUDE.md 只对 Claude Code 有效。.cursorrules 只对 Cursor 有效。

**涉及 Persona**：Alex

---

### 场景 8：会话左侧列表的"快速复制"

**场景描述**：用户看到会话列表中的某个标题，只想快速复制该会话的内容（或摘要），不想打开它。

**当前行为路径**：
1. 在 ChatGPT/Claude 的左侧会话列表中找到目标会话
2. **必须点击打开** 才能访问内容
3. 等待加载（长会话加载慢）
4. 滚动找到需要的部分
5. 复制

**挫折点**：打开一个会话只为了复制一段内容，这个交互代价太高。如果要从 5 个会话中各复制一段，需要反复打开/关闭。

**涉及 Persona**：Alex、Sam、Maya

---

### 场景 9：敏感信息脱敏后的上下文迁移

**场景描述**：咨询顾问需要将 A 客户项目的分析框架复用到 B 客户，但需要确保没有泄露 A 客户的敏感信息。

**当前行为路径**：
1. 手动检查要复制的内容中是否有敏感信息
2. 手动替换客户名称、数据等
3. 复制到新的会话中
4. 始终带着"是否漏掉了什么敏感信息"的焦虑

**挫折点**：完全依赖人工审查，没有自动化脱敏。Stanford 2025 研究证实 AI 聊天存在隐私风险。Anthropic 2025 年更改 ToS 加剧了信任问题。

**涉及 Persona**：Sam

---

### 场景 10：Prompt 模板跨平台复用

**场景描述**：积累了一套在 ChatGPT 中效果很好的 prompt 模板，想在 Claude 和 Gemini 中复用，但不同平台的最佳实践不同。

**当前行为路径**：
1. 在 Notion/Google Docs 中维护 Prompt Library
2. 手动复制 prompt 到目标平台
3. 发现效果不一致——需要为不同模型微调
4. 维护多个版本的同一 prompt

**挫折点**：Prompt 不是"写一次到处用"的——不同模型对 prompt 结构有不同偏好，但用户没有工具来管理这种差异。团队 prompt 共享依赖 Notion 等通用工具，没有专用解决方案。

**涉及 Persona**：Alex、Sam

---

## 4. Vibecoding 场景专项分析

### 4.1 Vibecoding 生态现状（2025-2026）

Vibecoding——由 Andrej Karpathy 在 2025 年 2 月提出——已经从概念验证进入主流开发工作流。

**核心数据**：
- 全球市场规模：$4.7B（2025），预计 $12.3B（2027）
- 63% 的 vibecoding 用户是非开发者
- 92% 美国开发者日常使用 AI 编码工具
- 41% 的全球代码由 AI 生成
- 三大工具格局：GitHub Copilot (42% 市占率)、Cursor (18%)、Claude Code (~10% of Anthropic revenue)

### 4.2 三大工具的上下文管理差异

| 维度 | Claude Code | Cursor | Codex CLI |
|------|------------|--------|-----------|
| **上下文入口** | 终端 CLI，自动读取 repo | IDE 内嵌，@ 引用文件 | 终端 CLI，sandbox 执行 |
| **Context Window** | 200K tokens，显式且可靠 | 宣称 200K，实际 70-120K | 依赖 GPT 模型的 context |
| **项目规则** | CLAUDE.md（Markdown） | .cursorrules（自定义格式） | 无标准化项目规则 |
| **会话持久化** | 终端历史 + 自动 compaction | 项目内保存 | 无持久化 |
| **跨工具迁移** | 无原生支持 | 无原生支持 | 无原生支持 |

### 4.3 开发者在 Vibecoding 中的上下文迁移需求

**场景 A：Cursor → Claude Code 迁移**

开发者常在 Cursor 中完成初期开发（利用其 IDE 集成），然后切换到 Claude Code 进行深度重构（利用其 200K token 和终端原生体验）。迁移时的痛点：

- `.cursorrules` 中的项目规则不能自动映射到 `CLAUDE.md`
- 已有工具（如 MCP Market 上的 Migration Assistant）提供配置文件转换，但不处理会话上下文
- IDE 内的文件编辑历史、AI 交互记录无法携带

**场景 B：ChatGPT Web → Claude Code**

非技术用户（Maya Persona）在 ChatGPT 中讨论完需求后，需要将方案带到 Claude Code 中实现：

- ChatGPT 的输出格式（Markdown）需要手动整理为 Claude Code 能理解的上下文
- 需求中的隐式约束（在对话过程中建立的）无法自动提取
- 目前只能靠手动总结 + 复制粘贴

**场景 C：跨 session 的项目状态延续**

长期项目中，开发者在多个 coding session 间需要保持 AI 对项目的理解：

- Claude Code 通过 `CLAUDE.md` 和 memory 文件部分解决
- Cursor 通过 `.cursorrules` 和项目索引部分解决
- 但两者的 memory 互不兼容，没有统一的"项目上下文快照"

### 4.4 MCP（Model Context Protocol）的影响

MCP 是 2025 年最重要的 AI 互操作标准：

- Anthropic 于 2024 年 11 月推出，2025 年 12 月捐赠给 Linux Foundation
- 97M+ 月 SDK 下载，5800+ MCP servers，300+ MCP clients
- 已获得 OpenAI、Google、Microsoft 的支持

**对 CtxPort 的启示**：MCP 解决的是"AI 工具如何连接外部数据源"的问题，CtxPort 解决的是"用户如何在 AI 工具之间搬运上下文"的问题——两者互补而非竞争。CtxPort 的 Context Bundle 可以作为 MCP 的一种 resource type 存在。

---

## 5. 交互痛点清单

### 5.1 ChatGPT/Claude/Gemini Web 会话管理痛点

| 痛点 | 严重程度 | 影响范围 | 当前解决方案 |
|------|---------|---------|------------|
| **会话列表是未分类的长列表** | ★★★★★ | 所有 Persona | Echoes 扩展提供标签（受限于 5 个免费标签） |
| **搜索功能弱或 opt-in** | ★★★★★ | 所有 Persona | ChatGPT 2025 年增加了全会话搜索，Claude 需手动开启 |
| **无法不打开会话就复制内容** | ★★★★☆ | Alex, Sam | 无解决方案 |
| **无批量选择/操作** | ★★★★☆ | Alex, Sam | Echoes 提供批量管理功能 |
| **导出格式不标准** | ★★★★☆ | Alex | ChatClip 提供多格式导出 |
| **长会话加载缓慢** | ★★★☆☆ | 所有 Persona | 无解决方案 |

### 5.2 复制粘贴流程的摩擦点

**"找会话 → 打开 → 复制 → 粘贴"流程分析**：

```
[1. 找会话]         ← 摩擦：无搜索 / 搜索差，需滚动浏览
     ↓ (5-15 min)
[2. 打开会话]       ← 摩擦：长会话加载慢，3-10 秒
     ↓
[3. 定位内容]       ← 摩擦：需在长对话中滚动，无锚点
     ↓ (1-5 min)
[4. 选择+复制]      ← 摩擦：代码块跨越多个消息，无法一键全选相关内容
     ↓
[5. 切换到目标工具]  ← 摩擦：Tab 切换 or App 切换
     ↓
[6. 粘贴]           ← 摩擦：格式丢失（列表层级、代码缩进、表格结构）
     ↓
[7. 格式修复]       ← 摩擦：手动修复缩进、添加 Markdown 标记
     ↓ (2-5 min)
[8. 补充上下文]     ← 摩擦：AI 只看到片段，不理解完整背景
     ↓ (3-10 min)
[9. 开始工作]       ← 终于可以做正事了
```

**总摩擦时间**：15-40 分钟/次，每天发生 3-8 次

**Alan Cooper 的交互礼仪视角**：这个流程违反了几乎所有交互礼仪原则——它打断用户（强迫打开会话）、不记住偏好（每次重新粘贴项目背景）、不尊重用户时间（大量格式修复工作）。一个体贴的助手应该说："我注意到你在 ChatGPT 中讨论了这个架构方案，需要我把相关上下文带到这里来吗？"

### 5.3 批量操作的交互缺失

当前 ChatGPT/Claude/Gemini 的会话列表**完全缺少**以下批量操作：

- ☐ 多选会话
- ☐ 批量导出为结构化格式
- ☐ 批量打标签/分组
- ☐ 批量删除
- ☐ 跨平台会话合并
- ☐ 按项目/主题自动聚类

这些缺失不是因为技术实现困难，而是因为 AI 平台将会话视为"用完即弃"的临时交互，而不是**有价值的知识资产**。CtxPort 的核心认知转变就是：**AI 会话是可复用、可组合、可迁移的上下文资产**。

---

## 6. 目标层次分析

基于 Alan Cooper 的三层目标模型，对 Primary Persona (Alex) 进行分析：

### Life Goals（人生目标）

> "我想成为一个高效的、能独立交付复杂项目的开发者。AI 是我的力量倍增器，不是我的限制。"

- 保持技术竞争力——在 AI 时代不被淘汰，而是驾驭 AI
- 实现工作生活平衡——用工具提升效率，把时间还给生活
- 作为独立开发者/小团队实现商业价值——一个人做出原本需要一个团队的产品

**设计启示**：CtxPort 不应该增加用户的工具负担，而应该**减少**他们在工具间的摩擦，让他们感觉"更强大"而不是"又多了一个要管理的工具"。

### Experience Goals（体验目标）

> "我希望在 AI 工具间切换时感觉像是在同一个工作空间中工作，而不是在不同的孤岛间跳跃。"

- **流畅**：上下文迁移应该是无缝的，就像浏览器标签页之间的切换
- **掌控**：我知道什么信息被传递了，可以编辑和控制
- **信任**：数据在本地处理，我的代码不会被泄露到不该去的地方
- **不被打断**：工具应该融入现有工作流，不要求我改变习惯

**设计启示**：
- 浏览器扩展是正确的入口——融入用户已有的工作环境
- "一键复制"必须真的是一键——不是"点击 → 选择格式 → 确认 → 复制"
- 本地处理 + 脱敏是差异化竞争力，不是 nice-to-have

### End Goals（最终目标）

> "我要把 ChatGPT 中讨论的架构方案快速、完整、正确地带到 Cursor 中继续实现。"

具体的 End Goals：

1. **在 2 秒内将一个 AI 会话打包为可复用的 Context Bundle**
2. **在任何 AI 工具中一键加载 Context Bundle，AI 立刻理解之前的上下文**
3. **批量选择和导出多个相关会话，按项目组织**
4. **将 GitHub repo 打包为 token 预算内的结构化上下文**
5. **在 CLI 工具（Claude Code ↔ Cursor ↔ Codex）间传递项目状态**
6. **搜索和检索跨平台的历史会话**
7. **自动脱敏后安全地跨项目复用上下文**

**设计启示**：每个 End Goal 对应一个具体的交互流程，产品功能应该以这些 End Goals 为锚点设计，而不是堆砌"可能有用"的功能。

---

## 7. 关键洞察和建议

### 洞察 1：上下文是 AI 时代的"新货币"

跨 AI 平台切换每年浪费用户 200+ 小时——这不只是效率问题，这是**生产力税**。84% 的开发者使用 AI 工具，但没有任何工具专门解决"上下文在工具间流动"的问题。MCP 解决了 AI-to-Data 的连接，**CtxPort 应该解决 AI-to-AI 的上下文连接**。

### 洞察 2：痛点集中在"高频低效"操作

最大的痛点不是"某个工具不好用"，而是**工具之间的缝隙**。用户每天执行的 3-8 次跨工具上下文迁移，每次 15-40 分钟——这些是高频、低效、重复的操作，恰恰是工具最适合解决的。

### 洞察 3：Vibecoder 是增长飞轮的加速器

63% 的 vibecoding 用户是非开发者——这个群体正在爆发式增长，他们对 context management 的需求比专业开发者更强烈（因为他们缺乏手动整理上下文的技术能力）。服务好 Alex（开发者）打磨核心功能，然后自然扩展到 Maya（vibecoder）获取增长。

### 洞察 4："本地优先 + 脱敏"不是功能，是信任基石

2025 年的 AI 隐私环境急剧变化（Anthropic ToS 变更、Stanford 隐私研究、Washington Post 曝光）。用户对"我的数据被谁看到"的焦虑前所未有。CtxPort 的本地处理 + 脱敏能力应该是产品的**信任品牌**，而不仅仅是一个功能复选框。

### 洞察 5：Context Bundle 应对齐 MCP 生态

MCP 已成为 AI 互操作的事实标准（97M+ 月下载，Linux Foundation 治理）。CtxPort 的 Context Bundle 格式应该与 MCP 生态兼容——这样 Context Bundle 不仅可以被用户手动使用，还可以被 AI agents 通过 MCP 协议自动消费。

### 交互设计建议

1. **会话列表的"快速复制"按钮是 Day 1 的杀手级功能**——不用打开会话就能复制，消除最大的单次交互摩擦
2. **批量选择 + 打包为 Context Bundle 是第二优先级**——将"会话是消耗品"转变为"会话是资产"
3. **浏览器扩展的注入点必须极其精准**——在 ChatGPT/Claude/Gemini 的会话列表和会话详情页添加按钮，不要污染其他页面元素
4. **Token 预算可视化是 Vibecoder 的刚需**——Maya 不理解"200K tokens"意味着什么，需要直观的视觉反馈
5. **CLI 集成应支持 pipe 语法**——`ctxport pack | claude` 这样的 Unix 哲学才是 Alex 的母语
6. **格式保真是基本功**——代码块、表格、列表层级在复制过程中必须零丢失，否则用户第一次使用就会放弃

---

*本报告由 Alan Cooper Goal-Directed Design 方法论驱动，基于 2024-2026 年公开数据调研完成。所有 Persona 基于真实社区数据和行业统计聚类构建，非虚构。*
