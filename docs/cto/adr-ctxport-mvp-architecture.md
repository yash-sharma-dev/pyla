# ADR: CtxPort MVP 技术架构

> 版本：v1.0 | 日期：2026-02-07
> 方法论：Werner Vogels — Everything Fails, Monolith First, Boring Technology
> 输入：PR/FAQ (docs/ceo/pr-faq-ctxport-mvp.md) + 交互设计规格 (docs/interaction/ctxport-mvp-interaction-spec.md)
> 参考项目：chat2poster (/Users/yangxiaoming/Documents/codes/chat2poster)

---

## 0. 架构设计原则

在开始之前，明确本次架构设计的约束：

1. **最大化复用 chat2poster**：不是"参考"，而是 fork + 精简 + 新增。相同的 monorepo 骨架、adapter 模式、构建工具链。
2. **Monolith First**：CtxPort MVP 只有浏览器扩展，没有 Web App。所有逻辑在一个 extension 里跑完。
3. **Boring Technology**：继续使用 pnpm + Turborepo + WXT + React 19 + TypeScript 5.9 + Zod + tsup + Tailwind CSS。不引入新框架。
4. **为失败而设计**：DOM 会变、API 会变、剪贴板会失败。每个环节都要有降级路径。
5. **零网络权限**：这是产品宪法级约束。扩展不请求外部网络权限，所有处理在本地完成。

---

## 1. Monorepo 结构设计

### 1.1 从 chat2poster 到 CtxPort 的变更

```
chat2poster/                    CtxPort/
├── apps/                       ├── apps/
│   ├── browser-extension/ ──→  │   └── browser-extension/    [大幅修改]
│   └── web/               ──→  │       (删除 web app)
├── packages/                   ├── packages/
│   ├── core-adapters/     ──→  │   ├── core-adapters/        [修改：移除 Gemini，简化]
│   ├── core-export/       ──→  │   │   (删除：图片导出引擎)
│   ├── core-pagination/   ──→  │   │   (删除：分页逻辑)
│   ├── core-schema/       ──→  │   ├── core-schema/          [修改：精简 schema]
│   └── shared-ui/         ──→  │   ├── core-markdown/        [新增：Markdown 序列化]
│                               │   └── shared-ui/            [大幅精简]
```

### 1.2 CtxPort 最终目录结构

