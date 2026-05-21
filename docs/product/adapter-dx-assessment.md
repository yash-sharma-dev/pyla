# Adapter DX 评估报告

> 从 Don Norman 的以人为本设计视角，审视 CtxPort 声明式 adapter 架构的开发者体验（Developer Experience）。

---

## 1. Adapter 开发者画像（Persona）

### Persona A：独立开发者"小李"

- **背景**：前端/全栈开发者，日常使用 ChatGPT/Claude 之外的 AI 平台（如 Gemini、Poe、Kimi、通义千问）
- **动机**：自己常用的 AI 平台没有被 CtxPort 支持，想自己适配一下
- **技术水平**：熟悉 TypeScript、JSON，了解 CSS 选择器和浏览器 DevTools，但对浏览器扩展开发不熟悉
- **可忍受复杂度**：一个下午能搞定。如果要花超过两个小时来理解框架概念，就会放弃
- **工具**：VS Code，Chrome DevTools，GitHub

### Persona B：社区贡献者"Alex"

- **背景**：开源爱好者，在 GitHub 上看到 CtxPort 项目，想贡献一个 adapter
- **动机**：想回馈社区，或者想在简历里加一个开源贡献
- **技术水平**：中等。写过 TypeScript，但不一定深入理解 Zod、抽象类继承
- **可忍受复杂度**：如果 CONTRIBUTING.md 写得好、有清晰的模板，愿意花半天。但如果要理解整个 monorepo 架构才能开始写第一行代码，就会转去贡献别的项目
- **工具**：对 pnpm workspace 和 Turborepo 不一定熟悉

### Persona C：高级用户"资深"

- **背景**：企业内部部署了私有 AI 平台，想把 CtxPort 接入内部工具链
- **动机**：业务需求，需要把 AI 对话导出为标准化格式
- **技术水平**：高。能写复杂的脚本，理解 API 逆向工程
- **可忍受复杂度**：可以花一天，但需要清晰的 API 文档和类型定义
- **工具**：私有 npm registry，内部 CI/CD

### 核心洞察

> 三个 Persona 的共同点：**他们不想成为 CtxPort 框架专家，他们只想让自己的平台能用。**

这意味着声明式 adapter 的设计目标不是"提供一个灵活的框架"，而是"让开发者用最少的知识完成适配"。这两个目标看似相同，实则不同 —— 前者容易陷入"万能配置"的陷阱，后者关注的是认知负担的最小化。

---

## 2. 开发者旅程地图（Developer Journey Map）

### 当前架构下的旅程（痛点分析）

```
阶段              心智负担    放弃风险    说明
─────────────────────────────────────────────────────────
1. 我想适配新平台     低         低       有明确意图
2. 找到贡献入口       中         中       需要理解 monorepo 结构
3. 理解框架概念       高         高 !!    BaseExtAdapter、RawMessage、
                                         ExtInput、ExtensionSiteConfig...
                                         至少 5 个文件要读懂
4. 搭建开发环境       高         高 !!    pnpm install、turborepo build、
                                         浏览器加载扩展...
5. 写第一行代码       中         中       不确定从哪开始
6. 处理认证逻辑       极高       极高 !!  看 ChatGPT 的 token 缓存代码就知道
7. 处理消息解析       高         高       content flattener、skip 逻辑、
                                         artifact 归一化
8. 本地测试           高         高       需要在真实网站上测试
9. 提交 PR            中         低       标准 GitHub 流程
```

**最大的放弃点在第 3、4、6 步。** 让我用具体的故事来说明：

#### 故事："小李"的第一次尝试

小李想给 Kimi（月之暗面的 AI 聊天平台）写一个 adapter。他打开了 CtxPort 的源码仓库。

首先，他看到了 `packages/core-adapters/src/base.ts`。这里定义了 `BaseExtAdapter` 抽象类，需要实现 `getRawMessages()` 方法。看起来还好。

然后他看了 ChatGPT 的实现 —— 256 行代码，包含 access token 缓存、session 管理、对话树遍历、线性化排序算法。小李心想："适配一个新平台需要写这么多代码？"

