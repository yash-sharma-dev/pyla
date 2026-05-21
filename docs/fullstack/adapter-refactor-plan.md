# Adapter 声明式重构实施方案

> 版本：v1.0 | 日期：2026-02-07
> 角色：全栈技术主管（DHH 思维模型）
> 前置文档：
> - CTO 架构设计 `docs/cto/adr-declarative-adapter-architecture.md`
> - 产品 DX 评估 `docs/product/adapter-dx-assessment.md`

---

## 0. 方案总结

**一句话**：把 ChatGPT/Claude 两套 adapter + injector 的硬编码逻辑，渐进式替换为 manifest 配置 + 通用引擎，不断现有功能，5 个阶段完成。

**核心原则**：

1. **先能跑再清理** — 每个阶段结束都要有可工作的产品
2. **新旧并行** — 旧代码在 Phase 4 之前绝不删除
3. **三行代码比一个抽象更好** — 不为假想的未来多写一行代码
4. **Convention over Configuration** — 合理默认值，零配置就能覆盖最常见的场景

---

## 1. 现有代码评估

### 1.1 可以直接复用的代码

| 文件 | 复用方式 | 说明 |
|------|----------|------|
| `core-schema/src/adapter.ts` | **原封不动** | `Adapter` 接口、`ExtInput` 类型 — ManifestAdapter 直接实现这个接口 |
| `core-schema/src/conversation.ts` | **原封不动** | `Conversation`、`createConversation` — 输出格式不变 |
| `core-schema/src/message.ts` | **原封不动** | `Message`、`createMessage` — 消息格式不变 |
| `core-adapters/src/base.ts` | **保留核心函数** | `RawMessage`、`buildMessages()`、`buildConversation()` — ManifestAdapter 直接调用 |
| `core-adapters/src/registry.ts` | **原封不动** | `registerAdapter()`、`parseWithAdapters()` — ManifestAdapter 作为普通 Adapter 注册 |
| `core-adapters/src/extension-site-types.ts` | **原封不动** | `ExtensionSiteConfig` 接口 — 由桥接函数从 manifest 生成 |
| `injectors/base-injector.ts` | **原封不动** | `PlatformInjector` 接口、工具函数 — ManifestInjector 直接实现和调用 |
| `chatgpt/shared/types.ts` | **原封不动** | ChatGPT API 响应类型定义 |
| `chatgpt/shared/content-flatteners/*` | **原封不动** | 内容展平逻辑 — 由 ChatGPT 的 `extractMessageText` 钩子调用 |
| `chatgpt/shared/text-processor.ts` | **原封不动** | 文本后处理 — 由钩子调用 |
| `chatgpt/shared/constants.ts` | **原封不动** | 常量定义 |
| `claude/shared/types.ts` | **原封不动** | Claude API 响应类型定义 |
| `claude/shared/message-converter.ts` | **部分复用** | `extractClaudeMessageText()` 直接被 Claude 钩子调用；`convertClaudeMessagesToRawMessages()` 的排序和合并逻辑迁移到钩子中 |

### 1.2 必须新增的代码

| 新文件 | 位置 | 大致行数 | 说明 |
|--------|------|----------|------|
| `schema.ts` | `core-adapters/src/manifest/` | ~120 | AdapterManifest Zod schema |
| `hooks.ts` | `core-adapters/src/manifest/` | ~60 | AdapterHooks 类型定义 |
| `manifest-adapter.ts` | `core-adapters/src/manifest/` | ~200 | ManifestAdapter 通用引擎 |
| `manifest-registry.ts` | `core-adapters/src/manifest/` | ~30 | registerManifestAdapter 等 |
| `utils.ts` | `core-adapters/src/manifest/` | ~25 | getByPath、resolveTemplate |
| `index.ts` | `core-adapters/src/manifest/` | ~15 | barrel export |
| `chatgpt/manifest.ts` | `core-adapters/src/adapters/chatgpt/` | ~100 | ChatGPT manifest + hooks |
| `claude/manifest.ts` | `core-adapters/src/adapters/claude/` | ~80 | Claude manifest + hooks |
| `manifest-injector.ts` | `browser-extension/src/injectors/` | ~180 | ManifestInjector 通用引擎 |

**新增代码总量**：约 810 行。

### 1.3 最终可删除的代码（Phase 5）

