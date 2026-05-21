# CtxPort MVP Quality Report

> QA Agent: James Bach | Date: 2026-02-07
> Method: Code Review + Build Verification + Test Coverage Analysis + Exploratory Heuristics (SFDPOT)

---

## 1. Review Scope and Method

### Scope
- **Packages reviewed**: core-schema, core-adapters, core-markdown, browser-extension
- **Files reviewed**: 52 source files (all implementation files)
- **Reference documents**: ADR architecture doc, interaction design spec, PR/FAQ

### Method
1. Automated verification: `pnpm build`, `pnpm typecheck`, `pnpm test`
2. Manual code review of every source file against architecture ADR
3. Security audit of manifest permissions, data flow, and clipboard handling
4. Heuristic analysis using SFDPOT (Structure, Function, Data, Platform, Operations, Time)
5. Risk-based prioritization of findings

---

## 2. Build Verification Results

| Check | Result |
|-------|--------|
| `pnpm install` | PASS |
| `pnpm build` (4 packages) | PASS |
| `pnpm typecheck` (4 packages) | PASS |
| `pnpm test` (19 tests) | PASS |
| Extension size | 658 KB total (acceptable) |
| Manifest V3 compliance | PASS |

---

## 3. Issues Found

### 3.1 Blocker

None.

### 3.2 Critical

None.

### 3.3 Major - Fixed

**M-001: State update during render in CopyButton (FIXED)**
- **File**: `apps/browser-extension/src/components/copy-button.tsx:35-42`
- **Problem**: `onToast()` was called directly inside the render function body when `state` changed. This triggers a setState in the parent (`App`) during a child render, which is a React anti-pattern that can cause infinite re-render loops or "Cannot update a component while rendering" warnings.
- **Fix**: Moved toast notification to a `useEffect` with ref-based previous state tracking.

**M-002: State update during render in BatchBar (FIXED)**
- **File**: `apps/browser-extension/src/components/batch-mode/batch-bar.tsx:27-41`
- **Problem**: Same issue as M-001 - `onToast()` called during render body.
- **Fix**: Same pattern - moved to `useEffect` with ref tracking.

**M-003: System role messages silently mapped to "Assistant" (FIXED)**
- **File**: `packages/core-markdown/src/formats.ts:26`
- **Problem**: The `MessageRole` schema defines "user", "assistant", and "system" roles, but all format functions (`formatFull`, `formatCodeOnly`, `formatCompact`) used a ternary that mapped anything non-"user" to "Assistant". System messages would be mislabeled.
- **Fix**: Extracted a `roleLabel()` helper that correctly maps all three roles. Applied to all four format functions.

### 3.4 Major - Not Fixed (Known Issues)

**M-004: Duplicated ChatGPT conversation building logic**
- **Files**: `hooks/use-batch-mode.ts:142-184` and `components/list-copy-icon.tsx:198-233`
- **Problem**: The `fetchChatGPTConversation` / `fetchAndBuildChatGPT` functions are nearly identical (same API call, same mapping traversal, same message conversion). Same for Claude variants. This duplicated logic increases maintenance burden - any future API change must be fixed in two places.
- **Recommendation**: Extract shared `fetchAndBuildConversation(provider, conversationId)` utility in a separate file under `lib/` or `hooks/`. Not blocking MVP launch but should be addressed soon.

