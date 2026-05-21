# Plugin System Refactor Plan

> 版本：v1.0 | 日期：2026-02-07
> 角色：全栈开发（DHH 务实风格）
> 前置文档：
> - CTO Plugin 架构 ADR (docs/cto/adr-plugin-system-architecture.md)
> - 产品平台需求分析 (docs/product/adapter-v2-platform-requirements.md)

---

## 0. CTO 方案审查

### 0.1 认同的部分

CTO 方案这次比上轮好很多。核心决策是对的：

1. **从零设计**——产品没发布，没兼容负担，直接改。正确。
2. **Plugin = 对象 + 几个方法**——比 Manifest + Hooks + Adapter class 简单十倍。正确。
3. **ContentBundle 替代 Conversation**——通用容器，不假设对话结构。正确。
4. **不做 Fetcher 抽象**——Plugin 自己调 fetch()。正确。
5. **不做 ContentType 枚举**——序列化器自推断。正确。
6. **共享 chat-injector**——两个 AI 聊天平台 UI 结构确实一样。合理。

### 0.2 需要简化的部分

**问题 1：core-plugins 包不需要新建，直接改 core-adapters**

CTO 说"core-adapters 改名为 core-plugins"。改名意味着：
- 改 package.json name
- 改 pnpm-workspace.yaml 里的路径
- 改 turbo.json 里的引用
- 改所有 import 路径
- 改 tsconfig references

**太多无谓的改动**。实际上：直接在 `packages/core-adapters` 上改就行了。把里面的代码全换掉，package name 暂时不改（反正是 private 包，没发布）。import 路径 `@ctxport/core-adapters` 全局不用动。等以后真有必要再改名。

**DHH 原则**：改名是最便宜的重构，但现在没有任何价值。不做。

**问题 2：PluginInjector 接口不需要放在 core-adapters（core-plugins）包里**

CTO 的 `PluginInjector` 和 `InjectorCallbacks` 接口定义在 core-plugins 包里。但 injector 的实现（ManifestInjector / chat-injector）是在 `apps/browser-extension` 里用的，它依赖 DOM 和 React。

injector 属于 extension 层，不属于 core 包。让 core 包只管 Plugin 定义 + extract() + ContentBundle。注入逻辑留在 extension 里。

**调整**：
- `Plugin` 接口里的 `injector` 字段类型保留，但接口定义放在 extension 里
- core-adapters 包只导出 Plugin 类型（不含 injector 相关接口）
- extension 自己定义 `PluginWithInjector extends Plugin`，加上 injector 字段

**等等，再想想**。CTO 说"Plugin 自己管理 UI 注入"，这意味着 ChatGPT plugin 要带着自己的 injector config。如果 injector config 在 extension 里而不是 plugin 里，那 plugin 就不完整了。

**折衷方案**：Plugin 接口的 injector 字段用一个简单的 config 对象（CSS selectors + position），不是一个 class。这样 core 包不依赖 DOM，extension 拿到 config 后自己实例化 injector。

实际上 CTO 方案里的 `createChatInjector(config)` 就是这个思路——config 是纯数据，injector 是运行时实例。

**最终决策**：
- Plugin 类型定义在 core-adapters 包，包括 injector 相关的 **config 类型**
- injector 的 **运行时实现**（MutationObserver、DOM 操作）留在 extension
- 这和现在的架构一致：manifest/schema.ts 定义 InjectionConfig，ManifestInjector 在 extension 里实现

**问题 3：ContentBundle 不需要 Zod schema，纯 TypeScript interface 就够了**

CTO 已经说了不做 Zod 运行时验证。认同。core-schema 包可以不再依赖 Zod。

但考虑到 core-schema 已经用了 Zod，且 errors.ts 也用了 Zod，为了这次重构的范围控制，**保留 Zod 依赖但 ContentBundle 用纯 interface**。errors.ts 不动。

**问题 4：theme 字段的 fg/secondaryFg 命名和现有代码不一致**

CTO 方案 theme 用 `fg` 和 `secondaryFg`，现有代码用 `primaryForeground` 和 `secondaryForeground`。Extension 里的 UI 组件不直接读 theme（theme 是通过 CSS 变量注入的），所以这个命名影响不大。但为了简洁，用 CTO 的短命名。

### 0.3 遗漏的实际问题

**问题 1：现有代码中 ManifestAdapter 有 fetchById() 方法**

现有的 `ManifestAdapter.fetchById()` 支持侧边栏列表一键复制和批量模式。`list-copy-icon.tsx` 和 `use-batch-mode.ts` 都调用了它。迁移时必须保留 fetchById。CTO 方案的 Plugin 接口里已经有 `fetchById?`，OK。

**问题 2：ChatGPT 的 api-client.ts 和 manifest.ts 里的 hooks 有重叠逻辑**

`api-client.ts` 有独立的 `fetchConversationWithTokenRetry()` 和 `extractChatGPTConversationId()`。`manifest.ts` 的 hooks 里也有 tree linearization 和 content flattening。迁移时需要合并这些逻辑，不要留两份。

**实际方案**：api-client.ts 里的 `fetchConversationWithTokenRetry()` 逻辑搬到 chatgpt plugin 的 extract() 和 fetchById() 方法里（CTO 方案第 5 节的示例代码基本就是这样）。api-client.ts 和 manifest.ts 整合后都不再需要。