```
ctxport/
├── apps/
│   └── browser-extension/          # WXT 浏览器扩展 (Manifest V3)
│       ├── src/
│       │   ├── entrypoints/
│       │   │   ├── background.ts           # Service Worker
│       │   │   ├── content.tsx             # Content Script 主入口
│       │   │   └── popup/                  # Popup 页面（极简）
│       │   │       ├── index.html
│       │   │       └── main.tsx
│       │   ├── components/
│       │   │   ├── copy-button.tsx          # 会话详情页复制按钮
│       │   │   ├── list-copy-icon.tsx       # 左侧列表复制图标
│       │   │   ├── batch-mode/
│       │   │   │   ├── batch-bar.tsx        # 批量模式浮动操作栏
│       │   │   │   ├── batch-checkbox.tsx   # 批量模式 checkbox
│       │   │   │   └── batch-provider.tsx   # 批量模式状态管理
│       │   │   ├── toast.tsx               # 内联 toast 通知
│       │   │   ├── context-menu.tsx         # 右键格式选项菜单
│       │   │   └── preview-panel.tsx        # 可选预览浮动面板
│       │   ├── hooks/
│       │   │   ├── use-copy-conversation.ts # 复制会话核心 hook
│       │   │   ├── use-batch-mode.ts        # 批量模式 hook
│       │   │   ├── use-dom-injection.ts     # DOM 注入管理
│       │   │   └── use-extension-url.ts     # URL 变化监听（复用 chat2poster）
│       │   ├── injectors/
│       │   │   ├── chatgpt-injector.ts      # ChatGPT DOM 注入点管理
│       │   │   ├── claude-injector.ts       # Claude DOM 注入点管理
│       │   │   └── base-injector.ts         # 注入器基类
│       │   ├── constants/
│       │   │   └── extension-runtime.ts
│       │   ├── styles/
│       │   │   └── globals.css
│       │   └── lib/
│       │       └── utils.ts
│       ├── wxt.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── core-schema/                 # Zod Schemas (Single Source of Truth)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── message.ts           # [复用] Message schema
│   │       ├── conversation.ts      # [修改] 增加 title 字段
│   │       ├── adapter.ts           # [复用] Adapter 接口定义
│   │       ├── bundle.ts            # [新增] Context Bundle schema
│   │       └── errors.ts            # [修改] 移除 export 错误码，新增 bundle 错误码
│   ├── core-adapters/               # Adapter Registry + 实现
│   │   └── src/
│   │       ├── index.ts             # [修改] 移除 Gemini 相关导出
│   │       ├── base.ts              # [复用] BaseExtAdapter + RawMessage
│   │       ├── registry.ts          # [复用] Adapter Registry
│   │       ├── extension-sites.ts   # [修改] 只保留 ChatGPT + Claude
│   │       ├── extension-site-types.ts # [复用]
│   │       ├── adapters/
│   │       │   ├── chatgpt/
│   │       │   │   ├── ext-adapter/     # [复用] ChatGPT API 获取
│   │       │   │   └── shared/          # [复用] message-converter 等
│   │       │   └── claude/
│   │       │       ├── ext-adapter/     # [复用] Claude API 获取
│   │       │       └── shared/          # [复用] message-converter 等
│   │       └── network/             # [部分复用] 仅保留需要的 fetcher
│   └── core-markdown/               # [新增] Markdown Context Bundle 序列化
│       └── src/
│           ├── index.ts
│           ├── serializer.ts        # Conversation → Markdown 序列化器
│           ├── formats.ts           # 格式选项（full/user-only/code-only/compact）
│           ├── token-estimator.ts   # Token 数量粗略估算
│           └── __tests__/
│               ├── serializer.test.ts
│               └── formats.test.ts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

### 1.3 Package 变更决策表

| chat2poster Package | CtxPort 处理 | 原因 |
|---------------------|-------------|------|
| `core-schema` | **保留 + 修改** | Message / Conversation / Adapter schema 是核心数据合约，直接复用。移除 Theme / Export / Selection / Decoration 相关 schema（图片导出不需要）。新增 Bundle schema。 |
| `core-adapters` | **保留 + 精简** | Adapter Registry + ChatGPT/Claude ext-adapter 是核心能力，直接复用。移除 Gemini adapter（MVP 不支持）、移除 share-link adapter（CtxPort 不需要 web 端解析）。 |
| `core-export` | **删除** | 图片渲染引擎（SnapDOM → PNG/JPEG），CtxPort 完全不需要。 |
| `core-pagination` | **删除** | 图片分页逻辑，CtxPort 不需要。 |
| `shared-ui` | **大幅精简，不单独保留为 package** | chat2poster 的 shared-ui 包含编辑器面板、主题选择器、海报渲染器等重组件，CtxPort 全不需要。CtxPort 的 UI 极简（按钮+toast+菜单），直接在 browser-extension 内实现，不需要独立 shared-ui package。需要的 shadcn/ui 原子组件（Button、Checkbox、Tooltip 等）直接在 extension 内引入。 |
| **core-markdown**（新增） | **新增** | Markdown Context Bundle 的序列化逻辑，是 CtxPort 的核心差异化能力。独立 package 便于未来 CLI 工具复用。 |

---

## 2. Context Bundle 格式规范

### 2.1 设计原则

- **人类可读**：纯 Markdown，用任何文本编辑器都能打开
- **机器可解析**：结构化的 YAML frontmatter + 明确的角色标记
- **代码保真**：代码块完整保留语言标记和缩进
- **合并友好**：多会话合并时用 `---` 分隔，带序号标记

### 2.2 单会话 Bundle 格式

```markdown
---
ctxport: v1
source: chatgpt
url: https://chatgpt.com/c/abc123
title: "讨论 REST API 认证方案"
date: 2026-02-07T14:30:00Z
messages: 24
tokens: ~8200
format: full
---

## User

我在做一个 SaaS 产品，需要选择 API 认证方案。候选是 JWT 和 OAuth2...

## Assistant

基于你的场景，我建议使用 OAuth2 + JWT 的组合方案...

## User

代码示例？

## Assistant

```python
# JWT Token 生成
import jwt

def create_token(user_id: str, secret: str) -> str:
    payload = {"sub": user_id, "exp": datetime.utcnow() + timedelta(hours=1)}
    return jwt.encode(payload, secret, algorithm="HS256")
```

这段代码展示了基本的 JWT Token 生成逻辑...
```

### 2.3 多会话合并 Bundle 格式

```markdown
---
ctxport: v1
bundle: merged
conversations: 3
date: 2026-02-07T14:30:00Z
total_messages: 54
total_tokens: ~18400
format: full
---

# [1/3] 讨论 REST API 认证方案

> Source: ChatGPT | Messages: 24 | URL: https://chatgpt.com/c/abc123

## User

...

## Assistant

...

---

# [2/3] Docker 部署配置

> Source: Claude | Messages: 12 | URL: https://claude.ai/chat/def456

## User

...

## Assistant

...

---

# [3/3] GraphQL Schema 设计

> Source: ChatGPT | Messages: 18 | URL: https://chatgpt.com/c/ghi789

## User

...

## Assistant

