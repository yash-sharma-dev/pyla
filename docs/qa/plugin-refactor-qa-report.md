# Plugin 系统重构 QA 验收报告

**日期**: 2026-02-07
**验收版本**: main 分支, commit c2a6d7e 之后
**验收人**: QA Agent (James Bach model)

---

## 总结

| 验收项 | 结果 | 备注 |
|--------|------|------|
| 构建验证 | PASS | 4 个包全部构建成功 |
| 测试验证 | PASS | core-markdown 19/19, 其余 passWithNoTests |
| 旧代码清理 | PASS (有残留，非阻塞) | 源码无残留 import; 配置文件和文档有残留引用 |
| 新代码完整性 | PASS | Plugin 接口、Registry、ChatGPT/Claude 核心逻辑完整 |
| Extension 集成 | PASS | 所有文件已迁移至 `@ctxport/core-plugins` API |

**最终判定: PASS -- 可以合并**

---

## 1. 构建验证

```
pnpm build → turbo run build → 4 packages, 4 successful
```

| 包 | 结果 | 产物 |
|----|------|------|
| @ctxport/core-schema | PASS | ESM + DTS |
| @ctxport/core-plugins | PASS | 24 个 entry points, ESM + DTS |
| @ctxport/core-markdown | PASS | ESM + DTS |
| @ctxport/extension | PASS | chrome-mv3, 626.81 KB total |

**注意**: core-plugins 构建产出 4 个 "Generated an empty chunk: types" 警告。这是因为 `types.ts` 文件只导出 TypeScript 类型（编译后为空），属于正常行为，不影响功能。

---

## 2. 测试验证

```
pnpm test → turbo run test → 7 tasks (4 test + 3 build dependencies), 7 successful
```

| 包 | 测试文件 | 测试数量 | 结果 |
|----|----------|----------|------|
| core-schema | 0 | 0 | passWithNoTests |
| core-plugins | 0 | 0 | passWithNoTests |
| core-markdown | 2 | 19 | ALL PASS |
| extension | 0 | 0 | passWithNoTests |

**风险评估**: core-plugins 包是本次重构的核心变更，但没有单元测试。ChatGPT Plugin 的 tree linearization、content flattening、token cache、401 retry 逻辑和 Claude Plugin 的 orgId 提取、message text 提取、连续消息合并逻辑目前依赖集成测试（在浏览器中手动验证）。建议后续补充自动化测试。

---

## 3. 旧代码清理验证

### 3.1 core-adapters 目录

```
ls packages/core-adapters/ → No such file or directory
```

**PASS** -- 目录已完全删除。

### 3.2 源码中的 `core-adapters` import

在所有 `.ts/.tsx` 源码文件中搜索 `from '@ctxport/core-adapters` 或 `from "@ctxport/core-adapters`：

```
结果: 0 matches
```

**PASS** -- 源码无残留 import。

### 3.3 配置文件残留 (非阻塞)

发现 2 处配置文件残留引用 `core-adapters`：

| 文件 | 行号 | 内容 | 严重性 |
|------|------|------|--------|
| `tsconfig.json` | 5 | `{ "path": "./packages/core-adapters" }` | Minor -- 指向不存在的路径，TypeScript 会忽略 |
| `.gitignore` | 62 | `!packages/core-adapters/src/manifest/` | Trivial -- 无功能影响 |

**建议**: 清理这两处引用。`tsconfig.json` 应将 `core-adapters` 改为 `core-plugins`; `.gitignore` 应删除该行。

### 3.4 文档残留 (非阻塞)

大量历史文档仍引用 `core-adapters`（约 230+ 处），包括:
- `docs/qa/*.md` (历史 QA 报告)
- `docs/cto/*.md` (历史 ADR 文档)
- `docs/fullstack/*.md` (历史开发计划)
- `docs/product/*.md` (历史评估文档)

这些是历史记录，保留原样是合理的。不需要修改。

### 3.5 旧类型引用检查

在所有 `.ts/.tsx` 源码中搜索旧类型名 `Conversation`, `MessageRole`, `AdapterManifest`:

| 搜索词 | 源码匹配 | 评估 |
|--------|----------|------|
| `Conversation` | `popup/main.tsx:82` "Copy Current Conversation" (UI 文案) | OK -- 非类型引用 |
| `Conversation` | `core-markdown` 测试中 `"Test Conversation"` (测试数据) | OK -- 非类型引用 |
| `MessageRole` | `core-plugins/src/plugins/chatgpt/constants.ts:14` | OK -- 新代码中的内部常量 |
| `AdapterManifest` | 0 matches | PASS |

