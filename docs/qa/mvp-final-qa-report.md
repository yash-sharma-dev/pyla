# MVP Final QA Report: CtxPort Browser Extension

**Date:** 2026-02-07
**Reviewer:** QA Agent (James Bach model)
**Scope:** Adapter auto-registration refactoring review + Phase 5 sign-off + Full-feature E2E test strategy
**Methodology:** Code review, automated test verification, exploratory testing heuristics (SFDPOT), risk-based analysis

---

## Part 1: Adapter Auto-Registration Refactoring Review

### 1.1 Change Summary

The refactoring consolidates adapter registration into a single source of truth:

| File | Change | Lines |
|------|--------|-------|
| `packages/core-adapters/src/adapters/index.ts` | New `builtinManifestEntries` array as single registration point | +9, -2 |
| `packages/core-adapters/src/index.ts` | Auto-derive host permissions from entries; loop-based registration | +12, -22 |
| `packages/core-adapters/package.json` | Remove 6 stale sub-path exports | -36 |
| `packages/core-adapters/src/extension-sites.ts` | **DELETED** (89 lines) | -89 |
| `packages/core-adapters/src/extension-site-types.ts` | **DELETED** (24 lines) | -24 |

**Net: -175 lines added, +22 lines. 153 lines of dead code removed.**

### 1.2 Build Verification -- PASS

`pnpm turbo build` succeeds across all 4 packages:
- core-schema: build success
- core-markdown: build success
- core-adapters: build success (30 entry points, ESM + DTS)
- extension: build success (671.46 KB total)

Generated `manifest.json` contains correct:
- `host_permissions`: `chatgpt.com/*`, `chat.openai.com/*`, `claude.ai/*`
- `content_scripts.matches`: same 3 patterns
- `commands`: `copy-current` (Cmd+Shift+C) and `toggle-batch` (Cmd+Shift+E)

### 1.3 Test Verification -- PASS

```
core-schema:     passWithNoTests (no test files)
core-markdown:   2 files, 19 tests -- ALL PASS
core-adapters:   2 files, 50 tests -- ALL PASS
extension:       passWithNoTests (no test files)
Total:           69/69 tests pass, 0 failures
```

### 1.4 Dead Reference Check -- PASS

Removed symbols verified absent from all `.ts`/`.tsx` source files:

| Symbol | References in src/ |
|--------|--------------------|
| `CHATGPT_EXT_SITE` | 0 |
| `CLAUDE_EXT_SITE` | 0 |
| `getExtensionSiteByUrl` | 0 |
| `getExtensionSiteByHost` | 0 |
| `resolveExtensionTheme` | 0 |
| `ExtensionSiteConfig` | 0 |
| `ExtensionSiteThemeTokens` | 0 |
| `extension-sites` (import) | 0 |
| `extension-site-types` (import) | 0 |

### 1.5 Consumer Import Verification -- PASS

All extension imports from `@ctxport/core-adapters` resolve to valid sub-path exports:

| Consumer File | Import Path | Status |
|---------------|-------------|--------|
| `content.tsx` | `@ctxport/core-adapters` (root) | OK |
| `extension-runtime.ts` | `@ctxport/core-adapters` (root) | OK |
| `use-copy-conversation.ts` | `@ctxport/core-adapters` (root) | OK |
| `app.tsx` | `@ctxport/core-adapters/manifest` | OK |
| `list-copy-icon.tsx` | `@ctxport/core-adapters/manifest` | OK |
| `manifest-injector.ts` | `@ctxport/core-adapters/manifest` | OK |
| `use-batch-mode.ts` | `@ctxport/core-adapters/manifest` | OK |

Removed sub-path exports (`./extension-sites`, `./extension-site-types`, `./adapters/chatgpt/shared/api-client`, `./adapters/chatgpt/shared/message-converter`, `./adapters/claude/shared/api-client`, `./adapters/claude/shared/message-converter`) confirmed to have zero consumers in `apps/browser-extension/src/`.

### 1.6 Code Quality Review -- PASS

**`adapters/index.ts` (9 lines):**
- Clean, typed `builtinManifestEntries: ManifestEntry[]` array
- Adding a new adapter = 1 import + 1 array entry
- No side effects at module scope

**`index.ts` (38 lines):**
- `EXTENSION_HOST_PERMISSIONS` and `EXTENSION_HOST_PATTERNS` derived via `flatMap` -- single source of truth
- `registerBuiltinAdapters()` uses idempotent guard (`!_getAdapter(entry.manifest.id)`)
- Loop-based registration replaces per-adapter if-blocks -- scales cleanly

**Registration timing:** `registerBuiltinAdapters()` called in `content.tsx:19` before React mount (BUG-1 from decouple report: FIXED). Also called defensively in `use-copy-conversation.ts:17`.