**这就是心智模型不匹配的经典案例。** 小李的心智模型是："写一个 adapter 应该像填表一样简单——告诉框架 URL 长什么样、消息在 DOM 的哪里、角色怎么区分就行了。" 但实际的概念模型要求他理解整个类继承体系、类型系统和平台特定的 API 逻辑。

### 声明式架构下的理想旅程

```
阶段              心智负担    放弃风险    说明
─────────────────────────────────────────────────────────
1. 我想适配新平台     低         低       有明确意图
2. 打开 Playground    极低       极低     一个网页 / CLI 工具
3. 填写基本信息       极低       极低     平台名、URL pattern、logo
4. 配置 API 数据源    低         低       URL 模板、认证方式（选择题）
5. 映射消息字段       低         低       用 JSONPath / 点号路径
6. 实时预览结果       极低       极低     看到提取的对话 Markdown
7. 导出 / 提交        低         低       一键导出 JSON 或提 PR
```

**关键差异：从"编写代码"变成了"配置+预览"循环。** 每一步都有即时反馈，每一步的认知负担都足够低。

---

## 3. DX 设计原则和建议

### 原则一：三秒可见性（3-Second Discoverability）

> 开发者打开 adapter 配置文件后，3 秒内应该能理解"这个 adapter 做了什么"。

**当前问题**：ChatGPT adapter 的 `ext-adapter/index.ts` 有 256 行。阅读完它需要至少 10 分钟，而且只能理解"这个 adapter 做了什么"，还不能理解"我应该怎么写一个类似的"。

**建议**：一个声明式 adapter 配置文件应该是自解释的。最小配置示例（见第 5 节）读完不应该超过 30 秒。

### 原则二：填空题优于编程题（Fill-in-the-Blank over Free-Form）

> 让开发者做选择，而不是从零创造。

- 认证方式：`"auth": "cookie"` / `"auth": "bearer-from-session"` / `"auth": "none"` —— 不需要写 token 缓存逻辑
- 消息角色映射：`"roleMap": { "human": "user", "assistant": "assistant" }` —— 不需要写 if-else
- 内容提取：`"contentPath": "chat_messages[*].content[?type=='text'].text"` —— 不需要写 filter/map 链

### 原则三：报错即教学（Error as Guidance）

> 配置写错时，错误信息本身就是教程。

**反面案例**（典型的 Zod 验证错误）：
```
ZodError: Expected string, received undefined at path "api.conversationEndpoint"
```

**正面案例**：
```
adapter.yaml 验证失败：

  api.conversationEndpoint 缺失（必填字段）

  这个字段定义了获取对话数据的 API 地址。
  通常可以在浏览器 DevTools 的 Network 面板中找到，
  当你打开一个对话页面时，搜索返回消息列表的请求。

  示例：
    "https://kimi.moonshot.cn/api/chat/{conversationId}/messages"

  其中 {conversationId} 会被自动替换为从 URL 中提取的对话 ID。
```

### 原则四：先能跑再优化（Working First, Perfect Later）

> 渐进式披露的核心：先让 adapter 能工作（即使只处理 80% 的情况），再逐步完善。

开发者不应该被迫一开始就处理：
- Token 刷新逻辑
- 对话树遍历
- 多模态内容（图片、代码块、artifact）
- 边界情况（被删除的消息、隐藏的系统消息）

这些应该是可选的增强配置，不是必填项。

### 原则五：概念映射直觉化（Intuitive Conceptual Mapping）

> 控件和结果之间的映射必须自然。

当开发者写下 `"messagesPath": "data.chat_messages"` 时，他应该能直觉地知道这意味着"在 API 响应的 JSON 中，沿着 `data.chat_messages` 这条路径找到消息列表"。

不需要学习任何新的 DSL（领域特定语言），只需要理解 JSON 的点号路径表示法——这是每个开发者已经会的知识。

---

## 4. 渐进式披露策略（Progressive Disclosure）

### Level 0：最小可用配置（5 分钟搞定）

适用于：API 返回简单 JSON、cookie 认证的平台。

覆盖约 60% 的 AI 平台（如 Kimi、通义千问、豆包等国产 AI 平台的基本对话获取）。

### Level 1：认证增强（+15 分钟）

在 Level 0 基础上增加：
- Bearer token 从 session API 获取
- 自定义请求头
- Cookie 中提取特定字段（如 Claude 的 orgId）

