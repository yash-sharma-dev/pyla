# ADR: Adapter V2 — 通用内容提取架构

> 版本：v1.0 | 日期：2026-02-07
> 方法论：Werner Vogels — Everything Fails, API First, Boring Technology
> 前置文档：ADR 声明式 Adapter 架构 (docs/cto/adr-declarative-adapter-architecture.md)

---

## 0. Context（为什么需要 V2）

### 现状

V1（声明式 Adapter 架构）成功解决了 "AI 聊天平台的低成本适配" 问题。ChatGPT 和 Claude 通过 manifest + hooks 实现了声明式配置，新增同类 AI 平台（Gemini、Perplexity 等）的成本已降到 ~80 行配置。

但创始人的愿景是 **适配任意网站**——GitHub Issues/PR、Gmail、Stack Overflow、Notion、Slack、技术文档等。V1 架构在数据模型、数据源、认证模型、UI 注入四个维度上深度耦合 "AI 聊天" 场景，无法直接扩展。

### V1 的具体耦合点

**数据模型耦合**

| 耦合点 | V1 假设 | 实际需求 |
|--------|---------|---------|
| 角色模型 | `user` / `assistant` 二元 | GitHub 有多个评论者，Gmail 有发件人/收件人/CC |
| 消息结构 | 有序扁平数组 `Message[]` | GitHub PR review 有 file-level → line-level 嵌套评论 |
| 内容格式 | `contentMarkdown: string` | GitHub 代码 diff、Gmail HTML、Slack rich text |
| Provider | `"chatgpt" \| "claude" \| "unknown"` | 需要 open-ended string |

**数据源耦合**

| 耦合点 | V1 假设 | 实际需求 |
|--------|---------|---------|
| 数据获取 | REST API (`ConversationEndpoint`) | GitHub GraphQL、无 API 站点需 DOM scraping |
| URL 模板 | `{conversationId}` 单变量替换 | GitHub 需要 `{owner}/{repo}/{number}` 多变量 |
| 响应格式 | JSON (`response.json()`) | DOM scraping 返回 HTML/Elements |

**认证耦合**

| 耦合点 | V1 假设 | 实际需求 |
|--------|---------|---------|
| 认证方式 | `cookie-session` / `bearer-from-api` / `none` | GitHub PAT、OAuth App、API key |
| Token 获取 | 从 session endpoint 获取 | OAuth 需要 redirect flow，PAT 从用户设置获取 |

**UI 注入耦合**

| 耦合点 | V1 假设 | 实际需求 |
|--------|---------|---------|
| 页面结构 | 侧边栏列表 + 主内容区 | GitHub 没有侧边栏导航，Stack Overflow 是问答结构 |
| 注入点 | `copyButton` + `listItem` 固定结构 | 每个平台需要完全不同的注入策略 |

### 决策驱动力

1. **业务需求**：从 "AI 对话复制工具" 扩展为 "通用上下文提取工具"
2. **保护已有投资**：V1 的 ChatGPT/Claude adapter、core-markdown 序列化器、browser extension 框架必须继续工作
3. **一人公司可维护性**：新增一种网站类型的成本必须可控（< 200 行代码）

---

## 1. Decision（架构决策）

### 核心思路：内容类型分层 + 面向 Conversation 的归一化

V2 不是重写 V1，而是在 V1 之上引入一个 **抽象层**，将不同类型的网站内容（聊天、讨论、邮件、文档、代码）归一化为统一的 `ContentBundle` 数据结构。现有 `Conversation` 成为 `ContentBundle` 的一种特化形式。