**问题 3：message-converter.ts 在两个平台各有一份，作用不同**

- ChatGPT 的 `message-converter.ts`：`convertShareDataToMessages()` 用于 share URL 的数据转换。但现在 share URL 已经不是核心功能（extension 模式不走 share data），这个文件可以**删除**。
- Claude 的 `message-converter.ts`：`extractClaudeMessageText()` 和 `convertClaudeMessagesToRawMessages()` 是核心逻辑，需要迁移。

**问题 4：`serializeBundle()` 用于批量模式合并多个 Conversation**

迁移后要把它改成 `serializeContentBundles()`，接受 `ContentBundle[]`。

**问题 5：Extension 的 use-batch-mode.ts 用了 findAdapterByHostUrl**

这个要改成 `findPlugin(url)`。同时批量模式内部调 `adapter.fetchById()` 要改成 `plugin.fetchById()`。

### 0.4 审查结论

CTO 方案方向正确，代码示例实用。需要做以下调整：

1. **不改包名**——保持 `@ctxport/core-adapters`，内部代码全换
2. **injector config 在 core 包，injector 实现在 extension**——和现在一样
3. **ContentBundle 用纯 interface**——不做 Zod schema
4. **ChatGPT api-client.ts + manifest.ts 合并为 plugin.ts**——一个文件搞定
5. **保留 `serializeBundle` 改为 `serializeContentBundles`**——批量模式需要

---

## 1. 现有代码资产盘点

### 1.1 要直接迁移的核心逻辑（代码值钱，原样搬走）

| 现有文件 | 行数 | 核心功能 | 迁移去向 |
|----------|------|----------|----------|
| `core-adapters/src/adapters/chatgpt/shared/content-flatteners/*.ts` | ~220 行 | ChatGPT 消息内容解析（text/code/multimodal/thoughts/tool-response 等） | `core-adapters/src/plugins/chatgpt/content-flatteners/` (原样) |
| `core-adapters/src/adapters/chatgpt/shared/text-processor.ts` | 17 行 | stripCitationTokens / stripPrivateUse | `core-adapters/src/plugins/chatgpt/text-processor.ts` |
| `core-adapters/src/adapters/chatgpt/shared/types.ts` | 70 行 | ChatGPT API response types | `core-adapters/src/plugins/chatgpt/types.ts` |
| `core-adapters/src/adapters/chatgpt/shared/constants.ts` | 22 行 | ContentType / MessageRole 常量 | `core-adapters/src/plugins/chatgpt/constants.ts` |
| `core-adapters/src/adapters/chatgpt/manifest.ts:175-203` | ~30 行 | `buildLinearConversation()` tree linearizer | `core-adapters/src/plugins/chatgpt/tree-linearizer.ts` |
| `core-adapters/src/adapters/claude/shared/message-converter.ts` | 83 行 | `extractClaudeMessageText()` + artifact normalization + consecutive merge | `core-adapters/src/plugins/claude/message-converter.ts` |
| `core-adapters/src/adapters/claude/shared/types.ts` | 42 行 | Claude API response types | `core-adapters/src/plugins/claude/types.ts` |
| `browser-extension/src/injectors/base-injector.ts` | 80 行 | DOM 注入工具函数 | 保留原位 |
| `browser-extension/src/injectors/manifest-injector.ts` | 242 行 | 基于 config 的 DOM 注入器 | 改名为 `plugin-injector.ts`，config 从 Plugin 接口读 |

### 1.2 要删除的框架代码（不值钱，直接删）

| 文件 | 行数 | 理由 |
|------|------|------|
| `core-adapters/src/manifest/schema.ts` | 182 行 | AdapterManifest 18 个 interface，全部被 Plugin 接口替代 |
| `core-adapters/src/manifest/hooks.ts` | 80 行 | AdapterHooks / HookContext，Plugin 不需要 hooks |
| `core-adapters/src/manifest/manifest-adapter.ts` | 424 行 | ManifestAdapter class，Plugin 直接实现 extract() |
| `core-adapters/src/manifest/manifest-registry.ts` | 62 行 | 被 Plugin registry 替代 |
| `core-adapters/src/manifest/utils.ts` | 32 行 | getByPath / resolveTemplate，Plugin 不需要声明式路径解析 |
| `core-adapters/src/manifest/index.ts` | 17 行 | exports |
| `core-adapters/src/registry.ts` | 94 行 | adapter registry，被 Plugin registry 替代 |
| `core-adapters/src/base.ts` | 72 行 | buildMessages / buildConversation，被 ContentBundle 替代 |
| `core-adapters/src/adapters/index.ts` | 10 行 | builtinManifestEntries |
| `core-adapters/src/adapters/chatgpt/manifest.ts` | 204 行 | chatgptManifest + chatgptHooks，逻辑搬到 plugin.ts |
| `core-adapters/src/adapters/chatgpt/shared/api-client.ts` | 148 行 | 独立 API client，逻辑合并到 plugin.ts |
| `core-adapters/src/adapters/chatgpt/shared/message-converter.ts` | 124 行 | share URL 数据转换（不再需要） |
| `core-adapters/src/adapters/claude/manifest.ts` | 150 行 | claudeManifest + claudeHooks，逻辑搬到 plugin.ts |
| `core-adapters/src/adapters/claude/shared/api-client.ts` | 49 行 | 独立 API client，逻辑合并到 plugin.ts |
| `core-schema/src/adapter.ts` | 37 行 | Adapter interface / AdapterInput / ExtInput |
| `core-schema/src/conversation.ts` | 53 行 | Conversation / SourceType / Provider |
| `core-schema/src/message.ts` | 37 行 | Message / MessageRole / ContentMeta |
| `core-schema/src/bundle.ts` | 23 行 | BundleMeta / BundleFormat |