...
```

### 2.4 格式选项变体

| 格式 | 标签 | 行为 |
|------|------|------|
| `full` | 完整会话 | 所有角色的所有消息，完整 Markdown |
| `user-only` | 仅用户消息 | 只保留 `## User` 下的内容 |
| `code-only` | 仅代码块 | 只提取 ` ``` ` 代码块，保留语言标记 |
| `compact` | 精简版 | 全部消息但移除代码块内的注释和空行，压缩连续空白行 |

### 2.5 格式设计决策

**ADR-BUNDLE-001：使用 YAML frontmatter 而非 HTML 注释**

- **决定**：用 YAML frontmatter (`---`) 做元数据区
- **理由**：PR/FAQ 中的原始设计用 HTML 注释 `<!-- CtxPort Context Bundle -->`，但 YAML frontmatter 是 Markdown 生态的标准元数据格式（Hugo、Jekyll、Obsidian、Docusaurus 都支持），且 AI 工具解析 YAML frontmatter 的能力更强
- **取舍**：YAML frontmatter 在纯文本查看时稍显 "技术感"，但目标用户是开发者，这反而是优势

**ADR-BUNDLE-002：角色标记用 `## User` / `## Assistant` 而非 XML 标签**

- **决定**：用 Markdown 二级标题做角色标记
- **理由**：保持纯 Markdown 格式，任何 Markdown 渲染器都能正确显示层次结构。AI 工具（特别是 Claude）对 Markdown heading 结构的理解非常好
- **取舍**：不如 XML 标签 `<user>` 那样精确可解析，但可读性远胜，且足够机器解析

**ADR-BUNDLE-003：Token 估算使用 ~4 chars/token 近似**

- **决定**：不引入 tiktoken 等 tokenizer 库，使用字符数 / 4 的粗略估算
- **理由**：精确 token 计算需要依赖大型 WASM 包（tiktoken-wasm ~2MB），对扩展包体积影响过大。PR/FAQ 明确 token 计数不在 MVP 范围（排除项 #6），这里只做 toast 显示的粗略提示
- **取舍**：估算误差 ±30%，但对 "这段内容大概多大" 的直觉判断够用

---

## 3. Adapter 接口变更

### 3.1 现有 chat2poster 数据流

```
用户点击浮动按钮
    → adapter.parse(ExtInput) → Conversation 对象
    → EditorModal 展示（选择主题/分页/设备）
    → core-export 渲染 → PNG/JPEG
```

### 3.2 CtxPort 新数据流

```
用户点击复制按钮
    → adapter.parse(ExtInput) → Conversation 对象
    → core-markdown serializer → Markdown 字符串
    → navigator.clipboard.writeText() → 剪贴板
    → toast 反馈
```

### 3.3 接口变更分析

**Adapter 接口本身不需要改动。** chat2poster 的 Adapter 接口设计得非常好——它只负责 "输入 → Conversation 对象"，不关心下游是渲染图片还是生成 Markdown。这正是 API First 的价值。

关键变更在于：

1. **新增 `core-markdown` 包**：负责 Conversation → Markdown 序列化
2. **Conversation schema 微调**：增加可选的 `title` 字段
3. **移除 Adapter 的下游消费者**：不再需要 EditorModal、core-export、core-pagination

### 3.4 core-markdown Serializer 接口

```typescript
// packages/core-markdown/src/serializer.ts

import type { Conversation } from "@ctxport/core-schema";

export type BundleFormat = "full" | "user-only" | "code-only" | "compact";

export interface SerializeOptions {
  /** 输出格式，默认 "full" */
  format?: BundleFormat;
  /** 是否包含 YAML frontmatter，默认 true */
  includeFrontmatter?: boolean;
}

export interface SerializeResult {
  /** 序列化后的 Markdown 字符串 */
  markdown: string;
  /** 消息数量 */
  messageCount: number;
  /** 估算的 token 数量 */
  estimatedTokens: number;
}

/**
 * 将单个 Conversation 序列化为 Markdown Context Bundle
 */
export function serializeConversation(
  conversation: Conversation,
  options?: SerializeOptions,
): SerializeResult;

/**
 * 将多个 Conversation 合并序列化为单个 Markdown Context Bundle
 */
export function serializeBundle(
  conversations: Conversation[],
  options?: SerializeOptions,
): SerializeResult;
```

### 3.5 Conversation Schema 变更

```typescript
// packages/core-schema/src/conversation.ts — 新增 title 字段

export const Conversation = z
  .object({
    id: z.string().uuid(),
    sourceType: SourceType,
    title: z.string().optional(),        // ← 新增：会话标题
    messages: z.array(Message),
    sourceMeta: SourceMeta.optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict()
  // ... 保留现有 refine 规则
```

**来源**：ChatGPT API 返回的 `title` 字段，Claude API 返回的 `name` 字段。在 adapter 的 `parse` 方法中填充。

### 3.6 ChatGPT Adapter 修改