| 文件 | 行数 | 说明 |
|------|------|------|
| `chatgpt/ext-adapter/index.ts` | 256 | ChatGPTExtAdapter 类 + token 管理 + site config |
| `claude/ext-adapter/index.ts` | 126 | ClaudeExtAdapter 类 + site config |
| `injectors/chatgpt-injector.ts` | 206 | ChatGPTInjector 类 |
| `injectors/claude-injector.ts` | 210 | ClaudeInjector 类 |

**可删除代码总量**：约 798 行。

### 1.4 判断：值得做

新增 810 行，删除 798 行 — **代码总量几乎不变**。但关键变化是：

- 核心引擎（ManifestAdapter + ManifestInjector）约 380 行，**写一次**
- 每个新平台只需约 80 行 manifest 配置
- 第 3 个平台开始，边际成本从 ~500 行降到 ~80 行

---

## 2. 分阶段重构计划

### Phase 1：添加 manifest 基础设施（不动现有代码）

**目标**：新增 manifest 框架层代码，编译通过，不影响现有功能。

**改动文件**：

```
新增:
  packages/core-adapters/src/manifest/
    ├── schema.ts           — AdapterManifest Zod schema
    ├── hooks.ts            — AdapterHooks 类型定义
    ├── manifest-adapter.ts — ManifestAdapter 通用引擎
    ├── manifest-registry.ts — registerManifestAdapter + getRegisteredManifests
    ├── utils.ts            — getByPath, resolveTemplate
    └── index.ts            — barrel export

  apps/browser-extension/src/injectors/
    └── manifest-injector.ts — ManifestInjector 通用引擎

修改:
  packages/core-adapters/package.json — 新增 manifest sub-path export
```

**验证标准**：
1. `pnpm typecheck` 全部通过
2. `pnpm build` 全部通过
3. 现有测试全部通过（`pnpm test`）
4. 浏览器扩展正常加载，ChatGPT/Claude 功能不受影响

**回滚方案**：直接删除新增的 `manifest/` 目录和 `manifest-injector.ts`，回退 `package.json` 改动。零风险。

---

### Phase 2：创建 manifest 定义（新旧并行）

**目标**：为 ChatGPT 和 Claude 编写 manifest + hooks，注册为 ManifestAdapter，与旧 adapter 并行存在。

**改动文件**：

```
新增:
  packages/core-adapters/src/adapters/chatgpt/manifest.ts
  packages/core-adapters/src/adapters/claude/manifest.ts

修改:
  packages/core-adapters/src/index.ts — 新增 manifest adapter 导出和注册
```

**关键细节**：

manifest adapter 的 `id` 使用新值（如 `"chatgpt-ext-v2"`、`"claude-ext-v2"`），避免与旧 adapter 的 `id` 冲突。这样两套 adapter 可以同时注册到 registry 中。

在 `parseWithAdapters()` 中，adapter 按注册顺序尝试。Phase 2 中旧 adapter 先注册，新 adapter 后注册。这意味着旧 adapter 优先匹配，新 adapter 只在开发/测试模式下被主动调用。

```typescript
// index.ts — Phase 2 的注册逻辑
export function registerBuiltinAdapters(): void {
  // 旧 adapter 优先（生产环境实际使用）
  if (!_getAdapter(_chatGPTExtAdapter.id)) {
    _registerAdapter(_chatGPTExtAdapter);
  }
  if (!_getAdapter(_claudeExtAdapter.id)) {
    _registerAdapter(_claudeExtAdapter);
  }

  // 新 manifest adapter 并行注册（用于对比测试）
  registerManifestAdapter({ manifest: chatgptManifest, hooks: chatgptHooks });
  registerManifestAdapter({ manifest: claudeManifest, hooks: claudeHooks });
}
```

**验证标准**：
1. 编译和类型检查通过
2. 现有功能不受影响（旧 adapter 优先匹配）
3. 可以通过开发者工具手动调用 ManifestAdapter 进行解析，对比输出

**回滚方案**：删除两个 `manifest.ts` 文件，回退 `index.ts`。

---

### Phase 3：对比验证

**目标**：确认 ManifestAdapter 的输出与旧 adapter 完全一致。

**改动文件**：

```
新增:
  packages/core-adapters/src/__tests__/manifest-adapter.test.ts
  packages/core-adapters/src/__tests__/manifest-parity.test.ts
  packages/core-adapters/src/__tests__/fixtures/
    ├── chatgpt-response.json    — 真实 ChatGPT API 响应快照
    └── claude-response.json     — 真实 Claude API 响应快照
```

