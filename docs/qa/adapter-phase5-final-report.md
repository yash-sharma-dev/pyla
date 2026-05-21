# QA Final Report: Phase 5 -- Old Code Cleanup & Architecture Completion

> Date: 2026-02-07
> Reviewer: QA Agent (James Bach model)
> Scope: Full removal of legacy adapters, injectors, and ext-adapter classes; api-client.ts extraction; final architecture validation

---

## 1. Build & Test Results

| Task | Status | Details |
|------|--------|---------|
| Build (all packages) | PASS | 12/12 tasks successful |
| Typecheck (tsc) | PASS | Zero errors across all packages |
| Tests (vitest) | PASS | **69 tests** total (50 core-adapters + 19 core-markdown) |
| Extension build (WXT) | PASS | 670.68 KB total (-3.35 KB from Phase 4, cleanup removed dead code) |

### Vite Warnings: RESOLVED

Phase 4 had two Vite warnings about dynamic imports conflicting with static imports from old adapters. With old adapters removed in Phase 5, these warnings are now gone. Dynamic imports in `chatgptHooks.extractMessageText` correctly split into separate chunks.

---

## 2. Old Code Cleanup Verification

### 2.1 Search: BaseExtAdapter

**Result**: NOT FOUND in source code. Only found in documentation files:
- `docs/fullstack/adapter-refactor-plan.md` (historical reference)
- `docs/cto/adr-declarative-adapter-architecture.md` (ADR context)
- `docs/product/adapter-dx-assessment.md` (assessment reference)
- `docs/cto/adr-ctxport-mvp-architecture.md` (original architecture)

**Verdict**: PASS. Class fully removed from runtime code.

### 2.2 Search: ChatGPTExtAdapter

**Result**: NOT FOUND in source code. Only found in documentation files:
- `docs/qa/adapter-phase4-report.md` (QA report)
- `docs/qa/adapter-test-strategy.md` (test strategy)
- `docs/fullstack/adapter-refactor-plan.md` (refactor plan)
- `docs/cto/adr-declarative-adapter-architecture.md` (ADR)

**Verdict**: PASS. Class fully removed from runtime code.

### 2.3 Search: ClaudeExtAdapter

**Result**: NOT FOUND in source code. Same docs-only hits as ChatGPTExtAdapter.

**Verdict**: PASS.

### 2.4 Search: chatgpt-injector

**Result**: NOT FOUND in source code. Only found in documentation:
- `docs/qa/adapter-phase4-report.md` (cleanup recommendation)
- `docs/fullstack/adapter-refactor-plan.md` (refactor plan)
- `docs/cto/adr-ctxport-mvp-architecture.md` (original architecture)

**Verdict**: PASS. `chatgpt-injector.ts` file deleted.

### 2.5 Search: claude-injector

**Result**: NOT FOUND in source code. Same docs-only pattern.

**Verdict**: PASS. `claude-injector.ts` file deleted.

### 2.6 Search: ext-adapter imports

**Result**: NOT FOUND in any `.ts` source file. Only found in documentation.

**Verdict**: PASS. All ext-adapter import paths are gone.

### 2.7 Search: legacy adapter IDs

**Result**: No `chatgpt-ext-legacy` or `claude-ext-legacy` references found in source code.

**Verdict**: PASS. Legacy fallback registration fully removed.

### 2.8 Remaining Injector Files

Only two files remain in `apps/browser-extension/src/injectors/`:
- `manifest-injector.ts` -- the new generic injector
- `base-injector.ts` -- shared utilities (PlatformInjector interface, markInjected, createContainer, etc.)

The only reference to old injector names is a JSDoc comment in `manifest-injector.ts:14`:
```
 * 替代平台特定的 ChatGPTInjector / ClaudeInjector。
```
This is purely documentary and acceptable.

**Verdict**: PASS.

---

## 3. New api-client.ts Extraction Review

### 3.1 ChatGPT api-client.ts

**File**: `packages/core-adapters/src/adapters/chatgpt/shared/api-client.ts` (148 lines)

**Purpose**: Standalone API client for ChatGPT conversation fetching, used by extension components (ListCopyIcon, BatchMode) that need direct API access outside the adapter pipeline.

**Contents**:
- `ChatGPTApiError` class with HTTP status
- `ChatGPTConversationResponse` interface (typed response shape)
- `extractChatGPTConversationId(url)` -- URL parsing for conversation IDs
- Token caching with module-level `accessTokenCache` and `accessTokenPromise`
- `fetchConversationWithTokenRetry(conversationId)` -- main export with automatic 401 retry

