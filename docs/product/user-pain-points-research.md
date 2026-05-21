# 跨 AI 平台上下文迁移：用户痛点与认知障碍深度调研

> 调研时间：2026-02-07
> 调研角色：产品设计（Don Norman 设计哲学视角）
> 产品代号：CtxPort — AI 时代的剪贴板

---

## 1. 调研方法和信息来源

### 调研方法

本次调研采用 Don Norman 提倡的**观察驱动研究法**——不是问用户想要什么，而是观察他们实际在做什么、在哪里卡住、在哪里抱怨。具体方法包括：

- **社区行为观察**：搜索 Reddit（r/ChatGPT、r/ClaudeAI、r/cursor、r/vibecoding、r/VibeCodeDevs）、Hacker News、OpenAI Developer Community、GitHub Issues 上的真实讨论
- **竞品体验分析**：调研 Repomix、AI Chat Exporter、AI Context Flow、ChatGPT Exporter、GPT2Notes 等现有工具的用户反馈和差评
- **行业报告梳理**：分析 2024-2025 年 context engineering 相关的技术文章和研究论文
- **安全事件追踪**：追踪浏览器扩展数据泄露事件对用户信任的影响

### 主要信息来源

| 来源类型 | 具体来源 | 关注重点 |
|----------|----------|----------|
| Reddit 社区 | r/ClaudeAI, r/ChatGPT, r/cursor, r/vibecoding (89k+), r/VibeCodeDevs (15k+) | 上下文管理抱怨、工具切换痛点 |
| 开发者社区 | Hacker News, Stack Overflow, OpenAI Developer Community | 技术限制讨论、workaround 分享 |
| GitHub | Repomix issues, ChatGPT Exporter issues, Copilot discussions | 工具缺陷和功能请求 |
| 技术博客 | Anthropic Engineering, JetBrains Research, Factory.ai, LogRocket | context engineering 最佳实践和挑战 |
| 安全报告 | Malwarebytes, The Register, Hacker News (安全) | 浏览器扩展数据泄露事件 |
| 产品页面 | Plurality Network (AI Context Flow), Repomix, YourAIScroll | 竞品定位和用户评价 |

---

## 2. 用户行为模式分析

### 2.1 "Triple-Stacking"：多模型并行使用已成常态

2025 年的 AI 用户不再忠于单一平台。Reddit NextGenAITool 社区的讨论显示，用户正在进行 **"triple-stacking"** —— 同时使用多个 AI 模型以最大化生产力：

- **Claude**：代码生成和长文本分析的首选
- **ChatGPT**：通用对话和多模态任务
- **Gemini**：性价比最高的日常任务处理
- **Perplexity**：搜索和信息检索

**关键洞察**：用户并非在"选择"一个 AI 工具，而是在**编排**一组 AI 工具。这意味着上下文在工具间的流动不是偶尔的需求，而是**每天反复发生的核心工作流**。

### 2.2 开发者的"工具矩阵"行为

开发者的 AI 工具使用更加碎片化：

- **IDE 层**：Cursor（AI 原生编辑器）或 VS Code + Copilot
- **CLI 层**：Claude Code（终端内 agentic 工作流）、Codex CLI
- **Web 层**：ChatGPT/Claude/Gemini Web 界面用于探索和讨论
- **文档层**：Notion AI、Google Docs AI 用于文档处理

一个典型的开发场景是：在 ChatGPT Web 里讨论架构方案 → 切到 Claude 来细化实现 → 在 Cursor 里写代码 → 用 Claude Code 做测试和重构。**每次切换都意味着上下文的重建**。

### 2.3 Vibecoding 用户的"会话消耗"模式

Vibecoding 社区（近 10 万成员）展现了一种独特的行为模式：

- **高频创建新会话**：为避免 context window 污染，用户被迫为每个功能开新会话
- **手动搬运上下文**：复制之前会话的关键决策和代码片段到新会话
- **"有选择性遗忘"的挫败感**：用户被形容为面对"一个过度自信的初级开发者——还得了失忆症"