**PASS** -- 无旧类型残留。

---

## 4. 新代码完整性

### 4.1 core-plugins 包结构

```
packages/core-plugins/src/
├── index.ts                          # barrel export (types, registry, utils, plugins)
├── registry.ts                       # Plugin registry (register, find, getAll, getAllHostPermissions, clear)
├── types.ts                          # Plugin, PluginContext, PluginInjector, InjectorCallbacks, ThemeConfig
├── utils.ts                          # generateId (uuid v4)
└── plugins/
    ├── index.ts                      # registerBuiltinPlugins(), export chatgptPlugin/claudePlugin
    ├── shared/
    │   └── chat-injector.ts          # createChatInjector factory (MutationObserver 注入)
    ├── chatgpt/
    │   ├── plugin.ts                 # chatgptPlugin 定义 (extract, fetchById, injector, theme)
    │   ├── constants.ts              # ContentType, MessageRole 常量
    │   ├── text-processor.ts         # stripCitationTokens, stripPrivateUse
    │   ├── tree-linearizer.ts        # buildLinearConversation (tree → linear array)
    │   ├── types.ts                  # ChatGPT API response types
    │   └── content-flatteners/
    │       ├── index.ts              # flattenMessageContent + registry
    │       ├── types.ts              # ContentFlattener interface
    │       ├── text-flattener.ts
    │       ├── code-flattener.ts
    │       ├── multimodal-text-flattener.ts
    │       ├── thoughts-flattener.ts
    │       ├── reasoning-recap-flattener.ts
    │       ├── tool-response-flattener.ts
    │       ├── model-editable-context-flattener.ts
    │       └── fallback-flattener.ts
    └── claude/
        ├── plugin.ts                 # claudePlugin 定义 (extract, fetchById, injector, theme)
        ├── message-converter.ts      # extractClaudeMessageText + artifact normalization
        └── types.ts                  # Claude API response types
```

**PASS** -- 结构完整，24 个源码文件。

### 4.2 ChatGPT Plugin 核心逻辑验证

| 功能 | 文件:行号 | 状态 |
|------|-----------|------|
| Tree linearization (parent chain walk + fallback sort) | `tree-linearizer.ts:8-36` | 完整 |
| Content flattening (8 types + fallback) | `content-flatteners/index.ts` + 8 个 flattener | 完整 |
| Token cache (expiry skew + dedup promise) | `plugin.ts:73-120` | 完整 |
| 401 retry (cache invalidate + force refresh) | `plugin.ts:151-167` | 完整 |
| URL matching (chatgpt.com + chat.openai.com) | `plugin.ts:11-13` | 完整 |
| extract() (URL → API → ContentBundle) | `plugin.ts:30-36` | 完整 |
| fetchById() (sidebar list copy) | `plugin.ts:38-42` | 完整 |

### 4.3 Claude Plugin 核心逻辑验证

| 功能 | 文件:行号 | 状态 |
|------|-----------|------|
| orgId 提取 (cookie parsing) | `plugin.ts:73-77` | 完整 |
| Message text 提取 (content array + fallback text) | `message-converter.ts:16-33` | 完整 |
| Artifact normalization (antArtifact → code block) | `message-converter.ts:3-14` | 完整 |
| 连续消息合并 (same sender merge) | `plugin.ts:130-141` | 完整 |
| Message 排序 (created_at → index fallback) | `plugin.ts:107-113` | 完整 |
| URL matching (claude.ai) | `plugin.ts:9` | 完整 |
| extract() (URL → API → ContentBundle) | `plugin.ts:23-32` | 完整 |
| fetchById() (sidebar list copy) | `plugin.ts:34-41` | 完整 |

### 4.4 Plugin Registry 验证

| API | 文件:行号 | 状态 |
|-----|-----------|------|
| `registerPlugin(plugin)` | `registry.ts:5-9` | 完整，含重复注册保护 |
| `findPlugin(url)` | `registry.ts:13-17` | 完整，遍历所有 plugin 匹配 URL |
| `getAllPlugins()` | `registry.ts:20-22` | 完整 |
| `getAllHostPermissions()` | `registry.ts:24-26` | 完整，flatMap 所有 plugin hosts |
| `clearPlugins()` | `registry.ts:28-30` | 完整 |
| `registerBuiltinPlugins()` | `plugins/index.ts:5-8` | 完整，注册 chatgpt + claude |