**验证方法**：

1. **单元测试**：用 fixture JSON 分别调用旧 adapter 的 `convertShareDataToMessages()` 和新 ManifestAdapter 的 `parseResponse()`，对比输出的 `RawMessage[]`
2. **Parity test**：逐字段比较两个 adapter 生成的 `Conversation` 对象（忽略 `id`、`parsedAt` 等时间戳字段）
3. **手工端到端测试**：在真实 ChatGPT/Claude 页面上，分别用旧/新 adapter 复制同一个对话，对比 Markdown 输出

**验证标准**：
1. parity test 100% 通过
2. 在 3 种对话类型上手工验证：纯文本对话、含代码块对话、含图片/artifact 对话

**回滚方案**：不需要回滚——这个阶段只添加测试，不改生产代码。

---

### Phase 4：切换到 manifest adapter

**目标**：将 ManifestAdapter 设为主 adapter，旧 adapter 降级为 fallback。

**改动文件**：

```
修改:
  packages/core-adapters/src/index.ts
    — 调换注册顺序：ManifestAdapter 先注册
    — 旧 adapter 作为 fallback

  packages/core-adapters/src/extension-sites.ts
    — 从 manifest 自动生成 EXTENSION_SITE_CONFIGS

  apps/browser-extension/src/components/app.tsx
    — detectPlatform() 改为从 manifest registry 查找
    — isConversationPage() 改为从 manifest patterns 匹配
    — 使用 ManifestInjector 替代 ChatGPTInjector/ClaudeInjector

  apps/browser-extension/src/injectors/base-injector.ts
    — PlatformInjector.platform 类型从 "chatgpt" | "claude" 改为 string
```

**关键细节**：

**extension-sites.ts 的改造**：

```typescript
// 从 manifest 自动生成 site config 列表
import { getRegisteredManifests } from "./manifest/manifest-registry";

function manifestToSiteConfig(entry: ManifestEntry): ExtensionSiteConfig {
  const { manifest, hooks } = entry;
  return {
    id: manifest.provider,
    provider: manifest.provider as Provider,
    name: manifest.name,
    hostPermissions: manifest.urls.hostPermissions,
    hostPatterns: manifest.urls.hostPatterns,
    conversationUrlPatterns: manifest.urls.conversationUrlPatterns,
    getConversationId: (url: string) => {
      if (hooks?.extractConversationId) {
        return hooks.extractConversationId(url);
      }
      for (const pattern of manifest.urls.conversationUrlPatterns) {
        const match = pattern.exec(url);
        if (match?.[1]) return match[1];
      }
      return null;
    },
    theme: manifest.theme,
  };
}

// 保持 EXTENSION_SITE_CONFIGS 的类型签名不变
export const EXTENSION_SITE_CONFIGS: ExtensionSiteConfig[] =
  getRegisteredManifests().map(manifestToSiteConfig);
```

**app.tsx 的改造**：

```typescript
// 从 manifest 驱动，消除硬编码
import { getRegisteredManifests } from "@ctxport/core-adapters/manifest";
import { ManifestInjector } from "~/injectors/manifest-injector";

function detectManifest(url: string) {
  return getRegisteredManifests().find((entry) =>
    entry.manifest.urls.hostPatterns.some((p) => p.test(url)),
  );
}

function isConversationPage(url: string): boolean {
  return getRegisteredManifests().some((entry) =>
    entry.manifest.urls.conversationUrlPatterns.some((p) => p.test(url)),
  );
}

// 在 useEffect 中：
const entry = detectManifest(url);
if (entry) {
  const injector = new ManifestInjector(entry.manifest);
  injectorRef.current = injector;
  // ...其余逻辑不变
}
```

**验证标准**：
1. 编译和类型检查通过
2. 所有测试通过
3. ChatGPT 端到端：打开对话页 → 复制 → 粘贴到编辑器 → 内容完整
4. Claude 端到端：同上
5. 侧边栏列表图标正常显示、hover 效果正常
6. 批量选择功能正常
7. Floating copy button fallback 正常

**回滚方案**：在 `index.ts` 中调换回注册顺序（ManifestAdapter 后注册），在 `app.tsx` 中恢复旧 injector。改动量 < 10 行。

---

### Phase 5：清理旧代码

**目标**：删除不再需要的旧 adapter 和 injector 类。

**改动文件**：