```
                    ┌──────────────────┐
                    │  ContentBundle   │  ← V2 新增的通用数据模型
                    │  (统一输出格式)    │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼───────┐ ┌─────▼──────┐ ┌───────▼──────┐
   │  Conversation  │ │   Thread   │ │   Document   │
   │  (AI 聊天)     │ │  (讨论/邮件)│ │  (文档/代码)  │
   │  V1 兼容       │ │  V2 新增    │ │  V2 新增     │
   └────────────────┘ └────────────┘ └──────────────┘
            ▲                ▲                ▲
            │                │                │
   ┌────────┴───────┐ ┌─────┴──────┐ ┌───────┴──────┐
   │ ChatGPT/Claude │ │ GitHub/SO  │ │ Notion/Docs  │
   │ Manifest+Hooks │ │ V2 Adapter │ │ V2 Adapter   │
   └────────────────┘ └────────────┘ └──────────────┘
```

### 关键决策

**ADR-V2-001：ContentBundle 作为通用输出，Conversation 向下兼容**

- 新增 `ContentBundle` 类型作为所有 adapter 的通用输出
- `Conversation` 保持不变，通过 `toContentBundle()` 转换为 `ContentBundle`
- core-markdown 的 serializer 新增 `serializeContentBundle()` 方法，同时保留 `serializeConversation()`

**ADR-V2-002：ContentType 分类枚举，不做无限泛化**

- 定义明确的 `ContentType` 枚举：`conversation | thread | document | code-review | email`
- 不追求"一个类型适配所有"——每种内容类型有其固有结构，强行统一反而增加复杂度
- 新增内容类型需要显式添加枚举值 + 对应的 serializer 格式

**ADR-V2-003：V2 Adapter 接口取代 V1 的 `Adapter.parse()`**

- V2 Adapter 输出 `ContentBundle` 而非 `Conversation`
- V1 的 `ManifestAdapter` 继续工作，输出 `Conversation`，由框架自动包装为 `ContentBundle`
- 新平台直接实现 V2 接口

**ADR-V2-004：Fetcher 抽象——数据获取与内容解析分离**

- 引入 `Fetcher` 接口：`RestFetcher`、`GraphQLFetcher`、`DomFetcher`
- Adapter 声明使用哪种 Fetcher，不关心具体实现
- V1 的 `ConversationEndpoint` 等同于 `RestFetcher` 配置

**ADR-V2-005：UI 注入从 Adapter 剥离，由平台 Plugin 自行管理**

- V1 的 `InjectionConfig` 和 `ManifestInjector` 对 AI 聊天平台仍然有效
- V2 的非聊天平台定义自己的 `PlatformPlugin`，完全控制 UI 注入逻辑
- 框架只提供工具函数（MutationObserver helpers、injection markers），不假设 DOM 结构

---

## 2. Data Model（数据模型）

### 2.1 ContentBundle — 通用内容容器

```typescript
// packages/core-schema/src/content-bundle.ts

/** 内容类型枚举 */
type ContentType =
  | "conversation"   // AI 聊天（ChatGPT、Claude、Gemini）
  | "thread"         // 讨论线程（GitHub Issue、PR discussion、Stack Overflow）
  | "document"       // 文档（Notion page、技术文档）
  | "code-review"    // 代码评审（GitHub PR review、GitLab MR）
  | "email";         // 邮件（Gmail thread）

/** 参与者——取代 V1 的 user/assistant 二元模型 */
interface Participant {
  id: string;
  displayName: string;
  /** 可选角色标签，用于 Markdown 序列化时的 heading */
  role?: string;
  /** 平台特定的头像 URL */
  avatarUrl?: string;
}

/** 内容节点——取代 V1 的 Message，支持层级结构 */
interface ContentNode {
  id: string;
  /** 作者引用 */
  participantId: string;
  /** Markdown 格式的内容 */
  contentMarkdown: string;
  /** 序号（同层级内排序） */
  order: number;
  /** 子节点（支持嵌套：PR review → file comment → line reply） */
  children?: ContentNode[];
  /** 时间戳 */
  createdAt?: string;
  /** 节点类型标签（用于 serializer 区分处理） */
  nodeType?: string;
  /** 平台特定的元数据（不进入序列化） */
  meta?: Record<string, unknown>;
}

/** 通用来源元数据 */
interface ContentSourceMeta {
  /** 平台标识（open-ended string，不再是 enum） */
  platform: string;
  /** 来源 URL */
  url?: string;
  /** 解析时间 */
  parsedAt?: string;
  /** Adapter 标识 */
  adapterId?: string;
  adapterVersion?: string;
}

/** 通用内容容器 */
interface ContentBundle {
  id: string;
  contentType: ContentType;
  title?: string;
  /** 参与者列表 */
  participants: Participant[];
  /** 内容节点树（顶层节点列表） */
  nodes: ContentNode[];
  /** 来源元数据 */
  sourceMeta?: ContentSourceMeta;
  createdAt?: string;
  updatedAt?: string;
}
```