ChatGPT ext-adapter 的 `getRawMessages` 方法已经能拿到会话标题（从 API response 的 `title` 字段），但当前没有传递给 Conversation 对象。需要修改 `BaseExtAdapter.parse()` 或在 adapter 层面增加 title 传递。

最小改动方案：在 `ConversationOptions` 中增加可选 `title` 字段，在 `buildConversation` 中传递到 Conversation 对象。

---

## 4. 浏览器扩展架构

### 4.1 与 chat2poster 扩展的对比

| 维度 | chat2poster | CtxPort |
|------|------------|---------|
| Content Script 模式 | Shadow DOM overlay（全屏模态编辑器） | Shadow DOM + DOM 注入（多个小型注入点） |
| UI 复杂度 | 浮动按钮 → 模态编辑器（主题/分页/设备/导出） | 复制按钮 + 列表图标 + 批量 bar + toast |
| Background Script | 简单的 toggle-panel 消息转发 | 消息转发 + 列表 API 获取协调 |
| 数据流 | 解析 → 编辑 → 导出 | 解析 → 序列化 → 剪贴板 |

### 4.2 Content Script 注入策略

chat2poster 使用 WXT 的 `createShadowRootUi` 创建一个全屏 overlay。CtxPort 需要不同的策略：

**策略：混合注入模式**

1. **Shadow DOM Root（复用 chat2poster 模式）**：创建一个 Shadow DOM 容器挂载 React 应用，用于渲染 toast、右键菜单、批量模式浮动栏、预览面板等浮动 UI
2. **DOM 注入点（新增）**：在宿主页面的特定 DOM 位置注入轻量级元素（复制按钮、列表图标、checkbox），使用 MutationObserver 动态管理

```
┌─────────────────────────────────────────────────────┐
│ Host Page (ChatGPT / Claude)                         │
│                                                      │
│  ┌─── Shadow DOM Root (ctxport-root) ──────────────┐ │
│  │  React App:                                     │ │
│  │  - Toast notifications                          │ │
│  │  - Context menu (right-click)                   │ │
│  │  - Batch mode floating bar                      │ │
│  │  - Preview panel                                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─── DOM Injected Elements ───────────────────────┐ │
│  │  - [📋] Copy button in title bar                │ │
│  │  - [📋] Copy icons in sidebar list items        │ │
│  │  - [☐] Checkboxes in batch mode                 │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**ADR-INJECT-001：为什么不把所有 UI 都放 Shadow DOM 里？**

- 放在 Shadow DOM 里的元素无法自然融入宿主页面的 DOM 层次结构
- 左侧列表的复制图标需要跟随列表项的 hover 状态和滚动位置
- 会话详情页的复制按钮需要与原生按钮对齐
- 使用 DOM 注入 + CSS 变量继承才能实现交互设计规格中要求的 "与原生 UI 融合"

**ADR-INJECT-002：DOM 注入点的管理机制**

```typescript
// Injector 接口（每个平台一个实现）
interface PlatformInjector {
  /** 平台标识 */
  readonly platform: "chatgpt" | "claude";

  /** 注入会话详情页的复制按钮 */
  injectCopyButton(): void;

  /** 注入左侧列表的复制图标 */
  injectListIcons(): void;

  /** 进入/退出批量模式时注入/移除 checkbox */
  injectBatchCheckboxes(): void;
  removeBatchCheckboxes(): void;

  /** 清理所有注入 */
  cleanup(): void;
}
```

每个 Injector 实现内部使用 MutationObserver 监听 DOM 变化，处理：
- SPA 路由切换后重新注入
- 虚拟滚动列表的动态注入
- 侧边栏折叠/展开的处理

### 4.3 Background Script 职责

CtxPort 的 Background Script 比 chat2poster 多一个核心职责：**协调列表复制的会话数据获取**。

```typescript
// 消息类型定义
type CtxPortMessage =
  | { type: "COPY_CURRENT" }                    // 复制当前会话
  | { type: "COPY_FROM_LIST"; conversationId: string; provider: string }
                                                 // 从列表复制（不打开会话）
  | { type: "BATCH_COPY"; conversationIds: string[]; provider: string }
                                                 // 批量复制
  | { type: "TOGGLE_BATCH_MODE" }               // 进入/退出批量模式
  | { type: "COPY_RESULT"; success: boolean; messageCount?: number; estimatedTokens?: number; error?: string }
                                                 // 复制结果回传