### 4.5 Shared Injector 验证

`createChatInjector()` factory (`chat-injector.ts:63-224`):
- 配置化注入：copyButtonSelectors, listItemLinkSelector, listItemIdPattern, mainContentSelector, sidebarSelector
- MutationObserver 监听 DOM 变化自动注入
- debounced observer callback 防止过频触发
- `data-ctxport-injected` 属性防重复注入
- cleanup() 方法完整清理 observer、timer、DOM 元素

---

## 5. Extension 集成验证

### 5.1 import 路径迁移

| Extension 文件 | import 来源 | 使用的 API | 状态 |
|----------------|-------------|------------|------|
| `wxt.config.ts` | `@ctxport/core-plugins` | `EXTENSION_HOST_PERMISSIONS` | OK |
| `content.tsx` | `@ctxport/core-plugins` | `EXTENSION_HOST_PERMISSIONS`, `registerBuiltinPlugins` | OK |
| `extension-runtime.ts` | `@ctxport/core-plugins` | `getAllPlugins` | OK |
| `app.tsx` | `@ctxport/core-plugins` | `findPlugin`, `type Plugin` | OK |
| `use-copy-conversation.ts` | `@ctxport/core-plugins` | `findPlugin` | OK |
| `list-copy-icon.tsx` | `@ctxport/core-plugins` | `findPlugin` | OK |
| `use-batch-mode.ts` | `@ctxport/core-plugins` | `findPlugin` | OK |
| `background.ts` | (间接) via `extension-runtime.ts` | `isSupportedTabUrl` | OK |

所有 extension 文件均已从 `@ctxport/core-adapters` 迁移到 `@ctxport/core-plugins`。无残留旧 import。

### 5.2 host_permissions 验证

构建产物 `dist/chrome-mv3/manifest.json` 中的 host_permissions:

```json
["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*"]
```

content_scripts.matches:
```json
["https://chat.openai.com/*", "https://chatgpt.com/*", "https://claude.ai/*"]
```

**PASS** -- 覆盖 ChatGPT (两个域名) + Claude，与 Plugin 定义一致。

### 5.3 数据流完整性

Extension 端数据流：
```
Plugin.extract(ctx) → ContentBundle → serializeConversation(bundle) → Markdown → clipboard
Plugin.fetchById(id) → ContentBundle → serializeConversation(bundle) → Markdown → clipboard  (list copy)
Plugin.fetchById(id) x N → ContentBundle[] → serializeBundle(bundles) → Markdown → clipboard  (batch mode)
```

所有路径均使用新 `ContentBundle` 数据模型，无旧 `Conversation`/`Message` 类型引用。

---

## 6. 发现的问题

### P3 (Minor) -- 配置文件残留

**tsconfig.json:5**: `{ "path": "./packages/core-adapters" }` -- 指向不存在的包。应改为 `{ "path": "./packages/core-plugins" }`。

**.gitignore:62**: `!packages/core-adapters/src/manifest/` -- 无意义规则。应删除。

### P4 (建议) -- core-plugins 缺少单元测试

core-plugins 包 (24 个源文件) 目前零测试。作为 Plugin 系统的核心包，建议优先补充以下测试：

1. **Plugin Registry**: register/find/getAll/clear 的基本行为
2. **ChatGPT tree linearizer**: parent chain walk + fallback sort
3. **ChatGPT content flatteners**: 各 content type 的 flatten 结果
4. **Claude message converter**: text 提取 + artifact normalization + 连续合并
5. **URL matching**: 各 plugin 的 URL 匹配正则

### P4 (建议) -- tsup empty chunk 警告

3 个 `types.ts` 文件生成空 chunk 警告。可以在 `tsup.config.ts` 中将纯类型 entry points 移到 `dts.entry` 配置中（或不将它们作为独立 entry），但不影响功能。

---

## 7. 验收结论

本次 Plugin 系统重构**通过 QA 验收**。

- 构建和测试全部通过
- 旧代码（core-adapters 目录和源码 import）清理完整
- 新 Plugin 系统的类型定义、Registry、ChatGPT/Claude 核心逻辑均完整保留
- Extension 所有文件已正确迁移至新 API
- 产出的 manifest.json host_permissions 正确

配置文件的 2 处残留是 minor 级别问题，不阻塞合并，建议在后续 commit 中清理。