### 2.2 Conversation 与 ContentBundle 的关系

`Conversation` 是 `ContentBundle` 的特化形式，转换规则明确：

```typescript
// packages/core-schema/src/compat.ts

function conversationToContentBundle(conv: Conversation): ContentBundle {
  // Conversation 的两个参与者固定为 user 和 assistant
  const participants: Participant[] = [
    { id: "user", displayName: "User", role: "user" },
    { id: "assistant", displayName: "Assistant", role: "assistant" },
  ];

  const nodes: ContentNode[] = conv.messages.map((msg) => ({
    id: msg.id,
    participantId: msg.role === "user" ? "user" : "assistant",
    contentMarkdown: msg.contentMarkdown,
    order: msg.order,
    createdAt: msg.createdAt,
  }));

  return {
    id: conv.id,
    contentType: "conversation",
    title: conv.title,
    participants,
    nodes,
    sourceMeta: conv.sourceMeta
      ? {
          platform: conv.sourceMeta.provider,
          url: conv.sourceMeta.url,
          parsedAt: conv.sourceMeta.parsedAt,
          adapterId: conv.sourceMeta.adapterId,
          adapterVersion: conv.sourceMeta.adapterVersion,
        }
      : undefined,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}
```

### 2.3 为什么 ContentNode 支持 `children` 而非扁平数组

GitHub PR review 的典型结构：

```
PR Discussion
├── Comment: "请修复这个 bug"           (top-level node)
├── Review: "LGTM with comments"        (top-level node)
│   ├── File: src/auth.ts               (child: file-level)
│   │   ├── Line 42: "这里有竞态条件"    (child: line-level)
│   │   └── Line 42: "已修复，请看新提交" (child: reply)
│   └── File: src/db.ts                 (child: file-level)
│       └── Line 10: "连接池大小建议调大" (child: line-level)
└── Comment: "已合并"                    (top-level node)
```

扁平数组无法表达这种层级关系。序列化时，serializer 根据 `children` 的嵌套深度生成对应层级的 Markdown heading（`##` → `###` → `####`）。

> 但注意：对于 `conversation` 类型，`children` 始终为空——AI 聊天不需要层级。不增加 `conversation` 类型 adapter 的任何复杂度。

---

## 3. Interface Design（接口设计）

### 3.1 V2 Adapter 接口

```typescript
// packages/core-adapters/src/v2/adapter.ts

import type { ContentBundle } from "@ctxport/core-schema";

/** V2 Adapter 输入——比 V1 更通用 */
interface V2AdapterInput {
  type: "ext";
  url: string;
  document: Document;
}

/** V2 Adapter 接口 */
interface V2Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;

  /** 当前 URL 是否由此 adapter 处理 */
  canHandle(url: string): boolean;

  /** 从当前页面提取内容 */
  extract(input: V2AdapterInput): Promise<ContentBundle>;
}
```

**与 V1 `Adapter` 接口的区别**：

| 对比项 | V1 `Adapter` | V2 `V2Adapter` |
|--------|-------------|----------------|
| 输出类型 | `Conversation` | `ContentBundle` |
| canHandle 参数 | `AdapterInput`（含 type 判断） | `string`（直接传 URL） |
| 方法名 | `parse()` | `extract()`（语义更清晰） |
| 输入类型枚举 | `supportedInputTypes` | 移除（V2 只支持 `ext`） |