```
删除:
  packages/core-adapters/src/adapters/chatgpt/ext-adapter/index.ts
  packages/core-adapters/src/adapters/claude/ext-adapter/index.ts
  apps/browser-extension/src/injectors/chatgpt-injector.ts
  apps/browser-extension/src/injectors/claude-injector.ts
  packages/core-adapters/src/adapters.ts  (如果存在)

修改:
  packages/core-adapters/src/base.ts
    — 删除 BaseExtAdapter 抽象类（ManifestAdapter 不需要它）
    — 保留 RawMessage, buildMessages, buildConversation 等公共函数

  packages/core-adapters/src/index.ts
    — 移除旧 adapter 的导出和注册
    — 只保留 manifest adapter 的注册

  packages/core-adapters/package.json
    — 移除旧的 sub-path exports:
      "./adapters/chatgpt/ext-adapter"
      "./adapters/claude/ext-adapter"
    — 新增 manifest 相关 exports

  packages/core-schema/src/conversation.ts
    — Provider enum 可能需要扩展（为新平台预留）
```

**验证标准**：
1. 编译和类型检查通过（确认没有悬挂引用）
2. 所有测试通过
3. 端到端完整验证

**回滚方案**：git revert。Phase 5 应该在 Phase 4 稳定运行至少一个版本之后再执行。

---

## 3. 技术决策

### 3.1 新增文件和模块组织

```
packages/core-adapters/src/
├── manifest/                          # [新增] 声明式框架核心
│   ├── index.ts                       # barrel export
│   ├── schema.ts                      # AdapterManifest Zod schema
│   ├── hooks.ts                       # AdapterHooks 类型定义
│   ├── manifest-adapter.ts            # ManifestAdapter 通用引擎
│   ├── manifest-registry.ts           # manifest 注册/查询
│   └── utils.ts                       # getByPath, resolveTemplate
├── adapters/
│   ├── chatgpt/
│   │   ├── manifest.ts                # [新增] 声明 + 钩子
│   │   ├── ext-adapter/index.ts       # [Phase 5 删除]
│   │   └── shared/                    # [保留] 类型和工具函数
│   └── claude/
│       ├── manifest.ts                # [新增] 声明 + 钩子
│       ├── ext-adapter/index.ts       # [Phase 5 删除]
│       └── shared/                    # [保留] 类型和工具函数
├── base.ts                            # [保留] RawMessage, buildConversation
├── registry.ts                        # [保留] Adapter 级 registry
├── extension-sites.ts                 # [Phase 4 修改] 从 manifest 生成
├── extension-site-types.ts            # [保留]
└── index.ts                           # [Phase 2/4 修改]

apps/browser-extension/src/injectors/
├── base-injector.ts                   # [保留] PlatformInjector + 工具函数
├── manifest-injector.ts               # [新增] 通用引擎
├── chatgpt-injector.ts                # [Phase 5 删除]
└── claude-injector.ts                 # [Phase 5 删除]
```

### 3.2 Package sub-path exports 变更

**Phase 1 新增**：

```jsonc
// packages/core-adapters/package.json
{
  "exports": {
    // ...现有 exports 不动...
    "./manifest": {
      "types": "./src/manifest/index.ts",
      "development": "./src/manifest/index.ts",
      "import": "./src/manifest/index.ts",
      "default": "./src/manifest/index.ts"
    },
    "./manifest/schema": {
      "types": "./src/manifest/schema.ts",
      "development": "./src/manifest/schema.ts",
      "import": "./src/manifest/schema.ts",
      "default": "./src/manifest/schema.ts"
    }
  }
}
```

**Phase 5 移除**：

```jsonc
// 删除这些 sub-path（旧 adapter 的直接导入路径）
"./adapters/chatgpt/ext-adapter": ...
"./adapters/claude/ext-adapter": ...
```

### 3.3 对外暴露的 API

**新增公共 API**（从 `@ctxport/core-adapters/manifest` 导出）：

```typescript
// 注册
export function registerManifestAdapter(entry: ManifestEntry): ManifestAdapter;
export function registerManifestAdapters(entries: ManifestEntry[]): ManifestAdapter[];

// 查询
export function getRegisteredManifests(): ManifestEntry[];

// 桥接
export function manifestToSiteConfig(entry: ManifestEntry): ExtensionSiteConfig;

// 类型
export type { AdapterManifest } from "./schema";
export type { AdapterHooks, HookContext } from "./hooks";
export type { ManifestEntry } from "./manifest-registry";
```