覆盖约 80% 的 AI 平台。

### Level 2：消息转换增强（+30 分钟）

在 Level 1 基础上增加：
- 消息过滤规则（跳过系统消息、隐藏消息）
- 内容归一化（artifact 转码块、图片标记转 Markdown）
- 消息合并逻辑（同一角色连续消息合并）

覆盖约 95% 的 AI 平台。

### Level 3：脚本钩子（需要编程）

对于无法用声明式配置覆盖的 20%：
- `beforeFetch(context)`: 在请求前修改 headers、URL
- `transformResponse(data)`: 对 API 响应做自定义变换
- `parseMessage(raw)`: 自定义消息解析逻辑

这一层是"逃生舱口"（Escape Hatch），让声明式配置不会成为限制。

### 每一层的认知成本

```
Level    新概念数量    需要理解的文件    预估时间
─────────────────────────────────────────────────
  0        3-4 个       1 个（配置文件）    5 分钟
  1        2-3 个       1 个               15 分钟
  2        3-4 个       1 个               30 分钟
  3        框架 API     2-3 个              1-2 小时
```

关键是：Level 0 到 Level 1 的过渡应该是平滑的——不需要重写配置，只需要添加几行。Level 2 也是如此。只有到 Level 3 才需要切换到编程模式。

---

## 5. 最小 Adapter 配置示例

### Level 0 示例：适配一个假想的"SimpleAI"平台

```yaml
# adapters/simple-ai.yaml
id: simple-ai
name: SimpleAI
version: "1.0.0"

# 匹配规则 —— 告诉框架什么时候激活这个 adapter
match:
  hosts:
    - "app.simple-ai.com"
  conversationUrl: "https://app.simple-ai.com/chat/:conversationId"

# 数据源 —— 告诉框架从哪里获取对话数据
api:
  conversation: "https://app.simple-ai.com/api/conversations/{conversationId}"
  auth: cookie  # 用浏览器现有的 cookie 认证

# 消息映射 —— 告诉框架 JSON 响应长什么样
messages:
  path: "data.messages"          # 消息数组在 JSON 中的路径
  role: "role"                   # 每条消息的角色字段
  content: "content"             # 每条消息的内容字段
  roleMap:                       # 角色名称映射到标准角色
    human: user
    ai: assistant

# 元数据
meta:
  title: "data.title"            # 对话标题在 JSON 中的路径
```

**这个配置文件只有 20 行。** 一个开发者读完后，脑中的画面是清晰的：

1. 当我在 `app.simple-ai.com/chat/xxx` 页面时，这个 adapter 会激活
2. 它会请求 `api/conversations/xxx` 获取数据
3. 数据里的 `data.messages` 是消息列表
4. 每条消息的 `role` 字段告诉我谁说的，`content` 字段是说了什么

**没有任何需要"学习"的新概念。** 这就是好的可供性（Affordance）：配置文件自己解释了自己。

### 与当前架构的对比

要实现同样的功能，当前架构需要开发者：

1. 创建 `packages/core-adapters/src/adapters/simple-ai/` 目录
2. 创建 `ext-adapter/index.ts`（约 80-120 行）
3. 创建 `shared/types.ts`（约 20-40 行）
4. 创建 `shared/message-converter.ts`（约 30-60 行）
5. 在 `package.json` 中添加 `exports` 子路径
6. 在扩展代码中注册 adapter
7. 理解 `BaseExtAdapter`、`RawMessage`、`ExtInput`、`ExtensionSiteConfig` 四个接口

总计：约 150-220 行代码，横跨 4-6 个文件，需要理解 4+ 个抽象概念。

声明式方案：20 行 YAML，1 个文件，0 个新概念。

---

## 6. Playground 体验概念设计

### 设计理念

Playground 不是一个"文档页面"，而是一个"可交互的表单"。它的核心循环是：

```
配置 → 预览 → 调整 → 预览 → 满意 → 导出
```

每一次修改都有即时反馈，这是 Don Norman 反馈原则的直接体现。

### 界面布局

