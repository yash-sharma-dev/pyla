# ADR: 声明式 Adapter 架构

> 版本：v1.0 | 日期：2026-02-07
> 方法论：Werner Vogels — Everything Fails, API First, Boring Technology
> 前置文档：ADR MVP 架构 (docs/cto/adr-ctxport-mvp-architecture.md)

---

## 0. 问题陈述

### 现状

CtxPort MVP 已完成验收，支持 ChatGPT 和 Claude 两个平台。但当前的 adapter 和 injector 实现存在严重的代码耦合问题：

1. **ChatGPTExtAdapter 和 ClaudeExtAdapter** 硬编码了 API 端点、URL 模式、认证逻辑、会话 ID 提取规则
2. **ChatGPTInjector 和 ClaudeInjector** 硬编码了 CSS 选择器、DOM 结构假设、hover 行为
3. **App.tsx** 硬编码了平台检测逻辑（`detectPlatform()`、`isConversationPage()`）
4. **新增一个平台**需要写约 300 行 adapter + 200 行 injector + 修改 App.tsx + 修改 extension-sites.ts + 修改 registry

这个成本在只有 2 个平台时可以接受，但如果要扩展到 5-10 个 AI 平台（Gemini、Perplexity、Poe、HuggingChat、Grok 等），维护负担将线性增长。

### 决策驱动力

1. **新平台扩展成本太高**：每个平台需要从零写一套 adapter + injector 类
2. **DOM 变化维护成本**：AI 平台频繁改版，硬编码的 CSS 选择器经常失效，修复时需要理解整个 adapter 类
3. **社区贡献门槛高**：贡献者需要理解 TypeScript 类继承体系、BaseExtAdapter 抽象、MutationObserver 模式才能添加新平台
4. **平台间代码高度重复**：对比 ChatGPTInjector 和 ClaudeInjector，约 80% 的结构逻辑相同（创建 container、MutationObserver、hover 事件、cleanup），只有 CSS 选择器和 ID 提取规则不同

### 目标

将 80% 的平台适配工作从 "写代码" 变成 "写配置"，同时保留 20% 的 escape hatch 给需要自定义逻辑的平台。

---

## 1. 架构总览：三层模型

```
┌───────────────────────────────────────────────────────────┐
│                    声明层 (Declaration Layer)               │
│                                                           │
│   adapters/chatgpt.ts    adapters/claude.ts    ...        │
│   AdapterManifest 对象     AdapterManifest 对象             │
│   (URL patterns, API config, CSS selectors, theme)        │
│                                                           │
│   ──── 80% 的平台用纯配置覆盖 ────                          │
├───────────────────────────────────────────────────────────┤
│                    脚本层 (Script Layer)                    │
│                                                           │
│   hooks: { extractAuth, transformResponse,                │
│            extractConversationId, ... }                    │
│                                                           │
│   ──── 20% 的平台用钩子补充自定义逻辑 ────                    │
├───────────────────────────────────────────────────────────┤
│                    核心层 (Core Layer)                      │
│                                                           │
│   ManifestAdapter (通用 adapter 引擎)                      │
│   ManifestInjector (通用 injector 引擎)                    │
│   AdapterManifestSchema (Zod 验证)                        │
│   Registry (manifest 注册与匹配)                           │
│                                                           │
│   ──── 我们维护，平台适配者不需要关心 ────                    │
└───────────────────────────────────────────────────────────┘
```

**关键原则**：

- 声明层是纯数据（TypeScript 对象，不是 JSON/YAML 文件），享受类型检查和 IDE 补全
- 脚本层的钩子是可选的纯函数，有明确的输入/输出类型约束
- 核心层提供运行时引擎，将声明 + 钩子组合成可工作的 adapter

---

## 2. Adapter Manifest Schema

### 2.1 完整 Schema 定义

```typescript
// packages/core-adapters/src/manifest/schema.ts

import { z } from "zod";

// ─── 平台识别 ───

const UrlPatternConfig = z.object({
  /** 宿主页面匹配模式（用于 content_scripts.matches） */
  hostPermissions: z.array(z.string()),
  /** 宿主页面正则（运行时匹配） */
  hostPatterns: z.array(z.instanceof(RegExp)),
  /** 会话页面 URL 正则 */
  conversationUrlPatterns: z.array(z.instanceof(RegExp)),
});

// ─── 认证配置 ───

const AuthMethod = z.enum([
  "cookie-session",     // 依赖浏览器 cookie（如 ChatGPT、Claude）
  "bearer-from-api",    // 从 session API 获取 bearer token（如 ChatGPT）
  "none",               // 无认证（公开 API）
]);

const AuthConfig = z.object({
  method: AuthMethod,

  /** bearer-from-api 模式的配置 */
  sessionEndpoint: z.string().url().optional(),
  /** 从 session 响应中提取 token 的 JSON path */
  tokenPath: z.string().optional(),
  /** 从 session 响应中提取过期时间的 JSON path */
  expiresPath: z.string().optional(),
  /** token 缓存 TTL（毫秒），默认 10 分钟 */
  tokenTtlMs: z.number().positive().optional(),
});

// ─── 数据获取配置 ───

const ConversationEndpoint = z.object({
  /**
   * URL 模板，支持变量替换：
   * - {conversationId} — 从 URL 提取的会话 ID
   * - {orgId} — 从 cookie/DOM 提取的组织 ID（可选）
   * 示例："https://chatgpt.com/backend-api/conversation/{conversationId}"
   */
  urlTemplate: z.string(),

  method: z.enum(["GET", "POST"]).default("GET"),

  /** 额外的请求头 */
  headers: z.record(z.string()).optional(),

  /** query 参数模板 */
  queryParams: z.record(z.string()).optional(),

  /** POST body 模板 */
  bodyTemplate: z.unknown().optional(),

  /** 请求选项 */
  credentials: z.enum(["include", "omit", "same-origin"]).default("include"),
  cache: z
    .enum(["default", "no-store", "no-cache", "reload"])
    .default("no-store"),
  referrerTemplate: z.string().optional(),
});

// ─── 消息解析规则 ───

const RoleMapping = z.object({
  /** 从原始数据中哪个字段读取角色 */
  field: z.string(),
  /** 角色值映射：原始值 → "user" | "assistant" */
  mapping: z.record(z.enum(["user", "assistant", "skip"])),
});

const ContentExtraction = z.object({
  /** 消息数组的 JSON path，支持 "." 分隔的路径 */
  messagesPath: z.string(),
  /** 排序字段的 JSON path（相对于单条消息） */
  sortField: z.string().optional(),
  /** 排序方向 */
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  /** 文本内容的 JSON path（相对于单条消息） */
  textPath: z.string(),
  /** 标题的 JSON path（相对于顶层响应） */
  titlePath: z.string().optional(),
});

const MessageParseConfig = z.object({
  role: RoleMapping,
  content: ContentExtraction,
});

// ─── UI 注入配置 ───

const SelectorFallbacks = z.object({
  /** 按优先级排列的 CSS 选择器列表，匹配到第一个即停止 */
  selectors: z.array(z.string()),
  /** 注入位置 */
  position: z
    .enum(["prepend", "append", "before", "after"])
    .default("prepend"),
});

const ListItemConfig = z.object({
  /** 列表项链接的选择器 */
  linkSelector: z.string(),
  /** 从 href 中提取会话 ID 的正则（第一个捕获组） */
  idPattern: z.instanceof(RegExp),
  /** 列表容器选择器（MutationObserver 观察目标） */
  containerSelector: z.string().optional(),
});

const InjectionConfig = z.object({
  /** 会话详情页标题栏的复制按钮位置 */
  copyButton: SelectorFallbacks,
  /** 侧边栏列表配置 */
  listItem: ListItemConfig,
  /** 主内容区选择器（观察 copy button 注入时机） */
  mainContentSelector: z.string().optional(),
  /** 侧边栏选择器（观察 list item 注入时机） */
  sidebarSelector: z.string().optional(),
});

// ─── 主题配置 ───

const ThemeTokens = z.object({
  primary: z.string(),
  secondary: z.string(),
  primaryForeground: z.string(),
  secondaryForeground: z.string(),
});

const ThemeConfig = z.object({
  light: ThemeTokens,
  dark: ThemeTokens.optional(),
});

// ─── 跳过/过滤规则 ───

const MessageFilter = z.object({
  /** 应该跳过的消息条件（字段路径 → 值匹配） */
  skipWhen: z
    .array(
      z.object({
        field: z.string(),
        equals: z.unknown().optional(),
        exists: z.boolean().optional(),
        matchesPattern: z.string().optional(),
      }),
    )
    .optional(),
});

// ─── 元数据 ───

const ManifestMeta = z.object({
  /** 可靠性等级：声明式解析的预期成功率 */
  reliability: z.enum(["high", "medium", "low"]),
  /** 覆盖范围说明 */
  coverage: z.string().optional(),
  /** 最后验证日期 */
  lastVerified: z.string().optional(),
  /** 已知限制 */
  knownLimitations: z.array(z.string()).optional(),
});

// ═══ 顶层 Manifest ═══

export const AdapterManifestSchema = z.object({
  /** 唯一标识符，如 "chatgpt-ext"、"claude-ext" */
  id: z.string(),
  /** 版本号，语义化版本 */
  version: z.string(),
  /** 人类可读名称 */
  name: z.string(),
  /** Provider 标识 */
  provider: z.string(),

  /** 平台识别配置 */
  urls: UrlPatternConfig,
  /** 认证配置 */
  auth: AuthConfig,
  /** 会话数据获取端点 */
  endpoint: ConversationEndpoint,
  /** 消息解析规则 */
  parsing: MessageParseConfig,
  /** UI 注入配置 */
  injection: InjectionConfig,
  /** 主题配置 */
  theme: ThemeConfig,
  /** 消息过滤规则 */
  filters: MessageFilter.optional(),
  /** 元数据 */
  meta: ManifestMeta.optional(),
});

export type AdapterManifest = z.infer<typeof AdapterManifestSchema>;
```