**删除合计**：~1798 行

### 1.3 要修改的文件

| 文件 | 改动内容 |
|------|----------|
| `core-adapters/src/index.ts` | 重写：导出 Plugin 类型 + registry + 内置 plugins |
| `core-adapters/package.json` | 更新 exports 字段（删掉 /manifest /base /registry 子路径） |
| `core-schema/src/index.ts` | 重写：导出 ContentBundle 类型 + errors |
| `core-schema/src/errors.ts` | 小改：错误消息措辞调整（adapter -> plugin，conversation -> content） |
| `core-markdown/src/serializer.ts` | 重写：serializeConversation -> serializeContentBundle |
| `core-markdown/src/formats.ts` | 修改：filterMessages 接受 ContentNode[] 而非 Message[] |
| `core-markdown/src/index.ts` | 更新 exports |
| `browser-extension/wxt.config.ts` | import 路径从 `@ctxport/core-adapters` 改新 API |
| `browser-extension/src/entrypoints/content.tsx` | registerBuiltinAdapters -> registerBuiltinPlugins |
| `browser-extension/src/components/app.tsx` | detectManifest -> findPlugin，ManifestInjector -> PluginInjector |
| `browser-extension/src/hooks/use-copy-conversation.ts` | parseWithAdapters -> plugin.extract() |
| `browser-extension/src/components/list-copy-icon.tsx` | findAdapterByHostUrl -> findPlugin，adapter.fetchById -> plugin.fetchById |
| `browser-extension/src/hooks/use-batch-mode.ts` | findAdapterByHostUrl -> findPlugin，Conversation -> ContentBundle |
| `browser-extension/src/injectors/manifest-injector.ts` | 改名为 plugin-injector.ts，config 从 Plugin 读 |

---

## 2. 文件级实现计划

### Phase 1：核心类型（ContentBundle + Plugin 接口 + Registry）

**目标**：定义新的数据模型和 Plugin 接口，让 build 通过。

**验收标准**：`pnpm build` 在 core-schema 和 core-adapters 包通过。

#### Step 1.1：core-schema — 新增 ContentBundle 类型

**新增文件** `packages/core-schema/src/content-bundle.ts`：

```typescript
/** 参与者 */
export interface Participant {
  id: string;
  name: string;
  role?: string;
  meta?: Record<string, unknown>;
}

/** 内容节点 */
export interface ContentNode {
  id: string;
  participantId: string;
  content: string;
  order: number;
  children?: ContentNode[];
  timestamp?: string;
  type?: string;
  meta?: Record<string, unknown>;
}

/** 来源信息 */
export interface SourceMeta {
  platform: string;
  url?: string;
  extractedAt: string;
  pluginId: string;
  pluginVersion: string;
}

/** 通用内容容器 */
export interface ContentBundle {
  id: string;
  title?: string;
  participants: Participant[];
  nodes: ContentNode[];
  source: SourceMeta;
  tags?: string[];
}
```

#### Step 1.2：core-schema — 更新 errors.ts

小改措辞：
- "E-PARSE-001" message: "Cannot find a plugin for this page"
- "E-PARSE-005" message: "No content found"
- "E-BUNDLE-001" message: "Failed to serialize content to Markdown"

#### Step 1.3：core-schema — 重写 index.ts

```typescript
export type {
  Participant,
  ContentNode,
  SourceMeta,
  ContentBundle,
} from "./content-bundle";

export {
  ParseErrorCode,
  BundleErrorCode,
  ErrorCode,
  AppError,
  ERROR_MESSAGES,
  createAppError,
  isParseError,
  isBundleError,
} from "./errors";
```

删除的文件：
- `packages/core-schema/src/adapter.ts`
- `packages/core-schema/src/conversation.ts`
- `packages/core-schema/src/message.ts`
- `packages/core-schema/src/bundle.ts`

#### Step 1.4：core-adapters — 定义 Plugin 接口

**新增文件** `packages/core-adapters/src/types.ts`：