### 3.2 Fetcher 抽象

```typescript
// packages/core-adapters/src/v2/fetcher.ts

/** Fetcher 返回的原始数据 */
type FetchResult =
  | { type: "json"; data: unknown }
  | { type: "html"; document: Document }
  | { type: "text"; text: string };

/** REST Fetcher 配置 */
interface RestFetcherConfig {
  type: "rest";
  urlTemplate: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: unknown;
  credentials: "include" | "omit" | "same-origin";
  cache: "default" | "no-store" | "no-cache" | "reload";
}

/** GraphQL Fetcher 配置 */
interface GraphQLFetcherConfig {
  type: "graphql";
  endpoint: string;
  /** GraphQL query 字符串 */
  query: string;
  /** 从 URL/context 提取变量的映射 */
  variableMapping: Record<string, string>;
  credentials: "include" | "omit" | "same-origin";
}

/** DOM Fetcher（直接从当前页面 DOM 提取） */
interface DomFetcherConfig {
  type: "dom";
  /** 等待此选择器出现后再开始提取 */
  readySelector?: string;
  /** 最大等待时间（ms） */
  readyTimeout?: number;
}

type FetcherConfig = RestFetcherConfig | GraphQLFetcherConfig | DomFetcherConfig;
```

**ADR-V2-006：Fetcher 是配置而非接口**

Fetcher 定义为配置对象，不是需要实现的接口。框架内部有对应的执行器（`RestExecutor`、`GraphQLExecutor`、`DomExecutor`）。Adapter 作者只需声明配置，不需要实现 fetch 逻辑。

这延续了 V1 "声明优于代码" 的原则。

### 3.3 Auth V2

```typescript
// packages/core-adapters/src/v2/auth.ts

type AuthMethod =
  | "cookie-session"     // 依赖浏览器 cookie（V1 兼容）
  | "bearer-from-api"    // 从 session API 获取 bearer token（V1 兼容）
  | "bearer-from-storage"// 从 extension storage 读取用户配置的 token（PAT）
  | "oauth"              // OAuth flow（需要 background script 配合）
  | "none";              // 无认证

interface AuthConfig {
  method: AuthMethod;

  // bearer-from-api 配置（V1 兼容）
  sessionEndpoint?: string;
  tokenPath?: string;
  expiresPath?: string;
  tokenTtlMs?: number;

  // bearer-from-storage 配置（新增）
  storageKey?: string;

  // oauth 配置（新增）
  oauthConfig?: {
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    scopes: string[];
  };
}
```

**ADR-V2-007：OAuth 支持推迟到真正需要时再实现**

OAuth 的 `oauthConfig` 定义在类型系统中预留位置，但执行器暂不实现。理由：

1. GitHub 和大多数开发者工具支持 PAT（`bearer-from-storage`），比 OAuth 简单得多
2. OAuth redirect flow 在 browser extension 中需要 background script 配合，复杂度高
3. 等到有明确的 OAuth-only 平台需求时再实现，避免过度工程化

### 3.4 V2 Manifest Schema