### 2.2 Schema 设计决策

**ADR-MANIFEST-001：使用 TypeScript 对象而非 JSON/YAML 文件**

- **决定**：Manifest 以 TypeScript 对象（`satisfies AdapterManifest`）方式定义，不使用外部 JSON/YAML 文件
- **理由**：
  - TypeScript 对象享受完整的类型检查、IDE 自动补全、重构支持
  - 可以直接使用 `RegExp` 字面量，不需要从字符串反序列化正则
  - 钩子函数可以在同一文件中 co-locate，不需要额外的关联机制
  - 构建时 tree-shaking 可以排除未使用的平台
- **取舍**：非开发者无法直接编辑 JSON 配置文件来添加新平台，但 CtxPort 的目标贡献者是开发者，这不是问题

**ADR-MANIFEST-002：URL 模板使用简单字符串替换而非模板引擎**

- **决定**：`urlTemplate` 只支持 `{variableName}` 替换，不引入 Handlebars/EJS 等模板引擎
- **理由**：
  - 当前所有平台的 API URL 都是简单的路径参数替换，不需要条件逻辑
  - 简单字符串替换可以用 10 行代码实现，零依赖
  - 如果未来有平台需要复杂 URL 构建，走脚本层的 `buildRequestUrl` 钩子
- **风险**：如果某平台需要 URL 中包含查询参数的动态计算，简单替换不够
- **缓解**：`queryParams` 字段支持静态参数；动态参数通过 `hooks.buildRequestUrl` 处理

**ADR-MANIFEST-003：JSON Path 使用点号分隔的简单路径**

- **决定**：`messagesPath`、`textPath` 等字段使用 `"chat_messages"` 或 `"message.content.text"` 这样的点号路径，不引入 JSONPath 标准库
- **理由**：
  - 当前平台的 API 响应结构都很扁平，点号路径足够
  - JSONPath 标准库（jsonpath-plus 等）增加约 15KB 依赖，对扩展包体积是浪费
  - 自实现一个 `getByPath(obj, "a.b.c")` 工具函数只需 5 行
- **取舍**：不支持数组索引（`a[0].b`）、通配符（`a.*.b`）等高级 JSONPath 特性
- **缓解**：复杂响应结构通过脚本层的 `transformResponse` 钩子预处理

---

## 3. 脚本层：钩子接口

### 3.1 钩子类型定义

```typescript
// packages/core-adapters/src/manifest/hooks.ts

import type { RawMessage } from "../base";

/**
 * 钩子函数的运行时上下文。
 * 框架注入，钩子只读访问。
 */
export interface HookContext {
  /** 当前页面 URL */
  url: string;
  /** 当前页面 document 对象（仅 ext 模式可用） */
  document: Document;
  /** 从 manifest.urls 提取的会话 ID */
  conversationId: string;
  /** manifest 中声明的 provider */
  provider: string;
}

/**
 * Adapter 生命周期钩子。
 * 所有钩子都是可选的。
 * 钩子是纯函数（或 async 纯函数），不应有副作用。
 */
export interface AdapterHooks {
  // ─── 认证阶段 ───

  /**
   * 从浏览器环境提取认证信息。
   * 用于 cookie 中的 org ID、localStorage 中的 token 等。
   *
   * 返回 key-value 对，会被注入到 URL 模板和请求头中。
   * 例如 ChatGPT 不需要此钩子（bearer token 由框架从 sessionEndpoint 获取）；
   * Claude 需要此钩子提取 cookie 中的 orgId。
   */
  extractAuth?: (ctx: HookContext) => Record<string, string> | null;

  // ─── 请求阶段 ───

  /**
   * 自定义会话 ID 提取逻辑。
   * 默认行为：从 URL 中用正则提取。
   * 当 URL 结构复杂时（如多段路径、编码参数），用此钩子覆盖。
   */
  extractConversationId?: (url: string) => string | null;

  /**
   * 自定义请求 URL 构建。
   * 当 urlTemplate + 简单替换不够用时（如需要动态 query 参数）。
   * 返回完整 URL 字符串。
   */
  buildRequestUrl?: (
    ctx: HookContext & { templateVars: Record<string, string> },
  ) => string;

  // ─── 响应阶段 ───

  /**
   * 在标准解析之前预处理 API 响应。
   * 用于：
   * - 响应结构不规则，需要先 normalize
   * - 树状消息结构需要先线性化（如 ChatGPT 的 mapping → linear）
   * - 需要从响应中提取额外的元数据
   *
   * 返回 transformed 后的数据，后续由框架按 manifest.parsing 规则解析。
   */
  transformResponse?: (
    raw: unknown,
    ctx: HookContext,
  ) => { data: unknown; title?: string };

  /**
   * 自定义单条消息的文本提取。
   * 当消息内容结构复杂（如 ChatGPT 的 parts 数组含多种类型）时使用。
   * 默认行为：按 manifest.parsing.content.textPath 提取。
   */
  extractMessageText?: (rawMessage: unknown, ctx: HookContext) => string;

  /**
   * 在标准解析之后对消息列表做后处理。
   * 用于：
   * - 合并连续同角色消息
   * - 去重
   * - artifact 标签标准化
   */
  afterParse?: (messages: RawMessage[], ctx: HookContext) => RawMessage[];
}
```