**M-005: Compact format comment stripping is language-agnostic but uses language-specific heuristics**
- **File**: `packages/core-markdown/src/formats.ts:72-81`
- **Problem**: The compact format strips lines starting with `#`, `//`, `/*`, `*`, `*/` inside code blocks. The `#` filter will incorrectly strip Python decorators that start with `#` (intentional for comments), but also: Markdown headings if code contains markdown, shell script lines, CSS/preprocessor directives, etc. More importantly, it strips ALL `#`-prefixed lines regardless of language, which is too aggressive for non-comment uses of `#` in languages like Ruby, Rust (`#[derive]`), etc.
- **Impact**: Compact mode output may lose meaningful code lines.
- **Recommendation**: For MVP, this is acceptable since compact mode is a P1 feature and the behavior is "lossy by design" (the user chose to compress). Long-term, consider using the code fence language hint (e.g. ```` ```python ````) to apply language-appropriate comment detection.

### 3.5 Minor

**m-001: `writeToClipboard` fallback doesn't report failure**
- **File**: `apps/browser-extension/src/lib/utils.ts:10-22`
- **Problem**: The `execCommand('copy')` fallback does not check return value or catch errors. If both `navigator.clipboard.writeText` and `execCommand` fail, the function completes silently without throwing, so the caller shows "success" toast even though nothing was copied.
- **Recommendation**: Check `execCommand` return value and throw if both methods fail. The ADR mentions a third fallback (textarea prompt) that is not implemented.

**m-002: `history.pushState`/`replaceState` monkey-patching not fully restored on cleanup**
- **File**: `apps/browser-extension/src/entrypoints/content.tsx:65-74`
- **Problem**: The cleanup correctly restores `pushState` and `replaceState`, but if another extension has also monkey-patched these methods before CtxPort, restoration will break the chain. This is an inherent limitation of monkey-patching.
- **Impact**: Low risk in practice - unlikely to conflict with ChatGPT/Claude's own SPA routing.

**m-003: Context menu positioned at click coordinates without viewport boundary check**
- **File**: `apps/browser-extension/src/components/context-menu.tsx:43-46`
- **Problem**: The context menu is positioned at `(x, y)` from `clientX/clientY`. If the user right-clicks near the bottom or right edge of the viewport, the menu may overflow off-screen.
- **Recommendation**: Add viewport boundary detection to flip menu position when needed. Not blocking for MVP since the copy button is typically in the top area.

**m-004: Missing `aria-label` on injected buttons**
- **Files**: `copy-button.tsx`, `list-copy-icon.tsx`, `batch-checkbox.tsx`
- **Problem**: The interaction spec (Section 8.2) requires `aria-label` attributes for screen reader accessibility. The buttons use `title` attribute but lack `aria-label`.
- **Impact**: Reduces accessibility. Not blocking MVP but should be addressed for Chrome Web Store review.

**m-005: Module-level singleton for adapter registration**
- **File**: `apps/browser-extension/src/hooks/use-copy-conversation.ts:13-19`
- **Problem**: Uses module-level `let adaptersRegistered = false` to guard one-time registration. This works but is fragile if the module is loaded in multiple contexts (e.g., during HMR in dev mode).
- **Impact**: Dev-only issue, no impact on production.

---

## 4. Security Audit

### 4.1 Manifest Permissions - PASS

```json
{
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*"
  ]
}
```

- No `tabs` permission (matches ADR-PERM-001)
- No network permissions for external servers
- No `cookies`, `webRequest`, `history`, or other high-risk permissions
- `host_permissions` limited to exactly the 3 target domains
- CSP: `script-src 'self'; object-src 'self'` - properly restrictive

**Verdict**: Minimal permission principle is achieved. This is consistent with the "zero network permission" product constitution described in the PR/FAQ.

### 4.2 Data Flow Security - PASS

The complete data flow is:
1. Content Script reads DOM / calls platform's own API (same-origin, uses existing session cookies)
2. `core-adapters` parses response into `Conversation` object
3. `core-markdown` serializes to Markdown string
4. `navigator.clipboard.writeText()` writes to clipboard

At no point does data leave the browser. No external fetch calls, no analytics, no telemetry. Verified in both source code and built output.

### 4.3 XSS / Injection Risks - LOW RISK

- DOM injection uses `document.createElement` (not `innerHTML`)
- React components are rendered via `createRoot`, which auto-escapes JSX
- No `dangerouslySetInnerHTML` usage found anywhere
- YAML frontmatter special characters (`:`, `"`, `#`) are properly escaped in `buildFrontmatter()`

### 4.4 Cookie / Token Handling - ACCEPTABLE

- Claude adapter reads `document.cookie` to extract `orgId` (file: `use-batch-mode.ts:187`, `list-copy-icon.tsx:236`)
- This is necessary for the Claude API call and is the standard approach (same as `chat2poster`)
- The cookie value is only used locally for the fetch URL construction, never stored or transmitted

---

## 5. Test Coverage

### Current State

| Package | Test Files | Tests | Coverage |
|---------|-----------|-------|----------|
| core-markdown | 2 | 19 (was 10, +9 added) | Serializer + formats well covered |
| core-schema | 0 | 0 | No tests (schema validation via Zod is self-documenting) |
| core-adapters | 0 | 0 | No tests (adapter logic requires DOM/API mocking) |
| browser-extension | 0 | 0 | No tests (UI components require browser environment) |

### Tests Added in This Review

1. **serializer.test.ts** (+6 tests):
   - Special characters in title (YAML escaping)
   - System role message handling
   - Missing sourceMeta handling
   - Nested code block preservation
   - Single conversation bundle
   - Untitled conversation bundle fallback

2. **formats.test.ts** (+3 tests):
   - Code-only with no code blocks (empty result)
   - User-only skips assistant messages
   - System role in full format