### 1.7 Refactoring Verdict

**PASS -- Approve for commit.**

The refactoring achieves its stated goal: `builtinManifestEntries` is the single source of truth for all adapter registration, host permission derivation, and content script matching. No regressions detected.

---

## Part 2: Phase 5 Sign-Off (Delete Legacy Adapters)

### Decision: APPROVED -- No Blocking Issues

Phase 5 (as described in `docs/qa/adapter-phase5-final-report.md`) has already been executed in prior commits. The current refactoring is a continuation that further simplifies by:

1. Removing `extension-sites.ts` and `extension-site-types.ts` (the last legacy bridge layer)
2. Removing 6 stale sub-path exports from `package.json`
3. Consolidating into `builtinManifestEntries`

**Why APPROVED:**
- Zero references to deleted symbols in runtime code
- All 69 tests pass
- Build succeeds across all packages
- Extension manifest.json is correct
- No consumer breakage detected

**Remaining non-blocking observations (carried forward from Phase 5 report):**

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| OBS-001 | Claude api-client uses `throw new Error` vs ChatGPT's `createAppError` | Low | Open -- future consistency pass |
| OBS-002 | `referrerTemplate` `{conversationId}` not resolved before fetch | Low-Medium | Open -- technically incorrect referrer header |

---

## Part 3: Full-Feature End-to-End Test Strategy

### 3.1 Test Philosophy

This is a browser extension that runs on live third-party pages (ChatGPT, Claude). Automated unit tests verify parsing logic but **cannot** verify DOM injection, clipboard operations, or real API interactions. Manual E2E testing on live pages is the critical quality gate before any release.

The strategy below follows SFDPOT (Structure, Function, Data, Platform, Operations, Time) heuristics.

### 3.2 ChatGPT Adapter Test Scenarios

#### CT-01: One-Click Copy (Conversation Page)
- [ ] Navigate to `https://chatgpt.com/c/{id}`
- [ ] Verify copy button appears in conversation header area
- [ ] Click copy button -> toast shows "Copied X messages" -> clipboard contains Markdown
- [ ] Verify Markdown contains: metadata header, all user/assistant messages, code blocks preserved
- [ ] If header injection fails, verify floating CtxPort button appears at bottom-right

#### CT-02: Right-Click Format Menu (Conversation Page)
- [ ] Right-click the copy button -> context menu appears with 4 format options
- [ ] Select "User messages only" -> clipboard contains only user messages
- [ ] Select "Code blocks only" -> clipboard contains only code blocks
- [ ] Select "Compact" -> clipboard contains compact format
- [ ] Press Escape -> context menu closes without action

#### CT-03: Sidebar List Copy Icons
- [ ] Verify small copy icons appear next to each conversation in the sidebar list
- [ ] Click a sidebar copy icon -> fetches conversation via API -> copies to clipboard
- [ ] Right-click sidebar copy icon -> format selection menu appears
- [ ] Verify loading spinner shows during fetch
- [ ] Verify success/error toast appears after completion

#### CT-04: Batch Mode
- [ ] Press Cmd+Shift+E -> batch mode activates, checkboxes appear in sidebar
- [ ] Select multiple conversations via checkboxes
- [ ] Click "Copy Selected" in batch bar -> all selected conversations copied
- [ ] Verify batch bar shows selection count
- [ ] Press Cmd+Shift+E again -> batch mode deactivates, checkboxes disappear

#### CT-05: Keyboard Shortcut
- [ ] Press Cmd+Shift+C on a conversation page -> triggers one-click copy
- [ ] Verify same toast and clipboard result as CT-01

#### CT-06: ChatGPT-Specific Edge Cases
- [ ] Conversation with reasoning/thinking blocks (o1/o3 models) -> correctly captured
- [ ] Conversation with code execution results -> tool responses included
- [ ] Conversation with image attachments -> multimodal text parts captured
- [ ] Conversation with model-editable context -> included in output
- [ ] Very long conversation (100+ messages) -> completes without timeout
- [ ] New conversation (0 messages, just the input box) -> graceful error message

### 3.3 Claude Adapter Test Scenarios

#### CL-01: One-Click Copy (Conversation Page)
- [ ] Navigate to `https://claude.ai/chat/{id}`
- [ ] Verify copy button appears in conversation header area
- [ ] Click copy button -> toast shows "Copied X messages" -> clipboard contains Markdown
- [ ] Verify Markdown contains: metadata header, all human/assistant messages

#### CL-02: Right-Click Format Menu
- [ ] Same format selection tests as CT-02 but on Claude page

#### CL-03: Sidebar List Copy Icons
- [ ] Same sidebar icon tests as CT-03 but on Claude page
- [ ] Verify org ID extraction from cookie works (auth mechanism differs from ChatGPT)