### 3.2 钩子安全边界

**钩子能访问什么：**
- `HookContext` 中的只读属性（url、document、conversationId、provider）
- 传入的原始数据（API 响应、消息对象）
- 标准 Web API（`document.cookie`、`URL`、`RegExp` 等）

**钩子不能访问什么：**
- 不能发起网络请求（`fetch` 不在 context 中）——所有网络请求由框架统一发起
- 不能修改 DOM（document 是只读引用，用于提取信息，不用于注入）
- 不能访问 extension API（`chrome.runtime`、`chrome.storage` 等）
- 不能访问其他 adapter 的数据或状态

**ADR-HOOK-001：钩子不提供 fetch 能力**

- **决定**：钩子函数不接收 `fetch` 引用，所有网络请求由核心层发起
- **理由**：
  - 防止钩子变成"小爬虫"，向任意 URL 发送请求
  - 核心层统一管理请求，便于添加超时、重试、错误处理
  - 核心层可以在请求前后添加监控和日志
- **取舍**：如果某平台需要多步 API 调用（先获取列表再获取详情），声明层无法描述，需要用更重的自定义 adapter
- **缓解**：`transformResponse` 钩子可以处理单次请求的响应，满足大多数场景；极少数多步场景走传统的类继承方式

### 3.3 钩子与声明层的关系

```
声明层的配置  ──┐
                ├──→  核心层引擎组合  ──→  可工作的 adapter
脚本层的钩子  ──┘

优先级规则：
- 如果 manifest 中声明了规则，且对应钩子也存在，钩子优先
- 如果钩子返回 null/undefined，回退到 manifest 声明的规则
- 如果 manifest 也没有声明，使用核心层的默认行为
```

---

## 4. 核心层：运行时引擎

### 4.1 ManifestAdapter — 通用 Adapter 引擎