```typescript
import type { ContentBundle } from "@ctxport/core-schema";

/** Plugin 接收的运行时上下文 */
export interface PluginContext {
  url: string;
  document: Document;
}

/** UI 注入配置（纯数据，不含 DOM 操作） */
export interface InjectionConfig {
  copyButton: {
    selectors: string[];
    position: "prepend" | "append" | "before" | "after";
  };
  listItem: {
    linkSelector: string;
    idPattern: RegExp;
    containerSelector?: string;
  };
  mainContentSelector?: string;
  sidebarSelector?: string;
}

/** 主题色 */
export interface ThemeConfig {
  light: { primary: string; secondary: string; fg: string; secondaryFg: string };
  dark?: { primary: string; secondary: string; fg: string; secondaryFg: string };
}

/** Plugin 定义 */
export interface Plugin {
  readonly id: string;
  readonly version: string;
  readonly name: string;

  /** URL 匹配 */
  urls: {
    hosts: string[];
    match: (url: string) => boolean;
  };

  /** 判断当前 URL 是否为内容详情页（区别于首页/列表页） */
  isContentPage?: (url: string) => boolean;

  /** 从当前页面提取内容 */
  extract: (ctx: PluginContext) => Promise<ContentBundle>;

  /** 通过 ID 远程获取内容（侧边栏列表复制 / 批量模式） */
  fetchById?: (id: string) => Promise<ContentBundle>;

  /** UI 注入配置 */
  injection?: InjectionConfig;

  /** 主题色 */
  theme?: ThemeConfig;
}
```

注意和 CTO 方案的区别：
- **没有 PluginInjector 接口**——injector 是 extension 层的事，Plugin 只提供 injection config
- **新增 isContentPage()**——替代现有 `isConversationPage()`，用于判断浮动按钮 fallback
- **injection 是纯数据**——和现有 `AdapterManifest.injection` 基本一致，ManifestInjector（改名 PluginInjector）读这个 config

#### Step 1.5：core-adapters — Plugin Registry

**新增文件** `packages/core-adapters/src/registry.ts`（替换现有 registry.ts）：

```typescript
import type { Plugin } from "./types";

const plugins = new Map<string, Plugin>();

export function registerPlugin(plugin: Plugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" already registered, skipping.`);
    return;
  }
  plugins.set(plugin.id, plugin);
}

export function findPlugin(url: string): Plugin | null {
  for (const plugin of plugins.values()) {
    if (plugin.urls.match(url)) return plugin;
  }
  return null;
}

export function getAllPlugins(): Plugin[] {
  return Array.from(plugins.values());
}

export function getAllHostPermissions(): string[] {
  return Array.from(plugins.values()).flatMap((p) => p.urls.hosts);
}