**Assessment**:
- Clean separation of concerns -- API networking logic is isolated from manifest adapter and parsing
- Token caching with expiry check and mutex (`accessTokenPromise`) prevents concurrent refresh races
- 401 retry logic: clear cache -> force refresh -> retry once (consistent with ManifestAdapter pattern)
- Uses `createAppError` from core-schema for error standardization
- No circular dependencies -- imports only from core-schema and local types

**Quality**: GOOD. Well-structured, single-responsibility module.

### 3.2 Claude api-client.ts

**File**: `packages/core-adapters/src/adapters/claude/shared/api-client.ts` (48 lines)

**Purpose**: Standalone API client for Claude conversation fetching.

**Contents**:
- `extractClaudeConversationId(url)` -- URL parsing
- `extractClaudeOrgId(cookie)` -- cookie extraction for auth
- `fetchClaudeConversation(orgId, conversationId)` -- API fetch with proper referrer/CORS config

**Assessment**:
- Simpler than ChatGPT (no token management needed -- cookie-session auth)
- Error handling is basic (`throw new Error`) vs ChatGPT's `createAppError` -- minor inconsistency but functional
- Request config matches the manifest endpoint definition (same query params, referrer, credentials)
- No circular dependencies

**Quality**: GOOD. Minimal and correct.

### 3.3 Usage Pattern

Both api-client modules are imported by browser-extension components via sub-path exports:
- `apps/browser-extension/src/components/list-copy-icon.tsx`
- `apps/browser-extension/src/hooks/use-batch-mode.ts`

These components need direct API access for sidebar list copy and batch mode -- they cannot go through the adapter pipeline because they fetch conversations by ID without a full AdapterInput context.

The `package.json` exports are correctly configured:
- `./adapters/chatgpt/shared/api-client`
- `./adapters/claude/shared/api-client`

**Verdict**: PASS. Extraction is well-motivated and correctly implemented.

---

## 4. Architecture Completeness Verification

### 4.1 index.ts (Package Entry)

**File**: `packages/core-adapters/src/index.ts` (49 lines)

**Assessment**:
- `registerBuiltinAdapters()` only registers ManifestAdapters (no legacy fallback)
- Imports manifest + hooks from `./adapters` barrel
- Clean export surface: registry, base utilities, extension-sites, manifests
- No dead imports or unused exports

**Verdict**: PASS.

### 4.2 adapters/index.ts (Barrel)

**File**: `packages/core-adapters/src/adapters/index.ts` (2 lines)

Only exports manifests and hooks -- no adapter classes.

**Verdict**: PASS.

### 4.3 base.ts (Shared Utilities)

**File**: `packages/core-adapters/src/base.ts` (71 lines)

Contains `AdapterConfig`, `ConversationOptions`, `RawMessage` interfaces and `buildMessages`, `buildConversation`, `generateId` functions. No `BaseExtAdapter` class.

**Verdict**: PASS. Clean utility module.

### 4.4 extension-sites.ts (Site Configuration)

**File**: `packages/core-adapters/src/extension-sites.ts` (89 lines)

Auto-generates from manifests via `manifestToSiteConfig()`. All downstream API contracts preserved.

**Verdict**: PASS.

### 4.5 package.json Sub-path Exports

No stale export entries (no `ext-adapter` paths). All current exports point to existing files:
- `.` (root)
- `./extension-sites`, `./extension-site-types`
- `./registry`, `./base`
- `./adapters/chatgpt/shared/api-client`, `./adapters/chatgpt/shared/message-converter`
- `./adapters/claude/shared/api-client`, `./adapters/claude/shared/message-converter`
- `./manifest`, `./manifest/schema`

**Verdict**: PASS.

### 4.6 Extension Components

**app.tsx**: Uses `ManifestInjector` + `getRegisteredManifests()`. No old injector imports.
**content.tsx**: Uses attribute selector `[class^="ctxport-"][class$="-copy-btn"]` for platform-agnostic button targeting.

**Verdict**: PASS.

---

## 5. Shared Module Reuse Analysis

The `shared/` directories under each platform adapter contain code reused by both:
1. **Manifest hooks** (via direct import) -- e.g., `chatgptHooks.extractMessageText` imports `content-flatteners` and `text-processor`
2. **Extension components** (via sub-path exports) -- e.g., `list-copy-icon.tsx` imports `api-client`
3. **Potential future adapters** (e.g., share-link adapter) -- e.g., `message-converter` for share data parsing

This is a good layered design: platform-specific logic lives in `shared/`, manifest hooks compose it, and the extension can import it directly when needed.

---