#### CL-04: Batch Mode
- [ ] Same batch mode tests as CT-04 but on Claude page

#### CL-05: Keyboard Shortcut
- [ ] Same keyboard shortcut tests as CT-05 but on Claude page

#### CL-06: Claude-Specific Edge Cases
- [ ] Conversation with artifacts -> text content captured
- [ ] Conversation with thinking/extended thinking -> captured or gracefully handled
- [ ] Claude Team/Pro workspace -> org ID correctly extracted, API auth works

### 3.4 Markdown Output Format Verification

For each platform (ChatGPT, Claude), verify these 4 formats:

| Format | Expected Output |
|--------|----------------|
| `full` | Complete conversation: metadata header + all messages with role labels |
| `user-only` | Only user/human messages, assistant messages filtered out |
| `code-only` | Only code blocks extracted from all messages |
| `compact` | Condensed format with minimal whitespace |

#### MD-01: Metadata Header
- [ ] Title present and matches conversation title
- [ ] Source URL present
- [ ] Provider name present (ChatGPT / Claude)
- [ ] Message count accurate
- [ ] Export timestamp present

#### MD-02: Message Formatting
- [ ] Inline code preserved with backticks
- [ ] Code blocks preserved with triple backticks + language tag
- [ ] Bold/italic/links preserved
- [ ] Nested lists rendered correctly
- [ ] LaTeX/math expressions preserved (if present)

### 3.5 Cross-Platform / Environment Tests

#### ENV-01: Dark Mode / Light Mode
- [ ] ChatGPT dark mode -> copy button visible, toast readable
- [ ] ChatGPT light mode -> copy button visible, toast readable
- [ ] Claude dark mode -> copy button visible, toast readable
- [ ] Claude light mode -> copy button visible, toast readable
- [ ] OS dark mode preference change -> theme updates

#### ENV-02: Browser Compatibility
- [ ] Chrome (primary target) -> all features work
- [ ] Edge (Chromium) -> all features work
- [ ] Brave (Chromium) -> all features work

#### ENV-03: Extension Lifecycle
- [ ] Fresh install -> content script loads on supported pages
- [ ] Extension disable -> content script cleanup (no orphan DOM)
- [ ] Extension re-enable -> content script reinjects
- [ ] Page refresh -> content script re-initializes correctly
- [ ] SPA navigation (click sidebar item) -> injector re-triggers for new conversation

### 3.6 Edge Cases & Error Handling

#### EDGE-01: Empty Conversation
- [ ] Open a new conversation with no messages -> graceful error ("No messages found" or similar)

#### EDGE-02: Network Errors
- [ ] Disable network -> attempt sidebar list copy -> error toast shown
- [ ] API returns 403/429 -> meaningful error message

#### EDGE-03: Authentication
- [ ] ChatGPT session expired (401) -> token refresh triggered -> retry succeeds
- [ ] ChatGPT token refresh also fails -> meaningful error message
- [ ] Claude cookie missing -> meaningful error message