```typescript
// packages/core-adapters/src/v2/manifest.ts

/** V2 Manifest——V1 的超集 */
interface V2Manifest {
  // --- 基础信息（与 V1 相同） ---
  id: string;
  version: string;
  name: string;
  /** 平台标识（open-ended string） */
  platform: string;
  /** 内容类型 */
  contentType: ContentType;

  // --- 平台识别（与 V1 相同） ---
  urls: {
    hostPermissions: string[];
    hostPatterns: RegExp[];
    /** 内容页面 URL 模式（取代 conversationUrlPatterns） */
    contentUrlPatterns: RegExp[];
  };

  // --- 认证（V2 扩展） ---
  auth: AuthConfig;

  // --- 数据获取（V2 多态） ---
  fetcher: FetcherConfig;

  // --- 内容解析（V2 通用化） ---
  parsing: {
    /** 标题提取路径 */
    titlePath?: string;

    /** 参与者提取规则 */
    participants: {
      /**
       * 参与者列表的 JSON path。
       * 如果为 null，则从每条 node 中内联提取。
       */
      listPath?: string;
      idField: string;
      nameField: string;
      roleField?: string;
    };

    /** 内容节点提取规则 */
    nodes: {
      /** 节点列表的 JSON path */
      listPath: string;
      /** 作者 ID 字段路径 */
      participantIdField: string;
      /** 文本内容字段路径 */
      textField: string;
      /** 排序字段路径 */
      sortField?: string;
      sortOrder?: "asc" | "desc";
      /** 子节点列表字段路径（支持嵌套） */
      childrenField?: string;
      /** 节点类型字段路径 */
      nodeTypeField?: string;
    };

    /** 过滤规则（与 V1 相同） */
    skipWhen?: Array<{
      field: string;
      equals?: unknown;
      exists?: boolean;
      matchesPattern?: string;
    }>;
  };

  // --- UI 注入（可选，仅当使用 ManifestInjector 时） ---
  injection?: InjectionConfig;

  // --- 主题（可选） ---
  theme?: ThemeConfig;

  // --- 元数据 ---
  meta?: ManifestMeta;
}
```

### 3.5 V2 Hooks

```typescript
// packages/core-adapters/src/v2/hooks.ts

interface V2HookContext {
  url: string;
  document: Document;
  /** 从 URL 提取的变量（取代 conversationId，支持多变量） */
  urlVars: Record<string, string>;
  platform: string;
  contentType: ContentType;
}

interface V2Hooks {
  // --- 认证阶段（与 V1 兼容） ---
  extractAuth?: (ctx: V2HookContext) => Record<string, string> | null;
  extractAuthHeadless?: () => Promise<Record<string, string>> | Record<string, string>;

  // --- URL 变量提取（取代 extractConversationId） ---
  extractUrlVars?: (url: string) => Record<string, string> | null;

  // --- 请求阶段 ---
  buildRequestUrl?: (
    ctx: V2HookContext & { templateVars: Record<string, string> },
  ) => string;

  // --- 响应阶段（V2 通用化） ---
  transformResponse?: (
    raw: FetchResult,
    ctx: V2HookContext,
  ) => { data: unknown; title?: string };

  /** 自定义单个 node 的内容提取 */
  extractNodeContent?: (
    rawNode: unknown,
    ctx: V2HookContext,
  ) => string | Promise<string>;

  /** 自定义参与者列表构建 */
  buildParticipants?: (
    raw: unknown,
    ctx: V2HookContext,
  ) => Participant[];

  /** 后处理节点列表 */
  afterParse?: (
    nodes: ContentNode[],
    ctx: V2HookContext,
  ) => ContentNode[];
}
```

---

## 4. V1 → V2 兼容层

### 4.1 ManifestAdapter V1 → V2 自动桥接

V1 的 `ManifestAdapter` 继续工作，输出 `Conversation`。框架在 registry 层自动包装：

```typescript
// packages/core-adapters/src/v2/compat.ts

import type { Adapter } from "@ctxport/core-schema";
import type { V2Adapter, V2AdapterInput } from "./adapter";
import { conversationToContentBundle } from "@ctxport/core-schema";

/**
 * 将 V1 Adapter 包装为 V2 Adapter。
 * 零改动复用现有 ChatGPT/Claude manifest。
 */
class V1AdapterBridge implements V2Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;

  constructor(private readonly v1Adapter: Adapter) {
    this.id = v1Adapter.id;
    this.version = v1Adapter.version;
    this.name = v1Adapter.name;
  }

  canHandle(url: string): boolean {
    return this.v1Adapter.canHandle({ type: "ext", url, document } as any);
  }

  async extract(input: V2AdapterInput): Promise<ContentBundle> {
    const conversation = await this.v1Adapter.parse({
      type: "ext",
      url: input.url,
      document: input.document,
    });
    return conversationToContentBundle(conversation);
  }
}
```