**不对外暴露的内部 API**：

- `ManifestAdapter` class — 由 `registerManifestAdapter` 内部创建
- `ManifestInjector` class — 仅在 browser-extension 内部使用
- `getByPath()`、`resolveTemplate()` — 工具函数，内部使用

### 3.4 PlatformInjector 接口变更

当前 `PlatformInjector.platform` 类型是 `"chatgpt" | "claude"` 字面量联合类型。为了支持任意平台，改为 `string`：

```typescript
// base-injector.ts
export interface PlatformInjector {
  readonly platform: string;  // 从 "chatgpt" | "claude" 改为 string
  // ...其余不变
}
```

这是一个无破坏性改动 — `"chatgpt"` 和 `"claude"` 仍然满足 `string` 类型。

---

## 4. 关键实现思路

### 4.1 ManifestAdapter 引擎

CTO 的 ADR 中已经给出了完整的伪代码（`adr-declarative-adapter-architecture.md` Section 4.1）。我在实现时做以下调整：

**调整一：token 管理提取为独立模块**

CTO 设计中 token 缓存逻辑内嵌在 ManifestAdapter 里。但看现有 ChatGPT adapter（`ext-adapter/index.ts:36-160`），token 管理代码有 120+ 行。把它内嵌到 ManifestAdapter 会让引擎类过于臃肿。

```typescript
// manifest/token-manager.ts — 只在 bearer-from-api 模式下使用
export class TokenManager {
  private cache: { token: string; expiresAt: number } | null = null;
  private pending: Promise<string> | null = null;

  constructor(
    private endpoint: string,
    private tokenPath: string,
    private expiresPath?: string,
    private ttlMs = 600_000,
  ) {}

  async getToken(forceRefresh = false): Promise<string> { /* ... */ }
  invalidate(): void { this.cache = null; }
}
```

这样 ManifestAdapter 中只需要：

```typescript
private tokenManager?: TokenManager;

constructor(manifest, hooks) {
  if (manifest.auth.method === "bearer-from-api") {
    this.tokenManager = new TokenManager(
      manifest.auth.sessionEndpoint!,
      manifest.auth.tokenPath!,
      manifest.auth.expiresPath,
      manifest.auth.tokenTtlMs,
    );
  }
}
```

**调整二：parse() 方法中 bearer token 走 resolveAuth 统一路径**

```typescript
private async resolveAuth(ctx: HookContext): Promise<Record<string, string>> {
  // 优先走钩子
  if (this.hooks.extractAuth) {
    return this.hooks.extractAuth(ctx) ?? {};
  }

  // bearer-from-api：从 TokenManager 获取 token
  if (this.tokenManager) {
    const token = await this.tokenManager.getToken();
    return { _bearerToken: token };
  }

  // cookie-session / none：不需要额外认证变量
  return {};
}
```

**调整三：extractMessageText 钩子支持异步**

现有 ChatGPT 的 `flattenMessageContent()` 是 `async` 的（因为某些 content flattener 可能有异步操作）。CTO 设计中的 `extractMessageText` 钩子签名是同步的。需要改为支持 `async`：

```typescript
// hooks.ts
extractMessageText?: (rawMessage: unknown, ctx: HookContext) => string | Promise<string>;
```

ManifestAdapter 的 `parseResponse()` 相应改为 `async`，在循环中 `await` 每条消息的文本提取。

### 4.2 ManifestInjector 引擎

CTO 的设计已经很完整。实现时的调整：

**调整一：复用现有 injector 的全部辅助函数**

`base-injector.ts` 中的 `markInjected`、`isInjected`、`createContainer`、`removeAllByClass`、`debouncedObserverCallback`、`INJECTION_DELAY_MS` 全部直接导入使用，不重复实现。

**调整二：list icon 的 hover 效果**

对比 `ChatGPTInjector.tryInjectListIcons()` 和 `ClaudeInjector.tryInjectListIcons()`，两者的 hover 逻辑完全一致。ManifestInjector 直接统一实现。

**调整三：removeBatchCheckboxes 中的选择器**

当前两个 injector 在 `removeBatchCheckboxes()` 中硬编码了各自的链接选择器。ManifestInjector 直接从 `manifest.injection.listItem.linkSelector` 读取。

### 4.3 getByPath / resolveTemplate 工具函数

直接按 CTO 设计实现，不做改动：