> 来自 Reddit 社区的典型抱怨："Claude's short memory, bloated code, and expensive token use" —— 短记忆、冗余代码、昂贵的 token 消耗。

### 2.4 "Copy-Paste 走廊"行为

观察到的最普遍行为模式是用户在不同 AI 平台间形成了一条**非正式的 copy-paste 走廊**：

1. 从 AI-A 选中对话内容 → Ctrl+C
2. 切换到 AI-B → Ctrl+V → 补充说明"这是我之前和另一个 AI 的对话，请基于此继续"
3. AI-B 花费大量 token 理解粘贴的内容
4. 对话结构和角色信息在粘贴过程中丢失
5. 反复重复此过程

**从 Norman 设计视角看**：这是典型的**gulf of execution（执行鸿沟）**——用户知道自己想要什么（把上下文带到新工具），但系统没有提供任何直接的路径来完成这个操作。

---

## 3. 心智模型分析

### 3.1 用户对"上下文"的心智模型

通过社区讨论分析，用户对"上下文"存在几个层次的理解：

**第一层：上下文 = 对话历史**
- 最表层的理解，认为上下文就是"我和 AI 说过的话"
- 这类用户的需求：导出/导入对话记录
- 存在的误解：认为把对话原文粘贴给另一个 AI 就等于"迁移了上下文"

**第二层：上下文 = 共享知识**
- 理解上下文包含累积的决策、偏好和约定
- 这类用户的需求：让新工具"知道"之前建立的规则和约定
- 存在的误解：认为 AI 的 Memory 功能已经解决了这个问题（实际上 Memory 是平台孤岛式的）

**第三层：上下文 = 项目状态**
- 高级用户理解上下文包含代码状态、架构决策、技术栈选择、已知 bug 等
- 这类用户的需求：结构化的项目上下文包，不是简单的文本
- 存在的误解：认为 CLAUDE.md / .cursorrules 等文件已经足够

**第四层：上下文 = 认知模型**
- 最深层的理解，上下文是 AI 对用户意图、风格、目标的综合理解
- 这类用户极少，但他们是最有可能成为 CtxPort 的核心用户
- 存在的需求：可迁移、可编辑、可组合的上下文档案

### 3.2 心智模型错配（Mental Model Mismatch）

用户心智模型与系统实际行为之间存在几个关键错配：

| 用户以为 | 实际情况 | 产生的问题 |
|----------|----------|-----------|
| "导出对话就等于导出上下文" | 导出的是文本，不是语义理解 | 导入到新工具后 AI 表现不如预期 |
| "AI 的 Memory 功能会跨平台" | Memory 被锁死在单一平台内 | 换个工具一切从零开始 |
| "把代码全部粘贴给 AI 就是给了它上下文" | 无结构的代码大量浪费 token，且 AI 无法聚焦 | token 超限、回答质量下降 |
| "大 context window 意味着不需要管理上下文" | 长上下文导致 context rot，性能不均匀退化 | AI 在长对话后期"忘记"早期关键信息 |
| "CLAUDE.md/.cursorrules 就是上下文管理" | 这些是项目级静态配置，不是动态上下文 | 无法表达会话级的累积知识 |

### 3.3 关键认知障碍

**障碍一：上下文不可见**
- 用户无法"看到" AI 当前持有的上下文
- 不知道哪些信息 AI 还记得、哪些已经被截断
- 违反了 Norman 的**系统状态可见性**原则

**障碍二：上下文不可操作**
- 用户无法选择性地提取、编辑或组合上下文片段
- 只有"全部导出"或"什么都不导出"两个极端
- 违反了**用户控制权**原则

**障碍三：上下文格式不可理解**
- ChatGPT 导出的 JSON 包含大量元数据，对用户来说是"黑盒"
- 用户无法判断导出内容是否包含敏感信息
- 违反了**可理解性（discoverability）**原则