### 4.2 core-markdown 序列化兼容

```typescript
// packages/core-markdown/src/serializer.ts（V2 新增）

/**
 * 序列化 ContentBundle 为 Markdown。
 * 根据 contentType 选择不同的格式化策略。
 */
function serializeContentBundle(
  bundle: ContentBundle,
  options: SerializeOptions,
): SerializeResult {
  switch (bundle.contentType) {
    case "conversation":
      // 复用现有 conversation 序列化逻辑
      return serializeConversationBundle(bundle, options);
    case "thread":
      return serializeThreadBundle(bundle, options);
    case "document":
      return serializeDocumentBundle(bundle, options);
    case "code-review":
      return serializeCodeReviewBundle(bundle, options);
    case "email":
      return serializeEmailBundle(bundle, options);
  }
}
```

conversation 类型的序列化器直接复用现有的 `filterMessages` + `roleLabel` 逻辑，只需将 `ContentNode` + `Participant` 映射回 `Message` + `role` 格式。其他类型的序列化器按需实现。

### 4.3 向后兼容保证

| 层级 | 影响 | 兼容策略 |
|------|------|---------|
| core-schema | 新增类型，不修改现有类型 | `Conversation`、`Message`、`Provider` 等完全不变 |
| core-adapters (V1) | V1 ManifestAdapter 继续工作 | `V1AdapterBridge` 自动包装 |
| core-adapters (registry) | V2 registry 兼容 V1 adapter | 注册时自动检测版本并包装 |
| core-markdown | 新增方法，不修改现有方法 | `serializeConversation()` 完全不变 |
| browser-extension | 渐进式迁移 | 可以同时使用 V1 和 V2 adapter |

---

## 5. 平台适配示例

### 5.1 GitHub Issue Adapter（V2 新平台示例）

```typescript
// packages/core-adapters/src/adapters/github-issue/manifest.ts

const githubIssueManifest: V2Manifest = {
  id: "github-issue",
  version: "1.0.0",
  name: "GitHub Issue Extractor",
  platform: "github",
  contentType: "thread",

  urls: {
    hostPermissions: ["https://github.com/*"],
    hostPatterns: [/^https:\/\/github\.com\//i],
    contentUrlPatterns: [
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/,
    ],
  },

  auth: {
    method: "bearer-from-storage",
    storageKey: "github_pat",
  },

  fetcher: {
    type: "rest",
    urlTemplate: "https://api.github.com/repos/{owner}/{repo}/issues/{number}",
    method: "GET",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
    credentials: "omit",
    cache: "no-store",
  },

  parsing: {
    titlePath: "title",
    participants: {
      idField: "user.login",
      nameField: "user.login",
    },
    nodes: {
      listPath: "_comments",  // 由 transformResponse 组装
      participantIdField: "user.login",
      textField: "body",
      sortField: "created_at",
      sortOrder: "asc",
    },
  },

  meta: {
    reliability: "high",
    coverage: "GitHub Issue 正文 + 评论",
    lastVerified: "2026-02-07",
  },
};

const githubIssueHooks: V2Hooks = {
  extractUrlVars(url: string) {
    const match = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/.exec(url);
    if (!match) return null;
    return { owner: match[1]!, repo: match[2]!, number: match[3]! };
  },

  async transformResponse(result, ctx) {
    // GitHub Issue API 只返回正文，评论需要单独请求
    // 框架不允许 hooks 发起 fetch，所以用 multi-step fetcher
    // 这里假设 framework 已经合并了 issue + comments
    const data = (result as { type: "json"; data: unknown }).data as any;
    return {
      data: {
        ...data,
        _comments: [
          { user: data.user, body: data.body, created_at: data.created_at },
          ...(data._fetchedComments ?? []),
        ],
      },
      title: data.title,
    };
  },
};
```