```typescript
// packages/core-adapters/src/manifest/manifest-adapter.ts

import type {
  Adapter,
  AdapterInput,
  Conversation,
  ExtInput,
  Provider,
} from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import { buildConversation, type RawMessage } from "../base";
import type { AdapterManifest } from "./schema";
import type { AdapterHooks, HookContext } from "./hooks";
import { getByPath } from "./utils";

export class ManifestAdapter implements Adapter {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly supportedInputTypes = ["ext"] as const;

  private readonly manifest: AdapterManifest;
  private readonly hooks: AdapterHooks;

  // bearer token 缓存（仅 bearer-from-api 模式）
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private tokenPromise: Promise<string> | null = null;

  constructor(manifest: AdapterManifest, hooks: AdapterHooks = {}) {
    this.manifest = manifest;
    this.hooks = hooks;
    this.id = manifest.id;
    this.version = manifest.version;
    this.name = manifest.name;
  }

  canHandle(input: AdapterInput): boolean {
    if (input.type !== "ext") return false;
    return this.manifest.urls.conversationUrlPatterns.some((p) =>
      p.test(input.url),
    );
  }

  async parse(input: AdapterInput): Promise<Conversation> {
    if (input.type !== "ext") {
      throw new Error(`${this.name} only handles ext input`);
    }

    const extInput = input as ExtInput;
    const conversationId = this.extractConversationId(extInput.url);
    if (!conversationId) {
      throw createAppError("E-PARSE-001", `Invalid conversation URL for ${this.name}`);
    }

    const ctx: HookContext = {
      url: extInput.url,
      document: extInput.document,
      conversationId,
      provider: this.manifest.provider,
    };

    // 1. 获取认证信息
    const authVars = this.resolveAuth(ctx);

    // 2. 构建请求
    const templateVars = { conversationId, ...authVars };
    const requestUrl = this.buildRequestUrl(ctx, templateVars);
    const headers = this.buildHeaders(authVars);

    // 3. 发起请求
    const response = await this.fetchConversation(requestUrl, headers);

    // 4. 解析响应
    const { rawMessages, title } = this.parseResponse(response, ctx);

    if (rawMessages.length === 0) {
      throw createAppError(
        "E-PARSE-005",
        `No messages found. ${this.name} API response may have changed.`,
      );
    }

    // 5. 构建 Conversation
    return buildConversation(rawMessages, {
      sourceType: "extension-current",
      provider: this.manifest.provider as Provider,
      adapterId: this.id,
      adapterVersion: this.version,
      title,
      url: extInput.url,
    });
  }

  // ─── 内部方法 ───

  private extractConversationId(url: string): string | null {
    if (this.hooks.extractConversationId) {
      return this.hooks.extractConversationId(url);
    }
    // 默认：用 conversationUrlPatterns 中第一个带捕获组的正则
    for (const pattern of this.manifest.urls.conversationUrlPatterns) {
      const match = pattern.exec(url);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private resolveAuth(ctx: HookContext): Record<string, string> {
    if (this.hooks.extractAuth) {
      return this.hooks.extractAuth(ctx) ?? {};
    }
    return {};
  }

  private buildRequestUrl(
    ctx: HookContext,
    templateVars: Record<string, string>,
  ): string {
    if (this.hooks.buildRequestUrl) {
      return this.hooks.buildRequestUrl({ ...ctx, templateVars });
    }

    let url = this.manifest.endpoint.urlTemplate;
    for (const [key, value] of Object.entries(templateVars)) {
      url = url.replace(`{${key}}`, encodeURIComponent(value));
    }

    const params = this.manifest.endpoint.queryParams;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        let resolved = value;
        for (const [varKey, varValue] of Object.entries(templateVars)) {
          resolved = resolved.replace(`{${varKey}}`, varValue);
        }
        searchParams.set(key, resolved);
      }
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  private buildHeaders(
    authVars: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.manifest.endpoint.headers,
    };

    if (this.manifest.auth.method === "bearer-from-api" && authVars._bearerToken) {
      headers["Authorization"] = `Bearer ${authVars._bearerToken}`;
    }

    return headers;
  }

  private async fetchConversation(
    url: string,
    headers: Record<string, string>,
  ): Promise<unknown> {
    const { endpoint } = this.manifest;
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      credentials: endpoint.credentials,
      cache: endpoint.cache,
      referrer: endpoint.referrerTemplate
        ? endpoint.referrerTemplate
        : undefined,
    });

    if (!response.ok) {
      // bearer token 模式下，401 时自动重试
      if (
        response.status === 401 &&
        this.manifest.auth.method === "bearer-from-api"
      ) {
        this.tokenCache = null;
        const freshToken = await this.getAccessToken(true);
        headers["Authorization"] = `Bearer ${freshToken}`;
        const retryResponse = await fetch(url, {
          method: endpoint.method,
          headers,
          credentials: endpoint.credentials,
          cache: endpoint.cache,
        });
        if (!retryResponse.ok) {
          throw createAppError(
            "E-PARSE-005",
            `${this.name} API responded with ${retryResponse.status}`,
          );
        }
        return retryResponse.json();
      }

      throw createAppError(
        "E-PARSE-005",
        `${this.name} API responded with ${response.status}`,
      );
    }

    return response.json();
  }

  private parseResponse(
    raw: unknown,
    ctx: HookContext,
  ): { rawMessages: RawMessage[]; title?: string } {
    // 1. transformResponse 钩子：预处理（如树状 → 线性化）
    let data: unknown = raw;
    let hookTitle: string | undefined;
    if (this.hooks.transformResponse) {
      const result = this.hooks.transformResponse(raw, ctx);
      data = result.data;
      hookTitle = result.title;
    }

    // 2. 提取标题
    const { parsing } = this.manifest;
    const title =
      hookTitle ??
      (parsing.content.titlePath
        ? getByPath(data, parsing.content.titlePath)
        : undefined);

    // 3. 提取消息列表
    const rawMessageList = getByPath(data, parsing.content.messagesPath);
    if (!Array.isArray(rawMessageList)) {
      return { rawMessages: [], title };
    }

    // 4. 排序
    let sorted = rawMessageList;
    if (parsing.content.sortField) {
      const field = parsing.content.sortField;
      const order = parsing.content.sortOrder;
      sorted = [...rawMessageList].sort((a, b) => {
        const va = getByPath(a, field) ?? 0;
        const vb = getByPath(b, field) ?? 0;
        return order === "asc"
          ? (va as number) - (vb as number)
          : (vb as number) - (va as number);
      });
    }

    // 5. 过滤 + 解析每条消息
    const messages: RawMessage[] = [];
    for (const rawMsg of sorted) {
      // 过滤规则
      if (this.shouldSkip(rawMsg)) continue;

      // 角色映射
      const roleValue = getByPath(rawMsg, parsing.role.field);
      const mappedRole = parsing.role.mapping[String(roleValue)];
      if (!mappedRole || mappedRole === "skip") continue;

      // 内容提取
      let text: string;
      if (this.hooks.extractMessageText) {
        text = this.hooks.extractMessageText(rawMsg, ctx);
      } else {
        text = String(getByPath(rawMsg, parsing.content.textPath) ?? "");
      }

      if (!text.trim()) continue;

      messages.push({ role: mappedRole, content: text });
    }

    // 6. afterParse 钩子
    const finalMessages = this.hooks.afterParse
      ? this.hooks.afterParse(messages, ctx)
      : messages;

    return { rawMessages: finalMessages, title };
  }

  private shouldSkip(rawMsg: unknown): boolean {
    const rules = this.manifest.filters?.skipWhen;
    if (!rules || rules.length === 0) return false;

    for (const rule of rules) {
      const value = getByPath(rawMsg, rule.field);

      if (rule.equals !== undefined && value === rule.equals) return true;
      if (rule.exists === true && value != null) return true;
      if (rule.exists === false && value == null) return true;
      if (
        rule.matchesPattern &&
        typeof value === "string" &&
        new RegExp(rule.matchesPattern).test(value)
      ) {
        return true;
      }
    }

    return false;
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.tokenCache) {
      const ttl = this.manifest.auth.tokenTtlMs ?? 600_000;
      if (this.tokenCache.expiresAt - 60_000 > Date.now()) {
        return this.tokenCache.token;
      }
    }

    if (!this.tokenPromise) {
      this.tokenPromise = this.fetchAccessToken().finally(() => {
        this.tokenPromise = null;
      });
    }

    return this.tokenPromise;
  }

  private async fetchAccessToken(): Promise<string> {
    const { auth } = this.manifest;
    if (!auth.sessionEndpoint) {
      throw createAppError("E-PARSE-005", "No session endpoint configured");
    }

    const response = await fetch(auth.sessionEndpoint, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw createAppError(
        "E-PARSE-005",
        `Session API responded with ${response.status}`,
      );
    }

    const session = await response.json();
    const token = auth.tokenPath
      ? getByPath(session, auth.tokenPath)
      : undefined;

    if (!token || typeof token !== "string") {
      throw createAppError(
        "E-PARSE-005",
        "Cannot retrieve access token from session",
      );
    }

    const expiresAt = auth.expiresPath
      ? Date.parse(String(getByPath(session, auth.expiresPath) ?? ""))
      : Date.now() + (auth.tokenTtlMs ?? 600_000);

    this.tokenCache = {
      token,
      expiresAt: Number.isFinite(expiresAt)
        ? expiresAt
        : Date.now() + (auth.tokenTtlMs ?? 600_000),
    };

    return token;
  }
}
```

### 4.2 ManifestInjector — 通用 Injector 引擎