```
┌─────────────────────────────────────────────────────┐
│  CtxPort Adapter Playground                    [?]  │
├───────────────────────┬─────────────────────────────┤
│                       │                             │
│  [配置编辑器]          │  [实时预览]                   │
│                       │                             │
│  Step 1: 基本信息      │  ┌─ 状态指示器 ─────────┐   │
│  > 名称: [        ]   │  │  ✓ URL 匹配          │   │
│  > ID:   [        ]   │  │  ✓ API 可达          │   │
│                       │  │  ✗ 消息解析失败       │   │
│  Step 2: URL 匹配     │  │    → 错误详情和建议    │   │
│  > Host: [        ]   │  └────────────────────────┘  │
│  > Pattern: [     ]   │                             │
│                       │  ┌─ 提取结果预览 ─────────┐  │
│  Step 3: API 配置     │  │  标题: "关于量子..."     │  │
│  > Endpoint: [    ]   │  │                         │  │
│  > Auth: [cookie ▼]   │  │  [User]                 │  │
│                       │  │  什么是量子计算？        │  │
│  Step 4: 消息映射     │  │                         │  │
│  > Path: [        ]   │  │  [Assistant]             │  │
│  > Role: [        ]   │  │  量子计算是一种利用...   │  │
│  > Content: [     ]   │  │                         │  │
│                       │  └─────────────────────────┘  │
│                       │                             │
│  [展开高级配置 ▼]      │  [导出 YAML] [提交 PR]      │
│                       │                             │
├───────────────────────┴─────────────────────────────┤
│  [粘贴 API 响应 JSON]  或  [从 DevTools 导入]        │
└─────────────────────────────────────────────────────┘
```

### 交互细节

#### 输入方式："粘贴 JSON"优于"连接真实 API"

开发者的典型工作流是：

1. 在浏览器中打开目标 AI 平台的对话页面
2. 打开 DevTools → Network 面板
3. 找到返回对话数据的 API 请求
4. 复制 Response Body

Playground 应该支持直接粘贴这个 JSON，然后实时显示：
- JSON 结构的树形视图
- 点击字段自动填充到配置的路径中（**这是关键的可供性设计**：不需要手动写路径，直接点击就行）
- 预览提取结果

#### 反馈设计

| 操作 | 反馈 | 时机 |
|------|------|------|
| 修改任何配置字段 | 右侧预览实时更新 | 即时（<100ms） |
| URL pattern 填写 | 显示匹配/不匹配的状态 + 示例 URL | 即时 |
| 消息路径填写 | 高亮 JSON 中对应的数据 | 即时 |
| 路径写错 | 显示"在 JSON 中未找到此路径"+ 建议最相近的路径 | 即时 |
| 配置完成 | 显示完整的 Markdown 预览 | 即时 |

#### 从 Playground 到提交 PR

```
[导出] 按钮
  ├─ 下载 YAML 文件（本地使用）
  ├─ 复制到剪贴板
  └─ 一键创建 GitHub PR（需要 GitHub 授权）
      → 自动 fork 仓库
      → 在 adapters/ 目录创建文件
      → 创建 PR，附带自动生成的描述
```

### Playground 的实现优先级

**Phase 1（MVP）**：纯静态网页，粘贴 JSON + 编辑配置 + 实时预览 + 导出 YAML

**Phase 2**：集成 DevTools 面板，在目标网站上直接配置

**Phase 3**：GitHub 集成，一键 PR

---

## 7. 信任机制设计

### 终端用户的担忧

当一个终端用户（非开发者）安装了 CtxPort 并看到"此扩展支持第三方 adapter"时，他们会问：

1. **安全性**："第三方 adapter 会偷我的对话内容吗？"
2. **可靠性**："这个 adapter 是某个不认识的人写的，它靠谱吗？"
3. **隐私**："adapter 会把我的数据发到别的服务器吗？"

### 信任层级设计

```
┌─────────────────────────────────────────┐
│  官方 Adapter                      [✓]  │
│  由 CtxPort 团队维护                     │
│  ChatGPT · Claude                       │
│  → 自动启用，无需用户操作                 │
├─────────────────────────────────────────┤
│  社区认证 Adapter                  [⊕]  │
│  经过代码审查和安全验证                   │
│  Gemini · Kimi · 通义千问               │
│  → 用户可一键启用                        │
├─────────────────────────────────────────┤
│  社区提交 Adapter                  [?]  │
│  未经审查，使用需自行承担风险             │
│  → 用户需手动确认启用                    │
└─────────────────────────────────────────┘
```