> 注意：GitHub Issue 需要两个 API 调用（issue 正文 + 评论列表）。这引出了 "多步 fetch" 的问题——见 Section 6 Trade-offs。

### 5.2 ChatGPT Adapter（V1 零改动）

ChatGPT 的现有 `chatgptManifest` + `chatgptHooks` 完全不需要修改。V1AdapterBridge 自动将其 `Conversation` 输出转为 `ContentBundle`：

```typescript
// 注册时（apps/browser-extension 或 core-adapters/index.ts）

import { registerManifestAdapter } from "@ctxport/core-adapters";
import { chatgptManifest, chatgptHooks } from "./adapters/chatgpt/manifest";

// V1 注册方式不变
const v1Adapter = registerManifestAdapter({
  manifest: chatgptManifest,
  hooks: chatgptHooks,
});

// V2 registry 自动包装 V1 adapter
// v2Registry.register(new V1AdapterBridge(v1Adapter));
```

---

## 6. Trade-offs（取舍分析）

### 6.1 我们选择了什么

| 选择 | 理由 |
|------|------|
| `ContentBundle` 作为统一输出格式 | 避免每种内容类型一套序列化流程，下游（clipboard、storage、export）只需处理一种类型 |
| `ContentNode` 支持 `children` 嵌套 | 覆盖 GitHub PR review 等层级评论场景，不使用时零成本（`children` 可选） |
| `ContentType` 枚举而非 open-ended string | 每种类型的序列化策略不同，枚举确保 serializer 有对应实现 |
| `Fetcher` 是配置对象而非接口 | 延续 V1 "声明优于代码" 原则，adapter 作者不需要实现 fetch 逻辑 |
| `V1AdapterBridge` 自动桥接 | 零改动复用 ChatGPT/Claude，保护已有投资 |
| `Participant` 取代硬编码角色 | 支持多人讨论（GitHub）和自定义角色标签（邮件的 From/To/CC） |

### 6.2 我们放弃了什么

| 放弃 | 理由 |
|------|------|
| 运行时 plugin 动态加载 | 一人公司不需要 plugin marketplace，所有 adapter 编译时打包即可。需要时再加 |
| 多步 fetch 的声明式描述 | 声明式无法描述 "先 fetch A，用 A 的结果构建 B 的 URL" 这种依赖关系。GitHub Issue 需要两步 fetch（issue + comments），走 hooks 处理 |
| 完整的 OAuth flow | 复杂度高，PAT 足够覆盖开发者工具（GitHub、GitLab）。类型系统预留位置但不实现 |
| 通用的 DOM scraping engine | DOM 结构千差万别，声明式 scraping 的投入产出比极低。DOM 抓取完全走 hooks |

### 6.3 开放问题

**多步 Fetch**

V1 的 `ADR-HOOK-001` 决定 hooks 不提供 fetch 能力。但 GitHub Issue 需要 issue 正文 + 评论两个 API 调用。两个解决方案：

- **方案 A：Fetcher 链**——manifest 声明 `fetcher: [step1, step2]`，框架依次执行，将所有结果合并后传给 `transformResponse`
- **方案 B：hooks 获得受限 fetch 能力**——`transformResponse` 接收一个 `fetchJson(url)` 工具函数，只能调用同域 API

当前选择 **方案 A**（Fetcher 链），因为它保持了 hooks 的纯函数特性。如果需要，在 V2Manifest 中将 `fetcher` 从单个配置改为数组即可：

```typescript
/** 支持多步 fetch */
fetcher: FetcherConfig | FetcherConfig[];
```

框架按顺序执行，后续步骤可以引用前面步骤的返回值作为变量。

---