---

## 4. 痛点清单（按严重程度排序）

### P0：阻断性痛点（导致用户放弃或严重低效）

#### 痛点 #1：上下文迁移无解——"每次换工具都是从零开始"
- **严重程度**：P0
- **影响面**：所有多平台 AI 用户
- **表现**：用户平均每天在 AI 工具间切换 5 次以上，每次切换浪费 15-30 分钟重建上下文。年化浪费 200+ 小时
- **用户声音**："Context is siloed per provider, tied to proprietary storage, and lost the moment you switch tools"
- **根因**：各 AI 平台将上下文视为竞争壁垒，刻意不提供互操作性

#### 痛点 #2：Context Window 耗尽——"AI 突然失忆"
- **严重程度**：P0
- **影响面**：所有长会话用户，尤其是 vibecoding 用户
- **表现**：Claude Code 在自主工作 10-20 分钟后有效性下降；长对话中 AI 忘记早期关键决策
- **用户声音**："An overconfident junior dev with amnesia"
- **根因**：有限的 context window 加上缺乏有效的上下文压缩/管理机制

#### 痛点 #3：信任危机——浏览器扩展数据泄露
- **严重程度**：P0
- **影响面**：使用第三方上下文工具的所有用户
- **表现**：2025 年 7 月，Urban VPN 扩展窃取了 800 万用户的 AI 对话数据，涵盖 ChatGPT、Claude、Gemini 等 8 个平台。另有恶意扩展冒充合法工具，窃取 90 万用户数据
- **用户影响**：对任何声称"帮你管理 AI 上下文"的浏览器扩展产生严重信任危机
- **根因**：缺乏本地处理机制，数据必须经过第三方服务器

### P1：高频痛点（每天遇到，显著影响效率）

#### 痛点 #4：无法选择性导出——"要么全有要么全无"
- **严重程度**：P1
- **影响面**：需要导出特定会话内容的用户
- **表现**：ChatGPT 原生导出是全量的 data export（包含所有历史），无法选择特定会话或会话中的特定片段
- **用户声音**：OpenAI 社区反复出现的 feature request："Is there a way I can export every detail from a full conversation thread to a new one so I can continue the chat?"
- **根因**：平台设计导出功能时以"数据可移植性合规"为目的，而非以用户工作流为目的

#### 痛点 #5：代码仓库上下文打包困难
- **严重程度**：P1
- **影响面**：使用 AI 辅助编程的开发者
- **表现**：Repomix 等工具在大仓库上超出 JavaScript string limit；token 计数不准确（与 AI Studio 报告差异达 19%）；输出文件超过某些 AI 工具的上传限制（如 Google AI Studio 的 1MB 限制）
- **用户声音**：Repomix GitHub Issues 中大量关于 token 超限和文件过大的报告
- **根因**：没有智能的上下文裁剪——要么全部打包，要么用户手动选择

#### 痛点 #6：CLI 工具间上下文断裂
- **严重程度**：P1
- **影响面**：使用 Claude Code、Cursor、Codex CLI 等多个 CLI 工具的开发者
- **表现**：在 Claude Code 中建立的项目理解无法带到 Cursor；Cursor 的 .cursorrules 和 Claude Code 的 CLAUDE.md 是完全不同的格式
- **用户声音**："Cursor seemed to ignore its rules 1/3 of the time"——不仅格式不通用，连单个工具内的规则执行都不可靠
- **根因**：每个工具自造格式，缺乏统一的项目上下文标准

### P2：中频痛点（经常遇到，造成不便）

#### 痛点 #7：批量操作缺失
- **严重程度**：P2
- **影响面**：有大量历史会话的重度用户
- **表现**：无法在 ChatGPT/Claude 的会话列表中多选会话进行批量导出；第三方工具如 GPT2Notes 上限为 1000 条
- **根因**：AI 平台的 UI 不为批量操作设计