```typescript
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

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

**不做的事**：不引入 JSONPath 库，不支持数组索引。如果将来有平台需要 `a[0].b` 这种路径，用 `transformResponse` 钩子先把数据 normalize 掉。

### 4.4 Manifest 注册和发现机制

**注册时序**：

```
应用启动
  → registerBuiltinAdapters() 被调用
    → 为每个内置 manifest（chatgpt, claude）创建 ManifestAdapter
    → 调用 registerAdapter() 注册到全局 registry（core-adapters/src/registry.ts）
    → 同时存一份 ManifestEntry 到 manifest registry（用于 injector 查询）
```

**两个 registry 的关系**：

- `core-adapters/src/registry.ts`：Adapter 级别的 registry。存储 `Adapter` 接口实例。`parseWithAdapters()` 从这里查找。
- `core-adapters/src/manifest/manifest-registry.ts`：Manifest 级别的 registry。存储 `{ manifest, hooks }` 对。App.tsx 和 ManifestInjector 从这里查找配置。

为什么要两个 registry？因为 Adapter 接口是最终的消费接口，ManifestAdapter 只是其中一种实现。未来可能有非 manifest 的 adapter（如完全自定义的类继承 adapter），它们只需要注册到 Adapter registry。而 manifest registry 专门服务于声明式框架的消费者（injector、site config 生成器等）。

```typescript
// manifest/manifest-registry.ts
const manifests: ManifestEntry[] = [];

export function registerManifestAdapter(entry: ManifestEntry): ManifestAdapter {
  const adapter = new ManifestAdapter(entry.manifest, entry.hooks);
  registerAdapter(adapter);  // 注册到 Adapter registry
  manifests.push(entry);     // 同时存到 manifest registry
  return adapter;
}