## 7. Risks（风险与故障模式）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| ContentBundle 模型不够灵活，遇到新平台需要修改 | 中 | 中 | `meta: Record<string, unknown>` 字段提供 escape hatch；`nodeType` 字段允许 serializer 差异化处理 |
| V1AdapterBridge 引入额外的对象创建开销 | 低 | 低 | Conversation → ContentBundle 转换是纯内存操作，无 I/O，性能影响可忽略 |
| ContentType 枚举需要频繁新增 | 低 | 低 | 新增枚举值是 additive change，不破坏现有代码 |
| 多步 Fetcher 链的依赖关系变复杂 | 中 | 中 | 限制 Fetcher 链最大步数为 3；超过 3 步的场景走全自定义 V2Adapter |
| GraphQL Fetcher 需要平台特定的 query 字符串 | 已确认 | 低 | query 字符串作为 manifest 的一部分，由 adapter 作者编写。框架只负责发送请求 |
| DOM Fetcher 在 SPA 中的 timing 问题 | 中 | 中 | `readySelector` + `readyTimeout` 配置；配合 MutationObserver 等待目标元素出现 |
| 序列化器需要为每种 ContentType 写对应逻辑 | 已确认 | 中 | 初期只实现 `conversation`（复用 V1）和 `thread`（GitHub/SO）。其他类型按需添加 |

### 故障模式分析

```
当 V1AdapterBridge 失败时：
  → 问题一定在 V1 Adapter 内部（bridge 本身是纯转换，无 I/O）
  → 回退：直接使用 V1 Adapter 输出 Conversation，跳过 V2 流程

当 V2 Adapter 的 Fetcher 失败时：
  → REST/GraphQL：标准 HTTP 错误处理（状态码 + 重试）
  → DOM：readyTimeout 超时后抛出明确错误
  → 所有 Fetcher 类型共用同一套错误码体系

当新增 ContentType 没有对应 serializer 时：
  → serializeContentBundle 的 switch 语句会编译报错（TypeScript exhaustive check）
  → 运行时 fallback：将 nodes 按顺序平铺为 Markdown，不做特殊格式化
```

---

## 8. 实施路线

### Phase 1：类型定义（无运行时代码改动）

在 `core-schema` 中新增类型定义，不修改任何现有类型：

- `ContentBundle`、`ContentNode`、`Participant`、`ContentSourceMeta`、`ContentType`
- `conversationToContentBundle()` 转换函数

### Phase 2：V2 Adapter 框架

在 `core-adapters/src/v2/` 中新增：

- `V2Adapter` 接口
- `V2Manifest` schema
- `V2Hooks` 类型
- `FetcherConfig` + fetcher 执行器（先实现 `RestExecutor` 和 `DomExecutor`）
- `V1AdapterBridge`

### Phase 3：第一个非聊天平台 adapter

选择 GitHub Issue 作为 proof-of-concept：

- 实现 `github-issue` adapter
- 实现 `thread` 类型的 serializer
- 端到端验证：GitHub Issue → ContentBundle → Markdown

### Phase 4：browser extension 集成

- V2 registry 替代 V1 registry（兼容层自动处理 V1 adapter）
- `serializeContentBundle()` 接入 clipboard 流程
- UI 根据 `contentType` 显示不同的 copy 选项

### 不做的事

- 不重写现有 ChatGPT/Claude adapter
- 不实现 OAuth flow
- 不实现 GraphQL Fetcher（等到有具体的 GraphQL-only 平台需求时再做）
- 不构建 plugin marketplace

---

> *"There are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies."*
> — C.A.R. Hoare
>
> V2 的目标是前者。`ContentBundle` 是一个简单到显然没有缺陷的数据容器——参与者列表 + 内容节点树 + 元数据。它不试图预测所有未来需求，而是提供一个足够灵活的基础，让每种内容类型的 adapter 和 serializer 可以独立演化。
>
> 关键约束：如果一个新平台需要超过 200 行代码来适配，那说明框架需要改进，而不是 adapter 作者需要更努力。