#### 痛点 #8：导出格式碎片化
- **严重程度**：P2
- **影响面**：在多个 AI 平台间迁移数据的用户
- **表现**：ChatGPT 导出 JSON、Claude 暂无原生导出、Gemini 导出有限；第三方工具支持 PDF/MD/TXT/JSON 但格式各异，互不兼容
- **根因**：没有跨平台的上下文交换标准

#### 痛点 #9：敏感信息泄露焦虑
- **严重程度**：P2
- **影响面**：企业用户和处理敏感数据的个人用户
- **表现**：约 15% 的员工将敏感代码、PII 或财务数据粘贴到公共 LLM；导出的对话中可能包含 API keys、密码等敏感信息，用户无法方便地在导出前脱敏
- **根因**：导出工具缺乏自动脱敏能力

#### 痛点 #10：Token 预算不可控
- **严重程度**：P2
- **影响面**：所有付费 AI 用户
- **表现**：粘贴大量上下文到新对话时无法预知会消耗多少 token；不同模型的 token 计算方式不同，用户难以预估
- **根因**：上下文缺乏 token 预算概念和预览机制

---

## 5. 竞品体验问题

### 5.1 ChatGPT 原生导出

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| 全量导出，无法选择性 | 高 | 只能导出全部历史，无法选择特定会话 |
| 异步邮件模式 | 中 | 点击导出后需要等待邮件，不是即时下载 |
| JSON 格式不友好 | 中 | 导出的 JSON 包含大量元数据，非技术用户难以使用 |
| 无法导出到另一个 ChatGPT 账号 | 高 | OpenAI 明确不支持账号间的会话迁移 |

### 5.2 ChatGPT Exporter（浏览器扩展）

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| 格式不完美 | 中 | 某些导出格式存在 formatting issues |
| 无法导出 Canvas 内容 | 高 | Canvas 和 Artifacts 等新功能的内容不在常规导出范围内 |
| 安全信任问题 | 高 | 2025 年浏览器扩展数据泄露丑闻后，用户对此类扩展信任度大降 |

### 5.3 Repomix

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| 大仓库崩溃 | 高 | 超出 JavaScript string limit，输出失败 |
| Token 计数不准 | 中 | 与 Google AI Studio 等平台的 token 计数差异达 19% |
| 输出文件过大 | 高 | 某些 AI 工具有文件大小限制（如 1MB），无法上传 |
| 缺乏智能裁剪 | 中 | --compress 选项使用 Tree-sitter 但仍不够智能 |
| 只处理代码 | 中 | 不处理会话、文档等非代码上下文 |

### 5.4 AI Context Flow（Plurality Network）

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| 新产品，成熟度存疑 | 中 | 作为较新的产品，稳定性和覆盖范围有待验证 |
| 依赖浏览器扩展 | 高 | 在浏览器扩展信任危机之后，这是一个劣势 |
| 仅覆盖 Web 平台 | 高 | 不解决 CLI 工具（Claude Code、Cursor、Codex CLI）的上下文迁移 |
| 侧重 Memory 同步 | 中 | 更多是偏好和 Memory 的同步，不是会话级上下文的迁移 |

### 5.5 YourAIScroll

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| 仅做导出，不做导入 | 高 | 只解决了一半的问题——导出了但无法结构化地导入到另一个平台 |
| 平台覆盖有限 | 中 | 主要支持 Grok、DeepSeek、Gemini 等较新平台 |

### 5.6 "Save my Chatbot"

| 问题 | 严重程度 | 详情 |
|------|----------|------|
| Perplexity 导出不可靠 | 高 | 反复出现导出失败、输出被清空的问题 |
| UI 点击无响应 | 中 | 用户报告点击图标后偶尔无反应 |

---

## 6. 2024-2025 新趋势带来的痛点

### 6.1 Context Engineering 成为一等公民