export function clearPlugins(): void {
  plugins.clear();
}
```

#### Step 1.6：core-adapters — 工具函数

**新增文件** `packages/core-adapters/src/utils.ts`：

```typescript
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}
```

**估算改动量**：~150 行新代码 + ~150 行删除

---

### Phase 2：迁移 ChatGPT Plugin

**目标**：ChatGPT 功能完整可用（copy 按钮、列表复制、批量模式）。

**验收标准**：`pnpm build` 通过 + 在 ChatGPT 页面手动测试 copy 功能。

#### Step 2.1：搬移 ChatGPT 核心逻辑

文件操作（移动，内容基本不变）：

| 从 | 到 | 改动 |
|----|----|----|
| `adapters/chatgpt/shared/types.ts` | `plugins/chatgpt/types.ts` | 不变 |
| `adapters/chatgpt/shared/constants.ts` | `plugins/chatgpt/constants.ts` | 不变 |
| `adapters/chatgpt/shared/text-processor.ts` | `plugins/chatgpt/text-processor.ts` | 不变 |
| `adapters/chatgpt/shared/content-flatteners/` (整个目录) | `plugins/chatgpt/content-flatteners/` | import 路径调整 |

#### Step 2.2：提取 tree-linearizer

**新增文件** `packages/core-adapters/src/plugins/chatgpt/tree-linearizer.ts`：

从 `adapters/chatgpt/manifest.ts:175-203` 提取 `buildLinearConversation()` 函数。代码不变，只是独立文件。

#### Step 2.3：实现 ChatGPT Plugin

**新增文件** `packages/core-adapters/src/plugins/chatgpt/plugin.ts`：

核心逻辑来自三个地方的合并：
1. `adapters/chatgpt/manifest.ts` — URL 匹配规则、injection config、hooks 逻辑
2. `adapters/chatgpt/shared/api-client.ts` — token 获取、API 请求、401 retry
3. `manifest/manifest-adapter.ts` — parse() 的整体流程

Plugin 内部函数：
- `extractConversationId(url)` — 从 api-client.ts
- `getAccessToken()` — 从 api-client.ts（带缓存和 retry）
- `fetchConversation(id, token)` — 从 api-client.ts
- `parseConversation(raw, url)` — 合并 manifest.ts hooks + manifest-adapter.ts parse 逻辑
  - 调用 `buildLinearConversation()` (tree linearizer)
  - 调用 `flattenMessageContent()` (content flatteners)
  - 调用 `stripCitationTokens()` (text processor)
  - shouldSkipMessage 逻辑从 manifest.ts 的 filters 配置变为直接代码
  - 最终输出 ContentBundle 而非 Conversation

```typescript
export const chatgptPlugin: Plugin = {
  id: "chatgpt",
  version: "1.0.0",
  name: "ChatGPT",
  urls: {
    hosts: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
    match: (url) => /^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\//i.test(url),
  },
  isContentPage: (url) =>
    /^https?:\/\/(?:chat\.openai\.com|chatgpt\.com)\/c\/[a-zA-Z0-9-]+/.test(url),
  extract: async (ctx) => { /* ... */ },
  fetchById: async (id) => { /* ... */ },
  injection: {
    copyButton: {
      selectors: [
        "main .sticky .flex.items-center.gap-2",
        'main header [class*="flex"][class*="items-center"]',
        'div[data-testid="conversation-header"] .flex.items-center',
      ],
      position: "prepend",
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
    light: { primary: "#0d0d0d", secondary: "#5d5d5d", fg: "#ffffff", secondaryFg: "#ffffff" },
    dark: { primary: "#0d0d0d", secondary: "#5d5d5d", fg: "#ffffff", secondaryFg: "#ffffff" },
  },
};
```

**估算改动量**：~250 行新代码（大部分是从现有代码搬来的）

---

### Phase 3：迁移 Claude Plugin

**目标**：Claude 功能完整可用。

**验收标准**：`pnpm build` 通过 + 在 Claude 页面手动测试 copy 功能。

#### Step 3.1：搬移 Claude 核心逻辑

| 从 | 到 | 改动 |
|----|----|----|
| `adapters/claude/shared/types.ts` | `plugins/claude/types.ts` | 不变 |
| `adapters/claude/shared/message-converter.ts` | `plugins/claude/message-converter.ts` | import 路径调整 |

#### Step 3.2：实现 Claude Plugin

**新增文件** `packages/core-adapters/src/plugins/claude/plugin.ts`：

逻辑来源：
1. `adapters/claude/manifest.ts` — URL 匹配、injection config、hooks（extractAuth、extractMessageText、afterParse）
2. `adapters/claude/shared/api-client.ts` — orgId 提取、API 请求
3. `manifest/manifest-adapter.ts` — fetchById 流程

Plugin 内部函数：
- `extractConversationId(url)` — 从 api-client.ts
- `extractOrgId()` — 从 manifest.ts hooks.extractAuth
- `fetchConversation(orgId, id)` — 从 api-client.ts
- `parseConversation(data, url)` — 合并 hooks 逻辑
  - 调用 `extractClaudeMessageText()`
  - 合并连续同 role 消息（afterParse hook 逻辑）
  - 输出 ContentBundle

```typescript
export const claudePlugin: Plugin = {
  id: "claude",
  version: "1.0.0",
  name: "Claude",
  urls: {
    hosts: ["https://claude.ai/*"],
    match: (url) => /^https:\/\/claude\.ai\//i.test(url),
  },
  isContentPage: (url) =>
    /^https?:\/\/claude\.ai\/chat\/[a-zA-Z0-9-]+/.test(url),
  extract: async (ctx) => { /* ... */ },
  fetchById: async (id) => { /* ... */ },
  injection: { /* Claude 的 CSS selectors */ },
  theme: { /* Claude 的品牌色 */ },
};
```

**估算改动量**：~180 行新代码

---

### Phase 4：注册入口 + 删除旧代码

**目标**：新 Plugin 系统完整替代旧 Adapter 系统。

**验收标准**：旧代码全部删除，`pnpm build` 通过，现有测试适配后通过。

#### Step 4.1：Plugin 注册入口

**新增文件** `packages/core-adapters/src/plugins/index.ts`：

```typescript
import { registerPlugin } from "../registry";
import { chatgptPlugin } from "./chatgpt/plugin";
import { claudePlugin } from "./claude/plugin";

export function registerBuiltinPlugins(): void {
  registerPlugin(chatgptPlugin);
  registerPlugin(claudePlugin);
}

export { chatgptPlugin } from "./chatgpt/plugin";
export { claudePlugin } from "./claude/plugin";
```

#### Step 4.2：重写 core-adapters/src/index.ts

```typescript
export type { Plugin, PluginContext, InjectionConfig, ThemeConfig } from "./types";
export {
  registerPlugin,
  findPlugin,
  getAllPlugins,
  getAllHostPermissions,
  clearPlugins,
} from "./registry";
export { generateId } from "./utils";
export { registerBuiltinPlugins } from "./plugins";

// 导出 host permissions 常量（WXT config 用）
import { chatgptPlugin } from "./plugins/chatgpt/plugin";
import { claudePlugin } from "./plugins/claude/plugin";
export const EXTENSION_HOST_PERMISSIONS = [
  ...chatgptPlugin.urls.hosts,
  ...claudePlugin.urls.hosts,
];
```

#### Step 4.3：更新 core-adapters/package.json

移除不再需要的 exports 子路径：

```json
{
  "exports": {
    ".": { "types": "./src/index.ts", "import": "./src/index.ts", "default": "./src/index.ts" }
  }
}
```

删除 `/registry`、`/base`、`/manifest`、`/manifest/schema` 子路径。

#### Step 4.4：删除旧文件

```
packages/core-adapters/src/
  base.ts                          -- 删除
  manifest/                        -- 删除整个目录
    schema.ts
    hooks.ts
    manifest-adapter.ts
    manifest-registry.ts
    utils.ts
    index.ts
  adapters/                        -- 删除整个目录
    index.ts
    chatgpt/
      manifest.ts
      shared/
        api-client.ts
        message-converter.ts       -- (share URL 转换，不再需要)
        types.ts                   -- 已搬到 plugins/chatgpt/
        constants.ts               -- 已搬到 plugins/chatgpt/
        text-processor.ts          -- 已搬到 plugins/chatgpt/
        content-flatteners/        -- 已搬到 plugins/chatgpt/
    claude/
      manifest.ts
      shared/
        api-client.ts
        message-converter.ts       -- 已搬到 plugins/claude/
        types.ts                   -- 已搬到 plugins/claude/

packages/core-schema/src/
  adapter.ts                       -- 删除
  conversation.ts                  -- 删除
  message.ts                       -- 删除
  bundle.ts                        -- 删除
```

#### Step 4.5：更新测试

**删除**（测试旧的 Manifest 系统，不再需要）：
- `core-adapters/src/__tests__/manifest-adapter.test.ts`
- `core-adapters/src/__tests__/manifest-utils.test.ts`

**新增**（后续可选，Phase 4 先确保 build 通过）：
- `core-adapters/src/__tests__/registry.test.ts` — Plugin registry 基本测试
- `core-adapters/src/__tests__/chatgpt-plugin.test.ts` — ChatGPT Plugin 的 parseConversation 逻辑测试

**估算改动量**：~100 行新代码 + ~1800 行删除

---

### Phase 5：序列化器适配

**目标**：core-markdown 接受 ContentBundle，产出 Markdown。

**验收标准**：`pnpm build` 通过 + 序列化器测试通过。

#### Step 5.1：修改 formats.ts

当前 `filterMessages()` 接受 `Message[]`。改为接受 `ContentNode[]` + `Map<string, Participant>`。

核心改动：
- `Message.role` -> `participantMap.get(node.participantId)?.role`
- `Message.contentMarkdown` -> `node.content`
- `roleLabel()` 不变

新增 `serializeAsThread()` 函数用于多参与者内容（非对话格式）。

#### Step 5.2：修改 serializer.ts

- `serializeConversation()` 改名为 `serializeContentBundle()`
- 接受 `ContentBundle` 而非 `Conversation`
- frontmatter 的 `ctxport: "v1"` 改为 `ctxport: "v2"`
- frontmatter 的 `source` 从 `provider` 改为 `platform`
- frontmatter 的 `messages` 改为 `nodes`
- 新增 `tags` 字段

`serializeBundle()` 改名为 `serializeContentBundles()`，接受 `ContentBundle[]`。

#### Step 5.3：更新 index.ts

```typescript
export {
  serializeContentBundle,
  serializeContentBundles,
} from "./serializer";
export type { SerializeOptions, SerializeResult } from "./serializer";
export { filterMessages, type BundleFormatType } from "./formats";
export { estimateTokens, formatTokenCount } from "./token-estimator";
```

#### Step 5.4：更新测试

`__tests__/serializer.test.ts` 和 `__tests__/formats.test.ts` 的测试数据从 `Conversation` / `Message` 改为 `ContentBundle` / `ContentNode`。

测试用例逻辑不变，只是数据结构适配。

**估算改动量**：~200 行改动

---

### Phase 6：Extension 集成

**目标**：浏览器扩展用新 Plugin 系统完整工作。

**验收标准**：`pnpm build` 通过 + 在 ChatGPT 和 Claude 页面端到端测试所有功能。

#### Step 6.1：wxt.config.ts

```typescript
import { EXTENSION_HOST_PERMISSIONS } from "@ctxport/core-adapters";
// 不变，因为 EXTENSION_HOST_PERMISSIONS 导出名一样
```

#### Step 6.2：content.tsx

```diff
- import { EXTENSION_CONTENT_MATCHES, registerBuiltinAdapters } from "@ctxport/core-adapters";
+ import { EXTENSION_HOST_PERMISSIONS, registerBuiltinPlugins } from "@ctxport/core-adapters";

  export default defineContentScript({
-   matches: EXTENSION_CONTENT_MATCHES,
+   matches: EXTENSION_HOST_PERMISSIONS,
    // ...
    async main(ctx) {
-     registerBuiltinAdapters();
+     registerBuiltinPlugins();
```

#### Step 6.3：app.tsx

```diff
- import { ManifestInjector } from "~/injectors/manifest-injector";
- import type { PlatformInjector } from "~/injectors/base-injector";
- import { getRegisteredManifests, type ManifestEntry } from "@ctxport/core-adapters/manifest";
+ import { PluginInjector } from "~/injectors/plugin-injector";
+ import { findPlugin, type Plugin } from "@ctxport/core-adapters";

- function detectManifest(url: string): ManifestEntry | undefined { ... }
- function isConversationPage(url: string): boolean { ... }
+ // 不再需要 detectManifest / isConversationPage
+ // findPlugin 直接返回 plugin，plugin.isContentPage 判断详情页

  export default function App() {
    const url = useExtensionUrl();
-   const entry = detectManifest(url);
-   const onConversationPage = isConversationPage(url);
+   const plugin = findPlugin(url);
+   const onContentPage = plugin?.isContentPage?.(url) ?? false;
    // ...
-   const injector = new ManifestInjector(entry.manifest);
+   const injector = new PluginInjector(plugin);
```

#### Step 6.4：use-copy-conversation.ts

```diff
- import { parseWithAdapters, registerBuiltinAdapters } from "@ctxport/core-adapters";
- import { serializeConversation, type BundleFormatType } from "@ctxport/core-markdown";
+ import { findPlugin } from "@ctxport/core-adapters";
+ import { serializeContentBundle, type BundleFormatType } from "@ctxport/core-markdown";

- const parseResult = await parseWithAdapters({ type: "ext", document, url: window.location.href });
- const serialized = serializeConversation(parseResult.conversation, { format });
+ const plugin = findPlugin(window.location.href);
+ if (!plugin) throw new Error("No plugin for this page");
+ const bundle = await plugin.extract({ url: window.location.href, document });
+ const serialized = serializeContentBundle(bundle, { format });
```

#### Step 6.5：list-copy-icon.tsx

```diff
- import { findAdapterByHostUrl } from "@ctxport/core-adapters/manifest";
- import { serializeConversation } from "@ctxport/core-markdown";
+ import { findPlugin } from "@ctxport/core-adapters";
+ import { serializeContentBundle } from "@ctxport/core-markdown";

- const adapter = findAdapterByHostUrl(window.location.href);
- if (!adapter) throw new Error("No adapter found");
- const conv = await adapter.fetchById(conversationId);
- const serialized = serializeConversation(conv, { format });
+ const plugin = findPlugin(window.location.href);
+ if (!plugin?.fetchById) throw new Error("No plugin found");
+ const bundle = await plugin.fetchById(conversationId);
+ const serialized = serializeContentBundle(bundle, { format });
```

#### Step 6.6：use-batch-mode.ts

```diff
- import { findAdapterByHostUrl } from "@ctxport/core-adapters/manifest";
- import { serializeBundle } from "@ctxport/core-markdown";
- import type { Conversation } from "@ctxport/core-schema";
+ import { findPlugin } from "@ctxport/core-adapters";
+ import { serializeContentBundles } from "@ctxport/core-markdown";
+ import type { ContentBundle } from "@ctxport/core-schema";

- const adapter = findAdapterByHostUrl(window.location.href);
- const conversations: Conversation[] = [];
- const conv = await adapter.fetchById(ids[i]!);
- conversations.push(conv);
- const serialized = serializeBundle(conversations, { format });
+ const plugin = findPlugin(window.location.href);
+ if (!plugin?.fetchById) { setState("normal"); return; }
+ const bundles: ContentBundle[] = [];
+ const bundle = await plugin.fetchById(ids[i]!);
+ bundles.push(bundle);
+ const serialized = serializeContentBundles(bundles, { format });
```

#### Step 6.7：injectors/manifest-injector.ts -> plugin-injector.ts

文件改名。内部改动很小：

```diff
- import type { AdapterManifest } from "@ctxport/core-adapters/manifest";
+ import type { Plugin } from "@ctxport/core-adapters";

- export class ManifestInjector implements PlatformInjector {
+ export class PluginInjector implements PlatformInjector {
-   constructor(private readonly manifest: AdapterManifest) {
-     this.platform = manifest.provider;
-     this.copyBtnClass = `ctxport-${manifest.provider}-copy-btn`;
+   constructor(private readonly plugin: Plugin) {
+     this.platform = plugin.id;
+     this.copyBtnClass = `ctxport-${plugin.id}-copy-btn`;

-   const { selectors, position } = this.manifest.injection.copyButton;
+   const injection = this.plugin.injection;
+   if (!injection) return;
+   const { selectors, position } = injection.copyButton;
```

**估算改动量**：~200 行改动

---

### Phase 7（可选）：Stack Overflow Plugin

不在本次重构范围内。等 Phase 1-6 完成、ChatGPT + Claude 端到端验证通过后再做。

这里只记录一句：新建 `packages/core-adapters/src/plugins/stackoverflow/plugin.ts`，实现 DOM 抓取，输出 ContentBundle。注册到 `registerBuiltinPlugins()`。搞定。

---

## 3. 最终文件结构

```
packages/
├── core-schema/
│   └── src/
│       ├── content-bundle.ts    ← 新增：ContentBundle, ContentNode, Participant, SourceMeta
│       ├── errors.ts            ← 小改措辞
│       └── index.ts             ← 重写 exports
│
├── core-adapters/               ← 包名不变！
│   ├── package.json             ← 更新 exports
│   └── src/
│       ├── types.ts             ← 新增：Plugin, PluginContext, InjectionConfig, ThemeConfig
│       ├── registry.ts          ← 重写：registerPlugin, findPlugin
│       ├── utils.ts             ← 新增：generateId
│       ├── plugins/
│       │   ├── index.ts         ← 新增：registerBuiltinPlugins
│       │   ├── chatgpt/
│       │   │   ├── plugin.ts    ← 新增：ChatGPT Plugin 完整实现
│       │   │   ├── tree-linearizer.ts    ← 从 manifest.ts 提取
│       │   │   ├── text-processor.ts     ← 原样搬
│       │   │   ├── types.ts              ← 原样搬
│       │   │   ├── constants.ts          ← 原样搬
│       │   │   └── content-flatteners/   ← 原样搬（整个目录）
│       │   │       ├── index.ts
│       │   │       ├── types.ts
│       │   │       ├── text-flattener.ts
│       │   │       ├── code-flattener.ts
│       │   │       ├── multimodal-text-flattener.ts
│       │   │       ├── thoughts-flattener.ts
│       │   │       ├── reasoning-recap-flattener.ts
│       │   │       ├── tool-response-flattener.ts
│       │   │       ├── model-editable-context-flattener.ts
│       │   │       └── fallback-flattener.ts
│       │   └── claude/
│       │       ├── plugin.ts             ← 新增：Claude Plugin 完整实现
│       │       ├── message-converter.ts  ← 原样搬
│       │       └── types.ts              ← 原样搬
│       ├── index.ts             ← 重写
│       └── __tests__/
│           └── registry.test.ts ← 新增（可选）
│
├── core-markdown/
│   └── src/
│       ├── serializer.ts        ← 重写：serializeContentBundle
│       ├── formats.ts           ← 修改：接受 ContentNode[]
│       ├── token-estimator.ts   ← 不变
│       ├── index.ts             ← 更新 exports
│       └── __tests__/
│           ├── serializer.test.ts ← 更新测试数据
│           └── formats.test.ts    ← 更新测试数据
│
└── (旧文件全部删除，见 Phase 4 Step 4.4)

apps/browser-extension/src/
├── entrypoints/content.tsx      ← 小改 import
├── components/
│   ├── app.tsx                  ← 改用 findPlugin
│   ├── copy-button.tsx          ← 不变
│   ├── list-copy-icon.tsx       ← 改用 findPlugin + serializeContentBundle
│   └── batch-mode/
│       ├── batch-provider.tsx   ← 不变
│       └── batch-bar.tsx        ← 不变
├── hooks/
│   ├── use-copy-conversation.ts ← 改用 plugin.extract() + serializeContentBundle
│   ├── use-batch-mode.ts        ← 改用 findPlugin + serializeContentBundles
│   └── use-extension-url.ts     ← 不变
├── injectors/
│   ├── base-injector.ts         ← 不变
│   └── plugin-injector.ts       ← 从 manifest-injector.ts 改名 + 小改
└── wxt.config.ts                ← 不变（EXTENSION_HOST_PERMISSIONS 导出名一样）
```

---

## 4. 风险和注意事项

### 4.1 最容易出错的迁移点

1. **ChatGPT tree linearization** — `buildLinearConversation()` 的 parent 链回溯逻辑。提取为独立文件后要确保 `mapping` 参数类型一致。风险：低（代码原样搬，不改逻辑）。

2. **ChatGPT content flatteners** — 7 个 flattener + fallback，有 registry 模式。整个目录原样搬，只改 import 路径。风险：低。

3. **Claude orgId 提取** — `extractAuth` hook 从 `document.cookie` 读 `lastActiveOrg`。迁移后逻辑一样，但要确保 fetchById() 场景下也能读到 cookie（现有代码用 `extractAuthHeadless()` 解决）。Plugin 里直接读 `document.cookie`，不需要区分两个函数。风险：低。

4. **序列化器 filterMessages() 参数变化** — 从 `Message[]` 变为 `ContentNode[]`。字段映射：`msg.role` -> `participantMap.get(node.participantId)?.role`，`msg.contentMarkdown` -> `node.content`。需要仔细对齐。风险：中。

5. **Extension import 路径** — 所有 `@ctxport/core-adapters/manifest` 子路径导入要改为 `@ctxport/core-adapters`。全局搜索替换。风险：低。

### 4.2 测试策略

1. **单元测试**：
   - registry.test.ts — 验证 registerPlugin / findPlugin
   - 序列化器测试 — 数据结构从 Conversation 改为 ContentBundle，断言逻辑基本不变

2. **手动端到端测试**：
   - ChatGPT: 打开对话页 -> copy 按钮出现 -> 点击复制 -> 粘贴到文本编辑器验证 Markdown 格式
   - ChatGPT: 侧边栏列表 -> hover 显示 copy icon -> 点击复制
   - ChatGPT: 批量模式 -> 选择多个对话 -> 批量复制
   - Claude: 同上三项
   - 非对话页（ChatGPT 首页）-> 无 copy 按钮出现，无报错

3. **Build 验证**：每完成一个 Phase 就跑 `pnpm build`，确保不破坏其他包。

### 4.3 实施顺序的理由

Phase 1-4 可以合并为一次大提交（因为类型系统变化是全局的，拆太细反而 build 不过）。但建议按顺序写代码：先定义类型 -> 再写 Plugin 实现 -> 再删旧代码 -> 最后改 extension。

**一个人干的话**，Phase 1-6 合计工作量大约是：
- 新增代码：~900 行
- 删除代码：~1800 行
- 修改代码：~400 行
- **净减少 ~900 行代码**

这是一次成功的重构——删的比写的多。

---

## 5. 不做的事

- 不改包名（core-adapters -> core-plugins）
- 不做 Zod schema for ContentBundle
- 不做 Stack Overflow Plugin（等核心重构完成后）
- 不做 Fetcher 抽象
- 不做 Plugin 动态加载 / marketplace
- 不做 OAuth
- 不重写 base-injector.ts 的 DOM 工具函数
- 不动 background.ts / popup/ 等无关文件

---

> *"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."*
> -- Antoine de Saint-Exupery
>
> 这次重构删掉了 1800 行框架代码（Manifest + Hooks + ManifestAdapter + 声明式配置），换成了 900 行直接实现。Plugin 就是一个对象，有 extract() 就够了。

---

*文档维护者：全栈开发（DHH 视角）*
*最后更新：2026-02-07*