```typescript
// apps/browser-extension/src/injectors/manifest-injector.ts

import type { AdapterManifest } from "@ctxport/core-adapters/manifest/schema";
import {
  type PlatformInjector,
  markInjected,
  isInjected,
  createContainer,
  removeAllByClass,
  debouncedObserverCallback,
  INJECTION_DELAY_MS,
} from "./base-injector";

/**
 * 通用 injector：从 manifest.injection 配置驱动 DOM 注入。
 * 替代平台特定的 ChatGPTInjector / ClaudeInjector。
 */
export class ManifestInjector implements PlatformInjector {
  readonly platform: string;
  private observers: MutationObserver[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private renderButton: ((container: HTMLElement) => void) | null = null;
  private renderIcon:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;
  private renderCheckbox:
    | ((container: HTMLElement, conversationId: string) => void)
    | null = null;

  private readonly copyBtnClass: string;
  private readonly listIconClass: string;
  private readonly batchCbClass: string;

  constructor(private readonly manifest: AdapterManifest) {
    this.platform = manifest.provider;
    this.copyBtnClass = `ctxport-${manifest.provider}-copy-btn`;
    this.listIconClass = `ctxport-${manifest.provider}-list-icon`;
    this.batchCbClass = `ctxport-${manifest.provider}-batch-cb`;
  }

  injectCopyButton(renderButton: (container: HTMLElement) => void): void {
    this.renderButton = renderButton;

    const timer = setTimeout(() => {
      this.tryInjectCopyButton();
      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectCopyButton(),
      );
      const targetSel = this.manifest.injection.mainContentSelector;
      const target = targetSel
        ? document.querySelector(targetSel)
        : document.querySelector("main") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(target ?? document.body, {
        childList: true,
        subtree: true,
      });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectCopyButton(): void {
    if (!this.renderButton) return;

    const { selectors, position } = this.manifest.injection.copyButton;
    for (const selector of selectors) {
      const target = document.querySelector<HTMLElement>(selector);
      if (target && !isInjected(target, "copy-btn")) {
        const container = createContainer(`ctxport-copy-btn-${Date.now()}`);
        container.className = this.copyBtnClass;

        switch (position) {
          case "prepend":
            target.insertBefore(container, target.firstChild);
            break;
          case "append":
            target.appendChild(container);
            break;
          case "before":
            target.parentElement?.insertBefore(container, target);
            break;
          case "after":
            target.parentElement?.insertBefore(container, target.nextSibling);
            break;
        }

        markInjected(target, "copy-btn");
        this.renderButton(container);
        return;
      }
    }
  }

  injectListIcons(
    renderIcon: (container: HTMLElement, conversationId: string) => void,
  ): void {
    this.renderIcon = renderIcon;

    const timer = setTimeout(() => {
      this.tryInjectListIcons();
      const debouncedTry = debouncedObserverCallback(() =>
        this.tryInjectListIcons(),
      );
      const sidebarSel = this.manifest.injection.sidebarSelector;
      const sidebar = sidebarSel
        ? document.querySelector(sidebarSel)
        : document.querySelector("nav") ?? document.body;
      const observer = new MutationObserver(debouncedTry);
      observer.observe(sidebar ?? document.body, {
        childList: true,
        subtree: true,
      });
      this.observers.push(observer);
    }, INJECTION_DELAY_MS);
    this.timers.push(timer);
  }

  private tryInjectListIcons(): void {
    if (!this.renderIcon) return;

    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "list-icon")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = listItem.idPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-list-icon-${id}`);
      container.className = this.listIconClass;
      container.style.position = "absolute";
      container.style.right = "36px";
      container.style.top = "50%";
      container.style.transform = "translateY(-50%)";
      container.style.opacity = "0";
      container.style.transition = "opacity 150ms ease";
      container.style.zIndex = "10";

      const parent = link.closest("li") ?? link.closest("div") ?? link;
      if (parent instanceof HTMLElement) {
        const computed = getComputedStyle(parent);
        if (computed.position === "static") {
          parent.style.position = "relative";
        }
        parent.appendChild(container);
        parent.addEventListener("mouseenter", () => {
          container.style.opacity = "1";
        });
        parent.addEventListener("mouseleave", () => {
          container.style.opacity = "0";
        });
      }

      markInjected(link, "list-icon");
      this.renderIcon(container, id);
    }
  }

  injectBatchCheckboxes(
    renderCheckbox: (container: HTMLElement, conversationId: string) => void,
  ): void {
    this.renderCheckbox = renderCheckbox;
    this.tryInjectBatchCheckboxes();

    const debouncedTry = debouncedObserverCallback(() =>
      this.tryInjectBatchCheckboxes(),
    );
    const sidebarSel = this.manifest.injection.sidebarSelector;
    const sidebar = sidebarSel
      ? document.querySelector(sidebarSel)
      : document.querySelector("nav") ?? document.body;
    const observer = new MutationObserver(debouncedTry);
    observer.observe(sidebar ?? document.body, {
      childList: true,
      subtree: true,
    });
    this.observers.push(observer);
  }

  private tryInjectBatchCheckboxes(): void {
    if (!this.renderCheckbox) return;

    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
    );

    for (const link of links) {
      if (isInjected(link, "batch-cb")) continue;

      const href = link.getAttribute("href");
      if (!href) continue;
      const match = listItem.idPattern.exec(href);
      const id = match?.[1];
      if (!id) continue;

      const container = createContainer(`ctxport-batch-cb-${id}`);
      container.className = this.batchCbClass;
      container.style.marginRight = "4px";
      container.style.flexShrink = "0";

      link.insertBefore(container, link.firstChild);
      markInjected(link, "batch-cb");
      this.renderCheckbox(container, id);
    }
  }

  removeBatchCheckboxes(): void {
    removeAllByClass(this.batchCbClass);
    const { listItem } = this.manifest.injection;
    const links = document.querySelectorAll<HTMLAnchorElement>(
      listItem.linkSelector,
    );
    for (const link of links) {
      if (link.getAttribute("data-ctxport-injected") === "batch-cb") {
        link.removeAttribute("data-ctxport-injected");
      }
    }
  }

  cleanup(): void {
    for (const obs of this.observers) obs.disconnect();
    this.observers = [];
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    removeAllByClass(this.copyBtnClass);
    removeAllByClass(this.listIconClass);
    removeAllByClass(this.batchCbClass);
    this.renderButton = null;
    this.renderIcon = null;
    this.renderCheckbox = null;
  }
}
```

### 4.3 工具函数

```typescript
// packages/core-adapters/src/manifest/utils.ts

/**
 * 从嵌套对象中按点号路径提取值。
 * 示例：getByPath({ a: { b: "hello" } }, "a.b") → "hello"
 */
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * URL 模板简单替换。
 * 将 {key} 替换为对应值。
 */
export function resolveTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      encodeURIComponent(value),
    );
  }
  return result;
}
```

### 4.4 Manifest Registry — adapter 注册与匹配

```typescript
// packages/core-adapters/src/manifest/registry.ts

import type { AdapterManifest } from "./schema";
import type { AdapterHooks } from "./hooks";
import { ManifestAdapter } from "./manifest-adapter";
import { registerAdapter } from "../registry";

export interface ManifestEntry {
  manifest: AdapterManifest;
  hooks?: AdapterHooks;
}

/**
 * 从 manifest + hooks 创建并注册 adapter。
 */
export function registerManifestAdapter(entry: ManifestEntry): ManifestAdapter {
  const adapter = new ManifestAdapter(entry.manifest, entry.hooks);
  registerAdapter(adapter);
  return adapter;
}

/**
 * 批量注册。
 */
export function registerManifestAdapters(
  entries: ManifestEntry[],
): ManifestAdapter[] {
  return entries.map(registerManifestAdapter);
}
```

---

## 5. 现有平台迁移示例

### 5.1 ChatGPT Manifest

```typescript
// packages/core-adapters/src/adapters/chatgpt/manifest.ts

import type { AdapterManifest } from "../../manifest/schema";
import type { AdapterHooks } from "../../manifest/hooks";
import { convertShareDataToMessages } from "./shared/message-converter";
import type { MessageNode, ShareData } from "./shared/types";

// ─── 声明层 ───