### Recommended Future Tests (Post-MVP)

1. **core-schema**: Validation edge cases (invalid UUIDs, missing required fields)
2. **core-adapters**: Mock-based tests for ChatGPT/Claude message converters
3. **browser-extension**: Integration tests for `useCopyConversation` hook with mocked adapters

---

## 6. Architecture Compliance

| ADR Requirement | Status |
|-----------------|--------|
| ADR-001: Fork chat2poster (not dependency) | COMPLIANT |
| ADR-002: No shared-ui package | COMPLIANT |
| ADR-003: DOM injection via native API, floating UI via React Shadow DOM | COMPLIANT |
| ADR-004: No background tab fallback for list copy | COMPLIANT |
| ADR-005: Clipboard 3-tier fallback | PARTIAL (2 of 3 tiers implemented; textarea prompt missing) |
| ADR-006: @ctxport/ namespace | COMPLIANT |
| ADR-BUNDLE-001: YAML frontmatter | COMPLIANT |
| ADR-BUNDLE-002: ## User / ## Assistant role markers | COMPLIANT |
| ADR-BUNDLE-003: ~4 chars/token estimation | COMPLIANT |
| ADR-INJECT-001: Hybrid injection (Shadow DOM + native DOM) | COMPLIANT |
| ADR-INJECT-002: MutationObserver management | COMPLIANT |
| ADR-BG-001: API calls in Content Script | COMPLIANT |
| ADR-PERM-001: No tabs permission | COMPLIANT |
| Manifest permissions minimal | COMPLIANT |

---

## 7. Overall Quality Assessment

### Strengths

1. **Clean architecture**: Clear separation of concerns across packages. Data flows unidirectionally from adapter -> schema -> markdown -> clipboard.
2. **Security posture is excellent**: Zero external network permissions, minimal manifest permissions, no data exfiltration vectors.
3. **TypeScript usage is solid**: All packages pass strict type checking. Zod schemas provide runtime validation at package boundaries.
4. **Build toolchain is production-ready**: Turborepo caching, proper dependency ordering (core-schema -> core-adapters + core-markdown -> extension).
5. **DOM injection pattern is well-designed**: MutationObserver-based with idempotency guards (`data-ctxport-injected`), proper cleanup on unmount.

### Risks for Production

1. **DOM selector fragility** (HIGH RISK): Both injectors rely on CSS selectors like `main .sticky .flex.items-center.gap-2` which can break on any ChatGPT/Claude frontend update. This is an inherent risk acknowledged in the ADR, with multi-selector fallback as mitigation.
2. **No automated E2E tests** (MEDIUM RISK): The extension's DOM injection and API integration paths can only be tested in-browser. Recommend manual smoke test on both platforms before Chrome Web Store submission.
3. **Content Script bundle size** (LOW RISK): 312 KB for content script is within acceptable range but should be monitored as features grow.

---

## 8. Release Recommendation

### GO (Conditional)

The MVP is ready for release with the following conditions:

1. **Mandatory before release**:
   - Manual smoke test on ChatGPT (login, open conversation, click copy button, verify clipboard content)
   - Manual smoke test on Claude (same flow)
   - Verify batch mode on both platforms (enter batch mode, select 2-3 conversations, copy all)
   - Verify all 4 format options produce expected output

2. **Should fix soon after release**:
   - M-004: Deduplicate conversation fetching logic
   - m-001: Fix `writeToClipboard` to properly report fallback failures
   - m-004: Add `aria-label` to injected buttons

3. **Monitor post-release**:
   - ChatGPT/Claude DOM structure changes (set up weekly manual checks)
   - Clipboard API compatibility across Chrome versions
   - Extension review feedback from Chrome Web Store

---

## 9. Summary of Changes Made

| File | Change | Type |
|------|--------|------|
| `apps/browser-extension/src/components/copy-button.tsx` | Moved toast notification from render body to useEffect | Bug Fix |
| `apps/browser-extension/src/components/batch-mode/batch-bar.tsx` | Moved toast notification from render body to useEffect | Bug Fix |
| `packages/core-markdown/src/formats.ts` | Added `roleLabel()` helper, fixed system role handling, restored compact format loop | Bug Fix |
| `packages/core-markdown/src/__tests__/serializer.test.ts` | Added 6 edge case tests | Test |
| `packages/core-markdown/src/__tests__/formats.test.ts` | Added 3 edge case tests | Test |

**Total**: 3 bug fixes, 9 new tests (10 -> 19 total).