### 声明式配置的天然安全优势

这是声明式架构最被低估的优势之一：**YAML 配置文件不能执行任意代码。**

一个声明式 adapter 只能做三件事：
1. 匹配 URL
2. 请求特定的 API 端点
3. 从 JSON 中提取字段

它**不能**：
- 执行任意 JavaScript
- 向非声明的域名发送请求
- 修改页面 DOM
- 访问除指定 cookie 之外的存储

这意味着对声明式 adapter 的安全审查可以自动化：
- 静态分析配置中的域名是否与声明的 host 一致
- 验证 API 端点是否在声明的域名范围内
- 确认没有脚本钩子（Level 3 的 adapter 需要更严格的审查）

### 元数据透明展示

每个 adapter 在用户界面中应该显示：

```
┌───────────────────────────────┐
│  Kimi Adapter            v1.2 │
│  ─────────────────────────── │
│  作者: @contributor-name      │
│  类型: 声明式（无自定义代码）   │
│  权限: 仅访问 kimi.moonshot.cn │
│  状态: 社区认证 ✓              │
│  最后更新: 2026-01-15          │
│  覆盖率: 基础对话 ✓            │
│          图片消息 ✗            │
│          代码块  ✓            │
└───────────────────────────────┘
```

**覆盖率指标**是一个重要的信任信号。它诚实地告诉用户："这个 adapter 能做什么，不能做什么。" 这比模糊的"支持 Kimi"要好得多——用户不会因为图片消息丢失而感到被欺骗。

---

## 8. 风险和待验证假设

### 假设一：80% 的 AI 平台可以用声明式配置适配

**验证方法**：选取 10 个主流 AI 平台，逐一分析其 API 结构，评估哪些能用 Level 0-2 覆盖，哪些需要 Level 3 脚本钩子。

**风险**：如果实际比例低于 60%，声明式架构的投入产出比会大打折扣。

### 假设二：开发者愿意在 Playground 中粘贴 API 响应

**验证方法**：观察 5 个目标 Persona 使用 Playground 的过程，记录他们的操作路径和困惑点。

**风险**：开发者可能觉得"手动找 API 响应并粘贴"这一步太麻烦，更希望 Playground 能自动抓取。

### 假设三：YAML 比 JSON 更适合做 adapter 配置格式

**验证方法**：让 10 个开发者分别阅读 YAML 和 JSON 版本的相同配置，比较理解速度和错误率。

**考量**：YAML 的可读性更好，但 JSON 有更好的工具链支持（Schema 验证、IDE 自动补全）。建议支持两种格式，内部统一转为 JSON 处理。

---

## 9. 总结：关键设计建议

| 优先级 | 建议 | 依据的设计原则 |
|--------|------|---------------|
| P0 | 定义最小 adapter 配置格式（Level 0），确保 20 行以内 | 可供性、心智模型匹配 |
| P0 | 配置验证必须产出有帮助的错误信息，包含示例和建议 | 反馈、容错 |
| P1 | 实现 Playground MVP（粘贴 JSON + 实时预览） | 反馈、映射 |
| P1 | 渐进式配置结构（Level 0→1→2→3 平滑过渡） | 渐进式披露 |
| P1 | "点击 JSON 字段自动填充路径"的 Playground 交互 | 可供性、减少认知负担 |
| P2 | adapter 信任层级和元数据展示系统 | 约束、安全 |
| P2 | adapter 模板生成器（`npx ctxport create-adapter`） | 约束、引导 |
| P3 | GitHub 集成（一键 PR） | 减少摩擦 |
| P3 | DevTools 面板集成 | 环境中的可发现性 |

> 声明式架构的本质不是"减少代码量"，而是"减少认知负担"。一个好的声明式配置，应该让开发者觉得自己不是在"编程"，而是在"描述"——描述一个 AI 平台的对话数据长什么样。框架的职责是理解这个描述，并自动完成所有的提取工作。

---

*产出人：产品设计总监（Don Norman 思维模型）*
*日期：2026-02-07*