```

**列表复制的数据获取策略**（与交互设计规格对齐）：

1. **优先：平台 API 直接获取**（在 Content Script 中执行）
   - ChatGPT：`fetch("https://chatgpt.com/backend-api/conversation/{id}")` — 使用用户现有 session cookie
   - Claude：`fetch("https://claude.ai/api/organizations/{org}/chat_conversations/{id}")` — 使用用户现有 session cookie
   - 这些 fetch 调用在 Content Script 中执行（与当前页面同源），不需要额外的网络权限

2. **降级：Toast 提示用户打开会话**
   - 如果 API 获取失败，不使用后台 tab 方案（增加复杂度且需要 `tabs` 权限）
   - 直接 toast："获取失败，请打开此会话后使用页面内复制"

**ADR-BG-001：API 获取在 Content Script 而非 Background Script 中执行**

- **决定**：ChatGPT/Claude 的 API 调用在 Content Script 中执行
- **理由**：Content Script 运行在目标页面的上下文中，自动携带该页面的 session cookie（`credentials: "include"`）。如果在 Background Script 中调用，需要手动管理 cookie，增加复杂度且有安全风险
- **这也是 chat2poster 的现有做法**，直接复用

### 4.4 完整数据流

#### 流程 1：会话详情页一键复制

```
用户点击 [📋] 按钮
    │
    ├── [Content Script] 按钮状态 → LOADING (spinner)
    ├── [Content Script] parseWithAdapters({ type: "ext", document, url })
    │   └── ChatGPT/Claude ExtAdapter.parse()
    │       └── fetch API → 解析 → Conversation 对象
    ├── [Content Script] serializeConversation(conversation, { format })
    │   └── Markdown 字符串 + messageCount + estimatedTokens
    ├── [Content Script] navigator.clipboard.writeText(markdown)
    │
    ├── 成功 → 按钮状态 → SUCCESS (✓)
    │   └── Toast: "已复制 24 条消息 · ~8.2K tokens"
    │
    └── 失败 → 按钮状态 → ERROR (⚠)
        └── Toast: "复制失败：{error message}"
```

#### 流程 2：左侧列表不打开会话就复制

```
用户 hover 列表项 → 显示 [📋] 图标
    │
用户点击 [📋] 图标
    │
    ├── [Content Script] 图标状态 → FETCHING (spinner)
    ├── [Content Script] 获取 conversationId（从 DOM 或 URL 解析）
    ├── [Content Script] fetch 平台 API 获取会话数据
    │   └── ChatGPT: GET /backend-api/conversation/{id}
    │   └── Claude: GET /api/organizations/{org}/chat_conversations/{id}
    ├── [Content Script] adapter 的 message-converter 解析响应
    │   └── → RawMessage[] → Conversation 对象
    ├── [Content Script] serializeConversation(conversation, { format })
    ├── [Content Script] navigator.clipboard.writeText(markdown)
    │
    ├── 成功 → 图标状态 → SUCCESS (✓)
    │
    └── 失败 → 图标状态 → FETCH_ERR (⚠)
        └── Toast: "获取失败，请打开此会话后使用页面内复制"
```

#### 流程 3：批量多选复制

```
用户进入批量模式（快捷键 / 长按 / Popup）
    │
    ├── [Content Script] 注入 checkbox 到每个列表项
    ├── [Content Script] 显示浮动操作栏
    │
用户勾选多个会话 → 点击 [复制全部]
    │
    ├── [Content Script] 浮动栏 → "正在复制... (0/N)"
    ├── [Content Script] 依次 fetch 每个会话的数据
    │   └── 每个完成：更新进度 "(M/N)" + checkbox → ✓
    │   └── 每个的 Conversation 对象收集到数组
    ├── [Content Script] serializeBundle(conversations, { format })
    │   └── 合并为单个 Markdown 字符串
    ├── [Content Script] navigator.clipboard.writeText(markdown)
    │
    ├── 全部成功 → "已复制 N 个会话（共 M 条消息 · ~XK tokens）"
    │   └── 2 秒后自动退出批量模式
    │
    └── 部分失败 → "已复制 X/N（Y 个失败）[仅成功的] [重试]"