export function getRegisteredManifests(): ManifestEntry[] {
  return [...manifests];
}
```

### 4.5 ChatGPT Manifest 实现要点

ChatGPT 是"需要钩子"的典型案例。两个关键钩子：

**transformResponse**：ChatGPT API 返回的是树状 `mapping` 结构（parent/children 链表），需要先线性化。这段逻辑从现有 `buildLinearConversation()` 函数直接迁移：

```typescript
transformResponse(raw: unknown) {
  const data = raw as { title?: string; mapping?: Record<string, MessageNode>; current_node?: string };
  const mapping = data.mapping ?? {};
  const linear = buildLinearConversation(mapping, data.current_node);
  const linearMessages = linear.map((id) => mapping[id]).filter(Boolean);
  return {
    data: { ...data, _linearMessages: linearMessages },
    title: data.title,
  };
}
```

**extractMessageText**：ChatGPT 消息的 `content.parts` 是一个复杂数组（含文本、图片指针、代码块等），需要调用现有的 `flattenMessageContent()` + `stripCitationTokens()`：

```typescript
async extractMessageText(rawMessage: unknown) {
  const node = rawMessage as MessageNode;
  if (!node.message?.content) return "";
  const { flattenMessageContent } = await import("./shared/content-flatteners");
  const { stripCitationTokens } = await import("./shared/text-processor");
  let text = await flattenMessageContent(node.message.content, {});
  text = stripCitationTokens(text);
  return text;
}
```

用 dynamic import 而非 static import，因为 content-flatteners 模块较大且有多个子模块。如果某些平台不需要这些 flattener，tree-shaking 可以排除它们。

### 4.6 Claude Manifest 实现要点

Claude 的 manifest 更简洁，但有三个特殊钩子：

**extractAuth**：从 cookie 提取 `orgId`（直接从现有 `extractOrgIdFromCookie()` 迁移）。

**extractMessageText**：调用现有的 `extractClaudeMessageText()`，处理 `content` 数组和 artifact 归一化。

**afterParse**：合并连续同角色消息。从现有 `convertClaudeMessagesToRawMessages()` 中的合并逻辑迁移。

---

## 5. 风险和降级

### 5.1 最大的技术风险

**风险一：ChatGPT 的 shouldSkipMessage 逻辑迁移不完整**

现有 `message-converter.ts` 的 `shouldSkipMessage()` 函数检查了 7 种跳过条件，包括 `reasoning_status` 这种不容易用声明式 filter 表达的条件（它检查 `Boolean(message.metadata?.reasoning_status)` — 即字段存在且非假值）。

CTO 设计中的 `filters.skipWhen` 支持 `exists: true` 条件，但语义是"字段存在且非 null/undefined"，与 `Boolean()` 的 truthy 语义不完全一致（`Boolean("")` 是 false，但 `"" != null` 是 true）。

**缓解**：在 ManifestAdapter 的 `shouldSkip()` 实现中，`exists: true` 检查用 `value != null` 判断。对于 `reasoning_status` 这种需要 truthy 判断的场景，改用 `matchesPattern: ".+"` 来匹配非空字符串。或者直接在 `shouldSkipMessage` 的现有逻辑上增加一个 filter 条件类型 `truthy: true`。最简单的方案：在 ChatGPT 的 `transformResponse` 钩子中，把 `reasoning_status` 存在时的消息直接标记为 skip，不依赖声明式 filter。

**风险二：ManifestInjector 的 CSS 选择器 fallback 不够用**

某些 AI 平台的 DOM 结构可能非常特殊（如 Shadow DOM、iframe 嵌套），ManifestInjector 的选择器方案覆盖不了。

**缓解**：ManifestInjector 已经有 MutationObserver 重试机制 + fallback 到 FloatingCopyButton。极端情况下，可以为特定平台创建 ManifestInjector 子类覆盖注入逻辑。

**风险三：异步 extractMessageText 影响性能**

ChatGPT 对话可能有 100+ 条消息，每条消息都 `await extractMessageText()` 会导致顺序等待。

**缓解**：在 ManifestAdapter 的消息解析循环中，用 `Promise.all()` 并行处理所有消息的文本提取：

```typescript
const textPromises = sorted.map(async (rawMsg) => {
  if (this.shouldSkip(rawMsg)) return null;
  // ... role mapping ...
  const text = this.hooks.extractMessageText
    ? await this.hooks.extractMessageText(rawMsg, ctx)
    : String(getByPath(rawMsg, parsing.content.textPath) ?? "");
  return text.trim() ? { role: mappedRole, content: text } : null;
});
const results = await Promise.all(textPromises);
const messages = results.filter(Boolean) as RawMessage[];
```

### 5.2 回退策略汇总

| 阶段 | 回退方式 | 影响范围 | 操作量 |
|------|---------|---------|--------|
| Phase 1 | 删除新增文件 | 零 | < 5 分钟 |
| Phase 2 | 删除 manifest.ts + 回退 index.ts | 零 | < 5 分钟 |
| Phase 3 | 删除测试文件 | 零 | < 2 分钟 |
| Phase 4 | 回退 index.ts 注册顺序 + app.tsx | 零 | < 10 分钟 |
| Phase 5 | `git revert` | 零（Phase 4 的代码还在） | < 2 分钟 |

**核心保障**：Phase 5 之前，旧代码始终完整存在。任何时候发现问题，改一行注册顺序就能切回旧 adapter。

### 5.3 性能影响评估

| 指标 | 影响 | 说明 |
|------|------|------|
| 初始化时间 | 可忽略 | Zod schema 验证在注册时执行一次，< 1ms |
| 解析时间 | 基本持平 | ManifestAdapter 的解析路径与旧 adapter 一致：fetch → transform → parse |
| 包体积 | 略增约 2-3KB | manifest schema Zod 定义 + 工具函数；但 Phase 5 删除旧代码后基本抵消 |
| 内存占用 | 可忽略 | 多了 manifest 配置对象的内存（< 1KB per platform） |
| DOM 注入延迟 | 持平 | ManifestInjector 的注入机制与旧 injector 完全一致 |

---

## 6. 执行优先级

```
Phase 1（约 2 小时）→ Phase 2（约 2 小时）→ Phase 3（约 3 小时）→ Phase 4（约 2 小时）→ Phase 5（约 1 小时）
```

总工作量约 10 小时。建议 Phase 1-3 在同一天完成（foundation + manifests + 验证），Phase 4 作为独立 PR 发布，Phase 5 在 Phase 4 稳定后执行。

**Phase 1-2 可以合并为一个 PR**：基础设施 + manifest 定义一起提交，减少 PR 数量。

**Phase 3 可以与 Phase 2 合并**：测试和 manifest 定义一起提交。

**建议 PR 策略**：

1. PR #1：Phase 1 + 2 + 3（添加 manifest 框架 + 定义 + 对比测试）
2. PR #2：Phase 4（切换到 manifest adapter）
3. PR #3：Phase 5（清理旧代码）

---

*产出人：全栈技术主管（DHH 思维模型）*
*日期：2026-02-07*