export const chatgptManifest = {
  id: "chatgpt-ext",
  version: "2.0.0",
  name: "ChatGPT Extension Parser",
  provider: "chatgpt",

  urls: {
    hostPermissions: [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
    ],
    hostPatterns: [
      /^https:\/\/chatgpt\.com\//i,
      /^https:\/\/chat\.openai\.com\//i,
    ],
    conversationUrlPatterns: [
      /^https?:\/\/(?:chat\.openai\.com|chatgpt\.com)\/c\/([a-zA-Z0-9-]+)/,
    ],
  },

  auth: {
    method: "bearer-from-api" as const,
    sessionEndpoint: "https://chatgpt.com/api/auth/session",
    tokenPath: "accessToken",
    expiresPath: "expires",
    tokenTtlMs: 600_000,
  },

  endpoint: {
    urlTemplate:
      "https://chatgpt.com/backend-api/conversation/{conversationId}",
    method: "GET" as const,
    credentials: "include" as const,
    cache: "no-store" as const,
  },

  parsing: {
    role: {
      field: "message.author.role",
      mapping: {
        user: "user" as const,
        assistant: "assistant" as const,
        tool: "assistant" as const,
        system: "skip" as const,
      },
    },
    content: {
      messagesPath: "_linearMessages",  // 由 transformResponse 生成
      textPath: "_extractedText",       // 由 extractMessageText 处理
      titlePath: "title",
      sortField: "message.create_time",
      sortOrder: "asc" as const,
    },
  },

  injection: {
    copyButton: {
      selectors: [
        "main .sticky .flex.items-center.gap-2",
        'main header [class*="flex"][class*="items-center"]',
        'div[data-testid="conversation-header"] .flex.items-center',
      ],
      position: "prepend" as const,
    },
    listItem: {
      linkSelector: 'nav a[href^="/c/"], nav a[href^="/g/"]',
      idPattern: /\/(?:c|g)\/([a-zA-Z0-9-]+)$/,
      containerSelector: "nav",
    },
    mainContentSelector: "main",
    sidebarSelector: "nav",
  },

  theme: {
    light: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      primaryForeground: "#ffffff",
      secondaryForeground: "#ffffff",
    },
    dark: {
      primary: "#0d0d0d",
      secondary: "#5d5d5d",
      primaryForeground: "#ffffff",
      secondaryForeground: "#ffffff",
    },
  },

  filters: {
    skipWhen: [
      { field: "message.content.content_type", equals: "thoughts" },
      { field: "message.content.content_type", equals: "code" },
      { field: "message.metadata.is_visually_hidden_from_conversation", equals: true },
      { field: "message.metadata.is_redacted", equals: true },
      { field: "message.metadata.is_user_system_message", equals: true },
    ],
  },

  meta: {
    reliability: "high" as const,
    coverage: "ChatGPT 全部对话类型（含 GPT-4, o1, Canvas 等）",
    lastVerified: "2026-02-07",
    knownLimitations: [
      "ChatGPT API 限速后需要等待",
      "DALL-E 图片仅保留 alt 文本描述",
    ],
  },
} satisfies AdapterManifest;

// ─── 脚本层 ───

/**
 * ChatGPT 需要钩子的原因：
 * 1. API 响应是树状 mapping 结构，需要先线性化
 * 2. 消息内容是复杂的 parts 数组，需要自定义提取
 */
export const chatgptHooks: AdapterHooks = {
  /**
   * ChatGPT 的 API 返回树状 mapping，需要线性化为消息数组。
   */
  transformResponse(raw: unknown) {
    const data = raw as {
      title?: string;
      mapping?: Record<string, MessageNode>;
      current_node?: string;
    };

    const mapping = data.mapping ?? {};
    const linear = buildLinearConversation(mapping, data.current_node);
    const linearMessages = linear
      .map((id) => mapping[id])
      .filter(Boolean);

    return {
      data: { ...data, _linearMessages: linearMessages },
      title: data.title,
    };
  },

  /**
   * ChatGPT 消息的 content 结构复杂（parts 数组含文本、图片、代码等），
   * 需要专用的 content flattener。
   */
  async extractMessageText(rawMessage: unknown) {
    const node = rawMessage as MessageNode;
    if (!node.message?.content) return "";

    // 复用现有的 flattenMessageContent
    const { flattenMessageContent } = await import(
      "./shared/content-flatteners"
    );
    const { stripCitationTokens } = await import("./shared/text-processor");

    let text = await flattenMessageContent(node.message.content, {});
    text = stripCitationTokens(text);
    return text;
  },
};

// ─── 辅助函数（从现有 adapter 直接迁移） ───

function buildLinearConversation(
  mapping: Record<string, MessageNode>,
  currentNodeId?: string,
): string[] {
  if (currentNodeId && mapping[currentNodeId]) {
    const ids: string[] = [];
    let nodeId: string | undefined = currentNodeId;
    const visited = new Set<string>();

    while (nodeId && !visited.has(nodeId)) {
      visited.add(nodeId);
      ids.push(nodeId);
      nodeId = mapping[nodeId]?.parent;
    }

    return ids.reverse();
  }

  const nodes = Object.values(mapping)
    .filter((node): node is MessageNode & { id: string } => Boolean(node?.id))
    .sort(
      (a, b) =>
        (a.message?.create_time ?? 0) - (b.message?.create_time ?? 0),
    );

  return nodes.map((node) => node.id);
}
```

### 5.2 Claude Manifest

```typescript
// packages/core-adapters/src/adapters/claude/manifest.ts

import type { AdapterManifest } from "../../manifest/schema";
import type { AdapterHooks } from "../../manifest/hooks";
import {
  extractClaudeMessageText,
} from "./shared/message-converter";
import type { ClaudeMessage } from "./shared/types";

// ─── 声明层 ───