## 6. Remaining Observations (Non-blocking)

### OBS-001: Inconsistent Error Handling in api-client.ts

ChatGPT's `api-client.ts` uses `createAppError("E-PARSE-005", ...)` for structured errors.
Claude's `api-client.ts` uses `throw new Error(...)` for plain errors.

**Impact**: Low. Both work. The error boundary in the extension catches any Error.
**Recommendation**: Align to `createAppError` in a future pass for consistency.

### OBS-002: Manifest referrerTemplate Not URL-Resolved

In `manifest-adapter.ts:180-182`, the `referrerTemplate` is passed as-is without variable substitution:
```typescript
referrer: endpoint.referrerTemplate
  ? endpoint.referrerTemplate
  : undefined,
```

Claude's manifest defines `referrerTemplate: "https://claude.ai/chat/{conversationId}"`, but the `{conversationId}` variable is never resolved before passing to `fetch()`.

**Impact**: Low-Medium. The browser's referrer header will include the literal `{conversationId}` string instead of the actual ID. Claude's API likely doesn't validate the referrer strictly, but this is technically incorrect.

**Recommendation**: Apply the same template variable substitution used for `urlTemplate` to `referrerTemplate`.

### OBS-003: Content Script comment reference to old architecture

A JSDoc in `manifest-injector.ts:14` mentions old injector class names. Purely documentary, no action needed.

---

## 7. Risk Assessment

### What could go wrong in production?

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ChatGPT/Claude UI selector changes break injection | Medium | High | Selector fallback arrays in manifest. Floating copy button as final fallback. |
| ChatGPT API response structure changes | Low | High | `transformResponse` hook can be updated independently of core engine. |
| Token refresh race condition | Low | Medium | Mutex pattern (`tokenPromise`) in both ManifestAdapter and api-client prevents concurrent refresh. |
| New platform addition breaks assumptions | Low | Low | Architecture is inherently extensible -- add manifest + hooks, register, done. |

### What was NOT tested?

1. **Live end-to-end on ChatGPT/Claude pages** -- automated tests mock API responses. Manual E2E verification needed before release.
2. **Browser compatibility** -- only verified build output, not runtime in different browsers.
3. **Performance regression** -- extension bundle size decreased (670.68 KB vs 674.03 KB), but runtime performance unverified.

---

## 8. Cumulative Bug Summary (All Phases)

| Bug ID | Phase | Severity | Description | Status |
|--------|-------|----------|-------------|--------|
| BUG-001 | 1-3 | Low | `shouldSkip()` regex could throw on invalid pattern | FIXED |
| BUG-002 | 4 | Medium | Hardcoded platform class names in floating fallback detection | FIXED |
| BUG-003 | 4 | Medium | Hardcoded platform selectors in keyboard shortcut handler | FIXED |

---

## 9. Test Coverage Summary

| Phase | Tests Added | Total |
|-------|-------------|-------|
| Existing (pre-refactor) | -- | 32 |
| Phase 1-3 QA | +18 | 50 |
| Phase 4 | +19 (likely from fullstack) | 69 |
| Phase 5 | 0 (cleanup phase) | 69 |

---

## 10. Final Verdict

### GO -- Declarative Adapter Architecture Complete

All five phases of the adapter refactoring have been verified:

1. **Phase 1 (Manifest Infrastructure)**: Schema, hooks, adapter engine, registry -- all working.
2. **Phase 2 (Platform Definitions)**: ChatGPT and Claude manifests with platform-specific hooks -- all working.
3. **Phase 3 (Comparison Tests)**: ManifestAdapter produces identical output to old adapters -- verified.
4. **Phase 4 (Primary Switch)**: ManifestAdapter is primary, extension uses ManifestInjector -- all working.
5. **Phase 5 (Cleanup)**: All old code removed, no dangling references, api-client.ts properly extracted -- clean.

**Architecture quality**: The three-layer model (Declaration/Script/Core) is well-implemented. Adding a new platform requires only a manifest object and optional hooks file -- no class inheritance, no injector subclass. The shared module pattern allows code reuse across adapter pipeline and direct extension component access.

**Bundle impact**: Extension size decreased from 674.03 KB to 670.68 KB (-0.5%), indicating dead code was successfully eliminated.

**Pre-release requirement**: Manual end-to-end testing on live ChatGPT and Claude pages remains the critical next step before any release. Automated tests verify parsing logic but cannot verify DOM injection on live pages.

**Recommended follow-up** (non-blocking):
1. Fix referrerTemplate variable substitution (OBS-002)
2. Align Claude api-client error handling to use createAppError (OBS-001)