2025 年标志着从 "prompt engineering" 到 **"context engineering"** 的范式转移。Anthropic 发布了专门的 context engineering 指南，将上下文视为"稀缺的高价值资源"。这带来新痛点：

- 用户需要学习如何**策展（curate）**上下文，而不只是堆砌
- CLAUDE.md、.cursorrules、.copilot-instructions.md 等项目上下文文件成为必备，但格式不统一
- Context engineering 的最佳实践（write / select / compress / isolate）对普通用户来说过于技术化

### 6.2 MCP（Model Context Protocol）生态爆发

Anthropic 在 2024 年 11 月推出 MCP，到 2025 年底已被 OpenAI、Google DeepMind、Salesforce 等主流厂商采纳，并在 2025 年 12 月捐赠给 Linux Foundation 下的 AAIF。新痛点：

- MCP 解决了 AI 与**外部工具**之间的上下文共享，但**没有解决 AI 与 AI 之间**的上下文迁移
- MCP server 管理"有点 ad hoc"，开发者需要自行维护多个 MCP 配置
- MCP 是开发者工具，对非技术用户不友好

### 6.3 Vibecoding 社区爆发性增长

2025 年 vibecoding 从一个 meme 概念变成了真实的生产方式，r/vibecoding 接近 9 万成员，每天超过 100 个新帖子。新痛点：

- Vibecoder 不是传统开发者，对 CLI 和配置文件不熟悉
- 他们对"上下文管理"没有概念，只知道"AI 又忘了我说的话"
- Cursor CEO 自己承认 vibe coding 建立在"摇摇欲坠的基础"上——缺乏上下文管理是根本原因之一

### 6.4 AI Aggregator 平台兴起

TypingMind、Monica、Aymo AI 等 AI 聚合器在 2025 年兴起，将多个 AI 模型统一到一个界面。新痛点：

- 聚合器解决了"订阅碎片化"，但**没有解决上下文碎片化**
- 在聚合器内切换模型时，上下文仍然丢失
- 聚合器引入了新的 vendor lock-in 风险

### 6.5 Long Context 的"虚假安全感"

2025 年 context window 大幅扩展（Gemini 1M tokens、Llama 4 10M tokens），但研究发现了 **Context Rot** 现象：

- 模型不会均匀使用上下文，性能随输入长度增加而不均匀退化
- 长上下文不等于好上下文——"more context ≠ better performance"
- 用户被"大 context window"营销误导，认为不需要管理上下文

### 6.6 企业级 AI 安全合规

GDPR、HIPAA、EU AI Act 在 2025 年加速了对 AI 数据管理的监管：

- 企业用户需要在将上下文传递给 AI 前进行脱敏
- 约 13% 的 GenAI prompts 包含敏感组织数据
- LLM privacy 已从技术问题变成"董事会级别的优先事项"
- 现有的上下文迁移工具几乎都不提供脱敏功能

---

## 7. 关键洞察和结论

### 洞察 1：上下文迁移是一个**被忽视的基础设施问题**

每个 AI 平台都在比拼模型能力、context window 大小、工具集成，但**没有人在认真解决上下文的可移植性**。这类似于早期互联网缺乏 HTTP 标准、早期移动端缺乏剪贴板功能的阶段。CtxPort 定位为"AI 时代的剪贴板"精准命中了这个基础设施空白。

### 洞察 2：信任是第一关

2025 年浏览器扩展数据泄露事件（800 万用户数据被窃、90 万用户被恶意扩展攻击）使用户对上下文管理工具的信任降至冰点。**本地处理、零上传、开源可审计**不是锦上添花，而是准入门槛。任何需要将数据发送到第三方服务器的方案都将面临严重的信任壁垒。

### 洞察 3：痛点有明确的"用户类型梯度"