export const claudeManifest = {
  id: "claude-ext",
  version: "2.0.0",
  name: "Claude Extension Parser",
  provider: "claude",

  urls: {
    hostPermissions: ["https://claude.ai/*"],
    hostPatterns: [/^https:\/\/claude\.ai\//i],
    conversationUrlPatterns: [
      /^https?:\/\/claude\.ai\/chat\/([a-zA-Z0-9-]+)/,
    ],
  },

  auth: {
    method: "cookie-session" as const,
  },

  endpoint: {
    urlTemplate:
      "https://claude.ai/api/organizations/{orgId}/chat_conversations/{conversationId}",
    method: "GET" as const,
    queryParams: {
      tree: "True",
      rendering_mode: "messages",
      render_all_tools: "true",
    },
    credentials: "include" as const,
    cache: "no-store" as const,
    referrerTemplate: "https://claude.ai/chat/{conversationId}",
  },

  parsing: {
    role: {
      field: "sender",
      mapping: {
        human: "user" as const,
        assistant: "assistant" as const,
      },
    },
    content: {
      messagesPath: "chat_messages",
      textPath: "_extractedText",  // 由 extractMessageText 处理
      titlePath: "name",
      sortField: "created_at",
      sortOrder: "asc" as const,
    },
  },

  injection: {
    copyButton: {
      selectors: [
        "header .flex.items-center.gap-1",
        "header .flex.items-center.gap-2",
        '[class*="sticky"] .flex.items-center',
        'div[class*="conversation"] header .flex',
      ],
      position: "prepend" as const,
    },
    listItem: {
      linkSelector: 'a[href^="/chat/"]',
      idPattern: /\/chat\/([a-zA-Z0-9-]+)$/,
      containerSelector: '[class*="sidebar"], nav',
    },
    mainContentSelector: 'main, [class*="conversation"]',
    sidebarSelector: '[class*="sidebar"], nav',
  },

  theme: {
    light: {
      primary: "#c6613f",
      secondary: "#ffedd5",
      primaryForeground: "#ffffff",
      secondaryForeground: "#9a3412",
    },
    dark: {
      primary: "#c6613f",
      secondary: "#7c2d12",
      primaryForeground: "#431407",
      secondaryForeground: "#ffedd5",
    },
  },

  meta: {
    reliability: "high" as const,
    coverage: "Claude 全部对话类型（含 Opus, Sonnet, Haiku）",
    lastVerified: "2026-02-07",
    knownLimitations: [
      "需要从 cookie 中提取 orgId",
      "Artifact 标签转为代码块",
    ],
  },
} satisfies AdapterManifest;

// ─── 脚本层 ───

export const claudeHooks: AdapterHooks = {
  /**
   * Claude 的认证信息存在 cookie 的 lastActiveOrg 中。
   */
  extractAuth(ctx) {
    const cookie = ctx.document?.cookie ?? "";
    const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(cookie);
    if (!match?.[1]) return null;
    return { orgId: decodeURIComponent(match[1]) };
  },

  /**
   * Claude 消息内容需要从 content 数组中提取文本，
   * 并处理 artifact 标签。
   */
  extractMessageText(rawMessage: unknown) {
    return extractClaudeMessageText(rawMessage as ClaudeMessage);
  },

  /**
   * 合并连续同角色消息（Claude 可能把一个回复拆成多条消息）。
   */
  afterParse(messages) {
    const merged: typeof messages = [];
    for (const msg of messages) {
      const last = merged[merged.length - 1];
      if (last?.role === msg.role) {
        last.content = `${last.content}\n${msg.content}`.trim();
      } else {
        merged.push({ ...msg });
      }
    }
    return merged;
  },
};
```

### 5.3 新平台示例：Perplexity（假设）

以下展示用纯声明层（无钩子）适配一个结构简单的平台有多简洁：

```typescript
// packages/core-adapters/src/adapters/perplexity/manifest.ts

import type { AdapterManifest } from "../../manifest/schema";

export const perplexityManifest = {
  id: "perplexity-ext",
  version: "1.0.0",
  name: "Perplexity Extension Parser",
  provider: "perplexity",

  urls: {
    hostPermissions: ["https://www.perplexity.ai/*"],
    hostPatterns: [/^https:\/\/www\.perplexity\.ai\//i],
    conversationUrlPatterns: [
      /^https?:\/\/www\.perplexity\.ai\/search\/([a-zA-Z0-9-]+)/,
    ],
  },

  auth: { method: "cookie-session" as const },

  endpoint: {
    urlTemplate:
      "https://www.perplexity.ai/api/search/{conversationId}",
    method: "GET" as const,
    credentials: "include" as const,
    cache: "no-store" as const,
  },

  parsing: {
    role: {
      field: "role",
      mapping: {
        user: "user" as const,
        assistant: "assistant" as const,
      },
    },
    content: {
      messagesPath: "messages",
      textPath: "content",
      titlePath: "title",
    },
  },

  injection: {
    copyButton: {
      selectors: ['header .flex.items-center'],
      position: "prepend" as const,
    },
    listItem: {
      linkSelector: 'a[href^="/search/"]',
      idPattern: /\/search\/([a-zA-Z0-9-]+)$/,
    },
  },

  theme: {
    light: {
      primary: "#20808D",
      secondary: "#E8F5F7",
      primaryForeground: "#ffffff",
      secondaryForeground: "#20808D",
    },
  },
} satisfies AdapterManifest;

// 无需钩子！纯声明式配置。
```

---

## 6. 注入器配置化方案

### 6.1 App.tsx 去硬编码

当前 `App.tsx` 中的 `detectPlatform()` 和 `isConversationPage()` 硬编码了平台判断逻辑。迁移后改为从 manifest registry 中查找。

```typescript
// apps/browser-extension/src/components/app.tsx（迁移后）

import { getRegisteredManifests } from "@ctxport/core-adapters/manifest/registry";
import { ManifestInjector } from "~/injectors/manifest-injector";

function detectManifest(url: string) {
  return getRegisteredManifests().find((entry) =>
    entry.manifest.urls.hostPatterns.some((p) => p.test(url)),
  );
}

function isConversationPage(url: string) {
  return getRegisteredManifests().some((entry) =>
    entry.manifest.urls.conversationUrlPatterns.some((p) => p.test(url)),
  );
}

// 在 useEffect 中：
const entry = detectManifest(url);
if (entry) {
  const injector = new ManifestInjector(entry.manifest);
  // ... 其余逻辑不变
}
```

### 6.2 ExtensionSiteConfig 统一

现有的 `ExtensionSiteConfig` 类型可以从 manifest 自动生成，不再需要手工维护。

```typescript
// packages/core-adapters/src/extension-sites.ts（迁移后）

import type { ExtensionSiteConfig } from "./extension-site-types";
import type { AdapterManifest } from "./manifest/schema";

/**
 * 从 AdapterManifest 自动生成 ExtensionSiteConfig。
 * 保持向后兼容，现有消费方不需要改动。
 */
export function manifestToSiteConfig(
  manifest: AdapterManifest,
  getConversationId: (url: string) => string | null,
): ExtensionSiteConfig {
  return {
    id: manifest.provider,
    provider: manifest.provider as any,
    name: manifest.name,
    hostPermissions: manifest.urls.hostPermissions,
    hostPatterns: manifest.urls.hostPatterns,
    conversationUrlPatterns: manifest.urls.conversationUrlPatterns,
    getConversationId,
    theme: manifest.theme,
  };
}
```

---

## 7. 迁移策略

### 7.1 分阶段迁移，保持向后兼容

```
Phase 1: 添加 manifest 基础设施（不删除任何现有代码）
  ├── 新增 packages/core-adapters/src/manifest/ 目录
  │   ├── schema.ts       — AdapterManifestSchema
  │   ├── hooks.ts        — AdapterHooks 类型
  │   ├── manifest-adapter.ts — ManifestAdapter 引擎
  │   ├── registry.ts     — registerManifestAdapter
  │   └── utils.ts        — getByPath, resolveTemplate
  └── 新增 apps/browser-extension/src/injectors/manifest-injector.ts

Phase 2: 创建 manifest 定义（与现有 adapter 并行运行）
  ├── 新增 adapters/chatgpt/manifest.ts
  ├── 新增 adapters/claude/manifest.ts
  └── 在 registry 中同时注册旧 adapter 和新 ManifestAdapter
      （用 URL 匹配优先级确保新旧不冲突）

Phase 3: 验证 manifest adapter 输出与旧 adapter 一致
  ├── 对比测试：同一输入，两个 adapter 的输出 diff
  ├── 端到端测试：在真实页面上验证
  └── 确认钩子逻辑（transformResponse, extractMessageText）正确

Phase 4: 切换到 manifest adapter，标记旧 adapter 为 deprecated
  ├── 修改 registry 注册顺序，ManifestAdapter 优先
  ├── 修改 App.tsx 使用 ManifestInjector
  └── 旧 adapter 代码保留但不再注册

Phase 5: 清理旧代码
  ├── 删除 ChatGPTExtAdapter 类
  ├── 删除 ClaudeExtAdapter 类
  ├── 删除 ChatGPTInjector 类
  ├── 删除 ClaudeInjector 类
  └── 更新文档和类型导出
```

### 7.2 向后兼容保证

- **Adapter 接口不变**：`ManifestAdapter` 实现的是同一个 `Adapter` 接口（`canHandle` + `parse`），registry 的 `parseWithAdapters` 不需要改动
- **PlatformInjector 接口不变**：`ManifestInjector` 实现的是同一个 `PlatformInjector` 接口
- **ExtensionSiteConfig 可自动生成**：`manifestToSiteConfig` 桥接函数保持 host permissions 等对外 API 不变
- **输出格式不变**：最终产出的 `Conversation` 对象结构完全相同

### 7.3 回滚策略

在 Phase 4 之前，旧 adapter 代码始终保留。如果 ManifestAdapter 在生产中出现问题：

1. 在 registry 注册时切换回旧 adapter（改一行代码）
2. 在 App.tsx 中切换回旧 injector（改一行代码）
3. 发布 hotfix 版本

---

## 8. 风险与取舍

### 8.1 技术风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 声明式 Schema 覆盖不了某个平台的 API 模式 | 中 | 低 | 脚本层钩子 escape hatch；极端情况可以绕过 ManifestAdapter 直接实现 Adapter 接口 |
| `getByPath` 简单路径不够用 | 低 | 低 | 用 `transformResponse` 钩子先 normalize 响应结构 |
| 新平台的 DOM 结构与 ManifestInjector 的假设不匹配 | 中 | 中 | `injection` 配置已经足够灵活（多选择器 fallback + position）；极端情况可以扩展 `ManifestInjector` 或创建子类 |
| ChatGPT 树状消息结构太复杂，`transformResponse` 钩子代码量不比旧 adapter 少 | 已确认 | 低 | 这正是"20% 需要脚本层"的设计意图。ChatGPT 的消息树线性化逻辑约 30 行，作为钩子存在是合理的 |
| token 认证的缓存和重试逻辑变复杂 | 低 | 中 | ManifestAdapter 内部封装了 bearer token 的完整生命周期管理，声明层只需配置端点和路径 |

### 8.2 架构取舍

**我们选择了什么：**
- 80% 的平台用声明式配置覆盖，新增平台只需 50-80 行配置代码
- 统一的 injector 引擎，CSS 选择器变更只改配置不改逻辑
- 明确的钩子接口和安全边界

**我们放弃了什么：**
- ChatGPT 的 adapter 代码量没有显著减少（树状消息的 `transformResponse` 钩子 + `extractMessageText` 钩子约 60 行，旧 adapter 的对应逻辑约 80 行）
- 引入了一层间接性（manifest → ManifestAdapter → Adapter），调试时需要多看一层
- Schema 本身的复杂度不低，需要维护 Zod validation

**为什么这个取舍是值得的：**
1. **边际成本递减**：第 3 个平台开始，每新增一个平台的成本从 ~500 行代码降到 ~80 行配置
2. **DOM 变更修复成本降低**：CSS 选择器失效时，改配置而不是改逻辑
3. **社区贡献门槛降低**：贡献者不需要理解 TypeScript 类继承体系，只需填写一个 manifest 对象
4. **一人公司的可维护性**：10 个平台 × 500 行 = 5000 行各不相同的 adapter 代码 vs 10 个平台 × 80 行配置 + 1 个通用引擎

---

## 9. 文件结构

迁移完成后的目录结构：

```
packages/core-adapters/src/
├── manifest/                       # [新增] 声明式框架
│   ├── schema.ts                   # AdapterManifestSchema (Zod)
│   ├── hooks.ts                    # AdapterHooks 类型定义
│   ├── manifest-adapter.ts         # ManifestAdapter 通用引擎
│   ├── registry.ts                 # registerManifestAdapter
│   └── utils.ts                    # getByPath, resolveTemplate
├── adapters/
│   ├── chatgpt/
│   │   ├── manifest.ts             # [新增] ChatGPT manifest + hooks
│   │   └── shared/                 # [保留] 共享的类型和工具函数
│   │       ├── types.ts
│   │       ├── message-converter.ts
│   │       ├── content-flatteners/
│   │       ├── text-processor.ts
│   │       └── constants.ts
│   └── claude/
│       ├── manifest.ts             # [新增] Claude manifest + hooks
│       └── shared/                 # [保留] 共享的类型和工具函数
│           ├── types.ts
│           └── message-converter.ts
├── base.ts                         # [保留] RawMessage, buildConversation 等
├── registry.ts                     # [保留] 核心 registry（Adapter 接口级别）
├── extension-sites.ts              # [修改] 自动从 manifest 生成
├── extension-site-types.ts         # [保留]
└── index.ts                        # [修改] 导出 manifest 相关 API

apps/browser-extension/src/injectors/
├── base-injector.ts                # [保留] PlatformInjector 接口 + 工具函数
└── manifest-injector.ts            # [新增] ManifestInjector 通用引擎
```

---

## 10. 核心层 API 契约

### 10.1 框架提供给 adapter 的运行时能力

| API | 说明 | 对外暴露 |
|-----|------|---------|
| `registerManifestAdapter(entry)` | 注册一个 manifest adapter | 是 |
| `registerManifestAdapters(entries)` | 批量注册 | 是 |
| `getRegisteredManifests()` | 获取所有已注册的 manifest 条目 | 是 |
| `manifestToSiteConfig(manifest)` | manifest → ExtensionSiteConfig | 是 |
| `ManifestAdapter` class | 通用 adapter 引擎 | 内部使用 |
| `ManifestInjector` class | 通用 injector 引擎 | Extension 内部 |
| `getByPath(obj, path)` | 点号路径取值 | 内部使用 |
| `resolveTemplate(tmpl, vars)` | URL 模板替换 | 内部使用 |

### 10.2 Adapter 生命周期

```
注册阶段（应用启动时）
    registerManifestAdapter({ manifest, hooks })
        → Zod 验证 manifest
        → 创建 ManifestAdapter 实例
        → 注册到全局 Adapter Registry

匹配阶段（用户操作触发）
    parseWithAdapters(input)
        → 遍历已注册 adapter，调用 canHandle(input)
        → ManifestAdapter.canHandle 检查 URL patterns

解析阶段
    ManifestAdapter.parse(input)
        → extractConversationId (钩子 or 默认)
        → extractAuth (钩子 or 默认)
        → 构建请求 URL (钩子 or 模板替换)
        → fetch API (核心层发起)
        → transformResponse (钩子 or 直通)
        → 解析消息列表 (声明规则 + extractMessageText 钩子)
        → afterParse (钩子 or 直通)
        → buildConversation

注入阶段（与解析并行）
    ManifestInjector
        → 从 manifest.injection 读取选择器
        → MutationObserver 监听 DOM
        → 动态注入 copy button / list icons / batch checkboxes

清理阶段
    ManifestInjector.cleanup()
        → 断开所有 MutationObserver
        → 清除所有定时器
        → 移除所有注入的 DOM 元素
```

### 10.3 错误处理和降级

| 阶段 | 错误类型 | 处理策略 |
|------|---------|---------|
| 注册 | Zod 验证失败 | 抛出 Error，阻止注册。开发时立即发现 manifest 错误 |
| 匹配 | canHandle 异常 | 捕获并返回 false，不影响其他 adapter |
| 认证 | extractAuth 返回 null | `cookie-session` 模式不需要额外认证；`bearer-from-api` 抛出明确错误 |
| 请求 | API 返回非 200 | `bearer-from-api` 模式下 401 自动重试一次；其他状态码直接抛错 |
| 解析 | messagesPath 找不到消息数组 | 返回空数组 → 触发 E-PARSE-005 错误 |
| 解析 | extractMessageText 钩子异常 | 捕获，跳过该消息，继续解析其余消息 |
| 注入 | CSS 选择器未匹配到元素 | 静默失败，等待 MutationObserver 在 DOM 变化后重试；超时后启动 FloatingCopyButton 降级 |

---

> *"Building a good system to handle one thing well is 10x easier than building a system that handles everything. [...] Start with one, make it work, then add more."*
> — Werner Vogels
>
> 声明式架构的核心价值不在于让 ChatGPT/Claude 的 adapter 代码更少（它们已经够复杂），而在于让第 3 个、第 5 个、第 10 个平台的适配成本趋近于零。这是一人公司扩展产品覆盖范围的唯一可行路径。