```

### 4.5 Manifest V3 权限设计

```json
{
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*"
  ],
  "content_scripts": [{
    "matches": [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
      "https://claude.ai/*"
    ],
    "js": ["content.js"],
    "css": ["content.css"]
  }],
  "commands": {
    "copy-current": {
      "suggested_key": { "default": "Ctrl+Shift+C", "mac": "Command+Shift+C" },
      "description": "Copy current conversation"
    },
    "toggle-batch": {
      "suggested_key": { "default": "Ctrl+Shift+E", "mac": "Command+Shift+E" },
      "description": "Toggle batch selection mode"
    }
  }
}
```

**ADR-PERM-001：移除 `tabs` 权限**

- **决定**：CtxPort 不申请 `tabs` 权限
- **chat2poster 需要 `tabs` 权限**是因为 Background Script 需要查询 tab URL 判断是否为支持的站点
- **CtxPort 的替代方案**：使用 `activeTab` 权限（用户点击扩展图标时临时获得当前 tab 的权限）+ Content Script 自身的 URL 判断
- **安全收益**：`tabs` 权限允许读取所有 tab 的 URL 和标题，这对隐私敏感的用户是一个红旗。PR/FAQ 明确要求 "最小权限"

---

## 5. 代码复用分析

### 5.1 直接复用的文件（无修改或极小修改）

| chat2poster 文件路径 | 复用说明 |
|---------------------|---------|
| `packages/core-schema/src/message.ts` | 完全复用。Message schema 不变。 |
| `packages/core-schema/src/adapter.ts` | 完全复用。Adapter 接口不变。 |
| `packages/core-adapters/src/base.ts` | 完全复用。BaseExtAdapter、RawMessage、buildMessages、buildConversation。 |
| `packages/core-adapters/src/registry.ts` | 完全复用。Adapter Registry 的 register/parse/find 逻辑。 |
| `packages/core-adapters/src/extension-site-types.ts` | 完全复用。ExtensionSiteConfig 类型定义。 |
| `packages/core-adapters/src/adapters/chatgpt/ext-adapter/index.ts` | 完全复用。ChatGPT API 获取 + token 管理。 |
| `packages/core-adapters/src/adapters/chatgpt/shared/message-converter.ts` | 完全复用。ChatGPT API 响应解析。 |
| `packages/core-adapters/src/adapters/chatgpt/shared/content-flatteners/*` | 完全复用。内容扁平化处理（代码块、文本、推理等）。 |
| `packages/core-adapters/src/adapters/chatgpt/shared/text-processor.ts` | 完全复用。文本处理工具。 |
| `packages/core-adapters/src/adapters/chatgpt/shared/types.ts` | 完全复用。ChatGPT API 类型定义。 |
| `packages/core-adapters/src/adapters/chatgpt/shared/constants.ts` | 完全复用。 |
| `packages/core-adapters/src/adapters/claude/ext-adapter/index.ts` | 完全复用。Claude API 获取。 |
| `packages/core-adapters/src/adapters/claude/shared/message-converter.ts` | 完全复用。Claude API 响应解析。 |
| `packages/core-adapters/src/adapters/claude/shared/types.ts` | 完全复用。Claude API 类型定义。 |
| `packages/core-adapters/src/network/fetcher.ts` | 部分复用（如果列表复制需要独立的 fetch 逻辑）。 |

### 5.2 需要修改的文件

| chat2poster 文件路径 | 修改内容 |
|---------------------|---------|
| `packages/core-schema/src/conversation.ts` | 增加 `title: z.string().optional()` 字段 |
| `packages/core-schema/src/index.ts` | 移除 Theme/Export/Selection/Decoration 导出；新增 Bundle 导出 |
| `packages/core-schema/src/errors.ts` | 移除 ExportErrorCode；新增 BundleErrorCode（如 E-BUNDLE-001 序列化失败、E-BUNDLE-002 剪贴板失败） |
| `packages/core-adapters/src/index.ts` | 移除 Gemini 相关导出、移除 share-link adapter 导出 |
| `packages/core-adapters/src/extension-sites.ts` | 移除 GEMINI_EXT_SITE，只保留 ChatGPT + Claude |
| `packages/core-adapters/src/adapters/index.ts` | 移除 Gemini adapter 和 share-link adapter 导出 |
| `apps/browser-extension/wxt.config.ts` | 修改 manifest（名称、权限、命令）；移除 `tabs` 权限 |
| `apps/browser-extension/src/entrypoints/content.tsx` | 大幅改写：从 "模态编辑器" 改为 "多注入点 + 复制逻辑" |
| `apps/browser-extension/src/entrypoints/background.ts` | 修改消息类型；支持批量模式切换命令 |
| `apps/browser-extension/src/constants/extension-runtime.ts` | 修改事件名称和消息类型 |
| `apps/browser-extension/package.json` | 修改名称；移除 `core-export`、`core-pagination`、`shared-ui` 依赖 |

### 5.3 需要删除的文件/目录

| chat2poster 文件路径 | 删除原因 |
|---------------------|---------|
| `apps/web/` 整个目录 | CtxPort MVP 不需要 Web App |
| `packages/core-export/` 整个目录 | 图片渲染引擎，CtxPort 不需要 |
| `packages/core-pagination/` 整个目录 | 分页逻辑，CtxPort 不需要 |
| `packages/shared-ui/` 整个目录 | 编辑器 UI 组件，CtxPort 不需要（需要的原子组件直接在 extension 内引入 shadcn/ui） |
| `packages/core-schema/src/theme.ts` | 海报主题 schema，不需要 |
| `packages/core-schema/src/export.ts` | 图片导出 schema，不需要 |
| `packages/core-schema/src/selection.ts` | 消息选择/分页 schema，不需要 |
| `packages/core-adapters/src/adapters/gemini/` 整个目录 | MVP 不支持 Gemini |
| `packages/core-adapters/src/adapters/chatgpt/share-link-adapter/` | 不需要 Web 端 share link 解析 |
| `packages/core-adapters/src/adapters/claude/share-link-adapter/` | 同上 |
| `apps/browser-extension/src/components/app.tsx` | 需要完全重写（从编辑器入口改为复制功能入口） |

### 5.4 需要新增的文件

| 新文件路径 | 说明 |
|-----------|------|
| `packages/core-markdown/src/index.ts` | core-markdown 包入口 |
| `packages/core-markdown/src/serializer.ts` | Conversation → Markdown 序列化 |
| `packages/core-markdown/src/formats.ts` | 四种格式选项的实现 |
| `packages/core-markdown/src/token-estimator.ts` | Token 粗略估算 |
| `packages/core-markdown/package.json` | Package 配置 |
| `packages/core-markdown/tsup.config.ts` | 构建配置（复用 chat2poster 的模式） |
| `packages/core-schema/src/bundle.ts` | Bundle 相关 Zod schema |
| `apps/browser-extension/src/components/copy-button.tsx` | 会话详情页复制按钮 |
| `apps/browser-extension/src/components/list-copy-icon.tsx` | 左侧列表复制图标 |
| `apps/browser-extension/src/components/batch-mode/*.tsx` | 批量模式组件 |
| `apps/browser-extension/src/components/toast.tsx` | Toast 通知 |
| `apps/browser-extension/src/components/context-menu.tsx` | 右键格式菜单 |
| `apps/browser-extension/src/hooks/use-copy-conversation.ts` | 复制核心逻辑 hook |
| `apps/browser-extension/src/hooks/use-batch-mode.ts` | 批量模式 hook |
| `apps/browser-extension/src/hooks/use-dom-injection.ts` | DOM 注入管理 hook |
| `apps/browser-extension/src/injectors/base-injector.ts` | 注入器基类 |
| `apps/browser-extension/src/injectors/chatgpt-injector.ts` | ChatGPT DOM 注入 |
| `apps/browser-extension/src/injectors/claude-injector.ts` | Claude DOM 注入 |
| `apps/browser-extension/src/entrypoints/popup/` | Popup 页面（批量模式入口） |

---

## 6. 关键技术决策记录（ADR）

### ADR-001：Fork chat2poster 代码而非依赖

- **上下文**：创始人要求复用 chat2poster 架构。选项有：(A) 将 chat2poster 作为 git submodule/npm 依赖；(B) Fork 代码到 CtxPort 仓库
- **决定**：Fork 代码（选项 B）
- **理由**：
  - chat2poster 和 CtxPort 的演进方向不同（图片 vs Markdown），作为依赖会产生不必要的耦合
  - CtxPort 需要删除大量 chat2poster 代码（core-export、core-pagination、shared-ui），依赖方式无法干净地做到这一点
  - 两个项目的 adapter 实现可能根据各自需求独立演进
- **风险**：fork 后两个项目无法自动同步 adapter 更新（如 ChatGPT DOM 变更的修复）
- **缓解**：短期内创始人作为两个项目的维护者，可以手动 cherry-pick adapter 修复。长期看可以抽取 adapter 为独立的 npm 包

### ADR-002：不引入 shared-ui package

- **上下文**：chat2poster 有一个庞大的 shared-ui 包（编辑器、主题、渲染器、布局组件）。CtxPort 的 UI 极简。
- **决定**：不保留 shared-ui package，直接在 browser-extension 内使用 shadcn/ui 原子组件
- **理由**：
  - CtxPort 的 UI 元素很少（按钮、toast、checkbox、菜单），不需要独立的 UI 库
  - shared-ui 的存在增加了一层抽象和构建依赖
  - "能删的不留" — 一人公司的维护负担必须最小化
- **取舍**：如果未来 CtxPort 增加 Web App 或 CLI 带 TUI，可能需要重新创建 shared-ui。但 MVP 阶段 YAGNI

### ADR-003：DOM 注入使用原生 DOM API 而非 React Portal

- **上下文**：注入到宿主页面的 UI 元素（复制按钮、列表图标、checkbox）需要与宿主页面的 DOM 紧密集成
- **决定**：注入点使用原生 DOM API（createElement、appendChild、MutationObserver），浮动 UI（toast、菜单、批量栏）使用 React + Shadow DOM
- **理由**：
  - React Portal 需要在 React 树内管理宿主页面的 DOM 节点，增加了不必要的复杂度
  - 原生 DOM 注入更可控：精确控制注入位置、样式继承、事件冒泡
  - 注入的元素极简（一个图标按钮），不需要 React 的状态管理能力
  - MutationObserver 是处理 SPA 动态 DOM 的标准方案，chat2poster 已经在用
- **取舍**：注入点和 React 浮动 UI 之间的通信需要使用 CustomEvent 或全局状态

### ADR-004：列表复制失败时不使用后台 Tab 降级

- **上下文**：交互设计规格建议三级降级策略：API 获取 → 后台 Tab → 提示用户打开
- **决定**：MVP 只实现 API 获取 + 提示用户打开，跳过后台 Tab 降级
- **理由**：
  - 后台 Tab 需要 `tabs` 权限（创建 tab）+ 更复杂的 Content Script ↔ Background Script 通信
  - PR/FAQ 明确 "最小权限" 原则，增加 `tabs` 权限与产品定位冲突
  - API 获取的成功率已经很高（用户登录状态下，API 几乎不会失败）
  - 如果 API 失败（如 session 过期），提示用户刷新页面即可恢复
- **取舍**：极少数场景下用户体验降级（需要手动打开会话），但权限最小化的安全收益远大于此

### ADR-005：剪贴板写入策略

- **决定**：主策略 `navigator.clipboard.writeText()`，降级 `document.execCommand('copy')`，最终降级显示可选中文本框
- **理由**：与交互设计规格 7.5 节完全对齐。`navigator.clipboard.writeText()` 在 Content Script 中需要页面有焦点，这在用户刚点击按钮时是满足的。`execCommand` 作为保险。

### ADR-006：命名空间 `@ctxport/` 而非 `@chat2poster/`

- **决定**：所有 package 使用 `@ctxport/` 命名空间
- **理由**：CtxPort 是独立产品，使用独立的命名空间避免混淆。
- **涉及**：package.json 的 `name` 字段、import 路径中的包名

---

## 7. 构建和工具链

### 7.1 完全复用 chat2poster 的工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | >=10.0.0 | Package manager + workspace |
| Turborepo | ^2.8.x | Monorepo 任务编排 |
| WXT | ^0.20.x | 浏览器扩展框架（Manifest V3） |
| React | ^19.2.x | UI 框架 |
| TypeScript | ^5.9.x | 类型安全 |
| Zod | latest | Schema 定义和验证 |
| tsup | latest | Package 构建 |
| Tailwind CSS | ^4.x | 样式 |
| Vitest | latest | 测试 |

### 7.2 不引入的工具

| 工具 | 原因 |
|------|------|
| SnapDOM / html2canvas | 图片渲染，不需要 |
| Three.js | chat2poster 的 3D 效果，不需要 |
| JSZip | ZIP 打包，不需要 |
| shiki | 代码高亮渲染（海报用），Markdown 输出直接保留代码块原文 |
| tiktoken | Token 精确计算，MVP 用字符估算 |

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| ChatGPT/Claude 修改 API endpoint | 高 | 高 | Adapter 隔离变更范围；API URL 集中定义为常量；监控社区反馈 |
| 剪贴板写入被浏览器策略阻止 | 低 | 中 | 三级降级策略（ADR-005） |
| 大型会话（100+ 消息）序列化超时 | 中 | 低 | 流式处理；超时后提供 "仅复制已解析部分" |
| 虚拟滚动列表的注入遗漏 | 中 | 低 | MutationObserver + IntersectionObserver 组合；滚动事件补偿 |
| CSS 变量命名冲突 | 低 | 低 | 所有 CtxPort CSS 使用 `ctxport-` 前缀；Shadow DOM 隔离浮动 UI |

---

## 9. 实施优先级

按 PR/FAQ 的 P0/P1 和技术依赖关系排序：

| 阶段 | 任务 | 依赖 |
|------|------|------|
| **Phase 1** | core-schema 精简 + core-markdown 包开发 | 无 |
| **Phase 1** | core-adapters 精简（移除 Gemini/share-link） | 无 |
| **Phase 2** | 会话详情页一键复制（P0） | Phase 1 |
| **Phase 2** | Content Script 注入框架 + ChatGPT/Claude injector | Phase 1 |
| **Phase 3** | 左侧列表不打开就能复制（P0） | Phase 2 |
| **Phase 3** | 批量多选复制（P0） | Phase 2 |
| **Phase 4** | 复制格式选项 + 右键菜单（P1） | Phase 2 |
| **Phase 4** | 复制成功反馈 + Toast（P1） | Phase 2 |
| **Phase 5** | Popup 页面 + 快捷键配置 | Phase 3 |
| **Phase 5** | 端到端测试 + 平台适配验证 | All |

---

> *"Failures are a given and everything will eventually fail over time. [...] Design your system so that when failure happens, the blast radius is contained."*
> — Werner Vogels
>
> chat2poster 的 Adapter Registry 模式正是这个哲学的体现：一个 adapter 失败不影响其他 adapter。CtxPort 继承了这个架构优势，在此基础上用最小变更实现了从 "会话→图片" 到 "会话→Markdown" 的核心能力转换。