| 用户类型 | 核心痛点 | CtxPort 价值 |
|----------|----------|-------------|
| **Vibecoder（非技术用户）** | "AI 又忘了"，不知道怎么处理 | 一键复制、零配置、所见即所得 |
| **AI 重度用户（多平台）** | 每天 5+ 次工具切换，每次浪费 15-30 分钟 | 跨平台上下文剪贴板，秒级迁移 |
| **开发者（CLI 工具用户）** | Claude Code / Cursor / Codex 间上下文断裂 | 统一 Context Bundle 格式，CLI 工具互通 |
| **企业用户** | 敏感数据泄露风险 + 合规要求 | 本地脱敏、审计日志、零上传架构 |

### 洞察 4：现有竞品都只解决了问题的一个角落

- **Repomix**：只处理代码仓库→AI 的方向，不处理 AI→AI 的迁移
- **AI Chat Exporter**：只做导出，不做结构化打包
- **AI Context Flow**：只覆盖 Web 平台，不覆盖 CLI 工具
- **ChatGPT 原生导出**：全量、异步、格式不友好

**没有任何一个工具同时解决：Web AI 会话复制 + 代码仓库打包 + CLI 工具互通 + 本地脱敏 + 统一格式**。这就是 CtxPort 的机会。

### 洞察 5：**左侧列表一键复制**是一个被忽视的 UX 创新

在所有调研的竞品和用户讨论中，没有发现任何工具提供"不用打开会话就能复制上下文"的功能。现有工具全部要求用户先打开会话 → 选择内容 → 导出。这个流程违反了 Norman 的**最小操作原则**——用户为了一个简单的"复制"操作需要执行 3-4 步。

左侧列表的一键复制按钮将**行动成本从 4 步降到 1 步**，这是一个显著的交互创新。

### 洞察 6：Context Bundle 需要成为"可理解的、可编辑的"格式

Context Bundling 的概念已经在 Medium 上被讨论（"Context as Code"），但现有实现过于技术化（JSON 格式）。CtxPort 的 Context Bundle 格式应该：

- 人类可读（Markdown 优先，辅以结构化元数据）
- 机器可解析（嵌入 token count、来源标记、时间戳）
- 可编辑（用户可以在打包后调整内容、删除敏感信息）
- 可组合（多个 bundle 可以合并或选择性引用）

### 洞察 7：Token 预算是一个**未被产品化的刚需**

开发者社区对 token 管理有大量讨论（progressive context loading、context pruning、SWE-Pruner 等），但这些都是技术方案而非用户产品。没有任何工具让用户能在"打包上下文"时看到：

- 这个 bundle 在 GPT-4o 下是 X tokens（占 context window 的 Y%）
- 在 Claude Sonnet 下是 A tokens（占 context window 的 B%）
- 建议裁剪方案：删除这 3 段可以减少 40% tokens 而只损失 5% 信息

**把 token 预算从开发者概念变成用户可感知的产品功能**——这是一个差异化机会。

---

## 附录：Next Actions 建议

基于以上调研，建议下一步聚焦以下方向：

1. **MVP 优先级**：浏览器扩展的一键复制（Web AI 会话 → Context Bundle）应作为 MVP 的核心功能，因为这覆盖了最大用户群（非技术 vibecoder + 多平台 AI 用户）
2. **信任策略**：从 Day 0 强调本地处理和开源，直接回应浏览器扩展信任危机
3. **格式设计**：尽早定义 Context Bundle 规范，使其成为事实标准的候选者
4. **CLI 互通**：第二阶段覆盖 Claude Code / Cursor / Codex CLI 的上下文互通，这是开发者用户的高价值场景
5. **Token 预算可视化**：作为差异化功能尽早引入

---

> "Good design is actually a lot harder to notice than poor design, in part because good designs fit our needs so well that the design is invisible." — Don Norman
>
> CtxPort 的终极目标是让上下文迁移变得**不可见**——用户甚至不需要思考"我需要迁移上下文"，它就已经在那里了。