#### EDGE-04: Special Characters in Content
- [ ] Conversation containing Markdown-like characters (`#`, `*`, `|`, `` ` ``) -> properly escaped
- [ ] Conversation with Unicode/emoji -> preserved in output
- [ ] Conversation with very long single message (10K+ chars) -> no truncation

#### EDGE-05: Concurrent Operations
- [ ] Double-click copy button rapidly -> only one copy operation executes (loading state prevents re-entry)
- [ ] Click sidebar icon while batch mode is copying -> no crash

#### EDGE-06: URL Edge Cases
- [ ] Navigate to ChatGPT homepage (no conversation) -> no copy button injected, no errors
- [ ] Navigate to Claude settings page -> no copy button injected, no errors
- [ ] Direct URL entry to conversation -> content script loads and injects correctly

### 3.7 Test Priority Matrix

| Category | Priority | Automated? | Manual E2E Required? |
|----------|----------|------------|---------------------|
| One-click copy (CT-01, CL-01) | **P0 -- Must Test** | Parsing logic: YES (50 tests) | Live injection: YES |
| Format selection (CT-02, CL-02) | **P0 -- Must Test** | Format filtering: YES (19 tests) | Menu UI: YES |
| Sidebar list copy (CT-03, CL-03) | **P1 -- Should Test** | No | YES |
| Batch mode (CT-04, CL-04) | **P1 -- Should Test** | No | YES |
| Keyboard shortcuts (CT-05, CL-05) | **P1 -- Should Test** | No | YES |
| Dark/light mode (ENV-01) | **P2 -- Nice to Test** | No | YES |
| Error handling (EDGE-01 to 06) | **P1 -- Should Test** | Partial (error paths in adapter tests) | YES |
| Browser compat (ENV-02) | **P2 -- Nice to Test** | No | YES |

---

## Part 4: Automated Test Suite Status

### 4.1 Current Coverage

| Package | Test Files | Tests | Status |
|---------|-----------|-------|--------|
| core-schema | 0 | 0 | passWithNoTests |
| core-markdown | 2 | 19 | ALL PASS |
| core-adapters | 2 | 50 | ALL PASS |
| extension | 0 | 0 | passWithNoTests |
| **Total** | **4** | **69** | **ALL PASS** |

### 4.2 What Is Covered by Automated Tests

**core-adapters (50 tests):**
- `manifest-utils.test.ts` (21 tests): URL pattern matching, template resolution, manifest validation
- `manifest-adapter.test.ts` (29 tests): Full adapter pipeline -- input parsing, API fetch mocking, message conversion, conversation building, error handling, token retry logic

**core-markdown (19 tests):**
- `formats.test.ts` (7 tests): Message filtering for all 4 format types
- `serializer.test.ts` (12 tests): Full serialization pipeline -- metadata header, message formatting, token estimation, edge cases

### 4.3 What Is NOT Covered

1. **DOM injection** -- MutationObserver-based button/icon injection on live pages
2. **Clipboard API** -- `navigator.clipboard.writeText()` (requires user gesture + secure context)
3. **Browser extension APIs** -- `browser.runtime`, `browser.tabs`, `browser.commands`
4. **SPA route detection** -- `history.pushState` monkey-patching
5. **Shadow DOM rendering** -- `createShadowRootUi` overlay
6. **React component rendering** -- no component tests for CopyButton, ListCopyIcon, BatchBar, etc.

### 4.4 Recommended Test Additions (Non-blocking for MVP)

| Priority | What | Why |
|----------|------|-----|
| P1 | `builtinManifestEntries` registration test | Verify all entries register without error and `getAdapters()` returns expected count |
| P1 | `EXTENSION_HOST_PERMISSIONS` derivation test | Verify derived permissions match expected URL patterns |
| P2 | Integration test: `parseWithAdapters` -> `serializeConversation` | End-to-end pipeline from mock API response to Markdown output |
| P3 | Component snapshot tests for CopyButton, Toast | Prevent accidental UI regressions |

---

## Part 5: Cumulative Bug Tracker

| Bug ID | Phase | Severity | Description | Status |
|--------|-------|----------|-------------|--------|
| BUG-001 | 1-3 | Low | `shouldSkip()` regex could throw on invalid pattern | FIXED |
| BUG-002 | 4 | Medium | Hardcoded platform class names in floating fallback detection | FIXED |
| BUG-003 | 4 | Medium | Hardcoded platform selectors in keyboard shortcut handler | FIXED |
| BUG-004 | Decouple | Critical | Adapter registration timing -- adapters not registered before first render | FIXED (content.tsx:19) |

All known bugs are resolved.

---

## Part 6: Risk Assessment

### Production Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ChatGPT/Claude DOM changes break selector injection | Medium | High | Selector fallback arrays in manifest; floating copy button as final fallback |
| ChatGPT API structure changes | Low | High | `transformResponse` hook isolates parsing; single manifest update fixes |
| Claude API authentication changes | Low | High | `extractAuthHeadless` hook; cookie-based auth is standard |
| Token/session expiry during batch copy | Medium | Medium | 401 retry with token refresh; per-conversation error handling |
| Clipboard API blocked by browser | Low | Medium | `writeToClipboard` has fallback in `lib/utils.ts` |

### Architecture Risks

| Risk | Probability | Impact | Note |
|------|------------|--------|------|
| builtinManifestEntries not registered | Very Low | Critical | Guarded by early `registerBuiltinAdapters()` call + defensive re-registration |
| New adapter added but not in entries array | Low | Low | Single file change in `adapters/index.ts`; TypeScript will catch missing imports |

---

## Part 7: Final Verdict

### PASS -- MVP Ready for Manual E2E Verification

**Code quality: GOOD**
- Auto-registration refactoring is clean, minimal, and achieves its goal
- 153 lines of dead code removed
- All 69 automated tests pass
- All builds succeed
- No dangling references to deleted code

**Phase 5 legacy deletion: APPROVED**
- No blocking issues
- 2 non-blocking observations carried forward (OBS-001, OBS-002)

**Pre-release requirement:** Manual E2E testing on live ChatGPT and Claude pages using the test checklist in Part 3 above. Priority focus on P0 scenarios (one-click copy + format selection) first.

**Recommended before Chrome Web Store submission:**
1. Execute P0 and P1 test scenarios manually
2. Verify extension icon and popup display correctly
3. Test on at least Chrome + one other Chromium browser
4. Add 2-3 automated tests for the new `builtinManifestEntries` (P1 from section 4.4)
